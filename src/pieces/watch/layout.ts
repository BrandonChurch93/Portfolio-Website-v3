// Where everything on the opened watch is, in millimetres. The table is y = 0. Everything is laid out flat, the
// movement in the case back at -x and the dial in the body at +x, joined by the hinge along z at x = 0, with the crown
// and bow at the dial's twelve (-z). The case back is then stood up on its hinge (STAND), so the movement faces the
// visitor behind the dial, and the whole is turned on the table (YAW).

export type P2 = [number, number];
export const DEG = Math.PI / 180;

// The watch's silhouette is at most this wide and this tall, in host heights: it stands in a row of skills.
export const VIEW = { az: 28, el: 50, fov: 18, wide: 0.78, tall: 0.66 } as const;
// The watch is turned on the table so the standing movement stands beside the dial and behind it, at its left, still
// turned enough toward the eye that the train reads: so the pair is wider than it is tall, as its row needs.
export const YAW = -60 * (Math.PI / 180);

// The two halves' middles, and the case's outer radius.
export const MOV = { x: -28.4, z: 0 } as const;
export const DIAL = { x: 26.6, z: 0 } as const;
export const CASE = { r: 25.2 } as const;

// The case back, lying on its outside: a shallow dome rising to its rim, polished inside, with a flange the
// movement sits in. Heights are its floor, the flange, the rim.
export const BACK = { rim: 6.4, lip: 23.7, flange: [21.8, 23.5] as P2, flangeY: 3.55 } as const;
// The body, lying on its back: the case middle up to the bezel, the coin edged bezel, the domed crystal.
export const BODY = { band: 8.3, bezel: [8.25, 10.5] as P2, open: 22.7, crystal: 12.5 } as const;
// The hinge: knuckles along z at x = 0.
export const HINGE = { y: 5.6, r: 1.45, z: [-6.6, 6.6] as P2, knuckles: 5 } as const;
// The case back stands open on its hinge, this many degrees up from lying flat: the two halves are opened to 180 less
// this.
export const STAND = { deg: 66, spin: 35 } as const;
// The dial's print and its hands, and the crown with its bow and chain, are each laid out with twelve at -z and then
// turned on the table about the dial's middle by these many degrees (counter clockwise seen from above): the print so
// twelve is up to the eye with the hinge at its eleven, the crown to the print's three, clear of the hinge.
export const TURN = { print: 30, crown: 30 } as const;
export function turned(x: number, y: number, z: number, deg: number): [number, number, number] {
  const a = deg * DEG, c = Math.cos(a), s = Math.sin(a), dx = x - DIAL.x, dz = z - DIAL.z;
  return [DIAL.x + dx * c + dz * s, y, DIAL.z - dx * s + dz * c];
}
// A point of the case back, as it stands at deg degrees on its hinge.
export function stand(x: number, y: number, z: number, deg: number = STAND.deg): [number, number, number] {
  const a = -deg * DEG, c = Math.cos(a), s = Math.sin(a), h = y - HINGE.y;
  return [x * c - h * s, x * s + h * c + HINGE.y, z];
}

// The movement, in its own coordinates from its middle (u = x - MOV.x, w = z).
export const PLATE = { r: 21.6, y0: 1.6, y1: 3.8 } as const;
// Bridges stand on the plate and are this high at their tops.
export const BRIDGE_TOP = 6.0;
// The balance cock: its table over the balance at y0, a neck that runs to its foot and steps down onto the plate at
// step millimetres from the balance's arbor, past the balance's screws.
export const COCK = { y0: 7.05, t: 0.75, foot: [0.97, -16.99] as P2, pad: 2.3, table: 3.25, ring: 1.75, step: 6.95 } as const;

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
export const BALANCE = { c: [8.5, -11.5] as P2, r: 6.4, rim: 0.72, y: [5.95, 6.4] as P2, screws: 18, arms: 2 } as const;
export const SPRING = { r0: 0.75, r1: 4.8, turns: 11, y: [6.5, 6.78] as P2, w: 0.075 } as const;
export const PALLET = { c: [11.72, -4.16] as P2, y: [5.02, 5.18] as P2, bank: 9 } as const;
// The ratchet on the barrel's arbor, above its bridge, and its click.
export const RATCHET = { r: 5.4, z: 48, y: [6.0, 6.55] as P2 } as const;

// Where jewels stand in gold chatons: on the bridges over each pivot, and the endstone on the cock.
export const JEWELS: { c: P2; y: number; r: number; of: string }[] = [
  { c: C, y: BRIDGE_TOP, r: 1.75, of: 'center' },
  { c: T, y: BRIDGE_TOP, r: 1.5, of: 'third' },
  { c: F, y: BRIDGE_TOP, r: 1.5, of: 'fourth' },
  { c: E, y: BRIDGE_TOP, r: 0.95, of: 'escape' },
  { c: [11.72, -4.16], y: BRIDGE_TOP, r: 0.85, of: 'pallet' },
  { c: [8.5, -11.5], y: COCK.y0 + COCK.t, r: 1.45, of: 'balance' },
];

