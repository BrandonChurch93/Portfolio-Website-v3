// Sculpt S at places of the picture: the first rock the visitor's line of sight meets there, its normal, how it faces
// the visitor and the ball, how far it is from the ball in the ball's radii, and which mass it is of.
//   node scripts/world/parts/rock-s/facing.mjs px,py [px,py ...]
import { L } from '../../lib/plan.mjs';
import * as F from './field.mjs';
F.setup({});
const C = L.CORE.at, R = L.CORE.r, V = F.VIEW, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const names = [...F.M.map((m) => m.name), 'roof', 'backfill'];
for (const arg of process.argv.slice(2)) {
  const [px, py] = arg.split(',').map(Number), a = L.fromPicture(px, py, 700), c = L.fromPicture(px, py, -300);
  let hit = null;
  for (let t = 0; t <= 1; t += 0.0005) { const p = [0, 1, 2].map((q) => a[q] + (c[q] - a[q]) * t); if (F.field(...p) < 0) { hit = p; break; } }
  if (!hit) { console.log(arg, 'no rock'); continue; }
  const e = 0.4, g = [0, 1, 2].map((k) => { const p = hit.slice(), q = hit.slice(); p[k] += e; q[k] -= e; return F.field(...p) - F.field(...q); }), l = Math.hypot(...g), n = g.map((v) => v / l);
  const tb = [C[0] - hit[0], C[1] - hit[1], C[2] - hit[2]], d = Math.hypot(...tb);
  console.log(arg.padEnd(10), names[F.which(...hit.map((v, k) => v - n[k] * 1.5))].padEnd(16), 'z', hit[2].toFixed(0), 'd/R', (d / R).toFixed(2), 'n.view', dot(n, V).toFixed(2), 'n.ball', dot(n, tb.map((v) => v / d)).toFixed(2));
}
