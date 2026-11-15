import { seeded } from '../../../../world/build';
import { CITY, lots } from '../../layout';
import { PYRAMID } from '../temple/plan';
import type { Cell } from './bake';
import { D2R, FOREST, MARGIN, SOW, TORN, bearingOf, edgeAt, inTemple, toEdge } from './plan';
import type { Role } from './trees';

// The jungle sown on the map, far out of scale on purpose, as he ruled: its great trees as tall as the buildings
// beside them, crown to crown, with giants standing over them where they are seen in outline, and under them a dense
// understory of smaller trees, palms and broad leaves, so the dark under the canopy is full and nothing is seen
// through it. Past the city's end it is seen whole across bare ground: there it thins to single giants and fallen
// ones, and at the tear itself trees lean out, hang over the drop by their roots, or are gone. A clearing round the
// pool of polished metal by the temple, with trees leaning over it. A path of lanterns out from the temple's court
// into the jungle, to a camp.

export interface Thing {
  m: number; x: number; z: number;
  // How tall it is (how long, for one lying down), how far its foot is sunk, how far over the land it stands, and
  // whether it is drawn mirrored.
  h: number; sink: number; rise: number; flip: boolean;
  // How far it leans, in radians, and toward which way on the map.
  lean: number; dir: [number, number];
  // Its leaves toward flame, its brightness, and how much lantern light reaches it (a lantern itself is 2).
  hue: number; value: number; glow: number;
}

const hash = (i: number, j: number, k: number) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (t: number) => t * t * (3 - 2 * t);
// A value noise on the map, 0 to 1, with its features this many units apart.
function noise(x: number, z: number, size: number, seed: number): number {
  const u = x / size, v = z / size, i = Math.floor(u), j = Math.floor(v), fu = smooth(u - i), fv = smooth(v - j);
  const a = hash(i, j, seed), b = hash(i + 1, j, seed), c = hash(i, j + 1, seed), d = hash(i + 1, j + 1, seed);
  return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
}
const ramp = (a: number, b: number, x: number) => smooth(Math.min(1, Math.max(0, (x - a) / (b - a))));

// The heights, in units. The buildings beside the jungle are 60 to 120 tall and the pyramid 150.
const H = {
  giant: [152, 186], canopy: [70, 120], emergent: [112, 142], snag: [62, 92], fallen: [85, 130],
  small: [26, 48], palm: [24, 42], tallPalm: [88, 128], skyPalm: [118, 150], under: [12, 24], hanging: [45, 75], lantern: 6,
} as const;
// How close two giants may stand, and where they are seen against the sky: at the front left, beside the pyramid
// at the left of the skyline, and past it on the world's left side, as bearings, and from how far out.
const GIANT = { apart: 54, front: 290, side: [226, 262] as const, out: 470 };
// Round a giant the canopy stands lower, as a share of the giant's height, so its trunk and crown stand clear.
const UNDER_GIANT = { reach: 46, share: 0.55 };
// The pool of polished metal by the temple, which the land's builder is making: its middle on the map and the
// clearing kept round it, and how far beyond the clearing trees lean over it.
const POOL = { x: -449, z: 200, clear: 45, rim: 16 };
// The path of lanterns: points on the map from the temple's court out into the jungle, so many lanterns along it.
const PATH = { from: [-468, 128] as const, to: [-552, 64] as const, n: 8, bow: 12 };
// The pyramid rises out of the jungle: in front of it, as wide as it is and a little more, nothing stands taller than
// this, so its upper half is always seen over the canopy.
const BEFORE = { half: 120, tall: 84 };
// The palms that stand over the canopy: the grid they are sown on and how close two may stand, in units.
const SKY_PALM = { step: 30, apart: 34 };
// How far past the wedge's sides, in units, the jungle spills onto the bare ground beyond the city.
const SPILL = 34;
// Past the city's end the jungle thins: from where, to where only single giants and fallen ones stand.
const THIN = { from: CITY.r + 50, to: FOREST.r1 };

// How far a tree keeps from the city's buildings: its trunk always this far, and its crown, as a share of its height,
// so no crown stands half inside a building.
const CLEAR = { trunk: 5, crown: 0.26, most: 30 };

