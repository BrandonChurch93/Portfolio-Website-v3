import { AVENUES, CITY, FOREST, ROAD, within } from '../../layout';
import { D2R, bearing, gap } from './kit';

// The city's streets: where its paving reaches, and whether a place is on an avenue.

// Where the city's paving gives way to bare ground, on the map: a little past its last buildings, raggedly.
export const PAVED = CITY.r + 4;
// Whether a place is in the jungle, where there are no streets.
export const inForest = (x: number, z: number, pad = 0) => Math.hypot(x, z) > FOREST.r0 - pad && within(bearing(x, z), FOREST.from - pad / 6, FOREST.to + pad / 6);
// Whether a place is on an avenue of the city, outside the jungle.
export function onRoad(x: number, z: number, pad = 0): boolean {
  if (inForest(x, z) || Math.hypot(x, z) > PAVED) return false;
  const r = Math.hypot(x, z), b = bearing(x, z);
  return AVENUES.some((a) => gap(b, a) * D2R * r < (a === 0 ? 16 : ROAD / 2) + pad);
}
