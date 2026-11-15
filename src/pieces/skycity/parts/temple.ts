import * as THREE from 'three';
import { registry } from '../../../hooks/registry';
import { slice } from '../../../world/build';
import { lift } from '../layout';
import type { PartFactory } from '../part';
import { Parts } from './temple/forms';
import { GAP_Y, K, type Lamp, MAX_LAMPS, U, templeMaterials } from './temple/materials';
import { LIGHT, PYRAMID } from './temple/plan';
import { buildQuarter } from './temple/quarter';
import { buildWay } from './temple/way';

// The temple quarter and the way to the spire, on the dome of the torn world. On the visitor's left limb, standing out
// sideways against the sky as the world curves, a precinct with the flair of ancient Egypt in a future that is clean
// and sure of itself: a great pyramid cased in polished gold on a battered terrace, its capstone held over a light, a
// stepped pyramid, an obelisk that is a mast, a long hall lit between its columns, a pylon gate whose doors are a
// hangar's with seated figures and obelisks before it, a causeway of lamps to a kiosk, and a long colonnade that fans
// out along the limb. Down the face of the world toward the visitor, seen from the air, the way to the spire: a long
// pool between gold edged bands, banded walks, rows of sphinxes, braziers and obelisks, colonnades along its walls,
// and a round square at its end with the sun disc laid in it. Its light is its own: few, low and warm.

// With reduced motion or on the static tier, everything is shown as it is at this time.
const REST = 2.2;
const hash = (k: number) => { let s = (k * 2654435761) >>> 0; s ^= s >>> 15; s = Math.imul(s, 2246822507) >>> 0; s ^= s >>> 13; return (s >>> 0) / 4294967296; };

export const build: PartFactory = async ({ tier }) => {
  const mats = templeMaterials(), group = new THREE.Group();
  group.name = 'temple';
  const b = new Parts(mats), lamps: Lamp[] = [];
  await buildQuarter(b, lamps);
  await slice();
  await buildWay(b, lamps);
  await slice();
  const tris = b.tris, meshes = await b.build(group);
  await slice();

  const halo = new THREE.Sprite(mats.halo);
  lift(PYRAMID.at[0], GAP_Y, PYRAMID.at[1], halo.position);
  halo.renderOrder = 2;
  group.add(halo);
  const hot = mats.halo.color.clone();

  const n = Math.min(lamps.length, MAX_LAMPS);
  // A lamp is given as a place on the map and a height over the ground there, and drawn into the materials where it
  // stands on the dome.
  const p = new THREE.Vector3();
  lamps.slice(0, n).forEach((l, i) => { lift(l.at[0], l.at[1], l.at[2], p); U.uLamps.value[i].set(p.x, p.y, p.z, l.power); U.uLampK.value[i].set(l.reach, l.heat); });
  U.uLampN.value = n;
  // Which lamps are braziers' flames, which flicker.
  const flames = lamps.slice(0, n).map((l, i) => (l.flicker ? i : -1)).filter((i) => i >= 0);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  registry.tool('templeStats', () => ({ tris, meshes: meshes.length, lamps: lamps.length, kinds: K }));

  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('templeAt')?.split(',').map(Number);
  const alone = asked?.length === 4 && asked.every(Number.isFinite) ? { at: [asked[0], asked[1], asked[2]] as [number, number, number], r: asked[3] } : { at: [-200, -150, 250] as [number, number, number], r: 460 };

  return {
    group,
    alone,
    update(s) {
      const t = reduced || tier === 'static' || s.still ? REST : s.t;
      U.uT.value = t;
      const breath = (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / LIGHT.breath)) ** 1.4;
      U.uBreath.value = breath;
      halo.scale.setScalar(22 + 8 * breath);
      mats.halo.color.copy(hot).multiplyScalar(0.16 + 0.12 * breath);
      for (const i of flames) {
        const k = Math.floor(t * 9 + i * 3.7), f = t * 9 + i * 3.7 - k, a = hash(k * 31 + i), c = hash((k + 1) * 31 + i);
        U.uLamps.value[i].w = lamps[i].power * (1 - LIGHT.flicker * 0.25 + LIGHT.flicker * 0.25 * (a + (c - a) * f));
      }
      return true;
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      mats.solid.dispose();
      mats.halo.map?.dispose();
      mats.halo.dispose();
    },
  };
};
