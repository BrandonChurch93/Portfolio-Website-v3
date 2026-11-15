import { STONE as CARVED, STONE_BAKE, STONE_TALL } from '../../../../stream/stone';
import { LAND, STONE } from '../../layout';

// The Sun stone laid flat, in the pad's units: its carving is the Work stones' own (src/stream/stone.ts), baked into
// the same two pictures, and stood up here as a real height over a disc STONE.r across.

// One of the carving's own levels, read from the carving so that it is never written twice.
const level = (name: string): number => {
  const m = STONE_BAKE.match(new RegExp(`\\b${name} = ([0-9.]+)`));
  if (!m) throw new Error(`stone: the carving has no ${name}`);
  return Number(m[1]);
};
const FLOOR = level('FLOOR'), GROUND = level('GROUND'), HIGH = level('HIGH');

// The carving's heights are in radii of the stone. Here its floor is cut STONE.cut under its high tops, which stand
// at y = 0. What stands over those tops, the rays' ridges, the ring round the face and the face, is kept low, this
// share of its height: the stone's top is y = 0, and the table's feet and the engine's fire stand on it there.
export const DEEP = STONE.cut / (HIGH - FLOOR);
// The rays stand further out than the table's feet and keep more.
export const OVER = { middle: 0.15, rays: 0.6, from: 0.49, to: 0.53 };
export const R = STONE.r;
export const LEVEL = { floor: FLOOR, ground: GROUND, high: HIGH, tall: STONE_TALL, fill: CARVED.fill };
// The highest the carving stands and its lowest, at the very edge of its rim, in units.
export const TOP = (STONE_TALL - HIGH) * DEEP * OVER.rays;
export const LIP = -HIGH * DEEP;

// The edge under the rim's rounded lip, down to the page, as (radius, height): an upright band with a fine bead round
// it. The rim's own lip is in the carving.
export const EDGE: [number, number][] = [
  [0, LIP - 0.6], [R - 3, LIP - 0.6], [R, LIP], [R, -10.3], [R + 0.7, -10.75], [R, -11.2], [R, -STONE.edge], [0, -STONE.edge],
];

// The rings it lights by, from the rim in, as shares of its radius: where the carving's own rings part. The rim with
// the moat inside it, the sixteen plates out to the raised line, the twenty glyphs to the line inside them, the
// rounded ring round the face, and the face, which is lit last.
export const RINGS = [1, 0.915, 0.6945, 0.5105, 0.456, 0] as const;

// Where the stream lands, as a place on the stone's top and an angle round it.
export const LANDS = { x: LAND[0], z: LAND[2], angle: Math.atan2(LAND[2], LAND[0]) };

// What a pixel of the march is: how many steps down through the carving, and how many to find the face it lands on.
// How many steps toward the cursor's light for the shadows the carving throws into itself.
export const MARCH = { steps: 72, refine: 6, shadow: 14 };

// How large the two pictures are baked here, and how wide the carving's upright walls are cut, in radii. The page draws
// the stone 640 across at twice the pixels: 2048 keeps a texel under a pixel across it, and a wall a texel and a half
// wide is as sharp against the pixels as the Work stones' walls are against theirs.
export const BAKE = { size: 2048, tiles: 4, wall: '0.0015' };
