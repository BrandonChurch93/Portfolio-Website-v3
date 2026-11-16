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
const SPILL = { per: 0.4, base: 0.5, reach: 5, pool: 24, hot: 0.78 };
// The torn edge's broken crust: a thick pale crust broken into great slabs `slab` across, within `band` of the torn
// line. A slab whose middle is within `deep` of the line has fallen furthest, one within `mid` part way; each step
// down is so many units (the least and the most). The slabs lean down toward the hollow by `lean`. Seams open
// between the slabs still in place, and blocks `block` across lie on the fallen ones.
export const CRUST = { slab: 36, band: 80, deep: 15, mid: 34, steps: [[6, 12], [2.5, 5.5]], lean: [0.06, 0.2], seam: [0.5, 1.3], block: 7.5, layer: 2.6, dark: 0.45, knot: 62 };
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
}

// How far a place is from the torn line, along the surface (within the band; past it, the band), and the nearest
// point of the line (NEAREST).
export const NEAREST = [0, 0, 0];
export function edgeDistance(x, y, z) {
  let best = CRUST.band * CRUST.band;
  for (const p of ED.at(x, y, z)) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2; if (d < best) { best = d; NEAREST[0] = p[0]; NEAREST[1] = p[1]; NEAREST[2] = p[2]; } }
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
      if (x1 < k.floor) h = -k.depth + k.depth * 0.06 * (1 - (x1 / k.floor) ** 2);
      else {
        // Steep walls slumped into terraces that come and go round the crater, cut by gullies running down them.
        const s = (x1 - k.floor) / (1 - k.floor), w = s ** 2.3, N = k.terraces, tau = 2 * Math.PI * N;
        const a = 0.75 * smooth(-0.3, 0.5, Math.sin(2 * phi + k.phase) + 0.6 * Math.sin(5 * phi + 1.3 * k.phase)), ph = 0.9 * Math.sin(3 * phi + 0.5 * k.phase);
        const wt = w - (a * (Math.sin(tau * w + ph) - Math.sin(ph) * (1 - w) - Math.sin(tau + ph) * w)) / tau;
        const gully = k.r * 0.025 * Math.sin(s * Math.PI) * (0.6 + 0.4 * Math.sin(k.gullies * phi + 3 * Math.sin(7 * phi + k.phase))) * Math.sin(k.gullies * phi + 2 * Math.sin(3 * phi));
        h = -k.depth + (k.depth + k.rim) * wt - Math.abs(gully);
      }
    } else h = -k.depth + (k.depth + k.rim) * x1 ** 2;
  } else {
    const o = x1 - 1;
    h = k.rim * Math.exp(-o * 3.4) * (1 - smooth(1.7, 2.6, x1));
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
  for (const s of SG.at(x, y, z)) {
    const px = x - s.a[0], py = y - s.a[1], pz = z - s.a[2];
    const t = Math.min(1, Math.max(0, (px * s.d[0] + py * s.d[1] + pz * s.d[2]) / s.l2));
    const cx = s.d[0] * t - px, cy = s.d[1] * t - py, cz = s.d[2] * t - pz, d = Math.hypot(cx, cy, cz);
    const w0 = s.wa + (s.wb - s.wa) * t, heat = s.ha + (s.hb - s.ha) * t;
    const w = Math.max(0.02, w0 * (0.86 + 0.2 * jag + 0.14 * Math.max(-0.3, bite)));
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
      const out = Math.max(0, d - w);
      wet *= 1 - Math.min(0.999, heat * 0.55 * Math.exp(-out / (SPILL.base + SPILL.per * w)));
      if (pool > 0) {
        const k = heat * heat * Math.exp(-((out / (pool * 0.42)) ** 1.5));
        pooled *= 1 - Math.min(0.999, 0.48 * k);
        if (k > best) { best = k; CK.from[0] = x + cx; CK.from[1] = y + cy; CK.from[2] = z + cz; CK.fromW = w; }
      }
    }
  }
  CK.spill = 1 - wet;
  CK.pool = 1 - pooled;
  return CK;
}
export const crackOf = (x, y, z) => crackAt(x, y, z);

