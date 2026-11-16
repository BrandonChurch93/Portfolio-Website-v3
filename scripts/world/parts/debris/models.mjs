// The rock models of what broke away. Each is a field (./field.mjs) made into a mesh by the surface maker, reduced
// to its share of the budget, split at its sharp edges, and given what the page reads from it: how bent each place
// is (worn bright on an edge, dark in a crease), which bed it is in, and whether it is the planet's outer surface.
// A great piece has a model of its own, made at its own size. The rest share the models of their size class, made
// at a set size and stored as a cube from -1 to 1 on each side, which each piece stretches to its own size.
import { fileURLToPath } from 'node:url';
import { surface, simplify } from '../../lib/surface.mjs';
import { creased, curvature } from '../../lib/mesh.mjs';
import { extents } from './place.mjs';
import { shape } from './field.mjs';
import { shape as tornShape } from './torn.mjs';

const FIELD = fileURLToPath(new URL('./field.mjs', import.meta.url)), TORN = fileURLToPath(new URL('./torn.mjs', import.meta.url));

// The shared models: the class, how many, the size they are made at (half extents, before they are cut), how many
// beds, corners broken off and chips taken out, the cell they are made with, and how many triangles each keeps.
export const SHARED = {
  L: { count: 4, size: [[13, 8, 10], [15, 6, 9], [11, 9.5, 10], [14, 7.5, 8.5]], beds: [2, 1, 2, 1], sides: [6, 7, 5, 7], corners: [4, 5, 4, 6], chips: [14, 12, 16, 14], steps: [1, 1, 2, 1], cell: 0.2, keep: 1500 },
  M: { count: 5, size: [[12, 8, 10], [14, 6, 9], [10, 9, 10], [13, 8, 8], [11, 5, 10]], beds: [2, 1, 1, 2, 1], sides: [5, 6, 7, 5, 6], corners: [4, 3, 5, 4, 3], chips: [8, 6, 9, 7, 8], steps: [1, 0, 1, 0, 1], cell: 0.3, keep: 400 },
  S: { count: 5, size: [[12, 8, 10], [14, 6, 9], [10, 9, 10], [13, 8, 8], [11, 5, 10]], beds: [1, 1, 1, 1, 1], sides: [5, 6, 5, 6, 5], corners: [3, 4, 3, 4, 3], chips: [3, 2, 4, 3, 2], steps: [0, 0, 0, 0, 0], cell: 0.45, keep: 120 },
  D: { count: 4, size: [[12, 8, 10], [14, 6, 9], [10, 9, 10], [13, 7, 8]], beds: [1, 1, 1, 1], sides: [4, 5, 5, 4], corners: [2, 3, 2, 3], chips: [0, 0, 0, 0], steps: [0, 0, 0, 0], cell: 0.8, keep: 30 },
};
// A great piece: the cell it is made with, how many triangles it keeps, and which carry the planet's outer surface.
export const GREAT = { cell: 0.75, keep: 12500, skin: { 1: { R: 5, pits: 1 }, 3: { R: 5.5, pits: 0 } } };
// How far round an edge is looked at for how bent it is, as a share of the model's size, and how bent is the most
// that is stored.
const BEND = { reach: 0.05, most: 3 };

const hash = (n) => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

async function one(args, cell, keep, draft, torn = false) {
  const s = torn ? tornShape(args) : shape(args), big = Math.max(...args.size), step = draft ? cell * 1.8 : cell;
  const raw = await surface({ module: torn ? TORN : FIELD, args, box: s.box, cell: step });
  const small = await simplify(raw, { target: draft ? Math.round(keep * 0.6) : keep, error: big * (torn ? 0.008 : 0.02), strict: false });
  const welded = { positions: small.positions, indices: small.indices };
  const bend = curvature(welded, big * BEND.reach);
  const m = creased(welded, torn ? 28 : 32), n = m.positions.length / 3;
  const curv = new Float32Array(n), bed = new Float32Array(n), skin = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = [m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]];
    curv[i] = 0.5 + 0.5 * Math.max(-1, Math.min(1, (bend[m.source[i]] * big) / BEND.most));
    // A bed's tone, and on a torn piece each block a little of its own, and the rubble caught on it fresher.
    bed[i] = torn
      ? Math.min(1, 0.62 * hash(s.bedOf(x, y, z) * 7919 + args.seed) + 0.38 * hash(s.blockOf(x, y, z) * 4513 + args.seed + 11) + (s.isRubble(x, y, z) ? 0.25 : 0))
      : hash(s.bed(x, y, z) * 7919 + args.seed);
    skin[i] = s.onSkin(x, y, z) < step * 0.9 ? 1 : 0;
  }
  return { positions: m.positions, normals: m.normals, indices: m.indices, curv, bed, skin, triangles: m.indices.length / 3 };
}

// Every model: the shared ones by class, and one for each great piece, in the piece's own frame.
export async function makeModels(pieces, draft, said) {
  const out = [];
  for (const [cls, spec] of Object.entries(SHARED)) for (let i = 0; i < spec.count; i++) {
    const args = { seed: 1000 * (cls.charCodeAt(0) - 64) + 17 * i + 3, size: spec.size[i], beds: spec.beds[i], layer: [0.15 * (i % 2 ? 1 : -1), 1, 0.1], sides: spec.sides[i], corners: spec.corners[i], chips: spec.chips[i], steps: spec.steps[i] };
    const m = await one(args, spec.cell, spec.keep, draft);
    // Stored as a cube from -1 to 1, which each piece stretches to its own size: a normal is stretched the other way.
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], n = m.positions.length / 3;
    for (let v = 0; v < n; v++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], m.positions[v * 3 + k]); hi[k] = Math.max(hi[k], m.positions[v * 3 + k]); }
    const mid = lo.map((v, k) => (v + hi[k]) / 2), half = lo.map((v, k) => (hi[k] - v) / 2);
    for (let v = 0; v < n; v++) {
      for (let k = 0; k < 3; k++) { m.positions[v * 3 + k] = (m.positions[v * 3 + k] - mid[k]) / half[k]; m.normals[v * 3 + k] *= half[k]; }
      const l = Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) || 1;
      for (let k = 0; k < 3; k++) m.normals[v * 3 + k] /= l;
    }
    out.push({ name: `${cls}${i}`, cls, shared: true, ...m });
    said(`model ${cls}${i}: ${m.triangles.toLocaleString('en-US')} triangles`);
  }
  for (const p of pieces.filter((q) => q.cls === 'G')) {
    const skin = GREAT.skin[p.family], h = (k) => hash(p.family * 977 + k);
    const args = {
      seed: 50000 + p.family * 131, size: extents(p), layer: [0.3 * (h(1) - 0.5), 1, 0.3 * (h(2) - 0.5)],
      blocks: 6 + Math.floor(h(3) * 4), drop: 1 + Math.floor(h(4) * 2), rubble: 10 + Math.floor(h(5) * 8), scars: 9 + Math.floor(h(6) * 6),
      skin: skin ? { dir: p.outer, R: skin.R, pits: skin.pits } : null, top: Boolean(p.land),
    };
    const m = await one(args, GREAT.cell * Math.max(0.7, p.r / 60), GREAT.keep, draft, true);
    out.push({ name: `G${p.family}`, cls: 'G', shared: false, family: p.family, ...m });
    said(`model G${p.family}: ${m.triangles.toLocaleString('en-US')} triangles`);
  }
  return out;
}
