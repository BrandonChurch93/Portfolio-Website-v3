import { AVENUES, DISTRICTS, EDGE, FOREST, MARGIN, PEAKS, ROAD, relief } from '../../layout';

// Where the jungle grows, on the plan's map (layout.ts): one stretch at the left of the world, round the temple
// quarter and up the lower slopes of the small mountains behind it. Seen nearly edge on, as a wall of jungle at the
// left of the skyline: its outline against the glow, tree behind tree, trunks and undergrowth at its near edge,
// giants standing over it.

export const D2R = Math.PI / 180;
export { FOREST };
const TEMPLE = DISTRICTS.find((d) => d.kind === 'temple');

// The grid the canopy is sown on, in units: one chance of a tree in each cell, jittered in it. The undergrowth is
// sown on its own, finer grid.
export const SOW = 9;
export const UNDER = 7;
// How far either side of a road nothing grows, in units.
export const ROADSIDE = ROAD / 2 + 3;
// The temple's precinct is kept clear, and the jungle grows right up to it: this far short of its bounds.
export const PRECINCT = 4;
// The broken margin, from MARGIN out to the torn edge: trees lean out, fall, or are gone. Nothing grows within this
// of the torn edge itself.
export const TORN = { lean: 0.45, down: 0.3, gone: 6 } as const;

const gap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
export const bearingOf = (x: number, z: number) => ((Math.atan2(x, z) / D2R) + 360) % 360;

// Whether a place on the map is a road, where nothing grows.
export function onRoad(x: number, z: number): boolean {
  const r = Math.hypot(x, z), deg = bearingOf(x, z);
  return AVENUES.some((b) => gap(deg, b) * D2R * r < ROADSIDE);
}

// Whether a place is inside the temple's precinct.
export function inTemple(x: number, z: number): boolean {
  if (!TEMPLE) return false;
  const r = Math.hypot(x, z), deg = bearingOf(x, z);
  const pad = (PRECINCT / Math.max(r, 1)) / D2R;
  return r > TEMPLE.r0 - PRECINCT && r < TEMPLE.r1 + PRECINCT && deg > TEMPLE.from - pad && deg < TEMPLE.to + pad;
}

// How far up a mountain a place is, as a share of that mountain's height, 0 off every mountain: the jungle climbs
// the lower slopes, thins and turns to conifers higher, and the tops are bare rock.
export function upMountain(x: number, z: number): number {
  const h = relief(x, z);
  let up = 0;
  for (const p of PEAKS) if (Math.hypot(x - p.x, z - p.z) < p.r) up = Math.max(up, h / p.tall);
  return Math.min(1, up);
}

// How much of a hill's crest a place is, 0 in a hollow to 1 on a crest, off the mountains.
export const crestAt = (x: number, z: number) => Math.min(1, relief(x, z) / (FOREST.hills * 0.85));

// How far past the margin a place is, 0 inside it and 1 at the torn edge.
export function tornAt(x: number, z: number): number {
  const r = Math.hypot(x, z), edge = EDGE.at(Math.atan2(x, z) / D2R);
  return r <= MARGIN ? 0 : Math.min(1, (r - MARGIN) / Math.max(1, edge - MARGIN));
}
export const edgeAt = (x: number, z: number) => EDGE.at(Math.atan2(x, z) / D2R);

// How near a place is to the forest's own edges, in units: where its trunks and undergrowth are seen.
export function toEdge(x: number, z: number): number {
  const r = Math.hypot(x, z), deg = bearingOf(x, z);
  return Math.min(r - FOREST.r0, Math.min(gap(deg, FOREST.from), gap(deg, FOREST.to)) * D2R * r, edgeAt(x, z) - r);
}
