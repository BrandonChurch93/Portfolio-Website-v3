// Writes the map the rock's stone is drawn with (src/pieces/world/parts/rock/stone.ts), a tile that repeats without
// a seam, made in code:
//
//   public/world/rockmat-grain.png   GRAIN.period units square: the sandstone's own grain, read close. Rounded grains
//                                    packed together with a little cement sunk between them, pits, and a weathered
//                                    unevenness a few units across. Red and green: the slope of that relief, as a
//                                    normal. Blue: the tone of each grain. Alpha: how shut in a place is (between
//                                    grains, in a pit).
//
//   node scripts/world/parts/rock-material/make.mjs           the shipped map
//   node scripts/world/parts/rock-material/make.mjs --draft   a quarter of the size, fast (overwrites the shipped one)
//
// Everything in it is the same in every direction, so the page lays it from the three axes and no direction is ever
// seen in it. What has a direction in the stone (the beds, the strata, the strokes along them and the cracks) is
// worked out in the page in three dimensions, so it can never be stretched across a face. Nothing here is random:
// every number comes from a seeded generator.
import process from 'node:process';
import { png } from '../../lib/png.mjs';

const draft = process.argv.includes('--draft');
export const GRAIN = { size: draft ? 256 : 1024, period: 48, grain: 0.46, pits: 650 };
const t0 = performance.now(), said = (s) => console.log(`${((performance.now() - t0) / 1000).toFixed(1)} s · ${s}`);

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash2 = (i, j, s) => {
  let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const wrap = (i, n) => ((i % n) + n) % n;
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
// Gradient noise that repeats every p cells each way, about -1 to 1.
function gnoise(x, y, p, s) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const g = (a, b, dx, dy) => { const h = hash2(wrap(a, p), wrap(b, p), s) * Math.PI * 2; return Math.cos(h) * dx + Math.sin(h) * dy; };
  const u = fade(fx), v = fade(fy);
  return 1.6 * ((g(i, j, fx, fy) * (1 - u) + g(i + 1, j, fx - 1, fy) * u) * (1 - v) + (g(i, j + 1, fx, fy - 1) * (1 - u) + g(i + 1, j + 1, fx - 1, fy - 1) * u) * v);
}
function fbm(n, cells, octaves, gain, seed) {
  const out = new Float32Array(n * n);
  let amp = 1, c = cells, total = 0;
  for (let o = 0; o < octaves; o++) {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out[y * n + x] += amp * gnoise((x / n) * c, (y / n) * c, c, seed + o * 31);
    total += amp; amp *= gain; c *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}
// A box blur that wraps, r texels each side, run twice.
function blur(src, n, r) {
  let a = src;
  for (let pass = 0; pass < 2; pass++) {
    const b = new Float32Array(n * n), c = new Float32Array(n * n);
    for (let y = 0; y < n; y++) { let s = 0; for (let k = -r; k <= r; k++) s += a[y * n + wrap(k, n)]; for (let x = 0; x < n; x++) { b[y * n + x] = s / (2 * r + 1); s += a[y * n + wrap(x + r + 1, n)] - a[y * n + wrap(x - r, n)]; } }
    for (let x = 0; x < n; x++) { let s = 0; for (let k = -r; k <= r; k++) s += b[wrap(k, n) * n + x]; for (let y = 0; y < n; y++) { c[y * n + x] = s / (2 * r + 1); s += b[wrap(y + r + 1, n) * n + x] - b[wrap(y - r, n) * n + x]; } }
    a = c;
  }
  return a;
}
const byte = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255);

