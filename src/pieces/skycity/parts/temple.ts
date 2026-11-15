import * as THREE from 'three';
import { registry } from '../../../hooks/registry';
import { slice } from '../../../world/build';
import { lift } from '../layout';
import type { PartFactory } from '../part';
import { Parts } from './temple/forms';
import { K, type Lamp, MAX_LAMPS, U, templeMaterials } from './temple/materials';
import { LIGHT } from './temple/plan';
import { buildQuarter } from './temple/quarter';
import { buildWay } from './temple/way';

// The temple quarter and the way to the spire, on the dome of the torn world. At the left of the skyline, rising out
// of the jungle, a great pyramid cased in plates of polished gold and bronze over a stepped stone core, with a mirror
// gold capstone held over a light, an obelisk that is a mast behind it, and a causeway of lamps from its stair to the
// pool of polished metal beside it. Down the face of the world toward the visitor, the way to the spire: terraces
// with a pool falling from one to the next, obelisks with mirror caps and braziers either side, and at the city's
// front edge a great ring of polished bronze it passes through, and broad steps down to the bare ground. Its light is
// its own: few, low and warm.

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
      for (const i of flames) {
        const k = Math.floor(t * 9 + i * 3.7), f = t * 9 + i * 3.7 - k, a = hash(k * 31 + i), c = hash((k + 1) * 31 + i);
        U.uLamps.value[i].w = lamps[i].power * (1 - LIGHT.flicker * 0.25 + LIGHT.flicker * 0.25 * (a + (c - a) * f));
      }
      return true;
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      mats.solid.dispose();
    },
  };
};
