import * as THREE from 'three';
import { registry } from '../../../hooks/registry';
import { slice } from '../../../world/build';
import { bend, lift } from '../layout';
import type { PartFactory } from '../part';
import { poolMaterial, sandDepth, sandMaterial, thingsMaterial } from './dunes/materials';
import { RIDGES } from './dunes/plan';
import { poolGeometry } from './dunes/pool';
import { sand } from './dunes/sand';
import { things } from './dunes/things';

// The dunes at the right of the world, opposite the jungle and nothing like it: pale, low, smooth, open and empty,
// on the moonlit side, where the raking moon draws every crest (DUNES in the plan). A sea of great dunes and star
// dunes with sharp crests, built along their crests (./dunes/sand.ts) from the plan in ./dunes/plan.ts, a pool of
// mirror polished gold in a hollow between them in front of the monument (./dunes/pool.ts), and a few things standing
// in the sand (./dunes/things.ts). Three programs: the sand, the pool, the things. Nothing moves, and all of it casts
// and takes the moon's shadow.

export const build: PartFactory = async () => {
  const group = new THREE.Group();
  group.name = 'dunes';
  const from = performance.now();
  const field = await sand(RIDGES);
  bend(field.geometry);
  await slice();
  const sandMat = sandMaterial(), poolMat = poolMaterial(), thingMat = thingsMaterial();
  const ground = new THREE.Mesh(field.geometry, sandMat);
  ground.name = 'dunes:sand';
  ground.customDepthMaterial = sandDepth();
  const pg = bend(poolGeometry());
  const pool = new THREE.Mesh(pg, poolMat);
  pool.name = 'dunes:pool';
  await slice();
  const made = things(field.field);
  const stand = new THREE.Mesh(made.geometry, thingMat);
  stand.name = 'dunes:things';
  for (const m of [ground, pool, stand]) {
    m.castShadow = true;
    m.receiveShadow = true;
    m.matrixAutoUpdate = false;
    group.add(m);
  }
  const count = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  const tris = { sand: count(field.geometry), pool: count(pg), things: count(made.geometry) };
  const ms = Math.round(performance.now() - from);
  group.userData.triangles = tris.sand + tris.pool + tris.things;
  registry.tool('dunesStats', () => ({ tris, total: group.userData.triangles, ms }));
  registry.tool('dunesHeight', (x: number, z: number) => field.field.height(x, z));

  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('dunesAt')?.split(',').map(Number);
  const want = asked?.length === 4 && asked.every(Number.isFinite) ? asked : [470, 30, 40, 230];
  const alone = { at: lift(want[0], want[1], want[2]).toArray() as [number, number, number], r: want[3] };

  return {
    group,
    alone,
    dispose() {
      field.geometry.dispose();
      pg.dispose();
      made.geometry.dispose();
      sandMat.dispose();
      ground.customDepthMaterial?.dispose();
      poolMat.dispose();
      thingMat.dispose();
    },
  };
};
