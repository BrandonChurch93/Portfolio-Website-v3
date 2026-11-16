import { HOST, drawn } from '../../layout';
import { STREAM, STREAM_BUDGET, unitFor } from '../../../../stream/config';
import { CORE_HALF } from '../../../../stream/shaders';
import type { Tier } from '../../../../config/site';
import { GRAIN } from './grain';

// The neck of the beam: where the page's stream leaves the core's foot, as picture 9's neck. The ball and the neck are
// one shape, the ball's outline and the neck's sides joined by a smooth union, so the band at the ball's edge runs on
// round the fillet and down the neck's sides. Its top is the ball's own matter, cream with the face's grain, pouring
// out and stretching as it speeds up. Lower down it unravels into the page's own strands, a few fibres of light that
// twist round each other, round the stream's heart, with surges of light of every length running down them. Past the
// cut the page's stream takes it up: its heart from a thread that widens, its strands gathering, and the neck's heart
// narrows into that thread and its strands give way to the page's own, at the same places on the same clock.

// How much brighter the page makes the heart on a wide screen, and over which widths (renderer.ts, GLOW.more.heart,
// and STREAM.presence).
const HEART_MORE = 0.34;

// The page's strands, its stream units and its wide light, worked out for this screen. Everything that makes the
// root the page's own size and place.
export interface RootScale { across: number; along: number; heart: number; strands: number; host: number }

export function strandsFor(tier: Tier): number {
  return tier === 'static' ? 7 : STREAM_BUDGET[tier].split ? 9 : 7;
}

// The board's unit and the stream's unit in CSS pixels for this screen, as the page has them (HeroLab.module.css,
// --u, and unitFor), and how many of the host's units a unit of the world is drawn as at a place.
export function rootScale(at: readonly [number, number, number], strands: number): RootScale {
  const w = typeof innerWidth === 'number' ? innerWidth : HOST.wide;
  const root = typeof document === 'object' ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16 : 16;
  const board = Math.min(w, 2400) / HOST.wide, unit = unitFor(w, root);
  const o = drawn(at[0], at[1], at[2]), dx = drawn(at[0] + 1, at[1], at[2]), dy = drawn(at[0], at[1] - 1, at[2]);
  const presence = Math.max(0, Math.min(1, (w - STREAM.presence[0]) / (STREAM.presence[1] - STREAM.presence[0])));
  return { across: ((dx[0] - o[0]) * board) / unit, along: ((dy[1] - o[1]) * board) / unit, heart: 1 + HEART_MORE * presence, strands, host: dy[1] - o[1] };
}

