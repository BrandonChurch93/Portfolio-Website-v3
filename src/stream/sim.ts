import { STREAM, STREAM_STEP, type StreamBudget } from './config';
import { hash } from './rand';
import { at, reachFor, type Route } from './route';

// Everything in the stream that moves by its own weight: the two leading ends, the sparks, the shards thrown loose at
// a landing, and the forks of arc. It only ever moves in fixed steps, and every random choice is a hash of a counter,
// so settle() followed by the same steps always gives the same frame.

const S = STREAM;
const tmp = new Float32Array(4);
const SPARK = 8;   // x, y, vx, vy, age, life, heat, kind (0 a spark, 1 a fine one, 2 one that has burst)
const LOOSE = 16;  // x, y, z, vx, vy, vz, qx, qy, qz, qw, wx, wy, wz, age, life, size (negative for glass)
const FORK = 8;    // x, y, angle, reach, age, life, seed, strength

export class StreamSim {
  time = 0;
  readonly head = [0, 0];
  readonly speed = [0, 0];
  readonly energy = [0, 0];
  readonly sparks: Float32Array;
  readonly loose: Float32Array;
  readonly forks: Float32Array;
  readonly looseSeed: Float32Array;
  // When each landing was last struck by a leading end, and how hard.
  readonly hitAt = new Float64Array([-100, -100]);
  readonly hit = new Float32Array(2);
  sparkCount = 0;
  looseCount = 0;
  forkCount = 0;
  private pace = 0;
  private readonly phase = new Float64Array(16);
  private readonly count = new Int32Array(16);
  private readonly maxForks = 40;

  constructor(private route: Route, private budget: StreamBudget, private seed: number) {
    this.sparks = new Float32Array(budget.sparks * SPARK);
    this.loose = new Float32Array(budget.loose * LOOSE);
    this.looseSeed = new Float32Array(budget.loose);
    this.forks = new Float32Array(this.maxForks * FORK);
  }

  private rnd(emitter: number, k: number, j: number): number {
    return hash(this.seed * 977 + emitter * 31 + j, k, emitter);
  }

  // How many times an emitter fires this step, and the counter of the first: a steady rate becomes whole events
  // tied to the clock, so two frozen frames a moment apart show the same events.
  private due(emitter: number, rate: number): number {
    const before = Math.floor(this.phase[emitter]);
    this.phase[emitter] += rate * STREAM_STEP;
    return Math.floor(this.phase[emitter]) - before;
  }

  // The leading ends at rest where a page scrolled to this line leaves them, with everything that flies run forward
  // from nothing so that it is in the air at time t.
  settle(line: number, t: number): void {
    const from = Math.floor((t - S.warmSeconds) / STREAM_STEP) * STREAM_STEP;
    this.time = from;
    this.pace = 0;
    this.sparkCount = this.looseCount = this.forkCount = 0;
    for (let b = 0; b < 2; b++) {
      this.head[b] = reachFor(this.route.branches[b], line);
      this.speed[b] = 0;
      this.energy[b] = 0;
    }
    this.phase.fill(0);
    this.count.fill(0);
    this.hitAt.fill(-100);
    const rates = this.rates(0, 0);
    for (let e = 0; e < rates.length; e++) { this.phase[e] = rates[e] * from; this.count[e] = Math.floor(this.phase[e]); }
    while (this.time + STREAM_STEP <= t + 1e-9) this.step(line, 0);
  }

  // For a still that only follows the scroll: the leading ends where the scroll puts them, and nothing in the air.
  rest(line: number): void {
    for (let b = 0; b < 2; b++) {
      this.head[b] = reachFor(this.route.branches[b], line);
      this.speed[b] = 0;
      this.energy[b] = 0;
    }
    this.sparkCount = this.looseCount = this.forkCount = 0;
  }