export function sow(cells: Cell[]): Thing[] {
  const r = seeded(60421), all: Thing[] = [];
  const city = lots().map((l) => ({ x: l.x, z: l.z, r: Math.hypot(l.w, l.d) / 2 }));
  const out = { push(t: Thing) { const keep = CLEAR.trunk + Math.min(CLEAR.most, CLEAR.crown * t.h); if (t.glow > 1.5 || !city.some((l) => Math.hypot(l.x - t.x, l.z - t.z) < l.r + keep)) all.push(t); } };
  const shapes = (role: Role) => cells.map((c, i) => (c.role === role ? i : -1)).filter((i) => i >= 0);
  const pick = (role: Role, v?: number) => { const s = shapes(role); return v === undefined ? s[Math.floor(r() * s.length)] : s[Math.min(v, s.length - 1)]; };
  const span = (role: keyof typeof H, k = r()) => { const h = H[role]; return typeof h === 'number' ? h : h[0] + (h[1] - h[0]) * k; };
  const before = (x: number, z: number) => Math.abs(x - PYRAMID.at[0]) < BEFORE.half && z > PYRAMID.at[1];
  const tree = (role: Role, x: number, z: number, h0: number, o: Partial<Thing> = {}): Thing => ({
    m: pick(role), x, z, h: before(x, z) && role !== 'fallen' ? Math.min(h0, BEFORE.tall * (0.8 + 0.2 * r())) : h0, sink: 1.5, rise: 0, flip: r() < 0.5, lean: 0, dir: [0, 1], hue: r() < 0.035 ? 0.55 + 0.3 * r() : 0.12 * r(), value: 0.8 + 0.4 * r(), glow: 0, ...o,
  });
  // The wedge, its sides ragged so it does not end on a line.
  const inside = (x: number, z: number, pad = 0) => {
    const rad = Math.hypot(x, z), deg = bearingOf(x, z), wob = 5 * (noise(x, z, 40, 3) - 0.5);
    return deg >= FOREST.from + wob && deg <= FOREST.to - wob && rad >= FOREST.r0 + 6 * noise(x, z, 30, 4) && rad < edgeAt(x, z) - TORN.gone - pad && rad < FOREST.r1 + 20 && !inTemple(x, z);
  };
  const pool = (x: number, z: number) => Math.hypot(x - POOL.x, z - POOL.z);

  // The lanterns first, so the trees near them know their light.
  const lamps: [number, number][] = [];
  for (let i = 0; i < PATH.n; i++) {
    const t = i / (PATH.n - 1), bow = Math.sin(Math.PI * t) * PATH.bow;
    const x = PATH.from[0] + (PATH.to[0] - PATH.from[0]) * t + bow * 0.4, z = PATH.from[1] + (PATH.to[1] - PATH.from[1]) * t + bow + (i % 2 ? 2.5 : -2.5);
    if (inside(x, z, 30) && pool(x, z) > POOL.clear) lamps.push([x, z]);
  }
  const end = lamps[lamps.length - 1];
  if (end) for (let i = 0; i < 3; i++) lamps.push([end[0] - 9 + Math.sin(i * 2.1) * 6, end[1] - 5 + Math.cos(i * 2.1) * 6]);
  for (const [x, z] of lamps) out.push({ m: pick('lantern'), x, z, h: H.lantern, sink: 0, rise: 0, flip: false, lean: 0, dir: [0, 1], hue: 0, value: 1, glow: 2 });
  const lit = (x: number, z: number) => Math.max(0, ...lamps.map(([lx, lz]) => Math.exp(-Math.hypot(x - lx, z - lz) / 16)));
  const path = (x: number, z: number, w: number) => lamps.some(([lx, lz]) => Math.hypot(x - lx, z - lz) < w);

  const ring = (step: number, each: (x: number, z: number, deg: number, rad: number) => void) => {
    for (let rad = FOREST.r0; rad < FOREST.r1 + 100; rad += step) {
      const n = Math.ceil(((FOREST.to - FOREST.from) * D2R * rad) / step);
      for (let i = 0; i < n; i++) {
        const deg = FOREST.from + ((i + r()) / n) * (FOREST.to - FOREST.from), rr = rad + r() * step;
        each(Math.sin(deg * D2R) * rr, Math.cos(deg * D2R) * rr, deg, rr);
      }
    }
  };
  // How far the jungle has thinned, 0 in its body and 1 where only single giants stand.
  const thin = (x: number, z: number) => ramp(THIN.from, THIN.to, Math.hypot(x, z) + 25 * (noise(x, z, 50, 9) - 0.5));
  // How tall the canopy stands here: great stands rising and falling, tallest toward the city, as its buildings are.
  const stand = (x: number, z: number, rad: number) => {
    const k = 0.6 * noise(x, z, 110, 7) + 0.4 * noise(x, z, 45, 8), city = 1 - ramp(FOREST.r0, THIN.from, rad);
    return H.canopy[0] + (H.canopy[1] - H.canopy[0]) * Math.min(1, 0.15 + 0.5 * ramp(0.25, 0.8, k) + 0.4 * city);
  };
  // Where a giant fell, long ago, and left a gap.
  const fell = (x: number, z: number) => noise(x, z, 95, 11) > 0.83;

  // The giants.
  const giants: [number, number][] = [], heights: number[] = [];
  ring(SOW.giant, (x, z, deg, rad) => {
    if (!inside(x, z, 20) || pool(x, z) < POOL.clear + 20 || fell(x, z) || path(x, z, 14) || before(x, z)) return;
    const seen = deg > GIANT.front || (deg > GIANT.side[0] && deg < GIANT.side[1]) || rad < GIANT.out, far = thin(x, z);
    if (r() > (seen ? 0.8 : 0.25) * (0.5 + noise(x, z, 70, 5)) + 0.15 * far) return;
    if (giants.some(([gx, gz]) => Math.hypot(gx - x, gz - z) < GIANT.apart * (far > 0.5 ? 0.7 : 1))) return;
    giants.push([x, z]);
    heights.push(span('giant'));
    out.push(tree('giant', x, z, heights[heights.length - 1], { sink: 3, lean: 0.03 * r(), dir: [r() - 0.5, r() - 0.5], hue: r() < 0.15 ? 0.7 : 0.06 * r(), glow: lit(x, z) }));
  });
  const nearGiant = (x: number, z: number, d: number) => giants.some(([gx, gz]) => Math.hypot(gx - x, gz - z) < d);
  // The tallest a tree may stand here so the giants stand clear over it.
  const under = (x: number, z: number) => giants.reduce((m, [gx, gz], i) => (Math.hypot(gx - x, gz - z) < UNDER_GIANT.reach ? Math.min(m, heights[i] * UNDER_GIANT.share) : m), Infinity);

  // The great trees, crown to crown.
  ring(SOW.canopy, (x, z, _deg, rad) => {
    if (!inside(x, z) || path(x, z, 10) || nearGiant(x, z, 24)) return;
    const glow = lit(x, z), p = pool(x, z), far = thin(x, z), torn = Math.max(0, 1 - (edgeAt(x, z) - rad) / 40);
    if (p < POOL.clear) return;
    if (p < POOL.clear + POOL.rim) {
      if (r() < 0.5) out.push(tree('canopy', x, z, span('canopy', 0.2 * r()), { lean: 0.22 + 0.25 * r(), dir: [POOL.x - x, POOL.z - z], glow }));
      return;
    }
    // At the tear the trees lean out over the drop, or are torn up, or are gone.
    if (torn > 0.3) {
      if (r() < 0.5) out.push(tree(r() < 0.5 ? 'uprooted' : 'canopy', x, z, span('hanging'), { sink: 0.5, lean: 0.35 + 0.7 * torn * r(), dir: [x, z], glow }));
      return;
    }
    if (far > 0.55) {
      if (r() < 0.14 * (1 - far)) out.push(tree('fallen', x, z, span('fallen'), { sink: 2, lean: 0.03 * r(), dir: [x, z], glow }));
      return;
    }
    if (fell(x, z)) {
      if (r() < 0.3) out.push(tree(r() < 0.5 ? 'emergent' : 'snag', x, z, span(r() < 0.5 ? 'emergent' : 'snag'), { glow }));
      return;
    }
    if (r() > 0.92 - 0.6 * far) return;
    const h = Math.min(stand(x, z, rad) * (1 - 0.3 * far), under(x, z)), roll = r();
    const edge = toEdge(x, z);
    if (roll < 0.08 && h > 90) out.push(tree('emergent', x, z, span('emergent'), { glow }));
    else if (roll < 0.1) out.push(tree('snag', x, z, Math.min(span('snag'), h), { glow }));
    else if (roll < 0.16 + 0.3 * (1 - ramp(20, 80, edge))) out.push(tree('palm', x, z, Math.min(span('tallPalm'), h * 1.3), { lean: 0.1 * r(), dir: [r() - 0.5, r() - 0.5], glow }));
    else out.push(tree('canopy', x, z, h * (r() < 0.1 ? 1.2 : 0.85 + 0.25 * r()), { glow }));
  });

  // Palms standing clear over the canopy, their crowns as stars against the sky: the jungle's own outline, where a
  // visitor sees it, beside the pyramid and at the wedge's sides.
  const palms: [number, number][] = [];
  ring(SKY_PALM.step, (x, z, deg) => {
    if (!inside(x, z, 16) || before(x, z) || pool(x, z) < POOL.clear || path(x, z, 10) || nearGiant(x, z, 30) || thin(x, z) > 0.5) return;
    const seen = deg > GIANT.front || deg < GIANT.side[1] || toEdge(x, z) < 50;
    if (r() > (seen ? 0.55 : 0.12)) return;
    if (palms.some(([px, pz]) => Math.hypot(px - x, pz - z) < SKY_PALM.apart)) return;
    palms.push([x, z]);
    out.push(tree('palm', x, z, span('skyPalm'), { lean: 0.06 + 0.12 * r(), dir: [r() - 0.5, r() - 0.5], value: 0.85 + 0.3 * r(), glow: lit(x, z) }));
  });

  // Fallen giants in the gaps they made, and out on the bare ground past the jungle's body.
  ring(SOW.giant, (x, z) => {
    if (!inside(x, z, 25) || pool(x, z) < POOL.clear + 10 || path(x, z, 16)) return;
    if (!(fell(x, z) && r() < 0.5) && !(thin(x, z) > 0.4 && r() < 0.18)) return;
    out.push(tree('fallen', x, z, span('fallen'), { sink: 2, lean: 0.03 * r(), dir: [x, z], flip: r() < 0.5 }));
  });

  // Under the great trees: smaller trees everywhere in the body of the jungle, so the dark under its canopy is full,
  // and at its edges, along the pool and in its gaps palms and broad leaves, where they are seen.
  ring(SOW.under, (x, z, _deg, rad) => {
    if (!inside(x, z) || path(x, z, 5) || pool(x, z) < POOL.clear - 6) return;
    const far = thin(x, z), edge = toEdge(x, z), shore = pool(x, z) < POOL.clear + POOL.rim, open = fell(x, z);
    const seen = Math.max(1 - ramp(10, 60, edge), shore ? 0.8 : 0, open ? 0.7 : 0, nearGiant(x, z, 20) ? 0.6 : 0);
    const glow = lit(x, z), roll = r();
    if (far > 0.7 || edgeAt(x, z) - rad < 14) return;
    if (roll < 0.85 * (1 - far) && !shore) {
      // The body's own understory, deep in shade.
      out.push(tree('small', x, z, span('small'), { value: 0.55 + 0.35 * r() + 0.2 * seen, glow }));
      return;
    }
    if (r() > seen * 1.2) return;
    if (r() < 0.4) out.push(tree('palm', x, z, span('palm'), { lean: 0.12 * r() + (shore ? 0.2 : 0), dir: shore ? [POOL.x - x, POOL.z - z] : [r() - 0.5, r() - 0.5], glow }));
    else out.push(tree('under', x, z, span('under'), { m: pick('under', Math.floor(r() * 5)), sink: 0.5, glow }));
  });

  // Past the wedge's sides, out on the bare ground beyond the city, the jungle spills on a little way and does not
  // end on a line: smaller trees, palms and broad leaves, fewer the further out.
  for (const [side, sign] of [[FOREST.from, -1], [FOREST.to, 1]] as const) {
    for (let rad = CITY.r + 8; rad < FOREST.r1; rad += SOW.under) {
      for (let k = 0; k < 4; k++) {
        const off = r() * SPILL / rad / D2R, deg = side + sign * off, rr = rad + r() * SOW.under, x = Math.sin(deg * D2R) * rr, z = Math.cos(deg * D2R) * rr;
        if (rr > edgeAt(x, z) - 14 || r() > 0.75 * (1 - (off * D2R * rad) / SPILL)) continue;
        const roll = r();
        if (roll < 0.3) out.push(tree('small', x, z, span('small') * (0.7 + 0.3 * r())));
        else if (roll < 0.55) out.push(tree('palm', x, z, span('palm'), { lean: 0.15 * r(), dir: [x, z] }));
        else out.push(tree('under', x, z, span('under'), { m: pick('under', Math.floor(r() * 5)), sink: 0.5 }));
      }
    }
  }

  // Over the drop: trees hanging by their roots from the torn edge itself, where the jungle reaches it.
  for (let deg = FOREST.from + 3; deg < FOREST.to - 3; deg += 2.5 + 3.5 * r()) {
    const e = edgeAt(Math.sin(deg * D2R), Math.cos(deg * D2R)) - 2, x = Math.sin(deg * D2R) * e, z = Math.cos(deg * D2R) * e;
    if (e > FOREST.r1 + 15 || e < MARGIN - 60 || inTemple(x, z) || r() > 0.6) continue;
    out.push(tree('uprooted', x, z, span('hanging'), { sink: -2, lean: Math.PI - 0.3 - 0.5 * r(), dir: [x, z], value: 0.7 + 0.3 * r() }));
  }
  return all;
}
