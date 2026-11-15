import * as THREE from 'three';
import { CARVE_R, DISC, K, QUARTER, SEAM } from './plan';
import { dome, section, thin } from './profile';

// The disc as solids, built with its face toward +z and its middle at the origin, in the world's units. Every point
// carries where it lies on the carving's map (uv): u runs round the disc, a quarter turn to one, and v out from the
// middle, the rim's outer edge at one. The carving repeats each quarter turn, as the rays do.

const TAU = Math.PI * 2;
// Two faces of the section that meet at more than this, in radians, keep their own normals: a hard edge.
const CREASE = 0.7;
// How closely the thinned section keeps to the drawn one, in the carving's units.
const TOL = 0.07;

export const mapU = (th: number): number => ((((th - SEAM) % TAU) + TAU) % TAU) / QUARTER;

// The face, the rim and the back, turned round the disc's axis.
export function turned(): THREE.BufferGeometry {
  const pts = thin(section(), TOL);
  // Each segment's normal, out of the solid: the section runs from the face's middle out, round the rim and back in.
  const seg = pts.slice(0, -1).map((a, i) => {
    const b = pts[i + 1], dr = b.r - a.r, dz = b.z - a.z, l = Math.hypot(dr, dz) || 1;
    return [-dz / l, dr / l] as [number, number];
  });
  interface Row { r: number; z: number; nr: number; nz: number; v: number }
  const rows: Row[] = [], links: [number, number][] = [];
  const v = (p: { r: number; back: boolean }) => (p.back ? 1 : Math.min(1, p.r / CARVE_R));
  let prev = -1;
  pts.forEach((p, i) => {
    const a = seg[i - 1], b = seg[i];
    const n = !a ? b : !b ? a : null;
    if (n) {
      rows.push({ r: p.r, z: p.z, nr: n[0], nz: n[1], v: v(p) });
      if (prev >= 0) links.push([prev, rows.length - 1]);
      prev = rows.length - 1;
      return;
    }
    const turn = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1])));
    if (turn > CREASE) {
      rows.push({ r: p.r, z: p.z, nr: a[0], nz: a[1], v: v(p) });
      links.push([prev, rows.length - 1]);
      rows.push({ r: p.r, z: p.z, nr: b[0], nz: b[1], v: v(p) });
      prev = rows.length - 1;
    } else {
      const nr = a[0] + b[0], nz = a[1] + b[1], l = Math.hypot(nr, nz) || 1;
      rows.push({ r: p.r, z: p.z, nr: nr / l, nz: nz / l, v: v(p) });
      links.push([prev, rows.length - 1]);
      prev = rows.length - 1;
    }
  });
  const S = DISC.seg, cols = S + 1;
  const pos = new Float32Array(rows.length * cols * 3), nrm = new Float32Array(rows.length * cols * 3), uv = new Float32Array(rows.length * cols * 2);
  rows.forEach((w, j) => {
    for (let i = 0; i < cols; i++) {
      const th = SEAM + (i / S) * TAU, c = Math.cos(th), s = Math.sin(th), k = j * cols + i;
      pos.set([w.r * c * K, w.r * s * K, w.z * K], k * 3);
      nrm.set([w.nr * c, w.nr * s, w.nz], k * 3);
      uv.set([(i / S) * 4, w.v], k * 2);
    }
  });
  const index: number[] = [];
  for (const [a, b] of links) {
    if (rows[a].r < 1e-4 && rows[b].r < 1e-4) continue;
    for (let i = 0; i < S; i++) {
      const p = a * cols + i, q = b * cols + i;
      // The section runs outward on the face, so this winding faces out of the solid.
      index.push(p, q, p + 1, p + 1, q, q + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  return g;
}

// The rays, over the rings: a great one at each quarter and a lesser one between, as on Work's stones. Each is a broad
// carved wedge, two polished faces meeting in a low rounded ridge, with a chamfer and an upright wall down each side: every edge of it
// carries its own line of light. Its root rises out of the ring it starts behind. They are short and broad, as the
// stone's are: drawn long they read as a compass rose.
export const RAYS = {
  great: { from: 32.4, to: 67, half: 12.5, wall: 4.2, ridge: 7 },
  lesser: { from: 32.6, to: 55, half: 9, wall: 3.8, ridge: 5.8 },
} as const;
export type Ray = (typeof RAYS)['great'] | (typeof RAYS)['lesser'];
// How wide a ray is at a distance along it, in the carving's units.
export const rayHalf = (ray: Ray, r: number): number => {
  const t = (r - ray.from) / (ray.to - ray.from);
  return t < 0 || t > 1 ? 0 : ray.half * Math.max(0, 1 - t) ** 0.92;
};

export function rays(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 8; k++) {
    const ray = k % 2 === 0 ? RAYS.great : RAYS.lesser, th = (k * Math.PI) / 4;
    const c = Math.cos(th), s = Math.sin(th);
    // Stations along it: close together at the root, where it rises, and spread toward the point.
    const ts = [0, 0.012, 0.03, 0.055, 0.09, 0.14, 0.2, 0.27, 0.35, 0.44, 0.53, 0.62, 0.71, 0.8, 0.88, 0.94, 0.985, 1];
    // The section across a ray, from one side to the other, as a share of its half width, and which strips of it are
    // rounded across and which are flat.
    const across = [-1, -1, -0.84, -0.45, -0.07, 0, 0.07, 0.45, 0.84, 1, 1];
    const strips: [number, number, boolean][] = [[0, 1, false], [1, 2, false], [2, 4, true], [4, 6, true], [6, 8, true], [8, 9, false], [9, 10, false]];
    // Each face swells a little between its chamfer and the ridge, so it carries a line of light and not one flat tone.
    const lift = (ray: Ray, rise: number) => {
      const lo = ray.wall * rise + (ray.ridge - ray.wall) * 0.2 * rise, top = ray.ridge * rise - 0.08, mid = lo + (top - lo) * 0.62;
      return [-1.2, ray.wall * rise, lo, mid, top, ray.ridge * rise, top, mid, lo, ray.wall * rise, -1.2];
    };
    const grid = ts.map((t) => {
      const r = ray.from + t * (ray.to - ray.from), half = Math.max(0.05, rayHalf(ray, r)), rise = Math.min(1, 0.35 + 0.65 * Math.sqrt(t / 0.09)), ups = lift(ray, rise);
      return across.map((a, i) => {
        const w = a * half, base = dome(r);
        return new THREE.Vector3((r * c - w * s) * K, (r * s + w * c) * K, (base + ups[i]) * K);
      });
    });
    for (const [a, b, smooth] of strips) {
      const n = b - a + 1, pos: number[] = [], index: number[] = [];
      for (const row of grid) for (let i = a; i <= b; i++) pos.push(row[i].x, row[i].y, row[i].z);
      for (let j = 0; j < grid.length - 1; j++) for (let i = 0; i < n - 1; i++) {
        const p = j * n + i, q = (j + 1) * n + i;
        index.push(p, q, p + 1, p + 1, q, q + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(index);
      g.computeVertexNormals();
      if (!smooth) flatAcross(g, n);
      parts.push(g);
    }
    // The root's end: the section at its first station, closed.
    const root = grid[0], pos: number[] = [], index: number[] = [];
    for (const p of root) pos.push(p.x, p.y, p.z);
    for (let i = 1; i < root.length - 2; i++) index.push(0, i, i + 1);
    const cap = new THREE.BufferGeometry();
    cap.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    cap.setIndex(index);
    cap.computeVertexNormals();
    // It faces back toward the disc's middle.
    const cn = cap.getAttribute('normal');
    if (cn.getX(0) * c + cn.getY(0) * s > 0) { index.reverse(); cap.setIndex(index); cap.computeVertexNormals(); }
    parts.push(cap);
  }
  for (const g of parts) polarUV(g);
  return merge(parts);
}

// A strip two points across is flat across: both its edges take the normal of the strip there.
function flatAcross(g: THREE.BufferGeometry, n: number): void {
  if (n !== 2) return;
  const nr = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < nr.count; i += 2) {
    const x = nr.getX(i) + nr.getX(i + 1), y = nr.getY(i) + nr.getY(i + 1), z = nr.getZ(i) + nr.getZ(i + 1), l = Math.hypot(x, y, z) || 1;
    nr.setXYZ(i, x / l, y / l, z / l);
    nr.setXYZ(i + 1, x / l, y / l, z / l);
  }
}

// Where a point of a solid on the disc lies on the carving's map, from where it is across the disc's face.
export function polarUV(g: THREE.BufferGeometry, plain = false): void {
  const p = g.getAttribute('position'), uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / K, y = p.getY(i) / K;
    uv[i * 2] = plain ? 0.5 : mapU(Math.atan2(y, x));
    uv[i * 2 + 1] = plain ? 1 : Math.min(1, Math.hypot(x, y) / CARVE_R);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const n = flat.reduce((a, g) => a + g.getAttribute('position').count, 0);
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let at = 0;
  for (const g of flat) {
    pos.set(g.getAttribute('position').array as Float32Array, at * 3);
    nrm.set(g.getAttribute('normal').array as Float32Array, at * 3);
    uv.set(g.getAttribute('uv').array as Float32Array, at * 2);
    at += g.getAttribute('position').count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return out;
}
