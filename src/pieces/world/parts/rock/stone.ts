import * as THREE from 'three';
import { CORE, LIGHT, MOONWARD, RIM, SCALE, SOURCE, WORLD } from '../../layout';
import { color, lit, stone, world } from '../../light';
import { slice } from '../../../../world/build';
import { GRAIN, grain } from './grain';
import { CURVE } from './curve';

// The planet's stone: what the torn rock is made of, and what a piece that broke away may wear. A broken sandstone
// whose color comes from the light on it: cream only where a face squarely meets the core, a deep orange in every
// recess and where the light grazes. A face is clean stone, a fine grain of sand with pits and a tone that rolls
// across it, crossed by the partings of its bedding: each block's layers lie in a plane of its own (the sculpt says
// which block a place is of, and the plane), and at a parting one layer stands proud of the next, so the riser
// between is lit or in shade by which way it faces, with a pale worn lip and a dark foot. The sculpt's own steps are
// the largest of them. Where two plates meet in a concave crease the stone holds a warm dark, and a convex edge
// turned to the core is chipped pale (the sculpt stores which a crease is). The first tens of units in from the
// planet's outer surface and under the land are its crust: the same stone, greyer. The stone adds no darkness of its
// own where the core's light does not reach: the light and the bounce make the darks.
//
// The grain is the one map, worked out from a seed when the world loads (./grain.ts) and laid from the three axes.
//
//   const maps = await stoneMaps(renderer)                           once, shared by every user, released with maps.release()
//   const m = stoneMaterial(maps, { key: 'rock', baked, spare, edge }) a standard material joined to the world's light
//
// A block's own number (spare: 'slab', with beds) sets its tone and its bedding. Without one, large slow fields of the
// place set its tone and it has no partings.
//
// A part that moves its own vertices (what broke away) lays the stone in itself: STONE_VERT_PARS in its vertex
// shader, then it sets vStoneP (the place, in units) and vStoneN (the normal, in the same frame), and calls
// stoneShader(sh, maps, true) for the whole stone, or stoneShader(sh, maps, true, true) for its body, grain, stains
// and wear without its partings, crust and edges. Every name the stone puts in a shader begins with stone (or vStone,
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
// A gouge's taper, as stoneScar draws one: blunt over the first, in units, drawn out over the second share of it.
const SCAR_TAPER = [1.5, 0.7] as const;
// How many block numbers the stone can be told the bedding of (StoneOptions.beds).
export const BEDS_MAX = 48;
export const STONE = {
  own,
  // What a redder stain, where iron has gathered, and a drier, buff one multiply the stone by.
  redTint: [1, 0.8, 0.7] as const,
  buffTint: [1.05, 1.04, 0.97] as const,
  // A chipped edge and a parting's worn lip are fresh stone, paler. Dust is paler still and greyer.
  chip: mix(own, color('text-2'), 0.42).multiplyScalar(1.18),
  dust: mix(own, color('text-2'), 0.45).multiplyScalar(1.05),
  // The weathered crust: the skin's dusty stone, from how far in from the planet's outer surface or under the land it
  // is full to where the fresh stone has it, in units. Under the moon the stone eases this far toward it and keeps
  // every mark of its own, and keeps this share of its color: the moonlit roof is a greyer tan than the hollow.
  crust: { near: 10, far: 32, chroma: 0.72, pale: 1.08, moonChroma: 0.82 },
  // The stains over a face: how wide the broad and the smaller ones are, in units, how much darker and lighter they
  // make it, how much the smaller count against the broad, and how wide the redder and the drier stains are and how
  // much of each at most. Kept broad: stains as small as the scars read as a dappled print at the page's size.
  stain: { wide: [64, 26], range: [0.8, 1.1], small: 0.18, red: [70, 0.55], buff: [52, 0.4] },
  // How much of its color the stone keeps against its own grey, in the light and in the dark.
  chroma: [0.95, 0.6] as const,
  // What the stone is multiplied by where the core's light is full on it: its lit faces a peach tan, as the
  // picture's are, and not a pumpkin orange. The core's light is so orange that only a stone much paler in its blue
  // and green can come out tan under it: the stone eased toward the palette's warm grey as far as `tan`, at the same
  // brightness. A face the light only grazes, and the shade, keep a redder brown, as bright as the stone: the stone adds
  // no darkness of its own there.
  // Past the warm grey a little toward its pale and cool side: under the core's orange the lit faces came out a
  // saturated orange of one hue, where the picture's roll to a cream.
  litTint: tint(own, 0.7).map((v, i) => v * [0.96, 1.05, 1.25][i]),
  // Where the core's light begins to take the stone to tan and where it is full, as the share of the light a face
  // turned square to the core at its surface would have: in between, the mid tones keep the redder brown.
  full: [0.14, 0.52] as const,
  shadeTint: [1.16, 0.92, 0.8] as const,
  // Stone nearest the core is paler and less saturated, so that the core's light takes it toward a peach tan: from
  // how far from the core's middle it begins and where it is full, in units, how much at most, and the share of its
  // color it keeps there.
  hot: { color: mix(own, color('text-2'), 0.5), from: CORE.r * 2.2, full: CORE.r * 1.2, most: 0.06, chroma: 0.8 },
  // How rough a clean face, a parting's foot, the dust, and a grain that glints.
  rough: [0.88, 0.96, 0.98, 0.5] as const,
  // How much it mirrors the light, as a share of what a standard material does, and for the few grains that glint.
  sheen: 0.2,
  sparkle: { share: 0.006, sheen: 0.8 },
  // The grain's tone, lit and in the dark, and how strongly the grain and the wider wear tilt the surface.
  grainTone: [0.2, 0.13] as const,
  grain: { period: GRAIN.period, tilt: 1.0, wear: 1.3 },
  // The bedding's partings, which the sculpt's own steps are the largest of: how far apart, in units, for the wider
  // and the finer; how far along a parting it runs before it may pinch out, in units; its riser's width, least and
  // most, for each; how far the riser's normal turns across the layers; what tone the riser takes, how pale its worn
  // lip is and how dark its foot; and how far a parting wanders, wide and fine, in units.
  bed: { apart: [21, 6], run: [40, 15], riser: [1.6, 3.4, 0.7, 1.4], tilt: 0.85, riserTint: [0.95, 0.89, 0.84] as const, lip: 0.12, foot: 0.3, warp: [3, 0.35] },
  // The cave round the core, in the core's radii: within the first the stone is at its cleanest, past the second as
  // anywhere.
  cave: [1.45, 2.2] as const,
  // How far toward the redder brown a place shut in (its stored openness low) keeps, even in the core's full light.
  recess: 0.6,
  // The knapped relief: a broad swell, and the scars of flakes in two sizes, each a shallow bowl meeting the next
  // along a ridge: how wide, in units, and how deep.
  roll: { wide: [40, 13, 5], deep: [8, 0.85, 0.3] },
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
  edge: { wide: 2.8, thin: 1.2, missing: 0.84, bevel: 0.4, rate: [0.006, 0.015] },
  // A quiet stone (StoneOptions.quiet, sculpt S): its knapped scars this share as deep and as marked, so the form and
  // the light carry the face and no pattern of scallops reads across it.
  quiet: { roll: 0.25, knap: 0.2 },
  // And its color and its smallest breaks (sculpt S's second round): its lit stone a golden tan and its mid tones a
  // deep warm brown, as picture 9's are (multiplying the stone as the lit and shade tints do), how much of its color
  // it keeps lit and in the dark (in the cave round the core and past it: the mid tones beside the ball a saturated
  // brown, the ones further off greyer), and pits and small spalls of two sizes (how wide, in units, how deep against how
  // wide, how much of a face they take, and how much darker a pit is), shown only where a pixel is fine enough, and
  // (round 3) left off whole faces by a field `bare` units across.
  // Round 3: the stone's hue is set outright, at the brightness the stone has there (as linear colors, red 1): under
  // the core's full light the hue the sculpts' light was worked out with (?stone=0), which comes out the picture's
  // golden tan, and in the mid tones a warm brown between that and the stone's own red brown, greyer past the cave.
  // `value` is how bright each is against the stone. Each mass is its own a little (the sculpt stores a tone for each,
  // light.w and bounce.w): `mass` is how far its hue (1 is about three degrees) and its value may differ, and `drift`
  // how far the hue wanders within a face, and over how many units, broad and finer. `paled` is how far a face the
  // core's paled light grazes takes the lit hue, and `dust` how much paler dust is than the stone it lies on. A face the
  // moon lights and the core does not fades as it is seen more nearly edge on, between the two of `thin`.
  quietTint: { lit: [1, 0.9, 0.62] as const, shade: [1, 0.52, 0.25] as const, far: [1, 0.55, 0.4] as const, value: [1.12, 0.86, 1.08] as const, mass: [1, 0.11] as const, drift: [1.1, 60, 18] as const, paled: 0.6, dust: 1.2, thin: [0.12, 0.42] },
  pits: { wide: [1.6, 4.2], deep: [0.22, 0.2], share: [0.3, 0.16], tone: 0.16, cluster: 46, soft: 0.3, bare: 130 },
  // Round 4 (StoneOptions.bed): the sculpt stores each vertex's bedding, the plane its sheets lie in, and the stone
  // lays the laminae finer than the sheets along it: how far apart, wider and finer, in units, each riser's width
  // least and most, how far a lamina's riser turns the surface, how often a riser faces from the core and not to it,
  // how dark its foot is, how far its line wanders, broad and fine, in units, and how steeply the bedding must cut a
// face for them to show, from none to full (the length of the bedding's normal along the face).
  laminae: { apart: [2.6, 1.05], riser: [0.7, 1.5, 0.3, 0.6], tilt: 1.1, away: 0.18, foot: 0.34, warp: [0.45, 0.15], across: [0.72, 0.92] },
  // How far each mass's hue may differ (StoneOptions.curve): the share green and blue are moved for each unit of it.
  hueSpread: [0.07, 0.1] as const,
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
const v2 = (c: readonly number[]): string => `vec2( ${f(c[0])}, ${f(c[1])} )`;
const C = v3(CORE.at);
const MOON = v3(new THREE.Vector3(...MOONWARD).normalize().toArray());

export const STONE_VERT_PARS = /* glsl */ `
varying vec3 vStoneP;
varying vec3 vStoneN;
#ifdef STONE_EDGE
	varying float vStoneEdge;
#endif
#ifdef STONE_SLAB
	flat varying float vStoneSlab;
#endif
#ifdef STONE_QUIET
	varying vec2 vStoneMass;
#endif
#ifdef STONE_BED
	varying vec3 vStoneBed;
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
	#ifdef STONE_SLAB
		vStoneSlab = floor( aLight.w * 255.0 + 0.5 );
	#endif
	#ifdef STONE_QUIET
		#if defined( WORLD_BAKED ) && defined( STONE_BED )
			// The bedding, stored folded onto an octahedron in light.w and bounce.w. Each mass has its own, so its tone is
			// worked out from it.
			vec2 stoneO = vec2( aLight.w, aBounce.w ) * 2.0 - 1.0;
			vec3 stoneB = vec3( stoneO, 1.0 - abs( stoneO.x ) - abs( stoneO.y ) );
			if ( stoneB.z < 0.0 ) stoneB.xy = ( 1.0 - abs( stoneB.yx ) ) * vec2( stoneB.x >= 0.0 ? 1.0 : - 1.0, stoneB.y >= 0.0 ? 1.0 : - 1.0 );
			vStoneBed = mat3( modelMatrix ) * stoneB;
			vec2 stoneQ = floor( vec2( aLight.w, aBounce.w ) * 255.0 + 0.5 );
			vStoneMass = fract( sin( vec2( dot( stoneQ, vec2( 12.9898, 78.233 ) ), dot( stoneQ, vec2( 39.3468, 11.1351 ) ) ) ) * 43758.5453 );
		#elif defined( WORLD_BAKED ) && defined( STONE_MASS )
			vStoneMass = vec2( aBounce.w, aLight.w );
		#else
			vStoneMass = vec2( 0.5 );
		#endif
	#endif
}`;

// Sculpt S's light, its hue set by its brightness and by how far from the core it is as the visitor sees it, to the
// colors picture 9's rock has there (./curve.ts, measured off the picture and fitted to the world's last pass by
// scripts/world/parts/rock-s/fit.mjs). Its brightness is the light's own: only its hue is changed.
const glslList = (v: readonly number[]): string => v.map(f).join(', ');
const CURVE_GLSL = /* glsl */ `
const float stoneCurveAt[ ${CURVE.at.length} ] = float[]( ${glslList(CURVE.at.map((v) => +v.toPrecision(5)))} );
const float stoneCurveRing[ ${CURVE.rings.length} ] = float[]( ${glslList(CURVE.rings)} );
const vec2 stoneCurveTint[ ${CURVE.tint.flat().length} ] = vec2[]( ${CURVE.tint.flat().map(([g, b]) => `vec2( ${f(+g.toFixed(4))}, ${f(+b.toFixed(4))} )`).join(', ')} );
float stoneQH;
vec3 stoneCurve( vec3 o, vec3 p ) {
	float l = dot( o, vec3( 0.2126, 0.7152, 0.0722 ) );
	float x = 0.0;
	for ( int i = 0; i < ${CURVE.at.length - 1}; i ++ ) {
		float a = stoneCurveAt[ i ], b = stoneCurveAt[ i + 1 ];
		if ( l >= a ) x = float( i ) + clamp( ( l - a ) / max( b - a, 1e-6 ), 0.0, 1.0 );
	}
	x = clamp( x - 0.5, 0.0, ${f(CURVE.at.length - 2)} );
	float rho = length( p.xy - ${v3(CORE.at)}.xy ) / ${f(CORE.r)}, y = 0.0;
	for ( int i = 0; i < ${CURVE.rings.length - 1}; i ++ ) {
		float a = stoneCurveRing[ i ], b = stoneCurveRing[ i + 1 ];
		if ( rho >= a ) y = float( i ) + clamp( ( rho - a ) / ( b - a ), 0.0, 1.0 );
	}
	int x0 = int( floor( x ) ), y0 = int( floor( y ) );
	int x1 = min( x0 + 1, ${CURVE.at.length - 2} ), y1 = min( y0 + 1, ${CURVE.rings.length - 1} );
	float fx = x - float( x0 ), fy = y - float( y0 );
	const int W = ${CURVE.at.length - 1};
	vec2 t = mix( mix( stoneCurveTint[ y0 * W + x0 ], stoneCurveTint[ y0 * W + x1 ], fx ), mix( stoneCurveTint[ y1 * W + x0 ], stoneCurveTint[ y1 * W + x1 ], fx ), fy );
	t *= 1.0 + ${v2(STONE.hueSpread)} * stoneQH;
	vec3 c = vec3( 1.0, t );
	return c * ( l / max( dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ), 1e-5 ) );
}`;

const FRAG_PARS = /* glsl */ `
varying vec3 vStoneP;
varying vec3 vStoneN;
#ifdef STONE_EDGE
	varying float vStoneEdge;
#endif
#ifdef STONE_SLAB
	flat varying float vStoneSlab;
	uniform vec4 uStoneBeds[ ${BEDS_MAX} ];
	uniform float uStoneTan[ ${BEDS_MAX} ];
#endif
#ifdef STONE_QUIET
	varying vec2 vStoneMass;
#endif
#ifdef STONE_BED
	varying vec3 vStoneBed;
#endif
#ifdef STONE_CURVE
	${CURVE_GLSL}
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
// What broke away cuts its gouges with this (debris/shaders.ts): the rock itself no longer does.
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
	float wedge = smoothstep( 0.0, ${f(SCAR_TAPER[0])}, blunt ) * pow( clamp( drawn / max( ${f(SCAR_TAPER[1])} * ( s1 - s0 ) * len, 1.0 ), 0.0, 1.0 ), 0.6 );
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
const STONE_FRAG = /* glsl */ `
{
	#ifdef STONE_CURVE
		stoneQH = 0.0;
	#endif
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
	#ifdef STONE_SLAB
		float bTone = stoneHash1( vStoneSlab * 5.13 ), bRough = stoneHash1( vStoneSlab * 9.73 + 1.0 );
		vec3 bOff = vec3( vStoneSlab * 11.0, vStoneSlab * 5.0, vStoneSlab * 3.0 );
		float bSeed = vStoneSlab * 3.1;
	#else
		vec4 slow = vec4( stoneNoise3( p / 170.0 + 0.3 ), stoneNoise3( p / 130.0 + 5.1 ), stoneNoise3( p / 150.0 + 9.7 ), stoneNoise3( p / 110.0 + 2.2 ) );
		float bTone = slow.w, bRough = slow.x;
		vec3 bOff = slow.yzw * 3.0;
		float bSeed = 0.0;
	#endif
	float pix = max( max( length( dFdx( p ) ), length( dFdy( p ) ) ), 1e-4 );

	// The grain, near and wider, from the three axes. A face seen nearly edge on keeps only its grain's tone.
	// Sculpt S's faces lean every way: blended evenly from two axes the grain was drawn out into streaks on a slope.
	#ifdef STONE_BED
		vec3 w = pow( abs( n ), vec3( 10.0 ) );
	#else
		vec3 w = pow( abs( n ), vec3( 4.0 ) );
	#endif
	w /= max( w.x + w.y + w.z, 1e-5 );
	vec3 gNear, gWide;
	vec2 tNear, tWide;
	stoneGrainAt( p, w, ${f(1 / STONE.grain.period)}, 0.0, gNear, tNear );
	stoneGrainAt( p * 0.2327 + 17.0, w, ${f(1 / STONE.grain.period)}, 3.0, gWide, tWide );
	float edgeOn = smoothstep( 0.06, 0.28, facing );
	float st1 = stoneNoise3( p / 31.0 + bOff * 3.7 ), st2 = stoneNoise3( p / 11.0 + 2.7 ), st3 = stoneNoise3( p / 4.3 + 8.1 );
	// How much of the core's light reaches the place.
	float lit = smoothstep( 0.0, 0.2, max( cf, 0.0 ) * seen );
	// The cave round the core: within it the stone is at its cleanest.
	float cave = smoothstep( ${f(CORE.r * STONE.cave[0])}, ${f(CORE.r * STONE.cave[1])}, dC );
	vec3 tilt = vec3( 0.0 );
	vec3 c = ${v3(STONE.own)};
	float fromEdge = 1e3;
	#ifdef STONE_EDGE
		fromEdge = abs( vStoneEdge );
	#endif

	#ifndef STONE_GRAIN
		// The bedding. Each block's layers lie in a plane of its own (uStoneBeds, by the block's number), as the sculpt's
		// steps do: partings of two sizes, each a step where one layer stands proud of the next, so the riser between
		// them is lit or in shade by which way it faces, with a pale worn lip along its top and a dark foot. They run
		// the whole way across a block and pinch out, of very different lengths, never radiating from the core.
		vec4 w1 = stoneNoiseD( p / 23.0 + 3.1 ), w3 = stoneNoiseD( p / 6.0 + 1.3 );
		vec4 bed = vec4( 0.0, 1.0, 0.0, 0.0 );
		#ifdef STONE_SLAB
			bed = uStoneBeds[ int( clamp( vStoneSlab + 0.5, 0.0, ${f(BEDS_MAX - 1)} ) ) ];
		#endif
		#ifdef STONE_BED
			bed = vec4( vStoneBed, 1.0 );
		#endif
		vec3 bN = bed.xyz / max( length( bed.xyz ), 1e-4 );
		vec3 bT = bN - n * dot( bN, n );
		float bTl = length( bT );
		// Where the layers lie nearly in the face, a parting is too wide to be a line: it is left out. The laminae
		// only where their plane cuts the face steeply: cut at a slant they drew wide rings, as wood grain does.
		#ifdef STONE_BED
			float across = smoothstep( ${f(STONE.laminae.across[0])}, ${f(STONE.laminae.across[1])}, bTl );
		#else
			float across = smoothstep( 0.18, 0.42, bTl );
		#endif
		bT = bTl > 1e-4 ? bT / bTl : vec3( 0.0 );
		#ifdef STONE_BED
			float tb = dot( p, bN ) + ${f(STONE.laminae.warp[0])} * ( w1.w - 0.5 ) * 2.0 + ${f(STONE.laminae.warp[1])} * ( w3.w - 0.5 ) * 2.0;
			// The laminae's risers face the core, so each is a lit lip toward it with a shadow under it.
			float toCore = dot( bT, lT ) >= 0.0 ? 1.0 : - 1.0;
		#else
			float tb = dot( p, bN ) + ${f(STONE.bed.warp[0])} * ( w1.w - 0.5 ) * 2.0 + ${f(STONE.bed.warp[1])} * ( w3.w - 0.5 ) * 2.0;
		#endif
		float riser = 0.0, lipB = 0.0, foot = 0.0, layerTone = 0.0;
		for ( int s = 0; s < 2; s++ ) {
			#ifdef STONE_BED
				float P = s == 0 ? ${f(STONE.laminae.apart[0])} : ${f(STONE.laminae.apart[1])};
			#else
				float P = s == 0 ? ${f(STONE.bed.apart[0])} : ${f(STONE.bed.apart[1])};
			#endif
			float seed = bSeed + float( s ) * 17.0;
			float u = tb / P, k = floor( u );
			float o = 0.15 + 0.7 * stoneHash1( k * 1.37 + seed );
			// How far along the face, across the layers, the place is from this layer's parting.
			float d = ( fract( u ) - o ) * P / max( bTl, 0.18 );
			float hk = stoneHash1( k * 3.71 + seed + 0.5 );
			float runs = s == 0 ? ${f(STONE.bed.run[0])} : ${f(STONE.bed.run[1])};
			// A block that is not bedded has no partings at all (round 8): the finer ones ran parallel on every block.
			float there = smoothstep( hk, hk + 0.14, stoneNoise3( p / runs + vec3( k * 0.73, seed, 0.0 ) ) * ( s == 0 ? bed.w : 0.3 + 0.4 * bed.w ) ) * step( 0.05, bed.w );
			#ifdef STONE_BED
				float wR = mix( s == 0 ? ${f(STONE.laminae.riser[0])} : ${f(STONE.laminae.riser[2])}, s == 0 ? ${f(STONE.laminae.riser[1])} : ${f(STONE.laminae.riser[3])}, stoneHash1( k * 5.3 + seed ) );
				float up = stoneHash1( k * 2.9 + seed + 3.3 ) < ${f(STONE.laminae.away)} ? - toCore : toCore;
			#else
				float wR = mix( s == 0 ? ${f(STONE.bed.riser[0])} : ${f(STONE.bed.riser[2])}, s == 0 ? ${f(STONE.bed.riser[1])} : ${f(STONE.bed.riser[3])}, stoneHash1( k * 5.3 + seed ) );
				float up = stoneHash1( k * 2.9 + seed + 3.3 ) < 0.5 ? - 1.0 : 1.0;
			#endif
			// Seen at least a pixel and a half wide, or faded to the tone it averages to.
			float seenR = smoothstep( 1.0, 2.2, wR / pix ) * there * across * edgeOn;
			float inR = clamp( min( d, wR - d ) / pix + 0.5, 0.0, 1.0 );
			float rK = inR * seenR;
			#ifdef STONE_BED
				tilt += bT * up * ( ${f(STONE.laminae.tilt)} * rK );
			#else
				tilt += bT * up * ( ${f(STONE.bed.tilt)} * rK );
			#endif
			riser = max( riser, rK );
			float lw = max( 0.45 * wR, 0.9 * pix );
			lipB = max( lipB, clamp( ( lw - abs( d - ( up > 0.0 ? wR : 0.0 ) ) ) / pix, 0.0, 1.0 ) * seenR * smoothstep( 1.2, 2.4, lw / pix ) );
			foot = max( foot, clamp( ( lw - abs( d - ( up > 0.0 ? 0.0 : wR ) ) ) / pix, 0.0, 1.0 ) * seenR );
			// Faded where too fine to see: the line it would draw is a slightly darker tone.
			layerTone += ( 1.0 - smoothstep( 1.0, 2.2, wR / pix ) ) * there * across * inR * 0.5;
			// Each layer its own tone, a little.
			layerTone += ( stoneHash1( k * 9.1 + seed + 7.0 ) - 0.5 ) * 0.04 * bed.w * there;
		}

		// The weathered crust: how far in from the planet's outer surface, and under the land, the place is. It is the
		// same stone, a little greyer and paler, and keeps every mark of its own.
		float shR = length( p.xz ) / ${f(WORLD.half)}, shD = max( 0.0, -( p.y + ${f(RIM)} ) ) / ${f(WORLD.deep)};
		float inside = ( 1.0 - sqrt( shR * shR + shD * shD ) ) * mix( ${f(WORLD.half)}, ${f(WORLD.deep)}, shD / max( shR + shD, 1e-3 ) );
		float underLand = sqrt( max( 1.0, ${f(WORLD.top * WORLD.top)} - dot( p.xz, p.xz ) ) ) - ${f(WORLD.top)} - p.y;
		float crustK = 1.0 - smoothstep( ${f(STONE.crust.near)}, ${f(STONE.crust.far)}, min( inside, underLand ) + 12.0 * ( stoneNoise3( p / 19.0 + 3.0 ) - 0.5 ) );
		float moonK = smoothstep( 0.05, 0.5, moon ) * smoothstep( 0.0, 0.3, dot( n, ${MOON} ) );

		// A convex edge turned to the core is chipped pale: a worn lip a unit and a half to three wide, missing here and
		// there, with a bevel turned to the core. Where two plates meet in a concave crease, a warm dark lies in the
		// corner. The sculpt says which a crease is (the sign of the stored distance).
		float chipped = 0.0, crease = 0.0;
		#ifdef STONE_EDGE
			float convex = step( 0.0, vStoneEdge );
			float band = ( ${f(STONE.edge.thin)} + ${f(STONE.edge.wide - STONE.edge.thin)} * pow( stoneNoise3( p / 8.0 + 2.0 ), 1.2 ) ) * mix( 0.5, 1.0, smoothstep( 0.3, 0.75, facing ) );
			float there = smoothstep( ${f(STONE.edge.missing - 0.06)}, ${f(STONE.edge.missing + 0.06)}, stoneNoise3( p / 15.0 + 7.0 ) );
			float ragged = fromEdge + 0.9 * band * ( stoneNoise3( p / 1.6 + 5.0 ) - 0.5 );
			chipped = ( 1.0 - smoothstep( 0.6 * band, band, ragged ) ) * there * convex * smoothstep( 0.02, 0.25, cf ) * seen
				* smoothstep( 0.2, 0.45, facing ) * smoothstep( 1.0, 2.0, band / pix );
			float nearCrease = 1.0 - smoothstep( 0.0, ${f(STONE.crease.wide)}, fromEdge + 3.0 * ( st2 - 0.5 ) );
			// Only where the corner is shut in: a gentle fold on an open face is not where dust and shade gather, and shaded
			// it outlined every kink of a face as crumpled paper.
			crease = nearCrease * ( 1.0 - convex ) * ( 1.0 - smoothstep( ${f(STONE.crease.open[0])}, ${f(STONE.crease.open[1])}, open ) );
		#endif
	#endif

	// The knapped relief: broad shells meeting along ridges, whose light differs across a face.
	vec4 r1 = stoneNoiseD( p / ${f(STONE.roll.wide[0])} + bOff * 5.7 );
	// The finer scars only where a pixel is fine enough to show them.
	float fine2 = 1.0 - smoothstep( 0.25, 0.6, pix );
	vec4 sc1 = stoneScallop( p, ${f(STONE.roll.wide[1])}, bOff.x * 3.0 ), sc2 = fine2 > 0.0 ? stoneScallop( p, ${f(STONE.roll.wide[2])}, 7.7 ) : vec4( 0.0 );
	vec3 roll = r1.xyz * ${f(STONE.roll.deep[0] / STONE.roll.wide[0])} + sc1.xyz * ${f(STONE.roll.deep[1])} * ( 0.5 + bRough ) + sc2.xyz * ${f(STONE.roll.deep[2])} * fine2;
	// A flake's bowl is a little darker at its middle, and the ridges between are proud and catch the light.
	float knap = ( smoothstep( 0.25, 0.62, sc1.w ) - 0.5 ) + 0.4 * fine2 * ( smoothstep( 0.25, 0.62, sc2.w ) - 0.5 );
	#ifdef STONE_QUIET
		roll *= ${f(STONE.quiet.roll)};
		knap *= ${f(STONE.quiet.knap)};
	#endif
	float up = smoothstep( 0.35, 0.75, n.y );
	float dust = up * smoothstep( 0.2, 0.55, 0.3 + 0.45 * ( 1.0 - open ) + 0.3 * ( st1 - 0.5 ) );
	tilt += ${f(STONE.grain.tilt)} * edgeOn * ( gNear * mix( 1.0, 1.6, dust ) + ${f(STONE.grain.wear)} * gWide * ( 1.0 - 0.6 * dust ) );
	tilt += roll * edgeOn * ( 0.6 + 0.8 * bRough ) * ( 1.0 - 0.5 * dust );
	float qPit = 0.0;
	#ifdef STONE_QUIET
		for ( int s = 0; s < 2; s++ ) {
			// Of sizes that differ from place to place.
			float W = ( s == 0 ? ${f(STONE.pits.wide[0])} : ${f(STONE.pits.wide[1])} ) * ( 0.6 + 0.9 * stoneNoise3( p / 31.0 + vec3( float( s ) * 3.3 ) ) );
			// In clusters, never an even speckle: over most of a face there are none, and whole faces have none at all.
			float th = 1.0 - ( s == 0 ? ${f(STONE.pits.share[0])} : ${f(STONE.pits.share[1])} ) * smoothstep( 0.5, 0.78, stoneNoise3( p / ${f(STONE.pits.cluster)} + vec3( float( s ) * 7.1 ) ) ) * smoothstep( 0.45, 0.6, stoneNoise3( p / ${f(STONE.pits.bare)} + 4.4 ) );
			#ifdef STONE_BED
				// Turned off the noise's own grid and pushed about by a wider noise, or every pit was the same square stud.
				mat3 qR = mat3( 0.788, 0.3, -0.537, -0.211, 0.951, 0.225, 0.578, -0.073, 0.813 );
				vec4 q = stoneNoiseD( ( qR * p + 3.0 * vec3( st2, stoneNoise3( p / 13.0 + 1.9 ), st3 ) ) / W + vec3( float( s ) * 13.7 + 5.3 ) );
				q.xyz = q.xyz * qR;
			#else
				vec4 q = stoneNoiseD( p / W + vec3( float( s ) * 13.7 + 5.3 ) );
			#endif
			float t = clamp( ( q.w - th ) / ${f(STONE.pits.soft)}, 0.0, 1.0 ), m = t * t * ( 3.0 - 2.0 * t );
			float shows = 1.0 - smoothstep( 0.2, 0.55, pix / W );
			tilt += ( s == 0 ? ${f(STONE.pits.deep[0])} : ${f(STONE.pits.deep[1])} ) * 6.0 * t * ( 1.0 - t ) / ${f(STONE.pits.soft)} * q.xyz * shows * edgeOn;
			qPit = max( qPit, m * shows );
		}
	#endif
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
	// Hue rolls with the light: cream only where a face squarely meets the core near it and is open to it, a deep
	// orange in every recess and where the light only grazes, so that a face is never one hue from edge to edge.
	full *= mix( ${f(STONE.recess)}, 1.0, smoothstep( 0.12, 0.42, open ) );
	// A block whose stone is paler and drier takes the tan wherever the core's light is on it at all.
	#ifdef STONE_SLAB
		full = max( full, uStoneTan[ int( clamp( vStoneSlab + 0.5, 0.0, ${f(BEDS_MAX - 1)} ) ) ] * lit );
	#endif
	c *= mix( ${v3(STONE.shadeTint)}, ${v3(STONE.litTint)}, full );
	#ifdef STONE_QUIET
	{
		// Where the core's light is paled (LIGHT.core.pale) a face it only grazes takes some of the lit hue too: in the
		// shade's hue under that pale light it came out salmon.
		float qF = max( full, ${f(STONE.quietTint.paled)} * lit * smoothstep( ${f(LIGHT.core.pale[1])}, ${f(LIGHT.core.pale[2])}, min( 1.0, ${f(CORE.r)} / dC ) ) );
		vec3 qHue = mix( mix( ${v3(STONE.quietTint.shade)}, ${v3(STONE.quietTint.far)}, cave ), ${v3(STONE.quietTint.lit)}, qF );
		float qV = mix( mix( ${f(STONE.quietTint.value[1])}, ${f(STONE.quietTint.value[2])}, cave ), ${f(STONE.quietTint.value[0])}, qF );
		// Each mass's own: its hue a few degrees toward gold or red, its value a little up or down.
		vec2 qM = ( vStoneMass - 0.5 ) * 2.0;
		// And within a face its hue drifts, broad and finer, as weathered stone's does.
		float qH = ${f(STONE.quietTint.mass[0])} * qM.x + ${f(STONE.quietTint.drift[0])} * ( 1.4 * ( stoneNoise3( p / ${f(STONE.quietTint.drift[1])} + 3.3 ) - 0.5 ) + 0.6 * ( stoneNoise3( p / ${f(STONE.quietTint.drift[2])} + 9.1 ) - 0.5 ) ) * 2.0;
		qHue *= vec3( 1.0, 1.0 + 0.045 * qH, 1.0 + 0.09 * qH );
		#ifdef STONE_CURVE
			stoneQH = qH;
		#endif
		qV *= 1.0 + ${f(STONE.quietTint.mass[1])} * qM.y;
		c = qHue / max( dot( qHue, vec3( 0.2126, 0.7152, 0.0722 ) ), 1e-4 ) * dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) * qV * ( 1.0 - ${f(STONE.pits.tone)} * qPit );
	}
	#endif
	float hotK = ${f(STONE.hot.most)} * seen * smoothstep( 0.05, 0.45, cf ) * ( 1.0 - smoothstep( ${f(STONE.hot.full)}, ${f(STONE.hot.from)}, dC ) );
	c = mix( c, ${v3(STONE.hot.color)}, hotK );
	float rough = 0.0;
	// A few grains glint, only on a face the light is on.
	float glints = step( ${f(1 - STONE.sparkle.share)}, fract( tNear.x * 13.7 + tNear.y * 3.1 ) ) * tNear.y * fine2 * lit;
	#ifndef STONE_GRAIN
		// The crust is the same stone, greyer and a little paler: the moon's own pale light does the rest.
		c = mix( c, mix( vec3( dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) ), c, ${f(STONE.crust.chroma)} ) * ${f(STONE.crust.pale)}, crustK );
		c *= 1.0 - layerTone;
		// A parting: its riser a little darker and redder, fresh; its worn lip paler; its foot a dark line.
		c *= mix( vec3( 1.0 ), ${v3(STONE.bed.riserTint)}, riser );
		c = mix( c, ${v3(STONE.chip)} * ( 0.92 + 0.16 * st3 ), ${f(STONE.bed.lip)} * lipB * lit );
		#ifdef STONE_BED
			c *= 1.0 - ${f(STONE.laminae.foot)} * foot;
		#else
			c *= 1.0 - ${f(STONE.bed.foot)} * foot;
		#endif
		c = mix( c, ${v3(STONE.chip)} * ( 0.9 + 0.2 * tNear.x ), 0.4 * chipped );
		c *= mix( vec3( 1.0 ), ${v3(STONE.crease.tint)}, crease );
		rough = foot;
		#ifdef STONE_QUIET
			// A step the moon lights and the visitor sees nearly edge on fades as it thins (common.md, 04:20): the roof's
			// steps drew thin pale lines with square bends, which read as steel brackets.
			c *= mix( 1.0, smoothstep( ${f(STONE.quietTint.thin[0])}, ${f(STONE.quietTint.thin[1])}, facing ), moonK * ( 1.0 - lit ) );
		#endif
	#endif
	#ifdef STONE_QUIET
		// The dust in its own hue, a little paler: in the old dust's greyed red it came out salmon under the paled light.
		c = mix( c, c * ${f(STONE.quietTint.dust)} * ( 0.88 + 0.24 * tNear.x ) * mix( 0.85, 1.0, tNear.y ), 0.7 * dust );
	#else
		c = mix( c, ${v3(STONE.dust)} * ( 0.88 + 0.24 * tNear.x ) * mix( 0.85, 1.0, tNear.y ), 0.7 * dust );
	#endif
	float chroma = mix( mix( ${f(STONE.chroma[1])}, ${f(STONE.chroma[0])}, lit ), ${f(STONE.hot.chroma)}, hotK / ${f(STONE.hot.most)} );
	#ifndef STONE_GRAIN
		chroma *= mix( 1.0, ${f(STONE.crust.moonChroma)}, moonK * ( 1.0 - lit ) );
	#endif
	#ifdef STONE_QUIET
		chroma = 1.0;
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
				: stoneMode == 6 ? riser : stoneMode == 7 ? bed.w : stoneMode == 8 ? chipped : crease;
		#endif
		// Over 20, the same in bands: red over a quarter, yellow over a half, pale over three quarters, as the tone
		// curve hides the numbers.
		totalEmissiveRadiance = STONE_DEBUG > 20 ? 0.4 * vec3( step( 0.25, stoneShow ), step( 0.5, stoneShow ), step( 0.75, stoneShow ) ) : vec3( stoneShow );
		#ifndef STONE_GRAIN
			if ( STONE_DEBUG == 10 ) totalEmissiveRadiance = vec3( riser, lipB, foot );
			#if defined( STONE_SLAB ) && defined( STONE_EDGE )
				if ( STONE_DEBUG == 12 ) totalEmissiveRadiance = vec3( fract( vStoneSlab * 0.137 ), fract( vStoneSlab * 0.591 ), fract( vStoneSlab * 0.313 ) );
				if ( STONE_DEBUG == 13 ) totalEmissiveRadiance = vec3( step( 0.0, vStoneEdge ), 1.0 - step( 0.0, vStoneEdge ), 0.0 ) * ( 1.0 - smoothstep( 0.0, 8.0, fromEdge ) );
			#endif
			if ( STONE_DEBUG == 11 ) totalEmissiveRadiance = vec3( full, lit, hotK );
			#ifdef STONE_QUIET
				if ( STONE_DEBUG == 14 ) totalEmissiveRadiance = 0.5 * vec3( fract( vStoneMass.x * 7.31 ), fract( vStoneMass.y * 5.13 ), fract( ( vStoneMass.x + vStoneMass.y ) * 3.77 ) );
			#endif
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

