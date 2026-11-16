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
export const SIDES = { plate: 0, floor: 0, shade: 0.2, roof: 0.5, frame: 0.85 };
// One of the picture's pixels in the world's units, near enough everywhere in the hollow.
const UNIT = L.PICTURE.unit;
// The breaks across a block: how far each part stands back from the one before, how far it is turned (radians), and
// how ragged the line between them is, in pixels.
export const BREAK = { sunk: [6, 18], turn: [0.07, 0.17], rag: 2.6 };
// The beds in a block's broken sides: how thick each is, and how far one stands out or in from the next, in units.
export const BEDS = { thick: [14, 26], step: 0.9, lean: 0.08 };
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

// What a block needs at each evaluation: its parts (one more for each break), its flakes and its box in the world.
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
  // The breaks: lines across the block in the picture, through a place near its middle, across its long way.
  const ext = [b.box[2] - b.box[0], b.box[3] - b.box[1]], long = ext[0] > ext[1] ? [1, 0] : [0, 1];
  b.lines = [];
  for (let j = 0; j < (b.breaks ?? 0); j++) {
    const along = [-0.2, 0.24, 0.02][j] + 0.16 * (r(10 + j) - 0.5);
    const c = [b.at[0] + long[0] * along * ext[0], b.at[1] + long[1] * along * ext[1]];
    const th = Math.atan2(long[1], long[0]) + Math.PI / 2 + (j === 2 ? Math.PI / 2 : 0) + 0.7 * (r(20 + j) - 0.5);
    b.lines.push({ c, t: [Math.cos(th), Math.sin(th)], m: [-Math.sin(th), Math.cos(th)], seed: b.seed * 7 + j });
  }
  // Each part: how far back it stands and how it is turned.
  b.parts = [];
  for (let p = 0; p < 1 << b.lines.length; p++) {
    let sunk = 0;
    const tilt = [0, 0, 0];
    for (let j = 0; j < b.lines.length; j++) if (p & (1 << j)) {
      sunk += BREAK.sunk[0] + (BREAK.sunk[1] - BREAK.sunk[0]) * r(30 + j);
      const turn = BREAK.turn[0] + (BREAK.turn[1] - BREAK.turn[0]) * r(40 + j), a = r(50 + j) * Math.PI * 2;
      for (let i = 0; i < 3; i++) tilt[i] += turn * (Math.cos(a) * t1[i] + Math.sin(a) * t2[i]);
    }
    const n = norm([b.n[0] + tilt[0], b.n[1] + tilt[1], b.n[2] + tilt[2]]);
    b.parts.push({ n, h: dot(n, P0) - sunk });
  }
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
    const F = onFace(b, px, py);
    for (const s of [6, -b.thick - 6]) for (let i = 0; i < 3; i++) { const v = F[i] + b.e[i] * s * b.ke; lo[i] = Math.min(lo[i], v); hi[i] = Math.max(hi[i], v); }
  }
  // The sides are at right angles to the face: a side reaches out as far as the face is turned from the view.
  const pad = b.thick + 30;
  b.lo = lo.map((v) => v - pad); b.hi = hi.map((v) => v + pad);
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
  // The broken sides, with the beds in them.
  const u = -s, bt = BEDS.thick[0] + (BEDS.thick[1] - BEDS.thick[0]) * hash(b.seed, 7);
  const bed = b.beds ? Math.floor((u + BEDS.lean * ((qx - b.at[0]) * b.bedTilt[0] + (qy - b.at[1]) * b.bedTilt[1]) * UNIT) / bt) : 0;
  const side = sample(b.outline, qx, qy) * UNIT - (b.beds && u > 3 ? BEDS.step * (hash(bed, b.seed) - 0.5) * 2 : 0);
  // The face: each part its own plane, divided by the ragged lines of the breaks.
  const sw = SWELL.deep * (L.noise(x / SWELL.over, y / SWELL.over, z / SWELL.over, (b.seed + 3) & 1023) - 0.5) * 2
    + SWELL.fine * (L.noise(x / SWELL.fineOver, y / SWELL.fineOver, z / SWELL.fineOver, (b.seed + 5) & 1023) - 0.5) * 2;
  let face = Infinity;
  const g = b.lines.map((l) => {
    const dx = qx - l.c[0], dy = qy - l.c[1], along = dx * l.t[0] + dy * l.t[1];
    const rag = BREAK.rag * ((L.noise(along / 9, 0.5, 0.5, l.seed & 1023) - 0.5) * 2 + 0.5 * (L.noise(along / 3, 1.5, 0.5, (l.seed + 1) & 1023) - 0.5) * 2);
    return (dx * l.m[0] + dy * l.m[1] - rag) * UNIT;
  });
  for (let k = 0; k < b.parts.length; k++) {
    const pt = b.parts[k];
    let f = dot(pt.n, p) - pt.h + sw;
    for (let j = 0; j < g.length; j++) f = Math.max(f, k & (1 << j) ? -g[j] : g[j]);
    face = Math.min(face, f);
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
