// Convex solids as the intersection of half spaces, and their faces cut into rows and filled with triangles.
//
//   plane(normal, point)                 the plane through point, with an outward normal (not yet of length 1)
//   polytope(planes, name)               { name, polys: [{ n, tag, verts }] }: each face that is left, its corners in
//                                        order round its outward normal. A plane is { n, d, tag }: inside is n·p <= d
//   fill(solids, { rows, flatRows, spacing(p, n, tag), skip(tag), kind(name, tag) })
//                                        one mesh of every face: a sloping or upright face is cut by the upright
//                                        heights in rows, a level one by the places across in flatRows, and each row is
//                                        filled with points spacing() apart. Flat normals, faces outward.
//   mend(mesh)                           the same mesh with no crack: each polygon is filled alone, so where one's
//                                        vertex lies on the edge of a triangle of the next, that triangle is split
//                                        there, at a vertex of its own with its own normal
const EPS = 1e-7;

export function plane(n, p) {
  const l = Math.hypot(...n), u = n.map((v) => v / l);
  return { n: u, d: u[0] * p[0] + u[1] * p[1] + u[2] * p[2] };
}

function solve(a, b, c) {
  const [a1, a2, a3] = a.n, [b1, b2, b3] = b.n, [c1, c2, c3] = c.n;
  const det = a1 * (b2 * c3 - b3 * c2) - a2 * (b1 * c3 - b3 * c1) + a3 * (b1 * c2 - b2 * c1);
  if (Math.abs(det) < 1e-9) return null;
  const x = (a.d * (b2 * c3 - b3 * c2) - a2 * (b.d * c3 - b3 * c.d) + a3 * (b.d * c2 - b2 * c.d)) / det;
  const y = (a1 * (b.d * c3 - b3 * c.d) - a.d * (b1 * c3 - b3 * c1) + a3 * (b1 * c.d - b.d * c1)) / det;
  const z = (a1 * (b2 * c.d - b.d * c2) - a2 * (b1 * c.d - b.d * c1) + a.d * (b1 * c2 - b2 * c1)) / det;
  return [x, y, z];
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a) => { const l = Math.hypot(...a); return l > 0 ? a.map((v) => v / l) : a; };

export function polytope(planes, name) {
  const ps = planes.map((p) => ({ ...p, n: norm(p.n) }));
  const verts = [];
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) for (let k = j + 1; k < ps.length; k++) {
    const v = solve(ps[i], ps[j], ps[k]);
    if (!v || ps.some((p) => dot(p.n, v) > p.d + 1e-6)) continue;
    if (!verts.some((w) => Math.hypot(w[0] - v[0], w[1] - v[1], w[2] - v[2]) < 1e-6)) verts.push(v);
  }
  const polys = [];
  for (const p of ps) {
    const on = verts.filter((v) => Math.abs(dot(p.n, v) - p.d) < 1e-5);
    if (on.length < 3) continue;
    const mid = on.reduce((s, v) => [s[0] + v[0] / on.length, s[1] + v[1] / on.length, s[2] + v[2] / on.length], [0, 0, 0]);
    const e1 = norm(sub(on[0], mid)), e2 = cross(p.n, e1);
    on.sort((a, b) => Math.atan2(dot(sub(a, mid), e2), dot(sub(a, mid), e1)) - Math.atan2(dot(sub(b, mid), e2), dot(sub(b, mid), e1)));
    const area = on.reduce((s, v, i) => { const w = on[(i + 1) % on.length]; return s + dot(cross(sub(v, mid), sub(w, mid)), p.n); }, 0);
    if (area > 1e-6) polys.push({ n: p.n, tag: p.tag, verts: on });
  }
  return { name, polys };
}

// The segment where a convex polygon crosses the level axis = r, as its two ends along `across`.
function section(verts, axis, r, across) {
  const pts = [];
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i], b = verts[(i + 1) % verts.length], da = a[axis] - r, db = b[axis] - r;
    if (Math.abs(da) < EPS) pts.push(a);
    if ((da < -EPS && db > EPS) || (da > EPS && db < -EPS)) { const t = da / (da - db); pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
  }
  if (!pts.length) return null;
  let lo = pts[0], hi = pts[0];
  for (const p of pts) { if (dot(p, across) < dot(lo, across)) lo = p; if (dot(p, across) > dot(hi, across)) hi = p; }
  const out = [lo.slice(), hi.slice()];
  out[0][axis] = out[1][axis] = r;
  return out;
}

