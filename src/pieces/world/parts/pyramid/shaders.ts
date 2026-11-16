import { FORM } from './form';
import { PYRAMID } from '../../layout';

// The pyramid's shaders, laid into a physical material (onBeforeCompile) before the world's light (../../light.ts).
// Polished gold is what it mirrors, and under a night sky that is mostly the dark: each face is given a night laid
// out where that face looks, in the face's own measure, and most of it is deep. The face toward the moon mirrors the
// deep night, lighter toward the horizon, the moon's broad light as one sharp edged bright field, and the moon itself
// as one long thin streak: a face that is not quite flat stretches a small light along its slope. The face turned
// from the moon mirrors the dark half of the night, one long soft light up its height, and the city's warm glow along
// its foot. Each thing stands so far off (D), so a face that turns a little mirrors it a little further along, by D
// times the turn: each plate of the casing is tilted a hair, so a sharp edge steps from plate to plate, and the
// rounded arrises sweep through it. The front arris and the right hand outline each turn up to a light of their own,
// high overhead and along the horizon behind (uZen, uRim). The cursor is a thin line of light up the slope that
// slides across the plates under it.
// How much a place mirrors is then given its color, as polished gold gives it: deep and saturated where it mirrors
// little, paling toward pale gold only where it mirrors much.

const f = (v: number): string => v.toFixed(5);
const v2 = (a: readonly number[]): string => `vec2( ${f(a[0])}, ${f(a[1])} )`;
const HALF = PYRAMID.base / 2, TALL = PYRAMID.tall, SLANT = Math.hypot(HALF, TALL);
const SLOPE = Math.atan2(TALL, HALF);
// The angle between two neighbouring faces' normals.
const TURN = Math.acos(HALF ** 2 / (HALF ** 2 + TALL ** 2));
// Which piece a vertex is of, as make.mjs stores it.
export const KIND = { body: 0, plinth: 0.2, bevel: 0.3, neck: 0.5, cap: 1 } as const;
const C = FORM.casing;

