import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { SCALE } from '../../layout';
import { lit } from '../../light';
import { ATLAS, TILES } from './design';

// The trees' one material, drawn twice. The first pass draws every pixel that is more than half leaf, solid, with
// its depth: so crowns hide one another exactly, whatever order they are drawn in. The second draws only the soft
// edge of each leaf, and the shade each tree lays on the ground, over what is already there, without depth, so no
// leaf has a stair stepped edge and nothing sparkles. Both passes are one shader program, told apart by a uniform;
// the moon's shadow pass cuts the leaves out by the same atlas and moves them as the passes do.
//
// A leaf is the tree's own shade (an instance's aTone) times the atlas's lightness and hue for that leaf. It is lit
// as a place on two balls at once, its clump's and its crown's (the make script stores both with every vertex): so
// a clump is round whichever way its cards lie, and the crown is one mass with its clumps standing in it. The moon
// is behind the world and to the right, and it is the light that shapes a crown: it reaches a leaf through the
// crown and the clump between them (so the crown's upper right takes it and its heart does not), wraps a little
// round each clump, and turns what it lights toward pale gold. The night's soft light from the viewer's side is
// kept low, and it too is shut out of the crown's inside and underside, so the face toward the viewer is dim and
// the gaps between crowns are near black. Round its outline, where the city's windows stand behind it, light comes
// through its leaves, warm.

// How the leaves move in the air: how far, in a crown's own units, and how fast, in radians a second.
export const AIR = { reach: 0.012, rate: [0.55, 1.37, 0.83] } as const;
// How far each clump of a tree is moved from where its model has it, in a crown's own units, so that no two trees
// of one model have the same outline.
export const JITTER = 0.11;
// The bark's color, as a mix of the palette's darkest bronze and a warm grey, how bright, and how rough each thing is.
const BARK = { color: 'bronze-deep', grey: 'text-3', mix: 0.12, power: 0.32 } as const;
const ROUGH = { leaf: 0.72, bark: 0.95 };
// Light through the leaves at a crown's outline from the lit city behind it, as a share of the palette's hot light,
// and how tight to the outline it keeps.
const RIM = { color: 'hot', power: 1.6, tight: 2.0 } as const;
// The shade of the trees nearer the moon (aTree.z, the share of the crown's height it covers): how soft its edge
// is, and how much of the night it also takes from the leaves in it.
const COVER = { soft: 0.18, night: 0.4 };
// Leaves and bark are matte: how much of the standard sheen they keep, head on and at a grazing angle.
const SHEEN = { face: 0.5, graze: 0.12 };
// How much a leaf turned toward the light catches more of it than one turned away.
const FACE = 0.3;
// How much of the normal a leaf is lit by is its clump's ball, and how much its crown's.
const BALL = { clump: 0.9, crown: 0.6 };
// The moon in a crown: how far its light wraps round a ball past the line where it would set, and how much of it
// the leaves let through, for each radius of crown and of clump it crosses on its way in.
const MOON = { wrap: 0.25, crown: 1.15, clump: 0.55 };
// What the moon turns a leaf it lights toward, and how far: a pale gold, never the leaf's own shade made brighter.
const PALE = { color: 'copper-light', toward: 'hot', mix: 0.35, power: 0.9, most: 0.7 } as const;
// The night's soft light on the leaves, against what it gives everything else on top of the world, and how much of
// it reaches a leaf with no sky above it, against one under open sky.
const NIGHT = { leaf: 0.5, bark: 0.6, covered: 0.35 };
// The light inside a crown has come through leaves, and takes their color: how much of the leaf's own color it
// takes again, so a crown's shade is a deep russet and not the leaf's shade made darker.
const DEEP = 0.8;
// The light of the sky over a crown, from above and about the moon: what makes a crown's top paler than its sides.
// Its color as the palette's pale, how bright, and how tightly it keeps to what faces straight up.
const TOP = { color: 'pale', power: 2.9, tight: 1.2, covered: 0.4 } as const;
// Leaves deep in the crown and in their clump, behind the front of each ball, are shut in from the night: how fast
// its light goes with depth (in radii) for each. A leaf turned down, under the crown, keeps this share of it.
const INSIDE = { crown: 2.2, clump: 1.2, beneath: 0.15 };
// How far one clump's shade differs from the next in hue and in lightness.
const CLUMPS = { hue: 0.45, light: 0.18 };
// The most green a leaf may have against its red, and blue against its green, in linear light. A pale leaf with
// more turned khaki once the stage's white balance took the warm light out of it, and read as olive.
const WARM = { green: 0.3, blue: 0.28 };
// The shade on the ground is drawn this much nearer the viewer along the line of sight, in units, so the land's
// own small rises do not cut it into strips. At the world's low view that lifts it off the ground by a tenth of it.
const NEARER = 6;
// ?treelook=moon, night or top shows one light alone, and shade the shade on the ground lit, for judging each.
const LOOKS: Record<string, number> = { moon: 1, night: 2, top: 3, shade: 4 };

