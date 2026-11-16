// One of the workers that fill the skin's map (make.mjs): for each texel it casts the line of sight through that
// pixel of picture 9 onto the skin's mesh and works out, where it lands, the fine relief, how the stone's color
// changes there, and its fourth number: on the pale side how much of the moon is seen there (moonSeen, marched over
// the whole relief), on the dark side nothing the shader reads (the cracks are cut by the shader from their lines).
import { parentPort, workerData } from 'node:worker_threads';
import { any, closest } from '../../lib/bvh.mjs';
import { L } from '../../lib/plan.mjs';
import { CRUST, SHOULDER, setup, fine, coarse, crust, chips, crackOf, edgeDistance, pitted, floored, farEdge, fbm, downOf, slabbed, tornPale } from './field.mjs';
import { frame, shellNormal, toShell } from './features.mjs';
import { SECTION, blockTop } from '../../../../src/pieces/world/parts/skin/look.ts';

const { features, bvh, positions, normals, indices, code, texels, rects, perPixel, rows, moon } = workerData;
setup(features);
const P = new Float32Array(positions), N = new Float32Array(normals), I = new Uint32Array(indices), CODE = new Float32Array(code);
const out = {
  H: new Float32Array(texels.H), G: new Float32Array(texels.G), B: new Float32Array(texels.B), at: new Float32Array(texels.at), side: new Int8Array(texels.side), CELL: new Int32Array(texels.cell),
};
const W = texels.wide, hit = new Float64Array(4);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// How the pale side is shaded from the moon: places along the way to it, in units, from the first to past the
// longest shadow a crater's rim throws, each a share further than the last, and how soft the shadow's edge is (the
// moon's own width as a share of the distance, and a little more for the texel).
const SHADE = { first: 0.25, grow: 1.12, far: 160, soft: 0.01, texel: 0.1 };
const STEPS = [];
for (let s = SHADE.first; s < SHADE.far; s *= SHADE.grow) STEPS.push(s);
// Where the top of a broken face is looked for round a place: so far off, in so many directions.
const AROUND = [0.7, 1.5, 2.6, 3.8], WAYS = 8;

// The share of the moon seen from a place on the pale side (q on the outer surface, sn its normal, h0 the fine relief
// there): a ray toward the moon is marched over the relief, and where it passes under a height the moon is hidden. The
// fine relief can throw only short shadows, so it is asked about only near the place. Over the land's rim the land
// throws its own, which the shader takes from the shadow map.
const FINE_REACH = 7;
function moonSeen(q, sn, h0, side, md) {
  const h = coarse(q[0], q[1], q[2]) + h0, o = [q[0] + sn[0] * h, q[1] + sn[1] * h, q[2] + sn[2] * h];
  let vis = 1;
  for (const s of STEPS) {
    const P = [o[0] + md[0] * s, o[1] + md[1] * s, o[2] + md[2] * s];
    if (P[1] > -L.RIM - 2) break;
    const r = toShell(P[0], P[1], P[2]), above = (L.shell(P[0], P[1], P[2]) >= 1 ? 1 : -1) * Math.hypot(P[0] - r[0], P[1] - r[1], P[2] - r[2]);
    if (above > 45) break;
    const ground = coarse(r[0], r[1], r[2]) + (s < FINE_REACH ? fine(r[0], r[1], r[2], side) * (1 - smooth(FINE_REACH * 0.6, FINE_REACH, s)) : 0);
    const w = SHADE.soft * s + SHADE.texel;
    vis = Math.min(vis, smooth(-w, w, above - ground));
    if (vis < 0.002) return 0;
  }
  return vis;
}

