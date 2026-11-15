import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { STONE } from '../layout';
import type { PartFactory } from '../part';

// A stand in until the stone is made: a plain disc with its rings as lines that light from the rim in.
export const build: PartFactory = () => {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(STONE.r, STONE.r, STONE.edge, 96), new THREE.MeshStandardMaterial({ color: hex('bronze'), roughness: 0.45, metalness: 1 }));
  body.position.y = -STONE.edge / 2;
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  const lit = STONE.rings.map((k) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: hex('flame'), emissiveIntensity: 0 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(k * STONE.r - 5, k * STONE.r - 1, 96).rotateX(-Math.PI / 2), m);
    ring.position.y = 0.4;
    group.add(ring);
    return m;
  });
  return {
    group,
    alone: { at: [0, 0, 0], r: STONE.r * 1.05 },
    update(s) { lit.forEach((m, i) => { m.emissiveIntensity = 2 * Math.min(1, Math.max(0, s.fill * lit.length - i)); }); },
  };
};
