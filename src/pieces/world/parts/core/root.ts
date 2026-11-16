import { HOST, drawn } from '../../layout';
import { STREAM, STREAM_BUDGET, unitFor } from '../../../../stream/config';
import { CORE_HALF } from '../../../../stream/shaders';
import { clock } from '../../../../world/clock';
import type { Tier } from '../../../../config/site';
import { UNBALANCE } from './grain';

// The root of the beam: where the page's stream leaves the core's foot. The page's stream does not draw its own core
// for its first stretch (STREAM.hero.hand), so here the core draws it, as the page draws it: the same braided ribbon
// of fibres round a hot heart, at the same size on the screen, at the same place along it and on the same clock, so
// the two are one thing where they meet. Over the ball's foot the ribbon flares open, its fibres fanning up into the
// ball's band, and that is where the beam is rooted.

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

// How far below the foot the page's leading end is, in units of the world: it rests on the line two thirds of the
// way down the screen (STREAM.anchor), and the route runs straight down from the foot. null where the world is not
// laid out as the page lays it.
export function reachOnPage(canvas: HTMLCanvasElement, foot: readonly [number, number, number]): number {
  const r = canvas.getBoundingClientRect(), px = r.width / HOST.wide;
  if (px <= 0) return 0;
  const [, down] = drawn(foot[0], foot[1], foot[2]), [, below] = drawn(foot[0], foot[1] - 1, foot[2]);
  return (STREAM.anchor * clock.view.h - (r.top + down * px)) / ((below - down) * px);
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

// The root's light at a place of the plane through the ball's middle, x across from the beam's line and d down from
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
${ROOT_STREAM}
// Half the ball's width at a height h over its foot.
float rootLimb( float h ) { return h > 0.0 ? sqrt( max( 2.0 * uR * h - h * h, 0.0 ) ) : 0.0; }
// How far the ribbon is opened under the foot, as the neck of picture 9 flares into the ball: 1 well down the beam.
float rootOpen( float d ) {
	float b = max( d, 0.0 );
	return 1.0 + ROOT_FLARE0 * exp( - b / ROOT_FALL0 ) + ROOT_FLARE1 * exp( - b / ROOT_FALL1 );
}
// The ball's band where the beam is rooted: hottest at the foot and along the inside of the edge, for a little way
// round the ball each side of it. Outside the ball it is gone within a unit or two.
float rootFoot( float x, float d ) {
	vec2 p = vec2( x, - uR - d );
	float e = uR - length( p ), phi = atan( p.x, max( - p.y, 1e-3 ) );
	float o = max( - e, 0.0 ) / ROOT_FOOT.z;
	return exp( - max( e, 0.0 ) / ROOT_FOOT.x - o * o - phi * phi / ( ROOT_FOOT.y * ROOT_FOOT.y ) );
}
float rootAmount( float x, float d ) {
	float xs = x * uRootScale.x, s = d * uRootScale.y, t = uTime, on = uRootState.x;
	float open = rootOpen( d ), l = rootLimb( - d ) * uRootScale.x / ROOT_BEAM * ROOT_HUG;
	// Over the foot the fibres fan up along the inside of the ball's band.
	float F = sqrt( open * open + l * l ), Fh = 1.0 + ROOT_HEART_OPEN * ( open - 1.0 ) + ROOT_HEART_HUG * l;
	float gx = xs / ( ROOT_GLOW_W * Fh ), glow = ROOT_GLOW * exp( - gx * gx );
	// Over the foot the heart gives way to the fibres, which run on up into the band brighter than below.
	float heart = uRootScale.z * smoothstep( - ROOT_HEART_UP, 0.0, d ), up = 1.0 + ROOT_FAN * smoothstep( 0.0, - 6.0, d );
	float since = uRootState.w, burst = on * ( 1.0 - smoothstep( 0.4, 1.1, since ) );
	float a = mix( ROOT_GATHER.x, ROOT_GATHER.y, on ) * ( 1.0 + ROOT_SURGE * burst ) * rootFoot( x, d );
	// Before the stream has set off: the light gathering in the band at the foot, and only a lip of it below.
	if ( on < 0.999 ) {
		float q = rootStream( xs, s, t, 1e4, heart, F, Fh ) * up + glow;
		a += ( 1.0 - on ) * ROOT_HUSH * q * exp( - max( d, 0.0 ) / ROOT_QUIET );
	}
	// Once it has: the beam, as far as the leading end, given over to the page's stream where the page draws its own.
	if ( on > 0.001 ) {
		float lead = ( uRootState.y - d ) * uRootScale.y;
		float b = rootStream( xs, s, t, lead, heart, F, Fh ) * up + glow * smoothstep( 0.0, 12.0, lead );
		float given = uRootState.z * smoothstep( ROOT_HAND0, ROOT_HAND0 + ROOT_GIVE * ( ROOT_HAND1 - ROOT_HAND0 ), d * ROOT_HOST );
		// It leaves with force: a surge of light runs down it from the foot as it sets off.
		float at = since * ROOT_SURGE_V;
		float surge = ROOT_SURGE * exp( - pow( ( d - at ) / ROOT_SURGE_W, 2.0 ) ) * ( 1.0 - smoothstep( 0.5, 1.2, since ) );
		a += on * b * ( 1.0 + surge ) * ( 1.0 - given );
	}
	return a;
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
`;

// The plane the root is drawn on, through the ball's middle and facing the eye. Inside the ball the ball draws it.
export const ROOT_VERT = /* glsl */ `
varying vec2 vAt;
void main() {
	vAt = position.xy;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

export const ROOT_FRAG = /* glsl */ `
precision highp float;
uniform float uR;
uniform float uTime;
varying vec2 vAt;
${UNBALANCE}
${ROOT_LIGHT}
void main() {
	float d = - uR - vAt.y, a = rootAmount( vAt.x, d );
	// Outside the ball and close under it, it is gone within a unit or two of the ball's edge: what fans up into
	// the band is drawn by the ball.
	float e = max( length( vAt ) - uR, 0.0 ) / ( ROOT_ABOVE + ROOT_ABOVE_OPEN * max( d, 0.0 ) );
	a *= exp( - e * e );
	// The faintest light is let go, so nothing fades out as a wide brown film.
	a = max( a - ROOT_FLOOR, 0.0 );
	a *= smoothstep( ROOT_EDGE, ROOT_EDGE * 0.7, abs( vAt.x ) );
	if ( a < 0.002 ) discard;
	vec4 c = rootColor( a );
	gl_FragColor = vec4( coreUnbalance( c.rgb ), c.a );
}`;
