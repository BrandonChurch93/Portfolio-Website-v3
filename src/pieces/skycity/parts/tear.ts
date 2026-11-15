import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { EDGE, HEART, PLANET, TEAR } from '../layout';
import type { PartFactory } from '../part';

// A stand in until the torn underside is built: the dome's body as plain rock, and a rough underside that hangs
// lowest round the core, torn back into a hollow that is open toward the visitor. It is here so the frame, the
// page and the stream can be checked. Nothing of it is kept.
const R = PLANET.r, D2R = Math.PI / 180;
const noise = (a: number, b: number): number => {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

export const build: PartFactory = () => {
  const rock = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex('bg')).lerp(new THREE.Color(hex('copper')), 0.16), roughness: 0.94, metalness: 0, flatShading: true, side: THREE.DoubleSide });
  const group = new THREE.Group();
  const rings = 40, turns = 96, top: number[] = [], under: number[] = [], index: number[] = [];
  for (let i = 0; i <= rings; i++) for (let j = 0; j <= turns; j++) {
    const deg = (j / turns) * 360, b = deg * D2R, far = (EDGE.at(deg) * i) / rings, a = far / R;
    top.push(R * Math.sin(a) * Math.sin(b), R * Math.cos(a) - R - 1.5, R * Math.sin(a) * Math.cos(b));
    const ea = EDGE.at(deg) / R, rimR = R * Math.sin(ea), rimY = R * Math.cos(ea) - R, f = i / rings, r = rimR * f;
    const x = r * Math.sin(b), z = r * Math.cos(b);
    let y = rimY - (rimY - (TEAR.low + 20)) * (1 - f ** 1.7) * (0.7 + 0.3 * noise(i, j)) - (i > 0 && i < rings ? 30 * noise(j, i) : 0);
    y = Math.max(y, TEAR.low);
    if (r < TEAR.hollow) y = Math.max(y, HEART[1] + Math.sqrt(TEAR.hollow ** 2 - r ** 2) * 0.85);
    if (z > 0 && Math.abs(x) < 250) y = Math.max(y, HEART[1] + 150 * (1 - Math.abs(x) / 250) ** 0.5 * Math.min(1, z / 120));
    under.push(x, i === rings ? rimY : y, z);
    if (i < rings && j < turns) {
      const p = i * (turns + 1) + j, q = p + turns + 1;
      index.push(p, q, p + 1, p + 1, q, q + 1);
    }
  }
  for (const pts of [top, under]) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, rock);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  }
  return { group, dispose() { rock.dispose(); group.traverse((o) => (o as THREE.Mesh).geometry?.dispose()); } };
};
