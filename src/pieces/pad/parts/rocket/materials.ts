import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { NOISE, lin } from '../../../../world/surface';
import { SCALE } from '../../layout';
import { CODE, FIN, H, HATCHES, R } from './form';

// The rocket's solids are one shader program. What each piece is made of rides on its vertices (the cell attribute:
// x its kind, y whether it is the body's skin, z which of the rocket's lights it is, w the way its grain runs), and
// everything a second look finds on the skin (the carbon's weave, the panel seams, the rivets, the hatches, the code)
// is worked out here from the model's own units and left out once it is finer than a pixel.

export const U = {
  // How high up the rocket its lights have come, in units from the mouth, and how hard the engine burns.
  uLevel: { value: -100 },
  uBurn: { value: 0 },
  uFlash: { value: 0 },
  uTime: { value: 0 },
  // Which way the cursor's light is from the rocket's axis, round it from straight toward the visitor, in radians.
  uKeyAz: { value: 0.3 },
  uCode: { value: null as THREE.Texture | null },
};

const col = (c: number) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
const tone = (n: PaletteName, k: number) => new THREE.Color(hex(n)).multiplyScalar(k).getHex();
const f = (x: number) => x.toFixed(3);

// The materials, by kind. metal 0 is a dielectric under a clear coat. room is how much of the studio it takes against
// the stage's level, and mirror how much its clear coat takes: a sharp coat over a dark base that takes little is what
// keeps a dark part near black with crisp lines of light on its edges. soft is how much of the room's light it takes
// as a rough surface does, scattered: on a rough dielectric that alone greyed the whole tank. streak is the long line
// the cursor's light draws along its grain.
interface Kind { color: number; rough: number; metal: number; coat: number; room: number; mirror: number; soft?: number; strip?: number; streak: number }
export const KIND = {
  // Satin carbon composite, wound round the tank: a warm near black under a clear coat that mirrors the room sharply.
  graphite: { color: 0x0b0b0b, rough: 0.7, metal: 0, coat: 0.9, room: 0.6, mirror: 2.4, soft: 0.25, streak: 0 },
  // Warm dark steel, turned round the axis: plainly grey beside the copper.
  steel: { color: 0x7d7973, rough: 0.27, metal: 1, coat: 0, room: 3.4, mirror: 0, streak: 0.9 },
  // Blackened steel for the fittings, the spike and the feet.
  dark: { color: 0x34312e, rough: 0.32, metal: 1, coat: 0.4, room: 3.2, mirror: 3, streak: 0.5 },
  copper: { color: tone('copper', 0.95), rough: 0.24, metal: 1, coat: 0, room: 3, mirror: 0, streak: 0.4 },
  // Matte black: the heat shield's tiles, the pads.
  black: { color: 0x0e0d0c, rough: 0.82, metal: 0, coat: 0, room: 1.2, mirror: 0, soft: 0.4, streak: 0 },
  // The bell: steel darkened by heat, and the bronze of its cooling tubes.
  bell: { color: 0x3a3532, rough: 0.36, metal: 1, coat: 0, room: 3, mirror: 0, streak: 0.6 },
  // The ports' glass, near black, and the light's diffusers, smoked.
  glass: { color: 0x0a0908, rough: 0.06, metal: 0, coat: 1, room: 1, mirror: 4, streak: 0 },
  diffuser: { color: 0x1b1814, rough: 0.4, metal: 0, coat: 0.6, room: 1, mirror: 2, streak: 0 },
} satisfies Record<string, Kind>;
export type KindName = keyof typeof KIND;
const NAMES = Object.keys(KIND) as KindName[];
export const K = Object.fromEntries(NAMES.map((n, i) => [n, i])) as Record<KindName, number>;

