// Makes broken rock from a field, lights it and writes its world file. Every sculpt of the rock goes through this,
// so they differ only in their field.
//
//   import { makeRock } from '../../lib/rock.mjs'
//   await makeRock({ name: 'a', module: '/abs/path/field.mjs', args, cell: 3, draft: process.argv.includes('--draft') })
//
// The steps: the field (under 0 inside the rock) is turned into a mesh that keeps its sharp edges, its vertices
// are split at creases and given normals, the light that reaches each is worked out (the core, the moon, two
// bounces), the mesh is reduced with that light kept, and it is written to public/world/rock-<name>.bin as two
// meshes: `skin`, the planet's own outer surface and its top, and `break`, everything else.
// draft makes it fast and rough: a cell twice as large and far fewer rays. Options: box (the space looked at),
// crease (degrees), keep (how far a vertex may move when the mesh is reduced, in units), budget (the most triangles
// in `break`), extra (more meshes that block and bounce light but are not written, such as the core's neighbours).
import { L, light, linear, stone, storeBounce } from './plan.mjs';
import { surface, simplify } from './surface.mjs';
import { creased } from './mesh.mjs';
import { bake } from './bake.mjs';
import { pack } from './pack.mjs';

// The color the rock's light is worked out with, which the page's plain material also wears.
export const ALBEDO = stone();
// How near the planet's outer surface or its top a vertex is taken to be skin, in units.
const SKIN = 2.5;
export const onSkin = (x, y, z) => Math.abs(1 - L.shell(x, y, z)) * L.WORLD.deep < SKIN || y > L.dome(x, z) - 3 - SKIN + L.land(x, z);

export async function makeRock({ name, module, args, cell = 3, draft = false, box = [[-700, -660, -700], [700, 60, 700]], crease = 40, keep = 0.25, budget = 650000, extra = [] }) {
  const t0 = performance.now(), said = (s) => console.log(`${((performance.now() - t0) / 1000).toFixed(1)} s · ${s}`);
  const raw = await surface({ module, args, box, cell: draft ? cell * 2 : cell });
  said(`surface: ${(raw.indices.length / 3).toLocaleString('en-US')} triangles`);
  const m = creased(raw, crease), n = m.positions.length / 3;
  const lit = await bake({ meshes: [{ name: 'rock', positions: m.positions, indices: m.indices, normals: m.normals, albedo: ALBEDO, receive: true }, ...extra], ...light() }, { samples: draft ? { core: 24, moon: 8, hemi: 64 } : { core: 64, moon: 16, hemi: 256 }, bounces: 2 });
  said('lit');
  const { core, moon, open, bounce } = lit.rock, W = 9, attrs = new Float32Array(n * W);
  for (let i = 0; i < n; i++) attrs.set([m.normals[i * 3], m.normals[i * 3 + 1], m.normals[i * 3 + 2], core[i], moon[i], open[i], bounce[i * 3], bounce[i * 3 + 1], bounce[i * 3 + 2]], i * W);
  const small = await simplify({ positions: m.positions, indices: m.indices }, { error: keep, target: Math.round(budget * 1.08), attributes: attrs, weights: [0.5, 0.5, 0.5, 2, 2, 1, 0.5, 0.5, 0.5] });
  said(`reduced: ${(small.indices.length / 3).toLocaleString('en-US')} triangles`);
  const k = small.positions.length / 3, skin = new Uint8Array(k);
  for (let i = 0; i < k; i++) skin[i] = onSkin(small.positions[i * 3], small.positions[i * 3 + 1], small.positions[i * 3 + 2]) ? 1 : 0;
  const part = (want) => {
    const map = new Int32Array(k).fill(-1), pos = [], idx = [], a = [];
    for (let t = 0; t < small.indices.length; t += 3) {
      const v = [small.indices[t], small.indices[t + 1], small.indices[t + 2]];
      if (Boolean(skin[v[0]] && skin[v[1]] && skin[v[2]]) !== want) continue;
      for (const i of v) {
        if (map[i] < 0) { map[i] = pos.length / 3; pos.push(small.positions[i * 3], small.positions[i * 3 + 1], small.positions[i * 3 + 2]); for (let q = 0; q < W; q++) a.push(small.attributes[i * W + q]); }
        idx.push(map[i]);
      }
    }
    const count = pos.length / 3, normal = new Float32Array(count * 3), lightOf = new Float32Array(count * 4), bounceOf = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const l = Math.hypot(a[i * W], a[i * W + 1], a[i * W + 2]) || 1;
      normal.set([a[i * W] / l, a[i * W + 1] / l, a[i * W + 2] / l], i * 3);
      lightOf.set([a[i * W + 3], a[i * W + 4], a[i * W + 5], 0], i * 4);
      bounceOf.set([storeBounce(a[i * W + 6]), storeBounce(a[i * W + 7]), storeBounce(a[i * W + 8]), 0], i * 4);
    }
    return { name: want ? 'skin' : 'break', positions: new Float32Array(pos), indices: new Uint32Array(idx), attributes: { normal: { data: normal, size: 3, as: 'i16' }, light: { data: lightOf, size: 4, as: 'u8' }, bounce: { data: bounceOf, size: 4, as: 'u8' } } };
  };
  pack(`public/world/rock-${name}.bin`, [part(false), part(true)], { draft });
  said('done');
}
