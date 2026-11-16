// Writes the maps the rock's stone is drawn with (src/pieces/world/parts/rock/), each a tile that repeats without a
// seam, made in code:
//
//   public/world/rockmat-grain.png   GRAIN.period units square: the stone's own grain, the sheared face's soft
//                                    ripples and its fine pits. Red and green: the slope of that relief, as a normal.
//                                    Blue: its height. Alpha: how shut in each place is (pits and hollows dark).
//   public/world/rockmat-marks.png   MARKS.period units square: gouges in clusters along the beds, chips, and
//                                    hairline cracks that run straight and turn sharply. Red and green: the slope, as
//                                    a normal. Blue: how deep a mark is (dark in it). Alpha: fresh stone at a lip.
//
//   node scripts/world/parts/rock-material/make.mjs           the shipped maps
//   node scripts/world/parts/rock-material/make.mjs --draft   a quarter of the size, fast
//
// The u axis of both maps is the way the beds run: the page lays it along the beds on every face, so the gouges lie
// along them. Nothing here is random: every number comes from a seeded generator.
import process from 'node:process';
import { png } from '../../lib/png.mjs';

const draft = process.argv.includes('--draft');
export const GRAIN = { size: draft ? 256 : 1024, period: 96 };
export const MARKS = { size: draft ? 256 : 1024, period: 192 };
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
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
// Gradient noise that repeats every pu cells across and pv cells down, -1 to 1 or so.
function gnoise(x, y, pu, pv, s) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const g = (a, b, dx, dy) => { const h = hash2(((a % pu) + pu) % pu, ((b % pv) + pv) % pv, s) * Math.PI * 2; return Math.cos(h) * dx + Math.sin(h) * dy; };
  const u = fade(fx), v = fade(fy);
  const a = g(i, j, fx, fy), b = g(i + 1, j, fx - 1, fy), c = g(i, j + 1, fx, fy - 1), d = g(i + 1, j + 1, fx - 1, fy - 1);
  return 1.6 * ((a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v);
}
// Octaves of it over a tile of n texels: base cells across, stretched along u by stretch.
function fbm(n, base, octaves, gain, stretch, seed) {
  const out = new Float32Array(n * n);
  let amp = 1, cu = base, total = 0;
  for (let o = 0; o < octaves; o++) {
    const pu = Math.max(1, Math.round(cu / stretch)), pv = cu;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out[y * n + x] += amp * gnoise((x / n) * pu, (y / n) * pv, pu, pv, seed + o * 31);
    total += amp;
    amp *= gain;
    cu *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}
const wrap = (i, n) => ((i % n) + n) % n;
// A box blur that wraps, r texels each side, run twice: a soft blur for what is a hollow and what stands proud.
function blur(src, n, r) {
  let a = src, b = new Float32Array(n * n);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < n; y++) { let s = 0; for (let k = -r; k <= r; k++) s += a[y * n + wrap(k, n)]; for (let x = 0; x < n; x++) { b[y * n + x] = s / (2 * r + 1); s += a[y * n + wrap(x + r + 1, n)] - a[y * n + wrap(x - r, n)]; } }
    const c = new Float32Array(n * n);
    for (let x = 0; x < n; x++) { let s = 0; for (let k = -r; k <= r; k++) s += b[wrap(k, n) * n + x]; for (let y = 0; y < n; y++) { c[y * n + x] = s / (2 * r + 1); s += b[wrap(y + r + 1, n) * n + x] - b[wrap(y - r, n) * n + x]; } }
    a = c;
  }
  return a;
}
// Visits every texel within a box of the tile, wrapping, with its place relative to the box's middle in texels.
function around(n, cx, cy, rx, ry, fn) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) fn(wrap(x, n) + wrap(y, n) * n, x - cx, y - cy);
}
// The slope of a height in units over a tile of `period` units, as a normal's red and green. A step in the height
// is a slope of at most STEEP, so a step reads as a crisp edge and not as a hole.
const STEEP = 2.5;
function slopes(h, n, period, out, scale = 1) {
  const step = period / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let hx = (h[y * n + wrap(x + 1, n)] - h[y * n + wrap(x - 1, n)]) / (2 * step) * scale, hy = (h[wrap(y + 1, n) * n + x] - h[wrap(y - 1, n) * n + x]) / (2 * step) * scale;
    const s = Math.hypot(hx, hy);
    if (s > STEEP) { hx *= STEEP / s; hy *= STEEP / s; }
    const l = Math.hypot(hx, hy, 1), i = (y * n + x) * 4;
    out[i] = Math.round((-hx / l * 0.5 + 0.5) * 255);
    out[i + 1] = Math.round((-hy / l * 0.5 + 0.5) * 255);
  }
}
const byte = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255);

