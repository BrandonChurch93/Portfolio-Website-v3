// Copies out of the study's plan (src/hero-blockout/plan.ts) the places it worked out by chance: every building,
// every tree and where each small stream leaves the rock. They are the layout he approved, so the new world keeps
// them as numbers and never works them out again. Writes src/pieces/world/placed.ts.
//
//   node scripts/world/placed.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'placed-'));
execFileSync('node_modules/.bin/tsc', ['src/hero-blockout/plan.ts', '--ignoreConfig', '--outDir', dir, '--module', 'esnext', '--target', 'es2022', '--skipLibCheck', '--strict'], { stdio: 'inherit' });
writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
const P = await import(pathToFileURL(join(dir, 'plan.js')).href);

const n = (v, d = 2) => Number(v.toFixed(d));
// Where picture 9 and the study differ, the picture wins (his ruling of Nov 15). These are the named buildings whose
// tops the study had at the wrong height, by their place in the study's list, with the height that puts each top
// where the picture has it (npm run match prints the check).
const TALLER = { 2: 177, 4: 138 };
const towers = P.towers().map((b, i) => [n(b.x), n(b.z), n(b.w), n(b.d), n(TALLER[i] ?? b.tall), n(b.turn / P.D2R), b.form, b.roof, n(b.seed, 5)]);
// The land's front edge is picture 9's (LIP in the new world's plan), bitten far deeper than the study's. So what
// the study stood near its own edge is put right for the picture's: a building too near the new edge to leave the
// belt of trees its room is slid straight back along the line of sight, with its top kept exactly where the picture
// has it, and the belt of trees is planted again along the new edge.
const W = await import(pathToFileURL(join(process.cwd(), 'src/pieces/world/layout.ts')).href);
const BELT = 46, size = (t) => Math.max(t[2], t[3]);
const clear = (x, z, r, pad) => {
  if (W.within(x, z) < pad || W.desert(x, z) > 0.02 || Math.hypot(x, z) < W.COURT + r + 4) return false;
  const [qx, qz] = W.pyramidal(x, z);
  return Math.max(Math.abs(qx), Math.abs(qz)) > W.PYRAMID.base / 2 + r + 6;
};
let slid = 0, lost = 0;
towers.forEach((t, i) => {
  const r = 0.5 * size(t), room = (x, z) => clear(x, z, r, r + BELT) && towers.every((o, j) => j === i || Math.hypot(o[0] - x, o[1] - z) > 0.5 * (size(o) + size(t)) + 3);
  if (clear(t[0], t[1], r, r + BELT) || W.within(t[0], t[1]) > 200) return;
  const [px, py] = W.pictured(t[0], W.ground(t[0], t[1]) + t[4], t[1]);
  for (let back = 6; back < 330; back += 6) {
    const [x, y, z] = W.fromPicture(px, py, t[1] - back), tall = y - W.ground(x, z);
    if (tall < 20) break;
    if (room(x, z)) { t[0] = n(x); t[1] = n(z); t[4] = n(tall); slid++; return; }
  }
  lost++;
});
const r = P.seeded(31007), trees = P.trees().map((t) => [n(t.x), n(t.z), n(t.size), n(t.tone, 3), n(t.turn, 3)]).filter((t) => W.within(t[0], t[1]) > t[2] + 2);
const kept = trees.length;
const plant = (x, z, sz) => {
  if (!clear(x, z, sz, sz + 3)) return;
  if (towers.some((b) => Math.hypot(b[0] - x, b[1] - z) < 0.62 * size(b) + 0.7 * sz + 2)) return;
  if (trees.some((o) => Math.hypot(o[0] - x, o[1] - z) < 0.72 * (o[2] + sz))) return;
  trees.push([n(x), n(z), n(sz), n(r(), 3), n(r() * Math.PI * 2, 3)]);
};
for (let row = 0; row < 4; row++) for (let x = -640; x < 420; x += 15.5) {
  const jx = x + 5 * (r() - 0.5) + (row % 2) * 7, edge = Math.min(W.lip(jx), Math.sqrt(Math.max(0, W.LAND.rim ** 2 - jx * jx)));
  plant(jx, edge - 9 - row * 13 - 4 * r(), 7.6 + 2.2 * r());
}
console.log(`for picture 9's edge: ${slid} buildings slid back, ${lost} left where the land is not, ${kept} of the study's trees kept, ${trees.length - kept} planted along the new edge`);
const vents = P.vents().map((v) => [n(v.at[0]), n(v.at[1]), n(v.at[2]), v.long, v.wide, v.heat]);
const rows = (list) => list.map((r) => `  ${JSON.stringify(r).replace(/"/g, "'")},`).join('\n');

writeFileSync('src/pieces/world/placed.ts', `// Written by scripts/world/placed.mjs from the study's plan. Do not edit by hand: these are the places he approved.

export type Form = 'deco' | 'slab' | 'point' | 'step' | 'disc' | 'twin' | 'fin' | 'obelisk' | 'hall' | 'dome';
export type Roof = 'gold' | 'bronze' | 'plain';
// Each building: where it stands (x, z), how wide and deep it is, how tall, how far it is turned in degrees, its
// form, what its roof is made of, and a number of its own between 0 and 1.
export type Tower = readonly [x: number, z: number, w: number, d: number, tall: number, turn: number, form: Form, roof: Roof, seed: number];
export const TOWERS: readonly Tower[] = [
${rows(towers)}
];
// The stepped gold crown: the one building of the slice.
export const STEP = TOWERS.findIndex((t) => t[6] === 'step' && t[7] === 'gold');

// Each tree: where it stands (x, z), about half its crown's width, a number of its own, and how far it is turned.
export type Tree = readonly [x: number, z: number, size: number, tone: number, turn: number];
export const TREES: readonly Tree[] = [
${rows(trees)}
];

// Each small stream: where it leaves the rock (x, y, z), how long it is, how wide and how bright.
export type Vent = readonly [x: number, y: number, z: number, long: number, wide: number, heat: number];
export const VENTS: readonly Vent[] = [
${rows(vents)}
];
`);
// What broke away, as the study planned it: the field he was shown (reference/studies/65-*-what-broke-away.jpg).
// Every piece's place, how large it is, how it moves (plate, whirl, drift, tumble), how long and how flat it is,
// the family it moves with, and whether the study had it carry a piece of the land. It is written for the script
// that makes the debris, and is not part of the page.
const pieces = P.debris().map((d) => ({ at: d.at.map((v) => n(v, 1)), r: n(d.r, 2), kind: d.kind, long: n(d.long, 2), flat: n(d.flat, 2), family: d.family, ...(d.land ? { land: d.land } : {}) }));
writeFileSync('scripts/world/debris-plan.json', `${JSON.stringify({ from: 'src/hero-blockout/plan.ts, debris()', pieces })}\n`);
const kinds = {};
for (const d of pieces) kinds[d.kind] = (kinds[d.kind] ?? 0) + 1;
console.log(`placed: ${towers.length} buildings, ${trees.length} trees, ${vents.length} small streams, ${pieces.length} pieces of what broke away ${JSON.stringify(kinds)}`);
