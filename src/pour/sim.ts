import { POUR, type PourBudget } from './config';
import { cellRandom, noise1, noise2, rng, type Rng } from './rng';
import { slabDistance, type Scene } from './scene';

export const POUR_STEP = 1 / POUR.stepsPerSecond;

const AIR = 0;
const BODY = 1;
const SOLID = 2;
const HEAT_EVERY = 4;

// The pour's physics: particles of metal in the plane of the page. Where they are packed into a body, a grid keeps that
// body from being squeezed or pulled apart, which is what turns a fast landing into a splash and thins a falling stream.
// Where they are few, they fly free as beads. It advances only by step(), a fixed amount of time, and every random
// number comes from the seed, so the state after n steps is always the same for the same seed.
export class PourSim {
  n = 0;
  sparkCount = 0;
  steps = 0;
  seed = 1;
  // Seconds from the first metal to the last of the steady pour.
  duration = 0;

  readonly max: number;
  readonly maxSparks: number;
  readonly spacing: number;

  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly temp: Float32Array;
  readonly skin: Float32Array;
  // A fixed random number per particle. Drawn, it becomes ripples that travel with the metal.
  readonly grain: Float32Array;
  readonly size: Float32Array;
  // Density as a fraction of the density at rest. Low means exposed: at the surface, or a bead alone.
  readonly dens: Float32Array;

  readonly sx: Float32Array;
  readonly sy: Float32Array;
  readonly svx: Float32Array;
  readonly svy: Float32Array;
  readonly sheat: Float32Array;
  readonly ssize: Float32Array;

  // One grid of warmth per slab, row by row.
  readonly heat: Float32Array[] = [];
  readonly heatSize: { w: number; h: number }[] = [];

  private touch: Uint8Array;
  // Seconds a thrown particle still has before the body can take it back.
  private thrown: Float32Array;
  private slife: Float32Array;
  private smax: Float32Array;
  private sbead: Uint8Array;

  private h: number;
  private nx: number;
  private ny: number;
  private ox: number;
  private oy: number;
  private u: Float32Array;
  private v: Float32Array;
  private pu: Float32Array;
  private pv: Float32Array;
  private du: Float32Array;
  private dv: Float32Array;
  private pd: Float32Array;
  private gt: Float32Array;
  private count: Uint16Array;
  private type: Uint8Array;
  private solid: Uint8Array;
  private body: Int32Array;
  private bodies = 0;
  private mark: Uint8Array;
  private touched: Int32Array;
  private touchedCount = 0;
  private held: Int32Array;
  private rest: number;

  private rnd: Rng = rng(1);
  private emitPhase = 0;
  private rowParity = 0;
  // This pour's own width, landing place and lean.
  private wide = 1;
  private shift = 0;
  private tilt = 0;
  private heatScratch: Float32Array[] = [];
  private sd = new Float32Array(3);

