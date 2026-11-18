import { ROCKET, SCALE, STONE } from '../../layout';
import { MOTION } from './look';

// The shader of what broke away round the pad, laid into a standard material. Every piece is drawn from its model
// where the table of pieces (a texture written once) puts it, and moved by the clock and the launch alone: nothing
// is written after the part is made. Its light is its own, worked out from what the pad is doing: the lit stone
// under it, the engine's fire, and the cursor's light with its shadow. The stone is the planet's: a red brown body,
// knapped faces broken into small flat breaks, a fine grain, paler fresh stone on its broken edges and a dark in
// its creases.

const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);
const M = MOTION, B = MOTION.blast;

export const VERT_PARS = /* glsl */ `
uniform highp sampler2D uPieces;
uniform float uTime;
uniform float uLaunch;
attribute float aPiece;
attribute vec4 aLight;
varying vec3 vP;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec4 vTurn;
varying vec4 vInfo;
varying float vOpen;
const float TAU = 6.2831853;
float dbHash1( float n ) { return fract( sin( n * 12.9898 + 4.1414 ) * 43758.5453 ); }
vec3 dbTurn( vec4 q, vec3 v ) { return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v ); }
vec4 dbJoin( vec4 a, vec4 b ) { return vec4( a.w * b.xyz + b.w * a.xyz + cross( a.xyz, b.xyz ), a.w * b.w - dot( a.xyz, b.xyz ) ); }`;

export const VERT_MOTION = /* glsl */ `
	int dbId = int( aPiece + 0.5 );
	vec4 dbA = texelFetch( uPieces, ivec2( dbId, 0 ), 0 );
	vec4 dbQ = texelFetch( uPieces, ivec2( dbId, 1 ), 0 );
	vec4 dbX = texelFetch( uPieces, ivec2( dbId, 2 ), 0 );
	vec4 dbC = texelFetch( uPieces, ivec2( dbId, 3 ), 0 );
	vec4 dbK = texelFetch( uPieces, ivec2( dbId, 4 ), 0 );
	float t = uTime, kind = dbK.x, seed = dbK.y, cl = dbC.x;
	bool great = kind > 1.5;
	// The cluster drifts as one, each at a pace of its own.
	vec3 pace = 1.0 + ${f(M.drift.spread)} * ( vec3( dbHash1( cl * 3.1 ), dbHash1( cl * 5.7 ), dbHash1( cl * 7.3 ) ) * 2.0 - 1.0 );
	vec3 ph = TAU * vec3( dbHash1( cl * 1.3 ), dbHash1( cl * 2.9 ), dbHash1( cl * 4.1 ) );
	vec3 drift = vec3( ${f(M.drift.across[0])} * sin( TAU * t / ( ${f(M.drift.across[1])} * pace.x ) + ph.x ), ${f(M.drift.up[0])} * sin( TAU * t / ( ${f(M.drift.up[1])} * pace.y ) + ph.y ), ${f(M.drift.back[0])} * sin( TAU * t / ( ${f(M.drift.back[1])} * pace.z ) + ph.z ) );
	drift *= great ? ${f(M.drift.great)} : 1.0;
	// A smaller piece bobs within it.
	float bp = ${f(M.bob.period[0])} + ${f(M.bob.period[1] - M.bob.period[0])} * fract( seed * 0.618 );
	vec3 bob = ${f(M.bob.size)} * vec3( sin( TAU * t / bp + seed ), sin( TAU * t / ( bp * 1.37 ) + seed * 1.9 ), sin( TAU * t / ( bp * 0.83 ) + seed * 2.7 ) ) * ( great ? 0.0 : kind > 0.5 ? 0.5 : 1.0 );
	// The blast: out from the engine's mouth and up, reaching the nearer pieces first, shoving each furthest a
	// moment later and letting it come back as slowly, and turning it over a little for good.
	vec3 rel = dbA.xyz - vec3( 0.0, ${f(ROCKET.mouth)}, 0.0 );
	vec3 way = normalize( vec3( rel.x, 0.5 * length( rel.xz ) + 0.5 * max( rel.y, 0.0 ), rel.z ) + vec3( 0.0, 1e-4, 0.0 ) );
	float tau = max( uLaunch - ${f(B.start)} - length( rel ) / ${f(B.speed)}, 0.0 ), bx = tau / ${f(B.peak)}, by = 2.0 * bx;
	float shove = bx * bx * exp( 2.0 * ( 1.0 - bx ) ), turned = 1.0 - exp( - by ) * ( 1.0 + by + 0.5 * by * by );
	vec3 at = dbA.xyz + drift + bob + way * dbC.z * shove;
	float spin = great ? ${f(M.spin.rock)} * sin( TAU * t / ${f(M.spin.rockT)} + dbC.y * TAU ) : dbX.w * t + dbC.y * TAU;
	spin += dbC.w * turned;
	vec4 dbS = vec4( dbX.xyz * sin( 0.5 * spin ), cos( 0.5 * spin ) );
	vTurn = dbJoin( dbS, dbQ );
	vec3 objectNormal = dbTurn( vTurn, normal );
	vLocal = position;
	vLocalN = normal;
	vInfo = vec4( seed, dbA.w, kind, aLight.y );
	vOpen = aLight.z;`;

