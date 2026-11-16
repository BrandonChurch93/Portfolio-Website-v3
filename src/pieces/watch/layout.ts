// Where everything on the opened watch is, in millimetres. The table is y = 0, x runs to the right and z toward the
// viewer. The movement lies in the case back at the left, the dial in the body at the right, joined by the hinge at
// x = 0, with the crown and bow at the dial's twelve, away from the viewer.

export type P2 = [number, number];
export const DEG = Math.PI / 180;

export const VIEW = { az: 28, el: 50, fov: 18, across: 0.73 } as const;
// The pair is turned a little on the table, so it lies across the row rather than climbing it.
export const YAW = -16 * (Math.PI / 180);

// The two halves' middles, and the case's outer radius.
export const MOV = { x: -26.6, z: 0 } as const;
export const DIAL = { x: 26.6, z: 0 } as const;
export const CASE = { r: 25.2 } as const;

// The case back, lying on its outside: a shallow dome rising to its rim, polished inside, with a flange the
// movement sits in. Heights are its floor, the flange, the rim.
export const BACK = { rim: 6.4, lip: 23.7, flange: [21.8, 23.5] as P2, flangeY: 3.55 } as const;
// The body, lying on its back: the case middle up to the bezel, the coin edged bezel, the domed crystal.
export const BODY = { band: 8.3, bezel: [8.25, 10.5] as P2, open: 22.7, crystal: 12.5 } as const;
// The hinge: knuckles along z at x = 0.
export const HINGE = { y: 3.4, r: 1.45, z: [-6.6, 6.6] as P2, knuckles: 5 } as const;

// The movement, in its own coordinates from its middle (u = x - MOV.x, w = z).
export const PLATE = { r: 21.6, y0: 1.6, y1: 3.8 } as const;
// Bridges stand on the plate and are this high at their tops.
export const BRIDGE_TOP = 6.0;
export const COCK = { y0: 7.05, t: 0.75, foot: [12.6, -16.9] as P2, table: 3.25, ring: 1.75 } as const;

// The going train. Each wheel's middle, the pitch radius and teeth of the wheel, and of the pinion on its arbor, and
// the level the wheel lies at. Wheels that mesh lie at different levels, so a wheel crosses over the next one's
// wheel and drives only its pinion.
export interface Wheel { name: string; c: P2; z: number; r: number; pz: number; pr: number; y: [number, number]; py: [number, number]; spokes: number; hub: number }
export const BARREL = { c: [-9.5, -6.0] as P2, r: 10, z: 80, drum: [2.7, 4.25] as P2, teeth: [3.85, 4.25] as P2 } as const;
const C: P2 = [0, 0];
const T: P2 = [5.516, 4.628];
const F: P2 = [11.636, 4.628];
const E: P2 = [13.131, -0.95];
export const TRAIN: Wheel[] = [
  { name: 'center', c: C, z: 64, r: 6.4, pz: 10, pr: 1.25, y: [4.4, 4.72], py: [3.85, 4.4], spokes: 4, hub: 1.5 },
  { name: 'third', c: T, z: 60, r: 5.4, pz: 8, pr: 0.8, y: [4.95, 5.22], py: [4.4, 4.95], spokes: 4, hub: 1.0 },
  { name: 'fourth', c: F, z: 70, r: 5.25, pz: 8, pr: 0.72, y: [4.4, 4.68], py: [4.68, 5.25], spokes: 5, hub: 0.95 },
  { name: 'escape', c: E, z: 15, r: 3.1, pz: 7, pr: 0.525, y: [4.98, 5.2], py: [4.4, 4.98], spokes: 4, hub: 0.6 },
];
// The balance, the pallet fork's arbor, and how far the fork swings to each banking.
export const BALANCE = { c: [8.5, -11.5] as P2, r: 5.8, rim: 0.5, y: [5.95, 6.4] as P2, screws: 18, arms: 2 } as const;
export const SPRING = { r0: 0.75, r1: 4.25, turns: 11, y: [6.5, 6.78] as P2, w: 0.075 } as const;
export const PALLET = { c: [11.72, -4.16] as P2, y: [5.02, 5.18] as P2, bank: 9 } as const;
// The ratchet on the barrel's arbor, above its bridge, and its click.
export const RATCHET = { r: 5.4, z: 48, y: [6.0, 6.55] as P2 } as const;

