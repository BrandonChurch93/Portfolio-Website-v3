import { FORM } from './form';
import { PYRAMID } from '../../layout';

// The pyramid's shaders, laid into a physical material (onBeforeCompile) before the world's light (../../light.ts).
// Polished gold is what it mirrors, so each face is given a night with things in it to mirror, laid out where that
// face looks: the face toward the moon looks up and back toward the moon and over the city, so it mirrors the moon's
// broad light with the moon's own small hard disc in it, a few stars, the city's glow standing over its skyline, and
// under that the dark towers, whose skyline is the edge where the bright field ends. The face turned from the moon
// looks up into the dark half of the night: the Milky Way as one long soft light up its height, a few stars, and the
// city's low glow along its foot. Each thing stands so far off (D), so a face that turns a little mirrors it a little
// further along, by D times the turn: each plate of the casing is tilted a hair, so a sharp thing breaks from plate to
// plate and a soft one shimmers, and the rounded arrises sweep through it. The front arris and the right hand outline
// each turn up to a light of their own, high overhead and along the horizon behind (uZen, uRim). The cursor's glint
// is a small light where the faces mirror it, under the cursor.
// How much a place mirrors is then given its color, as polished gold gives it: deep and saturated where it mirrors
// little, paling toward pale gold only where it mirrors much.

const f = (v: number): string => v.toFixed(5);
const v2 = (a: readonly number[]): string => `vec2( ${f(a[0])}, ${f(a[1])} )`;
const HALF = PYRAMID.base / 2, TALL = PYRAMID.tall, SLANT = Math.hypot(HALF, TALL);
const SLOPE = Math.atan2(TALL, HALF);
// The angle between two neighbouring faces' normals.
const TURN = Math.acos(HALF ** 2 / (HALF ** 2 + TALL ** 2));

// The night each face mirrors, in the face's own measure: across it from its middle toward its right hand corner as
// seen, and up it as a height, in units. A level of 0.2 is a deep gold, 1 a bright one, and pale gold from about 2.
export const NIGHT = {
  lit: {
    // The sky over the city: deep, and lighter toward the moon.
    sky: { D: 520, base: 0.17, moonward: { at: [-44, 70], r: [62, 40], power: 0.34 } },
    // The city: its skyline's height at the face's middle, how it rises toward the right, how tall its towers differ,
    // how soft the skyline is, and the towers' own level, which their lit faces lift here and there: so near, and
    // in gold that is not a perfect mirror, they are soft upright glows and not windows.
    city: { D: 300, at: 29, rise: 0.09, towers: 9, edge: 1.3, level: 0.14, lit: 0.1 },
    // The city's glow standing over its skyline: how bright at the skyline and how fast it fades up, and its heart
    // under the moon, the brightest fifth of the face.
    glow: { D: 420, power: 0.95, tall: 20, heart: { at: [-28, 38], r: [40, 20], power: 1.7 } },
    moon: { D: 220, at: [-17, 68], r: 2.1, power: 7, halo: { r: 8, power: 0.5 } },
    // Each star: across, up, its radius and how bright.
    stars: { D: 220, all: [[24, 58, 0.32, 7], [41, 43, 0.28, 6]] },
  },
  dark: {
    base: 0.058,
    glow: { D: 300, power: 0.3, tall: 17 },
    // The Milky Way: from where to where it runs, how wide, how bright.
    way: { D: 800, from: [-38, -4], to: [8, 118], wide: 6, power: 0.36 },
    stars: { D: 220, all: [[-40, 50, 0.32, 6], [-12, 72, 0.28, 5]] },
  },
  // The cursor's glint: how far off its light stands, its radius, how bright, and its soft light about it.
  glint: { D: 600, r: 2.1, power: 7, halo: { r: 9, power: 0.45 } },
} as const;

// Each star stands so far off where the face's own ray from its place on the face would meet it, and is seen where
// a ray passes within its radius: so it is round as seen, however the face is turned.
const stars = (all: readonly (readonly number[])[], on: string, D: number): string => all.map(([x, y, r, p]) => `l += ${f(p)} * pyrStar( p, r, ${on}( ${f(x)}, ${f(y)} ) + r0 * ${f(D)}, ${f(r)}, fS );`).join('\n\t');

