import { EDGE, FOREST, MARGIN } from '../../layout';
import { BASE, COURT, MAST, PYRAMID, SKIRT, TERRACE } from '../temple/plan';

// Where the jungle grows, on the plan's map (layout.ts): one wedge at the left of the world, round the temple quarter.
// Seen nearly edge on, as a wall of jungle at the left of the skyline: its outline against the glow, tree behind tree,
// trunks and undergrowth at its near edge, giants standing over it.

export const D2R = Math.PI / 180;
export { FOREST, MARGIN };

// The grids the jungle is sown on, in units: one chance of a canopy tree in each cell, jittered in it, the undergrowth
// on its own finer grid, and the giants far apart on their own.
export const SOW = { canopy: 23, under: 10, giant: 44 } as const;
// The temple's precinct is kept clear, and the jungle grows right up to it: this far short of what stands there.
const PRECINCT = 4;
// Nothing stands within this of the torn edge but what hangs from it.
export const TORN = { gone: 4 } as const;

const gap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
export const bearingOf = (x: number, z: number) => ((Math.atan2(x, z) / D2R) + 360) % 360;
export const inForest = (x: number, z: number) => { const b = bearingOf(x, z); return b >= FOREST.from && b <= FOREST.to && Math.hypot(x, z) >= FOREST.r0; };

// Whether a place is inside the temple's precinct: the pyramid on its stepped base, the court and gate before it, the
// mast behind it.
const HALF = PYRAMID.half + TERRACE.extra + BASE.tiers[0][0] + SKIRT.small + PRECINCT;
export function inTemple(x: number, z: number): boolean {
  if (Math.abs(x - PYRAMID.at[0]) < HALF && Math.abs(z - PYRAMID.at[1]) < HALF) return true;
  if (Math.abs(x - PYRAMID.at[0]) < COURT.half + PRECINCT + 6 && z > COURT.z0 - PRECINCT && z < COURT.z1 + PRECINCT + 8) return true;
  return Math.hypot(x - MAST.at[0], z - MAST.at[1]) < 14 + PRECINCT;
}

export const edgeAt = (x: number, z: number) => EDGE.at(Math.atan2(x, z) / D2R);
// How far past the margin a place is, 0 inside it and 1 at the torn edge.
export function tornAt(x: number, z: number): number {
  const r = Math.hypot(x, z), edge = edgeAt(x, z);
  return r <= MARGIN ? 0 : Math.min(1, (r - MARGIN) / Math.max(1, edge - MARGIN));
}

// How near a place is to the jungle's own edges, in units: where its trunks and undergrowth are seen.
export function toEdge(x: number, z: number): number {
  const r = Math.hypot(x, z), deg = bearingOf(x, z);
  return Math.min(r - FOREST.r0, Math.min(gap(deg, FOREST.from), gap(deg, FOREST.to)) * D2R * r, edgeAt(x, z) - r);
}
