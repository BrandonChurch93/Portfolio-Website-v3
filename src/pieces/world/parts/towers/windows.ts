// The towers' windows, which the bay's material draws and scripts/world/parts/towers/ bakes the light of: the same
// numbers on both sides, so the light a window lays on the stone beside it is the light it shows. This file
// imports nothing, so the make scripts can read it as it is.

export const WINDOW = {
  // The bronze round each pane, in units: each side, the spandrel under it, and the head over it.
  frame: { side: 0.3, sill: 0.62, head: 0.16 },
  // and at most this share of a window's width (each side) and height (the spandrel, the head), so a narrow window
  // is still mostly glass.
  most: { side: 0.14, sill: 0.3, head: 0.1 },
  // How deep the room behind the glass is, in units.
  deep: 2.4,
  // The radiance of the brightest room, and the share of that its glass shows on average, for the far view and the
  // baker.
  gain: 4,
  mean: 0.6,
  // How far a blind dims what is behind it.
  blind: 0.5,
  // Close up: how deep the glass is set behind its frame, how far apart a blind's slats are, how tall the sill the
  // room lights is, in units, and how bright a room is drawn against its average, so that close and far agree.
  reveal: 0.16,
  slat: 0.11,
  sill: 0.1,
  near: 1.45,
  // The colors a room is lit in, from the warmest to the palest, as names in the palette.
  colors: ['flame', 'hot', 'pale'] as const,
  // A room's level is stored as level ** (1 / curve), and lights by level.
  curve: 1.6,
  // The map of every window's state: this many texels square, one a window.
  map: 128,
  // Windows let into stone carry the stone's tone as a style: their width is stored with this many times
  // (1 + 4 tone) added, the tone in quarters.
  style: 100,
} as const;

// The towers' stones, a building's tone (0 to 1) picking one in sixths: what each multiplies the pale stone's color
// by in linear light, how metallic and how rough it is. A pale limestone, a buff stone, a sandstone, a red brown
// stone, a dark granite, a cladding of bronze and a near black polished stone. Here so the baker lights each as it
// is drawn.
export const STONES = [
  { tint: [1, 1, 1], metal: 0, rough: 0.82 },
  { tint: [0.8, 0.66, 0.5], metal: 0, rough: 0.85 },
  { tint: [0.62, 0.45, 0.3], metal: 0, rough: 0.86 },
  { tint: [0.45, 0.27, 0.17], metal: 0, rough: 0.8 },
  { tint: [0.24, 0.2, 0.17], metal: 0, rough: 0.7 },
  { tint: [0.46, 0.27, 0.12], metal: 0.85, rough: 0.42 },
  { tint: [0.1, 0.085, 0.075], metal: 0.3, rough: 0.16 },
] as const;
// What the make stores with each place for the material: how high over its building's foot it is, as a share of
// `foot` units (the street's light is on the lowest storeys), and how far back it is in z from the city's front
// rows to its back (`depth`, z at each), where the far rows fall darker.
export const PLACE = { foot: 48, depth: [260, -170] } as const;
export const stoneOf = (tone: number): number => Math.min(STONES.length - 1, Math.max(0, Math.round(tone * (STONES.length - 1))));
// A field of windows carries its building's stone, as a style stored in the window's width (WINDOW.style times
// it): 0 none, 1 + the stone's place for windows let into that stone, 1 + STONES.length + it for windows in bronze
// on a building of that stone, whose wall seen from far off is that stone.
export const styleOf = (tag: { stone?: number; tone?: number }): number =>
  tag.stone !== undefined ? 1 + stoneOf(tag.stone) : tag.tone !== undefined ? 1 + STONES.length + stoneOf(tag.tone) : 0;
// How far the pale stone is drawn from the palette's text-2 toward its copper-light, in linear light: a warm
// limestone, so the city's walls are warm in the night's light and not greige.
export const WARM = 0.5;

// What one window shows on average across its cell, as a share of WINDOW.gain in its own color: how lit it is
// (0 to 1, as stored), and how far a blind is down (0 to 1).
export function shown(level: number, blind: number, cw: number, ch: number): number {
  const f = WINDOW.frame, m = WINDOW.most, side = Math.min(f.side, m.side * cw), glass = Math.max(0, cw - 2 * side) * Math.max(0, ch - Math.min(f.sill, m.sill * ch) - Math.min(f.head, m.head * ch)) / Math.max(1e-6, cw * ch);
  return glass * WINDOW.mean * level ** WINDOW.curve * (1 - WINDOW.blind * blind);
}
