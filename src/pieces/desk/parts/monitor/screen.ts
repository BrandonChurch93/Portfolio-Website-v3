import * as THREE from 'three';
import { ACTIVE, GLASS, LAYERS, PANEL, SLANT, type Rect } from './frame';
import type { Art } from './art';
import { bend } from './shape';

// The picture behind the glass, as one surface drawn by one shader. It is not a flat picture: each window stands at
// its own depth behind the glass, so the line of sight finds it at its own place (the view is oblique and the panel
// curved), and each throws a soft shadow on what is behind it. The small panel is frosted: what is behind it shows
// through blurred. The running page's stream is drawn here alive, and the caret blinks. Textures are drawn once; what
// moves is a few uniforms.

const f = (n: number) => n.toFixed(3);
const v4 = (r: Rect) => `vec4(${r.map(f).join(', ')})`;

// How the screen wakes as its light comes up from 0 to 1: the backlight first, then the wallpaper, then each window in
// turn, the stream running down its page, the floating panel and the pointer last. Each is [from, to].
export const WAKE = {
  back: [0, 0.2], wall: [0.12, 0.4], editor: [0.3, 0.56], page: [0.46, 0.72], live: [0.6, 0.9], panel: [0.7, 0.9], pointer: [0.86, 1],
} as const;

// How bright the picture is, in the renderer's linear light: the windows' own pixels, and the stream's core.
const GAIN = { ui: 0.78, wall: 0.8, core: 3.2 } as const;

const vertexShader = /* glsl */ `
varying vec2 vS;
varying vec3 vV;
varying vec3 vV0;
void main(){
  vS = uv;
  float a = atan(position.x, ${f(PANEL.R)} - position.z);
  vec3 T = vec3(cos(a), 0.0, sin(a)), N = vec3(-sin(a), 0.0, cos(a));
  vec4 w = modelMatrix * vec4(position, 1.0);
  vec3 V = cameraPosition - w.xyz;
  mat3 m = mat3(modelMatrix);
  vV = vec3(dot(V, normalize(m * T)), dot(V, normalize(m * vec3(0.0, 1.0, 0.0))), dot(V, normalize(m * N)));
  vec3 V0 = cameraPosition - (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vV0 = vec3(dot(V0, normalize(m * vec3(1.0, 0.0, 0.0))), dot(V0, normalize(m * vec3(0.0, 1.0, 0.0))), dot(V0, normalize(m * vec3(0.0, 0.0, 1.0))));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

function fragmentShader(art: Art): string {
  const E = LAYERS.editor, P = LAYERS.page, N = LAYERS.panel, C = LAYERS.pointer;
  return /* glsl */ `
uniform sampler2D tWall, tEd, tPg, tPn, tPt;
uniform float uBack, uWall, uEd, uPg, uLive, uPn, uPt, uCaret, uT;
uniform vec2 uSun, uHead;
varying vec2 vS;
varying vec3 vV;
varying vec3 vV0;

const vec2 AREA = vec2(${f(ACTIVE.w)}, ${f(ACTIVE.h)});
const vec4 RE = ${v4(E.rect)}, RP = ${v4(P.rect)}, RN = ${v4(N.rect)};

float sdBox(vec2 p, vec4 r, float rad){
  vec2 c = 0.5 * (r.xy + r.zw), h = 0.5 * (r.zw - r.xy) - rad;
  vec2 q = abs(p - c) - h;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
}
float cover(float sd){ float w = max(fwidth(sd), 1e-3) * 0.7; return 1.0 - smoothstep(-w, w, sd); }
// Where the line of sight through this point of the glass meets a layer d millimetres behind it.
// The slant at the panel's middle is mostly taken off (SLANT), and the pointer moving over the desk stands for a head
// moving in front of the glass (uHead).
vec2 at(float d){ return vS - (vV.xy / max(vV.z, 1e-3) - ${f(1 - SLANT)} * vV0.xy / max(vV0.z, 1e-3) + uHead) * d; }
// The shadow a window r, standing gap millimetres in front of the point p, throws on it.
float shadow(vec2 p, vec4 r, float rad, float gap){
  float blur = 1.4 + gap * 2.4;
  float sd = sdBox(p + uSun * gap, r, rad);
  return (1.0 - smoothstep(-blur, blur * 1.4, sd)) * min(0.9, 0.55 + gap * 0.1);
}
vec2 uvOf(vec2 p, vec4 r){ return (p - r.xy) / (r.zw - r.xy); }

