import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { NOISE } from '../../../../world/surface';
import { BASE, CUP, CUSHION, FACE, SADDLE } from './form';

// The headphones' materials, in three shader programs: every metal is one, every soft surface another, and the soft
// shadow under the stand's foot the third. What each piece is made of rides on its vertices (the kind, in the cell
// attribute's x), and what varies across a surface is worked out here from the surface's own millimetres: the cup's
// face (its band, screws, bead, perforations and turned medallion), the slot and size marks on each stem, the turning
// on the foot and the brushing up the post, the leather's grain, pleats and stitches, the knit of the canopy. Each is
// faded out before it is finer than a few pixels so nothing crawls. Turned and brushed metal reflect anisotropically,
// along the way the tool ran.

const col = (c: number) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
const tone = (n: PaletteName, k: number) => new THREE.Color(hex(n)).multiplyScalar(k).getHex();
const arr = <T>(type: string, xs: T[], f: (x: T) => string) => `${type}[${xs.length}](${xs.map(f).join(', ')})`;
const f = (v: number) => v.toFixed(4);

// How each metal is worked: its pattern, and which way it was turned or brushed.
const WORK = { none: -1, grain: 0, face: 1, post: 2, foot: 3, shell: 4, rail: 5, stem: 6, medal: 7 } as const;

// The metals, neutral in themselves: the desk's white balance keeps them so under its warm light. Room is how much of
// the studio the metal takes, so a dark part still holds a line of light on its edges; an is how anisotropic its
// reflection is.
interface Metal { color: number; rough: number; work: number; room: number; metal?: number; an?: number }
export const METAL = {
  // The cups: a satin dark steel, its sides brushed round the cup so their reflections draw out along its depth.
  body: { color: 0x6c6c6c, rough: 0.3, work: WORK.shell, room: 3.2, metal: 0.75, an: 0.4 },
  // The housings at the band's ends and the lugs the cups hang from: near black, satin, against the steel.
  dark: { color: 0x2a2a2a, rough: 0.3, work: WORK.none, room: 3.2, metal: 0.75 },
  // The face inside the chamfer: its own regions are worked out in hpFace.
  face: { color: 0x262626, rough: 0.34, work: WORK.face, room: 2.8, metal: 0.6 },
  // The yokes at the stems' feet: blackened steel, matte enough that their flat tops never hold the room whole.
  yoke: { color: 0x262626, rough: 0.48, work: WORK.none, room: 1.6, metal: 0.8 },
  // The chamfers, pins and beads: polished.
  polish: { color: 0xb0b0b0, rough: 0.08, work: WORK.none, room: 2.8 },
  // The post: dark steel brushed along its length.
  stand: { color: 0x5a5a5a, rough: 0.26, work: WORK.post, room: 4.0, an: 0.5 },
  // The saddle's cradle and the knuckle's cheeks: the same steel, satin, so broad faces hold the room's light.
  cradle: { color: 0x646464, rough: 0.3, work: WORK.none, room: 3.6, metal: 0.82 },
  // The foot: a heavy dark steel, turned, satin. Its top is mostly hide, so it never mirrors the room's lights whole.
  foot: { color: 0x383634, rough: 0.36, work: WORK.foot, room: 1.8, an: 0.55 },
  // The foot's turned side wall: the same steel, satin, without the turning's long reflection.
  wall: { color: 0x383634, rough: 0.4, work: WORK.none, room: 1.6 },
  // The foot's chamfers and steps: the same dark steel polished, so each holds one thin line of light and no more.
  edge: { color: 0x5e5c5a, rough: 0.22, work: WORK.none, room: 1.5 },
  copper: { color: tone('copper', 0.92), rough: 0.24, work: WORK.grain, room: 3 },
  // The seam where a cup meets its cushion, the groove round its side, and the mouth a stem slides out of.
  gap: { color: 0x0e0e0e, rough: 0.7, work: WORK.none, room: 0.3 },
  // The band's two flat sprung steel rails, brushed along their length.
  rail: { color: 0x8a8a8a, rough: 0.14, work: WORK.rail, room: 3.0, an: 0.35 },
  // The stems: flat polished bars with a slot down their middle and engraved size marks.
  stem: { color: 0xa4a4a4, rough: 0.1, work: WORK.stem, room: 2.8 },
  // The medallion in each face: turned steel, its reflection a long bar through its middle.
  medal: { color: 0x949494, rough: 0.3, work: WORK.medal, room: 3.0, metal: 0.55, an: 0.65 },
} satisfies Record<string, Metal>;
export type MetalName = keyof typeof METAL;
const METALS = Object.keys(METAL) as MetalName[];

