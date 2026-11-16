// Sculpt B of the rock: a relief of leaves. Each mass traced off picture 9 (trace.mjs) is a slab whose outline is
// where the picture has it, laid as leaves of stone parallel to its face, each leaf broken into long plates that are
// there or gone whole and tipped a little as rigid pieces, with chips off their edges, stubs hanging under the roof
// and the floor, and rubble on what faces up. Behind the masses are deeper slabs seen only through the gaps, and
// left and right of the torn edges the planet is whole. All of it is cut to the planet's body and its top, and kept
// off the core.
//
//   field(x, y, z) under 0 inside the rock, a true distance near its faces, which are true planes.
import { L } from '../../lib/plan.mjs';
import { MASSES, TORN } from './trace.mjs';
import { add, dot, unit, facing, frame, onPlane, hull, halves, clip, slab, move, stone, wedge, area2, TOWARD } from './solid.mjs';

export const lip = 1.2;

// How each kind of mass is broken. It is a stack of thin leaves: how many, how thick each is, and how far each
// leaf above steps in from the one under it at an edge that steps (terrace, the share of edges that do). Its top
// leaf is its broad face, split by a few cracks (cracks, the most) with a gap; each piece is tipped (degrees) as one
// rigid piece. Every leaf loses a corner or two, its edges lean (over 0 grows toward the back), and under the stack
// the rest of its thickness is drawn in by a share of its size (under), so the leaves overhang black space.
const KIND = {
  roof: { n: [3, 5], h: [8, 16], step: [3, 10], terrace: 0.35, cracks: 3, crack: [90, 25], gap: 4.5, tip: 1.2, wobble: 0.8, lean: [-0.4, 0.6], under: 0.22, chips: 3 },
  petal: { n: [3, 5], h: [5, 11], step: [3, 9], terrace: 0.4, cracks: 2, crack: [0, 70], gap: 4, tip: 1.6, wobble: 1, lean: [-0.8, 0.5], under: 0.3, chips: 3 },
  wall: { n: [3, 5], h: [8, 16], step: [4, 12], terrace: 0.35, cracks: 3, crack: [0, 70], gap: 4.5, tip: 1.6, wobble: 1, lean: [-0.7, 0.6], under: 0.25, chips: 3 },
  floor: { n: [3, 6], h: [5, 11], step: [3, 11], terrace: 0.45, cracks: 2, crack: [0, 50], gap: 4, tip: 1.6, wobble: 1, lean: [-0.8, 0.6], under: 0.3, chips: 2, rubble: 4 },
  back: { n: [2, 3], h: [10, 20], step: [3, 10], terrace: 0.6, cracks: 3, crack: [0, 90], gap: 4, tip: 2.5, wobble: 1.5, lean: [-0.3, 0.4], under: 0.05, chips: 0 },
};

const solids = [], cuts = [];
const SIZE = 20, MARGIN = 48, CORE_PX = L.pictured(...L.CORE.at);
let grid = null, gridCut = null, lo = null, dims = null;
let P = null, pStart = null, pCount = null, pBound = null, C = null, cStart = null, cCount = null, cBound = null, cutOf = null;

const shellZ = (x, y) => { const t = Math.max(0, -(y + L.RIM)) / L.WORLD.deep, r = L.WORLD.half * Math.sqrt(Math.max(0, 1 - t * t)); return Math.sqrt(Math.max(0, r * r - x * x)); };
const across = (px) => (px - L.PICTURE.mid) * L.PICTURE.unit;

// Where a slab of the roof's front stands: its middle at the land's edge, turned to follow it.
function roofFace(o) {
  const cx = o.reduce((s, p) => s + p[0], 0) / o.length, x = across(cx), top = (x) => Math.min(L.lip(x), shellZ(x, -60) - 22);
  const z = top(x) + 2, slope = (top(x + 20) - top(x - 20)) / 40, yaw = -Math.atan(slope) / L.D2R;
  return { at: [x, L.ground(x, Math.max(0, z - 4)) - 3, z], yaw };
}

function addSolid(s, list) {
  if (!s) return -1;
  list.push(s);
  return list.length - 1;
}

