import { hex } from '../../../../config/palette';

// Every color of the dunes, and nowhere else. Sand is pale gold in the site's own colors: the light on it does the
// rest, so the moonlit faces go toward copper-light and hot and the lee toward copper and ember by themselves.
export const SAND = {
  // Wind sorted sand on the crests and the upper windward faces.
  crest: 0x77592b,
  // The body of a dune.
  body: 0x664a22,
  // The coarser, redder sand in the hollows between dunes.
  hollow: 0x45301a,
  // What a grain throws back at a grazing angle.
  sheen: hex('copper-light'),
} as const;

// The pool: polished gold, toward the palette's copper-light. Brighter, what it reflected burned to white and it
// read as a light and not a mirror.
export const POOL = 0xd9995a;

// What stands in the sand.
export const THING = {
  // Old pale stone, close to neutral.
  stone: 0x6a625a,
  // Dark polished stone: a warm near black that still shows its faces.
  dark: 0x231d19,
  // Polished bronze and gold.
  bronze: hex('bronze'),
  gold: 0xf0b670,
  // A small lamp's flame.
  lamp: hex('hot'),
} as const;
