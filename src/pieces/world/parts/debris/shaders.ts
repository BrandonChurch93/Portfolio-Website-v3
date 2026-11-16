import { KIND, MOTION } from './motion';

// The shader of what broke away, laid into a standard material before the world's light (../../light.ts).
// Every piece is drawn from its model where the table of pieces (a texture written once) puts it, and moved by the
// clock alone (./motion.ts): no buffer is written after the piece is made. Its fine breaks come from the detail map,
// read in the piece's own frame from three sides, as small shadows. The stream and the small streams light it.

const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);
const M = MOTION;

export const VERT_PARS = /* glsl */ `
uniform highp sampler2D uPieces;
uniform float uTime;
uniform vec3 uCoreAt;
attribute float aPiece;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vWorldP;
varying float vSide;
varying float wBedTone;
const float TAU = 6.2831853;
float dHash( float n ) { return fract( sin( n * 12.9898 + 4.1414 ) * 43758.5453 ); }
vec3 dTurnQ( vec4 q, vec3 v ) { return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v ); }
vec3 dTurn( vec3 axis, float a, vec3 v ) { float c = cos( a ), s = sin( a ); return v * c + cross( axis, v ) * s + axis * dot( axis, v ) * ( 1.0 - c ); }
vec3 dTurnY( float a, vec3 v ) { float c = cos( a ), s = sin( a ); return vec3( v.x * c + v.z * s, v.y, - v.x * s + v.z * c ); }
// A great piece of a family: how far it has risen and slid.
vec3 dPlate( float fam, float t ) {
	float a = dHash( fam * 1.7 ) * TAU, b = dHash( fam * 2.9 ) * TAU, c = dHash( fam * 5.3 ) * TAU;
	return vec3( ${f(M.plate.slide)} * sin( TAU * t / ${f(M.plate.slideT)} + a ), ${f(M.plate.rise)} * sin( TAU * t / ${f(M.plate.riseT)} + b ), 0.35 * ${f(M.plate.slide)} * sin( TAU * t / ${f(M.plate.slideT * 1.37)} + c ) );
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
		float far = max( length( rel.xz ), 1.0 );
		dRound = TAU * t / ( ${f(M.whirl.period)} * sqrt( far / ${f(M.whirl.at)} ) );
		vec3 now = dTurnY( dRound, rel );
		at = vec3( now.x, dA.y - ${f(M.whirl.tilt)} * ( now.z - rel.z ), now.z + uCoreAt.z );
	} else if ( kind < ${f(KIND.fall + 0.5)} ) {
		float span = ${f(M.fall.from - M.fall.to)}, y = ${f(M.fall.from)} - mod( ${f(M.fall.from)} - dA.y + dE.y * t, span );
		at.y = y;
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
	wBedTone = aBounce.w;`;

export const FRAG_PARS = /* glsl */ `
uniform sampler2D uDetail;
uniform vec3 uRock;
uniform vec3 uRust;
uniform vec3 uSkinPale;
uniform vec3 uSkinDark;
uniform vec4 uLook;
uniform vec3 uStreamA[ 7 ];
uniform vec3 uStreamB[ 7 ];
uniform vec2 uStreamI[ 7 ];
uniform vec3 uStreamColor;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vWorldP;
varying float vSide;
varying float wBedTone;
// The detail map read from three sides of the piece in its own frame, at two sizes: its height and its tone.
vec2 dDetail( vec3 p, vec3 n ) {
	vec3 w = pow( abs( n ), vec3( 4.0 ) );
	w /= max( w.x + w.y + w.z, 1e-5 );
	vec2 a = texture2D( uDetail, p.yz / uLook.x ).rg * w.x + texture2D( uDetail, p.zx / uLook.x ).rg * w.y + texture2D( uDetail, p.xy / uLook.x ).rg * w.z;
	vec2 b = texture2D( uDetail, p.yz / uLook.y + 0.37 ).rg * w.x + texture2D( uDetail, p.zx / uLook.y + 0.37 ).rg * w.y + texture2D( uDetail, p.xy / uLook.y + 0.37 ).rg * w.z;
	return vec2( a.x + 0.45 * b.x, mix( a.y, b.y, 0.3 ) );
}`;

// The rock's color: its bed's tone, the map's, the planet's outer surface where it shows, edges worn bright and
// creases dark.
export const COLOR = /* glsl */ `
	vec2 dD = dDetail( vLocal, vLocalN );
	float dBed = wBedTone;
	vec3 dRock = mix( uRock, uRust, smoothstep( 0.55, 0.95, dBed ) * 0.8 ) * ( 0.78 + 0.42 * dBed );
	dRock *= 0.82 + 0.36 * dD.y;
	vec3 dSkin = vSide > 0.0 ? uSkinPale : uSkinDark;
	dRock = mix( dRock, dSkin * ( 0.85 + 0.3 * dD.y ), wLight.w );
	float dBend = wLight.y * 2.0 - 1.0;
	dRock *= 1.0 + uLook.z * max( dBend, 0.0 ) - 0.35 * max( - dBend, 0.0 );
	diffuseColor.rgb = dRock;`;

// The map's height as small shadows: the normal is bent by how the height changes across the pixel, and the
// bending fades where a pixel covers more of the piece than the map holds.
export const NORMAL = /* glsl */ `
	{
		float dFoot = length( fwidth( vLocal ) );
		float dK = uLook.w * ( 1.0 - smoothstep( 0.6, 2.4, dFoot ) ) * ( 1.0 - 0.6 * wLight.w );
		vec3 dSx = dFdx( - vViewPosition ), dSy = dFdy( - vViewPosition );
		vec3 dR1 = cross( dSy, normal ), dR2 = cross( normal, dSx );
		float dDet = dot( dSx, dR1 ) * faceDirection;
		vec2 dH = vec2( dFdx( dD.x ), dFdy( dD.x ) ) * dK;
		vec3 dGrad = sign( dDet ) * ( dH.x * dR1 + dH.y * dR2 );
		normal = normalize( abs( dDet ) * normal - dGrad );
	}`;

// The stream down the middle and the small streams: lines of light, each lighting what faces it, strongest near it.
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
		vec3 dIrr = uStreamColor * dE * mix( 1.0, wLight.z, 0.5 );
		reflectedLight.directDiffuse += dIrr * saturate( dC * 0.85 + 0.15 ) * BRDF_Lambert( material.diffuseContribution );
		reflectedLight.directSpecular += dIrr * saturate( dC ) * BRDF_GGX( dL, geometryViewDir, geometryNormal, material );
	}`;
