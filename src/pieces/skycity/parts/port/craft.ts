import * as THREE from 'three';
import { Kit, V, battered, block, rod, turned, xform } from './kit';

// The craft, each made in its own frame: its nose toward +x, its top toward +y, in units. Each comes with the places of
// its small lights, which the port draws as glows and moves with it.

export type CraftName = 'skiff' | 'lifter' | 'barque';
// A light on a craft: where, how large in CSS pixels, its heat, its strength, and what it does: steady, a short pale
// flash now and then (strobe), or as bright as the engines are working (engine).
export interface CraftLight { at: [number, number, number]; size: number; heat: number; k: number; does: 'steady' | 'strobe' | 'engine' }
export interface CraftModel { geo: THREE.BufferGeometry; lights: CraftLight[]; tris: number; clear: number }

// A body turned about its long axis, lying along x from x0, its radius at each station along it, flattened top to
// bottom by squash. u runs along it, so the hull's plating is in bays along its length.
function body(pts: [number, number][], x0: number, squash: number, seg = 14): THREE.BufferGeometry {
  const g = turned(pts.map(([r, s]) => [r, s] as [number, number]), seg, 50);
  const p = g.getAttribute('position'), uv = g.getAttribute('uv') as THREE.BufferAttribute, len = pts[pts.length - 1][1] - pts[0][1];
  for (let i = 0; i < p.count; i++) uv.setX(i, (p.getY(i) - pts[0][1]) / len);
  g.rotateZ(-Math.PI / 2);
  g.scale(1, squash, 1);
  g.translate(x0, 0, 0);
  return g;
}

