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
export const WIND = [-0.866, 0.5] as const;

// A dune's profile: the slope of its slip face (the angle sand rests at), how long its back is against its height,
// how its back rises to the brink (above 1 it is steepest at the brink, so the brink is sharp), and how round the
// toe of its slip face is, in units, where the crest over it is 4 or more tall (less under a lower crest).
export const PROFILE = { slip: 0.66, back: 8.5, rise: 1.45, toe: 1.6 } as const;
// Each dune is a barchan: a crescent. Each is placed so the middle of its crest is seen where picture 9 has a dark
// slip face (solved with fromPicture in the layout), a little to the right of it, since here the moon is behind and
// to the right and the slip faces fall to the left of their crests. The last three are small, between them.
// Each dune: where the middle of its crest is (x, z), its half width across the wind, how
// tall it is at the middle of its crest, how far downwind its horns trail as a share of its half width, how far it
// is turned from square to the wind in degrees, and how it leans (-1 to 1): one horn longer and the crest higher
// toward it.
export type Dune = readonly [x: number, z: number, wide: number, tall: number, horn: number, turn: number, lean: number];
export const DUNES: readonly Dune[] = [
  [403, 252, 50, 14, 1.0, -10, 0.55],
  [504, 157, 60, 13, 0.75, 6, -0.4],
  [460, 369, 40, 15, 1.4, -2, 0.1],
  [409, 84, 30, 9, 1.5, 12, -0.5],
  [597, -89, 36, 9.5, 0.85, -12, 0.6],
  [563, -97, 26, 8, 1.6, 2, 0],
  [333, 239, 44, 10, 0.9, 14, -0.15],
  [600, 100, 28, 8, 1.3, -14, 0.5],
  [305, 413, 34, 9, 1.1, 6, 0.35],
  [530, 245, 18, 4.5, 1.3, 0, 0.2],
  [455, 20, 16, 4, 1.5, -6, -0.3],
  [618, 22, 20, 5, 1.2, 8, 0.4],
];
// How each crest wanders: a wave along it, as a share of its half width, and how many times it crosses it.
export const WANDER = [0.045, 3.4] as const;
// How many places along a crest its nearest point is first looked for among, before it is found exactly.
export const SEEK = 13;

