// The land's own shape: the dunes, and the broken ground along the land's front edge. Its make script
// (scripts/world/parts/land/make.mjs) builds the mesh from these functions, and its shader works the slopes out per
// pixel from the same numbers (GLSL below), so a crest is as sharp at three times zoom as it is in the mesh. It
// imports nothing, so node reads it as it is.

// The maps the land is drawn with (land-a.png, land-light.png) cover x and z from lo to lo + size, in units.
export const MAP = { lo: -664, size: 1328 } as const;

// The way the wind that laid the dunes blows: toward the visitor and to the left, away from the moon. Their low
// backs face the moon, and their slip faces face the visitor, as wide dark bands, as picture 9's do. Turned any
// nearer the visitor a slip face at the angle sand rests at would catch the moon.
export const WIND = [-0.6, 0.8] as const;

// A dune's profile: the slope of its slip face (the angle sand rests at), the mean slope of its back, how its back
// rounds over to the crest (the share of it that stays sloped right up to the brink), how far its hollow sinks under the sand round it and how long the hollow runs out, both
// shares of its height.
export const PROFILE = { slip: 0.66, back: 0.2, round: 0.3, dip: 0.4, reach: 2.0 } as const;
// Each dune: where its crest's middle is (x, z), how long the crest is, how tall it is at its highest, how far its
// horns trail downwind as a share of its half length, how far it is turned from square to the wind in degrees, and
// how far its height leans toward one horn (-1 to 1). Laid to picture 9's dark slip faces with npm run match.
export type Dune = readonly [x: number, z: number, long: number, tall: number, bend: number, turn: number, lean: number];
export const DUNES: readonly Dune[] = [
  [366, 140, 90, 17, 0.45, 0, 0.2],
  [455, 95, 85, 13, 0.5, 5, -0.2],
  [480, 320, 150, 22, 0.35, -8, 0.4],
  [495, -50, 80, 14, 0.45, 0, 0],
  [570, -80, 80, 15, 0.45, 5, 0.2],
  [625, -120, 60, 13, 0.4, 0, 0],
  [560, 170, 120, 18, 0.4, -5, -0.3],
  [320, 300, 70, 10, 0.5, 10, 0.3],
  [410, 230, 70, 11, 0.5, -10, 0],
  [600, 60, 90, 16, 0.45, 8, 0.2],
  [430, -20, 60, 10, 0.5, 0, 0],
  [350, 40, 60, 9, 0.5, 0, 0],
];
// How many straight pieces each crest is drawn with.
export const PIECES = 10;

