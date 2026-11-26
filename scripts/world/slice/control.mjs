// A control for the slice: sculpt S as it is, seen by the slice's ray caster and lit per pixel, as plain stone.
//   node scripts/world/slice/control.mjs [--ppu 1] [--out shots/slice/control.png]
import { read } from './read.mjs';
import { trace, EYE, through } from './tracer.mjs';
import { preview } from './preview.mjs';
import { save } from './store.mjs';
import { L, stone } from '../lib/plan.mjs';

const arg = (name, usual) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? usual : process.argv[i + 1]; };
const ppu = Number(arg('ppu', 1)), out = arg('out', 'shots/slice/control.png');
const rock = read('public/world/rock-s.bin').meshes.get('break'), skin = read('public/world/skin.bin').meshes.get('skin'), land = read('public/world/land.bin').meshes.get('ground');
const [cx, cy] = L.drawn(...L.CORE.at);
const window = { x: L.HOST.wide / 2 + cx - 434, y: cy - 200, w: 869, h: 518, ppu };
const meshes = [
  { name: 'rock', positions: rock.positions, indices: rock.indices, normals: rock.attributes.normal.data, seen: true },
  { name: 'skin', positions: skin.positions, indices: skin.indices, seen: false },
  { name: 'land', positions: land.positions, indices: land.indices, seen: false },
];
const t = await trace({ meshes, window, sub: Number(arg('sub', 2)), samples: { core: Number(arg('core', 4)), hemi: Number(arg('hemi', 4)), moon: 1 }, bounces: 2, albedo: stone(), hard: Number(arg('hard', 1)), onProgress: (p) => process.stdout.write(`\r${(p * 100).toFixed(0)}% `) });
console.log(`\n${t.W} x ${t.H} · ${t.stats.triangles} triangles · ${(t.stats.rays / 1e6).toFixed(1)}M rays · ${t.stats.seconds.toFixed(1)} s · ${(t.stats.raysPerSecond / 1e6).toFixed(2)}M rays a second`);
save(out.replace(/\.png$/, '.trace'), t);
preview(t, { out, albedo: stone() });
