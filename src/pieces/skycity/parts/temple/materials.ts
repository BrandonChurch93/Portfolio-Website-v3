import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { NOISE, lin } from '../../../../world/surface';
import { MOONWARD, SPIRE } from '../../layout';
import { BANDS, CASING, FOOT, PYRAMID, WAY, WAY_END } from './plan';

// The quarter's materials: one program for everything it is made of and everything it lights, and the capstone's
// halo. What a piece is made of rides on its vertices: its kind in the cell attribute's x, a coordinate across a face
// in its y, and a seed in its z.

// Gold is a polished metal at the palette's own hue, between copper-light and hot: never a yellow brass.
const GOLD = new THREE.Color(hex('copper-light')).lerp(new THREE.Color(hex('hot')), 0.45).multiplyScalar(0.92).getHex();
const tone = (c: number, k: number) => new THREE.Color(c).multiplyScalar(k).getHex();

// Each kind: its color, how rough and how metallic, how much of the room it reflects against the stage's level, its
// clear coat, and how strongly the quarter's own lamps light it.
interface Kind { color: number; rough: number; metal: number; room: number; coat: number; lit: number; glow?: number }
export const KIND = {
  // Pale warm limestone, dressed in courses: the walls, the pylon, the hall, the podiums.
  lime: { color: 0x5a5046, rough: 0.72, metal: 0, room: 1.2, coat: 0, lit: 1 },
  // The same stone laid flat, a little darker, in slabs.
  paving: { color: 0x524840, rough: 0.6, metal: 0, room: 1.2, coat: 0.15, lit: 1 },
  // Dark polished granite: the obelisks, the seated figures.
  granite: { color: 0x191716, rough: 0.2, metal: 0, room: 0.55, coat: 0.25, lit: 0.6 },
  // The great pyramid's casing and every cap.
  gold: { color: GOLD, rough: 0.035, metal: 1, room: 0.12, coat: 0, lit: 0.4 },
  // Dark bronze, nearly black: the gate's doors.
  dark: { color: tone(hex('bronze-deep'), 0.75), rough: 0.32, metal: 1, room: 0.8, coat: 0.2, lit: 0.5 },
  bronze: { color: tone(hex('bronze'), 0.8), rough: 0.3, metal: 1, room: 1.4, coat: 0.2, lit: 0.8 },
  copper: { color: tone(hex('copper'), 0.9), rough: 0.18, metal: 1, room: 1.5, coat: 0.3, lit: 0.8 },
  // A palm's fronds: copper and bronze foliage, as every grove on this world is, satin, with the light through it.
  frond: { color: tone(hex('copper'), 0.62), rough: 0.55, metal: 0.35, room: 1.0, coat: 0, lit: 1.2 },
  // Dark water: the pool on the way and the sacred lake. It reflects the spire's foot.
  water: { color: 0x040404, rough: 0.05, metal: 0, room: 1.4, coat: 1, lit: 0.1 },
  // What gives light: the gap under the capstone, the hall seen between its columns, the crack of the gate, a lamp, a
  // brazier's flame, the shrine on the stepped pyramid, the line up the mast.
  core: { color: 0x0a0806, rough: 0.5, metal: 0, room: 0, coat: 0, lit: 0, glow: 1 },
  hall: { color: 0x0a0806, rough: 0.5, metal: 0, room: 0, coat: 0, lit: 0, glow: 1 },
  gate: { color: 0x0a0806, rough: 0.5, metal: 0, room: 0, coat: 0, lit: 0, glow: 1 },
  lamp: { color: 0x0a0806, rough: 0.5, metal: 0, room: 0, coat: 0, lit: 0, glow: 1 },
  flame: { color: 0x0a0806, rough: 0.5, metal: 0, room: 0, coat: 0, lit: 0, glow: 1 },
  line: { color: 0x0a0806, rough: 0.5, metal: 0, room: 0, coat: 0, lit: 0, glow: 1 },
} satisfies Record<string, Kind>;
export type KindName = keyof typeof KIND;
export const KINDS = Object.keys(KIND) as KindName[];
export const K = Object.fromEntries(KINDS.map((n, i) => [n, i])) as Record<KindName, number>;

// The lamps of the quarter, which it draws into its own materials as the light they throw: where each is, in units,
// how strong, how far it reaches, and how hot its light is.
export interface Lamp { at: [number, number, number]; power: number; reach: number; heat: number; flicker?: boolean }
export const MAX_LAMPS = 64;

