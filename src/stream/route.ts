import { STREAM } from './config';

// Where the stream goes. It is planned, never simulated, because the layout needs it to hit exact places: down from
// above the page, parting on the middle of the title, round both of its ends, the left side landing on the card,
// running along its top and off its end. It is built from where the title and the card really are on the page.
// All positions are CSS pixels of the page, y down.

export interface Box { l: number; t: number; r: number; b: number }

export interface Branch {
  n: number;
  len: number;
  step: number;
  x: Float32Array;
  y: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
  // The lowest the route has been by each point, so a height on the page gives one distance along it.
  floor: Float32Array;
}

export interface Landing {
  kind: 'strike' | 'land' | 'lip';
  s: number;
  x: number;
  y: number;
  // The way things leave it: along the surface, both ways from a strike.
  out: number;
}

export interface Route {
  branches: [Branch, Branch];
  split: number;
  landings: Landing[];
  boxes: Box[];
  unit: number;
}

// A turn in the route: where two straight runs would meet, how early it leaves the first and how late it joins the
// second. Unequal reaches make a turn that is thrown, like something with weight running off an edge, not a drawn arc.
type Corner = [x: number, y: number, leave: number, join: number];

function trace(corners: Corner[]): number[] {
  const out: number[] = [corners[0][0], corners[0][1]];
  for (let i = 1; i < corners.length - 1; i++) {
    const [ax, ay] = [out[out.length - 2], out[out.length - 1]];
    const [bx, by, leave, join] = corners[i];
    const [cx, cy] = corners[i + 1];
    const la = Math.hypot(ax - bx, ay - by), lc = Math.hypot(cx - bx, cy - by);
    const ix = (bx - ax) / la, iy = (by - ay) / la, ox = (cx - bx) / lc, oy = (cy - by) / lc;
    const r0 = Math.min(leave, la * 0.92), r1 = Math.min(join, lc * 0.46);
    const p0x = bx - ix * r0, p0y = by - iy * r0, p3x = bx + ox * r1, p3y = by + oy * r1;
    const p1x = bx - ix * r0 * 0.42, p1y = by - iy * r0 * 0.42, p2x = bx + ox * r1 * 0.42, p2y = by + oy * r1 * 0.42;
    const steps = Math.max(8, Math.ceil((r0 + r1) / 2));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, m = 1 - t;
      out.push(m * m * m * p0x + 3 * m * m * t * p1x + 3 * m * t * t * p2x + t * t * t * p3x, m * m * m * p0y + 3 * m * m * t * p1y + 3 * m * t * t * p2y + t * t * t * p3y);
    }
  }
  const last = corners[corners.length - 1];
  out.push(last[0], last[1]);
  return out;
}

function outside(b: Box, x: number, y: number): number {
  const dx = Math.max(b.l - x, 0, x - b.r), dy = Math.max(b.t - y, 0, y - b.b);
  return Math.hypot(dx, dy);
}

const ease = (a: number, b: number, v: number) => { const k = Math.max(0, Math.min(1, (v - a) / (b - a))); return k * k * (3 - 2 * k); };

// Evenly spaced points along a line through pts, each pushed sideways by the sway where the page around it is open.
function branch(pts: number[], boxes: Box[], unit: number, phase: number, splitAt: number): Branch {
  const R = STREAM.route, step = R.sample * unit;
  const even = (p: number[]): number[] => {
    const out = [p[0], p[1]];
    let carry = 0;
    for (let i = 2; i < p.length; i += 2) {
      const ax = p[i - 2], ay = p[i - 1], seg = Math.hypot(p[i] - ax, p[i + 1] - ay);
      let at = step - carry;
      for (; at <= seg; at += step) out.push(ax + ((p[i] - ax) * at) / seg, ay + ((p[i + 1] - ay) * at) / seg);
      carry = seg - (at - step);
    }
    return out;
  };
  const base = even(pts);
  const swayed: number[] = [];
  for (let i = 0; i < base.length; i += 2) {
    const a = Math.max(0, i - 2), b = Math.min(base.length - 2, i + 2);
    const dx = base[b] - base[a], dy = base[b + 1] - base[a + 1], len = Math.hypot(dx, dy) || 1;
    const s = (i / 2) * step;
    let open = 1;
    for (const box of boxes) open = Math.min(open, ease(26 * unit, 170 * unit, outside(box, base[i], base[i + 1])));
    const own = phase * ease(splitAt, splitAt + 240 * unit, s);
    const sway = R.sway * unit * open * (Math.sin((Math.PI * 2 * s) / (R.swayLong * unit) + 0.6 + own) + 0.45 * Math.sin((Math.PI * 2 * s) / (R.swayShort * unit) + 2.1 + own * 1.7));
    swayed.push(base[i] + (-dy / len) * sway, base[i + 1] + (dx / len) * sway);
  }
  const p = even(swayed);
  const n = p.length / 2;
  const out: Branch = { n, len: (n - 1) * step, step, x: new Float32Array(n), y: new Float32Array(n), tx: new Float32Array(n), ty: new Float32Array(n), floor: new Float32Array(n) };
  for (let i = 0; i < n; i++) { out.x[i] = p[i * 2]; out.y[i] = p[i * 2 + 1]; }
  let low = -Infinity;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    const dx = out.x[b] - out.x[a], dy = out.y[b] - out.y[a], len = Math.hypot(dx, dy) || 1;
    out.tx[i] = dx / len;
    out.ty[i] = dy / len;
    low = Math.max(low, out.y[i]);
    out.floor[i] = low;
  }
  return out;
}

