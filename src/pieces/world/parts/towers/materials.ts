import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { MOONWARD, SCALE } from '../../layout';
import { METAL, WARM as KEPT, lit } from '../../light';
import { PALE_STONE, PLACE, STONES, WARM, WINDOW } from './windows';

const FOOT = PLACE.foot;

// The towers' three materials, which every design shares: pale stone laid in blocks, the bay (bronze, and the
// windows drawn in it, each a pane with a lit room behind it), and the world's gold. Their light is stored with
// the meshes (scripts/world/parts/towers/), so all three are lit by the baked bounce and openness as well.

const f = (v: number): string => v.toFixed(5);
const v3 = (c: readonly number[]): string => `vec3( ${f(c[0])}, ${f(c[1])}, ${f(c[2])} )`;
const lin3 = (c: THREE.Color): string => `vec3( ${f(c.r)}, ${f(c.g)}, ${f(c.b)} )`;
const lin = (name: Parameters<typeof hex>[0]): string => lin3(new THREE.Color(hex(name)));
// Deep gold, where gold mirrors little: the pyramid's own (its grade), so the world's gold is one gold.
const DEEP = 'vec3( 1.0, 0.43, 0.095 )';
// The stage's white balance (finish in src/world/tone.ts), which turns warm mid tones neutral: right for stone, and
// it took the color out of gold and of a lit room. Undone on those.
const BALANCE = 'vec3( 0.96, 1.21, 1.59 )';

// The stone: how tall a course is and how long a block, in units, and how wide a joint, for ashlar and for the
// base's channels; how much one block differs from the next, and how dark a joint is; how much of its warmth a
// pale stone, and a sandstone or a granite, keeps against the stage's white balance.
// How much of the night's soft light from the visitor's side a wall takes: the moon is behind the city, so its faces
// toward the visitor are a deep warm stone, drawn by the moon on their right edges and warmed by the windows.
// Each building lays its own courses: from course[0] to course[1] tall as ashlar (the base's channels from
// channel[0] to channel[1]), its blocks block[0] to block[1] courses long.
// keep: how much of its warmth a stone (the first) and a bronze cladding (the second) keep against the stage's
// white balance: a stone none, so a pale stone reads pale and near neutral, the city's warmth being its light.
const STONE = { course: [0.8, 1.9], channel: [1.2, 1.6], block: [1.7, 3.0], joint: [0.05, 0.16], differ: 0.14, dark: 0.5, rough: 0.82, streak: 0.22, keep: [0, 1], night: 1.2, hue: 0.06 };
// The moon's line on the city: the moon is behind it, so each face turned toward the moon and seen near edge on (a
// roof, a cornice's top, a face toward the moon) or cut toward it at a corner (an arris) carries a crisp pale line
// of its light, as the spire's chamfers do, and each silhouette stands off the one behind it. How bright, as a share
// of the moon's light on the face; how tight the line on a cut toward the moon is (a power of how near the face is to
// the half way between the moon and the eye), and on a face seen edge on (a power of how near edge on); and how much
// of the line is the stone's own color and how much the moon's.
const RIM = { power: 0.9, cut: 7, edge: 5, own: 0.45 };
// The sky about the moon on the city (skyward in scripts/world/parts/towers/make.mjs, stored where the moon's share
// would be): the moon is low and behind the city, so the tops stand in its light and are paler, the tall buildings
// lay long shadows of it across the lower ones before them, and the feet are shut out of it. power: how much of the
// moon's light it is on a face turned to the moon (wrap: how much a face turned from it still takes), how high the
// city is, in units, from its feet (low) to its tallest tops (high), and how much of it the feet keep (feet); the
// night's soft light from the visitor's side is taken by `fill` of the sky seen; the moon's line along a chamfer
// fades with height to `rim` at the feet.
// His stepped tower's limestone takes `pale` of it, so its lit piers stay the pale near neutral he approved.
const SKY = { power: 0.75, wrap: 0.4, low: -25, high: 150, feet: 0.1, fill: 0.6, rim: 0.12, pale: 0.15 };
// The street's light on the lowest storeys: shop fronts and lamps bleeding up the walls, in the palette's hot light,
// as radiance on the stone at the foot (power), falling to a share 1/e every `fall` units up, strongest in the
// canyons between buildings (canyon: how much more where the place is shut in), in clumps along a street (clump:
// how long a clump is, in units, and how deep the dark between).
const STREET = { power: 0.8, fall: 9, canyon: 1.6, clump: [9, 0.65] };
// The city's own light on its walls: the lit windows across every street, as radiance on the stone, more where the
// place is shut in, falling to a share 1/e every `fall` units up.
const GLOW = { power: 0.16, shut: 1.5, fall: 90 };
// The far rows fall darker: the walls of the back of the city keep this share of their light, its windows `lights`.
const DEPTH = { far: 0.45, lights: 0.7 };
const HOT = new THREE.Color(hex('hot'));
// The pale stone, which every stone of the towers is a tone of: the palette's text-2, a little lighter (PALE_STONE in
// ./windows.ts, which the baker lights it by too).
const PALE = new THREE.Color(hex('text-2')).lerp(new THREE.Color(hex('copper-light')), WARM).multiplyScalar(PALE_STONE);
// The bronze of the bay: how dark against the world's bronze, and how rough; the glass's roughness.
// Sheet bronze and copper: how far apart its standing seams are, in units, how dark a seam is, and how much the
// weather streaks it.
const SHEET = { seam: 1.3, dark: 0.45, weather: 0.22 };
const BAY = { bronze: 0.62, rough: 0.5, metal: 0.85, glass: 0.06, bevel: 0.07, copper: 0.4, stone: 0.9 };
// A field of windows seen from far off, where a window is a few pixels or less: it is drawn as its own wall, a warm
// stone of this tone, with only its brightest rooms lit, each a small crisp light, one at most in each block of
// windows about `dot` pixels across. Below `far[0]` pixels a window it is wholly so, above `far[1]` wholly the near
// field. A room is lit there from `lit[0]` of its level to fully at `lit[1]`, and a light smaller than a pixel is
// brightened by up to `boost` so that it gives the light of a whole one. Its dark glass shows as `grid` darker than
// the wall, filtered, so the field keeps its weave and comes to an even tone where it is finer than a pixel.
// Under the crisp lights the field also glows with its own average, the windows' light filtered over the pixel
// (glow, against what the windows give on average), so a floor lit end to end reads as a band of light and a dark
// building stays dark. The wall of a bronze bay seen far off is the stone `bay` of STONES, `wall` as bright.
// A field of windows where a window is a few pixels or less is filtered as a whole, so a room smaller than a pixel
// never flickers as the page moves: each window's level is read from the map's own smaller copies, and its glass is
// the share of the pixel it covers, worked out exactly. Between `far` pixels a window the wall between them turns to
// one even stone, `wall` as bright as a stone face and `grid` darker where its glass is; a room's own color is read
// from `tint` pixels a window up, under that its average. The room seen behind the glass, its sill and the bevel of
// its frame come in between `detail` pixels a window, where none of them can crawl.
const FAR = { far: [2.4, 4.4], tint: [1.2, 2.2], detail: [5, 9], bay: 2, wall: 0.8, grid: 0.22 };
// The gold mirrors the night as the pyramid's does, so the world's gold is one gold: a deep gold where it mirrors
// little, the world's gold, METAL.gold, as it mirrors more, and pale gold only where it blazes (grade: the levels at
// which each begins). What it mirrors is where its reflection points: the moon is behind the city and to the right,
// so a face whose normal lies near the half way between the moon and the eye mirrors the moon's light and blazes,
// and a face turned to the left or up mirrors the dark. moon: the cosines between the reflection and the moon over
// which a face goes from `dark` (how much of the night it mirrors) to `lit`. The stage's white balance is undone on
// it, so every gold pixel stays gold.
// A sun disc's carving gives way, as a pixel grows from far[0] to far[1] units, to the far form of a coin: a field of
// deep gold that mirrors `field` as much, and a darker carved ring at `ring` of its radius (how far out, how wide, how much darker); the cursor's glint and the
// moon's own on that field are cut by `glint`, which on a flat coin far off was one round spot of light.
const DISC = { far: [0.25, 0.5], field: 7, ring: [0.66, 0.07, 0.55], glint: 0.85 };
const GOLD = { rough: 0.17, moon: [0.1, 0.8], lit: 3.6, dark: 0.14, city: 0.1, fillet: 0.18, valley: 0.2, grade: [0.1, 1.8, 8.5], wave: [0.035, 4], shoulder: [2.6, 2.4] };
// No polished panel is perfectly flat: each face's normal wanders by up to wave[0] over wave[1] units of the world, so
// the reflection changes across a face as on real gilding.
// The gold also mirrors what the bake found reaching it from round about (the city's windows, the street, the
// stone), which the night has none of, as an even light of that strength (city) over the half of the world it
// faces: so a face turned from the moon is a deep gold and not a hole.

