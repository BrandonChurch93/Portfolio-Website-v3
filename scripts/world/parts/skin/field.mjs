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

let CR = null, SG = null, ED = null, FAR = null, KNOT = [0, 0, 0];
// How a crack's light is measured: its spill runs this many of its half widths past its lip, plus this far; and round
// the hottest lengths it pools on the rock out to `pool` units, from lengths at least `hot` hot.
// An even halo along every arm read as neon, and a pool 24 units round the knot as an airbrushed blob: the light is
// held to the cleft's own lips and, round the hottest lengths, to faces close by.
const SPILL = { per: 0.1, base: 0.2, reach: 4, pool: 5, hot: 0.82, strength: 0.35 };
// The torn edge's broken crust: chunks of very different lengths along the line (len, units, most of them short),
// each running `depth` in from it. A chunk's broken face stands back from the line by `ofs`; some are let down by
// `drop` and lean toward the hollow by `lean`; between them the crust is split by a crack `gap` wide at the face and
// `cut` deep. A seam laid on a pattern of cells drew a net of straight tiles, and slabs of one size a row of equal
// steps. `band` is how far in from the line any of it reaches, `layer` how thick the pale top is in section, `chips`
// how far in the small chips that show the red brown under it run, `dark` how much less the dark side is broken,
// and `knot` how far round the cracks' knot the rock is whole.
export const CRUST = { len: [6, 72], band: 44, layer: 2.6, chips: 30, dark: { ofs: 0.2, drop: 0.4 }, knot: 62 };
const rngOf = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function chunked(total, seed) {
  const R = rngOf(seed), out = [];
  for (let s = -30; s < total + 30;) {
    const len = CRUST.len[0] * (CRUST.len[1] / CRUST.len[0]) ** (R() ** 1.7), v = R();
    const drop = v < 0.58 ? 0 : v < 0.86 ? 0.6 + 1.8 * R() : 3 + 4 * R();
    out.push({
      from: s, to: s + len, len,
      ofs: R() < 0.62 ? 2.4 * R() : 3 + 9 * R(),
      drop, lean: drop ? 0.03 + 0.08 * R() : 0.02 * R(),
      depth: Math.min(36, Math.max(7, len * (0.4 + 0.55 * R()))),
      twist: (R() - 0.5) * 0.09,
      open: R() < 0.82, gap: 1 + 2.4 * R(), cut: 4 + 7 * R(),
      phase: R() * 50,
    });
    s += len;
  }
  return out;
}
let CH = { left: [], right: [] };
// The cracks are geometry where they are at least this wide (half width, in units) and in the map where narrower.
const GEO = [0.45, 0.9];
// How far from the torn line the pits are gathered toward it, in units.
const GATHER = 110;

export function setup({ craters, segs, edges, knot }) {
  if (knot) KNOT = knot;
  CR = new Grid();
  for (const c of craters) { const e = c.r * 2.7; CR.add([c.c[0] - e, c.c[1] - e, c.c[2] - e], [c.c[0] + e, c.c[1] + e, c.c[2] + e], c); }
  SG = new Grid();
  for (const s of segs) {
    const e = Math.max(s.wa, s.wb) * (1 + SPILL.per * SPILL.reach) + SPILL.base * SPILL.reach + (Math.max(s.ha, s.hb) >= SPILL.hot ? SPILL.pool * 1.25 : 0) + 1.5;
    s.d = [s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]];
    s.l2 = s.d[0] ** 2 + s.d[1] ** 2 + s.d[2] ** 2 || 1e-9;
    SG.add([Math.min(s.a[0], s.b[0]) - e, Math.min(s.a[1], s.b[1]) - e, Math.min(s.a[2], s.b[2]) - e], [Math.max(s.a[0], s.b[0]) + e, Math.max(s.a[1], s.b[1]) + e, Math.max(s.a[2], s.b[2]) + e], s);
  }
  ED = new Grid();
  FAR = new Grid();
  for (const side of ['left', 'right']) edges[side].forEach((p, i) => {
    if (i % 2 === 0) ED.add([p[0] - CRUST.band, p[1] - CRUST.band, p[2] - CRUST.band], [p[0] + CRUST.band, p[1] + CRUST.band, p[2] + CRUST.band], p);
    if (i % 16 === 0) FAR.add([p[0] - GATHER, p[1] - GATHER, p[2] - GATHER], [p[0] + GATHER, p[1] + GATHER, p[2] + GATHER], p);
  });
  CH = { left: chunked(edges.left[edges.left.length - 1][3], 9101), right: chunked(edges.right[edges.right.length - 1][3], 4507) };
}

