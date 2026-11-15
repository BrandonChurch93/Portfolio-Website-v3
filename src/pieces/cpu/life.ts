import * as THREE from 'three';
import { seeded } from '../../world/build';
import type { Way } from '../../world/struck';
import { facetKind } from '../../stream/shards';
import { BOARD, IHS, SOCKET, STRIKE } from './layout';
import type { PartDef } from './model';
import { PART_TEXELS } from './shading';

// How the processor comes onto the page at its strike, worked out from the way and the age alone: where every part
// is, how far it has opened, the shards in flight, and how the lights stand. Run back, the same numbers take it away.

export const LIFE: Record<Way, number> = { shards: 1.2, band: 0.85, flash: 0.75 };

// When the lights come on, in each way: the first wave of the pulse leaves the seam then.
const LIGHTS: Record<Way, number> = { shards: 1.1, band: 0.6, flash: 0.6 };

// The stream's shards on the page run from 4.5 to 17 CSS pixels from middle to farthest point, and the board is 160
// pixels across there: so a shard here is between these, in millimetres.
export const SHARD_MM = [3.1, 11.6] as const;

// A shard in flight: where it is, how it is turned, its size along its three axes, which of the stream's facets it
// is, and how much of the stream's light reaches it.
export interface ShardAt { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; kind: number; lit: number }

export interface LifeAt {
  show: boolean;
  // The room's light on it (the cursor's light, the key, the strips), 0 to 1. In the flash way it is first seen by
  // the strike's flash alone.
  room: number;
  // The strike's flash as the light it is seen by, in the flash way.
  flash: number;
  // Seconds since the lights came on: under 0 they are off.
  lit: number;
  // How much of the board's shadow is under it.
  shadow: number;
  band: { c: [number, number]; r: number; k: number } | null;
  shards: ShardAt[];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (k: number) => k * k * (3 - 2 * k);
const UP = new THREE.Vector3(0, 1, 0);
// A shard lies flat with its broadest face up: its own z turned to the board's y.
const FLAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

// The band: how long it takes to cross, how far behind the strike the middle of its circle stands (in board widths),
// and how far past the far corner it runs out, so a tall part's top is crossed too.
const BAND = { cross: 0.56, back: 0.95, past: 16 } as const;

// The flash way: how far each kind of part stands off its seat at the strike, how hard things fall, and when the
// plate and the lever start to swing shut, how long they take and how far open they stand.
const FLASH = { cpu: 13, body: 3, frame: 2, round: [4, 8] as [number, number], g: 420, plate: [0.08, 0.26, 64] as const, lever: [0.16, 0.22, 72] as const };

// The shards way, in seconds. Each shard flies from the strike, lands where its part is and opens into it: the part's
// own faces, crumpled into the shard's size, unfold. The board's tiles leave over the first span and lock in a wave
// from the struck corner. Then the socket, the processor, the plate and the lever, each alone, with a gap before the
// next, the socket and the processor the largest and hottest shards of all. Then the rows: a row is one shard that
// lands at its near end and runs along it, and each part opens as it passes.
const SHARDS = {
  tiles: { leave: [0, 0.16] as [number, number], fly: [0.12, 0.16] as [number, number], gap: 1.3, slide: 0.07, open: 0.06, size: [5, 8] as [number, number], lit: 1, turn: 25 },
  big: [
    { kinds: ['frame', 'body'], leave: 0.26, fly: 0.2, open: 0.1, size: 16, lit: 3.4, lift: 16, crumple: 0.14 },
    { kinds: ['cpu'], leave: 0.38, fly: 0.2, open: 0.09, size: 16, lit: 3.4, lift: 18, crumple: 0.14 },
    { kinds: ['plate'], leave: 0.5, fly: 0.16, open: 0.08, size: 8, lit: 1.5, lift: 10, crumple: 0.12 },
    { kinds: ['lever'], leave: 0.58, fly: 0.15, open: 0.07, size: 7, lit: 1.5, lift: 9, crumple: 0.12 },
  ],
  // The plate and the lever arrive standing open this far, then swing shut: start and how long.
  standing: { plate: 70, lever: 66 },
  shut: { plate: [0.75, 0.12] as [number, number], lever: [0.83, 0.12] as [number, number] },
  rows: { first: 0.64, apart: 0.05, fly: 0.13, run: 0.15, open: 0.06, lit: 1.2, size: 6.5 },
} as const;

interface Opens { i: number; at: number; c: THREE.Vector3; r: number }
// A row's shard, once landed, runs along the row to here in this long, opening each part as it passes.
interface Run { to: THREE.Vector3; dur: number }
interface Flier {
  opens: Opens[];
  leave: number;
  land: number;
  open: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  size: number;
  kind: number;
  lit: number;
  axis: THREE.Vector3;
  spin: number;
  yaw: number;
  lift: number;
  bow: number;
  tile: boolean;
  crumple: number;
  run?: Run;
  // How it lies as it lands, and how the part lies as it starts to open: turned about the upright only, so a flat
  // thing never stands on edge.
  q: THREE.Quaternion;
  partQ: THREE.Quaternion;
}

export class Life {
  private own: { tilt: THREE.Vector3; lift: number; fall: number }[];
  private fliers: Flier[];
  private tiles: number[];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private pool: ShardAt[] = [];
  readonly strike = new THREE.Vector3(STRIKE.x, STRIKE.y + 1.5, STRIKE.z);

