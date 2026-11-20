import { HOST, LAND, STONE, VIEW } from '../pieces/pad/layout';

// Contact as built (BRIEF.md, Settled, "Contact, the first build"): where everything stands, on a board 1460 units
// wide that is drawn as wide as the screen up to 2400 px, as Skills and About are. The wireframe he approved
// (./plan.ts, /lab/contact-draft) is where these places come from. Lengths are in units, down from the top of the
// section, unless they say otherwise.

export const BOARD = { w: 1460, least: 1100 };

const D2R = Math.PI / 180;
// How far down the screen a point of the stone's top face is drawn for each unit it lies toward the visitor.
const FLAT = Math.sin(VIEW.el * D2R);

export const CONTACT = {
  // Where the stream comes in across the board: where it leaves About, under the lower left of his portrait.
  in: 692,
  // The pad: where the stone's middle is, across and down.
  pad: { x: 450, y: 734 },
  // The title, and the one plate under it.
  title: { l: 800, t: 131, size: 80 },
  plate: { l: 800, t: 230, w: 520, h: 514, pad: 30 },
  // The foot of the section: the foot of the stone, where the footer begins.
  h: Math.round(734 + STONE.r * FLAT + STONE.edge),
  // When the stream lands the screen has to hold the title, the plate, the rocket and the stone. So the stone's
  // foot is this far above the foot of the screen as it lands. On a screen too short for all of that (a browser
  // window on a 1080p screen is, by about thirty units) the stone stands lower, as low as keeps `head` clear over
  // the title, and never nearer the foot of the screen than `low`: there the title was cut off as the stream landed.
  seat: 78,
  head: 20,
  low: 10,
  foot: 100,
} as const;

// How far the stone's foot stands over the foot of a screen so many units tall as the stream lands.
export const seatOn = (tall: number): number => Math.max(CONTACT.low, Math.min(CONTACT.seat, tall - (CONTACT.h - CONTACT.title.t) - CONTACT.head));

// Where the pad's host stands: as wide as the pad draws itself, with the stone's middle where the board has it.
export const PAD = { l: CONTACT.pad.x - HOST.wide / 2, w: HOST.wide, b: CONTACT.pad.y + HOST.up } as const;

// A point of the pad, in its own units (src/pieces/pad/layout.ts), as a place on the board. The pad is looked at
// from so far away that this holds to within a unit or two.
export const onBoard = (x: number, y: number, z: number): [number, number] => [CONTACT.pad.x + x, CONTACT.pad.y + z * FLAT - y * Math.cos(VIEW.el * D2R)];

// Where the stream lands, on the stone's outer band at the end nearest the plate.
export const LANDS = onBoard(...LAND);

// How the plate comes on and what follows, in seconds. The band that wakes the plate sets out from its corner
// nearest the landing, given as shares of its width and height. The title comes on with the plate.
export const SHOW = { from: [0, 0.97] as [number, number], title: [0.05, 0.6] as [number, number] };