// How far a place is from the torn line, along the surface (within the band; past it, the band), and the nearest
// point of the line (NEAREST).
export const NEAREST = [0, 0, 0, 0];
export function edgeDistance(x, y, z) {
  let best = CRUST.band * CRUST.band;
  for (const p of ED.at(x, y, z)) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2; if (d < best) { best = d; NEAREST[0] = p[0]; NEAREST[1] = p[1]; NEAREST[2] = p[2]; NEAREST[3] = p[3]; } }
  return Math.sqrt(best);
}
export function farEdge(x, y, z) {
  let best = GATHER * GATHER;
  for (const p of FAR.at(x, y, z)) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2; if (d < best) best = d; }
  return Math.sqrt(best);
}
const rimDistance = (y) => -RIM - y;
// How far down the planet a place is, 0 at the rim and 1 at its foot.
const downOf = (y) => Math.min(1, Math.max(0, (-RIM - y) / L.WORLD.deep));

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
      if (x1 < k.floor) h = -k.depth * (1 - k.bump * Math.exp(-((x1 / 0.13) ** 2))) + k.depth * 0.025 * perlin(x * 0.07 + k.seed, y * 0.07, z * 0.07);
      else {
        // The wall rises smoothly from the floor and steepest under the crest, so the lip is sharp.
        const w = ((x1 - k.floor) / (1 - k.floor)) ** 1.85;
        h = -k.depth + (k.depth + k.rim) * w + k.rim * 0.12 * perlin(x * 0.11 + k.seed, y * 0.11, z * 0.11) * Math.sin(Math.PI * w);
      }
    } else h = -k.depth + (k.depth + k.rim) * x1 ** 2;
  } else {
    const o = x1 - 1;
    h = k.rim * Math.exp(-o * 3.8) * (1 - smooth(1.7, 2.6, x1));
    // Ejecta: a hummocky blanket round the rim of a large crater.
    if (k.r > 9) h += k.rim * 0.35 * Math.exp(-o * 1.6) * (1 - smooth(1.5, 2.6, x1)) * perlin(x * 0.16 + k.seed, y * 0.16, z * 0.16);
  }
  if (k.worn) h *= 0.85 + 0.15 * perlin(x * 0.2, y * 0.2, z * 0.2);
  return h;
}

// The cracks near a place: the depth of the cleft (both the geometry's part and the map's), its light, and which
// way the nearest lit cleft lies along the surface (to).
// A cleft is a V: `in` is how deep in it a place is (1 on its floor), `heat` the heat of the lit cleft it is in,
// `side` which wall it is on (the unit vector from the place toward the cleft's middle line, along the surface:
// the map's worker lights the wall that faces the visitor). Beside a lit cleft its light lies on the rock: `spill`
// close to the lip, and `pool` round the hottest lengths, each with the point of the cleft it comes from (`from`).
const CK = { geo: 0, fine: 0, in: 0, heat: 0, side: [0, 0, 0], spill: 0, pool: 0, from: [0, 0, 0], fromW: 0 };
function crackAt(x, y, z) {
  CK.geo = 0; CK.fine = 0; CK.in = 0; CK.heat = 0; CK.spill = 0; CK.pool = 0;
  let wet = 1, pooled = 1, best = 0;
  // The lips are broken: the width wanders slowly, and at a finer grain by small bites.
  const jag = perlin(x * 0.42, y * 0.42, z * 0.42), bite = perlin(x * 2.1 + 5, y * 2.1, z * 2.1);
  // The light is not even along a crack: it runs hotter where the cleft is deep and dims where it nearly closes.
  const flare = 0.74 + 0.26 * (0.5 + 0.5 * perlin(x * 0.11 + 3, y * 0.11, z * 0.11)) + 0.12 * perlin(x * 0.5, y * 0.5 + 7, z * 0.5);
  for (const s of SG.at(x, y, z)) {
    const px = x - s.a[0], py = y - s.a[1], pz = z - s.a[2];
    const t = Math.min(1, Math.max(0, (px * s.d[0] + py * s.d[1] + pz * s.d[2]) / s.l2));
    const cx = s.d[0] * t - px, cy = s.d[1] * t - py, cz = s.d[2] * t - pz, d = Math.hypot(cx, cy, cz);
    const w0 = s.wa + (s.wb - s.wa) * t, h0 = s.ha + (s.hb - s.ha) * t, heat = h0 >= 0.95 ? h0 : Math.min(1, h0 * flare);
    const w = Math.max(0.02, w0 * (0.8 + 0.3 * jag + 0.1 * Math.max(-0.3, bite)));
    const pool = heat >= SPILL.hot ? SPILL.pool * (heat - SPILL.hot) / (1 - SPILL.hot) : 0;
    const reach = w * (1 + SPILL.per * SPILL.reach) + SPILL.base * SPILL.reach + pool * 1.25;
    if (d > reach) continue;
    if (d < w) {
      const v = -(2.4 * w + 0.3) * (1 - d / w) ** 0.8, g = smooth(GEO[0], GEO[1], w0), inn = 1 - d / w;
      CK.geo = Math.min(CK.geo, v * g);
      CK.fine = Math.min(CK.fine, v * (1 - g));
      if (inn > CK.in) {
        CK.in = inn;
        CK.heat = heat;
        if (d > 1e-4) { CK.side[0] = cx / d; CK.side[1] = cy / d; CK.side[2] = cz / d; } else CK.side[0] = CK.side[1] = CK.side[2] = 0;
      }
    }
    if (heat > 0) {
      const out = Math.max(0, d - w), sp = heat * SPILL.strength * Math.exp(-out / (SPILL.base + SPILL.per * w));
      wet *= 1 - Math.min(0.999, sp);
      let k = 0;
      if (pool > 0) {
        k = heat * heat * Math.exp(-((out / (pool * 0.42)) ** 1.5));
        pooled *= 1 - Math.min(0.999, 0.48 * k);
      }
      // The light here comes from the nearest lit cleft that gives the most.
      if (Math.max(k, sp) > best) { best = Math.max(k, sp); CK.from[0] = x + cx; CK.from[1] = y + cy; CK.from[2] = z + cz; CK.fromW = w; }
    }
  }
  CK.spill = 1 - wet;
  CK.pool = 1 - pooled;
  return CK;
}
export const crackOf = (x, y, z) => crackAt(x, y, z);

