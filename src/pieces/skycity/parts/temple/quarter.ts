import * as THREE from 'three';
import { slice } from '../../../../world/build';
import { GAP_Y, type Lamp } from './materials';
import { type Parts, battered, block, casing, place, prism, pyramidal, quad } from './forms';
import { AXIS, BASE, CASING, COURT, FIGURES, FOOT, GATE_OBELISKS, GRAND, MAST, PODIUM, PYLON, PYRAMID, SKIRT, TERRACE } from './plan';
import { obelisk, pylon, seated } from './things';

// The temple quarter, rising out of the jungle at the left of the skyline.

function greatPyramid(b: Parts, lamps: Lamp[]): void {
  const { at, tall, half, turn, cut, gap } = PYRAMID, m = place(at[0], 0, at[1], turn);
  const tw = 2 * (half + TERRACE.extra);
  // The great stepped base, bedded into the land: its tiers, and a stair down its outer side, toward the limb.
  let below = -BASE.sink;
  for (const [extra, topY] of BASE.tiers) {
    const w = 2 * (half + extra);
    b.add(battered(w, w, topY - below, BASE.batter, { cornice: 1.2, c: 0.5 }).translate(0, below, 0), 'lime', { m, cast: true, seed: 70 + extra });
    below = topY;
  }
  const outer = half + BASE.tiers[0][0], flight = Math.round((TERRACE.tall - BASE.tiers[0][1]) / 1.2);
  for (let i = 0; i < flight; i++) {
    const y = BASE.tiers[0][1] + ((TERRACE.tall - BASE.tiers[0][1]) * (i + 1)) / flight, x = -outer - 4 + (outer - half - TERRACE.extra + 4) * (i / flight);
    b.add(block(1.6, y - BASE.tiers[0][1] + 8, 30, 0.05).translate(x, BASE.tiers[0][1] - 8, 0), 'paving', { m, seed: 80 + i });
  }
  b.add(battered(tw, tw, TERRACE.tall + SKIRT.terrace, TERRACE.batter, { cornice: 1.6, c: 0.4 }).translate(0, -SKIRT.terrace, 0), 'lime', { m, cast: true, seed: 17 });
  b.add(block(tw * (1 - TERRACE.batter) + 1.4, 0.35, tw * (1 - TERRACE.batter) + 1.4, 0.1, TERRACE.tall), 'dark', { m });
  // A broad stair up the terrace's front face, toward the gate.
  const face = tw / 2, n = Math.round(TERRACE.tall / 1.1);
  for (let i = 0; i < n; i++) {
    const ya = (TERRACE.tall * (i + 1)) / n, run = (TERRACE.tall * TERRACE.batter * 4 + 9) * (1 - (i + 1) / n);
    b.add(block(26, ya, 1.2, 0.05).translate(0, 0, face + run + 0.5), 'paving', { m, seed: 19 });
  }
  let y = TERRACE.tall;
  for (const [extra, top] of PODIUM.steps) {
    b.add(battered(2 * (half + extra), 2 * (half + extra), top - (y - TERRACE.tall), 0.004, { cornice: 0.6, c: 0.4 }).translate(0, y, 0), 'lime', { m, cast: true, seed: top });
    y = TERRACE.tall + top;
  }
  const yTop = tall * cut, mm = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, FOOT, 0));
  b.add(casing(half, tall, yTop, CASING.swell, CASING.rise, CASING.arris), 'gold', { m: mm, cast: true });
  const ht = half * (1 - cut);
  // The body's top: a gold plate, the light under the capstone, four posts of bronze, and the capstone held on them.
  b.add(block(2 * ht, 0.6, 2 * ht, 0.2, yTop), 'gold', { m: mm, cast: true });
  const y0 = yTop + 0.6, y1 = yTop + gap;
  b.add(block(2 * ht * 0.42, y1 - y0, 2 * ht * 0.42, 0.3, y0), 'core', { m: mm, v: (q) => (q.y - y0) / (y1 - y0) });
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) b.add(block(1.6, gap - 0.4, 1.6, 0.2, yTop + 0.3).translate(sx * ht * 0.78, 0, sz * ht * 0.78), 'bronze', { m: mm });
  b.add(pyramidal(ht, tall * (1 - cut)).translate(0, yTop + gap, 0), 'gold', { m: mm, cast: true, flag: 2 });
  b.add(block(2 * ht * 0.98, 0.5, 2 * ht * 0.98, 0.15, yTop + gap - 0.5), 'gold', { m: mm });
  lamps.push({ at: [at[0], GAP_Y, at[1]], power: 2.2, reach: 22, heat: 0.92 });
}

