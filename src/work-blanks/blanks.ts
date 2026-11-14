import { clock } from '../world/clock';
import { lamp } from '../lamp/lamp';
import { MAX_RATIO, program } from '../stream-ideas/gl';

// A derby of blanks for a sleeping card: four designs in mirror polished bronze, each drawn over a real card, with
// a way of waking that shows the card through it. One canvas, one shader, a height worked out per pixel. A mirror
// only shows what is round it, so the blanks reflect a room of long lights that stand off the screen: the bands
// slide as the page scrolls, as a card turns under the pointer, and with the cursor's own light.

const VERT = `#version 300 es
in vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uSize, uOrigin, uView, uPointer;
uniform float uDpr;
uniform vec4 uTiles[4];
uniform float uWake[4];
uniform vec3 uLamp;
uniform vec3 uPale, uHot;
out vec4 frag;

const int NS = 14;
// The card's layout as plain shapes, in the card's own units (460 across) and where the real card has them: the
// picture, the band, the title, four lines of words, three tags, the foot's rule, two links and the case study.
const vec4 S[NS] = vec4[NS](
  vec4(15.0, 15.0, 445.0, 226.0), vec4(15.0, 236.0, 445.0, 266.0), vec4(22.0, 285.0, 300.0, 311.0),
  vec4(22.0, 324.0, 410.0, 338.0), vec4(22.0, 346.0, 430.0, 360.0), vec4(22.0, 368.5, 422.0, 382.5), vec4(22.0, 391.0, 300.0, 405.0),
  vec4(22.0, 425.0, 130.0, 447.0), vec4(136.0, 425.0, 226.0, 447.0), vec4(232.0, 425.0, 336.0, 447.0),
  vec4(22.0, 460.4, 438.0, 461.6), vec4(22.0, 478.0, 66.0, 494.0), vec4(80.0, 478.0, 124.0, 494.0), vec4(350.0, 478.0, 438.0, 494.0));
const float SR[NS] = float[NS](9.0, 6.0, 7.0, 6.0, 6.0, 6.0, 6.0, 11.0, 11.0, 11.0, 0.6, 7.0, 7.0, 7.0);
// The one facet the slopes round a point are measured on, so a ridge between two facets stays a clean line.
int gFacet = -1;
const int NF = 10;
// The facets: which way each slopes, how steeply, and how far from the middle it begins.
const vec3 F[NF] = vec3[NF](
  vec3(0.35, 0.9, 0.22), vec3(1.31, 0.6, 0.55), vec3(2.44, 1.1, 0.2), vec3(3.49, 0.7, 0.42), vec3(4.45, 1.0, 0.5), vec3(5.59, 0.8, 0.36),
  vec3(0.86, 1.7, 0.98), vec3(2.2, 1.5, 1.02), vec3(3.9, 1.8, 0.94), vec3(5.5, 1.6, 1.0));

float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }

// The nearest of the layout's shapes, and how far up that shape the point is, 0 at its foot.
float shapes(vec2 p, int design, float H, out float up){
  float d = 1e5; up = 0.0;
  for (int i = 0; i < NS; i++){
    vec4 b = S[i]; float r = SR[i];
    if (i >= 11){ b.y += (H - 510.0) * 0.5; b.w += (H - 510.0) * 0.5; }
    bool line = (i >= 3 && i <= 6) || i == 10;
    if (line && design == 0){ float m = (b.y + b.w) * 0.5; b.y = m - 0.2; b.w = m + 0.2; r = 0.2; }
    float di = sdBox(p - (b.xy + b.zw) * 0.5, (b.zw - b.xy) * 0.5, r);
    if (di < d){ d = di; up = (b.w - p.y) / max(b.w - b.y, 1.0); }
  }
  return d;
}

// The height of a blank's face at a point, in the card's units. k carries what the waking and the shading need:
// two numbers for the order things wake in, how satin the surface is, and how deep in a cut the point is.
float face(vec2 p, int design, float H, float edge, out vec4 k){
  k = vec4(0.0);
  vec2 c = vec2(230.0, H * 0.5), q = (p - c) / 230.0;
  float rim = edge < 2.2 ? 2.7 * sqrt(max(1.0 - pow(1.0 - edge / 2.2, 2.0), 0.0)) : edge < 3.6 ? 2.7 : 2.7 * (1.0 - smoothstep(3.6, 6.6, edge));
  float h = 2.4 * (1.0 - q.x * q.x) * (1.0 - pow(q.y * 460.0 / H, 2.0));
  float inside = smoothstep(6.6, 9.0, edge);
  if (design == 0){
    float up; float d = abs(shapes(p, 0, H, up));
    k.w = (1.0 - smoothstep(0.0, 1.2, d)) * inside;
    h -= 0.85 * k.w; k.x = d;
  } else if (design == 1){
    float up; float d = shapes(p, 1, H, up);
    h -= 2.8 * smoothstep(0.0, -3.4, d) * inside;
    k.z = smoothstep(-2.8, -3.8, d) * inside; k.x = d; k.y = up;
  } else if (design == 2){
    float low = 1.0, next = 9.0, id = 0.0;
    for (int i = 0; i < NF; i++){
      vec3 f = F[i]; float v = 1.0 + f.y * (f.z - dot(q, vec2(cos(f.x), sin(f.x))));
      if (gFacet >= 0){ if (i + 1 == gFacet) low = v; continue; }
      if (v < low){ next = low; low = v; id = float(i + 1); } else next = min(next, v);
    }
    h = mix(h, 20.0 * low, inside); k.x = id;
    k.y = (1.0 - smoothstep(0.0, 0.0045, next - low)) * inside;
  } else {
    float rho = length(p - c), th = atan(p.y - c.y, p.x - c.x);
    float rings = (1.0 - smoothstep(0.0, 1.1, abs(rho - 30.0))) + (1.0 - smoothstep(0.0, 0.9, abs(rho - 25.0)));
    float border = (1.0 - smoothstep(0.0, 1.0, abs(edge - 14.0)));
    k.w = min(1.0, rings + border);
    k.x = th; k.y = smoothstep(32.0, 36.0, rho) * smoothstep(15.0, 17.0, edge);
    h -= 0.8 * k.w;
    h += 1.6 * sqrt(max(1.0 - pow(rho / 24.0, 2.0), 0.0)) * step(rho, 24.0);
  }
  return h * inside + rim;
}

// The room the mirror shows: long lights standing off the screen, hard edged, and the cursor's light as a small
// panel of its own. d is where a reflected ray looks, up and to the right.
vec3 room(vec2 d, float blur, vec2 dl){
  float t = d.y + d.x * 0.38, e = 0.006 + blur;
  // Each light is a gradient, as a photographer's are: one hard edge, and a fall away from it.
  float wide = smoothstep(-0.275 - e, -0.275 + e, t) * (1.0 - smoothstep(-0.15 - e, -0.15 + e, t)) * mix(1.0, 0.4, clamp((t + 0.275) / 0.125, 0.0, 1.0));
  float line = smoothstep(-0.375 - e, -0.375 + e, t) * (1.0 - smoothstep(-0.352 - e, -0.352 + e, t));
  float high = (1.0 - smoothstep(0.32 - e, 0.32 + e, t)) * pow(smoothstep(0.0, 0.32, t), 1.6);
  float thin = smoothstep(0.4 - e, 0.4 + e, t) * (1.0 - smoothstep(0.42 - e, 0.42 + e, t));
  float far = smoothstep(0.85 - e, 0.85 + e, t) * (1.0 - smoothstep(1.5, 2.0, t));
  float low = 1.0 - smoothstep(-0.75, -0.5, t);
  vec3 col = mix(vec3(0.01, 0.007, 0.005), vec3(0.085, 0.055, 0.034), smoothstep(-0.9, 0.6, t));
  col += vec3(1.0, 0.9, 0.78) * (0.9 * wide + 0.55 * line + 0.78 * high + 0.45 * thin + 0.7 * far) + vec3(0.6, 0.4, 0.24) * 0.4 * low;
  vec2 kk = d - dl; float tl = kk.y + kk.x * 0.38;
  col += vec3(1.0, 0.88, 0.7) * 1.15 * (1.0 - smoothstep(0.03 - e, 0.03 + e, abs(tl))) * (1.0 - smoothstep(0.1 - e, 0.1 + e, abs(kk.x)));
  return col;
}

void main(){
  vec2 px = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  frag = vec4(0.0);
  for (int i = 0; i < 4; i++){
    vec4 tile = uTiles[i];
    if (px.x < tile.x - 1.0 || px.y < tile.y - 1.0 || px.x > tile.x + tile.z + 1.0 || px.y > tile.y + tile.w + 1.0) continue;
    float unit = tile.z / 460.0, H = tile.w / unit;
    vec2 p = (px - tile.xy) / unit;
    float box = sdBox(p - vec2(230.0, H * 0.5), vec2(230.0, H * 0.5), 18.0);
    float cov = clamp(0.5 - box * unit * uDpr, 0.0, 1.0);
    if (cov <= 0.0) return;
    float edge = -box;
    vec4 k, kx;
    gFacet = -1;
    float h0 = face(p, i, H, edge, k);
    if (i == 2) gFacet = int(k.x + 0.5);
    float e = 0.7;
    float hx = face(p + vec2(e, 0.0), i, H, -sdBox(p + vec2(e, 0.0) - vec2(230.0, H * 0.5), vec2(230.0, H * 0.5), 18.0), kx);
    float hy = face(p + vec2(0.0, e), i, H, -sdBox(p + vec2(0.0, e) - vec2(230.0, H * 0.5), vec2(230.0, H * 0.5), 18.0), kx);
    gFacet = -1;
    vec3 N = normalize(vec3(-(hx - h0) / e, -(hy - h0) / e, 1.0));
    // Under the pointer the card turns three degrees, the side under the pointer going back.
    vec2 over = (uPointer - (tile.xy + tile.zw * 0.5)) / (tile.zw * 0.5);
    if (abs(over.x) < 1.0 && abs(over.y) < 1.0) N = normalize(N + vec3(over * 0.052, 0.0));
    // The eye stands in front of the middle of the screen, so a flat face still shows a different part of the room
    // at each point, and what it shows slides as the page scrolls.
    vec2 at = uOrigin + px;
    vec3 V = normalize(vec3(uView * 0.5 - at, 1100.0));
    vec3 R = reflect(-V, N);
    vec2 d = vec2(R.x, -R.y) / max(R.z, 0.25);
    vec2 dl = vec2(uLamp.x - at.x, -(uLamp.y - at.y)) / 420.0;
    vec3 col = room(d, k.z * 0.1, dl);
    if (i == 3 && k.y > 0.0){
      // Turned rays are finer than a pixel. Each scatters the room across itself, so the lights smear round the
      // dial into fans that turn as the light moves.
      vec2 round = vec2(-sin(k.x), -cos(k.x));
      vec3 fan = vec3(0.0);
      for (int j = -6; j <= 6; j++) fan += room(d + round * float(j) * 0.085, 0.05, dl);
      col = mix(col, fan / 13.0 * (1.0 + 0.07 * sin(k.x * 240.0)), k.y);
    }
    // A ridge between two facets is a polished edge, and catches a line of light.
    if (i == 2) col += vec3(0.5, 0.42, 0.33) * k.y;
    col *= vec3(1.0, 0.71, 0.44) * (1.0 - 0.3 * k.z) * (1.0 - 0.55 * k.w);
    col = pow(min(col, vec3(1.0)), vec3(1.0 / 2.2));

    // Waking: how much of the real card shows through at this point, and the light at the edge of the change.
    float w = uWake[i], shown = 0.0, lit = 0.0;
    if (i == 0){
      float reach = (w - 0.18) / 0.82 * 118.0;
      shown = smoothstep(0.0, 5.0, reach - k.x);
      lit = k.w * smoothstep(0.0, 0.2, w) * (1.0 - smoothstep(0.5, 0.95, w)) + 0.7 * (1.0 - smoothstep(0.0, 3.0, abs(reach - k.x))) * step(0.18, w) * (1.0 - smoothstep(0.9, 1.0, w));
    } else if (i == 1){
      float fill = smoothstep(0.0, 0.62, w);
      float pocket = step(k.x, -0.5) * step(k.y, fill * 1.02);
      shown = max(pocket * step(0.001, w), smoothstep(0.55, 1.0, w));
      lit = step(k.x, -0.5) * (1.0 - smoothstep(0.0, 0.06, abs(k.y - fill))) * step(0.001, w) * (1.0 - step(0.62, w));
    } else if (i == 2){
      float start = (k.x / 11.0) * 0.62;
      shown = smoothstep(start, start + 0.26, w);
      lit = shown * (1.0 - shown) * 3.0;
    } else {
      float front = mix(-40.0, H + 40.0, w);
      shown = smoothstep(4.0, -4.0, p.y - front);
      lit = (1.0 - smoothstep(0.0, 22.0, abs(p.y - front))) * step(0.001, w) * (1.0 - step(0.999, w));
    }
    shown = edge < 6.6 ? smoothstep(0.75, 1.0, w) : shown;
    float a = cov * (1.0 - shown);
    frag = vec4(col * a + mix(uHot, uPale, 0.6) * lit * cov * 0.8, min(1.0, a + lit * cov * 0.5));
    return;
  }
}`;

