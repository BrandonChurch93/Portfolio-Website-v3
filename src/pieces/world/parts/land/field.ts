// The land's own shape: the dunes, and the broken ground along the land's front edge. Its make script
// (scripts/world/parts/land/make.mjs) builds the mesh from these functions, and its shader works the slopes out per
// pixel from the same numbers (GLSL below), so a crest is as sharp at three times zoom as it is in the mesh. It
// imports nothing, so node reads it as it is.

// The maps the land is drawn with (land-a.png, land-light.png) cover x and z from lo to lo + size, in units.
export const MAP = { lo: -664, size: 1328 } as const;

// The way the wind that laid the dunes blows: to the left and toward the visitor, straight away from the moon but
// for a turn toward the visitor. A slip face stays in the moon's shadow while the wind is within about 50 degrees
// of straight away from the moon, so each dune is turned within that, and the great ones in front are turned to
// open their hollows to the visitor, as his dunes (shots/world/ref/dunes-he-likes.png) and picture 9's do.
export const WIND = [-0.951, 0.31] as const;

// A dune's profile: the slope of its slip face (the angle sand rests at) and how round the toe of its slip face
// is, as a share of the crest's height over it.
export const PROFILE = { slip: 0.66, toe: 0.16 } as const;
// The desert is a field with a hierarchy, not one dune many times: a great compound dune in front, its hollow open
// to the visitor and smaller dunes riding its back; dunes three times apart in size, unevenly spaced, each turned
// its own way; crests that run long and curve, and link where one dune's horn runs into the next one's flank; and
// open lit floor between them for each hollow and each long shadow to lie on. Through the middle it stays low, a
// pass through which the line of trees at the back is seen (ROW in the layout), with tall dunes each side of it.
// Each dune: where the middle of its crest is (x, z), its half width across the wind, how tall it is at the middle
// of its crest, how far downwind its horns trail as a share of its half width, how far it is turned from WIND in
// degrees (toward the visitor is under 0), how it leans (-1 to 1: one horn longer and the crest higher toward it),
// how flat its crest is along its length (2 is a crest that falls evenly to its horns, more holds it high and drops
// it late), how long its back is against its height, and whether it rides the dunes under it (1 or more: its height is
// laid on theirs, as a smaller dune on a great one's back, and its slip face is so many times as steep, so that laid
// on a back that climbs toward it the slip face stands at the angle sand rests at and is in the moon's shadow) or
// stands alone (0), and where along its wander its crest starts (wave, in radians).
export type Dune = readonly [x: number, z: number, wide: number, tall: number, horn: number, turn: number, lean: number, flat: number, back: number, ride: number, wave: number];
// Tallest first: the shader passes over a dune that cannot stand over the tallest found so far, and the riders last.
export const DUNES: readonly Dune[] = [
  // The pale dune behind the line of trees, its lit back to the visitor and its slip face turned away.
  [490, -350, 120, 56, 0.45, 38, 0.15, 2.5, 2.5, 0, 19.4],
  // At the right edge, tall, and a second behind it.
  [590, 120, 80, 46, 0.6, 8, 0.3, 2.3, 2.5, 0, 9.9],
  // The great dune, in front of the pass: its long crest climbs from its front horn to a peak and falls away behind,
  // one flank lit and one in shade, and two smaller dunes ride its lit back (the last two).
  [450, 330, 125, 42.5, 0.55, 3, -0.5, 2.4, 2.5, 0, 0.4],
  [628, -120, 62, 40, 0.65, 0, 0.2, 2.2, 2.5, 0, 11.8],
  // At the front left, and behind it at the left, lower than the floors of the towers behind them.
  [340, 430, 70, 34, 0.7, 20, 0.2, 2.2, 2.5, 0, 6.1],
  [360, 200, 70, 27, 0.75, 5, -0.2, 2.2, 2.5, 0, 8.0],
  // Small ones on the floor of the pass, as tall as the pass lets them be.
  [455, 160, 45, 19, 0.9, -8, 0.3, 2, 2.6, 0, 13.7],
  [522, 40, 35, 13, 1.0, 6, -0.2, 2, 2.6, 0, 15.6],
  [438, 18, 30, 12, 1.1, -4, 0.2, 2, 2.6, 0, 17.5],
  [508, 350, 36, 17, 0.9, -6, 0.2, 2, 2.6, 1.7, 2.3],
  [500, 278, 28, 12, 1.0, 4, -0.2, 2, 2.6, 1.7, 4.2],
];
// How each crest wanders: a wave along it, as a share of its half width, how many times it crosses it, and a second,
// longer wave, so a crest is sinuous and not a bent wire. A crest runs nearly away from the visitor and is seen end on:
// a short wave on it (it had one of eight crossings) was drawn as a saw along the brink.
export const WANDER = [0.06, 3.4, 0.05, 1.7] as const;
// How many places along a crest its nearest point is first looked for among, before it is found exactly.
export const SEEK = 13;