// Which of the rocket's lights a piece is: the line up the raceway, the slits between rings, the interstage's vents,
// the ports, the beacon on the spike.
export const LIGHT = { none: 0, line: 1, slit: 2, vent: 3, port: 4, beacon: 5 } as const;
// The way a piece's grain runs: none, round the axis, along the axis.
export const GRAIN = { none: 0, round: 1, along: 2 } as const;

// Long strip lights in the rocket's own room, reflected sharply, which is what draws a dark machine: where each is,
// round the axis from straight toward the visitor (radians), its half width, the heights it spans as the sine of the
// angle up, and how bright it is. The key strip stands where the cursor's light is, so its line slides up the body as
// the cursor moves. The rims stand behind each side and draw the outline. The top strip stands high behind and lays a
// pale line along the top of every edge and ring. The stage's own room light is too high for a cylinder seen nearly
// level to reflect, which left the body one soft smear.
export const STRIPS = {
  key: { w: 0.045, lo: -0.45, hi: 0.8, power: 7 },
  // A broad soft light beside the key, so the body turns across its curve and its sheen follows the cursor too.
  fill: { w: 0.7, power: 0.5 },
  rims: [{ az: 2.25, w: 0.1, power: 6 }, { az: -2.35, w: 0.07, power: 3 }],
  top: { az: Math.PI, span: 0.8, lo: 0.38, hi: 0.5, power: 3 },
} as const;

// The rims and bands light whole, in steps a visitor can count: lit as fine seams they read as a drawing on the body.
const READY = { rim: 1.1, flare: 2.6, settle: 22, steel: [0.18, 0.7] };
const FIRELIT = { at: -10, reach: 34, dark: 0.35, bright: 2.2 };

// Light the room and the cursor's light reflect off it is held under this, so a highlight never blooms into a ball.
const HOLD = { knee: 1.1, top: 1.7 };

const arr = <T>(type: string, xs: T[], g: (x: T) => string) => `${type}[${xs.length}](${xs.map(g).join(', ')})`;
const ks = NAMES.map((n) => KIND[n] as Kind);

