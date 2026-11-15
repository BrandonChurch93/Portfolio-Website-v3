import * as THREE from 'three';
import { slice } from '../../../../world/build';
import type { Lamp } from './materials';
import { type Parts, battered, block, quad } from './forms';
import { END_GATE, GRAND, PYLON, WAY, WAY_END, terraceAt, wayHalf, wayTallest } from './plan';
import { brazier, obelisk, pylon, seated, sphinx } from './things';

// The way to the spire, on the center line of the map, coming down the face of the world toward the visitor in
// terraces, a canyon through the city, to a great gate at the broken margin. What lies on the ground is built flat on the map and laid over the dome; what stands is seated on it.

const ROW: ('sphinx' | 'brazier' | 'colossus' | 'obelisk')[] = ['sphinx', 'brazier', 'colossus', 'obelisk', 'brazier', 'colossus', 'obelisk', 'brazier', 'obelisk'];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0), FRONT = new THREE.Vector3(0, 0, 1);

// A straight run from one place on the map to another, so wide, from one height to another: a kerb, a wall.
function run(b: Parts, kind: 'lime' | 'dark', x0: number, z0: number, x1: number, z1: number, wide: number, y0: number, y1: number, o: { batter?: number; seed?: number } = {}): void {
  const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
  const g = (o.batter ? battered(wide, len, y1 - y0, o.batter, { dBatter: 0, cornice: Math.min(1.2, (y1 - y0) * 0.3) }) : block(wide, y1 - y0, len, 0.15)).translate(0, y0, 0);
  b.add(g.rotateY(a).translate((x0 + x1) / 2, 0, (z0 + z1) / 2), kind, { seed: o.seed });
}

export async function buildWay(b: Parts, lamps: Lamp[]): Promise<void> {
  const { pool, terrace } = WAY, half = (z: number) => wayHalf(z, pool.half0, pool.half1), wall = (z: number) => wayHalf(z, WAY.wall0, WAY.wall1);
  const n = WAY.stations.length;

  // The terraces, from the spire's end down: each a level of worn stone either side of its stretch of the pool, its
  // front a riser with a step half way down it, the pool falling over it in a sheet, and walls either side that hold
  // it up out of the ground.
  for (let i = 0; i < n; i++) {
    const za = WAY.stations[i] - terrace / 2, zb = za + terrace, h = terraceAt(i), next = i < n - 1 ? terraceAt(i + 1) : 0;
    const k = (z: number) => half(z) + pool.kerb;
    for (const sx of [-1, 1]) {
      const inner = (z: number) => sx * k(z), outer = (z: number) => sx * (wall(z) - 1.3);
      b.add(quad(V(inner(za), h, za), V(outer(za), h, za), V(outer(zb), h, zb), V(inner(zb), h, zb), UP), 'paving', { flag: 1, seed: i * 2 + sx });
      b.add(quad(V(inner(zb), next, zb), V(outer(zb), next, zb), V(outer(zb), h, zb), V(inner(zb), h, zb), FRONT), 'lime', { seed: i * 5 + sx });
      // A step half way down the riser.
      const s0 = Math.abs(inner(zb)), s1 = Math.abs(outer(zb));
      b.add(block(s1 - s0, next + (h - next) / 2, WAY.steps * 1.1, 0.08).translate(sx * (s0 + s1) / 2, 0, zb + WAY.steps * 0.55), 'paving', { flag: 1, seed: i * 7 + sx });
      run(b, 'lime', sx * (half(za) + pool.kerb / 2), za, sx * (half(zb) + pool.kerb / 2), zb, pool.kerb, 0, h + pool.rim, { seed: i * 3 + sx });
      run(b, 'lime', sx * wall(za), za, sx * wall(zb), zb, 2.8, 0, h + WAY.wallTall, { batter: 0.06, seed: i * 11 + sx });
      run(b, 'dark', sx * wall(za), za, sx * wall(zb), zb, 2.0, h + WAY.wallTall, h + WAY.wallTall + 0.3);
    }
    // The pool's stretch on this terrace, and the sheet it falls in over the front.
    const w = h - pool.under, wn = next - pool.under;
    b.add(quad(V(-half(za), w, za), V(half(za), w, za), V(half(zb), w, zb), V(-half(zb), w, zb), UP), 'water', {});
    b.add(quad(V(-half(zb), Math.max(wn, 0), zb), V(half(zb), Math.max(wn, 0), zb), V(half(zb), w, zb), V(-half(zb), w, zb), FRONT), 'water', {});
    await slice();
  }
  // The landing between the last terrace and the gate.
  const land0 = WAY_END, land1 = END_GATE.z + 6;
  b.add(quad(V(-wall(land0), 0.4, land0), V(wall(land0), 0.4, land0), V(wall(land0), 0.4, land1), V(-wall(land0), 0.4, land1), UP), 'paving', { flag: 1, seed: 90 });

  // The rows: on each terrace a sphinx, a brazier, a seated colossus or an obelisk either side, larger toward the
  // visitor. The colossi face the way.
  WAY.stations.forEach((z, i) => {
    const most = wayTallest(z), x0 = wayHalf(z, WAY.row0, WAY.row1), kind = ROW[i], y = terraceAt(i);
    for (const sx of [-1, 1]) {
      const x = sx * x0, seed = i * 2 + (sx > 0 ? 1 : 0);
      if (kind === 'sphinx') sphinx(b, { x, z, turn: sx > 0 ? 180 : 0, y }, Math.min(18, most - 1), seed);
      else if (kind === 'brazier') brazier(b, lamps, { x, z, y, scale: GRAND }, Math.min(WAY.brazier, Math.max(4, most - 9)) / GRAND, seed);
      else if (kind === 'colossus') seated(b, { x, z, y, turn: sx > 0 ? -90 : 90 }, Math.min(46, most), seed);
      else obelisk(b, { x, z, y }, most, 2.4 + most * 0.04, { cast: true, seed });
    }
  });
  await slice();

  // The gate the way ends in, where it meets the broken margin: a great pylon facing the visitor, with a brazier
  // either side of it.
  pylon(b, lamps, { x: 0, z: END_GATE.z, y: 0.4, scale: END_GATE.scale }, PYLON);
  for (const sx of [-1, 1]) brazier(b, lamps, { x: sx * wall(END_GATE.z) * 0.92, z: END_GATE.z + 16, y: 0.4, scale: GRAND }, 5, 70 + sx);
}
