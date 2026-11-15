import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { Builder } from '../../../world/build';
import { MAT, PLACES } from '../layout';
import type { PartFactory, PartState } from '../part';
import { contactShadow, spillLight } from './keyboard/shapes';
import { mouseMaterials } from './mouse/materials';
import { mouseGeometry } from './mouse/model';
import type { V2 } from './mouse/shape';

// His mouse: a high end wireless gaming mouse, designed first for its size on the page, about fifty pixels long, where
// two before it read as a pebble and a dark lump. What says "gaming mouse" there: a long low wedge drawn in at the
// waist, a near black top over a lighter anodised graphite side, two buttons parted from the palm by a V and split by
// a seam with a copper wheel in its slot, a thin line of light round the foot and a slit of light along the palm's
// spine, and a steel trim at the shell's edge that carries the cursor's light. What a close look finds (the grooved
// seams, the thumb buttons in their recess, the knurled grip, the wheel's tread, the button behind it) stays
// subordinate to that.

const D2R = Math.PI / 180;
// How strongly the light burns at full: under the bloom's threshold, so it never blooms.
const GLOW = 1.65;
// How much of the line's light lands on the mat round its foot, and how far out it reaches, in millimetres.
const SPILL = { k: 0.3, reach: 6 };

// The light the line lays on the mat: its foot's outline drawn soft, in a map laid under the mouse.
function spillMap(foot: V2[]): { map: THREE.CanvasTexture; w: number; d: number; at: THREE.Vector4 } {
  const w = 110, d = 160, px = 3, cv = document.createElement('canvas');
  cv.width = w * px; cv.height = d * px;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, cv.width, cv.height);
  g.lineJoin = 'round';
  const path = () => { g.beginPath(); foot.forEach(([x, z], i) => (i ? g.lineTo : g.moveTo).call(g, (x + w / 2) * px, (z + d / 2) * px)); g.closePath(); };
  const n = 14;
  for (let i = n; i >= 1; i--) {
    const s = i / n;
    g.strokeStyle = `rgba(247, 150, 50, ${(0.2 * (1 - s) ** 2).toFixed(3)})`;
    g.lineWidth = 2 * SPILL.reach * s * px;
    path();
    g.stroke();
  }
  const map = new THREE.CanvasTexture(cv);
  map.anisotropy = 4;
  return { map, w, d, at: new THREE.Vector4(-w / 2, -d / 2, 1 / w, 1 / d) };
}


export const build: PartFactory = () => {
  const [px, pz, turn] = PLACES.mouse;
  const group = new THREE.Group();
  group.name = 'mouse';
  group.position.set(px, MAT.h, pz);
  group.rotation.y = turn * D2R;
  const geo = mouseGeometry();
  const M = mouseMaterials(geo.axle, geo.wheelZ);
  const b = new Builder();
  for (const g of geo.solid) b.add(g, M.mouse);
  const meshes = b.build(group, 'mouse');
  const shadow = contactShadow(56, 116, 26, 10, 1);
  shadow.position.y = 0.15;
  group.add(shadow);
  // Seen alone there is no mat for the light to land on, and it would hang in the air.
  const alone = typeof location !== 'undefined' && new URLSearchParams(location.search).get('only') === 'mouse';
  const spill = alone ? null : (() => {
    const m = spillMap(geo.foot);
    const mesh = spillLight(m.w, m.d, m.map, m.at, 0);
    mesh.position.y = 0.35;
    group.add(mesh);
    return { mesh, map: m.map };
  })();

  const hot = new THREE.Color(hex('hot')), flame = new THREE.Color(hex('flame')), pale = new THREE.Color(hex('pale'));
  let last = -1;
  return {
    group,
    alone: { at: [px, MAT.h + 18, pz], r: 66 },
    update(s: PartState) {
      const k = s.lights.keys;
      if (k === last) return false;
      last = k;
      M.led.value.copy(flame).lerp(hot, 0.35).multiplyScalar(GLOW * k);
      M.core.value.copy(hot).lerp(pale, 0.15).multiplyScalar(GLOW * k);
      if (spill) (spill.mesh.material as THREE.ShaderMaterial).uniforms.uK.value = SPILL.k * k;
      return false;
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      M.mouse.dispose();
      if (spill) { spill.mesh.geometry.dispose(); (spill.mesh.material as THREE.Material).dispose(); spill.map.dispose(); }
    },
  };
};
