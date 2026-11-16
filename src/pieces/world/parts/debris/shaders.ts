import { KIND, MOTION } from './motion';

// The shader of what broke away, laid into a standard material before the world's light (../../light.ts).
// Every piece is drawn from its model where the table of pieces (a texture written once) puts it, and moved by the
// clock alone (./motion.ts): no buffer is written after the piece is made. Its fine breaks come from the detail map,
// read in the piece's own frame from three sides, as small shadows. The stream and the small streams light it.

const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);
const M = MOTION;
// How large the detail map's grain is on a piece, against its size: on a great piece, and on the rest, as a share of
// their size at this many units, between these.
const GRAIN = { great: 1.7, at: 26, least: 0.22, most: 1.4 };

export const VERT_PARS = /* glsl */ `
uniform highp sampler2D uPieces;
uniform float uTime;
uniform vec3 uCoreAt;
uniform float uBounceK;
attribute float aPiece;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vWorldP;
varying float vSide;
varying float wBedTone;
varying float vMetal;
varying float vGrain;
const float TAU = 6.2831853;
float dHash( float n ) { return fract( sin( n * 12.9898 + 4.1414 ) * 43758.5453 ); }
vec3 dTurnQ( vec4 q, vec3 v ) { return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v ); }
vec3 dTurn( vec3 axis, float a, vec3 v ) { float c = cos( a ), s = sin( a ); return v * c + cross( axis, v ) * s + axis * dot( axis, v ) * ( 1.0 - c ); }
vec3 dTurnY( float a, vec3 v ) { float c = cos( a ), s = sin( a ); return vec3( v.x * c + v.z * s, v.y, - v.x * s + v.z * c ); }
// A great piece of a family: how far it has risen and slid.
vec3 dPlate( float fam, float t ) {
	float a = dHash( fam * 1.7 ) * TAU, b = dHash( fam * 2.9 ) * TAU, c = dHash( fam * 5.3 ) * TAU;
	float calm = ${M.calm.families.map((k) => `abs( fam - ${f(k)} ) < 0.5`).join(' || ')} ? ${f(M.calm.share)} : 1.0;
	return calm * vec3( ${f(M.plate.slide)} * sin( TAU * t / ${f(M.plate.slideT)} + a ), ${f(M.plate.rise)} * sin( TAU * t / ${f(M.plate.riseT)} + b ), 0.35 * ${f(M.plate.slide)} * sin( TAU * t / ${f(M.plate.slideT * 1.37)} + c ) );
}`;