export interface Blanks {
  // Wake a blank or put it back to sleep. With an amount, hold it part way.
  wake(i: number, on: boolean, held?: number): void;
  slow(on: boolean): void;
  dispose(): void;
}

export function mountBlanks(canvas: HTMLCanvasElement, tiles: HTMLElement[]): Blanks {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) return { wake() {}, slow() {}, dispose() {} };
  const { p, u } = program(gl, VERT, FRAG);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  lamp.bind();
  const want = [0, 0, 0, 0], shown = [0, 0, 0, 0], held: (number | null)[] = [null, null, null, null];
  const rects = new Float32Array(16), wakes = new Float32Array(4);
  let rate = 1;
  const pointer = { x: -1e5, y: -1e5 };
  const move = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; };
  addEventListener('pointermove', move, { passive: true });
  const off = clock.onFrame((_, dt) => {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(MAX_RATIO, devicePixelRatio || 1);
    const w = Math.round(box.width * dpr), h = Math.round(box.height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    tiles.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      rects.set([r.left - box.left, r.top - box.top, r.width, r.height], i * 4);
      const to = held[i] ?? want[i];
      shown[i] = dt <= 0 || held[i] !== null ? to : shown[i] + Math.sign(to - shown[i]) * Math.min(Math.abs(to - shown[i]), (dt * rate) / 0.55);
      wakes[i] = shown[i] * shown[i] * (3 - 2 * shown[i]);
    });
    const l = lamp.get();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(p);
    gl.uniform2f(u('uSize'), box.width, box.height);
    gl.uniform2f(u('uOrigin'), box.left, box.top);
    gl.uniform2f(u('uView'), innerWidth, innerHeight);
    gl.uniform2f(u('uPointer'), pointer.x - box.left, pointer.y - box.top);
    gl.uniform1f(u('uDpr'), dpr);
    gl.uniform4fv(u('uTiles'), rects);
    gl.uniform1fv(u('uWake'), wakes);
    gl.uniform3f(u('uLamp'), l.px, l.py, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
  return {
    wake(i, on, amount) { want[i] = on ? 1 : 0; held[i] = amount ?? null; },
    slow(on) { rate = on ? 0.25 : 1; },
    dispose() { off(); removeEventListener('pointermove', move); gl.deleteProgram(p); gl.deleteBuffer(quad); },
  };
}
