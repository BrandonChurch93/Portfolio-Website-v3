import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { ROCKET } from '../layout';
import type { PartFactory } from '../part';

// A stand in until the rocket is made: a body, a nose and a flame.
export const build: PartFactory = () => {
  const group = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.4, metalness: 0.9 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(ROCKET.r, ROCKET.r, ROCKET.bands[1], 48), steel);
  body.position.y = ROCKET.mouth + 16 + ROCKET.bands[1] / 2;
  const noseTall = ROCKET.tall - 16 - ROCKET.bands[1], nose = new THREE.Mesh(new THREE.ConeGeometry(ROCKET.r, noseTall, 48), steel);
  nose.position.y = ROCKET.mouth + 16 + ROCKET.bands[1] + noseTall / 2;
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(ROCKET.r * 0.5, ROCKET.r * 0.8, 16, 32, 1, true), steel);
  bell.position.y = ROCKET.mouth + 8;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(ROCKET.r * 0.7, 150, 24, 1, true).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex('hot')).multiplyScalar(3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.position.y = ROCKET.mouth - 75;
  group.add(body, nose, bell, flame);
  for (const o of [body, nose, bell]) o.castShadow = o.receiveShadow = true;
  return {
    group,
    alone: { at: [0, ROCKET.mouth + ROCKET.tall / 2, 0], r: ROCKET.tall * 0.56 },
    update(s) { (flame.material as THREE.MeshBasicMaterial).opacity = s.burn; flame.scale.y = 0.4 + s.burn; return s.burn > 0; },
  };
};