export const VERT_PLACE = /* glsl */ `
	transformed = at + dbTurn( vTurn, position );
	vP = transformed;`;

export const FRAG_PARS = /* glsl */ `
uniform float uFill;
uniform vec3 uGlow;
uniform vec4 uGlowAt;
uniform float uBounce;
uniform vec3 uFire;
uniform vec3 uEngine;
uniform float uFireHalf;
uniform vec3 uLampAt;
uniform vec3 uLamp;
uniform vec3 uLampK;
uniform vec3 uAir;
uniform vec3 uOwn;
uniform vec3 uChip;
uniform vec3 uTan;
uniform vec4 uTone;
uniform vec4 uFacet;
uniform vec4 uGrain;
uniform vec3 uCrease;
uniform vec3 uPits;
uniform vec3 uDeep;
uniform vec3 uSpeck;
uniform vec2 uSheen;
uniform float uShow;
varying vec3 vP;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec4 vTurn;
varying vec4 vInfo;
varying float vOpen;
vec3 dbTurnF( vec4 q, vec3 v ) { return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v ); }
float dbH( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float dbN( vec3 x ) {
	vec3 i = floor( x ), u = fract( x );
	u = u * u * ( 3.0 - 2.0 * u );
	return mix( mix( mix( dbH( i ), dbH( i + vec3( 1, 0, 0 ) ), u.x ), mix( dbH( i + vec3( 0, 1, 0 ) ), dbH( i + vec3( 1, 1, 0 ) ), u.x ), u.y ),
		mix( mix( dbH( i + vec3( 0, 0, 1 ) ), dbH( i + vec3( 1, 0, 1 ) ), u.x ), mix( dbH( i + vec3( 0, 1, 1 ) ), dbH( i + vec3( 1, 1, 1 ) ), u.x ), u.y ), u.z );
}
// The small flat breaks a broken face is made of: cells through the stone, each a facet tilted its own way, so the
// light breaks across a face into many small planes with crisp edges. Also how far into its cell a place is, for a
// paler ridge where two meet.
vec4 dbFacets( vec3 p, vec3 n, float cell, float tilt ) {
	vec3 q = p / cell, b = floor( q - 0.5 ), id = b;
	float d1 = 1e9, d2 = 1e9;
	for ( int k = 0; k < 8; k++ ) {
		vec3 i = b + vec3( float( k & 1 ), float( ( k >> 1 ) & 1 ), float( ( k >> 2 ) & 1 ) );
		vec3 o = q - i - ( 0.2 + 0.6 * vec3( dbH( i + 3.1 ), dbH( i + 17.3 ), dbH( i + 29.7 ) ) );
		float d = dot( o, o );
		if ( d < d1 ) { d2 = d1; d1 = d; id = i; } else if ( d < d2 ) d2 = d;
	}
	vec3 t = vec3( dbH( id + 5.7 ), dbH( id + 11.3 ), dbH( id + 23.9 ) ) * 2.0 - 1.0;
	t -= n * dot( t, n );
	return vec4( t * tilt * ( 0.4 + 0.6 * dbH( id + 41.1 ) ), sqrt( d2 ) - sqrt( d1 ) );
}`;

