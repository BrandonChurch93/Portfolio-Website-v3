import * as THREE from 'three';
import { CORE, SCALE, SOURCE } from '../../layout';
import { color, lit, stone } from '../../light';

// The planet's stone: what the torn rock is made of, and what a piece that broke away may wear. A sandstone whose
// color comes from the light on it. Its beds lie through each block at the block's own tilt: broad bands of paler,
// redder and darker stone, thin strata standing proud or cut back where a block's side crosses them. Most of a face
// is clean stone with a fine grain. On it, a few erosion pockets of very different sizes, gathered along the beds
// that water worked, each with a floor the core's light does not reach, a lit far wall and a pale lip; a few narrow
// grooves cut along the beds, which step at every fold; a few wandering hairline joints. Its edges are chipped,
// wide here and a hairline there, bitten and missing for a stretch. Where light does not reach it goes redder and
// deeper, and what faces up carries a paler dust.
//
// What has a direction (the beds, the strata, the grooves, the pockets, the joints) is worked out in three
// dimensions from the place, so it lies on every face as the stone would and is never stretched across one seen
// edge on. The one map (scripts/world/parts/rock-material/make.mjs, public/world/rockmat-grain.png) is the grain,
// the same in every direction, laid from the three axes.
//
//   const maps = await stoneMaps(renderer)                        once, shared by every user, released with maps.release()
//   const m = stoneMaterial(maps, { key: 'rock', baked, spare })  a standard material joined to the world's light
//
// A block's own number (spare: 'slab') turns its beds and sets its tone. Without one, the same come from large slow
// fields of the place, and what must be steady over a face (where a groove lies) from the face's own facing.
//
// The page's stream lights the stone near it, as the frame says (uStream in ../../light.ts).
//
// A part that moves its own vertices lays the stone in itself: STONE_VERT_PARS, then sets vStoneP (the place, in
// units) and vStoneN (the normal, in the same frame) in its vertex shader, and stoneShader(sh, maps, true) does the
// rest of the fragment shader. Setting the uniform uStreamPower to 0 takes the stream's light off, for a part that
// lights itself from the stream.

const mix = (a: THREE.Color, b: THREE.Color, k: number): THREE.Color => a.clone().lerp(b, k);
const own = stone();
export const STONE = {
  own,
  // The beds' colors, each a stone of the same kind: paler and yellower, redder, darker and browner.
  pale: mix(own, color('text-2'), 0.42).multiplyScalar(1.05),
  red: mix(own, color('copper'), 0.25).multiplyScalar(0.9),
  dark: mix(own, color('text-3'), 0.2).multiplyScalar(0.62),
  // A chipped edge is fresh stone, paler and a little yellower. Dust is paler and flatter still.
  chip: mix(own, color('text-3'), 0.45).multiplyScalar(1.15),
  dust: mix(own, color('text-3'), 0.55).multiplyScalar(1.1),
  // Where light does not reach (a crease, a pocket's floor, a groove, a face turned from the core) the stone goes
  // redder and deeper: what its red, green and blue are multiplied by there at most.
  rust: [0.9, 0.46, 0.32] as const,
  // How far a face the core lights full on goes toward the pale bed's color, in patches.
  lit: 0.65,
  // And a face turned from the core is deeper still: what it is multiplied by.
  away: 0.6,
  // Stone nearest the core is paler and less saturated, so that the core's light takes it toward a peach tan and it
  // still reads as stone: its color, from how far from the core's middle it begins and where it is full, in units,
  // how much at most, and the share of its color it keeps there.
  hot: { color: mix(own, color('text-2'), 0.6), from: CORE.r * 2.4, full: CORE.r * 1.2, most: 0.45, chroma: 0.5 },
  // The rolled relief of a broken face: how wide its swells are, in units, and how high.
  roll: { wide: [24, 8.5], deep: [8, 2] },
  // How much of its color the stone keeps against its own grey.
  chroma: 0.74,
  // How rough a clean face, a groove's or pocket's floor, the dust.
  rough: [0.88, 0.96, 0.98] as const,
  // The tone inside a face, which is small where the core lights it and larger in the dark, where only the grain's
  // tone can show it: the stains' range, and the grain's, lit and dark.
  mottle: { lit: [0.88, 1.08], dark: [0.7, 1.22], grain: [0.08, 0.2] },
  // The beds: the bowl they lie in, dipping toward the core's axis, how far each block turns them, in radians, and
  // how thick the broad bands of tone are, in units.
  bed: { bowl: 0.0011, lean: 0.12, turn: 0.75, bands: [41, 17, 83] as const },
  // The strata: how thick a layer is on average, in units, and how far one stands proud of the next.
  strata: { thick: 3.2, step: 0.6 },
  // The grooves along the beds: how far apart the lines they may lie on are, the share of lines that carry any, how
  // wide the widest is, the shortest and longest a dash of one runs, all in units, how much of a line is clean, and
  // how far from the core's middle the first may lie.
  groove: { apart: 11, lines: 0.32, wide: 1.4, short: 5, long: 38, few: 0.6, clear: CORE.r * 1.5 },
  // The erosion pockets, three families from large to small: the cell each lies in across the beds, in units, how
  // far it is drawn out along the beds each way and squashed across them, the share of cells that hold one, its
  // radius as a share of the cell, and how deep it is against its radius across the bed.
  pocket: [
    { cell: 14, long: [4.5, 3], squash: 1, chance: 0.3, r: [0.18, 0.42], deep: 0.7 },
    { cell: 5.5, long: [4, 2.6], squash: 1, chance: 0.07, r: [0.2, 0.42], deep: 0.8 },
    { cell: 2.2, long: [3, 2.2], squash: 1, chance: 0.03, r: [0.22, 0.42], deep: 0.9 },
  ],
  // The joints, hairline cracks across the beds: how far apart, how wide at most, and how long a dash of one is.
  joint: { apart: 41, wide: 0.5, long: 26 },
  // A chipped edge where the mesh says how far each place is from its face's outline: its widest and its thinnest,
  // in units, and the share of an edge where it is missing.
  edge: { wide: 3.6, thin: 0.3, missing: 0.3 },
  // How much of the light that has bounced a chipped edge in the dark catches, as a thin line.
  catch: 1.6,
  // The grain map: the units a tile covers, which the script that writes it holds too, and how strongly the grain
  // and the wider wear tilt the surface.
  grain: { period: 48, tilt: 0.4, wear: 1.3 },
} as const;

