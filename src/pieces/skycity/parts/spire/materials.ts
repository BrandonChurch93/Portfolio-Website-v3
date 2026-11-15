import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { NOISE, lin } from '../../../../world/surface';
import { polished } from '../../polish';
import { BLINK, CORE, CROWN, DECK, LIFT, PYLON, ROOM, SQ, SUN, TERRACE, TIERS } from './form';

// The spire's materials: one program for everything it is built of, and one for everything that is glass or light.
// What a piece is made of rides on its vertices (the kind, in the cell attribute's x).

export const U = {
  uT: { value: 0 },
  // The foot of the lift's car, in units up the line, and how bright the beacon is, 0 to 1.
  uLift: { value: LIFT.levels[0] as number },
  uBeacon: { value: 0.5 },
  // The pulse that climbs the rings of light, as the height its middle has reached.
  uPulse: { value: -100 },
};

interface Solid { color: number; rough: number; metal: number }
const tone = (n: PaletteName, k: number) => new THREE.Color(hex(n)).multiplyScalar(k).getHex();
// Gold: a polished metal at the palette's own hue, between copper-light and hot, never a yellow brass.
const GOLD = new THREE.Color(hex('copper-light')).lerp(new THREE.Color(hex('hot')), 0.7).lerp(new THREE.Color(hex('pale')), 0.35).getHex();
// Copper: the palette's own, redder and darker than the gold beside it.
const COPPER = hex('copper');
// The three metals differ in value and in finish, so they can be told apart without hue: gold is the lightest and
// the most mirror like, copper redder and darker, bronze brown and darkest. Against them the stone is pale and
// matte, the steel near black, and the glass dark.
export const SOLID = {
  stone: { color: 0x544d46, rough: 0.7, metal: 0 },
  // The courses, the roofs and the door's reveals, a darker stone.
  base: { color: 0x403a34, rough: 0.8, metal: 0 },
  gold: { color: GOLD, rough: 0.09, metal: 1 },
  copper: { color: COPPER, rough: 0.13, metal: 1 },
  bronze: { color: tone('bronze-deep', 1.1), rough: 0.17, metal: 1 },
  // Polished black stone for the shaft's pilasters: the obelisk's own stone, drawn by the light on its arrises.
  jet: { color: 0x15120f, rough: 0.2, metal: 0.25 },
  // Blackened steel: the deck's top, the struts, the needle.
  dark: { color: 0x242220, rough: 0.34, metal: 0.85 },
} satisfies Record<string, Solid>;
export type SolidName = keyof typeof SOLID;
const SOLIDS = Object.keys(SOLID) as SolidName[];

// Glass and light: the shaft's glass with its rooms, the gates' doors, the sun, the gallery, the line of light and the
// lift, the rings' lights, the nav lights and the beacon.
export const LIGHTS = ['glass', 'door', 'sun', 'gallery', 'line', 'ring', 'blink', 'beacon', 'stud', 'slit'] as const;
export type LightName = (typeof LIGHTS)[number];

const col = (c: number) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
const arr = <T>(type: string, xs: T[], f: (x: T) => string) => `${type}[${xs.length}](${xs.map(f).join(', ')})`;
const f1 = (x: number) => x.toFixed(3);

