// Makes sculpt R of the rock and writes public/world/rock-r.bin: picture 9's hollow as a few heavy blocks of stone
// (round 3). The blocks take their outlines from the picture's own slabs (blocks.mjs), are made solid in the world
// (hollow.mjs), and are lit by the world's own light.
//
//   node scripts/world/parts/rock-r/see.mjs        what of the picture is the rock (previews only)
//   node scripts/world/parts/rock-r/slabs.mjs      the picture's slabs: measured/slabs.json
//   node scripts/world/parts/rock-r/make.mjs       the shipped file
//   node scripts/world/parts/rock-r/make.mjs --draft   fast and rough
//
// The steps: the field is turned into a mesh that keeps its sharp edges, each vertex is given how far it is along
// the surface from its face's nearest crease, the mesh is reduced with that kept, split at its creases, lit by the
// world's baker with the planet's shell and top blocking light, and written as `break` alone. The stored light's
// fourth number is the distance to the crease, as a share of EDGE (meta.edge, meta.edgeUnits), which the stone's
// material reads for its chipped edges.
import fs from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { L, light, storeBounce } from '../../lib/plan.mjs';
import { bake } from '../../lib/bake.mjs';
import { pack } from '../../lib/pack.mjs';
import { surface, simplify } from '../../lib/surface.mjs';
import { creased, incident } from '../../lib/mesh.mjs';
import { ALBEDO } from '../../lib/rock.mjs';
import { plan } from './blocks.mjs';
import { rubble } from './rubble.mjs';
import { buildSkin } from './build.mjs';
import { CORE_PX, VIEW } from './relief.mjs';

const draft = process.argv.includes('--draft');
const t0 = performance.now(), said = (s) => console.log(`${((performance.now() - t0) / 1000).toFixed(1)} s · ${s}`);
// The grid the field is read on, in units; the most the reduced mesh may stray, in units; the most triangles.
const CELL = draft ? 3 : 1.4, KEEP = 0.22, BUDGET = 290000;
// Faces meeting at more than this, in degrees, meet at a crease.
const CREASE = 38;
// How far from a crease the stored distance reaches, in units: past it the stone's face is clean.
export const EDGE = 16;
// The space the hollow is made in.
const BOX = [[-500, -560, -290], [450, 2, 640]];
// How far under the land's surface the rock's top stays, in units.
const UNDER = 3.5;

const module = fileURLToPath(new URL('./hollow.mjs', import.meta.url));
const args = await plan({ draft });
args.corePx = [...CORE_PX];
args.view = [...VIEW];
args.under = UNDER;
said(`plan: ${args.blocks.length} blocks`);
args.stones = await rubble(args, { draft });
said(`rubble: ${args.stones.length} stones`);

