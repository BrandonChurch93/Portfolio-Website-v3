import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { NOISE, lin } from '../../../../world/surface';

// The port's materials. One program draws everything it is built of and everything on it that is lit, the craft too:
// what a face is made of rides on its vertices (the kind, in the cell attribute's x). The craft in the air are drawn
// many times over by the same material, and each carries how hard its engines are working (the craft attribute).
// The small lights, the pads' rims, the nav lights and the engines' glow, are another program (glow below).

const tone = (n: PaletteName, k: number) => new THREE.Color(hex(n)).multiplyScalar(k).getHex();
// Gold: a polished metal at the palette's own hue, between copper-light and hot, never a yellow brass.
const GOLD = new THREE.Color(hex('copper-light')).lerp(new THREE.Color(hex('hot')), 0.7).lerp(new THREE.Color(hex('pale')), 0.3).multiplyScalar(0.92).getHex();

interface Solid { color: number; rough: number; metal: number; room: number }
export const SOLID = {
  // Warm dark steel, satin, plainly grey beside the metals: the stalks, the crane, the mast's frame.
  steel: { color: 0x57534e, rough: 0.42, metal: 1, room: 1.0 },
  // Blackened steel, satin, drawn by the light along its edges: the mast's shaft, the pad tree's trunk.
  iron: { color: 0x26241f, rough: 0.5, metal: 0.55, room: 0.9 },
  // Near black painted structure: the decks' undersides, the crane's lattice, the hangars' roofs.
  dark: { color: 0x141312, rough: 0.45, metal: 0.3, room: 1.2 },
  // Pale warm stone, matte: the pylons and the hangars' walls.
  stone: { color: 0x5f5951, rough: 0.86, metal: 0, room: 0.7 },
  // Polished gold: the pads' lips, the capstone, the cornices, the barque's prow and stern.
  gold: { color: GOLD, rough: 0.1, metal: 1, room: 2.8 },
  // Bronze, darker and browner than the gold and the copper, and less polished: the ring's band, the cradles.
  bronze: { color: tone('bronze', 0.62), rough: 0.3, metal: 1, room: 1.9 },
  copper: { color: tone('copper', 0.85), rough: 0.22, metal: 1, room: 2.2 },
  // The massif's rock: a warm dark grey, rough, split in facets, its strata worked out in the shader.
  rock: { color: 0x3d3731, rough: 0.92, metal: 0, room: 0.5 },
  // Dark bronze, nearly brown black, satin: the colossi.
  umber: { color: tone('bronze-deep', 0.95), rough: 0.3, metal: 1, room: 1.5 },
  // The forecourt's paving: great slabs of a darker stone, worn, worked out in the shader from the map's own
  // coordinates.
  paving: { color: 0x4a453f, rough: 0.82, metal: 0, room: 0.7 },
  // The craft's hulls: a satin metal, a little lighter than the steel, far less saturated than the gold. At night a
  // craft far off is read by its lights, and its hull only hinted.
  hull: { color: 0x45423e, rough: 0.4, metal: 1, room: 1.2 },
  // Dark glass: the control deck, the craft's canopies.
  glass: { color: 0x0b0b0b, rough: 0.06, metal: 0.2, room: 4 },
} satisfies Record<string, Solid>;
export type SolidName = keyof typeof SOLID;
const SOLIDS = Object.keys(SOLID) as SolidName[];

// What is lit by itself: a hangar's open door, rows of windows, a line of light, the ring's inner face, a craft's
// engine, and a lamp.
export const LIT = ['door', 'windows', 'line', 'ringlight', 'engine', 'lamp', 'deck', 'pool', 'sun'] as const;
export type LitName = (typeof LIT)[number];

export type KindName = SolidName | LitName;
export const KIND = Object.fromEntries([...SOLIDS, ...LIT].map((n, i) => [n, i])) as Record<KindName, number>;
const NS = SOLIDS.length;

const col = (c: number) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
const arr = <T>(type: string, xs: T[], f: (x: T) => string) => `${type}[${xs.length}](${xs.map(f).join(', ')})`;
const f1 = (x: number) => x.toFixed(3);

const HOLD = { knee: 0.9, top: 1.35 };
// How strongly the port answers the stage's direct lights (the moon and the cursor's light) against the room.
const LAMP_GAIN = 1.0;

// The heights of the citadel's frame between which its stone is carved.
const CARVED = [6, 56];

export const U = {
  uT: { value: 0 },
  // How far the pulse round the ring has gone, 0 to 1, and how bright it is.
  uRing: { value: 0 },
};