// The soft surfaces. Knit: the stitch's size across and along in millimetres, 0 for none, and how deep it is. Sheen
// is how much the nap catches light that grazes it, and spec how much of a plain surface's reflection it keeps:
// cloth reflects little, so it reads matte beside the metal, and leather keeps more, a soft broad shine.
interface Soft { color: number; rough: number; knit: [number, number, number]; sheen: number; grain: number; spec: number; sew: number }
// What is sewn into each: 0 nothing, 1 the cushion's welt, 2 the saddle pad's edges, 3 the foot's inlay, 4 the cloth
// over a driver.
const SEW = { none: 0, welt: 1, edges: 2, inlay: 3, driver: 4 } as const;
export const SOFT = {
  canopy: { color: 0x232323, rough: 0.9, knit: [2.8, 2.0, 1.0], sheen: 0.2, grain: 0, spec: 0.2, sew: SEW.none },
  // The cushions: a soft near black leather over foam, a fine pebble, gathered into soft pleats round the opening and
  // the corners, sewn either side of the welt.
  cushion: { color: 0x201e1c, rough: 0.45, knit: [0, 0, 0], sheen: 0.15, grain: 1, spec: 0.24, sew: SEW.welt },
  // The cloth over the drivers, inside the cushions: a fine weave with the driver's ring behind it.
  mesh: { color: 0x2a2a2a, rough: 0.95, knit: [0, 0, 0], sheen: 0.12, grain: 0, spec: 0.15, sew: SEW.driver },
  // The saddle's pad: a mid dark hide, stitched along both edges.
  hide: { color: 0x34312e, rough: 0.5, knit: [0, 0, 0], sheen: 0.3, grain: 1, spec: 0.8, sew: SEW.edges },
  // The pad let into the foot's top: the same hide, stitched round both edges.
  inlay: { color: 0x242220, rough: 0.55, knit: [0, 0, 0], sheen: 0.3, grain: 1, spec: 0.7, sew: SEW.inlay },
  felt: { color: 0x111111, rough: 0.95, knit: [0, 0, 0], sheen: 0.2, grain: 0, spec: 0.3, sew: SEW.none },
  // The binding along the canopy's edges.
  binding: { color: 0x2a2a2a, rough: 0.5, knit: [0, 0, 0], sheen: 0.3, grain: 0, spec: 0.9, sew: SEW.none },
} satisfies Record<string, Soft>;
export type SoftName = keyof typeof SOFT;
const SOFTS = Object.keys(SOFT) as SoftName[];

// The thread: a mid grey, so the stitches read on the near black leather.
const THREAD = 0x5a5550;

// How much of the room's light the metal takes against the lights that move, the cursor's above all.
const DIRECT = { room: 0.72, spec: 2.4, diffuse: 1.6, soft: 1.0 };

// Light the room and the cursor's lamp reflect off the metal is held under this, so a highlight on a polished edge is
// a crisp line and never blooms into a ball.
const HOLD = { knee: 1.0, top: 1.6 };

