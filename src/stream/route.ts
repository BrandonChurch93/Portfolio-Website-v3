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
  // How much the route lies along an object here, 0 to 1, how much it is near one in the wider sense, and how
  // much the knots of shards are evened out.
  hold: Float32Array;
  calm: Float32Array;
  level: Float32Array;
  // How sharply it turns here, as one over the radius of the turn. Positive turns toward (-ty, tx).
  bend: Float32Array;
  // How far the other side of the stream is from this point of this side.
  apart: Float32Array;
  // How far out a shard can swing before it meets an object: toward (-ty, tx), and the other way. Evened out along
  // the route and never more than the true room, so a shard kept clear by it never changes place at once.
  roomA: Float32Array;
  roomB: Float32Array;
  // How far a shard has ridden by this point. It rides faster where there are to be fewer shards, so none has to
  // be taken out of the stream to thin them.
  ride: Float32Array;
  rideLen: number;
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

const nearest = (boxes: Box[], x: number, y: number) => boxes.reduce((d, b) => Math.min(d, outside(b, x, y)), Infinity);

// How far from a point, going one way, the nearest object begins. Negative when the point is inside one.
function room(boxes: Box[], x: number, y: number, dx: number, dy: number, cap: number): number {
  let best = cap;
  for (const b of boxes) {
    let t0 = -Infinity, t1 = Infinity;
    for (const [o, d, lo, hi] of [[x, dx, b.l, b.r], [y, dy, b.t, b.b]]) {
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) t0 = Infinity; continue; }
      const p = (lo - o) / d, q = (hi - o) / d;
      t0 = Math.max(t0, Math.min(p, q));
      t1 = Math.min(t1, Math.max(p, q));
    }
    if (t0 <= t1 && t1 >= 0) best = Math.min(best, t0);
  }
  return best;
}

const ease = (a: number, b: number, v: number) => { const k = Math.max(0, Math.min(1, (v - a) / (b - a))); return k * k * (3 - 2 * k); };

// Evenly spaced points along a line through pts, each pushed sideways by the sway where the page around it is open.
function branch(pts: number[], boxes: Box[], unit: number, phase: number, splitAt: number, narrow: number): Branch {
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
    const sway = R.sway * unit * narrow * open * (Math.sin((Math.PI * 2 * s) / (R.swayLong * unit) + 0.6 + own) + 0.45 * Math.sin((Math.PI * 2 * s) / (R.swayShort * unit) + 2.1 + own * 1.7));
    swayed.push(base[i] + (-dy / len) * sway, base[i + 1] + (dx / len) * sway);
  }
  const p = even(swayed);
  const n = p.length / 2;
  const blank = () => new Float32Array(n);
  const out: Branch = { n, len: (n - 1) * step, step, x: blank(), y: blank(), tx: blank(), ty: blank(), floor: blank(), hold: blank(), calm: blank(), level: blank(), bend: blank(), apart: blank().fill(1e6), roomA: blank(), roomB: blank(), ride: blank(), rideLen: 0 };
  for (let i = 0; i < n; i++) { out.x[i] = p[i * 2]; out.y[i] = p[i * 2 + 1]; }
  let low = -Infinity;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    const dx = out.x[b] - out.x[a], dy = out.y[b] - out.y[a], len = Math.hypot(dx, dy) || 1;
    out.tx[i] = dx / len;
    out.ty[i] = dy / len;
    low = Math.max(low, out.y[i]);
    out.floor[i] = low;
    const near = nearest(boxes, out.x[i], out.y[i]);
    out.hold[i] = 1 - ease(R.hold[0] * unit, R.hold[1] * unit, near);
    out.calm[i] = 1 - ease(R.hold[1] * unit, R.calm * unit, near);
  }
  // The true room to each side jumps where an object ends. Shards are kept clear by a version of it that changes
  // slowly: squeezed so that the first few units count for most, then the least of its neighbours, then their
  // average. Putting a shard back outside an object by its nearest face moved it at once at every corner.
  const M = R.room, cap = M.cap * unit, soft = M.soft * unit, wide = Math.max(1, Math.round((M.over * unit) / step));
  const squeeze = (v: number) => (v < 0 ? v / soft : v / (v + soft)), widen = (q: number) => (q < 0 ? q * soft : (soft * q) / (1 - q));
  const evened = (from: Float32Array, pick: (sum: number, v: number) => number, start: number, scale: number) => {
    const to = blank();
    for (let i = 0; i < n; i++) { let sum = start; for (let k = -wide; k <= wide; k++) sum = pick(sum, from[Math.max(0, Math.min(n - 1, i + k))]); to[i] = sum * scale; }
    return to;
  };
  const rawA = blank(), rawB = blank();
  for (let i = 0; i < n; i++) {
    const a = room(boxes, out.x[i], out.y[i], -out.ty[i], out.tx[i], cap), b = room(boxes, out.x[i], out.y[i], out.ty[i], -out.tx[i], cap);
    // Inside an object the nearer way out is the open side.
    rawA[i] = squeeze(a < 0 && b < 0 && a < b ? cap : a);
    rawB[i] = squeeze(a < 0 && b < 0 && b <= a ? cap : b);
  }
  [[rawA, out.roomA], [rawB, out.roomB]].forEach(([raw, to]) => to.set(evened(evened(raw, Math.min, Infinity, 1), (sum, v) => sum + v, 0, 1 / (2 * wide + 1)).map(widen)));
  const span = 4;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - span), b = Math.min(n - 1, i + span);
    out.bend[i] = ((out.tx[b] - out.tx[a]) * -out.ty[i] + (out.ty[b] - out.ty[a]) * out.tx[i]) / ((b - a) * step);
  }
  return out;
}

