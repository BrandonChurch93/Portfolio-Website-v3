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
// and how round the toe of its slip face is, as a share of the crest's height over it. At that length the back's
// steepest (backOf) is still under the angle sand rests at, and the brink stays a sharp break onto the slip face.
// He ruled the dunes taller twice (Nov 16, 01:15 and 02:00): "they need to be a lot taller". The tallest stand
// about 60 units, as tall as a mid sized building, and the dunes are few and great, each climbing the back of the
// next. A dune cannot be taller against its width than both its sides at the angle sand rests at allow, so it is
// made wider at the base, and the dunes overlap.
export const PROFILE = { slip: 0.66, back: 2.5, toe: 0.16 } as const;
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
  [440, 320, 145, 58, 1.4, -19, 0.3],
  [380, 60, 125, 40, 1.3, -4, -0.3],
  [530, 185, 140, 46, 1.4, -26, -0.2],
  [600, -20, 95, 30, 1.3, -10, 0.2],
  [415, -105, 105, 38, 1.3, -2, 0.25],
  [318, 300, 70, 22, 1.4, -16, 0.2],
  [492, -305, 80, 36, 0.5, 92, 0.1],
];
// The small crescents of the desert, on the floor between the great dunes: each is laid on whatever sand is under
// it, so the great dunes have something to be great beside. (Laid on a great dune's steep flank, one read as a scoop
// carved into it.)
export const RIDERS: readonly Dune[] = [
  [283, 366, 18, 5.5, 1.25, -28, 0.2],
  [490, 80, 40, 12, 1.2, -25, 0.1],
  [470, -30, 34, 10, 1.2, -20, 0],
  [352, 200, 28, 8, 1.3, -25, 0.2],
  [612, 60, 30, 9, 1.2, -30, -0.1],
  [548, 28, 22, 6, 1.3, -20, 0.2],
];
// How tall a rider has to stand at a place for the place to be counted as on the rider and not on what it rides.
export const RIDES = 0.6;
// How each crest wanders: a wave along it, as a share of its half width, and how many times it crosses it.
export const WANDER = [0.07, 3.4] as const;
// How many places along a crest its nearest point is first looked for among, before it is found exactly.
export const SEEK = 9;
// And how many steps it is then closed in over.
export const NEWTON = 4;

