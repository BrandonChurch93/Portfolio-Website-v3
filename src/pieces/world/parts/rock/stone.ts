import * as THREE from 'three';
import { CORE, MOONWARD, RIM, SCALE, SOURCE, WORLD } from '../../layout';
import { color, lit, stone, world } from '../../light';
import { slice } from '../../../../world/build';
import { STONE as SKIN } from '../skin/look';
import { GRAIN, grain } from './grain';

// The planet's stone: what the torn rock is made of, and what a piece that broke away may wear. A broken sandstone
// whose color comes from the light on it. Its beds lie through each block at the block's own tilt, and a face that
// cuts across them is laminated: thin, wavy, broken dark bed lines in packets, each bed a step of tone with grit in
// its foot, and here and there a small stepped ledge. On that, a few shallow spalls with a stepped rim, patches of
// short crack strokes of very different lengths, and a broad knapped relief of shells meeting along ridges. A face
// darkens toward its creases, its chipped edges are fresh stone, and what faces up carries a paler dust. The first
// tens of units in from the planet's outer surface and under the land are its weathered crust, the skin's dusty
// tone, giving way to the fresh red brown deeper in. Where the light does not reach it goes near black, a nearly
// neutral brown.
//
// What has a direction (the beds, the ledges, the cracks) is worked out in three dimensions from the place, so it
// lies on every face as the stone would and is never stretched across one seen edge on, and it fades on a face that
// lies within 35 degrees of the beds. The grain is the one map, worked out from a seed when the world loads (./grain.ts)
// and laid from the three axes.
//
//   const maps = await stoneMaps(renderer)                           once, shared by every user, released with maps.release()
//   const m = stoneMaterial(maps, { key: 'rock', baked, spare, edge }) a standard material joined to the world's light
//
// A block's own number (spare: 'slab') turns its beds and sets its tone. Without one, large slow fields of the place do.
//
// A part that moves its own vertices (what broke away) lays the stone in itself: STONE_VERT_PARS in its vertex
// shader, then it sets vStoneP (the place, in units) and vStoneN (the normal, in the same frame), and calls
// stoneShader(sh, maps, true, true) for the stone's body, grain and wear without its beds, cracks, spalls, crust and
// edges. Every name the stone puts in a shader begins with stone (or vStone, uStone): uStoneStreamPower at 0 takes
// the page's stream's light off, for a part that lights itself from the stream.

const mix = (a: THREE.Color, b: THREE.Color, k: number): THREE.Color => a.clone().lerp(b, k);
const own = stone();
// The skin's dusty stone, eased a little further toward its warm color: under the moon's pale light the skin's own
// came out a lavender grey beside the hollow's orange.
const crust = color(SKIN.dust.from).lerp(color(SKIN.dust.to), SKIN.dust.k + 0.3).multiplyScalar(SKIN.dust.power);
export const STONE = {
  own,
  // Broad bands of the beds: a buff stone a little yellower, a redder and a darker one, and how thick each band is.
  buff: mix(own, color('copper-light'), 0.35).multiplyScalar(1.05),
  red: mix(own, color('copper'), 0.25).multiplyScalar(0.9),
  dark: mix(own, color('text-3'), 0.2).multiplyScalar(0.7),
  bands: [41, 17, 83] as const,
  // A chipped edge, a ledge's lip and a spall's floor are fresh stone, paler and yellower. Dust is paler still.
  chip: mix(own, color('copper-light'), 0.5).multiplyScalar(1.12),
  dust: mix(own, color('text-2'), 0.45).multiplyScalar(1.05),
  // The weathered crust: the skin's dusty stone, from how far in from the planet's outer surface or under the land it
  // is full to where the fresh stone has it, in units.
  crust: { color: crust, near: 10, far: 32 },
  // A crack's floor and a bed line: what the stone is multiplied by there, a deeper and redder brown.
  cut: [0.42, 0.29, 0.24] as const,
  // Where light does not reach (a crease, a shut in place, a face turned from the core) the stone is deeper and a
  // little redder: what it is multiplied by there at most. And a face turned from the core is deeper still.
  shade: [0.82, 0.64, 0.56] as const,
  away: 0.7,
  // In the dark the stone leans this way against the warm fill and the orange bounce, so its darks are a nearly
  // neutral brown and not rust.
  neutral: [0.82, 1.0, 1.16] as const,
  // Stone nearest the core is paler and less saturated, so that the core's light takes it toward a peach tan: from
  // how far from the core's middle it begins and where it is full, in units, how much at most, and the share of its
  // color it keeps there.
  hot: { color: mix(own, color('text-2'), 0.6), from: CORE.r * 2.4, full: CORE.r * 1.2, most: 0.45, chroma: 0.5 },
  // How much of its color the stone keeps against its own grey, in the light and where no light reaches.
  chroma: [0.62, 0.35] as const,
  // How rough a clean face, a crack's floor, the dust.
  rough: [0.88, 0.96, 0.98] as const,
  // The stains' range inside a face, lit and in the dark, and the grain's tone, lit and in the dark.
  mottle: { lit: [0.9, 1.06], dark: [0.88, 1.08], grain: [0.08, 0.1] },
  // The beds: how far they lean toward the visitor and how far each block turns them, in radians.
  bed: { lean: 0.12, turn: 0.45 },
  // The lamination: how thick a bed is on average, in units, the half width of a bed line as a share of a bed, its
  // tone step, how much a line darkens, and its grit. Below `tight` beds to a pixel it all fades.
  lam: { thick: 2.6, line: [0.05, 0.13] as const, step: 0.18, dark: 0.45, grit: 0.16, tight: [0.22, 0.45] as const },
  // The small stepped ledges where a bed stands proud or is cut back: the share of bed lines that are one, and how
  // high, in units.
  ledge: { share: 0.1, high: 0.6 },
  // The spalls: how wide the shapes they are cut from are, in units, the level of that field over which a place is
  // spalled (the higher, the fewer), how deep, in units, and the half width of its stepped rim, which is on the side
  // up the beds, and of the rest of its outline, where it feathers out.
  spall: { wide: 19, over: 0.68, deep: 1.4, rim: 0.4, soft: 5 },
  // The crack strokes, three families from long to short: the cell each lies in, in units, its largest radius as a
  // share of the cell, its widest half width, in units, and the share of cells that hold one where a patch is.
  crack: [
    { cell: 30, r: 0.45, wide: 1.8, chance: 0.55 },
    { cell: 13, r: 0.44, wide: 0.85, chance: 0.65 },
    { cell: 5.5, r: 0.44, wide: 0.36, chance: 0.6 },
    { cell: 2.4, r: 0.42, wide: 0.14, chance: 0.5 },
  ],
  // How wide the patches crack strokes gather in are, in units.
  patch: 34,
  // The knapped relief: a broad swell, and the scars of flakes in two sizes, each a shallow bowl meeting the next
  // along a ridge: how wide, in units, and how deep.
  roll: { wide: [26, 13, 5], deep: [4, 0.9, 0.18] },
  // How much lighter a flake scar's ridge is than its middle.
  knap: 0.2,
  // What tone a proud, dry place and a wet, sheltered one take: a little yellower and paler, a little redder.
  tint: { dry: [1.06, 1.04, 0.94] as const, wet: [0.97, 0.86, 0.8] as const },
  // A face darkens toward its creases: from how far from one it starts, to where it is full, in units, and how much.
  form: { near: 2, far: 18, most: 0.25 },
  // A chipped edge where the mesh says how far each place is from its face's outline: its widest and its thinnest,
  // in units, the share of an edge where it is missing, and how far its bevel turns to the core.
  edge: { wide: 2.2, thin: 0.3, missing: 0.5, bevel: 0.55 },
  // How much of the light that has bounced a chipped edge in the dark catches, as a thin line.
  catch: 1.6,
  // The grain's map, how many units a tile covers, and how strongly the grain and the wider wear tilt the surface.
  grain: { period: GRAIN.period, tilt: 0.5, wear: 1.3 },
} as const;

