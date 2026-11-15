import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { Builder } from '../../../world/build';
import { MAT, PLACES } from '../layout';
import type { PartFactory, PartState } from '../part';
import { contactShadow } from './keyboard/shapes';
import { mouseMaterials } from './mouse/materials';
import { mouseGeometry } from './mouse/model';

// His mouse: a high end wireless gaming mouse, long and low. A satin black shell in three pieces (the two main
// buttons and the palm, which carries a matte panel) sits on a matte graphite frame, each piece parted from the next by
// a chamfered gap, and its faces meet at creases the cursor's light runs along. The wheel stands proud in a channel
// between the buttons, a rubber tread between copper hubs, with a small button behind it in a copper bezel. The
// thumb's two buttons are pads on the left flank, where the parting line sweeps up round them over a flared rest, and a
// gripped panel is set into each flank. One small light, a ring round the foot of the button behind the wheel, comes on
// with the keys and lights the bezel, the button and the back of the wheel.

const D2R = Math.PI / 180;
// How strongly the light burns at full: under the bloom's threshold, so it never blooms.
const GLOW = 1.3;

export const build: PartFactory = () => {
  const [px, pz, turn] = PLACES.mouse;
  const group = new THREE.Group();
  group.name = 'mouse';
  group.position.set(px, MAT.h, pz);
  group.rotation.y = turn * D2R;
  const geo = mouseGeometry();
  const M = mouseMaterials(geo.axle, geo.ledY);
  const b = new Builder();
  for (const g of geo.solid) b.add(g, M.mouse);
  const meshes = b.build(group, 'mouse');
  const shadow = contactShadow(54, 116, 24, 8, 0.8);
  shadow.position.y = 0.15;
  group.add(shadow);

  const hot = new THREE.Color(hex('hot')), pale = new THREE.Color(hex('pale'));
  let last = -1;
  return {
    group,
    alone: { at: [px, MAT.h + 18, pz], r: 66 },
    update(s: PartState) {
      const k = s.lights.keys;
      if (k === last) return false;
      last = k;
      M.led.value.copy(hot).lerp(pale, 0.3 * k).multiplyScalar(GLOW * k);
      return false;
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      M.mouse.dispose();
    },
  };
};
