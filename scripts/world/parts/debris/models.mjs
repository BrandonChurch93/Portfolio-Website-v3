// The rock models of what broke away. Each is a field (./field.mjs) made into a mesh by the surface maker, reduced
// to its share of the budget, split at its sharp edges, and given what the page reads from it: how bent each place
// is (worn bright on an edge, dark in a crease), which bed it is in, and whether it is the planet's outer surface.
// A great piece has a model of its own, made at its own size. The rest share the models of their size class, made
// at a set size and stored as a cube from -1 to 1 on each side, which each piece stretches to its own size.
import { fileURLToPath } from 'node:url';
import { surface, simplify } from '../../lib/surface.mjs';
import { creased, curvature, uncap } from '../../lib/mesh.mjs';
import { L } from '../../lib/plan.mjs';
import { extents, rotate } from './place.mjs';
import { block } from './block.mjs';
import { shape as tornShape } from './torn.mjs';

const TORN = fileURLToPath(new URL('./torn.mjs', import.meta.url));

// The shared models: the class, and for each of its models the size it is made at (half extents) and how it broke:
// how many large breaks cross it, how many flakes run in from an edge, how many corners are knocked off, and how
// many times one side drops along a riser. Each is made exactly by planes (./block.mjs), a solid chipped block whose
// faces are flat breaks, and stored as a cube from -1 to 1 on each side, which each piece stretches to its own size.
// C is what the stream carries: long thin flakes of the same stone, thick enough to have a body.
const sizes = (n, a, k) => Array.from({ length: n }, (_, i) => [a[0] * (1 + k * Math.sin(i * 2.1)), a[1] * (1 + k * Math.sin(i * 3.7 + 1)), a[2] * (1 + k * Math.sin(i * 5.3 + 2))]);
export const SHARED = {
  L: { count: 8, size: sizes(8, [52, 32, 40], 0.22), breaks: [7, 9], flakes: [5, 7], corners: [8, 11], steps: [1, 2] },
  M: { count: 10, size: sizes(10, [48, 30, 38], 0.25), breaks: [5, 7], flakes: [3, 5], corners: [5, 7], steps: [0, 1] },
  S: { count: 8, size: sizes(8, [44, 30, 36], 0.25), breaks: [4, 5], flakes: [2, 3], corners: [2, 4], steps: [0, 1] },
  D: { count: 6, size: sizes(6, [12, 8, 10], 0.25), breaks: [3, 4], flakes: [1, 1], corners: [1, 2], steps: [0, 0] },
  C: { count: 8, size: sizes(8, [40, 12, 22], 0.3), breaks: [3, 4], flakes: [1, 2], corners: [3, 4], steps: [0, 0] },
};
// A great piece: its cell, as a share of its size and at least, how many triangles it keeps (so many for each unit
// of its size, between the least and the most, and a boulder of the picture's the most), how far the reduced mesh may
// stray, as a share of its size (past the count it keeps: the count is what binds), and which carry the
// planet's outer surface.
export const GREAT = { cell: [0.0085, 0.6], keep: [44, 1700, 9800], stray: 0.006, skin: { 1: { R: 5, pits: 0 }, 3: { R: 5.5, pits: 0 } } };
// Which way the visitor is from a piece, in the world: the view is fixed, a few degrees above level.
const TOWARD = [0, Math.sin((L.VIEW.el * Math.PI) / 180), Math.cos((L.VIEW.el * Math.PI) / 180)];
// A great piece's model's name: its family's, and which of the family it is.
export const greatName = (p) => (p.part ? `G${p.family}.${p.part}` : `G${p.family}`);
// Picture 9's two boulders, each to the picture's own form, in the piece's own frame (x across the screen, y up, z
// toward the visitor), in units: craggy chunks laid inside the picture's outline of each ([x, y, z] middle and half
// extents), its beds, how many blocks it splits into, and the way along which its edges are broken hardest. Read off
// ruled enlargements of the picture (scripts/world/grid.mjs 330,540,230,170 and 800,550,220,160).
const axis = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
const through = (n, p) => [...n, n[0] * p[0] + n[1] * p[1] + n[2] * p[2]];
// The left: one broken wedge, its outline clockwise from the top left (picture 372, 580) with how far each side leans
// toward the visitor (the right flank, toward the small stream beside it, is turned to be seen), and craggy chunks
// standing out of it along that outline and across its face, so it is never a clean polygon nor a framed panel.
const OUTLINE = [[-70, 50, 0.1], [-34, 64, 0.12], [12, 57, 0.14], [42, 40, 0.2], [88, -6, 0.14], [92, -32, -0.04], [62, -56, -0.08], [4, -76, -0.1], [-46, -54, -0.06], [-72, -4, -0.04]];
const wedge = () => {
  const planes = OUTLINE.map(([x, y, lean], i) => {
    const [qx, qy] = OUTLINE[(i + 1) % OUTLINE.length], n = axis(-(qy - y), qx - x, 0);
    return through(axis(n[0], n[1], lean), [x, y, lean > 0 ? -46 : 44]);
  });
  planes.push(through(axis(0.08, -0.12, 1), [0, 0, 44]), through(axis(-0.12, 0.06, -1), [0, 0, -46]));
  planes.push(through(axis(-0.6, 0.55, 0.6), [-62, 52, 36]), through(axis(0.5, -0.6, 0.6), [52, -44, 36]));
  return planes;
};
const LEFT = [
  [-66, 52, 4, 15, 13, 26], [-22, 62, 0, 18, 10, 28], [20, 54, 10, 13, 12, 24], [50, 16, 18, 13, 16, 22], [60, -6, 16, 11, 12, 20],
  [62, -30, 12, 12, 14, 22], [40, -60, 4, 16, 14, 26], [80, -12, 10, 15, 17, 22], [74, -40, 6, 15, 13, 22], [60, 16, 14, 14, 16, 20], [-30, 58, 8, 16, 9, 24], [-12, -74, 0, 20, 12, 28], [-52, -48, -2, 14, 16, 26], [-70, 18, -4, 10, 20, 24],
  [-34, 26, 36, 22, 18, 15], [6, 16, 40, 24, 20, 14], [36, -14, 34, 18, 22, 16], [-20, -24, 38, 22, 18, 14], [12, -46, 32, 20, 16, 16], [-46, -8, 32, 16, 20, 14],
]
// The right: a thick wedge, its body heavy chunks filling the picture's outline (838 to 968 across, 572 to 692 down),
// and along its upper left side, toward the core, a row of smaller ones standing proud: the torn lip that burns in the
// picture. In units from the picture's middle of it (903, 632), x across and y up.
const W = axis(-0.48, 0.88, 0);
const RIGHT = [
  [-48, -36, 0, 26, 26, 40], [-10, -34, 2, 30, 28, 42], [30, -20, 0, 30, 30, 40], [56, 12, -2, 20, 30, 36], [16, 18, 2, 30, 28, 42],
  [-28, -2, 4, 28, 24, 40], [-58, -14, 0, 18, 22, 34], [42, 46, 0, 16, 16, 30], [62, -26, 0, 14, 18, 30],
  [-64, 2, 6, 11, 10, 22], [-40, 18, 8, 13, 11, 24], [-14, 32, 6, 12, 10, 22], [12, 44, 6, 13, 11, 22], [34, 56, 4, 11, 10, 20],
];
export const BOULDERS = {
  9: { form: { planes: wedge() }, lumps: LEFT, size: [82, 62, 48], layer: [0.08, -0.12, 1], blocks: 1, drop: 0, rubble: 4, chips: 110, steps: 6, strata: 0, ridge: [0.82, -0.3, 0.48], every: 0.24 },
  10: { lumps: RIGHT, size: [74, 67, 44], layer: axis(-0.3, 0.2, 1), blocks: 1, drop: 0, rubble: 4, chips: 130, steps: 3, strata: 0, ridge: W, every: 0.2, crest: 1.6 },
};
// How far round an edge is looked at for how bent it is, as a share of the model's size, and how bent is the most
// that is stored.
const BEND = { reach: 0.05, most: 3 };
// The least height a triangle of a great piece keeps, as a share of its longest edge.
const SLIVER = 0.06;
// Where two faces of a great piece meet at more than this, in degrees, the edge is sharp: its faces break into broad
// planes meeting at low angles, and smoothed across those they shaded as soft fans.
const CREASE = 7;
// A vertex's bed tone and how fresh its break is share one stored number: sixteen steps of each.
export const packBed = (tone, fresh) => (Math.round(Math.min(1, Math.max(0, tone)) * 15) * 16 + Math.round(Math.min(1, Math.max(0, fresh)) * 15)) / 255;