const VHEAD = 'attribute vec4 cell;\nvarying float vHpKind;\nvarying vec2 vHpUv;\nvarying vec3 vHpObj;\nvarying vec3 vHpAx;\nvarying vec3 vHpAy;\nvarying vec3 vHpAz;';
const VBODY = 'vHpKind = cell.x;\nvHpUv = uv;\nvHpObj = position;\nvHpAx = normalMatrix * vec3(1.0, 0.0, 0.0);\nvHpAy = normalMatrix * vec3(0.0, 1.0, 0.0);\nvHpAz = normalMatrix * vec3(0.0, 0.0, 1.0);';
const FHEAD = /* glsl */ `
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

// The screws sit on the face's diagonals, where its superellipse outline is 2^(-1/n) of its half sizes across and up.
const DIAG = Math.pow(2, -1 / FACE.n);

function metalMaterial(): THREE.MeshPhysicalMaterial {
  // Anisotropy on turns on the program's anisotropic reflection; which way and how much is set per pixel below.
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3, anisotropy: 1 });
  m.name = 'hpMetal';
  const ms = METALS.map((n) => METAL[n] as Metal);
  patch(m, 'hp-metal-2', {
    head: `
const vec3 MC[${ms.length}] = ${arr('vec3', ms, (x) => col(x.color))};
const float MR[${ms.length}] = ${arr('float', ms, (x) => x.rough.toFixed(3))};
const float MW[${ms.length}] = ${arr('float', ms, (x) => x.work.toFixed(1))};
const float MRoom[${ms.length}] = ${arr('float', ms, (x) => x.room.toFixed(2))};
const float MM[${ms.length}] = ${arr('float', ms, (x) => (x.metal ?? 1).toFixed(2))};
const float MA[${ms.length}] = ${arr('float', ms, (x) => (x.an ?? 0).toFixed(2))};
const vec3 C_LAND = ${col(0x6c6c6c)};
const vec3 C_HOLE = ${col(0x080808)};
const vec3 C_POLISH = ${col(METAL.polish.color)};
const vec3 C_COPPER = ${col(METAL.copper.color)};
const vec3 C_GAP = ${col(METAL.gap.color)};
// What one pixel of metal is: its color, roughness, metalness, height in millimetres, how much of the room it takes,
// how anisotropic it is and which way, in the mesh's own frame.
vec3 hpC; float hpR, hpM, hpH, hpRm, hpAn; vec3 hpT;

void hpScrew(vec2 q){
  vec2 d = abs(q) - vec2(${f(FACE.screw * DIAG * FACE.fz)}, ${f(FACE.screw * DIAG * FACE.fy)});
  float ds = length(d), R = ${f(FACE.screwR)}, see = hpSee(R * 2.0);
  if (ds > R + 0.5 || see <= 0.0) return;
  // A countersink round the head, the domed head, and a six lobed socket in its middle.
  float sink = (1.0 - hpIn(ds, R)) * hpIn(ds, R + 0.35);
  float head = hpIn(ds, R);
  vec2 s = abs(d);
  float hx = max(s.x * 0.866 + s.y * 0.5, s.y);
  float sock = hpIn(hx, 0.42) * head;
  hpC = mix(hpC, C_GAP, sink * see);
  hpC = mix(hpC, C_POLISH * 0.8, head * see);
  hpC = mix(hpC, C_HOLE, sock * see);
  hpR = mix(hpR, 0.14, head * see);
  hpM = mix(hpM, 1.0, head * see);
  hpH += see * (head * 0.35 * sqrt(max(0.0, 1.0 - (ds * ds) / (R * R))) - sink * 0.15 - sock * 0.25);
}

