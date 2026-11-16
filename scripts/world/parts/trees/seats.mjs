// Where each tree stands on the land as it is drawn, and how much of its crown is seen. The plan seats a tree on its
// own ground (ground() in layout.ts), which is older and lower than the land's dunes; the land that is drawn is the
// land builder's (src/pieces/world/parts/land/field.ts and scripts/world/parts/land/shape.mjs). So a tree on a dune
// stands on the dune, and a tree a crest in front of it mostly hides is known and left out.
//
//   import { seats } from './seats.mjs'; const list = seats(top)   // top: a crown's top, in a tree's sizes
//   list[i] = { x, z, y, sand, seen, hidden }   for TREES[i]: the land's height under it, how much sand there is
//   under the shade it lays on the ground (0 to 1, the most anywhere on it but at the trunk's foot), the share of its
//   crown's height a visitor sees over the land in front of it, and how many units of the crown's top the land in
//   front hides
import { L, P } from '../../lib/plan.mjs';
import { desert } from '../land/shape.mjs';
import * as F from '../../../../src/pieces/world/parts/land/field.ts';

export const drawnLand = (x, z) => L.dome(x, z) + desert(x, z) * F.relief(x, z, L.within(x, z));

// The camera, which never moves: drawn() in layout.ts looks from VIEW.back along (0, sin, cos) of VIEW.el, about a
// point on the center line.
const e = L.VIEW.el * L.D2R, se = Math.sin(e), ce = Math.cos(e);
const pivot = L.SPIRE.tall - (L.HOST.tall / 2 - L.HOST.over) / ce;
export const EYE = [0, pivot + L.VIEW.back * se, L.VIEW.back * ce];

// Whether the line from a point to the eye passes under the land: marched toward the eye in steps of STEP units,
// as far as the land reaches.
const STEP = 2;
function over(px, py, pz) {
  const d = [EYE[0] - px, EYE[1] - py, EYE[2] - pz], l = Math.hypot(...d);
  let worst = Infinity;
  for (let t = STEP; t < 1500; t += STEP) {
    const x = px + (d[0] / l) * t, y = py + (d[1] / l) * t, z = pz + (d[2] / l) * t;
    if (L.within(x, z) < -2) { if (z > L.LAND.rim) break; continue; }
    worst = Math.min(worst, y - drawnLand(x, z));
  }
  return worst;
}

// Where on a tree's shade sand is looked for: along it, away from the moon, and to each side, in the tree's sizes
// (SHADE in src/pieces/world/parts/trees/design.ts reaches about this far).
const AWAY = (() => { const l = Math.hypot(L.MOONWARD[0], L.MOONWARD[2]); return [-L.MOONWARD[0] / l, -L.MOONWARD[2] / l]; })();
const ON = [-1.6, -0.8, 0, 0.8, 1.6, 2.4, 3.2].flatMap((a) => [-1.6, -0.8, 0, 0.8, 1.6].map((b) => [a, b])).filter(([a, b]) => Math.hypot(a, b) > 0.5);

export function seats(top) {
  return P.TREES.map(([x, z, size]) => {
    const y = drawnLand(x, z), sand = Math.max(...ON.map(([a, b]) => desert(x + (AWAY[0] * a - AWAY[1] * b) * size, z + (AWAY[1] * a + AWAY[0] * b) * size))), tall = top * size;
    let seen = 0, hidden = 0;
    const n = 12;
    for (let k = 0; k < n; k++) {
      const h = tall * (0.25 + (0.75 * (k + 0.5)) / n), m = over(x, y + h, z);
      if (m > 0) seen++;
      if (k === n - 1) hidden = Math.max(0, -m);
    }
    return { x, z, y, sand, seen: seen / n, hidden };
  });
}
