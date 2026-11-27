import { palette, type PaletteName } from '../../config/palette';
import { seeded } from '../../world/build';
import { bandFrame, cellSeed, clump, mix3, scale3, smooth, weigh, type V3 } from './field';
import type { SkyPlan } from './index';

// The deep sky: a second sky behind today's, drawn once and shown only where the pointer is (his ruling of Nov 26,
// "The plan you have for the sky looks incredible!"). With no pointer nothing of it is drawn, so the sky at rest is
// today's. It is behind a switch until he has seen it in the page: ?sky=deep.
export const DEEP_PARAM = 'sky';
export const isDeep = (query: URLSearchParams): boolean => query.get(DEEP_PARAM) === 'deep';

// Lengths are in units of the board and times in seconds. reach is how far from the pointer the sky deepens and soft
// how gently a thing comes up once the reveal passes its own threshold. The reveal comes up in `enter` when the
// pointer comes into the sky and deepens in `settle` once it slows under `fast` a second. The pointer leaves pools
// behind it, each gone `life` after it was dropped, no sooner than `every` and no nearer than `apart` to the last.
// most and least are what the brightest and the least channel of anything revealed may reach, as shares of 255.
export const DEEP = {
  reach: 335,
  soft: 0.16,
  enter: 0.22,
  settle: 0.45,
  fast: 527,
  life: 1.6,
  every: 0.1,
  apart: 36.5,
  pools: 16,
  first: 0.05,
  last: 0.66,
  most: 235 / 255,
  least: 190 / 255,
} as const;

// The hidden stars: how many are tried for each CSS pixel, the share kept where the sky is thickest, and the
// faintest and brightest of them in display levels, rarer as they brighten. block is his words' block as a share of
// the oval kept clear round it, and clear how far from the block the stars begin and are whole.
export const STARS = {
  cell: 16,
  tries: 0.694,
  keep: 3.4,
  faint: 6.5,
  slope: 0.6,
  most: 190,
  copper: 0.08,
  halo: { from: 60, over: 110, most: 0.1, sigma: 1.3 },
  block: [0.645, 0.65],
  clear: [18.5, 71],
} as const;
// Where they gather: along the band as it is seen, in the band's own frame, and round a cloud low on the left.
export const GATHER = {
  band: { a: 0.03, b: -0.95, along: 0.45, across: 0.96, haze: [0.62, 0.74], top: 46.6, stretch: 1.7 },
  cloud: { x: 119.6, y: 567.8, rx: 121.7, ry: 79.1, turn: 28 },
} as const;

// The warm gas in the band and in the cloud: value noise folded by two warps into sheets, with fine threads, dark
// lanes and one side lit. Cells and how far a warp carries are in units. The band's gas is two sheets laid in the
// band's own frame, the cloud's one, each place's lanes folded as its first sheet is and seeded on their own. full is
// the sheet's light that shows as the brightest tone, and tight the power on the cloud's oval that keeps its gas to
// the middle of where its stars gather. ramp is what the gas's light is drawn in, darkest first: where on 0 to 1 each
// tone sits, two of the palette's colors, how far from the first to the second, and how bright. show is the reveal
// the faintest gas waits for, how much less the brightest needs, and how gently it comes up. The lanes also thin the
// hidden stars, from the same numbers. texel is the most of the gas's picture there is for a CSS pixel, and mask how
// many CSS pixels one value of deepMask covers.
export const GAS = {
  wide: { cell: 380, octaves: 4, gain: 0.55, far: 370 },
  fine: { cell: 105, octaves: 4, gain: 0.55, far: 78 },
  body: { cell: 550, octaves: 9, gain: 0.6, floor: 0.1, cloud: [0.4, 0.92], curve: 1.25 },
  threads: { cell: 210, octaves: 6, gain: 0.62, span: [0.647, 0.924], curve: 2.2, fine: 1.3, wide: 0.9, light: 0.85, body: [0.22, 0.6], bare: 0.35 },
  lanes: { cell: 280, octaves: 7, gain: 0.62, wide: 0.7, over: 0.2, dark: 0.92 },
  rim: { step: 1.5, octaves: 7, gain: 54, flat: 0.42, lit: 0.95, shade: 0.25 },
  band: { seed: 66, second: 55, share: 0.55, lanes: 190, light: 200, lane: 0.46, full: 1.3, patch: { cell: 450, octaves: 3, gain: 0.5, seed: 8, least: 0.6, more: 0.8 } },
  low: { seed: 73, lanes: 80, light: 215, lane: 0.5, full: 0.76, tight: 2 },
  clear: [30, 190],
  level: 0.5,
  curve: 0.9,
  ramp: [
    [0.12, 'ember-deep', 'bronze-deep', 0.25, 0.52],
    [0.3, 'ember', 'bronze-deep', 0.4, 0.73],
    [0.5, 'ember', 'bronze', 0.4, 0.9],
    [0.7, 'copper', 'ember', 0.4, 0.97],
    [0.86, 'copper', 'copper', 0, 0.985],
    [1, 'copper-light', 'copper-light', 0, 1.02],
  ],
  haze: { cell: 260, octaves: 5, gain: 0.6, seed: 11, least: 0.3, more: 0.95, lanes: 0.85, level: 17 / 255, grain: 0.18, show: 0.5 },
  show: { first: 0.56, less: 0.34, soft: 0.3 },
  texel: 1,
  mask: 4,
} as const;

