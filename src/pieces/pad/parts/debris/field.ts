import { DEBRIS, LAND, ROCKET, STONE, TABLE, TOWER, VIEW } from '../../layout';
import { KIND, MOTION, SWAY } from './look';

// The field round the pad, laid out once from a seed: the same pieces in the same places on every visit. Each cluster
// of DEBRIS (../../layout.ts) is a great piece with middle and small pieces trailing from it, and DEBRIS.front the
// few that hang in front of the stone. A piece is kept only where all of its motion, the blast's shove and the
// plume's included, stays where the field may be: inside the bounds, out of the rocket's lane, clear of the table,
// the tower and the rocket as the page sees them (a piece drawn over the tower's lattice or touching a fin read as
// stuck in it, whatever its depth), never over the stone's top unless wholly in front of one of its ends, and clear of
// every other piece.

export interface Laid {
  model: string;
  at: [number, number, number];
  // How far across it is, in units, and how far from its middle anything of it reaches.
  across: number;
  reach: number;
  // Its own proportions, each at most 1: a slab or a wedge is a block pressed thin along one or two of its axes.
  shape: [number, number, number];
  turn: [number, number, number, number];
  axis: [number, number, number];
  rate: number;
  cluster: number;
  phase: number;
  // How far the blast at the pad and the plume as it climbs past shove it, at most.
  shove: number;
  plume: number;
  kick: number;
  kind: number;
  seed: number;
}

// The models each kind wears, from the hero's own file, largest first: its great pieces for the great and the larger
// middle pieces, and its shared chips for the rest, by size.
const MODELS = {
  great: ['G1.1', 'G3.1', 'G10', 'G9', 'G1', 'G3', 'G0.1', 'G4'],
  front: ['G5', 'G6', 'G0.2'],
  middle: ['G7.1', 'G8.1', 'G1.2', 'G4.1', 'G6.1', 'G2', 'G5.1', 'G8', 'G2.1'],
  chunk: ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'],
  chip: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'],
};
// How far across a middle piece and a small one may be, the middle size past which a middle piece wears one of the
// great pieces' models, and the size past which a piece counts as great.
const SIZE = { middle: [16, 34], small: [5, 11], fine: 22, great: 40 } as const;
// The share of pieces pressed into slabs, how thin a slab is at its thinnest and its thickest, and how little a great
// piece is pressed: it is the hero's own block already.
const SLAB = { share: 0.6, thin: [0.34, 0.62], great: [0.6, 0.85] } as const;
// How far from its middle a piece reaches against how far across it is: a broken block's corners stand out past it.
const REACH = 0.66;
const FRONT_SHOVE = 0.35;
const FACE_TRIES = 12;
const SEED = 7177;
const TRIES = 400;

const D2R = Math.PI / 180, COS = Math.cos(VIEW.el * D2R), SIN = Math.sin(VIEW.el * D2R);
// How far up a point is drawn, as the page sees it, from the stone's middle.
export const up = (y: number, z: number) => y * COS - z * SIN;

export const MOUTH: [number, number, number] = [0, ROCKET.mouth, 0];
// The way the blast at the pad shoves a piece: out from the engine's mouth and up. The shader works it out by the
// same lines.
export function shoved(x: number, y: number, z: number): [number, number, number] {
  const rx = x - MOUTH[0], ry = y - MOUTH[1], rz = z - MOUTH[2], flat = Math.hypot(rx, rz);
  const v: [number, number, number] = [rx, 0.5 * flat + 0.5 * Math.max(ry, 0), rz], l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
// And the way the plume shoves it: out from the rocket's axis, a little up.
export function plumed(x: number, z: number): [number, number, number] {
  const flat = Math.hypot(x, z) || 1, v: [number, number, number] = [x / flat, MOTION.plume.rise, z / flat], l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
}
// The table, the tower with its arms, and the rocket standing, as the page sees them: rectangles across and up, in
// units from the stone's middle. The fins are widest at their foot and run into the body this high.
const FIN = [150, 260] as const;
// The tower's ladder stands this far out from its left side.
const LADDER = 16;
const THINGS: [number, number, number, number][] = [
  [TABLE.l, TABLE.r, -STONE.edge, TABLE.top + 16],
  [TOWER.l - LADDER, TOWER.r, 0, TOWER.lamp + 18],
  ...TOWER.arms.map((a): [number, number, number, number] => [TOWER.r, -ROCKET.r, a - 16, a + 16]),
  [-ROCKET.r, ROCKET.r, 0, ROCKET.mouth + ROCKET.tall],
  [-ROCKET.fin, ROCKET.fin, 0, FIN[0]],
  [-ROCKET.fin * 0.72, ROCKET.fin * 0.72, FIN[0], FIN[1]],
];

function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (a: number, b: number, v: number) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };

