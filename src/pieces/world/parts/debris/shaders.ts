import { SCALE, SOURCE, VIEW } from '../../layout';
import { KIND, MOTION } from './motion';
import { LOOK, MOON_SHARE } from './table';

// The shader of what broke away, laid into a standard material before the world's light (../../light.ts). Every
// piece is drawn from its model where the table of pieces (a texture written once) puts it, and moved by the clock
// alone (./motion.ts): no buffer is written after the piece is made.
// It is the planet's stone (stone() in ../../light.ts) with the hollow's own grain (the stone's grain map, laid at the
// piece's own scale), without the hollow's pockets and grooves, which read as cork on pieces this small. Its break is
// in its geometry (scripts/world/parts/debris/torn.mjs): what the shader adds is the tone of a face, which varies
// across it, the paler fresh stone of a flake's scar, a weathered skin on the old faces, and a few hackle lines.
// A piece is lit as picture 9's are: a body of warm near black, picked out by three lights. The core burns a thin edge
// and the face behind it on the side that sees it, falling away fast with distance. The stream lights the near side
// of what is beside it, as far as it has run. The moon, behind and to the right, draws a thin pale rim at the upper
// right of what the planet does not shade from it. Further back is darker.

const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);
const M = MOTION;

export const VERT_PARS = /* glsl */ `
uniform highp sampler2D uPieces;
uniform float uTime;
// The core, in the world's units (the world's light has its own, in the stage's measure).
uniform vec3 uDebrisCore;
uniform float uBounceK;
uniform float uCoreK;
// How fast the core's light on a face falls past what the world's light gives it: a distance, and a power.
uniform vec2 uCoreSteep;
// The page's stream (../../light.ts): how much of it is there, and how far under the core's foot it has run.
uniform vec2 uStream;
attribute float aPiece;
varying vec3 vLocal;
varying vec3 vExt;
varying vec3 vWorldP;
varying vec3 vAt;
varying float vSide;
varying float wBedTone;
varying float vFresh;
varying float vMetal;
varying float vFlat;
varying float vSeed;
varying float vSeen;
varying float vMoon;
varying float vSkin;
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
		// Only where the stream has run is there a stream to carry it.
		float run = ${f(SOURCE[1])} - uStream.y;
		grow = smoothstep( ${f(M.fall.from)}, ${f(M.fall.from - M.fall.fade)}, y ) * smoothstep( max( ${f(M.fall.to)}, run ), max( ${f(M.fall.to)}, run ) + ${f(M.fall.fade)}, y ) * step( 0.001, uStream.x );
	} else if ( kind < ${f(KIND.dust + 0.5)} ) {
		vec3 rel = vec3( dA.x, 0.0, dA.z - uDebrisCore.z );
		dRound = ${f(M.dust.turn)} * sin( TAU * t / ${f(M.dust.turnT)} + fa );
		vec3 now = dTurnY( dRound, rel );
		at = vec3( now.x, dA.y + ${f(M.dust.rise)} * sin( TAU * t / ${f(M.dust.riseT)} + fb ), now.z + uDebrisCore.z );
	} else {
		at += vec3( ${f(M.scatter.slide)} * sin( TAU * t / ${f(M.scatter.slideT)} + fa ), ${f(M.scatter.rise)} * sin( TAU * t / ${f(M.scatter.riseT)} + fb ), 0.0 );
	}
	vLocal = position * dS.xyz;
	// A great piece is drawn at its own size: its extent is how large it is.
	vExt = kind < ${f(KIND.plate + 0.5)} ? vec3( max( dE.w, 1.0 ) ) : dS.xyz;
	vec3 dLocalN = normalize( normal / max( dS.xyz, vec3( 1e-4 ) ) );
	vec3 dPos = dTurnY( dRound, dTurn( axis, spin, dTurnQ( dQ, vLocal * grow ) ) ) + at;
	vec3 dNor = dTurnY( dRound, dTurn( axis, spin, dTurnQ( dQ, dLocalN ) ) );
	vAt = at;
	vSide = dA.x;
	{
		float dV = floor( aBounce.w * 255.0 + 0.5 );
		wBedTone = floor( dV / 16.0 ) / 15.0;
		vFresh = mod( dV, 16.0 ) / 15.0;
	}
	float dLook = dE.z;
	vMetal = dLook > ${f(LOOK.stone + 0.5)} ? 1.0 : 0.0;
	vFlat = dLook > ${f(LOOK.rock + 0.5)} ? 1.0 : 0.0;
	vSeed = float( dId );
	vSkin = step( 0.5, aLight.w );
	vMoon = clamp( ( aLight.w - 0.5 * vSkin ) / ${f(MOON_SHARE)}, 0.0, 1.0 );
	vSeen = aLight.x;`;

