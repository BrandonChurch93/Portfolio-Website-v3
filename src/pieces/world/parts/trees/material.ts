import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { SCALE } from '../../layout';
import { lit } from '../../light';
import { NIGHT as SKY } from '../../night';
import { ATLAS, TILES } from './design';

// The trees' one material, drawn twice. The first pass draws every pixel that is more than half leaf, solid, with
// its depth: so crowns hide one another exactly, whatever order they are drawn in. The second draws only the soft
// edge of each leaf, and the shade each tree lays on the ground, over what is already there, without depth, so no
// leaf has a stair stepped edge and nothing sparkles. Both passes are one shader program, told apart by a uniform;
// the moon's shadow pass cuts the leaves out by the same atlas and places them as the passes do, but holds them
// still: the moon's shadows are drawn once, and nothing that moves may cast one.
//
// Each lump's card that faces the viewer is turned, mirrored and handed one of the four outlines by its tree's own
// number, so no two trees show the same lump. A card crossed through a lump fades out as it turns edge on to the
// viewer, where its leaves would smear into a streak.
//
// A leaf is the tree's own shade (an instance's aTone) times the atlas's lightness and hue for that leaf. Every leaf
// of a lump stands for the front of its lump and its mass, and is lit as a place on three balls at once, its lump's,
// its mass's and its crown's (the make script stores all three with every vertex). The crown is lit as one thing:
// the moon, behind the world and to the right, reaches a leaf through the crown (so the crown's upper right takes it
// and its heart does not) and wraps a little round it. Each of its three to five masses breaks that light up, its
// top lit and its underside dark, and each lump a little more (tLump); a lump the crown's other lumps shut in (its
// stored openness, tOpen) takes little of the moon or the night, so the gaps between masses fall to deep brown. What is deep behind the crown's
// front, seen through the gaps between lumps, is its dark heart (tHeart). What the moon lights turns toward a tan,
// never toward a hotter orange, and so does the rest of the light on what the moon lights. The light of the sky
// from above and the night's soft light from the viewer's side are broken up by the lumps the same way, and shut
// out of the crown's inside and underside. Round its outline, where the city's windows stand behind it, light comes
// through its leaves, warm. A tree in the shade of the trees or the buildings nearer the moon (an instance's aTree.z)
// takes that much less of it.

