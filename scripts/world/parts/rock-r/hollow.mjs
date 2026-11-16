// Sculpt R, round 5: the hollow as a field for the surface maker (scripts/world/lib/surface.mjs), under 0 inside the
// rock. Three things, as picture 9 has them:
//   round the core, a rim of four thick slabs leaning in with black gaps between them (RIM, round 8: it was a
//     smooth bowl with a clean circular rim);
//   a few great slabs: each block's face is a fan of large cells round the core, each ONE plane leaning in to the
//     core with fine laminations running its length, the cells stepping down outward like shingles so every step
//     between them faces away from the core and is dark (FAN, LAMINAE), knapped only at their edges, in
//     conchoidal scars of three sizes (DENTS);
//   black: what is not a block is the backing, far behind and out of the core's reach.
// Behind everything the backing, the cave's inner shell, far back and closed. All of it is kept inside the planet,
// under the land, inside what of the picture is the rock, and out of the stream's lane.
//
//   args = plan() of blocks.mjs, with stones added by the make script
import { L } from '../../lib/plan.mjs';
import { below } from '../land/shape.mjs';

export const lip = 2.5;
// How far a block's broken sides run along the line of sight rather than square to its face: square, a plate shows
// its whole thickness at its outer side; along the line of sight, none of it. A side is its outline drawn out along
// the line, so seen broad it shows every kink of the traced outline as a ruled stripe: a plate leaning hard in to the
// core showed little but its side, as a comb (round 5).
// Round 6: far more square than round 5's, so a slab shows the visitor a dark side several units deep along its outer
// torn edge, away from the core, and reads as a slab and not as a sheet of paper.
export const SIDES = { plate: 0.2, floor: 0.15, shade: 0.3, roof: 0.34, frame: 0.4, belly: 0.2 };
// One of the picture's pixels in the world's units, near enough everywhere in the hollow.
const UNIT = L.PICTURE.unit;
// The beds in a block's broken sides: how thick each is, and how far one stands out or in from the next, in units.
export const BEDS = { thick: [5, 34], step: 1.4, lean: 0.08, warp: 9 };
// The bedding: the rock's layers, a plane of each block's own (along its length on its face, tilted out of the face by
// `tilt` radians, either way; level in the roof's crust), in layers `thick` units thick, each standing proud of or
// sunk behind its neighbours by up to `deep` units, so that at every parting there is a step: one lip lit, the riser
// in shade or lit by which way it faces. A step pinches out along its length over about `pinch` units, so the
// partings are of very different lengths. `share` of the blocks of a kind are bedded at all: the rest are clean. The
// riser's slope, rise over run, is `steep`.
// Round 8: no block is bedded. Its partings ran parallel across every face, as tree rings round the ball and as sliced
// timber on the tall slabs at the right.
export const BEDDING = {
  plate: { share: 0, thick: [7, 30], deep: [0.8, 3.6], tilt: [0.25, 0.7], pinch: 70, steep: 1.6 },
  floor: { share: 0, thick: [6, 18], deep: [1.5, 4.5], tilt: [0.5, 0.9], pinch: 90, steep: 1.6 },
  roof: { share: 0, thick: [7, 20], deep: [2.5, 7], tilt: [0, 0], pinch: 80, steep: 1.6, level: true },
  frame: { share: 0, thick: [9, 34], deep: [1, 4], tilt: [0.3, 0.8], pinch: 70, steep: 1.6 },
  belly: { share: 0, thick: [6, 16], deep: [1.5, 4], tilt: [0.4, 0.9], pinch: 60, steep: 1.6 },
};
// The fan of cells a block's face is broken into, round the core: how wide a wedge is (radians), how far apart its
// breaks across are (pixels), how far each cell leans in toward the core and twists (degrees), where the first cell
// of a wedge stands from the face (units), how far each cell drops below the one inside it at their break (units),
// how steep that drop's face is (rise over run: it faces away from the core), how much a cell's face is dished in
// (a shell shaped break) or swells, so the light falls across it, how far the wedges curl (radians for
// each 100 pixels across, mirrored either side of the core, so they lean as picture 9's do).
export const FAN = {
  all: { wedge: [0.26, 0.5], ring: [80, 150], lean: [5, 13], twist: 5, sunk: [-8, 4], drop: [8, 17], dish: 0.0011, steep: 1.3, spiral: 0.22, slant: 0.45, rise: 16, range: [-22, 12] },
  frame: { wedge: [0.16, 0.34], ring: [55, 120], lean: [-4, 12], twist: 10, drop: [1, 4], scars: 0.4 },
  roof: { wedge: [0.22, 0.42], ring: [60, 120], lean: [2, 9], twist: 8, drop: [5, 12] },
  floor: { wedge: [0.2, 0.36], ring: [50, 100], lean: [2, 8], drop: [5, 10] },
  belly: { wedge: [0.2, 0.36], ring: [40, 90], lean: [-4, 6], twist: 10, drop: [4, 10] },
  shade: { drop: [4, 10] },
};
// Round 8: every cell of a face is broken again, lightly, by a few long fractures that cross at angles of their own
// (round 7's, at a share `k` of round 7's strength, and with no piece missing): `lines` of them, least and most, each
// passing within `spread` units of the cell's middle; `least` of them stop part way; each wanders `warp` units over
// `warpOver`. Each piece is tilted `tilt` degrees its own way and stands `step` proud or sunk, and the arris between two
// is worn round over `round` units, its face `steep`. `k` is the strength for a block that does not set its own.
export const SUB = { lines: [2, 4], spread: 26, least: 0.5, warp: 2.5, warpOver: 21, tilt: [1.5, 5.5], step: 2.2, round: 1.8, steep: 1.5, k: 0.35 };
// The laminations on a slab's face: grooves running its length, how far apart (units, each its
// own), how wide and deep, the share left out, and how far one lamina stands from the next.
export const LAMINAE = { apart: 13, jitter: 0.9, half: 1.7, deep: [0.4, 1.1], gone: 0.45, offset: 0.25, pinch: 40 };
// The knapped scars at a face's edges: three sizes, each a concave shell scar, how far in from the edge it reaches
// and how deep at the edge, in units. The smallest only at the very edge.
// Round 6: the smallest, which scalloped every edge into a torn paper fringe, is gone, and the middle one is shallower.
export const DENTS = [
  { size: 20, band: 26, deep: 5 },
  { size: 9, band: 10, deep: 1.4 },
];
// Kept so the old probes still run: round 5 has no knapped facets inside a face.
export const FACETS = { tilt: [0, 0], steep: [0, 0], jitter: 0, lift: 0, dish: [0, 0] };
// A broken face is never flat: a slow swell, in units, and over how far.
export const SWELL = { deep: 1.1, over: 85 };
// The backing: how far behind the core's middle it is straight behind the core, and how much further back it goes
// for each pixel out from the core, and the furthest back it goes (inside the space the hollow is made in).
export const BACKING = { at: -95, back: 0.32, from: 100, thick: 70, least: -205, deep: -268 };
// The core's clearance: nothing nearer its middle than this, in units, give or take a ragged few, and nothing in
// front of it inside its outline.
export const CLEAR = { r: 116, rag: 12, disc: 101, open: 0.3 };
// Round 8: the bowl is no longer one dish with a clean circular rim. It is four thick slabs leaning in, each one plane
// whose face is turned to the core and broken by fractures (`pieces`, their strength), standing proud of the rock
// beyond its outer edge, with a dark side there, and cut by gaps whose floor falls away from the core, so they are
// black to the ball (one gap falls inside the lowest slab, so there are five pieces). Each slab: the bearings it
// spans in the picture (degrees, from across to the right, turning down), how far behind the core's middle its face is
// at the ball's edge (units), how steeply it rises toward the visitor going out (its lean in to the core), how far out
// it reaches (core radii), and a twist across it. A gap: its middle bearing and its width at the ball (degrees), and
// how it wanders. The side: how far out a slab's outline moves for each unit behind its face, so its outer side is
// seen and faces from the core. The gap's floor: how far behind the core's middle at the ball and how fast it falls.
export const RIM = {
  slabs: [
    { from: 35, to: 140, back: 100, rise: 0.55, reach: 1.24, twist: 0.3 },
    { from: 140, to: 222, back: 64, rise: 1.1, reach: 1.3, twist: -0.3 },
    { from: 222, to: 275, back: 92, rise: 0.7, reach: 1.22, twist: 0.38 },
    { from: 275, to: 395, back: 82, rise: 0.95, reach: 1.28, twist: -0.22 },
  ],
  gaps: [{ at: 35, wide: 17 }, { at: 98, wide: 14 }, { at: 140, wide: 21 }, { at: 222, wide: 23 }, { at: 275, wide: 19 }],
  rag: 4, side: 0.4, thick: 46, pieces: 2, floor: { back: 82, fall: 1.6 },
};
// Right of `from` (units across), rock standing in front of the land's edge falls away forward by `fall` under it,
// and so does every block tucked under the land (the roof's lid and teeth) wherever it is.
export const BEVEL = { from: 200, fall: 2.5 };
// The stream's lane: nothing nearer the visitor than this behind the stream's line, and how far the bay round it
// widens toward the visitor for each unit nearer.
export const LANE = { z: 128, half: 12, widen: 0.85, top: -296 };

