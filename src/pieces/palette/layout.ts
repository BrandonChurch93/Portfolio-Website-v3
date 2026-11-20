// The palette and everything on it, in millimetres. The board's top is y = 0, x runs along its length to the right
// and z toward the viewer. The whole is turned on the table by YAW, so its length runs nearly across the picture and
// its right end lies a little further back. It imports nothing, so a script can read it as it is.

export type P2 = [number, number];

export const DEG = Math.PI / 180;
export const YAW = -19 * DEG;

// The board: walnut, its edge rounded over by `round`, and the thumb hole an oval turned by `turn`.
export const BOARD = { thick: 5, round: 2.1, cols: 220 } as const;
export const HOLE = { x: 96, z: 26, rx: 15.5, rz: 12, turn: -24 * DEG } as const;

const sm = (a: number, b: number, v: number) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// The kidney: an oval, fuller at the left, drawn in toward the thumb at the right, with the bay for the fingers in
// its front edge beside the hole and a chip out of its back edge.
const BAY = { at: 0.93, width: 0.3, depth: 36 } as const;
export const CHIP = { at: 3.92, width: 0.035, depth: 2.6 } as const;
export function outline(t: number): P2 {
  const f = t * Math.PI * 2;
  let x = 150 * Math.cos(f), z = 108 * Math.sin(f);
  z *= 1 - 0.13 * sm(-20, 150, x);
  x += 6 * Math.sin(2 * f) * 0.4;
  const bay = Math.exp(-((wrap(f - BAY.at) / BAY.width) ** 2));
  z -= BAY.depth * bay;
  x += 6 * bay;
  const c = wrap(f - CHIP.at) / CHIP.width;
  const chip = Math.abs(c) < 1 ? CHIP.depth * (1 - Math.abs(c)) ** 0.6 * (0.8 + 0.2 * Math.sin(c * 9)) : 0;
  const l = Math.hypot(x, z);
  return [x - (x / l) * chip, z - (z / l) * chip];
}

// A point of the outline by its angle, and the way out of the board there.
export function rimAt(f: number): { p: P2; n: P2; t: P2 } {
  const t = f / (Math.PI * 2), e = 1e-4;
  const p = outline(t), a = outline(t - e), b = outline(t + e);
  const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
  // The outline runs counter clockwise seen from above (x right, z toward the viewer), so out is to its right.
  const n: P2 = [tz / l, -tx / l];
  const out = n[0] * p[0] + n[1] * p[1] > 0 ? n : ([-n[0], -n[1]] as P2);
  return { p, n: out, t: [tx / l, tz / l] };
}

// The deepest point of the bay, and where the chip is: the hand wears the wood pale round the one, and the other shows
// fresh wood.
export const BAY_AT = outline(BAY.at / (Math.PI * 2));
export const CHIP_AT = outline(CHIP.at / (Math.PI * 2));

// The thumb hole's edge in a direction from its middle.
export function holeAt(a: number): P2 {
  const c = Math.cos(a - HOLE.turn), s = Math.sin(a - HOLE.turn);
  const r = 1 / Math.sqrt((c / HOLE.rx) ** 2 + (s / HOLE.rz) ** 2);
  return [HOLE.x + Math.cos(a) * r, HOLE.z + Math.sin(a) * r];
}

// Points round the outline, evenly by length.
export function rim(n: number): P2[] {
  const fine = 4096, pts: P2[] = [], len: number[] = [0];
  for (let i = 0; i <= fine; i++) pts.push(outline(i / fine));
  for (let i = 1; i <= fine; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = len[fine], out: P2[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const want = (k / n) * total;
    while (len[j + 1] < want) j++;
    const u = (want - len[j]) / Math.max(1e-9, len[j + 1] - len[j]);
    out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * u, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * u]);
  }
  return out;
}

// Where a point of the board lies in the world, turned by YAW (three's rotation about y).
export const turned = (x: number, z: number): P2 => [x * Math.cos(YAW) + z * Math.sin(YAW), -x * Math.sin(YAW) + z * Math.cos(YAW)];

// The view: from above and the front left. Across the picture is this way in the world.
export const VIEW = { az: 28, el: 50, fov: 18, across: 0.73 } as const;
const RIGHT: P2 = [Math.cos(VIEW.az * DEG), Math.sin(VIEW.az * DEG)];

// The point the stream meets it at: the left most point of the outline in the picture, on the rounded edge's middle.
export const STRIKE = (() => {
  let best: P2 = [0, 0], lo = Infinity;
  for (const p of rim(720)) {
    const [wx, wz] = turned(p[0], p[1]);
    const s = wx * RIGHT[0] + wz * RIGHT[1];
    if (s < lo) { lo = s; best = p; }
  }
  return { x: best[0], y: -BOARD.round * 0.6, z: best[1] };
})();

// The paints are a scale, the thing a design system is: nine steps from a near black umber to the palette's cream,
// each a share of two of the site's colors (src/config/palette.ts) and a brightness, dark to pale. Each step's name is
// the number stamped beside it.
export interface Step { name: string; a: string; b: string; k: number; v: number }
export const STEPS: Step[] = [
  { name: '900', a: 'bg-3', b: 'bronze-deep', k: 0.55, v: 1 },
  { name: '800', a: 'ember-deep', b: 'ember', k: 0.45, v: 1.05 },
  { name: '700', a: 'ember', b: 'flame', k: 0.12, v: 1.08 },
  { name: '600', a: 'ember', b: 'flame', k: 0.72, v: 1 },
  { name: '500', a: 'copper', b: 'flame', k: 0.15, v: 1 },
  { name: '400', a: 'flame', b: 'hot', k: 0.4, v: 1 },
  { name: '300', a: 'hot', b: 'copper-light', k: 0.45, v: 0.98 },
  { name: '200', a: 'hot', b: 'pale', k: 0.55, v: 1 },
  { name: '100', a: 'pale', b: 'pale', k: 0, v: 1 },
];