export const U = {
  uT: { value: 0 },
  uBreath: { value: 0.5 },
  uLamps: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Vector4()) },
  uLampK: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Vector2()) },
  uLampN: { value: 0 },
};

const col = (c: number) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
const arr = <T>(type: string, xs: T[], f: (x: T) => string) => `${type}[${xs.length}](${xs.map(f).join(', ')})`;
const f1 = (x: number) => x.toFixed(4);

// The stage's lights (the moon, the cursor's light, the core's) are taken a little stronger than they are, so the metal's
// reflections of the cursor's light slide visibly when it crosses the page.
const LAMP_GAIN = 1.2;
const HOLD = { knee: 0.85, top: 1.3 };
// The glow along the horizon that the metal reflects: how bright, how high it reaches (the sine of its top edge, which
// is sharp, so a polished face shows it as a crisp line), and how much of it there is in front of the world against
// behind it.
const SKY_GLOW = { power: 0.35, edge: 0.24, front: 0.35 };
// Age, for a temple of another world that has stood a very long time: how fine and how dark the stains that run down
// its stone are, how much darker the stone is at its foot, the grime low on the gold and how high it reaches, and the
// share of the casing's stones lost near its foot and up to how many courses.
const AGE = { streak: 0.7, stain: 0.32, foot: 0.3, grime: 0.32, grimeUp: 60, lost: 0.2, lostUp: 6 };
// The city on the crown as the gold reflects it: the height of the point it is seen round, how wide it is round that
// (the cosine of its half angle across), how far over that point its skyline stands (as a sine), and how bright.
const CITY = { y: 60, wide: 0.6, top: 0.16, power: 0.55 };
// The spire as the water sees it: a column of warm light this wide either side of its axis, brighter low down where
// its lobby is, with a beacon at its tip. The spire is another part's, so the water draws its light and not its form.
const SPIRE_SEEN = { half: 9, lobby: 30, beacon: 4 };

const COMMON = /* glsl */ `
varying vec4 vCell;
varying vec3 vObj;
varying vec3 vObjN;
varying vec3 vUpV;
varying vec2 vLocal;
uniform float uT, uBreath;
uniform vec4 uLamps[${MAX_LAMPS}];
uniform vec2 uLampK[${MAX_LAMPS}];
uniform int uLampN;
${NOISE}
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 heat(float k){
  vec3 c = mix(${lin(hex('ember'))}, ${lin(hex('flame'))}, smoothstep(0.0, 0.45, k));
  c = mix(c, ${lin(hex('hot'))}, smoothstep(0.45, 0.85, k));
  return mix(c, ${lin(hex('pale'))}, smoothstep(0.85, 1.0, k));
}
// How much of a pixel a line w wide at distance d from its middle covers, so a joint finer than a pixel fades to its
// mean and never sparkles.
float cover(float d, float w, float fw){ fw = max(fw, 1e-4); float lo = max(d - fw * 0.5, -w * 0.5), hi = min(d + fw * 0.5, w * 0.5); return max(hi - lo, 0.0) / fw; }
float joint(float u, float p, float w){ float d = abs(fract(u / p + 0.5) - 0.5) * p; return cover(d, w, fwidth(u)); }
vec3 heldUnder(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m <= ${f1(HOLD.knee)}) return c; float e = m - ${f1(HOLD.knee)}; return c * (${f1(HOLD.knee)} + e / (1.0 + e / ${f1(HOLD.top - HOLD.knee)})) / m; }
// The light the quarter's own lamps throw on a surface: each falls off with distance and with how far the surface
// turns from it.
vec3 lampsOn(vec3 p, vec3 n){
  vec3 s = vec3(0.0);
  for (int i = 0; i < ${MAX_LAMPS}; i++) {
    if (i >= uLampN) break;
    vec4 l = uLamps[i]; vec2 k = uLampK[i];
    vec3 d = l.xyz - p; float r = max(length(d), 0.5);
    float face = 0.25 + 0.75 * max(dot(n, d / r), 0.0);
    float fall = 1.0 / (1.0 + (r * r) / (k.x * k.x));
    s += heat(k.y) * l.w * face * fall * (1.0 - smoothstep(k.x * 2.5, k.x * 4.0, r));
  }
  return s;
}
`;