const HEAD = /* glsl */ `
varying vec4 vCell;
uniform float uLevel, uBurn, uFlash, uTime, uKeyAz;
uniform sampler2D uCode;
const vec3 KC[${ks.length}] = ${arr('vec3', ks, (x) => col(x.color))};
const float KR[${ks.length}] = ${arr('float', ks, (x) => f(x.rough))};
const float KM[${ks.length}] = ${arr('float', ks, (x) => f(x.metal))};
const float KCo[${ks.length}] = ${arr('float', ks, (x) => f(x.coat))};
const float KRoom[${ks.length}] = ${arr('float', ks, (x) => f(x.room))};
const float KMir[${ks.length}] = ${arr('float', ks, (x) => f(x.mirror))};
const float KSoft[${ks.length}] = ${arr('float', ks, (x) => f(x.soft ?? 1))};
const float KStrip[${ks.length}] = ${arr('float', ks, (x) => f(x.strip ?? 1))};
const float KS[${ks.length}] = ${arr('float', ks, (x) => f(x.streak))};
vec3 rkRamp(float k){
  vec3 c = mix(${lin(hex('ember'))} * 1.6, ${lin(hex('flame'))}, smoothstep(0.0, 0.45, k));
  c = mix(c, ${lin(hex('hot'))}, smoothstep(0.45, 0.85, k));
  return mix(c, ${lin(hex('pale'))}, smoothstep(0.85, 1.2, k));
}
float sq2(float x){ return x * x; }
float rkBand(float d, float w, float aa){ return 1.0 - smoothstep(w, w + aa, abs(d)); }
float rkTurn(float a, float b){ float d = a - b; return atan(sin(d), cos(d)); }
// The strips' light reflected along R, a world direction, blurred by how rough the surface is.
vec3 rkStrips(vec3 R, float rough){
  float az = atan(R.x, R.z), el = R.y, widen = rough * rough * 0.9;
  vec3 L = vec3(0.0);
  float d = rkTurn(az, uKeyAz), aa = fwidth(d) * 1.5 + 0.002 + widen;
  L += ${f(STRIPS.fill.power)} * exp(-sq2(d / ${f(STRIPS.fill.w)})) * smoothstep(-0.7, -0.3, el) * (1.0 - smoothstep(0.5, 0.9, el));
  L += ${f(STRIPS.key.power)} * rkBand(d, ${f(STRIPS.key.w)}, aa) * smoothstep(${f(STRIPS.key.lo)} - 0.08, ${f(STRIPS.key.lo)}, el) * (1.0 - smoothstep(${f(STRIPS.key.hi)}, ${f(STRIPS.key.hi)} + 0.08, el)) * ${f(STRIPS.key.w)} / (${f(STRIPS.key.w)} + widen);
  ${STRIPS.rims.map((r) => `d = rkTurn(az, ${f(r.az)}); aa = fwidth(d) * 1.5 + 0.002 + widen;
  L += ${f(r.power)} * rkBand(d, ${f(r.w)}, aa) * smoothstep(-0.6, -0.4, el) * (1.0 - smoothstep(0.7, 0.85, el)) * ${f(r.w)} / (${f(r.w)} + widen);`).join('\n  ')}
  d = rkTurn(az, ${f(STRIPS.top.az)}); aa = fwidth(el) * 1.5 + 0.002 + widen;
  L += ${f(STRIPS.top.power)} * rkBand(el - ${f((STRIPS.top.lo + STRIPS.top.hi) / 2)}, ${f((STRIPS.top.hi - STRIPS.top.lo) / 2)}, aa) * rkBand(d, ${f(STRIPS.top.span)}, 0.3) * 0.15 / (0.15 + widen);
  return L * ${lin(hex('pale'))};
}
vec3 heldUnder(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m <= ${f(HOLD.knee)}) return c; float e = m - ${f(HOLD.knee)}; return c * (${f(HOLD.knee)} + e / (1.0 + e / ${f(HOLD.top - HOLD.knee)})) / m; }
// The skin's own frame: the distance round the body from straight in front, and the height.
vec2 skinAt(){ float r = length(vObj.xz); return vec2(atan(vObj.x, vObj.z) * r, vObj.y); }
// A groove of half width w at distance d, 0 to 1, and a dome of radius w.
float groove(float d, float w){ return 1.0 - smoothstep(0.0, w, abs(d)); }
// The distance to the nearest of n seams spaced evenly round the body, from an angle a0, in units round it.
float meridian(float a, float n, float a0, float r){ float q = (a - a0) / 6.2831853 * n; return (q - floor(q + 0.5)) * 6.2831853 / n * r; }
// The skin's relief, as a height: panel seams, rivets along the ring seams, the hatches' grooves and their screws. Its
// fine parts are faded by px, the units a pixel spans there.
float skinRelief(vec2 s, float a, float px, out float seam, out float paint){
  float y = s.y, r = length(vObj.xz);
  float lineFade = 1.0 - smoothstep(0.5, 1.4, px), dotFade = 1.0 - smoothstep(0.28, 0.6, px);
  float ring = 1e3, merid = 1e3, rivetPitch = 3.6, rivetRow = 1e3;
  if (y > ${f(H.tank)} && y < ${f(H.inter)}) {
    // The lower tank: three rings of panels, four round, their long seams under the fins' roots.
    float P = ${f((H.inter - H.tank) / 3)};
    float q = (y - ${f(H.tank)}) / P;
    ring = (q - floor(q + 0.5)) * P;
    merid = meridian(a, 4.0, 0.7854, r);
    rivetRow = abs(ring) - 2.0;
  } else if (y > ${f(H.upper)} && y < ${f(H.collar)}) {
    float P = ${f((H.collar - H.upper) / 2)};
    float q = (y - ${f(H.upper)}) / P;
    ring = (q - floor(q + 0.5)) * P;
    merid = meridian(a, 4.0, 0.7854, r);
    rivetRow = abs(ring) - 2.0;
  } else if (y > ${f(H.nose)} && y < ${f(H.tip)}) {
    // The nose's gores, and one ring.
    ring = y - ${f(H.nose + 52)};
    merid = meridian(a, 8.0, 0.3927, r) * smoothstep(${f(H.tip - 8)}, ${f(H.tip - 40)}, y) + 1e3 * smoothstep(${f(H.tip - 20)}, ${f(H.tip - 8)}, y);
    rivetRow = abs(ring) - 1.8;
    rivetPitch = 3.2;
  } else if (y > ${f(H.skirt)} && y < ${f(H.tank)}) {
    merid = meridian(a, 4.0, 0.7854, r);
  }
  float d = min(abs(ring), abs(merid));
  seam = groove(d, 0.42) * lineFade;
  float h = -seam * 0.12;
  // Rivets along each side of a ring seam.
  float rv = length(vec2(mod(s.x, rivetPitch) - 0.5 * rivetPitch, rivetRow));
  h += (1.0 - smoothstep(0.0, 0.62, rv)) * 0.16 * dotFade * step(rivetRow, 1.0);
  // The hatches: a groove round each, a screw in each corner.
  paint = 0.0;
  ${HATCHES.map((ht) => `{
    vec2 c = vec2(${f(ht.a)} * r, ${f(ht.h)}), hs = vec2(${f(ht.w / 2)}, ${f(ht.t / 2)});
    vec2 q = s - c; q.x = mod(q.x + 3.14159 * r, 6.28318 * r) - 3.14159 * r;
    vec2 e = abs(q) - hs;
    float box = length(max(e, 0.0)) + min(max(e.x, e.y), 0.0);
    h -= groove(box, 0.4) * 0.14 * lineFade;
    seam = max(seam, groove(box, 0.4) * lineFade);
    vec2 cq = abs(q) - hs + 2.4;
    h += (1.0 - smoothstep(0.0, 0.85, length(cq))) * 0.2 * dotFade;
  }`).join('\n')}
  return h;
}
`;

