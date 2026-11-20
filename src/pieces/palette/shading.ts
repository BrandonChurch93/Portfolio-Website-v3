import * as THREE from 'three';
import { hex, type PaletteName } from '../../config/palette';
import { lin, type Chunks } from '../../world/surface';
import { coil } from './coil';
import { BRUSH, DABS, KNIFE, STEPS, SWATCHES, brushAxis, knifeAxis } from './layout';

// What every material of the piece shares, as the CPU's do (src/pieces/cpu/shading.ts): each part's vertices carry
// its number in the cell attribute's w, and a small float texture holds each part's transform, heat and fold for this
// frame, so the whole piece moves part by part from a few draw calls. A part that comes home as a shard is drawn
// folded, its own faces crumpled into the shard. The band's cut is made along the eye's rays to the board's top.
//
// The cursor's light is mirrored as a long tube (palTube), so on the varnish, the wet paint and the metal its
// reflection is a streak that slides with the cursor, as the CPU's lid answers it. The light the stream wakes is the
// paints': each step of the scale lights from inside in its own color, one after another along the arc, the light runs
// down each swatch and up the loaded hairs, and every lit paint lays a tight pool of its light on the wood beside it.

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
  uSit: { value: Float32Array };
  uTools: { value: THREE.Vector3 };
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
    uSit: { value: new Float32Array(DABS.length).fill(1) }, uTools: { value: new THREE.Vector3(1, 1, 1) },
  };
}

