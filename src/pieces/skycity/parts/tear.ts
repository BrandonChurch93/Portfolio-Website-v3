import * as THREE from 'three';
import { slice } from '../../../world/build';
import { HEART } from '../layout';
import type { PartFactory } from '../part';
import { masses, teeth, vents6 } from './tear/hang';
import { made } from './tear/made';
import { type TearUniforms, tearMaterial } from './tear/material';
import { backing, face, hollow, strip } from './tear/rock';
import { Sink } from './tear/sink';
import { table } from './tear/shape';

// The torn underside: the planet's inside where it was ripped in half. From the torn edge down, the section of the
// ground (paving, soil, what was built and cut through), then the planet's layers, each broken its own way along its
// beds and joints, with veins of metal through them, torn back round the core into a hollow open toward the
// visitor, and six places where the stream's light leaves the face. One mesh in one material: it never moves, so
// it casts and takes the moon's shadows, and the light in the vents follows the core.
export const build: PartFactory = async () => {
  const u: TearUniforms = { uT: { value: 0 }, uCore: { value: 1 } };
  const T = await table();
  const s = new Sink(600000);
  await strip(s, T);
  await face(s, T);
  await hollow(s, T);
  await masses(s, T);
  vents6(s, T);
  await slice();
  teeth(s, T);
  made(s, T);
  await slice();
  await backing(s, T);
  await slice();
  const geo = s.geometry();
  const mat = tearMaterial(u);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'tear';
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  const group = new THREE.Group();
  group.name = 'tear';
  group.add(mesh);
  group.userData.triangles = s.triangles;
  let shown = -1;
  return {
    group,
    alone: { at: [0, HEART[1] + 40, 300], r: 400 },
    update(st) {
      if (st.core !== shown) { shown = st.core; u.uCore.value = st.core; }
      u.uT.value = st.still ? 0 : st.t;
      return false;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
};