// The running page's stream, in millimetres on the page from its lower left, y counted down from under its bar. It
// sways as it falls, and turns in to strike the thing at the left of each row.
float pathX(float y){
  float x = 52.0 + 9.0 * sin(y * 0.043 + 0.5) + 5.0 * sin(y * 0.107 + 2.3) + 1.6 * sin(y * 0.23 + 0.9 - uT * 0.7);
  for (int i = 0; i < 3; i++){ float k = (y - 75.0 - 70.0 * float(i)) / 15.0; x += (90.0 - x) * exp(-k * k); }
  return x;
}
float hash(float n){ return fract(sin(n * 91.345) * 43758.5453); }
float sdTri(vec2 p, float r){
  const float k = 1.7320508;
  p.x = abs(p.x) - r; p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}
float pathDist(vec2 q){
  float d = 1e3;
  for (int i = -4; i <= 4; i++){ float dy = float(i) * abs(float(i)) * 0.75; d = min(d, length(vec2(q.x - pathX(q.y + dy), dy))); }
  return d;
}
vec3 stream(vec2 lp, out float lit){
  float top = ${f(art.pageTop)};
  float y = top - lp.y;
  float reach = uLive * (top + 20.0);
  float there = 1.0 - smoothstep(reach - 14.0, reach, y);
  float d = pathDist(vec2(lp.x, y));
  float px = max(fwidth(lp.x), 1e-3);
  float w = max(0.3, px * 0.8);
  float flow = 0.72 + 0.28 * sin(y * 0.13 - uT * 3.1) * sin(y * 0.041 - uT * 1.1 + 1.0);
  vec3 c = vec3(1.0, 0.77, 0.54) * exp(-d * d / (w * w)) * (0.3 / w) * ${f(GAIN.core)} * flow;
  c += vec3(0.93, 0.27, 0.013) * exp(-d / 1.5) * 0.5 * flow;
  c += vec3(0.105, 0.028, 0.0) * exp(-d / 8.0) * 0.9;
  lit = exp(-d / 10.0) * there;
  // The shards that ride it: cut, two faced, turning, each at its own pace down the line.
  for (int i = 0; i < 30; i++){
    float fi = float(i), h = hash(fi + 1.3), h2 = hash(fi + 7.1), h3 = hash(fi + 3.7);
    float s = fract(h + uT * (0.03 + 0.03 * h2));
    float sy = -12.0 + s * (top + 24.0);
    float side = (h3 - 0.5) * 2.0;
    float ph = uT * (0.8 + h * 1.4) + fi;
    vec2 c0 = vec2(pathX(sy) + side * (1.2 + 3.6 * h2) + sin(ph) * 0.8, sy);
    vec2 q = vec2(lp.x, y) - c0;
    float a = ph * (0.6 + h3) + h * 6.28;
    q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
    float r = 1.1 + 1.9 * h2 * h2;
    float sd = sdTri(q * vec2(1.0, 1.2 + h * 1.1), r);
    float cv = (1.0 - smoothstep(-px * 0.6, px * 0.6, sd)) * step(sy, reach);
    float facet = step(0.0, q.x * 0.6 + q.y);
    float glint = pow(max(0.0, sin(ph * 2.0 + h * 9.0)), 16.0);
    vec3 copper = mix(vec3(0.9, 0.38, 0.09), vec3(0.16, 0.055, 0.014), facet);
    vec3 glass = mix(vec3(0.85, 0.6, 0.38), vec3(0.06, 0.03, 0.015), facet);
    vec3 sc = (h > 0.7 ? glass : copper) * (0.9 + 0.9 * exp(-abs(side) * 0.8)) + vec3(1.0, 0.7, 0.4) * glint * 2.4;
    c = mix(c, sc, cv);
  }
  return c * there;
}

