// A small piece of what broke away, made exactly: a block of the planet's stone cut by planes, never a field turned
// into a mesh and reduced. Every face is a flat break and every edge a sharp one, so a piece this small stays a solid
// chipped block at three times and never crumples into a skin.
//
//   const m = block({ seed, size: [a, b, c], breaks, flakes, corners, steps })
//
// size is the half extents of the stone before it broke. breaks is how many large breaks cross it at uneven angles,
// flakes how many shallow scars run in from an edge along one face (a flake struck off it), corners how many corners
// are knocked off, and steps how many times one side of it drops along a riser (each a second solid that meets the
// first exactly on the riser's plane, so nothing passes through anything). Returns { positions, normals, indices,
// fresh, tone } with a normal for each face, and for each vertex whether its face is a fresh break (a flake's scar or
// a knocked off corner) and a tone of its face's own.
import { seeded } from '../../../../src/pieces/world/layout.ts';

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

// A convex solid as its faces, each a plane and a loop of points turning counterclockwise seen from outside.
function box([a, b, c]) {
  const P = (x, y, z) => [x * a, y * b, z * c];
  const f = (n, pts) => ({ n, pts, fresh: 0 });
  return [
    f([1, 0, 0], [P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), P(1, -1, 1)]),
    f([-1, 0, 0], [P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1)]),
    f([0, 1, 0], [P(-1, 1, -1), P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1)]),
    f([0, -1, 0], [P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1)]),
    f([0, 0, 1], [P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)]),
    f([0, 0, -1], [P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), P(1, -1, -1)]),
  ];
}
const points = (solid) => solid.flatMap((f) => f.pts);
const reach = (solid, n) => Math.max(...points(solid).map((p) => dot(p, n)));
const middle = (solid) => { const ps = points(solid), m = [0, 0, 0]; for (const p of ps) for (let k = 0; k < 3; k++) m[k] += p[k] / ps.length; return m; };

// The solid with everything over the plane n . x = h cut away, and the cut as a new face.
function clip(solid, n, h, fresh = 0) {
  const out = [], cut = [], E = 1e-9;
  for (const f of solid) {
    const kept = [];
    for (let i = 0; i < f.pts.length; i++) {
      const p = f.pts[i], q = f.pts[(i + 1) % f.pts.length], dp = dot(p, n) - h, dq = dot(q, n) - h;
      if (dp <= E) kept.push(p);
      if ((dp < -E && dq > E) || (dp > E && dq < -E)) {
        const t = dp / (dp - dq), x = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
        kept.push(x);
        cut.push(x);
      } else if (Math.abs(dp) <= E) cut.push(p);
    }
    if (kept.length >= 3) out.push({ ...f, pts: kept });
  }
  if (cut.length >= 3) {
    const m = cut.reduce((s, p) => [s[0] + p[0] / cut.length, s[1] + p[1] / cut.length, s[2] + p[2] / cut.length], [0, 0, 0]);
    const u = unit(Math.abs(n[0]) < 0.9 ? cross(n, [1, 0, 0]) : cross(n, [0, 1, 0])), v = cross(n, u);
    const ring = [];
    for (const p of cut.map((p) => ({ p, a: Math.atan2(dot(sub(p, m), v), dot(sub(p, m), u)) })).sort((x, y) => x.a - y.a)) {
      const last = ring[ring.length - 1];
      if (!last || Math.hypot(...sub(last, p.p)) > 1e-6) ring.push(p.p);
    }
    if (ring.length > 2 && Math.hypot(...sub(ring[0], ring[ring.length - 1])) < 1e-6) ring.pop();
    if (ring.length >= 3) out.push({ n, pts: ring, fresh });
  }
  return out;
}

