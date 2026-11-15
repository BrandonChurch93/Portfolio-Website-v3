import * as THREE from 'three';
import { Builder, slice } from '../../../world/build';
import { AVENUES, DISTRICTS, FOREST, MARGIN, PLAZA, RINGS, ROAD, lift } from '../layout';
import type { PartFactory } from '../part';
import { MAP, TALL, floorGeometry, floorMap, squares, standing } from './ground/floor';
import { polar } from './ground/kit';
import { margin } from './ground/margin';
import { type GroundUniforms, floorMaterial, madeMaterial } from './ground/materials';
import { finder, plateGeometry, plates, underGeometry } from './ground/plates';
import { rockForms } from './ground/rocks';
import { CITY } from './ground/roads';
import { water } from './ground/water';

// The ground of the world: the surface of a small planet, from the spire's plaza out to the torn edge. Under the city
// it is paved; in the forest it is the land, its hills and small mountains with their crags and cliffs
// (./ground/rocks.ts), a lake by the temple and a fall down the front mountain (./ground/water.ts); and at the margin
// the land has broken into blocks that step down to the edge and fall into it (./ground/plates.ts), with what the
// breaking did on them (./ground/margin.ts). Two programs: the floor, which is the land itself, and everything made.
// ?groundAt=bearing,distance,reach frames one stretch of it close when it is seen alone, in degrees and map units.

export const build: PartFactory = async () => {
  const group = new THREE.Group();
  group.name = 'ground';
  const u: GroundUniforms = { uT: { value: 0 }, uCore: { value: 1 } };
  const made = madeMaterial(u, 'ground-made'), low = madeMaterial(u, 'ground-low'), b = new Builder();

  const sq = squares();
  await standing(b, made, low, sq);
  const list = await plates();
  const on = finder(list);
  await margin(b, made, low, on);
  const forms = await rockForms(b, made);
  await water(b, made, low);
  const meshes = await b.buildInSlices(group, 'ground');
  for (const m of meshes) if (m.material === low) m.castShadow = false;
  let tris = b.tris;
  await slice();

  const map = await floorMap(sq);
  const zone = (k: string): [number, number, number, number] => { const d = DISTRICTS.find((x) => x.kind === k)!; return [d.r0, d.r1, d.from, d.to]; };
  const floor = floorMaterial(u, map, {
    plaza: PLAZA, rings: RINGS, road: ROAD, avenues: AVENUES, city: CITY, mapR: MAP.r, tall: TALL, margin: MARGIN,
    squares: sq.map((p) => [p.r0, p.r1, p.from, p.to]),
    zones: { procession: zone('procession'), temple: zone('temple'), port: zone('port') },
    forest: [FOREST.r0, 2000, FOREST.from, FOREST.to],
  });
  const geos = [await floorGeometry(), await plateGeometry(list), await underGeometry()];
  ['whole', 'plates', 'under'].forEach((name, i) => {
    const m = new THREE.Mesh(geos[i], floor);
    m.name = `ground:${name}`;
    m.castShadow = name !== 'under';
    m.receiveShadow = true;
    m.matrixAutoUpdate = false;
    group.add(m);
    tris += geos[i].getAttribute('position').count / 3;
  });
  group.userData.triangles = Math.round(tris);

  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('groundAt')?.split(',').map(Number);
  let alone: { at: [number, number, number]; r: number } = { at: [0, -60, 300], r: 520 };
  if (asked?.length === 3 && asked.every(Number.isFinite)) {
    const q = polar(asked[0], asked[1]), p = lift(q.x, 0, q.y);
    alone = { at: [p.x, p.y, p.z], r: asked[2] };
  }
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('hook')) (window as unknown as { __ground?: unknown }).__ground = { tris: Math.round(tris), made: Math.round(b.tris), blocks: list.length, parts: meshes.length, forms };

  return {
    group,
    alone,
    update(s) {
      u.uT.value = s.still ? 0 : s.t;
      u.uCore.value = s.core;
      return !s.still;
    },
    dispose() {
      map.dispose();
      group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
      for (const m of [made, low, floor]) m.dispose();
    },
  };
};