  // Emitters: 0 and 1 the sparks of each leading end, 2 the sparks along the core, 3 and 4 sparks at the strike and
  // the landing, 5 and 6 shards thrown there, 7 and 8 forks at the leading ends, 9 and 10 forks at the landings.
  private rates(e0: number, e1: number): number[] {
    const K = S.sparks, u = this.route.unit;
    const lit = (this.head[0] + Math.max(0, this.head[1] - this.route.split)) / (1000 * u);
    const [strike, land] = this.route.landings;
    const hit = this.head[0] >= strike.s ? 1 : 0, landed = this.head[0] >= land.s ? 1 : 0;
    const one = this.head[1] <= this.route.split ? 0 : 1;
    return [
      K.rest + K.fast * e0 ** 1.4, one * (K.rest + K.fast * e1 ** 1.4), K.along * lit, hit * K.landing, landed * K.landing,
      hit * S.loose.trickle * 0.7, landed * S.loose.trickle,
      S.arc.rate + S.arc.rateFast * e0, one * (S.arc.rate + S.arc.rateFast * e1), hit * 5, landed * 6,
    ];
  }

  step(line: number, pace: number): void {
    const dt = STREAM_STEP, H = S.head, u = this.route.unit;
    this.time += dt;
    this.pace = Math.max(Math.abs(pace), this.pace * Math.exp(-dt / H.hold));
    const lim = Math.min(H.most * u, Math.max(H.creep * u, this.pace));
    const was = [this.head[0], this.head[1]];
    for (let b = 0; b < 2; b++) {
      const br = this.route.branches[b];
      const err = reachFor(br, line) - this.head[b];
      // Drawn back up the page it may go quicker than it came: a retreat is not the stream racing.
      const goal = Math.max(-Math.max(lim * 1.5, H.creep * u * 2.5), Math.min(lim, err * H.follow));
      this.speed[b] += (goal - this.speed[b]) * (1 - Math.exp(-H.quick * dt));
      let move = this.speed[b] * dt;
      if (Math.abs(move) > Math.abs(err)) { move = err; this.speed[b] *= 0.5; }
      this.head[b] = Math.max(0, Math.min(br.len, this.head[b] + move));
      const want = Math.min(1.3, Math.max(0, this.speed[b]) / (H.pace * u));
      this.energy[b] += (want - this.energy[b]) * (1 - Math.exp(-(want > this.energy[b] ? H.rise : H.fall) * dt));
    }

    const rates = this.rates(this.energy[0], this.energy[1]);
    const [strike, land] = this.route.landings;
    for (let b = 0; b < 2; b++) {
      for (let n = this.due(b, rates[b]); n > 0; n--) this.headSpark(b, this.count[b]++);
      for (let n = this.due(7 + b, rates[7 + b]); n > 0; n--) this.headFork(b, 7 + b, this.count[7 + b]++);
    }
    for (let n = this.due(2, rates[2]); n > 0; n--) this.coreSpark(this.count[2]++);
    [strike, land].forEach((L, i) => {
      for (let n = this.due(3 + i, rates[3 + i]); n > 0; n--) this.landSpark(i, this.count[3 + i]++, 1);
      for (let n = this.due(5 + i, rates[5 + i]); n > 0; n--) this.throwShard(i, this.count[5 + i]++, 0.25);
      for (let n = this.due(9 + i, rates[9 + i]); n > 0; n--) this.landFork(i, 9 + i, this.count[9 + i]++);
      if (was[0] < L.s && this.head[0] >= L.s) {
        const hard = Math.min(1, this.speed[0] / (H.pace * u)) ** 0.6;
        for (let k = Math.round(6 + S.loose.burst * hard); k > 0; k--) this.throwShard(i, this.count[5 + i]++, 0.35 + hard);
        for (let k = Math.round(20 + 90 * hard); k > 0; k--) this.landSpark(i, this.count[3 + i]++, 1 + hard);
        for (let k = 4; k > 0; k--) this.landFork(i, 9 + i, this.count[9 + i]++);
        this.hitAt[i] = this.time;
        this.hit[i] = 0.4 + 0.6 * hard;
      }
    });

    this.moveSparks(dt);
    this.moveLoose(dt);
    let f = 0;
    for (let i = 0; i < this.forkCount; i++) {
      const o = i * FORK;
      this.forks[o + 4] += dt;
      if (this.forks[o + 4] >= this.forks[o + 5]) continue;
      if (f !== i) this.forks.copyWithin(f * FORK, o, o + FORK);
      f++;
    }
    this.forkCount = f;
  }

  private spark(x: number, y: number, vx: number, vy: number, life: number, heat: number, kind: number): void {
    if (this.sparkCount >= this.budget.sparks) return;
    const o = this.sparkCount++ * SPARK;
    this.sparks.set([x, y, vx, vy, 0, life, heat, kind], o);
  }

