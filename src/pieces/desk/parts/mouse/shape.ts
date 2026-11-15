// The mouse's form, as numbers: millimetres, its foot on the mat at y = 0, its nose toward -z, the thumb's side at
// -x. A right handed gaming mouse, long and low: a top shell in three pieces (two buttons and the palm) sitting on a
// side frame, parted along a line that runs round the whole body.

export type V2 = [number, number];

// A smooth curve through points, flat beyond its ends.
export function curve(pts: V2[]): (x: number) => number {
  return (x: number) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (x > x1) continue;
      const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 2)];
      const t = (x - x0) / (x1 - x0), m0 = ((y1 - p[1]) / (x1 - p[0])) * (x1 - x0), m1 = ((q[1] - y0) / (q[0] - x0)) * (x1 - x0);
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1;
    }
    return pts[pts.length - 1][1];
  };
}

export const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const inside = (z: number, a: number, b: number, soft: number) => sstep(a - soft, a + soft, z) * (1 - sstep(b - soft, b + soft, z));

// An outline in plan: a superellipse along z whose ends are squarer at the nose than at the tail, with a half width
// of its own on each side at each place along it. t runs round it: 0 is the right side, pi / 2 the tail, pi the left,
// 3 pi / 2 the nose.
export interface Outline { half: number; zm: number; nF: number; nB: number; wl: (z: number) => number; wr: (z: number) => number; notch?: { depth: number; half: number } }

export function onOutline(o: Outline, t: number): V2 {
  const c = Math.cos(t), s = Math.sin(t), n = s < 0 ? o.nF : o.nB;
  let z = o.zm + o.half * Math.sign(s) * Math.abs(s) ** (2 / n);
  const w = c >= 0 ? o.wr(z) : o.wl(z);
  const x = w * Math.sign(c) * Math.abs(c) ** (2 / n);
  // The nose is cut back in a V between the two buttons' tips.
  if (o.notch && s < 0) z += o.notch.depth * Math.max(0, 1 - Math.abs(x) / o.notch.half) ** 1.5 * Math.min(1, -s * 4);
  return [x, z];
}

// How far out a point is, 1 on the outline itself.
export function across(o: Outline, x: number, z: number): number {
  const n = z < o.zm ? o.nF : o.nB, w = x >= 0 ? o.wr(z) : o.wl(z);
  return ((Math.abs(x) / w) ** n + (Math.abs(z - o.zm) / o.half) ** n) ** (1 / n);
}

// Where the top shell meets the frame. The left side is pulled in at the waist, where the thumb lies.
export const DECK: Outline = {
  half: 60.5, zm: -0.5, nF: 3.4, nB: 3.3, notch: { depth: 4.5, half: 9 },
  wr: curve([[-61, 23], [-45, 25.5], [-25, 27], [-5, 26.6], [15, 29], [35, 29.2], [50, 27], [60, 24]]),
  wl: curve([[-61, 23], [-45, 25.2], [-25, 25.2], [-6, 24.2], [12, 26.2], [32, 27.6], [50, 26.4], [60, 24]]),
};
// The foot, a little wider than the deck: the sides lean in as they rise.
export const FOOT: Outline = {
  half: 62, zm: -0.5, nF: 3.6, nB: 3.4,
  wr: curve([[-61, 24.8], [-45, 27.6], [-25, 29.4], [-5, 29.2], [15, 31.6], [35, 31.8], [50, 29.4], [60, 26.4]]),
  wl: curve([[-61, 24.8], [-45, 27.4], [-25, 28.2], [-6, 28], [12, 29.6], [32, 30.4], [50, 28.8], [60, 26.4]]),
};

// The skates lift it this far off the mat.
export const LIFT = 0.6;

// The height of its back along the middle: low over the finger tips, highest under the palm well behind the middle,
// falling away hard at the heel.
const CREST = curve([[-61, 13.5], [-48, 16.5], [-32, 20.5], [-15, 25.5], [0, 29.5], [14, 32.5], [26, 33.6], [38, 32.6], [47, 29.5], [54, 25], [60, 19]]);
// The height of the parting line round the sides.
const PART = curve([[-61, 10], [-40, 12], [-20, 14.6], [0, 16.8], [20, 19.4], [36, 20.6], [48, 19], [56, 15.5], [60, 12.5]]);

// The shell across, from the middle (0) to the parting line (1): a top that is nearly flat, then a bevel, then a
// steep side, each a plane, meeting the next at a crease rounded over a couple of millimetres. The creases are where
// the cursor's light runs as long lines.
const CREASE = { at: [0.5, 0.78], drop: [0.03, 0.42], round: 0.08 } as const;
const hinge = (x: number) => (x + Math.sqrt(x * x + CREASE.round * CREASE.round)) / 2 - CREASE.round / 2;
const slopes = [CREASE.drop[0] / CREASE.at[0], (CREASE.drop[1] - CREASE.drop[0]) / (CREASE.at[1] - CREASE.at[0]), (1 - CREASE.drop[1]) / (1 - CREASE.at[1])];
const fall0 = (a: number) => slopes[0] * a + (slopes[1] - slopes[0]) * hinge(a - CREASE.at[0]) + (slopes[2] - slopes[1]) * hinge(a - CREASE.at[1]);
const FALL1 = fall0(1);
const fall = (a: number) => fall0(a) / FALL1;