vec3 page(vec2 pp, float bias){
  vec2 uv = uvOf(pp, RP);
  vec3 c = texture2D(tPg, uv, bias).rgb * ${f(GAIN.ui)};
  vec2 lp = pp - RP.xy;
  if (lp.y < ${f(art.pageTop)} && uLive > 0.0){
    float lit;
    vec3 s = stream(lp, lit);
    // The page round the stream takes its light.
    c = c * (1.0 + lit * 2.0) + s;
    // The things the stream strikes, one at the left of each row, glow while it runs past them.
    for (int i = 0; i < 3; i++){
      float cy = ${f(art.pageTop)} - (75.0 + 70.0 * float(i));
      float sd = sdBox(lp, vec4(90.0, cy - 9.0, 108.0, cy + 9.0), 1.6);
      float k = smoothstep(${f(art.pageTop)} - cy - 8.0, ${f(art.pageTop)} - cy + 6.0, uLive * (${f(art.pageTop)} + 20.0));
      float flick = 0.85 + 0.15 * sin(uT * 2.3 + float(i) * 2.0);
      c *= 1.0 + (1.0 - smoothstep(-0.3, 0.3, sd)) * k * 2.6 * flick;
      c += vec3(0.105, 0.028, 0.0) * exp(-max(sd, 0.0) / 3.5) * k * 1.6;
    }
  }
  return c;
}

