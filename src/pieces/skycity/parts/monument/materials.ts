import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { shade } from '../../../../world/surface';
import { polished } from '../../polish';
import type { Carving } from './carve';
import { CRADLE, DISC, OBELISK, PYLON, TIERS } from './plan';

// The glyphs down an obelisk: one every so many units.
const GLYPHS = { step: 8.5, size: 1.35 } as const;
// How far round a foot its shadow from the sky reaches, how dark it is at the foot, and how dark a joint is.
const OCC = { reach: 7, dark: 0.55, joint: 0.5 } as const;
const STANDS: [number, number, number, number][] = [
  ...TIERS.slice(1).map((t) => [0, 0, t.x, t.z] as [number, number, number, number]),
  [0, (CRADLE.front + CRADLE.back) / 2, CRADLE.x, (CRADLE.front - CRADLE.back) / 2],
  [-OBELISK.x, 0, OBELISK.ped.w / 2, OBELISK.ped.w / 2], [OBELISK.x, 0, OBELISK.ped.w / 2, OBELISK.ped.w / 2],
  [-PYLON.x, PYLON.mid, PYLON.w0 / 2, PYLON.deep / 2], [PYLON.x, PYLON.mid, PYLON.w0 / 2, PYLON.deep / 2],
];
const FEET = [...TIERS.slice(0, -1).map((t) => t.top), TIERS[2].top, OBELISK.foot, OBELISK.foot, TIERS[2].top, TIERS[2].top];

// Two programs. The gold: a mirror, metalness one, whose color, finish and fine carving are the carving's pictures.
// It is never emissive and never a flat pale color: it is bright only where it reflects the moon, the strip lights of
// the room and the cursor's light. And everything else: old stone, dark bronze, black granite and the braziers'
// flames, told apart by a kind written on each vertex.

// A glint of the moon on a mirror is far brighter than the screen can show, and the glow pass spread the disc's many
// glints into a haze round it. Past the knee a glint is held under a soft ceiling: still the brightest thing on the
// disc, and pale by the tone curve, but small.
const HOLD = { knee: 1.5, top: 3.2 };

// Age on the gold, over the carving's own darkening of what is shut in: tarnish in clouds, how dark and how much
// rougher it leaves the metal, and the grime of the disc's lower part, where the weather runs down to the cradle.
const AGE = { scale: 0.045, dark: 0.32, rough: 0.12, low: 0.3, lowRough: 0.1 } as const;

export function goldMaterial(c: Carving): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: c.color, normalMap: c.normal, aoMap: c.orm, roughnessMap: c.orm, metalnessMap: c.orm, roughness: 1, metalness: 1,
  });
  m.name = 'monument-gold';
  shade(m, 'monument-gold', {
    head: `float mTarn(){ return smoothstep(0.5, 0.8, wFbm(vObj * ${AGE.scale.toFixed(3)} + 2.0)); }
float mLow(){ return smoothstep(${(DISC.at - 25).toFixed(1)}, ${(DISC.at - DISC.r).toFixed(1)}, vObj.y); }`,
    color: `diffuseColor.rgb *= (1.0 - ${AGE.dark.toFixed(2)} * mTarn()) * (1.0 - ${AGE.low.toFixed(2)} * mLow());`,
    rough: `roughnessFactor = clamp(roughnessFactor + ${AGE.rough.toFixed(2)} * mTarn() + ${AGE.lowRough.toFixed(2)} * mLow(), 0.04, 1.0);`,
  });
  const before = m.onBeforeCompile, k = HOLD.knee.toFixed(2), span = (HOLD.top - HOLD.knee).toFixed(2);
  m.onBeforeCompile = (sh, r) => {
    before.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `{ float hi = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b));
  if (hi > ${k}) outgoingLight *= (${k} + (hi - ${k}) / (1.0 + (hi - ${k}) / ${span})) / hi; }
#include <opaque_fragment>`);
  };
  return polished(m);
}