  constructor(private scene: Scene, budget: PourBudget) {
    this.max = budget.maxFluid;
    this.maxSparks = budget.maxSparks;
    this.spacing = budget.spacing;
    const n = this.max;
    const f = () => new Float32Array(n);
    this.x = f(); this.y = f(); this.vx = f(); this.vy = f(); this.temp = f(); this.skin = f(); this.grain = f(); this.size = f(); this.dens = f();
    this.touch = new Uint8Array(n);
    this.thrown = f();
    const m = this.maxSparks;
    this.sx = new Float32Array(m); this.sy = new Float32Array(m); this.svx = new Float32Array(m); this.svy = new Float32Array(m);
    this.sheat = new Float32Array(m); this.ssize = new Float32Array(m); this.slife = new Float32Array(m); this.smax = new Float32Array(m);
    this.sbead = new Uint8Array(m);

    const h = budget.spacing * POUR.cell;
    this.h = h;
    this.rest = (h * h) / (0.866 * budget.spacing * budget.spacing);
    const b = scene.bounds;
    const first = scene.slabs[0];
    // The grid is lined up with the first slab's top and near end, so the surface the grid holds the metal off is the
    // surface that is drawn. A slab that is not on the grid would show a gap of up to half a cell.
    const pad = 3 * h;
    this.ox = first ? first.cx - first.hx - Math.ceil((first.cx - first.hx - b.x0 + pad) / h) * h : b.x0 - pad;
    this.oy = first ? first.cy - first.hy - Math.ceil((first.cy - first.hy - b.y0 + pad) / h) * h : b.y0 - pad;
    this.nx = Math.ceil((b.x1 + pad - this.ox) / h) + 1;
    this.ny = Math.ceil((b.y1 + pad - this.oy) / h) + 1;
    const cells = this.nx * this.ny;
    const g = () => new Float32Array(cells);
    this.u = g(); this.v = g(); this.pu = g(); this.pv = g(); this.du = g(); this.dv = g(); this.pd = g(); this.gt = g();
    this.count = new Uint16Array(cells);
    this.type = new Uint8Array(cells);
    this.solid = new Uint8Array(cells);
    this.body = new Int32Array(cells);
    this.mark = new Uint8Array(cells);
    this.touched = new Int32Array(cells);
    this.held = new Int32Array(cells);
    for (let j = 0; j < this.ny; j++) {
      for (let i = 0; i < this.nx; i++) {
        const cx = this.ox + (i + 0.5) * h;
        const cy = this.oy + (j + 0.5) * h;
        for (const s of scene.slabs) {
          if (Math.abs(cx - s.cx) < s.hx && Math.abs(cy - s.cy) < s.hy) this.solid[i + j * this.nx] = 1;
        }
        this.type[i + j * this.nx] = this.solid[i + j * this.nx] ? SOLID : AIR;
      }
    }

    for (const s of scene.slabs) {
      const w = Math.max(2, Math.ceil((s.hx * 2) / POUR.heat.cell));
      const hh = Math.max(2, Math.ceil((s.hy * 2) / POUR.heat.cell));
      this.heat.push(new Float32Array(w * hh));
      this.heatScratch.push(new Float32Array(w * hh));
      this.heatSize.push({ w, h: hh });
    }
    this.reset(1);
  }

  reset(seed: number): void {
    this.seed = seed >>> 0;
    this.rnd = rng(this.seed);
    this.n = 0;
    this.sparkCount = 0;
    this.steps = 0;
    this.emitPhase = 0;
    this.rowParity = 0;
    for (const hgrid of this.heat) hgrid.fill(0);
    const p = POUR.pour;
    const vary = POUR.vary;
    const first = this.scene.slabs[0];
    this.wide = 1 + this.rnd.range(-vary.width, vary.width);
    this.shift = first ? this.rnd.range(-vary.landing, vary.landing) * first.hx * 2 : 0;
    this.tilt = this.rnd.range(-vary.lean, vary.lean);
    this.duration = this.rnd.range(p.minSeconds, p.maxSeconds);
  }

  get time(): number {
    return this.steps * POUR_STEP;
  }

  // True once the spout is spent and everything it poured has gone or gone cold.
  get done(): boolean {
    return this.time > this.duration && this.n === 0 && this.sparkCount === 0;
  }

  // How wide the stream is now, as a fraction of its full width. This is the hand tipping the crucible.
  private flow(t: number): number {
    const p = POUR.pour;
    const s = this.seed;
    if (t > this.duration) return 0;
    const rise = Math.min(1, t / p.swell);
    const swell = rise * rise * (3 - 2 * rise) + p.gush * Math.sin(Math.min(1, t / (p.swell * 3)) * Math.PI);
    const waver = 1 + POUR.stream.waver * noise1(t * 1.6, s, 1) + POUR.stream.waver * 0.45 * noise1(t * 5.3, s, 2);
    const left = this.duration - t;
    // The pour ends as a crucible empties: the stream thins to a thread, and the thread to drops.
    let tail = 1;
    if (left < p.tail) {
      const k = left / p.tail;
      tail = 0.1 + 0.9 * k * k;
    }
    return swell * waver * tail * this.wide;
  }

