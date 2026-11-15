import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { NOISE, lin } from '../../../../world/surface';
import { BLINK, CUFF, DECK, DECKS, FLOOR, LANTERN, LIFT, LINE, LOBBY, PLINTH_TOP, RUNS, SKY } from './form';

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

interface Solid { color: number; rough: number; metal: number; room: number; coat: number; coatRoom?: number }
// Warm dark steel for the ribs, plainly grey beside the copper, brushed along their length. Blackened steel for the
// decks, the soffit and the roofs. Dark stone for the plinth. Copper for the fascias, lips and collars, and nothing
// else.
const tone = (n: PaletteName, k: number) => new THREE.Color(hex(n)).multiplyScalar(k).getHex();
export const SOLID = {
  steel: { color: 0x7a756e, rough: 0.17, metal: 1, room: 0.55, coat: 0.4, coatRoom: 1.6 },
  // The buttresses are clad in a pale warm stone up to where each becomes its rib, at a copper cuff.
  clad: { color: 0x35322f, rough: 0.6, metal: 0, room: 1, coat: 0.15 },
  dark: { color: 0x2a2826, rough: 0.3, metal: 0.7, room: 1.6, coat: 0.7 },
  stone: { color: 0x2e2c2a, rough: 0.75, metal: 0, room: 1, coat: 0 },
  copper: { color: tone('copper', 0.9), rough: 0.2, metal: 1, room: 1.3, coat: 0.3 },
  // Cast bronze for the clamps and cuffs that hold the ribs.
  bronze: { color: tone('bronze', 0.75), rough: 0.26, metal: 1, room: 1.3, coat: 0.3 },
} satisfies Record<string, Solid>;
export type SolidName = keyof typeof SOLID;
const SOLIDS = Object.keys(SOLID) as SolidName[];

// Glass and light: the core's glass with its rooms, the line of light and the lift; the lobby; the observation
// level's glazing; the lantern; the beacon; the rings of light round the decks; the nav lights.
export const LIGHTS = ['core', 'lobby', 'pod', 'lantern', 'beacon', 'ring', 'blink'] as const;
export type LightName = (typeof LIGHTS)[number];

const col = (c: number) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
const arr = <T>(type: string, xs: T[], f: (x: T) => string) => `${type}[${xs.length}](${xs.map(f).join(', ')})`;
const f1 = (x: number) => x.toFixed(3);

const HOLD = { knee: 0.9, top: 1.35 };
// The core's radius at a height, for shading what stands near it.
const CORE_AT = `float coreAt(float y){ ${RUNS.map(([a, b, r0, r1]) => `if (y <= ${f1(b)}) return mix(${f1(r0)}, ${f1(r1)}, clamp((y - ${f1(a)}) / ${f1(b - a)}, 0.0, 1.0));`).join(' ')} return ${f1(SKY.core)}; }`;
// The cursor's light is the only light that moves, so the spire answers it more strongly than the room it reflects:
// what it draws on the steel and the glass has to slide visibly when the cursor crosses the page.
const LAMP_GAIN = 2.2;
const COMMON = /* glsl */ `
varying float vKind;
varying vec3 vObj;
varying vec3 vObjN;
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
${CORE_AT}
// What the room and the cursor's light reflect is held under pale, so a glint on glass or polished metal stays a glint
// and never blooms. The spire's own lights are added after.
vec3 heldUnder(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m <= ${f1(HOLD.knee)}) return c; float e = m - ${f1(HOLD.knee)}; return c * (${f1(HOLD.knee)} + e / (1.0 + e / ${f1(HOLD.top - HOLD.knee)})) / m; }
`;
const HOLD_CHUNK = 'outgoingLight = heldUnder(outgoingLight - totalEmissiveRadiance) + totalEmissiveRadiance;\n#include <opaque_fragment>';

const VERT_HEAD = 'attribute vec4 cell;\nvarying float vKind;\nvarying vec3 vObj;\nvarying vec3 vObjN;';
const VERT_BODY = 'vKind = cell.x;\nvObj = position;\nvObjN = normal;';

