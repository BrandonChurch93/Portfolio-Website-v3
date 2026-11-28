// The slice's stone itself, at a place on a face: its color under white light, and the relief of its surface as a
// turned normal. The ray caster asks for it at every ray of every pixel, so the stone is as fine as the screen.
// It is layered along each block's own bedding (bands of color and, where a face cuts across the layers, their ledges),
// mottled and grained. A face is not flat: it swells, thin leaves of it stand a step proud of the rest with ragged
// outlines, and short gouges score it, all running one way. Nothing here is a picture: all of it is worked out from
// where the place is. It has no pits: pits of one size, spread evenly, showed as a pattern of dots on every face.
// With flat faces the blocks read as cut card, however they were lit.
//
//   stone(x, y, z, nx, ny, nz, T, row, tag, out)
//     T, row   the blocks' table and where this block's line starts: bed (3), tint, seed, kind, how far set back
//     tag      what kind of face it is (./blocks.mjs, ./chip.mjs)
//     out      [r, g, b, nx, ny, nz]: its color under white light (linear), and its normal with the relief
//
// What each number is for is said where it is used.
function hash(i, j, k, s) {
  let h = (Math.imul(i, 0x27d4eb2d) + Math.imul(j, 0x165667b1) + Math.imul(k, 0x9e3779b1) + Math.imul(s, 0x85ebca6b)) | 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
// Smooth noise, 0 to 1.
export function noise(x, y, z, s) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  let u = x - i, v = y - j, w = z - k;
  u = u * u * u * (u * (u * 6 - 15) + 10); v = v * v * v * (v * (v * 6 - 15) + 10); w = w * w * w * (w * (w * 6 - 15) + 10);
  const a = hash(i, j, k, s), b = hash(i + 1, j, k, s), c = hash(i, j + 1, k, s), d = hash(i + 1, j + 1, k, s);
  const e = hash(i, j, k + 1, s), f = hash(i + 1, j, k + 1, s), g = hash(i, j + 1, k + 1, s), h = hash(i + 1, j + 1, k + 1, s);
  const p = a + (b - a) * u, q = c + (d - c) * u, r = e + (f - e) * u, t = g + (h - g) * u;
  const m = p + (q - p) * v, n = r + (t - r) * v;
  return m + (n - m) * w;
}

// The stone under white light: a pale tan, and what it goes toward where it is redder (iron) and where it is paler.
export const STONE = { tan: [0.5, 0.36, 0.265], red: [0.47, 0.25, 0.15], pale: [0.58, 0.47, 0.37] };
// Its layers: how thick the broad ones and the fine ones are along the bedding, in units, and how much they change it.
// `across`: how far across the layers a face must cut (0 along them, 1 square across) for their ledges to start
// to show, and to show in full.
const LAYER = { broad: 8.5, fine: 2.4, by: [0.3, 0.14], ledge: 3.1, rise: 0.42, across: [0.5, 0.9] };
// Its relief, in units: a slow swell, a finer one, and grain.
const RELIEF = { swell: [16, 1.2], fine: [4.2, 0.15], grain: [0.75, 0.05], step: 0.22, strength: 1 };
// Leaves: thin sheets of a face that stand a step proud of the rest. For the broad ones and the small ones: how far
// across one is, how high its step, and how wide the step's slope is, as a share of the field that draws it.
// `rag` is what breaks a leaf's outline, twice over: how far across, and by how much. `tint`: how much paler a leaf is.
const LEAF = { broad: [34, 1.2, 0.035], small: [15, 0.5, 0.05], rag: [9, 0.35, 3.1, 0.08], tint: 0.1 };
// Gouges: short scores that all run one way across a face. Long ones and short ones, each how long and how wide.
// `deep`: how deep. `bend`: over how far they bend from straight, and by how much. `patch`: they come in patches, so
// far across, between these two shares of the field that places them. `from`: the share of its own field at which a
// long one starts and is full, then a short one. `dark`: how much darker the stone is in one.
const GOUGE = { long: [22, 3.2], short: [8, 2.1], deep: 0.7, bend: [23, 3], patch: [45, 0.38, 0.6], from: [0.72, 0.8, 0.76, 0.84], dark: 0.45 };

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Two ways that lie in the face, for the gouges to run along: the line of its layers where it cuts across them, and
// where it lies along them a way of the block's own.
function ways(nx, ny, nz, bx, by, bz, seed, F) {
  let dx = bx, dy = by, dz = bz, tx = 0, ty = 0, tz = 0, l = 0;
  for (let k = 0; k < 3 && l < 0.3; k++) {
    if (k) { const th = seed * 2.399 + k * 1.571; dx = Math.cos(th); dy = 0.35; dz = Math.sin(th); }
    tx = dy * nz - dz * ny; ty = dz * nx - dx * nz; tz = dx * ny - dy * nx;
    l = Math.hypot(tx, ty, tz);
  }
  tx /= l || 1; ty /= l || 1; tz /= l || 1;
  F[0] = tx; F[1] = ty; F[2] = tz;
  F[3] = ny * tz - nz * ty; F[4] = nz * tx - nx * tz; F[5] = nx * ty - ny * tx;
}

