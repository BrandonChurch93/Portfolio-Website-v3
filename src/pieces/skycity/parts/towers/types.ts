import { KIND, Shape, chamfer, ngon, p, rect, turned, type P } from './shape';

// The family of buildings. Each is designed once, in shares of its lot and units (./shape.ts), and drawn on every lot
// it is given. Heights are shares of the lot's height, so a type keeps its proportions; ledges, masts and decks are
// in units, so they are the same on every tower.

type Ring = (y: number, ay?: number) => P[];
export type Size = 'low' | 'mid' | 'tall';

export interface Type {
  name: string;
  // The sizes of lot it suits.
  sizes: Size[];
  build(s: Shape): void;
  // Where its beacons stand, if it has any.
  beacons?: P[];
}

const { glass, stone, dark, trim, copper, band, plant, lobby, louvre } = KIND;

// A ring of so many sides round a point of the lot, its radius in units.
const circleAt = (cx: number, cz: number, r: number, seg: number): Ring => (y, ay = 0) =>
  Array.from({ length: seg }, (_, i) => { const a = -(i / seg) * Math.PI * 2; return p(cx, y, cz, Math.cos(a) * r, ay, Math.sin(a) * r); });
// The ledge that finishes a tier: a pale satin band that catches the light along its top.
const LEDGE = { tall: 1.3, out: 0.55 };
const cornice = (s: Shape, r: Ring, y: number, kind: number = trim, roundIt = false) => s.ledge(r, y, LEDGE.tall, LEDGE.out, kind, roundIt);
// A mast from y0 to y1 in shares, so many units across.
const mast = (s: Shape, x: number, z: number, y0: number, y1: number, r = 0.55) => s.prism(circleAt(x, z, r, 6), y0, y1, dark, { round: true });
// Plant on a roof: low clumps, a few units across.
const garden = (s: Shape, y: number, at: [number, number][]) => at.forEach(([x, z], i) => s.box(x, y, z, 0, 0, 0, 3.2 + (i % 2), 1.4 + 0.5 * (i % 3), 2.8, plant));