export interface Crest { at: [number, number]; wind: [number, number]; wide: number; tall: number; horn: number; lean: number; phase: number; reach: number }
export function crests(): Crest[] {
  return [...DUNES, ...RIDERS].map(([x, z, wide, tall, horn, turn, lean], i) => {
    const a = (turn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return { at: [x, z], wind: [WIND[0] * c - WIND[1] * s, WIND[0] * s + WIND[1] * c], wide, tall, horn, lean, phase: i * 1.9 + 0.4, reach: Math.hypot(wide * 1.05, Math.max(wide * horn * 1.3 + tall / PROFILE.slip, PROFILE.back * tall)) + 4 + PROFILE.toe * tall };
  });
}
// The crest at u (-1 to 1 across the dune): how far downwind it lies, the first and second rates of that with u,
// and how tall it is. It falls toward each horn no more steeply than a back does: a dune is at least two and a half
// times as wide across the wind as it is tall, and its height along the crest is (1 - u²)², whose steepest is a
// little over one and a half times the mean.
// The notches along a crest, where sand has slumped from the brink: a share of the crest's height lost at a place so
// far along it, in units. A few narrow ones and fewer deeper ones, never two dunes alike.
export const NOTCH = [[9.2, 16, 0.012], [5.7, 24, 0.007]] as const;
export function notch(along: number, phase: number): number {
  let k = 0;
  NOTCH.forEach(([w, p, a], i) => { k += a * Math.max(0, Math.sin(along / w + phase * (1 + 0.7 * i))) ** p; });
  return k;
}
function crestAt(cr: Crest, u: number): [number, number, number, number] {
  const au = Math.abs(u), sg = u < 0 ? -1 : 1, W = cr.wide, k = cr.horn * W, L = 0.3 * cr.lean, tilt = 1 + L * u;
  const ph = WANDER[1] * u + cr.phase, kw = WANDER[0] * W;
  const p06 = au ** 0.6, p16 = p06 * au, p26 = p16 * au;
  const g = 0.35 * u * u + 0.65 * p26, g1 = 0.7 * u + 1.69 * sg * p16, g2 = 0.7 + 2.704 * p06;
  const d = k * g * tilt + kw * Math.sin(ph);
  const d1 = k * (g1 * tilt + L * g) + kw * WANDER[1] * Math.cos(ph);
  const d2 = k * (g2 * tilt + 2 * L * g1) - kw * WANDER[1] * WANDER[1] * Math.sin(ph);
  const f = Math.max(0, 1 - u * u);
  const h = cr.tall * f * f * (1 + 0.2 * cr.lean * u) * (1 - notch(u * W, cr.phase));
  return [d, d1, d2, h];
}
// How steep the slip face is under a crest so tall: at the angle sand rests at under a crest of any height, and
// gentler under the last low reach of a horn, where a slip face a fraction of a unit high was seen edge on as a row
// of dark specks.
// And gentler still where the crest has fallen toward a horn: a horn's tip is low and round, lit on both sides, and
// only the middle of the crescent stands at the angle sand rests at. So each dark face is framed by lit sand at both
// horns, and no horn is a knife edge down to the floor.
export const HORN = [0.14, 0.55, 0.3] as const;
const sm = (a: number, b: number, v: number): number => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
export const slipUnder = (h: number, tall: number): number => PROFILE.slip * (0.35 + 0.65 * sm(0.5, 2.5, h)) * (HORN[2] + (1 - HORN[2]) * sm(HORN[0], HORN[1], h / Math.max(tall, 1e-3)));
// The nearest point of the crest to a place, found first among a few places along it and then exactly: the point,
// -1 to 1, how far off it the place is, and which side of it, 1 downwind (the slip face) and -1 upwind (the back).
// The best place to start from on each half of the crest: a place in the hollow of a crescent whose horns curl far
// round is near both, and which one it was found from flipped from place to place, as a seam of teeth at the toe.
// Both halves are followed only where the nearer is not much the nearer: everywhere else the farther half's crest is
// too far off to stand over the place, and following it doubled what a pixel cost.
export const BOTH = 1.35;
function seeds(cr: Crest, A: number, D: number): [number, number, boolean] {
  const W = cr.wide;
  let bl = -1, dl = Infinity, br = 1, dr = Infinity;
  for (let k = 0; k < SEEK; k++) {
    const u = -1 + (2 * k) / (SEEK - 1), [d] = crestAt(cr, u), r = (A - u * W) ** 2 + (D - d) ** 2;
    if (u <= 0 && r < dl) { dl = r; bl = u; }
    if (u >= 0 && r < dr) { dr = r; br = u; }
  }
  return dl <= dr ? [bl, br, dr < BOTH * dl] : [br, bl, dl < BOTH * dr];
}
function nearest(cr: Crest, A: number, D: number, from: number): [number, number, number] {
  const W = cr.wide;
  let bu = from;
  for (let it = 0; it < NEWTON; it++) {
    const [d, d1, d2] = crestAt(cr, bu), ex = bu * W - A, ez = d - D, g = ex * W + ez * d1, g2 = W * W + d1 * d1 + ez * d2;
    bu = Math.max(-1, Math.min(1, bu - g / Math.max(g2, 1e-6)));
  }
  const [d, d1] = crestAt(cr, bu), ex = A - bu * W, ez = D - d;
  return [bu, Math.hypot(ex, ez), ez * W - ex * d1 > 0 ? 1 : -1];
}
// A back's height at t, 0 at the brink to 1 at its foot, as a share of the crest's: a broad convex shoulder that
// leaves the brink gently, is steepest a little short of half way down, where it faces the moon most squarely, and
// meets the sand round it level.
export const SHOULDER = 1.6;
export const backOf = (t: number): number => (1 - t) * (1 - t) * (1 + SHOULDER * t);
// What one point of the crest, u, makes of a place: upwind its back, falling from the brink with the distance from
// that point, and downwind its slip face, sand resting at its angle square to the crest there, after as much of a
// back's fall as the place lies along the crest from that point. The two meet on the line square to the crest, so no
// place jumps from one to the other. And how far toward the slip face the place is, 0 to 1, for its toe.
// How fast the crest's height changes along it at u, per unit along it.
function rise(cr: Crest, u: number, d1: number): number {
  const f = 1 - u * u, L = 0.2 * cr.lean;
  return (cr.tall * (-4 * u * f * (1 + L * u) + f * f * L)) / Math.hypot(cr.wide, d1);
}
// One dune's height at a place, from the nearest point of its crest: upwind its back, falling from the brink, and
// downwind its slip face, sand resting at its angle, as a smooth toe into the sand round it. Where the crest falls
// toward a horn, the sand beside it is held up by the higher crest along from it, so that it falls no more steeply
// than sand can stand: the distance from the crest is shortened by as much (worked out exactly for a straight crest
// rising evenly, which near its nearest point a crest is).
// How round a crest is, in units across, where it has fallen toward a horn: as wide as this at the most, from where
// it stands this share of its dune's height down to this. The middle of a crescent keeps a knife crest; its horns are
// round ridges of sand, which a knife edge all the way to the floor made a curled sheet of.
export const ROUND = [9, 0.3, 0.7] as const;
const roundOf = (h: number, tall: number): number => Math.min(h, ROUND[0] * (1 - sm(ROUND[1], ROUND[2], h / Math.max(tall, 1e-3))));
export function oneDune(cr: Crest, x: number, z: number): number {
  const rx = x - cr.at[0], rz = z - cr.at[1], [wx, wz] = cr.wind, A = -rx * wz + rz * wx, D = rx * wx + rz * wz;
  const [near, far, both] = seeds(cr, A, D), first = fromCrest(cr, nearest(cr, A, D, near));
  return both ? Math.max(first, fromCrest(cr, nearest(cr, A, D, far))) : first;
}
function fromCrest(cr: Crest, [bu, r, side]: [number, number, number]): number {
  const [, d1, , h] = crestAt(cr, bu), g = rise(cr, bu, d1);
  const s = slipUnder(h, cr.tall), R = roundOf(h, cr.tall), sr = side * r;
  const fillet = R > 1e-3 && Math.abs(sr) < R ? h - (s * (sr + R) * (sr + R)) / (4 * R) : Infinity;
  if (side < 0) { const m = 1.4 / PROFILE.back, t = (r * Math.sqrt(1 - Math.min(0.8, (g * g) / (m * m)))) / (PROFILE.back * Math.max(h, 1e-3)); return Math.min(fillet, t < 1 ? h * backOf(t) : 0); }
  const e = Math.min(fillet, h - r * Math.sqrt(s * s - Math.min(0.8 * s * s, g * g))), k = Math.max(0.2, PROFILE.toe * h), q = Math.max(k - Math.abs(e), 0) / k;
  return Math.max(e, 0) + q * q * k * 0.25;
}

// A slow swell under the dunes, so the sand between them rolls and is never level. It never dips under the floor's
// own level and it runs on out to the land's edge: one that dipped there was a trough inside the rim, and the rim
// round it read as a curb.
export const swell = (x: number, z: number): number => 2.3 + 1.6 * Math.sin(x * 0.017 + z * 0.011 + 1.3) * Math.sin(z * 0.021 - x * 0.007 + 0.4) + 0.65 * Math.sin(x * 0.043 - z * 0.029 + 2.1) * Math.sin(z * 0.047 + x * 0.015);
// The long low ridge of sand the row of trees behind the dunes stands on (ROW in the layout). The dome falls away to
// the right, so for the row's feet to be drawn level at 244 down, as picture 9 has them, the sand under them stands
// 11 units over the dome at its left end and 23 at its right: the height it needs is a quadratic in (x - 490) / 100
// (fitted to fromPicture). Its crest wanders a little in plan and in height, so the trees stand on sand and not on a
// ruled shelf, and each side falls as a smooth whaleback: toward the visitor over front times its height, away
// over back times it. It fades in and out at its ends (x), and the swell under it is taken off, so the feet stay
// where the picture has them.
export const BANK = { z: -230, need: [16.198, 9.475, 0.976], ends: [385, 425, 560, 615], front: 3.4, back: 4.4, wander: [2.5, 0.043, 1.1], lump: [0.9, 0.071, 0.4] } as const;
export function bank(x: number, z: number): number {
  const [a, b, c, d] = BANK.ends;
  if (x <= a || x >= d) return 0;
  const sm = (t: number): number => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
  const zc = BANK.z + BANK.wander[0] * Math.sin(x * BANK.wander[1] + BANK.wander[2]);
  const u = (x - 490) / 100, top = BANK.need[0] + BANK.need[1] * u + BANK.need[2] * u * u + BANK.lump[0] * Math.sin(x * BANK.lump[1] + BANK.lump[2]) - swell(x, zc);
  const H = top * sm((x - a) / (b - a)) * sm((d - x) / (d - c)), s = z - zc;
  if (H <= 0) return 0;
  const t = Math.abs(s) / ((s > 0 ? BANK.front : BANK.back) * Math.max(top, 1));
  return t >= 1 ? 0 : H * 0.5 * (1 + Math.cos(Math.PI * t));
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
  cs.forEach((cr, d) => data.set([...cr.at, ...cr.wind, cr.wide, cr.tall, cr.horn, cr.lean, cr.phase, cr.reach, 0, 0], d * ROW * 4));
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
float landNotch(float along, float ph) {
	return ${NOTCH.map(([w, p, a], i) => `${a.toFixed(3)} * pow(max(0.0, sin(along / ${w.toFixed(2)} + ph * ${(1 + 0.7 * i).toFixed(2)})), ${p.toFixed(1)})`).join(' + ')};
}
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
		b.y * f * f * (1.0 + 0.2 * b.w * u) * (1.0 - landNotch(u * W, c.x)));
}
// The nearest point of the crest to q (across, downwind): (the point, -1 to 1, how far off it, which side: 1 on the
// slip face, -1 on the back).
vec3 landSeeds(vec4 b, vec4 c, vec2 q) {
	float W = b.x, bl = -1.0, dl = 1e20, br = 1.0, dr = 1e20;
	for (int k = 0; k < ${SEEK}; k++) {
		float u = -1.0 + 2.0 * float(k) / ${(SEEK - 1).toFixed(1)};
		vec4 l = landCrest(b, c, u);
		vec2 e = vec2(u * W, l.x) - q;
		float r = dot(e, e);
		if (u <= 0.0 && r < dl) { dl = r; bl = u; }
		if (u >= 0.0 && r < dr) { dr = r; br = u; }
	}
	return dl <= dr ? vec3(bl, br, dr < ${BOTH.toFixed(2)} * dl ? 1.0 : 0.0) : vec3(br, bl, dl < ${BOTH.toFixed(2)} * dr ? 1.0 : 0.0);
}
vec3 landNear(vec4 b, vec4 c, vec2 q, float bu) {
	float W = b.x;
	for (int it = 0; it < ${NEWTON}; it++) {
		vec4 l = landCrest(b, c, bu);
		vec2 e = vec2(bu * W, l.x) - q;
		float g = e.x * W + e.y * l.y, g2 = W * W + l.y * l.y + e.y * l.z;
		bu = clamp(bu - g / max(g2, 1e-6), -1.0, 1.0);
	}
	vec4 l = landCrest(b, c, bu);
	vec2 e = q - vec2(bu * W, l.x);
	return vec3(bu, length(e), e.y * W - e.x * l.y > 0.0 ? 1.0 : -1.0);
}
// How fast the crest's height changes along it at u, per unit along it.
float landRise(vec4 b, float u, float d1) { float f = 1.0 - u * u, L = 0.2 * b.w; return b.y * (-4.0 * u * f * (1.0 + L * u) + f * f * L) / length(vec2(b.x, d1)); }
// One dune at p: (its height, which side of the crest the place is, 1 on the slip face, the point of the crest
// nearest it, -1 to 1, and on the slip face how far down it from the crest the place is in units, on the back how
// far down it as a share of its length).
vec4 landFromCrest(vec4 b, vec4 c, vec3 n);
vec4 landDuneAt(vec2 p, int d) {
	vec4 a = texelFetch(uCrest, ivec2(0, d), 0), b = texelFetch(uCrest, ivec2(1, d), 0), c = texelFetch(uCrest, ivec2(2, d), 0);
	vec2 r = p - a.xy;
	if (dot(r, r) > c.y * c.y) return vec4(0.0, 0.0, 0.0, 1e3);
	vec2 q = vec2(-r.x * a.w + r.y * a.z, r.x * a.z + r.y * a.w);
	vec3 s = landSeeds(b, c, q);
	vec4 one = landFromCrest(b, c, landNear(b, c, q, s.x));
	if (s.z < 0.5) return one;
	vec4 two = landFromCrest(b, c, landNear(b, c, q, s.y));
	return one.x >= two.x ? one : two;
}
vec4 landFromCrest(vec4 b, vec4 c, vec3 n) {
	vec4 l = landCrest(b, c, n.x);
	float h = l.w, g = landRise(b, n.x, l.y);
	float s = SLIP * (0.35 + 0.65 * smoothstep(0.5, 2.5, h)) * (${HORN[2].toFixed(3)} + ${(1 - HORN[2]).toFixed(3)} * smoothstep(${HORN[0].toFixed(3)}, ${HORN[1].toFixed(3)}, h / max(b.y, 1e-3)));
	float R = min(h, ${ROUND[0].toFixed(3)} * (1.0 - smoothstep(${ROUND[1].toFixed(3)}, ${ROUND[2].toFixed(3)}, h / max(b.y, 1e-3)))), sr = n.z * n.y;
	float fillet = R > 1e-3 && abs(sr) < R ? h - s * (sr + R) * (sr + R) / (4.0 * R) : 1e9;
	if (n.z < 0.0) {
		const float M = ${(1.4 / PROFILE.back).toFixed(4)};
		float t = n.y * sqrt(1.0 - min(0.8, g * g / (M * M))) / (BACK * max(h, 1e-3));
		return vec4(min(fillet, t < 1.0 ? h * landBack(t) : 0.0), 0.0, n.x, t);
	}
	float e = min(fillet, h - n.y * sqrt(s * s - min(0.8 * s * s, g * g)));
	float k = max(0.2, TOE * h), q = max(k - abs(e), 0.0) / k;
	return vec4(max(e, 0.0) + q * q * k * 0.25, 1.0, n.x, n.y);
}
float landSwell(vec2 p) { return 2.3 + 1.6 * sin(p.x * 0.017 + p.y * 0.011 + 1.3) * sin(p.y * 0.021 - p.x * 0.007 + 0.4) + 0.65 * sin(p.x * 0.043 - p.y * 0.029 + 2.1) * sin(p.y * 0.047 + p.x * 0.015); }
float landRoll(float inside) { return smoothstep(0.0, ${ROLL.toFixed(1)}, inside); }
float landBank(vec2 p) {
	if (p.x <= ${BANK.ends[0].toFixed(1)} || p.x >= ${BANK.ends[3].toFixed(1)}) return 0.0;
	float zc = ${BANK.z.toFixed(1)} + ${BANK.wander[0].toFixed(3)} * sin(p.x * ${BANK.wander[1].toFixed(4)} + ${BANK.wander[2].toFixed(3)});
	float u = (p.x - 490.0) / 100.0;
	float top = ${BANK.need[0].toFixed(4)} + ${BANK.need[1].toFixed(4)} * u + ${BANK.need[2].toFixed(4)} * u * u + ${BANK.lump[0].toFixed(3)} * sin(p.x * ${BANK.lump[1].toFixed(4)} + ${BANK.lump[2].toFixed(3)}) - landSwell(vec2(p.x, zc));
	float H = top * smoothstep(${BANK.ends[0].toFixed(1)}, ${BANK.ends[1].toFixed(1)}, p.x) * smoothstep(${BANK.ends[3].toFixed(1)}, ${BANK.ends[2].toFixed(1)}, p.x), s = p.y - zc;
	if (H <= 0.0) return 0.0;
	float t = abs(s) / ((s > 0.0 ? ${BANK.front.toFixed(2)} : ${BANK.back.toFixed(2)}) * max(top, 1.0));
	return t >= 1.0 ? 0.0 : H * 0.5 * (1.0 + cos(3.14159265 * t));
}
// The relief at p, and of the dune that makes it: which side, the point of its crest, how far down its slip face,
// and which dune it is.
float landWhich;
vec4 landInfo;
float landRelief(vec2 p, float inside) {
	float up = 0.0;
	landInfo = vec4(0.0, 0.0, 0.0, 1e3);
	landWhich = -1.0;
	for (int d = 0; d < ${DUNES.length}; d++) { vec4 h = landDuneAt(p, d); if (h.x > up) { up = h.x; landInfo = h; landWhich = float(d); } }
	float bk = landBank(p);
	if (bk > up) { up = bk; landInfo = vec4(bk, 0.0, 0.0, 1e3); landWhich = -1.0; }
	float ride = 0.0;
	for (int d = ${DUNES.length}; d < ${DUNES.length + RIDERS.length}; d++) { vec4 h = landDuneAt(p, d); ride += h.x; if (h.x > ${RIDES.toFixed(2)}) { landInfo = h; landWhich = float(d); } }
	return (up + ride) * landRoll(inside) + landSwell(p);
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
