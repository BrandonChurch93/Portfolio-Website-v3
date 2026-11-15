import * as THREE from 'three';
import { Builder } from '../../../world/build';
import { MAT, PLACES } from '../layout';
import type { PartFactory, PartState } from '../part';
import { ramp } from './keyboard/light';
import { contactShadow } from './keyboard/shapes';
import { kind } from './keyboard/model';
import { KIND, mouseMaterials } from './mouse/materials';
import { MOUSE, cradleGeometry, shellGeometry, sideButtons, skates, topAt, wheelGeometry } from './mouse/model';

// His mouse: a high end wireless gaming mouse with a sculpted shell, split main buttons, a wheel with a tread, two
// thumb buttons, skates under it and one small light in the split behind the wheel, which comes on with the keys.

const D2R = Math.PI / 180;
// How strongly the light burns at full.
const GLOW = 0.62;

export const build: PartFactory = () => {
  const [px, pz, turn] = PLACES.mouse;
  const group = new THREE.Group();
  group.name = 'mouse';
  group.position.set(px, MAT.h, pz);
  group.rotation.y = turn * D2R;
  const M = mouseMaterials();
  const b = new Builder();
  const shell = shellGeometry();
  b.add(kind(shell.clone(), KIND.shell), M.mouse);
  for (const g of sideButtons(shell)) b.add(kind(g, KIND.thumb), M.mouse);
  for (const g of skates()) b.add(kind(g, KIND.skate), M.mouse);
  const { z, r } = MOUSE.wheel, wy = topAt(shell, 0, z) + 2.4 - r;
  b.add(kind(wheelGeometry().translate(0, wy, z), KIND.wheel), M.mouse);
  M.wheelY.value = wy;
  for (const g of cradleGeometry(wy)) b.add(kind(g, KIND.cradle), M.mouse);
  b.build(group, 'mouse');
  const shadow = contactShadow(56, 116, 24, 7, 0.75);
  shadow.position.y = 0.15;
  group.add(shadow);

  const col = new THREE.Color();
  let last = -1;
  return {
    group,
    alone: { at: [px, MAT.h + 20, pz], r: 70 },
    update(s: PartState) {
      const k = s.lights.keys;
      if (k === last) return false;
      last = k;
      M.led.value.copy(ramp(0.7 * k, col)).multiplyScalar(0.7 * k * GLOW * 4);
      return false;
    },
  };
};
