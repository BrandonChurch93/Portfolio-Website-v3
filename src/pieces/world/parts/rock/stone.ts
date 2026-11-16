import * as THREE from 'three';
import { CORE, SCALE, SOURCE } from '../../layout';
import { color, lit, stone } from '../../light';

// The planet's stone: what the torn rock is made of, and what every piece that broke away is made of. A sandstone
// whose color comes from the light on it. Each slab has its own beds, tilted as the slab lies: broad bands of paler,
// redder and darker stone, thin strata that stand proud or are cut back where a slab's side crosses them, and a few
// long ragged dark strokes along them with a lip on the side toward the core. Large stains and a mottle through
// it, a few wandering hairline cracks, fine grains and pits close up, a ragged chipped band along its edges, dark in
// its creases, and dust and grit on what faces up.
//
// What has a direction (the beds, the strata, the strokes, the cracks) is worked out in three dimensions from the
// place, so it lies on every face as the stone would and can never be stretched across one seen edge on. The one
// map (scripts/world/parts/rock-material/make.mjs, public/world/rockmat-grain.png) is the grain, which is the same in
// every direction, laid from the three axes.
//
//   const maps = await stoneMaps(renderer)                        once, shared by every user, released with maps.release()
//   const m = stoneMaterial(maps, { key: 'rock', baked, spare })  a standard material joined to the world's light
//
// The page's stream lights the stone near it, as the frame says (uStream in ../../light.ts).
//
// A part that moves its own vertices (as what broke away does) lays the stone in itself: STONE_VERT_PARS, then sets
// vStoneP (the place, in units) and vStoneN (the normal, in the same frame) in its vertex shader, and
// stoneShader(sh, maps, true) does the rest of the fragment shader. Setting the uniform uStreamPower to 0 takes the
// stream's light off, for a part that lights itself from the stream.

const mix = (a: THREE.Color, b: THREE.Color, k: number): THREE.Color => a.clone().lerp(b, k);
const own = stone();
export const STONE = {
  own,
  // The beds' colors, each a stone of the same kind: paler and yellower, redder, darker and browner.
  pale: mix(own, color('text-3'), 0.45).multiplyScalar(1.12),
  red: mix(own, color('copper'), 0.25).multiplyScalar(0.9),
  dark: mix(own, color('text-3'), 0.2).multiplyScalar(0.6),
  // A chipped edge is fresh stone, paler. Dust is paler and flatter still.
  chip: mix(own, color('text-3'), 0.5).multiplyScalar(1.2),
  dust: mix(own, color('text-3'), 0.55).multiplyScalar(1.12),
  // Stone nearest the core is paler, so that the core's light takes it toward pale gold and it still reads as stone:
  // its color, and from how far from the core's middle it begins and where it is full, in units.
  hot: { color: mix(own, color('text-2'), 0.6), from: CORE.r * 2.4, full: CORE.r * 1.2, most: 0.5 },
  // The rolled relief of a broken face: how wide its swells are, in units, and how high.
  roll: { wide: [24, 8.5], deep: [5, 1.4] },
  // How much of its color the stone keeps against its own grey: the picture's lit stone is a red brown, which the
  // core's warm light makes of a stone a little less red than the baker's.
  chroma: 0.72,
  // How rough a clean face, a stroke's floor, the dust.
  rough: [0.88, 0.95, 0.98] as const,
  // The beds: the bowl they lie in, dipping toward the core's axis, how far each slab turns them, in radians, and
  // how thick the broad bands of tone are, in units.
  bed: { bowl: 0.0018, lean: 0.12, turn: 0.75, bands: [41, 17, 83] as const },
  // The strata: how thick a layer is on average, in units, how far one stands proud of the next, and a finer set.
  strata: { thick: 3.2, step: 0.6 },
  // The strokes along the beds: how far apart the lines they lie on are, how wide the widest is, and the shortest
  // and longest a dash of one runs, all in units. `few` is how much of a line is clean.
  stroke: { apart: 6, wide: 4.5, short: 4, long: 50, few: 0.52 },
  // The joints, hairline cracks across the beds: how far apart, how wide at most, and how long a dash of one is.
  joint: { apart: 41, wide: 0.55, long: 26 },
  // The grain map: the units a tile covers, which the script that writes it holds too, and how strongly the grain
  // and the wider wear tilt the surface.
  grain: { period: 48, tilt: 0.55, wear: 1.8 },
} as const;