export const VERT_PARS = `
uniform vec3 uAt;
uniform float uSize;
varying vec3 vQ;
varying vec3 vNq;
varying vec3 vTv;
varying vec3 vBv;
varying float vKind;`;

export const VERT = `
vQ = uAt + position * uSize;
vNq = normal;
{
	vec3 tq = vec3( normal.z, 0.0, - normal.x );
	float tl = length( tq );
	tq = tl > 1e-4 ? tq / tl : vec3( 1.0, 0.0, 0.0 );
	vTv = normalize( normalMatrix * tq );
	vBv = normalize( normalMatrix * cross( normal, tq ) );
}
#ifdef WORLD_BAKED
	vKind = aLight.w;
#else
	vKind = 0.0;
#endif`;

export const FRAG_PARS = `
varying vec3 vQ;
varying vec3 vNq;
varying vec3 vTv;
varying vec3 vBv;
varying float vKind;
uniform float uUnit;
uniform vec4 uZen;
uniform vec2 uZenW;
uniform vec3 uRim;
uniform vec4 uGrade;
uniform vec2 uDeep;
uniform vec3 uRough;
uniform float uContact;
uniform float uMoonSpec;
uniform vec3 uGlintFrame;
uniform mat3 uToWorld;
float pSoft = 1.0;
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
// The share of a pixel f wide, at d from a line w wide, that the line covers.
float pyrLine( float d, float w, float f ) {
	f = max( f, 1e-5 );
	return max( 0.0, min( 0.5 * w, d + 0.5 * f ) - max( - 0.5 * w, d - 0.5 * f ) ) / f;
}
float pyrSpot( vec2 d, vec2 r ) {
	vec2 o = d / max( r, vec2( 1e-3 ) );
	return exp( - dot( o, o ) );
}
// A small hard disc r in radius, seen through a pixel f across: crisp while it is larger than the pixel, and as
// bright in sum, spread over the pixel, when it is smaller, so a star never flickers out or grows.
float pyrDisc( vec2 d, float r, float f ) {
	float s = max( r, 0.6 * f );
	return r * r / ( s * s ) * ( 1.0 - smoothstep( s - 0.5 * f, s + 0.5 * f, length( d ) ) );
}
// A band of the night between two heights, as the sine of the angle over the horizon, with its edges e soft.
float pyrBand( float y, float lo, float hi, float e ) {
	return smoothstep( lo - e, lo + e, y ) * ( 1.0 - smoothstep( hi - e, hi + e, y ) );
}
// The tops of a row of towers about w wide, 0 to 1, each step softened over e.
float pyrTops( float a, float w, float seed, float e ) {
	float x = a / w, k = floor( x ), j = 0.3 * ( pyrHash( vec2( k, seed + 5.0 ) ) - 0.5 );
	return mix( pyrHash( vec2( k, seed ) ), pyrHash( vec2( k + 1.0, seed ) ), smoothstep( 1.0 + j - e / w, 1.0 + j + e / w, x - k ) );
}
// A small round light at x, rad in radius, as seen along the ray from p toward r through a pixel f across.
float pyrStar( vec3 p, vec3 r, vec3 x, float rad, float f ) {
	vec3 q = x - p;
	float a = dot( q, r );
	return step( 0.0, a ) * pyrDisc( vec2( length( q - a * r ), 0.0 ), rad, f );
}
// The place on each seen face so far across it and so high, in the pyramid's own frame.
vec3 pyrOnLit( float a, float h ) { return vec3( a, h, ${f(HALF)} * ( 1.0 - h / ${f(TALL)} ) ); }
vec3 pyrOnDark( float a, float h ) { return vec3( - ${f(HALF)} * ( 1.0 - h / ${f(TALL)} ), h, a ); }
// What the face toward the moon mirrors at q, when its ray is turned by s from the face's own (per unit off), with
// a pixel fB across on the face and turning by fT across it.
float pyrLitNight( vec2 q, vec2 s, float fB, float fT, vec3 p, vec3 r, vec3 r0 ) {
	vec2 c = q + ${f(NIGHT.lit.city.D)} * s;
	float fC = fB + ${f(NIGHT.lit.city.D)} * fT;
	// The city is near and the gold is not a perfect mirror, so its skyline is soft: the masses of its towers.
	float tops = 0.45 * max( pyrTops( c.x, 12.0, 1.0, 1.2 + fC ), 0.8 * pyrTops( c.x + 4.0, 7.5, 2.0, 1.2 + fC ) ) + 0.55 * pyrNoise( vec2( c.x / 19.0, 1.0 ) );
	float above = c.y - ( ${f(NIGHT.lit.city.at)} + ${f(NIGHT.lit.city.rise)} * c.x + ${f(NIGHT.lit.city.towers)} * ( tops - 0.5 ) );
	float city = ${f(NIGHT.lit.city.level)} + ${f(NIGHT.lit.city.lit)} * pyrNoise( vec2( c.x / 3.5, c.y / 16.0 ) ) * smoothstep( 0.0, 1.0, pyrNoise( vec2( c.x / 9.0, 7.0 ) ) );
	vec2 k = q + ${f(NIGHT.lit.sky.D)} * s, g = q + ${f(NIGHT.lit.glow.D)} * s;
	float sky = ${f(NIGHT.lit.sky.base)} + ${f(NIGHT.lit.sky.moonward.power)} * pyrSpot( k - ${v2(NIGHT.lit.sky.moonward.at)}, ${v2(NIGHT.lit.sky.moonward.r)} );
	sky += ${f(NIGHT.lit.glow.power)} * exp( - max( above, 0.0 ) / ${f(NIGHT.lit.glow.tall)} ) * ( 1.0 + ${f(NIGHT.lit.glow.heart.power)} * pyrSpot( g - ${v2(NIGHT.lit.glow.heart.at)}, ${v2(NIGHT.lit.glow.heart.r)} ) );
	vec2 m = q + ${f(NIGHT.lit.moon.D)} * s - ${v2(NIGHT.lit.moon.at)};
	float fM = fB + ${f(NIGHT.lit.moon.D)} * fT;
	sky += ${f(NIGHT.lit.moon.halo.power)} * pyrSpot( m, vec2( ${f(NIGHT.lit.moon.halo.r)} ) );
	sky += ${f(NIGHT.lit.moon.power)} * pyrStar( p, r, pyrOnLit( ${f(NIGHT.lit.moon.at[0])}, ${f(NIGHT.lit.moon.at[1])} ) + r0 * ${f(NIGHT.lit.moon.D)}, ${f(NIGHT.lit.moon.r)}, fM * pSoft );
	{
		float fS = ( fB + ${f(NIGHT.lit.stars.D)} * fT ) * pSoft, l = 0.0;
		${stars(NIGHT.lit.stars.all, 'pyrOnLit', NIGHT.lit.stars.D)}
		sky += l;
	}
	float edge = ${f(NIGHT.lit.city.edge)} * pSoft + 0.5 * fC;
	return mix( city, sky, smoothstep( - edge, edge, above ) );
}
float pyrDarkNight( vec2 q, vec2 s, float fB, float fT, vec3 p, vec3 r, vec3 r0 ) {
	float l = ${f(NIGHT.dark.base)};
	vec2 c = q + ${f(NIGHT.dark.glow.D)} * s;
	l += ${f(NIGHT.dark.glow.power)} * exp( - max( c.y, 0.0 ) / ${f(NIGHT.dark.glow.tall)} ) * ( 0.75 + 0.25 * pyrNoise( vec2( c.x / 23.0, 4.0 ) ) );
	vec2 w = q + ${f(NIGHT.dark.way.D)} * s, a = ${v2(NIGHT.dark.way.from)}, b = ${v2(NIGHT.dark.way.to)};
	vec2 ab = b - a;
	float t = clamp( dot( w - a, ab ) / dot( ab, ab ), 0.0, 1.0 ), across = length( w - a - t * ab ) / ${f(NIGHT.dark.way.wide)};
	float mottle = 0.55 + 0.45 * pyrNoise( vec2( t * 9.0, across * 1.3 + 3.0 ) );
	l += ${f(NIGHT.dark.way.power)} * ( exp( - across * across ) + 0.3 * exp( - 0.15 * across * across ) ) * mottle * smoothstep( 0.0, 0.15, t );
	float fS = ( fB + ${f(NIGHT.dark.stars.D)} * fT ) * pSoft;
	${stars(NIGHT.dark.stars.all, 'pyrOnDark', NIGHT.dark.stars.D)}
	return l;
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
export const COLOR = `
vec2 pTilt = vec2( 0.0 );
float pJoint = 0.0, pPlate = 0.0;
{
	vec3 n = normalize( vNq );
	float hl = length( n.xz );
	bool face = abs( n.y - ${f(Math.cos(SLOPE))} ) < 0.002 && hl > 0.5;
	vec2 along = hl > 1e-4 ? vec2( n.z, - n.x ) / hl : vec2( 1.0, 0.0 );
	float s = dot( vQ.xz, along ), y = vQ.y, fy = fwidth( y ), fs = fwidth( s );
	float C = ${f(FORM.casing.course)}, P = ${f(FORM.casing.plate)}, J = ${f(FORM.casing.joint)};
	if ( face && vKind < 0.125 ) {
		float side = floor( atan( n.z, n.x ) * 0.6366 + 4.5 );
		float row = floor( y / C );
		float x = ( s + pyrHash( vec2( row, side * 7.0 + 1.0 ) ) * P ) / P, k = floor( x ), seed = row + side * 131.0;
		// Each joint stands a little off its place, so the plates of a course differ in length.
		float b0 = k + ( pyrHash( vec2( k, seed ) ) - 0.5 ) * ${f(FORM.casing.jag)}, b1 = k + 1.0 + ( pyrHash( vec2( k + 1.0, seed ) ) - 0.5 ) * ${f(FORM.casing.jag)};
		float col = x < b0 ? k - 1.0 : ( x >= b1 ? k + 1.0 : k );
		vec2 id = vec2( col + side * 517.0, row );
		float h1 = pyrHash( id ), h2 = pyrHash( id + 17.13 ), h3 = pyrHash( id + 41.71 );
		// Seen from far off a course is under a pixel: its differences fade out before they can alias.
		float big = smoothstep( 1.5, 4.0, C / max( fy, 1e-5 ) );
		float dy = abs( fract( y / C + 0.5 ) - 0.5 ) * C, ds = min( abs( x - b0 ), abs( x - b1 ) ) * P;
		// The joints come in only well inside three times the page's size, where a course is a dozen pixels tall.
		pJoint = ( 0.45 + 0.8 * pyrHash( vec2( row, side ) ) ) * max( pyrLine( dy, J * ${f(Math.sin(SLOPE))}, fy ), 0.3 * pyrLine( ds, J, fs ) ) * smoothstep( 5.0, 14.0, C / max( fy, 1e-5 ) );
		pTilt = ( vec2( h1, h2 ) - 0.5 ) * 2.0 * ${f(FORM.casing.tilt)} * big;
		pSoft = 1.0 + ( h3 - 0.5 ) * 2.0 * uRough.z * big;
		pPlate = ( h1 - 0.5 ) * big * ( 1.0 + smoothstep( 4.0, 14.0, C / max( fy, 1e-5 ) ) );
	}
}
// The faces of the body and the capstone, bent near each arris, and the body's faces near their top edge, as a round
// of FORM.round.seen would bend them: so the mirrored line of the night along an arris is as wide as that round,
// smooth at any size, and its edge widened by how far the bend turns across the pixel.
vec3 pBend = vec3( 0.0 );
float pBent = 0.0, pSpread = 0.0;
{
	vec3 n = normalize( vNq );
	float hl = length( n.xz );
	bool face = abs( n.y - ${f(Math.cos(SLOPE))} ) < 0.002 && hl > 0.5;
	float pix = length( fwidth( vQ ) );
	if ( face && ( vKind < 0.125 || vKind > 0.875 ) ) {
		vec2 a = vec2( n.z, - n.x ) / hl;
		float s = dot( vQ.xz, a ), y = vQ.y, hw = ${f(HALF)} * ( 1.0 - y / ${f(TALL)} );
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

export const ROUGH = `
roughnessFactor = clamp( vKind > 0.625 ? uRough.y : abs( vKind - 0.5 ) < 0.125 ? 0.6 : uRough.x, 0.04, 1.0 );`;

export const NORMAL = `
if ( pBent > 0.5 ) normal = normalize( ( viewMatrix * vec4( uToWorld * pBend, 0.0 ) ).xyz );
normal = normalize( normal + vTv * pTilt.x + vBv * pTilt.y );`;

// Before <lights_fragment_end>: the night the gold mirrors, in place of the stage's own, and the cursor's glint. The
// moon's own light on the faces is left out (uMoonSpec): the faces mirror the moon where their night has it. The
// world's light then takes some of the night away where the place is shut in; a mirror is shut in only where what
// it mirrors is hidden, so most of that is given back and a little contact shadow is kept.
export const ENV = `
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
	vec3 rL = rW * uToWorld, r0L = inverseTransformDirection( reflect( - geometryViewDir, n0 ), viewMatrix ) * uToWorld;
	float pLevel = abs( vKind - 0.5 ) < 0.125 ? 0.05 : ( toMoon ? pyrLitNight( q, s, fB, fT, vQ, rL, r0L ) : pyrDarkNight( q, s, fB, fT, vQ, rL, r0L ) );
	pLevel += pyrLines( rW, min( 1.2, pSpread ) );
	#ifdef WORLD_GLINT
	{
		// Where the cursor's ray meets this face's plane, and a small light standing off where the face mirrors it.
		vec3 gD = normalize( vec3( uGlintAt.x * uGlintFrame.z, uGlintAt.y, uGlintFrame.x * ( uGlintAt.z - uGlintFrame.y ) ) );
		float gk = dot( n0, gD );
		vec3 gP = gD * ( dot( n0, geometryPosition ) / ( abs( gk ) > 1e-4 ? gk : 1e-4 ) );
		vec3 gq = gP + reflect( gD, n0 ) * ${f(NIGHT.glint.D)} * uUnit - geometryPosition;
		float ga = dot( gq, rv ), gd = length( gq - ga * rv ) / uUnit;
		pLevel += uGlint.r * step( 0.0, ga ) * ( ${f(NIGHT.glint.power)} * pyrDisc( vec2( gd, 0.0 ), ${f(NIGHT.glint.r)}, fB + ${f(NIGHT.glint.D)} * fT ) + ${f(NIGHT.glint.halo.power)} * exp( - gd * gd / ${f(NIGHT.glint.halo.r ** 2)} ) );
	}
	#endif
	radiance = vec3( pLevel );
	#ifdef WORLD_BAKED
		radiance *= mix( 1.0, wLight.z, uContact ) / max( mix( 1.0, wLight.z, 0.7 ), 0.05 );
	#endif
	reflectedLight.directSpecular *= uMoonSpec;
}`;

// Before <opaque_fragment>: how much the place mirrors, given the color polished gold gives it: richest where it is
// low, a lighter gold than copper through the middle, and paling toward pale gold only where it is high. The stage balances its darks and mid
// tones for a warm light (src/world/tone.ts), which is right for things that are neutral and takes the gold's own
// color out of it, so that is given back here.
export const GRADE = `
{
	float lv = max( outgoingLight.r, 0.0 );
	if ( abs( vKind - 0.5 ) < 0.125 ) lv = 0.03 * min( lv, 1.0 );
	lv *= ( 1.0 - 0.3 * pJoint ) * ( 1.0 + 0.035 * pPlate );
	vec3 deep = mix( vec3( 1.0, uDeep ), vec3( 1.0, uGrade.x, uGrade.y ), smoothstep( 0.08, 0.6, lv ) );
	vec3 c = mix( deep, vec3( 1.0, 0.767, 0.548 ), smoothstep( uGrade.z, uGrade.w, lv ) ) * lv;
	float k = 1.0 - smoothstep( 0.3, 0.85, c.r );
	outgoingLight = c / mix( vec3( 1.0 ), vec3( 0.96, 1.21, 1.59 ), k );
}`;
