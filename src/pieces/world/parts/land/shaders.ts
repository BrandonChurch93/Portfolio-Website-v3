import { COURT, D2R, LIGHT, MOONWARD, PYRAMID, VIEW, WORLD } from '../../layout';
import { BREAK, GLSL, MAP, WIND } from './field';

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

// The pale strip along the land's front edge: full this far in from the edge, and gone this far in.
const STRIP = [9, 17] as const;

const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);

export const VERT_PARS = /* glsl */ `
uniform vec3 uAt;
uniform float uSize;
varying vec3 vUnit;`;
export const VERT = /* glsl */ `
vUnit = uAt + position * uSize;`;

export function fragPars(n: Counts): string {
  const pc = Math.cos(PYRAMID.turn * D2R), ps = Math.sin(PYRAMID.turn * D2R);
  return /* glsl */ `
varying vec3 vUnit;
uniform sampler2D uMapA;
uniform sampler2D uMapB;
uniform sampler2D uLight;
uniform sampler2D uLots;
uniform sampler2D uTowers;
uniform vec3 uSand, uSandDeep, uPave, uPavePale, uCourt, uGrass, uGrassDry, uGrassDeep, uEarth, uStone, uBronze;
const float MAP_LO = ${f(MAP.lo)}, MAP_SIZE = ${f(MAP.size)}, MAP_N = ${f(n.map)}, LOTS_N = ${f(n.lots)};
const float LAND_BOUNCE = ${f(LIGHT.bounce)};
// The share of the night's soft light the sand keeps: the night is lit from the visitor's side, and in full it
// turned the dunes' slip faces, which face the visitor, a pale grey in place of a deep warm shadow.
const float SAND_NIGHT = 0.02;
// The share of the stored bounce the sand keeps. In full it lifted every slip face and every shadow on the sand to
// a mid brown, where his dunes have them near black.
const float SAND_BOUNCE = 0.5, SAND_TINT = 3.2;
// The moon on the sand. Lit sand is pale gold, his dunes' (213, 157, 100) to (229, 175, 110), and raising the sand's
// albedo to reach it raised its shadows with it.
const float SAND_SUN = 1.5;
const vec3 MOON_TO = normalize(vec3(${MOONWARD.map((v) => f(v)).join(', ')}));
${GLSL}
vec3 landAlbedo;
float landRough, landMetal;
vec3 landN;
float landFace = 0.0, landSandK = 0.0;
vec3 landSunAt = vec3(0.0);
bool landRecv;
// How deep the grooves down a slip face and the ripples across the lit sand are cut.
const float GROOVE = 0.22, RIPPLE = 0.022;
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


// The sand's surface at p with what is finer than the dune field: the grooves that avalanches cut down a slip face,
// deepening down it and gone at its toe, each fading to its mean as it nears a pixel.
float landSandAt(vec2 p, float inside, float fw) {
	float r = landRelief(p, inside);
	vec4 I = landInfo;
	if (I.y > 0.5 && landWhich >= 0.0) {
		vec4 b = texelFetch(uCrest, ivec2(1, int(landWhich)), 0);
		float along = I.z * b.x, down = I.w;
		float n = landNoise(vec2(along / 2.4 + 0.6 * landNoise(vec2(along / 9.0, down / 6.0)), down / 11.0 + landWhich * 7.0));
		float n2 = landNoise(vec2(along / 1.1, down / 5.0 + landWhich * 3.0));
		float amp = smoothstep(0.4, 2.5, down) * smoothstep(0.0, 1.6, I.x);
		r -= amp * (GROOVE * (1.0 - abs(2.0 * n - 1.0)) * landKeep(2.4, fw) + 0.4 * GROOVE * n2 * landKeep(1.1, fw));
	}
	return r;
}
// How much of the moon reaches a place on the sand: a ray toward it through the dune field, its edge as soft as the
// moon's disc is wide, so a slip face's shadow on the sand below it is exact at any zoom.
float landSun(vec3 at) {
	float res = 1.0, t = 0.25;
	for (int i = 0; i < 40; i++) {
		vec3 q = at + MOON_TO * t;
		vec2 u = (q.xz - MAP_LO) / MAP_SIZE;
		vec3 A = texture(uMapA, u).rgb;
		float hs = ${f(-WORLD.top)} + sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(q.xz, q.xz))) + A.g * landRelief(q.xz, A.b * 64.0);
		float dh = q.y - hs;
		if (dh < 0.0) return 0.0;
		res = min(res, SUN_EDGE * dh / t);
		if (dh > 40.0 || t > 110.0) break;
		t += clamp(dh * 0.7, 0.3, 6.0);
	}
	return smoothstep(0.0, 1.0, res);
}

void landSurface() {
	vec2 p = vUnit.xz, uv = (p - MAP_LO) / MAP_SIZE;
	vec3 A = texture(uMapA, uv).rgb;
	float grass = A.r, sand = A.g, inside = A.b * 64.0, dust = texture(uMapB, uv).g;
	vec3 nG = (vec4(vNormal, 0.0) * viewMatrix).xyz;
	nG = dot(nG, nG) > 1e-10 ? normalize(nG) : vec3(0.0, 1.0, 0.0);
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
	// The strip along the land's front edge, in front of the trees: pale worn stone, as picture 9 has it.
	float strip = (1.0 - smoothstep(${f(STRIP[0])}, ${f(STRIP[1])}, inside + 6.0 * (landNoise(p / 13.0) - 0.5)));
	{
		vec2 sg = vec2(0.0);
		float sj = 0.0;
		vec2 q = vec2(p.x * 0.8 + p.y * 0.6, p.y * 0.8 - p.x * 0.6);
		vec3 worn = landPaving(q, vec2(0.8, -0.6), vec2(0.6, 0.8), vec2(4.6, 3.1), 0.37, 0.06, uPavePale, 0.45, 101u, sg, sj);
		worn *= mix(1.0, 0.55, sj) * (0.9 + 0.2 * landNoise(p / 3.1));
		city = mix(city, worn, strip);
		g = mix(g, sg, strip);
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
		float relief = landRelief(p, inside);
		// The mesh cuts a sharp crest a little short. Where this pixel of it lies under the sand's true surface, the
		// eye would have met that surface nearer, on the slip face: it is lit as that place, so no lit back shows along
		// a crest the visitor sees edge on.
		float under = ${f(-WORLD.top)} + sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(p, p))) + sand * relief - vUnit.y;
		if (under > 0.0) { p.y += min(4.0, 1.5 * under * ${f(1 / Math.tan(VIEW.el * D2R))}); relief = landRelief(p, inside); }
		vec4 info = landInfo;
		float which = landWhich;
		float fwp = max(fwidth(p.x), fwidth(p.y));
		float e = 0.05;
		vec2 gR = vec2(landSandAt(p + vec2(e, 0.0), inside, fwp) - landSandAt(p - vec2(e, 0.0), inside, fwp), landSandAt(p + vec2(0.0, e), inside, fwp) - landSandAt(p - vec2(0.0, e), inside, fwp)) / (2.0 * e);
		float tx = 1.0 / MAP_N;
		vec2 gM = vec2(texture(uMapA, uv + vec2(tx, 0.0)).g - texture(uMapA, uv - vec2(tx, 0.0)).g, texture(uMapA, uv + vec2(0.0, tx)).g - texture(uMapA, uv - vec2(0.0, tx)).g) / (2.0 * tx * MAP_SIZE);
		gs = sand * gR + relief * gM;
		float steep = length(gR);
		// On a slip face: how far down it from the crest, and how high over its toe.
		float face = info.y * smoothstep(0.35, 0.5, steep);
		// Ripples across the lit sand, square to the wind, meandering, finer where the sand is steeper; none on the
		// slip faces.
		float back = (1.0 - face) * smoothstep(0.32, 0.12, steep);
		vec2 w = WIND;
		// Their wavelength is one everywhere and only their line wanders: a wavelength that changed from place to
		// place drew closed rings in the sand, as wood grain.
		const float lam = 2.3;
		float q = dot(p, w) / lam + 1.3 * landNoise(p / 21.0) + 0.5 * landNoise(p / 8.0 + 3.0);
		float fwq = fwidth(q);
		float k1 = landKeep(1.0, fwq), k2 = landKeep(0.5, fwq);
		// A ripple is steep on its lee and long on its stoss side, as sand ripples are.
		float ph = fract(q), dh = 6.2832 * (cos(6.2832 * q) * k1 + 0.42 * cos(12.566 * q + 0.9) * k2);
		gs += back * RIPPLE * dh * w / lam * sand;
		float hi = smoothstep(-4.0, 20.0, relief);
		float grain = landNoise(p / 0.35) - 0.5;
		dune = uSand * mix(1.04, 1.16, hi) * (1.0 + 0.10 * grain * landKeep(0.7, fwp)) * (0.95 + 0.1 * landNoise(p / 31.0));
		dune *= 1.0 + 0.06 * sin(6.2832 * q) * back * k1;
		// A slip face is the same sand as a back, a little coarser and redder: its dark is the moon's shadow and not
		// its color. Its grain flows show as streaks down it.
		dune = mix(dune, mix(dune, uSandDeep, 0.55) * (0.92 + 0.16 * landNoise(vec2(info.z * 19.0, info.w / 7.0) + which * 3.1)), face);
		landFace = face;
		landSandK = smoothstep(0.3, 0.7, sand);
		// The ray to the moon sets out from the sand's own surface and not the mesh's, which lies a little under it in
		// places: a ray that set out under the sand was taken as shadowed, as a dark speck.
		landSunAt = vec3(p.x, ${f(-WORLD.top)} + sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(p, p))) + sand * relief + 0.04, p.y);
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
	// A wall the break or the edge shows: earth and broken stone in beds.
	float bed = landNoise(vec2(p.x + p.y, vUnit.y) / 1.4) * 0.6 + landNoise(vec2(p.x - p.y, vUnit.y) / 0.5) * 0.4;
	col = mix(col, mix(uEarth, uPavePale * 0.6, smoothstep(0.3, 0.7, bed)), wall);
	vec3 n = sand > 0.002 ? normalize(vec3(p.x / sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(p, p))) - gs.x, 1.0, p.y / sqrt(max(1.0, ${f(WORLD.top * WORLD.top)} - dot(p, p))) - gs.y)) : nG;
	n = normalize(mix(nG, n, smoothstep(0.0, 0.3, sand) * (1.0 - wall)));
	landN = normalize(n - vec3(g.x, 0.0, g.y) * (1.0 - wall) * (1.0 - smoothstep(0.0, 0.3, sand)));
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
	float landLee = smoothstep( 0.0, 0.14, dot( landN, MOON_TO ) );
	if ( landSandK > 0.0 && landLee > 0.0 ) landLee *= mix( 1.0, landSun( landSunAt ), landSandK );
	landLee *= mix( 1.0, SAND_SUN, landSandK );
	reflectedLight.directDiffuse *= landLee;
	reflectedLight.directSpecular *= landLee;
}`;
// The light that has bounced and how open the place is, from the maps, as the world's stored light is used.
export const LIGHT_END = /* glsl */ `
{
	vec2 lu = ( vUnit.xz - MAP_LO ) / MAP_SIZE;
	float open = texture( uMapB, lu ).r, sandy = texture( uMapA, lu ).g;
	vec3 bounced = texture( uLight, lu ).rgb;
	irradiance *= open;
	iblIrradiance *= open * mix( 1.0, SAND_NIGHT, sandy );
	radiance *= mix( 1.0, open, 0.7 );
	vec3 b2 = bounced * bounced;
	// What the sand throws on sand is the sand's own color, deeper than the one albedo the bounce was worked out
	// with: a shadow on the sand keeps the saturated brown of his dunes.
	b2 = max( mix( vec3( dot( b2, vec3( 0.2126, 0.7152, 0.0722 ) ) ), b2, mix( 1.0, SAND_TINT, sandy ) ), 0.0 );
	irradiance += b2 * LAND_BOUNCE * mix( 1.0, SAND_BOUNCE, sandy );
}`;