let A = null;

// The land's front edge, eased over a few tens of units: the plan's own is a line of straight runs, and a block that
// falls away under it showed each corner as a dead straight seam (one ran down the roof at the middle, round 5).
const lipSoft = (x) => { let a = 0; for (let k = -4; k <= 4; k++) a += L.lip(x + k * 9); return a / 9; };
const frontZ = (x) => Math.min(lipSoft(x), Math.sqrt(Math.max(0, L.WORLD.half ** 2 - x * x)));

const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const TAU = Math.PI * 2;

// A distance stored on a grid in the picture's pixels, read between samples.
export function sample(o, px, py) {
  const fx = (px - o.x0) * o.by - 0.5, fy = (py - o.y0) * o.by - 0.5;
  const x = Math.floor(fx), y = Math.floor(fy);
  if (x < 0 || y < 0 || x >= o.w - 1 || y >= o.h - 1) {
    const cx = Math.min(o.w - 1, Math.max(0, x)), cy = Math.min(o.h - 1, Math.max(0, y));
    return o.sd[cx + cy * o.w] + Math.hypot(fx - cx, fy - cy) / o.by;
  }
  const u = fx - x, v = fy - y, i = x + y * o.w, s = o.sd;
  return (s[i] * (1 - u) + s[i + 1] * u) * (1 - v) + (s[i + o.w] * (1 - u) + s[i + o.w + 1] * u) * v;
}

