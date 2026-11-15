import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { lin, shade } from '../../../../world/surface';
import type { CameraArt } from './art';
import { PATTERN } from './forms';

// The camera's surfaces, in three shader programs: one for every solid surface, one for its glass, one for the
// contact shadows. The solids differ only in color, roughness, metalness and clear coat, which do not make a new
// program. What varies across a surface (the ribs of a ring, the teeth of a knurl, the pebble of the skin, the paint
// in an engraving) is chosen per vertex by the cell attribute (forms.ts), and fine relief is a bump faded out before
// it is finer than a pixel, so nothing crawls when the page moves.

const tone = (name: Parameters<typeof hex>[0], k: number) => new THREE.Color(hex(name)).multiplyScalar(k);
// The blacks and greys are neutral in themselves, in linear light: the pale lights make them a warm black and a
// charcoal, plainly grey beside the copper, so the camera does not sink into the timber and the mat as one brown.
const black = (k: number) => new THREE.Color().setRGB(k, k, k);
// How far off a lens's axis a light may stand and still reach its glass past the barrel: the cosines where it starts
// to and where it fully does.
const SEE = ['0.2', '0.5'] as const;

// A bump from the height's slope across the screen, in the scene's own units (Mikkelsen's surface gradient).
const HEAD = /* glsl */ `
uniform sampler2D uCamInk;
uniform float uCamEnv;
varying vec4 vCamCell;
varying vec2 vCamUv;
vec3 camBump(vec3 n, vec2 dH, float face){
  vec3 sp = -vViewPosition; vec3 sx = dFdx(sp), sy = dFdy(sp);
  vec3 r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1) * face;
  vec3 b = abs(det) * n - sign(det) * (dH.x * r1 + dH.y * r2);
  // Seen edge on, the surface's gradient vanishes: keep the normal rather than divide by nothing. A NaN here blacked
  // out the whole desk through the bloom.
  float l = length(b);
  return l > 1e-14 ? b / l : n;
}`;
const VHEAD = 'attribute vec4 cell;\nvarying vec4 vCamCell;\nvarying vec2 vCamUv;';
const VERT = 'vCamCell = cell; vCamUv = uv;';

const P = PATTERN;
const COLOR = /* glsl */ `
  float camKind = vCamCell.w;
  float camH = 0.5, camFade = 0.0, camDh = 0.0, camInk = 0.0; vec2 camDx = vec2(0.0), camDI = vec2(0.0);
  if (camKind < ${P.pebble - 0.5} && vCamCell.x > 0.5) {
    // Ribs: the height and slope of the rib under this pixel, and how much of it is drawn.
    float uu = camKind > ${P.along - 0.5} ? vCamUv.y : vCamUv.x;
    float x = uu * vCamCell.x, x2 = fract(uu + 0.5) * vCamCell.x;
    vec2 d1 = vec2(dFdx(x), dFdy(x)), d2 = vec2(dFdx(x2), dFdy(x2));
    camDx = dot(d1, d1) < dot(d2, d2) ? d1 : d2;
    camFade = 1.0 - smoothstep(0.18, 0.42, length(camDx));
    float c = cos(6.2831853 * x), s = sin(6.2831853 * x);
    float sq = max(vCamCell.z, 0.05);
    float t = clamp((c + sq) / (2.0 * sq), 0.0, 1.0);
    camH = t * t * (3.0 - 2.0 * t);
    camDh = (c > -sq && c < sq) ? 6.0 * t * (1.0 - t) / (2.0 * sq) * (-6.2831853 * s) : 0.0;
    diffuseColor.rgb *= mix(0.86, 0.62 + 0.5 * camH, camFade);
  } else if (camKind > ${P.pebble - 0.5} && camKind < ${P.ink - 0.5}) {
    // A pebble: two octaves of noise in millimetres.
    vec3 q = vObj * vCamCell.x;
    camFade = 1.0 - smoothstep(0.22, 0.5, length(fwidth(q)));
    camH = smoothstep(0.25, 0.75, wNoise(q) * 0.62 + wNoise(q * 2.4 + 7.0) * 0.38);
    camDx = vec2(dFdx(camH), dFdy(camH));
    diffuseColor.rgb *= mix(1.0, 0.78 + 0.42 * camH, camFade);
  } else if (camKind > ${P.ink - 0.5}) {
    // Engraving filled with paint: pale, or copper where the mask's green says so.
    vec4 k = texture2D(uCamInk, vCamUv);
    camInk = k.r;
    camDI = vec2(dFdx(k.r), dFdy(k.r));
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(${lin(hex('text-2'))} * 0.75, ${lin(hex('copper'))}, k.g), camInk);
  }`;
