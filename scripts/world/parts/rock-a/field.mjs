// Sculptor A's torn rock: picture 9's rock as slabs. The field is under 0 inside rock.
//
// What is left of the planet is its body, drawn back from the tear so there is dark space behind the slabs: the
// planet (its outer surface and its top, which are the skin and are not changed), kept where it is outside the
// torn front, behind a broken bowl round the core, or in the thick shelf under the land. Every traced mass
// (trace.mjs) is a slab of its own on that body, with its edges bitten and its face stepped, and a second
// generation of smaller pieces lies between and on them. Then what the picture has as open air is taken away: under
// its lowest line, in front of the core, round the core, and where the stream falls.
import { L } from '../../lib/plan.mjs';
import { BOTTOM, EDGE_LEFT, EDGE_RIGHT, SLABS } from './trace.mjs';
import { slab } from './shape.mjs';
import { Buckets, add, box, chip, corners, mul, plane, unit, value } from './poly.mjs';
import { second } from './second.mjs';
import { fill } from './fill.mjs';

export const lip = 1.1;

const U = L.PICTURE.unit, [CX, CY, CZ] = L.CORE.at;
const [PCX, PCY] = L.pictured(CX, CY, CZ);
// The bowl the tear left behind the slabs: how far back it is behind the core, and how fast it comes forward
// across and up and down.
const BOWL = { back: -60, kx: 0.0017, up: 0.0052, down: 0.0021, step: 56 };
// The shelf under the land: its underside, and how far behind the lip its front is.
const SHELF = { low: -71.37, back: 84 };
// Nothing nearer the core than this; nothing in front of it within this of its middle, in the picture's pixels.
const KEEP = L.CORE.r + 18, CLEAR = 93;
// Where the stream falls from the core's foot: the picture's columns kept open in front of the core's plane.
const FALL = [676, 701];

let bowl, bowlGrid, slabs, cuts, sBuckets, cBuckets, ball;
const BG = { x0: -720, y0: -680, size: 24, nx: 60, ny: 32 };

export async function setup(args = {}) {
  const rnd = L.seeded(9001);
  // The bowl: planes tangent to a bowl round the core, each at a place a little off a grid and let back a little.
  const ky = (y) => (y > CY ? BOWL.up : BOWL.down);
  const f = (x, y) => BOWL.back + BOWL.kx * (x - CX) ** 2 + ky(y) * (y - CY) ** 2;
  bowl = [];
  for (let y = -470; y <= -40; y += BOWL.step * 0.8) for (let x = -560; x <= 560; x += BOWL.step) {
    const a = x + (rnd() - 0.5) * BOWL.step * 0.8, b = y + (rnd() - 0.5) * BOWL.step * 0.6;
    const fx = 2 * BOWL.kx * (a - CX), fy = 2 * ky(b) * (b - CY), c = f(a, b) - 10 - 40 * rnd();
    // z = c + fx (x - a) + fy (y - b): as a plane, inside where z - ... < 0.
    const nrm = Math.hypot(fx, fy, 1);
    bowl.push([-fx / nrm, -fy / nrm, 1 / nrm, (c - fx * a - fy * b) / nrm]);
  }
  // Which bowl planes can be the nearest in each column of a grid across and up.
  bowlGrid = new Array(BG.nx * BG.ny);
  for (let i = 0; i < BG.nx; i++) for (let j = 0; j < BG.ny; j++) {
    const keep = new Set();
    for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]]) {
      const x = BG.x0 + (i + u) * BG.size, y = BG.y0 + (j + v) * BG.size;
      const zs = bowl.map((p) => (p[3] - p[0] * x - p[1] * y) / p[2]), top = Math.max(...zs);
      zs.forEach((zz, q) => { if (zz > top - 70) keep.add(q); });
    }
    bowlGrid[i + BG.nx * j] = Int32Array.from(keep);
  }

  slabs = [...fill(rnd), ...SLABS].map((s) => slab(s, rnd));
  const extra = second(slabs, rnd, args);
  slabs.push(...extra.slabs);
  cuts = extra.cuts;
  // The rock round the core is not cut smooth: what comes near it is broken back in chips.
  for (let i = 0; i < 70; i++) {
    const yy = 1 - (2 * (i + 0.5)) / 70, r = Math.sqrt(1 - yy * yy), a = i * 2.39996 + rnd();
    const dir = unit([r * Math.cos(a), yy, r * Math.sin(a)]);
    if (dir[2] > 0.3) continue;
    const size = 16 + 16 * rnd(), at = add(L.CORE.at, mul(dir, KEEP + size * (0.2 + 0.5 * rnd())));
    const planes = chip(at, size, rnd, 6);
    cuts.push({ planes, box: box(corners(planes), 1) });
  }
  const lo = [-720, -680, -720], hi = [720, 80, 720];
  sBuckets = new Buckets(lo, hi, 24, 8); sBuckets.fill(slabs);
  cBuckets = new Buckets(lo, hi, 24, 8); cBuckets.fill(cuts);

  // Round the core, a solid of planes no nearer than KEEP: what it cuts is cut flat.
  ball = [];
  const N = 64;
  for (let i = 0; i < N; i++) {
    const yy = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - yy * yy), a = i * 2.39996 + rnd() * 0.3;
    const dir = unit([r * Math.cos(a), yy, r * Math.sin(a)]);
    ball.push(plane(dir, add(L.CORE.at, mul(dir, KEEP + 1 + 5 * rnd()))));
  }
}