  constructor(private parts: PartDef[]) {
    const r = seeded(4711);
    const ds = parts.map((p) => Math.hypot(p.c[0] - SOCKET.x, p.c[2] - SOCKET.z)), dmax = Math.max(...ds);
    this.own = parts.map((p, i) => {
      const tilt = new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize().multiplyScalar((3 + r() * 6) * (Math.PI / 180));
      const lift = p.kind === 'round' ? FLASH.round[0] + (FLASH.round[1] - FLASH.round[0]) * r() : p.kind === 'cpu' ? FLASH.cpu : p.kind === 'body' ? FLASH.body : p.kind === 'frame' ? FLASH.frame : 0;
      // Nearly all of them let go at once, the ones nearest the socket a moment first: one fall, overlapping.
      return { tilt, lift, fall: 0.03 + 0.08 * (ds[i] / dmax) + 0.02 * r() };
    });
    this.tiles = parts.map((p, i) => (p.kind === 'board' ? i : -1)).filter((i) => i >= 0);
    for (let i = 0; i < 128; i++) this.pool.push({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), kind: 0, lit: 1 });
    this.fliers = this.plan(seeded(91));
  }

  // The stream's facets with needle points: the larger kinds, which are mostly points.
  private kindFor(r: () => number): number { return facetKind(0.55 + 0.45 * r(), r()); }

  private reach(i: number): number {
    const p = this.parts[i];
    return Math.max(1, Math.hypot(p.hi[0] - p.lo[0], p.hi[2] - p.lo[2]) / 2);
  }

