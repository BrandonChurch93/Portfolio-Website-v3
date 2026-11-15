import { line, reach, type Line, type Pt } from '../page-sketch/plan';
import type { Cue } from '../skills-about/plan';

// A wireframe of Contact and the footer: one plate of content at the right, the rocket at the left, and under the
// rocket a Sun stone laid flat that the stream falls onto. The stone lights ring by ring from its rim to its middle
// as the page is scrolled on, and the rocket launches from its middle when the last ring is lit. Everything is in
// design units, one unit a CSS pixel on a desktop 1460 wide. Nothing here is the real stream, the real rocket, the
// real stone or a finished look.

export const W = 1460;
// Room above Contact for the stream to fall in from under his portrait, and where it leaves About across the page.
export const LEAD = 170;
export const IN = 692;
export const CONTACT = { h: 860 };
export const FOOT = { h: 230, words: 96 };

// The rocket, measured up from the mouth of its engine: the bell, the lower stage, a band, the upper stage, a
// band, the nose and its spike. It stands on a table whose legs stand on the stone's middle.
export const ROCKET = { x: 450, tip: 150, scale: 1.15, half: 27, bell: 16, lower: 240, upper: 330, nose: 440, tall: 468, band: 7, fin: { out: 62, top: 104 } };
export const TOWER = { l: 72, r: 126, top: 456, arms: [356, 286, 128], lamp: 496 };
export const TABLE = { l: -104, r: 146, top: 6, deep: 12, ground: 40, legs: [-88, -30, 30, 88, 134] };

// The stone: how far across it reaches, how flat it is seen, how thick its edge is, and its rings as shares of its
// radius from the rim in. What lies between two rings is a band, and the last is the boss the rocket stands on.
export const STONE = { rx: 320, flat: 0.17, edge: 13, rings: [1, 0.86, 0.7, 0.52, 0.34, 0.18], ticks: 36, rays: 16 };
// How far across the page the stream lands: on the stone's outer band, clear of the plate.
export const LAND = 730;

// The plate and its title, measured from the top of Contact.
export const BLOCK = { l: 800, t: 130, w: 520 };

// How full the stone has to be for each part of the rocket to light, from the foot up.
export const FUEL = { lower: 0.4, upper: 0.62, nose: 0.84 };
// The launch, in seconds from the moment the stone is full: when the tower's arms draw back, when the rocket leaves
// the table, how hard it climbs (units a second, each second), when it is over, and how many times faster the
// rocket comes back down when the stream draws back.
export const LAUNCH = { arms: 0.35, lift: 1, climb: 70, end: 4.9, back: 2.6 };
// The plate's band of light: how long it takes to cross, how many times faster it runs back, how much of the
// crossing the knob is gone by, and where on the plate it sets out from, as shares of its width and height.
export const WAKE = { run: 0.95, back: 1.5, knob: 0.3, from: [0, 0.06] as Pt };

export interface Plan { h: number; top: number; engine: Pt; ground: number; foot: number; landAt: Pt; ry: number; line: Line; cues: Cue[] }

export function plan(): Plan {
  const top = LEAD, engineY = Math.round(top + ROCKET.tip + ROCKET.tall * ROCKET.scale);
  const ground = Math.round(engineY + TABLE.ground * ROCKET.scale), landAt: Pt = [LAND, ground];
  const l = line([[IN, 0], [landAt[0], landAt[1], 0, 8]]);
  const level = (id: string, y: number): Cue => ({ id, at: reach(l, y), x: LAND, y });
  return {
    h: top + CONTACT.h + FOOT.h, top, engine: [ROCKET.x, engineY], ground, foot: top + CONTACT.h, landAt, ry: Math.round(STONE.rx * STONE.flat), line: l,
    cues: [level('block', top + BLOCK.t + 60), level('near', ground - 560), { id: 'land', at: l.total, x: landAt[0], y: landAt[1] }],
  };
}

// How far the rocket has climbed, so many seconds into the launch.
export const climbed = (burn: number) => (burn <= LAUNCH.lift ? 0 : LAUNCH.climb * (burn - LAUNCH.lift) ** 2);
