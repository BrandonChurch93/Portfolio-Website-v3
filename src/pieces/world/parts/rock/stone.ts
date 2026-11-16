import * as THREE from 'three';
import { CORE, MOONWARD, RIM, SCALE, SOURCE, WORLD } from '../../layout';
import { color, lit, stone, world } from '../../light';
import { slice } from '../../../../world/build';
import { STONE as SKIN } from '../skin/look';
import { GRAIN, grain } from './grain';

// The planet's stone: what the torn rock is made of, and what a piece that broke away may wear. A broken sandstone
// whose color comes from the light on it. A lit face is clean stone in broad stains, paler and redder by turns,
// carrying chunky dark gouges that run along the block's grain, gather in clusters and along the rare partings
// between its beds, and eat into the face's edges, each with a floor the light does not reach and a lit far lip. A
// parting is a broken stepped ledge with a lit lip, one or two to a face, never at a set pitch. A convex edge turned
// to the light is chipped pale, a concave crease holds a darker band of dust, and what faces up carries a paler dust.
// The first tens of units in from the planet's outer surface and under the land are its weathered crust, the skin's
// dusty tone, giving way to the fresh red brown deeper in. The stone adds no darkness of its own where the core's
// light does not reach: the light and the bounce make the darks.
//
// What has a direction (the beds, the partings, the gouges' grain) is worked out in three dimensions from the place,
// so it lies on every face as the stone would and is never stretched across one seen edge on. The grain is the one
// map, worked out from a seed when the world loads (./grain.ts) and laid from the three axes.
//
//   const maps = await stoneMaps(renderer)                           once, shared by every user, released with maps.release()
//   const m = stoneMaterial(maps, { key: 'rock', baked, spare, edge }) a standard material joined to the world's light
//
// A block's own number (spare: 'slab') turns its beds and sets its tone. Without one, large slow fields of the place do.
//
// A part that moves its own vertices (what broke away) lays the stone in itself: STONE_VERT_PARS in its vertex
// shader, then it sets vStoneP (the place, in units) and vStoneN (the normal, in the same frame), and calls
// stoneShader(sh, maps, true, true) for the stone's body, grain, stains and wear without its gouges, partings, crust
// and edges. Every name the stone puts in a shader begins with stone (or vStone, uStone): uStoneStreamPower at 0 takes
// the page's stream's light off, for a part that lights itself from the stream.

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
  redTint: [1, 0.74, 0.62] as const,
  buffTint: [1.06, 1.05, 0.98] as const,
  // A chipped edge and a gouge's lit lip are fresh stone, paler. Dust is paler still and greyer.
  chip: mix(own, color('text-2'), 0.42).multiplyScalar(1.18),
  dust: mix(own, color('text-2'), 0.45).multiplyScalar(1.05),
  // The weathered crust: the skin's dusty stone, from how far in from the planet's outer surface or under the land it
  // is full to where the fresh stone has it, in units. Under the moon the stone eases this far toward it and keeps
  // every mark of its own.
  crust: { color: crust, near: 10, far: 32, moon: 0.35 },
  // What a gouge's floor is multiplied by, and a parting's shadow: a deep red brown.
  cut: [0.36, 0.22, 0.16] as const,
  // The stains over a face: how wide the broad and the smaller ones are, in units, how much darker and lighter they
  // make it, and how wide the redder and the drier stains are and how much of each at most.
  stain: { wide: [58, 22], range: [0.74, 1.12], red: [34, 0.9], buff: [47, 0.45] },
  // How much of its color the stone keeps against its own grey, in the light and in the dark.
  chroma: [0.9, 0.85] as const,
  // What the stone is multiplied by where the core's light is full on it: its lit faces a peach tan, as the
  // picture's are, and not a pumpkin orange. The core's light is so orange that only a stone much paler in its blue
  // and green can come out tan under it: the stone eased toward the palette's warm grey as far as `tan`, at the same
  // brightness. A face the light only grazes, and the shade, keep a redder brown, as bright as the stone: the stone adds
  // no darkness of its own there.
  litTint: tint(own, 0.55),
  shadeTint: [1.1, 0.95, 0.84] as const,
  // Stone nearest the core is paler and less saturated, so that the core's light takes it toward a peach tan: from
  // how far from the core's middle it begins and where it is full, in units, how much at most, and the share of its
  // color it keeps there.
  hot: { color: mix(own, color('text-2'), 0.6), from: CORE.r * 2.6, full: CORE.r * 1.2, most: 0.2, chroma: 0.6 },
  // How rough a clean face, a gouge's floor, the dust.
  rough: [0.88, 0.96, 0.98] as const,
  // How much it mirrors the light, as a share of what a standard material does.
  sheen: 0.2,
  // The grain's tone, lit and in the dark.
  grainTone: [0.08, 0.1] as const,
  // The beds: how far they lean toward the visitor and how far each block turns them, in radians.
  bed: { lean: 0.12, turn: 0.45 },
  // The gouges. They run along a grain that is one through each zone of the rock about `zone` units across, at a
  // bearing of its own and rising or falling as much as `slope`. Stretched this many times along it. The cells they are cut from, in two sizes, in units. Most run along the
  // borders of the larger cells: their half width, thinnest and thickest, in units, and the share of borders that
  // carry one, outside a cluster and inside one. Some are a cell cut out: how far in from its border, in units, and
  // the share of cells, outside a cluster and inside one. How wide a cluster is, in units. How many more of each
  // within `bite` units of the face's edge, which they eat into. The faces round the core are the most scarred: out
  // to this many of its radii a cluster is this much more likely. The width of the lit lip, in units.
  gouge: {
    zone: 70, slope: 0.9, stretch: 4.2, size: [7, 3.2], run: [0.35, 3.4], runs: [0.1, 1.0],
    inset: [1.2, 2.8], cover: [0.0, 0.1], cluster: 36, nearCore: [2.4, 0.4], bite: 7, biteBy: 0.25, lip: 0.9,
  },
  // The partings between beds: the cell each may lie in, along the beds, in units, the share of cells that hold one,
  // how far it wanders, in units, the width of the shadow under its ledge and of its lit lip, in units, and the share
  // of its length that is missing.
  parting: { every: 44, share: 0.5, wander: 7, shadow: 1.3, lip: 0.55, missing: 0.3 },
  // The knapped relief: a broad swell, and the scars of flakes in two sizes, each a shallow bowl meeting the next
  // along a ridge: how wide, in units, and how deep.
  roll: { wide: [26, 13, 5], deep: [4, 0.9, 0.18] },
  // How much lighter a flake scar's ridge is than its middle.
  knap: 0.16,
  // What tone a proud, dry place and a wet, sheltered one take: a little yellower and paler, a little redder.
  tint: { dry: [1.05, 1.03, 0.95] as const, wet: [0.98, 0.88, 0.82] as const },
  // A concave crease holds a band of dust, darker: how wide, in units, and how much. A convex edge turned to the
  // light is chipped pale: its widest and thinnest band, in units, the share of an edge where it is missing, and how
  // far its bevel turns to the core.
  crease: { wide: 5, most: 0.32 },
  edge: { wide: 2.8, thin: 0.45, missing: 0.38, bevel: 0.5 },
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
// What the stone works out once, before it is lit: its normal in the world, its color and roughness.
vec3 stoneNormal;
vec3 stoneAlbedo;
float stoneRough;
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
// Cells stretched along a grain: q is the place with the grain already squeezed. Each cell's point lies in the
// middle half of it, so the nearest is always among the eight round the place.
vec3 stoneCellPoint( vec3 i ) { return i + 0.25 + 0.5 * vec3( stoneHash3( i + 3.1 ), stoneHash3( i + 17.3 ), stoneHash3( i + 29.7 ) ); }
// The distance from the place to its cell's border, in units, and two numbers of the cell's own. way is the way
// across the nearest border, in q, and other the second number of the cell across it. The border is the nearest of
// the seven others' round the place, found in a second pass, so it never jumps where two neighbours are nearly as
// near: taken from the second nearest point alone, it scattered into specks on a face that lay along it.
vec3 stoneCells( vec3 q, float cell, float seed, out vec3 way, out float other ) {
	vec3 x = q / cell + seed, b0 = floor( x - 0.5 ), p1 = vec3( 0.0 ), id = vec3( 0.0 );
	float d1 = 1e9;
	for ( int k = 0; k < 8; k++ ) {
		vec3 i = b0 + vec3( float( k & 1 ), float( ( k >> 1 ) & 1 ), float( ( k >> 2 ) & 1 ) ), pt = stoneCellPoint( i );
		float d = dot( pt - x, pt - x );
		bool nearer = d < d1;
		d1 = nearer ? d : d1;
		p1 = nearer ? pt : p1;
		id = nearer ? i : id;
	}
	float b = 1e9;
	way = vec3( 1.0, 0.0, 0.0 );
	vec3 nid = id;
	for ( int k = 0; k < 8; k++ ) {
		vec3 i = b0 + vec3( float( k & 1 ), float( ( k >> 1 ) & 1 ), float( ( k >> 2 ) & 1 ) ), pt = stoneCellPoint( i );
		vec3 e = pt - p1;
		float el = max( length( e ), 1e-4 ), bd = i == id ? 1e9 : dot( x - 0.5 * ( p1 + pt ), - e / el );
		bool nearer = bd < b;
		b = nearer ? bd : b;
		way = nearer ? e : way;
		nid = nearer ? i : nid;
	}
	other = stoneHash3( nid + seed * 2.9 + 0.37 );
	return vec3( b * cell, stoneHash3( id + seed * 1.3 ), stoneHash3( id + seed * 2.9 + 0.37 ) );
}
// The same in one pass, for cells cut out whole: how far in from the border, near enough, and the cell's numbers.
vec3 stoneCellsQuick( vec3 q, float cell, float seed ) {
	vec3 x = q / cell + seed, b0 = floor( x - 0.5 ), p1 = vec3( 0.0 ), p2 = vec3( 0.0 ), id = vec3( 0.0 );
	float d1 = 1e9, d2 = 1e9;
	for ( int k = 0; k < 8; k++ ) {
		vec3 i = b0 + vec3( float( k & 1 ), float( ( k >> 1 ) & 1 ), float( ( k >> 2 ) & 1 ) ), pt = stoneCellPoint( i );
		float d = dot( pt - x, pt - x );
		bool first = d < d1, second = !first && d < d2;
		d2 = first ? d1 : ( second ? d : d2 );
		p2 = first ? p1 : ( second ? pt : p2 );
		d1 = first ? d : d1;
		p1 = first ? pt : p1;
		id = first ? i : id;
	}
	return vec3( ( d2 - d1 ) / max( 2.0 * length( p2 - p1 ), 1e-4 ) * cell, stoneHash3( id + seed * 1.3 ), stoneHash3( id + seed * 2.9 + 0.37 ) );
}
// Which of a few points scattered through space a place is nearest: that point's cell, in cells.
vec3 stoneZone( vec3 q ) {
	vec3 b = floor( q - 0.5 ), id = b;
	float d1 = 1e9;
	for ( int k = 0; k < 8; k++ ) {
		vec3 i = b + vec3( float( k & 1 ), float( ( k >> 1 ) & 1 ), float( ( k >> 2 ) & 1 ) );
		vec3 o = q - i - ( 0.25 + 0.5 * vec3( stoneHash3( i + 3.1 ), stoneHash3( i + 17.3 ), stoneHash3( i + 29.7 ) ) );
		float d = dot( o, o );
		if ( d < d1 ) { d1 = d; id = i; }
	}
	return id;
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
		float bSeed = slab;
	#else
		vec4 slow = vec4( stoneNoise3( p / 170.0 + 0.3 ), stoneNoise3( p / 130.0 + 5.1 ), stoneNoise3( p / 150.0 + 9.7 ), stoneNoise3( p / 110.0 + 2.2 ) );
		float bShift = 50.0 * slow.x, bAxis = slow.y, bTurn = slow.z, bTone = slow.w, bRough = slow.x;
		vec3 bOff = slow.yzw * 3.0;
		// A hash is only ever handed a number that is steady over a block: one of the slow fields scattered it to specks.
		float bSeed = 0.0;
	#endif
	float pix = max( length( dFdx( p ) ), length( dFdy( p ) ) );

	// The beds, turned by the block's own angle. The partings between them show only on a face that cuts across them.
	vec3 across = normalize( vec3( 0.0, 1.0, ${f(STONE.bed.lean)} ) );
	float sa = bAxis * 6.2832;
	across = normalize( stoneTurn( across, normalize( vec3( cos( sa ), 0.35 * sin( 3.0 * sa ), sin( sa ) ) ), ${f(STONE.bed.turn)} * ( bTurn - 0.5 ) * 2.0 ) );
	float bed = dot( p, across ) + bShift + 2.2 * ( stoneNoise3( p / 53.0 ) - 0.5 );
	vec3 acrossT = across - n * dot( across, n );
	float side = length( acrossT );
	float sideK = smoothstep( 0.55, 0.8, side ) * ( 1.0 - smoothstep( 0.45, 0.75, n.y ) );

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
	float convex = smoothstep( 0.12, 0.3, open );
	float fineG0 = smoothstep( 0.6, 0.3, pix );

	#ifndef STONE_GRAIN
		// The partings: one cell along the beds holds at most one, at a place of its own in the cell, wandering, so two
		// are never a set distance apart. Each is a broken ledge: a shadow under it and a lit lip over it.
		float pu = bed / ${f(STONE.parting.every)}, pk = floor( pu );
		float pHas = step( ${f(1 - STONE.parting.share)}, stoneHash1( pk * 3.31 + bSeed * 7.0 + 5.0 ) ) * sideK;
		float pd = ( pu - pk - 0.25 - 0.5 * stoneHash1( pk * 1.73 + bSeed * 31.0 ) ) * ${f(STONE.parting.every)}
			+ ${f(STONE.parting.wander)} * ( stoneNoise3( p / 29.0 + pk * vec3( 1.3, 0.7, 2.1 ) ) - 0.5 ) + 0.9 * ( stoneNoise3( p / 3.1 + pk ) - 0.5 );
		float pw = max( fwidth( pd ), 1e-3 );
		float pS = ${f(STONE.parting.shadow)} * ( 0.4 + 1.2 * stoneNoise3( p / 7.0 + pk * 1.9 ) ), pL = ${f(STONE.parting.lip)} * ( 0.6 + 0.8 * st3 );
		float pOn = pHas * edgeOn * smoothstep( ${f(STONE.parting.missing - 0.05)}, ${f(STONE.parting.missing + 0.05)}, stoneNoise3( p / 9.0 + pk * vec3( 2.1, 0.3, 1.7 ) ) ) * ( 1.0 - smoothstep( 0.6, 1.4, pw ) );
		float pShadow = smoothstep( - pS - pw, - pS + pw, pd ) * ( 1.0 - smoothstep( - pw, pw, pd ) ) * pOn;
		float pLip = smoothstep( - pw, pw, pd ) * ( 1.0 - smoothstep( pL - pw, pL + pw, pd ) ) * pOn * smoothstep( 0.3, 1.0, pL / pw );
		tilt += normalize( acrossT + vec3( 1e-5 ) ) * 0.9 * pLip;

		// The gouges: cells stretched along the block's own grain, in two sizes, some of them cut out, more in a cluster,
		// along a parting and near the face's edge, so they gather into ragged runs with clean stone between. Each is cut
		// in from its cell's border, so its outline is straight runs meeting at angles. A floor the light does not reach,
		// walls that tilt, a lit lip on the far side from the core and a shadow under the near rim.
		// The grain is one through each great piece of the rock, a zone found as the nearest of a few points scattered
		// through the world, and differs from piece to piece. It must not follow the face's turn: a cell's place is
		// turned about the world's middle, hundreds of units off, and the least wander of the grain from one pixel to
		// the next, where the mesh is fine, scattered the gouges into specks.
		// Warped, so where one zone meets the next is a ragged line and never a straight seam across a face.
		vec3 zw = vec3( stoneNoise3( p / 23.0 + 4.0 ), stoneNoise3( p / 23.0 + 9.0 ), stoneNoise3( p / 23.0 + 13.0 ) ) - 0.5;
		zw += 0.35 * ( vec3( st2, st3, stoneNoise3( p / 5.0 + 1.0 ) ) - 0.5 );
		vec3 zid = stoneZone( ( p + 30.0 * zw ) / ${f(STONE.gouge.zone)} + 0.71 );
		float za = 6.2832 * stoneHash3( zid * 1.7 + 0.3 ), zs = ${f(STONE.gouge.slope)} * ( 2.0 * stoneHash3( zid * 2.3 + 4.1 ) - 1.0 );
		vec3 gd = normalize( vec3( cos( za ), zs, sin( za ) ) );
		vec3 gSide = normalize( cross( gd, vec3( 0.0, 1.0, 0.0 ) ) + vec3( 1e-4 ) );
		float faceOn = 1.0 - smoothstep( 0.55, 0.8, abs( dot( n, gd ) ) );
		vec3 gp = p + 1.6 * ( vec3( st2, stoneNoise3( p / 11.0 + 3.3 ), st3 ) - 0.5 );
		vec3 gq = gp + gd * ( dot( gp, gd ) * ${f(1 / STONE.gouge.stretch - 1)} );
		float clusterK = smoothstep( 0.4, 0.6, stoneNoise3( p / ${f(STONE.gouge.cluster)} + bOff * 0.7 + 2.0 ) + ${f(STONE.gouge.nearCore[1])} * ( 1.0 - smoothstep( ${f(CORE.r)}, ${f(CORE.r * STONE.gouge.nearCore[0])}, dC ) ) );
		clusterK = max( clusterK, 0.9 * pHas * ( 1.0 - smoothstep( 2.0, 9.0, abs( pd ) ) ) );
		float eat = 1.0 - smoothstep( 0.0, ${f(STONE.gouge.bite)}, fromEdge + 3.0 * ( st3 - 0.5 ) );
		float jag = 0.5 * ( stoneNoise3( p / 1.1 + 4.4 ) - 0.5 ) + 0.2 * ( stoneNoise3( p / 0.5 + 2.2 ) - 0.5 ) * smoothstep( 0.35, 0.2, pix );
		float gouge = 0.0, gLip = 0.0, gShade = 0.0, gRun = 0.0, gA = 0.0, gB = 0.0, deep = 0.0;
		// Only where the core, the moon or the stream reaches is a gouge worked out: in the dark nothing of it would
		// show, and it is the dearest part of the stone.
		if ( edgeOn > 0.0 && ( lit > 0.002 || moon > 0.02 || length( p.xz - vec2( ${f(SOURCE[0])}, ${f(SOURCE[2])} ) ) < ${f(STREAM.reach)} ) ) {
			vec3 wayA;
			float otherA;
			vec3 cA = stoneCells( gq, ${f(STONE.gouge.size[0])}, 1.7, wayA, otherA ), cB = stoneCellsQuick( gq, ${f(STONE.gouge.size[1])}, 5.3 );
			float aa = 0.6 * pix;
			// A run along a border: as wide as it is here, thick in places. A chunk: a cell cut out, in from its border.
			float runW = mix( ${f(STONE.gouge.run[0])}, ${f(STONE.gouge.run[1])}, pow( stoneNoise3( p / 4.5 + 6.6 ), 1.6 ) ) * smoothstep( 0.0, 0.6, stoneNoise3( p / 13.0 + 1.9 ) + 0.1 );
			// Runs lie along the grain, each on one long side of a cell that carries one: a border across the grain only
			// now and then, which joins two runs.
			vec3 wR = wayA + gd * ( dot( wayA, gd ) * ${f(STONE.gouge.stretch - 1)} );
			wR -= n * dot( wR, n );
			wR /= max( length( wR ), 1e-4 );
			float along = 1.0 - abs( dot( wR, gd ) );
			// Whose run a border carries is settled the same from either side of it, so a place on the border never takes
			// one cell's word on one pixel and the other's on the next.
			float runs = ( mix( ${f(STONE.gouge.runs[0])}, ${f(STONE.gouge.runs[1])}, clusterK ) + ${f(STONE.gouge.biteBy)} * eat ) * mix( 0.3, 1.0, smoothstep( 0.6, 0.9, along ) );
			float upSide = step( 0.0, dot( wR, gSide ) );
			float onRun = max( step( cA.z, runs ) * upSide, step( otherA, runs ) * ( 1.0 - upSide ) ) * faceOn;
			runW *= 0.7 + 0.6 * clusterK;
			float inRun = runW - cA.x + jag * min( 1.0, runW / 0.9 );
			gRun = onRun * smoothstep( - aa, aa, inRun ) * smoothstep( 0.4 * pix, 1.2 * pix, runW );
			float onA = step( cA.y, mix( ${f(STONE.gouge.cover[0])}, ${f(STONE.gouge.cover[1])}, clusterK ) + ${f(STONE.gouge.biteBy)} * eat );
			float inA = cA.x - mix( ${f(STONE.gouge.inset[0])}, ${f(STONE.gouge.inset[1])}, cB.z ) + jag;
			gA = onA * smoothstep( - aa, aa, inA );
			float onB = step( cB.y, mix( ${f(STONE.gouge.cover[0] * 0.3)}, ${f(STONE.gouge.cover[1] * 0.4)}, clusterK ) + ${f(STONE.gouge.biteBy * 0.4)} * eat ) * smoothstep( 0.9, 0.5, pix );
			float inB = cB.x - mix( 0.25, 0.7, cB.z ) + 0.5 * jag;
			gB = onB * smoothstep( - aa, aa, inB );
			gouge = max( max( gRun, gA ), gB ) * edgeOn;
			// Which way along the face the gouge's floor lies from here, and so whether this side is its far wall, which
			// looks to the core and has a lit lip, or its near rim, under which its floor is in shadow.
			float sideR = dot( wR, lT );
			float inU = gRun > max( gA, gB ) ? inRun : max( inA, inB );
			deep = smoothstep( 0.0, 1.2, inU );
			float lipR = onRun * ( 1.0 - smoothstep( - aa, aa, inRun ) ) * ( 1.0 - smoothstep( ${f(STONE.gouge.lip * 0.4)}, ${f(STONE.gouge.lip)} + aa, - inRun ) ) * smoothstep( 0.05, 0.45, sideR );
			float lipA = onA * ( 1.0 - smoothstep( - aa, aa, inA ) ) * ( 1.0 - smoothstep( ${f(STONE.gouge.lip * 0.4)}, ${f(STONE.gouge.lip)} + aa, - inA ) ) * smoothstep( 0.05, 0.45, - sideR );
			gLip = max( lipR, lipA ) * ( 1.0 - gouge ) * edgeOn;
			gShade = gRun * smoothstep( 0.05, 0.45, - sideR ) * edgeOn;
			tilt += wR * ( 0.8 * gRun * ( 1.0 - smoothstep( 0.0, 0.6, inRun ) ) );
		}

		// The weathered crust: how far in from the planet's outer surface, and under the land, the place is.
		float shR = length( p.xz ) / ${f(WORLD.half)}, shD = max( 0.0, -( p.y + ${f(RIM)} ) ) / ${f(WORLD.deep)};
		float inside = ( 1.0 - sqrt( shR * shR + shD * shD ) ) * mix( ${f(WORLD.half)}, ${f(WORLD.deep)}, shD / max( shR + shD, 1e-3 ) );
		float under = sqrt( max( 1.0, ${f(WORLD.top * WORLD.top)} - dot( p.xz, p.xz ) ) ) - ${f(WORLD.top)} - p.y;
		float crustK = 1.0 - smoothstep( ${f(STONE.crust.near)}, ${f(STONE.crust.far)}, min( inside, under ) + 12.0 * ( stoneNoise3( p / 19.0 + 3.0 ) - 0.5 ) );
		crustK = max( crustK, ${f(STONE.crust.moon)} * smoothstep( 0.05, 0.5, moon ) * smoothstep( 0.0, 0.3, dot( n, ${MOON} ) ) );

		// A convex edge turned to the light is chipped pale, wide here and a hairline there, bitten and missing for a
		// stretch, with a bevel turned to the core. A concave crease holds a darker band of dust.
		float chipped = 0.0, crease = 0.0;
		#ifdef STONE_EDGE
			float band = ${f(STONE.edge.thin)} + ${f(STONE.edge.wide - STONE.edge.thin)} * pow( stoneNoise3( p / 8.0 + 2.0 ), 1.6 );
			float there = smoothstep( ${f(STONE.edge.missing - 0.06)}, ${f(STONE.edge.missing + 0.06)}, stoneNoise3( p / 15.0 + 7.0 ) );
			float ragged = fromEdge + 0.9 * band * ( stoneNoise3( p / 1.6 + 5.0 ) - 0.5 );
			chipped = ( 1.0 - smoothstep( 0.6 * band, band, ragged ) ) * there * convex * smoothstep( 0.05, 0.3, cf ) * smoothstep( 0.25, 0.5, facing );
			crease = ( 1.0 - smoothstep( ${f(0.3 * STONE.crease.wide)}, ${f(STONE.crease.wide)}, fromEdge + 2.5 * ( st2 - 0.5 ) ) ) * ( 1.0 - convex );
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

	// The color: the block's tone, the stains, the knapped relief, the grain, the hot zone, the crust, the marks.
	c *= 0.92 + 0.16 * bTone;
	float sA = stoneNoise3( p / ${f(STONE.stain.wide[0])} + bOff * 1.1 ), sB = stoneNoise3( p / ${f(STONE.stain.wide[1])} + 6.1 );
	c *= mix( ${f(STONE.stain.range[0])}, ${f(STONE.stain.range[1])}, smoothstep( 0.22, 0.78, 0.62 * sA + 0.38 * sB + 0.15 * ( st3 - 0.5 ) ) );
	float redK = ${f(STONE.stain.red[1])} * smoothstep( 0.42, 0.7, stoneNoise3( p / ${f(STONE.stain.red[0])} + bOff * 0.3 + 2.9 ) + 0.12 * ( st2 - 0.5 ) );
	float buffK = ${f(STONE.stain.buff[1])} * smoothstep( 0.55, 0.8, stoneNoise3( p / ${f(STONE.stain.buff[0])} + 8.4 ) );
	c *= mix( vec3( 1.0 ), ${v3(STONE.redTint)}, redK ) * mix( vec3( 1.0 ), ${v3(STONE.buffTint)}, buffK * ( 1.0 - redK ) );
	c *= 1.0 + ${f(STONE.knap)} * knap * edgeOn;
	c *= mix( vec3( 1.0 ), knap > 0.0 ? ${v3(STONE.tint.dry)} : ${v3(STONE.tint.wet)}, 2.0 * abs( knap ) * edgeOn );
	float gAmp = mix( ${f(STONE.grainTone[0])}, ${f(STONE.grainTone[1])}, 1.0 - lit );
	c *= ( 1.0 + gAmp * ( tNear.x - 0.5 ) * 2.0 ) * mix( 1.0 - gAmp * 1.5, 1.0, tNear.y ) * mix( 0.9, 1.0, tWide.y );
	// How strong the core's light is on the face, as the light falls (LIGHT.core.fall is 1): only under its full
	// orange does the paler stone come out tan. Under the bounce alone it read as a lavender grey.
	float full = smoothstep( 0.08, 0.32, max( cf, 0.0 ) * seen * ${f(CORE.r)} / dC );
	c *= mix( ${v3(STONE.shadeTint)}, ${v3(STONE.litTint)}, full );
	float hotK = ${f(STONE.hot.most)} * seen * smoothstep( 0.05, 0.45, cf ) * ( 1.0 - smoothstep( ${f(STONE.hot.full)}, ${f(STONE.hot.from)}, dC ) );
	c = mix( c, ${v3(STONE.hot.color)}, hotK );
	float rough = 0.0;
	#ifndef STONE_GRAIN
		c = mix( c, ${v3(STONE.crust.color)} * ( 0.9 + 0.2 * tNear.x ) * mix( 0.92, 1.04, st1 ), crustK );
		vec3 cut = ${v3(STONE.cut)};
		c = mix( c, ${v3(STONE.chip)} * ( 0.9 + 0.2 * tNear.x ), 0.6 * chipped );
		c *= 1.0 - ${f(STONE.crease.most)} * crease;
		c = mix( c, ${v3(STONE.own)} * ${v3(STONE.shadeTint)} * cut, 0.85 * pShadow );
		c = mix( c, ${v3(STONE.chip)}, 0.45 * pLip * lit );
		// A gouge's floor lies in its rim's shadow: the deep red brown of the stone out of the light, never the lit
		// face's tan darkened, which came out a lavender grey.
		vec3 floorC = ${v3(STONE.own)} * ${v3(STONE.shadeTint)} * cut * ( 0.9 + 0.2 * st3 ) * ( 1.0 - 0.35 * deep );
		c = mix( c, floorC, gouge * ( 0.75 + 0.25 * deep ) );
		c *= 1.0 - 0.5 * gShade;
		c = mix( c, ${v3(STONE.chip)} * ( 0.92 + 0.16 * st3 ), 0.6 * gLip * lit );
		rough = max( gouge, pShadow );
	#endif
	c = mix( c, ${v3(STONE.dust)} * ( 0.88 + 0.24 * tNear.x ) * mix( 0.85, 1.0, tNear.y ), 0.7 * dust );
	float chroma = mix( mix( ${f(STONE.chroma[1])}, ${f(STONE.chroma[0])}, lit ), ${f(STONE.hot.chroma)}, hotK / ${f(STONE.hot.most)} );
	#ifndef STONE_GRAIN
		chroma = mix( chroma, 1.0, crustK );
	#endif
	stoneAlbedo = mix( vec3( dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) ), c, chroma );
	stoneRough = mix( mix( ${f(STONE.rough[0])}, ${f(STONE.rough[1])}, rough ), ${f(STONE.rough[2])}, dust );
	#ifndef STONE_GRAIN
		stoneNormal = normalize( mix( stoneNormal, lC, ${f(STONE.edge.bevel)} * chipped ) );
	#endif
	diffuseColor.rgb = stoneAlbedo;
	#ifdef STONE_DEBUG
		diffuseColor.rgb = vec3( 0.0 );
		#ifdef STONE_GRAIN
			float stoneShow = STONE_DEBUG == 1 ? open : STONE_DEBUG == 2 ? seen : STONE_DEBUG == 3 ? fromEdge / 16.0 : STONE_DEBUG == 5 ? moon : 0.0;
		#else
			float stoneShow = STONE_DEBUG == 1 ? open : STONE_DEBUG == 2 ? seen : STONE_DEBUG == 3 ? fromEdge / 16.0 : STONE_DEBUG == 4 ? crustK : STONE_DEBUG == 5 ? moon
				: STONE_DEBUG == 6 ? max( gouge, pShadow ) : STONE_DEBUG == 7 ? convex : STONE_DEBUG == 8 ? chipped : crease;
		#endif
		totalEmissiveRadiance = vec3( stoneShow );
		#ifndef STONE_GRAIN
			if ( STONE_DEBUG == 10 ) totalEmissiveRadiance = vec3( gRun, gA, gB + pShadow );
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
material.specularColor *= ${f(STONE.sheen)};
material.specularColorBlended = material.specularColor;
material.specularF90 *= ${f(STONE.sheen)};`;

type Shader = THREE.WebGLProgramParametersWithUniforms;
const after = (src: string, chunk: string, add: string): string => {
  if (!src.includes(`#include <${chunk}>`)) throw new Error(`stone: the shader has no ${chunk}`);
  return src.replace(`#include <${chunk}>`, `#include <${chunk}>\n${add}`);
};

// Lays the stone into a standard shader's fragment stage, and the vertex stage too unless the part sets vStoneP and
// vStoneN itself (own: true). grainOnly leaves out the gouges, the partings, the crust and the edges: the stone's
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
  // distance to an edge, 4 the crust, 5 the moon's share, 6 the gouges and partings, 7 what is taken as a convex
  // edge, 8 the chipped edges, 9 the creases' dust, 10 the runs, the cut out cells and the small ones (red, green, blue),
  // 11 how far the core's light is full, lit, and the hot zone.
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
