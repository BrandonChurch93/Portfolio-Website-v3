import { STONE_VERT_PARS } from '../rock/stone';
import { KIND, MOTION } from './motion';

// The shader of what broke away, laid into a standard material before the planet's stone (../rock/stone.ts) and the
// world's light (../../light.ts). Every piece is drawn from its model where the table of pieces (a texture written
// once) puts it, and moved by the clock alone (./motion.ts): no buffer is written after the piece is made. It wears
// the planet's stone in its own frame, so the stone moves with it, each piece at its own place in the stone's beds.
// The stream and the small streams light it.

const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);
const M = MOTION;
// Where a piece is in the stone's beds: each is given its own place, far from the core, by its number. And how much
// finer the stone is laid on a piece than on the torn rock, on a great piece and on the rest: a piece is smaller than
// the faces of the hollow, and the stone's grain at the hollow's size reads on it as crumpled foil.
const BEDS = { up: 2000, step: [97, 41] as const, every: 23, fine: [1.7, 2.6] as const };

export const VERT_PARS = /* glsl */ `
uniform highp sampler2D uPieces;
uniform float uTime;
// The core, in the world's units (the world's light has its own, in the stage's measure).
uniform vec3 uDebrisCore;
uniform float uBounceK;
uniform float uCoreK;
attribute float aPiece;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vWorldP;
varying float vSide;
varying float wBedTone;
varying float vMetal;
varying vec3 vR0;
varying vec3 vR1;
varying vec3 vR2;
${STONE_VERT_PARS}
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
		axis = normalize( uDebrisCore - dA.xyz );
		spin = ${f(M.plate.rock)} * sin( TAU * t / ${f(M.plate.rockT)} + fc );
	} else if ( kind < ${f(KIND.ring + 0.5)} ) {
		float swing = ${f(M.ring.swing)} * sin( TAU * t / ${f(M.ring.swingT)} + dHash( dE.y * 3.1 ) * TAU );
		at = dP.xyz + dTurnY( swing, dA.xyz - dP.xyz ) + dPlate( dE.y, t );
		dRound = swing;
	} else if ( kind < ${f(KIND.clump + 0.5)} ) {
		at += vec3( ${f(M.clump.slide)} * sin( TAU * t / ${f(M.clump.slideT)} + fa ), ${f(M.clump.rise)} * sin( TAU * t / ${f(M.clump.riseT)} + fb ), ${f(M.clump.deep)} * sin( TAU * t / ${f(M.clump.slideT * 1.41)} + fc ) );
	} else if ( kind < ${f(KIND.whirl + 0.5)} ) {
		vec3 rel = vec3( dA.x, 0.0, dA.z - uDebrisCore.z );
		float period = ${f(M.whirl.swingT[0])} + ${f(M.whirl.swingT[1] - M.whirl.swingT[0])} * dHash( fam * 7.7 );
		dRound = dE.y * sin( TAU * t / period + fa );
		vec3 now = dTurnY( dRound, rel );
		at = vec3( now.x, dA.y - ${f(M.whirl.tilt)} * ( now.z - rel.z ), now.z + uDebrisCore.z );
	} else if ( kind < ${f(KIND.fall + 0.5)} ) {
		float span = ${f(M.fall.from - M.fall.to)};
		float u = fract( ( ${f(M.fall.from)} - dA.y ) / span + dE.y * t / span ), s = pow( u, ${f(M.fall.gather)} );
		float y = ${f(M.fall.from)} - span * s, k = 1.0 - ${f(M.fall.pull)} * s, back = uDebrisCore.z - ${f(M.fall.behind)};
		at = vec3( dA.x * k, y, back + ( dA.z - back ) * k );
		grow = smoothstep( ${f(M.fall.from)}, ${f(M.fall.from - M.fall.fade)}, y ) * smoothstep( ${f(M.fall.to)}, ${f(M.fall.to + M.fall.fade)}, y );
	} else if ( kind < ${f(KIND.dust + 0.5)} ) {
		vec3 rel = vec3( dA.x, 0.0, dA.z - uDebrisCore.z );
		dRound = ${f(M.dust.turn)} * sin( TAU * t / ${f(M.dust.turnT)} + fa );
		vec3 now = dTurnY( dRound, rel );
		at = vec3( now.x, dA.y + ${f(M.dust.rise)} * sin( TAU * t / ${f(M.dust.riseT)} + fb ), now.z + uDebrisCore.z );
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
	vR0 = dTurnY( dRound, dTurn( axis, spin, dTurnQ( dQ, vec3( 1.0, 0.0, 0.0 ) ) ) );
	vR1 = dTurnY( dRound, dTurn( axis, spin, dTurnQ( dQ, vec3( 0.0, 1.0, 0.0 ) ) ) );
	vR2 = dTurnY( dRound, dTurn( axis, spin, dTurnQ( dQ, vec3( 0.0, 0.0, 1.0 ) ) ) );
	vStoneP = vLocal * ( kind < ${f(KIND.plate + 0.5)} ? ${f(BEDS.fine[0])} : ${f(BEDS.fine[1])} ) + vec3( 0.0, ${f(BEDS.up)} + ${f(BEDS.step[0])} * float( dId ), ${f(BEDS.step[1])} * mod( float( dId ), ${f(BEDS.every)} ) );
	vStoneN = vLocalN;`;