export const TYPES: Type[] = [
  {
    // Three tiers stepping in, each finished by a ledge, a copper ledge at the top and a mast.
    name: 'setback',
    sizes: ['mid', 'tall'],
    build(s) {
      const A = rect(0.5, 0.5), B = rect(0.4, 0.36, 0, -0.04), C = rect(0.28, 0.24, 0, -0.06);
      s.prism(A, 0, 0.52, glass); cornice(s, A, 0.52);
      s.prism(B, 0.52, 0.8, glass); cornice(s, B, 0.8);
      s.prism(C, 0.8, 0.93, glass); cornice(s, C, 0.93, copper);
      s.ledge(C, 0.885, 0.8, 0.25, band);
      s.box(0, 0.93, -0.06, 0, 0, 0, 7, 2.6, 5, dark);
      mast(s, 0, -0.06, 0.93, 1);
      garden(s, 0.52, [[-0.42, 0.42], [0.42, 0.42]]);
    },
    beacons: [p(0, 1, -0.06, 0, 0.6, 0)],
  },
  {
    // An octagon with a crown of louvres under a copper ledge, and a mast.
    name: 'octagon',
    sizes: ['mid', 'tall'],
    build(s) {
      const O = chamfer(0.5, 0.5, 0.16), Q = chamfer(0.44, 0.44, 0.14);
      s.prism(O, 0, 0.85, glass); cornice(s, O, 0.85);
      s.ledge(O, 0.82, 0.8, 0.3, band);
      s.prism(Q, 0.85, 0.93, louvre); cornice(s, Q, 0.93, copper);
      s.prism(chamfer(0.14, 0.14, 0.04), 0.93, 0.945, dark);
      mast(s, 0, 0, 0.945, 1, 0.7);
    },
    beacons: [p(0, 1, 0, 0, 0.6, 0)],
  },
  {
    // A drum with a deck round it every few floors, crowned by a narrower drum of louvres under a ring of light
    // and a ring of copper, and a needle.
    name: 'drum',
    sizes: ['tall'],
    build(s) {
      const R = ngon(20, 0.5), C = ngon(20, 0.36), T = ngon(20, 0.2);
      s.prism(R, 0, 0.86, glass, { round: true });
      for (const y of [0.22, 0.38, 0.54, 0.7]) s.ledge(R, y, 0.9, 1.1, trim, true);
      s.ledge(R, 0.86, 1.2, 0.6, trim, true);
      // A halo: a ring standing off the tower on four arms, its outer edge lit.
      const halo = (y: number, add: number) => ngon(32, 0.5)(y).map((q) => { const l = Math.hypot(q[0], q[2]); return p(q[0], q[1], q[2], (q[0] / l) * add, q[4], (q[2] / l) * add); });
      s.walls(halo(0.76, 7).map((q) => p(q[0], q[1], q[2], q[3], -1.4, q[5])), halo(0.76, 7), band, true);
      s.cap(halo(0.76, 7), trim);
      s.walls([...halo(0.76, 4.5)].reverse(), [...halo(0.76, 4.5)].reverse().map((q) => p(q[0], q[1], q[2], q[3], -1.4, q[5])), dark, true);
      const arm: Ring = (y, ay = 0) => [p(0.5, y, 0, 5, ay, 0.5), p(0.5, y, 0, 5, ay, -0.5), p(0.5, y, 0, -1, ay, -0.5), p(0.5, y, 0, -1, ay, 0.5)];
      for (const a of [0, 1, 2, 3]) s.prism(turned(arm, a * (Math.PI / 2) + Math.PI / 4), 0.76, 0.76, dark, { ay0: -1.3, ay1: -0.15 });
      s.prism(C, 0.86, 0.92, louvre, { round: true });
      s.ledge(C, 0.905, 0.8, 0.35, band, true);
      s.ledge(C, 0.92, 1.0, 0.5, copper, true);
      s.prism(T, 0.92, 0.95, dark, { round: true });
      mast(s, 0, 0, 0.95, 1, 0.5);
    },
    beacons: [p(0, 1, 0, 0, 0.6, 0)],
  },
  {
    // An octagon that steps in twice at its top, with light under the last step.
    name: 'octagon-step',
    sizes: ['mid', 'tall'],
    build(s) {
      const O = chamfer(0.5, 0.5, 0.16), Q = chamfer(0.4, 0.4, 0.13), W = chamfer(0.28, 0.28, 0.09);
      s.prism(O, 0, 0.84, glass); cornice(s, O, 0.84);
      s.prism(Q, 0.84, 0.91, glass); cornice(s, Q, 0.91);
      s.ledge(Q, 0.895, 0.8, 0.25, band);
      s.prism(W, 0.91, 0.96, louvre); cornice(s, W, 0.96, copper);
      mast(s, 0, 0, 0.96, 1, 0.45);
    },
    beacons: [p(0, 1, 0, 0, 0.6, 0)],
  },
  {
    // A drum with two decks, stepping in at its top to a drum of louvres.
    name: 'drum-plain',
    sizes: ['tall'],
    build(s) {
      const R = ngon(20, 0.5), C = ngon(20, 0.4), T = ngon(20, 0.28);
      s.prism(R, 0, 0.88, glass, { round: true });
      for (const y of [0.33, 0.62]) s.ledge(R, y, 0.9, 0.9, trim, true);
      s.ledge(R, 0.88, 1.2, 0.5, trim, true);
      s.prism(C, 0.88, 0.94, glass, { round: true }); s.ledge(C, 0.94, 1.0, 0.4, trim, true);
      s.prism(T, 0.94, 0.98, louvre, { round: true }); s.ledge(T, 0.98, 0.9, 0.4, copper, true);
    },
  },
  {
    // A square that turns as it rises, finished flat with a pale ledge and a crown of light.
    name: 'twist',
    sizes: ['tall'],
    build(s) {
      const N = 12, top = 0.94, turn = Math.PI / 2.4;
      for (let j = 0; j < N; j++) {
        const y0 = (j / N) * top, y1 = ((j + 1) / N) * top;
        s.walls(turned(rect(0.47, 0.47), (j / N) * turn)(y0), turned(rect(0.47, 0.47), ((j + 1) / N) * turn)(y1), glass);
      }
      const T = turned(rect(0.47, 0.47), turn);
      cornice(s, T, top);
      s.ledge(T, top - 0.02, 0.9, 0.3, band);
      s.cap(T(top), dark);
      s.prism(turned(rect(0.3, 0.3), turn), top, top + 0.025, louvre);
      mast(s, 0, 0, top + 0.025, 1, 0.6);
    },
    beacons: [p(0, 1, 0, 0, 0.6, 0)],
  },
  {
    // A hexagon of glass that rises into a faceted point, a ring of light where it turns in.
    name: 'crystal',
    sizes: ['tall'],
    build(s) {
      const H = ngon(6, 0.52, Math.PI / 6, 0.5);
      s.prism(H, 0, 0.7, glass, { lid: false });
      s.ledge(H, 0.7, 1.0, 0.5, band);
      cornice(s, H, 0.69);
      s.point(H(0.7), p(0, 0.985, 0), glass);
      mast(s, 0, 0, 0.96, 1, 0.45);
    },
    beacons: [p(0, 1, 0, 0, 0.6, 0)],
  },
  {
    // Two slabs of different heights on one podium, with a gap of sky between them and two bridges across it.
    name: 'twin',
    sizes: ['tall'],
    build(s) {
      const P0 = rect(0.5, 0.5), L = rect(0.19, 0.42, -0.31, 0), R = rect(0.19, 0.42, 0.31, 0);
      s.prism(P0, 0, 0.1, stone); cornice(s, P0, 0.1);
      s.prism(L, 0.1, 0.95, glass); cornice(s, L, 0.95, copper);
      s.prism(R, 0.1, 0.8, glass); cornice(s, R, 0.8);
      for (const y of [0.42, 0.66]) s.prism(rect(0.14, 0.16), y, y, lobby, { ay0: -2.6, ay1: 2.6 });
      s.box(0.31, 0.8, 0, 0, 0, 0, 5, 2.4, 6, dark);
      mast(s, -0.31, 0, 0.95, 1);
    },
    beacons: [p(-0.31, 1, 0, 0, 0.6, 0)],
  },
  {
    // A tapering slab cut across the top on a slope.
    name: 'blade',
    sizes: ['mid', 'tall'],
    build(s) {
      const lo = rect(0.5, 0.38)(0);
      const hi = [p(0.3, 0.97, 0.22), p(0.3, 0.97, -0.22), p(-0.3, 0.84, -0.22), p(-0.3, 0.84, 0.22)];
      s.walls(lo, hi, glass);
      s.cap(hi, dark);
      const lip = hi.map((q) => p(q[0], q[1], q[2], 0, 1.2, 0));
      s.walls(hi.map((q, i) => p(q[0], q[1], q[2], [0.5, 0.5, -0.5, -0.5][i], -0.4, [0.5, -0.5, -0.5, 0.5][i])), lip.map((q, i) => p(q[0], q[1], q[2], [0.5, 0.5, -0.5, -0.5][i], 1.2, [0.5, -0.5, -0.5, 0.5][i])), trim);
      mast(s, 0.24, 0, 0.97, 1, 0.5);
    },
    beacons: [p(0.24, 1, 0, 0, 0.6, 0)],
  },
  {
    // A stone podium with a lit lobby and a garden on its roof, and a slim tower set back on it.
    name: 'podium',
    sizes: ['low', 'mid'],
    build(s) {
      const A = rect(0.5, 0.5), T = rect(0.3, 0.3, 0.06, -0.1);
      s.prism(A, 0, 0.05, lobby, { lid: false });
      s.prism(A, 0.05, 0.24, stone); cornice(s, A, 0.24);
      garden(s, 0.24, [[-0.36, 0.36], [-0.1, 0.38], [0.36, 0.36], [-0.38, -0.3]]);
      s.prism(T, 0.24, 0.93, glass); cornice(s, T, 0.93, copper);
      s.box(0.06, 0.93, -0.1, 0, 0, 0, 5, 2.4, 4, dark);
    },
  },
  {
    // Four tiers stepping in on every side, each with a ledge, the third with light, under a copper spike.
    name: 'ziggurat',
    sizes: ['mid'],
    build(s) {
      const tiers: [number, number, number][] = [[0.5, 0, 0.4], [0.4, 0.4, 0.62], [0.3, 0.62, 0.8], [0.19, 0.8, 0.91]];
      for (const [h, y0, y1] of tiers) { s.prism(rect(h, h), y0, y1, glass); cornice(s, rect(h, h), y1, y1 > 0.9 ? copper : trim); }
      s.ledge(rect(0.3, 0.3), 0.77, 0.8, 0.25, band);
      s.point(rect(0.06, 0.06)(0.91), p(0, 1, 0), copper);
    },
  },
  {
    // A stone block with its roof of plant rooms, a tank and a garden.
    name: 'block',
    sizes: ['low'],
    build(s) {
      const A = rect(0.5, 0.5);
      s.prism(A, 0, 0.86, stone); cornice(s, A, 0.86);
      s.box(-0.18, 0.86, -0.15, 0, 0, 0, 8, 3.2, 6, dark, trim);
      s.drum(0.25, 0.86, -0.22, 0, 2.4, 4.2, 10, dark);
      garden(s, 0.86, [[0.3, 0.3], [-0.3, 0.32], [0.05, 0.36]]);
    },
  },
  {
    // A glass slab with a glass penthouse set back on its roof.
    name: 'slab',
    sizes: ['low', 'mid'],
    build(s) {
      const A = rect(0.5, 0.5), B = rect(0.3, 0.26, -0.12, -0.18);
      s.prism(A, 0, 0.88, glass); cornice(s, A, 0.88);
      s.prism(B, 0.88, 0.88, glass, { ay1: 3.6 }); s.ledge(B, 0.88, 0.8, 0.4, trim);
      garden(s, 0.88, [[0.32, 0.3], [0.3, -0.2]]);
    },
  },
  {
    // Terraces stepping down toward the rim, with gardens on them.
    name: 'terraces',
    sizes: ['low', 'mid'],
    build(s) {
      const A = rect(0.5, 0.5), B = rect(0.5, 0.33, 0, -0.17), C = rect(0.5, 0.17, 0, -0.33);
      s.prism(A, 0, 0.5, glass); cornice(s, A, 0.5);
      garden(s, 0.5, [[-0.35, 0.38], [0.0, 0.4], [0.35, 0.38]]);
      s.prism(B, 0.5, 0.76, glass); cornice(s, B, 0.76);
      garden(s, 0.76, [[-0.3, 0.06], [0.3, 0.06]]);
      s.prism(C, 0.76, 0.96, glass); cornice(s, C, 0.96, copper);
    },
  },
];

// A bridge between two towers: a unit box of glass, stretched along its length.
export function bridge(): Shape {
  const s = new Shape();
  s.prism(rect(0.5, 0.5), 0, 1, lobby);
  return s;
}
