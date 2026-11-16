// The towers' windows, which the bay's material draws and scripts/world/parts/towers/ bakes the light of: the same
// numbers on both sides, so the light a window lays on the stone beside it is the light it shows. This file
// imports nothing, so the make scripts can read it as it is.

export const WINDOW = {
  // The bronze round each pane, in units: each side, the spandrel under it, and the head over it.
  frame: { side: 0.3, sill: 0.62, head: 0.16 },
  // How deep the room behind the glass is, in units.
  deep: 2.4,
  // The radiance of the brightest room, and the share of that its glass shows on average, for the far view and the
  // baker.
  gain: 2.6,
  mean: 0.6,
  // How far a blind dims what is behind it.
  blind: 0.5,
  // The colors a room is lit in, from the warmest to the palest, as names in the palette.
  colors: ['flame', 'hot', 'pale'] as const,
  // A room's level is stored as level ** (1 / curve), and lights by level.
  curve: 1.6,
  // The map of every window's state: this many texels square, one a window.
  map: 128,
} as const;

// What one window shows on average across its cell, as a share of WINDOW.gain in its own color: how lit it is
// (0 to 1, as stored), and how far a blind is down (0 to 1).
export function shown(level: number, blind: number, cw: number, ch: number): number {
  const f = WINDOW.frame, glass = Math.max(0, cw - 2 * f.side) * Math.max(0, ch - f.sill - f.head) / Math.max(1e-6, cw * ch);
  return glass * WINDOW.mean * level ** WINDOW.curve * (1 - WINDOW.blind * blind);
}