export const FRAG_PARS = /* glsl */ `
uniform vec3 uSkinPale;
uniform vec3 uSkinDark;
uniform vec3 uShard;
uniform float uWorn;
uniform float uGrain;
uniform vec3 uFloor;
uniform vec2 uRim;
uniform vec3 uNight;
uniform float uEdge;
uniform float uRockMirror;
uniform vec3 uLineA[ 7 ];
uniform vec3 uLineB[ 7 ];
uniform vec2 uLineI[ 7 ];
uniform vec3 uLineColor;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vWorldP;
varying float vSide;
varying float wBedTone;
varying float vMetal;
varying vec3 vR0;
varying vec3 vR1;
varying vec3 vR2;`;

// After the stone has worked out its color: the planet's outer surface where a piece shows it, an edge worn a
// little brighter where the piece is too small for the stone to find its edges, and a chip the stream carries,
// which is the stream's own shard: dark polished metal, which shows the light only where a face turns to it.
export const COLOR = /* glsl */ `
	{
		vec3 dSkin = vSide > 0.0 ? uSkinPale : uSkinDark;
		diffuseColor.rgb = mix( diffuseColor.rgb, dSkin * ( 0.85 + 0.3 * wBedTone ), wLight.w );
		float dBend = wLight.y * 2.0 - 1.0;
		diffuseColor.rgb *= 1.0 + uWorn * max( dBend, 0.0 ) - 0.3 * max( - dBend, 0.0 );
		diffuseColor.rgb = mix( diffuseColor.rgb, uShard, vMetal );
	}`;

export const FINISH = /* glsl */ `
	metalnessFactor = mix( metalnessFactor, 0.92, vMetal );
	roughnessFactor = mix( roughnessFactor, 0.13, vMetal );`;

// The stone's normal is in the piece's own frame: turned as the piece is turned. Its grain is laid on gently, since
// at the hollow's strength it reads on a piece as hammered foil. A carried chip keeps its flat faces.
export const NORMAL = /* glsl */ `
	normal = normalize( ( viewMatrix * vec4( mat3( vR0, vR1, vR2 ) * normalize( mix( normalize( vStoneN ), sNormal, uGrain * ( 1.0 - vMetal ) ) ), 0.0 ) ).xyz );`;

// The stream down the middle and the small streams: lines of light, each lighting what faces it, strongest near it.
// The moon is behind the world and to the right: past what the stage's own light gives, a face it lights shows a
// crisp pale edge where it turns from the eye. And no face falls to grey: what nothing reaches is a warm brown black.
export const STREAM = /* glsl */ `
	for ( int i = 0; i < 7; i ++ ) {
		vec3 dAB = uLineB[ i ] - uLineA[ i ];
		float dS = clamp( dot( vWorldP - uLineA[ i ], dAB ) / max( dot( dAB, dAB ), 1e-8 ), 0.0, 1.0 );
		vec3 dTo = uLineA[ i ] + dAB * dS - vWorldP;
		float dFar = max( length( dTo ), 1e-5 );
		float dReach = uLineI[ i ].y;
		float dE = uLineI[ i ].x * dReach * dReach / ( dReach * dReach + dFar * dFar );
		if ( dE < 1e-3 ) continue;
		vec3 dL = normalize( ( viewMatrix * vec4( dTo / dFar, 0.0 ) ).xyz );
		float dC = dot( geometryNormal, dL );
		vec3 dIrr = uLineColor * dE * mix( 1.0, wLight.z, 0.6 );
		reflectedLight.directDiffuse += dIrr * saturate( dC * 0.94 + 0.06 ) * BRDF_Lambert( material.diffuseContribution );
		reflectedLight.directSpecular += dIrr * saturate( dC ) * BRDF_GGX( dL, geometryViewDir, geometryNormal, material );
	}
	#if NUM_DIR_LIGHTS > 0
	{
		float dM = saturate( dot( geometryNormal, directLight.direction ) ), dEdge = pow( 1.0 - saturate( dot( geometryNormal, geometryViewDir ) ), uRim.y );
		reflectedLight.directDiffuse += directLight.color * dM * dEdge * uRim.x * BRDF_Lambert( material.diffuseContribution ) * mix( 1.0, wLight.z, 0.5 );
	}
	#endif
	{
		vec3 dTo = ( viewMatrix * vec4( uCoreAt, 1.0 ) ).xyz - geometryPosition;
		float dFar = max( length( dTo ), 1e-6 ), dEdge = max( wLight.y * 2.0 - 1.0, 0.0 );
		float dFace = saturate( dot( normal, dTo / dFar ) );
		reflectedLight.directDiffuse += uCoreColor * ( uCoreLevel * wLight.x * pow( min( 1.0, uCoreR / dFar ), uCoreFall ) ) * dFace * dEdge * uEdge * BRDF_Lambert( material.diffuseContribution );
	}
	reflectedLight.directDiffuse += uFloor * wLight.z * BRDF_Lambert( material.diffuseContribution );`;

// What the night gives a piece, which the world's light then scales (../../light.ts): on rock it is warmed, so a
// face lit by nothing else is a warm dark and never grey, and the rock mirrors almost none of it. A carried chip
// is metal and mirrors it.
export const NIGHT = /* glsl */ `
	iblIrradiance *= uNight;
	radiance *= mix( uRockMirror, 1.0, vMetal );`;