const HEAD = /* glsl */ `
varying float vKind;
varying vec4 vCell;
varying vec3 vObj;
varying vec3 vObjN;
varying vec2 vUv2;
varying vec4 vCraft;
uniform float uT, uRing;
${NOISE}
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 heat(float k){
  vec3 c = mix(${lin(hex('ember'))}, ${lin(hex('flame'))}, smoothstep(0.0, 0.45, k));
  c = mix(c, ${lin(hex('hot'))}, smoothstep(0.45, 0.85, k));
  return mix(c, ${lin(hex('pale'))}, smoothstep(0.85, 1.0, k));
}
// How much of a pixel a band from a to b of a repeating 0..1 covers, so a fine pattern fades to its mean.
float pulse(float x, float a, float b){
  float w = max(fwidth(x), 1e-4), x0 = x - 0.5 * w, x1 = x + 0.5 * w, s = b - a;
  float f1 = floor(x1) * s + clamp(fract(x1) - a, 0.0, s);
  float f0 = floor(x0) * s + clamp(fract(x0) - a, 0.0, s);
  return clamp((f1 - f0) / w, 0.0, 1.0);
}
vec3 heldUnder(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m <= ${f1(HOLD.knee)}) return c; float e = m - ${f1(HOLD.knee)}; return c * (${f1(HOLD.knee)} + e / (1.0 + e / ${f1(HOLD.top - HOLD.knee)})) / m; }
const vec3 SC[${NS}] = ${arr('vec3', SOLIDS, (n) => col(SOLID[n].color))};
const float SR[${NS}] = ${arr('float', SOLIDS, (n) => f1(SOLID[n].rough))};
const float SM[${NS}] = ${arr('float', SOLIDS, (n) => f1(SOLID[n].metal))};
const float SRoom[${NS}] = ${arr('float', SOLIDS, (n) => f1(SOLID[n].room))};
`;

const VERT_HEAD = `attribute vec4 cell;
varying float vKind;
varying vec4 vCell;
varying vec3 vObj;
varying vec3 vObjN;
varying vec2 vUv2;
varying vec4 vCraft;
#ifdef USE_INSTANCING
attribute vec4 craft;
#endif`;
const VERT_BODY = `vKind = cell.x; vCell = cell; vObj = position; vObjN = normal; vUv2 = uv;
#ifdef USE_INSTANCING
vCraft = craft;
#else
vCraft = vec4(0.0);
#endif`;