// The broken crust at a torn edge: how far a place is let down, and how high the crust's top would stand. The
// plates and chips are cells of a pattern laid over the surface through a wander, so their edges are broken and
// never ruler straight.
const C1 = {}, C3 = {};
// drop: how far a place is let down from the crust's top; top: the crust's own heave there (which the top of a slab
// that is still in place has); slab: which slab it is on (-1 where there is none); fallen: whether that slab fell.
export const CRUSTED = { drop: 0, top: 0, edge: 0, slab: -1, fallen: false };
const slabs = new Map();
function slabOf(c) {
  const key = `${c.i},${c.j},${c.k}`;
  let s = slabs.get(key);
  if (s) return s;
  const es = edgeDistance(c.sx, c.sy, c.sz), toward = [NEAREST[0] - c.sx, NEAREST[1] - c.sy, NEAREST[2] - c.sz], tl = Math.hypot(...toward) || 1;
  const h = (n) => hash(c.i, c.j, c.k, n), [a, b] = CRUST.steps;
  // How far it fell: the slabs at the line furthest, those behind them part way, a few further in a little.
  // On the dark side the band is narrower: the picture's cracks run close to its torn line on unbroken rock.
  let fall = 0;
  const k = c.sx < 0 ? CRUST.dark : 1;
  // Round the knot of the cracks the rock is whole: its light lies on unbroken stone, as the picture has it.
  const nearKnot = Math.hypot(c.sx - KNOT[0], c.sy - KNOT[1], c.sz - KNOT[2]) < CRUST.knot;
  if (nearKnot) fall = 0;
  else if (es < CRUST.deep * k) fall = a[0] + (a[1] - a[0]) * h(79);
  else if (es < CRUST.mid * k) fall = h(78) < 0.72 ? b[0] + (b[1] - b[0]) * h(80) : 0;
  else if (k === 1 && es < CRUST.band - CRUST.slab) fall = h(78) < 0.22 ? 1.5 + 2.5 * h(80) : 0;
  const lean = fall ? CRUST.lean[0] + (CRUST.lean[1] - CRUST.lean[0]) * h(81) : 0.05 * h(81);
  // A fallen slab leans down toward the hollow, and a little to one side.
  const g = toward.map((v) => (v / tl) * lean);
  g[0] += (h(82) - 0.5) * 0.18; g[1] += (h(83) - 0.5) * 0.18; g[2] += (h(84) - 0.5) * 0.18;
  s = { id: Math.floor(h(99) * 1e9), es, fall, g, heave: fall || c.sx < 0 ? 0 : (h(85) - 0.35) * 0.6 * (1 - smooth(CRUST.mid, CRUST.band, es)), c: [c.sx, c.sy, c.sz] };
  slabs.set(key, s);
  return s;
}
export function crust(x, y, z) {
  CRUSTED.drop = 0; CRUSTED.top = 0; CRUSTED.slab = -1; CRUSTED.fallen = false;
  const e = edgeDistance(x, y, z);
  CRUSTED.edge = e;
  if (e >= CRUST.band) return CRUSTED;
  // The slabs are the cells of a pattern laid over the surface through a slow wander, so their sides run nearly
  // straight and are never ruler straight.
  const wx = x + 3 * perlin(x * 0.035, y * 0.035, z * 0.035) + 0.5 * perlin(x * 0.3, y * 0.3 + 3, z * 0.3);
  const wy = y + 3 * perlin(x * 0.035 + 7, y * 0.035, z * 0.035) + 0.5 * perlin(x * 0.3 + 9, y * 0.3, z * 0.3);
  const wz = z + 3 * perlin(x * 0.035, y * 0.035 + 11, z * 0.035) + 0.5 * perlin(x * 0.3, y * 0.3, z * 0.3 + 13);
  const c = cells(wx, wy, wz, CRUST.slab, 31, C1), s = slabOf(c), seam = (c.d2 - c.d1) / 2;
  const dx = x - s.c[0], dy = y - s.c[1], dz = z - s.c[2], tilt = s.g[0] * dx + s.g[1] * dy + s.g[2] * dz;
  CRUSTED.slab = s.id;
  let drop = 0, top = 0;
  if (s.fall > 0) {
    CRUSTED.fallen = true;
    drop = s.fall + tilt;
    // Blocks broken from the slabs above lie on the fallen ones: whole cells of a finer pattern, inset from their
    // sides, so each is an angular block with a flat broken top.
    const b = cells(x, y, z, CRUST.block, 91, C3), hb = hash(b.i, b.j, b.k, 92), inset = (b.d2 - b.d1) / 2;
    if (hb < 0.2 && inset > 0.9) drop -= (1.4 + 2.6 * hash(b.i, b.j, b.k, 93)) * smooth(0.9, 1.4, inset) + 0.25 * (hash(b.i, b.j, b.k, 94) - 0.5) * (b.d1 - 1);
  } else {
    top = s.heave + (s.c[0] < 0 ? 0 : tilt * 0.15);
    // Seams open between the slabs still in place, wider toward the line.
    const gap = CRUST.seam[0] + (CRUST.seam[1] - CRUST.seam[0]) * (1 - smooth(0, CRUST.band, e));
    if (seam < gap && s.es < (s.c[0] < 0 ? CRUST.mid * CRUST.dark : CRUST.mid + CRUST.slab * 0.5)) drop = (2.5 + 2.5 * hash(c.i, c.j, c.k, 86)) * smooth(0, 0.5, 1 - seam / gap);
  }
  CRUSTED.drop = Math.max(0, drop);
  CRUSTED.top = top;
  return CRUSTED;
}

