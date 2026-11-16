// One of the workers that fill the skin's map (make.mjs): for each texel it casts the line of sight through that
// pixel of picture 9 onto the skin's mesh and works out, where it lands, the fine relief, how the stone's color
// changes there, and its fourth number: on the dark side the cracks' light (over half: inside a cleft, the light
// itself; under half: the light that lies on the rock beside one), on the pale side how much of the place is the
// darker rock under the crust, seen in section at a torn edge.
import { parentPort, workerData } from 'node:worker_threads';
import { closest } from '../../lib/bvh.mjs';
import { L } from '../../lib/plan.mjs';
import { CRUST, SHOULDER, setup, fine, coarse, crust, chips, crackOf, edgeDistance, pitted, floored, farEdge, fbm, downOf, slabbed } from './field.mjs';
import { frame, shellNormal, toShell } from './features.mjs';

const { features, bvh, positions, normals, indices, texels, rects, perPixel, rows, moon } = workerData;
setup(features);
const P = new Float32Array(positions), N = new Float32Array(normals), I = new Uint32Array(indices);
const out = {
  H: new Float32Array(texels.H), G: new Float32Array(texels.G), B: new Float32Array(texels.B), at: new Float32Array(texels.at), side: new Int8Array(texels.side),
};
const W = texels.wide, hit = new Float64Array(4);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// How the fine relief shades itself from the moon: places along the way to the moon, in units.
const STEPS = [0.3, 0.65, 1.1, 1.7, 2.5, 3.6];
// Where the top of a broken face is looked for round a place: so far off, in so many directions.
const AROUND = [0.7, 1.5, 2.6, 3.8], WAYS = 8;

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
    const n = unit([0, 1, 2].map((k) => N[a * 3 + k] * w + N[b * 3 + k] * u + N[c * 3 + k] * v));
    const side = rect.side, q = toShell(...p);
    out.side[i] = side;
    out.at.set(p, i * 3);
    const sn = shellNormal(...q), [e1, e2] = frame(sn), D = 0.3, up = dot(n, sn);
    // On the crust's broken faces the outer surface's own fine relief is not there to be seen: taken from the place on
    // the outer surface over each point, it was drawn down the face in streaks. They take a relief of their own.
    const toLine = edgeDistance(q[0], q[1], q[2]), deep = L.shell(...p) < 1 ? Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) : 0;
    // The crust in section: a steep face in the band by the line, or anything well under the outer surface at the line.
    const isFace = (up < 0.6 && toLine < CRUST.band) || (toLine < 4 && deep > 2.5);
    const h0 = isFace ? 0.3 * fbm(p[0] / 1.7, p[1] / 1.7, p[2] / 1.7, 2) : fine(q[0], q[1], q[2], side);
    out.H[i] = h0;
    const r1 = toShell(q[0] + e1[0] * D, q[1] + e1[1] * D, q[2] + e1[2] * D), r2 = toShell(q[0] + e2[0] * D, q[1] + e2[1] * D, q[2] + e2[2] * D);
    const g1 = isFace ? 0 : (fine(r1[0], r1[1], r1[2], side) - h0) / D, g2 = isFace ? 0 : (fine(r2[0], r2[1], r2[2], side) - h0) / D;
    // The face here with the fine relief on it.
    const bent = unit([n[0] - e1[0] * g1 - e2[0] * g2, n[1] - e1[1] * g1 - e2[1] * g2, n[2] - e1[2] * g1 - e2[2] * g2]);
    const above = (L.shell(...p) >= 1 ? 1 : -1) * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    const down = downOf(q[1]), floor = floored(q[0], q[1], q[2]);

    // A broken face at a torn edge: how far under the top of the face it is. The pale top layer of the crust shows
    // in section over the darker rock under it.
    const cr = crust(q[0], q[1], q[2]), inBand = cr.edge < CRUST.band;
    let section = -1;
    if (inBand && up < 0.62) {
      let top = above;
      for (const r of AROUND) for (let k = 0; k < WAYS; k++) {
        const ang = (k / WAYS) * 2 * Math.PI, cx = Math.cos(ang) * r, cy = Math.sin(ang) * r;
        const s = toShell(q[0] + e1[0] * cx + e2[0] * cy, q[1] + e1[1] * cx + e2[1] * cy, q[2] + e1[2] * cx + e2[2] * cy);
        top = Math.max(top, coarse(s[0], s[1], s[2]));
      }
      section = top - above;
    }
    // The pale top layer is a little thicker or thinner from place to place, and chips near the line go through it.
    const thick = CRUST.layer * (0.75 + 0.5 * (0.5 + 0.5 * fbm(q[0] * 0.08, q[1] * 0.08, q[2] * 0.08, 2)));
    const layer = section < 0 ? 0 : smooth(0.2, 0.6, section) * (1 - smooth(thick - 0.3, thick + 0.3, section));
    const under = Math.max(section < 0 ? 0 : smooth(thick - 0.3, thick + 0.3, section), smooth(0.3, 0.85, chips(q[0], q[1], q[2])));
    const rd = -L.RIM - q[1];

    const tone = fbm(q[0] * 0.012, q[1] * 0.012, q[2] * 0.012, 3), mid = fbm(q[0] * 0.05, q[1] * 0.05, q[2] * 0.05, 3), mottle = fbm(q[0] * 0.33 + 4, q[1] * 0.33, q[2] * 0.33, 3);
    let m = 1, g = 0;
    if (side > 0) {
      // Dust lies on what faces out and settles in the floors; the steep walls and the crests show the rock. The
      // dust is thinner down toward the lower limb, and on the oldest ground.
      m *= 0.94 + 0.12 * smooth(0.7, 0.97, up);
      m *= 0.93 + 0.2 * tone + 0.12 * mid + 0.07 * mottle;
      m *= 1 - 0.14 * smooth(0.35, 0.9, down);
      // Near the torn line the ground is shattered and its dust shaken off: darker, as the picture's is.
      m *= 1 - 0.2 * (1 - smooth(10, 60, farEdge(q[0], q[1], q[2])));
      // A crater's floor sits back in its bowl: it glared when it was the palest dust of the side.
      m *= 1 - 0.2 * floor;
      m *= 1 - (isFace ? 0 : 0.62 * pitted(q[0], q[1], q[2], side));
      // The fine relief's own shadows from the moon.
      const md = moon, dn = dot(md, bent);
      let vis = 1;
      if (isFace) vis = 1;
      else if (dn <= 0.02) vis = smooth(-0.08, 0.02, dn);
      else {
        let tx = md[0] - dn * sn[0], ty = md[1] - dn * sn[1], tz = md[2] - dn * sn[2];
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx /= tl; ty /= tl; tz /= tl;
        const ds = dot(md, sn), rise = ds / Math.sqrt(Math.max(1e-4, 1 - ds * ds));
        for (const s of STEPS) {
          const r = toShell(q[0] + tx * s, q[1] + ty * s, q[2] + tz * s), hs = fine(r[0], r[1], r[2], side);
          vis = Math.min(vis, smooth(-0.06, 0.04, rise - (hs - h0) / s));
        }
      }
      m *= 0.18 + 0.82 * vis;
      // What the moon falls on squarely is the dust at its palest: the shader eases it toward the dust's cream.
      m *= 1 + 0.26 * smooth(0.3, 0.8, dot(md, bent)) * vis * (1 - 0.85 * floor);
      m *= 1 + 0.12 * layer;
      // Sand from the land's drape lies in the hollows of the shoulder under it: where the place is lower than the
      // ground round it, thinning out down the side.
      let sand = 0;
      if (rd < SHOULDER.under + 10) {
        let around = 0;
        for (let k = 0; k < 6; k++) { const ang = (k / 6) * 2 * Math.PI, r = toShell(q[0] + (e1[0] * Math.cos(ang) + e2[0] * Math.sin(ang)) * 4, q[1] + (e1[1] * Math.cos(ang) + e2[1] * Math.sin(ang)) * 4, q[2] + (e1[2] * Math.cos(ang) + e2[2] * Math.sin(ang)) * 4); around += coarse(r[0], r[1], r[2]) + fine(r[0], r[1], r[2], side); }
        const low = around / 6 - (coarse(q[0], q[1], q[2]) + h0);
        sand = Math.min(1, smooth(0.1, 0.9, low) * (1 - smooth(SHOULDER.under * 0.4, SHOULDER.under + 8, rd)) + 0.7 * (1 - smooth(3, 16, rd))) * (1 - under);
      }
      // The fourth number: under half, how much is the red brown under the crust; over half, how much is sand.
      g = 0.5 - 0.5 * under + 0.5 * sand;
    } else {
      // The oldest surface: broad changes of tone, and long weathering streaks down it.
      const ex = sn[2], ez = -sn[0], el = Math.hypot(ex, ez) || 1, across = (q[0] * ex + q[2] * ez) / el;
      const streak = fbm(across * 0.09, q[1] * 0.006, 1.3, 3), fineStreak = fbm(across * 0.45, q[1] * 0.02, 5.1, 2);
      m *= 0.62 + 0.75 * (0.5 + 0.5 * Math.max(-1, Math.min(1, 1.4 * tone)));
      m *= 0.7 + 0.6 * (0.5 + 0.5 * Math.max(-1, Math.min(1, 1.6 * streak))) + 0.16 * fineStreak;
      m *= 0.92 + 0.1 * mottle;
      m *= 1 - (isFace ? 0 : (slabbed(q[0], q[1], q[2]) ?? -9) > 0 ? 0.9 * pitted(q[0], q[1], q[2], side) : 0.32 * pitted(q[0], q[1], q[2], side));
      const ck = crackOf(q[0], q[1], q[2]);
      m *= 1 - (ck.heat > 0 ? 0.2 : 0.5) * ck.in;
      if (ck.in > 0 && ck.heat > 0 && isFace && toLine < 4) {
        // Where a crack runs out over the crust's broken face, its light lies on the face and is not a cleft: drawn as
        // a cleft there it stood out past the edge as a white blade.
        g = 0;
      } else if (ck.in > 0 && ck.heat > 0) {
        // In a lit cleft, the light itself: the wall that faces the visitor is lit to its lip, the near one only
        // deep down, so the cleft reads as a V cut into the rock.
        const toEye = unit([o[0] - p[0], o[1] - p[1], o[2] - p[2]]), en = dot(toEye, sn), et = [toEye[0] - en * sn[0], toEye[1] - en * sn[1], toEye[2] - en * sn[2]];
        const far = dot(ck.side, et) > 0, d = ck.in;
        const lit = far ? 0.45 + 0.55 * d ** 0.8 : 0.06 + 0.94 * d ** 3;
        g = 0.5 + 0.5 * Math.min(1, (0.15 + 0.85 * ck.heat ** 1.5) * lit * ck.dim);
      } else if (ck.spill > 0 && !(isFace && toLine < 4)) {
        // Beside one, the light that lands on the rock right by its lip, a little more on faces turned to it.
        const from = [ck.from[0] + sn[0] * 0.8 - p[0], ck.from[1] + sn[1] * 0.8 - p[1], ck.from[2] + sn[2] * 0.8 - p[2]], dl = Math.hypot(...from) || 1;
        const soft = unit([n[0] + 0.15 * (bent[0] - n[0]), n[1] + 0.15 * (bent[1] - n[1]), n[2] + 0.15 * (bent[2] - n[2])]);
        const facing = Math.min(1, Math.max(0, 0.5 + 2 * dot(soft, from.map((x) => x / dl))));
        g = 0.5 * Math.min(0.98, ck.spill * (0.55 + 0.45 * facing));
      }
      m *= 1 + 0.15 * layer;
    }
    out.G[i] = g;
    out.B[i] = m;
  }
  if ((row & 15) === 0) parentPort.postMessage({ row });
}
parentPort.postMessage({ done: true });