const raw = await surface({ module, args, box: BOX, cell: CELL });
said(`surface: ${(raw.indices.length / 3).toLocaleString('en-US')} triangles`);
if (process.argv.includes('--where')) {
  const H = await import('./hollow.mjs'), count = {};
  H.setup(args);
  for (let t = 0; t < raw.indices.length / 3; t += 7) {
    const c = [0, 1, 2].map((k) => (raw.positions[raw.indices[t * 3] * 3 + k] + raw.positions[raw.indices[t * 3 + 1] * 3 + k] + raw.positions[raw.indices[t * 3 + 2] * 3 + k]) / 3);
    let best = 'backing', bd = Infinity;
    for (const b of args.blocks) { const v = Math.abs(H.block(b, ...c)); if (v < bd) { bd = v; best = b.name; } }
    const [px, py] = L.pictured(...c);
    const what = Math.abs(H.sample(args.rock, px, py) * L.PICTURE.unit) < 1.2 ? 'mask wall' : bd < 1.2 ? best : 'other';
    count[what] = (count[what] ?? 0) + 7;
  }
  console.log(Object.entries(count).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
}

// How far each vertex is along the surface from the nearest crease: a crease is where the mesh, split at its creases,
// has more than one vertex at a place.
const nv = raw.positions.length / 3, split = creased(raw, CREASE), copies = new Uint8Array(nv);
for (const s of split.source) copies[s] = Math.min(255, copies[s] + 1);
const dist = new Float64Array(nv).fill(Infinity), { start, tris } = incident(raw), P = raw.positions, I = raw.indices;
const heap = [];
const push = (v, d) => { heap.push([d, v]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
for (let v = 0; v < nv; v++) if (copies[v] > 1) { dist[v] = 0; push(v, 0); }
while (heap.length) {
  const [d, v] = pop();
  if (d > dist[v] || d > EDGE) continue;
  for (let k = start[v]; k < start[v + 1]; k++) {
    const t = tris[k];
    for (let c = 0; c < 3; c++) {
      const w = I[t * 3 + c];
      if (w === v) continue;
      const nd = d + Math.hypot(P[w * 3] - P[v * 3], P[w * 3 + 1] - P[v * 3 + 1], P[w * 3 + 2] - P[v * 3 + 2]);
      if (nd < dist[w]) { dist[w] = nd; push(w, nd); }
    }
  }
}
const edge = new Float32Array(nv);
for (let v = 0; v < nv; v++) edge[v] = Math.min(1, dist[v] / EDGE);
said('distances to the creases');

const small = await simplify({ positions: raw.positions, indices: raw.indices }, { error: KEEP, target: BUDGET, attributes: edge, weights: [EDGE * 0.12] });
said(`reduced: ${(small.indices.length / 3).toLocaleString('en-US')} triangles, strays ${small.stray}`);
const brk = creased({ positions: small.positions, indices: small.indices }, CREASE);
const edgeOf = new Float32Array(brk.positions.length / 3);
for (let i = 0; i < edgeOf.length; i++) edgeOf[i] = small.attributes[brk.source[i]];

// Nothing comes nearer the core than its clearance.
let near = Infinity;
for (let i = 0; i < brk.positions.length; i += 3) near = Math.min(near, Math.hypot(brk.positions[i] - L.CORE.at[0], brk.positions[i + 1] - L.CORE.at[1], brk.positions[i + 2] - L.CORE.at[2]));
said(`nearest the core's middle: ${near.toFixed(1)} units (its radius is ${L.CORE.r})`);

const skin = buildSkin();
const samples = draft ? { core: 24, moon: 8, hemi: 48 } : { core: 64, moon: 16, hemi: 160 };
const lit = await bake({ meshes: [{ name: 'break', positions: brk.positions, indices: brk.indices, normals: brk.normals, albedo: ALBEDO, receive: true }, { name: 'skin', positions: skin.positions, indices: skin.indices, normals: skin.normals, albedo: ALBEDO, receive: false }], ...light() }, { samples, bounces: draft ? 1 : 2 });
said('lit');
{
  // What each block's face got: the share of the core it sees and the light that reaches it, on the face only.
  const H = await import('./hollow.mjs'), LT = light(), C = L.CORE.at, out = [];
  H.setup(args);
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2], CL = lum(LT.core.color), ML = lum(LT.moon.color), AL = lum(ALBEDO);
  const illum = (c, s) => (c >= s ? c : c <= -s ? 0 : ((c + s) * (c + s)) / (4 * s));
  for (const b of args.blocks) {
    let k = 0, core = 0, e = 0;
    for (let i = 0; i < brk.positions.length / 3; i += 3) {
      const p = [brk.positions[i * 3], brk.positions[i * 3 + 1], brk.positions[i * 3 + 2]], nn = [brk.normals[i * 3], brk.normals[i * 3 + 1], brk.normals[i * 3 + 2]];
      if (nn[0] * b.n[0] + nn[1] * b.n[1] + nn[2] * b.n[2] < 0.9 || Math.abs(H.block(b, ...p)) > 0.6) continue;
      const d = Math.hypot(C[0] - p[0], C[1] - p[1], C[2] - p[2]), l = [(C[0] - p[0]) / d, (C[1] - p[1]) / d, (C[2] - p[2]) / d];
      const E = CL * lit.break.core[i] * (L.CORE.r / d) ** LT.core.fall * illum(nn[0] * l[0] + nn[1] * l[1] + nn[2] * l[2], Math.min(1, L.CORE.r / d)) + ML * lit.break.moon[i] * illum(nn[0] * LT.moon.toward[0] + nn[1] * LT.moon.toward[1] + nn[2] * LT.moon.toward[2], Math.sin(LT.moon.spread)) + lum([lit.break.bounce[i * 3], lit.break.bounce[i * 3 + 1], lit.break.bounce[i * 3 + 2]]);
      k++; core += lit.break.core[i]; e += E;
    }
    out.push(`${b.name} want ${b.want.toFixed(3)} ${k ? `core ${(core / k).toFixed(2)} lum ${((AL / Math.PI) * e / k).toFixed(3)}` : 'none'}`);
  }
  console.log(out.join(' · '));
}

const n = brk.positions.length / 3, lightOf = new Float32Array(n * 4), bounceOf = new Float32Array(n * 4), l = lit.break;
for (let i = 0; i < n; i++) {
  lightOf.set([l.core[i], l.moon[i], l.open[i], edgeOf[i]], i * 4);
  bounceOf.set([storeBounce(l.bounce[i * 3]), storeBounce(l.bounce[i * 3 + 1]), storeBounce(l.bounce[i * 3 + 2]), 0], i * 4);
}
pack('public/world/rock-r.bin', [{ name: 'break', positions: brk.positions, indices: brk.indices, attributes: { normal: { data: brk.normals, size: 3, as: 'i16' }, light: { data: lightOf, size: 4, as: 'u8' }, bounce: { data: bounceOf, size: 4, as: 'u8' } } }], { draft, round: 3, blocks: args.blocks.length, stones: args.stones.length, edge: 'light.w', edgeUnits: EDGE });
fs.writeFileSync(new URL('./measured/blocks.json', import.meta.url), JSON.stringify(args.blocks.map((b) => ({ name: b.name, kind: b.kind, at: b.at.map((v) => +v.toFixed(1)), z: +b.z.toFixed(1), n: b.n.map((v) => +v.toFixed(4)), thick: b.thick }))));
said('done');