export function fill(solids, { rows, flatRows, spacing, skip = () => false, kind = () => 0 }) {
  const P = [], N = [], K = [], I = [];
  for (const solid of solids) for (const poly of solid.polys) {
    if (skip(poly.tag)) continue;
    const level = Math.abs(poly.n[1]) > 0.95, axis = level ? 0 : 1;
    const across = level ? [0, 0, 1] : norm(cross(poly.n, [0, 1, 0]));
    const vals = poly.verts.map((v) => v[axis]), lo = Math.min(...vals), hi = Math.max(...vals);
    const cut = [...new Set([...(level ? flatRows : rows).filter((r) => r > lo + 1e-4 && r < hi - 1e-4), ...vals].map((r) => Math.round(r * 1e6) / 1e6))].sort((a, b) => a - b);
    let prev = null;
    for (const r of cut) {
      const seg = section(poly.verts, axis, r, across);
      if (!seg) continue;
      const [a, b] = seg, len = Math.hypot(...sub(b, a));
      // Walk from a to b a step at a time, then stretch the steps to end on b.
      const ts = [0];
      if (len > 1e-6) {
        let t = 0;
        while (t < len) { const p = [0, 1, 2].map((i) => a[i] + ((b[i] - a[i]) * t) / len); t += Math.max(0.25, spacing(p, poly.n, poly.tag)); ts.push(t); }
        const last = ts[ts.length - 1];
        for (let i = 1; i < ts.length; i++) ts[i] /= last;
        if (ts.length > 2 && ts[ts.length - 2] > 1 - 0.35 / ts.length) ts.splice(ts.length - 2, 1);
      }
      const row = ts.map((t) => {
        const id = P.length / 3;
        const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        P.push(...p);
        N.push(...poly.n);
        K.push(kind(solid.name, poly.tag));
        return { id, t };
      });
      if (prev) zip(prev, row, poly.n);
      prev = row;
    }
  }
  function zip(A, B, n) {
    let i = 0, j = 0;
    const tri = (a, b, c) => {
      const pa = [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]], pb = [P[b * 3], P[b * 3 + 1], P[b * 3 + 2]], pc = [P[c * 3], P[c * 3 + 1], P[c * 3 + 2]];
      const g = cross(sub(pb, pa), sub(pc, pa));
      if (Math.hypot(...g) < 1e-9) return;
      if (dot(g, n) >= 0) I.push(a, b, c); else I.push(a, c, b);
    };
    while (i < A.length - 1 || j < B.length - 1) {
      const nextA = i < A.length - 1 ? A[i + 1].t : Infinity, nextB = j < B.length - 1 ? B[j + 1].t : Infinity;
      if (nextA <= nextB) { tri(A[i].id, A[i + 1].id, B[j].id); i++; } else { tri(A[i].id, B[j + 1].id, B[j].id); j++; }
    }
  }
  return { positions: Float32Array.from(P), normals: Float32Array.from(N), kind: Float32Array.from(K), indices: Uint32Array.from(I) };
}

export function mend({ positions: P0, normals: N0, kind: K0, indices }) {
  const P = Array.from(P0), N = Array.from(N0), K = Array.from(K0), C = 2;
  const grid = new Map(), key = (x, y, z) => `${Math.floor(x / C)},${Math.floor(y / C)},${Math.floor(z / C)}`;
  for (let i = 0; i < P0.length / 3; i++) {
    const k = key(P0[i * 3], P0[i * 3 + 1], P0[i * 3 + 2]);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  }
  const at = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
  // A vertex that lies inside the segment a b, away from its ends, as how far along it is.
  function inside(a, b) {
    const A = at(a), B = at(b), d = sub(B, A), L2 = dot(d, d);
    if (L2 < 1e-10) return null;
    let best = null;
    const lo = A.map((v, i) => Math.floor(Math.min(v, B[i]) / C)), hi = A.map((v, i) => Math.floor(Math.max(v, B[i]) / C));
    for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
      for (const v of grid.get(`${x},${y},${z}`) ?? []) {
        const V = [P0[v * 3], P0[v * 3 + 1], P0[v * 3 + 2]], t = dot(sub(V, A), d) / L2;
        if (t < 1e-5 || t > 1 - 1e-5) continue;
        const q = [A[0] + d[0] * t - V[0], A[1] + d[1] * t - V[1], A[2] + d[2] * t - V[2]];
        if (dot(q, q) > 1e-10 || dot(d, d) * Math.min(t, 1 - t) ** 2 < 1e-10) continue;
        if (!best || t < best.t) best = { t, v };
      }
    }
    return best;
  }
  const I = [], todo = [];
  for (let i = 0; i < indices.length; i += 3) todo.push([indices[i], indices[i + 1], indices[i + 2]]);
  while (todo.length) {
    const tri = todo.pop();
    let split = false;
    for (let e = 0; e < 3 && !split; e++) {
      const a = tri[e], b = tri[(e + 1) % 3], c = tri[(e + 2) % 3], hit = inside(a, b);
      if (!hit) continue;
      const id = P.length / 3, t = hit.t;
      P.push(P0[hit.v * 3], P0[hit.v * 3 + 1], P0[hit.v * 3 + 2]);
      N.push(...norm([0, 1, 2].map((k) => N[a * 3 + k] * (1 - t) + N[b * 3 + k] * t)));
      K.push(K[a]);
      todo.push([a, id, c], [id, b, c]);
      split = true;
    }
    if (!split) I.push(...tri);
  }
  return { positions: Float32Array.from(P), normals: Float32Array.from(N), kind: Float32Array.from(K), indices: Uint32Array.from(I) };
}
