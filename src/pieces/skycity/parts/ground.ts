import * as THREE from 'three';
import { Builder, slice } from '../../../world/build';
import { AVENUES, DISTRICTS, DUNES, FOREST, PLAZA, RINGS, ROAD, lift } from '../layout';
import type { PartFactory } from '../part';
import { polished } from '../polish';
import { metals, outcrops } from './ground/bare';
import { MAP, TALL, floorGeometry, floorMap, squares, standing } from './ground/floor';
import { polar } from './ground/kit';
import { margin } from './ground/margin';
import { type GroundUniforms, floorMaterial, madeMaterial } from './ground/materials';
import { finder, inner, outcropGeometry, plateGeometry, plates, underGeometry } from './ground/plates';
import { PAVED } from './ground/roads';

// The ground of the world: the surface of a small planet, from the spire's plaza out to the torn edge. Under the city
// it is paved; outside it, at the rim and in two wedges that cut into the city, it is bare ground, the planet's own,
// with pools of mirror polished metal where a world would have lakes (./ground/bare.ts); under
// the jungle and the dunes it is a plain floor that their own parts cover; and at the margin the ground has broken
// into blocks that step down to the edge and fall into it (./ground/plates.ts), with what the breaking did on them
// (./ground/margin.ts). Two programs: the floor, which is the ground itself, and everything made on it.
// ?groundAt=bearing,distance,reach frames one stretch of it close when it is seen alone, in degrees and map units.

export const build: PartFactory = async () => {
  const group = new THREE.Group();
  group.name = 'ground';
  const u: GroundUniforms = { uT: { value: 0 }, uCore: { value: 1 } };
  const made = polished(madeMaterial(u, 'ground-made')), low = polished(madeMaterial(u, 'ground-low')), b = new Builder();

  const clock: Record<string, number> = {};
  let t0 = performance.now();
  const lap = (k: string) => { const t = performance.now(); clock[k] = Math.round(t - t0); t0 = t; };
  const sq = squares();
  await standing(b, made, low, sq);
  lap('standing');
  const list = await plates();
  lap('plates');
  const on = finder(list);
  await margin(b, made, low, on);
  lap('margin');
  await metals(b, made);
  lap('metals');
  const meshes = await b.buildInSlices(group, 'ground');
  lap('merge');
  for (const m of meshes) if (m.material === low) m.castShadow = false;
  let tris = b.tris;
  await slice();

  const map = await floorMap(sq);
  lap('map');
  const zone = (k: string): [number, number, number, number] => { const d = DISTRICTS.find((x) => x.kind === k); return d ? [d.r0, d.r1, d.from, d.to] : [0, 0, 0, 0]; };
  const floor = polished(floorMaterial(u, map, {
    plaza: PLAZA, rings: RINGS, road: ROAD, avenues: AVENUES, city: PAVED, mapR: MAP.r, tall: TALL,
    squares: sq.map((p) => [p.r0, p.r1, p.from, p.to]),
    zones: { procession: zone('procession'), temple: zone('temple'), monument: zone('monument') },
    forest: [FOREST.r0 - 10, 2000, FOREST.from, FOREST.to],
    dunes: [DUNES.r0 - 10, 2000, DUNES.from, DUNES.to],
    open: DISTRICTS.filter((d) => d.kind === 'open').map((d): [number, number, number, number] => [d.r0, 2000, d.from, d.to]),
  }));
  const geos: THREE.BufferGeometry[] = [];
  geos.push(await floorGeometry()); lap('land');
  geos.push(await plateGeometry(list)); lap('plateGeo');
  geos.push(...(await underGeometry())); lap('under');
  geos.push(await outcropGeometry(outcrops(inner))); lap('crops');
  ['whole', 'plates', 'crack', 'skirt', 'crops'].forEach((name, i) => {
    const m = new THREE.Mesh(geos[i], floor);
    m.name = `ground:${name}`;
    m.castShadow = name !== 'crack' && name !== 'skirt';
    m.receiveShadow = true;
    m.matrixAutoUpdate = false;
    group.add(m);
    tris += (geos[i].index ? geos[i].index!.count : geos[i].getAttribute('position').count) / 3;
  });
  group.userData.triangles = Math.round(tris);

  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('groundAt')?.split(',').map(Number);
  let alone: { at: [number, number, number]; r: number } = { at: [0, -60, 300], r: 520 };
  if (asked?.length === 3 && asked.every(Number.isFinite)) {
    const q = polar(asked[0], asked[1]), p = lift(q.x, 0, q.y);
    alone = { at: [p.x, p.y, p.z], r: asked[2] };
  }
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('hook')) (window as unknown as { __ground?: unknown }).__ground = { tris: Math.round(tris), made: Math.round(b.tris), blocks: list.length, parts: meshes.length, land: (geos[0].index?.count ?? 0) / 3, clock };

  return {
    group,
    alone,
    update(s) {
      u.uT.value = s.still ? 0 : s.t;
      u.uCore.value = s.core;
      return false;
    },
    dispose() {
      map.dispose();
      group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
      for (const m of [made, low, floor]) m.dispose();
    },
  };
};
