// Makes what broke away (src/pieces/world/parts/debris.ts): public/world/debris.bin and public/world/debris-detail.png.
//
//   node scripts/world/parts/debris/make.mjs           the shipped files
//   node scripts/world/parts/debris/make.mjs --draft   fast: coarser models and fewer samples in the bake
//
// The field is the original plan's (./place.mjs), kept clear of the torn rock as it now is (public/world/rock-r.bin,
// the rock the page draws), drawn up close under it, and kept out of the stream's way.
// The models (./models.mjs) are written once each, and the page draws each piece from its model where the table in
// the file's header puts it. A shared model has how shut in each of its places is worked out alone, and a piece
// that wears it is given how much of the core it sees and the light bounced to it from where it rests. A great
// piece is lit where it rests, with the torn rock and the other great pieces round it: the core, the moon and one
// bounce. Light is stored as the world's other parts store it (scripts/world/lib/pack.mjs), with what the page
// reads for itself in the spare places: light = core seen, how bent, how open, outer surface; bounce = r, g, b, the
// bed's tone.
import process from 'node:process';
import { bake } from '../../lib/bake.mjs';
import { build, closest, gap } from '../../lib/bvh.mjs';
import { pack } from '../../lib/pack.mjs';
import { L, light, linear, storeBounce } from '../../lib/plan.mjs';
import { KIND, SWAY } from '../../../../src/pieces/world/parts/debris/motion.ts';
import { detail } from './detail.mjs';
import { makeModels } from './models.mjs';
import { extents, place, rotate } from './place.mjs';
import { read } from './rockfile.mjs';

const draft = process.argv.includes('--draft');
const ROCK = 'public/world/rock-r.bin', OUT = 'public/world/debris.bin', DETAIL = { file: 'public/world/debris-detail.png', size: 512 };
// The color the light is worked out with, which is the torn rock's (scripts/world/lib/rock.mjs).
const ALBEDO = linear('text-3');
const t0 = performance.now(), said = (s) => console.log(`${((performance.now() - t0) / 1000).toFixed(1)} s · ${s}`);

// The torn rock, as one mesh.
const parts = read(ROCK), count = parts.reduce((s, m) => s + m.positions.length / 3, 0);
const rock = { positions: new Float32Array(count * 3), normals: new Float32Array(count * 3), light: new Float32Array(count * 4), indices: new Uint32Array(parts.reduce((s, m) => s + m.indices.length, 0)) };
{ let v = 0, t = 0; for (const m of parts) { rock.positions.set(m.positions, v * 3); rock.normals.set(m.normals, v * 3); rock.light.set(m.light, v * 4); for (let i = 0; i < m.indices.length; i++) rock.indices[t + i] = m.indices[i] + v; v += m.positions.length / 3; t += m.indices.length; } }
const bvh = build(rock.positions, rock.indices);
said(`the torn rock: ${(rock.indices.length / 3).toLocaleString('en-US')} triangles`);

const { pieces, said: placed } = place(bvh);
said(`placed: ${JSON.stringify(placed)}`);
const models = await makeModels(pieces, draft, said);
const byName = new Map(models.map((m, i) => [m.name, i]));
const hashOf = (n) => { let x = Math.imul(n ^ 0x27d4eb2d, 0x165667b1); x ^= x >>> 15; return (x >>> 0) / 4294967296; };
pieces.forEach((p, i) => { p.model = p.cls === 'G' ? byName.get(`G${p.family}`) : byName.get(`${p.cls}${Math.floor(hashOf(i * 7 + 3) * ({ L: 4, M: 5, S: 5, D: 4 })[p.cls])}`); });

// How shut in each place of a shared model is, alone.
for (const m of models.filter((q) => q.shared)) {
  const lit = await bake({ meshes: [{ name: 'm', positions: m.positions, indices: m.indices, normals: m.normals, albedo: ALBEDO, receive: true }], moon: null, core: null, sky: [1, 1, 1] }, { samples: { core: 0, moon: 0, hemi: draft ? 48 : 160 }, bounces: 0, bias: 0.004 });
  m.open = lit.m.open;
}
said('the shared models are lit');

