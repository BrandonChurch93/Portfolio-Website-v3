import { CORE, D2R, VIEW, drawn } from '../../pieces/world/layout';
import { KIND, MOTION as M } from '../../pieces/world/parts/debris/motion';
import type { Chip, Group, Ride } from './plan';

// How the pictures of what broke away drift: the live field's own motion (the vertex shader of
// src/pieces/world/parts/debris/shaders.ts), worked out here for the middle of each family in place of every
// vertex. Each returns where a thing is drawn against where it rests, in units of the board.

const TAU = Math.PI * 2;
const hash = (n: number): number => { const v = Math.sin(n * 12.9898 + 4.1414) * 43758.5453; return v - Math.floor(v); };
type V3 = readonly [number, number, number];
const turnY = (a: number, [x, y, z]: V3): [number, number, number] => { const c = Math.cos(a), s = Math.sin(a); return [x * c + z * s, y, -x * s + z * c]; };
const calm = (fam: number): number => ((M.calm.families as readonly number[]).includes(fam) ? M.calm.share : 1);
const plate = (fam: number, t: number): [number, number, number] => {
  const k = calm(fam);
  return [k * M.plate.slide * Math.sin((TAU * t) / M.plate.slideT + hash(fam * 1.7) * TAU), k * M.plate.rise * Math.sin((TAU * t) / M.plate.riseT + hash(fam * 2.9) * TAU), k * 0.35 * M.plate.slide * Math.sin((TAU * t) / (M.plate.slideT * 1.37) + hash(fam * 5.3) * TAU)];
};
const moved = (from: V3, to: V3): [number, number] => { const a = drawn(from[0], from[1], from[2]), b = drawn(to[0], to[1], to[2]); return [b[0] - a[0], b[1] - a[1]]; };

// A family's pictures at a time: how far across and down they have moved, and how far they have turned, in degrees.
export function drift(g: Group, t: number): [number, number, number] {
  const f = g.family, [x, y, z] = g.at, fa = hash(f * 1.7) * TAU, fb = hash(f * 2.9) * TAU, fc = hash(f * 5.3) * TAU;
  let to: [number, number, number] = [x, y, z], turn = 0;
  if (g.kind === KIND.plate) {
    const d = plate(f, t), e = VIEW.el * D2R, away = [CORE.at[0] - x, CORE.at[1] - y, CORE.at[2] - z], long = Math.hypot(away[0], away[1], away[2]) || 1;
    to = [x + d[0], y + d[1], z + d[2]];
    // It rocks about the line to the core: what of that is a turn in the picture's own plane.
    turn = (calm(f) * M.plate.rock * Math.sin((TAU * t) / M.plate.rockT + fc) * (away[1] * Math.sin(e) + away[2] * Math.cos(e))) / long / D2R;
  } else if (g.kind === KIND.ring && g.plate) {
    const p = g.plate, swing = M.ring.swing * Math.sin((TAU * t) / M.ring.swingT + hash(p.family * 3.1) * TAU), round = turnY(swing, [x - p.at[0], y - p.at[1], z - p.at[2]]), d = plate(p.family, t);
    to = [p.at[0] + round[0] + d[0], p.at[1] + round[1] + d[1], p.at[2] + round[2] + d[2]];
  } else if (g.kind === KIND.clump) {
    to = [x + M.clump.slide * Math.sin((TAU * t) / M.clump.slideT + fa), y + M.clump.rise * Math.sin((TAU * t) / M.clump.riseT + fb), z + M.clump.deep * Math.sin((TAU * t) / (M.clump.slideT * 1.41) + fc)];
  } else if (g.kind === KIND.whirl) {
    const rel: V3 = [x, 0, z - CORE.at[2]], period = M.whirl.swingT[0] + (M.whirl.swingT[1] - M.whirl.swingT[0]) * hash(f * 7.7), now = turnY(g.extra * Math.sin((TAU * t) / period + fa), rel);
    to = [now[0], y - M.whirl.tilt * (now[2] - rel[2]), now[2] + CORE.at[2]];
  } else if (g.kind === KIND.dust) {
    const now = turnY(M.dust.turn * Math.sin((TAU * t) / M.dust.turnT + fa), [x, 0, z - CORE.at[2]]);
    to = [now[0], y + M.dust.rise * Math.sin((TAU * t) / M.dust.riseT + fb), now[2] + CORE.at[2]];
  } else if (g.kind === KIND.scatter) {
    to = [x + M.scatter.slide * Math.sin((TAU * t) / M.scatter.slideT + fa), y + M.scatter.rise * Math.sin((TAU * t) / M.scatter.riseT + fb), z];
  }
  return [...moved(g.at, to), turn];
}

