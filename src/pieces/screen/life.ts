import * as THREE from 'three';
import { seeded } from '../../world/build';
import type { Way } from '../../world/struck';
import { facetKind } from '../../stream/shards';
import { STRIKE, TRAY, NECK, type P3 } from './layout';
import type { PartDef } from './model';
import { PART_TEXELS } from './shading';

// How the screen comes onto the page at its strike, worked out from the way and the age alone: where every part is,
// how far it has opened, the shards in flight, and how the lights stand. Run back, the same numbers take it away.

export const LIFE: Record<Way, number> = { shards: 1.3, band: 0.85, flash: 0.75 };
// When the power comes on in each way: the front leaves the input then.
const LIGHTS: Record<Way, number> = { shards: 1.18, band: 0.6, flash: 0.6 };

export interface ShardAt { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; kind: number; lit: number }
export interface LifeAt {
  show: boolean;
  room: number;
  flash: number;
  lit: number;
  shadow: number;
  band: { c: [number, number]; r: number; k: number } | null;
  shards: ShardAt[];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (k: number) => k * k * (3 - 2 * k);
// A flier's arc lifts up and toward the eye, and falls back with weight.
const LIFT = new THREE.Vector3(0, 0.55, 0.84).normalize();
const Z = new THREE.Vector3(0, 0, 1);

const BAND = { cross: 0.56, back: 0.95, past: 16 } as const;
// The flash way: how hard things fall (mm/s²), and when each kind lets go.
const FLASH = { g: 520 } as const;

// The shards way, in seconds. The panel's tiles leave over the first span and lock in a wave from the struck edge.
// Then the four boards, each alone, the largest and hottest shards. Then the rows: a row is one shard that lands at
// its near end and runs along it, and each part opens as it passes. Then the cables, each a shard that runs its length.
const SHARDS = {
  tiles: { leave: [0, 0.16] as [number, number], fly: [0.12, 0.17] as [number, number], gap: 3, slide: 0.07, open: 0.06, size: [9, 14] as [number, number], lit: 1, turn: 18 },
  boards: { power: 0.27, main: 0.33, driver: 0.38, button: 0.42, fly: 0.18, open: 0.09, size: 16, lit: 3.2, lift: 40, crumple: 0.14 },
  rows: { first: 0.58, apart: 0.045, fly: 0.13, run: 0.16, open: 0.06, lit: 1.2, size: 9 },
  cables: { first: 0.86, apart: 0.04, fly: 0.11, run: 0.15, lit: 1.4, size: 8 },
} as const;

interface Opens { i: number; at: number; c: THREE.Vector3; r: number; open: number }
interface Run { pts: THREE.Vector3[]; dur: number }
interface Flier {
  opens: Opens[];
  leave: number;
  land: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  size: number;
  kind: number;
  lit: number;
  axis: THREE.Vector3;
  spin: number;
  lift: number;
  bow: number;
  tile: boolean;
  crumple: number;
  run?: Run;
  q: THREE.Quaternion;
  partQ: THREE.Quaternion;
}

// A point a share of the way along a polyline.
function along(pts: THREE.Vector3[], k: number, out: THREE.Vector3): THREE.Vector3 {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += pts[i].distanceTo(pts[i - 1]);
  let left = clamp01(k) * total;
  for (let i = 1; i < pts.length; i++) {
    const l = pts[i].distanceTo(pts[i - 1]);
    if (left <= l || i === pts.length - 1) return out.copy(pts[i - 1]).lerp(pts[i], l > 0 ? Math.min(1, left / l) : 1);
    left -= l;
  }
  return out.copy(pts[pts.length - 1]);
}

export class Life {
  private own: { tilt: THREE.Vector3; fall: number; spin: number }[];
  private fliers: Flier[];
  private tiles: number[];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private pool: ShardAt[] = [];
  readonly strike = new THREE.Vector3(STRIKE[0] - 2, STRIKE[1], STRIKE[2] + 4);

  constructor(private parts: PartDef[]) {
    const r = seeded(4711);
    const ds = parts.map((p) => Math.hypot(p.c[0] - STRIKE[0], p.c[1] - STRIKE[1])), dmax = Math.max(...ds);
    this.own = parts.map((p, i) => ({
      tilt: new THREE.Vector3(r() - 0.5, r() - 0.5, 0).normalize().multiplyScalar((3 + r() * 6) * (Math.PI / 180)),
      // Nearly all of them let go at once, the ones nearest the strike a moment first: one fall, overlapping.
      fall: 0.03 + 0.08 * (ds[i] / dmax) + 0.02 * r(),
      spin: (r() < 0.5 ? -1 : 1) * (2.5 + r()) * Math.PI,
    }));
    this.tiles = parts.map((p, i) => (p.kind === 'tile' ? i : -1)).filter((i) => i >= 0);
    for (let i = 0; i < 128; i++) this.pool.push({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), kind: 0, lit: 1 });
    this.fliers = this.plan(seeded(91));
  }

