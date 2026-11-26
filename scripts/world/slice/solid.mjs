// Solid blocks with flat faces and hard edges, for the slice's rock: each is the inside of a set of planes, kept as
// its faces, so a block can be cut, split and chipped by more planes and stays exact. Nothing here is a grid: an edge
// is as sharp as the two faces that meet at it.
//
//   box(lo, hi)                    a block, from its two corners
//   clip(s, n, d, tag)             what of s is on the near side of a plane (n · p <= d), or null. tag marks the new face
//   split(s, n, d, tag)            [what is on the near side, what is on the far side], either may be null
//   bounds(s), middle(s), size(s)  its box, the mean of its corners, the length of its box's diagonal
//   soup(list)                     every block's faces as triangles, for the ray caster: positions, indices, and for
//                                  each triangle the number of its block (of) and its face's tag
//
// A block is { faces: [{ pts: [[x, y, z], ...], tag }], ...whatever its maker keeps with it }. A face's points go
// round it counter clockwise seen from outside.
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const mad = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// Two directions square to a normal, so that (e1, e2, n) is right handed.
export function frame(n) {
  let e1 = cross([0, 1, 0], n);
  e1 = len(e1) < 0.2 ? norm(cross(n, [0, 0, 1])) : norm(e1);
  return [e1, cross(n, e1)];
}
// A plane as [n, d] from a direction and a point on it.
export const plane = (n, at) => { const u = norm(n); return [u, dot(u, at)]; };

const EPS = 1e-6;

export function box(lo, hi) {
  const [a, b, c] = lo, [d, e, f] = hi;
  const P = [[a, b, c], [d, b, c], [d, e, c], [a, e, c], [a, b, f], [d, b, f], [d, e, f], [a, e, f]];
  const F = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [0, 4, 7, 3], [1, 2, 6, 5]];
  return { faces: F.map((q) => ({ pts: q.map((i) => P[i]), tag: 0 })) };
}

export function normal(pts) {
  let x = 0, y = 0, z = 0;
  for (let i = 0, m = pts.length; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % m];
    x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return norm([x, y, z]);
}
export function area(pts) {
  let x = 0, y = 0, z = 0;
  for (let i = 0, m = pts.length; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % m];
    x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return Math.hypot(x, y, z) / 2;
}

const same = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 1e-5;
function tidy(pts) {
  const out = [];
  for (const p of pts) if (!out.length || !same(out[out.length - 1], p)) out.push(p);
  while (out.length > 1 && same(out[0], out[out.length - 1])) out.pop();
  return out;
}

export function clip(s, n, d, tag = 0) {
  if (!s) return null;
  const faces = [], cap = [];
  let cut = false, kept = false;
  for (const f of s.faces) {
    const pts = f.pts, m = pts.length, dist = new Array(m);
    for (let i = 0; i < m; i++) { dist[i] = dot(pts[i], n) - d; if (dist[i] > EPS) cut = true; else if (dist[i] < -EPS) kept = true; }
    const out = [];
    for (let i = 0; i < m; i++) {
      const a = pts[i], b = pts[(i + 1) % m], da = dist[i], db = dist[(i + 1) % m];
      if (da <= EPS) { out.push(a); if (da >= -EPS) cap.push(a); }
      if ((da < -EPS && db > EPS) || (da > EPS && db < -EPS)) {
        const t = da / (da - db), p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        out.push(p); cap.push(p);
      }
    }
    const t = tidy(out);
    if (t.length >= 3 && area(t) > 1e-9) faces.push({ ...f, pts: t });
  }
  if (!cut) return s;
  if (!kept || faces.length < 3) return null;
  // The new face: the points on the plane, in order round their middle, counter clockwise seen from the far side.
  const pts = [];
  for (const p of cap) if (!pts.some((q) => same(p, q))) pts.push(p);
  if (pts.length >= 3) {
    const c = [0, 0, 0];
    for (const p of pts) { c[0] += p[0] / pts.length; c[1] += p[1] / pts.length; c[2] += p[2] / pts.length; }
    const [e1, e2] = frame(n);
    const at = pts.map((p) => { const q = sub(p, c); return [Math.atan2(dot(q, e2), dot(q, e1)), p]; }).sort((a, b) => a[0] - b[0]).map((q) => q[1]);
    if (area(at) > 1e-9) faces.push({ pts: at, tag });
  }
  return { ...s, faces };
}

export function split(s, n, d, tag = 0) {
  return [clip(s, n, d, tag), clip(s, [-n[0], -n[1], -n[2]], -d, tag)];
}

export function bounds(s) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const f of s.faces) for (const p of f.pts) for (let k = 0; k < 3; k++) { if (p[k] < lo[k]) lo[k] = p[k]; if (p[k] > hi[k]) hi[k] = p[k]; }
  return [lo, hi];
}
export function middle(s) {
  const c = [0, 0, 0];
  let n = 0;
  for (const f of s.faces) for (const p of f.pts) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; n++; }
  return [c[0] / n, c[1] / n, c[2] / n];
}
export function size(s) { const [lo, hi] = bounds(s); return len(sub(hi, lo)); }
// How far a block reaches along a direction: [least, most].
export function reach(s, n) {
  let lo = Infinity, hi = -Infinity;
  for (const f of s.faces) for (const p of f.pts) { const v = dot(p, n); if (v < lo) lo = v; if (v > hi) hi = v; }
  return [lo, hi];
}
export function volume(s) {
  const c = middle(s);
  let v = 0;
  for (const f of s.faces) for (let i = 1; i + 1 < f.pts.length; i++) v += dot(sub(f.pts[0], c), cross(sub(f.pts[i], c), sub(f.pts[i + 1], c))) / 6;
  return Math.abs(v);
}

// The convex outline of points on a plane ([u, v] each), counter clockwise.
export function hull(points) {
  const p = points.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && turn(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.reverse()) { while (upper.length >= 2 && turn(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  lower.pop(); upper.pop();
  return [...lower, ...upper];
}

export function soup(list) {
  let t = 0;
  for (const s of list) for (const f of s.faces) t += f.pts.length - 2;
  const positions = new Float32Array(t * 9), indices = new Uint32Array(t * 3), of = new Uint32Array(t), tag = new Uint8Array(t);
  let k = 0;
  list.forEach((s, id) => {
    for (const f of s.faces) for (let i = 1; i + 1 < f.pts.length; i++) {
      const q = [f.pts[0], f.pts[i], f.pts[i + 1]];
      for (let j = 0; j < 3; j++) { positions[k * 9 + j * 3] = q[j][0]; positions[k * 9 + j * 3 + 1] = q[j][1]; positions[k * 9 + j * 3 + 2] = q[j][2]; indices[k * 3 + j] = k * 3 + j; }
      of[k] = id; tag[k] = f.tag ?? 0;
      k++;
    }
  });
  return { positions, indices, of, tag, triangles: t };
}