// Over the page's world (SkyPlan.land): how far over its outline the hidden sky begins and is whole, in units, how
// deep in the world's glow it starts to thin and is thinnest, as shares of the glow's reach, the share of it that is
// left there, and how far over the outline the pointer has to be for the whole of the reveal.
const LAND = { clear: [24, 110], glow: [0.18, 0.46], least: 0.06, over: 30 } as const;

const shown = (name: PaletteName): V3 => {
  const n = parseInt(palette[name].slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const PALE = shown('pale'), WARM = mix3(PALE, shown('hot'), 0.5), COPPER = scale3(shown('copper'), 1.09);
// The sky's light is added to the page's ground, so the sky itself may hold the limits less the ground.
export const DEEP_CAP: [number, number] = [DEEP.most - Math.max(...shown('bg')), DEEP.least - Math.min(...shown('bg'))];

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
// Less of the band, the cloud or the gas than this is none.
export const FAINT = 0.001;
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(6.2831853 * r());

// Value noise in octaves, spread to fill 0 to 1. cell is the widest octave's, in units of the board.
function cloud(x: number, y: number, cell: number, octaves: number, gain: number, seed: number): number {
  let sum = 0, amp = 1, total = 0, power = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * clump(x / cell + seed * 37.13 + i * 11.7, y / cell - seed * 19.31 + i * 5.3);
    total += amp;
    power += amp * amp;
    amp *= gain;
    cell /= 2;
  }
  return clamp(0.5 + (sum / total - 0.5) * total / (0.97 * Math.sqrt(power)), 0, 1);
}

export interface DeepField { mask: number; env: number; haze: number; lanes: number }

// How far a place is over the world's outline, in CSS pixels. Under it, less than nothing.
const over = (p: SkyPlan, land: (x: number) => number, x: number, y: number) => Math.min(land(x), p.end) - y;

// Where the hidden sky may be at all: never behind his words' block or on the moon, never under the world's outline,
// thinner toward the world's glow. A page that has told no outline has the sky's own guess of one.
function allowed(p: SkyPlan, x: number, y: number): number {
  const w = weigh(p, x, y);
  const far = Math.hypot(Math.max(0, Math.abs(x - p.words.x) - STARS.block[0] * p.words.rx), Math.max(0, Math.abs(y - p.words.y) - STARS.block[1] * p.words.ry));
  const clear = smooth(STARS.clear[0] * p.u, STARS.clear[1] * p.u, far) * w.moon;
  if (!p.land) return clear * w.open;
  const lit = LAND.least + (1 - LAND.least) * (1 - smooth(LAND.glow[0], LAND.glow[1], w.glow));
  return clear * lit * smooth(LAND.clear[0] * p.u, LAND.clear[1] * p.u, over(p, p.land, x, y));
}

// The gas's dark lanes at a place of a sheet, as the gas's shader has them (DEEP_GAS_FS).
function lanes(x: number, y: number, seed: number, own: number, at: number): number {
  const F = GAS.fine, W = GAS.wide, L = GAS.lanes;
  const fx = (cloud(x, y, F.cell, F.octaves, F.gain, seed + 4) - 0.5) * F.far, fy = (cloud(x, y, F.cell, F.octaves, F.gain, seed + 5) - 0.5) * F.far;
  const wx = (cloud(x + fx, y + fy, W.cell, W.octaves, W.gain, seed + 2) - 0.5) * W.far, wy = (cloud(x + fx, y + fy, W.cell, W.octaves, W.gain, seed + 3) - 0.5) * W.far;
  return smooth(at, at + L.over, cloud(x + fx + L.wide * wx, y + fy + L.wide * wy, L.cell, L.octaves, L.gain, own));
}

// What the hidden sky is made of at a place: where it may be, how near the band or the cloud, the band's far stars
// too fine to be points, and the dark lanes that thin both.
export function deepField(p: SkyPlan, x: number, y: number): DeepField {
  const mask = allowed(p, x, y), B = GATHER.band, C = GATHER.cloud, X = x / p.u, Y = y / p.u;
  const f = bandFrame(p, x, y), a = f.a - B.a, b = f.b - B.b, top = smooth(0, B.top, Y);
  const band = Math.exp(-0.5 * ((a / B.along) ** 2 + (b / B.across) ** 2)) * top;
  const t = (C.turn * Math.PI) / 180, dx = X - C.x, dy = Y - C.y, cu = (dx * Math.cos(t) + dy * Math.sin(t)) / C.rx, cv = (-dx * Math.sin(t) + dy * Math.cos(t)) / C.ry;
  const low = Math.exp(-0.5 * (cu * cu + cv * cv));
  const e = Math.hypot((x - p.words.x) / p.words.rx, (y - p.words.y) / p.words.ry);
  const far = Math.exp(-0.5 * ((a / B.haze[0]) ** 2 + (b / B.haze[1]) ** 2)) * smooth(1, 1.65, e) * top * mask;
  const inBand = band > FAINT || far > FAINT ? lanes((f.a * p.band.rx) / (p.u * B.stretch), (f.b * p.band.ry) / p.u, GAS.band.seed, GAS.band.lanes, GAS.band.lane) : 0;
  const inLow = low > FAINT ? lanes(X, Y, GAS.low.seed, GAS.low.lanes, GAS.low.lane) : 0;
  const H = GAS.haze, haze = far * (H.least + H.more * cloud(X, Y, H.cell, H.octaves, H.gain, H.seed)) * (1 - H.lanes * inBand);
  return { mask, env: Math.min(1.5, band + 0.55 * low + 0.03), haze, lanes: clamp(inBand * Math.min(1, band * 2.5) + inLow * Math.min(1, low * 2.5), 0, 1) };
}

// Where the hidden sky may be, for the gas's shader: one value for each GAS.mask CSS pixels across and down, each
// the least of those round it so the gas never reaches past what the stars keep to.
export function deepMask(p: SkyPlan): { data: Uint8Array; cols: number; rows: number } {
  const M = GAS.mask, cols = Math.ceil(p.w / M) + 1, rows = Math.ceil(p.end / M) + 1, at = new Float32Array(cols * rows), data = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) at[j * cols + i] = allowed(p, Math.min(i * M, p.w), Math.min(j * M, p.end));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let least = 1;
      for (let b = Math.max(0, j - 1); b <= Math.min(rows - 1, j + 1); b++) for (let a = Math.max(0, i - 1); a <= Math.min(cols - 1, i + 1); a++) least = Math.min(least, at[b * cols + a]);
      data[j * cols + i] = Math.floor(least * 255);
    }
  }
  return { data, cols, rows };
}

