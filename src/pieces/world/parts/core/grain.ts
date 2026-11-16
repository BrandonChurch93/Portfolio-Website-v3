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

// The grain as it is seen close up: countless tiny facets, as the stream's shards are from far off. Space is cut
// into cells round scattered points, and the plane the grain lies in slices them, so every cell it shows is a
// polygon with straight sides. Each cell is cut again into a few facets by planes through its point, as a cut stone
// is, so its pieces run to points. Each facet has its own brightness and warmth, which turn over slowly. Nothing is
// drawn round them: where two meet, the two lights are blended over the width of a pixel and no more. w is that
// width in cells. Returns brightness and warmth, each about -1 to 1.
uvec3 coreHash( ivec3 c, uint seed ) { return corePcg( uvec3( c + 4096 ) + uvec3( seed, seed * 7u + 3u, seed * 13u + 5u ) ); }
vec3 coreUnit( uvec3 h ) { return vec3( h & 0xffffu ) / 65535.0; }
vec3 coreHigh( uvec3 h ) { return vec3( h >> 16u ) / 65535.0; }
// A facet is flat and tilted, so the light on it runs across it from one side to the other. Most facets are close
// to the light round them and a few catch it and are brighter: a facet is never much darker than the face.
vec2 coreLight( uvec3 h, int k, float t, vec3 d ) {
	uvec3 g = corePcg( h + uvec3( uint( k ) * 977u + 11u ) );
	vec3 r = coreUnit( g ), r2 = coreHigh( g ) * 2.0 - 1.0;
	float turn = sin( 6.2832 * ( r.y + t * ( 0.5 + r.z ) ) );
	float lit = FACET_LIFT * ( pow( r.x, FACET_SKEW ) - 1.0 / ( FACET_SKEW + 1.0 ) ) + FACET_TURN * turn + FACET_TILT * dot( r2, d );
	return vec2( lit, FACET_WARM * ( coreHigh( h ).y * 2.0 - 1.0 ) );
}
// Which facet of a cell a place is in, the light of that facet, and how far the place is from the facet's sides.
vec2 coreCut( vec3 d, uvec3 h, float t, float w ) {
	vec3 a[ FACET_CUTS ];
	for ( int k = 0; k < FACET_CUTS; k ++ ) {
		vec3 r = coreUnit( corePcg( h + uvec3( uint( k ) * 31u + 3u ) ) ) * 2.0 - 1.0;
		a[ k ] = r / max( length( r ), 1e-3 );
	}
	int best = 0, next = 1;
	float b0 = - 1e9, b1 = - 1e9;
	for ( int k = 0; k < FACET_CUTS; k ++ ) {
		float s = dot( a[ k ], d );
		if ( s > b0 ) { b1 = b0; next = best; b0 = s; best = k; } else if ( s > b1 ) { b1 = s; next = k; }
	}
	float side = ( b0 - b1 ) / max( length( a[ best ] - a[ next ] ), 1e-3 );
	return mix( coreLight( h, next, t, d ), coreLight( h, best, t, d ), 0.5 + 0.5 * smoothstep( 0.0, w, side ) );
}
vec2 coreFacets( vec3 p, float t, float w, uint seed ) {
	ivec3 base = ivec3( floor( p ) );
	float d0 = 1e9, d1 = 1e9;
	vec3 s0 = vec3( 0.0 ), s1 = vec3( 0.0 );
	ivec3 c0 = base, c1 = base;
	for ( int i = 0; i < 27; i ++ ) {
		ivec3 c = base + ivec3( i % 3 - 1, ( i / 3 ) % 3 - 1, i / 9 - 1 );
		vec3 s = vec3( c ) + 0.5 + ( coreUnit( coreHash( c, seed ) ) - 0.5 ) * FACET_JITTER;
		vec3 e = p - s;
		float d = dot( e, e );
		if ( d < d0 ) { d1 = d0; s1 = s0; c1 = c0; d0 = d; s0 = s; c0 = c; } else if ( d < d1 ) { d1 = d; s1 = s; c1 = c; }
	}
	// How far the place is from the side between its cell and the next: half the difference of the squares over the
	// distance between their points.
	float side = ( d1 - d0 ) / max( 2.0 * length( s1 - s0 ), 1e-3 );
	vec2 own = coreCut( p - s0, coreHash( c0, seed + 1u ), t, w ), near = coreCut( p - s1, coreHash( c1, seed + 1u ), t, w );
	return mix( near, own, 0.5 + 0.5 * smoothstep( 0.0, w, side ) );
}

${UNBALANCE}
`;
