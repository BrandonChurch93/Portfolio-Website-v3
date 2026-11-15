import * as THREE from 'three';
import { slice } from '../../../../world/build';
import type { Lamp } from './materials';
import { type Parts, battered, block, facetedPyramid, place, prism, quad, sweptRing } from './forms';
import { BRAZIERS, DESCENT, GATE_OBELISK, GRAND, OBELISKS, RING, RINGS, WALL_LAMPS, WAY, WAY_END, terraceAt, wayHalf, wayTallest } from './plan';
import { brazier, obelisk } from './things';

// The way to the spire, on the center line of the map, coming down the face of the world toward the visitor in
// terraces, a canyon through the city, to the front edge of the city, where it passes through a great ring and steps
// down to the bare ground. What lies on the ground is built flat on the map and laid over the dome; what stands is
// seated on it.

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0), FRONT = new THREE.Vector3(0, 0, 1);

// A straight run from one place on the map to another, so wide, from one height to another: a kerb, a wall.
function run(b: Parts, kind: 'lime' | 'dark', x0: number, z0: number, x1: number, z1: number, wide: number, y0: number, y1: number, o: { batter?: number; seed?: number } = {}): void {
  const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
  const g = (o.batter ? battered(wide, len, y1 - y0, o.batter, { dBatter: 0, cornice: Math.min(1.2, (y1 - y0) * 0.3) }) : block(wide, y1 - y0, len, 0.15)).translate(0, y0, 0);
  b.add(g.rotateY(a).translate((x0 + x1) / 2, 0, (z0 + z1) / 2), kind, { seed: o.seed });
}

// The ring's section: how far out from its middle line and how far in front, in order round it, and what each stretch
// is made of. A rolled lip at each edge and a raised rib of mirror gold round the middle of each face, between
// shallow channels: each of them a curve that carries its own line of light round the ring.
function section(): [number, number, 'bronze' | 'cap'][] {
  const w = RING.band / 2, d = RING.deep / 2;
  const face = (s: 1 | -1): [number, number, 'bronze' | 'cap'][] => {
    const pts: [number, number, 'bronze' | 'cap'][] = [
      [w, d * 0.5, 'bronze'], [w - 0.35, d - 0.4, 'bronze'], [w - 1.2, d, 'bronze'], [w - 2.0, d - 0.15, 'bronze'], [w - 2.6, d - 0.7, 'bronze'],
      [1.5, d - 0.7, 'cap'], [1.0, d + 0.2, 'cap'], [0, d + 0.75, 'cap'], [-1.0, d + 0.2, 'cap'], [-1.5, d - 0.7, 'bronze'],
      [-w + 2.6, d - 0.7, 'bronze'], [-w + 2.0, d - 0.15, 'bronze'], [-w + 1.2, d, 'bronze'], [-w + 0.35, d - 0.4, 'bronze'], [-w, d * 0.5, 'bronze'],
    ];
    return s > 0 ? pts : pts.map(([r, z, k]) => [-r, -z, k]);
  };
  return [...face(1), ...face(-1)];
}

