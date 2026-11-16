// The hero's world, built to picture 9: its plan. Where everything is, how big it is and how it is seen.
// Picture 9 is recreated, shape and look (his ruling of Nov 15, 21:38: BRIEF.md, Settled, Hero, "Picture 9 is
// recreated, not our version of it"). The numbers began as the study's (src/hero-blockout/plan.ts), which is a
// rough guide to units and names and nothing more: wherever the study and the picture differ the picture wins, and
// every number here that says where a thing is has been checked against the picture with npm run match. PICTURE
// below ties the two together: a place in the picture, in its own pixels, to a place in the world.
//
// Units are the page's: one is a CSS pixel on a board 1460 wide. The origin is the top of the planet, at the
// spire's foot. x to the visitor's right, y up, z toward the visitor.
//
// This file imports nothing, so the scripts under scripts/world/ can read it as it is.

export const D2R = Math.PI / 180;
// A unit in the stage's own measure, as the desk and the pad have it.
export const SCALE = 0.001;

// The planet: a nearly flat top, the top of a far larger sphere, over a bowl (full is how square its outline is:
// 2 is an ellipse). Picture 9's outline is an ellipse: laid over the picture, its left side passes 150 across at
// 500 down and 220 at 600, and its right side 1245 at 500, 1165 at 600 and 1050 at 690, as the picture's do.
export const WORLD = { half: 660, top: 5200, deep: 573, full: 2 } as const;
export const RIM = WORLD.top - Math.sqrt(WORLD.top ** 2 - WORLD.half ** 2);
export const dome = (x: number, z: number): number => Math.sqrt(Math.max(1, WORLD.top ** 2 - x * x - z * z)) - WORLD.top;
// How far out of the planet's body a place is: 1 on its outer surface, under 1 inside it.
export function shell(x: number, y: number, z: number): number {
  const r = Math.hypot(x, z) / WORLD.half, d = Math.max(0, -(y + RIM)) / WORLD.deep;
  return (r ** WORLD.full + d ** WORLD.full) ** (1 / WORLD.full);
}
// A place on the planet's outer surface: so far round from straight toward the visitor (to the visitor's right is
// over 0), and so far down from the rim, 0 to 1.
export function skinAt(th: number, t: number): [number, number, number] {
  const r = WORLD.half * (1 - t ** WORLD.full) ** (1 / WORLD.full);
  return [r * Math.sin(th), -RIM - WORLD.deep * t, r * Math.cos(th)];
}

// The core: a ball of the stream's light hanging free in the hollow, on the hero's center line. Picture 9 has its
// middle at 688 across and 437 down, 90 of its pixels in radius, hanging just under the roof's front edge.
export const CORE = { at: [0, -202, 150] as const, r: 100 } as const;
// Where the stream leaves it: the foot of the ball.
export const SOURCE = [CORE.at[0], CORE.at[1] - CORE.r, CORE.at[2]] as const;
// How bright the core burns at a time, about 1: a slow breath, which every part is handed.
export const coreLevel = (t: number): number => 1 + 0.035 * Math.sin(t * 0.52) + 0.02 * Math.sin(t * 1.31 + 1.7);

// The spire: the tallest thing by far, on the center line, with one thin ring near its top, tilted as Saturn's is.
export const SPIRE = { tall: 260, foot: 38, ring: { r: 54, thick: 2.4, up: 0.68, tilt: [9, 17] as const } } as const;
// The open court round the spire's foot.
export const COURT = 56;
// The pyramid: at the front left, in front of the towers, on a square court of its own. Polished gold. turn is how
// far it is turned, in degrees, so that a corner is toward the visitor.
// Fitted to picture 9's four seen points together (the apex, the front corner, the right corner, and the left
// outline where it shows above the trees): its left corner, which the picture hides behind crowns, was 15 pixels
// too far right, and its dark face too narrow for it.
export const PYRAMID = { x: -351.4, z: 357, base: 180.8, tall: 108.9, court: 93, turn: 53.2 } as const;
// A place on the map, as the pyramid has it: across and along its own sides, from its middle.
export function pyramidal(x: number, z: number): [number, number] {
  const c = Math.cos(PYRAMID.turn * D2R), k = Math.sin(PYRAMID.turn * D2R), rx = x - PYRAMID.x, rz = z - PYRAMID.z;
  return [rx * c - rz * k, rx * k + rz * c];
}

