import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin } from '../../../../world/surface';
import { KNOT, PATHS, UNBALANCE, funnels, strands } from './knot';

// Everything of the core that is light alone, in one program and one draw: the loops of the stream's ribbon, the
// strands that gather into the source, the kernel, the light it spills into the hollow, the arcs and the sparks.
// Each is a strip whose shape is worked out from the clock in the vertex shader, and each is light added to what is
// behind it, given its color by the stream's own ramp: nothing, ember, flame, hot, pale, never white.

// How many pieces each loop, each gathering strand and each arc is drawn in.
const STEPS = { loop: 150, funnel: 180, arc: 18 };
const KIND = { loop: 0, funnel: 1, sheet: 2, arc: 3, spark: 4, mote: 5 };

const VERT = /* glsl */ `
attribute float aIdx;
varying vec4 vA;   // across, along, the length a loop wraps at (0 for none), kind
varying vec4 vB;   // half the width of the ribbon, how bright, its own number, how fast light runs along it
varying float vSoft;
varying float vSq;   // how far a ribbon is squeezed here: its across is divided by it in the fragment, since a strip of
                     // uneven quads read straight across each triangle showed its diagonals as teeth
${PATHS}
float ease(float x){ return x * x * (3.0 - 2.0 * x); }
vec3 arcPt(vec3 A, vec3 B, float key, float j){
  vec3 d = B - A, k = normalize(d + vec3(1e-4));
  vec3 p = normalize(cross(k, abs(k.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0))), q = cross(k, p);
  float u = j / ${STEPS.arc}.0, env = sin(3.14159 * u);
  // It wanders at two scales, a long sway and a fine jitter. Each point thrown on its own, it was a sawtooth comb.
  vec2 sway = vec2(sin(j * 0.7 + h1(key + 0.3) * 6.28), sin(j * 0.55 + h1(key + 0.7) * 6.28));
  vec2 jit = vec2(h1(key + j * 1.37) - 0.5, h1(key + j * 2.91 + 4.0) - 0.5);
  vec2 jag = (sway * 0.16 + jit * 0.09) * length(d) * env;
  return mix(A, B, u) + p * jag.x + q * jag.y;
}
vec3 sparkAt(vec3 o, vec3 v, float a){ return o + v * a + vec3(0.0, -130.0, 0.0) * a * a; }
void main(){
  float u = position.x, side = position.y, kind = position.z, fi = aIdx;
  int i = int(aIdx + 0.5);
  float t = uT;
  vec3 P = vec3(0.0), T = vec3(0.0, 1.0, 0.0), A = vec3(0.0);
  float hw = 0.0, level = 0.0, along = 0.0, wrap = 0.0, wide = 0.0, seed = h1(fi + 0.5), flow = 1.0;
  bool sheet = false;
  if (kind < 0.5) {
    float th = u * 6.28318, R = uS0[i].x;
    P = strandAt(i, th, t);
    vec3 Pp = strandAt(i, th + 0.03, t), Pm = strandAt(i, th - 0.03, t);
    T = Pp - Pm; A = Pp + Pm - 2.0 * P;
    wide = uS1[i].w; hw = wide + 6.0; wrap = 6.28318 * R; along = th * R;
    seed = uS3[i].y; flow = uS3[i].x;
    // Each loop shows as runs of light that come and go along it, so the knot is never a set of rings.
    float k = 1.0 + floor(seed * 3.0);
    level = uS3[i].z * (0.03 + 0.97 * smoothstep(-0.1, 0.85, sin(k * th + seed * 6.28 - t * 0.9 * flow)));
  } else if (kind < 1.5) {
    P = funnelAt(i, u, t);
    vec3 Pp = funnelAt(i, min(u + 0.006, 1.0), t), Pm = funnelAt(i, max(u - 0.006, 0.0), t);
    T = Pp - Pm; A = Pp + Pm - 2.0 * P;
    float k = u / NECK;
    wide = uF1[i].y * mix(1.0, 0.6, smoothstep(0.6, 1.0, k));
    hw = wide + 20.0; along = u * 1100.0; seed = uF1[i].z; flow = 1.4;
    // It comes out of the knot from nothing, burns hotter as it gathers, and under the source its light is handed to
    // the page's stream.
    level = uF1[i].w * smoothstep(0.0, 0.05, u) * (u > NECK ? 1.0 - (u - NECK) / (1.0 - NECK) : 1.0);
    // A body of light that falls off from its heart: thick and bright close to the kernel, fine and dim out at the
    // knot's edge, and burning again as it gathers to the source.
    float out1 = smoothstep(0.12, 0.95, length(P) / REACH), gather = smoothstep(0.62, 0.95, k);
    level *= mix(mix(1.7, 0.5, out1), 1.3, gather);
    wide *= mix(mix(1.45, 0.5, out1), 0.75, gather);
    hw = wide + 20.0;
  } else if (kind < 2.5) {
    sheet = true;
    hw = ${KNOT.kernel.half.toFixed(1)};
    level = ${KNOT.kernel.level.toFixed(2)};
  } else if (kind < 3.5) {
    // An arc leaps from a point on one loop to the nearest of a few points on others, flashes and is gone. Every
    // other arc is a fork of the one before it, leaving it part way along.
    float fork = mod(fi, 2.0), base = fi - fork;
    float rate = 0.55 + 0.8 * h1(base * 3.1 + 0.2), c = t * rate + h1(base * 5.7);
    float slot = floor(c), age = fract(c) / rate, key = base * 31.7 + slot * 7.13;
    int ia = int(h1(key) * float(STRANDS));
    vec3 A = strandAt(ia, h1(key + 1.0) * 6.28318, t), B = A;
    float best = 1e9;
    for (int n = 0; n < 4; n++) {
      int ib = int(mod(float(ia) + 1.0 + floor(h1(key + 2.0 + float(n)) * float(STRANDS - 1)), float(STRANDS)));
      vec3 q = strandAt(ib, h1(key + 5.0 + float(n)) * 6.28318, t);
      float d = distance(A, q);
      if (d > 14.0 && d < best) { best = d; B = q; }
    }
    if (fork > 0.5) {
      vec3 from = arcPt(A, B, key, floor(${STEPS.arc}.0 * (0.3 + 0.3 * h1(key + 11.0))));
      vec3 way = normalize(B - A + (vec3(h1(key + 12.0), h1(key + 13.0), h1(key + 14.0)) - 0.5) * best * 1.6);
      A = from; B = from + way * best * (0.3 + 0.25 * h1(key + 15.0));
      key += 57.0;
    }
    float j = floor(u * ${STEPS.arc}.0 + 0.5);
    P = arcPt(A, B, key, j);
    T = arcPt(A, B, key, min(j + 1.0, ${STEPS.arc}.0)) - arcPt(A, B, key, max(j - 1.0, 0.0));
    float flick = 0.55 + 0.45 * step(0.35, h1(floor(t * 36.0) + base * 9.1));
    level = step(h1(key - fork * 57.0 + 9.0), 0.75) * step(best, 95.0) * 3.2 * exp(-age * 14.0) * flick * (1.0 - 0.35 * fork) * (1.0 - 0.6 * fork * u);
    hw = 2.6; wide = 0.0;
  } else if (kind > 4.5) {
    // A mote: fine stuff drifting in the knot's light, catching it near the kernel.
    float r = 34.0 + 140.0 * pow(h1(fi * 1.7), 0.8), a = h1(fi * 2.9) * 6.28318 + t * (0.05 + 0.12 * h1(fi * 4.3)) * (40.0 / r);
    float y = (h1(fi * 6.1) - 0.5) * 2.0;
    vec3 o = shape(vec3(r * sqrt(1.0 - y * y) * cos(a), r * y, r * sqrt(1.0 - y * y) * sin(a)));
    P = o; T = vec3(-sin(a), 0.0, cos(a));
    level = 0.55 / (1.0 + pow(r / 60.0, 2.0)) * (0.5 + 0.5 * sin(t * (1.5 + 2.0 * h1(fi * 8.3)) + fi));
    P += T * (u - 0.5) * 1.2;
    hw = 1.4; wide = 0.0;
  } else {
    // A spark is thrown off a loop and falls away, cooling from hot through flame to ember.
    float rate = 1.0 / (0.5 + 0.7 * h1(fi * 2.3 + 0.7)), c = t * rate + h1(fi * 4.1);
    float slot = floor(c), age = fract(c) / rate, key = fi * 17.3 + slot * 3.71;
    float life = 0.3 + 0.28 * h1(key + 3.0);
    int ia = int(h1(key) * float(STRANDS));
    vec3 o = strandAt(ia, h1(key + 1.0) * 6.28318, t - age);
    vec3 dir = normalize(o + (vec3(h1(key + 4.0), h1(key + 5.0), h1(key + 6.0)) - 0.5) * 90.0 + vec3(1e-3));
    vec3 v = dir * (90.0 + 150.0 * h1(key + 7.0)) + vec3(0.0, 30.0, 0.0);
    vec3 head = sparkAt(o, v, age), tail = sparkAt(o, v, max(age - 0.03, 0.0));
    P = mix(tail, head, u);
    T = head - tail;
    float k = clamp(age / life, 0.0, 1.0);
    level = step(h1(key + 8.0), 0.75) * step(age, life) * 1.7 * pow(1.0 - k, 1.4) * (1.0 - smoothstep(170.0, 215.0, length(head)));
    hw = 2.4;
  }
  vec4 mv = modelViewMatrix * vec4(P, 1.0);
  float unit = length(modelViewMatrix[0].xyz);
  // A strand on the far side of the knot is dimmer and softer than one on the near side, and the kernel, too bright
  // to see past, hides what passes behind it.
  vec3 centre = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz, look = normalize(centre);
  vec3 rel = (mv.xyz - centre) / unit;
  float depth = clamp(-dot(rel, look) / REACH, -1.0, 1.0), front = 0.5 + 0.5 * depth;
  if (!sheet) {
    float flat2 = length(rel - look * dot(rel, look));
    float behind = smoothstep(0.0, -12.0, -dot(rel, look) ) * (1.0 - smoothstep(${(KNOT.kernel.r * 1.2).toFixed(1)}, ${(KNOT.kernel.r * 3.2).toFixed(1)}, flat2));
    level *= mix(0.2, 1.0, smoothstep(-0.9, 0.15, depth)) * (1.0 - 0.9 * behind);
    wide *= mix(1.5, 1.0, smoothstep(-0.9, 0.15, depth)); hw = wide + (kind > 0.5 ? 20.0 : 6.0);
  }
  vSoft = mix(1.7, 1.0, smoothstep(-0.9, 0.15, depth));
  vec3 off;
  float sq = 1.0;
  if (sheet) off = vec3((u * 2.0 - 1.0) * hw, side * hw, 0.0) * unit;
  else {
    // Where a strand runs straight at the eye its side has no one direction, and turned every way it fanned into a
    // star: there the ribbon narrows to its heart.
    vec3 tv = mat3(modelViewMatrix) * T;
    vec3 across = cross(tv, mv.xyz);
    float l = length(across), edgeOn = l / max(length(tv) * length(mv.xyz), 1e-9);
    // And no wider than the bend it is on is seen to be tight, or its inner side folds over itself into a comb.
    vec3 lk = normalize(mv.xyz), d2 = tv - lk * dot(tv, lk), a3 = mat3(modelViewMatrix) * A, a2 = a3 - lk * dot(a3, lk);
    float bend = 4.0 * length(cross(d2, a2)) / max(pow(length(d2), 3.0), 1e-12);
    float room = 0.8 / max(bend, 1e-6) / unit;
    sq = l > 1e-9 ? min(hw, room) / hw * smoothstep(0.12, 0.55, edgeOn) : 0.0;
    off = l > 1e-9 ? across / l * side * hw * sq * unit : vec3(0.0);
  }
  if (level <= 0.0) { off = vec3(0.0); sq = 0.0; }
  vA = vec4(sheet ? (u * 2.0 - 1.0) * hw : side * hw * sq, sheet ? side * hw : along, wrap, kind);
  vB = vec4(wide, level * uCore, seed, flow);
  vSq = sheet ? 1.0 : sq;
  gl_Position = projectionMatrix * vec4(mv.xyz + off, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform float uT;
varying vec4 vA;
varying vec4 vB;
varying float vSoft;
varying float vSq;
const vec3 EMBER = ${lin(hex('ember'))};
const vec3 FLAME = ${lin(hex('flame'))};
const vec3 HOT = ${lin(hex('hot'))};
const vec3 PALE = ${lin(hex('pale'))};
float h1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
${UNBALANCE}// The stream's own ramp, from an amount of light to its color.
vec3 ramp(float a){
  vec3 c = EMBER * clamp(a / 0.11, 0.0, 1.0);
  c = mix(c, FLAME, smoothstep(0.07, 0.42, a));
  c = mix(c, HOT, smoothstep(0.34, 0.85, a));
  c = mix(c, PALE, smoothstep(0.7, 1.6, a));
  return c;
}
// A wave along a loop must come round to itself, so its length is the nearest that fits the loop a whole number of
// times.
float per(float s, float L, float C){ return C > 0.0 ? s / (C / max(1.0, floor(C / L + 0.5))) : s / L; }
// The stream's ribbon (coreFrag in src/stream/shaders.ts): a band of fine fibres side by side that turns as it runs,
// wide and soft seen flat, gathered into one fierce line seen on edge.
float ribbon(float x, float s, float C, float wide, float seed, float flow, float level){
  float t = uT;
  float twist = per(s, 58.0, C) - t * 0.36 + 1.3 * sin(per(s, 143.0, C) - t * 0.12) + seed * 6.283;
  float face = cos(twist), depth = sin(twist);
  float span = wide * abs(face) + 0.6;
  float sum = 0.05 * smoothstep(span + 2.6, span * 0.55, abs(x)) * (0.35 + 0.65 * abs(face));
  for (int j = 0; j < 5; j++){
    float f = float(j) + seed * 37.0, a = h1(f + 1.0), b = h1(f + 7.3), c = h1(f + 13.9);
    float u0 = (float(j) + 0.5) / 5.0 * 2.0 - 1.0 + (a - 0.5) * 0.5;
    float u = sign(u0) * pow(abs(u0), 1.7);
    float off = u * wide * face + 1.2 * sin(per(s, mix(17.0, 31.0, b), C) + c * 6.283 - t * 0.4);
    float dz = u * depth;
    float w = mix(0.55, 1.1, c * c) * (1.2 - 0.35 * dz) * vSoft;
    float life = 0.12 + 0.88 * smoothstep(-0.4, 0.6, sin(per(s, mix(50.0, 150.0, a), C) + f * 2.4 - t * 0.3));
    float fibre = mix(0.24, 1.0, b * b) * life * (0.6 + 0.4 * dz);
    float d = (x - off) / w;
    sum += fibre * exp(-d * d);
  }
  sum *= level;
  // The heart burns near pale wherever the strand is lit at all, as the stream's does, and a soft light hangs round
  // the whole band.
  float gather = 1.0 - abs(face);
  float q = x / (mix(0.8, 1.4, gather) * vSoft);
  sum += mix(2.0, 3.4, gather * gather) * sqrt(level) * smoothstep(0.02, 0.4, level) / pow(1.0 + q * q, 1.6);
  // The stream's glow round its line, which on the page is its light blurred.
  float soft = wide * 0.45 + 8.0;
  sum += 0.1 * level * exp(-x * x / (soft * soft)) * (wide > 8.0 ? 1.0 : 0.3);
  // Light runs along it in pulses, from the kernel toward the source.
  float pulse = pow(0.5 + 0.5 * sin(per(s, 190.0, C) - t * 4.2 * flow), 6.0);
  float run = (0.62 + 0.38 * sin(per(s, 83.0, C) - t * 2.1 * flow) * sin(per(s, 211.0, C) - t * 0.9 * flow + 0.8)) * (0.6 + 1.6 * pulse);
  return sum * run;
}
void main(){
  float kind = vA.w, a = 0.0;
  if (kind < 1.5) a = ribbon(vA.x / max(vSq, 1e-3), vA.y, vA.z, vB.x, vB.z, vB.w, vB.y);
  else if (kind < 2.5) {
    // The kernel: fierce in its middle and falling away through hot and flame to ember, gone well inside its sheet.
    float r = length(vA.xy), q = r / ${KNOT.kernel.r.toFixed(2)};
    a = vB.y / pow(1.0 + q * q, 1.5) * (1.0 - smoothstep(${(KNOT.kernel.half * 0.45).toFixed(1)}, ${(KNOT.kernel.half * 0.98).toFixed(1)}, r));
  } else {
    float x = vA.x;
    a = vB.y * (exp(-x * x / 0.45) + 0.18 * exp(-x * x / 4.0));
  }
  vec3 col = unbalance(ramp(a) * (1.0 + 0.5 * max(a - 1.6, 0.0)));
  gl_FragColor = vec4(col, min(1.0, max(col.r, max(col.g, col.b))));
}
`;