// Where the dabs stand: an arc that runs this far in from the far rim, from the angle on the outline nearest the
// strike to the one before the thumb's end, with the dabs evenly spaced along it.
export const ARC = { from: Math.PI + 0.3, to: 2 * Math.PI - 0.58, inset: 21 } as const;
// A dab: where it stands, its radius and height, which way its peak was pulled (degrees round from x), how far the
// coil is turned, its step, and the way into the board and along the arc there.
export interface Dab { x: number; z: number; r: number; h: number; lean: number; twist: number; seed: number; step: number; inward: P2; along: P2 }
export const DAB = { r: 9.6, h: 11.5 } as const;
// The mark beside each dab: a brass pin head this far in from the dab's edge, and its step number stamped further in.
export const MARK = { pin: 6.0, pinR: 1.6, pinH: 0.9, label: 12.8, size: 3.4 } as const;

// The arc is an oval inside the board's own, so it follows the rim but none of its chips and bays.
function arcAt(f: number): P2 {
  const x = (150 - ARC.inset) * Math.cos(f);
  return [x, (108 - ARC.inset) * Math.sin(f) * (1 - 0.13 * sm(-20, 150, x))];
}
export const DABS: Dab[] = (() => {
  const fine = 600, pts: P2[] = [], len = [0];
  for (let i = 0; i <= fine; i++) pts.push(arcAt(ARC.from + ((ARC.to - ARC.from) * i) / fine));
  for (let i = 1; i <= fine; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const out: Dab[] = [];
  const LEAN = [205, 150, 230, 120, 260, 175, 300, 140, 240], TWIST = [0.4, 1.9, 3.1, 0.9, 4.4, 2.5, 5.3, 1.3, 3.7];
  for (let k = 0; k < STEPS.length; k++) {
    const want = (len[fine] * k) / (STEPS.length - 1);
    let j = 0;
    while (j < fine - 1 && len[j + 1] < want) j++;
    const q = pts[j], t = [pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]], tl = Math.hypot(t[0], t[1]);
    const along: P2 = [t[0] / tl, t[1] / tl];
    out.push({ x: q[0], z: q[1], r: DAB.r * (0.97 + 0.06 * ((k * 7) % 3) / 2), h: DAB.h * (0.94 + 0.12 * ((k * 5) % 4) / 3), lean: LEAN[k], twist: TWIST[k], seed: 11 + k * 13, step: k, inward: [-along[1], along[0]], along });
  }
  return out;
})();

// The swatches: four drawdowns pulled with the knife side by side in the middle, each a clean strip of paint with a
// ridge along both sides, thick where the blade set down and ragged where it lifted. Each is two steps mixed, a and b,
// by k, and the last is still wet. at is where the blade set down, dir the way it was pulled (degrees round from x).
export interface Swatch { at: P2; dir: number; len: number; w: number; a: number; b: number; k: number; wet: number; seed: number }
export const SWATCHES: Swatch[] = [
  { at: [-78, -24], dir: 86, len: 31, w: 14, a: 1, b: 4, k: 0.5, wet: 0, seed: 3 },
  { at: [-61, -24.5], dir: 88, len: 30, w: 14, a: 3, b: 5, k: 0.5, wet: 0.15, seed: 5 },
  { at: [-44, -25], dir: 89, len: 30.5, w: 14, a: 5, b: 7, k: 0.5, wet: 0.35, seed: 7 },
  { at: [-27, -25.5], dir: 91, len: 29, w: 14, a: 6, b: 8, k: 0.55, wet: 1, seed: 9 },
];
export const MIX = { x: -52, z: -10 } as const;

// The brush: a round sable, the largest thing on the board after the board, lying across the front half with its
// handle out over the edge. Its axis runs from the tip of its hairs along `dir`, `lift` over the board, which is the
// handle's belly, and the hairs bend down onto a bead of the hot step.
export const BRUSH = {
  tip: [-102, 40] as P2,
  dir: 17 * DEG,
  lift: 6.0,
  hair: 24,
  ferrule: 34,
  handle: 172,
  bead: { r: 4.4, h: 1.7 },
} as const;
export const brushAxis = (s: number): P2 => [BRUSH.tip[0] + Math.cos(BRUSH.dir) * s, BRUSH.tip[1] + Math.sin(BRUSH.dir) * s];

// The palette knife: a polished steel trowel blade flat on the board beside the swatches it drew, a cranked neck of flat spring
// steel, a bolster, and a handle of two wooden scales held by rivets, which comes down to rest its end on the board.
export const KNIFE = {
  tip: [-8, 4] as P2,
  dir: -3 * DEG,
  blade: { len: 56, w: 23 },
  neck: { run: 15, rise: 9.5, w: 3.4, t: 0.9 },
  bolster: { len: 9, r: 4.4 },
  handle: { len: 76, w: 12.5, t: 9 },
} as const;
export const knifeAxis = (s: number): P2 => [KNIFE.tip[0] + Math.cos(KNIFE.dir) * s, KNIFE.tip[1] + Math.sin(KNIFE.dir) * s];

// The dipper: a small brass cup clipped to the back rim, its cup outside the edge, a spring clip over the board's
// edge on a hinge, and a dark pool of medium in it. f is where on the outline, by angle.
export const DIPPER = { f: Math.PI - 0.6, r: 11.5, top: 9, bottom: -4.95, pool: 3.2, jaw: 9 } as const;

// The maker's stamp, burned into the wood at the left end.
export const STAMP = { x: -124, z: 4, w: 13, h: 23 } as const;
