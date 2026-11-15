import * as THREE from 'three';
import { hex } from '../../config/palette';

// The cursor's light as polished metal sees it. He asked for metal that catches the cursor's light. A small lamp
// gives a mirror a glint the size of a pixel, and the room a mirror reflects is drawn once and cannot move. So the
// cursor's light is also a lit panel of a set size where the lamp is, as a photographer's light is, and a polished
// face shows its reflection: a soft edged disc of pale light that slides across the metal as the cursor moves.
// Only metal that is polished shows it: it fades out as a surface gets rougher and is nothing on what is not metal.
// A part passes each of its metal materials through polished(), after its own changes to the shader.

// The panel stands this far in front of whatever it lights, in the stage's metres, where the cursor is on the
// screen. It is near on purpose: a face turned away from the visitor then shows it when the cursor is a little to
// the side the face is turned to, so moving the cursor past a curved or carved thing runs the light across it.
// With the panel as far off as the lamp itself, only a face square to the visitor ever showed it. How wide the
// panel is seen from a surface, as the cosines of the angles from its middle at which its reflection begins and is
// whole, how bright it is in a mirror, and the roughness at which it has faded to nothing.
const GLINT = { near: 0.4, from: 0.975, whole: 0.988, power: 10, rough: 0.34 };
const at = { value: new THREE.Vector3() }, level = { value: 1 };
const f = (n: number): string => n.toFixed(4);

// Called by the stage before a frame: where the cursor's light is, and how strong.
export function aimGlint(lamp: THREE.Vector3, camera: THREE.Camera, k = 1): void {
  at.value.copy(lamp).applyMatrix4(camera.matrixWorldInverse);
  level.value = k;
}

export function polished<T extends THREE.Material>(m: T): T {
  const before = m.onBeforeCompile, key = m.customProgramCacheKey, tint = new THREE.Color(hex('pale'));
  m.onBeforeCompile = (sh, r) => {
    before.call(m, sh, r);
    sh.uniforms.uGlintAt = at;
    sh.uniforms.uGlint = level;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uGlintAt;\nuniform float uGlint;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
{
	vec3 glintTo = normalize( vec3( uGlintAt.xy - geometryPosition.xy, ${f(GLINT.near)} ) );
	vec3 glintBack = reflect( - geometryViewDir, geometryNormal );
	float glint = smoothstep( ${f(GLINT.from)}, ${f(GLINT.whole)}, dot( glintBack, glintTo ) ) * metalnessFactor * ( 1.0 - smoothstep( 0.0, ${f(GLINT.rough)}, roughnessFactor ) );
	reflectedLight.directSpecular += material.specularColorBlended * vec3( ${f(tint.r)}, ${f(tint.g)}, ${f(tint.b)} ) * ( ${f(GLINT.power)} * uGlint * glint );
}`);
  };
  m.customProgramCacheKey = () => `${key.call(m)}|polished`;
  return m;
}
