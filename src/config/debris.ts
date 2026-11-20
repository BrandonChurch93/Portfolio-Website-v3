// Pieces of the hero's debris as pictures, for the places a live 3D field would cost too much or could not run:
// each cut whole from a still of the hero's own field on a clear ground (scripts are in shots/final/tools:
// alpha2.mjs takes the field, rocks2.mjs cuts it), three of the file's pixels to one of the board's units. This file
// imports nothing.
export const ROCKS = {
  pair: { file: '/media/debris/rock-01.webp', w: 1100, h: 855 },
  slab: { file: '/media/debris/rock-02.webp', w: 345, h: 247 },
  block: { file: '/media/debris/rock-03.webp', w: 226, h: 165 },
  wedge: { file: '/media/debris/rock-04.webp', w: 187, h: 191 },
  tooth: { file: '/media/debris/rock-06.webp', w: 142, h: 203 },
  chip: { file: '/media/debris/rock-08.webp', w: 166, h: 175 },
  flake: { file: '/media/debris/rock-09.webp', w: 172, h: 148 },
} as const;
export type RockName = keyof typeof ROCKS;

// One piece in a field: which, where its middle is as shares of the field's width and height, how wide it is as a
// share of the field's width, how far it is turned, in degrees, and how far off it hangs, 0 to 1: a far piece is
// dimmer, sways less and is passed more slowly as the page scrolls.
export interface Adrift { rock: RockName; x: number; y: number; w: number; turn?: number; far?: number; flip?: boolean }
