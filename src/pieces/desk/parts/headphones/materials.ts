import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { NOISE } from '../../../../world/surface';
import { BASE, CUP, MIC, SADDLE, SLOT } from './form';

// The headphones' materials, in three shader programs: every metal and hard surface is one, every soft surface
// another, and the soft shadow under the stand's foot the third. What each piece is made of rides on its vertices
// (the kind, in the cell attribute's x, and for the cups their own position in the cell's other three), and what
// varies across a surface is worked out here from the surface's own millimetres: the slot the hinge sits in and the
// microphone openings on each cup, the turning on the foot and the brushing up the post, the leather's grain and
// stitches, the knit of the cushions and the open knit of the canopy. Each is faded out before it is finer than a
// few pixels so nothing crawls. Turned and brushed metal reflect anisotropically, along the way the tool ran.

const col = (c: number) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
const tone = (n: PaletteName, k: number) => new THREE.Color(hex(n)).multiplyScalar(k).getHex();
const arr = <T>(type: string, xs: T[], f: (x: T) => string) => `${type}[${xs.length}](${xs.map(f).join(', ')})`;
const f = (v: number) => v.toFixed(4);

// How each metal is worked: its pattern, and which way it was turned or brushed.
const WORK = { none: -1, grain: 0, alu: 1, post: 2, foot: 3 } as const;

// The metals, neutral in themselves: the desk's white balance keeps them so under its warm light. Room is how much of
// the studio the metal takes, so a dark part still holds a line of light on its edges; an is how anisotropic its
// reflection is; spec is how much of the moving lights' reflection it takes, a coating less than bare metal.
interface Metal { color: number; rough: number; work: number; room: number; metal?: number; an?: number; spec?: number }
export const METAL = {
  // The cups: Space Gray anodised aluminium, satin, so they take a long soft reflection.
  alu: { color: 0x5c5c5c, rough: 0.27, work: WORK.alu, room: 3.6, metal: 0.82 },
  // The Digital Crown and the button: the same aluminium, a little finer.
  crown: { color: 0x6a6a6a, rough: 0.22, work: WORK.none, room: 3.8, metal: 0.9, spec: 1.4 },
  // The stems and hinges: polished stainless steel, the brightest thing on the pair.
  stem: { color: 0xdcdcdc, rough: 0.16, work: WORK.none, room: 6.0, spec: 1.8 },
  // The band's rails and housings: steel under a soft touch coating, near black, a matte sheen on their edges.
  coat: { color: 0x1c1c1c, rough: 0.42, work: WORK.none, room: 1.2, metal: 0, spec: 0.4 },
  // The stand's pins and collars: polished.
  polish: { color: 0xb0b0b0, rough: 0.08, work: WORK.none, room: 2.8 },
  // The post: dark steel brushed along its length.
  stand: { color: 0x5a5a5a, rough: 0.26, work: WORK.post, room: 4.0, an: 0.5 },
  // The saddle's cradle and the knuckle's cheeks: the same steel, satin, so broad faces hold the room's light.
  cradle: { color: 0x2e2e2e, rough: 0.34, work: WORK.none, room: 2.2, metal: 0.82 },
  // The foot: a heavy dark steel, turned, satin. Its top is mostly hide, so it never mirrors the room's lights whole.
  foot: { color: 0x383634, rough: 0.36, work: WORK.foot, room: 1.8, an: 0.55 },
  // The foot's turned side wall: the same steel, satin, without the turning's long reflection.
  wall: { color: 0x383634, rough: 0.4, work: WORK.none, room: 1.6 },
  // The foot's chamfers and steps: the same dark steel polished, so each holds one thin line of light and no more.
  edge: { color: 0x5e5c5a, rough: 0.22, work: WORK.none, room: 1.5 },
  copper: { color: tone('copper', 0.92), rough: 0.24, work: WORK.grain, room: 3 },
  // The line where a cushion is held to its cup, the gaps round the crown and button, and the mouth a stem slides out of.
  gap: { color: 0x0c0c0c, rough: 0.7, work: WORK.none, room: 0.3, metal: 0.3 },
} satisfies Record<string, Metal>;
export type MetalName = keyof typeof METAL;
const METALS = Object.keys(METAL) as MetalName[];

