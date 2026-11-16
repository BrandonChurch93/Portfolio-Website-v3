// The stone's grain, worked out from a seed when the world loads, so nothing of it is shipped: a tile GRAIN.period
// units square that repeats without a seam. Rounded grains packed together with a little cement sunk between them,
// pits, and a weathered unevenness a few units across. Red and green: the slope of that relief, as a normal. Blue:
// the tone of each grain. Alpha: how shut in a place is (between grains, in a pit).
//
//   const rgba = await grain(GRAIN.size, slice)   slice is awaited between rows, so no task of it holds the page
//
// Everything in it is the same in every direction, so the stone lays it from the three axes. It imports nothing, so
// scripts/world/parts/rock-material/ can draw it too.
export const GRAIN = { size: 512, period: 48, grain: 0.7, pits: 650 } as const;

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash2 = (i: number, j: number, s: number): number => {
  let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const wrap = (i: number, n: number): number => ((i % n) + n) % n;
const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

// Gradient noise that repeats every p cells each way, about -1 to 1, summed over octaves into out.
function fbm(n: number, cells: number, octaves: number, gain: number, seed: number): Float32Array {
  const out = new Float32Array(n * n);
  let amp = 1, c = cells, total = 0;
  for (let o = 0; o < octaves; o++) {
    const gx = new Float32Array(c * c), gy = new Float32Array(c * c);
    for (let j = 0; j < c; j++) for (let i = 0; i < c; i++) { const h = hash2(i, j, seed + o * 31) * Math.PI * 2; gx[j * c + i] = Math.cos(h); gy[j * c + i] = Math.sin(h); }
    for (let y = 0; y < n; y++) {
      const fy0 = (y / n) * c, j = Math.floor(fy0), fy = fy0 - j, v = fade(fy), j0 = wrap(j, c) * c, j1 = wrap(j + 1, c) * c;
      for (let x = 0; x < n; x++) {
        const fx0 = (x / n) * c, i = Math.floor(fx0), fx = fx0 - i, u = fade(fx), i0 = wrap(i, c), i1 = wrap(i + 1, c);
        const a = gx[j0 + i0] * fx + gy[j0 + i0] * fy, b = gx[j0 + i1] * (fx - 1) + gy[j0 + i1] * fy;
        const d = gx[j1 + i0] * fx + gy[j1 + i0] * (fy - 1), e = gx[j1 + i1] * (fx - 1) + gy[j1 + i1] * (fy - 1);
        out[y * n + x] += amp * 1.6 * ((a * (1 - u) + b * u) * (1 - v) + (d * (1 - u) + e * u) * v);
      }
    }
    total += amp; amp *= gain; c *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

// A box blur that wraps, r texels each side, run twice.
function blur(src: Float32Array, n: number, r: number): Float32Array {
  let a = src;
  for (let pass = 0; pass < 2; pass++) {
    const b = new Float32Array(n * n), c = new Float32Array(n * n);
    for (let y = 0; y < n; y++) { let s = 0; for (let k = -r; k <= r; k++) s += a[y * n + wrap(k, n)]; for (let x = 0; x < n; x++) { b[y * n + x] = s / (2 * r + 1); s += a[y * n + wrap(x + r + 1, n)] - a[y * n + wrap(x - r, n)]; } }
    for (let x = 0; x < n; x++) { let s = 0; for (let k = -r; k <= r; k++) s += b[wrap(k, n) * n + x]; for (let y = 0; y < n; y++) { c[y * n + x] = s / (2 * r + 1); s += b[wrap(y + r + 1, n) * n + x] - b[wrap(y - r, n) * n + x]; } }
    a = c;
  }
  return a;
}
const byte = (v: number): number => Math.round(Math.min(1, Math.max(0, v)) * 255);

export async function grain(n: number = GRAIN.size, pause: () => Promise<void> | void = () => {}): Promise<Uint8Array> {
  const { period } = GRAIN, unit = n / period, rnd = seeded(7);
  // The grains: one to a cell of a jittered grid, each a low rounded bump of its own height and tone.
  const cells = Math.round(period / GRAIN.grain), sx = new Float32Array(cells * cells), sy = new Float32Array(cells * cells), sh = new Float32Array(cells * cells), stn = new Float32Array(cells * cells);
  for (let k = 0; k < cells * cells; k++) { sx[k] = 0.15 + 0.7 * rnd(); sy[k] = 0.15 + 0.7 * rnd(); sh[k] = 0.5 + 0.5 * rnd(); stn[k] = rnd(); }
  const h = new Float32Array(n * n), tone = new Float32Array(n * n), gap = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    const v = (y / n) * cells, gj = Math.floor(v);
    for (let x = 0; x < n; x++) {
      const u = (x / n) * cells, gi = Math.floor(u);
      let d1 = Infinity, d2 = Infinity, own = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const k = wrap(gj + dj, cells) * cells + wrap(gi + di, cells), dx = u - (gi + di + sx[k]), dy = v - (gj + dj + sy[k]), d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; d1 = d; own = k; } else if (d < d2) d2 = d;
      }
      const i = y * n + x, r1 = Math.sqrt(d1);
      h[i] = 0.035 * sh[own] * (1 - Math.min(1, r1 / 0.75) ** 2);
      gap[i] = 1 - Math.min(1, (Math.sqrt(d2) - r1) / 0.08);
      tone[i] = stn[own];
    }
    if ((y & 31) === 31) await pause();
  }
  // Fine dust on the grains, and a weathered unevenness a few units across.
  const fine = fbm(n, Math.round(period * 1.4), 2, 0.55, 41);
  await pause();
  const worn = fbm(n, Math.round(period / 5), 4, 0.55, 23);
  await pause();
  const where = fbm(n, 6, 2, 0.5, 59);
  for (let i = 0; i < n * n; i++) h[i] += 0.03 * fine[i] + 0.22 * worn[i];
  await pause();
  // Pits: a fifth of a unit to a unit across, thick in some places and missing in others, each with a ragged rim.
  const pit = new Float32Array(n * n);
  for (let k = 0; k < GRAIN.pits; k++) {
    const x = rnd() * n, y = rnd() * n, w = where[Math.floor(y) * n + Math.floor(x)];
    const keep = rnd(), r = (0.15 + 0.4 * rnd() ** 2.5) * unit, deep = 0.3 * (r / unit) * (0.6 + 0.6 * rnd()), ph = rnd() * 9;
    if (keep > 0.2 + 1.6 * Math.max(0, w)) continue;
    for (let yy = Math.floor(y - r - 1); yy <= Math.ceil(y + r + 1); yy++) for (let xx = Math.floor(x - r - 1); xx <= Math.ceil(x + r + 1); xx++) {
      const dx = xx - x, dy = yy - y, a = Math.atan2(dy, dx), q = Math.hypot(dx, dy) / (r * (1 + 0.18 * Math.sin(3 * a + ph) + 0.1 * Math.sin(7 * a + 2 * ph)));
      if (q >= 1) continue;
      const i = wrap(yy, n) * n + wrap(xx, n), d = deep * (1 - q * q) ** 1.2;
      if (d > pit[i]) pit[i] = d;
    }
  }
  for (let i = 0; i < n * n; i++) h[i] -= pit[i] + 0.006 * gap[i];
  await pause();
  const out = new Uint8Array(n * n * 4), soft = blur(h, n, Math.max(1, Math.round(0.5 * unit))), step = period / n, STEEP = 2.2;
  await pause();
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      let hx = (h[y * n + wrap(x + 1, n)] - h[y * n + wrap(x - 1, n)]) / (2 * step), hy = (h[wrap(y + 1, n) * n + x] - h[wrap(y - 1, n) * n + x]) / (2 * step);
      const s = Math.hypot(hx, hy);
      if (s > STEEP) { hx *= STEEP / s; hy *= STEEP / s; }
      const l = Math.hypot(hx, hy, 1);
      out[i * 4] = Math.round((-hx / l * 0.5 + 0.5) * 255);
      out[i * 4 + 1] = Math.round((-hy / l * 0.5 + 0.5) * 255);
      out[i * 4 + 2] = byte(0.5 + 0.8 * (tone[i] - 0.5) + 0.25 * fine[i]);
      out[i * 4 + 3] = byte(1 - 3 * Math.max(0, soft[i] - h[i]) - 1.4 * pit[i] - 0.08 * gap[i]);
    }
    if ((y & 63) === 63) await pause();
  }
  return out;
}