// How high the face stands at a place. With `more`, it also says how far into a gouge the place is and how far onto
// a broad leaf and a small one.
function height(x, y, z, s, cross, seed, F, more) {
  const swell = (noise(x / RELIEF.swell[0], y / RELIEF.swell[0], z / RELIEF.swell[0], 31) - 0.5) * RELIEF.swell[1] + (noise(x / RELIEF.fine[0], y / RELIEF.fine[0], z / RELIEF.fine[0], 37) - 0.5) * RELIEF.fine[1];
  const grain = (noise(x / RELIEF.grain[0], y / RELIEF.grain[0], z / RELIEF.grain[0], 41) - 0.5) * RELIEF.grain[1];
  // Where the face cuts across the layers, each layer's edge stands out a little from the one under it.
  const t = s / LAYER.ledge, i = Math.floor(t), f = t - i, strong = hash(i, seed | 0, 7, 47), e = f > 0.72 ? (f - 0.72) / 0.28 : f < 0.12 ? 1 - f / 0.12 : 0;
  // Only where it cuts well across them: on a face that lies near the layers their edges were rings, like wood.
  const k = Math.min(1, Math.max(0, (cross - LAYER.across[0]) / (LAYER.across[1] - LAYER.across[0])));
  const ledge = k * k * (3 - 2 * k) * cross * LAYER.rise * strong * strong * (1 - e * e * (3 - 2 * e));
  // The leaves: each kind from a field of its own, so one's outline does not follow the other's as rings would.
  const A = LEAF.broad, B = LEAF.small, G = LEAF.rag;
  const la = smooth(0.5 - A[2], 0.5 + A[2], noise(x / A[0], y / A[0], z / A[0], 61) + G[1] * (noise(x / G[0], y / G[0], z / G[0], 62) - 0.5) + G[3] * (noise(x / G[2], y / G[2], z / G[2], 63) - 0.5));
  const lb = smooth(0.52 - B[2], 0.52 + B[2], noise(x / B[0], y / B[0], z / B[0], 64) + 0.3 * (noise(x / 5, y / 5, z / 5, 65) - 0.5));
  // The gouges, along the face's own way.
  const a = x * F[0] + y * F[1] + z * F[2], c0 = x * F[3] + y * F[4] + z * F[5], c = c0 + (noise(a / GOUGE.bend[0], c0 / GOUGE.bend[0], 7.5, 69) - 0.5) * GOUGE.bend[1];
  const patch = smooth(GOUGE.patch[1], GOUGE.patch[2], noise(x / GOUGE.patch[0], y / GOUGE.patch[0], z / GOUGE.patch[0], 67));
  const gouge = patch > 0 ? patch * Math.max(smooth(GOUGE.from[0], GOUGE.from[1], noise(a / GOUGE.long[0], c / GOUGE.long[1], 0.5, 66)), 0.8 * smooth(GOUGE.from[2], GOUGE.from[3], noise(a / GOUGE.short[0], c / GOUGE.short[1], 3.5, 68))) : 0;
  if (more) { more[0] = gouge; more[1] = la; more[2] = lb; }
  return swell + grain + ledge + A[1] * la + B[1] * lb - GOUGE.deep * gouge;
}

