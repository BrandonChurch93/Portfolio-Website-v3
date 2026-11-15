import * as THREE from 'three';
import { PANEL } from './frame';

// Forms for the ultrawide, in millimetres about the panel's middle. A thing is made straight, with x along the panel,
// and then bent round the panel's curve, its ends coming toward the viewer.

export function bend(g: THREE.BufferGeometry, r: number = PANEL.R): THREE.BufferGeometry {
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const a = p.getX(i) / r, z = p.getZ(i);
    p.setXYZ(i, (r - z) * Math.sin(a), p.getY(i), r - (r - z) * Math.cos(a));
  }
  g.computeVertexNormals();
  return g;
}

// How far a rounded corner of radius r pulls an edge in, at d from the end.
export const corner = (d: number, r: number) => (d >= r ? 0 : r - Math.sqrt(Math.max(0, r * r - (r - d) * (r - d))));

// Stations along x from -w/2 to w/2: even across the middle, close together near each end where corners round off.
export function stations(w: number, n: number, ends: number[]): number[] {
  const out = new Set<number>();
  for (let i = 0; i <= n; i++) out.add(-w / 2 + (w * i) / n);
  for (const d of ends) { out.add(-w / 2 + d); out.add(w / 2 - d); }
  return [...out].sort((a, b) => a - b);
}

type Loop = [y: number, z: number][];

// A loop swept along x: at each station a closed outline in (y, z), every outline with the same number of points.
// Caps close the two ends when asked.
export function sweep(xs: number[], at: (x: number) => Loop, caps = true): THREE.BufferGeometry[] {
  const loops = xs.map(at), m = loops[0].length;
  // Wind each outline the same way, so the faces look out.
  let area = 0;
  const l0 = loops[Math.floor(loops.length / 2)];
  for (let i = 0; i < m; i++) { const [y0, z0] = l0[i], [y1, z1] = l0[(i + 1) % m]; area += y0 * z1 - y1 * z0; }
  if (area < 0) for (const l of loops) l.reverse();
  const pos: number[] = [], idx: number[] = [];
  loops.forEach((l, j) => { for (const [y, z] of l) pos.push(xs[j], y, z); });
  for (let j = 0; j < loops.length - 1; j++) for (let i = 0; i < m; i++) {
    const a = j * m + i, b = j * m + ((i + 1) % m), c = a + m, d = b + m;
    idx.push(a, b, c, b, d, c);
  }
  const body = new THREE.BufferGeometry();
  body.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  body.setIndex(idx);
  const out = [body];
  if (caps) for (const end of [0, loops.length - 1]) {
    const l = loops[end], x = xs[end];
    let cy = 0, cz = 0;
    for (const [y, z] of l) { cy += y / m; cz += z / m; }
    const p: number[] = [x, cy, cz], ix: number[] = [];
    for (const [y, z] of l) p.push(x, y, z);
    for (let i = 0; i < m; i++) { const a = 1 + i, b = 1 + ((i + 1) % m); if (end === 0) ix.push(0, b, a); else ix.push(0, a, b); }
    const cap = new THREE.BufferGeometry();
    cap.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    cap.setIndex(ix);
    out.push(cap);
  }
  return out;
}

// A rounded rectangle in (y, z): its middle, its half sizes, the radius of its corners, k points to a corner.
export function roundRect(cy: number, cz: number, hy: number, hz: number, r: number, k = 5): Loop {
  const rr = Math.max(0.01, Math.min(r, hy, hz)), out: Loop = [];
  const corners: [number, number, number][] = [[hy - rr, hz - rr, 0], [-(hy - rr), hz - rr, 0.5 * Math.PI], [-(hy - rr), -(hz - rr), Math.PI], [hy - rr, -(hz - rr), 1.5 * Math.PI]];
  for (const [y, z, a0] of corners) for (let i = 0; i <= k; i++) {
    const a = a0 + (i / k) * 0.5 * Math.PI;
    out.push([cy + y + rr * Math.cos(a), cz + z + rr * Math.sin(a)]);
  }
  return out;
}

// A slab of the panel's width: a rounded section of (y0..y1, z0..z1) swept along x, its corners rounded seen from the
// front by rFront and its edges by rEdge, and bent round the curve.
export function curvedSlab(w: number, y0: number, y1: number, z0: number, z1: number, rFront: number, rEdge: number, n = 96): THREE.BufferGeometry[] {
  const hy = (y1 - y0) / 2, hz = (z1 - z0) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  const ends = [0, 0.08, 0.3, 0.7, 1.2, 1.9, 2.8, 3.9, 5.2, 6.8, 8.6, 10.8, 13.5];
  const xs = stations(w, n, ends.filter((d) => d < rFront * 1.6));
  return sweep(xs, (x) => {
    const d = w / 2 - Math.abs(x), e = corner(d, rEdge), f = corner(d, rFront);
    return roundRect(cy, cz, hy - f - e * 0.4, hz - e, rEdge);
  }).map((g) => bend(g));
}

// The back shell: a deep housing behind the middle of the panel, its top a ledge just under the panel's top edge, its
// back near flat, its sides tapering into the panel.
export const SHELL = {
  // The outline of its section, from the top at the panel's back round to the bottom: height, and depth back from the
  // panel's back.
  outline: [[189.5, 0], [190.3, 6], [189.2, 18], [186.5, 27], [181, 34], [170, 39.5], [140, 44], [60, 46.5], [-40, 46.8], [-110, 44], [-150, 36], [-171, 24], [-181, 11], [-183.5, 0]] as [number, number][],
  // Full depth across the middle, gone at the reach.
  full: 250,
  reach: 395,
  // The vents in its top: two banks of short slots, each slot lying along the panel, in staggered rows. Where a bank
  // starts and stops from the middle, the rows' first and last depth back from the panel, the pitch along and between
  // rows, and a slot's length and width.
  vents: { inner: 40, outer: 214, from: 8, to: 27, pitch: 17, row: 4.75, len: 12.5, slot: 2.1 },
} as const;

export function shellDepth(x: number): number {
  const a = Math.abs(x);
  if (a <= SHELL.full) return 1;
  const t = Math.min(1, (a - SHELL.full) / (SHELL.reach - SHELL.full));
  return Math.sqrt(Math.max(0, 1 - t * t));
}

export function shell(): THREE.BufferGeometry {
  const curve = new THREE.SplineCurve(SHELL.outline.map(([y, d]) => new THREE.Vector2(y, d)));
  const pts = curve.getSpacedPoints(46);
  const xs = stations(SHELL.reach * 2, 120, [0, 2, 6, 12, 20, 30, 44, 60, 80, 100]);
  const [g] = sweep(xs, (x) => {
    const s = shellDepth(x), lift = 0.9 + 0.1 * s;
    const outer: Loop = pts.map((p) => [p.x * lift, PANEL.back + 1 - p.y * s]);
    return outer;
  }, false);
  return bend(g);
}
