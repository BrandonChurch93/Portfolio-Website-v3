import * as THREE from 'three';
import { hex } from '../../config/palette';
import { lin, type Chunks } from '../../world/surface';
import { PKG, SOCKET } from './layout';

// What every material of the piece shares. Each part's vertices carry its number in the cell attribute, and a small
// float texture holds each part's transform and heat for this frame, so the whole piece moves part by part from a
// few draw calls. The band that uncovers it, the heat of a part that has just become itself, the light running along
// the traces and the light those traces throw on what stands beside them are all worked out here.

export interface Shared {
  uParts: { value: THREE.DataTexture };
  uPulse: { value: THREE.Texture };
  uTime: { value: number };
  // The stream's light in the traces and the seam, 0 to 1: how much the stream is on it, once the lights are on.
  uGlow: { value: number };
  // How far the first light has run out along the traces since the lights came on, as a share of RUN.
  uFront: { value: number };
  uStatic: { value: number };
  uSeam: { value: number };
  // The band: the middle of its circle (x, z), its radius and how brightly it burns. uBandOn is 1 while it crosses.
  uBand: { value: THREE.Vector4 };
  uBandOn: { value: number };
  // The lights coming on: a beat through every trace and the seam, then the pulse.
  uBeat: { value: number };
}

export const PARTS_MAX = 64;
// A part's texels: three rows of its transform, its heat, and where it is being uncovered from (a point in its own
// rest space and a radius, past which nothing of it is drawn yet).
export const PART_TEXELS = 5;

