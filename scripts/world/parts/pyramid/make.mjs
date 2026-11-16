// Makes the pyramid (src/pieces/world/parts/pyramid.ts) and writes public/world/pyramid.bin.
//
//   node scripts/world/parts/pyramid/make.mjs           the shipped file
//   node scripts/world/parts/pyramid/make.mjs --draft   fast, with fewer samples in the bake
//
// Every piece is a convex solid, the intersection of half spaces (polytope.mjs): the body, which runs on under the
// ground, the foot course round it with its bevelled top, the neck in the reveal, and the capstone. Its edges are crisp: they are rounded in the shader. Each face is
// cut into rows and filled, finer at the foot and the reveal, and how open each vertex is to the night is baked in
// the world's own frame, with the land round it there to shut it in. The mesh is stored in the pyramid's own frame:
// its foot on the ground, turned and as tall as the plan has it (L.PYRAMID), its axis straight out from the dome
// (standing() in form.ts).
import process from 'node:process';
import { bake } from '../../lib/bake.mjs';
import { pack } from '../../lib/pack.mjs';
import { L, light, linear, storeBounce } from '../../lib/plan.mjs';
import { FORM, standing } from '../../../../src/pieces/world/parts/pyramid/form.ts';
import { polytope, fill, mend, plane } from './polytope.mjs';

const draft = process.argv.includes('--draft');
const OUT = 'public/world/pyramid.bin';
const { base, tall, turn } = L.PYRAMID, half = base / 2, from = FORM.cap.from, reveal = FORM.cap.reveal;

// The four sides, outward, each by its horizontal direction.
const SIDES = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const sideFaces = SIDES.map(([dx, dz]) => ({ ...plane([dx * tall, half, dz * tall], [0, tall, 0]), tag: 'face' }));
const flat = (n, d, tag) => ({ n, d, tag });

// The body stops a little inside the foot course, which runs on under the ground in its place.
const UP = flat([0, 1, 0], from, 'top'), DOWN = flat([0, -1, 0], FORM.sink, 'foot');
const body = polytope([...sideFaces, UP, flat([0, -1, 0], -(FORM.foot.tall - 1), 'foot')], 'body');

// The foot course: the faces stood out by FORM.foot.proud, cut level at its top, with the top edge bevelled halfway
// between the face and level.
const { tall: footTall, proud, bevel } = FORM.foot;
const plinthFaces = sideFaces.map((p) => ({ ...p, d: p.d + proud, tag: 'plinth' }));
const bevels = plinthFaces.map((p) => {
  const l = Math.hypot(p.n[0], p.n[1] + 1, p.n[2]), n = [p.n[0] / l, (p.n[1] + 1) / l, p.n[2] / l];
  const h = Math.hypot(p.n[0], p.n[2]), out = (p.d - p.n[1] * footTall) / h, corner = [(p.n[0] / h) * out, footTall, (p.n[2] / h) * out];
  return { n, d: n[0] * corner[0] + n[1] * corner[1] + n[2] * corner[2] - bevel, tag: 'bevel' };
});
const plinth = polytope([...plinthFaces, ...bevels, flat([0, 1, 0], footTall, 'ledge'), DOWN], 'plinth');

// The neck is set back from the capstone's foot, so nothing of it stands out past the capstone's faces.
const neckHalf = half * (1 - (from + reveal) / tall) - FORM.cap.inset;
const neck = polytope([
  flat([1, 0, 0], neckHalf, 'neck'), flat([-1, 0, 0], neckHalf, 'neck'), flat([0, 0, 1], neckHalf, 'neck'), flat([0, 0, -1], neckHalf, 'neck'),
  flat([0, 1, 0], from + reveal + 0.3, 'hidden'), flat([0, -1, 0], -(from - 0.3), 'hidden'),
], 'neck');

const CAPFOOT = flat([0, -1, 0], -(from + reveal), 'under');
const cap = polytope([...sideFaces, CAPFOOT], 'cap');

// How far apart vertices are along a row: fine at the foot, where it meets the ground, and coarse up the faces and
// on the two faces never seen (the view never moves).
const unseen = (n) => n[0] > 0.5 || n[2] < -0.5;
function spacing(p, n, tag) {
  if (tag === 'ledge') return 30;
  let h = tag === 'face' ? Math.min(6, 1.1 + 0.07 * Math.max(0, p[1])) : tag === 'plinth' ? 2.2 : 3;
  if (unseen(n)) h *= 3;
  return draft ? h * 1.6 : h;
}
// Upright rows: fine at the foot and at the reveal.
const rows = [];
for (let y = -FORM.sink; y < 0; y += 1) rows.push(y);
for (let y = 0, s = 0.5; y < tall; y += s, s = Math.min(4, 0.5 + 0.06 * y)) rows.push(y);
for (let y = from - 2; y < from + reveal + 2; y += 0.3) rows.push(y);
rows.push(tall);

// Which piece a vertex is of, stored for the shader (light.w): the body, the foot course's faces, its bevel and
// ledge, the neck in the reveal, the capstone. The shader reads the same numbers (KIND in shaders.ts).
const KIND = { body: 0, plinth: 0.2, bevel: 0.3, neck: 0.5, cap: 1 };
const kind = (name, tag) => (name === 'plinth' && tag !== 'plinth' ? KIND.bevel : KIND[name]);
const gold = mend(fill([body, plinth, neck, cap], { rows, flatRows: [], spacing, skip: (tag) => tag === 'hidden' || tag === 'foot', kind }));

