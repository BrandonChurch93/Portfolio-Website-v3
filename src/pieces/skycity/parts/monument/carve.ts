import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { slice } from '../../../../world/build';
import { RAYS, rayHalf } from './disc';
import { CARVE_R, QUARTER, SEAM } from './plan';
import { RIM, RINGS, face } from './profile';

// The fine carving of the disc, worked out once into three pictures over a quarter turn of its face, which repeats
// round it: which way the carved surface leans (a normal map), its color, and how rubbed and how shut in it is. The
// large forms, the domed face, its rings, the rim and the rays, are solids. These pictures carry what is finer than a
// solid could afford: the petals round the boss, the twenty plates with their glyphs, the sixteen marked
// plates, the milling on the rim. The glyphs and marks are Work's Sun stone's own (src/stream/stone.ts), drawn again
// here so the two are one family. With mip maps the carving fades to its average before it is finer than a pixel.

// How many texels round a quarter turn and out from the middle to the rim.
export const MAP = { w: 768, h: 384 } as const;
// Gold, a polished metal at the palette's own hue between copper-light and hot: never a yellow brass. Where it is shut
// in it has darkened toward an old bronze, and where it stands proud it is rubbed bright.
const GOLD = new THREE.Color(hex('hot')).lerp(new THREE.Color(hex('pale')), 0.5);
const DARK = new THREE.Color(hex('bronze-deep')).multiplyScalar(0.9);
const RUBBED = new THREE.Color(hex('pale')).lerp(GOLD, 0.5);
// The gold is finished as an old thing that has been touched: what stands proud is rubbed to a mirror, the open
// field is satin, and what is sunk is rough and dark with old bronze. How rough the satin, the rubbed and the shut in
// gold are, how dark the shut in gold's reflections are, how far its color goes to the dark bronze, how dark the open
// field is against the rubbed gold, and how many units below and above what stands round it a point must be to be
// wholly shut in or wholly proud, and how rubbed the rays' faces are: as mirrors their flat faces showed the dark room
// and read as holes. Every reviewer read one finish all over as orange chrome or plastic.
const FINISH = { satin: 0.3, rubbed: 0.06, shut: 0.55, ao: 0.82, dark: 0.95, field: 0.82, deep: 0.8, high: 0.55, ray: 0.55 } as const;

const TAU = Math.PI * 2;
// The glyphs and marks stand up from their plates as the Sun stone's figures do, in flat topped strokes with a cut
// edge: how much they are thickened, how high they stand, how wide their edge is, and how far the plate's floor round
// them is sunk. Cut thin and shallow they read as an emboss, and their edges broke into glitter.
const GLYPH = { bold: 0.45, rise: 1.2, edge: 0.2, sink: 0.7 } as const;
const sat = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const cut = (d: number, w: number) => sat(0.5 - d / (2 * w));
const bell = (x: number) => Math.exp(-x * x);
const len = (x: number, y: number) => Math.sqrt(x * x + y * y);
const almond = (x: number, y: number, w: number, h: number) => {
  const rr = (w * w + h * h) / (2 * h), d = rr - h;
  return Math.max(len(x, y - d) - rr, len(x, y + d) - rr);
};
// Which of n places round the disc a point is nearest (which), and how far round from it, as a length at its radius
// (at). Kept in two numbers and not handed back as a pair: this is called hundreds of thousands of times.
let at = 0, which = 0;
const around = (th: number, n: number, rho: number): void => {
  const a = (th * n) / TAU, id = Math.floor(a + 0.5);
  at = ((a - id) * TAU) / n * rho;
  which = ((id % n) + n) % n;
};

