import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { CORE, RIM, WORLD, skinAt } from '../layout';
import { load, mesh } from '../files';
import { lit } from '../light';
import type { PartFactory } from '../part';

// The torn rock, while its form is being chosen: whichever sculpt is asked for (?rock=a), drawn in one plain
// material by its stored light, so that the sculpts are judged on form and light alone and on equal terms. A
// world file for the rock holds two meshes: `break`, the torn rock, and `skin`, the planet's outer surface and
// its top, which is a plain dark shape until its own part is built. Without a file it is the planet's outline,
// whole. The builder who finishes the rock replaces this file.
// The plain rock is the color the sculpts' light was worked out with (ALBEDO in each make script).
const CLAY = hex('text-3'), DARK = 0x16110d;

export const build: PartFactory = async ({ query }) => {
  const group = new THREE.Group(), which = query.get('rock') ?? 'r', made: { dispose(): void }[] = [];
  const add = (g: THREE.BufferGeometry, m: THREE.Material): void => { made.push(g, m); };
  try {
    const file = await load(`rock-${which}.bin`);
    for (const [name, l] of file.meshes) {
      const m = lit(new THREE.MeshStandardMaterial({ color: name === 'skin' ? DARK : CLAY, roughness: 0.92, metalness: 0 }), { key: `rock-clay-${name}`, baked: true });
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
  return { group, alone: { at: [CORE.at[0], CORE.at[1] - 30, CORE.at[2] - 60], r: 560 }, dispose() { for (const d of made) d.dispose(); } };
};
