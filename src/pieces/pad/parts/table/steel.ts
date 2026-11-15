import * as THREE from 'three';
import { hex, type PaletteName } from '../../../../config/palette';
import { Builder } from '../../../../world/build';
import { NOISE, lin } from '../../../../world/surface';
import { SCALE, STONE } from '../../layout';

// The materials of the launch table and the tower, which both parts share. A part's budget is a few shader programs,
// so every surface of both is one program and what each piece is made of rides on its vertices (its kind, in the cell
// attribute's x). The beacon's halo is the only other.

const tone = (n: PaletteName, k: number) => new THREE.Color(hex(n)).multiplyScalar(k).getHex();

// What each kind is: its color, how metallic and rough it is, how much of the room it reflects against the stage's
// level (so a dark part still holds a line of light on its edges), and what lights it by itself.
interface Kind { color: number; metal: number; rough: number; room: number; glow?: number; lamp?: number }
export const KIND = {
  // Structural steel: the lattice, the legs, the deck's frame. Warm dark steel, satin, plainly grey beside the copper.
  steel: { color: 0x686664, metal: 1, rough: 0.28, room: 2.8 },
  // Steel painted near black: the deck's girder webs, the arms' trusses, the lift's car.
  black: { color: 0x0e0d0c, metal: 0.25, rough: 0.42, room: 1.4 },
  // Polished: the rails, the toe edges, the deck's front lip.
  bright: { color: 0x9a9690, metal: 1, rough: 0.16, room: 3.2, lamp: 0.9 },
  // Handrails: satin steel a little lighter than the structure, so a rail is drawn by the line of light along its top
  // and not by its whole length.
  rail: { color: 0x76736f, metal: 1, rough: 0.22, room: 2.4, lamp: 0.5 },
  // The deck's top plates, with their seams and bolts worked out in the shader.
  deck: { color: 0x4c4a47, metal: 1, rough: 0.4, room: 2.2, lamp: 0.9 },
  // Grating, its bars worked out in the shader.
  grate: { color: 0x3a3937, metal: 1, rough: 0.5, room: 2 },
  copper: { color: tone('copper', 0.78), metal: 1, rough: 0.22, room: 2.4 },
  bronze: { color: tone('bronze', 0.85), metal: 1, rough: 0.36, room: 2.8 },
  // Rubber and lagging: the hoses, the lines' insulation, the lift's cables.
  rubber: { color: 0x171615, metal: 0, rough: 0.75, room: 1 },
  // The flame hole's collar: steel tinted by the heat in rings round the hole.
  heat: { color: 0x55514d, metal: 1, rough: 0.42, room: 2.2 },
  // A painted panel: dark steel with marks in a worn pale paint, from a picture of its own (MARKS).
  sign: { color: 0x1a1918, metal: 0.4, rough: 0.5, room: 1.6 },
  // The beacon's lens, and the small marker lights.
  lens: { color: 0x2a2724, metal: 0, rough: 0.2, room: 1, glow: 1 },
  marker: { color: 0x1a1412, metal: 0, rough: 0.3, room: 1, glow: 2 },
} satisfies Record<string, Kind>;
export type KindName = keyof typeof KIND;
const NAMES = Object.keys(KIND) as KindName[];
const K = Object.fromEntries(NAMES.map((n, i) => [n, i])) as Record<KindName, number>;

// What the lit stone throws onto what stands over it: its color, and how strong at full.
const STONE_LIGHT = { color: [hex('ember'), hex('flame')] as const, power: 2.4, mirror: 1.6, broad: 0.7, fall: 160 };
// A light closer than this, in metres, is taken as no stronger than at this distance: the engine's light stands just
// over the deck and the stone's light just under it, and either would burn a white spot into the steel.
const NEAR = 0.11;
// The stage's light from the stone's middle stands right under the deck and the flame hole. The stone's own light is
// laid on these parts above, so they take only this share of it.
const GLOW_TAKEN = 0.25;
// The cursor's light stands close in front: a face turned square to it would take its whole hot spot and read as
// pale paint, so these dark parts take this share of it, unless their kind says otherwise. The deck, lying flat, takes
// nearly all of it as a sheen that falls off across its length.
const LAMP_TAKEN = 0.3;
// How much of the room a face reflects from below its horizon, and how much of the stage's even light it takes.
const ROOM_BELOW = 0.12, AMBIENT = 0.5;
// What the room, the cursor's light and the stone lay on these parts is held under this, so a face turned square to the
// cursor's light never blooms. What they light by themselves is added after.
const HOLD = { knee: 0.75, top: 1.25 };

