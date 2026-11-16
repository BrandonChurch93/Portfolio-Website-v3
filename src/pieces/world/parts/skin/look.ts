// What the skin is made of, shared by its make script (scripts/world/parts/skin/) and its shader, so the light the
// script works out and the colors the page draws are of the same stone. Imports nothing, so the script can read it.

// Each side's stone as a palette name and how far it is eased toward a second: the pale side is a cream beige dust
// over the planet's rock, the brightest large thing on the planet after the core and the gold; the dark side is a
// deep warm near black, the same stone weathered; the crust's top layer, seen in section at a torn edge, is the
// dust's paler stone. Under the crust, in section, is the planet's own red brown rock (LIGHT.stone in the layout) at
// UNDER of its brightness.
export const STONE = {
  pale: { from: 'text-3', to: 'copper-light', k: 0.46, power: 1.8 },
  dust: { from: 'text-2', to: 'copper-light', k: 0.24, power: 1.12 },
  dark: { from: 'bg-3', to: 'text', k: 0.14, power: 0.5 },
} as const;
export const UNDER = 0.62;
// The dark side is turned from the moon and from the core: it is seen by the night's soft light alone. The outer
// surface is open to the night, so it takes this many times what the world gives the rock of the hollow.
export const NIGHT_SIDE = 2.9;
// The pale side's shadows are near black, as picture 9's crescents are, and its light comes from the moon: it keeps
// this share of the night and of the light that bounces to it, a quarter of the way to grey.
export const PALE_SHADE = 0.3;

// The map: how many of its texels to a pixel of picture 9, and the steepest slope it holds (units of height to a
// picture pixel across). Slopes are stored as the square root of their share of that, so gentle ones keep detail.
export const MAP = { perPixel: 3, slope: 5 } as const;

// The cracks' own light: how bright it is where it is hottest, as a share of the palette's pale, and the light it
// passes through as it cools (pale gold, the hot orange, flame, ember), each at the share of glow it is reached at.
// rock is how strongly the light that leaves a cleft lights the stone beside it, as a multiple of the stone's color.
export const GLOW = { power: 2.6, rock: 16, ramp: [['pale', 0.8], ['hot', 0.55], ['flame', 0.32], ['ember', 0.1]] } as const;
