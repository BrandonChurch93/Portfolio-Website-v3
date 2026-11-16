import { GLOW, MAP, NIGHT_SIDE, PALE_SHADE } from './look';
import { SCALE } from '../../layout';

// The skin's own changes to the standard shader. Its map is laid over picture 9's pixels, so a texel's slope is a
// change of height across the picture: with how the place moves across the screen, that is the change of height
// across the screen, which is what tilts the normal (Mikkelsen's bump mapping from screen derivatives, without
// tangents). The map's third number is the stone's color as a multiple of its side's own. Its fourth, on the dark
// side, is the cracks' light: over half, inside a cleft, the light itself; under half, the light lying on the rock
// beside one. On the pale side it is how much of the place is the rock under the crust, seen in section.

const f = (v: number): string => v.toFixed(4);

export const VERT_PARS = `
attribute vec2 atlas;
varying vec2 vAtlas;`;
export const VERT = `
vAtlas = atlas;`;

export const FRAG_PARS = `
varying vec2 vAtlas;
uniform sampler2D uSkinMap;
uniform vec3 uSkinMapSize;
uniform vec3 uPale;
uniform vec3 uDust;
uniform vec3 uDark;
uniform vec3 uUnder;
uniform float uGlowRock;
uniform vec3 uGlowPale;
uniform vec3 uGlowHot;
uniform vec3 uGlowFlame;
uniform vec3 uGlowEmber;
vec4 skinT;
float skinPale;
vec3 skinGlow( float l ) {
	vec3 c = uGlowEmber;
	c = mix( c, uGlowFlame, smoothstep( ${f(GLOW.ramp[3][1])}, ${f(GLOW.ramp[2][1])}, l ) );
	c = mix( c, uGlowHot, smoothstep( ${f(GLOW.ramp[2][1])}, ${f(GLOW.ramp[1][1])}, l ) );
	return mix( c, uGlowPale, smoothstep( ${f(GLOW.ramp[1][1])}, ${f(GLOW.ramp[0][1])}, l ) );
}`;

export const COLOR = `
skinT = texture2D( uSkinMap, vAtlas );
skinPale = step( uSkinMapSize.z, vAtlas.x * uSkinMapSize.x );
{
	float b = skinT.b * 2.0;
	vec3 pale = mix( mix( uPale, uDust, smoothstep( 0.92, 1.28, b ) ), uUnder, skinT.a ) * b;
	diffuseColor.rgb = mix( uDark * b, pale, skinPale );
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

// The cracks' light: deep in a cleft it is the light itself; on the rock beside it, light that lands on the stone,
// so it takes the stone's own color.
export const EMIT = `
{
	float a = skinT.a, l = clamp( a * 2.0 - 1.0, 0.0, 1.0 ), r = clamp( a * 2.0, 0.0, 1.0 );
	vec3 onRock = skinGlow( 0.18 + 0.5 * r ) * r * uGlowRock * diffuseColor.rgb;
	// Over half, a cleft: never darker than the most light the rock beside one holds, so the filtering between a
	// cleft and its lip leaves no dark ring.
	vec3 cleft = max( onRock, skinGlow( l ) * l * ${f(GLOW.power)} );
	totalEmissiveRadiance += mix( onRock, cleft, step( 0.5, a ) ) * uCoreLevel * ( 1.0 - skinPale );
}`;

export const NIGHT = `
reflectedLight.indirectDiffuse = mix( reflectedLight.indirectDiffuse * ${f(NIGHT_SIDE)}, mix( reflectedLight.indirectDiffuse, vec3( dot( reflectedLight.indirectDiffuse, vec3( 0.3333 ) ) ), 0.25 ) * ${f(PALE_SHADE)}, skinPale );`;
