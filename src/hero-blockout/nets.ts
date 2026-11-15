import * as THREE from 'three';
import { slice } from '../world/build';

// A surface from a field that is under 0 inside a thing and over 0 outside it. It is how the planet's broken rock
// is made from a description of it. lo is the lowest corner of the box that is searched, n how many cubes there are
// each way, cell how large one is, crease the angle past which two faces keep an edge between them.
//
// One point in every small cube the surface crosses, and a face wherever an edge of the grid goes from inside to
// outside. The point is not put at the middle of where the surface crosses the cube's edges: that rounds every edge
// of the rock off by a cube, and broken rock then reads as clay. It is put where the faces that cross the cube meet:
// at each crossing the field says which way the surface faces, and the point is the one place that lies on all of
// those faces at once. So a flat face stays flat right up to its edge, and the edge is sharp.
export async function surface(f: (x: number, y: number, z: number) => number, lo: [number, number, number], n: [number, number, number], cell: number, crease: number): Promise<THREE.BufferGeometry> {
  const nx = n[0] + 1, ny = n[1] + 1, nz = n[2] + 1, v = new Float32Array(nx * ny * nz), at = new Int32Array(nx * ny * nz).fill(-1);
  const id = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[id(i, j, k)] = f(lo[0] + i * cell, lo[1] + j * cell, lo[2] + k * cell);
    if (k % 4 === 0) await slice();
  }
  // Where the surface crosses an edge of the grid, and which way it faces there.
  const hp: number[] = [], hn: number[] = [], e = 0.14 * cell;
  const cross = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, va: number, vb: number): number => {
    const t = va / (va - vb), x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
    const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e), l = Math.hypot(gx, gy, gz) || 1;
    hp.push(x, y, z);
    hn.push(gx / l, gy / l, gz / l);
    return hp.length / 3 - 1;
  };
  const flat = nx * ny;
  let X0 = new Int32Array(flat), Y0 = new Int32Array(flat), X1 = new Int32Array(flat), Y1 = new Int32Array(flat);
  const Z = new Int32Array(flat), es = new Int32Array(12);
  const plane = (k: number, X: Int32Array, Y: Int32Array) => {
    X.fill(-1); Y.fill(-1);
    const z = lo[2] + k * cell;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = v[id(i, j, k)], x = lo[0] + i * cell, y = lo[1] + j * cell;
      if (i < nx - 1) { const b = v[id(i + 1, j, k)]; if ((a < 0) !== (b < 0)) X[i + nx * j] = cross(x, y, z, x + cell, y, z, a, b); }
      if (j < ny - 1) { const b = v[id(i, j + 1, k)]; if ((a < 0) !== (b < 0)) Y[i + nx * j] = cross(x, y, z, x, y + cell, z, a, b); }
    }
  };
  const pos: number[] = [], idx: number[] = [], PULL = 0.08, OVER = 0.3 * cell;
  plane(0, X0, Y0);
  for (let k = 0; k < nz - 1; k++) {
    plane(k + 1, X1, Y1);
    Z.fill(-1);
    const z0 = lo[2] + k * cell;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = v[id(i, j, k)], b = v[id(i, j, k + 1)];
      if ((a < 0) !== (b < 0)) Z[i + nx * j] = cross(lo[0] + i * cell, lo[1] + j * cell, z0, lo[0] + i * cell, lo[1] + j * cell, z0 + cell, a, b);
    }
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const q = i + nx * j;
      es[0] = X0[q]; es[1] = X0[q + nx]; es[2] = X1[q]; es[3] = X1[q + nx]; es[4] = Y0[q]; es[5] = Y0[q + 1]; es[6] = Y1[q]; es[7] = Y1[q + 1]; es[8] = Z[q]; es[9] = Z[q + 1]; es[10] = Z[q + nx]; es[11] = Z[q + nx + 1];
      let m = 0, cx = 0, cy = 0, cz = 0;
      for (let c = 0; c < 12; c++) if (es[c] >= 0) { const h = es[c] * 3; cx += hp[h]; cy += hp[h + 1]; cz += hp[h + 2]; m++; }
      if (!m) continue;
      cx /= m; cy /= m; cz /= m;
      let a00 = PULL, a01 = 0, a02 = 0, a11 = PULL, a12 = 0, a22 = PULL, b0 = 0, b1 = 0, b2 = 0;
      for (let c = 0; c < 12; c++) if (es[c] >= 0) {
        const h = es[c] * 3, ux = hn[h], uy = hn[h + 1], uz = hn[h + 2], d = ux * (hp[h] - cx) + uy * (hp[h + 1] - cy) + uz * (hp[h + 2] - cz);
        a00 += ux * ux; a01 += ux * uy; a02 += ux * uz; a11 += uy * uy; a12 += uy * uz; a22 += uz * uz;
        b0 += ux * d; b1 += uy * d; b2 += uz * d;
      }
      const m0 = a11 * a22 - a12 * a12, m1 = a01 * a22 - a12 * a02, m2 = a01 * a12 - a11 * a02, det = a00 * m0 - a01 * m1 + a02 * m2;
      let dx = (b0 * m0 - a01 * (b1 * a22 - a12 * b2) + a02 * (b1 * a12 - a11 * b2)) / det;
      let dy = (a00 * (b1 * a22 - a12 * b2) - b0 * m1 + a02 * (a01 * b2 - b1 * a02)) / det;
      let dz = (a00 * (a11 * b2 - b1 * a12) - a01 * (a01 * b2 - b1 * a02) + b0 * m2) / det;
      if (!Number.isFinite(dx + dy + dz)) dx = dy = dz = 0;
      // Never far outside its own cube, or thin rock throws spikes.
      const x0 = lo[0] + i * cell, y0 = lo[1] + j * cell;
      at[id(i, j, k)] = pos.length / 3;
      pos.push(Math.min(x0 + cell + OVER, Math.max(x0 - OVER, cx + dx)), Math.min(y0 + cell + OVER, Math.max(y0 - OVER, cy + dy)), Math.min(z0 + cell + OVER, Math.max(z0 - OVER, cz + dz)));
    }
    const s = X0; X0 = X1; X1 = s;
    const t = Y0; Y0 = Y1; Y1 = t;
    if (k % 4 === 0) await slice();
  }
  const quad = (a: number, b: number, d: number, g: number, flip: boolean) => {
    if (a < 0 || b < 0 || d < 0 || g < 0) return;
    if (flip) idx.push(a, g, d, a, d, b);
    else idx.push(a, b, d, a, d, g);
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
