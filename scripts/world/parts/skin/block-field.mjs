// The crust broken at the torn edges, as a field for scripts/world/lib/surface.mjs: under 0 inside a block. Every
// block (blocks.mjs plans them) is a thick slab in a frame of its own (o, along a, across b toward the hollow, out
// n), bounded by its weathered top, a bottom, a back under the intact skin, two splits from its neighbours and a
// broken front, each face knapped: the most of a few planes, each turned a little its own way, so a face is a
// cluster of flat facets meeting at crisp ridges and never one plane. Chips are knocked out of its edges, and the
// whole is roughened by a fine grain.
//
//   setup({ blocks }) once; field(x, y, z)
import { fbm, perlin } from './field.mjs';

let B = [];
export const lip = 1.6;
export async function setup({ blocks }) { B = blocks; }

const dot3 = (x, y, z, v) => x * v[0] + y * v[1] + z * v[2];
// A knapped face: how far past it a place is. Each facet is a plane (c, a point of it, m its outward normal, in the
// block's frame) that holds round its own point of the face: a place takes the two facets nearest it across the face
// (along the face's two axes, ax) and the more cutting of them, so the facets meet at crisp ridges and no tilted
// plane runs on across the whole block to cut it away.
const P = [0, 0, 0];
function knapped(face, la, lb, ln) {
  P[0] = la; P[1] = lb; P[2] = ln;
  const [i, j] = face.ax;
  let d1 = Infinity, d2 = Infinity, k1 = 0, k2 = 0;
  for (let k = 0; k < face.planes.length; k++) {
    const c = face.planes[k].c, d = (P[i] - c[i]) ** 2 + (P[j] - c[j]) ** 2;
    if (d < d1) { d2 = d1; k2 = k1; d1 = d; k1 = k; } else if (d < d2) { d2 = d; k2 = k; }
  }
  const at = (k) => { const p = face.planes[k]; return (la - p.c[0]) * p.m[0] + (lb - p.c[1]) * p.m[1] + (ln - p.c[2]) * p.m[2]; };
  return face.planes.length > 1 ? Math.max(at(k1), at(k2)) : at(k1);
}

function block(k, x, y, z) {
  const dx = x - k.o[0], dy = y - k.o[1], dz = z - k.o[2];
  const la = dot3(dx, dy, dz, k.a), lb = dot3(dx, dy, dz, k.b), ln = dot3(dx, dy, dz, k.n);
  // Its top is the crust's old outer surface, curved as the planet is, worn into low lumps.
  const top = -(la * la + lb * lb) / (2 * k.R) + k.wear * fbm(la / 7 + k.seed, lb / 7, ln / 40, 2);
  let f = ln - top;
  f = Math.max(f, knapped(k.faces.bottom, la, lb, ln));
  f = Math.max(f, knapped(k.faces.front, la, lb, ln));
  f = Math.max(f, knapped(k.faces.back, la, lb, ln));
  f = Math.max(f, knapped(k.faces.start, la, lb, ln));
  f = Math.max(f, knapped(k.faces.end, la, lb, ln));
  // Chips knocked out of its edges: small faceted hollows, each the inside of a turned octahedron.
  for (const c of k.chips) {
    const cx = la - c.at[0], cy = lb - c.at[1], cz = ln - c.at[2];
    const u = cx * c.r[0] + cy * c.r[1] + cz * c.r[2], v = cx * c.r[3] + cy * c.r[4] + cz * c.r[5], w = cx * c.r[6] + cy * c.r[7] + cz * c.r[8];
    f = Math.max(f, (c.size - (Math.abs(u) + Math.abs(v) * 1.3 + Math.abs(w) * 0.8)) * 0.55);
  }
  // Scallops and pits: balls carved out of it, each drawn out its own way across the face.
  P[0] = la; P[1] = lb; P[2] = ln;
  for (const c of k.dish) {
    const d0 = P[c.ax[0]] - c.at[c.ax[0]], d1 = P[c.ax[1]] - c.at[c.ax[1]], reach = c.r * c.e;
    if (d0 > reach || d0 < -reach || d1 > reach || d1 < -reach) continue;
    const u = (d0 * c.cs + d1 * c.sn) / c.e, v = d1 * c.cs - d0 * c.sn;
    f = Math.max(f, c.r - Math.hypot(u, v, P[c.out] - c.at[c.out]));
  }
  // Broad swells that keep its faces from being flat planes, and a fine grain on every face.
  return f + k.lump * fbm(x / 6.5 + k.seed, y / 6.5, z / 6.5, 2) + k.grain * (fbm(x / 1.9 + k.seed, y / 1.9, z / 1.9, 2) + 0.45 * perlin(x / 0.7, y / 0.7 + k.seed, z / 0.7));
}

export function field(x, y, z) {
  let f = 6;
  for (const k of B) {
    if (x < k.lo[0] || y < k.lo[1] || z < k.lo[2] || x > k.hi[0] || y > k.hi[1] || z > k.hi[2]) continue;
    f = Math.min(f, block(k, x, y, z));
  }
  return f;
}
