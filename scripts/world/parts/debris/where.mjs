// Prints where each great piece is placed and drawn: node scripts/world/parts/debris/where.mjs
import process from 'node:process';
import { build } from '../../lib/bvh.mjs';
import { L } from '../../lib/plan.mjs';
import { place, extents } from './place.mjs';
import { read } from './rockfile.mjs';
const parts = read('public/world/rock-r.bin');
const n = parts.reduce((s, m) => s + m.positions.length / 3, 0), pos = new Float32Array(n * 3), idx = new Uint32Array(parts.reduce((s, m) => s + m.indices.length, 0));
{ let v = 0, t = 0; for (const m of parts) { pos.set(m.positions, v * 3); for (let i = 0; i < m.indices.length; i++) idx[t + i] = m.indices[i] + v; v += m.positions.length / 3; t += m.indices.length; } }
const { pieces } = place(build(pos, idx));
for (const p of pieces.filter((q) => q.cls === 'G')) {
  const [x, y] = L.drawn(...p.at), e = extents(p);
  console.log(`G${p.family}${p.lead !== undefined ? ` (of ${p.lead})` : ''} at ${p.at.map((v) => v.toFixed(0)).join(',')} drawn ${(x + L.HOST.wide / 2).toFixed(0)},${y.toFixed(0)} extents ${e.map((v) => v.toFixed(0)).join(',')} core ${p.core.toFixed(2)} moon ${p.moon.toFixed(2)}`);
}
// With a box (node where.mjs x0,y0,x1,y1, in the host's units), the families and kinds of what is drawn inside it.
const box = process.argv[2]?.split(',').map(Number);
if (box) {
  const count = {};
  for (const p of pieces) {
    const [x, y] = L.drawn(...p.at), X = x + L.HOST.wide / 2;
    if (X >= box[0] && X <= box[2] && y >= box[1] && y <= box[3]) { const k = `${p.kind} ${p.family} ${p.cls}`; count[k] = (count[k] ?? 0) + 1; }
  }
  console.log(count);
}
