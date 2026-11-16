import * as THREE from 'three';
import { hex, type PaletteName } from '../../config/palette';
import { CORE, LIGHT, SCALE } from './layout';

// The world's light, which every part shares so that the world is lit as one thing.
//
// The moon is a light of the stage's own, with a shadow map drawn once. The core never moves either, and what
// reaches each vertex from it (the share of it that is seen), with the light that has bounced and how shut in the
// place is, is worked out ahead by scripts/world/lib/bake.mjs and stored with the mesh as two attributes:
//   light:  the share of the core seen, the share of the moon seen, how open the place is, and one number the
//           part may use for itself
//   bounce: the irradiance that reaches the place after bouncing, as the square root of its share of LIGHT.bounce
// lit() joins that to a standard or physical material: the core's light with its own falloff and soft edge, by
// the stored share, the stored bounce, and the stored openness on what the night gives. So a part's own detail (a
// normal worked out per pixel, its roughness, its metal) is lit by the same lights as everything else, and the
// formulas here are the ones the baker lit the bounce by.

export const color = (name: PaletteName, power = 1): THREE.Color => new THREE.Color(hex(name)).multiplyScalar(power);
// The world's metals, so that every gold in it is one gold, at the palette's hue and never yellow, and every
// bronze one bronze. Each is the color of a polished face of it.
// Gold is the palette's hot light eased toward its pale: lighter and less saturated than copper, which is what
// lets it read as gold and not as copper. By the rule ("Gold is at the palette's hue, never yellow") that is where
// it stops, and there every reviewer read it as copper or peach. Under his standing permission of Nov 15 the
// world's gold is turned GOLD.turn degrees toward true gold, well short of yellow. ?gold=spec puts it back at the
// palette's hue, so he can choose.
export const GOLD = { ease: 0.45, turn: 6 } as const;
const spec = typeof location !== 'undefined' && new URLSearchParams(location.search).get('gold') === 'spec';
const gold = color('hot').lerp(color('pale'), GOLD.ease);
if (!spec) gold.offsetHSL(GOLD.turn / 360, 0, 0);
export const METAL = { gold, bronze: color('bronze'), copper: color('copper') } as const;

const shared = {
  uCoreAt: { value: new THREE.Vector3(...CORE.at).multiplyScalar(SCALE) },
  uCoreR: { value: CORE.r * SCALE },
  uCoreColor: { value: color(LIGHT.core.color, LIGHT.core.power) },
  uCoreLevel: { value: 1 },
  uCoreFall: { value: LIGHT.core.fall },
  uBounceMost: { value: LIGHT.bounce },
  // The cursor's glint: where it stands, in the camera's own space, and its color and strength.
  uGlintAt: { value: new THREE.Vector3(0, 0, 1) },
  uGlint: { value: color('pale', 0) },
};
// What the stage sets each frame: how bright the core burns, and where the cursor's glint is.
export const world = {
  setCore(level: number): void { shared.uCoreLevel.value = level; },
  setGlint(at: THREE.Vector3, power: number): void { shared.uGlintAt.value.copy(at); shared.uGlint.value.copy(color('pale', power)); },
  uniforms: shared,
};

export interface Lit {
  // A name for the shader this makes, which must differ wherever a part's own changes to the shader differ.
  key: string;
  // The geometry carries stored light (the attributes `light` and `bounce`). Without it the core is taken as seen
  // in full and nothing has bounced: for something that moves, or a stand in.
  baked?: boolean;
  // The core lights it. Off for what stands on top of the world, which the core never reaches.
  core?: boolean;
  // The cursor's light glints on it: polished metal only.
  glint?: boolean;
}