const VERT = { head: 'attribute vec4 cell;\nvarying vec4 vCell;\nvarying vec3 vObj;\nvarying vec3 vObjN;', body: 'vCell = cell;\nvObj = position;\nvObjN = normal;' };

// The clear coat, worked out here and not by three's own, whose program alone held a first visit for a fifth of a
// second: the room and the strips reflected sharply by Fresnel. Then the strips through the surface's own finish.
const STRIP_ADD = [
  '{',
  'vec3 sN = normalize((vec4(geometryNormal, 0.0) * viewMatrix).xyz), sV = normalize((vec4(geometryViewDir, 0.0) * viewMatrix).xyz);',
  'float sNv = clamp(dot(geometryNormal, geometryViewDir), 0.0, 1.0), sF = pow(1.0 - sNv, 5.0);',
  'vec3 sR = reflect(-sV, sN);',
  'vec3 sBase = material.specularColorBlended + (1.0 - material.specularColorBlended) * sF;',
  'float sCoat = (0.04 + 0.96 * sF) * KCo[rk] * (1.0 - rCode);',
  'reflectedLight.indirectSpecular += (getIBLRadiance(geometryViewDir, geometryNormal, 0.07 + 0.2 * rSeam) * KMir[rk] + rkStrips(sR, 0.0) * KStrip[rk]) * sCoat;',
  'reflectedLight.indirectSpecular += rkStrips(sR, material.roughness) * sBase * KStrip[rk] * KM[rk];',
  '}',
].join('\n');

