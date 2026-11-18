import { DEBRIS, ROCKET, STONE, TABLE, TOWER, VIEW } from '../../layout';
import { KIND, MOTION, SWAY } from './look';

// The field round the pad, laid out once from a seed: the same pieces in the same places on every visit. Each cluster
// of DEBRIS (../../layout.ts) is a great piece, if it has one, with middle and small pieces scattered about it. A
// piece is kept only where all of its motion, the blast's shove included, stays where the field may be: inside the
// bounds, clear of the table, the tower and the rocket as the page sees them, behind the rocket's climb wherever it
// would be drawn over it, never over the stone's top, and clear of every other piece. A piece drawn over the tower's
// lattice or touching a fin read as stuck in it, whatever its depth, so nothing is drawn over them at all.

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
  shove: number;
  kick: number;
  kind: number;
  seed: number;
}

// The models each kind wears, from the hero's own file: its great pieces for the great and the larger middle
// pieces, and its shared chips for the rest, by size.
const MODELS = {
  great: ['G4', 'G5', 'G3', 'G0.2'],
  middle: ['G7.1', 'G8.1', 'G1.2', 'G4.1', 'G6.1', 'G2', 'G5.1'],
  chunk: ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'],
  chip: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'],
  flake: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'],
  sliver: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
};
// How far across a middle piece and a small one may be, a sliver, the share of small pieces that are slivers, and
// the middle size past which a middle piece wears one of the great pieces' models, and the share of a great piece's
// small ones that hug it.
const SIZE = { middle: [12, 25], small: [3, 8], sliver: [1.2, 2.6], slivers: 0.2, fine: 18, hug: 0.3 } as const;
// The share of pieces pressed into slabs, and how thin a slab is at its thinnest and its thickest.
const SLAB = { share: 0.6, thin: [0.34, 0.62] } as const;
// How far from its middle a piece reaches against how far across it is: a broken block's corners stand out past it.
const REACH = 0.66;
const SEED = 7177;
const TRIES = 400;

const D2R = Math.PI / 180, COS = Math.cos(VIEW.el * D2R), SIN = Math.sin(VIEW.el * D2R);
// How far up a point is drawn, as the page sees it, from the stone's middle.
export const up = (y: number, z: number) => y * COS - z * SIN;

