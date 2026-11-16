import { FORM } from './form';
import { MOONWARD, PYRAMID } from '../../layout';

// The pyramid's shaders, laid into a physical material (onBeforeCompile) before the world's light (../../light.ts).
// Polished gold is what it mirrors and the lights it catches. The moon stands behind the world to the right, and the
// half way direction between it and the visitor lies a few degrees off the normal of the face toward it. The plates
// of that face are set with a kick at their foot that turns them that few degrees, and the face bows a hair, so the
// moon's own highlight, a broad lobe of a polished but hand worked gold, lands on the face and spreads over it:
// brightest where a plate is turned nearest the half way direction and falling off toward the edges by itself, where
// the plates are laid flat to meet the arris stones. No two plates lie in quite one plane (each its own small tilt),
// so the blaze breaks into a mosaic of plates. The face turned from the moon mirrors the night and the lit city: a
// deep warm gold with the city's windows low on it, shifted plate by plate. The front arris turns up to a light high
// overhead (uZen) as one pale line; the outlines and the capstone's border are quiet. The cursor is a second, smaller
// highlight of the same kind, which each plate catches by its own tilt.
// How much a place mirrors is then given its color, as polished gold gives it: deep where it mirrors little, richest
// through its middle tones, and paling toward pale gold only where it mirrors much.

const f = (v: number): string => v.toFixed(5);
const v2 = (a: readonly number[]): string => `vec2( ${f(a[0])}, ${f(a[1])} )`;
const HALF = PYRAMID.base / 2, TALL = PYRAMID.tall, SLANT = Math.hypot(HALF, TALL);
const SLOPE = Math.atan2(TALL, HALF);
// The angle between two neighbouring faces' normals.
const TURN = Math.acos(HALF ** 2 / (HALF ** 2 + TALL ** 2));
const MOON = (() => { const l = Math.hypot(...MOONWARD); return MOONWARD.map((v) => v / l); })();
// From a place's distance across a face to its distance from the nearest arris, measured on the face.
const ACROSS = 1 / Math.sqrt(1 + Math.cos(SLOPE) ** 2);
// Which piece a vertex is of, as make.mjs stores it.
export const KIND = { body: 0, plinth: 0.2, bevel: 0.3, neck: 0.5, cap: 1 } as const;
const C = FORM.casing;

