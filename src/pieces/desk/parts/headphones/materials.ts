import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { NOISE } from '../../../../world/surface';

// The headphones' materials, in three shader programs: every metal is one, every soft surface another, and the soft
// shadow under the stand's foot the third. What each piece is made of rides on its vertices (the kind, in the cell
// attribute's x), and what varies across a surface (the turning on a cup's face, the brushing up the post, the knit of
// the canopy and the cushions, the grain of the saddle's hide) is worked out here from the surface's own millimetres,
// each faded out before it is finer than a pixel so nothing crawls.

const col = (c: number) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
const tone = (n: PaletteName, k: number) => new THREE.Color(hex(n)).multiplyScalar(k).getHex();
const arr = <T>(type: string, xs: T[], f: (x: T) => string) => `${type}[${xs.length}](${xs.map(f).join(', ')})`;

// The metals, neutral in themselves: the desk's white balance keeps them so under its warm light. Finish: -1 none,
// 0 a fine grain, 1 turned in rings that follow the cup's face, 2 brushed up the post, 3 turned
// round the foot's middle. Room is how much of the studio the metal takes, so a dark part still holds a line of light
// on its edges.
interface Metal { color: number; rough: number; finish: number; room: number; metal?: number }
export const METAL = {
  // The cups, the housings and the pivots: a satin dark steel machined smooth, plainly grey beside the copper. Any
  // grain on it broke the one long reflection its edge carries into a wobble.
  body: { color: 0x7a7a7a, rough: 0.15, finish: -1, room: 3.4, metal: 0.88 },
  // The housings at the band's ends and the blocks the cups hang from: near black, satin, against the steel.
  dark: { color: 0x2e2e2e, rough: 0.28, finish: -1, room: 3.2, metal: 0.75 },
  // The panel let into each cup's face inside its chamfer: near black, anodised, turned in fine rings, so the steel
  // round it reads as a frame.
  face: { color: 0x2c2c2c, rough: 0.36, finish: 1, room: 2.6, metal: 0.55 },
  // The rails, the stems and the diamond cut chamfer round each face: polished.
  polish: { color: 0xb4b4b4, rough: 0.08, finish: -1, room: 2.8 },
  // The stand's post: dark steel, brushed.
  stand: { color: 0x5a5a5a, rough: 0.22, finish: 2, room: 4.2 },
  // The saddle's cradle: the same steel, satin, so its broad faces hold the room's light.
  cradle: { color: 0x686868, rough: 0.3, finish: -1, room: 3.6, metal: 0.82 },
  // The foot: dark steel, turned.
  foot: { color: 0x484848, rough: 0.26, finish: 3, room: 3.4 },
  copper: { color: tone('copper', 0.92), rough: 0.24, finish: 0, room: 3 },
  // The seam where a cup meets its cushion, and the slot a stem slides in.
  gap: { color: 0x101010, rough: 0.7, finish: -1, room: 0.3 },
} satisfies Record<string, Metal>;
export type MetalName = keyof typeof METAL;
const METALS = Object.keys(METAL) as MetalName[];

// The soft surfaces. Knit: the stitch's size across and along in millimetres, 0 for none, and how deep it is. Sheen
// is how much the cloth's nap catches light that grazes it, and spec how much of a plain surface's reflection it
// keeps: cloth reflects little, so it reads matte beside the metal.
interface Soft { color: number; rough: number; knit: [number, number, number]; sheen: number; grain: number; spec: number; pleat?: number }
export const SOFT = {
  // The canopy under the band: a dark knit.
  canopy: { color: 0x242424, rough: 0.9, knit: [2.8, 2.0, 1.0], sheen: 0.2, grain: 0, spec: 0.2 },
  // The cushions: a soft dark hide over foam, gathered into pleats round its walls where the cover is drawn in, with a
  // fine pebble. Pleat is their spacing in millimetres round the cushion.
  cushion: { color: 0x302d2a, rough: 0.6, knit: [0, 0, 0], sheen: 0.12, grain: 1, spec: 0.5, pleat: 6.5 },
  // The cloth over the drivers, inside the cushions.
  mesh: { color: 0x161616, rough: 0.95, knit: [0, 0, 0], sheen: 0.1, grain: 0, spec: 0.15 },
  // The saddle's pad: a dark hide with a fine pebble.
  hide: { color: 0x403c38, rough: 0.5, knit: [0, 0, 0], sheen: 0.3, grain: 1, spec: 0.9 },
  felt: { color: 0x111111, rough: 0.95, knit: [0, 0, 0], sheen: 0.2, grain: 0, spec: 0.3 },
  // The binding along the canopy's edges.
  binding: { color: 0x2a2a2a, rough: 0.5, knit: [0, 0, 0], sheen: 0.3, grain: 0, spec: 0.9 },
} satisfies Record<string, Soft>;
export type SoftName = keyof typeof SOFT;
const SOFTS = Object.keys(SOFT) as SoftName[];