// Whether a ball at a place, as large as a piece reaches with its sway, is somewhere the field may be. A piece in
// front of the stone keeps the rules of the front.
function allowed(x: number, y: number, z: number, r: number, front: boolean): boolean {
  const B = DEBRIS.bounds, F = DEBRIS.front, C = DEBRIS.clear, h = up(y, z);
  if (x - r < B.l || h + r > B.top || Math.abs(x) - r < DEBRIS.lane) return false;
  for (const [l, rr, b, t] of THINGS) if (x + r + C > l && x - r - C < rr && h + r + C > b && h - r - C < t) return false;
  if (front) {
    const rim = Math.sqrt(Math.max(0, STONE.r * STONE.r - x * x));
    return x + r < F.right && Math.abs(x) - r > F.end && (x < 0 || x - r > LAND[0] + F.land) && z - r > rim + C && y - r > -STONE.edge;
  }
  // Wholly behind the stone, a piece may hang low: the stone's far rim hides its foot.
  const back = z + r < -STONE.r - C;
  if (x + r > B.r || (y - r < B.low && !back)) return false;
  for (let i = -4; i <= 4 && !back; i++) {
    const X = x + (r * i) / 4;
    if (Math.abs(X) > STONE.r) continue;
    const rim = Math.sqrt(STONE.r * STONE.r - X * X) * SIN, low = h - Math.sqrt(Math.max(0, r * r - (X - x) ** 2));
    if (low < rim + C && h + r > -rim - STONE.edge - C) return false;
  }
  return true;
}