export function setup(args) {
  A = args;
  for (const b of A.blocks) prepare(b);
}

// The place on a block's face seen at a place in the picture.
function onFace(b, px, py) {
  const a = L.fromPicture(px, py, 0), c = L.fromPicture(px, py, 400), d = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const t = (b.h - dot(b.n, a)) / (dot(b.n, d) || 1e-6);
  return [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t];
}
const J0 = (o, i) => A.J[0][i] * o[0] + A.J[1][i] * o[1];
const norm2 = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
// A place of the picture on a block's face, in the face's own axes.
function faceUV(b, px, py) {
  const Q = onFace(b, px, py), r = [Q[0] - b.P0[0], Q[1] - b.P0[1], Q[2] - b.P0[2]];
  return [dot(r, b.t1), dot(r, b.t2)];
}
// The bearing a cell's middle lies at, with the wedges' curl.
function bearing(b, tw, rm) {
  let th = tw;
  for (let it = 0; it < 3; it++) th = tw + b.fan.spiral * rm * Math.cos(th) / 100;
  return th;
}

// What a block needs at each evaluation: its face's own axes, its fan of cells round the core (each with its plane,
// stepping down outward), and its box in the world.
function prepare(b) {
  const r = (k) => hash(b.seed, k);
  const P0 = L.fromPicture(b.at[0], b.at[1], b.z);
  const t1 = norm(cross(b.n, Math.abs(b.n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), t2 = cross(b.n, t1);
  b.P0 = P0; b.t1 = t1; b.t2 = t2;
  // Round 8: no courses stepped into a block's broken sides: each jump from one course to the next was a break in the
  // field, which the surface maker drew as a column of square teeth on a side seen edge on.
  b.beds = false;
  b.tuck = b.tuck ?? (b.kind === 'roof' && b.back > 0);
  b.laminae = b.kind === 'plate' || b.kind === 'floor' || b.kind === 'roof';
  // The laminations run along the block's own length (its outline's long axis), on its face.
  const la = [Math.cos(b.long ?? 0), Math.sin(b.long ?? 0)], lw = [J0(la, 0), J0(la, 1), J0(la, 2)];
  b.along = norm2([dot(lw, t1), dot(lw, t2)]);
  const Bd = BEDDING[b.kind];
  b.bedded = Boolean(Bd) && (b.bedded ?? r(35) < Bd.share);
  if (Bd) {
    const aw = norm([b.along[0] * t1[0] + b.along[1] * t2[0], b.along[0] * t1[1] + b.along[1] * t2[1], b.along[0] * t1[2] + b.along[1] * t2[2]]);
    const across = norm(cross(b.n, aw)), phi = (Bd.tilt[0] + (Bd.tilt[1] - Bd.tilt[0]) * r(31)) * (r(32) < 0.5 ? -1 : 1);
    b.bedN = Bd.level ? norm([0.12 * (r(33) - 0.5), 1, 0.3 * (r(34) - 0.5)]) : norm([0, 1, 2].map((i) => across[i] * Math.cos(phi) + b.n[i] * Math.sin(phi)));
    b.bed0 = dot(b.bedN, P0);
    b.layers = [-700];
    while (b.layers[b.layers.length - 1] < 700) b.layers.push(b.layers[b.layers.length - 1] + Bd.thick[0] + (Bd.thick[1] - Bd.thick[0]) * hash(b.seed + b.layers.length, 41) ** 1.3);
    b.bedDeep = b.layers.map((_, k) => (Bd.deep[0] + (Bd.deep[1] - Bd.deep[0]) * hash(b.seed + k, 43) ** 1.5) * (hash(b.seed + k, 44) < 0.5 ? -1 : 1) * 0.5);
    b.bedSpec = Bd;
  }
  const w = b.sides ?? SIDES[b.kind], e = norm([b.n[0] * (1 - w) + A.view[0] * w, b.n[1] * (1 - w) + A.view[1] * w, b.n[2] * (1 - w) + A.view[2] * w]);
  b.e = e; b.ke = 1 / Math.max(0.3, dot(b.n, e));
  const ba = r(8) * Math.PI * 2;
  b.bedTilt = [Math.cos(ba), Math.sin(ba)];
  b.bedAt = [0];
  for (let k = 0; b.bedAt[k] < 400; k++) b.bedAt.push(b.bedAt[k] + BEDS.thick[0] + (BEDS.thick[1] - BEDS.thick[0]) * hash(b.seed + k, 9) ** 1.4);
  const F = { ...FAN.all, ...(FAN[b.kind] ?? {}), ...(b.fan ?? {}) };
  b.fan = F;
  const widths = [];
  let sum = 0;
  for (let k = 0; sum < TAU; k++) { const wd = F.wedge[0] + (F.wedge[1] - F.wedge[0]) * r(200 + k); widths.push(wd); sum += wd; }
  const scale = TAU / sum, turn0 = r(199) * TAU;
  b.wedges = [turn0];
  for (const wd of widths) b.wedges.push(b.wedges[b.wedges.length - 1] + wd * scale);
  // Its breaks across: straight lines over the wedge, each at a slant of its own, never arcs round the core.
  b.rings = widths.map((_, k) => {
    const out = [], mid = (b.wedges[k] + b.wedges[k + 1]) / 2;
    for (let j = 0, R = 0; R < 900; j++) {
      R += F.ring[0] + (F.ring[1] - F.ring[0]) * hash(b.seed * 3 + k, 300 + j);
      const a = mid + F.slant * (hash(b.seed * 3 + k, 500 + j) - 0.5) * 2;
      out.push({ R, d: [Math.cos(a), Math.sin(a)], cos: Math.cos(a - mid) });
    }
    return out;
  });
  // Each wedge's cells, inside out: each one plane leaning in to the core, and each starting lower at its inner
  // break than the cell inside it ends, so the step between them faces away from the core.
  b.cells = widths.map((_, k) => {
    const R = b.rings[k], tw = (b.wedges[k] + b.wedges[k + 1]) / 2, list = [];
    for (let j = 0; j <= R.length; j++) {
      const h = (q) => hash(b.seed * 7 + k * 1000 + j, q);
      const r0 = j ? R[j - 1].R : 0, r1 = R[j]?.R ?? r0 + 120, rm = Math.max(30, (r0 + r1) / 2), th = bearing(b, tw, rm);
      const px = A.corePx[0] + rm * Math.cos(th), py = A.corePx[1] + rm * Math.sin(th);
      const Q = faceUV(b, px, py);
      const out = [Math.cos(th), Math.sin(th)], Ow = [J0(out, 0), J0(out, 1), J0(out, 2)], o2 = norm2([dot(Ow, b.t1), dot(Ow, b.t2)]);
      const lean = Math.tan((F.lean[0] + (F.lean[1] - F.lean[0]) * h(1)) * Math.PI / 180);
      const twist = Math.tan((h(2) - 0.5) * 2 * F.twist * Math.PI / 180);
      const g = [o2[0] * lean - o2[1] * twist, o2[1] * lean + o2[0] * twist];
      const c = { Q, g, o2, o: 0, lam: h(9) * 1000, dish: F.dish * (h(10) * 2 - 0.6) };
      if (!j) c.o = F.sunk[0] + (F.sunk[1] - F.sunk[0]) * h(3);
      else {
        // Where the break between this cell and the one inside it crosses the wedge's middle.
        const p = list[j - 1], thb = bearing(b, tw, r0), B = faceUV(b, A.corePx[0] + r0 * Math.cos(thb), A.corePx[1] + r0 * Math.sin(thb));
        const ends = p.o + p.g[0] * (B[0] - p.Q[0]) + p.g[1] * (B[1] - p.Q[1]);
        let starts = ends - (F.drop[0] + (F.drop[1] - F.drop[0]) * h(4));
        // Held within the range: a cell that would sink too far starts a little higher, still below its neighbour.
        const lo = F.range[0], hi = F.range[1];
        if (starts < lo) starts = Math.min(ends - F.drop[0] * 0.5, lo + (starts - lo) * 0.25);
        c.o = Math.min(hi, starts - (g[0] * (B[0] - Q[0]) + g[1] * (B[1] - Q[1])));
      }
      list.push(c);
    }
    return list;
  });
  // The block's box in the world: its outline's corners on its face and its back.
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const [px, py] of [[b.box[0], b.box[1]], [b.box[2], b.box[1]], [b.box[0], b.box[3]], [b.box[2], b.box[3]]]) {
    const F2 = onFace(b, px, py);
    for (const s of [6 + F.rise, -b.thick - 6]) for (let i = 0; i < 3; i++) { const v = F2[i] + b.e[i] * s * b.ke; lo[i] = Math.min(lo[i], v); hi[i] = Math.max(hi[i], v); }
  }
  const pad = b.thick + 30;
  b.lo = lo.map((v) => v - pad); b.hi = hi.map((v) => v + pad);
}

// Where a place of the picture is in a block's fan: its wedge, its band across the wedge, and how far it is to the
// nearest break between cells (in units), with the cell across that break.
function fanAt(b, px, py) {
  const dx = px - A.corePx[0], dy = py - A.corePx[1], rr = Math.hypot(dx, dy);
  let th = Math.atan2(dy, dx) - b.fan.spiral * dx / 100 - b.wedges[0];
  th = ((th % TAU) + TAU) % TAU;
  const W = b.wedges, N = W.length - 1;
  let k = 0;
  while (k < N - 1 && W[k + 1] - W[0] <= th) k++;
  const lo = th - (W[k] - W[0]), hi = W[k + 1] - W[0] - th;
  const band = (kk) => { let j = 0, near = Infinity; for (const g of b.rings[kk]) { const p = dx * g.d[0] + dy * g.d[1] - g.R * g.cos; if (p > 0) j++; near = Math.min(near, Math.abs(p)); if (g.R > rr + 200) break; } return [j, near]; };
  const [j, dr] = band(k);
  const da = rr * Math.sin(Math.min(Math.min(lo, hi), 1.2));
  let other;
  if (da < dr) { const kk = lo < hi ? (k + N - 1) % N : (k + 1) % N; other = [kk, band(kk)[0]]; } else {
    let up = true, best = Infinity;
    for (const g of b.rings[k]) { const p = dx * g.d[0] + dy * g.d[1] - g.R * g.cos; if (Math.abs(p) < best) { best = Math.abs(p); up = p < 0; } if (g.R > rr + 200) break; }
    other = [k, up ? j + 1 : Math.max(0, j - 1)];
  }
  return { own: [k, j], other, d: Math.min(da, dr) * UNIT };
}
// The one cell of a block that is one great slab: its face's own plane.
const ONE = { Q: [0, 0], g: [0, 0], o: 0, dish: 0 };
const cellAt = (b, k, j) => { const l = b.cells[k]; return l[Math.min(j, l.length - 1)]; };

// The laminations of a cell at a place on its face: grooves along the block's length, each its own width apart, some left
// out, pinching out along their length; the laminae between them stand a little proud or sunk of one another.
function laminae(b, c, u, v) {
  const du = u - c.Q[0], dv = v - c.Q[1], a = b.along, w = -a[1] * du + a[0] * dv, along = a[0] * du + a[1] * dv;
  const P = LAMINAE.apart, k0 = Math.floor(w / P);
  let cut = 0, best = Infinity, side = 0;
  for (let k = k0 - 1; k <= k0 + 1; k++) {
    const hk = (q) => hash(c.lam + k * 3.7, q);
    const at = (k + 0.5 + LAMINAE.jitter * (hk(1) - 0.5)) * P, dd = Math.abs(w - at);
    if (dd < best) { best = dd; side = w < at ? k : k + 1; }
    if (hk(2) < LAMINAE.gone || dd > LAMINAE.half) continue;
    const pinch = Math.min(1, Math.max(0, L.noise(along / LAMINAE.pinch + k * 1.7, c.lam * 0.01, 0.5, 23) * 2.4 - 0.7));
    const deep = (LAMINAE.deep[0] + (LAMINAE.deep[1] - LAMINAE.deep[0]) * hk(3)) * pinch;
    cut = Math.max(cut, deep * (1 - dd / LAMINAE.half));
  }
  return LAMINAE.offset * (hash(c.lam + side * 3.7, 7) - 0.5) * 2 - cut;
}

// The bedding at a place in the world: how far the layer it lies in stands proud of the face (under 0: sunk), eased
// across each parting over the riser's width, and pinching out along each parting's length.
function bedding(b, x, y, z) {
  const S = b.bedSpec, t = b.bedN[0] * x + b.bedN[1] * y + b.bedN[2] * z - b.bed0 + 3 * (L.noise(x / 41, y / 41, z / 41, (b.seed + 5) & 1023) - 0.5) * 2;
  const Ls = b.layers;
  let lo = 0, hi = Ls.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (Ls[m] <= t) lo = m; else hi = m; }
  const amp = (k) => {
    const pinch = Math.min(1, Math.max(0, (L.noise(x / S.pinch + k * 1.7, y / S.pinch, z / S.pinch + k * 0.9, (b.seed + 13 + k) & 1023) - 0.38) * 3.2));
    return b.bedDeep[k] * pinch;
  };
  const here = amp(lo);
  // The nearer parting: below this layer (at Ls[lo]) or above it (at Ls[hi]).
  const dLo = t - Ls[lo], dHi = Ls[hi] - t, other = amp(dLo < dHi ? lo - 1 : hi);
  const d = Math.min(dLo, dHi), w = Math.max(1.2, Math.abs(here - other) / S.steep);
  if (d >= w / 2) return here;
  const k = 0.5 + 0.5 * (d / (w / 2));
  const e = k * k * (3 - 2 * k);
  return other + (here - other) * e;
}

