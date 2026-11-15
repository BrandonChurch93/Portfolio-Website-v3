import { SPIRE } from '../../layout';

// The spire's form, in the city's units, y up from the top of the dome, its axis at the origin. Bearings are in
// degrees from straight toward the visitor, turning to the visitor's right.
//
// The great tower of the city, built over centuries. Its foot is the oldest: a battered terrace of pale stone with a
// gilded gorge cornice, a pylon gate on each of its four sides. Out of the terrace rises the body: a core of dark
// glass with rooms in it, a rounded square in plan with a face to each gate, and on its four corners stone piers that
// flare out over the terrace and climb the core to its head. A ring stands clear of the body where the piers' flare
// ends. At the head a lotus capital of copper carries a lit gallery, and over it the crown, the newest: a sun of lit
// glass held in a cage of gilded meridians whose four rings step in as they rise. Then the needle and its beacon.

export const TALL = SPIRE.tall;

// A rounded square in plan, its faces toward the gates: how far from the axis its surface is at a bearing, as a
// share of its faces' distance. n is its power: 2 a circle, higher a squarer square.
export function swell(bearingRad: number, n: number): number {
  const s = Math.abs(Math.sin(bearingRad)), c = Math.abs(Math.cos(bearingRad));
  return 1 / (s ** n + c ** n) ** (1 / n);
}
// The distance of such a square's corner, at 45 degrees, for a face distance of a.
export const cornerOf = (a: number, n: number) => a * 2 ** (0.5 - 1 / n);

// How far under the top of the dome the lowest course reaches, so it meets the ground where the ground falls away.
export const SINK = 7;
// The terrace's power in plan, and the courses it stands on, as [face distance, top].
export const SQ = 4;
export const STEPS: [number, number][] = [[61, 0.6], [58.5, 1.8], [56, 3]];
// The terrace: battered from its foot to the cornice, its faces' distance at both, and its gilded gorge cornice.
export const TERRACE = { from: 3, top: 24, r0: 54, r1: 50.5, cornice: 3.4, lip: 3.2 };
export const TERRACE_TOP = TERRACE.top + TERRACE.cornice;
export const terraceR = (y: number) => TERRACE.r0 + (TERRACE.r1 - TERRACE.r0) * clamp01((y - TERRACE.from) / (TERRACE.top - TERRACE.from));

// The four pylon gates, at these bearings. Each is two battered towers either side of a door, a lintel between them,
// standing out of the terrace's face. Distances are from the axis: where its back is let into the terrace, its face
// at its foot and its top, its door's half width, each tower's outer half width at its foot and top, its cornice, the
// lintel's foot and top, and where the door is set back to.
export const GATES = [0, 90, 180, 270] as const;
export const PYLON = { back: 46, face0: 67, face1: 63.5, top: 39, door: 4.6, half0: 21, half1: 17.5, cornice: 2.8, lintel: [27, 33] as const, recess: 60.5 };

// The core: three tiers, each stepping in from the one under it at a gilded gorge cornice, as an obelisk built in
// stages. Each tier's faces' distance at its foot and its top, and the power of its plan. Over the third, the
// gallery: a band of lit glass under the last cornice, out of which the crown grows.
export interface Tier { from: number; to: number; a0: number; a1: number }
export const TIERS: Tier[] = [
  { from: TERRACE_TOP - 1, to: 96, a0: 34, a1: 30.5 },
  { from: 96, to: 150, a0: 28, a1: 25 },
  { from: 150, to: 186, a0: 23, a1: 21.5 },
];
export const CORE = { from: TIERS[0].from, to: TIERS[2].to, n: 3 };
// A tier's cornice: how tall it is and how far its lip stands out.
export const CORNICE = { tall: 3.4, lip: 2.6 };
export const DECK = { sill: 177.5, roof: TIERS[2].to };
export function coreA(y: number): number {
  for (const t of TIERS) if (y <= t.to) return t.a0 + (t.a1 - t.a0) * clamp01((y - t.from) / (t.to - t.from));
  return TIERS[TIERS.length - 1].a1;
}
export const coreCorner = (y: number) => cornerOf(coreA(y), CORE.n);

