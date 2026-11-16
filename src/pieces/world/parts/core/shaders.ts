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
uniform mat3 uDeep;
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

	// Once the stream runs, the ball and the neck are one shape: near the foot the band is read across that shape's
	// edge, so it opens under the neck and runs on down its sides.
	float on = uRootState.x, rrU = rr;
	if ( on > 0.001 && d > - NECK_TOP ) rrU = mix( rr, min( neckRim( Q.x, d, on ), rr ), smoothstep( - NECK_TOP, - 0.5 * NECK_TOP, d ) );

	// The grain lies on the ball and turns with it, slowly, as something enormous turns.
	vec3 q = uTurn * vec3( P.xy, P.z * ( 1.0 - GRAIN_FLAT ) );
	float fp = max( max( length( dFdx( q ) ), length( dFdy( q ) ) ), 1e-4 );
	vec2 g = coreGrainSteps( q, fp );
	// Quieter across the band, which picture 9 has smooth.
	float quiet = 1.0 - GRAIN_BAND * smoothstep( 0.92, 0.965, rrU );
	float v = g.x * quiet, w = g.y * quiet;
	vec3 col = coreBand( rrU, bandPx ) * coreTint( v, w );
	// Under the fizz a soft mottle a few grains across, lighter and darker, which turns with the surface and
	// churns slowly: picture 9's face is clouded at that size, and a fizz on a flat ground reads as printed.
	col *= 1.0 + MOTTLE.y * quiet * coreLump( q / MOTTLE.x + vec3( 0.0, 0.0, uTime * MOTTLE.z ), 517u );
	col *= 1.0 + BAND_LIFT * ( 1.0 - smoothstep( 0.6, 0.95, px * uR ) ) * smoothstep( BAND_AT.x, BAND_AT.y, rrU ) * ( 1.0 - smoothstep( BAND_AT.z, BAND_AT.w, rrU ) );

	// Depth: the hotter body is seen through the cooler surface, through more of it the further out a ray meets the
	// ball, so the middle is the body's. Measured against the middle, so the ball's light there is the picture's.
	float mu = sqrt( max( 1.0 - rr * rr, 0.0 ) ), T = exp( - DEPTH_TAU / max( mu, 0.05 ) ), T0 = exp( - DEPTH_TAU );
	vec3 depth = mix( DEPTH_SKIN, DEPTH_BODY, T ) / mix( DEPTH_SKIN, DEPTH_BODY, T0 );
	// A slow drift of broad light across the face, larger than any grain and moving all the time, so the ball is
	// alive at the page's size. Seen through the surface as the body is, so it is strongest in the middle. It only
	// ever adds light, as clouds of it over a ground a little under the face's mean: taken away too, it laid grey
	// stains on the face.
	float dr = smoothstep( DRIFT_ON.x, DRIFT_ON.y, coreDrift( uDeep * P, uTime ) ) * mix( 0.5, 1.0, T / T0 );
	depth *= ( 1.0 + DRIFT_LIGHT * dr * DRIFT_TINT ) / ( 1.0 + DRIFT_LIGHT * DRIFT_ON.z );
	col *= mix( depth, vec3( 1.0 ), smoothstep( LIMB_TO.x, LIMB_TO.y, rrU ) );
	vec2 hp = P.xy / uR - HOT_AT;
	col *= coreFall( rrU ) * mix( 1.0 + HOT * exp( - dot( hp, hp ) / ( HOT_R * HOT_R ) ), 1.0, smoothstep( LIMB_TO.x, LIMB_TO.y, rrU ) );

	// The facets among the grains: crystal faces that show only when a face turns to the light within, and then
	// flash whole, brighter and paler than the face round them. At rest they are the face's own light: darker than
	// it, they read as dirt.
	vec3 fc = coreFacets( q, fp, uTime, P.xy / uR );
	float fq = fc.x * quiet * ( 1.0 - smoothstep( 0.4, 1.0, fp / FACET_CELL ) );
	vec3 flash = max( min( col * FACET_FLASH, CAP ), col );
	col = mix( col, flash, fq * fc.z * ( 1.0 + FACET_SIDE * fc.y ) );

	// Before the stream sets off, the grain over the foot runs hot and draws down to it in a narrowing seam, swelling
	// and easing on two slow waves. Only the grains change, so it is the face's own matter gathering and never a spot.
	// The band runs on unbroken under it.
	float bead = coreBead();
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
	// Over the foot the neck's own matter takes over, flowing out, so the ball and the neck are one thing.
	if ( on > 0.001 && d > - NECK_JOIN.x ) {
		vec4 n = neckLight( Q.x, d, max( length( vec2( dFdx( Q.x ), dFdy( Q.x ) ) ), 1e-3 ) );
		// Only near the ball's own outline: the plane is behind the face it is read through, so further in, light from
		// under the foot showed through the face as a pale wedge.
		float edge = 1.0 - smoothstep( NECK_JOIN.z, NECK_JOIN.w, ( 1.0 - rr ) * uR );
		col = mix( col, n.rgb * uLevel + col * ( 1.0 - n.a ), smoothstep( - NECK_JOIN.x, - NECK_JOIN.y, d ) * edge );
	}
	gl_FragColor = vec4( coreUnbalance( col * cover ) / max( cover, 1e-3 ), cover );
}`;
