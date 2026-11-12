import { ASPECT } from './route';

export const QUAD = `#version 300 es
in vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

// What every panel shares: its place on the canvas, the palette, the title and the card, and heated color.
const COMMON = `#version 300 es
precision highp float;
uniform vec2 uRes, uOrigin;
uniform vec2 uLight;
uniform vec4 uTitle, uCard;
uniform vec3 uBg, uBg3, uEmber, uFlame, uHot, uPale, uCopper, uBronze;
const float ASPECT = ${ASPECT};

float box(vec2 p, vec4 b, float r){ vec2 q = abs(p - b.xy) - (b.zw - r); return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float solid(vec2 p){ return min(box(p, uTitle, 0.008), box(p, uCard, 0.012)); }

vec3 heat(float x){
  vec3 c = x < 0.3 ? mix(uEmber, uFlame, x / 0.3) : x < 0.62 ? mix(uFlame, uHot, (x - 0.3) / 0.32) : mix(uHot, uPale, clamp((x - 0.62) / 0.3, 0.0, 1.0));
  return c * (0.35 + 2.4 * x * x);
}

// The page with a title and a card on it, both plain.
vec3 scene(vec2 p, float px){
  vec3 col = uBg;
  float dc = box(p, uCard, 0.012), dt = box(p, uTitle, 0.008);
  col = mix(col, uBg3 * (0.8 + 0.5 * smoothstep(-uCard.w, uCard.w, p.y - uCard.y)), smoothstep(px, -px, dc));
  col = mix(col, uBronze * 0.55, smoothstep(px, -px, abs(dc) - 0.001) * 0.7);
  col = mix(col, uBg3 * 1.5, smoothstep(px, -px, dt));
  col = mix(col, uBronze * 0.55, smoothstep(px, -px, abs(dt) - 0.001) * 0.7);
  return col;
}

vec3 show(vec3 col){
  float mx = max(col.r, max(col.g, col.b));
  if (mx > 1e-5) col *= (1.0 - exp(-mx * 1.15)) / (mx * 0.955);
  return pow(max(col, 0.0), vec3(1.0 / 2.2));
}
`;

const PANEL = `vec2 p = (gl_FragCoord.xy - uOrigin - 0.5 * uRes) / uRes.y; float px = 1.0 / uRes.y;`;

// ---- threads: each strand is drawn as a hair line into a count of how many lie over each pixel

export const THREAD_VERT = `#version 300 es
in vec2 aPos; in vec2 aNrm; in vec2 aAlong;
uniform float uTurn;
out float vS, vRand; out vec2 vP;
void main(){
  vec2 p = aPos + aNrm * sin(uTurn * 0.5 + aAlong.y * 40.0 + aAlong.x * 14.0) * 0.0014;
  vS = aAlong.x; vRand = aAlong.y; vP = p;
  gl_Position = vec4(p.x * 2.0 / ${ASPECT}, p.y * 2.0, 0.0, 1.0);
}`;

export const THREAD_FRAG = `#version 300 es
precision highp float;
uniform float uTime; uniform vec2 uLight;
in float vS, vRand; in vec2 vP;
out vec4 frag;
void main(){
  // A bright head with a fading tail runs down each strand, like a light on a long exposure.
  float ph = fract(vS * 2.4 - uTime * 0.45 + vRand * 7.0);
  float run = smoothstep(0.0, 0.012, ph) * exp(-ph * 18.0);
  float near = exp(-dot(vP - uLight, vP - uLight) / 0.012);
  frag = vec4(0.012, run * 0.09 + near * 0.03, 0.0, 1.0);
}`;

export const THREAD_SHOW = COMMON + `
uniform sampler2D uCount;
out vec4 frag;
void main(){
  ${PANEL}
  vec2 uv = (gl_FragCoord.xy - uOrigin) / uRes, t = 1.0 / uRes;
  vec2 c = texture(uCount, uv).rg, blur = vec2(0.0);
  for (int i = 0; i < 8; i++){ float a = float(i) * 0.785; blur += texture(uCount, uv + vec2(cos(a), sin(a)) * t * 3.5).rg; }
  blur /= 8.0;
  vec3 col = scene(p, px);
  // One strand alone is a dim orange hair. Where many cross, they add up to pale.
  float many = 1.0 - exp(-c.r * 2.2);
  col += heat(0.2 + 0.5 * many) * (1.0 - exp(-c.r * 40.0)) * (0.45 + 0.55 * many);
  col += uPale * (c.g * 2.6 + blur.g * 0.9) + heat(0.3) * (1.0 - exp(-blur.r * 5.0)) * 0.16;
  frag = vec4(show(col), 1.0);
}`;

// ---- copper leaf: each shard is a small square of metal, turned in space and lit

export const LEAF_VERT = `#version 300 es
in vec2 aCorner; in vec4 aLeaf; in vec2 aTurn;
uniform vec2 uLight; uniform vec3 uCopper, uPale, uFlame;
out vec3 vCol; out vec2 vUv; out float vRand;
void main(){
  float tilt = aTurn.x, ang = aLeaf.w;
  vec2 l = aCorner * aLeaf.z * vec2(1.0, 0.22 + 0.78 * abs(cos(tilt)));
  vec2 r = vec2(cos(ang) * l.x - sin(ang) * l.y, sin(ang) * l.x + cos(ang) * l.y);
  vec2 p = aLeaf.xy + r;
  vec3 n = vec3(-sin(ang) * sin(tilt), cos(ang) * sin(tilt), cos(tilt));
  if (n.z < 0.0) n = -n;
  vec3 V = vec3(0.0, 0.0, 1.0), key = normalize(vec3(-0.4, 0.6, 0.7));
  vec3 toL = normalize(vec3(uLight - aLeaf.xy, 0.16));
  float near = 1.0 / (1.0 + dot(uLight - aLeaf.xy, uLight - aLeaf.xy) / 0.02);
  // Polished metal: nearly black unless it faces a light, bright when it does, white for the moment it faces it squarely.
  float faces = max(dot(n, normalize(key + V)), 0.0);
  float sheen = smoothstep(0.6, 0.99, faces);
  float flash = pow(faces, 90.0) * 3.0 + pow(max(dot(n, normalize(toL + V)), 0.0), 26.0) * 9.0 * near;
  vCol = uCopper * (0.02 + 0.55 * sheen * sheen) + uPale * flash;
  vUv = aCorner; vRand = aTurn.y;
  gl_Position = vec4(p.x * 2.0 / ${ASPECT}, p.y * 2.0, 0.0, 1.0);
}`;

export const LEAF_FRAG = `#version 300 es
precision highp float;
in vec3 vCol; in vec2 vUv; in float vRand;
out vec4 frag;
void main(){
  // Torn, not square: one corner is cut away by a different amount on each.
  float cut = vUv.x * (vRand - 0.5) * 1.6 + vUv.y * 0.9 - 0.75 - vRand * 0.5;
  float a = (1.0 - smoothstep(0.82, 1.0, max(abs(vUv.x), abs(vUv.y)))) * (1.0 - smoothstep(-0.06, 0.06, cut));
  vec3 c = vCol;
  float mx = max(c.r, max(c.g, c.b));
  if (mx > 1e-5) c *= (1.0 - exp(-mx * 1.15)) / (mx * 0.955);
  frag = vec4(pow(max(c, 0.0), vec3(1.0 / 2.2)) * a, a);
}`;

export const SCENE_SHOW = COMMON + `
out vec4 frag;
void main(){ ${PANEL} frag = vec4(show(scene(p, px)), 1.0); }`;

// ---- ink: a real fluid on a coarse grid. Velocity is in panel heights a second.

const GRID = COMMON + `
uniform vec2 uSize;
vec2 where(vec2 uv){ return (uv - 0.5) * vec2(ASPECT, 1.0); }
float open(vec2 uv){ return smoothstep(0.0, 0.006, solid(where(uv))); }
`;

export const INK_ADVECT = GRID + `
uniform sampler2D uVel, uSrc; uniform float uDt, uKeep, uDrain;
out vec4 frag;
void main(){
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 from = uv - uDt * texture(uVel, uv).xy * vec2(1.0 / ASPECT, 1.0);
  // Ink that reaches the bottom or a side of the panel is let go, or it pools there.
  float gone = smoothstep(0.0, 0.05, uv.y) * smoothstep(0.0, 0.04, uv.x) * smoothstep(0.0, 0.04, 1.0 - uv.x);
  frag = uKeep * texture(uSrc, from) * open(uv) * mix(1.0, gone, uDrain);
}`;

export const INK_ADD = GRID + `
uniform sampler2D uSrc; uniform vec2 uAt; uniform vec4 uAdd; uniform float uWide;
out vec4 frag;
void main(){
  vec2 uv = gl_FragCoord.xy / uSize; vec2 d = where(uv) - uAt;
  frag = texture(uSrc, uv) + uAdd * exp(-dot(d, d) / uWide);
}`;

export const INK_FORCE = GRID + `
uniform sampler2D uVel, uInk; uniform float uDt, uSink, uSwirl;
out vec4 frag;
float curl(vec2 uv){
  vec2 t = 1.0 / uSize;
  return 0.5 * ((texture(uVel, uv + vec2(t.x, 0.0)).y - texture(uVel, uv - vec2(t.x, 0.0)).y) - (texture(uVel, uv + vec2(0.0, t.y)).x - texture(uVel, uv - vec2(0.0, t.y)).x));
}
void main(){
  vec2 uv = gl_FragCoord.xy / uSize, t = 1.0 / uSize;
  vec2 v = texture(uVel, uv).xy;
  // Ink is heavier than what it is in, so it sinks. Small whirls are fed a little, or the grid smooths them away.
  v.y -= uSink * texture(uInk, uv).r * uDt;
  vec2 f = 0.5 * vec2(abs(curl(uv + vec2(0.0, t.y))) - abs(curl(uv - vec2(0.0, t.y))), abs(curl(uv - vec2(t.x, 0.0))) - abs(curl(uv + vec2(t.x, 0.0))));
  f = f / (length(f) + 1e-5) * uSwirl * curl(uv);
  frag = vec4((v + f * uDt) * open(uv), 0.0, 1.0);
}`;

export const INK_SPREAD = GRID + `
uniform sampler2D uVel;
out vec4 frag;
void main(){
  vec2 uv = gl_FragCoord.xy / uSize, t = 1.0 / uSize;
  vec2 c = texture(uVel, uv).xy;
  vec2 L = uv - vec2(t.x, 0.0), R = uv + vec2(t.x, 0.0), B = uv - vec2(0.0, t.y), T = uv + vec2(0.0, t.y);
  float l = open(L) < 0.5 ? -c.x : texture(uVel, L).x, r = open(R) < 0.5 ? -c.x : texture(uVel, R).x;
  float b = open(B) < 0.5 ? -c.y : texture(uVel, B).y, tt = open(T) < 0.5 ? -c.y : texture(uVel, T).y;
  frag = vec4(0.5 * (r - l + tt - b), 0.0, 0.0, 1.0);
}`;

export const INK_PRESS = GRID + `
uniform sampler2D uPress, uSpread;
out vec4 frag;
void main(){
  vec2 uv = gl_FragCoord.xy / uSize, t = 1.0 / uSize;
  float c = texture(uPress, uv).r;
  vec2 L = uv - vec2(t.x, 0.0), R = uv + vec2(t.x, 0.0), B = uv - vec2(0.0, t.y), T = uv + vec2(0.0, t.y);
  float l = open(L) < 0.5 ? c : texture(uPress, L).r, r = open(R) < 0.5 ? c : texture(uPress, R).r;
  float b = open(B) < 0.5 ? c : texture(uPress, B).r, tt = open(T) < 0.5 ? c : texture(uPress, T).r;
  frag = vec4((l + r + b + tt - texture(uSpread, uv).r) * 0.25, 0.0, 0.0, 1.0);
}`;

export const INK_LEVEL = GRID + `
uniform sampler2D uPress, uVel;
out vec4 frag;
void main(){
  vec2 uv = gl_FragCoord.xy / uSize, t = 1.0 / uSize;
  float c = texture(uPress, uv).r;
  vec2 L = uv - vec2(t.x, 0.0), R = uv + vec2(t.x, 0.0), B = uv - vec2(0.0, t.y), T = uv + vec2(0.0, t.y);
  float l = open(L) < 0.5 ? c : texture(uPress, L).r, r = open(R) < 0.5 ? c : texture(uPress, R).r;
  float b = open(B) < 0.5 ? c : texture(uPress, B).r, tt = open(T) < 0.5 ? c : texture(uPress, T).r;
  frag = vec4((texture(uVel, uv).xy - 0.5 * vec2(r - l, tt - b)) * open(uv), 0.0, 1.0);
}`;

export const INK_SHOW = COMMON + `
uniform sampler2D uInk; uniform vec2 uInkSize;
out vec4 frag;
void main(){
  ${PANEL}
  vec2 uv = (gl_FragCoord.xy - uOrigin) / uRes, t = 1.0 / uInkSize;
  float d = texture(uInk, uv).r;
  vec2 g = vec2(texture(uInk, uv + vec2(t.x, 0.0)).r - texture(uInk, uv - vec2(t.x, 0.0)).r, texture(uInk, uv + vec2(0.0, t.y)).r - texture(uInk, uv - vec2(0.0, t.y)).r);
  float thick = 1.0 - exp(-d * 1.5);
  vec3 col = scene(p, px);
  // Thin ink is a dark ember veil, thick ink is pale. Its folds catch the cursor's light as if it had a surface.
  vec3 n = normalize(vec3(-g * 5.0, 1.0));
  float near = 1.0 / (1.0 + dot(p - uLight, p - uLight) / 0.03);
  vec3 H = normalize(normalize(vec3(uLight - p, 0.2)) + vec3(0.0, 0.0, 1.0));
  vec3 ink = heat(0.1 + 0.8 * thick) * (0.5 + 0.5 * n.y * 0.6 + 0.5) + uPale * pow(max(dot(n, H), 0.0), 18.0) * (0.3 + 1.6 * near) * thick;
  col = mix(col, ink, smoothstep(0.04, 0.5, thick));
  frag = vec4(show(col), 1.0);
}`;
