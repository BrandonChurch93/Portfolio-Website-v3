import { palette } from '../config/palette';
import { hash } from '../stream/rand';

// A sketch of what the stream does when the category changes, for judging order and timing only. The Work section is
// drawn as a wireframe in design units (one unit is a CSS pixel on a desktop), a line stands in for the stream, and
// the cards are stand ins. Everything that happens is a replay of the presses up to a time, so a frame can be frozen.

export const STAGE = { w: 1460, h: 1820 };
export const BAR = { l: 370, r: 1090, t: 214, b: 270 };
export const CATEGORIES = ['Software', 'Games', '3D art', 'Photography'];
export type Mode = 'surge' | 'together' | 'none';
export interface Press { t: number; cat: number; mode: Mode; T: number }
export interface Fonts { display: string; mono: string }

const CX = STAGE.w / 2;
const CARD = { w: 460, h: 510, r: 18 };
const CARDS = [{ x: 250, y: 386 }, { x: 750, y: 386 }, { x: 250, y: 970 }, { x: 750, y: 970 }];
const STONE = { x: 93, y: 904, r: 41 };
const RAIL = { ax: 113, ay: 1590, bx: 611, by: 1657 };
const BUTTON = { l: 638, r: 822, t: 1548, b: 1594 };
const STEP = 4;
const H = 1 / 120;
// A card's change: the old one lets go and is gone by out, the new one comes up from below between in0 and strike,
// and the stream strikes it as it seats.
const SWAP = { out: 0.09, in0: 0.05, strike: 0.18, rise: 26, drop: 16 };

const NAMES = [
  ['Proactive UI for AI Glasses', 'Ask the Claude Docs', 'Design System Extractor', 'Generative UI for GitHub'],
  ['Game · stand in 01', 'Game · stand in 02', 'Game · stand in 03', 'Game · stand in 04'],
  ['3D piece · stand in 01', '3D piece · stand in 02', '3D piece · stand in 03', '3D piece · stand in 04'],
  ['Photo set · stand in 01', 'Photo set · stand in 02', 'Photo set · stand in 03', 'Photo set · stand in 04'],
];
const KINDS = [['UX STUDY', 'RAG CHATBOT', 'MCP SERVER & CLI', 'AGENT-COMPOSED'], ['GAME', 'GAME', 'GAME', 'GAME'], ['3D ART', '3D ART', '3D ART', '3D ART'], ['PHOTOGRAPHY', 'PHOTOGRAPHY', 'PHOTOGRAPHY', 'PHOTOGRAPHY']];
const HUES = [[205, 42, 24, 216], [282, 332, 150, 196], [172, 14, 262, 96], [356, 44, 190, 304]];

interface Path { x: Float32Array; y: Float32Array; nx: Float32Array; ny: Float32Array; n: number }
type Corner = [x: number, y: number, radius: number];