  private emit(): void {
    const t = this.time;
    const st = POUR.stream;
    const flow = this.flow(t);
    const speed = st.speed * (0.8 + 0.2 * Math.min(1, flow)) * (1 + 0.03 * noise1(t * 3.1, this.seed, 4));
    const gap = this.spacing * 0.866;
    this.emitPhase += speed * POUR_STEP;
    if (flow <= 0) {
      this.emitPhase = Math.min(this.emitPhase, gap);
      return;
    }
    const sp = this.scene.spout;
    const a = st.swayAngle * noise1(t * 0.9, this.seed, 5) + this.tilt;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const dx = sp.dx * ca - sp.dy * sa;
    const dy = sp.dx * sa + sp.dy * ca;
    const ox = sp.x + this.shift + st.sway * noise1(t * 0.7, this.seed, 6);
    const width = st.width * flow;
    const count = Math.max(1, Math.round(width / this.spacing));
    while (this.emitPhase >= gap) {
      this.emitPhase -= gap;
      this.rowParity ^= 1;
      for (let k = 0; k < count; k++) {
        // The budget is set so this never happens. If it does, the metal that has fallen farthest gives up its place:
        // a fall that ends a little early is a smaller fault than a stream with holes in it.
        if (this.n >= this.max) this.remove(this.lowest());
        const across = (k - (count - 1) / 2 + (this.rowParity ? 0.25 : -0.25)) * this.spacing;
        const i = this.n++;
        const j = this.spacing * 0.12;
        this.x[i] = ox - dy * across + dx * this.emitPhase + (this.rnd.next() - 0.5) * j;
        this.y[i] = sp.y + dx * across + dy * this.emitPhase + (this.rnd.next() - 0.5) * j;
        this.vx[i] = dx * speed;
        this.vy[i] = dy * speed;
        this.temp[i] = 1;
        // Films of oxide ride on the stream as long streaks: the same place across it, for a while.
        const film = noise2((across / st.width) * 1.7 + 20 + t * 1.1, t * 2.2, this.seed);
        this.skin[i] = Math.min(1, Math.max(0, (film - 0.62) / 0.12));
        this.grain[i] = this.rnd.next();
        this.size[i] = 1;
        this.dens[i] = 1;
        this.touch[i] = 0;
        this.thrown[i] = 0;
      }
    }
  }

  step(): void {
    this.emit();
    this.advect();
    this.collide();
    this.toGrid();
    this.solve();
    this.fromGrid();
    this.stepSparks();
    if (this.steps % HEAT_EVERY === 0) this.stepHeat();
    this.steps++;
  }

  private advect(): void {
    const { x, y, vx, vy, sd } = this;
    const dt = POUR_STEP;
    const g = POUR.gravity * dt;
    const band = this.spacing * POUR.adhesionBand;
    const rp = this.spacing * 0.5;
    const slabs = this.scene.slabs;
    const b = this.scene.bounds;
    for (let i = this.n - 1; i >= 0; i--) {
      vy[i] += g;
      // Adhesion: metal that is part of a body and close to a slab is drawn onto it, so it wraps an edge before it lets go.
      if (this.dens[i] > POUR.aloneBelow) {
        for (let k = 0; k < slabs.length; k++) {
          const s = slabs[k];
          if (Math.abs(x[i] - s.cx) > s.hx + band + rp || Math.abs(y[i] - s.cy) > s.hy + band + rp) continue;
          slabDistance(s, x[i], y[i], sd);
          const gapTo = sd[0] - rp;
          // Not onto the underside: metal that has run down an end lets go at the bottom corner and falls.
          if (gapTo < band && gapTo > -rp && sd[2] < 0.5) {
            const pull = POUR.adhesion * (1 - Math.max(0, gapTo) / band) * dt;
            vx[i] -= sd[1] * pull;
            vy[i] -= sd[2] * pull;
          }
        }
      }
      const sp = Math.hypot(vx[i], vy[i]);
      if (sp > POUR.maxSpeed) {
        vx[i] *= POUR.maxSpeed / sp;
        vy[i] *= POUR.maxSpeed / sp;
      }
      x[i] += vx[i] * dt;
      y[i] += vy[i] * dt;
      if (x[i] < b.x0 || x[i] > b.x1 || y[i] < b.y0 || y[i] > b.y1 || this.size[i] < 0.1) this.remove(i);
    }
  }

  private lowest(): number {
    let at = 0;
    for (let i = 1; i < this.n; i++) if (this.y[i] > this.y[at]) at = i;
    return at;
  }

