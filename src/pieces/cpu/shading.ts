import * as THREE from 'three';
import { hex } from '../../config/palette';
import { lin, type Chunks } from '../../world/surface';
import { BOARD, BODY, BUNDLES, PKG, RUN, SOCKET, STRIKE, toWorld } from './layout';

// What every material of the piece shares. Each part's vertices carry its number in the cell attribute, and a small
// float texture holds each part's transform, heat and fold for this frame, so the whole piece moves part by part from
// a few draw calls.
//
// A part that comes home as a shard is drawn folded: its own faces crumpled into a small jagged thing the size of
// the shard, turned as the shard was. It opens into its faces in a few frames. The band's cut is made along the
// eye's rays: a point is taken down its ray to the board's top and the cut is a line there, so a standing part is cut
// edge on and what shows at the cut is a line of light and never the inside of a part.

export interface Shared {
  uParts: { value: THREE.DataTexture };
  uPulse: { value: THREE.Texture };
  uTime: { value: number };
  // The stream's light in the traces and the seam, 0 to 1.
  uGlow: { value: number };
  // The clock time the lights came on: the first wave leaves the seam then, and no wave before it.
  uLit: { value: number };
  uStatic: { value: number };
  // The band: the middle of its circle (x, z), its radius and how brightly it burns. uBandOn is 1 while it crosses.
  uBand: { value: THREE.Vector4 };
  uBandOn: { value: number };
  // Where the eye is, in the piece's millimetres.
  uEye: { value: THREE.Vector3 };
  // The rim light, as the eye sees it: the way to it in view space, and how strong it is.
  uRim: { value: THREE.Vector4 };
}

export const PARTS_MAX = 256;
// A part's texels: three rows of its transform; its heat, how far it has opened (1 is whole), how far its faces are
// crumpled, in millimetres, and how small it is drawn folded; and the point it folds about.
export const PART_TEXELS = 5;

