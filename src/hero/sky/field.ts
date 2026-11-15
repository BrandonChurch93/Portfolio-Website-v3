import { palette, type PaletteName } from '../../config/palette';
import { seeded } from '../../world/build';
import type { SkyPlan } from './index';

// Everything in the sky that is placed rather than worked out per pixel: the stars, the bright few with four
// points, the meteors and the craters of the moons. All of it seeded, so it is the same sky on every visit.

export type V3 = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export function linear(name: PaletteName): V3 {
  const n = parseInt(palette[name].slice(1), 16);
  return [toLinear(((n >> 16) & 255) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)];
}
const unit = (c: V3): V3 => {
  const m = Math.max(c[0], c[1], c[2]);
  return [c[0] / m, c[1] / m, c[2] / m];
};
export const mix3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const scale3 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];

// The palette's light as hues, each at full strength in its brightest channel, in linear light.
export const TINT = {
  text: unit(linear('text')),
  pale: unit(linear('pale')),
  hot: unit(linear('hot')),
  flame: unit(linear('flame')),
  ember: unit(linear('ember')),
  copper: unit(linear('copper')),
  bronze: unit(linear('bronze')),
} as const;

// The field of fine stars: how many are tried per CSS pixel, the faintest, how fast they grow rarer as they
// brighten (a real sky's counts), and where the brightest are rounded off.
export const FIELD = { cell: 128, density: 0.026, faint: 0.0019, slope: 1.12, most: 420, sigma: 0.24, haloFrom: 22 } as const;
// The stars the band is resolved into, besides its own grain.
export const BAND_STARS = { tries: 70000, faint: 0.0013, slope: 1.15, most: 140 } as const;
// The bright few with four points.
export const SPARKS = { count: 10, big: 3, apart: 135, flux: [5, 10], bigFlux: [16, 24], len: [9, 14], bigLen: [22, 30] } as const;
// A meteor now and then: the first after so many seconds, then one every so many.
export const METEORS = { count: 240, first: 7, every: [20, 40], dur: [0.38, 0.7], len: [120, 250], after: 0.32 } as const;

const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

export const moonReach = (p: SkyPlan) => (p.moon.with === 'ring' ? 2.45 : p.moon.with === 'moon' ? 2.45 : 1.3);
// Where the small second moon stands from the first, in the first one's radii, and its size.
export const SECOND = { dx: 1.55, dy: 1.3, r: 0.25 } as const;

// How thick the sky is at a place: none behind the words, thinning toward them, fewer toward the city's glow and
// none below where the sky ends. limit is how much brighter than the faintest a star has to be to show there.
export function weigh(p: SkyPlan, x: number, y: number): { dens: number; limit: number; dim: number } {
  if (y < 0 || y > p.end || x < 0 || x > p.w) return { dens: 0, limit: Infinity, dim: 0 };
  const e = Math.hypot((x - p.words.x) / p.words.rx, (y - p.words.y) / p.words.ry);
  const clear = smooth(1, 1.38, e);
  const gd = Math.hypot((x - p.glow.x) / p.glow.rx, (y - p.glow.y) / p.glow.ry);
  const g = Math.max(0, 1 - gd);
  const foot = smooth(p.end, p.end - 0.12 * p.h, y);
  const m = Math.hypot(x - p.moon.x, y - p.moon.y) / (p.moon.r * moonReach(p));
  const moon = smooth(1, 1.12, m);
  return { dens: clear * foot * moon * (1 - g) ** 2, limit: 1 + 9 * g * g, dim: 1 - 0.55 * g };
}

const power = (r: () => number, faint: number, slope: number, most: number) => {
  const f = faint * Math.max(1e-6, r()) ** (-1 / slope), m = most * faint;
  return m * (1 - Math.exp(-f / m));
};

function tint(r: () => number): V3 {
  const k = r();
  if (k < 0.3) return mix3(TINT.text, TINT.pale, r() * 0.6);
  if (k < 0.72) return mix3(TINT.pale, TINT.hot, r() * 0.3);
  if (k < 0.9) return mix3(TINT.pale, TINT.hot, 0.3 + r() * 0.7);
  return mix3(TINT.hot, TINT.flame, 0.2 + r() * 0.7);
}