export interface Crest { at: [number, number]; wind: [number, number]; wide: number; tall: number; horn: number; lean: number; phase: number; reach: number; flat: number; back: number; ride: number }
export function crests(): Crest[] {
  return DUNES.map(([x, z, wide, tall, horn, turn, lean, flat, back, ride, wave]) => {
    const a = (turn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return { at: [x, z], wind: [WIND[0] * c - WIND[1] * s, WIND[0] * s + WIND[1] * c], wide, tall, horn, lean, phase: wave, reach: Math.hypot(wide * 1.05, Math.max(wide * horn * 1.3 + tall / PROFILE.slip, back * tall)) + 4 + PROFILE.toe * tall, flat, back, ride };
  });
}
// The crest at u (-1 to 1 across the dune): how far downwind it lies, the first and second rates of that with u,
// and how tall it is: (1 - |u|^flat)², held high along the middle and falling to each horn.
export function crestAt(cr: Crest, u: number): [number, number, number, number] {
  const au = Math.abs(u), sg = u < 0 ? -1 : 1, W = cr.wide, k = cr.horn * W, L = 0.3 * cr.lean, tilt = 1 + L * u;
  const ph = WANDER[1] * u + cr.phase, kw = WANDER[0] * W, ph2 = WANDER[3] * u + 2.3 * cr.phase, kw2 = WANDER[2] * W;
  const p06 = au ** 0.6, p16 = p06 * au, p26 = p16 * au;
  const g = 0.35 * u * u + 0.65 * p26, g1 = 0.7 * u + 1.69 * sg * p16, g2 = 0.7 + 2.704 * p06;
  const d = k * g * tilt + kw * Math.sin(ph) + kw2 * Math.sin(ph2);
  const d1 = k * (g1 * tilt + L * g) + kw * WANDER[1] * Math.cos(ph) + kw2 * WANDER[3] * Math.cos(ph2);
  const d2 = k * (g2 * tilt + 2 * L * g1) - kw * WANDER[1] * WANDER[1] * Math.sin(ph) - kw2 * WANDER[3] * WANDER[3] * Math.sin(ph2);
  const f = Math.max(0, 1 - au ** cr.flat);
  const h = cr.tall * f * f * (1 + 0.2 * cr.lean * u);
  return [d, d1, d2, h];
}
// How steep the slip face is under a crest so tall: at the angle sand rests at under a crest of any height, and
// gentler under the last low reach of a horn, where a slip face a fraction of a unit high was seen edge on as a row
// of dark specks.
export const slipUnder = (h: number): number => { const t = Math.min(1, Math.max(0, (h - 0.5) / 2)); return PROFILE.slip * (0.35 + 0.65 * t * t * (3 - 2 * t)); };
// A back's height at t, 0 at the brink to 1 at its foot, as a share of the crest's: a broad convex shoulder that
// leaves the brink gently, is steepest a little short of half way down, where it faces the moon most squarely, and
// meets the sand round it level.
export const SHOULDER = 1.6;
export const backOf = (t: number): number => (1 - t) * (1 - t) * (1 + SHOULDER * t);
// How far either side of the crest's line a place is eased from the back to the slip face, in units.
const EASE = 0.08;
// What one point of the crest, u, makes of a place on the side of the crest k says (1 downwind, 0 upwind): downwind,
// sand resting at its angle from it; upwind, a back falling from it. (the height, how far off it in units, and how
// far down a back as a share).
function fromCrest(cr: Crest, A: number, D: number, u: number, k: number): [number, number, number] {
  const [d, , , h] = crestAt(cr, u), r = Math.hypot(A - u * cr.wide, D - d);
  const t = r / (cr.back * Math.max(h, 1e-3)), back = t < 1 ? h * backOf(t) : 0, slip = h - slipUnder(h) * Math.max(1, cr.ride) * r;
  return [back + (slip - back) * k, r, t];
}
// One dune's height at a place: the most that any point of its crest makes of it, so the sand under a crest that
// falls toward a horn is held up by the higher crest along from it, and inside a crescent's hollow the two sides
// meet in a crease. Which side of the crest the place is on is read square to the crest's own line, so a hollow is
// slip face throughout. Found first among a few points along the crest and then closely about the best. (Taken from
// the nearest point alone, the height jumped wherever the nearest point jumped, as across a crescent's hollow, which
// showed as a band of grain down the slip face.) Downwind its toe is rounded into the sand round it.
// Which side of its crest a place is, as its distance from the crest, over 0 downwind (on the slip face): from the
// crest's nearest point, found from the point straight across the dune by NEAR steps. (From the point straight across
// alone, a place inside a crescent's hollow, where the crest bends downwind toward a horn, was taken as on the back,
// and showed as a lit stripe along the slip face.)
const NEAR = 2;
export function sideOf(cr: Crest, A: number, D: number): number {
  const W = cr.wide;
  let u = Math.max(-1, Math.min(1, A / W));
  for (let it = 0; it < NEAR; it++) {
    const [d, d1, d2] = crestAt(cr, u), ex = u * W - A, ez = d - D;
    u = Math.max(-1, Math.min(1, u - (ex * W + ez * d1) / Math.max(W * W + d1 * d1 + ez * d2, 1e-6)));
  }
  const [d, d1] = crestAt(cr, u), ex = A - u * W, ez = D - d, side = ez * W - ex * d1;
  return (side > 0 ? 1 : -1) * Math.hypot(ex, ez);
}
// How many times the search about the best of the first look is narrowed.
const STEP = 2 / (SEEK - 1), GOLD = 0.381966, GOLDEN = 6;
export function duneAt(cr: Crest, x: number, z: number): [height: number, slip: number, u: number, down: number] {
  const rx = x - cr.at[0], rz = z - cr.at[1], [wx, wz] = cr.wind, A = -rx * wz + rz * wx, D = rx * wx + rz * wz;
  const w = Math.min(1, Math.max(0, (sideOf(cr, A, D) + EASE) / (2 * EASE))), k = w * w * (3 - 2 * w);
  let bu = -1, best = -Infinity;
  for (let j = 0; j < SEEK; j++) { const u = -1 + j * STEP, v = fromCrest(cr, A, D, u, k)[0]; if (v > best) { best = v; bu = u; } }
  let lo = Math.max(-1, bu - STEP), hi = Math.min(1, bu + STEP), m1 = hi - GOLD * (hi - lo), m2 = lo + GOLD * (hi - lo);
  let f1 = fromCrest(cr, A, D, m1, k)[0], f2 = fromCrest(cr, A, D, m2, k)[0];
  for (let it = 0; it < GOLDEN; it++) {
    if (f1 > f2) { lo = m2; m2 = m1; f2 = f1; m1 = hi - GOLD * (hi - lo); f1 = fromCrest(cr, A, D, m1, k)[0]; }
    else { hi = m1; m1 = m2; f1 = f2; m2 = lo + GOLD * (hi - lo); f2 = fromCrest(cr, A, D, m2, k)[0]; }
  }
  const u = f1 > f2 ? m1 : m2, [v, r, t] = fromCrest(cr, A, D, u, k), [, , , h] = crestAt(cr, u);
  const e = Math.max(v, best), toe = Math.max(0.2, PROFILE.toe * h), q = Math.max(toe - Math.abs(e), 0) / toe;
  return [Math.max(e, 0) + k * q * q * toe * 0.25, k, u, k > 0.5 ? r : t];
}
export const oneDune = (cr: Crest, x: number, z: number): number => duneAt(cr, x, z)[0];

// A slow swell under the dunes, so the sand between them rolls and is never level. It never dips under the sand's
// own floor, LIFT over the dome: the floor runs on level to the planet's shoulder, where a swell that dipped left a
// trough inside the rim and a curb along it.
const LIFT = 2.3;
export const swell = (x: number, z: number): number => LIFT + 0.5 * (3.2 * Math.sin(x * 0.017 + z * 0.011 + 1.3) * Math.sin(z * 0.021 - x * 0.007 + 0.4) + 1.3 * Math.sin(x * 0.043 - z * 0.029 + 2.1) * Math.sin(z * 0.047 + x * 0.015));
// Toward the land's edge a dune comes down to the floor, over this many units in from it, and the floor runs on to
// the edge, where it breaks off at the planet's shoulder.
export const ROLL = 30;
export const roll = (inside: number): number => { const t = Math.min(1, Math.max(0, inside / ROLL)); return t * t * (3 - 2 * t); };

// The bank the line of trees behind the dunes stands on (ROW in the layout): the back of a low dune, which rises
// toward the visitor's eye to the row and goes on rising behind it into the foot of the pale dune. Its height over the
// dome along the row is fromPicture(px, 244, -230) from the layout less the dome there, so each tree's foot is drawn
// where picture 9 has the row's, 244 down in its pixels: this curve in x (t is x less `mid`) to within a hundredth of a
// unit (the make checks it). Behind the row it rises on by `rise` a unit. In front it falls toward the visitor at
// `slope`, wandering along the row by `wobble`, after a brink rounded over `brink` units, steeply enough that nothing
// of it in front of the row is drawn higher than the row's feet, until it meets the floor in a soft hollow `foot`
// units wide. It fades in and out across x. (A shelf with a straight front edge, and the drop at once that kept the
// pass, read as a terrace.)
// Over `hold` (z, from behind to in front) the bank is the sand's whole height: no dune's foot or swell stands over it.
export const SHELF = { mid: 490, c: [16.198, 0.094753, 0.0000975741], row: -230, slope: 0.58, wobble: [0.1, 0.071, 0.06, 0.19], brink: 2.5, foot: 5, rise: 0.16, x: [370, 418, 582, 630], hold: [-285, -250, -165, -130] } as const;
const ease = (a: number, b: number, v: number): number => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
export const shelfAt = (x: number): number => { const t = x - SHELF.mid; return SHELF.c[0] + SHELF.c[1] * t + SHELF.c[2] * t * t; };
const across = (x: number): number => ease(SHELF.x[0], SHELF.x[1], x) * (1 - ease(SHELF.x[2], SHELF.x[3], x));
export function shelf(x: number, z: number): number {
  const k = across(x);
  if (k <= 0) return 0;
  const dz = z - SHELF.row, W = SHELF.wobble, s = SHELF.slope * (1 + W[0] * Math.sin(x * W[1] + 0.6) + W[2] * Math.sin(x * W[3] + 2.1)), B = SHELF.brink;
  const drop = dz <= 0 ? -SHELF.rise * dz : dz < B ? (-s * dz * dz) / (2 * B) : -s * (dz - B / 2);
  return k * Math.max(0, shelfAt(x) + drop);
}
// The larger of two heights, joined in a soft hollow k wide where they meet.
const smax = (a: number, b: number, k: number): number => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };
const held = (x: number, z: number): number => across(x) * ease(SHELF.hold[0], SHELF.hold[1], z) * (1 - ease(SHELF.hold[2], SHELF.hold[3], z));