// The page's ribbon, as src/stream/shaders.ts (coreFrag) draws it, letter for letter where it says so: x across and
// s along it in stream units, t the clock, lead how far its leading end is past this place.
export const ROOT_STREAM = /* glsl */ `
float rootHash( float n ) { return fract( sin( n * 127.1 ) * 43758.5453 ); }
// The page's own twist, and its ribbon's half width.
float rootTwist( float s, float t ) { return s / 58.0 - t * 0.36 + 1.3 * sin( s / 143.0 - t * 0.12 ); }
float rootWide( float s, float t, float lead ) { return mix( 10.0, 20.0, 0.5 + 0.5 * sin( s / 97.0 - t * 0.21 + 1.0 ) ) * mix( 0.25, 1.0, smoothstep( 0.0, 120.0, lead ) ); }
// The light that runs down the page's stream, and how it burns hotter toward its leading end.
float rootRun( float x, float s, float t, float lead ) {
	float run = 0.84 + 0.16 * sin( s / 83.0 - t * 2.1 ) * sin( s / 211.0 - t * 0.9 + 0.8 );
	float head = 1.0 - smoothstep( 0.0, 120.0, lead );
	return run * ( 1.0 + ROOT_ENERGY * head * head ) * smoothstep( 0.0, 5.0, lead ) * smoothstep( ${CORE_HALF.toFixed(1)}, ${CORE_HALF.toFixed(1)} - 12.0, abs( x ) );
}
// The heart, one fibre down the middle: fierce where the ribbon is on edge. hw is its width against the page's.
float rootHeart( float x, float s, float t, float hw ) {
	float gather = 1.0 - abs( cos( rootTwist( s, t ) ) ), q = x / ( mix( 0.8, 1.4, gather ) * hw );
	return mix( 1.7, 3.0, gather * gather ) / pow( 1.0 + q * q, 1.6 );
}
// The surges that run down the beam at the stream's own pace, each in a slot of a train that never repeats: none in
// some slots, and in the rest each of its own strength, its own sharpness ahead and its own length behind, from a
// short hard flash to a long smear, and riding either the whole beam or one strand alone. s in stream units. For each
// of the three slots near s: how strong it is here, and which strand it rides (-1 the whole beam).
void rootSurges( float s, float t, out vec3 amount, out vec3 rides ) {
	float p = ( s - t * NECK_PACE ) / NECK_GAP, i = floor( p );
	for ( int k = 0; k < 3; k ++ ) {
		float j = i + float( k - 1 ), a = rootHash( j * 1.37 + 4.1 ), b = rootHash( j * 2.71 + 9.3 );
		float c = rootHash( j * 3.17 + 1.9 ), e = rootHash( j * 5.03 + 7.7 ), g = rootHash( j * 7.41 + 3.3 );
		// A slot drifts a little against the train, so the surges do not all run at one speed.
		float at = ( p - j - 0.2 - 0.6 * b ) * NECK_GAP + NECK_DRIFT * sin( t * mix( 0.7, 1.6, c ) + 6.283 * e );
		float ahead = mix( NECK_AHEAD.x, NECK_AHEAD.y, c * c ), behind = mix( NECK_BEHIND.x, NECK_BEHIND.y, e * e );
		float reach = at > 0.0 ? ahead : behind;
		amount[ k ] = step( NECK_EMPTY, a ) * mix( NECK_STRONG.x, NECK_STRONG.y, b * b ) * exp( - at * at / ( reach * reach ) );
		rides[ k ] = g < NECK_ONE ? floor( rootHash( j * 9.13 + 0.7 ) * float( ROOT_STRANDS ) ) : - 1.0;
	}
}
// The page's sheet and strands (coreFrag, letter for letter but for the ribbon's half width, which is handed in, and
// the surges each strand carries, and how much brighter its sheet is), as an amount of light.
float rootFibres( float x, float s, float t, float wide, float sheet, vec3 amount, vec3 rides ) {
	float twist = rootTwist( s, t ), face = cos( twist ), depth = sin( twist );
	float span = wide * abs( face ) + 0.6;
	float sum = 0.1 * sheet * smoothstep( span + 2.6, span * 0.55, abs( x ) ) * ( 0.35 + 0.65 * abs( face ) );
	for ( int j = 0; j < ROOT_STRANDS; j ++ ) {
		float f = float( j ), a = rootHash( f + 1.0 ), b = rootHash( f + 7.3 ), c = rootHash( f + 13.9 );
		float u0 = ( f + 0.5 ) / float( ROOT_STRANDS ) * 2.0 - 1.0 + ( a - 0.5 ) * 0.5;
		float u = sign( u0 ) * pow( abs( u0 ), 1.7 );
		float off = u * wide * face + 1.5 * sin( s / mix( 17.0, 31.0, b ) + c * 6.283 - t * 0.4 );
		float dz = u * depth;
		float w = mix( 0.38, 1.05, c * c ) * ( 1.2 - 0.35 * dz );
		float life = 0.12 + 0.88 * smoothstep( - 0.4, 0.6, sin( s / mix( 50.0, 150.0, a ) + f * 2.4 - t * 0.3 ) );
		float level = mix( 0.24, 1.0, b * b ) * life * ( 0.6 + 0.4 * dz );
		vec3 mine = vec3( equal( rides, vec3( f ) ) ), all = vec3( lessThan( rides, vec3( 0.0 ) ) );
		float lift = dot( amount, NECK_LIFT.x * all + NECK_LIFT.y * mine );
		// A surge on one strand also swells it, so it reads as the strand carrying it and not as a dot.
		w *= 1.0 + NECK_LIFT.z * dot( amount, mine );
		float d = ( x - off ) / w;
		sum += level * ( 1.0 + lift ) * exp( - d * d );
	}
	return sum;
}
`;

