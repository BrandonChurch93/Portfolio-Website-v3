import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { NOISE, lin } from '../../../../world/surface';
import { CORE, HEART, SCALE } from '../../layout';
import { MOVE_GLSL } from './motion';

// One material draws every piece of rock and everything that stood on the ground, so all of it is one program. What
// a face is made of rides on its vertices (KIND, in the cell attribute's first number), and where the piece is and
// how it is turned is worked out in the vertex shader from the clock (./motion.ts).
//
// Rock is the planet's inside in section: beds of a few warm greys, some near black, some sandy, parted by thin dark
// seams and cut by joints, with seams of bright metal in some beds and a vein of metal broken across each piece. Its
// broken edges are worn paler and catch the light. Polished metal mirrors the core: a face of it turned so that the
// core's ball lies in its reflection shows the core, whole, as a flat mirror does.

export const KIND = {
  rock: 0, earth: 1, paving: 2, road: 3, gold: 4, bronze: 5, copper: 6, dark: 7, facade: 8, lamp: 9, leaf: 10, stone: 11, pool: 12, glass: 13, wood: 14, section: 15,
} as const;

// The cell's other three numbers. rock: a tone, 1 on a chamfer, and the height its beds are counted down from, in
// the piece's own size (a piece whose seed has a fraction is cut from that share of 70 units further down).
// paving: its pattern (0 flags, 1 rings, 2 squares with inlay), 1 on a chamfer, the pattern's turn. road: the middle
// of the road across x, 1 on a chamfer, its half width. facade: its frame (0 stone, 1 bronze), 1 on a chamfer, the
// share of its rooms lit. leaf: a tone. lamp: how bright.

export interface LookUniforms {
  uT: { value: number };
  uCore: { value: number };
}

const gold = new THREE.Color(hex('copper-light')).lerp(new THREE.Color(hex('hot')), 0.85).getHex();

// How strongly a polished face mirrors the core, against the core's own light.
const MIRROR = 0.45;
// How bright a lit room behind a window is, and a lamp.
const ROOM = 0.32, LAMP = 0.22;
// How much of the room's soft light the rough stone takes: under the whole of it nothing had a shadow side.
const FILL = 0.4;
// The rock's own lightness against the torn face's: the pieces stand out in the open, lit by the moon and the core
// from two sides with nothing to shade them, so they are made darker to sit with the face they broke from.
const ALBEDO = 0.5;
// How much of the room a rough face gives back. The room is bright, for the metals to mirror, and a rough face that
// took its share of it went pale as plaster.
const SHEEN = 0.12;
// How much of the direct light a corner keeps out, against all of the room's.
const OCC_DIRECT = 0.55;