void main(){
  float dW = ${f(LAYERS.wall.depth)} + (1.0 - uWall) * 4.0;
  float dE = ${f(E.depth)} + (1.0 - uEd) * 5.0;
  float dP = ${f(P.depth)} + (1.0 - uPg) * 5.0;
  float dN = ${f(N.depth)} + (1.0 - uPn) * 4.0;
  float dC = ${f(C.depth)};
  vec2 pw = at(dW), pe = at(dE), pp = at(dP), pn = at(dN), pc = at(dC);

  // The backlight: a dim, warm, uneven glow, brighter toward the edges, that every dark part of the picture keeps.
  vec2 e = min(vS, AREA - vS) / AREA.y;
  // A sum and not a min: a min creases along each corner's bisector, and on a dark ground the crease shows as a line.
  float bleed = (exp(-e.x * 9.0) + exp(-e.y * 9.0)) * 0.4;
  vec3 black = vec3(0.0019, 0.00155, 0.0012) * (0.7 + 0.8 * bleed);
  // Before the picture, the backlight alone shows as a brighter, even glow that the picture then settles over.
  vec3 col = black * uBack * (1.0 + 1.3 * (1.0 - uWall));

  vec3 wall = texture2D(tWall, pw / AREA).rgb * ${f(GAIN.wall)};
  col += wall * uWall;

  // The editor, over the wallpaper.
  col *= 1.0 - shadow(pw, RE, ${f(E.round)}, dW - dE) * uEd;
  float ie = cover(sdBox(pe, RE, ${f(E.round)})) * uEd;
  vec3 ed = texture2D(tEd, uvOf(pe, RE)).rgb * ${f(GAIN.ui)};
  vec2 cl = pe - RE.xy - vec2(${f(art.caret[0])}, ${f(art.caret[1])});
  float cpx = max(fwidth(pe.x), 1e-3);
  float caret = (1.0 - smoothstep(0.28 - cpx * 0.5, 0.28 + cpx * 0.5, abs(cl.x))) * step(abs(cl.y), ${f(art.caret[2] / 2)});
  ed = mix(ed, vec3(1.0, 0.72, 0.4) * 1.1, caret * uCaret);
  col = mix(col, ed + black * uBack, ie);

  // The running page, over the editor's right edge.
  float under = mix(shadow(pw, RP, ${f(P.round)}, dW - dP), shadow(pe, RP, ${f(P.round)}, dE - dP), ie);
  col *= 1.0 - under * uPg;
  float ip = cover(sdBox(pp, RP, ${f(P.round)})) * uPg;
  col = mix(col, page(pp, 0.0) + black * uBack, ip);

  // The small panel, frosted, floating over both.
  float sN = mix(mix(shadow(pw, RN, ${f(N.round)}, dW - dN), shadow(pe, RN, ${f(N.round)}, dE - dN), ie), shadow(pp, RN, ${f(N.round)}, dP - dN), ip);
  col *= 1.0 - sN * uPn;
  float inn = cover(sdBox(pn, RN, ${f(N.round)})) * uPn;
  vec3 behind = mix(mix(wall, texture2D(tEd, uvOf(pe, RE), 4.5).rgb * ${f(GAIN.ui)}, ie), texture2D(tPg, uvOf(pp, RP), 4.5).rgb * ${f(GAIN.ui)}, ip);
  vec4 pnl = texture2D(tPn, uvOf(pn, RN));
  vec3 pc3 = mix(behind * 0.55 + vec3(0.009, 0.008, 0.007), pnl.rgb * ${f(GAIN.ui)}, pnl.a);
  col = mix(col, pc3 + black * uBack, inn);

  // The pointer, nearest the glass. It throws no shadow: sampled from its small texture at the page's size, a shadow
  // blurred into a square, and stretched along the texture's clamped edge into a band across the screen.
  vec2 tip = vec2(${f(C.at[0])}, ${f(C.at[1])});
  vec2 pu = vec2(pc.x - tip.x, tip.y - pc.y) / ${f(C.size)};
  vec4 pt = texture2D(tPt, vec2(pu.x, 1.0 - pu.y)) * step(0.0, pu.x) * step(pu.x, 1.0) * step(0.0, pu.y) * step(pu.y, 1.0);
  col = mix(col, pt.rgb * ${f(GAIN.ui)}, pt.a * uPt);

  // The border printed round the inside of the glass covers the picture, and throws its own shadow on the wallpaper.
  float inside = cover(sdBox(vS, vec4(0.0, 0.0, AREA), 0.6));
  float frit = smoothstep(-1.0 - dW * 0.5, 1.0 + dW * 0.8, sdBox(pw + uSun * dW * 0.5, vec4(0.0, 0.0, AREA), 0.6));
  col *= 1.0 - frit * 0.5;
  gl_FragColor = vec4(col * inside, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
}

export interface Screen {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
}

export function makeScreen(art: Art): Screen {
  const w = GLASS.x1 - GLASS.x0, h = GLASS.y1 - GLASS.y0;
  const g = new THREE.PlaneGeometry(w, h, 220, 1);
  g.translate((GLASS.x0 + GLASS.x1) / 2, (GLASS.y0 + GLASS.y1) / 2, PANEL.glassBack - 0.06);
  const p = g.getAttribute('position'), uv = g.getAttribute('uv');
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) - ACTIVE.x0, p.getY(i) - ACTIVE.y0);
  bend(g);
  const material = new THREE.ShaderMaterial({
    name: 'monitor-screen',
    uniforms: {
      tWall: { value: art.wall }, tEd: { value: art.editor }, tPg: { value: art.page }, tPn: { value: art.panel }, tPt: { value: art.pointer },
      uBack: { value: 0 }, uWall: { value: 0 }, uEd: { value: 0 }, uPg: { value: 0 }, uLive: { value: 0 }, uPn: { value: 0 }, uPt: { value: 0 },
      uCaret: { value: 1 }, uT: { value: 0 }, uSun: { value: new THREE.Vector2(0, 2.2) }, uHead: { value: new THREE.Vector2() },
    },
    vertexShader,
    fragmentShader: fragmentShader(art),
  });
  const mesh = new THREE.Mesh(g, material);
  mesh.name = 'monitor:screen';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.noWire = true;
  return { mesh, material };
}

