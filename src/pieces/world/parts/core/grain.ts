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

// The core's grain, in GLSL, worked out per pixel from a place in three dimensions, so nothing in it has a seam, a
// pole or an outline. Two layers. The surface is a fine, sharp speckle, as picture 9's is: small round grains of
// differing brightness on a slightly dimmer ground, a few sizes, each let go as it grows finer than a pixel with what
// is let go given back to the sizes kept. Under it, the hotter body: slow convection, broad cells that well up and
// sink, seen through the surface, which gather the grains where they well up. The two are drawn apart by how much of
// the surface a ray crosses, so the body shows most in the middle and the cooler surface toward the rim.

export const GRAIN = /* glsl */ `
uvec3 corePcg( uvec3 v ) {
	v = v * 1664525u + 1013904223u;
	v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
	v ^= v >> 16u;
	v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
	return v;
}
// Cells are offset so that every index is positive before it is read as unsigned.
uvec3 coreHash( ivec3 c, uint seed ) { return corePcg( uvec3( c + 4096 ) + uvec3( seed, seed * 7u + 3u, seed * 13u + 5u ) ); }
vec3 coreGrad( ivec3 c, uint seed ) { return vec3( coreHash( c, seed ) ) / 2147483648.0 - 1.0; }
vec3 coreUnit( uvec3 h ) { return vec3( h & 0xffffu ) / 65535.0; }
vec3 coreHigh( uvec3 h ) { return vec3( h >> 16u ) / 65535.0; }
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

// How much of a size of grain a pixel can show: all of it while a grain spans two pixels or more, none once it spans
// fewer than one and a quarter.
float coreKeep( float wave, float fp ) { return 1.0 - smoothstep( wave / 2.0, wave / 1.25, fp ); }

// One size of the speckle at p, in cells: the grain whose round edge is nearest, its brightness and warmth, each
// about -1 to 1, and how much of the pixel it covers. w is a pixel's width in cells, and dense how large the grains
// are against their cells. Each grain has its own size, so the speckle is never a grid and never a mosaic.
vec3 coreSpeck( vec3 p, float w, uint seed, float dense, out float warm ) {
	ivec3 base = ivec3( floor( p - 0.5 ) );
	float best = 1e9, v = 0.0;
	warm = 0.0;
	for ( int i = 0; i < 8; i ++ ) {
		ivec3 c = base + ivec3( i & 1, ( i >> 1 ) & 1, i >> 2 );
		uvec3 h = coreHash( c, seed );
		vec3 r = coreUnit( h ), r2 = coreHigh( h );
		float k = length( p - ( vec3( c ) + 0.5 + ( r - 0.5 ) * SPECK_JITTER ) ) - mix( SPECK_SIZE.x, SPECK_SIZE.y, r2.x ) * dense;
		if ( k < best ) { best = k; v = r2.y; warm = r2.z * 2.0 - 1.0; }
	}
	float cover = 1.0 - smoothstep( - 0.5 * w, 0.5 * w, best );
	// Most grains a little brighter than the ground and a few much brighter: the sparkle.
	return vec3( pow( v, SPECK_POW ), cover, 0.0 );
}

// The speckle at a place q, in units, of a few sizes, each half the last. Brightness and warmth, about -1 to 1, with
// the ground at 0 brightness on average.
vec2 coreSalt( vec3 q, float fp, float t, float dense ) {
	vec2 s = vec2( 0.0 );
	float kept = 0.0, all = 0.0;
	for ( int i = 0; i < GRAIN_SIZES; i ++ ) {
		float cell = GRAIN_CELL * pow( 0.5, float( i ) ), a = pow( GRAIN_FALL, float( i ) ), k = coreKeep( cell * GRAIN_SEEN, fp );
		all += a * a;
		if ( k > 0.0 ) {
			float warm;
			vec3 g = coreSpeck( q / cell + vec3( 0.0, t * GRAIN_CHURN, 0.0 ), fp / cell, 7u + uint( i ) * 31u, dense, warm );
			// A grain over the ground, less the speckle's own mean, so the face keeps its light at any size.
			float lit = g.y * ( SPECK_GROUND + g.x ) - SPECK_MEAN;
			s += a * k * vec2( lit, warm * g.y );
		}
		kept += a * a * k * k;
	}
	return s * min( sqrt( all / max( kept, 1e-3 ) ), GRAIN_BACK );
}

// The body's convection, about -1 to 1: broad cells that well up and sink, slowly stirred, changing as they go.
float coreConvect( vec3 q, float t ) {
	vec3 p = q / CONV_WAVE;
	vec3 stir = vec3( coreNoise( 0.55 * p + vec3( 0.0, 0.0, t * CONV_STIR ), 91u ), coreNoise( 0.55 * p + vec3( 5.2, 1.3, t * CONV_STIR ), 92u ), coreNoise( 0.55 * p + vec3( 2.7, 7.1, t * CONV_STIR ), 95u ) );
	p += CONV_WARP * stir + vec3( 0.0, 0.0, t * CONV_RATE );
	float c = 0.7 * coreNoise( p, 93u ) + 0.3 * coreNoise( 2.03 * p + vec3( 3.1, 0.0, t * CONV_RATE ), 94u );
	return clamp( 1.8 * c, - 1.0, 1.0 );
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
