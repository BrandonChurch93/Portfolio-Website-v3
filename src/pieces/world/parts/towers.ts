import * as THREE from 'three';
import { ground } from '../layout';
import { load, mesh } from '../files';
import type { PartFactory } from '../part';
import { STEP, TOWERS } from '../placed';
import { materials } from './towers/materials';

// The towers. Each design is made ahead by its own script in scripts/world/parts/towers/ and shipped as a world
// file, with a map of the state of its windows; every design shares the three materials in ./towers/materials.ts.
// Built so far: the tower with the stepped gold crown (TOWERS[STEP]). Every other building is still a plain dark
// shape of `rest`.

const DESIGNS = [{ file: 'tower-step.bin', windows: 'tower-step-windows.png' }] as const;

function windows(file: string): Promise<THREE.Texture> {
  return new THREE.TextureLoader().loadAsync(`/world/${file}`).then((t) => {
    t.colorSpace = THREE.NoColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.flipY = false;
    t.needsUpdate = true;
    return t;
  });
}

export const build: PartFactory = async () => {
  const group = new THREE.Group(), made: { dispose(): void }[] = [];
  for (const d of DESIGNS) {
    const [file, map] = await Promise.all([load(d.file), windows(d.windows)]);
    const m = materials(map);
    made.push(map, m);
    for (const [name, l] of file.meshes) {
      const part = mesh(l, m[name as 'stone' | 'bay' | 'gold']);
      part.castShadow = true;
      part.receiveShadow = name !== 'gold';
      group.add(part);
      made.push(l.geometry);
    }
  }
  const [x, z, , , tall] = TOWERS[STEP], foot = ground(x, z);
  return { group, alone: { at: [x, foot + tall * 0.55, z], r: tall * 0.62 }, dispose() { for (const d of made) d.dispose(); } };
};
