import { SEGMENTS } from './path';

export const VERT = `#version 300 es
in vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

export const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;           // the panel, device px
uniform vec2 uOrigin;        // the panel's lower left in the canvas, device px
uniform vec2 uLight;         // the cursor's light, in panel units
uniform float uTime;
uniform int uMode;           // 0 sun metal with flecks, 1 mirror, 2 all three
uniform vec4 uEnds[${SEGMENTS}];
uniform vec4 uShape[${SEGMENTS}];
uniform vec4 uLedge;         // center x, y, half length, half thickness
uniform float uTilt;
uniform vec3 uBg, uEmber, uFlame, uHot, uPale, uCopper, uBronze, uBronzeDeep;
out vec4 frag;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash2(vec2 p){ return vec2(hash(p), hash(p + 17.31)); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){ return noise(p) * 0.55 + noise(p * 2.1 + 3.7) * 0.3 + noise(p * 4.3 + 9.1) * 0.15; }

// Cells: x is how far this point is from its cell's center, y how far inside the cell it is from the nearest seam,
// z the cell's own random number.
vec3 cells(vec2 p, float t){
  vec2 i = floor(p), f = fract(p);
  float d1 = 9.0, d2 = 9.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 g = vec2(float(x), float(y));
    vec2 o = hash2(i + g);
    o = 0.5 + 0.38 * sin(t * 0.7 + 6.283 * o);
    float d = length(g + o - f);
    if (d < d1){ d2 = d1; d1 = d; id = hash(i + g + 3.1); } else if (d < d2) d2 = d;
  }
  return vec3(d1, d2 - d1, id);
}

// The stream's width breathes as it falls, and low down it necks into beads.
float swell(float travel, float y){
  float ph = (travel - uTime) * 9.0;
  float w = 1.0 + 0.045 * sin(ph * 1.7) + 0.03 * sin(ph * 0.63 + 1.3);
  float broken = smoothstep(-0.14, -0.4, y);
  float bead = smoothstep(-0.35, 0.4, sin(ph * 3.1 + 0.7 * sin(ph * 0.53)));
  return w * mix(1.0, bead * 1.18, broken);
}

float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }

// Distance to the stream's surface. travel is how long this metal has been falling, across is -1 to 1 over its width,
// and spread is how much of its light reaches this point from the whole of its length.
float stream(vec2 p, out float travel, out float across, out float radius, out float spread, out float apart){
  float best = 1e9, fall = 1e9, rest = 1e9;
  travel = 0.0; across = 0.0; radius = 0.01; spread = 0.0; apart = 1.0;
  for (int i = 0; i < ${SEGMENTS}; i++){
    vec2 a = uEnds[i].xy, ab = uEnds[i].zw - a;
    float h = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    vec2 c = a + ab * h;
    float tr = mix(uShape[i].z, uShape[i].w, h);
    float r = mix(uShape[i].x, uShape[i].y, h) * swell(tr, c.y);
    float dc = length(p - c);
    float d = dc - r;
    spread += length(ab) * r / (dc * dc + 0.006);
    if (i < 5) fall = min(fall, d); else rest = min(rest, d);
    if (d < best){
      best = d; travel = tr; radius = max(r, 1e-4);
      across = (ab.x * (p.y - a.y) - ab.y * (p.x - a.x)) / length(ab) / radius;
    }
  }
  // Where the fall meets the ledge the two run into each other in a curve, not a corner. apart is 0 right where they meet.
  apart = smoothstep(0.0, 0.035, abs(fall - rest));
  return smin(fall, rest, 0.04);
}

vec2 toLedge(vec2 p){ vec2 q = p - uLedge.xy; float c = cos(-uTilt), s = sin(-uTilt); return vec2(c * q.x - s * q.y, s * q.x + c * q.y); }
float ledge(vec2 p){ vec2 q = abs(toLedge(p)) - (uLedge.zw - 0.006); return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.006; }

float metal(vec2 p, out float travel, out float across, out float radius, out float spread, out float apart){
  return max(stream(p, travel, across, radius, spread, apart), -ledge(p));
}

// Heated metal on the palette, coolest to hottest. Past 1 it only gets brighter.
vec3 heat(float x){
  vec3 c = x < 0.3 ? mix(uEmber, uFlame, x / 0.3) : x < 0.62 ? mix(uFlame, uHot, (x - 0.3) / 0.32) : mix(uHot, uPale, clamp((x - 0.62) / 0.3, 0.0, 1.0));
  return c * (0.35 + 2.4 * x * x);
}

// The dark room a liquid mirror reflects: a tall soft light to the left, a thin strip to the right, a warm floor.
vec3 room(vec3 r){
  vec2 d = r.xy / max(r.z + 0.4, 0.15);
  float soft = smoothstep(-2.1, -1.3, d.x) * (1.0 - smoothstep(-0.36, -0.04, d.x)) * smoothstep(-1.6, -0.5, d.y) * (1.0 - smoothstep(1.2, 2.2, d.y));
  float strip = smoothstep(0.4, 0.5, d.x) * (1.0 - smoothstep(0.82, 0.95, d.x)) * smoothstep(-1.6, -0.6, d.y);
  float floor_ = smoothstep(-0.2, -1.4, d.y);
  return vec3(0.03, 0.024, 0.02) + vec3(1.0, 0.95, 0.88) * soft * 1.9 + vec3(1.0, 0.9, 0.76) * strip * 1.25 + uFlame * floor_ * 0.12;
}

void main(){
  vec2 p = (gl_FragCoord.xy - uOrigin - 0.5 * uRes) / uRes.y;
  float px = 1.0 / uRes.y;
  bool sun = uMode != 1, mirror = uMode != 0;
  float glows = uMode == 0 ? 1.0 : uMode == 1 ? 0.07 : 0.85;

  float travel, across, radius, spread, apart, t2, a2, r2, s2, p2;
  float sd = metal(p, travel, across, radius, spread, apart);
  float out_ = max(sd, 0.0);
  vec3 lit = heat(0.7) * glows;

  // The page: nearly black. The metal's light is tight against it and faint beyond, and is gone before the panel's
  // edge, so the panel never shows as a box.
  vec2 half_ = 0.5 * uRes / uRes.y;
  float edge = min(min(half_.x - abs(p.x), half_.y - abs(p.y)), 1.0);
  float inPanel = smoothstep(0.0, 0.16, edge);
  vec3 col = uBg + (lit * 0.24 * exp(-out_ * 130.0) + uFlame * glows * 0.012 * min(spread, 2.5) * exp(-out_ * 5.0)) * inPanel;
  vec3 L3 = vec3(uLight, 0.22);

  // The ledge: dark bronze. It takes the metal's light on its top and a little down its face, and the cursor's on its edge.
  float sl = ledge(p);
  if (sl < px){
    vec2 q = toLedge(p);
    float top = smoothstep(uLedge.w - 0.007, uLedge.w, q.y);
    float brush = noise(vec2(q.x * 30.0, q.y * 1400.0));
    float face = smoothstep(-uLedge.w, uLedge.w, q.y);
    vec3 base = uBronzeDeep * (0.1 + 0.2 * face) * (0.9 + 0.2 * brush);
    float ts, as, rs, ss, ps;
    float ds = max(stream(p, ts, as, rs, ss, ps), 0.0);
    vec3 body = base + uBronze * lit * (0.55 * exp(-ds * 34.0) + 0.05 * min(ss, 2.5)) * (0.25 + 0.75 * face) * (0.85 + 0.3 * brush);
    body += lit * 0.9 * exp(-ds * 120.0) * top;
    vec3 toL = normalize(L3 - vec3(p, 0.0));
    float nearL = exp(-dot(p - uLight, p - uLight) / 0.04);
    body += uCopper * (0.9 * top + 0.06 * face) * nearL * pow(max(toL.z, 0.0), 2.0);
    body += uBronze * top * 0.22;
    col = mix(col, body, smoothstep(px, -px, sl));
  }

  if (sd < px){
    float e = 1.5 * px;
    vec2 g = vec2(metal(p + vec2(e, 0.0), t2, a2, r2, s2, p2) - sd, metal(p + vec2(0.0, e), t2, a2, r2, s2, p2) - sd);
    g = length(g) > 1e-6 ? normalize(g) : vec2(0.0, 1.0);
    float deep = clamp(-sd / radius, 0.0, 1.0);
    float nz = sqrt(1.0 - (1.0 - deep) * (1.0 - deep));
    vec3 N = normalize(vec3(g * (1.0 - deep), nz + 1e-3));

    // Where on the round body this point is, in coordinates that ride with the metal.
    float th = asin(clamp(across, -1.0, 1.0));
    vec2 ride = vec2((travel - uTime) * 0.55, th * radius);

    // Ripples in the skin, carried with the flow and drawn out along it.
    vec2 rip = vec2(fbm(ride * vec2(16.0, 52.0) + 7.0), fbm(ride * vec2(16.0, 52.0) + 31.0)) - 0.5;
    vec2 wave = vec2(fbm(ride * vec2(5.0, 16.0) + 3.0), fbm(ride * vec2(5.0, 16.0) + 23.0)) - 0.5;
    vec3 Nr = normalize(N + vec3(rip * (mirror ? 0.3 : 0.14) + wave * (mirror ? 0.55 : 0.0), 0.0));

    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 toL = normalize(L3 - vec3(p, nz * radius));
    vec3 H = normalize(toL + V);
    float near = 1.0 / (1.0 + dot(p - uLight, p - uLight) / 0.05);
    vec3 m = vec3(0.0);

    if (sun){
      // The sun's surface, fine: bright cells with darker seams that slowly change, larger patches that are hotter or
      // cooler, and white hot threads drawn out along the flow. Brightest in the middle, orange at the limb.
      vec2 wq = ride * vec2(20.0, 56.0);
      vec2 warp = vec2(fbm(wq + vec2(0.0, uTime * 0.11)), fbm(wq + 19.0 - vec2(0.0, uTime * 0.09))) - 0.5;
      vec3 cell = cells(ride * vec2(58.0, 84.0) + warp * 1.7, uTime);
      float blob = 1.0 - smoothstep(0.04, 0.6, cell.x);
      float lane = smoothstep(0.0, 0.3, cell.y);
      // Where the fall strikes, the metal is churned and at its hottest, with no pattern left in it.
      float gran = mix(1.08, mix(0.5, 1.0, blob) * mix(0.82, 1.0, lane) * (0.92 + 0.16 * cell.z), apart);
      float vn = fbm(ride * vec2(8.0, 66.0) + warp * 0.9 + vec2(0.0, uTime * 0.07));
      float vein = pow(1.0 - abs(vn * 2.0 - 1.0), 7.0);
      float temp = mix(0.32, 0.8, pow(nz, 0.7)) * gran + vein * 0.3 * nz * apart;
      m += heat(temp) * (mirror ? 0.7 : 1.0);

      // Flecks: fine flakes riding in the metal. Each has its own tilt and turns slowly, so each flashes at its own
      // moment, and more of them flash where the cursor's light is.
      for (int k = 0; k < 2; k++){
        float sc = k == 0 ? 1.0 : 1.7;
        vec2 fq = ride * vec2(62.0, 84.0) * sc + float(k) * 13.7;
        vec2 id = floor(fq), f = fract(fq);
        vec2 rnd = hash2(id);
        if (rnd.x > 0.45){
          vec2 at = 0.3 + 0.4 * hash2(id + 5.3);
          float size = mix(0.09, 0.17, hash(id + 9.9));
          float far = length(f - at);
          float turn = uTime * (0.5 + 1.5 * rnd.y) + 6.283 * hash(id + 2.2);
          vec3 tiltN = normalize(Nr + 0.8 * vec3(cos(turn), sin(turn * 1.3), 0.0) * (0.4 + 0.6 * rnd.y));
          float flash = pow(max(dot(tiltN, H), 0.0), 14.0) * (0.5 + 3.0 * near) + pow(max(dot(tiltN, normalize(vec3(-0.35, 0.5, 0.8))), 0.0), 20.0);
          float core = smoothstep(size, size * 0.2, far), bloom = smoothstep(0.42, 0.0, far) * 0.3;
          m += uPale * (core * (0.1 + 7.0 * flash) + bloom * flash * 2.4) * (k == 0 ? 1.0 : 0.6) * (0.3 + 0.7 * nz);
        }
      }
    }

    if (mirror){
      // A liquid mirror in copper: it shows the room, bent by its own ripples, and the cursor's light as a hard glint.
      // No bright rim: a line round the edge is what makes a body read as a drawing.
      vec3 R = reflect(-V, Nr);
      float fres = pow(1.0 - Nr.z, 4.0);
      vec3 F = mix(mix(uCopper, uPale, 0.35), vec3(1.0, 0.95, 0.88), fres * 0.5);
      m += room(R) * F * (sun ? 0.8 : 1.0);
      m += uPale * (pow(max(dot(Nr, H), 0.0), 240.0) * 6.0 + pow(max(dot(Nr, H), 0.0), 30.0) * 0.6) * (0.3 + 1.5 * near);
      if (!sun) m += uFlame * 0.03 * (1.0 - nz);
    } else {
      m += uPale * pow(max(dot(Nr, H), 0.0), 70.0) * (0.25 + 1.0 * near);
    }

    col = mix(col, m, smoothstep(px, -px, sd));
  }

  float mx = max(col.r, max(col.g, col.b));
  if (mx > 1e-5) col *= (1.0 - exp(-mx * 1.15)) / (mx * 0.955);
  frag = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
}`;