// The knapped scars near a face's edge, `e` units in from it: shell shaped hollows on jittered grids of three
// sizes, deepest at the edge and gone past each size's band. The deepest scar at a place is what is taken away.
function dents(b, u, v, e) {
  let out = 0;
  for (let s = 0; s < DENTS.length; s++) {
    const D = DENTS[s];
    if (e >= D.band) continue;
    const taper = (1 - e / D.band) ** 1.3, S = D.size, i0 = Math.floor(u / S), j0 = Math.floor(v / S), rho2 = (S * 0.82) ** 2;
    for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) {
      const hs = (q) => hash(b.seed + s * 101 + i * 13.1, j * 7.3 + q);
      const sx = (i + 0.5 + 0.8 * (hs(1) - 0.5)) * S, sy = (j + 0.5 + 0.8 * (hs(2) - 0.5)) * S;
      const r2 = ((u - sx) ** 2 + (v - sy) ** 2) / rho2;
      if (r2 >= 1) continue;
      out = Math.max(out, D.deep * (0.45 + 0.55 * hs(3)) * taper * (1 - r2));
    }
  }
  return out;
}

// A break's edge worn round: 0 well inside a piece, the distance out of it well outside, eased between over `r`.
const worn = (e, r) => (e <= -r ? 0 : e >= r ? e : ((e + r) * (e + r)) / (4 * r));

