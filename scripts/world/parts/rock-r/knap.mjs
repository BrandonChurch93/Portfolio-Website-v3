// Sculpt R, round 4: the picture's own faces as crisp breaks. The measured outlines (measured/slabs.json) follow the
// picture's raster and wander; here every run between two faces is made a chain of straight strokes meeting at
// angles, some long, some short chatter, so a face's edge reads as stone that broke, not paper that tore. Then each
// of the picture's pieces (its smallest faces) is drawn back into the picture's pixels, so a block's face can be
// knapped along the picture's own lines.
//
//   import { crisp, pieceMap } from './knap.mjs'
//   const json = crisp(raw)            // the measured outlines, each run straightened
//   const m = pieceMap(json, 2)        // { W, H, by, piece: Int32Array (each sample's piece, or -1), great }
import { Great } from './great.mjs';

const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

// How far a straightened run may stray from the measured one, in the picture's pixels: each run its own, so some
// runs are long straight strokes and others keep their chatter.
export const CRISP = { least: 1.1, most: 4.2 };

function dp(pts, tol) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy);
    let far = -1, at = -1;
    for (let i = a + 1; i < b; i++) {
      const [x, y] = pts[i], d = l > 1e-9 ? Math.abs((x - ax) * dy - (y - ay) * dx) / l : Math.hypot(x - ax, y - ay);
      if (d > far) { far = d; at = i; }
    }
    if (far > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export function crisp(json) {
  const chains = json.chains.map((ch, c) => {
    const tol = CRISP.least + (CRISP.most - CRISP.least) * hash(c, 3) ** 1.6;
    let pts;
    if (ch.closed && ch.pts.length > 4) {
      // A closed run is split at its point furthest from its start, and each half straightened.
      const p = ch.pts, s = p[0];
      let far = 1, fd = -1;
      for (let i = 1; i < p.length - 1; i++) { const d = Math.hypot(p[i][0] - s[0], p[i][1] - s[1]); if (d > fd) { fd = d; far = i; } }
      const a = dp(p.slice(0, far + 1), tol), b = dp(p.slice(far), tol);
      pts = [...a, ...b.slice(1)];
      if (pts.length < 4) pts = p;
    } else pts = dp(ch.pts, tol);
    return { ...ch, pts };
  });
  return { ...json, chains };
}

// Each piece drawn into the picture's pixels, by its outline loops, even and odd.
export function pieceMap(json, by = 2) {
  const W = 1376 * by, H = 768 * by, piece = new Int32Array(W * H).fill(-1);
  const g = new Great(json), xs = [];
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
        for (let col = Math.max(0, Math.ceil(xs[k] * by - 0.5)); col <= Math.min(W - 1, Math.floor(xs[k + 1] * by - 0.5)); col++) piece[row * W + col] = f;
      }
    }
  });
  return { W, H, by, piece, great: g };
}