// Light the room and the cursor's lamp reflect off the metal is held under this, so a highlight on a polished edge is
// a crisp line and never blooms into a ball.
const HOLD = { knee: 1.0, top: 1.6 };

const VHEAD = 'attribute vec4 cell;\nvarying float vHpKind;\nvarying vec2 vHpUv;\nvarying vec3 vHpObj;';
const VBODY = 'vHpKind = cell.x;\nvHpUv = uv;\nvHpObj = position;';
const FHEAD = /* glsl */ `
varying float vHpKind;
varying vec2 vHpUv;
varying vec3 vHpObj;
${NOISE}
vec3 hpHeld(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m <= ${HOLD.knee.toFixed(2)}) return c; float e = m - ${HOLD.knee.toFixed(2)}; return c * (${HOLD.knee.toFixed(2)} + e / (1.0 + e / ${(HOLD.top - HOLD.knee).toFixed(2)})) / m; }
// Fine rings across q, faded out before they get finer than a pixel.
float hpRings(float q, float s1, float s2){ float px = fwidth(q);
  float a1 = 1.0 - smoothstep(0.25, 0.6, s1 * px), a2 = 1.0 - smoothstep(0.25, 0.6, s2 * px);
  return 0.5 + (wNoise(vec3(q * 0.35, 1.0, 2.0)) - 0.5) * 0.2 * (1.0 - smoothstep(0.25, 0.6, 0.35 * px)) + (wNoise(vec3(q * s1, 5.0, 3.0)) - 0.5) * 0.45 * a1 + (wNoise(vec3(q * s2, 9.0, 1.0)) - 0.5) * 0.35 * a2; }`;

function patch(m: THREE.MeshPhysicalMaterial, key: string, c: { head: string; color: string; rough: string; metal?: string; normal?: string; room?: string; physical?: [string, string, string]; post?: string }): void {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${VHEAD}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VBODY}`);
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>\n${FHEAD}\n${c.head}`);
    f = f.replace('#include <color_fragment>', `#include <color_fragment>\n${c.color}`);
    f = f.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${c.rough}`);
    if (c.metal) f = f.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${c.metal}`);
    if (c.normal) f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${c.normal}`);
    if (c.room) f = f.replace('#include <lights_fragment_end>', `${c.room}\n#include <lights_fragment_end>`);
    if (c.physical) f = f.replace('#include <lights_physical_fragment>', THREE.ShaderChunk.lights_physical_fragment.replace(c.physical[0], c.physical[1]) + c.physical[2]);
    f = f.replace('#include <opaque_fragment>', `${c.post ?? ''}\noutgoingLight = hpHeld(outgoingLight);\n#include <opaque_fragment>`);
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => key;
}

function metalMaterial(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3 });
  m.name = 'hpMetal';
  const ms = METALS.map((n) => METAL[n] as Metal);
  patch(m, 'hp-metal', {
    head: `
const vec3 MC[${ms.length}] = ${arr('vec3', ms, (x) => col(x.color))};
const float MR[${ms.length}] = ${arr('float', ms, (x) => x.rough.toFixed(3))};
const float MF[${ms.length}] = ${arr('float', ms, (x) => x.finish.toFixed(1))};
const float MRoom[${ms.length}] = ${arr('float', ms, (x) => x.room.toFixed(2))};
const float MM[${ms.length}] = ${arr('float', ms, (x) => (x.metal ?? 1).toFixed(2))};
float hpFinish(int k){
  float f = MF[k];
  if (f > 2.5) return hpRings(length(vHpObj.xz), 2.4, 7.5);
  if (f > 1.5) return hpRings(vHpUv.x * 0.8 + wNoise(vHpObj * 0.3) * 1.5, 3.0, 9.0);
  if (f > 0.5) return hpRings(vHpUv.y, 2.6, 8.0);
  if (f > -0.5) return 0.5 + (wNoise(vHpObj * 0.6) - 0.5) * 0.25;
  return 0.5;
}`,
    color: `
  int mk = int(vHpKind + 0.5);
  float mfin = hpFinish(mk);
  diffuseColor.rgb = MC[mk] * (0.9 + 0.2 * mfin);`,
    rough: 'roughnessFactor = clamp(MR[mk] + 0.1 * (mfin - 0.5), 0.04, 1.0);',
    metal: 'metalnessFactor = MM[mk];',
    room: 'radiance *= MRoom[mk];',
  });
  return m;
}