// The stream's light on the stone: a line from the core's foot straight down, as far as the page's stream has run,
// warm, gone within `reach` units. near is how fast it falls, and power how strong it is where it is full.
export const STREAM = { reach: 78, near: 26, power: 16, color: mix(color('flame'), color('hot'), 0.35) } as const;

export interface StoneMaps {
  grain: THREE.Texture;
  release(): void;
}

let shared: { maps: Promise<StoneMaps>; users: number; textures: THREE.Texture[] } | null = null;
// The maps, made once for every user. Each user releases them once, and the last to do so frees them.
export function stoneMaps(renderer: THREE.WebGLRenderer): Promise<StoneMaps> {
  if (!shared) {
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const held = { users: 0, textures: [] as THREE.Texture[], maps: null as unknown as Promise<StoneMaps> };
    held.maps = grain(GRAIN.size, slice).then((data) => {
      const t = new THREE.DataTexture(data, GRAIN.size, GRAIN.size, THREE.RGBAFormat, THREE.UnsignedByteType);
      t.colorSpace = THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.magFilter = THREE.LinearFilter;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
      t.anisotropy = aniso;
      t.needsUpdate = true;
      held.textures = [t];
      return {
        grain: t,
        release() {
          if (--held.users > 0) return;
          for (const x of held.textures) x.dispose();
          if (shared === held) shared = null;
        },
      };
    });
    shared = held;
  }
  shared.users++;
  return shared.maps;
}

const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);
const v3 = (c: THREE.Color | readonly number[]): string => {
  const [r, g, b] = c instanceof THREE.Color ? [c.r, c.g, c.b] : c;
  return `vec3( ${f(+r.toFixed(4))}, ${f(+g.toFixed(4))}, ${f(+b.toFixed(4))} )`;
};
const C = v3(CORE.at);
const MOON = v3(new THREE.Vector3(...MOONWARD).normalize().toArray());

export const STONE_VERT_PARS = /* glsl */ `
varying vec3 vStoneP;
varying vec3 vStoneN;
#ifdef STONE_EDGE
	varying float vStoneEdge;
#endif`;
// The place and normal in the world, in units, for a mesh drawn as it is.
const VERT = /* glsl */ `
{
	vec4 stoneW = modelMatrix * vec4( transformed, 1.0 );
	vStoneP = stoneW.xyz / ${f(SCALE)};
	vec3 stoneNv = mat3( modelMatrix ) * objectNormal;
	vStoneN = stoneNv / max( length( stoneNv ), 1e-6 );
	#ifdef STONE_EDGE
		vStoneEdge = STONE_EDGE_FROM;
	#endif
}`;

