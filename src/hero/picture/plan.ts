// The hero's world as pictures, for an iPad laid out wide (BRIEF.md, Open 36, his ruling of Nov 21): the planet as
// one picture, what broke away as many, each family of pieces a picture of its own that drifts as the live family
// does, and the stream's light on them as a second set that is uncovered as far as the stream has run.
// scripts/world/picture.mjs takes them from the live piece and writes them with this list of what is where
// (npm run picture). This file imports nothing, so the script reads it as it is.

export const PICTURE = {
  // Where the files are, under public.
  dir: '/media/world',
  planet: 'planet.webp',
  page: (i: number): string => `debris-${i + 1}.webp`,
  layers: 'layers.json',
  // How many of a file's pixels a unit of the board gets, and the moment on the clock the pictures are taken at.
  scale: 2,
  t: 9,
  // The most a page of pieces is across and down, in its pixels, and the clear room round each piece on it.
  most: 2048,
  gutter: 2,
  // How good each file is, 0 to 1.
  quality: { planet: 0.86, page: 0.9 },
  // How far the stream has to have run, in units, for the pictures taken with its light on to be of all of it.
  run: 1400,
  // Into how many depths a family is cut where a piece's drift turns on how far back it is.
  slabs: { ring: 2, whirl: 4, dust: 3 },
  // Cuts of one group nearer one another than this many units share a layer in the page.
  near: 70,
  // The neck of light under the core, cut from the planet with the stream's light on it: how bright a place of it
  // has to be, 0 to 255, to be the light itself, from none of it to all of it.
  neck: [120, 200],
  // The most shards riding the neck that are kept, and the fewest pixels one has to cover to be kept.
  riders: [18, 60],
  // And how many ride at once, each wearing one of the kept pictures in turn.
  riding: 16,
  // Over how many units the stream's light gives way at its leading end.
  soft: 14,
} as const;

// A cut of a page of pieces: where it lies in the world's host, in units from its top left, and where it is on
// its page, in the page's pixels. `lit` is the same cut with the stream's light on it, where that differs.
export interface Sprite { box: [number, number, number, number]; at: [number, number, number]; lit?: [number, number, number] }
// Pieces that drift as one: their kind and family (src/pieces/world/parts/debris/motion.ts), the middle of them
// where they rest, in the world's units, the great piece a ring goes round, and how far an arm swings.
// Its cuts are laid in tiles, each a layer of its own in the page, and `lane` is whether any of it lies where the
// stream's light reaches.
export interface Tile { box: [number, number, number, number]; sprites: Sprite[] }
export interface Group { kind: number; family: number; at: [number, number, number]; plate?: { family: number; at: [number, number, number] }; extra: number; box: [number, number, number, number]; tiles: Tile[]; lane: boolean }
// A chip the stream carries: where it rests, its pace, its picture's size in units and its place on its page.
export interface Chip { at: [number, number, number]; pace: number; size: [number, number]; on: [number, number, number] }
// A shard that rides the neck of light: its picture's size in units and its place on its page.
export interface Rider { size: [number, number]; on: [number, number, number] }
// How they ride, as the live world's own numbers (src/pieces/world/parts/core/riders.ts and the neck's widths), in
// units down from the core's foot and seconds: where a run begins, how long it is and takes, how far out from the
// neck's edge and how fast round it, where the neck is cut and how far past that they are let go, and the neck's
// half width, as its narrowest and the two parts by which it is wider where it leaves.
export interface Ride { from: readonly number[]; run: readonly number[]; time: readonly number[]; out: readonly number[]; turn: readonly number[]; past: number; cut: number; rib: number; flare: readonly number[]; body: readonly number[] }
export interface Layers {
  // Each page's size in its pixels.
  pages: [number, number][];
  // The planet where the stream's light changes it: the rock under the core with that light on it, and the neck of
  // light alone, which lies over whatever is behind it.
  rock: Sprite | null;
  neck: Sprite | null;
  // Everything the stream's light changes lies inside this box of the host.
  lane: [number, number, number, number];
  groups: Group[];
  chips: Chip[];
  riders: Rider[];
  ride: Ride | null;
}
