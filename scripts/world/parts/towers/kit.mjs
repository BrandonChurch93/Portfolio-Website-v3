// What every tower design is built with: layers of flat faced geometry, one for each of the towers' materials,
// in the tower's own frame (x across its width, z toward its front, y up from its foot). A layer keeps, for each
// vertex, its place, its normal, and the numbers its material reads (attr), worked out from the place, the normal
// and a tag that the face carries. Faces are subdivided finely enough that the baked light varies across them.
//
//   const k = new Kit({ stone: { width: 3, attr }, bay: { width: 4, attr }, gold: { width: 0 } })
//   k.patch('stone', a, b, c, d, { want: [0, 0, 1], edge: 2, tag })
//   k.prism('gold', chamfered(30, 28, 1), 126, 137, { top: true })
//   k.reeds('gold', face, from, to, y0, y1, count, depth)
//   k.wall('stone', face, s0, s1, t0, t1, openings)
import * as THREE from 'three';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a) || 1; return mul(a, 1 / l); };
const lerp = (a, b, t) => add(a, mul(sub(b, a), t));
export const V = { sub, add, mul, dot, cross, unit, lerp };

// A face of a building: a point on it, the direction across it (left to right as seen from outside), and the
// direction out of it. Up is always y.
export function face(o, across, out) { return { o, T: unit(across), N: unit(out) }; }
// A place on a face: so far across, so far up from its point, and so far behind it.
export const on = (f, s, t, back = 0) => [f.o[0] + f.T[0] * s - f.N[0] * back, f.o[1] + t, f.o[2] + f.T[2] * s - f.N[2] * back];

// A plan with its corners cut at 45 degrees, in the order a prism wants it.
export function chamfered(w, d, c) {
  const x = w / 2, z = d / 2;
  return [[-x + c, z], [x - c, z], [x, z - c], [x, -z + c], [x - c, -z], [-x + c, -z], [-x, -z + c], [-x, z - c]];
}