// The soft surfaces. Knit: the stitch's size across and along in millimetres, 0 for none, and how deep it is. Open is
// a knit with holes the light shows through. Sheen is how much the nap catches light that grazes it, and spec how
// much of a plain surface's reflection it keeps: cloth reflects little, so it reads matte beside the metal, and
// leather keeps more, a soft broad shine.
interface Soft { color: number; rough: number; knit: [number, number, number]; open: number; sheen: number; grain: number; spec: number; sew: number }
// What is sewn into each: 0 nothing, 2 the saddle pad's edges, 3 the foot's inlay, 4 the cloth over a driver, 5 the
// same with its cup's letter printed on it.
const SEW = { none: 0, edges: 2, inlay: 3, driver: 4, letter: 5 } as const;
export const SOFT = {
  // The canopy: an open knit, near black, its holes in rows the light shows through.
  canopy: { color: 0x1c1c1c, rough: 0.7, knit: [0, 0, 0], open: 1, sheen: 0.3, grain: 0, spec: 0.12, sew: SEW.none },
  // The cushions: a fine knitted mesh over foam, near black, with a soft sheen where the light grazes it.
  cushion: { color: 0x0a0a0a, rough: 0.9, knit: [1.7, 1.3, 0.9], open: 0, sheen: 0.18, grain: 0, spec: 0.02, sew: SEW.none },
  // The cloth over the drivers, inside the cushions.
  mesh: { color: 0x181818, rough: 0.95, knit: [0, 0, 0], open: 0, sheen: 0.15, grain: 0, spec: 0.15, sew: SEW.driver },
  // The left cup's cloth, with the large L printed on it.
  meshL: { color: 0x181818, rough: 0.95, knit: [0, 0, 0], open: 0, sheen: 0.15, grain: 0, spec: 0.15, sew: SEW.letter },
  // The saddle's pad: a mid dark hide, stitched along both edges.
  hide: { color: 0x22201e, rough: 0.5, knit: [0, 0, 0], open: 0, sheen: 0.3, grain: 1, spec: 0.8, sew: SEW.edges },
  // The pad let into the foot's top: the same hide, stitched round both edges.
  inlay: { color: 0x242220, rough: 0.55, knit: [0, 0, 0], open: 0, sheen: 0.3, grain: 1, spec: 0.7, sew: SEW.inlay },
  felt: { color: 0x111111, rough: 0.95, knit: [0, 0, 0], open: 0, sheen: 0.2, grain: 0, spec: 0.3, sew: SEW.none },
} satisfies Record<string, Soft>;
export type SoftName = keyof typeof SOFT;
const SOFTS = Object.keys(SOFT) as SoftName[];

// The thread: a mid grey, so the stitches read on the near black leather.
const THREAD = 0x5a5550;
// The letter printed on the cloth inside each cushion: a mid grey on the black knit.
const PRINT = 0x505050;

// How much of the room's light the metal takes against the lights that move, the cursor's above all.
const DIRECT = { room: 0.72, spec: 2.4, diffuse: 1.6, soft: 1.0 };

// Light the room and the cursor's lamp reflect off the metal is held under this, so a highlight on a polished edge is
// a crisp line and never blooms into a ball.
const HOLD = { knee: 1.0, top: 1.6 };

