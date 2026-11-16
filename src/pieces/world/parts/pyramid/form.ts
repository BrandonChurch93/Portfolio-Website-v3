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
  // size, and it broke that line into dots there. The capstone's are rounded finer: as wide as the body's they read as
  // a soft caramel lip on so small a stone.
  round: { seen: { arris: 2, lip: 1.4, cap: 0.7 } },
  // The capstone: the body stops at `from`, a reveal `reveal` tall, set back `inset` from the capstone's foot, and the
  // capstone above. Picture 9's reveal is a dark line from 214 to 216 down where it meets the front arris, its apex
  // at 185. Under 2 tall the reveal is under a pixel at the page's size, and the capstone no longer reads as a stone
  // of its own there.
  cap: { from: 83, reveal: 2.2, inset: 0.9 },
  // The foot course: a band `tall` high round the foot, standing `proud` out from the faces, its top edge bevelled
  // `bevel` deep.
  foot: { tall: 3.4, proud: 0.75, bevel: 0.45 },
  // The casing: long sheets in courses. The face is ruled in rows `row` tall at its foot, thinning upward so a row
  // `taper` up is half as tall as one at the foot, and a share `merge` of the lines between rows is no seam (every
  // `every`th is), so courses run from one row to `every` rows tall and no two neighbours need agree. Each course has
  // its own sheet length, from 0.65 to 1.35 of `plate`, each joint a share `jag` of that off its place. A seam is a
  // hairline `line` tall. How each sheet lies is the shader's (NIGHT.kick, bow, tilt). Even courses of short plates
  // read as running bond brick, and forty even seams as siding.
  casing: { row: 2.6, taper: 100, every: 4, merge: 0.52, plate: 24, jag: 0.7, line: 0.1 },
  // The sheet the pyramid's shade is drawn on (./shade.ts), over the ground round its foot: how far round the foot
  // course it reaches, how far along the moon's shadow, as a share of the shadow's length, how far apart its points
  // are, and how high over the plan's ground it lies.
  shade: { reach: 14, along: 0.55, cell: 5, lift: 0.6 },
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
