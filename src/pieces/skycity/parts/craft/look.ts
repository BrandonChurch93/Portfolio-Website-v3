import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { NOISE, lin } from '../../../../world/surface';
import { polished } from '../../polish';

// What the craft are made of. One program draws every craft: what a face is made of rides on its vertices (the kind,
// in the cell attribute's x), and each craft has its own copy of the material, so its own uniforms (how hard its
// engines work), with the same program.

const tone = (n: PaletteName, k: number) => new THREE.Color(hex(n)).multiplyScalar(k).getHex();
// Gold: a polished metal at the palette's own hue, between copper-light and hot, never a yellow brass. The spire's.
const GOLD = new THREE.Color(hex('copper-light')).lerp(new THREE.Color(hex('hot')), 0.7).lerp(new THREE.Color(hex('pale')), 0.35).getHex();

// The three metals differ in value and finish as on the spire: gold the lightest and mirror polished, copper the
// orange one, bronze dark. Against them a warm dark steel that is plainly grey, a near black paint, and dark glass.
interface Solid { color: number; rough: number; metal: number }
export const SOLID = {
  gold: { color: GOLD, rough: 0.04, metal: 1 },
  copper: { color: hex('copper'), rough: 0.06, metal: 1 },
  bronze: { color: tone('bronze-deep', 1.25), rough: 0.1, metal: 1 },
  steel: { color: 0x48443f, rough: 0.18, metal: 1 },
  // A warm near black metal, polished: the barque's hull, against which its gold reads.
  iron: { color: 0x2b2723, rough: 0.14, metal: 1 },
  black: { color: 0x151311, rough: 0.42, metal: 0.5 },
  glass: { color: 0x0a0908, rough: 0.04, metal: 0.15 },
} satisfies Record<string, Solid>;
export type SolidName = keyof typeof SOLID;
const SOLIDS = Object.keys(SOLID) as SolidName[];

// What is lit by itself: rows of windows (a is the row), an engine's throat (a and b are its axis, across and up), a
// lamp, a thin line of light, and the glow of a lifting plate under a hull.
export const LIT = ['windows', 'engine', 'lamp', 'strip', 'belly'] as const;
export type LitName = (typeof LIT)[number];
export type KindName = SolidName | LitName;
export const KIND = Object.fromEntries([...SOLIDS, ...LIT].map((n, i) => [n, i])) as Record<KindName, number>;
const NS = SOLIDS.length;

const col = (c: number) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
const arr = <T>(type: string, xs: T[], f: (x: T) => string) => `${type}[${xs.length}](${xs.map(f).join(', ')})`;
const f1 = (x: number) => x.toFixed(3);
const HOLD = { knee: 0.9, top: 1.35 };

export const HEAT = /* glsl */ `
vec3 heat(float k){
  vec3 c = mix(${lin(hex('ember'))}, ${lin(hex('flame'))}, smoothstep(0.0, 0.45, k));
  c = mix(c, ${lin(hex('hot'))}, smoothstep(0.45, 0.85, k));
  return mix(c, ${lin(hex('pale'))}, smoothstep(0.85, 1.0, k));
}`;

const HEAD = /* glsl */ `
varying float vKind;
varying vec4 vCell;
varying vec3 vObj;
varying vec3 vObjN;
uniform float uT, uThrust, uSeed;
${NOISE}
${HEAT}
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// How much of a pixel a band from a to b of a repeating 0..1 covers, so a fine pattern fades to its mean.
float pulse(float x, float a, float b){
  float w = max(fwidth(x), 1e-4), x0 = x - 0.5 * w, x1 = x + 0.5 * w, s = b - a;
  float f1 = floor(x1) * s + clamp(fract(x1) - a, 0.0, s);
  float f0 = floor(x0) * s + clamp(fract(x0) - a, 0.0, s);
  return clamp((f1 - f0) / w, 0.0, 1.0);
}
// A seam every so often along x, faded to nothing before it is finer than a pixel.
float seam(float x, float every, float wide){ float q = x / every; return (1.0 - pulse(q, wide, 1.0)) * (1.0 - smoothstep(0.12, 0.35, fwidth(q))); }
vec3 heldUnder(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m <= ${f1(HOLD.knee)}) return c; float e = m - ${f1(HOLD.knee)}; return c * (${f1(HOLD.knee)} + e / (1.0 + e / ${f1(HOLD.top - HOLD.knee)})) / m; }
const vec3 SC[${NS}] = ${arr('vec3', SOLIDS, (n) => col(SOLID[n].color))};
const float SR[${NS}] = ${arr('float', SOLIDS, (n) => f1(SOLID[n].rough))};
const float SM[${NS}] = ${arr('float', SOLIDS, (n) => f1(SOLID[n].metal))};
`;

