import * as THREE from 'three';
import { SPIRE } from '../layout';
import { load, mesh } from '../files';
import type { PartFactory } from '../part';
import { materials } from './spire/materials';

// The spire: the tallest thing in the world, on the hero's center line under his name, with its ring of gold and
// its court. Made ahead by scripts/world/parts/spire/make.mjs and shipped as public/world/spire.bin, with a map of
// the state of its windows (spire-windows.png). Nothing of it moves, so all of it casts the moon's shadow: the ring's
// falls on the shaft.

const FILE = 'spire.bin', WINDOWS = 'spire-windows.png';

export const build: PartFactory = async () => {
  const group = new THREE.Group();
  const [file, map] = await Promise.all([
    load(FILE),
    new THREE.TextureLoader().loadAsync(`/world/${WINDOWS}`).then((t) => {
      t.colorSpace = THREE.NoColorSpace;
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.flipY = false;
      t.needsUpdate = true;
      return t;
    }),
  ]);
  const m = materials(map), made: { dispose(): void }[] = [map, m];
  for (const [name, l] of file.meshes) {
    const part = mesh(l, m[name as 'stone' | 'bay' | 'gold']);
    part.castShadow = true;
    part.receiveShadow = true;
    group.add(part);
    made.push(l.geometry);
  }
  return { group, alone: { at: [0, SPIRE.tall * 0.5, 0], r: SPIRE.tall * 0.56 }, dispose() { for (const d of made) d.dispose(); } };
};