  private remove(i: number): void {
    const l = --this.n;
    if (i === l) return;
    this.x[i] = this.x[l]; this.y[i] = this.y[l]; this.vx[i] = this.vx[l]; this.vy[i] = this.vy[l];
    this.temp[i] = this.temp[l]; this.skin[i] = this.skin[l]; this.grain[i] = this.grain[l]; this.size[i] = this.size[l]; this.dens[i] = this.dens[l];
    this.touch[i] = this.touch[l];
    this.thrown[i] = this.thrown[l];
  }

  private collide(): void {
    const { x, y, vx, vy, touch, dens, sd } = this;
    const n = this.n;
    const rp = this.spacing * 0.5;
    const slabs = this.scene.slabs;
    for (let i = 0; i < n; i++) {
      let touching = 0;
      for (let k = 0; k < slabs.length; k++) {
        const s = slabs[k];
        if (Math.abs(x[i] - s.cx) > s.hx + rp || Math.abs(y[i] - s.cy) > s.hy + rp) continue;
        slabDistance(s, x[i], y[i], sd);
        const pen = sd[0] - rp;
        if (pen >= 0) continue;
        const nx = sd[1];
        const ny = sd[2];
        x[i] -= nx * pen;
        y[i] -= ny * pen;
        touching = 1;
        const vn = vx[i] * nx + vy[i] * ny;
        let tx = vx[i] - vn * nx;
        let ty = vy[i] - vn * ny;
        // A bead alone grips where it lands and bounces. Metal that is part of a body does neither: a liquid slides
        // along what it hits and keeps its speed, which is what carries the pour along the slab.
        const alone = dens[i] < POUR.aloneBelow;
        const grip = alone ? Math.min(1, (POUR.wallFriction * Math.max(0, -vn)) / (Math.hypot(tx, ty) + 1e-6)) : 0;
        tx *= 1 - grip;
        ty *= 1 - grip;
        const out = alone && vn < -60 ? -vn * POUR.beadBounce : Math.max(0, vn);
        vx[i] = tx + nx * out;
        vy[i] = ty + ny * out;
        if (!alone && vn < -POUR.spark.minImpact) this.strike(i, nx, ny, -vn);
        this.warm(k, x[i], y[i], this.temp[i]);
      }
      touch[i] = touching;
    }
  }