const COMMON = `
float tHash( vec2 p ) {
	uvec2 q = uvec2( ivec2( floor( p ) ) + 65536 );
	uint h = q.x * 1597334677u ^ q.y * 3812015801u;
	h = ( h ^ ( h >> 16 ) ) * 2246822519u;
	h ^= h >> 13;
	return float( h ) / 4294967295.0;
}
float tNoise( vec2 p ) {
	vec2 i = floor( p ), u = fract( p );
	u = u * u * ( 3.0 - 2.0 * u );
	return mix( mix( tHash( i ), tHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( tHash( i + vec2( 0.0, 1.0 ) ), tHash( i + vec2( 1.0 ) ), u.x ), u.y );
}
// The share of a footprint w wide, centred on x, that falls inside [a, b] of each whole number: a box filtered
// pulse, exact at any size, so a pattern finer than a pixel comes to its average and never sparkles.
float tRun( float x, float a, float b ) { return floor( x ) * ( b - a ) + clamp( fract( x ), a, b ) - a; }
float tBox( float x, float a, float b, float w ) {
	w = max( w, 1e-5 );
	return clamp( ( min( x + 0.5 * w, b ) - max( x - 0.5 * w, a ) ) / w, 0.0, 1.0 );
}
float tPulse( float x, float a, float b, float w ) {
	w = max( w, 1e-4 );
	return ( tRun( x + 0.5 * w, a, b ) - tRun( x - 0.5 * w, a, b ) ) / w;
}
vec3 tKeep( vec3 c ) {
	float k = 1.0 - smoothstep( 0.3, 0.85, max( c.r, max( c.g, c.b ) ) );
	return c / mix( vec3( 1.0 ), ${BALANCE}, k * ${f(KEPT)} );
}
// A stone's light seen through k of the stage's white balance, and less of it as the light nears the brightest, so a
// face the moon lights full stays the moon's pale and never goes whiter.
vec3 tCooled( vec3 c, float k ) {
	return c * mix( vec3( 1.0 ), ${BALANCE}, k * ( 1.0 - smoothstep( 0.3, 0.8, max( c.r, max( c.g, c.b ) ) ) ) );
}
vec3 tStone( float tone ) {
	int i = int( clamp( floor( tone * ${f(STONES.length - 1)} + 0.5 ), 0.0, ${f(STONES.length - 1)} ) );
	${STONES.map((s, i) => `if ( i == ${i} ) return ${v3(s.tint)};`).join('\n\t')}
	return vec3( 1.0 );
}
float tCool( float tone ) {
	int i = int( clamp( floor( tone * ${f(STONES.length - 1)} + 0.5 ), 0.0, ${f(STONES.length - 1)} ) );
	${STONES.map((st, i) => `if ( i == ${i} ) return ${f(st.cool)};`).join('\n\t')}
	return 0.0;
}
vec2 tFinish( float tone ) {
	int i = int( clamp( floor( tone * ${f(STONES.length - 1)} + 0.5 ), 0.0, ${f(STONES.length - 1)} ) );
	${STONES.map((s, i) => `if ( i == ${i} ) return vec2( ${f(s.metal)}, ${f(s.rough)} );`).join('\n\t')}
	return vec2( 0.0, 0.8 );
}
// The street's light on a wall: h is how high over the building's foot, up is how far the face looks up, open how
// open the place is, along a place along the street.
// The moon's line on a face (RIM): n, v and l the face's normal, the eye's and the moon's, in one space.
float tRim( vec3 n, vec3 v, vec3 l ) {
	float nl = clamp( dot( n, l ), 0.0, 1.0 ), nv = clamp( dot( n, v ), 0.0, 1.0 );
	vec3 h = l + v;
	h /= max( length( h ), 1e-5 );
	return ${f(RIM.power)} * nl * ( pow( clamp( dot( n, h ), 0.0, 1.0 ), ${f(RIM.cut)} ) + pow( 1.0 - nv, ${f(RIM.edge)} ) );
}
// A bright stone goes to the palette's pale gold as it nears the brightest, never to white: the moon full on pale
// limestone, with its line, came out (243, 223, 201).
vec3 tPale( vec3 c ) {
	float m = max( c.r, max( c.g, c.b ) );
	return mix( c, ${lin('pale')} * m, smoothstep( 0.5, 1.0, m ) );
}
// How high a place stands in the city, 0 at its feet and 1 at its tallest tops.
float tUp( float y ) { return smoothstep( ${f(SKY.low)}, ${f(SKY.high)}, y / ${f(SCALE)} ); }
// The moon's line is laid on the direct light from the moon only, after the stage's own.
const vec3 tMoonward = ${v3(new THREE.Vector3(...MOONWARD).normalize().toArray())};
float tStreet( float h, float up, float open, float along ) {
	float side = 1.0 - smoothstep( 0.35, 0.85, abs( up ) );
	float clump = mix( 1.0 - ${f(STREET.clump[1])}, 1.0, smoothstep( 0.35, 0.65, tNoise( vec2( along / ${f(STREET.clump[0])}, 3.7 ) ) ) );
	float street = ${f(STREET.power)} * exp( - max( h, 0.0 ) / ${f(STREET.fall)} ) * clump * mix( 1.0, ${f(STREET.canyon)}, 1.0 - open );
	return side * ( street + ${f(GLOW.power)} * mix( 1.0, ${f(GLOW.shut)}, 1.0 - open ) * exp( - max( h, 0.0 ) / ${f(GLOW.fall)} ) );
}`;