const K = KIND;
const COLOR = /* glsl */ `
  int sk = int(vKind + 0.5);
  bool lit = sk >= ${NS};
  int si = lit ? ${K.glass} : sk;
  float px = length(fwidth(vObj));
  float grain = mix(wNoise(vObj * vec3(1.6, 0.25, 1.6)), 0.5, smoothstep(0.1, 0.4, px));
  float blot = wFbm(vObj * 0.07 + 3.0);
  diffuseColor.rgb = SC[si] * (0.92 + 0.16 * grain) * (0.9 + 0.2 * blot);
  // The stone is laid in courses, a joint every few units, fading before it is finer than a pixel.
  // Each block a little lighter or darker than its neighbours, the courses staggered.
  if (sk == ${K.stone}) {
    float q = vObj.y / 3.2, row = floor(q), u = (vObj.x + vObj.z) / 6.5 + 0.5 * mod(row, 2.0);
    float far = smoothstep(0.15, 0.4, fwidth(q));
    float joint = (1.0 - pulse(q, 0.07, 1.0)) * (1.0 - far) + (1.0 - pulse(u, 0.04, 1.0)) * (1.0 - smoothstep(0.15, 0.4, fwidth(u))) * 0.7;
    float blk = mix(0.85 + 0.3 * h21(vec2(row, floor(u))), 1.0, far);
    diffuseColor.rgb *= blk * (1.0 - 0.35 * clamp(joint, 0.0, 1.0));
    // The pylons' faces are carved in registers of sunk relief, abstract marks in rows like the Sun stone's glyphs: on
    // every upright face between the podium and the pylons' windows.
    vec3 nn = normalize(vObjN);
    if (abs(nn.y) < 0.45 && vObj.y > ${f1(CARVED[0])} && vObj.y < ${f1(CARVED[1])}) {
      float across = abs(nn.z) > abs(nn.x) ? vObj.x : vObj.z, reg = vObj.y / 9.0, ri = floor(reg), rf = fract(reg);
      float cell = across / 3.4, ci = floor(cell); vec2 c = vec2(fract(cell) - 0.5, rf - 0.5);
      float pick = h21(vec2(ci, ri * 1.7)), g = 0.0;
      if (pick < 0.3) g = step(abs(c.x), 0.1) * step(abs(c.y), 0.3);
      else if (pick < 0.5) g = step(length(c * vec2(1.0, 1.3)), 0.24) * step(0.12, length(c * vec2(1.0, 1.3)));
      else if (pick < 0.68) g = step(abs(c.y + 0.05), 0.07) * step(abs(c.x), 0.34);
      else if (pick < 0.82) g = step(length(c - vec2(0.0, 0.18)), 0.1) + step(abs(c.x), 0.08) * step(abs(c.y + 0.12), 0.18);
      float line = 1.0 - smoothstep(0.42, 0.47, abs(rf - 0.5));
      float fine = 1.0 - smoothstep(0.08, 0.2, max(fwidth(cell), fwidth(reg)));
      diffuseColor.rgb *= 1.0 - 0.42 * clamp(g + 0.6 * (1.0 - line), 0.0, 1.0) * fine - 0.06 * (1.0 - fine);
    }
    // Weather: dark streaks run down from every ledge, the faces are stained in broad patches, and dust lies pale
    // about the foot.
    float streak = wNoise(vec3((vObj.x + vObj.z) * 0.42, vObj.y * 0.018, 3.0));
    float stain = wFbm(vObj * vec3(0.03, 0.05, 0.03) + 11.0);
    diffuseColor.rgb *= mix(0.84, 1.04, smoothstep(0.25, 0.75, streak)) * (0.9 + 0.16 * stain);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.31, 0.25), 0.35 * (1.0 - smoothstep(-2.0, 7.0, vObj.y)));
  }
  // The rock: its strata in bands of differing shade, each band's line wandering, dust pale on what faces up, and the
  // undersides of ledges dark.
  if (sk == ${K.rock}) {
    vec3 nr = normalize(vObjN);
    float wob = wNoise(vec3(vObj.x * 0.05, 0.0, vObj.z * 0.05)) * 6.0, band = (vObj.y + wob) / 5.5;
    float shade = 0.88 + 0.18 * h21(vec2(floor(band), 3.0));
    shade = mix(shade, 0.95, smoothstep(0.3, 0.6, fwidth(band)));
    diffuseColor.rgb *= shade;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.37, 0.31), 0.25 * smoothstep(0.7, 0.95, nr.y));
  }
  // The paving: great slabs in staggered courses, each its own shade, the joints dark with dust, worn paler where
  // feet and loads have crossed it toward the gate.
  if (sk == ${K.paving}) {
    vec2 m = vUv2 / 11.0; m.x += 0.5 * mod(floor(m.y), 2.0);
    float j = max(1.0 - pulse(m.x, 0.035, 1.0), 1.0 - pulse(m.y, 0.035, 1.0)) * (1.0 - smoothstep(0.15, 0.4, length(fwidth(m))));
    float slab = 0.78 + 0.4 * h21(floor(m));
    float worn = wFbm(vec3(vUv2 * 0.02, 1.0));
    diffuseColor.rgb *= slab * (1.0 - 0.5 * j) * (0.85 + 0.3 * worn);
  }
  // The metals are old: tarnish lies in broad dull patches, and the gold is rubbed brightest where it stands out.
  // A headcloth of gold is striped across, gold and dark bronze in turn, the stripes fading before they are finer than a
  // pixel.
  if (sk == ${K.gold} && vCell.y > 0.5) { float q = vObj.y / 1.7; diffuseColor.rgb *= mix(1.0 - 0.72 * (1.0 - pulse(q, 0.0, 0.5)), 0.64, smoothstep(0.2, 0.5, fwidth(q))); }
  float dull = 0.0;
  if (sk == ${K.umber} || sk == ${K.gold} || sk == ${K.iron}) {
    dull = 1.0 - smoothstep(0.3, 0.7, wFbm(vObj * 0.12 + 5.0));
    diffuseColor.rgb *= 1.12 - 0.32 * dull;
  }
  // The hulls are plated: a fine seam every few units along their length.
  if (sk == ${K.hull}) { float q = vUv2.x * vCell.y; diffuseColor.rgb *= 1.0 - 0.3 * (1.0 - pulse(q, 0.05, 1.0)) * (1.0 - smoothstep(0.15, 0.4, fwidth(q))); }
`;