const VERT_PARS = `
#ifdef WORLD_BAKED
	attribute vec4 aLight;
	attribute vec4 aBounce;
	varying vec4 wLight;
	varying vec3 wBounce;
	uniform float uBounceMost;
#endif`;
const VERT = `
#ifdef WORLD_BAKED
	wLight = aLight;
	wBounce = aBounce.rgb * aBounce.rgb * uBounceMost;
#endif`;
const FRAG_PARS = `
uniform vec3 uCoreAt;
uniform float uCoreR;
uniform vec3 uCoreColor;
uniform float uCoreLevel;
uniform float uCoreFall;
uniform vec3 uGlintAt;
uniform vec3 uGlint;
#ifdef WORLD_BAKED
	varying vec4 wLight;
	varying vec3 wBounce;
#endif
// The light of a ball on a face: its cosine, eased to nothing as the ball sets behind the face.
float worldIllum( float c, float s ) {
	return c >= s ? c : ( c <= - s ? 0.0 : ( c + s ) * ( c + s ) / max( 4.0 * s, 1e-5 ) );
}`;
const CORE_LIGHT = `
#ifdef WORLD_CORE
{
	vec3 wTo = ( viewMatrix * vec4( uCoreAt, 1.0 ) ).xyz - geometryPosition;
	float wD = max( length( wTo ), 1e-6 ), wS = min( 1.0, uCoreR / wD );
	vec3 wL = wTo / wD;
	float wC = dot( geometryNormal, wL );
	#ifdef WORLD_BAKED
		float wSeen = wLight.x;
	#else
		float wSeen = 1.0;
	#endif
	vec3 wE = uCoreColor * ( uCoreLevel * wSeen * pow( wS, uCoreFall ) );
	vec3 wH = normalize( wL + geometryViewDir );
	vec3 wF = F_Schlick( material.specularColor, material.specularF90, saturate( dot( geometryViewDir, wH ) ) );
	reflectedLight.directDiffuse += wE * worldIllum( wC, wS ) * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - wF );
	reflectedLight.directSpecular += wE * saturate( wC ) * BRDF_GGX( wL, geometryViewDir, geometryNormal, material ) * material.multiScatteringCompensation;
}
#endif
#ifdef WORLD_GLINT
{
	vec3 wG = normalize( uGlintAt - geometryPosition );
	reflectedLight.directSpecular += uGlint * saturate( dot( geometryNormal, wG ) ) * BRDF_GGX( wG, geometryViewDir, geometryNormal, material );
}
#endif`;
const BOUNCE = `
#ifdef WORLD_CORE
	iblIrradiance *= ${LIGHT.fill.toFixed(3)};
#else
	iblIrradiance *= ${LIGHT.top.toFixed(3)};
#endif
#ifdef WORLD_BAKED
	irradiance *= wLight.z;
	iblIrradiance *= wLight.z;
	radiance *= mix( 1.0, wLight.z, 0.7 );
	irradiance += wBounce;
#endif`;

// Joins the world's light to a material. Call it last, after the part's own onBeforeCompile is set: the part's
// changes are made first and this is laid over them. The part's changes must leave these lines of the standard
// shader where they are: <common>, <begin_vertex>, <lights_fragment_begin> and <lights_fragment_end>.
export function lit<T extends THREE.MeshStandardMaterial>(m: T, o: Lit): T {
  const own = m.onBeforeCompile;
  m.defines = { ...m.defines, ...(o.baked ? { WORLD_BAKED: '' } : {}), ...(o.core === false ? {} : { WORLD_CORE: '' }), ...(o.glint ? { WORLD_GLINT: '' } : {}) };
  m.onBeforeCompile = (sh, renderer) => {
    own.call(m, sh, renderer);
    Object.assign(sh.uniforms, shared);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>${VERT_PARS}`).replace('#include <begin_vertex>', `#include <begin_vertex>${VERT}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>${FRAG_PARS}`)
      .replace('#include <lights_fragment_begin>', `#include <lights_fragment_begin>${CORE_LIGHT}`)
      .replace('#include <lights_fragment_end>', `${BOUNCE}\n#include <lights_fragment_end>`);
  };
  m.customProgramCacheKey = () => `world:${o.key}`;
  return m;
}
