import * as THREE from 'three';
import { type PaletteName, hex } from '../config/palette';
import { lin, type Chunks } from './surface';

// The cursor's light as a glint on metal: a tight mirror highlight of the stage's lamp, worked out per pixel from where
// the lamp is, so it is a thin line that slides along a round edge as the pointer moves, never a soft spot. The
// material's own lighting spreads the lamp too wide at its roughness to be seen moving. The glint takes the lamp's
// shadow, so nothing behind a barn door or the dish catches it. Its peak is held under the stages' glow thresholds.
// A piece may hand it a lamp of its own (placeGlint), so the line can travel further than the lamp's own light does
// without the piece being lit any other way.

export interface GlintUniforms {
  // The lamp in view space, and how strong the glint is, 0 to 1.
  uGlintP: { value: THREE.Vector3 };
  uGlintK: { value: number };
}

export const glintUniforms = (): GlintUniforms => ({ uGlintP: { value: new THREE.Vector3(0, 0, 1) }, uGlintK: { value: 1 } });

// The brightest a glint is, in the stage's linear light, before the tone curve.
const PEAK = 1.35;

const HEAD = /* glsl */ `
uniform vec3 uGlintP;
uniform float uGlintK;
vec3 glintL(){ return normalize(uGlintP + vViewPosition); }
float glintEdge(vec3 n){
  vec3 L = glintL();
  vec3 V = normalize(vViewPosition);
  float side = max(dot(n, L), 0.0);
  return pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 4.0) * side * side * uGlintK;
}
float glintAt(vec3 n, vec3 ng, float sharp){
  vec3 L = glintL();
  vec3 V = normalize(vViewPosition);
  vec3 H = normalize(L + V);
  float nl = dot(n, L);
  if (nl <= 0.0) return 0.0;
  return pow(max(dot(ng, H), 0.0), sharp) * smoothstep(0.0, 0.25, nl) * uGlintK;
}
float glintTurned(vec3 n, float sharp){
  vec3 L = glintL();
  vec3 V = normalize(vViewPosition);
  float nl = dot(n, L);
  if (nl <= 0.0) return 0.0;
  vec3 A = normalize(cross(vAxX, vAxY));
  vec3 H = normalize(L + V);
  vec3 Hp = H - A * dot(H, A);
  float m = length(Hp);
  if (m < 1e-3) return 0.0;
  return pow(max(dot(n, Hp / m), 0.0), sharp) * m * m * smoothstep(0.0, 0.25, nl) * uGlintK;
}
vec3 glintCrown(vec3 n, vec3 c, float r){
  vec3 d = (vObj - c) / r;
  return normalize(mix(n, normalize(vViewPosition), 0.85) + d.x * vAxX + d.y * vAxY + d.z * normalize(cross(vAxX, vAxY)));
}`;

export interface GlintLook {
  // How tight the line is: the power of the half way vector.
  sharp: number;
  // Its strength at the peak, against PEAK.
  k: number;
  // How far its color goes from the metal's own toward the palette's pale.
  pale: number;
  // A line of the light along the outline on the side the lamp is on, which follows the lamp round the outline. It
  // reads at the page's size, where a glint on a small round edge is a pixel or two.
  edge?: number;
  // A surface turned round the model's z axis: a turned or spun part shows the lamp as a line along its length from
  // wherever the lamp is, not only when the lamp is square to the axis, so the line keeps sliding round it.
  turned?: boolean;
  // The glint is worked out as if the surface were crowned, a sphere of radius r round the point c, in the model's
  // millimetres, and turned most of the way toward the eye: a straight bar shows the lamp as a stretch of light that
  // runs along it with the lamp, and not as the whole bar flashing on at one angle. A part a few pixels wide reads its
  // light by where it is on the part, not by which way its faces lie.
  crown?: { c: readonly [number, number, number]; r: number };
  // A GLSL expression, 0 to 1, that the glint is multiplied by: where on the surface it may show.
  mask?: string;
  // The glint's own color, from the palette, in place of the metal's: a dark metal's own hue goes grey once it is
  // brightened toward the pale.
  tint?: PaletteName;
  // How much of the glint a shadow leaves, 0 to 1. A small part that sits in a larger one's shadow for most of the
  // places the pointer is in would otherwise never show the light moving at all.
  shade?: number;
}

// The chunks for a glint, joined to a material's own.
export function withGlint(look: GlintLook, own: Chunks = {}): Chunks {
  const pale = lin(hex('pale'));
  const v = (c: readonly number[]) => `vec3(${c.map((x) => x.toFixed(2)).join(', ')})`;
  const ng = look.crown ? `glintCrown(normal, ${v(look.crown.c)}, ${look.crown.r.toFixed(1)})` : 'normal';
  const at = look.turned ? `glintTurned(normal, ${look.sharp.toFixed(1)})` : `glintAt(${ng}, ${ng}, ${look.sharp.toFixed(1)})`;
  const only = look.mask ? ` * (${look.mask})` : '';
  const tint = look.tint ? new THREE.Color(hex(look.tint)) : null;
  const base = tint ? lin(tint.multiplyScalar(1 / Math.max(tint.r, tint.g, tint.b)).getHex()) : 'diffuseColor.rgb / max(1e-3, max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)))';
  return {
    ...own,
    head: `${own.head ?? ''}\n${HEAD}`,
    emissive: `${own.emissive ?? ''}
  { float gl = ${at}${only}${look.edge ? ` + glintEdge(normal) * ${look.edge.toFixed(2)}` : ''};
    if (gl > 0.02) {
      float glintSeen = 1.0;
#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
      glintSeen = getShadow(spotShadowMap[0], spotLightShadows[0].shadowMapSize, spotLightShadows[0].shadowIntensity, spotLightShadows[0].shadowBias, spotLightShadows[0].shadowRadius, vSpotLightCoord[0]);${look.shade ? `
      glintSeen = mix(${look.shade.toFixed(2)}, 1.0, glintSeen);` : ''}
#endif
      vec3 gc = mix(${base}, ${pale}, ${look.pale.toFixed(2)});
      totalEmissiveRadiance += gc * min(gl * glintSeen, 1.0) * ${(look.k * PEAK).toFixed(3)};
    } }`,
  };
}

// Hands every material its glint's uniforms, keeping any it already has.
export function takeGlint(g: GlintUniforms, ...ms: THREE.Material[]): void {
  for (const m of ms) m.userData.uniforms = { ...(m.userData.uniforms ?? {}), ...g };
}

// Puts the glint's lamp at a place in the world, as the camera sees it.
export function placeGlint(g: GlintUniforms, lamp: THREE.Vector3, camera: THREE.Camera): void {
  g.uGlintP.value.copy(lamp).applyMatrix4(camera.matrixWorldInverse);
}