const line = (pts, x) => {
  if (x <= pts[0][0]) return [pts[0][1], 0];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], s = (y1 - y0) / (x1 - x0); return [y0 + s * (x - x0), s]; }
  return [pts[pts.length - 1][1], 0];
};
// The same, for a line given across at each place down.
const column = (pts, y) => {
  if (y <= pts[0][1]) return [pts[0][0], 0];
  for (let i = 1; i < pts.length; i++) if (y <= pts[i][1]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], s = (x1 - x0) / (y1 - y0); return [x0 + s * (y - y0), s]; }
  return [pts[pts.length - 1][0], 0];
};

function planet(x, y, z) {
  const e = (L.shell(x, y, z) - 1) * L.WORLD.deep;
  if (y < -140) return Math.max(e, (y + 66) / 1.15);
  return Math.max(e, (y - L.ground(x, z) + 1) / 1.15);
}

function keepOf(x, y, z, px, py) {
  // Outside the torn front: the planet whole.
  const [el, sl] = column(EDGE_LEFT, py), [er, sr] = column(EDGE_RIGHT, py);
  const out = Math.min((px - el) / Math.hypot(1, sl), (er - px) / Math.hypot(1, sr)) * U;
  // Behind the bowl.
  const i = Math.floor((x - BG.x0) / BG.size), j = Math.floor((y - BG.y0) / BG.size);
  let b = 1e9;
  if (i >= 0 && j >= 0 && i < BG.nx && j < BG.ny) {
    for (const q of bowlGrid[i + BG.nx * j]) { const p = bowl[q], v = p[0] * x + p[1] * y + p[2] * z - p[3]; if (v < b) b = v; }
    b = Math.min(b, 40);
  } else b = -40;
  // The shelf under the land.
  const lz = L.lip(x), sh = Math.max(SHELF.low - y, (z - lz + SHELF.back) * 0.8);
  return Math.min(out, b, sh);
}

function slabsAt(x, y, z, best) {
  const c = sBuckets.cell(x, y, z);
  if (c < 0) return best;
  let m = Math.min(best, sBuckets.far[c]);
  const list = sBuckets.lists[c];
  if (!list) return m;
  for (let q = 0; q < list.length; q++) {
    const s = slabs[list[q]];
    let v = value(s.planes, x, y, z);
    if (v >= m) continue;
    for (const b of s.bites) { const w = -value(b, x, y, z); if (w > v) { v = w; if (v >= m) break; } }
    if (v < m) m = v;
  }
  return m;
}

function cutsAt(x, y, z) {
  const c = cBuckets.cell(x, y, z);
  if (c < 0) return 1e9;
  let m = cBuckets.far[c];
  const list = cBuckets.lists[c];
  if (list) for (let q = 0; q < list.length; q++) { const v = value(cuts[list[q]].planes, x, y, z); if (v < m) m = v; }
  return m;
}

export function field(x, y, z) {
  let m = planet(x, y, z);
  if (m > 0.5) return m;
  const [px, py] = L.pictured(x, y, z);
  // Open air under the picture's lowest line.
  const [bl, bs] = line(BOTTOM, px);
  m = Math.max(m, ((py - bl) * U) / Math.hypot(1, bs));
  if (m > 0.5) return m;
  // In front of the core, and where the stream falls.
  const dp = Math.hypot(px - PCX, py - PCY);
  let g = Math.max((dp - CLEAR) * U, CZ - z);
  if (py > PCY) g = Math.min(g, Math.max((FALL[0] - px) * U, (px - FALL[1]) * U, CZ - 12 - z));
  m = Math.max(m, -g);
  // Round the core.
  m = Math.max(m, -value(ball, x, y, z));
  if (m > 0.5) return m;
  const k = keepOf(x, y, z, px, py);
  m = Math.max(m, slabsAt(x, y, z, k));
  return Math.max(m, -cutsAt(x, y, z));
}
