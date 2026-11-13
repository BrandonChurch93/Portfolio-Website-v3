import { STREAM, STREAM_STEP, type StreamBudget } from './config';
import { hash } from './rand';
import { at, railFrame, reachFor, UP, type Landing, type Route } from './route';

// Everything in the stream that moves by its own weight: the two leading ends, the sparks, the shards thrown loose at
// a landing, and the forks of arc. It only ever moves in fixed steps, and every random choice is a hash of a counter,
// so settle() followed by the same steps always gives the same frame.

const S = STREAM;
const tmp = new Float32Array(4);
const SPARK = 8;   // x, y, vx, vy, age, life, heat, kind (0 a spark, 1 a fine one, 2 one that has burst)
const LOOSE = 18;  // x, y, z, vx, vy, vz, qx, qy, qz, qw, wx, wy, wz, age, life, size (negative for a clear one), 1 if the flow will carry it and 2 once it does, the height it was thrown from
const FORK = 8;    // x, y, angle, reach, age, life, seed, strength
// A count spread across the whole range of numbers before it is hashed. Hashed as they stand, counts that follow one
// another gave gaps that were nearly even and shards that mostly went the same way.
const scatter = (n: number) => Math.imul(n + 1, 0x9e3779b1) >>> 8;
// Emitters. 0 and 1 are the sparks of each leading end, 2 the sparks along the core, 7 and 8 the forks of arc at the
// leading ends. Each landing has three: its sparks, the shards it throws, and its forks. The first two landings keep
// the numbers the test shot gave them (3 and 4, 5 and 6, 9 and 10), so the test shot draws what it always drew.
const SPARKS = 0, SHARDS = 1, FORKS = 2;
const emitter = (landing: number, what: number) => (landing < 2 ? [3, 5, 9][what] + landing : 11 + (landing - 2) * 3 + what);

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
  readonly hitAt: Float64Array;
  readonly hit: Float32Array;
  sparkCount = 0;
  looseCount = 0;
  forkCount = 0;
  private pace = 0;
  private readonly phase: Float64Array;
  private readonly count: Int32Array;
  readonly maxForks: number;
  // When each landing next throws its single shard at rest, and which one it is.
  private readonly nextAt: Float64Array;
  private readonly nextN: Int32Array;
  private readonly frames: ReturnType<typeof railFrame>[];

  constructor(private route: Route, private budget: StreamBudget, private seed: number, private sizes: [number, number]) {
    const landings = route.landings.length, emitters = Math.max(16, emitter(landings, 0));
    this.sparks = new Float32Array(budget.sparks * SPARK);
    this.loose = new Float32Array(budget.loose * LOOSE);
    this.looseSeed = new Float32Array(budget.loose);
    this.maxForks = 40 + 4 * Math.max(0, landings - 2);
    this.forks = new Float32Array(this.maxForks * FORK);
    this.hitAt = new Float64Array(landings).fill(-100);
    this.hit = new Float32Array(landings);
    this.phase = new Float64Array(emitters);
    this.count = new Int32Array(emitters);
    this.nextAt = new Float64Array(landings);
    this.nextN = new Int32Array(landings);
    this.frames = route.rails.map(railFrame);
  }

  // Whether the second side's leading end is its own: past the parting, and not yet where the two sides meet again.
  private own(): boolean {
    return this.head[1] > this.route.split && this.head[1] < this.route.join[1];
  }

  // Past where the sides meet they are one stream, and the second side's end is kept exactly on the first's.
  private joined(): void {
    const [a, b] = this.route.join;
    if (this.head[0] <= a) return;
    this.head[1] = Math.min(this.route.branches[1].len, b + (this.head[0] - a));
    this.speed[1] = this.speed[0];
    this.energy[1] = this.energy[0];
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
    this.joined();
    this.phase.fill(0);
    this.count.fill(0);
    this.hitAt.fill(-100);
    const rates = this.rates(0, 0);
    for (let e = 0; e < rates.length; e++) { this.phase[e] = rates[e] * from; this.count[e] = Math.floor(this.phase[e]); }
    for (let i = 0; i < this.route.landings.length; i++) {
      let n = 0, at = this.gap(i, 0) * (i < 2 ? 0.3 + 0.5 * i : 0.1 + 0.9 * hash(i, 41, this.seed));
      while (at <= from) at += this.gap(i, ++n);
      this.nextN[i] = n;
      this.nextAt[i] = at;
    }
    while (this.time + STREAM_STEP <= t + 1e-9) this.step(line, 0);
  }

  // For a still that only follows the scroll: the leading ends where the scroll puts them, and nothing in the air.
  rest(line: number): void {
    for (let b = 0; b < 2; b++) {
      this.head[b] = reachFor(this.route.branches[b], line);
      this.speed[b] = 0;
      this.energy[b] = 0;
    }
    this.joined();
    this.sparkCount = this.looseCount = this.forkCount = 0;
    // A still keeps a crackle of arc at each leading end, always the same one.
    for (let b = 0; b < 2; b++) {
      if (b === 1 && !this.own()) continue;
      for (let k = 0; k < 7; k++) this.headFork(b, 7 + b, k);
    }
    for (let i = 0; i < this.forkCount; i++) { this.forks[i * FORK + 4] = 0.3; this.forks[i * FORK + 5] = 1; }
  }

  // How often each emitter fires, each second. The shards a landing throws have no steady rate: see now().
  private rates(e0: number, e1: number): number[] {
    const K = S.sparks, u = this.route.unit;
    const lit = (this.head[0] + Math.max(0, Math.min(this.head[1], this.route.join[1]) - this.route.split)) / (1000 * u);
    const one = this.own() ? 1 : 0;
    const out = new Array<number>(this.phase.length).fill(0);
    out[0] = K.rest + K.fast * e0 ** 1.4;
    out[1] = one * (K.rest + K.fast * e1 ** 1.4);
    out[2] = K.along * lit;
    out[7] = S.arc.rate + S.arc.rateFast * e0;
    out[8] = one * (S.arc.rate + S.arc.rateFast * e1);
    this.route.landings.forEach((L, i) => {
      const reached = this.head[L.side] >= L.s ? 1 : 0;
      out[emitter(i, SPARKS)] = reached * K.landing * L.glow;
      out[emitter(i, FORKS)] = reached * L.arc;
    });
    return out;
  }

  step(line: number, pace: number): void {
    const dt = STREAM_STEP, H = S.head, u = this.route.unit;
    this.time += dt;
    this.pace = Math.max(Math.abs(pace), this.pace * Math.exp(-dt / H.hold));
    const was = [this.head[0], this.head[1]];
    for (let b = 0; b < 2; b++) {
      const br = this.route.branches[b];
      const err = reachFor(br, line) - this.head[b];
      // It goes down the page no faster than the page was scrolled. Across the page, along the title or the card,
      // it may go faster, or it would be left behind by a scroll that has no sideways part to it.
      at(br, this.head[b], tmp);
      const lim = Math.min(H.most * u, Math.max(H.creep * u, this.pace)) / Math.max(Math.abs(tmp[3]), H.across);
      const goal = Math.max(-lim, Math.min(lim, err * H.follow));
      this.speed[b] += (goal - this.speed[b]) * (1 - Math.exp(-H.quick * dt));
      let move = this.speed[b] * dt;
      if (Math.abs(move) > Math.abs(err)) { move = err; this.speed[b] *= 0.5; }
      this.head[b] = Math.max(0, Math.min(br.len, this.head[b] + move));
      const want = Math.min(1.5, Math.max(0, this.speed[b]) / (H.pace * u));
      this.energy[b] += (want - this.energy[b]) * (1 - Math.exp(-(want > this.energy[b] ? H.rise : H.fall) * dt));
    }
    this.joined();

    const rates = this.rates(this.energy[0], this.energy[1]);
    for (let b = 0; b < 2; b++) {
      for (let n = this.due(b, rates[b]); n > 0; n--) this.headSpark(b, this.count[b]++);
      for (let n = this.due(7 + b, rates[7 + b]); n > 0; n--) this.headFork(b, 7 + b, this.count[7 + b]++);
    }
    for (let n = this.due(2, rates[2]); n > 0; n--) this.coreSpark(this.count[2]++);
    this.route.landings.forEach((L, i) => {
      const sparks = emitter(i, SPARKS), shards = emitter(i, SHARDS), forks = emitter(i, FORKS), b = L.side;
      for (let n = this.due(sparks, rates[sparks]); n > 0; n--) this.landSpark(i, this.count[sparks]++, 1);
      if (this.head[b] >= L.s) this.now(i);
      for (let n = this.due(forks, rates[forks]); n > 0; n--) this.landFork(i, forks, this.count[forks]++);
      if (was[b] < L.s && this.head[b] >= L.s) {
        // A contact is as strong as the arrival, and a lighter one throws its share of a full strike.
        const hard = Math.min(1, this.speed[b] / (H.pace * u)) ** 0.6;
        // The two sides arrive at the same pace, so each landing past the test shot's two throws a number of its own.
        const own = i < 2 ? 1 : 0.8 + 0.4 * hash(i, 53, this.seed);
        for (let k = Math.round((S.loose.burst[0] + S.loose.burst[1] * hard) * L.force * own); k > 0; k--) this.throwShard(i, this.count[shards]++, (0.35 + hard) * L.force);
        for (let k = Math.round((20 + 90 * hard) * L.force); k > 0; k--) this.landSpark(i, this.count[sparks]++, 1 + hard);
        for (let k = Math.round(4 * L.force); k > 0; k--) this.landFork(i, forks, this.count[forks]++);
        this.hitAt[i] = this.time;
        this.hit[i] = (0.4 + 0.6 * hard) * L.force;
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
    const from = b === 1 ? this.route.split : 0, to = b === 1 ? Math.min(this.head[1], this.route.join[1]) : this.head[0];
    at(this.route.branches[b], from + r(1) * Math.max(0, to - from), tmp);
    const side = r(2) < 0.5 ? -1 : 1, a = Math.atan2(tmp[2] * side, -tmp[3] * side) + (r(3) - 0.5) * 1.3;
    const v = (K.speed[0] + (K.speed[1] - K.speed[0]) * 0.35 * r(4)) * u;
    this.spark(tmp[0], tmp[1], Math.cos(a) * v, Math.sin(a) * v, K.life[0] + (K.life[1] - K.life[0]) * 0.6 * r(5), 0.4 + 0.4 * r(6), 0);
  }

  // Where something thrown from a landing starts: so far along the surface, and so far out from it. A top is worked
  // out as the test shot always worked it out.
  private from(L: Landing, along: number, out: number, to: Float32Array): void {
    if (L.face === UP) { to[0] = L.x + along; to[1] = L.y - out; return; }
    const nx = Math.cos(L.face), ny = Math.sin(L.face);
    to[0] = L.x - ny * along + nx * out;
    to[1] = L.y + nx * along + ny * out;
  }

  private landSpark(i: number, k: number, hard: number): void {
    const K = S.sparks, u = this.route.unit, L = this.route.landings[i], r = (j: number) => this.rnd(emitter(i, SPARKS), k, j);
    const way = L.out === 0 ? (r(0) < 0.5 ? -1 : 1) : (r(0) < 0.82 ? 1 : -1) * L.out;
    const a = L.face + way * (0.25 + 1.05 * r(1));
    const v = (K.speed[0] + (K.speed[1] - K.speed[0]) * r(2) * r(3)) * u * (0.5 + 0.5 * hard);
    this.from(L, way * r(4) * 12 * u, 2 * u, tmp);
    this.spark(tmp[0], tmp[1], Math.cos(a) * v, Math.sin(a) * v, K.life[0] + (K.life[1] - K.life[0]) * r(5) * r(6), 0.5 + 0.5 * r(7), 0);
  }

  private throwShard(i: number, k: number, hard: number, carried = 0): void {
    if (this.looseCount >= this.budget.loose) return;
    const u = this.route.unit, L = this.route.landings[i], r = (j: number) => this.rnd(emitter(i, SHARDS), k, j);
    const way = L.out === 0 ? (r(0) < 0.5 ? -1 : 1) : (r(0) < 0.8 ? 1 : -1) * L.out;
    const clear = r(1) < S.shards.clear;
    const size = (this.sizes[0] * S.loose.least + (this.sizes[1] - this.sizes[0]) * r(2) ** 1.8) * u;
    // Thrown out from the surface in a fan: nearly straight out at its middle, flatter toward the way things leave.
    const lean = L.face + way * (0.12 + 1.0 * r(3));
    const v = (170 + 450 * r(4) * (0.4 + 0.6 * r(5))) * u * (0.45 + 0.5 * Math.min(1, hard));
    const vx = Math.cos(lean) * v, vy = Math.sin(lean) * v;
    const o = this.looseCount * LOOSE;
    const q = [r(6) - 0.5, r(7) - 0.5, r(8) - 0.5, r(9) - 0.5], ql = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    const spin = 3 + 9 * r(10);
    const w = [r(11) - 0.5, r(12) - 0.5, r(13) - 0.5], wl = Math.hypot(w[0], w[1], w[2]) || 1;
    const life = carried ? S.loose.lone : S.loose.life[0] + (S.loose.life[1] - S.loose.life[0]) * r(14);
    if (L.face === UP) { tmp[0] = L.x + way * r(15) * 14 * u; tmp[1] = L.y - size - r(16) * 6 * u; } else this.from(L, way * r(15) * 14 * u, size + r(16) * 6 * u, tmp);
    this.loose.set([
      tmp[0], tmp[1], (r(17) - 0.5) * 30 * u, vx, vy, (r(18) - 0.5) * 60 * u,
      q[0] / ql, q[1] / ql, q[2] / ql, q[3] / ql, (w[0] / wl) * spin, (w[1] / wl) * spin, (w[2] / wl) * spin, 0, life, clear ? -size : size, carried, tmp[1],
    ], o);
    this.looseSeed[this.looseCount++] = r(19);
  }

  // While a landing is not being struck it throws a single shard now and then, at uneven gaps, never a steady flow.
  // The gaps are counted out from the start of time, each a hash of its number, so the same moment always throws the
  // same shard.
  private gap(i: number, n: number): number {
    const [least, most] = S.loose.now;
    return (least + (most - least) * hash(scatter(n), emitter(i, SHARDS), this.seed)) * this.route.landings[i].every;
  }

  private now(i: number): void {
    while (this.nextAt[i] <= this.time) {
      if (this.nextAt[i] > this.time - STREAM_STEP - 1e-9) this.throwShard(i, scatter(this.nextN[i]), S.loose.toss, 1);
      this.nextAt[i] += this.gap(i, ++this.nextN[i]);
    }
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
    const reach = (A.reach[0] + (A.reach[1] - A.reach[0]) * r(2) ** 2) * u * (0.85 + 0.45 * en);
    this.fork(tmp[0], tmp[1], angle, reach, A.life[0] + (A.life[1] - A.life[0]) * r(3), r(4) * 1000, 0.55 + 0.45 * r(5));
  }

  private landFork(i: number, e: number, k: number): void {
    const A = S.arc, u = this.route.unit, L = this.route.landings[i], r = (j: number) => this.rnd(e, k, j);
    const way = r(0) < 0.5 ? -1 : 1;
    const angle = L.face + way * (0.9 + 0.55 * r(1));
    this.from(L, way * r(2) * 8 * u, 3 * u, tmp);
    this.fork(tmp[0], tmp[1], angle, (A.reach[0] + (A.reach[1] - A.reach[0]) * 0.25 * r(3)) * u, A.life[0] + (A.life[1] - A.life[0]) * r(4), r(5) * 1000, 0.4 + 0.4 * r(6));
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
      for (const post of this.route.posts) {
        const dx = x - post.x, dy = y - post.y, d = Math.hypot(dx, dy);
        if (d >= post.r) continue;
        const nx = d ? dx / d : 0, ny = d ? dy / d : -1, into = vx * nx + vy * ny;
        x = post.x + nx * post.r; y = post.y + ny * post.r;
        if (into < 0) { vx -= (1 + K.bounce) * into * nx; vy -= (1 + K.bounce) * into * ny; }
      }
      for (let k = 0; k < this.frames.length; k++) {
        const rail = this.route.rails[k], f = this.frames[k], ox = x - rail.ax, oy = y - rail.ay, along = ox * f.ex + oy * f.ey, out = ox * f.nx + oy * f.ny;
        if (along < 0 || along > f.len || Math.abs(out) >= rail.half) continue;
        const face = out >= 0 ? 1 : -1, into = (vx * f.nx + vy * f.ny) * face, back = face * rail.half - out;
        x += f.nx * back; y += f.ny * back;
        if (into < 0) { vx -= (1 + K.bounce) * into * face * f.nx; vy -= (1 + K.bounce) * into * face * f.ny; }
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
    const K = S.loose, u = this.route.unit, p = this.loose, boxes = this.route.boxes, flows = this.route.flows;
    let n = 0;
    for (let i = 0; i < this.looseCount; i++) {
      const o = i * LOOSE;
      const age = p[o + 13] + dt;
      if (age >= p[o + 14]) continue;
      const r = Math.abs(p[o + 15]) * 0.55;
      let x = p[o], y = p[o + 1], vx = p[o + 3], vy = p[o + 4] + K.gravity * u * dt;
      const py = y;
      x += vx * dt;
      y += vy * dt;
      let wx = p[o + 10], wy = p[o + 11], wz = p[o + 12];
      let life = p[o + 14];
      if (y - p[o + 17] > this.route.fall) life = Math.min(life, age + K.fades * 0.5);
      for (let bi = 0; bi < boxes.length; bi++) {
        const b = boxes[bi];
        if (x < b.l - r || x > b.r + r || y + r < b.t || y > b.b) continue;
        if (py + r <= b.t + 1 && vy > 0 && x > b.l && x < b.r) {
          y = b.t - r;
          const at_ = Math.round(age * 997);
          if (vy > K.settle * u) {
            // It lands on a different point of itself each time, so no two bounces keep the same share of the fall
            // or leave the same way, and each turns some of the fall into spin.
            const k = 0.75 + 0.5 * hash(i, at_, this.seed);
            const kept = vx * K.grip, kicked = kept + (hash(i, 5, at_) - 0.5) * vy * 0.3;
            vx = kicked * vx < 0 ? kept * 0.3 : kicked;
            vy *= -K.bounce * k;
            wz = -vx / Math.max(r, 1) * 0.5 * k; wx = wx * 0.5 + (hash(i, 3, at_) - 0.5) * 9; wy = wy * 0.5 + (hash(i, 4, at_) - 0.5) * 9;
          } else {
            // Too slow to bounce. It keeps its own momentum and nothing else moves it: the flow neither turns it
            // round nor carries it along. It skids the way it was going, stops, and fades. One still moving when it
            // reaches the end of the surface goes off it and falls. Carried along by the flow, every shard of a burst
            // that came back down reached the end in the same second and left it together, a second wave.
            // The one exception is the single shard thrown at rest. Going the way the stream runs, the flow carries
            // it along the surface and off the far end, where it falls. One at a time cannot make a wave.
            const way = flows[bi] || Math.sign(x - (b.l + b.r) / 2) || 1;
            if (p[o + 16] > 0.5 && vx * way > 0) {
              const carry = K.carry * u * (0.5 + this.looseSeed[i]);
              vx += (way * carry - vx) * (1 - Math.exp(-12 * dt));
              // It does not slide: every so often it catches on a point and skips.
              const skip = hash(i, at_, 7) < K.skip * dt;
              vy = skip ? -(0.6 + 0.9 * hash(i, at_, 8)) * K.settle * u : 0;
              if (skip) { wx += (hash(i, at_, 9) - 0.5) * 12; wz -= way * 6; }
              // Its life is set once, as the flow takes it. Set again each step, its size wavered as it skipped.
              if (p[o + 16] < 1.5) { life = age + Math.abs((way > 0 ? b.r : b.l) - x) / carry + K.spill; p[o + 16] = 2; }
            } else {
              vy = 0;
              vx *= Math.exp(-K.skid * dt);
              life = Math.min(life, age + K.fades);
            }
            wx *= Math.exp(-4 * dt); wy *= Math.exp(-4 * dt); wz = wz * Math.exp(-4 * dt) - (vx / Math.max(r, 1)) * 0.2 * (1 - Math.exp(-4 * dt));
          }
        } else if (py >= b.b && vy < 0 && x > b.l && x < b.r) {
          // Up into the underside of something: it comes back down.
          y = b.b;
          vy *= -K.bounce;
        } else if (y > b.t + 1) {
          const left = x < (b.l + b.r) / 2;
          x = left ? b.l - r : b.r + r;
          if (left === vx > 0) vx *= -K.bounce;
        }
      }
      // A post is round, so what strikes it leaves along a new line each time, and what comes to rest on it slides off.
      for (const post of this.route.posts) {
        const dx = x - post.x, dy = y - post.y, d = Math.hypot(dx, dy), reach = post.r + r;
        if (d >= reach) continue;
        const nx = d ? dx / d : 0, ny = d ? dy / d : -1, into = vx * nx + vy * ny;
        x = post.x + nx * reach; y = post.y + ny * reach;
        if (into >= 0) continue;
        const at_ = Math.round(age * 997), hard = -into > K.settle * u;
        const keep = hard ? K.bounce * (0.75 + 0.5 * hash(i, at_, this.seed)) : 0;
        vx -= (1 + keep) * into * nx; vy -= (1 + keep) * into * ny;
        if (hard) { wz = (vx * ny - vy * nx) / Math.max(r, 1) * 0.5; wx = wx * 0.5 + (hash(i, 3, at_) - 0.5) * 9; wy = wy * 0.5 + (hash(i, 4, at_) - 0.5) * 9; }
      }
      // A rail is a slope. A shard bounces off it square to the slope. One too slow to bounce skids the way it was
      // going, stops and fades, as on a card. The single shard thrown at rest is carried downhill and off the low end.
      for (let k = 0; k < this.frames.length; k++) {
        const rail = this.route.rails[k], f = this.frames[k], ox = x - rail.ax, oy = y - rail.ay, along = ox * f.ex + oy * f.ey, out = ox * f.nx + oy * f.ny, reach = rail.half + r;
        if (along < 0 || along > f.len || Math.abs(out) >= reach) continue;
        const face = out >= 0 ? 1 : -1, into = (vx * f.nx + vy * f.ny) * face, back = face * reach - out;
        x += f.nx * back; y += f.ny * back;
        if (into >= 0) continue;
        const at_ = Math.round(age * 997);
        let run = vx * f.ex + vy * f.ey, off = 0;
        if (face < 0 || -into > K.settle * u) {
          const k2 = 0.75 + 0.5 * hash(i, at_, this.seed);
          run *= K.grip;
          off = -into * K.bounce * k2 * face;
          wz = -run / Math.max(r, 1) * 0.5 * k2; wx = wx * 0.5 + (hash(i, 3, at_) - 0.5) * 9; wy = wy * 0.5 + (hash(i, 4, at_) - 0.5) * 9;
        } else if (p[o + 16] > 0.5 && run > 0) {
          const carry = K.carry * u * (0.5 + this.looseSeed[i]);
          run += (carry - run) * (1 - Math.exp(-12 * dt));
          if (p[o + 16] < 1.5) { life = age + (f.len - along) / carry + K.spill; p[o + 16] = 2; }
        } else {
          run *= Math.exp(-K.skid * dt);
          life = Math.min(life, age + K.fades);
        }
        vx = f.ex * run + f.nx * off; vy = f.ey * run + f.ny * off;
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
      p[w + 13] = age; p[w + 14] = life; p[w + 15] = p[o + 15]; p[w + 16] = p[o + 16]; p[w + 17] = p[o + 17];
      this.looseSeed[n++] = this.looseSeed[i];
    }
    this.looseCount = n;
  }
}

export const SPARK_FLOATS = SPARK;
export const LOOSE_FLOATS = LOOSE;
export const FORK_FLOATS = FORK;
