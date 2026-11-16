import { CLEFT, CRACK_CELL, CRESCENT, CRUST_TOP, GLOW, MAP, NIGHT_SIDE, PALE_SHADE, PALE_WARM, TERMINATOR, WEATHER, DARK_FACE } from './look';
import { MOONWARD, PICTURE, RIM, SCALE, WORLD } from '../../layout';

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
varying float vBlock;
uniform vec4 uSkinPlace;`;
export const VERT = `
vAtlas = atlas;
#ifdef WORLD_BAKED
	vBlock = aBounce.w;
#else
	vBlock = 0.0;
#endif
vSkinP = uSkinPlace.xyz + position * uSkinPlace.w;
vSkinN = objectNormal;`;

export const FRAG_PARS = `
varying vec2 vAtlas;
uniform sampler2D uSkinMap;
uniform vec4 uSkinMapSize;
uniform vec3 uPale;
uniform vec3 uDust;
uniform vec3 uDark;
uniform vec3 uUnder;
uniform vec3 uSand;
varying vec3 vSkinP;
varying vec3 vSkinN;
varying float vBlock;
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
uniform sampler2D uCkSeg;
uniform sampler2D uCkCell;
uniform vec4 uCkGrid;
uniform vec2 uCkSize;
vec4 skinT;
vec2 skinPic;
float ckQ;
float ckW;
float ckHeat;
float ckBeside;
float ckDim;
float ckPx;
vec2 ckSide;
vec3 ckDu;
vec3 ckDv;
float skinPale;
float skinSlab;
vec3 skinShell;
vec3 skinGlow( float l ) {
	vec3 c = uGlowEmber;
	c = mix( c, uGlowFlame, smoothstep( ${f(GLOW.ramp[3][1])}, ${f(GLOW.ramp[2][1])}, l ) );
	c = mix( c, uGlowHot, smoothstep( ${f(GLOW.ramp[2][1])}, ${f(GLOW.ramp[1][1])}, l ) );
	return mix( c, uGlowPale, smoothstep( ${f(GLOW.ramp[1][1])}, ${f(GLOW.ramp[0][1])}, l ) );
}
float ckHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float ckNoise( vec2 p ) {
	vec2 i = floor( p ), f = fract( p );
	f = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( ckHash( i ), ckHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( ckHash( i + vec2( 0.0, 1.0 ) ), ckHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}
// The cracks near a place of picture 9 (pic, in its pixels; px is how many of them a pixel of the screen covers):
// how far into the nearest cleft it is (ckQ, 0 on its middle line, 1 at its lip), that cleft's half width, its heat
// and which way its middle line lies (ckSide, from the line toward the place), and the light the lit clefts round it
// lay on the rock here (ckBeside). The lip is chipped: its width wanders at two grains, and a wide cleft is bitten.
// A cleft thinner than the screen can show is drawn as wide as that and dimmer by its share.
void skinCracks( vec2 pic, float px ) {
	ckQ = 9.0; ckW = 1.0; ckHeat = 0.0; ckBeside = 0.0; ckDim = 1.0; ckSide = vec2( 0.0 );
	vec2 c = ( pic - uCkGrid.xy ) / uCkGrid.z;
	if ( c.x < 0.0 || c.y < 0.0 || c.x >= uCkSize.x || c.y >= uCkSize.y ) return;
	ivec2 ci = ivec2( c );
	float jag = 0.78 + 0.34 * ckNoise( pic * 0.42 ) + 0.1 * ckNoise( pic * 1.4 + 7.0 ), bite = ckNoise( pic * 1.9 + 3.0 ) - 0.5;
	float lean = 1e-3;
	for ( int k = 0; k < ${CRACK_CELL.most / 4}; k ++ ) {
		vec4 ids = texelFetch( uCkCell, ivec2( ci.x * ${CRACK_CELL.most / 4} + k, ci.y ), 0 );
		for ( int j = 0; j < 4; j ++ ) {
			float id = ids[ j ];
			if ( id < 0.0 ) break;
			vec4 s0 = texelFetch( uCkSeg, ivec2( int( id ), 0 ), 0 );
			vec4 s1 = texelFetch( uCkSeg, ivec2( int( id ), 1 ), 0 );
			vec2 ab = s0.zw - s0.xy, ap = pic - s0.xy;
			float t = clamp( dot( ap, ab ) / max( dot( ab, ab ), 1e-6 ), 0.0, 1.0 );
			vec2 dv = ap - ab * t;
			float d = length( dv ), w0 = mix( s1.x, s1.y, t ), heat = mix( s1.z, s1.w, t );
			float w = w0 * mix( 1.0, jag + 0.5 * bite * smoothstep( 0.8, 2.0, w0 ), smoothstep( 0.2, 0.9, w0 ) );
			float we = max( w, 0.75 * px ), dim = w / we, q = d / we;
			if ( q < ckQ ) { ckQ = q; ckW = we; ckDim = dim; ckHeat = heat * pow( dim, 0.8 ); ckSide = d > 1e-4 ? dv / d : vec2( 0.0 ); }
			float fall = ${f(CRACK_CELL.fall[0])} + ${f(CRACK_CELL.fall[1])} * w0;
			ckBeside = max( ckBeside, heat * dim * exp( - max( 0.0, d - we ) / fall ) * smoothstep( -0.2, 0.25, q - 1.0 ) );
		}
	}
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
skinPic = uDarkAt + vAtlas * uSkinMapSize.xy / uSkinMapSize.w;
{
	// How the world moves under a step of one of picture 9's pixels across and down: which way the clefts' light
	// reaches the rock beside them.
	vec2 ex = dFdx( skinPic ), ey = dFdy( skinPic );
	vec3 Px = dFdx( vSkinP ), Py = dFdy( vSkinP );
	float det = ex.x * ey.y - ex.y * ey.x;
	float sd = abs( det ) > 1e-12 ? 1.0 / det : 0.0;
	ckDu = ( Px * ey.y - Py * ex.y ) * sd;
	ckDv = ( Py * ex.x - Px * ey.x ) * sd;
	float px = length( fwidth( skinPic ) ) * 0.7;
	ckPx = px;
	if ( skinPale < 0.5 ) skinCracks( skinPic, px );
	else { ckQ = 9.0; ckW = 1.0; ckHeat = 0.0; ckBeside = 0.0; ckDim = 1.0; ckSide = vec2( 0.0 ); }
	// The cracks are cut in the skin, not in the crust's blocks, which only take the light that leaves them.
	if ( vBlock > 0.25 ) ckQ = 9.0;
}
{
	float b = skinT.b * 2.0;
	float under = clamp( 1.0 - 2.0 * skinT.a, 0.0, 1.0 ), sand = clamp( 2.0 * skinT.a - 1.0, 0.0, 1.0 );
	vec3 pale = mix( mix( uPale, uDust, smoothstep( 0.92, 1.28, b ) ), uUnder, under ) * b;
	pale *= vec3( ${WEATHER.map(f).join(', ')} );
	pale = mix( pale, uSand * ( 0.8 + 0.2 * b ), sand );
	vec3 sg = vec3( vSkinP.x / ${f(WORLD.half ** 2)}, min( 0.0, vSkinP.y + ${f(RIM)} ) / ${f(WORLD.deep ** 2)}, vSkinP.z / ${f(WORLD.half ** 2)} );
	float sl = length( sg ), nl = length( vSkinN );
	skinShell = sl > 1e-12 ? sg / sl : vec3( 0.0, 1.0, 0.0 );
	float up = nl > 1e-6 ? dot( vSkinN / nl, skinShell ) : 1.0;
	// The dark side's crust: past the rock's torn line at the top, the great slab, and on the broken faces of the edge,
	// the crust in section. Both are the crust's weathered pale top, with the red brown under it showing in the faces.
	float face = smoothstep( 0.62, 0.4, up );
	// The dark side's oldest stone is laid in strata: thin bands of slightly differing tone that wander and pinch out,
	// to be found close up and never seen from across the room.
	float band = skinPic.y * 0.62 + 4.0 * ckNoise( skinPic * vec2( 0.02, 0.05 ) ) + 1.5 * ckNoise( skinPic * 0.11 );
	float strata = 1.0 + ${f(DARK_FACE.strata)} * ( smoothstep( 0.2, 0.8, ckNoise( vec2( band, skinPic.x * 0.03 ) ) ) - 0.5 ) * ( 1.0 - skinPale );
	vec3 dark = mix( uDark * b * strata, uUnder * ( 0.4 + 0.3 * b ), face );
	// In a cleft the stone is its walls, which its own light lights, and an unlit fissure is a dark cut.
	dark *= 1.0 - 0.65 * ( 1.0 - smoothstep( 0.9, 1.02, ckQ ) ) * ( ckHeat > 0.0 ? 1.0 : 0.25 + 0.75 * ckDim );
	vec3 col = mix( dark, pale, skinPale );
	// A block of the crust: its weathered top, the pale dust on the pale side and a pale grey crust on the dark, over
	// its broken section of the planet's red brown stone.
	skinSlab = step( 0.25, vBlock ) * ( 1.0 - skinPale );
	// The skin's own edge where it breaks before a block is the crust in section too.
	float top = vBlock > 0.25 ? clamp( ( vBlock - 0.5 ) * 2.0, 0.0, 1.0 ) : 0.0;
	vec3 grey = mix( vec3( dot( uPale, vec3( 0.2126, 0.7152, 0.0722 ) ) ), uPale, ${f(CRUST_TOP.tint)} ) * ${f(CRUST_TOP.pale)};
	vec3 crustTop = mix( grey * ( 0.7 + 0.3 * b ), uPale * b, skinPale );
	vec3 section = uUnder * ( 0.62 + 0.3 * b );
	diffuseColor.rgb = mix( col, mix( section, crustTop, top ), step( 0.1, vBlock ) );
}`;

export const NORMAL = `
{
	vec2 s = skinT.rg * 2.0 - 1.0;
	s = sign( s ) * s * s * ${f(MAP.slope * SCALE)};
	// The cleft: two walls that fall from its lips to its floor, and a lip raised a little along each edge, as a change
	// of height across picture 9 (the cleft's own sizes are in its pixels, its depth in units).
	if ( ckQ < 1.6 ) {
		float q = ckQ, D = ${f(CLEFT.deep * PICTURE.unit)} * ckW;
		float dq = q < 1.0 ? D * 1.3 * pow( max( 1.0 - q, 1e-3 ), 0.3 ) : 0.0;
		float lu = ( q - ${f(CLEFT.lip[1])} ) / ${f(CLEFT.lip[2])};
		dq -= ${f(CLEFT.lip[0])} * ckW * ${f(PICTURE.unit)} * 2.0 * lu * exp( - lu * lu ) / ${f(CLEFT.lip[2])};
		s += ckSide * clamp( dq / max( ckW, 1e-3 ), -6.0, 6.0 ) * ${f(SCALE)} * ( ckHeat > 0.0 ? 1.0 : 0.3 + 0.4 * ckDim );
	}
	// And a fine grain on the dark side, finer than the map holds, in two sizes, which only a close look finds.
	if ( skinPale < 0.5 && vBlock < 0.1 ) {
		vec2 q = skinPic * ${f(DARK_FACE.grain[0])};
		float g0 = ckNoise( q ) + 0.5 * ckNoise( q * 3.1 + 7.0 );
		vec2 gs = vec2( ckNoise( q + vec2( 0.25, 0.0 ) ) + 0.5 * ckNoise( ( q + vec2( 0.25, 0.0 ) ) * 3.1 + 7.0 ) - g0, ckNoise( q + vec2( 0.0, 0.25 ) ) + 0.5 * ckNoise( ( q + vec2( 0.0, 0.25 ) ) * 3.1 + 7.0 ) - g0 ) * 4.0;
		s += gs * ${f(DARK_FACE.grain[1] * DARK_FACE.grain[0])} * ${f(SCALE)};
	}
	vec2 pic = vAtlas * uSkinMapSize.xy / uSkinMapSize.w;
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
	// Which wall of a cleft faces the visitor: the planet turns away toward its outline, so the wall on the outline's
	// side of the middle line looks back in toward him and shows wide, and the other is turned away and shows narrow.
	vec2 np = vec2( skinShell.x, - skinShell.y );
	float ob = length( np );
	float fw = ob > 1e-4 ? dot( ckSide, np / ob ) * ob : 0.0;
	float qv = ckQ / ( 1.0 + ${f(CLEFT.open)} * max( fw, 0.0 ) ) * ( 1.0 + ${f(CLEFT.shut)} * max( - fw, 0.0 ) );
	float heat = ckHeat, hw = pow( heat, 1.4 );
	float fl = mix( ${f(CLEFT.floor[0])}, ${f(CLEFT.floor[1])}, heat );
	float heart = 1.0 - smoothstep( fl * 0.55, fl * 1.3, qv );
	float wt = clamp( ( qv - fl ) / max( 1.0 - fl, 1e-3 ), 0.0, 1.0 );
	// The walls take the heart's light, less the further up toward the lips; the wall turned to the visitor shows
	// all of it, the other only near the floor. The lips catch it on their edge, more on the far lip, which looks
	// down into the cleft, chipped as they are.
	float wall = ( 1.0 - smoothstep( 0.9, 1.02, qv ) ) * pow( 1.0 - wt, 2.1 ) * ( 1.0 - heart ) * mix( 0.55, 1.0, smoothstep( -0.3, 0.3, fw ) );
	float lip = exp( - pow( ( qv - 1.0 ) / 0.1, 2.0 ) ) * ( 0.4 + 0.6 * ckNoise( skinPic * 0.9 + 11.0 ) ) * mix( 0.35, 1.0, smoothstep( 0.2, -0.3, fw ) ) * smoothstep( 0.7, 1.6, ckW );
	// A cleft the screen draws only a pixel or two wide has no walls or lips to show: its light is one soft line, and
	// drawn with them it broke into dashes as its lips fell between the pixels.
	float fine = 1.0 - smoothstep( 1.4, 3.0, ckW / max( ckPx, 1e-4 ) );
	heart = mix( heart, exp( - ckQ * ckQ * 4.5 ), fine );
	wall *= 1.0 - fine;
	lip *= 1.0 - fine;
	vec3 cleft = uGlowPale * heart * ${f(CLEFT.heart)} * hw + mix( uGlowHot, uGlowFlame, wt ) * wall * ${f(CLEFT.wall)} * hw + mix( uGlowFlame, uGlowEmber, 0.4 ) * lip * ${f(CLEFT.rim)} * hw;
	// Beside it, the light that leaves it lands on the rock by how each face is turned to it.
	vec3 toward = - ( ckDu * ckSide.x + ckDv * ckSide.y ) + skinShell * 0.6;
	vec3 tv = ( viewMatrix * vec4( toward, 0.0 ) ).xyz;
	float tl = length( tv );
	vec3 soft = normalize( mix( normal, nonPerturbedNormal, 0.3 ) );
	float facing = tl > 1e-6 ? clamp( ( dot( soft, tv / tl ) + 0.15 ) / 1.15, 0.0, 1.0 ) : 0.5;
	float patchy = 0.3 + 0.7 * smoothstep( 0.25, 0.75, ckNoise( skinPic * 0.32 + 5.0 ) );
	vec3 onRock = mix( uGlowHot, uGlowPale, 0.3 ) * ckBeside * facing * patchy * uGlowRock * diffuseColor.rgb * ( 1.0 - smoothstep( 1.1, 0.9, ckQ ) ) * ( 1.0 - step( 0.1, vBlock ) );
	// Round the knot the rock is lit as from one short source along the hot arm: a smooth pool that falls off with
	// distance and lands on each face by how it is turned to it.
	vec3 ab = uKnotB - uKnotA, ka = vSkinP - uKnotA;
	float t = clamp( dot( ka, ab ) / max( dot( ab, ab ), 1e-4 ), 0.0, 1.0 );
	vec3 to = uKnotA + ab * t - vSkinP;
	float d = length( to ), dj = length( vSkinP - uKnotA );
	vec3 lv = ( viewMatrix * vec4( to / max( d, 1e-4 ), 0.0 ) ).xyz;
	float ll = length( lv );
	float wrap = ll > 1e-6 ? clamp( ( dot( normal, lv / ll ) + 0.25 ) / 1.25, 0.0, 1.0 ) : 0.0;
	float pfall = exp( - pow( d / uKnot.y, 1.4 ) ) * mix( 1.0, 0.65, t );
	vec3 pool = mix( uGlowFlame, uGlowHot, 0.6 ) * uKnot.x * pfall * wrap * diffuseColor.rgb * ( 1.0 - skinSlab );
	float hot = exp( - pow( max( 0.0, dj - 2.0 ) / uKnot.w, 2.0 ) );
	vec3 junction = uGlowPale * uKnot.z * hot * hot * heart;
	totalEmissiveRadiance += ( cleft + onRock + pool + junction ) * uCoreLevel;
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
	float block = step( 0.1, vBlock );
	float fillSeen = 1.0;
	#ifdef WORLD_BAKED
		fillSeen = wLight.w;
	#endif
	float high = smoothstep( ${f(TERMINATOR.from)}, ${f(TERMINATOR.to)}, mn );
	float low = mix( ${f(TERMINATOR.low)}, ${f(TERMINATOR.high)}, high );
	float ndl = dot( normal, normalize( ( viewMatrix * vec4( mw, 0.0 ) ).xyz ) );
	float rake = mix( 1.0, smoothstep( low, low + ${f(TERMINATOR.soft)}, ndl ) * ( ${f(TERMINATOR.floor)} + ${f(1 - TERMINATOR.floor)} * high ), skinPale * ( 1.0 - block ) );
	// A broken face of the skin turned from the moon takes none of it: the shadow map, nearly edge on there, lit it
	// in flickering teeth, one to a row of the mesh. A block's faces are lit as they are turned.
	rake *= mix( smoothstep( -0.04, 0.22, fm ), 1.0, block );
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
	// The dark side and its blocks: the night from the visitor's side and above at the left, which shows the relief,
	// shaded by what stands in its way (the slab's hard shadow on the face under it), and a sliver along the outline
	// from the glow behind the world. A block's weathered top takes it as the slab does.
	vec3 fv = ( viewMatrix * vec4( normalize( uDarkFrom ), 0.0 ) ).xyz;
	float fill = saturate( dot( normal, normalize( fv ) ) ) * mix( 0.12, 1.0, fillSeen );
	float rimK = smoothstep( 0.78, 0.97, 1.0 - saturate( dot( normal, geometryViewDir ) ) );
	float topK = block * clamp( ( vBlock - 0.5 ) * 2.0, 0.0, 1.0 );
	reflectedLight.directDiffuse += ( 1.0 - skinPale ) * BRDF_Lambert( material.diffuseContribution ) * mix( uGlowPale, vec3( 1.0 ), 0.35 ) * ( mix( uDarkLight.x * fill * fill, uDarkLight.z * fill * fill, max( topK, block * 0.35 ) ) + uDarkLight.y * rimK * ( 1.0 - block ) );
}
// The dark side reflects little of the night: at its outline, seen edge on, it drew a thin lit line round the planet
// that picture 9 does not have.
reflectedLight.indirectSpecular *= mix( 0.2, 1.0, skinPale );
reflectedLight.indirectDiffuse = mix( reflectedLight.indirectDiffuse * ${f(NIGHT_SIDE)}, reflectedLight.indirectDiffuse * ${f(PALE_SHADE)} * vec3( ${PALE_WARM.map(f).join(', ')} ), skinPale );`;
