// What the skin is made of, shared by its make script (scripts/world/parts/skin/) and its shader, so the light the
// script works out and the colors the page draws are of the same stone. Imports nothing, so the script can read it.

// Each side's stone as a palette name and how far it is eased toward a second: the pale side is a cream beige dust
// over the planet's rock, the brightest large thing on the planet after the core and the gold; the dark side is a
// deep warm near black, the same stone weathered; the crust's top layer, seen in section at a torn edge, is the
// dust's paler stone. Under the crust, in section, is the planet's own red brown rock (LIGHT.stone in the layout) at
// UNDER of its brightness.
export const STONE = {
  pale: { from: 'text-3', to: 'copper-light', k: 0.46, power: 0.97 },
  dust: { from: 'text-2', to: 'copper-light', k: 0.24, power: 0.89 },
  dark: { from: 'bg-3', to: 'text', k: 0.24, power: 0.42 },
} as const;
export const UNDER = 0.62;
// The pale side's dust is weathered: stained a little warmer where it lies open to the sky (red, green, blue), which
// is what keeps the lit half from reading grey and a little blue beside picture 9's warm cream.
export const WEATHER = [1, 0.975, 0.9] as const;
// The dark face close up: how much its strata change its tone, and its fine grain (how many grains to a pixel of
// picture 9, and how tall, in units).
export const DARK_FACE = { strata: 0.22, grain: [1.6, 0.12] } as const;
// The land's sand, which lies in the hollows of the skin's shoulder under the land's edge: as the land has it.
export const SAND = { of: ['pale', 'hot'], ease: 0.45, power: 0.92 } as const;
// The dark side is turned from the moon and from the core: it is seen by the night's soft light alone. The outer
// surface is open to the night, so it takes this many times what the world gives the rock of the hollow.
export const NIGHT_SIDE = 2.9;
// The pale side's shadows are near black, as picture 9's crescents are, and its light comes from the moon: it keeps
// this share of the night and of the light that bounces to it, a quarter of the way to grey.
export const PALE_SHADE = 0.42;
// What reaches the pale side's shadows has bounced off warm sand and warm stone first: a share of each of red, green
// and blue. Untinted, the side's shaded half came out a grey brown where picture 9's is a warm one.
export const PALE_WARM = [1.12, 0.93, 0.72] as const;
// How the pale side's rough ground shades itself as the moon rakes it lower toward the tear and the foot. Where the
// moon stands this high over the outer surface (the cosine, from) a face is lit only if it is turned to the moon by
// more than `low` (the cosine, over `soft`), and where it is this high (to) by more than `high`: so toward the tear the
// tops and lips turned to the moon stay as bright as ever and the rest goes dark, as picture 9's does, where an even
// dimming made a flat grey. And the light there is this share (floor) of its full. On the broken crust by the torn
// line only what is turned to the moon by more than `crust` is lit: the band is in shadow but for the tops tipped to it.
export const TERMINATOR = { from: 0.02, to: 0.5, low: 0.3, high: -0.1, soft: 0.2, floor: 0.92 } as const;
// The crust's weathered top, which is pale on both sides: on the dark side it is seen in section at the torn edge and
// as the great slab that runs on out over the hollow at the top. A share of the pale stone, and how much of the red
// brown under it shows in the section of a broken face there.
export const CRUST_TOP = { pale: 0.3, tint: 0.6 } as const;
// The light of the cracks' knot on the rock round it, as from one short source along the hot arm (skin.ts): its
// strength, the distance in units over which it falls to about a third, and the white gold point at the junction (its strength
// and radius in units).
export const KNOT_POOL = { power: 6, reach: 11, hot: 3.5, hotR: 5.5 } as const;
// The dark side is turned from the moon and the core, and what shows its form is the night: a soft light from the
// visitor's side and above at the left (fill, and its direction in the world), and a dim sliver along its outline
// from the glow behind the world (rim). The crust's slab at the top faces up into that light, unshaded by the land
// over it, and takes it fully (slab).
export const DARK_LIGHT = { fill: 0.07, from: [-0.5, 0.55, 0.67], rim: 0.5, slab: 1.9 } as const;
// A shadow the moon casts on the pale side takes this share of the night and the bounce in it, so a crater's crescent
// is near black and crisp as picture 9's are.
export const CRESCENT = 0.8;

// The map: how many of its texels to a pixel of picture 9, and the steepest slope it holds (units of height to a
// picture pixel across). Slopes are stored as the square root of their share of that, so gentle ones keep detail.
export const MAP = { perPixel: 1.55, slope: 5 } as const;

// The cracks as the shader cuts them, in picture 9's pixels. The grid's cells (size), how many lengths each holds
// (most, a multiple of four), and how far a length reaches: a lit one by its cleft and the light it lays on the rock
// beside it, which falls to a third over `fall` (a base and a share of the half width), an unlit one by its cleft.
export const CRACK_CELL = {
  size: 4,
  most: 16,
  fall: [0.25, 0.22],
  reach: (w: number, heat: number): number => w * 1.5 + 1 + (heat > 0 ? 3 * (0.25 + 0.22 * w) : 0),
} as const;
// A cleft in section, as shares of its half width: the floor where its light is seen (at no heat, and the more at
// full), how much wider the wall that faces the visitor shows and how much narrower the one turned from him, how deep
// it is cut (units of depth to units of half width), and the lip raised along its edge (height, and where).
// The light: the heart at the floor (pale gold, its strength), the walls (hot to flame, their strength), the lips.
export const CLEFT = { floor: [0.24, 0.58], open: 0.55, shut: 0.45, deep: 1.5, lip: [0.1, 1.1, 0.22], heart: 3.2, wall: 1.3, rim: 0.7 } as const;

// The cracks' own light: how bright it is where it is hottest, as a share of the palette's pale, and the light it
// passes through as it cools (pale gold, the hot orange, flame, ember), each at the share of glow it is reached at.
// rock is how strongly the light that leaves a cleft lights the stone beside it, as a multiple of the stone's color.
export const GLOW = { power: 2.6, rock: 16, ramp: [['pale', 0.8], ['hot', 0.55], ['flame', 0.32], ['ember', 0.1]] } as const;
