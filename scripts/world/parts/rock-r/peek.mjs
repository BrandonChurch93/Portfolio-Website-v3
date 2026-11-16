// Sculpt R: a quick look at the field without the page: a part of the picture, traced through the field from the
// visitor and shaded by its normal under a light from the core, a light from the upper left, or which block it is.
//
//   node scripts/world/parts/rock-r/peek.mjs x0,y0,x1,y1 <out.png> [--by 2] [--off beds,laminae,dents,steps] [--who]
import sharp from 'sharp';
import { L } from '../../lib/plan.mjs';
import { plan } from './blocks.mjs';
import * as H from './hollow.mjs';
import { CORE_PX, VIEW, J } from './relief.mjs';

const [box, out] = process.argv.slice(2);
const [x0, y0, x1, y1] = box.split(',').map(Number);
const opt = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const by = Number(opt('--by', 2)), off = (opt('--off', '') ?? '').split(',');
if (off.includes('beds')) H.BEDS.step = 0;
if (off.includes('laminae')) { H.LAMINAE.deep[0] = 0; H.LAMINAE.deep[1] = 0; H.LAMINAE.offset = 0; }
if (off.includes('dents')) for (const d of H.DENTS) d.deep = 0;
if (off.includes('steps')) for (const k of Object.keys(H.FAN)) H.FAN[k].drop = [0, 0];
const args = await plan({ draft: true });
Object.assign(args, { corePx: [...CORE_PX], view: [...VIEW], J, under: 3.5 });
H.setup(args);
const W = Math.round((x1 - x0) * by), Ht = Math.round((y1 - y0) * by), img = Buffer.alloc(W * Ht * 3);
const C = L.CORE.at, f = H.bare;
const grad = (p) => { const e = 0.3, g = [f(p[0] + e, p[1], p[2]) - f(p[0] - e, p[1], p[2]), f(p[0], p[1] + e, p[2]) - f(p[0], p[1] - e, p[2]), f(p[0], p[1], p[2] + e) - f(p[0], p[1], p[2] - e)], l = Math.hypot(...g) || 1; return g.map((v) => v / l); };
const who = process.argv.includes('--who');
for (let j = 0; j < Ht; j++) for (let i = 0; i < W; i++) {
  const px = x0 + (i + 0.5) / by, py = y0 + (j + 0.5) / by, A = L.fromPicture(px, py, 700), B = L.fromPicture(px, py, -320);
  const D = B.map((v, k) => v - A[k]), len = Math.hypot(...D), d = D.map((v) => v / len);
  let t = 0, hit = null;
  for (let s = 0; s < 600 && t < len; s++) { const p = A.map((v, k) => v + d[k] * t), v = f(...p); if (v < 0.05) { hit = p; break; } t += Math.max(0.15, v / 2.5); }
  let c = [0, 0, 0];
  if (hit) {
    const n = grad(hit);
    if (who) {
      let best = -1, bd = Infinity;
      args.blocks.forEach((b, k) => { const v = Math.abs(H.block(b, ...hit)); if (v < bd) { bd = v; best = k; } });
      const k = bd < 1 ? best : -1, hue = [Math.sin(k * 2.1) * 0.5 + 0.5, Math.sin(k * 2.1 + 2.1) * 0.5 + 0.5, Math.sin(k * 2.1 + 4.2) * 0.5 + 0.5];
      const sh = 0.35 + 0.65 * Math.max(0, n[0] * -0.4 + n[1] * 0.5 + n[2] * 0.77);
      c = k < 0 ? [60 * sh, 60 * sh, 60 * sh] : hue.map((v) => 255 * v * sh);
    } else {
      const toC = C.map((v, k) => v - hit[k]), dc = Math.hypot(...toC), lc = Math.max(0, (n[0] * toC[0] + n[1] * toC[1] + n[2] * toC[2]) / dc) * Math.min(1, 160 / dc);
      const lk = Math.max(0, n[0] * -0.45 + n[1] * 0.55 + n[2] * 0.7);
      c = [255 * Math.min(1, 0.85 * lc + 0.25 * lk), 255 * Math.min(1, 0.6 * lc + 0.25 * lk), 255 * Math.min(1, 0.35 * lc + 0.25 * lk)];
    }
  }
  img.set(c.map((v) => Math.round(v)), (i + j * W) * 3);
}
await sharp(img, { raw: { width: W, height: Ht, channels: 3 } }).png().toFile(out);
console.log(out);
