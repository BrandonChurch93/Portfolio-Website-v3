// What the skin is made of, shared by its make script (scripts/world/parts/skin/) and its shader, so the light the
// script works out and the colors the page draws are of the same stone. Imports nothing, so the script can read it.

// Each side's stone as a palette name and how far it is eased toward a second: the pale side is the rock's own
// pale warm grey (ALBEDO in scripts/world/lib/rock.mjs), dusted paler on top; the dark side is a deep warm near
// black; the crust's top layer, seen in section at a torn edge, is the dust's paler stone.
export const STONE = {
  pale: { from: 'text-3', to: 'copper-light', k: 0.13, power: 1.38 },
  dust: { from: 'text-2', to: 'copper-light', k: 0.2, power: 1.15 },
  dark: { from: 'bg-3', to: 'text-3', k: 0.16, power: 1 },
} as const;
// The dark side is turned from the moon and from the core: it is seen by the night's soft light alone, which the
// world gives the rock of the hollow only a tenth of. The outer surface is open to the night, so it takes this many
// times that.
export const NIGHT_SIDE = 2.6;

// The map: how many of its texels to a pixel of picture 9, and the steepest slope it holds (units of height to a
// picture pixel across). Slopes are stored as the square root of their share of that, so gentle ones keep detail.
export const MAP = { perPixel: 3, slope: 5 } as const;

// The cracks' own light: how bright it is where it is hottest, as a share of the palette's pale, and the light it
// passes through as it cools (pale gold, the hot orange, flame, ember), each at the share of glow it is reached at.
export const GLOW = { power: 2.6, ramp: [['pale', 0.8], ['hot', 0.55], ['flame', 0.32], ['ember', 0.1]] } as const;