// The pyramid's frame to the world's: its foot on the ground under its middle, its axes as standing() gives them.
const foot = L.ground(L.PYRAMID.x, L.PYRAMID.z), ax = standing(L.PYRAMID.x, L.PYRAMID.z, L.WORLD.top, turn);
const toWorld = (m) => {
  const p = new Float32Array(m.positions.length), n = new Float32Array(m.normals.length);
  const put = (out, i, a, b, c, at) => { for (let k = 0; k < 3; k++) out[i + k] = at[k] + a * ax.x[k] + b * ax.y[k] + c * ax.z[k]; };
  for (let i = 0; i < p.length; i += 3) {
    put(p, i, m.positions[i], m.positions[i + 1], m.positions[i + 2], [L.PYRAMID.x, foot, L.PYRAMID.z]);
    put(n, i, m.normals[i], m.normals[i + 1], m.normals[i + 2], [0, 0, 0]);
  }
  return { positions: p, normals: n, indices: m.indices };
};

// The land round it, as the plan has it, to shut in its foot and give back light. It is not stored: the land is its
// own part.
function land() {
  const S = 300, step = draft ? 8 : 5, n = Math.ceil((2 * S) / step), pos = [], nor = [], idx = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const x = L.PYRAMID.x - S + i * step, z = L.PYRAMID.z - S + j * step, y = L.ground(x, z), e = 0.5;
    const gx = (L.ground(x + e, z) - L.ground(x - e, z)) / (2 * e), gz = (L.ground(x, z + e) - L.ground(x, z - e)) / (2 * e), l = Math.hypot(gx, 1, gz);
    pos.push(x, y, z); nor.push(-gx / l, 1 / l, -gz / l);
  }
  const keep = (i, j) => L.within(L.PYRAMID.x - S + i * step, L.PYRAMID.z - S + j * step) > -4;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (!keep(i, j) || !keep(i + 1, j) || !keep(i, j + 1) || !keep(i + 1, j + 1)) continue;
    const a = j * (n + 1) + i, b = a + 1, d = a + n + 1, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  return { positions: Float32Array.from(pos), normals: Float32Array.from(nor), indices: Uint32Array.from(idx) };
}

// What each thing gives back of the light on it, as a plain diffuse share. The gold's is its color at a little over
// half: polished, much of what it returns goes one way and not all round.
const ALBEDO = { gold: linear('hot').map((v) => v * 0.55), land: linear('text-3').map((v) => v * 0.12) };

const L0 = light();
const gw = toWorld(gold), lw = land();
const t0 = performance.now();
const out = await bake({
  meshes: [
    { name: 'gold', ...gw, albedo: ALBEDO.gold, receive: true },
    { name: 'land', ...lw, albedo: ALBEDO.land, receive: false },
  ],
  moon: L0.moon,
  core: null,
  sky: L0.sky,
}, { samples: draft ? { core: 1, moon: 8, hemi: 96 } : { core: 1, moon: 32, hemi: 640 }, bounces: 2, reach: 260, seed: 7 });
console.log(`bake: ${((performance.now() - t0) / 1000).toFixed(1)} s`);

// The sheet under its shade (src/pieces/world/parts/pyramid/shade.ts): over the ground round its foot and along the
// first stretch of its shadow from the moon, which falls toward the visitor and to the left, draped on the plan's
// ground and stored in the world's units. The court inside the foot is left out.
function sheet() {
  const S = FORM.shade, out = half + FORM.foot.proud, r = out + S.reach;
  const dot = (a, v) => a[0] * v[0] + a[1] * v[1] + a[2] * v[2], lm = [dot(L.MOONWARD, ax.x), dot(L.MOONWARD, ax.y), dot(L.MOONWARD, ax.z)];
  const flat = Math.hypot(lm[0], lm[2]), long = (tall * flat) / Math.max(lm[1], 0.05);
  const sx = (-lm[0] / flat) * long * S.along, sz = (-lm[2] / flat) * long * S.along;
  const x0 = Math.min(-r, -r + sx), x1 = Math.max(r, r + sx), z0 = Math.min(-r, -r + sz), z1 = Math.max(r, r + sz);
  const step = draft ? S.cell * 2 : S.cell, nx = Math.ceil((x1 - x0) / step), nz = Math.ceil((z1 - z0) / step);
  const pos = [], idx = [], keep = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const lx = x0 + i * step, lz = z0 + j * step;
    const x = L.PYRAMID.x + lx * ax.x[0] + lz * ax.z[0], z = L.PYRAMID.z + lx * ax.x[2] + lz * ax.z[2];
    pos.push(x, L.ground(x, z) + S.lift, z);
    keep.push(L.within(x, z) > -2);
  }
  const inside = (i, j) => Math.abs(x0 + i * step) < out - 3 && Math.abs(z0 + j * step) < out - 3;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, d = a + nx + 1, e = d + 1;
    if (!keep[a] || !keep[b] || !keep[d] || !keep[e] || (inside(i, j) && inside(i + 1, j + 1))) continue;
    idx.push(a, d, b, b, d, e);
  }
  return { name: 'shade', positions: Float32Array.from(pos), indices: Uint32Array.from(idx), attributes: {} };
}

const b = out.gold, n = gold.positions.length / 3, lightA = new Float32Array(n * 4), bounce = new Float32Array(n * 4);
for (let i = 0; i < n; i++) {
  lightA.set([b.core[i], b.moon[i], b.open[i], gold.kind[i]], i * 4);
  bounce.set([storeBounce(b.bounce[i * 3]), storeBounce(b.bounce[i * 3 + 1]), storeBounce(b.bounce[i * 3 + 2]), 0], i * 4);
}
pack(OUT, [{ name: 'gold', positions: gold.positions, indices: gold.indices, attributes: { normal: { data: gold.normals, size: 3, as: 'i16' }, light: { data: lightA, size: 4, as: 'u8' }, bounce: { data: bounce, size: 4, as: 'u8' } } }, sheet()], { draft, foot });