// The broken crust at a torn edge: how far a place is let down from the outer surface, and which chunk it is on.
// drop: how far it is let down; edge: how far from the line it is; chunk: which chunk (-1 where there is none);
// top: how far under the outer surface that chunk's own top is here, so drop - top is how far under its top the
// place is, in section; knot: how whole the rock is here for being near the cracks' knot (0 whole, 1 not).
export const CRUSTED = { drop: 0, top: 0, edge: 0, chunk: -1, fallen: false };
export function crust(x, y, z) {
  CRUSTED.drop = 0; CRUSTED.top = 0; CRUSTED.chunk = -1; CRUSTED.fallen = false;
  const e = edgeDistance(x, y, z);
  CRUSTED.edge = e;
  if (e >= CRUST.band) return CRUSTED;
  const pale = x > 0, list = pale ? CH.right : CH.left, s0 = NEAREST[3], sd = pale ? 1 : 2;
  const whole = smooth(CRUST.knot - 14, CRUST.knot + 16, Math.hypot(x - KNOT[0], y - KNOT[1], z - KNOT[2]));
  const kk = whole, ko = kk * (pale ? 1 : CRUST.dark.ofs), kd = kk * (pale ? 1 : CRUST.dark.drop);
  // The splits between chunks wander as they run in from the line, at a large and a small grain.
  const s = s0 + 5 * perlin(e / 11 + 3.1, s0 / 37, sd * 7) + 1.4 * perlin(e / 2.9, s0 / 6.3, 11 + sd);
  let lo = 0, hi = list.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (list[m].from <= s) lo = m; else hi = m - 1; }
  const c = list[lo], mid = (c.from + c.to) / 2;
  CRUSTED.chunk = lo + (pale ? 10000 : 0);
  // The broken face: back from the line by the chunk's own inset, wandering along it and crumbling.
  const face = ko * c.ofs + (0.6 + 1.8 * ko) * (0.5 + 0.5 * perlin(s0 / 9.5, c.phase, sd)) + 0.7 * Math.abs(perlin(s0 / 2.4, e / 2.4, 5 + sd));
  const drop = kd * c.drop, lean = kd * c.lean;
  const top = drop + lean * Math.max(0, c.depth - e) + kk * c.twist * (s - mid) * Math.min(1, c.len / 20) * 0.4;
  let h = -top;
  if (e < face) {
    // Over the lip and down the broken face: rounded where it breaks, then steep, lumpy all the way.
    const d = face - e;
    h -= (3.6 * d * d) / (d + 1.2) + 0.8 * perlin(x / 1.7, y / 1.7, z / 1.7) * smooth(0.5, 2, d);
  }
  // Behind a chunk that was let down, a riser back up to the ground that stayed.
  if (e > c.depth - 1) h += top * smooth(c.depth - 1, c.depth + 0.8, e);
  // The crack between this chunk and the one before or after it, open at the face and closing as it runs in.
  const db = Math.min(s - c.from, c.to - s), next = list[Math.min(list.length - 1, lo + 1)];
  const crack = s - c.from < c.to - s ? c : next;
  if (crack.open && kk > 0.05) {
    const reach = Math.min(c.depth, crack === c ? c.depth : next.depth) + 3, run = Math.max(0, 1 - e / reach);
    const w = crack.gap * (0.3 + 0.7 * run) * kk;
    if (db < w && run > 0) h -= crack.cut * kk * (1 - db / w) ** 0.7 * (0.35 + 0.65 * run);
  }
  CRUSTED.top = top;
  CRUSTED.fallen = drop > 0.5;
  CRUSTED.drop = Math.max(0, -h);
  return CRUSTED;
}
// Small chips knocked out of the crust near the line, which show the red brown under it: how deep one is at a place.
export function chips(x, y, z) {
  const e = edgeDistance(x, y, z);
  if (e > CRUST.chips) return 0;
  const c = cells(x + 1.3 * perlin(x * 0.3, y * 0.3, z * 0.3), y, z, 4.4, 51, C3), hb = hash(c.i, c.j, c.k, 52), inset = (c.d2 - c.d1) / 2;
  const near = 1 - smooth(CRUST.chips * 0.35, CRUST.chips, e);
  if (hb > 0.12 + 0.3 * near) return 0;
  return (0.5 + 1.1 * hash(c.i, c.j, c.k, 53)) * smooth(0.25, 0.9, inset) * near;
}
const C3 = {};

