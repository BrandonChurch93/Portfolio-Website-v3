import * as THREE from 'three';
import { hex } from '../../config/palette';
import { lin } from '../../world/surface';
import { METAL } from '../world/light';
import { BALANCE, DEG, DIAL, MOV, NUMERALS, SECONDS, VIEW } from './layout';

// What every material of the watch shares. Each vertex carries its finish (cell.x), a number of its own (cell.y: how
// far along the hairspring it is) and its part (cell.w). A small float texture holds each part's transform, heat,
// fold and the stream's light on it for this frame, so the whole watch moves and runs part by part from a few draw
// calls, and every finish is one program.

export const FIN = {
  bronze: 0, copper: 1, gold: 2, dial: 3, steel: 4, bridge: 5, plate: 6, jewel: 7, inner: 8, sub: 9, spring: 10, plaque: 11, chapter: 12, wheel: 13, hand: 14, dark: 15,
} as const;
export type Fin = (typeof FIN)[keyof typeof FIN];

export interface Shared {
  uParts: { value: THREE.DataTexture };
  uArt: { value: THREE.Texture };
  uTime: { value: number };
  uGlow: { value: number };
  uLit: { value: number };
  uStatic: { value: number };
  uBand: { value: THREE.Vector4 };
  uBandOn: { value: number };
  uEye: { value: THREE.Vector3 };
  uRim: { value: THREE.Vector4 };
  // The balance's angle, which winds and unwinds the hairspring.
  uSpring: { value: number };
  // The jewels: where each burns (in millimetres) and how brightly.
  uJewels: { value: THREE.Vector4[] };
}

export const PARTS_MAX = 128;
export const PART_TEXELS = 5;
export const JEWEL_MAX = 8;
// The art sheet covers this much of the table, seen from above.
export const ART = { x0: -56, z0: -30, w: 112, d: 60 } as const;