// The Sun stone's glyphs, each across a plate from -1 to 1 both ways. None is a letter or a number.
function glyph(a: number, b: number, id: number): number {
  if (id > 9.5) b = -b;
  const k = (id * 7) % 10, x = Math.abs(a);
  if (k < 0.5) return Math.abs(len(a, b) - 0.5) - 0.15;
  if (k < 1.5) return Math.min(Math.max(Math.abs(b - 0.5) - 0.14, x - 0.64), Math.max(Math.abs(x - 0.46 * (x >= 0.23 ? 1 : 0)) - 0.12, Math.abs(b + 0.1) - 0.5));
  if (k < 2.5) return Math.min(Math.max(Math.abs(a + 0.4) - 0.15, Math.abs(b) - 0.66), Math.max(Math.abs(b + 0.51) - 0.15, x - 0.56));
  if (k < 3.5) return Math.min(Math.abs(almond(a, b, 0.7, 0.38)) - 0.1, len(a, b) - 0.17);
  if (k < 4.5) return Math.min(len(a, b - 0.3) - 0.27, Math.max(Math.abs(b + 0.46) - 0.14, x - 0.6));
  if (k < 5.5) return Math.min(Math.max(Math.abs(b) - 0.13, x - 0.62), Math.min(Math.max(Math.abs(a - 0.49) - 0.13, Math.abs(b - 0.32) - 0.44), Math.max(Math.abs(a + 0.49) - 0.13, Math.abs(b + 0.32) - 0.44)));
  if (k < 6.5) return Math.max(len(a, b) - 0.64, 0.5 - len(a, b - 0.3));
  if (k < 7.5) return Math.min(Math.max(Math.abs(b - 0.46) - 0.14, x - 0.62), Math.max(x - 0.14, Math.abs(b + 0.1) - 0.56));
  if (k < 8.5) return Math.min(Math.abs(Math.max(x, Math.abs(b)) - 0.52) - 0.12, len(a, b) - 0.16);
  return Math.max(Math.min(Math.abs(x * 0.9 - b - 0.28), Math.abs(x * 0.9 - b + 0.34)) * 0.74 - 0.11, Math.max(x, Math.abs(b)) - 0.68);
}

// Whether a point is under a ray, and if so how far across it, as a share of its half width.
function underRay(th: number, rho: number): number {
  for (const [ray, off] of [[RAYS.great, 0], [RAYS.lesser, Math.PI / 4]] as const) {
    const a = ((((th - off) % QUARTER) + QUARTER * 1.5) % QUARTER) - QUARTER / 2;
    const along = Math.cos(a) * rho, side = Math.abs(Math.sin(a)) * rho, w = rayHalf(ray, along);
    if (along > ray.from - 1.2 && along < ray.to && side < w + 0.9) return w > 0.2 ? side / w : 1;
  }
  return -1;
}

