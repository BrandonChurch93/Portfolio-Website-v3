// The temple quarter and the way to the spire: where each thing stands on the map and how large it is, in the city's
// units. The quarter is the great pyramid rising out of the jungle at the left of the skyline, on a terrace, with a
// causeway from its stair to the pool of polished metal beside it. The way is the procession, on the center line from
// the spire's plaza to the front edge of the city, where it passes through a great ring and steps down to bare ground.
// The jungle's builder reads PYRAMID, TERRACE, BASE, SKIRT, COURT and MAST to keep the precinct clear.

export type XZ = [number, number];

// The great pyramid: its middle, how tall to its tip, how far from its middle its base reaches, how far it is turned,
// in degrees, and where its plated body ends and the mirror cap begins, as a share of its height. It is turned a
// little, so a second, narrow face is turned to the moon: two faces that take the light differently read as a solid,
// where one face square on read as a flat triangle. Turned further, the broad face no longer caught the cursor's
// light, which comes from in front of the world.
export const PYRAMID = { at: [-400, 40] as XZ, tall: 150, half: 66, turn: -10, cut: 0.74 };
// The casing: plates of polished gold and bronze laid flush in courses up each face, over a stepped stone core. How
// tall a course is, how wide a plate is about, the joint between plates, how thick a plate stands proud of the core,
// and how far a plate is set out of true, in degrees. How much the face is shaded as swelling across, from its middle
// to its arrises, and the face turned to the moon more, so part of it turns past the warm glow of the sky behind the
// world, which it otherwise mirrors whole as one orange sheet. How far the face is shaded as turned out toward the
// visitor, at its top and at its foot, in degrees: as built, a face leans back and mirrored only the dark over the
// world, and turned out it mirrors the room's strip of light in front of the world as a band across it, and the
// cursor's light where the cursor is. Then the rounded arris up each corner, as a share of the base's half width. Plates as large as
// the city's windows read as toy bricks, smaller ones set each a little apart as a checkerboard of tiles, and any grid
// of panes, large or small, as lit windows or glass: so each course is one plate the width of the face, set nearly
// true, with a batten under it, and a reflection runs across it unbroken.
export const CASING = { course: 9.5, plate: 1000, joint: 1.0, thick: 1.1, skew: 0.6, swell: 20, moonSwell: 28, bow: [4, 38] as [number, number], arris: 0.045 };
// Which plates are bronze and which are lost. Bronze is laid by course and not plate by plate, which read as a
// checkerboard: the courses up to the first count are bronze, the next few go over to gold a plate at a time, and two
// courses higher up are bronze bands. The face turned to the moon is all dark bronze: it mirrors the warm glow of the
// sky behind the world, which on gold read as one sheet of orange paint, and dark it gives the pyramid a lit face and
// a shadowed one. Plates lost near the foot show the stepped
// stone core behind, as the casing of an old pyramid does.
export const PLATES = { foot: 2, mixed: 2, bands: [7], moonward: 1, lostFoot: 0, lostUp: 6, lostAny: 0 };
// The jungle's hold on the pyramid's foot, which is kept to its lowest quarter: how high up the casing creepers hang
// at most, as a share of the plated height, how many curtains of them on each face seen, how wide one is at its foot,
// and how many clumps of growth along the casing's foot, the terrace's edge and the stair.
export const GROWTH = { reach: 0.25, curtains: 9, wide: 9, clumps: 34 };
// The podium it stands on: two low steps.
export const PODIUM = { steps: [[7, 2.5], [3.5, 5]] as [number, number][] };
// The terrace of pale stone the pyramid and its podium stand on, how far past the pyramid's base on each side, and how
// high.
export const TERRACE = { extra: 7, tall: 9, batter: 0.035 };
// Under the terrace, a stepped base bedded into the land: each tier as how much wider than the pyramid's base and how
// high its top is under the terrace's foot. The jungle grows over its corners.
export const BASE = { tiers: [[18, -6]] as [number, number][], sink: 26, batter: 0.06 };
// How far under the ground a broad thing reaches, so the curve never shows under its edge.
export const SKIRT = { terrace: 16, small: 3 };
// Where the casing begins, over the terrace and the podium.
export const FOOT = TERRACE.tall + PODIUM.steps[PODIUM.steps.length - 1][1];

