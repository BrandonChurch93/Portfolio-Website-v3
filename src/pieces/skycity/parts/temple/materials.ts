import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { NOISE, lin } from '../../../../world/surface';
import { SPIRE } from '../../layout';
import { polished } from '../../polish';
import { WAY, WAY_END } from './plan';

// The quarter's materials: one program for everything it is made of and everything it lights. What a piece is made of rides on its vertices: its kind in the cell attribute's x, and in its y, z and w what
// that kind needs (a gradient for a light, a seed, how far under its own top and over its own foot a stone is).

// Gold is a polished metal at the palette's own hue, between copper-light and hot: never a yellow brass.
const GOLD = new THREE.Color(hex('copper-light')).lerp(new THREE.Color(hex('hot')), 0.7).getHex();
const tone = (c: number, k: number) => new THREE.Color(c).multiplyScalar(k).getHex();

// Each kind: its color, how rough and how metallic, its clear coat, and how strongly the quarter's own lamps light it.
// A metal is lit only by what it reflects: the stage's room, the moon and the cursor's light. A polished metal is a
// mirror, never made bright by a gain or a glow, which is what read as orange paint.
interface Kind { color: number; rough: number; metal: number; coat: number; lit: number }
export const KIND = {
  // Pale warm limestone, dressed in courses: the terrace, the walls, the stone core of the pyramid.
  lime: { color: 0x5e5449, rough: 0.78, metal: 0, coat: 0, lit: 1 },
  // The same stone laid flat, a little darker, in slabs.
  paving: { color: 0x544a41, rough: 0.62, metal: 0, coat: 0.1, lit: 1 },
  // Dark polished granite: the obelisks' shafts, the ring's bar.
  granite: { color: 0x161413, rough: 0.22, metal: 0, coat: 0.5, lit: 0.6 },
  // The casing's gold plates.
  gold: { color: GOLD, rough: 0.05, metal: 1, coat: 0, lit: 0 },
  // Polished bronze: the casing's bronze plates, the ring.
  bronze: { color: tone(hex('bronze'), 1.05), rough: 0.12, metal: 1, coat: 0, lit: 0 },
  // The mirror: the pyramid's cap and the obelisks' caps.
  cap: { color: GOLD, rough: 0.035, metal: 1, coat: 0, lit: 0 },
  // Dark bronze, nearly black: the posts under the cap, ledges.
  dark: { color: tone(hex('bronze-deep'), 0.8), rough: 0.35, metal: 1, coat: 0, lit: 0.3 },
  copper: { color: hex('copper'), rough: 0.14, metal: 1, coat: 0, lit: 0 },
  // What the jungle has grown over the pyramid's foot: creepers and leaf in deep bronze and copper, matte, dark
  // against the gold.
  vine: { color: 0x2a170c, rough: 0.82, metal: 0, coat: 0, lit: 1 },
  // The way's long pool, of dark metal polished to a mirror, as the pools of this world are. It reflects the spire's
  // foot.
  pool: { color: tone(hex('bronze-deep'), 0.5), rough: 0.04, metal: 1, coat: 0, lit: 0 },
  // What gives light: a lamp, a brazier's flame, the line up the mast.
  lamp: { color: 0x0a0806, rough: 0.5, metal: 0, coat: 0, lit: 0 },
  flame: { color: 0x0a0806, rough: 0.5, metal: 0, coat: 0, lit: 0 },
  line: { color: 0x0a0806, rough: 0.5, metal: 0, coat: 0, lit: 0 },
} satisfies Record<string, Kind>;
export type KindName = keyof typeof KIND;
export const KINDS = Object.keys(KIND) as KindName[];
export const K = Object.fromEntries(KINDS.map((n, i) => [n, i])) as Record<KindName, number>;
export const STONE: KindName[] = ['lime', 'paving'];

// The lamps of the quarter, which it draws into its stone as the light they throw: where each is, in units, how
// strong, how far it reaches, and how hot its light is.
export interface Lamp { at: [number, number, number]; power: number; reach: number; heat: number; flicker?: boolean }
export const MAX_LAMPS = 64;

export const U = {
  uT: { value: 0 },
  uLamps: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Vector4()) },
  uLampK: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Vector2()) },
  uLampN: { value: 0 },
};

const col = (c: number) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
const arr = <T>(type: string, xs: T[], f: (x: T) => string) => `${type}[${xs.length}](${xs.map(f).join(', ')})`;
const f1 = (x: number) => x.toFixed(4);

