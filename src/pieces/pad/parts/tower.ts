import * as THREE from 'three';
import { LAUNCH, ROCKET, TABLE, TOWER } from '../layout';
import type { PartFactory } from '../part';

// A stand in until the tower is made: a post with three arms that draw back at the launch.
export const build: PartFactory = () => {
  const group = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.5, metalness: 0.9 });
  const w = TOWER.r - TOWER.l, tall = TOWER.top - TABLE.top, post = new THREE.Mesh(new THREE.BoxGeometry(w, tall, TOWER.deep), steel);
  post.position.set((TOWER.l + TOWER.r) / 2, TABLE.top + tall / 2, 0);
  group.add(post);
  const reach = -ROCKET.r - TOWER.r, arms = TOWER.arms.map((y) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(reach, 8, 14).translate(reach / 2, 0, 0), steel);
    arm.position.set(TOWER.r, y, 0);
    group.add(arm);
    return arm;
  });
  group.traverse((o) => { o.castShadow = o.receiveShadow = true; });
  return {
    group,
    alone: { at: [(TOWER.l + TOWER.r) / 2, TOWER.top / 2, 0], r: TOWER.top * 0.56 },
    update(s) { const k = Math.min(1, Math.max(0, (s.launch - LAUNCH.arms) / 0.5)); for (const a of arms) a.scale.x = 1 - 0.7 * k; },
  };
};