  private headSpark(b: number, k: number): void {
    const K = S.sparks, u = this.route.unit, e = this.energy[b], r = (j: number) => this.rnd(b, k, j);
    at(this.route.branches[b], this.head[b], tmp);
    // At rest they drift off to the sides and fall. Moving, they are swept back along the way it came.
    const side = r(0) < 0.5 ? -1 : 1, back = 0.15 + 1.1 * e, wide = (0.35 + r(1)) * side;
    const dx = -tmp[2] * back - tmp[3] * wide, dy = -tmp[3] * back + tmp[2] * wide, len = Math.hypot(dx, dy) || 1;
    const a = Math.atan2(dy / len, dx / len) + (r(2) + r(3) - 1) * 0.75;
    const v = (K.speed[0] + (K.speed[1] - K.speed[0]) * r(4) * r(5)) * u * (0.9 + 0.7 * e);
    this.spark(tmp[0], tmp[1], Math.cos(a) * v, Math.sin(a) * v, K.life[0] + (K.life[1] - K.life[0]) * r(6) * r(7), 0.55 + 0.45 * r(8), 0);
  }

  private coreSpark(k: number): void {
    const K = S.sparks, u = this.route.unit, r = (j: number) => this.rnd(2, k, j);
    const b = r(0) < 0.5 || this.head[1] <= this.route.split ? 0 : 1;
    const from = b === 1 ? this.route.split : 0;
    at(this.route.branches[b], from + r(1) * Math.max(0, this.head[b] - from), tmp);
    const side = r(2) < 0.5 ? -1 : 1, a = Math.atan2(tmp[2] * side, -tmp[3] * side) + (r(3) - 0.5) * 1.3;
    const v = (K.speed[0] + (K.speed[1] - K.speed[0]) * 0.35 * r(4)) * u;
    this.spark(tmp[0], tmp[1], Math.cos(a) * v, Math.sin(a) * v, K.life[0] + (K.life[1] - K.life[0]) * 0.6 * r(5), 0.4 + 0.4 * r(6), 0);
  }

  private landSpark(i: number, k: number, hard: number): void {
    const K = S.sparks, u = this.route.unit, L = this.route.landings[i], r = (j: number) => this.rnd(3 + i, k, j);
    const way = L.out === 0 ? (r(0) < 0.5 ? -1 : 1) : r(0) < 0.82 ? 1 : -1;
    const a = -Math.PI / 2 + way * (0.25 + 1.05 * r(1));
    const v = (K.speed[0] + (K.speed[1] - K.speed[0]) * r(2) * r(3)) * u * (0.5 + 0.5 * hard);
    this.spark(L.x + way * r(4) * 12 * u, L.y - 2 * u, Math.cos(a) * v, Math.sin(a) * v, K.life[0] + (K.life[1] - K.life[0]) * r(5) * r(6), 0.5 + 0.5 * r(7), 0);
  }

  private throwShard(i: number, k: number, hard: number): void {
    if (this.looseCount >= this.budget.loose) return;
    const u = this.route.unit, L = this.route.landings[i], r = (j: number) => this.rnd(5 + i, k, j);
    const way = L.out === 0 ? (r(0) < 0.5 ? -1 : 1) : r(0) < 0.8 ? 1 : -1;
    const glass = r(1) < S.shards.glass;
    const size = (S.shards.small + (S.shards.large * 0.8 - S.shards.small) * r(2) ** 2.2) * u;
    // Thrown up and outward in a fan: nearly straight up at its middle, flatter toward the way things leave.
    const lean = -Math.PI / 2 + way * (0.12 + 1.0 * r(3));
    const v = (150 + 420 * r(4) * (0.4 + 0.6 * r(5))) * u * (0.45 + 0.5 * Math.min(1, hard));
    const vx = Math.cos(lean) * v, vy = Math.sin(lean) * v;
    const o = this.looseCount * LOOSE;
    const q = [r(6) - 0.5, r(7) - 0.5, r(8) - 0.5, r(9) - 0.5], ql = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    const spin = 3 + 9 * r(10);
    const w = [r(11) - 0.5, r(12) - 0.5, r(13) - 0.5], wl = Math.hypot(w[0], w[1], w[2]) || 1;
    const life = S.loose.life[0] + (S.loose.life[1] - S.loose.life[0]) * r(14);
    this.loose.set([
      L.x + way * r(15) * 14 * u, L.y - size - r(16) * 6 * u, (r(17) - 0.5) * 30 * u, vx, vy, (r(18) - 0.5) * 60 * u,
      q[0] / ql, q[1] / ql, q[2] / ql, q[3] / ql, (w[0] / wl) * spin, (w[1] / wl) * spin, (w[2] / wl) * spin, 0, life, glass ? -size : size,
    ], o);
    this.looseSeed[this.looseCount++] = r(19);
  }

