// The city: every building of TOWERS (src/pieces/world/placed.ts) that stands on the land, each built by its design
// (./designs.mjs, and ./step-form.mjs for the stepped tower), then lit together, so neighbours shade each other and
// lit windows warm the walls across the street, and packed as one mesh for each of the three materials:
// public/world/towers-city.bin and public/world/towers-city-windows.png, the state of every window.
//
//   node scripts/world/parts/towers/city.mjs [--draft] [--only 0,2,3]
// --only builds those buildings alone (the rest stay plain stand ins), for working on a design.
import { L, P, linear } from '../../lib/plan.mjs';
import { Kit } from './kit.mjs';
import { design } from './designs.mjs';
import { layers } from './layers.mjs';
import { boxesOf, finish, gather } from './make.mjs';
import { placeOf } from './site.mjs';
import { stepTower } from './step-form.mjs';
import { Windows } from './windows.mjs';
import { STONES } from '../../../../src/pieces/world/parts/towers/windows.ts';

const draft = process.argv.includes('--draft');
const onlyAt = process.argv.indexOf('--only'), only = onlyAt > 0 ? new Set(process.argv[onlyAt + 1].split(',').map(Number)) : null;
// The map of the windows, in windows across and down; how finely faces are cut for their baked light, in units; the stones
// a building may be built of, as places in STONES (./windows.ts), and how likely each is: never the first, his stepped
// tower's limestone.
const CITY = { map: [1024, 128], edge: draft ? 10 : 11, tones: [[1, 0.2], [2, 0.22], [3, 0.2], [4, 0.14], [5, 0.1], [6, 0.06], [7, 0.08]], seed: 9151 };
// The named buildings' stone, as a place in STONES: the obelisk's shaft a brown, as picture 9's is a mid brown lit
// by its windows, and the ringed pair a mid tan.
const TONE = { 0: 3, 2: 2, 3: 3, 4: 1, 5: 4, 9: 1, 10: 2, 11: 3 };
// How busy a building is, how many of its rooms are lit: most are busy and some nearly dark, so the city's light
// comes in clumps, whole buildings blazing beside quiet ones (dark: how likely a quiet one is). The low buildings
// at the front are all busy: the picture's lit mass.
const BUSY = { dark: 0.24, quiet: [0.04, 0.16], lively: [0.55, 0.45], low: 45 };
// How a building is seen. The view is all but square on (9000 units back), so a building turned only the plan's few
// degrees showed one face and read as a flat: each is turned further, its front toward the visitor's left, so its
// right face shows, as picture 9's buildings show theirs, and the moon to the right lights it while the front stays
// in the city's own light. turn: the plan's turn and `add` degrees, give or take `jitter`, kept between `range`; its
// footprint is made smaller so it is drawn exactly as wide as the plan has it. Round buildings, his stepped tower,
// the obelisk and the sun disc stand as the plan has them. --square builds the city as the plan turns it.
const SEEN = { add: -22, jitter: 5, range: [-34, -12], keep: [0, 2] };
const square = process.argv.includes('--square');
const round = (i) => { const [, , w, , tall, , form, roof, seed] = P.TOWERS[i]; return i === 9 || (form === 'dome' && tall > 60) || (form === 'deco' && roof === 'bronze' && seed > 0.55 && w < 34); };
function seenAs(i) {
  const [, , w, d, , turn] = P.TOWERS[i];
  if (square || i === P.STEP || SEEN.keep.includes(i) || round(i)) return { w, d, turn };
  const t = Math.min(SEEN.range[1], Math.max(SEEN.range[0], turn + SEEN.add + SEEN.jitter * (2 * L.seeded(i * 7741 + 13)() - 1)));
  const wide = (a) => w * Math.abs(Math.cos(a * L.D2R)) + d * Math.abs(Math.sin(a * L.D2R)), k = wide(turn) / wide(t);
  return { w: w * k, d: d * k, turn: t };
}
// The street's light on the ground about each building, as radiance at its brightest, how far out from a wall it is
// brightest and how wide that band is, in units. The ground's own color.
const STREET = { power: 1.1, at: 4, wide: 7 }, GROUND = 0.05;

const on = [];
P.TOWERS.forEach(([x, z, w, d], i) => { if (L.within(x, z) >= 0.6 * Math.max(w, d) && (!only || only.has(i))) on.push(i); });
const win = new Windows(CITY.seed, CITY.map), made = [], ids = [], chosen = new Map(), tones = new Array(STONES.length).fill(0);
// The buildings near enough to one already built to be seen beside it: across, so far apart beyond their half widths,
// and back, within so far.
const NEAR = { across: 16, back: 90 };
const near = (i) => [...chosen.keys()].filter((j) => Math.abs(P.TOWERS[i][0] - P.TOWERS[j][0]) < (P.TOWERS[i][2] + P.TOWERS[j][2]) / 2 + NEAR.across && Math.abs(P.TOWERS[i][1] - P.TOWERS[j][1]) < NEAR.back);
for (const i of on) {
  const [x, z, , , tall, , form, roof, seed] = P.TOWERS[i], { w, d, turn } = seenAs(i);
  const R = L.seeded(Math.round(seed * 1e6) + i * 7919), kit = layers();
  if (i === P.STEP) stepTower(kit, win, draft);
  else {
    const make = design({ form, roof, seed, w: P.TOWERS[i][2] });
    if (!make) continue;
    const c = Math.cos(turn * L.D2R), s = Math.sin(turn * L.D2R), g0 = L.ground(x, z);
    let low = g0;
    for (const [u, v] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) low = Math.min(low, L.ground(x + u * c + v * s, z - u * s + v * c));
    let stone = TONE[i];
    if (stone === undefined) { let r = R(); stone = CITY.tones.find(([, p]) => (r -= p) < 0)?.[0] ?? 1; }
    const quiet = tall > BUSY.low && R() < BUSY.dark, busy = quiet ? BUSY.quiet[0] + BUSY.quiet[1] * R() : BUSY.lively[0] + BUSY.lively[1] * R();
    const avoid = {};
    for (const j of near(i)) for (const [what, kinds] of Object.entries(chosen.get(j))) for (const k of kinds) (avoid[what] ??= new Set()).add(k);
    const b = { kit, win, R, E: CITY.edge, draft, tone: stone / (STONES.length - 1), vary: R(), lay: 0, busy, mood: i * 1.37, sink: g0 - low + 1.5, avoid, chosen: {} };
    make(b, { w, d, tall, roof, form, seed, i });
    chosen.set(i, b.chosen);
    tones[stone]++;
  }
  made.push(kit.meshes(placeOf(x, z, turn)));
  ids.push(i);
}

