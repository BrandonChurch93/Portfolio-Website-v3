import * as THREE from 'three';
import { hex, type PaletteName } from '../../config/palette';
import { lin, type Chunks } from '../../world/surface';
import { BRUSH, DABS, MIX, PAINTS, STROKES, brushAxis } from './layout';

// What every material of the piece shares, as the CPU's do (src/pieces/cpu/shading.ts): each part's vertices carry
// its number in the cell attribute's w, and a small float texture holds each part's transform, heat and fold for this
// frame, so the whole piece moves part by part from a few draw calls. A part that comes home as a shard is drawn
// folded, its own faces crumpled into the shard. The band's cut is made along the eye's rays to the board's top.
//
// The cursor's light is mirrored as a long tube (palTube), so on the varnish, the wet paint and the metal its
// reflection is a streak that slides with the cursor, as the CPU's lid answers it. The light the stream wakes is the
// paints': each fresh dab lights from inside in its own color, one after another along the rim, the light runs along
// the ridges the knife left in the mixing ground and up the loaded hairs, and every lit paint lays its light on the
// wood beside it and on the faces of the tools turned toward it.

export interface Shared {
  uParts: { value: THREE.DataTexture };
  uArt: { value: THREE.Texture | null };
  uTime: { value: number };
  uGlow: { value: number };
  uLit: { value: number };
  uStatic: { value: number };
  uBand: { value: THREE.Vector4 };
  uBandOn: { value: number };
  uEye: { value: THREE.Vector3 };
  uRim: { value: THREE.Vector4 };
  uTubeA: { value: THREE.Vector3 };
  uTubeB: { value: THREE.Vector3 };
  uTubeK: { value: number };
  uStripA: { value: THREE.Vector3[] };
  uStripB: { value: THREE.Vector3[] };
  uStripK: { value: number };
}

export const PARTS_MAX = 64;
export const PART_TEXELS = 5;

export function shared(): Shared {
  const tex = new THREE.DataTexture(new Float32Array(PART_TEXELS * PARTS_MAX * 4), PART_TEXELS, PARTS_MAX, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return {
    uParts: { value: tex }, uArt: { value: null }, uTime: { value: 0 }, uGlow: { value: 0 }, uLit: { value: -1e4 }, uStatic: { value: 0 },
    uBand: { value: new THREE.Vector4(0, 0, -1e5, 0) }, uBandOn: { value: 0 }, uEye: { value: new THREE.Vector3(0, 500, 0) }, uRim: { value: new THREE.Vector4(0, 1, 0, 0) },
    uTubeA: { value: new THREE.Vector3() }, uTubeB: { value: new THREE.Vector3(1, 0, 0) }, uTubeK: { value: 0 },
    uStripA: { value: [new THREE.Vector3(), new THREE.Vector3()] }, uStripB: { value: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0)] }, uStripK: { value: 0 },
  };
}