// The marks a painted panel can carry, each a row of one picture: hazard stripes, and the table's code.
export const MARKS = { stripes: 0, code: 1, rows: 2 } as const;
const MARK_TEXT = ['', 'LC\u00b707'];

function marksPicture(): THREE.Texture {
  const w = 512, h = 128, c = document.createElement('canvas');
  c.width = w;
  c.height = h * MARKS.rows;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.save();
  g.beginPath();
  g.rect(0, 0, w, h);
  g.clip();
  for (let x = -h; x < w + h; x += 64) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 32, h); g.lineTo(x + 32 + h, 0); g.lineTo(x + h, 0); g.fill(); }
  g.restore();
  g.font = 'bold 96px "Courier New", Courier, monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 1; i < MARK_TEXT.length; i++) g.fillText(MARK_TEXT[i], w / 2, h * i + h / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

export const U = {
  // How far in from the stone's rim its light has come, in units, and how strong it is.
  uRin: { value: STONE.r as number },
  uStone: { value: 0 },
  uMarks: { value: null as THREE.Texture | null },
};

// How far in from its rim the stone is lit, in units, for a fill: ring by ring, the boss last.
export function litFrom(fill: number): number {
  const rs = [...STONE.rings, 0], k = Math.min(1, Math.max(0, fill)) * (rs.length - 1), i = Math.min(rs.length - 2, Math.floor(k));
  return STONE.r * (rs[i] + (rs[i + 1] - rs[i]) * (k - i));
}

const arr = <T>(type: string, xs: T[], f: (x: T) => string) => `${type}[${xs.length}](${xs.map(f).join(', ')})`;
const col = (c: number) => { const k = new THREE.Color(c); return `vec3(${k.r.toFixed(4)}, ${k.g.toFixed(4)}, ${k.b.toFixed(4)})`; };
const f = (x: number) => x.toFixed(4);