// The great pieces where they rest, lit with the rock and each other. Each was placed by a ball inside its bounds:
// as made, it must keep further from the rock than it sways. One that does not is moved, nearer or further first
// and so kept where the picture has it, then down.
const great = pieces.filter((p) => p.cls === 'G'), meshes = [{ name: 'rock', positions: rock.positions, indices: rock.indices, normals: rock.normals, albedo: ALBEDO, receive: false }];
const laid = (p) => {
  const m = models[p.model], n = m.positions.length / 3, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const q = rotate(p.quat, [m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]]), k = rotate(p.quat, [m.normals[i * 3], m.normals[i * 3 + 1], m.normals[i * 3 + 2]]);
    pos.set([q[0] + p.at[0], q[1] + p.at[1], q[2] + p.at[2]], i * 3);
    nor.set(k, i * 3);
  }
  return { pos, nor };
};
const clear = (pos) => { let least = Infinity; for (let i = 0; i < pos.length / 3; i += 5) least = Math.min(least, gap(bvh, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], 40, 0)); return least; };
for (const p of great) {
  let { pos, nor } = laid(p);
  const need = SWAY.plate + 1, from = [...p.at], [px, py] = L.pictured(...from);
  const tries = [...Array.from({ length: 12 }, (_, k) => L.fromPicture(px, py, from[2] + (k % 2 ? -1 : 1) * 12 * (1 + (k >> 1)))), ...Array.from({ length: 12 }, (_, k) => [from[0], from[1] - 4 * (k + 1), from[2]])];
  for (let k = 0; clear(pos) < need && k < tries.length; k++) { p.at = tries[k]; ({ pos, nor } = laid(p)); }
  if (p.at !== from) said(`G${p.family} kept clear of the rock: moved ${p.at.map((v, i) => (v - from[i]).toFixed(0)).join(', ')}, ${clear(pos).toFixed(1)} from it`);
  meshes.push({ name: models[p.model].name, positions: pos, indices: models[p.model].indices, normals: nor, albedo: ALBEDO, receive: true });
}
const lit = await bake({ meshes, ...light() }, { samples: draft ? { core: 24, moon: 8, hemi: 64 } : { core: 64, moon: 16, hemi: 224 }, bounces: 1 });
for (const p of great) { const m = models[p.model]; m.core = lit[m.name].core; m.open = lit[m.name].open; m.bounce = lit[m.name].bounce; }
said('the great pieces are lit');

// The light bounced to a small piece where it rests: the torn rock round it as the core lights it, seen from the
// piece's middle in every direction, taken as falling on a face turned any way.
const C = light().core, hit = new Float64Array(4), RAYS = 96;
for (const p of pieces.filter((q) => q.cls !== 'G')) {
  const [x, y, z] = p.kind === 'fall' ? [p.at[0], -600, p.at[2]] : p.at, sum = [0, 0, 0];
  for (let i = 0; i < RAYS; i++) {
    const u = (i + 0.5) / RAYS, th = Math.acos(1 - 2 * u), ph = i * 2.39996, d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
    const t = closest(bvh, x, y, z, d[0], d[1], d[2], 3000, hit);
    if (t < 0) continue;
    const a = rock.indices[t * 3], h = [x + d[0] * hit[0], y + d[1] * hit[1], z + d[2] * hit[2]], to = C.at.map((v, k) => v - h[k]), far = Math.hypot(...to);
    const facing = Math.max(0, (rock.normals[a * 3] * to[0] + rock.normals[a * 3 + 1] * to[1] + rock.normals[a * 3 + 2] * to[2]) / far);
    const e = rock.light[a * 4] * facing * Math.min(1, C.r / far) ** C.fall;
    for (let k = 0; k < 3; k++) sum[k] += C.color[k] * e * ALBEDO[k];
  }
  // The rock's radiance is its irradiance times its albedo over pi, and a face of uniform radiance L lights a face
  // turned to it with pi L: the mean over the sphere is what a face turned any way gets.
  p.bounce = sum.map((v) => v / RAYS);
}
said('the small pieces are lit');

