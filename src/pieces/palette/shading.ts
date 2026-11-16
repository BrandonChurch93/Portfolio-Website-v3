import * as THREE from 'three';
import { hex, type PaletteName } from '../../config/palette';
import { lin, type Chunks } from '../../world/surface';
import { BRUSH, DABS, MIX, PAINTS, STROKES, brushAxis } from './layout';

// What every material of the piece shares, as the CPU's do (src/pieces/cpu/shading.ts): each part's vertices carry
// its number in the cell attribute's w, and a small float texture holds each part's transform, heat and fold for this
// frame, so the whole piece moves part by part from a few draw calls. A part that comes home as a shard is drawn
// folded, its own faces crumpled into the shard. The band's cut is made along the eye's rays to the board's top.
//
// The light the stream wakes is the paints': each dab along the rim lights from inside in its own color, one after
// another, the light runs along the ridges the knife left in the mixing ground and up the loaded hairs of the brush,
// and every lit paint lays its light on the wood beside it and on the underside of what is over it.

export interface Shared {
  uParts: { value: THREE.DataTexture };
  uTime: { value: number };
  uGlow: { value: number };
  uLit: { value: number };
  uStatic: { value: number };
  uBand: { value: THREE.Vector4 };
  uBandOn: { value: number };
  uEye: { value: THREE.Vector3 };
  uRim: { value: THREE.Vector4 };
}

export const PARTS_MAX = 64;
export const PART_TEXELS = 5;