const VERT_HEAD = 'attribute vec4 cell;\nvarying vec4 vCell;\nvarying vec3 vObj;\nvarying vec3 vObjN;\nvarying vec3 vUpV;\nvarying vec2 vLocal;';
const VERT_BODY = 'vLocal = uv;\nvCell = cell;\nvObj = position;\nvObjN = normal;\nvUpV = normalize(mat3(viewMatrix) * vec3(0.0, 1.0, 0.0));';

function material(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06 });
  m.name = 'temple';
  const ks = KINDS.map((n) => ({ ...(KIND[n] as Kind), kind: n }));
  const head = `
const vec3 GOLD_C = ${col(GOLD)};
const vec3 KC[${ks.length}] = ${arr('vec3', ks, (x) => col(x.color))};
const float KR[${ks.length}] = ${arr('float', ks, (x) => f1(x.rough))};
const float KM[${ks.length}] = ${arr('float', ks, (x) => f1(x.metal))};
const float KRoom[${ks.length}] = ${arr('float', ks, (x) => f1(x.room))};
const float KCoat[${ks.length}] = ${arr('float', ks, (x) => f1(x.coat))};
const float KLit[${ks.length}] = ${arr('float', ks, (x) => f1(x.lit))};
const float KSky[${ks.length}] = ${arr('float', ks, (x) => f1(x.metal > 0.5 ? 1 : x.kind === 'water' ? 1.5 : x.coat * 0.3))};
// What a ray from a point of the water sees of the spire: where it crosses the plane of the spire's axis, if it does.
vec3 spireSeen(vec3 p, vec3 r){
  if (r.z > -0.02 || p.z <= 0.0) return vec3(0.0);
  float t = -p.z / r.z; vec2 q = p.xy + r.xy * t;
  float ax = abs(q.x), w = ${f1(SPIRE_SEEN.half)} * mix(1.6, 0.35, clamp(q.y / ${f1(SPIRE.tall)}, 0.0, 1.0));
  float on = (1.0 - smoothstep(w * 0.6, w, ax)) * step(0.0, q.y) * (1.0 - smoothstep(${f1(SPIRE.tall - 6)}, ${f1(SPIRE.tall)}, q.y));
  vec3 c = heat(0.62 + 0.2 * smoothstep(${f1(SPIRE_SEEN.lobby)}, 0.0, q.y)) * (0.35 + 0.5 * smoothstep(${f1(SPIRE_SEEN.lobby + 8)}, 0.0, q.y)) * on;
  c += heat(0.95) * 2.0 * exp(-dot(q - vec2(0.0, ${f1(SPIRE.tall - 3)}), q - vec2(0.0, ${f1(SPIRE.tall - 3)})) / ${f1(SPIRE_SEEN.beacon * SPIRE_SEEN.beacon)});
  return c;
}
// The way's floor seen from the air, from a point's place on the map: a band of dark polished stone along each side of
// the pool, edged in gold, pale slabs out to the walls, and at each station a band across with a cartouche in it
// either side. Its color, and how much of the point is metal.
float wayAt(float z, float a, float b){ return a + (b - a) * clamp((z - ${f1(WAY.z0)}) / ${f1(WAY_END - WAY.z0)}, 0.0, 1.0); }
vec3 wayFloor(vec2 m, vec3 pale, float px, out float metal){
  float ax = abs(m.x), fw = max(fwidth(ax), 1e-3);
  float pool = wayAt(m.y, ${f1(WAY.pool.half0)}, ${f1(WAY.pool.half1)}) + ${f1(WAY.pool.kerb)};
  float row = wayAt(m.y, ${f1(WAY.row0)}, ${f1(WAY.row1)});
  float inner = pool + ${f1(WAY.band)};
  vec3 dark = ${col(0x201d1a)};
  vec3 c = pale;
  metal = 0.0;
  float inBand = 1.0 - smoothstep(inner - fw, inner + fw, ax);
  c = mix(c, dark, inBand);
  float edge = cover(abs(ax - inner), 0.7, fw);
  // The bands across at the stations, each with a cartouche between the pool and the row on either side.
  float s = mod(m.y - ${f1(WAY.stations[0])} + 20.0, 40.0) - 20.0, across = 1.0 - smoothstep(4.2 - fw, 4.2 + fw, abs(s));
  c = mix(c, dark, across * step(inner, ax));
  float mid = (inner + row) * 0.5, cw = (row - inner) * 0.36;
  vec2 q = vec2((ax - mid) / cw, s / 3.0);
  float oval = length(vec2(q.x, q.y * 1.15)), ring = cover(abs(oval - 0.9) * cw, 0.5, fw) * step(abs(q.x), 1.2);
  float slot = floor((q.x + 0.75) / 0.3), inMarks = step(abs(q.x), 0.72) * step(abs(q.y), 0.5);
  float mk = inMarks * step(0.3, h21(vec2(slot, floor(m.y / 40.0) + sign(m.x)))) * step(0.06, fract((q.x + 0.75) / 0.3)) * step(fract((q.x + 0.75) / 0.3), 0.7);
  mk *= 1.0 - smoothstep(0.35, 0.8, fw);
  metal = max(max(edge, across * ring), across * mk);
  return mix(c, GOLD_C * 0.9, metal);
}
`;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${VERT_HEAD}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_BODY}`);
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>\n${COMMON}\n${head}`);
    f = f.replace('#include <color_fragment>', `#include <color_fragment>
  int kk = int(vCell.x + 0.5);
  float px = length(fwidth(vObj));
  float grain = mix(wNoise(vObj * 0.9), 0.5, smoothstep(0.3, 0.8, px));
  float blot = wFbm(vObj * 0.05 + 3.0);
  vec3 nO = normalize(vObjN + vec3(1e-5));
  diffuseColor.rgb = KC[kk];
  float banded = 0.0, worn = 0.0;
  if (kk == ${K.lime}) {
    // Courses of dressed stone, each block its own tone, the joints dark and thin, staggered course by course.
    // Each building is laid in courses of its own height, from its seed, and its blocks are two to three times as long.
    float ch = 1.7 + 1.5 * h21(vec2(vCell.z * 0.37, 2.1)), bl = ch * (2.0 + h21(vec2(vCell.z, 5.3)));
    float q = vLocal.y / ch, row = floor(q);
    float along = vLocal.x;
    float b = floor((along + bl * 0.5 * mod(row, 2.0)) / bl);
    float tint = 0.93 + 0.14 * h21(vec2(row, b + vCell.z));
    float j = max(joint(vLocal.y, ch, 0.12), joint(along + bl * 0.5 * mod(row, 2.0), bl, 0.12) * (1.0 - smoothstep(0.7, 0.95, abs(nO.y))));
    float fine = smoothstep(0.25, 0.6, px);
    diffuseColor.rgb *= mix(tint, 1.0, fine) * (1.0 - 0.38 * j) * (0.9 + 0.2 * grain) * (0.84 + 0.32 * blot);
    // Age: long stains run down the walls from their tops and ledges, and the stone is darker where it meets the
    // ground, as old stone is.
    float stain = wNoise(vec3(vLocal.x * ${f1(AGE.streak)}, vLocal.y * 0.05, vCell.z * 0.13 + 4.0));
    stain = mix(stain, 0.5, smoothstep(0.4, 1.0, px * ${f1(AGE.streak)}));
    diffuseColor.rgb *= 1.0 - ${f1(AGE.stain)} * smoothstep(0.5, 0.85, stain);
    diffuseColor.rgb *= mix(${f1(1 - AGE.foot)}, 1.0, smoothstep(0.0, 3.5, vLocal.y));
  } else if (kk == ${K.paving}) {
    vec2 m = vLocal;
    if (vCell.w > 0.5) {
      // The way's walks: long slabs laid along it, a band of darker stone at each of its stations.
      float a = joint(m.x, 4.0, 0.16), c = joint(m.y + 3.0 * mod(floor(m.x / 4.0), 2.0), 7.0, 0.16);
      float tint = 0.88 + 0.24 * h21(floor(vec2(m.x / 4.0, (m.y + 3.0 * mod(floor(m.x / 4.0), 2.0)) / 7.0)));
      float metal = 0.0;
      vec3 pale = KC[kk] * mix(tint, 1.0, smoothstep(0.25, 0.6, px)) * (1.0 - 0.38 * max(a, c)) * (0.86 + 0.28 * blot) * (1.0 - 0.22 * smoothstep(0.55, 0.8, wFbm(vec3(m * 0.04, 1.0))));
      diffuseColor.rgb = wayFloor(m, pale, px, metal);
      banded = -metal;
    } else {
      float a = joint(m.x, 6.0, 0.2), c = joint(m.y + 3.0 * mod(floor(m.x / 6.0), 2.0), 9.0, 0.2);
      float tint = 0.9 + 0.2 * h21(floor(vec2(m.x / 6.0, (m.y + 3.0 * mod(floor(m.x / 6.0), 2.0)) / 9.0)));
      diffuseColor.rgb *= mix(tint, 1.0, smoothstep(0.25, 0.6, px)) * (1.0 - 0.4 * max(a, c)) * (0.9 + 0.2 * grain) * (0.85 + 0.3 * blot) * (1.0 - 0.22 * smoothstep(0.55, 0.8, wFbm(vec3(m * 0.04, 1.0))));
    }
  } else if (kk == ${K.gold}) {
    // The casing: courses up the face, each a run of panels, a few a shade apart, with dark joints.
    float q = vLocal.y / ${f1(CASING.course)}, row = floor(q);
    float b = floor((vLocal.x + 4.5 * mod(row, 2.0)) / 9.0);
    float tint = 0.97 + 0.04 * h21(vec2(row, b + vCell.z));
    float j = max(joint(vLocal.y, ${f1(CASING.course)}, 0.26), 0.6 * joint(vLocal.x + 4.5 * mod(row, 2.0), 9.0, 0.12) * (1.0 - step(0.5, abs(vCell.w - 1.0))));
    j *= 1.0 - step(0.5, abs(vCell.w - 1.0));
    diffuseColor.rgb *= mix(tint, 1.0, smoothstep(0.3, 0.7, px)) * (1.0 - 0.8 * j) * (0.97 + 0.06 * blot);
    if (abs(vCell.w - 1.0) < 0.5 && (row == ${BANDS.join(' || row == ').replace(/(\d+)/g, '$1.0')})) { diffuseColor.rgb = ${col(0x141312)}; banded = 1.0; }
    else if (abs(vCell.w - 1.0) < 0.5) {
      // Age on the casing: grime that gathers low on it and in its joints, and near its foot stones of the casing lost
      // over the ages, which leave a recess with the dark core stone in it, in shadow under the course above.
      diffuseColor.rgb *= mix(${f1(1 - AGE.grime)}, 1.0, smoothstep(0.0, ${f1(AGE.grimeUp)}, vLocal.y)) * (0.9 + 0.1 * wNoise(vec3(vLocal.x * 0.3, vLocal.y * 0.08, 2.0)));
      float lose = ${f1(AGE.lost)} * (1.0 - smoothstep(1.0, ${f1(AGE.lostUp)}, row));
      if (row > 0.5 && h21(vec2(row * 1.7, b + 31.0)) < lose && px < 0.6) {
        float fy = fract(q);
        diffuseColor.rgb = ${col(0x3a332d)} * mix(1.0, 0.25, smoothstep(0.45, 0.95, fy)) * (0.8 + 0.4 * blot);
        banded = 1.0; worn = 1.0;
      }
    }
  } else if (kk == ${K.granite}) {
    diffuseColor.rgb *= 0.85 + 0.3 * mix(wNoise(vObj * 2.3), 0.5, smoothstep(0.2, 0.5, px));
  } else if (kk == ${K.bronze} || kk == ${K.copper}) {
    diffuseColor.rgb *= 0.9 + 0.2 * blot;
  }`);
    f = f.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = clamp((worn > 0.5 ? 0.85 : kk == ${K.gold} && vCell.w > 1.5 ? 0.02 : banded < 0.0 ? mix(KR[kk], 0.12, -banded) : KR[kk]) + (kk == ${K.lime} || kk == ${K.paving} ? 0.15 * (grain - 0.5) : 0.04 * (blot - 0.5)), 0.04, 1.0);`);
    f = f.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor = banded < 0.0 ? -banded : mix(KM[kk], 0.0, banded);');
    // Each panel of the casing is set a little out of true, so the panels take the sky, the moon and the city each a
    // little differently, as plates of polished metal laid by hand do. It fades out before a panel is finer than a pixel.
    f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  if (kk == ${K.gold} && abs(vCell.w - 1.0) < 0.5 && banded < 0.5) {
    float pr = floor(vLocal.y / ${f1(CASING.course)}), pb = floor((vLocal.x + 4.5 * mod(pr, 2.0)) / 9.0);
    float fade = 1.0 - smoothstep(0.35, 0.8, length(fwidth(vLocal)) / 4.0);
    vec3 sideV = normalize(cross(normal, vUpV) + vec3(1e-5));
    vec3 upV = normalize(cross(sideV, normal) + vec3(1e-5));
    normal = normalize(normal + (sideV * (h21(vec2(pr, pb + 3.1)) - 0.5) + upV * (h21(vec2(pb, pr + 7.7)) - 0.5)) * ${f1(CASING.tilt)} * fade);
  }`);
    f = f.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    vec3 em = vec3(0.0);
    vec3 lit = lampsOn(vObj, nO) * KLit[kk];
    em += lit * diffuseColor.rgb * (KM[kk] > 0.5 ? 0.9 : 1.6);
    float seed = vCell.z;
    if (kk == ${K.core}) {
      em += heat(0.7 + 0.2 * uBreath + 0.1 * sin(3.14159 * vCell.y)) * (0.6 + 1.2 * uBreath) * (0.45 + 0.75 * sin(3.14159 * clamp(vCell.y, 0.0, 1.0)));
    } else if (kk == ${K.hall}) {
      // The hall seen between its columns: lit from low lamps, warmer and brighter toward the floor, uneven along its length.
      float y = vCell.y;
      float pool = 0.55 + 0.45 * wNoise(vec3(vObj.x * 0.25, 0.0, vObj.z * 0.25));
      em += heat(0.55 + 0.2 * (1.0 - y)) * (0.45 + 1.0 * (1.0 - y) * (1.0 - y)) * pool;
    } else if (kk == ${K.gate}) {
      em += heat(0.7) * 0.9 * (0.7 + 0.3 * vCell.y);
    } else if (kk == ${K.lamp}) {
      em += heat(0.82) * 1.5;
    } else if (kk == ${K.flame}) {
      float y = vCell.y;
      float fl = 0.75 + 0.25 * wNoise(vec3(seed * 13.0, uT * 3.1, y * 2.0));
      em += heat(mix(0.95, 0.45, y)) * (2.2 - 1.6 * y) * fl;
    } else if (kk == ${K.line}) {
      em += heat(0.6 + 0.25 * vCell.y) * (0.35 + 0.5 * vCell.y);
    } else if (kk == ${K.gold} && vCell.w > 1.5) {
      // The capstone takes the light of the gap under it up its faces.
      float up = clamp((vLocal.y - ${f1(PYRAMID.tall * PYRAMID.cut + PYRAMID.gap)}) / ${f1(PYRAMID.tall * (1 - PYRAMID.cut))}, 0.0, 1.0);
      em += heat(0.8) * (0.08 + 0.3 * uBreath) * pow(1.0 - up, 2.5);
    }
    if (kk == ${K.water}) {
      // What the pool reflects of the spire's foot: a point of the pool this far toward the visitor sees the spire this
      // high up it. A slow ripple moves the reflection across, and it fades into the pool's ends.
      vec3 rw = inverseTransformDirection(reflect(-normalize(vViewPosition), normal), viewMatrix);
      float wob = 0.012 * sin(vLocal.y * 0.42 + uT * 0.7) + 0.007 * sin(vLocal.y * 1.13 - uT * 1.1 + vLocal.x * 0.3);
      em += spireSeen(vObj, normalize(rw + vec3(wob, 0.0, 0.0))) * 0.9;
      // The warm glow the world lies under, on the water, broken by slow ripples along the pool, and the odd glint.
      float rip = wNoise(vec3(vLocal.x * 0.35, vLocal.y * 0.06 + uT * 0.05, 3.0)) * wNoise(vec3(vLocal.x * 0.9 + 4.0, vLocal.y * 0.15 - uT * 0.08, 9.0));
      float glint = smoothstep(0.82, 0.95, wNoise(vec3(vLocal.x * 1.7, vLocal.y * 0.5 + uT * 0.3, 1.0))) * (1.0 - smoothstep(0.3, 0.8, length(fwidth(vLocal))));
      em += mix(heat(0.4), vec3(0.32, 0.27, 0.22), 0.45) * (0.08 + 0.22 * rip) + heat(0.85) * 0.4 * glint;
      // The kerbs' edge caught along the surface.
      float poolHalf = wayAt(vLocal.y, ${f1(WAY.pool.half0)}, ${f1(WAY.pool.half1)});
      em += heat(0.5) * 0.06 * smoothstep(poolHalf - 1.4, poolHalf, abs(vLocal.x));
    }
    totalEmissiveRadiance += em;
  }`);
    f = f.replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n  material.clearcoat = KCoat[kk];');
    f = f.replace('#include <lights_fragment_end>', `#if defined( USE_CLEARCOAT )
  clearcoatRadiance *= KRoom[kk];
