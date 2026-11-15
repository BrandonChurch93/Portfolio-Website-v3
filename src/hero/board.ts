import { GROUND, HOST, SPIRE, VIEW } from '../pieces/skycity/layout';

// The hero as built (BRIEF.md, Settled, "The hero, the city at rest"): where everything stands, on a board 1460
// units wide that is drawn as wide as the screen up to 2400 px, as the other sections are. The wireframe he approved
// (./plan.ts, /lab/hero-draft) is where these places come from. The screen's height is part of it: his words are set
// from the top of the screen and the city from its foot, so the page's stylesheet works the two out, and these are
// the numbers it does it with. Lengths are in units.

export const BOARD = { w: 1460, least: 1100 };
export const CX = BOARD.w / 2;

const D2R = Math.PI / 180;

// His words: the block is about this tall. Its top is a third of the way down the screen less this much, and never
// nearer the top of the screen than least. The spire's tip keeps this far under the block.
export const WORDS = { w: 960, tall: 330, least: 90, third: 0.33, rise: 146, gap: 28 } as const;
// The city rests with the rim of its ground this far under the foot of the screen, so its falls are hidden until
// the page is scrolled.
export const HIDE = 40;
// The city, as it is drawn: how far the spire's tip is over the middle of its ground, how far the front of the
// rim is drawn under that middle, and how far under it the keel of its rock is.
export const CITY = {
  tall: SPIRE.tall,
  front: Math.round(GROUND.r * Math.sin(VIEW.el * D2R)),
  keel: Math.round(GROUND.rock * Math.cos(VIEW.el * D2R)),
  // Its host: how much room it keeps over the spire's tip, and how far under the middle of the ground it reaches.
  over: 80,
  under: HOST.up,
} as const;
// The glow behind and above the city until the sky draws it: how far it reaches across and up, and how far over
// the rim its middle is.
export const GLOW = { rx: 800, ry: 560, lift: 30 } as const;
// Work, under the city: how far under the keel its bar is, how wide the stand in for it is, and how much page
// follows on this page, where Work itself is not.
export const WORK = { under: 330, bar: 360, tail: 300 } as const;
