import { AVENUES, FOREST, RINGS, ROAD, within } from '../../layout';
import { D2R, bearing, gap } from './kit';

// The city's streets out to the edge: where the paving reaches, and whether a place is on an avenue.

// Where the city's paving ends and the broken margin begins, on the map.
export const CITY = RINGS[RINGS.length - 1] + ROAD / 2 + 2;
// Whether a place is in the forest, where there are no streets.
export const inForest = (x: number, z: number, pad = 0) => Math.hypot(x, z) > FOREST.r0 - pad && within(bearing(x, z), FOREST.from - pad / 6, FOREST.to + pad / 6);
// Whether a place is on an avenue, outside the forest.
export function onRoad(x: number, z: number, pad = 0): boolean {
  if (inForest(x, z)) return false;
  const r = Math.hypot(x, z), b = bearing(x, z);
  return AVENUES.some((a) => gap(b, a) * D2R * r < (a === 0 ? 16 : ROAD / 2) + pad);
}