const F = new Float64Array(6), MORE = new Float64Array(3);

export function stone(x, y, z, nx, ny, nz, T, row, tag, out) {
  const bx = T[row], by = T[row + 1], bz = T[row + 2], tint = T[row + 3], seed = T[row + 4], back = T[row + 6];
  const warp = (noise(x / 26, y / 26, z / 26, 5) - 0.5) * 2;
  const s = x * bx + y * by + z * bz + warp * 4.5, cross = 1 - Math.abs(nx * bx + ny * by + nz * bz);
  const broad = noise(s / LAYER.broad, seed * 0.37, 0.5, 11) - 0.5, fine = noise(s / LAYER.fine, seed * 0.71, 3.3, 13) - 0.5;
  // On a face that lies along the layers a band shows as rings, like the grain of wood: there it is nearly gone.
  const band = (broad * LAYER.by[0] + fine * LAYER.by[1]) * (0.12 + 0.88 * cross);
  const mottle = (noise(x / 34, y / 34, z / 34, 17) - 0.5) * 0.3 + (noise(x / 9.5, y / 9.5, z / 9.5, 19) - 0.5) * 0.16;
  const grain = (noise(x / 0.85, y / 0.85, z / 0.85, 23) - 0.5) * 0.08 + (noise(x / 2.6, y / 2.6, z / 2.6, 29) - 0.5) * 0.09;
  // How red or pale it is here: its block's own lean, the broad layers, and a slow drift.
  const hue = (tint - 0.5) * 1.1 + broad * 1.5 * (0.12 + 0.88 * cross) + (noise(x / 58, y / 58, z / 58, 53) - 0.5) * 1.3;
  const toRed = hue > 0 ? Math.min(1, hue) * 0.75 : 0, toPale = hue < 0 ? Math.min(1, -hue) * 0.75 : 0;
  // A face broken back from the block's own is fresher: a little paler.
  ways(nx, ny, nz, bx, by, bz, seed, F);
  const e = RELIEF.step, h0 = height(x, y, z, s, cross, seed, F, MORE);
  // A face broken back from the block's own is fresher: a little paler. So is a leaf, and a gouge is darker.
  const v = (1 + band + mottle + grain) * (0.9 + (tint - 0.5) * 0.24) * (back > 0 ? 1.05 : 1) * (1 - GOUGE.dark * MORE[0]) * (1 + LEAF.tint * (MORE[1] - 0.5 + 0.6 * (MORE[2] - 0.5)));
  for (let k = 0; k < 3; k++) out[k] = Math.max(0.02, (STONE.tan[k] + (STONE.red[k] - STONE.tan[k]) * toRed + (STONE.pale[k] - STONE.tan[k]) * toPale) * v);
  let gx = (height(x + e, y, z, s + e * bx, cross, seed, F) - h0) / e, gy = (height(x, y + e, z, s + e * by, cross, seed, F) - h0) / e, gz = (height(x, y, z + e, s + e * bz, cross, seed, F) - h0) / e;
  const along = gx * nx + gy * ny + gz * nz;
  gx -= along * nx; gy -= along * ny; gz -= along * nz;
  let mx = nx - gx * RELIEF.strength, my = ny - gy * RELIEF.strength, mz = nz - gz * RELIEF.strength;
  const l = Math.hypot(mx, my, mz) || 1;
  out[3] = mx / l; out[4] = my / l; out[5] = mz / l;
  // In a low place and under a ledge the stone is darker: what lies there, and what light does not reach.
  if (h0 < -0.25) { const k = Math.max(0.72, 1 + (h0 + 0.25) * 0.5); out[0] *= k; out[1] *= k; out[2] *= k; }
}
