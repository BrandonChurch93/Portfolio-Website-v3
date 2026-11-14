import { line, nearest, reach, type Line, type Pt } from '../page-sketch/plan';
import type { Cue } from '../skills-about/plan';

// A wireframe of Contact and the footer, for judging what the section holds, where it sits, and what the stream does
// at the foot of the page. Everything is in design units, one unit a CSS pixel on a desktop 1460 wide. Nothing here
// is the real stream, the real rocket or a finished look.

export const W = 1460;
// Room above Contact for the stream to fall in from under his portrait, and where it leaves About across the page.
export const LEAD = 170;
export const IN = 692;

export const CONTACT = { h: 730 };
export const FOOT = { h: 240, words: 104 };

// The rocket on its table, measured up from the mouth of its engine: the bell, the lower stage, a band, the upper
// stage, a band, the nose and the spike the stream strikes. The table's legs stand on the ground, which is the
// footer's top edge. The rocket and its tower together are centered on the page.
export const ROCKET = {
  x: 700,
  tip: 150,
  half: 27,
  bell: 16,
  lower: 240,
  upper: 330,
  nose: 440,
  tall: 468,
  band: 7,
  fin: { out: 62, top: 104 },
};
export const TOWER = { l: 72, r: 126, top: 456, arms: [356, 286, 128], lamp: 496 };
export const TABLE = { l: -122, r: 152, top: 6, deep: 16, ground: 66, legs: [-106, -50, 22, 92, 140] };

// The two columns either side of the rocket: the ways to reach him at once at the left, the form at the right.
// Every height is measured down from the top of Contact.
export const WORDS = { l: 150, w: 400, title: 214, lede: 304, book: 368, mail: 456, where: 528 };
export const FORM = { l: 916, w: 394, t: 218 };

// The launch, in seconds from the moment the engine lights: when the rocket leaves the table, how hard it climbs
// (units a second, each second), when the launch is over, and how many times faster it comes back down when the
// stream draws back.
export const LAUNCH = { arms: 0.35, lift: 1, climb: 70, end: 4.7, back: 2.6 };

export interface Plan { h: number; top: number; tip: Pt; engine: Pt; ground: number; foot: number; line: Line; strike: number; cues: Cue[] }

export function plan(): Plan {
  const top = LEAD, tip: Pt = [ROCKET.x, top + ROCKET.tip], engine: Pt = [ROCKET.x, tip[1] + ROCKET.tall];
  const l = line([[IN, 0], [tip[0], tip[1], 4, 7], [engine[0], engine[1] + TABLE.top, 0, 6]]);
  const strike = nearest(l, tip[0], tip[1]);
  const level = (id: string, up: number): Cue => { const y = engine[1] - up; return { id, at: reach(l, y), x: ROCKET.x, y }; };
  return {
    h: LEAD + CONTACT.h + FOOT.h, top, tip, engine, ground: engine[1] + TABLE.ground, foot: top + CONTACT.h, line: l, strike,
    cues: [
      { id: 'near', at: strike - 210, x: tip[0], y: tip[1] },
      { id: 'strike', at: strike, x: tip[0], y: tip[1] },
      level('upper', ROCKET.upper),
      level('lower', ROCKET.lower),
      level('engine', 0),
    ],
  };
}

// How far the rocket has climbed, so many seconds into the launch.
export const climbed = (burn: number) => (burn <= LAUNCH.lift ? 0 : LAUNCH.climb * (burn - LAUNCH.lift) ** 2);