// A hull lofted through stations along x: at each, the middle's height, its half width and half height, and how square
// its section is.
interface Station { x: number; y: number; w: number; h: number; n?: number }
function hull(st: Station[], seg = 24): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const L = st[st.length - 1].x - st[0].x;
  st.forEach((s) => {
    const e = 2 / (s.n ?? 2.6);
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      pos.push(s.x, s.y + s.h * Math.sign(sn) * Math.abs(sn) ** e, s.w * Math.sign(c) * Math.abs(c) ** e);
      uv.push((s.x - st[0].x) / L, i / seg);
    }
  });
  const W = seg + 1;
  for (let j = 0; j < st.length - 1; j++) for (let i = 0; i < seg; i++) { const a = j * W + i; idx.push(a, a + 1, a + W, a + 1, a + W + 1, a + W); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// The skiff: a small fast craft, a flattened teardrop with a canopy and two nacelles on short wings, a band of gold
// round its waist.
export function skiff(): CraftModel {
  const k = new Kit();
  k.add(body([[0.01, 0], [1.1, 0.35], [1.75, 1.8], [2.05, 4.5], [1.85, 7.4], [1.2, 9.6], [0.01, 11]], -5.6, 0.62), 'hull', undefined, 9);
  k.add(new THREE.SphereGeometry(1, 12, 6), 'glass', xform([2.4, 0.75, 0], 0, [2.5, 0.75, 1.15]));
  k.add(body([[0.01, 0], [1.98, 0.05], [2.0, 0.55], [0.01, 0.6]], -0.7, 0.62), 'gold');
  for (const z of [-2.5, 2.5]) {
    k.add(body([[0.01, 0], [0.5, 0.4], [0.62, 1.2], [0.6, 4.4], [0.4, 5.4], [0.01, 5.6]], -4.4, 1, 10), 'hull', xform([0, 0.15, z]), 4);
    k.add(new THREE.CircleGeometry(0.42, 10).rotateY(-Math.PI / 2), 'engine', xform([-4.42, 0.15, z]));
    k.add(block(2.6, 0.22, Math.abs(z) - 1.2, 0.08), 'dark', xform([-1.6, 0.05, z / 2 + Math.sign(z) * 0.4], 0, 1, 0, Math.sign(z) * 0.08));
  }
  k.add(block(2.2, 1.4, 0.18, 0.06), 'gold', xform([-4.1, 0.95, 0], 0, 1, 0.35));
  return {
    geo: k.geometry(), tris: k.tris, clear: 0.9,
    lights: [
      { at: [5.3, 0, 0], size: 2.6, heat: 0.95, k: 2.4, does: 'steady' },
      { at: [-4.4, 0.15, -2.5], size: 2.4, heat: 0.7, k: 1.95, does: 'engine' },
      { at: [-4.4, 0.15, 2.5], size: 2.4, heat: 0.7, k: 1.95, does: 'engine' },
      { at: [-3.6, 1.6, 0], size: 2.1, heat: 1, k: 3.3, does: 'strobe' },
    ],
  };
}

// The lifter: a heavier craft for cargo, a long squared hull with a canopy at its nose, four engines in rings on
// outriggers that it lifts and lands on, and a container slung under it.
export function lifter(): CraftModel {
  const k = new Kit();
  k.add(hull([
    { x: -12, y: 0.3, w: 2.2, h: 1.6, n: 4 }, { x: -11.2, y: 0.2, w: 2.9, h: 2.3, n: 4 }, { x: 5, y: 0, w: 3.1, h: 2.5, n: 4 },
    { x: 9, y: 0.2, w: 2.6, h: 2.1, n: 3.4 }, { x: 11.4, y: 0.5, w: 1.6, h: 1.3, n: 3 }, { x: 12.3, y: 0.7, w: 0.3, h: 0.3, n: 2.4 },
  ], 20), 'hull', undefined, 11);
  k.add(hull([{ x: 6.5, y: 1.5, w: 1.9, h: 0.9, n: 3 }, { x: 9.2, y: 1.2, w: 1.7, h: 0.8, n: 3 }, { x: 11, y: 0.8, w: 0.9, h: 0.5, n: 3 }], 12), 'glass');
  k.add(block(16, 2.2, 4.8, 0.3), 'copper', xform([-2.5, -3.2, 0]));
  k.add(block(16.6, 0.5, 5.4, 0.15), 'dark', xform([-2.5, -1.9, 0]));
  k.add(block(23.4, 0.35, 6.4, 0.1), 'gold', xform([0, 0.9, 0]));
  for (const [x, z] of [[-8, -6], [-8, 6], [4.5, -6], [4.5, 6]] as [number, number][]) {
    k.add(turned([[1.55, -0.7], [2.15, -0.7], [2.25, 0.55], [1.7, 0.7], [1.55, -0.7]], 16), 'hull', xform([x, 0.1, z]));
    k.add(new THREE.CircleGeometry(1.55, 14).rotateX(Math.PI / 2), 'engine', xform([x, -0.3, z]));
    k.add(block(1.2, 0.5, Math.abs(z) - 4.2, 0.12), 'dark', xform([x, 0.3, z / 2 + Math.sign(z) * 0.6]));
  }
  k.add(block(1.0, 2.6, 0.2, 0.06), 'gold', xform([-11.4, 2.6, 0], 0, 1, -0.4));
  return {
    geo: k.geometry(), tris: k.tris, clear: 4.6,
    lights: [
      { at: [12.4, 0.7, 0], size: 2.6, heat: 0.95, k: 2.2, does: 'steady' },
      { at: [-8, -0.6, -6], size: 2.5, heat: 0.65, k: 1.95, does: 'engine' },
      { at: [-8, -0.6, 6], size: 2.5, heat: 0.65, k: 1.95, does: 'engine' },
      { at: [4.5, -0.6, -6], size: 2.5, heat: 0.65, k: 1.95, does: 'engine' },
      { at: [4.5, -0.6, 6], size: 2.5, heat: 0.65, k: 1.95, does: 'engine' },
      { at: [-11.2, 3.8, 0], size: 1.8, heat: 1, k: 2.4, does: 'strobe' },
      { at: [-4, -4.5, 0], size: 1.8, heat: 0.4, k: 1.35, does: 'steady' },
    ],
  };
}

// The barque: the large craft that holds off the rim. A long hull whose ends sweep up into slender horns capped in gold,
// as a solar barque's do; a long cabin amidships, battered and lit along its sides; a sun disc on its roof; two long
// nacelles under it, lit along their inner sides; and steering vanes at the stern.
export function barque(len: number): CraftModel {
  const k = new Kit(), s = len / 104;
  const lift = (x: number) => { const a = Math.max(0, (x - 26) / 26), b = Math.max(0, (-x - 24) / 28); return 15 * a ** 2.4 + 19 * b ** 2.2; };
  const xs = [-52, -50.5, -48, -45, -41, -36, -30, -22, -12, 0, 12, 22, 30, 36, 41, 45, 48.5, 51, 52];
  const half = (x: number) => { const e = Math.abs(x) / 52; return Math.max(0.35, 9.5 * (1 - e ** 2.6) ** 1.2 * (x < 0 ? 1 : 0.92)); };
  const st: Station[] = xs.map((x) => ({ x: x * s, y: lift(x) * s, w: half(x) * s, h: Math.max(0.35, half(x) * 0.62) * s, n: 2.8 }));
  k.add(hull(st, 28), 'hull', undefined, 14);
  // The sheer: a line of gold along each side of the deck, following the hull up into the horns.
  for (const side of [-1, 1]) for (let i = 0; i < xs.length - 1; i++) {
    const a = st[i], b = st[i + 1];
    k.add(rod(V(a.x, a.y + a.h * 0.35, side * a.w * 0.97), V(b.x, b.y + b.h * 0.35, side * b.w * 0.97), 0.42 * s, 5), 'gold');
  }
  // The finials: a lotus flaring from each horn's tip, turned along the horn.
  for (const [x, dir] of [[-52, -1], [52, 1]] as [number, number][]) {
    const tip = V(x * s, lift(x) * s, 0), before = V((x - dir * 3) * s, lift(x - dir * 3) * s, 0), d = tip.clone().sub(before).normalize();
    const f = turned([[0.35, 0], [0.9, 1.6], [2.1, 3.4], [2.3, 3.9], [0.01, 4.6]], 12).scale(s, s, s);
    f.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d));
    f.translate(tip.x, tip.y, tip.z);
    k.add(f, 'gold');
  }
  // The cabin amidships, its walls leaning in, a band of windows along each side and a gold cornice.
  const cab = { x0: -18, x1: 20, h: 7.5, w: 11 };
  const cy = half(0) * 0.62 * 0.85;
  k.add(battered((cab.x1 - cab.x0) * s, cab.w * s, (cab.x1 - cab.x0 - 3) * s, (cab.w - 2.6) * s, cab.h * s, 1.8 * s), 'hull', xform([((cab.x0 + cab.x1) / 2) * s, cy * s, 0]), 6);
  for (const side of [-1, 1]) k.add(new THREE.PlaneGeometry((cab.x1 - cab.x0 - 4) * s, 2.2 * s), 'windows', xform([((cab.x0 + cab.x1) / 2) * s, (cy + cab.h * 0.55) * s, side * (cab.w / 2 - 0.62) * s], side > 0 ? 0 : Math.PI, 1, 0, -0.155), 22, 3);
  k.add(block((cab.x1 - cab.x0 - 4) * s, 1.2 * s, (cab.w - 0.4) * s, 0.2 * s), 'gold', xform([((cab.x0 + cab.x1) / 2) * s, (cy + cab.h + 0.2) * s, 0]));
  // A shrine at the stern, and the sun disc on the cabin's roof, held between two horns.
  k.add(battered(9 * s, 8 * s, 7 * s, 6 * s, 5.5 * s, 1.2 * s), 'hull', xform([-31 * s, st[6].y + st[6].h * 0.7, 0]), 4);
  k.add(new THREE.CylinderGeometry(4.2 * s, 4.2 * s, 0.9 * s, 28).rotateX(Math.PI / 2), 'gold', xform([4 * s, (cy + cab.h + 6.2) * s, 0]));
  k.add(block(2.2 * s, 2.4 * s, 1.6 * s, 0.2 * s), 'dark', xform([4 * s, (cy + cab.h + 1.6) * s, 0]));
  for (const side of [-1, 1]) k.add(rod(V(4 * s, (cy + cab.h + 1.4) * s, side * 1.2 * s), V(4 * s, (cy + cab.h + 9.6) * s, side * 4.6 * s), 0.38 * s, 5, 0.12 * s), 'gold');
  // The nacelles, each on a swept pylon.
  for (const side of [-1, 1]) {
    const z = side * 15 * s, y = -8 * s;
    k.add(body([[0.01, 0], [1.6, 2.2], [2.6, 7], [2.7, 32], [2.3, 42], [1.4, 45], [0.01, 46]].map(([r, x]) => [r * s, x * s] as [number, number]), -30 * s, 1, 14), 'hull', xform([0, y, z]), 8);
    k.add(new THREE.CircleGeometry(1.7 * s, 14).rotateY(-Math.PI / 2), 'engine', xform([-30.05 * s, y, z]));
    k.add(block(36 * s, 0.7 * s, 0.25 * s, 0.1 * s), 'line', xform([-5 * s, y, z - side * 2.62 * s]));
    k.add(block(7 * s, 0.9 * s, 3.2 * s, 0.25 * s), 'copper', xform([10 * s, y, z]));
    const from = V(0, -2 * s, side * 6 * s), to = V(0, y + 1.5 * s, z - side * 1.4 * s), dd = to.clone().sub(from);
    const pyl = block(12 * s, dd.length(), 1.3 * s, 0.3 * s);
    pyl.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dd.clone().normalize()));
    pyl.translate((from.x + to.x) / 2 - 2 * s, (from.y + to.y) / 2, (from.z + to.z) / 2);
    k.add(pyl, 'dark');
  }
  // A keel under the hull.
  k.add(hull([{ x: -34 * s, y: -3 * s, w: 0.6 * s, h: 0.6 * s }, { x: -20 * s, y: -7 * s, w: 1.2 * s, h: 2.6 * s }, { x: 22 * s, y: -7.2 * s, w: 1.2 * s, h: 2.6 * s }, { x: 34 * s, y: -3 * s, w: 0.6 * s, h: 0.6 * s }], 10), 'dark');
  const keel: CraftLight[] = [-16, -6, 4, 14].map((x) => ({ at: [x * s, -10 * s, 0], size: 1.8, heat: 0.55, k: 1.2, does: 'steady' }));
  return {
    geo: k.geometry(), tris: k.tris, clear: 0,
    lights: [
      { at: [-52 * s, 19.6 * s, 0], size: 1.8, heat: 0.92, k: 1.5, does: 'steady' },
      { at: [52 * s, 15.6 * s, 0], size: 1.8, heat: 0.92, k: 1.5, does: 'steady' },
      { at: [4 * s, (cy + cab.h + 6.2) * s, 0], size: 3.6, heat: 0.75, k: 0.52, does: 'steady' },
      { at: [-30.3 * s, -8 * s, -15 * s], size: 2.2, heat: 0.7, k: 1.5, does: 'engine' },
      { at: [-30.3 * s, -8 * s, 15 * s], size: 2.2, heat: 0.7, k: 1.5, does: 'engine' },
      { at: [-31 * s, 16 * s, 0], size: 1.8, heat: 1, k: 2.4, does: 'strobe' },
      ...keel,
    ],
  };
}

// The mite: the small craft of the city's traffic, seen only as a speck behind its lights. A short dark hull with two
// stub nacelles and a band of gold.
export function mite(): CraftModel {
  const k = new Kit();
  k.add(body([[0.01, 0], [0.7, 0.6], [0.78, 2.6], [0.01, 3.8]], -1.9, 0.6, 6), 'dark', undefined, 3);
  for (const z of [-1.0, 1.0]) k.add(new THREE.BoxGeometry(1.9, 0.5, 0.55), 'dark', xform([-0.8, 0.05, z]));
  k.add(new THREE.BoxGeometry(0.4, 0.5, 1.6), 'gold', xform([0.1, 0.1, 0]));
  return { geo: k.geometry(), tris: k.tris, clear: 0.5, lights: [] };
}
