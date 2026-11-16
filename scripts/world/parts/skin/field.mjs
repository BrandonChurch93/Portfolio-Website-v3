// The skin's relief and light as functions of a place on the planet's outer surface. Shared by the make script and
// its workers, which call setup(features) once with what features.mjs made.
//
//   coarse(q)   the height over the outer surface at a place on it, in units: what is made as geometry (craters
//               down to 3 units across in radius, the wide part of the cracks, the broken crust at the torn edges,
//               the low swells). Under 0 is cut into the planet.
//   crust(q)    { drop, top }: how far the broken crust at a torn edge is let down at a place, and the height the
//               intact crust's top would have there
//   fine(q)     the relief finer than the geometry, in units: pits, grain, the weathering of the dark side, and the
//               narrow part of the cracks. Stored as slopes in the skin's map
//   glow(q)     how much of the cracks' light lies at a place, 0 to about 1: inside a cleft, and on the rock beside it
//   pitted(q)   how deep in a pit a place is, 0 to 1
// q is a place on the outer surface (toShell of anything near it) in units, and side is 1 on the pale side, -1 on
// the dark.
import { L } from '../../lib/plan.mjs';

const RIM = L.RIM;

// ---------------------------------------------------------------------------------------------------------------
// Noise: Perlin's gradient noise, -1 to 1, and its sums.
const PERM = new Uint8Array(512);
{
  let s = 1337;
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}
const GR = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1], [1, 1, 0], [0, -1, 1], [-1, 1, 0], [0, -1, -1]];
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
export function perlin(x, y, z) {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), xf = x - X, yf = y - Y, zf = z - Z, xi = X & 255, yi = Y & 255, zi = Z & 255;
  const u = fade(xf), v = fade(yf), w = fade(zf);
  const g = (h, a, b, c) => { const q = GR[h & 15]; return q[0] * a + q[1] * b + q[2] * c; };
  const A = PERM[xi] + yi, AA = PERM[A] + zi, AB = PERM[A + 1] + zi, B = PERM[xi + 1] + yi, BA = PERM[B] + zi, BB = PERM[B + 1] + zi;
  const l1 = g(PERM[AA], xf, yf, zf) + u * (g(PERM[BA], xf - 1, yf, zf) - g(PERM[AA], xf, yf, zf));
  const l2 = g(PERM[AB], xf, yf - 1, zf) + u * (g(PERM[BB], xf - 1, yf - 1, zf) - g(PERM[AB], xf, yf - 1, zf));
  const l3 = g(PERM[AA + 1], xf, yf, zf - 1) + u * (g(PERM[BA + 1], xf - 1, yf, zf - 1) - g(PERM[AA + 1], xf, yf, zf - 1));
  const l4 = g(PERM[AB + 1], xf, yf - 1, zf - 1) + u * (g(PERM[BB + 1], xf - 1, yf - 1, zf - 1) - g(PERM[AB + 1], xf, yf - 1, zf - 1));
  const m1 = l1 + v * (l2 - l1), m2 = l3 + v * (l4 - l3);
  return m1 + w * (m2 - m1);
}
export function fbm(x, y, z, octaves, gain = 0.5) {
  let s = 0, a = 1, f = 1, n = 0;
  for (let i = 0; i < octaves; i++) { s += a * perlin(x * f + i * 17.3, y * f - i * 9.1, z * f + i * 5.7); n += a; a *= gain; f *= 2.03; }
  return s / n;
}
const hash = (i, j, k, s) => {
  let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683) ^ Math.imul(s, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The nearest and second nearest of a lattice of points jittered in their cells, size apart: the cells of a
// Voronoi pattern, laid over the surface.
function cells(x, y, z, size, seed, out) {
  const fx = x / size, fy = y / size, fz = z / size, X = Math.floor(fx), Y = Math.floor(fy), Z = Math.floor(fz);
  let d1 = Infinity, d2 = Infinity, i1 = 0, j1 = 0, k1 = 0;
  for (let i = X - 1; i <= X + 1; i++) for (let j = Y - 1; j <= Y + 1; j++) for (let k = Z - 1; k <= Z + 1; k++) {
    const sx = i + hash(i, j, k, seed), sy = j + hash(i, j, k, seed + 1), sz = k + hash(i, j, k, seed + 2);
    const d = (sx - fx) ** 2 + (sy - fy) ** 2 + (sz - fz) ** 2;
    if (d < d1) { d2 = d1; d1 = d; i1 = i; j1 = j; k1 = k; } else if (d < d2) d2 = d;
  }
  out.d1 = Math.sqrt(d1) * size; out.d2 = Math.sqrt(d2) * size; out.i = i1; out.j = j1; out.k = k1;
  out.sx = (i1 + hash(i1, j1, k1, seed)) * size; out.sy = (j1 + hash(i1, j1, k1, seed + 1)) * size; out.sz = (k1 + hash(i1, j1, k1, seed + 2)) * size;
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// A hash grid of what is near each place, so a place asks only about what can reach it.
const GRID = 20;
class Grid {
  constructor() { this.m = new Map(); }
  key(i, j, k) { return ((i + 512) * 1024 + (j + 512)) * 1024 + (k + 512); }
  add(lo, hi, item) {
    for (let i = Math.floor(lo[0] / GRID); i <= Math.floor(hi[0] / GRID); i++) for (let j = Math.floor(lo[1] / GRID); j <= Math.floor(hi[1] / GRID); j++) for (let k = Math.floor(lo[2] / GRID); k <= Math.floor(hi[2] / GRID); k++) {
      const key = this.key(i, j, k);
      let a = this.m.get(key);
      if (!a) this.m.set(key, (a = []));
      a.push(item);
    }
  }
  at(x, y, z) { return this.m.get(this.key(Math.floor(x / GRID), Math.floor(y / GRID), Math.floor(z / GRID))) ?? EMPTY; }
}
const EMPTY = [];

let CR = null, SG = null, ED = null, EDGE_PTS = null;
// How a crack's reach is measured: its light runs this many of its half widths past its edge, plus this far.
const SPILL = { per: 1.4, base: 0.9, reach: 5 };
// The torn edge's broken crust: the plates' size, how far in from the line it is broken, how deep each step down is.
export const CRUST = { plate: 15, chip: 4.2, band: 40, steps: [4.5, 9.5], gap: [0.5, 1.6] };
// The cracks are geometry where they are at least this wide (half width, in units) and in the map where narrower.
const GEO = [0.45, 0.9];

export function setup({ craters, segs, edges }) {
  CR = new Grid();
  for (const c of craters) { const e = c.r * 2.7; CR.add([c.c[0] - e, c.c[1] - e, c.c[2] - e], [c.c[0] + e, c.c[1] + e, c.c[2] + e], c); }
  SG = new Grid();
  for (const s of segs) {
    const e = Math.max(s.wa, s.wb) * (1 + SPILL.per * SPILL.reach) + SPILL.base * SPILL.reach + 1.5;
    s.d = [s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]];
    s.l2 = s.d[0] ** 2 + s.d[1] ** 2 + s.d[2] ** 2 || 1e-9;
    SG.add([Math.min(s.a[0], s.b[0]) - e, Math.min(s.a[1], s.b[1]) - e, Math.min(s.a[2], s.b[2]) - e], [Math.max(s.a[0], s.b[0]) + e, Math.max(s.a[1], s.b[1]) + e, Math.max(s.a[2], s.b[2]) + e], s);
  }
  ED = new Grid();
  EDGE_PTS = [];
  for (const side of ['left', 'right']) for (const p of edges[side]) { EDGE_PTS.push(p); ED.add([p[0] - CRUST.band, p[1] - CRUST.band, p[2] - CRUST.band], [p[0] + CRUST.band, p[1] + CRUST.band, p[2] + CRUST.band], p); }
}

// How far a place is from the torn line, along the surface (within the band; past it, the band).
export function edgeDistance(x, y, z) {
  let best = CRUST.band * CRUST.band;
  for (const p of ED.at(x, y, z)) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2; if (d < best) best = d; }
  return Math.sqrt(best);
}
const rimDistance = (y) => -RIM - y;