// Levels are how much is mirrored: about 0.03 is a near black gold, 0.05 a deep one, 1 a bright one, and pale gold
// from about 2. Places on a face are across it from its middle toward its right hand corner as seen, and up it, in
// units.
export const NIGHT = {
  // How each stone is laid, as tilts of its normal across the face and up it, in radians. The plates' kick: their
  // foot stands out so they face a little down the slope, and a hair toward the front arris, which turns them to the
  // moon's half way direction as the view has it (-0.047 across, -0.207 up, measured from the plan). It is laid off
  // within `clear` of an arris (`cap` on the capstone) and `top` under the reveal, where the plates meet the arris
  // stones flush. Then the face's bow: so much tilt for each unit from the face's heart, across and up the slope;
  // the heart, across and up; and the capstone's own bow, which is a polished stone of its own.
  kick: { at: [-0.047, -0.205], clear: [1.2, 9], cap: [0.6, 3.5], top: 8 },
  bow: { per: [0.0016, 0.002], heart: [6, 26], cap: 0.005 },
  // Each plate's own tilt, steady across it: most by up to `plate`, a share `share` of them by `odd`, and each band
  // of courses by `band`, so the band's joints barely read; and the share of the plates' own tilt kept where a
  // course is three pixels tall or less.
  tilt: { plate: 0.012, odd: 0.04, share: 0.06, band: 0.0006, far: 0.4 },
  // The moon's highlight: the roughness of the gold (its lobe is GGX's), how much each plate's polish differs, how
  // bright at its peak, and the share of the moon seen (baked) over which it comes on.
  moon: { rough: 0.3, vary: 0.12, power: 3.4, seen: [0.15, 0.7] },
  lit: {
    // The night the face toward the moon mirrors where the moon's highlight is not: its level at the foot and at the
    // apex, and how much lighter it is toward the moon, at the face's right.
    night: { D: 520, low: 0.05, top: 0.075, moonward: 0.3 },
  },
  dark: {
    // The night: its level, how much darker it is high on the face and next to the front arris.
    night: { D: 520, base: 0.045, top: 0.3, front: 0.3 },
    // The city mirrored low on it: how far off it stands, its skyline's blocks (how wide, lowest and highest top), its
    // windows (each cell's size across and up, the share lit, from the darkest block to the brightest, how bright), and
    // how much its towers' own lit walls stand out from the sky behind them, from the darkest to the lightest, and how it fades toward its top.
    city: { D: 160, block: [6, 11], top: [12, 38], cell: [2.4, 3.4], share: [0.08, 0.6], power: 1.2, fade: 0.5, wall: [0.03, 0.06] },
    // The city's warm glow along its foot: how tall and how bright.
    foot: { D: 300, tall: 5, power: 0.05 },
  },
  // The land's pale strip at the foot, mirrored faintly in the lowest course of each face: how tall, how bright on
  // the face toward the moon and on the other.
  strip: { tall: 2.2, lit: 0.35, dark: 0.07 },
  // The cursor's light: a highlight of the moon's kind, as if from a small light so far off (units), its roughness,
  // how bright, and how far from an arris it is gone. Far off and tight, a plate takes it whole or not at all, so it
  // is a cluster of plates that catch it, which changes plate by plate as it moves: nearer and softer it was a
  // round spot. Its spread is GGX's squared, which takes off the soft skirt round it.
  glint: { D: 500, rough: 0.11, power: 3, clear: [1.5, 5] },
  // The front arris's line: how much dimmer it is high up than low, and how much it wavers along its length.
  arris: { high: 0.5, waver: 0.35 },
  // The left hand outline's edge light, kept to almost nothing: the city's glow along the horizon behind it, how
  // bright, and from what height to what height, as the sine of the angle over the horizon.
  left: { power: 0.45, lo: -0.05, hi: 0.5 },
  // The joints' shadow: the hairline between courses, the deeper joint, the joint between plates; and the catch of
  // light on each plate's upper chamfer, on the face toward the moon and on the other.
  joint: { line: 0.55, deep: 0.7, plate: 0.5, catch: [0.2, 0.008] },
  // How much each plate's mirrored light differs from its neighbours'.
  plate: 0.04,
  // The foot course's bevel and the shadow line over it, the neck in the reveal, and the body's level top round the
  // capstone's foot, seen nearly edge on: what it mirrors, the horizon behind, from its left to its right.
  edges: { bevel: 1.1, shadow: 0.55, shadowTall: 0.45, neck: 0.012, ledge: [0.12, 0.6] },
  // The capstone's border, kept to almost nothing: a faint groove so far in from its edges, how dark at most.
  cap: { border: 2.8, groove: 0.2, dark: 0.35 },
};
export type Night = typeof NIGHT;

export const VERT_PARS = `
uniform vec3 uAt;
uniform float uSize;
uniform float uCursor;
uniform vec3 uGlintAt;
varying vec3 vQ;
varying vec3 vNq;
varying vec3 vTv;
varying vec3 vBv;
varying vec3 vRay;
varying float vKind;`;

// The cursor's ray, in the camera's space: the frame stands the glint (uGlintAt) out from the middle of the view by
// the cursor's offset in the host times uCursor, so that offset is the cursor's place on the screen, and the ray
// through it is found with the view as it is drawn (a close view, or a host of another height).
export const VERT = `
vQ = uAt + position * uSize;
vNq = normal;
{
	vec3 tq = vec3( normal.z, 0.0, - normal.x );
	float tl = length( tq );
	tq = tl > 1e-4 ? tq / tl : vec3( 1.0, 0.0, 0.0 );
	vTv = normalize( normalMatrix * tq );
	vBv = normalize( normalMatrix * cross( normal, tq ) );
	vec2 nd = 2.0 * uGlintAt.xy / max( uCursor, 1e-6 );
	vec4 nr = inverse( projectionMatrix ) * vec4( nd, - 1.0, 1.0 );
	vRay = nr.xyz / ( abs( nr.w ) > 1e-6 ? nr.w : 1e-6 );
}
#ifdef WORLD_BAKED
	vKind = aLight.w;
#else
	vKind = 0.0;
#endif`;