// The moon's line (tRim), laid on the stage's own light from the moon on a face of stone or of the bay, where the moon
// reaches it: so a face in another's shadow has none. It is kept apart (tRimLight) and added after a stone's own
// balance, so it stays the moon's pale and never goes whiter.
const RIM_DIRECT = `
void RE_Direct_Rim( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	vec3 mw = ( viewMatrix * vec4( tMoonward, 0.0 ) ).xyz;
	if ( dot( directLight.direction, mw ) > 0.995 ) tRimLight += directLight.color * tRim( geometryNormal, geometryViewDir, directLight.direction ) * tRimOn * tRimFade * mix( ${lin('pale')} * 0.75, material.diffuseContribution, ${f(RIM.own)} );
}
#undef RE_Direct
#define RE_Direct RE_Direct_Rim`;

// The sky about the moon (SKY), laid on the light a face takes before the world's own (lit in ../../light.ts), so
// it is shut in as everything else is.
const SKY_LIGHT = `
#if NUM_DIR_LIGHTS > 0
{
	float up = tUp( vWPos.y ), seen = wLight.y * mix( ${f(SKY.feet)}, 1.0, up );
	vec3 mw = ( viewMatrix * vec4( tMoonward, 0.0 ) ).xyz;
	float turned = mix( ${f(SKY.wrap)}, 1.0, clamp( 0.5 + 0.5 * dot( normal, mw ), 0.0, 1.0 ) );
	irradiance += directionalLights[ 0 ].color * ( ${f(SKY.power)} * seen * turned * SKY_KEEP );
	iblIrradiance *= mix( 1.0 - ${f(SKY.fill)}, 1.0, seen );
}
#endif`;

