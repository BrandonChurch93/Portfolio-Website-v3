import { FORM } from './form';
import { PYRAMID } from '../../layout';

// The pyramid's shaders, laid into a physical material (onBeforeCompile) before the world's light (../../light.ts).
// What polished gold is, is what it mirrors, so the night the gold mirrors is its own, laid out round it in the
// world as real lights at real places: a wide soft glow and inside it a brighter light with an edge, which the face
// toward the moon mirrors with that edge crossing the face, and a hot heart, which it mirrors low and to the right; a dim warm one, the city's glow, which the face turned from the
// moon mirrors at its foot by the front arris and loses toward its top; a light high overhead that only the rounded
// front arris turns to;
// and the glow along the horizon behind, which only the rounded right hand outline and the lips at the reveal turn
// to. A flat face under a night that is far off mirrors one even fill: these stand near, so each place on a face
// sees them from where it stands.
// How much a place mirrors is then given its color, as polished gold gives it: deep and saturated where it mirrors
// little, paling toward pale gold where it mirrors much. The casing of level courses of plates, each a hair
// different, with hairline joints filtered to what a pixel covers, so nothing sparkles or crawls. The capstone in one
// piece, more polished; the neck in the reveal dark.

const f = (v: number): string => v.toFixed(5);
const SLOPE = Math.atan2(FORM.fit.tall, PYRAMID.base / 2);
// The angle between two neighbouring faces' normals.
const TURN = Math.acos((PYRAMID.base / 2) ** 2 / ((PYRAMID.base / 2) ** 2 + FORM.fit.tall ** 2));

export const VERT_PARS = `
uniform vec3 uAt;
uniform float uSize;
varying vec3 vQ;
varying vec3 vNq;
varying vec3 vW;
varying vec3 vTv;
varying vec3 vBv;
varying float vKind;`;

