import { GRAIN } from './grain';
import { ROOT_LIGHT } from './root';

// The core's shader: the ball. It gives light of its own and is lit by nothing, the cursor included. It writes linear
// light: the stage's last pass applies the tone curve, which takes what is too bright to pale gold, so every color
// here was worked back through that curve from picture 9's.

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
	// How far out from the ball's middle the ray passes, as a share of its radius: 1 at its edge. Read in the ray's
	// own terms and not from the shell's derivatives, so the edge is as smooth where the shell's triangles meet.
	float rr = sqrt( max( c, 0.0 ) ) / uR;
	float px = max( length( vec2( dFdx( rr ), dFdy( rr ) ) ), 1e-5 ), cover = clamp( ( 1.0 - rr ) / ( 1.3 * px ) + 0.5, 0.0, 1.0 );
	// The band is read over at least the width a pixel has at the page's size on a plain screen, so a sharper screen
	// shows it as the picture has it and no darker.
	float bandPx = max( px, BAND_PX / uR );
	if ( cover <= 0.0 ) discard;
	float h = max( uR * uR - c, 0.0 );
	vec3 P = ro + rd * ( - b - sqrt( h ) );
	// The place on the plane through the ball's middle that the neck below is drawn on, so the two are one shape.
	vec3 Q = ro + rd * ( - ro.z / ( abs( rd.z ) > 1e-4 ? rd.z : - 1e-4 ) );
	float d = - uR - Q.y;

	// The grain lies on the ball and turns with it, slowly, as something enormous turns.
	vec3 q = uTurn * vec3( P.xy, P.z * ( 1.0 - GRAIN_FLAT ) );
	float fp = max( max( length( dFdx( q ) ), length( dFdy( q ) ) ), 1e-4 );
	// The body under the surface wells up and sinks, and the grains crowd where it wells up.
	float conv = coreConvect( q, uTime );
	vec2 g = coreSalt( q, fp, uTime, 1.0 + CONV_DENSE * conv );
	// Quieter across the band, which picture 9 has smooth.
	float quiet = 1.0 - GRAIN_BAND * smoothstep( 0.92, 0.965, rr );
	// Drawn about a unit to a pixel, as on the page, the grain is turned up to make up for the fine sizes a pixel cannot hold.
	float v = clamp( GRAIN_GAIN * ( 1.0 + GRAIN_FAR * smoothstep( 0.4, 1.0, fp ) ) * g.x * quiet, - 3.0, 3.0 ), w = clamp( GRAIN_WARM * g.y * quiet, - 3.0, 3.0 );
	vec3 col = coreBand( rr, bandPx ) * coreTint( v, w );
	col *= 1.0 + BAND_LIFT * ( 1.0 - smoothstep( 0.6, 0.95, px * uR ) ) * smoothstep( BAND_AT.x, BAND_AT.y, rr ) * ( 1.0 - smoothstep( BAND_AT.z, BAND_AT.w, rr ) );

	// Depth: the hotter body is seen through the cooler surface, through more of it the further out a ray meets the
	// ball, so the middle is the body's, paler and stirring, and toward the rim the surface's deeper gold. Measured
	// against the middle, so the ball's light there is the picture's.
	float mu = sqrt( max( 1.0 - rr * rr, 0.0 ) ), T = exp( - DEPTH_TAU / max( mu, 0.05 ) ), T0 = exp( - DEPTH_TAU );
	vec3 body = DEPTH_BODY * ( 1.0 + CONV_LIGHT * conv * vec3( 0.9, 1.0, 1.15 ) );
	vec3 depth = mix( DEPTH_SKIN, body, T ) / mix( DEPTH_SKIN, DEPTH_BODY, T0 );
	col *= mix( depth, vec3( 1.0 ), smoothstep( LIMB_TO.x, LIMB_TO.y, rr ) );
	vec2 hp = P.xy / uR - HOT_AT;
	col *= coreFall( rr ) * mix( 1.0 + HOT * exp( - dot( hp, hp ) / ( HOT_R * HOT_R ) ), 1.0, smoothstep( LIMB_TO.x, LIMB_TO.y, rr ) );

	// Before the stream sets off, the grain over the foot runs hot and draws down to it in a narrowing seam, swelling
	// and easing on two slow waves. Only the grains change, so it is the face's own matter gathering and never a spot.
	// The band runs on unbroken under it.
	float on = uRootState.x, bead = coreBead();
	float lift = Q.y + uR, tall = BEAD_SIZE.y * mix( 0.7, 1.0, bead );
	float span = 0.5 + BEAD_SIZE.x * pow( clamp( lift / tall, 0.0, 1.0 ), 1.3 );
	float seam = ( 1.0 - on ) * ( 1.0 - smoothstep( 0.45, 1.0, abs( Q.x ) / span ) ) * ( 1.0 - smoothstep( 0.4, 1.0, lift / tall ) ) * ( 1.0 - smoothstep( 0.975, 0.995, rr ) );
	if ( seam > 0.001 ) {
		// The seam's own grains, flowing down toward the foot.
		float wv, wv2;
		vec3 sg = coreSpeck( vec3( Q.x, lift + uTime * BEAD_FLOW, 0.37 * Q.x ) / BEAD_CELL, fp / BEAD_CELL, 211u, 1.15, wv );
		vec3 sg2 = coreSpeck( vec3( Q.x, lift + uTime * BEAD_FLOW * 1.6, 3.1 ) / ( 0.5 * BEAD_CELL ), fp / ( 0.5 * BEAD_CELL ), 223u, 1.1, wv2 );
		float hot = max( sg.y * ( 0.35 + sg.x ), 0.8 * sg2.y * ( 0.3 + sg2.x ) );
		float k = seam * BEAD_LIGHT * mix( 1.0, 0.35, clamp( lift / tall, 0.0, 1.0 ) ) * mix( 0.45, 1.0, bead ) * mix( 1.0, 0.6, smoothstep( 0.1, 0.6, fp / BEAD_CELL ) );
		col = mix( col, BEAD_HOT * ( 0.8 + 0.5 * hot ), clamp( k * hot, 0.0, 1.0 ) );
	}
	col *= uLevel;
	// Nothing brighter than pale gold once the stage's curve has had it, the brightest grains above all.
	col *= min( 1.0, min( CAP.x / max( col.r, 1e-4 ), min( CAP.y / max( col.g, 1e-4 ), CAP.z / max( col.b, 1e-4 ) ) ) );
	// Once it runs, under the beam's shoulders the band gives way to the face's own light, so the beam leaves the ball
	// in one shape. The beam itself begins at the outline.
	if ( on > 0.001 && d > - NECK_UP ) {
		float up = smoothstep( - NECK_UP, 0.0, d ), u = neckAcross( Q.x, d, neckReach(), on );
		vec3 face = min( coreRim( LIMB_TO.x ) * coreFall( LIMB_TO.x ) * depth * coreTint( v, w ) * uLevel, CAP );
		col = mix( col, face, exp( - NECK_K * u * u ) * up * on );
		float a = rootAmount( Q.x, d ) * up;
		col = mix( col, rootColor( a ).rgb * uLevel, smoothstep( NECK_OVER.x, NECK_OVER.y, a ) );
	}
	gl_FragColor = vec4( coreUnbalance( col * cover ) / max( cover, 1e-3 ), cover );
}`;
