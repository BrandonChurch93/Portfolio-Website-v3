import { COURT, D2R, LAND, LIGHT, MOONWARD, PYRAMID, SCALE, WORLD } from '../../layout';
import { BREAK, GLSL, HEIGHT, MAP, ROLL, WIND } from './field';

// The land's shader, laid over the standard material: what each place is made of, worked out per pixel from the
// maps the make script wrote and from the land's own shape (./field.ts). Every pattern finer than a pixel fades to
// its mean, so nothing sparkles or swims at the page's size and there is more to find at three times.
//   the dunes: their slopes from the dune field itself, so crests are sharp at any size, with ripples across the
//     backs that face the wind, and finer, paler sand on the crests than in the hollows
//   the city's ground: dark stone flags laid square to the building whose lot they are in, setts along the street
//     where two lots meet, larger pale flags in the court before a great tower, rings of fine paving round the
//     spire with bronze laid in them, and the pyramid's own court
//   the belt: dry grass in the autumn browns, uneven, with flat stones set in it
//   the break: slabs cracked apart along the land's front edge, and the earth of every wall the break shows

export interface Counts { map: number; lots: number }

// Where each pixel's place on the sand is looked for along the eye's line: from this far before the mesh, in steps
// of this, at most so many.
const SEEK_EYE = [2.4, 0.4, 12] as const;
// How near the sand the grid has to say the eye's line is, past how far the grid may be out there (landHighM), for the
// dune field itself to be read there, in units.
const EYE_MARGIN = 0.12;
// How far the height grid may be out from the dune field: at the least, and for each unit its slope turns across
// one texel's neighbours.
const GRID_TRUST = [0.04, 0.35] as const;
// How far toward the moon its ray reads the dune field itself before it reads the grid.
const NEAR_SUN = 6;
// How deep under the sand the ray to the moon has to pass for a place to be as deep in the shadow as it gets.
const UNDER_MAX = 24;
// The pale strip along the land's front edge: full this far in from the edge, and gone this far in.
const STRIP = [9, 17] as const;
// The slabs the strip's broken ground lies in, large and small, in units.
const GROUND_SLAB = [7, 2.6] as const;
// Where the sand over the planet's shoulder breaks off: how far down from the land's edge its lip is at the least, how
// much further it reaches in places, and how far under that patches of it lie on the stone, in units. And the same
// for the sand spilled over the torn lip at the front. (Sand whole for nine units down the side, its foot hung in
// scallops, read as icing dripping down a cake.)
const DRAPE_LIP = [5.8, 4, 8], SPILL_LIP = [0.3, 1.6, 2.5];

const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);

export const VERT_PARS = /* glsl */ `
uniform vec3 uAt;
uniform float uSize;
attribute float drape;
varying vec3 vUnit;
varying float vDrape;`;
export const VERT = /* glsl */ `
vUnit = uAt + position * uSize;
vDrape = drape;`;