// ---------------------------------------------------------------------------------------------------------------
// A crater's height at a place.
function craterHeight(k, x, y, z) {
  const dx = x - k.c[0], dy = y - k.c[1], dz = z - k.c[2], dn = dx * k.n[0] + dy * k.n[1] + dz * k.n[2];
  const tx = dx - dn * k.n[0], ty = dy - dn * k.n[1], tz = dz - dn * k.n[2], d = Math.hypot(tx, ty, tz);
  if (d > k.r * 2.6) return 0;
  const phi = Math.atan2(tx * k.e2[0] + ty * k.e2[1] + tz * k.e2[2], tx * k.e1[0] + ty * k.e1[1] + tz * k.e1[2]);
  const rr = k.r * (1 + k.lumpy * (0.55 * Math.sin(3 * phi + k.phase) + 0.3 * Math.sin(5 * phi + 2.1 * k.phase) + 0.15 * Math.sin(11 * phi + 0.7 * k.phase)));
  const x1 = d / rr;
  let h;
  if (x1 < 1) {
    if (k.floor > 0) {
      if (x1 < k.floor) h = -k.depth + k.depth * 0.07 * (1 - (x1 / k.floor) ** 2);
      else {
        const s = (x1 - k.floor) / (1 - k.floor), w = s ** 1.7, N = k.terraces, f = w * N, st = (Math.floor(f) + smooth(0.55, 1, f - Math.floor(f))) / N;
        h = -k.depth + (k.depth + k.rim) * (w * 0.4 + st * 0.6);
      }
    } else h = -k.depth + (k.depth + k.rim) * x1 ** 2.2;
  } else {
    const o = x1 - 1;
    h = k.rim * Math.exp(-o * 3.4) * (1 - smooth(1.7, 2.6, x1));
    // Ejecta: a hummocky blanket round the rim of a large crater.
    if (k.r > 9) h += k.rim * 0.35 * Math.exp(-o * 1.6) * (1 - smooth(1.5, 2.6, x1)) * perlin(x * 0.35 + k.seed, y * 0.35, z * 0.35);
  }
  if (k.worn) h *= 0.85 + 0.15 * perlin(x * 0.2, y * 0.2, z * 0.2);
  return h;
}

