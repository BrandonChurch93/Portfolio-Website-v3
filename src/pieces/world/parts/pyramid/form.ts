// The pyramid's form, in its own frame: units, its middle at its foot, x and z along its sides, y up the axis. Its
// place, size, turn and height are the plan's (PYRAMID in ../../layout.ts), laid over picture 9: these are what the
// plan does not hold. scripts/world/parts/pyramid/make.mjs builds it from both and the shader reads the same numbers,
// so this file imports nothing.

export const FORM = {
  // How far the gold runs on under the ground, so no gap shows wherever the ground falls away.
  sink: 7,
  // Every arris, and the body's top edge under the reveal, is rounded at each pixel: the face is bent toward its
  // neighbour as a round this wide would bend it, so the line of the night it mirrors is smooth at any size. The
  // mesh's own edges are crisp creases. A real round fine enough to keep an edge crisp is under a pixel at the page's
  // size, and it broke that line into dots there.
  round: { seen: { arris: 2, lip: 2 } },
  // The capstone: the body stops at `from`, a dark reveal `reveal` tall, set back `inset`, and the capstone above.
  // Picture 9's reveal is a quarter of the way down from the apex.
  cap: { from: 85.4, reveal: 2.2, inset: 2.6 },
  // The casing: level courses this tall (measured upright), plates about this long along a course (each a share
  // `jag` longer or shorter, so their joints never line up as bricks do), the hairline joint between plates, and how
  // far each plate is tilted from its face at most, in radians.
  casing: { course: 2.15, plate: 11, jag: 0.4, joint: 0.11, tilt: 0.00055 },
} as const;

type V3 = [number, number, number];
// The pyramid's own axes in the world: x and z along its sides, turned by `turn` degrees, and y straight out from a
// dome of radius `top` at the place (x, z). That is the slight lean that stands it straight out from the dome.
export function standing(x: number, z: number, top: number, turn: number): { x: V3; y: V3; z: V3 } {
  const r = Math.sqrt(Math.max(1, top * top - x * x - z * z)), y: V3 = [x / top, r / top, z / top];
  const c = Math.cos((turn * Math.PI) / 180), s = Math.sin((turn * Math.PI) / 180), d = c * y[0] - s * y[2];
  let a: V3 = [c - d * y[0], -d * y[1], -s - d * y[2]];
  const l = Math.hypot(...a);
  a = [a[0] / l, a[1] / l, a[2] / l];
  return { x: a, y, z: [a[1] * y[2] - a[2] * y[1], a[2] * y[0] - a[0] * y[2], a[0] * y[1] - a[1] * y[0]] };
}