// How it is looked at: from straight in front and from above by so many degrees, from far off. It never moves.
export const VIEW = { el: 6, back: 9000 } as const;
// Its host on the page: this wide whatever the screen, this tall, with its top this far over the spire's tip.
export const HOST = { wide: 1460, tall: 1520, over: 80 } as const;

// The moon: the one light that shapes the world, fixed. It is the moon in the page's own sky, at the visitor's
// upper right and behind the world, as picture 9 is lit: the land and the roof shade the hollow from it, so the
// hollow is the core's alone, the rock's front faces are dark, the cratered right side and the dunes' backs are
// lit, and the pyramid's right face catches it. In front of the world it lit the whole hollow grey.
// It stands low, about 22 degrees over the world's right shoulder (it was 27): low enough that a dune, a crater's
// rim or a tower throws a shadow two and a half times as long as it is tall, which is what shows a thing's height.
export const MOONWARD = [0.86, 0.36, -0.28] as const;

// Where a point is drawn in the host: how far to the right of its center line, and how far down from its top.
export function drawn(x: number, y: number, z: number): [number, number] {
  const e = VIEW.el * D2R, se = Math.sin(e), ce = Math.cos(e), dy = y - (SPIRE.tall - (HOST.tall / 2 - HOST.over) / ce);
  const k = VIEW.back / (VIEW.back - dy * se - z * ce);
  return [x * k, HOST.tall / 2 - (dy * ce - z * se) * k];
}

