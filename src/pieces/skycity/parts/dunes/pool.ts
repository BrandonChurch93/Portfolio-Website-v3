import * as THREE from 'three';
import { POOL, shore } from './plan';

// The pool, flat on the map with heights over the plain ground. Its face is very gently domed and rippled, so what it
// reflects bends a little across it. At its shore it rounds over, as mercury does, and falls into the sand: the
// rounded rim turns every way, so from this view it is the rim that carries the moon and the cursor's light as a bright
// line round the pool, while the face carries the glow of the sky behind the world.

const SEG = 120;
// How far in from the shore each ring is, over the rim, and below the shore the skirt that goes into the sand.
const RIM = [-2.2, -1, 0, 0.12, 0.35, 0.7, 1.15, 1.7, 2.4, 3.5];
const INNER = 13;

export function poolGeometry(): THREE.BufferGeometry {
  const pos: number[] = [], index: number[] = [];
  const rings = RIM.length + INNER;
  for (let i = 0; i < SEG; i++) {
    const a = (i / SEG) * Math.PI * 2, R = shore(a), cx = Math.cos(a), cz = Math.sin(a);
    for (let j = 0; j < rings; j++) {
      let rho: number, y: number;
      if (j < RIM.length) {
        const d = RIM[j];
        rho = R - d;
        if (d < 0) y = POOL.level - POOL.drop + d * 1.4;
        else { const k = 1 - Math.min(1, d / POOL.rim); y = POOL.level - POOL.drop + POOL.drop * Math.sqrt(Math.max(0, 1 - k * k)); }
      } else {
        const v = 1 - (j - RIM.length + 1) / (INNER + 1);
        rho = (R - POOL.rim) * v;
        y = POOL.level;
      }
      if (j >= RIM.length - 1) y += face(rho, a, R);
      pos.push(POOL.x + cx * rho, y, POOL.z + cz * rho);
    }
  }
  const mid = pos.length / 3;
  pos.push(POOL.x, POOL.level + face(0, 0, POOL.long), POOL.z);
  for (let i = 0; i < SEG; i++) {
    const n = (i + 1) % SEG;
    for (let j = 0; j < rings - 1; j++) {
      const a0 = i * rings + j, a1 = a0 + 1, b0 = n * rings + j, b1 = b0 + 1;
      index.push(a0, a1, b0, a1, b1, b0);
    }
    index.push(i * rings + rings - 1, mid, n * rings + rings - 1);
  }
  const map: number[] = [];
  for (let i = 0; i < pos.length; i += 3) map.push(pos[i], pos[i + 2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('map', new THREE.Float32BufferAttribute(map, 2));
  g.setIndex(index);
  // Turned so every face looks up, as the sand's are.
  const I = g.getIndex()!.array as Uint16Array | Uint32Array;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = pos[b] - pos[a], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vz = pos[c + 2] - pos[a + 2];
    if (uz * vx - ux * vz < 0) { const k = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = k; }
  }
  g.computeVertexNormals();
  return g;
}

// The face: a low dome and a long slow swell. Its hammering is in its shader.
function face(rho: number, a: number, R: number): number {
  const k = Math.min(1, rho / R);
  const x = rho * Math.cos(a), z = rho * Math.sin(a);
  return 3.6 * (1 - k * k) + 0.4 * Math.sin(z * 0.2 + 0.8 * Math.sin(x * 0.09 + 0.6)) * (1 - k * k);
}