const VERT_HEAD = 'attribute vec4 cell;\nvarying float vKind;\nvarying vec4 vCell;\nvarying vec3 vObj;\nvarying vec3 vObjN;';
const VERT_BODY = 'vKind = cell.x; vCell = cell; vObj = position; vObjN = normal;';

const K = KIND;
const COLOR = /* glsl */ `
  int sk = int(vKind + 0.5);
  bool lit = sk >= ${NS};
  int si = lit ? ${K.black} : sk;
  vec3 nO = normalize(vObjN);
  float grain = wNoise(vObj * vec3(0.9, 2.2, 2.2) + uSeed);
  // Tarnish and wear: broad dull patches on every metal, rubbed brighter where it stands out, and grime that the air
  // has drawn back along the hull in streaks from its nose.
  float blot = wFbm(vObj * 0.11 + uSeed * 7.0);
  float dull = smoothstep(0.42, 0.75, blot);
  float streak = wNoise(vec3(vObj.x * 0.05 + uSeed, vObj.y * 1.1, vObj.z * 1.1));
  float grime = smoothstep(0.5, 0.9, streak) * (0.5 + 0.5 * smoothstep(0.0, 0.6, -nO.y + 0.3));
  vec3 base = SC[si];
  base *= 0.94 + 0.12 * grain;
  base *= 1.0 - 0.28 * dull - 0.3 * grime;
  float plate = 0.0;
  // What the room and the sky reach: less under the hull and at the foot of what stands on a deck (cell w, when set,
  // is that foot's height plus 1000).
  float occ = mix(0.38, 1.0, smoothstep(-0.9, 0.45, nO.y));
  if (sk != ${K.engine} && vCell.w > 500.0) occ *= mix(0.35, 1.0, smoothstep(0.0, 1.8, vObj.y - (vCell.w - 1000.0)));
  diffuseColor.rgb = base;
`;

const ROUGH = /* glsl */ `roughnessFactor = clamp(SR[si] + 0.05 * dull + 0.06 * grime + 0.06 * plate + 0.015 * (grain - 0.5), 0.025, 1.0);`;
const METAL = /* glsl */ `metalnessFactor = SM[si];`;

const EMISSIVE = /* glsl */ `
  vec3 em = vec3(0.0);
  float th = uThrust;
  if (sk == ${K.windows}) {
    // A row of windows: lit bays between frames, a few dark, each its own warmth, fading to their mean before a bay
    // is finer than a pixel.
    float b = vObj.x / 1.35, bi = floor(b), fine = smoothstep(0.25, 0.6, fwidth(b));
    float on = mix(step(0.24, h21(vec2(bi, vCell.y + uSeed))), 0.76, fine);
    float frame = mix(pulse(b, 0.16, 0.92), 0.76, fine);
    float k = 0.5 + 0.28 * h21(vec2(bi * 0.31 + uSeed, vCell.y + 7.0));
    em = heat(k) * 1.6 * on * frame;
  } else if (sk == ${K.engine}) {
    float r = length(vObj.zy - vCell.yz) / max(vCell.w, 1e-3);
    float flick = 0.94 + 0.06 * sin(uT * 37.0 + uSeed * 9.0) * sin(uT * 23.0 + uSeed);
    em = heat(0.62 + 0.36 * th * (1.0 - 0.5 * r)) * (0.35 + 1.5 * th) * (1.15 - 0.6 * r) * flick;
  } else if (sk == ${K.lamp}) {
    em = heat(0.84) * 1.3;
  } else if (sk == ${K.strip}) {
    em = heat(0.68 + 0.1 * vCell.y) * (0.75 + 0.35 * vCell.y);
  } else if (sk == ${K.belly}) {
    float w = 0.75 + 0.25 * sin(vObj.x * 0.6 - uT * 3.0 + uSeed);
    em = heat(0.5 + 0.15 * w) * (0.25 + 0.45 * th) * w;
  }
  totalEmissiveRadiance += em;
`;