function build(mass, rnd, i) {
  const K = KIND[mass.k];
  const o = mass.o;
  let c, n;
  if (mass.z === 'lip') {
    const r = roofFace(o);
    n = facing(r.yaw + (mass.yaw ?? 0), mass.pitch);
    c = r.at;
  } else {
    const cx = o.reduce((s, p) => s + p[0], 0) / o.length, cy = o.reduce((s, p) => s + p[1], 0) / o.length;
    // A petal of the hollow stands deeper the nearer it is to the core, so the cave opens to the visitor like a
    // funnel, and turns its face to the core and the visitor both.
    const z = mass.z === 'funnel' ? Math.min(260, Math.max(30, 30 + (Math.hypot(cx - CORE_PX[0], cy - CORE_PX[1]) - 95) * 1.35)) + (mass.dz ?? 0) : mass.z;
    c = L.fromPicture(cx, cy, z);
    n = mass.aim != null ? unit(add(unit(add(add(CORE, c, -1), [0, 0, 0])), TOWARD, mass.aim)) : facing(mass.yaw, mass.pitch);
    if (mass.aim != null) n = unit(add(n, add(facing(mass.yaw ?? 0, mass.pitch ?? 0), [0, 0, 1], -1)));
  }
  const f = frame(c, n, (mass.g ?? 0) + (rnd() - 0.5) * 50);
  // The outline on the face, each long edge broken by a corner or two pushed out a little.
  let pts = o.map(([px, py]) => f.to2(onPlane(px, py, c, n)));
  {
    const more = [];
    for (let j = 0; j < pts.length; j++) {
      const a = pts[j], b = pts[(j + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      more.push(a);
      const cuts = Math.floor(l / 26);
      for (let q = 1; q <= cuts; q++) {
        const t = (q + (rnd() - 0.5) * 0.6) / (cuts + 1), out = 0.5 + rnd() * 3.5;
        more.push([a[0] + (b[0] - a[0]) * t + ((b[1] - a[1]) / l) * out, a[1] + (b[1] - a[1]) * t - ((b[0] - a[0]) / l) * out]);
      }
    }
    pts = more;
  }
  const outline = halves(hull(pts));
  const lean = () => K.lean[0] + rnd() * (K.lean[1] - K.lean[0]);
  const between = ([lo, hi]) => lo + rnd() * (hi - lo);
  const size = Math.sqrt(Math.abs(area2(hull(pts))));
  // The stack, from its top leaf down: how far each edge of each leaf is drawn in.
  const count = Math.round(between(K.n)), edges = outline.length, steps = [];
  const terraced = outline.map(() => rnd() < K.terrace);
  let inset = outline.map(() => 0);
  for (let k = count - 1; k >= 0; k--) {
    steps[k] = inset;
    inset = inset.map((e, j) => e + (terraced[j] ? (rnd() < 0.75 ? between(K.step) : 0) : (rnd() < 0.2 ? between(K.step) * 0.5 : 0)));
  }
  // A corner or two lost from a leaf: a line across near a corner.
  const corner = (hs) => {
    const poly = clip(hs);
    if (poly.length < 3) return [];
    const q = poly[Math.floor(rnd() * poly.length)], t = rnd() * Math.PI * 2, mx = Math.cos(t), my = Math.sin(t);
    const toMid = poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);
    const sx = (q[0] - toMid[0]), sy = (q[1] - toMid[1]), l = Math.hypot(sx, sy) || 1;
    const ox = (sx / l + mx * 0.6), oy = (sy / l + my * 0.6), ol = Math.hypot(ox, oy) || 1;
    return [[ox / ol, oy / ol, (ox / ol) * q[0] + (oy / ol) * q[1] - (3 + rnd() * 12)]];
  };
  let depth = 0;
  let topThick = 0;
  const tops = [], face = clip(outline.map(([mx, my, cc], j) => [mx, my, cc - steps[0][j]]));
  for (let k = 0; k < count; k++) {
    const h = between(K.h), a = depth, b = Math.min(mass.T, depth + h);
    depth = b;
    if (k === 0) topThick = b - a;
    if (b - a < 2) break;
    const hs = outline.map(([mx, my, cc], j) => [mx, my, cc - steps[k][j]]);
    for (let q = Math.floor(rnd() * 3); q > 0; q--) hs.push(...corner(hs));
    // The top leaf is split by a few cracks across it, each piece tipped on its own; the leaves under it are whole
    // and only a little out of true, which is what makes them read as layers.
    const pieces = [[]];
    if (k === 0) {
      const cracks = Math.floor(rnd() * (K.cracks + 1));
      for (let q = 0; q < cracks; q++) {
        const t = (K.crack[0] + (mass.g ?? 0) + (rnd() - 0.5) * 2 * K.crack[1]) * L.D2R, mx = Math.cos(t), my = Math.sin(t), at = (rnd() - 0.5) * size * 0.6;
        const next = [];
        for (const p of pieces) { next.push([...p, [mx, my, at - K.gap / 2]], [...p, [-mx, -my, -at - K.gap / 2]]); }
        pieces.splice(0, pieces.length, ...next);
      }
    }
    for (const extra of pieces) {
      const all = [...hs, ...extra];
      let s0 = slab(f, all, all.map((_, j) => (j < hs.length ? lean() : (rnd() - 0.5) * 0.6)), a, b);
      if (!s0) continue;
      const mid = s0.corners.reduce((q, p) => add(q, p, 1 / s0.corners.length), [0, 0, 0]), axis = add(f.u.map((x) => x * (rnd() - 0.5)), f.v, rnd() - 0.5);
      const tip = k === 0 && pieces.length > 1 ? K.tip : K.wobble;
      s0 = move(s0, mid, axis, tip * (0.3 + 0.7 * rnd()) * L.D2R, n.map((x) => x * (k === 0 ? (rnd() - 0.5) * 2 : 0)));
      const id = addSolid(s0, solids);
      if (k === 0) tops.push(id);
      if (k < 2) {
        const front = s0.corners.slice(0, s0.corners.length / 2);
        for (let q = Math.floor(rnd() * (K.chips + 1)); q > 0 && front.length > 2; q--) {
          const j = Math.floor(rnd() * front.length), p = add(front[j], add(front[(j + 1) % front.length], front[j], -1), rnd()), r = 3 + rnd() * 8;
          cuts.push({ solid: wedge(add(p, n, r * 0.2), r, rnd), of: id });
        }
      }
    }
  }
  // The rest of its thickness, drawn in from every edge, so the leaves overhang it.
  if (mass.T - depth > 4) {
    const hs = outline.map(([mx, my, cc], j) => [mx, my, cc - steps[count - 1][j] - size * (mass.under ?? K.under) * (0.6 + 0.8 * rnd())]);
    addSolid(slab(f, hs, hs.map(() => lean() * 0.5), depth, mass.T), solids);
  }
  // Breaks of every size on the broad face: thin flakes standing proud of it, many of them at its edges where
  // they peel, and flat scars where a flake has come away.
  if (face.length > 2) {
    const fsize = Math.sqrt(Math.abs(area2(face))), many = Math.round((fsize * fsize) / 2000 * (K.flakes ?? 1));
    const inside = () => {
      const a = face[Math.floor(rnd() * face.length)], b = face[Math.floor(rnd() * face.length)], m0 = face.reduce((q, p) => [q[0] + p[0] / face.length, q[1] + p[1] / face.length], [0, 0]);
      const t = rnd(), w = rnd() < 0.65 ? 0.1 + 0.18 * rnd() : 0.1 + 0.9 * rnd();
      const e = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      return [e[0] + (m0[0] - e[0]) * w, e[1] + (m0[1] - e[1]) * w];
    };
    const grain = ((mass.g ?? 0) + (rnd() - 0.5) * 60) * L.D2R;
    for (let q = 0; q < many; q++) {
      const [cx, cy] = inside(), r0 = 5 + Math.pow(rnd(), 1.6) * fsize * 0.26, along = 1.4 + rnd() * 1.4, turn = grain + (rnd() - 0.5) * 0.5;
      const corners = [];
      const sides = 4 + Math.floor(rnd() * 3);
      for (let j = 0; j < sides; j++) {
        const t = (j / sides) * Math.PI * 2 + (rnd() - 0.5) * 1.1, r = r0 * (0.45 + 0.65 * rnd());
        const x = Math.cos(t) * r * along, y = Math.sin(t) * r;
        corners.push([cx + x * Math.cos(turn) - y * Math.sin(turn), cy + x * Math.sin(turn) + y * Math.cos(turn)]);
      }
      const hs = halves(hull(corners));
      const proud = rnd() < 0.6, thick = 3.5 + rnd() * Math.min(5, r0 * 0.15);
      // A scar goes through the top leaf to the one under it, so its floor is that leaf's own face.
      let s0 = proud ? slab(f, hs, hs.map(() => (rnd() - 0.5) * 0.8), -thick, 1) : slab(f, hs, hs.map(() => 0.1 + 0.3 * rnd()), -4, topThick + 4);
      if (!s0) continue;
      const mid = s0.corners.reduce((z, p) => add(z, p, 1 / s0.corners.length), [0, 0, 0]);
      s0 = move(s0, mid, add(f.u.map((x) => x * (rnd() - 0.5)), f.v, rnd() - 0.5), (0.5 + rnd() * 2.5) * L.D2R, [0, 0, 0]);
      if (proud) addSolid(s0, solids);
      else for (const id of tops) cuts.push({ solid: s0, of: id });
    }
  }
  // Rubble lying on a face turned up.
  for (let q = 0; q < (K.rubble ?? 0); q++) {
    const j = Math.floor(rnd() * o.length), k2 = (j + 1) % o.length, t = rnd();
    const px = o[j][0] + (o[k2][0] - o[j][0]) * t, py = o[j][1] + (o[k2][1] - o[j][1]) * t;
    const mid = o.reduce((s, p) => [s[0] + p[0] / o.length, s[1] + p[1] / o.length], [0, 0]), w = 0.3 + 0.6 * rnd();
    const p = onPlane(px * (1 - w) + mid[0] * w, py * (1 - w) + mid[1] * w, c, n), r = 3 + rnd() * 6;
    addSolid(wedge(add(p, n, r * 0.35), r, rnd), solids);
  }
}

// Prisms along the view, worked out in two dimensions across it: the planet whole left of the left torn edge and
// right of the right one, cut back to its outer surface, and the deep rock behind everything, seen only through the
// gaps. Each is a polygon in the picture, set at a depth, and a range of depth along the view.
const VIEW = frame([0, 0, 0], TOWARD, 0);
const prisms = [];
function prism(poly, zAt, front, back) {
  const pts = poly.map(([px, py]) => VIEW.to2(L.fromPicture(px, py, zAt)));
  prisms.push({ pts: Float64Array.from(pts.flat()), front: dot(L.fromPicture(688, 437, front), TOWARD), back: dot(L.fromPicture(688, 437, back), TOWARD) });
}
function whole(edge, side, rnd) {
  const line = [];
  for (let j = 0; j + 1 < edge.length; j++) {
    const [ax, ay] = edge[j], [bx, by] = edge[j + 1], steps = Math.max(1, Math.round((by - ay) / 14));
    for (let q = 0; q < steps; q++) { const t = q / steps; line.push([ax + (bx - ax) * t + (ay > 300 && q > 0 ? (rnd() - 0.5) * 9 : 0), ay + (by - ay) * t]); }
  }
  line.push(edge[edge.length - 1]);
  const far = side < 0 ? -400 : 1776, poly = [[far, line[0][1]], ...line, [far, line[line.length - 1][1]]];
  prism(side < 0 ? poly : poly.reverse(), 420, 2000, -2000);
}
function poly2(a, b, pts) {
  let d = Infinity, inside = false;
  const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ax = pts[j * 2], ay = pts[j * 2 + 1], bx = pts[i * 2], by = pts[i * 2 + 1];
    const ex = bx - ax, ey = by - ay, wx = a - ax, wy = b - ay, t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1)));
    const qx = wx - ex * t, qy = wy - ey * t, q = qx * qx + qy * qy;
    if (q < d) d = q;
    if ((ay > b) !== (by > b) && a < ax + ((b - ay) * ex) / (ey || 1e-12)) inside = !inside;
  }
  d = Math.sqrt(d);
  return inside ? -d : d;
}
function prismsAt(x, y, z) {
  const a = x * VIEW.u[0] + y * VIEW.u[1] + z * VIEW.u[2], b = x * VIEW.v[0] + y * VIEW.v[1] + z * VIEW.v[2], along = x * TOWARD[0] + y * TOWARD[1] + z * TOWARD[2];
  let best = Infinity;
  for (const p of prisms) {
    let f = Math.max(along - p.front, p.back - along);
    if (f >= best) continue;
    const g = poly2(a, b, p.pts);
    if (g > f) f = g;
    if (f < best) best = f;
  }
  return best;
}