const VHEAD = 'attribute vec4 cell;\nvarying vec3 vHpLoc;\nvarying float vHpKind;\nvarying vec2 vHpUv;\nvarying vec3 vHpObj;\nvarying vec3 vHpAx;\nvarying vec3 vHpAy;\nvarying vec3 vHpAz;';
const VBODY = 'vHpKind = cell.x;\nvHpLoc = cell.yzw;\nvHpUv = uv;\nvHpObj = position;\nvHpAx = normalMatrix * vec3(1.0, 0.0, 0.0);\nvHpAy = normalMatrix * vec3(0.0, 1.0, 0.0);\nvHpAz = normalMatrix * vec3(0.0, 0.0, 1.0);';
const FHEAD = /* glsl */ `
varying vec3 vHpLoc;
varying float vHpKind;
varying vec2 vHpUv;
varying vec3 vHpObj;
varying vec3 vHpAx;
varying vec3 vHpAy;
varying vec3 vHpAz;
${NOISE}
float hpPx;
vec3 hpHeld(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m <= ${HOLD.knee.toFixed(2)}) return c; float e = m - ${HOLD.knee.toFixed(2)}; return c * (${HOLD.knee.toFixed(2)} + e / (1.0 + e / ${(HOLD.top - HOLD.knee).toFixed(2)})) / m; }
// How much of a feature of this size in millimetres can be drawn: none under two pixels, all of it from four.
float hpSee(float mm){ return smoothstep(2.0, 4.0, mm / hpPx); }
// A crisp mask, 1 under the edge at e, softened over a pixel.
float hpIn(float d, float e){ return 1.0 - smoothstep(e - 0.6 * hpPx, e + 0.6 * hpPx, d); }
// Fine rings across q, faded out before they get finer than a pixel.
float hpRings(float q, float s1, float s2){ float px = fwidth(q);
  float a1 = 1.0 - smoothstep(0.25, 0.6, s1 * px), a2 = 1.0 - smoothstep(0.25, 0.6, s2 * px);
  return 0.5 + (wNoise(vec3(q * 0.35, 1.0, 2.0)) - 0.5) * 0.2 * (1.0 - smoothstep(0.25, 0.6, 0.35 * px)) + (wNoise(vec3(q * s1, 5.0, 3.0)) - 0.5) * 0.45 * a1 + (wNoise(vec3(q * s2, 9.0, 1.0)) - 0.5) * 0.35 * a2; }
// A surface's normal bent by a height in millimetres, from its screen derivatives.
vec3 hpBump(vec3 N, float h){
  vec3 p = -vViewPosition, sx = dFdx(p), sy = dFdy(p);
  vec3 r1 = cross(sy, N), r2 = cross(N, sx);
  float det = dot(sx, r1);
  vec2 dh = vec2(dFdx(h), dFdy(h)) * 0.001;
  vec3 g = sign(det) * (dh.x * r1 + dh.y * r2);
  return normalize(N - g / max(abs(det), 1e-30));
}`;

function patch(m: THREE.MeshPhysicalMaterial, key: string, c: { head: string; color: string; rough: string; metal?: string; normal?: string; room?: string; physical?: [string, string, string]; post?: string }): void {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${VHEAD}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VBODY}`);
    let fr = sh.fragmentShader.replace('#include <common>', `#include <common>\n${FHEAD}\n${c.head}`);
    fr = fr.replace('#include <color_fragment>', `#include <color_fragment>\nhpPx = max(length(fwidth(vHpObj)) * 0.6, 1e-4);\n${c.color}`);
    fr = fr.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${c.rough}`);
    if (c.metal) fr = fr.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${c.metal}`);
    if (c.normal) fr = fr.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${c.normal}`);
    if (c.room) fr = fr.replace('#include <lights_fragment_end>', `${c.room}\n#include <lights_fragment_end>`);
    if (c.physical) fr = fr.replace('#include <lights_physical_fragment>', THREE.ShaderChunk.lights_physical_fragment.replace(c.physical[0], c.physical[1]) + c.physical[2]);
    fr = fr.replace('#include <opaque_fragment>', `${c.post ?? ''}\noutgoingLight = hpHeld(outgoingLight);\n#include <opaque_fragment>`);
    sh.fragmentShader = fr;
  };
  m.customProgramCacheKey = () => key;
}