  private fork(x: number, y: number, angle: number, reach: number, life: number, seed: number, strength: number): void {
    if (this.forkCount >= this.maxForks) return;
    this.forks.set([x, y, angle, reach, 0, life, seed, strength], this.forkCount++ * FORK);
  }

  private headFork(b: number, e: number, k: number): void {
    const A = S.arc, u = this.route.unit, en = this.energy[b], r = (j: number) => this.rnd(e, k, j);
    at(this.route.branches[b], this.head[b], tmp);
    // Most reach the way it is going. A few are long and the rest short, so it never makes an even fan.
    const angle = Math.atan2(tmp[3], tmp[2]) + (r(0) + r(1) - 1) * 1.5 + (r(6) < 0.2 ? (r(7) - 0.5) * 3.4 : 0);
    const reach = (A.reach[0] + (A.reach[1] - A.reach[0]) * r(2) ** 3) * u * (0.7 + 0.9 * en);
    this.fork(tmp[0], tmp[1], angle, reach, A.life[0] + (A.life[1] - A.life[0]) * r(3), r(4) * 1000, 0.55 + 0.45 * r(5));
  }

  private landFork(i: number, e: number, k: number): void {
    const A = S.arc, u = this.route.unit, L = this.route.landings[i], r = (j: number) => this.rnd(e, k, j);
    const way = r(0) < 0.5 ? -1 : 1;
    const angle = -Math.PI / 2 + way * (0.9 + 0.55 * r(1));
    this.fork(L.x + way * r(2) * 8 * u, L.y - 3 * u, angle, (A.reach[0] + (A.reach[1] - A.reach[0]) * 0.5 * r(3)) * u, A.life[0] + (A.life[1] - A.life[0]) * r(4), r(5) * 1000, 0.4 + 0.4 * r(6));
  }

  private moveSparks(dt: number): void {
    const K = S.sparks, u = this.route.unit, drag = Math.exp(-K.drag * dt), p = this.sparks, boxes = this.route.boxes;
    let n = 0;
    const live = this.sparkCount;
    for (let i = 0; i < live; i++) {
      const o = i * SPARK;
      let age = p[o + 4] + dt;
      const life = p[o + 5];
      if (age >= life) continue;
      let x = p[o], y = p[o + 1], vx = p[o + 2] * drag, vy = (p[o + 3] + K.gravity * u * dt) * drag, kind = p[o + 7];
      const px = x, py = y;
      x += vx * dt;
      y += vy * dt;
      let dead = false;
      for (const b of boxes) {
        if (x < b.l || x > b.r || y < b.t || y > b.b) continue;
        if (py <= b.t + 0.5 && vy > 0) { y = b.t - (y - b.t) * K.bounce; vy *= -K.bounce; vx *= 0.7; } else if (px < b.l || px > b.r) { x = px; vx *= -K.bounce; } else dead = true;
      }
      if (dead) continue;
      // Some burst into finer sparks partway through their flight, as a grinder's do.
      if (kind === 0 && age > life * 0.5 && hash(Math.round(life * 1e6), 11, this.seed) < K.fork) {
        kind = 2;
        const v = Math.hypot(vx, vy), a = Math.atan2(vy, vx);
        for (let k = 0; k < 3; k++) {
          const h = hash(k, Math.round(life * 1e5), i);
          const fa = a + (h - 0.5) * 1.9, fv = v * (0.5 + 0.7 * hash(k + 5, Math.round(life * 1e5), i));
          this.spark(x, y, Math.cos(fa) * fv, Math.sin(fa) * fv, 0.1 + 0.2 * h, p[o + 6] * 0.9, 1);
        }
        age = Math.max(age, life - 0.07);
      }
      const w = n++ * SPARK;
      p[w] = x; p[w + 1] = y; p[w + 2] = vx; p[w + 3] = vy; p[w + 4] = age; p[w + 5] = life; p[w + 6] = p[o + 6]; p[w + 7] = kind;
    }
    // Sparks born of a burst this step were added past the live ones: close the gap.
    for (let i = live; i < this.sparkCount; i++) { p.copyWithin(n * SPARK, i * SPARK, (i + 1) * SPARK); n++; }
    this.sparkCount = n;
  }