// The obelisk that is a mast: its pyramidion of gold, and over it a needle of granite ringed in copper with a light at
// its tip. A thin line of light runs up its front.
function mast(b: Parts, lamps: Lamp[]): void {
  const { at, tall, foot, top, cap } = MAST, m = place(at[0], 0, at[1], 0, GRAND);
  const plinth = 5, shaftTop = tall - cap - 16;
  b.add(battered(foot * 3.6, foot * 3.6, plinth, 0.08, { cornice: 1.4, c: 0.2 }), 'lime', { m, cast: true, seed: 9 });
  b.add(prism([{ y: plinth, hw: foot, hd: foot, c: foot * 0.14 }, { y: shaftTop, hw: top, hd: top, c: top * 0.14 }]), 'granite', { m, cast: true });
  b.add(pyramidal(top, cap).translate(0, shaftTop, 0), 'gold', { m, cast: true });
  const n0 = shaftTop + cap * 0.7;
  b.add(new THREE.CylinderGeometry(0.28, 0.6, tall - n0, 8).translate(0, (tall + n0) / 2, 0), 'granite', { m });
  for (const [y, r] of [[n0 + 4, 1.4], [n0 + 9, 1.0]]) b.add(new THREE.CylinderGeometry(r, r, 0.45, 16).translate(0, y, 0), 'copper', { m });
  b.add(new THREE.OctahedronGeometry(0.75).translate(0, tall + 0.4, 0), 'lamp', { m });
  lamps.push({ at: [at[0], (tall + 0.4) * GRAND, at[1]], power: 0.6, reach: 5 * GRAND, heat: 0.85 });
  const dz = (y: number) => foot + ((top - foot) * (y - plinth)) / (shaftTop - plinth) + 0.04;
  const y0 = plinth + 6, y1 = shaftTop - 3;
  b.add(quad(new THREE.Vector3(-0.32, y0, dz(y0)), new THREE.Vector3(0.32, y0, dz(y0)), new THREE.Vector3(0.22, y1, dz(y1)), new THREE.Vector3(-0.22, y1, dz(y1)), new THREE.Vector3(0, 0.02, 1)), 'line', { m, v: (q) => (q.y - y0) / (y1 - y0) });
}

function precinct(b: Parts, lamps: Lamp[]): void {
  b.add(block(2 * COURT.half, COURT.tall, COURT.z1 - COURT.z0, 0.3).translate(AXIS, 0, (COURT.z0 + COURT.z1) / 2), 'paving', { cast: false, seed: 1 });
  pylon(b, lamps, { x: AXIS, z: PYLON.z, y: COURT.tall, scale: GRAND }, PYLON);
  for (const sx of [-1, 1]) seated(b, { x: AXIS + sx * FIGURES.x, z: FIGURES.z, y: COURT.tall }, FIGURES.tall * GRAND, sx);
  for (const sx of [-1, 1]) obelisk(b, { x: AXIS + sx * GATE_OBELISKS.x, z: GATE_OBELISKS.z, y: COURT.tall }, GATE_OBELISKS.tall * GRAND, GATE_OBELISKS.foot * GRAND, { cast: true, seed: sx });
}

export async function buildQuarter(b: Parts, lamps: Lamp[]): Promise<void> {
  for (const step of [greatPyramid, mast, precinct]) {
    step(b, lamps);
    await slice();
  }
}