// After the world's light has read the stored light: the core's light on a face is taken down, and falls away far
// faster with distance than in the hollow, so the pieces far down get almost none of it.
export const VERT_LIGHT = /* glsl */ `
	transformed = dPos;
	wBounce *= uBounceK;
	wLight.x *= uCoreK * pow( min( 1.0, uCoreSteep.x / max( distance( vAt, uDebrisCore ), 1.0 ) ), uCoreSteep.y );
	vWorldP = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`;

export const FRAG_PARS = /* glsl */ `
uniform vec3 uStone;
uniform vec3 uDebrisCore;
uniform vec3 uSkinPale;
uniform vec3 uSkinDark;
uniform vec3 uShard;
uniform float uWorn;
uniform vec4 uFill;
uniform vec3 uFillDir;
uniform vec3 uRimTint;
uniform vec3 uNight;
uniform float uRockMirror;
uniform float uMoonBody;
uniform vec3 uMoonRim;
uniform vec4 uCoreRim;
uniform vec2 uCoreSteepF;
uniform vec4 uStreamLight;
uniform vec3 uStreamColor;
uniform vec2 uStream;
uniform vec4 uRelief;
uniform vec3 uDeep;
uniform vec3 uCracks;
uniform vec3 uCracksI;
uniform vec2 uSmallDepth;
uniform float uSmallBurn;
uniform float uShardMirror;
uniform vec3 uLineA[ 6 ];
uniform vec3 uLineB[ 6 ];
uniform vec2 uLineI[ 6 ];
varying vec3 vLocal;
varying vec3 vExt;
varying vec3 vWorldP;
varying vec3 vAt;
varying float vSide;
varying float wBedTone;
varying float vFresh;
varying float vMetal;
varying float vFlat;
varying float vSeed;
varying float vSeen;
varying float vMoon;
varying float vSkin;
uniform sampler2D uStoneGrain;
uniform vec3 uPatina;
uniform vec3 uChip;
uniform vec4 uWeather;
uniform vec3 uGlow;
uniform vec2 uGlowRim;
uniform vec4 uGrainK;
uniform vec3 uStrata;
const float TAU = 6.2831853;
// The moon as it reached this place, past the planet's shadow, which the rim is drawn from.
vec3 dMoonColor = vec3( 0.0 );
vec3 dMoonDir = vec3( 0.0, 0.0, 1.0 );
float dH( float n ) { return fract( sin( n * 12.9898 + 4.1414 ) * 43758.5453 ); }
float dH3( vec3 p ) { p = fract( p * 0.1031 ); p += dot( p, p.zyx + 31.32 ); return fract( ( p.x + p.y ) * p.z ); }
float dNoise( vec3 p ) {
	vec3 i = floor( p ), u = fract( p );
	u = u * u * ( 3.0 - 2.0 * u );
	return mix( mix( mix( dH3( i ), dH3( i + vec3( 1, 0, 0 ) ), u.x ), mix( dH3( i + vec3( 0, 1, 0 ) ), dH3( i + vec3( 1, 1, 0 ) ), u.x ), u.y ),
		mix( mix( dH3( i + vec3( 0, 0, 1 ) ), dH3( i + vec3( 1, 0, 1 ) ), u.x ), mix( dH3( i + vec3( 0, 1, 1 ) ), dH3( i + vec3( 1, 1, 1 ) ), u.x ), u.y ), u.z );
}
// The hackle lines on a face, as a height in units: a few fine lines running out from one place where the piece was
// struck, broken along their length, fading where a pixel covers them. No rings and no grit: those read as a
// fingerprint and as hammered metal.
float dRelief( vec3 p, vec3 ext, float seed, float px ) {
	float big = max( ext.x, max( ext.y, ext.z ) );
	float k = seed * 3.17;
	vec3 c = normalize( vec3( dH( k ), dH( k + 1.7 ), dH( k + 3.9 ) ) * 2.0 - 1.0 + 1e-3 ) * ext * 1.08;
	vec3 rel = p - c;
	float r = max( length( rel ), 1e-4 ), fan = uRelief.y, wide = r / fan;
	float line = ( dNoise( rel / r * fan + k ) - 0.5 ) * smoothstep( 0.45, 0.8, dNoise( rel * 2.7 / big + k ) );
	return big * uRelief.z * line * smoothstep( big * 1.2, big * 0.2, r ) * ( 1.0 - smoothstep( 0.15, 0.4, px / wide ) );
}
// The stone's grain from the three axes of the piece's own frame, at the piece's own scale: its tone.
float dGrainMap( vec3 p, vec3 n, float scale ) {
	vec3 w = pow( abs( n ), vec3( 4.0 ) );
	w /= max( w.x + w.y + w.z, 1e-4 );
	return texture2D( uStoneGrain, p.zy * scale + 0.31 ).b * w.x + texture2D( uStoneGrain, p.xz * scale + 0.57 ).b * w.y + texture2D( uStoneGrain, p.xy * scale + 0.83 ).b * w.z;
}
// What a face shows in its tone: broad stains across it, so no face is one tone, and a few hairline fractures where
// the piece has begun to split again, each a plane through it, dark, broken along its length. px as for the relief.
float dGrain( vec3 p, vec3 ext, float seed, float px ) {
	float big = max( ext.x, max( ext.y, ext.z ) ), g2 = big * 0.22, g3 = big * 0.07;
	float t = ( dNoise( p / g2 + seed * 1.3 ) - 0.5 ) * 1.2 + ( dNoise( p / g3 + seed * 0.7 ) - 0.5 ) * 0.6 * ( 1.0 - smoothstep( 0.2, 0.6, px / g3 ) );
	float split = 0.0;
	for ( int i = 0; i < 2; i ++ ) {
		float k = seed * 5.71 + float( i ) * 17.9;
		vec3 n = normalize( vec3( dH( k ), dH( k + 2.3 ), dH( k + 4.7 ) ) * 2.0 - 1.0 + 1e-3 );
		float d = abs( dot( p - ( vec3( dH( k + 6.1 ), dH( k + 7.3 ), dH( k + 8.9 ) ) * 2.0 - 1.0 ) * ext * 0.5, n ) + big * 0.02 * ( dNoise( p / ( big * 0.08 ) + k ) - 0.5 ) );
		float w = max( big * 0.003, px * 0.7 );
		split = max( split, ( 1.0 - smoothstep( 0.0, w, d ) ) * min( 1.0, big * 0.003 / max( px * 0.7, 1e-4 ) ) * smoothstep( 0.5, 0.75, dNoise( p / ( big * 0.18 ) + k ) ) );
	}
	return t * 0.5 - 0.6 * split;
}
// A normal tilted by the slope of a height across the screen (as three's bump map does, in the same measure).
vec3 dBump( vec3 pos, vec3 n, float hx, float hy, float face ) {
	vec3 sx = dFdx( pos ), sy = dFdy( pos ), r1 = cross( sy, n ), r2 = cross( n, sx );
	float det = dot( sx, r1 ) * face;
	vec3 grad = sign( det ) * ( hx * r1 + hy * r2 );
	return normalize( abs( det ) * n - grad );
}`;