export function buildRoute(title: Box, card: Box, width: number, bottom: number, unit: number): Route {
  const R = STREAM.route, u = unit;
  const cx = (title.l + title.r) / 2;
  const top = title.t - R.above * u, shelf = card.t - R.above * u;
  // On a narrow screen the sides keep clear of the screen's edges, so the sheath of shards is never cut off.
  const xl = Math.max(title.l - R.beside * u, Math.min(title.l - 8 * u, R.edge * u)), xr = Math.min(title.r + R.beside * u, Math.max(title.r + 8 * u, width - R.edge * u)), off = card.r + R.past * u;
  const T = R.turn;
  const start: Corner = [cx, R.start * u, 0, 0];
  const left = trace([start, [cx, top, T.part[0] * u, T.part[1] * u], [xl, top, T.left[0] * u, T.left[1] * u], [xl, shelf, T.land[0] * u, T.land[1] * u], [off, shelf, T.lip[0] * u, T.lip[1] * u], [off, bottom, 0, 0]]);
  const right = trace([start, [cx, top, T.part[0] * u, T.part[1] * u], [xr, top, T.right[0] * u, T.right[1] * u], [xr, bottom, 0, 0]]);
  const boxes = [title, card];
  const split = top - T.part[0] * u - R.start * u;
  // A narrow screen has no room for the route to wander.
  const narrow = width < 600 ? 0.4 : 1;
  const branches: [Branch, Branch] = [branch(left, boxes, u, 0, split, narrow), branch(right, boxes, u, 2.4, split, narrow)];
  for (let i = 0, n = Math.min(branches[0].n, branches[1].n); i < n; i++) {
    const d = Math.hypot(branches[0].x[i] - branches[1].x[i], branches[0].y[i] - branches[1].y[i]);
    branches[0].apart[i] = branches[1].apart[i] = d;
  }
  // Fewer shards to a length of route means each rides through it faster: what goes in has to come out. Hiding a
  // share of them made them blink as they circled the core. The stem carries what both sides will, so each side's
  // shards ride it at twice the speed: hiding half of each until the parting made them appear there.
  const K = STREAM.shards;
  for (const b of branches) {
    const together = (i: number) => 0.5 + 0.5 * Math.min(1, b.apart[i] / (K.apart * u));
    const share = (i: number) => (1 - K.thin * Math.max(b.hold[i], Math.min(1, Math.abs(b.bend[i]) * K.hook * u) * b.calm[i])) * together(i);
    for (let i = 0; i < b.n; i++) {
      // Evened out over a longer stretch where they ride faster, so a shard takes as long over it.
      b.level[i] = Math.max(b.hold[i], 1 - ease(R.hold[1] * u, (R.hold[1] + (R.calm - R.hold[1]) / together(i)) * u, nearest(boxes, b.x[i], b.y[i])));
      if (i) b.ride[i] = b.ride[i - 1] + b.step * (share(i - 1) + share(i)) / 2;
    }
    b.rideLen = b.ride[b.n - 1];
  }
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

// How far a shard has ridden when it is this far along a branch.
export function riddenAt(b: Branch, s: number): number {
  const f = Math.max(0, Math.min(b.n - 1.001, s / b.step)), i = Math.floor(f);
  return b.ride[i] + (b.ride[i + 1] - b.ride[i]) * (f - i);
}

// How far along a branch a shard is when it has ridden this far.
export function along(b: Branch, ridden: number): number {
  let lo = 0, hi = b.n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (b.ride[mid] <= ridden) lo = mid; else hi = mid; }
  const a = b.ride[lo], c = b.ride[hi];
  return (lo + (c > a ? Math.max(0, Math.min(1, (ridden - a) / (c - a))) : 0)) * b.step;
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