// What the gas's shader is told of a plan: the frames it works in and which way each sheet is lit, in the sheet's
// own frame.
export function gasFrame(p: SkyPlan): { band: [number, number, number, number]; axis: [number, number]; light: [number, number, number, number] } {
  const t = (p.band.turn * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), rad = Math.PI / 180;
  const b = [Math.cos(GAS.band.light * rad), Math.sin(GAS.band.light * rad)], l = GAS.low.light * rad;
  return { band: [p.band.x, p.band.y, p.band.rx, p.band.ry], axis: [c, s], light: [(b[0] * c + b[1] * s) / GATHER.band.stretch, -b[0] * s + b[1] * c, Math.cos(l), Math.sin(l)] };
}
export const gasRamp = (): { at: number; tone: V3 }[] => GAS.ramp.map(([at, a, b, k, bright]) => ({ at, tone: scale3(mix3(shown(a), shown(b), k), bright * GAS.level) }));
export const GAS_HAZE: V3 = scale3(WARM, GAS.haze.level);

// One splat for each hidden star, laid out as the sky's own (SPLAT): where it is in device pixels, its light as a
// share of full brightness, its size, how much of a soft glow it sits in, and how early the reveal shows it.
export function deepStars(p: SkyPlan, s: number): { data: Float32Array; count: number } {
  const out: number[] = [], C = STARS.cell, mid = p.w / 2, H = STARS.halo;
  for (let i = Math.floor(-mid / C) - 1; i * C < mid; i++) {
    for (let j = 0; j * C < p.end; j++) {
      const cx = mid + (i + 0.5) * C, cy = (j + 0.5) * C, f = deepField(p, cx, cy);
      const thick = (0.3 + 1.3 * cloud(cx / p.u, cy / p.u, 310, 4, 0.55, 9) ** 1.6) * (0.6 + 3 * Math.min(f.env, 1.2) + 2.2 * f.haze) * (1 - 0.8 * f.lanes * Math.min(1, f.env * 3));
      const r = seeded(cellSeed(i, j, 31)), n = Math.floor(STARS.tries * C * C * Math.min(1, thick / STARS.keep) + r());
      for (let k = 0; k < n; k++) {
        const x = mid + (i + r()) * C, y = (j + r()) * C, keep = r(), rare = r(), g1 = gauss(r), g2 = gauss(r), kind = r(), size = r();
        const m = allowed(p, x, y);
        if (keep >= m) continue;
        const pk = Math.min(STARS.most, STARS.faint * Math.max(1e-6, rare) ** -STARS.slope) * (0.5 + 0.5 * m);
        const q = clamp((pk - 6) / 150, 0, 1) ** 0.45;
        const col = kind < STARS.copper ? COPPER : mix3(WARM, PALE, clamp(0.15 + 0.8 * q + 0.2 * g2, 0, 1));
        const two = 0.5 + 0.55 * q + 0.1 * size, e = (pk / 255) * 6.2831853 * two * two * (s / 2) ** 2;
        const halo = clamp((pk - H.from) / H.over, 0, 1) * H.most * (2 * H.sigma / two) ** 2;
        out.push(x * s, y * s, col[0] * e, col[1] * e, col[2] * e, Math.max(0.45, (two * s) / 2), halo, 1 - clamp(0.56 - 0.48 * q + 0.06 * g1, DEEP.first, DEEP.last));
      }
    }
  }
  return { data: new Float32Array(out), count: out.length / 8 };
}
export const DEEP_HALO = STARS.halo.sigma;