// The kinds of what is not gold, and how each is drawn: its color, roughness and metalness.
export const KIND = { stone: 0, worn: 1, bronze: 2, granite: 3, flame: 4 } as const;
export type KindName = keyof typeof KIND;
const look = (c: number, k = 1) => new THREE.Color(c).multiplyScalar(k);
const KINDS: { color: THREE.Color; rough: number; metal: number }[] = [
  // A pale warm sandstone, dressed in courses and very old.
  { color: look(0x4b3e32), rough: 0.84, metal: 0 },
  // The same stone, worn smooth underfoot and darker.
  { color: look(0x3e3329), rough: 0.68, metal: 0 },
  // Bronze, satin: the clamps and the braziers.
  { color: look(hex('bronze'), 0.85), rough: 0.26, metal: 1 },
  // Black granite, polished: the cradle, its pylons, the obelisks and their pedestals.
  { color: look(0x161413), rough: 0.16, metal: 0 },
  { color: look(0x0a0806), rough: 0.6, metal: 0 },
];
const vec = (c: THREE.Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
// How bright a brazier's flame is, against the palette's hot.
const FLAME = 4.4;

export interface BaseUniforms { uFlick: { value: number } }

export function baseMaterial(): { mat: THREE.MeshStandardMaterial; u: BaseUniforms } {
  const u: BaseUniforms = { uFlick: { value: 1 } };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  m.name = 'monument-base';
  m.userData.uniforms = u;
  const hot = new THREE.Color(hex('hot'));
  shade(m, 'monument-base', {
    vhead: 'attribute vec4 cell;\nvarying vec4 vCell;',
    vert: 'vCell = cell;',
    head: `varying vec4 vCell;
uniform float uFlick;
const vec3 KC[5] = vec3[5](${KINDS.map((k) => vec(k.color)).join(', ')});
const float KR[5] = float[5](${KINDS.map((k) => k.rough.toFixed(3)).join(', ')});
const float KM[5] = float[5](${KINDS.map((k) => k.metal.toFixed(3)).join(', ')});
int mKind(){ return int(vCell.x + 0.5); }
// Stone: blotches, stains that run down from every ledge, and the grime of its foot.
float mAge(){
  float px = length(fwidth(vObj));
  float blot = wFbm(vObj * 0.09 + vCell.z);
  float run = wNoise(vec3(vObj.x * 0.55, vObj.y * 0.035, vObj.z * 0.55) + vCell.z) * (1.0 - smoothstep(0.4, 1.2, px * 0.55));
  return clamp(0.55 * blot + 0.45 * run, 0.0, 1.0);
}
// Where a thing stands on the stone, the stone round its foot is in its shadow from the sky: each a box across and
// deep from the plinth's middle, its half sizes, and the height of its foot.
const vec4 STANDS[${STANDS.length}] = vec4[${STANDS.length}](${STANDS.map((b) => `vec4(${b.map((v) => v.toFixed(1)).join(', ')})`).join(', ')});
const float FEET[${STANDS.length}] = float[${STANDS.length}](${FEET.map((v) => v.toFixed(1)).join(', ')});
float mOcc(){
  if (vObjN.y < 0.8) return 0.0;
  float o = 0.0;
  for (int i = 0; i < ${STANDS.length}; i++) {
    if (abs(vObj.y - FEET[i]) > 0.8) continue;
    vec2 d = abs(vObj.xz - STANDS[i].xy) - STANDS[i].zw;
    float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    o = max(o, 1.0 - smoothstep(0.0, ${OCC.reach.toFixed(1)}, sd));
  }
  return o;
}
// The joints between blocks: the bevel under each block's top edge, which faces sideways or down, is in shadow.
float mJoint(){ float ax = max(abs(vObjN.x), max(abs(vObjN.y), abs(vObjN.z))); return smoothstep(0.97, 0.85, ax) * step(vObjN.y, 0.35); }
// An obelisk's column of glyphs: 1 where a glyph is cut, faded to nothing before it is finer than a pixel.
float mGlyph(){
  if (mKind() != 3 || abs(vCell.w) < 1.0) return 0.0;
  float u = abs(vObjN.z) > abs(vObjN.x) ? vObj.x - vCell.w : vObj.z, side = abs(vObjN.z) > abs(vObjN.x) ? sign(vObjN.z) : 2.0 * sign(vObjN.x);
  float y = vObj.y - ${OBELISK.foot + OBELISK.ped.h + 8}.0, cellH = ${GLYPHS.step.toFixed(1)}, id = floor(y / cellH), q = mod(y, cellH) - cellH * 0.5;
  if (y < 0.0 || y > ${OBELISK.tall - 22}.0) return 0.0;
  float k = fract(sin(id * 12.9898 + side * 78.233) * 43758.5453), d;
  vec2 p = vec2(u, q) / ${GLYPHS.size.toFixed(2)};
  if (k < 0.25) d = abs(length(p) - 1.3) - 0.4;
  else if (k < 0.5) d = max(abs(p.x) - 1.7, abs(p.y) - 0.45);
  else if (k < 0.75) d = min(max(abs(p.x) - 0.45, abs(p.y) - 1.8), max(abs(p.x) - 1.6, abs(p.y + 1.35) - 0.4));
  else d = abs(max(abs(p.x), abs(p.y)) - 1.3) - 0.38;
  float px = length(fwidth(vObj));
  return smoothstep(0.2, -0.2, d) * (1.0 - smoothstep(0.5, 1.2, px));
}`,
    color: `{ int k = mKind(); vec3 c = KC[k];
  if (k <= 1) { float a = mAge(); c *= (0.78 + 0.4 * a) * (0.82 + 0.36 * fract(vCell.z * 7.31)); c *= mix(0.6, 1.0, smoothstep(0.0, 14.0, vObj.y)); c *= 1.0 - ${OCC.dark.toFixed(2)} * mOcc() - ${OCC.joint.toFixed(2)} * mJoint(); }
  c *= 1.0 - 0.6 * mGlyph();
  diffuseColor.rgb = c; }`,
    rough: `{ int k = mKind(); roughnessFactor = KR[k] + 0.45 * mGlyph(); if (k <= 1) roughnessFactor = clamp(roughnessFactor + 0.18 * (mAge() - 0.5), 0.3, 1.0); }`,
    metal: 'metalnessFactor = KM[mKind()];',
    emissive: `if (mKind() == 4) totalEmissiveRadiance = ${vec(hot)} * ${FLAME.toFixed(2)} * uFlick * (0.7 + 0.3 * smoothstep(0.0, 1.0, vCell.y));`,
  });
  return { mat: m, u };
}