// A block's faces broken into planes of many sizes: in each cell of two grains of a pattern of cells the face is a
// plane of its own, tipped its own way, so they meet in crisp steps; the cracks between them are dark, and each plane
// is a little lighter or darker than the next (FRACTURE: each grain's size, how far its planes tip, in units of
// height to a unit across, and how wide its cracks are). A face carved only by large facets and soft dents read as
// crumpled foil.
// The steps between the planes are left to the light: drawn as dark lines between them they read as a net of
// cracks, and at one small grain all over as crumpled paper. A few large planes, and a finer grain of small ones.
const FRACTURE = [{ size: 13, tip: 0.16, crack: 0, dark: 0, seed: 3 }, { size: 4.6, tip: 0.05, crack: 0, dark: 0, seed: 9 }];
const hashOf = (i, j, k, s) => { let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683) ^ Math.imul(s, 1274126177); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const FR = { h: 0, tone: 1, cell: 1 };
function fractured(p) {
  FR.h = 0; FR.tone = 1; FR.cell = 1;
  for (const g of FRACTURE) {
    const fx = p[0] / g.size, fy = p[1] / g.size, fz = p[2] / g.size, X = Math.floor(fx), Y = Math.floor(fy), Z = Math.floor(fz);
    let d1 = Infinity, d2 = Infinity, b = null;
    for (let i = X - 1; i <= X + 1; i++) for (let j = Y - 1; j <= Y + 1; j++) for (let k = Z - 1; k <= Z + 1; k++) {
      const sx = i + hashOf(i, j, k, g.seed), sy = j + hashOf(i, j, k, g.seed + 1), sz = k + hashOf(i, j, k, g.seed + 2);
      const d = Math.hypot(sx - fx, sy - fy, sz - fz);
      if (d < d1) { d2 = d1; d1 = d; b = [i, j, k, sx, sy, sz]; } else if (d < d2) d2 = d;
    }
    const [i, j, k, sx, sy, sz] = b, t = unit([hashOf(i, j, k, g.seed + 3) - 0.5, hashOf(i, j, k, g.seed + 4) - 0.5, hashOf(i, j, k, g.seed + 5) - 0.5]);
    FR.h += g.tip * g.size * ((fx - sx) * t[0] + (fy - sy) * t[1] + (fz - sz) * t[2]);
    FR.tone *= 0.84 + 0.32 * hashOf(i, j, k, g.seed + 6);
    FR.cell = (Math.imul(FR.cell, 92821) ^ Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(k, 83492791)) | 1;
  }
  return FR;
}

