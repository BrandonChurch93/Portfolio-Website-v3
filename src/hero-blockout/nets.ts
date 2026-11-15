import * as THREE from 'three';
import { slice } from '../world/build';

// A surface from a field that is under 0 inside a thing and over 0 outside it: one point in every small cube the
// surface crosses, at the middle of where it crosses the cube's edges, and a face wherever an edge of the grid
// goes from inside to outside. It is how the planet's broken rock is made from a description of it. lo is the
// lowest corner of the box that is searched, n how many cubes there are each way, cell how large one is, crease the
// angle past which two faces keep an edge between them.
export async function surface(f: (x: number, y: number, z: number) => number, lo: [number, number, number], n: [number, number, number], cell: number, crease: number): Promise<THREE.BufferGeometry> {
  const nx = n[0] + 1, ny = n[1] + 1, nz = n[2] + 1, v = new Float32Array(nx * ny * nz), at = new Int32Array(nx * ny * nz).fill(-1);
  const id = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[id(i, j, k)] = f(lo[0] + i * cell, lo[1] + j * cell, lo[2] + k * cell);
    if (k % 4 === 0) await slice();
  }
  const pos: number[] = [], idx: number[] = [], c = new Float32Array(8);
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let inside = 0;
      for (let q = 0; q < 8; q++) { c[q] = v[id(i + (q & 1), j + ((q >> 1) & 1), k + (q >> 2))]; if (c[q] < 0) inside++; }
      if (inside === 0 || inside === 8) continue;
      let sx = 0, sy = 0, sz = 0, m = 0;
      for (const [a, b] of EDGES) {
        if ((c[a] < 0) === (c[b] < 0)) continue;
        const t = c[a] / (c[a] - c[b]);
        sx += (a & 1) + ((b & 1) - (a & 1)) * t;
        sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t;
        sz += (a >> 2) + ((b >> 2) - (a >> 2)) * t;
        m++;
      }
      at[id(i, j, k)] = pos.length / 3;
      pos.push(lo[0] + (i + sx / m) * cell, lo[1] + (j + sy / m) * cell, lo[2] + (k + sz / m) * cell);
    }
    if (k % 8 === 0) await slice();
  }
  const quad = (a: number, b: number, d: number, e: number, flip: boolean) => {
    if (a < 0 || b < 0 || d < 0 || e < 0) return;
    if (flip) idx.push(a, e, d, a, d, b);
    else idx.push(a, b, d, a, d, e);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const s = v[id(i, j, k)] < 0;
    if (s !== v[id(i + 1, j, k)] < 0) quad(at[id(i, j - 1, k - 1)], at[id(i, j, k - 1)], at[id(i, j, k)], at[id(i, j - 1, k)], !s);
    if (s !== v[id(i, j + 1, k)] < 0) quad(at[id(i - 1, j, k - 1)], at[id(i - 1, j, k)], at[id(i, j, k)], at[id(i, j, k - 1)], !s);
    if (s !== v[id(i, j, k + 1)] < 0) quad(at[id(i - 1, j - 1, k)], at[id(i, j - 1, k)], at[id(i, j, k)], at[id(i - 1, j, k)], !s);
  }
  await slice();
  return creased(new Float32Array(pos), new Uint32Array(idx), crease);
}

// The surface with its faces lit as rock is: a face shares its light with a neighbour only where the two meet at
// less than the crease angle. So a smooth skin stays smooth and a broken edge stays an edge.
function creased(pos: Float32Array, idx: Uint32Array, crease: number): THREE.BufferGeometry {
  const faces = idx.length / 3, verts = pos.length / 3, fn = new Float32Array(faces * 3), count = new Uint32Array(verts + 1);
  for (let f = 0; f < faces; f++) {
    const a = idx[f * 3] * 3, b = idx[f * 3 + 1] * 3, c = idx[f * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    fn[f * 3] = uy * vz - uz * vy;
    fn[f * 3 + 1] = uz * vx - ux * vz;
    fn[f * 3 + 2] = ux * vy - uy * vx;
    count[idx[f * 3] + 1]++; count[idx[f * 3 + 1] + 1]++; count[idx[f * 3 + 2] + 1]++;
  }
  for (let i = 0; i < verts; i++) count[i + 1] += count[i];
  const fill = count.slice(0, verts), around = new Uint32Array(faces * 3);
  for (let f = 0; f < faces; f++) for (let k = 0; k < 3; k++) around[fill[idx[f * 3 + k]]++] = f;
  const outP = new Float32Array(faces * 9), outN = new Float32Array(faces * 9), cos = Math.cos(crease);
  for (let f = 0; f < faces; f++) {
    const nx = fn[f * 3], ny = fn[f * 3 + 1], nz = fn[f * 3 + 2], nl = Math.hypot(nx, ny, nz) || 1;
    for (let k = 0; k < 3; k++) {
      const vi = idx[f * 3 + k];
      let sx = 0, sy = 0, sz = 0;
      for (let q = count[vi]; q < count[vi + 1]; q++) {
        const o = around[q] * 3, ox = fn[o], oy = fn[o + 1], oz = fn[o + 2], ol = Math.hypot(ox, oy, oz) || 1;
        if ((nx * ox + ny * oy + nz * oz) / (nl * ol) > cos) { sx += ox; sy += oy; sz += oz; }
      }
      const sl = Math.hypot(sx, sy, sz) || 1, at = f * 9 + k * 3;
      outP[at] = pos[vi * 3]; outP[at + 1] = pos[vi * 3 + 1]; outP[at + 2] = pos[vi * 3 + 2];
      outN[at] = sx / sl; outN[at + 1] = sy / sl; outN[at + 2] = sz / sl;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(outP, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(outN, 3));
  return g;
}
