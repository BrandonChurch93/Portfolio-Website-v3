import { D2R, PYRAMID, ground, within } from '../../layout';
import { TOWERS, TREES } from '../../placed';
import { DRAWN } from '../trees/design';

// What the pyramid's two seen faces really have before them, for its shader to mirror: the trees round its foot as
// crowns, the buildings as boxes, and for the face toward the moon the land's skyline round it (the dunes' crests far
// off to the right). Each face's mirrored ray, as its casing sweeps, runs only so far round (MIRROR.lit.az and
// MIRROR.deep.az, bearings from the pyramid as atan2(x, -z) in degrees), so only what stands there is handed over.

export const MIRROR = {
  lit: { az: [40, 112], trees: 240, towers: 760 },
  deep: { az: [-172, -24], trees: 240, towers: 520 },
  // A crown in TREES' sizes (DRAWN of it to each side), its middle so many of those over the ground.
  crown: { lift: 0.95 },
  // The land's skyline seen from the face toward the moon: over what bearings, at how many, looked for from so high
  // over the pyramid's foot, out to so far, in steps of so much. Past the land's front lip the ray is over the void,
  // and the land beyond it (the dunes) is looked for on.
  skyline: { az: [40, 112], n: 48, from: 6, far: 1300, step: 4 },
} as const;

export interface Mirrored {
  trees: number[][];
  boxes: number[][];
  litTrees: number;
  litBoxes: number;
  skyline: number[];
}

const bearing = (x: number, z: number): number => Math.atan2(x - PYRAMID.x, -(z - PYRAMID.z)) / D2R;
const inside = (a: number, r: readonly number[]): boolean => a >= r[0] && a <= r[1];

export function mirrored(): Mirrored {
  const crowns = (face: { az: readonly number[]; trees: number }): number[][] => TREES
    .filter(([x, z, s]) => within(x, z) >= s * DRAWN && inside(bearing(x, z), face.az) && Math.hypot(x - PYRAMID.x, z - PYRAMID.z) < face.trees)
    .map(([x, z, s], i) => { const r = s * DRAWN; return [x, ground(x, z) + r * MIRROR.crown.lift, z, r + (i % 7) * 1e-3]; });
  const blocks = (face: { az: readonly number[]; towers: number }): number[][] => TOWERS
    .filter(([x, z]) => inside(bearing(x, z), face.az) && Math.hypot(x - PYRAMID.x, z - PYRAMID.z) < face.towers)
    .map(([x, z, w, d, tall, turn, , , seed]) => [x, ground(x, z), z, turn * D2R, w / 2, d / 2, ground(x, z) + tall, seed]);
  const lt = crowns(MIRROR.lit), dt = crowns(MIRROR.deep), lb = blocks(MIRROR.lit), db = blocks(MIRROR.deep);
  const S = MIRROR.skyline, y0 = ground(PYRAMID.x, PYRAMID.z) + S.from, skyline: number[] = [];
  for (let i = 0; i < S.n; i++) {
    const a = (S.az[0] + ((S.az[1] - S.az[0]) * i) / (S.n - 1)) * D2R, dx = Math.sin(a), dz = -Math.cos(a);
    let top = -0.5;
    for (let t = 30; t < S.far; t += S.step) {
      const x = PYRAMID.x + dx * t, z = PYRAMID.z + dz * t;
      if (within(x, z) < 0) continue;
      top = Math.max(top, Math.atan2(ground(x, z) - y0, t));
    }
    skyline.push(top);
  }
  return { trees: [...lt, ...dt], boxes: [...lb, ...db], litTrees: lt.length, litBoxes: lb.length, skyline };
}
