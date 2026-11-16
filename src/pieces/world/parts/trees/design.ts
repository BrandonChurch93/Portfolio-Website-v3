// The trees' design, which the make script (scripts/world/parts/trees/) and the part read alike. It imports nothing,
// so node can read it as it is.
//
// One kind of tree, made as several models in a crown's own units: the crown is about 1 to each side of the trunk.
// A crown is three to five masses of very different sizes with dark between them, each mass filled with small lumps
// of leaf, each lump a card of leaves the shader keeps facing the viewer, and each mass a card of its own leaves at
// its heart and one crossed through it. Every leaf is drawn by the script into one atlas. The last model is the
// cheap one, for every tree behind the first two ranks of crowns.

export const FILES = { mesh: 'trees.bin', leaves: 'trees-leaves.png' } as const;
export const MODELS = ['round', 'tall', 'twin', 'broad', 'far'] as const;
export const FAR = MODELS.indexOf('far');

// The atlas: tiles of TILE pixels, COLS across and ROWS down. Which tile holds what. Its channels are numbers, not
// colors: red, how light a leaf is there; green, how far its hue leans from the tree's own; blue, how much it faces
// the light; alpha, how much of the pixel is leaf. The lumps fill the first row whole, so the shader can hand a
// lump of one tree another lump's outline by moving along the row.
export const ATLAS = { tile: 384, cols: 4, rows: 2, levels: 8 } as const;
export const TILES = { lumps: [0, 1, 2, 3], core: [4, 5], bark: 6, blob: 7 } as const;
// A tree of TREES' size s is drawn s wide (laid over picture 9, the picture's crowns are as wide as the plan's sizes):
// the models are 2 wide, so they are drawn at this share of s.
export const DRAWN = 0.5;
// Where each level of the atlas's chain is in its file: the first at the left, every smaller one stacked in a
// column at its right. The file is one and a half times as wide as the atlas.
export function level(k: number): { x: number; y: number; w: number; h: number } {
  const W = ATLAS.tile * ATLAS.cols, H = ATLAS.tile * ATLAS.rows;
  if (k === 0) return { x: 0, y: 0, w: W, h: H };
  let y = 0;
  for (let i = 1; i < k; i++) y += H >> i;
  return { x: W, y, w: W >> k, h: H >> k };
}
// The middle of a tile in the atlas, and how far a card reaches from it, as shares of the atlas.
export function tileAt(tile: number): { u: number; v: number; du: number; dv: number } {
  const c = tile % ATLAS.cols, r = Math.floor(tile / ATLAS.cols);
  return { u: (c + 0.5) / ATLAS.cols, v: (r + 0.5) / ATLAS.rows, du: 0.5 / ATLAS.cols, dv: 0.5 / ATLAS.rows };
}

// A leaf, in a crown's own units: how long it is. Every tile is painted so its leaves come out this size on the
// card it is drawn on: about a twentieth of the crown's width, so at three times the page's size a leaf is two or
// three pixels and a crown is sprigs of leaves, never a stipple and never shingles.
export const LEAF = 0.1;
// How wide a lump's card is against its lump, and the card at a mass's heart against the ball it fills. And the
// size of each that its tiles are painted for (a lump's radius and a heart's, in a crown's units): smaller or larger
// lumps wear smaller or larger leaves.
export const CARD = { lump: 1.16, core: 1.08, painted: { lump: 0.21, core: 0.36 } } as const;

// The crown, in its own units: how far over the ground its lowest leaves are, on the full models and on the cheap
// one, so a short dark trunk shows under the front ranks, joined to the crown.
export const CROWN = { clear: 0.3, far: 0.24 } as const;

// The shade a tree lays on the ground: a soft card from under the crown out along the ground away from the moon,
// so the belt sits dark at its foot, and darkest round the trunk's foot. How far it starts behind the trunk and how
// far it reaches past it, and how wide it is to each side, in crown units. Each tree's card is cut short where the
// land ends. The moon stands about 22 degrees up, so a crown's shade lies about two and a half times as far as it
// is tall: a crown about 1.9 tall lays its shade about 4.6 out.
export const SHADE = { back: 1.6, reach: 4.6, wide: 1.6, up: 0.04 } as const;
