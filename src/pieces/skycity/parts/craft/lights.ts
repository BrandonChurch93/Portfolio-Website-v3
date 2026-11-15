import * as THREE from 'three';

// The quads the glow material draws (glowMaterial in ./look.ts): four corners to a light, each carrying the light's
// place, the way its streak runs, and how it looks.
export interface Quad { at: [number, number, number]; dir: [number, number, number]; look: number[] }
export function quads(list: Quad[]): THREE.BufferGeometry {
  const n = list.length, g = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 12), dir = new Float32Array(n * 12), corner = new Float32Array(n * 8), look = new Float32Array(n * 16);
  const index: number[] = [], cs = [-1, -1, 1, -1, 1, 1, -1, 1];
  list.forEach((l, i) => {
    for (let v = 0; v < 4; v++) {
      pos.set(l.at, (i * 4 + v) * 3);
      dir.set(l.dir, (i * 4 + v) * 3);
      look.set(l.look, (i * 4 + v) * 4);
    }
    corner.set(cs, i * 8);
    index.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('dir', new THREE.BufferAttribute(dir, 3));
  g.setAttribute('corner', new THREE.BufferAttribute(corner, 2));
  g.setAttribute('look', new THREE.BufferAttribute(look, 4));
  g.setIndex(index);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2400);
  return g;
}