const hash = (n) => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

async function one(args, cell, keep, draft, stray) {
  const s = tornShape(args), big = Math.max(...args.size), step = draft ? cell * 1.8 : cell;
  const raw = await surface({ module: TORN, args, box: s.box, cell: step });
  const small = await simplify(raw, { target: draft ? Math.round(keep * 0.6) : keep, error: big * stray, strict: false });
  const welded = { positions: small.positions, indices: small.indices };
  // A long thin triangle left by the reducing is flipped away: a little off the face, its own normal turned far from
  // the face's, and it drew a dark spoke across it.
  uncap(welded, SLIVER);
  const bend = curvature(welded, big * BEND.reach);
  const m = creased(welded, CREASE), n = m.positions.length / 3;
  const curv = new Float32Array(n), bed = new Float32Array(n), skin = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = [m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]];
    curv[i] = 0.5 + 0.5 * Math.max(-1, Math.min(1, (bend[m.source[i]] * big) / BEND.most));
    // A bed's tone, and on a torn piece each block a little of its own; and how fresh the break is there.
    const tone = 0.62 * hash(s.bedOf(x, y, z) * 7919 + args.seed) + 0.38 * hash(s.blockOf(x, y, z) * 4513 + args.seed + 11);
    bed[i] = packBed(tone, s.fresh(x, y, z));
    skin[i] = s.onSkin(x, y, z) < step * 0.9 ? 1 : 0;
  }
  return { positions: m.positions, normals: m.normals, indices: m.indices, curv, bed, skin, triangles: m.indices.length / 3, flakes: s.flakes };
}

