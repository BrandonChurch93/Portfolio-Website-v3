// Makes sculpt R of the rock and writes public/world/rock-r.bin: picture 9's rock measured from its pixels and built
// as great slabs in the camera's space, lit by the world's own light.
//
//   node scripts/world/parts/rock-r/see.mjs        what of the picture is the rock (previews only)
//   node scripts/world/parts/rock-r/slabs.mjs      its great slabs and their pieces: measured/slabs.json
//   node scripts/world/parts/rock-r/make.mjs       the shipped file, from measured/slabs.json
//   node scripts/world/parts/rock-r/make.mjs --draft   fast and rough
//
// The steps: each slab is given a plane and a depth (great.mjs), the mesh is cut (carve.mjs) and any slab that
// comes too near the core is moved back whole, the light that reaches every point is worked out by the world's
// baker, and the planes are found again with what the baker found, ROUNDS times. It prints how far each round's
// light is from the picture's, face by face. The spare number stored with the light is a number of each slab's own,
// 0 to 1, the same over the whole slab, for the material to turn and shift its maps by.
import fs from 'node:fs';
import process from 'node:process';
import { L, light, storeBounce } from '../../lib/plan.mjs';
import { bake } from '../../lib/bake.mjs';
import { pack } from '../../lib/pack.mjs';
import { Great, hash } from './great.mjs';
import { carve } from './carve.mjs';
import { buildSkin } from './build.mjs';
import { ALBEDO, CORE_LUM, MOON_LUM, lum, dot, illum } from './relief.mjs';

const draft = process.argv.includes('--draft');
const ROUNDS = draft ? 1 : 3;
const t0 = performance.now(), said = (s) => console.log(`${((performance.now() - t0) / 1000).toFixed(1)} s · ${s}`);
const json = JSON.parse(fs.readFileSync(new URL('./measured/slabs.json', import.meta.url), 'utf8'));
const G = new Great(json);
const LT = light(), C = L.CORE.at;
const samples = draft ? { core: 24, moon: 8, hemi: 48 } : { core: 64, moon: 16, hemi: 192 };

G.solve();
const roles = {};
for (const s of G.slabs) roles[s.role] = (roles[s.role] ?? 0) + 1;
said(`solved: ${G.slabs.length} slabs (${Object.entries(roles).map(([k, v]) => `${v} ${k}`).join(', ')}), ${G.pieces.length} pieces`);
const skin = buildSkin();
said(`skin: ${(skin.indices.length / 3).toLocaleString('en-US')} triangles`);

// Cut the mesh, moving back whole any slab that came too near the core, until none does.
const cut = () => {
  let m;
  for (let k = 0; k < 4; k++) {
    m = carve(G);
    let moved = 0;
    m.push.forEach((v, s) => { if (v > 0) { G.slabs[s].shift -= v; moved++; } });
    if (!moved) break;
    said(`${moved} slabs moved back clear of the core`);
  }
  return m;
};

let brk, lit;
for (let round = 0; round <= ROUNDS; round++) {
  brk = cut();
  said(`break: ${(brk.indices.length / 3).toLocaleString('en-US')} triangles, ${brk.stones} stones`);
  const last = round === ROUNDS;
  lit = await bake({ meshes: [{ name: 'break', positions: brk.positions, indices: brk.indices, normals: brk.normals, albedo: ALBEDO, receive: true }, { name: 'skin', positions: skin.positions, indices: skin.indices, normals: skin.normals, albedo: ALBEDO, receive: last }], ...LT }, { samples: last ? samples : { core: 16, moon: 6, hemi: 32 }, bounces: last ? 2 : 1 });
  // What each slab's face got, against what the picture wants of it.
  const S = G.slabs.length, acc = Array.from({ length: S }, () => ({ core: 0, moon: 0, bounce: 0, e: 0, c: 0 }));
  const b = lit.break, P = brk.positions, Nn = brk.normals;
  for (let v = 0; v < brk.face.length; v++) {
    if (brk.kind[v] !== 0) continue;
    const s = brk.slab[v], p = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], n = [Nn[v * 3], Nn[v * 3 + 1], Nn[v * 3 + 2]];
    const d = Math.hypot(C[0] - p[0], C[1] - p[1], C[2] - p[2]), l = [(C[0] - p[0]) / d, (C[1] - p[1]) / d, (C[2] - p[2]) / d];
    const bl = lum([b.bounce[v * 3], b.bounce[v * 3 + 1], b.bounce[v * 3 + 2]]);
    const e = CORE_LUM * b.core[v] * (L.CORE.r / d) ** LT.core.fall * illum(dot(n, l), Math.min(1, L.CORE.r / d)) + MOON_LUM * b.moon[v] * illum(dot(n, LT.moon.toward), Math.sin(LT.moon.spread)) + bl;
    const a = acc[s];
    a.core += b.core[v]; a.moon += b.moon[v]; a.bounce += bl; a.e += e; a.c++;
  }
  let err = 0, abs = 0, wsum = 0;
  const byRole = {};
  for (const s of G.slabs) {
    const a = acc[s.id];
    if (!a.c) continue;
    const got = a.e / a.c, want = s.want, w = s.area * s.shown, stops = Math.log2((got + 0.03) / (want + 0.03));
    err += stops * w; abs += Math.abs(stops) * w; wsum += w;
    s.got = got; s.lit = { core: a.core / a.c, moon: a.moon / a.c, bounce: a.bounce / a.c };
    const r = (byRole[s.role] ??= { core: 0, w: 0, got: 0, want: 0 });
    r.core += s.lit.core * s.area; r.got += got * s.area; r.want += want * s.area; r.w += s.area;
  }
  said(`round ${round}: light against the picture's: mean ${(err / wsum).toFixed(2)} stops, mean size ${(abs / wsum).toFixed(2)} stops · ${Object.entries(byRole).map(([k, r]) => `${k} core seen ${(r.core / r.w).toFixed(2)}, got ${(r.got / r.w).toFixed(3)} want ${(r.want / r.w).toFixed(3)}`).join(' · ')}`);
  if (last) break;
  G.solve({ lit: G.slabs.map((s) => s.lit ?? null) });
}

// The file: `break` and `skin`, each with its normals, its stored light and its bounce.
const out = (name, m, l, spare) => {
  const n = m.positions.length / 3, lightOf = new Float32Array(n * 4), bounceOf = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    lightOf.set([l.core[i], l.moon[i], l.open[i], spare(i)], i * 4);
    bounceOf.set([storeBounce(l.bounce[i * 3]), storeBounce(l.bounce[i * 3 + 1]), storeBounce(l.bounce[i * 3 + 2]), 0], i * 4);
  }
  return { name, positions: m.positions, indices: m.indices, attributes: { normal: { data: m.normals, size: 3, as: 'i16' }, light: { data: lightOf, size: 4, as: 'u8' }, bounce: { data: bounceOf, size: 4, as: 'u8' } } };
};
pack('public/world/rock-r.bin', [out('break', brk, lit.break, (i) => hash(brk.slab[i], 23)), out('skin', skin, lit.skin, () => 0)], { draft, slabs: G.slabs.length, pieces: G.pieces.length });
fs.writeFileSync(new URL('./measured/solved.json', import.meta.url), JSON.stringify(G.slabs.map((s) => ({ id: s.id, role: s.role, z: +s.z.toFixed(2), shift: +s.shift.toFixed(2), n: s.n.map((v) => +v.toFixed(4)), want: +s.want.toFixed(4), got: +(s.got ?? 0).toFixed(4), lit: s.lit }))));
said('done');