// The moon's own light on a piece is mostly taken off: it is behind the pieces, and lit all over by it they were a
// rust orange. What reaches a place is kept for its rim.
export const MOON_PARS = /* glsl */ `
void RE_Direct_Debris( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	dMoonColor = directLight.color;
	dMoonDir = directLight.direction;
	IncidentLight dimmed = directLight;
	dimmed.color *= uMoonBody;
	RE_Direct_Physical( dimmed, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
}`;
export const MOON_SWAP = /* glsl */ `
#undef RE_Direct
#define RE_Direct RE_Direct_Debris`;

// After the color: a body of the stone, darker and less red than the lit stone of the hollow, each block a little of
// its own; the planet's outer surface where a piece shows it; an edge a little paler where it is fresh and a crease
// darker. A carried shard is dark copper.
export const COLOR = /* glsl */ `
	{
		// The planet's stone. An old face carries a weathered skin, darker and greyer, which is thinner where the core
		// burns close; a flake's scar and the rubble in a join are fresh stone, paler; each bed a little its own.
		float dBig = max( vExt.x, max( vExt.y, vExt.z ) );
		float dPx0 = max( max( length( dFdx( vLocal ) ), length( dFdy( vLocal ) ) ), 1e-4 );
		float dNear = 1.0 - smoothstep( uWeather.z, uWeather.w, distance( vAt, uDebrisCore ) );
		float dOld = ( 1.0 - vFresh ) * mix( uWeather.x, uWeather.y, dNear );
		vec3 dAlb = mix( uStone, uPatina, dOld );
		dAlb = mix( dAlb, uChip, vFresh * 0.55 );
		dAlb *= 0.82 + 0.36 * wBedTone;
		vec3 dFaceN = normalize( cross( dFdx( vLocal ), dFdy( vLocal ) ) + 1e-5 );
		float dG = dGrainMap( vLocal, dFaceN, 1.0 / clamp( dBig * uGrainK.x, uGrainK.y, uGrainK.z ) );
		dAlb *= 1.0 + uGrainK.w * ( dG - 0.5 ) * 2.0;
		// The strata: thin beds across the piece, each a little its own tone, showing on the broken sides that cut
		// across them, wandering, and gone where a bed is finer than a few pixels.
		float dBedW = dBig * uStrata.x, dB = vLocal.y / dBedW + uStrata.y * ( dNoise( vLocal / ( dBig * 0.3 ) + vSeed ) - 0.5 );
		float dAcross = 1.0 - smoothstep( 0.55, 0.85, abs( dFaceN.y ) );
		dAlb *= 1.0 + uStrata.z * ( dH( floor( dB ) + vSeed * 0.37 ) - 0.5 ) * 2.0 * dAcross * ( 1.0 - smoothstep( 0.15, 0.35, dPx0 / dBedW ) );
		dAlb = mix( dAlb, ( vSide > 0.0 ? uSkinPale : uSkinDark ) * ( 0.85 + 0.3 * wBedTone ), vSkin );
		float dBend = wLight.y * 2.0 - 1.0;
		dAlb *= 1.0 + uWorn * max( dBend, 0.0 ) * ( 1.0 - vFlat ) - 0.35 * max( - dBend, 0.0 );
		dAlb *= 1.0 + dGrain( vLocal, vExt, vSeed, dPx0 ) * ( 1.0 - vFlat );
		// A shard is dark copper, each of its faces a little its own.
		vec3 dShard = uShard * ( 0.65 + 0.7 * dH( dot( floor( dFaceN * 3.0 + 0.5 ), vec3( 1.0, 7.0, 13.0 ) ) + vSeed ) );
		diffuseColor.rgb = mix( dAlb, dShard, vMetal );
	}`;

