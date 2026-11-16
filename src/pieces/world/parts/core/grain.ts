export const UNBALANCE = /* glsl */ `
// The stage's chain balances darks and mid tones for a warm light (tone.ts, finish) after everything is drawn, so a
// pixel at the ball's edge, the band's orange at part cover over the dark, came out khaki. This is that balance
// undone on the light the ball adds to a pixel, so the band's own orange is what fades out at its edge.
vec3 coreUnbalance( vec3 c ) {
	float p = max( c.r, max( c.g, c.b ) ), k = 0.0;
	for ( int i = 0; i < 3; i ++ ) { k = 1.0 - smoothstep( 0.3, 0.85, p ); p = max( c.r / ( 1.0 - 0.04 * k ), c.g / ( 1.0 + 0.21 * k ) ); }
	return c / mix( vec3( 1.0 ), vec3( 0.96, 1.21, 1.59 ), k );
}
`;

// The core's grain, in GLSL: granules and gradient noise worked out per pixel from a place in three dimensions, so
// nothing in it has a seam, a pole or an outline. Summed over a few sizes, each let go as it gets finer than a pixel, with what is
// let go given back to the sizes that are kept, so the face is as busy at any size. And the stage's white balance
// undone, for a pixel the ball only partly covers.

export const GRAIN = /* glsl */ `
uvec3 corePcg( uvec3 v ) {
	v = v * 1664525u + 1013904223u;
	v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
	v ^= v >> 16u;
	v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
	return v;
}
// Cells are offset so that every index is positive before it is read as unsigned.
vec3 coreGrad( ivec3 c, uint seed ) {
	uvec3 a = corePcg( uvec3( c + 4096 ) + uvec3( seed, seed * 7u + 3u, seed * 13u + 5u ) );
	return vec3( a ) / 2147483648.0 - 1.0;
}
vec3 coreDir( vec3 v ) { return v / max( length( v ), 1e-4 ); }

// Gradient noise, about -1 to 1.
float coreNoise( vec3 p, uint seed ) {
	vec3 i = floor( p ), f = p - i, u = f * f * f * ( f * ( f * 6.0 - 15.0 ) + 10.0 );
	ivec3 c = ivec3( i );
	float a = dot( coreGrad( c, seed ), f );
	float b = dot( coreGrad( c + ivec3( 1, 0, 0 ), seed ), f - vec3( 1.0, 0.0, 0.0 ) );
	float d = dot( coreGrad( c + ivec3( 0, 1, 0 ), seed ), f - vec3( 0.0, 1.0, 0.0 ) );
	float e = dot( coreGrad( c + ivec3( 1, 1, 0 ), seed ), f - vec3( 1.0, 1.0, 0.0 ) );
	float g = dot( coreGrad( c + ivec3( 0, 0, 1 ), seed ), f - vec3( 0.0, 0.0, 1.0 ) );
	float h = dot( coreGrad( c + ivec3( 1, 0, 1 ), seed ), f - vec3( 1.0, 0.0, 1.0 ) );
	float k = dot( coreGrad( c + ivec3( 0, 1, 1 ), seed ), f - vec3( 0.0, 1.0, 1.0 ) );
	float l = dot( coreGrad( c + ivec3( 1, 1, 1 ), seed ), f - vec3( 1.0, 1.0, 1.0 ) );
	return mix( mix( mix( a, b, u.x ), mix( d, e, u.x ), u.y ), mix( mix( g, h, u.x ), mix( k, l, u.x ), u.y ), u.z );
}

// How much of a size of grain a pixel can show: all of it while a wavelength spans two pixels or more, none once it
// spans fewer than one and a quarter. Picture 9's grain is as fine as its pixels, so the finest size a pixel can
// hold is kept: held back further, the face went smooth at the page's size.
float coreKeep( float wave, float fp ) { return 1.0 - smoothstep( wave / 2.0, wave / 1.25, fp ); }

uvec3 coreHash( ivec3 c, uint seed ) { return corePcg( uvec3( c + 4096 ) + uvec3( seed, seed * 7u + 3u, seed * 13u + 5u ) ); }
vec3 coreUnit( uvec3 h ) { return vec3( h & 0xffffu ) / 65535.0; }
vec3 coreHigh( uvec3 h ) { return vec3( h >> 16u ) / 65535.0; }
// One size of the grain: granules, as cells round points that wander slowly, each with its own brightness and its own
// warmth, and nothing drawn between them: where two meet, the one gives way to the other across a pixel, so no
// outline and no lane is ever seen, only one granule beside another. The ball's surface slices them, so each is seen
// foreshortened toward the edge as the ball turns. w is a pixel's width in cells. Each granule is also a small facet
// tilted its own way, which the light finds: H is the way halfway between the eye and the light, L the way to the
// light. Its brightness and warmth, each about -1 to 1, how much the light it faces adds, about -1 to 1, and how
// squarely it mirrors the light, 0 to 1.
vec4 coreGranule( vec3 p, float t, float w, uint seed, vec3 H, vec3 L ) {
	ivec3 base = ivec3( floor( p - 0.5 ) );
	float d0 = 1e9, d1 = 1e9;
	vec4 v0 = vec4( 0.0 ), v1 = vec4( 0.0 );
	vec3 s0 = vec3( 0.0 ), s1 = vec3( 0.0 );
	for ( int i = 0; i < 8; i ++ ) {
		ivec3 c = base + ivec3( i & 1, ( i >> 1 ) & 1, i >> 2 );
		uvec3 h = coreHash( c, seed );
		vec3 r = coreUnit( h ), r2 = coreHigh( h );
		vec3 s = vec3( c ) + 0.5 + ( r - 0.5 ) * GRAIN_JITTER + GRAIN_WANDER * sin( 6.2832 * ( r2 + t * ( 0.6 + 0.8 * r.zxy ) ) );
		vec3 e = p - s;
		float d = dot( e, e );
		float a = 6.2832 * r2.z, k = FACET_TILT * sqrt( fract( r2.x * 13.73 + r.z * 7.31 ) );
		vec3 N = coreDir( vec3( k * cos( a ), k * sin( a ), 1.0 ) );
		float lit = ( dot( N, L ) - L.z ) / FACET_TILT;
		float m = max( dot( N, H ), 0.0 ), g = smoothstep( FACET_GLINT.x, FACET_GLINT.y, m );
		vec4 v = vec4( vec2( r2.x, r2.y ) * 2.0 - 1.0, lit, g );
		if ( d < d0 ) { d1 = d0; v1 = v0; s1 = s0; d0 = d; v0 = v; s0 = s; } else if ( d < d1 ) { d1 = d; v1 = v; s1 = s; }
	}
	float side = ( d1 - d0 ) / max( 2.0 * length( s1 - s0 ), 1e-3 );
	return mix( 0.5 * ( v0 + v1 ), v0, smoothstep( 0.0, max( w, 0.02 ), side ) );
}
// The grain at a place q, in units: granules of a few sizes, each finer one half the last, every size finer than
// a pixel let go and its share given back to the sizes kept, so the face is as busy at any size. Brightness and
// warmth, each about -1 to 1. Once the finer sizes show the coarser give way to them. The finer sizes are facets the light picks out, and the finest of them mirror it in
// small sharp points, which move as the light does.
vec2 coreSalt( vec3 q, float fp, float t, vec3 H, vec3 L ) {
	vec2 s = vec2( 0.0 );
	float kept = 0.0, all = 0.0, glint = 0.0;
	// Once the fine sizes can be seen, the coarse ones give way to them, or close up the face is blotches.
	float fine = coreKeep( GRAIN_CELL * 0.25 * GRAIN_SEEN, fp );
	for ( int i = 0; i < GRAIN_SIZES; i ++ ) {
		float cell = GRAIN_CELL * pow( 0.5, float( i ) ), a = pow( GRAIN_FALL, float( i ) ), k = coreKeep( cell * GRAIN_SEEN, fp );
		all += a * a;
		a *= 1.0 - GRAIN_COARSE * fine * max( 1.0 - float( i ) / 2.0, 0.0 );
		if ( k > 0.0 ) {
			vec4 g = coreGranule( q / cell + vec3( 0.0, t * GRAIN_CHURN * ( 1.0 + 0.5 * float( i ) ), 0.0 ), t * GRAIN_TURN, fp / cell, 7u + uint( i ) * 31u, H, L );
			float f = i >= FACET_FROM ? 1.0 : 0.0;
			s += a * k * mix( g.xy, vec2( g.z, g.y ), f * FACET_SHARE );
			glint = max( glint, k * g.w * ( i >= FACET_GLINT_FROM ? 1.0 : 0.0 ) );
		}
		kept += a * a * k * k;
	}
	s *= min( sqrt( all / max( kept, 1e-3 ) ), GRAIN_BACK );
	return vec2( s.x + FACET_GLINT.z * glint, s.y );
}
// The grain's light as shares of the light where it is, from its steps of brightness and of warmth.
uniform mat3 uTurn;
uniform vec3 uBright;
uniform vec3 uDim;
uniform vec3 uWarm;
uniform vec3 uGrainPale;
vec3 coreTint( float v, float w ) {
	return max( 1.0 + abs( v ) * ( v > 0.0 ? uBright : uDim ) + abs( w ) * ( w > 0.0 ? uWarm : uGrainPale ), vec3( 0.0 ) );
}

${UNBALANCE}
`;