// The cracks near a place: the depth of the cleft (both the geometry's part and the map's), and its light.
const CK = { geo: 0, fine: 0, glow: 0, in: 0 };
function crackAt(x, y, z) {
  CK.geo = 0; CK.fine = 0; CK.glow = 0; CK.in = 0;
  let dark = 1;
  const jag = perlin(x * 0.7, y * 0.7, z * 0.7), jag2 = perlin(x * 2.3 + 5, y * 2.3, z * 2.3);
  for (const s of SG.at(x, y, z)) {
    const px = x - s.a[0], py = y - s.a[1], pz = z - s.a[2];
    const t = Math.min(1, Math.max(0, (px * s.d[0] + py * s.d[1] + pz * s.d[2]) / s.l2));
    const d = Math.hypot(px - s.d[0] * t, py - s.d[1] * t, pz - s.d[2] * t);
    const w0 = s.wa + (s.wb - s.wa) * t, heat = s.ha + (s.hb - s.ha) * t;
    const w = Math.max(0.02, w0 * (0.78 + 0.32 * jag + 0.12 * jag2));
    const reach = w * (1 + SPILL.per * SPILL.reach) + SPILL.base * SPILL.reach;
    if (d > reach) continue;
    if (d < w) {
      const v = -(2.3 * w + 0.25) * (1 - d / w) ** 0.85, g = smooth(GEO[0], GEO[1], w0);
      CK.geo = Math.min(CK.geo, v * g);
      CK.fine = Math.min(CK.fine, v * (1 - g));
      CK.in = Math.max(CK.in, 1 - d / w);
    }
    if (heat > 0) {
      const inside = d < w ? heat * (0.62 + 0.38 * (1 - d / w)) : 0;
      const spill = heat * 0.5 * Math.exp(-Math.max(0, d - w) / (SPILL.base + SPILL.per * w));
      dark *= 1 - Math.min(0.999, Math.max(inside, spill));
    }
  }
  CK.glow = 1 - dark;
  return CK;
}