// Conchoidal breaks: the face as shallow scoops, each where a flake came away, meeting along sharp ridges. Each scoop
// is about `cell` units across, `long` times longer along the beds, and up to `deep` units deep.
function scallops(n, period, cell, long, deep, seed) {
  const rnd = seeded(seed), sv = Math.max(2, Math.round(period / cell)), su = Math.max(1, Math.round(sv / long)), sites = [];
  for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++) sites.push({ x: (i + 0.05 + 0.9 * rnd()) / su, y: (j + 0.05 + 0.9 * rnd()) / sv, a: deep * 0.6 * rnd(), k: deep * (0.6 + 0.8 * rnd()) });
  const h = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = x / n, v = y / n, gi = Math.floor(u * su), gj = Math.floor(v * sv);
    let best = Infinity;
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const s = sites[wrap(gj + dj, sv) * su + wrap(gi + di, su)], dx = (u - s.x - Math.floor((gi + di) / su)) * su, dy = (v - s.y - Math.floor((gj + dj) / sv)) * sv;
      best = Math.min(best, s.a + s.k * (dx * dx + dy * dy));
    }
    h[y * n + x] = best;
  }
  return h;
}

// Broken stone: ledges where the face steps up along a break that runs straight and turns sharply, the step
// standing on one side of the break and sloping back into the face within `back` units. count ledges of runs
// so many units long, steps so high, across the tile: their outlines are open, never closed shapes.
function ledges(n, period, count, runs, long, rise, back, spread, seed) {
  const rnd = seeded(seed), unit = n / period, h = new Float32Array(n * n), soft = 0.8;
  for (let c = 0; c < count; c++) {
    let x = rnd() * n, y = rnd() * n, angle = (rnd() - 0.5) * spread + (rnd() < 0.5 ? 0 : Math.PI);
    const step = rise[0] + (rise[1] - rise[0]) * rnd() ** 2, fall = (back[0] + (back[1] - back[0]) * rnd()) * unit, own = new Map();
    const R = runs[0] + Math.floor(rnd() * (runs[1] - runs[0] + 1));
    for (let r = 0; r < R; r++) {
      const len = (long[0] + (long[1] - long[0]) * rnd()) * unit, ex = Math.cos(angle) * len, ey = Math.sin(angle) * len;
      const nx = -Math.sin(angle), ny = Math.cos(angle), first = r === 0, last = r === R - 1;
      around(n, x + ex / 2 + nx * fall, y + ey / 2 + ny * fall, Math.abs(ex) / 2 + fall + 3, Math.abs(ey) / 2 + fall + 3, (i, px, py) => {
        const qx = px + ex / 2 + nx * fall, qy = py + ey / 2 + ny * fall, t = (qx * ex + qy * ey) / (len * len), d = qx * nx + qy * ny;
        if (t < -0.15 || t > 1.15 || d < -2) return;
        // The step dies away at the ledge's two ends, and runs on round its turns.
        const end = Math.min(first ? Math.min(1, t * len / (3 * unit)) : 1, last ? Math.min(1, (1 - t) * len / (3 * unit)) : 1);
        const k = Math.max(0, Math.min(1, t < 0 ? 1 + t / 0.15 : t > 1 ? 1 - (t - 1) / 0.15 : 1)) * Math.max(0, end);
        const edge = Math.min(1, Math.max(0, (d + soft) / (2 * soft))), v = step * k * edge * edge * (3 - 2 * edge) * Math.exp(-Math.max(0, d) / fall) * Math.max(0, 1 - Math.max(0, d) / (2 * fall)) ** 2;
        if (v > (own.get(i) ?? 0)) own.set(i, v);
      });
      x += ex; y += ey;
      angle += (rnd() < 0.5 ? 1 : -1) * (0.5 + 0.9 * rnd());
    }
    for (const [i, v] of own) h[i] += v;
  }
  return h;
}

