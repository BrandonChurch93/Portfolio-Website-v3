// One of the workers that fill the skin's map (make.mjs): for each texel it casts the line of sight through that
// pixel of picture 9 onto the skin's mesh and works out, where it lands, the fine relief, the cracks' light and how
// the stone's color changes there.
import { parentPort, workerData } from 'node:worker_threads';
import { closest } from '../../lib/bvh.mjs';
import { L } from '../../lib/plan.mjs';
import { setup, fine, glow, cleft, intact, pitted, fbm } from './field.mjs';
import { frame, shellNormal as shellNormalOf, toShell } from './features.mjs';
const shellNormalAt = (q) => shellNormalOf(q[0], q[1], q[2]);

const { features, bvh, positions, normals, indices, texels, rects, perPixel, rows, moon } = workerData;
setup(features);
const P = new Float32Array(positions), N = new Float32Array(normals), I = new Uint32Array(indices);
const out = {
  H: new Float32Array(texels.H), G: new Float32Array(texels.G), B: new Float32Array(texels.B), at: new Float32Array(texels.at), side: new Int8Array(texels.side),
};
const W = texels.wide, hit = new Float64Array(4);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// How the fine relief shades itself from the moon: places along the way to the moon, in units.
const STEPS = [0.3, 0.65, 1.1, 1.7, 2.5, 3.6];

for (let row = rows[0]; row < rows[1]; row++) {
  for (let col = 0; col < W; col++) {
    const i = row * W + col;
    let rect = null;
    for (const r of rects) if (col >= r.ox && col < r.ox + r.w && row >= r.oy && row < r.oy + r.h) { rect = r; break; }
    out.side[i] = 0;
    if (!rect) continue;
    const px = rect.x0 + (col - rect.ox + 0.5) / perPixel, py = rect.y0 + (row - rect.oy + 0.5) / perPixel;
    const o = L.fromPicture(px, py, 900), f = L.fromPicture(px, py, -900);
    const tri = closest(bvh, o[0], o[1], o[2], f[0] - o[0], f[1] - o[1], f[2] - o[2], 1, hit);
    if (tri < 0) continue;
    const a = I[tri * 3], b = I[tri * 3 + 1], c = I[tri * 3 + 2], u = hit[1], v = hit[2], w = 1 - u - v;
    const p = [0, 1, 2].map((k) => P[a * 3 + k] * w + P[b * 3 + k] * u + P[c * 3 + k] * v);
    let n = [0, 1, 2].map((k) => N[a * 3 + k] * w + N[b * 3 + k] * u + N[c * 3 + k] * v);
    const nl = Math.hypot(...n) || 1;
    n = n.map((x) => x / nl);
    const side = rect.side, q = toShell(...p);
    out.side[i] = side;
    out.at.set(p, i * 3);
    const h0 = fine(q[0], q[1], q[2], side);
    out.H[i] = h0;
    // The fine relief's slope along the surface here, which turns a face toward or away from a crack's light.
    const sn0 = shellNormalAt(q), [e1, e2] = frame(sn0), D = 0.3;
    const r1 = toShell(q[0] + e1[0] * D, q[1] + e1[1] * D, q[2] + e1[2] * D), r2 = toShell(q[0] + e2[0] * D, q[1] + e2[1] * D, q[2] + e2[2] * D);
    const g1 = (fine(r1[0], r1[1], r1[2], side) - h0) / D, g2 = (fine(r2[0], r2[1], r2[2], side) - h0) / D;
    out.G[i] = glow(q[0], q[1], q[2], [e1[0] * g1 + e2[0] * g2, e1[1] * g1 + e2[1] * g2, e1[2] * g1 + e2[2] * g2]);
    // The stone's color here, as a multiple of its side's own.
    const sn = (() => { const g = [q[0] / L.WORLD.half ** 2, Math.min(0, q[1] + L.RIM) / L.WORLD.deep ** 2, q[2] / L.WORLD.half ** 2], l = Math.hypot(...g) || 1; return g.map((x) => x / l); })();
    const up = n[0] * sn[0] + n[1] * sn[1] + n[2] * sn[2];
    const above = (L.shell(...p) >= 1 ? 1 : -1) * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    const below = intact(q[0], q[1], q[2]) - above;
    let m = 1;
    const tone = fbm(q[0] * 0.05, q[1] * 0.05, q[2] * 0.05, 3), mottle = fbm(q[0] * 0.33 + 4, q[1] * 0.33, q[2] * 0.33, 3);
    if (side > 0) {
      // Dust lies on what faces out and settles in the floors; the steep walls and the crests show the rock.
      m *= 0.8 + 0.32 * smooth(0.72, 0.97, up);
      m *= 0.94 + 0.12 * tone + 0.08 * mottle;
      m *= 1 - 0.32 * pitted(q[0], q[1], q[2], side);
      // The fine relief's own shadows from the moon.
      const md = moon, dn = md[0] * n[0] + md[1] * n[1] + md[2] * n[2];
      let vis = 1;
      if (dn <= 0.02) vis = smooth(-0.08, 0.02, dn);
      else {
        let tx = md[0] - dn * n[0], ty = md[1] - dn * n[1], tz = md[2] - dn * n[2];
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx /= tl; ty /= tl; tz /= tl;
        const rise = dn / Math.sqrt(Math.max(1e-4, 1 - dn * dn));
        for (const s of STEPS) {
          const r = toShell(q[0] + tx * s, q[1] + ty * s, q[2] + tz * s), hs = fine(r[0], r[1], r[2], side);
          vis = Math.min(vis, smooth(-0.06, 0.04, rise - (hs - h0) / s));
        }
      }
      m *= 0.3 + 0.7 * vis;
    } else {
      m *= 0.8 + 0.3 * tone + 0.14 * mottle;
      m *= 1 - 0.3 * pitted(q[0], q[1], q[2], side);
      m *= 1 - 0.35 * cleft(q[0], q[1], q[2]);
    }
    // At a torn edge, the crust in section: its pale dusty top layer over darker rock, and the darker rock the
    // steps below are.
    if (below > 0.35) {
      const layer = below < 1.6 ? 1 : 0;
      m *= layer ? (side > 0 ? 1.25 : 2.6) : side > 0 ? 0.68 : 1.15;
    }
    out.B[i] = m;
  }
  if ((row & 15) === 0) parentPort.postMessage({ row });
}
parentPort.postMessage({ done: true });
