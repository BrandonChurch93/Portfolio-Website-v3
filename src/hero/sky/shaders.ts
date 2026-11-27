import { DEEP } from './deep';

// The sky's shaders. Everything is worked out in linear light in device pixels, y down, and turned into the
// palette's tones only at the end (TONE): what is too bright goes to pale gold, never to white.

const HEAD = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
`;

const COMMON = /* glsl */ `
uniform vec2 uSize;
vec2 P() { return vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y); }
float erf1(float x) { float x2 = x * x; float t = x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2); return sign(x) * sqrt(1.0 - exp(-t)); }
// A gaussian's light over the whole of one pixel, so a star smaller than a pixel is spread, never point sampled.
float pix(float c, float s) { float k = 0.70710678 / s; return 0.5 * (erf1((c + 0.5) * k) - erf1((c - 0.5) * k)); }
uint mixu(uint x) { x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }
float h2(vec2 p) { uvec2 q = uvec2(ivec2(floor(p)) + 1048576); return float(mixu(q.x ^ mixu(q.y + 0x9e3779b9u))) / 4294967296.0; }
float h3(vec3 p) { uvec3 q = uvec3(ivec3(floor(p)) + 1048576); return float(mixu(q.x ^ mixu(q.y ^ mixu(q.z + 0x632be5abu)))) / 4294967296.0; }
vec2 g2(vec2 i) { float a = 6.2831853 * h2(i); return vec2(cos(a), sin(a)); }
float gnoise(vec2 p) {
  vec2 i = floor(p), f = p - i, u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(g2(i), f), b = dot(g2(i + vec2(1, 0)), f - vec2(1, 0));
  float c = dot(g2(i + vec2(0, 1)), f - vec2(0, 1)), d = dot(g2(i + vec2(1, 1)), f - vec2(1, 1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// Octaves whose wavelength is under about three pixels are left out: nothing finer than a pixel.
float fbm(vec2 p, int n, float px) {
  float s = 0.0, a = 0.5, w = 0.0;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 9; i++) {
    if (i >= n) break;
    s += a * clamp(px / 3.0 - 1.0, 0.0, 1.0) * gnoise(p);
    w += a;
    p = r * p * 2.03 + 17.3;
    a *= 0.53;
    px *= 0.4926;
  }
  return s / w;
}
vec3 g3(vec3 i) { float z = h3(i) * 2.0 - 1.0, a = 6.2831853 * h3(i + 31.0), r = sqrt(1.0 - z * z); return vec3(r * cos(a), r * sin(a), z); }
float gnoise3(vec3 p) {
  vec3 i = floor(p), f = p - i, u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(g3(i), f), b = dot(g3(i + vec3(1, 0, 0)), f - vec3(1, 0, 0));
  float c = dot(g3(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)), d = dot(g3(i + vec3(1, 1, 0)), f - vec3(1, 1, 0));
  float e = dot(g3(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)), g = dot(g3(i + vec3(1, 0, 1)), f - vec3(1, 0, 1));
  float h = dot(g3(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)), k = dot(g3(i + vec3(1, 1, 1)), f - vec3(1, 1, 1));
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, g, u.x), mix(h, k, u.x), u.y), u.z);
}
float fbm3(vec3 p, int n, float px) {
  float s = 0.0, a = 0.5, w = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= n) break;
    s += a * clamp(px / 3.0 - 1.0, 0.0, 1.0) * gnoise3(p);
    w += a;
    p = p.yzx * 2.07 + vec3(11.3, 5.7, 3.1);
    a *= 0.52;
    px *= 0.483;
  }
  return s / w;
}
`;

const TONE = /* glsl */ `
uniform vec3 uWhite;
vec3 tone(vec3 x) { return uWhite * (1.0 - exp(-max(x, 0.0) / uWhite)); }
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
`;

export const RECT_VS = HEAD + /* glsl */ `
layout(location = 0) in vec2 aCorner;
uniform vec2 uSize;
uniform vec4 uRect;
void main() {
  vec2 p = mix(uRect.xy, uRect.zw, aCorner * 0.5 + 0.5);
  gl_Position = vec4(p.x / uSize.x * 2.0 - 1.0, 1.0 - p.y / uSize.y * 2.0, 0.0, 1.0);
}`;

export const SPLAT_VS = HEAD + /* glsl */ `
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec2 aPos;
layout(location = 2) in vec3 aCol;
layout(location = 3) in vec3 aShape;
uniform vec2 uSize;
uniform float uS;
flat out vec2 vPos;
flat out vec3 vCol;
flat out vec3 vShape;
void main() {
  float ext = ceil(3.5 * aShape.x + 1.0);
  if (aShape.y > 0.0) ext = max(ext, max(ceil(1.3 * uS * 7.0), aShape.z + 2.0));
  vec2 p = aPos + aCorner * ext;
  vPos = aPos; vCol = aCol; vShape = aShape;
  gl_Position = vec4(p.x / uSize.x * 2.0 - 1.0, 1.0 - p.y / uSize.y * 2.0, 0.0, 1.0);
}`;

export const SPLAT_FS = HEAD + COMMON + /* glsl */ `
flat in vec2 vPos;
flat in vec3 vCol;
flat in vec3 vShape;
uniform float uS;
uniform vec2 uTilt;
out vec4 o;
void main() {
  vec2 c = P() - vPos;
  float I = pix(c.x, vShape.x) * pix(c.y, vShape.x) * (1.0 - vShape.y);
  if (vShape.y > 0.0) {
    float r0 = 1.3 * uS, R = r0 * 7.0, q = dot(c, c);
    float m = pow(1.0 + q / (r0 * r0), -2.5) / (3.14159265 * r0 * r0 / 1.5);
    float t = clamp(1.0 - q / (R * R), 0.0, 1.0);
    I += vShape.y * m * t * t;
    // The same lens's spikes, short and faint on these.
    vec2 d = vec2(dot(c, uTilt), dot(c, vec2(-uTilt.y, uTilt.x)));
    float L = vShape.z, w = max(0.36, 0.28 * uS);
    float sx = pix(d.y, w) * pow(clamp(1.0 - abs(d.x) / L, 0.0, 1.0), 3.0);
    float sy = pix(d.x, w) * pow(clamp(1.0 - abs(d.y) / L, 0.0, 1.0), 3.0);
    I += 0.6 * vShape.y * (sx + sy) / L;
  }
  o = vec4(vCol * I, 0.0);
}`;

// The band of far stars: a galaxy seen edge on. uMode 0 is its dust, laid over what is already drawn as a
// multiply, so the stars behind it are dimmed and reddened; uMode 1 is its light, with the dust already in it.
export const BAND_FS = HEAD + COMMON + /* glsl */ `
uniform vec2 uC;
uniform vec2 uAx;
uniform vec2 uR;
uniform vec4 uClear;
uniform float uEnd;
uniform float uFade;
uniform float uS;
uniform float uBright;
uniform int uMode;
uniform vec3 uBody;
uniform vec3 uCore;
out vec4 o;
float maskAt(vec2 p) {
  float e = length((p - uClear.xy) / uClear.zw);
  return smoothstep(1.0, 1.65, e) * smoothstep(uEnd, uEnd - uFade, p.y);
}
void main() {
  vec2 p = P(), d = p - uC;
  float a = dot(d, uAx) / uR.x, b = dot(d, vec2(-uAx.y, uAx.x)) / uR.y;
  float m = maskAt(p);
  if (m <= 0.0 || abs(b) > 4.0 || abs(a) > 2.0) { o = uMode == 0 ? vec4(1.0) : vec4(0.0); return; }
  vec2 q = vec2(a * uR.x / uR.y, b);
  float px = uR.y;
  float wave = 0.09 * sin(a * 2.3 + 0.7) + 0.5 * fbm(vec2(q.x * 0.22, 5.0), 3, px * 4.0);
  float bc = b - wave;
  float wid = 1.0 + 0.55 * fbm(vec2(q.x * 0.3, 11.0), 3, px * 3.0);
  float along = smoothstep(1.9, 0.9, abs(a));
  vec2 w = q + 0.7 * vec2(fbm(q * 0.45 + 3.1, 4, px * 2.2), fbm(q * 0.45 + 8.7, 4, px * 2.2));
  vec2 ws = vec2(w.x * 0.5, w.y);
  float cl = fbm(ws * 1.3, 8, px * 0.77);
  float fine = fbm(ws * 4.0 + 21.0, 6, px * 0.25);
  float z = bc / wid;
  float body = (exp(-2.4 * z * z) + 0.35 * exp(-0.45 * z * z)) * along;
  float bulge = exp(-pow((a - 0.05) / 0.24, 2.0) - pow(bc / 1.25, 2.0));
  float clouds = pow(clamp(0.45 + 2.2 * cl + 0.6 * fine, 0.0, 2.6), 1.35);

  float lane = 0.08 + 0.45 * fbm(vec2(q.x * 0.28, 2.0), 4, px * 3.5);
  float lw = 0.11 + 0.14 * (0.5 + fbm(vec2(q.x * 0.5, 7.0), 3, px * 2.0));
  float rift = exp(-pow((bc - lane) / lw, 2.0));
  float tex = fbm(ws * 2.6 + 40.0, 8, px * 0.38);
  float fil = 1.0 - abs(2.0 * fbm(vec2(ws.x * 0.8, ws.y) * 3.4 + 70.0, 7, px * 0.29));
  fil = pow(clamp(fil, 0.0, 1.0), 7.0);
  float env = exp(-pow(bc / 1.6, 2.0)) * along;
  float tau = env * (3.2 * rift * clamp(0.8 + 1.8 * tex, 0.25, 1.7) + 1.3 * smoothstep(0.08, 0.34, tex) * exp(-bc * bc) + 1.3 * fil * exp(-pow(bc / 1.1, 2.0)));
  vec3 T = exp(-tau * m * vec3(0.78, 1.0, 1.3));
  if (uMode == 0) { o = vec4(T, 1.0); return; }

  // Its grain: a star in each small cell, most of them very faint, spread over the pixels they fall on.
  float cs = 0.9 * uS, sig = max(0.45, 0.24 * uS), grain = 0.0;
  vec2 g = p / cs, i0 = floor(g);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 i = i0 + vec2(x, y);
    vec2 at = (i + vec2(h2(i + 5.3), h2(i + 77.1))) * cs;
    float f = min(12.0, pow(max(1.0 - h2(i + 913.0), 1e-4), -0.72)) * 0.27;
    vec2 c = p - at;
    grain += f * cs * cs * pix(c.x, sig) * pix(c.y, sig);
  }
  vec3 light = (body * uBody * 0.75 + 2.6 * bulge * uCore) * clouds;
  float fray = smoothstep(0.0, 1.0, m * (1.0 + 1.6 * fbm(q * 0.8 + 50.0, 6, px * 1.2) + 0.9 * cl));
  vec3 col = light * (0.72 + 0.28 * grain) * T * fray * uBright;
  o = vec4(col, 0.0);
}`;

// The light a far off city throws into the sky: brightest low behind it, gone to nothing well inside the canvas.
export const GLOW_FS = HEAD + COMMON + /* glsl */ `
uniform vec4 uGlow;
uniform float uDown;
uniform float uStrength;
uniform vec3 uHotC;
uniform vec3 uDeepC;
out vec4 o;
void main() {
  vec2 d = P() - uGlow.xy;
  d = vec2(d.x / uGlow.z, d.y / (d.y < 0.0 ? uGlow.w : uDown));
  float r2 = dot(d, d);
  if (r2 >= 1.0) { o = vec4(0.0); return; }
  float f = (1.0 - r2) * (1.0 - r2) * (0.28 + 0.72 * exp(-2.8 * r2));
  o = vec4(mix(uDeepC, uHotC, smoothstep(0.0, 0.9, f)) * f * uStrength, 0.0);
}`;

// A moon's surface as heights and colors, seen from straight in front: one texel for each point of its disk.
// The large craters are listed; the rest are a field of craters at every size down to a pixel, one in most cells
// of a grid at each size, as on a surface that has been struck for billions of years.
export const HEIGHT_FS = HEAD + COMMON + /* glsl */ `
uniform sampler2D uCr;
uniform int uCount;
uniform float uN;
uniform float uSpan;
uniform float uPx;
uniform vec4 uMare[4];
uniform float uSeed;
uniform float uMareDark;
uniform float uFlood;
out vec4 o;
float crater(float r, float kind, float peak) {
  float bowl = r < 1.0 ? r * r - 1.0 : 0.0;
  if (peak > 0.0) bowl = max(bowl, -0.62);
  float h = bowl + 0.27 * exp(-pow((r - 1.0) / 0.15, 2.0)) + 0.09 * exp(-max(r - 1.0, 0.0) * 2.3) + peak * exp(-pow(r / 0.16, 2.0));
  if (kind > 1.5) h += 0.1 * exp(-pow((r - 1.5) / 0.07, 2.0)) + 0.06 * exp(-pow((r - 2.05) / 0.09, 2.0));
  return h;
}
void field(vec3 p, float cell, float seed, float flood, float keep, inout float h, inout float alb) {
  if (cell * 0.5 * uPx < 1.2) return;
  vec3 g = p / cell, i0 = floor(g);
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 i = i0 + vec3(x, y, z);
    if (h3(i + seed) > keep * (0.4 + 1.2 * clamp(0.5 + 1.4 * gnoise3(i * cell * 3.0 + seed), 0.0, 1.0))) continue;
    vec3 c = normalize((i + vec3(h3(i + seed + 1.7), h3(i + seed + 5.3), h3(i + seed + 9.1))) * cell);
    float R = cell * (0.16 + 0.36 * pow(h3(i + seed + 13.0), 2.2));
    float vis = smoothstep(0.8, 1.6, R * uPx);
    if (vis <= 0.0) continue;
    float r = length(p - c) / R;
    if (r > 2.6) continue;
    float age = h3(i + seed + 21.0);
    h += vis * flood * R * (0.03 + 0.17 * age * age) * crater(r, 0.0, 0.0);
    float fresh = smoothstep(0.985, 0.998, h3(i + seed + 33.0)) * step(cell, 0.05);
    alb += vis * flood * (0.07 * exp(-pow((r - 1.0) / 0.22, 2.0)) * (1.0 - age) - 0.03 * step(r, 0.9));
    alb += vis * fresh * (0.22 * exp(-pow(r / 1.2, 4.0)) + 0.08 * exp(-max(r - 1.0, 0.0) * 1.2));
  }
}
void main() {
  vec2 xy = ((gl_FragCoord.xy / uN) * 2.0 - 1.0) * uSpan;
  float r2 = dot(xy, xy);
  if (r2 > 0.9995) xy *= 0.99975 / sqrt(r2);
  vec3 p = vec3(xy, sqrt(max(0.0, 1.0 - dot(xy, xy))));
  float px = uPx;
  vec3 pw = p + 0.22 * vec3(fbm3(p * 2.6 + uSeed, 5, px * 0.38), fbm3(p * 2.6 + uSeed + 5.0, 5, px * 0.38), fbm3(p * 2.6 + uSeed + 9.0, 5, px * 0.38));
  float mf = 0.0;
  for (int i = 0; i < 4; i++) {
    if (uMare[i].w <= 0.0) continue;
    float c = length(pw - uMare[i].xyz) / uMare[i].w;
    mf += exp(-c * c * 1.3);
  }
  float edge = 0.75 * mf + 0.85 * fbm3(pw * 3.4 + uSeed, 6, px * 0.29) + 0.25 * fbm3(pw * 11.0 + uSeed, 5, px * 0.09);
  float mare = smoothstep(0.36, 0.66, edge);
  float flood = 1.0 - uFlood * mare;
  float h = -0.006 * mare + 0.005 * (1.0 - 0.8 * mare) * fbm3(p * 9.0 + uSeed, 7, px * 0.11);
  float alb = 0.84 + 0.16 * fbm3(pw * 4.0 + 3.0 + uSeed, 6, px * 0.25) + 0.1 * fbm3(p * 19.0 + uSeed, 6, px * 0.053);
  float low = uMareDark * (1.0 + 0.9 * fbm3(pw * 4.0 + 9.0 + uSeed, 6, px * 0.25) + 0.7 * fbm3(p * 13.0 + uSeed, 6, px * 0.077) + 0.35 * fbm3(p * 31.0 + uSeed, 5, px * 0.032));
  alb = mix(alb, low, mare);
  field(p, 0.15, uSeed + 1.0, flood, 0.6, h, alb);
  field(p, 0.08, uSeed + 2.0, flood, 0.5, h, alb);
  field(p, 0.043, uSeed + 3.0, mix(flood, 1.0, 0.4), 0.42, h, alb);
  field(p, 0.023, uSeed + 4.0, mix(flood, 1.0, 0.6), 0.36, h, alb);
  field(p, 0.0125, uSeed + 5.0, 1.0, 0.3, h, alb);
  for (int i = 0; i < 256; i++) {
    if (i >= uCount) break;
    vec4 c0 = texelFetch(uCr, ivec2(i, 0), 0), c1 = texelFetch(uCr, ivec2(i, 1), 0);
    vec3 dv = p - c0.xyz;
    float wob = 1.0 + 0.05 * gnoise3(p * 31.0 + c1.w * 40.0);
    float r = length(dv) / c0.w * wob;
    float reach = c1.y > 1.5 ? 2.4 : c1.y > 0.5 ? 6.0 : 3.0;
    if (r > reach) continue;
    float fl = c1.y < 0.5 && c0.w < 0.09 ? flood : 1.0;
    h += c0.w * c1.x * crater(r, c1.y, c1.z) * fl;
    if (c1.y > 1.5) alb = mix(alb, low * 1.1, smoothstep(0.9, 0.5, r) * clamp(0.35 + 0.8 * fbm3(p * 14.0 + 3.0, 5, uPx * 0.07), 0.0, 0.7));
    else alb += 0.06 * exp(-pow((r - 1.0) / 0.2, 2.0)) * fl;
    if (c1.y > 0.5 && c1.y < 1.5) {
      vec3 u = normalize(cross(c0.xyz, vec3(0.31, 0.95, 0.0))), v = cross(c0.xyz, u);
      float th = atan(dot(dv, v), dot(dv, u));
      vec2 ring = vec2(cos(th), sin(th));
      float ray = gnoise(ring * 2.6 + c1.w * 50.0) + 0.5 * gnoise(ring * 6.0 + c1.w * 90.0);
      ray = smoothstep(-0.1, 0.6, ray) * exp(-max(r - 1.0, 0.0) / 2.2) * smoothstep(0.9, 1.6, r);
      alb += 0.14 * ray + 0.22 * exp(-pow(r / 1.05, 6.0));
    }
  }
  o = vec4(h, clamp(alb, 0.05, 1.4), mare, 1.0);
}`;

// A moon lit by its sun: its surface from the heights, shadows cast across it, the light of the planet on its night
// side, and a thin ring when it has one.
export const MOON_FS = HEAD + COMMON + /* glsl */ `
uniform sampler2D uHt;
uniform vec2 uCen;
uniform float uRad;
uniform float uSpan;
uniform float uTexN;
uniform vec3 uSun;
uniform vec3 uEarth;
uniform float uSunI;
uniform float uEarthI;
uniform float uExag;
uniform vec3 uHigh;
uniform vec3 uMareC;
uniform vec3 uEarthC;
uniform vec3 uHaloC;
uniform float uHaloI;
uniform int uRing;
uniform vec3 uRingN;
uniform vec2 uRingR;
uniform vec3 uRingC;
out vec4 o;
vec2 toTex(vec2 xy) { return (xy / uSpan) * 0.5 + 0.5; }
float H(vec2 xy) { return texture(uHt, toTex(xy)).x; }
vec3 surf(vec2 xy) {
  float r2 = dot(xy, xy);
  vec2 q = r2 > 0.998 ? xy * 0.999 / sqrt(r2) : xy;
  float z = sqrt(1.0 - dot(q, q));
  return vec3(q, z) * (1.0 + uExag * smoothstep(0.0, 0.4, z) * H(q));
}
float ringO(float rr) {
  if (rr < uRingR.x || rr > uRingR.y) return 0.0;
  float k = (rr - uRingR.x) / (uRingR.y - uRingR.x);
  float lets = 0.55 + 0.3 * gnoise(vec2(rr * uRad / 7.0, 1.7)) + 0.2 * gnoise(vec2(rr * uRad / 3.5, 8.2));
  float gap = 1.0 - 0.85 * exp(-pow((k - 0.63) / 0.035, 2.0));
  return clamp(lets, 0.0, 1.0) * gap * smoothstep(0.0, 0.08, k) * smoothstep(1.0, 0.85, k) * mix(0.85, 0.5, k);
}
float ringShadow(vec3 s) {
  if (uRing == 0) return 1.0;
  float dl = dot(uSun, uRingN);
  if (abs(dl) < 1e-3) return 1.0;
  float t = -dot(s, uRingN) / dl;
  if (t <= 0.0) return 1.0;
  return 1.0 - 0.8 * ringO(length(s + uSun * t));
}
vec3 disk(vec2 xy) {
  vec3 n0 = vec3(xy, sqrt(max(0.0, 1.0 - dot(xy, xy))));
  float e = 1.0 / uTexN * 2.0 * uSpan;
  vec3 dx = surf(xy + vec2(e, 0.0)) - surf(xy - vec2(e, 0.0));
  vec3 dy = surf(xy + vec2(0.0, e)) - surf(xy - vec2(0.0, e));
  vec3 n = normalize(cross(dx, dy));
  if (dot(n, n0) < 0.0) n = -n;
  vec4 s = texture(uHt, toTex(xy));
  float mu0 = dot(n, uSun), mu = max(n.z, 0.05);
  float sinE = dot(n0, uSun);
  float sh = 0.0;
  if (mu0 > 0.0 && sinE > -0.2) {
    sh = 1.0;
    vec3 T = uSun - n0 * sinE;
    float tl = length(T);
    if (tl > 1e-3) {
      T /= tl;
      float tanE = sinE / tl, h0 = uExag * smoothstep(0.0, 0.4, n0.z) * s.x, st = 1.25 / uRad;
      for (int k = 1; k <= 32; k++) {
        float dd = float(k) * st;
        vec3 q = normalize(n0 + T * dd);
        if (q.z < 0.02) break;
        float hr = h0 + dd * tanE + 0.5 * dd * dd, hq = uExag * smoothstep(0.0, 0.4, q.z) * H(q.xy);
        float soft = 0.02 * dd + 0.0025;
        sh = min(sh, smoothstep(-soft, soft, hr - hq));
      }
    }
    sh *= ringShadow(n0);
  }
  float refl = s.y * (0.78 * 2.0 * max(mu0, 0.0) / (max(mu0, 0.0) + mu) + 0.22 * max(mu0, 0.0)) * sh;
  vec3 col = refl * uSunI * mix(uHigh, uMareC, s.z);
  col += s.y * max(dot(n, uEarth), 0.0) * uEarthI * uEarthC;
  return col;
}
vec4 over(vec4 top, vec4 under) { return top + under * (1.0 - top.a); }
void main() {
  vec4 acc = vec4(0.0);
  for (int k = 0; k < 4; k++) {
    vec2 off = vec2(float(k & 1), float(k >> 1)) * 0.5 - 0.25;
    vec2 p = P() + off, xy = (p - uCen) / uRad;
    xy.y = -xy.y;
    float r = length(xy);
    float cov = clamp((1.0 - r) * uRad * 2.0 + 0.5, 0.0, 1.0);
    vec4 d = vec4(0.0);
    if (cov > 0.0) {
      vec2 q = r > 0.999 ? xy * 0.999 / r : xy;
      d = vec4(disk(q) * cov, cov);
    }
    vec4 back = vec4(0.0), front = vec4(0.0);
    if (uRing == 1) {
      float z = -(uRingN.x * xy.x + uRingN.y * xy.y) / uRingN.z;
      vec3 Q = vec3(xy, z);
      float op = ringO(length(Q));
      if (op > 0.0) {
        float b = dot(Q, uSun), c = dot(Q, Q) - b * b;
        float lit = b < 0.0 ? smoothstep(0.96, 1.04, sqrt(max(c, 0.0))) : 1.0;
        vec3 rc = uRingC * uSunI * (0.3 + 0.7 * abs(dot(uRingN, uSun))) * lit * op;
        vec4 ring = vec4(rc, op);
        if (z >= 0.0) front = ring * min(1.0, 1.0 + 0.6 * (1.0 - r)); else back = ring;
      }
    }
    acc += over(front, over(d, back));
  }
  acc *= 0.25;
  vec2 xy = (P() - uCen) / uRad;
  float r = length(xy);
  float rr = max(r - 1.0, 0.0);
  vec2 toward = vec2(xy.x, -xy.y) / max(r, 1e-3);
  float side = 0.04 + 0.96 * smoothstep(-0.3, 0.75, dot(toward, normalize(uSun.xy)));
  float halo = uHaloI * side * (exp(-rr * 14.0) * 3.0 + exp(-rr * 2.6)) * smoothstep(2.6, 1.5, r) * smoothstep(0.97, 1.0, r);
  // Light on the page's own ground, as the sky is: the night side shows the ground with the planet's light on it.
  o = vec4(acc.rgb + uHaloC * halo * (1.0 - acc.a), 0.0);
}`;

// The static sky into the palette's tones, dithered so no gradient in it bands on an eight bit screen.
export const RESOLVE_FS = HEAD + COMMON + TONE + /* glsl */ `
uniform sampler2D uAcc;
uniform int uAdd;
out vec4 o;
void main() {
  vec4 a = texelFetch(uAcc, ivec2(gl_FragCoord.xy), 0);
  vec3 c = srgb(tone(a.rgb));
  vec2 f = gl_FragCoord.xy;
  float n = (h2(f) + h2(f + vec2(4171.0, 1931.0)) - 1.0) / 255.0;
  c = max(c + n * step(0.5 / 255.0, c), 0.0);
  o = uAdd == 1 ? vec4(c, 1.0) : vec4(c, max(a.a, max(c.r, max(c.g, c.b))));
}`;

export const BLIT_FS = HEAD + /* glsl */ `
uniform sampler2D uTex;
out vec4 o;
void main() { o = texelFetch(uTex, ivec2(gl_FragCoord.xy), 0); }`;

// A hidden star of the deep sky (deep.ts), drawn once into its own picture in display levels: its light is added,
// and where it is plain the picture's fourth channel keeps how early the reveal shows it, the earliest of any there.
export const DEEP_STAR_FS = HEAD + COMMON + /* glsl */ `
flat in vec2 vPos;
flat in vec3 vCol;
flat in vec3 vShape;
uniform float uHalo;
out vec4 o;
void main() {
  vec2 c = P() - vPos;
  float I = pix(c.x, vShape.x) * pix(c.y, vShape.x);
  if (vShape.y > 0.0) I += vShape.y * exp(-dot(c, c) / (2.0 * uHalo * uHalo)) / (6.2831853 * uHalo * uHalo);
  vec3 col = vCol * I;
  float most = max(col.r, max(col.g, col.b)) * 255.0;
  if (most < 0.25) discard;
  o = vec4(col, most > 0.6 ? vShape.z : 0.0);
}`;

// The deep sky shown over today's where the pointer and its pools reach. The reveal at a pixel is the most that any
// one pool gives it, and a thing shows once the reveal passes its own threshold. What is added keeps its color: it
// is held at uCap, and never under what today's sky has there.
const POOLS = DEEP.pools + 1;
export const DEEP_FS = HEAD + COMMON + /* glsl */ `
uniform sampler2D uSky;
uniform sampler2D uDeep;
uniform int uDrop;
uniform vec3 uPool[${POOLS}];
uniform int uPools;
uniform float uReach;
uniform float uSoft;
uniform vec2 uCap;
uniform int uAdd;
out vec4 o;
void main() {
  ivec2 at = ivec2(gl_FragCoord.xy);
  vec4 base = texelFetch(uSky, at, 0), d = texelFetch(uDeep, at - ivec2(0, uDrop), 0);
  vec2 p = P();
  float rho = 0.0;
  for (int i = 0; i < ${POOLS}; i++) {
    if (i >= uPools) break;
    vec2 v = p - uPool[i].xy;
    rho = max(rho, uPool[i].z * exp(-dot(v, v) / (uReach * uReach)));
  }
  float th = 1.0 - d.a;
  vec3 f = base.rgb + d.rgb * smoothstep(th, th + uSoft, rho);
  float k = min(1.0, max(max(base.r, max(base.g, base.b)), uCap.x) / max(max(f.r, max(f.g, f.b)), 1e-3));
  k *= min(1.0, max(min(base.r, min(base.g, base.b)), uCap.y) / max(min(f.r, min(f.g, f.b)) * k, 1e-3));
  vec3 c = max(f * k, base.rgb);
  o = uAdd == 1 ? vec4(c, 1.0) : vec4(c, max(base.a, max(c.r, max(c.g, c.b))));
}`;

// The bright few: a small hot core, a soft halo and four thin rays that taper to nothing, as a lens shows a
// bright star. They are drawn every time the sky is, so they can twinkle.
export const SPARK_VS = HEAD + /* glsl */ `
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec2 aPos;
layout(location = 2) in vec3 aCol;
layout(location = 3) in vec4 aB;
layout(location = 4) in vec2 aPh;
uniform vec2 uSize;
uniform float uT;
uniform float uAmp;
flat out vec2 vPos;
flat out vec3 vCol;
flat out float vE;
flat out float vL;
void main() {
  float tw = 1.0 + uAmp * (0.6 * sin(6.2831853 * aB.z * uT + aPh.x) + 0.4 * sin(6.2831853 * aB.w * uT + aPh.y));
  vE = aB.x * tw; vL = aB.y * (0.96 + 0.04 * tw); vPos = aPos; vCol = aCol;
  vec2 p = aPos + aCorner * (vL + 3.0);
  gl_Position = vec4(p.x / uSize.x * 2.0 - 1.0, 1.0 - p.y / uSize.y * 2.0, 0.0, 1.0);
}`;

export const SPARK_FS = HEAD + COMMON + TONE + /* glsl */ `
flat in vec2 vPos;
flat in vec3 vCol;
flat in float vE;
flat in float vL;
uniform float uS;
uniform vec3 uRayC;
uniform vec2 uTilt;
out vec4 o;
// One spike, as a lens's vanes spread a star's light: brightest where it leaves the core, falling as the square of
// the distance and widening as it fades, with the light's longer colors reaching further.
float ray(float along, float across, float L) {
  float k = clamp(along / L, 0.0, 1.0);
  float w = max(0.36, 0.28 * uS * (1.0 + 1.6 * k));
  float fall = 1.0 / (1.0 + pow(along / (0.045 * L), 2.0)) + 0.06 * pow(1.0 - k, 2.0);
  return pix(across, w) * w / max(0.36, 0.28 * uS) * fall * smoothstep(1.0, 0.7, k) * 9.0 / L;
}
void main() {
  vec2 d = P() - vPos;
  vec2 c = vec2(dot(d, uTilt), dot(d, vec2(-uTilt.y, uTilt.x)));
  float q = dot(d, d), L = vL;
  float sc = 0.75 * uS, sg = 2.6 * uS, r0 = 5.0 * uS;
  float core = pix(d.x, sc) * pix(d.y, sc);
  float glow = exp(-q / (2.0 * sg * sg)) / (6.2831853 * sg * sg);
  float halo = pow(1.0 + q / (r0 * r0), -1.8) / (3.14159265 * r0 * r0 * 1.25) * pow(clamp(1.0 - q / (L * L), 0.0, 1.0), 2.0);
  float ax = abs(c.x), ay = abs(c.y);
  float rx = ray(ax, c.y, L), ry = ray(ay, c.x, L);
  float along = max(ax, ay) / L;
  float bead = 0.5 + 0.5 * cos(along * 38.0);
  vec3 rc = mix(vCol, uRayC, clamp(along * along * 1.3, 0.0, 0.6) * (0.6 + 0.4 * bead));
  vec3 lin = vE * (vCol * (0.62 * core + 0.24 * glow + 0.16 * halo) + rc * 0.07 * (rx + ry));
  vec3 col = srgb(tone(lin));
  o = vec4(col, max(col.r, max(col.g, col.b)));
}`;

// A meteor: a short fine streak with a bright head, the trail cooling behind it.
export const METEOR_FS = HEAD + COMMON + TONE + /* glsl */ `
uniform vec2 uA;
uniform vec2 uB;
uniform float uLight;
uniform float uSpark;
uniform float uS;
uniform vec3 uHeadC;
uniform vec3 uTrailC;
uniform vec3 uTailC;
out vec4 o;
void main() {
  vec2 ab = uB - uA;
  float len = max(length(ab), 1.0);
  vec2 dir = ab / len, nrm = vec2(-dir.y, dir.x), c = P() - uA;
  float along = dot(c, dir), across = dot(c, nrm), back = len - along;
  float inside = smoothstep(-1.5, 1.5, along) * smoothstep(-1.5, 1.5, back);
  float lam = uLight * exp(-back / (0.45 * len + 1.0)) * inside;
  float g = 2.4 * uS;
  float I = lam * (0.82 * pix(across, max(0.45, 0.42 * uS)) + 0.18 * exp(-across * across / (2.0 * g * g)) / (2.5066 * g));
  vec2 h = P() - uB;
  float head = uSpark * pix(h.x, 0.6 * uS) * pix(h.y, 0.6 * uS) * 5.0 * uS;
  vec3 tint = mix(uTailC, uTrailC, exp(-back / (0.55 * len)));
  tint = mix(tint, uHeadC, exp(-back / (0.08 * len)));
  vec3 lin = (tint * I + uHeadC * head) * 1.1;
  vec3 col = srgb(tone(lin));
  o = vec4(col, max(col.r, max(col.g, col.b)));
}`;