// The two shallow channels the fingers lie in, down the main buttons, and the spine down the middle of the palm,
// where two faces of the palm meet.
const scoop = (x: number, z: number) => 0.85 * Math.exp(-(((Math.abs(x) - 12.5) / 6.5) ** 2)) * inside(z, -56, -12, 7);
const spine = (x: number, z: number) => 0.12 * (Math.sqrt(x * x + 0.8) - Math.sqrt(0.8)) * sstep(-8, 8, z);

// On the left the frame rises over the thumb's buttons, and the parting line sweeps up round them.
export const RAISE = { by: 4.5, from: -38, to: -1, soft: 6 } as const;
const part = (x: number, z: number) => PART(z) + RAISE.by * inside(z, RAISE.from, RAISE.to, RAISE.soft) * sstep(-4, -18, x);

export function height(x: number, z: number): number {
  const a = Math.min(1, across(DECK, x, z)), b = part(x, z);
  return b + (CREST(z) - b) * (1 - fall(a)) - scoop(x, z) - spine(x, z);
}

// Which way the shell faces at a place, from the height itself, so the creases are as sharp as the height is
// whatever the grid.
export function facing(x: number, z: number): [number, number, number] {
  const e = 0.04, dx = (height(x + e, z) - height(x - e, z)) / (2 * e), dz = (height(x, z + e) - height(x, z - e)) / (2 * e);
  const l = Math.hypot(dx, 1, dz);
  return [-dx / l, 1 / l, -dz / l];
}

// The seams. g is the gap between two parts at the bottom of their chamfers, ch the chamfer, wall how deep a part's
// edge runs down into the gap.
export const SEAM = { g: 0.9, ch: 0.8, wall: 1.8 } as const;
// Where the main buttons end and the palm begins: further back at the sides than in the middle.
export const split = (x: number) => -5 + 8.5 * (x / 27) ** 2;
// The channel between the two buttons that the wheel and the button behind it sit in: its half width along the
// mouse.
export const CHANNEL = { from: -47, to: -9.5, half: 5.1, soft: 2.2 } as const;
export const channel = (z: number) => CHANNEL.half * inside(z, CHANNEL.from, CHANNEL.to, CHANNEL.soft);

// The wheel: where it is along the mouse, its radius, its half width, and how far it stands proud of the buttons.
export const WHEEL = { z: -33, r: 10.4, half: 3.9, proud: 4.4, tread: 2.6, hub: 9.3 } as const;
// The button behind the wheel: along the mouse, and its half width.
export const DPI = { z0: -18.2, z1: -11.8, half: 2.6 } as const;
// The light: a thin ring round the foot of that button, between it and its bezel, where the view looks down onto it.
// It lights the bezel, the button's sides and the back of the wheel's tread. How far it reaches past the button on
// each side, and how far under the button's top it stands.
export const LED = { ring: 0.6, under: 0.6 } as const;
// The channel's floor and everything under the shell lie this far under it.
export const FLOOR = 3.2;

// The thumb's rest: a lip that flares out low on the left flank and a ledge over it, and the weight of the flare at
// a place along the mouse.
export const WING = { out: 7.5, ledge: 3.5, from: -27, to: 26, soft: 6 } as const;
export const wing = (x: number, z: number, side: number) => (side < 0 ? sstep(0.25, 0.65, -x / 30) : 0) * inside(z, WING.from, WING.to, WING.soft);

// The thumb's two buttons on the left flank: each a slanted four sided pad, as corners in (z, share of the upper
// flank's height): front low, back low, back high, front high.
export const THUMB: [V2, V2, V2, V2][] = [
  [[-33, 0.3], [-20.5, 0.3], [-19, 0.86], [-30.5, 0.86]],
  [[-17.5, 0.3], [-4, 0.3], [-2.5, 0.86], [-14.5, 0.86]],
];
export const THUMB_PROUD = 1.3;

// The matte panel set into the palm: where its point is, how fast it widens behind it, its widest, where its back
// starts to round and how long the rounding is.
export const INLAY = { tip: 7, spread: 0.85, half: 11.5, round: 38, cap: 15 } as const;

// The grip panel behind the thumb's buttons, on both flanks: where it is along the mouse and up it, its half sizes
// and corner.
export const GRIP = { z: 16, y: 11.2, hz: 13.5, hy: 3.2, r: 2.8 } as const;
