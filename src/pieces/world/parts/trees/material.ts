import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lit } from '../../light';
import { ATLAS, TILES } from './design';

// The trees' one material, drawn twice. The first pass draws every pixel that is more than half leaf, solid, with
// its depth: so crowns hide one another exactly, whatever order they are drawn in. The second draws only the soft
// edge of each leaf over what is already there, without depth, so no leaf has a stair stepped edge and nothing
// sparkles. Both passes are one shader program, told apart by a uniform; the moon's shadow pass cuts the leaves
// out by the same atlas.
//
// A leaf is the tree's own shade (an instance's aTone) times the atlas's lightness and hue for that leaf. It is lit
// by the world's light as a place on two balls at once, its clump's and its crown's, each seen from where the
// viewer is (the make script stores both with every vertex): so a clump is round whichever way its cards lie, and
// the crown is one soft mass with its clumps standing in it, the moon on its upper right, the night's soft light on
// its front, darker inside and beneath by its stored openness. Round its outline, where the city's windows stand
// behind it, light comes through its leaves, warm.

// How the leaves move in the air: how far, in a crown's own units, and how fast, in radians a second.
export const AIR = { reach: 0.012, rate: [0.55, 1.37, 0.83] } as const;
// The bark's color, as a share of the palette's darkest bronze, and how rough each thing is.
const BARK = { color: 'bronze-deep', power: 0.3 } as const;
const ROUGH = { leaf: 0.72, bark: 0.95 };
// Light through the leaves at a crown's outline from the lit city behind it, as a share of the palette's hot light,
// how tight to the outline it keeps, and how much a crowded tree's lower crown is shut in from the night.
const RIM = { color: 'hot', power: 2.6, tight: 2.0 } as const;
const CROWD = 0.45;
// Leaves and bark are matte: how much of the standard sheen they keep, head on and at a grazing angle. At the world's
// low view the full sheen lit every card turned edge on as a pale grey.
const SHEEN = { face: 0.5, graze: 0.12 };
// How much a leaf turned toward the light catches more of it than one turned away.
const FACE = 0.3;
// How much of the normal a leaf is lit by is its clump's ball, and how much its crown's.
const BALL = { clump: 0.75, crown: 0.7 };
// Leaves deep in the crown and in their clump, behind the front of each ball, are shut in: how fast the light goes
// with depth (in radii) for each, and how much of that the moon's own light also loses. A leaf turned down, under
// the crown, keeps this share of the night's light.
const INSIDE = { crown: 2, clump: 1.5, moon: 0.6, beneath: 0.2 };
// How far one clump's shade differs from the next in hue and in lightness.
const CLUMPS = { hue: 0.5, light: 0.16 };
// How much richer a leaf's color is than its shade: autumn leaves are deeper than the metals they are named for.
const RICH = 1.25;
// The most green a leaf may have against its red, and blue against its green, in linear light. A pale leaf with
// more turned khaki once the stage's white balance took the warm light out of it, and read as olive.
const WARM = { green: 0.38, blue: 0.35 };

const f = (v: number): string => v.toFixed(5);