const FRAG_PARS = /* glsl */ `
varying vec3 vStoneP;
varying vec3 vStoneN;
#ifdef STONE_EDGE
	varying float vStoneEdge;
#endif
uniform sampler2D uStoneGrain;
uniform vec2 uStoneStream;
uniform float uStoneStreamPower;
// What the stone works out once, before it is lit: its normal in the world, its color and roughness, and a chipped
// edge in the dark, which catches a thin line of the light that has bounced.
vec3 stoneNormal;
vec3 stoneAlbedo;
float stoneRough;
float stoneCatch;
float stoneHash1( float n ) { return fract( sin( n * 12.9898 + 4.1414 ) * 43758.5453 ); }
float stoneHash3( vec3 p ) { p = fract( p * 0.1031 ); p += dot( p, p.zyx + 31.32 ); return fract( ( p.x + p.y ) * p.z ); }
float stoneNoise3( vec3 p ) {
	vec3 i = floor( p ), u = fract( p );
	u = u * u * ( 3.0 - 2.0 * u );
	return mix( mix( mix( stoneHash3( i ), stoneHash3( i + vec3( 1, 0, 0 ) ), u.x ), mix( stoneHash3( i + vec3( 0, 1, 0 ) ), stoneHash3( i + vec3( 1, 1, 0 ) ), u.x ), u.y ),
		mix( mix( stoneHash3( i + vec3( 0, 0, 1 ) ), stoneHash3( i + vec3( 1, 0, 1 ) ), u.x ), mix( stoneHash3( i + vec3( 0, 1, 1 ) ), stoneHash3( i + vec3( 1, 1, 1 ) ), u.x ), u.y ), u.z );
}
// The same noise with its gradient, in xyz, and its value in w.
vec4 stoneNoiseD( vec3 p ) {
	vec3 i = floor( p ), f = fract( p ), u = f * f * ( 3.0 - 2.0 * f ), du = 6.0 * f * ( 1.0 - f );
	float a = stoneHash3( i ), b = stoneHash3( i + vec3( 1, 0, 0 ) ), c = stoneHash3( i + vec3( 0, 1, 0 ) ), d = stoneHash3( i + vec3( 1, 1, 0 ) );
	float e = stoneHash3( i + vec3( 0, 0, 1 ) ), g = stoneHash3( i + vec3( 1, 0, 1 ) ), h = stoneHash3( i + vec3( 0, 1, 1 ) ), k = stoneHash3( i + vec3( 1, 1, 1 ) );
	float k1 = b - a, k2 = c - a, k3 = e - a, k4 = a - b - c + d, k5 = a - c - e + h, k6 = a - b - e + g, k7 = - a + b + c - d + e - g - h + k;
	return vec4( du * vec3( k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z, k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x, k3 + k6 * u.x + k5 * u.y + k7 * u.x * u.y ),
		a + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z );
}
float stoneNoise1( float x ) { float i = floor( x ), u = fract( x ); u = u * u * ( 3.0 - 2.0 * u ); return mix( stoneHash1( i ), stoneHash1( i + 1.0 ), u ); }
// A slope stored as a normal's red and green, as the slope itself.
vec2 stoneSlope( vec4 t ) { vec2 xy = t.rg * 2.0 - 1.0; return xy / sqrt( max( 1.0 - dot( xy, xy ), 0.05 ) ); }
// v turned by a about the unit axis k.
vec3 stoneTurn( vec3 v, vec3 k, float a ) { float c = cos( a ), s = sin( a ); return v * c + cross( k, v ) * s + k * dot( k, v ) * ( 1.0 - c ); }
// The grain from the three axes: its slope as a vector in the world, its tone and how open it is. A bias on the
// map's level blurs it: what is left of it is its wider wear.
void stoneGrainAt( vec3 p, vec3 w, float scale, float bias, out vec3 slope, out vec2 toneOpen ) {
	vec4 gx = texture2D( uStoneGrain, p.zy * scale + 0.31, bias ), gy = texture2D( uStoneGrain, p.xz * scale + 0.57, bias ), gz = texture2D( uStoneGrain, p.xy * scale + 0.83, bias );
	vec2 sx = stoneSlope( gx ), sy = stoneSlope( gy ), sz = stoneSlope( gz );
	slope = vec3( 0.0, sx.y, sx.x ) * w.x + vec3( sy.x, 0.0, sy.y ) * w.y + vec3( sz.x, sz.y, 0.0 ) * w.z;
	toneOpen = vec2( gx.b * w.x + gy.b * w.y + gz.b * w.z, gx.a * w.x + gy.a * w.y + gz.a * w.z );
}
// One family of crack strokes. A cell of \`cell\` units holds at most one small disc of fracture, of its own size and
// facing, more often where a patch of them is. Where the face cuts the disc it shows as a short stroke that tapers out
// at both ends. x is how much of the pixel the crack covers, y its far wall's lip, which faces the core.
vec2 stoneCrack( vec3 p, vec3 n, vec3 lT, float cell, float rMost, float wide, float chance, float seed, float pix ) {
	vec3 q = p / cell + seed, i = floor( q ), f = q - i;
	float gather = stoneNoise3( ( i + 0.5 ) * ( cell / ${f(STONE.patch)} ) + seed * 0.37 );
	if ( stoneHash3( i + seed * 1.7 ) > chance * smoothstep( 0.3, 0.65, gather ) ) return vec2( 0.0 );
	float R = rMost * mix( 0.2, 1.0, pow( stoneHash3( i * 1.31 + 4.0 ), 1.4 ) );
	vec3 c = vec3( R ) + ( 1.0 - 2.0 * R ) * vec3( stoneHash3( i + 11.0 ), stoneHash3( i + 23.0 ), stoneHash3( i + 37.0 ) );
	float a = 6.2832 * stoneHash3( i + 41.0 ), z = 2.0 * stoneHash3( i + 53.0 ) - 1.0;
	vec3 m = vec3( sqrt( max( 1.0 - z * z, 0.0 ) ) * vec2( cos( a ), sin( a ) ), z );
	vec3 o = ( f - c ) * cell;
	float dm = dot( o, m ), r = length( o - m * dm ) / ( R * cell ) + 0.35 * ( stoneNoise3( o / ( 0.3 * R * cell ) + i * 2.3 ) - 0.5 );
	if ( r >= 1.0 ) return vec2( 0.0 );
	float nm = dot( n, m ), cut = sqrt( max( 1.0 - nm * nm, 0.0 ) ), on = smoothstep( 0.3, 0.55, cut );
	float hw = wide * ( 0.35 + 0.65 * stoneHash3( i + 67.0 ) ) * sqrt( max( 1.0 - r * r * r * r, 0.0 ) ) * ( 0.3 + 1.3 * stoneNoise3( o / ( 0.35 * R * cell ) + i ) ) / max( cut, 0.3 );
	float sd = abs( dm ) / max( cut, 0.3 ) + 0.35 * hw * ( stoneNoise3( p / max( 0.6 * wide, 0.25 ) + i * 1.7 ) - 0.5 ), e = max( pix, 1e-4 );
	float k = clamp( ( hw + 0.5 * e - sd ) / e, 0.0, 1.0 ) * min( 1.0, 2.0 * hw / e ) * on;
	float lip = clamp( ( 1.8 * hw + 0.5 * e - sd ) / e, 0.0, 1.0 ) * ( 1.0 - k ) * step( dm * dot( m, lT ), 0.0 ) * smoothstep( 0.8, 2.0, hw / e ) * on;
	return vec2( k, lip );
}
// The scars that flakes left when the face was knapped: cells of \`cell\` units, each a shallow bowl round a point of
// its own, meeting its neighbours along ridges. The slope of the surface there, in the world, per unit of depth,
// and how far out from the bowl's middle the place is, in cells.
vec4 stoneScallop( vec3 p, float cell, float seed ) {
	vec3 q = p / cell + seed, b = floor( q - 0.5 ), best = vec3( 0.0 );
	float d1 = 1e9;
	for ( int k = 0; k < 8; k++ ) {
		vec3 i = b + vec3( float( k & 1 ), float( ( k >> 1 ) & 1 ), float( ( k >> 2 ) & 1 ) );
		vec3 o = q - i - ( 0.25 + 0.5 * vec3( stoneHash3( i + 3.1 ), stoneHash3( i + 17.3 ), stoneHash3( i + 29.7 ) ) );
		float d = dot( o, o );
		if ( d < d1 ) { d1 = d; best = o; }
	}
	return vec4( 2.0 * best / cell, sqrt( d1 ) );
}`;