// ---------------------------------------------------------------------------------------------------------------
// The grain: what a clean sheared face carries, read close.
function grain() {
  const { size: n, period } = GRAIN, unit = n / period, rnd = seeded(7);
  // The sheared face's soft ripples, a few units across and longer along the beds, as broken stone is.
  const ripple = fbm(n, 6, 4, 0.5, 2.2, 11), ridge = fbm(n, 10, 3, 0.55, 1.6, 23);
  // The stone's own grain, down to a fifth of a unit.
  const fine = fbm(n, 48, 4, 0.62, 1.3, 41);
  // Rough breaks a few units across, sharp along their ridges.
  const rough = fbm(n, 24, 3, 0.55, 1.5, 31);
  const where = fbm(n, 4, 3, 0.5, 1, 59);
  const h = new Float32Array(n * n), pit = new Float32Array(n * n);
  const flake = { h: ledges(n, period, draft ? 10 : 110, [1, 3], [2, 7], [0.04, 0.12], [1, 2.6], 1.0, 5) };
  const scoopA = scallops(n, period, 2.2, 1.6, 0.22, 17), scoopB = scallops(n, period, 7, 2, 1.3, 19);
  for (let i = 0; i < n * n; i++) h[i] = 0.3 * ripple[i] + 0.1 * (1 - Math.abs(ridge[i])) + 0.12 * (1 - Math.abs(rough[i])) ** 2 + scoopA[i] + scoopB[i] + 0.05 * fine[i] + flake.h[i];
  // Fine pits, thick in some places and missing in others, a fifth of a unit to most of one across.
  const pits = draft ? 200 : 2600;
  for (let k = 0; k < pits; k++) {
    const x = rnd() * n, y = rnd() * n, w = where[Math.floor(y) * n + Math.floor(x)];
    if (rnd() > 0.25 + 1.4 * Math.max(0, w)) continue;
    const r = (0.12 + 0.4 * rnd() ** 2.2) * unit, deep = 0.3 * (r / unit) * (0.6 + 0.6 * rnd()), k = rnd() * 9, sx = 1 + 0.6 * rnd();
    around(n, x, y, 1.6 * r + 1, r + 1, (i, dx, dy) => {
      const a = Math.atan2(dy, dx), q = Math.hypot(dx / sx, dy) / (r * (1 + 0.12 * Math.sin(3 * a + k) + 0.08 * Math.sin(5 * a + 2 * k)));
      if (q >= 1) return;
      const d = deep * (1 - q * q) ** 1.5;
      if (d > pit[i]) pit[i] = d;
    });
  }
  for (let i = 0; i < n * n; i++) h[i] -= pit[i];
  said('grain: relief');
  const out = new Uint8Array(n * n * 4), soft = blur(h, n, Math.max(1, Math.round(0.6 * unit)));
  slopes(h, n, period, out);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < n * n; i++) { lo = Math.min(lo, h[i]); hi = Math.max(hi, h[i]); }
  for (let i = 0; i < n * n; i++) {
    out[i * 4 + 2] = byte((h[i] - lo) / (hi - lo));
    // Shut in: below the ground round it, and in a pit.
    out[i * 4 + 3] = byte(1 - 2.2 * Math.max(0, soft[i] - h[i]) - 0.7 * pit[i]);
  }
  png('public/world/rockmat-grain.png', n, n, out, 4);
}