// The pieces of a cell (seed, round its middle cu, cv) at a place on the face: the height of the piece the place is in
// and of the one across the nearest fracture, each with how far out of it the place is. From round 7.
export function piecesAt(seed, cu, cv, u, v, k) {
  const hc = (q) => hash(seed * 0.731 + 19.3, q);
  const n = SUB.lines[0] + Math.floor((SUB.lines[1] - SUB.lines[0] + 1) * hc(1) * 0.999);
  const wu = u + SUB.warp * (L.noise(u / SUB.warpOver, v / SUB.warpOver, (seed * 0.013) % 97, 37) - 0.5) * 2;
  const wv = v + SUB.warp * (L.noise(u / SUB.warpOver + 5.3, v / SUB.warpOver, (seed * 0.013) % 97, 39) - 0.5) * 2;
  let code = 0, near = Infinity, flip = 0;
  const a0 = hc(2) * Math.PI;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i + 0.3 * (hc(10 + i) - 0.5)) * (Math.PI / n), nu = Math.cos(a), nv = Math.sin(a);
    const o = SUB.spread * (hc(20 + i) - 0.5) * 2, d = (wu - cu) * nu + (wv - cv) * nv - o;
    const along = -(wu - cu) * nv + (wv - cv) * nu, side = hc(40 + i) < 0.5 ? -1 : 1;
    if (hc(30 + i) < SUB.least && along * side > SUB.spread * (hc(50 + i) - 0.3)) continue;
    if (d > 0) code |= 1 << i;
    if (Math.abs(d) < near) { near = Math.abs(d); flip = 1 << i; }
  }
  const at = (c) => {
    const h = (q) => hash(seed * 1.37 + c * 13.7 + 3.1, q), ang = h(3) * TAU, g = Math.tan(((SUB.tilt[0] + (SUB.tilt[1] - SUB.tilt[0]) * h(4)) * k * Math.PI) / 180);
    return (h(2) - 0.5) * 2 * SUB.step * k + g * (Math.cos(ang) * (wu - cu) + Math.sin(ang) * (wv - cv));
  };
  if (!flip) return [[at(code), -1e3]];
  return [[at(code), -near], [at(code ^ flip), near]];
}

