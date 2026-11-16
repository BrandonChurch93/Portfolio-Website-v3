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

// The site's palette in order, which is the order of the paints along the rim.
export const PAINTS = ['ember-deep', 'ember', 'flame', 'hot', 'pale', 'bronze', 'copper'] as const;
export type PaintName = (typeof PAINTS)[number];

// A dab of paint: where it stands, how wide and tall, which way its tip was pulled, which paint (an index into
// PAINTS), and how old it is: 0 fresh from the tube with a wet peak, 1 dried to a cracked skin. An old dab may have
// been scraped flat with the knife: `scrape` is the way the blade went, where across the dab it began (-1 to 1) and
// the height it left.
export interface Dab {
  x: number; z: number; r: number; h: number; lean: number; twist: number; seed: number; paint: number; age: number;
  scrape?: { a: number; from: number; h: number };
}
// Along the far rim, left to right in the picture, fresh dabs in the palette's order with the old ones left between
// them: a second squeeze of flame, a scraped hot, a crust of pale, an old bronze at the edge, a copper scraped down,
// and an ember gone hard at the left end whose run went over the edge.
export const DABS: Dab[] = [
  { x: -134, z: -12, r: 7.5, h: 2.6, lean: 180, twist: 0.2, seed: 101, paint: 1, age: 1 },
  { x: -114, z: -40, r: 10, h: 6.2, lean: 40, twist: 0.4, seed: 11, paint: 0, age: 0 },
  { x: -80, z: -58, r: 12.5, h: 7.8, lean: 160, twist: -0.3, seed: 23, paint: 1, age: 0 },
  { x: -48, z: -74, r: 14, h: 9.6, lean: 80, twist: 0.6, seed: 37, paint: 2, age: 0 },
  { x: -32, z: -52, r: 6, h: 4.2, lean: 250, twist: 0.1, seed: 43, paint: 2, age: 0.15 },
  { x: -12, z: -82, r: 13, h: 9.0, lean: 210, twist: -0.5, seed: 41, paint: 3, age: 0 },
  { x: 4, z: -60, r: 8.5, h: 3.4, lean: 30, twist: 0.3, seed: 47, paint: 3, age: 0.85, scrape: { a: 20, from: -0.2, h: 1.1 } },
  { x: 24, z: -80, r: 15, h: 10.4, lean: 300, twist: 0.3, seed: 53, paint: 4, age: 0 },
  { x: 40, z: -60, r: 6, h: 1.8, lean: 90, twist: 0, seed: 59, paint: 4, age: 1 },
  { x: 40, z: -93, r: 6, h: 1.6, lean: 0, twist: 0, seed: 61, paint: 5, age: 1 },
  { x: 57, z: -70, r: 12, h: 7.5, lean: 120, twist: -0.4, seed: 67, paint: 5, age: 0 },
  { x: 86, z: -54, r: 11.5, h: 7.0, lean: 20, twist: 0.5, seed: 79, paint: 6, age: 0 },
  { x: 108, z: -48, r: 7, h: 2.6, lean: 200, twist: 0, seed: 83, paint: 6, age: 0.9, scrape: { a: 140, from: 0.1, h: 0.7 } },
];

// The mixing ground in the middle: flame drawn into pale with the knife. Each stroke is one pass of the blade: where
// it set down, where it lifted, how far it bowed, how wide it laid the paint and how thick, and how much pale is in it.
export interface Stroke { a: P2; b: P2; bow: number; w: number; t: number; mix: number }
export const MIX = { x: -34, z: 2 } as const;
export const STROKES: Stroke[] = [
  { a: [-76, 8], b: [-30, -16], bow: 4, w: 20, t: 1.25, mix: 0.15 },
  { a: [-62, 24], b: [-14, 10], bow: -3, w: 18, t: 1.05, mix: 0.75 },
  { a: [-22, -22], b: [-46, 24], bow: 5, w: 16, t: 0.95, mix: 0.45 },
  { a: [-70, -6], b: [-24, 2], bow: -2, w: 14, t: 1.2, mix: 0.6 },
  { a: [-6, 18], b: [-40, 32], bow: 3, w: 12, t: 0.8, mix: 0.3 },
];

