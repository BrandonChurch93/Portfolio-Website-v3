import * as THREE from 'three';
import { SPIRE } from '../layout';
import type { PartFactory } from '../part';

// A stand in until the spire is made: a plain needle.
export const build: PartFactory = () => {
  const group = new THREE.Group();
  const needle = new THREE.Mesh(new THREE.ConeGeometry(SPIRE.foot / 2, SPIRE.tall, 24).translate(0, SPIRE.tall / 2, 0), new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.35, metalness: 0.9 }));
  needle.castShadow = needle.receiveShadow = true;
  group.add(needle);
  return { group, alone: { at: [0, SPIRE.tall / 2, 0], r: SPIRE.tall * 0.56 } };
};