export interface Light { mesh: THREE.Mesh; material: THREE.ShaderMaterial; uniforms: Record<string, THREE.IUniform> }

export function makeLight(): Light {
  const pos: number[] = [], idx: number[] = [], index: number[] = [];
  // A strip of so many pieces: two points at each step, one to each side.
  const strip = (kind: number, n: number, steps: number) => {
    for (let i = 0; i < n; i++) {
      const base = pos.length / 3;
      for (let j = 0; j <= steps; j++) for (const side of [-1, 1]) { pos.push(j / steps, side, kind); idx.push(i); }
      for (let j = 0; j < steps; j++) { const p = base + j * 2; index.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
    }
  };
  strip(KIND.sheet, 1, 1);
  strip(KIND.loop, KNOT.strands, STEPS.loop);
  strip(KIND.funnel, KNOT.funnels, STEPS.funnel);
  strip(KIND.arc, KNOT.arcs, STEPS.arc);
  strip(KIND.spark, KNOT.sparks, 1);
  strip(KIND.mote, KNOT.motes, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aIdx', new THREE.Float32BufferAttribute(idx, 1));
  g.setIndex(index);
  const S = strands(), F = funnels();
  const v4 = (a: Float32Array) => Array.from({ length: a.length / 4 }, (_, i) => new THREE.Vector4().fromArray(a, i * 4));
  const uniforms: Record<string, THREE.IUniform> = {
    uT: { value: 0 }, uCore: { value: 1 },
    uS0: { value: v4(S.s0) }, uS1: { value: v4(S.s1) }, uS2: { value: v4(S.s2) }, uS3: { value: v4(S.s3) },
    uF0: { value: v4(F.f0) }, uF1: { value: v4(F.f1) },
  };
  const material = new THREE.ShaderMaterial({
    name: 'coreLight', uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.userData.noAO = true;
  mesh.userData.noWire = true;
  return { mesh, material, uniforms };
}