// The rock's surface broken finer than its geometry: a bump worked out from a noise over it, fading out before it is
// finer than a pixel.
const BUMP = /* glsl */ `
  if (sk == ${K.rock} || sk == ${K.stone}) {
    float rk = sk == ${K.rock} ? 0.0018 : 0.0;
    float hb = wFbm(vObj * 0.32) + 1.6 * wFbm(vObj * 0.07);
    vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
    vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
    float det = dot(sx, r1);
    vec3 grad = sign(det) * (dFdx(hb) * r1 + dFdy(hb) * r2);
    float fade = 1.0 - smoothstep(0.6, 1.6, length(fwidth(vObj)));
    normal = normalize(abs(det) * normal - grad * rk * fade);
  }
`;

const EMISSIVE = /* glsl */ `
  vec3 em = vec3(0.0);
  vec2 q = vUv2;
  if (sk == ${K.door}) {
    // The hall inside an open door: brightest low down where its floor is lit, slats of a shutter half raised.
    float v = q.y, fall = 0.35 + 0.65 * (1.0 - smoothstep(0.0, 0.9, v));
    float slat = mix(pulse(v * 9.0, 0.0, 0.78), 0.78, smoothstep(0.2, 0.5, fwidth(v * 9.0)));
    float side = smoothstep(0.0, 0.18, q.x) * smoothstep(1.0, 0.82, q.x);
    em = heat(0.55 + 0.25 * (1.0 - v)) * 0.75 * fall * mix(1.0, slat, step(0.55, v)) * (0.55 + 0.45 * side);
  } else if (sk == ${K.windows}) {
    // A row of windows round a deck: lit bays between mullions, a few dark.
    float b = q.x * vCell.y, bi = floor(b);
    float on = mix(step(0.18, h21(vec2(bi, vCell.z))), 0.82, smoothstep(0.3, 0.6, fwidth(b)));
    float mull = mix(pulse(b, 0.12, 0.9), 0.78, smoothstep(0.3, 0.6, fwidth(b)));
    float k = 0.55 + 0.25 * h21(vec2(bi * 0.31, 7.0));
    em = heat(k) * 0.9 * on * mull * (0.6 + 0.4 * smoothstep(0.0, 1.0, q.y));
  } else if (sk == ${K.line}) {
    em = heat(0.78) * 0.85;
  } else if (sk == ${K.ringlight}) {
    // The ring's inner face, lit in segments, with a pulse that runs round it now and then.
    float a = q.x, seg = mix(pulse(a * 36.0, 0.1, 0.92), 0.82, smoothstep(0.3, 0.6, fwidth(a * 36.0)));
    float d = abs(fract(a - uRing + 0.5) - 0.5);
    float p = exp(-pow(d / 0.06, 2.0)) * vCell.y;
    em = heat(0.62 + 0.3 * p) * (0.5 + 1.1 * p) * seg;
  } else if (sk == ${K.engine}) {
    float th = vCraft.x;
    em = heat(0.55 + 0.4 * th) * (0.25 + 1.4 * th);
  } else if (sk == ${K.lamp}) {
    em = heat(0.85) * 1.1;
  } else if (sk == ${K.deck}) {
    em = heat(0.7) * 0.5;
  } else if (sk == ${K.pool}) {
    // The harbour's basin: a sheet of the stream's own light under dark water, moving slowly in long swells.
    vec2 p = vObj.xz;
    float w = 0.5 + 0.5 * sin(p.x * 0.21 + uT * 0.7 + sin(p.y * 0.13 + uT * 0.3) * 2.0) * sin(p.y * 0.17 - uT * 0.5);
    float edge = smoothstep(0.0, 6.0, min(min(p.x - ${f1(46)}, ${f1(105)} - p.x), min(p.y + 40.0, 19.0 - p.y)));
    em = heat(0.55 + 0.25 * w) * (0.22 + 0.35 * w) * (0.55 + 0.45 * edge);
  } else if (sk == ${K.sun}) {
    // The sun disc's face: a hot core, and fine rays turning in it.
    vec2 c = vUv2 - 0.5; float r = length(c) * 2.0, a = atan(c.y, c.x);
    float rays = mix(0.5 + 0.5 * cos(a * 16.0 + uT * 0.2), 0.5, smoothstep(0.3, 0.6, fwidth(a * 16.0 / 6.2831)));
    em = heat(0.95 - 0.25 * r) * (1.1 - 0.5 * r) * (0.75 + 0.25 * rays);
  }
  totalEmissiveRadiance += em;
`;