export function frag(N: Night): { PARS: string; COLOR: string; ROUGH: string; NORMAL: string; ENV: string; GRADE: string } {
  const L = N.lit, D = N.dark, G = N.glint, E = N.edges, K = N.cap, J = N.joint, T = N.tilt, CI = D.city;
  const capMid = FORM.cap.from + FORM.cap.reveal + (TALL - FORM.cap.from - FORM.cap.reveal) / 3;
  const PARS = `
varying vec3 vQ;
varying vec3 vNq;
varying vec3 vTv;
varying vec3 vBv;
varying vec3 vRay;
varying float vKind;
uniform float uUnit;
uniform vec4 uZen;
uniform vec2 uZenW;
uniform vec3 uRim;
uniform vec3 uDeepC;
uniform vec3 uBodyC;
uniform vec3 uMidC;
uniform vec2 uGradeLo;
uniform vec3 uPaleC;
uniform vec3 uWarmC;
uniform vec4 uGradeAt;
uniform vec3 uRough;
uniform float uContact;
uniform float uMoonSpec;
uniform mat3 uToWorld;
float pSoft = 1.0, pWarm = 0.0, pCourse = 0.0, pEdge = 1e3, pArris = 0.0;
float pyrHash( vec2 p ) {
	vec3 q = fract( vec3( p.xyx ) * vec3( 0.1031, 0.1030, 0.0973 ) );
	q += dot( q, q.yzx + 33.33 );
	return fract( ( q.x + q.y ) * q.z );
}
float pyrNoise( vec2 p ) {
	vec2 i = floor( p ), u = fract( p );
	u = u * u * ( 3.0 - 2.0 * u );
	return mix( mix( pyrHash( i ), pyrHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( pyrHash( i + vec2( 0.0, 1.0 ) ), pyrHash( i + vec2( 1.0 ) ), u.x ), u.y );
}
// The share of a pixel f wide, at d from the middle of a line w wide, that the line covers.
float pyrLine( float d, float w, float f ) {
	f = max( f, 1e-5 );
	return max( 0.0, min( 0.5 * w, d + 0.5 * f ) - max( - 0.5 * w, d - 0.5 * f ) ) / f;
}
// A band between lo and hi, its edges e soft.
float pyrBand( float y, float lo, float hi, float e ) {
	return smoothstep( lo - e, lo + e, y ) * ( 1.0 - smoothstep( hi - e, hi + e, y ) );
}
// GGX's spread of a highlight, as a share of its peak, for the cosine c between a normal and the half way direction,
// at roughness r.
float pyrLobe( float c, float r ) {
	float a2 = max( r * r * r * r, 1e-6 ), d = clamp( c, 0.0, 1.0 );
	d = d * d * ( a2 - 1.0 ) + 1.0;
	return a2 * a2 / max( d * d, 1e-12 );
}
// The joint under course unit u: none (0), a hairline (1), or the deeper joint that ends a band (2). In each band one
// course is three units tall, and another two where they do not meet.
float pyrJoint( float u ) {
	float B = ${f(C.band)}, b = floor( u / B ), r = u - b * B;
	if ( r < 0.5 ) return 2.0;
	float s1 = 1.0 + floor( pyrHash( vec2( b, 3.1 ) ) * ( B - 3.0 ) );
	if ( r > s1 + 0.5 && r < s1 + 2.5 ) return 0.0;
	float s2 = 1.0 + floor( pyrHash( vec2( b, 7.7 ) ) * ( B - 2.0 ) );
	if ( abs( r - s2 - 1.0 ) < 0.5 && ( s2 + 1.0 < s1 - 0.5 || s2 > s1 + 2.5 ) ) return 0.0;
	return 1.0;
}
// The place on the face, so far across and so high, that a pixel at q mirrors, when its ray is turned by s from the
// stone's own (per unit off) and the thing stands D off.
#define PYR_AT( D ) ( q + ( D ) * s )
float pyrLitNight( vec2 q, vec2 s ) {
	vec2 k = PYR_AT( ${f(L.night.D)} );
	return mix( ${f(L.night.low)}, ${f(L.night.top)}, smoothstep( 0.0, ${f(TALL)}, k.y ) ) * ( 1.0 + ${f(L.night.moonward)} * smoothstep( - 70.0, 70.0, k.x ) );
}
float pyrDarkNight( vec2 q, vec2 s, float fB, float fT ) {
	vec2 k = PYR_AT( ${f(D.night.D)} );
	float l = ${f(D.night.base)} * ( 1.0 - ${f(D.night.top)} * smoothstep( 20.0, 95.0, k.y ) ) * ( 1.0 - ${f(D.night.front)} * smoothstep( 0.0, 70.0, k.x ) );
	// The lit city mirrored low on the face: blocks of towers, each with its own top, their windows lit here and
	// there and a little taller than they are wide, as the plates stretch them. Under a pixel a window is its cell's
	// average.
	vec2 p = PYR_AT( ${f(CI.D)} );
	float fp = fB + ${f(CI.D)} * fT;
	float bw = ${f(CI.block[0])} + ${f(CI.block[1] - CI.block[0])} * pyrHash( vec2( floor( p.x / ${f(CI.block[0])} ), 13.0 ) );
	float bx = floor( p.x / bw ), top = ${f(CI.top[0])} + ${f(CI.top[1] - CI.top[0])} * pyrHash( vec2( bx, 21.0 ) ) * ( 0.6 + 0.4 * pyrNoise( vec2( p.x / 40.0, 2.0 ) ) );
	float inB = ( 1.0 - smoothstep( top - 0.3 - fp, top + 0.3 + fp, p.y ) ) * smoothstep( - 2.0, 0.0, p.y );
	vec2 cs = ${v2(CI.cell)}, c = p / cs, ci = floor( c ), cf = fract( c );
	float share = mix( ${f(CI.share[0])}, ${f(CI.share[1])}, pyrHash( vec2( bx, 31.0 ) ) );
	float on = step( pyrHash( ci + vec2( 5.1, bx ) ), share ) * ( 0.35 + 0.65 * pyrHash( ci + 9.7 ) );
	float ex = 0.5 * fp / cs.x, ey = 0.5 * fp / cs.y;
	float win = pyrBand( cf.x, 0.28, 0.72, ex ) * pyrBand( cf.y, 0.12, 0.84, ey );
	float fine = smoothstep( 0.8, 2.0, cs.x / max( fp, 1e-4 ) );
	float lights = mix( share * 0.29, on * win, fine ) * ( 1.0 - ${f(CI.fade)} * smoothstep( 0.0, top, p.y ) );
	float city = inB * ( ${f(CI.power)} * lights + mix( ${f(CI.wall[0])}, ${f(CI.wall[1])}, pyrHash( vec2( bx, 47.0 ) ) ) );
	vec2 g = PYR_AT( ${f(D.foot.D)} );
	float lift = ${f(D.foot.power)} * exp( - max( g.y, 0.0 ) / ${f(D.foot.tall)} ) * ( 0.7 + 0.3 * pyrNoise( vec2( g.x / 17.0, 4.0 ) ) ) + city;
	pWarm = clamp( lift / max( l + lift, 1e-4 ), 0.0, 1.0 );
	return l + lift;
}
// The light high overhead that the rounded front arris turns to, the glow along the horizon behind that the rounded
// right hand outline turns to, and the city's glow behind the left hand outline, from r: spread is how far r turns
// across the pixel, in radians, which widens their edges and dims them by as much, so a line of them seen in a round
// finer than a pixel is its pixel's average.
float pyrZen( vec3 r, float spread ) {
	float a = acos( clamp( dot( r, uZen.xyz ), - 1.0, 1.0 ) ), a0 = acos( clamp( uZenW.x, - 1.0, 1.0 ) ), a1 = acos( clamp( uZenW.y, - 1.0, 1.0 ) );
	float am = 0.5 * ( a0 + a1 ), aw = min( am + spread, 3.1 );
	return uZen.w * am / aw * ( 1.0 - smoothstep( a1 - spread, a0 + spread, a ) );
}
float pyrRims( vec3 r, float spread ) {
	return uRim.x * ( uRim.z - uRim.y ) / ( uRim.z - uRim.y + 2.0 * spread ) * pyrBand( r.y, uRim.y, uRim.z, 0.03 + spread ) * smoothstep( 0.0, 0.12, r.x );
}
float pyrLeft( vec3 r, float spread ) {
	return ${f(N.left.power * (N.left.hi - N.left.lo))} / ( ${f(N.left.hi - N.left.lo)} + 2.0 * spread ) * pyrBand( r.y, ${f(N.left.lo)}, ${f(N.left.hi)}, 0.03 + spread ) * smoothstep( 0.0, 0.12, - r.x );
}`;

  // After <color_fragment>: how each stone is laid at this pixel (pKick: the kick and the bow; pTilt: the plate's own
  // tilt), and the casing's joints, kept for the later steps.
  const COLOR = `
vec2 pTilt = vec2( 0.0 ), pKick = vec2( 0.0 );
float pJoint = 0.0, pPlate = 0.0, pLip = 0.0;
{
	vec3 n = normalize( vNq );
	float hl = length( n.xz );
	bool face = abs( n.y - ${f(Math.cos(SLOPE))} ) < 0.002 && hl > 0.5;
	vec2 along = hl > 1e-4 ? vec2( n.z, - n.x ) / hl : vec2( 1.0, 0.0 );
	float s = dot( vQ.xz, along ), y = vQ.y, fy = max( fwidth( y ), 1e-5 ), fs = fwidth( s ), U = ${f(C.unit)};
	bool cap = vKind > 0.875, plinth = abs( vKind - ${f(KIND.plinth)} ) < 0.05;
	if ( face && ( vKind < 0.25 || cap ) ) {
		float hw = ${f(HALF)} * ( 1.0 - y / ${f(TALL)} ) + ( plinth ? ${f((FORM.foot.proud * SLANT) / TALL)} : 0.0 );
		float dE = ( hw - abs( s ) ) * ${f(ACROSS)};
		float clear = cap ? smoothstep( ${f(N.kick.cap[0])}, ${f(N.kick.cap[1])}, dE ) : smoothstep( ${f(N.kick.clear[0])}, ${f(N.kick.clear[1])}, dE ) * ( 1.0 - smoothstep( ${f(FORM.cap.from - N.kick.top)}, ${f(FORM.cap.from)}, y ) );
		vec2 rel = vec2( s, y * ${f(SLANT / TALL)} ) - ( cap ? vec2( 0.0, ${f(capMid * SLANT / TALL)} ) : vec2( ${f(N.bow.heart[0])}, ${f(N.bow.heart[1] * SLANT / TALL)} ) );
		pKick = ${v2(N.kick.at)} * clear + rel * ( cap ? vec2( ${f(N.bow.cap)} ) : ${v2(N.bow.per)} );
	}
	if ( face && vKind < ${f((KIND.body + KIND.plinth) / 2)} ) {
		float side = floor( atan( n.z, n.x ) * 0.6366 + 4.5 );
		// The course this pixel is in: from the joint under it to the joint over it.
		float u = floor( y / U ), lo = u, hi = u + 1.0;
		for ( int i = 0; i < 3; i++ ) if ( pyrJoint( lo ) < 0.5 ) lo -= 1.0;
		for ( int i = 0; i < 3; i++ ) if ( pyrJoint( hi ) < 0.5 ) hi += 1.0;
		float kLo = pyrJoint( lo ), kHi = pyrJoint( hi ), units = hi - lo;
		pCourse = lo + side * 211.0;
		float P = ${f(C.plate)} + ${f(C.plateTall)} * units;
		float x = ( s + pyrHash( vec2( lo, side * 7.0 + 1.0 ) ) * P ) / P, k = floor( x ), seed = lo + side * 131.0;
		// Each joint stands a little off its place, so the plates of a course differ in length.
		float b0 = k + ( pyrHash( vec2( k, seed ) ) - 0.5 ) * ${f(C.jag)}, b1 = k + 1.0 + ( pyrHash( vec2( k + 1.0, seed ) ) - 0.5 ) * ${f(C.jag)};
		float col = x < b0 ? k - 1.0 : ( x >= b1 ? k + 1.0 : k );
		vec2 id = vec2( col + side * 517.0, lo );
		float h1 = pyrHash( id ), h2 = pyrHash( id + 17.13 ), h3 = pyrHash( id + 41.71 ), h4 = pyrHash( id + 73.3 );
		// Seen from far off a course is under a pixel: its differences fade out before they can alias.
		float big = smoothstep( 1.0, 2.5, U / fy );
		float ds = min( abs( x - b0 ), abs( x - b1 ) ) * P;
		float yLo = lo * U, yHi = hi * U;
		float hair = smoothstep( 1.5, 3.0, U / fy );
		float jLo = ( kLo > 1.5 ? ${f(J.deep)} : ${f(J.line)} ) * pyrLine( y - yLo, ${f(C.line)}, fy );
		float jHi = ( kHi > 1.5 ? ${f(J.deep)} : ${f(J.line)} ) * pyrLine( y - yHi, ${f(C.line)}, fy );
		pJoint = hair * max( max( jLo, jHi ), ${f(J.plate)} * pyrLine( ds, ${f(C.line)}, fs ) );
		// The plate's upper chamfer, turned up to the sky, just under the joint over it.
		pLip = hair * pyrLine( y - ( yHi - ${f(C.line + C.lip / 2)} ), ${f(C.lip)}, fy );
		// Each plate's own tilt, steady across it, and a little more for a few; each band of courses a hair.
		float bb = floor( lo / ${f(C.band)} ) + side * 37.0;
		vec2 own = ( vec2( h1, h2 ) - 0.5 ) * 2.0;
		own *= h4 < ${f(T.share)} ? ${f(T.odd)} / max( length( own ), 0.3 ) : ${f(T.plate)};
		// Far off the face reads as one plane first: the plates' differences are a little less there than close up.
		pTilt = ( own * mix( ${f(T.far)}, 1.0, smoothstep( 3.0, 7.0, U / fy ) ) + ( vec2( pyrHash( vec2( bb, 2.3 ) ), pyrHash( vec2( bb, 8.9 ) ) ) - 0.5 ) * 2.0 * ${f(T.band)} ) * big;
		pSoft = 1.0 + ( h3 - 0.5 ) * 2.0 * ${f(N.moon.vary)} * big;
		pPlate = ( h1 - 0.5 ) * 2.0 * ${f(N.plate)} * big;
	}
}
// The faces of the body, the foot course and the capstone, bent near each arris, and the body's faces near their top
// edge, as a round of FORM.round.seen would bend them: so the mirrored line of the night along an arris is as wide as
// that round, smooth at any size, and its edge widened by how far the bend turns across the pixel.
vec3 pBend = vec3( 0.0 );
float pBent = 0.0, pSpread = 0.0;
{
	vec3 n = normalize( vNq );
	float hl = length( n.xz );
	bool face = abs( n.y - ${f(Math.cos(SLOPE))} ) < 0.002 && hl > 0.5;
	float pix = length( fwidth( vQ ) );
	bool plinth = abs( vKind - ${f(KIND.plinth)} ) < 0.05;
	if ( face && ( vKind < 0.25 || vKind > 0.875 ) ) {
		vec2 a = vec2( n.z, - n.x ) / hl;
		float s = dot( vQ.xz, a ), y = vQ.y, hw = ${f(HALF)} * ( 1.0 - y / ${f(TALL)} ) + ( plinth ? ${f((FORM.foot.proud * SLANT) / TALL)} : 0.0 );
		float dR = ( hw - s ) * ${f(ACROSS)}, dL = ( hw + s ) * ${f(ACROSS)};
		vec3 nb = dR < dL ? vec3( a.x * hl, n.y, a.y * hl ) : vec3( - a.x * hl, n.y, - a.y * hl );
		pEdge = min( dR, dL );
		float w = 0.5 * ( 1.0 - min( dR, dL ) / ${f(FORM.round.seen.arris)} );
		float top = vKind < 0.125 ? 0.5 * ( 1.0 - ( ${f(FORM.cap.from)} - y ) / ${f(Math.sin(SLOPE) * FORM.round.seen.lip)} ) : 0.0;
		if ( top > w && top > 0.0 ) {
			pBend = normalize( mix( n, vec3( 0.0, 1.0, 0.0 ), top ) );
			pSpread = ${f(SLOPE)} / ${f(FORM.round.seen.lip)} * pix * min( 1.0, top * 10.0 );
			pBent = 1.0;
		} else if ( w > 0.0 ) {
			pBend = normalize( mix( n, nb, w ) );
			pArris = ( n.x + nb.x < 0.0 && n.z + nb.z > 0.0 ) ? 1.0 : 0.0;
			pSpread = ${f(TURN)} / ${f(FORM.round.seen.arris)} * pix * min( 1.0, w * 10.0 );
			pBent = 1.0;
		}
	}
	// A pixel on the real round of an arris is shaded as the bent faces are where they meet it, by the line halfway
	// between the two faces, so the round and the bends either side of it are one: shaded by its own normals, which
	// turn the whole way from face to face, the round broke the line into dots wherever it was under a pixel.
}`;

  const ROUGH = `
roughnessFactor = clamp( vKind > 0.625 ? uRough.y : abs( vKind - ${f(KIND.neck)} ) < 0.05 ? 0.6 : uRough.x, 0.04, 1.0 );`;

  const NORMAL = `
if ( pBent > 0.5 ) normal = normalize( ( viewMatrix * vec4( uToWorld * pBend, 0.0 ) ).xyz );
// The round of an arris is the arris stone's, not a plate's: a plate's own tilt there toothed the outline course by
// course.
pTilt *= 1.0 - pBent;
normal = normalize( normal + vTv * ( pTilt.x + pKick.x ) + vBv * ( pTilt.y + pKick.y ) );`;

  // Before <lights_fragment_end>: what the gold mirrors and the lights it catches, in place of the stage's own. The
  // moon's highlight is worked out here, with the plates' own normals, and lit by the share of the moon the place
  // sees (baked): the stage's own light from the moon is left out (uMoonSpec). The world's light then takes some of
  // the night away where the place is shut in; a mirror is shut in only where what it mirrors is hidden, so most of
  // that is given back and a little contact shadow is kept.
  const ENV = `
float pLevel = 0.0;
{
	vec3 nL = normalize( vNq );
	bool toMoon = nL.z > 0.5;
	vec3 tA = toMoon ? vec3( 1.0, 0.0, 0.0 ) : vec3( 0.0, 0.0, 1.0 );
	vec3 tU = toMoon ? vec3( 0.0, ${f(TALL / SLANT)}, ${f(-HALF / SLANT)} ) : vec3( ${f(HALF / SLANT)}, ${f(TALL / SLANT)}, 0.0 );
	vec3 n0 = normalize( ( viewMatrix * vec4( uToWorld * normalize( nL + tA * pKick.x + tU * pKick.y ), 0.0 ) ).xyz );
	vec3 rv = reflect( - geometryViewDir, normal ), rW = inverseTransformDirection( rv, viewMatrix );
	vec3 dr = ( rW - inverseTransformDirection( reflect( - geometryViewDir, n0 ), viewMatrix ) ) * uToWorld;
	vec2 q = vec2( dot( vQ, tA ), vQ.y ), s = vec2( dot( dr, tA ), dot( dr, tU ) * ${f(TALL / SLANT)} );
	vec2 fq = fwidth( q ), fsv = fwidth( s );
	float fB = max( fq.x, fq.y ), fT = max( fsv.x, fsv.y );
	bool neck = abs( vKind - ${f(KIND.neck)} ) < 0.05, bevel = abs( vKind - ${f(KIND.bevel)} ) < 0.05;
	bool ledge = vKind < 0.1 && nL.y > 0.9;
	bool stone = ! neck && ! bevel && ! ledge;
	if ( neck ) pLevel = ${f(E.neck)};
	else if ( ledge ) pLevel = mix( ${f(E.ledge[0])}, ${f(E.ledge[1])}, smoothstep( - 0.4, 0.6, rW.x ) );
	else if ( bevel ) pLevel = 0.03 + ${f(E.bevel)} * smoothstep( 0.45, 0.95, rW.y );
	else pLevel = toMoon ? pyrLitNight( q, s ) : pyrDarkNight( q, s, fB, fT );
	// The land's pale strip at the foot, faint in the lowest course.
	if ( stone && vKind < 0.1 ) pLevel += ( toMoon ? ${f(N.strip.lit)} : ${f(N.strip.dark)} ) * exp( - max( vQ.y - ${f(FORM.foot.tall)}, 0.0 ) / ${f(N.strip.tall)} );
	// The moon's own highlight, by each place's own normal.
	vec3 nW = inverseTransformDirection( normal, viewMatrix ), vW = inverseTransformDirection( geometryViewDir, viewMatrix );
	vec3 mW = vec3( ${MOON.map(f).join(', ')} ), hW = normalize( mW + vW );
	float seen = 1.0;
	#ifdef WORLD_BAKED
		seen = smoothstep( ${f(N.moon.seen[0])}, ${f(N.moon.seen[1])}, wLight.y );
	#endif
	if ( ! neck ) pLevel += ${f(N.moon.power)} * pyrLobe( dot( nW, hW ), ${f(N.moon.rough)} * pSoft ) * smoothstep( 0.0, 0.2, dot( nW, mW ) ) * seen;
	// The front arris's line is brightest low and wavers along its length as a polished round does: of one weight from
	// top to foot it read as a drawn stroke. The outlines are kept faint, and uneven.
	// They are the rounds' own: the kicked plates of a face may turn to the same lights, and lit the whole face.
	float sp = min( 1.2, pSpread ), wav = 1.0 - ${f(N.arris.waver)} * pyrNoise( vec2( vQ.y / 6.0, 3.0 ) );
	pLevel += pBent * pyrZen( rW, sp ) * mix( 1.0, ( 1.0 - ${f(N.arris.high)} * smoothstep( 15.0, 80.0, vQ.y ) ) * wav, pArris );
	pLevel += pBent * pyrRims( rW, sp ) * ( 1.0 - 0.7 * pyrNoise( vec2( vQ.y / 9.0, 7.0 ) ) );
	pLevel += pBent * pyrLeft( rW, sp ) * ( 1.0 - 0.7 * pyrNoise( vec2( vQ.y / 8.0, 11.0 ) ) );
	#ifdef WORLD_GLINT
	if ( stone && vKind < 0.1 ) {
		// The cursor: a small light seen in the plates round where the cursor's ray meets the face, as the moon's
		// highlight is, and caught by each plate by its own tilt, so the plates under it light one after another as it
		// moves.
		float gk = dot( n0, vRay ), gt = dot( n0, geometryPosition ) / ( abs( gk ) > 1e-6 ? gk : 1e-6 );
		vec3 gOff = ( vec4( vRay * gt - geometryPosition, 0.0 ) * viewMatrix ).xyz * uToWorld / uUnit;
		vec2 gd = vec2( dot( gOff, tA ), dot( gOff, tU ) ) / ${f(G.D)} - pTilt;
		float gc = 1.0 / sqrt( 1.0 + dot( gd, gd ) );
		pLevel += step( 0.0, gt ) * uGlint.r * ${f(G.power)} * pow( pyrLobe( gc, ${f(G.rough)} ), 2.0 ) * smoothstep( ${f(G.clear[0])}, ${f(G.clear[1])}, pEdge );
	}
	#endif
	radiance = vec3( pLevel );
	#ifdef WORLD_BAKED
		radiance *= mix( 1.0, wLight.z, uContact ) / max( mix( 1.0, wLight.z, 0.7 ), 0.05 );
	#endif
	reflectedLight.directSpecular *= uMoonSpec;
}`;

  // Before <opaque_fragment>: how much the place mirrors, given the color polished gold gives it: richest where it is
  // low, the world's gold through the middle, and paling toward pale gold only where it is high. The joints, the
  // capstone's faint groove and the foot course's shadow line are drawn here.
  const GRADE = `
{
	float lv = max( outgoingLight.r, 0.0 );
	vec3 n = normalize( vNq );
	float hl = length( n.xz ), y = vQ.y, fy = max( fwidth( y ), 1e-5 );
	bool face = abs( n.y - ${f(Math.cos(SLOPE))} ) < 0.002 && hl > 0.5;
	if ( abs( vKind - ${f(KIND.neck)} ) < 0.05 ) lv = ${f(E.neck)} * min( lv / ${f(E.neck)}, 1.0 );
	lv *= ( 1.0 - pJoint ) * ( 1.0 + pPlate );
	lv += ( n.z > 0.5 ? ${f(J.catch[0])} : ${f(J.catch[1])} ) * pLip;
	// The inner corner over the foot course, shut in.
	if ( face && vKind < 0.1 ) lv *= 1.0 - ${f(E.shadow)} * pyrBand( y, ${f(FORM.foot.tall)} - 0.5, ${f(FORM.foot.tall + E.shadowTall)}, 0.5 * fy );
	// The capstone's border: a faint groove so far in from its edges, deeper in some places than in others.
	if ( face && vKind > 0.875 ) {
		vec2 a = vec2( n.z, - n.x ) / hl;
		float s = dot( vQ.xz, a ), hw = ${f(HALF)} * ( 1.0 - y / ${f(TALL)} );
		float d = min( min( hw - s, hw + s ) * ${f(ACROSS)}, ( y - ${f(FORM.cap.from + FORM.cap.reveal)} ) * ${f(SLANT / TALL)} ), fd = max( fwidth( d ), 1e-5 );
		lv *= 1.0 - ${f(K.dark)} * pyrNoise( vec2( ( s + y ) / 5.0, 17.0 ) ) * pyrLine( d - ${f(K.border)}, ${f(K.groove)}, fd );
	}
	vec3 deep = mix( mix( uDeepC, uBodyC, smoothstep( uGradeLo.x, uGradeLo.y, lv ) ), uWarmC, pWarm );
	vec3 c = mix( mix( deep, uMidC, smoothstep( uGradeAt.x, uGradeAt.y, lv ) ), uPaleC, smoothstep( uGradeAt.z, uGradeAt.w, lv ) ) * lv;
	outgoingLight = c;
}`;
  return { PARS, COLOR, ROUGH, NORMAL, ENV, GRADE };
}
