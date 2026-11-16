// A traced mass made solid: the slab, its broken edges and the breaks on its face, all as planes.
import { L } from '../../lib/plan.mjs';
import { D, VIEW, add, box, corners, cross, dot, facing, hull, mul, onPlane, plane, sub, turn, unit } from './poly.mjs';

const CORE = L.CORE.at;

// How far toward the visitor the planet's outer surface is, at a place across and up.
export function skinZ(x, y) {
  const d = Math.max(0, -(y + L.RIM)) / L.WORLD.deep, r = L.WORLD.half * Math.sqrt(Math.max(0, 1 - d * d));
  return Math.sqrt(Math.max(0, r * r - x * x));
}

function normalOf(spec, at) {
  const n = spec.n;
  if (Array.isArray(n)) return unit(facing(n[0], n[1]));
  const to = unit(sub(CORE, at));
  let v = unit(add(mul(VIEW, 1 - n.c), mul(to, n.c)));
  if (dot(v, VIEW) < 0.3) v = unit(add(v, mul(VIEW, 0.45)));
  if (n.yaw || n.pitch) v = unit(add(v, facing(n.yaw ?? 0, n.pitch ?? 0)));
  return v;
}

export function depthOf(spec, cx, cy) {
  const z = spec.z;
  if (!Array.isArray(z)) return z;
  const mid = L.fromPicture(cx, cy, 300);
  if (z[0] === 'lip') return L.lip(mid[0]) - z[1];
  // ['skin', d]: so far behind the planet's outer surface.
  let zz = 300;
  for (let i = 0; i < 4; i++) { const p = L.fromPicture(cx, cy, zz); zz = skinZ(p[0], p[1]) - z[1]; }
  return zz;
}

// A V cut into an edge: two planes through a point inside the slab, opening outward.
function notch(A, m, n, e, a1, a2, tilt) {
  const dl = turn(m, n, a1), dr = turn(m, n, -a2);
  let nl = unit(cross(n, dl)), nr = unit(cross(n, dr));
  if (dot(nl, m) < 0) nl = mul(nl, -1);
  if (dot(nr, m) < 0) nr = mul(nr, -1);
  nl = unit(add(nl, mul(n, tilt))); nr = unit(add(nr, mul(n, -tilt)));
  return [plane(mul(nl, -1), A), plane(mul(nr, -1), A)];
}