export function shared(pulse: THREE.Texture): Shared {
  const tex = new THREE.DataTexture(new Float32Array(PART_TEXELS * PARTS_MAX * 4), PART_TEXELS, PARTS_MAX, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return {
    uParts: { value: tex }, uPulse: { value: pulse }, uTime: { value: 0 }, uGlow: { value: 0 }, uFront: { value: 9 }, uStatic: { value: 0 },
    uSeam: { value: 0 }, uBand: { value: new THREE.Vector4(0, 0, -1e5, 0) }, uBandOn: { value: 0 }, uBeat: { value: 0 },
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
const seamC = `vec2(${SOCKET.x.toFixed(2)}, ${SOCKET.z.toFixed(2)})`;
const seamH = `vec2(${PKG.hw.toFixed(2)}, ${(PKG.hd + 0.9).toFixed(2)})`;

export const FHEAD = /* glsl */ `
uniform sampler2D uPulse;
uniform float uTime, uGlow, uFront, uStatic, uSeam, uBandOn, uBeat;
uniform vec4 uBand;
varying vec3 vCpuP;
varying vec3 vCpuN;
varying vec3 vCpuR;
varying vec4 vReveal;
varying float vHeat;
vec3 cpuRamp(float i){
  vec3 c = mix(${C('ember')}, ${C('flame')}, smoothstep(0.04, 0.42, i));
  c = mix(c, ${C('hot')}, smoothstep(0.42, 0.85, i));
  return mix(c, ${C('pale')}, smoothstep(0.9, 1.25, i));
}
float cpuH(float n){ n = fract(n * 0.1031); n *= n + 33.33; n *= n + n; return fract(n); }
// The light on one bundle at a share d of the way out: waves leave the seam at uneven times, some bundles skip a
// beat, each runs out at its own speed and dies as it goes, with a short wake behind its crest.
float cpuWave(float d, float b){
  float first = smoothstep(-0.03, 0.0, uFront - d);
  if (uStatic > 0.5) return 0.4 * (1.0 - d) * first;
  float tau = uTime * (0.95 + 0.4 * cpuH(b * 7.13 + 1.0)) + cpuH(b * 3.31 + 2.0) * 5.0;
  float k0 = floor(tau), sum = 0.0;
  for (int j = 0; j < 3; j++) {
    float k = k0 - float(j), key = k * 1.618 + b * 17.0;
    float e = k + 0.5 * cpuH(key + 0.5);
    float amp = (0.55 + 0.45 * cpuH(key + 1.5)) * step(0.12, cpuH(key + 2.5));
    float x = (tau - e) * (0.95 + 0.4 * cpuH(key + 3.5));
    if (x < 0.0 || x > 1.3) continue;
    float fade = 1.0 - smoothstep(0.0, 1.15, x);
    float behind = max(x - d, 0.0);
    float crest = exp(-pow(max(d - x, 0.0) / 0.014, 2.0)) * exp(-behind / 0.12);
    float tail = d < x ? exp(-behind / 0.3) * 0.42 : 0.0;
    sum += amp * (crest + tail) * fade * (0.55 + 0.45 * fade);
  }
  return sum * first;
}
// A part just come home burns hot along its edges, the faces that stand up from its own top, and cools.
#define cpuHeat() (vHeat > 0.001 ? cpuRamp(vHeat) * vHeat * 2.4 * smoothstep(0.35, 0.9, 1.0 - abs(vObjN.y)) : vec3(0.0))
// The band's line on the board, wide and bright where it sets out and spent by the far side, and the light it lays
// on what it has just uncovered behind it.
vec3 cpuBandLight(){
  if (uBandOn < 0.5 || vReveal.x < 0.5) return vec3(0.0);
  float e = uBand.z - length(vCpuP.xz - uBand.xy);
  float wide = 1.2 + 2.4 * uBand.w;
  float i = uBand.w * (exp(-pow(e / wide, 2.0)) * 1.1 + exp(-max(e, 0.0) / 9.0) * 0.45);
  return cpuRamp(i) * min(i, 1.0) * 1.6 * smoothstep(0.4, 0.85, vCpuN.y);
}
// The light the lit traces and the seam throw on what stands beside them: strongest low down and on faces that look
// down or sideways at the board.
vec3 cpuBounce(vec3 albedo){
  if (uGlow <= 0.001) return vec3(0.0);
  vec4 ph = textureLod(uPulse, (vCpuP.xz + 55.0) / 110.0, 4.0);
  float g = ph.r > 0.02 ? cpuWave(ph.g / ph.r, floor(ph.b / ph.r * 127.5 / 16.0) * 16.0) * ph.r * 2.6 : 0.0;
  vec2 q = abs(vCpuP.xz - ${seamC}) - ${seamH};
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float h = exp(-max(vCpuP.y, 0.0) / 2.8);
  float k = g * uGlow * (0.2 + 0.5 - 0.5 * vCpuN.y) * h;
  // The seam itself: the socket's wall, the substrate's edge and the cavity floor glow where the waves leave.
  float s = exp(-abs(sd) / 1.3) * uSeam * uGlow * exp(-max(vCpuP.y - 2.7, 0.0) / 0.45) * 2.0;
  k = min(k, 1.0);
  s = min(s, 0.95);
  return cpuRamp(k) * k * (0.3 + 0.5 * albedo) * 0.8 + cpuRamp(s) * s * 1.5;
}`;

export const DISCARD = /* glsl */ `
  if (uBandOn > 0.5 && vReveal.x > 0.5 && length(vCpuP.xz - uBand.xy) > uBand.z) discard;`;

// The chunks a part's material needs, merged with its own.
export function partChunks(own: Chunks = {}, o: { bounce?: boolean } = {}): Chunks {
  return {
    ...own,
    vhead: `${VHEAD}\n${own.vhead ?? ''}`,
    vert: `${VERT}\n${own.vert ?? ''}`,
    head: `${FHEAD}\n${own.head ?? ''}`,
    color: `${DISCARD}\n${own.color ?? ''}`,
    emissive: `totalEmissiveRadiance += cpuHeat() + cpuBandLight()${o.bounce === false ? '' : ' + cpuBounce(diffuseColor.rgb)'};\n${own.emissive ?? ''}`,
  };
}

// Shadows are drawn from where each part is now, and nothing ahead of the band casts one.
export function depthMaterial(u: Shared): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VHEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n{\n${MOVE}\n}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uBandOn;\nuniform vec4 uBand;\nvarying vec3 vCpuP;\nvarying vec3 vCpuN;\nvarying vec3 vCpuR;\nvarying vec4 vReveal;\nvarying float vHeat;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${DISCARD}`);
  };
  m.customProgramCacheKey = () => 'cpu-depth';
  return m;
}
