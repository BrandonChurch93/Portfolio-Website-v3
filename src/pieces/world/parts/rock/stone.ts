import * as THREE from 'three';
import { CORE, SCALE, SOURCE } from '../../layout';
import { color, lit, stone } from '../../light';

// The planet's stone: what the torn rock is made of, and what every piece that broke away is made of. One warm stone
// whose color comes from the light on it, with beds of paler, redder and darker stone through it, clean sheared faces
// marked in places by gouges along the beds and a few hairline cracks, its own grain and pits close up, chipped pale
// along its edges, dark and dusty in its creases, and dust on what faces up. Its maps are written by
// scripts/world/parts/rock-material/make.mjs (public/world/rockmat-*.png).
//
// A mesh has no texture coordinates. The maps are laid on each face from the face's own plane, their first axis along
// the beds where they cross it (`frame: 'face'`, for a mesh of flat faces, as the torn rock is), or from the three
// axes weighted by the normal (`frame: 'tri'`, for a smooth one). Each face is given its own shift and turn of the
// maps from its normal and its plane, which are steady across it, so no repeat can be seen.
//
//   const maps = await stoneMaps(renderer)            once, shared by every user, released with maps.release()
//   const m = stoneMaterial(maps, { key: 'rock' })    a standard material joined to the world's light
//   stream.set(power)                                 how strongly the stream's light lies on the stone
//
// A part that moves its own vertices (as what broke away does) lays the chunks in itself: STONE_VERT_PARS, then sets
// vStoneP (the place, in units) and vStoneN (the normal, in the same frame) in its vertex shader, and
// stoneShader(sh, maps, frame) does the rest of the fragment shader.

// The stone's colors, from the palette. Its own color is a warm mid stone, chosen so that the core's light makes
// it peach to deep orange tan, bounced light a deep warm brown and the moon a pale grey tan. Beds are paler,
// redder or darker than it. A chipped edge is fresher and paler, dust is paler and flatter.
const mix = (a: THREE.Color, b: THREE.Color, k: number): THREE.Color => a.clone().lerp(b, k);
export const STONE = {
  own: stone(),
  pale: mix(color('text-3'), color('text-2'), 0.3),
  red: mix(color('bronze'), color('copper'), 0.35).multiplyScalar(0.95),
  dark: mix(color('bronze-deep'), color('text-3'), 0.3),
  chip: mix(color('text-2'), color('copper-light'), 0.25),
  dust: mix(color('text-3'), color('text-2'), 0.45),
  // Stone nearest the core is paler, so that the core's light takes it toward pale gold and it still reads as stone:
  // its color, and from how far from the core's middle it begins and where it is full, in units.
  hot: { color: mix(color('text-2'), color('copper-light'), 0.2), from: CORE.r * 2.7, full: CORE.r * 1.25, most: 0.6 },
  // The grain's and the marks' slopes, how dark a gouge is at its floor, and how strongly an edge is chipped.
  look: [0.55, 0.9, 0.82, 0.85] as const,
  // How rough the clean face, a gouge, the dust.
  rough: [0.6, 0.86, 0.97] as const,
  // The beds: how far they dip toward the core's axis, as the bowl they lie in, and how thick the bands are.
  bed: { bowl: 0.0018, lean: 0.12, bands: [61, 29, 113] as const },
  // The maps: the units each tile covers. The script that writes them holds the same numbers.
  grain: 96,
  marks: 192,
} as const;

// The stream: its light lies on the stone round it, as a line from the core's foot straight down. How long the line
// is, how far its light reaches, in units, and its color. Its strength is set by whoever draws the stream.
export const STREAM = { long: 1500, reach: 150, near: 60, color: mix(color('hot'), color('flame'), 0.25), power: 40 } as const;
const streamUniforms = {
  uStreamFrom: { value: new THREE.Vector3(...SOURCE) },
  uStreamLong: { value: STREAM.long },
  uStreamReach: { value: STREAM.reach },
  uStreamNear: { value: STREAM.near },
  uStreamColor: { value: STREAM.color.clone() },
  uStreamPower: { value: STREAM.power as number },
};
export const stream = {
  set(power: number): void { streamUniforms.uStreamPower.value = power; },
  uniforms: streamUniforms,
};

export interface StoneMaps {
  grain: THREE.Texture;
  marks: THREE.Texture;
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
    const own = { users: 0, textures: [] as THREE.Texture[], maps: null as unknown as Promise<StoneMaps> };
    own.maps = Promise.all([tile('rockmat-grain.png', aniso), tile('rockmat-marks.png', aniso)]).then(([grain, marks]) => {
      own.textures = [grain, marks];
      return {
        grain, marks,
        release() {
          if (--own.users > 0) return;
          for (const t of own.textures) t.dispose();
          if (shared === own) shared = null;
        },
      };
    });
    shared = own;
  }
  shared.users++;
  return shared.maps;
}