// What stands round the city in the bake and is not kept: the ground, lit by the street about each building, the
// spire and the pyramid as plain solids.
function around() {
  const step = draft ? 10 : 5, half = 680, n = Math.round((2 * half) / step) + 1, pos = [], nor = [], emit = [], idx = [], at = new Int32Array(n * n).fill(-1);
  const hot = linear('hot'), feet = on.map((i) => { const s = seenAs(i); return [P.TOWERS[i][0], P.TOWERS[i][1], s.w, s.d, 0, s.turn]; });
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -half + i * step, z = -half + j * step;
    if (L.within(x, z) < -step * 2) continue;
    at[j * n + i] = pos.length / 3;
    pos.push(x, L.ground(x, z) - 0.3, z);
    nor.push(0, 1, 0);
    let k = 0;
    for (const [bx, bz, w, d, , turn] of feet) {
      const c = Math.cos(turn * L.D2R), s = Math.sin(turn * L.D2R), u = (x - bx) * c - (z - bz) * s, v = (x - bx) * s + (z - bz) * c;
      const out = Math.hypot(Math.max(0, Math.abs(u) - w / 2), Math.max(0, Math.abs(v) - d / 2));
      if (out > 0) k = Math.max(k, STREET.power * Math.exp(-(((out - STREET.at) / STREET.wide) ** 2)));
    }
    emit.push(...hot.map((h) => Math.PI * k * h));
  }
  for (let j = 0; j + 1 < n; j++) for (let i = 0; i + 1 < n; i++) {
    const a = at[j * n + i], b = at[j * n + i + 1], c = at[(j + 1) * n + i], d = at[(j + 1) * n + i + 1];
    if (a < 0 || b < 0 || c < 0 || d < 0) continue;
    idx.push(a, c, b, b, c, d);
  }
  const solids = new Kit({ block: { width: 0 } });
  solids.prism('block', [[-14, 14], [14, 14], [14, -14], [-14, -14]], -2, L.SPIRE.tall, { top: true, shrink: 0.05, edge: 40 });
  const ph = L.PYRAMID.base / 2, pc = Math.cos(L.PYRAMID.turn * L.D2R), ps = Math.sin(L.PYRAMID.turn * L.D2R), pg = L.ground(L.PYRAMID.x, L.PYRAMID.z);
  solids.prism('block', [[-ph, ph], [ph, ph], [ph, -ph], [-ph, -ph]].map(([u, v]) => [L.PYRAMID.x + u * pc + v * ps, L.PYRAMID.z - u * ps + v * pc]), pg - 2, pg + L.PYRAMID.tall, { top: false, shrink: 0.02, edge: 40 });
  const sm = solids.meshes(new Array(16).fill(0).map((_, k) => (k % 5 === 0 ? 1 : 0))).block;
  const dark = [GROUND, GROUND * 0.85, GROUND * 0.7];
  return [
    { name: 'ground', positions: new Float32Array(pos), normals: new Float32Array(nor), indices: new Uint32Array(idx), albedo: dark, emit: new Float32Array(emit), receive: false },
    { name: 'solids', positions: sm.positions, normals: sm.normals, indices: sm.indices, albedo: dark, receive: false },
  ];
}

const stands = on.filter((i) => i === P.STEP || design({ ...{ form: P.TOWERS[i][6], roof: P.TOWERS[i][7], seed: P.TOWERS[i][8], w: P.TOWERS[i][2] } }));
console.log(`city: ${made.length} buildings (of each stone ${tones.join(', ')}), windows map ${win.used} of ${win.tall} rows used`);
// What shades the faces of the city from the sky about the moon: every building that stands, and the spire.
const boxes = boxesOf([...on.map((i) => { const [x, z, , , tall] = P.TOWERS[i], { w, d, turn } = seenAs(i); return [x, z, w, d, tall, turn, L.ground(x, z), i]; }), [0, 0, L.SPIRE.foot, L.SPIRE.foot, L.SPIRE.tall * 0.8, 0, L.ground(0, 0), -2]]);
await finish({ made: gather(made, ids), win, around: around(), file: 'towers-city', draft, meta: { design: 'city', stands }, boxes });