const HOLD = { knee: 0.9, top: 1.35 };
// Polished metal's ceiling: high enough that the strips' highlights run to the palette's pale, low enough that the
// moon, many hundred times brighter in a mirror, does not flood the stage's glow over the whole crown.
const MIRROR = { knee: 4, top: 24 };
// The heights of the lit rings, for the light each lays on what is under it.
const RINGS_Y = CROWN.map((c) => c.y);
const COMMON = /* glsl */ `
varying float vKind;
varying vec3 vObj;
varying vec3 vObjN;
varying vec3 vCam;
uniform float uT, uLift, uBeacon, uPulse;
${NOISE}
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// Light by how hot it is: ember, flame, hot, pale.
vec3 heat(float k){
  vec3 c = mix(${lin(hex('ember'))}, ${lin(hex('flame'))}, smoothstep(0.0, 0.45, k));
  c = mix(c, ${lin(hex('hot'))}, smoothstep(0.45, 0.85, k));
  return mix(c, ${lin(hex('pale'))}, smoothstep(0.85, 1.0, k));
}
float bearing(vec3 p){ return atan(p.x, p.z); }
float pulseAt(float y){ return exp(-pow((y - uPulse) / 40.0, 2.0)); }
// What the room and the cursor's light reflect is held under pale, so a glint on glass or polished metal stays a glint
// and never blooms. The spire's own lights are added after.
vec3 mirrorHeld(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m <= ${f1(MIRROR.knee)}) return c; float e = m - ${f1(MIRROR.knee)}; return c * (${f1(MIRROR.knee)} + e / (1.0 + e / ${f1(MIRROR.top - MIRROR.knee)})) / m; }
vec3 heldUnder(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m <= ${f1(HOLD.knee)}) return c; float e = m - ${f1(HOLD.knee)}; return c * (${f1(HOLD.knee)} + e / (1.0 + e / ${f1(HOLD.top - HOLD.knee)})) / m; }
`;
const HOLD_CHUNK = 'outgoingLight = heldUnder(outgoingLight - totalEmissiveRadiance) + totalEmissiveRadiance;\n#include <opaque_fragment>';

const VERT_HEAD = 'attribute vec4 cell;\nvarying float vKind;\nvarying vec3 vObj;\nvarying vec3 vObjN;\nvarying vec3 vCam;';
const VERT_BODY = 'vKind = cell.x;\nvObj = position;\nvObjN = normal;\nvCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;';

interface Chunks { head: string; color: string; rough?: string; metal?: string; normal?: string; emissive?: string; room?: string; after?: string; hold?: string }

function patch(m: THREE.MeshPhysicalMaterial, key: string, c: Chunks): void {
  m.userData.uniforms = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${VERT_HEAD}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_BODY}`);
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>\n${COMMON}\n${c.head}`);
    f = f.replace('#include <color_fragment>', `#include <color_fragment>\n${c.color}`);
    if (c.rough) f = f.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${c.rough}`);
    if (c.metal) f = f.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${c.metal}`);
    if (c.normal) f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${c.normal}`);
    if (c.emissive) f = f.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${c.emissive}`);
    if (c.after) f = f.replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>\n${c.after}`);
    f = f.replace('#include <lights_fragment_end>', `${c.room ?? ''}\n#include <lights_fragment_end>`);
    sh.fragmentShader = f.replace('#include <opaque_fragment>', c.hold ?? HOLD_CHUNK);
  };
  m.customProgramCacheKey = () => key;
  polished(m);
}

// Which gate a bearing faces, as the gate's bearing in radians, and where a point is across that gate's face.
const GATE_GLSL = `
float gateOf(vec3 p){ return floor(bearing(p) / 1.5707963 + 0.5) * 1.5707963; }
vec2 gateLocal(vec3 p){ float g = gateOf(p); vec2 n = vec2(sin(g), cos(g)), t = vec2(cos(g), -sin(g)); return vec2(dot(p.xz, t), dot(p.xz, n)); }
`;

