import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { NOISE, lin } from '../../../../world/surface';
import { AXIS, BULB_AT, CROWN, FOOT, HIT } from './form';

// The lamp's materials. A part's budget is a few shader programs, so every metal of the lamp is one program and every
// other surface another, and what each piece is made of rides on its vertices (the kind, in the cell attribute's x).

// What every material of the lamp shares: where the stream struck it and how hard, and how far the lamp is on.
export const U = {
  uStrike: { value: HIT.clone() },
  // Where the stream's light is taken to come from: up the stream from the point it struck.
  uStrikeL: { value: HIT.clone() },
  // How much the stream lies on the shade, 0 to 1, and the flash of its strike with the radius the flash has spread to.
  uOn: { value: 0 },
  uFlash: { value: 0 },
  uFlashR: { value: 0 },
  uLamp: { value: 0 },
  // The stage's light for the lamp, in view space. It stands inside the shade, close enough to its inner face to burn
  // it white, so that face does not take it, and the light the bulb throws there is drawn here instead.
  uBulbV: { value: new THREE.Vector3(0, 0, 1e6) },
};

const v3 = (v: THREE.Vector3) => `vec3(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
const col = (c: number) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
const tone = (n: PaletteName, k: number) => new THREE.Color(hex(n)).multiplyScalar(k).getHex();

// The metals, by kind. Finish: 0 a fine grain, 1 turned round the foot's axis, 2 spun round the shade's axis, 3 brushed
// along its length. Room is how much of the studio the metal takes against the stage's level, so a dark part still
// holds a line of light on its edges. Strike is how much of the stream's light it takes.
interface Metal { color: number; rough: number; finish: number; room: number; strike: number }
export const METAL = {
  // Warm dark steel, plainly grey beside the copper: brushed for the stem, the arm and the counterweight.
  steel: { color: 0xbab2a8, rough: 0.24, finish: 3, room: 4.6, strike: 0.5 },
  // Blackened and satin: the joints.
  joint: { color: 0x37312c, rough: 0.27, finish: 0, room: 4.2, strike: 0.5 },
  // Blackened, turned: the foot.
  foot: { color: 0x36302b, rough: 0.28, finish: 1, room: 3, strike: 0 },
  bronze: { color: tone('bronze', 0.95), rough: 0.3, finish: 0, room: 3, strike: 0.7 },
  copper: { color: tone('copper', 0.92), rough: 0.26, finish: 0, room: 3, strike: 0.7 },
  // The shade: spun steel, blackened and polished, so the room's lights and the cursor's lie on it as sharp
  // reflections that slide as the light moves, and the stream's strike and the vents read strongly against it.
  shell: { color: 0x4c4743, rough: 0.07, finish: 2, room: 2.4, strike: 1 },
  rim: { color: tone('copper-light', 0.82), rough: 0.18, finish: 0, room: 3, strike: 1 },
  cap: { color: tone('copper', 0.95), rough: 0.2, finish: 0, room: 3, strike: 1 },
} satisfies Record<string, Metal>;
export type MetalName = keyof typeof METAL;
const METALS = Object.keys(METAL) as MetalName[];
const K = Object.fromEntries(METALS.map((n, i) => [n, i])) as Record<MetalName, number>;

// The other surfaces: the shade's pale enamel inside, the felt under the foot, the cloth of the cords.
export const OTHER = {
  enamel: { color: tone('pale', 0.62), rough: 0.55 },
  felt: { color: 0x121110, rough: 0.95 },
  cord: { color: 0x1e1c1a, rough: 0.7 },
};
export type OtherName = keyof typeof OTHER;
const OTHERS = Object.keys(OTHER) as OtherName[];

// Light the room and the cursor's lamp reflect off the lamp is held under this, so a highlight on the polished shade
// never blooms into a ball. Its own light and the stream's are added after and bloom as they should.
const HOLD = { knee: 1.15, top: 1.85 };

const HEAD = /* glsl */ `
varying float vKind;
varying vec2 vLampUv;
uniform vec3 uStrike, uStrikeL, uBulbV;
uniform float uOn, uFlash, uFlashR, uLamp;
vec3 strikeRamp(float k){
  vec3 c = mix(${lin(hex('ember'))}, ${lin(hex('flame'))}, smoothstep(0.0, 0.5, k));
  c = mix(c, ${lin(hex('hot'))}, smoothstep(0.5, 1.2, k));
  return mix(c, ${lin(hex('pale'))}, smoothstep(1.2, 2.4, k));
}
float strikeAt(vec3 p, vec3 n){
  float d = distance(p, uStrike);
  // Away from the point itself the stream's light lies on the shade as light does: on what faces it.
  float face = max(dot(normalize(n), normalize(uStrikeL - p)), 0.0);
  float lit = pow(face, 1.6);
  float hold = uOn * (exp(-d / 24.0) * 2.0 + lit * (exp(-d / 55.0) * 0.7 + exp(-d / 140.0) * 0.12));
  float front = exp(-pow((d - uFlashR) / 22.0, 2.0)) * exp(-d / 170.0);
  float flash = uFlash * (exp(-d / 36.0) * 1.5 + (0.3 + 0.7 * lit) * front * 1.0);
  return hold + flash;
}
float lampSelf(vec3 lightPos){ return step(0.004, distance(lightPos, uBulbV)); }
vec3 heldUnder(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m <= ${HOLD.knee.toFixed(2)}) return c; float e = m - ${HOLD.knee.toFixed(2)}; return c * (${HOLD.knee.toFixed(2)} + e / (1.0 + e / ${(HOLD.top - HOLD.knee).toFixed(2)})) / m; }
// Fine rings round an axis, faded out before they get finer than a pixel.
float rings(float q, float s1, float s2){ float px = fwidth(q);
  float a1 = 1.0 - smoothstep(0.25, 0.6, s1 * px), a2 = 1.0 - smoothstep(0.25, 0.6, s2 * px);
  return 0.5 + (wNoise(vec3(q * 0.35, 1.0, 2.0)) - 0.5) * 0.22 + (wNoise(vec3(q * s1, 5.0, 3.0)) - 0.5) * 0.45 * a1 + (wNoise(vec3(q * s2, 9.0, 1.0)) - 0.5) * 0.35 * a2; }