// Pieces close together darken each other: how much of the open sky round each one its neighbours take, and how
// much of the core they hide from it. Each neighbour is taken as a ball. A great piece has it worked out for each
// place on it, the rest for the piece as a whole.
const balls = pieces.filter((p) => p.kind !== 'fall' && p.kind !== 'dust').map((p) => ({ p, at: p.at, r: Math.max(...extents(p)) * 0.72 }));
const CROWD = { most: 0.8, reach: 4, core: 0.85 };
function crowd(self, x, y, z, n) {
  let shut = 0, seen = 1;
  const to = [L.CORE.at[0] - x, L.CORE.at[1] - y, L.CORE.at[2] - z], far = Math.hypot(...to);
  for (const b of balls) {
    if (b.p === self) continue;
    const d = [b.at[0] - x, b.at[1] - y, b.at[2] - z], l = Math.hypot(...d);
    if (l > b.r * CROWD.reach * 2.5 || l < b.r * 1.02) continue;
    const facing = n ? Math.max(0, (n[0] * d[0] + n[1] * d[1] + n[2] * d[2]) / l + 0.25) / 1.25 : 0.5;
    shut += (b.r / l) ** 2 * facing;
    const along = (d[0] * to[0] + d[1] * to[1] + d[2] * to[2]) / far;
    if (along > 0 && along < far) {
      const off = Math.sqrt(Math.max(0, l * l - along * along));
      seen *= 1 - CROWD.core * Math.min(1, Math.max(0, (b.r - off) / (b.r * 0.6)));
    }
  }
  return [Math.min(CROWD.most, shut), seen];
}
for (const p of pieces) {
  if (p.cls === 'G') {
    const m = models[p.model], nv = m.positions.length / 3;
    for (let i = 0; i < nv; i++) {
      const q = rotate(p.quat, [m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]]), k = rotate(p.quat, [m.normals[i * 3], m.normals[i * 3 + 1], m.normals[i * 3 + 2]]);
      const [shut, seen] = crowd(p, q[0] + p.at[0], q[1] + p.at[1], q[2] + p.at[2], k);
      m.open[i] *= 1 - shut;
      m.core[i] *= seen;
    }
  } else {
    const [shut, seen] = crowd(p, ...p.at, null);
    p.shut = shut;
    p.core *= seen;
  }
}
said('the pieces are lit by each other');

// The models, and the table of pieces that wear them.
const out = models.map((m) => {
  const n = m.positions.length / 3, lightOf = new Float32Array(n * 4), bounceOf = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    lightOf.set([m.shared ? 1 : m.core[i], m.curv[i], m.open[i], m.skin[i]], i * 4);
    bounceOf.set([m.shared ? 0 : storeBounce(m.bounce[i * 3]), m.shared ? 0 : storeBounce(m.bounce[i * 3 + 1]), m.shared ? 0 : storeBounce(m.bounce[i * 3 + 2]), m.bed[i]], i * 4);
  }
  return { name: m.name, positions: m.positions, indices: m.indices, info: { shared: m.shared }, attributes: { normal: { data: m.normals, size: 3, as: 'i16' }, light: { data: lightOf, size: 4, as: 'u8' }, bounce: { data: bounceOf, size: 4, as: 'u8' } } };
});
const r3 = (v) => Math.round(v * 1000) / 1000;
// A chip the stream carries is one of the stream's own shards (src/stream/shards.ts), which the page makes, as
// large as the piece.
const e = (p) => (p.cls === 'G' ? [1, 1, 1] : p.kind === 'fall' ? [p.r * 1.3, p.r * 1.3, p.r * 1.3] : extents(p));
const table = pieces.map((p) => [
  p.model, ...p.at.map(r3), ...p.quat.map(r3), ...e(p).map(r3), KIND[p.kind], p.family, r3(p.phase), ...p.spin.map(r3), r3(p.core),
  ...(p.cls === 'G' ? [0, 0, 0] : p.bounce.map((v) => r3(storeBounce(v)))),
  r3(p.kind === 'fall' ? p.fast : p.kind === 'ring' ? p.family - 20 : p.kind === 'whirl' ? p.swing : 0), r3(p.shut ?? 0),
]);
const tris = pieces.reduce((s, p) => s + models[p.model].indices.length / 3, 0);
pack(OUT, out, { draft, columns: 'model x y z qx qy qz qw sx sy sz kind family phase ax ay az spin core br bg bb extra shut', pieces: table, placed, triangles: tris });
detail(DETAIL.file, DETAIL.size);
said(`done: ${pieces.length} pieces, ${tris.toLocaleString('en-US')} triangles drawn`);
