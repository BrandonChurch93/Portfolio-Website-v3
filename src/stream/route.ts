import { STREAM } from './config';
import { hash } from './rand';

// Where the stream goes. It is planned, never simulated, because the layout needs it to hit exact places. Two routes
// are planned here, each from where things really are on the page. The test shot: down from above the page, parting
// on the middle of the title, round both of its ends, the left side landing on the card, running along its top and
// off its end. And the route through Work (routeThroughWork, below).
// All positions are CSS pixels of the page, y down.

export interface Box { l: number; t: number; r: number; b: number }
// A round post standing out of the page, seen end on.
export interface Post { x: number; y: number; r: number }
// A straight rail seen from the front: the line down its middle from its high end to its low end, and half its thickness.
export interface Rail { ax: number; ay: number; bx: number; by: number; half: number }
// Everything on the page the stream can meet.
export interface Solids { boxes: Box[]; posts: Post[]; rails: Rail[] }

export interface Branch {
  n: number;
  len: number;
  step: number;
  x: Float32Array;
  y: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
  // The way the route runs here as its riding shards take it: at a hard turn they are carried round over a longer
  // stretch than the turn itself, so none is thrown round it. Only the bolt has it. Without it they take tx and ty.
  fx?: Float32Array;
  fy?: Float32Array;
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

// A place where the stream meets something: it is struck when a leading end arrives, and throws a little while the
// stream lies there.
export interface Landing {
  // strike and land are on top of something. side is the upright side of a box, post the round of a post, rail the
  // top of a rail, and meet is where the two sides of the stream come together in the air.
  kind: 'strike' | 'land' | 'side' | 'post' | 'rail' | 'meet';
  // Which side's leading end reaches it.
  side: number;
  s: number;
  x: number;
  y: number;
  // The way things leave it along the surface: both ways (0), or mostly one way (1 or -1).
  out: number;
  // The way the surface faces, as an angle: straight up for a top.
  face: number;
  // How strong the contact is against a full strike, how many sparks and forks of arc it keeps while the stream lies
  // on it, and how many times longer than the test shot's it waits between the single shards it throws at rest.
  force: number;
  glow: number;
  arc: number;
  every: number;
  // Struck by the bolt, which comes straight in: it flashes brighter.
  bolt?: boolean;
}

export interface Route extends Solids {
  // The rails' finials, as straight solids: what is thrown bounces off them and they throw shadows, but the route
  // is not planned round them.
  fins: Rail[];
  branches: [Branch, Branch];
  split: number;
  // How far along each side the two meet again and go on as one. Infinity when they never do.
  join: [number, number];
  landings: Landing[];
  // The way the stream runs along the top of each box: 1 to the right, -1 to the left, 0 away from its middle.
  flows: number[];
  // How far below where it was thrown a thrown shard may fall before it goes. Infinity when nothing limits it.
  fall: number;
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

const beyond = (p: Post, x: number, y: number) => Math.max(0, Math.hypot(x - p.x, y - p.y) - p.r);

// A rail's own directions and length: along it, and square to it on the side that is up.
export function railFrame(r: Rail): { ex: number; ey: number; nx: number; ny: number; len: number } {
  const len = Math.hypot(r.bx - r.ax, r.by - r.ay) || 1, ex = (r.bx - r.ax) / len, ey = (r.by - r.ay) / len;
  const up = ex >= 0 ? 1 : -1;
  return { ex, ey, nx: ey * up, ny: -ex * up, len };
}

function off(r: Rail, x: number, y: number): number {
  const f = railFrame(r), k = Math.max(0, Math.min(f.len, (x - r.ax) * f.ex + (y - r.ay) * f.ey));
  return Math.max(0, Math.hypot(x - r.ax - f.ex * k, y - r.ay - f.ey * k) - r.half);
}

function nearest(S: Solids, x: number, y: number): number {
  let d = S.boxes.reduce((d, b) => Math.min(d, outside(b, x, y)), Infinity);
  for (const p of S.posts) d = Math.min(d, beyond(p, x, y));
  for (const r of S.rails) d = Math.min(d, off(r, x, y));
  return d;
}

// Where a line from o going d crosses into and out of the stretch from lo to hi, kept as the latest way in and the
// earliest way out so far.
function slab(o: number, d: number, lo: number, hi: number, t: [number, number]): void {
  if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) t[0] = Infinity; return; }
  const p = (lo - o) / d, q = (hi - o) / d;
  t[0] = Math.max(t[0], Math.min(p, q));
  t[1] = Math.min(t[1], Math.max(p, q));
}

