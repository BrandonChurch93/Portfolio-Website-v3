import * as THREE from 'three';
import { TABLE } from '../layout';
import type { PartFactory } from '../part';

// A stand in until the table is made: a deck on four legs.
export const build: PartFactory = () => {
  const group = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.5, metalness: 0.9 });
  const w = TABLE.r - TABLE.l, deck = new THREE.Mesh(new THREE.BoxGeometry(w, TABLE.top - TABLE.under, TABLE.deep), steel);
  deck.position.set((TABLE.l + TABLE.r) / 2, (TABLE.top + TABLE.under) / 2, 0);
  group.add(deck);
  for (const x of [TABLE.l + 14, TABLE.r - 14]) for (const z of [-TABLE.deep / 2 + 12, TABLE.deep / 2 - 12]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(10, TABLE.under, 10), steel);
    leg.position.set(x, TABLE.under / 2, z);
    group.add(leg);
  }
  group.traverse((o) => { o.castShadow = o.receiveShadow = true; });
  return { group, alone: { at: [(TABLE.l + TABLE.r) / 2, TABLE.top / 2, 0], r: w * 0.6 } };
};
