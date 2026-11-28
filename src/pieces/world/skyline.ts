import { FAR, farEdge } from './far';
import { D2R, HOST, LAND, PYRAMID, RIM, SPIRE, WORLD, drawn, ground, ramp, within } from './layout';
import { TOWERS, TREES } from './placed';

// The world's outline against the sky, as its host shows it: at a place across, how far down from the host's top
// the highest thing there is. It is worked out once, on first use, from the plan itself: the land, the spire and
// its ring, the pyramid, every tower and tree, and the far towers at their tallest, lower where they fade out at
// their two ends (./far.ts), so it moves when they do. Lengths are in units. every is how far apart the places it
// is kept at are, grid how far apart the land is sampled, tree how tall a tree is taken to be for its crown's
// width, reach how far to each side a thing counts, so the line runs over the gaps between towers and not down
// into them, and soft how far each way it is then smoothed, which is never more than reach, so the line is never
// under a thing's top.
export const SKYLINE = { every: 4, grid: 8, tree: 1.5, reach: 40, soft: 24 } as const;
// The dunes of look d are a picture and stand higher than the plan's: their crest as read off its cut
// (DRAWN.files.cut), from the host's center line and from its top. They and the far towers are in the line in
// either look.
const DUNES: readonly (readonly [number, number])[] = [
  [320, 332], [340, 316], [380, 308], [460, 305], [500, 311], [540, 316], [580, 327], [620, 334], [664, 351],
];
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const;

let kept: Float32Array | null = null;

function build(): Float32Array {
  const E = SKYLINE.every, half = Math.ceil(HOST.wide / 2 / E), n = 2 * half + 1, top = new Float32Array(n).fill(Infinity);
  const span = (from: number, to: number, down: number) => {
    for (let i = Math.max(0, Math.floor(from / E) + half); i <= Math.min(n - 1, Math.ceil(to / E) + half); i++) if (down < top[i]) top[i] = down;
  };
  const slope = (a: readonly [number, number], b: readonly [number, number]) => {
    const steps = Math.max(1, Math.ceil(Math.abs(b[0] - a[0]) / E));
    for (let k = 0; k <= steps; k++) {
      const at = a[0] + ((b[0] - a[0]) * k) / steps;
      span(at, at, a[1] + ((b[1] - a[1]) * k) / steps);
    }
  };
  const turned = (x: number, z: number, w: number, d: number, turn: number) => {
    const c = Math.cos(turn * D2R), s = Math.sin(turn * D2R);
    return CORNERS.map(([i, j]) => [x + (i * w * c + j * d * s) / 2, z + (j * d * c - i * w * s) / 2] as const);
  };

  const G = SKYLINE.grid;
  for (let x = -LAND.rim; x <= LAND.rim; x += G) {
    for (let z = -LAND.rim; z <= LAND.rim; z += G) {
      if (within(x, z) < 0) continue;
      const [across, down] = drawn(x, ground(x, z), z);
      span(across - G / 2, across + G / 2, down);
    }
  }
  for (const [x, z, w, d, tall, turn] of TOWERS) {
    const roof = ground(x, z) + tall, at = turned(x, z, w, d, turn).map(([px, pz]) => drawn(px, roof, pz));
    span(Math.min(...at.map((p) => p[0])), Math.max(...at.map((p) => p[0])), Math.min(...at.map((p) => p[1])));
  }
  for (const [x, z, size] of TREES) {
    const [across, down] = drawn(x, ground(x, z) + size * SKYLINE.tree, z);
    span(across - size / 2, across + size / 2, down);
  }
  const tip = drawn(0, SPIRE.tall, 0), R = SPIRE.ring, ring = SPIRE.tall * R.up + R.r * Math.sin(Math.max(...R.tilt) * D2R);
  slope(drawn(-SPIRE.foot / 2, 0, 0), tip);
  slope(tip, drawn(SPIRE.foot / 2, 0, 0));
  span(drawn(-R.r, ring, 0)[0], drawn(R.r, ring, 0)[0], drawn(0, ring, 0)[1]);
  const P = PYRAMID, court = ground(P.x, P.z), apex = drawn(P.x, court + P.tall, P.z);
  for (const [px, pz] of turned(P.x, P.z, P.base, P.base, P.turn)) slope(apex, drawn(px, court, pz));
  if (FAR.on) {
    const tallest = Math.max(...FAR.towers.map((t) => t.tall[1])), mid = HOST.wide / 2, edge = farEdge();
    for (let i = 1; i < edge.length; i++) {
      const [x0, y0] = edge[i - 1], [x1, y1] = edge[i], x = (x0 + x1) / 2;
      const shown = ramp(FAR.ends[0][0], FAR.ends[0][1], x) * (1 - ramp(FAR.ends[1][0], FAR.ends[1][1], x));
      span(x0 - mid, x1 - mid, Math.min(y0, y1) - tallest * shown * (1 - FAR.thins[1] * ramp(FAR.thins[0][0], FAR.thins[0][1], x)));
    }
  }
  for (let i = 1; i < DUNES.length; i++) slope(DUNES[i - 1], DUNES[i]);
  const rim = drawn(WORLD.half, -RIM, 0)[1];
  for (let i = 0; i < n; i++) if (top[i] > rim) top[i] = rim;

  const reach = Math.round(SKYLINE.reach / E), soft = Math.round(Math.min(SKYLINE.soft, SKYLINE.reach) / E);
  const least = new Float32Array(n), line = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = Infinity;
    for (let k = Math.max(0, i - reach); k <= Math.min(n - 1, i + reach); k++) m = Math.min(m, top[k]);
    least[i] = m;
  }
  for (let i = 0; i < n; i++) {
    let sum = 0, count = 0;
    for (let k = Math.max(0, i - soft); k <= Math.min(n - 1, i + soft); k++) { sum += least[k]; count++; }
    line[i] = sum / count;
  }
  return line;
}

// How far down from the host's top the world's outline is, at a place this far right of the host's center line.
export function skyline(across: number): number {
  kept ??= build();
  const at = Math.min(kept.length - 1, Math.max(0, across / SKYLINE.every + (kept.length - 1) / 2)), i = Math.min(kept.length - 2, Math.floor(at));
  return kept[i] + (kept[i + 1] - kept[i]) * (at - i);
}
