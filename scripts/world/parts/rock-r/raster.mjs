// Sculpt R, round 3: the measured slabs (measured/slabs.json) drawn back into the picture's pixels, so that the
// great blocks can take their outlines from the picture's own edges.
//
//   import { slabMap } from './raster.mjs'
//   const m = slabMap(json, 2)     // { W, H, by, slab: Int32Array (each sample's slab, or -1), json, great }
//
// by is how many samples to a pixel of the picture. Each piece is filled by its outline loops, even and odd.
import { Great } from './great.mjs';

export function slabMap(json, by = 2) {
  const W = 1376 * by, H = 768 * by, slab = new Int32Array(W * H).fill(-1);
  const g = new Great(json);
  const xs = [];
  g.pieces.forEach((p, f) => {
    const loops = g.loops[f].map((lp) => lp.ids.map((i) => g.pts[i]));
    if (!loops.length) return;
    let y0 = Infinity, y1 = -Infinity;
    for (const lp of loops) for (const [, y] of lp) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let row = Math.max(0, Math.floor(y0 * by)); row <= Math.min(H - 1, Math.ceil(y1 * by)); row++) {
      const y = (row + 0.5) / by;
      xs.length = 0;
      for (const lp of loops) for (let i = 0; i < lp.length; i++) {
        const [ax, ay] = lp[i], [bx, by2] = lp[(i + 1) % lp.length];
        if ((ay <= y) !== (by2 <= y)) xs.push(ax + ((y - ay) * (bx - ax)) / (by2 - ay));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let col = Math.max(0, Math.ceil(xs[k] * by - 0.5)); col <= Math.min(W - 1, Math.floor(xs[k + 1] * by - 0.5)); col++) slab[row * W + col] = p.slab;
      }
    }
  });
  return { W, H, by, slab, json, great: g };
}
