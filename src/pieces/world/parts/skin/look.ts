// What the skin is made of, shared by its make script (scripts/world/parts/skin/) and its shader, so the light the
// script works out and the colors the page draws are of the same stone. Imports nothing, so the script can read it.

// Each side's stone as a palette name and how far it is eased toward a second: the pale side is a cream beige dust
// over the planet's rock, the brightest large thing on the planet after the core and the gold; the dark side is a
// deep warm near black, the same stone weathered; the crust's top layer, seen in section at a torn edge, is the
// dust's paler stone. Under the crust, in section, is the planet's own red brown rock (LIGHT.stone in the layout) at
// UNDER of its brightness.
export const STONE = {
  pale: { from: 'text-3', to: 'copper-light', k: 0.4, power: 1.08 },
  dust: { from: 'text-2', to: 'copper-light', k: 0.12, power: 0.89 },
  dark: { from: 'bg-3', to: 'text', k: 0.14, power: 0.6 },
} as const;
export const UNDER = 0.62;
// The pale side's dust is weathered: stained a little warmer where it lies open to the sky (red, green, blue), which
// is what keeps the lit half from reading grey and a little blue beside picture 9's warm cream.
export const WEATHER = [1, 0.975, 0.84] as const;
// The dark face close up: how much its strata change its tone, and its fine grain (how many grains to a pixel of
// picture 9, and how tall, in units).
// And its tint (red, green, blue): seen by the night's light alone it came out a cool grey black, blue over red 0.45,
// where picture 9's is a warm brown black at 0.34.
// Its unlit hairline fractures (hair): the size of the cells whose borders they follow and the share of those borders
// that are open, in picture 9's pixels, their half width, how much they darken the stone, and how steeply the ground
// falls into them (units of height to a pixel across).
export const DARK_FACE = { strata: 0.1, grain: [1.6, 0.12], tint: [1.06, 0.97, 0.72], hair: [15, 0.42, 0.32, 0.55, 0.5] } as const;
// The dark side is turned from the moon and from the core: it is seen by the night's soft light alone. The outer
// surface is open to the night, so it takes this many times what the world gives the rock of the hollow.
export const NIGHT_SIDE = 2.9;
// The pale side's shadows are near black, as picture 9's crescents are, and its light comes from the moon: it keeps
// this share of the night and of the light that bounces to it, a quarter of the way to grey.
export const PALE_SHADE = 0.42;
// What reaches the pale side's shadows has bounced off warm sand and warm stone first: a share of each of red, green
// and blue. Untinted, the side's shaded half came out a grey brown where picture 9's is a warm one.
export const PALE_WARM = [1.15, 0.92, 0.64] as const;
// How the pale side's rough ground shades itself as the moon rakes it lower toward the tear and the foot: its
// light falls with the moon's height over the outer surface faster than a smooth ball's would (power), from where it
// is whole (at, the cosine), and is never lifted past `most` toward the limb. Laid beside picture 9 its left half has
// a third of the light of the open ground, where a smooth ball's would have three fifths.
export const ROUGH = { at: 0.42, power: 1.3, most: 1.3 } as const;
// The crust's blocks are the planet's one stone (LIGHT.stone). In section at a break they are the stone itself, at
// UNDER of its brightness. On the dark side their weathered old top, which faces the night, is the same stone bleached
// toward its own grey by `bleach` and at `top` of its brightness; on the pale side that top is the dust, much of it
// shaken off by the break (`shaken`: how far it is the bleached stone). The dark side's blocks along the torn line
// are weathered less than the slab that faces the night (`line`, a share of its brightness).
// The weathered top is eased toward the pale side's cream by `cream`: bleached alone it was a pinkish grey beside
// picture 9's grey cream (green over red 0.74 against 0.80).
export const CRUST = { bleach: 0.8, top: 2.0, shaken: 0.55, line: 0.24, cream: 0.55 } as const;
// What the fourth number of the stored bounce says a vertex is: the skin (0), the skin's own broken edge before a block
// (edge), how far into the pale side's lit lip where it wraps the break (lip, at the most), a block along a torn line (line: from its broken section to its weathered top), or one of the blocks that
// face the visitor at the top of the dark side, the slab and the chunks hanging from it (facing: the same).
export const BLOCK_CODE = { lip: 0.08, edge: 0.18, line: [0.3, 0.48], facing: [0.55, 1] } as const;
export const blockTop = (code: number): number => {
  const [a, b] = code >= BLOCK_CODE.facing[0] - 0.03 ? BLOCK_CODE.facing : BLOCK_CODE.line;
  return Math.min(1, Math.max(0, (code - a) / (b - a)));
};
// Where the cracks' three arms meet, the light on the rock round it, from the junction and a little of the hot arm
// (along: how much of it), as from a source `lift` units out of the surface: its strength, the distance in units at
// which it has fallen to half (reach), and by `out` times that it has faded away, with no edge. Only the relief turns a
// face to it or from it. And how far round the junction the notch is cut deeper, in units. Picture 9 has a warm light
// on the rock round the knot, deep orange (green over red 0.45), about 110 beside the cleft, half that 20 of its
// pixels off and 30 at 40. Drawn as a spot over the rock it was a soft blob; taken from the whole hot arm it lay off to
// the right of the knot; and lit by the planet's own curve it left the rock on the knot's outer side dark. On the dark
// stone it came out tan, and it is deepened toward red (deepen: red, green, blue) to the picture's orange.
export const KNOT_POOL = { power: 16, reach: 22, out: 3.5, lift: 6, along: 0.06, notch: 6, deepen: [1, 0.72, 0.5] } as const;
// The dark side is turned from the moon and the core, and what shows its form is the night: a soft light from the
// visitor's side and above at the left (fill, and its direction in the world), and a dim sliver along its outline
// from the glow behind the world (rim). The crust's slab at the top faces up into that light, unshaded by the land
// over it, and takes it fully (slab), from higher up (slabFrom).
export const DARK_LIGHT = { fill: 0.07, from: [-0.5, 0.55, 0.67], rim: 0.5, slab: 2.2, slabFrom: [-0.3, 0.85, 0.45] } as const;
// A shadow the moon casts on the pale side takes this share of the night and the bounce in it, so a crater's crescent
// is near black and crisp as picture 9's are.
export const CRESCENT = 0.8;
// How strongly the night from the visitor's side lights the pale side's lip where it wraps the break.
export const PALE_LIP = 4.2;
// The pale side's moon shadow is the baked one, but for what the bake does not know: the land's shadow on the skin's
// top, from the shadow map, over the first of these units under the rim and fading by the second.
export const SHADE_TOP = [30, 60] as const;

