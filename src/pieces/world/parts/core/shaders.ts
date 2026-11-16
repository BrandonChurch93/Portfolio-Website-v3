import { GRAIN } from './grain';

// The core's two shaders: the ball, and the neck it draws down into where the stream leaves it. Both give light of
// their own and are lit by nothing. They write linear light: the stage's last pass applies the tone curve, which
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
uniform float uR;
uniform float uTime;
uniform float uLevel;
uniform mat3 uTurn;
uniform float uRimAt[ RIM_N ];
uniform vec3 uRim[ RIM_N ];
uniform vec3 uBright;
uniform vec3 uDim;
uniform vec3 uWarm;
uniform vec3 uPale;
uniform float uNeckAt[ NECK_N ];
uniform vec3 uNeck[ NECK_N ];
uniform float uNeckR;
varying vec3 vLocal;
${GRAIN}

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
// The dip and the line are each a pixel or two wide on the page, so the band is read over the pixel's own width.
vec3 coreBand( float rr, float px ) {
	return ( coreRim( rr - 0.33 * px ) + coreRim( rr ) + coreRim( rr + 0.33 * px ) ) / 3.0;
}
vec3 coreNeck( float s ) {
	vec3 c = uNeck[ 0 ];
	for ( int i = 1; i < NECK_N; i ++ ) {
		float a = uNeckAt[ i - 1 ], b = uNeckAt[ i ];
		if ( s > a ) c = mix( uNeck[ i - 1 ], uNeck[ i ], clamp( ( s - a ) / max( b - a, 1e-4 ), 0.0, 1.0 ) );
	}
	return c;
}

// The fine grain at a place q, in units: grains of about one unit, with every size finer than the pixel let go and
// its share given back to the sizes kept.
float coreFine( vec3 q, float fp, float churn, uint seed ) {
	float s = 0.0, kept = 0.0, all = 0.0;
	for ( int i = 0; i < 3; i ++ ) {
		float wave = GRAIN_WAVE * pow( GRAIN_STEP, float( i ) ), a = pow( GRAIN_FALL, float( i ) ), k = coreKeep( wave, fp );
		vec3 at = q / wave + vec3( 0.0, churn * ( 1.0 + 0.6 * float( i ) ), 0.0 );
		s += a * k * coreNoise( at, seed + uint( i ) * 31u );
		kept += a * a * k * k;
		all += a * a;
	}
	return s * min( sqrt( all / max( kept, 1e-3 ) ), GRAIN_BACK );
}

