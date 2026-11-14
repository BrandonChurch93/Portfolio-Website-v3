import { compose, type Job, type Op, type Packed, type Profile, type Shape } from './compose';

// A relief built from shapes drawn in two dimensions. Each shape is filled on a canvas, measured as a distance from
// its own edge, and given a profile across that distance, so a bevel is smooth however sharp the reflections are.
// One design unit is a CSS pixel at the size the piece was designed at. Heights are in the same units.
// This half draws the shapes, which needs the page. compose.ts does the arithmetic, in a worker.

export type Paint = (c: CanvasRenderingContext2D) => void;
export type { Profile };

// How far outside a shape its distance is still worked out, in design units. No feather is wider.
const REACH = 6;
// A relief is worked out finer than it is shown and averaged down, so a slanted edge has no teeth. It is worked at
// about FINE pixels to a design unit, at no more than OVER times its shown size, in no more than MOST pixels.
const FINE = 4, OVER = 3, MOST = 2.4e6;

let fine: CanvasRenderingContext2D | null = null, rough: CanvasRenderingContext2D | null = null;
const context = (now: CanvasRenderingContext2D | null, w: number, h: number): CanvasRenderingContext2D => {
  const c = now ?? document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!c) throw new Error('relief: no 2D canvas');
  if (c.canvas.width !== w || c.canvas.height !== h) { c.canvas.width = w; c.canvas.height = h; }
  return c;
};

export class Relief {
  private W: number;
  private H: number;
  private s: number;
  private over: number;
  private shapes: Shape[] = [];
  private ops: Op[] = [];
  private known = new Map<Paint, number>();

  // shown is how many pixels the piece is drawn at to a design unit.
  constructor(readonly w: number, readonly h: number, readonly shown: number) {
    const outW = Math.max(2, Math.round(w * shown)), outH = Math.max(2, Math.round(h * shown));
    this.over = Math.max(1, Math.min(OVER, Math.ceil(FINE / shown), Math.floor(Math.sqrt(MOST / (outW * outH)))));
    this.W = outW * this.over;
    this.H = outH * this.over;
    this.s = shown * this.over;
  }

  // How much of each pixel the painted shape covers, in the box round it. A small drawing finds the box first, so
  // only that much of the large one is read back.
  private shape(paint: Paint): number {
    const had = this.known.get(paint);
    if (had !== undefined) return had;
    const { W, H, s } = this, pw = Math.ceil(this.w), ph = Math.ceil(this.h);
    const draw = (c: CanvasRenderingContext2D, scale: number) => {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      c.setTransform(scale, 0, 0, scale, 0, 0);
      c.fillStyle = '#fff';
      c.strokeStyle = '#fff';
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.save();
      paint(c);
      c.restore();
    };
    rough = context(rough, pw, ph);
    draw(rough, 1);
    const px = rough.getImageData(0, 0, pw, ph).data;
    let x0 = pw, y0 = ph, x1 = -1, y1 = -1;
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) if (px[(y * pw + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const at = this.shapes.length;
    this.known.set(paint, at);
    if (x1 < 0) { this.shapes.push({ cov: new Uint8ClampedArray(0), x: 0, y: 0, w: 0, h: 0 }); return at; }
    const pad = REACH + 2;
    const X0 = Math.max(0, Math.floor((x0 - pad) * s)), Y0 = Math.max(0, Math.floor((y0 - pad) * s));
    const X1 = Math.min(W, Math.ceil((x1 + 1 + pad) * s)), Y1 = Math.min(H, Math.ceil((y1 + 1 + pad) * s));
    fine = context(fine, W, H);
    draw(fine, s);
    const w = X1 - X0, h = Y1 - Y0, rgba = fine.getImageData(X0, Y0, w, h).data, cov = new Uint8ClampedArray(w * h);
    for (let i = 0; i < cov.length; i++) cov[i] = rgba[i * 4 + 3];
    this.shapes.push({ cov, x: X0, y: Y0, w, h });
    return at;
  }

  private add(kind: Op['kind'], paint: Paint, a: number, b: number, profile: Profile = 'soft'): this {
    this.ops.push({ shape: this.shape(paint), kind, a, b, profile });
    return this;
  }

  // The piece's own outline. Its edge rises to the height over the rim's width.
  body(paint: Paint, rim: number, height: number, profile: Profile = 'round'): this { return this.add('body', paint, rim, height, profile); }
  raise(paint: Paint, height: number, round: number, profile: Profile = 'round'): this { return this.add('raise', paint, height, round, profile); }
  sink(paint: Paint, depth: number, round: number, profile: Profile = 'soft'): this { return this.add('raise', paint, -depth, round, profile); }
  // Sets how satin the surface inside the shape is: 0 is a mirror, 1 is fully satin.
  finish(paint: Paint, value: number, feather = 1): this { return this.add('finish', paint, value, feather); }
  // Sets how dark the patina inside the shape is: 0 is rubbed clean, 1 is as dark as it gets.
  tone(paint: Paint, amount: number, feather = 1.5): this { return this.add('tone', paint, amount, feather); }

  job(): Job { return { W: this.W, H: this.H, s: this.s, over: this.over, shapes: this.shapes, ops: this.ops }; }
}

// The arithmetic runs in workers when they can start, and here when they cannot. A job sent to a worker that then
// fails is finished here, so no piece waits forever.
interface Waiting { job: Job; done: (p: Packed) => void }
const waiting = new Map<number, Waiting>();
let pool: Worker[] | null = null, failed = false, next = 1;

function fail(): void {
  failed = true;
  pool?.forEach((w) => w.terminate());
  pool = null;
  for (const [id, wait] of waiting) { waiting.delete(id); wait.done(compose(wait.job)); }
}

function workers(): Worker[] | null {
  if (pool || failed || typeof Worker === 'undefined') return pool;
  try {
    pool = Array.from({ length: Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1)) }, () => {
      const w = new Worker(new URL('./relief.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<{ id: number; out: Packed }>) => { const wait = waiting.get(e.data.id); waiting.delete(e.data.id); wait?.done(e.data.out); };
      w.onerror = fail;
      return w;
    });
  } catch { fail(); }
  return pool;
}

export function pack(job: Job): Promise<Packed> {
  const all = workers();
  if (!all) return Promise.resolve(compose(job));
  return new Promise((done) => {
    const id = next++;
    waiting.set(id, { job, done });
    // The shapes are copied to the worker, not handed over, so the job can still be finished here if it fails.
    all[id % all.length].postMessage({ id, job });
  });
}
