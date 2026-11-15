import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { seeded } from '../../../world/build';
import { CORE, DEBRIS, HEART, TEAR } from '../layout';
import type { PartFactory } from '../part';

// A stand in until what broke away is built: plain lumps of rock round the torn underside and under it, holding
// still, so the frame, the page and the stream can be checked. Nothing of it is kept.
export const build: PartFactory = () => {
  const rock = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex('bg')).lerp(new THREE.Color(hex('copper')), 0.22), roughness: 0.9, metalness: 0, flatShading: true });
  const r = seeded(4410), n = 90, lumps = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), rock, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), k = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, far = 240 + r() * (DEBRIS.far - 240), size = 4 + 46 * r() ** 3;
    const low = far < 700 ? TEAR.low - 20 : DEBRIS.high - 40;
    p.set(Math.sin(a) * far, low - r() * (low - DEBRIS.low), Math.cos(a) * far * 0.8);
    if (Math.hypot(p.x, p.y - HEART[1], p.z) < CORE.r + 60) p.y -= 160;
    m.compose(p, q.setFromEuler(e.set(r() * 6, r() * 6, r() * 6)), k.set(size * (0.7 + r()), size * (0.5 + 0.6 * r()), size * (0.6 + 0.8 * r())));
    lumps.setMatrixAt(i, m);
  }
  lumps.castShadow = lumps.receiveShadow = true;
  lumps.frustumCulled = false;
  const group = new THREE.Group();
  group.add(lumps);
  return { group, dispose() { rock.dispose(); lumps.geometry.dispose(); } };
};