// What a paint is, by its number in the cell attribute's x: the dabs by their step, then the rest.
export const PAINT = { mix: 20, hot: 21, knife: 22, pool: 23 } as const;
// The board's art layer (./art.ts) covers this much of the board, centred, in millimetres.
export const ART_MM = { w: 304, h: 224 } as const;
const C = (n: PaletteName) => lin(hex(n));
const mixC = (a: string, b: string, k: number) => `mix(${a}, ${b}, ${k.toFixed(3)})`;
// Each step's paint, mixed from two of the site's colors in their own sRGB, as a painter mixes them.
export const stepColor = (k: number) => { const s = STEPS[k]; return new THREE.Color(hex(s.a as PaletteName)).lerp(new THREE.Color(hex(s.b as PaletteName)), s.k).multiplyScalar(s.v); };
const ALBEDO = STEPS.map((_, k) => lin(stepColor(k).getHex()));
// The light each step gives when it is lit: its own color brought up to a light. The dark steps, which are nearly
// black as paint, burn as embers of their own hue.
const GLOW = [
  `${C('ember')} * 2.0`,
  mixC(C('ember'), C('flame'), 0.1) + ' * 2.6',
  mixC(C('ember'), C('flame'), 0.3) + ' * 1.5',
  mixC(C('ember'), C('flame'), 0.62) + ' * 1.15',
  mixC(C('copper'), C('flame'), 0.3),
  mixC(C('flame'), C('hot'), 0.45),
  mixC(C('hot'), C('copper-light'), 0.4),
  mixC(C('hot'), C('pale'), 0.55) + ' * 0.95',
  `${C('pale')} * 0.88`,
];
const N = DABS.length, S = SWATCHES.length;
// When each dab comes on after the lights, in seconds: one after another along the arc from the strike, the steps a
// little uneven so it reads as a hand lighting them and not a meter.
const DAB_AT = DABS.map((_, k) => (0.04 + k * 0.105 + 0.018 * Math.sin(k * 2.7 + 1)).toFixed(3));
const SWATCH_AT = SWATCHES.map((_, k) => 1.05 + k * 0.12 + 0.03 * Math.sin(k * 1.9));
// The loaded tip of the brush comes on last.
export const HAIR_AT = 1.6;
// How far the pool a lit dab lays on the wood reaches past its foot, in millimetres.
const GLOW_POOL = 4.2;
const v3 = (a: number, b: number, c: number) => `vec3(${a.toFixed(2)}, ${b.toFixed(2)}, ${c.toFixed(2)})`;
const DAB_LIST = DABS.map((d) => v3(d.x, d.z, d.r)).join(', ');
const DAB_H = DABS.map((d) => (d.h * 0.45).toFixed(2)).join(', ');
const BEAD = brushAxis(-1.5);
// Each dab's foot, as far as its paint reaches, at eight angles round it, so the shadow it sits in follows its own
// outline.
const FOOT_N = 8;
const FOOT = DABS.flatMap((d) => { const c = coil(d); return Array.from({ length: FOOT_N }, (_, i) => c.reach((i / FOOT_N) * Math.PI * 2).toFixed(2)); });
const SW = SWATCHES.map((w) => { const a = (w.dir * Math.PI) / 180; return `vec4(${w.at[0].toFixed(2)}, ${w.at[1].toFixed(2)}, ${Math.cos(a).toFixed(4)}, ${Math.sin(a).toFixed(4)})`; });

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
const float PAL_DAB_AT[${N}] = float[${N}](${DAB_AT.join(', ')});
const float PAL_FOOT[${N * FOOT_N}] = float[${N * FOOT_N}](${FOOT.join(', ')});
float palFoot(int k, float a){
  float f = fract(a / 6.2831853) * ${FOOT_N.toFixed(1)};
  int i = int(floor(f));
  return mix(PAL_FOOT[k * ${FOOT_N} + i], PAL_FOOT[k * ${FOOT_N} + (i + 1) % ${FOOT_N}], fract(f));
}
// The crisp shadow each dab sits in on the wood, close round its own foot, as much as the dab is there.
uniform float uSit[${N}];
uniform vec3 uTools;
float palSitAt(vec2 p){
  float s = 0.0;
  for (int k = 0; k < ${N}; k++) {
    vec2 d = p - PAL_DAB[k].xy;
    float l = length(d);
    if (l > PAL_DAB[k].z * 1.4 + 4.0 || uSit[k] <= 0.0) continue;
    float o = l - palFoot(k, atan(d.y, d.x));
    s = max(s, exp(-max(o, 0.0) / 0.7) * step(-0.6, o) * uSit[k]);
  }
  return s;
}
const vec4 PAL_SW[${S}] = vec4[${S}](${SW.join(', ')});
const float PAL_SW_LEN[${S}] = float[${S}](${SWATCHES.map((w) => w.len.toFixed(2)).join(', ')});
const float PAL_SW_HALF[${S}] = float[${S}](${SWATCHES.map((w) => (w.w / 2).toFixed(2)).join(', ')});
const float PAL_SW_AT[${S}] = float[${S}](${SWATCH_AT.map((v) => v.toFixed(3)).join(', ')});
const vec3 PAL_BEAD = vec3(${BEAD[0].toFixed(2)}, ${(BRUSH.bead.h * 0.5).toFixed(2)}, ${BEAD[1].toFixed(2)});
// Where a point lies in swatch s: along it from where the blade set down, and across it from its middle.
vec2 palInSwatch(int s, vec2 p){ vec4 q = PAL_SW[s]; vec2 d = p - q.xy; return vec2(dot(d, q.zw), dot(d, vec2(-q.w, q.z))); }
vec3 palAlbedo(int k){
  ${ALBEDO.map((a, i) => `if (k == ${i}) return ${a};`).join('\n  ')}
  return ${ALBEDO[5]};
}
vec3 palGlowCol(int k){
  ${GLOW.map((g, i) => `if (k == ${i}) return ${g};`).join('\n  ')}
  return ${GLOW[5]};
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
  // exp of the half squared distance between the two ways is pow(cos, sharp), kept exact at the sharpness of a
  // varnish, where 1 - cos is under a float's step.
  vec3 dv = R - L;
  float fr = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
  // Never narrower than a pixel's step, so a small glint on a small curved thing lands on a pixel and is not lost
  // between them, and a long one does not break into beads.
  float w = max(length(fwidth(dv)), 1e-5), k = min(sharp, 2.5 / (w * w));
  return exp(-k * 0.5 * dot(dv, dv)) * pow(k / sharp, 0.25) * step(0.0, dot(R, L)) * (0.35 + 0.65 * fr) * step(0.0, dot(n, L));
}
float palTube(vec3 n, float sharp){ return uTubeK <= 0.0 ? 0.0 : palTubeAt(uTubeA, uTubeB, n, sharp) * uTubeK; }
// A turned thing lying along the board, in view space: the brush's axis or the knife's.
vec3 palAxis(float a){ return normalize(cos(a) * vAxX + sin(a) * cross(vAxX, vAxY)); }
const float PAL_BRUSH_DIR = ${BRUSH.dir.toFixed(4)}, PAL_KNIFE_DIR = ${KNIFE.dir.toFixed(4)};
// The true normal of a turned thing at a point, from its own axis in the model, in view space: the mesh's normals are
// faceted finely enough for its shading but not for a line as thin as a lacquer's.
const vec3 PAL_BRUSH_A = ${v3(BRUSH.tip[0], BRUSH.lift, BRUSH.tip[1])}, PAL_BRUSH_B = ${v3(brushAxis(300)[0], BRUSH.lift, brushAxis(300)[1])};
const vec3 PAL_KNIFE_A = ${v3(knifeAxis(KNIFE.blade.len + KNIFE.neck.run)[0], KNIFE.neck.rise, knifeAxis(KNIFE.blade.len + KNIFE.neck.run)[1])}, PAL_KNIFE_B = ${v3(knifeAxis(KNIFE.blade.len + KNIFE.neck.run + KNIFE.bolster.len + KNIFE.handle.len)[0], (KNIFE.handle.t / 2) * 0.92, knifeAxis(KNIFE.blade.len + KNIFE.neck.run + KNIFE.bolster.len + KNIFE.handle.len)[1])};
vec3 palTurnedN(bool brush){
  vec3 a = brush ? PAL_BRUSH_A : PAL_KNIFE_A, b = brush ? PAL_BRUSH_B : PAL_KNIFE_B, e = b - a;
  vec3 q = vObj - a - e * clamp(dot(vObj - a, e) / dot(e, e), 0.0, 1.0);
  float l = length(q);
  if (l < 1e-4) return normalize(vAxY);
  q /= l;
  return normalize(q.x * vAxX + q.y * vAxY + q.z * cross(vAxX, vAxY));
}
// The room's long light as a turned, polished thing mirrors it: a line down its whole length, at the angle round it
// where it mirrors a light above that leans toward the cursor, so the line slides round the thing as the cursor moves.
// It is worked out across the axis only, so it runs the length of the thing unbroken.
float palLine(vec3 n, vec3 axis, float sharp){
  vec3 V = normalize(vViewPosition);
  vec3 R = reflect(-V, n);
  vec3 Lc = 0.5 * (uTubeA + uTubeB) + vViewPosition;
  vec3 L = normalize(normalize(vAxY) + Lc / max(length(Lc), 1e-4) * 0.5 + V * 0.9);
  vec3 Rp = R - axis * dot(R, axis), Lp = L - axis * dot(L, axis);
  float rl = length(Rp), ll = length(Lp);
  if (rl < 1e-4 || ll < 1e-4) return 0.0;
  // Where the line would be thinner than a pixel it is widened to one and dimmed to match, so it never breaks into beads.
  // In the angle off the line, the lobe is a Gaussian of width 1 / sqrt(sharp). It is never let be narrower than a
  // pixel's step in that angle, or a slanting line falls between pixels and breaks into dashes.
  float ang = atan(dot(cross(Lp / ll, Rp / rl), axis), dot(Rp / rl, Lp / ll)), w = max(fwidth(ang), 1e-5);
  float k = min(sharp, 2.5 / (w * w));
  return exp(-0.5 * k * ang * ang) * pow(k / sharp, 0.2) * smoothstep(0.0, 0.4, dot(Rp / rl, Lp / ll));
}
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
  float fk = float(k), at = PAL_DAB_AT[k], old = 1.0;
  if (uStatic > 0.5) return 0.75 * uGlow;
  float up = smoothstep(at, at + 0.07, since);
  float flare = exp(-pow((since - at - 0.06) / 0.07, 2.0)) * 1.1;
  float breath = 0.68 + 0.17 * sin(uTime * (1.1 + 0.9 * palH(fk + 1.0)) + 6.28 * palH(fk + 2.0)) + 0.08 * sin(uTime * (2.9 + 1.7 * palH(fk + 3.0)) + 6.28 * palH(fk + 4.0));
  return (up * breath + flare + up * palBeat(fk, at)) * uGlow * old;
}
// The light in swatch s at d of the way along it from where the blade set down: it runs down the swatch once when
// the swatch comes on, then settles to a steady light with a crest now and then, each swatch at its own pace.
float palSwatchLit(int s, float d){
  float since = uTime - uLit;
  if (uGlow <= 0.001 || since < 0.0) return 0.0;
  float fs = float(s), at = PAL_SW_AT[s];
  if (uStatic > 0.5) return 0.5 * uGlow;
  float run = (since - at) * 3.2 - d;
  float base = 0.42 * smoothstep(-0.05, 0.15, run);
  float sum = run > -0.05 ? exp(-pow(run / 0.12, 2.0)) * 1.1 : 0.0;
  float rate = 0.3 + 0.2 * palH(fs * 3.1 + 1.0), ph = palH(fs * 7.7) * 5.0;
  float k0 = floor(uTime * rate + ph);
  for (int j = 0; j < 2; j++) {
    float k = k0 - float(j), key = k * 1.618 + fs * 13.0;
    float t0 = (k + 0.5 * palH(key) - ph) / rate;
    if (t0 < uLit + at + 0.8 || palH(key + 2.5) < 0.3) continue;
    float y = (uTime - t0) * 1.6 - d;
    sum += y > -0.05 ? exp(-pow(y / 0.13, 2.0)) * (0.35 + 0.35 * palH(key + 1.5)) : 0.0;
  }
  return (base + sum) * uGlow;
}
// The paint in a brush's hairs: lit from the tip, the light running up the hairs to the ferrule now and then.
float palHair(float s){
  float since = uTime - uLit - ${HAIR_AT.toFixed(2)};
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
// The light the lit paints lay on what is near them, on the faces turned toward them, falling off fast as a small
// light's does: a tight pool of each dab's own color on the wood round it, and on the side of anything beside it.
int palSelf = -1;
vec3 palBounce(vec3 p, vec3 n, vec3 albedo){
  if (uGlow <= 0.001) return vec3(0.0);
  vec3 sum = vec3(0.0);
  for (int k = 0; k < ${N}; k++) {
    if (k == palSelf) continue;
    vec3 c = vec3(PAL_DAB[k].x, PAL_DAB_H[k], PAL_DAB[k].y);
    vec3 d = c - p;
    float l = length(d);
    if (l > PAL_DAB[k].z + 18.0) continue;
    float reach = max(length(d.xz) - PAL_DAB[k].z * 0.92, 0.0);
    float face = 0.25 + 0.75 * max(dot(n, d / max(l, 1e-3)), 0.0);
    sum += palGlowCol(k) * palDab(k) * exp(-reach / ${GLOW_POOL.toFixed(2)}) * face * 2.4;
  }
  for (int s = 0; s < ${S}; s++) {
    vec2 q = palInSwatch(s, p.xz);
    vec2 out2 = max(abs(q - vec2(PAL_SW_LEN[s] * 0.5, 0.0)) - vec2(PAL_SW_LEN[s] * 0.5, PAL_SW_HALF[s]), 0.0);
    float reach = length(out2);
    if (reach > 8.0 || palSelf == 100 + s) continue;
    sum += ${mixC(C('flame'), C('hot'), 0.5)} * palSwatchLit(s, clamp(q.x / PAL_SW_LEN[s], 0.0, 1.0)) * 0.55 * exp(-reach / 1.8) * (0.25 + 0.75 * max(n.y, 0.0));
  }
  vec3 db = PAL_BEAD - p;
  float lb = length(db);
  sum += ${C('hot')} * palHair(0.0) * exp(-max(lb - 3.0, 0.0) / 3.5) * (0.25 + 0.75 * max(dot(n, db / max(lb, 1e-3)), 0.0));
  return min(sum, vec3(2.5)) * (0.3 + 0.7 * albedo) * 1.1;
}
// A crisp edge caught by the lights, as every part of the CPU has: m is where the edge is, 0 to 1. It is drawn the way
// a thin chamfer or a rolled lip takes light: brightest where it faces the cursor's light or the light behind, and
// never quite dark, so it runs all the way round.
vec3 palEdgeLit(vec3 n, float m){
  if (m <= 0.001) return vec3(0.0);
  vec3 P = -vViewPosition, V = normalize(vViewPosition);
  vec3 Lp = 0.5 * (uTubeA + uTubeB) - P;
  vec3 H = normalize(Lp / max(length(Lp), 1e-5) + V);
  float lamp = pow(max(dot(n, H), 0.0), 16.0) * uTubeK;
  float back = pow(max(dot(n, uRim.xyz), 0.0), 1.5) * min(uRim.w, 1.0);
  float room = min(uRim.w, 1.0);
  return mix(${C('hot')}, ${C('pale')}, 0.32) * m * (0.16 * room + 0.9 * lamp + 0.4 * back);
}
// Where an edge is, worked out from how fast the surface turns: a lip, a crimp, a rivet's edge, a bevel. It fades as
// the edge thins under a pixel rather than breaking up.
float palCurveEdge(vec3 nObj, vec3 pObj, float lo, float hi){
  float c = length(fwidth(nObj)) / max(length(fwidth(pObj)), 1e-4);
  return smoothstep(lo, hi, c);
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
  // Where the edge is seen so nearly edge on that its light changes faster than a pixel can hold, it would be drawn as
  // a bead at every step of the outline: there it fades instead.
  float thin = 1.0 - smoothstep(0.12, 0.4, fwidth(pow(graze, 6.0)));
  return ${C('pale')} * pow(graze, 6.0) * pow(toward, 2.0) * uRim.w * thin;
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
