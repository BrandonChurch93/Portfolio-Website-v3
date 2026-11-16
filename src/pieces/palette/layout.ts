// The palette and everything on it, in millimetres. The board's top is y = 0, x runs along its length to the right
// and z toward the viewer. The whole is turned on the table by YAW, so its length runs nearly across the picture and
// its right end lies a little further back. It imports nothing, so a script can read it as it is.

export type P2 = [number, number];

export const DEG = Math.PI / 180;
export const YAW = -19 * DEG;

// The board: walnut, its edge rounded over by `round`, and the thumb hole an oval turned by `turn`.
export const BOARD = { thick: 5, round: 2.1, cols: 200 } as const;
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

// The paints along the far rim, dark to pale and then the metals, left to right in the picture: the site's palette
// in order. Each is a dab squeezed from a tube: where it stands, how wide and tall, which way its tip was pulled.
export const PAINTS = ['ember-deep', 'ember', 'flame', 'hot', 'pale', 'bronze', 'copper'] as const;
export type PaintName = (typeof PAINTS)[number];
export interface Dab { x: number; z: number; r: number; h: number; lean: number; twist: number; seed: number }
export const DABS: Dab[] = [
  { x: -112, z: -40, r: 11.5, h: 6.4, lean: 40, twist: 0.4, seed: 11 },
  { x: -84, z: -60, r: 12.5, h: 7.4, lean: 160, twist: -0.3, seed: 23 },
  { x: -51, z: -74, r: 13.5, h: 8.2, lean: 80, twist: 0.6, seed: 37 },
  { x: -16, z: -80, r: 13, h: 8.6, lean: 210, twist: -0.5, seed: 41 },
  { x: 20, z: -78, r: 13.5, h: 8.0, lean: 300, twist: 0.3, seed: 53 },
  { x: 54, z: -68, r: 12, h: 7.0, lean: 120, twist: -0.4, seed: 67 },
  { x: 85, z: -50, r: 11.5, h: 6.6, lean: 20, twist: 0.5, seed: 79 },
];

// The mixing ground in the middle: flame drawn into pale with the knife. Each stroke is one pass of the blade: where
// it starts, where it ends, how wide it lays the paint and how thick, and how much of the pale is in it.
export interface Stroke { a: P2; b: P2; w: number; t: number; mix: number }
export const MIX = { x: -34, z: 2 } as const;
export const STROKES: Stroke[] = [
  { a: [-72, 10], b: [-30, -14], w: 21, t: 0.9, mix: 0.15 },
  { a: [-60, 22], b: [-14, 8], w: 19, t: 1.0, mix: 0.75 },
  { a: [-24, -22], b: [-46, 22], w: 17, t: 0.85, mix: 0.45 },
  { a: [-66, -4], b: [-22, 2], w: 15, t: 1.15, mix: 0.6 },
  { a: [-8, 18], b: [-40, 30], w: 13, t: 0.8, mix: 0.3 },
];

// The brush: a round sable, lying across the front half with its handle out over the bay. Its axis runs from the
// tip of its hairs along `dir`, `lift` over the board, the hairs bent down onto a bead of hot paint.
export const BRUSH = {
  tip: [-98, 46] as P2,
  dir: 17 * DEG,
  lift: 5.1,
  girth: 1.38,
  hair: 21,
  ferrule: 30,
  handle: 162,
  bead: { r: 5.6, h: 2.0 },
} as const;
export const brushAxis = (s: number): P2 => [BRUSH.tip[0] + Math.cos(BRUSH.dir) * s, BRUSH.tip[1] + Math.sin(BRUSH.dir) * s];

// The palette knife: a bronze trowel blade flat on the board beside the mixing ground, a cranked neck, a turned
// wooden handle that comes down to rest its end on the board.
export const KNIFE = {
  tip: [-3, -9] as P2,
  dir: -12 * DEG,
  blade: { len: 56, w: 23 },
  neck: { run: 14, rise: 10.5, r: 1.35 },
  ferrule: { len: 11, r: 4.2 },
  handle: { len: 74, r: 6.0 },
} as const;
export const knifeAxis = (s: number): P2 => [KNIFE.tip[0] + Math.cos(KNIFE.dir) * s, KNIFE.tip[1] + Math.sin(KNIFE.dir) * s];
