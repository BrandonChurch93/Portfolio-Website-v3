// The monument: a colossal Sun disc of polished gold standing on its rim in a bronze cradle, on a stepped plinth of
// old stone with an obelisk at each end. Built upright at the origin, in units, with the disc's face toward +z, and
// then stood on the dome at MONUMENT, turned about its own upright so its face is toward the moon.

// The disc: its outer radius, the height of its middle over the ground, how far it is turned toward the moon in
// degrees, and how many steps round it is cut in.
export const DISC = { r: 84, at: 119, spin: 26, seg: 96 } as const;
// The carving is drawn in its own units, in which the rim's outer edge is 85: these numbers are the Sun stone's
// proportions, worked to read at the page's size. K takes them to the world's units.
export const CARVE_R = 85;
export const K = DISC.r / CARVE_R;

// The plinth, three tiers, each its half length (along the disc), half depth, top, and how many courses it is laid in.
export const TIERS = [
  { x: 116, z: 46, top: 10, courses: 2 },
  { x: 86, z: 38, top: 18, courses: 2 },
  { x: 74, z: 31, top: 24, courses: 1 },
] as const;
// The cradle the disc's rim rests in: its half length at its foot, how far round the disc it reaches either side of
// straight down, in degrees, the radius of the seat it is cut to, and its front and back.
export const CRADLE = { x: 70, reach: 46, front: 16, back: -29, lip: 4 } as const;
// The clamps over the rim: how far round from straight down, in degrees, how wide, how long out from the rim, how far
// their middle stands out past the rim, how far they reach before and behind the disc's middle, and the lip that comes
// over the rim's front.
export const CLAMP = { at: 41, wide: 13, long: 20, out: 3, front: 17, back: -27, lip: 9 } as const;
// The pylons that brace the cradle at each end: how far out, how wide at the foot and at the top, how tall, how deep, and how far its middle is set back.
export const PYLON = { x: 68, w0: 15, w1: 10, tall: 36, deep: 46, mid: -6 } as const;
// The obelisks, one at each end of the plinth: where along it, how tall the shaft is from its pedestal's top, how
// wide at its foot and at its top, and its gold cap.
export const OBELISK = { x: 104, foot: 10, ped: { w: 15, h: 8 }, tall: 98, w0: 9.5, w1: 6.2, cap: 8.5 } as const;
// The stair up the front of the plinth to the cradle's foot: its half width, how many steps, and how deep each is.
export const STAIR = { half: 22, steps: 12, run: 2.6 } as const;
// The braziers at the monument's foot: small warm lights for scale.
export const BRAZIERS: readonly (readonly [number, number, number])[] = [
  [-STAIR.half - 6, 0, TIERS[2].z + STAIR.steps * STAIR.run + 3], [STAIR.half + 6, 0, TIERS[2].z + STAIR.steps * STAIR.run + 3],
  [-TIERS[2].x + 5, TIERS[2].top, TIERS[2].z - 2], [TIERS[2].x - 5, TIERS[2].top, TIERS[2].z - 2],
  [-OBELISK.x, TIERS[0].top, OBELISK.ped.w], [OBELISK.x, TIERS[0].top, OBELISK.ped.w],
];

// The seam of the carving's map, in radians round the disc: between two rays, so no ray crosses it.
export const SEAM = Math.PI / 8;
export const QUARTER = Math.PI / 2;