// The night each face mirrors, in the face's own measure: across it from its middle toward its right hand corner as
// seen, and up it as a height, in units. Levels are how much is mirrored: about 0.03 is a near black gold, 0.05 a
// deep one, 1 a bright one, and pale gold from about 2.
export const NIGHT = {
  lit: {
    // The night: its level high on the face and toward the horizon low on it, the heights between which the one
    // turns to the other, and how much lighter it is toward the moon, at the face's right.
    night: { D: 520, top: 0.007, low: 0.066, from: 30, to: 85, moonward: 0.7 },
    // The moon's broad light: a field with sharp edges, its middle where on the face, its width, the slant of its
    // edges (radians from upright), how sharp its edges are, how bright at its foot and how much of that is left at
    // its head, where it ends, and a faint skirt outside it.
    field: { D: 420, at: [-30, 0], wide: 17, slant: 0.1, edge: 0.3, power: 1.5, head: 0.4, ends: 74, skirt: 0.04 },
    // The moon: one long thin streak up the slope, where its middle is, how far it runs either way, how wide, how
    // bright, and a faint light round it.
    moon: { D: 220, at: [24, 40], run: 17, wide: 1.1, power: 9, glow: 0.3 },
  },
  dark: {
    // The night: its level, how much darker it is high on the face and next to the front arris.
    night: { D: 520, base: 0.034, top: 0.55, front: 0.5 },
    // One long soft light up its height: from where to where, how wide, how bright.
    way: { D: 800, from: [-58, -8], to: [-6, 112], wide: 14, power: 0.16 },
    // The city's warm glow along its foot: how tall and how bright.
    foot: { D: 300, tall: 5, power: 0.09 },
  },
  // The cursor's line: how far it runs either way up the slope, how wide, how bright, a faint light round it.
  glint: { D: 300, run: 13, wide: 0.45, power: 3.5, glow: 0.18 },
  // The deeper joint's lit lip, the foot course's bevel and the shadow line over it.
  edges: { lip: 0.07, bevel: 1.1, shadow: 0.55, shadowTall: 0.45 },
  // The capstone's raised border: how far in from its edges, the groove, the lit lip outside it, and how much less
  // the panel inside it mirrors.
  cap: { border: 2.8, groove: 0.24, lip: 0.14, panel: 0.88 },
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
  const L = N.lit, D = N.dark, G = N.glint, E = N.edges, K = N.cap;
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
uniform vec3 uMidC;
uniform vec3 uPaleC;
uniform vec3 uWarmC;
uniform vec4 uGradeAt;
uniform vec3 uRough;
uniform float uContact;
uniform float uMoonSpec;
uniform mat3 uToWorld;
float pSoft = 1.0, pWarm = 0.0, pCourse = 0.0;
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
// face's own (per unit off) and the thing stands D off.
#define PYR_AT( D ) ( q + ( D ) * s )
float pyrLitNight( vec2 q, vec2 s, float fB, float fT ) {
	vec2 k = PYR_AT( ${f(L.night.D)} );
	float l = mix( ${f(L.night.low)}, ${f(L.night.top)}, smoothstep( ${f(L.night.from)}, ${f(L.night.to)}, k.y ) );
	l *= 1.0 + ${f(L.night.moonward)} * smoothstep( - 70.0, 70.0, k.x );
	// The moon's broad light, sharp edged.
	vec2 c = PYR_AT( ${f(L.field.D)} ) - ${v2(L.field.at)};
	float cs = cos( ${f(L.field.slant)} ), sn = sin( ${f(L.field.slant)} );
	float across = c.x * cs - c.y * sn, up = c.x * sn + c.y * cs;
	float fF = fB + ${f(L.field.D)} * fT, e = ${f(L.field.edge)} * pSoft + 0.5 * fF;
	float inF = pyrBand( across, - ${f(L.field.wide / 2)}, ${f(L.field.wide / 2)}, e ) * ( 1.0 - smoothstep( ${f(L.field.ends)} - 6.0, ${f(L.field.ends)}, up ) );
	float ou = max( abs( across ) - ${f(L.field.wide / 2)}, 0.0 );
	l += ${f(L.field.power)} * mix( 1.0, ${f(L.field.head)}, smoothstep( 0.0, ${f(L.field.ends)}, up ) ) * ( inF + ${f(L.field.skirt)} * exp( - ou / 5.0 ) * ( 1.0 - inF ) );
	// The moon, stretched up the slope into one thin streak, broken at each plate.
	vec2 m = PYR_AT( ${f(L.moon.D)} ) - ${v2(L.moon.at)};
	float fM = fB + ${f(L.moon.D)} * fT, my = abs( m.y ) / ${f(L.moon.run)}, run = exp( - my * my * my );
	run *= 0.55 + 0.9 * pyrHash( vec2( pCourse, 5.0 ) );
	l += run * ( ${f(L.moon.power)} * pyrLine( m.x, ${f(L.moon.wide)} * pSoft, fM ) + ${f(L.moon.glow)} * exp( - m.x * m.x / 4.0 ) );
	return l;
}
float pyrDarkNight( vec2 q, vec2 s, float fB, float fT ) {
	vec2 k = PYR_AT( ${f(D.night.D)} );
	float l = ${f(D.night.base)} * ( 1.0 - ${f(D.night.top)} * smoothstep( 20.0, 95.0, k.y ) ) * ( 1.0 - ${f(D.night.front)} * smoothstep( 0.0, 70.0, k.x ) );
	vec2 w = PYR_AT( ${f(D.way.D)} ), a = ${v2(D.way.from)}, b = ${v2(D.way.to)}, ab = b - a;
	float t = clamp( dot( w - a, ab ) / dot( ab, ab ), 0.0, 1.0 ), across = length( w - a - t * ab ) / ${f(D.way.wide)};
	float mottle = 0.85 + 0.15 * pyrNoise( vec2( t * 7.0, across + 3.0 ) );
	l += ${f(D.way.power)} * ( exp( - across * across ) + 0.35 * exp( - 0.2 * across * across ) ) * mottle * smoothstep( 0.0, 0.2, t ) * ( 1.0 - 0.5 * smoothstep( 0.6, 1.0, t ) );
	vec2 g = PYR_AT( ${f(D.foot.D)} );
	float lift = ${f(D.foot.power)} * exp( - max( g.y, 0.0 ) / ${f(D.foot.tall)} ) * ( 0.7 + 0.3 * pyrNoise( vec2( g.x / 17.0, 4.0 ) ) );
	pWarm = clamp( lift / max( l + lift, 1e-4 ), 0.0, 1.0 );
	return l + lift;
}
// The light high overhead that the rounded front arris turns to, and the glow along the horizon behind that the
// rounded right hand outline turns to, from r: spread is how far r turns across the pixel, in radians, which widens
// their edges and dims them by as much, so a line of them seen in a round finer than a pixel is its pixel's average.
float pyrLines( vec3 r, float spread ) {
	float a = acos( clamp( dot( r, uZen.xyz ), - 1.0, 1.0 ) ), a0 = acos( clamp( uZenW.x, - 1.0, 1.0 ) ), a1 = acos( clamp( uZenW.y, - 1.0, 1.0 ) );
	float am = 0.5 * ( a0 + a1 ), aw = min( am + spread, 3.1 );
	float l = uZen.w * am / aw * ( 1.0 - smoothstep( a1 - spread, a0 + spread, a ) );
	l += uRim.x * ( uRim.z - uRim.y ) / ( uRim.z - uRim.y + 2.0 * spread ) * pyrBand( r.y, uRim.y, uRim.z, 0.03 + spread ) * smoothstep( 0.0, 0.12, r.x );
	return l;
}`;

  // After <color_fragment>: what the casing does at this pixel, kept for the later steps.
  const COLOR = `
vec2 pTilt = vec2( 0.0 );
float pJoint = 0.0, pPlate = 0.0, pLip = 0.0;
{
	vec3 n = normalize( vNq );
	float hl = length( n.xz );
	bool face = abs( n.y - ${f(Math.cos(SLOPE))} ) < 0.002 && hl > 0.5;
	vec2 along = hl > 1e-4 ? vec2( n.z, - n.x ) / hl : vec2( 1.0, 0.0 );
	float s = dot( vQ.xz, along ), y = vQ.y, fy = max( fwidth( y ), 1e-5 ), fs = fwidth( s ), U = ${f(C.unit)};
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
		float h1 = pyrHash( id ), h2 = pyrHash( id + 17.13 ), h3 = pyrHash( id + 41.71 );
		// Seen from far off a course is under a pixel: its differences fade out before they can alias.
		float big = smoothstep( 1.5, 4.0, U / fy );
		float ds = min( abs( x - b0 ), abs( x - b1 ) ) * P;
		float yLo = lo * U, yHi = hi * U;
		float hair = smoothstep( 4.0, 12.0, U / fy );
		float jLo = kLo > 1.5 ? pyrLine( y - yLo, ${f(C.deep)}, fy ) : 0.6 * hair * pyrLine( y - yLo, ${f(C.line)}, fy );
		float jHi = kHi > 1.5 ? pyrLine( y - yHi, ${f(C.deep)}, fy ) : 0.6 * hair * pyrLine( y - yHi, ${f(C.line)}, fy );
		pJoint = max( max( jLo, jHi ), 0.55 * hair * pyrLine( ds, ${f(C.line)}, fs ) );
		// The deeper joint's lower edge is the top of the course under it, turned up to the sky: a fine lit lip.
		pLip = kHi > 1.5 ? pyrLine( y - ( yHi - ${f(C.deep / 2 + C.lip / 2)} ), ${f(C.lip)}, fy ) : 0.0;
		pTilt = ( vec2( h1, h2 ) - 0.5 ) * 2.0 * ${f(C.tilt)} * big;
		pSoft = 1.0 + ( h3 - 0.5 ) * 2.0 * uRough.z * big;
		pPlate = ( h1 - 0.5 ) * big * ( 1.0 + smoothstep( 4.0, 14.0, U / fy ) );
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
		float dR = ( hw - s ) * ${f(1 / Math.sqrt(1 + Math.cos(SLOPE) ** 2))}, dL = ( hw + s ) * ${f(1 / Math.sqrt(1 + Math.cos(SLOPE) ** 2))};
		vec3 nb = dR < dL ? vec3( a.x * hl, n.y, a.y * hl ) : vec3( - a.x * hl, n.y, - a.y * hl );
		float w = 0.5 * ( 1.0 - min( dR, dL ) / ${f(FORM.round.seen.arris)} );
		float top = vKind < 0.125 ? 0.5 * ( 1.0 - ( ${f(FORM.cap.from)} - y ) / ${f(Math.sin(SLOPE) * FORM.round.seen.lip)} ) : 0.0;
		if ( top > w && top > 0.0 ) {
			pBend = normalize( mix( n, vec3( 0.0, 1.0, 0.0 ), top ) );
			pSpread = ${f(SLOPE)} / ${f(FORM.round.seen.lip)} * pix * min( 1.0, top * 10.0 );
			pBent = 1.0;
		} else if ( w > 0.0 && ( n.x + nb.x > 0.0 || n.z + nb.z > 0.0 ) ) {
			// Not at the left hand outline, where the face turned from the moon meets the face behind it: picture 9
			// has no line there.
			pBend = normalize( mix( n, nb, w ) );
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
normal = normalize( normal + vTv * pTilt.x + vBv * pTilt.y );`;

  // Before <lights_fragment_end>: the night the gold mirrors, in place of the stage's own, and the cursor's line. The
  // moon's own light on the faces is left out (uMoonSpec): the faces mirror the moon where their night has it. The
  // world's light then takes some of the night away where the place is shut in; a mirror is shut in only where what
  // it mirrors is hidden, so most of that is given back and a little contact shadow is kept.
  const ENV = `
float pLevel = 0.0;
{
	vec3 nL = normalize( vNq );
	bool toMoon = nL.z > 0.5;
	vec3 tA = toMoon ? vec3( 1.0, 0.0, 0.0 ) : vec3( 0.0, 0.0, 1.0 );
	vec3 tU = toMoon ? vec3( 0.0, ${f(TALL / SLANT)}, ${f(-HALF / SLANT)} ) : vec3( ${f(HALF / SLANT)}, ${f(TALL / SLANT)}, 0.0 );
	vec3 n0 = normalize( ( viewMatrix * vec4( uToWorld * nL, 0.0 ) ).xyz );
	vec3 rv = reflect( - geometryViewDir, normal ), rW = inverseTransformDirection( rv, viewMatrix );
	vec3 dr = ( rW - inverseTransformDirection( reflect( - geometryViewDir, n0 ), viewMatrix ) ) * uToWorld;
	vec2 q = vec2( dot( vQ, tA ), vQ.y ), s = vec2( dot( dr, tA ), dot( dr, tU ) * ${f(TALL / SLANT)} );
	vec2 fq = fwidth( q ), fsv = fwidth( s );
	float fB = max( fq.x, fq.y ), fT = max( fsv.x, fsv.y );
	bool neck = abs( vKind - ${f(KIND.neck)} ) < 0.05, bevel = abs( vKind - ${f(KIND.bevel)} ) < 0.05;
	if ( neck ) pLevel = 0.03;
	else if ( bevel ) pLevel = 0.03 + ${f(E.bevel)} * smoothstep( 0.45, 0.95, rW.y );
	else pLevel = toMoon ? pyrLitNight( q, s, fB, fT ) : pyrDarkNight( q, s, fB, fT );
	pLevel += pyrLines( rW, min( 1.2, pSpread ) );
	#ifdef WORLD_GLINT
	if ( ! neck ) {
		// The cursor: where its ray meets this face's plane, and a thin line of light up the slope through there.
		float gk = dot( n0, vRay ), gt = dot( n0, geometryPosition ) / ( abs( gk ) > 1e-6 ? gk : 1e-6 );
		vec3 gOff = ( vec4( vRay * gt - geometryPosition, 0.0 ) * viewMatrix ).xyz * uToWorld / uUnit;
		vec2 g = - vec2( dot( gOff, tA ), gOff.y ) + ${f(G.D)} * s;
		float fG = fB + ${f(G.D)} * fT, run = exp( - g.y * g.y / ${f(G.run ** 2)} ) * ( 0.7 + 0.6 * pyrHash( vec2( pCourse, 9.0 ) ) );
		pLevel += step( 0.0, gt ) * uGlint.r * run * ( ${f(G.power)} * pyrLine( g.x, ${f(G.wide)}, fG ) + ${f(G.glow)} * exp( - g.x * g.x / 3.0 ) );
	}
	#endif
	radiance = vec3( pLevel );
	#ifdef WORLD_BAKED
		radiance *= mix( 1.0, wLight.z, uContact ) / max( mix( 1.0, wLight.z, 0.7 ), 0.05 );
	#endif
	reflectedLight.directSpecular *= uMoonSpec;
}`;

  // Before <opaque_fragment>: how much the place mirrors, given the color polished gold gives it: richest where it is
  // low, the world's gold through the middle, and paling toward pale gold only where it is high. The capstone's
  // border and the foot course's shadow line are drawn here. The stage balances its darks and mid tones for a warm
  // light (src/world/tone.ts), which is right for things that are neutral and takes the gold's own color out of it,
  // so that is given back here.
  const GRADE = `
{
	float lv = max( outgoingLight.r, 0.0 );
	vec3 n = normalize( vNq );
	float hl = length( n.xz ), y = vQ.y, fy = max( fwidth( y ), 1e-5 );
	bool face = abs( n.y - ${f(Math.cos(SLOPE))} ) < 0.002 && hl > 0.5;
	if ( abs( vKind - ${f(KIND.neck)} ) < 0.05 ) lv = 0.03 * min( lv, 1.0 );
	lv *= ( 1.0 - 0.75 * pJoint ) * ( 1.0 + 0.04 * pPlate );
	lv += ${f(E.lip)} * pLip;
	// The inner corner over the foot course, shut in.
	if ( face && vKind < 0.1 ) lv *= 1.0 - ${f(E.shadow)} * pyrBand( y, ${f(FORM.foot.tall)} - 0.5, ${f(FORM.foot.tall + E.shadowTall)}, 0.5 * fy );
	// The capstone's raised border: a groove so far in from its edges, with the border's lit edge outside it.
	if ( face && vKind > 0.875 ) {
		vec2 a = vec2( n.z, - n.x ) / hl;
		float s = dot( vQ.xz, a ), hw = ${f(HALF)} * ( 1.0 - y / ${f(TALL)} ), k = ${f(1 / Math.sqrt(1 + Math.cos(SLOPE) ** 2))};
		float d = min( min( hw - s, hw + s ) * k, ( y - ${f(FORM.cap.from + FORM.cap.reveal)} ) * ${f(SLANT / TALL)} ), fd = max( fwidth( d ), 1e-5 );
		float panel = smoothstep( ${f(K.border)} - 0.5 * fd, ${f(K.border)} + 0.5 * fd, d );
		lv *= mix( 1.0, ${f(K.panel)}, panel ) * ( 1.0 - 0.8 * pyrLine( d - ${f(K.border)}, ${f(K.groove)}, fd ) );
		lv += ${f(E.lip)} * 1.3 * pyrLine( d - ${f(K.border - K.groove / 2 - K.lip / 2)}, ${f(K.lip)}, fd );
	}
	vec3 deep = mix( uDeepC, uWarmC, pWarm );
	vec3 c = mix( mix( deep, uMidC, smoothstep( uGradeAt.x, uGradeAt.y, lv ) ), uPaleC, smoothstep( uGradeAt.z, uGradeAt.w, lv ) ) * lv;
	float k = 1.0 - smoothstep( 0.3, 0.85, c.r );
	outgoingLight = c / mix( vec3( 1.0 ), vec3( 0.96, 1.21, 1.59 ), k );
}`;
  return { PARS, COLOR, ROUGH, NORMAL, ENV, GRADE };
}
