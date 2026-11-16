import * as THREE from 'three';
import { MOONWARD, PYRAMID } from '../../layout';
import { mesh as place, type Loaded } from '../../files';
import { FORM } from './form';

// The shade the pyramid lays on the ground under and round it, drawn over whatever is there (the land, its court)
// as a multiply: the angle where the foot course meets the ground, shut in, and its shadow from the moon, which
// falls toward the visitor and to the left. The stage's shadow map lays that shadow as well, but at the map's size it
// is a thin line behind the trees; here it is worked out exactly from the pyramid's own planes, soft by how far it
// falls, as the moon's disc makes it. It is drawn on a sheet over the ground made ahead by make.mjs (FORM.shade).

export const SHADE = {
  // The contact shade: how dark at the foot and how far it runs, near and far.
  contact: [0.6, 3.2, 0.24, 12],
  // The moon's shadow: how dark, and how soft its edge is near the foot and for each unit it falls.
  shadow: { dark: 0.42, soft: 0.5, per: 0.014 },
} as const;

export function shade(sheet: Loaded, at: THREE.Vector3, basis: THREE.Matrix4): { mesh: THREE.Mesh; dispose(): void } {
  const half = PYRAMID.base / 2, tall = PYRAMID.tall, out = half + FORM.foot.proud;
  const inv = basis.clone().transpose();
  const moon = new THREE.Vector3(...MOONWARD).normalize().applyMatrix4(inv);
  const toLocal = new THREE.Matrix4().makeTranslation(-at.x, -at.y, -at.z).premultiply(inv);
  const f = (v: number): string => v.toFixed(5);
  const material = new THREE.ShaderMaterial({
    uniforms: { uLocal: { value: toLocal }, uAt: { value: sheet.at }, uSize: { value: sheet.size } },
    vertexShader: `
uniform mat4 uLocal;
uniform vec3 uAt;
uniform float uSize;
varying vec3 vL;
void main() {
	vL = ( uLocal * vec4( uAt + position * uSize, 1.0 ) ).xyz;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,
    fragmentShader: `
varying vec3 vL;
void main() {
	vec2 o = max( abs( vL.xz ) - ${f(out)}, 0.0 );
	float d = length( o );
	float k = ${f(SHADE.contact[0])} * exp( - d / ${f(SHADE.contact[1])} ) + ${f(SHADE.contact[2])} * exp( - d / ${f(SHADE.contact[3])} );
	// The ray to the moon, clipped by the pyramid's four faces and its foot: where it passes through, the place is in
	// its shadow, and how long it runs inside says how far the place is from the shadow's edge.
	vec3 m = vec3( ${f(moon.x)}, ${f(moon.y)}, ${f(moon.z)} );
	float t0 = 0.0, t1 = 1e4;
	vec4 pl[5];
	pl[0] = vec4( ${f(tall)}, ${f(half)}, 0.0, ${f(half * tall)} );
	pl[1] = vec4( - ${f(tall)}, ${f(half)}, 0.0, ${f(half * tall)} );
	pl[2] = vec4( 0.0, ${f(half)}, ${f(tall)}, ${f(half * tall)} );
	pl[3] = vec4( 0.0, ${f(half)}, - ${f(tall)}, ${f(half * tall)} );
	pl[4] = vec4( 0.0, - 1.0, 0.0, 0.0 );
	for ( int i = 0; i < 5; i++ ) {
		float den = dot( pl[ i ].xyz, m ), num = pl[ i ].w - dot( pl[ i ].xyz, vL );
		if ( abs( den ) < 1e-6 ) { if ( num < 0.0 ) t1 = - 1.0; }
		else if ( den > 0.0 ) t1 = min( t1, num / den );
		else t0 = max( t0, num / den );
	}
	float chord = max( t1 - t0, 0.0 );
	float s = smoothstep( 0.0, ${f(SHADE.shadow.soft)} + ${f(SHADE.shadow.per)} * t0, chord );
	k = 1.0 - ( 1.0 - k ) * ( 1.0 - ${f(SHADE.shadow.dark)} * s );
	gl_FragColor = vec4( vec3( 1.0 - clamp( k, 0.0, 0.9 ) ), 1.0 );
}`,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.ZeroFactor,
    blendDst: THREE.SrcColorFactor,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = place(sheet, material);
  return { mesh, dispose() { material.dispose(); } };
}