// At the pale tear, where the crust has fallen away, the map's tone is stored between these two (a texel of the dust
// is never under the second): there the shader draws the planet's stone in section, its tone the share between them.
export const SECTION = [0.06, 0.4] as const;
// The map: how many of its texels to a pixel of picture 9, and the steepest slope it holds (units of height to a
// picture pixel across). Slopes are stored as the square root of their share of that, so gentle ones keep detail.
export const MAP = { perPixel: 1.55, slope: 5 } as const;

// The cracks as the shader cuts them, in picture 9's pixels. The grid's cells (size), how many lengths each holds
// (most, a multiple of four), and how far a length reaches (by its half width and heat). The fewest pixels of the
// screen a cleft is drawn as each side of its middle line (least). The heat over which a cleft lays its light on the
// rock right beside its lips (hot, from and to), and the distance over which that falls to a third (fall).
export const CRACK_CELL = {
  size: 3,
  most: 20,
  // How softly the near lengths are joined (a sharpness, per half width), and how much of the widening that soft join
  // gives is kept.
  soft: 6,
  join: 0,
  least: 0.85,
  hot: [0.15, 0.9],
  fall: 1.2,
  reach: (w: number, heat: number): number => w * 1.5 + 2.5 + (heat > 0.7 ? 2.5 : 0),
} as const;
// A cleft in section, as shares of its half width: its heart, where its light is seen (at no heat, and the more at full;
// narrow, with a hard edge), how much wider the wall that faces the visitor shows and how much narrower the one turned
// from him, how deep it is cut (units of depth to units of half width), and the lip raised along an unlit one's edge
// (height, and where). The light: the heart (pale gold, its strength), the walls (hot to flame, their strength), the
// lit wall at its lip and the far wall at its foot (shares), the dark rim before the spill (a share of the half width),
// how much brighter a cleft too thin to open is drawn (thin), how far a thin one's middle is eased toward pale (core), and the notch where the arms meet (how much brighter, how
// much wider its heart).
export const CLEFT = { floor: [0.1, 0.3], open: 1.1, shut: 0.8, deep: 1.5, lip: [0.1, 1.1, 0.22], heart: 1.15, thin: 1.5, wall: 0.75, lipLit: 0.55, far: 0.5, gap: 0.22, core: 0.7, notch: [0.35, 0.3] } as const;

// The cracks' own light: the palette's colors it passes through as it cools (pale gold, the hot orange, flame and
// ember), how far a warm arm's hot orange is eased toward pale (amber), the heats
// over which the hottest turn cream (cream), how its strength follows its heat (curve, a power), and how strongly the
// light that leaves a hot cleft lights the stone beside it (rock).
export const GLOW = { rock: 5, amber: 0.38, cream: [0.86, 0.98], curve: 1.25, ramp: ['pale', 'hot', 'flame', 'ember'] } as const;
