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

// The shared models: the class, how many, the size they are made at (half extents, before they are broken), and
// the cell they are made with and how many triangles each keeps. The large, middling and small ones are torn rock as
// the great pieces are (./torn.mjs), more cheaply: fewer blocks, fewer scars and less rubble, each made at a size
// where the torn method's cracks are as wide, against the piece, as a great piece's. The dust is a broken block
// (./field.mjs).
export const SHARED = {
  L: { count: 5, torn: true, size: [[52, 32, 40], [60, 24, 36], [44, 38, 40], [56, 30, 34], [48, 26, 44]], blocks: [3, 2, 3, 2, 3], drop: [1, 0, 0, 1, 0], rubble: [4, 2, 3, 2, 3], scars: [1, 1, 2, 1, 1], chips: [26, 22, 28, 24, 22], steps: [1, 1, 2, 1, 1], cell: 0.6, keep: 640 },
  M: { count: 5, torn: true, size: [[48, 32, 40], [56, 24, 36], [40, 36, 40], [52, 32, 32], [44, 20, 40]], blocks: [2, 1, 2, 1, 2], drop: [0, 0, 0, 0, 0], rubble: [0, 0, 0, 0, 0], scars: [1, 0, 1, 0, 1], chips: [8, 7, 9, 7, 8], steps: [1, 1, 0, 1, 1], cell: 0.9, keep: 150 },
  S: { count: 5, torn: true, size: [[48, 32, 40], [56, 24, 36], [40, 36, 40], [52, 32, 32], [44, 20, 40]], blocks: [1, 1, 1, 1, 1], drop: [0, 0, 0, 0, 0], rubble: [0, 0, 0, 0, 0], scars: [0, 0, 0, 0, 0], chips: [3, 2, 3, 2, 3], steps: [0, 0, 0, 0, 0], cell: 1.4, keep: 44 },
  D: { count: 4, torn: false, size: [[12, 8, 10], [14, 6, 9], [10, 9, 10], [13, 7, 8]], beds: [1, 1, 1, 1], sides: [4, 5, 5, 4], corners: [2, 3, 2, 3], chips: [0, 0, 0, 0], steps: [0, 0, 0, 0], cell: 0.8, keep: 16 },
};
// A great piece: its cell, as a share of its size and at least, how many triangles it keeps (so many for each unit
// of its size, between the least and the most, and a boulder of the picture's the most), how far the reduced mesh may
// stray, as a share of its size (past the count it keeps: the count is what binds), and which carry the
// planet's outer surface.
export const GREAT = { cell: [0.0085, 0.6], keep: [85, 7000, 14500], stray: 0.015, skin: { 1: { R: 5, pits: 1 }, 3: { R: 5.5, pits: 0 } } };
// Picture 9's two boulders, each to the picture's own form, in the piece's own frame (x across the screen, y up, z
// toward the visitor), in units: the planes of the mass ([nx, ny, nz, h]), its half extents, its beds, how many
// blocks it splits into, and the way along which its edges are broken hardest. Read off ruled enlargements of the
// picture (scripts/world/grid.mjs 350,555,180,155 and 815,555,190,170).
const axis = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
const through = (n, p) => [...n, n[0] * p[0] + n[1] * p[1] + n[2] * p[2]];
const along = (u, v, k, m) => [u[0] * k + v[0] * m, u[1] * k + v[1] * m, u[2] * k + v[2] * m];
// The left: one broken wedge. Its outline, clockwise from the top left (picture 372, 580), and how far each side
// leans toward the visitor: the right flank, toward the core and the small stream beside it, is turned to be seen,
// and is layered.
const LEFT = [[-69, 56, 0.22], [13, 62, 0.35], [25, 47, 0.62], [65, -16, 0.55], [57, -37, -0.15], [2, -62, -0.2], [-45, -41, -0.1], [-66, 3, -0.05]];
const wedge = () => {
  const planes = LEFT.map(([x, y, lean], i) => {
    const [qx, qy] = LEFT[(i + 1) % LEFT.length], n = axis(-(qy - y), qx - x, 0);
    return through(axis(n[0], n[1], lean), [x, y, 0]);
  });
  planes.push(through(axis(0.08, -0.12, 1), [0, 0, 44]), through(axis(-0.12, 0.06, -1), [0, 0, -46]));
  planes.push(through(axis(-0.6, 0.55, 0.6), [-58, 50, 30]), through(axis(0.5, -0.6, 0.6), [48, -40, 30]));
  return planes;
};
// The right: a long shard, about two to one, lying from lower left to upper right, a jagged ridge along its upper
// left, its right end broken off blunt and its left end tapered.
const A = axis(0.81, 0.58, 0), W = axis(-0.58, 0.81, 0), Z = [0, 0, 1];
const shard = () => [
  through(axis(...along(W, Z, 1, 0.75)), along(W, Z, 31, 6)),
  through(axis(...along(W, Z, 1, -0.6)), along(W, Z, 31, 6)),
  through(axis(...along(W, Z, -1, 0.12)), along(W, Z, -28, 0)),
  through(axis(...along(Z, W, 1, 0.15)), [0, 0, 30]),
  through(axis(...along(Z, W, -1, -0.1)), [0, 0, -34]),
  through(axis(...along(A, Z, 1, 0.3).map((v, k) => v - 0.2 * W[k])), along(A, Z, 70, 0)),
  through(axis(...along(A, W, -1, 0.7)), along(A, W, -60, 0)),
  through(axis(...along(A, W, -1, -0.5).map((v, k) => v + 0.3 * Z[k])), along(A, W, -66, 0)),
  through(axis(...along(W, A, 0.6, 0.6).map((v, k) => v + 0.5 * Z[k])), along(W, A, 24, 44)),
];
export const BOULDERS = {
  9: { form: { planes: wedge() }, size: [70, 62, 48], layer: [0.85, 0.53, 0], blocks: 2, drop: 0, rubble: 10, scars: 3, chips: 190, steps: 2, strata: 0.006, ridge: null },
  10: { form: { planes: shard() }, size: [72, 38, 36], layer: axis(-0.3, 0.2, 1), blocks: 3, drop: 0, rubble: 8, scars: 2, chips: 220, steps: 2, strata: 0.004, ridge: W },
};
// How far round an edge is looked at for how bent it is, as a share of the model's size, and how bent is the most
// that is stored.
const BEND = { reach: 0.05, most: 3 };
// A vertex's bed tone and how fresh its break is share one stored number: sixteen steps of each.
export const packBed = (tone, fresh) => (Math.round(Math.min(1, Math.max(0, tone)) * 15) * 16 + Math.round(Math.min(1, Math.max(0, fresh)) * 15)) / 255;