function metalMaterial(): THREE.MeshPhysicalMaterial {
  // Anisotropy on turns on the program's anisotropic reflection; which way and how much is set per pixel below.
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3, anisotropy: 1 });
  m.name = 'hpMetal';
  const ms = METALS.map((n) => METAL[n] as Metal);
  patch(m, 'hp-metal-3', {
    head: `
const vec3 MC[${ms.length}] = ${arr('vec3', ms, (x) => col(x.color))};
const float MR[${ms.length}] = ${arr('float', ms, (x) => x.rough.toFixed(3))};
const float MW[${ms.length}] = ${arr('float', ms, (x) => x.work.toFixed(1))};
const float MRoom[${ms.length}] = ${arr('float', ms, (x) => x.room.toFixed(2))};
const float MM[${ms.length}] = ${arr('float', ms, (x) => (x.metal ?? 1).toFixed(2))};
const float MA[${ms.length}] = ${arr('float', ms, (x) => (x.an ?? 0).toFixed(2))};
const float MS[${ms.length}] = ${arr('float', ms, (x) => (x.spec ?? 1).toFixed(2))};
const vec3 C_GAP = ${col(METAL.gap.color)};
// What one pixel of metal is: its color, roughness, metalness, height in millimetres, how much of the room it takes,
// how anisotropic it is and which way, in the mesh's own frame.
vec3 hpC; float hpR, hpM, hpH, hpRm, hpAn; vec3 hpT;

// The cup's aluminium, in the cup's own frame (x out from the joint, y up from its middle, z across): the slot in its
// top the hinge sits in, and the microphone openings, a row of three on the top and on the bottom.
void hpAlu(){
  vec3 L = vHpLoc;
  hpR += 0.04 * (wNoise(L * 0.9) - 0.5);
  if (L.y > ${f(CUP.ry * 0.8)}) {
    vec2 d = abs(vec2(L.x - ${f(CUP.deep / 2)}, L.z)) - vec2(${f(SLOT.x - 2)}, ${f(SLOT.z - 2)});
    float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 2.0;
    float slot = hpIn(sd, 0.0), lip = hpIn(abs(sd + 0.25), 0.25) * hpSee(0.5);
    hpC = mix(hpC, C_GAP, slot); hpR = mix(hpR, 0.7, slot); hpM = mix(hpM, 0.3, slot);
    hpH -= slot * 0.9 + lip * 0.15;
  }
  float see = hpSee(${f(MIC.r * 2)});
  if (see > 0.0 && abs(L.y) > ${f(CUP.ry * 0.85)} && L.x < ${f(CUP.deep - CUP.edge)}) {
    float hole = 0.0;
    for (int k = -1; k <= 1; k++) hole = max(hole, hpIn(length(vec2(L.x - ${f(MIC.x)} - float(k) * ${f(MIC.step)}, L.z - ${f(MIC.z)})), ${f(MIC.r)}));
    hole *= see;
    hpC = mix(hpC, C_GAP * 0.5, hole); hpR = mix(hpR, 0.8, hole); hpM = mix(hpM, 0.2, hole);
    hpH -= hole * 0.4;
  }
}

void hpMetalAt(int k){
  float w = MW[k];
  hpC = MC[k]; hpR = MR[k]; hpM = MM[k]; hpH = 0.0; hpRm = MRoom[k]; hpAn = MA[k]; hpT = vec3(1.0, 0.0, 0.0);
  if (w > 2.5) {
    float r = length(vHpObj.xz), t = hpRings(r, 2.4, 7.5);
    hpC *= 0.9 + 0.2 * t; hpR = clamp(hpR + 0.1 * (t - 0.5), 0.04, 1.0);
    hpT = vec3(vHpObj.x, 0.0, vHpObj.z);
  }
  else if (w > 1.5) {
    float t = hpRings(vHpUv.x * 0.8 + wNoise(vHpObj * 0.3) * 1.5, 3.0, 9.0);
    hpC *= 0.9 + 0.2 * t; hpR = clamp(hpR + 0.1 * (t - 0.5), 0.04, 1.0);
    hpT = vec3(-vHpObj.z, 0.0, vHpObj.x);
  }
  else if (w > 0.5) { hpAlu(); }
  else if (w > -0.5) { float t = 0.5 + (wNoise(vHpObj * 0.6) - 0.5) * 0.25; hpC *= 0.9 + 0.2 * t; }
}`,
    color: `
  int mk = int(vHpKind + 0.5);
  hpMetalAt(mk);
  diffuseColor.rgb = hpC;`,
    rough: 'roughnessFactor = clamp(hpR, 0.04, 1.0);',
    metal: 'metalnessFactor = hpM;',
    normal: 'normal = hpBump(normal, hpH);',
    // The room is a fixed light, so the metal takes less of it and more of the lights that move: the cursor's light
    // slides its reflections across the shells, the rails and the foot.
    room: `radiance *= hpRm * ${f(DIRECT.room)}; reflectedLight.directSpecular *= ${f(DIRECT.spec)} * MS[mk]; reflectedLight.directDiffuse *= ${f(DIRECT.diffuse)};`,
    // The way the metal was worked, turned into the view's frame and laid on the surface; a tangent that comes out
    // along the normal falls back to any line across it, so nothing is ever normalised from nothing.
    physical: ['', '', `
  {
    vec3 hpTv = hpT.x * vHpAx + hpT.y * vHpAy + hpT.z * vHpAz;
    hpTv -= normal * dot(hpTv, normal);
    float tl = length(hpTv);
    if (tl < 1e-4) { hpTv = cross(normal, abs(normal.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)); tl = max(length(hpTv), 1e-4); }
    hpTv /= tl;
    material.anisotropy = clamp(hpAn, 0.0, 1.0);
    material.alphaT = mix(pow2(material.roughness), 1.0, pow2(material.anisotropy));
    material.anisotropyT = hpTv;
    material.anisotropyB = cross(normal, hpTv);
  }`],
  });
  return m;
}

