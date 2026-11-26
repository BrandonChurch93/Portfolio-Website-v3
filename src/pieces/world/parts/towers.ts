import * as THREE from 'three';
import { ground } from '../layout';
import { load, mesh } from '../files';
import type { PartFactory, PartState } from '../part';
import { STEP, TOWERS } from '../placed';
import { WAKE, materials } from './towers/materials';
import { isDrawn, lampOf } from './rock/drawn';

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
  // In picture 10's look the cursor's light wakes rooms near it: the light itself, and the marks it has left behind.
  const wake = isDrawn(query) ? { value: Array.from({ length: WAKE.marks }, () => new THREE.Vector3()) } : undefined;
  const marks: { x: number; y: number; t: number; born: number; k: number }[] = [];
  const m = materials(map, wake);
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
  const update = wake && ((s: PartState): boolean => {
    const lamp = lampOf(s, wake.value[0]), head = marks[0];
    if ((s.still && !s.held) || (head && s.t < head.t)) marks.length = 0;
    else if (lamp.z > 0.02) {
      if (head && Math.hypot(lamp.x - head.x, lamp.y - head.y) < WAKE.step) { head.t = s.t; head.k = Math.max(lamp.z, head.k); }
      else if (!head || s.t - head.born >= WAKE.lasts / (WAKE.marks - 2)) marks.unshift({ x: lamp.x, y: lamp.y, t: s.t, born: s.t, k: lamp.z });
    }
    while (marks.length && (marks.length > WAKE.marks - 1 || s.t - marks[marks.length - 1].t > WAKE.lasts)) marks.pop();
    for (let i = 1; i < WAKE.marks; i++) { const k = marks[i - 1]; if (k) wake.value[i].set(k.x, k.y, k.k * Math.max(0, 1 - (s.t - k.t) / WAKE.lasts)); else wake.value[i].setZ(0); }
    return marks.length > 0;
  });
  return { group, stands, alone, ...(update ? { update } : {}), dispose() { for (const d of made) d.dispose(); } };
};
