import * as THREE from 'three';
import { ground } from '../layout';
import { load, mesh } from '../files';
import type { PartFactory } from '../part';
import { STEP, TOWERS } from '../placed';
import { materials } from './towers/materials';
import { wakes } from './towers/wake';

// The towers: the city, made ahead by scripts/world/parts/towers/city.mjs and shipped as one world file, one mesh for
// each of the three materials in ./towers/materials.ts, with a map of the state of every window. The file says which
// buildings it holds (meta.stands); the rest stay plain dark shapes of `rest`. ?towers=step shows the stepped tower
// alone, from its own make (step.mjs).

const FILES = { city: 'towers-city.bin', step: 'tower-step.bin' } as const;

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

export const build: PartFactory = async ({ query }) => {
  const group = new THREE.Group(), made: { dispose(): void }[] = [];
  const which = query.get('towers') === 'step' ? 'step' : 'city';
  const file = await load(FILES[which]), map = await windows(String(file.meta.windows));
  const wake = wakes(query);
  const m = materials(map, wake?.uniform);
  made.push(map, m);
  for (const [name, l] of file.meshes) {
    const part = mesh(l, m[name as 'stone' | 'bay' | 'gold']);
    part.castShadow = true;
    part.receiveShadow = name !== 'gold';
    group.add(part);
    made.push(l.geometry);
  }
  const stands = which === 'step' ? [STEP] : ((file.meta.stands as number[] | undefined) ?? []);
  // ?only=towers frames the stepped tower, or the building ?tower=<its place in TOWERS>, or its top with &top=1.
  const asked = Number(query.get('tower') ?? STEP), [x, z, , , tall] = TOWERS[asked] ?? TOWERS[STEP], foot = ground(x, z), top = query.get('top') === '1';
  const alone = top ? { at: [x, foot + tall * 0.82, z] as [number, number, number], r: tall * 0.24 } : { at: [x, foot + tall * 0.55, z] as [number, number, number], r: tall * 0.62 };
  return { group, stands, alone, ...(wake ? { update: wake.update } : {}), dispose() { for (const d of made) d.dispose(); } };
};