// How far from a point, going one way, the nearest object begins. Negative when the point is inside one.
function room(S: Solids, x: number, y: number, dx: number, dy: number, cap: number): number {
  let best = cap;
  const t: [number, number] = [0, 0];
  for (const b of S.boxes) {
    t[0] = -Infinity; t[1] = Infinity;
    slab(x, dx, b.l, b.r, t);
    slab(y, dy, b.t, b.b, t);
    if (t[0] <= t[1] && t[1] >= 0) best = Math.min(best, t[0]);
  }
  for (const p of S.posts) {
    const ox = x - p.x, oy = y - p.y, half = ox * dx + oy * dy, under = half * half - (ox * ox + oy * oy - p.r * p.r);
    if (under >= 0 && -half + Math.sqrt(under) >= 0) best = Math.min(best, -half - Math.sqrt(under));
  }
  for (const r of S.rails) {
    const f = railFrame(r), ox = x - r.ax, oy = y - r.ay;
    t[0] = -Infinity; t[1] = Infinity;
    slab(ox * f.ex + oy * f.ey, dx * f.ex + dy * f.ey, -r.half, f.len + r.half, t);
    slab(ox * f.nx + oy * f.ny, dx * f.nx + dy * f.ny, -r.half, r.half, t);
    if (t[0] <= t[1] && t[1] >= 0) best = Math.min(best, t[0]);
  }
  return best;
}

const ease = (a: number, b: number, v: number) => { const k = Math.max(0, Math.min(1, (v - a) / (b - a))); return k * k * (3 - 2 * k); };

// Points a step apart along a line through p.
function even(p: number[], step: number): number[] {
  const out = [p[0], p[1]];
  let carry = 0;
  for (let i = 2; i < p.length; i += 2) {
    const ax = p[i - 2], ay = p[i - 1], seg = Math.hypot(p[i] - ax, p[i + 1] - ay);
    let at = step - carry;
    for (; at <= seg; at += step) out.push(ax + ((p[i] - ax) * at) / seg, ay + ((p[i + 1] - ay) * at) / seg);
    carry = seg - (at - step);
  }
  return out;
}

// Evenly spaced points along a line through pts, each pushed sideways by the sway where the page around it is open.
// still lists distances along the line where there is to be no sway at all, so two lines can be joined there.
// until is how far along the line the sway goes at all: past it the line is left as it was drawn.
function wander(pts: number[], S: Solids, unit: number, phase: number, splitAt: number, narrow: number, still: number[] = [], until = Infinity): number[] {
  const R = STREAM.route, step = R.sample * unit;
  const base = even(pts, step);
  const swayed: number[] = [];
  for (let i = 0; i < base.length; i += 2) {
    const a = Math.max(0, i - 2), b = Math.min(base.length - 2, i + 2);
    const dx = base[b] - base[a], dy = base[b + 1] - base[a + 1], len = Math.hypot(dx, dy) || 1;
    const s = (i / 2) * step;
    let open = 1;
    const clear = (d: number) => ease(26 * unit, 170 * unit, d);
    for (const box of S.boxes) open = Math.min(open, clear(outside(box, base[i], base[i + 1])));
    for (const post of S.posts) open = Math.min(open, clear(beyond(post, base[i], base[i + 1])));
    for (const rail of S.rails) open = Math.min(open, clear(off(rail, base[i], base[i + 1])));
    for (const at of still) open = Math.min(open, ease(0, 170 * unit, Math.abs(s - at)));
    if (s >= until) open = 0;
    const own = phase * ease(splitAt, splitAt + 240 * unit, s);
    const sway = R.sway * unit * narrow * open * (Math.sin((Math.PI * 2 * s) / (R.swayLong * unit) + 0.6 + own) + 0.45 * Math.sin((Math.PI * 2 * s) / (R.swayShort * unit) + 2.1 + own * 1.7));
    swayed.push(base[i] + (-dy / len) * sway, base[i + 1] + (dx / len) * sway);
  }
  return swayed;
}

