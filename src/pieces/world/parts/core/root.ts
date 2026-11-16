import { HOST, drawn } from '../../layout';
import { STREAM, STREAM_BUDGET, unitFor } from '../../../../stream/config';
import { CORE_HALF } from '../../../../stream/shaders';
import type { Tier } from '../../../../config/site';
import { GRAIN } from './grain';

// The neck of the beam: where the page's stream leaves the core's foot, as picture 9's neck. Broad where it leaves,
// with the ball's band turning down into it, a cream body that draws itself thin as it is shot down, and in it the
// page's own braided ribbon of fibres round a hot heart, at the same size on the screen, at the same place along it
// and on the same clock, spread to the neck's width at the foot. Where it has come down to the ribbon's width it is
// the page's ribbon, fibre for fibre, and is given over to it.

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

// The stream's own ribbon, as src/stream/shaders.ts (coreFrag) draws it, letter for letter where it can be: x across
// and s along it in stream units, t the clock, lead how far its leading end is past this place. Two things are the
// root's own: F, how far the ribbon is flared open here, which spreads the fibres and widens the heart without making
// any fibre softer, and the heart's own share of that.
export const ROOT_STREAM = /* glsl */ `
float rootHash( float n ) { return fract( sin( n * 127.1 ) * 43758.5453 ); }
float rootStream( float x, float s, float t, float lead, float heart, float F, float Fh ) {
	float tip = smoothstep( 0.0, 120.0, lead );
	float twist = s / 58.0 - t * 0.36 + 1.3 * sin( s / 143.0 - t * 0.12 );
	float face = cos( twist ), depth = sin( twist );
	float wide = mix( 10.0, 20.0, 0.5 + 0.5 * sin( s / 97.0 - t * 0.21 + 1.0 ) ) * mix( 0.25, 1.0, tip );
	float span = wide * abs( face ) + 0.6;
	float sum = 0.1 * smoothstep( span + 2.6, span * 0.55, abs( x ) ) * ( 0.35 + 0.65 * abs( face ) );
	for ( int j = 0; j < ROOT_STRANDS; j ++ ) {
		float f = float( j ), a = rootHash( f + 1.0 ), b = rootHash( f + 7.3 ), c = rootHash( f + 13.9 );
		float u0 = ( f + 0.5 ) / float( ROOT_STRANDS ) * 2.0 - 1.0 + ( a - 0.5 ) * 0.5;
		float u = sign( u0 ) * pow( abs( u0 ), 1.7 );
		float off = ( u * wide * face + 1.5 * sin( s / mix( 17.0, 31.0, b ) + c * 6.283 - t * 0.4 ) ) * F;
		float dz = u * depth;
		float w = mix( 0.38, 1.05, c * c ) * ( 1.2 - 0.35 * dz );
		float life = 0.12 + 0.88 * smoothstep( - 0.4, 0.6, sin( s / mix( 50.0, 150.0, a ) + f * 2.4 - t * 0.3 ) );
		float level = mix( 0.24, 1.0, b * b ) * life * ( 0.6 + 0.4 * dz );
		float d = ( x - off ) / w;
		sum += level * exp( - d * d );
	}
	float gather = 1.0 - abs( face ), q = x / ( mix( 0.8, 1.4, gather ) * Fh );
	sum += mix( 1.7, 3.0, gather * gather ) * heart / pow( 1.0 + q * q, 1.6 );
	float run = 0.84 + 0.16 * sin( s / 83.0 - t * 2.1 ) * sin( s / 211.0 - t * 0.9 + 0.8 );
	float head = 1.0 - smoothstep( 0.0, 120.0, lead );
	return sum * run * ( 1.0 + ROOT_ENERGY * head * head ) * smoothstep( 0.0, 5.0, lead ) * smoothstep( ${CORE_HALF.toFixed(1)} * F, ( ${CORE_HALF.toFixed(1)} - 12.0 ) * F, abs( x ) );
}
`;

