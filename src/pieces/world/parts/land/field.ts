// The land's own shape: the dunes, and the broken ground along the land's front edge. Its make script
// (scripts/world/parts/land/make.mjs) builds the mesh from these functions, and its shader works the slopes out per
// pixel from the same numbers (GLSL below), so a crest is as sharp at three times zoom as it is in the mesh. It
// imports nothing, so node reads it as it is.

// The maps the land is drawn with (land-a.png, land-light.png) cover x and z from lo to lo + size, in units.
export const MAP = { lo: -664, size: 1328 } as const;

// The way the wind that laid the dunes blows: to the left and toward the visitor, straight away from the moon but
// for a turn toward the visitor. So each dune's long back is to the moon and lit, its slip face is turned from the
// moon and in full shadow, and the slip face is turned far enough toward the visitor to be seen. Turned any nearer
// the visitor a slip face would catch the moon, and the backs would turn from the visitor and be lost behind
// their crests.
export const WIND = [-0.99, 0.14] as const;

// A dune's profile: the slope of its slip face (the angle sand rests at), how long its back is against its height,
// and how round the toe of its slip face is, as a share of the dune's height. (One round for the whole dune: taken
// from the height of the crest over the place, it jumped where the part of the crest that holds the place changed.) At that length the back's
// steepest (backOf) is still under the angle sand rests at, and the brink stays a sharp break onto the slip face.
// He ruled the dunes taller twice (Nov 16, 01:15 and 02:00): "they need to be a lot taller". The tallest stand
// about 60 units, as tall as a mid sized building, and the dunes are few and great, each climbing the back of the
// next. A dune cannot be taller against its width than both its sides at the angle sand rests at allow, so it is
// made wider at the base, and the dunes overlap.
export const PROFILE = { slip: 0.66, back: 2.5, toe: 0.08 } as const;
// Each dune is a barchan: a crescent, its crest running roughly away from the visitor, its back to the moon at the
// right and its slip face to the left. Five great ones fill the desert, the first three where picture 9 has its great
// dark faces (about 1020 to 1080, 1100 to 1165 and 1195 to 1215 across), smaller ones between them, and the last the
// pale dune at the back, behind the line of trees, among the tallest of all.
// Each dune: where the middle of its crest is (x, z), its half width across the wind, how
// tall it is at the middle of its crest, how far downwind its horns trail as a share of its half width, how far it
// is turned from square to the wind in degrees, and how it leans (-1 to 1): one horn longer and the crest higher
// toward it.
export type Dune = readonly [x: number, z: number, wide: number, tall: number, horn: number, turn: number, lean: number];
// The row of trees behind them (ROW in the layout) is seen through a saddle between the great dune's massif at the
// left and the right front dune, and the pale dune behind the row stands where picture 9 has it (about 1078 to 1142
// across, its top 225 down), lower than the dunes in front: Fable ruled (Nov 16) that no dune is capped for the row.
export const DUNES: readonly Dune[] = [
  [350, 290, 140, 58, 1.1, 8, 0.3],
  [330, 60, 100, 36, 1.2, 0, -0.3],
  [590, 150, 110, 40, 1.2, 11, -0.2],
  [610, -40, 80, 28, 1.2, 0, 0.2],
  [360, -110, 90, 32, 1.2, 0, 0.25],
  [480, 250, 90, 26, 1.2, -4, 0],
  [492, -305, 80, 36, 0.5, 92, 0.1],
];
// The small crescents of the field, between, before and behind the great dunes, so the great ones have something to
// be great beside and the desert reads as a field of bowls on open sand, as picture 9's and his own picture do. Each
// is laid on whatever sand is under it.
export const RIDERS: readonly Dune[] = [
  [430, 410, 30, 9, 1.2, -20, 0.2],
  [520, 400, 34, 11, 1.2, -20, 0],
  [600, 320, 30, 9, 1.2, -20, 0.2],
  [270, 410, 26, 7, 1.2, -20, -0.1],
  [470, 110, 30, 10, 1.2, -15, 0],
  [540, 30, 28, 9, 1.2, -15, 0.1],
  [430, 10, 26, 8, 1.2, -15, 0],
  [590, -150, 26, 8, 1.2, -15, 0],
];
// How tall a rider has to stand at a place for the place to be counted as on the rider and not on what it rides.
export const RIDES = 0.6;
// How each crest wanders: a wave along it, as a share of its half width, and how many times it crosses it.
export const WANDER = [0.07, 3.4] as const;
// How many places along a crest are tried first, and how many times the best is then looked round at half the step.
// And how many times the most is then found between the best and its two neighbours, by a parabola.
export const SEEK = 9, HALVE = 3, PARABOLA = 2;

