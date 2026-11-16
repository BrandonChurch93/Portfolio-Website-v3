import { BLOCK_CODE, CLEFT, CRACK_CELL, CRESCENT, CRUST, DARK_LIGHT, GLOW, KNOT_POOL, MAP, PALE_LIP, SECTION, SHADE_TOP, NIGHT_SIDE, PALE_SHADE, PALE_WARM, ROUGH, WEATHER, DARK_FACE } from './look';
import { LIGHT, MOONWARD, PICTURE, RIM, SCALE, WORLD } from '../../layout';

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
float skinSect;
float skinSlab;
float skinFacing;
float skinTop;
vec3 skinShell;
vec3 skinHairOf;
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
	float jag = 0.72 + 0.42 * ckNoise( pic * 0.13 + 2.0 ) + 0.12 * ckNoise( pic * 0.37 ) + 0.05 * ckNoise( pic * 0.8 + 7.0 ), bite = 0.3 * ( ckNoise( pic * 0.5 + 3.0 ) - 0.5 );
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
			float line = ( 1.0 - smoothstep( 0.5, 1.15, q ) ) * dim, lit = line * max( heat, 0.04 );
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
// The dark face's unlit hairline fractures, in picture 9's pixels: the borders between cells of a warped pattern, of
// which only some are open, each fading in and out along its length, so they are a broken scatter of fine breaks and
// never a whole net. x is how open one is here (0 to 1), yz which way across it the ground rises (from its middle).
vec3 skinHair( vec2 pic, float px ) {
	vec2 g = pic / ${f(DARK_FACE.hair[0])} + 0.55 * vec2( ckNoise( pic * 0.045 ), ckNoise( pic * 0.045 + 19.0 ) );
	vec2 gi = floor( g );
	float d1 = 9.0, d2 = 9.0;
	vec2 c1 = vec2( 0.0 ), c2 = vec2( 0.0 ), i1 = vec2( 0.0 ), i2 = vec2( 0.0 );
	for ( int j = -1; j <= 1; j ++ ) for ( int i = -1; i <= 1; i ++ ) {
		vec2 id = gi + vec2( float( i ), float( j ) );
		vec2 c = id + vec2( ckHash( id ), ckHash( id + 31.7 ) );
		float d = length( g - c );
		if ( d < d1 ) { d2 = d1; c2 = c1; i2 = i1; d1 = d; c1 = c; i1 = id; } else if ( d < d2 ) { d2 = d; c2 = c; i2 = id; }
	}
	float de = ( d2 - d1 ) * 0.5 * ${f(DARK_FACE.hair[0])};
	float open = step( ckHash( i1 + i2 * 1.37 + 3.3 ), ${f(DARK_FACE.hair[1])} ) * smoothstep( 0.35, 0.7, ckNoise( pic * 0.09 + 7.0 ) );
	float w = ${f(DARK_FACE.hair[2])} * ( 0.6 + 0.8 * ckNoise( pic * 0.3 ) );
	float line = open * ( 1.0 - smoothstep( w * 0.4, w + px, de ) ) * smoothstep( 0.2 * px, 0.9 * px, w );
	vec2 a = d1 > 1e-4 ? ( g - c1 ) / d1 : vec2( 0.0 ), b = d2 > 1e-4 ? ( g - c2 ) / d2 : vec2( 0.0 );
	vec2 across = b - a;
	float al = length( across );
	return vec3( line, al > 1e-4 ? across / al : vec2( 0.0 ) );
}
// The pale side's stored share of the moon, read smoothly over four texels (a cubic B spline from four of the
// filtered reads): read as it is stored, its edges showed the texels' steps at three times.
vec4 skinCubic( float v ) {
	vec4 n = vec4( 1.0, 2.0, 3.0, 4.0 ) - v;
	vec4 s = n * n * n;
	float x = s.x, y = s.y - 4.0 * s.x, z = s.z - 4.0 * s.y + 6.0 * s.x;
	return vec4( x, y, z, 6.0 - x - y - z ) / 6.0;
}
float skinMoonSeen( vec2 uv ) {
	vec2 size = uSkinMapSize.xy, st = uv * size - 0.5, f = fract( st );
	st -= f;
	vec4 xc = skinCubic( f.x ), yc = skinCubic( f.y );
	vec4 c = st.xxyy + vec2( - 0.5, 1.5 ).xyxy;
	vec4 sm = vec4( xc.xz + xc.yw, yc.xz + yc.yw );
	vec4 o = ( c + vec4( xc.yw, yc.yw ) / sm ) / size.xxyy;
	float a = texture2D( uSkinMap, o.xz ).a, b = texture2D( uSkinMap, o.yz ).a, cc = texture2D( uSkinMap, o.xw ).a, d = texture2D( uSkinMap, o.yw ).a;
	float sx = sm.x / ( sm.x + sm.y ), sy = sm.z / ( sm.z + sm.w );
	return mix( mix( d, cc, sx ), mix( b, a, sx ), sy );
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
	ckFine = 1.0 - smoothstep( 1.0, 2.2, ckW / max( px, 1e-4 ) );
	skinHairOf = skinPale < 0.5 && vBlock < 0.1 ? skinHair( skinPic, px ) : vec3( 0.0 );
	skinHairOf.x *= smoothstep( 1.5, 3.0, ckQ );
}
{
	float b = skinT.b * 2.0;
	vec3 pale = mix( uPale, uDust, smoothstep( 0.92, 1.28, b ) ) * b;
	pale *= vec3( ${WEATHER.map(f).join(', ')} );
	// At the pale tear where the crust has fallen away, the planet's stone in section (SECTION in look.ts).
	skinSect = skinPale * ( 1.0 - smoothstep( ${f(SECTION[1] + 0.02)}, ${f(SECTION[1] + 0.1)}, b ) );
	pale = mix( pale, uUnder * ( 0.2 + 0.8 * clamp( ( b - ${f(SECTION[0])} ) / ${f(SECTION[1] - SECTION[0])}, 0.0, 1.0 ) ), skinSect );
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
	float cut = mix( 1.0 - smoothstep( 0.9, 1.02, ckQ ), ( 1.0 - smoothstep( 0.5, 1.15, ckQ ) ) * ckDim, ckFine );
	dark *= 1.0 - mix( 0.65 * cut, 0.3 * cut * ( 1.0 - ckFine ), step( 0.02, ckHeat ) );
	dark *= 1.0 - ${f(DARK_FACE.hair[3])} * skinHairOf.x;
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
	// Grit: small dark grains in the crust's stone, at two sizes, which a close look finds.
	float grit = 1.0 - 0.42 * smoothstep( 0.7, 0.86, ckNoise( skinPic * 1.9 + 5.0 ) ) - 0.22 * smoothstep( 0.72, 0.9, ckNoise( skinPic * 4.3 + 9.0 ) );
	diffuseColor.rgb = mix( col, mix( section, crustTop, top ) * mix( 1.0, grit, step( 0.25, vBlock ) ), step( 0.1, vBlock ) );
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
		// Round the knot, where its light rakes the rock, the grain is worn down: raked, it read as sandpaper.
		gs *= 0.12 + 0.88 * smoothstep( 12.0, 60.0, length( vSkinP - uKnotA ) );
		s += gs * ${f(DARK_FACE.grain[1] * DARK_FACE.grain[0])} * ${f(SCALE)};
		// A hairline is a small V: the ground falls into it from each side, so its lower lip turns up to the night.
		s -= skinHairOf.yz * skinHairOf.x * ${f(DARK_FACE.hair[4] * SCALE)};
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

// The cracks' light, as clefts cut into the rock. Across a wide one: deep in it the heart, the light itself, pale gold
// on its middle line and orange toward its walls, never a flat fill; the wall that faces the visitor lit by it to the
// lip, rough, falling from hot to flame; the wall turned from him dim to its foot; and at both lips the light that
// leaves it lying on the rock beside, broken by the rock's relief, with a dark chipped rim only here and there. Round
// the knot, where the arms meet, the light falls on the rock from the junction and the hot arm, as from a source a
// little out of the surface: brighter on faces turned to it, gone in pits and behind steps. A cleft the screen cannot
// open is one line of it, pale on its middle and orange at its sides.
export const EMIT = `
if ( skinPale < 0.5 ) {
	// Which wall of a cleft faces the visitor: the planet turns away toward its outline, so the wall on the outline's
	// side of the middle line looks back in toward him and shows wide, and the other is turned away and shows narrow.
	vec2 np = vec2( skinShell.x, - skinShell.y );
	float ob = length( np );
	float fw = ob > 1e-4 ? dot( ckSide, np / ob ) * sqrt( ob ) : 0.0;
	float qv = ckQ / ( 1.0 + ${f(CLEFT.open)} * max( fw, 0.0 ) ) * ( 1.0 + ${f(CLEFT.shut)} * max( - fw, 0.0 ) );
	float dj = length( vSkinP - uKnotA );
	float notch = exp( - pow( max( 0.0, dj - 1.0 ) / uKnot.w, 2.0 ) );
	float heat = min( 1.0, ckHeat * ( 1.0 + 0.12 * notch ) ), hw = pow( heat, ${f(GLOW.curve)} );
	float aa = clamp( ckPx / max( ckW, 1e-4 ), 0.02, 0.5 );
	float fl = mix( ${f(CLEFT.floor[0])}, ${f(CLEFT.floor[1])}, heat ) * ( 1.0 + ${f(CLEFT.notch[1])} * notch );
	// The heart: brightest on its middle line and falling across it, so only its middle reaches pale gold.
	float hk = 1.0 - smoothstep( 0.0, fl + aa, qv );
	hk *= 0.88 + 0.2 * ckNoise( skinPic * 0.9 + 21.0 );
	vec3 heartC = mix( mix( uGlowFlame, uGlowHot, 0.75 ), skinHue( heat ), smoothstep( 0.2, 0.75, hk ) );
	heartC = mix( heartC, uGlowPale, smoothstep( 0.62, 1.0, hk ) * smoothstep( 0.6, 0.95, heat ) );
	float wt = clamp( ( qv - fl * 0.5 ) / max( 1.0 - fl * 0.5, 1e-3 ), 0.0, 1.0 ), twd = smoothstep( -0.25, 0.25, fw );
	float rough = 0.7 + 0.45 * ckNoise( skinPic * 0.55 + 3.0 ) * ( 0.5 + ckNoise( skinPic * 0.21 + 13.0 ) );
	float wall = mix( ${f(CLEFT.far)} * ( 0.35 + 0.65 * pow( 1.0 - wt, 1.6 ) ), mix( 1.0, ${f(CLEFT.lipLit)}, pow( wt, 0.8 ) ) * rough, twd ) * ( 1.0 - hk * 0.6 );
	float edge = 1.0 - smoothstep( 1.0 - aa, 1.0 + aa * 0.5, qv );
	vec3 wide = ( heartC * pow( hk, 0.7 ) * ${f(CLEFT.heart)} + mix( skinHue( heat * 0.8 ), uGlowFlame, 0.3 + 0.55 * wt ) * wall * ${f(CLEFT.wall)} ) * hw * edge * ( 1.0 + ${f(CLEFT.notch[0])} * notch );
	float lk = smoothstep( 0.15, 1.0, ckLine );
	vec3 thin = mix( mix( uGlowFlame, uGlowHot, 0.6 ), mix( skinHue( ckLineHeat ), uGlowPale, ${f(CLEFT.core)} * smoothstep( 0.25, 0.7, ckLineHeat ) ), lk * lk ) * ckLine * ( 0.45 + 0.55 * lk ) * ${f(CLEFT.heart * CLEFT.thin)} * pow( ckLineHeat, ${f(GLOW.curve)} );
	vec3 cleft = mix( wide, thin, ckFine );
	// Beside a hot one, the light that leaves it lands on the rock by both lips, the more on faces turned to it, and
	// unevenly; here and there a wide one's lip is chipped into a dark rim first.
	vec3 toward = - ( ckDu * ckSide.x + ckDv * ckSide.y ) + skinShell * 0.6;
	vec3 tv = ( viewMatrix * vec4( toward, 0.0 ) ).xyz;
	float tl = length( tv );
	float facing = tl > 1e-6 ? clamp( ( dot( normalize( mix( nonPerturbedNormal, normal, 0.8 ) ), tv / tl ) + 0.3 ) / 1.3, 0.0, 1.0 ) : 0.5;
	float rim = max( ${f(CLEFT.gap)}, 0.7 / max( ckW, 1e-3 ) ) * ( 0.4 + 1.2 * ckNoise( skinPic * 0.7 + 41.0 ) );
	float chipped = smoothstep( 0.55, 0.7, ckNoise( skinPic * 0.23 + 61.0 ) );
	float gap = mix( 1.0, smoothstep( rim * 0.4, rim + aa, ckQ - 1.0 ), chipped );
	float uneven = 0.45 + 0.9 * ckNoise( skinPic * 0.3 + 17.0 );
	float tone = clamp( skinT.b * 2.0, 0.3, 1.6 ) * ( 1.0 - ${f(DARK_FACE.hair[3])} * skinHairOf.x );
	vec3 onRock = mix( uGlowFlame, uGlowHot, 0.5 ) * ckBeside * ( 0.3 + 0.7 * facing * facing ) * gap * uneven * uGlowRock * uDark * tone * ( 1.0 - smoothstep( 1.1, 0.9, ckQ ) ) * ( 1.0 - step( 0.1, vBlock ) );
	// Round the knot: the light from the junction and the hot arm, taken as from the nearest point of that short line,
	// a little out of the surface, falling with distance and by how each face of the relief is turned to it.
	vec3 ab = uKnotB - uKnotA;
	float ka = clamp( dot( vSkinP - uKnotA, ab ) / max( dot( ab, ab ), 1e-6 ), 0.0, 1.0 );
	vec3 to = uKnotA + ab * min( ka, ${f(KNOT_POOL.along)} ) + skinShell * ${f(KNOT_POOL.lift)} - vSkinP;
	float d = length( to );
	vec3 lv = ( viewMatrix * vec4( to / max( d, 1e-4 ), 0.0 ) ).xyz;
	float ll = length( lv );
	// Only the relief turns a face to it or from it: the light leaves the cleft along the rock, so the planet's own curve
	// must not take it from one side of the knot.
	float turned = ll > 1e-6 ? clamp( 0.62 + 1.0 * dot( normal - nonPerturbedNormal, lv / ll ), 0.0, 1.0 ) : 0.0;
	float falls = 1.0 / ( 1.0 + pow( d / uKnot.y, 2.0 ) ) * exp( - pow( d / ( uKnot.y * ${f(KNOT_POOL.out)} ), 2.0 ) );
	vec3 pool = mix( mix( uGlowEmber, uGlowFlame, 0.25 ), uGlowHot, 0.08 * ( 1.0 - ka ) ) * vec3( ${KNOT_POOL.deepen.map(f).join(', ')} ) * uKnot.x * falls * pow( turned, 1.2 ) * uDark * sqrt( tone ) * gap * ( 1.0 - step( 0.1, vBlock ) ) * ( 1.0 - edge * ( 1.0 - ckFine ) );
	totalEmissiveRadiance += ( cleft + onRock + pool ) * uCoreLevel;
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
	// Read smoothly and then hardened, so a crater's crescent has a crisp edge and no texel shows in it.
	float moonSeen = skinPale > 0.5 ? smoothstep( 0.18, 0.82, skinMoonSeen( vAtlas ) ) : skinT.a;
	seen = mix( seen, moonSeen * mix( 1.0, seen, nearTop ), skinPale );
	rake *= seen;
	// The moon's shading is for the moon's light alone: the core's, which the stage has already laid in the same sum,
	// is taken out first and put back after, so the crust broken toward the hollow keeps the core's light on it.
	vec3 skinCore = vec3( 0.0 );
	#ifdef WORLD_CORE
	{
		vec3 wTo = ( viewMatrix * vec4( uCoreAt, 1.0 ) ).xyz - geometryPosition;
		float wD = max( length( wTo ), 1e-6 ), wS = min( 1.0, uCoreR / wD );
		vec3 wL = wTo / wD;
		#ifdef WORLD_BAKED
			float wSeen = wLight.x;
		#else
			float wSeen = 1.0;
		#endif
		vec3 wE = mix( uCoreColor, uCorePale, ${f(LIGHT.core.pale[0])} * smoothstep( ${f(LIGHT.core.pale[1])}, ${f(LIGHT.core.pale[2])}, wS ) ) * ( uCoreLevel * wSeen * pow( wS, uCoreFall ) );
		vec3 wH = normalize( wL + geometryViewDir );
		vec3 wF = F_Schlick( material.specularColor, material.specularF90, saturate( dot( geometryViewDir, wH ) ) );
		skinCore = wE * worldIllum( dot( geometryNormal, wL ), wS ) * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - wF );
	}
	#endif
	// The stone in section at the pale tear lies back under the crust's broken edge, out of the moon.
	rake *= mix( 1.0, 0.3, skinSect );
	reflectedLight.directDiffuse = ( reflectedLight.directDiffuse - skinCore ) * rake + skinCore;
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
	// The slab and its chunks stand out under the land's lip and are seen by the night from higher up: their tops
	// bright, their broken fronts less, what faces down dark.
	vec3 sv = ( viewMatrix * vec4( normalize( vec3( ${DARK_LIGHT.slabFrom.map(f).join(', ')} ) ), 0.0 ) ).xyz;
	float slabFill = mix( saturate( dot( normal, normalize( sv ) ) ), fill, 0.35 ) * mix( 0.25, 1.0, fillSeen );
	// Taken from the smooth surface, not the fine relief: from the relief it caught every grain at the outline and drew
	// it as a dotted line of flakes.
	float rimK = smoothstep( 0.8, 0.98, 1.0 - saturate( dot( nonPerturbedNormal, geometryViewDir ) ) );
	// The slab and its chunks face up into it unshaded and take it fully; the blocks along the torn line are seen by it
	// as the dark face is, their tops a little more: lit as the slab, they stood down the tear as a column of pale foam.
	float topK = skinFacing * max( skinTop, 0.35 );
	float lineK = step( 0.25, vBlock ) * ( 1.0 - skinFacing ) * ( 1.0 + 2.0 * skinTop );
	// The slab's faces differ by how each is turned to it: its top bright, its broken front and underside dark.
	reflectedLight.directDiffuse += ( 1.0 - skinPale ) * BRDF_Lambert( material.diffuseContribution ) * uGlowPale * ( mix( uDarkLight.x * fill * fill * max( lineK, 1.0 ), uDarkLight.z * ${f(1.7)} * slabFill * slabFill * slabFill, topK ) + uDarkLight.y * rimK * ( 1.0 - block ) );
	// The pale side's thick lip where it wraps the break faces the hollow and the visitor, away from the moon: the same
	// night finds it, so the crust shows its thickness as a lit cream edge.
	float lipK = skinPale * ( 1.0 - block ) * clamp( vBlock / ${f(BLOCK_CODE.lip)}, 0.0, 1.0 ) * ( 1.0 - 0.75 * skinSect );
	float lipFill = clamp( ( dot( normal, normalize( fv ) ) + 0.15 ) / 1.15, 0.0, 1.0 );
	lipFill *= lipFill * mix( 0.3, 1.0, fillSeen );
	reflectedLight.directDiffuse += lipK * BRDF_Lambert( material.diffuseContribution ) * uGlowPale * ${f(PALE_LIP)} * lipFill;
}
// The dark side reflects little of the night: at its outline, seen edge on, it drew a thin lit line round the planet
// that picture 9 does not have.
reflectedLight.indirectSpecular *= mix( 0.2, 1.0, skinPale );
reflectedLight.indirectDiffuse = mix( reflectedLight.indirectDiffuse * ${f(NIGHT_SIDE)}, reflectedLight.indirectDiffuse * ${f(PALE_SHADE)} * vec3( ${PALE_WARM.map(f).join(', ')} ) * ( 1.0 - 0.45 * skinSect ), skinPale );`;