export const VERT = `
vQ = uAt + position * uSize;
vNq = normal;
vW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
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
varying vec3 vW;
varying vec3 vTv;
varying vec3 vBv;
varying float vKind;
uniform float uUnit;
uniform vec3 uSoftAt[ 3 ];
uniform vec3 uSoftU[ 3 ];
uniform vec3 uSoftV[ 3 ];
uniform vec4 uSoftR[ 3 ];
uniform vec3 uSoftI[ 3 ];
uniform vec3 uSky;
uniform vec4 uZen;
uniform vec2 uZenW;
uniform vec3 uRim;
uniform vec4 uGrade;
uniform vec3 uRough;
uniform float uContact;
uniform mat3 uToWorld;
float pyrHash( vec2 p ) {
	vec3 q = fract( vec3( p.xyx ) * vec3( 0.1031, 0.1030, 0.0973 ) );
	q += dot( q, q.yzx + 33.33 );
	return fract( ( q.x + q.y ) * q.z );
}
// The share of a pixel f wide, at d from a line w wide, that the line covers.
float pyrLine( float d, float w, float f ) {
	f = max( f, 1e-5 );
	return max( 0.0, min( 0.5 * w, d + 0.5 * f ) - max( - 0.5 * w, d - 0.5 * f ) ) / f;
}
// A broad soft light of the night, standing so far off: what a ray from p toward r sees of it. Its hot heart, and
// its broad light with a soft edge. It is broad and soft, so it is never a line finer than a pixel and needs none of
// the widening the narrow lights below are given.
float pyrSoft( vec3 p, vec3 r, vec3 at, vec3 u, vec3 v, vec4 radii, vec3 power ) {
	vec3 q = at - p;
	float along = dot( q, r );
	vec3 off = q - along * r;
	vec2 o = vec2( dot( off, u ), dot( off, v ) );
	vec2 oh = o / max( radii.xy, vec2( 1e-3 ) );
	float rb = length( o / max( radii.zw, vec2( 1e-3 ) ) );
	return step( 0.0, along ) * ( power.x * exp( - dot( oh, oh ) ) + power.y * ( 1.0 - smoothstep( 1.0 - power.z, 1.0 + power.z, rb ) ) );
}
// A band of the night between two heights, as the sine of the angle over the horizon, with its edges e soft.
float pyrBand( float y, float lo, float hi, float e ) {
	return smoothstep( lo - e, lo + e, y ) * ( 1.0 - smoothstep( hi - e, hi + e, y ) );
}
// What the gold mirrors from p (in units) toward r: how bright, as a level. spread is how far r turns across the
// pixel, in radians: the narrow lights' edges are widened by that much, and they are as much dimmer, so a line of
// them seen in a round finer than a pixel is its pixel's average and not a line of steps. A pixel's mirrored
// direction sweeps one way, across the round, so a light is spread along that one way only.
float pyrNight( vec3 p, vec3 r, float spread ) {
	float level = mix( uSky.y, uSky.x, smoothstep( 0.0, 1.0, r.y ) ) * smoothstep( - 0.06, 0.02, r.y ) + uSky.z;
	level += pyrSoft( p, r, uSoftAt[ 0 ], uSoftU[ 0 ], uSoftV[ 0 ], uSoftR[ 0 ], uSoftI[ 0 ] );
	level += pyrSoft( p, r, uSoftAt[ 1 ], uSoftU[ 1 ], uSoftV[ 1 ], uSoftR[ 1 ], uSoftI[ 1 ] );
	level += pyrSoft( p, r, uSoftAt[ 2 ], uSoftU[ 2 ], uSoftV[ 2 ], uSoftR[ 2 ], uSoftI[ 2 ] );
	float a = acos( clamp( dot( r, uZen.xyz ), - 1.0, 1.0 ) ), a0 = acos( clamp( uZenW.x, - 1.0, 1.0 ) ), a1 = acos( clamp( uZenW.y, - 1.0, 1.0 ) );
	float am = 0.5 * ( a0 + a1 ), aw = min( am + spread, 3.1 );
	level += uZen.w * am / aw * ( 1.0 - smoothstep( a1 - spread, a0 + spread, a ) );
	level += uRim.x * ( uRim.z - uRim.y ) / ( uRim.z - uRim.y + 2.0 * spread ) * pyrBand( r.y, uRim.y, uRim.z, 0.03 + spread ) * smoothstep( 0.0, 0.12, r.x );
	return level;
}`;

