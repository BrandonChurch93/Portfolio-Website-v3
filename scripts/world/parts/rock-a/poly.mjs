// Sculptor A's tools: convex solids as the meeting of their planes, made from outlines traced on picture 9, and
// the grid of buckets the field looks them up in. Everything here is decided once, the same on every run.
import { L } from '../../lib/plan.mjs';

export const D = Math.PI / 180;
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// Turns v about the axis k (a unit vector) by a radians.
export function turn(v, k, a) {
  const c = Math.cos(a), s = Math.sin(a), kv = cross(k, v), d = dot(k, v);
  return [v[0] * c + kv[0] * s + k[0] * d * (1 - c), v[1] * c + kv[1] * s + k[1] * d * (1 - c), v[2] * c + kv[2] * s + k[2] * d * (1 - c)];
}

// Toward the visitor, along the line of sight at the middle of the picture.
const far = L.fromPicture(L.PICTURE.mid, 400, -400), near = L.fromPicture(L.PICTURE.mid, 400, 400);
export const VIEW = unit(sub(near, far));

// The point of a plane seen at a place in the picture.
export function onPlane(px, py, n, d) {
  const a = L.fromPicture(px, py, 0), b = L.fromPicture(px, py, 100), r = sub(b, a), k = dot(n, r);
  const t = Math.abs(k) < 1e-6 ? 0 : (d - dot(n, a)) / k;
  return add(a, mul(r, t));
}

// A face's normal from how far it is turned to the visitor's right (yaw) and up (pitch), in degrees.
export const facing = (yaw, pitch) => [Math.sin(yaw * D) * Math.cos(pitch * D), Math.sin(pitch * D), Math.cos(yaw * D) * Math.cos(pitch * D)];

// A convex solid: planes as [nx, ny, nz, d], inside where every n.p - d is under 0.
export function plane(n, p) { const u = unit(n); return [u[0], u[1], u[2], dot(u, p)]; }

// The corners of a convex solid, for its box: every three planes that meet inside the rest.
export function corners(planes) {
  const out = [];
  for (let i = 0; i < planes.length; i++) for (let j = i + 1; j < planes.length; j++) for (let k = j + 1; k < planes.length; k++) {
    const a = planes[i], b = planes[j], c = planes[k], bc = cross(b, c), det = dot(a, bc);
    if (Math.abs(det) < 1e-9) continue;
    const ca = cross(c, a), ab = cross(a, b);
    const p = mul(add(add(mul(bc, a[3]), mul(ca, b[3])), mul(ab, c[3])), 1 / det);
    if (planes.every((q) => q[0] * p[0] + q[1] * p[1] + q[2] * p[2] - q[3] < 1e-6)) out.push(p);
  }
  return out;
}
export function box(points, pad = 0) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of points) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k] - pad); hi[k] = Math.max(hi[k], p[k] + pad); }
  return [lo, hi];
}

// The convex hull of points in the picture, counterclockwise as the picture is drawn (y down).
export function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), turnOf = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && turnOf(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (hi.length >= 2 && turnOf(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

// A small convex chip about a point: so many planes in random directions, each about r from it.
export function chip(at, r, rnd, n = 6, squash = null) {
  const planes = [];
  for (let i = 0; i < n; i++) {
    const u = 2 * rnd() - 1, a = 2 * Math.PI * (i + rnd() * 0.7) / n, s = Math.sqrt(1 - u * u);
    let dir = [s * Math.cos(a), u * 0.8, s * Math.sin(a)];
    if (squash) dir = add(dir, mul(squash, 1.4 * dot(dir, squash)));
    dir = unit(dir);
    planes.push(plane(dir, add(at, mul(dir, r * (0.55 + 0.5 * rnd())))));
  }
  // Two more, to close it whatever the draw.
  for (const s of [1, -1]) { const dir = unit([rnd() - 0.5, s, rnd() - 0.5]); planes.push(plane(dir, add(at, mul(dir, r * (0.6 + 0.5 * rnd()))))); }
  return planes;
}

export const value = (planes, x, y, z) => {
  let m = -Infinity;
  for (const q of planes) { const v = q[0] * x + q[1] * y + q[2] * z - q[3]; if (v > m) m = v; }
  return m;
};

// A grid of buckets over a box: each holds the things whose box comes within pad of it, and how far the nearest
// thing it does not hold is, which is what the field may say there at most.
export class Buckets {
  constructor(lo, hi, size, pad) {
    this.lo = lo; this.size = size; this.pad = pad;
    this.n = [0, 1, 2].map((k) => Math.max(1, Math.ceil((hi[k] - lo[k]) / size)));
    this.lists = new Array(this.n[0] * this.n[1] * this.n[2]);
    this.far = new Float32Array(this.lists.length).fill(1e9);
  }
  fill(things) {
    const { lo, size, pad, n } = this;
    const at = (k, v) => Math.min(n[k] - 1, Math.max(0, Math.floor((v - lo[k]) / size)));
    for (let t = 0; t < things.length; t++) {
      const [a, b] = things[t].box;
      for (let i = at(0, a[0] - pad); i <= at(0, b[0] + pad); i++) for (let j = at(1, a[1] - pad); j <= at(1, b[1] + pad); j++) for (let k = at(2, a[2] - pad); k <= at(2, b[2] + pad); k++) {
        const c = i + n[0] * (j + n[1] * k);
        (this.lists[c] ??= []).push(t);
      }
    }
    // How far each bucket is from the nearest thing it does not hold.
    for (let i = 0; i < n[0]; i++) for (let j = 0; j < n[1]; j++) for (let k = 0; k < n[2]; k++) {
      const c = i + n[0] * (j + n[1] * k), held = new Set(this.lists[c] ?? []);
      const b0 = [lo[0] + i * size, lo[1] + j * size, lo[2] + k * size];
      let f = 1e9;
      for (let t = 0; t < things.length; t++) {
        if (held.has(t)) continue;
        const [a, b] = things[t].box;
        let d2 = 0;
        for (let q = 0; q < 3; q++) { const g = Math.max(a[q] - (b0[q] + size), b0[q] - b[q], 0); d2 += g * g; }
        if (d2 < f * f) f = Math.sqrt(d2);
      }
      this.far[c] = Math.max(pad, f);
    }
    this.lists = this.lists.map((l) => (l ? Int32Array.from(l) : null));
  }
  cell(x, y, z) {
    const { lo, size, n } = this;
    const i = Math.floor((x - lo[0]) / size), j = Math.floor((y - lo[1]) / size), k = Math.floor((z - lo[2]) / size);
    if (i < 0 || j < 0 || k < 0 || i >= n[0] || j >= n[1] || k >= n[2]) return -1;
    return i + n[0] * (j + n[1] * k);
  }
}