  // Particles hand their motion to the grid. Only the cells near metal are ever touched, and they are wiped at the start
  // of the next step, so the cost follows the amount of metal and not the size of the screen.
  private toGrid(): void {
    const { x, y, vx, vy, temp, u, v, pu, pv, du, dv, pd, gt, count, type, solid, body, mark, touched, held } = this;
    const n = this.n;
    const inv = 1 / this.h;
    const nx = this.nx;
    const ox = this.ox;
    const oy = this.oy;
    for (let k = 0; k < this.touchedCount; k++) {
      const c = touched[k];
      u[c] = 0; v[c] = 0; du[c] = 0; dv[c] = 0; pd[c] = 0; gt[c] = 0; pu[c] = 0; pv[c] = 0;
      count[c] = 0;
      mark[c] = 0;
      type[c] = solid[c] ? SOLID : AIR;
    }
    let heldCount = 0;
    for (let i = 0; i < n; i++) {
      const gx = (x[i] - ox) * inv;
      const gy = (y[i] - oy) * inv;
      const home = (gx | 0) + (gy | 0) * nx;
      if (count[home]++ === 0) held[heldCount++] = home;

      let fx = gx;
      let fy = gy - 0.5;
      let ix = fx | 0;
      let iy = fy | 0;
      let tx = fx - ix;
      let ty = fy - iy;
      let c = ix + iy * nx;
      let w0 = (1 - tx) * (1 - ty);
      let w1 = tx * (1 - ty);
      let w2 = tx * ty;
      let w3 = (1 - tx) * ty;
      const pvx = vx[i];
      u[c] += pvx * w0; du[c] += w0;
      u[c + 1] += pvx * w1; du[c + 1] += w1;
      u[c + 1 + nx] += pvx * w2; du[c + 1 + nx] += w2;
      u[c + nx] += pvx * w3; du[c + nx] += w3;

      fx = gx - 0.5;
      fy = gy;
      ix = fx | 0;
      iy = fy | 0;
      tx = fx - ix;
      ty = fy - iy;
      c = ix + iy * nx;
      w0 = (1 - tx) * (1 - ty);
      w1 = tx * (1 - ty);
      w2 = tx * ty;
      w3 = (1 - tx) * ty;
      const pvy = vy[i];
      v[c] += pvy * w0; dv[c] += w0;
      v[c + 1] += pvy * w1; dv[c + 1] += w1;
      v[c + 1 + nx] += pvy * w2; dv[c + 1 + nx] += w2;
      v[c + nx] += pvy * w3; dv[c + nx] += w3;

      fy = gy - 0.5;
      iy = fy | 0;
      ty = fy - iy;
      c = ix + iy * nx;
      w0 = (1 - tx) * (1 - ty);
      w1 = tx * (1 - ty);
      w2 = tx * ty;
      w3 = (1 - tx) * ty;
      const t = temp[i];
      pd[c] += w0; gt[c] += t * w0;
      pd[c + 1] += w1; gt[c + 1] += t * w1;
      pd[c + 1 + nx] += w2; gt[c + 1 + nx] += t * w2;
      pd[c + nx] += w3; gt[c + nx] += t * w3;
    }
    let tc = 0;
    for (let k = 0; k < heldCount; k++) {
      const home = held[k];
      for (let oy2 = -nx; oy2 <= nx; oy2 += nx) {
        for (let ox2 = -1; ox2 <= 1; ox2++) {
          const c = home + ox2 + oy2;
          if (!mark[c]) { mark[c] = 1; touched[tc++] = c; }
        }
      }
    }
    let bodies = 0;
    for (let k = 0; k < tc; k++) {
      const c = touched[k];
      if (du[c] > 0) u[c] /= du[c];
      if (dv[c] > 0) v[c] /= dv[c];
      // Nothing flows through the face of a slab.
      if (solid[c] || solid[c - 1]) u[c] = 0;
      if (solid[c] || solid[c - nx]) v[c] = 0;
      pu[c] = u[c];
      pv[c] = v[c];
      if (!solid[c] && count[c] >= POUR.bodyAt) { type[c] = BODY; body[bodies++] = c; }
    }
    this.touchedCount = tc;
    this.bodies = bodies;
  }

  // The grid makes every cell of a body let out exactly as much as it lets in. A squeezed cell pushes metal out sideways,
  // and a stretched one draws it in, so the body moves as a liquid.
  private solve(): void {
    const { u, v, pd, solid, body } = this;
    const nx = this.nx;
    const bodies = this.bodies;
    const over = POUR.overRelax;
    const rest = this.rest;
    const crowd = (POUR.spread * this.h) / POUR_STEP / rest;
    // A slab holds back the metal sliding over it, and harder the faster it slides: a landing is slowed at once, and a
    // slow layer is left to run. It acts on the whole cell beside the slab, so the layer slows as one and nothing
    // skims over a stuck film.
    // The hold reaches a few cells up from the slab, weaker each cell, the way a real layer drags on the layer above it.
    const hold = POUR.wallDrag * POUR_STEP;
    for (let k = 0; k < bodies; k++) {
      const c = body[k];
      const over = solid[c + nx] || solid[c - nx] ? 1 : solid[c + 2 * nx] ? 0.7 : solid[c + 3 * nx] ? 0.45 : solid[c + 4 * nx] ? 0.25 : 0;
      if (over > 0) u[c] /= 1 + hold * over * Math.abs(u[c]);
      if (solid[c + 1] || solid[c - 1]) v[c] /= 1 + hold * Math.abs(v[c]);
    }
    for (let round = 0; round < POUR.solveRounds; round++) {
      for (let k = 0; k < bodies; k++) {
        const c = body[k];
        const sl = solid[c - 1] ? 0 : 1;
        const sr = solid[c + 1] ? 0 : 1;
        const st = solid[c - nx] ? 0 : 1;
        const sb = solid[c + nx] ? 0 : 1;
        const open = sl + sr + st + sb;
        if (open === 0) continue;
        let div = u[c + 1] - u[c] + v[c + nx] - v[c];
        const extra = pd[c] - rest;
        if (extra > 0) div -= crowd * extra;
        const p = (-div / open) * over;
        u[c] -= sl * p;
        u[c + 1] += sr * p;
        v[c] -= st * p;
        v[c + nx] += sb * p;
      }
    }
  }