const hash = (n) => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

async function one(args, cell, keep, draft, torn = false, stray = null) {
  const s = torn ? tornShape(args) : shape(args), big = Math.max(...args.size), step = draft ? cell * 1.8 : cell;
  const raw = await surface({ module: torn ? TORN : FIELD, args, box: s.box, cell: step });
  const small = await simplify(raw, { target: draft ? Math.round(keep * 0.6) : keep, error: big * (stray ?? 0.2), strict: false });
  const welded = { positions: small.positions, indices: small.indices };
  const bend = curvature(welded, big * BEND.reach);
  const m = creased(welded, torn ? 30 : 32), n = m.positions.length / 3;
  const curv = new Float32Array(n), bed = new Float32Array(n), skin = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = [m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]];
    curv[i] = 0.5 + 0.5 * Math.max(-1, Math.min(1, (bend[m.source[i]] * big) / BEND.most));
    // A bed's tone, and on a torn piece each block a little of its own; and how fresh the break is there.
    const tone = torn ? 0.62 * hash(s.bedOf(x, y, z) * 7919 + args.seed) + 0.38 * hash(s.blockOf(x, y, z) * 4513 + args.seed + 11) : hash(s.bed(x, y, z) * 7919 + args.seed);
    bed[i] = packBed(tone, torn ? s.fresh(x, y, z) : 0);
    skin[i] = s.onSkin(x, y, z) < step * 0.9 ? 1 : 0;
  }
  return { positions: m.positions, normals: m.normals, indices: m.indices, curv, bed, skin, triangles: m.indices.length / 3, flakes: s.flakes };
}

// Every model: the shared ones by class, and one for each great piece, in the piece's own frame.
export async function makeModels(pieces, draft, said) {
  const out = [];
  for (const [cls, spec] of Object.entries(SHARED)) for (let i = 0; i < spec.count; i++) {
    const seed = 1000 * (cls.charCodeAt(0) - 64) + 17 * i + 3, layer = [0.15 * (i % 2 ? 1 : -1), 1, 0.1];
    const args = spec.torn
      ? { seed, size: spec.size[i], layer, blocks: spec.blocks[i], drop: spec.drop[i], rubble: spec.rubble[i], scars: spec.scars[i], chips: spec.chips[i], steps: spec.steps[i], skin: null, top: false }
      : { seed, size: spec.size[i], beds: spec.beds[i], layer, sides: spec.sides[i], corners: spec.corners[i], chips: spec.chips[i], steps: spec.steps[i] };
    const m = await one(args, spec.cell, spec.keep, draft, spec.torn);
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
    said(`model ${cls}${i}: ${m.triangles.toLocaleString('en-US')} triangles, ${m.flakes ?? 0} flakes`);
  }
  for (const p of pieces.filter((q) => q.cls === 'G')) {
    const skin = GREAT.skin[p.family], h = (k) => hash(p.family * 977 + k), size = extents(p), big = Math.max(...size);
    const args = {
      seed: 50000 + p.family * 131, size, layer: [0.3 * (h(1) - 0.5), 1, 0.3 * (h(2) - 0.5)],
      blocks: 3 + Math.floor(h(3) * 3), drop: Math.floor(h(4) * 2), rubble: 14 + Math.floor(h(5) * 10), scars: 3 + Math.floor(h(6) * 4), chips: Math.round(big * 1.1), steps: 2,
      skin: skin ? { dir: p.outer, R: skin.R, pits: skin.pits } : null, top: Boolean(p.land),
      ...(BOULDERS[p.family] ?? {}),
    };
    const keep = BOULDERS[p.family] ? GREAT.keep[2] : Math.round(Math.min(GREAT.keep[2], Math.max(GREAT.keep[1], GREAT.keep[0] * big)));
    const m = await one(args, Math.max(GREAT.cell[1], GREAT.cell[0] * big), keep, draft, true, GREAT.stray);
    out.push({ name: `G${p.family}`, cls: 'G', shared: false, family: p.family, ...m });
    said(`model G${p.family}: ${m.triangles.toLocaleString('en-US')} triangles, ${m.flakes} flakes, ${big.toFixed(0)} units`);
  }
  return out;
}
