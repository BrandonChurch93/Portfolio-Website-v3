import * as THREE from 'three';
import { buildShards, FACET_KINDS, VERTEX_FLOATS } from '../../../../stream/shards';
import { seeded } from '../../../../stream/rand';

// What of the stream rides the beam near the ball: a few of the stream's own shards (src/stream/shards.ts makes
// their shapes), solid copper and clear glass, carried down it round its line, few under the flare and more toward
// the cut, where the page's own riding shards gather. Each is lit as the page lights its own: a solid face is dark
// until it turns to the light and then flashes whole, a clear one holds the light and burns along its edges. Their
// light is the ball over them and the beam beside them. Everything moves in the vertex shader, from the clock.
// They are drawn in two passes of one program, those behind the beam before it and those in front after it.

// rides: how many at each cost; from: the least and most depth under the foot a shard's run begins at, and how
// strongly they are drawn toward the deeper end (above 1, more of them lower down); run: how long a run is, least
// and most, in units; time: how long a run takes, least and most, in seconds; size: the radius of a shard, least and
// most, in units, most of them small; out: how far out from the beam's edge they ride, least and most; turn: how fast
// they go round the beam, in radians a second, least and most; spin: how fast each tumbles; clear: the share of
// clear glass; past: over how many units past the cut they are let go, as the page's own take over.
export const RIDE = {
  rides: { full: 26, lean: 14 },
  from: [18, 250, 0.55], run: [70, 150], time: [2.6, 4.6], size: [1.8, 5.2], out: [1.5, 7], turn: [0.5, 1.4], spin: [0.6, 2.2],
  clear: 0.4, past: 90,
} as const;

// Per rider: its own numbers, which kind of facet it is, and whether it is clear.
export function riderGeometry(count: number, seed: number): THREE.BufferGeometry {
  const shapes = buildShards(seed);
  const r = seeded(seed * 13 + 5);
  const pos: number[] = [], nrm: number[] = [], edge: number[] = [], rider: number[] = [], more: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = r(), b = r(), c = r(), e = r(), big = r() ** 2.2, out = r(), round = r();
    const kind = Math.min(FACET_KINDS - 1, Math.floor(big * FACET_KINDS * 0.999));
    const k = shapes.kinds[kind];
    const clear = r() < RIDE.clear ? 1 : 0;
    for (let v = k.first; v < k.first + k.count; v++) {
      const o = v * VERTEX_FLOATS, D = shapes.data;
      pos.push(D[o], D[o + 1], D[o + 2]);
      nrm.push(D[o + 3], D[o + 4], D[o + 5]);
      edge.push(D[o + 6], D[o + 7], D[o + 8]);
      rider.push(a, b, c, clear);
      more.push(e, big, out, round);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 3));
  g.setAttribute('aRider', new THREE.Float32BufferAttribute(rider, 4));
  g.setAttribute('aMore', new THREE.Float32BufferAttribute(more, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -250, 0), 400);
  return g;
}