const boxGap = (p, lo, hi) => Math.hypot(Math.max(0, lo[0] - p[0], p[0] - hi[0]), Math.max(0, lo[1] - p[1], p[1] - hi[1]), Math.max(0, lo[2] - p[2], p[2] - hi[2]));

// How far a place is outside a block: its own field.
export function block(b, x, y, z) {
  const p = [x, y, z];
  const out = boxGap(p, b.lo, b.hi);
  if (out > 0) return out + 1;
  const s = dot(b.n, p) - b.h, k = s * b.ke, q = [x - b.e[0] * k, y - b.e[1] * k, z - b.e[2] * k], [qx, qy] = L.pictured(q[0], q[1], q[2]);
  // The broken sides, with the beds in them: courses of uneven thickness that wander and pinch out.
  const u0 = -s, warp = BEDS.warp * (L.noise(qx / 34, qy / 34, b.seed & 1023, 5) - 0.5) * 2;
  const outline = sample(b.outline, qx, qy) * UNIT;
  let side = outline;
  if (b.beds && u0 > 3) {
    const t = u0 + BEDS.lean * ((qx - b.at[0]) * b.bedTilt[0] + (qy - b.at[1]) * b.bedTilt[1]) * UNIT + warp;
    let kk = 0;
    while (kk < b.bedAt.length - 2 && b.bedAt[kk + 1] <= Math.abs(t)) kk++;
    const pinch = Math.max(0, L.noise(qx / 60, qy / 60, kk * 3.1, (b.seed + 11) & 1023) * 2 - 0.6);
    side -= BEDS.step * (hash(kk, b.seed) - 0.5) * 2 * pinch;
  }
  if (side > 30) return Math.max(side, 1);
  // The face: the fan's cells, each one plane with its laminations; at a break the higher cell's edge falls to the
  // lower in a steep face turned from the core. Near every edge the face is knapped.
  const sw = SWELL.deep * (L.noise(x / SWELL.over, y / SWELL.over, z / SWELL.over, (b.seed + 3) & 1023) - 0.5) * 2;
  const rel = [q[0] - b.P0[0], q[1] - b.P0[1], q[2] - b.P0[2]], fu = dot(rel, b.t1), fv = dot(rel, b.t2);
  const fan = b.fan.one ? { own: [0, 0], other: [0, 0], d: 1e3 } : fanAt(b, qx, qy);
  const scar = dents(b, fu, fv, Math.max(0, Math.min(fan.d, -outline))) * (b.fan.scars ?? 1);
  const kp = b.fan.pieces ?? SUB.k;
  const T = b.fan.steep, bed = b.bedded ? bedding(b, x, y, z) : 0;
  let face = Infinity;
  for (const [[k, j], e] of [[fan.own, -fan.d], [fan.other, fan.d]]) {
    const c = b.fan.one ? ONE : cellAt(b, k, j);
    const H = c.o + c.g[0] * (fu - c.Q[0]) + c.g[1] * (fv - c.Q[1]) - c.dish * ((fu - c.Q[0]) ** 2 + (fv - c.Q[1]) ** 2) + (b.bedded ? bed : 0);
    if (kp <= 0) { face = Math.min(face, Math.max(s - H + sw + scar + T * Math.max(0, e), e - 24)); continue; }
    for (const [h, ep] of piecesAt(b.seed * 97 + k * 31 + j, c.Q[0], c.Q[1], fu, fv, kp)) face = Math.min(face, Math.max(s - H - h + sw + scar + T * Math.max(0, e) + SUB.steep * worn(ep, SUB.round), e - 24, ep - 12));
  }
  let f = Math.max(face, -s - b.thick, side);
  // A block tucked under the land falls away forward under its edge, so no flat top of it shows in front of the land.
  if (b.tuck) {
    const front = z - frontZ(x);
    if (front > -10) f = Math.max(f, y - (L.dome(x, z) - A.under) + (front + 10) * BEVEL.fall);
  }
  return f;
}