// How the leaves move in the air: how far, in a crown's own units, and how fast, in radians a second.
export const AIR = { reach: 0.01, rate: [0.55, 1.37, 0.83] } as const;
// How far each lump of a tree is moved from where its model has it, in a crown's own units, so that no two trees
// of one model have the same outline.
export const JITTER = 0.09;
// The bark's color, as a mix of the palette's darkest bronze and a warm grey, how bright, how far its ridges and
// cracks differ in lightness, how much of its light the foot of the trunk keeps, in the crown's shade, and how deep
// its ridges stand in relief (a height of the atlas's lightness, in a crown's units), and how wide a ridge has to
// be drawn (in pixels) before its light and its relief begin to show and are whole: under that a trunk drawn a
// pixel or two wide broke into a dashed stub. And how rough each thing is.
const BARK = { color: 'bronze-deep', grey: 'text-3', mix: 0.08, power: 0.85, ridge: [0.55, 1.3], foot: 0.6, relief: 0.06, shown: [1.5, 3.5], ridges: 8.5 } as const;
const ROUGH = { leaf: 0.72, bark: 0.95 };
// Light through the leaves at a crown's outline from the lit city behind it, as a share of the palette's hot light,
// and how tight to the outline it keeps.
const RIM = { color: 'hot', power: 0.4, tight: 2.0 } as const;
// The shade of the trees and buildings nearer the moon (aTree.z, the share of the crown's height it covers): how
// soft its edge is, how much of the night it also takes from the leaves in it, and how much moon the bark keeps in it.
const COVER = { soft: 0.18, night: 0.4, bark: 0.15 };
// Leaves and bark are matte: how much of the standard sheen they keep, head on and at a grazing angle.
const SHEEN = { face: 0.12, graze: 0.03 };
// How much a leaf turned toward the light catches more of it than one turned away.
const FACE = 0.35;
// How much of the normal a leaf is lit by is its lump's ball, its mass's and its crown's. The crown is lit as one
// thing, its three to five masses break that light up, and a lump only a little: lit lump by lump, every lump wore a
// lit edge of its own and a crown read as cauliflower.
const BALL = { clump: 0.08, mass: 0.7, crown: 0.8 };
// Where a leaf is lit: this share of the way from the front of its lump's ball to the front of its mass's.
const PLACE = 0.8;
// The moon in a crown: how far its light wraps round the crown past the line where it would set, how much of it the
// leaves let through for each radius of crown it crosses on its way in, and how bright. The moon is behind the world
// and to the right, so what it reaches is the crown's upper right, and its light there is a real share of what it
// gives the buildings beside the belt.
const MOON = { wrap: 0.12, crown: 1.7, power: 1.15 };
// A lump within its crown's one light: the share of the crown's light its foot keeps, against its top, and how far
// toward straight up the side of a lump that is lit turns from the moon. So a lump has a lit top and a shaded foot,
// and a lump on the crown's shaded side is dim all over: the lump only breaks up the crown's light, never caps it.
const LUMP = { foot: 0.9, up: 0.6, edge: [-0.45, 0.75] } as const;
// A mass within its crown's light, as a lump within its mass: its foot keeps this much of its top's light, so each
// mass has a lit top and a dark underside where it meets the mass below it.
const MASS = { foot: 0.3, up: 0.5, edge: [-0.55, 0.65] } as const;
// What a lump's stored openness (how much of the sky round it the crown's other lumps leave open) does: the moon
// and the sky reach a shut lump this much at least, whole from `full`, so only the lumps on the crown's outside and
// top catch them and its middle and the gaps between masses fall to deep brown.
const OPEN = { least: 0.25, from: 0.15, full: 0.6 } as const;
// How the atlas's lightness (red) becomes how light a leaf is: what the darkest (the dark mat between sprigs) and
// the lightest keep of the tree's own shade.
const PAINT = [0.38, 1.28] as const;
// What the moon and the sky turn a leaf they light toward, and how far at most: a tan, never the leaf's own shade
// made brighter. From how much of the moon a leaf takes it starts and is whole, and how far the night and the fill on
// such a leaf are turned to the same hue (ambient), so a lit top reads tan and not salmon.
const PALE = { color: 'copper-light', toward: 'pale', mix: 0.22, power: 0.7, most: 0.85, from: 0.05, full: 0.6, top: 0.65, back: 1.0, ambient: 0.75 } as const;
// The night's soft light on the leaves, against what it gives everything else on top of the world, and how much of
// it reaches a leaf with no sky above it, against one under open sky.
// It falls on a crown as on one ball: what of the crown faces away from it (its foot and underside) keeps `crown`
// of it, so each crown reads round at the page's size, lit above and dark beneath, and not as an even mat of leaves.
const NIGHT = { leaf: 1.45, bark: 0.7, covered: 0.45, crown: 0.2, turn: [-0.35, 0.75] } as const;
// The light inside a crown has come through leaves, and takes their color: how much of the leaf's own color it
// takes again, so a crown's shade is a deep red brown and not the leaf's shade made darker.
const DEEP = 0.15;
// The light of the sky over a crown, from above and about the moon: what makes a crown's top paler than its sides.
// Its color as the palette's pale, how bright, and how tightly it keeps to what faces straight up.
const TOP = { color: 'copper-light', toward: 'pale', mix: 0.15, power: 2.2, tight: 1.6, covered: 0.4, lump: 0.55 } as const;
// The light that has come through the leaves and lights the crown from inside, most where the crown is open and on
// its side toward the moon: what keeps a crown's shade a rich red brown and not black, and still leaves the side
// away from the moon darker. Its color, how bright, how much of it reaches the most shut in place and the side
// turned straight away from the moon.
const FILL = { color: 'copper', grey: 'text-2', mix: 0.5, power: 3.6, shut: 0.68, away: 0.36 } as const;
// Leaves deep in the crown, behind the front of its ball, are shut in: how fast the night's light goes with depth
// (in radii), and how much of the moon's, the sky's and the fill's goes with it, so what is seen through the gaps
// between lumps is the crown's dark heart. A leaf turned down, under the crown, keeps this share of the night.
const INSIDE = { crown: 1.6, rest: 1.8, front: 0.3, beneath: 0.3 };
// How far one lump's shade differs from the next in hue and in lightness.
const CLUMPS = { hue: 0.4, light: 0.28 };
// The most green a leaf may have against its red, and blue against its green, in linear light.
const WARM = { green: 0.62, blue: 0.55 };
// A card crossed through a lump is gone by the time it is turned this far edge on (the cosine of its angle to the
// line of sight), and whole from here.
const GLANCE = [0.16, 0.42] as const;
// The moon behind the crown, caught in the leaves of its outline on the moon's side, as a crisp bright rim: how
// bright, how close to the outline it keeps (a share of the crown's radius seen from the viewer), and how sharply it
// turns to the moon.
const BACKLIT = { power: 0.7, from: 0.68, turn: 2.0 } as const;
// The crown's outline away from the moon falls to the darks, so between two neighbouring crowns there is a dark gap
// and each crown is told from the next: from how far out (a share of its radius seen from the viewer) and how dark
// at the outline, on the side turned from the moon (by how much it faces the moon across the screen, from and to).
const LIMB = { from: 0.62, dark: 0.5, moon: [-0.1, 0.55] } as const;
// The lightest leaves, whatever light made them so, are turned toward a tan and held down a little, value and
// saturation together, as picture 9's lit tops are tan and not a hotter orange: the tan (a mix of two of the
// palette's colors), from what luminance (in linear light, before the stage's tone curve) the turn starts and where
// it is whole, how far it goes there, and how much it darkens.
const GRADE = { color: 'copper-light', toward: 'pale', mix: 0.25, from: 0.06, full: 0.5, most: 0.75, dim: 0.2 } as const;
// The shade on the ground is drawn this much nearer the viewer along the line of sight, in units, so the land's
// own small rises do not cut it into strips. At the world's low view that lifts it off the ground by a tenth of it.
const NEARER = 6;
// How much deeper the shade on the ground is drawn than the atlas holds it (a power of what it lets through): the
// paving under the belt is pale, and the shade has to read on it as the belt's own dark earth.
const GROUNDED = 1.7;
// The shade on the ground fades out over this much (in crown units) before the land's edge behind the trunk and to
// each side of it.
const KEEP = 0.35;
// On sand the moon's own shadow of a tree lies on the dune from the shadow map, and the dark earth the shade stands
// for is not there: this share of the shade goes where there is sand under it (aReach.w, the most anywhere on it),
// all but the pool at the trunk's foot, from this far from the trunk to this (in crown units), so the shade never
// lies on a dune as a dark wedge.
const SAND = { most: 0.9, from: 0.4, full: 1.4 } as const;
// Where a leaf is drawn in depth: drawn where its flat card lies, two cards crossing met in a ruler straight line, and
// two lumps or two trees met as flat cards do. Each leaf is drawn this share of the way from its card to the front of
// its lump's ball, so lumps meet one another as balls do, and stands nearer by as much as it is lighter in the atlas
// (relief, in its lump's radii: a sprig's lit top is nearer than the dark between sprigs), so where two cards or
// two lumps meet the line follows the leaves. The card that faces the viewer stands a little nearer (face).
const DEPTH = { pull: 0.65, relief: 0.4, mid: 0.5, face: 0.06 } as const;
// Each tree keeps its own shade where a light turns its leaves pale: the pale a leaf turns toward is made as much
// darker or lighter as the tree's own shade is against the belt's middle shade (`mid`, a palette color), to this
// power, and leans this far toward the tree's own hue, so a deep brown crown's lit top is a dark tan and a cream
// crown's a pale cream, and the belt reads as a row of different trees and not one rust.
const TONED = { mid: 'bronze', keep: 0.9, hue: 0.5, range: [0.25, 1.8] } as const;
// ?treelook=moon, night or top shows one light alone, shade the shade on the ground lit, mask every leaf and
// trunk in one flat red, so a script can tell the trees' pixels from the rest of a still, and tone each tree's own
// shade unlit. ?treelook=flat writes no depth of the leaves' own (DEPTH), so what that costs can be measured.
const LOOKS: Record<string, number> = { moon: 1, night: 2, top: 3, shade: 4, mask: 5, lump: 6, heart: 7, tone: 8 };