#endif
  radiance *= KRoom[kk];
  // The night round the city is not black low down: the glow of the city's own lights lies along the horizon, most
  // of it behind. Polished metal and water reflect it, which is what draws a face turned away from the cursor's light.
  {
    vec3 rw = inverseTransformDirection(reflect(-normalize(vViewPosition), normal), viewMatrix);
    float edge = ${f1(SKY_GLOW.edge)}, aa = max(fwidth(rw.y), 0.004);
    float band = smoothstep(edge + aa, edge - aa, rw.y) * smoothstep(-0.3, -0.04, rw.y) * (0.45 + 0.55 * smoothstep(-0.04, edge, rw.y));
    float behind = ${f1(SKY_GLOW.front)} + (1.0 - ${f1(SKY_GLOW.front)}) * smoothstep(0.3, -0.8, rw.z);
    vec3 glow = mix(heat(0.45), vec3(0.42, 0.36, 0.3), 0.35);
    radiance += (glow * ${f1(SKY_GLOW.power)} * band * behind + heat(0.3) * 0.04 * exp(-max(rw.y, 0.0) * 3.0)) * KSky[kk];
    // The night over the world is not black: a dim warm sky, brightest toward the moon, which polished metal and water
    // reflect, so a face turned up to the sky reads as dark metal and not as a hole.
    {
      float moon = max(dot(rw, normalize(vec3(${MOONWARD.map(f1).join(', ')}))), 0.0);
      radiance += (vec3(0.03, 0.025, 0.02) + heat(0.85) * 0.6 * pow(moon, 3.0)) * KSky[kk] * smoothstep(-0.1, 0.2, rw.y);
    }
    // The room was made for things a hand's width across: a face as large as the pyramid's sits whole inside one of its
    // lights and reads as paint. Gold reflects a sky of its own instead: the night, the glow along the horizon with a
    // hard edge, and the lit city on the crown.
    if (kk == ${K.gold}) {
      // The city on the crown, seen in the gold: toward the spire from where a face is, a warm band of lit towers with a
      // hard skyline over it.
      vec3 toCity = normalize(vec3(0.0, ${f1(CITY.y)}, 0.0) - vObj);
      float near = smoothstep(${f1(CITY.wide)}, 1.0, dot(normalize(rw.xz + vec2(1e-5)), normalize(toCity.xz + vec2(1e-5))));
      float under = smoothstep(${f1(CITY.top)} + aa, ${f1(CITY.top)} - aa, rw.y - toCity.y) * smoothstep(-0.3, -0.05, rw.y - toCity.y);
      float streak = mix(0.7 + 0.6 * wNoise(vec3(atan(rw.x, rw.z) * 60.0, 0.0, 1.0)), 1.0, smoothstep(0.02, 0.06, fwidth(atan(rw.x, rw.z))));
      radiance += heat(0.62) * ${f1(CITY.power)} * near * under * streak;
    }
  }
  reflectedLight.directDiffuse *= ${f1(LAMP_GAIN)};
  reflectedLight.directSpecular *= ${f1(LAMP_GAIN)};
#include <lights_fragment_end>`);
    sh.fragmentShader = f.replace('#include <opaque_fragment>', 'outgoingLight = heldUnder(outgoingLight - totalEmissiveRadiance) + totalEmissiveRadiance;\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'skycity-temple';
  return m;
}

function haloTexture(): THREE.Texture {
  const n = 64, c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!, grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  for (let i = 0; i <= 10; i++) { const k = i / 10; grad.addColorStop(k, `rgba(255,255,255,${(Math.exp(-k * 5) * (1 - k)).toFixed(3)})`); }
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export interface TempleMats { solid: THREE.MeshPhysicalMaterial; halo: THREE.SpriteMaterial }
export function templeMaterials(): TempleMats {
  const halo = new THREE.SpriteMaterial({ map: haloTexture(), color: new THREE.Color(hex('hot')), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  halo.name = 'templeHalo';
  return { solid: material(), halo };
}

// The capstone floats over the body at this height, for the halo and the light it throws.
export const GAP_Y = FOOT + PYRAMID.tall * PYRAMID.cut + PYRAMID.gap / 2;
