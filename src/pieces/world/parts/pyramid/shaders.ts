import { FORM } from './form';
import { MOONWARD, PYRAMID } from '../../layout';

// The pyramid's shaders, laid into a physical material (onBeforeCompile) before the world's light (../../light.ts).
// Polished gold is what it mirrors and the lights it catches. The moon stands behind the world to the right, and the
// half way direction between it and the visitor lies a few degrees off the normal of the face toward it. The plates
// of that face are set with a kick at their foot that turns them that few degrees, and the face bows a hair, so the
// moon's own highlight lands on the face and spreads over it as one sheet. The gold is polished over a hand worked
// face: a broad lobe (the face's own slow unevenness) that lays the saturated body of the blaze, and a narrow one
// (the polish) that is its pale heart. The cladding warps slowly over many plates, which is all that moves its tone;
// a plate shows by its hairline joints, a catch on a chamfer here and there, and a few plates a step off. The polish
// also mirrors the land's pale lip low on the face, a sharp line broken by a hair at each joint. The face turned from
// the moon mirrors the night, lighter toward its foot, a soft long sheen of the horizon's glow, and low down the belt
// of trees and the land's strip before it, blurred. The front arris turns up to a light high overhead (uZen) as one
// pale line; the outlines and the capstone's border are quiet. The cursor is mirrored as a tall thin streak up the
// slope, paler than what it crosses with a touch of dark beside it, shifted plate by plate.
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
  // moon's half way direction as the view has it (-0.033 across, -0.287 up, measured from the plan with the moon at 22 degrees). It is laid off
  // within `clear` of an arris (`cap` on the capstone) and `top` under the reveal, where the plates meet the arris
  // stones flush. Then the face's bow: so much tilt for each unit from the face's heart, across and up the slope;
  // the heart, across and up; and the capstone's own bow, which is a polished stone of its own.
  kick: { at: [-0.033, -0.287], clear: [0.3, 1.6], cap: [0.6, 3.5], top: 2.5 },
  bow: { per: [0.0006, 0.0018], heart: [6, 20], cap: 0 },
  // How each plate lies off the face, steady across it: the cladding's slow warp, a noise over cells `cells` plates
  // across and courses up, by up to `warp`; each plate's own by up to `plate`; and a share `share` of plates a clear
  // step off by `odd`. Kept this small the face reads as one sheet first: a plate a step off its neighbours in the
  // blaze read as a patchwork.
  tilt: { warp: 0.016, cells: [6, 12], plate: 0.0011, odd: 0.0055, share: 0.035 },
  // The moon's highlight, GGX's lobe at two roughnesses: the broad body of the blaze and its narrow pale heart, each
  // with how bright at its peak, and the heart's lobe raised to a power so its edge falls off faster than GGX's long
  // skirt (with it the heart was a soft round spot); how much each plate's polish differs; the share of the moon seen (baked) over which
  // it comes on; and how much brighter the capstone's polish takes it.
  moon: { body: { rough: 0.5, power: 1.05 }, heart: { rough: 0.34, power: 2.2, sharp: 2.2 }, vary: 0.03, seen: [0.15, 0.7], cap: 1.35 },
  lit: {
    // The night the face toward the moon mirrors where the moon's highlight is not: its level at the foot and at the
    // apex, and how much lighter it is toward the moon, at the face's right.
    night: { D: 520, low: 0.05, top: 0.075, moonward: 0.3 },
    // The land's lit edge and the pale ground before the pyramid, mirrored low on the face as a band under a crisp
    // upper edge: how far off the edge stands, how high it is mirrored at the face's left and how much it rises
    // across it, how much brighter the band is than what is above it, and how much warmer (the color it is mixed
    // toward, as a share of each channel, and how far).
    land: { D: 45, at: 9, rise: 0.06, power: 0.3, warm: [1, 0.93, 0.78], warmth: 0.75 },
  },
  dark: {
    // The night: its level at the foot of the face and at its top (each piece, the body and the capstone, its own),
    // which is what the satin gold mirrors there: lighter toward the horizon low down.
    night: { D: 520, low: 0.08, top: 0.018 },
    // The horizon's glow mirrored as a soft long sheen across the face: how high it crosses the face's left, how
    // much it falls across it, how wide, and how much it lifts the night.
    sheen: { D: 520, at: 34, rise: -0.25, wide: 13, power: 1.8 },
    // The belt of trees before the face, mirrored low on it and blurred by the gold: how far off, how far apart the
    // crowns stand, how high their tops are mirrored, their radius, how soft, and how bright, the darkest to the
    // lightest.
    trees: { D: 45, gap: 8, tall: [6, 12], r: [3.6, 6], soft: 2.6, power: [0.13, 0.26] },
  },
  // The land's pale strip at the foot, mirrored in the lowest courses of each face: how tall, how bright on the face
  // toward the moon and on the other.
  strip: { tall: 2.2, lit: 0.3, dark: 0.16 },
  // The cursor's light, mirrored as one straight streak up the face: how far across from the face's middle it can
  // be drawn (where the cursor's ray meets the face's plane is drawn in toward the middle by a tanh of this), the
  // heights its middle is held between, how far up and down it runs (the height at which it is down to a third),
  // how wide it is, how bright on the face toward the moon and on the other, and how far from an arris it is gone.
  glint: { reach: 56, rest: [16, 60], long: 34, wide: 1.1, power: [2.2, 0.7], clear: [1.5, 5] },
  // The front arris's line: how much dimmer it is high up than low, and how much it wavers along its length.
  arris: { high: 0.5, waver: 0.35 },
  // The left hand outline's edge light, kept to almost nothing: the city's glow along the horizon behind it, how
  // bright, and from what height to what height, as the sine of the angle over the horizon.
  left: { power: 0.45, lo: -0.05, hi: 0.5 },
  // The joints' shadow: the hairline of a seam between courses, and of an upright joint between sheets where it shows
  // (over what share of a hash it comes in); over how many pixels a row must be for the seams to show at all; and the
  // catch of light on each sheet's upper chamfer, on the face toward the moon and on the other, and the share of
  // sheets on which it is full.
  joint: { line: 0.3, plate: 0.35, shows: [0.62, 0.96], fade: [3, 6], catch: [0.4, 0.06], catchShare: 0.6 },
  // How much each plate's mirrored light differs from its neighbours'.
  plate: 0.008,
  // The foot course's bevel and the shadow line over it, the neck in the reveal, and the body's level top round the
  // capstone's foot, seen nearly edge on: what it mirrors, the horizon behind, from its left to its right.
  edges: { bevel: 1.1, shadow: 0.55, shadowTall: 0.45, neck: 0.012, ledge: [0.12, 0.6] },
  // The capstone's border, kept to almost nothing: a faint groove so far in from its edges, how dark at most. Then its
  // face toward the moon: the moon's light at its foot and at its apex, as a share of what the stone's polish gives,
  // and the band of the horizon's glow it mirrors: how high over the capstone's foot at its middle, how much it rises
  // across, how wide, and how bright.
  cap: { border: 2.8, groove: 0.2, dark: 0.35, rake: [0.75, 1.25], band: { at: 9, rise: -0.12, wide: 3.2, power: 1.4 } },
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
  const L = N.lit, D = N.dark, G = N.glint, E = N.edges, K = N.cap, J = N.joint, T = N.tilt, TR = D.trees, M = N.moon;
  const capFoot = FORM.cap.from + FORM.cap.reveal;
  const capMid = capFoot + (TALL - capFoot) / 3;
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
float pSoft = 1.0, pWarm = 0.0, pEdge = 1e3, pArris = 0.0, pLand = 0.0;
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
// Whether the line between ruled rows k - 1 and k is a seam between courses: every third is, so a course is at most
// three rows tall.
bool pyrSeam( float k, float side ) {
	return mod( k, 3.0 ) < 0.5 || pyrHash( vec2( k, side * 13.0 + 2.0 ) ) > ${f(C.merge)};
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
// The place on the face, so far across and so high, that a pixel at q mirrors, when its ray is turned by s from the
// stone's own (per unit off) and the thing stands D off.
#define PYR_AT( D ) ( q + ( D ) * s )
float pyrLitNight( vec2 q, vec2 s ) {
	vec2 k = PYR_AT( ${f(L.night.D)} );
	return mix( ${f(L.night.low)}, ${f(L.night.top)}, smoothstep( 0.0, ${f(TALL)}, k.y ) ) * ( 1.0 + ${f(L.night.moonward)} * smoothstep( - 70.0, 70.0, k.x ) );
}
// The land's lit edge and the pale ground before it, mirrored low on the face toward the moon: how much of the pixel
// lies under the edge's mirrored line. fB is how far a pixel spans on the face and fT how far its ray turns, so the
// edge is one pixel crisp at any size; each sheet's own tilt moves it by a hair.
float pyrLand( vec2 q, vec2 s, float fB, float fT ) {
	vec2 k = PYR_AT( ${f(L.land.D)} );
	float fp = max( fB + ${f(L.land.D)} * fT, 1e-4 ), d = k.y - ( ${f(L.land.at)} + ${f(L.land.rise)} * ( k.x + ${f(HALF)} ) + 1.2 * pyrNoise( vec2( k.x / 31.0, 4.0 ) ) );
	return clamp( 0.5 - d / fp, 0.0, 1.0 );
}
// What the face turned from the moon mirrors: the night, lighter toward the horizon low on each piece (lo and hi are
// the piece's foot and top), the horizon's glow as a soft long sheen across it, and low down the trees before it and
// the land's strip, all blurred by the satin gold.
float pyrDarkNight( vec2 q, vec2 s, float lo, float hi ) {
	vec2 k = PYR_AT( ${f(D.night.D)} );
	float h = clamp( ( k.y - lo ) / max( hi - lo, 1.0 ), 0.0, 1.0 );
	float l = mix( ${f(D.night.low)}, ${f(D.night.top)}, smoothstep( 0.0, 1.0, h ) );
	vec2 g = PYR_AT( ${f(D.sheen.D)} );
	float sd = ( g.y - ( ${f(D.sheen.at)} + ${f(D.sheen.rise)} * ( g.x + ${f(HALF)} ) ) ) / ${f(D.sheen.wide)};
	l *= 1.0 + ${f(D.sheen.power)} * exp( - sd * sd ) * ( 0.75 + 0.25 * pyrNoise( vec2( g.x / 23.0, 5.0 ) ) );
	// The crowns, each a round top, the nearest of three, over the belt of their own shade, all blurred by the satin.
	vec2 p = PYR_AT( ${f(TR.D)} );
	float c0 = floor( p.x / ${f(TR.gap)} ), crown = 0.0, lit = 0.0;
	for ( int i = - 1; i <= 1; i++ ) {
		float c = c0 + float( i ), cx = ( c + 0.15 + 0.7 * pyrHash( vec2( c, 3.3 ) ) ) * ${f(TR.gap)};
		float r = mix( ${f(TR.r[0])}, ${f(TR.r[1])}, pyrHash( vec2( c, 5.9 ) ) );
		float top = mix( ${f(TR.tall[0])}, ${f(TR.tall[1])}, pyrHash( vec2( c, 8.1 ) ) );
		float e = length( vec2( p.x - cx, ( p.y - ( top - r ) ) * 1.2 ) ) - r;
		float on = 1.0 - smoothstep( - ${f(TR.soft)}, ${f(TR.soft)}, e );
		float lc = mix( ${f(TR.power[0])}, ${f(TR.power[1])}, pyrHash( vec2( c, 11.7 ) ) ) * ( 0.75 + 0.25 * smoothstep( top - 2.0 * r, top, p.y ) );
		lit = on > crown ? lc : lit;
		crown = max( crown, on );
	}
	float belt = 1.0 - smoothstep( ${f(TR.tall[0] * 0.55)} - ${f(TR.soft)}, ${f(TR.tall[0] * 0.55)} + ${f(TR.soft)}, p.y + 1.5 * pyrNoise( vec2( p.x / 11.0, 1.0 ) ) );
	float tree = max( crown, belt ), shade = mix( ${f(TR.power[0] * 0.8)}, lit, crown / max( tree, 1e-4 ) );
	float strip = ${f(N.strip.dark)} * exp( - max( p.y, 0.0 ) / ${f(N.strip.tall)} ) * ( 0.8 + 0.2 * pyrNoise( vec2( p.x / 13.0, 9.0 ) ) );
	float under = mix( l, shade, tree ) + strip;
	pWarm = clamp( ( under - l ) / max( under, 1e-4 ), 0.0, 1.0 );
	return under;
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
	float s = dot( vQ.xz, along ), y = vQ.y, fy = max( fwidth( y ), 1e-5 ), fs = fwidth( s ), R = ${f(C.row)};
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
		// The course this pixel is in: from the seam under it to the seam over it.
		float lo = floor( y / R ), hi = lo + 1.0;
		for ( int i = 0; i < 2; i++ ) { if ( pyrSeam( lo, side ) ) break; lo -= 1.0; }
		for ( int i = 0; i < 2; i++ ) { if ( pyrSeam( hi, side ) ) break; hi += 1.0; }
		float yLo = lo * R, yHi = hi * R;
		// The sheet along it.
		float P = ${f(C.plate)}, off = pyrHash( vec2( lo, side * 7.0 + 1.0 ) ) * P;
		float x = ( s + off ) / P, k = floor( x ), seed = lo + side * 131.0;
		// Each joint stands well off its place, so the sheets of a course are long and unequal.
		float b0 = k + ( pyrHash( vec2( k, seed ) ) - 0.5 ) * ${f(C.jag)}, b1 = k + 1.0 + ( pyrHash( vec2( k + 1.0, seed ) ) - 0.5 ) * ${f(C.jag)};
		float col = x < b0 ? k - 1.0 : ( x >= b1 ? k + 1.0 : k );
		vec2 id = vec2( col + side * 517.0, lo + side * 61.0 );
		float h1 = pyrHash( id ), h2 = pyrHash( id + 17.13 ), h3 = pyrHash( id + 41.71 ), h4 = pyrHash( id + 73.3 );
		// Seen from far off a row is a few pixels: a sheet's own differences fade out before they can alias.
		float big = smoothstep( 1.5, 4.0, R / fy );
		bool nearLeft = abs( x - b0 ) < abs( x - b1 );
		float ds = ( nearLeft ? abs( x - b0 ) : abs( x - b1 ) ) * P;
		// Most upright joints are closed so tight they are gone; a few show.
		float shows = smoothstep( ${f(J.shows[0])}, ${f(J.shows[1])}, pyrHash( vec2( nearLeft ? k : k + 1.0, seed + 0.5 ) ) );
		// The seams fade out before a row is so few pixels that they would read as ribbing.
		float hair = smoothstep( ${f(J.fade[0])}, ${f(J.fade[1])}, R / fy );
		pJoint = hair * max( ${f(J.line)} * max( pyrLine( y - yLo, ${f(C.line)}, fy ), pyrLine( y - yHi, ${f(C.line)}, fy ) ), ${f(J.plate)} * shows * pyrLine( ds, ${f(C.line)}, fs ) );
		// The sheet's upper chamfer, turned up to the sky, just under the seam over it: it catches on most sheets.
		pLip = hair * pyrLine( y - ( yHi - ${f(C.line + C.lip / 2)} ), ${f(C.lip)}, fy ) * ( h3 < ${f(J.catchShare)} ? 1.0 : 0.25 );
		// How the sheet lies, steady across it: the cladding's slow warp, read at the sheet's middle so the sheet takes
		// it whole; its own hair; and a clear step for a few.
		vec2 wc = vec2( ( ( col + 0.5 ) * P - off ) / ( P * ${f(T.cells[0])} ), 0.5 * ( yLo + yHi ) / ( R * ${f(T.cells[1])} ) ) + side * 5.31;
		vec2 warp = ( vec2( pyrNoise( wc ), pyrNoise( wc + vec2( 19.7, 4.3 ) ) ) - 0.5 ) * 2.0;
		vec2 own = ( vec2( h1, h2 ) - 0.5 ) * 2.0;
		own *= h4 < ${f(T.share)} ? ${f(T.odd)} / max( length( own ), 0.3 ) : ${f(T.plate)};
		pTilt = warp * ${f(T.warp)} + own * big;
		pSoft = 1.0 + ( h3 - 0.5 ) * 2.0 * ${f(M.vary)} * big;
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
	else if ( toMoon ) pLevel = pyrLitNight( q, s );
	else pLevel = vKind > 0.875 ? pyrDarkNight( q, s, ${f(capFoot)}, ${f(TALL)} ) : pyrDarkNight( q, s, 0.0, ${f(FORM.cap.from)} );
	// The land's pale strip at the foot, in the lowest courses of the face toward the moon, and the land's lit edge.
	if ( stone && vKind < 0.1 && toMoon ) {
		pLand = pyrLand( q, s, fB, fT );
		pLevel += ${f(N.strip.lit)} * exp( - max( vQ.y - ${f(FORM.foot.tall)}, 0.0 ) / ${f(N.strip.tall)} );
	}
	// The moon's own highlight, by each place's own normal: the broad body of the blaze and its narrow heart.
	vec3 nW = inverseTransformDirection( normal, viewMatrix ), vW = inverseTransformDirection( geometryViewDir, viewMatrix );
	vec3 mW = vec3( ${MOON.map(f).join(', ')} ), hW = normalize( mW + vW );
	float seen = 1.0;
	#ifdef WORLD_BAKED
		seen = smoothstep( ${f(M.seen[0])}, ${f(M.seen[1])}, wLight.y );
	#endif
	if ( ! neck ) {
		float c = dot( nW, hW ), polish = ( vKind > 0.875 ? ${f(M.cap)} : 1.0 ) * smoothstep( 0.0, 0.2, dot( nW, mW ) ) * seen;
		pLevel += polish * ( ${f(M.body.power)} * pyrLobe( c, ${f(M.body.rough)} * pSoft ) + ${f(M.heart.power)} * pow( pyrLobe( c, ${f(M.heart.rough)} * pSoft ), ${f(M.heart.sharp)} ) );
	}
	pLevel *= 1.0 + ${f(L.land.power)} * pLand;
	// The capstone's face toward the moon is one flat polished stone: the moon's light rakes along its upper slope, so
	// it is brightest toward the apex, and it mirrors one band of the horizon's glow with sharp edges. A highlight in
	// the middle of its face read as a sphere's, or plastic.
	if ( toMoon && vKind > 0.875 && stone ) {
		float hc = clamp( ( vQ.y - ${f(capFoot)} ) / ${f(TALL - capFoot)}, 0.0, 1.0 ), fy = max( fwidth( vQ.y ), 1e-4 );
		pLevel *= mix( ${f(K.rake[0])}, ${f(K.rake[1])}, smoothstep( 0.15, 0.95, hc ) );
		float yb = ${f(capFoot)} + ${f(K.band.at)} + ${f(K.band.rise)} * q.x;
		pLevel += ${f(K.band.power)} * pyrLine( vQ.y - yb, ${f(K.band.wide)}, fy );
	}
	// The front arris's line is brightest low and wavers along its length as a polished round does: of one weight from
	// top to foot it read as a drawn stroke. The outlines are kept faint, and uneven.
	// They are the rounds' own: the kicked plates of a face may turn to the same lights, and lit the whole face.
	float sp = min( 1.2, pSpread ), wav = 1.0 - ${f(N.arris.waver)} * pyrNoise( vec2( vQ.y / 6.0, 3.0 ) );
	pLevel += pBent * pyrZen( rW, sp ) * mix( 1.0, ( 1.0 - ${f(N.arris.high)} * smoothstep( 15.0, 80.0, vQ.y ) ) * wav, pArris );
	pLevel += pBent * pyrRims( rW, sp ) * ( 1.0 - 0.7 * pyrNoise( vec2( vQ.y / 9.0, 7.0 ) ) );
	pLevel += pBent * pyrLeft( rW, sp ) * ( 1.0 - 0.7 * pyrNoise( vec2( vQ.y / 8.0, 11.0 ) ) );
	#ifdef WORLD_GLINT
	if ( stone && vKind < 0.1 ) {
		// The cursor: its light mirrored as one straight, sharp edged streak up the flat face. Where the cursor's ray
		// meets the face's plane, across and up, is drawn in toward the face's middle (as a far light's reflection
		// moves less than the light), so the streak is on the face wherever the pointer is over the top of the world,
		// and slides across it as the pointer moves. Nothing of a sheet's tilt moves it: it is the face's own.
		float gk = dot( n0, vRay ), gt = dot( n0, geometryPosition ) / ( abs( gk ) > 1e-6 ? gk : 1e-6 );
		vec3 gOff = ( vec4( geometryPosition - vRay * gt, 0.0 ) * viewMatrix ).xyz * uToWorld / uUnit;
		vec2 hit = q - vec2( dot( gOff, tA ), dot( gOff, tU ) * ${f(TALL / SLANT)} );
		float gx = ${f(G.reach)} * tanh( hit.x / ${f(G.reach)} ), gy = clamp( hit.y, ${f(G.rest[0])}, ${f(G.rest[1])} );
		float fg = max( fB, 1e-3 ), along = exp( - pow( ( vQ.y - gy ) / ${f(G.long)}, 2.0 ) );
		float core = pyrLine( q.x - gx, ${f(G.wide)}, fg );
		float on = step( 0.0, gt ) * min( uGlint.r, 1.0 ) * along * smoothstep( ${f(G.clear[0])}, ${f(G.clear[1])}, pEdge );
		pLevel += on * core * ( toMoon ? ${f(G.power[0])} : ${f(G.power[1])} );
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
	// The land's lit edge and pale ground mirrored low on the face toward the moon are warmer than the night's blaze.
	outgoingLight = c * mix( vec3( 1.0 ), vec3( ${L.land.warm.map(f).join(', ')} ), pLand * ${f(L.land.warmth)} );
}`;
  return { PARS, COLOR, ROUGH, NORMAL, ENV, GRADE };
}