`;

const VERT = { head: 'attribute vec4 cell;\nvarying float vKind;\nvarying vec2 vLampUv;\nvarying vec3 vObj;\nvarying vec3 vObjN;', body: 'vKind = cell.x;\nvLampUv = uv;\nvObj = position;\nvObjN = normal;' };
const FRAG_HEAD = `varying vec3 vObj;\nvarying vec3 vObjN;\n${NOISE}\n${HEAD}`;

function patch(m: THREE.MeshStandardMaterial, key: string, chunks: { head: string; color: string; rough?: string; emissive: string; room?: string; self?: string }): void {
  m.userData.uniforms = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${VERT.head}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT.body}`);
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>\n${FRAG_HEAD}\n${chunks.head}`);
    f = f.replace('#include <color_fragment>', `#include <color_fragment>\n${chunks.color}`);
    if (chunks.rough) f = f.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${chunks.rough}`);
    f = f.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${chunks.emissive}`);
    if (chunks.self) f = f.replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace('getSpotLightInfo( spotLight, geometryPosition, directLight );', `getSpotLightInfo( spotLight, geometryPosition, directLight );\n\t\t${chunks.self}`));
    if (chunks.room) f = f.replace('#include <lights_fragment_end>', `${chunks.room}\n#include <lights_fragment_end>`);
    f = f.replace('#include <opaque_fragment>', 'outgoingLight = heldUnder(outgoingLight - totalEmissiveRadiance) + totalEmissiveRadiance;\n#include <opaque_fragment>');
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => key;
}

const arr = <T>(type: string, xs: T[], f: (x: T) => string) => `${type}[${xs.length}](${xs.map(f).join(', ')})`;

function metalMaterial(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3 });
  m.name = 'lampMetal';
  const ms = METALS.map((n) => METAL[n] as Metal);
  const consts = `
const vec3 MC[${ms.length}] = ${arr('vec3', ms, (x) => col(x.color))};
const float MR[${ms.length}] = ${arr('float', ms, (x) => x.rough.toFixed(3))};
const float MF[${ms.length}] = ${arr('float', ms, (x) => x.finish.toFixed(1))};
const float MS[${ms.length}] = ${arr('float', ms, (x) => x.strike.toFixed(2))};
const float MRoom[${ms.length}] = ${arr('float', ms, (x) => x.room.toFixed(2))};
float mFinish(int k){
  float f = MF[k];
  if (f > 2.5) return rings(dot(vObj, vec3(0.31, 0.11, 0.17)) * 0.6 + wNoise(vObj * 0.9) * 2.0, 4.0, 11.0);
  if (f > 1.5) return rings(distance(vObj, ${v3(CROWN)}), 2.2, 7.0);
  if (f > 0.5) return rings(length(vObj.xz - vec2(${FOOT.at.x.toFixed(1)}, ${FOOT.at.z.toFixed(1)})), 2.6, 8.0);
  return 0.5 + (wNoise(vObj * 0.6) - 0.5) * 0.3;
}`;
  patch(m, 'lamp-metal', {
    head: consts,
    color: `
  int mk = int(vKind + 0.5);
  float mfin = mFinish(mk);
  float mtar = smoothstep(0.52, 0.8, wFbm(vObj * 0.045 + 3.0)) * 0.15;
  diffuseColor.rgb = MC[mk] * (0.9 + 0.2 * mfin) * (1.0 - 0.35 * mtar);
  // Where the bulb's heat has darkened the shade round its crown.
  if (mk == ${K.shell}) diffuseColor.rgb *= 1.0 - 0.3 * (1.0 - smoothstep(4.0, 30.0, dot(vObj - ${v3(CROWN)}, ${v3(AXIS)})));`,
    rough: 'roughnessFactor = clamp(MR[mk] + 0.08 * (mfin - 0.5) + 0.15 * mtar, 0.04, 1.0);',
    emissive: `{
    float sk = strikeAt(vObj, vObjN);
    totalEmissiveRadiance += strikeRamp(sk) * min(sk, 1.6) * MS[mk];
    vec3 nn = normalize(vObjN), toBulb = normalize(${v3(BULB_AT)} - vObj);
    // The cap's underside faces into the shade and takes the bulb's light through the hole in the crown.
    if (mk == ${K.cap}) totalEmissiveRadiance += ${lin(hex('hot'))} * smoothstep(0.4, 0.95, dot(nn, ${v3(AXIS)})) * uLamp * 0.9;
    // The rolled rim's lip catches the bulb, inside and round the mouth: a thin bright crescent along the shade's edge.
    if (mk == ${K.rim}) totalEmissiveRadiance += mix(${lin(hex('hot'))}, ${lin(hex('pale'))}, 0.4) * (pow(max(dot(nn, toBulb) * 0.8 + 0.2, 0.0), 2.0) + smoothstep(0.15, 0.8, dot(nn, ${v3(AXIS)})) * 0.9) * uLamp * 3.4;
  }`,
    room: 'radiance *= MRoom[mk];',
  });
  return m;
}