export function buildRoute(title: Box, card: Box, bottom: number, unit: number): Route {
  const R = STREAM.route, u = unit;
  const cx = (title.l + title.r) / 2;
  const top = title.t - R.above * u, shelf = card.t - R.above * u;
  const xl = title.l - R.beside * u, xr = title.r + R.beside * u, off = card.r + R.past * u;
  const T = R.turn;
  const start: Corner = [cx, R.start * u, 0, 0];
  const left = trace([start, [cx, top, T.part[0] * u, T.part[1] * u], [xl, top, T.left[0] * u, T.left[1] * u], [xl, shelf, T.land[0] * u, T.land[1] * u], [off, shelf, T.lip[0] * u, T.lip[1] * u], [off, bottom, 0, 0]]);
  const right = trace([start, [cx, top, T.part[0] * u, T.part[1] * u], [xr, top, T.right[0] * u, T.right[1] * u], [xr, bottom, 0, 0]]);
  const boxes = [title, card];
  const split = top - T.part[0] * u - R.start * u;
  const branches: [Branch, Branch] = [branch(left, boxes, u, 0, split), branch(right, boxes, u, 2.4, split)];
  const first = (b: Branch, test: (x: number, y: number) => boolean) => { for (let i = 0; i < b.n; i++) if (test(b.x[i], b.y[i])) return i * b.step; return b.len; };
  const L = branches[0];
  const landings: Landing[] = [
    { kind: 'strike', s: split + T.part[0] * u * 0.9, x: cx, y: title.t, out: 0 },
    { kind: 'land', s: first(L, (x, y) => y > shelf - T.land[0] * u * 0.3 && x < cx - (title.r - title.l) / 2), x: xl + T.land[1] * u * 0.2, y: card.t, out: 1 },
    { kind: 'lip', s: first(L, (x, y) => x > card.r && y > title.b), x: card.r, y: card.t, out: 1 },
  ];
  return { branches, split, landings, boxes, unit };
}

// The place this far along a branch: x, y, and the direction of travel there.
export function at(b: Branch, s: number, out: Float32Array): void {
  const f = Math.max(0, Math.min(b.n - 1.001, s / b.step));
  const i = Math.floor(f), t = f - i;
  out[0] = b.x[i] + (b.x[i + 1] - b.x[i]) * t;
  out[1] = b.y[i] + (b.y[i + 1] - b.y[i]) * t;
  out[2] = b.tx[i] + (b.tx[i + 1] - b.tx[i]) * t;
  out[3] = b.ty[i] + (b.ty[i + 1] - b.ty[i]) * t;
}

// How far along a branch the stream has run when it has come this far down the page.
export function reachFor(b: Branch, line: number): number {
  let lo = 0, hi = b.n - 1;
  if (b.floor[0] > line) return 0;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (b.floor[mid] <= line) lo = mid; else hi = mid - 1; }
  if (lo >= b.n - 1) return b.len;
  const a = b.floor[lo], c = b.floor[lo + 1];
  return (lo + (c > a ? Math.min(1, (line - a) / (c - a)) : 0)) * b.step;
}
