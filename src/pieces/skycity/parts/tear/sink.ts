import * as THREE from 'three';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';

// Where the torn underside's triangles are gathered: one list for everything, each corner with its place, its normal
// and what it is (cell, read by the material: see KIND in ./material.ts).
export class Sink {
  private p: Float32Array;
  private n: Float32Array;
  private c: Float32Array;
  count = 0;
  constructor(max: number) {
    this.p = new Float32Array(max * 3);
    this.n = new Float32Array(max * 3);
    this.c = new Float32Array(max * 4);
  }
  private grow(add: number): void {
    if (this.count + add <= this.p.length / 3) return;
    const size = Math.max(this.count + add, Math.ceil((this.p.length / 3) * 1.5));
    const p = new Float32Array(size * 3), n = new Float32Array(size * 3), c = new Float32Array(size * 4);
    p.set(this.p); n.set(this.n); c.set(this.c);
    this.p = p; this.n = n; this.c = c;
  }
  // One triangle, its normal flat, or each corner's own normal if given.
  tri(a: ArrayLike<number>, b: ArrayLike<number>, d: ArrayLike<number>, cell: ArrayLike<number>, na?: ArrayLike<number>, nb?: ArrayLike<number>, nd?: ArrayLike<number>, cb?: ArrayLike<number>, cd?: ArrayLike<number>): void {
    this.grow(3);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const l = Math.hypot(fx, fy, fz);
    if (l < 1e-9) return;
    fx /= l; fy /= l; fz /= l;
    const pts = [a, b, d], ns = [na, nb, nd], cs = [cell, cb ?? cell, cd ?? cell];
    for (let k = 0; k < 3; k++) {
      const i = this.count + k, q = pts[k], nn = ns[k], cc = cs[k];
      this.p[i * 3] = q[0]; this.p[i * 3 + 1] = q[1]; this.p[i * 3 + 2] = q[2];
      if (nn) { this.n[i * 3] = nn[0]; this.n[i * 3 + 1] = nn[1]; this.n[i * 3 + 2] = nn[2]; }
      else { this.n[i * 3] = fx; this.n[i * 3 + 1] = fy; this.n[i * 3 + 2] = fz; }
      this.c[i * 4] = cc[0]; this.c[i * 4 + 1] = cc[1]; this.c[i * 4 + 2] = cc[2]; this.c[i * 4 + 3] = cc[3];
    }
    this.count += 3;
  }
  // A triangle turned so that it faces away from a point inside whatever it is part of.
  out(a: ArrayLike<number>, b: ArrayLike<number>, d: ArrayLike<number>, inside: ArrayLike<number>, cell: ArrayLike<number>): void {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const mx = (a[0] + b[0] + d[0]) / 3 - inside[0], my = (a[1] + b[1] + d[1]) / 3 - inside[1], mz = (a[2] + b[2] + d[2]) / 3 - inside[2];
    if (fx * mx + fy * my + fz * mz >= 0) this.tri(a, b, d, cell);
    else this.tri(a, d, b, cell);
  }
  get triangles(): number { return this.count / 3; }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p.slice(0, this.count * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.n.slice(0, this.count * 3), 3));
    g.setAttribute('cell', new THREE.BufferAttribute(this.c.slice(0, this.count * 4), 4));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export type V3 = [number, number, number];
export interface Frame { o: V3; x: V3; y: V3; z: V3 }

// A block of rock: a box with its edges and corners cut back, in a frame (its middle and three axes), this far to each
// side along each axis. taper narrows it toward -y, shear leans it along x as y runs. Its faces stay flat, so each
// catches the light as one plane and its cut edges as thin lines. cell is what it is; the cut edges and corners are
// marked in cell.z, so the material can wear them pale.
export function block(s: Sink, f: Frame, hx: number, hy: number, hz: number, cut: number, cell: ArrayLike<number>, taper = 0, shear = 0, worn = 1): void {
  const e = Math.min(cut, hx * 0.45, hy * 0.45, hz * 0.45);
  const h = [hx, hy, hz];
  const map = (lx: number, ly: number, lz: number, out: V3): V3 => {
    const k = 1 + taper * (ly / hy), sx = lx * k + shear * ly, sz = lz * (1 + 0.5 * taper * (ly / hy));
    for (let a = 0; a < 3; a++) out[a] = f.o[a] + f.x[a] * sx + f.y[a] * ly + f.z[a] * sz;
    return out;
  };
  // The point on face k (0 x, 1 y, 2 z) at the corner with these signs.
  const v = (k: number, sx: number, sy: number, sz: number): V3 => {
    const sg = [sx, sy, sz], l = [0, 0, 0];
    for (let a = 0; a < 3; a++) l[a] = sg[a] * (a === k ? h[a] : h[a] - e);
    return map(l[0], l[1], l[2], [0, 0, 0]);
  };
  const face = [cell[0], cell[1], 0, cell[3]], edge = [cell[0], cell[1], worn, cell[3]];
  const inside = f.o;
  for (let k = 0; k < 3; k++) for (const sk of [-1, 1]) {
    const a = (k + 1) % 3, b = (k + 2) % 3, c = (i: number, j: number) => { const sg = [0, 0, 0]; sg[k] = sk; sg[a] = i; sg[b] = j; return v(k, sg[0], sg[1], sg[2]); };
    const p00 = c(-1, -1), p10 = c(1, -1), p11 = c(1, 1), p01 = c(-1, 1);
    s.out(p00, p10, p11, inside, face);
    s.out(p00, p11, p01, inside, face);
  }
  for (let k = 0; k < 3; k++) {
    const l = (k + 1) % 3, m = (k + 2) % 3;
    for (const sk of [-1, 1]) for (const sl of [-1, 1]) {
      const at = (kk: number, sm: number) => { const sg = [0, 0, 0]; sg[k] = sk; sg[l] = sl; sg[m] = sm; return v(kk, sg[0], sg[1], sg[2]); };
      const a0 = at(k, -1), a1 = at(k, 1), b0 = at(l, -1), b1 = at(l, 1);
      s.out(a0, a1, b1, inside, edge);
      s.out(a0, b1, b0, inside, edge);
    }
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) s.out(v(0, sx, sy, sz), v(1, sx, sy, sz), v(2, sx, sy, sz), inside, edge);
}