function softMaterial(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.8, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x8a8580) });
  m.name = 'hpSoft';
  const ss = SOFTS.map((n) => SOFT[n] as Soft);
  const stitch = (r: number) => (2 * Math.PI * r) / Math.round((2 * Math.PI * r) / 2.8);
  patch(m, 'hp-soft-3', {
    head: `
const vec3 SC[${ss.length}] = ${arr('vec3', ss, (x) => col(x.color))};
const float SR[${ss.length}] = ${arr('float', ss, (x) => x.rough.toFixed(3))};
const vec3 SK[${ss.length}] = ${arr('vec3', ss, (x) => `vec3(${x.knit.map((v) => v.toFixed(2)).join(', ')})`)};
const float SS[${ss.length}] = ${arr('float', ss, (x) => x.sheen.toFixed(2))};
const float SG[${ss.length}] = ${arr('float', ss, (x) => x.grain.toFixed(1))};
const float SSp[${ss.length}] = ${arr('float', ss, (x) => x.spec.toFixed(2))};
const float SO[${ss.length}] = ${arr('float', ss, (x) => x.open.toFixed(1))};
const float SW[${ss.length}] = ${arr('float', ss, (x) => x.sew.toFixed(1))};
const vec3 C_THREAD = ${col(THREAD)};
const vec3 C_PRINT = ${col(PRINT)};
float sKnitK, sSeen, sH, sThread;
// A knit: rows of small loops along v, the open stitch between columns darker.
float hpKnit(vec2 q, vec2 st){
  float su = 1.0 - smoothstep(0.2, 0.45, fwidth(q.x) / st.x);
  float sv = 1.0 - smoothstep(0.2, 0.45, fwidth(q.y) / st.y);
  sSeen = su * sv;
  float w = abs(fract(q.x / st.x) - 0.5) * 2.0;
  float row = fract(q.y / st.y + w * 0.55);
  float loop = smoothstep(0.0, 0.35, row) * (1.0 - smoothstep(0.55, 1.0, row));
  float gap = smoothstep(0.8, 1.0, w);
  return clamp(loop * (1.0 - gap), 0.0, 1.0);
}
// A row of stitches along s, t across from its line, both in millimetres, each a short slanted dash of thread
// pulled into the leather at its ends. Seen from far, a faint line.
void hpStitch(float s, float t, float per){
  float see = hpSee(per);
  float ph = fract(s / per);
  float dash = smoothstep(0.04, 0.16, ph) * (1.0 - smoothstep(0.66, 0.78, ph));
  float tt = t + (ph - 0.42) * 0.35;
  float thread = dash * hpIn(abs(tt), 0.34);
  float near = hpIn(abs(t), 0.6);
  sThread = max(sThread, mix(near * 0.25, thread, see));
  sH += see * (thread * 0.22 * sqrt(max(0.0, 1.0 - tt * tt / 0.12)) - (1.0 - dash) * near * 0.12);
}`,
    color: `
  int sk = int(vHpKind + 0.5);
  sKnitK = 0.5; sSeen = 0.0; sH = 0.0; sThread = 0.0;
  diffuseColor.rgb = SC[sk] * (0.94 + 0.12 * wFbm(vHpObj * 0.07));
  if (SK[sk].x > 0.0) {
    sKnitK = hpKnit(vHpUv, SK[sk].xy);
    diffuseColor.rgb *= mix(1.0, 0.6 + 0.7 * sKnitK, sSeen);
  } else if (SG[sk] > 0.5) {
    // A fine pebble, pressed into the hide.
    vec3 q = vHpObj * 1.7;
    sSeen = hpSee(0.9);
    sKnitK = smoothstep(0.3, 0.7, wNoise(q) * 0.6 + wNoise(q * 2.3 + 4.0) * 0.4);
    diffuseColor.rgb *= mix(1.0, 0.86 + 0.24 * sKnitK, sSeen);
    sH += 0.09 * sKnitK * sSeen;
  }
  if (SO[sk] > 0.5) {
    // The canopy's open knit: diamond holes in staggered rows, u across the band and v along it. The holes open only
    // once each is a few pixels across, and the yarn between them is lit as round strands.
    vec2 q = vHpUv / vec2(2.2, 1.8);
    q.x += 0.5 * mod(floor(q.y), 2.0);
    vec2 a = abs(fract(q) - 0.5);
    float dd = a.x + a.y, see = hpSee(1.6);
    float hole = 1.0 - smoothstep(0.24, 0.32, dd);
    if (hole * see > 0.5) discard;
    // Each strand is round: brightest along its middle, falling into the holes either side. Too fine to draw, the
    // knit is what it averages to, holes and all.
    float strand = smoothstep(0.3, 0.42, dd);
    sSeen = see; sKnitK = strand;
    diffuseColor.rgb *= mix(0.4, 0.45 + 0.8 * strand, see);
    sH += 0.25 * strand * see;
  }
  float sw = SW[sk];
  if (sw > 1.5 && sw < 2.5) {
    float e = abs(vHpUv.x) - ${f(SADDLE.wide - 2.6)};
    hpStitch(vHpUv.y, e, 2.8);
  } else if (sw > 2.5 && sw < 3.5) {
    float r = length(vHpObj.xz), a = atan(vHpObj.z, vHpObj.x);
    hpStitch(a * ${f(BASE.pad[1] - 2.4)}, r - ${f(BASE.pad[1] - 2.4)}, ${f(stitch(BASE.pad[1] - 2.4))});
    hpStitch(a * ${f(BASE.pad[0] + 2.2)}, r - ${f(BASE.pad[0] + 2.2)}, ${f(stitch(BASE.pad[0] + 2.2))});
  } else if (sw > 3.5) {
    // The cloth over the driver: a fine square weave, and behind it the driver's ring and its middle.
    vec2 q = vHpLoc.zy;
    vec2 wv = abs(fract(q / 0.7) - 0.5);
    float weave = smoothstep(0.18, 0.32, min(wv.x, wv.y));
    float see = hpSee(0.7);
    diffuseColor.rgb *= mix(0.85, 0.7 + 0.5 * weave, see);
    float r = length(q);
    float ring = hpIn(abs(r - 17.0), 1.1) * 0.6 + hpIn(r, 5.0) * 0.35;
    diffuseColor.rgb *= 1.0 + ring * (1.0 - step(4.5, sw));
    if (sw > 4.5) {
      // The L, as the knit prints it: a tall stroke and its foot, read from inside the cup.
      vec2 b1 = abs(q - vec2(-5.5, 0.0)) - vec2(1.4, 11.0), b2 = abs(q - vec2(0.5, -9.6)) - vec2(7.4, 1.4);
      float d = min(length(max(b1, 0.0)) + min(max(b1.x, b1.y), 0.0), length(max(b2, 0.0)) + min(max(b2.x, b2.y), 0.0));
      diffuseColor.rgb = mix(diffuseColor.rgb, C_PRINT, hpIn(d, 0.0) * 0.9);
    }
  }
  diffuseColor.rgb = mix(diffuseColor.rgb, C_THREAD, sThread);`,
    rough: 'roughnessFactor = clamp(SR[sk] + 0.12 * (0.5 - sKnitK) * sSeen + 0.3 * sThread, 0.05, 1.0);',
    normal: `
  if (SK[sk].x > 0.0 && sSeen > 0.0) {
    vec2 g = vec2(dFdx(sKnitK), dFdy(sKnitK)) * SK[sk].z * sSeen;
    normal = normalize(normal + vec3(-g.x, -g.y, 0.0));
  }
  normal = hpBump(normal, sH);`,
    physical: ['material.sheenColor = sheenColor;', 'material.sheenColor = sheenColor * SS[sk];', '\nmaterial.specularF90 *= SSp[sk] * (1.0 - 0.6 * sThread); material.specularColor *= SSp[sk]; material.specularColorBlended = material.specularColor;'],
    // The open stitches are shadowed whatever light lands on the cloth, its sheen and the room's reflection included.
    room: `reflectedLight.directDiffuse *= ${f(DIRECT.soft)}; reflectedLight.directSpecular *= ${f(DIRECT.soft)};`,
    post: 'if (SK[sk].x > 0.0) outgoingLight *= mix(1.0, 0.62 + 0.6 * sKnitK, sSeen);',
  });
  return m;
}

