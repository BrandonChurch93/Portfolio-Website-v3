import * as THREE from 'three';
import { lots } from '../layout';
import type { PartFactory } from '../part';

// A stand in until the towers are made: a plain block on every lot.
export const build: PartFactory = () => {
  const group = new THREE.Group(), all = lots();
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x33302d, roughness: 0.5, metalness: 0.6 }), all.length);
  const m = new THREE.Object3D();
  all.forEach((l, i) => {
    m.position.set(l.x, 0, l.z);
    m.rotation.y = (l.turn * Math.PI) / 180;
    m.scale.set(l.w, l.tall, l.d);
    m.updateMatrix();
    mesh.setMatrixAt(i, m.matrix);
  });
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return { group, alone: { at: [0, 120, 0], r: 700 } };
};
