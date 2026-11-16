// Sculpt R: what stands between places of the picture and the core. For each place given (across,down in the
// picture's pixels), the first rock along the line of sight from the visitor, and what of the rock the line from
// there to the core runs into first.
//
//   node scripts/world/parts/rock-r/probe.mjs 410,420 430,470
import { L } from '../../lib/plan.mjs';
import { plan } from './blocks.mjs';
import * as H from './hollow.mjs';
import { CORE_PX, VIEW, J } from './relief.mjs';

const args = await plan({ draft: true });
Object.assign(args, { corePx: [...CORE_PX], view: [...VIEW], J, under: 3.5 });
if (process.argv.includes('--flat')) { for (const k of Object.keys(H.FAN)) Object.assign(H.FAN[k], { lean: [0, 0], twist: 0, sunk: [0, 0] }); }
if (process.argv.includes('--smooth')) Object.assign(H.FACETS, { tilt: [0, 0], steep: [0, 0], lift: 0, dish: [0, 0] });
H.setup(args);
const who = (p) => { let best = 'backing/mask', bd = Infinity; for (const b of args.blocks) { const v = H.block(b, ...p); if (v < bd) { bd = v; best = b.name; } } return bd < 1 ? best : `mask or clip (nearest ${best} ${bd.toFixed(1)})`; };
for (const a of process.argv.slice(2).filter((q) => /^[\d.]+,[\d.]+$/.test(q))) {
  const [px, py] = a.split(',').map(Number), A0 = L.fromPicture(px, py, 700), B0 = L.fromPicture(px, py, -400);
  let hit = null;
  for (let t = 0; t <= 1; t += 0.0005) { const p = A0.map((v, i) => v + (B0[i] - v) * t); if (H.bare(...p) < 0) { hit = p; break; } }
  if (!hit) { console.log(a, 'no rock'); continue; }
  const C = L.CORE.at, d = Math.hypot(...C.map((v, i) => v - hit[i]));
  let block = null;
  for (let s = 3; s < d - L.CORE.r; s += 0.5) { const p = hit.map((v, i) => v + ((C[i] - v) * s) / d); if (H.bare(...p) < 0) { block = [p, s]; break; } }
  console.log(`${a}: seen ${who(hit)} at z ${hit[2].toFixed(0)}, ${d.toFixed(0)} from the core; to the core ${block ? `blocked after ${block[1].toFixed(0)} by ${who(block[0])} at z ${block[0][2].toFixed(0)}` : 'clear'}`);
}
// --grid <block>: over a grid of its outline, the share of places that see the core, and the mean light on them.
const gi = process.argv.indexOf('--grid');
if (gi > 0) {
  const b = args.blocks.find((q) => q.name === process.argv[gi + 1]);
  let n = 0, clear = 0, cosSum = 0, side = 0, away = 0;
  const by = {};
  const grad = (p) => { const e = 0.3, f = H.bare; const g = [f(p[0] + e, p[1], p[2]) - f(p[0] - e, p[1], p[2]), f(p[0], p[1] + e, p[2]) - f(p[0], p[1] - e, p[2]), f(p[0], p[1], p[2] + e) - f(p[0], p[1], p[2] - e)]; const l = Math.hypot(...g) || 1; return g.map((v) => v / l); };
  for (let py = b.box[1]; py < b.box[3]; py += 4) for (let px = b.box[0]; px < b.box[2]; px += 4) {
    if (H.sample(b.outline, px, py) > -1) continue;
    const A0 = L.fromPicture(px, py, 700), B0 = L.fromPicture(px, py, -400);
    let hit = null;
    for (let t = 0; t <= 1; t += 0.0005) { const p = A0.map((v, i) => v + (B0[i] - v) * t); if (H.bare(...p) < 0) { hit = p; break; } }
    if (!hit || Math.abs(H.block(b, ...hit)) > 1.5) continue;
    n++;
    const nn = grad(hit), C = L.CORE.at, d = Math.hypot(...C.map((v, i) => v - hit[i])), l = C.map((v, i) => (v - hit[i]) / d);
    const c = nn[0] * l[0] + nn[1] * l[1] + nn[2] * l[2];
    if (Math.abs(nn[0] * b.n[0] + nn[1] * b.n[1] + nn[2] * b.n[2]) < 0.7) side++;
    let free = c > 0;
    if (!free) away++;
    if (free) for (let s = 1.5; s < d - L.CORE.r; s += 0.75) { const p = hit.map((v, i) => v + l[i] * s); if (H.bare(...p) < 0) { free = false; const w = who(p) + (s < 25 ? ' near' : ' far'); by[w] = (by[w] ?? 0) + 1; break; } }
    if (free) { clear++; cosSum += c * (L.CORE.r / d); }
  }
  console.log(`${b.name}: ${n} places seen, ${((100 * side) / n).toFixed(0)}% on sides, ${((100 * clear) / n).toFixed(0)}% see the core, mean cos * r/d over all ${(cosSum / n).toFixed(3)}, ${away} turned away; blocked by ${JSON.stringify(by)}`);
}

// --moon <block>: over a grid of its outline, the share of places the moon reaches past the rock and the land.
const mi = process.argv.indexOf('--moon');
if (mi > 0) {
  const { below } = await import('../land/shape.mjs');
  const M = L.MOONWARD, ml = Math.hypot(...M), m = M.map((v) => v / ml);
  const land = (p) => p[2] < Math.min(L.lip(p[0]), Math.sqrt(Math.max(0, L.WORLD.half ** 2 - p[0] * p[0]))) && p[1] < L.dome(p[0], p[2]) && p[1] > below(p[0], p[2]);
  const b = args.blocks.find((q) => q.name === process.argv[mi + 1]);
  let n = 0, lit = 0, faced = 0;
  const by = {};
  for (let py = b.box[1]; py < b.box[3]; py += 3) for (let px = b.box[0]; px < b.box[2]; px += 3) {
    if (H.sample(b.outline, px, py) > -1) continue;
    const A0 = L.fromPicture(px, py, 900), B0 = L.fromPicture(px, py, -400);
    let hit = null;
    for (let t = 0; t <= 1; t += 0.0004) { const p = A0.map((v, i) => v + (B0[i] - v) * t); if (H.bare(...p) < 0) { hit = p; break; } }
    if (!hit || Math.abs(H.block(b, ...hit)) > 1.5) continue;
    n++;
    const e = 0.3, f = H.bare, g = [f(hit[0] + e, hit[1], hit[2]) - f(hit[0] - e, hit[1], hit[2]), f(hit[0], hit[1] + e, hit[2]) - f(hit[0], hit[1] - e, hit[2]), f(hit[0], hit[1], hit[2] + e) - f(hit[0], hit[1], hit[2] - e)];
    if (g[0] * m[0] + g[1] * m[1] + g[2] * m[2] <= 0) continue;
    faced++;
    let free = true;
    for (let s = 1.5; s < 900; s += 1) { const p = hit.map((v, i) => v + m[i] * s); if (p[1] > 60) break; if (H.bare(...p) < 0) { free = false; const w = who(p) + (s < 20 ? " near" : " far"); by[w] = (by[w] ?? 0) + 1; break; } if (land(p)) { free = false; by.land = (by.land ?? 0) + 1; break; } }
    if (free) lit++;
  }
  console.log(`${b.name}: ${n} seen, ${faced} face the moon, ${lit} reached by it; blocked by ${JSON.stringify(by)}`);
}