const f = (v: number): string => v.toFixed(5);
const tile = (uv: string): string => `( floor( ${uv}.x * ${f(ATLAS.cols)} ) + ${f(ATLAS.cols)} * floor( ${uv}.y * ${f(ATLAS.rows)} ) )`;

// Where a vertex goes, which the passes and the moon's shadow pass share: the discs that face the viewer turned
// back from the tree's own turn so they still do, each clump moved by its tree's own number, the leaves in a slow air, and the shade on the ground turned to lie away from the moon and cut short
// where the land ends (aTree.w). The shadow pass lays no shade.
const MOVE = (shade: boolean): string => `
vec4 tClumpAt = clump;
float tShadeV = 0.0;
if ( abs( ${tile('uv')} - ${f(TILES.blob)} ) < 0.5 ) {
	tShadeV = 1.0;
	${shade ? `vec3 rel = transformed - clump.xyz;
	float along = rel.x > 0.0 ? rel.x * aTree.w : rel.x;
	vec2 w = uShade * along + vec2( - uShade.y, uShade.x ) * rel.z;
	#ifdef USE_INSTANCING
		vec3 ax = instanceMatrix[ 0 ].xyz / max( length( instanceMatrix[ 0 ].xyz ), 1e-6 );
		float ct = ax.x, st = - ax.z;
	#else
		float ct = 1.0, st = 0.0;
	#endif
	transformed = clump.xyz + vec3( ct * w.x - st * w.y, rel.y, st * w.x + ct * w.y );` : 'transformed = clump.xyz;'}
} else if ( clump.w > 0.0 ) {
	#ifdef USE_INSTANCING
		if ( view > 0.5 ) {
			vec3 ax = instanceMatrix[ 0 ].xyz / max( length( instanceMatrix[ 0 ].xyz ), 1e-6 ), rel = transformed - clump.xyz;
			transformed = clump.xyz + vec3( ax.x * rel.x + ax.z * rel.z, rel.y, - ax.z * rel.x + ax.x * rel.z );
		}
	#endif
	vec3 j = ( fract( sin( vec3( 12.9898, 78.233, 37.719 ) * ( aTree.x * 91.7 + sway.y * 13.1 + 0.37 ) ) * 43758.5453 ) - 0.5 ) * ( 2.0 * uJitter );
	j.y *= 0.6;
	transformed += j;
	tClumpAt.xyz += j;
}
{
	float ph = 6.2831853 * ( aTree.x + sway.y );
	transformed += sway.x * uAir * vec3( sin( uTime * ${f(AIR.rate[0])} + ph ) + 0.4 * sin( uTime * ${f(AIR.rate[1])} + 1.7 * ph ), 0.35 * sin( uTime * ${f(AIR.rate[2])} + 0.6 * ph ), cos( uTime * ${f(AIR.rate[2])} + 1.3 * ph ) );
}`;
const MOVE_PARS = `
attribute vec4 aTree;
attribute float view;
attribute vec2 sway;
attribute vec4 clump;
uniform float uTime;
uniform float uAir;
uniform float uJitter;
uniform vec2 uShade;`;