// The crest of each dune as PIECES + 1 points, and the circle outside which the dune adds nothing.
export interface Crest { points: [number, number][]; tall: number; lean: number; at: [number, number]; reach: number }
export function crests(): Crest[] {
  return DUNES.map(([x, z, long, tall, bend, turn, lean], i) => {
    const a = (turn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const wx = WIND[0] * c - WIND[1] * s, wz = WIND[0] * s + WIND[1] * c, px = -wz, pz = wx;
    const points: [number, number][] = [];
    for (let k = 0; k <= PIECES; k++) {
      const t = (k / PIECES) * 2 - 1, across = (t * long) / 2, down = bend * (long / 2) * (t * t - 1 / 3) + 0.04 * long * Math.sin(3.1 * t + i * 1.7);
      points.push([x + px * across + wx * down, z + pz * across + wz * down]);
    }
    let r = 0;
    for (const [qx, qz] of points) r = Math.max(r, Math.hypot(qx - x, qz - z));
    const lee = (tall * (1 + PROFILE.dip)) / PROFILE.slip + PROFILE.reach * tall;
    return { points, tall, lean, at: [x, z], reach: r + Math.max(tall / PROFILE.back, lee) + 2 };
  });
}

// One dune's height at a place: its crest's height where the place is nearest it, its back on the side the wind
// comes from, and on the other its slip face down into its hollow.
function oneDune(cr: Crest, x: number, z: number): number {
  const p = cr.points;
  let best = Infinity, sd = 0, s = 0;
  for (let k = 0; k < PIECES; k++) {
    const [ax, az] = p[k], [bx, bz] = p[k + 1], ex = bx - ax, ez = bz - az, l2 = Math.max(ex * ex + ez * ez, 1e-6);
    const t = Math.min(1, Math.max(0, ((x - ax) * ex + (z - az) * ez) / l2)), cx = ax + ex * t, cz = az + ez * t;
    const d2 = (x - cx) ** 2 + (z - cz) ** 2;
    if (d2 < best) {
      best = d2;
      let nx = -ez, nz = ex;
      if (nx * WIND[0] + nz * WIND[1] < 0) { nx = -nx; nz = -nz; }
      sd = ((x - cx) * nx + (z - cz) * nz >= 0 ? 1 : -1) * Math.sqrt(d2);
      s = (k + t) / PIECES;
    }
  }
  const c = cr.tall * Math.max(0, 1 - (2 * s - 1) ** 2) ** 0.7 * (1 + cr.lean * (2 * s - 1));
  if (c < 1e-3) return 0;
  if (sd < 0) {
    const u = (-sd * PROFILE.back) / c;
    return u < 1 ? c * ((1 - PROFILE.round) * (1 - u) ** 2 * (1 + 2 * u) + PROFILE.round * (1 - u) ** 1.5) : 0;
  }
  const deep = PROFILE.dip * c, foot = (c + deep) / PROFILE.slip, v = Math.min(1, Math.max(0, (sd - foot) / (PROFILE.reach * c)));
  return Math.max(c - PROFILE.slip * sd, -deep * (1 - v * v * (3 - 2 * v)));
}

// A slow swell under the dunes, so the sand between them is never level.
export const swell = (x: number, z: number): number => 1.8 * Math.sin(x * 0.021 + z * 0.013 + 1.3) * Math.sin(z * 0.027 - x * 0.009 + 0.4);

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

// The crests as a float texture for the shader: a row for each dune, PIECES + 1 points as (x, z) pairs packed two to
// a texel, then (tall, lean, x, z) and (reach, 0, 0, 0).
export const ROW = Math.ceil((PIECES + 1) / 2) + 2;
export function crestTexels(): Float32Array {
  const cs = crests(), data = new Float32Array(cs.length * ROW * 4);
  cs.forEach((cr, d) => {
    const row = d * ROW * 4;
    cr.points.forEach(([x, z], k) => data.set([x, z], row + k * 2));
    data.set([cr.tall, cr.lean, cr.at[0], cr.at[1]], row + (ROW - 2) * 4);
    data.set([cr.reach, 0, 0, 0], row + (ROW - 1) * 4);
  });
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
float landDune(vec2 p, int d) {
	vec4 m = texelFetch(uCrest, ivec2(${ROW - 2}, d), 0), r = texelFetch(uCrest, ivec2(${ROW - 1}, d), 0);
	if (distance(p, m.zw) > r.x) return 0.0;
	float best = 1e20, sd = 0.0, s = 0.0;
	vec2 a = texelFetch(uCrest, ivec2(0, d), 0).xy;
	for (int k = 0; k < ${PIECES}; k++) {
		vec4 q = texelFetch(uCrest, ivec2((k + 1) / 2, d), 0);
		vec2 b = ((k + 1) % 2 == 0) ? q.xy : q.zw, e = b - a;
		float l2 = max(dot(e, e), 1e-6), t = clamp(dot(p - a, e) / l2, 0.0, 1.0);
		vec2 c = a + e * t, w = p - c;
		float d2 = dot(w, w);
		if (d2 < best) {
			best = d2;
			vec2 n = vec2(-e.y, e.x);
			if (dot(n, WIND) < 0.0) n = -n;
			sd = (dot(w, n) >= 0.0 ? 1.0 : -1.0) * sqrt(d2);
			s = (float(k) + t) / ${PIECES}.0;
		}
		a = b;
	}
	float x2 = 2.0 * s - 1.0, c = m.x * pow(max(0.0, 1.0 - x2 * x2), 0.7) * (1.0 + m.y * x2);
	if (c < 1e-3) return 0.0;
	if (sd < 0.0) {
		float u = -sd * ${PROFILE.back.toFixed(4)} / c;
		return u < 1.0 ? c * ((1.0 - ${PROFILE.round.toFixed(4)}) * (1.0 - u) * (1.0 - u) * (1.0 + 2.0 * u) + ${PROFILE.round.toFixed(4)} * pow(1.0 - u, 1.5)) : 0.0;
	}
	float deep = ${PROFILE.dip.toFixed(4)} * c, foot = (c + deep) / ${PROFILE.slip.toFixed(4)}, v = clamp((sd - foot) / (${PROFILE.reach.toFixed(4)} * c), 0.0, 1.0);
	return max(c - ${PROFILE.slip.toFixed(4)} * sd, -deep * (1.0 - v * v * (3.0 - 2.0 * v)));
}
float landSwell(vec2 p) { return 1.8 * sin(p.x * 0.021 + p.y * 0.013 + 1.3) * sin(p.y * 0.027 - p.x * 0.009 + 0.4); }
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