// A pier on each corner of the core, at 45 degrees from the gates: it springs from the terrace's corner, flares in
// along a curve, and climbs the tiers on a smooth taper of its own, so the tiers step in behind it. Over the core it
// goes on as a blade of bronze that swells round the sun and closes over it under the needle.
export const PIERS = [45, 135, 225, 315] as const;
export const PIER = { from: TERRACE.top - 2, foot: 61, knee: 112, curve: 2.1, proud: 6, top: CORE.to, th0: 16, th1: 11.5 };
const env = (y: number) => cornerOf(TIERS[0].a0, CORE.n) + (cornerOf(TIERS[2].a1, CORE.n) - cornerOf(TIERS[0].a0, CORE.n)) * clamp01((y - CORE.from) / (CORE.to - CORE.from));
const pierK = (y: number) => clamp01((y - PIER.from) / (PIER.knee - PIER.from));
export const pierOut = (y: number) => env(y) + PIER.proud + (PIER.foot - env(PIER.from) - PIER.proud) * (1 - pierK(y)) ** PIER.curve;
export const pierTh = (y: number) => PIER.th1 + (PIER.th0 - PIER.th1) * (1 - clamp01((y - PIER.from) / (PIER.top - PIER.from))) ** 1.4;
// A blade's outline, as [height, distance of its outer edge from the axis], and how deep it is from its outer edge in
// and how thick it is, each as [height, size] from its foot to its tip.
export const BLADE = { line: [[CORE.to, cornerOf(TIERS[2].a1, CORE.n) + PIER.proud], [200, 36], [212, 38.5], [226, 37], [240, 31], [252, 20], [262, 7.5]] as [number, number][], deep: [[CORE.to, 13], [214, 12], [263, 4.5]] as [number, number][], th: [[CORE.to, 11.5], [214, 13.5], [263, 4.5]] as [number, number][] };
// A rib of stone up the middle of each face of the core: how far it stands proud of the glass and how wide it is.
export const RIB = { proud: 1.6, w0: 5.5, w1: 3.2 };

// The rings, level, each a heavy hoop of polished gold binding the blades, standing clear of them, thick enough in
// section to catch the light on its top and to be dark under it, with lamps round its rim. They step in as they rise.
export interface Hoop { y: number; r: number; h: number; d: number; lights: number }
// How far each ring is tipped toward the visitor, in degrees. The page sees the crown from under two degrees above
// it, where a level ring is only a line: tipped this far, each shows its far side over its near one, as a ring.
export const TILT = 7;
export const CROWN: Hoop[] = [
  { y: 211, r: 45, h: 3.4, d: 3.8, lights: 28 },
  { y: 229, r: 42, h: 3.1, d: 3.5, lights: 24 },
  { y: 245, r: 32, h: 2.7, d: 3.1, lights: 20 },
];

// The sun, held inside the blades, on a gilded neck over a low dome of copper that roofs the gallery.
export const SUN = { y: 222, r: 20 };
export const DOME = { from: DECK.roof + CORNICE.tall, to: 195 };

// The needle, turned, from where the blades close to the beacon, and gilded collars on it.
export const NEEDLE: [number, number][] = [[7.5, 261], [6, 264], [4.6, 268], [3.3, 272.5], [2.2, 276]];
export const NEEDLE_RINGS = [{ y: 262.5, r: 8.4, h: 2.0 }, { y: 268.5, r: 5.6, h: 1.4 }, { y: 273, r: 4.1, h: 1.1 }];
export const BEACON = { from: 276, to: 278.6, r: 1.7, tip: TALL };

// The line of light up the rib on the core's front face, and the lift that rides it: its half width, in units, and
// the levels the lift stops at.
export const LINE = { half: 0.7, from: TERRACE_TOP + 0.5, to: DECK.sill - 1 };
export const LIFT = { tall: 2.6, levels: [LINE.from + 1, 70, TIERS[1].from + 6, 128, TIERS[2].from + 6, DECK.sill - 5] as const, speed: 26, slot: 11, dwell: 2.4 };

// A storey of the core and a bay of its glass, in units, and how deep a room is behind it.
export const ROOM = { tall: 2.4, bay: 1.2, deep: 3.4 };

// The nav lights: how long one blinks, in seconds.
export const BLINK = 3.1;

function clamp01(x: number): number { return Math.min(1, Math.max(0, x)); }