export interface TreeUniforms { uTime: { value: number }; uAir: { value: number }; uJitter: { value: number }; uShade: { value: THREE.Vector2 } }
export function treeUniforms(): TreeUniforms {
  return { uTime: { value: 0 }, uAir: { value: 0 }, uJitter: { value: 0 }, uShade: { value: new THREE.Vector2(-1, 0) } };
}

export function treeMaterial(map: THREE.Texture, pass: 0 | 1, uniforms: TreeUniforms, look: string | null): THREE.MeshStandardMaterial {
  // Both passes are transparent, so both are one program; three draws a transparent card's back and its front in two
  // passes of their own, which drew every leaf twice and made a third program, unless it is told not to.
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: ROUGH.leaf, metalness: 0, side: THREE.DoubleSide, transparent: true, depthWrite: pass === 0, forceSinglePass: true });
  const bark = new THREE.Color(hex(BARK.color)).lerp(new THREE.Color(hex(BARK.grey)), BARK.mix).multiplyScalar(BARK.power), rim = new THREE.Color(hex(RIM.color)).multiplyScalar(RIM.power);
  const top = new THREE.Color(hex(TOP.color)).multiplyScalar(TOP.power);
  const pale = new THREE.Color(hex(PALE.color)).lerp(new THREE.Color(hex(PALE.toward)), PALE.mix).multiplyScalar(PALE.power);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms, { uLeaves: { value: map }, uPass: { value: pass }, uBark: { value: bark }, uRim: { value: rim }, uPale: { value: pale }, uTop: { value: top }, uNearer: { value: NEARER * SCALE }, uLook: { value: LOOKS[look ?? ''] ?? 0 } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>${MOVE_PARS}
attribute vec3 aTone;
attribute vec4 crown;
uniform float uNearer;
varying vec4 vClump;
varying vec4 vCrown;
varying float vPhase;
varying vec2 vLeafUv;
varying vec3 vTone;
varying vec4 vTree;
varying float vLow;`)
      .replace('#include <project_vertex>', `${THREE.ShaderChunk.project_vertex.replace('gl_Position =', `mvPosition.xyz *= 1.0 - tShadeV * uNearer / max( length( mvPosition.xyz ), 1e-4 );
gl_Position =`)}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
${MOVE(true)}
vLeafUv = uv;
vTone = aTone;
vTree = aTree;
vLow = aBounce.w;
vPhase = sway.y;
{
	#ifdef USE_INSTANCING
		mat4 mvi = modelViewMatrix * instanceMatrix;
	#else
		mat4 mvi = modelViewMatrix;
	#endif
	float sc = length( ( mvi * vec4( 1.0, 0.0, 0.0, 0.0 ) ).xyz );
	vClump = vec4( ( mvi * vec4( tClumpAt.xyz, 1.0 ) ).xyz, tClumpAt.w * sc );
	vCrown = vec4( ( mvi * vec4( crown.xyz, 1.0 ) ).xyz, crown.w * sc );
}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uLeaves;
uniform float uPass;
uniform float uLook;
uniform vec3 uBark;
uniform vec3 uRim;
uniform vec3 uPale;
uniform vec3 uTop;
varying vec2 vLeafUv;
varying vec3 vTone;
varying vec4 vTree;
varying float vLow;
varying vec4 vClump;
varying vec4 vCrown;
varying float vPhase;
vec3 tP;
vec4 tCrownB;
vec4 tClumpB;
float tLeafy;
// How shut in a place seen at P is by a ball b (its middle and radius), looked at along V: by how far it lies
// behind the ball's front, in radii.
float tDeep( vec3 P, vec3 V, vec4 b ) {
	vec3 d = P - b.xyz, p = d - dot( d, V ) * V;
	return max( sqrt( max( b.w * b.w - dot( p, p ), 0.0 ) ) - dot( d, V ), 0.0 ) / max( b.w, 1e-4 );
}
// A place seen at P, on a ball b, looked at along V: its normal, as long as the ball is wide.
vec3 tBall( vec3 P, vec3 V, vec4 b ) {
	vec3 d = P - b.xyz, p = d - dot( d, V ) * V;
	return ( p + V * sqrt( max( b.w * b.w - dot( p, p ), 0.0 ) ) ) / max( b.w, 1e-4 );
}
// How much of a ball b a ray from P toward L crosses, in radii.
float tChord( vec3 P, vec3 L, vec4 b ) {
	vec3 o = P - b.xyz;
	float h = dot( o, L ), d = h * h - dot( o, o ) + b.w * b.w;
	if ( d <= 0.0 ) return 0.0;
	float s = sqrt( d );
	return ( max( s - h, 0.0 ) - max( - s - h, 0.0 ) ) / max( b.w, 1e-4 );
}`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>
vec3 tPaleOf;
void RE_Direct_Leaf( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	if ( tLeafy < 0.5 ) {
		RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
		return;
	}
	vec3 L = directLight.direction;
	float wrap = saturate( ( dot( geometryNormal, L ) + ${f(MOON.wrap)} ) / ${f(1 + MOON.wrap)} );
	float through = exp( - ${f(MOON.crown)} * tChord( tP, L, tCrownB ) - ${f(MOON.clump)} * tChord( tP, L, tClumpB ) );
	float k = wrap * through * smoothstep( vTree.z - ${f(COVER.soft)}, vTree.z + ${f(COVER.soft)}, 1.0 - vLow );
	vec3 albedo = mix( material.diffuseContribution, tPaleOf, ${f(PALE.most)} * smoothstep( 0.15, 0.85, k ) );
	reflectedLight.directDiffuse += directLight.color * k * BRDF_Lambert( albedo );
}
#undef RE_Direct
#define RE_Direct RE_Direct_Leaf`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec4 tLeaf = texture2D( uLeaves, vLeafUv );
float tTile = ${tile('vLeafUv')};
float tBlob = 1.0 - step( 0.5, abs( tTile - ${f(TILES.blob)} ) ), tBark = 1.0 - step( 0.5, abs( tTile - ${f(TILES.bark)} ) );
float tA = tLeaf.a, tW = max( fwidth( tA ), 1e-3 );
tLeafy = 1.0 - max( tBark, tBlob );
tPaleOf = uPale;
if ( tBlob > 0.5 ) {
	if ( uPass < 0.5 || tA < 0.004 ) discard;
	diffuseColor = vec4( 0.0, 0.0, 0.0, tA );
} else {
	if ( uPass < 0.5 ) {
		if ( tA < 0.5 ) discard;
		diffuseColor.a = 1.0;
	} else {
		float e = clamp( ( tA - 0.5 ) / tW + 0.5, 0.0, 1.0 );
		if ( tA >= 0.5 || e < 0.004 ) discard;
		diffuseColor.a = e;
	}
	float h = tLeaf.g - 0.5 + ${f(CLUMPS.hue)} * ( fract( vPhase * 7.31 + vTree.x * 3.7 ) - 0.5 );
	vec3 c = vTone * mix( 0.42, 1.2, tLeaf.r ) * ( 1.0 + ${f(CLUMPS.light)} * ( 2.0 * fract( vPhase * 3.17 + vTree.x * 5.3 + 0.3 ) - 1.0 ) );
	c *= vec3( 1.0 + 0.25 * h, 1.0 + 0.04 * h, max( 0.0, 1.0 - 0.5 * abs( h ) ) );
	c.g = min( c.g, ${f(WARM.green)} * c.r );
	c.b = min( c.b, ${f(WARM.blue)} * c.g );
	tPaleOf = uPale * mix( 0.75, 1.1, tLeaf.r );
	diffuseColor.rgb = mix( c, uBark * mix( 0.55, 1.3, tLeaf.r ), tBark );
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix( roughnessFactor, ${f(ROUGH.bark)}, tBark );
roughnessFactor = mix( roughnessFactor, 1.0, tBlob );`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
material.specularColor *= ${f(SHEEN.face)};
material.specularColorBlended *= ${f(SHEEN.face)};
material.specularF90 = ${f(SHEEN.graze)};`)
      .replace('#include <opaque_fragment>', `outgoingLight *= 1.0 - tBlob;
outgoingLight += vec3( 2.0, 0.6, 0.0 ) * tBlob * step( 3.5, uLook );
#include <opaque_fragment>`)
      .replace('#include <normal_fragment_begin>', `${THREE.ShaderChunk.normal_fragment_begin.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;')}
float tOut = 0.0, tShut = 1.0, tBelow = 1.0;
tP = - vViewPosition;
tCrownB = vCrown;
tClumpB = vClump;
if ( vCrown.w > 1e-5 && tLeafy > 0.5 ) {
	vec3 V = normalize( vViewPosition );
	vec3 dK = tP - vCrown.xyz, nK = tBall( tP, V, vCrown );
	tOut = length( dK - dot( dK, V ) * V ) / max( vCrown.w, 1e-4 );
	normal = normalize( ${f(BALL.clump)} * tBall( tP, V, vClump ) + ${f(BALL.crown)} * nK + 1e-4 * V );
	tShut = exp( - ${f(INSIDE.crown)} * tDeep( tP, V, vCrown ) - ${f(INSIDE.clump)} * tDeep( tP, V, vClump ) );
	tBelow = mix( ${f(INSIDE.beneath)}, 1.0, smoothstep( - 0.6, 0.55, normalize( nK + 1e-4 * V ).y ) );
}`)
      .replace('#include <lights_fragment_end>', `{
	float night = mix( ${f(NIGHT.bark)}, ${f(NIGHT.leaf)} * tShut * tBelow * mix( ${f(NIGHT.covered)}, 1.0, wLight.y ) * ( 1.0 - ${f(COVER.night)} * vTree.z * vLow ), tLeafy );
	vec3 deep = mix( vec3( 1.0 ), diffuseColor.rgb / max( diffuseColor.r, 1e-4 ), ${f(DEEP)} * tLeafy );
	irradiance *= night * deep;
	iblIrradiance *= night * deep;
	float up = saturate( dot( normal, normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz ) ) );
	if ( uLook > 2.5 && uLook < 3.5 ) { irradiance *= 0.0; iblIrradiance *= 0.0; radiance *= 0.0; reflectedLight.directDiffuse *= 0.0; }
	irradiance += uTop * ( pow( up, ${f(TOP.tight)} ) * mix( ${f(TOP.covered)}, 1.0, wLight.y ) * tLeafy * mix( 1.0, tShut, 0.5 ) * ( 1.0 - 0.5 * vTree.z * vLow ) );
	radiance *= mix( 1.0, night, tLeafy );
	reflectedLight.directDiffuse *= mix( 1.0, 1.0 + ${f(FACE)} * ( 2.0 * tLeaf.b - 1.0 ), tLeafy );
	if ( uLook > 1.5 && uLook < 2.5 ) { reflectedLight.directDiffuse *= 0.0; reflectedLight.directSpecular *= 0.0; }
	if ( uLook > 0.5 && uLook < 1.5 ) { irradiance *= 0.0; iblIrradiance *= 0.0; radiance *= 0.0; }
}
#include <lights_fragment_end>`)
      .replace('#include <aomap_fragment>', `{
	vec3 toCity = normalize( ( viewMatrix * vec4( 0.0, 0.2, - 1.0, 0.0 ) ).xyz );
	float edge = pow( 1.0 - saturate( dot( normal, geometryViewDir ) ), ${f(RIM.tight)} ) * smoothstep( 0.5, 0.95, tOut );
	float through = vTree.y * edge * ( 0.4 + 0.6 * saturate( dot( normal, toCity ) + 0.5 ) ) * tLeafy * step( uLook, 0.5 );
	reflectedLight.indirectDiffuse += uRim * diffuseColor.rgb * through;
}
#include <aomap_fragment>`);
  };
  return lit(m, { key: 'trees', baked: true, core: false });
}

// The moon's shadow pass for the trees: the leaves cut out of their cards by the same atlas, each clump where the
// passes draw it, and nothing of the shade under a tree.
export function treeDepth(map: THREE.Texture, uniforms: TreeUniforms): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>${MOVE_PARS}`).replace('#include <begin_vertex>', `#include <begin_vertex>${MOVE(false)}`);
  };
  m.customProgramCacheKey = () => 'trees-depth';
  return m;
}