function solidMaterial(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3, clearcoat: 0, clearcoatRoughness: 0.1 });
  m.name = 'spireSolid';
  const s = SOLIDS.map((n) => SOLID[n] as Solid);
  const K = (n: SolidName) => SOLIDS.indexOf(n);
  patch(m, 'spire-solid-5', {
    head: `
const vec3 SC[${s.length}] = ${arr('vec3', s, (x) => col(x.color))};
const float SR[${s.length}] = ${arr('float', s, (x) => f1(x.rough))};
const float SM[${s.length}] = ${arr('float', s, (x) => f1(x.metal))};
const float RINGS_Y[${RINGS_Y.length}] = ${arr('float', RINGS_Y, f1)};
const vec3 GOLD = ${col(GOLD)};
${GATE_GLSL}
float inlay = 0.0;
float slit = 0.0, slitLit = 0.0;
// The terrace's slit windows: three to each side of each gate, tall and narrow, cut where its wall is and nowhere else.
void terraceSlits(vec3 p, vec3 n, float px){
  float y = p.y;
  if (y < 6.0 || y > ${f1(TERRACE.top - 3)}) return;
  vec2 gl = gateLocal(p);
  float g = gateOf(p);
  float R = ${f1(TERRACE.r0)} + ${f1(TERRACE.r1 - TERRACE.r0)} * clamp((y - ${f1(TERRACE.from)}) / ${f1(TERRACE.top - TERRACE.from)}, 0.0, 1.0);
  float th = bearing(p);
  float sw = 1.0 / pow(pow(abs(sin(th)), ${f1(SQ)}) + pow(abs(cos(th)), ${f1(SQ)}), ${f1(1 / SQ)});
  if (abs(length(p.xz) - R * sw) > 0.5 || dot(n.xz, vec2(sin(g), cos(g))) < 0.6) return;
  float u = abs(gl.x) - 27.0, k = floor(u / 6.5 + 0.5);
  if (k < 0.0 || k > 2.0) return;
  float du = abs(u - k * 6.5), top = ${f1(TERRACE.top - 4)} - k * 3.0, bot = 7.0;
  float aa = max(fwidth(u), 0.02);
  float m = (1.0 - smoothstep(0.7 - aa, 0.7 + aa, du)) * smoothstep(bot - aa, bot + aa, y) * (1.0 - smoothstep(top - aa, top + aa, y));
  slit = mix(m, m * 0.6, smoothstep(0.4, 0.9, px));
  slitLit = exp(-(y - bot) / 5.0) + 0.3 * step(0.5, h21(vec2(k, sign(gl.x) + g * 3.0))) * exp(-pow((y - top + 4.0) / 2.5, 2.0));
}
// The marks cut in a cartouche on each tower of a pylon's face, inlaid with gold: abstract, in rows, like the Sun
// stone's glyphs. Not letters.
float cartouche(vec2 q, float px){
  float cx = sign(q.x) * ${f1((PYLON.door + PYLON.half1) / 2 + 0.6)};
  vec2 c = vec2(q.x - cx, q.y - 17.5);
  vec2 hs = vec2(3.3, 12.0);
  vec2 d = abs(c) - hs + 1.3;
  float box = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 1.3;
  float ring = 1.0 - smoothstep(0.1, 0.24, abs(box + 0.35));
  float row = floor((c.y + hs.y - 1.3) / 2.4), ry = fract((c.y + hs.y - 1.3) / 2.4) - 0.5;
  float pick = h21(vec2(row, sign(q.x) * 3.0 + 9.0));
  vec2 g = vec2(c.x, ry * 2.4);
  float mark = 0.0;
  if (pick < 0.3) mark = 1.0 - smoothstep(0.6, 0.78, length(g));
  else if (pick < 0.55) mark = (1.0 - smoothstep(1.4, 1.58, abs(g.x))) * (1.0 - smoothstep(0.22, 0.36, abs(g.y)));
  else if (pick < 0.78) mark = (1.0 - smoothstep(0.18, 0.32, abs(g.x))) * (1.0 - smoothstep(0.66, 0.8, abs(g.y)));
  else mark = (1.0 - smoothstep(0.0, 0.14, abs(g.x) * 0.9 + g.y * 0.55 - 0.3)) * step(-0.6, g.y);
  mark *= step(box, -0.8) * step(abs(c.y), hs.y - 1.7);
  return mix(max(ring, mark), 0.06, smoothstep(0.45, 0.9, px));
}
`,
    color: `
  int sk = int(vKind + 0.5);
  vec3 N0 = normalize(vObjN);
  float px = length(fwidth(vObj));
  float grain = wNoise(vec3(vObj.x * 2.4, vObj.y * 2.4, vObj.z * 2.4));
  grain = mix(grain, 0.5, smoothstep(0.12, 0.45, px));
  float blot = wFbm(vObj * 0.11 + 7.0);
  diffuseColor.rgb = SC[sk];
  if (sk == ${K('stone')} || sk == ${K('base')}) {
    // Courses of cut stone, the joints staggered course by course, each block its own tone.
    float q = vObj.y / 3.3, course = floor(q), jy = 0.5 - abs(fract(q) - 0.5);
    float slim = step(length(vObj.xz), ${f1(TIERS[0].a0 + 14)}) * step(${f1(TERRACE.top + 4)}, vObj.y);
    float along = abs(N0.y) > 0.7 ? length(vObj.xz) * 0.5 : length(vObj.xz) * bearing(vObj) / 7.0 + course * 0.5;
    float jx = 0.5 - abs(fract(along) - 0.5);
    float fine = smoothstep(0.08, 0.22, fwidth(q));
    float joint = max(1.0 - smoothstep(0.025, 0.06, jy), (1.0 - smoothstep(0.02, 0.05, jx)) * (1.0 - step(0.7, abs(N0.y))) * (1.0 - slim));
    // The arris of each course, worn round, catches a little more light just under the joint over it.
    float arris = smoothstep(0.86, 0.94, fract(q)) * (1.0 - smoothstep(0.95, 0.975, fract(q))) * (1.0 - fine);
    float block = h21(vec2(course, floor(along) * (1.0 - slim)));
    // Weather: darker streaks run down from each ledge, the foot of every wall is darker, and the high stone is
    // cleaner than the old terrace.
    float streak = wNoise(vec3(vObj.x * 0.9, vObj.y * 0.05, vObj.z * 0.9));
    float foot = smoothstep(-4.0, 6.0, vObj.y);
    float age = mix(0.86, 1.0, smoothstep(30.0, 120.0, vObj.y));
    diffuseColor.rgb *= (0.68 + 0.5 * block) * (1.0 - 0.6 * joint * (1.0 - fine)) * (1.0 + 0.18 * arris) * (0.9 + 0.2 * grain) * (0.92 + 0.12 * blot) * (0.84 + 0.2 * streak) * (0.66 + 0.34 * foot) * age;
    vec2 gl = gateLocal(vObj);
    if (sk == ${K('stone')} && gl.y > ${f1(PYLON.face1 - 1)} && dot(N0.xz, vec2(sin(gateOf(vObj)), cos(gateOf(vObj)))) > 0.8 && abs(gl.x) > ${f1(PYLON.door + 0.6)} && vObj.y < ${f1(PYLON.top - 4)}) {
      inlay = cartouche(vec2(gl.x, vObj.y), px);
      diffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - 0.3 * inlay), GOLD, inlay * 0.85);
    }
    if (sk == ${K('stone')}) { terraceSlits(vObj, N0, px); diffuseColor.rgb *= 1.0 - 0.85 * slit; }
  } else if (sk == ${K('bronze')}) {
    diffuseColor.rgb *= 0.94 + 0.12 * blot;
  } else if (sk == ${K('copper')}) {
    diffuseColor.rgb *= 0.95 + 0.1 * blot;
  } else if (sk == ${K('jet')}) {
    diffuseColor.rgb *= 0.9 + 0.2 * blot;
  } else if (sk == ${K('dark')}) {
    diffuseColor.rgb *= (0.85 + 0.3 * grain) * (0.9 + 0.2 * blot);
  }`,
    rough: `roughnessFactor = clamp(SR[sk] + (SM[sk] > 0.9 ? 0.04 * (blot - 0.5) : 0.12 * (grain - 0.5)), 0.05, 1.0);
  roughnessFactor = mix(roughnessFactor, 0.3, inlay);`,
    metal: `metalnessFactor = mix(SM[sk], 1.0, inlay);`,
    emissive: `
  float r = length(vObj.xz);
  // Each lit ring lays its light on what is just under it and close to it.
  if (sk == ${K('stone')}) {
    float w = 0.0;
    for (int i = 0; i < ${RINGS_Y.length}; i++) { float d = RINGS_Y[i] - vObj.y; w += smoothstep(-0.3, 0.6, d) * exp(-max(d, 0.0) / 8.0) * (0.6 + 1.2 * pulseAt(RINGS_Y[i])); }
    totalEmissiveRadiance += heat(0.6) * 0.05 * w;
  }
  // The gates' light lies on the plaza stone and the threshold in front of each door.
  if (sk == ${K('base')} || sk == ${K('stone')}) {
    vec2 gl = gateLocal(vObj);
    float top = smoothstep(0.6, 0.9, N0.y);
    float spill = exp(-max(gl.y - ${f1(PYLON.face0)}, 0.0) / 6.0) * step(${f1(PYLON.face0 - 4)}, gl.y) * exp(-pow(gl.x / 6.0, 2.0));
    totalEmissiveRadiance += heat(0.62) * 0.32 * top * spill;
  }
  totalEmissiveRadiance += heat(0.62) * 0.55 * slit * slitLit;
  // The lift's car lights the front rib either side of the line as it passes.
  float lm = uLift + ${f1(LIFT.tall / 2)};
  if ((sk == ${K('stone')} || sk == ${K('jet')}) && vObj.z > 0.0) totalEmissiveRadiance += heat(0.7) * 0.2 * exp(-abs(vObj.y - lm) / 5.0) * exp(-abs(vObj.x) / 2.5) * step(${f1(LIFT.levels[0] - 2)}, vObj.y);`,
    room: `#if defined( USE_CLEARCOAT )\n  clearcoatRadiance *= 0.0;\n#endif`,
    hold: `outgoingLight = (SM[sk] < 0.9 ? heldUnder(outgoingLight - totalEmissiveRadiance) : mirrorHeld(outgoingLight - totalEmissiveRadiance)) + totalEmissiveRadiance;\n#include <opaque_fragment>`,
  });
  return m;
}