// The ground's own relief, larger than the pits: long low swells, and the lumps between that the moon rakes across,
// which the dark side, the oldest ground, has worn nearly smooth.
const swell = (x, y, z) => 2.6 * fbm(x / 70, y / 70, z / 70, 3) + 1.5 * fbm(x / 26 + 3, y / 26, z / 26, 3) + (x > 0 ? 1.3 : 0.4) * Math.abs(fbm(x / 11 + 9, y / 11, z / 11, 2));

export function coarse(x, y, z) {
  let h = swell(x, y, z);
  for (const k of CR.at(x, y, z)) h += craterHeight(k, x, y, z);
  h += crackAt(x, y, z).geo;
  const c = crust(x, y, z);
  h += c.top - c.drop;
  return h * smooth(0, 6, rimDistance(y));
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
  const toward = Math.max(1 - smooth(0, GATHER, farEdge(x, y, z)), smooth(0.3, 0.72, downOf(y)));
  const bands = smooth(-0.2, 0.2, fbm(x / 90 + 4, y / 60, z / 90, 3) + 0.3 * toward);
  const knot = side > 0 ? 1 : 0.15 + 0.85 * smooth(25, 75, Math.hypot(x - KNOT[0], y - KNOT[1], z - KNOT[2]));
  return (side > 0 ? 1 : 0.35) * knot * (0.38 + 1.15 * toward ** 1.2) * (0.22 + 0.78 * bands) * (1 - 0.88 * floored(x, y, z));
}

// Pits too small for the geometry, in three sizes whose radii follow a power law within each, as craters do.
const PITS = [{ size: 14, seed: 11, r: [2, 7], keep: 0.42 }, { size: 6, seed: 23, r: [0.8, 2.8], keep: 0.42 }, { size: 2.4, seed: 37, r: [0.25, 0.95], keep: 0.5 }];
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
      const deep = 0.38 + 0.18 * hash(i, j, k, P.seed + 6);
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
  return h;
}
// How deep in a pit a place is, 0 to 1, for darkening the dust there.
export function pitted(x, y, z, side) {
  const [nx, ny, nz] = normalOf(x, y, z);
  return Math.min(1, Math.max(0, -pits(x, y, z, side, nx, ny, nz, gathered(x, y, z, side)) / 0.6));
}
export { downOf };
