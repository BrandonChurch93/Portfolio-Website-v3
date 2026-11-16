import { HOST, drawn } from '../../layout';
import { STREAM, STREAM_BUDGET, unitFor } from '../../../../stream/config';
import { CORE_HALF } from '../../../../stream/shaders';
import type { Tier } from '../../../../config/site';
import { UNBALANCE } from './grain';

// The neck of the beam: where the page's stream leaves the core's foot, as picture 9's neck. A beam of the stream's
// light shot down out of the ball: it flares out of the ball in one smooth fillet with broad shoulders, and is
// brightest and palest down its heart, falling through hot to a deep amber at its edges, with fine bright streaks
// running fast down its length. It draws itself thin to the page's own heart, which it is over its last stretch, at
// the same size on the screen, at the same place along it and on the same clock, and there it is given over to it.

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

// The stream's own heart and the light that runs down it, as src/stream/shaders.ts (coreFrag) draws them, letter
// for letter: x across and s along it in stream units, t the clock, lead how far its leading end is past this place,
// heart how much brighter the page makes it, and hw how wide it is against the page's.
export const ROOT_STREAM = /* glsl */ `
float rootHash( float n ) { return fract( sin( n * 127.1 ) * 43758.5453 ); }
vec2 rootStream( float x, float s, float t, float lead, float heart, float hw ) {
	float twist = s / 58.0 - t * 0.36 + 1.3 * sin( s / 143.0 - t * 0.12 );
	float gather = 1.0 - abs( cos( twist ) ), q = x / ( mix( 0.8, 1.4, gather ) * hw );
	float core = mix( 1.7, 3.0, gather * gather ) * heart / pow( 1.0 + q * q, 1.6 );
	float run = 0.84 + 0.16 * sin( s / 83.0 - t * 2.1 ) * sin( s / 211.0 - t * 0.9 + 0.8 );
	float head = 1.0 - smoothstep( 0.0, 120.0, lead );
	float k = run * ( 1.0 + ROOT_ENERGY * head * head ) * smoothstep( 0.0, 5.0, lead ) * smoothstep( ${CORE_HALF.toFixed(1)}, ${CORE_HALF.toFixed(1)} - 12.0, abs( x ) );
	return vec2( core * k, k );
}
// The pulses that run down the beam at the stream's own pace: a few broad beats of light, sharp ahead and long behind,
// spaced unevenly and each of its own strength, so no train of them is ever seen to repeat. s is along it in stream
// units. Each slot of the train holds one pulse or none.
float rootPulse( float s, float t ) {
	float p = ( s - t * NECK_PACE ) / NECK_GAP, i = floor( p ), sum = 0.0;
	for ( int k = - 1; k <= 1; k ++ ) {
		float j = i + float( k ), a = rootHash( j * 1.37 + 4.1 ), b = rootHash( j * 2.71 + 9.3 );
		float e = ( p - j - 0.15 - 0.7 * b ) * NECK_GAP;
		float reach = e > 0.0 ? NECK_PULSE.z : NECK_PULSE.w;
		sum += step( NECK_PULSE.y, a ) * mix( 0.6, 1.0, b ) * exp( - e * e / ( reach * reach ) );
	}
	return sum;
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
uniform float uLevel;
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
// How far down it reaches, in units, and how long its end is. Before the stream sets off it has not left the ball.
vec2 neckReach() {
	float reach = uRootState.x > 0.001 ? uRootState.y : 0.0;
	return vec2( reach, min( NECK_TIP, 0.9 * reach ) );
}
// Half the beam's width here, in units of the world, as picture 9's: broad where it leaves and drawing itself thin
// quickly and then slowly. A point at its end while its leading end is still close.
float neckWidth( float d, vec2 R, float on ) {
	float w = NECK_RIB + ( NECK_FOOT - NECK_RIB ) * exp( - max( d, 0.0 ) / NECK_FALL );
	w *= mix( NECK_QUIET, 1.0, on );
	return w * pow( clamp( ( R.x - d ) / max( R.y, 1e-3 ), 0.0, 1.0 ), NECK_ROUND );
}
// How far across the beam a place is, as a share of its half width: 0 down its heart, 1 at its edge. Where it leaves
// the ball it flares out into the ball's outline in one broad fillet, which goes on widening up inside the ball.
float neckAcross( float x, float d, vec2 R, float on ) {
	float flare = NECK_FILLET.x * on * exp( - ( d + NECK_FILLET.z ) / NECK_FILLET.y ) * smoothstep( 0.0, NECK_FILLET.y, R.x );
	return abs( x ) / max( neckWidth( d, R, on ) + flare, 1e-3 );
}
// The neck's light here, as an amount of the stream's light.
float rootAmount( float x, float d ) {
	float on = uRootState.x, since = uRootState.w, t = uTime;
	vec2 R = neckReach();
	if ( on < 0.001 || d >= R.x ) return 0.0;
	float s = max( d, 0.0 ) * uRootScale.y, xs = x * uRootScale.x;
	float lead = ( R.x - d ) * uRootScale.y;
	float u = neckAcross( x, d, R, on );
	// Past the cut it gives way to the page's own stream, whose heart comes on over the same stretch: the two cross.
	float give = 1.0 - uRootState.z * smoothstep( NECK_CUT + NECK_GIVE.x, NECK_CUT + NECK_GIVE.y, d );
	// The pulses running down it. Each is a beat of light as wide as the heart, and it lights the beam's edges as it
	// passes, so it is seen at the page's size as light running down it and not as a bead.
	float pulse = rootPulse( s, t ) * smoothstep( 0.0, NECK_PULSE_IN, d ) * smoothstep( 0.0, 30.0, lead );
	// The beam's body: brightest down its heart and falling away to its edge as a bell, so it has no plateau and no
	// outline, and its color falls with it from hot through flame to a deep amber. It is held as wide and as bright
	// all the way to the cut.
	float B = NECK_A * ( 1.0 + NECK_LEAVE.x * exp( - max( d, 0.0 ) / NECK_LEAVE.y ) );
	float body = B * ( 1.0 + NECK_EDGE * pulse ) * exp( - NECK_K * u * u );
	// The beat itself is no wider than the beam is where it has drawn in, so where the beam leaves the ball it is a
	// hot thread through the flare and never a wide soft blob.
	float pw = min( neckWidth( d, R, on ), NECK_PULSE_W ) * ( 1.0 + NECK_SPREAD * pulse ), px = x / max( pw, 1e-3 );
	body += B * NECK_PULSE.x * pulse * exp( - NECK_K * px * px );
	// The page's own heart down its middle, the page's width, brightness and breath: held under the cap where the beam
	// leaves the ball, so its form is carried by hot to amber there, and the page's whole by the cut.
	vec2 hk = rootStream( xs, s, t, lead, uRootScale.z, 1.0 );
	float heart = hk.x * mix( NECK_HEART.x, 1.0, smoothstep( NECK_HEART.y, NECK_HEART.z, d ) ) * smoothstep( 0.0, NECK_UP, d );
	// As it sets off, a surge of light runs down it from the foot.
	float surge = ROOT_SURGE * exp( - pow( ( d - since * ROOT_SURGE_V ) / ROOT_SURGE_W, 2.0 ) ) * ( 1.0 - smoothstep( 0.5, 1.2, since ) );
	float a = ( body * hk.y + heart ) * give * ( 1.0 + surge ) * on;
	return max( a - ROOT_FLOOR, 0.0 );
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
${UNBALANCE}
${ROOT_LIGHT}
void main() {
	float d = - uR - vAt.y;
	float a = rootAmount( vAt.x, d );
	if ( a < 0.002 ) discard;
	vec4 c = rootColor( a );
	gl_FragColor = vec4( coreUnbalance( c.rgb ) * uLevel, c.a );
}`;
