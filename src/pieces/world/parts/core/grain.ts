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

// The core's grain, in GLSL: gradient noise worked out per pixel from a place in three dimensions, so nothing in it
// has a seam, a pole or an outline. Summed over a few sizes, each let go as it gets finer than a pixel, with what is
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
// The face close up: granules, as on the face of a star. Space is cut into cells round points that wander slowly,
// and the ball's surface slices them, so each granule is seen foreshortened toward the edge as the ball turns. Each
// is brightest at its heart and falls to a dark lane where it meets the next, and each has its own brightness. w is a
// pixel's width in cells, which the lane is never narrower than. Returns about -1 to 1.
float coreCells( vec3 p, float t, float w, uint seed ) {
	ivec3 base = ivec3( floor( p ) );
	float d0 = 1e9, d1 = 1e9, own = 0.0;
	vec3 s0 = vec3( 0.0 ), s1 = vec3( 0.0 );
	for ( int i = 0; i < 27; i ++ ) {
		ivec3 c = base + ivec3( i % 3 - 1, ( i / 3 ) % 3 - 1, i / 9 - 1 );
		uvec3 h = coreHash( c, seed );
		vec3 r = coreUnit( h ), r2 = coreHigh( h );
		vec3 s = vec3( c ) + 0.5 + ( r - 0.5 ) * GRAN_JITTER + GRAN_WANDER * sin( 6.2832 * ( r2 + t * ( 0.6 + 0.8 * r.zxy ) ) );
		vec3 e = p - s;
		float d = dot( e, e );
		if ( d < d0 ) { d1 = d0; s1 = s0; d0 = d; s0 = s; own = r2.x; } else if ( d < d1 ) { d1 = d; s1 = s; }
	}
	float side = ( d1 - d0 ) / max( 2.0 * length( s1 - s0 ), 1e-3 );
	float lane = smoothstep( 0.0, GRAN_LANE + w, side );
	float heart = 1.0 - smoothstep( 0.0, GRAN_HEART_R, sqrt( d0 ) );
	return GRAN_EACH * ( own * 2.0 - 1.0 ) + GRAN_HEART * ( heart - 0.3 ) + GRAN_DARK * ( lane - 0.75 );
}
// Granules of three sizes, each let go as it gets smaller than a few pixels.
float coreGranules( vec3 q, float t, float fp ) {
	float v = 0.0;
	for ( int i = 0; i < 3; i ++ ) {
		float cell = GRAN_CELL * pow( GRAN_STEP, float( i ) ), a = pow( GRAN_FALL, float( i ) );
		v += a * coreKeep( cell * 0.6, fp ) * coreCells( q / cell, t * ( 1.0 + 0.7 * float( i ) ), fp / cell, 307u + uint( i ) * 53u );
	}
	return v;
}

${UNBALANCE}
`;