// Works out the stone at this place. In a part's fragment shader it goes after <color_fragment>.
const STONE_FRAG = /* glsl */ `
{
	vec3 p = vStoneP, n = vStoneN / max( length( vStoneN ), 1e-6 );
	float facing = abs( dot( normalize( vNormal + vec3( 1e-6 ) ), normalize( vViewPosition + vec3( 1e-6 ) ) ) );
	vec3 toC = ${C} - p;
	float dC = max( length( toC ), 1e-3 );
	vec3 lC = toC / dC;
	// How the face turns to the core, and the way to the core along the face.
	float cf = dot( n, lC );
	vec3 lT = lC - n * cf;
	float lTl = length( lT );
	lT = lTl > 1e-4 ? lT / lTl : vec3( 0.0 );
	float open = 1.0, seen = 1.0, moon = 0.0;
	#ifdef WORLD_BAKED
		open = wLight.z;
		seen = wLight.x;
		moon = wLight.y;
	#endif
	// Each block was turned when it broke, so its beds lie at their own angle, and each is its own tone. A block's
	// own number gives those; without one, large slow fields of the place do, which never change across a face at once.
	#if defined( WORLD_BAKED ) && defined( STONE_SLAB )
		float slab = wLight.w;
		float bShift = slab * 997.0, bAxis = slab, bTurn = fract( slab * 7.31 ), bTone = fract( slab * 5.13 ), bRough = fract( slab * 9.73 );
		vec3 bOff = vec3( slab * 11.0, slab * 5.0, slab * 3.0 );
	#else
		vec4 slow = vec4( stoneNoise3( p / 170.0 + 0.3 ), stoneNoise3( p / 130.0 + 5.1 ), stoneNoise3( p / 150.0 + 9.7 ), stoneNoise3( p / 110.0 + 2.2 ) );
		float bShift = 50.0 * slow.x, bAxis = slow.y, bTurn = slow.z, bTone = slow.w, bRough = slow.x;
		vec3 bOff = slow.yzw * 3.0;
	#endif
	float pix = max( length( dFdx( p ) ), length( dFdy( p ) ) );

	// The beds, turned by the block's own angle. Nothing of them shows on a face within 35 degrees of them: seen on
	// such a face they are slow rings.
	vec3 across = normalize( vec3( 0.0, 1.0, ${f(STONE.bed.lean)} ) );
	float sa = bAxis * 6.2832;
	across = normalize( stoneTurn( across, normalize( vec3( cos( sa ), 0.35 * sin( 3.0 * sa ), sin( sa ) ) ), ${f(STONE.bed.turn)} * ( bTurn - 0.5 ) * 2.0 ) );
	float bed = dot( p, across ) + bShift + 2.2 * ( stoneNoise3( p / 53.0 ) - 0.5 ) + 0.45 * ( stoneNoise3( p / 13.0 + 4.1 ) - 0.5 );
	vec3 acrossT = across - n * dot( across, n );
	float side = length( acrossT );
	acrossT = side > 1e-4 ? acrossT / side : vec3( 0.0 );
	float sideK = smoothstep( 0.72, 0.9, side ) * ( 1.0 - smoothstep( 0.45, 0.75, n.y ) );

	// The grain, near and wider, from the three axes. A face seen nearly edge on keeps only its grain's tone.
	vec3 w = pow( abs( n ), vec3( 4.0 ) );
	w /= max( w.x + w.y + w.z, 1e-5 );
	vec3 gNear, gWide;
	vec2 tNear, tWide;
	stoneGrainAt( p, w, ${f(1 / STONE.grain.period)}, 0.0, gNear, tNear );
	stoneGrainAt( p * 0.2327 + 17.0, w, ${f(1 / STONE.grain.period)}, 3.0, gWide, tWide );
	float edgeOn = smoothstep( 0.06, 0.28, facing );
	float st1 = stoneNoise3( p / 31.0 + bOff * 3.7 ), st2 = stoneNoise3( p / 11.0 + 2.7 ), st3 = stoneNoise3( p / 4.3 + 8.1 );
	// How far the place is from the core's light: in the dark the stone is near black and nearly neutral.
	float dark = 1.0 - smoothstep( 0.0, 0.2, max( cf, 0.0 ) * seen );
	vec3 tilt = vec3( 0.0 );
	vec3 c = ${v3(STONE.own)};

	#ifndef STONE_GRAIN
		// The lamination. su counts beds, of uneven thickness, which pinch out here and there. sd is how far the place
		// is from the nearest bed line, in beds, below it (under 0) or above it.
		float su = ( bed + 3.0 * stoneNoise1( bed / 11.0 + bAxis * 17.0 ) + 0.9 * stoneNoise1( bed / 3.9 + 3.0 ) + 0.18 * ( st3 - 0.5 ) ) / ${f(STONE.lam.thick)};
		float sw = max( fwidth( su ), 1e-4 );
		float si = floor( su ), sf = su - si;
		float lamK = sideK * edgeOn * ( 1.0 - smoothstep( ${f(STONE.lam.tight[0])}, ${f(STONE.lam.tight[1])}, sw ) );
		float near = sf < 0.5 ? si : si + 1.0, sd = sf < 0.5 ? sf : sf - 1.0;
		// Packets of thin laminae, between massive beds that carry few lines.
		float packet = smoothstep( 0.45, 0.75, stoneNoise1( near / 6.0 + bAxis * 23.0 ) ) * smoothstep( 0.25, 0.6, stoneNoise3( p / 40.0 + bOff * 1.3 ) );
		float lh = stoneHash1( near * 1.37 + 0.5 );
		float lShow = smoothstep( 0.97 - 0.55 * packet, 1.0 - 0.55 * packet, lh ) * ( 0.35 + 0.65 * fract( lh * 13.7 ) );
		float lW = mix( ${f(STONE.lam.line[0])}, ${f(STONE.lam.line[1])}, stoneHash1( near * 2.11 + 3.0 ) );
		float lBreak = smoothstep( 0.5, 0.62, stoneNoise3( p / mix( 2.5, 7.0, stoneHash1( near * 4.7 ) ) + near * vec3( 1.3, 2.1, 0.7 ) ) ) * mix( 0.4, 1.0, st3 );
		float lam = clamp( ( lW + 0.5 * sw - abs( sd ) ) / sw, 0.0, 1.0 ) * min( 1.0, 2.0 * lW / sw ) * lShow * lBreak * lamK;
		float bedTone = ( stoneHash1( si * 2.3 + 1.0 ) - 0.5 ) * sideK * edgeOn * ( 1.0 - smoothstep( 0.3, 0.7, sw ) );
		float grit = ( 1.0 - smoothstep( 0.0, 0.3, sf ) ) * lamK * mix( 0.4, 1.0, packet ) * smoothstep( 0.3, 0.7, tNear.x + 0.3 * ( st3 - 0.5 ) );
		// A small stepped ledge, where the bed above stands proud of the one below or is cut back from it.
		float isLedge = step( ${f(1 - STONE.ledge.share)}, stoneHash1( near * 3.1 + 7.0 ) ) * lamK * smoothstep( 0.55, 0.68, stoneNoise3( p / 4.5 + near * vec3( 0.7, 1.9, 2.3 ) ) );
		float le = max( 0.1, 1.5 * sw ), lx = clamp( ( sd + le ) / ( 2.0 * le ), 0.0, 1.0 );
		float lStep = 6.0 * lx * ( 1.0 - lx );
		float lSlope = isLedge * ${f(STONE.ledge.high)} * ( stoneHash1( near * 5.3 ) > 0.5 ? 1.0 : -1.0 ) * lStep / ( 2.0 * le * ${f(STONE.lam.thick)} );
		tilt -= acrossT * clamp( lSlope, -2.5, 2.5 );

		// The spalls: shallow scars where a flake came away, cut from a ragged field, each with a stepped rim. Inside one
		// the stone is fresher, and near its rim toward the core it lies in the rim's shadow.
		vec3 warp = vec3( st1, stoneNoise3( p / 23.0 + 5.5 ), st2 ) - 0.5;
		vec3 sp = p + warp * 7.0;
		vec4 s1 = stoneNoiseD( sp / ${f(STONE.spall.wide)} + bOff * 2.1 ), s2 = stoneNoiseD( sp / ${f(STONE.spall.wide * 0.36)} + 7.7 );
		float sv = 0.72 * s1.w + 0.28 * s2.w;
		vec3 sg = 0.72 * s1.xyz / ${f(STONE.spall.wide)} + 0.28 * s2.xyz / ${f(STONE.spall.wide * 0.36)};
		vec3 sgT = sg - n * dot( sg, n );
		float sgl = max( length( sgT ), 1e-4 );
		float upRim = smoothstep( 0.1, 0.6, dot( -sgT / sgl, acrossT ) ) * smoothstep( 0.35, 0.55, st3 + 0.3 * ( tNear.x - 0.5 ) );
		float se = mix( ${f(STONE.spall.soft)}, max( ${f(STONE.spall.rim)}, 0.75 * pix ), upRim ) * sgl, sx = clamp( ( sv - ${f(STONE.spall.over)} + se ) / ( 2.0 * se ), 0.0, 1.0 );
		float spallK = edgeOn * ( 1.0 - 0.7 * smoothstep( 0.4, 0.8, n.y ) );
		float inS = smoothstep( 0.0, 1.0, sx ) * spallK;
		vec3 sTilt = sgT * ( ${f(STONE.spall.deep)} * 6.0 * sx * ( 1.0 - sx ) / ( 2.0 * se ) ) * spallK;
		float sTl = length( sTilt );
		tilt += sTilt * ( min( sTl, 2.5 ) / max( sTl, 1e-4 ) );
		float toRim = max( sv - ${f(STONE.spall.over)}, 0.0 ) / sgl, rimWay = dot( -sgT / sgl, lT );
		float shadowLong = ${f(STONE.spall.deep)} * sqrt( max( 1.0 - cf * cf, 0.0 ) ) / max( cf, 0.05 );
		float sShade = inS * smoothstep( 0.0, 0.35, rimWay ) * ( 1.0 - smoothstep( 0.7 * shadowLong, shadowLong, toRim ) ) * ( 1.0 - dark );

		// The crack strokes, three families of very different lengths, gathered in patches.
		vec2 crk = vec2( 0.0 );
		vec3 cp = p + warp * 3.0;
		${STONE.crack.map((k, i) => `crk = max( crk, stoneCrack( cp, n, lT, ${f(k.cell)}, ${f(k.r)}, ${f(k.wide)}, ${f(k.chance)}, ${f(1.3 + 7.1 * i)}, pix ) );`).join('\n\t\t')}
		crk *= edgeOn * ( 1.0 - 0.6 * smoothstep( 0.45, 0.8, n.y ) );

		// The weathered crust: how far in from the planet's outer surface, and under the land, the place is.
		float shR = length( p.xz ) / ${f(WORLD.half)}, shD = max( 0.0, -( p.y + ${f(RIM)} ) ) / ${f(WORLD.deep)};
		float inside = ( 1.0 - sqrt( shR * shR + shD * shD ) ) * mix( ${f(WORLD.half)}, ${f(WORLD.deep)}, shD / max( shR + shD, 1e-3 ) );
		float under = sqrt( max( 1.0, ${f(WORLD.top * WORLD.top)} - dot( p.xz, p.xz ) ) ) - ${f(WORLD.top)} - p.y;
		float crustK = 1.0 - smoothstep( ${f(STONE.crust.near)}, ${f(STONE.crust.far)}, min( inside, under ) + 12.0 * ( stoneNoise3( p / 19.0 + 3.0 ) - 0.5 ) );
		// Under the moon the stone is the crust's pale warm grey tan too.
		crustK = max( crustK, 0.75 * smoothstep( 0.05, 0.5, moon ) * smoothstep( 0.0, 0.3, dot( n, ${MOON} ) ) );

		// A face darkens toward its creases, and its chipped edges, where the mesh says where they are, are fresh
		// stone, wide here and a hairline there, bitten and missing for a stretch, with a bevel turned to the core.
		float fromEdge = 1e3, chipped = 0.0, bev = 0.0, formK = 1.0;
		float bite = st3 * 0.6 + 0.4 * tNear.x;
		#ifdef STONE_EDGE
			fromEdge = vStoneEdge;
			float band = ${f(STONE.edge.thin)} + ${f(STONE.edge.wide - STONE.edge.thin)} * pow( stoneNoise3( p / 9.0 + 2.0 ), 2.0 );
			float there = smoothstep( ${f(STONE.edge.missing)} - 0.05, ${f(STONE.edge.missing)} + 0.05, stoneNoise3( p / 23.0 + 7.0 ) );
			float convex = smoothstep( 0.12, 0.3, open );
			chipped = ( 1.0 - smoothstep( 0.6 * band, band, fromEdge ) ) * smoothstep( 0.32, 0.55, bite ) * there * convex;
			bev = chipped;
			formK = 1.0 - ${f(STONE.form.most)} * ( 1.0 - smoothstep( ${f(STONE.form.near)}, ${f(STONE.form.far)}, fromEdge + 4.0 * ( st2 - 0.5 ) ) ) * mix( 1.0, 0.35, convex );
		#endif
	#endif

	// The knapped relief: broad shells meeting along ridges, whose light differs across a face.
	vec4 r1 = stoneNoiseD( p / ${f(STONE.roll.wide[0])} + bOff * 5.7 );
	vec4 sc1 = stoneScallop( p, ${f(STONE.roll.wide[1])}, bOff.x * 3.0 ), sc2 = stoneScallop( p, ${f(STONE.roll.wide[2])}, 7.7 );
	float fine2 = smoothstep( 0.6, 0.25, pix );
	vec3 roll = r1.xyz * ${f(STONE.roll.deep[0] / STONE.roll.wide[0])} + sc1.xyz * ${f(STONE.roll.deep[1])} * ( 0.5 + bRough ) + sc2.xyz * ${f(STONE.roll.deep[2])} * fine2;
	// A flake's bowl is a little darker at its middle, and the ridges between are proud and catch the light.
	float knap = ( smoothstep( 0.25, 0.62, sc1.w ) - 0.5 ) + 0.2 * fine2 * ( smoothstep( 0.25, 0.62, sc2.w ) - 0.5 );
	float up = smoothstep( 0.35, 0.75, n.y );
	float dust = up * smoothstep( 0.2, 0.55, 0.3 + 0.45 * ( 1.0 - open ) + 0.3 * ( st1 - 0.5 ) );
	tilt += ${f(STONE.grain.tilt)} * edgeOn * ( gNear * mix( 1.0, 1.6, dust ) + ${f(STONE.grain.wear)} * gWide * ( 1.0 - 0.6 * dust ) );
	tilt += roll * edgeOn * ( 0.6 + 0.8 * bRough ) * ( 1.0 - 0.5 * dust );
	tilt -= n * dot( tilt, n );
	stoneNormal = normalize( n + tilt );

	// The color: the broad bands of the beds, the stains, the grain, the hot zone, the crust, the marks, the shade.
	float b1 = stoneNoise1( bed / ${f(STONE.bands[0])} ), b2 = stoneNoise1( bed / ${f(STONE.bands[1])} + 7.3 ), b3 = stoneNoise1( bed / ${f(STONE.bands[2])} + 3.7 );
	float bandK = sideK * ( 1.0 - smoothstep( 0.3, 1.0, fwidth( bed ) / 8.0 ) );
	c = mix( c, ${v3(STONE.buff)}, 0.5 * smoothstep( 0.45, 0.9, b1 ) * bandK );
	c = mix( c, ${v3(STONE.red)}, 0.45 * smoothstep( 0.5, 0.9, b2 ) * bandK );
	c = mix( c, ${v3(STONE.dark)}, 0.5 * smoothstep( 0.5, 0.95, b3 ) * bandK );
	c *= 0.9 + 0.2 * bTone;
	c *= 1.0 + ${f(STONE.knap)} * knap * edgeOn;
	c *= mix( vec3( 1.0 ), knap > 0.0 ? ${v3(STONE.tint.dry)} : ${v3(STONE.tint.wet)}, 2.0 * abs( knap ) * edgeOn );
	vec2 mot = mix( vec2( ${f(STONE.mottle.lit[0])}, ${f(STONE.mottle.lit[1])} ), vec2( ${f(STONE.mottle.dark[0])}, ${f(STONE.mottle.dark[1])} ), dark );
	c *= mix( mot.x, mot.y, smoothstep( 0.2, 0.8, st1 * 0.7 + st2 * 0.3 ) );
	float gAmp = mix( ${f(STONE.mottle.grain[0])}, ${f(STONE.mottle.grain[1])}, dark );
	c *= ( 1.0 + gAmp * ( tNear.x - 0.5 ) * 2.0 ) * mix( 1.0 - gAmp * 1.5, 1.0, tNear.y ) * mix( 0.9, 1.0, tWide.y );
	float hotK = ${f(STONE.hot.most)} * seen * smoothstep( 0.05, 0.45, cf ) * ( 1.0 - smoothstep( ${f(STONE.hot.full)}, ${f(STONE.hot.from)}, dC ) );
	c = mix( c, ${v3(STONE.hot.color)}, hotK );
	vec3 cut = ${v3(STONE.cut)};
	float rough = 0.0;
	#ifndef STONE_GRAIN
		c *= 1.0 + ${f(STONE.lam.step)} * bedTone;
		c *= mix( vec3( 1.0 ), stoneHash1( si * 4.1 + 2.0 ) > 0.5 ? ${v3(STONE.tint.dry)} : ${v3(STONE.tint.wet)}, abs( bedTone ) * 2.0 );
		c = mix( c, ${v3(STONE.crust.color)} * ( 0.9 + 0.2 * tNear.x ) * mix( 0.92, 1.04, st1 ), crustK );
		c *= 1.0 - ${f(STONE.lam.grit)} * grit;
		c = mix( c, ${v3(STONE.chip)}, 0.4 * isLedge * lStep / 1.5 );
		c = mix( c, ${v3(STONE.chip)}, 0.2 * inS );
		c *= 1.0 - 0.55 * sShade;
		c = mix( c, c * cut, ${f(STONE.lam.dark)} * lam );
		c = mix( c, c * cut, 0.9 * crk.x );
		c = mix( c, ${v3(STONE.chip)}, 0.5 * crk.y );
		c = mix( c, ${v3(STONE.chip)} * ( 0.9 + 0.2 * tNear.x ), 0.3 * chipped );
		c *= formK;
		rough = max( crk.x, lam );
	#endif
	c = mix( c, ${v3(STONE.dust)} * ( 0.88 + 0.24 * tNear.x ) * mix( 0.85, 1.0, tNear.y ), 0.7 * dust );
	// Where light does not reach the stone goes deeper and a little redder, and a face turned from the core deeper
	// still: the far frame is near black.
	float away = smoothstep( 0.0, -0.5, cf );
	float shadeK = clamp( 0.25 * ( 1.0 - open ) + 0.2 * ( 1.0 - seen ) + 0.4 * away, 0.0, 1.0 );
	c *= mix( vec3( 1.0 ), ${v3(STONE.shade)}, shadeK ) * mix( 1.0, ${f(STONE.away)}, away );
	c *= mix( vec3( 1.0 ), ${v3(STONE.neutral)}, dark );
	float chroma = mix( mix( ${f(STONE.chroma[0])}, ${f(STONE.hot.chroma)}, hotK / ${f(STONE.hot.most)} ), ${f(STONE.chroma[1])}, dark );
	#ifndef STONE_GRAIN
		chroma = mix( chroma, 1.0, crustK );
	#endif
	stoneAlbedo = mix( vec3( dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) ), c, chroma );
	stoneRough = mix( mix( ${f(STONE.rough[0])}, ${f(STONE.rough[1])}, rough ), ${f(STONE.rough[2])}, dust );
	stoneCatch = 0.0;
	#ifndef STONE_GRAIN
		stoneNormal = normalize( mix( stoneNormal, lC, ${f(STONE.edge.bevel)} * bev * smoothstep( -0.6, 0.2, cf ) ) );
		stoneCatch = chipped * dark;
	#endif
	diffuseColor.rgb = stoneAlbedo;
	#ifdef STONE_DEBUG
		diffuseColor.rgb = vec3( 0.0 );
		float stoneShow = STONE_DEBUG == 1 ? open : STONE_DEBUG == 2 ? seen : STONE_DEBUG == 3 ? fromEdge / 16.0 : STONE_DEBUG == 4 ? crustK : STONE_DEBUG == 5 ? moon : STONE_DEBUG == 6 ? lam + crk.x : sideK;
		totalEmissiveRadiance = vec3( stoneShow );
	#endif
}`;

