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

let CUT_LINE = null;
// The pale side's edge at the tear is rounded down into the break, as thick crust is when it breaks: over how many of
// picture 9's pixels in from where the skin stops, and how far down, in units.
// The lip is round as a thick slab's broken edge is, `drop` deep at the line. As a quarter of an ellipse its last
// stretch stood edge on to the visitor and its triangles were drawn out into a fringe.
const BEVEL = { reach: 15, drop: 12 };
function bevel(x, y, z) {
  if (!CUT_LINE || x <= 0) return 0;
  const [px, py] = L.pictured(x, y, z), f = Math.min(CUT_LINE.at.length - 1.001, Math.max(0, (py - CUT_LINE.from) / CUT_LINE.step)), i = Math.floor(f);
  const d = px - (CUT_LINE.at[i] + (CUT_LINE.at[i + 1] - CUT_LINE.at[i]) * (f - i));
  if (d >= BEVEL.reach) return 0;
  const k = 1 - Math.max(0, d) / BEVEL.reach;
  return BEVEL.drop * k ** 1.7 * (1 + 0.45 * perlin(x / 23, y / 23, z / 23) + 0.15 * perlin(x / 6, y / 6, z / 6));
}
let CR = null, SG = null, ED = null, FAR = null, KNOT = [0, 0, 0], SL = null;
// How a crack's light is measured: its spill runs this many of its half widths past its lip, plus this far, as a
// faint even light on the rock right beside it. The knot's pool is not here: the shader lights the rock round the
// knot as from one source (skin.ts), since a pool worked out in the map from the faces turned to the cleft landed on
// the lumps as ragged tongues, which read as flame.
const SPILL = { per: 0.12, base: 0.6, reach: 3, strength: 0.16 };
// A lit crack is never drawn narrower than this half width, in units (a little under a texel of the map each side):
// narrower, it fell between the map's texels and broke into dashes. A crack thinner than this is drawn this wide and
// dimmer by its share of it, so its ends taper in light to a hairline.
const MINW = 0.5;
// The torn edge's broken crust: chunks of very different lengths along the line (len, units, most of them short),
// each running `depth` in from it. A chunk's broken face stands back from the line by `ofs`; some are let down by
// `drop` and lean toward the hollow by `lean`; between them the crust is split by a crack `gap` wide at the face and
// `cut` deep. A seam laid on a pattern of cells drew a net of straight tiles, and slabs of one size a row of equal
// steps. `band` is how far in from the line any of it reaches, `reach` how far the line is looked for (the broken
// ground in the crust's shadow runs further than the chunks), `layer` how thick the pale top is in section, `chips`
// how far in the small chips that show the red brown under it run, `dark` how much less the dark side is broken,
// and `knot` how far round the cracks' knot the rock is whole.
export const CRUST = { len: [9, 95], band: 48, reach: 80, layer: 3.2, chips: 30, dark: { ofs: 0.35, drop: 0.55 }, knot: 62 };
const rngOf = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function chunked(total, seed) {
  const R = rngOf(seed), out = [];
  for (let s = -30; s < total + 30;) {
    const len = CRUST.len[0] * (CRUST.len[1] / CRUST.len[0]) ** (R() ** 1.5), v = R();
    // Thick slabs that broke off and stepped down: a few barely moved, most a step, a few a long way.
    const drop = v < 0.3 ? 0.4 * R() : v < 0.72 ? 2.5 + 4 * R() : 7 + 9 * R();
    out.push({
      from: s, to: s + len, len,
      ofs: R() < 0.55 ? 2.4 * R() : 3 + 9 * R(),
      // A slab let down tips: most toward the hollow, some up at their broken edge, which is what turns their tops
      // to the moon.
      drop, lean: drop > 1 ? (R() < 0.6 ? -1 : 1) * (0.04 + 0.1 * R()) : 0.02 * R(),
      depth: Math.min(40, Math.max(9, len * (0.4 + 0.55 * R()))),
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

export function setup({ craters, segs, edges, knot, slab, cut }) {
  if (knot) KNOT = knot;
  CUT_LINE = cut ?? null;
  SL = slab ?? null;
  CR = new Grid();
  for (const c of craters) { const e = c.r * 3.5 * (c.stretch ?? 1); CR.add([c.c[0] - e, c.c[1] - e, c.c[2] - e], [c.c[0] + e, c.c[1] + e, c.c[2] + e], c); }
  SG = new Grid();
  for (const s of segs) {
    const e = Math.max(MINW, s.wa, s.wb) * (1.4 + SPILL.per * SPILL.reach) + SPILL.base * SPILL.reach + 1.5;
    s.d = [s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]];
    s.l2 = s.d[0] ** 2 + s.d[1] ** 2 + s.d[2] ** 2 || 1e-9;
    SG.add([Math.min(s.a[0], s.b[0]) - e, Math.min(s.a[1], s.b[1]) - e, Math.min(s.a[2], s.b[2]) - e], [Math.max(s.a[0], s.b[0]) + e, Math.max(s.a[1], s.b[1]) + e, Math.max(s.a[2], s.b[2]) + e], s);
  }
  ED = new Grid();
  FAR = new Grid();
  for (const side of ['left', 'right']) edges[side].forEach((p, i) => {
    if (i % 2 === 0) ED.add([p[0] - CRUST.reach, p[1] - CRUST.reach, p[2] - CRUST.reach], [p[0] + CRUST.reach, p[1] + CRUST.reach, p[2] + CRUST.reach], p);
    if (i % 16 === 0) FAR.add([p[0] - GATHER, p[1] - GATHER, p[2] - GATHER], [p[0] + GATHER, p[1] + GATHER, p[2] + GATHER], p);
  });
  CH = { left: chunked(edges.left[edges.left.length - 1][3], 9101), right: chunked(edges.right[edges.right.length - 1][3], 4507) };
}

// How far a place is from the torn line, along the surface (within the band; past it, the band), and the nearest
// point of the line (NEAREST).
export const NEAREST = [0, 0, 0, 0];
export function edgeDistance(x, y, z) {
  let best = CRUST.reach * CRUST.reach;
  for (const p of ED.at(x, y, z)) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2; if (d < best) { best = d; NEAREST[0] = p[0]; NEAREST[1] = p[1]; NEAREST[2] = p[2]; NEAREST[3] = p[3]; } }
  return Math.sqrt(best);
}
export function farEdge(x, y, z) {
  let best = GATHER * GATHER;
  for (const p of FAR.at(x, y, z)) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2; if (d < best) best = d; }
  return Math.sqrt(best);
}
const rimDistance = (y) => -RIM - y;
// How far past the rock's torn line a place on the dark side is, in picture 9's pixels, where the crust's great slab
// runs on out over the hollow at the top (features.mjs, SLAB); null where there is no slab.
export function slabbed(x, y, z) {
  if (!SL || x >= 0) return null;
  const [px, py] = L.pictured(x, y, z);
  if (py < SL.from || py > SL.to) return null;
  const f = Math.min(SL.at.length - 1.001, (py - SL.from) / SL.step), i = Math.floor(f);
  return px - (SL.at[i] + (SL.at[i + 1] - SL.at[i]) * (f - i)) - slabWander(py);
}
// The slab's break from the dark skin wanders across the rock's smoothed torn line, so it is not ruler straight. The
// shader draws the same line (skin/shaders.ts, skinTornAt), so the two must stay alike.
export const slabWander = (py) => 2.2 * Math.sin(py * 0.37 + 1.3) + 1.3 * Math.sin(py * 0.83 + 0.4) + 0.7 * Math.sin(py * 2.1 + 2.2);
// How far down the planet a place is, 0 at the rim and 1 at its foot.
const downOf = (y) => Math.min(1, Math.max(0, (-RIM - y) / L.WORLD.deep));

// ---------------------------------------------------------------------------------------------------------------
// A crater's height by how far out from its middle a place is (x1, in shares of its radius). A small one is a bowl
// whose wall steepens toward its lip (BOWL, the power of its profile): a round bowl lit at a grazing angle drew its wall
// turned to the moon as a pale tent, where picture 9's small craters are dark holes with a thin lit rim.
const BOWL = 3.2;
function profile(k, x1, phi, x, y, z, reach) {
  let h;
  if (x1 < 1) {
    if (k.floor > 0) {
      if (x1 < k.floor) {
        // The floor: low hummocks over it, and at its middle a small cluster of hills.
        const hill = k.bump * (Math.exp(-((x1 / 0.13) ** 2)) + 0.55 * Math.exp(-(((x1 - 0.12) / 0.07) ** 2)) * (0.5 + 0.5 * Math.sin(3 * phi + k.phase)));
        // Only broad ones: finer hummocks than the mesh holds came out as crumpled foil.
        h = -k.depth * (1 - hill) + k.depth * k.hummock * fbm(x * 0.07 + k.seed, y * 0.07, z * 0.07, 2) * smooth(0, 0.25, k.floor - x1 + 0.05);
      } else {
        // The wall rises smoothly from the floor and steepest under the crest, so the lip is sharp. A large crater's
        // wall has slumped in terraces: broken ledges whose edges wander and fade round it, never whole rings.
        const u = (x1 - k.floor) / (1 - k.floor);
        let w = u ** 1.85;
        if (k.terraces) {
          const wander = 0.07 * perlin(phi * 1.7 + k.seed, x1 * 3, 1.3), keep = smooth(-0.15, 0.35, perlin(phi * 2.3 + 4.1, k.seed, 0.7)) * k.slump;
          const N = k.terraces + 1, v = Math.min(1, Math.max(0, u + wander)) * N, f = v - Math.floor(v);
          const stair = (Math.floor(v) + smooth(0.55, 1, f)) / N;
          w = w + (stair ** 1.85 - w) * keep;
        }
        h = -k.depth + (k.depth + k.rim) * w + k.rim * 0.12 * perlin(x * 0.11 + k.seed, y * 0.11, z * 0.11) * Math.sin(Math.PI * w);
      }
    } else h = -k.depth + (k.depth + k.rim) * x1 ** BOWL;
  } else {
    const o = x1 - 1;
    // The rim stands up from the ground round it on a broad outer flank, so the crater reads raised and not cut.
    h = k.rim * Math.exp(-o * k.flank) * (1 - smooth(reach - 1, reach, x1));
    // A broad trough round the rampart's foot, which the rampart throws its shadow into on the side from the moon:
    // picture 9's large crater stands in a dark moat.
    if (k.moat) h -= k.moat[0] * k.r * Math.exp(-(((o - k.moat[1]) / k.moat[2]) ** 2));
    // Ejecta: a hummocky blanket round the rim of a large crater.
    // On the large named ones it is broad and low: steep hummocks there came out as faceted tents.
    if (k.r > 9) h += k.rim * (k.terraces ? 0.12 : 0.35) * Math.exp(-o * 1.6) * (1 - smooth(1.5, 2.6, x1)) * perlin(x * (k.terraces ? 0.07 : 0.16) + k.seed, y * (k.terraces ? 0.07 : 0.16), z * (k.terraces ? 0.07 : 0.16));
  }
  return h;
}

// A crater's height at a place.
function craterHeight(k, x, y, z) {
  const dx = x - k.c[0], dy = y - k.c[1], dz = z - k.c[2], dn = dx * k.n[0] + dy * k.n[1] + dz * k.n[2];
  const tx = dx - dn * k.n[0], ty = dy - dn * k.n[1], tz = dz - dn * k.n[2];
  // A crater may be drawn out round the planet (stretch), where the planet turns from the visitor and would otherwise
  // draw it narrower than picture 9 has it.
  const cu = (tx * k.e1[0] + ty * k.e1[1] + tz * k.e1[2]) / (k.stretch ?? 1), cv = tx * k.e2[0] + ty * k.e2[1] + tz * k.e2[2], d = Math.hypot(cu, cv);
  const reach = k.flank < 2 ? 3.4 : 2.6;
  if (d > k.r * reach) return 0;
  const phi = Math.atan2(cv, cu);
  const rr = k.r * (1 + k.lumpy * (0.55 * Math.sin(3 * phi + k.phase) + 0.3 * Math.sin(5 * phi + 2.1 * k.phase) + 0.15 * Math.sin(11 * phi + 0.7 * k.phase)));
  const x1 = d / rr;
  // A large crater's crest is rounded over `crest` of its radius each side, so it reads as a raised rampart the moon
  // lights along, not as a cut edge with the floor stamped inside it.
  const c = k.crest ?? 0;
  let h;
  if (c > 0 && Math.abs(x1 - 1) < c) {
    const sAt = (x1 - (1 - c)) / (2 * c), h0 = profile(k, 1 - c, phi, x, y, z, reach), h2 = profile(k, 1 + c, phi, x, y, z, reach);
    h = (1 - sAt) ** 2 * h0 + 2 * sAt * (1 - sAt) * k.rim + sAt ** 2 * h2;
  } else h = profile(k, x1, phi, x, y, z, reach);
  if (k.worn) h *= 0.85 + 0.15 * perlin(x * 0.2, y * 0.2, z * 0.2);
  return h;
}

// The cracks near a place: the depth of the cleft (both the geometry's part and the map's), its light, and which
// way the nearest lit cleft lies along the surface (to).
// A cleft is a V: `in` is how deep in it a place is (1 on its floor), `heat` the heat of the lit cleft it is in,
// `side` which wall it is on (the unit vector from the place toward the cleft's middle line, along the surface:
// the map's worker lights the wall that faces the visitor). Beside a lit cleft its light lies on the rock: `spill`
// close to the lip, and `pool` round the hottest lengths, each with the point of the cleft it comes from (`from`).
const CK = { geo: 0, fine: 0, in: 0, heat: 0, dim: 1, side: [0, 0, 0], spill: 0, pool: 0, from: [0, 0, 0], fromW: 0 };
function crackAt(x, y, z) {
  CK.geo = 0; CK.fine = 0; CK.in = 0; CK.heat = 0; CK.dim = 1; CK.spill = 0; CK.pool = 0;
  let wet = 1, best = 0;
  // The lips are broken: the width wanders slowly, and at a finer grain by small bites.
  const jag = perlin(x * 0.42, y * 0.42, z * 0.42), bite = perlin(x * 2.1 + 5, y * 2.1, z * 2.1);
  // The light is not even along a crack: it runs hotter where the cleft is deep and dims where it nearly closes.
  const flare = 0.74 + 0.26 * (0.5 + 0.5 * perlin(x * 0.11 + 3, y * 0.11, z * 0.11)) + 0.12 * perlin(x * 0.5, y * 0.5 + 7, z * 0.5);
  for (const s of SG.at(x, y, z)) {
    const px = x - s.a[0], py = y - s.a[1], pz = z - s.a[2];
    const t = Math.min(1, Math.max(0, (px * s.d[0] + py * s.d[1] + pz * s.d[2]) / s.l2));
    const cx = s.d[0] * t - px, cy = s.d[1] * t - py, cz = s.d[2] * t - pz, d = Math.hypot(cx, cy, cz);
    const w0 = s.wa + (s.wb - s.wa) * t, h0 = s.ha + (s.hb - s.ha) * t, heat = h0 >= 0.95 ? h0 : Math.min(1, h0 * flare);
    // The lips are bitten only where the cleft is wide enough for a bite to show: on a thin one it cut it into dashes.
    const wd = w0 * (0.84 + 0.26 * jag + 0.1 * Math.max(-0.3, bite) * smooth(0.6, 1.4, w0));
    const w = h0 > 0 ? Math.max(MINW, wd) : Math.max(0.3, wd), dim = h0 > 0 ? Math.min(1, wd / MINW) ** 0.85 : 1;
    const reach = w * (1 + SPILL.per * SPILL.reach) + SPILL.base * SPILL.reach;
    if (d > reach) continue;
    if (d < w) {
      const v = -(2.4 * w + 0.3) * (1 - d / w) ** 0.8, g = smooth(GEO[0], GEO[1], w0), inn = 1 - d / w;
      CK.geo = Math.min(CK.geo, v * g);
      CK.fine = Math.min(CK.fine, v * (1 - g));
      if (inn > CK.in) {
        CK.in = inn;
        CK.heat = heat;
        CK.dim = dim;
        if (d > 1e-4) { CK.side[0] = cx / d; CK.side[1] = cy / d; CK.side[2] = cz / d; } else CK.side[0] = CK.side[1] = CK.side[2] = 0;
      }
    }
    if (heat > 0) {
      const out = Math.max(0, d - w), sp = heat * dim * SPILL.strength * Math.exp(-out / (SPILL.base + SPILL.per * w));
      wet *= 1 - Math.min(0.999, sp);
      // The light here comes from the nearest lit cleft that gives the most.
      if (sp > best) { best = sp; CK.from[0] = x + cx; CK.from[1] = y + cy; CK.from[2] = z + cz; CK.fromW = w; }
    }
  }
  CK.spill = 1 - wet;
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
  const top = Math.max(-1.2, drop + lean * Math.max(0, c.depth - e) + kk * c.twist * (s - mid) * Math.min(1, c.len / 20) * 0.4);
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
  if (hb > 0.06 + 0.16 * near) return 0;
  // Rounded hollows, not cells cut out whole: cut out whole they laid a net of small tiles along the line.
  const r = 1.2 + 1.4 * hash(c.i, c.j, c.k, 54);
  return (0.5 + 1.1 * hash(c.i, c.j, c.k, 53)) * (1 - smooth(r * 0.45, r, c.d1)) * smooth(0.1, 0.6, inset) * near;
}
const C3 = {};

// The ground's own relief, larger than the pits: long low swells, and the lumps between that the moon rakes across,
// which the dark side, the oldest ground, has worn nearly smooth.
// The ridges of an absolute noise drew small creased tents over the open ground: the lumps are rounded.
const swell = (x, y, z) => 2.6 * fbm(x / 70, y / 70, z / 70, 3) + 1.5 * fbm(x / 26 + 3, y / 26, z / 26, 3) + (x > 0 ? 0.9 * fbm(x / 13 + 9, y / 13, z / 13, 2) : 0.4 * Math.abs(fbm(x / 11 + 9, y / 11, z / 11, 2)));

// The top of the skin, under the land's edge: a rounded, crumbly shoulder that turns in under it (how far down from
// the rim it rounds, and how far in it is at the rim), with the ground's lumps kept down for `under` units, where the
// land's sand lies over it, so nothing of it stands above the land. A ledge laid along it at one depth drew a ridge
// right round the planet like a seam on a pot, and is gone. `shade` is how far under the rim the sand's lip shades it.
export const SHOULDER = { round: 16, in: 11, under: 52, shade: [10, 30] };
// On the pale side the top is a thick rounded lip of the crust that stands out over the foot of the land's sand drape,
// so the two meet along the lip's own smooth crest and not along the drape's ragged foot: how far out it stands (and
// how much that wanders round the rim), how far under the rim its crest is, how far down it runs on the open side and
// how much further by the tear, where picture 9's lip is thickest and waves down, and how far it is tucked under the
// land at the rim.
// It is broken, not turned: in chunks some 13 units across, each standing out its own way and with its crest a little
// higher or lower than the next (ragged, units), and toward the tear its crest dips (dip, units) with the ground above
// it tucked back under the sand, as picture 9's lip dips to about 293 down near 1110 across.
export const LIP = { out: 3.4, wander: 0.4, crest: 6, down: 40, tear: 26, tuck: 2.5, chunk: 13, ragged: 3, dip: 12 };
// Bites knocked out of the dark side where it turns from the visitor, so its outline is broken and not a lathe's arc:
// two grains of them (the spacing of their cells, how many of the cells hold one, their radii and depths, in units),
// each a scoop with a flat floor and a steep wall, and how near edge on the surface must be for them to be cut (the
// planet's normal toward the visitor, from and to).
const BITES = { on: false, grains: [{ size: 34, keep: 0.5, r: [9, 17], deep: [2.5, 6.5], seed: 71 }, { size: 13, keep: 0.3, r: [3.5, 7], deep: [0.8, 1.8], seed: 83 }], edgeOn: [0.12, 0.36] };
function bites(x, y, z) {
  const n = normalOf(x, y, z), on = 1 - smooth(BITES.edgeOn[0], BITES.edgeOn[1], n[2]);
  if (on <= 0) return 0;
  let h = 0;
  for (const g of BITES.grains) {
    const c = cells(x, y, z, g.size, g.seed, C3);
    if (hash(c.i, c.j, c.k, g.seed + 3) > g.keep) continue;
    const u = hash(c.i, c.j, c.k, g.seed + 4), r = g.r[0] + (g.r[1] - g.r[0]) * u, deep = g.deep[0] + (g.deep[1] - g.deep[0]) * hash(c.i, c.j, c.k, g.seed + 5);
    const d = c.d1 * (1 + 0.25 * perlin(x / 4.1, y / 4.1, z / 4.1));
    h = Math.max(h, deep * (1 - smooth(r * 0.55, r, d)));
  }
  return h * on;
}
export function coarse(x, y, z) {
  let h = swell(x, y, z) * (1 - 0.8 * floored(x, y, z));
  // The dark side's outline is left whole: bitten, its edges caught the rim light as a dotted line of scaly flakes.
  if (x < 0 && BITES.on) h -= bites(x, y, z);
  for (const k of CR.at(x, y, z)) h += craterHeight(k, x, y, z);
  // A cleft shallows out as it reaches the line, so it is not cut on down the crust's broken face.
  const ck = crackAt(x, y, z);
  h += ck.geo * smooth(0.5, 3.5, edgeDistance(x, y, z));
  // Round the hot lengths the rock is broken into lumps by the heat, so the light from the cleft lands on their faces
  // turned to it and not on an even dark: spread evenly it read as a smudge of airbrush.
  if (ck.pool > 0.01) h += Math.min(1, ck.pool * 3) * (1.6 * fbm(x * 0.17 + 3, y * 0.17, z * 0.17, 2) + 0.5 * Math.abs(fbm(x * 0.45, y * 0.45 + 5, z * 0.45, 2)));
  // The slab stands a little proud of the dark skin it broke from, its weathered top lumpy, with the break between
  // them a dark crack along the rock's torn line.
  const sd = slabbed(x, y, z);
  if (sd !== null) {
    h += smooth(-0.4, 2.2, sd) * (1.8 + 1.1 * perlin(x / 7.3, y / 7.3, z / 7.3) + 0.5 * Math.abs(perlin(x / 2.2, y / 2.2, z / 2.2)));
    h -= 4.5 * Math.max(0, 1 - Math.abs(sd - 0.8 + 0.5 * perlin(y / 3.1, z / 3.1, 2.7)) / 1.2);
  }
  const rd = rimDistance(y);
  h = h > 0 ? h * smooth(SHOULDER.under * 0.72, SHOULDER.under, rd) : h * (0.45 + 0.55 * smooth(6, SHOULDER.under * 0.9, rd));
  if (x > 0) {
    h -= bevel(x, y, z);
    const near = 1 - smooth(15, 110, farEdge(x, y, z)), down = LIP.down + LIP.tear * near;
    const c = cells(x + 3 * perlin(x / 11, y / 11, z / 11), y, z, LIP.chunk, 91, C3), hc = hash(c.i, c.j, c.k, 92), hd = hash(c.i, c.j, c.k, 93);
    const crest = Math.max(2, LIP.crest + LIP.dip * near + (hd - 0.5) * LIP.ragged);
    const out = LIP.out * (1 + LIP.wander * fbm(x / 47 + 2, y / 31, z / 47, 2) * 2) * (0.7 + 0.6 * hc);
    h += out * smooth(-1, crest, rd) * (1 - smooth(down * 0.4, down, rd)) - LIP.tuck * (1 - smooth(0, 2.5, rd)) - 2.2 * near * (1 - smooth(crest * 0.4, crest, rd));
    return h;
  }
  // and a little under the sand's drape, all the way down it, so no lump of the skin shows through the sand.
  h -= 0.9 * (1 - smooth(SHOULDER.under * 0.6, SHOULDER.under * 0.78, rd));
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
    const tx = dx - dn * k.n[0], ty = dy - dn * k.n[1], tz = dz - dn * k.n[2];
    const d = Math.hypot((tx * k.e1[0] + ty * k.e1[1] + tz * k.e1[2]) / (k.stretch ?? 1), tx * k.e2[0] + ty * k.e2[1] + tz * k.e2[2]);
    f = Math.max(f, 1 - smooth(0.8, 1.12, d / k.r));
  }
  return f;
}
// How thickly the small pits lie at a place, about 0 to 1.6: gathered in fields toward the torn line and down toward
// the lower limb, with broad bands of smooth dust between, and few on crater floors.
export function gathered(x, y, z, side) {
  const toward = Math.max(0.8 * (1 - smooth(0, GATHER, farEdge(x, y, z))), smooth(0.3, 0.72, downOf(y)));
  const bands = smooth(-0.2, 0.2, fbm(x / 90 + 4, y / 60, z / 90, 3) + 0.3 * toward);
  const knot = side > 0 ? 1 : 0.5 + 0.5 * smooth(25, 75, Math.hypot(x - KNOT[0], y - KNOT[1], z - KNOT[2]));
  // On the crust's chunks by the line fewer: their tops are its old weathered top, broken and chipped, not pitted.
  // On the pale side the crust's own top wraps the break, pitted as the ground is right to its edge.
  const crustTop = side > 0 ? 1 : 0.3 + 0.7 * smooth(8, 36, edgeDistance(x, y, z));
  // Pitted all over, densest by the break and toward the lower limb, as picture 9's pale side is.
  return (side > 0 ? 1 : 0.35) * knot * crustTop * (0.42 + 0.75 * toward ** 1.3) * (0.5 + 0.5 * bands) * (1 - floored(x, y, z));
}