function otherMaterial(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.6 });
  m.name = 'lampOther';
  const os = OTHERS.map((n) => OTHER[n]);
  const ki = (n: OtherName) => OTHERS.indexOf(n);
  patch(m, 'lamp-other', {
    head: `
const vec3 OC[${os.length}] = ${arr('vec3', os, (x) => col(x.color))};
const float OR[${os.length}] = ${arr('float', os, (x) => x.rough.toFixed(3))};`,
    color: `
  int ok = int(vKind + 0.5);
  // The cord's braid, round and along it, from the tube's own uv (u along it in braid pitches).
  vec2 bp = vec2(vLampUv.x, vLampUv.y * 8.0);
  float braid = mix(0.5, smoothstep(0.1, 0.4, max(abs(fract(bp.x + bp.y) - 0.5), abs(fract(bp.x - bp.y) - 0.5))), (1.0 - smoothstep(0.25, 0.55, length(fwidth(bp)))) * float(ok == ${ki('cord')}));
  diffuseColor.rgb = OC[ok] * (0.95 + 0.1 * wFbm(vObj * 0.08)) * (0.7 + 0.6 * braid);`,
    rough: 'roughnessFactor = clamp(OR[ok] - 0.12 * (braid - 0.5), 0.04, 1.0);',
    emissive: `if (ok == ${ki('enamel')}) { float s = dot(vObj - ${v3(CROWN)}, ${v3(AXIS)}); float k = (exp(-s / 30.0) * 0.9 + 0.22 + smoothstep(55.0, 96.0, s) * 0.9) * uLamp; totalEmissiveRadiance += mix(${lin(hex('hot'))}, ${lin(hex('pale'))}, exp(-s / 22.0)) * k; }`,
    self: `if (ok == ${ki('enamel')}) directLight.color *= lampSelf( spotLight.position );`,
  });
  return m;
}

export interface LampMats { metal: THREE.MeshPhysicalMaterial; other: THREE.MeshPhysicalMaterial; glow: THREE.MeshBasicMaterial }
// What a piece of the lamp is made of: its material, its kind there, and whether it casts a shadow. Only the large
// forms cast.
export interface Handle { mat: THREE.Material; kind: number; cast: boolean }

export function lampMaterials(): { mats: LampMats; of: Record<MetalName | OtherName | 'glow', Handle> } {
  const mats: LampMats = { metal: metalMaterial(), other: otherMaterial(), glow: new THREE.MeshBasicMaterial({ color: 0x000000 }) };
  mats.glow.name = 'lampGlow';
  const cast: Partial<Record<MetalName, boolean>> = { steel: true, foot: true, shell: true, rim: true, cap: true };
  const of = {} as Record<MetalName | OtherName | 'glow', Handle>;
  METALS.forEach((n, i) => { of[n] = { mat: mats.metal, kind: i, cast: !!cast[n] }; });
  OTHERS.forEach((n, i) => { of[n] = { mat: mats.other, kind: i, cast: false }; });
  of.glow = { mat: mats.glow, kind: 0, cast: false };
  return { mats, of };
}

const GLOW_HOT = new THREE.Color(hex('hot'));
const GLOW_PALE = new THREE.Color(hex('pale'));
const OFF = new THREE.Color(hex('bg-2'));

// The lamp's own light, 0 to 1: the vents, the gap under the cap and the bulb burn pale gold at full, from a dark
// interior at 0.
export function setLampLevel(m: LampMats, k: number): void {
  U.uLamp.value = k;
  m.glow.color.copy(OFF).lerp(GLOW_HOT, Math.min(1, k * 1.4)).multiplyScalar(0.4 + 1.5 * k);
  m.glow.color.lerp(GLOW_PALE.clone().multiplyScalar(1.6), Math.max(0, k - 0.6) * 0.35);
}
