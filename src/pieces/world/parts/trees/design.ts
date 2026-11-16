// The trees' design, which the make script (scripts/world/parts/trees/) and the part read alike. It imports nothing,
// so node can read it as it is.
//
// One kind of tree, made as several models in a crown's own units: the crown is about 1 to each side of the trunk,
// so a tree is drawn at TREES' size (about half its crown's width). Each crown is clumps of leaf: discs of leaves
// crossed at each clump's heart, and sprays of leaves round them on cards, every leaf drawn by the script into one
// atlas. The last model is the cheap one, for trees most of which another tree in front hides.

export const FILES = { mesh: 'trees.bin', leaves: 'trees-leaves.png' } as const;
export const MODELS = ['round', 'tall', 'twin', 'far'] as const;
export const FAR = MODELS.indexOf('far');

// The atlas: tiles of TILE pixels, COLS across and ROWS down. Which tile holds what. Its channels are numbers, not
// colors: red, how light a leaf is there; green, how far its hue leans from the tree's own; blue, how much it faces
// the light; alpha, how much of the pixel is leaf.
export const ATLAS = { tile: 256, cols: 4, rows: 2, levels: 8 } as const;
export const TILES = { sprays: [0, 1, 2, 3], discs: [4, 5], bark: 6, blob: 7 } as const;
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

// The crown, in its own units: how high its middle stands over the ground. Picture 9's crowns sit nearly on the
// ground, so little of a trunk shows.
export const CROWN = { high: 0.98 } as const;

// The shade a tree lays on the ground: a soft card from under the crown out along the ground away from the moon,
// so the belt sits dark at its foot. How far it starts behind the trunk and how far it reaches past it, and how
// wide it is to each side, in crown units. Each tree's card is cut short where the land ends.
export const SHADE = { back: 1.1, reach: 3.2, wide: 1.25, up: 0.04 } as const;
