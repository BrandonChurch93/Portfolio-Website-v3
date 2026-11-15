// Study 32: the hero's world, started again from nothing, as a grey blockout. He set the built world and both
// worlds of Study 31 aside and asked for a new model of the same idea: a planet torn open, its core showing, the
// stream falling from the core, what broke away round it. Four pictures he had made (reference/concept/) set the
// look. This settles what a picture cannot: the planet's real shape and depth, the camera, the sizes of what stands
// on it, where the core hangs, and how all of it sits under his words. Nothing here is from the old plan.
//
// Units, one a CSS pixel on a screen 1460 wide. The origin is the top of the planet, at the spire's foot. x to the
// visitor's right, y up, z toward the visitor.

export const D2R = Math.PI / 180;

// The planet. As wide as before, which he called perfect. Its top is a gentle dome, the top of a far larger
// sphere, so the land curves and is not a table: he found a rounder top too round. Under the rim its body is a deep
// bowl, half a small planet, which is what makes it a planet and not a platform.
export const WORLD = { half: 660, top: 1900, deep: 560 } as const;
// How far the rim lies under the top.
export const RIM = WORLD.top - Math.sqrt(WORLD.top ** 2 - WORLD.half ** 2);
// The height of the bare dome at a place on the map.
export const dome = (x: number, z: number): number => Math.sqrt(Math.max(1, WORLD.top ** 2 - x * x - z * z)) - WORLD.top;

// The core: a ball of the stream's light hanging low in the torn hollow, well under the city, on the hero's
// center line. He found it wrong directly under the ground.
export const CORE = { at: [0, -436, 60] as const, r: 84 } as const;

// The spire: the tallest thing by far, on the center line, with one thin ring near its top, tilted as Saturn's is.
export const SPIRE = { tall: 330, foot: 48, ring: { r: 66, thick: 2.6, up: 0.79, tilt: [9, 17] as const } } as const;
// Nothing else stands taller than this.
export const TALLEST = 205;
// The pyramid: in the city, among the buildings, to the left of the spire.
export const PYRAMID = { x: -262, z: 86, base: 196, tall: 122, court: 142 } as const;
// The avenue from the spire's foot toward the visitor, which ends where the ground is torn away.
export const AVENUE = { half: 30, from: 62 } as const;

// How it is looked at: from straight in front and from above, by so many degrees, from far off. The built world was
// seen from 4.5, which shows a skyline and none of the land. The pictures are seen from about 10 to 15.
export const VIEW = { el: [8, 12, 16] as const, rest: 12, back: 9000 } as const;
// Its host on the page: this wide whatever the screen, this tall, with its top this far over the spire's tip.
export const HOST = { wide: 1460, tall: 1290, over: 80 } as const;
// His words, as the hero page sets them (src/hero/board.ts).
export const WORDS = { w: 960, tall: 330, least: 90, third: 0.33, rise: 146, gap: 20 } as const;

// The moon, from the visitor's upper right, as it is in the page's sky: the one light, whose shadows make the world.
export const MOONWARD = [0.8, 0.46, 0.08] as const;