const ROUGH = /* glsl */ `
  if (camKind < ${P.pebble - 0.5}) roughnessFactor = mix(roughnessFactor, roughnessFactor * (1.25 - 0.4 * camH), camFade);
  else if (camKind < ${P.ink - 0.5}) roughnessFactor = mix(roughnessFactor, roughnessFactor + 0.12 * (1.0 - camH), camFade);
  else roughnessFactor = mix(roughnessFactor, 0.62, camInk);`;
const METAL = 'metalnessFactor *= 1.0 - camInk;';
const NORMAL = /* glsl */ `
  if (camKind < ${P.pebble - 0.5}) { if (camFade > 0.0) normal = camBump(normal, camDh * camDx * vCamCell.y * 0.001 * camFade, faceDirection); }
  else if (camKind < ${P.ink - 0.5}) normal = camBump(normal, camDx * vCamCell.y * 0.001 * camFade, faceDirection);
  else normal = camBump(normal, -camDI * 0.00004, faceDirection);`;
// How much of the studio a surface takes, per material: the studio's low bounce card is its one orange thing, and a
// dark face seen from above reflects straight down into it.
const ENV = /* glsl */ `
#if defined( RE_IndirectSpecular )
  radiance *= uCamEnv;
  #ifdef USE_CLEARCOAT
  clearcoatRadiance *= uCamEnv;
  #endif
#endif
  iblIrradiance *= uCamEnv;`;

interface Finish { color: THREE.Color | number; rough: number; metal?: number; coat?: number; coatRough?: number; env?: number; spec?: number }

export interface CameraMaterials {
  paint: THREE.MeshPhysicalMaterial;
  plate: THREE.MeshPhysicalMaterial;
  skin: THREE.MeshPhysicalMaterial;
  barrel: THREE.MeshPhysicalMaterial;
  ribMetal: THREE.MeshPhysicalMaterial;
  ribRubber: THREE.MeshPhysicalMaterial;
  rubber: THREE.MeshPhysicalMaterial;
  plastic: THREE.MeshPhysicalMaterial;
  bronze: THREE.MeshPhysicalMaterial;
  copper: THREE.MeshPhysicalMaterial;
  steel: THREE.MeshPhysicalMaterial;
  blade: THREE.MeshPhysicalMaterial;
  inside: THREE.MeshPhysicalMaterial;
  gloss: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  coat: THREE.MeshPhysicalMaterial;
  shadow: THREE.ShaderMaterial;
  all: THREE.Material[];
}

