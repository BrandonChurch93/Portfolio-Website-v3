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
const trees = P.trees().map((t) => [n(t.x), n(t.z), n(t.size), n(t.tone, 3), n(t.turn, 3)]);
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
console.log(`placed: ${towers.length} buildings, ${trees.length} trees, ${vents.length} small streams`);