// The depth the lights' shadows are drawn with, for the few pieces that hold still and so may throw a shadow: it puts
// each where the clock puts it, as the material does.
export function lookDepth(u: LookUniforms): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 iC; attribute vec4 iU; attribute vec4 iV; attribute vec4 iS; attribute vec4 iQ; attribute vec4 iK;
uniform float uT;
${MOVE_GLSL}`)
      .replace('#include <begin_vertex>', 'vec4 dQ; vec3 dAt; dMove(uT, dQ, dAt); vec3 transformed = dAt + dRot(dQ, position * iK.x);');
  };
  m.customProgramCacheKey = () => 'debris-depth';
  return m;
}

export function lookMaterial(u: LookUniforms): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0 });
  m.name = 'debris';
  const heart = new THREE.Vector3(...HEART).multiplyScalar(SCALE);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uHeartW: { value: heart }, uCoreRW: { value: CORE.r * SCALE } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 cell; attribute float occ;
attribute vec4 iC; attribute vec4 iU; attribute vec4 iV; attribute vec4 iS; attribute vec4 iQ; attribute vec4 iK;
uniform float uT;
varying vec4 vCell; varying vec3 vObj; varying vec3 vObjN; varying float vSeed; varying float vOcc;
${MOVE_GLSL}
vec4 dQ; vec3 dAt;`)
      .replace('#include <beginnormal_vertex>', `dMove(uT, dQ, dAt);
vec3 objectNormal = dRot(dQ, normal);`)
      .replace('#include <begin_vertex>', `vec3 transformed = dAt + dRot(dQ, position * iK.x);
vCell = vec4(cell.xyz, cell.x < 1.5 ? cell.w * iK.x + fract(iK.y) * 70.0 : cell.w); vObj = position * iK.x; vObjN = normal; vSeed = iK.y; vOcc = occ;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vCell; varying vec3 vObj; varying vec3 vObjN; varying float vSeed; varying float vOcc;
uniform float uT; uniform float uCore; uniform vec3 uHeartW; uniform float uCoreRW;
const float FILL = ${FILL.toFixed(2)};
const float ALBEDO = ${ALBEDO.toFixed(2)};
const float SHEEN = ${SHEEN.toFixed(2)};
${NOISE}
${HEAD}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
${COLOR}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = dRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = dMetal;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
normal = dBump(normal, dH, dHk);`)
      .replace('#include <lights_fragment_end>', 'iblIrradiance *= dFill; irradiance *= dFill; radiance *= mix(dSheen, 1.0, max(dMetal, dGlass));\n#include <lights_fragment_end>')
      .replace('#include <aomap_fragment>', `{
  // The piece's own corners: the room's light goes out of them entirely, and the lamps' and the core's in part.
  float o = vOcc * vOcc;
  reflectedLight.indirectDiffuse *= o;
  reflectedLight.indirectSpecular *= o;
  reflectedLight.directDiffuse *= mix(1.0, o, ${OCC_DIRECT.toFixed(2)});
  reflectedLight.directSpecular *= mix(1.0, o, ${OCC_DIRECT.toFixed(2)}) * mix(dFill, 1.0, max(dMetal, dGlass));
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
${EMIT}`);
  };
  m.customProgramCacheKey = () => 'debris';
  return m;
}

const HEAD = /* glsl */ `
float dRough, dMetal, dH, dHk, dPx, dGlass, dFill, dSheen; vec3 dEmi, dF0;
float dHash(vec2 q){ return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }
float dHash1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
vec3 dRamp(float t){
  vec3 e = ${lin(hex('ember'))}, f = ${lin(hex('flame'))}, h = ${lin(hex('hot'))}, p = ${lin(hex('pale'))};
  return t < 0.333 ? mix(e, f, t * 3.0) : t < 0.667 ? mix(f, h, t * 3.0 - 1.0) : mix(h, p, t * 3.0 - 2.0);
}
// A bump from a height worked out in the fragment, in view space.
vec3 dBump(vec3 n, float h, float k){
  if (k <= 0.0) return n;
  vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
  float hx = dFdx(h), hy = dFdy(h);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 g = sign(det) * (hx * r1 + hy * r2);
  vec3 m = abs(det) * n - g * k;
  return dot(m, m) > 1e-20 ? normalize(m) : n;
}
// A line of a width at a distance, kept as its share of a pixel when it is finer than one.
float dLine(float d, float w){ float a = max(fwidth(d), 1e-4); return (1.0 - smoothstep(w * 0.5 - a, w * 0.5 + a, abs(d))) * min(1.0, w / a); }
// The distance to the nearest joint of a network of cracks, and an id for the block it is in.
vec2 dCells(vec3 p){
  vec3 i = floor(p), f = fract(p);
  float f1 = 9.0, f2 = 9.0, id = 0.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 o = vec3(float(x), float(y), float(z)), c = i + o;
    vec3 q = o + 0.5 + 0.4 * (vec3(wHash(c), wHash(c + 7.1), wHash(c + 3.3)) - 0.5) * 2.0 - f;
    float d = dot(q, q);
    if (d < f1) { f2 = f1; f1 = d; id = wHash(c + 1.7); } else if (d < f2) f2 = d;
  }
  return vec2(sqrt(f2) - sqrt(f1), id);
}
vec3 dMetalOf(float k){
  return k < 4.5 ? ${lin(gold)} : k < 5.5 ? ${lin(hex('bronze'))} : ${lin(hex('copper'))};
}
// The beds of the planet's rock, counted down from the top of the piece.
vec3 dBeds(float depth, vec3 p, float seed, out float seam, out float metalBed){
  float warp = (wNoise(p * 0.035 + seed) - 0.5) * 6.0 + (wNoise(p * 0.11) - 0.5) * 1.2;
  float d = depth + warp;
  // The crust: under the ground a band of dark earth, then pale beds, then the deep rock.
  vec3 c;
  float t = d / 5.5, i = floor(t), f = fract(t);
  float h = dHash1(i + floor(seed * 7.0) * 3.1);
  if (d < 4.0) c = mix(${lin(0x1a1410)}, ${lin(0x2a2018)}, wNoise(p * 0.4));
  else if (d < 11.0) c = mix(${lin(0x3a3129)}, ${lin(0x5c5146)}, smoothstep(0.6, 0.8, wNoise(p * 0.7)) * 0.7) * (0.85 + 0.3 * h);
  else if (h < 0.28) c = ${lin(0x4c443b)};
  else if (h < 0.55) c = ${lin(0x3c3631)};
  else if (h < 0.82) c = ${lin(0x2a2624)};
  else c = ${lin(0x43362a)};
  c *= ALBEDO;
  // Deeper is darker and harder, fewer pale beds.
  c *= mix(1.0, 0.7, smoothstep(12.0, 60.0, d));
  seam = dLine(f - 0.5, 0.08) * 0.5 + dLine(fract(t * 2.7 + h) - 0.5, 0.05) * 0.25;
  metalBed = d > 11.0 && dHash1(i * 1.7 + 4.0 + seed) > 0.93 ? dLine((f - 0.5) * 5.5, 0.9 + 0.8 * wNoise(p * 0.2)) : 0.0;
  return c;
}
`;