void main() {
	vec3 ro = uEye, rd = coreDir( vLocal - uEye );
	float b = dot( ro, rd ), c = dot( ro, ro ) - b * b;
	// How far out from the ball's middle the ray passes, as a share of its radius: 1 at its edge.
	float rr = sqrt( max( c, 0.0 ) ) / uR;
	float px = max( fwidth( rr ), 1e-5 ), cover = clamp( ( 1.0 - rr ) / px + 0.5, 0.0, 1.0 );
	if ( cover <= 0.0 ) discard;
	float h = max( uR * uR - c, 0.0 );
	vec3 P = ro + rd * ( - b - sqrt( h ) );

	// The grain lies in the plane through the ball's middle that faces the eye, so it is as even at the edge as at
	// the middle: laid on the sphere it was squeezed toward the edge into streaks along the circle. It turns slowly
	// and churns in place.
	vec3 q = uTurn * ( ro - rd * b );
	float fp = max( max( length( dFdx( q ) ), length( dFdy( q ) ) ), 1e-4 );
	float churn = uTime * GRAIN_CHURN, drift = uTime * GRAIN_DRIFT;
	// Close up the middle sizes and the broad drift give way, so what is seen is the fine grain, crisp and even.
	float near = 1.0 - smoothstep( 0.45, 0.9, fp );
	float v = coreFine( q, fp, churn, 7u );
	v += GRAIN_MID * ( 1.0 - 0.75 * near ) * coreNoise( q / GRAIN_MIDWAVE + vec3( churn * 0.3 ), 41u ) * coreKeep( GRAIN_MIDWAVE, fp );
	v += MOTTLE * ( 1.0 - 0.6 * near ) * ( 0.65 * coreNoise( q / MOTTLE_WAVE + vec3( drift, 0.0, - drift ), 73u ) + 0.35 * coreNoise( q / ( 0.45 * MOTTLE_WAVE ) - vec3( 0.0, drift, 0.0 ), 79u ) );
	// Each grain's own warmth, apart from its brightness: some a little paler, some a little more gold.
	float w = coreNoise( q / GRAIN_WAVE + vec3( 0.0, - churn, 0.0 ), 101u ) * coreKeep( GRAIN_WAVE, fp );
	// Close up the grain is separate soft grains, once a grain spans a few pixels.
	float salty = smoothstep( 0.9, 0.45, fp ) * SALT;
	if ( salty > 0.0 ) {
		vec2 g = coreSalt( q / SALT_CELL, uTime * SALT_TWINKLE, 211u );
		v = mix( v, SALT_GAIN * g.x + SALT_UNDER * v, salty );
		w = mix( w, SALT_GAIN * ( g.y - SALT_WARMS * g.x ), salty );
	}

	// Quieter across the band, which picture 9 has smooth.
	float quiet = 1.0 - GRAIN_BAND * smoothstep( 0.84, 0.935, rr );
	v = clamp( GRAIN_GAIN * v * quiet, - 3.0, 3.0 );
	w = clamp( GRAIN_WARM * w * quiet, - 3.0, 3.0 );
	vec3 tint = 1.0 + abs( v ) * ( v > 0.0 ? uBright : uDim ) + abs( w ) * ( w > 0.0 ? uWarm : uPale );
	vec3 col = coreBand( rr, px ) * max( tint, vec3( 0.0 ) );

	// Where the neck leaves the ball's foot its light takes the place of the band's outer line, pale down its middle
	// and gold at its sides, rising into the ball from a little inside its edge with its sides flared out along the
	// rim, as a fillet is, so the column runs into the ball. The band's dip runs on across its top, fainter, as
	// picture 9's does.
	float xb = uNeckR + FOOT_FLARE * pow( max( 0.99 - rr, 0.0 ), 1.5 ), across = abs( P.x ) / xb;
	float foot = ( 1.0 - smoothstep( 0.85, 1.1, across ) ) * smoothstep( - 0.86 * uR, - 0.95 * uR, P.y ) * smoothstep( 0.935, 0.985, rr );
	col = mix( col, coreNeck( min( across, 1.0 ) ), foot );

	gl_FragColor = vec4( coreUnbalance( col * uLevel * cover ) / max( cover, 1e-3 ), cover );
}`;

export const NECK_VERT = /* glsl */ `
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vView;
uniform vec3 uEye;
void main() {
	vLocal = position;
	vNormal = normal;
	vView = uEye - position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

// The neck: a column of the stream's light, brightest down its middle, pale gold there, falling off smoothly to gold
// and orange gold at its sides. Over its last stretch it takes the light of the line drawn below it, flat across, so
// where the two meet nothing steps. Across it is read from the way the surface faces round the column, so the fillet
// into the ball is pale at its front as the column is.
export const NECK_FRAG = /* glsl */ `
precision highp float;
uniform float uNeckAt[ NECK_N ];
uniform vec3 uNeck[ NECK_N ];
uniform vec3 uLine;
uniform float uLevel;
uniform float uTime;
uniform float uFoot;
uniform vec2 uPlain;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vView;
vec3 coreNeck( float s ) {
	vec3 c = uNeck[ 0 ];
	for ( int i = 1; i < NECK_N; i ++ ) {
		float a = uNeckAt[ i - 1 ], b = uNeckAt[ i ];
		if ( s > a ) c = mix( uNeck[ i - 1 ], uNeck[ i ], clamp( ( s - a ) / max( b - a, 1e-4 ), 0.0, 1.0 ) );
	}
	return c;
}
void main() {
	vec2 n = vNormal.xz, e = vView.xz;
	float fh = abs( dot( n, e ) ) / max( length( n ) * length( e ), 1e-4 );
	// Where the place is across the column as it is seen: 0 down its middle, 1 at its sides.
	float s = sqrt( max( 1.0 - fh * fh, 0.0 ) );
	float dy = uFoot - vLocal.y;
	vec3 col = coreNeck( s );
	// Faint streaks along it, carried down slowly, as the stream is.
	float a = atan( vLocal.x, vLocal.z ), y = vLocal.y + uTime * 6.0;
	float streak = sin( a * 5.0 + 0.06 * y + 1.3 * sin( y * 0.031 ) ) * sin( a * 11.0 - 0.045 * y + 2.0 );
	col *= 1.0 + 0.03 * streak * ( 1.0 - s );
	gl_FragColor = vec4( mix( col, uLine, smoothstep( uPlain.x, uPlain.y, dy ) ) * uLevel, 1.0 );
}`;
