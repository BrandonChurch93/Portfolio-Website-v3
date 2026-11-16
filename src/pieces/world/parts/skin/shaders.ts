import { BLOCK_CODE, CLEFT, CRACK_CELL, CRESCENT, CRUST, GLOW, KNOT_POOL, MAP, SHADE_TOP, NIGHT_SIDE, PALE_SHADE, PALE_WARM, ROUGH, WEATHER, DARK_FACE } from './look';
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
uniform vec3 uStone;
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
float ckLine;
float ckLineHeat;
float ckFine;
vec2 ckSide;
vec3 ckDu;
vec3 ckDv;
float skinPale;
float skinSlab;
float skinFacing;
float skinTop;
vec3 skinShell;
float ckHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float ckNoise( vec2 p ) {
	vec2 i = floor( p ), f = fract( p );
	f = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( ckHash( i ), ckHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( ckHash( i + vec2( 0.0, 1.0 ) ), ckHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}
// The cracks near a place of picture 9 (pic, in its pixels; px is how many of them a pixel of the screen covers):
// how far into the nearest cleft it is (ckQ, 0 on its middle line, 1 at its lip), that cleft's half width, its heat
// and which way its middle line lies (ckSide, from the line toward the place), the brightest of the clefts round it
// drawn as one soft line (ckLine, and its heat), which is how a cleft the screen cannot open is drawn, and the light
// the hot clefts lay on the rock right beside them (ckBeside). The lip is chipped only where it can be seen: its width
// wanders at two grains, and a wide cleft is bitten. A cleft is never drawn narrower than CRACK_CELL.least pixels of
// the screen each side: narrower, its light fell between the pixels and broke into dashes. It is drawn that wide and
// dimmer by its share.
void skinCracks( vec2 pic, float px ) {
	ckQ = 9.0; ckW = 1.0; ckHeat = 0.0; ckBeside = 0.0; ckDim = 1.0; ckSide = vec2( 0.0 ); ckLine = 0.0; ckLineHeat = 0.0;
	vec2 c = ( pic - uCkGrid.xy ) / uCkGrid.z;
	if ( c.x < 0.0 || c.y < 0.0 || c.x >= uCkSize.x || c.y >= uCkSize.y ) return;
	ivec2 ci = ivec2( c );
	// The lip wanders a little at two grains, smoothly: a chipped noise of more strength combed it into spikes like a
	// brush stroke. How deep the cleft runs here, which is how hot it shows, comes and goes along every arm, so none is
	// one even line; the hottest lengths vary least.
	float jag = 0.92 + 0.12 * ckNoise( pic * 0.22 ) + 0.05 * ckNoise( pic * 0.8 + 7.0 ), bite = 0.3 * ( ckNoise( pic * 0.5 + 3.0 ) - 0.5 );
	float deep = 0.5 + 0.62 * ckNoise( pic * 0.13 + 5.0 ) + 0.2 * ckNoise( pic * 0.41 + 9.0 );
	// The clefts' lengths are joined softly: each place takes the near ones by how near each is, so where one length
	// gives way to the next the cleft's edge, its walls and which of them faces the visitor all run on with no crease.
	// Taken from the nearest alone, each short length turned its walls its own way and the cleft was drawn in bands.
	float best = 0.0, sw = 0.0, sQ = 0.0, sWe = 0.0, sDim = 0.0, sHeat = 0.0;
	vec2 sSide = vec2( 0.0 );
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
			heat = min( 1.0, heat * mix( 1.0, deep, 1.0 - smoothstep( 0.9, 1.0, heat ) * 0.75 ) );
			float seen = smoothstep( 1.5 * px, 3.0 * px, w0 );
			float w = w0 * mix( 1.0, jag + 0.5 * bite * smoothstep( 0.8, 2.0, w0 ), seen );
			float we = max( w, ${f(CRACK_CELL.least)} * px ), dim = w / we, q = d / we;
			float e = exp( - ${f(CRACK_CELL.soft)} * q );
			sw += e; sWe += e * we; sDim += e * dim; sHeat += e * heat; sSide += e * ( d > 1e-4 ? dv / d : vec2( 0.0 ) );
			if ( q < ckQ ) ckQ = q;
			float line = exp( - 2.0 * q * q ) * dim, lit = line * max( heat, 0.04 );
			if ( lit > best ) { best = lit; ckLine = line; ckLineHeat = heat; }
			float hot = smoothstep( ${f(CRACK_CELL.hot[0])}, ${f(CRACK_CELL.hot[1])}, heat ) * heat;
			ckBeside = max( ckBeside, hot * dim * exp( - max( 0.0, d - we ) / ${f(CRACK_CELL.fall)} ) * smoothstep( -0.2, 0.25, q - 1.0 ) );
		}
	}
	if ( sw > 1e-12 ) {
		ckQ = ckQ - log( max( sw * exp( ${f(CRACK_CELL.soft)} * ckQ ), 1.0 ) ) / ${f(CRACK_CELL.soft)} * ${f(CRACK_CELL.join)};
		ckW = sWe / sw; ckDim = sDim / sw; ckHeat = sHeat / sw;
		float sl = length( sSide );
		ckSide = sl > 1e-4 ? sSide / sl : vec2( 0.0 );
	}
}
// The color of the cracks' light at a heat: amber in a cool arm, the hot orange eased toward pale in a warm one, and
// cream only in the hottest.
vec3 skinHue( float heat ) {
	vec3 c = mix( mix( uGlowFlame, uGlowHot, 0.55 ), mix( uGlowHot, uGlowPale, ${f(GLOW.amber)} ), smoothstep( 0.25, 0.7, heat ) );
	return mix( c, uGlowPale, smoothstep( ${f(GLOW.cream[0])}, ${f(GLOW.cream[1])}, heat ) );
}
// The rock's torn line on the dark side, across, at a place down picture 9 (from uTorn[0] down, a value each two rows).
float skinTornAt( float py ) {
	float k = clamp( ( py - uTorn[ 0 ] ) * 0.5, 0.0, 64.999 );
	int i = int( k );
	return mix( uTorn[ i + 1 ], uTorn[ min( i + 2, 66 ) ], fract( k ) ) + 2.2 * sin( py * 0.37 + 1.3 ) + 1.3 * sin( py * 0.83 + 0.4 ) + 0.7 * sin( py * 2.1 + 2.2 );
}`;

export const COLOR = `
skinT = texture2D( uSkinMap, vAtlas );
// What the vertex is (look.ts, BLOCK_CODE): a block that faces the visitor or one along a torn line, and how near its
// weathered top.
skinFacing = step( ${f(BLOCK_CODE.facing[0] - 0.03)}, vBlock );
skinTop = skinFacing * clamp( ( vBlock - ${f(BLOCK_CODE.facing[0])} ) / ${f(BLOCK_CODE.facing[1] - BLOCK_CODE.facing[0])}, 0.0, 1.0 ) + step( 0.25, vBlock ) * ( 1.0 - skinFacing ) * clamp( ( vBlock - ${f(BLOCK_CODE.line[0])} ) / ${f(BLOCK_CODE.line[1] - BLOCK_CODE.line[0])}, 0.0, 1.0 );
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
	else { ckQ = 9.0; ckW = 1.0; ckHeat = 0.0; ckBeside = 0.0; ckDim = 1.0; ckSide = vec2( 0.0 ); ckLine = 0.0; ckLineHeat = 0.0; }
	// The cracks are cut in the skin, not in the crust's blocks, which only take the light that leaves them.
	if ( vBlock > 0.25 ) { ckQ = 9.0; ckLine = 0.0; }
	// How far a cleft is too narrow on the screen for its walls and lips to be seen: then it is one soft line.
	ckFine = 1.0 - smoothstep( 1.4, 3.0, ckW / max( px, 1e-4 ) );
}
{
	float b = skinT.b * 2.0;
	vec3 pale = mix( uPale, uDust, smoothstep( 0.92, 1.28, b ) ) * b;
	pale *= vec3( ${WEATHER.map(f).join(', ')} );
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
	vec3 dark = mix( uDark * vec3( ${DARK_FACE.tint.map(f).join(', ')} ) * b * strata, uUnder * ( 0.4 + 0.3 * b ), face );
	// In a cleft the stone is its walls, which its own light lights, and an unlit fissure is a dark cut. A lit cleft the
	// screen cannot open has no dark edge: drawn with one it read as a neon tube.
	float cut = mix( 1.0 - smoothstep( 0.9, 1.02, ckQ ), exp( - 2.0 * ckQ * ckQ ) * ckDim, ckFine );
	dark *= 1.0 - mix( 0.65 * cut, 0.3 * cut * ( 1.0 - ckFine ), step( 0.02, ckHeat ) );
	vec3 col = mix( dark, pale, skinPale );
	// A block of the crust: the planet's one stone, its weathered top bleached on the dark side and dusted on the pale,
	// over its broken section of the stone itself.
	skinSlab = skinFacing * ( 1.0 - skinPale );
	// The skin's own edge where it breaks before a block is the crust in section too.
	float top = skinTop;
	vec3 bleached = mix( vec3( dot( uStone, vec3( 0.2126, 0.7152, 0.0722 ) ) ), uStone, ${f(1 - CRUST.bleach)} ) * ${f(CRUST.top)};
	bleached = mix( bleached, uPale, ${f(CRUST.cream)} );
	vec3 crustTop = mix( bleached * b * mix( ${f(CRUST.line)}, 1.0, skinFacing ), mix( uPale, bleached, ${f(CRUST.shaken)} ) * b, skinPale );
	vec3 section = uUnder * b;
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
		dq -= ( ckHeat > 0.0 ? 0.0 : 1.0 ) * ${f(CLEFT.lip[0])} * ckW * ${f(PICTURE.unit)} * 2.0 * lu * exp( - lu * lu ) / ${f(CLEFT.lip[2])};
		s += ckSide * clamp( dq / max( ckW, 1e-3 ), -6.0, 6.0 ) * ${f(SCALE)} * ( ckHeat > 0.0 ? 1.0 : 0.3 + 0.4 * ckDim ) * ( 1.0 - ckFine );
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

// The cracks' light: deep in a cleft it is the light itself, cream only in the hottest and amber in the rest, its
// heart molten where it is wide; a cleft the screen cannot open is one soft line of it. Beside the hot ones a little of
// it lands on the lips. Round the knot the rock is lit as from one source along the hot arm: a broad smooth pool that
// falls off with distance with no edge, lit by how the planet's surface is turned to it and not by the fine relief, so
// it has no speckle; and at the junction a pale point where the clefts open widest.
export const EMIT = `
if ( skinPale < 0.5 ) {
	// Which wall of a cleft faces the visitor: the planet turns away toward its outline, so the wall on the outline's
	// side of the middle line looks back in toward him and shows wide, and the other is turned away and shows narrow.
	vec2 np = vec2( skinShell.x, - skinShell.y );
	float ob = length( np );
	float fw = ob > 1e-4 ? dot( ckSide, np / ob ) * ob : 0.0;
	float qv = ckQ / ( 1.0 + ${f(CLEFT.open)} * max( fw, 0.0 ) ) * ( 1.0 + ${f(CLEFT.shut)} * max( - fw, 0.0 ) );
	float heat = ckHeat, hw = pow( heat, ${f(GLOW.curve)} );
	// Across the cleft: its heart on the floor, pale only in the hottest, and its walls lit by it, the one that faces
	// the visitor bright to its lip, which is hard, and the other turned away and dark but for its foot. The light
	// falls from the heart to the lips, never one flat band.
	float fl = mix( ${f(CLEFT.floor[0])}, ${f(CLEFT.floor[1])}, heat );
	float heart = exp( - 2.4 * ( qv / fl ) * ( qv / fl ) );
	heart *= 0.8 + 0.35 * ckNoise( skinPic * 0.55 + 21.0 ) * smoothstep( 0.6, 0.9, heat );
	float wt = clamp( qv, 0.0, 1.0 ), twd = smoothstep( -0.3, 0.3, fw );
	float wall = mix( 0.06 + pow( 1.0 - wt, 2.5 ) * 0.4, mix( 1.0, 0.32, pow( wt, 0.7 ) ), twd ) * ( 1.0 - heart );
	float aa = clamp( ckPx / max( ckW, 1e-4 ), 0.02, 0.5 );
	float edge = 1.0 - smoothstep( 1.0 - aa, 1.0 + aa * 0.5, qv );
	vec3 hue = skinHue( heat );
	vec3 wide = ( hue * heart * ${f(CLEFT.heart)} + mix( skinHue( heat * 0.75 ), uGlowFlame, wt ) * wall * ${f(CLEFT.wall)} ) * hw * edge;
	// A cleft the screen cannot open is one soft line, paler along its middle than at its edges.
	vec3 thin = mix( skinHue( ckLineHeat ), uGlowPale, ${f(CLEFT.core)} * smoothstep( 0.55, 1.0, ckLine ) * smoothstep( 0.25, 0.7, ckLineHeat ) ) * ckLine * ${f(CLEFT.heart)} * pow( ckLineHeat, ${f(GLOW.curve)} );
	vec3 cleft = mix( wide, thin, ckFine );
	// Beside a hot one, the light that leaves it lands on the rock right by its lips, by how each face is turned to it.
	vec3 toward = - ( ckDu * ckSide.x + ckDv * ckSide.y ) + skinShell * 0.6;
	vec3 tv = ( viewMatrix * vec4( toward, 0.0 ) ).xyz;
	float tl = length( tv );
	vec3 soft = nonPerturbedNormal;
	float facing = tl > 1e-6 ? clamp( ( dot( soft, tv / tl ) + 0.3 ) / 1.3, 0.0, 1.0 ) : 0.5;
	vec3 onRock = mix( uGlowFlame, uGlowHot, 0.5 ) * ckBeside * facing * uGlowRock * uDark * ( 1.0 - smoothstep( 1.1, 0.9, ckQ ) ) * ( 1.0 - step( 0.1, vBlock ) );
	// Round the knot the rock is lit as from one short source along the hot arm.
	vec3 ab = uKnotB - uKnotA, ka = vSkinP - uKnotA;
	float t = clamp( dot( ka, ab ) / max( dot( ab, ab ), 1e-4 ), 0.0, 1.0 ) * ${f(KNOT_POOL.along)};
	vec3 to = uKnotA + ab * t - vSkinP;
	float d = length( to ), dj = length( vSkinP - uKnotA );
	vec3 lv = ( viewMatrix * vec4( to / max( d, 1e-4 ), 0.0 ) ).xyz;
	float ll = length( lv );
	vec3 sv = ( viewMatrix * vec4( skinShell, 0.0 ) ).xyz;
	vec3 pn = normalize( mix( sv / max( length( sv ), 1e-4 ), nonPerturbedNormal, 0.5 ) );
	float wrap = ll > 1e-6 ? clamp( ( dot( pn, lv / ll ) + 0.6 ) / 1.6, 0.0, 1.0 ) : 0.0;
	float near = exp( - pow( d / uKnot.y, 2.0 ) );
	float pfall = ( 0.7 * near + 0.3 * exp( - d / ( uKnot.y * ${f(KNOT_POOL.tail)} ) ) ) * mix( 1.0, 0.7, t );
	vec3 pool = mix( mix( uGlowEmber, uGlowFlame, 0.45 ), uGlowFlame, near ) * uKnot.x * pfall * wrap * uDark * mix( 1.0, ${f(KNOT_POOL.onCrust)}, step( 0.1, vBlock ) ) * ( 1.0 - skinSlab );
	float hot = exp( - pow( max( 0.0, dj - 1.5 ) / uKnot.w, 2.0 ) );
	vec3 junction = uGlowPale * uKnot.z * hot * mix( heart * edge, ckLine, ckFine );
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
	float rake = mix( 1.0, min( ${f(ROUGH.most)}, pow( max( mn, 0.0 ) / ${f(ROUGH.at)}, ${f(ROUGH.power)} ) ), skinPale * ( 1.0 - block ) );
	// A broken face of the skin turned from the moon takes none of it: the shadow map, nearly edge on there, lit it
	// in flickering teeth, one to a row of the mesh. A block's faces are lit as they are turned.
	rake *= mix( smoothstep( -0.04, 0.22, fm ), 1.0, block );
	// The skin's own broken edge before a block is the inside of a crack: lit, it stood up the tear in thin slivers.
	rake *= 1.0 - 0.9 * block * step( vBlock, 0.25 );
	// The skin does not take the moon's shadow as the stage lights it: it is laid here. On the pale side it is the share
	// of the moon seen from each texel of the map (the fourth number), marched over the whole relief when the skin is
	// made, so each shadow is the shape of what throws it with an edge as soft as the moon is wide. The shadow map
	// adds what the map does not know near the top: the land's.
	float seen = 1.0;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
		seen = getShadow( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, directionalLightShadows[ 0 ].shadowIntensity, directionalLightShadows[ 0 ].shadowBias, directionalLightShadows[ 0 ].shadowRadius, vDirectionalShadowCoord[ 0 ] );
	#endif
	float nearTop = 1.0 - smoothstep( ${f(SHADE_TOP[0])}, ${f(SHADE_TOP[1])}, - ${f(RIM)} - vSkinP.y );
	seen = mix( seen, skinT.a * mix( 1.0, seen, nearTop ), skinPale );
	rake *= seen;
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
	// Taken from the smooth surface, not the fine relief: from the relief it caught every grain at the outline and drew
	// it as a dotted line of flakes.
	float rimK = smoothstep( 0.8, 0.98, 1.0 - saturate( dot( nonPerturbedNormal, geometryViewDir ) ) );
	// The slab and its chunks face up into it unshaded and take it fully; the blocks along the torn line are seen by it
	// as the dark face is, their tops a little more: lit as the slab, they stood down the tear as a column of pale foam.
	float topK = skinFacing * max( skinTop, 0.35 );
	float lineK = step( 0.25, vBlock ) * ( 1.0 - skinFacing ) * ( 1.0 + 2.0 * skinTop );
	reflectedLight.directDiffuse += ( 1.0 - skinPale ) * BRDF_Lambert( material.diffuseContribution ) * uGlowPale * ( mix( uDarkLight.x * fill * fill * max( lineK, 1.0 ), uDarkLight.z * fill * fill, topK ) + uDarkLight.y * rimK * ( 1.0 - block ) );
}
// The dark side reflects little of the night: at its outline, seen edge on, it drew a thin lit line round the planet
// that picture 9 does not have.
reflectedLight.indirectSpecular *= mix( 0.2, 1.0, skinPale );
reflectedLight.indirectDiffuse = mix( reflectedLight.indirectDiffuse * ${f(NIGHT_SIDE)}, reflectedLight.indirectDiffuse * ${f(PALE_SHADE)} * vec3( ${PALE_WARM.map(f).join(', ')} ), skinPale );`;
