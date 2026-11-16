// Sculpt R, round 3: the hollow as a field for the surface maker (scripts/world/lib/surface.mjs), under 0 inside the
// rock. A union of heavy blocks (blocks.mjs), each a solid bounded by its face's plane, its back and its broken
// sides, broken across by one or two steps, chipped at its edges, with beds in its sides. Behind them a backing, the
// inner shell of the cave, far back and closed. All of it is kept inside the planet, under the land, inside what of
// the picture is the rock, and out of the stream's lane.
//
//   args = plan() of blocks.mjs, with stones added by the make script
import { L } from '../../lib/plan.mjs';
import { below } from '../land/shape.mjs';

export const lip = 2.5;
// How far a block's broken sides run along the line of sight rather than square to its face: square, a plate shows
// its whole thickness at its outer side; along the line of sight, none of it. The frame shows only a sliver.
export const SIDES = { plate: 0.6, floor: 0.3, shade: 0.4, roof: 0.5, frame: 0.85 };
// One of the picture's pixels in the world's units, near enough everywhere in the hollow.
const UNIT = L.PICTURE.unit;
// The beds in a block's broken sides: how thick each is, and how far one stands out or in from the next, in units.
export const BEDS = { thick: [5, 34], step: 1.6, lean: 0.08, warp: 9 };
// The fan of cells a block's face is broken into, round the core: how wide a wedge is (radians), how far apart its
// breaks across are (pixels), how far each cell leans in toward the core and twists (degrees), how far a cell stands
// from the face (units), how far the wedges curl (radians for each 100 pixels across, mirrored either side of the
// core, so they lean as picture 9's do), and how far apart its facets are (units). inward 1 leans a cell in toward
// the core; 0 turns it at random.
export const FAN = {
  all: { wedge: [0.24, 0.55], ring: [55, 130], lean: [-5, 9], twist: 9, sunk: [-11, 4], spiral: 0.22, slant: 0.5, facet: 30, inward: 1, rise: 14 },
  frame: { wedge: [0.12, 0.3], ring: [50, 120], lean: [-6, 14], twist: 12, facet: 34 },
  roof: { wedge: [0.1, 0.26], ring: [24, 60], lean: [2, 12], twist: 12, facet: 28 },
  floor: { wedge: [0.14, 0.3], ring: [26, 60], lean: [2, 12], facet: 26 },
  shade: { facet: 28 },
};
// The knapped facets: how far each is turned from its cell (degrees), how far its seed may wander in its square of the
// grid (a share), how far one stands proud or sunk (units), and how much it dishes in (over 0) or swells (under 0).
// A share of them (steep) are turned much further, into shade.
export const FACETS = { tilt: [3, 12], steep: [0.07, 22], jitter: 0.85, lift: 0.8, dish: [-0.004, 0.01] };
// A broken face is never flat: a slow swell and a finer wander, in units, and over how far.
export const SWELL = { deep: 1.6, over: 70, fine: 0, fineOver: 16 };
// The flakes taken off a block's front edges: how many to a square pixel of its face, how wide in units, how deep
// as a share of their width.
export const FLAKES = { each: 1 / 700, wide: [5, 15], deep: [0.18, 0.3] };
// The backing: how far behind the core's middle it is straight behind the core, and how much further back it goes
// for each pixel out from the core.
export const BACKING = { at: -95, back: 0.32, from: 100, thick: 70 };
// The core's clearance: nothing nearer its middle than this, in units, give or take a ragged few, and nothing in
// front of it inside its outline.
export const CLEAR = { r: 116, rag: 12, disc: 101 };
// The stream's lane: nothing nearer the visitor than this behind the stream's line, and how far the bay round it
// widens toward the visitor for each unit nearer.
export const LANE = { z: 128, half: 12, widen: 0.85, top: -296 };

let A = null;

const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

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

