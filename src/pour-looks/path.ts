// The one fixed shape every look is drawn on: it falls, lands near one end of a tilted ledge, runs along it,
// turns over the far end and falls again, thinning until it breaks into beads. No physics. This is a study of
// how the metal is drawn, not of how it moves.
// Units: the panel is 1 high, y up, with its center at 0, 0.

export const SEGMENTS = 16;

// x, y, radius
const POINTS: [number, number, number][] = [
  [-0.19, 0.6, 0.046],
  [-0.15, 0.44, 0.042],
  [-0.123, 0.31, 0.0385],
  [-0.105, 0.19, 0.0355],
  [-0.095, 0.1, 0.033],
  [-0.088, 0.053, 0.037],
  [-0.02, 0.0375, 0.0195],
  [0.07, 0.0195, 0.0165],
  [0.168, 0.0025, 0.0155],
  [0.1814, -0.0023, 0.0155],
  [0.192, -0.0112, 0.0155],
  [0.199, -0.0232, 0.0153],
  [0.2014, -0.0369, 0.0151],
  [0.2045, -0.1, 0.0146],
  [0.207, -0.19, 0.0138],
  [0.209, -0.34, 0.0125],
  [0.21, -0.62, 0.0115],
];

const LANDS = 5;
const LEAVES = 8;
const GRAVITY = 1.6;
const START_SPEED = 0.55;
const LEDGE_SPEED = 0.6;

function speed(i: number): number {
  const y = POINTS[i][1];
  if (i <= LANDS - 1) return Math.sqrt(START_SPEED ** 2 + 2 * GRAVITY * (POINTS[0][1] - y));
  if (i <= LEAVES) return LEDGE_SPEED;
  return Math.sqrt(LEDGE_SPEED ** 2 + 2 * GRAVITY * (POINTS[LEAVES][1] - y));
}

// Each segment's ends, its radius at each end, and how long the metal has been travelling when it reaches each end.
// A pattern drawn against that travel time rides with the metal and stretches where the metal speeds up.
export function path(): { ends: Float32Array; shape: Float32Array } {
  const ends = new Float32Array(SEGMENTS * 4);
  const shape = new Float32Array(SEGMENTS * 4);
  let t = 0;
  for (let i = 0; i < SEGMENTS; i++) {
    const [ax, ay, ar] = POINTS[i];
    const [bx, by, br] = POINTS[i + 1];
    const dt = Math.hypot(bx - ax, by - ay) / ((speed(i) + speed(i + 1)) / 2);
    ends.set([ax, ay, bx, by], i * 4);
    shape.set([ar, br, t, t + dt], i * 4);
    t += dt;
  }
  return { ends, shape };
}

// The ledge: center, half length, half thickness, and its tilt in radians.
export const LEDGE = { x: -0.019, y: -0.0047, half: 0.1876, thick: 0.024, tilt: Math.atan2(-0.062, 0.37) };