interface Chunks { head: string; color: string; rough?: string; metal?: string; normal?: string; emissive?: string; room?: string; after?: string }

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
    f = f.replace('#include <lights_fragment_end>', `${c.room ?? ''}\n  reflectedLight.directDiffuse *= ${f1(LAMP_GAIN)};\n  reflectedLight.directSpecular *= ${f1(LAMP_GAIN)};\n#include <lights_fragment_end>`);
    sh.fragmentShader = f.replace('#include <opaque_fragment>', HOLD_CHUNK);
  };
  m.customProgramCacheKey = () => key;
}

function solidMaterial(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
  m.name = 'spireSolid';
  const s = SOLIDS.map((n) => SOLID[n] as Solid);
  const K = (n: SolidName) => SOLIDS.indexOf(n);
  patch(m, 'spire-solid', {
    head: `
const vec3 SC[${s.length}] = ${arr('vec3', s, (x) => col(x.color))};
const float SR[${s.length}] = ${arr('float', s, (x) => f1(x.rough))};
const float SM[${s.length}] = ${arr('float', s, (x) => f1(x.metal))};
const float SRoom[${s.length}] = ${arr('float', s, (x) => f1(x.room))};
const float SCoat[${s.length}] = ${arr('float', s, (x) => f1(x.coat))};
const float SCoatRoom[${s.length}] = ${arr('float', s, (x) => f1(x.coatRoom ?? x.room))};
`,
    color: `
  int sk = int(vKind + 0.5);
  float grain = wNoise(vec3(vObj.x * 2.2, vObj.y * 0.08, vObj.z * 2.2));
  float px = length(fwidth(vObj));
  grain = mix(grain, 0.5, smoothstep(0.15, 0.5, px));
  float blot = wFbm(vObj * 0.09 + 7.0);
  float clad = sk == ${K('steel')} ? 1.0 - smoothstep(${f1(CUFF.y - CUFF.h)}, ${f1(CUFF.y - CUFF.h / 2)}, vObj.y) : 0.0;
  diffuseColor.rgb = mix(SC[sk], SC[${K('clad')}], clad) * (0.9 + 0.2 * grain) * (0.92 + 0.16 * blot);
  // The cladding's joints, in courses up the buttress.
  { float q = vObj.y / 5.5, j = 0.5 - abs(fract(q) - 0.5); diffuseColor.rgb *= 1.0 - clad * 0.35 * (1.0 - smoothstep(0.03, 0.07, j)) * (1.0 - smoothstep(0.1, 0.25, fwidth(q))); }
  // The steel is hung in panels: a fine joint every few units up a rib and its buttress.
  // The steel darkens toward the plinth and where a buttress meets the core, out of the room's reach.
  if (sk == ${K('steel')}) diffuseColor.rgb *= (0.55 + 0.45 * smoothstep(${f1(PLINTH_TOP)}, 26.0, vObj.y)) * (0.65 + 0.35 * smoothstep(0.0, 6.0, length(vObj.xz) - coreAt(vObj.y)));
  if (sk == ${K('stone')}) {
    float r = length(vObj.xz), a = degrees(bearing(vObj));
    // The stone's courses, cut every so often round the plinth.
    diffuseColor.rgb *= 0.86 + 0.14 * min(1.0, smoothstep(0.0, 0.25, abs(fract(a / 10.0) - 0.5) * 2.0) + smoothstep(0.3, 0.6, px));
    // Where the drum and the buttresses stand on it, the light cannot reach.
    float rib = r * radians(abs(mod(a, 60.0) - 30.0));
    diffuseColor.rgb *= (0.45 + 0.55 * smoothstep(19.0, 27.0, r)) * mix(1.0, 0.5 + 0.5 * smoothstep(2.5, 9.0, rib), 1.0 - smoothstep(30.0, 48.0, r));
  }`,
    rough: `roughnessFactor = clamp(mix(SR[sk], SR[${K('clad')}], clad) + 0.12 * (grain - 0.5), 0.05, 1.0);`,
    metal: `metalnessFactor = mix(SM[sk], SM[${K('clad')}], clad);`,
    // The lobby's light lies on the plinth between the buttresses, warm and falling away from the glass, and a thin line
    // of light runs under the nose of each step.
    emissive: `
  if (sk == ${K('stone')}) {
    float a = degrees(bearing(vObj)), d = abs(mod(a + 30.0, 60.0) - 30.0);
    float r = length(vObj.xz), top = smoothstep(0.6, 0.9, normalize(vObjN).y);
    totalEmissiveRadiance += heat(0.62) * 0.3 * top * exp(-(r - 19.0) / 8.0) * (1.0 - smoothstep(14.0, 26.0, d));
    float riser = 1.0 - smoothstep(0.2, 0.5, abs(normalize(vObjN).y));
    float nose = smoothstep(0.55, 0.9, fract(vObj.y / 1.1 + 0.02));
    totalEmissiveRadiance += heat(0.55) * 0.35 * riser * nose * (0.6 + 0.4 * (1.0 - smoothstep(14.0, 26.0, d)));
  }
  // The lift's car lights the ribs either side of the line of light as it passes them.
  float lm = uLift + ${f1(LIFT.tall / 2)};
  if (sk == ${K('steel')} && vObj.z > 0.0) totalEmissiveRadiance += heat(0.7) * 0.18 * exp(-abs(vObj.y - lm) / 6.0) * smoothstep(0.2, 0.9, -normalize(vObjN).x * sign(vObj.x)) * exp(-abs(vObj.x) / 14.0);`,
    after: `material.clearcoat = mix(SCoat[sk], SCoat[${K('clad')}], clad);`,
    room: '#if defined( USE_CLEARCOAT )\n  clearcoatRadiance *= mix(SCoatRoom[sk], 1.0, clad);\n#endif\n  radiance *= mix(SRoom[sk], 1.0, clad);',
  });
  return m;
}

