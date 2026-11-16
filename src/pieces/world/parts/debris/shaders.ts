import { SCALE, SOURCE, VIEW } from '../../layout';
import { KIND, MOTION } from './motion';
import { LOOK, MOON_SHARE } from './table';

// The shader of what broke away, laid into a standard material before the world's light (../../light.ts). Every
// piece is drawn from its model where the table of pieces (a texture written once) puts it, and moved by the clock
// alone (./motion.ts): no buffer is written after the piece is made.
// Every piece wears the planet's own stone (../rock/stone.ts, its body, grain, stains and knapped relief), laid on
// the piece where it rests, so it moves with the piece. What this adds is how old a face is (a weathered skin on the
// old faces, paler fresh stone where a flake came off) and the lights that pick a piece out: a body of warm near
// black, picked out by the core's burning edge on the side toward it, the stream's light on the near side of what is
// beside it, as far as it has run, and the moon's thin pale rim on the side toward the moon, at the visitor's upper
// right; a smaller piece takes the moon on each face turned to it. A flake the
// stream carries burns on its thin sides toward it. Further back is darker.
// A great piece is lit by which way each of its faces is turned: those turned to the core take its warm light, as
// far as the core is seen from them, those turned to the moon its pale light on their top planes, and the rest are
// near black. The gouges of the planet's stone run along its own beds (vBed), never round the core's axis: laid round
// the core's axis, on a piece whose stone lay near that axis, they fanned out as spokes.

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
// Where in the planet the stone is laid from, and over how far each piece's place there is spread.
uniform vec3 uStoneAt;
uniform vec3 uStoneSpread;
// The page's stream (../../light.ts): how much of it is there, and how far under the core's foot it has run.
uniform vec2 uStream;
attribute float aPiece;
varying vec3 vLocal;
varying vec3 vExt;
varying vec3 vWorldP;
varying vec3 vAt;
varying vec4 vSpin;
varying float vTurnY;
varying float vSide;
varying float vBedTone;
varying float vFresh;
varying float vCarried;
varying float vGreat;
varying float vSeed;
varying float vSeen;
varying float vMoon;
varying float vSkin;
varying float vBoulder;
varying vec3 vBed;
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