// Works out where this vertex of its piece is and which way it faces, before the standard shader's own steps.
export const VERT_MOTION = /* glsl */ `
	int dId = int( aPiece + 0.5 );
	vec4 dA = texelFetch( uPieces, ivec2( dId, 0 ), 0 );
	vec4 dQ = texelFetch( uPieces, ivec2( dId, 1 ), 0 );
	vec4 dS = texelFetch( uPieces, ivec2( dId, 2 ), 0 );
	vec4 dX = texelFetch( uPieces, ivec2( dId, 3 ), 0 );
	vec4 dE = texelFetch( uPieces, ivec2( dId, 4 ), 0 );
	vec4 dP = texelFetch( uPieces, ivec2( dId, 5 ), 0 );
	float t = uTime, kind = dA.w, fam = dS.w;
	float fa = dHash( fam * 1.7 ) * TAU, fb = dHash( fam * 2.9 ) * TAU, fc = dHash( fam * 5.3 ) * TAU;
	vec3 at = dA.xyz, axis = dX.xyz;
	float spin = dX.w * t + dE.x * TAU, dRound = 0.0, grow = 1.0;
	if ( kind < ${f(KIND.plate + 0.5)} ) {
		at += dPlate( fam, t );
		axis = normalize( uCoreAt - dA.xyz );
		spin = ${f(M.plate.rock)} * sin( TAU * t / ${f(M.plate.rockT)} + fc );
	} else if ( kind < ${f(KIND.ring + 0.5)} ) {
		float swing = ${f(M.ring.swing)} * sin( TAU * t / ${f(M.ring.swingT)} + dHash( dE.y * 3.1 ) * TAU );
		at = dP.xyz + dTurnY( swing, dA.xyz - dP.xyz ) + dPlate( dE.y, t );
		dRound = swing;
	} else if ( kind < ${f(KIND.clump + 0.5)} ) {
		at += vec3( ${f(M.clump.slide)} * sin( TAU * t / ${f(M.clump.slideT)} + fa ), ${f(M.clump.rise)} * sin( TAU * t / ${f(M.clump.riseT)} + fb ), ${f(M.clump.deep)} * sin( TAU * t / ${f(M.clump.slideT * 1.41)} + fc ) );
	} else if ( kind < ${f(KIND.whirl + 0.5)} ) {
		vec3 rel = vec3( dA.x, 0.0, dA.z - uCoreAt.z );
		float period = ${f(M.whirl.swingT[0])} + ${f(M.whirl.swingT[1] - M.whirl.swingT[0])} * dHash( fam * 7.7 );
		dRound = dE.y * sin( TAU * t / period + fa );
		vec3 now = dTurnY( dRound, rel );
		at = vec3( now.x, dA.y - ${f(M.whirl.tilt)} * ( now.z - rel.z ), now.z + uCoreAt.z );
	} else if ( kind < ${f(KIND.fall + 0.5)} ) {
		float span = ${f(M.fall.from - M.fall.to)};
		float u = fract( ( ${f(M.fall.from)} - dA.y ) / span + dE.y * t / span ), s = pow( u, ${f(M.fall.gather)} );
		float y = ${f(M.fall.from)} - span * s, k = 1.0 - ${f(M.fall.pull)} * s, back = uCoreAt.z - ${f(M.fall.behind)};
		at = vec3( dA.x * k, y, back + ( dA.z - back ) * k );
		grow = smoothstep( ${f(M.fall.from)}, ${f(M.fall.from - M.fall.fade)}, y ) * smoothstep( ${f(M.fall.to)}, ${f(M.fall.to + M.fall.fade)}, y );
	} else if ( kind < ${f(KIND.dust + 0.5)} ) {
		vec3 rel = vec3( dA.x, 0.0, dA.z - uCoreAt.z );
		dRound = ${f(M.dust.turn)} * sin( TAU * t / ${f(M.dust.turnT)} + fa );
		vec3 now = dTurnY( dRound, rel );
		at = vec3( now.x, dA.y + ${f(M.dust.rise)} * sin( TAU * t / ${f(M.dust.riseT)} + fb ), now.z + uCoreAt.z );
	} else {
		at += vec3( ${f(M.scatter.slide)} * sin( TAU * t / ${f(M.scatter.slideT)} + fa ), ${f(M.scatter.rise)} * sin( TAU * t / ${f(M.scatter.riseT)} + fb ), 0.0 );
	}
	vLocal = position * dS.xyz;
	vLocalN = normalize( normal / max( dS.xyz, vec3( 1e-4 ) ) );
	vec3 dPos = dTurnY( dRound, dTurn( axis, spin, dTurnQ( dQ, vLocal * grow ) ) ) + at;
	vec3 dNor = dTurnY( dRound, dTurn( axis, spin, dTurnQ( dQ, vLocalN ) ) );
	vSide = dA.x;
	wBedTone = aBounce.w;
	vMetal = abs( kind - ${f(KIND.fall)} ) < 0.5 ? 1.0 : 0.0;
	vGrain = kind < ${f(KIND.plate + 0.5)} ? ${f(GRAIN.great)} : clamp( max( dS.x, max( dS.y, dS.z ) ) / ${f(GRAIN.at)}, ${f(GRAIN.least)}, ${f(GRAIN.most)} );`;

export const FRAG_PARS = /* glsl */ `
uniform sampler2D uDetail;
uniform vec3 uRock;
uniform vec3 uRust;
uniform vec3 uSkinPale;
uniform vec3 uSkinDark;
uniform vec3 uShard;
uniform vec4 uLook;
uniform vec3 uFloor;
uniform vec2 uRim;
uniform vec3 uNight;
uniform float uRockMirror;
uniform vec3 uStreamA[ 7 ];
uniform vec3 uStreamB[ 7 ];
uniform vec2 uStreamI[ 7 ];
uniform vec3 uStreamColor;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vWorldP;
varying float vSide;
varying float wBedTone;
varying float vMetal;
varying float vGrain;
// The detail map read from three sides of the piece in its own frame, at two sizes, each as large as the piece's
// grain: its height, its tone, and how its height changes across the piece (in the piece's own frame). The change
// is taken from the map a texel either side, so it runs smoothly across each texel and never shows the texels.
vec2 dRead( vec2 uv, out vec2 slope ) {
	const float E = 1.0 / 512.0;
	slope = vec2( texture2D( uDetail, uv + vec2( E, 0.0 ) ).r - texture2D( uDetail, uv - vec2( E, 0.0 ) ).r, texture2D( uDetail, uv + vec2( 0.0, E ) ).r - texture2D( uDetail, uv - vec2( 0.0, E ) ).r ) / ( 2.0 * E );
	return texture2D( uDetail, uv ).rg;
}
vec2 dDetail( vec3 p, vec3 n, out vec3 grad ) {
	vec3 w = pow( abs( n ), vec3( 4.0 ) );
	w /= max( w.x + w.y + w.z, 1e-5 );
	vec2 out2 = vec2( 0.0 );
	grad = vec3( 0.0 );
	for ( int k = 0; k < 2; k ++ ) {
		float S = ( k == 0 ? uLook.x : uLook.y ) * vGrain, a = k == 0 ? 1.0 : 0.45;
		vec2 o = k == 0 ? vec2( 0.0 ) : vec2( 0.37 ), sx, sy, sz;
		vec2 tx = dRead( p.yz / S + o, sx ), ty = dRead( p.zx / S + o, sy ), tz = dRead( p.xy / S + o, sz );
		out2 += vec2( a, k == 0 ? 0.7 : 0.3 ) * ( tx * w.x + ty * w.y + tz * w.z );
		grad += a * ( w.x * vec3( 0.0, sx.x, sx.y ) + w.y * vec3( sy.y, 0.0, sy.x ) + w.z * vec3( sz.x, sz.y, 0.0 ) ) / S;
	}
	return out2;
}`;