export function shared(): Shared {
  const tex = new THREE.DataTexture(new Float32Array(PART_TEXELS * PARTS_MAX * 4), PART_TEXELS, PARTS_MAX, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return {
    uParts: { value: tex }, uTime: { value: 0 }, uGlow: { value: 0 }, uLit: { value: -1e4 }, uStatic: { value: 0 },
    uBand: { value: new THREE.Vector4(0, 0, -1e5, 0) }, uBandOn: { value: 0 }, uEye: { value: new THREE.Vector3(0, 500, 0) }, uRim: { value: new THREE.Vector4(0, 1, 0, 0) },
  };
}

// What a paint is, by its number in the cell attribute's x: the seven dabs, then the mixing ground, then the hot paint
// the brush is loaded with and the bead under its tip, then the paint on the knife's edge.
export const PAINT = { mix: 7, hot: 8, knife: 9 } as const;
const C = (n: PaletteName) => lin(hex(n));
const mixC = (a: string, b: string, k: number) => `mix(${a}, ${b}, ${k.toFixed(3)})`;
const ALBEDO = PAINTS.map((p) => C(p));
// The light each dab gives when it is lit: its own color, brought up to a light. The darkest, which is nearly black
// as paint, burns as an ember.
const GLOW = [
  `${C('ember')} * 1.1`,
  mixC(C('ember'), C('flame'), 0.35) + ' * 1.3',
  C('flame'),
  C('hot'),
  `${C('pale')} * 0.9`,
  mixC(C('bronze'), C('flame'), 0.3) + ' * 1.4',
  mixC(C('copper'), C('hot'), 0.25) + ' * 1.2',
];
// When each dab comes on after the lights, in seconds: one after another along the rim, unevenly.
const DAB_AT = [0.0, 0.1, 0.16, 0.33, 0.4, 0.58, 0.66];
// When each stroke of the mixing ground carries its first light.
const STROKE_AT = [0.3, 0.42, 0.37, 0.55, 0.5];
const v3 = (a: number, b: number, c: number) => `vec3(${a.toFixed(2)}, ${b.toFixed(2)}, ${c.toFixed(2)})`;
const DAB_LIST = DABS.map((d) => v3(d.x, d.z, d.r)).join(', ');
const DAB_H = DABS.map((d) => (d.h * 0.45).toFixed(2)).join(', ');
const STROKE_LIST = STROKES.map((s) => `vec4(${s.a[0].toFixed(1)}, ${s.a[1].toFixed(1)}, ${s.b[0].toFixed(1)}, ${s.b[1].toFixed(1)})`).join(', ');
const BEAD = brushAxis(-1.5);
const N = DABS.length, S = STROKES.length;

export const VHEAD = /* glsl */ `
attribute vec4 cell;
uniform highp sampler2D uParts;
varying vec3 vPalP;
varying vec3 vPalN;
varying vec4 vCell;
varying float vHeat;
float palVh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float palVn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(palVh(i), palVh(i + vec3(1,0,0)), f.x), mix(palVh(i + vec3(0,1,0)), palVh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(palVh(i + vec3(0,0,1)), palVh(i + vec3(1,0,1)), f.x), mix(palVh(i + vec3(0,1,1)), palVh(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 palCrumple(vec3 p){ p *= 0.3; return vec3(palVn(p), palVn(p + 17.1), palVn(p + 31.7)) * 2.0 - 1.0; }`;

const MOVE = /* glsl */ `
  int palI = int(cell.w + 0.5);
  vec4 palR0 = texelFetch(uParts, ivec2(0, palI), 0), palR1 = texelFetch(uParts, ivec2(1, palI), 0), palR2 = texelFetch(uParts, ivec2(2, palI), 0);
  vec4 palT3 = texelFetch(uParts, ivec2(3, palI), 0), palT4 = texelFetch(uParts, ivec2(4, palI), 0);
  vec3 palQ = transformed;
  if (palT3.y < 0.999) {
    float o = palT3.y;
    palQ = palT4.xyz + (palQ - palT4.xyz) * mix(palT3.w, 1.0, o) + palCrumple(palQ) * palT3.z * (1.0 - o) * (1.0 - o);
  }
  transformed = vec3(dot(palR0.xyz, palQ) + palR0.w, dot(palR1.xyz, palQ) + palR1.w, dot(palR2.xyz, palQ) + palR2.w);
  vPalP = transformed;
  vCell = cell;
  vHeat = palT3.x;`;

const VERT = /* glsl */ `
{
${MOVE}
  vec3 palN = normalize(vec3(dot(palR0.xyz, objectNormal), dot(palR1.xyz, objectNormal), dot(palR2.xyz, objectNormal)) + 1e-6);
  vPalN = palN;
  #ifndef FLAT_SHADED
  vNormal = normalize(normalMatrix * palN);
  #endif
}`;

export const FHEAD = /* glsl */ `
uniform float uTime, uGlow, uLit, uStatic, uBandOn;
uniform vec4 uBand, uRim;
uniform vec3 uEye;
varying vec3 vPalP;
varying vec3 vPalN;
varying vec4 vCell;
varying float vHeat;
vec3 palRamp(float i){
  vec3 c = mix(${C('ember')}, ${C('flame')}, smoothstep(0.04, 0.42, i));
  c = mix(c, ${C('hot')}, smoothstep(0.42, 0.85, i));
  return mix(c, ${C('pale')}, smoothstep(0.95, 1.4, i));
}
float palH(float n){ n = fract(n * 0.1031); n *= n + 33.33; n *= n + n; return fract(n); }
vec2 palOnBoard(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }
const vec3 PAL_DAB[${N}] = vec3[${N}](${DAB_LIST});
const float PAL_DAB_H[${N}] = float[${N}](${DAB_H});
const float PAL_DAB_AT[${N}] = float[${N}](${DAB_AT.map((v) => v.toFixed(2)).join(', ')});
const vec4 PAL_STROKE[${S}] = vec4[${S}](${STROKE_LIST});
const float PAL_STROKE_MIX[${S}] = float[${S}](${STROKES.map((v) => v.mix.toFixed(2)).join(', ')});
const float PAL_STROKE_AT[${S}] = float[${S}](${STROKE_AT.map((v) => v.toFixed(2)).join(', ')});
const vec2 PAL_MIX = vec2(${MIX.x.toFixed(1)}, ${MIX.z.toFixed(1)});
const vec3 PAL_BEAD = vec3(${BEAD[0].toFixed(2)}, ${(BRUSH.bead.h * 0.5).toFixed(2)}, ${BEAD[1].toFixed(2)});
vec3 palAlbedo(int k){
  ${ALBEDO.map((a, i) => `if (k == ${i}) return ${a};`).join('\n  ')}
  return ${C('hot')};
}
vec3 palGlowCol(int k){
  ${GLOW.map((g, i) => `if (k == ${i}) return ${g};`).join('\n  ')}
  if (k == ${PAINT.mix}) return ${mixC(C('flame'), C('hot'), 0.5)};
  return ${C('hot')};
}
// A wave that passes along the rim now and then, unevenly, some beats skipped: when it passes dab k, and how hard.
float palBeat(float fk, float delay){
  float rate = 0.42, k0 = floor(uTime * rate + 0.37);
  float s = 0.0;
  for (int j = 0; j < 2; j++) {
    float k = k0 - float(j);
    float at = (k + 0.3 * palH(k * 3.7 + 1.0) - 0.37) / rate + delay * (1.0 + 0.6 * palH(k * 5.1 + fk));
    if (at < uLit + 1.0 || palH(k * 2.3 + 7.0) < 0.2) continue;
    s += (0.5 + 0.5 * palH(k * 1.3 + fk * 7.0)) * exp(-pow((uTime - at) / 0.11, 2.0));
  }
  return s;
}
// How brightly dab k burns now.
float palDab(int k){
  float since = uTime - uLit;
  if (uGlow <= 0.001 || since < 0.0) return 0.0;
  float fk = float(k), at = PAL_DAB_AT[k];
  if (uStatic > 0.5) return 0.75 * uGlow;
  float up = smoothstep(at, at + 0.14, since);
  float flare = exp(-pow((since - at - 0.07) / 0.08, 2.0)) * 0.9;
  float breath = 0.68 + 0.17 * sin(uTime * (1.1 + 0.9 * palH(fk + 1.0)) + 6.28 * palH(fk + 2.0)) + 0.08 * sin(uTime * (2.9 + 1.7 * palH(fk + 3.0)) + 6.28 * palH(fk + 4.0));
  return (up * breath + flare + up * palBeat(fk, at)) * uGlow;
}
// The light running along stroke s of the mixing ground, at d of the way from where the knife set down: a first
// crest after the dabs, then crests now and then, each its own pace.
float palStroke(int s, float d){
  float since = uTime - uLit;
  if (uGlow <= 0.001 || since < 0.0) return 0.0;
  float fs = float(s), at = PAL_STROKE_AT[s];
  if (uStatic > 0.5) return 0.35 * uGlow;
  float base = 0.28 * smoothstep(at, at + 0.3, since);
  float x = (since - at) * (1.4 + 0.5 * palH(fs + 9.0)) - d;
  float sum = x > -0.05 ? exp(-pow(x / 0.09, 2.0)) * 1.2 * exp(-max(since - at, 0.0) * 0.6) : 0.0;
  float rate = 0.35 + 0.25 * palH(fs * 3.1 + 1.0), ph = palH(fs * 7.7) * 5.0;
  float k0 = floor(uTime * rate + ph);
  for (int j = 0; j < 2; j++) {
    float k = k0 - float(j), key = k * 1.618 + fs * 13.0;
    float t0 = (k + 0.5 * palH(key) - ph) / rate;
    if (t0 < uLit + at + 0.8 || palH(key + 2.5) < 0.25) continue;
    float y = (uTime - t0) * (1.1 + 0.6 * palH(key + 3.5)) - d;
    sum += y > -0.05 ? exp(-pow(y / 0.1, 2.0)) * (0.5 + 0.5 * palH(key + 1.5)) : 0.0;
  }
  return (base + sum) * uGlow;
}
// The hot paint in the brush's hairs: lit from the tip, the light running up the hairs to the ferrule now and then.
float palHair(float s){
  float since = uTime - uLit - 0.45;
  if (uGlow <= 0.001 || since < 0.0) return 0.0;
  if (uStatic > 0.5) return 0.5 * uGlow * (1.0 - smoothstep(0.3, 0.8, s));
  float load = 1.0 - smoothstep(0.35, 0.85, s);
  float first = exp(-pow((since * 1.6 - s) / 0.12, 2.0)) * 1.1;
  float rate = 0.5, k0 = floor(uTime * rate + 0.2), sum = 0.0;
  for (int j = 0; j < 2; j++) {
    float k = k0 - float(j);
    float t0 = (k + 0.4 * palH(k * 4.3 + 2.0) - 0.2) / rate;
    if (t0 < uLit + 1.2 || palH(k * 1.9) < 0.3) continue;
    float y = (uTime - t0) * 1.3 - s;
    sum += y > -0.05 ? exp(-pow(y / 0.14, 2.0)) * 0.8 : 0.0;
  }
  return (0.45 * load * smoothstep(0.0, 0.3, since) + first + sum) * uGlow;
}
// The light the lit paints lay on what is near them, on the faces turned toward them. Soft and capped.
vec3 palBounce(vec3 p, vec3 n, vec3 albedo){
  if (uGlow <= 0.001) return vec3(0.0);
  vec3 sum = vec3(0.0);
  for (int k = 0; k < ${N}; k++) {
    vec3 c = vec3(PAL_DAB[k].x, PAL_DAB_H[k], PAL_DAB[k].y);
    vec3 d = c - p;
    float l = length(d);
    float reach = max(l - PAL_DAB[k].z, 0.0);
    float face = 0.25 + 0.75 * max(dot(n, d / max(l, 1e-3)), 0.0);
    sum += palGlowCol(k) * palDab(k) * exp(-reach / 7.0) * face;
  }
  float mixAvg = 0.0;
  for (int s = 0; s < ${S}; s++) mixAvg += palStroke(s, 0.5);
  vec2 dm = (p.xz - PAL_MIX) / vec2(46.0, 34.0);
  float dmix = max(length(dm) - 1.0, 0.0) * 40.0;
  sum += palGlowCol(${PAINT.mix}) * mixAvg * 0.25 * exp(-dmix / 6.0) * (0.25 + 0.75 * max(n.y, 0.0));
  vec3 db = PAL_BEAD - p;
  float lb = length(db);
  sum += ${C('hot')} * palHair(0.0) * exp(-max(lb - 3.0, 0.0) / 6.0) * (0.25 + 0.75 * max(dot(n, db / max(lb, 1e-3)), 0.0));
  return min(sum, vec3(1.2)) * (0.35 + 0.65 * albedo) * 0.9;
}
float palCutA;
vec3 palEdgeLight(){
  if (uBandOn < 0.5 || uBand.w <= 0.0) return vec3(0.0);
  float w = max(0.3, fwidth(palCutA) * 1.3);
  float line = exp(-pow(palCutA / w, 2.0)) * uBand.w;
  vec2 out2 = palOnBoard(vPalP) - uBand.xy;
  vec3 toLine = normalize(vec3(out2.x, 0.0, out2.y) / max(length(out2), 1e-3) + vec3(0.0, 0.55, 0.0));
  float facing = max(dot(normalize(vPalN), toLine), 0.0);
  float trail = exp(-palCutA / 6.0) * smoothstep(0.0, 1.5, palCutA / w) * uBand.w * facing * facing * 1.6;
  return mix(${C('hot')}, ${C('pale')}, 0.6 * uBand.w) * line * 6.0 + palRamp(trail) * trail * 4.0;
}
vec3 palHeat(){
  if (vHeat <= 0.001) return vec3(0.0);
  float side = smoothstep(0.45, 0.95, 1.0 - abs(vPalN.y));
  return palRamp(vHeat) * vHeat * 2.2 * (0.35 + 0.65 * side);
}
vec3 palRimLight(vec3 n, vec3 v){
  if (uRim.w <= 0.0) return vec3(0.0);
  float graze = 1.0 - clamp(dot(n, v), 0.0, 1.0);
  float toward = clamp(dot(n, uRim.xyz), 0.0, 1.0);
  return ${C('pale')} * pow(graze, 6.0) * pow(toward, 2.0) * uRim.w;
}`;

export const CUT = /* glsl */ `
  palCutA = uBand.z - length(palOnBoard(vPalP) - uBand.xy);
  if (uBandOn > 0.5 && palCutA < 0.0) discard;`;

// The chunks a part's material needs, merged with its own.
export function partChunks(own: Chunks = {}, o: { bounce?: boolean; rim?: number } = {}): Chunks {
  const rim = o.rim ?? 1;
  return {
    ...own,
    vhead: `${VHEAD}\n${own.vhead ?? ''}`,
    vert: `${VERT}\n${own.vert ?? ''}`,
    head: `${FHEAD}\n${own.head ?? ''}`,
    color: `${CUT}\n${own.color ?? ''}`,
    emissive: `totalEmissiveRadiance += palHeat() + palEdgeLight()${rim > 0 ? ` + palRimLight(normal, normalize(vViewPosition)) * ${rim.toFixed(2)}` : ''}${o.bounce === false ? '' : ' + palBounce(vPalP, normalize(vPalN), diffuseColor.rgb)'};\n${own.emissive ?? ''}`,
  };
}

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
varying vec3 vPalP;
varying vec3 vPalN;
varying vec4 vCell;
varying float vHeat;
float palCutA;
vec2 palOnBoard(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${CUT}`);
  };
  m.customProgramCacheKey = () => 'palette-depth';
  return m;
}