let made: Crest[] | null = null;
// The desert's relief over the dome at a place, so far inside the land's edge, before the desert's own mask is laid
// on it: the tallest of the dunes that stand alone, with the dunes that ride them laid on it, and the shelf.
export function relief(x: number, z: number, inside = 1e9): number {
  made ??= crests();
  let up = 0, on = 0;
  for (const cr of made) {
    if ((x - cr.at[0]) ** 2 + (z - cr.at[1]) ** 2 > cr.reach * cr.reach) continue;
    const h = oneDune(cr, x, z);
    if (cr.ride > 0.5) on += h; else up = Math.max(up, h);
  }
  const rest = up + on + swell(x, z), sh = shelf(x, z), w = held(x, z);
  const v = smax(rest, sh, SHELF.foot) + (sh - smax(rest, sh, SHELF.foot)) * w, floor = swell(x, z);
  return floor + (v - floor) * roll(inside);
}

// The sand's height over the dome on a grid over the desert, worked out once on the graphics card when the land is
// built (heights in land.ts) and read by the ray to the moon, which crosses many dunes: where the grid lies (x,
// z), how far it reaches, how many texels it has each way, and the most the sand stands over the dome.
export const HEIGHT = { lo: [236, -484], size: [430, 1024], texels: [512, 1216], most: 64 } as const;