// Sculpt S's light given the picture's hue (STONE_CURVE), and with ?stonedebug=15 a ramp of greys in bands across
// the hollow, 40 units wide, by which fit.mjs reads what the world's last pass makes of a light.
const CURVE_OUT = /* glsl */ `
#ifdef STONE_CURVE
	outgoingLight = stoneCurve( outgoingLight, vStoneP );
#endif
#if defined( STONE_DEBUG ) && STONE_DEBUG == 15
	outgoingLight = vec3( exp2( ${f(CURVE.ramp[0])} + ${f(CURVE.ramp[1] - CURVE.ramp[0])} * ( floor( clamp( ( vStoneP.x - ${f(CURVE.ramp[2])} ) / ${f(CURVE.ramp[3])}, 0.0, ${f(CURVE.ramp[4] - 1)} ) ) + 0.5 ) / ${f(CURVE.ramp[4])} ) );
#endif`;

type Shader = THREE.WebGLProgramParametersWithUniforms;
const after = (src: string, chunk: string, add: string): string => {
  if (!src.includes(`#include <${chunk}>`)) throw new Error(`stone: the shader has no ${chunk}`);
  return src.replace(`#include <${chunk}>`, `#include <${chunk}>\n${add}`);
};

// Lays the stone into a standard shader's fragment stage, and the vertex stage too unless the part sets vStoneP and
// vStoneN itself (own: true). grainOnly leaves out the partings, the crust and the edges: the stone's
// body, its grain, its stains, its knapped relief and its wear, for what broke away.
export function stoneShader(sh: Shader, maps: StoneMaps, own = false, grainOnly = false, beds?: readonly (readonly number[])[], tans?: readonly number[]): void {
  Object.assign(sh.uniforms, { uStoneGrain: { value: maps.grain }, uStoneStreamPower: { value: 1 }, uStoneStream: world.uniforms.uStream });
  if (beds) {
    sh.uniforms.uStoneBeds = { value: Array.from({ length: BEDS_MAX }, (_, i) => new THREE.Vector4(...(beds[i] ?? [0, 1, 0, 0]))) };
    sh.uniforms.uStoneTan = { value: Array.from({ length: BEDS_MAX }, (_, i) => tans?.[i] ?? 0) };
  }
  if (!own) sh.vertexShader = after(after(sh.vertexShader, 'common', STONE_VERT_PARS), 'begin_vertex', VERT);
  let fr = after(sh.fragmentShader, 'common', `${grainOnly ? '#define STONE_GRAIN\n' : ''}${FRAG_PARS}`);
  fr = after(fr, 'color_fragment', STONE_FRAG);
  fr = after(fr, 'roughnessmap_fragment', 'roughnessFactor = stoneRough;');
  fr = after(fr, 'normal_fragment_maps', 'normal = normalize( ( viewMatrix * vec4( stoneNormal, 0.0 ) ).xyz );');
  fr = after(fr, 'lights_physical_fragment', SHEEN);
  fr = after(fr, 'lights_fragment_begin', STREAM_LIGHT);
  fr = fr.replace('#include <opaque_fragment>', `${CURVE_OUT}\n#include <opaque_fragment>`);
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
  // Each block number's bedding: the plane its layers lie in, and how strongly bedded it is (0: clean).
  beds?: readonly (readonly number[])[];
  // Each block number's tan: how far its stone is the paler, drier tan wherever the core's light is on it (0 to 1).
  tans?: readonly number[];
  // Where each vertex's distance to its face's outline is stored, under 0 toward a concave crease, as a GLSL expression of the vertex stage (such as
  // 'aBounce.w * 8.0'), in units: the chipped band along an edge and the shade toward a crease are then real widths.
  edge?: string;
  // The stone's body, grain and wear only (see stoneShader).
  grainOnly?: boolean;
  // Its knapped scars all but gone (STONE.quiet).
  quiet?: boolean;
  // With quiet: the sculpt stores a tone of each mass's own in light.w (its value) and bounce.w (its hue).
  mass?: boolean;
  // With quiet: the sculpt stores each vertex's bedding in light.w and bounce.w, folded onto an octahedron, and the
  // stone lays its laminae along it (STONE.laminae). Each mass's tone is worked out from it.
  bed?: boolean;
  // With quiet: the light's hue is set to picture 9's rock at that brightness and distance from the core (./curve.ts).
  curve?: boolean;
  // Draws one thing the stone reads instead of the stone, to judge it: 1 openness, 2 the core's share seen, 3 the
  // distance to an edge, 4 the crust, 5 the moon's share, 6 the partings' risers, 7 how bedded the block is, 8 the chipped
  // edges, 9 the creases' shade, 10 the partings' risers, lips and feet (red, green, blue), 12 each block in a color of its
  // own, 13 concave creases green and convex red, 14 (sculpt S) each mass in a color of its own,
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
    ...(o.quiet ? { STONE_QUIET: '' } : {}),
    ...(o.quiet && o.mass ? { STONE_MASS: '' } : {}),
    ...(o.quiet && o.bed ? { STONE_BED: '' } : {}),
    ...(o.quiet && o.curve ? { STONE_CURVE: '' } : {}),
  };
  m.onBeforeCompile = (sh) => stoneShader(sh, maps, false, o.grainOnly, o.spare === 'slab' ? o.beds ?? [] : undefined, o.tans);
  return lit(m, { key: `stone-${o.key}${o.spare ? '-slab' : ''}${o.edge ? '-edge' : ''}${o.grainOnly ? '-grain' : ''}${o.quiet ? '-quiet' : ''}${o.quiet && o.mass ? '-mass' : ''}${o.quiet && o.bed ? '-bed' : ''}${o.quiet && o.curve ? '-curve' : ''}${o.debug ? `-debug${o.debug}` : ''}`, baked: o.baked });
}