export const RIDER_VERT = /* glsl */ `
attribute vec3 aEdge;
attribute vec4 aRider;
attribute vec4 aMore;
uniform float uTime;
uniform float uR;
uniform vec4 uRootState;
uniform float uSide;
varying vec3 vN;
varying vec3 vView;
varying vec3 vEdge;
varying vec3 vToward;
varying vec3 vUp;
varying float vClear;
varying float vObj;
varying float vSize;
varying float vBeam;
varying float vBall;
float riderHash( float n ) { return fract( sin( n * 127.1 ) * 43758.5453 ); }
vec3 riderTurn( vec3 v, vec3 k, float a ) { float c = cos( a ), s = sin( a ); return v * c + cross( k, v ) * s + k * dot( k, v ) * ( 1.0 - c ); }
void main() {
	float a = aRider.x, b = aRider.y, c = aRider.z;
	float on = uRootState.x, reach = uRootState.x > 0.001 ? uRootState.y : 0.0;
	// Its run down the beam: where it begins, how long it is and how long it takes, round and round.
	float period = mix( RIDE_TIME.x, RIDE_TIME.y, c ), u = fract( uTime / period + a * 7.31 ), lap = floor( uTime / period + a * 7.31 );
	float h = riderHash( lap * 3.7 + a * 91.0 );
	float from = mix( RIDE_FROM.x, RIDE_FROM.y, pow( mix( b, h, 0.6 ), 1.0 / RIDE_FROM.z ) );
	float d = from + mix( RIDE_RUN.x, RIDE_RUN.y, riderHash( lap * 1.3 + c * 17.0 ) ) * u;
	float cut = NECK_CUT * uRootState.z + 1e4 * ( 1.0 - uRootState.z );
	float life = smoothstep( 0.0, 0.12, u ) * ( 1.0 - smoothstep( 0.85, 1.0, u ) ) * ( 1.0 - smoothstep( cut, cut + RIDE_PAST, d ) );
	life *= on * smoothstep( 0.0, 30.0, reach - d ) * smoothstep( 4.0, 16.0, d );
	float size = mix( RIDE_SIZE.x, RIDE_SIZE.y, aMore.y ) * life;
	// Round the beam's line, at its own distance out from the beam's edge and its own pace, either way round.
	float wide = NECK_RIB + ( NECK_FOOT - NECK_RIB ) * exp( - d / NECK_FALL );
	float ring = wide + mix( RIDE_OUT.x, RIDE_OUT.y, aMore.z ), turn = aMore.w * 6.2832 + uTime * mix( RIDE_TURN.x, RIDE_TURN.y, riderHash( a * 5.1 ) ) * ( riderHash( b * 3.3 ) < 0.5 ? - 1.0 : 1.0 );
	vec3 at = vec3( ring * cos( turn ), - uR - d, ring * sin( turn ) );
	// Each in its own pass: behind the beam, or in front of it.
	if ( at.z * uSide < 0.0 ) size = 0.0;
	vec3 axis = normalize( vec3( riderHash( a * 2.9 ) - 0.5, riderHash( b * 4.7 ) - 0.5, riderHash( c * 6.1 ) - 0.5 ) + 1e-3 );
	float spin = aMore.x * 6.2832 + uTime * mix( RIDE_SPIN.x, RIDE_SPIN.y, riderHash( c * 8.3 ) );
	vec3 p = at + riderTurn( position, axis, spin ) * size;
	vec4 mv = modelViewMatrix * vec4( p, 1.0 );
	vN = normalize( normalMatrix * riderTurn( normal, axis, spin ) );
	vView = mv.xyz;
	vEdge = aEdge * size;
	vToward = normalize( normalMatrix * vec3( - at.x, 0.0, - at.z ) );
	vUp = normalize( normalMatrix * vec3( - at.x, - at.y, - at.z ) );
	vClear = aRider.w;
	vObj = length( position );
	vSize = size;
	// How much of the beam's light reaches it, and of the ball's, which is over it and very large.
	vBeam = on / ( 1.0 + pow( max( ring - wide, 0.0 ) / 9.0, 1.5 ) ) * smoothstep( 0.0, 40.0, d );
	float far = length( at ) / uR;
	vBall = 1.0 / ( far * far );
	gl_Position = projectionMatrix * mv;
}`;

