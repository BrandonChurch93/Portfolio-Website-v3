import * as THREE from 'three';
import { registry } from '../../../hooks/registry';
import { LAUNCH, TOWER } from '../layout';
import type { PartFactory } from '../part';
import { setStone, steelMaterials } from './table/steel';
import { buildArms, buildTower } from './tower/model';

// The tower on the table's left end: a steel lattice as tall as the rocket, with three arms that reach the rocket, a
// beacon at its top that is on from the start, a caged ladder, a lift and the lines that run up to the arms. The arms
// draw back as the launch begins, worked out from the launch's age alone: each end lets go of the rocket, then the arm
// lifts on its pin until it stands upright against the tower's side.

// When each arm starts, from the launch's own LAUNCH.arms, the bottom one first; how long each takes; how far its end
// pulls back from the rocket, in units; the share of its time the end takes; and how far it lifts, in radians.
const DRAW = { stagger: [0.1, 0.05, 0], take: 0.42, pull: 4, release: 0.25, lift: Math.PI / 2 };
const ease = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

export const build: PartFactory = async () => {
  const mats = steelMaterials();
  const { group, tris } = await buildTower(mats);
  const { arms, tris: armTris } = buildArms(mats);
  for (const a of arms) group.add(a.group);
  const reach = arms.map((a) => a.end.position.x);
  registry.tool('towerStats', () => ({ tris: tris + armTris, meshes: group.children.length }));
  return {
    group,
    alone: { at: [(TOWER.l + TOWER.r) / 2 + 14, TOWER.top / 2 + 22, 0], r: TOWER.top * 0.5 },
    update(s) {
      setStone(s.fill);
      arms.forEach((a, i) => {
        const k = (s.launch - LAUNCH.arms - DRAW.stagger[i]) / DRAW.take;
        a.end.position.x = reach[i] - DRAW.pull * ease(k / DRAW.release);
        a.group.rotation.z = DRAW.lift * ease((k - DRAW.release * 0.6) / (1 - DRAW.release * 0.6));
      });
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