// What a paint is, by its number in the cell attribute's x: the dabs by their place in DABS, then the rest.
export const PAINT = { mix: 20, hot: 21, knife: 22, pool: 23, crust: 24, wipe: 25, run: 26, print: 27 } as const;
// The board's art layer (./art.ts) covers this much of the board, centred, in millimetres.
export const ART_MM = { w: 304, h: 224 } as const;
const C = (n: PaletteName) => lin(hex(n));
const mixC = (a: string, b: string, k: number) => `mix(${a}, ${b}, ${k.toFixed(3)})`;
const ALBEDO = PAINTS.map((p) => C(p));
// The light each paint gives when it is lit: its own color, brought up to a light. The darkest, which is nearly black
// as paint, burns as an ember.
const GLOW = [
  `${C('ember')} * 1.4`,
  mixC(C('ember'), C('flame'), 0.4) + ' * 1.3',
  C('flame'),
  C('hot'),
  `${C('pale')} * 0.9`,
  mixC(C('bronze'), C('flame'), 0.35) + ' * 1.4',
  mixC(C('copper'), C('hot'), 0.25) + ' * 1.2',
];
const N = DABS.length, S = STROKES.length;
// When each dab comes on after the lights, in seconds: along the rim from the strike, unevenly.
const DAB_AT = DABS.map((d, k) => (k * 0.075 + 0.05 * Math.sin(k * 2.7 + 1)).toFixed(3));
const STROKE_AT = [0.3, 0.42, 0.37, 0.55, 0.5];
const v3 = (a: number, b: number, c: number) => `vec3(${a.toFixed(2)}, ${b.toFixed(2)}, ${c.toFixed(2)})`;
const DAB_LIST = DABS.map((d) => v3(d.x, d.z, d.r)).join(', ');
const DAB_H = DABS.map((d) => (d.h * 0.45).toFixed(2)).join(', ');
const DAB_PAINT = DABS.map((d) => `${d.paint}`).join(', ');
const DAB_AGE = DABS.map((d) => d.age.toFixed(2)).join(', ');
const STROKE_LIST = STROKES.map((s) => `vec4(${s.a[0].toFixed(1)}, ${s.a[1].toFixed(1)}, ${s.b[0].toFixed(1)}, ${s.b[1].toFixed(1)})`).join(', ');
const BEAD = brushAxis(-1.5);

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
uniform float uTime, uGlow, uLit, uStatic, uBandOn, uTubeK, uStripK;
uniform vec4 uBand, uRim;
uniform vec3 uEye, uTubeA, uTubeB;
uniform vec3 uStripA[2], uStripB[2];
uniform sampler2D uArt;
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
vec4 palArt(vec2 xz){ return texture2D(uArt, vec2(xz.x / ${ART_MM.w.toFixed(1)} + 0.5, xz.y / ${ART_MM.h.toFixed(1)} + 0.5)); }
const vec3 PAL_DAB[${N}] = vec3[${N}](${DAB_LIST});
const float PAL_DAB_H[${N}] = float[${N}](${DAB_H});
const int PAL_DAB_PAINT[${N}] = int[${N}](${DAB_PAINT});
const float PAL_DAB_AGE[${N}] = float[${N}](${DAB_AGE});
const float PAL_DAB_AT[${N}] = float[${N}](${DAB_AT.join(', ')});
const vec4 PAL_STROKE[${S}] = vec4[${S}](${STROKE_LIST});
const float PAL_STROKE_BOW[${S}] = float[${S}](${STROKES.map((v) => v.bow.toFixed(2)).join(', ')});
const float PAL_STROKE_W[${S}] = float[${S}](${STROKES.map((v) => (v.w / 2).toFixed(2)).join(', ')});
// Which pass of the knife is uppermost at a point of the mixing ground, and how far along it the point is: worked out
// from the passes themselves, so the line where one lies over another is the blade's own curve.
int palTopStroke(vec2 p, out float along){
  int top = 0; along = 0.5;
  for (int s = 0; s < ${S}; s++) {
    vec4 q = PAL_STROKE[s];
    vec2 d = q.zw - q.xy; float len = length(d); vec2 u = d / len;
    float t = dot(p - q.xy, u), k = clamp(t / len, 0.0, 1.0);
    float c = dot(p - q.xy, vec2(-u.y, u.x)) - PAL_STROKE_BOW[s] * 4.0 * k * (1.0 - k);
    if (t > -1.0 && t < len * 0.98 && abs(c) < PAL_STROKE_W[s] * (1.0 - 0.22 * smoothstep(0.6, 1.0, k)) + 0.3) { top = s; along = t / len; }
  }
  return top;
}
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
  return ${mixC(C('flame'), C('hot'), 0.5)};
}
// The cursor's light as the eye sees it mirrored: a tube of light from uTubeA to uTubeB (view space), so a flat
// face shows it as a long streak. sharp is how glossy the face is.
float palTubeAt(vec3 A, vec3 B, vec3 n, float sharp){
  vec3 P = -vViewPosition, V = normalize(vViewPosition);
  vec3 R = reflect(-V, n);
  vec3 L0 = A - P, Ld = B - A;
  float rl = dot(R, Ld), dd = dot(Ld, Ld);
  float t = clamp((dot(R, L0) * rl - dot(L0, Ld)) / max(dd - rl * rl, 1e-6), 0.0, 1.0);
  vec3 L = normalize(L0 + Ld * t);
  float a = max(dot(R, L), 0.0);
  float fr = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
  return pow(a, sharp) * (0.35 + 0.65 * fr) * step(0.0, dot(n, L));
}
float palTube(vec3 n, float sharp){ return uTubeK <= 0.0 ? 0.0 : palTubeAt(uTubeA, uTubeB, n, sharp) * uTubeK; }
// The room's two strip lights, mirrored the same way: for a finish that shows them sharp.
float palStrips(vec3 n, float sharp){ return uStripK <= 0.0 ? 0.0 : (palTubeAt(uStripA[0], uStripB[0], n, sharp) + 0.5 * palTubeAt(uStripA[1], uStripB[1], n, sharp)) * uStripK; }
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
// How brightly dab k burns now. Old paint, dried through, only smoulders.
float palDab(int k){
  float since = uTime - uLit;
  if (uGlow <= 0.001 || since < 0.0) return 0.0;
  float fk = float(k), at = PAL_DAB_AT[k], old = 1.0 - 0.72 * PAL_DAB_AGE[k];
  if (uStatic > 0.5) return 0.75 * uGlow * old;
  float up = smoothstep(at, at + 0.14, since);
  float flare = exp(-pow((since - at - 0.07) / 0.08, 2.0)) * 0.9;
  float breath = 0.68 + 0.17 * sin(uTime * (1.1 + 0.9 * palH(fk + 1.0)) + 6.28 * palH(fk + 2.0)) + 0.08 * sin(uTime * (2.9 + 1.7 * palH(fk + 3.0)) + 6.28 * palH(fk + 4.0));
  return (up * breath + flare + up * palBeat(fk, at)) * uGlow * old;
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
// The paint in a brush's hairs: lit from the tip, the light running up the hairs to the ferrule now and then.
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
// The light the lit paints lay on what is near them, on the faces turned toward them, falling off with distance as
// a light does. Strong on the wood round each dab, so the wood takes each paint's color.
vec3 palBounce(vec3 p, vec3 n, vec3 albedo){
  if (uGlow <= 0.001) return vec3(0.0);
  vec3 sum = vec3(0.0);
  for (int k = 0; k < ${N}; k++) {
    vec3 c = vec3(PAL_DAB[k].x, PAL_DAB_H[k], PAL_DAB[k].y);
    vec3 d = c - p;
    float l = length(d);
    float reach = max(l - PAL_DAB[k].z, 0.0);
    float face = 0.2 + 0.8 * max(dot(n, d / max(l, 1e-3)), 0.0);
    float fall = exp(-reach / 9.0) * 0.8 + 0.2 * exp(-reach / 30.0);
    sum += palGlowCol(PAL_DAB_PAINT[k]) * palDab(k) * fall * face;
  }
  float mixAvg = 0.0;
  for (int s = 0; s < ${S}; s++) mixAvg += palStroke(s, 0.5);
  vec2 dm = (p.xz - PAL_MIX) / vec2(46.0, 34.0);
  float dmix = max(length(dm) - 1.0, 0.0) * 40.0;
  sum += ${mixC(C('flame'), C('hot'), 0.5)} * mixAvg * 0.3 * exp(-dmix / 9.0) * (0.25 + 0.75 * max(n.y, 0.0));
  vec3 db = PAL_BEAD - p;
  float lb = length(db);
  sum += ${C('hot')} * palHair(0.0) * exp(-max(lb - 3.0, 0.0) / 7.0) * (0.25 + 0.75 * max(dot(n, db / max(lb, 1e-3)), 0.0));
  return min(sum, vec3(1.6)) * (0.3 + 0.7 * albedo) * 1.1;
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