function stone(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: PALE, roughness: STONE.rough, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 kind;\nvarying vec2 vKind;\nvarying vec3 vWPos;\nvarying vec3 vWNorm;\nvarying vec2 vFoot;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKind = kind;\nvWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\nvWNorm = mat3( modelMatrix ) * objectNormal;\nvFoot = vec2( aLight.w, aBounce.w );');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec2 vKind;\nvarying vec3 vWPos;\nvarying vec3 vWNorm;\nvarying vec2 vFoot;\nvec2 sFinish;\nfloat tRimOn;\nfloat tRimFade;\nvec3 tRimLight;${COMMON}`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>${RIM_DIRECT}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
tRimOn = 1.0;
tRimFade = tUp( vWPos.y );
tRimFade = mix( ${f(SKY.rim)}, 1.0, tRimFade * tRimFade ) * mix( 0.35, 1.0, wLight.y );
tRimLight = vec3( 0.0 );
{
	// Where a joint falls, from where the place is in the world: across a wall and up it, or across a roof.
	vec3 wn = vWNorm / max( length( vWNorm ), 1e-6 ), wp = vWPos / ${f(SCALE)};
	vec2 tw = vec2( wn.z, - wn.x );
	tw /= max( length( tw ), 1e-4 );
	vec2 grain = abs( wn.y ) > 0.7 ? wp.xz : vec2( dot( wp.xz, tw ), wp.y );
	float lay = step( 0.5, vKind.x ), vary = clamp( ( vKind.x - 0.5 * lay ) / 0.49, 0.0, 1.0 );
	float course = lay > 0.5 ? mix( ${f(STONE.channel[0])}, ${f(STONE.channel[1])}, vary ) : mix( ${f(STONE.course[0])}, ${f(STONE.course[1])}, vary );
	float block = course * mix( ${f(STONE.block[0])}, ${f(STONE.block[1])}, fract( vary * 7.31 ) ), jw = mix( ${f(STONE.joint[0])}, ${f(STONE.joint[1])}, lay );
	float up = grain.y / course, row = floor( up ), along = grain.x / block + 0.5 * mod( row, 2.0 );
	vec2 fw = vec2( fwidth( grain.x / block ), fwidth( up ) );
	float jh = 1.0 - tPulse( up, 0.5 * jw / course, 1.0 - 0.5 * jw / course, fw.y );
	float jv = ( 1.0 - tPulse( along, 0.5 * jw / block, 1.0 - 0.5 * jw / block, fw.x ) ) * ( 1.0 - lay );
	float joint = max( jh, jv );
	float far = smoothstep( 0.3, 1.0, max( fw.x, fw.y ) );
	float tone = mix( 1.0 + ${f(STONE.differ)} * ( tHash( vec2( floor( along ), row ) + 17.0 ) - 0.5 ), 1.0, far );
	vec2 gw = fwidth( grain );
	float fine = 1.0 - smoothstep( 0.08, 0.3, max( gw.x, gw.y ) );
	tone *= 1.0 + fine * 0.1 * ( 0.6 * tNoise( grain * 3.0 ) + 0.4 * tNoise( grain * 8.0 + 3.0 ) - 0.5 );
	float streak = tNoise( vec2( grain.x * 1.7, grain.y * 0.045 ) ) * 0.6 + tNoise( vec2( grain.x * 4.3 + 9.0, grain.y * 0.11 ) ) * 0.4;
	tone *= 1.0 + ${f(STONE.streak)} * ( streak - 0.5 );
	// Each building's stone is its own, a little warmer or cooler than its kind.
	vec3 hue = vec3( 1.0 ) + ${f(STONE.hue)} * ( fract( vary * 13.7 ) - 0.5 ) * vec3( 0.6, 0.0, -1.0 );
	sFinish = tFinish( vKind.y );
	diffuseColor.rgb *= tStone( vKind.y ) * hue * tone * ( 1.0 - ${f(STONE.dark)} * joint * ( 1.0 - 0.6 * sFinish.x ) ) * mix( 1.0, ${f(DEPTH.far)}, vFoot.y );
}`).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = sFinish.y;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = sFinish.x;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
	vec3 upV = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
	totalEmissiveRadiance += diffuseColor.rgb * ( 1.0 - 0.7 * sFinish.x ) * ${lin3(HOT)} * tStreet( vFoot.x * ${f(FOOT)}, dot( normal, upV ), wLight.z, vWPos.x / ${f(SCALE)} );
}`).replace('#include <lights_fragment_end>', `iblIrradiance *= ${f(STONE.night)};\n#define SKY_KEEP ( vKind.y < ${f(0.5 / (STONES.length - 1))} ? ${f(SKY.pale)} : 1.0 )${SKY_LIGHT}\n#include <lights_fragment_end>`).replace('#include <opaque_fragment>', `outgoingLight = tPale( tCooled( outgoingLight - totalEmissiveRadiance, tCool( vKind.y ) ) + totalEmissiveRadiance + tRimLight );
outgoingLight = max( mix( outgoingLight, tKeep( outgoingLight ), mix( ${f(STONE.keep[0])}, ${f(STONE.keep[1])}, sFinish.x ) ), 0.0 );
#include <opaque_fragment>`);
  };
  return lit(m, { key: 'towers-stone', baked: true, core: false });
}

