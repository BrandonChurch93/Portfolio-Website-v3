import * as THREE from 'three';
import { CORE, LIGHT, MOONWARD, RIM, SCALE, SOURCE, WORLD } from '../../layout';
import { color, lit, stone, world } from '../../light';
import { slice } from '../../../../world/build';
import { STONE as SKIN } from '../skin/look';
import { GRAIN, grain } from './grain';

// The planet's stone: what the torn rock is made of, and what a piece that broke away may wear. A broken sandstone
// whose color comes from the light on it. A lit face is mostly clean stone: a fine grain of sand with pits, a few
// hairline cracks seen only close, a tone that rolls slowly across it, and here and there a long thin scar cut into
// it, running with the rock's layering, which fans out from the core as the slabs do. Scars gather along edges and in
// a few places and leave whole plates clean. Each is cut: a floor in shadow, a hard dark edge under the wall that
// faces away from the core and a lit lip on the wall that faces it. Where two plates meet, and in what is shut in,
// the stone holds a band of deeper, redder shade. A convex edge turned to the light is chipped pale here and there.
// The first tens of units in from the planet's outer surface and under the land are its weathered crust, the skin's
// dusty tone. The stone adds no darkness of its own where the core's light does not reach: the light and the bounce
// make the darks.
//
// What has a direction (the scars, the cracks) is worked out in three dimensions from the place, so it lies on every
// face as the stone would and runs on round a crease. The grain is the one map, worked out from a seed when the world
// loads (./grain.ts) and laid from the three axes.
//
//   const maps = await stoneMaps(renderer)                           once, shared by every user, released with maps.release()
//   const m = stoneMaterial(maps, { key: 'rock', baked, spare, edge }) a standard material joined to the world's light
//
// A block's own number (spare: 'slab') sets its tone. Without one, large slow fields of the place do.
//
// A part that moves its own vertices (what broke away) lays the stone in itself: STONE_VERT_PARS in its vertex
// shader, then it sets vStoneP (the place, in units) and vStoneN (the normal, in the same frame), and calls
// stoneShader(sh, maps, true) for the whole stone, or stoneShader(sh, maps, true, true) for its body, grain, stains
// and wear without its scars, crust and edges. Every name the stone puts in a shader begins with stone (or vStone,
// uStone): uStoneStreamPower at 0 takes the page's stream's light off, for a part that lights itself from the stream.