  private plan(r: () => number): Flier[] {
    const P = this.parts, out: Flier[] = [], S = this.strike;
    const mid = (i: number) => new THREE.Vector3((P[i].lo[0] + P[i].hi[0]) / 2, P[i].hi[1], (P[i].lo[2] + P[i].hi[2]) / 2);
    const fly = (o: Omit<Flier, 'from' | 'kind' | 'axis' | 'spin' | 'yaw' | 'bow' | 'q' | 'partQ' | 'crumple'> & { bow?: number; crumple?: number; turn?: number }) => {
      const yaw = r() * Math.PI * 2;
      const d = Math.hypot(o.to.x - S.x, o.to.z - S.z);
      const turn = ((o.turn ?? 40) * (r() * 2 - 1) * Math.PI) / 180;
      out.push({
        ...o, from: S.clone(), kind: this.kindFor(r), axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), spin: 7 + r() * 6, yaw, crumple: o.crumple ?? 0.38,
        bow: o.bow ?? (r() < 0.5 ? -1 : 1) * (1.5 + 0.03 * d) * (0.4 + 0.6 * r()), q: new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(FLAT),
        partQ: new THREE.Quaternion().setFromAxisAngle(UP, turn),
      });
    };
    // The board's tiles, in a wave from the struck corner.
    const T = SHARDS.tiles, far = Math.hypot(BOARD.half * 2, BOARD.half * 2);
    const dist = (i: number) => Math.hypot(P[i].c[0] - S.x, P[i].c[2] - S.z);
    for (const i of this.tiles.slice().sort((a, b) => dist(a) - dist(b))) {
      const k = dist(i) / far, leave = T.leave[0] + (T.leave[1] - T.leave[0]) * k, flight = T.fly[0] + (T.fly[1] - T.fly[0]) * k;
      const c = new THREE.Vector3(P[i].c[0], 0, P[i].c[2]);
      const size = THREE.MathUtils.clamp(P[i].r * 0.45, T.size[0], T.size[1]);
      fly({ opens: [{ i, at: 0, c, r: P[i].r }], leave, land: leave + flight, open: T.open, to: c, size, lit: T.lit, lift: 4 + 0.06 * dist(i) + 2 * r(), tile: true, turn: T.turn, crumple: 0.3 });
    }
    // The socket and the processor, high and bright; the plate standing open and the lever raised.
    for (const big of SHARDS.big) {
      const list = P.map((p, i) => (big.kinds.includes(p.kind as never) ? i : -1)).filter((i) => i >= 0);
      if (!list.length) continue;
      const at = big.kinds[0] === 'cpu' ? new THREE.Vector3(SOCKET.x, IHS.y2, SOCKET.z) : big.kinds[0] === 'frame' ? new THREE.Vector3(SOCKET.x, 2.6, SOCKET.z) : mid(list[0]);
      // A hinged part opens where it stands open, so its shard lands there.
      const p0 = P[list[0]], deg = p0.kind === 'plate' ? SHARDS.standing.plate : p0.kind === 'lever' ? SHARDS.standing.lever : 0;
      const to = p0.hinge && deg ? at.clone().applyMatrix4(this.hingeMatrix(p0, Math.sign(p0.hinge.open) * deg * (Math.PI / 180))) : at.clone();
      fly({ opens: list.map((i) => ({ i, at: 0, c: at.clone(), r: this.reach(i) })), leave: big.leave, land: big.leave + big.fly, open: big.open, to, size: big.size, lit: big.lit, lift: big.lift, tile: false, bow: 3, crumple: big.crumple });
    }
    // The rows: one shard each, landing at the row's near end and running along it.
    const rows = new Map<string, number[]>();
    P.forEach((p, i) => { if (p.row) rows.set(p.row, [...(rows.get(p.row) ?? []), i]); });
    const R = SHARDS.rows;
    [...rows.values()].sort((a, b) => Math.min(...a.map(dist)) - Math.min(...b.map(dist))).forEach((list, k) => {
      const xs = list.map((i) => P[i].c[0]), zs = list.map((i) => P[i].c[2]);
      const alongX = Math.max(...xs) - Math.min(...xs) >= Math.max(...zs) - Math.min(...zs);
      const key = (i: number) => (alongX ? P[i].c[0] : P[i].c[2]);
      const lo = Math.min(...list.map(key)), hi = Math.max(...list.map(key));
      const across = (alongX ? zs : xs).reduce((t, v) => t + v, 0) / list.length;
      const at = (v: number) => new THREE.Vector3(alongX ? v : across, 3, alongX ? across : v);
      // It runs from the end nearer the strike.
      const fromLo = at(lo).distanceTo(S) <= at(hi).distanceTo(S);
      const a0 = fromLo ? lo : hi, a1 = fromLo ? hi : lo, span = Math.max(1e-3, Math.abs(a1 - a0));
      const leave = R.first + k * R.apart;
      fly({
        opens: list.map((i) => ({ i, at: (Math.abs(key(i) - a0) / span) * R.run, c: new THREE.Vector3(P[i].c[0], P[i].lo[1], P[i].c[2]), r: this.reach(i) })),
        leave, land: leave + R.fly, open: R.open, to: at(a0), size: R.size, lit: R.lit, lift: 6 + 0.05 * at(a0).distanceTo(S), tile: false, crumple: 0.3,
        run: { to: at(a1), dur: R.run },
      });
    });
    return out;
  }

  private hingeMatrix(p: PartDef, a: number): THREE.Matrix4 {
    const hp = new THREE.Vector3(...p.hinge!.p), hd = new THREE.Vector3(...p.hinge!.d);
    return new THREE.Matrix4().makeTranslation(hp.x, hp.y, hp.z).multiply(new THREE.Matrix4().makeRotationAxis(hd, a)).multiply(new THREE.Matrix4().makeTranslation(-hp.x, -hp.y, -hp.z));
  }

  // Each part's transform (three rows), heat and fold, five texels a part; and how the rest stands.
  at(way: Way, age: number, out: Float32Array): LifeAt {
    const L = LIFE[way];
    const res: LifeAt = { show: age > 0, room: 1, flash: 0, lit: age - LIGHTS[way], shadow: 1, band: null, shards: [] };
    for (let i = 0; i < this.parts.length; i++) this.write(out, i, this.m.identity());
    if (!res.show) { for (let i = 0; i < this.parts.length; i++) this.write(out, i, this.m.makeScale(0, 0, 0)); return res; }
    if (age >= L) return res;
    if (way === 'shards') this.shards(age, out, res);
    else if (way === 'flash') this.flash(age, out, res);
    else this.band(age, res);
    return res;
  }

  // fold: how far open (1 whole), how far its faces are crumpled (mm), how small it is drawn folded, and the point it
  // folds about.
  private write(out: Float32Array, i: number, m: THREE.Matrix4, heat = 0, fold?: { open: number; crumple: number; small: number; c: THREE.Vector3 }) {
    const e = m.elements, o = i * PART_TEXELS * 4;
    out[o] = e[0]; out[o + 1] = e[4]; out[o + 2] = e[8]; out[o + 3] = e[12];
    out[o + 4] = e[1]; out[o + 5] = e[5]; out[o + 6] = e[9]; out[o + 7] = e[13];
    out[o + 8] = e[2]; out[o + 9] = e[6]; out[o + 10] = e[10]; out[o + 11] = e[14];
    out[o + 12] = heat; out[o + 13] = fold ? fold.open : 1; out[o + 14] = fold?.crumple ?? 0; out[o + 15] = fold?.small ?? 1;
    out[o + 16] = fold?.c.x ?? 0; out[o + 17] = fold?.c.y ?? 0; out[o + 18] = fold?.c.z ?? 0; out[o + 19] = 0;
  }

  // A small swing back after a hard stop: up to amp, and gone in dur seconds.
  private rebound(age: number, at: number, amp: number, dur: number): number {
    const v = age - at;
    return v > 0 && v < dur ? amp * Math.sin((v / dur) * Math.PI) * (1 - v / dur) : 0;
  }

  // A hinged part falling shut from open degrees: it starts at go, swings down under its weight and stops hard at
  // go + dur, bounces up a little and settles. The lever latches: a second, smaller knock.
  private shut(p: PartDef, age: number, go: number, dur: number, deg: number): number {
    const open = Math.sign(p.hinge!.open) * deg * (Math.PI / 180);
    const u = span(age, go, go + dur);
    let a = open * (1 - u * u);
    a += open * this.rebound(age, go + dur, 0.06, 0.1);
    if (p.kind === 'lever') a += open * this.rebound(age, go + dur + 0.1, 0.018, 0.06);
    return a;
  }

  private shards(age: number, out: Float32Array, res: LifeAt) {
    let home = 0, n = 0;
    for (let i = 0; i < this.parts.length; i++) this.write(out, i, this.m.makeScale(0, 0, 0));
    for (const f of this.fliers) {
      if (age < f.leave) continue;
      const u = span(age, f.leave, f.land);
      const running = f.run && age >= f.land && age < f.land + f.run.dur;
      if ((age < f.land || running) && n < this.pool.length) {
        // In flight: out of the stream, an arc with weight, tumbling, and turning to lie as it will land.
        const sh = this.pool[n++];
        if (running && f.run) {
          // Along the row, flat and shrinking as it spends itself on each part it passes.
          const w = (age - f.land) / f.run.dur;
          sh.p.copy(f.to).lerp(f.run.to, w);
          sh.q.copy(f.q);
          sh.s.set(f.size * (1 - 0.6 * w), f.size * (1 - 0.6 * w), f.size * (1 - 0.6 * w) * 0.5);
          sh.kind = f.kind;
          sh.lit = f.lit;
          res.shards.push(sh);
        } else {
        const e = u * (1.15 - 0.15 * u);
        sh.p.copy(f.from).lerp(f.to, e);
        const side = this.v.set(-(f.to.z - f.from.z), 0, f.to.x - f.from.x).normalize().multiplyScalar(f.bow * Math.sin(Math.PI * u));
        sh.p.add(side).addScaledVector(UP, f.lift * 4 * u * (1 - u));
        const tumble = new THREE.Quaternion().setFromAxisAngle(f.axis, f.spin * (1 - u) ** 1.4);
        sh.q.copy(tumble).multiply(f.q);
        const born = smooth(span(age - f.leave, 0, 0.05));
        sh.s.setScalar(f.size * born);
        sh.kind = f.kind;
        sh.lit = f.lit;
        res.shards.push(sh);
        continue;
        }
      }
      if (age < f.land) continue;
      // Landed: each of its parts opens out of it in turn, its own faces unfolding from the shard's size and lie.
      for (const o of f.opens) {
        const p = this.parts[o.i];
        const t = age - f.land - o.at;
        if (t < 0) continue;
        const k = span(t, 0, f.open), open = smooth(k);
        const lie = new THREE.Quaternion().slerpQuaternions(f.partQ, new THREE.Quaternion(), open);
        const fold = { open: k >= 1 ? 1 : open, crumple: o.r * f.crumple, small: THREE.MathUtils.clamp(f.size / o.r, 0.12, 1), c: o.c };
        const turn = new THREE.Matrix4().makeTranslation(o.c.x, o.c.y, o.c.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(lie)).multiply(new THREE.Matrix4().makeTranslation(-o.c.x, -o.c.y, -o.c.z));
        const heat = (f.tile ? 0.38 : 0.36) * (1 - open);
        if (f.tile) {
          // Opened a little out from its place, it slides in and stops hard: the seam closes, burning in a hairline.
          const dx = p.c[0] - SOCKET.x * 0.2, dz = p.c[2] - SOCKET.z * 0.2, l = Math.hypot(dx, dz) || 1;
          const s = span(t, f.open, f.open + SHARDS.tiles.slide), gap = SHARDS.tiles.gap * (1 - s) * (1 - s);
          const knock = -this.rebound(age, f.land + f.open + SHARDS.tiles.slide, 0.25, 0.06);
          this.m.makeTranslation((dx / l) * gap, knock, (dz / l) * gap).multiply(turn);
          this.write(out, o.i, this.m, k < 1 ? heat : 0.5 * Math.exp(-Math.max(0, t - f.open) / 0.08) * (1 - 0.5 * s), fold);
          home += s;
          continue;
        }
        let m = turn;
        if (p.kind === 'plate') m = this.hingeMatrix(p, this.shut(p, age, SHARDS.shut.plate[0], SHARDS.shut.plate[1], SHARDS.standing.plate)).multiply(turn);
        else if (p.kind === 'lever') m = this.hingeMatrix(p, this.shut(p, age, SHARDS.shut.lever[0], SHARDS.shut.lever[1], SHARDS.standing.lever)).multiply(turn);
        else m = new THREE.Matrix4().makeTranslation(0, -this.rebound(age, f.land + o.at + f.open, p.kind === 'round' ? 0.18 : 0.3, 0.06), 0).multiply(turn);
        this.write(out, o.i, m, heat, fold);
      }
    }
    res.shadow = smooth(clamp01(home / Math.max(1, this.tiles.length)));
  }

  // The flash way: everything is there in the first frame, seen by the strike's flash alone, raking from the struck
  // corner, each part standing well off its seat: the processor above the socket, the plate open, the lever up, the
  // parts round it lifted and tipped. Then one fall: they all let go within a few hundredths, the ones by the socket
  // first, and land with weight and a small hard bounce while the plate swings down onto the processor and the lever
  // comes over and latches. The room comes up as they settle, and then the lights.
  private flash(age: number, out: Float32Array, res: LifeAt) {
    res.flash = Math.exp(-age / 0.24) * (1 - span(age, 0.5, LIFE.flash));
    res.room = smooth(span(age, 0.12, 0.5));
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i], o = this.own[i];
      if (p.hinge) {
        const [go, dur, deg] = p.kind === 'plate' ? FLASH.plate : FLASH.lever;
        this.write(out, i, this.hingeMatrix(p, this.shut(p, age, go, dur, deg)));
        continue;
      }
      if (!o.lift) continue;
      const g = FLASH.g, fall = Math.sqrt((2 * o.lift) / g), t = age - o.fall;
      let y: number, k: number;
      if (t <= 0) { y = o.lift; k = 0; }
      else if (t < fall) { y = o.lift - 0.5 * g * t * t; k = 1 - y / o.lift; }
      else {
        const b = Math.min(0.45, o.lift * 0.05), tb = 2 * Math.sqrt((2 * b) / g), w = t - fall;
        y = w < tb ? b * 4 * (w / tb) * (1 - w / tb) : 0;
        k = 1;
      }
      const len = o.tilt.length();
      this.q.setFromAxisAngle(len > 1e-6 ? this.v.copy(o.tilt).divideScalar(len) : UP, len * (1 - k));
      const c = new THREE.Vector3(...p.c);
      this.m.compose(new THREE.Vector3(c.x, c.y + y, c.z), this.q, new THREE.Vector3(1, 1, 1)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
      this.write(out, i, this.m);
    }
  }

  // The band way: a thin curtain of light stands on a bowed line that spreads from the strike, quick at first and
  // slowing, bright as it sets out and spent by the far side. Nothing is drawn ahead of it, everything behind it is
  // there, and the cut is made along the eye's rays, so a standing part is cut edge on and carries the line too.
  private band(age: number, res: LifeAt) {
    const k = clamp01(age / BAND.cross);
    if (k >= 1) return;
    const back = BAND.back * BOARD.half * 2;
    const dir = new THREE.Vector2(STRIKE.x, STRIKE.z).normalize();
    const c: [number, number] = [STRIKE.x + dir.x * back, STRIKE.z + dir.y * back];
    const far = Math.hypot(BOARD.half - c[0], BOARD.half - c[1]) + BAND.past;
    const near = Math.hypot(STRIKE.x - c[0], STRIKE.z - c[1]) - 1;
    const r = near + (far - near) * (1 - (1 - Math.min(1, k / 0.9)) ** 1.6);
    res.band = { c, r, k: Math.min(1, k / 0.025) * Math.min(1, (1 - k) / 0.1) * (0.5 + 0.5 * (1 - k)) };
  }
}
