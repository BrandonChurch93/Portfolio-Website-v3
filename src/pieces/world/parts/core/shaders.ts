import { GRAIN } from './grain';
import { ROOT_LIGHT } from './root';

// The core's shader: the ball. It gives light of its own and is lit by nothing. It writes linear light: the stage's
// last pass applies the tone curve, which takes what is too bright to pale gold, so every color here was worked back
// through that curve from picture 9's.

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
uniform vec2 uLamp;
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
	// Read mostly as on a disc facing the eye, as picture 9's face is grained right out to its band: on the sphere the
	// grain is squeezed toward the limb finer than a pixel and the outer face goes smooth.
	vec3 q = uTurn * vec3( P.xy, P.z * ( 1.0 - GRAIN_FLAT ) );
	float fp = max( max( length( dFdx( q ) ), length( dFdy( q ) ) ), 1e-4 );
	vec3 qn = uTurn * vec3( Q.xy, 0.0 );
	float fn = max( max( length( dFdx( qn ) ), length( dFdy( qn ) ) ), 1e-4 );
	// The cursor's light, as a lamp a little in front of the ball: the way to it from here, and halfway to the eye, in the
	// frame the grain turns in, so the facets it picks out stay put on the ball as it turns.
	vec3 Lw = coreDir( vec3( uLamp - P.xy / uR, FACET_LAMP ) );
	vec3 L = uTurn * Lw, H = uTurn * coreDir( Lw + vec3( 0.0, 0.0, 1.0 ) );
	vec2 g = coreSalt( q, fp, uTime, H, L );
	if ( foot > 0.0 ) g = mix( g, coreSalt( qn, fn, uTime, H, L ), foot );
	float drift = uTime * GRAIN_DRIFT;
	float v = g.x + MOTTLE * ( 0.65 * coreNoise( q / MOTTLE_WAVE + vec3( drift, 0.0, - drift ), 73u ) + 0.35 * coreNoise( q / ( 0.45 * MOTTLE_WAVE ) - vec3( 0.0, drift, 0.0 ), 79u ) );
	float w = g.y;

	// Quieter across the band, which picture 9 has smooth, and gone where the beam's light begins.
	float into = coreInto( rb, - uR - Q.y );
	// And gone over the foot where the neck below, which has none, takes over from the ball, or the two meet in a step.
	float under = smoothstep( - NECK_FOOT_FADE, 0.0, - uR - Q.y ) * smoothstep( wm + 2.0, wm - 2.0, abs( Q.x ) );
	float quiet = ( 1.0 - GRAIN_BAND * smoothstep( 0.92, 0.965, rb ) ) * ( 1.0 - into ) * ( 1.0 - under );
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
