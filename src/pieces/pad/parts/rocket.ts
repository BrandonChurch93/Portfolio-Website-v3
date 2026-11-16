import * as THREE from 'three';
import { registry } from '../../../hooks/registry';
import { ROCKET } from '../layout';
import type { PartFactory } from '../part';
import { STILL_T, makeFire } from './rocket/fire';
import { level } from './rocket/form';
import { U, codeTexture, hullMaterial } from './rocket/materials';
import { buildRocket } from './rocket/model';

// The rocket and its fire. A near black machine: wound carbon tanks under a clear coat, turned dark steel, copper
// only in its rims and fittings, drawn by the light on its edges and the long lines the cursor's light draws up it. It
// lights from its foot up as the stone fills, by the slits between its sections, the line up its raceway, its vents,
// its ports and the beacon on its spike. Then its engine lights, its fire is thrown out over the stone under the
// table, and it climbs on its plume. Everything is worked out from the state it is handed, so a held fill or launch is
// always the same picture and the launch runs backwards.

export const build: PartFactory = async () => {
  const mat = hullMaterial();
  U.uCode.value = await codeTexture();
  const { group: body, tris, meshes } = await buildRocket(mat);
  const fire = makeFire();
  body.add(fire.group);
  body.position.y = ROCKET.mouth;
  const group = new THREE.Group();
  group.add(body);

  registry.tool('rocketStats', () => ({ tris, meshes: meshes.length }));

  return {
    group,
    alone: { at: [0, ROCKET.mouth + ROCKET.tall / 2 - 20, 0], r: ROCKET.tall * 0.58 },
    update(s) {
      U.uLevel.value = level(s.fill);
      U.uBurn.value = s.burn;
      U.uFlash.value = s.flash;
      U.uTime.value = s.still ? STILL_T : s.t;
      U.uKeyAz.value = Math.atan2(s.cursor.x, s.cursor.z);
      fire.set(s);
      return s.burn > 0;
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      mat.dispose();
      U.uCode.value?.dispose();
      fire.dispose();
    },
  };
};
