import * as THREE from 'three';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';
import { seeded, slice } from '../../../../world/build';
import { HEART, TEAR, VENTS, drawn } from '../../layout';
import { KIND, LAYER, layerOf } from './layers';
import { D2R, HANG, endAt, point, type Table } from './shape';
import { fits } from './rock';
import { type Frame, type Sink, type V3, chunk, turn } from './sink';

// What hangs from the underside: broken masses that have not yet fallen, lowest round the core, each a few blocks
// stepping down and turning as they go, not a fringe of points. The six vents are masses of their own, split up
// from the tip, with the stream's light inside the split. And a few slabs hang from the lip over the opening, in
// front of the core's edge.

const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const unit = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

const core = drawn(HEART[0], HEART[1], HEART[2]);
const vents = VENTS.map((v) => drawn(v[0], v[1], v[2]));
// Whether a point would be drawn below a vent's tip in its column, or over the core where it must be seen.
function blocked(p: V3, pad: number): boolean {
  const [x, y] = drawn(p[0], p[1], p[2]);
  for (let i = 0; i < vents.length; i++) if (Math.abs(x - vents[i][0]) < 9 + pad && y > vents[i][1] - 6) return true;
  return p[2] > -40 && Math.hypot(x - core[0], y - core[1]) < 150 + pad;
}

