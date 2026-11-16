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
// pole or an outline. The surface is a fine speckle of points of light, each hottest at its middle with a soft edge,
// a few sizes, each let go as it grows finer than a pixel with what is let go given back to the sizes kept. Among
// them, facets: small flat crystal faces, deeper gold, which rock slowly and flash whole when a face turns to the
// light within. Under it all a deeper layer of hotter, larger, softer grains turning its own way (shaders.ts).

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
vec3 coreUnit( uvec3 h ) { return vec3( h & 0xffffu ) / 65535.0; }
vec3 coreHigh( uvec3 h ) { return vec3( h >> 16u ) / 65535.0; }
vec3 coreDir( vec3 v ) { return v / max( length( v ), 1e-4 ); }

// How much of a size of grain a pixel can show: all of it while a grain spans two pixels or more, none once it spans
// fewer than one and a quarter.
float coreKeep( float wave, float fp ) { return 1.0 - smoothstep( wave / 2.0, wave / 1.25, fp ); }

// One size of the speckle at p, in cells: the grain whose round edge is nearest, its brightness and warmth, each
// about -1 to 1, and how much of the pixel it covers. w is a pixel's width in cells, and dense how large the grains
// are against their cells. Each grain has its own size, so the speckle is never a grid and never a mosaic.
vec3 coreSpeck( vec3 p, float w, uint seed, float dense, out float warm ) {
	ivec3 base = ivec3( floor( p - 0.5 ) );
	float best = 1e9, v = 0.0, rad = 1.0;
	warm = 0.0;
	for ( int i = 0; i < 8; i ++ ) {
		ivec3 c = base + ivec3( i & 1, ( i >> 1 ) & 1, i >> 2 );
		uvec3 h = coreHash( c, seed );
		vec3 r = coreUnit( h ), r2 = coreHigh( h );
		float size = mix( SPECK_SIZE.x, SPECK_SIZE.y, r2.x ) * dense;
		float k = length( p - ( vec3( c ) + 0.5 + ( r - 0.5 ) * SPECK_JITTER ) ) - size;
		if ( k < best ) { best = k; v = r2.y; warm = r2.z * 2.0 - 1.0; rad = size; }
	}
	// Its edge is soft, as light's is, over a share of its radius.
	float cover = 1.0 - smoothstep( - SPECK_SOFT * rad - 0.5 * w, 0.5 * w, best );
	// A grain is a point of light and not a dot of paint: hottest at its middle and dimmer toward its edge, by as
	// much on average as it is brighter in the middle, so the face keeps its light. Let go as a pixel grows to it.
	float at = clamp( ( best + rad ) / max( rad, 1e-3 ), 0.0, 1.0 );
	float dome = 1.0 + SPECK_GLOW * ( 1.0 - smoothstep( 0.5, 1.5, w / max( rad, 1e-3 ) ) ) * ( 1.0 - 1.667 * at * at );
	// Most grains a little brighter than the ground and a few much brighter: the sparkle.
	return vec3( pow( v, SPECK_POW ) * dome, cover, 0.0 );
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

// The facets: a share of the grains are flat crystal faces, each a small polygon with its own tilt, which rocks
// slowly. Each is a little deeper than the ground until its face turns to the light within, and then the whole face
// flashes, as a solid shard of the stream does. At p in units, a pixel fp wide, a time t, and n the face's normal on
// the ball as seen. Returns how much of the pixel is a facet, how far it is lit across its face (-1 to 1), and how
// strongly it flashes (0 to 1).
vec3 coreFacets( vec3 p, float fp, float t, vec2 n ) {
	vec3 q = p / FACET_CELL;
	float w = fp / FACET_CELL;
	ivec3 base = ivec3( floor( q - 0.5 ) );
	vec3 best = vec3( 0.0 );
	for ( int i = 0; i < 8; i ++ ) {
		ivec3 c = base + ivec3( i & 1, ( i >> 1 ) & 1, i >> 2 );
		uvec3 h = coreHash( c, 401u ), h2 = coreHash( c, 409u );
		vec3 r = coreUnit( h ), r2 = coreHigh( h ), r3 = coreUnit( h2 ), r4 = coreHigh( h2 );
		if ( r3.z > FACET_SHARE ) continue;
		vec3 o = q - ( vec3( c ) + 0.5 + ( r - 0.5 ) * 0.7 );
		// Its outline: five edges at their own angles round it, so no two are the same polygon.
		float a0 = r2.x * 6.2832, edge = - 1e3;
		for ( int k = 0; k < 5; k ++ ) {
			float a = a0 + float( k ) * 1.2566 + ( r4[ k % 3 ] - 0.5 ) * 0.5;
			edge = max( edge, dot( o.xy, vec2( cos( a ), sin( a ) ) ) );
		}
		edge = max( edge, abs( o.z ) * 0.8 );
		float size = mix( FACET_SIZE.x, FACET_SIZE.y, r2.y );
		float cover = 1.0 - smoothstep( - 0.5 * w, 0.5 * w, edge - size );
		if ( cover <= best.x ) continue;
		// Its tilt, which rocks slowly on its own two beats, and how near the tilt and the ball's face as seen bring
		// it to the light within.
		vec2 tilt = FACET_TILT * ( r3.xy - 0.5 ) * 2.0 + FACET_ROCK * vec2( sin( t * mix( 0.25, 0.7, r4.x ) + 6.2832 * r4.y ), cos( t * mix( 0.2, 0.6, r4.z ) + 6.2832 * r2.z ) );
		vec2 face = tilt + FACET_BALL * n - FACET_TO;
		float flash = exp( - dot( face, face ) / ( FACET_SHARP * FACET_SHARP ) );
		float across = clamp( dot( o.xy, normalize( tilt + 1e-4 ) ) / max( size, 1e-3 ), - 1.0, 1.0 ) * min( length( tilt ) / FACET_TILT, 1.0 );
		best = vec3( cover, across, flash );
	}
	return best;
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
