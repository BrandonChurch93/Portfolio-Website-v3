import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { NOISE, lin } from '../../../../world/surface';
import { AXIS, BULB_AT, CROWN, FOOT, GLOBE, HIT } from './form';

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
  // For measuring from a script only: 0 draws the lamp, 1 draws all of it flat white, 2 only the shade white and the
  // rest black, 3 all of it black, 4 only the outside of the shade white.
  uMask: { value: 0 },
};

const v3 = (v: THREE.Vector3) => `vec3(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
const col = (c: number) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
const tone = (n: PaletteName, k: number) => new THREE.Color(hex(n)).multiplyScalar(k).getHex();

// The metals, by kind. Finish: 0 a fine grain, 1 turned round the foot's axis, 2 spun round the shade's axis, 3 brushed
// along its length. Room is how much of the studio the metal takes against the stage's level, so a dark part still
// holds a line of light on its edges. Strike is how much of the stream's light it takes. Metal is its metalness: a
// lacquer is not a metal, and reflects only a little face on and nearly all at a grazing angle, which is what draws a
// black lacquered thing by light along its edges.
interface Metal { color: number; rough: number; finish: number; room: number; strike: number; streak?: number; lacquer?: number; metal?: number }
export const METAL = {
  // Warm satin steel, a plain mid grey between the black lacquer and the copper: brushed for the stem, the arm and
  // the counterweight.
  steel: { color: 0xa8a299, rough: 0.36, finish: 3, room: 3.0, strike: 0.5, streak: 1.5 },
  // Blackened and satin: the joints.
  joint: { color: 0x37312c, rough: 0.27, finish: 0, room: 3.2, strike: 0.5 },
  // The foot: cast and turned, under a satin black lacquer. A polished face looking up mirrored the room's wide lights
  // and was the brightest thing on the desk.
  foot: { color: 0x121110, rough: 0.34, finish: 1, room: 0.6, strike: 0, streak: 0.95, lacquer: 0.7, metal: 0 },
  bronze: { color: tone('bronze', 0.95), rough: 0.3, finish: 0, room: 2.4, strike: 0.7 },
  copper: { color: tone('copper', 0.92), rough: 0.24, finish: 0, room: 2.6, strike: 0.7 },
  // The shade: spun steel under a warm black lacquer. Face on it is near black; the lacquer holds the room as crisp
  // lines along its edges, and the spinning rings under it draw the cursor's light into one long streak round the
  // dome that slides as the light moves. As polished steel it read as chrome.
  shell: { color: 0x0d0c0b, rough: 0.26, finish: 2, room: 0.5, strike: 1, streak: 2.0, lacquer: 1, metal: 0 },
  rim: { color: tone('copper-light', 0.82), rough: 0.16, finish: 0, room: 2.6, strike: 1 },
  // The cap over the crown: blackened like the joints.
  cap: { color: 0x2e2a27, rough: 0.26, finish: 0, room: 3, strike: 1 },
} satisfies Record<string, Metal>;
export type MetalName = keyof typeof METAL;
const METALS = Object.keys(METAL) as MetalName[];
const K = Object.fromEntries(METALS.map((n, i) => [n, i])) as Record<MetalName, number>;

// The other surfaces: the shade's enamel inside, a warm grey that reads dim when the lamp is off and burns when it is
// on; the frosted globe; the felt under the foot; the cloth of the cords.
export const OTHER = {
  enamel: { color: 0x1c1a18, rough: 0.6 },
  globe: { color: 0x3a3632, rough: 0.35 },
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
uniform float uOn, uFlash, uFlashR, uLamp, uMask;
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

const VERT = { head: 'attribute vec4 cell;\nvarying float vKind;\nvarying vec2 vLampUv;\nvarying vec3 vObj;\nvarying vec3 vObjN;\nvarying vec3 vGrain;', body: 'vKind = cell.x;\nvLampUv = uv;\nvObj = position;\nvObjN = normal;\nvGrain = cell.yzw;' };
const FRAG_HEAD = `varying vec3 vObj;\nvarying vec3 vObjN;\nvarying vec3 vGrain;\n${NOISE}\n${HEAD}`;

function patch(m: THREE.MeshStandardMaterial, key: string, chunks: { head: string; color: string; rough?: string; metal?: string; emissive: string; room?: string; self?: string; spot?: string; after?: string; shade: string; shell: string }): void {
  m.userData.uniforms = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${VERT.head}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT.body}`);
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>\n${FRAG_HEAD}\n${chunks.head}`);
    f = f.replace('#include <color_fragment>', `#include <color_fragment>\n${chunks.color}`);
    if (chunks.rough) f = f.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${chunks.rough}`);
    if (chunks.metal) f = f.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${chunks.metal}`);
    f = f.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${chunks.emissive}`);
    if (chunks.self) f = f.replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace('getSpotLightInfo( spotLight, geometryPosition, directLight );', `getSpotLightInfo( spotLight, geometryPosition, directLight );\n\t\t${chunks.self}`));
    if (chunks.spot) {
      // Inside the spot lights' loop, after the shadow, just before the light is added.
      const L = THREE.ShaderChunk.lights_fragment_begin, at = L.indexOf('RE_Direct(', L.indexOf('getSpotLightInfo('));
      f = f.replace('#include <lights_fragment_begin>', `${L.slice(0, at)}${chunks.spot}\n\t\t${L.slice(at)}`);
    }
    if (chunks.after) f = f.replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>\n${chunks.after}`);
    if (chunks.room) f = f.replace('#include <lights_fragment_end>', `${chunks.room}\n#include <lights_fragment_end>`);
    f = f.replace('#include <opaque_fragment>', `outgoingLight = heldUnder(outgoingLight - totalEmissiveRadiance) + totalEmissiveRadiance;
  if (uMask > 0.5) outgoingLight = vec3(uMask > 3.5 ? float(${chunks.shell}) : uMask > 2.5 ? 0.0 : uMask > 1.5 ? float(${chunks.shade}) : 1.0);
#include <opaque_fragment>`);
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => key;
}