const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);
const v3 = (c: THREE.Color): string => `vec3( ${f(+c.r.toFixed(4))}, ${f(+c.g.toFixed(4))}, ${f(+c.b.toFixed(4))} )`;

export const STONE_VERT_PARS = /* glsl */ `
varying vec3 vStoneP;
varying vec3 vStoneN;`;
// The place and normal in the world, in units, for a mesh drawn as it is.
const VERT = /* glsl */ `
{
	vec4 sW = modelMatrix * vec4( transformed, 1.0 );
	vStoneP = sW.xyz / ${f(SCALE)};
	vec3 sN = mat3( modelMatrix ) * objectNormal;
	vStoneN = sN / max( length( sN ), 1e-6 );
}`;

const FRAG_PARS = /* glsl */ `
varying vec3 vStoneP;
varying vec3 vStoneN;
uniform sampler2D uStoneGrain;
uniform sampler2D uStoneMarks;
uniform vec3 uStreamFrom;
uniform float uStreamLong;
uniform float uStreamReach;
uniform float uStreamNear;
uniform vec3 uStreamColor;
uniform float uStreamPower;
// What the stone works out once, before it is lit: its normal in the world, and its color and roughness.
vec3 sNormal;
vec3 sAlbedo;
float sRough;
float sHash3( vec3 p ) { p = fract( p * 0.1031 ); p += dot( p, p.zyx + 31.32 ); return fract( ( p.x + p.y ) * p.z ); }
float sNoise3( vec3 p ) {
	vec3 i = floor( p ), u = fract( p );
	u = u * u * ( 3.0 - 2.0 * u );
	return mix( mix( mix( sHash3( i ), sHash3( i + vec3( 1, 0, 0 ) ), u.x ), mix( sHash3( i + vec3( 0, 1, 0 ) ), sHash3( i + vec3( 1, 1, 0 ) ), u.x ), u.y ),
		mix( mix( sHash3( i + vec3( 0, 0, 1 ) ), sHash3( i + vec3( 1, 0, 1 ) ), u.x ), mix( sHash3( i + vec3( 0, 1, 1 ) ), sHash3( i + vec3( 1, 1, 1 ) ), u.x ), u.y ), u.z );
}
float sNoise1( float x ) { float i = floor( x ), u = fract( x ); u = u * u * ( 3.0 - 2.0 * u ); return mix( fract( sin( i * 127.1 ) * 43758.545 ), fract( sin( ( i + 1.0 ) * 127.1 ) * 43758.545 ), u ); }
// A slope stored as a normal's red and green, as the slope itself.
vec2 sSlope( vec4 t ) { vec2 xy = t.rg * 2.0 - 1.0; return xy / sqrt( max( 1.0 - dot( xy, xy ), 0.02 ) ); }
// The beds: a bowl that dips toward the core's axis, warped a little. Its value is how far up through the beds a
// place is, and its gradient is across them.
float sBed( vec3 p ) {
	float w = 14.0 * sin( p.x / 97.0 + 1.3 * sin( p.z / 131.0 ) ) + 9.0 * sin( p.z / 71.0 + p.x / 173.0 ) + 18.0 * ( sNoise3( p / 140.0 ) - 0.5 );
	return p.y + ${f(STONE.bed.bowl / 2)} * p.x * p.x + ${f(STONE.bed.lean)} * p.z + w;
}
vec3 sBedAcross( vec3 p ) { return normalize( vec3( ${f(STONE.bed.bowl)} * p.x, 1.0, ${f(STONE.bed.lean)} ) ); }`;