  // Particles take the grid's corrected motion back, keeping most of their own on top of it, then cool.
  private fromGrid(): void {
    const { x, y, vx, vy, temp, size, dens, touch, thrown, u, v, pu, pv, pd, gt, type } = this;
    const sp = POUR.spark;
    const n = this.n;
    const inv = 1 / this.h;
    const nx = this.nx;
    const ox = this.ox;
    const oy = this.oy;
    const dt = POUR_STEP;
    const mix = 1 - Math.exp(-POUR.mixing * dt);
    const cl = POUR.cool;
    const rest = this.rest;
    for (let i = 0; i < n; i++) {
      const gx = (x[i] - ox) * inv;
      const gy = (y[i] - oy) * inv;

      let fx = gx;
      let fy = gy - 0.5;
      let ix = fx | 0;
      let iy = fy | 0;
      let tx = fx - ix;
      let ty = fy - iy;
      let c = ix + iy * nx;
      let w0 = type[c] !== AIR || type[c - 1] !== AIR ? (1 - tx) * (1 - ty) : 0;
      let w1 = type[c + 1] !== AIR || type[c] !== AIR ? tx * (1 - ty) : 0;
      let w2 = type[c + 1 + nx] !== AIR || type[c + nx] !== AIR ? tx * ty : 0;
      let w3 = type[c + nx] !== AIR || type[c + nx - 1] !== AIR ? (1 - tx) * ty : 0;
      let w = w0 + w1 + w2 + w3;
      const wasX = vx[i];
      const wasY = vy[i];
      // Deep in a body the metal moves with what is around it, heavy and calm. At the surface and in a thrown sheet it
      // keeps its own motion, which is what lets a splash leave the body.
      const lively = POUR.calm + (POUR.lively - POUR.calm) * Math.min(1, Math.max(0, (0.95 - dens[i]) / 0.4));
      const free = thrown[i] > 0;
      if (free) thrown[i] -= dt;
      if (w > 0 && !free) {
        const now = (u[c] * w0 + u[c + 1] * w1 + u[c + 1 + nx] * w2 + u[c + nx] * w3) / w;
        const was = (pu[c] * w0 + pu[c + 1] * w1 + pu[c + 1 + nx] * w2 + pu[c + nx] * w3) / w;
        vx[i] = (1 - lively) * now + lively * (vx[i] + now - was);
      }

      fx = gx - 0.5;
      fy = gy;
      ix = fx | 0;
      iy = fy | 0;
      tx = fx - ix;
      ty = fy - iy;
      c = ix + iy * nx;
      w0 = type[c] !== AIR || type[c - nx] !== AIR ? (1 - tx) * (1 - ty) : 0;
      w1 = type[c + 1] !== AIR || type[c + 1 - nx] !== AIR ? tx * (1 - ty) : 0;
      w2 = type[c + 1 + nx] !== AIR || type[c + 1] !== AIR ? tx * ty : 0;
      w3 = type[c + nx] !== AIR || type[c] !== AIR ? (1 - tx) * ty : 0;
      w = w0 + w1 + w2 + w3;
      if (w > 0 && !free) {
        const now = (v[c] * w0 + v[c + 1] * w1 + v[c + 1 + nx] * w2 + v[c + nx] * w3) / w;
        const was = (pv[c] * w0 + pv[c + 1] * w1 + pv[c + 1 + nx] * w2 + pv[c + nx] * w3) / w;
        vy[i] = (1 - lively) * now + lively * (vy[i] + now - was);
      }

      fy = gy - 0.5;
      iy = fy | 0;
      ty = fy - iy;
      c = ix + iy * nx;
      w0 = (1 - tx) * (1 - ty);
      w1 = tx * (1 - ty);
      w2 = tx * ty;
      w3 = (1 - tx) * ty;
      // Metal turned hard by the body it lands in has hit something, as surely as metal that meets a slab.
      const jx = vx[i] - wasX;
      const jy = vy[i] - wasY;
      const jolt = Math.hypot(jx, jy);
      if (jolt > sp.minJolt && !free) {
        // Thrown metal leaves upward as well as away: the push it got, tipped against gravity.
        const upX = jx / jolt;
        const upY = jy / jolt - 1;
        const l = Math.hypot(upX, upY) + 1e-6;
        this.strike(i, upX / l, upY / l, Math.hypot(wasX, wasY));
      }
      const around = pd[c] * w0 + pd[c + 1] * w1 + pd[c + 1 + nx] * w2 + pd[c + nx] * w3;
      const warmth = gt[c] * w0 + gt[c + 1] * w1 + gt[c + 1 + nx] * w2 + gt[c + nx] * w3;
      dens[i] = around / rest;
      if (around > 0) temp[i] += (warmth / around - temp[i]) * mix;
      const open = Math.min(1, Math.max(0, 1.05 - dens[i]) * 1.6);
      temp[i] *= Math.exp(-(cl.core + cl.exposed * open + cl.contact * touch[i]) * dt);
      if (temp[i] < cl.fadeBelow) size[i] -= cl.fadeRate * dt;
    }
  }

