import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { CORE, HEART } from '../layout';
import type { PartFactory } from '../part';

// A stand in until the core is built: a plain bright ball where the core is, so the frame, the page and the stream
// can be checked. Nothing of it is kept.
export const build: PartFactory = () => {
  const lit = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex('hot')).multiplyScalar(2.6) });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(CORE.r, 48, 32), lit);
  ball.position.set(...HEART);
  const group = new THREE.Group();
  group.add(ball);
  let shown = 0;
  return {
    group,
    alone: { at: [...HEART], r: CORE.r * 1.6 },
    update(s) {
      if (s.core !== shown) { shown = s.core; lit.color.set(hex('hot')).multiplyScalar(2.6 * s.core); }
      return true;
    },
    dispose() { lit.dispose(); ball.geometry.dispose(); },
  };
};