export function fragPars(n: Counts): string {
  const pc = Math.cos(PYRAMID.turn * D2R), ps = Math.sin(PYRAMID.turn * D2R);
  return /* glsl */ `
varying vec3 vUnit;
varying float vDrape;
uniform sampler2D uMapA;
uniform sampler2D uMapB;
uniform sampler2D uLight;
uniform sampler2D uLots;
uniform sampler2D uTowers;
uniform sampler2D uHeight;
uniform vec3 uRock, uSand, uSandHi, uSandRim, uBare, uSandDeep, uPave, uPavePale, uCourt, uGrass, uGrassDry, uGrassDeep, uEarth, uStone, uBronze;
const float MAP_LO = ${f(MAP.lo)}, MAP_SIZE = ${f(MAP.size)}, MAP_N = ${f(n.map)}, LOTS_N = ${f(n.lots)};
const float LAND_BOUNCE = ${f(LIGHT.bounce)};
// The share of the night's soft light the sand keeps: the night is lit from the visitor's side, and in full it
// turned the dunes' slip faces, which face the visitor, a pale grey in place of a deep warm shadow.
const float SAND_NIGHT = 0.008;
// The share of the night the sand mirrors. Seen nearly edge on, its sheen laid a grey over every shadow on it.
const float SAND_SHEEN = 0.15;
// The share of the stored bounce the sand keeps. In full it lifted every slip face and every shadow on the sand to
// a mid brown, where his dunes have them near black.
const float SAND_BOUNCE = 0.25, SAND_TINT = 2.0;
// The moon on the sand. Lit sand is pale gold, his dunes' (213, 157, 100) to (229, 175, 110), and raising the sand's
// albedo to reach it raised its shadows with it.
const float SAND_SUN = 1.0;
// What the lit sand throws into the shadows on it, as irradiance, at a shadow's very edge; the share of it left in
// the deepest shade; and how much sand the ray to the moon passes under (its depth summed along it, in units
// squared) for it to fall to a third.
const vec3 SAND_GLOW = vec3(0.40, 0.25, 0.115);
const float SAND_DEEP = 0.14;
// What a slip face keeps of it: right under its crest, at its toe, and the more toward its horns.
const vec3 HOLLOW = vec3(0.12, 0.42, 0.14);
// How far under the sand the ray to the moon passes for a cast shadow on the floor to fall to a third of the light
// at its far edge.
const float CAST_REACH = 7.0;
// How much of the upper back of a tall dune goes to pale gold.
const float SAND_HI = 0.9;
// How wide the bright line along each crest is, in units, at the least.
const float CREST_LINE = 0.45;
// The moon's ray's slack over the sand it passes, in units: at its start and for each unit along it.
const vec2 RAY_SLACK = vec2(0.05, 0.012);
// How far a ripple moves a shadow's edge, as a share of the edge's softness.
const float SHADOW_RIPPLE = 0.6;
const vec2 GRID_TRUST = vec2(${f(GRID_TRUST[0])}, ${f(GRID_TRUST[1])});
const vec3 MOON_TO = normalize(vec3(${MOONWARD.map((v) => f(v)).join(', ')}));
${GLSL}
vec3 landAlbedo;
float landRough, landMetal;
vec3 landN;
float landFace = 0.0, landSandK = 0.0, landSeen = 1.0, landDrape = 0.0, landRipple = 0.0, landCrestLine = 0.0, landHollow = 0.0;
float landFoot = 0.1;
vec3 landSunAt = vec3(0.0), landNs = vec3(0.0, 1.0, 0.0);
// On a wall, the way into the land: its stored light is read a few units inside the edge, where the maps hold the
// land's own light and not their neighbours' copied out past it (which drew a blocky camouflage on the lip).
vec2 landInward = vec2(0.0);
bool landRecv;
// How deep the grooves down a slip face and the ripples across the lit sand are cut.
const float GROOVE = 0.22, RIPPLE = 0.022;
// How deep a chute down a slip face is, in units.
const float CHUTE = 0.55;
// How sharp the edge of a shadow on the sand is: one over the tangent of the moon's angular radius.
const float SUN_EDGE = ${f(1 / Math.tan(LIGHT.moon.spread * D2R))};

float landNoise(vec2 p) {
	vec2 i = floor(p), u = fract(p);
	u = u * u * (3.0 - 2.0 * u);
	ivec2 k = ivec2(i);
	float a = landHash(k.x, k.y, 21u), b = landHash(k.x + 1, k.y, 21u), c = landHash(k.x, k.y + 1, 21u), d = landHash(k.x + 1, k.y + 1, 21u);
	return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// How much of a pattern this fine survives at this pixel: 1 when it is many pixels across, 0 under one.
float landKeep(float period, float fw) { return 1.0 - smoothstep(0.35, 0.9, fw / max(period, 1e-4)); }
// A joint of this half width at this distance, against the pixel's own width.
float landLine(float d, float w, float fw) { return 1.0 - smoothstep(w - fw, w + fw, d); }

// Stones laid in courses: which stone a place is on, how far it is from the stone's nearest joint along each axis,
// and toward which side.
vec2 landTiles(vec2 q, vec2 size, float bond, out vec2 dist, out vec2 side) {
	float row = floor(q.y / size.y);
	q.x += bond * row * size.x;
	vec2 id = floor(q / size), r = q - id * size;
	dist = min(r, size - r);
	side = vec2(r.x < size.x * 0.5 ? -1.0 : 1.0, r.y < size.y * 0.5 ? -1.0 : 1.0);
	return id;
}

// One paving: its stones' joints and rounded edges, and each stone's own tone and tilt. q is the place in the
// pattern's own frame, ax and ay its axes in the world. Adds the slope of the stones to g and returns the stone.
vec3 landPaving(vec2 q, vec2 ax, vec2 ay, vec2 size, float bond, float jw, vec3 base, float vary, uint seed, inout vec2 g, inout float joint) {
	vec2 dist, side;
	vec2 id = landTiles(q, size, bond, dist, side);
	vec2 fw = max(fwidth(q), vec2(1e-4));
	float keep = landKeep(min(size.x, size.y), max(fw.x, fw.y));
	ivec2 k = ivec2(id);
	float h1 = landHash(k.x, k.y, seed), h2 = landHash(k.x, k.y, seed + 7u), h3 = landHash(k.x, k.y, seed + 13u);
	float j = max(landLine(dist.x, jw, fw.x), landLine(dist.y, jw, fw.y)) * keep;
	joint = max(joint, j);
	// The stone's rounded edge, a little wider than the joint, falling into it.
	float bw = jw * 3.5 + 0.08;
	vec2 fall = vec2(1.0 - smoothstep(0.0, bw, dist.x), 1.0 - smoothstep(0.0, bw, dist.y)) * 0.35 * keep;
	vec2 tilt = (vec2(h2, h3) - 0.5) * 0.06 * keep;
	vec2 slope = -side * fall + tilt;
	g += ax * slope.x + ay * slope.y;
	return base * mix(1.0, 0.72 + 0.5 * h1, keep * vary) * mix(vec3(1.0), vec3(1.04, 1.0, 0.95), step(0.7, h2) * keep * vary);
}

vec4 landTower(int i, out vec4 more) {
	more = texelFetch(uTowers, ivec2(1, i), 0);
	return texelFetch(uTowers, ivec2(0, i), 0);
}
// A place in a building's own frame, and how far it is from the building's walls.
vec2 landLocal(vec2 p, vec4 t, vec4 m, out float out1) {
	vec2 d = p - t.xy, l = vec2(d.x * t.z - d.y * t.w, d.x * t.w + d.y * t.z);
	out1 = length(max(abs(l) - m.xy * 0.5, 0.0));
	return l;
}


// The soft chutes that avalanches leave down a slip face, a few units wide, running from under the crest to the
// toe and wandering a little as they go: 0 between them, 1 down the middle of one.
float landChuteAt(float along, float down, float which) {
	float a = along / 9.0 + 0.8 * landNoise(vec2(along / 17.0, down / 9.0 + which * 5.0)) + which * 13.0;
	float c = landNoise(vec2(a, down / 40.0 + which * 2.0)), k = landNoise(vec2(floor(a) * 0.37, which));
	return smoothstep(0.55, 0.9, c) * (0.4 + 0.6 * k);
}
float onBackOf(float which, vec4 info) { return which >= 0.0 && info.y < 0.5 && info.x > 0.05 ? 1.0 : 0.0; }
// What is finer than the dune field on a slip face, as a height: the grooves that avalanches cut down it, deepening
// down it and gone at its toe, and the chutes, each fading to its mean as it nears a pixel. along and down are where
// the place is on the face, in units.
float landDetail(float along, float down, float which, float tall, float fw) {
	float n = landNoise(vec2(along / 2.4 + 0.6 * landNoise(vec2(along / 9.0, down / 6.0)), down / 11.0 + which * 7.0));
	float n2 = landNoise(vec2(along / 1.1, down / 5.0 + which * 3.0));
	float amp = smoothstep(0.4, 2.5, down) * smoothstep(0.0, 1.6, tall);
	float d = -amp * (GROOVE * (1.0 - abs(2.0 * n - 1.0)) * landKeep(2.4, 2.2 * fw) + 0.4 * GROOVE * n2 * landKeep(1.1, 2.2 * fw));
	return d - smoothstep(1.0, 8.0, down) * smoothstep(0.0, 3.0, tall) * CHUTE * landChuteAt(along, down, which);
}
// The sand's surface at p, without and with what is finer than the dune field, and the slope of the finer part.
vec2 landSandAt(vec2 p, float inside, float fw, out vec2 gd) {
	float r = landRelief(p, inside), d = 0.0;
	vec4 I = landInfo;
	gd = vec2(0.0);
	if (I.y > 0.5 && landWhich >= 0.0) {
		vec4 a = texelFetch(uCrest, ivec2(0, int(landWhich)), 0), b = texelFetch(uCrest, ivec2(1, int(landWhich)), 0);
		float along = I.z * b.x, down = I.w;
		d = landDetail(along, down, landWhich, I.x, fw);
		const float H = 0.05;
		gd = (landDetail(along + H, down, landWhich, I.x, fw) - d) / H * vec2(-a.w, a.z) + (landDetail(along, down + H, landWhich, I.x, fw) - d) / H * landDir;
	}
	return vec2(r, r + d);
}
// The height of the sand's true surface at q.
float landTop(vec2 q, bool fine) {
	vec3 A = texture(uMapA, (q - MAP_LO) / MAP_SIZE).rgb;
	return ${f(-WORLD.top)} + sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(q, q))) + A.g * landRelief(q, A.b * 64.0, fine);
}
// The sand's height over the dome at q, from the grid worked out when the land was built.
float landHigh(vec2 q) {
	vec2 u = (q - vec2(${f(HEIGHT.lo[0])}, ${f(HEIGHT.lo[1])})) / vec2(${f(HEIGHT.size[0])}, ${f(HEIGHT.size[1])});
	return u.x < 0.0 || u.y < 0.0 || u.x > 1.0 || u.y > 1.0 ? 0.0 : texture(uHeight, u).r;
}
// How much of the moon reaches a place on the sand: a ray toward it over the dune field, its edge as soft as the
// moon's disc is wide, so a shadow is sharp by the crest that throws it and softer far from it. The moon is low, and
// a crest throws its shadow two and a half times as far as it is tall, across the floor and up the next dune: the
// ray runs until it stands higher over the dome than any sand.
// foot is how far the ray's start moves in height across one pixel: seen nearly edge on a pixel of the floor is
// several units deep, and a shadow's edge sharper than that was drawn as a comb of jagged steps. It softens only
// what stands well past the pixel's own depth: nearer, the sand the ray sets out over is not something it passes.
float landDepth = 0.0;
// The same, and how far from the dune field itself the grid may be there: it is the field at its texels and a plane
// between them, so it is out by about a quarter of how much the slope turns across a texel, which is nothing on the
// floor and on a back and a few tenths at a crest or a toe. Where the grid says the sand is further off than that, the
// field is not read.
float landHighM(vec2 q, out float m) {
	vec2 u = (q - vec2(${f(HEIGHT.lo[0])}, ${f(HEIGHT.lo[1])})) / vec2(${f(HEIGHT.size[0])}, ${f(HEIGHT.size[1])});
	if (u.x < 0.0 || u.y < 0.0 || u.x > 1.0 || u.y > 1.0) { m = 0.0; return 0.0; }
	vec2 d = 1.0 / vec2(${f(HEIGHT.texels[0])}, ${f(HEIGHT.texels[1])});
	float h = texture(uHeight, u).r;
	float bend = texture(uHeight, u + vec2(d.x, 0.0)).r + texture(uHeight, u - vec2(d.x, 0.0)).r + texture(uHeight, u + vec2(0.0, d.y)).r + texture(uHeight, u - vec2(0.0, d.y)).r - 4.0 * h;
	m = GRID_TRUST.x + GRID_TRUST.y * abs(bend);
	return h;
}
float landSun(vec3 at, float lift, float foot, float ripple) {
	float res = 1.0, t = 0.8 + lift, under = 0.0;
	at.y += 0.3 * lift;
	for (int i = 0; i < 96; i++) {
		vec3 q = at + MOON_TO * t;
		float over = q.y - (${f(-WORLD.top)} + sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(q.xz, q.xz))));
		if (over > ${f(HEIGHT.most)}) break;
		// The first few units are read from the dune field itself: the grid rounds a toe up by a little, and a ray that
		// set out under it was taken as shadowed, as a row of dark teeth along each toe.
		// Near the place, where the grid is not to be trusted (landHighM), the field is read, eased into the grid's
		// reading so the ray's answer never jumps where one gives way to the other.
		float m, hs = landHighM(q.xz, m);
		float trust = t < ${f(NEAR_SUN)} ? smoothstep(m, 2.0 * m + 0.05, over - hs) : 1.0;
		if (trust < 1.0) { vec3 A = texture(uMapA, (q.xz - MAP_LO) / MAP_SIZE).rgb; hs = mix(A.g * landRelief(q.xz, A.b * 64.0, false), hs, trust); }
		// A little slack that grows along the ray, so a ray that only grazes the sand it sets out over is not taken as
		// shadowed: the grid and the field differ by a few hundredths, and a dip that small turned single pixels of the
		// lit floor dark, scattered, as specks that crawl in a scroll.
		float dh = over - hs + RAY_SLACK.x + RAY_SLACK.y * t;
		// How far into the shadow the place is: the deepest the ray passes under the first sand it meets, which is near
		// nothing by the shadow's far edge and grows toward the dune that throws it. A sum of the depth along the ray,
		// stepped by how deep it was, jumped from pixel to pixel where the number of steps changed, and drew the
		// lines of equal depth as dotted rings on every slip face.
		if (dh > 0.0 && under > 0.0) break;
		under = max(under, -dh);
		if (under > ${f(UNDER_MAX)}) break;
		// Softer for the first few units: a ray that sets out along a slope nearly as steep as the moon is high (the
		// inner faces of a crescent's horns) only grazes it, and a hard test there came out as grain.
		res = min(res, dh / max((t + 4.0) / SUN_EDGE, t > 3.0 + 7.0 * foot ? foot : 0.0));
		// The step grows with the height over the sand and never jumps with it: a step that was one size just under the
		// sand and another just over moved every later sample at once, and the deepest the ray passed came out in rings
		// of equal depth with dotted edges across every cast shadow.
		t += min(0.75 + 0.9 * max(dh, 0.0), 8.0);
	}
	landDepth = under;
	// The shadow's edge is centred on the line the crest throws, with the ripples on the sand it falls on breaking it:
	// the side of a ripple turned to the moon comes out of the shadow first.
	return smoothstep(-1.0, 1.0, res + SHADOW_RIPPLE * ripple);
}

void landSurface() {
	vec2 p = vUnit.xz, uv = (p - MAP_LO) / MAP_SIZE;
	vec3 A = texture(uMapA, uv).rgb;
	float grass = A.r, sand = A.g, inside = A.b * 64.0, dust = texture(uMapB, uv).g;
	vec3 nG = (vec4(vNormal, 0.0) * viewMatrix).xyz;
	nG = dot(nG, nG) > 1e-10 ? normalize(nG) : vec3(0.0, 1.0, 0.0);
	// The sand's lip down the planet's side: thick at the shoulder, thinning out down the side in streaks along the
	// hollows of the stone, raggedly, until only the stone is left.
	if (vDrape > 0.005) {
		vec2 q = vec2(atan(vUnit.x, vUnit.z) * ${f(WORLD.half)}, vUnit.y);
		// How far down from the land's edge, in units: the floor's sand ends there on a crisp, broken lip, a little
		// further down in places, and under it lies on the stone only in a few uneven patches, wider than they are tall,
		// as sand that has slid onto ledges, fewer and smaller further down.
		float down = ${f(-WORLD.top)} + sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(vUnit.xz, vUnit.xz))) - vUnit.y;
		bool shoulder = length(vUnit.xz) > ${f(LAND.rim - 0.5)};
		float fw = max(fwidth(down), 1e-3);
		float lipAt = (shoulder ? ${f(DRAPE_LIP[0])} : ${f(SPILL_LIP[0])}) + (shoulder ? ${f(DRAPE_LIP[1])} : ${f(SPILL_LIP[1])}) * (0.6 * landNoise(vec2(q.x / 9.0, 0.5)) + 0.4 * landNoise(vec2(q.x / 2.2, 3.5)));
		float lipK = 1.0 - smoothstep(lipAt - fw, lipAt + fw, down);
		float pn = 0.65 * landNoise(vec2(q.x / 6.5, down / 1.7) + 4.0) + 0.35 * landNoise(vec2(q.x / 2.1, down / 0.8) + 9.0);
		float under = down - lipAt, reach = shoulder ? ${f(DRAPE_LIP[2])} : ${f(SPILL_LIP[2])};
		float cut = 0.5 + 0.38 * clamp(under / reach, 0.0, 1.0);
		float lies = smoothstep(cut - 0.02, cut + 0.02, pn) * step(0.0, under) * step(under, reach);
		if (max(lipK, lies) < 0.5) discard;
		// Thinner in a patch, where the stone's own color shows through it.
		float thin = (1.0 - lipK) * (1.0 - smoothstep(cut, cut + 0.12, pn));
		vec3 grit = uSandRim * (0.94 + 0.12 * landNoise(q / 0.6)) * mix(1.0, 0.85, thin);
		landAlbedo = mix(grit, uBare, 0.3 * thin);
		landN = nG;
		landRough = 0.95;
		landMetal = 0.0;
		landDrape = 1.0;
		return;
	}
	// A wall the break or the edge shows. In the desert only the turned down edge is one: there the mesh's own
	// normals are rough where the reduction left a thin triangle, and the sand's slopes are worked out exactly.
	float wall = (1.0 - smoothstep(0.4, 0.65, nG.y)) * mix(1.0, 1.0 - smoothstep(1.0, 3.0, inside), smoothstep(0.0, 0.5, sand));
	vec2 g = vec2(0.0);
	float joint = 0.0;
	landRough = 0.85;
	landMetal = 0.0;

	// The city's ground.
	vec3 city = uPave;
	float r = length(p);
	if (r < ${f(COURT)}) {
		// Rings of fine paving round the spire, each ring of stones the same size, with bronze laid between some.
		float ring = floor(r / 1.5), n = max(6.0, floor(6.2832 * (ring + 0.5) * 1.5 / 2.1));
		float a = (atan(p.y, p.x) + 3.14159265) / 6.2832 * n + 0.5 * mod(ring, 2.0);
		vec2 q = vec2(a / n * 6.2832 * (ring + 0.5) * 1.5, r), rad = vec2(-p.y, p.x) / max(r, 1e-3), out1 = p / max(r, 1e-3);
		city = landPaving(q, rad, out1, vec2(6.2832 * (ring + 0.5) * 1.5 / n, 1.5), 0.0, 0.06, mix(uPave, uPavePale, 0.35), 0.8, 31u, g, joint);
		float fw = fwidth(r);
		float inlay = 0.0;
		for (int k = 0; k < 3; k++) { float at = k == 0 ? 17.0 : (k == 1 ? 36.5 : 54.5); inlay = max(inlay, landLine(abs(r - at), 0.32, fw)); }
		inlay *= landKeep(0.64, fw * 0.5);
		city = mix(city, uBronze, inlay);
		landMetal = inlay * 0.9;
		landRough = mix(0.7, 0.32, inlay);
	} else {
		vec2 pq = p - vec2(${f(PYRAMID.x)}, ${f(PYRAMID.z)});
		vec2 pl = vec2(pq.x * ${f(pc)} - pq.y * ${f(ps)}, pq.x * ${f(ps)} + pq.y * ${f(pc)});
		if (max(abs(pl.x), abs(pl.y)) < ${f(PYRAMID.court)}) {
			// The pyramid's court: large pale flags square to it, with a border of long stones.
			vec2 ax = vec2(${f(pc)}, ${f(-ps)}), ay = vec2(${f(ps)}, ${f(pc)});
			float rim = ${f(PYRAMID.court)} - max(abs(pl.x), abs(pl.y));
			if (rim < 3.2) city = landPaving(abs(pl.x) > abs(pl.y) ? pl.yx : pl, abs(pl.x) > abs(pl.y) ? ay : ax, abs(pl.x) > abs(pl.y) ? ax : ay, vec2(5.0, 3.2), 0.5, 0.07, uCourt * 0.85, 0.5, 41u, g, joint);
			else city = landPaving(pl, ax, ay, vec2(5.2, 5.2), 0.0, 0.07, uCourt, 0.6, 43u, g, joint);
		} else {
			vec3 lt = texelFetch(uLots, ivec2(clamp(uv, 0.0, 0.9999) * LOTS_N), 0).rgb * 255.0;
			int i1 = int(lt.r + 0.5) - 1, i2 = int(lt.g + 0.5) - 1;
			if (i1 < 0) city = landPaving(p, vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(3.4, 1.7), 0.5, 0.06, uPave, 0.7, 51u, g, joint);
			else {
				vec4 m1, m2;
				vec4 t1 = landTower(i1, m1);
				float f1, f2 = 1e9;
				vec2 l1 = landLocal(p, t1, m1, f1);
				vec4 t2 = t1;
				if (i2 >= 0) { t2 = landTower(i2, m2); landLocal(p, t2, m2, f2); }
				vec2 ax = vec2(t1.z, -t1.w), ay = vec2(t1.w, t1.z);
				if (f2 - f1 < 7.0) {
					// A street where two lots meet: setts in courses along it, and a line of long stones down its middle.
					vec2 along = normalize(vec2(-(t2.y - t1.y), t2.x - t1.x) + 1e-5), across = vec2(-along.y, along.x);
					vec2 q = vec2(dot(p, along), dot(p, across));
					city = landPaving(q, along, across, vec2(1.15, 0.85), 0.5, 0.05, uPave * 0.92, 0.9, 61u, g, joint);
					float mid = (f2 - f1) * 0.5;
					if (mid < 0.45) city = mix(city, uPave * 0.62, landKeep(0.9, fwidth(mid)));
				} else if (m1.z > 110.0 && l1.y > m1.y * 0.5 && l1.y < m1.y * 0.5 + 26.0 && abs(l1.x) < m1.x * 0.5 + 9.0) {
					// The court before a great tower: large pale flags, a border of dark stone round it.
					float rim = min(m1.y * 0.5 + 26.0 - l1.y, m1.x * 0.5 + 9.0 - abs(l1.x));
					city = landPaving(l1, ax, ay, vec2(4.4, 4.4), 0.0, 0.07, uCourt, 0.55, 71u, g, joint);
					city = mix(city, uPave * 0.55, landLine(rim, 0.9, fwidth(rim)) * landKeep(1.8, fwidth(rim)));
				} else city = landPaving(l1, ax, ay, vec2(3.4, 1.7), 0.5, 0.06, uPave, 0.75, 81u, g, joint);
			}
		}
		landRough = 0.78;
	}
	city *= mix(1.0, 0.42, joint);
	// Dust blown over the paving from the desert and up from the break.
	float dn = landNoise(p / 7.0) * 0.6 + landNoise(p / 2.3) * 0.4;
	city = mix(city, mix(uPavePale, uSand * 0.7, 0.5), clamp(dust * (0.4 + 0.6 * dn), 0.0, 0.6));
	// The strip along the land's front edge, in front of the trees: broken ground of the planet's own stone, as
	// picture 9 has it, heaped over by what the break threw up (the mesh holds the heaps). Slabs of it lie each at its
	// own tilt, so some catch the moon and some do not, with dark joints between and dust in the hollows. (Laid as
	// paving it was one flat grey brown band with a ruler clean edge.)
	float strip = max(1.0 - smoothstep(${f(STRIP[0])}, ${f(STRIP[1])}, inside + 6.0 * (landNoise(p / 13.0) - 0.5)), texture(uMapB, uv).b);
	if (strip > 0.0) {
		float fw = max(fwidth(p.x), fwidth(p.y));
		vec2 own, own2;
		float edge, edge2;
		landSlab(p * ${f(BREAK.cell / GROUND_SLAB[0])}, own, edge);
		landSlab(p * ${f(BREAK.cell / GROUND_SLAB[1])} + 17.0, own2, edge2);
		edge *= ${f(GROUND_SLAB[0] / BREAK.cell)};
		edge2 *= ${f(GROUND_SLAB[1] / BREAK.cell)};
		float joint = max(landLine(edge, 0.1 + 0.12 * own.y, fw) * landKeep(1.2, fw), 0.6 * landLine(edge2, 0.05, fw) * landKeep(0.7, fw));
		float grit = landNoise(p / 0.8) * landKeep(0.8, fw), blot = landNoise(p / 4.3 + own * 9.0);
		vec3 worn = mix(uPavePale * 0.62, uRock * 0.95, 0.25 + 0.5 * own.x) * (0.78 + 0.34 * blot) * (0.9 + 0.2 * grit);
		worn = mix(worn, uPavePale * 0.85, 0.35 * smoothstep(0.55, 0.85, landNoise(p / 6.0 + 3.0)));
		worn *= mix(1.0, 0.3, joint);
		// Each slab's tilt, and its edges worn round toward its joints.
		vec2 sg = (vec2(own.y, own2.x) - 0.5) * 0.5 * (1.0 - joint) + (vec2(landNoise(p / 1.6 + 5.0), landNoise(p / 1.6 + 9.0)) - 0.5) * 0.25 * landKeep(1.6, fw);
		city = mix(city, worn, strip);
		g = mix(g, sg, strip);
		// Rubble from the break lying on it, thicker toward the edge: small broken stones of the planet's own rock, each
		// lit on its side to the moon and dark on the other.
		float near = 1.0 - smoothstep(1.0, 10.0, inside + 3.0 * (landNoise(p / 5.0) - 0.5));
		if (near > 0.0) {
			float fw = max(fwidth(p.x), fwidth(p.y));
			for (int k = 0; k < 2; k++) {
				float sz = k == 0 ? 1.3 : 0.6;
				vec2 cell = floor(p / sz + float(k) * 0.5), f2 = p / sz + float(k) * 0.5 - cell;
				ivec2 ck = ivec2(cell);
				float h1 = landHash(ck.x, ck.y, 111u + uint(k)), h2 = landHash(ck.x, ck.y, 113u + uint(k)), h3 = landHash(ck.x, ck.y, 117u + uint(k));
				vec2 d = (f2 - (0.25 + 0.5 * vec2(h2, h3))) * sz;
				float r = sz * (0.16 + 0.22 * h1);
				float on = step(1.0 - near * (k == 0 ? 0.55 : 0.75), h1) * (1.0 - smoothstep(r - fw, r + fw, length(d))) * landKeep(sz * 0.5, fw);
				city = mix(city, uRock * (0.55 + 0.6 * h2), on);
				g += on * d / max(r, 1e-3) * 0.9;
			}
		}
	}

	// The belt under the trees: dark warm earth with tufts of dry grass in it, thicker in its clumps and bare in
	// places, every blade finer than a pixel fading to its mean.
	vec3 turf = vec3(0.0);
	vec2 gg = vec2(0.0);
	if (grass > 0.002) {
		float fw = max(fwidth(p.x), fwidth(p.y));
		float cover = smoothstep(0.32, 0.68, landNoise(p / 5.0) * 0.6 + landNoise(p / 1.7 + 5.3) * 0.4);
		float dry = landNoise(p / 9.0 + 3.1);
		vec3 earth = uEarth * (0.85 + 0.3 * landNoise(p / 2.6 + 9.0));
		// Tufts: each a small clump in a cell of its own, its blades drawn as fine streaks leaning out from its middle.
		vec2 cell = floor(p / 0.9), f2 = p / 0.9 - cell;
		ivec2 ck = ivec2(cell);
		vec2 c = 0.2 + 0.6 * vec2(landHash(ck.x, ck.y, 91u), landHash(ck.x, ck.y, 92u));
		vec2 d = f2 - c;
		float tuft = (1.0 - smoothstep(0.12, 0.42, length(d))) * step(0.25, landHash(ck.x, ck.y, 93u)) * landKeep(0.9, fw);
		float blades = landNoise(vec2(atan(d.y, d.x) * 5.0, length(d) * 2.0) + vec2(ck) * 1.7);
		vec3 straw = mix(uGrass, uGrassDry, smoothstep(0.3, 0.8, dry)) * (0.8 + 0.4 * blades);
		turf = mix(earth, mix(uGrassDeep, uGrass, 0.5 + 0.3 * dry), cover * 0.7);
		turf = mix(turf, straw, cover * tuft * 0.8);
		gg = d * tuft * 0.5 * cover;
	}

	// The desert.
	vec3 dune = vec3(0.0);
	vec2 gs = vec2(0.0);
	if (sand > 0.002) {
		// The mesh is the sand's surface to within a tenth of a unit. Seen nearly edge on, that tenth moved a crest's
		// pixels onto the wrong side of it, as a saw of teeth along each crest: each pixel is moved along the eye's own
		// line to where it first meets the sand's true surface, found by stepping out from the camera's side of the
		// mesh until the line is under the sand and then closing on the place between.
		{
			vec3 dv = normalize(vUnit - cameraPosition / ${f(SCALE)});
			// The grid is read first wherever it can be trusted (landHighM): on the floor and the backs, the field is read
			// only once, where the place is found.
			vec2 q0 = p + dv.xz * -${f(SEEK_EYE[0])};
			float m0, dome0 = ${f(-WORLD.top)} + sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(q0, q0)));
			float sa = -${f(SEEK_EYE[0])}, fa = vUnit.y + dv.y * sa - dome0 - landHighM(q0, m0);
			if (fa < m0 + ${f(EYE_MARGIN)}) fa = vUnit.y + dv.y * sa - landTop(q0, true);
			float mb = m0;
			if (fa > 0.0) {
				float sb = sa, fb = fa;
				// Stepped over the height grid, and read from the dune field itself only where the grid says the line is
				// within a little of the sand: the grid rounds a crest down by up to a few tenths, so it is never trusted to
				// say the line is under.
				for (int k = 0; k < ${SEEK_EYE[2]}; k++) {
					sb = sa + ${f(SEEK_EYE[1])};
					vec2 qb = p + dv.xz * sb;
					fb = vUnit.y + dv.y * sb - (${f(-WORLD.top)} + sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(qb, qb))) + landHighM(qb, mb));
					if (fb < mb + ${f(EYE_MARGIN)}) fb = vUnit.y + dv.y * sb - landTop(qb, true);
					if (fb <= 0.0) break;
					sa = sb; fa = fb;
				}
				if (fb <= 0.0) {
					for (int k = 0; k < 4; k++) {
						float sm = sa + (sb - sa) * clamp(fa / max(fa - fb, 1e-6), 0.1, 0.9);
						vec2 qm = p + dv.xz * sm;
						float mm, fm = vUnit.y + dv.y * sm - (${f(-WORLD.top)} + sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(qm, qm))) + landHighM(qm, mm));
						if (mb > ${f(GRID_TRUST[0] * 2)}) fm = vUnit.y + dv.y * sm - landTop(qm, true);
						if (fm > 0.0) { sa = sm; fa = fm; } else { sb = sm; fb = fm; }
					}
					p += dv.xz * (sa + (sb - sa) * fa / max(fa - fb, 1e-6));
				}
			}
		}
		float fwp = max(fwidth(p.x), fwidth(p.y));
		// The slopes from the place itself, worked out exactly with the height (landGrad), so a slope is never taken
		// across a crest and the field is read once here and not three times.
		vec2 gd;
		vec2 s0 = landSandAt(p, inside, fwp, gd);
		float relief = s0.x;
		vec4 info = landInfo;
		float which = landWhich;
		vec2 gSmooth = landGrad, gR = gSmooth + gd;
		float tx = 1.0 / MAP_N;
		vec2 gM = vec2(texture(uMapA, uv + vec2(tx, 0.0)).g - texture(uMapA, uv - vec2(tx, 0.0)).g, texture(uMapA, uv + vec2(0.0, tx)).g - texture(uMapA, uv - vec2(0.0, tx)).g) / (2.0 * tx * MAP_SIZE);
		// The roll at the land's edge, which the dune field is handed as one number for the whole pixel.
		vec2 gI = vec2(texture(uMapA, uv + vec2(tx, 0.0)).b - texture(uMapA, uv - vec2(tx, 0.0)).b, texture(uMapA, uv + vec2(0.0, tx)).b - texture(uMapA, uv - vec2(0.0, tx)).b) * 64.0 / (2.0 * tx * MAP_SIZE);
		float rl = landRoll(inside), dRoll = inside > 0.0 && inside < ${f(ROLL)} ? 6.0 * (inside / ${f(ROLL)}) * (1.0 - inside / ${f(ROLL)}) / ${f(ROLL)} : 0.0;
		vec2 gRoll = (rl > 0.02 ? (relief - landSwell(p)) / rl : 0.0) * dRoll * gI;
		gs = sand * (gR + gRoll) + relief * gM;
		float steep = length(gR);
		// The dune this place is on: the height of its crest over here, how far down its slip face the place has fallen
		// as a share of that, and how far down its back from the brink, in units.
		float hc = 1e-3, fall = 0.0, fromBrink = 1e3, tb = 1.0;
		if (which >= 0.0) {
			int wi = int(which);
			hc = max(landCrest(texelFetch(uCrest, ivec2(1, wi), 0), texelFetch(uCrest, ivec2(2, wi), 0), info.z).w, 1e-3);
			if (info.y > 0.5) fall = clamp(1.0 - info.x / hc, 0.0, 1.0);
			else if (info.x > 0.05) { tb = info.w; fromBrink = tb * BACK * hc; }
		}
		// On a slip face: how far down it from the crest, and how high over its toe.
		float face = info.y * smoothstep(0.05, 0.5, info.x);
		// Ripples across the lit sand, square to the wind but bent round each dune as the wind is, in two sizes that
		// give way to each other over the desert and at a strength that wanders, dying out toward each brink, on the
		// steep and in the lee. A wavelength that changed from place to place drew closed rings, as wood grain: each
		// set keeps its own, and only how much of each shows changes.
		// They thin toward each brink over the upper part of a back, bunch where the sand turns round a horn (their phase
		// follows the relief, so where the ground falls faster they lie closer), turn with it, and come in three sizes:
		// a fine set everywhere, and two larger sets that give way to each other over the desert.
		float back = (1.0 - face) * smoothstep(0.32, 0.12, steep) * smoothstep(0.4, 4.0, fromBrink) * mix(1.0, smoothstep(0.0, 0.4, tb), onBackOf(which, info));
		float strength = mix(0.3, 1.0, smoothstep(0.25, 0.75, landNoise(p / 47.0 + 11.0)));
		vec2 w = WIND;
		const float BEND = 1.9;
		float phase = dot(p, w) + BEND * relief + 13.0 * landNoise(p / 23.0) + 4.0 * landNoise(p / 8.0 + 3.0);
		vec2 gq = w + BEND * gSmooth;
		float big = smoothstep(0.35, 0.65, landNoise(p / 71.0 + 5.0));
		float dh = 0.0, shade = 0.0;
		for (int k = 0; k < 3; k++) {
			float lam = k == 0 ? 2.3 : (k == 1 ? 3.6 : 1.15), wt = k == 0 ? 1.0 - big : (k == 1 ? big : 0.3 + 0.25 * landNoise(p / 13.0 + 2.0));
			float q = (phase + (k == 2 ? 2.0 * landNoise(p / 4.0 + 7.0) : 0.0)) / lam, fwq = fwidth(q);
			float k1 = landKeep(1.0, fwq), k2 = landKeep(0.5, fwq), k3 = landKeep(0.34, fwq);
			// Each ripple runs a few wavelengths along its crest and ends, and where one set ends inside another the
			// two fork, as wind ripples do: a pattern of lines that never end read as contour lines or wood grain.
			float run = smoothstep(0.22, 0.52, landNoise(vec2(q * 0.42, dot(p, vec2(-w.y, w.x)) / (2.6 * lam)) + float(k) * 7.3));
			// A ripple is steep on its lee and long on its stoss side, as sand ripples are: three harmonics of a saw.
			dh += run * wt * 6.2832 * (cos(6.2832 * q) * k1 + 0.9 * cos(12.566 * q) * k2 + 0.45 * cos(18.85 * q) * k3) / lam;
			shade += run * wt * (sin(6.2832 * q) + 0.45 * sin(12.566 * q) * k2) * k1;
		}
		gs += back * strength * RIPPLE * dh * gq * sand;
		float hi = smoothstep(-4.0, 30.0, relief);
		float grain = landNoise(p / 0.35) - 0.5;
		dune = uSand * mix(1.0, 1.1, hi) * (1.0 + 0.10 * grain * landKeep(0.7, fwp)) * (0.95 + 0.1 * landNoise(p / 31.0));
		dune *= 1.0 + 0.06 * shade * back * strength;
		// At the very rim the sand is a little paler and creamier, as picture 9's is where it rolls over the planet's
		// shoulder, raggedly. (A pale band twelve units wide all along the rim read as a ruled moulding.)
		dune = mix(dune, uSandRim * (1.0 + 0.1 * grain * landKeep(0.7, fwp)), 0.5 * (1.0 - smoothstep(0.0, 6.0, inside + 4.0 * (landNoise(p / 9.0 + 2.0) - 0.5))));
		// A back is finer, paler sand at its brink and coarser down its flank, with a line of the palest along the brink.
		float onBack = which >= 0.0 && info.y < 0.5 && info.x > 0.05 ? smoothstep(2.0, 6.0, hc) : 0.0;
		dune *= mix(1.0, mix(1.09, 0.94, smoothstep(0.0, 0.9, tb)) * (1.0 + 0.08 * (1.0 - smoothstep(0.2, 1.6, fromBrink))), onBack);
		// The upper back of a tall dune, and its brink, are the finest and palest sand: they run from the floor's apricot
		// to pale gold, as the brightest sand of picture 9, of picture 4 and of his own picture does.
		dune = mix(dune, uSandHi * (1.0 + 0.08 * grain * landKeep(0.7, fwp)), onBack * smoothstep(8.0, 36.0, hc) * (1.0 - smoothstep(0.1, 0.8, tb)) * SAND_HI);
		// A slip face is the same sand as a back, a little coarser and redder: its dark is the moon's shadow and not
		// its color. Its grain flows show as streaks down it.
		dune = mix(dune, mix(dune, uSandDeep, 0.3) * (0.92 + 0.16 * landNoise(vec2(info.z * 19.0, info.w / 7.0) + which * 3.1)), face);
		// The light the sand beyond a slip face throws back up it: none under the brink, most at the toe.
		landRipple = shade * back * strength;
		// A slip face is a scooped hollow: darkest right under its crest, lifted toward its toe and its horns by what
		// the lit floor in front of it throws back, and a little fresher and darker down each chute.
		float chute = face > 0.0 && which >= 0.0 ? landChuteAt(info.z * texelFetch(uCrest, ivec2(1, int(which)), 0).x, info.w, which) * smoothstep(1.0, 8.0, info.w) : 0.0;
		landHollow = (HOLLOW.x + (HOLLOW.y - HOLLOW.x) * pow(fall, 1.2) + HOLLOW.z * smoothstep(0.55, 0.95, abs(info.z))) * (1.0 - 0.45 * chute);
		dune *= 1.0 - 0.22 * chute * face;
		landFace = face;
		landFoot = max(0.02, 0.46 * length(fwidth(vUnit.xz)));
		vec2 gS = sand * (gSmooth + gRoll) + relief * gM;
		float dc = sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(p, p)));
		landNs = normalize(vec3(p.x / dc - gS.x, 1.0, p.y / dc - gS.y));
		// The knife edge is a little rounded, and its rounding faces the moon: a thin bright line along every crest where
		// the lit back ends and the shade begins, never thinner than a pixel.
		landCrestLine = onBack * smoothstep(3.0, 8.0, hc) * (1.0 - smoothstep(0.0, max(CREST_LINE, 1.2 * fwp), fromBrink));
		landNs = normalize(mix(landNs, MOON_TO, 0.6 * landCrestLine));
		landSandK = smoothstep(0.3, 0.7, sand);
		// The ray to the moon sets out from the sand's own surface and not the mesh's, which lies a little under it in
		// places: a ray that set out under the sand was taken as shadowed, as a dark speck.
		landSunAt = vec3(p.x, ${f(-WORLD.top)} + sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(p, p))) + sand * relief + 0.12, p.y);
	}

	// The break: slabs cracked apart near the land's front edge.
	vec2 own;
	float edge;
	vec4 slab = landSlab(p, own, edge);
	vec2 cuv = (slab.xy - MAP_LO) / MAP_SIZE;
	vec3 cA = texture(uMapA, cuv).rgb;
	float b = pow(max(0.0, 1.0 - cA.b * 64.0 / ${f(BREAK.reach)}), 1.6) * (1.0 - cA.g) * (1.0 - smoothstep(0.0, 0.25, sand));
	vec3 ground = mix(city, turf, grass);
	g += gg * grass;
	if (b > 0.01) {
		float fw = fwidth(edge), cw = ${f(BREAK.crack)} * b * (0.5 + own.x);
		float crack = landLine(edge, cw, fw) * smoothstep(0.03, 0.15, b);
		float lip = landLine(edge - cw, 0.35, fw) * (1.0 - crack) * b;
		ground = mix(ground, mix(uPavePale, uStone, 0.5), lip * 0.5);
		ground = mix(ground, uEarth * 0.25, crack);
		ground = mix(ground, mix(uPavePale, uEarth, 0.4), b * 0.35 * smoothstep(8.0, 0.0, inside));
	}

	vec3 col = mix(ground, dune, smoothstep(0.0, 1.0, sand));
	g = mix(g, gs, smoothstep(0.0, 0.4, sand));
	landRough = mix(landRough, 0.95, max(grass, sand));
	// A wall the break or the edge shows: the planet's own stone broken into facets of every size, each turned its own
	// way so some catch the moon and some do not, with dark cracks between, and a chipped top where it meets the
	// ground. Courses of even stone there read as a garden wall.
	vec3 wn = vec3(0.0);
	if (wall > 0.01) {
		vec2 out2 = dot(nG.xz, nG.xz) > 1e-6 ? normalize(nG.xz) : vec2(0.0, 1.0);
		vec2 q = vec2(dot(p, vec2(-out2.y, out2.x)), vUnit.y);
		float e1, e2;
		vec2 o1, o2;
		// Long broken ledges, wider than they are tall, and finer breaks inside each that only turn the stone.
		vec2 k1 = vec2(${f(BREAK.cell)} / 6.0, ${f(BREAK.cell)} / 1.7), k2 = vec2(${f(BREAK.cell)} / 1.3);
		vec4 f1 = landSlab(q * k1 + vec2(0.0, 13.0), o1, e1);
		vec4 f2 = landSlab(q * k2 + vec2(41.0, 7.0), o2, e2);
		e1 /= ${f(BREAK.cell)} / 1.7;
		float fw = max(fwidth(q.x), fwidth(q.y));
		float crack = landLine(e1, 0.06, fw) * landKeep(1.7, fw) * step(0.35, o1.y);
		vec3 rock = uRock * (0.55 + 0.6 * o1.x) * (0.88 + 0.24 * o2.y * landKeep(1.3, fw)) * (0.9 + 0.2 * landNoise(q / vec2(0.8, 0.3)));
		rock = mix(rock, uRock * 0.25, 0.75 * crack);
		vec3 side = vec3(-out2.y, 0.0, out2.x);
		wn = (side * (o1.y - 0.5) * 0.9 + vec3(0.0, 1.0, 0.0) * (o1.x - 0.35) * 0.7 + side * (o2.x - 0.5) * 0.45 * landKeep(1.3, fw)) * (1.0 - crack);
		col = mix(col, rock, wall);
		landRough = mix(landRough, 0.9, wall);
	}
	vec3 n = sand > 0.002 ? normalize(vec3(p.x / sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(p, p))) - gs.x, 1.0, p.y / sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(p, p))) - gs.y)) : nG;
	n = normalize(mix(nG, n, smoothstep(0.0, 0.3, sand) * (1.0 - wall)) + wn * wall);
	landInward = wall > 0.5 && dot(nG.xz, nG.xz) > 1e-6 ? -normalize(nG.xz) : vec2(0.0);
	landN = normalize(n - vec3(g.x, 0.0, g.y) * (1.0 - wall) * (1.0 - smoothstep(0.0, 0.3, sand)));
	landN = normalize(mix(landN, MOON_TO, 0.6 * landCrestLine));
	landAlbedo = col;
}`;
}

