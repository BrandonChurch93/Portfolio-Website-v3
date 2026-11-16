// Makes sculpt R of the rock and writes public/world/rock-r.bin: picture 9's rock measured from its pixels and
// built as a relief in the camera's space, lit by the world's own light.
//
//   node scripts/world/parts/rock-r/see.mjs       what of the picture is the rock (previews only)
//   node scripts/world/parts/rock-r/facets.mjs    its faces and their outlines: measured/facets.json
//   node scripts/world/parts/rock-r/make.mjs      the shipped file, from measured/facets.json
//   node scripts/world/parts/rock-r/make.mjs --draft   fast and rough
//
// The steps: each face is given a tilt that makes it as bright under the world's light as the picture has it and a
// depth that keeps it joined to its neighbours (relief.mjs), the meshes are made (build.mjs), the light that
// reaches every point is worked out by the world's baker, and the tilts are found again with what the baker found
// (the share of the core each face sees, the light that bounced), ROUNDS times. It prints how far each round's
// light is from the picture's, face by face.
import fs from 'node:fs';
import process from 'node:process';
import { L, light, storeBounce } from '../../lib/plan.mjs';
import { bake } from '../../lib/bake.mjs';
import { pack } from '../../lib/pack.mjs';
import { Relief, ALBEDO, CORE_LUM, MOON_LUM, lum, illum, dot } from './relief.mjs';
import { buildBreak, buildSkin } from './build.mjs';

const draft = process.argv.includes('--draft');
const ROUNDS = draft ? 2 : 3;
const t0 = performance.now(), said = (s) => console.log(`${((performance.now() - t0) / 1000).toFixed(1)} s · ${s}`);
const json = JSON.parse(fs.readFileSync(new URL('./measured/facets.json', import.meta.url), 'utf8'));
const R = new Relief(json);
const LT = light(), C = L.CORE.at;
const samples = draft ? { core: 24, moon: 8, hemi: 48 } : { core: 64, moon: 16, hemi: 192 };

R.solve({ rounds: 4 });
said(`solved: ${R.faces.length} faces, ${R.faces.filter((f) => f.gap).length} gaps, ${R.faces.filter((f) => f.moon).length} lit by the moon`);
const skin = buildSkin();
said(`skin: ${(skin.indices.length / 3).toLocaleString('en-US')} triangles`);

let brk, lit;
for (let round = 0; round <= ROUNDS; round++) {
  brk = buildBreak(R);
  said(`break: ${(brk.indices.length / 3).toLocaleString('en-US')} triangles, ${brk.stones} stones, ${brk.failed} faces cut by ears`);
  const last = round === ROUNDS;
  lit = await bake({ meshes: [{ name: 'break', positions: brk.positions, indices: brk.indices, normals: brk.normals, albedo: ALBEDO, receive: true }, { name: 'skin', positions: skin.positions, indices: skin.indices, normals: skin.normals, albedo: ALBEDO, receive: last }], ...LT }, { samples: last ? samples : { core: 16, moon: 6, hemi: 32 }, bounces: last ? 2 : 1 });
  // What each face got, against what the picture wants of it.
  const F = R.faces.length, acc = Array.from({ length: F }, () => ({ core: 0, moon: 0, bounce: 0, e: 0, c: 0 }));
  const b = lit.break, P = brk.positions, Nn = brk.normals;
  for (let v = 0; v < brk.face.length; v++) {
    const f = brk.face[v];
    if (f < 0) continue;
    const p = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], n = [Nn[v * 3], Nn[v * 3 + 1], Nn[v * 3 + 2]];
    const d = Math.hypot(C[0] - p[0], C[1] - p[1], C[2] - p[2]), l = [(C[0] - p[0]) / d, (C[1] - p[1]) / d, (C[2] - p[2]) / d];
    const bl = lum([b.bounce[v * 3], b.bounce[v * 3 + 1], b.bounce[v * 3 + 2]]);
    const e = CORE_LUM * b.core[v] * (L.CORE.r / d) ** LT.core.fall * illum(dot(n, l), Math.min(1, L.CORE.r / d)) + MOON_LUM * b.moon[v] * illum(dot(n, LT.moon.toward), Math.sin(LT.moon.spread)) + bl;
    const a = acc[f];
    a.core += b.core[v]; a.moon += b.moon[v]; a.bounce += bl; a.e += e; a.c++;
  }
  let err = 0, abs = 0, wsum = 0;
  const per = [];
  for (let f = 0; f < F; f++) {
    const a = acc[f], fc = R.faces[f];
    if (!a.c) continue;
    const got = a.e / a.c, want = fc.want * R.calibrate, w = fc.area * fc.shown;
    const stops = Math.log2((got + 0.03) / (want + 0.03));
    err += stops * w; abs += Math.abs(stops) * w; wsum += w;
    per.push([Math.abs(stops), f, got, want]);
    fc.got = got; fc.lit = { core: a.core / a.c, moon: a.moon / a.c, bounce: a.bounce / a.c };
  }
  said(`round ${round}: light against the picture's, over what the picture shows: mean ${(err / wsum).toFixed(2)} stops, mean size ${(abs / wsum).toFixed(2)} stops`);
  if (last) break;
  R.solve({ rounds: 2, lit: acc.map((a, f) => (a.c ? { core: a.core / a.c, moon: a.moon / a.c, bounce: a.bounce / a.c } : null)) });
}

// The file: `break` and `skin`, each with its normals, its stored light and its bounce.
const out = (name, m, l) => {
  const n = m.positions.length / 3, lightOf = new Float32Array(n * 4), bounceOf = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    lightOf.set([l.core[i], l.moon[i], l.open[i], 0], i * 4);
    bounceOf.set([storeBounce(l.bounce[i * 3]), storeBounce(l.bounce[i * 3 + 1]), storeBounce(l.bounce[i * 3 + 2]), 0], i * 4);
  }
  return { name, positions: m.positions, indices: m.indices, attributes: { normal: { data: m.normals, size: 3, as: 'i16' }, light: { data: lightOf, size: 4, as: 'u8' }, bounce: { data: bounceOf, size: 4, as: 'u8' } } };
};
pack('public/world/rock-r.bin', [out('break', brk, lit.break), out('skin', skin, lit.skin)], { draft, faces: R.faces.length });
fs.writeFileSync(new URL('./measured/solved.json', import.meta.url), JSON.stringify(R.faces.map((f) => ({ id: f.id, z: +f.z.toFixed(2), a: +f.a.toFixed(4), b: +f.b.toFixed(4), n: f.n.map((v) => +v.toFixed(4)), gap: f.gap, moon: f.moon, want: +(f.want * R.calibrate).toFixed(4), got: +(f.got ?? 0).toFixed(4), lit: f.lit }))));
said('done');