export function shared(art: THREE.Texture): Shared {
  const tex = new THREE.DataTexture(new Float32Array(PART_TEXELS * PARTS_MAX * 4), PART_TEXELS, PARTS_MAX, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return {
    uParts: { value: tex }, uArt: { value: art }, uTime: { value: 0 }, uGlow: { value: 0 }, uLit: { value: -1e4 }, uStatic: { value: 0 },
    uBand: { value: new THREE.Vector4(0, 0, -1e5, 0) }, uBandOn: { value: 0 }, uEye: { value: new THREE.Vector3(0, 500, 0) }, uRim: { value: new THREE.Vector4(0, 1, 0, 0) },
    uSpring: { value: 0 }, uJewels: { value: Array.from({ length: JEWEL_MAX }, () => new THREE.Vector4()) },
  };
}

const f = (n: number) => n.toFixed(4);
const v2 = (x: number, z: number) => `vec2(${f(x)}, ${f(z)})`;
const BAL = v2(BALANCE.c[0] + MOV.x, BALANCE.c[1] + MOV.z);
const DC = v2(DIAL.x, DIAL.z);
const MC = v2(MOV.x, MOV.z);
const SUBC = v2(DIAL.x + SECONDS.c[0], DIAL.z + SECONDS.c[1]);
const C = (n: Parameters<typeof hex>[0]) => lin(hex(n));
const G = METAL.gold;
const GOLD = `vec3(${f(G.r)}, ${f(G.g)}, ${f(G.b)})`;
// The Geneva stripes run across the whole movement at an angle, so they cross every bridge as one.
const STRIPE = { w: 1.65, a: (VIEW.az + 62) * DEG } as const;

export const VHEAD = /* glsl */ `
attribute vec4 cell;
uniform highp sampler2D uParts;
uniform float uSpring;
varying vec3 vWatP;
varying vec3 vWatN;
varying vec3 vWatR;
varying vec3 vWatRN;
varying vec3 vWatAx;
varying vec3 vWatAz;
varying float vWatMat;
varying float vWatHeat;
varying float vWatLight;
float watVh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float watVn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(watVh(i), watVh(i + vec3(1,0,0)), f.x), mix(watVh(i + vec3(0,1,0)), watVh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(watVh(i + vec3(0,0,1)), watVh(i + vec3(1,0,1)), f.x), mix(watVh(i + vec3(0,1,1)), watVh(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 watCrumple(vec3 p){ p *= 0.9; return vec3(watVn(p), watVn(p + 17.1), watVn(p + 31.7)) * 2.0 - 1.0; }
vec3 watSpring(vec3 p, float s){
  float a = uSpring * (1.0 - s);
  vec2 c = ${BAL};
  vec2 d = p.xz - c;
  float cs = cos(a), sn = sin(a);
  return vec3(c.x + cs * d.x - sn * d.y, p.y, c.y + sn * d.x + cs * d.y);
}`;

const MOVE = /* glsl */ `
  int watI = int(cell.w + 0.5);
  vec4 watR0 = texelFetch(uParts, ivec2(0, watI), 0), watR1 = texelFetch(uParts, ivec2(1, watI), 0), watR2 = texelFetch(uParts, ivec2(2, watI), 0);
  vec4 watT3 = texelFetch(uParts, ivec2(3, watI), 0), watT4 = texelFetch(uParts, ivec2(4, watI), 0);
  vec3 watQ = transformed;
  vWatR = watQ;
  vWatMat = cell.x;
  if (abs(cell.x - ${FIN.spring.toFixed(1)}) < 0.5) watQ = watSpring(watQ, cell.y);
  if (watT3.y < 0.999) {
    float o = watT3.y;
    watQ = watT4.xyz + (watQ - watT4.xyz) * mix(watT3.w, 1.0, o) + watCrumple(watQ) * watT3.z * (1.0 - o) * (1.0 - o);
  }
  transformed = vec3(dot(watR0.xyz, watQ) + watR0.w, dot(watR1.xyz, watQ) + watR1.w, dot(watR2.xyz, watQ) + watR2.w);
  vWatP = transformed;
  vWatHeat = watT3.x;
  vWatLight = watT4.w;`;

export const VERT = /* glsl */ `
{
${MOVE}
  vec3 watN = normalize(vec3(dot(watR0.xyz, objectNormal), dot(watR1.xyz, objectNormal), dot(watR2.xyz, objectNormal)) + 1e-6);
  vWatN = watN;
  vWatRN = objectNormal;
  vWatAx = normalize(normalMatrix * vec3(watR0.x, watR1.x, watR2.x) + 1e-6);
  vWatAz = normalize(normalMatrix * vec3(watR0.z, watR1.z, watR2.z) + 1e-6);
  #ifndef FLAT_SHADED
  vNormal = normalize(normalMatrix * watN);
  #endif
}`;

export const FHEAD = /* glsl */ `
uniform sampler2D uArt;
uniform float uTime, uGlow, uLit, uStatic, uBandOn;
uniform vec4 uBand, uRim;
uniform vec3 uEye;
uniform vec4 uJewels[${JEWEL_MAX}];
varying vec3 vWatP;
varying vec3 vWatN;
varying vec3 vWatR;
varying vec3 vWatRN;
varying vec3 vWatAx;
varying vec3 vWatAz;
varying float vWatMat;
varying float vWatHeat;
varying float vWatLight;
float watH(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float watN2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(watH(i), watH(i + vec2(1.0, 0.0)), f.x), mix(watH(i + vec2(0.0, 1.0)), watH(i + vec2(1.0, 1.0)), f.x), f.y); }
vec3 watRamp(float i){
  vec3 c = mix(${C('ember')}, ${C('flame')}, smoothstep(0.04, 0.42, i));
  c = mix(c, ${C('hot')}, smoothstep(0.42, 0.85, i));
  return mix(c, ${C('pale')}, smoothstep(0.95, 1.4, i));
}
vec2 watOnTable(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }
vec4 watArt(vec2 o){ return texture2D(uArt, (vWatR.xz + o - vec2(${f(-56)}, ${f(-30)})) / vec2(112.0, 60.0)); }
// How fine a pattern of this many millimetres a period can be drawn here, 1 where it is well over a pixel.
float watFine(float period){ float px = length(fwidth(vWatR.xz)) + 1e-5; return 1.0 - smoothstep(0.35, 0.9, px / period); }
float watCutA;
int watM;
float watUp;
float watBevel;
float watEng;
float watPr;
vec2 watTilt;
vec3 watCol;
float watRough;
float watMetal;
// The jewels' light on what is round them, low and soft, and the light under the balance on its underside.
vec3 watBounce(vec3 albedo){
  if (uGlow <= 0.001) return vec3(0.0);
  float s = 0.0;
  for (int i = 0; i < ${JEWEL_MAX}; i++) {
    vec4 j = uJewels[i];
    if (j.w <= 0.0) continue;
    vec3 d = vWatR - j.xyz;
    s += j.w * exp(-dot(d.xz, d.xz) / 16.0) * exp(-max(d.y, 0.0) / 1.2) * (0.35 + 0.65 * smoothstep(-0.3, 0.6, -d.y + 0.2));
  }
  vec2 b = vWatR.xz - ${BAL};
  float under = (1.0 - smoothstep(4.5, 7.0, length(b))) * smoothstep(0.0, 0.8, -vWatRN.y) * 0.5;
  s = min(s * 0.6 + under * uGlow, 1.0);
  return watRamp(s) * s * (0.3 + 0.7 * albedo) * 2.6;
}
vec3 watEdgeLight(){
  if (uBandOn < 0.5 || uBand.w <= 0.0) return vec3(0.0);
  float w = max(0.2, fwidth(watCutA) * 1.3);
  float line = exp(-pow(watCutA / w, 2.0)) * uBand.w;
  vec2 out2 = watOnTable(vWatP) - uBand.xy;
  vec3 toLine = normalize(vec3(out2.x, 0.0, out2.y) / max(length(out2), 1e-3) + vec3(0.0, 0.55, 0.0));
  float facing = max(dot(normalize(vWatN), toLine), 0.0);
  float trail = exp(-watCutA / 3.0) * smoothstep(0.0, 1.5, watCutA / w) * uBand.w * facing * facing * 1.6;
  return mix(${C('hot')}, ${C('pale')}, 0.6 * uBand.w) * line * 6.0 + watRamp(trail) * trail * 4.0;
}
vec3 watHeatLight(){
  if (vWatHeat <= 0.001) return vec3(0.0);
  float side = smoothstep(0.55, 0.95, 1.0 - abs(vWatN.y));
  return watRamp(vWatHeat) * vWatHeat * 2.2 * (0.3 + 0.7 * side);
}
vec3 watRimLight(vec3 n, vec3 v){
  if (uRim.w <= 0.0) return vec3(0.0);
  float graze = 1.0 - clamp(dot(n, v), 0.0, 1.0);
  float toward = clamp(dot(n, uRim.xyz), 0.0, 1.0);
  return ${C('pale')} * pow(graze, 7.0) * pow(toward, 2.0) * uRim.w;
}
// The finish of every part, worked out from its own coordinates.
void watFinish(){
  watM = int(vWatMat + 0.5);
  vec3 n = normalize(vWatRN);
  watUp = smoothstep(0.96, 0.995, n.y);
  watBevel = smoothstep(0.08, 0.3, abs(n.y)) * (1.0 - smoothstep(0.9, 0.985, abs(n.y)));
  watTilt = vec2(0.0);
  watEng = 0.0;
  watPr = 0.0;
  vec2 p = vWatR.xz;
  float tarn = smoothstep(0.5, 0.8, watN2(p * 0.12 + vWatR.y * 0.3 + 3.0));
  if (watM == ${FIN.bronze} || watM == ${FIN.inner}) {
    watCol = ${C('bronze')} * (0.92 + 0.12 * watN2(p * 0.7)) * (1.0 - 0.3 * tarn);
    watRough = watM == ${FIN.inner} ? 0.12 : 0.24 + 0.12 * tarn;
    watMetal = 1.0;
    if (watM == ${FIN.bronze}) {
      // Turned on the lathe: fine rings round the case's own middle.
      float rc = min(length(p - ${DC}), length(p - ${MC}));
      watRough += 0.07 * watFine(0.08) * (watN2(vec2(rc * 9.0, vWatR.y * 3.0)) - 0.5);
    }
  } else if (watM == ${FIN.copper}) {
    watCol = ${C('copper')} * (1.0 - 0.18 * tarn);
    watRough = 0.16 + 0.1 * tarn;
    watMetal = 1.0;
  } else if (watM == ${FIN.gold} || watM == ${FIN.wheel} || watM == ${FIN.plaque} || watM == ${FIN.chapter}) {
    watCol = ${GOLD} * 0.92;
    watRough = watM == ${FIN.wheel} ? 0.2 : 0.1;
    watMetal = 1.0;
    if (watM == ${FIN.wheel} && watUp > 0.5) {
      // A wheel's faces are grained, so a wheel throws a light that turns with it.
      float g = watFine(0.05) * (watN2(p * 22.0) - 0.5);
      watRough = clamp(watRough + 0.1 * g, 0.05, 1.0);
    }
    if (watBevel > 0.5) watRough = 0.05;
  } else if (watM == ${FIN.dial}) {
    watCol = mix(${GOLD}, ${C('copper-light')}, 0.3);
    watRough = 0.2;
    watMetal = 1.0;
    vec2 d = p - ${DC};
    float r = length(d);
    vec2 dir = d / max(r, 1e-3);
    float a = atan(d.y, d.x);
    if (r < ${f(NUMERALS.r0 - 0.35)}) {
      // Engine turned in rings: each ring waves twelve times round, as a rose engine cuts it.
      float ph = r / 0.3 + 0.11 * sin(a * 12.0) * smoothstep(1.2, 4.0, r);
      float k = watFine(0.3);
      watTilt = dir * 0.3 * sin(ph * 6.2832) * k;
      watRough = 0.16 + 0.06 * (1.0 - k);
      watCol *= 0.97 + 0.05 * cos(ph * 6.2832) * k;
    } else {
      float k = watFine(0.05);
      watTilt = vec2(-dir.y, dir.x) * 0.04 * (watN2(vec2(a * 300.0, r * 2.0)) - 0.5) * k;
      watRough = 0.24;
    }
  } else if (watM == ${FIN.sub}) {
    watCol = ${GOLD} * 0.8;
    vec2 d = p - ${SUBC};
    float r = length(d);
    float k = watFine(0.14);
    watTilt = d / max(r, 1e-3) * 0.25 * sin(r / 0.14 * 6.2832) * k;
    watRough = 0.18;
    watMetal = 1.0;
  } else if (watM == ${FIN.steel} || watM == ${FIN.hand} || watM == ${FIN.spring} || watM == ${FIN.dark}) {
    // Steel in the site's dark, polished: a dark face that mirrors little, and its bevels polished bright.
    watCol = vec3(0.075, 0.07, 0.066);
    watRough = watM == ${FIN.dark} ? 0.4 : 0.14;
    watMetal = 1.0;
    if (watBevel > 0.3 || (watM == ${FIN.steel} && watUp < 0.5)) { watCol = vec3(0.42, 0.4, 0.38); watRough = 0.07; }
    if (watM == ${FIN.spring}) { watCol = vec3(0.12, 0.11, 0.1); watRough = 0.2; }
  } else if (watM == ${FIN.bridge}) {
    watCol = vec3(0.085, 0.08, 0.076);
    watRough = 0.3;
    watMetal = 1.0;
    if (watUp > 0.5) {
      // Geneva stripes: each a low rounded band, ground along its length.
      vec2 ax = vec2(${f(Math.cos(STRIPE.a))}, ${f(Math.sin(STRIPE.a))});
      float s = dot(p - ${MC}, ax) / ${f(STRIPE.w)};
      float k = watFine(${f(STRIPE.w)});
      float fr = fract(s) - 0.5;
      watTilt = ax * fr * 0.5 * k;
      float along = dot(p, vec2(-ax.y, ax.x));
      watRough = 0.2 + 0.12 * watFine(0.04) * (watN2(vec2(along * 1.5, s * 60.0)) - 0.5) + 0.06 * abs(fr) * 2.0;
      watCol *= 0.95 + 0.08 * (1.0 - abs(fr) * 2.0);
    } else if (watBevel > 0.3) { watCol = vec3(0.46, 0.43, 0.4); watRough = 0.06; }
  } else if (watM == ${FIN.plate}) {
    watCol = vec3(0.05, 0.047, 0.044);
    watRough = 0.5;
    watMetal = 1.0;
    if (watUp > 0.5) {
      // Perlage: overlapping circles, each ground in a shallow dish, laid in rows from the middle out.
      vec2 q = (p - ${MC}) / 0.95;
      vec2 cBest = vec2(0.0); float best = -1e9;
      vec2 g0 = floor(q);
      for (int j = -1; j <= 2; j++) for (int i = -1; i <= 2; i++) {
        vec2 g = g0 + vec2(float(i), float(j));
        vec2 c = g + vec2(mod(g.y, 2.0) * 0.5, 0.0);
        float order = g.y * 1000.0 + g.x;
        if (length(q - c) < 0.95 && order > best) { best = order; cBest = c; }
      }
      vec2 d = q - cBest;
      float k = 1.0 - smoothstep(0.08, 0.3, (length(fwidth(vWatR.xz)) + 1e-5) / 0.95);
      float rr = length(d);
      watTilt = (d / max(rr, 1e-3)) * (0.03 + 0.1 * rr) * k + vec2(-d.y, d.x) * 0.06 * sin(rr * 40.0) * watFine(0.06);
      watRough = 0.38 + 0.12 * rr;
      watCol *= 0.92 + 0.12 * (1.0 - rr);
    }
  } else if (watM == ${FIN.jewel}) {
    watCol = ${C('ember')} * 0.9;
    watRough = 0.06;
    watMetal = 0.0;
  }
  if (watM == ${FIN.bridge} || watM == ${FIN.inner} || watM == ${FIN.plaque} || watM == ${FIN.dial} || watM == ${FIN.chapter} || watM == ${FIN.sub} || watM == ${FIN.plate}) {
    if (watUp > 0.5) {
      vec4 art = watArt(vec2(0.0));
      watEng = art.r;
      watPr = art.g;
    }
  }
  if (watEng > 0.0) {
    watCol = mix(watCol, watCol * 0.28, watEng);
    watRough = mix(watRough, 0.55, watEng);
    float e = 0.04;
    float gx = watArt(vec2(e, 0.0)).r - watArt(vec2(-e, 0.0)).r, gz = watArt(vec2(0.0, e)).r - watArt(vec2(0.0, -e)).r;
    watTilt += vec2(gx, gz) * 0.6;
  }
  if (watPr > 0.0) {
    watCol = mix(watCol, vec3(0.03, 0.026, 0.024), watPr);
    watRough = mix(watRough, 0.45, watPr);
    watMetal = mix(watMetal, 0.0, watPr);
  }
}`;

export const CUT = /* glsl */ `
  watCutA = uBand.z - length(watOnTable(vWatP) - uBand.xy);
  if (uBandOn > 0.5 && watCutA < 0.0) discard;`;

const COLOR = /* glsl */ `
${CUT}
  watFinish();
  diffuseColor.rgb = watCol;`;

const ROUGH = 'roughnessFactor = clamp(watRough, 0.04, 1.0);';
const METALNESS = 'metalnessFactor = watMetal;';
const NORMAL = 'if (dot(watTilt, watTilt) > 0.0) normal = normalize(normal + (watTilt.x * vWatAx + watTilt.y * vWatAz));';
const EMISSIVE = /* glsl */ `
  totalEmissiveRadiance += watHeatLight() + watEdgeLight() + watRimLight(normal, normalize(vViewPosition)) + watBounce(diffuseColor.rgb);
  if (watM == ${FIN.jewel}) {
    float s = 0.0;
    for (int i = 0; i < ${JEWEL_MAX}; i++) { vec3 d = vWatR - uJewels[i].xyz; s += uJewels[i].w * exp(-dot(d, d) / 0.9); }
    float g = 0.1 + s;
    totalEmissiveRadiance += watRamp(0.25 + 0.75 * min(g, 1.3)) * g * (0.5 + 0.5 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 1.5)) * 4.0;
  }
  // The stream's light in a part runs along its edges, the flanks of its teeth and its bevels, and never washes
  // its faces one color.
  if (vWatLight > 0.001 && (watM == ${FIN.wheel} || watM == ${FIN.gold} || watM == ${FIN.hand})) {
    float side = smoothstep(0.3, 0.9, 1.0 - abs(normalize(vWatRN).y));
    float g = vWatLight;
    totalEmissiveRadiance += watRamp(g) * g * (0.1 + 1.2 * side + 0.8 * watBevel) * 3.4;
  }`;

// Joins the watch's chunks to a standard material: the part's move in the vertex shader, its finish in the fragment.
export function watchMaterial(m: THREE.MeshPhysicalMaterial, u: Shared, key: string): THREE.MeshPhysicalMaterial {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VHEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${FHEAD}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${COLOR}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${ROUGH}`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${METALNESS}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${NORMAL}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${EMISSIVE}`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}

// The crystal: only what it mirrors, laid over what is under it.
export function glassMaterial(m: THREE.MeshPhysicalMaterial, u: Shared): THREE.MeshPhysicalMaterial {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VHEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uBandOn;\nuniform vec4 uBand;\nuniform vec3 uEye;\nvarying vec3 vWatP;\nfloat watCutA;\nvec2 watOnTable(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${CUT}`);
  };
  m.customProgramCacheKey = () => 'watch-glass';
  return m;
}

// Shadows are drawn from where each part is now, and nothing the band has not reached casts one.
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
varying vec3 vWatP;
float watCutA;
vec2 watOnTable(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${CUT}`);
  };
  m.customProgramCacheKey = () => 'watch-depth';
  return m;
}
