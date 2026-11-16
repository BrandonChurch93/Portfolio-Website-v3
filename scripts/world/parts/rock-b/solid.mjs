// Convex solids for sculpt B of the rock: each the intersection of half spaces, kept with its corners so it can be
// bounded. A plane is [nx, ny, nz, d] and its inside is n·p <= d. A traced mass is a slab whose broad face is a
// plane in the world and whose outline is read off picture 9, so it is seen exactly where the picture has it.
import { L } from '../../lib/plan.mjs';

export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// A face turned so many degrees to the visitor's right (yaw) and up (pitch).
export const facing = (yaw, pitch) => unit([Math.sin(yaw * L.D2R) * Math.cos(pitch * L.D2R), Math.sin(pitch * L.D2R), Math.cos(yaw * L.D2R) * Math.cos(pitch * L.D2R)]);
// The way the visitor looks, back along a view ray: what a face turned straight to the visitor faces.
export const TOWARD = unit(L.fromPicture(688, 437, 100).map((v, i) => v - L.fromPicture(688, 437, 0)[i]));

// The point seen at a place in the picture that lies on a plane through c with normal n.
export function onPlane(px, py, c, n) {
  let z0 = c[2], z1 = c[2] + 20;
  let f0 = dot(n, add(L.fromPicture(px, py, z0), c, -1)), f1 = dot(n, add(L.fromPicture(px, py, z1), c, -1));
  for (let i = 0; i < 6 && Math.abs(f1) > 1e-7; i++) {
    if (f1 === f0) break;
    const z2 = z1 - (f1 * (z1 - z0)) / (f1 - f0);
    z0 = z1; f0 = f1; z1 = z2;
    f1 = dot(n, add(L.fromPicture(px, py, z1), c, -1));
  }
  return L.fromPicture(px, py, z1);
}

// A frame on a face: its middle, its normal, and two directions in it, u along the grain.
export function frame(c, n, grain = 0) {
  const up = Math.abs(n[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
  const u0 = unit(cross(up, n)), v0 = cross(n, u0), g = grain * L.D2R;
  const u = add(u0.map((x) => x * Math.cos(g)), v0, Math.sin(g)), v = cross(n, u);
  return { c, n, u, v, to2: (p) => { const d = add(p, c, -1); return [dot(d, u), dot(d, v)]; }, to3: (a, b, depth) => [c[0] + a * u[0] + b * v[0] - depth * n[0], c[1] + a * u[1] + b * v[1] - depth * n[1], c[2] + a * u[2] + b * v[2] - depth * n[2]] };
}

// The convex hull of points in two dimensions, counter clockwise.
export function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && turn(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && turn(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

// A convex polygon, counter clockwise, as half planes [mx, my, c] (m outward and unit, inside m·q <= c).
export function halves(poly) {
  const h = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey);
    if (l < 1e-6) continue;
    const mx = ey / l, my = -ex / l;
    h.push([mx, my, mx * a[0] + my * a[1]]);
  }
  return h;
}

// The polygon a set of half planes leaves of a large square.
export function clip(hs) {
  let poly = [[-4000, -4000], [4000, -4000], [4000, 4000], [-4000, 4000]];
  for (const [mx, my, c] of hs) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], fa = mx * a[0] + my * a[1] - c, fb = mx * b[0] + my * b[1] - c;
      if (fa <= 0) out.push(a);
      if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    poly = out;
    if (poly.length < 3) return [];
  }
  return poly;
}
export const area2 = (poly) => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - a[1] * b[0]; } return s / 2; };

// A slab in a frame: the region between depths a and b behind the face, inside half planes hs, each side leaning
// by its own lean (over 0 grows toward the back, under 0 is undercut). Returns its planes and its corners, or null.
export function slab(f, hs, leans, a, b) {
  const front = clip(hs), back = clip(hs.map(([mx, my, c], i) => [mx, my, c + leans[i] * (b - a)]));
  if (front.length < 3 || back.length < 3 || Math.abs(area2(front)) < 4) return null;
  const n = f.n, cd = dot(n, f.c), planes = [[n[0], n[1], n[2], cd - a], [-n[0], -n[1], -n[2], -(cd - b)]];
  hs.forEach(([mx, my, c], i) => {
    const M = add(f.u.map((x) => x * mx), f.v, my), N = unit(add(M, n, leans[i])), E = f.to3(c * mx, c * my, a);
    planes.push([N[0], N[1], N[2], dot(N, E)]);
  });
  const corners = [...front.map(([x, y]) => f.to3(x, y, a)), ...back.map(([x, y]) => f.to3(x, y, b))];
  return { planes, corners };
}

// A solid turned rigidly by a small rotation (axis, radians) about a point and moved.
export function move(s, about, axis, angle, shift) {
  const k = unit(axis), cs = Math.cos(angle), sn = Math.sin(angle);
  const rot = (v) => { const kv = cross(k, v), kd = dot(k, v); return [v[0] * cs + kv[0] * sn + k[0] * kd * (1 - cs), v[1] * cs + kv[1] * sn + k[1] * kd * (1 - cs), v[2] * cs + kv[2] * sn + k[2] * kd * (1 - cs)]; };
  const at = (p) => add(add(rot(add(p, about, -1)), about), shift);
  return {
    planes: s.planes.map(([nx, ny, nz, d]) => { const N = rot([nx, ny, nz]), p0 = at([nx * d, ny * d, nz * d]); return [N[0], N[1], N[2], dot(N, p0)]; }),
    corners: s.corners.map(at),
  };
}

// A small irregular solid round a point, of about the size given: a chip to cut away or a stone of rubble.
export function stone(at, size, rnd, flat = [0, 1, 0], squash = 1) {
  const dirs = [];
  for (let i = 0; i < 7; i++) {
    const z = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    let d = [r * Math.cos(t), z, r * Math.sin(t)];
    const along = dot(d, flat);
    d = add(d, flat, along * (squash - 1));
    dirs.push(unit(d));
  }
  dirs.push(flat, flat.map((x) => -x));
  const planes = dirs.map((d, i) => { const r = size * (i >= 7 ? 0.35 * squash + 0.15 : 0.55 + 0.45 * rnd()); return [d[0], d[1], d[2], dot(d, at) + r]; });
  // A box round it, so that whatever the cuts it is bounded.
  for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) planes.push([...d, dot(d, at) + size]);
  return { planes, corners: [add(at, [size, size, size]), add(at, [-size, -size, -size])] };
}

// A sharp wedge: a tetrahedron round a point, about the size given, for a chip struck off an edge.
export function wedge(at, size, rnd) {
  const pts = [];
  for (let i = 0; i < 4; i++) {
    const z = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z), k = size * (0.6 + 0.6 * rnd());
    pts.push([at[0] + k * r * Math.cos(t), at[1] + k * z, at[2] + k * r * Math.sin(t)]);
  }
  const mid = pts.reduce((s, p) => add(s, p, 0.25), [0, 0, 0]), planes = [];
  for (let i = 0; i < 4; i++) {
    const [a, b, c] = pts.filter((_, j) => j !== i);
    let n = unit(cross(add(b, a, -1), add(c, a, -1)));
    if (dot(n, add(mid, a, -1)) > 0) n = n.map((x) => -x);
    planes.push([n[0], n[1], n[2], dot(n, a)]);
  }
  // A flat tetrahedron is no wedge: a box round it keeps it bounded whatever its corners.
  for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) planes.push([...d, dot(d, at) + size * 1.2]);
  return { planes, corners: [add(at, [size * 1.2, size * 1.2, size * 1.2]), add(at, [-size * 1.2, -size * 1.2, -size * 1.2])] };
}