void hpFace(vec2 q){
  float FN = ${f(FACE.n)};
  float sr = pow(pow(abs(q.x) / ${f(FACE.fz)}, FN) + pow(abs(q.y) / ${f(FACE.fy)}, FN), 1.0 / FN);
  float r = length(q), srPx = hpPx / ${f(FACE.fz)};
  float band = smoothstep(${f(FACE.band)} - srPx, ${f(FACE.band)} + srPx, sr);
  float bead = smoothstep(${f(FACE.bead)} - srPx, ${f(FACE.bead)} + srPx, sr) * (1.0 - band);
  float field = (1.0 - band - bead) * smoothstep(${f(FACE.medal + 1.1)} - hpPx, ${f(FACE.medal + 1.1)} + hpPx, r);
  float well = (1.0 - band - bead) * (1.0 - field);
  // The perforations, in a hex grid; under a few pixels they are drawn as what they average to.
  vec2 P = vec2(${f(FACE.holes[0])}, ${f(FACE.holes[0] * Math.sqrt(3))});
  vec2 a = mod(q, P) - 0.5 * P, b = mod(q - 0.5 * P, P) - 0.5 * P;
  float dh = min(length(a), length(b)), see = hpSee(${f(FACE.holes[0])});
  float hole = mix(${f((Math.PI * FACE.holes[1] ** 2) / (FACE.holes[0] ** 2 * 0.866))}, hpIn(dh, ${f(FACE.holes[1])}), see);
  // Each region's look: the band anodised near black, the bead polished, the field a grey steel let full of holes,
  // the well round the medallion a dark groove.
  hpC = MC[${METALS.indexOf('face')}]; hpR = MR[${METALS.indexOf('face')}]; hpM = MM[${METALS.indexOf('face')}]; hpH = 0.0; hpRm = MRoom[${METALS.indexOf('face')}]; hpAn = 0.0;
  vec3 land = mix(C_LAND, C_HOLE, hole);
  hpC = hpC * band + C_POLISH * bead + land * field + C_GAP * well;
  hpR = hpR * band + 0.07 * bead + mix(0.36, 0.85, hole) * field + 0.7 * well;
  hpM = hpM * band + 1.0 * bead + mix(0.5, 0.0, hole) * field + 0.2 * well;
  hpH = 0.22 * bead - 0.3 * hole * see * field - 0.35 * well;
  hpScrew(q);
}

void hpMedal(vec2 q){
  float r = length(q);
  float turn = hpRings(r, 2.6, 8.0);
  hpC = MC[${METALS.indexOf('medal')}] * (0.9 + 0.2 * turn);
  hpR = clamp(MR[${METALS.indexOf('medal')}] + 0.08 * (turn - 0.5), 0.05, 1.0);
  hpM = MM[${METALS.indexOf('medal')}]; hpH = 0.0; hpRm = MRoom[${METALS.indexOf('medal')}];
  // The turning: shallow grooves cut round the middle inside the ticks, each a soft V.
  float gq = r / ${f(FACE.rings)}, gv = abs(fract(gq) - 0.5) * 2.0, gs = hpSee(${f(FACE.rings)}) * step(r, ${f(FACE.ticks[0] - 0.6)}) * step(3.2, r);
  hpC *= 1.0 - 0.28 * gs * (1.0 - smoothstep(0.0, 0.45, gv));
  hpH -= 0.12 * gs * (1.0 - gv);
  // Twenty four engraved ticks, every sixth one longer.
  float ang = atan(q.y, q.x) * ${f(24 / (2 * Math.PI))};
  float dt = abs(fract(ang + 0.5) - 0.5) * ${f((2 * Math.PI) / 24)} * r;
  float major = step(mod(floor(ang + 0.5), 6.0), 0.5);
  float inT = step(mix(${f(FACE.ticks[1])}, ${f(FACE.ticks[0])}, major), r) * step(r, ${f(FACE.ticks[2])});
  float tick = hpIn(dt, mix(0.22, 0.32, major)) * inT * hpSee(1.4);
  hpC = mix(hpC, C_HOLE * 2.0, tick);
  hpR = mix(hpR, 0.6, tick);
  hpH -= 0.12 * tick;
  // The copper line let in outside the ticks.
  float inlay = hpIn(${f(FACE.inlay[0])} - r, 0.0) * hpIn(r, ${f(FACE.inlay[1])});
  inlay = mix(0.0, inlay, hpSee(0.5));
  hpC = mix(hpC, C_COPPER, inlay);
  hpR = mix(hpR, 0.22, inlay);
  // The boss at its middle: polished, with a fine ring cut round it.
  float boss = hpIn(r, 2.1), cut = hpIn(abs(r - 2.35), 0.14) * hpSee(0.8);
  hpC = mix(hpC, C_POLISH, boss); hpR = mix(hpR, 0.07, boss);
  hpC = mix(hpC, C_GAP, cut);
  hpH += boss * 0.15 * (1.0 - r * r / 4.4) - cut * 0.1;
  hpAn = MA[${METALS.indexOf('medal')}] * (1.0 - boss);
}