// How far the fine carving stands above or below the large forms at a point, in the carving's units.
let onRay = false;
function fine(th: number, rho: number): number {
  const R = RINGS;
  const ray = rho > RAYS.great.from - 1.3 ? underRay(th, rho) : -1;
  onRay = ray >= 0;
  if (ray >= 0) return 0;
  let h = 0;
  // The boss: lines round its dome, and twelve short rays cut into it.
  if (rho < 8) {
    h -= 0.45 * bell((rho - 4.1) / 0.24) + 0.35 * bell((rho - 2.3) / 0.2);
    around(th, 12, rho); const s = at;
    h -= 0.4 * cut(Math.abs(s) - 0.32, 0.18) * cut(Math.abs(rho - 5.4) - 0.8, 0.2);
  }
  // A sunburst in the field round the boss: sixteen rays, long and short by turns, each a ridge of two faces.
  if (rho > R.field[0] - 0.5 && rho < R.field[1] + 0.5) {
    around(th, 16, rho);
    const s = at, id = which, t = (rho - R.field[0]) / (R.field[1] - R.field[0]), long = id % 2 === 0 ? 1 : 0.72;
    const w = 2.7 * Math.max(0, long - t) / long, ray = Math.abs(s) - w;
    h += ray < 0 ? 1.6 * long * (1 - t) * (1 - Math.abs(s) / Math.max(w, 1e-3)) * cut(ray, 0.2) : 0;
  }
  // Twenty plates, each with a glyph cut in it.
  if (rho > R.glyphs[0] && rho < R.glyphs[1]) {
    around(th, 20, rho); const s = at, id = which, half = (rho * TAU) / 40 - 0.75;
    const plate = Math.max(Math.abs(s) - half, Math.abs(rho - 40.75) - 6.6);
    h -= 1.3 * (1 - cut(plate, 0.25));
    const g = glyph(s / (half * 0.72), (rho - 40.75) / 5.2, id % 5) * 4.6 - GLYPH.bold;
    h += GLYPH.rise * cut(g, GLYPH.edge) * cut(plate + 0.4, 0.2) - GLYPH.sink * cut(plate + 0.4, 0.2);
  }
  // Sixteen plates, each with one of four marks.
  if (rho > R.plates[0] && rho < R.plates[1]) {
    around(th - TAU / 32, 16, rho); const s = at, id = which, half = (rho * TAU) / 32 - 0.75;
    const plate = Math.max(Math.abs(s) - half, Math.abs(rho - 60.5) - 6.6);
    h -= 1.3 * (1 - cut(plate, 0.25));
    const q = rho - 60.5, kind = id % 4;
    let mark: number;
    if (kind === 0) mark = glyph(s / 5.6, q / 4.6, 8) * 4.6;
    else if (kind === 1) mark = glyph(s / 5.6, q / 4.6, 15) * 4.6;
    else if (kind === 2) mark = Math.min(Math.abs(len(s, q) - 3.4) - 0.75, len(s, q) - 1.1);
    else mark = Math.min(Math.max(Math.abs(Math.abs(s) - 3.6) - 0.6, Math.abs(q) - 4.2), Math.max(Math.abs((((q + 4.2) % 2.8) + 2.8) % 2.8 - 1.4) - 0.48, Math.abs(s) - 3.6));
    h += GLYPH.rise * cut(mark - GLYPH.bold, GLYPH.edge) * cut(plate + 0.4, 0.2) - GLYPH.sink * cut(plate + 0.4, 0.2);
  }
  // Round the rim's crest, forty eight blocks with a channel between each, between two lines cut round it.
  if (rho > RIM.c - 4.2 && rho < RIM.c + 4.2) {
    around(th, 48, rho);
    const block = Math.max(Math.abs(at) - ((rho * TAU) / 96 - 0.55), Math.abs(rho - RIM.c) - 3.1);
    h -= 0.9 * (1 - cut(block, 0.22));
  }
  h -= 0.4 * (bell((rho - (RIM.c - 3.6)) / 0.24) + bell((rho - (RIM.c + 3.6)) / 0.24));
  return h;
}

// The large forms' height, for telling what is shut in: the face, and the rim's front.
function large(rho: number): number {
  if (rho < RIM.c - RIM.a) return face(rho);
  const t = (rho - RIM.c) / RIM.a;
  return RIM.b * Math.sqrt(sat(1 - t * t));
}

export interface Carving { normal: THREE.DataTexture; color: THREE.DataTexture; orm: THREE.DataTexture }

