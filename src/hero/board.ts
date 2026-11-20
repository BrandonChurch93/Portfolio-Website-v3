import { DEBRIS, HOST, RIM, SOURCE, SPIRE, WORLD as PLANET, drawn } from '../pieces/world/layout';

// The hero as built (BRIEF.md, Settled, "The hero, the city at rest"): where everything stands, on a board 1460
// units wide that is drawn as wide as the screen up to 2400 px, as the other sections are. The wireframe he approved
// (./plan.ts, /lab/hero-draft) is where these places come from. The screen's height is part of it: his words are set
// from the top of the screen and the tip of the world's spire hangs a set way under them, or lower on a tall
// screen, where that would bring the world's torn edge into sight. The page's stylesheet works that out, and
// these are the numbers it does it with. Lengths are in units.

export const BOARD = { w: 1460, least: 1100 };
export const CX = BOARD.w / 2;

// His words: the block is about this tall. Its top is a third of the way down the screen less this much, and never
// nearer the top of the screen than least. The spire's tip keeps this far under the block. On a screen much taller
// than the board is wide the world rests at the screen's foot (CITY.show), and the room between the words and the
// spire grew without end: 600 px of empty sky at 4K and 850 on an upright screen laid out wide. There the words
// come down with the world, so that room is never more than `give` over the gap. On a laptop, a 1080p screen and an
// iPad held sideways that is never reached, and they are as they were (?words=third puts them back everywhere).
export const WORDS = { w: 960, tall: 330, least: 90, third: 0.33, rise: 146, gap: 20, give: 210 } as const;
const tip = drawn(0, SPIRE.tall, 0)[1], r1 = (v: number): number => Math.round(v * 10) / 10;
// The world, as it is drawn, measured down from the tip of its spire: how far over the tip its host begins, how
// tall its host is, the top of the dome, its torn edge at the sides, the underside of the core, where the stream
// leaves it, and the lowest of what broke away.
export const CITY = {
  // The most of the world under its top that shows at rest: the skyline and the land, down to the land's front
  // edge. On a tall screen the world rests lower, so that the tear and the core stay under the foot of the screen
  // until the page is scrolled.
  show: 75,
  over: r1(tip),
  tall: HOST.tall,
  pole: r1(drawn(0, 0, 0)[1] - tip),
  edge: r1(drawn(PLANET.half, -RIM, 0)[1] - tip),
  source: r1(drawn(...SOURCE)[1] - tip),
  low: r1(drawn(0, DEBRIS.low, 0)[1] - tip),
} as const;
// The night sky (src/hero/sky), which also draws the glow behind and above the world. It ends at the world's torn
// edge, under which the world and what broke away fill the screen's width, and its canvas a little under that.
// The ground kept clear round his words, the glow's reach and how far under the top of the dome its middle is, the
// moon in one upper corner and the band of far stars across the other.
export const SKY = {
  tail: 60,
  clear: { rx: 560, ry: 250 },
  glow: { rx: 780, ry: 540, down: 60 },
  moon: { x: 1296, y: 132, r: 46 },
  band: { x: 210, y: 150, rx: 420, ry: 54, turn: -24 },
} as const;
// Work, under the world: how far under the lowest of what broke away its bar is, so the torn underside, the core
// and what broke away fill a screen with nothing of Work in sight. How wide the stand in for the bar is, and how
// much page follows on this page, where Work itself is not.
export const WORK = { under: 480, bar: 360, tail: 300 } as const;

// The hero's world is the new one, built to picture 9's layout (src/pieces/world/). He asked for it on the page on
// Nov 15, before it was finished, so the page scrolls from the hero to Contact (BRIEF.md, Settled, Hero). The one
// before it (src/pieces/skycity/) is set aside and is on no page.
export const WORLD = { shown: true, piece: 'world' } as const;