// The page's stream as a light on the stone: a line from the core's foot straight down as far as its leading end has
// run (uStoneStream.y), as strong as the stream is there (uStoneStream.x), warm, gone within STREAM.reach. Nothing
// further down than the leading end is lit. And a chipped edge in the dark catches a line of the light that has bounced.
const STREAM_LIGHT = /* glsl */ `
{
	vec3 p = vStoneP;
	float below = ${f(SOURCE[1])} - p.y;
	float t = clamp( below, 0.0, uStoneStream.y );
	vec3 q = vec3( ${f(SOURCE[0])}, ${f(SOURCE[1])} - t, ${f(SOURCE[2])} ) - p;
	float d = max( length( q ), 1e-3 ), k = clamp( 1.0 - d / ${f(STREAM.reach)}, 0.0, 1.0 );
	float c = dot( stoneNormal, q / d );
	float fall = k * k / ( 1.0 + ( d / ${f(STREAM.near)} ) * ( d / ${f(STREAM.near)} ) ) * ( 1.0 - smoothstep( uStoneStream.y - 12.0, uStoneStream.y, below ) );
	reflectedLight.directDiffuse += ${v3(STREAM.color)} * ( ${f(STREAM.power)} * uStoneStreamPower * uStoneStream.x * fall * clamp( ( c + 0.3 ) / 1.3, 0.0, 1.0 ) ) * BRDF_Lambert( material.diffuseContribution );
	#ifdef WORLD_BAKED
		reflectedLight.indirectDiffuse += wBounce * ( ${f(STONE.catch)} * stoneCatch ) * BRDF_Lambert( material.diffuseContribution );
	#endif
}`;

