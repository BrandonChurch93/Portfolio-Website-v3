import * as THREE from 'three';
import { lin } from '../../../../world/surface';
import { MOONWARD } from '../../layout';
import { JUNGLE } from './colors';

// One program draws the whole jungle: every tree is a square of the baked pictures (./bake.ts), standing where the
// tree stands and facing the page's view, and lit through the way the picture says it faces at each pixel. The colors
// are the jungle's own (./colors.ts) and nowhere else.

export const U = {
  uAlbedo: { value: null as THREE.Texture | null },
  uNormal: { value: null as THREE.Texture | null },
  // How much taller than wide the pictures are, which a square's side is turned up by.
  uTall: { value: 1 },
};

const C = (k: keyof typeof JUNGLE) => lin(JUNGLE[k]);
// The pictures are read this many steps coarser than the screen asks for: single tufts of leaves smaller than a few
// pixels then join into the masses they are part of, and do not speckle.
const SOFT = '0.9';

// Per tree (look): x how far its leaves turn toward flame, y how bright it is, z how much of a lantern's light reaches
// it from below, and a lantern itself above 1.5. Per tree (cell): where its square is and its side, and where its
// foot is across it.
const VERT_HEAD = /* glsl */ `
attribute vec4 cell;
attribute vec4 look;
uniform float uTall;
varying vec2 vAt;
varying vec3 vR;
varying vec3 vU;
varying vec3 vF;
varying vec4 vLook;
varying float vY;`;

export function cardMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
  m.name = 'jungle';
  m.envMapIntensity = 0.25;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_HEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vAt = cell.xy + vec2(position.x + 0.5, position.y) * cell.z * vec2(1.0, 1.0 / uTall);
vLook = look;
vY = position.y;
{ mat3 im = mat3(instanceMatrix); vR = normalize(normalMatrix * im[0]); vU = normalize(normalMatrix * im[1]); vF = normalize(normalMatrix * im[2]); }`)
      // A tree's shadows are looked up at the front of its crown and not at its trunk, where the square stands: there
      // the square would lie in its own shadow. How far in front is the length of the instance's third column.
      .replace('#include <shadowmap_vertex>', `#if defined( USE_SHADOWMAP ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
{ vec4 keep = worldPosition; worldPosition.xyz += mat3(modelMatrix) * instanceMatrix[2].xyz;
#include <shadowmap_vertex>
worldPosition = keep; }
#endif`);
    let f = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D uAlbedo;
uniform sampler2D uNormal;
varying vec2 vAt;
varying vec3 vR;
varying vec3 vU;
varying vec3 vF;
varying vec4 vLook;
varying float vY;
float jLeaf = 0.0, jOpen = 1.0, jVal = 0.0;
vec3 jAlbedo = vec3(0.0);
vec3 jN = vec3(0.0, 0.0, 1.0);`);
    f = f.replace('#include <color_fragment>', `#include <color_fragment>
{
  vec4 A = texture2D(uAlbedo, vAt, ${SOFT});
  if (A.a < 0.5) discard;
  vec3 a = A.rgb / A.a;
  vec4 B = texture2D(uNormal, vAt, ${SOFT}) / A.a;
  jLeaf = a.r; jVal = a.g; jOpen = clamp(B.a, 0.0, 1.0);
  vec3 nb = B.xyz * 2.0 - 1.0;
  jN = dot(nb, nb) > 1e-6 ? normalize(nb) : vec3(0.0, 0.0, 1.0);
  float hue = clamp(a.b + vLook.x, 0.0, 1.0);
  vec3 leaf = mix(${C('deep')}, ${C('mass')}, smoothstep(0.05, 0.5, jVal));
  leaf = mix(leaf, ${C('leaf')}, smoothstep(0.55, 1.0, jVal));
  leaf = mix(leaf, ${C('flame')} * (0.4 + 0.7 * jVal), smoothstep(0.5, 1.0, hue));
  vec3 bark = mix(${C('bark')}, ${C('barkPale')}, a.b) * (0.35 + 0.9 * jVal);
  jAlbedo = mix(bark, leaf, jLeaf) * vLook.y;
  diffuseColor.rgb = jAlbedo * mix(0.12, 1.0, jOpen * jOpen);
}`);
    f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ vec3 nn = jN.x * vR + jN.y * vU + jN.z * vF; normal = dot(nn, nn) > 1e-8 ? normalize(nn) : normalize(vF); }`);
    f = f.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  float lantern = step(1.5, vLook.z) * (1.0 - jLeaf) * smoothstep(0.85, 0.97, jVal);
  totalEmissiveRadiance += ${C('glow')} * 2.6 * lantern;
  // The glow of the sky behind the world comes through the leaves at the edges of a crown, and the moon catches its
  // top: both on the open leaves only, so the inside of a crown stays dark.
  float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), rim = (1.0 - facing) * (1.0 - facing);
  float skyward = clamp(0.35 + 0.65 * normal.y, 0.0, 1.0);
  vec3 Mo = normalize(mat3(viewMatrix) * vec3(${MOONWARD.map((v) => v.toFixed(3)).join(', ')}));
  float moon = max(dot(normal, Mo), 0.0);
  totalEmissiveRadiance += ${C('catch')} * jLeaf * jAlbedo * jOpen * (3.2 * rim * skyward + 3.0 * moon * moon * jOpen);
  float spill = vLook.z < 1.5 ? vLook.z : 0.0, low = 1.0 - clamp(vY, 0.0, 1.0);
  totalEmissiveRadiance += ${C('spill')} * diffuseColor.rgb * spill * low * low * low * 3.0;
}`);
    // Deep in a crown the sky does not reach, and the moon only through gaps.
    f = f.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
reflectedLight.indirectDiffuse *= jOpen;
reflectedLight.directDiffuse *= mix(0.45, 1.0, jOpen);
reflectedLight.directSpecular *= 0.12;
reflectedLight.indirectSpecular *= 0.1 * jOpen;`);
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => 'jungle';
  return m;
}

// The shadow a tree throws: its square turned about its trunk to face the light being drawn, so the moon and the
// cursor's light each see the tree's outline and not a square edge on.
export function cardDepth(): THREE.MeshDepthMaterial {
  const d = new THREE.MeshDepthMaterial();
  d.onBeforeCompile = (sh) => {
    sh.uniforms.uAlbedo = U.uAlbedo;
    sh.uniforms.uTall = U.uTall;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 cell;\nuniform float uTall;\nvarying vec2 vAt;')
      .replace('#include <project_vertex>', `
vAt = cell.xy + vec2(position.x + 0.5, position.y) * cell.z * vec2(1.0, 1.0 / uTall);
vec4 mvPosition;
{
  vec3 c0 = instanceMatrix[0].xyz, c1 = instanceMatrix[1].xyz;
  float wide = length(c0);
  vec3 L = vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
  vec3 across = cross(normalize(c1), L);
  float k = length(across);
  across = k > 1e-3 ? across / k : c0 / max(wide, 1e-6);
  if (dot(across, c0) < 0.0) across = -across;
  vec3 foot = instanceMatrix[3].xyz + c0 * (cell.w - 0.5);
  vec3 p = foot + across * wide * (position.x - (cell.w - 0.5)) + c1 * position.y;
  mvPosition = modelViewMatrix * vec4(p, 1.0);
}
gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uAlbedo;\nvarying vec2 vAt;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (texture2D(uAlbedo, vAt).a < 0.5) discard;');
  };
  d.customProgramCacheKey = () => 'jungle-depth';
  return d;
}