// The same for a block of the pale side's crust, by rays cast over the mesh, a few across the moon's disc.
const DISC = [[0, 0], [1, 0], [-0.5, 0.87], [-0.5, -0.87]].map(([a, b]) => [a * SHADE.soft, b * SHADE.soft]);
function blockSeen(p, n, md) {
  const [e1, e2] = frame(md);
  let seen = 0;
  for (const [a, b] of DISC) {
    const d = unit([md[0] + e1[0] * a + e2[0] * b, md[1] + e1[1] * a + e2[1] * b, md[2] + e1[2] * a + e2[2] * b]);
    if (!any(bvh, p[0] + n[0] * 0.25, p[1] + n[1] * 0.25, p[2] + n[2] * 0.25, d[0], d[1], d[2], 400)) seen++;
  }
  return seen / DISC.length;
}

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
    // A block of the crust has its own faces, which the shader lights from the mesh: here only a fine grain and a
    // change of tone, and nothing of the outer surface's pits, sand or cracks.
    if (CODE[a] > 0.25) {
      // On its weathered top the crust's own old ground shows: pitted and lumpy, as the outer surface is.
      const top = blockTop(CODE[a] * w + CODE[b] * u + CODE[c] * v), pit = top > 0.5 ? pitted(q[0], q[1], q[2], 1) : 0;
      const fr = fractured(p);
      out.CELL[i] = fr.cell;
      out.H[i] = fr.h + 0.1 * fbm(p[0] / 1.3, p[1] / 1.3, p[2] / 1.3, 2) + (top > 0.5 ? (fine(q[0], q[1], q[2], 1) - 0.1) * smooth(0.5, 0.9, top) * 0.25 : 0);
      out.B[i] = (0.9 + 0.14 * fbm(p[0] * 0.08, p[1] * 0.08, p[2] * 0.08, 2)) * fr.tone * (1 - 0.65 * pit);
      out.G[i] = side > 0 ? blockSeen(p, n, moon) : 0;
      continue;
    }
    const sn = shellNormal(...q), [e1, e2] = frame(sn), D = 0.3, up = dot(n, sn);
    // On the crust's broken faces the outer surface's own fine relief is not there to be seen: taken from the place on
    // the outer surface over each point, it was drawn down the face in streaks. They take a relief of their own.
    const toLine = edgeDistance(q[0], q[1], q[2]), deep = L.shell(...p) < 1 ? Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) : 0;
    // The crust in section: a steep face in the band by the line, or anything well under the outer surface at the line.
    const isFace = side > 0 ? up < 0.25 : (up < 0.6 && toLine < CRUST.band) || (toLine < 4 && deep > 2.5);
    // On the pale side's lip, where it rounds over into the break, the relief is the stone's own where it is and not
    // the outer surface's over it: taken from over it, its pits were drawn down the slope in streaks.
    // It is broken stone as well as pitted: a few large fracture planes and a grain, so it never reads as plaster.
    // At the pale tear, where the crust has fallen away (tornPale), the stone under it in section: broken planes and a
    // grit of its own, and its tone stored under SECTION, where the shader takes it for the stone and not the dust.
    const torn = side > 0 && tornPale(q[0], q[1], q[2]).kind === 2;
    if (torn) {
      const fr = fractured(p), hs = 1.4 * fr.h + 0.35 * fbm(p[0] / 1.1, p[1] / 1.1, p[2] / 1.1, 2) + 0.12 * fbm(p[0] / 0.45, p[1] / 0.45, p[2] / 0.45, 1);
      out.H[i] = hs;
      out.CELL[i] = fr.cell;
      const tone = fr.tone * (0.8 + 0.4 * (0.5 + 0.5 * fbm(p[0] / 3.3, p[1] / 3.3, p[2] / 3.3, 2)));
      out.B[i] = SECTION[0] + (SECTION[1] - SECTION[0]) * Math.min(1, Math.max(0, tone / 1.3));
      out.G[i] = moonSeen(q, sn, hs, side, moon);
      continue;
    }
    const lip = false, lfr = null;
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
      // Only gentle changes of tone: broad ones read as dark stains painted between the craters.
      m *= 0.94 + 0.12 * smooth(0.7, 0.97, up);
      m *= 0.97 + 0.07 * tone + 0.05 * mid + 0.06 * mottle;
      m *= 1 - 0.1 * smooth(0.35, 0.9, down);
      // Near the torn line the ground is shattered and its dust shaken off: a little darker, as the picture's is.
      m *= 1 - 0.08 * (1 - smooth(10, 60, farEdge(q[0], q[1], q[2])));
      // A crater's floor sits back in its bowl: it glared when it was the palest dust of the side.
      m *= 1 - 0.06 * floor;
      // A pit is darker only a little: its shadow is its own (vis), and its wall turned to the moon is lit.
      m *= lip ? lfr.tone * (1 - 0.5 * pitted(p[0], p[1], p[2], side)) * (0.9 + 0.2 * fbm(p[0] / 3.3, p[1] / 3.3, p[2] / 3.3, 2)) : 1 - (isFace ? 0 : 0.28 * pitted(q[0], q[1], q[2], side));
      // What of the moon reaches the place: a march toward it over the whole relief, the craters and the pits, so every
      // shadow is the shape of what throws it, round where a rim is round, and its edge is as soft as the moon is wide.
      // Taken from the bake's share at each vertex it was the shape of the triangles: black polygons, needles, stripes.
      const md = moon, vis = isFace ? 1 : moonSeen(q, sn, h0, side, md);
      // Where the moon falls squarely the dust is at its palest: the shader eases it toward the dust's cream.
      m *= 1 + 0.2 * smooth(0.3, 0.8, dot(md, bent)) * vis * (1 - 0.85 * floor);
      m *= 1 + 0.12 * layer;
      // The fourth number on the pale side: how much of the moon is seen. The dust is never stored as dark as the
      // stone in section (SECTION).
      g = vis;
      m = Math.max(m, SECTION[1] + 0.12);
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
