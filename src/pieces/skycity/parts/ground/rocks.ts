import * as THREE from 'three';
import { type Builder, seeded, slice } from '../../../../world/build';
import { PEAKS, relief, seat } from '../../layout';
import { KIND, stand, tag } from './kit';

// The mountains' rock: what makes the forest's small mountains mountains and not mounds. At each summit a crown of
// spires of broken rock, jagged against the sky, and down each mountain, wherever it falls steeply, blocks of rock
// breaking out of the slope, set deep in it, so the outline is broken and the faces carry ledges. Trees do not stand
// on a cliff, so this rock may stand over the land.

// A spire of broken rock: a block pulled up tall, its faces broken flat, no two alike.
function spire(r: () => number, wide: number, tall: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 1), p = g.getAttribute('position'), moved = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!moved.has(key)) moved.set(key, 0.75 + r() * 0.45);
    const k = moved.get(key)!, y = p.getY(i), narrow = 1 - 0.55 * Math.max(0, y);
    p.setXYZ(i, p.getX(i) * k * wide * narrow, (y * 0.5 + 0.5) * tall * k, p.getZ(i) * k * wide * narrow);
  }
  g.computeVertexNormals();
  return g;
}

export async function rockForms(b: Builder, made: THREE.Material): Promise<{ at: [number, number]; r: number }[]> {
  const r = seeded(9091), placed: { at: [number, number]; r: number }[] = [];
  for (const pk of PEAKS) {
    // The crown: spires of broken rock round the summit, the tallest near its middle, leaning as they will.
    const many = 3 + Math.floor(pk.tall / 30);
    for (let i = 0; i < many; i++) {
      const a = r() * Math.PI * 2, d = i === 0 ? 0 : pk.r * (0.05 + 0.18 * r()), q = new THREE.Vector2(pk.x + Math.cos(a) * d, pk.z + Math.sin(a) * d);
      const tall = (6 + r() * 10) * (i === 0 ? 1.4 : 1) * (pk.tall / 90), wide = 2.5 + r() * 2.5 + pk.tall * 0.02;
      stand(b, made, tag(spire(r, wide, tall), KIND.mesa, r()), seat(q.x, q.y, -tall * 0.2, r() * 360).multiply(new THREE.Matrix4().makeRotationX((r() - 0.5) * 0.35).multiply(new THREE.Matrix4().makeRotationZ((r() - 0.5) * 0.35))));
      placed.push({ at: [q.x, q.y], r: wide * 1.4 });
    }
    // Rock breaking out of the steep faces: blocks set deep into the slope, so the mountain's outline is broken and
    // its faces carry ledges.
    for (let k = 0; k < 14; k++) {
      const a = r() * Math.PI * 2, d = pk.r * (0.15 + 0.6 * Math.sqrt(r())), q = new THREE.Vector2(pk.x + Math.cos(a) * d, pk.z + Math.sin(a) * d);
      const e = 1.2, steep = Math.hypot(relief(q.x + e, q.y) - relief(q.x - e, q.y), relief(q.x, q.y + e) - relief(q.x, q.y - e)) / (2 * e);
      if (steep < 0.7) continue;
      const s = 3.5 + r() * 5;
      stand(b, made, tag(spire(r, s, s * (0.8 + r() * 0.8)), KIND.mesa, r()), seat(q.x, q.y, -s * 0.82, r() * 360).multiply(new THREE.Matrix4().makeRotationX((r() - 0.5) * 0.6)));
      placed.push({ at: [q.x, q.y], r: s });
    }
    await slice();
  }
  return placed;
}