export class Kit {
  constructor(layers) {
    this.layers = {};
    for (const [name, o] of Object.entries(layers)) this.layers[name] = { name, width: o.width, attr: o.attr ?? (() => []), p: [], n: [], a: [], i: [] };
  }
  vertex(L, p, n, tag) {
    L.p.push(p[0], p[1], p[2]);
    L.n.push(n[0], n[1], n[2]);
    const a = L.attr(p, n, tag);
    for (let k = 0; k < L.width; k++) L.a.push(a[k] ?? 0);
    return L.p.length / 3 - 1;
  }
  // A four sided face, a to b along its bottom, d to c along its top, subdivided so that no edge is longer than
  // `edge`. Its normal is flat, or worked out at each point by `normal(u, v)`. It is wound to face `want`.
  patch(layer, a, b, c, d, o = {}) {
    const L = this.layers[layer], edge = o.edge ?? 1e9;
    const nu = o.nu ?? Math.max(1, Math.ceil(Math.max(Math.hypot(...sub(b, a)), Math.hypot(...sub(c, d))) / edge - 1e-6));
    const nv = o.nv ?? Math.max(1, Math.ceil(Math.max(Math.hypot(...sub(d, a)), Math.hypot(...sub(c, b))) / edge - 1e-6));
    let n = unit(cross(sub(b, a), sub(d, a)));
    if (!(Math.hypot(...cross(sub(b, a), sub(d, a))) > 1e-9)) n = unit(cross(sub(c, b), sub(c, d)));
    if (!(Math.hypot(...n) > 0.5)) n = unit(o.want ?? [0, 1, 0]);
    const flip = o.want ? dot(n, o.want) < 0 : false;
    if (flip) n = mul(n, -1);
    const base = L.p.length / 3;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv, p = lerp(lerp(a, b, u), lerp(d, c, u), v);
      this.vertex(L, p, o.normal ? o.normal(u, v) : n, o.tag);
    }
    const at = (i, j) => base + j * (nu + 1) + i;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const p00 = at(i, j), p10 = at(i + 1, j), p11 = at(i + 1, j + 1), p01 = at(i, j + 1);
      if (flip) L.i.push(p00, p11, p10, p00, p01, p11);
      else L.i.push(p00, p10, p11, p00, p11, p01);
    }
  }
  // A flat face of any outline, at height y, facing up or down.
  cap(layer, poly, y, up, tag) {
    const L = this.layers[layer], base = L.p.length / 3, n = [0, up ? 1 : -1, 0];
    for (const [x, z] of poly) this.vertex(L, [x, y, z], n, tag);
    const tris = THREE.ShapeUtils.triangulateShape(poly.map(([x, z]) => new THREE.Vector2(x, z)), []);
    for (const [a, b, c] of tris) {
      const [ax, az] = poly[a], [bx, bz] = poly[b], [cx, cz] = poly[c];
      const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
      if ((ny > 0) === up) L.i.push(base + a, base + b, base + c);
      else L.i.push(base + a, base + c, base + b);
    }
  }
  // An upright solid of a plan between two heights. The top may be the plan made smaller (shrink, toward its
  // middle), for a point. skip(a, b) leaves out a side that is hidden inside something else.
  prism(layer, poly, y0, y1, o = {}) {
    const area = poly.reduce((s, [x, z], i) => { const [x2, z2] = poly[(i + 1) % poly.length]; return s + x * z2 - x2 * z; }, 0);
    const pl = area > 0 ? [...poly].reverse() : poly, [kx, kz] = Array.isArray(o.shrink) ? o.shrink : [o.shrink ?? 1, o.shrink ?? 1], shrink = Math.min(kx, kz);
    const mx = pl.reduce((s, p) => s + p[0], 0) / pl.length, mz = pl.reduce((s, p) => s + p[1], 0) / pl.length;
    const top = pl.map(([x, z]) => [mx + (x - mx) * kx, mz + (z - mz) * kz]);
    for (let i = 0; i < pl.length; i++) {
      const j = (i + 1) % pl.length, [ax, az] = pl[i], [bx, bz] = pl[j];
      if (o.skip?.(pl[i], pl[j])) continue;
      const want = [-(bz - az), 0, bx - ax];
      this.patch(layer, [ax, y0, az], [bx, y0, bz], [top[j][0], y1, top[j][1]], [top[i][0], y1, top[i][1]], { edge: o.edge, nv: o.nv, want, tag: o.tagOf ? o.tagOf(pl[i], pl[j]) : o.tag });
    }
    if (o.top && shrink > 0.001) this.cap(layer, top, y1, true, o.tag);
    if (o.bottom) this.cap(layer, pl, y0, false, o.tag);
  }
  box(layer, x0, x1, y0, y1, z0, z1, o = {}) {
    this.prism(layer, [[x0, z1], [x1, z1], [x1, z0], [x0, z0]], y0, y1, o);
  }
  // Flutes standing out of a face, side by side from `from` to `to` across it, between two heights. Each is a
  // ridge of two flat flanks `depth` high (o.round makes it half an ellipse instead), with a crease between one
  // and the next: the fluting of the gold, whose flanks catch the light one way and the other. On a face that
  // leans back, o.back is how far back it is at the top and o.narrow how much narrower about o.mid.
  reeds(layer, f, from, to, y0, y1, count, depth, o = {}) {
    const w = (to - from) / count, a = w / 2, back = o.back ?? 0, narrow = o.narrow ?? 1, mid = o.mid ?? (from + to) / 2;
    const profile = o.round
      ? Array.from({ length: (o.segs ?? 5) + 1 }, (_, k) => { const fi = Math.PI * (1 - k / (o.segs ?? 5)); return [a * (1 + Math.cos(fi)), depth * Math.sin(fi), unit(add(mul(f.T, Math.cos(fi) / a), mul(f.N, Math.sin(fi) / depth)))]; })
      : [[0, 0], [a, depth], [w, 0]];
    for (let r = 0; r < count; r++) {
      const left = from + r * w;
      const p = (q, y) => { const k = (y - y0) / (y1 - y0), sc = 1 + (narrow - 1) * k; return add(on(f, mid + (left + q[0] - mid) * sc, y - f.o[1], back * k), mul(f.N, q[1] * sc)); };
      for (let k = 0; k + 1 < profile.length; k++) {
        const q0 = profile[k], q1 = profile[k + 1];
        const smooth = q0[2] && q1[2] ? { normal: (u) => unit(lerp(q0[2], q1[2], u)) } : {};
        this.patch(layer, p(q0, y0), p(q1, y0), p(q1, y1), p(q0, y1), { nu: 1, edge: o.edge, want: f.N, tag: o.tag, ...smooth });
      }
    }
  }
  // A face of wall from s0 to s1 across and t0 to t1 up, with openings let into it. Each opening is a rectangle
  // { s0, s1, t0, t1 } with steps, each { inset, depth }: its reveal steps in by inset and goes back by depth, the
  // last step's back is handed to back(face, s0, s1, t0, t1, depth) to fill (a door, glass).
  wall(layer, f, s0, s1, t0, t1, openings, o = {}) {
    const ss = [...new Set([s0, s1, ...openings.flatMap((h) => [h.s0, h.s1])])].sort((a, b) => a - b);
    const ts = [...new Set([t0, t1, ...openings.flatMap((h) => [h.t0, h.t1])])].sort((a, b) => a - b);
    const inside = (s, t) => openings.some((h) => s > h.s0 && s < h.s1 && t > h.t0 && t < h.t1);
    for (let i = 0; i + 1 < ss.length; i++) for (let j = 0; j + 1 < ts.length; j++) {
      const a = ss[i], b = ss[i + 1], c = ts[j], d = ts[j + 1];
      if (b - a < 1e-6 || d - c < 1e-6 || inside((a + b) / 2, (c + d) / 2)) continue;
      this.patch(layer, on(f, a, c), on(f, b, c), on(f, b, d), on(f, a, d), { edge: o.edge, want: f.N, tag: o.tag });
    }
    for (const h of openings) {
      let r = { s0: h.s0, s1: h.s1, t0: h.t0, t1: h.t1 }, back = 0;
      h.steps.forEach((st, k) => {
        if (k > 0) {
          const n = { s0: r.s0 + st.inset, s1: r.s1 - st.inset, t0: r.t0 + (h.floor ? 0 : st.inset), t1: r.t1 - st.inset };
          this.ring(layer, f, r, n, back, o);
          r = n;
        }
        const deep = back + st.depth;
        const P = (s, t, b) => on(f, s, t, b);
        const e = o.edge;
        this.patch(layer, P(r.s0, r.t0, back), P(r.s0, r.t0, deep), P(r.s0, r.t1, deep), P(r.s0, r.t1, back), { edge: e, want: f.T, tag: o.tag });
        this.patch(layer, P(r.s1, r.t0, deep), P(r.s1, r.t0, back), P(r.s1, r.t1, back), P(r.s1, r.t1, deep), { edge: e, want: mul(f.T, -1), tag: o.tag });
        this.patch(layer, P(r.s0, r.t1, back), P(r.s0, r.t1, deep), P(r.s1, r.t1, deep), P(r.s1, r.t1, back), { edge: e, want: [0, -1, 0], tag: o.tag });
        this.patch(layer, P(r.s0, r.t0, deep), P(r.s0, r.t0, back), P(r.s1, r.t0, back), P(r.s1, r.t0, deep), { edge: e, want: [0, 1, 0], tag: o.tag });
        back = deep;
      });
      h.back?.(f, r.s0, r.s1, r.t0, r.t1, back);
    }
  }
  ring(layer, f, outer, inner, back, o) {
    const P = (s, t) => on(f, s, t, back), q = { edge: o.edge, want: f.N, tag: o.tag };
    if (inner.s0 > outer.s0) this.patch(layer, P(outer.s0, outer.t0), P(inner.s0, outer.t0), P(inner.s0, outer.t1), P(outer.s0, outer.t1), q);
    if (outer.s1 > inner.s1) this.patch(layer, P(inner.s1, outer.t0), P(outer.s1, outer.t0), P(outer.s1, outer.t1), P(inner.s1, outer.t1), q);
    if (outer.t1 > inner.t1) this.patch(layer, P(inner.s0, inner.t1), P(inner.s1, inner.t1), P(inner.s1, outer.t1), P(inner.s0, outer.t1), q);
    if (inner.t0 > outer.t0) this.patch(layer, P(inner.s0, outer.t0), P(inner.s1, outer.t0), P(inner.s1, inner.t0), P(inner.s0, inner.t0), q);
  }
  // Each layer as a mesh, moved by a matrix (sixteen numbers, column major) into the world.
  meshes(matrix) {
    const m = new THREE.Matrix4().fromArray(matrix), nm = new THREE.Matrix3().getNormalMatrix(m), v = new THREE.Vector3();
    const out = {};
    for (const L of Object.values(this.layers)) {
      const n = L.p.length / 3, positions = new Float32Array(n * 3), normals = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        v.fromArray(L.p, i * 3).applyMatrix4(m).toArray(positions, i * 3);
        v.fromArray(L.n, i * 3).applyMatrix3(nm).normalize().toArray(normals, i * 3);
      }
      out[L.name] = { positions, normals, indices: new Uint32Array(L.i), attr: new Float32Array(L.a), width: L.width, local: new Float32Array(L.p), localNormals: new Float32Array(L.n) };
    }
    return out;
  }
}
