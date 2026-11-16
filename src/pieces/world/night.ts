import * as THREE from 'three';
import { MOONWARD } from './layout';

// What polished metal mirrors in the world: the night round it. There is no sky in the piece (the sky and the moon
// are the page's), so this is only ever seen in gold, bronze and glass. It is made for them: a wide pale light
// about the moon, so a face turned that way is bright and even, the moon's own disc inside it for one hard glint,
// a dim dome overhead falling to the horizon, a low warm band where the page's glow stands behind the world, and
// dark warm ground beneath. So the faces of one thing are each their own shade, brightest toward the moon.
export const NIGHT = {
  // The dome: how bright overhead and at the horizon.
  dome: [0.5, 0.07] as const,
  // The light about the moon: how bright, and how wide, as the cosine of its half width is to 1.
  moon: { power: 3.4, wide: 0.42, disc: 26, size: 0.035 },
  // The band at the horizon behind the world: how bright, how tall, and how far round it reaches.
  glow: { power: 0.75, tall: 0.14 },
  ground: 0.035,
  // A wide soft light in front of the world and above it, where the visitor is: what the faces turned to the
  // visitor are seen by, now that the moon is behind the world. Which way it lies, how bright, and how wide.
  front: { toward: [-0.15, 0.42, 0.9] as const, power: 0.85, wide: 0.75 },
} as const;

export function night(): THREE.Scene {
  const s = new THREE.Scene(), m = new THREE.Vector3(...MOONWARD).normalize(), f = new THREE.Vector3(...NIGHT.front.toward).normalize();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(60, 64, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uMoon: { value: m }, uFront: { value: f } },
    vertexShader: 'varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: `varying vec3 vD;
uniform vec3 uMoon;
uniform vec3 uFront;
void main() {
	vec3 d = normalize( vD );
	float up = smoothstep( -0.02, 1.0, d.y ), toMoon = dot( d, uMoon );
	vec3 pale = vec3( 1.0, 0.86, 0.7 ), warm = vec3( 1.0, 0.6, 0.28 );
	vec3 c = pale * mix( ${NIGHT.dome[1].toFixed(3)}, ${NIGHT.dome[0].toFixed(3)}, up * up ) * smoothstep( -0.06, 0.02, d.y );
	c += pale * ${NIGHT.moon.power.toFixed(2)} * pow( smoothstep( ${(1 - 2 * NIGHT.moon.wide).toFixed(3)}, 1.0, toMoon ), 2.2 );
	c += pale * ${NIGHT.moon.disc.toFixed(1)} * smoothstep( ${(1 - NIGHT.moon.size * 0.5).toFixed(4)}, ${(1 - NIGHT.moon.size * 0.35).toFixed(4)}, toMoon );
	c += warm * ${NIGHT.glow.power.toFixed(2)} * exp( - pow( ( d.y - 0.03 ) / ${NIGHT.glow.tall.toFixed(3)}, 2.0 ) ) * ( 0.3 + 0.7 * ( 1.0 - smoothstep( -1.0, 0.4, d.z ) ) );
	c += warm * ${NIGHT.ground.toFixed(3)} * ( 1.0 - smoothstep( -0.06, 0.02, d.y ) );
	c += pale * ${NIGHT.front.power.toFixed(2)} * pow( smoothstep( ${(1 - 2 * NIGHT.front.wide).toFixed(3)}, 1.0, dot( d, uFront ) ), 1.6 ) * smoothstep( -0.06, 0.1, d.y );
	gl_FragColor = vec4( c, 1.0 );
}`,
  })));
  return s;
}
