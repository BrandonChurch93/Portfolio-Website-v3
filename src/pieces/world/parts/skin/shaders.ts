import { GLOW, MAP } from './look';
import { SCALE } from '../../layout';

// The skin's own changes to the standard shader. Its map is laid over picture 9's pixels, so a texel's slope is a
// change of height across the picture: with how the place moves across the screen, that is the change of height
// across the screen, which is what tilts the normal (Mikkelsen's bump mapping from screen derivatives, without
// tangents). The map's third number is the stone's color as a multiple of its side's own, and the fourth how much of
// the cracks' light lies there.

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
	vec3 pale = mix( uPale, uDust, smoothstep( 0.95, 1.25, b ) ) * b;
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

// The cracks' light: deep in a cleft it is the light itself; on the rock beside it, light that lands on the stone.
export const EMIT = `
{
	float l = skinT.a * skinT.a;
	float inside = smoothstep( 0.32, 0.62, l );
	float onRock = 0.22 + 2.4 * dot( diffuseColor.rgb, vec3( 0.3333 ) );
	totalEmissiveRadiance += skinGlow( l ) * l * ${f(GLOW.power)} * uCoreLevel * mix( onRock, 1.0, inside ) * ( 1.0 - skinPale );
}`;