export async function carve(): Promise<Carving> {
  const W = MAP.w, H = MAP.h, n = W * H;
  const dth = QUARTER / W, drho = CARVE_R / H;
  const fineH = new Float32Array(n), all = new Float32Array(n), plain = new Uint8Array(n);
  for (let j = 0; j < H; j++) {
    const rho = (j + 0.5) * drho, big = large(rho);
    for (let i = 0; i < W; i++) {
      const th = SEAM + (i + 0.5) * dth, k = j * W + i, f = fine(th, rho), ray = onRay;
      fineH[k] = f;
      all[k] = big + f + (ray ? 6 : 0);
      plain[k] = ray ? 1 : 0;
    }
    if ((j & 7) === 7) await slice();
  }
  // What stands round each point: its neighbours' heights averaged over about two units, round the disc (which wraps)
  // and then outward.
  const blur = new Float32Array(n), tmp = new Float32Array(n);
  for (let j = 0; j < H; j++) {
    const rho = (j + 0.5) * drho, rad = Math.max(1, Math.min(W / 4, Math.round(2.2 / (rho * dth)))), row = j * W;
    let sum = 0;
    for (let i = -rad; i <= rad; i++) sum += all[row + ((i % W) + W) % W];
    for (let i = 0; i < W; i++) {
      tmp[row + i] = sum / (2 * rad + 1);
      sum += all[row + ((i + rad + 1) % W)] - all[row + ((i - rad) % W + W) % W];
    }
    if ((j & 31) === 31) await slice();
  }
  const rv = Math.round(2.2 / drho);
  for (let i = 0; i < W; i++) {
    let sum = 0, cnt = 0;
    for (let j = 0; j <= rv && j < H; j++) { sum += tmp[j * W + i]; cnt++; }
    for (let j = 0; j < H; j++) {
      blur[j * W + i] = sum / cnt;
      const add = j + rv + 1, drop = j - rv;
      if (add < H) { sum += tmp[add * W + i]; cnt++; }
      if (drop >= 0) { sum -= tmp[drop * W + i]; cnt--; }
    }
    if ((i & 63) === 63) await slice();
  }
  const nb = new Uint8Array(n * 4), cb = new Uint8Array(n * 4), ob = new Uint8Array(n * 4);
  // The color for each pair of how shut in and how proud, worked out once.
  const lut = new Uint8Array(32 * 32 * 3), c = new THREE.Color();
  for (let a = 0; a < 32; a++) for (let b = 0; b < 32; b++) {
    const shut = a / 31, proud = b / 31;
    c.copy(GOLD).multiplyScalar(FINISH.field + (1 - FINISH.field) * proud).lerp(DARK, FINISH.dark * shut).lerp(RUBBED, 0.4 * proud * (1 - shut)).convertLinearToSRGB();
    lut.set([Math.round(sat(c.r) * 255), Math.round(sat(c.g) * 255), Math.round(sat(c.b) * 255)], (a * 32 + b) * 3);
  }
  for (let j = 0; j < H; j++) {
    const rho = (j + 0.5) * drho;
    for (let i = 0; i < W; i++) {
      const k = j * W + i, l = j * W + ((i + W - 1) % W), r = j * W + ((i + 1) % W);
      let nx = 0, ny = 0;
      if (rho > 0.6) {
        nx = -(fineH[r] - fineH[l]) / (2 * dth * rho);
        ny = -((j < H - 1 ? fineH[k + W] : fineH[k]) - (j > 0 ? fineH[k - W] : fineH[k])) / (2 * drho);
      }
      const nl = Math.hypot(nx, ny, 1);
      nb[k * 4] = Math.round((nx / nl * 0.5 + 0.5) * 255);
      nb[k * 4 + 1] = Math.round((ny / nl * 0.5 + 0.5) * 255);
      nb[k * 4 + 2] = Math.round((1 / nl * 0.5 + 0.5) * 255);
      nb[k * 4 + 3] = 255;
      const low = all[k] - blur[k];
      const shut = plain[k] ? 0 : sat(-low / FINISH.deep), proud = plain[k] ? FINISH.ray : sat(low / FINISH.high);
      const at = (Math.round(shut * 31) * 32 + Math.round(proud * 31)) * 3;
      cb[k * 4] = lut[at];
      cb[k * 4 + 1] = lut[at + 1];
      cb[k * 4 + 2] = lut[at + 2];
      cb[k * 4 + 3] = 255;
      const rough = (FINISH.satin + (FINISH.rubbed - FINISH.satin) * proud) * (1 - shut) + FINISH.shut * shut;
      ob[k * 4] = Math.round((1 - FINISH.ao * shut) * 255);
      ob[k * 4 + 1] = Math.round(sat(rough) * 255);
      ob[k * 4 + 2] = 255;
      ob[k * 4 + 3] = 255;
    }
    if ((j & 15) === 15) await slice();
  }
  const tex = (data: Uint8Array, srgb: boolean) => {
    const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  return { normal: tex(nb, false), color: tex(cb, true), orm: tex(ob, false) };
}