// A slab from its traced spec. rnd draws everything that is not traced: how its sides lean, its notches, its steps.
export function slab(spec, rnd, opts = {}) {
  const o = hull(spec.o), k = o.length;
  const cx = o.reduce((s, p) => s + p[0], 0) / k, cy = o.reduce((s, p) => s + p[1], 0) / k;
  const z = depthOf(spec, cx, cy);
  const C0 = L.fromPicture(cx, cy, z), n = normalOf(spec, C0), d = dot(n, C0);
  const P = o.map(([px, py]) => onPlane(px, py, n, d));
  const t = spec.t ?? 36;
  const planes = [[n[0], n[1], n[2], d]];
  // The back, a little out of parallel, so the slab thins toward one edge.
  const axis = unit(cross(n, [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]));
  planes.push(plane(turn(mul(n, -1), axis, (5 + 12 * rnd()) * D), add(C0, mul(n, -t))));
  // A second face a few degrees off the first: a broad face is very slightly bowed.
  const size = Math.max(...P.map((p) => Math.hypot(...sub(p, C0)))) * 2;
  if (opts.ridge !== false && size > 30) {
    const r = turn(n, unit(cross(n, [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5])), (3 + 7 * rnd()) * D);
    planes.push(plane(r, add(C0, mul(n, -(0.5 + 2 * rnd())))));
  }
  // The sides: each through an edge of the face, most cut under so the edge reads thin.
  const sides = [];
  const lean = spec.lean ?? [-46, 2];
  for (let i = 0; i < k; i++) {
    const a = P[i], b = P[(i + 1) % k], e = unit(sub(b, a));
    let m = unit(cross(e, n));
    if (dot(m, sub(a, C0)) < 0) m = mul(m, -1);
    const l = (lean[0] + (lean[1] - lean[0]) * rnd()) * D;
    planes.push(plane(unit(add(mul(m, Math.cos(l)), mul(n, Math.sin(l)))), a));
    sides.push({ a, b, m, e, len: Math.hypot(...sub(b, a)) });
    // A corner knocked off: one more plane across it.
    if (rnd() < 0.45) {
      const prev = sides.length > 1 ? sides[sides.length - 2] : null;
      const mm = prev ? unit(add(prev.m, m)) : m, c = Math.min(size * 0.12, 14) * (0.4 + 0.8 * rnd());
      planes.push(plane(unit(add(mm, mul(n, (rnd() - 0.3) * 0.8))), add(a, mul(mm, -c))));
    }
  }
  if (spec.cap) {
    const top = L.ground(C0[0], L.lip(C0[0])) - 3 - spec.cap;
    planes.push(plane([0, 1, 0.45], [C0[0], top, L.lip(C0[0])]));
  }
  const pts = corners(planes);
  const bx = box(pts.length ? pts : P, 2);

  // Notches: what breaks an edge into short straight runs. Few, of differing size, none alike.
  const bites = [];
  const deep = spec.bite ?? 1;
  for (const s of sides) {
    if (s.len < 14) continue;
    const count = rnd() < Math.min(0.75, s.len / 80) ? (s.len > 90 && rnd() < 0.4 ? 2 : 1) : 0;
    for (let j = 0; j < count; j++) {
      const u = (j + 0.2 + 0.6 * rnd()) / count, r = deep * Math.min(size * 0.16, 4 + s.len * (0.06 + 0.12 * rnd()));
      const A = add(add(s.a, mul(sub(s.b, s.a), u)), mul(s.m, -r));
      bites.push(notch(A, s.m, n, s.e, (25 + 45 * rnd()) * D, (25 + 45 * rnd()) * D, (rnd() - 0.5) * 0.9));
    }
  }
  // Chips: small notches along the front edges, finer than the notches above.
  for (const s of sides) {
    const count = Math.floor((s.len / 48) * (spec.chips ?? 1) * (0.3 + 1.2 * rnd()));
    for (let j = 0; j < count; j++) {
      const u = rnd(), r = 2.4 + 7 * rnd() * rnd();
      const A = add(add(add(s.a, mul(sub(s.b, s.a), u)), mul(s.m, -r)), mul(n, r * 0.4 * rnd()));
      bites.push(notch(A, s.m, n, s.e, (30 + 40 * rnd()) * D, (30 + 40 * rnd()) * D, (rnd() - 0.2) * 1.2));
    }
  }
  // Steps across the face: short breaks where a layer of it has come away, most running one way on a slab, as
  // a bedded plate breaks, none ruled across the whole of it.
  const steps = spec.steps ?? Math.min(6, Math.floor(size / 34 + rnd() * 1.2));
  const grain = turn(sides[0].e, n, rnd() * Math.PI);
  for (let j = 0; j < steps; j++) {
    const along = unit(turn(grain, n, (rnd() - 0.5) * 0.7)), across = unit(cross(n, along));
    const u = rnd() - 0.5, v = rnd() - 0.5;
    const p0 = add(C0, add(mul(across, u * size * 0.8), mul(along, v * size * 0.6)));
    const h = 1.6 + 3.4 * rnd() * rnd() + (size > 90 ? 1 : 0), len = size * (0.2 + 0.5 * rnd());
    const side = rnd() < 0.5 ? 1 : -1;
    const riser = unit(add(mul(across, side), mul(n, -0.1 + 0.45 * rnd())));
    const end = unit(add(along, mul(across, (rnd() - 0.5) * 0.8)));
    const start = unit(add(mul(along, -1), mul(across, (rnd() - 0.5) * 0.8)));
    bites.push([
      plane(mul(n, -1), add(C0, mul(n, -h - 0.25 * j))),
      plane(mul(riser, -1), p0),
      plane(end, add(p0, mul(along, len * (0.4 + 0.6 * rnd())))),
      plane(start, add(p0, mul(along, -len * (0.2 + 0.6 * rnd())))),
    ]);
  }
  return { id: spec.id, planes, bites, box: bx, face: { C: C0, n, P, size, t } };
}
