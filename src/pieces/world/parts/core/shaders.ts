import { GRAIN, UNBALANCE } from './grain';

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
	// Close up the grain is facets, once a facet spans a few pixels.
	float salty = smoothstep( 0.9, 0.45, fp ) * SALT;
	if ( salty > 0.0 ) {
		vec2 g = coreFacets( q / SALT_CELL, uTime * SALT_TWINKLE, fp / SALT_CELL, 211u );
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

// Alone, the neck's lower stretch draws in to a thread, as a drop about to fall. Once the stream has set off it
// fills out to its full width.
export const NECK_VERT = /* glsl */ `
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vView;
uniform vec3 uEye;
uniform float uFoot;
uniform float uRun;
uniform vec3 uThin;
void main() {
	float k = smoothstep( uThin.x, uThin.y, uFoot - position.y );
	vec3 p = position;
	p.xz *= mix( 1.0 - ( 1.0 - uThin.z ) * k, 1.0, uRun );
	vLocal = p;
	vNormal = normal;
	vView = uEye - p;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 );
}`;

// The neck: a column of the stream's light, brightest down its middle, pale gold there, falling off smoothly to gold
// and orange gold at its sides. It thins to a thread and fades out over its last stretch. Across it is read from the way the surface faces round the column, so the fillet
// into the ball is pale at its front as the column is.
export const NECK_FRAG = /* glsl */ `
precision highp float;
${UNBALANCE}
uniform float uNeckAt[ NECK_N ];
uniform vec3 uNeck[ NECK_N ];
uniform float uLevel;
uniform float uTime;
uniform float uFoot;
uniform vec4 uFade;
uniform float uRun;
uniform vec3 uEmber;
uniform vec3 uFlame;
uniform vec3 uHot;
uniform vec3 uPale;
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
	float fade = mix( 1.0 - smoothstep( uFade.x, uFade.y, dy ), 1.0 - smoothstep( uFade.z, uFade.w, dy ), uRun );
	// It fades as the stream's light does, down the stream's own ramp through hot gold, flame and ember to nothing,
	// and never through grey.
	float amount = fade * NECK_RAMP;
	vec3 ramp = uEmber * clamp( amount / 0.11, 0.0, 1.0 );
	ramp = mix( ramp, uFlame, smoothstep( 0.07, 0.42, amount ) );
	ramp = mix( ramp, uHot, smoothstep( 0.34, 0.85, amount ) );
	ramp = mix( ramp, uPale, smoothstep( 0.7, 1.6, amount ) );
	vec3 warm = mix( ramp * NECK_GLOW, col, smoothstep( NECK_KEEP, 1.0, fade ) );
	gl_FragColor = vec4( coreUnbalance( warm * uLevel * fade ), fade );
}`;

// The shards that turn round the core. Each goes round on its own tilted path at its own pace, turning over as it
// goes. Now and then one of them leaves its path: it is drawn down round the ball to its foot and into the neck,
// shrinking as it goes, and after a while it gathers again behind the ball. A cycle runs from the moment it is gone:
// hidden, then gathering, then on its path, then drawn down.
export const SHARD_VERT = /* glsl */ `
attribute vec3 aEdge;
attribute vec3 aB0;
attribute vec3 aB1;
attribute vec3 aB2;
attribute vec4 aPlane;
attribute vec4 aMove;
attribute vec4 aSpin;
attribute vec4 aLife;
uniform float uTime;
uniform float uR;
varying vec3 vP;
varying vec3 vN;
varying vec3 vObj;
varying vec3 vEdge;
varying vec3 vB0;
varying vec3 vB1;
varying vec3 vB2;
varying float vHeat;
vec3 coreSpin( vec3 v, vec3 k, float a ) { float c = cos( a ), s = sin( a ); return v * c + cross( k, v ) * s + k * dot( k, v ) * ( 1.0 - c ); }
void main() {
	vec3 n = aPlane.xyz, up = abs( n.y ) < 0.9 ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
	vec3 u = normalize( cross( n, up ) ), v = cross( n, u );
	float th = aMove.y + aMove.x * uTime;
	vec3 o = cos( th ) * u + sin( th ) * v, p = o * aPlane.w;
	float grow = 1.0;
	vHeat = 0.0;
	if ( aLife.x > 0.0 ) {
		float c = fract( ( uTime + aLife.y ) / aLife.x ) * aLife.x;
		grow = smoothstep( aLife.w, aLife.w + SHARD_GATHER, c );
		float s = clamp( ( c - ( aLife.x - SHARD_FALL ) ) / SHARD_FALL, 0.0, 1.0 );
		if ( s > 0.0 ) {
			// Round the ball to its foot, never through it and a little in front of it, and then down the front of
			// the neck, close to it, into it.
			float k = smoothstep( 0.0, 0.72, s ), sink = smoothstep( 0.58, 1.0, s ), dd = SHARD_SINK * sink * sink;
			vec3 d = mix( o, vec3( 0.0, - 0.97, 0.24 ), k );
			p = d / max( length( d ), 1e-4 ) * mix( aPlane.w, uR * SHARD_FOOT, k );
			p = mix( p, vec3( 0.0, - uR - dd, SHARD_NECK + SHARD_FLARE * exp( - dd / SHARD_FALLS ) ), sink );
			grow *= 1.0 - smoothstep( 0.7, 1.0, s );
			vHeat = smoothstep( 0.5, 0.85, s );
		}
	}
	float a = aSpin.w + aMove.z * uTime, size = aMove.w * grow;
	vObj = position;
	vP = p + coreSpin( position, aSpin.xyz, a ) * size;
	vN = coreSpin( normal, aSpin.xyz, a );
	vB0 = coreSpin( aB0, aSpin.xyz, a );
	vB1 = coreSpin( aB1, aSpin.xyz, a );
	vB2 = coreSpin( aB2, aSpin.xyz, a );
	vEdge = aEdge * size;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( vP, 1.0 );
}`;

// Shared by both kinds: the core as a shard sees it. It is a ball of light close by, so a face takes its light as
// from a ball and not a point, and a face mirrors it when what it mirrors falls inside the ball.
const SHARD_LIGHT = /* glsl */ `
${UNBALANCE}
uniform vec3 uEye;
uniform float uR;
uniform float uLevel;
uniform vec3 uBall;
uniform vec3 uRoom;
varying vec3 vP;
varying vec3 vN;
varying vec3 vObj;
varying vec3 vEdge;
varying vec3 vB0;
varying vec3 vB1;
varying vec3 vB2;
varying float vHeat;
// The light of the ball on a face looking N: its cosine, eased to nothing as the ball sets behind the face.
float coreOn( vec3 N, vec3 L, float s ) {
	float c = dot( N, L );
	return c >= s ? c : ( c <= - s ? 0.0 : ( c + s ) * ( c + s ) / max( 4.0 * s, 1e-5 ) );
}
// How much of what a face looking N mirrors to the eye is the ball, softened by how rough the face is.
float coreSeen( vec3 N, vec3 V, vec3 L, float s, float rough ) {
	float edge = sqrt( max( 1.0 - s * s, 0.0 ) );
	return smoothstep( edge - rough, edge + rough, dot( reflect( - V, N ), L ) );
}
// How close this place is to an edge of its face, as a hairline about a pixel wide, and the bevel of that edge.
float coreLine( out vec3 B ) {
	float e = min( vEdge.x, min( vEdge.y, vEdge.z ) ), w = max( fwidth( e ) * 1.3, 1e-4 );
	B = vEdge.x <= vEdge.y && vEdge.x <= vEdge.z ? vB0 : ( vEdge.y <= vEdge.z ? vB1 : vB2 );
	B /= max( length( B ), 1e-4 );
	return 1.0 - smoothstep( 0.35 * w, w, e );
}
float coreTip() { return pow( smoothstep( 0.68, 1.0, length( vObj ) ), 3.0 ); }
`;

// A solid shard: dark copper, a mirror a little rough, as the stream's are. A face turned to the eye mirrors the
// night and is dark, so a shard in front of the bright face shows dark against it, and a face turned aside mirrors
// the hollow's lit walls. A face that mirrors the
// ball flashes. Its edges catch the core where their bevels look toward it, as a thin lit line, and so do its
// points. All of it is an amount of light given the copper's color once, which keeps its hue as it brightens and
// only lets the heart of a flash go to the ball's own pale gold, as the stream's shards do.
export const SOLID_FRAG = /* glsl */ `
uniform vec3 uCopper;
uniform vec3 uCopperLight;
${SHARD_LIGHT}
void main() {
	vec3 N = normalize( vN ), V = normalize( uEye - vP ), B;
	if ( dot( N, V ) < 0.0 ) N = - N;
	float d = max( length( vP ), 1e-3 ), s = min( uR / d, 1.0 );
	vec3 L = - vP / d;
	float line = coreLine( B );
	float seen = coreSeen( N, V, L, s, SHARD_ROUGH ), graze = pow( 1.0 - max( dot( N, V ), 0.0 ), 3.0 );
	// What a face mirrors that is not the ball: the hollow's walls, lit by the core, or, for a face turned to the eye,
	// the night outside the hollow.
	float room = mix( SHARD_WALL, SHARD_ROOM, smoothstep( 0.2, 0.85, reflect( - V, N ).z ) );
	float light = room * ( 1.0 - seen ) * ( 0.7 + graze ) + SHARD_FLASH * seen + SHARD_DIFFUSE * coreOn( N, L, s );
	float rim = coreOn( B, L, s ) * line + coreTip() * coreOn( normalize( vObj ), L, s ) * 0.6;
	light = max( light, SHARD_EDGE * rim );
	// Drawn into the neck, it takes the stream's light and goes into it.
	light = mix( light, SHARD_HEAT, vHeat );
	vec3 col = mix( uCopper, uCopperLight, clamp( light - 0.6, 0.0, 1.0 ) * 0.4 ) * light;
	float mx = max( col.r, max( col.g, col.b ) );
	col *= ( 1.0 - exp( - mx * 1.15 ) ) / ( mx * 0.955 + 1e-5 );
	col = mix( col, uBall, clamp( ( light - 1.7 ) * 0.4, 0.0, 0.85 ) );
	gl_FragColor = vec4( coreUnbalance( col * uLevel ), 1.0 );
}`;

// A clear shard, drawn twice. The first time it takes from what is behind it: the bright face shows through it a
// little dimmed and warmed, most where the eye looks through it on a slant. The second time it gives the light it
// holds: the core's, most along its edges and at its points, and where a face mirrors the ball.
export const GLASS_FRAG = /* glsl */ `
uniform vec3 uHot;
uniform vec3 uTint;
uniform float uGive;
${SHARD_LIGHT}
void main() {
	vec3 N = normalize( vN ), V = normalize( uEye - vP ), B;
	float d = max( length( vP ), 1e-3 ), s = min( uR / d, 1.0 );
	vec3 L = - vP / d;
	float line = coreLine( B );
	float slant = 1.0 - abs( dot( N, V ) );
	if ( uGive < 0.5 ) {
		gl_FragColor = vec4( mix( vec3( 1.0 ), uTint, clamp( GLASS_DIM * ( 0.5 + slant ) + 0.6 * line, 0.0, 1.0 ) ), 1.0 );
		return;
	}
	float held = GLASS_HELD * ( 0.3 + slant * slant );
	float glint = coreSeen( N, V, L, s, SHARD_ROUGH ) * GLASS_GLINT;
	float edge = line * ( 0.3 + coreOn( B, L, s ) ) * GLASS_EDGE + coreTip() * 0.5 + vHeat * SHARD_HEAT;
	gl_FragColor = vec4( coreUnbalance( ( uHot * ( held + edge ) + uBall * glint ) * uLevel ), 1.0 );
}`;