// A ring standing across the way at a place on it, so high, and drawn so many times the great one's size. Only the
// great one, at the end of the way, has braziers.
function ring(b: Parts, lamps: Lamp[] | null, z: number, y: number, k: number): void {
  const { r, bar } = RING, m = place(0, y, z, 0, k), cy = bar.tall + r - 3;
  for (const [kind, g] of sweptRing(r, section(), Math.round(RING.seg * Math.sqrt(k)))) b.add(g.translate(0, cy, 0), kind, { m, cast: true });
  // Clamps of dark bronze round the band at even steps, which make it a thing built in segments and not a hoop, and a
  // keystone of mirror gold at its crown.
  for (let i = 1; i < RING.clamps; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / RING.clamps;
    const g = prism([{ y: -1.3, hw: RING.band / 2 + 0.9, hd: RING.deep / 2 + 0.7, c: 0.5 }, { y: 1.3, hw: RING.band / 2 + 0.9, hd: RING.deep / 2 + 0.7, c: 0.5 }], { top: true, bottom: true });
    b.add(g.rotateZ(a).translate(Math.cos(a) * r, cy + Math.sin(a) * r, 0), 'dark', { m, cast: true });
  }
  const key = prism([{ y: -3.4, hw: RING.band / 2 + 1.8, hd: RING.deep / 2 + 1.6, c: 1.2 }, { y: 3.4, hw: RING.band / 2 + 1.8, hd: RING.deep / 2 + 1.6, c: 1.2 }], { top: true, bottom: true });
  b.add(key.rotateZ(Math.PI / 2).translate(0, cy + r + 0.6, 0), 'cap', { m, cast: true });
  // Buttresses of pale stone either side of its foot, that seat it on its bar, capped in gold.
  for (const s of [-1, 1]) {
    const x = s * (r * 0.72 + RING.band / 2 + 3.5);
    b.add(battered(9, RING.deep + 6, RING.buttress, 0.18, { cornice: 1.6, c: 0.4 }).translate(x, bar.tall - 1, 0), 'lime', { m, cast: true, seed: 55 + s });
    b.add(facetedPyramid(3.2, 5, 0.12).translate(x, bar.tall - 1 + RING.buttress, 0), 'cap', { m, cast: true });
  }
  // The bar it stands on, as the shen ring's is: dark polished granite on a step of pale stone, a rod of gold along its
  // top front edge, and two bands of bronze where the ring is bound to it.
  b.add(battered(bar.wide + 8, bar.deep + 8, 2.4 + 3, 0.02, { cornice: 0.6, c: 0.3 }).translate(0, -3, 0), 'lime', { m, cast: true, seed: 51, foot: -3 });
  b.add(prism([{ y: 2.4, hw: bar.wide / 2, hd: bar.deep / 2, c: 1.2 }, { y: bar.tall, hw: bar.wide / 2 - 0.6, hd: bar.deep / 2 - 0.6, c: 1.2 }]), 'granite', { m, cast: true });
  for (const s of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.75, 0.75, bar.wide - 4, 12).rotateZ(Math.PI / 2).translate(0, bar.tall - 0.4, s * (bar.deep / 2 - 0.9)), 'cap', { m });
    b.add(prism([{ y: 1.8, hw: 2.2, hd: bar.deep / 2 + 0.5, c: 0.6 }, { y: bar.tall + 0.6, hw: 2.0, hd: bar.deep / 2 + 0.3, c: 0.6 }]).translate(s * (RING.band / 2 + 6), 0, 0), 'bronze', { m, cast: true });
  }
  // A brazier at each end of the bar.
  if (lamps) for (const s of [-1, 1]) brazier(b, lamps, { x: s * (bar.wide / 2 - 3), z: z + bar.deep / 2 + 6, y: y, scale: GRAND }, 4, 80 + s);
}