// The rock's color: its bed's tone, the map's, the planet's outer surface where it shows, edges worn bright and
// creases dark.
export const COLOR = /* glsl */ `
	vec3 dGrad;
	vec2 dD = dDetail( vLocal, vLocalN, dGrad );
	float dBed = wBedTone;
	vec3 dRock = mix( uRock, uRust, smoothstep( 0.55, 0.95, dBed ) * 0.8 ) * ( 0.78 + 0.42 * dBed );
	dRock *= 0.82 + 0.36 * dD.y;
	vec3 dSkin = vSide > 0.0 ? uSkinPale : uSkinDark;
	dRock = mix( dRock, dSkin * ( 0.85 + 0.3 * dD.y ), wLight.w );
	float dBend = wLight.y * 2.0 - 1.0;
	dRock *= 1.0 + uLook.z * max( dBend, 0.0 ) - 0.35 * max( - dBend, 0.0 );
	diffuseColor.rgb = mix( dRock, uShard, vMetal );`;

// A chip the stream carries is the stream's own shard: dark polished metal, which shows the light only where a face
// turns to it.
export const FINISH = /* glsl */ `
	metalnessFactor = mix( metalnessFactor, 0.92, vMetal );
	roughnessFactor = mix( roughnessFactor, 0.24, vMetal );`;

// The map's height as small shadows: the normal is bent by how the height changes across the pixel, worked out from
// how it changes across the piece, and the bending fades where a pixel covers more of the piece than the map holds.
export const NORMAL = /* glsl */ `
	{
		float dFoot = length( fwidth( vLocal ) ) / max( vGrain, 0.05 );
		float dK = uLook.w * vGrain * ( 1.0 - smoothstep( 0.5, 2.0, dFoot ) ) * ( 1.0 - 0.6 * wLight.w ) * ( 1.0 - vMetal );
		vec3 dSx = dFdx( - vViewPosition ), dSy = dFdy( - vViewPosition );
		vec3 dR1 = cross( dSy, normal ), dR2 = cross( normal, dSx );
		float dDet = dot( dSx, dR1 ) * faceDirection;
		vec2 dH = vec2( dot( dGrad, dFdx( vLocal ) ), dot( dGrad, dFdy( vLocal ) ) ) * dK;
		vec3 dG = sign( dDet ) * ( dH.x * dR1 + dH.y * dR2 );
		normal = normalize( abs( dDet ) * normal - dG );
	}`;

// The stream down the middle and the small streams: lines of light, each lighting what faces it, strongest near it.
// The moon is behind the world and to the right: past what the stage's own light gives, a face it lights shows a
// crisp pale edge where it turns from the eye. And no face falls to grey: what nothing reaches is a warm brown black.
export const STREAM = /* glsl */ `
	for ( int i = 0; i < 7; i ++ ) {
		vec3 dAB = uStreamB[ i ] - uStreamA[ i ];
		float dS = clamp( dot( vWorldP - uStreamA[ i ], dAB ) / max( dot( dAB, dAB ), 1e-8 ), 0.0, 1.0 );
		vec3 dTo = uStreamA[ i ] + dAB * dS - vWorldP;
		float dFar = max( length( dTo ), 1e-5 );
		float dReach = uStreamI[ i ].y;
		float dE = uStreamI[ i ].x * dReach * dReach / ( dReach * dReach + dFar * dFar );
		if ( dE < 1e-3 ) continue;
		vec3 dL = normalize( ( viewMatrix * vec4( dTo / dFar, 0.0 ) ).xyz );
		float dC = dot( geometryNormal, dL );
		vec3 dIrr = uStreamColor * dE * mix( 1.0, wLight.z, 0.6 );
		reflectedLight.directDiffuse += dIrr * saturate( dC * 0.94 + 0.06 ) * BRDF_Lambert( material.diffuseContribution );
		reflectedLight.directSpecular += dIrr * saturate( dC ) * BRDF_GGX( dL, geometryViewDir, geometryNormal, material );
	}
	#if NUM_DIR_LIGHTS > 0
	{
		float dM = saturate( dot( geometryNormal, directLight.direction ) ), dEdge = pow( 1.0 - saturate( dot( geometryNormal, geometryViewDir ) ), uRim.y );
		reflectedLight.directDiffuse += directLight.color * dM * dEdge * uRim.x * BRDF_Lambert( material.diffuseContribution ) * mix( 1.0, wLight.z, 0.5 );
	}
	#endif
	reflectedLight.directDiffuse += uFloor * wLight.z * BRDF_Lambert( material.diffuseContribution );`;

// What the night gives a piece, which the world's light then scales (../../light.ts): on rock it is warmed, so a
// face lit by nothing else is a warm dark and never grey, and the rock mirrors almost none of it. A carried chip
// is metal and mirrors it.
export const NIGHT = /* glsl */ `
	iblIrradiance *= uNight;
	radiance *= mix( uRockMirror, 1.0, vMetal );`;