export function solidMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3 });
  m.name = 'portSolid';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${VERT_HEAD}`).replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERT_BODY}`);
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>\n${HEAD}`);
    f = f.replace('#include <color_fragment>', `#include <color_fragment>\n${COLOR}`);
    f = f.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = clamp(SR[si] + 0.1 * (grain - 0.5) + 0.22 * dull, 0.04, 1.0);`);
    f = f.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\nmetalnessFactor = SM[si];`);
    f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${BUMP}`);
    f = f.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${EMISSIVE}`);
    f = f.replace('#include <lights_fragment_end>', `radiance *= SRoom[si];\n  reflectedLight.directDiffuse *= ${f1(LAMP_GAIN)};\n  reflectedLight.directSpecular *= ${f1(LAMP_GAIN)};\n#include <lights_fragment_end>`);
    sh.fragmentShader = f.replace('#include <opaque_fragment>', 'outgoingLight = heldUnder(outgoingLight - totalEmissiveRadiance) + totalEmissiveRadiance;\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'skycity-port';
  return m;
}

// The small lights: each a soft round spot a few pixels across with a core a little over a pixel, on a square turned
// to the screen, so one moving between pixels never flickers. Where each is and how bright are worked out on the
// clock each frame and handed over.
const GV_HEAD = /* glsl */ `
uniform float uPx;
uniform vec2 uView;
attribute vec2 corner;
attribute vec4 look;
varying vec3 vColor;
varying vec2 vQ;
varying float vSize;
vec3 heat(float k){
  vec3 c = mix(${lin(hex('ember'))}, ${lin(hex('flame'))}, smoothstep(0.0, 0.45, k));
  c = mix(c, ${lin(hex('hot'))}, smoothstep(0.45, 0.85, k));
  return mix(c, ${lin(hex('pale'))}, smoothstep(0.85, 1.0, k));
}
`;
const GV_BODY = /* glsl */ `
  vColor = heat(look.y) * look.z;
  vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vSize = look.x * uPx;
  float hs = 0.5 * (vSize * 3.0 + 2.0);
  vQ = corner * hs;
  c.xy += corner * hs * 2.0 / uView * c.w;
  if (look.z <= 0.0) c = vec4(2.0, 2.0, 2.0, 1.0);
  gl_Position = c;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
`;
const GF_HEAD = 'varying vec3 vColor;\nvarying vec2 vQ;\nvarying float vSize;';
const GF_BODY = /* glsl */ `
  float r2 = dot(vQ, vQ) / max(vSize * vSize * 0.25, 0.25);
  float a = exp(-r2 * 1.5) + 0.08 * exp(-r2 * 0.35);
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * a, 1.0);
`;

export interface Glow { mesh: THREE.Mesh; at: Float32Array; look: Float32Array; set(i: number, x: number, y: number, z: number, size: number, heat: number, k: number): void; flush(): void }

export function glow(n: number): Glow {
  const g = new THREE.BufferGeometry(), at = new Float32Array(n * 12), look = new Float32Array(n * 16), corner = new Float32Array(n * 8), index: number[] = [];
  const cs = [-1, -1, 1, -1, 1, 1, -1, 1];
  for (let i = 0; i < n; i++) {
    corner.set(cs, i * 8);
    index.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  }
  const pos = new THREE.BufferAttribute(at, 3), lk = new THREE.BufferAttribute(look, 4);
  pos.setUsage(THREE.DynamicDrawUsage);
  lk.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('position', pos);
  g.setAttribute('corner', new THREE.BufferAttribute(corner, 2));
  g.setAttribute('look', lk);
  g.setIndex(index);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 150, 0), 2000);
  const px = { value: 1 }, view = { value: new THREE.Vector2(1, 1) };
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.name = 'portGlow';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uPx: px, uView: view });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${GV_HEAD}`).replace('#include <project_vertex>', GV_BODY);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${GF_HEAD}`).replace('#include <opaque_fragment>', GF_BODY);
  };
  m.customProgramCacheKey = () => 'skycity-port-glow';
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.noAO = true;
  mesh.renderOrder = 3;
  const size = new THREE.Vector2();
  mesh.onBeforeRender = (r) => {
    px.value = r.getPixelRatio();
    const t = r.getRenderTarget();
    if (t) view.value.set(t.width, t.height); else view.value.copy(r.getDrawingBufferSize(size));
  };
  return {
    mesh, at, look,
    set(i, x, y, z, s, h, k) {
      for (let v = 0; v < 4; v++) {
        at[(i * 4 + v) * 3] = x; at[(i * 4 + v) * 3 + 1] = y; at[(i * 4 + v) * 3 + 2] = z;
        look[(i * 4 + v) * 4] = s; look[(i * 4 + v) * 4 + 1] = h; look[(i * 4 + v) * 4 + 2] = k;
      }
    },
    flush() { pos.needsUpdate = true; lk.needsUpdate = true; },
  };
}
