// Sculpt R, round 4: the picture's own faces as crisp breaks. The measured outlines (measured/slabs.json) follow the
// picture's raster and wander; here every run between two faces is made a chain of straight strokes meeting at
// angles, some long, some short chatter, so a face's edge reads as stone that broke, not paper that tore.
//
//   import { crisp } from './knap.mjs'
//   const json = crisp(raw)            // the measured outlines, each run straightened

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