// Where along its fall a chip is, 0 at the break and 1 at the foot, and so where it is in the world.
const along = (c: Chip, t: number): number => { const span = M.fall.from - M.fall.to, u = (M.fall.from - c.at[1]) / span + (c.pace * t) / span; return u - Math.floor(u); };
const fallen = (c: Chip, u: number): [number, number, number] => {
  const s = u ** M.fall.gather, k = 1 - M.fall.pull * s, back = CORE.at[2] - M.fall.behind;
  return [c.at[0] * k, M.fall.from - (M.fall.from - M.fall.to) * s, back + (c.at[2] - back) * k];
};
// Where a chip rests, which is where its picture was taken, as the middle of it in the host, in units from the
// host's top left.
export function rests(c: Chip, wide: number): [number, number] { const p = fallen(c, along(c, 0)), d = drawn(p[0], p[1], p[2]); return [wide / 2 + d[0], d[1]]; }
// A chip the stream carries, at a time: the middle of it in the host, and the share of its size it is drawn at. It
// grows in under the break and is gone by the stream's leading end, or by the foot of its fall. `run` is how far
// under the core's foot the stream has run, in units.
export function carried(c: Chip, t: number, run: number, wide: number): [number, number, number] {
  const p = fallen(c, along(c, t)), d = drawn(p[0], p[1], p[2]), end = Math.max(M.fall.to, CORE.at[1] - CORE.r - run);
  const ease = (a: number, b: number, v: number): number => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  return [wide / 2 + d[0], d[1], ease(M.fall.from, M.fall.from - M.fall.fade, p[1]) * ease(end, end + M.fall.fade, p[1])];
}

// A shard riding the neck of light, at a time: the middle of it in the host, the share of its size it is drawn at,
// and whether it is behind the neck. It runs down beside the neck and round the back of it, again and again, each
// run from a place of its own, as the live ones do (RIDER_VERT in src/pieces/world/parts/core/riders.ts).
export function ridden(i: number, R: Ride, t: number, run: number, wide: number): [number, number, number] {
  const rnd = (n: number): number => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };
  const mix = (a: number, b: number, k: number): number => a + (b - a) * k, ease = (a: number, b: number, v: number): number => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  const a = rnd(i + 0.37), b = rnd(i * 2.3 + 1.1), c = rnd(i * 3.7 + 2.9), out = rnd(i * 5.1 + 4.3), round = rnd(i * 6.7 + 0.9);
  const period = mix(R.time[0], R.time[1], c), laps = t / period + a * 7.31, lap = Math.floor(laps), u = laps - lap;
  const from = mix(R.from[0], R.from[1], mix(b, rnd(lap * 3.7 + a * 91), 0.6) ** (1 / R.from[2])), d = from + mix(R.run[0], R.run[1], rnd(lap * 1.3 + c * 17)) * u;
  const life = ease(0, 0.12, u) * (1 - ease(0.85, 1, u)) * (1 - ease(R.cut, R.cut + R.past, d)) * ease(0, 30, run - d) * ease(4, 16, d);
  const ring = R.rib + R.flare[0] * Math.exp(-d / R.flare[1]) + R.body[0] * Math.exp(-d / R.body[1]) + mix(R.out[0], R.out[1], out);
  const turn = round * TAU + t * mix(R.turn[0], R.turn[1], rnd(a * 5.1)) * (rnd(b * 3.3) < 0.5 ? -1 : 1);
  const p = drawn(CORE.at[0] + ring * Math.cos(turn), CORE.at[1] - CORE.r - d, CORE.at[2] - Math.abs(ring * Math.sin(turn)));
  return [wide / 2 + p[0], p[1], life];
}
