// The temple quarter and the way to the spire: where each thing stands on the map and how large it is, in the city's
// units. The quarter is in DISTRICTS' temple, inside the city at the left of the skyline, near enough the top to
// show at rest; the way is the procession, on the center line from the spire's plaza down the face of the world.
//
// The quarter is the great pyramid rising out of the jungle at the left of the skyline, which holds it by itself,
// bedded on a stepped base cut into the hills, and round it in scale with it: the mast behind it, and before it a
// court and a pylon gate with seated figures and obelisks.

export type XZ = [number, number];

// The great pyramid: its middle, how tall it would be to a point, how far from the middle its base reaches, how far it
// is turned, in degrees, and where its body is cut so the capstone can float clear of it, as a share of its height,
// with the gap the capstone floats over.
export const PYRAMID = { at: [-400, 40] as XZ, tall: 150, half: 66, turn: 0, cut: 0.84, gap: 7 };
// Its casing is laid in courses this tall, each a little convex across the face, so a face reflects a band of the room
// that slides as the light moves, and not one flat color: the swell of each face across its width and up its height,
// in degrees. The arris is wide enough to hold its line of light whole at the page's size.
export const CASING = { course: 7, swell: 3, rise: 7, arris: 2.4, tilt: 0.15 };
// Courses of the casing laid in polished black stone and not gold, counted from the foot: the plinth course and one
// band, so the gold is set against something that is not metal.
export const BANDS = [0, 9];
// The podium it stands on: two steps of pale stone.
export const PODIUM = { steps: [[7, 2.5], [3.5, 5]] as [number, number][] };
// The battered terrace of pale stone the pyramid and its podium stand on, a share wider than the pyramid's base on
// each side, and how high: it lifts the pyramid so that more of it stands over the foot of the screen at rest.
export const TERRACE = { extra: 7, tall: 9, batter: 0.035 };
// Under the terrace, a great stepped base bedded into the land, level with the pyramid's own base, so it stands on
// the hillside it leans with: each tier as how much wider than the pyramid's base it reaches and how high its top
// is under the terrace's foot, widest and lowest first, with a stair down its outer side.
export const BASE = { tiers: [[22, -8], [13, -3.5]] as [number, number][], sink: 30, batter: 0.06 };
// How far under the ground a broad thing that stands on the dome reaches, so the curve never shows under its edge:
// the terrace, and anything else as wide as a hall.
export const SKIRT = { terrace: 16, small: 3 };
// Where the casing begins, over the terrace and the podium.
export const FOOT = TERRACE.tall + PODIUM.steps[PODIUM.steps.length - 1][1];

// What stands round the pyramid is built at the sizes given here and drawn this much larger, in scale with it and
// with the city's buildings.
export const GRAND = 1.5;

// The obelisk that is a mast, behind the pyramid: its foot, how tall to its tip, how wide at its foot and its top, and
// its capstone, as built (it is drawn GRAND times this).
export const MAST = { at: [-448, -54] as XZ, tall: 84, foot: 4.2, top: 2.8, cap: 5.4 };

// The precinct before the pyramid: the court, the pylon gate, two seated figures before its towers, and two obelisks
// flanking the gate. The axis runs toward the visitor from the pyramid at x = AXIS. Places are on the map; the sizes
// of the gate, the figures and the obelisks are as built, and they are drawn GRAND times that.
export const AXIS = PYRAMID.at[0];
export const COURT = { z0: 100, z1: 168, half: 60, tall: 2.4 };
export const PYLON = { z: 132, tower: 27, gate: 13, deep: 12, tall: 40, batter: 0.11, door: 30 };
export const FIGURES = { z: 154, x: 45, tall: 27 };
export const GATE_OBELISKS = { z: 160, x: 17, tall: 46, foot: 2.6 };

// The way to the spire, on the center line of the map, running from the spire's plaza down the face of the world
// toward the visitor, who sees it nearly along its length, a canyon through the city. It comes down in terraces, each a level of worn stone a little lower
// than the one before, with a flight of steps between them: a pool runs down its middle, falling in a sheet over
// each step, and along it stand sphinxes, braziers, seated colossi and obelisks, larger toward the visitor. It ends
// in a great pylon gate where it meets the broken margin.
export const WAY = {
  z0: 180,
  // The terraces: where each is centered, and how long each is, from the spire's end. The stations of the rows are
  // the terraces' middles.
  stations: [200, 240, 280, 320, 360, 400, 440, 480, 520],
  terrace: 40,
  // How high the first terrace stands over the ground, how much lower each next one is, and its flight of steps.
  top: 14, drop: 1.6, steps: 2,
  pool: { half0: 4, half1: 12, kerb: 2, rim: 1.2, under: 0.7 },
  // The band of dark polished stone along each side of the pool, beyond its kerb.
  band: 4,
  // The walls either side, how far out at the spire's end and at the last terrace, and how high over the terrace:
  // the way is a canyon through the city, inside its stretch of the map.
  wall0: 24, wall1: 72, wallTall: 3.4,
  // The rows, how far out at each end.
  row0: 17, row1: 52,
  // How tall the rows' things are at the spire's end and at the gate: low near the spire, whose foot they must
  // never stand in front of, and taller as the way runs down toward the visitor.
  low: 22, high: 58,
  brazier: 10,
};
export const WAY_END = WAY.stations[WAY.stations.length - 1] + WAY.terrace / 2;
const along = (z: number) => Math.min(1, Math.max(0, (z - WAY.z0) / (WAY_END - WAY.z0)));
export const wayHalf = (z: number, a: number, b: number) => a + (b - a) * along(z);
export const wayTallest = (z: number) => WAY.low + (WAY.high - WAY.low) * along(z);
// How high the terrace a place on the way is on stands over the ground.
export const terraceAt = (i: number) => WAY.top - WAY.drop * i;
// The gate the way ends in where it meets the broken margin: a pylon facing the visitor, its middle on the map, and
// how much larger than the precinct's gate it is drawn.
export const END_GATE = { z: 576, scale: 2.2 };

// The light of this quarter: few, low and warm. The capstone's breath, in seconds, and how a brazier flickers.
export const LIGHT = { breath: 7.3, flicker: 0.9 };
