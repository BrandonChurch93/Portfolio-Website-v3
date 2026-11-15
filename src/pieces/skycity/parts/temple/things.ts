import * as THREE from 'three';
import type { Lamp } from './materials';
import { type Parts, battered, facetedPyramid, local, place, prism, roundedPyramid } from './forms';

// The made things the quarter and the way share, each built at a place, turned about its own upright, and handed to
// the parts. A thing that gives light adds its lamp to the list, which the materials draw as the light it throws.

// A thing's place on the map, so far above the ground there, turned about its own upright, in degrees, and drawn so
// many times its built size.
export interface Put { x: number; z: number; turn?: number; y?: number; scale?: number }
const mat = (p: Put, s = 1) => place(p.x, p.y ?? 0, p.z, p.turn ?? 0, s * (p.scale ?? 1));
const world = (p: Put, x: number, y: number, z: number, s = 1): [number, number, number] => { const k = s * (p.scale ?? 1); return local(p.x, p.y ?? 0, p.z, p.turn ?? 0, x * k, y * k, z * k); };
const far = (p: Put, reach: number) => reach * (p.scale ?? 1);

// An obelisk: a stepped plinth of pale stone, a collar of bronze, and a shaft sheathed in polished gold whose rounded
// arrises each carry a line of light up it, under a faceted mirror cap. Of dark granite they were lost against the
// dark towers either side of the way: in gold each stands in outline as a line of light.
export function obelisk(b: Parts, p: Put, tall: number, foot: number, o: { cast?: boolean; seed?: number } = {}): void {
  const plinth = Math.max(2, tall * 0.08), m = mat(p), top = foot * 0.66, cap = top * 2.4, shaft = tall - plinth - cap;
  b.add(battered(foot * 3.4, foot * 3.4, plinth * 0.55 + 2, 0.04, { cornice: plinth * 0.2, c: 0.15 }).translate(0, -2, 0), 'lime', { m, cast: o.cast, seed: o.seed, foot: -2 });
  b.add(battered(foot * 2.6, foot * 2.6, plinth * 0.45, 0.06, { cornice: plinth * 0.15, c: 0.12 }).translate(0, plinth * 0.55, 0), 'lime', { m, cast: o.cast, seed: (o.seed ?? 0) + 5 });
  b.add(prism([{ y: plinth, hw: foot * 1.14, hd: foot * 1.14, c: foot * 0.2 }, { y: plinth + foot * 0.6, hw: foot * 1.14, hd: foot * 1.14, c: foot * 0.2 }]), 'bronze', { m });
  const whole = (shaft * foot) / (foot - top);
  b.add(roundedPyramid(foot, whole, 0, shaft / whole, { round: 0.24, rows: 4, cols: 2, arc: 5 }).translate(0, plinth, 0), 'gold', { m, cast: o.cast });
  b.add(facetedPyramid(top, cap, 0.14).translate(0, plinth + shaft, 0), 'cap', { m, cast: o.cast });
}

// A brazier: a pedestal of pale stone, a bowl of bronze, and its flame, which flickers. It adds its lamp.
export function brazier(b: Parts, lamps: Lamp[], p: Put, pedestal: number, seed: number): void {
  const m = mat(p);
  b.add(battered(3.4, 3.4, pedestal + 2, 0.14, { cornice: 1.1, c: 0.15 }).translate(0, -2, 0), 'lime', { m, seed, foot: -2 });
  const bowl: [number, number][] = [[0.5, 0], [0.9, 0.25], [1.3, 0.9], [2.0, 1.45], [2.15, 1.6], [1.9, 1.6]];
  b.add(new THREE.LatheGeometry(bowl.map(([r, y]) => new THREE.Vector2(r, y)), 14).translate(0, pedestal, 0), 'bronze', { m });
  const base = pedestal + 1.2, fh = 2.8;
  for (const [dx, dz, h, r] of [[0, 0, 1, 1.25], [0.55, 0.3, 0.7, 0.8], [-0.5, -0.35, 0.75, 0.75]] as [number, number, number, number][]) {
    const g = new THREE.ConeGeometry(r, fh * h, 7, 3, true).translate(dx, base + (fh * h) / 2, dz);
    b.add(g, 'flame', { m, seed, v: (q) => Math.min(1, Math.max(0, (q.y - base) / fh)) });
  }
  lamps.push({ at: world(p, 0, base + 1.4, 0), power: 1.1, reach: far(p, 9), heat: 0.62, flicker: true });
}