// A side of the stream from the line it follows: evenly spaced points, and what the stream needs to know at each.
function measure(line: number[], S: Solids, unit: number, carry = 0, sampled = false): Branch {
  const R = STREAM.route, step = R.sample * unit;
  // A line that is already points a step apart is taken as it is: sampled again, two lines that mirror each other
  // would each cut their corners in places of their own.
  const p = sampled ? line : even(line, step);
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
    const near = nearest(S, out.x[i], out.y[i]);
    out.hold[i] = 1 - ease(R.hold[0] * unit, R.hold[1] * unit, near);
    out.calm[i] = 1 - ease(R.hold[1] * unit, R.calm * unit, near);
  }
  if (carry > 0) {
    const k = Math.max(1, Math.round((carry * unit) / step)), fx = blank(), fy = blank();
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0;
      for (let j = -k; j <= k; j++) { const w = 1 + Math.cos((Math.PI * j) / (k + 1)), at = Math.max(0, Math.min(n - 1, i + j)); x += out.tx[at] * w; y += out.ty[at] * w; }
      const l = Math.hypot(x, y) || 1;
      fx[i] = x / l; fy[i] = y / l;
    }
    out.fx = fx; out.fy = fy;
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
    const a = room(S, out.x[i], out.y[i], -out.ty[i], out.tx[i], cap), b = room(S, out.x[i], out.y[i], out.ty[i], -out.tx[i], cap);
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

// Fewer shards to a length of route means each rides through it faster: what goes in has to come out. Hiding a
// share of them made them blink as they circled the core. Where the two sides run as one, on the stem and after
// they meet, that stretch carries what both sides do, so each side's shards ride it at twice the speed: hiding half
// of each until the parting made them appear there.
function rides(branches: Branch[], S: Solids, u: number): void {
  const R = STREAM.route, K = STREAM.shards;
  for (const b of branches) {
    const together = (i: number) => 0.5 + 0.5 * Math.min(1, b.apart[i] / (K.apart * u));
    const share = (i: number) => (1 - K.thin * Math.max(b.hold[i], Math.min(1, Math.abs(b.bend[i]) * K.hook * u) * b.calm[i])) * together(i);
    for (let i = 0; i < b.n; i++) {
      // Evened out over a longer stretch where they ride faster, so a shard takes as long over it.
      b.level[i] = Math.max(b.hold[i], 1 - ease(R.hold[1] * u, (R.hold[1] + (R.calm - R.hold[1]) / together(i)) * u, nearest(S, b.x[i], b.y[i])));
      if (i) b.ride[i] = b.ride[i - 1] + b.step * (share(i - 1) + share(i)) / 2;
    }
    b.rideLen = b.ride[b.n - 1];
  }
}

// The way a top faces, as an angle.
export const UP = -Math.PI / 2;
// How far along a line its point nearest a place is.
function lengthTo(line: number[], x: number, y: number): number {
  let best = Infinity, at = 0, run = 0;
  for (let i = 0; i < line.length; i += 2) {
    if (i) run += Math.hypot(line[i] - line[i - 2], line[i + 1] - line[i - 1]);
    const d = Math.hypot(line[i] - x, line[i + 1] - y);
    if (d < best) { best = d; at = run; }
  }
  return at;
}