// The land behind its front edge is whole: rock under the top, back from the edge, hidden by the roof's slabs.
const LAND = new Float64Array(265);
function land() {
  for (let i = 0; i < LAND.length; i++) { const x = -660 + i * 5; LAND[i] = Math.min(L.lip(x), shellZ(x, -60) - 22) - 34; }
}
function landAt(x, y, z) {
  const f = Math.max(0, Math.min(LAND.length - 1.001, (x + 660) / 5)), i = Math.floor(f), t = f - i;
  return Math.max(-62 - y, (z - (LAND[i] * (1 - t) + LAND[i + 1] * t)) / 1.25);
}

export async function setup() {
  if (P) return;
  const rnd = L.seeded(2083);
  // Each mass draws from its own seed, so changing one leaves the others as they were.
  MASSES.forEach((mass, i) => { if (mass.k !== 'deep') build(mass, L.seeded(7919 * (i + 1) + 13), i); });
  whole(TORN.left, -1, rnd);
  whole(TORN.right, 1, rnd);
  const deep = MASSES.find((q) => q.k === 'deep');
  prism(deep.o, deep.z, deep.z, deep.z - deep.T);
  land();
  pack();
}

function bound(s) {
  let cx = 0, cy = 0, cz = 0;
  for (const p of s.corners) { cx += p[0]; cy += p[1]; cz += p[2]; }
  const k = s.corners.length;
  cx /= k; cy /= k; cz /= k;
  let r = 0;
  for (const p of s.corners) r = Math.max(r, Math.hypot(p[0] - cx, p[1] - cy, p[2] - cz));
  // A leaned side reaches past the corners worked out from the leaf's own outline only by the lean over the slab's
  // depth, which the corners of its back already hold: a unit more for rounding.
  return [cx, cy, cz, r + 1];
}

