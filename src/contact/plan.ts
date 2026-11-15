import { line, reach, type Line, type Pt } from '../page-sketch/plan';
import type { Cue } from '../skills-about/plan';

// A derby of three arrangements for Contact and the footer, as wireframes: one block of content, a long pool at
// the foot of the section that the stream falls into, and the rocket that launches from the pool once it is full.
// Everything is in design units, one unit a CSS pixel on a desktop 1460 wide. Nothing here is the real stream, the
// real rocket or a finished look.

export const W = 1460;
// Room above Contact for the stream to fall in from under his portrait, and where it leaves About across the page.
export const LEAD = 170;
export const IN = 692;
export const FOOT = { h: 230, words: 96 };

// The rocket, measured up from the mouth of its engine: the bell, the lower stage, a band, the upper stage, a
// band, the nose and its spike. It stands on a table whose legs stand in the pool.
export const ROCKET = { half: 27, bell: 16, lower: 240, upper: 330, nose: 440, tall: 468, band: 7, fin: { out: 62, top: 104 } };
export const TOWER = { l: 72, r: 126, top: 456, arms: [356, 286, 128], lamp: 496 };
export const TABLE = { l: -104, r: 146, top: 6, deep: 12, ground: 40, legs: [-88, -30, 30, 88, 134] };

// The block is as wide in every arrangement, and its plate starts this far under its title.
export const BLOCK = { w: 520, plate: 100 };

export type Way = 'a' | 'b' | 'c';
export const WAYS: { id: Way; name: string }[] = [
  { id: 'a', name: 'A · Beside' },
  { id: 'b', name: 'B · Behind' },
  { id: 'c', name: 'C · Below' },
];

// One arrangement: how tall Contact is, where the block's title starts, the rocket (how far across, how far down
// its spike's tip is, how large, and which side its tower stands), the pool, and how far across the stream lands in
// it. Heights are measured down from the top of Contact. inside puts the title in the plate, where the block lies
// over the rocket or the stream.
interface Layout { h: number; block: { l: number; t: number; inside?: boolean }; rocket: { x: number; tip: number; scale: number; tower: 1 | -1 }; pool: { cx: number; rx: number; ry: number }; land: number }
const LAYOUTS: Record<Way, Layout> = {
  a: { h: 830, block: { l: 790, t: 130 }, rocket: { x: 420, tip: 150, scale: 1.15, tower: -1 }, pool: { cx: 560, rx: 470, ry: 26 }, land: 672 },
  b: { h: 900, block: { l: 790, t: 170, inside: true }, rocket: { x: 790, tip: 84, scale: 1.45, tower: 1 }, pool: { cx: 700, rx: 540, ry: 28 }, land: 590 },
  c: { h: 1390, block: { l: 470, t: 60, inside: true }, rocket: { x: 830, tip: 770, scale: 1, tower: 1 }, pool: { cx: 730, rx: 580, ry: 28 }, land: 640 },
};

// How full the pool has to be for each part of the rocket to light, from the foot up.
export const FUEL = { lower: 0.3, upper: 0.58, nose: 0.84 };
// The launch, in seconds from the moment the pool is full: when the tower's arms draw back, when the rocket leaves
// the table, how hard it climbs (units a second, each second), when it is over, and how many times faster the
// rocket comes back down when the stream draws back.
export const LAUNCH = { arms: 0.35, lift: 1, climb: 70, end: 4.9, back: 2.6 };

export interface Plan extends Layout { top: number; total: number; engine: Pt; ground: number; foot: number; landAt: Pt; line: Line; cues: Cue[] }

export function plan(way: Way): Plan {
  const L = LAYOUTS[way], top = LEAD, engineY = top + L.rocket.tip + ROCKET.tall * L.rocket.scale;
  const ground = Math.round(engineY + TABLE.ground * L.rocket.scale), landAt: Pt = [L.land, ground - 3];
  const l = line([[IN, 0], [landAt[0], landAt[1], 0, 8]]);
  const level = (id: string, y: number): Cue => ({ id, at: reach(l, y), x: L.land, y });
  return {
    ...L, top, total: top + L.h + FOOT.h, engine: [L.rocket.x, Math.round(engineY)], ground, foot: top + L.h, landAt, line: l,
    cues: [level('block', top + L.block.t + 30), level('near', landAt[1] - 520), { id: 'land', at: l.total, x: landAt[0], y: landAt[1] }],
  };
}

// How far the rocket has climbed, so many seconds into the launch.
export const climbed = (burn: number) => (burn <= LAUNCH.lift ? 0 : LAUNCH.climb * (burn - LAUNCH.lift) ** 2);