export interface Pool { x: number; y: number; s: number }
const NONE: Pool[] = [];

// The pointer over the sky, as the few numbers the reveal is drawn from: itself and the pools it has left behind,
// in CSS pixels of the host. Nothing is kept in a buffer.
export function follow(host: HTMLElement): { step(t: number, p: SkyPlan): Pool[]; pin(at: Pool | null): void; dispose(): void } {
  let at: { x: number; y: number } | null = null, spot: { x: number; y: number } | null = null, pinned: Pool | null = null;
  let presence = 0, rest = 0, last = -Infinity, dropped = -Infinity, trail: (Pool & { t: number })[] = [];
  const move = (e: PointerEvent) => { if (e.pointerType !== 'touch') at = { x: e.clientX, y: e.clientY }; };
  const leave = () => { at = null; };
  addEventListener('pointermove', move, { passive: true });
  document.documentElement.addEventListener('pointerleave', leave);
  return {
    step(t, p) {
      if (pinned) return [pinned];
      const dt = clamp(t - last, 0, 0.1);
      last = t;
      if (!at && presence < 0.003 && !trail.length) { presence = 0; return NONE; }
      let goal = 0, speed = 0;
      if (at) {
        const r = host.getBoundingClientRect(), here = { x: at.x - r.left, y: at.y - r.top };
        goal = p.land ? smooth(0, LAND.over * p.u, over(p, p.land, here.x, here.y)) : smooth(0.12, 0.45, weigh(p, here.x, here.y).open);
        if (spot && dt > 0) speed = Math.hypot(here.x - spot.x, here.y - spot.y) / dt;
        spot = here;
      }
      presence += (goal - presence) * (1 - Math.exp(-dt / DEEP.enter));
      rest += (1 - Math.min(1, speed / (DEEP.fast * p.u)) - rest) * (1 - Math.exp(-dt / DEEP.settle));
      trail = trail.filter((k) => t - k.t < DEEP.life);
      const depth = presence * (0.5 + 0.5 * rest), newest = trail[trail.length - 1];
      if (at && spot && depth > 0.02 && trail.length < DEEP.pools && (!newest || (t - dropped > DEEP.every && Math.hypot(spot.x - newest.x, spot.y - newest.y) > DEEP.apart * p.u))) {
        trail.push({ x: spot.x, y: spot.y, s: depth, t });
        dropped = t;
      }
      const out: Pool[] = trail.map((k) => ({ x: k.x, y: k.y, s: k.s * (1 - (t - k.t) / DEEP.life) ** 2 }));
      if (spot) out.push({ x: spot.x, y: spot.y, s: depth });
      const live = out.filter((k) => k.s > 0.003);
      return live.length ? live : NONE;
    },
    pin(to) { pinned = to; },
    dispose() {
      removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    },
  };
}