export function lay(): Laid[] {
  const rnd = random(SEED), out: Laid[] = [];
  const count: Record<string, number> = {};
  const next = (k: keyof typeof MODELS) => MODELS[k][(count[k] = (count[k] ?? -1) + 1) % MODELS[k].length];
  const turn = (): [number, number, number, number] => {
    const u = rnd(), v = rnd() * Math.PI * 2, w = rnd() * Math.PI * 2, a = Math.sqrt(1 - u), b = Math.sqrt(u);
    return [a * Math.sin(v), a * Math.cos(v), b * Math.sin(w), b * Math.cos(w)];
  };
  const axisOf = (): [number, number, number] => {
    const z = rnd() * 2 - 1, t = rnd() * Math.PI * 2, s = Math.sqrt(1 - z * z);
    return [s * Math.cos(t), s * Math.sin(t), z];
  };
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  // Pieces of one cluster drift as one, so only their bobbing comes between them.
  const clear = (x: number, y: number, z: number, r: number, cluster: number) => out.every((p) => Math.hypot(p.at[0] - x, p.at[1] - y, p.at[2] - z) > p.reach + r + (p.cluster === cluster ? 2 * MOTION.bob.size + 2 : 2 * SWAY + DEBRIS.clear));

  const place = (cluster: number, kind: number, across: number, model: string, where: () => [number, number, number], front = false) => {
    const reach = across * REACH, K = MOTION.blast, P = MOTION.plume, far = reach + SWAY;
    for (let i = 0; i < TRIES; i++) {
      const [x, y, z] = where();
      const d = Math.hypot(x - MOUTH[0], y - MOUTH[1], z - MOUTH[2]), flat = Math.hypot(x, z);
      // In front of the stone a piece is near the visitor and heavy, and the blast moves it least.
      const shove = K.shove[kind] * (1 - smooth(K.near, K.far, d)) * (0.8 + 0.4 * rnd()) * (front ? FRONT_SHOVE : 1);
      const plume = P.shove[kind] * (1 - smooth(P.near, P.far, flat)) * (0.8 + 0.4 * rnd());
      const s = shoved(x, y, z), q = plumed(x, z);
      const ok = (k1: number, k2: number) => allowed(x + s[0] * k1 + q[0] * k2, y + s[1] * k1 + q[1] * k2, z + s[2] * k1 + q[2] * k2, far, front);
      if (!ok(0, 0) || !ok(shove, 0) || !ok(0, plume) || !ok(shove, plume) || !clear(x, y, z, reach, cluster)) continue;
      const S = MOTION.spin, rate = kind === KIND.great ? 0 : (2 * Math.PI) / Math.max(S.least, S.period * (across / S.at) ** S.grow) * (rnd() < 0.5 ? -1 : 1) * (0.75 + 0.5 * rnd());
      const shape: [number, number, number] = [1, 1, 1];
      if (kind === KIND.great) { shape[Math.floor(rnd() * 3)] = SLAB.great[0] + (SLAB.great[1] - SLAB.great[0]) * rnd(); }
      else if (rnd() < SLAB.share) shape[Math.floor(rnd() * 3)] = SLAB.thin[0] + (SLAB.thin[1] - SLAB.thin[0]) * rnd();
      else { const k = Math.floor(rnd() * 3); shape[k] = 0.55 + 0.25 * rnd(); shape[(k + 1) % 3] = 0.65 + 0.25 * rnd(); }
      // A great piece shows the visitor its broad face: of a few turns, the one that points its thinnest way at the
      // visitor. Seen edge on, the largest slab read as one of the smaller pieces.
      let q4 = turn();
      if (kind === KIND.great) {
        const thin = shape.indexOf(Math.min(...shape)), facing = (t: number[]) => {
          const [qx, qy, qz, qw] = t, e = [0, 0, 0];
          e[thin] = 1;
          // The z of the thin axis once turned.
          return Math.abs(2 * (qx * qz - qw * qy) * e[0] + 2 * (qy * qz + qw * qx) * e[1] + (1 - 2 * (qx * qx + qy * qy)) * e[2]);
        };
        for (let k = 0; k < FACE_TRIES; k++) { const c = turn(); if (facing(c) > facing(q4)) q4 = c; }
      }
      out.push({ model, at: [x, y, z], across, reach, shape, turn: q4, axis: axisOf(), rate, cluster, phase: rnd(), shove, plume, kick: K.kick[kind] * (0.6 + 0.8 * rnd()), kind, seed: rnd() * 100 });
      return true;
    }
    return false;
  };

  DEBRIS.clusters.forEach((c, n) => {
    const t = c.trail, tl = Math.hypot(...t), dir = t.map((v) => v / tl);
    // Two ways across the trail, for its spread.
    const side = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], a = [dir[1] * side[2] - dir[2] * side[1], dir[2] * side[0] - dir[0] * side[2], dir[0] * side[1] - dir[1] * side[0]];
    const al = Math.hypot(...a), u = a.map((v) => v / al), w = [dir[1] * u[2] - dir[2] * u[1], dir[2] * u[0] - dir[0] * u[2], dir[0] * u[1] - dir[1] * u[0]];
    let edge = 0;
    if (c.great > 0 && place(n, KIND.great, c.great, next('great'), () => [c.at[0] + gauss() * 4, c.at[1] + gauss() * 4, c.at[2] + gauss() * 4])) edge = out[out.length - 1].reach;
    // Along the trail, the middle pieces nearer the great one and the small ones further, thinning as they go.
    const along = (from: number, to: number) => (): [number, number, number] => {
      const k = edge + c.long * (from + (to - from) * rnd() ** 0.8), wide = c.spread * (0.5 + k / Math.max(c.long, 1)), p = gauss() * wide, q = gauss() * wide;
      return [0, 1, 2].map((i) => c.at[i] + dir[i] * k + u[i] * p + w[i] * q) as [number, number, number];
    };
    for (let i = 0; i < c.middle; i++) {
      const across = SIZE.middle[0] + (SIZE.middle[1] - SIZE.middle[0]) * rnd();
      place(n, KIND.middle, across, next(across >= SIZE.fine ? 'middle' : 'chunk'), along(0.05, 0.6));
    }
    for (let i = 0; i < c.small; i++) place(n, KIND.small, SIZE.small[0] + (SIZE.small[1] - SIZE.small[0]) * rnd(), next('chip'), along(0.2, 1));
  });
  DEBRIS.front.pieces.forEach(([x, y, z, across], i) => {
    const kind = across >= SIZE.great ? KIND.great : KIND.middle;
    place(DEBRIS.clusters.length + i, kind, across, next('front'), () => [x + gauss() * 3, y + gauss() * 3, z + gauss() * 3], true);
  });
  return out;
}
