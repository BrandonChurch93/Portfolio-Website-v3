// The trees, made ahead and shipped (src/pieces/world/parts/trees.ts reads them):
//   public/world/trees.bin          the models of a tree (MODELS in design.ts), each with its stored light, and where
//                                   each tree of the plan stands on the land as it is drawn (seats.mjs)
//   public/world/trees-leaves.png   the atlas of leaves, bark and the shadow under a tree, with its chain of levels
//
//   node scripts/world/parts/trees/make.mjs [--draft]
//
// --draft casts fewer rays for each vertex's openness. Everything else is the same, and both are deterministic.
import { pack } from '../../lib/pack.mjs';
import { png } from '../../lib/png.mjs';
import { storeBounce } from '../../lib/plan.mjs';
import { FILES, MODELS } from '../../../../src/pieces/world/parts/trees/design.ts';
import { paint } from './leaves.mjs';
import { tree } from './model.mjs';
import { seats } from './seats.mjs';

const draft = process.argv.includes('--draft'), from = Date.now();

const atlas = paint({ seed: 7 });
png(`public/world/${FILES.leaves}`, atlas.width, atlas.height, atlas.data, 4);

const meshes = [];
for (let m = 0; m < MODELS.length; m++) {
  const t = tree(MODELS[m], { rays: draft ? 24 : 160 }), n = t.positions.length / 3, bounce = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) bounce[i * 4 + k] = storeBounce(t.bounce[i * 4 + k]); bounce[i * 4 + 3] = t.bounce[i * 4 + 3]; }
  // A vertex's sway is how far it moves in the air, which lump it is of, and whether its card faces the viewer: one
  // attribute, since the trees' shader has every one of the sixteen a vertex may have.
  // The balls are stored as the positions are (lib/pack.mjs): shares of the mesh's own cube, so one transform
  // carries both.
  const lo = [0, 1, 2].map((k) => Math.min(...t.positions.filter((_, i) => i % 3 === k))), hi = [0, 1, 2].map((k) => Math.max(...t.positions.filter((_, i) => i % 3 === k)));
  const size = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]), share = (ball) => ball.map((v, i) => (i % 4 === 3 ? v / size : (v - lo[i % 4]) / size));
  meshes.push({
    name: `tree-${m}`,
    positions: t.positions,
    indices: t.indices,
    attributes: {
      normal: { data: t.normals, size: 3, as: 'i16' },
      uv: { data: t.uvs, size: 2, as: 'u16' },
      sway: { data: t.sway, size: 3, as: 'u8' },
      light: { data: t.light, size: 4, as: 'u8' },
      bounce: { data: bounce, size: 4, as: 'u8' },
      clump: { data: share(t.clump), size: 4, as: 'u16' },
      mass: { data: share(t.mass), size: 4, as: 'u16' },
      crown: { data: share(t.crown), size: 4, as: 'u16' },
    },
    info: t.info,
  });
  console.log(`tree-${m} (${MODELS[m]}): ${t.info.triangles} triangles (${t.info.leaf} with soft edges), ${t.info.clumps} clumps in ${t.info.masses} masses, top ${t.info.top.toFixed(2)}`);
}
// Each tree of the plan: its place, the land's height under it, how much of that is sand, and the share of its
// crown seen over the land in front of it, for a crown as tall as the tallest model's.
const top = Math.max(...meshes.map((m) => m.info.top));
const seated = seats(top).map((q) => [q.x, q.z, +q.y.toFixed(2), +q.sand.toFixed(2), +q.seen.toFixed(2)]);
pack(`public/world/${FILES.mesh}`, meshes, { atlas: { coverage: atlas.coverage }, seats: seated });
console.log(`seats: ${seated.length} trees, ${seated.filter((q) => q[3] > 0.05).length} on sand, ${seated.filter((q) => q[4] < 0.99).length} partly hidden by the land in front`);
console.log(`trees: made in ${((Date.now() - from) / 1000).toFixed(1)} s${draft ? ' (draft)' : ''}`);
