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
// The city's third round, laid over picture 9 building by building off a ruled grid (scripts/world/grid.mjs), where
// two reviewers measured it thinner and blockier than the picture at its left end and wrong in three places beside
// the spire. Each entry is a building by its place in the list: where its top's middle is in the picture (px, py),
// how wide it is seen there (wide, in the picture's pixels), how far toward the visitor it stands (z) and, where the
// picture has another kind of building, its form. What is left out is kept as it is.
//   - Left of the spire a dark slab stood 50 pixels over the picture's skyline: it is the tower with the sloping
//     roof at 652, 161.
//   - The ringed pair is two fat banded drums side by side at 776 to 808, their tops at 174, in front of their
//     neighbours. What stood there is the pale tower behind them (790, 148), the slim one at 811 and the one at 836.
//   - The left end, 110 to 350 across: the picture packs sixteen narrow towers shoulder to shoulder, stepping up
//     toward the pyramid, over a low lit mass. The study had about six wide blocks with sky between them.
const AT = {
  10: { px: 652, py: 161, wide: 19 },
  9: { px: 792, py: 174, wide: 32, z: -21 },
  77: { px: 790, py: 148, wide: 16 },
  111: { px: 811, py: 163, wide: 11, z: -110, form: 'slab' },
  66: { px: 836, py: 174, wide: 15 },
  69: { py: 190 },
  // Right of the tall tower at 1048 across the picture has no building at all: a line of trees, and behind it a
  // pale dune that rises to 221 down at 1078 to 1140 across. Two buildings stood there. They stand deep in the
  // city now, behind its front rows, where they change nothing that is seen.
  49: { px: 1012, py: 226, z: -420 }, 67: { px: 1046, py: 229, z: -470 },
  // Two low blocks stood squarely before the spire's podium and hid its portal, where the picture shows the
  // spire's foot clear down to the trees. They stand behind it now.
  26: { px: 688, py: 236, z: -260 }, 40: { px: 702, py: 226, z: -330 },
  // Between the pyramid and the obelisk the picture is a solid wall of towers topping near 158: a block at 430 to
  // 450 across, a pale slab at 450 to 467, and a dark block before the obelisk's foot at 470 to 496. Ours stood 35
  // to 50 pixels lower there, with sky between them.
  87: { px: 440, py: 158, wide: 20 }, 56: { px: 458, py: 160, wide: 17, form: 'slab' }, 64: { px: 483, py: 163, wide: 26, z: 120 },
  101: { px: 126, py: 257, wide: 26 }, 95: { px: 133, py: 240, wide: 18 }, 17: { px: 151, py: 221, wide: 17 }, 107: { px: 164, py: 224, wide: 9, form: 'fin' },
  32: { px: 177, py: 213, wide: 20 }, 103: { px: 194, py: 240, wide: 13 }, 92: { px: 211, py: 205, wide: 16 }, 70: { px: 223, py: 222, wide: 14 },
  46: { px: 233, py: 228, wide: 11 }, 80: { px: 241, py: 192, wide: 17, form: 'deco' }, 97: { px: 254, py: 207, wide: 17 }, 12: { px: 272, py: 170, wide: 20, form: 'deco' },
  33: { px: 290, py: 200, wide: 17 }, 112: { px: 303, py: 212, wide: 10 }, 79: { px: 316, py: 186, wide: 17, form: 'deco' }, 13: { px: 341, py: 162, wide: 18 },
  15: { px: 118, py: 264, wide: 14, low: 0 }, 31: { px: 142, py: 252, wide: 18, low: 1 }, 16: { px: 160, py: 247, wide: 14, low: 2 }, 84: { px: 185, py: 250, wide: 16, low: 0 },
  71: { px: 203, py: 247, wide: 14, low: 1 }, 75: { px: 218, py: 251, wide: 14, low: 2 }, 18: { px: 236, py: 249, wide: 16, low: 0 }, 19: { px: 252, py: 247, wide: 14, low: 1 },
  105: { px: 266, py: 245, wide: 14, low: 2 }, 20: { px: 284, py: 243, wide: 16, low: 0 },
};
const LEFT_END = 350, seenWide = (t) => Math.abs(t[2] * Math.cos(t[5] * P.D2R)) + Math.abs(t[3] * Math.sin(t[5] * P.D2R));
const stand = (t, px, py, z) => {
  // Drawn in toward the middle of the land until it stands on it, its top kept where the picture has it.
  let depth = z;
  for (let k = 0; k < 120; k++) { const [x] = W.fromPicture(px, py, depth); if (W.within(x, depth) > 0.5 * size(t) + 8) break; depth -= depth > 0 ? 4 : -4; }
  const [x, y] = W.fromPicture(px, py, depth);
  t[0] = n(x); t[1] = n(depth); t[4] = n(Math.max(14, y - W.ground(x, depth)));
};
for (const [i, a] of Object.entries(AT)) {
  const t = towers[i], [cx, cy] = W.pictured(t[0], W.ground(t[0], t[1]) + t[4], t[1]), px = a.px ?? cx, py = a.py ?? cy;
  if (a.wide) { const k = (a.wide * W.PICTURE.unit) / seenWide(t); t[2] = n(t[2] * k); t[3] = n(t[3] * k); }
  if (a.form) t[6] = a.form;
  // At the left end the low lit mass stands in front, and the towers behind it by their height, the tallest furthest back.
  const z = a.z ?? (px > LEFT_END ? t[1] : a.low !== undefined ? 150 + 22 * a.low : Math.max(-300, 118 - 2.1 * (268 - py)));
  stand(t, px, py, z);
}
// Between the pyramid and the spire the picture's row of trees stands BEFORE the city's feet, which are hidden
// behind the crowns at about 255 down. Buildings whose feet were seen lower than that stood in front of where the
// row is: each goes straight back along the line of sight, its top kept, until its foot is behind the row.
for (const t of towers) {
  for (let k = 0; k < 60; k++) {
    const [px, py] = W.pictured(t[0], W.ground(t[0], t[1]), t[1]);
    if (px < 400 || px > 662 || py <= 252 || Math.hypot(t[0], t[1]) < W.COURT + size(t)) break;
    along(t, 6);
  }
}
// Any two of those at the left end that have come to stand in one another: the taller goes back, its top kept.
const left = Object.entries(AT).filter(([, a]) => (a.px ?? 1e9) <= LEFT_END).map(([i]) => towers[i]);
for (let pass = 0; pass < 200; pass++) {
  let moved = false;
  for (const a of left) for (const b of left) {
    if (a === b || a[4] < b[4] || Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.5 * (size(a) + size(b)) + 1.5) continue;
    const [px, py] = W.pictured(a[0], W.ground(a[0], a[1]) + a[4], a[1]);
    stand(a, px, py, a[1] - 5);
    moved = true;
  }
  if (!moved) break;
}
// The trees. Laid over picture 9, the study's belt was one thin row of small crowns with ground between them, and
// it ran across the pyramid's front, where the picture has none. The picture's belt is two to four crowns deep,
// its crowns are about a third larger, they stand in overlapping groups with uneven gaps, they are thickest right
// of the spire among the towers' feet, and a row stands behind the dunes. So: the study's trees that still have
// ground are kept, a third larger, and the belt is planted to the picture along the land's real edge.
const GROW = 1.35, r = P.seeded(31007);
// A place on the ground that is seen at a place in the picture.
const onGround = (px, py) => {
  let lo = -500, hi = 700;
  for (let i = 0; i < 40; i++) { const z = (lo + hi) / 2, q = W.fromPicture(px, py, z); if (q[1] > W.ground(q[0], z)) hi = z; else lo = z; }
  const q = W.fromPicture(px, py, lo);
  return [q[0], lo];
};
// No tree stands across the pyramid's front from its near corner to its right, as the picture has it. Left of
// that the picture's crowns overlap the pyramid's foot, and so do these.
const before = (x, z) => {
  const [qx, qz] = W.pyramidal(x, z), px = W.pictured(x, W.ground(x, z), z)[0];
  return px > 300 && px < 494 && z > W.PYRAMID.z - 20 && Math.max(Math.abs(qx), Math.abs(qz)) < W.PYRAMID.base / 2 + 70;
};
const trees = P.trees().map((t) => [n(t.x), n(t.z), n(t.size * GROW), n(t.tone, 3), n(t.turn, 3)]).filter((t) => W.within(t[0], t[1]) > t[2] && !before(t[0], t[1]) && !towers.some((b) => Math.hypot(b[0] - t[0], b[1] - t[1]) < 0.5 * size(b) + 0.3 * t[2]));
const kept = trees.length;
const plant = (x, z, sz) => {
  if (!clear(x, z, 0.6 * sz, 0.8 * sz) || before(x, z)) return;
  if (towers.some((b) => Math.hypot(b[0] - x, b[1] - z) < 0.52 * size(b) + 0.3 * sz)) return;
  if (trees.some((o) => Math.hypot(o[0] - x, o[1] - z) < 0.5 * (o[2] + sz))) return;
  trees.push([n(x), n(z), n(sz), n(r(), 3), n(r() * Math.PI * 2, 3)]);
};
for (let row = 0; row < 11; row++) for (let x = -645; x < 560; x += 12.5) {
  const jx = x + 7 * (r() - 0.5) + (row % 2) * 6, deep = row < 4 || (row < 7 && jx > 40 && jx < 560) || (jx > 30 && jx < 330), gap = W.noise(jx / 55 + row * 3.1, 4, row, 71) < 0.3 && r() < 0.7;
  const z = edgeAt(jx) - 9 - row * 11 - 5 * r(), sz = 10.5 * (0.7 + 0.6 * r()) * (row > 3 ? 0.9 : 1);
  if (deep && !gap) plant(jx, z, sz);
}
// The trees' third round, laid over picture 9, was short of it in four places, each planted here by where the
// picture has crowns (a tree's foot seen at a place in the picture, found with onGround):
//   - right of the spire, 700 to 960 across, the picture's belt is two or three crowns deep and climbs between the
//     towers' feet to about 222 down, its crowns of very different sizes. Ours stopped at 242 with paving showing;
//   - the knot of trees between the towers at 960 to 1050 across, 218 to 250 down, was not there;
//   - before the pyramid's left foot, 255 to 335 across, the picture's belt is two crowns deep and covers the foot
//     of the gold. Ours was one row of small trees;
//   - behind the dunes the picture has one even line of full crowns, 1063 to 1173 across and 227 to 242 down. Ours
//     were half that size and hidden by the sand.
const grove = (from, to, step, feet, sizes) => {
  for (const py of feet) for (let px = from; px <= to; px += step) {
    const [x, z] = onGround(px + 0.7 * step * (r() - 0.5), py + 3 * (r() - 0.5));
    plant(x, z, 10.5 * (sizes[0] + (sizes[1] - sizes[0]) * r() ** 1.6));
  }
};
grove(700, 960, 9.5, [254, 247, 240, 235], [0.7, 1.4]);
grove(960, 1050, 9, [252, 244, 237], [0.75, 1.35]);
grove(252, 336, 8.5, [296, 288, 281], [0.9, 1.3]);
for (let px = 1063; px <= 1174; px += 9.6) { const [x, z] = onGround(px + 2.5 * (r() - 0.5), 243 + 2 * (r() - 0.5)); trees.push([n(x), n(z), n(10.5 * (1.15 + 0.3 * r())), n(r(), 3), n(r() * Math.PI * 2, 3)]); }
// The trees' fourth round, laid over the picture again:
//   - left of the spire, 470 to 650 across, the picture's belt is ONE row of crowns hard against the city's feet,
//     250 to 265 down, with bare pale rock before it out to the lip. Ours stood three and four rows deep on that
//     rock. What stood further down the picture than 268 there is taken out, and the one row is planted;
//   - the picture's crowns are a quarter larger than ours were and overlap into one mass: every crown is a
//     quarter larger, where it stands.
for (let i = trees.length - 1; i >= 0; i--) { const t = trees[i], [px, py] = W.pictured(t[0], W.ground(t[0], t[1]), t[1]); if (px > 470 && px < 650 && py > 268) trees.splice(i, 1); }
grove(474, 646, 7.5, [262, 258], [0.9, 1.3]);
// Right of the spire the canopy climbs the buildings' feet to about 225 down, 45 pixels deep.
grove(712, 960, 9, [231, 227], [0.8, 1.4]);
// Before the spire's portal the picture has open paving, 668 to 708 across: crowns stood there and cut the podium
// off at its doors.
for (let i = trees.length - 1; i >= 0; i--) { const t = trees[i], [px] = W.pictured(t[0], W.ground(t[0], t[1]), t[1]); if (px > 668 && px < 708 && t[1] > 30) trees.splice(i, 1); }
// A wood has a few great trees: about one crown in nine is half as large again, so the belt is not a row of beads.
for (const t of trees) t[2] = n(t[2] * 1.25 * (r() < 0.11 ? 1.5 : 1));
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