// What a block needs at each evaluation: its face's own axes, its fan of wedges round the core, its knapped facets,
// its flakes and its box in the world.
function prepare(b) {
  const r = (k) => hash(b.seed, k);
  const P0 = L.fromPicture(b.at[0], b.at[1], b.z);
  const t1 = norm(cross(b.n, Math.abs(b.n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), t2 = cross(b.n, t1);
  b.P0 = P0; b.t1 = t1; b.t2 = t2;
  b.beds = b.kind === 'plate' || b.kind === 'floor';
  const w = b.sides ?? SIDES[b.kind], e = norm([b.n[0] * (1 - w) + A.view[0] * w, b.n[1] * (1 - w) + A.view[1] * w, b.n[2] * (1 - w) + A.view[2] * w]);
  b.e = e; b.ke = 1 / Math.max(0.3, dot(b.n, e));
  const ba = r(8) * Math.PI * 2;
  b.bedTilt = [Math.cos(ba), Math.sin(ba)];
  // The beds in its sides: each its own thickness, so no two courses are alike.
  b.bedAt = [0];
  for (let k = 0; b.bedAt[k] < 400; k++) b.bedAt.push(b.bedAt[k] + BEDS.thick[0] + (BEDS.thick[1] - BEDS.thick[0]) * hash(b.seed + k, 9) ** 1.4);
  // The fan: wedges round the core, each its own width, each broken across at radii of its own.
  const F = { ...FAN.all, ...(FAN[b.kind] ?? {}) };
  b.fan = F;
  const widths = [];
  let sum = 0;
  for (let k = 0; sum < Math.PI * 2; k++) { const wd = F.wedge[0] + (F.wedge[1] - F.wedge[0]) * r(200 + k); widths.push(wd); sum += wd; }
  const scale = (Math.PI * 2) / sum, turn0 = r(199) * Math.PI * 2;
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
  b.cells = new Map();
  // The flakes, at places along the outline found from the outline's own distance.
  b.flakes = [];
  const want = Math.round(b.area * FLAKES.each * (b.kind === 'frame' || b.kind === 'roof' ? 0.6 : 1));
  for (let k = 0, tries = 0; k < want && tries < want * 60; tries++) {
    const px = b.box[0] + (b.box[2] - b.box[0]) * r(100 + tries * 3), py = b.box[1] + (b.box[3] - b.box[1]) * r(101 + tries * 3);
    const d = sample(b.outline, px, py);
    if (d > -0.4 || d < -1.6) continue;
    const g = [sample(b.outline, px + 1, py) - sample(b.outline, px - 1, py), sample(b.outline, px, py + 1) - sample(b.outline, px, py - 1)];
    const gl = Math.hypot(g[0], g[1]) || 1;
    const E = onFace(b, px, py), E2 = onFace(b, px + g[0] / gl, py + g[1] / gl);
    const side = norm([E2[0] - E[0], E2[1] - E[1], E2[2] - E[2]]);
    const w = FLAKES.wide[0] + (FLAKES.wide[1] - FLAKES.wide[0]) * r(102 + tries * 3) ** 1.5, deep = w * (FLAKES.deep[0] + (FLAKES.deep[1] - FLAKES.deep[0]) * r(103 + tries));
    // A flake's scar: a flattened ball lying across the edge, its flat way along the bevel between face and side.
    const m = norm([b.n[0] + side[0], b.n[1] + side[1], b.n[2] + side[2]]), a1 = norm(cross(m, side)), a2 = cross(m, a1);
    b.flakes.push({ at: [E[0] + m[0] * deep * 0.35, E[1] + m[1] * deep * 0.35, E[2] + m[2] * deep * 0.35], m, a1, a2, w, w2: w * (0.55 + 0.6 * r(104 + tries)), deep });
    k++;
  }
  // The block's box in the world: its outline's corners on its face and its back.
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const [px, py] of [[b.box[0], b.box[1]], [b.box[2], b.box[1]], [b.box[0], b.box[3]], [b.box[2], b.box[3]]]) {
    const F2 = onFace(b, px, py);
    for (const s of [6 + F.rise, -b.thick - 6]) for (let i = 0; i < 3; i++) { const v = F2[i] + b.e[i] * s * b.ke; lo[i] = Math.min(lo[i], v); hi[i] = Math.max(hi[i], v); }
  }
  // The sides are at right angles to the face: a side reaches out as far as the face is turned from the view.
  const pad = b.thick + 30;
  b.lo = lo.map((v) => v - pad); b.hi = hi.map((v) => v + pad);
}

const TAU = Math.PI * 2;
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

// A cell of the fan: how far it stands from the block's face and how it is turned, as a height over the face's own
// axes. Each leans in toward the core by an angle of its own, with a twist across it.
function cellOf(b, k, j) {
  const key = k * 1000 + j;
  let c = b.cells.get(key);
  if (c) return c;
  const F = b.fan, h = (q) => hash(b.seed * 7 + key, q);
  const R = b.rings[k], rm = Math.max(30, ((R[j - 1]?.R ?? 0) + (R[j]?.R ?? 900)) / 2), tw = (b.wedges[k] + b.wedges[k + 1]) / 2;
  let th = tw;
  for (let it = 0; it < 3; it++) th = tw + F.spiral * rm * Math.cos(th) / 100;
  const px = A.corePx[0] + rm * Math.cos(th), py = A.corePx[1] + rm * Math.sin(th);
  const Q = onFace(b, px, py), qu = dot([Q[0] - b.P0[0], Q[1] - b.P0[1], Q[2] - b.P0[2]], b.t1), qv = dot([Q[0] - b.P0[0], Q[1] - b.P0[1], Q[2] - b.P0[2]], b.t2);
  const out = [Math.cos(th), Math.sin(th)], Ow = [J0(out, 0), J0(out, 1), J0(out, 2)], o2 = norm2([dot(Ow, b.t1), dot(Ow, b.t2)]);
  const lean = Math.tan((F.lean[0] + (F.lean[1] - F.lean[0]) * h(1)) * Math.PI / 180) * F.inward;
  const twist = Math.tan((h(2) - 0.5) * 2 * F.twist * Math.PI / 180);
  const g = [o2[0] * lean - o2[1] * twist, o2[1] * lean + o2[0] * twist];
  c = { Q: [qu, qv], g, o: F.sunk[0] + (F.sunk[1] - F.sunk[0]) * h(3) };
  b.cells.set(key, c);
  return c;
}
const J0 = (o, i) => A.J[0][i] * o[0] + A.J[1][i] * o[1];
const norm2 = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };

// The knapped facets of a face: seeds on a jittered grid of the face's own axes, each a shallow scar of its own, a
// plane turned from the face by 5 to 25 degrees with a slight dish or swell. The two nearest seeds and how far the
// place is from the break between them.
function facetsAt(b, u, v) {
  const S = b.fan.facet, i0 = Math.floor(u / S), j0 = Math.floor(v / S);
  let a = null, c = null, da = Infinity, dc = Infinity;
  for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) {
    const sx = (i + 0.5 + FACETS.jitter * (hash(b.seed + i * 13.1, j * 7.3) - 0.5)) * S, sy = (j + 0.5 + FACETS.jitter * (hash(b.seed + j * 5.7, i * 11.9 + 3) - 0.5)) * S;
    const d = (u - sx) ** 2 + (v - sy) ** 2;
    if (d < da) { c = a; dc = da; a = [sx, sy, i, j]; da = d; } else if (d < dc) { c = [sx, sy, i, j]; dc = d; }
  }
  const sep = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
  return { a, c, d: (dc - da) / (2 * sep) };
}
function facetH(b, s, u, v) {
  const h = (q) => hash(b.seed * 11 + s[2] * 37.3, s[3] * 53.9 + q);
  const ang = (h(5) < FACETS.steep[0] ? FACETS.steep[1] : FACETS.tilt[0] + (FACETS.tilt[1] - FACETS.tilt[0]) * h(1) ** 1.6) * Math.PI / 180, dir = h(2) * TAU, t = Math.tan(ang);
  const du = u - s[0], dv = v - s[1];
  return FACETS.lift * (h(3) - 0.5) * 2 + t * (Math.cos(dir) * du + Math.sin(dir) * dv) + (FACETS.dish[0] + (FACETS.dish[1] - FACETS.dish[0]) * h(4)) * (du * du + dv * dv);
}

