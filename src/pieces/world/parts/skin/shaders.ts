import { CRESCENT, CRUST_TOP, GLOW, MAP, NIGHT_SIDE, PALE_SHADE, PALE_WARM, TERMINATOR } from './look';
import { MOONWARD, RIM, SCALE, WORLD } from '../../layout';

// The skin's own changes to the standard shader. Its map is laid over picture 9's pixels, so a texel's slope is a
// change of height across the picture: with how the place moves across the screen, that is the change of height
// across the screen, which is what tilts the normal (Mikkelsen's bump mapping from screen derivatives, without
// tangents). The map's third number is the stone's color as a multiple of its side's own. Its fourth, on the dark
// side, is the cracks' light: over half, inside a cleft, the light itself; under half, the light lying on the rock
// beside one. On the pale side, under half it is how much of the place is the red brown rock under the crust, seen in
// section or in a chip, and over half how much of it is the land's sand lying in a hollow. The dark side's broken
// faces are found here instead, by how far each face turns from the planet's outer surface, and its great slab of
// crust by where it lies past the rock's torn line in the picture.

const f = (v: number): string => v.toFixed(4);
const moon = `normalize( vec3( ${MOONWARD.map((v) => f(v)).join(', ')} ) )`;

export const VERT_PARS = `
attribute vec2 atlas;
varying vec2 vAtlas;
varying vec3 vSkinP;
varying vec3 vSkinN;
uniform vec4 uSkinPlace;`;
export const VERT = `
vAtlas = atlas;
vSkinP = uSkinPlace.xyz + position * uSkinPlace.w;
vSkinN = objectNormal;`;

export const FRAG_PARS = `
varying vec2 vAtlas;
uniform sampler2D uSkinMap;
uniform vec3 uSkinMapSize;
uniform vec3 uPale;
uniform vec3 uDust;
uniform vec3 uDark;
uniform vec3 uUnder;
uniform vec3 uSand;
varying vec3 vSkinP;
varying vec3 vSkinN;
uniform float uGlowRock;
uniform vec3 uGlowPale;
uniform vec3 uGlowHot;
uniform vec3 uGlowFlame;
uniform vec3 uGlowEmber;
uniform vec3 uKnotA;
uniform vec3 uKnotB;
uniform vec4 uKnot;
uniform vec3 uDarkLight;
uniform vec3 uDarkFrom;
uniform vec2 uDarkAt;
uniform float uTorn[ 67 ];
vec4 skinT;
float skinPale;
float skinSlab;
vec3 skinShell;
vec3 skinGlow( float l ) {
	vec3 c = uGlowEmber;
	c = mix( c, uGlowFlame, smoothstep( ${f(GLOW.ramp[3][1])}, ${f(GLOW.ramp[2][1])}, l ) );
	c = mix( c, uGlowHot, smoothstep( ${f(GLOW.ramp[2][1])}, ${f(GLOW.ramp[1][1])}, l ) );
	return mix( c, uGlowPale, smoothstep( ${f(GLOW.ramp[1][1])}, ${f(GLOW.ramp[0][1])}, l ) );
}
// The rock's torn line on the dark side, across, at a place down picture 9 (from uTorn[0] down, a value each two rows).
float skinTornAt( float py ) {
	float k = clamp( ( py - uTorn[ 0 ] ) * 0.5, 0.0, 64.999 );
	int i = int( k );
	return mix( uTorn[ i + 1 ], uTorn[ min( i + 2, 66 ) ], fract( k ) ) + 2.2 * sin( py * 0.37 + 1.3 ) + 1.3 * sin( py * 0.83 + 0.4 ) + 0.7 * sin( py * 2.1 + 2.2 );
}`;