type Shader = THREE.WebGLProgramParametersWithUniforms;
const after = (src: string, chunk: string, add: string): string => {
  if (!src.includes(`#include <${chunk}>`)) throw new Error(`stone: the shader has no ${chunk}`);
  return src.replace(`#include <${chunk}>`, `#include <${chunk}>\n${add}`);
};

// Lays the stone into a standard shader's fragment stage, and the vertex stage too unless the part sets vStoneP and
// vStoneN itself (own: true). grainOnly leaves out the beds, the cracks, the spalls, the crust and the edges: the
// stone's body, its grain, its knapped relief and its wear, for what broke away.
export function stoneShader(sh: Shader, maps: StoneMaps, own = false, grainOnly = false): void {
  Object.assign(sh.uniforms, { uStoneGrain: { value: maps.grain }, uStoneStreamPower: { value: 1 }, uStoneStream: world.uniforms.uStream });
  if (!own) sh.vertexShader = after(after(sh.vertexShader, 'common', STONE_VERT_PARS), 'begin_vertex', VERT);
  let fr = after(sh.fragmentShader, 'common', `${grainOnly ? '#define STONE_GRAIN\n' : ''}${FRAG_PARS}`);
  fr = after(fr, 'color_fragment', STONE_FRAG);
  fr = after(fr, 'roughnessmap_fragment', 'roughnessFactor = stoneRough;');
  fr = after(fr, 'normal_fragment_maps', 'normal = normalize( ( viewMatrix * vec4( stoneNormal, 0.0 ) ).xyz );');
  fr = after(fr, 'lights_fragment_begin', STREAM_LIGHT);
  sh.fragmentShader = fr;
}

