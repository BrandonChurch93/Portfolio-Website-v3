// The land's own shape: the dunes, and the broken ground along the land's front edge. Its make script
// (scripts/world/parts/land/make.mjs) builds the mesh from these functions, and its shader works the slopes out per
// pixel from the same numbers (GLSL below), so a crest is as sharp at three times zoom as it is in the mesh. It
// imports nothing, so node reads it as it is.

// The maps the land is drawn with (land-a.png, land-light.png) cover x and z from lo to lo + size, in units.
export const MAP = { lo: -664, size: 1328 } as const;

// The way the wind that laid the dunes blows: toward the visitor and to the left, away from the moon. Their low
// backs face the moon, and their slip faces face the visitor, as wide dark bands, as picture 9's do. Turned any
// nearer the visitor a slip face at the angle sand rests at would catch the moon.
export const WIND = [-0.68, 0.733] as const;

// A dune's profile: the slope of its slip face (the angle sand rests at), the mean slope of its back, how its back
// rounds over to the crest (the share of it that stays sloped right up to the brink), how far its hollow sinks under the sand round it and how long the hollow runs out, both
// shares of its height.
export const PROFILE = { slip: 0.66, back: 0.2, round: 0.3, dip: 0.4, reach: 2.0 } as const;
// Each dune: where its crest's middle is (x, z), how long the crest is, how tall it is at its highest, how far its
// horns trail downwind as a share of its half length, how far it is turned from square to the wind in degrees, and
// how far its height leans toward one horn (-1 to 1). The first seven are picture 9's dark slip faces, each solved
// from where the face's crest and foot are in the picture; the rest fill the field between them.
export type Dune = readonly [x: number, z: number, long: number, tall: number, bend: number, turn: number, lean: number];
export const DUNES: readonly Dune[] = [
  [378, 210, 125, 17, 0.3, -4, 0.3],
  [462, 146, 110, 12, 0.32, 6, -0.2],
  [432, 392, 115, 16, 0.3, -8, 0.35],
  [490, -140, 100, 15, 0.28, 5, 0],
  [565, -150, 95, 17, 0.25, -5, 0.2],
  [618, -110, 70, 14, 0.28, 0, -0.3],
  [585, 120, 150, 22, 0.25, -6, 0.3],
  [325, 330, 100, 8, 0.32, 8, -0.2],
  [525, 285, 110, 10, 0.3, 10, 0.2],
  [420, 40, 110, 8, 0.32, -6, 0],
  [545, 10, 95, 8, 0.32, 8, 0.3],
  [305, 120, 80, 7, 0.32, 0, 0],
  [380, -60, 90, 7, 0.32, 4, -0.2],
];
// How each crest wanders: two waves along it, as shares of its length, and how many times each crosses it.
export const WANDER = { a: [0.06, 3.1], b: [0.025, 7.3] } as const;