// The neck's light at a place of the plane through the ball's middle, x across from the beam's line and d down from
// the foot, both in units of the world (d is under 0 inside the ball), as light to hand the world and how much of
// what is behind it it covers.
//   uRootScale: stream units to a unit of the world across and along, and the page's heart
//   uRootState: how far the stream has set off (0 to 1), how far down its leading end is, in units of the world,
//               whether the page's stream takes over below (1 on the page, 0 alone), and the seconds since it set off
export const ROOT_LIGHT = /* glsl */ `
uniform vec3 uRootScale;
uniform vec4 uRootState;
uniform vec3 uEmber;
uniform vec3 uFlame;
uniform vec3 uHot;
uniform vec3 uPale;
uniform vec3 uCream;
uniform float uR;
uniform float uLevel;
uniform float uRimAt[ RIM_N ];
uniform vec3 uRim[ RIM_N ];
${ROOT_STREAM}
// The face's light from its middle out to its edge, as picture 9 has it: even far out, then gold, a narrow dip of
// deep orange just inside the edge and a thin brighter line of orange gold at the edge itself.
vec3 coreRim( float rr ) {
	vec3 c = uRim[ 0 ];
	for ( int i = 1; i < RIM_N; i ++ ) {
		float a = uRimAt[ i - 1 ], b = uRimAt[ i ];
		if ( rr > a ) c = mix( uRim[ i - 1 ], uRim[ i ], clamp( ( rr - a ) / max( b - a, 1e-4 ), 0.0, 1.0 ) );
	}
	return c;
}
// How the face's light falls toward the limb, out from the middle, and gives way to the band.
float coreFall( float rb ) {
	return mix( FACE_GAIN * ( 1.0 - LIMB * pow( smoothstep( LIMB_FROM, LIMB_TO.y, rb ), LIMB_POW ) ), 1.0, smoothstep( LIMB_TO.x, LIMB_TO.y, rb ) );
}
// How far down it reaches, in units, and how long its end is. Before the stream sets off it has not left the ball.
vec2 neckReach() {
	float reach = uRootState.x > 0.001 ? uRootState.y : 0.0;
	return vec2( reach, min( NECK_TIP, 0.9 * reach ) );
}
// Half the neck's width here, in units of the world, as picture 9's: broad where it leaves and drawing itself thin
// quickly and then slowly, and as broad as where it leaves up inside the ball. A point at its end while its leading
// end is still close.
float neckWidth( float d, vec2 R, float on ) {
	float w = NECK_RIB + ( NECK_FOOT - NECK_RIB ) * exp( - max( d, 0.0 ) / NECK_FALL );
	w *= mix( NECK_QUIET, 1.0, on );
	return w * pow( clamp( ( R.x - d ) / max( R.y, 1e-3 ), 0.0, 1.0 ), NECK_ROUND );
}
// How far a place is outside the one shape the ball and the neck make, in units (under 0 inside): the two joined by a
// smooth union, which is the fillet. Before the stream sets off it is the ball's own.
float neckShape( float x, float d, float on ) {
	float ball = length( vec2( x, uR + d ) ) - uR;
	vec2 R = neckReach();
	if ( on < 0.001 || R.x < 0.5 ) return ball;
	float neck = max( abs( x ) - neckWidth( d, R, on ), d - R.x );
	float k = NECK_FILLET * on * smoothstep( 0.0, NECK_FILLET, R.x ), h = clamp( 0.5 + 0.5 * ( neck - ball ) / max( k, 1e-3 ), 0.0, 1.0 );
	return mix( neck, ball, h ) - k * h * ( 1.0 - h );
}
// The band's place across the shape's edge, as a share of the ball's radius from its middle: the ball's own on the
// ball, and down the neck's sides a band that narrows as the neck does.
float neckRim( float x, float d, float on ) {
	return 1.0 + neckShape( x, d, on ) / ( uR * mix( 1.0, NECK_BAND, smoothstep( 0.0, NECK_BAND_FALL, d ) ) );
}
vec3 rootRamp( float a ) {
	vec3 c = uEmber * clamp( a / 0.11, 0.0, 1.0 );
	c = mix( c, uFlame, smoothstep( 0.07, 0.42, a ) );
	c = mix( c, uHot, smoothstep( 0.34, 0.85, a ) );
	c = mix( c, uPale, smoothstep( 0.7, 1.6, a ) );
	return c;
}
// The light to hand the world's last pass (src/world/tone.ts) for it to show T, in linear light, on the screen: its
// tone curve run backward. What it cannot reach it comes as close to as it can.
vec3 rootUntone( vec3 T ) {
	float p = max( T.r, max( T.g, T.b ) );
	if ( p <= 0.8 ) return T;
	float q = min( p, 0.985 );
	T *= q / p;
	float P = 0.6 + 0.04 / ( 1.0 - q ), g = 1.0 - 1.0 / ( 0.15 * ( P - q ) + 1.0 );
	vec3 c = max( ( T - g * q * vec3( 1.0, 0.767, 0.548 ) ) / max( 1.0 - g, 1e-3 ), 0.0 );
	return c * ( P / q );
}
// An amount of the stream's light as the page shows it, given to the world: the light, worked back, and how much of
// what is behind it it covers. On the page that is as much as it is bright, which over the lit rock laid the faint
// edge of the beam on it as a brown shadow: here a faint light covers less.
vec4 rootColor( float a ) {
	vec3 e = pow( min( rootRamp( a ), uPale ), vec3( 1.0 / 2.2 ) );
	vec3 T = mix( e / 12.92, pow( ( e + 0.055 ) / 1.055, vec3( 2.4 ) ), step( 0.04045, e ) );
	float m = max( e.r, max( e.g, e.b ) );
	return vec4( rootUntone( T ), m * m * m );
}
// Where the matter pouring out of the ball is, along the neck: it leaves slowly and speeds up as it falls, so a grain
// of it is drawn out longer the further down it is. In units at the foot.
float neckFlow( float d, float t ) {
	float dd = max( d, 0.0 );
	return d - dd + NECK_SPEED.y * dd / ( NECK_SPEED.y + dd ) - t * NECK_SPEED.x;
}
// The face's grain as steps of light, for brightness and warmth, at a place q in units, a pixel fp wide there.
vec2 coreGrainSteps( vec3 q, float fp ) {
	vec2 g = coreSalt( q, fp, uTime, 1.0 );
	return vec2( clamp( GRAIN_GAIN * ( 1.0 + GRAIN_FAR * smoothstep( 0.4, 1.0, fp ) ) * g.x, - 3.0, 3.0 ), clamp( GRAIN_WARM * g.y, - 3.0, 3.0 ) );
}
// The neck: light to hand the world, and how much of what is behind it it covers. px is a pixel's width in units.
vec4 neckLight( float x, float d, float px ) {
	float on = uRootState.x, since = uRootState.w, t = uTime;
	vec2 R = neckReach();
	if ( on < 0.001 || d >= R.x ) return vec4( 0.0 );
	float along = uRootScale.y, s = max( d, 0.0 ) * along, xs = x * uRootScale.x, lead = ( R.x - d ) * along;
	// Where the page takes it up, in stream units, and how far its own strands have gathered there.
	float cut = NECK_CUT * along, begun = uRootState.z * smoothstep( cut, cut + ROOT_RISE, s );
	float shape = neckShape( x, d, on );
	// The matter: the ball's own, solid at the top, unravelling into the strands lower down.
	float solid = 1.0 - smoothstep( NECK_SOLID.x, NECK_SOLID.y, d );
	vec3 amount, rides;
	rootSurges( s, t, amount, rides );
	amount *= smoothstep( 0.0, NECK_PULSE_IN, d ) * smoothstep( 0.0, 30.0, lead ) * ( 1.0 - begun );
	// The strands lie inside the neck, and from the cut spread to the page's own ribbon, which they become.
	float wide = mix( NECK_STRANDS * neckWidth( d, R, on ) * uRootScale.x, rootWide( s, t, lead ), uRootState.z * smoothstep( cut, cut + NECK_SPREAD * ROOT_RISE, s ) );
	float sheet = mix( NECK_SHEET, 1.0, smoothstep( cut - ROOT_RISE * NECK_SPREAD, cut, s ) );
	float fib = rootFibres( xs, s, t, wide, sheet, amount, rides ) * ( 1.0 - begun ) * smoothstep( - NECK_UP, NECK_UP, d );
	fib *= mix( 1.0, smoothstep( 1.0, - 2.0, shape ), solid );
	// The heart: carried only a little where it leaves, where the matter is, and the page's whole further down. From
	// the cut it narrows into the page's thread, which is widening round it, and ends inside the page's heart.
	float hw = mix( 1.0, NECK_HAND.z, uRootState.z * smoothstep( cut + NECK_HAND.x, cut + NECK_HAND.y, s ) );
	float heart = rootHeart( xs, s, t, hw ) * uRootScale.z * mix( NECK_HEART.x, 1.0, smoothstep( NECK_HEART.y, NECK_HEART.z, d ) ) * smoothstep( 0.0, NECK_UP, d );
	heart *= 1.0 + NECK_LIFT.x * dot( amount, vec3( lessThan( rides, vec3( 0.0 ) ) ) );
	heart *= 1.0 - uRootState.z * step( cut + NECK_HAND.w, s );
	// As it sets off, a surge of light runs down it from the foot.
	float surge = ROOT_SURGE * exp( - pow( ( d - since * ROOT_SURGE_V ) / ROOT_SURGE_W, 2.0 ) ) * ( 1.0 - smoothstep( 0.5, 1.2, since ) );
	float a = ( fib + heart ) * rootRun( xs, s, t, lead ) * ( 1.0 + surge ) * on;
	vec4 c = rootColor( max( a - ROOT_FLOOR, 0.0 ) );
	if ( solid < 0.001 ) return c;
	// The matter: the face's own cream and grain, its band down its sides, flowing out and drawn out as it speeds up,
	// with the strands in it as paler fibres. In the gaps between them it thins first, so it comes apart into them.
	float env = clamp( - shape / max( px, NECK_EDGE_PX ) + 0.5, 0.0, 1.0 );
	vec2 g = coreGrainSteps( vec3( x, neckFlow( d, t ), 0.0 ), px );
	float rim = min( neckRim( x, d, on ), 1.0 ), quiet = 1.0 - GRAIN_BAND * smoothstep( 0.92, 0.965, rim );
	vec3 matter = coreRim( rim ) * coreFall( rim ) * coreTint( g.x * quiet, g.y * quiet );
	float lit = clamp( NECK_MATTER.x * ( fib + heart ) * on, 0.0, 1.0 ), held = clamp( NECK_MATTER.y * ( fib + heart ), 0.0, 1.0 );
	// Between the strands it warms toward the band's gold as it comes apart, so the strands show in it as cream fibres.
	matter = mix( matter, coreRim( NECK_WARM ) * coreTint( g.x * quiet, g.y * quiet ), ( 1.0 - solid ) * ( 1.0 - held ) );
	// Where the strands and the heart run through it, it pales toward the stream's own heart.
	matter = mix( min( matter, CAP ), rootColor( 2.0 ).rgb, lit * lit );
	float keep = clamp( ( solid - ( 1.0 - held ) * ( 1.0 - solid ) * NECK_MATTER.z ) * 3.0, 0.0, 1.0 );
	float K = env * keep * smoothstep( 0.0, 0.3, on );
	return vec4( matter * K + c.rgb * ( 1.0 - K ), K + c.a * ( 1.0 - K ) );
}
`;

// The plane the neck is drawn on, through the ball's middle and facing the eye. Inside the ball the ball draws it.
export const ROOT_VERT = /* glsl */ `
varying vec2 vAt;
void main() {
	vAt = position.xy;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

export const ROOT_FRAG = /* glsl */ `
precision highp float;
precision highp int;
uniform float uTime;
varying vec2 vAt;
${GRAIN}
${ROOT_LIGHT}
void main() {
	float d = - uR - vAt.y, px = max( fwidth( vAt.x ), 1e-3 );
	vec4 c = neckLight( vAt.x, d, px );
	if ( c.a < 0.002 && max( c.r, max( c.g, c.b ) ) < 0.002 ) discard;
	gl_FragColor = vec4( coreUnbalance( c.rgb ) * uLevel, c.a );
}`;