// Works out the stone at this place. In a part's fragment shader it goes after <color_fragment>.
const STONE_FRAG = /* glsl */ `
{
	vec3 p = vStoneP, n = vStoneN / max( length( vStoneN ), 1e-6 );
	// Edges and creases, from how the surface turns between pixels: a convex edge is chipped, a crease is dark.
	vec3 dnx = dFdx( n ), dny = dFdy( n ), dpx = dFdx( p ), dpy = dFdy( p );
	float turn = length( dnx ) + length( dny ), bend = dot( dnx, dpx ) + dot( dny, dpy );
	float edge = smoothstep( 0.12, 0.5, turn ), chipped = edge * step( 0.0, bend ), crease = edge * step( bend, 0.0 );
	float bed = sBed( p );
	vec2 gS, mS;
	vec4 g, m;
	vec3 U, V;
	#ifdef STONE_TRI
		vec3 w = abs( n );
		w = pow( w, vec3( 6.0 ) );
		w /= max( w.x + w.y + w.z, 1e-5 );
		vec4 gx = texture2D( uStoneGrain, p.zy / ${f(STONE.grain)} ), gy = texture2D( uStoneGrain, p.xz / ${f(STONE.grain)} + 0.31 ), gz = texture2D( uStoneGrain, p.xy / ${f(STONE.grain)} + 0.67 );
		vec4 mx = texture2D( uStoneMarks, p.zy / ${f(STONE.marks)} + 0.13 ), my = texture2D( uStoneMarks, p.xz / ${f(STONE.marks)} + 0.53 ), mz = texture2D( uStoneMarks, p.xy / ${f(STONE.marks)} + 0.89 );
		g = gx * w.x + gy * w.y + gz * w.z;
		m = mx * w.x + my * w.y + mz * w.z;
		vec3 sg = vec3( 0.0, sSlope( gx ).yx ) * w.x + vec3( sSlope( gy ).x, 0.0, sSlope( gy ).y ) * w.y + vec3( sSlope( gz ), 0.0 ) * w.z;
		vec3 sm = vec3( 0.0, sSlope( mx ).yx ) * w.x + vec3( sSlope( my ).x, 0.0, sSlope( my ).y ) * w.y + vec3( sSlope( mz ), 0.0 ) * w.z;
		U = vec3( 1.0, 0.0, 0.0 );
		V = vec3( 0.0, 1.0, 0.0 );
		float face = 0.5;
	#else
		// The maps' first axis runs along the beds where they cross this face, turned a little by the face's own
		// normal, and the maps are shifted by its normal and its plane: all steady across a flat face.
		vec3 across = sBedAcross( p );
		U = cross( n, across );
		float lu = length( U );
		U = lu > 1e-4 ? U / lu : normalize( cross( n, vec3( 0.6, 0.0, 0.8 ) ) + vec3( 1e-5 ) );
		float turnBy = 0.32 * sin( dot( n, vec3( 5.1, 7.3, 3.7 ) ) ) + 0.16 * sin( dot( n, vec3( 11.3, -6.1, 9.7 ) ) );
		V = cross( n, U );
		U = U * cos( turnBy ) + V * sin( turnBy );
		V = cross( n, U );
		float plane = dot( n, p );
		vec2 shift = vec2( dot( n, vec3( 173.1, 91.7, 131.3 ) ), dot( n, vec3( 67.9, 151.3, 97.1 ) ) ) + plane * vec2( 0.37, 0.61 );
		vec2 uv = ( vec2( dot( p, U ), dot( p, V ) ) + shift ) * ( 1.0 + 0.25 * sin( dot( n, vec3( 9.1, 13.3, 7.9 ) ) ) );
		g = texture2D( uStoneGrain, uv / ${f(STONE.grain)} );
		m = texture2D( uStoneMarks, uv / ${f(STONE.marks)} + vec2( 0.37, 0.71 ) );
		gS = sSlope( g );
		mS = sSlope( m );
		float face = 0.5 + 0.5 * sin( dot( n, vec3( 17.3, 23.9, 13.1 ) ) + plane * 0.013 );
	#endif
	// Marks lie in clusters on some faces and stay off others.
	float many = smoothstep( 0.32, 0.62, sNoise3( p / 70.0 + 3.1 ) * 0.75 + face * 0.4 );
	float up = smoothstep( 0.45, 0.85, n.y );
	float open = 1.0;
	#ifdef WORLD_BAKED
		open = wLight.z;
	#endif
	// Dust lies on what faces up, thickest where it is sheltered, and fills the fine relief.
	float dust = up * smoothstep( 0.25, 0.65, sNoise3( p / 23.0 ) * 0.7 + 0.45 * ( 1.0 - open ) + 0.2 );
	float markK = many * ( 1.0 - 0.7 * dust );
	// Some faces are clean sheared stone and some are rougher.
	float rough = mix( 0.45, 1.25, smoothstep( 0.2, 0.8, sNoise3( p / 90.0 + 7.7 ) * 0.6 + face * 0.5 ) ) * ( 1.0 - 0.6 * dust );
	#ifdef STONE_TRI
		vec3 tilt = ${f(STONE.look[0])} * rough * sg + ${f(STONE.look[1])} * markK * sm;
		tilt -= n * dot( tilt, n );
		sNormal = normalize( n + tilt );
	#else
		vec2 tilt = ${f(STONE.look[0])} * rough * gS + ${f(STONE.look[1])} * markK * mS;
		sNormal = normalize( n + tilt.x * U + tilt.y * V );
	#endif
	// The beds: broad bands of paler, redder and darker stone, and each face a little its own.
	vec3 c = ${v3(STONE.own)};
	float b1 = sNoise1( bed / ${f(STONE.bed.bands[0])} ), b2 = sNoise1( bed / ${f(STONE.bed.bands[1])} + 7.3 ), b3 = sNoise1( bed / ${f(STONE.bed.bands[2])} + 3.7 );
	c = mix( c, ${v3(STONE.pale)}, 0.55 * smoothstep( 0.45, 0.95, b1 ) );
	c = mix( c, ${v3(STONE.red)}, 0.5 * smoothstep( 0.4, 0.9, b2 ) );
	c *= 1.0 - 0.32 * smoothstep( 0.45, 0.95, b3 );
	c *= 0.88 + 0.24 * face;
	float seen = 1.0;
	#ifdef WORLD_BAKED
		seen = wLight.x;
	#endif
	c = mix( c, ${v3(STONE.hot.color)}, ${f(STONE.hot.most)} * seen * ( 1.0 - smoothstep( ${f(STONE.hot.full)}, ${f(STONE.hot.from)}, distance( p, vec3( ${f(CORE.at[0])}, ${f(CORE.at[1])}, ${f(CORE.at[2])} ) ) ) ) );
	// The grain's own tone, its pits, and what is shut in.
	c *= mix( 0.62, 1.0, g.a ) * ( 0.9 + 0.2 * g.b );
	// Gouges and cracks are dark inside, fresh stone at a lip.
	float deep = m.b * markK;
	c *= 1.0 - ${f(STONE.look[2])} * deep;
	c = mix( c, ${v3(STONE.chip)}, 0.4 * m.a * markK );
	// Chipped along convex edges, dark and dusty in creases and where little light can reach.
	c = mix( c, ${v3(STONE.chip)}, ${f(STONE.look[3])} * chipped );
	c *= 1.0 - 0.45 * crease;
	c *= mix( 0.7, 1.0, smoothstep( 0.05, 0.45, open ) );
	c = mix( c, ${v3(STONE.dust)} * ( 0.85 + 0.3 * g.b ), 0.6 * dust );
	sAlbedo = c;
	sRough = mix( ${f(STONE.rough[0])}, ${f(STONE.rough[1])}, max( deep, 0.6 * chipped ) );
	sRough = mix( sRough, ${f(STONE.rough[2])}, dust );
	diffuseColor.rgb = sAlbedo;
}`;

