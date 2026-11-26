// The slice's hollow, looked at: the blocks of ./blocks.mjs seen by the ray caster and lit as the page will light them.
//   node scripts/world/slice/hollow.mjs [--ppu 1] [--out shots/slice/hollow.png] [--only name,name] [--fill 0]
//     [--win x,y,w,h] [--sub 2] [--core 4] [--hemi 4] [--line 0] [--bounces 2]: the part drawn and how finely it is lit
//     [--chip 0]: the blocks as they are, unbroken. [--deep --face --most --least --stop --step --lean --loose --flat
//     --tilt --calm]: how they are broken, each as ./chip.mjs names it. [--vary 0.05]: how far a piece's own tint may
//     be from its block's
// It keeps the trace beside the picture (.trace), which ./pack.mjs makes the page's pictures from.
import { read } from './read.mjs';
import { trace } from './tracer.mjs';
import { preview } from './preview.mjs';
import { save } from './store.mjs';
import { build, FRONT, SIDE, BACK, BEVEL, CHIP, CLEARED, TOP, JOINT } from './blocks.mjs';
import { chip } from './chip.mjs';
import { soup } from './solid.mjs';
import { L } from '../lib/plan.mjs';
import { STONE } from './stone.mjs';

const arg = (name, usual) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? usual : process.argv[i + 1]; };
const ppu = Number(arg('ppu', 1)), out = arg('out', 'shots/slice/hollow.png'), only = arg('only', '');
const t0 = performance.now();
let { blocks } = build({ only: only ? only.split(',') : null, fill: arg('fill', '1') !== '0' });
const coarse = blocks.length;
const [cx, cy] = L.drawn(...L.CORE.at);
// --win x,y,w,h: a part of it, in units from the core's own place (across, down).
const win = arg('win', '-434,-200,869,518').split(',').map(Number);
const window = { x: L.HOST.wide / 2 + cx + win[0], y: cy + win[1], w: win[2], h: win[3], ppu };
// Only what may be seen in the part that is drawn is broken finely: the rest only blocks light.
const within = (b) => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const f of b.faces) for (const p of f.pts) { const [hx, hy] = L.drawn(p[0], p[1], p[2]); x0 = Math.min(x0, hx); x1 = Math.max(x1, hx); y0 = Math.min(y0, hy); y1 = Math.max(y1, hy); }
  return x1 + L.HOST.wide / 2 > window.x - 20 && x0 + L.HOST.wide / 2 < window.x + window.w + 20 && y1 > window.y - 20 && y0 < window.y + window.h + 20;
};
if (arg('chip', '1') !== '0') {
  const pair = (name, usual) => arg(name, usual).split(',').map(Number);
  blocks = blocks.flatMap((b) => (within(b) ? chip(b, { deep: Number(arg('deep', 6)), face: Number(arg('face', 0.35)), most: Number(arg('most', 56)), least: pair('least', '22,10'), stop: pair('stop', '0.42,0.35'), step: pair('step', '0.12,0.18'), lean: Number(arg('lean', 0.24)), loose: Number(arg('loose', 0.12)), flat: Number(arg('flat', 1.5)), free: [FRONT, SIDE, BACK, BEVEL, CHIP, CLEARED, TOP, JOINT], share: { [JOINT]: 0.3 }, tilt: pair('tilt', '9,18'), calm: Number(arg('calm', 0.35)), seed: b.seed }) : [b]));
}
const mesh = soup(blocks), table = new Float32Array(blocks.length * 8);
blocks.forEach((b, i) => { const bed = b.bed ?? [0, 0, 1], l = Math.hypot(...bed) || 1; table.set([bed[0] / l, bed[1] / l, bed[2] / l, Math.min(1, Math.max(0, b.tint + ((b.cellOf ?? 0.5) - 0.5) * Number(arg('vary', 0.05)))), b.seed % 1000, b.kind, b.back ?? 0, 0], i * 8); });
console.log(`${coarse} blocks · ${blocks.length} solids · ${mesh.triangles} triangles · ${((performance.now() - t0) / 1000).toFixed(1)} s`);
const skin = read('public/world/skin.bin').meshes.get('skin'), land = read('public/world/land.bin').meshes.get('ground');
const meshes = [
  { name: 'rock', positions: mesh.positions, indices: mesh.indices, seen: true, block: mesh.of, tag: mesh.tag },
  { name: 'skin', positions: skin.positions, indices: skin.indices, seen: false },
  { name: 'land', positions: land.positions, indices: land.indices, seen: false },
];
const t = await trace({ meshes, window, sub: Number(arg('sub', 2)), samples: { core: Number(arg('core', 4)), hemi: Number(arg('hemi', 4)), moon: 1, line: Number(arg('line', 0)) }, line: { from: [...L.SOURCE], to: [L.SOURCE[0], -L.WORLD.deep, L.SOURCE[2]] }, bounces: Number(arg('bounces', 2)), albedo: STONE.tan, table, hard: Number(arg('hard', 1)), onProgress: (p) => process.stdout.write(`\r${(p * 100).toFixed(0)}% `) });
console.log(`\n${t.W} x ${t.H} · ${(t.stats.rays / 1e6).toFixed(1)}M rays · ${t.stats.seconds.toFixed(1)} s`);
save(out.replace(/\.png$/, '.trace'), t);
preview(t, { out, albedo: t.albedo, level: Number(arg('level', 0.5)) });