function softMaterial(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.8, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x8a8580) });
  m.name = 'hpSoft';
  const ss = SOFTS.map((n) => SOFT[n] as Soft);
  patch(m, 'hp-soft', {
    head: `
const vec3 SC[${ss.length}] = ${arr('vec3', ss, (x) => col(x.color))};
const float SR[${ss.length}] = ${arr('float', ss, (x) => x.rough.toFixed(3))};
const vec3 SK[${ss.length}] = ${arr('vec3', ss, (x) => `vec3(${x.knit.map((v) => v.toFixed(2)).join(', ')})`)};
const float SS[${ss.length}] = ${arr('float', ss, (x) => x.sheen.toFixed(2))};
const float SG[${ss.length}] = ${arr('float', ss, (x) => x.grain.toFixed(1))};
const float SSp[${ss.length}] = ${arr('float', ss, (x) => x.spec.toFixed(2))};
const float SP[${ss.length}] = ${arr('float', ss, (x) => (x.pleat ?? 0).toFixed(2))};
float sPl;
float sKnitK, sSeen;
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
}`,
    color: `
  int sk = int(vHpKind + 0.5);
  sKnitK = 0.5; sSeen = 0.0;
  diffuseColor.rgb = SC[sk] * (0.94 + 0.12 * wFbm(vHpObj * 0.07));
  if (SK[sk].x > 0.0) {
    sKnitK = hpKnit(vHpUv, SK[sk].xy);
    diffuseColor.rgb *= mix(1.0, 0.6 + 0.7 * sKnitK, sSeen);
  } else if (SG[sk] > 0.5) {
    vec3 q = vHpObj * 1.6;
    sSeen = 1.0 - smoothstep(0.25, 0.55, length(fwidth(q)));
    sKnitK = smoothstep(0.3, 0.7, wNoise(q) * 0.6 + wNoise(q * 2.3 + 4.0) * 0.4);
    diffuseColor.rgb *= mix(1.0, 0.8 + 0.35 * sKnitK, sSeen);
  }
  sPl = 0.0;
  if (SP[sk] > 0.0) {
    // Pleats: narrow creases round the walls, each its own depth, gone on the face where the cover lies flat, and
    // gone before they are finer than a few pixels.
    float pq = vHpUv.x / SP[sk] + 0.35 * (wNoise(vec3(vHpUv.x * 0.09, vHpUv.y * 0.12, 3.0)) - 0.5);
    float pSeen = 1.0 - smoothstep(0.12, 0.3, fwidth(pq));
    float walls = max(1.0 - smoothstep(11.0, 17.0, vHpUv.y), smoothstep(30.0, 36.0, vHpUv.y));
    float crease = pow(1.0 - abs(sin(3.14159265 * pq)), 5.0) * smoothstep(0.25, 0.85, wNoise(vec3(floor(pq + 0.5) * 1.7, vHpUv.y * 0.08, 5.0)));
    sPl = crease * walls * pSeen;
    diffuseColor.rgb *= 1.0 - 0.35 * sPl;
  }`,
    rough: 'roughnessFactor = clamp(SR[sk] + 0.12 * (0.5 - sKnitK) * sSeen + 0.2 * sPl, 0.05, 1.0);',
    normal: `
  if (sSeen > 0.0) {
    vec2 g = vec2(dFdx(sKnitK), dFdy(sKnitK)) * (SK[sk].x > 0.0 ? SK[sk].z : 0.35) * sSeen;
    normal = normalize(normal + vec3(-g.x, -g.y, 0.0));
  }
  if (sPl > 0.0) { vec2 gp = vec2(dFdx(sPl), dFdy(sPl)) * 1.4; normal = normalize(normal + vec3(-gp.x, -gp.y, 0.0)); }`,
    physical: ['material.sheenColor = sheenColor;', 'material.sheenColor = sheenColor * SS[sk];', '\nmaterial.specularF90 *= SSp[sk]; material.specularColor *= SSp[sk]; material.specularColorBlended = material.specularColor;'],
    // The open stitches are shadowed whatever light lands on the cloth, its sheen and the room's reflection included.
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
  const cast: Partial<Record<MetalName | SoftName, boolean>> = { body: true, dark: true, face: true, polish: true, stand: true, cradle: true, foot: true, cushion: true, canopy: true, hide: true };
  const of = {} as Of, kindOf = {} as Record<MetalName | SoftName, number>;
  METALS.forEach((n, i) => { of[n] = { mat: mats.metal, kind: i, cast: !!cast[n] }; kindOf[n] = i; });
  SOFTS.forEach((n, i) => { of[n] = { mat: mats.soft, kind: i, cast: !!cast[n] }; kindOf[n] = i; });
  return { mats, of, kindOf };
}