// The stream's light on the stone: a line from the core's foot straight down, warm, gone within uStreamReach.
const STREAM_LIGHT = /* glsl */ `
{
	vec3 p = vStoneP;
	float t = clamp( uStreamFrom.y - p.y, 0.0, uStreamLong );
	vec3 q = vec3( uStreamFrom.x, uStreamFrom.y - t, uStreamFrom.z ) - p;
	float d = max( length( q ), 1e-3 ), k = clamp( 1.0 - d / uStreamReach, 0.0, 1.0 );
	float c = dot( sNormal, q / d );
	float fall = k * k / ( 1.0 + ( d / uStreamNear ) * ( d / uStreamNear ) );
	reflectedLight.directDiffuse += uStreamColor * ( uStreamPower * fall * clamp( ( c + 0.25 ) / 1.25, 0.0, 1.0 ) ) * BRDF_Lambert( material.diffuseContribution );
}`;

type Shader = THREE.WebGLProgramParametersWithUniforms;
const after = (src: string, chunk: string, add: string): string => {
  if (!src.includes(`#include <${chunk}>`)) throw new Error(`stone: the shader has no ${chunk}`);
  return src.replace(`#include <${chunk}>`, `#include <${chunk}>\n${add}`);
};

// Lays the stone into a standard shader's fragment stage, and the vertex stage too unless the part sets vStoneP and
// vStoneN itself (own: true).
export function stoneShader(sh: Shader, maps: StoneMaps, own = false): void {
  Object.assign(sh.uniforms, { uStoneGrain: { value: maps.grain }, uStoneMarks: { value: maps.marks }, ...streamUniforms });
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
  // The mesh carries the world's stored light (./../../light.ts).
  baked?: boolean;
  // 'face' for a mesh of flat faces, 'tri' for a smooth one.
  frame?: 'face' | 'tri';
}
// A standard material of the stone, joined to the world's light.
export function stoneMaterial(maps: StoneMaps, o: StoneOptions): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: STONE.rough[0], metalness: 0 });
  if (o.frame === 'tri') m.defines = { ...m.defines, STONE_TRI: '' };
  m.onBeforeCompile = (sh) => stoneShader(sh, maps);
  return lit(m, { key: `stone-${o.frame ?? 'face'}-${o.key}`, baked: o.baked });
}