  private moveLoose(dt: number): void {
    const K = S.loose, u = this.route.unit, p = this.loose, boxes = this.route.boxes, lip = this.route.landings[2];
    let n = 0;
    for (let i = 0; i < this.looseCount; i++) {
      const o = i * LOOSE;
      const age = p[o + 13] + dt, life = p[o + 14];
      if (age >= life) continue;
      const r = Math.abs(p[o + 15]) * 0.55;
      let x = p[o], y = p[o + 1], vx = p[o + 3], vy = p[o + 4] + K.gravity * u * dt;
      const py = y;
      x += vx * dt;
      y += vy * dt;
      let wx = p[o + 10], wy = p[o + 11], wz = p[o + 12];
      for (const b of boxes) {
        if (x < b.l - r || x > b.r + r || y + r < b.t || y > b.b) continue;
        if (py + r <= b.t + 1 && vy > 0 && x > b.l && x < b.r) {
          y = b.t - r;
          if (vy > 55 * u) {
            vy *= -K.bounce;
            vx *= K.grip;
            // A bounce turns some of its fall into spin.
            const k = 0.6 + 0.8 * hash(i, Math.round(age * 997), this.seed);
            wz = -vx / Math.max(r, 1) * 0.5 * k; wx = wx * 0.5 + (hash(i, 3, Math.round(age * 997)) - 0.5) * 9; wy = wy * 0.5 + (hash(i, 4, Math.round(age * 997)) - 0.5) * 9;
          } else {
            // Too slow to bounce, it skitters along the surface with the flow and off the end. Nothing comes to rest.
            vy = 0;
            const way = b === boxes[1] ? Math.sign(lip.x - (b.l + b.r) / 2) : Math.sign(x - (b.l + b.r) / 2) || 1;
            vx += (way * 95 * u - vx) * (1 - Math.exp(-3 * dt));
            wx *= Math.exp(-4 * dt); wy *= Math.exp(-4 * dt); wz = wz * Math.exp(-4 * dt) - (vx / Math.max(r, 1)) * 0.2 * (1 - Math.exp(-4 * dt));
          }
        } else if (y > b.t + 1) {
          const left = x < (b.l + b.r) / 2;
          x = left ? b.l - r : b.r + r;
          if (left === vx > 0) vx *= -K.bounce;
        }
      }
      // Turn it by its spin.
      let qx = p[o + 6], qy = p[o + 7], qz = p[o + 8], qw = p[o + 9];
      const hx = wx * dt * 0.5, hy = wy * dt * 0.5, hz = wz * dt * 0.5;
      const nx = qx + hx * qw + hy * qz - hz * qy, ny = qy - hx * qz + hy * qw + hz * qx, nz = qz + hx * qy - hy * qx + hz * qw, nw = qw - hx * qx - hy * qy - hz * qz;
      const nl = Math.hypot(nx, ny, nz, nw) || 1;
      qx = nx / nl; qy = ny / nl; qz = nz / nl; qw = nw / nl;
      const w = n * LOOSE;
      p[w] = x; p[w + 1] = y; p[w + 2] = p[o + 2] + p[o + 5] * dt; p[w + 3] = vx; p[w + 4] = vy; p[w + 5] = p[o + 5] * Math.exp(-1.2 * dt);
      p[w + 6] = qx; p[w + 7] = qy; p[w + 8] = qz; p[w + 9] = qw; p[w + 10] = wx; p[w + 11] = wy; p[w + 12] = wz;
      p[w + 13] = age; p[w + 14] = life; p[w + 15] = p[o + 15];
      this.looseSeed[n++] = this.looseSeed[i];
    }
    this.looseCount = n;
  }
}

export const SPARK_FLOATS = SPARK;
export const LOOSE_FLOATS = LOOSE;
export const FORK_FLOATS = FORK;