// Where jewels stand in gold chatons: on the bridges over each pivot, and the endstone on the cock.
export const JEWELS: { c: P2; y: number; r: number; of: string }[] = [
  { c: C, y: BRIDGE_TOP, r: 1.75, of: 'center' },
  { c: T, y: BRIDGE_TOP, r: 1.5, of: 'third' },
  { c: F, y: BRIDGE_TOP, r: 1.5, of: 'fourth' },
  { c: E, y: BRIDGE_TOP, r: 1.3, of: 'escape' },
  { c: [11.72, -4.16], y: BRIDGE_TOP, r: 1.2, of: 'pallet' },
  { c: [8.5, -11.5], y: COCK.y0 + COCK.t, r: 1.45, of: 'balance' },
];

// The bridges, as unions of discs and bars in the movement's plane: a bar is two points and a half width.
export interface Bridge { name: string; discs: [number, number, number][]; bars: [number, number, number, number, number][]; screws: P2[] }
export const BRIDGES: Bridge[] = [
  { name: 'barrel', discs: [[-9.5, -6.0, 8.4]], bars: [[-9.5, -6.0, -15.6, -13.2, 4.2], [-9.5, -6.0, -18.6, 2.8, 3.4]], screws: [[-16.4, -11.8], [-17.6, 3.1], [-1.8, -12.6]] },
  { name: 'train', discs: [[0, 0, 2.6], [5.516, 4.628, 2.3], [11.636, 4.628, 2.3]], bars: [[-6.6, 18.3, 0, 0, 1.9], [0, 0, 5.516, 4.628, 1.75], [5.516, 4.628, 11.636, 4.628, 1.75], [11.636, 4.628, 18.9, 8.6, 1.9]], screws: [[-6.2, 17.2], [18.0, 8.6]] },
  { name: 'escape', discs: [[13.131, -0.95, 2.0]], bars: [[13.131, -0.95, 19.6, -2.2, 1.6]], screws: [[18.6, -2.1]] },
  { name: 'pallet', discs: [[11.72, -4.16, 1.8]], bars: [[11.72, -4.16, 17.2, -9.8, 1.45]], screws: [[16.5, -9.2]] },
];

// The dial, from the body's middle. The chapter ring and the minute track, the numerals' band, the small seconds at
// six (toward the viewer), the cartouche toward twelve, and the hands.
export const DIAL_FACE = { y: 8.0, r: 22.7 } as const;
export const CHAPTER = { r: [19.3, 21.9] as P2, y: [8.0, 8.24] as P2, track: [20.05, 21.25] as P2 } as const;
export const NUMERALS = { r0: 15.1, h: 3.2, y: [8.0, 8.32] as P2 } as const;
export const SECONDS = { c: [0, 9.6] as P2, r: 4.5, sink: 0.35 } as const;
export const CARTOUCHE = { c: [0, -7.2] as P2, w: 11.4, d: 3.7, y: [8.0, 8.2] as P2 } as const;
export const HANDS = { hour: 10.6, minute: 15.6, second: 3.9, y: [8.72, 8.98, 8.5] as const, hub: 1.05 } as const;
// The time the hands show at rest.
export const TIME = { h: 10, m: 9, s: 36 } as const;

// The pendant, crown and bow at twelve, and the chain off the bow, in the dial's coordinates.
export const PENDANT = { r: 1.7, from: 24.9, to: 28.4, y: 4.6 } as const;
export const CROWN = { r: 3.3, len: 3.8, flutes: 36 } as const;
export const BOW = { wire: 0.95 } as const;
export const CHAIN = { links: 11, pitch: 3.15, long: 4.3, wide: 2.7, wire: 0.5 } as const;

// The way the eye's horizontal runs across the table, and so the case's left most point in the picture: where the
// stream meets the watch, at the middle of the case back's wall.
const RIGHT: P2 = [Math.cos(VIEW.az * DEG + YAW), Math.sin(VIEW.az * DEG + YAW)];
export const STRIKE = { x: MOV.x - (CASE.r + 0.1) * RIGHT[0], y: 3.6, z: MOV.z - (CASE.r + 0.1) * RIGHT[1] } as const;

// The running watch: beats a second (18,000 an hour), the escape wheel's step a beat, the balance's swing.
export const RUN = { hz: 2.5, step: 12, swing: 250 } as const;

export const toMov = (p: P2): P2 => [p[0] + MOV.x, p[1] + MOV.z];
export const toDial = (p: P2): P2 => [p[0] + DIAL.x, p[1] + DIAL.z];
