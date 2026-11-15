import { slice } from '../../../../world/build';
import type { Mesh } from './hull';

// How open each point of a piece is to the sky round it, worked out once from the piece's own triangles: a few rays
// from each point, out over its face, and how many of them meet the piece again within `reach`. Where a tree stands
// on the ground, a column meets its floor or two masses of rock meet, the light goes out of the corner, which is what
// gives a thing its weight. It turns with the piece, so it holds however the piece is turned.

const RAYS = 8;

export async function occlusion(m: Mesh, reach: number): Promise<Float32Array> {
  const P = m.pos, N = m.nrm, nTri = P.length / 9, cellSize = reach / 2;
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], P[i + a]); hi[a] = Math.max(hi[a], P[i + a]); }
  lo = lo.map((v) => v - reach);
  hi = hi.map((v) => v + reach);
  const dims = [0, 1, 2].map((a) => Math.max(1, Math.ceil((hi[a] - lo[a]) / cellSize)));
  const cells = new Map<number, number[]>();
  const key = (x: number, y: number, z: number) => (x * dims[1] + y) * dims[2] + z;
  for (let t = 0; t < nTri; t++) {
    const o = t * 9, b0 = [0, 0, 0], b1 = [0, 0, 0];
    for (let a = 0; a < 3; a++) {
      const v0 = P[o + a], v1 = P[o + 3 + a], v2 = P[o + 6 + a];
      b0[a] = Math.floor((Math.min(v0, v1, v2) - lo[a]) / cellSize);
      b1[a] = Math.floor((Math.max(v0, v1, v2) - lo[a]) / cellSize);
    }
    for (let x = b0[0]; x <= b1[0]; x++) for (let y = b0[1]; y <= b1[1]; y++) for (let z = b0[2]; z <= b1[2]; z++) {
      const k = key(x, y, z);
      const list = cells.get(k);
      if (list) list.push(t); else cells.set(k, [t]);
    }
  }
  await slice();
  // Each distinct point once: a piece's vertices repeat at every triangle that meets there.
  const seen = new Map<string, number>(), value: number[] = [], vertexOf = new Int32Array(P.length / 3);
  const stamp = new Int32Array(nTri);
  let pass = 0;
  // Fixed directions over a hemisphere about +z, turned onto each point's normal.
  const dirs: number[][] = [];
  for (let i = 0; i < RAYS; i++) {
    const u = (i + 0.5) / RAYS, a = i * 2.39996, r = Math.sqrt(u);
    dirs.push([Math.cos(a) * r, Math.sin(a) * r, Math.sqrt(1 - u)]);
  }
  for (let v = 0; v < P.length / 3; v++) {
    const px = P[v * 3], py = P[v * 3 + 1], pz = P[v * 3 + 2];
    const id = `${Math.round(px * 20)},${Math.round(py * 20)},${Math.round(pz * 20)},${Math.round(N[v * 3] * 4)},${Math.round(N[v * 3 + 1] * 4)},${Math.round(N[v * 3 + 2] * 4)}`;
    const known = seen.get(id);
    if (known !== undefined) { vertexOf[v] = known; continue; }
    const nx = N[v * 3], ny = N[v * 3 + 1], nz = N[v * 3 + 2];
    // A frame round the normal.
    const ax = Math.abs(nx) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    let tx = ny * ax[2] - nz * ax[1], ty = nz * ax[0] - nx * ax[2], tz = nx * ax[1] - ny * ax[0];
    const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
    const ox = px + nx * 0.05 * reach, oy = py + ny * 0.05 * reach, oz = pz + nz * 0.05 * reach;
    let shut = 0;
    for (const d of dirs) {
      const dx = tx * d[0] + bx * d[1] + nx * d[2], dy = ty * d[0] + by * d[1] + ny * d[2], dz = tz * d[0] + bz * d[1] + nz * d[2];
      pass++;
      let best = reach;
      for (let s = 0; s <= reach; s += cellSize * 0.5) {
        const cx = Math.floor((ox + dx * s - lo[0]) / cellSize), cy = Math.floor((oy + dy * s - lo[1]) / cellSize), cz = Math.floor((oz + dz * s - lo[2]) / cellSize);
        const list = cells.get(key(cx, cy, cz));
        if (!list) continue;
        for (const t of list) {
          if (stamp[t] === pass) continue;
          stamp[t] = pass;
          const o = t * 9;
          const e1x = P[o + 3] - P[o], e1y = P[o + 4] - P[o + 1], e1z = P[o + 5] - P[o + 2];
          const e2x = P[o + 6] - P[o], e2y = P[o + 7] - P[o + 1], e2z = P[o + 8] - P[o + 2];
          const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x;
          const det = e1x * hx + e1y * hy + e1z * hz;
          if (Math.abs(det) < 1e-9) continue;
          const f = 1 / det, sx = ox - P[o], sy = oy - P[o + 1], sz = oz - P[o + 2];
          const uu = f * (sx * hx + sy * hy + sz * hz);
          if (uu < 0 || uu > 1) continue;
          const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
          const vv = f * (dx * qx + dy * qy + dz * qz);
          if (vv < 0 || uu + vv > 1) continue;
          const tt = f * (e2x * qx + e2y * qy + e2z * qz);
          if (tt > 1e-4 && tt < best) best = tt;
        }
        if (best < reach) break;
      }
      if (best < reach) shut += 1 - (best / reach) * 0.6;
    }
    const k = value.length;
    value.push(1 - shut / RAYS);
    seen.set(id, k);
    vertexOf[v] = k;
    if (v % 600 === 0) await slice();
  }
  const out = new Float32Array(P.length / 3);
  for (let v = 0; v < out.length; v++) out[v] = value[vertexOf[v]];
  return out;
}
