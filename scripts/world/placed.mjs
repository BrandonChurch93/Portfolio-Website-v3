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
// One building the study stood straight in front of the spire, hiding its lower half, where the picture shows the
// spire clear down to the trees: it is a low hall there, not a tower.
const LOW = { 78: [34, 'hall'] };
const towers = P.towers().map((b, i) => [n(b.x), n(b.z), n(b.w), n(b.d), n(LOW[i]?.[0] ?? TALLER[i] ?? b.tall), n(b.turn / P.D2R), LOW[i]?.[1] ?? b.form, b.roof, n(b.seed, 5)]);
// The land's front edge is picture 9's (LIP in the new world's plan), bitten far deeper than the study's. So what
// the study stood near its own edge is put right for the picture's: a building too near the new edge to leave the
// belt of trees its room is slid straight back along the line of sight, with its top kept exactly where the picture
// has it, and the belt of trees is planted again along the new edge.
const W = await import(pathToFileURL(join(process.cwd(), 'src/pieces/world/layout.ts')).href);
const BELT = 46, size = (t) => Math.max(t[2], t[3]);
// Three buildings at the right that the picture has otherwise: two stood where the picture has only dunes, and
// are put where the picture has two towers the study left out (each by where its top is in the picture, and how
// far toward the visitor it stands), and one the study gave a gold flame is a plain stepped tower in the picture.
const PUT = { 5: [930, 183, -60], 14: [1012, 172, -90] }, PLAIN = { 4: 'deco' };
for (const [i, [px, py, z]] of Object.entries(PUT)) { const t = towers[i], [x, y] = W.fromPicture(px, py, z); t[0] = n(x); t[1] = n(z); t[4] = n(y - W.ground(x, z)); t[7] = 'plain'; }
for (const [i, form] of Object.entries(PLAIN)) { towers[i][6] = form; towers[i][7] = 'plain'; }
// The low hall that stood before the spire's portal stands behind the spire, so the portal is seen as the picture has it.
towers[78][1] = -128;
const clear = (x, z, r, pad) => {
  if (W.within(x, z) < pad || W.desert(x, z) > 0.02 || Math.hypot(x, z) < W.COURT + r + 4) return false;
  const [qx, qz] = W.pyramidal(x, z);
  return Math.max(Math.abs(qx), Math.abs(qz)) > W.PYRAMID.base / 2 + r + 6;
};
// First the whole city draws back from the bite. The study's city front stood a belt's depth behind the study's
// edge. Where picture 9's edge is further back than that, every building there retreats, the front rows by the
// whole difference and the ones behind them by less, each straight along the line of sight with its top kept where
// the picture has it. Then any two that have come to overlap are eased apart the same way.
const edgeAt = (x) => Math.min(W.lip(x), Math.sqrt(Math.max(0, W.LAND.rim ** 2 - x * x)));
const along = (t, back) => {
  const [px, py] = W.pictured(t[0], W.ground(t[0], t[1]) + t[4], t[1]), [x, y, z] = W.fromPicture(px, py, t[1] - back);
  t[0] = n(x); t[1] = n(z); t[4] = n(Math.max(18, y - W.ground(x, z)));
};
let drawn = 0;
towers.forEach((t) => {
  const retreat = P.front(t[0]) + 12 - (edgeAt(t[0]) - BELT - 12);
  if (retreat <= 0) return;
  along(t, retreat * Math.max(0.35, 1 - (P.front(t[0]) - t[1]) / 420));
  drawn++;
});
for (let pass = 0; pass < 60; pass++) for (let i = 0; i < towers.length; i++) for (let j = 0; j < i; j++) {
  const a = towers[i], b = towers[j];
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5 * (size(a) + size(b)) + 2) along(a[1] < b[1] ? a : b, 2);
}
for (const t of towers) for (let k = 0; k < 40 && Math.hypot(t[0], t[1]) < W.COURT + 0.5 * size(t) + 4; k++) along(t, -3);
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
// The trees. Laid over picture 9, the study's belt was one thin row of small crowns with ground between them, and
// it ran across the pyramid's front, where the picture has none. The picture's belt is two to four crowns deep,
// its crowns are about a third larger, they stand in overlapping groups with uneven gaps, they are thickest right
// of the spire among the towers' feet, and a row stands behind the dunes. So: the study's trees that still have
// ground are kept, a third larger, and the belt is planted to the picture along the land's real edge.
const GROW = 1.35, r = P.seeded(31007);
const before = (x, z) => { const [qx, qz] = W.pyramidal(x, z); return Math.abs(x - W.PYRAMID.x) < 0.5 * W.PYRAMID.base + 30 && z > W.PYRAMID.z - 20 && Math.max(Math.abs(qx), Math.abs(qz)) < W.PYRAMID.base / 2 + 70; };
const trees = P.trees().map((t) => [n(t.x), n(t.z), n(t.size * GROW), n(t.tone, 3), n(t.turn, 3)]).filter((t) => W.within(t[0], t[1]) > t[2] && !before(t[0], t[1]));
const kept = trees.length;
const plant = (x, z, sz) => {
  if (!clear(x, z, 0.6 * sz, 0.8 * sz) || before(x, z)) return;
  if (towers.some((b) => Math.hypot(b[0] - x, b[1] - z) < 0.55 * size(b) + 0.45 * sz)) return;
  if (trees.some((o) => Math.hypot(o[0] - x, o[1] - z) < 0.5 * (o[2] + sz))) return;
  trees.push([n(x), n(z), n(sz), n(r(), 3), n(r() * Math.PI * 2, 3)]);
};
for (let row = 0; row < 7; row++) for (let x = -645; x < 560; x += 12.5) {
  const jx = x + 7 * (r() - 0.5) + (row % 2) * 6, deep = row < 4 || (jx > 40 && jx < 560), gap = W.noise(jx / 55 + row * 3.1, 4, row, 71) < 0.3 && r() < 0.7;
  const z = edgeAt(jx) - 9 - row * 11 - 5 * r(), sz = 10.5 * (0.7 + 0.6 * r()) * (row > 3 ? 0.9 : 1);
  if (deep && !gap) plant(jx, z, sz);
}
// Behind the dunes: a row along the desert's far side.
for (let x = 330; x < 600; x += 12) for (let row = 0; row < 2; row++) {
  let z = edgeAt(x) - 20;
  while (z > -420 && W.desert(x, z) > 0.02) z -= 6;
  plant(x + 6 * (r() - 0.5), z - 10 - row * 12 - 4 * r(), 10.5 * (0.7 + 0.6 * r()));
}
console.log(`for picture 9's edge: ${drawn} buildings drawn back from the bite, ${slid} more slid back, ${lost} left where the land is not, ${kept} of the study's trees kept, ${trees.length - kept} planted along the new edge`);
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