function pack() {
  const flat = (list) => {
    const start = new Int32Array(list.length), count = new Int32Array(list.length), bnd = new Float64Array(list.length * 4);
    let total = 0;
    list.forEach((s, i) => { start[i] = total; count[i] = s.planes.length; total += s.planes.length; bnd.set(bound(s), i * 4); });
    const planes = new Float64Array(total * 4);
    list.forEach((s, i) => s.planes.forEach((p, j) => planes.set(p, (start[i] + j) * 4)));
    return { start, count, bnd, planes };
  };
  const a = flat(solids), b = flat(cuts.map((c) => c.solid));
  P = a.planes; pStart = a.start; pCount = a.count; pBound = a.bnd;
  C = b.planes; cStart = b.start; cCount = b.count; cBound = b.bnd;
  cutOf = cuts.map((c) => c.of);
  // The cuts of each solid, in one list.
  const per = solids.map(() => []);
  cuts.forEach((c, i) => per[c.of].push(i));
  const cutsFirst = new Int32Array(solids.length + 1);
  for (let i = 0; i < solids.length; i++) cutsFirst[i + 1] = cutsFirst[i] + per[i].length;
  const cutsList = new Int32Array(cutsFirst[solids.length]);
  per.forEach((l, i) => cutsList.set(l, cutsFirst[i]));
  gridCut = { first: cutsFirst, list: cutsList };

  lo = [-700, -680, -720];
  dims = [Math.ceil(1400 / SIZE), Math.ceil(760 / SIZE), Math.ceil(1440 / SIZE)];
  const cellsOf = new Array(dims[0] * dims[1] * dims[2]);
  for (let i = 0; i < solids.length; i++) {
    const cx = pBound[i * 4], cy = pBound[i * 4 + 1], cz = pBound[i * 4 + 2], r = pBound[i * 4 + 3] + MARGIN;
    const i0 = Math.max(0, Math.floor((cx - r - lo[0]) / SIZE)), i1 = Math.min(dims[0] - 1, Math.floor((cx + r - lo[0]) / SIZE));
    const j0 = Math.max(0, Math.floor((cy - r - lo[1]) / SIZE)), j1 = Math.min(dims[1] - 1, Math.floor((cy + r - lo[1]) / SIZE));
    const k0 = Math.max(0, Math.floor((cz - r - lo[2]) / SIZE)), k1 = Math.min(dims[2] - 1, Math.floor((cz + r - lo[2]) / SIZE));
    for (let ii = i0; ii <= i1; ii++) for (let jj = j0; jj <= j1; jj++) for (let kk = k0; kk <= k1; kk++) {
      // Only the cells the solid's sphere comes within the margin of.
      const bx = lo[0] + (ii + 0.5) * SIZE, by = lo[1] + (jj + 0.5) * SIZE, bz = lo[2] + (kk + 0.5) * SIZE;
      if (Math.hypot(bx - cx, by - cy, bz - cz) > r + SIZE * 0.87) continue;
      const key = ii + dims[0] * (jj + dims[1] * kk);
      (cellsOf[key] ??= []).push(i);
    }
  }
  const first = new Int32Array(cellsOf.length + 1);
  for (let i = 0; i < cellsOf.length; i++) first[i + 1] = first[i] + (cellsOf[i]?.length ?? 0);
  const list = new Int32Array(first[cellsOf.length]);
  for (let i = 0; i < cellsOf.length; i++) if (cellsOf[i]) list.set(cellsOf[i], first[i]);
  grid = { first, list };
}