function bay(map: THREE.Texture): THREE.MeshStandardMaterial {
  const fr = WINDOW.frame, [c0, c1, c2] = WINDOW.colors, img = map.image as { width: number; height: number };
  const blindMean = 1 - WINDOW.blind * WINDOW.blinds * 0.5;
  const m = new THREE.MeshStandardMaterial({ color: METAL.bronze.clone().multiplyScalar(BAY.bronze), roughness: BAY.rough, metalness: BAY.metal });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWin = { value: map };
    sh.uniforms.uWinSize = { value: new THREE.Vector2(img.width, img.height) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 cell;\nvarying vec4 vCell;\nvarying vec3 vWPos;\nvarying vec3 vWNorm;\nvarying vec2 vFoot;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCell = cell;\nvWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\nvWNorm = mat3( modelMatrix ) * objectNormal;\nvFoot = vec2( aLight.w, aBounce.w );');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vCell;
varying vec3 vWPos;
varying vec3 vWNorm;
varying vec2 vFoot;
uniform sampler2D uWin;
uniform vec2 uWinSize;
float tRimOn;
float tRimFade;
vec3 tRimLight;
${COMMON}
vec3 tTint( float w ) {
	float t = 2.0 * w;
	return t < 1.0 ? mix( ${lin(c0)}, ${lin(c1)}, t ) : mix( ${lin(c1)}, ${lin(c2)}, t - 1.0 );
}`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>${RIM_DIRECT}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
tRimOn = 1.0;
tRimFade = tUp( vWPos.y );
tRimFade = mix( ${f(SKY.rim)}, 1.0, tRimFade * tRimFade ) * mix( 0.35, 1.0, wLight.y );
tRimLight = vec3( 0.0 );
float bGlass = 0.0, bLit = 0.0, bCopper = 0.0, bStone = 0.0, bKeep = 0.0, bFar = 0.0, bCool = ${f(STONES[FAR.bay].cool)};
vec3 bEmit = vec3( 0.0 );
vec2 bTilt = vec2( 0.0 );
vec3 bAcross = vec3( 1.0, 0.0, 0.0 );
{
	vec3 wn = vWNorm / max( length( vWNorm ), 1e-6 );
	bAcross = vec3( wn.z, 0.0, - wn.x );
	bAcross /= max( length( bAcross ), 1e-4 );
	vec2 cs = vCell.zw;
	float frame = 0.0;
	vec3 farWall = ${lin3(PALE)} * ${f(FAR.wall)} * ${v3(STONES[FAR.bay].tint)};
	if ( cs.x > ${f(WINDOW.style)} ) {
		// The building's stone (styleOf in ./windows.ts): windows let into it have it for their frame, matte, and a
		// bronze bay's wall seen from far off is it.
		frame = floor( cs.x / ${f(WINDOW.style)} );
		cs.x -= frame * ${f(WINDOW.style)};
		float into = step( frame, ${f(STONES.length + 0.5)} ), tk = ( frame - 1.0 - ${f(STONES.length)} * ( 1.0 - into ) ) / ${f(STONES.length - 1)};
		farWall = ${lin3(PALE)} * ${f(FAR.wall)} * tStone( tk );
		bCool = tCool( tk );
		if ( into > 0.5 ) {
			bStone = 1.0;
			bKeep = mix( ${f(STONE.keep[0])}, ${f(STONE.keep[1])}, tFinish( tk ).x );
			diffuseColor.rgb = ${lin3(PALE)} * ${f(BAY.stone)} * tStone( tk );
		}
	}
	if ( cs.x > 0.0 ) {
		vec2 c = vCell.xy, fw = max( fwidth( c ), vec2( 1e-5 ) ), id = floor( c ), p = ( c - id ) * cs;
		float fSide = min( ${f(fr.side)}, ${f(WINDOW.most.side)} * cs.x ), fSill = min( ${f(fr.sill)}, ${f(WINDOW.most.sill)} * cs.y ), fHead = min( ${f(fr.head)}, ${f(WINDOW.most.head)} * cs.y );
		vec2 a = vec2( fSide, fSill ) / cs, b = vec2( 1.0 ) - vec2( fSide, fHead ) / cs;
		float px = min( 1.0 / fw.x, 1.0 / fw.y );
		bFar = 1.0 - smoothstep( ${f(FAR.far[0])}, ${f(FAR.far[1])}, px );
		// The glass's share of the pixel, exact at any size, and the room's level and color: the window's own where it
		// is large, the map's smaller copies (its average over the pixel) where it is small.
		bGlass = tPulse( c.x, a.x, b.x, fw.x ) * tPulse( c.y, a.y, b.y, fw.y );
		vec3 d = textureGrad( uWin, ( id + 0.5 ) / uWinSize, dFdx( c ) / uWinSize, dFdy( c ) / uWinSize ).rgb;
		float own = smoothstep( ${f(FAR.tint[0])}, ${f(FAR.tint[1])}, px );
		float level = pow( d.r, ${f(WINDOW.curve)} );
		float blind = own * step( 0.003, d.r ) * ( tHash( id + vec2( 41.0, 23.0 ) ) < ${f(WINDOW.blinds)} ? 0.2 + 0.6 * tHash( id + vec2( 7.0, 91.0 ) ) : 0.0 );
		vec3 tint = tTint( mix( 0.45, d.g, own ) );
		float detail = smoothstep( ${f(FAR.detail[0])}, ${f(FAR.detail[1])}, px );
		vec3 room = vec3( ${f(WINDOW.mean)} * mix( ${f(blindMean)}, 1.0 - ${f(WINDOW.blind)} * blind, own ) );
		if ( detail > 0.0 ) {
			vec3 r = vWPos - cameraPosition;
			r /= max( length( r ), 1e-6 );
			vec3 rl = vec3( dot( r, bAcross ), r.y, max( - dot( r, wn ), 0.05 ) );
			float deep = ${f(WINDOW.deep)};
			float tx = rl.x > 1e-4 ? ( cs.x - p.x ) / rl.x : ( rl.x < -1e-4 ? - p.x / rl.x : 1e4 );
			float ty = rl.y > 1e-4 ? ( cs.y - p.y ) / rl.y : ( rl.y < -1e-4 ? - p.y / rl.y : 1e4 );
			float tz = deep / rl.z, t = min( min( tx, ty ), tz );
			vec3 h = vec3( p, 0.0 ) + rl * t;
			float s1 = tHash( id + 7.3 ), s2 = tHash( id + 19.1 ), s3 = tHash( id + 3.1 );
			vec3 lamp = vec3( cs.x * ( 0.2 + 0.6 * s1 ), cs.y * 0.94, deep * ( 0.3 + 0.45 * s3 ) );
			float lr = length( h - lamp ), glow = 0.45 + 1.0 / ( 1.0 + 3.0 * lr * lr ), up = clamp( h.y / cs.y, 0.0, 1.0 );
			float surf = t == tz ? ( 0.6 + 0.4 * s2 ) * ( 0.5 + 0.9 * up ) : ( t == ty ? ( rl.y < 0.0 ? 0.35 : 1.4 ) : 0.6 * ( 0.45 + 0.8 * up ) );
			vec3 near = vec3( surf * glow );
			if ( s1 > 0.7 && p.x < cs.x * ( 0.18 + 0.15 * s3 ) ) near *= 0.4;
			float zf = deep * ( 0.3 + 0.35 * s2 ), tf = zf / rl.z;
			vec3 hf = vec3( p, 0.0 ) + rl * tf;
			float fx0 = cs.x * ( 0.05 + 0.5 * tHash( id + 5.7 ) ), fx1 = fx0 + cs.x * ( 0.25 + 0.4 * tHash( id + 9.9 ) ), fy1 = cs.y * ( 0.22 + 0.28 * tHash( id + 2.6 ) );
			if ( tf < t && tHash( id + 2.2 ) < 0.65 && hf.x > fx0 && hf.x < fx1 && hf.y < fy1 ) near = vec3( 0.06 + 0.45 * smoothstep( fy1 - 0.1, fy1, hf.y ) * glow );
			float top = cs.y - fHead, low = top - blind * ( cs.y - fSill - fHead );
			// The glass is set back in its frame, so the head's shadow lies across the top of the room seen.
			near *= 1.0 - 0.6 * smoothstep( top - ${f(WINDOW.reveal)}, top, p.y );
			if ( blind > 0.02 && p.y > low ) {
				float slat = tPulse( p.y / ${f(WINDOW.slat)}, 0.0, 0.72, max( fwidth( p.y ), 1e-5 ) / ${f(WINDOW.slat)} );
				near = vec3( ( 0.4 + 0.22 * slat ) * ( 0.75 + 0.35 * smoothstep( low, top, p.y ) ) * ( 1.0 - 0.5 * ( 1.0 - smoothstep( low, low + 0.07, p.y ) ) ) );
			}
			near *= ${f(WINDOW.near)};
			room = mix( room, near, detail );
			vec2 lo = vec2( fSide, fSill ), hi = cs - vec2( fSide, fHead );
			float bev = ${f(BAY.bevel)};
			float inY = step( lo.y - bev, p.y ) * step( p.y, hi.y + bev ), inX = step( lo.x - bev, p.x ) * step( p.x, hi.x + bev );
			bTilt.x = detail * inY * 0.7 * ( step( lo.x - bev, p.x ) * step( p.x, lo.x ) - step( hi.x, p.x ) * step( p.x, hi.x + bev ) );
			bTilt.y = detail * inX * 0.7 * ( step( lo.y - bev, p.y ) * step( p.y, lo.y ) - step( hi.y, p.y ) * step( p.y, hi.y + bev ) );
			bLit = ( 1.0 - bGlass ) * detail * inX * step( lo.y - ${f(WINDOW.sill)}, p.y ) * step( p.y, lo.y );
			bEmit += bLit * 0.4 * tint * level * ${f(WINDOW.gain)};
		}
		bEmit += bGlass * ${f(WINDOW.gain)} * level * tint * room;
		vec3 wall = bStone > 0.5 ? diffuseColor.rgb : farWall;
		diffuseColor.rgb = mix( diffuseColor.rgb, wall * ( 1.0 - ${f(FAR.grid)} * bGlass ), bFar );
		bGlass *= 1.0 - bFar;
		bLit *= 1.0 - bFar;
		bKeep = mix( bKeep, ${f(STONE.keep[0])}, bFar );
	} else if ( cs.x < 0.0 ) {
		vec2 c = vCell.xy, fw = max( fwidth( c ), vec2( 1e-5 ) );
		float gap = 1.0 - tPulse( c.x, 0.02, 0.98, fw.x );
		float panel = tPulse( c.x, 0.14, 0.86, fw.x ) * tPulse( c.y * 3.0, 0.1, 0.9, fw.y * 3.0 );
		diffuseColor.rgb *= ( 1.0 - 0.85 * gap ) * ( 0.8 + 0.25 * panel );
	} else {
		bCopper = vCell.y;
		diffuseColor.rgb = mix( diffuseColor.rgb, ${lin3(METAL.copper)}, bCopper );
		// Sheet metal: standing seams down every wall SHEET.seam units apart, and the weather in long streaks down it,
		// darker toward its foot, filtered so neither sparkles far off.
		vec3 wn = vWNorm / max( length( vWNorm ), 1e-6 ), wp = vWPos / ${f(SCALE)};
		vec2 tw = vec2( wn.z, - wn.x );
		tw /= max( length( tw ), 1e-4 );
		float along = dot( wp.xz, tw ) / ${f(SHEET.seam)}, wall = 1.0 - smoothstep( 0.6, 0.85, abs( wn.y ) );
		float seam = ( 1.0 - tPulse( along, 0.05, 0.95, max( fwidth( along ), 1e-4 ) ) ) * wall;
		float streak = 0.65 * tNoise( vec2( along * 1.7, wp.y * 0.09 ) ) + 0.35 * tNoise( vec2( along * 5.3 + 7.0, wp.y * 0.21 ) );
		diffuseColor.rgb *= ( 1.0 - ${f(SHEET.dark)} * seam ) * mix( 1.0, 1.0 - ${f(SHEET.weather)} + 2.0 * ${f(SHEET.weather)} * streak, wall );
	}
	tRimOn = 1.0 - bGlass;
	diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.0 ), bGlass ) * mix( 1.0, ${f(DEPTH.far)}, vFoot.y );
	bEmit = max( bEmit, vec3( 0.0 ) ) * mix( 1.0, ${f(DEPTH.lights)}, vFoot.y );
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = mix( mix( mix( roughnessFactor, ${f(STONE.rough)}, max( bStone, bFar ) ), ${f(BAY.copper)}, bCopper ), ${f(BAY.glass)}, bGlass );`)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix( mix( mix( metalnessFactor, 0.0, max( bStone, bFar ) ), 1.0, bCopper ), 0.0, bGlass );')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if ( abs( bTilt.x ) + abs( bTilt.y ) > 0.0 ) {
	vec3 vt = ( viewMatrix * vec4( bAcross, 0.0 ) ).xyz, vu = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
	vec3 tilted = normal + vt * bTilt.x + vu * bTilt.y;
	tilted /= max( length( tilted ), 1e-5 );
	// Never turned from the eye: a frame's bevel seen from above, turned away, left the lighting's multiple
	// scattering dividing by nothing in one channel, a single yellow speck at the head of a lit pane.
	vec3 eye = normalize( - vViewPosition );
	tilted += eye * max( 0.0, 0.08 - dot( tilted, eye ) );
	normal = tilted / max( length( tilted ), 1e-5 );
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
	vec3 upV = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz;
	float matte = max( bStone, bFar ) + ( 1.0 - max( bStone, bFar ) ) * 0.25 * ( 1.0 - bGlass );
	totalEmissiveRadiance += bEmit + diffuseColor.rgb * matte * ${lin3(HOT)} * tStreet( vFoot.x * ${f(FOOT)}, dot( normal, upV ), wLight.z, vWPos.x / ${f(SCALE)} );
}`)
      .replace('#include <lights_fragment_end>', `iblIrradiance *= mix( 1.0, ${f(STONE.night)}, max( bStone, bFar ) );\n#define SKY_KEEP 1.0${SKY_LIGHT}\n#include <lights_fragment_end>`)
      .replace('#include <opaque_fragment>', `{
	outgoingLight = tPale( tCooled( outgoingLight - totalEmissiveRadiance, bCool * max( bStone, bFar ) ) + totalEmissiveRadiance + tRimLight );
	float lamp = clamp( dot( bEmit, vec3( 1.0 ) ) / max( dot( outgoingLight, vec3( 1.0 ) ), 1e-5 ), 0.0, 1.0 );
	outgoingLight = max( mix( outgoingLight, tKeep( outgoingLight ), max( max( max( max( bGlass, bLit ), bCopper ), bKeep ), lamp ) ), 0.0 );
}
#include <opaque_fragment>`);
  };
  return lit(m, { key: 'towers-bay', baked: true, core: false });
}