// The stem's slot down its middle, and the engraved size marks beside it.
void hpStem(vec2 uv){
  float u = uv.x, v = uv.y;
  float d = length(vec2(u, v - clamp(v, 11.0, 29.0)));
  float slot = hpIn(d, 1.0) * hpSee(2.0);
  float k = clamp(floor((v - 12.0) / 3.0 + 0.5), 0.0, 5.0);
  float dm = abs(v - (12.0 + 3.0 * k));
  float mark = hpIn(dm, 0.14) * step(1.8, abs(u)) * step(abs(u), mix(2.9, 3.6, step(mod(k, 2.0), 0.5))) * hpSee(0.8);
  hpC = mix(hpC, C_HOLE, max(slot, mark * 0.8));
  hpR = mix(hpR, 0.7, max(slot, mark));
  hpH -= slot * 0.6 * smoothstep(1.0, 0.5, d) + mark * 0.1;
}

void hpMetalAt(int k){
  float w = MW[k];
  hpC = MC[k]; hpR = MR[k]; hpM = MM[k]; hpH = 0.0; hpRm = MRoom[k]; hpAn = MA[k]; hpT = vec3(1.0, 0.0, 0.0);
  vec2 q = vec2(vHpObj.z, vHpObj.y - ${f(FACE.yc)});
  if (w > 6.5) { hpMedal(q); hpT = vec3(0.0, q.y, q.x); }
  else if (w > 5.5) { hpStem(vHpUv); }
  else if (w > 4.5) { hpT = vec3(0.0, 0.0, 1.0); }
  else if (w > 3.5) { hpT = vec3(1.0, 0.0, 0.0); }
  else if (w > 2.5) {
    float r = length(vHpObj.xz), t = hpRings(r, 2.4, 7.5);
    hpC *= 0.9 + 0.2 * t; hpR = clamp(hpR + 0.1 * (t - 0.5), 0.04, 1.0);
    hpT = vec3(vHpObj.x, 0.0, vHpObj.z);
  }
  else if (w > 1.5) {
    float t = hpRings(vHpUv.x * 0.8 + wNoise(vHpObj * 0.3) * 1.5, 3.0, 9.0);
    hpC *= 0.9 + 0.2 * t; hpR = clamp(hpR + 0.1 * (t - 0.5), 0.04, 1.0);
    hpT = vec3(-vHpObj.z, 0.0, vHpObj.x);
  }
  else if (w > 0.5) { hpFace(q); hpT = vec3(0.0, q.y, q.x); }
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
    room: `radiance *= hpRm * ${f(DIRECT.room)}; reflectedLight.directSpecular *= ${f(DIRECT.spec)}; reflectedLight.directDiffuse *= ${f(DIRECT.diffuse)};`,
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
  patch(m, 'hp-soft-2', {
    head: `
const vec3 SC[${ss.length}] = ${arr('vec3', ss, (x) => col(x.color))};
const float SR[${ss.length}] = ${arr('float', ss, (x) => x.rough.toFixed(3))};
const vec3 SK[${ss.length}] = ${arr('vec3', ss, (x) => `vec3(${x.knit.map((v) => v.toFixed(2)).join(', ')})`)};
const float SS[${ss.length}] = ${arr('float', ss, (x) => x.sheen.toFixed(2))};
const float SG[${ss.length}] = ${arr('float', ss, (x) => x.grain.toFixed(1))};
const float SSp[${ss.length}] = ${arr('float', ss, (x) => x.spec.toFixed(2))};
const float SW[${ss.length}] = ${arr('float', ss, (x) => x.sew.toFixed(1))};
const vec3 C_THREAD = ${col(THREAD)};
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
  float sw = SW[sk];
  if (sw > 0.5 && sw < 1.5) {
    // The cushion: soft pleats where the cover is gathered, at its corners and round the opening, and the stitches
    // either side of the welt.
    vec2 c = vec2(vHpObj.z / ${f(CUP.rz)}, (vHpObj.y - ${f(FACE.yc)}) / ${f(CUP.ry)});
    float corner = smoothstep(0.3, 0.6, abs(c.x * c.y));
    float v = vHpUv.y, L = ${f(CUSHION.len)};
    float gather = max(1.0 - smoothstep(2.0, 7.0, v), smoothstep(L - 18.0, L - 6.0, v)) * corner;
    float pq = vHpUv.x / 9.0 + 0.5 * wNoise(vec3(vHpUv.x * 0.05, v * 0.08, 3.0));
    float pleat = pow(0.5 + 0.5 * cos(6.2831853 * pq), 3.0) * smoothstep(0.35, 0.8, wNoise(vec3(floor(pq) * 1.7, v * 0.05, 5.0)));
    float pSee = hpSee(4.0);
    sH -= 0.6 * pleat * gather * pSee;
    diffuseColor.rgb *= 1.0 - 0.1 * pleat * gather * pSee;
    hpStitch(vHpUv.x, v - ${f(CUSHION.welt - 1.7)}, 2.6);
    hpStitch(vHpUv.x + 1.3, v - ${f(CUSHION.welt + 1.7)}, 2.6);
  } else if (sw > 1.5 && sw < 2.5) {
    float e = abs(vHpUv.x) - ${f(SADDLE.wide - 2.6)};
    hpStitch(vHpUv.y, e, 2.8);
  } else if (sw > 2.5 && sw < 3.5) {
    float r = length(vHpObj.xz), a = atan(vHpObj.z, vHpObj.x);
    hpStitch(a * ${f(BASE.pad[1] - 2.4)}, r - ${f(BASE.pad[1] - 2.4)}, ${f(stitch(BASE.pad[1] - 2.4))});
    hpStitch(a * ${f(BASE.pad[0] + 2.2)}, r - ${f(BASE.pad[0] + 2.2)}, ${f(stitch(BASE.pad[0] + 2.2))});
  } else if (sw > 3.5) {
    // The cloth over the driver: a fine square weave, and behind it the driver's ring and its middle.
    vec2 q = vec2(vHpObj.z, vHpObj.y - ${f(FACE.yc)});
    vec2 wv = abs(fract(q / 0.7) - 0.5);
    float weave = smoothstep(0.18, 0.32, min(wv.x, wv.y));
    float see = hpSee(0.7);
    diffuseColor.rgb *= mix(0.85, 0.7 + 0.5 * weave, see);
    float r = length(q);
    float ring = hpIn(abs(r - 17.0), 1.1) * 0.6 + hpIn(r, 5.0) * 0.35;
    diffuseColor.rgb *= 1.0 + ring;
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
  const cast: Partial<Record<MetalName | SoftName, boolean>> = { body: true, dark: true, face: true, polish: true, stand: true, cradle: true, foot: true, wall: true, canopy: true, hide: true, rail: true, inlay: true };
  const of = {} as Of, kindOf = {} as Record<MetalName | SoftName, number>;
  METALS.forEach((n, i) => { of[n] = { mat: mats.metal, kind: i, cast: !!cast[n] }; kindOf[n] = i; });
  SOFTS.forEach((n, i) => { of[n] = { mat: mats.soft, kind: i, cast: !!cast[n] }; kindOf[n] = i; });
  return { mats, of, kindOf };
}