function lightMaterial(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0x060606, metalness: 0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.6, specularIntensity: 1 });
  m.name = 'spireGlass';
  const L = (n: LightName) => LIGHTS.indexOf(n);
  patch(m, 'spire-glass-4', {
    head: `
// The rooms behind the core's glass, seen through it with their depth: each bay of each storey is a room, and the ray
// from the eye is followed into it to its floor, its walls or its back wall. A storey is dark, dim or lit, tenants
// hold runs of bays along it, and a room's light falls from its ceiling, so its back wall is brightest high up and its
// floor is lit in a pool. Bays fade to their storey's average before a mullion is finer than a pixel, and storeys to
// the whole face's before a slab is.
vec3 rooms(vec3 p, vec3 cam){
  float th = bearing(p), face = floor(th / 1.5707963 + 0.5);
  float phi = face * 1.5707963;
  vec2 nf = vec2(sin(phi), cos(phi)), tf = vec2(cos(phi), -sin(phi));
  vec3 vd = normalize(p - cam);
  vec3 rd = vec3(dot(vd.xz, tf), vd.y, max(0.12, -dot(vd.xz, nf)));
  float u = dot(p.xz, tf);
  float fx = u / ${f1(ROOM.bay)}, fy = (p.y - ${f1(CORE.from)}) / ${f1(ROOM.tall)};
  float fi = floor(fy), ff = fract(fy);
  const float BW = ${f1(ROOM.bay * 4)}, FT = ${f1(ROOM.tall)}, DP = ${f1(ROOM.deep)}, SP = 0.26;
  float rx = u / BW, ri = floor(rx);
  float sl = h21(vec2(fi, face * 7.1 + 3.7));
  float lvl = sl < 0.18 ? 0.05 : sl < 0.7 ? 0.22 : 0.6;
  // The two storeys under each cornice are a sky lobby, all lit.
  float sky = 0.0;
  ${TIERS.slice(0, 2).map((t) => `sky = max(sky, step(${f1(t.to - 7)}, p.y) * step(p.y, ${f1(t.to)}));`).join('\n  ')}
  lvl = mix(lvl, 0.36, sky);
  float on = step(0.3, h21(vec2(fi + face * 31.0, ri)));
  on = mix(on, 1.0, sky);
  float k = 0.38 + 0.44 * h21(vec2(fi * 0.37 + face, ri)) + 0.1 * sky;
  vec3 o = vec3(fract(rx) * BW, ff * FT, 0.0);
  float tx = rd.x > 0.0 ? (BW - o.x) / max(rd.x, 1e-4) : o.x / max(-rd.x, 1e-4);
  float ty = rd.y > 0.0 ? (FT - o.y) / max(rd.y, 1e-4) : (o.y - SP * FT) / max(-rd.y, 1e-4);
  float tz = DP / rd.z;
  float t = min(tx, min(ty, tz));
  vec3 h = o + rd * t;
  float c;
  if (t == tz) {
    c = 0.3 + 0.6 * smoothstep(0.2, 1.0, h.y / FT);
    float f = h21(vec2(ri + fi * 1.7, face + 2.0));
    if (f > 0.4 && h.y < FT * (0.5 + 0.12 * f) && abs(h.x - BW * f) < BW * 0.2) c *= 0.18;
    if (f < 0.3) c += 0.8 * exp(-pow((h.x - BW * (0.25 + f)) / 0.45, 2.0) - pow((h.y - FT * 0.62) / 0.45, 2.0));
  } else if (t == tx) c = 0.24 * (1.0 - 0.5 * h.z / DP) + 0.22 * smoothstep(0.55, 1.0, h.y / FT);
  else if (rd.y > 0.0) c = 0.5 + 1.1 * (1.0 - smoothstep(0.3, 0.8, abs(h.z / DP - 0.45) * 2.0));
  else c = 0.1 + 0.55 * exp(-pow((h.z / DP - 0.45) * 2.4, 2.0)) * exp(-pow((h.x / BW - 0.5) * 1.6, 2.0));
  float bx = fract(fx);
  float frame = smoothstep(0.04, 0.1, bx) * (1.0 - smoothstep(0.9, 0.96, bx));
  float spand = smoothstep(SP, SP + 0.04, ff) * (1.0 - smoothstep(0.97, 1.0, ff));
  vec3 lit = heat(k) * lvl * on * c * frame * spand;
  float fB = smoothstep(0.3, 0.7, fwidth(fx)), fR = smoothstep(0.35, 0.75, fwidth(rx)), fF = smoothstep(0.3, 0.65, fwidth(fy));
  lit = mix(lit, heat(k) * lvl * on * 0.45 * 0.82 * spand, fB);
  lit = mix(lit, heat(0.6) * lvl * 0.68 * 0.45 * 0.82 * spand, fR);
  return mix(lit, heat(0.6) * 0.27 * 0.6 * 0.45 * 0.74 * 0.82, fF);
}`,
    color: `
  int lk = int(vKind + 0.5);`,
    rough: `bool glassy = lk == ${L('glass')} || lk == ${L('door')} || lk == ${L('sun')} || lk == ${L('gallery')};
  roughnessFactor = lk == ${L('glass')} ? 0.07 : glassy ? 0.045 : 0.4;`,
    after: 'material.clearcoat = glassy ? 0.5 : 0.0;',
    emissive: `
  vec3 em = vec3(0.0);
  vec3 p = vObj;
  float a = bearing(p), y = p.y;
  if (lk == ${L('glass')}) {
    em += rooms(p, vCam);
    // The sun over the shaft lays its light down the top of the glass.
    em += heat(0.62) * 0.22 * exp(-max(${f1(SUN.y)} - y, 0.0) / 22.0);
    // What the glass reflects of the night: the glow the city throws into the sky, warm and low, strongest where the
    // glass turns away from the eye and fading toward the top of each face.
    float graze = 1.0 - abs(dot(normalize(vObjN), normalize(vCam - p)));
    em += heat(0.18) * (0.05 + 0.28 * graze * graze) * (1.0 - 0.6 * smoothstep(${f1(CORE.from)}, ${f1(DECK.sill)}, y));
  } else if (lk == ${L('door')}) {
    float gx = fract((length(p.xz) * sin(a - floor(a / 1.5707963 + 0.5) * 1.5707963)) / 1.15 + 0.5);
    float aa = fwidth(gx);
    float mull = mix(smoothstep(0.06, 0.12, gx) * (1.0 - smoothstep(0.88, 0.94, gx)), 0.85, smoothstep(0.25, 0.5, aa));
    float tr = smoothstep(0.15, 0.3, abs(y - 19.0));
    float fall = mix(1.0, 0.5, smoothstep(0.0, ${f1(PYLON.lintel[0])}, y));
    em += heat(0.62 + 0.18 * fall) * 0.55 * mull * tr * fall;
  } else if (lk == ${L('sun')}) {
    // The sun: glass in a lattice of meridians and parallels, lit from inside, brightest at its heart.
    vec3 q = p - vec3(0.0, ${f1(SUN.y)}, 0.0);
    float lat = asin(clamp(q.y / ${f1(SUN.r)}, -1.0, 1.0)) / 3.14159265 * 12.0, lon = a / 6.2831853 * 32.0;
    float fl = smoothstep(0.25, 0.6, fwidth(lat)), fo = smoothstep(0.25, 0.6, fwidth(lon));
    float pane = mix(smoothstep(0.04, 0.11, fract(lat)) * (1.0 - smoothstep(0.89, 0.96, fract(lat))), 0.85, fl);
    pane *= mix(smoothstep(0.04, 0.11, fract(lon)) * (1.0 - smoothstep(0.89, 0.96, fract(lon))), 0.85, fo);
    // Brightest where the eye looks into it, so it reads as a ball of light and not a lamp shade.
    float into = pow(abs(dot(normalize(vObjN), normalize(vCam - p))), 1.5);
    float heart = 0.45 + 0.55 * into;
    em += heat(0.7 + 0.26 * heart) * (1.1 + 2.3 * heart * heart) * mix(pane, 1.0, 0.45 + 0.3 * into);
  } else if (lk == ${L('gallery')}) {
    float s = clamp((y - ${f1(DECK.sill)}) / ${f1(DECK.roof - DECK.sill)}, 0.0, 1.0);
    float b = a / 6.2831853 * 128.0, fb = smoothstep(0.25, 0.6, fwidth(b));
    float pane = mix(smoothstep(0.06, 0.14, fract(b)) * (1.0 - smoothstep(0.86, 0.94, fract(b))), 0.82, fb);
    float ceil = 0.5 + 0.5 * smoothstep(0.35, 0.95, s);
    float folk = 1.0 - 0.65 * step(wNoise(vec3(b * 0.9, 3.0, 1.0)), 0.4) * (1.0 - smoothstep(0.12, 0.42, s));
    folk = mix(folk, 0.86, fb);
    float k = 0.66 + 0.18 * h21(vec2(floor(b / 6.0), 2.0));
    em += heat(k) * 1.1 * pane * ceil * folk;
  } else if (lk == ${L('line')}) {
    float car = smoothstep(uLift - 0.15, uLift + 0.15, y) * (1.0 - smoothstep(uLift + ${f1(LIFT.tall)} - 0.15, uLift + ${f1(LIFT.tall)} + 0.15, y));
    float near = exp(-abs(y - uLift - ${f1(LIFT.tall / 2)}) / 14.0);
    float w = abs(p.x) / ${f1(0.7)};
    em += (heat(0.7) * 0.6 + heat(0.88) * 0.5 * near) * (0.5 + 0.5 * (1.0 - w * w)) + heat(0.9) * 1.1 * car;
  } else if (lk == ${L('ring')}) {
    float pu = pulseAt(y);
    em += heat(0.72 + 0.15 * pu) * (0.35 + 0.9 * pu);
  } else if (lk == ${L('blink')}) {
    float ph = fract(uT / ${f1(BLINK)} + h21(vec2(floor(y), floor(degrees(a) / 30.0))));
    float on = exp(-pow((ph - 0.12) / 0.05, 2.0));
    em += heat(0.5) * (0.15 + 2.0 * on);
  } else if (lk == ${L('stud')}) {
    // A ring's lamps: steady, with a slow chase running round each ring the way the next one runs back.
    float dir = mod(floor(y / 10.0), 2.0) * 2.0 - 1.0;
    float ch = 0.5 + 0.5 * cos(a * 3.0 - dir * uT * 0.9);
    em += heat(0.78) * (0.55 + 0.5 * ch * ch);
  } else if (lk == ${L('slit')}) {
    // The lit slits up the piers' corners: a window to each two storeys, some brighter than the rest.
    float q = y / ${f1(ROOM.tall * 2)}, f = fract(q), aa = fwidth(q);
    float win = mix(smoothstep(0.08, 0.08 + aa, f) * (1.0 - smoothstep(0.78 - aa, 0.78, f)), 0.7, smoothstep(0.3, 0.7, aa));
    em += heat(0.5 + 0.25 * h21(vec2(floor(q), floor(degrees(a))))) * 0.4 * win;
  } else if (lk == ${L('beacon')}) {
    em += heat(0.8 + 0.2 * uBeacon) * (0.45 + 3.2 * uBeacon);
  }
  if (glassy) { float face = abs(dot(normal, normalize(vViewPosition))); em *= lk == ${L('gallery')} ? mix(0.12, 1.0, pow(face, 1.6)) : mix(0.3, 1.0, pow(face, 0.6)); }
  totalEmissiveRadiance += em;`,
    room: `#if defined( USE_CLEARCOAT )\n  clearcoatSpecularDirect *= glassy ? 0.15 : 1.0;\n  clearcoatRadiance *= lk == ${L('sun')} ? 1.2 : 1.0;\n#endif\n  radiance *= lk == ${L('sun')} ? 0.8 : 1.0;\n  // The cursor's light is a small reflection on glass, not a glare across a face.\n  reflectedLight.directSpecular *= glassy ? 0.2 : 1.0;`,
  });
  return m;
}