function lightMaterial(): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0x070707, metalness: 0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.6, specularIntensity: 1 });
  m.name = 'spireGlass';
  const L = (n: LightName) => LIGHTS.indexOf(n);
  const decks = arr('float', [...DECKS], (y) => f1(y));
  patch(m, 'spire-glass', {
    head: `
const float DECKS[${DECKS.length}] = ${decks};
float gBase = 0.0;
// The rooms of a run of the core, storey by storey: a storey is dark, dim or lit, tenants hold runs of bays along it,
// and the light comes from its ceiling. Bays fade to their storey's average before a mullion is finer than a pixel,
// and storeys to the whole run's before a slab is.
vec3 rooms(float y, float a, float sky){
  float f = y / ${f1(FLOOR.tall)}, b = a / 6.2831853 * ${f1(FLOOR.bays)};
  float fi = floor(f) + gBase, bi = floor(b), ff = fract(f), bf = fract(b);
  float fl = h21(vec2(fi, 3.7));
  float lvl = fl < 0.5 ? 0.0 : fl < 0.86 ? 0.22 : 0.58;
  lvl = mix(lvl, 0.8, sky);
  float run = h21(vec2(fi, floor(bi / 7.0) + 11.0));
  float k = 0.45 + 0.45 * h21(vec2(fi * 0.37, floor(bi / 7.0))) * (0.4 + 0.6 * run);
  float cut = step(0.14, h21(vec2(fi, bi)));
  float fineB = smoothstep(0.25, 0.6, fwidth(b));
  cut = mix(cut, 0.86, fineB);
  float mull = mix(smoothstep(0.03, 0.09, bf) * (1.0 - smoothstep(0.91, 0.97, bf)), 0.88, fineB);
  float slab = smoothstep(0.16, 0.21, ff) * (1.0 - smoothstep(0.94, 0.98, ff));
  float ceil = 0.45 + 0.55 * smoothstep(0.5, 0.92, ff);
  vec3 lit = heat(k) * lvl * (0.5 + 0.6 * run) * cut * mull * slab * ceil;
  vec3 floorMean = heat(k) * lvl * (0.5 + 0.6 * run) * 0.86 * 0.88 * 0.62;
  lit = mix(lit, floorMean, smoothstep(0.22, 0.4, fwidth(f)));
  return mix(lit, heat(0.6) * 0.3 * 0.8 * 0.62, smoothstep(0.45, 0.9, fwidth(f)));
}`,
    color: `
  int lk = int(vKind + 0.5);`,
    rough: `bool glassy = lk == ${L('core')} || lk == ${L('pod')} || lk == ${L('lobby')} || lk == ${L('lantern')};
  roughnessFactor = glassy ? 0.05 : 0.4;`,
    after: 'material.clearcoat = glassy ? 0.85 : 0.0;',

    emissive: `
  vec3 em = vec3(0.0);
  float a = bearing(vObj), r = length(vObj.xz), y = vObj.y;
  float lm = uLift + ${f1(LIFT.tall / 2)};
  if (lk == ${L('core')}) {
    // The sky lobby: the two storeys over each deck are lit nearly end to end.
    // Storeys are counted from the deck under them, so each deck lies on a slab.
    float base = 0.0;
    for (int i = 0; i < ${DECKS.length}; i++) if (y > DECKS[i]) base = DECKS[i] + ${f1(DECK.thick / 2)};
    float s = y - base, sky = base > ${f1(DECKS[0] + 5)} ? step(s, 2.0 * ${f1(FLOOR.tall)}) : 0.0;
    gBase = base;
    em += rooms(s, a, sky);
    // Just under each deck its plate keeps the light off the glass.
    float under = 1.0;
    for (int i = 1; i < ${DECKS.length}; i++) { float d = DECKS[i] - ${f1(DECK.thick / 2)} - y; if (d >= 0.0) under = min(under, 0.35 + 0.65 * smoothstep(0.0, 2.6, d)); }
    em *= under;
    // The line of light, up the front and the back, with the lift's car riding it.
    float arc = r * min(abs(a), 3.14159265 - abs(a));
    float aa = fwidth(arc) * 0.75 + 0.02;
    float line = 1.0 - smoothstep(${f1(LINE.half)} - aa, ${f1(LINE.half)} + aa, arc);
    float reveal = 1.0 - smoothstep(${f1(LINE.half * 2.6)} - aa, ${f1(LINE.half * 2.6)} + aa, arc);
    float core = 1.0 - smoothstep(0.0, ${f1(LINE.half)} + aa, arc);
    float inLine = step(${f1(LINE.from)}, y) * step(y, ${f1(LINE.to)});
    float car = smoothstep(uLift - 0.15, uLift + 0.15, y) * (1.0 - smoothstep(uLift + ${f1(LIFT.tall)} - 0.15, uLift + ${f1(LIFT.tall)} + 0.15, y));
    float near = exp(-abs(y - lm) / 16.0);
    vec3 lineC = heat(0.7) * (0.6 + 0.25 * core) + heat(0.88) * 0.6 * near * core;
    em *= 1.0 - reveal * inLine;
    em = mix(em, lineC + heat(1.0) * 2.2 * car, line * inLine);
    // The car's light on the glass round the line.
    em += heat(0.75) * 0.22 * exp(-abs(y - lm) / 5.0) * exp(-arc / 2.2) * inLine * (1.0 - line);
  } else if (lk == ${L('lobby')}) {
    // Glass from the plinth to the canopy between each pair of buttresses, in tall lights under a transom.
    float d = mod(degrees(a), 60.0) / 60.0, q = d * ${f1(LOBBY.lights)}, aa = fwidth(q);
    float mull = smoothstep(0.045 - aa * 0.5, 0.045 + aa * 0.5, 0.5 - abs(fract(q) - 0.5));
    float tr = abs(y - ${f1(LOBBY.transom)});
    mull *= smoothstep(0.2, 0.45, tr);
    mull = mix(mull, 0.82, smoothstep(0.3, 0.6, aa));
    float fall = mix(1.0, 0.55, smoothstep(${f1(PLINTH_TOP)}, ${f1(LOBBY.transom)}, y));
    float clere = y > ${f1(LOBBY.transom)} ? 0.55 : 1.0;
    float hall = 0.8 + 0.4 * wNoise(vec3(d * 5.0, y * 0.12, 4.0));
    em += heat(0.58 + 0.2 * fall) * 0.42 * mull * fall * clere * hall;
  } else if (lk == ${L('pod')}) {
    // The observation level, seen through its glass between the fins: lit from its ceiling, with the shapes of people
    // and seats against the light low down.
    float b = a / 6.2831853 * ${f1(SKY.fins * 2)}, s = (y - ${f1(SKY.from)}) / ${f1(SKY.to - SKY.from)};
    float fine = smoothstep(0.3, 0.6, fwidth(b));
    float pane = mix(smoothstep(0.04, 0.1, fract(b)) * (1.0 - smoothstep(0.9, 0.96, fract(b))), 0.88, fine);
    float ceil = 0.35 + 0.65 * smoothstep(0.45, 0.95, s);
    float crowd = mix(1.0 - 0.55 * step(wNoise(vec3(b * 1.7, 2.0, 3.0)), 0.45) * (1.0 - smoothstep(0.12, 0.35, s)), 0.8, fine);
    float k = 0.6 + 0.25 * h21(vec2(floor(b), 1.0));
    em += heat(k) * 0.85 * ceil * pane * crowd;
  } else if (lk == ${L('lantern')}) {
    float s = (y - ${f1(LANTERN.from)}) / ${f1(LANTERN.to - LANTERN.from)};
    float fl = fract(a / 6.2831853 * 12.0), flute = 0.6 + 0.4 * pow(sin(fl * 3.14159265), 2.0);
    flute = mix(flute, 0.8, smoothstep(0.25, 0.6, fwidth(a / 6.2831853 * 12.0)));
    float lv = fract(y / 6.5), band = 0.55 + 0.45 * smoothstep(0.1, 0.85, lv) * smoothstep(1.0, 0.92, lv);
    band = mix(band, 0.75, smoothstep(0.3, 0.6, fwidth(y / 6.5)));
    em += heat(0.82 + 0.15 * s) * (0.25 + 0.75 * flute) * band * (0.75 + 0.35 * s);
  } else if (lk == ${L('beacon')}) {
    em += heat(0.8 + 0.2 * uBeacon) * (0.45 + 3.4 * uBeacon);
  } else if (lk == ${L('ring')}) {
    float pulse = exp(-pow((y - uPulse) / 46.0, 2.0));
    em += heat(0.8 + 0.15 * pulse) * (0.9 + 0.9 * pulse);
  } else if (lk == ${L('blink')}) {
    float ph = fract(uT / ${f1(BLINK)} + h21(vec2(floor(y), floor(degrees(a) / 30.0))) );
    float on = exp(-pow((ph - 0.12) / 0.05, 2.0));
    em += heat(0.5) * (0.15 + 2.2 * on);
  }
  totalEmissiveRadiance += em;`,
    room: '#if defined( USE_CLEARCOAT )\n  clearcoatRadiance *= glassy ? 7.0 : 1.0;\n#endif\n  radiance *= glassy ? 5.0 : 1.0;',
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
  const cast: Partial<Record<SolidName | LightName, boolean>> = { steel: true, dark: true, copper: true, core: true, lobby: true, pod: true, lantern: true };
  const of = {} as Record<SolidName | LightName, Handle>;
  SOLIDS.forEach((n, i) => { of[n] = { mat: mats.solid, kind: i, cast: !!cast[n] }; });
  LIGHTS.forEach((n, i) => { of[n] = { mat: mats.light, kind: i, cast: !!cast[n] }; });
  return { mats, of };
}