const arr = <T>(type: string, xs: T[], f: (x: T) => string) => `${type}[${xs.length}](${xs.map(f).join(', ')})`;

function metalMaterial(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 });
  m.name = 'lampMetal';
  const ms = METALS.map((n) => METAL[n] as Metal);
  const consts = `
const vec3 MC[${ms.length}] = ${arr('vec3', ms, (x) => col(x.color))};
const float MR[${ms.length}] = ${arr('float', ms, (x) => x.rough.toFixed(3))};
const float MF[${ms.length}] = ${arr('float', ms, (x) => x.finish.toFixed(1))};
const float MS[${ms.length}] = ${arr('float', ms, (x) => x.strike.toFixed(2))};
const float MRoom[${ms.length}] = ${arr('float', ms, (x) => x.room.toFixed(2))};
const float MStreak[${ms.length}] = ${arr('float', ms, (x) => (x.streak ?? 0).toFixed(2))};
const float MLac[${ms.length}] = ${arr('float', ms, (x) => (x.lacquer ?? 0).toFixed(2))};
const float MMet[${ms.length}] = ${arr('float', ms, (x) => (x.metal ?? 1).toFixed(2))};
// The way the grain runs where it is drawn, in view space: along a brushed part, round the shade's axis on the spun
// shade, round the upright on the turned foot, or none.
vec3 grainView(int k){
  vec3 g = vGrain;
  if (k == ${K.shell}) g = cross(${v3(AXIS)}, vObj - ${v3(CROWN)});
  if (k == ${K.foot}) g = cross(vec3(0.0, 1.0, 0.0), vObj - vec3(${FOOT.at.x.toFixed(1)}, 0.0, ${FOOT.at.z.toFixed(1)}));
  float l = length(g);
  if (l < 1e-3) return vec3(0.0);
  return normalize(mat3(viewMatrix) * (g / l));
}
// A streak of light across the grain, from one light: the line on a brushed tube, the band across a spun dome.
vec3 streakOf(vec3 L, vec3 V, vec3 N, vec3 T, float e){
  vec3 h = L + V; float hl = length(h);
  if (hl < 1e-4 || dot(T, T) < 0.5) return vec3(0.0);
  h /= hl;
  float th = dot(T, h);
  return vec3(pow(max(1.0 - th * th, 0.0), e) * max(dot(N, L), 0.0));
}
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
    metal: 'metalnessFactor = MMet[mk];',
    shade: `mk == ${K.shell} || mk == ${K.rim} || mk == ${K.cap}`,
    shell: `mk == ${K.shell}`,
    emissive: `{
    float sk = strikeAt(vObj, vObjN);
    totalEmissiveRadiance += strikeRamp(sk) * min(sk, 1.6) * MS[mk];
    vec3 nn = normalize(vObjN), toBulb = normalize(${v3(BULB_AT)} - vObj);
    // The cap's underside faces into the shade and takes the bulb's light through the hole in the crown.
    if (mk == ${K.cap}) totalEmissiveRadiance += ${lin(hex('hot'))} * smoothstep(0.4, 0.95, dot(nn, ${v3(AXIS)})) * uLamp * 0.9;
    // The rolled rim's lip catches the bulb on its inner face only, so its outside stays lit copper and not a glowing
    // ring: a thin bright crescent along the shade's edge.
    if (mk == ${K.rim}) totalEmissiveRadiance += mix(${lin(hex('hot'))}, ${lin(hex('pale'))}, 0.4) * (pow(max(dot(nn, toBulb), 0.0), 2.0) * 1.4 + smoothstep(0.3, 0.9, dot(nn, ${v3(AXIS)})) * 0.5) * uLamp * 2.4;
  }`,
    room: '#if defined( USE_CLEARCOAT )\n  clearcoatRadiance *= MRoom[mk];\n#endif\n  radiance *= MRoom[mk];',
    // Under a lacquer the black paint is rough and reflects little: what is crisp is the lacquer's own reflection.
    after: 'material.clearcoat = MLac[mk];\n  if (MMet[mk] < 0.5) { material.specularColorBlended *= 0.55; material.specularF90 *= 0.3; }',
    spot: `if (MStreak[mk] > 0.0) { vec3 gT = grainView(mk); reflectedLight.directSpecular += directLight.color * streakOf(directLight.direction, geometryViewDir, geometryNormal, gT, mk == ${K.shell} ? 520.0 : 160.0) * MStreak[mk] * mix(material.specularColor, vec3(1.0), 0.55); }`,
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
    shade: `ok == ${ki('enamel')} || ok == ${ki('globe')}`,
    shell: 'false',
    // The enamel inside is lit by the globe: brightest round it, falling to a warm glow at the lip.
    emissive: `if (ok == ${ki('enamel')}) { float s = dot(vObj - ${v3(CROWN)}, ${v3(AXIS)}); float g = exp(-pow((s - ${GLOBE.s.toFixed(1)}) / 19.0, 2.0)); float k = (exp(-s / 30.0) * 0.5 + 0.12 + 1.25 * g) * uLamp; totalEmissiveRadiance += mix(${lin(hex('flame'))}, ${lin(hex('hot'))}, 0.35 + 0.65 * g) * k; }
  // The frosted globe burns whole, brightest where it faces the eye, from hot at its edge to pale gold at its middle.
  if (ok == ${ki('globe')}) { float face = max(dot(normal, normalize(vViewPosition)), 0.0); totalEmissiveRadiance += mix(${lin(hex('hot'))}, ${lin(hex('pale'))}, face) * (0.9 + 2.2 * face) * uLamp * 1.8; }`,
    self: `if (ok == ${ki('enamel')} || ok == ${ki('globe')}) directLight.color *= lampSelf( spotLight.position );`,
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

// The lamp's own light, 0 to 1: the vents and the gap under the cap glow hot at full, from a dark interior at 0. Held
// low: brighter, the vents read at the page's size as loose flecks round the crown.
export function setLampLevel(m: LampMats, k: number): void {
  U.uLamp.value = k;
  m.glow.color.copy(OFF).lerp(GLOW_HOT, Math.min(1, k * 1.4)).multiplyScalar(0.4 + 0.75 * k);
  m.glow.color.lerp(GLOW_PALE, Math.max(0, k - 0.6) * 0.25);
  if (U.uMask.value > 0.5) m.glow.color.setScalar(U.uMask.value > 2.5 ? 0 : 1);
}