function grain() {
  const { size: n, period } = GRAIN, unit = n / period, rnd = seeded(7);
  // The grains: one to a cell of a jittered grid, each a low rounded bump of its own height and tone, the cement
  // sunk a little between them.
  const cells = Math.round(period / GRAIN.grain), at = [];
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) at.push({ x: (i + 0.15 + 0.7 * rnd()) / cells, y: (j + 0.15 + 0.7 * rnd()) / cells, h: 0.5 + 0.5 * rnd(), t: rnd() });
  const h = new Float32Array(n * n), tone = new Float32Array(n * n), gap = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n, v = y / n, gi = Math.floor(u * cells), gj = Math.floor(v * cells);
    let d1 = Infinity, d2 = Infinity, own = null;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ci = gi + di, cj = gj + dj, s = at[wrap(cj, cells) * cells + wrap(ci, cells)];
      const dx = (u - (s.x + Math.floor(ci / cells))) * cells, dy = (v - (s.y + Math.floor(cj / cells))) * cells, d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; own = s; } else if (d < d2) d2 = d;
    }
    const edge = Math.sqrt(d2) - Math.sqrt(d1), i = y * n + x;
    h[i] = 0.035 * own.h * (1 - Math.min(1, Math.sqrt(d1) / 0.75) ** 2);
    gap[i] = 1 - Math.min(1, edge / 0.08);
    tone[i] = own.t;
  }
  said('grain: grains');
  // Fine dust on the grains, and a weathered unevenness a few units across.
  const fine = fbm(n, Math.round(period * 1.4), 3, 0.55, 41), worn = fbm(n, Math.round(period / 5), 4, 0.55, 23), where = fbm(n, 6, 3, 0.5, 59);
  for (let i = 0; i < n * n; i++) h[i] += 0.03 * fine[i] + 0.22 * worn[i];
  // Pits: a fifth of a unit to a unit across, thick in some places and missing in others, each with a ragged rim.
  const pit = new Float32Array(n * n), pits = draft ? 120 : GRAIN.pits;
  for (let k = 0; k < pits; k++) {
    const x = rnd() * n, y = rnd() * n, w = where[Math.floor(y) * n + Math.floor(x)];
    if (rnd() > 0.2 + 1.6 * Math.max(0, w)) continue;
    const r = (0.15 + 0.4 * rnd() ** 2.5) * unit, deep = 0.3 * (r / unit) * (0.6 + 0.6 * rnd()), ph = rnd() * 9;
    for (let yy = Math.floor(y - r - 1); yy <= Math.ceil(y + r + 1); yy++) for (let xx = Math.floor(x - r - 1); xx <= Math.ceil(x + r + 1); xx++) {
      const dx = xx - x, dy = yy - y, a = Math.atan2(dy, dx), q = Math.hypot(dx, dy) / (r * (1 + 0.18 * Math.sin(3 * a + ph) + 0.1 * Math.sin(7 * a + 2 * ph)));
      if (q >= 1) continue;
      const i = wrap(yy, n) * n + wrap(xx, n), d = deep * (1 - q * q) ** 1.2;
      if (d > pit[i]) pit[i] = d;
    }
  }
  for (let i = 0; i < n * n; i++) h[i] -= pit[i] + 0.006 * gap[i];
  said('grain: pits');
  const out = new Uint8Array(n * n * 4), soft = blur(h, n, Math.max(1, Math.round(0.5 * unit))), step = period / n, STEEP = 2.2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x;
    let hx = (h[y * n + wrap(x + 1, n)] - h[y * n + wrap(x - 1, n)]) / (2 * step), hy = (h[wrap(y + 1, n) * n + x] - h[wrap(y - 1, n) * n + x]) / (2 * step);
    const s = Math.hypot(hx, hy);
    if (s > STEEP) { hx *= STEEP / s; hy *= STEEP / s; }
    const l = Math.hypot(hx, hy, 1);
    out[i * 4] = Math.round((-hx / l * 0.5 + 0.5) * 255);
    out[i * 4 + 1] = Math.round((-hy / l * 0.5 + 0.5) * 255);
    out[i * 4 + 2] = byte(0.5 + 0.55 * (tone[i] - 0.5) + 0.25 * fine[i]);
    out[i * 4 + 3] = byte(1 - 3 * Math.max(0, soft[i] - h[i]) - 1.4 * pit[i] - 0.08 * gap[i]);
  }
  png('public/world/rockmat-grain.png', n, n, out, 4);
}

grain();
said('done');