export interface SpireMats { solid: THREE.MeshPhysicalMaterial; light: THREE.MeshPhysicalMaterial; halo: THREE.SpriteMaterial }
export interface Handle { mat: THREE.Material; kind: number; cast: boolean }

function haloTexture(): THREE.Texture {
  const n = 64, c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!, grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  for (let i = 0; i <= 10; i++) { const k = i / 10; grad.addColorStop(k, `rgba(255,255,255,${(Math.exp(-k * 5.5) * (1 - k)).toFixed(3)})`); }
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function spireMaterials(): { mats: SpireMats; of: Record<SolidName | LightName, Handle> } {
  const halo = new THREE.SpriteMaterial({ map: haloTexture(), color: new THREE.Color(hex('hot')), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: true });
  halo.name = 'spireHalo';
  const mats: SpireMats = { solid: solidMaterial(), light: lightMaterial(), halo };
  const cast: Partial<Record<SolidName | LightName, boolean>> = { jet: true, stone: true, base: true, gold: true, copper: true, bronze: true, dark: true, glass: true, sun: true, gallery: true };
  const of = {} as Record<SolidName | LightName, Handle>;
  SOLIDS.forEach((n, i) => { of[n] = { mat: mats.solid, kind: i, cast: !!cast[n] }; });
  LIGHTS.forEach((n, i) => { of[n] = { mat: mats.light, kind: i, cast: !!cast[n] }; });
  return { mats, of };
}

