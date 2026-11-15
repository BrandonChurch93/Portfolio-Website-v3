import * as THREE from 'three';
import { Builder, slice } from '../../../world/build';
import { AVENUES, GROUND, PLAZA, RINGS, ROAD } from '../layout';
import type { PartFactory } from '../part';
import { EDGE, floorDisc, floorMap, parks, standing } from './ground/floor';
import { frame } from './ground/frame';
import { type GroundUniforms, floorMaterial, madeMaterial, rockMaterial } from './ground/materials';
import { rim } from './ground/rim';
import { rock } from './ground/rock';

// The ground the city stands on, which floats: the floor of the city, the rim round it, the rock under it down to the
// keel, and what holds it up. Three materials: the rock, everything made, and the floor.
export const build: PartFactory = async () => {
  const group = new THREE.Group();
  group.name = 'ground';
  const u: GroundUniforms = { uT: { value: 0 } };
  const made = madeMaterial(u), b = new Builder();

  const { pods } = await frame(b, made);
  await rim(b, made);
  const ps = parks();
  await standing(b, made, ps);
  await b.buildInSlices(group, 'ground');

  const stone = new THREE.Mesh(await rock(), rockMaterial(u, pods, GROUND.r));
  stone.name = 'ground:rock';
  stone.receiveShadow = true;
  stone.matrixAutoUpdate = false;
  group.add(stone);
  await slice();

  const map = await floorMap(ps);
  const floor = new THREE.Mesh(floorDisc(), floorMaterial(u, map, {
    plaza: PLAZA, rings: RINGS, road: ROAD, avenues: AVENUES, edge: EDGE, r: GROUND.r,
    parks: ps.map((p) => [p.r0, p.r1, p.from, p.to]),
  }));
  floor.name = 'ground:floor';
  floor.receiveShadow = true;
  floor.matrixAutoUpdate = false;
  group.add(floor);

  return {
    group,
    alone: { at: [0, -90, 0], r: 400 },
    update(s) {
      u.uT.value = s.still ? 0 : s.t;
      return true;
    },
    dispose() {
      map.dispose();
      group.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
    },
  };
};