export const count = () => ({ solids: solids.length, cuts: cuts.length });

const CORE = L.CORE.at, KEEP = L.CORE.r + 16, TUBE = 90 * L.PICTURE.unit + 4, [TX, TY, TZ] = TOWARD;

function solidAt(i, x, y, z, best) {
  const b = i * 4, dx = x - pBound[b], dy = y - pBound[b + 1], dz = z - pBound[b + 2];
  if (Math.sqrt(dx * dx + dy * dy + dz * dz) - pBound[b + 3] >= best) return best;
  let f = -Infinity;
  for (let q = pStart[i], e = q + pCount[i]; q < e; q++) {
    const o = q * 4, d = P[o] * x + P[o + 1] * y + P[o + 2] * z - P[o + 3];
    if (d > f) { f = d; if (f >= best) return best; }
  }
  for (let q = gridCut.first[i], e = gridCut.first[i + 1]; q < e; q++) {
    const c = gridCut.list[q], cb = c * 4, ex = x - cBound[cb], ey = y - cBound[cb + 1], ez = z - cBound[cb + 2];
    if (Math.sqrt(ex * ex + ey * ey + ez * ez) - cBound[cb + 3] >= -f) continue;
    let g = -Infinity;
    for (let s = cStart[c], t = s + cCount[c]; s < t; s++) {
      const o = s * 4, d = C[o] * x + C[o + 1] * y + C[o + 2] * z - C[o + 3];
      if (d > g) g = d;
    }
    if (-g > f) f = -g;
  }
  return f < best ? f : best;
}