export const COLOR = /* glsl */ `
landSurface();
diffuseColor.rgb = landAlbedo;`;
export const ROUGH = /* glsl */ `
roughnessFactor = landRough;`;
export const METAL = /* glsl */ `
metalnessFactor = landMetal;`;
// On the sand the moon's shadow is the land's own ray through the dune field (landSun), which is exact at any zoom,
// and the stage's shadow map, which blurred every slip face's shadow over a unit and a half, is not read there.
export const NORMAL = /* glsl */ `
normal = normalize( mat3( viewMatrix ) * landN );
landRecv = receiveShadow && landSandK < 0.5;
#define receiveShadow landRecv`;
// The moon's light eased to nothing over the last few degrees before a face turns from it, by the face's own slope
// and not the mesh's: a slip face is then in full shadow, and the shadow map's grain never shows where the moon
// only grazes a face.
export const DIRECT = /* glsl */ `
{
	// On the sand whether the moon reaches a place is a matter of the dune's own shape: the grooves down a slip face,
	// turning to it and away pixel by pixel where the moon only grazes the face, made it a field of streaks.
	float landLee = smoothstep( 0.0, 0.14, dot( mix( landN, landNs, landSandK ), MOON_TO ) );
	if ( landSandK > 0.0 ) landLee *= mix( 1.0, landSun( landSunAt, 2.0 * landFace, landFoot, landRipple ), landSandK );
	// How much of the moon reaches the sand, averaged with the pixels beside it in the two by two block the graphics
	// card shades together: where it changes within a pixel (a shadow's edge on sand seen edge on, a lit sliver of a
	// crest thinner than a pixel) it no longer turns single pixels on and off.
	{
		vec2 side = vec2( mod( floor( gl_FragCoord.xy ), 2.0 ) ) * -2.0 + 1.0;
		float near = landLee + 0.5 * ( side.x * dFdx( landLee ) + side.y * dFdy( landLee ) );
		landLee = mix( landLee, clamp( near, 0.0, 1.0 ), landSandK );
	}
	landSeen = landLee;
	landLee *= mix( 1.0, SAND_SUN, max( landSandK, landDrape ) );
	reflectedLight.directDiffuse *= landLee;
	reflectedLight.directSpecular *= landLee;
}`;
// The light that has bounced and how open the place is, from the maps, as the world's stored light is used.
export const LIGHT_END = /* glsl */ `
{
	vec2 lu = ( vUnit.xz + landInward * 4.0 - MAP_LO ) / MAP_SIZE;
	float open = texture( uMapB, lu ).r, sandy = texture( uMapA, lu ).g;
	vec3 bounced = texture( uLight, lu ).rgb;
	irradiance *= open;
	iblIrradiance *= open * mix( 1.0, SAND_NIGHT, sandy );
	radiance *= mix( 1.0, open, 0.7 ) * mix( 1.0, SAND_SHEEN, sandy );
	vec3 b2 = bounced * bounced;
	// What the sand throws on sand is the sand's own color, deeper than the one albedo the bounce was worked out
	// with: a shadow on the sand keeps the saturated brown of his dunes.
	b2 = max( mix( vec3( dot( b2, vec3( 0.2126, 0.7152, 0.0722 ) ) ), b2, mix( 1.0, SAND_TINT, sandy ) ), 0.0 );
	irradiance += b2 * LAND_BOUNCE * mix( 1.0, SAND_BOUNCE, sandy );
	// The lit sand round a shadow on the sand throws light into it. How deep under the sand the ray to the moon passed
	// is how far into the shadow a place is: a shadow cast on the floor lifts toward its far edge, and a slip face is
	// lifted at its horns, where the lit sand is near. A slip face also looks out over the lit backs below it, more
	// of them the higher up it: it is lightest under its crest and darkest at its toe, in the deepest hollow.
	// The light comes mostly from the lit backs the shade faces, so the ripples and grain still show in it, faintly.
	{
		vec3 from = normalize( vec3( -MOON_TO.x, 0.7, -MOON_TO.z ) );
		float toward = 0.3 + 0.7 * max( dot( landN, from ), 0.0 );
		irradiance += SAND_GLOW * landSandK * ( 1.0 - landSeen ) * mix( SAND_DEEP + ( 1.0 - SAND_DEEP ) * exp( -landDepth / CAST_REACH ), landHollow, landFace ) * toward;
	}
}`;