// The soft dark under the stand's foot, where it stands on the timber: a disc whose alpha falls off from the middle.
function shadowMaterial(): THREE.MeshBasicMaterial {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.62, 'rgba(255,255,255,0.85)');
  r.addColorStop(0.8, 'rgba(255,255,255,0.3)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = true;
  t.anisotropy = 4;
  const m = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: t, transparent: true, opacity: 0.72, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  m.name = 'hpShadow';
  return m;
}

export interface Handle { mat: THREE.Material; kind: number; cast: boolean }
export interface HeadphonesMats { metal: THREE.MeshPhysicalMaterial; soft: THREE.MeshPhysicalMaterial; shadow: THREE.MeshBasicMaterial }
export type Of = Record<MetalName | SoftName, Handle>;

export function headphonesMaterials(): { mats: HeadphonesMats; of: Of; kindOf: Record<MetalName | SoftName, number> } {
  const mats: HeadphonesMats = { metal: metalMaterial(), soft: softMaterial(), shadow: shadowMaterial() };
  const cast: Partial<Record<MetalName | SoftName, boolean>> = { alu: true, coat: true, cushion: true, polish: true, stand: true, cradle: true, foot: true, wall: true, canopy: true, hide: true, inlay: true };
  const of = {} as Of, kindOf = {} as Record<MetalName | SoftName, number>;
  METALS.forEach((n, i) => { of[n] = { mat: mats.metal, kind: i, cast: !!cast[n] }; kindOf[n] = i; });
  SOFTS.forEach((n, i) => { of[n] = { mat: mats.soft, kind: i, cast: !!cast[n] }; kindOf[n] = i; });
  return { mats, of, kindOf };
}