// A narrow screen has no room for the route to wander.
const roam = (width: number) => (width < 600 ? 0.4 : 1);
// Where a side comes down past the end of the title. On a narrow screen it keeps clear of the screen's edge, so the
// sheath of shards is never cut off.
const beside = (title: Box, width: number, u: number, way: number) => {
  const R = STREAM.route;
  return way < 0 ? Math.max(title.l - R.beside * u, Math.min(title.l - 8 * u, R.edge * u)) : Math.min(title.r + R.beside * u, Math.max(title.r + 8 * u, width - R.edge * u));
};
const first = (b: Branch, test: (x: number, y: number) => boolean, from = 0) => { for (let i = Math.round(from / b.step); i < b.n; i++) if (test(b.x[i], b.y[i])) return i * b.step; return b.len; };

export function buildRoute(title: Box, card: Box, width: number, bottom: number, unit: number): Route {
  const R = STREAM.route, u = unit;
  const cx = (title.l + title.r) / 2;
  const top = title.t - R.above * u, shelf = card.t - R.above * u;
  const xl = beside(title, width, u, -1), xr = beside(title, width, u, 1), off = card.r + R.past * u;
  const T = R.turn;
  const start: Corner = [cx, R.start * u, 0, 0];
  const left = trace([start, [cx, top, T.part[0] * u, T.part[1] * u], [xl, top, T.left[0] * u, T.left[1] * u], [xl, shelf, T.land[0] * u, T.land[1] * u], [off, shelf, T.lip[0] * u, T.lip[1] * u], [off, bottom, 0, 0]]);
  const right = trace([start, [cx, top, T.part[0] * u, T.part[1] * u], [xr, top, T.right[0] * u, T.right[1] * u], [xr, bottom, 0, 0]]);
  const S: Solids = { boxes: [title, card], posts: [], rails: [] };
  const split = top - T.part[0] * u - R.start * u;
  const narrow = roam(width);
  const branches: [Branch, Branch] = [measure(wander(left, S, u, 0, split, narrow), S, u), measure(wander(right, S, u, 2.4, split, narrow), S, u)];
  for (let i = 0, n = Math.min(branches[0].n, branches[1].n); i < n; i++) {
    const d = Math.hypot(branches[0].x[i] - branches[1].x[i], branches[0].y[i] - branches[1].y[i]);
    branches[0].apart[i] = branches[1].apart[i] = d;
  }
  rides(branches, S, u);
  const L = branches[0];
  const landings: Landing[] = [
    { kind: 'strike', side: 0, s: split + T.part[0] * u * 0.9, x: cx, y: title.t, out: 0, face: UP, force: 1, glow: 1, arc: 5, every: 1 },
    { kind: 'land', side: 0, s: first(L, (x, y) => y > shelf - T.land[0] * u * 0.3 && x < cx - (title.r - title.l) / 2), x: xl + T.land[1] * u * 0.2, y: card.t, out: 1, face: UP, force: 1, glow: 1, arc: 6, every: 1 },
  ];
  return { branches, split, join: [Infinity, Infinity], landings, ...S, fins: [], flows: [0, 1], fall: Infinity, unit };
}

// A finial's blade for a stone this wide on a rail this thick: its length and half its width, in halves of the
// rail's thickness.
export function bladeFor(stone: number, half: number): [number, number] {
  const F = STREAM.work.finial;
  return [Math.max(1.5, (stone * F.long) / half - F.collar), (stone * F.wide) / half];
}
// A finial as two straight solids, running out from an end of a rail: its collar, and its blade, which is taken as
// thinner than its widest part and shorter than its point.
function finial(x: number, y: number, ex: number, ey: number, half: number, blade: [number, number]): Rail[] {
  const c = STREAM.work.finial.collar * half, tip = c + blade[0] * half * 0.78;
  return [{ ax: x, ay: y, bx: x + ex * c, by: y + ey * c, half: half * 1.3 }, { ax: x + ex * c, ay: y + ey * c, bx: x + ex * tip, by: y + ey * tip, half: half * blade[1] * 0.45 }];
}