const COLOR = /* glsl */ `{
  float kd = floor(vCell.x + 0.5), ch = vCell.z;
  dPx = length(fwidth(vObj));
  float fine = 1.0 - smoothstep(0.35, 1.2, dPx);
  vec3 p = vObj + vSeed * vec3(37.1, 11.3, 23.7);
  vec3 c = vec3(0.1);
  dRough = 0.8; dMetal = 0.0; dEmi = vec3(0.0); dH = 0.0; dHk = 0.0; dF0 = vec3(0.04); dGlass = 0.0; dFill = kd < 3.5 || kd > 9.5 && kd < 11.5 || kd > 13.5 ? FILL : 1.0; dSheen = dFill < 1.0 ? SHEEN : 1.0;
  vec3 N0 = normalize(vObjN + 1e-5);
  if (kd < 0.5 || kd > 0.5 && kd < 1.5) {
    float seam, metalBed;
    c = dBeds(vCell.w - vObj.y, p, vSeed, seam, metalBed);
    if (kd > 0.5) {
      // The forest's floor: dark earth under a litter of fallen leaves in autumn's colors, and small stones.
      vec2 cl2 = dCells(p * vec3(0.9, 0.9, 0.9)).xy;
      float leafy = smoothstep(0.35, 0.7, wNoise(p * 0.35)) * fine;
      vec3 litter = mix(${lin(0x3a2416)}, ${lin(0x5a3a22)}, dHash1(cl2.y * 31.0)) * (0.6 + 0.5 * cl2.y);
      c = mix(${lin(0x1c1612)}, ${lin(0x2c2218)}, wNoise(p * 0.5));
      c = mix(c, litter, leafy * step(0.55, cl2.y) * 0.6);
      c = mix(c, ${lin(0x3a3631)}, step(0.93, dHash1(cl2.y * 7.0)) * fine);
      c = mix(c, ${lin(0x2c2218)}, 1.0 - fine);
      seam = 0.0;
    }
    c *= 0.88 + 0.12 * vCell.y;
    // The beds stand out and in as they weathered, so a torn face is ledges and not a smooth wall.
    float bedAt = (vCell.w - vObj.y + (wNoise(p * 0.035 + vSeed) - 0.5) * 6.0) / 5.5;
    float ledge = (dHash1(floor(bedAt) * 1.3 + vSeed) - 0.5) * 1.6 * (1.0 - step(0.5, kd));
    // Fractures: long cracks that run down the faces, broken off here and there, dark in their depth.
    float rn = wNoise(p * vec3(0.06, 0.016, 0.06)) * 2.0 - 1.0;
    float cw = max(fwidth(rn), 1e-3);
    float joint = (1.0 - smoothstep(0.0, 0.05 + cw * 1.5, abs(rn))) * smoothstep(0.45, 0.65, wNoise(p * 0.05 + 4.0)) * (1.0 - smoothstep(0.15, 0.35, cw)) * (1.0 - step(0.5, kd));
    c *= 1.0 - 0.6 * joint - 0.5 * seam;
    // Fracture: broad conchoidal hollows and fine grit, gone before they are finer than a pixel.
    float big = wFbm(p * 0.07);
    dH = big * 1.6 + ledge + wNoise(p * 0.45) * 0.45 * fine - joint * 0.7 - seam * 0.5;
    dHk = 0.0024;
    c *= 0.82 + 0.36 * mix(0.5, wNoise(p * 0.9), fine);
    // Dust lies on what faces up in the piece's own frame.
    c *= 1.0 + 0.25 * smoothstep(0.3, 0.9, N0.y);
    dRough = 0.86 - 0.1 * big;
    // A vein of metal broken across the piece, and the seams in the metal bearing beds.
    vec3 vn = normalize(vec3(dHash1(vSeed * 3.1) - 0.5, (dHash1(vSeed * 5.7) - 0.5) * 0.6, dHash1(vSeed * 9.3) - 0.5));
    float off = (dHash1(vSeed * 2.3) - 0.5) * 10.0;
    float veinW = 0.6 + 0.9 * dHash1(vSeed * 4.1) + 0.6 * wNoise(p * 0.12);
    float vein = dLine(dot(vObj, vn) - off + (wNoise(p * 0.08) - 0.5) * 4.0, veinW) * step(0.6, dHash1(vSeed * 7.7));
    float mk = max(vein, metalBed) * (1.0 - step(0.5, kd));
    if (mk > 0.02) {
      float which = 4.0 + floor(0.6 + dHash1(vSeed * 6.1 + floor(vCell.w)) * 2.4);
      c = mix(c, dMetalOf(which), mk);
      dMetal = mk; dRough = mix(dRough, 0.3, mk); dH = mix(dH, 0.0, mk); dF0 = dMetalOf(which) * 0.75;
    }
    // A broken edge is worn pale and smooth, and catches the light.
    c = mix(c, c * 1.35 + 0.006, ch * (1.0 - mk));
    dRough = mix(dRough, 0.5, ch * (1.0 - mk));
  }
  else if (kd < 2.5) {
    // Paving: pale warm flags, each its own tone, the joints fine and dark, with metal let into it.
    vec2 q = vObj.xz;
    float a = vCell.w; q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
    float pat = vCell.y, joint = 0.0, inlay = 0.0, tone = 0.5;
    if (pat < 0.5) {
      float row = floor(q.y / 3.2), x = q.x + dHash(vec2(row, 1.0)) * 6.0;
      tone = dHash(vec2(floor(x / 5.6), row));
      joint = max(dLine(fract(x / 5.6) - 0.5, 0.04), dLine(fract(q.y / 3.2) - 0.5, 0.06));
      inlay = dLine(mod(q.y + 1.6, 25.6) - 12.8, 0.32);
    } else if (pat < 1.5) {
      float r = length(q), ang = atan(q.y, q.x);
      float ring = floor(r / 4.5);
      float seg = floor(ang * (3.0 + ring * 2.0) / 3.14159);
      tone = dHash(vec2(ring, seg));
      joint = max(dLine(fract(r / 4.5) - 0.5, 0.05), dLine(fract(ang * (3.0 + ring * 2.0) / 3.14159) - 0.5, 0.06 + 0.02 * ring));
      inlay = dLine(mod(r, 13.5) - 6.75, 0.45);
    } else {
      vec2 cellq = floor(q / 7.0);
      tone = dHash(cellq);
      vec2 f = fract(q / 7.0) - 0.5;
      joint = max(dLine(f.x, 0.04), dLine(f.y, 0.04));
      inlay = max(dLine(f.x * 7.0, 0.3), dLine(f.y * 7.0, 0.3)) * step(0.72, dHash(cellq + 3.0));
    }
    c = ${lin(0x4c443b)} * (0.72 + 0.4 * tone) * (0.9 + 0.2 * mix(0.5, wFbm(p * 0.6), fine));
    c *= 1.0 - 0.6 * joint;
    // Grime in the joints and soot toward the broken edge.
    c *= 0.85 + 0.15 * wNoise(p * 0.07);
    dRough = 0.62 - 0.12 * tone; dH = -joint * 0.4 + wNoise(p * 0.8) * 0.15 * fine; dHk = 0.0015;
    float mk = clamp(inlay, 0.0, 1.0) * (1.0 - ch);
    if (mk > 0.01) { vec3 g = pat > 1.5 ? ${lin(hex('copper'))} : ${lin(gold)}; c = mix(c, g, mk); dMetal = mk; dRough = mix(dRough, 0.15, mk); dF0 = g; }
    c = mix(c, c * 1.3, ch);
  }
  else if (kd < 3.5) {
    // A road: dark aggregate, polished where it was worn, with lines of copper let into it.
    c = ${lin(0x1e1c1a)} * (0.85 + 0.3 * mix(0.5, wNoise(p * 1.3), fine)) * (0.9 + 0.2 * wNoise(p * 0.05));
    float x = vObj.x - vCell.w, hw = vCell.y;
    float dash = step(0.45, fract(vObj.z / 9.0));
    float mk = dLine(x, 0.5) * dash + dLine(abs(x) - (hw - 1.6), 0.4);
    mk *= 1.0 - ch;
    dRough = 0.55 + 0.2 * wNoise(p * 0.2); dH = wNoise(p * 1.1) * 0.1 * fine; dHk = 0.0015;
    if (mk > 0.01) { c = mix(c, ${lin(hex('copper'))}, mk); dMetal = mk; dRough = mix(dRough, 0.2, mk); dF0 = ${lin(hex('copper'))}; }
  }
  else if (kd < 6.5) {
    // Polished metal: gold, bronze, copper. Rubbed bright on its edges, darker and tarnished in its hollows.
    c = dMetalOf(kd);
    float tarn = smoothstep(0.55, 0.8, wFbm(p * 0.09));
    c *= (1.0 - 0.35 * tarn) * (0.94 + 0.12 * wNoise(p * 0.5));
    dF0 = c; dMetal = 1.0; dRough = 0.17 + 0.18 * tarn - 0.06 * ch;
    c = mix(c, c * 1.15, ch);
  }
  else if (kd < 7.5) {
    // Dark structure: a warm near black metal, satin.
    c = ${lin(0x221f1c)} * (0.9 + 0.2 * wNoise(p * 0.3));
    dMetal = 0.75; dRough = 0.36; dF0 = c * 2.0;
    c = mix(c, c * 2.2, ch);
  }
  else if (kd < 8.5) {
    // A facade: floors of dark glass between bands of its frame, each pane in its own reveal (a shadow under the band
    // above, a pale sill under it), a pair of lights to a bay, the glass of each pane a little different, some panes
    // gone, every few floors a band of plant behind louvres, a few rooms still lit, grime worked down from each sill.
    vec3 an = abs(N0);
    float along = an.x > an.z ? vObj.z : vObj.x;
    if (an.y > 0.7) along = vObj.x;
    float bayW = 1.7, floorH = 2.6;
    float fy = (vObj.y + 0.6) / floorH;
    vec2 cellq = vec2(floor(along / bayW), floor(fy));
    vec2 f = vec2(fract(along / bayW), fract(fy));
    vec2 w = vec2(fwidth(along / bayW), fwidth(fy));
    float tiny = smoothstep(0.2, 0.45, max(w.x, w.y));
    float plant = step(0.86, dHash(vec2(cellq.y, vSeed)));
    float pane = smoothstep(0.06 - w.x, 0.06 + w.x, f.x) * (1.0 - smoothstep(0.94 - w.x, 0.94 + w.x, f.x)) * smoothstep(0.26 - w.y, 0.26 + w.y, f.y) * (1.0 - smoothstep(0.93 - w.y, 0.93 + w.y, f.y));
    float mull = dLine(f.x - 0.5, 0.05);
    pane *= 1.0 - mull;
    pane = mix(pane, 0.55, tiny) * step(an.y, 0.7);
    vec3 frame = vCell.y > 0.5 ? ${lin(hex('bronze'))} * 0.7 : ${lin(0x4a4239)};
    float grime = smoothstep(0.6, 0.0, f.y) * 0.25 * wNoise(vec3(along * 1.7, vObj.y * 0.4, 0.0));
    vec3 fr = frame * (0.85 + 0.2 * wNoise(p * 0.4)) * (1.0 - grime);
    // The band under each pane is a sill, paler; the top of each pane lies in the band's shadow.
    fr = mix(fr, fr * 1.35, smoothstep(0.26, 0.2, f.y) * smoothstep(0.12, 0.2, f.y) * (1.0 - tiny));
    float gone = step(0.93, dHash(cellq * 1.7 + vSeed));
    vec3 glass = ${lin(0x0e0d0c)} * (0.7 + 0.6 * dHash(cellq + 2.0));
    glass = mix(glass, ${lin(0x050404)}, gone);
    float shade = mix(1.0, 0.45, smoothstep(0.75, 0.93, f.y) * (1.0 - tiny));
    vec3 louvre = ${lin(0x26221e)} * (0.7 + 0.5 * step(0.5, fract(vObj.y * 3.0)));
    c = mix(fr, glass * shade, pane);
    c = mix(c, louvre, plant * pane);
    dMetal = vCell.y > 0.5 ? 1.0 - pane : 0.0;
    dF0 = mix(frame, vec3(0.05), pane);
    dRough = mix(vCell.y > 0.5 ? 0.3 : 0.7, mix(0.05 + 0.1 * dHash(cellq + 7.0), 0.9, max(gone, plant)), pane);
    dGlass = pane * (1.0 - gone) * (1.0 - plant);
    vec2 room = vec2(floor(cellq.x / 3.0), cellq.y);
    float lit = step(dHash(room + vSeed * 13.0), vCell.w) * (0.4 + 0.6 * dHash(room + 5.0)) * (1.0 - plant);
    dEmi = dRamp(0.26 + 0.18 * dHash(cellq + 9.0)) * ${ROOM.toFixed(2)} * lit * pane * shade * (1.0 - tiny * 0.5);
    c = mix(c, c * 1.4, ch);
  }
  else if (kd > 14.5) {
    // A building's broken section: its floors cut across, slabs of pale concrete with the dark of the rooms between
    // them, a wall or a column here and there, the rods of the slabs' steel showing at their edges.
    vec3 an = abs(N0);
    float along = an.x > an.z ? vObj.z : vObj.x;
    float fy = (vObj.y + 0.6) / 2.6, f = fract(fy);
    float wy = fwidth(fy);
    float slab = smoothstep(0.82 - wy, 0.82 + wy, f) + smoothstep(0.05 + wy, 0.05 - wy, f);
    float wall = step(0.8, dHash(vec2(floor(along / 2.4), floor(fy) + vSeed))) * dLine(fract(along / 2.4) - 0.5, 0.12);
    float far = smoothstep(0.3, 0.6, wy);
    vec3 dark = ${lin(0x080706)} * (1.0 + 2.0 * wNoise(p * 0.8));
    c = mix(dark, ${lin(0x433d36)} * (0.8 + 0.4 * wNoise(p * 1.3)), clamp(slab + wall, 0.0, 1.0));
    c = mix(c, ${lin(0x221e1b)}, far);
    float rod = dLine(fract(along * 1.6) - 0.5, 0.1) * smoothstep(0.82, 0.86, f) * (1.0 - far);
    c = mix(c, ${lin(0x2a1c14)}, rod);
    dRough = 0.85; dH = (slab - 0.5) * 0.6 * (1.0 - far); dHk = 0.002;
  }
  else if (kd < 9.5) {
    c = ${lin(0x1a1714)}; dRough = 0.4;
    dEmi = dRamp(0.55 + 0.25 * vCell.y) * ${LAMP.toFixed(2)};
  }
  else if (kd < 10.5) {
    // Foliage in an autumn evening's colors: copper, amber, umber, never green. Clumps of leaves in the light.
    float t = vCell.y;
    vec3 a = mix(${lin(0x4a2a17)}, ${lin(0x7a4a24)}, t), b = mix(${lin(0x1c140e)}, ${lin(0x3e2414)}, t);
    float clump = wFbm(p * 0.5);
    // The crown's outline is leaves and not a skin: where it turns from the eye it breaks up into gaps.
    float facing = abs(dot(normalize(vNormal), normalize(vViewPosition)));
    if (facing < 0.5 && wNoise(p * 1.1) < 0.62 - facing) discard;
    c = mix(b, a, smoothstep(0.35, 0.75, clump)) * (0.65 + 0.7 * mix(0.5, wNoise(p * 2.2), fine)) * (0.55 + 0.45 * smoothstep(0.3, 0.6, wNoise(p * 0.9)));
    dRough = 0.85; dH = clump * 1.2 + wNoise(p * 2.0) * 0.4 * fine; dHk = 0.002;
  }
  else if (kd < 11.5) {
    // Dressed stone: pale, smooth, laid in courses.
    float course = dLine(fract(vObj.y / 3.0 + vCell.w) - 0.5, 0.05);
    c = ${lin(0x51483e)} * (0.85 + 0.25 * mix(0.5, wFbm(p * 0.35), fine)) * (1.0 - 0.35 * course) * (0.8 + 0.2 * vCell.y + 0.2);
    c *= 0.8 + 0.2 * wNoise(vec3(p.x * 0.3, p.y * 0.05, p.z * 0.3));
    dRough = 0.6; dH = wNoise(p * 0.6) * 0.3 * fine - course * 0.3; dHk = 0.0015;
    c = mix(c, c * 1.3, ch);
  }
  else if (kd > 13.5 && kd < 14.5) {
    // Bark: dark grey brown, in ridges that run along the trunk, and a root's paler wood where it was torn.
    float ridge = wNoise(vec3(p.x * 1.6, p.y * 0.12, p.z * 1.6));
    c = mix(${lin(0x1d1915)}, ${lin(0x3a322a)}, ridge * fine + 0.5 * (1.0 - fine)) * (0.85 + 0.3 * vCell.y);
    dRough = 0.88; dH = ridge * 0.6 * fine; dHk = 0.002;
    c = mix(c, ${lin(0x5a4936)}, ch);
  }
  else if (kd < 12.5) {
    c = ${lin(0x0b0908)}; dRough = 0.04; dF0 = vec3(0.05); dGlass = 1.0;
  }
  else {
    c = ${lin(0x0f0e0d)}; dRough = 0.06; dF0 = vec3(0.05); dGlass = 1.0;
  }
  diffuseColor.rgb = c;
}`;

