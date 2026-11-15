import { SPIRE } from '../../layout';

// The spire's form, in the city's units, y up from the plaza, its axis at the origin. Bearings are in degrees from
// straight toward the visitor, turning to the visitor's right.
//
// It is one gesture from the plaza to the tip: six buttresses spring from a stepped stone plinth and climb as ribs,
// winding a sixth of a turn round a glass core and gathering into the needle. The core steps in under them at each
// deck, where the ribs are clamped to an outrigger plate ringed with light. Near the top the observation level is a
// ring of glass held out past the ribs, and over it the ribs close round the lit lantern of the crown.

export const TALL = SPIRE.tall;

// The plinth's steps, as [radius, top] from the plaza up.
export const STEPS: [number, number][] = [[57, 1.1], [53, 2.2], [49, 3.4]];
export const PLINTH_TOP = STEPS[STEPS.length - 1][1];

// The ribs stand at these bearings at their feet: the front of the spire is the face between the two either side of 0,
// where the line of light runs up it.
export const RIBS = [30, 90, 150, 210, 270, 330] as const;

// Where the ribs ride: their middle's radius, from where they leave the buttresses to where they gather at the foot of
// the needle, as an ogive: nearly upright low down, closing faster toward the top.
export const RIB = { from: 74, to: 368, r0: 21.2, r1: 3.6, depth: 3, wide: 3.5, top: 1.7 };
const ribK = (y: number) => Math.min(1, Math.max(0, (y - RIB.from) / (RIB.to - RIB.from)));
export const ribR = (y: number) => RIB.r1 + (RIB.r0 - RIB.r1) * (1 - ribK(y) ** 1.6) ** 0.8;
// On its way up each rib winds a little round the core, most of it over the crown, as the ribs gather.
export const TWIST = 24;
export const ribTurn = (y: number) => { const k = ribK(y); return TWIST * k ** 3; };
// A buttress springs from the plinth this far out and curves up into its rib.
export const BUTTRESS = { r: 45, th: 5.6, curve: 2.3 };
// The copper cuff where a buttress's stone cladding ends and its steel rib goes on: its height and how far it stands
// proud of the rib.
export const CUFF = { y: RIB.from, h: 3.4, proud: 0.6 };

// The decks: the lobby's canopy, three breaks in the core, and the floor of the observation level. Each is an
// outrigger plate the ribs are clamped to, standing out past them, with a fascia ringed by a line of light.
export const DECKS = [30, 120, 200, 262, 299] as const;
export const DECK = { thick: 2, past: 2.4, band: 0.6, canopy: 24 };
// The clamp where a rib passes a deck: how much wider, taller and deeper it is than the rib.
export const NODE = { wide: 1.4, tall: 2.6, deep: 1.1 };

// The core: the lobby's drum, then a run of glass between each pair of decks, each tucked just inside where the ribs
// are at its top, so the ribs stand off it most at the foot of each run.
const GAP = 2.1;
export const RUNS: [number, number, number, number][] = [[PLINTH_TOP, DECKS[0] - DECK.thick / 2, 19, 19]];
for (let i = 0; i < DECKS.length - 1; i++) {
  const a = DECKS[i] + DECK.thick / 2, b = DECKS[i + 1] - DECK.thick / 2, top = ribR(b) - RIB.depth / 2 - GAP;
  RUNS.push([a, b, i === 0 ? 19 : top + 0.7, top]);
}

export function coreR(y: number): number {
  for (const [a, b, r0, r1] of RUNS) if (y >= a - 0.01 && y <= b + 0.01) return r0 + ((r1 - r0) * (y - a)) / (b - a);
  for (let i = 0; i < RUNS.length - 1; i++) if (y > RUNS[i][1] && y < RUNS[i + 1][0]) return RUNS[i][3];
  return RUNS[RUNS.length - 1][3];
}

// The observation level: a ring of glass held out past the ribs on the top deck, under a thin roof, round a lit core.
export const SKY = { from: DECKS[4] + DECK.thick / 2, to: 309, r: 15.6, roof: 1.2, core: 8.2, fins: 24, fin: [0.8, 1.3] as const };
// The crown: a lantern of lit glass that the ribs close round, from the observation level's roof to the needle.
export const LANTERN = { from: SKY.to + SKY.roof, to: RIB.to - 1 };
export const lanternR = (y: number) => Math.max(0.8, ribR(y) - RIB.depth / 2 - 1.1);
// A copper collar where the ribs gather, at the foot of the needle.
export const COLLAR = { y: RIB.to + 1.2, r: 4.6, h: 3.2 };

// The needle, turned, up to the beacon; rings of copper on it.
export const NEEDLE: [number, number][] = [[3.2, COLLAR.y + COLLAR.h / 2], [2.5, 382], [1.9, 396], [1.3, 408], [0.75, 415.4]];
export const NEEDLE_RINGS = [{ y: 381, r: 3.1, h: 1.2 }, { y: 400, r: 2.2, h: 0.9 }];
// The beacon: a slim lens near the tip, and the spike over it.
export const BEACON = { from: 415.4, to: 418.4, r: 0.95, tip: TALL };

// The line of light up the front and the back of the core, and the lift that rides it: its half width, in units, and
// the levels the lift stops at.
// The line sits in a channel between two dark fins: how far out they stand and how wide each is.
export const CHANNEL = { out: 0.7, wide: 0.35 };
export const LINE = { half: 0.7, from: DECKS[0] + DECK.thick / 2, to: SKY.from };
export const LIFT = { tall: 2.6, levels: [32.4, 122.4, 202.4, 264.4, 301.4] as const, speed: 34, slot: 11, dwell: 2.4 };

// A storey of the core, and how many bays it has round.
export const FLOOR = { tall: 3.2, bays: 56 };
// The lobby's glass: how many lights between a pair of buttresses, and where its transom is.
export const LOBBY = { lights: 6, transom: 21 };

// The nav lights on the deck tips: how long one blinks, in seconds.
export const BLINK = 3.1;
