// The site's colors, defined once. The interface reads them as CSS variables (set on <html> in src/app/layout.tsx),
// and 3D reads them as numbers through hex().
//
// Sampled from reference/portrait.jpg. The light behind Brandon is hue 31, fully saturated and dark (#5b2f00).
// Every warm color here sits within a few degrees of that hue, so the photo, the metal and the light read as one.
export const palette = {
  // Ground: the photo's own near black, a touch warm.
  bg: '#070403',
  'bg-2': '#0f0906',
  'bg-3': '#1a100a',
  // Light: the photo's glow, from its falloff up to the hottest core. Hot parts go to pale gold, never white.
  'ember-deep': '#1f0b00',
  ember: '#5b2f00',
  flame: '#f78e1e',
  hot: '#ffb866',
  pale: '#ffe3c2',
  // Metal: bronze and copper at the photo's hue, in place of the second build's yellow brass.
  'bronze-deep': '#3d2513',
  bronze: '#96602f',
  copper: '#c9803d',
  'copper-light': '#e3a567',
  // Text: warm off white, never pure white.
  text: '#f4ede5',
  'text-2': '#cbbfb2',
  'text-3': '#96897b',
} as const;

export type PaletteName = keyof typeof palette;

export function hex(name: PaletteName): number {
  return parseInt(palette[name].slice(1), 16);
}

export const paletteVars = Object.fromEntries(Object.entries(palette).map(([k, v]) => [`--${k}`, v])) as Record<string, string>;
