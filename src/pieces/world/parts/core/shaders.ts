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
// Before the stream sets off, how far the light gathering at the foot has swelled, 0 to 1: it swells, holds, and draws
// back, slowly and never twice alike, as two slow waves that do not keep time with each other.
float coreBead() {
	float w = 0.62 * sin( uTime * 6.2832 / BEAD_BEAT.x ) + 0.38 * sin( uTime * 6.2832 / BEAD_BEAT.y + 1.9 );
	return smoothstep( - 0.7, 0.85, w );
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
	// The place on the plane through the ball's middle that the neck below is drawn on, so the two are one shape.
	vec3 Q = ro + rd * ( - ro.z / ( abs( rd.z ) > 1e-4 ? rd.z : - 1e-4 ) );
	float d = - uR - Q.y;

	// The grain lies on the ball and turns with it, slowly, as something enormous turns. It churns in place as it goes.
	vec3 q = uTurn * vec3( P.xy, P.z * ( 1.0 - GRAIN_FLAT ) );
	float fp = max( max( length( dFdx( q ) ), length( dFdy( q ) ) ), 1e-4 );
	// The cursor's light, as a lamp a little in front of the ball: the way to it from here, and halfway to the eye, in the
	// frame the grain turns in, so the facets it picks out stay put on the ball as it turns.
	vec3 Lw = coreDir( vec3( uLamp - P.xy / uR, FACET_LAMP ) + FACET_KEY );
	vec3 L = uTurn * Lw, H = uTurn * coreDir( Lw + vec3( 0.0, 0.0, 1.0 ) );
	vec2 g = coreSalt( q, fp, uTime, H, L );
	float drift = uTime * GRAIN_DRIFT;
	float v = g.x + MOTTLE * ( 0.65 * coreNoise( q / MOTTLE_WAVE + vec3( drift, 0.0, - drift ), 73u ) + 0.35 * coreNoise( q / ( 0.45 * MOTTLE_WAVE ) - vec3( 0.0, drift, 0.0 ), 79u ) );
	float w = g.y;
	// Quieter across the band, which picture 9 has smooth.
	float quiet = 1.0 - GRAIN_BAND * smoothstep( 0.92, 0.965, rr );
	v = clamp( GRAIN_GAIN * v * quiet, - 3.0, 3.0 );
	w = clamp( GRAIN_WARM * w * quiet, - 3.0, 3.0 );
	vec3 col = coreBand( rr, bandPx ) * coreTint( v, w );
	col *= 1.0 + BAND_LIFT * ( 1.0 - smoothstep( 0.6, 0.95, px * uR ) ) * smoothstep( BAND_AT.x, BAND_AT.y, rr ) * ( 1.0 - smoothstep( BAND_AT.z, BAND_AT.w, rr ) );
	// A sphere and not a disc: its light falls smoothly from a hot region a little up and to the left, toward the eye's
	// side of it, out to the limb over the outer third, and there gives way to the band.
	vec2 hp = P.xy / uR - HOT_AT;
	col *= coreFall( rr ) * mix( 1.0 + HOT * exp( - dot( hp, hp ) / ( HOT_R * HOT_R ) ), 1.0, smoothstep( LIMB_TO.x, LIMB_TO.y, rr ) );

	// Before the stream sets off, light gathers inside the face over the foot: a bead that swells and draws down
	// slowly, inside the band, which runs on unbroken under it.
	float on = uRootState.x, bead = coreBead();
	// It narrows toward the foot, where it is drawn to, and keeps the face's grain, so it is the face's own light
	// gathering and never a spot.
	float lift = Q.y + uR, mid = uR * ( 1.0 - mix( BEAD_AT.x, BEAD_AT.y, bead ) );
	float span = BEAD_SIZE.x * mix( 0.75, 1.0, bead ) * clamp( lift / ( mid + BEAD_SIZE.y ), 0.3, 1.0 );
	vec2 bp = vec2( Q.x / span, ( lift - mid ) / ( BEAD_SIZE.y * mix( 0.75, 1.0, bead ) ) );
	float gathered = ( 1.0 - on ) * BEAD_LIGHT * mix( 0.35, 1.0, bead ) * exp( - dot( bp, bp ) ) * ( 1.0 - smoothstep( 0.86, 0.93, rr ) );
	col = mix( col, uPale * BEAD_PALE * coreTint( 0.6 * v, w ), clamp( gathered, 0.0, 1.0 ) );
	// Nothing brighter than pale gold once the stage's curve has had it, the glints above all.
	col *= uLevel;
	col *= min( 1.0, min( CAP.y / max( col.g, 1e-4 ), CAP.z / max( col.b, 1e-4 ) ) );
	// Once it runs, the beam's light rises a little way into the ball over the foot, and where it is brighter than the
	// face and the band it takes their place, so the band fades away under its shoulders.
	if ( on > 0.001 && d > - NECK_UP ) {
		// Under its shoulders the band gives way to the face's own light, and the beam's pale heart rises into it.
		float up = smoothstep( - NECK_UP, 0.0, d ), u = neckAcross( Q.x, d, neckReach(), on );
		vec3 face = min( coreRim( LIMB_TO.x ) * coreFall( LIMB_TO.x ) * coreTint( v, w ) * uLevel, CAP );
		col = mix( col, face, exp( - NECK_K * u * u ) * up * on );
		float a = rootAmount( Q.x, d ) * up;
		col = mix( col, rootColor( a ).rgb * uLevel, smoothstep( NECK_OVER.x, NECK_OVER.y, a ) );
	}
	gl_FragColor = vec4( coreUnbalance( col * cover ) / max( cover, 1e-3 ), cover );
}`;