const hash = (x: number, y: number, z: number, s: number): number => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683) ^ Math.imul(s, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const ease = (t: number): number => t * t * (3 - 2 * t);
export const ramp = (a: number, b: number, x: number): number => ease(Math.min(1, Math.max(0, (x - a) / (b - a))));
// Smooth noise, 0 to 1.
export function noise(x: number, y: number, z: number, s = 0): number {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = ease(x - i), v = ease(y - j), w = ease(z - k);
  const a = hash(i, j, k, s) * (1 - u) + hash(i + 1, j, k, s) * u, b = hash(i, j + 1, k, s) * (1 - u) + hash(i + 1, j + 1, k, s) * u;
  const c = hash(i, j, k + 1, s) * (1 - u) + hash(i + 1, j, k + 1, s) * u, d = hash(i, j + 1, k + 1, s) * (1 - u) + hash(i + 1, j + 1, k + 1, s) * u;
  return (a * (1 - v) + b * v) * (1 - w) + (c * (1 - v) + d * v) * w;
}
// Which block of broken rock a point is in, as three numbers from -0.5 to 0.5 that are the same all through the
// block. Rock breaks into blocks: everything inside one moves together, and its faces are where it parted from its
// neighbours.
const out = [0, 0, 0];
export function block(x: number, y: number, z: number, s: number): number[] {
  const i = Math.floor(x - 0.5), j = Math.floor(y - 0.5), k = Math.floor(z - 0.5);
  let best = 1e9, bi = 0, bj = 0, bk = 0;
  for (let c = 0; c < 8; c++) {
    const ci = i + (c & 1), cj = j + ((c >> 1) & 1), ck = k + (c >> 2);
    const dx = ci + 0.25 + 0.5 * hash(ci, cj, ck, s) - x, dy = cj + 0.25 + 0.5 * hash(ci, cj, ck, s + 1) - y, dz = ck + 0.25 + 0.5 * hash(ci, cj, ck, s + 2) - z, d = dx * dx + dy * dy + dz * dz;
    if (d < best) { best = d; bi = ci; bj = cj; bk = ck; }
  }
  out[0] = hash(bi, bj, bk, s + 3) - 0.5;
  out[1] = hash(bi, bj, bk, s + 4) - 0.5;
  out[2] = hash(bi, bj, bk, s + 5) - 0.5;
  return out;
}

// What has been torn away: under 0 inside it. The whole front of the planet is opened into a tall hollow round
// the core, with a thick mass of rock left over it under the city, its roof rising to break the land's front edge,
// and no floor: the stream falls free. The rock is broken in blocks, in beds, so its faces are slabs and steps.
const BITES: readonly (readonly [number, number, number, number])[] = [
  [-345, -170, 468, 96], [318, -236, 486, 112], [-236, -524, 402, 124], [262, -566, 356, 132], [40, -116, 566, 84], [-150, -330, 560, 90], [176, -404, 540, 96],
];
// The cracks: the bearing each runs out on from the hollow's middle, in degrees from straight toward the visitor,
// and how far it leans from upright. How wide one is where it starts, and how far out it reaches.
const CRACK = { wide: 9, reach: 470 } as const;
const CRACKS: readonly (readonly [number, number])[] = [[-62, 0.12], [-98, -0.2], [-136, 0.16], [-172, -0.1], [152, 0.22], [112, -0.16], [74, 0.14], [40, -0.24], [-28, 0.2]];
export function torn(x: number, y: number, z: number): number {
  const big = block(x / 132, y / 72, z / 132, 11), ox = big[0] * 92, oy = big[1] * 76, oz = big[2] * 92;
  const small = block(x / 44, y / 26, z / 44, 29), X = x + ox + small[0] * 28, Y = y + oy + small[1] * 16, Z = z + oz + small[2] * 28;
  const back = -74 - 82 * Math.exp(-(((Y + 430) / 170) ** 2)) + 0.22 * Math.abs(X);
  const wide = 236 + 0.3 * Math.max(0, Z) + 46 * Math.exp(-(((Y + 430) / 200) ** 2));
  const roof = -188 - 0.0009 * X * X + 0.33 * Math.max(0, Z - 150);
  let g = Math.max(back - Z, Math.abs(X) - wide, Y - roof);
  // The rock lies in beds, and each bed breaks back a little further than the one over it: ledges, which is where
  // shadow lies.
  // The beds are not level and not one thickness, or the wall reads as laid stone.
  const lie = Y + 70 * noise(x / 230, y / 230, z / 230, 17) + 0.1 * X, bed = (((lie / (30 + 14 * noise(x / 300, 4, z / 300, 19))) % 1) + 1) % 1;
  g += ((bed < 0.78 ? bed / 0.78 : (1 - bed) / 0.22) - 0.5) * 13;
  for (const b of BITES) g = Math.min(g, Math.hypot(X - b[0], Y - b[1], Z - b[2]) - b[3]);
  // Cracks run out from the hollow into the rock round it, widest at the hollow and closing as they go, so its walls
  // stand as great separate pieces with dark between them.
  const ax = X, az = Z - 60, out = Math.hypot(ax, az);
  if (out > 60 && out < CRACK.reach) {
    const wide = CRACK.wide * (1 - out / CRACK.reach);
    for (const [deg, lean] of CRACKS) {
      const a = deg * D2R, along = ax * Math.sin(a) + az * Math.cos(a);
      if (along > 0) g = Math.min(g, Math.abs(ax * Math.cos(a) - az * Math.sin(a) + lean * (Y + 380)) - wide);
    }
  }
  return g;
}
// The planet's body under its land: under 0 inside the rock.
export function rock(x: number, y: number, z: number): number {
  const k = Math.sqrt((x / WORLD.half) ** 2 + ((y + RIM) / WORLD.deep) ** 2 + (z / WORLD.half) ** 2), top = y - (dome(x, z) - 7), near = z > -360 && Math.abs(x) < 560;
  // Well outside the planet, or deep inside it away from the tear: nothing more to work out.
  if ((k - 1) * WORLD.deep > 48 || top > 48) return 48;
  if (!near && (k - 1) * WORLD.deep < -48 && top < -48) return -48;
  // The bowl's skin is uneven. Its top is not: the land lies on it.
  const d = Math.max((k - 1) * WORLD.deep + (noise(x / 170, y / 170, z / 170, 3) - 0.5) * 30, top);
  if (d > 70 || !near) return d;
  return Math.max(d, -torn(x, y, z));
}

// The desert: how much of it a place on the map is, 0 to 1. It is the right third of the land and comes round
// toward the visitor.
export function desert(x: number, z: number): number {
  const edge = 150 - 0.34 * z + 34 * (noise(x / 130, 0, z / 130, 7) - 0.5);
  return ramp(edge, edge + 70, x) * (1 - ramp(600, 648, Math.hypot(x, z)));
}
// The dunes: each a crescent with a long back to the wind and a steep face away from it, which the moon leaves in
// shadow. Where it is, how long its back is, how wide it is and how tall.
const WIND = [-0.83, 0.56] as const, SLIP = 0.62;
const DUNES: readonly (readonly [number, number, number, number, number])[] = [
  [330, 300, 150, 120, 46], [480, 190, 140, 112, 42], [250, 420, 120, 96, 34], [430, 380, 130, 104, 40], [560, 60, 120, 92, 34], [390, 40, 150, 120, 48],
  [520, -110, 130, 100, 38], [330, -150, 120, 90, 30], [440, -250, 120, 92, 32], [250, 180, 96, 74, 24], [300, 540, 100, 80, 26], [150, 520, 90, 70, 22],
  [590, 250, 90, 70, 24], [360, -330, 100, 76, 24], [230, -60, 84, 64, 18],
];
export function dunes(x: number, z: number): number {
  let h = 0;
  for (const [cx, cz, len, wid, tall] of DUNES) {
    const rx = x - cx, rz = z - cz, u = rx * WIND[0] + rz * WIND[1], v = -rx * WIND[1] + rz * WIND[0], side = v / wid;
    if (Math.abs(side) >= 1) continue;
    const top = tall * (1 - side * side), s = u - 0.42 * len * side * side;
    h = Math.max(h, s <= 0 ? top * ease(Math.max(0, 1 + s / len)) ** 1.15 : Math.max(0, top - SLIP * s));
  }
  return h + 5 * noise(x / 90, 1, z / 90, 9);
}
// How high the land stands over the bare dome at a place on the map.
export const land = (x: number, z: number): number => desert(x, z) * dunes(x, z);
export const ground = (x: number, z: number): number => dome(x, z) + land(x, z);
// Whether there is land at a place: inside the rim, and not where the ground was torn away.
// How far inside the land's edge a place is: over 0 on the land, under 0 off the rim or where the ground was torn
// away. Smooth enough that an edge can be drawn between two places it was measured at.
export function inland(x: number, z: number): number {
  const rim = 646 + 10 * (noise(x / 60, 2, z / 60, 13) - 0.5) - Math.hypot(x, z);
  if (z < 240 || Math.abs(x) > 540) return rim;
  // Land stands only where there is rock under it.
  const y = dome(x, z);
  return Math.min(rim, -rock(x, y - 12, z), -rock(x, y - 40, z));
}
// Whether a place is on the land and at least so far from its edge, for standing something there.
export function standing(x: number, z: number, pad = 0): boolean {
  if (inland(x, z) <= 0 || 640 - Math.hypot(x, z) < pad) return false;
  return z < 200 || Math.abs(x) > 560 || torn(x, dome(x, z) - 24, z) > pad;
}

export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The city: a grid of blocks over all the land that is not desert, each a building, a park or left open. Large
// beside the planet, and tallest round the spire, falling away to the left and the right unevenly, as a skyline
// does. He ruled both: it is grand, and it comes down from the middle.
export const BLOCK = 80;
export interface Lot { x: number; z: number; w: number; d: number; tall: number; kind: 'tower' | 'drum' | 'park' | 'low' }
export function lots(): Lot[] {
  const r = seeded(5407), list: Lot[] = [];
  for (let gx = -8; gx <= 8; gx++) for (let gz = -8; gz <= 8; gz++) {
    const x = gx * BLOCK, z = gz * BLOCK + 6, far = Math.hypot(x, z), roll = r(), size = r(), lean = r(), kind = r();
    if (far < 84 || far > 586) continue;
    if (Math.abs(x) < AVENUE.half + 30 && z > 0) continue;
    // An open court in front of the spire, so its foot is seen down the avenue.
    if (Math.abs(x) < 130 && z > 20 && z < 190) continue;
    if (Math.hypot(x - PYRAMID.x, z - PYRAMID.z) < PYRAMID.court + 34) continue;
    if (desert(x, z) > 0.02 || desert(x + 46, z) > 0.02 || desert(x, z + 46) > 0.02) continue;
    if (![[-34, -34], [34, -34], [34, 34], [-34, 34]].every(([a, b]) => standing(x + a, z + b, 26))) continue;
    if (roll < 0.13) { list.push({ x, z, w: 58, d: 58, tall: 0, kind: 'park' }); continue; }
    // How near the middle of the skyline it is: across counts for more than depth, since that is how it is seen.
    const mid = Math.exp(-((Math.hypot(x, 0.62 * z) / 250) ** 2));
    const tall = Math.min(TALLEST, (40 + 182 * mid) * (0.56 + 0.72 * lean));
    // A tall block is one tower. A low one is four smaller buildings, so the city's edges are a fabric and not a
    // few large boxes.
    if (tall > 104) { list.push({ x, z, w: 40 + 15 * size, d: 40 + 15 * r(), tall, kind: kind < 0.16 ? 'drum' : 'tower' }); continue; }
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      if (r() < 0.12) continue;
      list.push({ x: x + a * 16.5, z: z + b * 16.5, w: 23 + 7 * r(), d: 23 + 7 * r(), tall: tall * (0.5 + 0.7 * r()), kind: 'low' });
    }
  }
  return list;
}
// What broke away: where each piece hangs, how large it is, and whether it still carries a piece of the land.
export const DEBRIS: readonly { at: readonly [number, number, number]; r: number; land?: boolean }[] = [
  { at: [-520, -470, 330], r: 74, land: true }, { at: [560, -520, 300], r: 62, land: true }, { at: [-330, -640, 420], r: 44 }, { at: [330, -700, 380], r: 52 },
  { at: [-150, -760, 300], r: 30 }, { at: [170, -800, 330], r: 26 }, { at: [-640, -300, 200], r: 30 }, { at: [650, -330, 160], r: 36 }, { at: [90, -690, 440], r: 20 },
  { at: [-70, -610, 470], r: 16 }, { at: [-420, -820, 260], r: 34 }, { at: [470, -860, 220], r: 28 }, { at: [240, -560, 520], r: 18 }, { at: [-250, -520, 540], r: 22 },
  { at: [20, -880, 280], r: 22 }, { at: [-590, -690, 120], r: 24 }, { at: [600, -720, 80], r: 20 },
];