// Age, for a temple of another world that has stood a very long time. Stone: how far under a ledge its stain runs
// down and how dark it is, how fine its streaks are, and how far up from its foot the dark of the ground reaches and
// how dark. Metal: the tarnish low on the casing, how high it reaches, and how much rougher it is there.
const AGE = { under: 7, stain: 0.55, streak: 0.55, foot: 5, dark: 0.5, tarnish: 0.45, tarnishUp: 46, dull: 0.22 };
// The horizon a polished face mirrors: how high over it the skyline of jungle and towers stands at its lowest and
// highest (as the sine of the angle), how many teeth it has round the turn, how strong the glow over it is in a mirror
// and how fast it fades upward, and how much of the room still shows under the skyline, which is the dark ground.
const HORIZON = { low: 0.02, high: 0.11, teeth: 9, power: 1.4, fade: 0.12, ground: 0.35 };
// The spire as the pool sees it: a column of warm light this wide either side of its axis, brighter low down where
// its lobby is, with a beacon at its tip. The spire is another part's, so the pool draws its light and not its form.
const SPIRE_SEEN = { half: 9, lobby: 30, beacon: 4 };

const COMMON = /* glsl */ `
varying vec4 vCell;
varying vec3 vObj;
varying vec3 vObjN;
varying vec2 vLocal;
uniform float uT;
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

const VERT_HEAD = 'attribute vec4 cell;\nvarying vec4 vCell;\nvarying vec3 vObj;\nvarying vec3 vObjN;\nvarying vec2 vLocal;';
const VERT_BODY = 'vLocal = uv;\nvCell = cell;\nvObj = position;\nvObjN = normal;';

function material(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
  m.name = 'temple';
  const ks = KINDS.map((n) => KIND[n] as Kind);
  const head = `
