// Sculpt R, round 3: the rubble. Broken stones lying where they fell, only on what faces up and is seen: on the floor's
// shelf, on the ledges of the blocks' upper sides. Each is the inside of a dozen planes round its middle, flatter
// across than along, and sunk a little into what it lies on, so it has its own faces and its own contact shadow.
//
//   import { rubble } from './rubble.mjs'
//   args.stones = await rubble(args)     // [{ at, s, planes: [{ n, h }] }]
import { L } from '../../lib/plan.mjs';
import * as H from './hollow.mjs';

// How many places are tried, the most stones, how large (units), how far up a face must look, how far sunk.
export const RUBBLE = { tries: 9000, most: 110, size: [2.2, 7], up: 0.72, sunk: 0.42, apart: 3 };

const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export async function rubble(args, { draft = false } = {}) {
  H.setup(args);
  const f = H.bare, out = [];
  const grad = (p) => { const e = 0.25; return norm([f(p[0] + e, p[1], p[2]) - f(p[0] - e, p[1], p[2]), f(p[0], p[1] + e, p[2]) - f(p[0], p[1] - e, p[2]), f(p[0], p[1], p[2] + e) - f(p[0], p[1], p[2] - e)]); };
  const blocks = args.blocks.filter((b) => b.kind !== 'roof');
  const tries = draft ? RUBBLE.tries / 3 : RUBBLE.tries;
  for (let k = 0; k < tries && out.length < RUBBLE.most; k++) {
    const b = blocks[Math.floor(hash(k, 1) * blocks.length)];
    const px = b.box[0] + (b.box[2] - b.box[0]) * hash(k, 2), py = b.box[1] + (b.box[3] - b.box[1]) * hash(k, 3);
    // Along the ray of that pixel from the visitor, to the first rock.
    const a = L.fromPicture(px, py, 700), c = L.fromPicture(px, py, -300);
    let t0 = 0, hit = null;
    for (let t = 0; t <= 1; t += 0.0015) {
      const p = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];
      if (f(...p) < 0) { hit = [t0, t]; break; }
      t0 = t;
    }
    if (!hit) continue;
    for (let i = 0; i < 24; i++) { const m = (hit[0] + hit[1]) / 2, p = [0, 1, 2].map((q) => a[q] + (c[q] - a[q]) * m); if (f(...p) < 0) hit[1] = m; else hit[0] = m; }
    const p = [0, 1, 2].map((q) => a[q] + (c[q] - a[q]) * hit[1]), n = grad(p);
    if (n[1] < RUBBLE.up) continue;
    // Where the core's light is near, stones are fewer and smaller: the face there is the picture's broad clean light.
    const s = RUBBLE.size[0] + (RUBBLE.size[1] - RUBBLE.size[0]) * hash(k, 4) ** 2.2;
    if (out.some((o) => Math.hypot(o.at[0] - p[0], o.at[1] - p[1], o.at[2] - p[2]) < (o.s + s) * RUBBLE.apart * 0.5)) continue;
    const planes = [], flat = 0.45 + 0.35 * hash(k, 5), turn = hash(k, 6) * 6.283;
    for (let i = 0; i < 13; i++) {
      const u = (i + 0.5) / 13, th = Math.acos(1 - 2 * u), ph = i * 2.39996 + turn;
      let m = norm([Math.sin(th) * Math.cos(ph) + 0.5 * (hash(k * 13 + i, 7) - 0.5), Math.cos(th) + 0.5 * (hash(k * 13 + i, 8) - 0.5), Math.sin(th) * Math.sin(ph) + 0.5 * (hash(k * 13 + i, 9) - 0.5)]);
      // The stone lies flat on the face under it: across that face it is longer than it is tall.
      const up = m[0] * n[0] + m[1] * n[1] + m[2] * n[2];
      planes.push({ n: m, h: s * (0.72 + 0.28 * hash(k * 13 + i, 10)) * (Math.abs(up) > 0.6 ? flat : 1) });
    }
    const lift = s * flat * 0.8 - s * RUBBLE.sunk;
    out.push({ at: [p[0] + n[0] * lift, p[1] + n[1] * lift, p[2] + n[2] * lift], s, planes });
  }
  return out;
}