  private kindFor(r: () => number): number { return facetKind(0.55 + 0.45 * r(), r()); }
  private reach(i: number): number { const p = this.parts[i]; return Math.max(1, Math.hypot(p.hi[0] - p.lo[0], p.hi[1] - p.lo[1]) / 2); }

  private plan(r: () => number): Flier[] {
    const P = this.parts, out: Flier[] = [], S = this.strike;
    const fly = (o: Omit<Flier, 'from' | 'kind' | 'axis' | 'spin' | 'bow' | 'q' | 'partQ' | 'crumple'> & { bow?: number; crumple?: number; turn?: number }) => {
      const yaw = r() * Math.PI * 2;
      const d = Math.hypot(o.to.x - S.x, o.to.y - S.y);
      const turn = ((o.turn ?? 30) * (r() * 2 - 1) * Math.PI) / 180;
      out.push({
        ...o, from: S.clone(), kind: this.kindFor(r), axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), spin: 7 + r() * 6, crumple: o.crumple ?? 0.3,
        bow: o.bow ?? (r() < 0.5 ? -1 : 1) * (3 + 0.03 * d) * (0.4 + 0.6 * r()), q: new THREE.Quaternion().setFromAxisAngle(Z, yaw),
        partQ: new THREE.Quaternion().setFromAxisAngle(Z, turn),
      });
    };
    const dist = (i: number) => Math.hypot(P[i].c[0] - S.x, P[i].c[1] - S.y);
    const far = Math.hypot(TRAY.x1 - TRAY.x0, TRAY.y1 - TRAY.y0);
    const T = SHARDS.tiles;
    for (const i of this.tiles.slice().sort((a, b) => dist(a) - dist(b))) {
      const k = dist(i) / far, leave = T.leave[0] + (T.leave[1] - T.leave[0]) * k, flight = T.fly[0] + (T.fly[1] - T.fly[0]) * k;
      const c = new THREE.Vector3(P[i].c[0], P[i].c[1], 0);
      const size = THREE.MathUtils.clamp(P[i].r * 0.12, T.size[0], T.size[1]);
      fly({ opens: [{ i, at: 0, c, r: P[i].r, open: T.open }], leave, land: leave + flight, to: c, size, lit: T.lit, lift: 10 + 0.08 * dist(i) + 4 * r(), tile: true, turn: T.turn, crumple: 0.08 });
    }
    // The boards, one shard each, landing on their middles.
    const B = SHARDS.boards;
    for (const p of P) if (p.kind === 'board') {
      const i = P.indexOf(p), name = this.boardName(i);
      const at = new THREE.Vector3(...p.c);
      fly({ opens: [{ i, at: 0, c: at.clone(), r: this.reach(i), open: B.open }], leave: B[name], land: B[name] + B.fly, to: at, size: B.size, lit: B.lit, lift: B.lift, tile: false, bow: 6, crumple: B.crumple });
    }
    // The rows: one shard each, landing at the row's near end and running along it.
    const rows = new Map<string, number[]>();
    P.forEach((p, i) => { if (p.row) rows.set(p.row, [...(rows.get(p.row) ?? []), i]); });
    const R = SHARDS.rows;
    [...rows.values()].sort((a, b) => Math.min(...a.map(dist)) - Math.min(...b.map(dist))).forEach((list, k) => {
      const xs = list.map((i) => P[i].c[0]), ys = list.map((i) => P[i].c[1]);
      const alongX = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys);
      const key = (i: number) => (alongX ? P[i].c[0] : P[i].c[1]);
      const lo = Math.min(...list.map(key)), hi = Math.max(...list.map(key));
      const across = (alongX ? ys : xs).reduce((t, v) => t + v, 0) / list.length;
      const z = Math.max(...list.map((i) => P[i].c[2])) + 4;
      const at = (v: number) => new THREE.Vector3(alongX ? v : across, alongX ? across : v, z);
      const fromLo = at(lo).distanceTo(S) <= at(hi).distanceTo(S);
      const a0 = fromLo ? lo : hi, a1 = fromLo ? hi : lo, sp = Math.max(1e-3, Math.abs(a1 - a0));
      const leave = R.first + k * R.apart;
      fly({
        opens: list.map((i) => ({ i, at: (Math.abs(key(i) - a0) / sp) * R.run, c: new THREE.Vector3(P[i].c[0], P[i].c[1], P[i].lo[2]), r: this.reach(i), open: P[i].kind === 'cable' ? R.open * 2 : R.open })),
        leave, land: leave + R.fly, to: at(a0), size: R.size, lit: R.lit, lift: 14 + 0.05 * at(a0).distanceTo(S), tile: false,
        run: { pts: [at(a0), at(a1)], dur: R.run },
      });
    });
    // The cables: each a shard that lands at its start and runs its length, the cable unfolding behind it.
    const C = SHARDS.cables;
    P.forEach((p, i) => {
      if (p.kind !== 'cable' || p.row || !p.path) return;
      const k = out.filter((f) => f.run && f.run.pts.length > 2).length;
      const pts = p.path.map((q) => new THREE.Vector3(q[0], q[1], q[2] + 1.5));
      const leave = C.first + k * C.apart;
      fly({
        opens: [{ i, at: 0, c: new THREE.Vector3(...(p.path[0] as P3)), r: this.reach(i), open: C.run }],
        leave, land: leave + C.fly, to: pts[0].clone(), size: C.size, lit: C.lit, lift: 16, tile: false, crumple: 0.22,
        run: { pts: pts.length > 2 ? pts : [...pts, pts[pts.length - 1].clone()], dur: C.run },
      });
    });
    return out;
  }

  private boardName(i: number): 'power' | 'main' | 'driver' | 'button' {
    const order = this.parts.map((p, k) => (p.kind === 'board' ? k : -1)).filter((k) => k >= 0);
    return (['power', 'main', 'driver', 'button'] as const)[order.indexOf(i)];
  }

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

  private write(out: Float32Array, i: number, m: THREE.Matrix4, heat = 0, fold?: { open: number; crumple: number; small: number; c: THREE.Vector3 }) {
    const e = m.elements, o = i * PART_TEXELS * 4;
    out[o] = e[0]; out[o + 1] = e[4]; out[o + 2] = e[8]; out[o + 3] = e[12];
    out[o + 4] = e[1]; out[o + 5] = e[5]; out[o + 6] = e[9]; out[o + 7] = e[13];
    out[o + 8] = e[2]; out[o + 9] = e[6]; out[o + 10] = e[10]; out[o + 11] = e[14];
    out[o + 12] = heat; out[o + 13] = fold ? fold.open : 1; out[o + 14] = fold?.crumple ?? 0; out[o + 15] = fold?.small ?? 1;
    out[o + 16] = fold?.c.x ?? 0; out[o + 17] = fold?.c.y ?? 0; out[o + 18] = fold?.c.z ?? 0; out[o + 19] = 0;
  }

  private rebound(age: number, at: number, amp: number, dur: number): number {
    const v = age - at;
    return v > 0 && v < dur ? amp * Math.sin((v / dur) * Math.PI) * (1 - v / dur) : 0;
  }

  private shards(age: number, out: Float32Array, res: LifeAt) {
    let home = 0, n = 0;
    for (let i = 0; i < this.parts.length; i++) this.write(out, i, this.m.makeScale(0, 0, 0));
    for (const f of this.fliers) {
      if (age < f.leave) continue;
      const u = span(age, f.leave, f.land);
      const running = f.run && age >= f.land && age < f.land + f.run.dur;
      if ((age < f.land || running) && n < this.pool.length) {
        const sh = this.pool[n++];
        if (running && f.run) {
          const w = (age - f.land) / f.run.dur;
          along(f.run.pts, w, sh.p);
          sh.q.copy(f.q);
          const k = f.size * (1 - 0.6 * w);
          sh.s.set(k, k, k * 0.5);
        } else {
          const e = u * (1.15 - 0.15 * u);
          sh.p.copy(f.from).lerp(f.to, e);
          const side = this.v.set(-(f.to.y - f.from.y), f.to.x - f.from.x, 0).normalize().multiplyScalar(f.bow * Math.sin(Math.PI * u));
          sh.p.add(side).addScaledVector(LIFT, f.lift * 4 * u * (1 - u));
          const tumble = new THREE.Quaternion().setFromAxisAngle(f.axis, f.spin * (1 - u) ** 1.4);
          sh.q.copy(tumble).multiply(f.q);
          sh.s.setScalar(f.size * smooth(span(age - f.leave, 0, 0.05)));
        }
        sh.kind = f.kind;
        sh.lit = f.lit;
        res.shards.push(sh);
        if (!running) continue;
      }
      if (age < f.land) continue;
      for (const o of f.opens) {
        const p = this.parts[o.i];
        const t = age - f.land - o.at;
        if (t < 0) continue;
        const k = span(t, 0, o.open), open = smooth(k);
        const lie = new THREE.Quaternion().slerpQuaternions(f.partQ, new THREE.Quaternion(), open);
        const fold = { open: k >= 1 ? 1 : open, crumple: o.r * f.crumple, small: THREE.MathUtils.clamp(f.size / o.r, 0.06, 1), c: o.c };
        const turn = new THREE.Matrix4().makeTranslation(o.c.x, o.c.y, o.c.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(lie)).multiply(new THREE.Matrix4().makeTranslation(-o.c.x, -o.c.y, -o.c.z));
        const heat = 0.38 * (1 - open);
        if (f.tile) {
          // Opened a little out from its place, it slides in and stops hard: the seam closes, burning in a hairline.
          const dx = p.c[0], dy = p.c[1], l = Math.hypot(dx, dy) || 1;
          const s = span(t, o.open, o.open + SHARDS.tiles.slide), gap = SHARDS.tiles.gap * (1 - s) * (1 - s);
          const knock = -this.rebound(age, f.land + o.open + SHARDS.tiles.slide, 0.5, 0.06);
          this.m.makeTranslation((dx / l) * gap, (dy / l) * gap, knock).multiply(turn);
          this.write(out, o.i, this.m, k < 1 ? heat : 0.5 * Math.exp(-Math.max(0, t - o.open) / 0.08) * (1 - 0.5 * s), fold);
          home += s;
          continue;
        }
        const m = new THREE.Matrix4().makeTranslation(0, 0, -this.rebound(age, f.land + o.at + o.open, p.kind === 'thing' ? 0.3 : 0.5, 0.06)).multiply(turn);
        this.write(out, o.i, m, heat, fold);
      }
    }
    res.shadow = smooth(clamp01(home / Math.max(1, this.tiles.length)));
  }

  // The flash way: everything is there in the first frame, seen by the strike's flash alone, each part standing off
  // its seat toward the eye: the boards off their bosses, the parts off the boards, the cables lifted out of their
  // connectors, the screws backed out. Then one fall: they let go within a few hundredths and land home with weight
  // and a small hard bounce, the screws turning in as they go. The room comes up as they settle, then the power.
  private flash(age: number, out: Float32Array, res: LifeAt) {
    res.flash = Math.exp(-age / 0.24) * (1 - span(age, 0.5, LIFE.flash));
    res.room = smooth(span(age, 0.12, 0.5));
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i], o = this.own[i];
      if (!p.lift) continue;
      const g = FLASH.g, fall = Math.sqrt((2 * p.lift) / g), t = age - o.fall;
      let z: number, k: number;
      if (t <= 0) { z = p.lift; k = 0; }
      else if (t < fall) { z = p.lift - 0.5 * g * t * t; k = 1 - z / p.lift; }
      else {
        const b = Math.min(0.5, p.lift * 0.04), tb = 2 * Math.sqrt((2 * b) / g), w = t - fall;
        z = w < tb ? b * 4 * (w / tb) * (1 - w / tb) : 0;
        k = 1;
      }
      const c = new THREE.Vector3(...p.c);
      if (p.kind === 'screw') this.q.setFromAxisAngle(Z, o.spin * (1 - k));
      else { const len = o.tilt.length(); this.q.setFromAxisAngle(len > 1e-6 ? this.v.copy(o.tilt).divideScalar(len) : Z, len * (1 - k)); }
      this.m.compose(new THREE.Vector3(c.x, c.y, c.z + z), this.q, new THREE.Vector3(1, 1, 1)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
      this.write(out, i, this.m);
    }
  }

  // The band way: a curtain of light on a bowed line that spreads across the back from the struck edge. Nothing is
  // drawn ahead of it, everything behind it is there, and the cut is made along the eye's rays.
  private band(age: number, res: LifeAt) {
    const k = clamp01(age / BAND.cross);
    if (k >= 1) return;
    const back = BAND.back * (TRAY.x1 - TRAY.x0);
    const c: [number, number] = [STRIKE[0] - back, STRIKE[1]];
    const far = Math.hypot(TRAY.x1 + 2 - c[0], NECK.y0 - 4 - c[1]) + BAND.past;
    const near = Math.hypot(STRIKE[0] - c[0], STRIKE[1] - c[1]) - 1;
    const r = near + (far - near) * (1 - (1 - Math.min(1, k / 0.9)) ** 1.6);
    res.band = { c, r, k: Math.min(1, k / 0.025) * Math.min(1, (1 - k) / 0.1) * (0.5 + 0.5 * (1 - k)) };
  }
}