export function craftMaterial(seed: number): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3, side: THREE.DoubleSide });
  m.name = 'craft';
  const U = { uT: { value: 0 }, uThrust: { value: 0.6 }, uSeed: { value: seed } };
  m.userData.uniforms = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${VERT_HEAD}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_BODY}`);
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>\n${HEAD}`);
    f = f.replace('#include <color_fragment>', `#include <color_fragment>\n${COLOR}`);
    f = f.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${ROUGH}`);
    f = f.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${METAL}`);
    f = f.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${EMISSIVE}`);
    f = f.replace('#include <lights_fragment_end>', 'radiance *= occ;\n  irradiance *= occ;\n  reflectedLight.directDiffuse *= mix(1.0, occ, 0.5);\n#include <lights_fragment_end>');
    sh.fragmentShader = f.replace('#include <opaque_fragment>', 'outgoingLight = heldUnder(outgoingLight - totalEmissiveRadiance) + totalEmissiveRadiance;\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'skycity-craft';
  return polished(m);
}
export const uniformsOf = (m: THREE.Material) => m.userData.uniforms as { uT: { value: number }; uThrust: { value: number }; uSeed: { value: number } };

// The craft's lights: each a soft spot, drawn at least about a pixel across so one moving between pixels never
// flickers, and drawn out into a short streak behind it the way its dir points: an engine's exhaust, the wash under a
// lifting plate. Where each is is put there from the clock on the processor.
//   look: size in units, heat, strength, how long its streak is in units.
const GLOW_V = /* glsl */ `
uniform float uFogNear, uFogFar;
uniform vec2 uView;
attribute vec2 corner;
attribute vec4 look;
attribute vec3 dir;
varying vec3 vColor;
varying vec2 vQ;
varying float vSize, vLen;
${HEAT}
void main(){
  float k = look.z;
  vColor = heat(look.y);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 c0 = projectionMatrix * mv;
  vec4 c1 = projectionMatrix * modelViewMatrix * vec4(position + dir * look.w, 1.0);
  float unit = length(modelMatrix[0].xyz);
  float perUnit = projectionMatrix[1][1] * uView.y * 0.5 / max(c0.w, 1e-5) * unit;
  float want = look.x * perUnit, size = max(want, 1.1);
  k *= min(1.0, want / size + 0.35);
  vec2 s0 = c0.xy / c0.w * 0.5 * uView, s1 = c1.xy / c1.w * 0.5 * uView;
  vec2 ax = s1 - s0; float len = length(ax);
  ax = len > 0.01 ? ax / len : vec2(1.0, 0.0);
  vec2 nx = vec2(-ax.y, ax.x);
  float R = size * 1.8 + 1.0;
  float along = corner.x < 0.0 ? -R : len + R;
  vec2 off = ax * along + nx * corner.y * R;
  vQ = vec2(along, corner.y * R);
  vSize = size; vLen = len;
  k *= 1.0 - 0.85 * smoothstep(uFogNear, uFogFar, -mv.z);
  vColor *= k;
  gl_Position = c0;
  gl_Position.xy += off * 2.0 / uView * c0.w;
  if (k <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;
const GLOW_F = /* glsl */ `
varying vec3 vColor;
varying vec2 vQ;
varying float vSize, vLen;
void main(){
  float t = clamp(vQ.x, 0.0, vLen);
  vec2 dq = vec2(vQ.x - t, vQ.y);
  float fade = vLen > 0.01 ? 1.0 - 0.85 * t / vLen : 1.0;
  float r2 = dot(dq, dq) / max(vSize * vSize * 0.25, 0.25);
  float a = (exp(-r2 * 1.4) + 0.025 * exp(-r2 * 0.35)) * fade;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * a, 1.0);
}`;

export function glowMaterial(): THREE.ShaderMaterial {
  const view = new THREE.Vector2(1, 1);
  const m = new THREE.ShaderMaterial({
    name: 'craftGlow',
    uniforms: { uView: { value: view }, uFogNear: { value: 1e5 }, uFogFar: { value: 2e5 } },
    vertexShader: GLOW_V,
    fragmentShader: GLOW_F,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return m;
}

// Hands a glow material what it needs from the frame being drawn: the size of what is drawn into, and the fog.
const size = new THREE.Vector2();
export function glowBeforeRender(mesh: THREE.Mesh): void {
  mesh.onBeforeRender = (r, scene) => {
    const u = (mesh.material as THREE.ShaderMaterial).uniforms;
    const t = r.getRenderTarget();
    if (t) u.uView.value.set(t.width, t.height); else u.uView.value.copy(r.getDrawingBufferSize(size));
    const fog = (scene as THREE.Scene).fog;
    if (fog instanceof THREE.Fog) { u.uFogNear.value = fog.near; u.uFogFar.value = fog.far; }
  };
}