const HEAD = /* glsl */ `
varying float vKind;
varying vec3 vPad;
uniform float uRin, uStone;
uniform sampler2D uMarks;
varying vec3 vSign;
${NOISE}
const vec3 KC[${NAMES.length}] = ${arr('vec3', NAMES, (n) => col(KIND[n].color))};
const float KM[${NAMES.length}] = ${arr('float', NAMES, (n) => f(KIND[n].metal))};
const float KR[${NAMES.length}] = ${arr('float', NAMES, (n) => f(KIND[n].rough))};
const float KRoom[${NAMES.length}] = ${arr('float', NAMES, (n) => f(KIND[n].room))};
const float KG[${NAMES.length}] = ${arr('float', NAMES, (n) => f((KIND[n] as Kind).glow ?? 0))};
const float KL[${NAMES.length}] = ${arr('float', NAMES, (n) => f((KIND[n] as Kind).lamp ?? LAMP_TAKEN))};
// A line box filtered over the pixel: how much of a pixel a line w wide at distance d from its middle covers, so a seam
// finer than a pixel fades to its mean and never sparkles.
float lineCover(float d, float w, float fw){ fw = max(fw, 1e-4); float lo = max(d - fw * 0.5, -w * 0.5), hi = min(d + fw * 0.5, w * 0.5); return max(hi - lo, 0.0) / fw; }
float seam(float u, float p, float w){ float d = abs(fract(u / p + 0.5) - 0.5) * p; return lineCover(d, w, fwidth(u)); }
// The deck's plates: seams across and along, the rows staggered, and a bolt at every corner.
float deckSeams(vec2 q, out float bolts){
  float row = floor(q.y / 37.5 + 0.5);
  float a = seam(q.x + mod(row, 2.0) * 24.0, 48.0, 0.9), b = seam(q.y, 37.5, 0.9);
  vec2 c = vec2(mod(q.x + mod(row, 2.0) * 24.0 + 3.5, 8.0) - 4.0, mod(q.y + 18.75, 37.5) - 18.75);
  float near = 1.0 - smoothstep(0.0, 1.0, length(fwidth(q)) * 1.2);
  bolts = (1.0 - smoothstep(0.55, 0.55 + length(fwidth(q)), length(vec2(c.x, abs(c.y) - 2.6)))) * near;
  return max(a, b);
}
float bars(float u, float p){ float d = abs(fract(u / p + 0.5) - 0.5) * p; return lineCover(d, p * 0.38, fwidth(u)); }
// The stone's light on what stands over it: a disc lit from its rim in to uRin. On a surface by how much of it the
// surface faces and how high over it it stands; in a reflection by whether the reflection meets the lit part.
float annulus(float h){ h = max(h, 2.0); float k = exp(-h / ${f(STONE_LIGHT.fall)}); float R2 = ${f(STONE.r * STONE.r)}, r2 = uRin * uRin, h2 = h * h; return max(R2 / (R2 + h2) - r2 / (r2 + h2), 0.0) * k; }
float stoneSeen(vec3 p, vec3 R, float rough){
  if (R.y > -0.01) return 0.0;
  float t = max(p.y, 0.0) / -R.y; float r = length(p.xz + R.xz * t);
  float soft = 6.0 + rough * rough * t * 1.5;
  return smoothstep(uRin - soft, uRin + soft, r) * (1.0 - smoothstep(${f(STONE.r)} - soft, ${f(STONE.r)} + soft, r)) * smoothstep(-0.01, -0.12, R.y);
}
float nearCap(float d){ float d2 = d * d; return d2 / (d2 + ${f(NEAR * NEAR)}); }
vec3 heldUnder(vec3 c){ float m = max(c.r, max(c.g, c.b)); if (m <= ${f(HOLD.knee)}) return c; float e = m - ${f(HOLD.knee)}; return c * (${f(HOLD.knee)} + e / (1.0 + e / ${f(HOLD.top - HOLD.knee)})) / m; }
`;

