import { D2R, PYRAMID, ground, within } from '../../layout';

// What the face toward the moon mirrors sharp: the land's real skyline round it, seen from the pyramid, as heights over
// the horizon at bearings atan2(x, -z) in degrees. Past the land's front lip the ray is over the void, and the land
// beyond it is looked for on.

export const MIRROR = {
  // Over what bearings, at how many, looked for from so high over the pyramid's foot, out to so far, in steps of so much.
  skyline: { az: [40, 112], n: 48, from: 6, far: 1300, step: 4 },
} as const;

export function skyline(): number[] {
  const S = MIRROR.skyline, y0 = ground(PYRAMID.x, PYRAMID.z) + S.from, out: number[] = [];
  for (let i = 0; i < S.n; i++) {
    const a = (S.az[0] + ((S.az[1] - S.az[0]) * i) / (S.n - 1)) * D2R, dx = Math.sin(a), dz = -Math.cos(a);
    let top = -0.5;
    for (let t = 30; t < S.far; t += S.step) {
      const x = PYRAMID.x + dx * t, z = PYRAMID.z + dz * t;
      if (within(x, z) < 0) continue;
      top = Math.max(top, Math.atan2(ground(x, z) - y0, t));
    }
    out.push(top);
  }
  return out;
}