// Each dune's crest is a smooth curve in the dune's own frame: so far downwind (d) at each place across the wind
// (a, from its middle). Its horns trail downwind, and it wanders. A place is measured from the crest straight
// downwind, eased by the crest's slope, so every dune is one smooth sheet with no seam at any size: a crest of
// straight pieces creased the slip face at every joint, and the nearest point on a curve jumps where the curve bends
// back on itself, which tore cliffs in the sand.
export interface Crest { at: [number, number]; wind: [number, number]; long: number; tall: number; bend: number; lean: number; phase: [number, number]; reach: number }
export function crests(): Crest[] {
  return DUNES.map(([x, z, long, tall, bend, turn, lean], i) => {
    const a = (turn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const lee = (tall * (1 + PROFILE.dip)) / PROFILE.slip + PROFILE.reach * tall;
    return { at: [x, z], wind: [WIND[0] * c - WIND[1] * s, WIND[0] * s + WIND[1] * c], long, tall, bend, lean, phase: [i * 1.7, i * 2.9], reach: long * (0.5 + bend + WANDER.a[0] + WANDER.b[0]) + Math.max(tall / PROFILE.back, lee) + 2 };
  });
}
// The crest's downwind offset at u (-1 to 1 along it), and its first and second rates of change with u.
function line(cr: Crest, u: number): [number, number, number] {
  const L = cr.long, h = cr.bend * L * 0.5, [pa, pb] = cr.phase, [ka, fa] = WANDER.a, [kb, fb] = WANDER.b;
  const sa = Math.sin(fa * u + pa), ca = Math.cos(fa * u + pa), sb = Math.sin(fb * u + pb), cb = Math.cos(fb * u + pb);
  return [h * (u * u - 1 / 3) + ka * L * sa + kb * L * sb, 2 * h * u + ka * L * fa * ca + kb * L * fb * cb, 2 * h - ka * L * fa * fa * sa - kb * L * fb * fb * sb];
}

// One dune's height at a place: its crest's height where the place is nearest it, its back on the side the wind
// comes from, and on the other its slip face down into its hollow.
function oneDune(cr: Crest, x: number, z: number): number {
  const rx = x - cr.at[0], rz = z - cr.at[1], [wx, wz] = cr.wind, A = -rx * wz + rz * wx, D = rx * wx + rz * wz, half = cr.long / 2;
  const u = A / half;
  if (Math.abs(u) >= 1) return 0;
  const [d, d1] = line(cr, u), g1 = d1 / half, sd = (D - d) / Math.sqrt(1 + g1 * g1);
  const c = cr.tall * Math.max(0, 1 - u * u) * (1 + cr.lean * u);
  if (c < 1e-3) return 0;
  if (sd < 0) {
    const t = (-sd * PROFILE.back) / c;
    return t < 1 ? c * ((1 - PROFILE.round) * (1 - t) ** 2 * (1 + 2 * t) + PROFILE.round * (1 - t) ** 1.5) : 0;
  }
  const deep = PROFILE.dip * c, foot = (c + deep) / PROFILE.slip, v = Math.min(1, Math.max(0, (sd - foot) / (PROFILE.reach * c)));
  return Math.max(c - PROFILE.slip * sd, -deep * (1 - v * v * (3 - 2 * v)));
}

// A slow swell under the dunes, so the sand between them is never level.
export const swell = (x: number, z: number): number => 2.4 * Math.sin(x * 0.021 + z * 0.013 + 1.3) * Math.sin(z * 0.027 - x * 0.009 + 0.4) + 1.1 * Math.sin(x * 0.052 - z * 0.031 + 2.1) * Math.sin(z * 0.061 + x * 0.017);

let made: Crest[] | null = null;
// The desert's relief over the dome at a place, before the desert's own mask is laid on it.
export function relief(x: number, z: number): number {
  made ??= crests();
  let up = 0, down = 0;
  for (const cr of made) {
    if (Math.hypot(x - cr.at[0], z - cr.at[1]) > cr.reach) continue;
    const h = oneDune(cr, x, z);
    if (h > up) up = h;
    if (h < down) down = h;
  }
  return up + down + swell(x, z);
}

// The crests as a float texture for the shader, a row for each dune: (x, z, wind), (long, tall, bend, lean),
// (phase, reach, 0).
export const ROW = 3;
export function crestTexels(): Float32Array {
  const cs = crests(), data = new Float32Array(cs.length * ROW * 4);
  cs.forEach((cr, d) => data.set([...cr.at, ...cr.wind, cr.long, cr.tall, cr.bend, cr.lean, ...cr.phase, cr.reach, 0], d * ROW * 4));
  return data;
}

// ---------------------------------------------------------------------------------------------------------------
// The broken front. Near the land's edge its ground is cut into slabs, each dropped and tipped toward the edge by
// more the nearer the edge it lies, as ground at a break is: how large a slab is, how far in from the edge the break
// reaches, how far the slabs at the very edge drop and how steeply they tip, and how wide a crack between two is.
export const BREAK = { cell: 8, reach: 30, drop: 2.2, tip: 0.13, crack: 0.32 } as const;

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
vec3 landLine(vec4 b, vec4 c, float u) {
	float L = b.x, h = b.z * L * 0.5;
	float sa = sin(${WANDER.a[1].toFixed(4)} * u + c.x), ca = cos(${WANDER.a[1].toFixed(4)} * u + c.x), sb = sin(${WANDER.b[1].toFixed(4)} * u + c.y), cb = cos(${WANDER.b[1].toFixed(4)} * u + c.y);
	const float KA = ${WANDER.a[0].toFixed(4)}, FA = ${WANDER.a[1].toFixed(4)}, KB = ${WANDER.b[0].toFixed(4)}, FB = ${WANDER.b[1].toFixed(4)};
	return vec3(h * (u * u - 1.0 / 3.0) + KA * L * sa + KB * L * sb, 2.0 * h * u + KA * L * FA * ca + KB * L * FB * cb, 2.0 * h - KA * L * FA * FA * sa - KB * L * FB * FB * sb);
}
float landDune(vec2 p, int d) {
	vec4 a = texelFetch(uCrest, ivec2(0, d), 0), b = texelFetch(uCrest, ivec2(1, d), 0), c = texelFetch(uCrest, ivec2(2, d), 0);
	vec2 r = p - a.xy;
	if (dot(r, r) > c.z * c.z) return 0.0;
	float A = -r.x * a.w + r.y * a.z, D = r.x * a.z + r.y * a.w, hl = b.x * 0.5;
	float u = A / hl;
	if (abs(u) >= 1.0) return 0.0;
	vec3 l = landLine(b, c, u);
	float g1 = l.y / hl, sd = (D - l.x) / sqrt(1.0 + g1 * g1);
	float h = b.y * max(0.0, 1.0 - u * u) * (1.0 + b.w * u);
	if (h < 1e-3) return 0.0;
	if (sd < 0.0) {
		float t = -sd * ${PROFILE.back.toFixed(4)} / h;
		return t < 1.0 ? h * ((1.0 - ${PROFILE.round.toFixed(4)}) * (1.0 - t) * (1.0 - t) * (1.0 + 2.0 * t) + ${PROFILE.round.toFixed(4)} * pow(1.0 - t, 1.5)) : 0.0;
	}
	float deep = ${PROFILE.dip.toFixed(4)} * h, foot = (h + deep) / ${PROFILE.slip.toFixed(4)}, v = clamp((sd - foot) / (${PROFILE.reach.toFixed(4)} * h), 0.0, 1.0);
	return max(h - ${PROFILE.slip.toFixed(4)} * sd, -deep * (1.0 - v * v * (3.0 - 2.0 * v)));
}
float landSwell(vec2 p) { return 2.4 * sin(p.x * 0.021 + p.y * 0.013 + 1.3) * sin(p.y * 0.027 - p.x * 0.009 + 0.4) + 1.1 * sin(p.x * 0.052 - p.y * 0.031 + 2.1) * sin(p.y * 0.061 + p.x * 0.017); }
float landRelief(vec2 p) {
	float up = 0.0, down = 0.0;
	for (int d = 0; d < ${DUNES.length}; d++) { float h = landDune(p, d); up = max(up, h); down = min(down, h); }
	return up + down + landSwell(p);
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
