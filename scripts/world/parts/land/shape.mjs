// The land's shape on the map, for its make script and for any part that has to sit under it or on it: which
// buildings stand, how much of a place is desert, which way the land's edge is, and the lowest the land's surface
// comes at a place.
//
//   import { below, desert } from '../land/shape.mjs'
//   below(x, z)   the land's surface never comes lower than this at (x, z), in units: what lies under the land, as
//                 the rock's top, has to stay under it, or it shows through the sand's hollows and the broken front
import { L, P } from '../../lib/plan.mjs';
import * as F from '../../../../src/pieces/world/parts/land/field.ts';

// The dunes give way round a building that stands in the desert: the sand lies no higher than DRIFT[0] against a
// wall and rises from it no more steeply than DRIFT[1], drifted against the building as sand is, and from REACH[0]
// to REACH[1] from its walls the dunes come back whole. Cleared to nothing round each building, a tall dune stood
// round a pit with a wall of sand.
const DRIFT = [2.5, 0.42], REACH = [40, 75];

export const T = P.TOWERS.map(([x, z, w, d, tall, turn], i) => ({ i, x, z, w, d, tall, c: Math.cos(turn * L.D2R), s: Math.sin(turn * L.D2R) })).filter((t) => L.within(t.x, t.z) >= 0.6 * Math.max(t.w, t.d));
export const footprint = (t, x, z) => {
  const dx = x - t.x, dz = z - t.z, u = dx * t.c - dz * t.s, v = dx * t.s + dz * t.c;
  return Math.hypot(Math.max(0, Math.abs(u) - t.w / 2), Math.max(0, Math.abs(v) - t.d / 2));
};
// The pale dune at the back right of the desert, behind the line of trees, is sand the plan's desert does not reach:
// where it lies and how far it spreads each way.
const BACK = { at: [485, -340], r: [118, 112] };
// The shelf under the line of trees behind the dunes (SHELF in field.ts) is sand from end to end.
const ROWSAND = { x: [408, 425, 595, 620], z: [-290, -268, -150, -120] };
const rowSand = (x, z) => L.ramp(ROWSAND.x[0], ROWSAND.x[1], x) * L.ramp(ROWSAND.x[3], ROWSAND.x[2], x) * L.ramp(ROWSAND.z[0], ROWSAND.z[1], z) * L.ramp(ROWSAND.z[3], ROWSAND.z[2], z);
const sands = (x, z) => Math.max(L.desert(x, z), rowSand(x, z), L.ramp(0, 0.18, 1 - Math.hypot((x - BACK.at[0]) / BACK.r[0], (z - BACK.at[1]) / BACK.r[1]) + 0.1 * (L.noise(x / 60, 2, z / 60, 17) - 0.5)));
const sandy = T.filter((t) => sands(t.x, t.z) > 0.001);
export function desert(x, z) {
  let k = sands(x, z);
  if (k <= 0) return 0;
  let r = -1;
  for (const t of sandy) {
    const f = footprint(t, x, z);
    if (f >= REACH[1]) continue;
    if (r < 0) r = F.relief(x, z, L.within(x, z));
    const cap = DRIFT[0] + DRIFT[1] * f;
    if (r * k > cap) k = Math.min(k, cap / r + (k - cap / r) * L.ramp(REACH[0], REACH[1], f));
  }
  return k;
}
export const towardEdge = (x, z) => {
  const e = 0.25, gx = (L.within(x + e, z) - L.within(x - e, z)) / (2 * e), gz = (L.within(x, z + e) - L.within(x, z - e)) / (2 * e), l = Math.hypot(gx, gz) || 1;
  return [-gx / l, -gz / l];
};
export function below(x, z) {
  const sunk = F.BREAK.drop * 1.45 + F.BREAK.tip * F.BREAK.cell * 1.6;
  return L.dome(x, z) + desert(x, z) * F.relief(x, z, L.within(x, z)) - (L.within(x, z) < F.BREAK.reach + F.BREAK.cell ? sunk : 0);
}