export interface Crest { at: [number, number]; wind: [number, number]; wide: number; tall: number; horn: number; lean: number; phase: number; reach: number }
export function crests(): Crest[] {
  return DUNES.map(([x, z, wide, tall, horn, turn, lean], i) => {
    const a = (turn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return { at: [x, z], wind: [WIND[0] * c - WIND[1] * s, WIND[0] * s + WIND[1] * c], wide, tall, horn, lean, phase: i * 1.9 + 0.4, reach: Math.hypot(wide * 1.05, Math.max(wide * horn * 1.3 + tall / PROFILE.slip, PROFILE.back * tall)) + 4 };
  });
}
// The crest at u (-1 to 1 across the dune): how far downwind it lies, the first and second rates of that with u,
// and how tall it is.
function crestAt(cr: Crest, u: number): [number, number, number, number] {
  const au = Math.max(Math.abs(u), 1e-6), sg = u < 0 ? -1 : 1, W = cr.wide, k = cr.horn * W, L = 0.3 * cr.lean, tilt = 1 + L * u;
  const ph = WANDER[1] * u + cr.phase, kw = WANDER[0] * W;
  const p04 = au ** 0.4, p14 = p04 * au, p24 = p14 * au;
  const d = k * p24 * tilt + kw * Math.sin(ph);
  const d1 = k * (2.4 * sg * p14 * tilt + L * p24) + kw * WANDER[1] * Math.cos(ph);
  const d2 = k * (3.36 * p04 * tilt + 4.8 * sg * p14 * L) - kw * WANDER[1] * WANDER[1] * Math.sin(ph);
  const h = cr.tall * Math.max(0, 1 - au ** 1.7) ** 1.7 * (1 + 0.2 * cr.lean * u);
  return [d, d1, d2, h];
}
// The slip face at a place: sand resting at its angle from the nearest point of the crest, found first among a few
// places along it and then exactly. Its height, and the point of the crest, -1 to 1.
function lee(cr: Crest, A: number, D: number): [number, number] {
  const W = cr.wide;
  let bu = -1, bd = Infinity;
  for (let k = 0; k < SEEK; k++) { const u = -1 + (2 * k) / (SEEK - 1), [d] = crestAt(cr, u), r = (A - u * W) ** 2 + (D - d) ** 2; if (r < bd) { bd = r; bu = u; } }
  for (let it = 0; it < 5; it++) {
    const [d, d1, d2] = crestAt(cr, bu), ex = bu * W - A, ez = d - D, g = ex * W + ez * d1, g2 = W * W + d1 * d1 + ez * d2;
    bu = Math.max(-1, Math.min(1, bu - g / Math.max(g2, 1e-6)));
  }
  const [d, , , h] = crestAt(cr, bu);
  return [h - PROFILE.slip * Math.hypot(A - bu * W, D - d), bu];
}
// One dune's height at a place: its back on the side the wind comes from, rising to the brink, and on the other side
// its slip face, as a smooth toe into the sand round it.
function oneDune(cr: Crest, x: number, z: number): number {
  const rx = x - cr.at[0], rz = z - cr.at[1], [wx, wz] = cr.wind, A = -rx * wz + rz * wx, D = rx * wx + rz * wz, u = A / cr.wide;
  if (Math.abs(u) < 1) {
    const [d, d1, , h] = crestAt(cr, u);
    if (D < d) {
      const t = (d - D) / Math.sqrt(1 + (d1 / cr.wide) ** 2) / (PROFILE.back * Math.max(h, 1e-3));
      return t < 1 ? h * (1 - t) ** PROFILE.rise : 0;
    }
  }
  const [e, bu] = lee(cr, A, D), k = PROFILE.toe * Math.min(1, Math.max(0.02, crestAt(cr, bu)[3] / 4)), g = Math.max(k - Math.abs(e), 0) / k;
  return Math.max(e, 0) + g * g * k * 0.25;
}

// A slow swell under the dunes, so the sand between them is never level.
export const swell = (x: number, z: number): number => 1.6 * Math.sin(x * 0.021 + z * 0.013 + 1.3) * Math.sin(z * 0.027 - x * 0.009 + 0.4) + 0.8 * Math.sin(x * 0.052 - z * 0.031 + 2.1) * Math.sin(z * 0.061 + x * 0.017);
// The desert rising to a broad pale dome at its back right, as picture 9's does: where its top is, how far it
// spreads each way, and how high.
export const RISE = { at: [528, -120] as const, r: [190, 150] as const, tall: 17 } as const;
export const rise = (x: number, z: number): number => RISE.tall * Math.exp(-(((x - RISE.at[0]) / RISE.r[0]) ** 2) - (((z - RISE.at[1]) / RISE.r[1]) ** 2));
// The sand rolls over to the planet's own surface at the land's edge, over this many units in from it.
export const ROLL = 26;
export const roll = (inside: number): number => { const t = Math.min(1, Math.max(0, inside / ROLL)); return t * t * (3 - 2 * t); };

let made: Crest[] | null = null;
// The desert's relief over the dome at a place, so far inside the land's edge, before the desert's own mask is laid
// on it.
export function relief(x: number, z: number, inside = 1e9): number {
  made ??= crests();
  let up = 0;
  for (const cr of made) {
    if ((x - cr.at[0]) ** 2 + (z - cr.at[1]) ** 2 > cr.reach * cr.reach) continue;
    up = Math.max(up, oneDune(cr, x, z));
  }
  return (up + swell(x, z) + rise(x, z)) * roll(inside);
}

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
const float SLIP = ${PROFILE.slip.toFixed(4)}, BACK = ${PROFILE.back.toFixed(4)}, RISE_P = ${PROFILE.rise.toFixed(4)}, TOE = ${PROFILE.toe.toFixed(4)};
// The crest at u: (how far downwind, its first and second rates with u, how tall).
vec4 landCrest(vec4 b, vec4 c, float u) {
	float au = max(abs(u), 1e-6), sg = u < 0.0 ? -1.0 : 1.0, W = b.x, k = b.z * W, L = 0.3 * b.w, tilt = 1.0 + L * u;
	float ph = ${WANDER[1].toFixed(4)} * u + c.x, kw = ${WANDER[0].toFixed(4)} * W;
	float p04 = pow(au, 0.4), p14 = p04 * au, p24 = p14 * au;
	return vec4(
		k * p24 * tilt + kw * sin(ph),
		k * (2.4 * sg * p14 * tilt + L * p24) + kw * ${WANDER[1].toFixed(4)} * cos(ph),
		k * (3.36 * p04 * tilt + 4.8 * sg * p14 * L) - kw * ${(WANDER[1] * WANDER[1]).toFixed(4)} * sin(ph),
		b.y * pow(max(0.0, 1.0 - pow(au, 1.7)), 1.7) * (1.0 + 0.2 * b.w * u));
}
// The slip face at q (across, downwind): sand resting at its angle from the nearest point of the crest. Its height,
// and the point of the crest, -1 to 1.
vec2 landLee(vec4 b, vec4 c, vec2 q) {
	float W = b.x, bu = -1.0, bd = 1e20;
	for (int k = 0; k < ${SEEK}; k++) { float u = -1.0 + 2.0 * float(k) / ${(SEEK - 1).toFixed(1)}; vec4 l = landCrest(b, c, u); vec2 e = vec2(u * W, l.x) - q; float r = dot(e, e); if (r < bd) { bd = r; bu = u; } }
	for (int it = 0; it < 5; it++) {
		vec4 l = landCrest(b, c, bu);
		vec2 e = vec2(bu * W, l.x) - q;
		float g = e.x * W + e.y * l.y, g2 = W * W + l.y * l.y + e.y * l.z;
		bu = clamp(bu - g / max(g2, 1e-6), -1.0, 1.0);
	}
	vec4 l = landCrest(b, c, bu);
	return vec2(l.w - SLIP * length(q - vec2(bu * W, l.x)), bu);
}
// One dune at p: (its height, which side of the crest the place is, 1 on the slip face, the point of the crest
// across it, -1 to 1, and how far down the slip face from the crest the place is, in units).
vec4 landDuneAt(vec2 p, int d) {
	vec4 a = texelFetch(uCrest, ivec2(0, d), 0), b = texelFetch(uCrest, ivec2(1, d), 0), c = texelFetch(uCrest, ivec2(2, d), 0);
	vec2 r = p - a.xy;
	if (dot(r, r) > c.y * c.y) return vec4(0.0, 0.0, 0.0, 1e3);
	float A = -r.x * a.w + r.y * a.z, D = r.x * a.z + r.y * a.w, u = A / b.x;
	if (abs(u) < 1.0) {
		vec4 l = landCrest(b, c, u);
		if (D < l.x) {
			float t = (l.x - D) / sqrt(1.0 + (l.y / b.x) * (l.y / b.x)) / (BACK * max(l.w, 1e-3));
			return vec4(t < 1.0 ? l.w * pow(1.0 - t, RISE_P) : 0.0, 0.0, u, 0.0);
		}
	}
	vec2 e = landLee(b, c, vec2(A, D));
	vec4 l = landCrest(b, c, e.y);
	float k = TOE * clamp(l.w / 4.0, 0.02, 1.0), g = max(k - abs(e.x), 0.0) / k;
	return vec4(max(e.x, 0.0) + g * g * k * 0.25, 1.0, e.y, (l.w - e.x) / SLIP);
}
float landSwell(vec2 p) { return 1.6 * sin(p.x * 0.021 + p.y * 0.013 + 1.3) * sin(p.y * 0.027 - p.x * 0.009 + 0.4) + 0.8 * sin(p.x * 0.052 - p.y * 0.031 + 2.1) * sin(p.y * 0.061 + p.x * 0.017); }
float landRise(vec2 p) { vec2 q = (p - vec2(${RISE.at[0].toFixed(1)}, ${RISE.at[1].toFixed(1)})) / vec2(${RISE.r[0].toFixed(1)}, ${RISE.r[1].toFixed(1)}); return ${RISE.tall.toFixed(2)} * exp(-dot(q, q)); }
float landRoll(float inside) { return smoothstep(0.0, ${ROLL.toFixed(1)}, inside); }
// The relief at p, and of the dune that makes it: which side, the point of its crest, how far down its slip face,
// and which dune it is.
float landWhich;
vec4 landInfo;
float landRelief(vec2 p, float inside) {
	float up = 0.0;
	landInfo = vec4(0.0, 0.0, 0.0, 1e3);
	landWhich = -1.0;
	for (int d = 0; d < ${DUNES.length}; d++) { vec4 h = landDuneAt(p, d); if (h.x > up) { up = h.x; landInfo = h; landWhich = float(d); } }
	return (up + landSwell(p) + landRise(p)) * landRoll(inside);
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