// The broken crust at a torn edge: how far a place is let down, and how high the crust's top would stand.
const C1 = {}, C2 = {}, C3 = {};
export const CRUSTED = { drop: 0, top: 0, edge: 0 };
export function crust(x, y, z) {
  CRUSTED.drop = 0; CRUSTED.top = 0;
  const e = edgeDistance(x, y, z);
  CRUSTED.edge = e;
  if (e >= CRUST.band) return CRUSTED;
  const [s1, s2] = CRUST.steps;
  const c = cells(x, y, z, CRUST.plate, 31, C1), es = edgeDistance(c.sx, c.sy, c.sz) * 0.6 + e * 0.4, r = hash(c.i, c.j, c.k, 77);
  const miss = 1 - smooth(1, 24, es + 8 * (hash(c.i, c.j, c.k, 78) - 0.5));
  const near = (1 - e / CRUST.band) ** 2;
  let drop = 0, top = 0;
  if (r < miss) drop = r < miss * 0.38 ? s2 * (0.85 + 0.3 * hash(c.i, c.j, c.k, 79)) : s1 * (0.8 + 0.4 * hash(c.i, c.j, c.k, 80));
  else {
    // A plate that is still there has opened from its neighbours: a little heaved, a little tilted.
    const heave = (hash(c.i, c.j, c.k, 81) - 0.35) * 1.8 * near;
    const tx = (hash(c.i, c.j, c.k, 82) - 0.5) * 0.14 * near, ty = (hash(c.i, c.j, c.k, 83) - 0.5) * 0.14 * near, tz = (hash(c.i, c.j, c.k, 84) - 0.5) * 0.14 * near;
    top = heave + tx * (x - c.sx) + ty * (y - c.sy) + tz * (z - c.sz);
    // Open seams between plates, wider toward the edge.
    const seam = (c.d2 - c.d1) / 2, gap = CRUST.gap[0] + (CRUST.gap[1] - CRUST.gap[0]) * near;
    if (e < CRUST.band * 0.85 && seam < gap) drop = s1 * (0.55 + 0.45 * hash(c.i, c.j, c.k, 85)) * smooth(0, 0.35, 1 - seam / gap);
    // Chips taken from the plate's broken edge.
    const k = cells(x, y, z, CRUST.chip, 57, C2);
    if (hash(k.i, k.j, k.k, 58) < 0.55 * (1 - smooth(2, 16, e)) * (0.4 + 0.6 * smooth(0, 4, CRUST.plate * 0.5 - seam))) drop = Math.max(drop, s1 * (0.35 + 0.35 * hash(k.i, k.j, k.k, 59)));
  }
  // The lower steps are broken too: small blocks stand on them.
  if (drop > 0) {
    const b = cells(x, y, z, 2.8, 91, C3);
    if (hash(b.i, b.j, b.k, 92) < 0.18) drop *= 0.6 + 0.25 * hash(b.i, b.j, b.k, 93);
  }
  CRUSTED.drop = drop;
  CRUSTED.top = top;
  return CRUSTED;
}

// The low swells of the ground.
const swell = (x, y, z) => 1.5 * fbm(x / 70, y / 70, z / 70, 3) + 0.6 * fbm(x / 22 + 3, y / 22, z / 22, 2);