function trace(pts: Corner[]): Path {
  const raw: number[] = [pts[0][0], pts[0][1]];
  let px = pts[0][0], py = pts[0][1];
  for (let i = 1; i < pts.length - 1; i++) {
    const [bx, by, r] = pts[i], [cx, cy] = pts[i + 1];
    const la = Math.hypot(bx - px, by - py), lc = Math.hypot(cx - bx, cy - by);
    const ra = Math.min(r, la * 0.9), rc = Math.min(r, lc * 0.45);
    const ax = bx - ((bx - px) / la) * ra, ay = by - ((by - py) / la) * ra;
    const ex = bx + ((cx - bx) / lc) * rc, ey = by + ((cy - by) / lc) * rc;
    raw.push(ax, ay);
    for (let k = 1; k <= 10; k++) { const u = k / 10, v = 1 - u; raw.push(v * v * ax + 2 * v * u * bx + u * u * ex, v * v * ay + 2 * v * u * by + u * u * ey); }
    px = ex; py = ey;
  }
  raw.push(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  const xs: number[] = [raw[0]], ys: number[] = [raw[1]];
  let need = STEP;
  for (let i = 2; i < raw.length; i += 2) {
    let ax = raw[i - 2], ay = raw[i - 1];
    const bx = raw[i], by = raw[i + 1];
    let left = Math.hypot(bx - ax, by - ay);
    while (left >= need) {
      const k = need / left;
      ax += (bx - ax) * k; ay += (by - ay) * k;
      xs.push(ax); ys.push(ay);
      left -= need; need = STEP;
    }
    need -= left;
  }
  const n = xs.length, p: Path = { x: Float32Array.from(xs), y: Float32Array.from(ys), nx: new Float32Array(n), ny: new Float32Array(n), n };
  normals(p);
  return p;
}

function normals(p: Path): void {
  for (let i = 0; i < p.n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(p.n - 1, i + 1);
    const tx = p.x[b] - p.x[a], ty = p.y[b] - p.y[a], l = Math.hypot(tx, ty) || 1;
    p.nx[i] = -ty / l; p.ny[i] = tx / l;
  }
}

const mirror = (p: Path): Path => ({ x: p.x.map((v) => STAGE.w - v), y: p.y, nx: p.nx.map((v) => -v), ny: p.ny, n: p.n });
function nearest(p: Path, x: number, y: number): number {
  let best = 0, d = Infinity;
  for (let i = 0; i < p.n; i++) { const q = (p.x[i] - x) ** 2 + (p.y[i] - y) ** 2; if (q < d) { d = q; best = i; } }
  return best;
}

// The left side of the route, stop by stop, each corner with how round it is. The right side is its mirror.
// plain is the surge study's own line. The others are the path study's: the page's route as it is now, redrawn by
// hand. A route of straight runs and hard corners. The same corners with the wander of a free run put back, away
// from every strike. And the same corners with a wander that is made of short straight strokes.
export type PathName = 'plain' | 'now' | 'ricochet' | 'swing' | 'bolt';
const END = STAGE.h + 40;
const HARD: Corner[] = [
  [CX, -60, 0], [CX, 49, 5], [506, 49, 5], [418, 211, 5], [366, 211, 5], [322, 383, 5], [246, 383, 5],
  [128, 876, 5], [247, 1174, 5], [150, 1592, 5], [611, 1654, 5], [CX, 1706, 5], [CX, END, 0],
];
const CORNERS: Record<PathName, Corner[]> = {
  plain: [
    [CX, -60, 0], [CX, 49, 30], [506, 49, 40], [452, 112, 50], [418, 211, 22], [366, 211, 26], [336, 300, 60],
    [322, 383, 24], [246, 383, 30], [150, 640, 120], [128, 876, 12], [247, 1174, 8], [196, 1252, 50],
    [150, 1592, 26], [611, 1654, 40], [CX, 1706, 30], [CX, END, 0],
  ],
  now: [
    [CX, -60, 0], [CX, 49, 34], [506, 49, 46], [450, 120, 70], [418, 211, 26], [366, 211, 34], [334, 300, 70],
    [322, 383, 28], [246, 383, 44], [150, 600, 160], [128, 876, 14], [247, 1174, 10], [190, 1262, 70],
    [150, 1592, 30], [611, 1654, 46], [CX, 1706, 34], [CX, END, 0],
  ],
  ricochet: HARD,
  swing: HARD,
  bolt: HARD,
};
// How far a free run wanders to each side, how far from anything it touches the wander begins and is whole, and
// whether it wanders in curves or in short straight strokes.
const SWAY: Record<PathName, [amp: number, from: number, full: number, strokes: boolean]> = {
  plain: [0, 0, 1, false], now: [15, 30, 120, false], ricochet: [0, 0, 1, false], swing: [15, 80, 220, false], bolt: [17, 60, 150, true],
};
const KNOTS: number[] = [0];
while (KNOTS[KNOTS.length - 1] < 6000) KNOTS.push(KNOTS[KNOTS.length - 1] + 50 + 80 * hash(KNOTS.length, 9));
// A wander of straight strokes: it changes side at every knot, by an uneven amount, and the knots are unevenly spaced.
function strokes(run: number): number {
  let j = 0;
  while (KNOTS[j + 1] < run) j++;
  const at = (k: number) => (k % 2 ? 1 : -1) * (0.35 + 0.65 * hash(k, 5));
  return at(j) + (at(j + 1) - at(j)) * ((run - KNOTS[j]) / (KNOTS[j + 1] - KNOTS[j]));
}
const MARKS = {
  title: [CX, 49], titleEnd: [506, 49], barIn: [418, 211], bar: [392, 211], barEnd: [366, 211], top0: [322, 383], top1: [246, 383],
  stone: [128, 876], side: [247, 1174], rail: [150, 1592], meet: [CX, 1706],
} as const;
type Marks = Record<keyof typeof MARKS, number>;
interface Built { sides: [Path, Path]; at: Marks; top: number; floor: Float32Array }

function build(name: PathName): Built {
  const p = trace(CORNERS[name]);
  const at = Object.fromEntries(Object.entries(MARKS).map(([k, [x, y]]) => [k, nearest(p, x, y)])) as Marks;
  const [amp, from, full, straight] = SWAY[name];
  if (amp) {
    const held = [[at.title, at.titleEnd], [at.barIn, at.barEnd], [at.top0, at.top1], [at.stone, at.stone], [at.side, at.side], [at.rail, at.meet]];
    const x = p.x.slice(), y = p.y.slice();
    for (let i = 0; i < p.n; i++) {
      let d = Infinity;
      for (const [a, b] of held) d = Math.min(d, i < a ? a - i : i > b ? i - b : 0);
      const k = Math.max(0, Math.min(1, (d * STEP - from) / (full - from))), m = k * k * (3 - 2 * k), run = i * STEP;
      const w = amp * m * (straight ? strokes(run) : 0.6 * Math.sin((run / 640) * 6.283 + 1.3) + 0.4 * Math.sin((run / 270) * 6.283 + 4.1));
      x[i] += p.nx[i] * w; y[i] += p.ny[i] * w;
    }
    p.x = x; p.y = y;
    normals(p);
  }
  // The lowest the route has been by each point: the leading end is as far along as the scroll's line has got past.
  const floor = new Float32Array(p.n);
  let low = -Infinity;
  for (let i = 0; i < p.n; i++) { low = Math.max(low, p.y[i]); floor[i] = low; }
  return { sides: [p, mirror(p)], at, top: (at.top0 + at.top1) >> 1, floor };
}

interface Bit { x: number; y: number; vx: number; vy: number; rot: number; spin: number; size: number; born: number; life: number; kind: number; rest: number }
interface CardState { from: number; to: number; at: number; struck: number; pending: boolean }
interface Surge { side: number; t0: number; T: number; mode: Mode; cat: number; near: number; fired: number }

export class SurgeSim {
  presses: Press[] = [];
  t = 0;
  cat = 0;
  private cards: CardState[] = [];
  private surges: Surge[] = [];
  private bits: Bit[] = [];
  private count = 0;
  private done = 0;
  private stone = [-9, -9];
  private knock = -9;
  private met = -9;
  private quiet = 0;
  private sides!: [Path, Path];
  private at!: Marks;
  private top = 0;
  private n = 0;
  private floor!: Float32Array;
  private ghost: [Path, Path] | null = null;
  private head = 0;
  // The scroll's line, in units down the stage: the stream is drawn as far as its leading end has run to keep up
  // with it. Null draws the whole stream.
  line: number | null = null;
  // The leading end runs ahead of the scroll over the last stretch before a strike, and lands it.
  lunge = false;

  constructor(path: PathName = 'plain') { this.setPath(path); this.reset(); }

  setPath(name: PathName, ghost = false): void {
    const b = build(name);
    this.sides = b.sides; this.at = b.at; this.top = b.top; this.floor = b.floor; this.n = b.sides[0].n;
    this.sx = [new Float32Array(this.n), new Float32Array(this.n)];
    this.sy = [new Float32Array(this.n), new Float32Array(this.n)];
    this.ghost = ghost && name !== 'now' ? build('now').sides : null;
    this.head = Math.min(this.head, this.n - 1);
  }

  // Back to the top, for running the stream down again.
  rewind(): void {
    this.head = 0; this.bits = [];
    for (const c of this.cards) c.struck = -9;
  }

  private reset(): void {
    this.t = 0; this.cat = 0; this.count = 0; this.done = 0; this.quiet = 0; this.head = 0;
    this.cards = CARDS.map(() => ({ from: 0, to: 0, at: -9, struck: -9, pending: false }));
    this.surges = []; this.bits = []; this.stone = [-9, -9]; this.knock = -9; this.met = -9;
  }

  press(p: Press): void {
    this.presses.push(p);
    this.presses.sort((a, b) => a.t - b.t);
    if (p.t < this.t) this.reset();
  }

  // True while anything is still moving, so the page can stop drawing when nothing is.
  busy(): boolean { return this.t < this.quiet; }

  advance(to: number): void {
    if (to < this.t) this.reset();
    while (this.t + H <= to) {
      this.t += H;
      while (this.done < this.presses.length && this.presses[this.done].t <= this.t) this.begin(this.presses[this.done++]);
      this.step();
    }
  }

  private rnd(): number { return hash(this.count++, 77); }

  private begin(p: Press): void {
    if (p.cat === this.cat) return;
    this.cat = p.cat;
    this.quiet = this.t + p.T + 3.4;
    if (p.mode === 'none') {
      for (const c of this.cards) { c.from = c.to = p.cat; c.at = -9; c.pending = false; }
      return;
    }
    const x = BAR.l + ((p.cat + 0.5) * (BAR.r - BAR.l)) / 4;
    for (let side = 0; side < 2; side++) {
      const far = Math.abs(x - this.sides[side].x[this.at.bar]) / (BAR.r - BAR.l);
      this.surges.push({ side, t0: this.t + far * 0.14 * (p.mode === 'surge' ? p.T : 0.3), T: p.T, mode: p.mode, cat: p.cat, near: 1 - far, fired: 0 });
    }
  }

  private letGo(i: number, cat: number): void {
    const c = this.cards[i];
    c.from = c.to; c.to = cat; c.at = this.t; c.pending = true;
  }

  private burst(x: number, y: number, way: number, spread: number, shards: number, sparks: number, power: number): void {
    for (let i = 0; i < shards + sparks; i++) {
      const spark = i >= shards;
      const a = way + (this.rnd() - 0.5) * 2 * spread, v = (spark ? 120 + this.rnd() * 420 : 140 + this.rnd() * 380) * power;
      this.bits.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: this.rnd() * 6.28, spin: (this.rnd() - 0.5) * 16, size: spark ? 1 : 3.5 + this.rnd() ** 2 * 9,
        born: this.t, life: spark ? 0.22 + this.rnd() * 0.7 : 1.3 + this.rnd() * 1.1, kind: spark ? 2 : this.rnd() < 0.45 ? 1 : 0, rest: -1,
      });
    }
  }

  private strike(i: number): void {
    const side = i % 2, p = this.sides[side], out = side === 0 ? Math.PI : 0;
    this.cards[i].struck = this.t;
    if (i < 2) this.burst(p.x[this.top], p.y[this.top] - 4, -Math.PI / 2 + (side === 0 ? -0.35 : 0.35), 1.1, 24, 22, 1);
    else this.burst(p.x[this.at.side] + (side === 0 ? -4 : 4), p.y[this.at.side], out + (side === 0 ? 0.6 : -0.6), 0.9, 28, 24, 1);
  }

  // What a leading end does as it reaches each stop on its way down.
  private arrive(k: string): void {
    for (let side = 0; side < 2; side++) {
      const p = this.sides[side], out = side === 0 ? -1 : 1;
      if (k === 'title' && side === 0) this.burst(CX, 46, -Math.PI / 2, 1.3, 18, 22, 1);
      else if (k === 'barIn') { this.knock = this.t; this.burst(p.x[this.at.barIn], p.y[this.at.barIn] - 3, -Math.PI / 2, 0.9, 6, 10, 0.6); }
      else if (k === 'top0') this.strike(side);
      else if (k === 'stone') { this.stone[side] = this.t; this.burst(p.x[this.at.stone], p.y[this.at.stone], -Math.PI / 2 + out * 1.1, 0.8, 5, 12, 0.6); }
      else if (k === 'side') this.strike(side + 2);
      else if (k === 'rail') this.burst(p.x[this.at.rail], p.y[this.at.rail] - 4, -Math.PI / 2, 0.9, 6, 12, 0.6);
      else if (k === 'meet' && side === 0) { this.met = this.t; this.burst(CX, 1706, Math.PI / 2, 1.2, 4, 14, 0.5); }
    }
  }

  private step(): void {
    const t = this.t;
    if (this.line !== null) {
      let lo = 0, hi = this.n - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (this.floor[mid] <= this.line) lo = mid; else hi = mid - 1; }
      const was = this.head;
      if (this.lunge) for (const k of ['title', 'barIn', 'top0', 'stone', 'side', 'rail', 'meet'] as const) {
        const i = this.at[k];
        if (lo < i && lo >= i - 150 / STEP) lo = i;
      }
      this.head = lo > was ? Math.min(lo, was + (1400 / STEP) * H) : lo;
      if (this.head > was) {
        for (const [k, i] of Object.entries(this.at)) if (i > was && i <= this.head) this.arrive(k);
        const h = Math.floor(this.head);
        for (let side = 0; side < 2; side++) if (side === 0 || h > this.at.title) this.burst(this.sides[side].x[h], this.sides[side].y[h], Math.PI / 2, 2.4, 0, 1, 0.45);
        this.quiet = Math.max(this.quiet, t + 2.6);
      }
    }
    for (const s of this.surges) {
      const e = t - s.t0;
      if (e < 0) continue;
      const p = this.sides[s.side], row = [s.side, s.side + 2];
      if (!(s.fired & 1)) { s.fired |= 1; this.knock = t; this.burst(p.x[this.at.bar], p.y[this.at.bar] - 3, -Math.PI / 2, 0.9, Math.round(4 + 6 * s.near), Math.round(6 + 8 * s.near), 0.55 + 0.3 * s.near); }
      if (s.mode === 'together') {
        if (e >= 0.04 && !(s.fired & 2)) { s.fired |= 2; this.letGo(row[0], s.cat); this.letGo(row[1], s.cat); }
        continue;
      }
      const front = this.at.bar + ((this.at.meet - this.at.bar) * e) / s.T;
      if (front >= this.at.top0 && !(s.fired & 2)) { s.fired |= 2; this.letGo(row[0], s.cat); }
      if (front >= this.at.stone && !(s.fired & 4)) { s.fired |= 4; this.stone[s.side] = t; this.burst(p.x[this.at.stone], p.y[this.at.stone], s.side === 0 ? -0.5 : Math.PI + 0.5, 0.8, 4, 10, 0.5); }
      if (front >= this.at.side - 6 && !(s.fired & 8)) { s.fired |= 8; this.letGo(row[1], s.cat); }
      if (front >= this.at.rail && !(s.fired & 16)) { s.fired |= 16; this.burst(p.x[this.at.rail], p.y[this.at.rail] - 4, -Math.PI / 2, 0.9, 5, 10, 0.5); }
      if (front >= this.at.meet && !(s.fired & 32)) { s.fired |= 32; this.met = t; this.burst(CX, 1706, Math.PI / 2, 1.2, 3, 12, 0.5); }
    }
    this.surges = this.surges.filter((s) => t - s.t0 < (s.mode === 'surge' ? s.T + 0.4 : 0.4));
    this.cards.forEach((c, i) => { if (c.pending && t >= c.at + SWAP.strike) { c.pending = false; this.strike(i); } });

    for (const b of this.bits) {
      if (b.rest >= 0) { b.x += b.vx * H; b.vx *= 1 - 6 * H; continue; }
      const g = b.kind === 2 ? 520 : 900;
      b.vy += g * H;
      if (b.kind === 2) { b.vx *= 1 - 1.5 * H; b.vy *= 1 - 1.5 * H; }
      const y0 = b.y;
      b.x += b.vx * H; b.y += b.vy * H; b.rot += b.spin * H;
      if (b.vy <= 0) continue;
      const floor = this.floorAt(b.x, y0);
      if (floor !== null && b.y >= floor) {
        b.y = floor;
        if (b.vy < 120 || b.kind === 2 && this.rnd() < 0.5) { b.rest = t; b.vy = 0; b.life = Math.min(b.life, t - b.born + 0.7); } else { b.vy *= -0.58 * (0.75 + 0.5 * this.rnd()); b.vx *= 0.72; b.spin *= 0.6; }
      }
    }
    this.bits = this.bits.filter((b) => t - b.born < b.life && b.y < STAGE.h + 40);
  }

  // The first surface under a point that was above it a step ago: a card's top, the bar's top or the rail.
  private floorAt(x: number, y0: number): number | null {
    let best: number | null = null;
    const take = (y: number) => { if (y0 <= y + 1 && (best === null || y < best)) best = y; };
    for (const c of CARDS) if (x >= c.x && x <= c.x + CARD.w) take(c.y);
    if (x >= BAR.l && x <= BAR.r) take(BAR.t);
    const rx = x < CX ? x : STAGE.w - x;
    if (rx >= RAIL.ax && rx <= RAIL.bx) take(RAIL.ay + ((RAIL.by - RAIL.ay) * (rx - RAIL.ax)) / (RAIL.bx - RAIL.ax) - 8);
    return best;
  }

  // ---- drawing

  private sx: Float32Array[] = [];
  private sy: Float32Array[] = [];

  // How far the stream is off its line where a card has let go: it sags, and springs back as the new card strikes it.
  private give(c: CardState): number {
    const u = this.t - c.at;
    if (u < 0 || u > 1.2) return 0;
    if (u < SWAP.strike) { const k = u / SWAP.strike; return k * k * (3 - 2 * k); }
    const v = u - SWAP.strike;
    return Math.exp(-9 * v) * Math.cos(32 * v);
  }

  private bend(side: number): void {
    const p = this.sides[side], x = this.sx[side], y = this.sy[side];
    x.set(p.x); y.set(p.y);
    const g0 = this.give(this.cards[side]) * 9, g1 = this.give(this.cards[side + 2]) * 8;
    if (g0) for (let i = this.at.top0 - 10; i <= this.at.top1 + 10; i++) { const k = Math.min(1, (i - this.at.top0 + 10) / 10, (this.at.top1 + 10 - i) / 10); y[i] += g0 * k; }
    if (g1) for (let i = this.at.side - 16; i <= this.at.side + 16; i++) { const k = 1 - Math.abs(i - this.at.side) / 16; x[i] += (side === 0 ? 1 : -1) * g1 * k * k; }
    for (const s of this.surges) {
      if (s.side !== side || s.mode !== 'surge') continue;
      const e = this.t - s.t0;
      if (e < 0) continue;
      const v = (this.at.meet - this.at.bar) / s.T, fade = Math.max(0, Math.min(1, (s.T + 0.25 - e) / 0.25));
      const wave = (front: number, amp: number) => {
        const a = Math.max(1, Math.floor(front - 40)), b = Math.min(p.n - 2, Math.ceil(front + 40));
        for (let i = a; i <= b; i++) { const u = (i - front) / 12, w = -u * Math.exp(-u * u) * 2.33 * amp; x[i] += p.nx[i] * w; y[i] += p.ny[i] * w; }
      };
      wave(this.at.bar + v * e, 7 * fade);
      const up = this.at.bar - v * e;
      if (up > this.at.title) wave(up, 4 * (up - this.at.title) / (this.at.bar - this.at.title));
    }
  }

  draw(ctx: CanvasRenderingContext2D, k: number, fonts: Fonts): void {
    const t = this.t, C = palette;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    ctx.font = `600 92px ${fonts.display}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C['text-2'];
    'WORK'.split('').forEach((ch, i) => ctx.fillText(ch, CX + (i - 1.5) * 124, 124));

    const jolt = 2.5 * Math.exp(-(t - this.knock) / 0.06) * Math.cos((t - this.knock) * 60);
    ctx.beginPath(); ctx.roundRect(BAR.l, BAR.t + jolt, BAR.r - BAR.l, BAR.b - BAR.t, 18);
    ctx.fillStyle = C['bg-2']; ctx.fill(); ctx.strokeStyle = rgba(C['copper-light'], 0.36); ctx.lineWidth = 1.5; ctx.stroke();

    for (let side = 0; side < 2; side++) this.fittings(ctx, side);
    const glow = Math.exp(-(t - this.met) / 0.5);
    const bg = ctx.createLinearGradient(0, BUTTON.t, 0, BUTTON.b); bg.addColorStop(0, C['copper-light']); bg.addColorStop(1, C.bronze);
    ctx.beginPath(); ctx.roundRect(BUTTON.l, BUTTON.t, BUTTON.r - BUTTON.l, BUTTON.b - BUTTON.t, 10); ctx.fillStyle = bg; ctx.fill();
    if (glow > 0.01) { ctx.fillStyle = rgba(C.pale, 0.5 * glow); ctx.fill(); }
    ctx.font = `600 17px ${fonts.display}`; ctx.fillStyle = C['ember-deep']; ctx.fillText('View all work', CX, BUTTON.t + 29);

    this.cards.forEach((c, i) => {
      const u = t - c.at, at = CARDS[i];
      if (u < SWAP.out) { const q = u / SWAP.out; this.card(ctx, at.x, at.y + SWAP.drop * q * q, c.from, i, 1 - q, 0, fonts); }
      if (u >= SWAP.in0) {
        const q = Math.min(1, (u - SWAP.in0) / (SWAP.strike - SWAP.in0)), ease = 1 - (1 - q) ** 3;
        const v = t - c.struck, warm = v >= 0 && v < 1 ? 0.8 * (1 - v) ** 2 : 0;
        this.card(ctx, at.x, at.y + SWAP.rise * (1 - ease), c.to, i, Math.min(1, q * 2.2), warm, fonts);
      }
    });

    if (this.ghost) for (const g of this.ghost) {
      ctx.lineWidth = 2; ctx.strokeStyle = rgba(C['copper-light'], 0.4); ctx.setLineDash([7, 7]);
      ctx.beginPath(); ctx.moveTo(g.x[0], g.y[0]); for (let i = 1; i < g.n; i++) ctx.lineTo(g.x[i], g.y[i]); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalCompositeOperation = 'lighter';
    const end = this.line === null ? this.n - 1 : Math.floor(this.head);
    for (let side = 0; side < 2; side++) {
      this.bend(side);
      const x = this.sx[side], y = this.sy[side], from = side === 0 ? 0 : this.at.title;
      const line = (a: number, b: number) => { ctx.beginPath(); ctx.moveTo(x[a], y[a]); for (let i = a + 1; i <= b; i++) ctx.lineTo(x[i], y[i]); ctx.stroke(); };
      if (end > from) for (const [w, col] of [[36, rgba(C.flame, 0.045)], [18, rgba(C.flame, 0.1)], [8, rgba(C.hot, 0.5)], [2.6, C.pale]] as [number, string][]) { ctx.lineWidth = w; ctx.strokeStyle = col; line(from, end); }
      if (this.line !== null && end > from && end < this.n - 1) {
        for (const [r, col] of [[26, rgba(C.flame, 0.16)], [11, rgba(C.hot, 0.6)], [4.5, C.pale]] as [number, string][]) { ctx.beginPath(); ctx.arc(x[end], y[end], r, 0, 6.3); ctx.fillStyle = col; ctx.fill(); }
      }
      for (const s of this.surges) {
        if (s.side !== side || s.mode !== 'surge') continue;
        const e = t - s.t0;
        if (e < 0) continue;
        const front = this.at.bar + ((this.at.meet - this.at.bar) * e) / s.T, fade = Math.max(0, Math.min(1, (s.T + 0.3 - e) / 0.3));
        for (let a = Math.max(this.at.bar, Math.floor(front - 80)); a < Math.min(this.n - 4, front + 6); a += 3) {
          const d = a - front, b = Math.exp(-((d / (d > 0 ? 3 : 30)) ** 2)) * fade;
          ctx.lineWidth = 6 + 16 * b; ctx.strokeStyle = rgba(C.pale, 0.55 * b); line(a, a + 3);
          ctx.lineWidth = 30 + 40 * b; ctx.strokeStyle = rgba(C.flame, 0.1 * b); line(a, a + 3);
        }
      }
      // Where a strike has just landed, the card's edge flares.
      for (const i of [side, side + 2]) {
        const v = t - this.cards[i].struck;
        if (v < 0 || v > 0.9) continue;
        const f = Math.exp(-v / 0.22), p = this.sides[side];
        ctx.lineWidth = 5; ctx.strokeStyle = rgba(C.pale, 0.9 * f);
        ctx.beginPath();
        if (i < 2) { ctx.moveTo(p.x[this.top] - 120, CARDS[i].y); ctx.lineTo(p.x[this.top] + 120, CARDS[i].y); } else { const ex = side === 0 ? CARDS[i].x : CARDS[i].x + CARD.w; ctx.moveTo(ex, p.y[this.at.side] - 110); ctx.lineTo(ex, p.y[this.at.side] + 110); }
        ctx.stroke(); ctx.lineWidth = 22; ctx.strokeStyle = rgba(C.flame, 0.22 * f); ctx.stroke();
      }
    }
    for (const b of this.bits) {
      const age = t - b.born, left = Math.min(1, (b.life - age) / (b.life * 0.3));
      if (b.kind === 2) {
        ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(age / b.life < 0.4 ? C.pale : C.flame, 0.9 * left);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.035, b.y - b.vy * 0.035); ctx.stroke();
        continue;
      }
      const s = b.size * Math.min(1, age / 0.07) * left, c = Math.cos(b.rot), n = Math.sin(b.rot);
      ctx.beginPath();
      ctx.moveTo(b.x + c * s, b.y + n * s); ctx.lineTo(b.x - c * s * 0.5 - n * s * 0.34, b.y - n * s * 0.5 + c * s * 0.34); ctx.lineTo(b.x - c * s * 0.2 + n * s * 0.5, b.y - n * s * 0.2 - c * s * 0.5);
      ctx.closePath(); ctx.fillStyle = b.kind === 1 ? rgba(C.hot, 0.5) : rgba(C.copper, 0.85); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private fittings(ctx: CanvasRenderingContext2D, side: number): void {
    const C = palette, m = (x: number) => (side === 0 ? x : STAGE.w - x), way = side === 0 ? 1 : -1;
    const sx = m(STONE.x), lit = 0.55 + 0.45 * Math.exp(-(this.t - this.stone[side]) / 0.45);
    const g = ctx.createRadialGradient(sx - 10, STONE.y - 12, 4, sx, STONE.y, STONE.r); g.addColorStop(0, C.copper); g.addColorStop(1, C['bronze-deep']);
    ctx.beginPath(); ctx.arc(sx, STONE.y, STONE.r, 0, 6.3); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = rgba(C['copper-light'], 0.5); ctx.lineWidth = 1.5;
    for (const r of [STONE.r - 2, STONE.r - 13, 17]) { ctx.beginPath(); ctx.arc(sx, STONE.y, r, 0, 6.3); ctx.stroke(); }
    ctx.fillStyle = rgba(C.hot, lit);
    ctx.fillRect(sx - 9, STONE.y - 5, 6, 2.6); ctx.fillRect(sx + 3, STONE.y - 5, 6, 2.6); ctx.fillRect(sx - 4, STONE.y + 6, 8, 3);

    const ax = m(RAIL.ax), bx = m(RAIL.bx), dx = bx - ax, dy = RAIL.by - RAIL.ay, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
    ctx.lineCap = 'butt'; ctx.strokeStyle = C.bronze; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(ax, RAIL.ay); ctx.lineTo(bx, RAIL.by); ctx.stroke();
    ctx.strokeStyle = rgba(C['copper-light'], 0.7); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ax + uy * 5 * way, RAIL.ay - ux * 5 * way); ctx.lineTo(bx + uy * 5 * way, RAIL.by - ux * 5 * way); ctx.stroke();
    ctx.lineCap = 'round';
    ctx.fillStyle = C.copper; ctx.beginPath();
    ctx.moveTo(ax - ux * 46, RAIL.ay - uy * 46); ctx.lineTo(ax - uy * 13 * way, RAIL.ay + ux * 13 * way); ctx.lineTo(ax + uy * 13 * way, RAIL.ay - ux * 13 * way); ctx.closePath(); ctx.fill();
  }

  private card(ctx: CanvasRenderingContext2D, x: number, y: number, cat: number, i: number, alpha: number, warm: number, fonts: Fonts): void {
    const C = palette, w = CARD.w, pic = (w - 16) / 2, hue = HUES[cat][i];
    ctx.save();
    ctx.globalAlpha = alpha;
    const face = ctx.createLinearGradient(0, y, 0, y + CARD.h); face.addColorStop(0, C['bg-3']); face.addColorStop(1, C['bg-2']);
    ctx.beginPath(); ctx.roundRect(x, y, w, CARD.h, CARD.r); ctx.fillStyle = face; ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x + 8, y + 8, w - 16, pic, [11, 11, 0, 0]); ctx.clip();
    const tone = (a: string, b: string, al: number) => {
      const gr = ctx.createLinearGradient(x, y, x + w, y + pic); gr.addColorStop(0, a); gr.addColorStop(1, b);
      ctx.globalAlpha = alpha * al; ctx.fillStyle = gr; ctx.fillRect(x + 8, y + 8, w - 16, pic);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.arc(x + 90 + i * 70, y + 150, 120, 0, 6.3); ctx.fill();
      ctx.fillRect(x + 250 - i * 30, y + 60 + cat * 14, 150, 70);
    };
    tone(C.copper, C['bronze-deep'], 1);
    if (warm > 0) tone(`hsl(${hue} 62% 58%)`, `hsl(${hue + 44} 55% 26%)`, warm);
    ctx.restore();
    ctx.fillStyle = C['bronze-deep']; ctx.fillRect(x + 8, y + 8 + pic, w - 16, 36);
    ctx.font = `500 12px ${fonts.mono}`; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = C['copper-light'];
    ctx.textAlign = 'left'; ctx.fillText(KINDS[cat][i], x + 26, y + pic + 31);
    ctx.textAlign = 'right'; ctx.fillText('2026', x + w - 26, y + pic + 31);
    ctx.textAlign = 'left'; ctx.font = `600 25px ${fonts.display}`; ctx.fillStyle = C.text; ctx.fillText(NAMES[cat][i], x + 26, y + pic + 88);
    ctx.fillStyle = rgba(C['text-2'], 0.2);
    [396, 408, 380, 250].forEach((len, n) => ctx.fillRect(x + 26, y + pic + 110 + n * 25, len - ((cat * 37 + i * 53 + n * 29) % 90), 9));
    ctx.strokeStyle = rgba(C['text-2'], 0.35); ctx.lineWidth = 1;
    [0, 132, 236].forEach((off, n) => { ctx.beginPath(); ctx.roundRect(x + 26 + off, y + pic + 214, [120, 92, 110][n], 26, 13); ctx.stroke(); });
    ctx.strokeStyle = rgba(C['copper-light'], 0.2); ctx.beginPath(); ctx.moveTo(x + 26, y + CARD.h - 52); ctx.lineTo(x + w - 26, y + CARD.h - 52); ctx.stroke();
    ctx.font = `500 12px ${fonts.mono}`; ctx.fillStyle = C['copper-light']; ctx.fillText('LIVE ↗   CODE ↗', x + 26, y + CARD.h - 24);
    ctx.textAlign = 'right'; ctx.fillStyle = C['text-3']; ctx.fillText('CASE STUDY →', x + w - 26, y + CARD.h - 24);
    ctx.beginPath(); ctx.roundRect(x + 2.5, y + 2.5, w - 5, CARD.h - 5, CARD.r - 2); ctx.strokeStyle = C.bronze; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = rgba(C['copper-light'], 0.55); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
