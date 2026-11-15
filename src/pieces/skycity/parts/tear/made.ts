import { seeded } from '../../../../world/build';
import { KIND } from './layers';
import { normal, point, type Table } from './shape';
import { type Frame, type Sink, type V3, block, turn } from './sink';

// What was made in the ground and torn through with it, only where the way to the spire came to the edge: the end of
// its road, the pipes and the culvert under it, and one foundation. Everywhere else the section under the edge is
// land.

const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const unit = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

// The face's frame at a bearing and a depth under the edge: x along the edge, y up the face, z out of it.
function frameAt(T: Table, deg: number, q: number): Frame {
  const o = point(T, deg, q) as V3, z = normal(T, deg, q) as V3;
  const x = unit(cross([0, 1, 0], z)), y = cross(z, x);
  return { o, x, y, z };
}
const at = (f: Frame, lx: number, ly: number, lz: number): V3 => add(add(add(f.o, f.x, lx), f.y, ly), f.z, lz);

// A tube cut across: its wall in a metal or in stone, dark inside, standing a little out of the face.
function tube(s: Sink, f: Frame, rad: number, wall: number, out: number, kind: number, tone: number): void {
  const n = Math.max(10, Math.round(rad * 4)), cell = [tone, 0, 0, kind], dark = [0, 0, 0, KIND.hole];
  const deep = -10;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    const ro = rad, ri = rad - wall;
    const o0 = at(f, c0 * ro, s0 * ro, out), o1 = at(f, c1 * ro, s1 * ro, out), b0 = at(f, c0 * ro, s0 * ro, deep), b1 = at(f, c1 * ro, s1 * ro, deep);
    const i0 = at(f, c0 * ri, s0 * ri, out), i1 = at(f, c1 * ri, s1 * ri, out), d0 = at(f, c0 * ri, s0 * ri, deep), d1 = at(f, c1 * ri, s1 * ri, deep);
    const n0 = unit([f.x[0] * c0 + f.y[0] * s0, f.x[1] * c0 + f.y[1] * s0, f.x[2] * c0 + f.y[2] * s0]);
    const n1 = unit([f.x[0] * c1 + f.y[0] * s1, f.x[1] * c1 + f.y[1] * s1, f.x[2] * c1 + f.y[2] * s1]);
    s.tri(b0, b1, o1, cell, n0, n1, n1);
    s.tri(b0, o1, o0, cell, n0, n1, n0);
    s.tri(o0, o1, i1, [tone, 0, 1, kind], f.z, f.z, f.z);
    s.tri(o0, i1, i0, [tone, 0, 1, kind], f.z, f.z, f.z);
    const m0: V3 = [-n0[0], -n0[1], -n0[2]], m1: V3 = [-n1[0], -n1[1], -n1[2]];
    s.tri(i0, i1, d1, dark, m0, m1, m1);
    s.tri(i0, d1, d0, dark, m0, m1, m0);
  }
}

// A foundation cut through: its slab and the stubs of its walls, standing a little proud of the face where the softer
// ground round it fell away, its bars bent where it broke.
function foundation(s: Sink, f: Frame, w: number, h: number, r: () => number): void {
  const t = mix(1.6, 2.4, r()), out = mix(1, 3.5, r()), tone = r();
  const slab = (cx: number, cy: number, hx: number, hy: number) => {
    const g: Frame = turn({ o: at(f, cx, cy, out - 6), x: f.x, y: f.y, z: f.z }, 0, 0, (r() - 0.5) * 0.04);
    block(s, g, hx, hy, 6, 0.35, [tone, 0, 1, KIND.concrete]);
  };
  slab(-w * 0.1, h / 2 - t / 2, w * 0.4 + 1.5 * r(), t / 2);
  slab(-w / 2 + t / 2, h * 0.05, t / 2, h * 0.4);
  slab(w * 0.2, h / 2 - t * 1.5, t / 2, t * 0.9);
  // Bars of its frame, bent where it broke.
  for (let k = 0; k < 3; k++) {
    const bx = mix(-w / 2, w / 2, r()), by = k === 0 ? h / 2 - t / 2 : -h / 2 + t / 2;
    const g: Frame = turn({ o: at(f, bx, by, out + 2), x: f.x, y: f.y, z: f.z }, mix(-0.5, 0.5, r()), mix(-0.5, 0.5, r()), 0);
    block(s, g, 0.45, 0.45, 2.6, 0.1, [0.3, 0, 0, KIND.bronze]);
  }
}

export function made(s: Sink, T: Table): void {
  const r = seeded(2718);
  // The ends of the roads that reached the edge, the way to the spire and two avenues: each its slab, standing out
  // over the face where the ground under it went.
  for (const deg of [0.4, 45.3, 89.6]) {
    const f = frameAt(T, deg, 3.5);
    const g: Frame = turn({ ...f, o: at(f, 0, 0, -2.5) }, 0.06 + 0.05 * r(), 0, (r() - 0.5) * 0.08);
    block(s, g, deg < 1 ? 11 : 7, 3, 6, 0.5, [0.2 + 0.3 * r(), 0, 1, KIND.concrete]);
  }
  {
    tube(s, frameAt(T, -1.6, 14), 2.6, 0.5, 2.5, KIND.copper, 0.5);
    tube(s, frameAt(T, 2.1, 17), 1.6, 0.4, 1.8, KIND.bronze, 0.4);
  }
  // A culvert of stone that drained the way, cut across beside it, and a foundation of the city's last building
  // before the forest, broken off where the land went.
  tube(s, frameAt(T, -8.5, 17), 5.2, 1.6, 2.0, KIND.concrete, 0.6);
  foundation(s, turn(frameAt(T, 11.5, 15), 0, 0, 0.05), 17, 11, r);
  foundation(s, turn(frameAt(T, 31, 14), 0, 0, -0.06), 21, 12, r);
  foundation(s, turn(frameAt(T, 67, 16), 0, 0, 0.04), 15, 10, r);
}