const mix = (a: THREE.Color, b: THREE.Color, k: number): THREE.Color => a.clone().lerp(b, k);
const own = stone();
const lum = (c: THREE.Color): number => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
// What a color is multiplied by to ease it k of the way toward the palette's warm grey and keep its brightness.
const tint = (c: THREE.Color, k: number): readonly number[] => {
  const to = mix(c, color('text-2'), k);
  to.multiplyScalar(lum(c) / Math.max(lum(to), 1e-6));
  return [to.r / c.r, to.g / c.g, to.b / c.b];
};
// The skin's dusty stone, eased a little further toward its warm color: under the moon's pale light the skin's own
// came out a lavender grey beside the hollow's orange.
const crust = color(SKIN.dust.from).lerp(color(SKIN.dust.to), SKIN.dust.k + 0.3).multiplyScalar(SKIN.dust.power);
export const STONE = {
  own,
  // What a redder stain, where iron has gathered, and a drier, buff one multiply the stone by.
  redTint: [1, 0.8, 0.7] as const,
  buffTint: [1.05, 1.04, 0.97] as const,
  // A chipped edge and a scar's lit lip are fresh stone, paler. Dust is paler still and greyer.
  chip: mix(own, color('text-2'), 0.42).multiplyScalar(1.18),
  dust: mix(own, color('text-2'), 0.45).multiplyScalar(1.05),
  // The weathered crust: the skin's dusty stone, from how far in from the planet's outer surface or under the land it
  // is full to where the fresh stone has it, in units. Under the moon the stone eases this far toward it and keeps
  // every mark of its own, and keeps this share of its color: the moonlit roof is a greyer tan than the hollow.
  crust: { color: crust, near: 10, far: 32, moon: 0.35, moonChroma: 0.7 },
  // What a scar's floor multiplies the face's stone by: much darker, and redder.
  cut: [0.11, 0.075, 0.062] as const,
  // The stains over a face: how wide the broad and the smaller ones are, in units, how much darker and lighter they
  // make it, how much the smaller count against the broad, and how wide the redder and the drier stains are and how
  // much of each at most. Kept broad: stains as small as the scars read as a dappled print at the page's size.
  stain: { wide: [64, 26], range: [0.8, 1.1], small: 0.18, red: [70, 0.55], buff: [52, 0.4] },
  // How much of its color the stone keeps against its own grey, in the light and in the dark.
  chroma: [0.9, 0.88] as const,
  // What the stone is multiplied by where the core's light is full on it: its lit faces a peach tan, as the
  // picture's are, and not a pumpkin orange. The core's light is so orange that only a stone much paler in its blue
  // and green can come out tan under it: the stone eased toward the palette's warm grey as far as `tan`, at the same
  // brightness. A face the light only grazes, and the shade, keep a redder brown, as bright as the stone: the stone adds
  // no darkness of its own there.
  litTint: tint(own, 0.55),
  // Where the core's light begins to take the stone to tan and where it is full, as the share of the light a face
  // turned square to the core at its surface would have: in between, the mid tones keep the redder brown.
  full: [0.1, 0.36] as const,
  shadeTint: [1.24, 0.91, 0.74] as const,
  // Stone nearest the core is paler and less saturated, so that the core's light takes it toward a peach tan: from
  // how far from the core's middle it begins and where it is full, in units, how much at most, and the share of its
  // color it keeps there.
  hot: { color: mix(own, color('text-2'), 0.6), from: CORE.r * 2.6, full: CORE.r * 1.2, most: 0.2, chroma: 0.6 },
  // How rough a clean face, a scar's floor, the dust, and a grain that glints.
  rough: [0.88, 0.96, 0.98, 0.5] as const,
  // How much it mirrors the light, as a share of what a standard material does, and for the few grains that glint.
  sheen: 0.2,
  sparkle: { share: 0.006, sheen: 0.8 },
  // The grain's tone, lit and in the dark, and how strongly the grain and the wider wear tilt the surface.
  grainTone: [0.11, 0.12] as const,
  grain: { period: GRAIN.period, tilt: 0.7, wear: 1.1 },
  // The scars. They run with the rock's layering, which fans out from the core: on every face they lie along the
  // planes through the core's axis, `around` of them to a turn, so `every` units apart where the face is `fan` units
  // from the axis, wandering by the warps (how wide, in units, and how far). Each plane may hold a scar, in lengths
  // along it of about `long` units, each a wedge: blunt over the first of `taper`, in units, and drawn out to nothing
  // over the second, as a share of its length. How wide its floor
  // is each side of its line, least and most, and its lit lip, in units. Where they gather: a field `cluster` units
  // across, above `clean` of it, and within `bite` units of an edge in places, `biteBy` more; none within `cave` of
  // the core's radii and all from the second. A few shorter scars, `join`, cross from one to the next.
  scar: {
    around: 270, every: 6, long: 42, taper: [1.5, 0.7], half: [0.35, 1.3], lip: [0.45, 1.0], cluster: 75, clean: [0.4, 0.66],
    bite: 12, biteBy: 0.6, cave: [1.45, 2.2], warp: [[90, 40], [31, 12], [7, 1.5]],
    join: { every: 15, around: 54, long: 11, share: 0.35, half: [0.3, 0.8] },
  },
  // Hairline cracks, seen only close: a third family along the fan, `ratio` times as many planes to a turn and `every`
  // units apart in that measure, in lengths of about `long`, their half width in units, in places `cluster` units
  // across, how much they darken, and the jag that makes each a crack and not a ruled line (how wide, how far).
  hair: { ratio: 2, every: 6, long: 20, half: 0.1, cluster: 45, most: 0.4, jag: [1.7, 0.9] },
  // The knapped relief: a broad swell, and the scars of flakes in two sizes, each a shallow bowl meeting the next
  // along a ridge: how wide, in units, and how deep.
  roll: { wide: [40, 13, 5], deep: [8, 0.5, 0.16] },
  // How much lighter a flake scar's ridge is than its middle.
  knap: 0.06,
  // What tone a proud, dry place and a wet, sheltered one take: a little yellower and paler, a little redder.
  tint: { dry: [1.05, 1.03, 0.95] as const, wet: [0.98, 0.88, 0.82] as const },
  // Where two plates meet, in a concave crease, a band of deeper, redder shade: how wide, in units, what it multiplies
  // the stone by at most, and how shut in (the stored openness) a crease is to hold it in full, and to hold none.
  // Anything shut in holds the same shade, in full under the first of `shut` and none over the second. The stored
  // distance to a crease does not say whether the crease is concave: knapped facets make creases everywhere.
  crease: { wide: 8, tint: [0.5, 0.33, 0.24] as const, open: [0.18, 0.4], shut: [0.06, 0.18] },
  // A convex edge turned to the light is chipped pale: its widest and thinnest band, in units, the share of an edge
  // where it is missing, how far its bevel turns to the core, and how fast the stored openness must grow toward an
  // edge, for each unit, for it to be convex, from none to full.
  edge: { wide: 2.6, thin: 0.5, missing: 0.62, bevel: 0.5, rate: [0.006, 0.015] },
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
// What the stone works out once, before it is lit: its normal in the world, its color, roughness and how much it
// mirrors. Set in main(), never where they are declared.
vec3 stoneNormal;
vec3 stoneAlbedo;
float stoneRough;
float stoneSheen;
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
// A slope stored as a normal's red and green, as the slope itself.
vec2 stoneSlope( vec4 t ) { vec2 xy = t.rg * 2.0 - 1.0; return xy / sqrt( max( 1.0 - dot( xy, xy ), 0.05 ) ); }
// The grain from the three axes: its slope as a vector in the world, its tone and how open it is. A bias on the
// map's level blurs it: what is left of it is its wider wear.
void stoneGrainAt( vec3 p, vec3 w, float scale, float bias, out vec3 slope, out vec2 toneOpen ) {
	vec4 gx = texture2D( uStoneGrain, p.zy * scale + 0.31, bias ), gy = texture2D( uStoneGrain, p.xz * scale + 0.57, bias ), gz = texture2D( uStoneGrain, p.xy * scale + 0.83, bias );
	vec2 sx = stoneSlope( gx ), sy = stoneSlope( gy ), sz = stoneSlope( gz );
	slope = vec3( 0.0, sx.y, sx.x ) * w.x + vec3( sy.x, 0.0, sy.y ) * w.y + vec3( sz.x, sz.y, 0.0 ) * w.z;
	toneOpen = vec2( gx.b * w.x + gy.b * w.y + gz.b * w.z, gx.a * w.x + gy.a * w.y + gz.a * w.z );
}
// The scars of one family. f is a field of the place whose level sets on a face run as the scars do, gF its gradient
// in the world, and along a field that grows along them. Each cell of f holds one line at a place of its own, and
// \`around\` cells make a turn (0: no turn), so the place where f wraps is no seam. Along the line the scar lies in
// lengths of its own, each present where the cluster field \`dens\` is over its own number, and tapers to nothing at
// each end and as the field thins. Gives the scar's half width there, in units (0: none), how far the place is from
// its line, in units, measured away from the core, and in eAway the way along the face away from the core across it.
vec2 stoneScar( vec3 p, vec3 n, vec3 lT, float f, vec3 gF, float along, float cell, float around, float len, vec2 widths, float dens, float seed, out vec3 eAway, out float side ) {
	vec3 gT = gF - n * dot( gF, n );
	float gTl = length( gT ), on = smoothstep( 0.3, 0.55, gTl / max( length( gF ), 1e-4 ) );
	float u = f / cell, k = floor( u );
	k = around > 0.0 ? mod( k, around ) : k;
	float o = 0.25 + 0.5 * stoneHash1( k * 1.37 + seed );
	float s = ( fract( u ) - o ) * cell / max( gTl, 1e-3 );
	float a = along / len + 7.0 * stoneHash1( k * 7.1 + seed + 2.0 ), j = floor( a ), ua = fract( a );
	float h0 = stoneHash1( k * 5.3 + j * 2.9 + seed + 1.1 );
	float s0 = 0.5 * h0 * h0, s1 = s0 + 0.3 + 0.8 * stoneHash1( k * 1.9 + j * 8.3 + seed + 4.4 );
	// A scar is a wedge: blunt where it starts and drawn out to nothing at its other end, either way round.
	float h = stoneHash1( k * 3.17 + j * 11.3 + seed + 0.7 ), turn = step( 0.5, fract( h * 7.7 ) );
	float e0 = ( ua - s0 ) * len, e1 = ( s1 - ua ) * len, blunt = mix( e0, e1, turn ), drawn = mix( e1, e0, turn );
	float wedge = smoothstep( 0.0, ${f(STONE.scar.taper[0])}, blunt ) * pow( clamp( drawn / max( ${f(STONE.scar.taper[1])} * ( s1 - s0 ) * len, 1.0 ), 0.0, 1.0 ), 0.6 );
	float hw = mix( widths.x, widths.y, pow( stoneHash1( k * 2.3 + j * 0.71 + seed ), 2.0 ) ) * ( 0.7 + 0.6 * stoneNoise3( p / 4.0 + vec3( k * 0.37 + seed ) ) );
	hw *= step( 0.0, min( e0, e1 ) ) * wedge * smoothstep( h, h + 0.12, dens ) * on;
	vec3 e = gT / max( gTl, 1e-4 );
	float c = dot( e, lT ), sg = c >= 0.0 ? - 1.0 : 1.0;
	eAway = e * sg;
	side = abs( c );
	return vec2( hw, s * sg );
}
// The scars of the knapped faces: cells of \`cell\` units, each a shallow bowl round a point of its own, meeting its
// neighbours along ridges. The slope of the surface there, in the world, per unit of depth, and how far out from the
// bowl's middle the place is, in cells.
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
const FAN = (STONE.scar.around * STONE.scar.every) / (2 * Math.PI);
const W = STONE.scar.warp;
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
	// Each block is its own tone. A block's own number gives it; without one, large slow fields of the place do,
	// which never change across a face at once.
	#if defined( WORLD_BAKED ) && defined( STONE_SLAB )
		float slab = wLight.w;
		float bTone = fract( slab * 5.13 ), bRough = fract( slab * 9.73 );
		vec3 bOff = vec3( slab * 11.0, slab * 5.0, slab * 3.0 );
	#else
		vec4 slow = vec4( stoneNoise3( p / 170.0 + 0.3 ), stoneNoise3( p / 130.0 + 5.1 ), stoneNoise3( p / 150.0 + 9.7 ), stoneNoise3( p / 110.0 + 2.2 ) );
		float bTone = slow.w, bRough = slow.x;
		vec3 bOff = slow.yzw * 3.0;
	#endif
	float pix = max( max( length( dFdx( p ) ), length( dFdy( p ) ) ), 1e-4 );

	// The grain, near and wider, from the three axes. A face seen nearly edge on keeps only its grain's tone.
	vec3 w = pow( abs( n ), vec3( 4.0 ) );
	w /= max( w.x + w.y + w.z, 1e-5 );
	vec3 gNear, gWide;
	vec2 tNear, tWide;
	stoneGrainAt( p, w, ${f(1 / STONE.grain.period)}, 0.0, gNear, tNear );
	stoneGrainAt( p * 0.2327 + 17.0, w, ${f(1 / STONE.grain.period)}, 3.0, gWide, tWide );
	float edgeOn = smoothstep( 0.06, 0.28, facing );
	float st1 = stoneNoise3( p / 31.0 + bOff * 3.7 ), st2 = stoneNoise3( p / 11.0 + 2.7 ), st3 = stoneNoise3( p / 4.3 + 8.1 );
	// How much of the core's light reaches the place.
	float lit = smoothstep( 0.0, 0.2, max( cf, 0.0 ) * seen );
	vec3 tilt = vec3( 0.0 );
	vec3 c = ${v3(STONE.own)};
	float fromEdge = 1e3;
	#ifdef STONE_EDGE
		fromEdge = vStoneEdge;
	#endif

	#ifndef STONE_GRAIN
		// The scars. The rock's layering fans out from the core, so a scar lies along a plane through the core's axis,
		// wandering. Where they gather: a few places, and edges in places. None in the cave round the core.
		vec3 dP = p - ${C};
		float dl = max( length( dP ), 1e-3 ), rxy = max( dot( dP.xy, dP.xy ), 1.0 );
		vec4 w1 = stoneNoiseD( p / ${f(W[0][0])} + 3.1 ), w2 = stoneNoiseD( p / ${f(W[1][0])} + 7.7 ), w3 = stoneNoiseD( p / ${f(W[2][0])} + 1.3 );
		float fan = atan( dP.y, abs( dP.x ) < 1e-4 ? 1e-4 : dP.x ) * ${f(+FAN.toFixed(4))} + ${f(W[0][1])} * w1.w + ${f(W[1][1])} * w2.w + ${f(W[2][1])} * w3.w;
		vec3 gFan = vec3( - dP.y, dP.x, 0.0 ) * ( ${f(+FAN.toFixed(4))} / rxy ) + w1.xyz * ${f(W[0][1] / W[0][0])} + w2.xyz * ${f(W[1][1] / W[1][0])} + w3.xyz * ${f(W[2][1] / W[2][0])};
		float eat = ( 1.0 - smoothstep( 0.0, ${f(STONE.scar.bite)}, fromEdge + 4.0 * ( st3 - 0.5 ) ) ) * smoothstep( 0.35, 0.6, stoneNoise3( p / 30.0 + 4.0 ) );
		float cave = smoothstep( ${f(CORE.r * STONE.scar.cave[0])}, ${f(CORE.r * STONE.scar.cave[1])}, dC );
		float dens = ( smoothstep( ${f(STONE.scar.clean[0])}, ${f(STONE.scar.clean[1])}, stoneNoise3( p / ${f(STONE.scar.cluster)} + bOff * 0.5 + 11.0 ) ) + ${f(STONE.scar.biteBy)} * eat ) * cave * edgeOn;
		vec3 eA, eB;
		float sideA, sideB;
		vec2 sA = stoneScar( p, n, lT, fan, gFan, dl, ${f(STONE.scar.every)}, ${f(STONE.scar.around)}, ${f(STONE.scar.long)}, vec2( ${f(STONE.scar.half[0])}, ${f(STONE.scar.half[1])} ), dens, 0.0, eA, sideA );
		vec2 sB = stoneScar( p, n, lT, 0.5 * fan + 0.85 * dl, 0.5 * gFan + 0.85 * dP / dl, dl, ${f(STONE.scar.join.every)}, ${f(STONE.scar.join.around)}, ${f(STONE.scar.join.long)},
			vec2( ${f(STONE.scar.join.half[0])}, ${f(STONE.scar.join.half[1])} ), dens * ${f(STONE.scar.join.share)}, 3.7, eB, sideB );
		// Whichever is nearer its line here.
		bool useB = sB.x - abs( sB.y ) > sA.x - abs( sA.y );
		vec2 sc = useB ? sB : sA;
		vec3 eAway = useB ? eB : eA;
		float sSide = useB ? sideB : sideA;
		// Cut, not stamped: a floor in shadow, the darker under the wall that faces away from the core (the side nearer
		// it), and a lit lip on the wall that faces it, no wider than a scar is. A scar thinner than a pixel keeps its
		// darkness spread over the pixel; a lip thinner than a unit and a half fades rather than break into dashes.
		float hw = sc.x, s = sc.y;
		float hA = max( hw, 0.6 * pix ), amt = hw / hA;
		float groove = clamp( ( hA - abs( s ) ) / pix + 0.5, 0.0, 1.0 ) * amt;
		// A scar that runs toward the core is grazed along its length and both its walls are lit alike: it still keeps
		// some of a cut's two sides, or it reads as a stroke of paint.
		float facesAway = mix( 0.55, 1.0, smoothstep( 0.12, 0.45, sSide ) );
		float under = groove * ( 1.0 - smoothstep( - 0.6 * pix, 0.6 * pix, s + 0.15 * hA ) ) * facesAway;
		float lipW = mix( ${f(STONE.scar.lip[0])}, ${f(STONE.scar.lip[1])}, st2 ) * smoothstep( 0.0, ${f(STONE.scar.half[1])}, hw );
		float lip = clamp( min( s - hA, hA + lipW - s ) / pix + 0.5, 0.0, 1.0 ) * facesAway * smoothstep( 1.0, 3.0, lipW / pix ) * smoothstep( 0.1, 0.4, hw );
		tilt += eAway * ( 0.9 * under ) - eAway * ( 0.8 * lip );
		float scarDeep = smoothstep( 0.2, 0.9, hw );

		// Hairline cracks, close only: a third family along the fan, finer, longer and more of them, with no lip.
		vec3 eH;
		float sideH;
		vec4 hj = stoneNoiseD( p / ${f(STONE.hair.jag[0])} + 2.3 );
		vec2 sH = stoneScar( p, n, lT, fan * ${f(STONE.hair.ratio)} + 3.0 * w2.w + 2.0 * w3.w + ${f(STONE.hair.jag[1])} * hj.w,
			gFan * ${f(STONE.hair.ratio)} + w2.xyz * ${f(3 / W[1][0])} + w3.xyz * ${f(2 / W[2][0])} + hj.xyz * ${f(STONE.hair.jag[1] / STONE.hair.jag[0])}, dl, ${f(STONE.hair.every)}, ${f(STONE.scar.around * STONE.hair.ratio / STONE.hair.every * STONE.scar.every)}, ${f(STONE.hair.long)},
			vec2( ${f(STONE.hair.half)}, ${f(STONE.hair.half * 1.6)} ), smoothstep( 0.55, 0.75, stoneNoise3( p / ${f(STONE.hair.cluster)} + 5.0 ) ) * cave * edgeOn, 9.1, eH, sideH );
		float hh = max( sH.x, 0.5 * pix );
		float hair = clamp( ( hh - abs( sH.y ) ) / pix + 0.5, 0.0, 1.0 ) * sH.x / hh * ( 1.0 - groove );

		// The weathered crust: how far in from the planet's outer surface, and under the land, the place is.
		float shR = length( p.xz ) / ${f(WORLD.half)}, shD = max( 0.0, -( p.y + ${f(RIM)} ) ) / ${f(WORLD.deep)};
		float inside = ( 1.0 - sqrt( shR * shR + shD * shD ) ) * mix( ${f(WORLD.half)}, ${f(WORLD.deep)}, shD / max( shR + shD, 1e-3 ) );
		float underLand = sqrt( max( 1.0, ${f(WORLD.top * WORLD.top)} - dot( p.xz, p.xz ) ) ) - ${f(WORLD.top)} - p.y;
		float crustK = 1.0 - smoothstep( ${f(STONE.crust.near)}, ${f(STONE.crust.far)}, min( inside, underLand ) + 12.0 * ( stoneNoise3( p / 19.0 + 3.0 ) - 0.5 ) );
		float moonK = smoothstep( 0.05, 0.5, moon ) * smoothstep( 0.0, 0.3, dot( n, ${MOON} ) );
		crustK = max( crustK, ${f(STONE.crust.moon)} * moonK );

		// A convex edge turned to the light is chipped pale, wide here and a hairline there, missing for long stretches,
		// thinner where the face turns edge on, with a bevel turned to the core. Where two plates meet in a concave
		// crease, and wherever the place is shut in, the stone holds a deeper, redder shade.
		float chipped = 0.0, crease = 0.0;
		#ifdef STONE_EDGE
			// Which way the stored openness runs from the crease tells a convex edge, where it grows toward the edge. It
			// changes from one triangle to the next, so it only chooses where a chip may be. A concave crease is told by
			// how shut in it is.
			vec2 gO = vec2( dFdx( open ), dFdy( open ) ), gE = vec2( dFdx( fromEdge ), dFdy( fromEdge ) );
			float rate = dot( gO, gE ) / max( dot( gE, gE ), 1e-6 );
			float convex = smoothstep( ${f(STONE.edge.rate[0])}, ${f(STONE.edge.rate[1])}, - rate ) * smoothstep( 0.3, 0.45, open );
			float band = ( ${f(STONE.edge.thin)} + ${f(STONE.edge.wide - STONE.edge.thin)} * pow( stoneNoise3( p / 8.0 + 2.0 ), 1.6 ) ) * mix( 0.35, 1.0, smoothstep( 0.3, 0.75, facing ) );
			float there = smoothstep( ${f(STONE.edge.missing - 0.06)}, ${f(STONE.edge.missing + 0.06)}, stoneNoise3( p / 15.0 + 7.0 ) );
			float ragged = fromEdge + 0.9 * band * ( stoneNoise3( p / 1.6 + 5.0 ) - 0.5 );
			chipped = ( 1.0 - smoothstep( 0.6 * band, band, ragged ) ) * there * convex * smoothstep( 0.05, 0.3, cf )
				* smoothstep( 0.25, 0.5, facing ) * smoothstep( 1.0, 3.0, band / pix ) * smoothstep( 0.6, 1.5, band );
			float nearCrease = 1.0 - smoothstep( 0.0, ${f(STONE.crease.wide)}, fromEdge + 3.0 * ( st2 - 0.5 ) );
			float shutIn = 1.0 - smoothstep( ${f(STONE.crease.open[0])}, ${f(STONE.crease.open[1])}, open + 0.04 * ( st1 - 0.5 ) );
			// The cave round the core is one smooth bowl: a dip in its stored openness is not a crease, and its shade there
			// came out a rust smudge.
			crease = max( nearCrease * nearCrease * shutIn, 1.0 - smoothstep( ${f(STONE.crease.shut[0])}, ${f(STONE.crease.shut[1])}, open + 0.04 * ( st1 - 0.5 ) ) ) * mix( 0.2, 1.0, cave );
		#endif
	#endif

	// The knapped relief: broad shells meeting along ridges, whose light differs across a face.
	vec4 r1 = stoneNoiseD( p / ${f(STONE.roll.wide[0])} + bOff * 5.7 );
	vec4 sc1 = stoneScallop( p, ${f(STONE.roll.wide[1])}, bOff.x * 3.0 ), sc2 = stoneScallop( p, ${f(STONE.roll.wide[2])}, 7.7 );
	float fine2 = 1.0 - smoothstep( 0.25, 0.6, pix );
	vec3 roll = r1.xyz * ${f(STONE.roll.deep[0] / STONE.roll.wide[0])} + sc1.xyz * ${f(STONE.roll.deep[1])} * ( 0.5 + bRough ) + sc2.xyz * ${f(STONE.roll.deep[2])} * fine2;
	// A flake's bowl is a little darker at its middle, and the ridges between are proud and catch the light.
	float knap = ( smoothstep( 0.25, 0.62, sc1.w ) - 0.5 ) + 0.4 * fine2 * ( smoothstep( 0.25, 0.62, sc2.w ) - 0.5 );
	float up = smoothstep( 0.35, 0.75, n.y );
	float dust = up * smoothstep( 0.2, 0.55, 0.3 + 0.45 * ( 1.0 - open ) + 0.3 * ( st1 - 0.5 ) );
	tilt += ${f(STONE.grain.tilt)} * edgeOn * ( gNear * mix( 1.0, 1.6, dust ) + ${f(STONE.grain.wear)} * gWide * ( 1.0 - 0.6 * dust ) );
	tilt += roll * edgeOn * ( 0.6 + 0.8 * bRough ) * ( 1.0 - 0.5 * dust );
	tilt -= n * dot( tilt, n );
	stoneNormal = normalize( n + tilt );

	// The color: the block's tone, the stains, the knapped relief, the grain, the hot zone, the crust, the marks.
	c *= 0.93 + 0.14 * bTone;
	float stA = stoneNoise3( p / ${f(STONE.stain.wide[0])} + bOff * 1.1 ), stB = stoneNoise3( p / ${f(STONE.stain.wide[1])} + 6.1 );
	c *= mix( ${f(STONE.stain.range[0])}, ${f(STONE.stain.range[1])}, smoothstep( 0.2, 0.8, ${f(1 - STONE.stain.small)} * stA + ${f(STONE.stain.small)} * stB ) );
	float redK = ${f(STONE.stain.red[1])} * smoothstep( 0.4, 0.75, stoneNoise3( p / ${f(STONE.stain.red[0])} + bOff * 0.3 + 2.9 ) );
	float buffK = ${f(STONE.stain.buff[1])} * smoothstep( 0.55, 0.8, stoneNoise3( p / ${f(STONE.stain.buff[0])} + 8.4 ) );
	c *= mix( vec3( 1.0 ), ${v3(STONE.redTint)}, redK ) * mix( vec3( 1.0 ), ${v3(STONE.buffTint)}, buffK * ( 1.0 - redK ) );
	c *= 1.0 + ${f(STONE.knap)} * knap * edgeOn;
	c *= mix( vec3( 1.0 ), knap > 0.0 ? ${v3(STONE.tint.dry)} : ${v3(STONE.tint.wet)}, abs( knap ) * edgeOn );
	// The grain's tone: each grain its own, and a pit is darker than the face it is in, never lighter.
	float gAmp = mix( ${f(STONE.grainTone[0])}, ${f(STONE.grainTone[1])}, 1.0 - lit );
	c *= ( 1.0 + gAmp * ( tNear.x - 0.5 ) * 2.0 ) * mix( 1.0 - gAmp * 2.0, 1.0, tNear.y ) * mix( 0.9, 1.0, tWide.y );
	// How strong the core's light is on the face, as the light falls (LIGHT.core.fall is 1): only under its full
	// orange does the paler stone come out tan. Under the bounce alone it read as a lavender grey.
	float full = smoothstep( ${f(STONE.full[0])}, ${f(STONE.full[1])}, max( cf, 0.0 ) * seen * ${f(CORE.r)} / dC );
	// The page's stream is as orange a light: where it is strong the stone takes the same tan, or it came out a flat
	// rust patch beside the neck. Its strength here as STREAM_LIGHT works it out, against the core's at those shares.
	{
		float sBelow = ${f(SOURCE[1])} - p.y;
		vec3 sq = vec3( ${f(SOURCE[0])}, ${f(SOURCE[1])} - clamp( sBelow, 0.0, uStoneStream.y ), ${f(SOURCE[2])} ) - p;
		float sd = max( length( sq ), 1e-3 ), sk = clamp( 1.0 - sd / ${f(STREAM.reach)}, 0.0, 1.0 );
		float sE = ${f(STREAM.power)} * uStoneStreamPower * uStoneStream.x * sk * sk / ( 1.0 + ( sd / ${f(STREAM.near)} ) * ( sd / ${f(STREAM.near)} ) ) * max( dot( n, sq / sd ), 0.0 );
		full = max( full, smoothstep( ${f(STONE.full[0] * LIGHT.core.power)}, ${f(STONE.full[1] * LIGHT.core.power)}, sE ) );
	}
	// In the cave round the core a dent the light turns from is the same stone a little darker: in the redder brown
	// of the shade it came out a rust smudge on the clean bowl.
	#ifndef STONE_GRAIN
		full = max( full, 1.0 - cave );
	#endif
	c *= mix( ${v3(STONE.shadeTint)}, ${v3(STONE.litTint)}, full );
	float hotK = ${f(STONE.hot.most)} * seen * smoothstep( 0.05, 0.45, cf ) * ( 1.0 - smoothstep( ${f(STONE.hot.full)}, ${f(STONE.hot.from)}, dC ) );
	c = mix( c, ${v3(STONE.hot.color)}, hotK );
	float rough = 0.0;
	// A few grains glint, only on a face the light is on.
	float glints = step( ${f(1 - STONE.sparkle.share)}, fract( tNear.x * 13.7 + tNear.y * 3.1 ) ) * tNear.y * fine2 * lit;
	#ifndef STONE_GRAIN
		c = mix( c, ${v3(STONE.crust.color)} * ( 0.9 + 0.2 * tNear.x ) * mix( 0.92, 1.04, st1 ), crustK );
		c = mix( c, ${v3(STONE.chip)} * ( 0.9 + 0.2 * tNear.x ), 0.55 * chipped );
		c *= mix( vec3( 1.0 ), ${v3(STONE.crease.tint)}, crease );
		// A scar's floor lies in shadow: the face's own stone, much darker and redder. Its own red brown under the
		// core's orange came out a bright rust, where the picture's scars are a dark brown.
		vec3 floorC = c * ${v3(STONE.cut)} * ( 0.9 + 0.2 * st3 ) * ( 1.0 - 0.3 * scarDeep );
		c = mix( c, floorC, groove * ( 0.8 + 0.2 * scarDeep ) );
		c *= 1.0 - 0.55 * under;
		c = mix( c, ${v3(STONE.chip)} * ( 0.92 + 0.16 * st3 ), 0.6 * lip * lit );
		c *= 1.0 - ${f(STONE.hair.most)} * hair;
		rough = groove;
		glints *= 1.0 - groove;
	#endif
	c = mix( c, ${v3(STONE.dust)} * ( 0.88 + 0.24 * tNear.x ) * mix( 0.85, 1.0, tNear.y ), 0.7 * dust );
	float chroma = mix( mix( ${f(STONE.chroma[1])}, ${f(STONE.chroma[0])}, lit ), ${f(STONE.hot.chroma)}, hotK / ${f(STONE.hot.most)} );
	#ifndef STONE_GRAIN
		chroma = mix( chroma, 1.0, crustK );
		chroma *= mix( 1.0, ${f(STONE.crust.moonChroma)}, moonK * ( 1.0 - lit ) );
	#endif
	stoneAlbedo = mix( vec3( dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) ), c, chroma );
	stoneRough = mix( mix( mix( ${f(STONE.rough[0])}, ${f(STONE.rough[1])}, rough ), ${f(STONE.rough[2])}, dust ), ${f(STONE.rough[3])}, glints );
	stoneSheen = mix( ${f(STONE.sheen)}, ${f(STONE.sparkle.sheen)}, glints );
	#ifndef STONE_GRAIN
		stoneNormal = normalize( mix( stoneNormal, lC, ${f(STONE.edge.bevel)} * chipped ) );
	#endif
	diffuseColor.rgb = stoneAlbedo;
	#ifdef STONE_DEBUG
		diffuseColor.rgb = vec3( 0.0 );
		int stoneMode = STONE_DEBUG > 20 ? STONE_DEBUG - 20 : STONE_DEBUG;
		#ifdef STONE_GRAIN
			float stoneShow = stoneMode == 1 ? open : stoneMode == 2 ? seen : stoneMode == 3 ? fromEdge / 16.0 : stoneMode == 5 ? moon : 0.0;
		#else
			float stoneShow = stoneMode == 1 ? open : stoneMode == 2 ? seen : stoneMode == 3 ? fromEdge / 16.0 : stoneMode == 4 ? crustK : stoneMode == 5 ? moon
				: stoneMode == 6 ? groove : stoneMode == 7 ? dens : stoneMode == 8 ? chipped : crease;
		#endif
		// Over 20, the same in bands: red over a quarter, yellow over a half, pale over three quarters, as the tone
		// curve hides the numbers.
		totalEmissiveRadiance = STONE_DEBUG > 20 ? 0.4 * vec3( step( 0.25, stoneShow ), step( 0.5, stoneShow ), step( 0.75, stoneShow ) ) : vec3( stoneShow );
		#ifndef STONE_GRAIN
			if ( STONE_DEBUG == 10 ) totalEmissiveRadiance = vec3( groove, lip, under + hair );
			if ( STONE_DEBUG == 11 ) totalEmissiveRadiance = vec3( full, lit, hotK );
		#endif
	#endif
}`;

// The page's stream as a light on the stone: a line from the core's foot straight down as far as its leading end has
// run (uStoneStream.y), as strong as the stream is there (uStoneStream.x), warm, gone within STREAM.reach. Nothing
// further down than the leading end is lit.
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
}`;