// The crests as a float texture for the shader, a row for each dune: (x, z, wind), (wide, tall, horn, lean),
// (phase, reach, flat, ride), (back, 0, 0, 0).
export const ROW = 4;
export function crestTexels(): Float32Array {
  const cs = crests(), data = new Float32Array(cs.length * ROW * 4);
  cs.forEach((cr, d) => data.set([...cr.at, ...cr.wind, cr.wide, cr.tall, cr.horn, cr.lean, cr.phase, cr.reach, cr.flat, cr.ride, cr.back, 0, 0, 0], d * ROW * 4));
  return data;
}

// ---------------------------------------------------------------------------------------------------------------
// The broken front. Near the land's edge its ground is cut into slabs, each dropped and tipped toward the edge by
// more the nearer the edge it lies, as ground at a break is: how large a slab is, how far in from the edge the break
// reaches, how far the slabs at the very edge drop and how steeply they tip, and how wide a crack between two is.
export const BREAK = { cell: 8, reach: 30, drop: 1.2, tip: 0.08, crack: 0.22 } as const;

// A whole number hash, the same in the shader: 0 to 1.
export function hash2(i: number, j: number, s: number): number {
  let h = (Math.imul((i + 4096) >>> 0, 0x27d4eb2d) ^ Math.imul((j + 4096) >>> 0, 0x165667b1) ^ Math.imul(s >>> 0, 0x3c6ef372)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  return h / 4294967296;
}
// The slab a place lies on: its middle, its two numbers of its own, and how far the place is inside its edge.
export function slabOf(x: number, z: number): { cx: number; cz: number; a: number; b: number; edge: number } {
  const C = BREAK.cell, gi = Math.floor(x / C), gj = Math.floor(z / C);
  let d1 = Infinity, c1x = 0, c1z = 0, a = 0, b = 0;
  const pts: [number, number][] = [];
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const qx = (gi + i + 0.15 + 0.7 * hash2(gi + i, gj + j, 1)) * C, qz = (gj + j + 0.15 + 0.7 * hash2(gi + i, gj + j, 2)) * C;
    pts.push([qx, qz]);
    const d = (x - qx) ** 2 + (z - qz) ** 2;
    if (d < d1) { d1 = d; c1x = qx; c1z = qz; a = hash2(gi + i, gj + j, 3); b = hash2(gi + i, gj + j, 4); }
  }
  let edge = Infinity;
  for (const [qx, qz] of pts) {
    const ex = qx - c1x, ez = qz - c1z, l = Math.hypot(ex, ez);
    if (l < 1e-6) continue;
    edge = Math.min(edge, ((c1x + qx) / 2 - x) * (ex / l) + ((c1z + qz) / 2 - z) * (ez / l));
  }
  return { cx: c1x, cz: c1z, a, b, edge };
}
// How broken the ground is at a slab's middle, 0 to 1, from how far inside the land's edge it is.
export const broken = (inside: number): number => Math.max(0, 1 - inside / BREAK.reach) ** 1.6;