// The ground's own relief, larger than the pits: long low swells, and the lumps between that the moon rakes across,
// which the dark side, the oldest ground, has worn nearly smooth.
const swell = (x, y, z) => 2.6 * fbm(x / 70, y / 70, z / 70, 3) + 1.5 * fbm(x / 26 + 3, y / 26, z / 26, 3) + (x > 0 ? 1.3 : 0.4) * Math.abs(fbm(x / 11 + 9, y / 11, z / 11, 2));

// The top of the skin, under the land's edge: a rounded, crumbly shoulder that turns in under it (how far down from
// the rim it rounds, and how far in it is at the rim), with the ground's lumps kept down for `under` units, where the
// land's sand lies over it, so nothing of it stands above the land.
export const SHOULDER = { round: 16, in: 11, under: 40 };
export function coarse(x, y, z) {
  let h = swell(x, y, z) * (1 - 0.8 * floored(x, y, z));
  for (const k of CR.at(x, y, z)) h += craterHeight(k, x, y, z);
  h += crackAt(x, y, z).geo;
  h -= crust(x, y, z).drop;
  const rd = rimDistance(y);
  h = h > 0 ? h * smooth(SHOULDER.under * 0.55, SHOULDER.under, rd) : h * (0.45 + 0.55 * smooth(6, SHOULDER.under * 0.9, rd));
  if (rd < SHOULDER.round) {
    const f = 1 - rd / SHOULDER.round;
    h -= SHOULDER.in * f * f * (1 + 0.22 * perlin(x / 6, y / 6, z / 6)) + 1.4 * Math.abs(perlin(x / 2.6, y / 2.6, z / 2.6)) * f;
  }
  return h;
}

// How far inside a crater a place is, 0 outside to 1 on its floor: the floors are smoother than the ground round them.
export function floored(x, y, z) {
  let f = 0;
  for (const k of CR.at(x, y, z)) {
    if (k.r < 4) continue;
    const dx = x - k.c[0], dy = y - k.c[1], dz = z - k.c[2], dn = dx * k.n[0] + dy * k.n[1] + dz * k.n[2];
    const d = Math.hypot(dx - dn * k.n[0], dy - dn * k.n[1], dz - dn * k.n[2]);
    f = Math.max(f, 1 - smooth(0.6, 1.02, d / k.r));
  }
  return f;
}
// How thickly the small pits lie at a place, about 0 to 1.6: gathered in fields toward the torn line and down toward
// the lower limb, with broad bands of smooth dust between, and few on crater floors.
export function gathered(x, y, z, side) {
  const toward = Math.max(0.8 * (1 - smooth(0, GATHER, farEdge(x, y, z))), smooth(0.3, 0.72, downOf(y)));
  const bands = smooth(-0.2, 0.2, fbm(x / 90 + 4, y / 60, z / 90, 3) + 0.3 * toward);
  const knot = side > 0 ? 1 : 0.15 + 0.85 * smooth(25, 75, Math.hypot(x - KNOT[0], y - KNOT[1], z - KNOT[2]));
  return (side > 0 ? 1 : 0.35) * knot * (0.38 + 1.15 * toward ** 1.2) * (0.22 + 0.78 * bands) * (1 - 0.88 * floored(x, y, z));
}

