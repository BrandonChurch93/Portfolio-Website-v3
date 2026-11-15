import * as THREE from 'three';
import { type Builder, seeded, slice } from '../../../../world/build';
import { EDGE, seat } from '../../layout';
import { lamp } from './floor';
import { D2R, KIND, polar, seen, stand, tag } from './kit';
import { BROKEN, DEEP, type Plate, glowAt, inner, scarp } from './plates';
import { inForest, onRoad } from './roads';

// What the breaking did on the margin. Where it is the forest's, the jungle's floor is torn: trees thrown down with
// their root plates standing up, roots hanging in the air from every broken face, boulders loose. Where it is the
// city's, its streets end in the air and their lamps are down. Rubble lies along every crack and down in the splits.
// Each thing on a block that moved stands on it and moved with it.

type On = (x: number, z: number) => Plate | null;
const rotX = (deg: number) => new THREE.Matrix4().makeRotationX(deg * D2R);
const rotY = (deg: number) => new THREE.Matrix4().makeRotationY(deg * D2R);
const rotZ = (deg: number) => new THREE.Matrix4().makeRotationZ(deg * D2R);
const move = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);

// Stands a thing on the land at a place of the map, turned spin degrees about its own upright, moved with the block
// it stands on. A spin of the bearing turns its +z out from the middle.
export function standAt(on: On, x: number, z: number, spin = 0, up = 0): THREE.Matrix4 {
  const p = on(x, z);
  if (!p) return seat(x, z, up, spin);
  const v = new THREE.Vector3(x, up, z).applyMatrix4(p.m);
  return seat(v.x, v.z, v.y, 0).multiply(new THREE.Matrix4().makeRotationFromQuaternion(p.q)).multiply(rotY(spin));
}

// A block of rock with broken faces: a rough ball pulled out of round, its points moved so no two are alike.
export function boulder(r: () => number, fine: boolean): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, fine ? 1 : 0), p = g.getAttribute('position'), seen = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!seen.has(key)) seen.set(key, 0.78 + r() * 0.4);
    const k = seen.get(key)!;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.72, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

// A root: a thin curve hanging from a broken face, thinning as it goes.
function root(r: () => number, len: number): THREE.BufferGeometry {
  const pts = Array.from({ length: 5 }, (_, i) => new THREE.Vector3((r() - 0.5) * 1.2 * i, -i * (len / 4), (r() - 0.2) * 0.9 * i));
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.16 + r() * 0.12, 4, false), p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) { const k = 1 + p.getY(i) / (len * 1.6); p.setX(i, p.getX(i) * Math.max(0.3, k)); p.setZ(i, p.getZ(i) * Math.max(0.3, k)); }
  return g;
}

export async function margin(b: Builder, made: THREE.Material, low: THREE.Material, on: On): Promise<void> {
  const r = seeded(6151);
  const edgeIn = (deg: number) => EDGE.at(deg) - 1;
  const rocks = [boulder(seeded(1), true), boulder(seeded(2), true), boulder(seeded(3), false), boulder(seeded(4), false), boulder(seeded(5), false)];
  const rock = (fine: boolean) => rocks[fine ? Math.floor(r() * 2) : 2 + Math.floor(r() * 3)];
  const across = (deg: number, k: number) => { const lo = inner(deg), hi = edgeIn(deg); return polar(deg, lo + (hi - lo) * k); };

  // In the forest's stretch: trees torn up by the roots and thrown down across the blocks and into the cracks.
  for (let k = 0; k < 70; k++) {
    const deg = 222 + r() * 96, q = across(deg, 0.08 + 0.85 * r());
    if (!inForest(q.x, q.y) || !on(q.x, q.y)) continue;
    const len = 9 + r() * 10, rad = 0.45 + r() * 0.35, at = standAt(on, q.x, q.y, r() * 360).multiply(move(0, rad, 0)).multiply(rotZ(90 + (r() - 0.5) * 18));
    stand(b, low, tag(new THREE.CylinderGeometry(rad * 0.45, rad, len, 7, 1).translate(0, len / 2, 0), KIND.bark), at);
    stand(b, low, tag(new THREE.CylinderGeometry(rad * 3.2, rad * 3.6, rad * 1.3, 9).translate(0, -rad * 0.4, 0), KIND.soil), at);
    for (let j = 0; j < 3; j++) {
      const y = len * (0.45 + 0.17 * j), l = 2.5 + r() * 3.5;
      stand(b, low, tag(new THREE.CylinderGeometry(0.1, 0.2, l, 5).translate(0, l / 2, 0), KIND.bark), at.clone().multiply(move(0, y, 0)).multiply(rotY(r() * 360)).multiply(rotZ(40 + r() * 30)));
    }
    if (k % 14 === 0) await slice();
  }
  // Roots hanging from the broken faces along the forest's scarps.
  for (let k = 0; k < 260; k++) {
    const deg = 222 + r() * 96, row = 1 + Math.floor(r() * 4), q = polar(deg, scarp(row, deg) - 0.6);
    if (!inForest(q.x, q.y) || !on(q.x - Math.sin(deg * D2R) * 1.5, q.y - Math.cos(deg * D2R) * 1.5)) continue;
    const back = polar(deg, scarp(row, deg) - 1.8);
    stand(b, low, tag(root(r, 2 + r() * 4), KIND.bark), standAt(on, back.x, back.y, deg, -0.4).multiply(rotX(-20 - r() * 40)));
  }
  await slice();

  // In the city's stretch: its lamps down across the broken paving where the street ran out.
  for (let k = 0; k < 40; k++) {
    const deg = (r() - 0.5) * 2 * (BROKEN - 6), q = across(deg, 0.15 + 0.8 * r());
    if (inForest(q.x, q.y) || !on(q.x, q.y) || !seen(deg, 118)) continue;
    lamp(b, low, standAt(on, q.x, q.y, r() * 360).multiply(move(0, 0.4, 0)).multiply(rotX(70 + r() * 20)), 4.4);
  }

  // Boulders thrown loose on the broken land, more toward the edge; rubble along the cracks and down in the splits.
  for (let k = 0; k < 800; k++) {
    const deg = (r() - 0.5) * 2 * (BROKEN - 4), t = Math.pow(r(), 0.7), q = across(deg, t), g = glowAt(q.x, q.y), p = on(q.x, q.y);
    if (r() > 0.2 + 0.8 * t * t + g || onRoad(q.x, q.y)) continue;
    const s = 0.4 + r() * r() * (1.6 + 2 * g + 1.4 * t) * (inForest(q.x, q.y) ? 1.3 : 0.8);
    const shape = tag(rock(s > 2).clone().scale(s * (0.7 + r() * 0.6), s * (0.6 + r() * 0.5), s * (0.7 + r() * 0.6)), KIND.rock);
    if (g > 0.55) stand(b, low, shape, seat(q.x, q.y, -DEEP.split + s * 0.5 + r() * 8, r() * 360).multiply(rotX(r() * 180)));
    else if (p) stand(b, s > 1.8 ? made : low, shape, standAt(on, q.x, q.y, r() * 360, s * 0.2).multiply(rotX(r() * 40)));
    if (k % 300 === 0) await slice();
  }
}