const vec3 KC[${ks.length}] = ${arr('vec3', ks, (x) => col(x.color))};
const float KR[${ks.length}] = ${arr('float', ks, (x) => f1(x.rough))};
const float KM[${ks.length}] = ${arr('float', ks, (x) => f1(x.metal))};
const float KCoat[${ks.length}] = ${arr('float', ks, (x) => f1(x.coat))};
const float KLit[${ks.length}] = ${arr('float', ks, (x) => f1(x.lit))};
vec3 spireSeen(vec3 p, vec3 r){
  if (r.z > -0.02 || p.z <= 0.0) return vec3(0.0);
  float t = -p.z / r.z; vec2 q = p.xy + r.xy * t;
  float ax = abs(q.x), w = ${f1(SPIRE_SEEN.half)} * mix(1.6, 0.35, clamp(q.y / ${f1(SPIRE.tall)}, 0.0, 1.0));
  float on = (1.0 - smoothstep(w * 0.6, w, ax)) * step(0.0, q.y) * (1.0 - smoothstep(${f1(SPIRE.tall - 6)}, ${f1(SPIRE.tall)}, q.y));
  vec3 c = heat(0.62 + 0.2 * smoothstep(${f1(SPIRE_SEEN.lobby)}, 0.0, q.y)) * (0.35 + 0.5 * smoothstep(${f1(SPIRE_SEEN.lobby + 8)}, 0.0, q.y)) * on;
  c += heat(0.95) * 2.0 * exp(-dot(q - vec2(0.0, ${f1(SPIRE.tall - 3)}), q - vec2(0.0, ${f1(SPIRE.tall - 3)})) / ${f1(SPIRE_SEEN.beacon * SPIRE_SEEN.beacon)});
  return c;
}
float wayAt(float z, float a, float b){ return a + (b - a) * clamp((z - ${f1(WAY.z0)}) / ${f1(WAY_END - WAY.z0)}, 0.0, 1.0); }
// The way's floor from the air: a band of dark polished stone along each side of the pool edged in gold, pale slabs
// out to the walls, and a band across at each terrace. Its color, and how much of the point is metal.
vec3 wayFloor(vec2 m, vec3 pale, out float metal){
  float ax = abs(m.x), fw = max(fwidth(ax), 1e-3);
  float inner = wayAt(m.y, ${f1(WAY.pool.half0)}, ${f1(WAY.pool.half1)}) + ${f1(WAY.pool.kerb + WAY.band)};
  vec3 c = mix(pale, ${col(0x1c1a18)}, 1.0 - smoothstep(inner - fw, inner + fw, ax));
  float s = mod(m.y - ${f1(WAY.stations[0])} + 20.0, 40.0) - 20.0, across = 1.0 - smoothstep(3.0 - fw, 3.0 + fw, abs(s));
  c = mix(c, ${col(0x1c1a18)}, across * step(inner, ax));
  metal = max(cover(abs(ax - inner), 0.8, fw), across * cover(abs(abs(s) - 3.0), 0.6, max(fwidth(s), 1e-3)) * step(inner, ax));
  return mix(c, ${col(GOLD)} * 0.9, metal);
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
  float rough = KR[kk], metal = KM[kk];
  if (kk == ${K.lime}) {
    // Courses of dressed stone, each block its own tone, the joints dark and thin, staggered course by course.
    float ch = 1.7 + 1.5 * h21(vec2(vCell.z * 0.37, 2.1)), bl = ch * (2.0 + h21(vec2(vCell.z, 5.3)));
    float row = floor(vLocal.y / ch), b = floor((vLocal.x + bl * 0.5 * mod(row, 2.0)) / bl);
    float tint = 0.9 + 0.2 * h21(vec2(row, b + vCell.z));
    float j = max(joint(vLocal.y, ch, 0.12), joint(vLocal.x + bl * 0.5 * mod(row, 2.0), bl, 0.12) * (1.0 - smoothstep(0.7, 0.95, abs(nO.y))));
    diffuseColor.rgb *= mix(tint, 1.0, smoothstep(0.25, 0.6, px)) * (1.0 - 0.38 * j) * (0.9 + 0.2 * grain) * (0.8 + 0.4 * blot);
    // Age: under each ledge a stain runs down the face in streaks, and the foot is dark where the ground meets it. A
    // flat top keeps neither.
    float side = 1.0 - smoothstep(0.6, 0.9, abs(nO.y));
    float streak = mix(wNoise(vec3(vLocal.x * ${f1(AGE.streak)}, vLocal.y * 0.04, vCell.z * 0.13 + 4.0)), 0.5, smoothstep(0.4, 1.0, px * ${f1(AGE.streak)}));
    float under = exp(-vCell.y / ${f1(AGE.under)}) * (0.45 + 0.9 * streak);
    diffuseColor.rgb *= 1.0 - ${f1(AGE.stain)} * clamp(under, 0.0, 1.0) * side;
    diffuseColor.rgb *= mix(${f1(1 - AGE.dark)}, 1.0, smoothstep(0.0, ${f1(AGE.foot)}, vCell.w) * (0.7 + 0.3 * streak) + (1.0 - side));
  } else if (kk == ${K.paving}) {
    vec2 m = vLocal;
    if (vCell.w > 0.5) {
      float a = joint(m.x, 4.0, 0.16), c = joint(m.y + 3.0 * mod(floor(m.x / 4.0), 2.0), 7.0, 0.16);
      float tint = 0.86 + 0.28 * h21(floor(vec2(m.x / 4.0, (m.y + 3.0 * mod(floor(m.x / 4.0), 2.0)) / 7.0)));
      float gm = 0.0;
      vec3 pale = KC[kk] * mix(tint, 1.0, smoothstep(0.25, 0.6, px)) * (1.0 - 0.38 * max(a, c)) * (0.8 + 0.4 * blot) * (1.0 - 0.3 * smoothstep(0.5, 0.8, wFbm(vec3(m * 0.04, 1.0))));
      diffuseColor.rgb = wayFloor(m, pale * 0.72, gm);
      metal = gm; rough = mix(rough, 0.12, gm);
    } else {
      float a = joint(m.x, 6.0, 0.2), c = joint(m.y + 3.0 * mod(floor(m.x / 6.0), 2.0), 9.0, 0.2);
      float tint = 0.88 + 0.24 * h21(floor(vec2(m.x / 6.0, (m.y + 3.0 * mod(floor(m.x / 6.0), 2.0)) / 9.0)));
      diffuseColor.rgb *= mix(tint, 1.0, smoothstep(0.25, 0.6, px)) * (1.0 - 0.4 * max(a, c)) * (0.9 + 0.2 * grain) * (0.8 + 0.4 * blot) * (1.0 - 0.3 * smoothstep(0.5, 0.8, wFbm(vec3(m * 0.04, 1.0))));
    }
  } else if (kk == ${K.gold} || kk == ${K.bronze}) {
    // Each plate a shade apart from the next, and tarnish low on the casing that dulls it, gathering most in the
    // joints and under each plate's lower edge.
    float tint = 0.98 + 0.03 * h21(vec2(vCell.z, 1.7));
    float low = 1.0 - smoothstep(0.0, ${f1(AGE.tarnishUp)}, vLocal.y);
    float spot = mix(wNoise(vec3(vObj.x * 0.35, vObj.y * 0.12, vObj.z * 0.35)), 0.5, smoothstep(0.3, 0.9, px * 0.35));
    float t = clamp(low * (0.55 + 0.9 * spot) + 0.5 * vCell.w, 0.0, 1.0);
    diffuseColor.rgb *= tint * (1.0 - ${f1(AGE.tarnish)} * t);
    rough += ${f1(AGE.dull)} * t;
  } else if (kk == ${K.vine}) {
    // Leaf: clusters of lighter and darker leaves, a few turned copper where they take the light, fading to their mean
    // before a leaf is finer than a pixel.
    float leaf = mix(wNoise(vObj * 1.3 + vCell.z), 0.5, smoothstep(0.35, 0.9, px * 1.3));
    float clump = wFbm(vObj * 0.18 + vCell.z);
    diffuseColor.rgb *= (0.55 + 0.9 * leaf) * (0.7 + 0.6 * clump);
    diffuseColor.rgb = mix(diffuseColor.rgb, ${col(hex('copper'))} * 0.35, smoothstep(0.62, 0.8, leaf) * (1.0 - smoothstep(0.4, 0.9, px)) * 0.6);
  } else if (kk == ${K.granite}) {
    diffuseColor.rgb *= 0.85 + 0.3 * mix(wNoise(vObj * 2.3), 0.5, smoothstep(0.2, 0.5, px));
  } else if (kk == ${K.cap} || kk == ${K.copper} || kk == ${K.dark}) {
    diffuseColor.rgb *= 0.96 + 0.08 * blot;
  }`);
    f = f.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = clamp(rough + (kk == ${K.lime} || kk == ${K.paving} ? 0.15 * (grain - 0.5) : 0.0), 0.04, 1.0);`);
    f = f.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor = metal;');
    f = f.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    vec3 em = lampsOn(vObj, nO) * KLit[kk] * diffuseColor.rgb * 1.6;
    float seed = vCell.z;
    if (kk == ${K.lamp}) {
      em += heat(0.82) * 1.5;
    } else if (kk == ${K.flame}) {
      float y = vCell.y;
      float fl = 0.75 + 0.25 * wNoise(vec3(seed * 13.0, uT * 3.1, y * 2.0));
      em += heat(mix(0.9, 0.45, y)) * (1.1 - 0.8 * y) * fl;
    } else if (kk == ${K.line}) {
      em += heat(0.6 + 0.25 * vCell.y) * (0.35 + 0.5 * vCell.y);
    } else if (kk == ${K.pool}) {
      // What the pool reflects of the spire's foot, moved by a slow ripple, and the warm glow the world lies under,
      // broken by ripples along the pool.
      vec3 rw = inverseTransformDirection(reflect(-normalize(vViewPosition), normal), viewMatrix);
      float wob = 0.012 * sin(vLocal.y * 0.42 + uT * 0.7) + 0.007 * sin(vLocal.y * 1.13 - uT * 1.1 + vLocal.x * 0.3);
      em += spireSeen(vObj, normalize(rw + vec3(wob, 0.0, 0.0))) * 0.45;
      float rip = wNoise(vec3(vLocal.x * 0.35, vLocal.y * 0.06 + uT * 0.05, 3.0)) * wNoise(vec3(vLocal.x * 0.9 + 4.0, vLocal.y * 0.15 - uT * 0.08, 9.0));
      em += mix(heat(0.4), vec3(0.32, 0.27, 0.22), 0.45) * (0.04 + 0.12 * rip);
    }
    totalEmissiveRadiance += em;
  }`);
    f = f.replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n  material.clearcoat = KCoat[kk];');
    // The world as a polished face of the quarter would show it, over the stage's room: the ground dark under the
    // horizon, the jungle and the towers standing on it as a jagged dark skyline, and the glow of the city's sky over
    // them, which ends on that skyline as a hard line. The room alone is a dark box with strips in it, and a face that
    // mirrored only it read as tiles or lit glass: a horizon is what tells a mirror.
    f = f.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  if (KM[kk] > 0.5 && metal > 0.5) {
    vec3 rw = inverseTransformDirection(reflect(-normalize(vViewPosition), normal), viewMatrix);
    float az = atan(rw.x, rw.z), h = rw.y, aw = max(fwidth(az), 1e-3), hw = max(fwidth(h), 0.002);
    float jag = mix(wNoise(vec3(az * ${f1(HORIZON.teeth)}, 0.0, 2.0)), 0.5, smoothstep(0.08, 0.3, aw * ${f1(HORIZON.teeth)}));
    float sky = ${f1(HORIZON.low)} + ${f1(HORIZON.high - HORIZON.low)} * jag;
    float over = smoothstep(sky - hw, sky + hw, h);
    float glow = over * exp(-max(h - sky, 0.0) / ${f1(HORIZON.fade)});
    float room = mix(${f1(HORIZON.ground)}, 1.0, over);
    float rough2 = 1.0 - smoothstep(0.05, 0.3, roughnessFactor);
    reflectedLight.indirectSpecular *= mix(1.0, room, rough2);
    reflectedLight.indirectSpecular += material.specularColorBlended * mix(${lin(hex('flame'))}, ${lin(hex('hot'))}, 0.5) * ${f1(HORIZON.power)} * glow * rough2;
  }`);
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => 'skycity-temple';
  return polished(m);
}

export interface TempleMats { solid: THREE.MeshPhysicalMaterial }
export function templeMaterials(): TempleMats {
  return { solid: material() };
}
