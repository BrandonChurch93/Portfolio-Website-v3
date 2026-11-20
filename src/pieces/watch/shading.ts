import * as THREE from 'three';
import { hex } from '../../config/palette';
import { lin } from '../../world/surface';
import { METAL } from '../world/light';
import { BALANCE, BODY, CARTOUCHE, DEG, DIAL, MOV, SECONDS, SUNK, VIEW } from './layout';

// What every material of the watch shares. Each vertex carries its finish (cell.x), a number of its own (cell.y: how
// far along the hairspring it is) and its part (cell.w). A small float texture holds each part's transform, heat,
// fold and the stream's light on it for this frame, so the whole watch moves and runs part by part from a few draw
// calls, and every finish is one program.

export const FIN = {
  bronze: 0, polish: 1, gold: 2, dial: 3, steel: 4, bridge: 5, plate: 6, jewel: 7, inner: 8, sub: 9, spring: 10, plaque: 11, chapter: 12, wheel: 13, hand: 14, dark: 15, sun: 16, numeral: 17,
} as const;
export type Fin = (typeof FIN)[keyof typeof FIN];

export interface Shared {
  uParts: { value: THREE.DataTexture };
  uArt: { value: THREE.Texture };
  uCart: { value: THREE.Texture };
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
// Three rows of transform, heat and fold, the fold's middle with the stream's light, and the arbor a part turns on
// with where the light stands round it.
export const PART_TEXELS = 6;
export const JEWEL_MAX = 8;
// The art sheet covers this much of the table, seen from above.
export const ART = { x0: -56, z0: -30, w: 112, d: 60 } as const;
// The cartouche has a sheet of its own, finer, so its lettering stays cut and sharp close up.
export const CART = { x0: DIAL.x + CARTOUCHE.c[0] - CARTOUCHE.w / 2, z0: DIAL.z + CARTOUCHE.c[1] - CARTOUCHE.d / 2, w: CARTOUCHE.w, d: CARTOUCHE.d, px: 120 } as const;
// Perlage: spots this far apart in offset rows, each this large, so each overlaps the last.
const PERL = { step: 0.95, r: 0.66 } as const;
const FLASH = 0.22;

export function shared(art: THREE.Texture, cart: THREE.Texture): Shared {
  const tex = new THREE.DataTexture(new Float32Array(PART_TEXELS * PARTS_MAX * 4), PART_TEXELS, PARTS_MAX, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return {
    uParts: { value: tex }, uArt: { value: art }, uCart: { value: cart }, uTime: { value: 0 }, uGlow: { value: 0 }, uLit: { value: -1e4 }, uStatic: { value: 0 },
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
const STRIPE = { w: 2.4, a: (VIEW.az + 62) * DEG } as const;

// A modern dark movement in an antique case, in three values on purpose. Most of what is seen is a blackened steel,
// near black and neutral beside the gold: the dial's ground, the plate, the bridges. It is drawn by its finishing and
// by the polished bevels on its edges, never by being lit orange. The gold is the accent: the train, the balance, the
// chatons, the hands, the numerals, the crown and the bezel's coin edge. The case is a browner, darker bronze.
const PALE_GOLD = `mix(${GOLD}, ${C('pale')}, 0.18)`;
const RED_GOLD = `mix(${GOLD}, ${C('copper')}, 0.5)`;
const BLACK = `${C('text')} * 0.05`;
const STEEL = `${C('text')} * 0.07`;
// A polished steel bevel: a pale neutral that mirrors the room, so toward a light it is one thin pale line.
const POLISH = `${C('text')} * 0.62`;
const CREAM = `${C('text-2')} * 0.62`;
const BRONZE = `mix(mix(${C('bronze')}, ${C('bronze-deep')}, 0.3), ${C('text')} * 0.16, 0.3)`;
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
varying vec4 vWatAxis;
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
  vWatAxis = texelFetch(uParts, ivec2(5, watI), 0);
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
uniform sampler2D uCart;
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
varying vec4 vWatAxis;
float watH(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float watN2(vec2 x){ vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(watH(i), watH(i + vec2(1.0, 0.0)), f.x), mix(watH(i + vec2(0.0, 1.0)), watH(i + vec2(1.0, 1.0)), f.x), f.y); }
vec3 watRamp(float i){
  vec3 c = mix(${C('ember')}, ${C('flame')}, smoothstep(0.04, 0.42, i));
  c = mix(c, ${C('hot')}, smoothstep(0.42, 0.85, i));
  return mix(c, ${C('pale')}, 0.6 * smoothstep(0.95, 1.4, i));
}
vec2 watOnTable(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }
vec4 watArt(vec2 o){ return texture2D(uArt, (vWatR.xz + o - vec2(${f(ART.x0)}, ${f(ART.z0)})) / vec2(${f(ART.w)}, ${f(ART.d)})); }
vec4 watCartArt(vec2 o){ return texture2D(uCart, (vWatR.xz + o - vec2(${f(CART.x0)}, ${f(CART.z0)})) / vec2(${f(CART.w)}, ${f(CART.d)})); }
// How fine a pattern of this many millimetres a period can be drawn here: 1 where a period is eight pixels or more,
// none where it is four or fewer. A highlight broken by a pattern is far finer than the pattern, so a pattern any finer
// than that beats against the pixels as a moire, and is left out of that size.
float watPx(){ return length(fwidth(vWatR)) + 1e-5; }
float watFine(float period){ return 1.0 - smoothstep(0.125, 0.25, watPx() / period); }
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
// How much of the reflected room a finish takes: the frosted plate little, the polished wheels most, so the movement
// has three values at the page's size and not one.
float watRoomK;
// The grain of a ground or turned face: which way its highlight is drawn out, in the part's own (x, z), and how far.
vec2 watAD;
float watAni;
// How strongly a perlage spot flashes here: each spot's own, as each was ground a little differently.
float watFlashK;
// The jewels' light on what is round them: a small pool at each, so a lit jewel is a point with light about it.
vec3 watBounce(vec3 albedo){
  if (uGlow <= 0.001) return vec3(0.0);
  float s = 0.0;
  for (int i = 0; i < ${JEWEL_MAX}; i++) {
    vec4 j = uJewels[i];
    if (j.w <= 0.0) continue;
    vec3 d = vWatR - j.xyz;
    s += j.w * exp(-dot(d.xz, d.xz) / 5.0) * exp(-max(d.y, 0.0) / 1.2) * (0.35 + 0.65 * smoothstep(-0.3, 0.6, -d.y + 0.2));
  }
  vec2 b = vWatR.xz - ${BAL};
  float under = (1.0 - smoothstep(4.5, 7.0, length(b))) * smoothstep(0.0, 0.8, -vWatRN.y) * 0.5;
  s = min(s * 0.5 + under * uGlow, 1.0);
  return watRamp(s) * s * (0.3 + 0.7 * albedo) * 2.2;
}
vec3 watEdgeLight(){
  if (uBandOn < 0.5 || uBand.w <= 0.0) return vec3(0.0);
  float w = max(0.2, fwidth(watCutA) * 1.3);
  float line = exp(-pow(watCutA / w, 2.0)) * uBand.w;
  vec2 out2 = watOnTable(vWatP) - uBand.xy;
  vec3 toLine = normalize(vec3(out2.x, 0.0, out2.y) / max(length(out2), 1e-3) + vec3(0.0, 0.55, 0.0));
  float facing = max(dot(normalize(vWatN), toLine), 0.0);
  float trail = exp(-watCutA / 3.0) * smoothstep(0.0, 1.5, watCutA / w) * uBand.w * facing * facing * 1.6;
  return mix(${C('hot')}, ${C('pale')}, 0.4 * uBand.w) * line * 6.0 + watRamp(trail) * trail * 4.0;
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
  // Its brightest goes past the tone curve's knee, which turns it to the palette's pale: a crisp pale line on an edge.
  float k = pow(graze, 7.0) * pow(toward, 2.0) * uRim.w;
  return mix(${C('hot')}, ${C('pale')}, smoothstep(0.6, 1.8, k)) * min(k, 2.2);
}
// Perlage: small overlapping circles ground by a turning peg, each a disc of fine circular scratches that flashes as a
// narrow slice under a light. Done by hand, each a little off its place and its size. Left out where a spot is under
// eight pixels across, so at the page's size the plate is plain.
void watPerlage(vec2 p){
  float k = 1.0 - smoothstep(0.1, 0.16, watPx() / ${f(PERL.step)});
  if (k <= 0.0) return;
  vec2 q = (p - ${MC}) / ${f(PERL.step)};
  vec2 g0 = floor(vec2(q.x, q.y / 0.86));
  vec2 cb = vec2(0.0);
  float best = -1e9, Rb = 1.0, near = 1e9;
  vec2 cn = vec2(0.0);
  float Rn = 1.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 g = g0 + vec2(float(i), float(j));
    vec2 c = vec2(g.x + mod(g.y, 2.0) * 0.5, g.y * 0.86);
    c += (vec2(watH(g), watH(g + 7.31)) - 0.5) * 0.3;
    float R = ${f(PERL.r / PERL.step)} * (0.9 + 0.3 * watH(g + 3.17));
    float order = g.y * 1000.0 + g.x + watH(g + 11.3) * 1.5;
    float l = length(q - c);
    if (l < R && order > best) { best = order; cb = c; Rb = R; }
    if (l / R < near) { near = l / R; cn = c; Rn = R; }
  }
  if (best < -1e8) { cb = cn; Rb = Rn * max(near, 1.0); }
  vec2 d = q - cb;
  float rr = length(d) / Rb;
  watAD = d / max(length(d), 1e-4);
  watAni = 0.25 * k * smoothstep(0.05, 0.25, rr);
  watCol *= 1.0 - 0.3 * k * smoothstep(0.86, 1.0, rr);
  watRough += (watH(cb * 0.73 + 1.7) - 0.5) * 0.1 * k;
  watFlashK = 1.6 * k * smoothstep(0.05, 0.2, rr) * (0.5 + 0.8 * watH(cb * 3.17 + 0.5));
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
  watAD = vec2(1.0, 0.0);
  watAni = 0.0;
  watFlashK = 0.0;
  watRoomK = 1.0;
  watMetal = 1.0;
  vec2 p = vWatR.xz;
  vec2 rd = vWatAxis.z > 0.0 ? p - vWatAxis.xy : vec2(1.0, 0.0);
  rd /= max(length(rd), 1e-4);
  float tarn = smoothstep(0.5, 0.8, watN2(p * 0.12 + vWatR.y * 0.3 + 3.0));
  if (watM == ${FIN.bronze} || watM == ${FIN.inner}) {
    // The case: satin bronze on its band and its back, turned on the lathe, and polished inside.
    watCol = ${BRONZE} * (0.92 + 0.1 * watN2(p * 0.7)) * (1.0 - 0.25 * tarn);
    watRough = watM == ${FIN.inner} ? 0.14 : 0.34 + 0.08 * tarn;
    watRoomK = 0.8;
    if (watM == ${FIN.bronze}) {
      float rc = min(length(p - ${DC}), length(p - ${MC}));
      watAD = vec2(1.0, 0.0);
      watRough += 0.06 * watFine(0.12) * (watN2(vec2(rc * 6.0, vWatR.y * 3.0)) - 0.5);
    }
  } else if (watM == ${FIN.polish}) {
    watCol = ${BRONZE} * 1.15 * (1.0 - 0.15 * tarn);
    watRough = 0.1 + 0.06 * tarn;
    watRoomK = 1.2;
  } else if (watM == ${FIN.gold}) {
    watCol = mix(${PALE_GOLD}, ${RED_GOLD}, 0.3);
    watRough = watBevel > 0.5 ? 0.08 : 0.16;
    watRoomK = 2.0;
  } else if (watM == ${FIN.plaque}) {
    watCol = ${RED_GOLD} * 0.5;
    watRough = 0.2;
    watRoomK = 0.7;
    if (watBevel > 0.5) watRough = 0.08;
  } else if (watM == ${FIN.chapter}) {
    // The applied chapter ring: the dial's black, polished, a step above the ground, so its edges draw it.
    watCol = ${BLACK} * 1.3;
    watRough = 0.12;
    watRoomK = 1.4;
    if (watBevel > 0.5) { watCol = ${POLISH}; watRough = 0.08; }
  } else if (watM == ${FIN.wheel} || watM == ${FIN.sun}) {
    watCol = ${GOLD} * (watM == ${FIN.sun} ? 0.9 : 1.0);
    watRough = 0.2;
    watRoomK = 2.2;
    if (watUp > 0.5) {
      float k = watFine(0.05);
      watAD = watM == ${FIN.sun} ? vec2(-rd.y, rd.x) : rd;
      watAni = (watM == ${FIN.sun} ? 0.7 : 0.45) * (0.4 + 0.6 * k);
    }
    if (watBevel > 0.5) { watCol = ${PALE_GOLD}; watRough = 0.07; watRoomK = 2.6; }
  } else if (watM == ${FIN.dial} || watM == ${FIN.sub}) {
    // The dial's ground: a black lacquered metal, with a centre sunk and engine turned in rings. A ring is a change of
    // sheen across a shallow wave, left out wherever it would be finer than eight pixels.
    watCol = ${BLACK} * (watM == ${FIN.sub} ? 0.8 : 1.0);
    watRough = 0.16;
    watRoomK = 0.6;
    vec2 c = watM == ${FIN.sub} ? ${SUBC} : ${DC};
    vec2 d = p - c;
    float r = length(d);
    vec2 dir = d / max(r, 1e-3);
    float a = atan(d.y, d.x);
    float period = watM == ${FIN.sub} ? 0.3 : 0.42;
    bool turned = watM == ${FIN.sub} || r < ${f(SUNK.r - 0.3)};
    if (turned) {
      float ph = r / period + (watM == ${FIN.sub} ? 0.0 : 0.02 * sin(a * 18.0) * smoothstep(1.2, 4.0, r));
      float k = watFine(period);
      float wave = sin(ph * 6.2832);
      watTilt = dir * 0.035 * wave * k;
      watRough = mix(0.16, 0.12 + 0.05 * wave, k);
      watAD = vec2(-dir.y, dir.x);
      watAni = 0.35 * k;
    } else {
      // Outside the sunk centre the ground is brushed round, a satin ring the numerals stand on.
      watAD = vec2(-dir.y, dir.x);
      watAni = 0.3;
      watRough = 0.16;
    }
  } else if (watM == ${FIN.numeral} || watM == ${FIN.hand}) {
    // Applied gold, the top polished flat, its sides a little rounder, and a pale edge where the polish turns.
    watCol = ${GOLD};
    watRough = 0.1;
    watRoomK = 2.2;
    if (watBevel > 0.3) { watCol = ${PALE_GOLD}; watRough = 0.06; watRoomK = 2.8; }
  } else if (watM == ${FIN.steel} || watM == ${FIN.spring} || watM == ${FIN.dark}) {
    // Polished steel: a dark face, and its bevels and domes bright and pale.
    watCol = ${STEEL};
    watRough = 0.12;
    watRoomK = 1.4;
    if (watBevel > 0.3 || (watM == ${FIN.steel} && watUp < 0.5)) { watCol = ${POLISH}; watRough = 0.1; }
    if (watM == ${FIN.dark}) { watCol = ${POLISH} * 0.8; watRough = 0.08; watRoomK = 2.0; }
    if (watM == ${FIN.spring}) { watCol = ${POLISH} * 0.55; watRough = 0.12; }
  } else if (watM == ${FIN.bridge}) {
    // Blackened steel. On its top the Geneva stripes: broad shallow waves, each a change of sheen, brushed along its
    // length, so they show as soft bands of light that slide when the light moves. Its bevel is polished all round.
    watCol = ${STEEL};
    watRough = 0.3;
    watRoomK = 1.3;
    if (watUp > 0.5) {
      vec2 ax = vec2(${f(Math.cos(STRIPE.a))}, ${f(Math.sin(STRIPE.a))});
      float s = dot(p - ${MC}, ax) / ${f(STRIPE.w)};
      float k = watFine(${f(STRIPE.w)});
      // Each band is ground by the wheel's rim as a shallow slope, so across it the sheen runs from one side to the
      // other, and where two bands meet it turns back over a hair.
      float fr = fract(s);
      float slope = (fr - 0.5) * 2.0 * smoothstep(0.0, 0.06, fr) * smoothstep(1.0, 0.94, fr);
      watTilt = ax * 0.045 * slope * k;
      watAD = vec2(-ax.y, ax.x);
      watAni = 0.8 * k;
      watRough = 0.22 + 0.04 * abs(slope) * k;
    } else if (watBevel > 0.3) { watCol = ${POLISH}; watRough = 0.07; watRoomK = 2.4; }
  } else if (watM == ${FIN.plate}) {
    watCol = ${BLACK};
    watRough = 0.42;
    watRoomK = 0.7;
    if (watUp > 0.5) watPerlage(p);
  } else if (watM == ${FIN.jewel}) {
    watCol = ${C('ember')} * 0.9;
    watRough = 0.06;
    watMetal = 0.0;
  }
  if (watM == ${FIN.bridge} || watM == ${FIN.inner} || watM == ${FIN.dial} || watM == ${FIN.chapter} || watM == ${FIN.sub} || watM == ${FIN.plate}) {
    if (watUp > 0.5) {
      vec4 art = watArt(vec2(0.0));
      watEng = art.r;
      watPr = art.g;
    }
  }
  float e = 0.03;
  if (watM == ${FIN.plaque} && watUp > 0.5) { watEng = watCartArt(vec2(0.0)).r; e = 0.012; }
  if (watEng > 0.0) {
    float gx, gz;
    if (watM == ${FIN.plaque}) { gx = watCartArt(vec2(e, 0.0)).r - watCartArt(vec2(-e, 0.0)).r; gz = watCartArt(vec2(0.0, e)).r - watCartArt(vec2(0.0, -e)).r; }
    else { gx = watArt(vec2(e, 0.0)).r - watArt(vec2(-e, 0.0)).r; gz = watArt(vec2(0.0, e)).r - watArt(vec2(0.0, -e)).r; }
    if (watM == ${FIN.plaque}) {
      watCol = mix(watCol, watCol * 0.15, watEng);
      watRough = mix(watRough, 0.45, watEng);
      watTilt += vec2(gx, gz) * 0.35;
    } else {
      // Engraving in dark steel is filled with gold, as a fine movement's is, so it reads on the black.
      watCol = mix(watCol, ${GOLD} * 0.8, watEng);
      watRough = mix(watRough, 0.2, watEng);
      watTilt += vec2(gx, gz) * 0.4;
    }
    watAni *= 1.0 - watEng;
  }
  if (watPr > 0.0) {
    // Print is a pale cream lacquer, not metal.
    watCol = mix(watCol, ${CREAM}, watPr);
    watMetal = mix(watMetal, 0.0, watPr);
    watRough = mix(watRough, 0.5, watPr);
    watAni *= 1.0 - watPr;
    watTilt *= 1.0 - watPr;
  }
  watEdge = watMetal;
  watEdgeP = watM == ${FIN.plate} || watM == ${FIN.dial} ? 1.0 : 0.5;
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
// The grain's direction, in place of the one three.js would take from texture coordinates the watch does not have.
const GRAIN = /* glsl */ `
// Dark steel goes white at a grazing angle, as every metal does, and the stage's white balance turns that white
// cool: the screws' domes came out grey blue at their rims. Their grazing reflection is held down.
if (watM == ${FIN.steel} || watM == ${FIN.dark} || watM == ${FIN.spring} || watM == ${FIN.bridge} || watM == ${FIN.plate} || watM == ${FIN.dial} || watM == ${FIN.sub} || watM == ${FIN.chapter}) material.specularF90 = 0.6;
// A jewel's polished face mirrors the room as a ruby does, warm, never as a white glint.
if (watM == ${FIN.jewel}) { material.specularColor *= ${C('flame')}; material.specularColorBlended = material.specularColor; watEdge = 1.0; }
#ifdef USE_ANISOTROPY
{
  vec3 watT = watAD.x * vWatAx + watAD.y * vWatAz;
  watT -= normal * dot(watT, normal);
  float tl = length(watT);
  float an = tl > 1e-3 ? clamp(watAni, 0.0, 1.0) : 0.0;
  watT = tl > 1e-3 ? watT / tl : normalize(cross(normal, vec3(0.0, 0.0, 1.0)) + vec3(0.0, 1e-3, 1e-3));
  material.anisotropy = an;
  material.alphaT = mix(pow2(material.roughness), 1.0, pow2(an));
  material.anisotropyT = watT;
  material.anisotropyB = normalize(cross(normal, watT) + normal * 1e-3);
}
#endif`;
const EMISSIVE = /* glsl */ `
  totalEmissiveRadiance += watHeatLight() + watEdgeLight() + watRimLight(normal, normalize(vViewPosition)) + watBounce(diffuseColor.rgb);
  if (watM == ${FIN.jewel}) {
    float s = 0.0;
    for (int i = 0; i < ${JEWEL_MAX}; i++) { vec3 d = vWatR - uJewels[i].xyz; s += uJewels[i].w * exp(-dot(d, d) / 0.9); }
    float g = 0.1 + s;
    totalEmissiveRadiance += watRamp(0.25 + 0.75 * min(g, 1.3)) * g * (0.5 + 0.5 * pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 1.5)) * 4.0;
  }
  // The stream's light in a wheel runs round its rim from where the wheel before it meshes, along the flanks of its
  // teeth and its bevels, and never washes its faces one color.
  if (vWatLight > 0.001 && (watM == ${FIN.wheel} || watM == ${FIN.gold} || watM == ${FIN.sun})) {
    float side = smoothstep(0.3, 0.9, 1.0 - abs(normalize(vWatRN).y));
    float arc = 1.0;
    float rim = 0.0;
    if (vWatAxis.z > 0.0) {
      vec2 d = vWatR.xz - vWatAxis.xy;
      float da = atan(d.y, d.x) - vWatAxis.w;
      da = abs(mod(da + 3.14159, 6.28318) - 3.14159);
      arc = 0.35 + 1.3 * exp(-da * da / 0.5);
      rim = watUp * smoothstep(0.72, 0.96, length(d) / vWatAxis.z);
    }
    float g = vWatLight;
    totalEmissiveRadiance += watRamp(g) * g * (0.06 + 1.2 * side + 0.8 * watBevel + 0.7 * rim) * arc * 3.0;
  }
  #if NUM_SPOT_LIGHTS > 0
  if (watFlashK > 0.0) {
    // A perlage spot's circular grain lights as a slice through its middle, turned toward each light: the slice lies
    // where the grain runs square to the light's half vector, so it swings round the spot as the cursor moves.
    vec3 T = watAD.x * vWatAx + watAD.y * vWatAz;
    T -= normal * dot(T, normal);
    float tl = length(T);
    if (tl > 1e-3) {
      T /= tl;
      vec3 v = normalize(vViewPosition);
      vec3 sum = vec3(0.0);
      for (int i = 0; i < NUM_SPOT_LIGHTS; i++) {
        vec3 lv = spotLights[i].position + vViewPosition;
        float d = length(lv);
        vec3 L = lv / max(d, 1e-5);
        float nl = dot(normal, L);
        if (nl <= 0.0) continue;
        vec3 H = normalize(L + v);
        vec3 hp = H - normal * dot(H, normal);
        float hl = length(hp);
        float c = hl > 1e-4 ? dot(hp / hl, T) : 0.0;
        float sa = getSpotAttenuation(spotLights[i].coneCos, spotLights[i].penumbraCos, dot(L, spotLights[i].direction));
        sum += spotLights[i].color * getDistanceAttenuation(d, spotLights[i].distance, spotLights[i].decay) * sa * nl * pow(c * c, 36.0) * pow(max(dot(normal, H), 0.0), 16.0);
      }
      totalEmissiveRadiance += sum * ${GOLD} * watFlashK * ${f(FLASH)};
    }
  }
  #endif
  if (vWatLight > 0.001 && watM == ${FIN.numeral}) {
    float g = vWatLight;
    float side = smoothstep(0.3, 0.9, 1.0 - abs(normalize(vWatRN).y));
    totalEmissiveRadiance += watRamp(g) * g * (0.8 + 1.4 * side) * 2.4;
  }`;

// An edge tint. At a grazing angle a metal's reflection goes white in three.js whatever its color, and the stage's
// white balance turns that white grey blue: every gilded bevel seen edge on came out khaki. Here a colored metal goes
// toward its own hue instead, as a gold does, and a dark finish keeps a dimmer edge, or no gilt could be dark.
const EDGE = /* glsl */ `
float watEdge = 0.0;
float watEdgeP = 0.5;
vec3 watEdgeOf(vec3 f0){ float m = max(max(f0.r, max(f0.g, f0.b)), 1e-3); return mix(vec3(1.0), f0 / m * pow(m, watEdgeP), watEdge); }`;
const COMMON = EDGE + '\n' + THREE.ShaderChunk.common.replace('return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );', 'return f0 * ( 1.0 - fresnel ) + ( f90 * watEdgeOf( f0 ) * fresnel );');
const PHYSICAL = THREE.ShaderChunk.lights_physical_pars_fragment
  .replace('vec3 FssEss = Fr * fab.x + specularF90 * fab.y;', 'vec3 FssEss = Fr * fab.x + specularF90 * watEdgeOf( Fr ) * fab.y;')
  .replace('return specularColor * fab.x + specularF90 * fab.y;', 'return specularColor * fab.x + specularF90 * watEdgeOf( specularColor ) * fab.y;')
  .replace('( material.specularF90 - material.specularColorBlended ) * t2.y', '( material.specularF90 * watEdgeOf( material.specularColorBlended ) - material.specularColorBlended ) * t2.y');

// The reflected room is the room's light, the palette's pale, as every other light here is. Mirrored neutral, it put
// pale gold past the white balance's reach into grey.
const ROOM = `radiance *= ${C('pale')} * watRoomK; iblIrradiance *= ${C('pale')} * watRoomK;`;

// A glint on gold keeps gold's hue through the middle of its rise, where the white balance would turn a neutral
// reflection grey, and only far past the tone curve's knee may it go to the palette's pale, which the curve gives it.
const GLINT = /* glsl */ `
{
  float pk = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b));
  float h = smoothstep(0.25, 0.8, pk) * (1.0 - smoothstep(1.0, 2.0, pk));
  outgoingLight.g = min(outgoingLight.g, outgoingLight.r * mix(1.0, 0.8, h));
  outgoingLight.b = min(outgoingLight.b, outgoingLight.r * mix(1.0, 0.5, h));
  outgoingLight *= min(1.0, 6.0 / max(pk, 1e-4));
}`;

// Joins the watch's chunks to a standard material: the part's move in the vertex shader, its finish in the fragment.
export function watchMaterial(m: THREE.MeshPhysicalMaterial, u: Shared, key: string): THREE.MeshPhysicalMaterial {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VHEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `${COMMON}\n${FHEAD}`)
      .replace('#include <lights_physical_pars_fragment>', PHYSICAL)
      .replace('#include <lights_fragment_end>', `${ROOM}\n#include <lights_fragment_end>`)
      .replace('#include <opaque_fragment>', `${GLINT}\n#include <opaque_fragment>`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${COLOR}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${ROUGH}`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${METALNESS}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${NORMAL}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${EMISSIVE}`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>\n${GRAIN}`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}

// The crystal: only what it mirrors, laid over what is under it, and of that only a thin warm arc by the bezel. A
// crystal that mirrored the strip across the dial read at the page's size as a pale stripe of glare over the face.
const ARC = /* glsl */ `
{
  float r = length(vWatR.xz - ${DC}) / ${f(BODY.open)};
  vec2 d = vWatR.xz - ${DC};
  float side = smoothstep(0.35, 0.8, dot(d / max(length(d), 1e-3), vec2(-0.7071, -0.7071)));
  float arc = smoothstep(0.935, 0.955, r) * (1.0 - smoothstep(0.975, 0.99, r)) * side;
  gl_FragColor.rgb *= mix(${C('hot')}, ${C('pale')}, arc * arc) * (0.025 + 0.975 * arc);
}`;
export function glassMaterial(m: THREE.MeshPhysicalMaterial, u: Shared): THREE.MeshPhysicalMaterial {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VHEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uBandOn;\nuniform vec4 uBand;\nuniform vec3 uEye;\nvarying vec3 vWatP;\nvarying vec3 vWatR;\nfloat watCutA;\nvec2 watOnTable(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${CUT}`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>\n${ARC}`);
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
