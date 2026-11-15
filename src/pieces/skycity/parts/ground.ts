import * as THREE from 'three';
import { GROUND } from '../layout';
import type { PartFactory } from '../part';

// A stand in until the ground is made: a plain disc on a cone of rock.
export const build: PartFactory = () => {
  const group = new THREE.Group(), stone = new THREE.MeshStandardMaterial({ color: 0x2a2623, roughness: 0.8 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(GROUND.r, GROUND.r - 20, GROUND.rim, 128), stone);
  top.position.y = -GROUND.rim / 2;
  const rock = new THREE.Mesh(new THREE.ConeGeometry(GROUND.r - 20, GROUND.rock - GROUND.rim, 96).rotateX(Math.PI), stone);
  rock.position.y = -GROUND.rim - (GROUND.rock - GROUND.rim) / 2;
  group.add(top, rock);
  group.traverse((o) => { o.castShadow = o.receiveShadow = true; });
  return { group, alone: { at: [0, -GROUND.rock / 2, 0], r: GROUND.r * 1.05 } };
};