// The crown's reeds are drawn here and not built: ridges a pixel or two apart, built, alias into wavering stripes.
// Each is a hollow flute between two flat fillets, its two flanks flat, one turned FLUTE.flank degrees to the right
// and the other as far to the left, so every reed has the same lit flank and the same shaded one. A pixel is lit as
// the share of each of the three faces it covers, worked out exactly, so a reed never sparkles or wavers whatever
// its size, and where reeds are far under a pixel they come to their average.
// The gold is lit here in full, at the end of the shader, from what it mirrors and from the moon and the glint, each
// of the three faces by its share, with nothing kept between one part of the shader and the next: the stage's own
// sum of a reed's light, and globals carried from one part of the shader to the next, both came out wrong on this
// machine's driver (the flank that mirrors the moon drew nearly black).
function gold(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: METAL.gold, roughness: GOLD.rough, metalness: 1 }), moon = new THREE.Vector3(...MOONWARD).normalize();
  const a = GOLD.fillet * 0.5;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMoonward = { value: moon };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 flute;\nvarying vec3 vFlute;\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlute = flute;\nvWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uMoonward;
varying vec3 vFlute;
varying vec3 vWPos;
${COMMON}
// A reed's three faces about a face's normal n (view space): its fillets (n), its two flanks, and the share of a
// pixel on each, from where the pixel is across the reed.
void goldReed( const in vec3 n, out vec3 nl, out vec3 nr, out vec3 share ) {
	vec3 up = ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz, across = cross( up, n );
	across /= max( length( across ), 1e-5 );
	float flank = ( vFlute.y - 0.5 ) * 1.5707963, sa = sin( flank ), ca = cos( flank );
	nl = n * ca + across * sa;
	nr = n * ca - across * sa;
	float x = vFlute.x / max( vFlute.z, 1e-4 ), fw = max( fwidth( x ), 1e-5 );
	float l = tPulse( x, ${f(a)}, 0.5, fw ), r = tPulse( x, 0.5, ${f(1 - a)}, fw );
	share = vec3( 1.0 - l - r, l, r );
}
// A highlight of a point light on a face: GGX, every division guarded.
float goldSpot( const in vec3 n, const in vec3 l, const in vec3 v, const in float rough ) {
	vec3 h = l + v;
	h /= max( length( h ), 1e-5 );
	float nl = clamp( dot( n, l ), 0.0, 1.0 ), nv = clamp( dot( n, v ), 1e-3, 1.0 ), nh = clamp( dot( n, h ), 0.0, 1.0 );
	float al = max( rough * rough, 2e-3 ), a2 = al * al, d = nh * nh * ( a2 - 1.0 ) + 1.0, k = 0.5 * al;
	float D = a2 / max( 3.14159265 * d * d, 1e-6 ), V = 0.25 / max( ( nl * ( 1.0 - k ) + k ) * ( nv * ( 1.0 - k ) + k ), 1e-4 );
	return min( D * V * nl, 60.0 );
}`).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if ( vFlute.y > 0.5 && vFlute.y < 1.5 ) {
	vec3 nl, nr, share;
	goldReed( normal, nl, nr, share );
	vec3 nn = normal * share.x + nl * share.y + nr * share.z;
	normal = nn / max( length( nn ), 1e-5 );
}`).replace('#include <opaque_fragment>', `{
	vec3 v = geometryViewDir, base = nonPerturbedNormal;
	// A sun disc's carving, far off, gives way to the coin's plain field and a darker carved ring, so the disc reads
	// as one deep gold coin in its rim and never glitters.
	vec3 fw3 = fwidth( vViewPosition );
	float disc = vFlute.y > 1.5 ? smoothstep( ${f(DISC.far[0])}, ${f(DISC.far[1])}, max( fw3.x, max( fw3.y, fw3.z ) ) / ${f(SCALE)} ) : 0.0;
	float ring = disc * exp( - pow( ( vFlute.x - ${f(DISC.ring[0])} ) / ${f(DISC.ring[1])}, 2.0 ) );
	vec3 axis = ( viewMatrix * vec4( 0.0, 0.0, 1.0, 0.0 ) ).xyz, nd = mix( base, axis, disc );
	base = nd / max( length( nd ), 1e-5 );
	{
		vec3 wp = vWPos / ${f(SCALE)} / ${f(GOLD.wave[1])};
		vec3 wob = vec3( tNoise( wp.xy + wp.zz * 0.7 ), tNoise( wp.yz + 17.0 ), tNoise( wp.zx + 41.0 ) ) - 0.5;
		vec3 nw = base + ( viewMatrix * vec4( wob, 0.0 ) ).xyz * ( 2.0 * ${f(GOLD.wave[0])} * ( 1.0 - disc ) );
		base = nw / max( length( nw ), 1e-5 );
	}
	vec3 n0 = base, n1 = base, n2 = base, share = vec3( 1.0, 0.0, 0.0 );
	if ( vFlute.y > 0.5 && vFlute.y < 1.5 ) goldReed( base, n1, n2, share );
	float rough = ${f(GOLD.rough)}, open = 1.0;
	vec3 bounce = vec3( 0.0 );
	#ifdef WORLD_BAKED
		open = mix( 1.0, wLight.z, 0.6 );
		bounce = wBounce * ( ${f(GOLD.city)} * RECIPROCAL_PI );
	#endif
	vec3 F0 = ${lin3(METAL.gold)}, sum = vec3( 0.0 );
	for ( int k = 0; k < 3; k ++ ) {
		vec3 n = k == 0 ? n0 : ( k == 1 ? n1 : n2 );
		float w = k == 0 ? share.x : ( k == 1 ? share.y : share.z ) * ${f(1 - GOLD.valley)};
		if ( w <= 0.0 ) continue;
		vec3 r = reflect( - v, n );
		vec3 rw = normalize( ( vec4( r, 0.0 ) * viewMatrix ).xyz );
		float toMoon = smoothstep( ${f(GOLD.moon[0])}, ${f(GOLD.moon[1])}, dot( rw, uMoonward ) );
		vec3 seen = ${lin('pale')} * ( ${f(GOLD.lit)} * toMoon * sqrt( toMoon ) );
		#ifdef USE_ENVMAP
			seen += textureLod( envMap, envMapRotation * rw, roughnessToMip( rough ) ).rgb * ( envMapIntensity * ${f(GOLD.dark)} );
		#endif
		seen = seen * ( 1.0 - ${f(1 - DISC.field)} * disc ) * open + bounce * ( 0.5 + 0.5 * clamp( 0.5 - rw.y, 0.0, 1.0 ) );
		#if NUM_DIR_LIGHTS > 0
			seen += directionalLights[ 0 ].color * goldSpot( n, directionalLights[ 0 ].direction, v, rough ) * ( 1.0 - ${f(DISC.glint)} * disc );
		#endif
		#ifdef WORLD_GLINT
			vec3 g = uGlintAt - geometryPosition;
			seen += uGlint * goldSpot( n, g / max( length( g ), 1e-5 ), v, rough ) * ( 1.0 - ${f(DISC.glint)} * disc );
		#endif
		float nv = clamp( dot( n, v ), 0.0, 1.0 );
		sum += w * seen * ( F0 + ( 1.0 - F0 ) * pow( 1.0 - nv, 5.0 ) );
	}
	float lv = max( sum.r, 0.0 ) * ( 1.0 - ${f(DISC.ring[2])} * ring );
	// A soft shoulder over GOLD.shoulder, so a blaze keeps a gradient and never sits flat at the hot light's cap.
	lv = lv < ${f(GOLD.shoulder[0])} ? lv : ${f(GOLD.shoulder[0])} + ${f(GOLD.shoulder[1])} * ( 1.0 - exp( - ( lv - ${f(GOLD.shoulder[0])} ) / ${f(GOLD.shoulder[1])} ) );
	vec3 c = mix( mix( ${DEEP}, ${lin3(METAL.gold)}, smoothstep( ${f(GOLD.grade[0])}, ${f(GOLD.grade[1])}, lv ) ), ${lin('pale')}, smoothstep( ${f(GOLD.grade[1])}, ${f(GOLD.grade[2])}, lv ) );
	outgoingLight = max( tKeep( c * lv ), 0.0 );
}
#include <opaque_fragment>`);
  };
  return lit(m, { key: 'towers-gold', baked: true, core: false, glint: true });
}

export interface TowerMaterials { stone: THREE.MeshStandardMaterial; bay: THREE.MeshStandardMaterial; gold: THREE.MeshStandardMaterial; dispose(): void }

export function materials(map: THREE.Texture): TowerMaterials {
  const all = { stone: stone(), bay: bay(map), gold: gold() };
  return { ...all, dispose() { for (const m of Object.values(all)) m.dispose(); } };
}