// ---------------------------------------------------------------------------------------------------------------
// The marks: gouges, chips and hairline cracks, in clusters along the beds.
function marks() {
  const { size: n, period } = MARKS, unit = n / period, rnd = seeded(101);
  const h = new Float32Array(n * n), dark = new Float32Array(n * n), fresh = new Float32Array(n * n);
  const wob = (s, k) => Math.sin(s * 1.7 + k) * 0.5 + Math.sin(s * 3.9 + 2.1 * k) * 0.3 + Math.sin(s * 8.3 + 4.7 * k) * 0.2;
  // One gouge: so long and so wide, in units, so deep, at an angle from the beds. A gouge is a lens with one steep
  // wall and one sloping one, a lip raised a little along both, and a ragged outline.
  const gouge = (cx, cy, long, wide, deep, angle, steep) => {
    // An angular sliver torn out of the face: it widens fast to its widest a third or so along and tapers straight
    // to a point, its outline kinked in two places, with steep walls, a dark floor deepest at its wide end, and a
    // thin lip raised along the side toward which it was torn.
    const ca = Math.cos(angle), sa = Math.sin(angle), L = (long / 2) * unit, W = (wide / 2) * unit, peak = -0.6 + 0.5 * rnd();
    const k1 = -0.3 + 0.6 * rnd(), k2 = -0.3 + 0.6 * rnd(), j1 = (rnd() - 0.5) * 0.5, j2 = (rnd() - 0.5) * 0.5, reach = L + 2 * W + 2;
    const widthAt = (s) => (s < peak ? (s + 1) / (peak + 1) : (1 - s) / (1 - peak)) * (1 + (s < k1 ? j1 : j2) * (1 - Math.abs(s - k1)));
    const midAt = (s) => W * 0.35 * (s < k1 ? (s + 1) / (k1 + 1) * j1 : j1 + (s - k1) / (1 - k1) * (j2 - j1));
    around(n, cx, cy, Math.abs(ca) * reach + Math.abs(sa) * 3 * W + 2, Math.abs(sa) * reach + Math.abs(ca) * 3 * W + 2, (i, dx, dy) => {
      const s = (dx * ca + dy * sa) / L, t = -dx * sa + dy * ca;
      if (Math.abs(s) >= 1) return;
      const e = Math.max(0, widthAt(s)), w = W * e + 0.6, q = (t - midAt(s)) / w, side = steep ? q : -q, a = Math.abs(q);
      const fall = 0.55 + 0.45 * Math.min(1, e * 1.4);
      if (a < 1) {
        const d = deep * fall * (1 - a ** (side < 0 ? 8 : 3));
        h[i] = Math.min(h[i], -d);
        dark[i] = Math.max(dark[i], 0.92 * Math.min(1, d / (0.85 * deep)) ** 1.5);
      } else if (a < 1.6) {
        const r = 1 - (a - 1) / 0.6, lip = 0.12 * deep * fall * r * r;
        h[i] += side > 0 ? lip : 0.3 * lip;
        fresh[i] = Math.max(fresh[i], (side > 0 ? 0.8 : 0.25) * Math.min(1, e * 2) * r);
      }
    });
  };
  // A flake knocked off: a short wide scar with a flat floor and a sharp step round it.
  const chip = (cx, cy, long, wide, deep, angle) => {
    const ca = Math.cos(angle), sa = Math.sin(angle), L = (long / 2) * unit, W = (wide / 2) * unit, k = rnd() * 10;
    around(n, cx, cy, L + W + 2, L + W + 2, (i, dx, dy) => {
      const s = (dx * ca + dy * sa) / L, t = (-dx * sa + dy * ca) / W, ang = Math.atan2(t, s);
      const r = Math.hypot(s, t) / (1 + 0.28 * wob(ang * 1.3, k));
      if (r >= 1.25) return;
      if (r < 1) {
        const d = deep * (1 - r ** 7) * (0.8 + 0.2 * (1 - s) * 0.5);
        h[i] = Math.min(h[i], -d);
        dark[i] = Math.max(dark[i], 0.35 * (1 - r ** 6));
        fresh[i] = Math.max(fresh[i], 0.75 * (1 - r ** 3));
      } else fresh[i] = Math.max(fresh[i], 0.6 * (1 - (r - 1) / 0.25));
    });
  };
  // Clusters: most lie along the beds, a few across them. Each holds a few to a dozen gouges and some chips.
  const clusters = draft ? 10 : 44;
  for (let c = 0; c < clusters; c++) {
    const cx = rnd() * n, cy = rnd() * n, R = (10 + 26 * rnd()) * unit, along = rnd() < 0.8 ? (rnd() - 0.5) * 0.5 : (rnd() - 0.5) * 2.2, count = 4 + Math.floor(rnd() * 15);
    for (let g = 0; g < count; g++) {
      const a = rnd() * Math.PI * 2, r = R * Math.sqrt(rnd()), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.55;
      const long = 4 + 14 * rnd() ** 1.4, wide = Math.min(long * 0.35, 1 + 1.7 * rnd());
      if (rnd() < 0.22) chip(x, y, 1.6 + 3 * rnd(), 1.2 + 2 * rnd(), 0.18 + 0.2 * rnd(), along + (rnd() - 0.5) * 1.2);
      else gouge(x, y, long, wide, 0.35 + 0.55 * rnd(), along + (rnd() - 0.5) * 0.35, rnd() < 0.5);
    }
  }
  // Loose gouges between clusters, sparse.
  for (let g = 0; g < (draft ? 8 : 40); g++) gouge(rnd() * n, rnd() * n, 2.5 + 6 * rnd(), 0.7 + 0.7 * rnd(), 0.25 + 0.3 * rnd(), (rnd() - 0.5) * 0.5, rnd() < 0.5);
  said('marks: gouges');
  // Hairline cracks: a few straight runs that turn sharply, sometimes forking.
  const crack = (x, y, angle, runs, depth) => {
    for (let r = 0; r < runs; r++) {
      const len = (5 + 20 * rnd()) * unit, x1 = x + Math.cos(angle) * len, y1 = y + Math.sin(angle) * len, wide = (0.22 + 0.12 * rnd()) * unit;
      const dx0 = x1 - x, dy0 = y1 - y, l2 = dx0 * dx0 + dy0 * dy0;
      around(n, (x + x1) / 2, (y + y1) / 2, Math.abs(dx0) / 2 + wide + 2, Math.abs(dy0) / 2 + wide + 2, (i, px, py) => {
        const qx = px + (x1 - x) / 2, qy = py + (y1 - y) / 2, t = Math.max(0, Math.min(1, (qx * dx0 + qy * dy0) / l2));
        const d = Math.hypot(qx - t * dx0, qy - t * dy0) / Math.max(wide, 0.7);
        if (d >= 1) return;
        const fadeEnd = Math.min(1, Math.min(t, 1 - t) * len / (2 * unit) + 0.35), v = depth * (1 - d * d) * fadeEnd;
        h[i] = Math.min(h[i], -v);
        dark[i] = Math.max(dark[i], 0.8 * (1 - d * d) * fadeEnd);
      });
      if (rnd() < 0.3) crack(x1, y1, angle + (rnd() < 0.5 ? 1 : -1) * (0.7 + 0.9 * rnd()), 1, depth * 0.8);
      x = x1; y = y1;
      angle += (rnd() < 0.5 ? 1 : -1) * (0.6 + 1.2 * rnd());
    }
  };
  for (let c = 0; c < (draft ? 2 : 6); c++) crack(rnd() * n, rnd() * n, (rnd() - 0.5) * 3, 1 + Math.floor(rnd() * 3), 0.25 + 0.2 * rnd());
  said('marks: cracks');
  // A gentle unevenness of the whole face, so that a great face is not a sheet of glass in the core's sheen.
  const swell = fbm(n, 3, 3, 0.5, 1.8, 77);
  const flake = { h: ledges(n, period, draft ? 6 : 45, [2, 4], [5, 22], [0.25, 0.9], [2.5, 7], 0.9, 13) };
  for (let i = 0; i < n * n; i++) { h[i] += 1.4 * swell[i] + flake.h[i]; }
  const out = new Uint8Array(n * n * 4);
  slopes(h, n, period, out);
  for (let i = 0; i < n * n; i++) { out[i * 4 + 2] = byte(dark[i]); out[i * 4 + 3] = byte(fresh[i]); }
  png('public/world/rockmat-marks.png', n, n, out, 4);
}

grain();
marks();
said('done');
