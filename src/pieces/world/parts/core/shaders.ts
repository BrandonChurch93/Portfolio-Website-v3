import { GRAIN, UNBALANCE } from './grain';
import { ROOT_LIGHT } from './root';

// The core's shaders: the ball, and the pieces of the planet its beam is drawing in. The ball gives light of its
// own and is lit by nothing. They write linear light: the stage's last pass applies the tone curve, which
// takes what is too bright to pale gold, so every color here was worked back through that curve from picture 9's.

// The ball is drawn on a shell a little larger than itself, and each pixel finds the true ball by its own ray, so
// its edge is exact and smoothed at any size, and nothing is drawn outside it.
export const BALL_VERT = /* glsl */ `
varying vec3 vLocal;
void main() {
	vLocal = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

export const BALL_FRAG = /* glsl */ `
precision highp float;
precision highp int;
uniform vec3 uEye;
uniform float uTime;
uniform float uLevel;
varying vec3 vLocal;
${GRAIN}
${ROOT_LIGHT}

// The dip and the line are each a pixel or two wide on the page, so the band is read over the pixel's own width.
vec3 coreBand( float rr, float px ) {
	return ( coreRim( rr - 0.33 * px ) + coreRim( rr ) + coreRim( rr + 0.33 * px ) ) / 3.0;
}
void main() {
	vec3 ro = uEye, rd = coreDir( vLocal - uEye );
	float b = dot( ro, rd ), c = dot( ro, ro ) - b * b;
	// How far out from the ball's middle the ray passes, as a share of its radius: 1 at its edge.
	float rr = sqrt( max( c, 0.0 ) ) / uR;
	float px = max( fwidth( rr ), 1e-5 ), cover = clamp( ( 1.0 - rr ) / px + 0.5, 0.0, 1.0 );
	// The band is read over at least the width a pixel has at the page's size on a plain screen, so a sharper screen
	// shows it as the picture has it and no darker.
	float bandPx = max( px, BAND_PX / uR );
	if ( cover <= 0.0 ) discard;
	float h = max( uR * uR - c, 0.0 );
	vec3 P = ro + rd * ( - b - sqrt( h ) );

	// The neck of the beam, read on the plane through the ball's middle, where the neck below the ball is drawn, so the
	// two are one shape: where it leaves, the band turns down along its sides, and the face's own light runs down into it.
	vec3 Q = ro + rd * ( - ro.z / ( abs( rd.z ) > 1e-4 ? rd.z : - 1e-4 ) );
	float rb = coreAt( rr, Q.x, - uR - Q.y );


	// The grain lies on the ball and turns with it, slowly, as something enormous turns: fastest across the middle and
	// slower toward the edge, where it is seen on a slant. It churns in place as it goes.
	// Over the foot it is read on that plane too, as the neck below is, so the grain runs on down into the neck with no
	// seam, and is not lost where the ball's surface turns away from the eye.
	float wm = neckWidth( - NECK_MEET, NECK_RIB, neckReach(), uRootState.x );
	float foot = smoothstep( NECK_FOOT_UP.x, NECK_FOOT_UP.y, rr ) * smoothstep( wm + 4.0, wm - 4.0, abs( Q.x ) ) * step( Q.y, 0.0 );
	vec3 q = uTurn * P;
	float fp = max( max( length( dFdx( q ) ), length( dFdy( q ) ) ), 1e-4 );
	vec3 qn = uTurn * vec3( Q.xy, 0.0 );
	float fn = max( max( length( dFdx( qn ) ), length( dFdy( qn ) ) ), 1e-4 );
	vec2 g = coreSalt( q, fp, uTime );
	if ( foot > 0.0 ) g = mix( g, coreSalt( qn, fn, uTime ), foot );
	float drift = uTime * GRAIN_DRIFT;
	float v = g.x + MOTTLE * ( 0.65 * coreNoise( q / MOTTLE_WAVE + vec3( drift, 0.0, - drift ), 73u ) + 0.35 * coreNoise( q / ( 0.45 * MOTTLE_WAVE ) - vec3( 0.0, drift, 0.0 ), 79u ) );
	float w = g.y;

	// Quieter across the band, which picture 9 has smooth, and gone where the beam's light begins.
	float into = coreInto( rb, - uR - Q.y );
	float quiet = ( 1.0 - GRAIN_BAND * smoothstep( 0.84, 0.935, rb ) ) * ( 1.0 - into );
	v = clamp( GRAIN_GAIN * v * quiet, - 3.0, 3.0 );
	w = clamp( GRAIN_WARM * w * quiet, - 3.0, 3.0 );
	vec3 col = coreBand( rb, bandPx ) * coreTint( v, w );
	col *= 1.0 + BAND_LIFT * ( 1.0 - smoothstep( 0.6, 0.95, px * uR ) ) * smoothstep( BAND_AT.x, BAND_AT.y, rb ) * ( 1.0 - smoothstep( BAND_AT.z, BAND_AT.w, rb ) );
	// A sphere and not a disc: its light falls smoothly from a hot region a little up and to the left, toward the eye's
	// side of it, out to the limb over the outer third, and there gives way to the band.
	vec2 hp = P.xy / uR - HOT_AT;
	col *= coreFall( rb ) * mix( 1.0 + HOT * exp( - dot( hp, hp ) / ( HOT_R * HOT_R ) ), 1.0, smoothstep( LIMB_TO.x, LIMB_TO.y, rb ) );
	col = mix( col, uCream * NECK_PALER, into ) * uLevel;

	gl_FragColor = vec4( coreUnbalance( col * cover ) / max( cover, 1e-3 ), cover );
}`;

// The pieces of the planet the beam is drawing in. Each comes out of the dark of the hollow, far out and low, and
// hangs, turning slowly, as it is drawn in round the ball's lower half toward its foot: slowly at first and faster as
// it nears. At the foot the beam takes it, and it is carried down the neck, worn away before the page's stream takes
// over.
// Then it rests unseen, and the next time it comes from somewhere else. Where it is comes from the clock alone. It
// passes in front of the ball's lower edge at most, nearer the eye than the ball, which gives the ball its depth.
//   aMove: how long one of its comings takes, in seconds, where in that it starts, half its length, and its own seed
//   aSpin: the axis it turns about, and how fast, in radians a second
export const SHARD_VERT = /* glsl */ `
attribute vec3 aEdge;
attribute vec3 aB0;
attribute vec3 aB1;
attribute vec3 aB2;
attribute vec4 aMove;
attribute vec4 aSpin;
uniform float uTime;
uniform float uR;
varying vec3 vP;
varying vec3 vN;
varying vec3 vObj;
varying vec3 vEdge;
varying vec3 vB0;
varying vec3 vB1;
varying vec3 vB2;
varying float vNear;
vec3 coreSpin( vec3 v, vec3 k, float a ) { float c = cos( a ), s = sin( a ); return v * c + cross( k, v ) * s + k * dot( k, v ) * ( 1.0 - c ); }
float coreRand( float n, float k ) { return fract( sin( n * 91.37 + k * 47.13 + aMove.w * 13.71 ) * 43758.5453 ); }
void main() {
	float T = aMove.x, c = ( uTime + aMove.y ) / T, n = floor( c ), f = ( c - n ) * T;
	float drift = T - SHARD_DROP - SHARD_REST;
	// Where this coming starts: which side, the other from the time before, how far round from straight down, how far
	// out, how far toward the eye.
	float side = mod( n + aMove.w, 2.0 ) < 1.0 ? - 1.0 : 1.0;
	float th0 = radians( mix( SHARD_FROM.x, SHARD_FROM.y, coreRand( n, 2.0 ) ) ), r0 = mix( SHARD_OUT.x, SHARD_OUT.y, coreRand( n, 3.0 ) ) * uR;
	float z0 = mix( SHARD_TOWARD.x, SHARD_TOWARD.y, coreRand( n, 4.0 ) ) * uR;
	// Drawn in: slow at first, faster as it nears the foot.
	float u = clamp( f / drift, 0.0, 1.0 ), e = pow( u, 1.8 );
	float th = mix( th0, radians( SHARD_FOOT.x ), e ), r = mix( r0, SHARD_FOOT.y * uR, smoothstep( 0.0, 1.0, u ) ), z = mix( z0, SHARD_FOOT.z * uR, e );
	vec3 p = vec3( side * sin( th ) * r, - cos( th ) * r, z );
	// Taken by the beam and carried down it, onto its line, faster and faster, turning over as it goes, and worn away
	// to nothing in the last of it.
	float g = clamp( ( f - drift ) / SHARD_DROP, 0.0, 1.0 ), down = SHARD_SINK * g * g;
	p += vec3( - p.x * 0.92 * smoothstep( 0.0, 0.35, g ), - down, 0.0 );
	float grow = smoothstep( 0.0, SHARD_GATHER, f ) * ( 1.0 - smoothstep( 0.7, 1.0, g ) ) * step( f, drift + SHARD_DROP );
	vNear = 1.0 - u;
	float a = aSpin.w * ( uTime + SHARD_CARRIED * SHARD_DROP * g * g ) + 6.283 * coreRand( n, 5.0 ), size = aMove.z * grow;
	vec3 k = normalize( aSpin.xyz + vec3( coreRand( n, 6.0 ) - 0.5, coreRand( n, 7.0 ) - 0.5, 0.0 ) );
	vObj = position;
	vP = p + coreSpin( position, k, a ) * size;
	vN = coreSpin( normal, k, a );
	vB0 = coreSpin( aB0, k, a );
	vB1 = coreSpin( aB1, k, a );
	vB2 = coreSpin( aB2, k, a );
	vEdge = aEdge * size;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( vP, 1.0 );
}`;

// The light a piece is lit by. The ball is a ball of light close by, so a face takes its light
// as from a ball and not a point, falling off as the ball looks smaller, and a face mirrors it when what it mirrors
// falls inside the ball. The beam under the foot is a line of light, which a piece carried down it is lit by.
const SHARD_LIGHT = /* glsl */ `
${UNBALANCE}
uniform vec3 uEye;
uniform float uR;
uniform float uLevel;
uniform vec3 uBall;
varying vec3 vP;
varying vec3 vN;
varying vec3 vObj;
varying vec3 vEdge;
varying vec3 vB0;
varying vec3 vB1;
varying vec3 vB2;
varying float vNear;
// The light of the ball on a face looking N: its cosine, eased to nothing as the ball sets behind the face.
float coreOn( vec3 N, vec3 L, float s ) {
	float c = dot( N, L );
	return c >= s ? c : ( c <= - s ? 0.0 : ( c + s ) * ( c + s ) / max( 4.0 * s, 1e-5 ) );
}
// How close this place is to an edge of its face, as a hairline about a pixel wide, and the bevel of that edge.
float coreLine( out vec3 B ) {
	float e = min( vEdge.x, min( vEdge.y, vEdge.z ) ), w = max( fwidth( e ) * 1.3, 1e-4 );
	B = vEdge.x <= vEdge.y && vEdge.x <= vEdge.z ? vB0 : ( vEdge.y <= vEdge.z ? vB1 : vB2 );
	B /= max( length( B ), 1e-4 );
	return 1.0 - smoothstep( 0.35 * w, w, e );
}
// The ball: which way it is, how large it looks (the sine of its half angle), and how much of its light arrives.
vec3 coreBallAt( out float s, out float fall ) {
	float d = max( length( vP ), 1e-3 );
	s = min( uR / d, 1.0 );
	fall = s * s;
	return - vP / d;
}
// The beam under the foot: which way its nearest point is, and how much of its light arrives.
vec3 coreBeamAt( out float fall ) {
	vec3 to = vec3( 0.0, min( vP.y, - uR ), 0.0 ) - vP;
	float d = max( length( to ), 1e-3 );
	fall = SHARD_BEAM / ( 1.0 + pow( d / SHARD_BEAM_W, 1.5 ) );
	return to / d;
}
`;

// A piece of the planet's rock: its stone, dark where the ball does not reach it, a face turned to the ball lit by
// it as by a broad light close by, and an edge whose bevel looks toward the ball catching it as a bright hairline. On
// the beam the beam lights it from beside.
export const SOLID_FRAG = /* glsl */ `
uniform vec3 uStone;
${SHARD_LIGHT}
void main() {
	vec3 N = normalize( vN ), V = normalize( uEye - vP ), B;
	if ( dot( N, V ) < 0.0 ) N = - N;
	float s, fall, beam;
	vec3 L = coreBallAt( s, fall ), Lb = coreBeamAt( beam );
	float line = coreLine( B ), lit = min( fall * SHARD_NEAR, 1.0 );
	float face = lit * coreOn( N, L, s ) + beam * max( dot( N, Lb ), 0.0 );
	float edge = line * ( lit * pow( max( dot( B, L ), 0.0 ), SHARD_EDGE_POW ) + beam * pow( max( dot( B, Lb ), 0.0 ), SHARD_EDGE_POW ) );
	vec3 col = uStone * uBall * ( SHARD_NIGHT + SHARD_FACE * face ) + uBall * SHARD_EDGE * edge;
	gl_FragColor = vec4( coreUnbalance( col * uLevel ), 1.0 );
}`;