// ---------------------------------------------------------------------------------------------------------------
// The same in the shader. uCrest is crestTexels() as an RGBA float texture, ROW wide and a row a dune.
export const GLSL = /* glsl */ `
uniform sampler2D uCrest;
float landWhich, landMargin, landSd, landBrink;
const vec2 WIND = vec2(${WIND[0].toFixed(4)}, ${WIND[1].toFixed(4)});
const float SLIP = ${PROFILE.slip.toFixed(4)}, TOE = ${PROFILE.toe.toFixed(4)};
float landBack(float t) { return (1.0 - t) * (1.0 - t) * (1.0 + ${SHOULDER.toFixed(4)} * t); }
// The crest at u: (how far downwind, its first and second rates with u, how tall).
vec4 landCrest(vec4 b, vec4 c, float u) {
	float au = abs(u), sg = u < 0.0 ? -1.0 : 1.0, W = b.x, k = b.z * W, L = 0.3 * b.w, tilt = 1.0 + L * u;
	float ph = ${WANDER[1].toFixed(4)} * u + c.x, kw = ${WANDER[0].toFixed(4)} * W, ph2 = ${WANDER[3].toFixed(4)} * u + 2.3 * c.x, kw2 = ${WANDER[2].toFixed(4)} * W;
	float p06 = pow(au, 0.6), p16 = p06 * au, p26 = p16 * au;
	float g = 0.35 * u * u + 0.65 * p26, g1 = 0.7 * u + 1.69 * sg * p16, g2 = 0.7 + 2.704 * p06;
	float f = max(0.0, 1.0 - pow(au, c.z));
	return vec4(
		k * g * tilt + kw * sin(ph) + kw2 * sin(ph2),
		k * (g1 * tilt + L * g) + kw * ${WANDER[1].toFixed(4)} * cos(ph) + kw2 * ${WANDER[3].toFixed(4)} * cos(ph2),
		k * (g2 * tilt + 2.0 * L * g1) - kw * ${(WANDER[1] * WANDER[1]).toFixed(4)} * sin(ph) - kw2 * ${(WANDER[3] * WANDER[3]).toFixed(4)} * sin(ph2),
		b.y * f * f * (1.0 + 0.2 * b.w * u));
}
// What one point of the crest, u, makes of q (across, downwind) on the side k says, as fromCrest() has it: (the
// height, how far off it, how far down a back as a share).
vec3 landFromCrest(vec4 b, vec4 c, float BK, vec2 q, float u, float k) {
	vec4 l = landCrest(b, c, u);
	float r = length(q - vec2(u * b.x, l.x));
	float t = r / (BK * max(l.w, 1e-3)), back = t < 1.0 ? l.w * landBack(t) : 0.0;
	float slip = l.w - SLIP * (0.35 + 0.65 * smoothstep(0.5, 2.5, l.w)) * max(c.w, 1.0) * r;
	return vec3(mix(back, slip, k), r, t);
}
// One dune at p, as duneAt() has it: (its height, which side of the crest the place is, 1 on the slip face, the point
// of the crest that makes it, -1 to 1, and on the slip face how far down it from the crest the place is in units, on
// the back how far down it as a share of its length).
vec4 landDuneAt(vec2 p, int d) {
	vec4 a = texelFetch(uCrest, ivec2(0, d), 0), b = texelFetch(uCrest, ivec2(1, d), 0), c = texelFetch(uCrest, ivec2(2, d), 0);
	vec2 r = p - a.xy;
	landSd = 1e3;
	if (dot(r, r) > c.y * c.y) return vec4(0.0, 0.0, 0.0, 1e3);
	vec2 q = vec2(-r.x * a.w + r.y * a.z, r.x * a.z + r.y * a.w);
	float BK = texelFetch(uCrest, ivec2(3, d), 0).x, bu = -1.0, best = -1e20;
	float un = clamp(q.x / b.x, -1.0, 1.0);
	for (int it = 0; it < ${NEAR}; it++) {
		vec4 l = landCrest(b, c, un);
		float ex = un * b.x - q.x, ez = l.x - q.y;
		un = clamp(un - (ex * b.x + ez * l.y) / max(b.x * b.x + l.y * l.y + ez * l.z, 1e-6), -1.0, 1.0);
	}
	vec4 lc = landCrest(b, c, un);
	vec2 off = vec2(q.x - un * b.x, q.y - lc.x);
	landSd = (off.y * b.x - off.x * lc.y > 0.0 ? 1.0 : -1.0) * length(off);
	float k = smoothstep(${(-EASE).toFixed(2)}, ${EASE.toFixed(2)}, landSd);
	for (int j = 0; j < ${SEEK}; j++) { float u = -1.0 + float(j) * ${STEP.toFixed(6)}; float v = landFromCrest(b, c, BK, q, u, k).x; if (v > best) { best = v; bu = u; } }
	float lo = max(-1.0, bu - ${STEP.toFixed(6)}), hi = min(1.0, bu + ${STEP.toFixed(6)});
	float m1 = hi - ${GOLD.toFixed(6)} * (hi - lo), m2 = lo + ${GOLD.toFixed(6)} * (hi - lo);
	float f1 = landFromCrest(b, c, BK, q, m1, k).x, f2 = landFromCrest(b, c, BK, q, m2, k).x;
	for (int it = 0; it < ${GOLDEN}; it++) {
		if (f1 > f2) { lo = m2; m2 = m1; f2 = f1; m1 = hi - ${GOLD.toFixed(6)} * (hi - lo); f1 = landFromCrest(b, c, BK, q, m1, k).x; }
		else { hi = m1; m1 = m2; f1 = f2; m2 = lo + ${GOLD.toFixed(6)} * (hi - lo); f2 = landFromCrest(b, c, BK, q, m2, k).x; }
	}
	float u = f1 > f2 ? m1 : m2;
	vec3 v = landFromCrest(b, c, BK, q, u, k);
	float h = landCrest(b, c, u).w, e = max(v.x, best), toe = max(0.2, TOE * h), w = max(toe - abs(e), 0.0) / toe;
	return vec4(max(e, 0.0) + k * w * w * toe * 0.25, k, u, k > 0.5 ? v.y : v.z);
}
float landSwell(vec2 p) { return ${LIFT.toFixed(2)} + 0.5 * (3.2 * sin(p.x * 0.017 + p.y * 0.011 + 1.3) * sin(p.y * 0.021 - p.x * 0.007 + 0.4) + 1.3 * sin(p.x * 0.043 - p.y * 0.029 + 2.1) * sin(p.y * 0.047 + p.x * 0.015)); }
float landRoll(float inside) { return smoothstep(0.0, ${ROLL.toFixed(1)}, inside); }
float landAcross(float x) { return smoothstep(${SHELF.x[0].toFixed(1)}, ${SHELF.x[1].toFixed(1)}, x) * (1.0 - smoothstep(${SHELF.x[2].toFixed(1)}, ${SHELF.x[3].toFixed(1)}, x)); }
float landHeld(vec2 p) { return landAcross(p.x) * smoothstep(${SHELF.hold[0].toFixed(1)}, ${SHELF.hold[1].toFixed(1)}, p.y) * (1.0 - smoothstep(${SHELF.hold[2].toFixed(1)}, ${SHELF.hold[3].toFixed(1)}, p.y)); }
float landShelf(vec2 p) {
	float k = landAcross(p.x), dz = p.y - ${SHELF.row.toFixed(1)}, t = p.x - ${SHELF.mid.toFixed(1)}, B = ${SHELF.brink.toFixed(2)};
	float s = ${SHELF.slope.toFixed(3)} * (1.0 + ${SHELF.wobble[0].toFixed(3)} * sin(p.x * ${SHELF.wobble[1].toFixed(4)} + 0.6) + ${SHELF.wobble[2].toFixed(3)} * sin(p.x * ${SHELF.wobble[3].toFixed(4)} + 2.1));
	float drop = dz <= 0.0 ? -${SHELF.rise.toFixed(3)} * dz : (dz < B ? -s * dz * dz / (2.0 * B) : -s * (dz - 0.5 * B));
	return k * max(0.0, ${SHELF.c[0].toFixed(5)} + ${SHELF.c[1].toFixed(6)} * t + ${SHELF.c[2].toExponential(7)} * t * t + drop);
}
float landSmax(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return max(a, b) + h * h * k * 0.25; }
// The relief at p, and of the dune that makes its surface: which side, the point of its crest, how far down its slip
// face, and which dune it is. A dune that rides another makes the surface wherever it stands a unit or more.
// And how far the dune that makes it stands over the next tallest there: where two dunes meet the surface is a
// crease, and what is cut into one of them fades out toward it.
vec4 landInfo;
float landRelief(vec2 p, float inside) {
	float up = 0.0, on = 0.0, best = 0.0, next = 0.0;
	landInfo = vec4(0.0, 0.0, 0.0, 1e3);
	landWhich = -1.0;
	landBrink = 1e3;
	float riderBrink = 1e3;
	vec4 rider = vec4(0.0, 0.0, 0.0, 1e3);
	float riderWhich = -1.0;
	for (int d = 0; d < ${DUNES.length}; d++) {
		vec4 bb = texelFetch(uCrest, ivec2(1, d), 0);
		if (texelFetch(uCrest, ivec2(2, d), 0).w < 0.5 && bb.y * (1.0 + 0.2 * abs(bb.w)) + 1.0 < up - 1.5) continue;
		vec4 h = landDuneAt(p, d);
		if (texelFetch(uCrest, ivec2(2, d), 0).w > 0.5) { on += h.x; if (h.x > best) { best = h.x; rider = h; riderWhich = float(d); riderBrink = landSd; } }
		else if (h.x > up) { next = up; up = h.x; landInfo = h; landWhich = float(d); landBrink = landSd; }
		else next = max(next, h.x);
	}
	landMargin = up - next;
	if (best > 1.0) { landInfo = rider; landWhich = riderWhich; landBrink = riderBrink; }
	float rest = up + on + landSwell(p), sh = landShelf(p), w = landHeld(p);
	float floor_ = landSwell(p);
	float v = landSmax(rest, sh, ${SHELF.foot.toFixed(1)});
	// Where the bank stands over the dune, the dune does not make the surface, and nothing of its slip face is cut in it.
	landInfo.y *= 1.0 - max(w, smoothstep(0.3, 1.5, sh - rest));
	return mix(floor_, mix(v, sh, w), landRoll(inside));
}
float landHash(int i, int j, uint s) {
	uint h = (uint(i + 4096) * 0x27d4eb2du) ^ (uint(j + 4096) * 0x165667b1u) ^ (s * 0x3c6ef372u);
	h = (h ^ (h >> 15u)) * 0x2c1b3c6du;
	h = (h ^ (h >> 12u)) * 0x297a2d39u;
	h = h ^ (h >> 15u);
	return float(h) / 4294967296.0;
}
// The slab a place lies on: (its middle, its two numbers), and how far inside its edge the place is.
vec4 landSlab(vec2 p, out vec2 own, out float edge) {
	const float C = ${BREAK.cell.toFixed(1)};
	ivec2 g = ivec2(floor(p / C));
	vec2 pts[9];
	float d1 = 1e20;
	vec4 best = vec4(0.0);
	for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
		ivec2 h = g + ivec2(i, j);
		vec2 q = (vec2(h) + 0.15 + 0.7 * vec2(landHash(h.x, h.y, 1u), landHash(h.x, h.y, 2u))) * C;
		pts[(j + 1) * 3 + i + 1] = q;
		float d = dot(p - q, p - q);
		if (d < d1) { d1 = d; best = vec4(q, landHash(h.x, h.y, 3u), landHash(h.x, h.y, 4u)); }
	}
	edge = 1e20;
	for (int k = 0; k < 9; k++) {
		vec2 e = pts[k] - best.xy;
		float l = length(e);
		if (l < 1e-6) continue;
		edge = min(edge, dot((best.xy + pts[k]) * 0.5 - p, e / l));
	}
	own = best.zw;
	return best;
}
`;