// Pits too small for the geometry, in three sizes whose radii follow a power law within each, as craters do.
const PITS = [{ size: 15, seed: 11, r: [2.4, 8], keep: 0.46 }, { size: 6.5, seed: 23, r: [0.9, 3], keep: 0.4 }, { size: 2.6, seed: 37, r: [0.3, 0.95], keep: 0.42 }];
function pits(x, y, z, side, nx, ny, nz, density) {
  let h = 0;
  for (let l = 0; l < PITS.length; l++) {
    const P = PITS[l], fx = x / P.size, fy = y / P.size, fz = z / P.size, X = Math.floor(fx), Y = Math.floor(fy), Z = Math.floor(fz);
    const keep = P.keep * density;
    if (keep < 0.005) continue;
    for (let i = X - 1; i <= X + 1; i++) for (let j = Y - 1; j <= Y + 1; j++) for (let k = Z - 1; k <= Z + 1; k++) {
      if (hash(i, j, k, P.seed + 3) > keep) continue;
      const sx = (i + hash(i, j, k, P.seed)) * P.size - x, sy = (j + hash(i, j, k, P.seed + 1)) * P.size - y, sz = (k + hash(i, j, k, P.seed + 2)) * P.size - z;
      const dn = sx * nx + sy * ny + sz * nz;
      if (Math.abs(dn) > P.size * 0.5) continue;
      const u = hash(i, j, k, P.seed + 4), r = P.r[0] * (P.r[1] / P.r[0]) ** (u * u);
      const ex = sx - dn * nx, ey = sy - dn * ny, ez = sz - dn * nz;
      // Each pit a little out of round, and a little deeper on one side.
      const lop = 1 + 0.16 * Math.sin(3 * Math.atan2(ey, ex + ez) + 6.28 * hash(i, j, k, P.seed + 5));
      const xr = Math.hypot(ex, ey, ez) / (r * lop);
      if (xr > 1.9) continue;
      const deep = (l ? 0.42 : 0.55) + 0.32 * hash(i, j, k, P.seed + 6);
      h += xr < 1 ? -deep * r + (deep + 0.1) * r * xr * xr : 0.1 * r * Math.exp(-(xr - 1) * 4.5);
    }
  }
  return h;
}
const normalOf = (x, y, z) => { const n = [x / (L.WORLD.half ** 2), Math.min(0, y + RIM) / (L.WORLD.deep ** 2), z / (L.WORLD.half ** 2)], l = Math.hypot(...n) || 1; return [n[0] / l, n[1] / l, n[2] / l]; };

// Relief finer than the geometry.
export function fine(x, y, z, side) {
  const [nx, ny, nz] = normalOf(x, y, z), floor = floored(x, y, z);
  let h = pits(x, y, z, side, nx, ny, nz, gathered(x, y, z, side));
  h += (0.16 * fbm(x * 0.9, y * 0.9, z * 0.9, 3) + 0.04 * perlin(x * 3.1, y * 3.1, z * 3.1)) * (1 - 0.6 * floor);
  // Lumps a few units across, the ground's own roughness between the pits, fewer on crater floors.
  if (side > 0) h += 0.3 * fbm(x * 0.24 + 2, y * 0.24, z * 0.24, 2) * (1 - 0.7 * floor);
  if (side < 0) {
    // The dark side is the oldest surface: weathered in long streaks down it, and roughened.
    const ex = nz, ez = -nx, el = Math.hypot(ex, ez) || 1, a = (x * ex + z * ez) / el;
    h += 0.3 * fbm(a * 0.5, y * 0.05, 7.7, 3) + 0.12 * Math.abs(fbm(a * 1.6, y * 0.12, 3.1, 2)) + 0.08 * fbm(x * 1.7, y * 1.7, z * 1.7, 2);
  }
  h += crackAt(x, y, z).fine;
  h -= chips(x, y, z);
  return h;
}
// How deep in a pit a place is, 0 to 1, for darkening the dust there.
export function pitted(x, y, z, side) {
  const [nx, ny, nz] = normalOf(x, y, z);
  return Math.min(1, Math.max(0, -pits(x, y, z, side, nx, ny, nz, gathered(x, y, z, side)) / 0.6));
}
export { downOf };
