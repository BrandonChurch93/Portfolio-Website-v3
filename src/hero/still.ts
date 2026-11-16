// The hero's world as one picture, which a screen too narrow for the live world shows in its place: a phone, an
// iPad held upright. scripts/world/still.mjs takes it from the real hero page (npm run still). It imports nothing,
// so the script reads it as it is.
export const STILL = {
  file: '/media/world-still.webp',
  // The board's width in its own units, and what of the world's host the picture keeps, in those units: from its
  // left, from its top, and its size. From over the spire to under the hollow, with the stream fallen from the core.
  board: 1460,
  keep: { x: 40, y: 0, w: 1380, h: 1000 },
  quality: 0.8,
  // The least width it is shown at, in CSS pixels: on a phone it is wider than the screen and its two ends, the
  // pyramid's far foot and the dunes' far end, are off it, so the city and the core are large enough to read.
  least: 540,
} as const;
