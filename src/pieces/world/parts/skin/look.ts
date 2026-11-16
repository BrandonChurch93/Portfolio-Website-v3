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
export const TERMINATOR = { from: 0.02, to: 0.5, low: 0.3, high: -0.06, soft: 0.1, floor: 0.92 } as const;
// The crust's blocks are the planet's one stone (LIGHT.stone). In section at a break they are the stone itself, at
// UNDER of its brightness. On the dark side their weathered old top, which faces the night, is the same stone bleached
// toward its own grey by `bleach` and at `top` of its brightness; on the pale side that top is the dust, much of it
// shaken off by the break (`shaken`: how far it is the bleached stone). The dark side's blocks along the torn line
// are weathered less than the slab that faces the night (`line`, a share of its brightness).
export const CRUST = { bleach: 0.55, top: 1.6, shaken: 0.55, line: 0.5 } as const;
// What the fourth number of the stored bounce says a vertex is: the skin (0), the skin's own broken edge before a block
// (edge), a block along a torn line (line: from its broken section to its weathered top), or one of the blocks that
// face the visitor at the top of the dark side, the slab and the chunks hanging from it (facing: the same).
export const BLOCK_CODE = { edge: 0.18, line: [0.3, 0.48], facing: [0.55, 1] } as const;
export const blockTop = (code: number): number => {
  const [a, b] = code >= BLOCK_CODE.facing[0] - 0.03 ? BLOCK_CODE.facing : BLOCK_CODE.line;
  return Math.min(1, Math.max(0, (code - a) / (b - a)));
};
// The light of the cracks' knot on the rock round it, as from one short source along the hot arm (skin.ts): its
// strength, the distance in units over which it falls (as a bell), the pale point at the junction (its strength and
// radius in units), how much further its faint tail reaches (a share of the first), how much of it lands on the
// crust's blocks beside it, and how far out along the hot arm it is centred (a share of the source's length: centred
// on its far end it lay over the blocks and not round the knot).
export const KNOT_POOL = { power: 13, reach: 15, hot: 2.2, hotR: 5, tail: 1.8, onCrust: 0.6, along: 0.35 } as const;
// The dark side is turned from the moon and the core, and what shows its form is the night: a soft light from the
// visitor's side and above at the left (fill, and its direction in the world), and a dim sliver along its outline
// from the glow behind the world (rim). The crust's slab at the top faces up into that light, unshaded by the land
// over it, and takes it fully (slab).
export const DARK_LIGHT = { fill: 0.07, from: [-0.5, 0.55, 0.67], rim: 0.5, slab: 1.9 } as const;
// A shadow the moon casts on the pale side takes this share of the night and the bounce in it, so a crater's crescent
// is near black and crisp as picture 9's are.
export const CRESCENT = 0.8;
// The pale side's moon shadow is the baked one, but for what the bake does not know: the land's shadow on the skin's
// top, from the shadow map, over the first of these units under the rim and fading by the second.
export const SHADE_TOP = [30, 60] as const;

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
  least: 0.85,
  hot: [0.72, 0.95],
  fall: 0.9,
  reach: (w: number, heat: number): number => w * 1.5 + 2.5 + (heat > 0.7 ? 2.5 : 0),
} as const;
// A cleft in section, as shares of its half width: the floor where its light is seen (at no heat, and the more at
// full), how much wider the wall that faces the visitor shows and how much narrower the one turned from him, how deep
// it is cut (units of depth to units of half width), and the lip raised along its edge (height, and where).
// The light: the heart at the floor (pale gold, its strength), the walls (hot to flame, their strength), the lips.
export const CLEFT = { floor: [0.24, 0.58], open: 0.55, shut: 0.45, deep: 1.5, lip: [0.1, 1.1, 0.22], heart: 3.2, wall: 1.3, rim: 0.7 } as const;

// The cracks' own light: the palette's colors it passes through as it cools (pale gold, the hot orange, flame and
// ember), how far a warm arm's hot orange is eased toward pale (amber), the heats
// over which the hottest turn cream (cream), how its strength follows its heat (curve, a power), and how strongly the
// light that leaves a hot cleft lights the stone beside it (rock).
export const GLOW = { rock: 10, amber: 0.38, cream: [0.86, 0.98], curve: 1.6, ramp: ['pale', 'hot', 'flame', 'ember'] } as const;
