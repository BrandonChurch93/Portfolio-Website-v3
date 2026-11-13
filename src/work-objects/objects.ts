import { clock } from '../world/clock';
import { lamp } from '../lamp/lamp';
import { ROOM, SPEC } from '../metal/shaders';
import { GROUND, MAX_RATIO, program } from '../stream-ideas/gl';

// A derby of designs for the two kinds of thing the stream meets in Work: the turning object beside each side, and
// the rail under the grid. Three of each, in the buttons' metal, lit by the room, the cursor and a stand in stream.
// Each is a height worked out per pixel, so a design is a few lines and all six are lit by the same code.

const VERT = `#version 300 es
in vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uSize;
uniform float uDpr, uStream, uSoft, uBand;
uniform vec4 uTiles[6];
uniform vec3 uLamp, uGround;
uniform vec3 uEmber, uFlame, uHot, uPale, uCopper, uCopperDeep, uBronze;
out vec4 frag;
${ROOM}${SPEC}
const vec3 INK = vec3(0.006, 0.005, 0.004);
float bell(float x){ return exp(-x * x); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float hexd(vec2 p){ p = abs(p); return max(dot(p, vec2(0.866025, 0.5)), p.y); }
float dome(float x){ return sqrt(max(1.0 - x * x, 0.0)); }
float seg(vec2 p, vec2 a, vec2 b, out vec2 near){
  vec2 ab = b - a; float k = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  near = a + ab * k; return length(p - near);
}

// ---- the turning objects, in units of their radius

float knobH(vec2 r){
  float rho = length(r), th = atan(r.y, r.x);
  float h = rho > 0.86 ? 0.14 * dome((rho - 0.86) / 0.14) : 0.14;
  h -= 0.06 * smoothstep(0.71, 0.7, rho) * smoothstep(0.625, 0.635, rho);
  h = mix(h, 0.05 + 0.07 * (rho - 0.37) / 0.265, smoothstep(0.635, 0.6, rho));
  h = mix(h, 0.2 - 1.1 * rho * rho, smoothstep(0.37, 0.33, rho));
  h += 0.006 * sin(th * 44.0) * smoothstep(0.88, 0.93, rho) * smoothstep(1.0, 0.97, rho);
  h -= 0.07 * smoothstep(0.06, 0.04, abs(r.y)) * smoothstep(0.27, 0.24, rho);
  return h + 0.003 * (noise(vec2(rho * 90.0, 3.0)) - 0.5);
}
float wheelHole(vec2 r){
  float a = mod(atan(r.y, r.x) + 0.5236, 1.0472) - 0.5236;
  return length(length(r) * vec2(cos(a), sin(a)) - vec2(0.53, 0.0)) - 0.135;
}
float wheelH(vec2 r){
  float rho = length(r);
  float h = 0.045;
  h = mix(h, 0.05 + 0.15 * dome((rho - 0.88) / 0.12), smoothstep(0.75, 0.77, rho));
  h -= 0.035 * smoothstep(0.035, 0.0, wheelHole(r));
  h = mix(h, 0.145, smoothstep(0.31, 0.26, rho));
  float nut = hexd(r) - 0.14;
  h = mix(h, min(0.23, 0.23 - (nut + 0.025) * 1.6), smoothstep(0.004, -0.004, nut));
  h += 0.035 * dome(rho / 0.055) * step(rho, 0.055);
  return h + 0.003 * (noise(vec2(rho * 90.0, 7.0)) - 0.5) * smoothstep(0.2, 0.3, rho);
}
float facetH(vec2 r){
  float rho = length(r);
  if (rho > 0.8) return 0.03 + 0.11 * dome((rho - 0.9) / 0.1);
  float h = 0.34;
  for (int k = 0; k < 8; k++){
    float a = float(k) * 0.785398;
    h = min(h, 0.34 - 0.62 * (dot(r, vec2(cos(a + 0.392699), sin(a + 0.392699))) - 0.27));
    h = min(h, 0.25 - 1.0 * (dot(r, vec2(cos(a), sin(a))) - 0.5));
  }
  return max(h, 0.02);
}
float postH(int id, vec2 r){ return id == 0 ? knobH(r) : id == 1 ? wheelH(r) : facetH(r); }

// ---- the rails, in units of half the bar's thickness: a along, c up across

const float PITCH = 6.0, DEEP = 5.2;
float lattice(vec2 q, float len){
  float a = mod(q.x, PITCH);
  vec2 near;
  float d = min(seg(vec2(a, q.y), vec2(0.0, -DEEP), vec2(PITCH * 0.5, 0.0), near), seg(vec2(a, q.y), vec2(PITCH * 0.5, 0.0), vec2(PITCH, -DEEP), near));
  return max(d - 0.36, max(-q.x, q.x - len));
}
float trussSdf(vec2 q, float len){
  float x = q.x - clamp(q.x, 0.0, len);
  float top = length(vec2(x, q.y)) - 1.0, foot = length(vec2(x, q.y + DEEP)) - 0.7;
  return min(min(top, foot), lattice(q, len));
}
float slotAt(vec2 q, float len){
  float a = mod(q.x - 1.2, 7.0) - 3.5;
  float d = length(vec2(max(abs(a) - 2.3, 0.0), q.y + 0.35)) - 0.62;
  return max(d, max(2.0 - q.x, q.x - (len - 2.0)));
}
float railH(int id, vec2 q, float len){
  float a = q.x, c = q.y;
  if (id == 0){
    float h = 0.12;
    if (c > 0.2) h = 0.12 + 0.4 * dome((c - 0.6) / 0.4);
    if (c < -0.56) h = 0.12 + 0.22 * dome((c + 0.78) / 0.22);
    h -= 0.05 * smoothstep(0.09, 0.05, abs(c + 0.2));
    h += 0.01 * (noise(vec2(a * 0.35, c * 16.0)) - 0.5) * step(-0.56, c) * step(c, 0.2);
    for (int k = 0; k < 2; k++){
      vec2 s = vec2(a - (k == 0 ? 0.0 : len), c + 0.8);
      float rho = length(s) / 1.8;
      if (rho < 1.0){
        float hs = rho > 0.8 ? 0.3 * dome((rho - 0.8) / 0.2) : 0.3;
        hs -= 0.07 * smoothstep(0.62, 0.6, rho) * smoothstep(0.5, 0.52, rho);
        hs = mix(hs, 0.46 - 0.5 * rho * rho, smoothstep(0.5, 0.46, rho));
        hs -= 0.12 * smoothstep(0.1, 0.07, abs(s.y) / 1.8) * smoothstep(0.42, 0.38, rho);
        h = max(h, hs + 0.2);
      }
    }
    return h;
  }
  if (id == 1){
    float h = 0.0;
    float x = a - clamp(a, 0.0, len);
    h = max(h, 0.5 * dome(length(vec2(x, c))) + 0.1);
    h = max(h, (0.36 * dome(length(vec2(x, c + DEEP)) / 0.7) + 0.08) * step(length(vec2(x, c + DEEP)), 0.7));
    float lat = lattice(q, len);
    if (lat < 0.0) h = max(h, 0.2 + 0.1 * dome(1.0 + lat / 0.36));
    float m = mod(a, PITCH);
    float top = length(vec2(m - PITCH * 0.5, c)), foot = length(vec2(min(m, PITCH - m), c + DEEP));
    if (a > 0.5 && a < len - 0.5){
      if (top < 0.5) h = max(h, 0.62 + 0.26 * dome(top / 0.5));
      if (foot < 0.42) h = max(h, 0.46 + 0.22 * dome(foot / 0.42));
    }
    return h;
  }
  float h = 0.14;
  if (c > 0.95) h = 0.14 + 0.34 * dome((c - 1.3) / 0.33);
  h -= 0.12 * smoothstep(-1.35, -1.6, c);
  h -= 0.09 * smoothstep(0.16, 0.0, slotAt(q, len));
  for (int k = 0; k < 2; k++){
    vec2 s = vec2(a - (k == 0 ? 0.6 : len - 0.6), c + 0.35);
    float d = hexd(s) - 0.62;
    if (d < 0.0) h = max(h, min(0.5, 0.5 - (d + 0.1) * 1.4));
  }
  return h;
}
float railSdf(int id, vec2 q, float len){
  float x = q.x - clamp(q.x, 0.0, len);
  if (id == 0) return min(length(vec2(x, q.y)) - 1.0, min(length(vec2(q.x, q.y + 0.8)), length(vec2(q.x - len, q.y + 0.8))) - 1.8);
  if (id == 1) return trussSdf(q, len);
  return max(length(vec2(x, max(abs(q.y) - 1.2, 0.0))) - 0.4 - step(0.0, 0.0), -slotAt(q, len) - 0.0);
}

// ---- the buttons' metal, as the posts and the rail on the Work page are lit

vec3 shade(vec2 p, vec3 N, vec3 T, vec3 F0, float rough, float aniso, vec3 Ls, float lit){
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 n = vec3(N.x, -N.y, N.z), t0 = vec3(T.x, -T.y, T.z), t = normalize(t0 - n * dot(t0, n)), b = cross(n, t);
  vec3 col = (studio(reflect(-V, n), rough) * 0.75 + vec3(0.16, 0.14, 0.12) * 0.3) * F0;
  vec3 Lv = vec3(uLamp.xy - p, uLamp.z);
  float away = length(Lv.xy);
  float lampI = 2.6 / (1.0 + (away / 230.0) * (away / 230.0)) + 0.45 / (1.0 + (away / 900.0) * (away / 900.0));
  vec3 Ll = normalize(vec3(Lv.x, -Lv.y, Lv.z));
  col += (spec(n, V, Ll, t, b, rough, aniso, F0) + spec(n, V, Ll, t, b, min(1.0, rough * 1.8 + 0.1), aniso * 0.5, F0) * 0.2) * lampI * 0.6 * vec3(1.0, 0.94, 0.86);
  vec3 ls = normalize(vec3(Ls.x, -Ls.y, Ls.z));
  vec3 warm = mix(uFlame, uHot, 0.5);
  float toward = max(dot(n, ls), 0.0);
  col += spec(n, V, ls, t, b, rough, aniso, F0) * min(lit, 4.0) * 0.26 * warm;
  col += spec(n, V, ls, t, b, min(1.0, rough * 2.2 + 0.2), aniso * 0.4, F0) * min(lit, 4.0) * 0.2 * warm;
  col += F0 * warm * min(lit, 3.5) * (0.035 + 0.3 * toward * toward);
  float mx = max(col.r, max(col.g, col.b));
  if (mx > 1e-5) col *= (1.0 - exp(-mx * 1.15)) / (mx * 0.955);
  return mix(col, uPale, clamp((mx - 2.2) * 0.3, 0.0, 0.8));
}
vec3 heat(float x){
  vec3 c = mix(uEmber, uFlame, smoothstep(0.0, 0.35, x));
  c = mix(c, uHot, smoothstep(0.3, 0.7, x));
  c = mix(c, uPale, smoothstep(0.65, 1.0, x));
  return pow(c * min(1.0, x / 0.22), vec3(1.0 / 2.2));
}
float glowOf(float d, float w){ return bell(d / w) + 0.3 / (1.0 + (d / (w * 3.0)) * (d / (w * 3.0))) * bell(d / (w * 12.0)); }

void main(){
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  int id = -1; vec4 t = vec4(0.0);
  for (int i = 0; i < 6; i++){
    vec4 q = uTiles[i];
    if (p.x >= q.x && p.y >= q.y && p.x < q.x + q.z && p.y < q.y + q.w){ id = i; t = q; }
  }
  vec3 col = uGround;
  if (id < 0){ frag = vec4(col, 1.0); return; }
  vec2 edge = min(p - t.xy, t.xy + t.zw - p);
  float inside = smoothstep(0.0, 4.0, min(edge.x, edge.y));
  float fade = smoothstep(0.0, min(t.z, t.w) * 0.34, min(edge.x, edge.y));
  float glow = 0.0, cov = 0.0, ink = 0.0, lit = 0.0, rough = 0.25, aniso = 0.7, emit = 0.0;
  vec3 N = vec3(0.0, 0.0, 1.0), T = vec3(1.0, 0.0, 0.0), F0 = uCopper, Ls = vec3(0.0, 0.0, 1.0);

  if (id < 3){
    float R = min(t.z, t.w) * 0.3;
    vec2 c = t.xy + vec2(t.z * 0.42, t.w * 0.5);
    vec2 A = c + vec2(R * 1.9, -t.w * 0.62), B = c + vec2(R * 1.075, -R * 0.06), C = c + vec2(R * 2.5, t.w * 0.62);
    vec2 n1, n2;
    float d1 = seg(p, A, B, n1), d2 = seg(p, B, C, n2), d = min(d1, d2);
    vec2 near = d1 < d2 ? n1 : n2;
    glow = (glowOf(d, R * 0.045) + 0.8 * bell(length(p - B) / (R * 0.12))) * uStream;
    vec2 r = (p - c) / R;
    float rho = length(r);
    float sd = (rho - 1.0) * R;
    if (id == 1) sd = max(sd, -wheelHole(r) * R);
    cov = clamp(0.5 - sd * uDpr, 0.0, 1.0);
    if (cov > 0.0){
      float e = 0.8 / (R * uDpr);
      vec2 g = vec2(postH(id, r + vec2(e, 0.0)) - postH(id, r - vec2(e, 0.0)), postH(id, r + vec2(0.0, e)) - postH(id, r - vec2(0.0, e))) / (2.0 * e);
      N = normalize(vec3(-g, 1.0));
      vec2 et = vec2(-r.y, r.x) / max(rho, 1e-4);
      T = vec3(et, 0.0);
      float cloud = noise(r * 9.0 + float(id) * 31.0);
      float wear = 0.0, grime = 0.0;
      if (id == 0){
        wear = clamp(bell((rho - 0.865) / 0.022) + 0.8 * bell((rho - 0.345) / 0.024) + 0.5 * bell((rho - 0.72) / 0.012), 0.0, 1.0);
        float dish = smoothstep(0.37, 0.41, rho) * (1.0 - smoothstep(0.59, 0.635, rho)), boss = 1.0 - smoothstep(0.33, 0.37, rho);
        grime = clamp(dish * (0.3 + 0.5 * smoothstep(0.44, 0.62, rho)) + smoothstep(0.92, 1.0, rho) * 0.8 + 0.3 * cloud * (1.0 - boss), 0.0, 1.0);
        rough = clamp(0.22 + 0.2 * grime - 0.1 * wear + 0.08 * dish - 0.07 * boss, 0.08, 0.9);
        aniso = 0.75;
        ink = max(smoothstep(0.635, 0.645, rho) * smoothstep(0.7, 0.69, rho), smoothstep(0.05, 0.04, abs(r.y)) * smoothstep(0.25, 0.24, rho));
        F0 = mix(uCopperDeep, uCopper, 0.45 + 0.5 * wear) * (1.0 - grime * 0.45);
      } else if (id == 1){
        float tire = smoothstep(0.75, 0.78, rho), hub = smoothstep(0.31, 0.27, rho);
        wear = clamp(bell((rho - 0.88) / 0.05) + hub * 0.7, 0.0, 1.0);
        grime = clamp((1.0 - tire) * (1.0 - hub) * (0.45 + 0.35 * cloud) + smoothstep(0.94, 1.0, rho) * 0.7 + bell((rho - 0.77) / 0.02) * 0.6, 0.0, 1.0);
        rough = clamp(0.2 + 0.25 * grime - 0.1 * wear, 0.08, 0.9);
        aniso = 0.7;
        F0 = mix(mix(uCopperDeep, uCopper, 0.45 + 0.5 * wear), uBronze * 0.7, (1.0 - tire) * (1.0 - hub) * 0.75) * (1.0 - grime * 0.4);
        ink = smoothstep(0.012, 0.0, abs(hexd(r) - 0.145)) * 0.7;
      } else {
        float bezel = smoothstep(0.79, 0.81, rho);
        wear = bezel * bell((rho - 0.9) / 0.05);
        grime = bezel * smoothstep(0.94, 1.0, rho) * 0.8;
        rough = mix(0.085, 0.3, bezel);
        aniso = mix(0.0, 0.7, bezel);
        F0 = mix(uCopper * 1.05, mix(uCopperDeep, uCopper, 0.4 + 0.5 * wear) * (1.0 - grime * 0.45), bezel);
        ink = bell((rho - 0.8) / 0.012) * 0.9;
      }
      Ls = vec3(near - p, R * 0.22);
      lit = uStream * 2.2 / (1.0 + pow(length(near - p) / (R * 0.8), 2.0));
    }
  } else {
    int k = id - 3;
    float W = t.w * (k == 0 ? 0.052 : k == 1 ? 0.04 : 0.056);
    vec2 A = t.xy + vec2(t.z * 0.1, t.w * (k == 1 ? 0.26 : 0.36)), B = A + vec2(t.z * 0.8, t.z * 0.8 * 0.085);
    float L = length(B - A) / W;
    vec2 ev = (B - A) / (L * W), nv = vec2(ev.y, -ev.x);
    vec2 q = vec2(dot(p - A, ev), dot(p - A, nv)) / W;
    float len = k == 1 ? floor(L / PITCH) * PITCH : L;
    float lift = k == 2 ? -0.35 : 1.55;
    vec2 near = A + ev * clamp(q.x, 0.0, len) * W + nv * lift * W;
    float d = length(p - near);
    if (k == 2){
      float s = slotAt(q, len);
      emit = smoothstep(0.05, -0.2, s) * uStream;
      glow = 0.2 * bell((q.y - 1.9) / 1.2) * smoothstep(-1.0, 2.0, q.x) * smoothstep(len + 1.0, len - 2.0, q.x) * uStream;
    } else glow = glowOf(d, W * 0.42) * uStream * smoothstep(-1.0, 2.0, q.x) * smoothstep(len + 1.0, len - 2.0, q.x);
    float sd = railSdf(k, q, len) * W;
    if (k == 2) sd = (length(vec2(q.x - clamp(q.x, 0.0, len), max(abs(q.y) - 1.2, 0.0))) - 0.4) * W;
    cov = clamp(0.5 - sd * uDpr, 0.0, 1.0);
    if (cov > 0.0){
      float e = 0.8 / (W * uDpr);
      vec2 gq = vec2(railH(k, q + vec2(e, 0.0), len) - railH(k, q - vec2(e, 0.0), len), railH(k, q + vec2(0.0, e), len) - railH(k, q - vec2(0.0, e), len)) / (2.0 * e);
      vec2 g = ev * gq.x + nv * gq.y;
      N = normalize(vec3(-g, 1.0));
      T = vec3(ev, 0.0);
      float h = railH(k, q, len);
      float streak = noise(vec2(q.x * 0.12, float(k) * 9.0));
      float wear = 0.0, grime = 0.0;
      if (k == 0){
        float top = smoothstep(0.16, 0.24, q.y), foot = 1.0 - smoothstep(-0.6, -0.52, q.y), web = (1.0 - top) * (1.0 - foot);
        float stud = step(min(length(vec2(q.x, q.y + 0.8)), length(vec2(q.x - len, q.y + 0.8))), 1.8);
        wear = clamp(top * (0.55 + 0.45 * smoothstep(0.5, 1.0, q.y)) + 0.5 * foot + stud * 0.5, 0.0, 1.0);
        grime = clamp(web * (0.55 + 0.4 * streak) + 0.9 * bell((q.y - 0.14) / 0.09) + 0.7 * bell((q.y + 0.5) / 0.08), 0.0, 1.0) * (1.0 - stud * 0.7);
        ink = smoothstep(0.06, 0.04, abs(q.y + 0.2)) * web * (1.0 - stud);
        vec2 s0 = vec2(q.x, q.y + 0.8), s1 = vec2(q.x - len, q.y + 0.8);
        vec2 s = length(s0) < length(s1) ? s0 : s1;
        float rs = length(s) / 1.8;
        ink = max(ink, stud * max(smoothstep(0.52, 0.53, rs) * smoothstep(0.6, 0.59, rs), smoothstep(0.085, 0.07, abs(s.y) / 1.8) * smoothstep(0.4, 0.38, rs)));
        if (stud > 0.5) T = vec3(vec2(-s.y, s.x) / max(length(s), 1e-4), 0.0);
      } else if (k == 1){
        wear = clamp(smoothstep(0.3, 0.6, h) * 0.9, 0.0, 1.0);
        grime = clamp((1.0 - smoothstep(0.1, 0.3, h)) * 0.8 + 0.3 * streak, 0.0, 1.0);
        if (lattice(q, len) < 0.0 && h < 0.35) F0 = uBronze * 0.8;
      } else {
        wear = clamp(smoothstep(0.95, 1.3, q.y) + smoothstep(0.3, 0.5, h) * 0.8, 0.0, 1.0);
        grime = clamp(0.35 + 0.4 * streak - wear, 0.0, 1.0);
        ink = smoothstep(0.02, -0.12, slotAt(q, len));
      }
      vec3 base = mix(uCopperDeep, uCopper, 0.4 + 0.55 * wear) * (1.0 - grime * 0.45);
      F0 = (k == 1 && lattice(q, len) < 0.0 && h < 0.35) ? mix(uBronze * 0.75, base, 0.3) : base;
      rough = clamp(0.27 + 0.2 * grime - 0.16 * wear, 0.08, 0.9);
      aniso = 0.8;
      Ls = vec3(near - p, W * 0.7);
      lit = uStream * (k == 2 ? 0.9 * bell(slotAt(q, len) / 1.1) : 2.2 / (1.0 + pow(d / (W * 3.0), 2.0)));
      if (k == 2) Ls = vec3(0.0, 0.0, 1.0);
    }
  }

  vec3 back = 1.0 - (1.0 - col) * (1.0 - heat(min(glow * fade, 1.0)));
  vec3 metal = pow(max(shade(p, N, T, F0, rough, aniso, Ls, lit), 0.0), vec3(1.0 / 2.2));
  metal = mix(metal, INK + metal * 0.05, clamp(ink, 0.0, 1.0) * 0.95);
  metal = 1.0 - (1.0 - metal) * (1.0 - heat(min(emit, 1.0) * 0.9));
  frag = vec4(mix(back, min(metal, vec3(1.0)), cov * inside), 1.0);
}`;

