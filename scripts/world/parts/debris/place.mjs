// Where every piece of what broke away rests, how it is turned and how it moves: the original plan's field
// (scripts/world/debris-plan.json, copied out of the study), kept piece for piece, with what the new world needs.
//
//   const { pieces, said } = place(bvh)
//
// bvh is the torn rock's (scripts/world/lib/bvh.mjs). A piece of the plan that lies in the rock, hides the core, lies
// across the stream or a small stream, or reaches past the host, is moved clear by as little as will do, or left out
// when nothing near will do. Picture 9's two great boulders go where the picture has them, with a ring of small
// pieces each as the plan gives every great piece, and the pieces the picture has under the hollow and off each
// side are added where it has them.
import fs from 'node:fs';
import { any, closest, gap } from '../../lib/bvh.mjs';
import { L } from '../../lib/plan.mjs';
import { KIND, MOTION, SWAY } from '../../../../src/pieces/world/parts/debris/motion.ts';

const PLAN = 'scripts/world/debris-plan.json';
// The size classes: a great piece has a model of its own, and the rest share the models of their class.
export const CLASSES = { L: 12, M: 5, S: 2, D: 0 };
export const classOf = (r) => (r >= CLASSES.L ? 'L' : r >= CLASSES.M ? 'M' : r >= CLASSES.S ? 'S' : 'D');

// Picture 9's two great boulders, read off the picture (its pixels, the middle of each), and the plan's own for them.
const BOULDERS = [
  { px: [445, 637], z: 230, r: 54, long: 1.2, flat: 0.3, family: 9, turn: 0.55 },
  { px: [897, 636], z: 230, r: 60, long: 1.25, flat: 0.35, family: 10, turn: -0.2 },
];
// The smaller pieces picture 9 has under the hollow, among the small streams: where each is in the picture's pixels
// and about how wide, and how far toward the visitor.
const UNDER = [
  [510, 612, 15, 200], [557, 592, 20, 250], [585, 657, 6, 260], [632, 642, 14, 220], [532, 702, 24, 270], [402, 714, 9, 240], [355, 642, 9, 200],
  [752, 630, 14, 240], [767, 664, 5, 250], [875, 566, 14, 180], [915, 574, 7, 200], [967, 642, 9, 250], [985, 722, 24, 260], [1015, 667, 8, 220],
];
// The scatter of small stones off the cratered right side, and the fainter one off the left: the picture's region
// for each (across, down, in its pixels), how many, and how large at most.
const SCATTER = [
  { from: [1222, 440], to: [1300, 560], count: 46, most: 6.5, family: 90 },
  { from: [58, 468], to: [112, 522], count: 14, most: 4, family: 91 },
];
// How near the host's sides and foot a piece may come, and how near the torn rock, in units.
const EDGE = { side: 8, foot: 14, rock: 3 };

const unit = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// The rotation that turns the axes x, y, z to these three, as a quaternion [x, y, z, w].
function quatOf(x, y, z) {
  const m00 = x[0], m11 = y[1], m22 = z[2], t = m00 + m11 + m22;
  let q;
  if (t > 0) { const s = 0.5 / Math.sqrt(t + 1); q = [(y[2] - z[1]) * s, (z[0] - x[2]) * s, (x[1] - y[0]) * s, 0.25 / s]; }
  else if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); q = [0.25 * s, (y[0] + x[1]) / s, (z[0] + x[2]) / s, (y[2] - z[1]) / s]; }
  else if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); q = [(y[0] + x[1]) / s, 0.25 * s, (z[1] + y[2]) / s, (z[0] - x[2]) / s]; }
  else { const s = 2 * Math.sqrt(1 + m22 - m00 - m11); q = [(z[0] + x[2]) / s, (z[1] + y[2]) / s, 0.25 * s, (x[1] - y[0]) / s]; }
  return unit(q);
}
export function rotate(q, v) {
  const [x, y, z, w] = q, ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}
const conj = (q) => [-q[0], -q[1], -q[2], q[3]];

// A piece's half extents before it is cut, from the plan's size, length and flatness.
export const extents = (p) => [p.r * p.long * 0.85, p.r * (1 - 0.5 * p.flat) * 0.78, p.r * 0.82];