// The bridges, as unions of discs and bars in the movement's plane: a bar is two points and a half width, a taper two
// points and a half width at each, and a cut a disc taken out, which gives an outline its hollows. Four shaped plates
// with open plate between them, so the train shows: the barrel bridge, which also carries the centre wheel's top
// pivot, the train bridge sweeping in an arc over the third and fourth pivots, and the slender escape and pallet
// bridges cut away over the escapement. The balance cock is the fifth (COCK).
export interface Bridge { name: string; discs: [number, number, number][]; bars: [number, number, number, number, number][]; tapers?: [number, number, number, number, number, number][]; cuts?: [number, number, number][]; k: number; screws: P2[] }
// The train bridge's line: from its foot by the plate's edge, through the third and fourth pivots, to its other foot.
export const SWEEP: P2[] = [[0.8, 13.6], [5.516, 4.628], [11.636, 4.628], [17.4, 10.6]];
// A smooth line through points, as tapers from half width w0 at its ends to w1 at its middle.
function sweep(pts: P2[], w0: number, w1: number, n: number): [number, number, number, number, number, number][] {
  const at = (t: number): P2 => {
    const s = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(s)), u = s - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c = (a: number, b: number, c2: number, d: number) => 0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u);
    return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
  };
  const w = (t: number) => w0 + (w1 - w0) * Math.sin(Math.PI * t);
  const out: [number, number, number, number, number, number][] = [];
  for (let k = 0; k < n; k++) { const a = at(k / n), b = at((k + 1) / n); out.push([a[0], a[1], b[0], b[1], w(k / n), w((k + 1) / n)]); }
  return out;
}
export const BRIDGES: Bridge[] = [
  {
    name: 'barrel', k: 0.9,
    discs: [[-9.5, -6.0, 8.4], [0, 0, 2.55], [-16.4, -11.8, 1.85], [-17.6, 3.1, 1.85]],
    bars: [],
    tapers: [[-9.5, -6.0, -16.4, -11.8, 3.6, 1.55], [-9.5, -6.0, -17.6, 3.1, 3.4, 1.55], [-9.5, -6.0, 0, 0, 2.4, 1.6]],
    cuts: [[-22.6, -4.4, 4.2]],
    screws: [[-16.4, -11.8], [-17.6, 3.1], [-3.9, -0.9]],
  },
  {
    name: 'train', k: 0.7,
    discs: [[0.8, 13.6, 1.95], [5.516, 4.628, 2.35], [11.636, 4.628, 2.35], [17.4, 10.6, 1.95]],
    bars: [],
    tapers: sweep(SWEEP, 1.45, 1.75, 18),
    screws: [[0.8, 13.6], [17.4, 10.6]],
  },
  { name: 'escape', k: 0.5, discs: [[13.131, -0.95, 1.4], [18.8, -2.05, 1.1]], bars: [[13.131, -0.95, 18.8, -2.05, 0.6]], screws: [[18.8, -2.05]] },
  { name: 'pallet', k: 0.5, discs: [[11.72, -4.16, 1.25], [16.6, -9.3, 1.1]], bars: [[11.72, -4.16, 16.6, -9.3, 0.55]], screws: [[16.6, -9.3]] },
];

// The dial, from the body's middle. The chapter ring and the minute track, the numerals' band, the small seconds at
// six (toward the viewer), the cartouche toward twelve, and the hands.
export const DIAL_FACE = { y: 8.0, r: 22.7 } as const;
// The dial's centre is sunk a little inside the numerals' feet, and the small seconds further into it.
export const SUNK = { r: 14.6, d: 0.22 } as const;
export const CHAPTER = { r: [19.3, 21.9] as P2, y: [8.0, 8.24] as P2, track: [20.05, 21.25] as P2 } as const;
// The rehaut slopes from the chapter ring's outer edge up to this radius and height under the bezel.
export const REHAUT = { r: 22.55, y: 8.95 } as const;
export const NUMERALS = { r0: 15.1, h: 3.2, y: [8.0, 8.32] as P2 } as const;
export const SECONDS = { c: [0, 9.6] as P2, r: 4.5, sink: 0.35 } as const;
export const CARTOUCHE = { c: [0, -7.2] as P2, w: 11.4, d: 3.7, y: [8.0, 8.2] as P2 } as const;
export const HANDS = { hour: 10.6, minute: 15.6, second: 3.9, y: [8.72, 8.98, 7.85] as const, hub: 1.05 } as const;
// The time the hands show at rest.
export const TIME = { h: 10, m: 9, s: 36 } as const;

// The pendant, crown and bow at twelve, and the chain off the bow, in the dial's coordinates.
export const PENDANT = { r: 1.7, from: 24.9, to: 28.4, y: 4.6 } as const;
export const CROWN = { r: 3.3, len: 3.8, flutes: 36 } as const;
// The bow's wire, the boss on the pendant it pivots on, and the pin through both.
export const BOW = { wire: 0.95, boss: 2.45, pin: 0.42 } as const;
export const CHAIN = { links: 9, pitch: 3.15, long: 4.3, wide: 2.7, wire: 0.5 } as const;
// The T bar at the chain's end, which goes through a waistcoat's buttonhole: a rod with a knob at each end, on an eye.
export const TBAR = { len: 10, r: 0.6, knob: 0.95, eye: 1.25, lie: 1.0 } as const;

// The running watch: beats a second (18,000 an hour), the escape wheel's step a beat, the balance's swing.
export const RUN = { hz: 2.5, step: 12, swing: 250 } as const;

export const toMov = (p: P2): P2 => [p[0] + MOV.x, p[1] + MOV.z];
export const toDial = (p: P2): P2 => [p[0] + DIAL.x, p[1] + DIAL.z];