// How much a face of the stone mirrors the light, against what a standard material does. Broken sandstone is dull: at
// the standard share the core's light came off every lit face as an orange sheen, which was most of what a lit face
// showed whatever the stone's own color, and why it read as pumpkin and not peach tan.
const SHEEN = /* glsl */ `
material.specularColor *= stoneSheen;
material.specularColorBlended = material.specularColor;
material.specularF90 *= stoneSheen;`;

type Shader = THREE.WebGLProgramParametersWithUniforms;
const after = (src: string, chunk: string, add: string): string => {
  if (!src.includes(`#include <${chunk}>`)) throw new Error(`stone: the shader has no ${chunk}`);
  return src.replace(`#include <${chunk}>`, `#include <${chunk}>\n${add}`);
};

// Lays the stone into a standard shader's fragment stage, and the vertex stage too unless the part sets vStoneP and
// vStoneN itself (own: true). grainOnly leaves out the scars, the hairlines, the crust and the edges: the stone's
// body, its grain, its stains, its knapped relief and its wear, for what broke away.
export function stoneShader(sh: Shader, maps: StoneMaps, own = false, grainOnly = false): void {
  Object.assign(sh.uniforms, { uStoneGrain: { value: maps.grain }, uStoneStreamPower: { value: 1 }, uStoneStream: world.uniforms.uStream });
  if (!own) sh.vertexShader = after(after(sh.vertexShader, 'common', STONE_VERT_PARS), 'begin_vertex', VERT);
  let fr = after(sh.fragmentShader, 'common', `${grainOnly ? '#define STONE_GRAIN\n' : ''}${FRAG_PARS}`);
  fr = after(fr, 'color_fragment', STONE_FRAG);
  fr = after(fr, 'roughnessmap_fragment', 'roughnessFactor = stoneRough;');
  fr = after(fr, 'normal_fragment_maps', 'normal = normalize( ( viewMatrix * vec4( stoneNormal, 0.0 ) ).xyz );');
  fr = after(fr, 'lights_physical_fragment', SHEEN);
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
  // distance to an edge, 4 the crust, 5 the moon's share, 6 the scars' floors, 7 where scars gather, 8 the chipped
  // edges, 9 the creases' shade, 10 the scars' floors, lips and shadowed sides with the hairlines (red, green, blue),
  // 11 how far the core's light is full, lit, and the hot zone. 21 to 29 are 1 to 9 in bands of a quarter.
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