const f = (v: number): string => v.toFixed(5);
const tile = (uv: string): string => `( floor( ${uv}.x * ${f(ATLAS.cols)} ) + ${f(ATLAS.cols)} * floor( ${uv}.y * ${f(ATLAS.rows)} ) )`;

// Where a vertex goes, which the passes and the moon's shadow pass share: each lump's card that faces the viewer
// turned, mirrored and given another outline (tUv) by its tree's own number, then turned back from the tree's own
// turn so it still faces the viewer, each lump moved by its tree's own number, the leaves in a slow air (not in the
// shadow pass), and the shade on the ground turned to lie away from the moon and cut short where the land ends
// (aTree.w). The shadow pass lays no shade.
const MOVE = (shade: boolean, air: boolean): string => `
vec4 tClumpAt = clump;
vec2 tUv = uv;
float tShadeV = 0.0;
vec2 tShadeAt = vec2( 0.0 );
if ( abs( ${tile('uv')} - ${f(TILES.blob)} ) < 0.5 ) {
	tShadeV = 1.0;
	${shade ? `vec3 rel = transformed - clump.xyz;
	tShadeAt = rel.xz * uCube;
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
		if ( sway.z > 0.5 ) {
			float ha = fract( sin( aTree.x * 47.13 + sway.y * 91.7 + 0.11 ) * 43758.5453 ), hb = fract( sin( aTree.x * 13.71 + sway.y * 27.3 + 0.53 ) * 24634.6345 );
			vec3 rel = transformed - clump.xyz;
			rel.x *= fract( hb * 7.0 ) < 0.5 ? - 1.0 : 1.0;
			float ca = cos( 6.2831853 * ha ), sa = sin( 6.2831853 * ha );
			rel.xy = vec2( ca * rel.x - sa * rel.y, sa * rel.x + ca * rel.y );
			vec3 ax = instanceMatrix[ 0 ].xyz / max( length( instanceMatrix[ 0 ].xyz ), 1e-6 );
			transformed = clump.xyz + vec3( ax.x * rel.x + ax.z * rel.z, rel.y, - ax.z * rel.x + ax.x * rel.z );
			if ( tUv.y < ${f(1 / ATLAS.rows)} ) tUv.x = fract( tUv.x + floor( hb * ${f(TILES.lumps.length)} ) / ${f(ATLAS.cols)} );
			else tUv.x = mod( tUv.x + floor( hb * ${f(TILES.core.length)} ) / ${f(ATLAS.cols)}, ${f(TILES.core.length / ATLAS.cols)} );
		}
	#endif
	vec3 j = ( fract( sin( vec3( 12.9898, 78.233, 37.719 ) * ( aTree.x * 91.7 + sway.y * 13.1 + 0.37 ) ) * 43758.5453 ) - 0.5 ) * ( 2.0 * uJitter );
	j.y *= 0.6;
	transformed += j;
	tClumpAt.xyz += j;
}
${air ? `{
	float ph = 6.2831853 * ( aTree.x + sway.y );
	transformed += sway.x * uAir * vec3( sin( uTime * ${f(AIR.rate[0])} + ph ) + 0.4 * sin( uTime * ${f(AIR.rate[1])} + 1.7 * ph ), 0.35 * sin( uTime * ${f(AIR.rate[2])} + 0.6 * ph ), cos( uTime * ${f(AIR.rate[2])} + 1.3 * ph ) );
}` : ''}`;
const MOVE_PARS = `
attribute vec4 aTree;
attribute vec3 sway;
attribute vec4 clump;
uniform float uTime;
uniform float uAir;
uniform float uJitter;
uniform vec2 uShade;
uniform float uCube;`;

export interface TreeUniforms { uTime: { value: number }; uAir: { value: number }; uJitter: { value: number }; uShade: { value: THREE.Vector2 }; uCube: { value: number } }
export function treeUniforms(): TreeUniforms {
  return { uTime: { value: 0 }, uAir: { value: 0 }, uJitter: { value: 0 }, uShade: { value: new THREE.Vector2(-1, 0) }, uCube: { value: 1 } };
}

export function treeMaterial(map: THREE.Texture, pass: 0 | 1, uniforms: TreeUniforms, look: string | null): THREE.MeshStandardMaterial {
  // Both passes are transparent, so both are one program; three draws a transparent card's back and its front in two
  // passes of their own, which drew every leaf twice and made a third program, unless it is told not to.
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: ROUGH.leaf, metalness: 0, side: THREE.DoubleSide, transparent: true, depthWrite: pass === 0, forceSinglePass: true });
  const bark = new THREE.Color(hex(BARK.color)).lerp(new THREE.Color(hex(BARK.grey)), BARK.mix).multiplyScalar(BARK.power), rim = new THREE.Color(hex(RIM.color)).multiplyScalar(RIM.power);
  const top = new THREE.Color(hex(TOP.color)).lerp(new THREE.Color(hex(TOP.toward)), TOP.mix).multiplyScalar(TOP.power), fill = new THREE.Color(hex(FILL.color)).lerp(new THREE.Color(hex(FILL.grey)), FILL.mix).multiplyScalar(FILL.power);
  const pale = new THREE.Color(hex(PALE.color)).lerp(new THREE.Color(hex(PALE.toward)), PALE.mix).multiplyScalar(PALE.power);
  const tan = new THREE.Color(hex(GRADE.color)).lerp(new THREE.Color(hex(GRADE.toward)), GRADE.mix);
  const mc = new THREE.Color(hex(TONED.mid)), mid = 0.2126 * mc.r + 0.7152 * mc.g + 0.0722 * mc.b;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms, { uLeaves: { value: map }, uPass: { value: pass }, uBark: { value: bark }, uRim: { value: rim }, uPale: { value: pale }, uMid: { value: mid }, uTan: { value: tan }, uTop: { value: top }, uFill: { value: fill }, uNearer: { value: NEARER * SCALE }, uLook: { value: LOOKS[look ?? ''] ?? 0 } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>${MOVE_PARS}
attribute vec3 aTone;
attribute vec4 crown;
attribute vec4 mass;
attribute vec4 aReach;
uniform float uNearer;
varying vec2 vShadeAt;
varying vec4 vReach;
varying vec4 vClump;
varying vec4 vMass;
varying vec4 vCrown;
varying float vPhase;
varying float vView;
varying vec2 vLeafUv;
varying vec3 vTone;
varying vec4 vTree;
varying float vLow;`)
      .replace('#include <project_vertex>', `${THREE.ShaderChunk.project_vertex.replace('gl_Position =', `mvPosition.xyz *= 1.0 - tShadeV * uNearer / max( length( mvPosition.xyz ), 1e-4 );
gl_Position =`)}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
${MOVE(true, true)}
vLeafUv = tUv;
vShadeAt = tShadeAt;
vReach = aReach;
vTone = aTone;
vTree = aTree;
vLow = aBounce.w;
vPhase = sway.y;
vView = sway.z;
{
	#ifdef USE_INSTANCING
		mat4 mvi = modelViewMatrix * instanceMatrix;
	#else
		mat4 mvi = modelViewMatrix;
	#endif
	float sc = length( ( mvi * vec4( 1.0, 0.0, 0.0, 0.0 ) ).xyz );
	vClump = vec4( ( mvi * vec4( tClumpAt.xyz, 1.0 ) ).xyz, tClumpAt.w * sc );
	vCrown = vec4( ( mvi * vec4( crown.xyz, 1.0 ) ).xyz, crown.w * sc );
	vMass = vec4( ( mvi * vec4( mass.xyz, 1.0 ) ).xyz, mass.w * sc );
}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform mat4 projectionMatrix;
uniform sampler2D uLeaves;
uniform float uPass;
uniform float uLook;
uniform vec3 uBark;
uniform vec3 uRim;
uniform vec3 uPale;
uniform float uMid;
uniform vec3 uTan;
uniform vec3 uTop;
uniform vec3 uFill;
varying vec2 vLeafUv;
varying vec2 vShadeAt;
varying vec4 vReach;
varying vec3 vTone;
varying vec4 vTree;
varying float vLow;
varying vec4 vClump;
varying vec4 vMass;
varying vec4 vCrown;
varying float vPhase;
varying float vView;
vec3 tP;
vec4 tCrownB;
vec4 tClumpB;
float tLeafy;
vec3 tNK;
vec3 tNL;
vec3 tNM;
vec3 tNR;
float tOpen;
vec3 tUpV = vec3( 0.0, 1.0, 0.0 );
vec3 tS;
float tEdge = 0.0;
float tHeart = 1.0;
// How lit a lump is about its own ball by a light from L: its foot keeps LUMP.foot, its top is whole.
float tLump( vec3 L ) {
	return mix( ${f(LUMP.foot)}, 1.0, smoothstep( ${f(LUMP.edge[0])}, ${f(LUMP.edge[1])}, dot( tNL, normalize( L + ${f(LUMP.up)} * tUpV ) ) ) )
		* mix( ${f(MASS.foot)}, 1.0, smoothstep( ${f(MASS.edge[0])}, ${f(MASS.edge[1])}, dot( tNM, normalize( L + ${f(MASS.up)} * tUpV ) ) ) );
}
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
	if ( d <= 0.0 || b.w < 1e-5 ) return 0.0;
	float s = sqrt( d );
	return ( max( s - h, 0.0 ) - max( - s - h, 0.0 ) ) / max( b.w, 1e-4 );
}`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>
vec3 tPaleOf;
float tCover;
float tSeen = 0.0;
// A color turned to the pale's hue at its own lightness.
vec3 tTan( vec3 c ) {
	vec3 w = vec3( 0.2126, 0.7152, 0.0722 );
	return tPaleOf * dot( c, w ) / max( dot( tPaleOf, w ), 1e-4 );
}
void RE_Direct_Leaf( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 L = directLight.direction;
	if ( tLeafy < 0.5 ) {
		IncidentLight b = directLight;
		b.color *= exp( - ${f(MOON.crown)} * tChord( tP, L, tCrownB ) ) * mix( 1.0, ${f(COVER.bark)}, smoothstep( 0.05, 0.4, vTree.z ) );
		RE_Direct_Physical( b, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
		return;
	}
	float wrap = saturate( ( dot( tNR, L ) + ${f(MOON.wrap)} ) / ${f(1 + MOON.wrap)} );
	float through = exp( - ${f(MOON.crown)} * tChord( tS, L, tCrownB ) );
	float seen = wrap * through * tCover * tLump( L ) * tHeart * tOpen, k = seen * ${f(MOON.power)};
	if ( dot( directLight.color, vec3( 1.0 ) ) > 1e-3 ) tSeen = max( tSeen, seen );
	vec3 albedo = mix( material.diffuseContribution, tPaleOf, ${f(PALE.most)} * smoothstep( ${f(PALE.from)}, ${f(PALE.full)}, seen ) );
	reflectedLight.directDiffuse += directLight.color * k * BRDF_Lambert( albedo );
	vec3 sN = tNK - dot( tNK, geometryViewDir ) * geometryViewDir;
	float back = smoothstep( ${f(BACKLIT.from)}, 1.0, tEdge ) * pow( saturate( dot( sN / max( length( sN ), 1e-4 ), L ) ), ${f(BACKLIT.turn)} );
	reflectedLight.directDiffuse += directLight.color * ( ${f(BACKLIT.power)} * back * tCover * tLump( L ) ) * BRDF_Lambert( mix( material.diffuseContribution, tPaleOf, ${f(PALE.back)} ) );
}
#undef RE_Direct
#define RE_Direct RE_Direct_Leaf`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec4 tLeaf = texture2D( uLeaves, vLeafUv );
float tTile = ${tile('vLeafUv')};
float tBlob = 1.0 - step( 0.5, abs( tTile - ${f(TILES.blob)} ) ), tBark = 1.0 - step( 0.5, abs( tTile - ${f(TILES.bark)} ) );
tLeafy = 1.0 - max( tBark, tBlob );
float tA = tLeaf.a;
if ( tLeafy > 0.5 && vView < 0.5 ) {
	vec3 fn = cross( dFdx( vViewPosition ), dFdy( vViewPosition ) );
	float fl = length( fn ), vl = length( vViewPosition );
	float g = fl > 1e-20 && vl > 1e-6 ? abs( dot( fn / fl, vViewPosition / vl ) ) : 1.0;
	tA *= smoothstep( ${f(GLANCE[0])}, ${f(GLANCE[1])}, g );
}
float tW = max( fwidth( tA ), 1e-3 );
float tRidge = smoothstep( ${f(BARK.shown[0])}, ${f(BARK.shown[1])}, ${f((1.9 * 0.5) / ATLAS.cols / BARK.ridges)} / max( fwidth( vLeafUv.x ), 1e-6 ) );
tPaleOf = uPale;
tCover = smoothstep( vTree.z - ${f(COVER.soft)}, vTree.z + ${f(COVER.soft)}, 1.0 - vLow );
if ( tBlob > 0.5 ) {
	if ( uPass < 0.5 || tA < 0.004 ) discard;
	// Cut where the land ends behind the trunk and to each side (vReach, in crown units), softly.
	float tIn = ( 1.0 - smoothstep( vReach.x - ${f(KEEP)}, vReach.x, - vShadeAt.x ) ) * ( 1.0 - smoothstep( vReach.y - ${f(KEEP)}, vReach.y, - vShadeAt.y ) ) * ( 1.0 - smoothstep( vReach.z - ${f(KEEP)}, vReach.z, vShadeAt.y ) );
	diffuseColor = vec4( 0.0, 0.0, 0.0, ( 1.0 - pow( 1.0 - min( tA, 0.999 ), ${f(GROUNDED)} ) ) * tIn * ( 1.0 - ${f(SAND.most)} * vReach.w * smoothstep( ${f(SAND.from)}, ${f(SAND.full)}, length( vShadeAt ) ) ) );
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
	vec3 c = vTone * mix( ${f(PAINT[0])}, ${f(PAINT[1])}, tLeaf.r ) * ( 1.0 + ${f(CLUMPS.light)} * ( 2.0 * fract( vPhase * 3.17 + vTree.x * 5.3 + 0.3 ) - 1.0 ) );
	c *= vec3( 1.0 + 0.25 * h, 1.0 + 0.04 * h, max( 0.0, 1.0 - 0.5 * abs( h ) ) );
	c.g = min( c.g, ${f(WARM.green)} * c.r );
	c.b = min( c.b, ${f(WARM.blue)} * c.g );
	{
		vec3 w = vec3( 0.2126, 0.7152, 0.0722 );
		float own = dot( vTone, w ), k = pow( clamp( own / uMid, ${f(TONED.range[0])}, ${f(TONED.range[1])} ), ${f(TONED.keep)} );
		vec3 hue = vTone * dot( uPale, w ) / max( own, 1e-4 );
		tPaleOf = mix( uPale, hue, ${f(TONED.hue)} ) * k * mix( 0.8, 1.08, tLeaf.r );
	}
	diffuseColor.rgb = mix( c, uBark * mix( 0.9, mix( ${f(BARK.ridge[0])}, ${f(BARK.ridge[1])}, tLeaf.r ), tRidge ) * mix( 1.0, ${f(BARK.foot)}, vLow ), tBark );
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix( roughnessFactor, ${f(ROUGH.bark)}, tBark );
roughnessFactor = mix( roughnessFactor, 1.0, tBlob );`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
material.specularColor *= ${f(SHEEN.face)};
material.specularColorBlended *= ${f(SHEEN.face)};
material.specularF90 = ${f(SHEEN.graze)};`)
      .replace('#include <opaque_fragment>', `${look === 'flat' ? '' : `{
	vec3 q = tP;
	if ( vCrown.w > 1e-5 && tLeafy > 0.5 ) q = mix( tP, tS, ${f(DEPTH.pull)} ) + normalize( vViewPosition ) * vClump.w * ( ${f(DEPTH.relief)} * ( tLeaf.r - ${f(DEPTH.mid)} ) + ${f(DEPTH.face)} * vView );
	vec4 clip = projectionMatrix * vec4( q, 1.0 );
	gl_FragDepth = tLeafy > 0.5 ? 0.5 + 0.5 * clip.z / clip.w : gl_FragCoord.z;
}`}
outgoingLight *= 1.0 - tBlob;
#if NUM_DIR_LIGHTS > 0
if ( tLeafy > 0.5 && vCrown.w > 1e-5 ) {
	vec3 V = normalize( vViewPosition ), L = directionalLights[ 0 ].direction;
	vec3 sN = tNK - dot( tNK, V ) * V, sL = L - dot( L, V ) * V;
	float side = dot( sN / max( length( sN ), 1e-4 ), sL / max( length( sL ), 1e-4 ) );
	outgoingLight *= 1.0 - ${f(LIMB.dark)} * smoothstep( ${f(LIMB.from)}, 1.0, tOut ) * ( 1.0 - smoothstep( ${f(LIMB.moon[0])}, ${f(LIMB.moon[1])}, side ) );
}
#endif
{
	vec3 w = vec3( 0.2126, 0.7152, 0.0722 );
	float Y = dot( outgoingLight, w ), k = ${f(GRADE.most)} * smoothstep( ${f(GRADE.from)}, ${f(GRADE.full)}, Y ) * tLeafy;
	outgoingLight = mix( outgoingLight, uTan * Y / max( dot( uTan, w ), 1e-4 ), k ) * ( 1.0 - ${f(GRADE.dim)} * k );
}
outgoingLight += vec3( 2.0, 0.6, 0.0 ) * tBlob * step( 3.5, uLook ) * step( uLook, 4.5 );
if ( uLook > 4.5 && uLook < 5.5 ) outgoingLight = vec3( 4.0, 0.0, 0.0 ) * ( 1.0 - tBlob );
if ( uLook > 5.5 && uLook < 7.5 ) outgoingLight = vec3( uLook < 6.5 ? tLump( tUpV ) : tHeart ) * tLeafy;
if ( uLook > 7.5 ) outgoingLight = vTone * tLeafy;
#include <opaque_fragment>`)
      .replace('#include <normal_fragment_begin>', `${THREE.ShaderChunk.normal_fragment_begin.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;')}
float tOut = 0.0, tShut = 1.0, tBelow = 1.0;
if ( tBark > 0.5 ) {
	// The bark in relief: its ridges and cracks (the atlas's lightness) as a height, felt by the light.
	vec3 sx = dFdx( - vViewPosition ), sy = dFdy( - vViewPosition ), r1 = cross( sy, normal ), r2 = cross( normal, sx );
	float det = dot( sx, r1 );
	vec2 dH = vec2( dFdx( tLeaf.r ), dFdy( tLeaf.r ) ) * ${f(BARK.relief)} * tRidge;
	if ( abs( det ) > 1e-12 ) normal = normalize( abs( det ) * normal - sign( det ) * ( dH.x * r1 + dH.y * r2 ) );
}
tP = - vViewPosition;
tS = tP;
tNK = vec3( 0.0, 1.0, 0.0 );
tNL = tNK;
tNM = tNK;
tNR = tNK;
tOpen = 1.0;
tUpV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
tCrownB = vCrown;
tClumpB = vClump;
if ( vCrown.w > 1e-5 && tLeafy > 0.5 ) {
	vec3 V = normalize( vViewPosition );
	vec3 dK = tP - vCrown.xyz, nK = tBall( tP, V, vCrown ), nL = tBall( tP, V, vClump ), nM = vMass.w > 1e-5 ? tBall( tP, V, vMass ) : nL;
	// Every leaf of a lump stands for the front of its lump and its mass, whichever of its cards it is on: it is lit
	// and shut in there, not where its flat card is (which made every lump a disc darker at its middle, and drew a
	// straight seam where a crossed card came through the card in front).
	tS = mix( vClump.xyz + nL * vClump.w, vMass.xyz + nM * vMass.w, vMass.w > 1e-5 ? ${f(PLACE)} : 0.0 );
	tNL = nL;
	tNM = nM;
	tOpen = mix( ${f(OPEN.least)}, 1.0, smoothstep( ${f(OPEN.from)}, ${f(OPEN.full)}, wLight.z ) );
	tOut = length( dK - dot( dK, V ) * V ) / max( vCrown.w, 1e-4 );
	normal = normalize( ${f(BALL.clump)} * nL + ${f(BALL.mass)} * nM + ${f(BALL.crown)} * nK + 1e-4 * V );
	tNR = normal;
	float deep = tDeep( tS, V, vCrown );
	tShut = exp( - ${f(INSIDE.crown)} * deep );
	tHeart = exp( - ${f(INSIDE.rest)} * max( deep - ${f(INSIDE.front)}, 0.0 ) );
	tNK = normalize( nK + 1e-4 * V );
	tEdge = tOut;
	tBelow = mix( ${f(INSIDE.beneath)}, 1.0, smoothstep( - 0.6, 0.55, dot( tNR, tUpV ) ) );
}`)
      .replace('#include <lights_fragment_end>', `vec3 tTopE = vec3( 0.0 );
material.diffuseContribution = mix( material.diffuseContribution, tTan( material.diffuseContribution ), ${f(PALE.ambient)} * smoothstep( ${f(PALE.from)}, ${f(PALE.full)}, tSeen ) * tLeafy );
{
	vec3 tFrontV = normalize( ( viewMatrix * vec4( ${SKY.front.toward.map(f).join(', ')}, 0.0 ) ).xyz );
	float tRound = mix( ${f(NIGHT.crown)}, 1.0, smoothstep( ${f(NIGHT.turn[0])}, ${f(NIGHT.turn[1])}, dot( tNR, normalize( tFrontV + tUpV ) ) ) );
	float night = mix( ${f(NIGHT.bark)}, ${f(NIGHT.leaf)} * tRound * tShut * tBelow * tOpen * tLump( normalize( tFrontV + tUpV ) ) * mix( ${f(NIGHT.covered)}, 1.0, wLight.y ) * ( 1.0 - ${f(COVER.night)} * vTree.z * vLow ), tLeafy );
	vec3 deep = mix( vec3( 1.0 ), diffuseColor.rgb / max( diffuseColor.r, 1e-4 ), ${f(DEEP)} * tLeafy );
	irradiance *= night * deep;
	iblIrradiance *= night * deep;
	float up = saturate( dot( tNR, tUpV ) ) * mix( 1.0, tLump( tUpV ), ${f(TOP.lump)} * tLeafy ) * mix( 1.0, tOpen, tLeafy );
	if ( uLook > 2.5 && uLook < 3.5 ) { irradiance *= 0.0; iblIrradiance *= 0.0; radiance *= 0.0; reflectedLight.directDiffuse *= 0.0; }
	tTopE = uTop * ( pow( up, ${f(TOP.tight)} ) * mix( ${f(TOP.covered)}, 1.0, wLight.y ) * tLeafy * tHeart * mix( 0.45, 1.0, tCover ) * wLight.z );
	radiance *= mix( 1.0, night, tLeafy );
	reflectedLight.directDiffuse *= mix( 1.0, 1.0 + ${f(FACE)} * ( 2.0 * tLeaf.b - 1.0 ), tLeafy );
	if ( uLook > 1.5 && uLook < 2.5 ) { reflectedLight.directDiffuse *= 0.0; reflectedLight.directSpecular *= 0.0; tTopE *= 0.0; }
	if ( uLook > 0.5 && uLook < 1.5 ) { irradiance *= 0.0; iblIrradiance *= 0.0; radiance *= 0.0; tTopE *= 0.0; }
}
#include <lights_fragment_end>`)
      .replace('#include <aomap_fragment>', `{
	float tSide = 1.0;
	#if NUM_DIR_LIGHTS > 0
		tSide = mix( ${f(FILL.away)}, 1.0, 0.5 + 0.5 * dot( normal, directionalLights[ 0 ].direction ) );
	#endif
	reflectedLight.indirectDiffuse += uFill * ( tLeafy * tSide * tBelow * mix( ${f(FILL.shut)}, 1.0, wLight.z * tHeart ) * tLump( tUpV ) * step( uLook, 0.5 ) ) * BRDF_Lambert( material.diffuseContribution );
	reflectedLight.indirectDiffuse += tTopE * BRDF_Lambert( mix( diffuseColor.rgb, tPaleOf, ${f(PALE.top)} * smoothstep( 0.0, 0.6, length( tTopE ) / max( length( uTop ), 1e-4 ) ) ) );
	vec3 toCity = normalize( ( viewMatrix * vec4( 0.0, 0.2, - 1.0, 0.0 ) ).xyz );
	float edge = pow( 1.0 - saturate( dot( normal, geometryViewDir ) ), ${f(RIM.tight)} ) * smoothstep( 0.5, 0.95, tOut );
	float through = vTree.y * edge * ( 0.4 + 0.6 * saturate( dot( normal, toCity ) + 0.5 ) ) * tLeafy * step( uLook, 0.5 );
	reflectedLight.indirectDiffuse += uRim * diffuseColor.rgb * through;
}
#include <aomap_fragment>`);
  };
  return lit(m, { key: 'trees', baked: true, core: false });
}

// The moon's shadow pass for the trees: the leaves cut out of their cards by the same atlas, each lump where the
// passes draw it, held still, and nothing of the shade under a tree.
export function treeDepth(map: THREE.Texture, uniforms: TreeUniforms): THREE.MeshDepthMaterial {
  const m = new THREE.MeshDepthMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>${MOVE_PARS}`).replace('#include <begin_vertex>', `#include <begin_vertex>${MOVE(false, false)}
#ifdef USE_MAP
	vMapUv = tUv;
#endif`);
  };
  m.customProgramCacheKey = () => 'trees-depth';
  return m;
}