  // A hard landing: particle i has been stopped or turned, pushed along (ax, ay), having come in at this speed. Sparks fly
  // from there, and so does spatter. A real pour is rough and turbulent and throws part of itself back off whatever it
  // hits, in gouts and fingers, not as an even spray: which metal is thrown, and which way, is the same for neighbors
  // for a moment, so it leaves as shapes.
  private strike(i: number, ax: number, ay: number, hard: number): void {
    const { x, y, vx, vy, dens, thrown } = this;
    const splash = POUR.splash;
    this.throwSparks(x[i], y[i], ax, ay, hard, vx[i], vy[i], dens[i]);
    const share = splash.share * (dens[i] < 0.8 ? splash.bare : 1);
    const where = Math.floor(x[i] * splash.grain);
    const when = Math.floor(this.time * splash.beat);
    if (cellRandom(where, when, this.seed) >= share) return;
    const swing = (cellRandom(where, when, this.seed + 3) - 0.5) * splash.fan + (this.rnd.next() - 0.5) * 0.3;
    const speed = hard * (splash.slow + (splash.fast - splash.slow) * cellRandom(where, when, this.seed + 5)) * (0.85 + 0.3 * this.rnd.next());
    const ca = Math.cos(swing);
    const sa = Math.sin(swing);
    vx[i] = (ax * ca - ay * sa) * speed + vx[i] * 0.4;
    vy[i] = (ax * sa + ay * ca) * speed + vy[i] * 0.4;
    thrown[i] = splash.flight;
  }

  private warm(slab: number, x: number, y: number, t: number): void {
    const s = this.scene.slabs[slab];
    const { w, h } = this.heatSize[slab];
    const cx = Math.min(w - 1, Math.max(0, ((x - (s.cx - s.hx)) / POUR.heat.cell) | 0));
    const cy = Math.min(h - 1, Math.max(0, ((y - (s.cy - s.hy)) / POUR.heat.cell) | 0));
    const grid = this.heat[slab];
    const at = cx + cy * w;
    // The hottest metal warms the slab far more than metal that has already cooled, so the slab is hottest under the
    // landing and less so toward its ends.
    const t2 = t * t;
    grid[at] = Math.min(1, grid[at] + POUR.heat.gain * t2 * t2 * POUR_STEP);
  }

  private stepHeat(): void {
    const dt = POUR_STEP * HEAT_EVERY;
    const keep = Math.exp(-POUR.heat.loss * dt);
    const k = (POUR.heat.spread * dt) / (POUR.heat.cell * POUR.heat.cell);
    for (let s = 0; s < this.heat.length; s++) {
      const a = this.heat[s];
      const b = this.heatScratch[s];
      const { w, h } = this.heatSize[s];
      for (let yy = 0; yy < h; yy++) {
        for (let xx = 0; xx < w; xx++) {
          const at = xx + yy * w;
          const c = a[at];
          const l = a[xx > 0 ? at - 1 : at];
          const r = a[xx < w - 1 ? at + 1 : at];
          const up = a[yy > 0 ? at - w : at];
          const dn = a[yy < h - 1 ? at + w : at];
          b[at] = (c + k * (l + r + up + dn - 4 * c)) * keep;
        }
      }
      a.set(b);
    }
  }