export const MOUTH: [number, number, number] = [0, ROCKET.mouth, 0];
// The table, the tower with its arms, and the rocket standing, as the page sees them: rectangles across and up, in
// units from the stone's middle. The fins are widest at their foot and run into the body this high.
const FIN = [150, 260] as const;
const THINGS: [number, number, number, number][] = [
  [TABLE.l, TABLE.r, -STONE.edge, TABLE.top + 16],
  [TOWER.l, TOWER.r, 0, TOWER.lamp + 18],
  ...TOWER.arms.map((a): [number, number, number, number] => [TOWER.r, -ROCKET.r, a - 16, a + 16]),
  [-ROCKET.r, ROCKET.r, 0, ROCKET.mouth + ROCKET.tall],
  [-ROCKET.fin, ROCKET.fin, 0, FIN[0]],
  [-ROCKET.fin * 0.72, ROCKET.fin * 0.72, FIN[0], FIN[1]],
];
// The way the blast shoves a piece: out from the engine's mouth and up. The shader works it out by the same lines.
export function shoved(x: number, y: number, z: number): [number, number, number] {
  const rx = x - MOUTH[0], ry = y - MOUTH[1], rz = z - MOUTH[2], flat = Math.hypot(rx, rz);
  const v: [number, number, number] = [rx, 0.5 * flat + 0.5 * Math.max(ry, 0), rz], l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

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

// Whether a ball at a place, as large as a piece reaches with its sway, is somewhere the field may be.
function allowed(x: number, y: number, z: number, r: number): boolean {
  const B = DEBRIS.bounds, C = DEBRIS.clear, h = up(y, z);
  // Wholly behind the stone, a piece may hang low: the stone's far rim hides its foot.
  const back = z + r < -STONE.r - C;
  if (x - r < B.l || x + r > B.r || h + r > B.top || (y - r < B.low && !back)) return false;
  for (const [l, rr, b, t] of THINGS) if (x + r + C > l && x - r - C < rr && h + r + C > b && h - r - C < t) return false;
  // The rocket climbs the whole height: over its path a piece hangs behind it.
  if (Math.abs(x) < ROCKET.fin + r + C && z + r > -ROCKET.fin - C) return false;
  // Never over the stone's top as the page sees it, nor its edge.
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
  const pick = (list: readonly string[], n: number) => list[n % list.length];
  const count: Record<string, number> = {};
  const next = (k: keyof typeof MODELS) => pick(MODELS[k], (count[k] = (count[k] ?? -1) + 1) + Math.floor(rnd() * 3));
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

  let big: Laid | null = null;
  const place = (cluster: number, kind: number, across: number, model: string, around: readonly number[], spread: readonly number[]) => {
    const reach = across * REACH, K = MOTION.blast;
    for (let i = 0; i < TRIES; i++) {
      // Beside a great piece the small ones hug it, a shell of chips round the block they broke from.
      const hug = kind === KIND.small && big !== null && rnd() < SIZE.hug;
      let x: number, y: number, z: number;
      if (hug && big) {
        const a = axisOf(), k = big.reach * (1.3 + 1.1 * rnd()) + reach;
        [x, y, z] = [big.at[0] + a[0] * k, big.at[1] + a[1] * k, big.at[2] + a[2] * k];
      } else {
        const wide = kind === KIND.great ? 0.25 : 1;
        [x, y, z] = [around[0] + gauss() * spread[0] * wide, around[1] + gauss() * spread[1] * wide, around[2] + gauss() * spread[2] * wide];
      }
      const d = Math.hypot(x - MOUTH[0], y - MOUTH[1], z - MOUTH[2]);
      const shove = K.shove[kind] * (1 - smooth(K.near, K.far, d)) * (0.8 + 0.4 * rnd());
      const s = shoved(x, y, z), far = reach + SWAY;
      if (!allowed(x, y, z, far) || !allowed(x + s[0] * shove, y + s[1] * shove, z + s[2] * shove, far) || !clear(x, y, z, reach, cluster)) continue;
      const S = MOTION.spin, rate = kind === KIND.great ? 0 : (2 * Math.PI) / Math.max(S.least, S.period * (across / S.at) ** S.grow) * (rnd() < 0.5 ? -1 : 1) * (0.75 + 0.5 * rnd());
      const shape: [number, number, number] = [1, 1, 1];
      if (kind !== KIND.small || rnd() < SLAB.share) {
        if (rnd() < SLAB.share) shape[Math.floor(rnd() * 3)] = SLAB.thin[0] + (SLAB.thin[1] - SLAB.thin[0]) * rnd();
        else { const k = Math.floor(rnd() * 3); shape[k] = 0.55 + 0.25 * rnd(); shape[(k + 1) % 3] = 0.65 + 0.25 * rnd(); }
      }
      out.push({ model, at: [x, y, z], across, reach, shape, turn: turn(), axis: axisOf(), rate, cluster, phase: rnd(), shove, kick: K.kick[kind] * (0.6 + 0.8 * rnd()), kind, seed: rnd() * 100 });
      return true;
    }
    return false;
  };

  DEBRIS.clusters.forEach((c, n) => {
    big = null;
    if (c.great > 0 && place(n, KIND.great, c.great, next('great'), c.at, c.spread)) big = out[out.length - 1];
    for (let i = 0; i < c.middle; i++) {
      const across = SIZE.middle[0] + (SIZE.middle[1] - SIZE.middle[0]) * rnd();
      place(n, KIND.middle, across, next(across >= SIZE.fine ? 'middle' : 'chunk'), c.at, c.spread);
    }
    for (let i = 0; i < c.small; i++) {
      const sliver = rnd() < SIZE.slivers, [a, b] = sliver ? SIZE.sliver : SIZE.small, across = a + (b - a) * rnd() ** 0.8;
      place(n, KIND.small, across, next(sliver ? 'sliver' : across >= 5 ? 'chip' : 'flake'), c.at, c.spread);
    }
  });
  return out;
}