const hash = (x: number, y: number, z: number, s: number): number => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683) ^ Math.imul(s, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const ease = (t: number): number => t * t * (3 - 2 * t);
export const ramp = (a: number, b: number, x: number): number => ease(Math.min(1, Math.max(0, (x - a) / (b - a))));
// Smooth noise, 0 to 1. The plan's own: what is torn away is described with it, so it may not be changed.
export function noise(x: number, y: number, z: number, s = 0): number {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = ease(x - i), v = ease(y - j), w = ease(z - k);
  const a = hash(i, j, k, s) * (1 - u) + hash(i + 1, j, k, s) * u, b = hash(i, j + 1, k, s) * (1 - u) + hash(i + 1, j + 1, k, s) * u;
  const c = hash(i, j, k + 1, s) * (1 - u) + hash(i + 1, j, k + 1, s) * u, d = hash(i, j + 1, k + 1, s) * (1 - u) + hash(i + 1, j + 1, k + 1, s) * u;
  return (a * (1 - v) + b * v) * (1 - w) + (c * (1 - v) + d * v) * w;
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

// ---------------------------------------------------------------------------------------------------------------
// Picture 9, which the world is a recreation of: reference/concept/09-parts/09-the-whole-picture-at-1376.jpg, 1376
// by 768. A place in the picture is tied to a place in the world by the planet and the spire: the planet's left
// rim is at 95 across and its right at 1280, and the tip of the spire's needle is at 11 down. unit is how many of the world's
// units one of the picture's pixels is.
export const PICTURE = { file: 'reference/concept/09-parts/09-the-whole-picture-at-1376.jpg', wide: 1376, tall: 768, mid: 687.5, tip: 11, unit: 1.119 } as const;
const TIP = drawn(0, SPIRE.tall, 0)[1];
// Where a point of the world is in the picture, in the picture's pixels.
export function pictured(x: number, y: number, z: number): [number, number] {
  const [across, down] = drawn(x, y, z);
  return [PICTURE.mid + across / PICTURE.unit, PICTURE.tip + (down - TIP) / PICTURE.unit];
}
// The point of the world that is seen at a place in the picture, so far toward the visitor (its z). This is how a
// thing is put where the picture has it: read its place off the picture, choose how deep it is, and build it there.
export function fromPicture(px: number, py: number, z: number): [number, number, number] {
  const e = VIEW.el * D2R, se = Math.sin(e), ce = Math.cos(e), B = VIEW.back;
  const across = (px - PICTURE.mid) * PICTURE.unit, u = HOST.tall / 2 - (TIP + (py - PICTURE.tip) * PICTURE.unit);
  const dy = (u * (B - z * ce) + B * z * se) / (B * ce + u * se), k = B / (B - dy * se - z * ce);
  return [across / k, dy + SPIRE.tall - (HOST.tall / 2 - HOST.over) / ce, z];
}

// The desert: how much of it a place on the map is, 0 to 1. The right end of the top only.
export const DESERT = { at: [530, 240] as const, r: [285, 440] as const } as const;
function sands(x: number, z: number): number {
  return 1 - Math.hypot((x - DESERT.at[0]) / DESERT.r[0], (z - DESERT.at[1]) / DESERT.r[1]) + 0.12 * (noise(x / 110, 0, z / 110, 7) - 0.5);
}
export const desert = (x: number, z: number): number => ramp(0, 0.08, sands(x, z));

// Where the land ends. Round the planet it ends at the rim. At the front the tear has bitten deep into it: in
// picture 9 the land's front edge runs back from each side to just in front of the spire, so the core hangs under
// its very lip. LIP is that edge as read off the picture: how far toward the visitor the land reaches (z) at places
// across it (x). Outside the table the land reaches the rim.
export const LAND = { rim: 652 } as const;
export const LIP: readonly (readonly [number, number])[] = [
  [-300, 575], [-235, 481], [-167, 428], [-94, 348], [-40, 301], [1, 265], [57, 281], [121, 327], [184, 371], [238, 394], [290, 405], [345, 470], [400, 515],
];
export function lip(x: number): number {
  if (x <= LIP[0][0] || x >= LIP[LIP.length - 1][0]) return LAND.rim;
  let i = 1;
  while (LIP[i][0] < x) i++;
  const [x0, z0] = LIP[i - 1], [x1, z1] = LIP[i];
  return z0 + ((z1 - z0) * (x - x0)) / (x1 - x0);
}
// How far inside the land's edge a place on the map is: the land's edge is where this is 0.
export function within(x: number, z: number): number {
  return Math.min(LAND.rim - Math.hypot(x, z), lip(x) - z);
}

// The small streams: the core's light leaking from the torn rock's underside and falling. Where picture 9 has each
// (across and down, in its pixels, where it leaves the rock), how far toward the visitor that is, and how long it
// is in units. They are the stream's own light, drawn by the page as the stream is.
export const SMALL: readonly (readonly [number, number, number, number])[] = [
  [385, 640, 330, 110], [500, 570, 300, 190], [620, 580, 230, 170], [748, 550, 210, 180], [812, 508, 250, 210], [1010, 640, 330, 110],
];
// Each small stream's own place in the world, where it leaves the rock.
export const small = (): [number, number, number][] => SMALL.map(([px, py, z]) => fromPicture(px, py, z));
// What broke away hangs under the planet, down to the foot of the world's host: nothing of it is lower than this,
// which is what the page puts Work under.
export const DEBRIS = { low: -1190 } as const;

// ---------------------------------------------------------------------------------------------------------------
// The land.

// The dunes. Each has a low wide back to the wind, a sharp crest, and a steep hollow face away from the wind that
// falls into a hollow lower than the sand round it. Where each is, how far it reaches across the wind, how long its
// back is, how tall it is, and how far its wind is turned, in degrees.
const WIND = [-0.862, 0.507] as const, SLIP = 0.66, DIP = 0.42;
const DUNES: readonly (readonly [number, number, number, number, number, number])[] = [
  [380, 440, 92, 130, 30, 6], [468, 300, 100, 140, 34, -8], [545, 190, 86, 120, 28, 4], [588, 70, 74, 110, 24, -6], [425, 160, 70, 100, 22, 10], [335, 310, 64, 96, 20, -4], [520, -40, 66, 100, 20, 8],
];
export function dunes(x: number, z: number): number {
  let up = 0, down = 0;
  for (const [cx, cz, wid, len, tall, turn] of DUNES) {
    const ca = Math.cos(turn * D2R), sa = Math.sin(turn * D2R), wx = WIND[0] * ca - WIND[1] * sa, wz = WIND[0] * sa + WIND[1] * ca;
    const rx = x - cx, rz = z - cz, u = rx * wx + rz * wz, v = -rx * wz + rz * wx, side = v / wid;
    if (Math.abs(side) >= 1) continue;
    const env = (1 - side * side) ** 0.9, s = u - 0.62 * wid * side * side, top = tall * env;
    if (s <= 0) { const t = -s / (len * (0.45 + 0.55 * env)); if (t < 1) up = Math.max(up, top * (1 - t * t) ** 2); continue; }
    const foot = (top * (1 + DIP)) / SLIP;
    if (s < foot) { const h = top - SLIP * s; if (h > 0) up = Math.max(up, h); else down = Math.min(down, h); }
    else { const t = (s - foot) / (0.9 * wid * env + 1); if (t < 1) down = Math.min(down, -DIP * top * (1 - t) ** 2); }
  }
  return up + down + 5 * noise(x / 130, 1, z / 130, 9) - 2;
}
export const land = (x: number, z: number): number => desert(x, z) * dunes(x, z);
// How high the ground is at a place on the map.
export const ground = (x: number, z: number): number => dome(x, z) + land(x, z);
// Where the city's front is at a place across the top. Between it and the land's edge is a belt of trees.
export const front = (x: number): number => 322 - 0.00042 * x * x;

// ---------------------------------------------------------------------------------------------------------------
// The light. Two lights shape the world and neither moves, so what reaches each point from them is worked out
// ahead by scripts/world/ and stored with the meshes. The shaders (./light.ts) and the baker read the same numbers.
// A color is a name in the palette (src/config/palette.ts).
export const LIGHT = {
  // The moon: the irradiance on a face turned straight to it, and the angular radius of its disc, in degrees.
  // Stronger than it was at 27 degrees, by as much as level ground lost when it was lowered.
  moon: { color: 'pale', power: 3.2, spread: 0.7 },
  // The core: the irradiance at its own surface on a face turned to it. Further off it falls as (r / d) to the
  // power of fall. 2 is what a ball of light does in empty space. Lower carries its light further across the hollow.
  // At 24 every face near it came out a pale peach, where picture 9's hollow is a deep red brown: 16 keeps the
  // stone's own color in the light.
  // Measured in picture 9 itself: a slab 2.7 radii from the core is 0.57 as bright as the ring of faces beside it,
  // which is a fall of about 0.7 to 1, far gentler than a ball of light in empty space (2). Its light fills the
  // hollow, and what is dark there is dark because it is turned away or hidden, not because it is far. At 2.1 the
  // outer plates were a stop and a half too dark whatever way they were turned.
  core: { color: 'hot', power: 15, fall: 1 },
  // What comes from every direction that escapes the world: almost nothing.
  sky: { color: 'ember', power: 0.05 },
  // The most irradiance a stored bounce can hold.
  bounce: 8,
  // How much of its own color the stored bounce keeps (the rest is its grey), and how much it is lifted.
  bounced: [0.5, 1.7],
  // How strongly a thing reflects the night round it, and the share of that which falls on a matte face as light.
  // The night is made for metal to mirror: as light on rock it was a second moon with no shadows, which filled
  // every gap in the hollow with grey.
  night: 0.55,
  // On the torn rock that share is tinted warm (`warm`, red, green and blue): untinted it turned the masses round
  // the hollow grey. At 0.35 they were an even brown where picture 9's are black with a few lit edges, so the
  // black is left to the rock's own shape and this only keeps a dark from going dead: the masses beside the hollow
  // measured 0.026 at 0.15 against the picture's 0.009.
  fill: 0.08,
  // Less red than it was (1, 0.58, 0.36): on a red brown stone that tint made every dark rust, where picture 9's
  // darks are a nearly neutral brown.
  warm: [1, 0.82, 0.68],
  // The planet's stone under white light: the first of these palette colors eased toward the second, and how bright.
  // The baker lights the rock with it and the stone's material wears it.
  stone: { of: ['bronze', 'copper'], ease: 0.4, power: 0.85 },
  // The same share for what stands on top of the world, which the night lights in full: the city's faces toward
  // the visitor are turned from the moon, and are seen by the night's own light.
  top: 1,
} as const;