export function place(bvh) {
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8')).pieces, r = L.seeded(9173), said = { plan: plan.length, moved: 0, out: 0, why: {} };
  const bell = () => (r() + r() + r() - 1.5) / 1.5;
  const hit = new Float64Array(4);
  const core = L.drawn(...L.CORE.at), stream = L.small();
  const inside = (x, y, z) => {
    let back = 0;
    for (const d of [[1, 0.13, 0.07], [-0.11, 1, 0.17], [0.09, -0.2, -1]]) { const n = unit(d); if (closest(bvh, x, y, z, n[0], n[1], n[2], 4000, hit) >= 0 && hit[3] === 0) back++; }
    return back >= 2;
  };
  const near = (x, y, z, reach) => inside(x, y, z) || gap(bvh, x, y, z, reach + EDGE.rock, 0) < reach + EDGE.rock;

  // What is wrong with a piece where it is, or nothing.
  const fault = (p) => {
    const e = extents(p), reach = Math.max(...e), sway = SWAY[p.kind], [x, y, z] = p.at, [sx, sy] = L.drawn(x, y, z);
    if (Math.abs(sx) + reach + sway > L.HOST.wide / 2 - EDGE.side) return 'side';
    if (sy + reach + sway > L.HOST.tall - EDGE.foot || y - reach - sway < L.DEBRIS.low) return 'foot';
    if (p.kind === 'whirl') { for (let i = 0; i < 12; i++) { const q = orbit(p, (i / 12) * Math.PI * 2); if (near(q[0], q[1], q[2], reach + sway)) return 'rock'; } }
    else if (p.kind === 'fall') { if (near(x, MOTION.fall.from, z, reach)) return 'rock'; }
    else if (near(x, y, z, reach + sway)) return 'rock';
    if (z > L.CORE.at[2] - 60 && Math.hypot(sx - core[0], sy - core[1]) < L.CORE.r * 1.1 + reach + sway) return 'core';
    if (p.kind !== 'fall' && p.kind !== 'whirl') {
      if ((p.r > 9 || z > L.SOURCE[2] - 20) && Math.abs(sx - core[0]) < reach * 0.95 + sway + 7) return 'stream';
      for (let i = 0; i < stream.length; i++) {
        const [qx, qy, qz] = stream[i], long = L.SMALL[i][3], [tx] = L.drawn(qx, qy, qz);
        if (z > qz - 12 && y + reach + sway > qy - long && y - reach - sway < qy && Math.abs(sx - tx) < reach + sway + 3) return 'small';
      }
    }
    return null;
  };
  // Moved by as little as will do: down, then out from the stream, then both, a few units at a time.
  const settle = (p) => {
    const was = fault(p);
    if (!was) return true;
    const at = [...p.at], out = Math.sign(at[0] || 1);
    for (let k = 1; k <= 14; k++) for (const [dx, dy] of [[0, -1], [out, 0], [out, -1], [-out, 0], [0, 1]]) {
      p.at = [at[0] + dx * 7 * k, at[1] + dy * 7 * k, at[2]];
      if (!fault(p)) { said.moved++; return true; }
    }
    p.at = at;
    said.out++;
    said.why[was] = (said.why[was] ?? 0) + 1;
    return false;
  };

  const kindOf = (d) => (d.kind === 'plate' ? 'plate' : d.kind === 'whirl' ? 'whirl' : d.kind === 'drift' ? (d.family < 50 ? 'ring' : 'clump') : d.family === 80 ? 'fall' : 'dust');
  const pieces = [];
  const add = (d, kind, extra = {}) => { const p = { at: [...d.at], r: d.r, long: d.long, flat: d.flat, family: d.family, kind, ...extra }; if (settle(p)) pieces.push(p); return p; };

  // The great pieces first, then everything that goes with them.
  for (const d of plan.filter((q) => q.kind === 'plate')) add(d, 'plate', { land: d.land });
  for (const b of BOULDERS) add({ at: L.fromPicture(b.px[0], b.px[1], b.z), r: b.r, long: b.long, flat: b.flat, family: b.family }, 'plate', { turn: b.turn, pictured: true });
  for (const b of BOULDERS) {
    const g = pieces.find((p) => p.family === b.family);
    if (!g) continue;
    const tilt = 0.5 * bell(), lean = 0.5 * bell();
    for (let k = 0; k < 16; k++) {
      const a = r() * Math.PI * 2, far = g.r * (1.25 + 1.2 * r() ** 1.6), across = far * Math.cos(a), along = far * Math.sin(a), size = (1.4 + 7 * r() ** 3) * (0.6 + g.r / 90);
      add({ at: [g.at[0] + across, g.at[1] + across * tilt + along * lean + 0.1 * far * bell(), g.at[2] + along], r: size, long: 1.2 + r(), flat: r(), family: 20 + b.family }, 'ring');
    }
  }
  for (const d of plan.filter((q) => q.kind !== 'plate')) {
    const kind = kindOf(d);
    if (kind === 'ring' && !pieces.some((p) => p.kind === 'plate' && p.family === d.family - 20)) { said.out++; continue; }
    add(d, kind);
  }
  for (const [px, py, wide, z] of UNDER) add({ at: L.fromPicture(px, py, z), r: (wide * L.PICTURE.unit) / 2.2, long: 1.2 + 0.4 * r(), flat: r(), family: 70 }, 'scatter', { pictured: true });
  for (const s of SCATTER) for (let k = 0; k < s.count; k++) {
    const px = s.from[0] + (s.to[0] - s.from[0]) * r(), py = s.from[1] + (s.to[1] - s.from[1]) * r(), size = 0.9 + s.most * r() ** 2.6;
    add({ at: L.fromPicture(px, py, 120 + 200 * r()), r: size, long: 1.2 + r(), flat: r(), family: s.family }, 'scatter', { pictured: true });
  }

  // How each is turned at rest and how it turns. A great piece keeps one face to the core: its thin axis points at
  // it. Every other piece is turned any way, and turns over about an axis of its own, slowly, the larger the slower.
  for (const p of pieces) {
    p.cls = p.kind === 'plate' ? 'G' : classOf(p.r);
    p.phase = r();
    if (p.kind === 'plate') {
      const up = unit(L.CORE.at.map((v, i) => v - p.at[i])), side0 = unit(cross(up, [0, 0, 1])), fwd0 = cross(side0, up);
      const t = p.turn ?? (r() - 0.5) * 1.6, side = side0.map((v, i) => v * Math.cos(t) + fwd0[i] * Math.sin(t)), fwd = cross(side, up);
      p.quat = quatOf(side, up, fwd);
      p.spin = [...up, 0];
      // The planet's outer surface was the side away from the core: on a plate that shows one, it is turned a
      // little toward the visitor, so it is seen.
      p.outer = unit(rotate(conj(p.quat), unit([-up[0], -up[1] * 0.4, 0.9])));
    } else {
      const a = unit([bell(), bell(), bell()]), b = unit(cross(a, unit([bell(), bell(), bell()]))), c = cross(a, b);
      p.quat = quatOf(a, b, c);
      const ax = unit([bell(), bell(), bell()]), size = Math.max(...extents(p)), T = Math.min(MOTION.spin.most, Math.max(MOTION.spin.least, MOTION.spin.period * Math.sqrt(size / MOTION.spin.at)));
      p.spin = [...ax, ((r() < 0.5 ? -1 : 1) * 2 * Math.PI) / T];
    }
    if (p.kind === 'fall') p.fast = MOTION.fall.fast[0] + (MOTION.fall.fast[1] - MOTION.fall.fast[0]) * r();
  }

  // How much of the core each piece sees from where it rests, through the torn rock: 48 places on the core's ball.
  for (const p of pieces) {
    const [x, y, z] = p.kind === 'fall' ? [p.at[0], (MOTION.fall.from + MOTION.fall.to) / 2, p.at[2]] : p.at;
    let seen = 0;
    for (let i = 0; i < 48; i++) {
      const u = (i + 0.5) / 48, th = Math.acos(1 - 2 * u), ph = i * 2.39996, c = L.CORE.at;
      const q = [c[0] + L.CORE.r * 0.8 * Math.sin(th) * Math.cos(ph), c[1] + L.CORE.r * 0.8 * Math.cos(th), c[2] + L.CORE.r * 0.8 * Math.sin(th) * Math.sin(ph)];
      const d = [q[0] - x, q[1] - y, q[2] - z], l = Math.hypot(...d);
      if (!any(bvh, x, y, z, d[0] / l, d[1] / l, d[2] / l, l)) seen++;
    }
    p.core = seen / 48;
  }
  said.kept = pieces.length;
  said.kinds = Object.fromEntries(Object.keys(KIND).map((k) => [k, pieces.filter((p) => p.kind === k).length]));
  said.classes = Object.fromEntries(['G', 'L', 'M', 'S', 'D'].map((k) => [k, pieces.filter((p) => p.cls === k).length]));
  return { pieces, said };
}

// Where a piece that goes round the stream is when it has gone so far round (radians).
export function orbit(p, a) {
  const cx = 0, cz = L.CORE.at[2], dx = p.at[0] - cx, dz = p.at[2] - cz, c = Math.cos(a), s = Math.sin(a);
  const x = dx * c + dz * s, z = -dx * s + dz * c;
  return [cx + x, p.at[1] - MOTION.whirl.tilt * (z - dz), cz + z];
}