// Old paint gone hard on the wood, thin skins with an edge you could lift with a nail: where, how large, which paint.
export interface Crust { x: number; z: number; r: number; paint: number; seed: number }
export const CRUSTS: Crust[] = [
  { x: -90, z: -12, r: 5.5, paint: 2, seed: 3 },
  { x: -62, z: 42, r: 4.2, paint: 4, seed: 5 },
  { x: -64, z: -88, r: 4.5, paint: 1, seed: 7 },
  { x: 6, z: -97, r: 4, paint: 3, seed: 9 },
  { x: 72, z: -79, r: 3.6, paint: 6, seed: 13 },
  { x: 2, z: -30, r: 3.4, paint: 2, seed: 17 },
];
// Where the knife was wiped clean: a smear dragged along the wood, thick where it began and gone to nothing.
export interface Wipe { a: P2; b: P2; w: number; paint: number }
export const WIPES: Wipe[] = [
  { a: [-118, -58], b: [-102, -70], w: 4.5, paint: 0 },
];
// The run that went over the edge from the old ember at the left end while the palette stood on its end, and the bead
// it left hanging under the edge.
export const RUN = { from: 0, len: 15, w: 3.4, bead: 2.3 } as const;
// Thumbprints in paint by the hole, where the hand that holds it smudged: where, which way, which paint.
export const PRINTS: { x: number; z: number; a: number; paint: number; seed: number }[] = [
  { x: 72, z: 10, a: 35, paint: 2, seed: 2 },
  { x: 120, z: 12, a: -25, paint: 6, seed: 4 },
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

// A second, smaller brush: a flat, loaded with copper, lying in front of the round with its handle over the edge.
export const FLAT = {
  tip: [-62, 82] as P2,
  dir: 13 * DEG,
  lift: 3.9,
  hair: { len: 15, w: 9.5, t: 2.6 },
  ferrule: 20,
  handle: 118,
} as const;
export const flatAxis = (s: number): P2 => [FLAT.tip[0] + Math.cos(FLAT.dir) * s, FLAT.tip[1] + Math.sin(FLAT.dir) * s];

// The palette knife: a bronze trowel blade flat on the board beside the mixing ground, a cranked neck of flat spring
// steel, a bolster, and a handle of two wooden scales held by rivets, which comes down to rest its end on the board.
export const KNIFE = {
  tip: [-3, -9] as P2,
  dir: -12 * DEG,
  blade: { len: 56, w: 23 },
  neck: { run: 15, rise: 9.5, w: 3.4, t: 0.9 },
  bolster: { len: 9, r: 4.4 },
  handle: { len: 76, w: 12.5, t: 9 },
} as const;
export const knifeAxis = (s: number): P2 => [KNIFE.tip[0] + Math.cos(KNIFE.dir) * s, KNIFE.tip[1] + Math.sin(KNIFE.dir) * s];

// The dipper: a small brass cup clipped to the back rim, its cup outside the edge, a spring clip over the board's
// edge on a hinge, and a dark pool of medium in it. f is where on the outline, by angle.
export const DIPPER = { f: Math.PI + 0.86, r: 11.5, top: 9, bottom: -4.95, pool: 3.2, jaw: 9 } as const;

// A strip of masking tape over the left front edge, written on in pencil. f is where on the outline; it reaches in
// over the top and wraps under.
export const TAPE = { f: Math.PI - 0.36, w: 16, inward: 30, under: 10 } as const;

// What is drawn on the wood rather than built: the maker's stamp burned in at the left end, the ring a cup left, and
// pencil.
export const STAMP = { x: -124, z: 4, w: 13, h: 23 } as const;
export const RING = { x: 58, z: 58, r: 16 } as const;