// What the Work section puts in the stream's way, as it lies on the page.
export interface WorkPlan {
  title: Box;
  bar: Box;
  // By rows, the left one first. A single column on a screen too narrow for two.
  cards: Box[];
  // The left one, then the right. None on a narrow screen.
  posts: Post[];
  // A box whose top corners are the rail's two high ends and whose bottom is the height of its low ends.
  rail: Box | null;
  button: Box | null;
  width: number;
  bottom: number;
  unit: number;
}

// The route through Work, the same on both sides, mirrored. Down the middle, parting on the title and round its
// ends as in the test shot. Onto the category bar, out along it and off its end. Onto the top of the first row's
// card, out along it and off its end. Down in a bow to the post, which turns it in. Against the side of the second
// row's card halfway down, and out again. Onto the high end of the rail and downhill along it. Off its low end
// beside the button, where the two sides meet and go on down as one. Each turn is at something: a surface it lands
// on, a face it meets, a slope, or the other side.
// On a screen too narrow for two columns it parts on the title, lands on the bar and falls past the cards.
// As a bolt (bolt = true, and only on a screen wide enough for two columns): the same stops in the same order, with
// no bows and no sway. It runs straight from each thing it strikes to the next, turns hard where it strikes, and on
// a long free run goes in short straight strokes of uneven length and reach, the last of them straight in.
export function routeThroughWork(P: WorkPlan): Route {
  const R = STREAM.route, W = STREAM.work, T = R.turn, u = P.unit;
  const cx = (P.title.l + P.title.r) / 2;
  const two = P.cards.length >= 4 && P.posts.length === 2 && !!P.rail && !!P.button;
  const half = W.rail.half * u;
  const top = P.title.t - R.above * u, shelf = P.bar.t - R.above * u;
  const tight = W.bolt.corner * u;
  const start: Corner = [cx, R.start * u, 0, 0], part: Corner = [cx, top, T.part[0] * u, T.part[1] * u];
  const rails: Rail[] = two ? [-1, 1].map((way) => ({ ax: way < 0 ? P.rail!.l : P.rail!.r, ay: P.rail!.t, bx: (way < 0 ? P.button!.l : P.button!.r) + way * W.rail.gap * u, by: P.rail!.b, half })) : [];
  const fins: Rail[] = rails.flatMap((r, i) => { const f = railFrame(r); return finial(r.ax, r.ay, -f.ex, -f.ey, half, bladeFor(P.posts[i].r * 2, half)); });
  const S: Solids = { boxes: two ? [P.title, P.bar, ...P.cards.slice(0, 4), P.button!] : [P.title, P.bar, ...P.cards], posts: two ? P.posts : [], rails };
  const flows = S.boxes.map((b) => (two && b === P.cards[0] ? -1 : two && b === P.cards[1] ? 1 : 0));
  const split = top - part[2] - R.start * u;
  const narrow = roam(P.width);
  // A place the stream meets something, before it is known how far along the side that is: the point of the route to
  // look for is kept with it.
  type Contact = readonly [force: number, glow: number, arc: number, every: number];
  type Mark = { landing: Omit<Landing, 's' | 'side'>; at: [number, number] };
  const C: Record<string, Contact> = W.contact;
  const met = (kind: Landing['kind'], x: number, y: number, out: number, face: number, c: Contact): Omit<Landing, 's' | 'side'> => ({ kind, x, y, out, face, force: c[0], glow: c[1], arc: c[2], every: c[3] });
  const mark = (kind: Landing['kind'], x: number, y: number, out: number, face: number, c: Contact, at: [number, number]): Mark => ({ landing: met(kind, x, y, out, face, c), at });

  // A free run of the bolt from one place to another: turns added to the line between the two, each standing off
  // it to one side, unevenly far apart and unevenly far out. None is near either end, so it leaves the first place
  // straight and comes straight in to the second, and none is near anything it could cut across.
  // into: which side of the run the last stroke must start from, when the run ends on a top. From that side the
  // last stroke comes in flatter than the run and the stream keeps its pace along the top. From the other it would
  // come straight down on it and turn square, which is a wire's turn.
  const strokes = (corners: Corner[], a: [number, number], b: [number, number], seed: number, into = 0) => {
    const B = W.bolt, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ex = dx / L, ey = dy / L;
    let d = (B.lead[0] + (B.knot[0] * hash(0, seed, 3)) * 0.6) * u, last = hash(0, seed, 4) < 0.5 ? -1 : 1;
    for (let k = 1; d < L - B.lead[1] * u; k++) {
      const far = 0.4 + 0.6 * hash(k, seed, 1), over = hash(k, seed, 2) < B.flip ? -Math.sign(last) : Math.sign(last);
      let o = over * far;
      const at = (v: number): [number, number] => [a[0] + ex * d - ey * v * B.reach * u, a[1] + ey * d + ex * v * B.reach * u];
      const ends = into !== 0 && d + B.knot[0] * u >= L - B.lead[1] * u;
      if (ends) o = into * Math.max(0.55, far);
      let p = at(o);
      if (nearest(S, p[0], p[1]) < B.clear * u) { o = ends ? o / 2 : -o; p = at(o); }
      if (nearest(S, p[0], p[1]) < B.clear * u) { o = 0; p = at(0); }
      corners.push([p[0], p[1], tight, tight]);
      if (o) last = o;
      d += (B.knot[0] + (B.knot[1] - B.knot[0]) * hash(k, seed, 5) ** 1.4) * u;
    }
  };

  // A side where the page has no stones and no rail: down past the end of the title, onto the bar, and off its end.
  const short = (way: number) => {
    const hook = way < 0 ? T.left : T.right, K = W.bar;
    const xh = beside(P.title, P.width, u, way);
    const corners: Corner[] = [start, part, [xh, top, hook[0] * u, hook[1] * u]];
    const marks: Mark[] = [];
    const end = way < 0 ? P.bar.l : P.bar.r;
    let lip = xh;
    // On a narrow screen the fall can come down past the end of the bar, or on its very corner. Then it is not
    // landed on: a landing drawn in the air beside it would be a turn with no cause.
    if ((xh - end) * -way >= K.least * 0.5 * u) {
      // The two sides lean a little differently, so they never land in the same instant.
      const lean = K.lean * u * (way < 0 ? 0.8 : 1.2);
      const x = way < 0 ? Math.max(xh - lean, Math.min(xh, end + K.least * u)) : Math.min(xh + lean, Math.max(xh, end - K.least * u));
      lip = end + way * K.past * u;
      corners.push([x, shelf, K.land[0] * u, K.land[1] * u], [lip, shelf, (K.past + K.early) * u, K.fall * u]);
      marks.push(mark('land', x + way * K.land[1] * u * 0.2, P.bar.t, way, UP, C.bar, [x + way * K.land[1] * u * 0.4, shelf]));
    }
    corners.push([lip, P.bottom, 0, 0]);
    return { line: trace(corners), marks };
  };

  // The whole route, where the page has its stones and its rail. One side is planned, the right, and the left is
  // that side in a mirror: where the stream goes is the layout, and the layout is the same on both sides.
  // Down to the word, along its top, over its end and down onto the bar it sways as it falls, as the stream does
  // everywhere it falls free. From where it lands on the bar to where the two sides meet under the button it is a
  // bolt: the same stops, each struck straight on and left straight. Below the meeting it falls free again.
  const whole = () => {
    const B = W.bolt, K = W.bar, past = B.past * u, seed = 29, way = 1;
    const xh = beside(P.title, P.width, u, way), barEnd = P.bar.r;
    const corners: Corner[] = [start, part, [xh, top, T.right[0] * u, T.right[1] * u]];
    const marks: Mark[] = [];
    // Onto the bar it comes down leaning the way it is to run, never nearer the end than it needs to run at all.
    const landX = Math.min(xh + K.lean * u * 1.2, Math.max(xh, barEnd - K.least * u));
    corners.push([landX, shelf, K.land[0] * u, K.land[1] * u]);
    marks.push(mark('land', landX + K.land[1] * u * 0.2, P.bar.t, way, UP, C.bar, [landX + K.land[1] * u * 0.4, shelf]));
    // It strikes harder than a stream that has spent itself on a bow: it has come straight in.
    const full = (c: Contact): Contact => [c[0] * B.force, c[1], c[2], c[3]];
    const struckFull = (m: Mark): Mark => ({ ...m, landing: { ...m.landing, bolt: true } });
    const turn = (x: number, y: number) => corners.push([x, y, tight, tight]);
    // Along a top to its end, and hard down off the corner. It lands the least it may from that end, having come
    // down to it on a slant from the last end, so it strikes the top already going the way it will run.
    const onto = (box: Box, from: [number, number], least: number, c: Contact, n: number) => {
      const level = box.t - R.above * u;
      const x = box.r - least - from[0] > 10 * u ? box.r - least : from[0] + 10 * u;
      strokes(corners, from, [x, level], seed + n, way);
      turn(x, level);
      marks.push(struckFull(mark('land', x, box.t, way, UP, c, [x, level])));
      turn(box.r + past, level);
      return box.r + past;
    };
    turn(barEnd + past, shelf);
    const A = P.cards[1], Bx = P.cards[3], post = P.posts[1], rail = rails[1];
    const cardLip = onto(A, [barEnd + past, shelf], W.card.least * u, full(C.card), 6);
    const reach = post.r + R.above * u, cos = Math.cos(W.post.at), sin = Math.sin(W.post.at);
    const hit: [number, number] = [post.x - reach * cos, post.y - reach * sin];
    strokes(corners, [cardLip, A.t - R.above * u], hit, seed);
    turn(hit[0], hit[1]);
    marks.push(struckFull(mark('post', post.x - post.r * cos, post.y - post.r * sin, 0, Math.atan2(-sin, -cos), full(C.post), hit)));
    const struck: [number, number] = [Bx.r + R.above * u, Bx.t + (Bx.b - Bx.t) * W.side.at];
    strokes(corners, hit, struck, seed + 1);
    turn(struck[0], struck[1]);
    // What a strike on an upright side throws goes mostly up and out, so that it rises, falls and has somewhere to
    // land. Thrown evenly up and down, half of it only fell away.
    marks.push(struckFull(mark('side', Bx.r, struck[1], -1, 0, full(C.side), struck)));
    const f = railFrame(rail), lift = rail.half + R.above * u;
    const on = (d: number): [number, number] => [rail.ax + f.ex * d + f.nx * lift, rail.ay + f.ey * d + f.ny * lift];
    const land = on(W.rail.in * u), low = on(f.len + W.rail.over * u);
    strokes(corners, struck, land, seed + 2);
    turn(land[0], land[1]);
    marks.push(mark('rail', rail.ax + f.ex * W.rail.in * u + f.nx * rail.half, rail.ay + f.ey * W.rail.in * u + f.ny * rail.half, -1, Math.atan2(f.ny, f.nx), C.rail, land));
    turn(low[0], low[1]);
    // The two sides meet under the middle of the button. The word above is not quite on the page's middle line: its
    // letters are not the same shape at their two ends.
    const mid = (P.button!.l + P.button!.r) / 2;
    const my = low[1] + Math.abs(mid - low[0]) * W.meet.slope;
    corners.push([mid, my, tight, tight], [mid, P.bottom, 0, 0]);
    const drawn = trace(corners);
    // It ends where it has turned straight down, on the middle line. The rest is carried by both sides as one.
    drawn.length -= 2;
    const bar = lengthTo(drawn, landX, shelf), hook = lengthTo(drawn, xh, top);
    // No sway where the two sides part, so that each can be the other in a mirror from there, and none past the
    // landing on the bar, where the bolt begins.
    const right = wander(drawn, S, u, 2.4, split, narrow, [split], bar);
    // The left side. Until they part the two are one line. Then the left is the right turned over: about the
    // middle of the word while it is on the word, and about the middle of the page from the bar down, where
    // everything it meets stands. Between the two it is on its way down to the bar, with nothing beside it.
    const left: number[] = [], step = R.sample * u;
    for (let i = 0; i < right.length; i += 2) {
      const s = (i / 2) * step, axis = cx + (mid - cx) * ease(hook, bar, s);
      left.push(s <= split ? right[i] : 2 * axis - right[i], right[i + 1]);
    }
    const flip = (m: Mark): Mark => ({ landing: { ...m.landing, x: 2 * mid - m.landing.x, out: -m.landing.out, face: Math.PI - m.landing.face }, at: [2 * mid - m.at[0], m.at[1]] });
    return { lines: [left, right], marks: [marks.map(flip), marks], bar, mid, end: right[right.length - 1] };
  };

  const step = R.sample * u;
  const join: [number, number] = [Infinity, Infinity];
  let lines: number[][], marks: Mark[][], bolt: [number, number] | null = null;
  if (two) {
    const w = whole();
    const tail = wander([w.mid, w.end, w.mid, P.bottom], S, u, 0, 0, narrow, [0]);
    marks = w.marks;
    lines = w.lines.map((line, b) => { join[b] = (line.length / 2 - 1) * step; return [...line, ...tail.slice(2)]; });
    bolt = [w.bar, Math.min(join[0], join[1])];
  } else {
    const sides = [short(-1), short(1)];
    marks = sides.map((s) => s.marks);
    lines = sides.map((s, b) => wander(s.line, S, u, b * 2.4, split, narrow));
  }
  const branches = lines.map((line) => measure(line, S, u, bolt ? W.bolt.carry : 0, !!bolt)) as [Branch, Branch];
  for (const b of branches) {
    const j = join[branches.indexOf(b)];
    for (let i = 0; i < b.n; i++) { const s = i * b.step; b.apart[i] = s <= split || s >= j ? 0 : 2 * Math.abs(b.x[i] - cx); }
    // Only on the bolt are the riding shards carried round a turn over a longer stretch. Where the stream falls
    // free they turn with it, as they did.
    if (bolt && b.fx && b.fy) for (let i = 0; i < b.n; i++) {
      const s = i * b.step, k = ease(bolt[0] - 60 * u, bolt[0] + 20 * u, s) * (1 - ease(bolt[1] - 20 * u, bolt[1] + 60 * u, s));
      const x = b.tx[i] + (b.fx[i] - b.tx[i]) * k, y = b.ty[i] + (b.fy[i] - b.ty[i]) * k, l = Math.hypot(x, y) || 1;
      b.fx[i] = x / l; b.fy[i] = y / l;
    }
  }
  rides(branches, S, u);

  const landings: Landing[] = [{ ...met('strike', cx, P.title.t, 0, UP, C.title), side: 0, s: split + T.part[0] * u * 0.9 }];
  marks.forEach((own, b) => {
    const br = branches[b];
    let from = split;
    for (const m of own) {
      // The point of the side nearest the place it meets the thing, looking only past the last one found.
      let best = Infinity, at = from;
      for (let i = Math.round(from / br.step); i < br.n; i++) { const d = Math.hypot(br.x[i] - m.at[0], br.y[i] - m.at[1]); if (d < best) { best = d; at = i * br.step; } }
      from = at;
      landings.push({ ...m.landing, side: b, s: at });
    }
  });
  if (two) {
    // Where the two sides come together: the first point at which they are as good as one.
    const br = branches[0], mid = (P.button!.l + P.button!.r) / 2, s = first(br, (x) => Math.abs(x - mid) < W.meet.near * u, landings.filter((l) => l.side === 0).at(-1)!.s + 40 * u);
    landings.push({ ...met('meet', mid, br.y[Math.min(br.n - 1, Math.round(s / br.step))], 0, -UP, C.meet), side: 0, s });
  }
  return { branches, split, join, landings, ...S, fins, flows, fall: W.fall * u, unit: u };
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
