// Sculpt S cut open: the rock's field sliced through the core's middle, from above (a level cut, the visitor at the
// foot of the image) and from the side (a cut along the line of sight, the visitor at the right), with the ball
// drawn in and the socket the plan asks for (SOCKET in masses.mjs) as a line. Rock is tan, air is black.
//
//   node scripts/world/parts/rock-s/cut.mjs [--out shots/world/rock-s/cut.png] [--at x] [--y y] [--step 2]
//
// --at moves the side cut across (units), --y the level cut up or down, --step is units to a pixel.
import process from 'node:process';
import { L } from '../../lib/plan.mjs';
import { png } from '../../lib/png.mjs';
import * as F from './field.mjs';
import { socket } from './masses.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const out = arg('--out', 'shots/world/rock-s/cut.png'), step = Number(arg('--step', 2)), atX = Number(arg('--at', 0)), atY = Number(arg('--y', L.CORE.at[1]));
const C = L.CORE.at, R = L.CORE.r;
F.setup({});

// Plan: x across, z down the image toward the visitor. Side: z across toward the visitor at the right, y up.
const X = [-560, 520], Z = [-280, 640], Y = [-640, 20];
const w1 = Math.round((X[1] - X[0]) / step), h1 = Math.round((Z[1] - Z[0]) / step);
const w2 = Math.round((Z[1] - Z[0]) / step), h2 = Math.round((Y[1] - Y[0]) / step);
const W = w1 + 12 + w2, H = Math.max(h1, h2), img = new Uint8Array(W * H * 3);
const put = (i, j, c) => { if (i < 0 || j < 0 || i >= W || j >= H) return; const k = (i + j * W) * 3; img[k] = c[0]; img[k + 1] = c[1]; img[k + 2] = c[2]; };
const shade = (d) => (d < 0 ? [176, 130, 92] : d < 3 ? [70, 50, 36] : [10, 8, 7]);

for (let j = 0; j < h1; j++) for (let i = 0; i < w1; i++) {
  const x = X[0] + (i + 0.5) * step, z = Z[0] + (j + 0.5) * step;
  put(i, j, shade(F.field(x, atY, z)));
}
for (let j = 0; j < h2; j++) for (let i = 0; i < w2; i++) {
  const z = Z[0] + (i + 0.5) * step, y = Y[1] - (j + 0.5) * step;
  put(w1 + 12 + i, j, shade(F.field(atX, y, z)));
}
// The ball, and the socket asked for: depth against the distance from the ball's middle as the visitor sees it.
const ring = (cx, cy, r, c) => { for (let a = 0; a < 720; a++) put(Math.round(cx + Math.cos(a / 114.6) * r), Math.round(cy + Math.sin(a / 114.6) * r), c); };
ring((C[0] - X[0]) / step, (C[2] - Z[0]) / step, R / step, [255, 220, 170]);
ring(w1 + 12 + (C[2] - Z[0]) / step, (Y[1] - C[1]) / step, R / step, [255, 220, 170]);
for (let s = -1; s <= 1; s += 2) for (let r = 0; r < 4.6 * R; r += step / 2) {
  const z = C[2] + socket(r / R) * R;
  put(Math.round((C[0] + s * r - X[0]) / step), Math.round((z - Z[0]) / step), [255, 120, 40]);
  put(Math.round(w1 + 12 + (z - Z[0]) / step), Math.round((Y[1] - (C[1] + s * r)) / step), [255, 120, 40]);
}
// The visitor's side: a line at the land's lip in the plan, and every 100 units a tick.
for (let x = X[0]; x < X[1]; x += step) put(Math.round((x - X[0]) / step), Math.round((L.lip(x) - Z[0]) / step), [120, 120, 120]);
for (let k = -500; k <= 600; k += 100) { for (let t = 0; t < 6; t++) { put(Math.round((k - X[0]) / step), t, [90, 90, 90]); put(Math.round(w1 + 12 + (k - Z[0]) / step), H - 1 - t, [90, 90, 90]); } }
png(out, W, H, img, 3);
console.log(`cut: ${out} (plan at y ${atY}, side at x ${atX}; ${step} units a pixel)`);
