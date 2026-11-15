import * as THREE from 'three';
import { registry } from '../../../hooks/registry';
import type { PartFactory } from '../part';
import { BEAR, BEAR_Y, FOOT_AT, LAG, drawn } from './headphones/form';
import { headphonesMaterials } from './headphones/materials';
import { buildHeadphones } from './headphones/model';

// His headphones, hanging on a desk stand at the back right of the top, across from the lamp. High end over ear
// headphones of the site's own design: deep machined cups in dark steel, thick knitted cushions, smooth stems that
// slide out of the band, a copper crown on one cup, and the wide knitted canopy under two polished rails. The stand is a
// weighted foot, a post and a padded saddle the band bears on. They have no light of their own.
// The page swings them: the pair turns about the point where the band bears on the saddle, by the angle it is handed,
// and each cup lags a little behind on its pivot, so they have weight. The stand does not move.

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export const build: PartFactory = () => {
  const { mats, of, kindOf } = headphonesMaterials();
  const { group, swing, cups, meshes, tris } = buildHeadphones(of, kindOf, mats);

  // For measuring from a script: how many triangles, and where the highest point of the pair and its stand, the foot
  // and the bearing point are drawn, in host heights across and down from the host's middle.
  registry.tool('headphonesReach', () => {
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(group.parent?.matrixWorld ?? new THREE.Matrix4()).invert();
    let hi = { at: [0, 1e9] as [number, number], p: [0, 0, 0] }, left = 1e9, right = -1e9, low = -1e9;
    const p = new THREE.Vector3();
    for (const m of meshes) {
      const pos = m.geometry.getAttribute('position'), to = m.matrixWorld.clone().premultiply(inv);
      for (let i = 0; i < pos.count; i += 3) {
        p.fromBufferAttribute(pos, i).applyMatrix4(to);
        const w = drawn(p);
        if (w[1] < hi.at[1]) hi = { at: w, p: p.toArray().map(Math.round) };
        left = Math.min(left, w[0]); right = Math.max(right, w[0]); low = Math.max(low, w[1]);
      }
    }
    const each = Object.fromEntries(meshes.map((m) => [m.name, (m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3]));
    return { tris, meshes: meshes.length, each, highest: hi, fromTop: hi.at[1] + 0.5, left, right, low, bear: drawn(BEAR), foot: drawn(FOOT_AT) };
  });

  let shown = { a: NaN, l: NaN };
  return {
    group,
    alone: { at: [FOOT_AT.x, BEAR_Y * 0.55, FOOT_AT.z], r: 265 },
    update(s) {
      const a = s.swing, l = clamp(-(LAG.angle * a + LAG.speed * (s.still ? 0 : s.swung)), -LAG.most, LAG.most);
      if (a !== shown.a || l !== shown.l) {
        swing.rotation.z = a;
        cups[0].rotation.z = l;
        cups[1].rotation.z = l;
        shown = { a, l };
      }
      return false;
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      for (const m of Object.values(mats)) m.dispose();
    },
  };
};