// A frame turned by small angles about its own x, y and z, in radians.
export function turn(f: Frame, rx: number, ry: number, rz: number): Frame {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...f.x), new THREE.Vector3(...f.y), new THREE.Vector3(...f.z));
  const r = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz));
  m.multiply(r);
  const x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3();
  m.extractBasis(x, y, z);
  return { o: f.o, x: [x.x, x.y, x.z], y: [y.x, y.y, y.z], z: [z.x, z.y, z.z] };
}

// A broken chunk of rock in a frame: not a box but the hull of points jittered about one, so no two of its faces are
// the same size or at the same angle. Its outer face (+z) is broken into several facets, and its edges are chipped
// back in places. The facets that turn between its outer face and its sides are marked as worn (1 added to cell.z),
// so they catch a pale line of light as a cut edge does.
const hull = new ConvexHull();
const pool: THREE.Vector3[] = [];
export function chunk(s: Sink, f: Frame, hx: number, hy: number, hz: number, cell: ArrayLike<number>, r: () => number, taper = 0, shear = 0, rough = 1): void {
  let n = 0;
  const pt = (x: number, y: number, z: number) => { (pool[n] ??= new THREE.Vector3()).set(x, y, z); n++; };
  const j = (a: number) => 1 - (1 - a) * rough;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    pt(sx * hx * j(0.6 + 0.4 * r()), sy * hy * j(0.6 + 0.4 * r()), hz * j(0.55 + 0.45 * r()));
    pt(sx * hx * j(0.85 + 0.15 * r()), sy * hy * j(0.85 + 0.15 * r()), -hz);
  }
  // Facets across the outer face, and chips along its edges.
  // The larger the face, the more it is broken.
  const k = 3 + Math.floor(r() * 3) + Math.min(8, Math.floor((hx * hy) / 90));
  for (let i = 0; i < k; i++) pt((r() * 2 - 1) * hx * 0.8, (r() * 2 - 1) * hy * 0.8, hz * (0.9 + 0.22 * r() * rough));
  for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const t = (r() * 2 - 1) * 0.7;
    pt(ax ? ax * hx * j(0.82 + 0.18 * r()) : t * hx, ay ? ay * hy * j(0.82 + 0.18 * r()) : t * hy, hz * j(0.45 + 0.4 * r()));
  }
  hull.setFromPoints(pool.slice(0, n));
  const map = (v: THREE.Vector3): V3 => {
    const kk = 1 + taper * (v.y / hy), sx = v.x * kk + shear * v.y, sz = v.z * (1 + 0.5 * taper * (v.y / hy));
    return [f.o[0] + f.x[0] * sx + f.y[0] * v.y + f.z[0] * sz, f.o[1] + f.x[1] * sx + f.y[1] * v.y + f.z[1] * sz, f.o[2] + f.x[2] * sx + f.y[2] * v.y + f.z[2] * sz];
  };
  const face = [cell[0], cell[1], cell[2], cell[3]], worn = [cell[0], cell[1], cell[2] + 1, cell[3]];
  for (const fc of hull.faces) {
    const nz = fc.normal.z, c = nz > 0.2 && nz < 0.86 ? worn : face;
    // The frame may be a mirror, so each triangle is turned to face the way the hull's face does.
    const w: V3 = [0, 1, 2].map((i) => f.x[i] * fc.normal.x + f.y[i] * fc.normal.y + f.z[i] * fc.normal.z) as V3;
    const e0 = fc.edge, a = map(e0.head().point);
    let e = e0.next;
    while (e.next !== e0) {
      const b = map(e.head().point), d = map(e.next.head().point);
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      if ((uy * vz - uz * vy) * w[0] + (uz * vx - ux * vz) * w[1] + (ux * vy - uy * vx) * w[2] >= 0) s.tri(a, b, d, c);
      else s.tri(a, d, b, c);
      e = e.next;
    }
  }
}