function material(name: string): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.4 });
  m.name = name;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 cell;\nvarying float vKind;\nvarying vec3 vPad;\nvarying vec3 vPadN;\nvarying vec3 vSign;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvKind = cell.x;\nvPad = (modelMatrix * vec4(position, 1.0)).xyz / ${f(SCALE)};\nvPadN = normalize(mat3(modelMatrix) * normal);\nvSign = vec3(uv, cell.y);`);
    const L = THREE.ShaderChunk.lights_fragment_begin
      .replace('getPointLightInfo( pointLight, geometryPosition, directLight );', 'getPointLightInfo( pointLight, geometryPosition, directLight );\n\t\tdirectLight.color *= nearCap( distance( pointLight.position, geometryPosition ) );')
      .replace('getSpotLightInfo( spotLight, geometryPosition, directLight );', `getSpotLightInfo( spotLight, geometryPosition, directLight );\n\t\tdirectLight.color *= nearCap( distance( spotLight.position, geometryPosition ) ) * ( distance( spotLight.position, ( viewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz ) < 1e-3 ? ${f(GLOW_TAKEN)} : KL[kk] );`);
    let s = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vPadN;\n${HEAD}`);
    s = s.replace('#include <color_fragment>', `#include <color_fragment>
  int kk = int(vKind + 0.5);
  float mott = wFbm(vPad * 0.05 + vec3(kk) * 7.0);
  vec3 base = KC[kk] * (0.86 + 0.28 * mott);
  float rAdd = 0.12 * (mott - 0.5), paint = 0.0;
  if (kk == ${K.sign}) {
    paint = texture2D(uMarks, vec2(vSign.x, 1.0 - (vSign.z + 1.0 - vSign.y) / ${f(MARKS.rows)})).r;
    paint *= smoothstep(0.3, 0.62, wFbm(vPad * 0.4 + 4.0) + 0.2) * (0.75 + 0.25 * wNoise(vPad * 2.0));
    base = mix(base, ${col(tone('pale', 0.42))} * (0.85 + 0.3 * mott), paint);
  } else if (kk == ${K.deck}) {
    float bolt; float sm = deckSeams(vPad.xz, bolt);
    float row = floor(vPad.z / 37.5 + 0.5);
    base *= 0.84 + 0.32 * wHash(vec3(floor((vPad.x + mod(row, 2.0) * 24.0) / 48.0 + 0.5), row, 3.0));
    base *= 1.0 - 0.72 * sm;
    base = mix(base, ${col(0xb5aea6)}, bolt * 0.7);
    rAdd += 0.2 * sm - 0.18 * bolt;
    // Tread: raised lozenges in rows, each catching the light along its top, faded to their mean once finer than a
    // pixel.
    vec2 tq = vec2(vPad.x * 0.7071 + vPad.z * 0.7071, vPad.z * 0.7071 - vPad.x * 0.7071) / 3.2;
    vec2 tc = fract(tq + vec2(0.5 * mod(floor(tq.y), 2.0), 0.0)) - 0.5;
    float lz = 1.0 - smoothstep(0.08, 0.16, abs(tc.y) + abs(tc.x) * 0.25 - 0.06);
    float tfar = 1.0 - smoothstep(0.35, 0.8, length(fwidth(tq)));
    base *= mix(1.0, 0.8 + 0.42 * lz, tfar);
    rAdd -= 0.14 * lz * tfar;
    // Soot round the flame hole, thickest at the collar and broken up.
    float hr = length(vPad.xz);
    base *= 1.0 - 0.5 * (1.0 - smoothstep(${f(52)}, ${f(110)}, hr + 26.0 * (wFbm(vPad * 0.09) - 0.5)));
  } else if (kk == ${K.grate}) {
    vec3 an = abs(vPadN);
    vec2 q = an.y > 0.5 ? vPad.xz : an.x > an.z ? vPad.zy : vPad.xy;
    float g = bars(q.x, 2.6) * 0.75 + bars(q.y, 9.0) * 0.25;
    base *= mix(0.12, 1.0, g);
  } else if (kk == ${K.heat}) {
    float r = length(vPad.xz);
    // Temper colors in rings round the hole: darkened at its lip, a band of straw, a faint bronze, then the steel.
    base = mix(base * 0.42, base, smoothstep(31.0, 37.0, r));
    base = mix(base, ${col(0xa08a62)}, exp(-pow((r - 38.5) / 2.6, 2.0)) * 0.6);
    base = mix(base, ${col(tone('bronze', 0.7))}, exp(-pow((r - 43.0) / 2.4, 2.0)) * 0.45);
  }
  diffuseColor.rgb = base;`);
    s = s.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(clamp(KR[kk] + rAdd, 0.05, 1.0), 0.72, paint);');
    s = s.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor = mix(KM[kk], 0.0, paint);');
    s = s.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  if (KG[kk] > 1.5) totalEmissiveRadiance += ${lin(hex('flame'))} * 0.9 + ${lin(hex('ember'))} * 2.0;
  else if (KG[kk] > 0.5) totalEmissiveRadiance += mix(${lin(hex('hot'))}, ${lin(hex('pale'))}, 0.7) * 3.2;`);
    s = s.replace('#include <lights_fragment_begin>', L);
    s = s.replace('#include <lights_fragment_end>', `
  {
    vec3 Nw = normalize((vec4(geometryNormal, 0.0) * viewMatrix).xyz);
    vec3 Vw = normalize((vec4(geometryViewDir, 0.0) * viewMatrix).xyz);
    vec3 Rw = reflect(-Vw, Nw);
    // The pad stands over a dark page: what a face reflects from below it is dark, so a face turned to the visitor
    // goes near black and an edge turned up holds the room's key as a pale line.
    radiance *= KRoom[kk] * mix(${f(ROOM_BELOW)}, 1.0, smoothstep(-0.25, 0.45, Rw.y));
    irradiance *= ${f(AMBIENT)};
    vec3 sc = mix(${lin(STONE_LIGHT.color[0])} * 2.2, ${lin(STONE_LIGHT.color[1])}, 0.55) * uStone;
    irradiance += sc * annulus(vPad.y) * clamp(0.5 - 0.5 * Nw.y, 0.0, 1.0) * ${f(STONE_LIGHT.power)};
    float down = clamp(0.5 - 0.5 * Rw.y, 0.0, 1.0);
    radiance += sc * (stoneSeen(vPad, Rw, roughnessFactor) * exp(-vPad.y / ${f(STONE_LIGHT.fall)}) * ${f(STONE_LIGHT.mirror)} + annulus(vPad.y) * down * down * ${f(STONE_LIGHT.broad)});
  }