// The obelisk behind the pyramid that is a mast, its foot on the map, and as built: tall, foot, top, cap. Drawn GRAND
// times that.
export const GRAND = 1.5;
export const MAST = { at: [-448, -54] as XZ, tall: 84, foot: 4.2, top: 2.8, cap: 7 };

// The ground before the pyramid kept clear of the jungle, which the causeway crosses to the pool: as a stretch of the
// map either side of the pyramid's middle and toward the visitor.
export const AXIS = PYRAMID.at[0];
export const COURT = { z0: 100, z1: 168, half: 60, tall: 2.4 };
// The pool of polished metal by the temple, which the land's builder makes: its middle and how far its shore is.
export const POOL = { at: [-449, 200] as XZ, shore: 27 };
// The causeway: how wide, how high over the ground, and a lamp on a bronze post either side every so far.
export const CAUSEWAY = { wide: 9, tall: 2.2, lamps: 14 };

// The way to the spire, on the center line of the map, from the spire's plaza to the front edge of the city, seen
// nearly along its length: a canyon through the city. It comes down in terraces, a pool down its middle falling in a
// sheet over each step, and along it pairs of obelisks with mirror gold caps and braziers, larger toward the visitor.
export const WAY = {
  z0: 150,
  stations: [172, 212, 252, 292, 332, 372, 412],
  terrace: 40,
  top: 19, drop: 1.6, steps: 2,
  pool: { half0: 4, half1: 10, kerb: 2, rim: 1.2, under: 0.7 },
  band: 4,
  // The walls either side, how far out at the spire's end and at the last terrace, and how high over the terrace.
  wall0: 19, wall1: 56, wallTall: 3.6,
  // The rows, how far out at each end: inside the ring's opening, so they are seen through it one behind another.
  // Further out, the ring's band hid every one of them.
  row0: 11, row1: 24,
  // How tall the obelisks are at the spire's end and at the ring: low near the spire, whose foot they must not stand in
  // front of.
  low: 26, high: 56,
  brazier: 9,
};
export const WAY_END = WAY.stations[WAY.stations.length - 1] + WAY.terrace / 2;
const along = (z: number) => Math.min(1, Math.max(0, (z - WAY.z0) / (WAY_END - WAY.z0)));
export const wayHalf = (z: number, a: number, b: number) => a + (b - a) * along(z);
export const wayTallest = (z: number) => WAY.low + (WAY.high - WAY.low) * along(z);
export const terraceAt = (i: number) => WAY.top - WAY.drop * i;
// Which stations hold a pair of obelisks, which a pair of braziers, and which a lesser ring, how large, as a share of
// the great one: so through the great ring two more are seen one behind another up the way, each lower than the
// spire's foot. The first two terraces, at the spire's foot, hold nothing.
export const OBELISKS = [2, 4];
export const BRAZIERS = [6];
export const RINGS = [{ at: 3, k: 0.42 }, { at: 5, k: 0.66 }];

// The end of the way: a great ring of polished bronze standing across it on a bar, as the Egyptian shen ring is, which
// the way passes through. Where it stands, the radius of its middle line, how wide its band is and how deep, and its
// bar. Under 110 tall, so the avenue and the spire are seen over and through it.
export const RING = { z: WAY_END + 12, r: 41, band: 11, deep: 9, bar: { wide: 118, tall: 8, deep: 15 }, seg: 112, clamps: 10, buttress: 24 };
// Lamps along the tops of the way's walls, so far apart: points of light running back to the spire either side.
export const WALL_LAMPS = 13;
// The great pair of obelisks that end the way's walls and frame the ring, as built.
export const GATE_OBELISK = { tall: 74, foot: 4.6 };
// Broad steps down from the ring to the bare ground beyond the city: from where to where on the map, and how many.
export const DESCENT = { z0: WAY_END + 22, z1: WAY_END + 52, n: 7, flare: 16 };

// The light of this quarter: few, low and warm. How much a brazier flickers.
export const LIGHT = { flicker: 0.9 };