export const FINISH = /* glsl */ `
	metalnessFactor = mix( metalnessFactor, 0.9, vMetal );
	roughnessFactor = mix( roughnessFactor, 0.26, vMetal );`;

// The fracture's relief, on rock only: a shard keeps its flat faces.
export const NORMAL = /* glsl */ `
	if ( vFlat < 0.5 ) {
		float dPx = max( max( length( dFdx( vLocal ) ), length( dFdy( vLocal ) ) ), 1e-4 );
		float dHu = dRelief( vLocal, vExt, vSeed, dPx ), dRel = dHu * ${f(SCALE)};
		normal = dBump( - vViewPosition, normal, dFdx( dRel ), dFdy( dRel ), faceDirection );
	}`;

// The three lights that pick a piece out, and what nothing reaches.
export const LIGHT = /* glsl */ `
	{
		vec3 dN = geometryNormal, dV = geometryViewDir;
		float dGraze = 1.0 - saturate( dot( dN, dV ) );
		// The core: a thin burning edge on the side that sees it, and on a broken edge turned to it, falling fast.
		vec3 dTo = ( viewMatrix * vec4( uCoreAt, 1.0 ) ).xyz - geometryPosition;
		float dFar = max( length( dTo ), 1e-6 );
		vec3 dLc = dTo / dFar;
		float dFall = uCoreLevel * vSeen * pow( min( 1.0, uCoreR / dFar ), uCoreFall ) * pow( min( 1.0, uCoreSteepF.x / dFar ), uCoreSteepF.y );
		float dFace = saturate( dot( dN, dLc ) );
		float dConvex = smoothstep( 0.25, 0.8, wLight.y * 2.0 - 1.0 ) * ( 1.0 - vFlat );
		float dRimC = pow( dGraze, uCoreRim.y ) * pow( dFace, 0.6 ) + uCoreRim.z * dConvex * dFace;
		reflectedLight.directDiffuse += uCoreColor * dFall * dRimC * uCoreRim.x * BRDF_Lambert( mix( uStone, material.diffuseContribution, vMetal ) );
		// The stream: from the core's foot straight down as far as it has run, as strong as it is there.
		vec3 dP = vWorldP / ${f(SCALE)};
		float dBelow = ${f(SOURCE[1])} - dP.y;
		vec3 dQ = vec3( ${f(SOURCE[0])}, ${f(SOURCE[1])} - clamp( dBelow, 0.0, uStream.y ), ${f(SOURCE[2])} ) - dP;
		float dD = max( length( dQ ), 1e-3 );
		float dE = uStream.x * uStreamLight.x * uStreamLight.y * uStreamLight.y / ( uStreamLight.y * uStreamLight.y + dD * dD )
			* ( 1.0 - smoothstep( uStreamLight.z * 0.5, uStreamLight.z, dD ) ) * ( 1.0 - smoothstep( uStream.y - 12.0, uStream.y, dBelow ) );
		if ( dE > 1e-4 ) {
			vec3 dLs = normalize( ( viewMatrix * vec4( dQ / dD, 0.0 ) ).xyz );
			float dC = dot( dN, dLs );
			vec3 dIrr = uStreamColor * dE;
			float dWrap = uStreamLight.w * ( 1.0 - vMetal );
			reflectedLight.directDiffuse += dIrr * saturate( dC * ( 1.0 - dWrap ) + dWrap ) * ( 1.0 - 0.75 * vFlat * ( 1.0 - vMetal ) ) * BRDF_Lambert( mix( uStone, material.diffuseContribution, max( vMetal, 0.5 + 0.5 * vFlat ) ) );
			reflectedLight.directSpecular += dIrr * saturate( dC ) * BRDF_GGX( dLs, dV, dN, material );
		}
		// The cracks lit from inside on the planet's left side.
		{
			vec3 dK = uCracks - vWorldP;
			float dKd = max( length( dK ), 1e-6 ) / ${f(SCALE)};
			float dKe = uCracksI.x * uCracksI.y * uCracksI.y / ( uCracksI.y * uCracksI.y + dKd * dKd ) * ( 1.0 - smoothstep( uCracksI.z * 0.6, uCracksI.z, dKd ) );
			vec3 dKl = normalize( ( viewMatrix * vec4( dK, 0.0 ) ).xyz );
			reflectedLight.directDiffuse += uStreamColor * dKe * saturate( dot( dN, dKl ) ) * BRDF_Lambert( uStone ) * ( 1.0 - vMetal );
		}
		// The small streams, which are always there. The page draws them over the world, so each lights what it is
		// drawn beside: its line is taken at the depth of the place it lights (within a reach of its own), moved
		// across as far as the view moves a thing at that depth. On an edge that stands out it burns.
		for ( int i = 0; i < 6; i ++ ) {
			vec3 dA0 = uLineA[ i ] / ${f(SCALE)}, dB0 = uLineB[ i ] / ${f(SCALE)};
			float dZ = clamp( dP.z, dA0.z - uSmallDepth.x, dA0.z + uSmallDepth.x );
			float dK = ( ${f(VIEW.back)} - dA0.z ) / max( ${f(VIEW.back)} - dZ, 1.0 );
			vec3 dA1 = vec3( dA0.x * dK, dA0.y, dZ ), dB1 = vec3( dB0.x * dK, dB0.y, dZ );
			vec3 dAB = dB1 - dA1;
			float dS = clamp( dot( dP - dA1, dAB ) / max( dot( dAB, dAB ), 1e-6 ), 0.0, 1.0 );
			vec3 dT = dA1 + dAB * dS - dP;
			float dF = max( length( dT ), 1e-3 ), dR = uLineI[ i ].y;
			float dI = uLineI[ i ].x * dR * dR / ( dR * dR + dF * dF ) * ( 1.0 - smoothstep( uSmallDepth.y * 0.5, uSmallDepth.y, dF ) ) * ( 1.0 - 0.6 * smoothstep( uSmallDepth.x * 0.4, uSmallDepth.x, abs( dP.z - dA0.z ) ) );
			// A stream that falls behind a piece, across it on the screen, is hidden by it and lights none of it.
			float dSize = max( vExt.x, max( vExt.y, vExt.z ) );
			dI *= mix( 1.0, smoothstep( 0.75, 0.95, abs( dA1.x - vAt.x ) / max( dSize, 1.0 ) ), step( dA0.z + 20.0, vAt.z ) );
			if ( dI < 1e-3 ) continue;
			vec3 dL = normalize( ( viewMatrix * vec4( dT / dF, 0.0 ) ).xyz );
			float dFace = saturate( dot( dN, dL ) );
			reflectedLight.directDiffuse += uStreamColor * dI * dFace * ( 1.0 + uSmallBurn * dConvex ) * BRDF_Lambert( mix( uStone, material.diffuseContribution, vMetal ) );
			reflectedLight.directSpecular += uStreamColor * dI * dFace * BRDF_GGX( dL, dV, dN, material ) * vMetal;
		}
		// The moon's rim: thin, pale, at the edge turned to it, where the planet does not shade the piece.
		float dRimM = pow( dGraze, uMoonRim.y ) * smoothstep( 0.1, 0.6, dot( dN, dMoonDir ) );
		reflectedLight.directDiffuse += dMoonColor * uRimTint * vMoon * dRimM * uMoonRim.x * ( 1.0 - vMetal );
		reflectedLight.directSpecular += dMoonColor * vMoon * dRimM * uMoonRim.x * uMoonRim.z * F_Schlick( material.specularColor, 1.0, 1.0 ) * vMetal;
		// The glow the page draws behind the world: a faint warm line on the outline of what the moon does not reach,
		// so a mass in the planet's shadow still reads as a mass.
		reflectedLight.directDiffuse += uGlow * pow( dGraze, uGlowRim.x ) * ( 1.0 - uGlowRim.y * vMoon ) * ( 1.0 - vMetal ) * saturate( 1.0 - dFall * 40.0 ) * smoothstep( 120.0, 320.0, abs( vAt.x ) );
		// The night, softly, from the visitor's side and above: enough to give a body its form, never its color.
		reflectedLight.indirectDiffuse += uFill.rgb * wLight.z * ( uFill.a + ( 1.0 - uFill.a ) * saturate( dot( dN, uFillDir ) ) ) * BRDF_Lambert( material.diffuseContribution );
	}`;

// What the night gives a piece, which the world's light then scales and tints (../../light.ts): here it is turned
// from the hollow's red toward a warm neutral, so a body lit by nothing else is a near black and never rust. The rock
// mirrors almost none of it. A carried shard is metal and mirrors it.
export const NIGHT = /* glsl */ `
	iblIrradiance *= uNight;
	radiance *= mix( uRockMirror, uShardMirror, vMetal );`;

// Further back is darker: a piece behind the stream's column fades toward the dark.
export const DEEP = /* glsl */ `
	{
		float dK = mix( uDeep.z, 1.0, smoothstep( uDeep.x, uDeep.y, vAt.z ) );
		reflectedLight.directDiffuse *= dK;
		reflectedLight.indirectDiffuse *= dK;
		reflectedLight.directSpecular *= dK;
		reflectedLight.indirectSpecular *= dK;
	}`;