export function treeMaterial(map: THREE.Texture, pass: 0 | 1): { material: THREE.MeshStandardMaterial; uniforms: { uTime: { value: number }; uAir: { value: number } } } {
  // Both passes are transparent, so both are one program; three draws a transparent card's back and its front in two
  // passes of their own, which drew every leaf twice and made a third program, unless it is told not to.
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: ROUGH.leaf, metalness: 0, side: THREE.DoubleSide, transparent: true, depthWrite: pass === 0, forceSinglePass: true });
  const bark = new THREE.Color(hex(BARK.color)).multiplyScalar(BARK.power), rim = new THREE.Color(hex(RIM.color)).multiplyScalar(RIM.power);
  const uniforms = { uTime: { value: 0 }, uAir: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms, { uLeaves: { value: map }, uPass: { value: pass }, uBark: { value: bark }, uRim: { value: rim } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec3 aTone;
attribute vec4 aTree;
attribute vec2 sway;
attribute vec4 clump;
attribute vec4 crown;
varying vec4 vClump;
varying vec4 vCrown;
varying float vPhase;
uniform float uTime;
uniform float uAir;
varying vec2 vLeafUv;
varying vec3 vTone;
varying vec4 vTree;
varying float vLow;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
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
	vClump = vec4( ( mvi * vec4( clump.xyz, 1.0 ) ).xyz, clump.w * sc );
	vCrown = vec4( ( mvi * vec4( crown.xyz, 1.0 ) ).xyz, crown.w * sc );
}
{
	float ph = 6.2831853 * ( aTree.x + sway.y );
	transformed += sway.x * uAir * vec3( sin( uTime * ${f(AIR.rate[0])} + ph ) + 0.4 * sin( uTime * ${f(AIR.rate[1])} + 1.7 * ph ), 0.35 * sin( uTime * ${f(AIR.rate[2])} + 0.6 * ph ), cos( uTime * ${f(AIR.rate[2])} + 1.3 * ph ) );
}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uLeaves;
uniform float uPass;
uniform vec3 uBark;
uniform vec3 uRim;
varying vec2 vLeafUv;
varying vec3 vTone;
varying vec4 vTree;
varying float vLow;
varying vec4 vClump;
varying vec4 vCrown;
varying float vPhase;
// How shut in a place seen at P is by a ball about c of radius r, looked at along V: by how far it lies behind the
// ball's front, in radii.
float tDeep( vec3 P, vec3 V, vec4 b ) {
	vec3 d = P - b.xyz, p = d - dot( d, V ) * V;
	return max( sqrt( max( b.w * b.w - dot( p, p ), 0.0 ) ) - dot( d, V ), 0.0 ) / max( b.w, 1e-4 );
}
// A place seen at P, on a ball about c of radius r, looked at along V: its normal, as long as the ball is wide.
vec3 tBall( vec3 P, vec3 V, vec4 b ) {
	vec3 d = P - b.xyz, p = d - dot( d, V ) * V;
	return ( p + V * sqrt( max( b.w * b.w - dot( p, p ), 0.0 ) ) ) / max( b.w, 1e-4 );
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec4 tLeaf = texture2D( uLeaves, vLeafUv );
float tTile = floor( vLeafUv.x * ${f(ATLAS.cols)} ) + ${f(ATLAS.cols)} * floor( vLeafUv.y * ${f(ATLAS.rows)} );
float tBlob = 1.0 - step( 0.5, abs( tTile - ${f(TILES.blob)} ) ), tBark = 1.0 - step( 0.5, abs( tTile - ${f(TILES.bark)} ) );
float tA = tLeaf.a, tW = max( fwidth( tA ), 1e-3 );
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
	float h = tLeaf.g - 0.5 + ${f(CLUMPS.hue)} * ( fract( vPhase * 7.31 ) - 0.5 );
	vec3 c = vTone * mix( 0.38, 1.25, tLeaf.r ) * ( 1.0 + ${f(CLUMPS.light)} * ( 2.0 * fract( vPhase * 3.17 + 0.3 ) - 1.0 ) );
	c *= vec3( 1.0 + 0.3 * h, 1.0 + 0.05 * h, max( 0.0, 1.0 - 0.6 * abs( h ) ) );
	c = max( mix( vec3( dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) ), c, ${f(RICH)} ), 0.0 );
	c.g = min( c.g, ${f(WARM.green)} * c.r );
	c.b = min( c.b, ${f(WARM.blue)} * c.g );
	diffuseColor.rgb = mix( c, uBark * mix( 0.5, 1.25, tLeaf.r ), tBark );
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix( roughnessFactor, ${f(ROUGH.bark)}, tBark );
roughnessFactor = mix( roughnessFactor, 1.0, tBlob );`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
material.specularColor *= ${f(SHEEN.face)};
material.specularColorBlended *= ${f(SHEEN.face)};
material.specularF90 = ${f(SHEEN.graze)};`)
      .replace('#include <opaque_fragment>', `outgoingLight *= 1.0 - tBlob;
#include <opaque_fragment>`)
      .replace('#include <normal_fragment_begin>', `${THREE.ShaderChunk.normal_fragment_begin.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;')}
float tOut = 0.0, tShut = 1.0, tBelow = 1.0;
if ( vCrown.w > 1e-5 && tBlob + tBark < 0.5 ) {
	vec3 P = - vViewPosition, V = normalize( vViewPosition );
	vec3 dK = P - vCrown.xyz, nK = tBall( P, V, vCrown );
	tOut = length( dK - dot( dK, V ) * V ) / max( vCrown.w, 1e-4 );
	normal = normalize( ${f(BALL.clump)} * tBall( P, V, vClump ) + ${f(BALL.crown)} * nK + 1e-4 * V );
	tShut = exp( - ${f(INSIDE.crown)} * tDeep( P, V, vCrown ) - ${f(INSIDE.clump)} * tDeep( P, V, vClump ) );
	tBelow = mix( ${f(INSIDE.beneath)}, 1.0, smoothstep( - 0.7, 0.5, normalize( nK + 1e-4 * V ).y ) );
}`)
      .replace('#include <lights_fragment_end>', `{
	float leafy = 1.0 - max( tBark, tBlob );
	irradiance *= ( 1.0 - ${f(CROWD)} * vTree.z * vLow ) * tShut * tBelow;
	reflectedLight.directDiffuse *= mix( 1.0, tShut, ${f(INSIDE.moon)} );
	reflectedLight.directDiffuse *= mix( 1.0, 1.0 + ${f(FACE)} * ( 2.0 * tLeaf.b - 1.0 ), leafy );
}
#include <lights_fragment_end>`)
      .replace('#include <aomap_fragment>', `{
	vec3 toCity = normalize( ( viewMatrix * vec4( 0.0, 0.2, - 1.0, 0.0 ) ).xyz );
	float edge = pow( 1.0 - saturate( dot( normal, geometryViewDir ) ), ${f(RIM.tight)} ) * smoothstep( 0.5, 0.95, tOut );
	float through = vTree.y * edge * ( 0.4 + 0.6 * saturate( dot( normal, toCity ) + 0.5 ) ) * ( 1.0 - max( tBark, tBlob ) );
	reflectedLight.indirectDiffuse += uRim * diffuseColor.rgb * through;
}
#include <aomap_fragment>`);
  };
  return { material: lit(m, { key: 'trees', baked: true, core: false }), uniforms };
}

// The moon's shadow pass for the trees: the leaves cut out of their cards by the same atlas, and nothing of the
// shadow under a tree.
export function treeDepth(map: THREE.Texture): THREE.MeshDepthMaterial {
  return new THREE.MeshDepthMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide });
}