// After <color_fragment>: what the casing does at this pixel, kept for the later steps.
export const COLOR = `
vec2 pTilt = vec2( 0.0 );
float pRough = 0.0, pJoint = 0.0, pPlate = 0.0;
{
	vec3 n = normalize( vNq );
	float hl = length( n.xz );
	bool face = abs( n.y - ${f(Math.cos(SLOPE))} ) < 0.002 && hl > 0.5;
	if ( face && vKind < 0.125 ) {
		vec2 along = vec2( n.z, - n.x ) / hl;
		float s = dot( vQ.xz, along ), y = vQ.y;
		float side = floor( atan( n.z, n.x ) * 0.6366 + 4.5 );
		float C = ${f(FORM.casing.course)}, P = ${f(FORM.casing.plate)}, J = ${f(FORM.casing.joint)};
		float row = floor( y / C );
		float off = pyrHash( vec2( row, side * 7.0 + 1.0 ) ) * P;
		float col = floor( ( s + off ) / P );
		vec2 id = vec2( col + side * 517.0, row );
		float h1 = pyrHash( id ), h2 = pyrHash( id + 17.13 ), h3 = pyrHash( id + 41.71 );
		float fy = fwidth( y ), fs = fwidth( s );
		// Seen from far off a plate is under a pixel: its differences and its joints fade out before they can alias.
		float big = smoothstep( 3.0, 12.0, C / max( fy, 1e-5 ) );
		float dy = abs( fract( y / C + 0.5 ) - 0.5 ) * C, ds = abs( fract( ( s + off ) / P + 0.5 ) - 0.5 ) * P;
		// The joints come in only well inside three times the page's size, where a course is thirty pixels tall: at
		// three times they are a faint sheen of level lines and no grid of tiles.
		pJoint = max( pyrLine( dy, J * ${f(Math.sin(SLOPE))}, fy ), 0.4 * pyrLine( ds, J, fs ) ) * smoothstep( 8.0, 30.0, C / max( fy, 1e-5 ) );
		pTilt = ( vec2( h1, h2 ) - 0.5 ) * 2.0 * ${f(FORM.casing.tilt)} * big;
		pRough = ( h3 - 0.5 ) * uRough.z * big;
		pPlate = ( h1 - 0.5 ) * big;
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
	if ( face && ( vKind < 0.125 || vKind > 0.875 ) ) {
		vec2 a = vec2( n.z, - n.x ) / hl;
		float s = dot( vQ.xz, a ), y = vQ.y, hw = ${f(PYRAMID.base / 2)} * ( 1.0 - y / ${f(FORM.fit.tall)} );
		float dR = ( hw - s ) * ${f(1 / Math.sqrt(1 + Math.cos(SLOPE) ** 2))}, dL = ( hw + s ) * ${f(1 / Math.sqrt(1 + Math.cos(SLOPE) ** 2))};
		vec3 nb = dR < dL ? vec3( a.x * hl, n.y, a.y * hl ) : vec3( - a.x * hl, n.y, - a.y * hl );
		float w = 0.5 * ( 1.0 - min( dR, dL ) / ${f(FORM.round.seen.arris)} );
		float top = vKind < 0.125 ? 0.5 * ( 1.0 - ( ${f(FORM.cap.from)} - y ) / ${f(Math.sin(SLOPE) * FORM.round.seen.lip)} ) : 0.0;
		float pix = length( fwidth( vQ ) );
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
roughnessFactor = clamp( ( vKind > 0.625 ? uRough.y : abs( vKind - 0.5 ) < 0.125 ? 0.6 : uRough.x ) + pRough, 0.04, 1.0 );`;

export const NORMAL = `
if ( pBent > 0.5 ) normal = normalize( ( viewMatrix * vec4( uToWorld * pBend, 0.0 ) ).xyz );
normal = normalize( normal + vTv * pTilt.x + vBv * pTilt.y );`;

// Before <lights_fragment_end>: the night the gold mirrors, in place of the stage's own. The world's light then
// takes some of it away where the place is shut in; a mirror is shut in only where what it mirrors is hidden, so
// most of that is given back and a little contact shadow is kept.
export const ENV = `
{
	vec3 pR = inverseTransformDirection( reflect( - geometryViewDir, normal ), viewMatrix );
	radiance = vec3( pyrNight( vW / uUnit, pR, min( 1.2, pSpread ) ) );
	#ifdef WORLD_BAKED
		radiance *= mix( 1.0, wLight.z, uContact ) / max( mix( 1.0, wLight.z, 0.7 ), 0.05 );
	#endif
}`;

// Before <opaque_fragment>: how much the place mirrors, given the color polished gold gives it. Deep and
// saturated where it is low, paling toward pale gold only where it is high. The stage balances its darks and mid
// tones for a warm light (src/world/tone.ts), which is right for things that are neutral and takes the gold's own
// color out of it, so that is given back here.
export const GRADE = `
{
	float lv = max( outgoingLight.r, 0.0 );
	if ( abs( vKind - 0.5 ) < 0.125 ) lv = 0.03 * min( lv, 1.0 );
	lv *= ( 1.0 - 0.15 * pJoint ) * ( 1.0 + 0.012 * pPlate );
	vec3 deep = vec3( 1.0, uGrade.x, uGrade.y );
	vec3 c = mix( deep, vec3( 1.0, 0.767, 0.548 ), smoothstep( uGrade.z, uGrade.w, lv ) ) * lv;
	float k = 1.0 - smoothstep( 0.3, 0.85, c.r );
	outgoingLight = c / mix( vec3( 1.0 ), vec3( 0.96, 1.21, 1.59 ), k );
}`;
