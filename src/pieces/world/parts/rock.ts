import * as THREE from 'three';
import { CORE, RIM, WORLD, skinAt } from '../layout';
import { load, mesh } from '../files';
import { lit } from '../light';
import type { PartFactory } from '../part';
import { stoneMaps, stoneMaterial } from './rock/stone';

// The torn rock: whichever sculpt is asked for (?rock=a, default r), drawn in the planet's stone (./rock/stone.ts).
// A world file for the rock holds two meshes: `break`, the torn rock, and `skin`, the planet's outer surface and its
// top, which is a plain dark shape until its own part is built. Without a file it is the planet's outline, whole.
// ?stone=0 draws the break in the plain color the sculpts' light was worked out with, to judge form alone.
//
// What the sculpt stores for the stone, read from the file's meta and, where the meta is silent, from the file
// itself: meta.edge, when it is there, names where each vertex's distance to the nearest crease is (light.w or
// bounce.w) and meta.edgeUnits the units a stored 1 is. light.w is a number of each block's own when meta.spare says
// 'slab', never when it holds the distance, and otherwise only if it plainly varies from block to block.
const DARK = 0x16110d, CLAY = 0x96897b;

// Whether light.w holds a number of each block's own: said so, or, when nothing is said, many different values.
function blocks(g: THREE.BufferGeometry, meta: { spare?: string; edge?: string }): boolean {
  if (meta.spare === 'slab') return true;
  if (meta.spare === 'edge' || meta.edge === 'light.w') return false;
  const a = g.getAttribute('aLight');
  if (!a) return false;
  const seen = new Set<number>(), step = Math.max(1, Math.floor(a.count / 4096));
  for (let i = 0; i < a.count && seen.size <= 8; i += step) seen.add(Math.round(a.getW(i) * 255));
  return seen.size > 8;
}

export const build: PartFactory = async ({ query, renderer }) => {
  const group = new THREE.Group(), which = query.get('rock') ?? 'r', made: { dispose(): void }[] = [];
  const plain = query.get('stone') === '0';
  const add = (g: THREE.BufferGeometry, m: THREE.Material): void => { made.push(g, m); };
  let release = (): void => {};
  try {
    const [file, maps] = await Promise.all([load(`rock-${which}.bin`), plain ? null : stoneMaps(renderer)]);
    if (maps) release = () => maps.release();
    const meta = file.meta as { spare?: string; edge?: string; edgeUnits?: number };
    const edgeAt = meta.edge === 'light.w' ? 'aLight.w' : meta.edge === 'bounce.w' ? 'aBounce.w' : '';
    const edge = edgeAt ? `${edgeAt} * ${(meta.edgeUnits ?? 8).toFixed(3)}` : undefined;
    for (const [name, l] of file.meshes) {
      // The planet's outer surface and its top have parts of their own now (the skin and the land): the sculpt's
      // plain shell lay exactly where they are and fought them for every pixel. ?shell=1 draws it again.
      if (name === 'skin' && query.get('shell') !== '1') continue;
      const m = name === 'break' && maps
        ? stoneMaterial(maps, { key: 'rock', baked: true, spare: blocks(l.geometry, meta) ? 'slab' : undefined, edge })
        : lit(new THREE.MeshStandardMaterial({ color: name === 'skin' ? DARK : CLAY, roughness: 0.92, metalness: 0 }), { key: `rock-plain-${name}`, baked: true });
      const part = mesh(l, m);
      part.castShadow = part.receiveShadow = true;
      group.add(part);
      add(l.geometry, m);
    }
  } catch (e) {
    console.warn(String(e));
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 40; i++) { const [x, y] = skinAt(Math.PI / 2, 1 - i / 40); pts.push(new THREE.Vector2(Math.max(0.01, x), y)); }
    pts.push(new THREE.Vector2(WORLD.half, -RIM));
    const g = new THREE.LatheGeometry(pts, 96), m = lit(new THREE.MeshStandardMaterial({ color: DARK, roughness: 1, side: THREE.DoubleSide }), { key: 'rock-holder' });
    const whole = new THREE.Mesh(g, m);
    whole.castShadow = whole.receiveShadow = true;
    group.add(whole);
    add(g, m);
  }
  return { group, alone: { at: [CORE.at[0], CORE.at[1] - 30, CORE.at[2] - 60], r: 560 }, dispose() { for (const d of made) d.dispose(); release(); } };
};