export function coarse(x, y, z) {
  let h = swell(x, y, z);
  for (const k of CR.at(x, y, z)) h += craterHeight(k, x, y, z);
  h += crackAt(x, y, z).geo;
  const c = crust(x, y, z);
  h += c.top - c.drop;
  return h * smooth(0, 6, rimDistance(y));
}
// The height of the intact crust's top at a place, with the crust's own heave but nothing broken away.
export function intact(x, y, z) {
  let h = swell(x, y, z);
  for (const k of CR.at(x, y, z)) h += craterHeight(k, x, y, z);
  h += crackAt(x, y, z).geo + crust(x, y, z).top;
  return h * smooth(0, 6, rimDistance(y));
}

// Pits too small for the geometry, in two sizes, more on the pale side than the dark.
const P1 = {}, P2 = {};
const PITS = [{ size: 7.5, seed: 11, r: [0.9, 2.8], keep: [0.16, 0.5] }, { size: 2.7, seed: 23, r: [0.25, 0.95], keep: [0.2, 0.6] }];
function pits(x, y, z, side, nx, ny, nz) {
  let h = 0;
  for (let l = 0; l < 2; l++) {
    const P = PITS[l], o = l ? P2 : P1, fx = x / P.size, fy = y / P.size, fz = z / P.size, X = Math.floor(fx), Y = Math.floor(fy), Z = Math.floor(fz);
    const keep = side > 0 ? P.keep[1] : P.keep[0];
    for (let i = X - 1; i <= X + 1; i++) for (let j = Y - 1; j <= Y + 1; j++) for (let k = Z - 1; k <= Z + 1; k++) {
      if (hash(i, j, k, P.seed + 3) > keep) continue;
      const sx = (i + hash(i, j, k, P.seed)) * P.size - x, sy = (j + hash(i, j, k, P.seed + 1)) * P.size - y, sz = (k + hash(i, j, k, P.seed + 2)) * P.size - z;
      const dn = sx * nx + sy * ny + sz * nz;
      if (Math.abs(dn) > P.size * 0.5) continue;
      const d = Math.hypot(sx - dn * nx, sy - dn * ny, sz - dn * nz), u = hash(i, j, k, P.seed + 4), r = P.r[0] * (P.r[1] / P.r[0]) ** (u * u);
      const xr = d / r;
      if (xr > 1.9) continue;
      h += xr < 1 ? -0.3 * r + 0.4 * r * xr * xr : 0.1 * r * Math.exp(-(xr - 1) * 4.5);
    }
    void o;
  }
  return h;
}

// Relief finer than the geometry.
export function fine(x, y, z, side) {
  const n = [x / (L.WORLD.half ** 2), Math.min(0, y + RIM) / (L.WORLD.deep ** 2), z / (L.WORLD.half ** 2)], nl = Math.hypot(...n) || 1;
  const nx = n[0] / nl, ny = n[1] / nl, nz = n[2] / nl;
  let h = pits(x, y, z, side, nx, ny, nz);
  h += 0.11 * fbm(x * 0.9, y * 0.9, z * 0.9, 3) + 0.035 * perlin(x * 3.1, y * 3.1, z * 3.1);
  if (side < 0) {
    // The dark side is weathered in long streaks down it, and roughened.
    const ex = nz, ez = -nx, el = Math.hypot(ex, ez) || 1, a = (x * ex + z * ez) / el;
    h += 0.22 * fbm(a * 0.55, y * 0.06, 7.7, 3) + 0.08 * fbm(x * 1.7, y * 1.7, z * 1.7, 2);
  }
  h += crackAt(x, y, z).fine;
  return h;
}
export const glow = (x, y, z) => crackAt(x, y, z).glow;
export const cleft = (x, y, z) => crackAt(x, y, z).in;
// How deep in a pit a place is, 0 to 1, for darkening the dust there.
export function pitted(x, y, z, side) {
  const n = [x / (L.WORLD.half ** 2), Math.min(0, y + RIM) / (L.WORLD.deep ** 2), z / (L.WORLD.half ** 2)], nl = Math.hypot(...n) || 1;
  return Math.min(1, Math.max(0, -pits(x, y, z, side, n[0] / nl, n[1] / nl, n[2] / nl) / 0.5));
}