const EMIT = /* glsl */ `{
  // The core mirrored in what is polished: a ball of the stream's light, whole in a flat face turned to it.
  float shine = max(dMetal, dGlass);
  if (shine > 0.01) {
    vec3 cv = (viewMatrix * vec4(uHeartW, 1.0)).xyz, P = -vViewPosition, V = normalize(vViewPosition);
    vec3 R = reflect(-V, normal), to = cv - P;
    float d = length(to);
    vec3 dir = to / max(d, 1e-5);
    float sinA = clamp(uCoreRW / max(d, 1e-5), 0.0, 0.999), cosA = sqrt(1.0 - sinA * sinA);
    float soft = 0.004 + 0.2 * dRough * dRough;
    float hit = smoothstep(cosA - soft, cosA + soft * 0.4, dot(R, dir));
    // How bright the core shows in it: the core's middle is hotter than its rim.
    float mid = smoothstep(cosA, 1.0, dot(R, dir));
    vec3 seen = mix(dRamp(0.62), dRamp(0.82), mid) * ${MIRROR.toFixed(2)} * uCore;
    float fres = dGlass > 0.5 ? 0.04 + 0.96 * pow(1.0 - max(dot(normal, V), 0.0), 5.0) : 1.0;
    totalEmissiveRadiance += seen * hit * mix(vec3(fres), dF0, dMetal) * shine;
  }
  totalEmissiveRadiance += dEmi;
}`;