#include <lights_fragment_end>`);
    s = s.replace('#include <opaque_fragment>', 'outgoingLight = heldUnder(outgoingLight - totalEmissiveRadiance) + totalEmissiveRadiance;\n#include <opaque_fragment>');
    sh.fragmentShader = s;
  };
  m.customProgramCacheKey = () => 'pad-steel';
  return m;
}

// The halo round the beacon: a soft disc of light, added, worked out in its own small shader.
function halo(): THREE.ShaderMaterial {
  const c = new THREE.Color(hex('hot')).lerp(new THREE.Color(hex('pale')), 0.4).multiplyScalar(0.9);
  const m = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vQ; void main(){ vQ = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vQ; void main(){ float d = length(vQ); float a = exp(-d * d * 30.0) * 0.9 + exp(-d * d * 7.0) * 0.18; a *= 1.0 - smoothstep(0.8, 1.0, d); gl_FragColor = vec4(vec3(${f(c.r)}, ${f(c.g)}, ${f(c.b)}) * a, 0.0); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  });
  m.name = 'pad-halo';
  return m;
}

export interface Steel { cast: THREE.MeshStandardMaterial; fine: THREE.MeshStandardMaterial; halo: THREE.ShaderMaterial }
export function steelMaterials(): Steel {
  if (!U.uMarks.value) U.uMarks.value = marksPicture();
  return { cast: material('pad-steel'), fine: material('pad-steel-fine'), halo: halo() };
}

// Sets what the stone's light is: how far it is lit and how strongly.
export function setStone(fill: number): void {
  U.uRin.value = litFrom(fill);
  U.uStone.value = fill > 0 ? 1 : 0;
}

// Two builders, one for the large forms that cast the cursor light's shadows and one for the fine parts that do not,
// with each piece's kind written on its vertices.
export class Parts {
  private big = new Builder();
  private small = new Builder();
  constructor(private m: Steel) {}
  get tris() { return this.big.tris + this.small.tris; }
  // kind may be worked out from where each triangle is, once it is placed, and from which way it faces.
  // mark is the row of MARKS a painted panel carries.
  add(geo: THREE.BufferGeometry, kind: KindName | ((p: THREE.Vector3, n: THREE.Vector3) => KindName), m?: THREE.Matrix4, cast = false, mark = 0): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const pos = g.getAttribute('position'), nor = g.getAttribute('normal'), n = pos.count, cell = new Float32Array(n * 4);
    const p = new THREE.Vector3(), q = new THREE.Vector3(), nn = new THREE.Vector3();
    for (let i = 0; i < n; i += 3) {
      let k = 0;
      if (typeof kind === 'string') k = K[kind];
      else {
        p.set(0, 0, 0);
        nn.set(0, 0, 0);
        for (let j = 0; j < 3; j++) { p.add(q.fromBufferAttribute(pos, i + j)); nn.add(q.fromBufferAttribute(nor, i + j)); }
        k = K[kind(p.divideScalar(3), nn.normalize())];
      }
      for (let j = 0; j < 3; j++) { cell[(i + j) * 4] = k; cell[(i + j) * 4 + 1] = mark; }
    }
    g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    if (cast) this.big.add(g, this.m.cast);
    else this.small.add(g, this.m.fine, undefined, { shadow: false });
  }
  build(parent: THREE.Object3D, name: string): THREE.Mesh[] {
    return [...this.big.build(parent, name), ...this.small.build(parent, `${name}-fine`)];
  }
}