// The backing: the inner shell of the cave far behind everything, falling back as it goes out from the core.
function backing(x, y, z, px, py) {
  const rho = Math.hypot(px - A.corePx[0], py - A.corePx[1]);
  let z0 = Math.max(BACKING.least, BACKING.at - BACKING.back * Math.max(0, rho - BACKING.from));
  // Behind a void the backing is far back, so the core's light that comes in at the void's slant lands out of sight.
  if (A.voids) { const k = Math.min(1, Math.max(0, 0.5 - sample(A.voids, px, py) / 16)); z0 += (BACKING.deep - z0) * k * k * (3 - 2 * k); }
  const zb = z0 + 6 * (L.noise(x / 50, y / 50, 3.3, 77) - 0.5);
  return Math.max(z - zb, z0 - BACKING.thick - z);
}

// The rim round the core (RIM): four thick slabs leaning in and the black gaps between them. Gives what it clears of
// the blocks in front of it (`hollow`, over 0 where cleared), the rock it is (`rock`, under 0 inside) and which of its
// slabs a place is of (`slab`, 4 for a gap's floor).
export function rim(x, y, z, px, py) {
  const C = A.core.at, R = A.core.r;
  for (const S of RIM.slabs) if (!S.at) { const m = (((S.from + S.to) / 2) * Math.PI) / 180; S.at = [C[0] + 1.15 * R * Math.cos(m), C[1] - 1.15 * R * Math.sin(m)]; }
  const dx = px - A.corePx[0], dy = py - A.corePx[1], rU = Math.hypot(dx, dy) * UNIT;
  const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  let si = RIM.slabs.length - 1;
  for (let i = 0; i < RIM.slabs.length; i++) { const S = RIM.slabs[i]; if ((((deg - S.from) % 360) + 360) % 360 < S.to - S.from) { si = i; break; } }
  const S = RIM.slabs[si], mid = (((S.from + S.to) / 2) * Math.PI) / 180, ux = Math.cos(mid), uy = -Math.sin(mid);
  const wx = x - C[0], wy = y - C[1], par = 0.5 * (wx * ux + wy * uy) + 0.5 * rU, across = -wx * uy + wy * ux;
  const surf = C[2] - S.back + S.rise * (par - R) + S.twist * across + 2.5 * (L.noise(x / 37, y / 37, 4.1, 67) - 0.5) * 2;
  const lip = S.reach * R + 14 * (L.noise(deg / 13, 3.1, 7.7 + si, 91) - 0.5) * 2 + 5 * (L.noise(deg / 3.7, 1.7, 2.9 + si, 93) - 0.5) * 2;
  const plane = (z - surf) / Math.sqrt(1 + S.rise * S.rise), behind = Math.max(0, surf - z);
  // Its face broken by the same fractures as a block's, harder: smooth, lit evenly by the ball, it read as a pale card.
  let inFront = Infinity;
  for (const [h, e] of piecesAt(911 + si * 131, S.at[0], S.at[1], x, y, RIM.pieces)) inFront = Math.min(inFront, Math.max(plane - h + SUB.steep * worn(e, SUB.round), e - 12));
  // The slab: rock behind its face, as thick as RIM.thick, its outline moving out as it goes back so its outer side is
  // seen. In front of its face nothing stands inside its outline, which draws in toward the visitor: what it cuts of
  // the blocks in front is an undercut hidden under their edges, not a wall along the line of sight.
  let rock = Math.max(inFront, -inFront - RIM.thick, rU - lip - RIM.side * behind);
  let hollow = Math.min(inFront, lip - rU - 0.3 * Math.max(0, z - surf));
  let slab = si;
  // The gaps: a slot between two slabs, wandering and of uneven width, widening as it goes back so its walls are the
  // slabs' sides, with a floor that falls away from the core.
  for (const g of RIM.gaps) {
    let dd = ((deg - g.at + 540) % 360) - 180;
    dd -= RIM.rag * (L.noise(rU / 14, g.at * 0.1, 5.5, 95) - 0.5) * 2;
    const hw = (g.wide / 2) * (0.75 + 0.5 * L.noise(rU / 9, g.at * 0.1, 6.5, 97));
    const inGap = ((hw - Math.abs(dd)) * Math.PI * Math.max(rU, 60)) / 180 + 0.3 * behind;
    if (inGap < -40) continue;
    const floor = C[2] - RIM.floor.back - RIM.floor.fall * Math.max(0, rU - R);
    const aboveFloor = (z - floor) / Math.sqrt(1 + RIM.floor.fall * RIM.floor.fall);
    const cut = Math.min(inGap, aboveFloor, lip - rU);
    const floorRock = Math.max(aboveFloor, -aboveFloor - RIM.thick, rU - lip, -inGap - 4);
    if (floorRock < rock && inGap > 0) slab = RIM.slabs.length;
    rock = Math.max(Math.min(rock, floorRock), cut);
    hollow = Math.max(hollow, cut);
  }
  return { hollow, rock, slab };
}

// A stone of rubble: the inside of a few planes round its middle.
function stone(st, x, y, z) {
  const d = [x - st.at[0], y - st.at[1], z - st.at[2]];
  const far = Math.hypot(d[0], d[1], d[2]);
  if (far > st.s * 2.2) return far - st.s * 1.2;
  let e = -Infinity;
  for (const q of st.planes) e = Math.max(e, dot(q.n, d) - q.h);
  return e;
}