export interface Crest { at: [number, number]; wind: [number, number]; wide: number; tall: number; horn: number; lean: number; phase: number; reach: number; across: number; upwind: number }
export function crests(): Crest[] {
  return [...DUNES, ...RIDERS].map(([x, z, wide, tall, horn, turn, lean], i) => {
    const a = (turn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    // The longest a slip face runs out from its crest, under whichever height of the crest runs it furthest.
    let run = 0;
    for (let k = 1; k <= 40; k++) { const h = (tall * k) / 40; run = Math.max(run, h / slipUnder(h, tall)); }
    // How far across the wind and upwind of its middle it can stand: its crest's ends and the run of their faces, and
    // its back behind the crest's wander.
    const across = wide + run + 4 + PROFILE.toe * tall, upwind = PROFILE.back * tall + WANDER[0] * wide + 4 + PROFILE.toe * tall;
    return { at: [x, z], wind: [WIND[0] * c - WIND[1] * s, WIND[0] * s + WIND[1] * c], wide, tall, horn, lean, phase: i * 1.9 + 0.4, reach: Math.hypot(wide * 1.05, Math.max(wide * horn * 1.3 + run, PROFILE.back * tall)) + 4 + PROFILE.toe * tall, across, upwind };
  });
}
// The crest at u (-1 to 1 across the dune): how far downwind it lies, the first and second rates of that with u,
// and how tall it is. It falls toward each horn no more steeply than a back does: a dune is at least two and a half
// times as wide across the wind as it is tall, and its height along the crest is (1 - u²)², whose steepest is a
// little over one and a half times the mean.
function crestAt(cr: Crest, u: number): [number, number, number, number] {
  const au = Math.abs(u), sg = u < 0 ? -1 : 1, W = cr.wide, k = cr.horn * W, L = 0.3 * cr.lean, tilt = 1 + L * u;
  const ph = WANDER[1] * u + cr.phase, kw = WANDER[0] * W;
  const p06 = au ** 0.6, p16 = p06 * au, p26 = p16 * au;
  const g = 0.35 * u * u + 0.65 * p26, g1 = 0.7 * u + 1.69 * sg * p16, g2 = 0.7 + 2.704 * p06;
  const d = k * g * tilt + kw * Math.sin(ph);
  const d1 = k * (g1 * tilt + L * g) + kw * WANDER[1] * Math.cos(ph);
  const d2 = k * (g2 * tilt + 2 * L * g1) - kw * WANDER[1] * WANDER[1] * Math.sin(ph);
  const f = Math.max(0, 1 - u * u);
  const h = cr.tall * f * f * (1 + 0.2 * cr.lean * u);
  return [d, d1, d2, h];
}
// How steep the slip face is under a crest so tall: at the angle sand rests at in the middle of a crescent, and
// gentler where the crest has fallen toward a horn, so a horn is a low ridge lit on both sides and only the middle of
// the crescent is a sheer dark face (the share of the dune's height where it starts to ease, where it is eased in
// full, and how far). And gentler under the last low reach of a horn, where a slip face a fraction of a unit high
// was seen edge on as a row of dark specks.
export const HORN = [0.16, 0.6, 0.3] as const;
const sm = (a: number, b: number, v: number): number => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
export const slipUnder = (h: number, tall: number): number => PROFILE.slip * (0.35 + 0.65 * sm(0.5, 2.5, h)) * (HORN[2] + (1 - HORN[2]) * sm(HORN[0], HORN[1], h / Math.max(tall, 1e-3)));
// A back's height at t, 0 at the brink to 1 at its foot, as a share of the crest's: a broad convex shoulder that
// leaves the brink gently, is steepest a little short of half way down, where it faces the moon most squarely, and
// meets the sand round it level.
export const SHOULDER = 1.6;
export const backOf = (t: number): number => (1 - t) * (1 - t) * (1 + SHOULDER * t);
// What one point of the crest, u, holds up at a place (across, downwind, in the dune's frame): downwind a cone of
// sand at the angle it rests at, upwind a back. And how far from that point the place is, and which side it is on.
function hold(cr: Crest, A: number, D: number, u: number): [number, number, number, number] {
  const [d, d1, , h] = crestAt(cr, u), ex = A - u * cr.wide, ez = D - d, r = Math.hypot(ex, ez);
  if (ez * cr.wide - ex * d1 > 0) return [h - slipUnder(h, cr.tall) * r, 1, r, h];
  const hh = Math.max(h, 1e-3), t = r / (PROFILE.back * hh);
  return [t < 1 ? h * backOf(t) : -hh * (t - 1) * (t - 1), -1, t, h];
}
// One dune's height at a place: the most that any point of its crest holds up there, which is how sand lies under a
// crest. Taken as the most and not from the nearest point of the crest, it never jumps from one place to the next:
// where two parts of a curled crescent were nearly as near, which one was taken had flipped from pixel to pixel, as
// specks and a comb of teeth at the toe. Then a smooth toe into the sand round it. Also which side of the crest the
// place is on, the point of the crest that holds it, and how far down the slip face (units) or the back (a share).
export function duneAt(cr: Crest, x: number, z: number): [number, number, number, number] {
  const rx = x - cr.at[0], rz = z - cr.at[1], [wx, wz] = cr.wind, A = -rx * wz + rz * wx, D = rx * wx + rz * wz, W = cr.wide;
  if (Math.abs(A) > cr.across || D < -cr.upwind || D > cr.reach) return [0, 0, 0, 1e3];
  let bu = -1, best = hold(cr, A, D, -1);
  for (let k = 1; k < SEEK; k++) { const u = -1 + (2 * k) / (SEEK - 1), o = hold(cr, A, D, u); if (o[0] > best[0]) { best = o; bu = u; } }
  let step = 2 / (SEEK - 1);
  for (let k = 0; k < HALVE; k++) {
    step *= 0.5;
    for (const u of [Math.max(-1, bu - step), Math.min(1, bu + step)]) { const o = hold(cr, A, D, u); if (o[0] > best[0]) { best = o; bu = u; } }
  }
  // The lattice of places tried leaves the most a few hundredths short, and which place of it wins changes from one
  // place to the next: the surface came out faceted in rings of equal slope. A parabola through the best and its two
  // neighbours finds the most between them.
  for (let k = 0; k < PARABOLA; k++) {
    const um = Math.max(-1, bu - step), up = Math.min(1, bu + step), fm = hold(cr, A, D, um)[0], fp = hold(cr, A, D, up)[0], c = fp + fm - 2 * best[0];
    if (c < -1e-9) { const u = Math.max(um, Math.min(up, bu - (0.5 * step * (fp - fm)) / c)), o = hold(cr, A, D, u); if (o[0] > best[0]) { best = o; bu = u; } }
    step *= 0.3;
  }
  let un = bu;
  for (let it = 0; it < 2; it++) {
    const [d, d1, d2] = crestAt(cr, un), ex = un * W - A, ez = d - D, g = ex * W + ez * d1, g2 = W * W + d1 * d1 + ez * d2;
    un = Math.max(-1, Math.min(1, un - g / Math.max(g2, 1e-6)));
  }
  { const o = hold(cr, A, D, un); if (o[0] > best[0]) { best = o; bu = un; } }
  const [e, side, w] = best, k = Math.max(0.2, PROFILE.toe * cr.tall), q = Math.max(k - Math.abs(e), 0) / k;
  return [Math.max(e, 0) + q * q * k * 0.25, side, bu, w];
}
export const oneDune = (cr: Crest, x: number, z: number): number => duneAt(cr, x, z)[0];

// A slow swell under the dunes, so the sand between them rolls and is never level. It never dips under the floor's
// own level and it runs on out to the land's edge: one that dipped there was a trough inside the rim, and the rim
// round it read as a curb.
export const swell = (x: number, z: number): number => 2.3 + 1.6 * Math.sin(x * 0.017 + z * 0.011 + 1.3) * Math.sin(z * 0.021 - x * 0.007 + 0.4) + 0.65 * Math.sin(x * 0.043 - z * 0.029 + 2.1) * Math.sin(z * 0.047 + x * 0.015);
// The long low ridge of sand the row of trees behind the dunes stands on (ROW in the layout). The dome falls away to
// the right, so for the row's feet to be drawn level at 244 down, as picture 9 has them, the sand under them stands
// 11 units over the dome at its left end and 23 at its right: the height it needs is a quadratic in (x - 490) / 100
// (fitted to fromPicture). Its crest wanders in plan and in height, so the trees stand on sand and not on a ruled
// shelf, always at or behind the trees so none stands on the slip face. It is a dune's back to the visitor: a long convex back falling from a sharp brink over front times its
// height, and behind the brink a slip face at the angle sand rests at. (Falling as a cosine each way it was a
// shelf with a straight cut edge.) It fades in and out at its ends (x), and the swell under it is taken off, so the
// feet stay where the picture has them.
export const BANK = { z: -230, need: [16.198, 9.475, 0.976], ends: [385, 425, 560, 615], front: 5.5, wander: [6, 0.043, 1.1], lump: [1.2, 0.071, 0.4] } as const;
export function bank(x: number, z: number): number {
  const [a, b, c, d] = BANK.ends;
  if (x <= a || x >= d) return 0;
  const sm = (t: number): number => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
  const zc = BANK.z - BANK.wander[0] * (0.5 + 0.5 * Math.sin(x * BANK.wander[1] + BANK.wander[2]));
  const u = (x - 490) / 100, top = BANK.need[0] + BANK.need[1] * u + BANK.need[2] * u * u + BANK.lump[0] * Math.sin(x * BANK.lump[1] + BANK.lump[2]) - swell(x, zc);
  const H = top * sm((x - a) / (b - a)) * sm((d - x) / (d - c)), s = z - zc;
  if (H <= 0) return 0;
  if (s < 0) return Math.max(0, H + PROFILE.slip * s);
  const t = s / (BANK.front * Math.max(top, 1));
  return t >= 1 ? 0 : H * backOf(t);
}
// The sand rolls over to the planet's own surface at the land's edge, over this many units in from it.
export const ROLL = 34;
export const roll = (inside: number): number => { const t = Math.min(1, Math.max(0, inside / ROLL)); return t * t * (3 - 2 * t); };

let made: Crest[] | null = null;
// The desert's relief over the dome at a place, so far inside the land's edge, before the desert's own mask is laid
// on it.
export function relief(x: number, z: number, inside = 1e9): number {
  made ??= crests();
  let up = 0, ride = 0;
  made.forEach((cr, i) => {
    if ((x - cr.at[0]) ** 2 + (z - cr.at[1]) ** 2 > cr.reach * cr.reach) return;
    const h = oneDune(cr, x, z);
    if (i < DUNES.length) up = Math.max(up, h); else ride += h;
  });
  return (Math.max(up, bank(x, z)) + ride) * roll(inside) + swell(x, z);
}

// The sand's height over the dome on a grid over the desert, worked out once on the graphics card when the land is
// built (heights in land.ts) and read by the ray to the moon, which crosses many dunes: where the grid lies (x,
// z), how far it reaches, how many texels it has each way, and the most the sand stands over the dome.
export const HEIGHT = { lo: [236, -484], size: [430, 1024], texels: [512, 1216], most: 64 } as const;

// The crests as a float texture for the shader, a row for each dune: (x, z, wind), (wide, tall, horn, lean),
// (phase, reach, 0, 0).
export const ROW = 3;
export function crestTexels(): Float32Array {
  const cs = crests(), data = new Float32Array(cs.length * ROW * 4);
  cs.forEach((cr, d) => data.set([...cr.at, ...cr.wind, cr.wide, cr.tall, cr.horn, cr.lean, cr.phase, cr.reach, cr.across, cr.upwind], d * ROW * 4));
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
const vec2 WIND = vec2(${WIND[0].toFixed(4)}, ${WIND[1].toFixed(4)});
const float SLIP = ${PROFILE.slip.toFixed(4)}, BACK = ${PROFILE.back.toFixed(4)}, TOE = ${PROFILE.toe.toFixed(4)};
float landBack(float t) { return (1.0 - t) * (1.0 - t) * (1.0 + ${SHOULDER.toFixed(4)} * t); }
// The crest at u: (how far downwind, its first and second rates with u, how tall).
vec4 landCrest(vec4 b, vec4 c, float u) {
	float au = abs(u), sg = u < 0.0 ? -1.0 : 1.0, W = b.x, k = b.z * W, L = 0.3 * b.w, tilt = 1.0 + L * u;
	float ph = ${WANDER[1].toFixed(4)} * u + c.x, kw = ${WANDER[0].toFixed(4)} * W;
	float p06 = pow(au, 0.6), p16 = p06 * au, p26 = p16 * au;
	float g = 0.35 * u * u + 0.65 * p26, g1 = 0.7 * u + 1.69 * sg * p16, g2 = 0.7 + 2.704 * p06;
	float f = max(0.0, 1.0 - u * u);
	return vec4(
		k * g * tilt + kw * sin(ph),
		k * (g1 * tilt + L * g) + kw * ${WANDER[1].toFixed(4)} * cos(ph),
		k * (g2 * tilt + 2.0 * L * g1) - kw * ${(WANDER[1] * WANDER[1]).toFixed(4)} * sin(ph),
		b.y * f * f * (1.0 + 0.2 * b.w * u));
}
float landSlip(float h, float tall) { return SLIP * (0.35 + 0.65 * smoothstep(0.5, 2.5, h)) * (${HORN[2].toFixed(3)} + ${(1 - HORN[2]).toFixed(3)} * smoothstep(${HORN[0].toFixed(3)}, ${HORN[1].toFixed(3)}, h / max(tall, 1e-3))); }
// What the point u of the crest holds up at q (across, downwind): (the height, the side, 1 on the slip face, how far
// down the slip face in units or down the back as a share, and the crest's height there).
vec4 landHold(vec4 b, vec4 c, vec2 q, float u) {
	vec4 l = landCrest(b, c, u);
	vec2 e = q - vec2(u * b.x, l.x);
	float r = length(e);
	if (e.y * b.x - e.x * l.y > 0.0) return vec4(l.w - landSlip(l.w, b.y) * r, 1.0, r, l.w);
	float hh = max(l.w, 1e-3), t = r / (BACK * hh);
	return vec4(t < 1.0 ? l.w * landBack(t) : -hh * (t - 1.0) * (t - 1.0), 0.0, t, l.w);
}
// One dune at p: (its height, which side of the crest the place is, 1 on the slip face, the point of the crest that
// holds it, -1 to 1, and on the slip face how far down it from the crest the place is in units, on the back how far
// down it as a share of its length). The most any point of the crest holds up, as duneAt in TypeScript. And its slope
// over x and z, which is the slope of the one point's cone that holds the place up (the most of a family of
// surfaces has the slope of the one that is most), and the way from that point to the place, in the world.
// Taken from heights a hair apart, the slope read the few thousandths by which the most is found short as grain.
vec4 landDuneAt(vec2 p, int d, bool fine, out vec2 grad, out vec2 dir) {
	grad = vec2(0.0);
	dir = vec2(0.0);
	vec4 a = texelFetch(uCrest, ivec2(0, d), 0), b = texelFetch(uCrest, ivec2(1, d), 0), c = texelFetch(uCrest, ivec2(2, d), 0);
	vec2 r = p - a.xy;
	if (dot(r, r) > c.y * c.y) return vec4(0.0, 0.0, 0.0, 1e3);
	vec2 q = vec2(-r.x * a.w + r.y * a.z, r.x * a.z + r.y * a.w);
	// Outside the box the dune can stand in, across the wind and along it, it is not looked for.
	if (abs(q.x) > c.z || q.y < -c.w || q.y > c.y) return vec4(0.0, 0.0, 0.0, 1e3);
	float bu = -1.0;
	vec4 best = landHold(b, c, q, -1.0);
	for (int k = 1; k < ${SEEK}; k++) { float u = -1.0 + 2.0 * float(k) / ${(SEEK - 1).toFixed(1)}; vec4 o = landHold(b, c, q, u); if (o.x > best.x) { best = o; bu = u; } }
	float st = ${(2 / (SEEK - 1)).toFixed(6)};
	for (int k = 0; k < ${HALVE}; k++) {
		st *= 0.5;
		float u1 = max(-1.0, bu - st), u2 = min(1.0, bu + st);
		vec4 o1 = landHold(b, c, q, u1), o2 = landHold(b, c, q, u2);
		if (o1.x > best.x) { best = o1; bu = u1; }
		if (o2.x > best.x) { best = o2; bu = u2; }
	}
	// Where only whether a ray passes over the sand is asked, the lattice is near enough: what follows is for the
	// surface that is drawn.
	if (!fine) { float k = max(0.2, TOE * b.y), t = max(k - abs(best.x), 0.0) / k; return vec4(max(best.x, 0.0) + t * t * k * 0.25, best.y, bu, best.z); }
	for (int k = 0; k < ${PARABOLA}; k++) {
		float um = max(-1.0, bu - st), up = min(1.0, bu + st), fm = landHold(b, c, q, um).x, fp = landHold(b, c, q, up).x, cc = fp + fm - 2.0 * best.x;
		if (cc < -1e-9) { float u = clamp(bu - 0.5 * st * (fp - fm) / cc, um, up); vec4 o = landHold(b, c, q, u); if (o.x > best.x) { best = o; bu = u; } }
		st *= 0.3;
	}
	float un = bu, W = b.x;
	for (int it = 0; it < 2; it++) {
		vec4 l = landCrest(b, c, un);
		vec2 e = vec2(un * W, l.x) - q;
		float g = e.x * W + e.y * l.y, g2 = W * W + l.y * l.y + e.y * l.z;
		un = clamp(un - g / max(g2, 1e-6), -1.0, 1.0);
	}
	vec4 o = landHold(b, c, q, un);
	if (o.x > best.x) { best = o; bu = un; }
	float k = max(0.2, TOE * b.y), t = max(k - abs(best.x), 0.0) / k;
	vec4 l = landCrest(b, c, bu);
	vec2 e = q - vec2(bu * W, l.x);
	vec2 n = e / max(length(e), 1e-4);
	float hh = max(l.w, 1e-3), tb = best.z;
	float mag = best.y > 0.5 ? -landSlip(l.w, b.y) : (tb < 1.0 ? l.w * (1.0 - tb) * (${(SHOULDER - 2).toFixed(4)} - ${(3 * SHOULDER).toFixed(4)} * tb) / (BACK * hh) : -2.0 * (tb - 1.0) / BACK);
	mag *= (best.x > 0.0 ? 1.0 : 0.0) - 0.5 * t * sign(best.x);
	vec2 axisA = vec2(-a.w, a.z), axisD = a.zw;
	grad = mag * (n.x * axisA + n.y * axisD);
	dir = n.x * axisA + n.y * axisD;
	return vec4(max(best.x, 0.0) + t * t * k * 0.25, best.y, bu, best.z);
}
float landSwell(vec2 p) { return 2.3 + 1.6 * sin(p.x * 0.017 + p.y * 0.011 + 1.3) * sin(p.y * 0.021 - p.x * 0.007 + 0.4) + 0.65 * sin(p.x * 0.043 - p.y * 0.029 + 2.1) * sin(p.y * 0.047 + p.x * 0.015); }
vec2 landSwellGrad(vec2 p) {
	float A = p.x * 0.017 + p.y * 0.011 + 1.3, B = p.y * 0.021 - p.x * 0.007 + 0.4, C = p.x * 0.043 - p.y * 0.029 + 2.1, D = p.y * 0.047 + p.x * 0.015;
	float cAsB = cos(A) * sin(B), sAcB = sin(A) * cos(B), cCsD = cos(C) * sin(D), sCcD = sin(C) * cos(D);
	return vec2(1.6 * (0.017 * cAsB - 0.007 * sAcB) + 0.65 * (0.043 * cCsD + 0.015 * sCcD), 1.6 * (0.011 * cAsB + 0.021 * sAcB) + 0.65 * (-0.029 * cCsD + 0.047 * sCcD));
}
float landRoll(float inside) { return smoothstep(0.0, ${ROLL.toFixed(1)}, inside); }
float landBank(vec2 p) {
	if (p.x <= ${BANK.ends[0].toFixed(1)} || p.x >= ${BANK.ends[3].toFixed(1)}) return 0.0;
	float zc = ${BANK.z.toFixed(1)} - ${BANK.wander[0].toFixed(3)} * (0.5 + 0.5 * sin(p.x * ${BANK.wander[1].toFixed(4)} + ${BANK.wander[2].toFixed(3)}));
	float u = (p.x - 490.0) / 100.0;
	float top = ${BANK.need[0].toFixed(4)} + ${BANK.need[1].toFixed(4)} * u + ${BANK.need[2].toFixed(4)} * u * u + ${BANK.lump[0].toFixed(3)} * sin(p.x * ${BANK.lump[1].toFixed(4)} + ${BANK.lump[2].toFixed(3)}) - landSwell(vec2(p.x, zc));
	float H = top * smoothstep(${BANK.ends[0].toFixed(1)}, ${BANK.ends[1].toFixed(1)}, p.x) * smoothstep(${BANK.ends[3].toFixed(1)}, ${BANK.ends[2].toFixed(1)}, p.x), s = p.y - zc;
	if (H <= 0.0) return 0.0;
	if (s < 0.0) return max(0.0, H + SLIP * s);
	float t = s / (${BANK.front.toFixed(2)} * max(top, 1.0));
	return t >= 1.0 ? 0.0 : H * landBack(t);
}
// The relief at p, and of the dune that makes it: which side, the point of its crest, how far down its slip face,
// and which dune it is; the relief's slope over x and z with the land's edge held where it is; and the way from the
// dune's crest to the place.
float landWhich;
vec4 landInfo;
vec2 landGrad, landDir;
float landRelief(vec2 p, float inside, bool fine) {
	float up = 0.0;
	vec2 gUp = vec2(0.0), gRide = vec2(0.0), g, dir;
	landInfo = vec4(0.0, 0.0, 0.0, 1e3);
	landWhich = -1.0;
	landDir = vec2(0.0);
	for (int d = 0; d < ${DUNES.length}; d++) { vec4 h = landDuneAt(p, d, fine, g, dir); if (h.x > up) { up = h.x; gUp = g; landInfo = h; landWhich = float(d); landDir = dir; } }
	float bk = landBank(p);
	if (bk > up) { up = bk; gUp = vec2(landBank(p + vec2(0.05, 0.0)) - bk, landBank(p + vec2(0.0, 0.05)) - bk) / 0.05; landInfo = vec4(bk, 0.0, 0.0, 1e3); landWhich = -1.0; landDir = vec2(0.0); }
	float ride = 0.0;
	${RIDERS.length ? `for (int d = ${DUNES.length}; d < ${DUNES.length + RIDERS.length}; d++) { vec4 h = landDuneAt(p, d, fine, g, dir); ride += h.x; gRide += g; if (h.x > ${RIDES.toFixed(2)}) { landInfo = vec4(h.x - ${RIDES.toFixed(2)}, h.yzw); landWhich = float(d); landDir = dir; } }` : ''}
	float rl = landRoll(inside);
	landGrad = (gUp + gRide) * rl + landSwellGrad(p);
	return (up + ride) * rl + landSwell(p);
}
float landRelief(vec2 p, float inside) { return landRelief(p, inside, true); }
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
