import * as THREE from 'three';
import { hex } from '../../config/palette';
import { lin, type Chunks } from '../../world/surface';
import { BODY, BUNDLES, PKG, SOCKET, STRIKE, toWorld } from './layout';

// What every material of the piece shares. Each part's vertices carry its number in the cell attribute, and a small
// float texture holds each part's transform, heat and reveal for this frame, so the whole piece moves part by part
// from a few draw calls.
//
// A cut is always made along the eye's own rays: a point is taken down its ray to the board's top, and the cut is
// a line on the board. So a standing part is cut edge on, and what shows at the cut is a line of light and never
// the inside of a part.

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
}

export const PARTS_MAX = 256;
// A part's texels: three rows of its transform, its heat, and where it is uncovered from (a point on the board, the
// radius of the circle it shows within, how brightly that circle's edge burns).
export const PART_TEXELS = 5;

export function shared(pulse: THREE.Texture): Shared {
  const tex = new THREE.DataTexture(new Float32Array(PART_TEXELS * PARTS_MAX * 4), PART_TEXELS, PARTS_MAX, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return {
    uParts: { value: tex }, uPulse: { value: pulse }, uTime: { value: 0 }, uGlow: { value: 0 }, uLit: { value: -1e4 }, uStatic: { value: 0 },
    uBand: { value: new THREE.Vector4(0, 0, -1e5, 0) }, uBandOn: { value: 0 }, uEye: { value: new THREE.Vector3(0, 500, 0) },
  };
}

export const VHEAD = /* glsl */ `
attribute vec4 cell;
uniform highp sampler2D uParts;
varying vec3 vCpuP;
varying vec3 vCpuN;
varying vec3 vCpuR;
varying vec4 vReveal;
varying float vHeat;`;

const MOVE = /* glsl */ `
  int cpuI = int(cell.w + 0.5);
  vec4 cpuR0 = texelFetch(uParts, ivec2(0, cpuI), 0), cpuR1 = texelFetch(uParts, ivec2(1, cpuI), 0), cpuR2 = texelFetch(uParts, ivec2(2, cpuI), 0);
  vec3 cpuQ = transformed;
  vCpuR = cpuQ;
  vReveal = texelFetch(uParts, ivec2(4, cpuI), 0);
  transformed = vec3(dot(cpuR0.xyz, cpuQ) + cpuR0.w, dot(cpuR1.xyz, cpuQ) + cpuR1.w, dot(cpuR2.xyz, cpuQ) + cpuR2.w);
  vCpuP = transformed;
  vHeat = texelFetch(uParts, ivec2(3, cpuI), 0).x;`;

export const VERT = /* glsl */ `
{
${MOVE}
  vec3 cpuN = normalize(vec3(dot(cpuR0.xyz, objectNormal), dot(cpuR1.xyz, objectNormal), dot(cpuR2.xyz, objectNormal)));
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

export const FHEAD = /* glsl */ `
uniform sampler2D uPulse;
uniform float uTime, uGlow, uLit, uStatic, uBandOn;
uniform vec4 uBand;
uniform vec3 uEye;
varying vec3 vCpuP;
varying vec3 vCpuN;
varying vec3 vCpuR;
varying vec4 vReveal;
varying float vHeat;
vec3 cpuRamp(float i){
  vec3 c = mix(${C('ember')}, ${C('flame')}, smoothstep(0.04, 0.42, i));
  c = mix(c, ${C('hot')}, smoothstep(0.42, 0.85, i));
  return mix(c, ${C('pale')}, smoothstep(0.95, 1.4, i));
}
float cpuH(float n){ n = fract(n * 0.1031); n *= n + 33.33; n *= n + n; return fract(n); }
// A point taken down the eye's ray to the board's top.
vec2 cpuOnBoard(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }
// The distance a part's reveal measures by: a rounded square, so a part spreads out of its shard square on to the board.
float cpuSquare(vec2 d){ d = abs(d); vec2 q = d * d; q *= q; return sqrt(sqrt(q.x + q.y)); }
// One wave on a bundle, x seconds after it left the seam, at d of the way out: a short crest with a shorter wake,
// spent before it reaches the board's edge.
// How far the eye is: 0 up close, 1 where a trace is finer than a pixel. Far off, a wave's wake runs longer, so a
// travelling crest still reads as one.
float cpuFar = 0.0;
float cpuCrest(float x, float d, float speed, float amp){
  if (x < 0.0) return 0.0;
  float s = x * speed;
  float ahead = d - s;
  float shape = ahead > 0.0 ? exp(-pow(ahead / (0.022 + 0.01 * cpuFar), 2.0)) : exp(ahead / (0.06 + 0.11 * cpuFar)) * (0.5 + 0.5 * exp(ahead / 0.02));
  return amp * shape * exp(-s / (0.3 + 0.2 * cpuFar)) * (1.0 - smoothstep(0.27, 0.42, s));
}
// The light on bundle b at d of the way out. The first wave leaves every bundle as the lights come on, a little apart;
// after it, each bundle keeps its own beat, some beats skipped.
float cpuWave(float d, float b){
  float since = uTime - uLit;
  if (since < 0.0) return 0.0;
  if (uStatic > 0.5) return 0.32 * exp(-d / 0.16) * (1.0 - smoothstep(0.26, 0.4, d));
  float sum = cpuCrest(since - 0.32 * cpuH(b * 5.1 + 9.0), d, 0.8 + 0.35 * cpuH(b + 3.0), 0.6 + 0.4 * cpuH(b * 2.7 + 4.0));
  float rate = 0.7 + 0.55 * cpuH(b * 7.13 + 1.0), phase = cpuH(b * 3.31 + 2.0) * 7.0;
  float k0 = floor(uTime * rate + phase);
  for (int j = 0; j < 3; j++) {
    float k = k0 - float(j), key = k * 1.618 + b * 17.0;
    float at = (k + 0.6 * cpuH(key + 0.5) - phase) / rate;
    if (at < uLit + 0.45 || cpuH(key + 2.5) < 0.22) continue;
    sum += cpuCrest(uTime - at, d, 0.62 + 0.4 * cpuH(key + 3.5), 0.45 + 0.55 * cpuH(key + 1.5));
  }
  return sum;
}
// How brightly bundle b's seam end flares as its waves leave.
float cpuFlare(float b){
  float since = uTime - uLit;
  if (since < 0.0) return 0.0;
  if (uStatic > 0.5) return 0.4;
  float f = exp(-pow((since - 0.32 * cpuH(b * 5.1 + 9.0)) / 0.07, 2.0)) * 1.2;
  float rate = 0.7 + 0.55 * cpuH(b * 7.13 + 1.0), phase = cpuH(b * 3.31 + 2.0) * 7.0;
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
  float side = 0.12 + 0.88 * pow(smoothstep(-0.7, 0.95, dot(normalize(r + 1e-3), ${TO_STRIKE})), 1.6);
  float a = atan(r.y, r.x);
  float flicker = uStatic > 0.5 ? 1.0 : 0.7 + 0.3 * sin(uTime * 2.3 + a * 3.0) * sin(uTime * 1.7 - a * 5.0 + 1.3);
  float s = side * flicker * 0.32;
  for (int b = 0; b < ${EXITS.length}; b++) s += cpuFlare(float(b)) * exp(-length(p.xz - CPU_EXIT[b]) / 4.0) * 0.55;
  return s * near * uGlow;
}
// The light a part's reveal and the band throw on it: a thin hot line exactly on the cut, and for a few millimetres
// behind it the surface lit by it.
float cpuCutA, cpuRevA;
vec3 cpuEdgeLight(){
  vec3 e = vec3(0.0);
  if (uBandOn > 0.5 && uBand.w > 0.0) {
    float w = max(0.16, fwidth(cpuCutA) * 1.1);
    float line = exp(-pow(cpuCutA / w, 2.0)) * uBand.w;
    float trail = exp(-cpuCutA / 2.8) * smoothstep(0.0, 2.5, cpuCutA / w) * 0.26 * uBand.w;
    e += mix(${C('hot')}, ${C('pale')}, 0.55 * uBand.w) * line * 3.2 + cpuRamp(trail) * trail * 1.8;
  }
  if (vReveal.w > 0.0) {
    float w = max(0.16, fwidth(cpuRevA) * 0.85);
    float i = vReveal.w * (exp(-pow(cpuRevA / w, 2.0)) + exp(-cpuRevA / 1.4) * 0.22);
    e += cpuRamp(i) * i * 2.0;
  }
  return e;
}
// A piece of board that has just closed its seam burns along its cut sides, and cools.
vec3 cpuHeat(){ return vHeat > 0.001 ? cpuRamp(vHeat) * vHeat * 1.8 * smoothstep(0.5, 0.95, 1.0 - abs(vCpuN.y)) : vec3(0.0); }
// The light the lit traces and the seam throw on what stands beside them: low down, on faces that look sideways or
// down, soft, and capped so it is never a bead.
vec3 cpuBounce(vec3 albedo){
  if (uGlow <= 0.001) return vec3(0.0);
  vec2 uv = (vCpuP.xz + 55.0) / 110.0;
  vec4 ph = textureLod(uPulse, uv, 4.0);
  float g = 0.0;
  if (ph.r > 0.03) g = cpuWave(ph.g / ph.r, floor(ph.b / ph.r * 127.5 / 16.0)) * ph.r;
  float k = min(g * uGlow, 0.45) * (0.25 + 0.55 * (1.0 - max(vCpuN.y, 0.0))) * exp(-max(vCpuP.y, 0.0) / 2.4);
  float s = min(cpuSeam(vec3(vCpuP.xz, max(vCpuP.y - 0.6, 0.0))) * 0.22, 0.2);
  return (cpuRamp(k) * k * (0.25 + 0.6 * albedo) + cpuRamp(s) * s) * 0.9;
}`;

export const CUT = /* glsl */ `
  cpuCutA = uBand.z - length(cpuOnBoard(vCpuP) - uBand.xy);
  cpuRevA = vReveal.z - cpuSquare(cpuOnBoard(vCpuP) - vReveal.xy);
  if (uBandOn > 0.5 && cpuCutA < 0.0) discard;
  if (cpuRevA < 0.0) discard;`;

// The chunks a part's material needs, merged with its own.
export function partChunks(own: Chunks = {}, o: { bounce?: boolean } = {}): Chunks {
  return {
    ...own,
    vhead: `${VHEAD}\n${own.vhead ?? ''}`,
    vert: `${VERT}\n${own.vert ?? ''}`,
    head: `${FHEAD}\n${own.head ?? ''}`,
    color: `${CUT}\n${own.color ?? ''}`,
    emissive: `totalEmissiveRadiance += cpuHeat() + cpuEdgeLight()${o.bounce === false ? '' : ' + cpuBounce(diffuseColor.rgb)'};\n${own.emissive ?? ''}`,
  };
}

// Shadows are drawn from where each part is now, and nothing not yet uncovered casts one.
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
varying vec4 vReveal;
varying float vHeat;
float cpuCutA, cpuRevA;
vec2 cpuOnBoard(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }
float cpuSquare(vec2 d){ d = abs(d); vec2 q = d * d; q *= q; return sqrt(sqrt(q.x + q.y)); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${CUT}`);
  };
  m.customProgramCacheKey = () => 'cpu-depth';
  return m;
}