// Works out where this vertex of its piece is and which way it faces, before the standard shader's own steps. The
// stone is laid on the piece as it rests (vStoneP, vStoneN), and the fragment turns its normal on as the piece has
// turned (vSpin, vTurnY).
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
	vGreat = kind < ${f(KIND.plate + 0.5)} ? 1.0 : 0.0;
	// A great piece is drawn at its own size: its extent is how large it is.
	vExt = vGreat > 0.5 ? vec3( max( dE.w, 1.0 ) ) : dS.xyz;
	vec3 dLocalN = normalize( normal / max( dS.xyz, vec3( 1e-4 ) ) );
	vec3 dRestN = dTurnQ( dQ, dLocalN );
	vec3 dPos = dTurnY( dRound, dTurn( axis, spin, dTurnQ( dQ, vLocal * grow ) ) ) + at;
	vec3 dNor = dTurnY( dRound, dTurn( axis, spin, dRestN ) );
	// The stone is laid as if the piece still lay deep in the planet, away from the core and from the outer crust,
	// each piece at a place of its own there: where it hangs now it is outside the planet, and the stone would read it
	// all as weathered crust.
	vStoneP = uStoneAt + ( vec3( dHash( float( dId ) * 0.731 ), dHash( float( dId ) * 1.913 ), dHash( float( dId ) * 2.377 ) ) - 0.5 ) * uStoneSpread + dTurnQ( dQ, vLocal );
	vStoneN = dRestN;
	vSpin = vec4( axis, spin );
	vTurnY = dRound;
	vAt = at;
	vSide = dA.x;
	{
		float dV = floor( aBounce.w * 255.0 + 0.5 );
		vBedTone = floor( dV / 16.0 ) / 15.0;
		vFresh = mod( dV, 16.0 ) / 15.0;
	}
	vCarried = dE.z > ${f(LOOK.rock + 0.5)} ? 1.0 : 0.0;
	vSeed = float( dId );
	vSkin = step( 0.5, aLight.w );
	// How much of the moon reaches the place: on a great piece worked out for each place, on the rest for the piece.
	vMoon = clamp( ( aLight.w - 0.5 * vSkin ) / ${f(MOON_SHARE)}, 0.0, 1.0 );
	// The way across the piece's beds, as it rests.
	vBed = dTurnQ( dQ, vec3( 0.0, 1.0, 0.0 ) );
	// Picture 9's two boulders carry wider bands of the moon's light and the core's than the rest.
	vBoulder = ${M.calm.families.map((k) => `abs( fam - ${f(k)} ) < 0.5`).join(' || ')} ? 1.0 : 0.0;
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
uniform vec3 uChip;
uniform vec4 uWeather;
uniform float uWorn;
uniform vec4 uFill;
uniform vec3 uFillDir;
uniform vec3 uMoonRimColor;
uniform vec4 uMoonRim;
uniform vec3 uMoonWay;
uniform vec3 uNight;
uniform float uRockMirror;
uniform float uMoonBody;
uniform vec4 uCoreRim;
// A great piece's light by which way its faces turn: the core's strength, the distance in units past which it falls
// off and how fast; the moon's strength on a face turned to it.
uniform vec4 uGreat;
// Picture 9's two boulders: how much of a great piece's core light they take, how much of its moon light the left
// one and the right one take, and how much of the core each place is taken to see at least: the right one's crest
// burns in the picture, where the rock hides the core.
uniform vec4 uBoulder;
// How much brighter the core's light is on a great piece's edges that stand out, which catch it as a crest does.
uniform float uGreatEdge;
// The right boulder is near black but for its crest: how much of the core's light its body keeps, and its edges.
uniform vec2 uCrest;
// A great piece's tone across it: the darkest and lightest of its stains, how wide they are in units, and how dark
// it is where it is most shut in.
uniform vec4 uGreatTone;
// How much more of the night's soft light a great piece takes, and the left boulder.
uniform vec2 uGreatFill;
// The left boulder: how strong the light of the small stream beside its right flank is, and the pale light on its
// top planes.
uniform vec2 uBoulderLit;
// The stone's gouges along a great piece's beds: how far apart, in units, how long, and how wide at least and most.
uniform vec4 uGouge;
uniform vec2 uCoreSteepF;
uniform vec4 uStreamLight;
uniform vec3 uStreamColor;
uniform vec3 uCarried;
uniform vec2 uStream;
uniform vec3 uDeep;
uniform vec3 uCracks;
uniform vec3 uCracksI;
uniform vec2 uSmallDepth;
uniform float uSmallBurn;
uniform vec3 uLineA[ 6 ];
uniform vec3 uLineB[ 6 ];
uniform vec2 uLineI[ 6 ];
uniform vec3 uGlow;
uniform vec2 uGlowRim;
uniform float uStudio;
uniform float uShow;
uniform float uStoneRelief;
// How much of that a great piece keeps: on its broad faces the knapped bowls read as an even mottle of polygons.
uniform float uGreatRelief;
// The facets of a broken face: the larger cells' size in units and tilt, the smaller's.
uniform vec4 uFacet;
// The pits: their cell in units, the share of cells that hold one, how dark one is, and the smaller cells'.
uniform vec4 uPits;
varying vec3 vLocal;
varying vec3 vExt;
varying vec3 vWorldP;
varying vec3 vAt;
varying vec4 vSpin;
varying float vTurnY;
varying float vSide;
varying float vBedTone;
varying float vFresh;
varying float vCarried;
varying float vGreat;
varying float vSeed;
varying float vSeen;
varying float vMoon;
varying float vSkin;
varying float vBoulder;
varying vec3 vBed;
// The tilt the gouges give the stone's normal. Set in main(), never where it is declared.
vec3 dGouge;
// The face's own normal, before the stone's relief: rims are drawn from the shape, never from its grain.
vec3 dGeoN;
vec3 dTurnF( vec3 axis, float a, vec3 v ) { float c = cos( a ), s = sin( a ); return v * c + cross( axis, v ) * s + axis * dot( axis, v ) * ( 1.0 - c ); }
// The small planes a broken face is made of: cells of \`cell\` units through the stone, each a facet tilted its own
// way, so the light breaks across a face into many small flat breaks with crisp edges, as fractured stone does. The
// tilt, along the face, in units of the normal.
vec3 dFacets( vec3 p, vec3 n, float cell, float tilt ) {
	vec3 q = p / cell, b = floor( q - 0.5 ), id = b;
	float d1 = 1e9;
	for ( int k = 0; k < 8; k++ ) {
		vec3 i = b + vec3( float( k & 1 ), float( ( k >> 1 ) & 1 ), float( ( k >> 2 ) & 1 ) );
		vec3 o = q - i - ( 0.2 + 0.6 * vec3( stoneHash3( i + 3.1 ), stoneHash3( i + 17.3 ), stoneHash3( i + 29.7 ) ) );
		float d = dot( o, o );
		if ( d < d1 ) { d1 = d; id = i; }
	}
	vec3 t = vec3( stoneHash3( id + 5.7 ), stoneHash3( id + 11.3 ), stoneHash3( id + 23.9 ) ) * 2.0 - 1.0;
	t -= n * dot( t, n );
	return t * tilt * ( 0.4 + 0.6 * stoneHash3( id + 41.1 ) );
}
// The pits and crumbs of a broken face, at one size in every direction: cells of \`cell\` units through the stone,
// a share of which hold a pit round a point of their own, of a size of its own. How far into a pit a place is, 0 to
// 1, gone where a pixel covers a cell. A pit is never brighter than the face it is in.
float dPits( vec3 p, float cell, float share, float px ) {
	vec3 q = p / cell, b = floor( q - 0.5 );
	float pit = 0.0;
	for ( int k = 0; k < 8; k++ ) {
		vec3 i = b + vec3( float( k & 1 ), float( ( k >> 1 ) & 1 ), float( ( k >> 2 ) & 1 ) );
		if ( stoneHash3( i + 7.7 ) > share ) continue;
		vec3 o = q - i - ( 0.2 + 0.6 * vec3( stoneHash3( i + 3.1 ), stoneHash3( i + 17.3 ), stoneHash3( i + 29.7 ) ) );
		float r = 0.12 + 0.22 * stoneHash3( i + 13.9 ), d = length( o ), w = max( px / cell, 0.02 );
		pit = max( pit, 1.0 - smoothstep( r - w, r + w, d ) );
	}
	return pit * ( 1.0 - smoothstep( 0.25, 0.5, px / cell ) );
}`;

// The moon's own light on a piece is mostly taken off: it is behind the pieces, and lit all over by it they were a
// rust orange. Its rim is drawn below, from the shape.
export const MOON_PARS = /* glsl */ `
void RE_Direct_Debris( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	IncidentLight dimmed = directLight;
	dimmed.color *= uMoonBody;
	RE_Direct_Physical( dimmed, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	// A great piece's faces turned to the moon take its pale light, the stone under it greyer than under the core's,
	// as far as the moon reaches each place past the planet and the other pieces.
	if ( vGreat > 0.5 ) {
		vec3 dPale = mix( vec3( dot( material.diffuseColor, vec3( 0.2126, 0.7152, 0.0722 ) ) ), material.diffuseColor, 0.65 );
		reflectedLight.directDiffuse += directLight.color * uGreat.w * mix( 1.0, vSide < 0.0 ? uBoulder.y : uBoulder.z, vBoulder ) * vMoon * saturate( dot( geometryNormal, directLight.direction ) ) * BRDF_Lambert( dPale );
	}
}`;
export const MOON_SWAP = /* glsl */ `
#undef RE_Direct
#define RE_Direct RE_Direct_Debris`;

// After the stone's color: an old face carries a weathered skin, darker and greyer, thinner where the core burns
// close; a flake's scar is fresh stone, paler; each face a little its own; the planet's outer surface where a piece
// shows it; a crease of a great piece darker.
export const COLOR = /* glsl */ `
	{
		float dNear = 1.0 - smoothstep( uWeather.z, uWeather.w, distance( vAt, uDebrisCore ) );
		float dOld = ( 1.0 - vFresh ) * mix( 1.0, uWeather.y, dNear );
		vec3 dAlb = diffuseColor.rgb;
		float dL = dot( dAlb, vec3( 0.2126, 0.7152, 0.0722 ) );
		dAlb = mix( dAlb, mix( vec3( dL ), dAlb, 0.35 ) * uWeather.x, dOld );
		dAlb = mix( dAlb, uChip * ( 0.9 + 0.2 * vBedTone ), vFresh * 0.3 );
		// A great piece's beds each a little their own, broad stains across it, and the stone darker where it is shut in,
		// as dust and shade gather in a crease: so a broad face is never one tone.
		dAlb *= vGreat > 0.5 ? ( 0.9 + 0.2 * vBedTone ) * mix( uGreatTone.x, uGreatTone.y, stoneNoise3( vStoneP / uGreatTone.z + 4.7 ) * 0.65 + stoneNoise3( vStoneP / ( uGreatTone.z * 0.37 ) + 1.9 ) * 0.35 ) * mix( uGreatTone.w, 1.0, smoothstep( 0.15, 0.7, wLight.z ) ) : 0.86 + 0.28 * vBedTone;
		dAlb = mix( dAlb, ( vSide > 0.0 ? uSkinPale : uSkinDark ) * ( 0.85 + 0.3 * vBedTone ), vSkin );
		float dBend = vGreat > 0.5 ? wLight.y * 2.0 - 1.0 : 0.0;
		dAlb *= 1.0 + uWorn * max( dBend, 0.0 ) - 0.35 * max( - dBend, 0.0 );
		float dPx = max( length( dFdx( vStoneP ) ), length( dFdy( vStoneP ) ) );
		dAlb *= 1.0 - uPits.z * ( 1.0 - 0.5 * vGreat ) * max( dPits( vStoneP, uPits.x, uPits.y, dPx ), 0.7 * dPits( vStoneP + 17.3, uPits.w, uPits.y * 0.8, dPx ) );
		// The gouges on a great piece: the stone's own scars (stoneScar), run along the piece's beds, wandering, in
		// lengths, gathered in places. Cut, as the rock's are: a floor in shadow, darker under the wall turned from the
		// core, a pale lip on the wall turned to it, and a lip thinner than a unit and a half fades rather than dash.
		dGouge = vec3( 0.0 );
		if ( vGreat > 0.5 ) {
			vec3 gp = vStoneP, gn = normalize( vStoneN ), gb = normalize( vBed );
			vec3 gl = normalize( uDebrisCore - vAt ), glT = gl - gn * dot( gn, gl );
			glT = length( glT ) > 1e-4 ? normalize( glT ) : vec3( 0.0 );
			vec4 gw1 = stoneNoiseD( gp / 23.0 + 3.1 ), gw2 = stoneNoiseD( gp / 6.5 + 7.7 );
			float gf = dot( gp, gb ) + 6.0 * gw1.w + 0.5 * gw2.w;
			vec3 gF = gb + gw1.xyz * ( 6.0 / 23.0 ) + gw2.xyz * ( 0.5 / 6.5 );
			vec3 gAlong = normalize( cross( gb, vec3( 0.31, 0.17, 0.93 ) ) );
			float gDens = smoothstep( 0.5, 0.78, stoneNoise3( gp / 45.0 + 11.0 ) );
			vec3 gE;
			float gSide;
			vec2 gs = stoneScar( gp, gn, glT, gf, gF, dot( gp, gAlong ), uGouge.x, 0.0, uGouge.y, uGouge.zw, gDens, 5.3, gE, gSide );
			float gh = gs.x, gsd = gs.y, ghA = max( gh, 0.6 * dPx ), gAmt = gh / ghA;
			float gGroove = clamp( ( ghA - abs( gsd ) ) / dPx + 0.5, 0.0, 1.0 ) * gAmt;
			float gUnder = gGroove * ( 1.0 - smoothstep( - 0.6 * dPx, 0.6 * dPx, gsd + 0.15 * ghA ) ) * mix( 0.55, 1.0, smoothstep( 0.12, 0.45, gSide ) );
			float gLipW = mix( 0.5, 1.1, stoneNoise3( gp / 11.0 + 2.7 ) ) * smoothstep( 0.0, uGouge.w, gh );
			float gLip = clamp( min( gsd - ghA, ghA + gLipW - gsd ) / dPx + 0.5, 0.0, 1.0 ) * smoothstep( 1.0, 3.0, gLipW / dPx ) * smoothstep( 0.1, 0.4, gh );
			dGouge = gE * ( 0.9 * gUnder ) - gE * ( 0.8 * gLip );
			dAlb = mix( dAlb, dAlb * vec3( 0.16, 0.12, 0.1 ), gGroove * 0.7 );
			dAlb *= 1.0 - 0.5 * gUnder;
			dAlb = mix( dAlb, uChip, 0.45 * gLip );
		}
		diffuseColor.rgb = dAlb;
	}`;

// After the stone has set its normal, which it worked out on the piece as it rests: turned as the piece has turned.
export const NORMAL = /* glsl */ `
	dGeoN = normalize( vNormal );
	{
		// The stone's knapped relief, eased: at a piece's size its full depth crumpled a face like paper.
		vec3 dN0 = normalize( vStoneN ), dPs = vStoneP;
		float dPx = max( length( dFdx( dPs ) ), length( dFdy( dPs ) ) );
		// The small flat breaks are a small piece's: on a great piece's large faces, one tilt to a cell read as an even
		// mottle of polygons. Its relief is in its mesh, and its gouges.
		vec3 dTilt = ( dFacets( dPs, dN0, uFacet.x, uFacet.y ) * ( 1.0 - smoothstep( 0.15, 0.4, dPx / uFacet.x ) )
			+ dFacets( dPs + 31.7, dN0, uFacet.z, uFacet.w ) * ( 1.0 - smoothstep( 0.15, 0.4, dPx / uFacet.z ) ) ) * ( 1.0 - vGreat ) + dGouge;
		vec3 dW = dTurnF( vSpin.xyz, vSpin.w, normalize( mix( dN0, stoneNormal, uStoneRelief * mix( 1.0, uGreatRelief, vGreat ) ) + dTilt ) );
		float c = cos( vTurnY ), s = sin( vTurnY );
		normal = normalize( ( viewMatrix * vec4( dW.x * c + dW.z * s, dW.y, - dW.x * s + dW.z * c, 0.0 ) ).xyz );
	}`;

// The lights that pick a piece out, and what nothing reaches.
export const LIGHT = /* glsl */ `
	{
		vec3 dN = geometryNormal, dG = dGeoN, dV = geometryViewDir;
		float dGraze = 1.0 - saturate( dot( dG, dV ) );
		float dSize = max( vExt.x, max( vExt.y, vExt.z ) );
		// The core: a thin burning edge on the side of a smaller piece that sees it, falling fast.
		vec3 dTo = ( viewMatrix * vec4( uCoreAt, 1.0 ) ).xyz - geometryPosition;
		float dFar = max( length( dTo ), 1e-6 );
		vec3 dLc = dTo / dFar;
		float dReach = uCoreLevel * pow( min( 1.0, uCoreR / dFar ), uCoreFall ) * pow( min( 1.0, uCoreSteepF.x / dFar ), uCoreSteepF.y );
		float dFall = dReach * vSeen;
		float dFace = saturate( dot( dG, dLc ) );
		float dConvex = smoothstep( 0.25, 0.8, wLight.y * 2.0 - 1.0 ) * vGreat;
		float dRimC = pow( dGraze, uCoreRim.y ) * pow( dFace, 0.6 ) * ( 1.0 - vGreat ) + uCoreRim.z * dConvex * dFace;
		reflectedLight.directDiffuse += uCoreColor * dFall * dRimC * uCoreRim.x * BRDF_Lambert( uStone );
		if ( vGreat > 0.5 ) {
			// A great piece's faces turned to the core glow in the hollow's own warm stone, as far as each place sees the
			// core, falling with distance: the light is the face's, so it thins and breaks with the relief.
			float dK = uGreat.x * mix( 1.0, uBoulder.x, vBoulder ) * uCoreLevel * pow( min( 1.0, uGreat.y / dFar ), uGreat.z );
			float dEdgeK = smoothstep( 0.2, 0.7, wLight.y * 2.0 - 1.0 );
			dK *= vBoulder > 0.5 && vSide > 0.0 ? uCrest.x + uCrest.y * dEdgeK : 1.0 + uGreatEdge * dEdgeK;
			reflectedLight.directDiffuse += uCoreColor * dK * mix( vSeen, max( vSeen, uBoulder.w ), vBoulder ) * saturate( dot( dN, dLc ) ) * smoothstep( - 0.05, 0.25, dot( dG, dLc ) ) * BRDF_Lambert( material.diffuseContribution );
		}
		// The stream: from the core's foot straight down as far as it has run, as strong as it is there.
		vec3 dP = vWorldP / ${f(SCALE)};
		float dBelow = ${f(SOURCE[1])} - dP.y;
		vec3 dQ = vec3( ${f(SOURCE[0])}, ${f(SOURCE[1])} - clamp( dBelow, 0.0, uStream.y ), ${f(SOURCE[2])} ) - dP;
		float dD = max( length( dQ ), 1e-3 );
		float dE = uStream.x * uStreamLight.x * uStreamLight.y * uStreamLight.y / ( uStreamLight.y * uStreamLight.y + dD * dD )
			* ( 1.0 - smoothstep( uStreamLight.z * 0.5, uStreamLight.z, dD ) ) * ( 1.0 - smoothstep( uStream.y - 12.0, uStream.y, dBelow ) );
		if ( dE > 1e-4 ) {
			vec3 dLs = normalize( ( viewMatrix * vec4( dQ / dD, 0.0 ) ).xyz );
			vec3 dIrr = uStreamColor * dE;
			// A flake the stream carries keeps a dark body and burns on its edge toward it.
			reflectedLight.directDiffuse += dIrr * saturate( dot( dN, dLs ) ) * mix( 1.0, uCarried.z, vCarried ) * BRDF_Lambert( material.diffuseContribution );
			// A flake's thin sides turned to the stream are its hot edge: seen nearly edge on, facing it.
			float dEdge = smoothstep( 0.1, 0.6, dot( dG, dLs ) ) * smoothstep( 0.35, 0.8, dGraze );
			reflectedLight.directDiffuse += dIrr * dEdge * uCarried.x * vCarried * BRDF_Lambert( uStone );
		}
		// The cracks lit from inside on the planet's left side.
		{
			vec3 dK = uCracks - vWorldP;
			float dKd = max( length( dK ), 1e-6 ) / ${f(SCALE)};
			float dKe = uCracksI.x * uCracksI.y * uCracksI.y / ( uCracksI.y * uCracksI.y + dKd * dKd ) * ( 1.0 - smoothstep( uCracksI.z * 0.6, uCracksI.z, dKd ) );
			vec3 dKl = normalize( ( viewMatrix * vec4( dK, 0.0 ) ).xyz );
			reflectedLight.directDiffuse += uStreamColor * dKe * saturate( dot( dN, dKl ) ) * BRDF_Lambert( material.diffuseContribution );
		}
		// The small streams, which are always there. The page draws them over the world, so each lights what it is
		// drawn beside: its line is taken at the depth of the place it lights (within a reach of its own), moved
		// across as far as the view moves a thing at that depth.
		for ( int i = 0; i < 6; i ++ ) {
			vec3 dA0 = uLineA[ i ] / ${f(SCALE)}, dB0 = uLineB[ i ] / ${f(SCALE)};
			float dZ = clamp( dP.z, dA0.z - uSmallDepth.x, dA0.z + uSmallDepth.x );
			float dK = ( ${f(VIEW.back)} - dZ ) / max( ${f(VIEW.back)} - dA0.z, 1.0 );
			vec3 dA1 = vec3( dA0.x * dK, dA0.y, dZ ), dB1 = vec3( dB0.x * dK, dB0.y, dZ );
			vec3 dAB = dB1 - dA1;
			float dS = clamp( dot( dP - dA1, dAB ) / max( dot( dAB, dAB ), 1e-6 ), 0.0, 1.0 );
			vec3 dT = dA1 + dAB * dS - dP;
			float dF = max( length( dT ), 1e-3 ), dR = uLineI[ i ].y;
			float dI = uLineI[ i ].x * dR * dR / ( dR * dR + dF * dF ) * ( 1.0 - smoothstep( uSmallDepth.y * 0.5, uSmallDepth.y, dF ) ) * ( 1.0 - 0.6 * smoothstep( uSmallDepth.x * 0.4, uSmallDepth.x, abs( dP.z - dA0.z ) ) );
			// A stream that falls behind a piece, across it on the screen, is hidden by it and lights none of it.
			dI *= mix( 1.0, smoothstep( 0.82, 1.0, abs( dA1.x - vAt.x ) / max( dSize, 1.0 ) ), step( dA0.z + 20.0, vAt.z ) );
			if ( dI < 1e-3 ) continue;
			vec3 dL = normalize( ( viewMatrix * vec4( dT / dF, 0.0 ) ).xyz );
			float dFc = saturate( dot( dN, dL ) );
			reflectedLight.directDiffuse += uStreamColor * dI * dFc * dFc * ( 1.0 + uSmallBurn * dConvex ) * BRDF_Lambert( material.diffuseContribution );
		}
		// The moon's rim: pale, on the faces turned to the moon, most where they are seen edge on.
		vec3 dMw = normalize( ( viewMatrix * vec4( uMoonWay, 0.0 ) ).xyz );
		float dRimM = uMoonRim.w * smoothstep( 0.0, 0.5, dot( dG, dMw ) ) * ( 0.25 + 0.75 * smoothstep( 0.3, 0.85, dGraze ) ) * mix( 1.0, vMoon, vGreat );
		// The stone under the moon's pale light: most of its color is the core's, so the rim keeps little of it.
		vec3 dRimStone = mix( vec3( dot( uStone, vec3( 0.2126, 0.7152, 0.0722 ) ) ), uStone, 0.35 );
		reflectedLight.directDiffuse += uMoonRimColor * mix( uMoonRim.z, 1.0, vMoon ) * dRimM * uMoonRim.x * BRDF_Lambert( dRimStone );
		// The glow the page draws behind the world: a faint warm line on the outline of what is far to each side, so a
		// mass in the planet's shadow still reads as a mass.
		// Not on a great piece, whose light is the way its faces turn: on one it drew a lit frame round a dark face.
		reflectedLight.directDiffuse += uGlow * pow( dGraze, uGlowRim.x ) * ( 1.0 - uGlowRim.y * dRimM ) * saturate( 1.0 - dFall * 40.0 ) * smoothstep( 120.0, 320.0, abs( vAt.x ) ) * ( 1.0 - vGreat );
		// The night, softly, from the visitor's side and above: enough to give a body its form, never its color.
		// A great piece takes more of it, so its form reads, and the left boulder most: its top planes are pale in the
		// picture.
		float dFillK = mix( 1.0, vBoulder > 0.5 && vSide < 0.0 ? uGreatFill.y : uGreatFill.x, vGreat );
		// The left boulder's top planes are pale in the picture: a pale light from above on them.
		if ( vBoulder > 0.5 && vSide < 0.0 ) {
			vec3 dUp = normalize( ( viewMatrix * vec4( -0.25, 1.0, 0.15, 0.0 ) ).xyz );
			reflectedLight.directDiffuse += uMoonRimColor * uBoulderLit.y * smoothstep( 0.35, 0.85, dot( dN, dUp ) ) * BRDF_Lambert( dRimStone );
			// And its right flank takes the light of the small stream that falls beside it, from the visitor's right.
			vec3 dBeside = normalize( ( viewMatrix * vec4( 1.0, 0.1, -0.05, 0.0 ) ).xyz );
			float dSideK = saturate( dot( dN, dBeside ) );
			reflectedLight.directDiffuse += uStreamColor * uBoulderLit.x * dSideK * dSideK * ( 1.0 + uGreatEdge * smoothstep( 0.2, 0.7, wLight.y * 2.0 - 1.0 ) ) * BRDF_Lambert( material.diffuseContribution );
		}
		reflectedLight.indirectDiffuse += uFill.rgb * dFillK * wLight.z * ( uFill.a + ( 1.0 - uFill.a ) * saturate( dot( dN, uFillDir ) ) ) * BRDF_Lambert( material.diffuseContribution );
	}`;

// What the night gives a piece, which the world's light then scales and tints (../../light.ts): here it is turned
// from the hollow's red toward a warm neutral, so a body lit by nothing else is a near black and never rust. The rock
// mirrors almost none of it.
export const NIGHT = /* glsl */ `
	iblIrradiance *= uNight;
	radiance *= uRockMirror;`;

// Further back is darker: a piece behind the stream's column fades toward the dark.
export const DEEP = /* glsl */ `
	if ( uShow > 0.5 ) {
		// ?debrisshow=: what one stored or worked out number is, to judge it: 1 the normal, 2 the face's own normal,
		// 3 how open, 4 the bounce, 5 the core seen, 6 the bend, 7 the moon seen and how fresh, 8 the albedo.
		vec3 dS = uShow < 1.5 ? geometryNormal * 0.5 + 0.5 : uShow < 2.5 ? dGeoN * 0.5 + 0.5 : uShow < 3.5 ? vec3( wLight.z ) : uShow < 4.5 ? wBounce * 20.0 : uShow < 5.5 ? vec3( vSeen ) : uShow < 6.5 ? vec3( wLight.y ) : uShow < 7.5 ? vec3( vMoon, vFresh, 0.0 ) : material.diffuseContribution * 2.0;
		reflectedLight.directDiffuse = dS * 0.25;
		reflectedLight.indirectDiffuse = vec3( 0.0 );
		reflectedLight.directSpecular = vec3( 0.0 );
		reflectedLight.indirectSpecular = vec3( 0.0 );
	} else if ( uStudio > 0.5 ) {
		// Seen alone, to judge a model: a plain light from the upper left and a little from everywhere.
		vec3 dKey = normalize( ( viewMatrix * vec4( -0.5, 0.7, 0.5, 0.0 ) ).xyz );
		reflectedLight.directDiffuse = material.diffuseContribution * ( 1.6 * saturate( dot( geometryNormal, dKey ) ) + 0.18 );
		reflectedLight.indirectDiffuse = vec3( 0.0 );
		reflectedLight.directSpecular = vec3( 0.0 );
		reflectedLight.indirectSpecular = vec3( 0.0 );
	} else {
		float dK = mix( uDeep.z, 1.0, smoothstep( uDeep.x, uDeep.y, vAt.z ) );
		reflectedLight.directDiffuse *= dK;
		reflectedLight.indirectDiffuse *= dK;
		reflectedLight.directSpecular *= dK;
		reflectedLight.indirectSpecular *= dK;
	}`;