export const COLOR = `
skinT = texture2D( uSkinMap, vAtlas );
skinPale = step( uSkinMapSize.z, vAtlas.x * uSkinMapSize.x );
{
	float b = skinT.b * 2.0;
	float under = clamp( 1.0 - 2.0 * skinT.a, 0.0, 1.0 ), sand = clamp( 2.0 * skinT.a - 1.0, 0.0, 1.0 );
	vec3 pale = mix( mix( uPale, uDust, smoothstep( 0.92, 1.28, b ) ), uUnder, under ) * b;
	pale = mix( pale, uSand * ( 0.8 + 0.2 * b ), sand );
	vec3 sg = vec3( vSkinP.x / ${f(WORLD.half ** 2)}, min( 0.0, vSkinP.y + ${f(RIM)} ) / ${f(WORLD.deep ** 2)}, vSkinP.z / ${f(WORLD.half ** 2)} );
	float sl = length( sg ), nl = length( vSkinN );
	skinShell = sl > 1e-12 ? sg / sl : vec3( 0.0, 1.0, 0.0 );
	float up = nl > 1e-6 ? dot( vSkinN / nl, skinShell ) : 1.0;
	// The dark side's crust: past the rock's torn line at the top, the great slab, and on the broken faces of the edge,
	// the crust in section. Both are the crust's weathered pale top, with the red brown under it showing in the faces.
	vec2 pic = uDarkAt + vAtlas * uSkinMapSize.xy / ${f(MAP.perPixel)};
	skinSlab = ( 1.0 - skinPale ) * smoothstep( 1.4, 2.2, pic.x - skinTornAt( pic.y ) ) * ( 1.0 - smoothstep( 412.0, 418.0, pic.y ) );
	float face = smoothstep( 0.62, 0.4, up );
	vec3 crust = uPale * ${f(CRUST_TOP.pale)} * ( 0.55 + 0.45 * b );
	vec3 dark = mix( uDark * b, mix( crust, uUnder * ( 0.4 + 0.4 * b ), ${f(CRUST_TOP.under)} * face ), max( face, skinSlab ) );
	diffuseColor.rgb = mix( dark, pale, skinPale );
}`;

export const NORMAL = `
{
	vec2 s = skinT.rg * 2.0 - 1.0;
	s = sign( s ) * s * s * ${f(MAP.slope * SCALE)};
	vec2 pic = vAtlas * uSkinMapSize.xy / ${f(MAP.perPixel)};
	float dHdx = dot( s, dFdx( pic ) ), dHdy = dot( s, dFdy( pic ) );
	vec3 dpdx = dFdx( - vViewPosition ), dpdy = dFdy( - vViewPosition );
	vec3 r1 = cross( dpdy, normal ), r2 = cross( normal, dpdx );
	float det = dot( dpdx, r1 );
	vec3 bent = abs( det ) * normal - sign( det ) * ( dHdx * r1 + dHdy * r2 );
	float bl = length( bent );
	if ( abs( det ) > 1e-24 && bl > 1e-24 ) normal = bent / bl;
}`;

// The cracks' light: deep in a cleft it is the light itself, pale gold in every cleft and dimmer in a thin one, so a
// thin arm is not orange; on the rock beside it, light that lands on the stone, so it takes the stone's own color.
// Round the knot the rock is lit as from one source along the hot arm, a smooth pool that falls off with distance and
// lands on each face by how it is turned to the source, so it is lumpy only as the relief is; and at the junction a
// white gold point where the clefts open widest.
export const EMIT = `
if ( skinPale < 0.5 ) {
	float a = skinT.a, l = clamp( a * 2.0 - 1.0, 0.0, 1.0 ), r = clamp( a * 2.0, 0.0, 1.0 ) * ( 1.0 - skinSlab );
	vec3 warm = mix( uGlowHot, uGlowPale, 0.45 );
	vec3 onRock = warm * r * uGlowRock * diffuseColor.rgb;
	vec3 ab = uKnotB - uKnotA, ka = vSkinP - uKnotA;
	float t = clamp( dot( ka, ab ) / max( dot( ab, ab ), 1e-4 ), 0.0, 1.0 );
	vec3 to = uKnotA + ab * t - vSkinP;
	float d = length( to ), dj = length( vSkinP - uKnotA );
	vec3 lv = ( viewMatrix * vec4( to / max( d, 1e-4 ), 0.0 ) ).xyz;
	float ll = length( lv );
	float wrap = ll > 1e-6 ? clamp( ( dot( normal, lv / ll ) + 0.25 ) / 1.25, 0.0, 1.0 ) : 0.0;
	float fall = exp( - pow( d / uKnot.y, 1.4 ) ) * mix( 1.0, 0.65, t );
	vec3 pool = mix( uGlowFlame, uGlowHot, 0.6 ) * uKnot.x * fall * wrap * diffuseColor.rgb;
	float hot = exp( - pow( max( 0.0, dj - 2.0 ) / uKnot.w, 2.0 ) );
	float into = smoothstep( 0.38, 0.62, a );
	vec3 glow = mix( uGlowHot, uGlowPale, smoothstep( 0.0, 0.22, l + hot ) );
	vec3 cleft = max( onRock, glow * pow( l, 1.2 ) * ${f(GLOW.power)} * ( 1.0 + uKnot.z * hot ) );
	vec3 junction = uGlowPale * uKnot.z * hot * hot * into;
	totalEmissiveRadiance += ( mix( onRock, cleft, step( 0.5, a ) ) + pool + junction ) * uCoreLevel;
}`;

