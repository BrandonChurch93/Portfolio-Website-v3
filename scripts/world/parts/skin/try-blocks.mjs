// Makes the crust's blocks alone and says how large they came out: for working on blocks.mjs quickly.
import { planBlocks, makeBlocks } from './blocks.mjs';
import { L } from '../../lib/plan.mjs';
const t0 = performance.now();
const plan = planBlocks((px, py) => 470);
for (const s of ['left', 'right']) for (const k of plan[s]) console.log(s, k.y0, k.y1, k.hang ? 'hang' : k.slab ? 'slab' : '', 'o', L.pictured(...k.o).map((v) => v.toFixed(0)).join(','), 'box', k.lo.map((v) => v.toFixed(0)).join(','), k.hi.map((v) => v.toFixed(0)).join(','));
const parts = await makeBlocks(plan, { cell: Number(process.argv[2] ?? 1.2), error: 0.12 });
for (const p of parts) console.log(p.side, p.mesh.indices.length / 3, 'triangles');
console.log(((performance.now() - t0) / 1000).toFixed(1), 's');