export interface StoneOptions {
  // A name for the shader, which must differ wherever the options differ.
  key: string;
  // The mesh carries the world's stored light (../../light.ts).
  baked?: boolean;
  // What the stored light's spare number (light.w) is: a number of each slab's own, steady over the slab ('slab'), or
  // nothing the stone reads (the default).
  spare?: 'slab';
  // Where each vertex's distance to its face's outline is stored, as a GLSL expression of the vertex stage (such as
  // 'aBounce.w * 8.0'), in units: the chipped band along an edge and the shade toward a crease are then real widths.
  edge?: string;
  // The stone's body, grain and wear only (see stoneShader).
  grainOnly?: boolean;
  // Draws one thing the stone reads instead of the stone, to judge it: 1 openness, 2 the core's share seen, 3 the
  // distance to an edge, 4 the crust, 5 the moon's share, 6 the bed lines and cracks, 7 where the beds may show.
  debug?: number;
}
// A standard material of the stone, joined to the world's light.
export function stoneMaterial(maps: StoneMaps, o: StoneOptions): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: STONE.rough[0], metalness: 0 });
  m.defines = {
    ...m.defines,
    ...(o.spare === 'slab' ? { STONE_SLAB: '' } : {}),
    ...(o.edge ? { STONE_EDGE: '', STONE_EDGE_FROM: o.edge } : {}),
    ...(o.debug ? { STONE_DEBUG: String(Math.round(o.debug)) } : {}),
  };
  m.onBeforeCompile = (sh) => stoneShader(sh, maps, false, o.grainOnly);
  return lit(m, { key: `stone-${o.key}${o.spare ? '-slab' : ''}${o.edge ? '-edge' : ''}${o.grainOnly ? '-grain' : ''}${o.debug ? `-debug${o.debug}` : ''}`, baked: o.baked });
}