// The place on a block's face seen at a place in the picture.
function onFace(b, px, py) {
  const a = L.fromPicture(px, py, 0), c = L.fromPicture(px, py, 400), d = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const t = (b.h - dot(b.n, a)) / (dot(b.n, d) || 1e-6);
  return [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t];
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
  let side = sample(b.outline, qx, qy) * UNIT;
  if (b.beds && u0 > 3) {
    const t = u0 + BEDS.lean * ((qx - b.at[0]) * b.bedTilt[0] + (qy - b.at[1]) * b.bedTilt[1]) * UNIT + warp;
    let k = 0;
    while (k < b.bedAt.length - 2 && b.bedAt[k + 1] <= Math.abs(t)) k++;
    const pinch = Math.max(0, L.noise(qx / 60, qy / 60, k * 3.1, (b.seed + 11) & 1023) * 2 - 0.6);
    side -= BEDS.step * (hash(k, b.seed) - 0.5) * 2 * pinch;
  }
  // The face: the fan's cells, each broken into knapped facets, each cell and each facet its own plane; at a break
  // the two sides meet in a step.
  const sw = SWELL.deep * (L.noise(x / SWELL.over, y / SWELL.over, z / SWELL.over, (b.seed + 3) & 1023) - 0.5) * 2;
  const rel = [q[0] - b.P0[0], q[1] - b.P0[1], q[2] - b.P0[2]], fu = dot(rel, b.t1), fv = dot(rel, b.t2);
  const fan = fanAt(b, qx, qy), fc = facetsAt(b, fu, fv);
  const cells = [[cellOf(b, ...fan.own), -fan.d], [cellOf(b, ...fan.other), fan.d]];
  const fac = [[facetH(b, fc.a, fu, fv), -fc.d], [facetH(b, fc.c, fu, fv), fc.d]];
  let face = Infinity;
  for (const [c, cd] of cells) {
    const H = c.o + c.g[0] * (fu - c.Q[0]) + c.g[1] * (fv - c.Q[1]);
    for (const [fh, fd] of fac) face = Math.min(face, Math.max(s - H - fh + sw, cd, fd));
  }
  let f = Math.max(face, -s - b.thick, side);
  // The flakes taken off its front edges.
  for (const fl of b.flakes) {
    const d = [x - fl.at[0], y - fl.at[1], z - fl.at[2]];
    if (Math.abs(d[0]) > fl.w * 1.4 || Math.abs(d[1]) > fl.w * 1.4 || Math.abs(d[2]) > fl.w * 1.4) continue;
    const e = (Math.hypot(dot(d, fl.a1) / fl.w, dot(d, fl.a2) / fl.w2, dot(d, fl.m) / fl.deep) - 1) * fl.deep;
    f = Math.max(f, -e);
  }
  return f;
}

// The backing: the inner shell of the cave far behind everything, falling back as it goes out from the core.
function backing(x, y, z, px, py) {
  const rho = Math.hypot(px - A.corePx[0], py - A.corePx[1]);
  const z0 = BACKING.at - BACKING.back * Math.max(0, rho - BACKING.from), zb = z0 + 6 * (L.noise(x / 50, y / 50, 3.3, 77) - 0.5);
  return Math.max(z - zb, z0 - BACKING.thick - z);
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
  // Inside the picture's rock, inside the planet, under the land.
  d = Math.max(d, sample(A.rock, px, py) * UNIT);
  d = Math.max(d, (L.shell(x, y, z) - 1) * L.WORLD.deep + 2);
  const top = L.dome(x, z);
  if (y > top - 40) d = Math.max(d, y - Math.min(top - A.under, below(x, z) - 0.8));
  else d = Math.max(d, y - (top - A.under));
  // Clear of the core, and nothing in front of it.
  const cx = x - A.core.at[0], cy = y - A.core.at[1], cz = z - A.core.at[2], cr = Math.hypot(cx, cy, cz);
  if (cr < CLEAR.r + CLEAR.rag + 40) {
    const rag = CLEAR.rag * (L.noise(cx / 30 + 4, cy / 30, cz / 30, 41) - 0.5) * 2 + 0.4 * CLEAR.rag * (L.noise(cx / 9, cy / 9 + 2, cz / 9, 43) - 0.5) * 2;
    d = Math.max(d, CLEAR.r + rag - cr);
  }
  const rho = Math.hypot(px - A.corePx[0], py - A.corePx[1]) * UNIT;
  if (cz > 0 && rho < CLEAR.disc + 30) d = Math.max(d, Math.min(CLEAR.disc - rho, cz));
  // Out of the stream's lane: a bay round its line, widening toward the visitor, under the core's foot.
  if (y < LANE.top + 40) {
    const lane = Math.max(Math.abs(x) - LANE.half - LANE.widen * Math.max(0, z - LANE.z), LANE.z - z, y - LANE.top);
    d = Math.max(d, -lane);
  }
  return d;
}

export function field(x, y, z) {
  let d = bare(x, y, z);
  if (A.stones) for (const st of A.stones) { const v = stone(st, x, y, z); if (v < d) d = v; }
  return d;
}
