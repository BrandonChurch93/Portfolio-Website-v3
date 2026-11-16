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

// Picture 9's two great boulders, read off the picture (its pixels, the middle of each), with their half extents,
// across, up and through. The left is a chunky dark lump whose top meets the rock, the right a taller one.
const BOULDERS = [
  { px: [436, 640], z: 230, size: [64, 40, 58], family: 9, turn: 0.55 },
  { px: [905, 634], z: 250, size: [60, 60, 55], family: 10, turn: -0.2 },
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
// The field hangs from the planet: the plan's field, which began some way under it, is drawn up close under the
// rock, densest at the top and thinning toward the foot. Its top and foot as the plan has them, where they go, and
// how much more it gathers at the top (a power of the share of the way down).
const HANG = { from: [-560, -1196], to: [-455, -1180], gather: 1.35 };
// The stream's lane on the page. The page draws its stream over the world, swaying up to about 15 units each side of
// the line down from the core's foot. Within front units of that line every piece is behind the stream, so the
// stream drawn over it is right, and a piece larger than small keeps out of a lane lane units each side of it.
export const LANE = { front: 60, lane: 20, small: 8 };
// The whirl: three arms round the stream, each on one side of it, in uneven clumps with stragglers, swinging round
// it and back. Each arm's side, how high its top and foot are, how far out it reaches, how far round it swings
// (radians) and how many clumps it gathers in.
export const ARMS = [
  { family: 41, side: 1, y: [-505, -640], R: [120, 300], swing: 0.42, clumps: 5 },
  { family: 42, side: -1, y: [-560, -720], R: [110, 320], swing: 0.5, clumps: 6 },
  { family: 43, side: 1, y: [-690, -860], R: [140, 340], swing: 0.36, clumps: 4 },
];
// How near the host's sides and foot a piece may come, and how near the torn rock, in units.
const EDGE = { side: 8, foot: 14, rock: 3 };
// How much of its bounds a great piece is taken to fill when it is placed.
const GREAT_BALL = 0.62;

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
export const extents = (p) => p.size ?? [p.r * p.long * 0.85, p.r * (1 - 0.5 * p.flat) * 0.78, p.r * 0.82];
// How much of its family's motion a piece has.
export const calm = (p) => (MOTION.calm.families.includes(p.family) || MOTION.calm.families.includes(p.family - 20) ? MOTION.calm.share : 1);

export function place(bvh) {
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8')).pieces, r = L.seeded(9173), said = { plan: plan.length, moved: 0, out: 0, why: {} };
  const bell = () => (r() + r() + r() - 1.5) / 1.5;
  const hit = new Float64Array(4);
  const core = L.drawn(...L.CORE.at), stream = L.small(), cz = L.SOURCE[2];
  const inside = (x, y, z) => {
    let back = 0;
    for (const d of [[1, 0.13, 0.07], [-0.11, 1, 0.17], [0.09, -0.2, -1]]) { const n = unit(d); if (closest(bvh, x, y, z, n[0], n[1], n[2], 4000, hit) >= 0 && hit[3] === 0) back++; }
    return back >= 2;
  };
  const near = (x, y, z, reach) => inside(x, y, z) || gap(bvh, x, y, z, reach + EDGE.rock, 0) < reach + EDGE.rock;
  // How far a piece moves from where it rests, other than going round the stream.
  const swayOf = (p) => (p.kind === 'dust' ? SWAY.dust + Math.hypot(p.at[0], p.at[2] - cz) * MOTION.dust.turn : SWAY[p.kind] * (p.kind === 'plate' || p.kind === 'ring' ? calm(p) : 1));
  // Where a piece is in the stream's lane, if it is: in front of it, or in its way.
  const lane = (q, reach, sway) => {
    const [sx] = L.drawn(q[0], q[1], q[2]), off = Math.abs(sx - core[0]);
    if (off < LANE.front + reach + sway && q[2] + reach + sway > cz) return 'front';
    if (reach > LANE.small && off < LANE.lane + reach + sway) return 'lane';
    return null;
  };

  // What is wrong with a piece where it is, or nothing.
  const fault = (p) => {
    const e = extents(p), reach = Math.max(...e), sway = swayOf(p), [x, y, z] = p.at, [sx, sy] = L.drawn(x, y, z);
    if (Math.abs(sx) + reach + sway > L.HOST.wide / 2 - EDGE.side) return 'side';
    if (sy + reach + sway > L.HOST.tall - EDGE.foot || y - reach - sway < L.DEBRIS.low) return 'foot';
    if (p.kind === 'whirl') {
      for (let i = 0; i <= 8; i++) {
        const q = orbit(p, p.swing * (i / 4 - 1));
        if (near(q[0], q[1], q[2], reach + sway)) return 'rock';
        const l = lane(q, reach, sway);
        if (l) return l;
      }
    } else if (p.kind === 'fall') {
      if (near(x, MOTION.fall.from, z, reach)) return 'rock';
      if (Math.abs(sx) < LANE.front + reach && z + reach > cz) return 'front';
    } else {
      // A great piece is broken well inside its bounds, and is checked against the rock again once it is made.
      if (near(x, y, z, (p.kind === 'plate' ? GREAT_BALL : 1) * reach + sway)) return 'rock';
      const l = lane(p.at, reach, sway);
      if (l) return l;
    }
    if (z > L.CORE.at[2] - 60 && Math.hypot(sx - core[0], sy - core[1]) < L.CORE.r * 1.1 + reach + sway) return 'core';
    if (p.kind !== 'fall' && p.kind !== 'whirl') {
      for (let i = 0; i < stream.length; i++) {
        const [qx, qy, qz] = stream[i], long = L.SMALL[i][3], [tx] = L.drawn(qx, qy, qz);
        if (z > qz - 12 && y + reach + sway > qy - long && y - reach - sway < qy && Math.abs(sx - tx) < reach + sway + 3) return 'small';
      }
    }
    return null;
  };
  // Moved by as little as will do. A piece in front of the stream goes back behind it where it is seen. Otherwise:
  // down, then out from the stream, then both, a few units at a time.
  const settle = (p) => {
    const was = fault(p);
    if (!was) return true;
    let at = [...p.at];
    if (was === 'front') {
      const reach = Math.max(...extents(p)), back = cz - reach - swayOf(p) - 3, [px, py] = L.pictured(...at);
      p.at = p.kind === 'whirl' ? [at[0], at[1], at[2]] : L.fromPicture(px, py, Math.min(at[2], back));
      if (!fault(p)) { said.moved++; return true; }
      at = [...p.at];
    }
    // What the picture has is kept where the picture has it: it goes nearer or further first.
    if (p.pictured) {
      const [px, py] = L.pictured(...at);
      for (let k = 1; k <= 16; k++) for (const dz of [1, -1]) {
        p.at = L.fromPicture(px, py, at[2] + dz * 12 * k);
        if (!fault(p)) { said.moved++; return true; }
      }
    }
    const out = Math.sign(at[0] || 1);
    for (let k = 1; k <= 16; k++) for (const [dx, dy] of [[0, -1], [out, 0], [out, -1], [-out, 0], [0, 1]]) {
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
  const add = (d, kind, extra = {}) => { const p = { at: [...d.at], r: d.r, long: d.long, flat: d.flat, family: d.family, kind, ...extra }; if (settle(p)) { pieces.push(p); return p; } return null; };

  // The field drawn up under the planet: a height of the plan's to where it hangs now.
  const hang = (y) => {
    const u = (y - HANG.from[0]) / (HANG.from[1] - HANG.from[0]), v = u > 0 ? Math.min(u, 1) ** HANG.gather : u * 0.3;
    return HANG.to[0] + v * (HANG.to[1] - HANG.to[0]);
  };
  const plates = plan.filter((q) => q.kind === 'plate'), moved = new Map();
  // The great pieces first, each carrying its ring with it, and each clump drawn up as one.
  for (const d of plates) {
    const to = hang(d.at[1]), p = add({ ...d, at: [d.at[0], to, d.at[2]] }, 'plate', { land: d.land });
    if (p) moved.set(d.family, [p.at[0] - d.at[0], p.at[1] - d.at[1], p.at[2] - d.at[2]]);
  }
  for (const b of BOULDERS) add({ at: L.fromPicture(b.px[0], b.px[1], b.z), r: Math.max(...b.size) / 0.85, long: 1, flat: 0, family: b.family }, 'plate', { turn: b.turn, pictured: true, size: b.size });
  for (const b of BOULDERS) {
    const g = pieces.find((p) => p.family === b.family);
    if (!g) continue;
    const tilt = 0.5 * bell(), lean = 0.5 * bell();
    for (let k = 0; k < 16; k++) {
      const a = r() * Math.PI * 2, far = g.r * (1.2 + 1.1 * r() ** 1.6), across = far * Math.cos(a), along = far * Math.sin(a), size = (1.4 + 7 * r() ** 3) * (0.6 + g.r / 90);
      add({ at: [g.at[0] + across, g.at[1] + across * tilt + along * lean + 0.1 * far * bell(), g.at[2] + along], r: size, long: 1.2 + r(), flat: r(), family: 20 + b.family }, 'ring');
    }
  }
  const clumps = new Map();
  for (const d of plan.filter((q) => kindOf(q) === 'clump')) { const c = clumps.get(d.family) ?? [0, 0]; clumps.set(d.family, [c[0] + d.at[1], c[1] + 1]); }
  for (const d of plan.filter((q) => q.kind !== 'plate' && q.kind !== 'whirl')) {
    const kind = kindOf(d);
    let at = d.at;
    if (kind === 'ring') {
      const m = moved.get(d.family - 20);
      if (!m) { said.out++; continue; }
      at = [at[0] + m[0], at[1] + m[1], at[2] + m[2]];
    } else if (kind === 'clump') { const [sum, n] = clumps.get(d.family), mid = sum / n; at = [at[0], at[1] + hang(mid) - mid, at[2]]; }
    else if (kind === 'dust') at = [at[0], hang(at[1]), at[2]];
    else if (kind === 'fall') {
      // A chip that falls along the stream falls behind it.
      const reach = d.r * Math.max(d.long, 1);
      at = [at[0], at[1], Math.min(at[2], cz - 8 - reach - 30 * r())];
    }
    add({ ...d, at }, kind);
  }

  // The whirl: the plan's whirling pieces, largest first, laid into uneven arms: clumps of mixed sizes along each
  // arm, gaps between them, and stragglers.
  const whirl = plan.filter((q) => q.kind === 'whirl').sort((p, q) => q.r - p.r);
  ARMS.forEach((arm, ai) => {
    const members = whirl.filter((_, i) => i % ARMS.length === ai);
    const heads = Array.from({ length: arm.clumps }, (_, k) => {
      const t = (k + 0.25 + 0.5 * r()) / arm.clumps;
      return { t, R: arm.R[0] + (arm.R[1] - arm.R[0]) * (0.15 + 0.7 * r()), spread: 0.4 + 0.8 * r() };
    });
    members.forEach((d, k) => {
      const straggler = r() < 0.16, h = heads[k < heads.length ? k : Math.floor(r() ** 1.4 * heads.length)];
      const t = straggler ? r() : Math.min(1, Math.max(0, h.t + 0.07 * h.spread * bell()));
      const y = arm.y[0] + (arm.y[1] - arm.y[0]) * t + (straggler ? 30 : 12) * bell();
      const R = straggler ? arm.R[0] + (arm.R[1] - arm.R[0]) * r() : h.R + 28 * h.spread * bell();
      const reach = Math.max(...extents(d)), sway = SWAY.whirl;
      // How far round it may be: clear of the front of the stream, and for a larger piece, clear of its lane.
      const fore = R > LANE.front + reach + sway ? Math.asin((LANE.front + reach + sway) / R) : Math.acos(Math.max(-1, -(reach + sway) / R));
      const aft = reach > LANE.small ? Math.PI - Math.asin(Math.min(1, (LANE.lane + reach + sway) / R)) : Math.PI - 0.05;
      const room = aft - fore - 2 * arm.swing;
      const th = room > 0 ? fore + arm.swing + room * r() ** 0.8 : (fore + aft) / 2;
      const p = { at: [arm.side * R * Math.sin(th), y, cz + R * Math.cos(th)], r: d.r, long: d.long, flat: d.flat, family: arm.family, kind: 'whirl', swing: room > 0 ? arm.swing : Math.max(0, (aft - fore) / 2 - 0.01) };
      if (settle(p)) pieces.push(p);
    });
  });

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
      // A boulder of the picture's stands as the picture has it, leaning only a little toward the core.
      const core = unit(L.CORE.at.map((v, i) => v - p.at[i])), up = p.size ? unit([core[0] * 0.3, 1, core[2] * 0.3]) : core;
      const side0 = unit(cross(up, [0, 0, 1])), fwd0 = cross(side0, up);
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
