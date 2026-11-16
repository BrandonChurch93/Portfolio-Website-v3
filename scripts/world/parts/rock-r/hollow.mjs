// Sculpt R, round 5: the hollow as a field for the surface maker (scripts/world/lib/surface.mjs), under 0 inside the
// rock. Three things, as picture 9 has them:
//   a cave round the core: a smooth concave bowl a little wider than the ball, lit as one soft gradient, where the
//     great slabs begin at its lip (BOWL);
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
export const BEDDING = {
  plate: { share: 0.75, thick: [7, 30], deep: [0.8, 3.6], tilt: [0.25, 0.7], pinch: 70, steep: 1.6 },
  floor: { share: 1, thick: [6, 18], deep: [1.5, 4.5], tilt: [0.5, 0.9], pinch: 90, steep: 1.6 },
  roof: { share: 1, thick: [7, 20], deep: [2.5, 7], tilt: [0, 0], pinch: 80, steep: 1.6, level: true },
  frame: { share: 0.6, thick: [9, 34], deep: [1, 4], tilt: [0.3, 0.8], pinch: 70, steep: 1.6 },
  belly: { share: 1, thick: [6, 16], deep: [1.5, 4], tilt: [0.4, 0.9], pinch: 60, steep: 1.6 },
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
export const BACKING = { at: -95, back: 0.32, from: 100, thick: 70, least: -205 };
// The core's clearance: nothing nearer its middle than this, in units, give or take a ragged few, and nothing in
// front of it inside its outline.
export const CLEAR = { r: 116, rag: 12, disc: 101, open: 0.3 };
// The cave round the core: a bowl opening toward the visitor, as deep behind the core's middle as `deep`, curving
// forward by its radius `curve`, out to a lip `lip` core radii from the core's middle in the picture (a ragged line,
// widest where the picture's bowl is widest: `wide` at the given bearings, in degrees down from across to the
// right), ragged at three sizes, with a shell `thick` units behind it and a slow ripple so its light falls softly. It is
// shallow (a large curve): a deep one round the light at its focus is lit evenly, and read as a flat disc, and one
// that falls back toward its lip read as a dark halo.
export const BOWL = { deep: 122, curve: 400, lip: 1.15, wide: [[0, 0.1], [40, 0.02], [90, -0.14], [140, 0.0], [180, 0.12], [230, 0.04], [270, -0.12], [320, 0.06]], rag: [0.1, 0.06, 0.03], thick: 46, ripple: 6, rippleOver: 55,
  terraces: [{ at: 1.02, fall: 6, wide: 5, rag: 9 }, { at: 1.1, fall: 7, wide: 5, rag: 8 }] };
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
  b.beds = b.kind === 'plate' || b.kind === 'floor';
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
  const fan = fanAt(b, qx, qy);
  const scar = dents(b, fu, fv, Math.max(0, Math.min(fan.d, -outline))) * (b.fan.scars ?? 1);
  const T = b.fan.steep, bed = b.bedded ? bedding(b, x, y, z) : 0;
  let face = Infinity;
  for (const [[k, j], e] of [[fan.own, -fan.d], [fan.other, fan.d]]) {
    const c = cellAt(b, k, j);
    const H = c.o + c.g[0] * (fu - c.Q[0]) + c.g[1] * (fv - c.Q[1]) - c.dish * ((fu - c.Q[0]) ** 2 + (fv - c.Q[1]) ** 2) + (b.bedded ? bed : 0);
    face = Math.min(face, Math.max(s - H + sw + scar + T * Math.max(0, e), e - 24));
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
  const z0 = Math.max(BACKING.least, BACKING.at - BACKING.back * Math.max(0, rho - BACKING.from));
  const zb = z0 + 6 * (L.noise(x / 50, y / 50, 3.3, 77) - 0.5);
  return Math.max(z - zb, z0 - BACKING.thick - z);
}

// The bowl's lip at a bearing, in picture pixels from the core's middle.
function bowlLip(th) {
  const deg = ((th * 180 / Math.PI) % 360 + 360) % 360, W = BOWL.wide;
  let w = W[W.length - 1][1];
  for (let i = 0; i < W.length; i++) {
    const [a0, w0] = W[i], [a1, w1] = W[(i + 1) % W.length], span = ((a1 - a0) + 360) % 360 || 360, t = ((deg - a0) + 360) % 360;
    if (t <= span) { const f = t / span, sm = f * f * (3 - 2 * f); w = w0 + (w1 - w0) * sm; break; }
  }
  let rag = 0;
  for (let i = 0; i < BOWL.rag.length; i++) { const f = [2.4, 7, 19][i]; rag += BOWL.rag[i] * (L.noise(Math.cos(th) * f + 5, Math.sin(th) * f, 1.5 + i, 61 + i) - 0.5) * 2; }
  return (BOWL.lip + w + rag) * A.core.r / UNIT;
}
// The cave round the core: under 0 inside its hollow (in front of the bowl and inside the lip), and the bowl's shell.
function bowl(x, y, z, px, py) {
  const C = A.core.at, rho = Math.hypot(x - C[0], y - C[1]);
  const th = Math.atan2(py - A.corePx[1], px - A.corePx[0]), lipPx = bowlLip(th), rpx = Math.hypot(px - A.corePx[0], py - A.corePx[1]);
  const ripple = BOWL.ripple * (L.noise(x / BOWL.rippleOver, y / BOWL.rippleOver, 2.5, 67) - 0.5) * 2;
  // Soft terraces inside the lip, each falling back outward, so a crescent of it faces away from the core and is dark.
  let ter = 0;
  const lipU = lipPx * UNIT;
  for (const T of BOWL.terraces) {
    const at = lipU * T.at + T.rag * (L.noise(Math.cos(th) * 5 + T.at * 9, Math.sin(th) * 5, 4.5, 71) - 0.5) * 2;
    const here = Math.min(1, Math.max(0, (L.noise(Math.cos(th) * 3.4 + T.at * 4, Math.sin(th) * 3.4, 6.5, 73) - 0.48) * 4));
    const t = Math.min(1, Math.max(0, (rho - at) / T.wide + 0.5));
    ter -= T.fall * here * t * t * (3 - 2 * t);
  }
  const surf = C[2] - BOWL.deep + (rho * rho) / (2 * BOWL.curve) + ripple + ter;
  // Distance in front of the bowl's face, near enough: along z, eased by its slope.
  const slope = rho / BOWL.curve, inFront = (z - surf) / Math.sqrt(1 + slope * slope);
  const inLip = (lipPx - rpx) * UNIT;
  return { hollow: Math.min(inFront, inLip), shell: Math.max(-inFront, inFront + BOWL.thick, -inLip) };
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
  for (const b of A.blocks) { const v = block(b, x, y, z); if (v < d) d = v; }
  // The cave round the core: nothing in its hollow, and its smooth bowl behind.
  const bw = bowl(x, y, z, px, py);
  d = Math.min(Math.max(d, bw.hollow), bw.shell);
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

// Which block a place on the surface is of, as the stone is told it: a block's number plus one, the cave's bowl
// (OWN.bowl), a stone of rubble (OWN.stone), the backing (OWN.backing). A face cut by something that is not a block
// (the land, the planet, the core's clearance, the stream's lane) is of the block it cuts.
export const OWN = { bowl: 40, stone: 41, backing: 42, count: 48 };
export function owner(x, y, z) {
  const [px, py] = L.pictured(x, y, z);
  let best = OWN.backing, bv = Math.abs(backing(x, y, z, px, py)), inside = 0, iv = Infinity;
  A.blocks.forEach((b, k) => { const v = block(b, x, y, z); if (Math.abs(v) < bv) { bv = Math.abs(v); best = k + 1; } if (v < iv) { iv = v; inside = k + 1; } });
  const bw = Math.abs(bowl(x, y, z, px, py).shell);
  if (bw < bv) { bv = bw; best = OWN.bowl; }
  if (A.stones) for (const st of A.stones) { const v = Math.abs(stone(st, x, y, z)); if (v < bv) { bv = v; best = OWN.stone; } }
  if (bv > 2 && iv < 0) best = inside;
  return best;
}
// Each number's bedding, for the stone: the plane its layers lie in, and how strongly bedded it is (0: clean).
export function beds(args) {
  setup(args);
  const out = Array.from({ length: OWN.count }, () => [0, 1, 0, 0]);
  A.blocks.forEach((b, k) => { if (b.bedN) out[k + 1] = [...b.bedN.map((v) => +v.toFixed(4)), b.bedded ? +(0.55 + 0.45 * hash(b.seed, 51)).toFixed(3) : 0.12]; });
  return out;
}

export function field(x, y, z) {
  let d = bare(x, y, z);
  if (A.stones) for (const st of A.stones) { const v = stone(st, x, y, z); if (v < d) d = v; }
  return d;
}