// The moon rakes the pale side ever lower toward the tear and the foot, and there its rough ground, pits and lumps
// shade one another until little but their lips is lit: the light falls away much faster than a smooth ball's would,
// as picture 9's does. Worked out from the planet's outer surface, so a crater's wall turned to the moon stays lit;
// but on the broken crust by the torn line from each slab's own tilt, so the tops tipped to the moon catch it.
export const NIGHT = `
{
	vec3 mw = ${moon};
	float mn = dot( skinShell, mw );
	float fl = length( vSkinN ), fm = fl > 1e-6 ? dot( vSkinN / fl, mw ) : 1.0;
	float crustK = 0.0;
	#ifdef WORLD_BAKED
		crustK = wLight.w;
	#endif
	float high = smoothstep( ${f(TERMINATOR.from)}, ${f(TERMINATOR.to)}, mn );
	float low = mix( mix( ${f(TERMINATOR.low)}, ${f(TERMINATOR.high)}, high ), ${f(TERMINATOR.crust)}, crustK );
	float ndl = dot( normal, normalize( ( viewMatrix * vec4( mw, 0.0 ) ).xyz ) );
	float rake = mix( 1.0, smoothstep( low, low + ${f(TERMINATOR.soft)}, ndl ) * ( ${f(TERMINATOR.floor)} + ${f(1 - TERMINATOR.floor)} * high ) * mix( 1.0, 0.3 + 0.7 * smoothstep( ${f(TERMINATOR.crust)}, ${f(TERMINATOR.crust + 0.25)}, ndl ), crustK ), skinPale );
	// A broken face turned from the moon takes none of it: the shadow map, nearly edge on there, lit it in flickering
	// teeth, one to a row of the mesh.
	rake *= smoothstep( -0.04, 0.22, fm );
	float seen = 1.0;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
		seen = receiveShadow ? getShadow( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, directionalLightShadows[ 0 ].shadowIntensity, directionalLightShadows[ 0 ].shadowBias, directionalLightShadows[ 0 ].shadowRadius, vDirectionalShadowCoord[ 0 ] ) : 1.0;
	#endif
	// On the pale side the moon's shadow is drawn crisp, as picture 9's crescents are: the shadow map's soft edge is
	// narrowed to a third of its width.
	rake *= mix( 1.0, smoothstep( 0.33, 0.67, seen ) / max( seen, 0.05 ), skinPale );
	reflectedLight.directDiffuse *= rake;
	reflectedLight.directSpecular *= rake;
	// Where the moon's shadow falls on ground turned to it, the night and the bounce are held down too, so the
	// crescent in a crater is near black and its edge is the shadow's own.
	vec3 mv = ( viewMatrix * vec4( mw, 0.0 ) ).xyz;
	float toMoon = smoothstep( 0.04, 0.2, dot( normal, normalize( mv ) ) ) * smoothstep( 0.05, 0.25, mn );
	reflectedLight.indirectDiffuse *= mix( 1.0, mix( ${f(CRESCENT)}, 1.0, seen ), toMoon * skinPale );
	// The dark side and the slab: the night from the visitor's side and above at the left, which shows the relief, and
	// a sliver along the outline from the glow behind the world.
	vec3 fv = ( viewMatrix * vec4( normalize( uDarkFrom ), 0.0 ) ).xyz;
	float fill = saturate( dot( normal, normalize( fv ) ) );
	float rimK = smoothstep( 0.78, 0.97, 1.0 - saturate( dot( normal, geometryViewDir ) ) );
	reflectedLight.directDiffuse += ( 1.0 - skinPale ) * BRDF_Lambert( material.diffuseContribution ) * mix( uGlowPale, vec3( 1.0 ), 0.35 ) * ( mix( uDarkLight.x * fill * fill, uDarkLight.z * fill * fill * fill, skinSlab ) + uDarkLight.y * rimK );
}
// The dark side reflects little of the night: at its outline, seen edge on, it drew a thin lit line round the planet
// that picture 9 does not have.
reflectedLight.indirectSpecular *= mix( 0.2, 1.0, skinPale );
reflectedLight.indirectDiffuse = mix( reflectedLight.indirectDiffuse * ${f(NIGHT_SIDE)}, reflectedLight.indirectDiffuse * ${f(PALE_SHADE)} * vec3( ${PALE_WARM.map(f).join(', ')} ), skinPale );`;