// Every model: the shared ones by class, and one for each great piece, in the piece's own frame.
export async function makeModels(pieces, draft, said) {
  const out = [];
  for (const [cls, spec] of Object.entries(SHARED)) for (let i = 0; i < spec.count; i++) {
    const seed = 1000 * (cls.charCodeAt(0) - 64) + 17 * i + 3, pick = ([lo, hi], k) => lo + Math.floor(hash(seed * 31 + k) * (hi - lo + 1));
    const b = block({ seed, size: spec.size[i], breaks: pick(spec.breaks, 1), flakes: pick(spec.flakes, 2), corners: pick(spec.corners, 3), steps: pick(spec.steps, 4) });
    const n0 = b.positions.length / 3, bed = new Float32Array(n0);
    for (let v = 0; v < n0; v++) bed[v] = packBed(0.25 + 0.5 * b.tone[v], b.fresh[v]);
    const m = { positions: b.positions, normals: b.normals, indices: b.indices, curv: new Float32Array(n0).fill(0.5), bed, skin: new Float32Array(n0), triangles: b.indices.length / 3, flakes: pick(spec.flakes, 2) };
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
    const id = p.family * 7 + (p.part ?? 0), skin = p.part ? null : GREAT.skin[p.family], h = (k) => hash(id * 977 + k), size = extents(p), big = Math.max(...size);
    const q = p.quat, view = rotate([-q[0], -q[1], -q[2], q[3]], TOWARD);
    const args = {
      seed: 50000 + id * 131, size, layer: [0.3 * (h(1) - 0.5), 1, 0.3 * (h(2) - 0.5)],
      blocks: 2 + Math.floor(h(3) * 2), drop: 0, rubble: 2 + Math.floor(h(5) * 3), chips: Math.round(big * 0.7), steps: 9,
      skin: skin ? { dir: p.outer, R: skin.R, pits: skin.pits } : null, view,
      ...(p.part ? {} : BOULDERS[p.family] ?? {}),
    };
    const keep = BOULDERS[p.family] && !p.part ? GREAT.keep[2] : Math.round(Math.min(GREAT.keep[2], Math.max(GREAT.keep[1], GREAT.keep[0] * big)));
    const m = await one(args, Math.max(GREAT.cell[1], GREAT.cell[0] * big), keep, draft, GREAT.stray);
    out.push({ name: greatName(p), cls: 'G', shared: false, family: p.family, ...m });
    said(`model ${greatName(p)}: ${m.triangles.toLocaleString('en-US')} triangles, ${m.flakes} flakes, ${big.toFixed(0)} units`);
  }
  return out;
}