export function block({ seed, size, breaks = 3, flakes = 3, corners = 3, steps = 0 }) {
  const r = seeded(seed), big = Math.max(...size);
  const jitter = (v, k) => unit([v[0] + k * (r() - 0.5), v[1] + k * (r() - 0.5), v[2] + k * (r() - 0.5)]);
  const between = (lo, hi) => lo + (hi - lo) * r();
  let solid = box(size);
  // The large breaks: each takes off a good share of what it crosses, at an angle of its own, so the outline is a
  // few long straight runs meeting at uneven angles and never a box's.
  for (let i = 0; i < breaks; i++) {
    const n = unit([r() * 2 - 1, (r() * 2 - 1) * 0.9, r() * 2 - 1]), most = reach(solid, n), least = -reach(solid, n.map((x) => -x));
    solid = clip(solid, n, least + (most - least) * between(0.68, 0.9));
  }
  // The flakes: a plane turned a little from a face toward one of its edges, taking off a long shallow scar that is
  // widest at the edge and runs out across the face.
  const flake = (s, k) => {
    const faces = s.filter((f) => !f.fresh), f = faces[Math.floor(r() * faces.length)] ?? s[0];
    const m = f.pts.reduce((a, p) => [a[0] + p[0] / f.pts.length, a[1] + p[1] / f.pts.length, a[2] + p[2] / f.pts.length], [0, 0, 0]);
    const e = f.pts[Math.floor(r() * f.pts.length)], out = unit(sub(e, m));
    const n = unit([f.n[0] + out[0] * Math.tan(k), f.n[1] + out[1] * Math.tan(k), f.n[2] + out[2] * Math.tan(k)]);
    return clip(s, n, reach(s, n) - big * between(0.07, 0.14), 1);
  };
  for (let i = 0; i < flakes; i++) solid = flake(solid, between(0.3, 0.6));
  // The corners knocked off: a small face across a corner, turned its own way.
  const knock = (s) => {
    const ps = points(s), m = middle(s), p = ps[Math.floor(r() * ps.length)], n = jitter(unit(sub(p, m)), 0.7);
    return clip(s, n, reach(s, n) - big * between(0.1, 0.2), 1);
  };
  for (let i = 0; i < corners; i++) solid = knock(solid);
  // The steps: the solid split on a plane across one of its broad faces, and the far side dropped below that face, so
  // the face steps down along a riser. Each side is whole and they meet exactly on the riser's plane.
  let parts = [solid];
  for (let i = 0; i < steps; i++) {
    const s = parts[0], faces = s.filter((f) => !f.fresh).map((f) => ({ f, area: area(f.pts) })).sort((x, y) => y.area - x.area);
    const f = faces[Math.floor(r() * Math.min(2, faces.length))].f, m = middle(s);
    const n2 = unit(cross(f.n, jitter([0, 1, 0], 2.4))), h2 = dot(m, n2) + big * 0.35 * (r() - 0.5);
    const near = clip(s, n2, h2), far = clip(s, n2.map((x) => -x), -h2);
    if (near.length < 4 || far.length < 4) continue;
    const dropped = clip(far, f.n, reach(far, f.n) - big * between(0.08, 0.16), 1);
    if (dropped.length < 4) continue;
    parts = [near, dropped, ...parts.slice(1)];
  }
  // Laid out as triangles, each face its own: a normal for each face, so every edge is sharp.
  const positions = [], normals = [], indices = [], fresh = [], tone = [];
  let v = 0;
  for (const s of parts) for (const f of s) {
    if (area(f.pts) < big * big * 1e-5) continue;
    const t = r();
    for (const p of f.pts) { positions.push(...p); normals.push(...f.n); fresh.push(f.fresh); tone.push(t); }
    for (let i = 1; i < f.pts.length - 1; i++) indices.push(v, v + i, v + i + 1);
    v += f.pts.length;
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices), fresh: new Float32Array(fresh), tone: new Float32Array(tone), parts: parts.length };
}

function area(pts) {
  let s = [0, 0, 0];
  for (let i = 1; i < pts.length - 1; i++) s = s.map((x, k) => x + cross(sub(pts[i], pts[0]), sub(pts[i + 1], pts[0]))[k] / 2);
  return Math.hypot(...s);
}