export function shared(pulse: THREE.Texture): Shared {
  const tex = new THREE.DataTexture(new Float32Array(PART_TEXELS * PARTS_MAX * 4), PART_TEXELS, PARTS_MAX, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return {
    uParts: { value: tex }, uPulse: { value: pulse }, uTime: { value: 0 }, uGlow: { value: 0 }, uLit: { value: -1e4 }, uStatic: { value: 0 },
    uBand: { value: new THREE.Vector4(0, 0, -1e5, 0) }, uBandOn: { value: 0 }, uEye: { value: new THREE.Vector3(0, 500, 0) }, uRim: { value: new THREE.Vector4(0, 1, 0, 0) },
  };
}

export const VHEAD = /* glsl */ `
attribute vec4 cell;
uniform highp sampler2D uParts;
varying vec3 vCpuP;
varying vec3 vCpuN;
varying vec3 vCpuR;
varying float vHeat;
float cpuVh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cpuVn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cpuVh(i), cpuVh(i + vec3(1,0,0)), f.x), mix(cpuVh(i + vec3(0,1,0)), cpuVh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(cpuVh(i + vec3(0,0,1)), cpuVh(i + vec3(1,0,1)), f.x), mix(cpuVh(i + vec3(0,1,1)), cpuVh(i + vec3(1,1,1)), f.x), f.y), f.z); }
// How a folded part's faces are crumpled: a smooth field, so faces that meet stay joined as they fold.
vec3 cpuCrumple(vec3 p){ p *= 0.42; return vec3(cpuVn(p), cpuVn(p + 17.1), cpuVn(p + 31.7)) * 2.0 - 1.0; }`;

const MOVE = /* glsl */ `
  int cpuI = int(cell.w + 0.5);
  vec4 cpuR0 = texelFetch(uParts, ivec2(0, cpuI), 0), cpuR1 = texelFetch(uParts, ivec2(1, cpuI), 0), cpuR2 = texelFetch(uParts, ivec2(2, cpuI), 0);
  vec4 cpuT3 = texelFetch(uParts, ivec2(3, cpuI), 0), cpuT4 = texelFetch(uParts, ivec2(4, cpuI), 0);
  vec3 cpuQ = transformed;
  vCpuR = cpuQ;
  if (cpuT3.y < 0.999) {
    float o = cpuT3.y;
    cpuQ = cpuT4.xyz + (cpuQ - cpuT4.xyz) * mix(cpuT3.w, 1.0, o) + cpuCrumple(cpuQ) * cpuT3.z * (1.0 - o) * (1.0 - o);
  }
  transformed = vec3(dot(cpuR0.xyz, cpuQ) + cpuR0.w, dot(cpuR1.xyz, cpuQ) + cpuR1.w, dot(cpuR2.xyz, cpuQ) + cpuR2.w);
  vCpuP = transformed;
  vHeat = cpuT3.x;`;

export const VERT = /* glsl */ `
{
${MOVE}
  vec3 cpuN = normalize(vec3(dot(cpuR0.xyz, objectNormal), dot(cpuR1.xyz, objectNormal), dot(cpuR2.xyz, objectNormal)) + 1e-6);
  vCpuN = cpuN;
  #ifndef FLAT_SHADED
  vNormal = normalize(normalMatrix * cpuN);
  #endif
}`;

const C = (n: Parameters<typeof hex>[0]) => lin(hex(n));
const v2 = (x: number, z: number) => `vec2(${x.toFixed(2)}, ${z.toFixed(2)})`;
const SEAM_C = v2(SOCKET.x, SOCKET.z);
// The middle of the gap the contacts show in, between the cavity's wall and the substrate.
const SEAM_H = v2((BODY.cav[0] + PKG.hw) / 2, (BODY.cav[1] + PKG.hd) / 2);
const TO_STRIKE = (() => { const dx = STRIKE.x - SOCKET.x, dz = STRIKE.z - SOCKET.z, l = Math.hypot(dx, dz); return v2(dx / l, dz / l); })();
// Where each bundle leaves the seam: the point of the seam nearest the bundle's first point.
const EXITS = BUNDLES.map((b): [number, number] => {
  const [x, z] = b.path[0];
  const hx = (BODY.cav[0] + PKG.hw) / 2, hz = (BODY.cav[1] + PKG.hd) / 2;
  return toWorld([Math.max(-hx, Math.min(hx, x - SOCKET.x)), Math.max(-hz, Math.min(hz, z - SOCKET.z))]);
});
const EXIT_LIST = EXITS.map(([x, z]) => v2(x, z)).join(', ');
// How far each bundle runs before it leaves the board, as a share of RUN: a wave runs most of that way.
const LENGTHS = BUNDLES.map((b) => {
  let d = 0;
  for (let k = 1; k < b.path.length; k++) {
    const [a, c] = [b.path[k - 1], b.path[k]];
    const seg = Math.hypot(c[0] - a[0], c[1] - a[1]);
    let t = 1;
    for (let ax = 0; ax < 2; ax++) if (Math.abs(c[ax]) > BOARD.half && c[ax] !== a[ax]) t = Math.min(t, (Math.sign(c[ax]) * BOARD.half - a[ax]) / (c[ax] - a[ax]));
    d += seg * Math.max(0, t);
    if (t < 1) break;
  }
  return Math.min(1, d / RUN);
});
const LENGTH_LIST = LENGTHS.map((l) => l.toFixed(3)).join(', ');
const MIDDLE_LIST = BUNDLES.map((b) => ((b.n - 1) / 2).toFixed(1)).join(', ');

export const FHEAD = /* glsl */ `
uniform sampler2D uPulse;
uniform float uTime, uGlow, uLit, uStatic, uBandOn;
uniform vec4 uBand, uRim;
uniform vec3 uEye;
varying vec3 vCpuP;
varying vec3 vCpuN;
varying vec3 vCpuR;
varying float vHeat;
vec3 cpuRamp(float i){
  vec3 c = mix(${C('ember')}, ${C('flame')}, smoothstep(0.04, 0.42, i));
  c = mix(c, ${C('hot')}, smoothstep(0.42, 0.85, i));
  return mix(c, ${C('pale')}, smoothstep(0.95, 1.4, i));
}
float cpuH(float n){ n = fract(n * 0.1031); n *= n + 33.33; n *= n + n; return fract(n); }
// A point taken down the eye's ray to the board's top.
vec2 cpuOnBoard(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }
const float CPU_LEN[${LENGTHS.length}] = float[${LENGTHS.length}](${LENGTH_LIST});
const float CPU_MID[${LENGTHS.length}] = float[${LENGTHS.length}](${MIDDLE_LIST});
// How far the eye is: 0 up close, 1 where a trace is finer than a pixel.
float cpuFar = 0.0;
// One wave on bundle b, x seconds after it left the seam, at d of the way out: a crest with a wake behind it. It
// runs most of the way to the board's edge, dimming as it goes, and is spent just before the edge.
float cpuCrest(float x, float d, float speed, float amp, int b){
  if (x < 0.0) return 0.0;
  float s = x * speed, len = CPU_LEN[b];
  float ahead = d - s;
  float shape = ahead > 0.0 ? exp(-pow(ahead / (0.02 + 0.008 * cpuFar), 2.0)) : exp(ahead / (0.1 + 0.16 * cpuFar)) * (0.45 + 0.55 * exp(ahead / 0.02));
  return amp * shape * (0.45 + 0.55 * exp(-s / (0.45 * len))) * (1.0 - smoothstep(0.78 * len, 0.97 * len, s));
}
// The light on bundle b at d of the way out. The first wave leaves the bundles one after another as the lights come
// on; after it, each bundle keeps its own beat, some beats skipped.
float cpuWave(float d, float bf){
  int b = int(clamp(bf, 0.0, ${(LENGTHS.length - 1).toFixed(1)}));
  float since = uTime - uLit;
  if (since < 0.0) return 0.0;
  if (uStatic > 0.5) return 0.32 * exp(-d / (0.4 * CPU_LEN[b])) * (1.0 - smoothstep(0.78 * CPU_LEN[b], 0.97 * CPU_LEN[b], d));
  float sum = cpuCrest(since - 0.32 * cpuH(bf * 5.1 + 9.0), d, 0.7 + 0.3 * cpuH(bf + 3.0), 0.6 + 0.4 * cpuH(bf * 2.7 + 4.0), b);
  float rate = 0.9 + 0.6 * cpuH(bf * 7.13 + 1.0), phase = cpuH(bf * 3.31 + 2.0) * 7.0;
  float k0 = floor(uTime * rate + phase);
  for (int j = 0; j < 3; j++) {
    float k = k0 - float(j), key = k * 1.618 + bf * 17.0;
    float at = (k + 0.6 * cpuH(key + 0.5) - phase) / rate;
    if (at < uLit + 0.45 || cpuH(key + 2.5) < 0.22) continue;
    sum += cpuCrest(uTime - at, d, 0.55 + 0.35 * cpuH(key + 3.5), 0.45 + 0.55 * cpuH(key + 1.5), b);
  }
  return sum;
}
// How brightly bundle b's seam end flares as its waves leave.
float cpuFlare(float b){
  float since = uTime - uLit;
  if (since < 0.0) return 0.0;
  if (uStatic > 0.5) return 0.4;
  float f = exp(-pow((since - 0.32 * cpuH(b * 5.1 + 9.0)) / 0.07, 2.0)) * 1.2;
  float rate = 0.9 + 0.6 * cpuH(b * 7.13 + 1.0), phase = cpuH(b * 3.31 + 2.0) * 7.0;
  float k0 = floor(uTime * rate + phase);
  for (int j = 0; j < 2; j++) {
    float k = k0 - float(j), key = k * 1.618 + b * 17.0;
    float at = (k + 0.6 * cpuH(key + 0.5) - phase) / rate;
    if (at < uLit + 0.45 || cpuH(key + 2.5) < 0.22) continue;
    f += (0.45 + 0.55 * cpuH(key + 1.5)) * exp(-pow((uTime - at) / 0.08, 2.0)) * 0.8;
  }
  return f;
}
const vec2 CPU_EXIT[${EXITS.length}] = vec2[${EXITS.length}](${EXIT_LIST});
// The seam round the processor: dim, uneven, strongest on the side the stream came in at, and flaring where each
// bundle's waves leave it. Never an even frame.
float cpuSeam(vec3 p){
  if (uGlow <= 0.001) return 0.0;
  vec2 r = p.xz - ${SEAM_C};
  vec2 q = abs(r) - ${SEAM_H};
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  if (abs(sd) > 6.0) return 0.0;
  float near = exp(-abs(sd) / 0.9) * exp(-max(p.y - 2.4, 0.0) / 0.5);
  float side = 0.04 + 0.96 * pow(smoothstep(-0.5, 0.95, dot(normalize(r + 1e-3), ${TO_STRIKE})), 2.0);
  float a = atan(r.y, r.x);
  float flicker = uStatic > 0.5 ? 1.0 : 0.7 + 0.3 * sin(uTime * 2.3 + a * 3.0) * sin(uTime * 1.7 - a * 5.0 + 1.3);
  float s = side * flicker * 0.55;
  for (int b = 0; b < ${EXITS.length}; b++) s += cpuFlare(float(b)) * exp(-length(p.xz - CPU_EXIT[b]) / 4.5) * 0.9;
  return s * near * uGlow;
}
// The seam's light as a color: the stream's colors, hot where it is strong.
vec3 cpuSeamLight(vec3 p){ float s = cpuSeam(p); return cpuRamp(0.25 + 1.2 * s) * s; }
// The light the band throws: a hot line exactly on the cut, and the parts just behind it plainly lit by it.
float cpuCutA;
vec3 cpuEdgeLight(){
  if (uBandOn < 0.5 || uBand.w <= 0.0) return vec3(0.0);
  float w = max(0.2, fwidth(cpuCutA) * 1.3);
  float line = exp(-pow(cpuCutA / w, 2.0)) * uBand.w;
  // The curtain is a light standing on the line: what is just behind it is lit by it, on the faces turned toward it
  // and on none turned away, falling off within a few millimetres.
  vec2 out2 = cpuOnBoard(vCpuP) - uBand.xy;
  vec3 toLine = normalize(vec3(out2.x, 0.0, out2.y) / max(length(out2), 1e-3) + vec3(0.0, 0.55, 0.0));
  float facing = max(dot(normalize(vCpuN), toLine), 0.0);
  float trail = exp(-cpuCutA / 3.5) * smoothstep(0.0, 1.5, cpuCutA / w) * uBand.w * facing * facing * 1.6;
  return mix(${C('hot')}, ${C('pale')}, 0.6 * uBand.w) * line * 6.0 + cpuRamp(trail) * trail * 4.0;
}
// A part opening out of its shard burns along its edges and cools as it opens; a piece of the board burns only in a
// hairline along the top of its cut sides.
vec3 cpuHeat(){
  if (vHeat <= 0.001) return vec3(0.0);
  float side = smoothstep(0.55, 0.95, 1.0 - abs(vCpuN.y));
  return cpuRamp(vHeat) * vHeat * 2.2 * side;
}
// The rim: a light behind, low, drawing a crisp pale line along the top edge of every part that faces it, as the
// PC Builder's dark parts are drawn.
vec3 cpuRimLight(vec3 n, vec3 v){
  if (uRim.w <= 0.0) return vec3(0.0);
  float graze = 1.0 - clamp(dot(n, v), 0.0, 1.0);
  float toward = clamp(dot(n, uRim.xyz), 0.0, 1.0);
  return ${C('pale')} * pow(graze, 7.0) * pow(toward, 2.0) * uRim.w;
}
// The light the lit traces and the seam throw on what stands beside them: low down, on faces that look sideways or
// down, soft, and capped so it is never a bead.
vec3 cpuBounce(vec3 albedo){
  if (uGlow <= 0.001) return vec3(0.0);
  vec2 uv = (vCpuP.xz + 55.0) / 110.0;
  vec4 ph = textureLod(uPulse, uv, 4.0);
  float g = 0.0;
  if (ph.r > 0.03) g = cpuWave(ph.g / ph.r, floor(ph.b / ph.r * 127.5 / 16.0)) * ph.r;
  float k = min(g * uGlow, 0.7) * (0.25 + 0.75 * (1.0 - max(vCpuN.y, 0.0))) * exp(-max(vCpuP.y, 0.0) / 3.0);
  float s = min(cpuSeam(vec3(vCpuP.xz, max(vCpuP.y - 0.6, 0.0))) * 0.22, 0.2);
  return (cpuRamp(k) * k * (0.4 + 0.6 * albedo) * 2.0 + cpuRamp(s) * s) * 0.9;
}`;

export const CUT = /* glsl */ `
  cpuCutA = uBand.z - length(cpuOnBoard(vCpuP) - uBand.xy);
  if (uBandOn > 0.5 && cpuCutA < 0.0) discard;`;

// The chunks a part's material needs, merged with its own.
export function partChunks(own: Chunks = {}, o: { bounce?: boolean; rim?: number } = {}): Chunks {
  const rim = o.rim ?? 1;
  return {
    ...own,
    vhead: `${VHEAD}\n${own.vhead ?? ''}`,
    vert: `${VERT}\n${own.vert ?? ''}`,
    head: `${FHEAD}\n${own.head ?? ''}`,
    color: `${CUT}\n${own.color ?? ''}`,
    emissive: `totalEmissiveRadiance += cpuHeat() + cpuEdgeLight()${rim > 0 ? ` + cpuRimLight(normal, normalize(vViewPosition)) * ${rim.toFixed(2)}` : ''}${o.bounce === false ? '' : ' + cpuBounce(diffuseColor.rgb)'};\n${own.emissive ?? ''}`,
  };
}

// Shadows are drawn from where each part is now, folded as it is, and nothing the band has not reached casts one.
export function depthMaterial(u: Shared): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VHEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n{\n${MOVE}\n}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uBandOn;
uniform vec4 uBand;
uniform vec3 uEye;
varying vec3 vCpuP;
varying vec3 vCpuN;
varying vec3 vCpuR;
varying float vHeat;
float cpuCutA;
vec2 cpuOnBoard(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${CUT}`);
  };
  m.customProgramCacheKey = () => 'cpu-depth';
  return m;
}