// The neck's light at a place of the plane through the ball's middle, x across from the beam's line and d down from
// the foot, both in units of the world (d is under 0 inside the ball), as an amount of the stream's light. And that
// amount as the light the world has to be handed for the screen to show the page's own color for it.
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
uniform float uRimAt[ RIM_N ];
uniform vec3 uRim[ RIM_N ];
${ROOT_STREAM}
// The face's light from its middle out to its edge, as picture 9 has it: even to about 0.7 of the radius, warming
// through gold, a dip of deep orange just inside the edge and a thin brighter line of orange gold at the edge itself.
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
// How far the page's ribbon spreads to each side here, in stream units: its fibres lie across this much of it, as
// coreFrag lays them, narrower near its leading end.
float rootSpan( float s, float t, float lead ) {
	float twist = s / 58.0 - t * 0.36 + 1.3 * sin( s / 143.0 - t * 0.12 );
	float wide = mix( 10.0, 20.0, 0.5 + 0.5 * sin( s / 97.0 - t * 0.21 + 1.0 ) ) * mix( 0.25, 1.0, smoothstep( 0.0, 120.0, lead ) );
	return wide * abs( cos( twist ) );
}
// How far down it reaches, and how long its end is: before the stream sets off a short drop at the foot, then as far
// as the page's leading end.
vec2 neckReach() {
	float reach = max( NECK_DROP, uRootState.y );
	return vec2( reach, min( NECK_TIP, 0.9 * reach ) );
}
// Half the neck's width here, in units of the world: broad where it leaves, with the fillet over the foot where the
// ball's band turns down into it, drawing itself thin in one long taper to whatever the page's ribbon is doing at the
// cut, its own width and twist there, so the line has no waist. Its end is round before it sets off, a drop, and
// a point once it runs.
float neckWidth( float d, float rib, vec2 R, float on ) {
	float k = clamp( max( d, 0.0 ) / NECK_CUT, 0.0, 1.0 );
	float w = rib + ( NECK_FOOT - rib ) * pow( 1.0 - k, NECK_POW ) + ( 1.0 - k ) * NECK_FILLET.x / ( max( d, - NECK_MEET ) + NECK_FILLET.y );
	w *= mix( NECK_QUIET, 1.0, on );
	float e = clamp( ( R.x - d ) / max( R.y, 1e-3 ), 0.0, 1.0 );
	return w * mix( sqrt( e * ( 2.0 - e ) ), pow( e, NECK_ROUND ), on );
}
// How far inside the neck's edge a place is, in units of the world, under 0 outside it.
float neckEdge( float x, float d ) {
	vec2 R = neckReach();
	return d >= R.x ? - 1e3 : neckWidth( d, NECK_RIB, R, uRootState.x ) - abs( x );
}
float coreSmin( float a, float b, float k ) { float h = clamp( 0.5 + 0.5 * ( b - a ) / k, 0.0, 1.0 ); return mix( b, a, h ) - k * h * ( 1.0 - h ); }
// The ball and the neck are one shape, and the band lies along its edge: round the ball, and where the neck leaves it
// the band turns down along the neck's sides, round the corner where the two meet, and draws itself as much narrower
// as the neck's own edge is. This is how far in from that edge a place is, as a share of the radius out from the
// middle, which is what the band is read by. rr is how far from the ball's middle it is, as a share of the radius, x
// across and d down from the foot, in units.
float coreAt( float rr, float x, float d ) {
	float ax = abs( x ), on = uRootState.x;
	vec2 R = neckReach();
	// Where the neck's side comes out of the ball's outline: the corner the band turns round.
	float lo = - 0.6 * uR, hi = 0.0;
	for ( int i = 0; i < 12; i ++ ) {
		float m = 0.5 * ( lo + hi );
		if ( neckWidth( m, NECK_RIB, R, on ) > sqrt( max( - m * ( 2.0 * uR + m ), 0.0 ) ) ) hi = m; else lo = m;
	}
	vec2 M = vec2( neckWidth( hi, NECK_RIB, R, on ), hi );
	float corner = length( vec2( ax, d ) - M );
	// The ball's edge counts only where the neck does not cover it, and under the neck the corner is nearest.
	vec2 v = vec2( ax, d + uR );
	float under = smoothstep( - 0.5, 0.5, M.x - ax * uR / max( length( v ), 1e-3 ) ) * step( - uR, d );
	float ball = mix( abs( uR * ( 1.0 - rr ) ), corner, under );
	// The neck's side counts only below the corner, and there the band is as much narrower as its edge is.
	float e = neckWidth( d, NECK_RIB, R, on ) - ax;
	float side = d >= M.y ? ( e >= 0.0 ? NECK_BAND * e : 1e3 ) : corner;
	return 1.0 - coreSmin( ball, side, NECK_TURN ) / uR;
}
// The neck's light here, as an amount of the stream's light, how much of it is the ball's own cream, how bright that
// cream is, and how far inside its edge the place is, in units.
vec4 rootAmount( float x, float d ) {
	float on = uRootState.x, since = uRootState.w, t = uTime, fx = max( fwidth( x ), 1e-3 );
	vec2 R = neckReach();
	if ( d >= R.x ) return vec4( 0.0, 0.0, 1.0, - 1e3 );
	float s = max( d, 0.0 ) * uRootScale.y, xs = x * uRootScale.x, ax = abs( x );
	float lead = on > 0.001 ? ( R.x - d ) * uRootScale.y : 1e4;
	float span = rootSpan( s, t, lead );
	float w = neckWidth( d, NECK_RIB, R, on );
	// The body: cream to pale gold right across, a hot and then a flame edge only in its last unit or so, and a clean
	// cut with nothing round it. It gives way to the ribbon alone over the last stretch before the cut.
	float B = 1.0 - smoothstep( NECK_BODY.x, NECK_BODY.y, d );
	float e = w - ax, rim = pow( smoothstep( - 0.5 * fx, NECK_RIM + 0.5 * fx, e ), NECK_RIM_POW );
	// The stream's own fibres run in it, spread to its width at the foot and the page's own, fibre for fibre, where it
	// has drawn itself down to the ribbon. Nothing of them is drawn outside the neck while it has a body.
	float F = max( 1.0, w / NECK_SPREAD ), Fh = 1.0 + NECK_HEART_OPEN * ( F - 1.0 );
	float heart = uRootScale.z * smoothstep( - NECK_UP, 0.0, d );
	float fib = rootStream( xs, s, t, lead, heart, F, Fh );
	float wc = mix( w + 0.5, ( 1.2 * span + 3.5 ) / uRootScale.x, 1.0 - B );
	fib *= 1.0 - smoothstep( wc - fx, wc + fx, ax );
	// The body is its fibres gathered: a little brighter along each, so it is never a flat tube, and light runs down it.
	float gather = clamp( fib, 0.0, 1.5 ) / 1.5;
	float run = 1.0 + NECK_RUN.x * sin( d / NECK_RUN.y - t * NECK_RUN.z + 0.7 * sin( x / 9.0 ) );
	float body = NECK_A * rim * ( 1.0 - NECK_STREAK + NECK_STREAK * gather ) * run;
	// Quiet before it sets off, and as it does, a surge of light runs down it from the foot.
	float surge = ROOT_SURGE * exp( - pow( ( d - since * ROOT_SURGE_V ) / ROOT_SURGE_W, 2.0 ) ) * ( 1.0 - smoothstep( 0.5, 1.2, since ) ) * on;
	float level = mix( ROOT_HUSH, 1.0, on ) * ( 1.0 + surge );
	float a = ( B * body + NECK_FIBRE * fib * mix( 1.0, rim, B ) ) * level;
	// Given over to the page's stream where the page draws its own.
	a *= 1.0 - uRootState.z * smoothstep( NECK_CUT, NECK_CUT + NECK_GIVE, d );
	// Where it leaves the ball its body is the ball's own light, and it turns to the stream's as it draws itself thin.
	float cream = B * smoothstep( 0.35, 0.9, rim ) * ( 1.0 - smoothstep( NECK_CREAM.x, NECK_CREAM.y, d ) ) * step( 0.002, a );
	return vec4( a, cream, ( 1.0 + NECK_GRAIN * ( gather - 0.5 ) ) * run, e );
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
// edge of the ribbon on it as a brown shadow: here a faint light covers less.
vec4 rootColor( float a ) {
	vec3 e = pow( min( rootRamp( a ), uPale ), vec3( 1.0 / 2.2 ) );
	vec3 T = mix( e / 12.92, pow( ( e + 0.055 ) / 1.055, vec3( 2.4 ) ), step( 0.04045, e ) );
	float m = max( e.r, max( e.g, e.b ) );
	return vec4( rootUntone( T ), m * m * m );
}
// The neck's color: the stream's, or where its body is the ball's own light, the ball's cream, a little paler than
// its face, as picture 9's is. Where it leaves the ball it is the ball's own face and band, turned down along it.
vec4 neckColor( vec4 l, float x, float d ) {
	vec4 c = mix( rootColor( l.x ), vec4( uCream * NECK_PALER * l.z, 1.0 ), l.y );
	float rb = coreAt( length( vec2( x, d + uR ) ) / uR, x, d ), fx = max( fwidth( x ), 1e-3 );
	vec3 ball = coreRim( rb ) * coreFall( rb ) * mix( NECK_PALER * l.z, 1.0, smoothstep( 0.6, 0.85, rb ) );
	float k = ( 1.0 - smoothstep( NECK_DOWN.x, NECK_DOWN.y, d ) ) * smoothstep( - 0.5 * fx, 0.5 * fx, l.w );
	return mix( c, vec4( ball, 1.0 ), k );
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
uniform float uTime;
varying vec2 vAt;
${GRAIN}
${ROOT_LIGHT}
void main() {
	float d = - uR - vAt.y;
	vec4 l = rootAmount( vAt.x, d );
	// The faintest light is let go, so nothing fades out as a wide brown film.
	l.x = max( l.x * smoothstep( - NECK_MEET - 2.0, - NECK_MEET, d ) - ROOT_FLOOR, 0.0 );
	if ( l.x < 0.002 ) discard;
	vec4 c = neckColor( l, vAt.x, d );
	// The face's grain runs on down into it a little way, as the face's own light does, and is gone as it turns to the
	// stream's.
	if ( d < NECK_DOWN.y ) {
		vec3 q = uTurn * vec3( vAt.x, vAt.y, 0.0 );
		float fp = max( max( length( dFdx( q ) ), length( dFdy( q ) ) ), 1e-4 );
		vec2 g = coreSalt( q, fp, uTime ) * ( 1.0 - smoothstep( 0.0, NECK_DOWN.y, d ) );
		c.rgb *= mix( vec3( 1.0 ), coreTint( GRAIN_GAIN * g.x, GRAIN_WARM * g.y ), c.a );
	}
	gl_FragColor = vec4( coreUnbalance( c.rgb ), c.a );
}`;