  // Sparks and beads thrown by a hard landing. Each is its own small body: it flies, falls, bounces, rolls and cools.
  // They leave in bursts: a moment either throws sparks or does not, and those it throws go mostly one way.
  private throwSparks(x: number, y: number, nx: number, ny: number, impact: number, tx: number, ty: number, dens: number): void {
    const sp = POUR.spark;
    const where = Math.floor(x * POUR.splash.grain * 0.5);
    const when = Math.floor(this.time * POUR.splash.beat * 0.5);
    if (cellRandom(where, when, this.seed + 11) > sp.burst) return;
    const bare = dens < 0.8 ? sp.bareBoost : 1;
    if (this.rnd.next() > sp.perImpact * bare * Math.min(1.6, impact / 1200)) return;
    if (this.sparkCount >= this.maxSparks) return;
    const i = this.sparkCount++;
    const bead = this.rnd.next() < sp.beadShare ? 1 : 0;
    const aim = (cellRandom(where, when, this.seed + 13) - 0.5) * 2.5 + (this.rnd.next() - 0.5) * sp.spread;
    const quick = this.rnd.next();
    const speed = impact * (bead ? 0.2 + 0.3 * quick : 0.3 + 1.1 * quick * quick);
    const ca = Math.cos(aim);
    const sa = Math.sin(aim);
    this.sx[i] = x + nx * 1.5;
    this.sy[i] = y + ny * 1.5;
    this.svx[i] = (nx * ca - ny * sa) * speed + tx * 0.3;
    this.svy[i] = (nx * sa + ny * ca) * speed + ty * 0.3;
    this.sbead[i] = bead;
    this.smax[i] = bead ? this.rnd.range(sp.beadLife[0], sp.beadLife[1]) : this.rnd.range(sp.life[0], sp.life[1]);
    this.slife[i] = this.smax[i];
    this.ssize[i] = bead ? this.rnd.range(0.7, 1.5) : this.rnd.range(0.28, 0.6);
    this.sheat[i] = this.rnd.range(0.95, 1.2);
  }

  private stepSparks(): void {
    const { sx, sy, svx, svy, slife, smax, sheat, sbead, ssize, sd } = this;
    const sp = POUR.spark;
    const dt = POUR_STEP;
    const g = POUR.gravity * dt;
    const slabs = this.scene.slabs;
    const b = this.scene.bounds;
    const dragFine = Math.exp(-sp.drag * dt);
    const roll = Math.exp(-sp.roll * dt);
    for (let i = this.sparkCount - 1; i >= 0; i--) {
      slife[i] -= dt;
      svy[i] += g;
      if (!sbead[i]) { svx[i] *= dragFine; svy[i] *= dragFine; }
      sx[i] += svx[i] * dt;
      sy[i] += svy[i] * dt;
      for (let k = 0; k < slabs.length; k++) {
        const s = slabs[k];
        const r = ssize[i];
        if (Math.abs(sx[i] - s.cx) > s.hx + r || Math.abs(sy[i] - s.cy) > s.hy + r) continue;
        slabDistance(s, sx[i], sy[i], sd);
        const pen = sd[0] - r;
        if (pen >= 0) continue;
        sx[i] -= sd[1] * pen;
        sy[i] -= sd[2] * pen;
        const vn = svx[i] * sd[1] + svy[i] * sd[2];
        if (vn < 0) {
          const e = vn < -70 ? sp.bounce : 0;
          svx[i] -= (1 + e) * vn * sd[1];
          svy[i] -= (1 + e) * vn * sd[2];
          svx[i] *= roll;
          svy[i] *= roll;
          if (!sbead[i]) slife[i] -= 0.08;
        }
      }
      const age = Math.max(0, slife[i] / smax[i]);
      sheat[i] = sbead[i] ? 0.18 + 0.95 * age * age : 1.2 * Math.sqrt(age);
      if (slife[i] <= 0 || sx[i] < b.x0 || sx[i] > b.x1 || sy[i] > b.y1) {
        const l = --this.sparkCount;
        sx[i] = sx[l]; sy[i] = sy[l]; svx[i] = svx[l]; svy[i] = svy[l];
        slife[i] = slife[l]; smax[i] = smax[l]; sheat[i] = sheat[l]; sbead[i] = sbead[l]; ssize[i] = ssize[l];
      }
    }
  }
}