export const RIDER_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uCopper;
uniform vec3 uCopperLight;
uniform vec3 uEmber;
uniform vec3 uFlame;
uniform vec3 uHot;
uniform vec3 uPale;
uniform float uLevel;
varying vec3 vN;
varying vec3 vView;
varying vec3 vEdge;
varying vec3 vToward;
varying vec3 vUp;
varying float vClear;
varying float vObj;
varying float vSize;
varying float vBeam;
varying float vBall;
// The beam is a line of light, so what a flat face mirrors of it is a band across the face, which slides over it as
// the shard turns (the page's coreBand). The ball over it is so large it is a broad soft light.
float riderBand( vec3 N, vec3 V, vec3 toward, vec3 plane, float wide ) {
	vec3 R = reflect( - V, N );
	float off = dot( R, plane );
	return exp( - off * off / ( wide * wide ) ) * smoothstep( - 0.2, 0.35, dot( R, toward ) );
}
vec3 riderRamp( float a ) {
	vec3 c = uEmber * clamp( a / 0.11, 0.0, 1.0 );
	c = mix( c, uFlame, smoothstep( 0.07, 0.42, a ) );
	c = mix( c, uHot, smoothstep( 0.34, 0.85, a ) );
	c = mix( c, uPale, smoothstep( 0.7, 1.6, a ) );
	return c;
}
void main() {
	if ( vSize < 0.05 ) discard;
	vec3 N = normalize( vN ), V = normalize( - vView ), T = normalize( vToward ), U = normalize( vUp );
	if ( dot( N, V ) < 0.0 ) N = - N;
	vec3 plane = normalize( cross( vec3( 0.0, 1.0, 0.0 ), T ) + 1e-4 );
	float beam = vBeam * RIDE_BEAM, ball = vBall * RIDE_BALL;
	float flash = riderBand( N, V, T, plane, 0.2 ) * 9.0, sheen = riderBand( N, V, T, plane, 0.34 ) * 0.45;
	vec3 R = reflect( - V, N );
	float sky = smoothstep( 0.2, 0.75, dot( R, U ) ), lit = max( dot( N, U ), 0.0 );
	float e = min( vEdge.x, min( vEdge.y, vEdge.z ) ), px = max( fwidth( e ), 1e-3 );
	float line = 1.0 - smoothstep( 0.6 * px, 1.6 * px, e );
	float tip = pow( smoothstep( 0.68, 1.0, vObj ), 3.0 );
	vec3 col;
	float cover = 1.0;
	if ( vClear < 0.5 ) {
		// Solid: dark copper, each face its own tone, flashing whole when it turns to the beam or the ball.
		float light = 0.02 + beam * ( flash + sheen + 0.06 * max( dot( N, T ), 0.0 ) ) + ball * ( 1.6 * sky + 0.12 * lit );
		light = mix( light, max( light, 0.4 * ( beam + ball ) ), line ) + tip * ( 1.4 * beam + 0.5 * ball );
		col = mix( uCopper, uCopperLight, 0.3 * clamp( light - 0.6, 0.0, 1.0 ) ) * vec3( 1.0, 0.92, 0.8 ) * light * 1.35;
		float mx = max( col.r, max( col.g, col.b ) );
		col *= ( 1.0 - exp( - mx * 1.15 ) ) / ( mx * 0.955 + 1e-5 );
		col = mix( col, uPale, clamp( ( light - 1.7 ) * 0.4, 0.0, 0.85 ) );
	} else {
		// Clear: it holds the light inside, most through the middle of a face, and burns along its edges.
		float deep = pow( smoothstep( 0.0, 0.34 * vSize, e ), 1.3 );
		float away = 0.5 - 0.5 * dot( N, T );
		float held = min( sqrt( beam + ball ), 1.2 ) * ( 0.16 + 0.5 * pow( away, 1.5 ) ) + 0.55 * beam * riderBand( N, V, T, plane, 0.36 );
		held = 0.8 * ( 1.0 - exp( - held * ( 0.22 + 0.78 * deep ) / 0.42 ) );
		float rim = 1.0 - smoothstep( 0.1, 0.55, abs( N.z ) );
		float glow = held + line * ( held * 1.5 + 0.3 * min( beam + ball, 1.0 ) ) + rim * held * 0.5 + tip * ( 1.6 * beam + 0.6 * ball ) + riderBand( N, V, T, plane, 0.07 ) * 2.8 * beam;
		col = riderRamp( glow );
		cover = clamp( 0.25 + 0.6 * glow, 0.0, 1.0 );
	}
	gl_FragColor = vec4( col * uLevel * cover, cover );
}`;