// Pits too small for the geometry, in three sizes whose radii follow a power law within each, as craters do.
const PITS = [{ size: 15, seed: 11, r: [2.4, 8], keep: 0.3 }, { size: 6.5, seed: 23, r: [0.9, 3], keep: 0.4 }, { size: 2.6, seed: 37, r: [0.3, 0.95], keep: 0.42 }];
// Each pit has an age: a fresh one is deep with a sharp raised lip, an old one shallow and worn soft, and most are
// between (AGE: the share of each, and how deep and how high its lip is against a middling one). Toward the lower limb
// some are drawn out down the slope into gouges and scars (GOUGE: from and to how far down, how many of them, how far).
const AGE = { fresh: 0.16, worn: 0.38, deep: [1.35, 0.45], lip: [1.8, 0.3] }, GOUGE = { from: 0.42, to: 0.85, share: 0.55, most: 2.6 };
function pits(x, y, z, side, nx, ny, nz, density) {
  let h = 0;
  const ex0 = nz, ez0 = -nx, el0 = Math.hypot(ex0, ez0) || 1, e1 = [ex0 / el0, 0, ez0 / el0];
  const e2 = [ny * e1[2], nz * e1[0] - nx * e1[2], -ny * e1[0]];
  const gouge = side > 0 ? smooth(GOUGE.from, GOUGE.to, downOf(y)) : 0;
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
      // Each pit a little out of round, and a little deeper on one side; low down some are drawn out into gouges.
      const lop = 1 + 0.16 * Math.sin(3 * Math.atan2(ey, ex + ez) + 6.28 * hash(i, j, k, P.seed + 5));
      const long = 1 + (GOUGE.most - 1) * gouge * (hash(i, j, k, P.seed + 8) < GOUGE.share ? 1 : 0) * hash(i, j, k, P.seed + 9);
      const c1 = ex * e1[0] + ey * e1[1] + ez * e1[2], c2 = ex * e2[0] + ey * e2[1] + ez * e2[2];
      const xr = Math.hypot(c1, c2 / long) / (r * lop);
      if (xr > 1.9) continue;
      // Shallow enough that the wall turned to the moon is lit as a crescent, with a raised lip round it; how deep and
      // how sharp by its age.
      const age = hash(i, j, k, P.seed + 7), fresh = age < AGE.fresh, worn = age > 1 - AGE.worn;
      const deep = (0.3 + 0.22 * hash(i, j, k, P.seed + 6)) * (fresh ? AGE.deep[0] : worn ? AGE.deep[1] : 1), lip = 0.16 * (fresh ? AGE.lip[0] : worn ? AGE.lip[1] : 1);
      const wall = worn ? 1.5 : fresh ? 3 : 2.4;
      h += xr < 1 ? -deep * r + (deep + lip) * r * xr ** wall : lip * r * Math.exp(-(xr - 1) * (worn ? 2.5 : 4.5));
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
  const sd = side < 0 ? slabbed(x, y, z) : null;
  if (sd !== null && sd > -1) {
    // The slab's weathered top is the pale crust's own ground: pitted and lumpy.
    const k = smooth(-1, 2, sd);
    h += k * (pits(x, y, z, 1, nx, ny, nz, 1.1) + 0.45 * fbm(x * 0.3 + 2, y * 0.3, z * 0.3, 2) + 0.25 * Math.abs(fbm(x * 0.9, y * 0.9 + 3, z * 0.9, 2)));
  } else if (side < 0) {
    // The dark side is the oldest surface: weathered in long streaks down it, and roughened.
    const ex = nz, ez = -nx, el = Math.hypot(ex, ez) || 1, a = (x * ex + z * ez) / el;
    h += 0.3 * fbm(a * 0.5, y * 0.05, 7.7, 3) + 0.12 * Math.abs(fbm(a * 1.6, y * 0.12, 3.1, 2)) + 0.08 * fbm(x * 1.7, y * 1.7, z * 1.7, 2);
  }
  const ck = crackAt(x, y, z);
  h += ck.fine;
  h -= chips(x, y, z);
  return h;
}
// How deep in a pit a place is, 0 to 1, for darkening the dust there.
export function pitted(x, y, z, side) {
  const [nx, ny, nz] = normalOf(x, y, z);
  if (side < 0 && (slabbed(x, y, z) ?? -9) > -1) return Math.min(1, Math.max(0, -pits(x, y, z, 1, nx, ny, nz, 1.1) / 0.6));
  return Math.min(1, Math.max(0, -pits(x, y, z, side, nx, ny, nz, gathered(x, y, z, side)) / 0.6));
}
export { downOf };
