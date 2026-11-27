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
const STARS = {
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
const GATHER = {
  band: { a: 0.03, b: -0.95, along: 0.45, across: 0.96, haze: [0.62, 0.74], top: 46.6, stretch: 1.7 },
  cloud: { x: 119.6, y: 567.8, rx: 121.7, ry: 79.1, turn: 28 },
} as const;

const shown = (name: PaletteName): V3 => {
  const n = parseInt(palette[name].slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const PALE = shown('pale'), WARM = mix3(PALE, shown('hot'), 0.5), COPPER = scale3(shown('copper'), 1.09);
// The sky's light is added to the page's ground, so the sky itself may hold the limits less the ground.
export const DEEP_CAP: [number, number] = [DEEP.most - Math.max(...shown('bg')), DEEP.least - Math.min(...shown('bg'))];

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
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

// Where the hidden sky may be at all: never behind his words' block or on the moon, thinner toward the world's glow.
function allowed(p: SkyPlan, x: number, y: number): number {
  const w = weigh(p, x, y);
  const far = Math.hypot(Math.max(0, Math.abs(x - p.words.x) - STARS.block[0] * p.words.rx), Math.max(0, Math.abs(y - p.words.y) - STARS.block[1] * p.words.ry));
  return smooth(STARS.clear[0] * p.u, STARS.clear[1] * p.u, far) * w.moon * w.open;
}

// What the hidden sky is made of at a place: where it may be, how near the band or the cloud, the band's far stars
// too fine to be points, and the dark lanes that thin both.
export function deepField(p: SkyPlan, x: number, y: number): DeepField {
  const mask = allowed(p, x, y), B = GATHER.band, C = GATHER.cloud, X = x / p.u, Y = y / p.u;
  const f = bandFrame(p, x, y), a = f.a - B.a, b = f.b - B.b, top = smooth(0, B.top, Y);
  const band = Math.exp(-0.5 * ((a / B.along) ** 2 + (b / B.across) ** 2)) * top;
  const t = (C.turn * Math.PI) / 180, dx = X - C.x, dy = Y - C.y, cu = (dx * Math.cos(t) + dy * Math.sin(t)) / C.rx, cv = (-dx * Math.sin(t) + dy * Math.cos(t)) / C.ry;
  const low = Math.exp(-0.5 * (cu * cu + cv * cv));
  const bx = (f.a * p.band.rx) / (p.u * B.stretch), by = (f.b * p.band.ry) / p.u;
  const wx = (cloud(X, Y, 380, 3, 0.55, 2) - 0.5) * 240, wy = (cloud(X, Y, 380, 3, 0.55, 3) - 0.5) * 240;
  const inBand = smooth(0.46, 0.66, cloud(bx + wx, by + wy, 280, 5, 0.62, 7)), inLow = smooth(0.5, 0.7, cloud(X + wx, Y + wy, 280, 5, 0.62, 5));
  const e = Math.hypot((x - p.words.x) / p.words.rx, (y - p.words.y) / p.words.ry);
  const haze = Math.exp(-0.5 * ((a / B.haze[0]) ** 2 + (b / B.haze[1]) ** 2)) * (0.3 + 0.95 * cloud(X, Y, 260, 5, 0.6, 11)) * (1 - 0.85 * inBand) * smooth(1, 1.65, e) * top * mask;
  return { mask, env: Math.min(1.5, band + 0.55 * low + 0.03), haze, lanes: clamp(inBand * Math.min(1, band * 2.5) + inLow * Math.min(1, low * 2.5), 0, 1) };
}

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
        goal = smooth(0.12, 0.45, weigh(p, here.x, here.y).open);
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