// The rock without its rubble.
export function bare(x, y, z) {
  const [px, py] = L.pictured(x, y, z);
  let d = backing(x, y, z, px, py);
  // A void: the blocks of the kinds it is cut from are taken away inside it, widening a little as it goes back so its
  // walls face the visitor: straight back along the line of sight, a wall seen edge on came out as a stack of ledges.
  const cut = A.voids ? -sample(A.voids, px, py) * UNIT + 5 * (L.noise(px / 9, py / 9, 3.7, 83) - 0.5) * 2 + 0.15 * Math.max(0, 220 - z) : -Infinity;
  for (const b of A.blocks) { let v = block(b, x, y, z); if (cut > -30 && A.voided.includes(b.kind)) v = Math.max(v, cut); if (v < d) d = v; }
  // The rim round the core: nothing in front of its slabs, and its slabs and gaps.
  const rm = rim(x, y, z, px, py);
  d = Math.min(Math.max(d, rm.hollow), rm.rock);
  // Inside the picture's rock, inside the planet, under the land.
  d = Math.max(d, sample(A.rock, px, py) * UNIT);
  d = Math.max(d, (L.shell(x, y, z) - 1) * L.WORLD.deep + 2);
  const top = L.dome(x, z);
  if (y > top - 40) d = Math.max(d, y - Math.min(top - A.under, below(x, z) - 0.8));
  else d = Math.max(d, y - (top - A.under));
  // At the right the land's edge stands back from the planet's front: what of the rock is in front of it falls away
  // forward under it, so no flat shelf of rock shows in front of the sand.
  if (x > BEVEL.from) {
    const front = z - frontZ(x);
    if (front > 0) d = Math.max(d, (y - (top - A.under) + front * BEVEL.fall) * Math.min(1, (x - BEVEL.from) / 40) - 0.01);
  }
  // Clear of the core, and nothing in front of it.
  const cx = x - A.core.at[0], cy = y - A.core.at[1], cz = z - A.core.at[2], cr = Math.hypot(cx, cy, cz);
  if (cr < CLEAR.r + CLEAR.rag + 40) {
    const rag = CLEAR.rag * (L.noise(cx / 30 + 4, cy / 30, cz / 30, 41) - 0.5) * 2 + 0.4 * CLEAR.rag * (L.noise(cx / 9, cy / 9 + 2, cz / 9, 43) - 0.5) * 2;
    d = Math.max(d, CLEAR.r + rag - cr);
  }
  const rho = Math.hypot(px - A.corePx[0], py - A.corePx[1]) * UNIT;
  // A cone opening toward the visitor, not a cylinder: a wall along the line of sight beside the ball's outline came out
  // as a column of square teeth.
  if (cz > -20 && rho < CLEAR.disc + 30 + CLEAR.open * Math.max(0, cz)) d = Math.max(d, Math.min(CLEAR.disc + CLEAR.open * Math.max(0, cz) - rho, cz));
  // Out of the stream's lane: a bay round its line, widening toward the visitor, under the core's foot.
  if (y < LANE.top + 40) {
    const lane = Math.max(Math.abs(x) - LANE.half - LANE.widen * Math.max(0, z - LANE.z), LANE.z - z, y - LANE.top);
    d = Math.max(d, -lane);
  }
  return d;
}

// Which block a place on the surface is of, as the stone is told it: a block's number plus one, a slab of the rim or a
// gap's floor (OWN.rim and on), a stone of rubble (OWN.stone), the backing (OWN.backing). A face cut by something that is not a block
// (the land, the planet, the core's clearance, the stream's lane) is of the block it cuts.
export const OWN = { rim: 36, stone: 41, backing: 42, count: 48 };
export function owner(x, y, z) {
  const [px, py] = L.pictured(x, y, z);
  let best = OWN.backing, bv = Math.abs(backing(x, y, z, px, py)), inside = 0, iv = Infinity;
  A.blocks.forEach((b, k) => { const v = block(b, x, y, z); if (Math.abs(v) < bv) { bv = Math.abs(v); best = k + 1; } if (v < iv) { iv = v; inside = k + 1; } });
  const rm = rim(x, y, z, px, py), bw = Math.abs(rm.rock);
  if (bw < bv) { bv = bw; best = OWN.rim + rm.slab; }
  if (A.stones) for (const st of A.stones) { const v = Math.abs(stone(st, x, y, z)); if (v < bv) { bv = v; best = OWN.stone; } }
  if (bv > 2 && iv < 0) best = inside;
  return best;
}
// Each number's tan, for the stone: how far its stone is the paler, drier tan where the core's light is on it at all.
export function tans(args) {
  setup(args);
  const out = new Array(OWN.count).fill(0);
  A.blocks.forEach((b, k) => { out[k + 1] = b.tan ?? 0; });
  return out;
}
// Each number's bedding, for the stone: the plane its layers lie in, and how strongly bedded it is (0: clean).
export function beds(args) {
  setup(args);
  const out = Array.from({ length: OWN.count }, () => [0, 1, 0, 0]);
  A.blocks.forEach((b, k) => { if (b.bedN) out[k + 1] = [...b.bedN.map((v) => +v.toFixed(4)), b.bedded ? +(0.55 + 0.45 * hash(b.seed, 51)).toFixed(3) : 0]; });
  return out;
}

export function field(x, y, z) {
  let d = bare(x, y, z);
  if (A.stones) for (const st of A.stones) { const v = stone(st, x, y, z); if (v < d) d = v; }
  return d;
}