// The stream's light on the stone: a line from the core's foot straight down, as far as the page's stream has run,
// warm, gone within `reach` units. near is how fast it falls, and power how strong it is where it is full.
export const STREAM = { reach: 78, near: 26, power: 16, color: mix(color('flame'), color('hot'), 0.35) } as const;

export interface StoneMaps {
  grain: THREE.Texture;
  release(): void;
}

let shared: { maps: Promise<StoneMaps>; users: number; textures: THREE.Texture[] } | null = null;
function tile(file: string, aniso: number): Promise<THREE.Texture> {
  return new THREE.TextureLoader().loadAsync(`/world/${file}`).then((t) => {
    t.colorSpace = THREE.NoColorSpace;
    t.flipY = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = aniso;
    t.needsUpdate = true;
    return t;
  });
}
// The maps, loaded once for every user. Each user releases them once, and the last to do so frees them.
export function stoneMaps(renderer: THREE.WebGLRenderer): Promise<StoneMaps> {
  if (!shared) {
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const held = { users: 0, textures: [] as THREE.Texture[], maps: null as unknown as Promise<StoneMaps> };
    held.maps = tile('rockmat-grain.png', aniso).then((grain) => {
      held.textures = [grain];
      return {
        grain,
        release() {
          if (--held.users > 0) return;
          for (const t of held.textures) t.dispose();
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
const v3 = (c: THREE.Color): string => `vec3( ${f(+c.r.toFixed(4))}, ${f(+c.g.toFixed(4))}, ${f(+c.b.toFixed(4))} )`;
const C = `vec3( ${f(CORE.at[0])}, ${f(CORE.at[1])}, ${f(CORE.at[2])} )`;

export const STONE_VERT_PARS = /* glsl */ `
varying vec3 vStoneP;
varying vec3 vStoneN;
#ifdef STONE_EDGE
	varying float vStoneEdge;
#endif`;
// The place and normal in the world, in units, for a mesh drawn as it is.
const VERT = /* glsl */ `
{
	vec4 sW = modelMatrix * vec4( transformed, 1.0 );
	vStoneP = sW.xyz / ${f(SCALE)};
	vec3 sN = mat3( modelMatrix ) * objectNormal;
	vStoneN = sN / max( length( sN ), 1e-6 );
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
uniform vec2 uStream;
uniform float uStreamPower;
// What the stone works out once, before it is lit: its normal in the world, and its color and roughness.
vec3 sNormal;
vec3 sAlbedo;
float sRough;
// A chipped edge in the dark, which catches a thin line of the light that has bounced.
float sCatch;
float sHash1( float n ) { return fract( sin( n * 12.9898 + 4.1414 ) * 43758.5453 ); }
float sHash3( vec3 p ) { p = fract( p * 0.1031 ); p += dot( p, p.zyx + 31.32 ); return fract( ( p.x + p.y ) * p.z ); }
float sNoise3( vec3 p ) {
	vec3 i = floor( p ), u = fract( p );
	u = u * u * ( 3.0 - 2.0 * u );
	return mix( mix( mix( sHash3( i ), sHash3( i + vec3( 1, 0, 0 ) ), u.x ), mix( sHash3( i + vec3( 0, 1, 0 ) ), sHash3( i + vec3( 1, 1, 0 ) ), u.x ), u.y ),
		mix( mix( sHash3( i + vec3( 0, 0, 1 ) ), sHash3( i + vec3( 1, 0, 1 ) ), u.x ), mix( sHash3( i + vec3( 0, 1, 1 ) ), sHash3( i + vec3( 1, 1, 1 ) ), u.x ), u.y ), u.z );
}
// The same noise with its gradient, in xyz, and its value in w.
vec4 sNoiseD( vec3 p ) {
	vec3 i = floor( p ), f = fract( p ), u = f * f * ( 3.0 - 2.0 * f ), du = 6.0 * f * ( 1.0 - f );
	float a = sHash3( i ), b = sHash3( i + vec3( 1, 0, 0 ) ), c = sHash3( i + vec3( 0, 1, 0 ) ), d = sHash3( i + vec3( 1, 1, 0 ) );
	float e = sHash3( i + vec3( 0, 0, 1 ) ), g = sHash3( i + vec3( 1, 0, 1 ) ), h = sHash3( i + vec3( 0, 1, 1 ) ), k = sHash3( i + vec3( 1, 1, 1 ) );
	float k1 = b - a, k2 = c - a, k3 = e - a, k4 = a - b - c + d, k5 = a - c - e + h, k6 = a - b - e + g, k7 = - a + b + c - d + e - g - h + k;
	return vec4( du * vec3( k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z, k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x, k3 + k6 * u.x + k5 * u.y + k7 * u.x * u.y ),
		a + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z );
}
float sNoise1( float x ) { float i = floor( x ), u = fract( x ); u = u * u * ( 3.0 - 2.0 * u ); return mix( sHash1( i ), sHash1( i + 1.0 ), u ); }
// A slope stored as a normal's red and green, as the slope itself.
vec2 sSlope( vec4 t ) { vec2 xy = t.rg * 2.0 - 1.0; return xy / sqrt( max( 1.0 - dot( xy, xy ), 0.05 ) ); }
// v turned by a about the unit axis k.
vec3 sTurn( vec3 v, vec3 k, float a ) { float c = cos( a ), s = sin( a ); return v * c + cross( k, v ) * s + k * dot( k, v ) * ( 1.0 - c ); }
// The grain from the three axes: its slope as a vector in the world, its tone and how open it is. A bias on the
// map's level blurs it: what is left of it is its wider wear.
void sGrain( vec3 p, vec3 w, float scale, float bias, out vec3 slope, out vec2 toneOpen ) {
	vec4 gx = texture2D( uStoneGrain, p.zy * scale + 0.31, bias ), gy = texture2D( uStoneGrain, p.xz * scale + 0.57, bias ), gz = texture2D( uStoneGrain, p.xy * scale + 0.83, bias );
	vec2 sx = sSlope( gx ), sy = sSlope( gy ), sz = sSlope( gz );
	slope = vec3( 0.0, sx.y, sx.x ) * w.x + vec3( sy.x, 0.0, sy.y ) * w.y + vec3( sz.x, sz.y, 0.0 ) * w.z;
	toneOpen = vec2( gx.b * w.x + gy.b * w.y + gz.b * w.z, gx.a * w.x + gy.a * w.y + gz.a * w.z );
}
// One family of erosion pockets, in cells of the beds' own frame (B: along, across, along), drawn out along the
// beds by stretch and squashed across them by squash, so each is a gouge lying in its bed. A few cells hold a pocket
// of their own size, more of them on the beds that water worked (one in two rows of cells). Its outline is ragged by
// rag (about -0.5 to 0.5). The deepest pocket here wins: k is its depth in units, how far out from its middle the
// place is (0 to 1), its radius across the bed in units, and how far it shows (faded where it is finer than a
// pixel); grad is how its depth changes along the world, and off the place less its middle, in units.
void sPocket( vec3 p, mat3 B, float cell, vec2 stretch, float squash, float chance, vec2 rr, float deep, float seed, float rag, float pix, inout vec4 k, inout vec3 grad, inout vec3 off ) {
	vec3 sc = vec3( 1.0 / stretch.x, squash, 1.0 / stretch.y ) / cell;
	vec3 q = vec3( dot( p, B[0] ), dot( p, B[1] ), dot( p, B[2] ) ) * sc + seed;
	vec3 i = floor( q ), f = q - i;
	float wet = step( 0.5, sHash1( i.y * 3.17 + seed ) );
	if ( sHash3( i + seed * 1.7 ) > chance * mix( 0.2, 1.8, wet ) ) return;
	float r = mix( rr.x, rr.y, pow( sHash3( i * 1.31 + seed + 4.0 ), 1.6 ) );
	vec3 c = vec3( r ) + ( 1.0 - 2.0 * r ) * vec3( sHash3( i + 11.0 ), sHash3( i + 23.0 ), sHash3( i + 37.0 ) );
	vec3 o = ( f - c ) / r;
	float dd = length( o ) * ( 1.0 + 0.6 * rag * ( 0.5 + sHash3( i + 61.0 ) ) );
	if ( dd >= 1.0 ) return;
	float R = r / sc.y, D = deep * R * ( 0.6 + 0.8 * sHash3( i + 51.0 ) ), dd3 = dd * dd * dd;
	float h = D * ( 1.0 - dd3 * dd );
	if ( h <= k.x ) return;
	k = vec4( h, dd, R, smoothstep( 1.0 * pix, 2.5 * pix, R ) );
	vec3 v = o * sc / max( length( o ) * r, 1e-4 );
	grad = -4.0 * D * dd3 * ( B[0] * v.x + B[1] * v.y + B[2] * v.z );
	off = ( B[0] * ( o.x / sc.x ) + B[1] * ( o.y / sc.y ) + B[2] * ( o.z / sc.z ) ) * r;
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
	// A number steady over a flat face that changes at every fold: from the way it faces.
	float face = sHash3( floor( n * 2.2 + 0.5 ) * 7.13 + 1.7 );
	float open = 1.0, seen = 1.0;
	#ifdef WORLD_BAKED
		open = wLight.z;
		seen = wLight.x;
	#endif
	// Each block was turned when it broke, so its beds lie at their own angle, and each is its own tone. A block's
	// own number gives those; without one, large slow fields of the place do, which never change across a face at
	// once.
	#if defined( WORLD_BAKED ) && defined( STONE_SLAB )
		float slab = wLight.w;
		float bShift = slab * 997.0, bAxis = slab, bTurn = fract( slab * 7.31 ), bTone = fract( slab * 5.13 ), bRough = fract( slab * 9.73 ), bMany = fract( slab * 3.77 );
		vec3 bOff = vec3( slab * 11.0, slab * 5.0, slab * 3.0 );
		float id = slab * 0.71 + face;
	#else
		vec4 slow = vec4( sNoise3( p / 170.0 + 0.3 ), sNoise3( p / 130.0 + 5.1 ), sNoise3( p / 150.0 + 9.7 ), sNoise3( p / 110.0 + 2.2 ) );
		float bShift = 50.0 * slow.x, bAxis = slow.y, bTurn = slow.z, bTone = slow.w, bRough = slow.x, bMany = slow.z;
		vec3 bOff = slow.yzw * 3.0;
		float id = face;
	#endif
	float pix = max( length( dFdx( p ) ), length( dFdy( p ) ) );

	// The beds: across them is a bowl dipping toward the core's axis, turned by the block's own angle.
	vec3 across = normalize( vec3( ${f(STONE.bed.bowl)} * p.x, 1.0, ${f(STONE.bed.lean)} ) );
	float sa = bAxis * 6.2832;
	across = normalize( sTurn( across, normalize( vec3( cos( sa ), 0.35 * sin( 3.0 * sa ), sin( sa ) ) ), ${f(STONE.bed.turn)} * ( bTurn - 0.5 ) * 2.0 ) );
	float bed = dot( p, across ) + bShift + 5.0 * ( sNoise3( p / 47.0 ) - 0.5 ) + 1.6 * ( sNoise3( p / 13.0 + 4.1 ) - 0.5 );
	float bw = max( fwidth( bed ), 1e-4 );
	vec3 acrossT = across - n * dot( across, n );
	float side = length( acrossT );
	acrossT = side > 1e-4 ? acrossT / side : vec3( 0.0 );
	float sideK = smoothstep( 0.5, 0.8, side );
	float coreSide = dot( acrossT, lT ) >= 0.0 ? 1.0 : -1.0;

	// The grain, near and wider, from the three axes. A face seen nearly edge on keeps only what its grain does to
	// its tone.
	vec3 w = pow( abs( n ), vec3( 4.0 ) );
	w /= max( w.x + w.y + w.z, 1e-5 );
	vec3 gNear, gWide;
	vec2 tNear, tWide;
	sGrain( p, w, ${f(1 / STONE.grain.period)}, 0.0, gNear, tNear );
	sGrain( p * 0.2327 + 17.0, w, ${f(1 / STONE.grain.period)}, 3.0, gWide, tWide );
	float edgeOn = smoothstep( 0.06, 0.28, facing );

	// Stains: large, slow patches of darker and paler stone inside a face.
	float st1 = sNoise3( p / 31.0 + bOff * 3.7 ), st2 = sNoise3( p / 11.0 + 2.7 ), st3 = sNoise3( p / 4.3 + 8.1 );
	float stain = st1 * 0.7 + st2 * 0.3;
	// How far the place is from the core's light: in the dark only tone can show the stone, so tone carries more.
	float dark = 1.0 - smoothstep( 0.0, 0.2, max( cf, 0.0 ) * seen );

	// The strata: layers about strata.thick units thick, of uneven thickness, each standing proud of or cut back from
	// the next by up to strata.step. They show where a face crosses them and fade where a pixel covers a layer.
	float su = ( bed + 7.0 * sNoise1( bed / 13.0 ) + 2.5 * sNoise1( bed / 4.1 + 3.0 ) ) / ${f(STONE.strata.thick)};
	float si = floor( su ), sf = fract( su );
	float hs0 = sHash1( si + 0.37 ), hs1 = sHash1( si + 1.37 );
	float h0 = hs0 * step( 0.7, sHash1( si * 1.7 + 5.0 ) ), h1 = hs1 * step( 0.7, sHash1( ( si + 1.0 ) * 1.7 + 5.0 ) ), sEase = smoothstep( 0.7, 1.0, sf );
	float stratK = sideK * smoothstep( 0.2, 0.45, facing ) * smoothstep( 0.45, 0.7, sNoise3( p / 36.0 + bOff * 1.7 ) ) * ( 1.0 - smoothstep( 0.15, 0.4, bw / ${f(STONE.strata.thick)} ) );
	float sDer = smoothstep( 0.4, 0.7, sNoise3( p / 14.0 + si * 3.1 ) ) * ( h1 - h0 ) * 6.0 * sEase * ( 1.0 - sEase ) / ( 0.3 * ${f(STONE.strata.thick)} ) * ${f(STONE.strata.step)};
	float layerTone = mix( hs0, hs1, sEase ) - 0.5;

	// Edges and creases, from how the surface turns between pixels, and from how far the place is from its face's
	// outline when the mesh says.
	vec3 dnx = dFdx( n ), dny = dFdy( n ), dpx = dFdx( p ), dpy = dFdy( p );
	float turn = length( dnx ) + length( dny ), bend = dot( dnx, dpx ) + dot( dny, dpy );
	float bite = st3 * 0.6 + 0.4 * tNear.x;
	float edge = smoothstep( 0.15, 0.6, turn ), crease = edge * step( bend, 0.0 );
	// Without the mesh's word a chipped edge is a broken line here and there, never one even lip.
	float chipped = edge * step( 0.0, bend ) * smoothstep( 0.35, 0.6, bite ) * smoothstep( 0.45, 0.7, sNoise3( p / 7.0 + 3.3 ) );
	float fromEdge = 1e3;
	#ifdef STONE_EDGE
		fromEdge = vStoneEdge;
		float band = ${f(STONE.edge.thin)} + ${f(STONE.edge.wide - STONE.edge.thin)} * pow( sNoise3( p / 9.0 + 2.0 ), 2.0 );
		float there = smoothstep( ${f(STONE.edge.missing)} - 0.05, ${f(STONE.edge.missing)} + 0.05, sNoise3( p / 23.0 + 7.0 ) );
		chipped = max( edge * step( 0.0, bend ) * 0.3, ( 1.0 - smoothstep( 0.6 * band, band, fromEdge ) ) * smoothstep( 0.32, 0.55, bite ) * there );
	#endif

	// The grooves: a few narrow breaks cut along the beds, each a dash on one of the lines grooves lie on, its length
	// set by that line. A groove steps at every fold (the line moves with the face) and fades at an edge, so it never
	// runs over one. None near the core.
	float rag = 0.8 * ( sNoise3( p / 4.5 + 1.3 ) - 0.5 ) + 0.25 * ( sNoise3( p / 1.4 + 6.1 ) - 0.5 );
	float ku = ( bed + rag + 9.0 * sNoise1( bed / 17.0 + bAxis * 41.0 ) ) / ${f(STONE.groove.apart)} + face * 0.73;
	float ki = floor( ku + 0.5 ), kd = ( ku - ki ) * ${f(STONE.groove.apart)};
	float kh = sHash1( ki * 1.13 + id * 31.0 );
	float kLong = mix( ${f(STONE.groove.short)}, ${f(STONE.groove.long)}, kh * kh );
	float dash = sNoise3( p / kLong + vec3( ki * 3.7, ki * 1.9, id * 13.0 ) );
	float many = smoothstep( 0.3, 0.7, sNoise3( p / 60.0 + bOff + 9.0 ) + 0.35 * ( bMany - 0.5 ) ) * smoothstep( ${f(STONE.groove.clear)}, ${f(STONE.groove.clear * 1.35)}, dC );
	float kAmt = clamp( ( dash - ${f(STONE.groove.few)} ) / ( 1.0 - ${f(STONE.groove.few)} ), 0.0, 1.0 ) * step( 1.0 - ${f(STONE.groove.lines)}, sHash1( ki * 2.71 + id * 7.0 ) ) * many;
	kAmt *= smoothstep( 0.5, 2.0, fromEdge ) * ( 1.0 - edge );
	float kW = ${f(STONE.groove.wide)} * sqrt( kAmt ) * ( 0.4 + 0.6 * fract( kh * 13.1 ) );
	float kAA = max( 0.7 * bw, 0.08 );
	float kIn = ( 1.0 - smoothstep( kW - kAA, kW, abs( kd ) ) ) * smoothstep( 1.0 * pix, 2.0 * pix, kW ) * sideK;
	// Across the groove, from its side away from the core (-1) to its side toward it (1): the far wall faces the core
	// and is lit, the floor and the near wall are in the near lip's shadow.
	float kx = clamp( kd * coreSide / max( kW, 1e-3 ), -1.0, 1.0 );
	float kFloor = kIn * smoothstep( -0.6, -0.2, kx );
	float kLip = ( 1.0 - smoothstep( 0.0, max( 0.35 * kW, kAA ), abs( kd * coreSide + kW + 0.2 * kW ) ) ) * smoothstep( 0.6, 1.2, kW / max( pix, 1e-3 ) ) * sideK * step( 0.05, kAmt );
	float kDer = kIn * kx * 1.6;

	// Hairline cracks: joints that cross the beds, as a sandstone splits. A few, wandering a little, each a dash that
	// tapers out at both ends, so they never close into a net.
	vec3 jDir = normalize( cross( across, vec3( cos( sa * 3.0 ), 0.2, sin( sa * 3.0 ) ) ) + vec3( 1e-4 ) );
	float ju = ( dot( p, jDir ) + 5.0 * ( sNoise3( p / 19.0 + 3.0 ) - 0.5 ) + 1.5 * ( st3 - 0.5 ) ) / ${f(STONE.joint.apart)};
	float ji = floor( ju + 0.5 ), jd = abs( ju - ji ) * ${f(STONE.joint.apart)}, jw = max( fwidth( ju ) * ${f(STONE.joint.apart)}, 1e-4 );
	float jAmt = clamp( ( sNoise3( p / ${f(STONE.joint.long)} + vec3( ji * 5.3, bOff.x * 3.0, ji * 2.1 ) ) - 0.6 ) / 0.3, 0.0, 1.0 );
	float jW = ${f(STONE.joint.wide)} * jAmt;
	float crack = ( 1.0 - smoothstep( 0.4 * max( jW, jw ), max( jW, jw ), jd ) ) * min( 1.0, jW / jw ) * smoothstep( 0.1, 0.35, facing ) * step( 0.02, jAmt );

	// The erosion pockets, in the beds' own frame, more of them where the place is shut in, in patches, and near an
	// edge when the mesh says where one is.
	vec3 t1 = normalize( cross( across, abs( across.x ) < 0.9 ? vec3( 1.0, 0.0, 0.0 ) : vec3( 0.0, 0.0, 1.0 ) ) );
	mat3 B = mat3( t1, across, cross( t1, across ) );
	vec3 warp = vec3( st1, sNoise3( p / 23.0 + 5.5 ), st2 ) - 0.5;
	float wetter = min( 1.8, mix( 0.8, 1.3, 1.0 - open ) * mix( 0.2, 1.5, smoothstep( 0.3, 0.7, sNoise3( p / 70.0 + bOff * 2.3 + 1.0 ) ) ) * mix( 1.0, 1.4, 1.0 - smoothstep( 3.0, 12.0, fromEdge ) ) );
	float pRag = ( st3 - 0.5 ) * 1.2 + ( tNear.x - 0.5 ) * 0.15;
	vec4 pk = vec4( 0.0 );
	vec3 pkGrad = vec3( 0.0 ), pkOff = vec3( 0.0 );
	${STONE.pocket.map((k, i) => `sPocket( p + warp * ${f(k.cell * k.long[0] * 0.3)}, B, ${f(k.cell)}, vec2( ${f(k.long[0])}, ${f(k.long[1])} ), ${f(k.squash)}, ${f(k.chance)} * wetter, vec2( ${f(k.r[0])}, ${f(k.r[1])} ), ${f(k.deep)}, ${f(3.1 + 14.3 * i)}, pRag, pix, pk, pkGrad, pkOff );`).join('\n\t')}
	float pDepth = pk.x, pShows = pk.w * edgeOn * ( 1.0 - edge ) * ( 1.0 - 0.75 * smoothstep( 0.4, 0.8, n.y ) ) * ( 1.0 - 0.6 * dark );
	float pShape = pDepth > 0.0 ? 1.0 - pow( pk.y, 4.0 ) : 0.0;
	// Where the pocket lies in the shadow of its own rim toward the core: its depth against how far the rim is that
	// way, and how steeply the core's light comes down onto the face.
	vec3 offT = pkOff - n * dot( pkOff, n );
	float pu = dot( offT, lT ), pReach = length( offT ) / max( pk.y, 0.05 );
	float rise = cf / sqrt( max( 1.0 - cf * cf, 1e-3 ) );
	float pShade = pDepth > 0.0 ? smoothstep( -0.25, 0.25, pDepth - ( pReach - pu ) * max( rise, 0.0 ) ) * smoothstep( 0.0, 0.25, pShape ) : 0.0;
	float pLip = pDepth > 0.0 ? smoothstep( 0.82, 0.96, pk.y ) * smoothstep( 0.3, -0.6, pu / max( pReach, 1e-3 ) ) : 0.0;

	// Dust lies on what faces up, thickest where it is sheltered.
	float up = smoothstep( 0.35, 0.75, n.y );
	float dust = up * smoothstep( 0.2, 0.55, 0.3 + 0.45 * ( 1.0 - open ) + 0.3 * ( st1 - 0.5 ) ) * ( 1.0 - pShape );

	// The rolled relief of a broken face: soft swells and hollows ten to thirty units across, steeper on a rough block.
	vec4 r1 = sNoiseD( p / ${f(STONE.roll.wide[0])} + bOff * 5.7 ), r2 = sNoiseD( p / ${f(STONE.roll.wide[1])} + 31.0 );
	float roughSlab = 0.6 + 0.8 * bRough;
	vec3 roll = ( r1.xyz * ${f(STONE.roll.deep[0] / STONE.roll.wide[0])} + r2.xyz * ${f(STONE.roll.deep[1] / STONE.roll.wide[1])} ) * roughSlab;
	// The normal.
	vec3 tilt = ${f(STONE.grain.tilt)} * edgeOn * ( gNear * mix( 1.0, 1.6, dust ) + ${f(STONE.grain.wear)} * gWide * ( 1.0 - 0.6 * dust ) );
	tilt += roll * edgeOn * ( 1.0 - 0.5 * dust );
	tilt += acrossT * ( sDer * stratK * ( 1.0 - 0.8 * dust ) + kDer );
	vec3 pTilt = pkGrad - n * dot( pkGrad, n );
	float pTl = length( pTilt );
	tilt += pTilt * ( min( pTl, 2.5 ) / max( pTl, 1e-4 ) ) * pShows;
	tilt -= n * dot( tilt, n );
	sNormal = normalize( n + tilt );

	// The color: the broad bands of the beds, then the stains, the layers, the grain, the marks, the edges, the dust.
	vec3 c = ${v3(STONE.own)};
	float b1 = sNoise1( bed / ${f(STONE.bed.bands[0])} ), b2 = sNoise1( bed / ${f(STONE.bed.bands[1])} + 7.3 ), b3 = sNoise1( bed / ${f(STONE.bed.bands[2])} + 3.7 );
	float bandK = 1.0 - smoothstep( 0.3, 1.0, bw / 8.0 );
	c = mix( c, ${v3(STONE.pale)}, 0.6 * smoothstep( 0.4, 0.9, b1 ) * bandK );
	c = mix( c, ${v3(STONE.red)}, 0.5 * smoothstep( 0.5, 0.9, b2 ) * bandK );
	c = mix( c, ${v3(STONE.dark)}, 0.55 * smoothstep( 0.5, 0.95, b3 ) * bandK );
	c *= 0.88 + 0.24 * bTone;
	vec2 mot = mix( vec2( ${f(STONE.mottle.lit[0])}, ${f(STONE.mottle.lit[1])} ), vec2( ${f(STONE.mottle.dark[0])}, ${f(STONE.mottle.dark[1])} ), dark );
	c *= mix( mot.x, mot.y, smoothstep( 0.2, 0.8, stain ) );
	c *= 1.0 + 0.16 * layerTone * stratK;
	float hotK = ${f(STONE.hot.most)} * seen * smoothstep( 0.05, 0.45, cf ) * ( 1.0 - smoothstep( ${f(STONE.hot.full)}, ${f(STONE.hot.from)}, dC ) );
	c = mix( c, ${v3(STONE.hot.color)}, hotK );
	// A face the core lights full on is a little paler and yellower: its proud grains are dry and catch the light.
	c = mix( c, ${v3(STONE.pale)}, ${f(STONE.lit)} * seen * smoothstep( 0.15, 0.6, cf ) * smoothstep( 0.2, 0.8, sNoise3( p / 57.0 + bOff * 2.9 + 3.3 ) ) );
	float gAmp = mix( ${f(STONE.mottle.grain[0])}, ${f(STONE.mottle.grain[1])}, dark );
	c *= ( 1.0 + gAmp * ( tNear.x - 0.5 ) * 2.0 ) * mix( 1.0 - gAmp * 1.5, 1.0, tNear.y ) * mix( 0.9, 1.0, tWide.y );
	// Where light does not reach the stone goes redder and deeper: creases, shut in places, faces turned from the
	// core, a pocket's floor, a groove's floor.
	vec3 rust = vec3( ${f(STONE.rust[0])}, ${f(STONE.rust[1])}, ${f(STONE.rust[2])} );
	float away = smoothstep( 0.0, -0.5, cf );
	float rustK = clamp( 0.3 * ( 1.0 - open ) + 0.25 * ( 1.0 - seen ) + 0.45 * crease + 0.5 * away + 0.9 * pShape * pShows + 0.8 * kIn, 0.0, 1.0 );
	c *= mix( vec3( 1.0 ), rust, rustK ) * mix( 1.0, ${f(STONE.away)}, away );
	c *= 1.0 - 0.68 * pShade * pShows - 0.3 * pShape * pShows;
	c = mix( c, ${v3(STONE.chip)}, 0.45 * pLip * pShows );
	c *= 1.0 - 0.8 * kFloor;
	c = mix( c, ${v3(STONE.chip)}, 0.55 * kLip * ( 1.0 - kIn ) );
	c *= 1.0 - 0.45 * crease - 0.75 * crack;
	c = mix( c, ${v3(STONE.chip)} * ( 0.88 + 0.24 * tNear.x ), 0.55 * chipped );
	c *= mix( 0.75, 1.0, smoothstep( 0.05, 0.45, open ) );
	c = mix( c, ${v3(STONE.dust)} * ( 0.88 + 0.24 * tNear.x ) * mix( 0.82, 1.0, tNear.y ), 0.75 * dust );
	float chroma = mix( ${f(STONE.chroma)}, ${f(STONE.hot.chroma)}, hotK / ${f(STONE.hot.most)} );
	sAlbedo = mix( vec3( dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) ), c, chroma );
	sRough = mix( ${f(STONE.rough[0])}, ${f(STONE.rough[1])}, max( max( kIn, pShape * pShows ), chipped ) );
	sRough = mix( sRough, ${f(STONE.rough[2])}, dust );
	sCatch = chipped * dark;
	diffuseColor.rgb = sAlbedo;
}`;

// The page's stream as a light on the stone: a line from the core's foot straight down as far as its leading end has
// run (uStream.y), as strong as the stream is there (uStream.x), warm, gone within STREAM.reach. Nothing further down
// than the leading end is lit. And a chipped edge in the dark catches a line of the light that has bounced.
const STREAM_LIGHT = /* glsl */ `
{
	vec3 p = vStoneP;
	float below = ${f(SOURCE[1])} - p.y;
	float t = clamp( below, 0.0, uStream.y );
	vec3 q = vec3( ${f(SOURCE[0])}, ${f(SOURCE[1])} - t, ${f(SOURCE[2])} ) - p;
	float d = max( length( q ), 1e-3 ), k = clamp( 1.0 - d / ${f(STREAM.reach)}, 0.0, 1.0 );
	float c = dot( sNormal, q / d );
	float fall = k * k / ( 1.0 + ( d / ${f(STREAM.near)} ) * ( d / ${f(STREAM.near)} ) ) * ( 1.0 - smoothstep( uStream.y - 12.0, uStream.y, below ) );
	reflectedLight.directDiffuse += ${v3(STREAM.color)} * ( ${f(STREAM.power)} * uStreamPower * uStream.x * fall * clamp( ( c + 0.3 ) / 1.3, 0.0, 1.0 ) ) * BRDF_Lambert( material.diffuseContribution );
	#ifdef WORLD_BAKED
		reflectedLight.indirectDiffuse += wBounce * ( ${f(STONE.catch)} * sCatch ) * BRDF_Lambert( material.diffuseContribution );
	#endif
}`;

type Shader = THREE.WebGLProgramParametersWithUniforms;
const after = (src: string, chunk: string, add: string): string => {
  if (!src.includes(`#include <${chunk}>`)) throw new Error(`stone: the shader has no ${chunk}`);
  return src.replace(`#include <${chunk}>`, `#include <${chunk}>\n${add}`);
};

// Lays the stone into a standard shader's fragment stage, and the vertex stage too unless the part sets vStoneP and
// vStoneN itself (own: true).
export function stoneShader(sh: Shader, maps: StoneMaps, own = false): void {
  Object.assign(sh.uniforms, { uStoneGrain: { value: maps.grain }, uStreamPower: { value: 1 } });
  if (!own) sh.vertexShader = after(after(sh.vertexShader, 'common', STONE_VERT_PARS), 'begin_vertex', VERT);
  let fr = after(sh.fragmentShader, 'common', FRAG_PARS);
  fr = after(fr, 'color_fragment', STONE_FRAG);
  fr = after(fr, 'roughnessmap_fragment', 'roughnessFactor = sRough;');
  fr = after(fr, 'normal_fragment_maps', 'normal = normalize( ( viewMatrix * vec4( sNormal, 0.0 ) ).xyz );');
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
  // 'aBounce.w * 8.0'), in units: the chipped band along an edge is then a real width.
  edge?: string;
}
// A standard material of the stone, joined to the world's light.
export function stoneMaterial(maps: StoneMaps, o: StoneOptions): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: STONE.rough[0], metalness: 0 });
  m.defines = { ...m.defines, ...(o.spare === 'slab' ? { STONE_SLAB: '' } : {}), ...(o.edge ? { STONE_EDGE: '', STONE_EDGE_FROM: o.edge } : {}) };
  m.onBeforeCompile = (sh) => stoneShader(sh, maps);
  return lit(m, { key: `stone-${o.key}${o.spare ? '-slab' : ''}${o.edge ? '-edge' : ''}`, baked: o.baked });
}