// The stone, and every light on it, in the pad's own units.
export const FRAG_LIGHT = /* glsl */ `
	{
		float seed = vInfo.x, size = vInfo.y, kind = vInfo.z, bend = vInfo.w;
		vec3 sp = vLocal + vec3( seed * 7.1, seed * 3.3, seed * 5.9 );
		float px = max( length( fwidth( sp ) ), 1e-4 );
		vec3 n0 = normalize( vLocalN ) * ( gl_FrontFacing ? 1.0 : -1.0 );
		// The breaks, two sizes as large as the piece allows, and the grain, each gone where a pixel covers it.
		float c1 = clamp( size * uFacet.x, 0.9, 9.0 ), c2 = c1 * uFacet.z;
		float k1 = 1.0 - smoothstep( 0.18, 0.45, px / c1 ), k2 = 1.0 - smoothstep( 0.18, 0.45, px / c2 );
		vec4 f1 = k1 > 0.0 ? dbFacets( sp, n0, c1, uFacet.y ) : vec4( 0.0, 0.0, 0.0, 1.0 );
		vec4 f2 = k2 > 0.0 ? dbFacets( sp + 31.7, n0, c2, uFacet.w ) : vec4( 0.0, 0.0, 0.0, 1.0 );
		float gc = max( size * uGrain.x, 0.5 ), kg = 1.0 - smoothstep( 0.35, 0.8, px / gc );
		float g = kg > 0.0 ? dbN( sp / gc ) * 0.65 + dbN( sp / ( gc * 2.3 ) + 5.1 ) * 0.35 - 0.5 : 0.0;
		vec3 gn = kg > 0.0 ? vec3( dbN( sp / gc + 9.1 ), dbN( sp / gc + 4.3 ), dbN( sp / gc + 1.7 ) ) - 0.5 : vec3( 0.0 );
		// The hero's great models are broken already: on them the breaks are a little of the relief, not all of it.
		float carve = kind < 0.5 ? 1.0 : uGrain.w;
		vec3 nl = normalize( n0 + ( f1.xyz * k1 + f2.xyz * k2 ) * carve + ( gn - n0 * dot( gn, n0 ) ) * uGrain.z * kg );
		vec3 N = dbTurnF( vTurn, nl ), G = dbTurnF( vTurn, n0 );
		vec3 V = normalize( cameraPosition / ${f(SCALE)} - vP );

		// The body: the planet's red brown, a tone of its own for each piece, broad stains, the grain, a dark in the
		// creases, and paler fresh stone on its broken edges and along the ridges between its breaks.
		float tone = uTone.x + uTone.y * dbH( vec3( seed ) ) ;
		tone *= mix( uTone.z, uTone.w, dbN( sp / max( size * 0.45, 2.0 ) ) * 0.7 + dbN( sp / max( size * 0.15, 1.0 ) ) * 0.3 );
		tone *= 1.0 + uGrain.y * g * kg;
		// A sandstone's speckle: dark and pale grains a little larger than a pixel, gone where a pixel covers them.
		float sc = max( size * uSpeck.x, 0.45 ), ks = 1.0 - smoothstep( 0.4, 0.9, px / sc );
		if ( ks > 0.0 ) tone *= 1.0 + ks * ( uSpeck.z * smoothstep( 0.68, 0.84, dbN( sp / sc + 2.3 ) ) - uSpeck.y * smoothstep( 0.62, 0.8, dbN( sp / sc + 7.9 ) ) );
		// Pits, a share of cells each holding one, gone where a pixel covers a cell.
		float pc = max( size * uPits.z, 0.6 ), kp = 1.0 - smoothstep( 0.3, 0.6, px / pc );
		if ( kp > 0.0 ) {
			vec3 q = sp / pc, i = floor( q ), o = fract( q ) - 0.5 - 0.3 * ( vec3( dbH( i + 3.1 ), dbH( i + 7.7 ), dbH( i + 1.3 ) ) - 0.5 );
			float r = 0.18 + 0.2 * dbH( i + 9.9 ), pit = ( 1.0 - smoothstep( r * 0.6, r, length( o ) ) ) * step( dbH( i + 5.5 ), uPits.x );
			tone *= 1.0 - uPits.y * pit * kp;
		}
		vec3 alb = uOwn * tone;
		float ridge = ( 1.0 - smoothstep( 0.0, 0.12, f1.w ) ) * k1 * 0.6 + ( 1.0 - smoothstep( 0.0, 0.1, f2.w ) ) * k2 * 0.4;
		float edge = smoothstep( 0.56, 0.82, bend );
		alb = mix( alb, uChip * tone, clamp( 0.55 * edge + 0.3 * ridge, 0.0, 0.7 ) );
		alb *= mix( uCrease.x, 1.0, smoothstep( uCrease.y, uCrease.z, vOpen ) ) * ( 1.0 - 0.35 * max( 0.5 - bend, 0.0 ) );
		// Under a strong light the stone reads as a tan and its shade as the redder brown, as the hero's does.
		vec3 lit = mix( alb, uTan * dot( alb, vec3( 0.2126, 0.7152, 0.0722 ) ) / max( dot( uTan, vec3( 0.2126, 0.7152, 0.0722 ) ), 1e-4 ), 0.3 );

		// The lit stone under it: from the nearest place of its top that is lit, which runs from the rim in as it fills.
		vec3 E = vec3( 0.0 ), S = vec3( 0.0 );
		float dbgL = 0.0;
		float R = ${f(STONE.r)};
		if ( uFill > 0.0 ) {
			vec2 q = vP.xz;
			float r = length( q ), inner = R * ( 1.0 - uFill );
			vec2 at = r > 1e-3 ? q / r * clamp( r, inner, R ) : vec2( inner, 0.0 );
			vec3 L = vec3( at.x, 0.0, at.y ) - vP;
			float d = max( length( L ), 1e-3 );
			L /= d;
			float h = uGlowAt.x, e = smoothstep( 0.0, 0.5, uFill ) * h * h / ( h * h + d * d );
			e += uGlowAt.y * uFill * uGlowAt.z * uGlowAt.z / ( uGlowAt.z * uGlowAt.z + dot( vP, vP ) );
			float nl2 = dot( N, L );
			dbgL = nl2;
			E += uGlow * e * saturate( nl2 * ( 1.0 - uGlowAt.w ) + uGlowAt.w ) * step( 0.0, nl2 + uGlowAt.w );
			// What comes back off the stone and the pad: soft, from below, on every side, so a shade is a deep brown.
			float b = uGlowAt.z * uGlowAt.z / ( uGlowAt.z * uGlowAt.z + dot( vP, vP ) );
			E += uGlow * uBounce * uFill * b * ( 0.5 + 0.5 * saturate( - N.y + 0.3 ) ) * smoothstep( 0.1, 0.6, vOpen );
			S += uGlow * e * pow( saturate( dot( N, normalize( L + V ) ) ), uSheen.y ) * uSheen.x * step( 0.0, dot( G, L ) );
		}
		// The engine's fire: hard from the middle, and nothing on a far side.
		if ( dot( uFire, uFire ) > 0.0 ) {
			vec3 L = uEngine - vP;
			float d = max( length( L ), 1e-3 );
			L /= d;
			float e = pow( uFireHalf * uFireHalf / ( uFireHalf * uFireHalf + d * d ), 1.5 );
			E += uFire * e * saturate( dot( N, L ) );
			S += uFire * e * pow( saturate( dot( N, normalize( L + V ) ) ), uSheen.y ) * uSheen.x * step( 0.0, dot( G, L ) );
		}
		// The cursor's light: a little on the body and a thin rim where a face it lights is seen edge on, under the
		// shadow of the tower and the rocket.
		float shade = 1.0;
		#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
			shade = receiveShadow ? getShadow( spotShadowMap[ 0 ], spotLightShadows[ 0 ].shadowMapSize, spotLightShadows[ 0 ].shadowIntensity, spotLightShadows[ 0 ].shadowBias, spotLightShadows[ 0 ].shadowRadius, vSpotLightCoord[ 0 ] ) : 1.0;
		#endif
		{
			vec3 L = normalize( uLampAt - vP );
			float nlL = saturate( dot( N, L ) ), graze = 1.0 - saturate( dot( G, V ) );
			float rim = pow( graze, uLampK.z ) * smoothstep( 0.0, 0.45, dot( G, L ) ) * ( 1.0 - smoothstep( 0.9, 0.99, graze ) );
			E += uLamp * shade * ( uLampK.x * nlL + uLampK.y * rim );
		}
		// What little the night gives, from above and in front: enough to give a body its form.
		vec3 air = uAir * ( 0.55 + 0.45 * saturate( dot( N, normalize( vec3( -0.3, 0.8, 0.5 ) ) ) ) ) * mix( 0.6, 1.0, smoothstep( 0.1, 0.6, vOpen ) );
		float deep = mix( uDeep.z, 1.0, smoothstep( uDeep.x, uDeep.y, vP.z ) );
		reflectedLight.directDiffuse = ( lit * E * RECIPROCAL_PI + alb * air * RECIPROCAL_PI ) * deep;
		reflectedLight.directSpecular = S * mix( 0.5, 1.0, edge ) * deep;
		reflectedLight.indirectDiffuse = vec3( 0.0 );
		reflectedLight.indirectSpecular = vec3( 0.0 );
		// ?paddebrisshow= draws one number in grey in place of the light: 1 how far the normal faces up, 2 how far it faces
		// the lit stone, 3 how open the place is, 4 its bend.
		if ( uShow > 0.5 ) {
			reflectedLight.directDiffuse = vec3( 0.3 * ( uShow < 1.5 ? step( 0.0, N.y ) : uShow < 2.5 ? dbgL * 0.5 + 0.5 : uShow < 3.5 ? vOpen : bend ) );
			reflectedLight.directSpecular = vec3( 0.0 );
		}
	}`;