// A hanging mass: from a root on the underside, blocks stepping down, each narrower, turned its own way.
function mass(s: Sink, root: V3, long: number, wide: number, r: () => number, lay: number, vent = false): void {
  let at = root, w = wide, d = wide * mix(0.6, 0.9, r()), left = long;
  const tilt = mix(-0.25, 0.25, r());
  for (let k = 0; left > 3 && k < 4; k++) {
    const h = Math.min(left, mix(0.45, 0.7, r()) * long + 4);
    const f: Frame = turn({ o: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, (r() - 0.5) * 0.3, r() * Math.PI, tilt + (r() - 0.5) * 0.35);
    f.o = add(at, [0, -h / 2 + 2, 0]);
    if (!vent && !fits(f, w / 2, h / 2 + 2, d / 2)) break;
    chunk(s, f, w / 2, h / 2 + 2, d / 2, [r(), lay, 0, KIND.rock], r, mix(0.1, 0.35, r()), (r() - 0.5) * 0.3);
    at = add(at, [(r() - 0.5) * w * 0.4, -h + 1.5, (r() - 0.5) * d * 0.3]);
    left -= h - 1.5;
    w *= mix(0.55, 0.78, r());
    d *= mix(0.6, 0.85, r());
  }
}

// The masses along the lowest of the underside, on the bearings that can be seen.
export async function masses(s: Sink, T: Table): Promise<void> {
  const r = seeded(31337);
  for (let deg = -112; deg <= 112;) {
    deg += mix(2.2, 6.5, r());
    if (Math.abs(deg) < 24) continue;
    // The lowest the underside comes on this bearing, as the visitor sees it.
    const end = endAt(T, deg);
    let best = 0, bq = 0;
    for (let q = 40; q < end - 4; q += 4) {
      const p = point(T, deg, q) as V3, dy = drawn(p[0], p[1], p[2])[1];
      if (dy > best) { best = dy; bq = q; }
    }
    if (!bq) continue;
    const q = bq + (r() - 0.5) * 30, p = point(T, deg, Math.max(40, Math.min(end - 4, q))) as V3;
    const big = r();
    const long = mix(10, 34, big * big) + (Math.abs(deg) < 75 ? 10 * r() : 0), wide = mix(10, 26, r()) * (0.7 + 0.6 * big);
    const tip: V3 = [p[0], Math.max(TEAR.low + 4, p[1] - long), p[2]];
    if (blocked(tip, wide * 0.5) || blocked(p, wide * 0.5)) continue;
    mass(s, add(p, [0, 6, 0]), p[1] + 6 - tip[1], wide, r, layerOf(p[0], p[1], p[2]));
    await slice();
  }
}

// The six vents. Each is a broken mass that hangs from the underside to its lowest point, exactly at the vent's
// point, split from there up: the stream's light fills the split, brightest at its foot and spent a little way up,
// and spills onto the broken rock round the opening. Its foot is blunt and broken, not a point.
const ventHull = new ConvexHull();
export function vents6(s: Sink, T: Table): void {
  const r = seeded(808);
  VENTS.forEach((v, i) => {
    // The underside over the vent, wherever it is: the mass hangs from there.
    const deg = Math.atan2(v[0], v[2]) / D2R;
    let over = v[1] + HANG[i], best = Infinity;
    for (let q = 20; q < endAt(T, deg); q += 2) {
      const p = point(T, deg, q), dd = Math.hypot(p[0] - v[0], p[2] - v[2]);
      if (dd < best) { best = dd; over = p[1]; }
    }
    const split = Math.min(26, Math.max(16, (over - v[1]) * 0.6));
    const top = v[1] + split, long = split;
    if (over - top > 4) mass(s, [v[0] + (r() - 0.5) * 3, over + 8, v[2] - 2], over + 8 - top + 3, mix(20, 28, r()), r, LAYER.mantle, true);
    const gap = 4.4;
    for (const k of [-1, 1]) {
      const w = mix(9, 13, r()) * (k === Math.sign(v[0]) ? 1.3 : 1), dz = mix(11, 15, r());
      const xi = v[0] + k * gap * 0.5;
      const pts: THREE.Vector3[] = [];
      const add3 = (x: number, y: number, z: number) => pts.push(new THREE.Vector3(x, y, z));
      for (let n = 0; n < 9; n++) add3(xi + k * w * (0.1 + 0.9 * r()), top - 6 * r(), v[2] + (r() - 0.5) * dz);
      add3(xi + k * 0.2, top, v[2] + dz * 0.45); add3(xi + k * 0.2, top, v[2] - dz * 0.45);
      for (let n = 0; n < 7; n++) add3(xi + k * w * (0.3 + 0.8 * r()), v[1] + long * mix(0.2, 0.75, r()), v[2] + (r() - 0.5) * dz * 1.1);
      add3(xi + k * 0.2, v[1] + long * 0.5, v[2] + dz * 0.35); add3(xi + k * 0.2, v[1] + long * 0.5, v[2] - dz * 0.35);
      // The foot: blunt, broken, its inner corner on the vent.
      add3(xi, v[1], v[2] + 1.6); add3(xi, v[1], v[2] - 1.6);
      add3(xi + k * mix(5, 8, r()), v[1] + mix(2, 5, r()), v[2] + (r() - 0.5) * 4);
      add3(xi + k * mix(3, 6, r()), v[1] + mix(0.5, 2, r()), v[2] + 3.4);
      add3(xi + k * mix(3, 6, r()), v[1] + mix(0.5, 2, r()), v[2] - 3.4);
      ventHull.setFromPoints(pts);
      const tone = r();
      for (const fc of ventHull.faces) {
        const n = fc.normal, e0 = fc.edge, a0 = e0.head().point;
        // Toward the split it is lit from inside; round the opening the light spills onto the rock.
        const inward = -k * n.x > 0.55;
        let lowest = Infinity;
        let e = e0;
        do { lowest = Math.min(lowest, e.head().point.y); e = e.next; } while (e !== e0);
        const cell = inward ? [tone, v[1], 1, KIND.vent] : lowest < v[1] + 9 ? [tone, v[1], 0.3, KIND.vent] : [tone, LAYER.basalt, 0, KIND.rock];
        e = e0.next;
        while (e.next !== e0) {
          s.tri([a0.x, a0.y, a0.z], [e.head().point.x, e.head().point.y, e.head().point.z], [e.next.head().point.x, e.next.head().point.y, e.next.head().point.z], cell);
          e = e.next;
        }
      }
    }
    // The back of the split, where its light is brightest.
    const bx0 = v[0] - gap * 0.6, bx1 = v[0] + gap * 0.6, bz = v[2] - 2.0, b0 = v[1] + 0.3, b1 = v[1] + long * 0.7;
    const lit = [0, v[1], 1, KIND.vent];
    s.tri([bx0, b0, bz], [bx1, b0, bz], [bx1, b1, bz], lit, [0, 0, 1], [0, 0, 1], [0, 0, 1]);
    s.tri([bx0, b0, bz], [bx1, b1, bz], [bx0, b1, bz], lit, [0, 0, 1], [0, 0, 1], [0, 0, 1]);
  });
}

// Slabs that hang from the lip over the opening, in front of the core's upper edge, for depth: broken off, held by
// a corner.
export function teeth(s: Sink, T: Table): void {
  const r = seeded(4242);
  for (const deg of [-12.5, 10.5]) {
    const p = point(T, deg, 12) as V3, n: V3 = [Math.sin(deg * D2R), 0, Math.cos(deg * D2R)];
    const x = unit(cross([0, 1, 0], n));
    const long = mix(16, 26, r()), wide = mix(12, 20, r());
    const f: Frame = turn({ o: [0, 0, 0], x, y: [0, 1, 0], z: n }, (r() - 0.5) * 0.3, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5);
    f.o = add(add(p, n, -3), [0, -long / 2 + 3, 0]);
    chunk(s, f, wide / 2, long / 2 + 3, 5, [r(), LAYER.crust, 0, KIND.rock], r, 0.3, (r() - 0.5) * 0.4);
  }
}