export async function buildWay(b: Parts, lamps: Lamp[]): Promise<void> {
  const { pool, terrace } = WAY, half = (z: number) => wayHalf(z, pool.half0, pool.half1), wall = (z: number) => wayHalf(z, WAY.wall0, WAY.wall1);
  const n = WAY.stations.length, landing = terraceAt(n - 1) - WAY.drop;

  // The terraces, from the spire's end down: each a level of worn stone either side of its stretch of the pool, its
  // front a riser with a step half way down it, the pool falling over it in a sheet, and walls either side that hold
  // it up out of the ground.
  for (let i = 0; i < n; i++) {
    const za = WAY.stations[i] - terrace / 2, zb = za + terrace, h = terraceAt(i), next = i < n - 1 ? terraceAt(i + 1) : landing;
    const k = (z: number) => half(z) + pool.kerb;
    for (const sx of [-1, 1]) {
      const inner = (z: number) => sx * k(z), outer = (z: number) => sx * (wall(z) - 1.3);
      b.add(quad(V(inner(za), h, za), V(outer(za), h, za), V(outer(zb), h, zb), V(inner(zb), h, zb), UP), 'paving', { flag: 1, seed: i * 2 + sx });
      b.add(quad(V(inner(zb), next, zb), V(outer(zb), next, zb), V(outer(zb), h, zb), V(inner(zb), h, zb), FRONT), 'lime', { seed: i * 5 + sx });
      const s0 = Math.abs(inner(zb)), s1 = Math.abs(outer(zb));
      b.add(block(s1 - s0, next + (h - next) / 2, WAY.steps * 1.1, 0.08).translate(sx * (s0 + s1) / 2, 0, zb + WAY.steps * 0.55), 'paving', { flag: 1, seed: i * 7 + sx });
      run(b, 'lime', sx * (half(za) + pool.kerb / 2), za, sx * (half(zb) + pool.kerb / 2), zb, pool.kerb, 0, h + pool.rim, { seed: i * 3 + sx });
      run(b, 'lime', sx * wall(za), za, sx * wall(zb), zb, 2.8, -2, h + WAY.wallTall, { batter: 0.06, seed: i * 11 + sx });
      run(b, 'dark', sx * wall(za), za, sx * wall(zb), zb, 2.0, h + WAY.wallTall, h + WAY.wallTall + 0.3);
      for (let z = za + WALL_LAMPS / 2; z < zb; z += WALL_LAMPS) {
        const lm = place(sx * wall(z), h + WAY.wallTall + 0.3, z);
        b.add(block(0.6, 2.6, 0.6, 0.08), 'bronze', { m: lm });
        b.add(block(1.1, 0.9, 1.1, 0.12, 2.6), 'lamp', { m: lm });
        b.add(block(1.5, 0.25, 1.5, 0.08, 3.5), 'dark', { m: lm });
      }
    }
    const w = h - pool.under, wn = next - pool.under;
    b.add(quad(V(-half(za), w, za), V(half(za), w, za), V(half(zb), w, zb), V(-half(zb), w, zb), UP), 'pool', {});
    b.add(quad(V(-half(zb), Math.max(wn, 0), zb), V(half(zb), Math.max(wn, 0), zb), V(half(zb), w, zb), V(-half(zb), w, zb), FRONT), 'pool', {});
    await slice();
  }
  // The landing the ring stands on, the piers that end the walls, and the broad steps down to the bare ground.
  const end = wall(WAY_END);
  b.add(quad(V(-end, landing, WAY_END), V(end, landing, WAY_END), V(end, landing, DESCENT.z0), V(-end, landing, DESCENT.z0), UP), 'paving', { flag: 1, seed: 90 });
  for (const sx of [-1, 1]) {
    b.add(battered(13, 13, landing + WAY.wallTall + 2, 0.06, { cornice: 1.4, c: 0.3 }).translate(0, -2, 0), 'lime', { m: place(sx * end, 0, WAY_END + 2), cast: true, seed: 60 + sx, foot: -2 });
    obelisk(b, { x: sx * end, z: WAY_END + 2, y: landing + WAY.wallTall }, GATE_OBELISK.tall, GATE_OBELISK.foot, { cast: true, seed: 64 + sx });
  }
  for (let i = 0; i < DESCENT.n; i++) {
    const k = i / DESCENT.n, za = DESCENT.z0 + (DESCENT.z1 - DESCENT.z0) * k, zb = DESCENT.z0 + (DESCENT.z1 - DESCENT.z0) * (k + 1 / DESCENT.n);
    const h = landing * (1 - (i + 1) / (DESCENT.n + 0.5)), wide = end + DESCENT.flare * (k + 0.5 / DESCENT.n);
    b.add(block(2 * wide, h + 3, zb - za + 0.4, 0.2).translate(0, -3, (za + zb) / 2 + 0.2), 'lime', { seed: 95 + i, foot: -3 });
  }
  await slice();

  // The rows: on each terrace a pair of obelisks with mirror caps or a pair of braziers, larger toward the visitor.
  WAY.stations.forEach((z, i) => {
    const most = wayTallest(z), x0 = wayHalf(z, WAY.row0, WAY.row1), y = terraceAt(i);
    for (const sx of [-1, 1]) {
      const x = sx * x0, seed = i * 2 + (sx > 0 ? 1 : 0);
      if (OBELISKS.includes(i)) obelisk(b, { x, z, y }, most, 2.1 + most * 0.042, { cast: true, seed });
      else if (BRAZIERS.includes(i)) brazier(b, lamps, { x, z, y, scale: GRAND }, Math.min(WAY.brazier, Math.max(4, most - 12)) / GRAND, seed);
    }
  });
  await slice();
  ring(b, lamps, RING.z, landing, 1);
  for (const { at, k } of RINGS) ring(b, null, WAY.stations[at], terraceAt(at), k);
}
