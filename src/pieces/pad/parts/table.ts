import * as THREE from 'three';
import { registry } from '../../../hooks/registry';
import { LAUNCH, TABLE } from '../layout';
import type { PartFactory } from '../part';
import { STAIR, buildTable } from './table/model';
import { setStone, steelMaterials } from './table/steel';

// The launch table: a steel deck over a box girder on eight legs round the stone's boss, the flame hole through it,
// hold downs for the rocket's skirt, a rail, a stair down to the stone, and the lines from the tower's foot. It is lit
// from below by the stone as it fills, and once the rocket has gone it stands empty on the lit stone.

// The hold downs' jaws let go as the rocket lifts: when they start, in seconds from the launch, how long they take,
// and how far they swing out, in radians.
const LET_GO = { at: LAUNCH.lift - 0.15, take: 0.3, swing: 0.95 };
const ease = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

export const build: PartFactory = async () => {
  const mats = steelMaterials();
  const { group, tris, jaws } = await buildTable(mats);
  registry.tool('tableStats', () => ({ tris, meshes: group.children.length }));
  return {
    group,
    alone: { at: [(TABLE.l + TABLE.r + STAIR.run) / 2, TABLE.top / 2 + 4, 0], r: 105 },
    update(s) {
      setStone(s.fill);
      const k = ease((s.launch - LET_GO.at) / LET_GO.take);
      for (const j of jaws) j.group.rotation.x = -j.side * k * LET_GO.swing;
      return false;
    },
    dispose() {
      group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
      mats.cast.dispose();
      mats.fine.dispose();
      mats.halo.dispose();
    },
  };
};
