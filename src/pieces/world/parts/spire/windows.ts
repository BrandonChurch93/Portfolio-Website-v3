// The spire's windows, which its bay's material draws and scripts/world/parts/spire/ bakes the light of: the same
// numbers on both sides, so the light a window lays on the stone beside it is the light it shows. After the towers'
// windows, and warmer: the spire is the city's own, lit late. This file imports nothing, so the make script can
// read it as it is.

export const WINDOW = {
  // The bronze round each pane, in units: each side, the spandrel under it, and the head over it.
  frame: { side: 0.22, sill: 0.42, head: 0.14 },
  // How deep the room behind the glass is, in units.
  deep: 2.2,
  // The radiance of the brightest room, and the share of that its glass shows on average, for the far view and the
  // baker.
  gain: 2.9,
  mean: 0.62,
  // The least a room is lit: a room with its lights off still shows the city's glow on its far wall, so the strip
  // of glass is never a black hole in the stone.
  dark: 0.07,
  // How far a blind dims what is behind it.
  blind: 0.5,
  // The colors a room is lit in, from the warmest to the palest, as names in the palette.
  colors: ['flame', 'hot', 'copper-light'] as const,
  // A room's level is stored as level ** (1 / curve), and lights by level.
  curve: 1.6,
  // A dim room is lit warmer: its light goes to the warmest color as its level falls from dim[1] to dim[0], so no
  // lit pane is ever a pale grey.
  dim: [0.12, 0.75] as const,
  // The map of every window's state: this many texels square, one a window.
  map: 128,
} as const;

// What one window shows on average across its cell, as a share of WINDOW.gain in its own color: how lit it is
// (0 to 1, as stored), and how far a blind is down (0 to 1).
// How pale a room's light is, 0 to 1, from its stored paleness and its level.
export function paleness(warm: number, level: number): number {
  const t = Math.min(1, Math.max(0, (level - WINDOW.dim[0]) / (WINDOW.dim[1] - WINDOW.dim[0])));
  return warm * t * t * (3 - 2 * t);
}

export function shown(level: number, blind: number, cw: number, ch: number): number {
  const f = WINDOW.frame, glass = Math.max(0, cw - 2 * f.side) * Math.max(0, ch - f.sill - f.head) / Math.max(1e-6, cw * ch);
  return glass * WINDOW.mean * Math.max(level ** WINDOW.curve, WINDOW.dark) * (1 - WINDOW.blind * blind);
}
