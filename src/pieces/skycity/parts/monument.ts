import * as THREE from 'three';
import { registry } from '../../../hooks/registry';
import { Builder, slice } from '../../../world/build';
import { MONUMENT, lift, seat } from '../layout';
import type { PartFactory } from '../part';
import { base } from './monument/base';
import { carve } from './monument/carve';
import { rays, turned } from './monument/disc';
import { baseMaterial, goldMaterial } from './monument/materials';
import { DISC } from './monument/plan';

// The monument at the right of the skyline, where the dunes meet the city: a colossal Sun disc of polished gold
// standing on its rim, the ancestor of the Sun stones the stream strikes in Work, carved as they are. It stands in a
// cradle of dark bronze on a stepped plinth of old stone, an obelisk of black granite with a gold cap at each end, and
// braziers at its foot. It is turned toward the moon, so the visitor sees its face at an angle and its thickness.
// It stands still and casts the moon's shadow. Only the braziers' flames move.

const hash = (k: number) => { let s = (k * 2654435761) >>> 0; s ^= s >>> 15; s = Math.imul(s, 2246822507) >>> 0; s ^= s >>> 13; return (s >>> 0) / 4294967296; };

export const build: PartFactory = async ({ tier }) => {
  const group = new THREE.Group();
  group.name = 'monument';
  const body = new THREE.Group();
  body.matrixAutoUpdate = false;
  seat(MONUMENT.x, MONUMENT.z, 0, DISC.spin, body.matrix);
  group.add(body);

  const t0 = performance.now();
  const carving = await carve();
  const carved = performance.now() - t0;
  await slice();
  const gold = goldMaterial(carving), { mat: stone, u } = baseMaterial();
  const b = new Builder();
  const face = turned();
  face.translate(0, DISC.at, 0);
  const faceTris = (face.index?.count ?? 0) / 3;
  b.add(face, gold);
  await slice();
  const blades = rays();
  blades.translate(0, DISC.at, 0);
  const rayTris = blades.getAttribute('position').count / 3;
  b.add(blades, gold);
  await slice();
  const quiet = new Builder();
  for (const p of base()) (p.cast === false ? quiet : b).add(p.g, p.gold ? gold : stone, undefined, { shadow: p.cast !== false });
  await slice();
  const tris = b.tris + quiet.tris;
  const meshes = [...(await b.buildInSlices(body, 'monument')), ...(await quiet.buildInSlices(body, 'monument-fine'))];
  const total = performance.now() - t0;
  for (const m of meshes) m.matrixAutoUpdate = false;
  body.updateMatrixWorld(true);

  registry.tool('monumentStats', () => ({ tris, meshes: meshes.length, carved: Math.round(carved), faceTris, rayTris, total: Math.round(total) }));
  const mid = lift(MONUMENT.x, DISC.at * 0.82, MONUMENT.z);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    group,
    alone: { at: [mid.x, mid.y, mid.z], r: 135 },
    update(s) {
      if (reduced || tier === 'static' || s.still) { u.uFlick.value = 1; return false; }
      const f = s.t * 7, k = Math.floor(f), w = f - k, a = hash(k), c = hash(k + 1);
      u.uFlick.value = 0.85 + 0.3 * (a + (c - a) * w);
      return true;
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      gold.dispose();
      stone.dispose();
      carving.normal.dispose();
      carving.color.dispose();
      carving.orm.dispose();
    },
  };
};