export function field(x, y, z) {
  // The planet's body.
  const r = Math.sqrt(x * x + z * z) / L.WORLD.half, d = Math.max(0, -(y + L.RIM)) / L.WORLD.deep;
  const body = (Math.sqrt(r * r + d * d) - 1) * L.WORLD.deep;
  let out = body;
  if (y > -90) {
    const top = y - (L.ground(x, z) - 3);
    if (top > out) out = top;
  }
  if (out >= MARGIN) return out;
  // Kept off the core, and out of the way between it and the visitor.
  const cx = x - CORE[0], cy = y - CORE[1], cz = z - CORE[2], along = cx * TX + cy * TY + cz * TZ;
  const keep = KEEP - Math.sqrt(cx * cx + cy * cy + cz * cz);
  let off = keep;
  if (along > 0) {
    const sx = cx - along * TX, sy = cy - along * TY, sz = cz - along * TZ, tube = Math.min(TUBE - Math.sqrt(sx * sx + sy * sy + sz * sz), along);
    if (tube > off) off = tube;
  }
  if (off > out) out = off;
  if (out >= MARGIN) return out;
  // The rock.
  const ii = Math.floor((x - lo[0]) / SIZE), jj = Math.floor((y - lo[1]) / SIZE), kk = Math.floor((z - lo[2]) / SIZE);
  let best = MARGIN;
  if (ii >= 0 && jj >= 0 && kk >= 0 && ii < dims[0] && jj < dims[1] && kk < dims[2]) {
    const key = ii + dims[0] * (jj + dims[1] * kk);
    for (let q = grid.first[key], e = grid.first[key + 1]; q < e; q++) best = solidAt(grid.list[q], x, y, z, best);
  }
  const p = prismsAt(x, y, z);
  if (p < best) best = p;
  const g = landAt(x, y, z);
  if (g < best) best = g;
  return best > out ? best : out;
}