export function hullMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3 });
  m.name = 'rocketHull';
  m.userData.uniforms = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${VERT.head}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT.body}`);
    let s = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vObj;\nvarying vec3 vObjN;\n${NOISE}\n${HEAD}`);
    s = s.replace('#include <color_fragment>', `#include <color_fragment>
  int rk = int(vCell.x + 0.5);
  bool onSkin = vCell.y > 0.5 && vCell.y < 1.5;
  vec2 rs = skinAt();
  float ra = atan(vObj.x, vObj.z);
  float rpx = max(length(fwidth(rs)), 1e-4);
  float rSeam = 0.0, rPaint = 0.0, rH = 0.0, rCode = 0.0;
  vec3 base = KC[rk];
  float tar = wFbm(vObj * 0.05 + 2.0);
  if (vCell.y > 1.5) {
    // A fin's face, in its own radius and height: a line of rivets up the root and in from the swept leading edge, a
    // seam across, and the faint grain of the sheet running out along it.
    float fr = length(vObj.xz), fy = vObj.y;
    vec2 e0 = vec2(${f(R + 0.6)}, ${f(FIN.rootHi - 1.2)}), ed = normalize(vec2(${f(FIN.out - 0.9 - R - 0.6)}, ${f(FIN.tipHi + 1.8 - FIN.rootHi + 1.2)}));
    vec2 fp = vec2(fr, fy) - e0;
    float lead = abs(dot(fp, vec2(-ed.y, ed.x))), along = dot(fp, ed);
    float fpx = max(fwidth(fr) + fwidth(fy), 1e-4);
    float dots = 1.0 - smoothstep(0.3, 0.7, fpx);
    float rv = min(length(vec2(mod(fy, 4.2) - 2.1, fr - ${f(R + 4.5)})), length(vec2(mod(along, 4.2) - 2.1, lead - 4.0)));
    rH += (1.0 - smoothstep(0.0, 0.55, rv)) * 0.18 * dots;
    float fs = groove(lead - 11.0, 0.35) * step(along, 0.0) * (1.0 - smoothstep(0.6, 1.4, fpx));
    fs = max(fs, groove(fy - 84.0, 0.35) * step(fr, ${f(R + 46)}) * (1.0 - smoothstep(0.6, 1.4, fpx)));
    rH -= fs * 0.12;
    base *= (1.0 - 0.45 * fs) * (0.94 + 0.12 * mix(0.5, wNoise(vec3(fr * 0.08, fy * 2.5, 4.0)), 1.0 - smoothstep(0.25, 0.6, fpx * 2.5)));
  }
  if (onSkin) {
    rH = skinRelief(rs, ra, rpx, rSeam, rPaint);
    if (rk == ${K.graphite}) {
      // The weave: a twill of tows, faded to its mean once a tow is finer than a pixel. Panel to panel the tone moves.
      vec2 tw = vec2(rs.x + rs.y, rs.x - rs.y) / 1.4;
      float wv = step(0.5, fract(tw.x)) == step(0.5, fract(floor(tw.y) * 0.5)) ? 1.0 : 0.0;
      float weaveFade = 1.0 - smoothstep(0.18, 0.4, rpx);
      base *= mix(1.0, 0.82 + 0.36 * wv, weaveFade);
      base *= 0.92 + 0.16 * wHash(vec3(floor(ra * 1.27 + 0.5), floor(rs.y / 23.0), 3.0));
      // The code, in pale paint, up the front of the lower tank.
      vec2 cu = vec2((rs.x - ${f(CODE.a * R)}) / ${f(CODE.w)} + 0.5, (rs.y - ${f(CODE.lo)}) / ${f(CODE.hi - CODE.lo)});
      if (cu.x > 0.0 && cu.x < 1.0 && cu.y > 0.0 && cu.y < 1.0) rCode = texture2D(uCode, cu).r * (1.0 - 0.45 * smoothstep(0.55, 0.85, wFbm(vObj * 0.7)));
    }
    base *= 1.0 - 0.55 * rSeam;
    base = mix(base, base * 1.35 + 0.012, rPaint * 0.5);
  }
  if (rk == ${K.steel} || rk == ${K.bell} || rk == ${K.dark}) {
    // Turned metal: fine rings round the axis, faded before they are finer than a pixel.
    float q = vObj.y * (vCell.w > 1.5 ? 0.0 : 1.0) + (vCell.w > 1.5 ? ra * 30.0 : 0.0);
    float fine = 1.0 - smoothstep(0.25, 0.6, max(fwidth(q), 1e-4) * 3.0);
    base *= 0.93 + 0.14 * mix(0.5, wNoise(vec3(q * 3.0, 1.0, 2.0)), fine) - 0.1 * smoothstep(0.55, 0.85, tar);
  }
  if (rk == ${K.bell}) {
    // The cooling tubes down the bell: ribs round it, which the light runs along.
    float rib = 0.5 + 0.5 * cos(ra * 48.0);
    float ribFade = 1.0 - smoothstep(0.3, 0.7, fwidth(ra * 48.0 / 6.2831853) * 3.0);
    base = mix(base, ${col(tone('bronze', 0.6))}, (0.12 + 0.18 * mix(0.5, rib, ribFade)) * smoothstep(${f(H.throat)}, 2.0, vObj.y));
    rH += (rib - 0.5) * 0.5 * ribFade;
  }
  base = mix(base, ${col(tone('pale', 0.66))}, rCode);
  diffuseColor.rgb = base;`);
    s = s.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor = rCode > 0.5 ? 0.0 : KM[rk];');
    s = s.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = clamp(KR[rk] + 0.18 * rSeam + 0.06 * (tar - 0.5) + 0.25 * rCode, 0.04, 1.0);');
    s = s.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  {
    // The relief, from how its height changes across the screen, as a bump map does: in the stage's metres, as the
    // screen's own positions are.
    vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), n0 = normal;
    vec3 r1 = cross(sy, n0), r2 = cross(n0, sx);
    float det = dot(sx, r1);
    vec2 dH = vec2(dFdx(rH), dFdy(rH)) * ${SCALE.toFixed(4)};
    vec3 g = sign(det) * (dH.x * r1 + dH.y * r2);
    if (abs(det) > 1e-12 && dot(g, g) < 1e6) normal = normalize(abs(det) * n0 - g);
  }`);
    s = s.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    float y = vObj.y, past = uLevel - y;
    float on = smoothstep(0.0, 4.0, past), front = exp(-max(past, 0.0) / 16.0) * on;
    int which = int(vCell.z + 0.5);
    vec3 e = vec3(0.0);
    if (which == ${LIGHT.line}) {
      e = rkRamp(0.6 + 0.5 * front) * (1.1 + 1.8 * front) * on;
    } else if (which == ${LIGHT.slit}) {
      e = rkRamp(0.5 + 0.5 * front) * (1.0 + 1.8 * front) * on;
    } else if (which == ${LIGHT.vent}) {
      e = rkRamp(0.3 + 0.5 * front) * (0.5 + 1.0 * front) * on;
    } else if (which == ${LIGHT.port}) {
      e = rkRamp(0.9 + 0.2 * front) * (0.7 + 1.0 * front) * on;
    } else if (which == ${LIGHT.beacon}) {
      e = rkRamp(1.0) * (1.6 + 1.6 * front) * on;
    }
    if (rk == ${K.copper} && which == ${LIGHT.none}) {
      float fl = exp(-max(past, 0.0) / ${f(READY.settle)}) * on;
      e += rkRamp(0.55 + 0.45 * fl) * (${f(READY.rim)} + ${f(READY.flare)} * fl) * on;
    }
    if (rk == ${K.steel} && which == ${LIGHT.none}) {
      float fl = exp(-max(past, 0.0) / ${f(READY.settle)}) * on;
      e += rkRamp(0.35 + 0.4 * fl) * (${f(READY.steel[0])} + ${f(READY.steel[1])} * fl) * on;
    }
    {
      vec3 toF = vec3(0.0, ${f(FIRELIT.at)}, 0.0) - vObj;
      float dF = length(toF), face = 0.3 + 0.7 * clamp(dot(normalize(vObjN), toF / max(dF, 1e-3)), 0.0, 1.0);
      float lum = dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2));
      e += rkRamp(0.5 + 0.3 * uFlash) * (uBurn + 2.0 * uFlash) * exp(-dF / ${f(FIRELIT.reach)}) * face * (${f(FIRELIT.dark)} + ${f(FIRELIT.bright)} * lum);
    }
    if (rk == ${K.bell}) {
      // The engine: inside the bell it burns from its throat, outside the bell's heat comes up near the throat.
      bool inner = dot(vObjN.xz, vObj.xz) < 0.0;
      float up = smoothstep(0.0, ${f(H.throat)}, y);
      float flick = 0.85 + 0.15 * wNoise(vec3(ra * 3.0, y * 0.4 - uTime * 14.0, 1.0));
      if (inner) e += rkRamp(0.55 + 0.6 * up + 0.4 * uFlash) * min(0.4 + 2.2 * up * up + 3.0 * uFlash, 2.4) * uBurn * flick;
      else e += rkRamp(0.2 + 0.3 * up) * 0.22 * up * uBurn;
    }
    totalEmissiveRadiance += e;
  }`);
    // Under its coat the carbon reflects nothing: the cursor's light off a rough base, however faint, greyed the whole tank.
    s = s.replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
  if (rk == ${K.graphite} && rCode < 0.5) { material.specularColorBlended = vec3(0.0); material.specularF90 = 0.0; }`);
    // The long line the cursor's light draws along a part's grain: round the axis it runs up the body.
    const L = THREE.ShaderChunk.lights_fragment_begin, at = L.indexOf('RE_Direct(', L.indexOf('getSpotLightInfo('));
    s = s.replace('#include <lights_fragment_begin>', `${L.slice(0, at)}if (KS[rk] > 0.0) {
      vec3 gT = vCell.w > 1.5 ? vec3(0.0, 1.0, 0.0) : (vCell.w > 0.5 ? vec3(vObj.z, 0.0, -vObj.x) : vec3(0.0));
      float gl = length(gT);
      if (gl > 1e-3) {
        vec3 T = normalize(mat3(viewMatrix) * (gT / gl));
        vec3 hv = directLight.direction + geometryViewDir; float hl = length(hv);
        if (hl > 1e-4) { hv /= hl; float th = dot(T, hv);
          reflectedLight.directSpecular += directLight.color * pow(max(1.0 - th * th, 0.0), 260.0) * max(dot(geometryNormal, directLight.direction), 0.0) * KS[rk] * mix(material.specularColorBlended, vec3(1.0), 0.5); }
      }
    }
    ${L.slice(at)}`);
    s = s.replace('#include <lights_fragment_end>', `  radiance *= KRoom[rk];
  iblIrradiance *= KSoft[rk];
${STRIP_ADD}
#include <lights_fragment_end>`);
    s = s.replace('#include <opaque_fragment>', 'outgoingLight = heldUnder(outgoingLight - totalEmissiveRadiance) + totalEmissiveRadiance;\n#include <opaque_fragment>');
    sh.fragmentShader = s;
  };
  m.customProgramCacheKey = () => 'rocket-hull';
  return m;
}

// The code up the lower tank: a made up serial, read from the foot up, in pale stencil.
export async function codeTexture(): Promise<THREE.CanvasTexture> {
  const W = 128, Ht = 1056, font = '700 92px "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace';
  try { await document.fonts.load(font); } catch { /* the fallback face is fine */ }
  const c = document.createElement('canvas');
  c.width = W; c.height = Ht;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, Ht);
  g.translate(W / 2, Ht / 2);
  g.rotate(-Math.PI / 2);
  g.fillStyle = '#fff';
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const text = 'R7·0914', step = 120;
  [...text].forEach((ch, i) => g.fillText(ch, (i - (text.length - 1) / 2) * step, 2));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