// Smooth value noise, 0 to 1, for how the field clumps across the sky.
const lattice = (i: number, j: number) => {
  let h = cellSeed(i, j, 7);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
function clump(x: number, y: number): number {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = lattice(i, j), b = lattice(i + 1, j), c = lattice(i, j + 1), d = lattice(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const cellSeed = (i: number, j: number, k: number) => (Math.imul(i + 4099, 73856093) ^ Math.imul(j + 7919, 19349663) ^ Math.imul(k, 83492791)) >>> 0;

// The band in its own frame: across its length in rx, across it in ry.
export function bandFrame(p: SkyPlan, x: number, y: number): { a: number; b: number } {
  const t = (p.band.turn * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), dx = x - p.band.x, dy = y - p.band.y;
  return { a: (dx * c + dy * s) / p.band.rx, b: (-dx * s + dy * c) / p.band.ry };
}
const bandBody = (a: number, b: number) =>
  Math.exp(-1.5 * b * b) * smooth(1.85, 0.95, Math.abs(a)) + 0.8 * Math.exp(-(((a - 0.05) / 0.3) ** 2) - (b / 1.5) ** 2);

// One splat for each star: where it is in device pixels, its light, and its shape.
export const SPLAT = 8;
export function stars(p: SkyPlan, s: number): { data: Float32Array; count: number; counts: { faint: number; clear: number; bright: number } } {
  const out: number[] = [];
  const counts = { faint: 0, clear: 0, bright: 0 };
  const push = (x: number, y: number, f: number, col: V3) => {
    const k = f / FIELD.faint, e = f * s * s, sig = Math.max(0.45, FIELD.sigma * s) * (1 + 0.1 * Math.log10(Math.max(1, k)));
    const lit = Math.log10(Math.max(1, k / FIELD.haloFrom));
    const halo = k > FIELD.haloFrom ? 0.05 + 0.07 * Math.min(1, lit) : 0;
    out.push(x * s, y * s, col[0] * e, col[1] * e, col[2] * e, sig, halo, halo ? (3 + 6 * lit) * s : 0);
    if (k < 8) counts.faint++;
    else if (k < 60) counts.clear++;
    else counts.bright++;
  };
  const C = FIELD.cell, mid = p.w / 2;
  for (let i = Math.floor(-mid / C) - 1; i * C < mid; i++) {
    for (let j = 0; j * C < p.end; j++) {
      const r = seeded(cellSeed(i, j, 1)), n = Math.round(FIELD.density * C * C * (0.85 + 0.3 * r()));
      for (let k = 0; k < n; k++) {
        const x = mid + (i + r()) * C, y = (j + r()) * C, f = power(r, FIELD.faint, FIELD.slope, FIELD.most), keep = r(), col = tint(r);
        const w = weigh(p, x, y), bf = bandFrame(p, x, y);
        const thick = (0.45 + 1.1 * clump(x / 210, y / 210) * clump(x / 90 + 40, y / 90)) * (0.75 + 0.9 * Math.exp(-((bf.b / 4.5) ** 2)));
        if (keep * 1.6 > w.dens * thick || f < FIELD.faint * w.limit) continue;
        push(x, y, f * w.dim, col);
      }
    }
  }
  const r = seeded(2024);
  for (let i = 0; i < BAND_STARS.tries; i++) {
    const a = -1.9 + 3.8 * r(), b = -3 + 6 * r(), t = (p.band.turn * Math.PI) / 180;
    const x = p.band.x + a * p.band.rx * Math.cos(t) - b * p.band.ry * Math.sin(t);
    const y = p.band.y + a * p.band.rx * Math.sin(t) + b * p.band.ry * Math.cos(t);
    const f = power(r, BAND_STARS.faint, BAND_STARS.slope, BAND_STARS.most), keep = r(), col = tint(r);
    if (keep * 1.8 > bandBody(a, b) * weigh(p, x, y).dens) continue;
    push(x, y, f, col);
  }
  return { data: new Float32Array(out), count: out.length / SPLAT, counts };
}

// The bright few: placed on the board, so they keep their places from one screen to the next.
export const SPARK = 12;
export function sparks(p: SkyPlan, s: number): { data: Float32Array; count: number; at: { x: number; y: number; big: boolean }[] } {
  const r = seeded(9157), out: number[] = [], at: { x: number; y: number; big: boolean }[] = [];
  for (let i = 0; i < 6000 && at.length < SPARKS.count; i++) {
    const x = r() * p.w, y = r() * Math.min(p.end * 0.9, p.glow.y);
    if (x < 24 * p.u || x > p.w - 24 * p.u || y < 22 * p.u) continue;
    if (weigh(p, x, y).dens < 0.7) continue;
    const bf = bandFrame(p, x, y);
    if (Math.abs(bf.a) < 1.7 && Math.abs(bf.b) < 1.8) continue;
    if (at.some((q) => Math.hypot(q.x - x, q.y - y) < SPARKS.apart * p.u)) continue;
    at.push({ x, y, big: at.length < SPARKS.big });
  }
  for (const q of at) {
    const fl = q.big ? SPARKS.bigFlux : SPARKS.flux, ln = q.big ? SPARKS.bigLen : SPARKS.len;
    const f = fl[0] + (fl[1] - fl[0]) * r(), len = (ln[0] + (ln[1] - ln[0]) * r()) * p.u * s;
    const col = r() < 0.7 ? mix3(TINT.pale, TINT.text, r() * 0.5) : mix3(TINT.pale, TINT.hot, 0.2 + r() * 0.4);
    out.push(q.x * s, q.y * s, col[0], col[1], col[2], f * s * s, len, 0.13 + 0.12 * r(), 0.29 + 0.2 * r(), r() * 6.283, r() * 6.283, 0);
  }
  return { data: new Float32Array(out), count: at.length, at };
}

export interface Meteor { at: number; dur: number; x0: number; y0: number; x1: number; y1: number; bright: number }

// When and where each meteor crosses, worked out from the plan alone. Never across the words, never over the moon,
// and only where the sky is thick.
export function meteors(p: SkyPlan, avoid: { x: number; y: number }[]): Meteor[] {
  const r = seeded(31337), out: Meteor[] = [];
  let t: number = METEORS.first;
  const ok = (x: number, y: number) => {
    const w = weigh(p, x, y), e = Math.hypot((x - p.words.x) / p.words.rx, (y - p.words.y) / p.words.ry);
    return w.dens > 0.35 && e > 1.3 && y < Math.min(p.end * 0.75, p.words.y + p.words.ry) && avoid.every((q) => Math.hypot(q.x - x, q.y - y) > 40 * p.u);
  };
  for (let i = 0; i < METEORS.count; i++) {
    let made: Meteor | null = null;
    for (let tries = 0; tries < 200 && !made; tries++) {
      const x0 = r() * p.w, y0 = r() * Math.min(p.end * 0.6, p.words.y + p.words.ry);
      if (!ok(x0, y0)) continue;
      const ang = (0.12 + 0.76 * r()) * Math.PI, len = (METEORS.len[0] + (METEORS.len[1] - METEORS.len[0]) * r()) * p.u;
      const dir = x0 < p.w / 2 ? 1 : -1, dx = Math.cos(ang) * len * (r() < 0.75 ? -dir : dir), dy = Math.sin(ang) * len;
      let good = true;
      for (let k = 0; k <= 12 && good; k++) good = ok(x0 + (dx * k) / 12, y0 + (dy * k) / 12);
      if (good) made = { at: t, dur: METEORS.dur[0] + (METEORS.dur[1] - METEORS.dur[0]) * r(), x0, y0, x1: x0 + dx, y1: y0 + dy, bright: 0.6 + 0.4 * r() };
    }
    if (made) out.push(made);
    t += METEORS.every[0] + (METEORS.every[1] - METEORS.every[0]) * r();
  }
  return out;
}

// Where a meteor is at a time: its tail and head as shares of its path, how bright it is, and how bright its head.
export function meteorAt(m: Meteor, t: number): { tail: number; head: number; light: number; spark: number } | null {
  const x = (t - m.at) / m.dur;
  if (x < 0 || x > 1 + METEORS.after / m.dur) return null;
  const head = Math.min(1, 1 - (1 - Math.min(1, x)) ** 1.15);
  const trail = 0.42;
  if (x <= 1) {
    const light = smooth(0, 0.12, x) * (0.7 + 0.55 * Math.exp(-(((x - 0.74) / 0.11) ** 2)));
    return { tail: Math.max(0, head - trail), head, light, spark: light };
  }
  const k = (x - 1) / (METEORS.after / m.dur);
  return { tail: Math.max(0, 1 - trail) + trail * k, head: 1, light: 0.62 * (1 - k) ** 2, spark: 0 };
}

// The moons' craters, two texels each: where on the sphere, how wide, how deep, and what kind.
// Kinds: 0 old, 1 young with rays, 2 a basin with rings.
export const CRATER = 8;
export function craters(seed: number, count: number, big: { at: [number, number]; r: number; kind: number; peak: number }[]): Float32Array {
  const r = seeded(seed), out: number[] = [];
  for (const b of big) {
    const z = Math.sqrt(Math.max(0, 1 - b.at[0] ** 2 - b.at[1] ** 2));
    out.push(b.at[0], b.at[1], z, b.r, b.kind === 2 ? 0.1 : 0.17, b.kind, b.peak, r());
  }
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, z = -1;
    while (z < -0.12) {
      const u = 2 * r() - 1, a = 6.2831853 * r(), q = Math.sqrt(1 - u * u);
      x = q * Math.cos(a); y = q * Math.sin(a); z = u;
    }
    const rad = Math.min(0.15, 0.035 * Math.max(1e-4, r()) ** -0.5);
    const young = rad > 0.04 && rad < 0.08 && r() < 0.18 ? 1 : 0;
    const depth = rad > 0.08 ? 0.11 : rad > 0.04 ? 0.15 : 0.2;
    out.push(x, y, z, rad, depth * (0.8 + 0.4 * r()), young, rad > 0.035 ? 0.25 + 0.3 * r() : 0, r());
  }
  return new Float32Array(out);
}