// The stream's light on the stone: a line from the core's foot straight down, as far as the page's stream has run,
// warm, gone within `reach` units. near is how fast it falls, and power how strong it is where it is full.
export const STREAM = { reach: 170, near: 45, power: 70, color: mix(color('flame'), color('hot'), 0.35) } as const;

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
}`;

// Works out the stone at this place. In a part's fragment shader it goes after <color_fragment>.
const STONE_FRAG = /* glsl */ `
{
	vec3 p = vStoneP, n = vStoneN / max( length( vStoneN ), 1e-6 );
	float facing = abs( dot( normalize( vNormal + vec3( 1e-6 ) ), normalize( vViewPosition + vec3( 1e-6 ) ) ) );
	// A number of this slab's own, steady over it: each slab is a block that was turned when it broke, so its beds lie
	// at their own angle.
	float slab = 0.5;
	#if defined( WORLD_BAKED ) && defined( STONE_SLAB )
		slab = wLight.w;
	#endif
	float open = 1.0, seen = 1.0;
	#ifdef WORLD_BAKED
		open = wLight.z;
		seen = wLight.x;
	#endif
	// The beds: across them is a bowl dipping toward the core's axis, turned by the slab's own angle.
	vec3 across = normalize( vec3( ${f(STONE.bed.bowl)} * p.x, 1.0, ${f(STONE.bed.lean)} ) );
	float sa = slab * 6.2832;
	across = sTurn( across, normalize( vec3( cos( sa ), 0.35 * sin( 3.0 * sa ), sin( sa ) ) ), ${f(STONE.bed.turn)} * ( fract( slab * 7.31 ) - 0.5 ) * 2.0 );
	float bed = dot( p, across ) + slab * 997.0 + 5.0 * ( sNoise3( p / 47.0 ) - 0.5 ) + 1.6 * ( sNoise3( p / 13.0 + 4.1 ) - 0.5 );
	float bw = max( fwidth( bed ), 1e-4 );
	// Across the beds within this face, and how much the face cuts across them (a slab's side) rather than lying in
	// one (its broad top or underside).
	vec3 acrossT = across - n * dot( across, n );
	float side = length( acrossT );
	acrossT = side > 1e-4 ? acrossT / side : vec3( 0.0 );
	float sideK = smoothstep( 0.35, 0.7, side );
	vec3 toCoreT = ${C} - p;
	toCoreT -= n * dot( toCoreT, n );
	float coreSide = dot( acrossT, toCoreT ) >= 0.0 ? 1.0 : -1.0;

	// The grain, near and wider, from the three axes. A face seen nearly edge on keeps only what its grain does to
	// its tone.
	vec3 w = pow( abs( n ), vec3( 4.0 ) );
	w /= max( w.x + w.y + w.z, 1e-5 );
	vec3 gNear, gWide;
	vec2 tNear, tWide;
	sGrain( p, w, ${f(1 / STONE.grain.period)}, 0.0, gNear, tNear );
	sGrain( p * 0.2327 + 17.0, w, ${f(1 / STONE.grain.period)}, 3.0, gWide, tWide );
	float edgeOn = smoothstep( 0.06, 0.28, facing );

	// Stains and mottle: large, uneven patches of darker and paler stone inside a face.
	float st1 = sNoise3( p / 31.0 + slab * 11.0 ), st2 = sNoise3( p / 11.0 + 2.7 ), st3 = sNoise3( p / 4.3 + 8.1 );
	float stain = st1 * 0.55 + st2 * 0.3 + st3 * 0.15;

	// The strata: layers about strata.thick units thick, of uneven thickness, each standing proud of or cut back from
	// the next by up to strata.step. They show where a face crosses them and fade where a pixel covers a layer.
	float su = ( bed + 7.0 * sNoise1( bed / 13.0 ) + 2.5 * sNoise1( bed / 4.1 + 3.0 ) ) / ${f(STONE.strata.thick)};
	float si = floor( su ), sf = fract( su );
	float hs0 = sHash1( si + 0.37 ), hs1 = sHash1( si + 1.37 );
	float h0 = hs0 * step( 0.7, sHash1( si * 1.7 + 5.0 ) ), h1 = hs1 * step( 0.7, sHash1( ( si + 1.0 ) * 1.7 + 5.0 ) ), sEase = smoothstep( 0.7, 1.0, sf );
	float stratK = sideK * smoothstep( 0.3, 0.6, sNoise3( p / 36.0 + slab * 5.0 ) ) * ( 1.0 - smoothstep( 0.15, 0.4, bw / ${f(STONE.strata.thick)} ) );
	float sDer = ( h1 - h0 ) * 6.0 * sEase * ( 1.0 - sEase ) / ( 0.3 * ${f(STONE.strata.thick)} ) * ${f(STONE.strata.step)};
	float layerTone = mix( hs0, hs1, sEase ) - 0.5;

	// The strokes: a few long ragged dark breaks along the beds, each a dash on one of the lines strokes lie on, its
	// length set by that line, tapering to nothing at both ends, most of each face clean. Where a stroke is deep its
	// side toward the core is a lit lip of fresh stone.
	float rag = 2.2 * ( sNoise3( p / 4.5 + 1.3 ) - 0.5 ) + 0.6 * ( sNoise3( p / 1.4 + 6.1 ) - 0.5 );
	float ku = ( bed + rag ) / ${f(STONE.stroke.apart)};
	float ki = floor( ku + 0.5 ), kd = ( ku - ki ) * ${f(STONE.stroke.apart)};
	float kh = sHash1( ki * 1.13 + slab * 31.0 );
	float kLong = mix( ${f(STONE.stroke.short)}, ${f(STONE.stroke.long)}, kh * kh );
	float dash = sNoise3( p / kLong + vec3( ki * 3.7, ki * 1.9, slab * 13.0 ) );
	float many = smoothstep( 0.25, 0.7, sNoise3( p / 60.0 + slab * 3.0 + 9.0 ) + 0.35 * ( fract( slab * 3.77 ) - 0.5 ) );
	#ifdef STONE_EDGE
		many = max( many, 0.9 * ( 1.0 - smoothstep( 4.0, 16.0, vStoneEdge ) ) );
	#endif
	float kThr = mix( ${f(STONE.stroke.few)}, 0.45, many );
	float kAmt = clamp( ( dash - kThr ) / ( 1.0 - kThr ), 0.0, 1.0 ) * step( 0.25, many + 0.2 * kh );
	float kW = min( ${f(STONE.stroke.wide)} * kAmt * ( 0.35 + 0.65 * fract( kh * 13.1 ) ), 0.06 * kLong * ( 0.3 + kAmt ) );
	float kWv = max( kW, bw );
	float kIn = ( 1.0 - smoothstep( 0.55 * kWv, kWv, abs( kd ) ) ) * min( 1.0, kW / kWv ) * sideK * smoothstep( 0.2, 0.6, kW );
	float kDer = kIn * clamp( -kd / max( kWv * 0.5, 1e-3 ), -1.0, 1.0 ) * 1.4;
	float kLipD = kd - coreSide * ( kWv + 0.5 * max( kWv, 0.6 ) );
	float kLip = ( 1.0 - smoothstep( 0.2, 0.55 * max( kWv, 0.6 ), abs( kLipD ) ) ) * smoothstep( 0.6, 1.4, kW ) * sideK;

	// Hairline cracks: joints that cross the beds, as a sandstone splits. A few, wandering a little, each a dash that
	// tapers out at both ends, so they never close into a net.
	vec3 jDir = normalize( cross( across, vec3( cos( sa * 3.0 ), 0.2, sin( sa * 3.0 ) ) ) + vec3( 1e-4 ) );
	float ju = ( dot( p, jDir ) + 5.0 * ( sNoise3( p / 19.0 + 3.0 ) - 0.5 ) + 1.0 * ( sNoise3( p / 4.0 + 1.0 ) - 0.5 ) ) / ${f(STONE.joint.apart)};
	float ji = floor( ju + 0.5 ), jd = abs( ju - ji ) * ${f(STONE.joint.apart)}, jw = max( fwidth( ju ) * ${f(STONE.joint.apart)}, 1e-4 );
	float jAmt = clamp( ( sNoise3( p / ${f(STONE.joint.long)} + vec3( ji * 5.3, slab * 9.0, ji * 2.1 ) ) - 0.6 ) / 0.3, 0.0, 1.0 );
	float jW = ${f(STONE.joint.wide)} * jAmt;
	float crack = ( 1.0 - smoothstep( 0.4 * max( jW, jw ), max( jW, jw ), jd ) ) * min( 1.0, jW / jw ) * smoothstep( 0.1, 0.35, facing ) * step( 0.02, jAmt );

	// Edges and creases, from how the surface turns between pixels, and from how far the place is from its face's
	// outline when the mesh says.
	vec3 dnx = dFdx( n ), dny = dFdy( n ), dpx = dFdx( p ), dpy = dFdy( p );
	float turn = length( dnx ) + length( dny ), bend = dot( dnx, dpx ) + dot( dny, dpy );
	float bite = sNoise3( p / 2.2 + 5.0 ) * 0.7 + sNoise3( p / 0.7 ) * 0.3;
	float edge = smoothstep( 0.15, 0.6, turn );
	float chipped = edge * step( 0.0, bend ) * smoothstep( 0.35, 0.6, bite ), crease = edge * step( bend, 0.0 );
	#ifdef STONE_EDGE
		float band = 1.0 + 3.0 * sNoise3( p / 9.0 + 2.0 );
		chipped = max( chipped, ( 1.0 - smoothstep( 0.6 * band, band, vStoneEdge ) ) * smoothstep( 0.32, 0.55, bite ) );
	#endif

	// Dust lies on what faces up, thickest where it is sheltered.
	float up = smoothstep( 0.4, 0.8, n.y );
	float dust = up * smoothstep( 0.3, 0.65, sNoise3( p / 19.0 ) * 0.6 + 0.45 * ( 1.0 - open ) + 0.15 + 0.3 * st3 );

	// The rolled relief of a broken face: soft swells and hollows ten to thirty units across, steeper on a rough slab.
	vec4 r1 = sNoiseD( p / ${f(STONE.roll.wide[0])} + slab * 17.0 ), r2 = sNoiseD( p / ${f(STONE.roll.wide[1])} + 31.0 );
	float roughSlab = 0.6 + 0.8 * fract( slab * 9.73 );
	vec3 roll = ( r1.xyz * ${f(STONE.roll.deep[0] / STONE.roll.wide[0])} + r2.xyz * ${f(STONE.roll.deep[1] / STONE.roll.wide[1])} ) * roughSlab;
	// The normal.
	vec3 tilt = ${f(STONE.grain.tilt)} * edgeOn * ( gNear * mix( 1.0, 1.8, dust ) + ${f(STONE.grain.wear)} * gWide * ( 1.0 - 0.6 * dust ) );
	tilt += roll * edgeOn * ( 1.0 - 0.5 * dust );
	tilt += acrossT * ( sDer * stratK * ( 1.0 - 0.8 * dust ) + kDer * ( 1.0 - dust ) );
	tilt -= n * dot( tilt, n );
	sNormal = normalize( n + tilt );

	// The color: the broad bands of the beds, then the stains, the layers, the grain, the marks, the edges, the dust.
	vec3 c = ${v3(STONE.own)};
	float b1 = sNoise1( bed / ${f(STONE.bed.bands[0])} ), b2 = sNoise1( bed / ${f(STONE.bed.bands[1])} + 7.3 ), b3 = sNoise1( bed / ${f(STONE.bed.bands[2])} + 3.7 );
	float bandK = 1.0 - smoothstep( 0.3, 1.0, bw / 8.0 );
	c = mix( c, ${v3(STONE.pale)}, 0.6 * smoothstep( 0.5, 0.95, b1 ) * bandK );
	c = mix( c, ${v3(STONE.red)}, 0.4 * smoothstep( 0.5, 0.9, b2 ) * bandK );
	c = mix( c, ${v3(STONE.dark)}, 0.55 * smoothstep( 0.5, 0.95, b3 ) * bandK );
	c *= 0.86 + 0.28 * fract( slab * 5.13 );
	c *= mix( 0.4, 1.5, smoothstep( 0.25, 0.75, stain ) );
	c = mix( c, ${v3(STONE.dark)} * 0.75, 0.45 * smoothstep( 0.62, 0.85, st2 * 0.6 + st1 * 0.4 ) );
	c *= 1.0 + 0.32 * layerTone * stratK;
	c = mix( c, ${v3(STONE.hot.color)}, ${f(STONE.hot.most)} * seen * ( 1.0 - smoothstep( ${f(STONE.hot.full)}, ${f(STONE.hot.from)}, distance( p, ${C} ) ) ) );
	c *= ( 0.8 + 0.4 * tNear.x ) * mix( 0.6, 1.0, tNear.y ) * mix( 0.85, 1.0, tWide.y );
	c *= 1.0 - 0.85 * kIn;
	c = mix( c, ${v3(STONE.chip)}, 0.8 * kLip * ( 1.0 - kIn ) );
	c *= 1.0 - 0.75 * crease * 0.6 - 0.8 * crack;
	c = mix( c, ${v3(STONE.chip)} * ( 0.85 + 0.3 * tNear.x ), 0.5 * chipped );
	c *= mix( 0.72, 1.0, smoothstep( 0.05, 0.45, open ) );
	c = mix( c, ${v3(STONE.dust)} * ( 0.8 + 0.4 * tNear.x ) * mix( 0.7, 1.0, tNear.y ), 0.7 * dust );
	sAlbedo = mix( vec3( dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) ), c, ${f(STONE.chroma)} );
	sRough = mix( ${f(STONE.rough[0])}, ${f(STONE.rough[1])}, max( kIn, chipped ) );
	sRough = mix( sRough, ${f(STONE.rough[2])}, dust );
	diffuseColor.rgb = sAlbedo;
}`;

// The page's stream as a light on the stone: a line from the core's foot straight down as far as its leading end has
// run (uStream.y), as strong as the stream is there (uStream.x), warm, gone within STREAM.reach. Nothing further down
// than the leading end is lit.
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