export interface Objects {
  stream(on: boolean): void;
  dispose(): void;
}

export function mountObjects(canvas: HTMLCanvasElement, tiles: HTMLElement[]): Objects {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) return { stream() {}, dispose() {} };
  const { p, u } = program(gl, VERT, FRAG);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.uniform3fv(u('uGround'), GROUND);
  gl.uniform1f(u('uSoft'), 0);
  gl.uniform1f(u('uBand'), 1);
  lamp.bind();
  let want = 1, shown = 1;
  const rects = new Float32Array(24);
  const off = clock.onFrame((_, dt) => {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(MAX_RATIO, devicePixelRatio || 1);
    const w = Math.round(box.width * dpr), h = Math.round(box.height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    tiles.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      rects.set([r.left - box.left, r.top - box.top, r.width, r.height], i * 4);
    });
    shown = dt <= 0 ? want : shown + (want - shown) * Math.min(1, dt * 5);
    const l = lamp.get();
    gl.viewport(0, 0, w, h);
    gl.useProgram(p);
    gl.uniform2f(u('uSize'), box.width, box.height);
    gl.uniform1f(u('uDpr'), dpr);
    gl.uniform1f(u('uStream'), shown);
    gl.uniform4fv(u('uTiles'), rects);
    gl.uniform3f(u('uLamp'), l.px - box.left, l.py - box.top, 90);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
  return {
    stream(on) { want = on ? 1 : 0; },
    dispose() { off(); gl.deleteProgram(p); gl.deleteBuffer(quad); },
  };
}