export function cameraMaterials(art: CameraArt): CameraMaterials {
  // Every solid is this one program. Each has a little clear coat and none has sheen, so all turn on the same
  // features and share it.
  const solid = (name: string, f: Finish) => {
    const m = new THREE.MeshPhysicalMaterial({
      color: f.color, roughness: f.rough, metalness: f.metal ?? 0, specularIntensity: f.spec ?? 1,
      clearcoat: Math.max(0.02, f.coat ?? 0), clearcoatRoughness: f.coatRough ?? 0.3,
    });
    m.name = name;
    m.userData.uniforms = { uCamInk: { value: art.ink }, uCamEnv: { value: f.env ?? 1 } };
    shade(m, 'camera-solid', { head: HEAD, vhead: VHEAD, vert: VERT, color: COLOR, rough: ROUGH, metal: METAL, normal: NORMAL });
    const before = m.onBeforeCompile.bind(m);
    m.onBeforeCompile = (sh, r) => { before(sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>\n${ENV}`); };
    return m;
  };

  // Black paint over the castings, with a clear coat whose edges catch a line of light.
  const paint = solid('camPaint', { color: black(0.004), rough: 0.5, spec: 0.15, coat: 0.14, coatRough: 0.14, env: 0.4 });
  // The top plate and the finder: satin dark steel, plainly grey and plainly darker than a bright metal.
  const plate = solid('camPlate', { color: black(0.014), rough: 0.4, metal: 1, coat: 0.1, coatRough: 0.2, env: 0.7 });
  const skin = solid('camSkin', { color: black(0.005), rough: 0.86, spec: 0.3, env: 0.4 });
  // The lenses' black anodised barrels, which carry the engraving.
  const barrel = solid('camBarrel', { color: black(0.004), rough: 0.45, metal: 0.2, spec: 0.4, coat: 0.12, coatRough: 0.3, env: 0.5 });
  const ribMetal = solid('camRibMetal', { color: black(0.006), rough: 0.32, metal: 0.3, spec: 0.5, env: 0.6 });
  const ribRubber = solid('camRibRubber', { color: black(0.005), rough: 0.72, spec: 0.35, env: 0.4 });
  const rubber = solid('camRubber', { color: black(0.004), rough: 0.82, spec: 0.3, env: 0.4 });
  const plastic = solid('camPlastic', { color: black(0.005), rough: 0.6, spec: 0.35, coat: 0.05, coatRough: 0.4, env: 0.4 });
  const bronze = solid('camBronze', { color: hex('bronze'), rough: 0.26, metal: 1 });
  const copper = solid('camCopper', { color: hex('copper'), rough: 0.22, metal: 1 });
  const steel = solid('camSteel', { color: black(0.12), rough: 0.24, metal: 1 });
  // The iris's blades: blackened steel with a soft sheen, so the overlaps can be told apart.
  const blade = solid('camBlade', { color: black(0.05), rough: 0.36, metal: 0.85 });
  // The lens's inside: flocked black.
  const inside = solid('camInside', { color: black(0.006), rough: 0.92, env: 0.5 });
  // The screen, the finder's eyepiece, the assist lamp: glossy black glass.
  const gloss = solid('camGloss', { color: black(0.004), rough: 0.06, coat: 1, coatRough: 0.04 });

  // Lens glass is drawn as the light its surfaces reflect, added over what lies behind it, so the inside of the lens
  // shows through. Its coatings reflect in pale and hot, never blue, green or violet. Sunk in its barrel it sees only
  // the lights its opening faces: no light here casts a shadow through glass, and the monitor behind the camera
  // showed in the prime as a pale card that never moved with the cursor.
  const seen = THREE.ShaderChunk.lights_fragment_begin
    .replace('getPointLightInfo( pointLight, geometryPosition, directLight );', 'getPointLightInfo( pointLight, geometryPosition, directLight ); directLight.color *= camSee( directLight.direction );')
    .replace('getSpotLightInfo( spotLight, geometryPosition, directLight );', 'getSpotLightInfo( spotLight, geometryPosition, directLight ); directLight.color *= camSee( directLight.direction );')
    .replace('rectAreaLight = rectAreaLights[ i ];', 'rectAreaLight = rectAreaLights[ i ]; rectAreaLight.color *= camSee( normalize( rectAreaLight.position - geometryPosition ) );');
  const glassP = (name: string, spec: THREE.Color, rough: number) => {
    const m = new THREE.MeshPhysicalMaterial({
      color: 0x000000, metalness: 0, roughness: rough, ior: 1.9, specularIntensity: 1, specularColor: spec,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    m.name = name;
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 cell;\nvarying vec3 vCamAxis;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCamAxis = normalize( normalMatrix * cell.xyz );');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vCamAxis;\nfloat camSee( vec3 L ){ return smoothstep( ${SEE[0]}, ${SEE[1]}, dot( L, normalize( vCamAxis ) ) ); }`)
        .replace('#include <lights_fragment_begin>', seen);
    };
    m.customProgramCacheKey = () => 'camera-glass';
    return m;
  };
  const glass = glassP('camGlass', new THREE.Color(hex('pale')).multiplyScalar(2.2), 0.035);
  const coat = glassP('camCoat', new THREE.Color(hex('hot')).multiplyScalar(0.6), 0.22);

  // A short soft contact shadow under each thing: a rounded rectangle, in its own millimetres (uv), whose half sizes,
  // corner and strength are in its cell attribute.
  const shadow = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `
attribute vec4 cell;
varying vec2 vP; varying vec4 vC;
void main(){ vP = uv; vC = cell; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
varying vec2 vP; varying vec4 vC;
void main(){
  vec2 q = abs(vP) - vC.xy + vC.z;
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - vC.z;
  float core = 1.0 - smoothstep(-3.0, 2.5, sd);
  float soft = 1.0 - smoothstep(-6.0, 14.0, sd);
  float a = (core * 0.55 + soft * soft * 0.45) * vC.w;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`,
  });
  shadow.name = 'camShadow';

  const all = [paint, plate, skin, barrel, ribMetal, ribRubber, rubber, plastic, bronze, copper, steel, blade, inside, gloss, glass, coat, shadow];
  return { paint, plate, skin, barrel, ribMetal, ribRubber, rubber, plastic, bronze, copper, steel, blade, inside, gloss, glass, coat, shadow, all };
}
