import * as THREE from 'three';
import { PLACES, buildDesk } from '../../../desk-drafts/desks';
import { materials } from '../../../desk-drafts/materials';
import { buildBench } from '../../workbench/model';
import type { PartFactory, PartName } from '../part';

// The rough draft's own things, which is how every part starts out. Each part's file is replaced by the thing made
// for real, and this goes when the last of them has been.
const D2R = Math.PI / 180;
const CARRIED: Record<string, PartName> = { lamp: 'lamp', tablet: 'tablet', camera: 'camera', lens: 'camera', cap: 'camera' };
let made: Promise<Map<PartName, THREE.Group>> | null = null;

function build(): Promise<Map<PartName, THREE.Group>> {
  return (made ??= (async () => {
    const out = new Map<PartName, THREE.Group>();
    const desk = buildDesk(materials());
    for (const name of ['bench', 'mat', 'monitor', 'keyboard', 'mouse', 'pc'] as const) {
      const g = desk.root.getObjectByName(name) as THREE.Group;
      desk.root.remove(g);
      out.set(name, g);
    }
    const bench = await buildBench();
    for (const tl of bench.tools) {
      const part = CARRIED[tl.name], to = PLACES[tl.name];
      if (!part || !to) continue;
      bench.root.remove(tl.group);
      tl.group.position.set(to[0], tl.name === 'lamp' || tl.name === 'lens' ? 0 : 4, to[1]);
      tl.group.rotation.set(0, to[2] * D2R, 0);
      const g = out.get(part) ?? new THREE.Group();
      g.add(tl.group);
      out.set(part, g);
    }
    bench.tablet.draw(4);
    return out;
  })());
}

export const rough = (name: PartName): PartFactory => async () => ({ group: (await build()).get(name) ?? new THREE.Group() });
