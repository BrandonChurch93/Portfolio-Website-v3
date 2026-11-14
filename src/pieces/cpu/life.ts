import * as THREE from 'three';
import { seeded, type Vec3 } from '../../world/build';
import type { Way } from '../../world/struck';
import { BOARD, SOCKET, STRIKE } from './layout';
import type { PartDef } from './model';
import { PART_TEXELS } from './shading';

// How the processor comes onto the page at its strike, worked out from the way and the age alone: where every part
// is, how hot it is, the shards in flight, and how the lights stand. Run back, the same numbers take it away again.

export const LIFE: Record<Way, number> = { shards: 1.2, band: 0.85, flash: 0.75 };

// When the lights come on, in each way.
const LIGHTS: Record<Way, [number, number]> = { shards: [0.98, 1.2], band: [0.6, 0.85], flash: [0.58, 0.75] };

// A shard in flight: where it is, how it is turned, its half size along its own length, depth and breadth, and how
// brightly its edges burn.
export interface ShardAt { p: THREE.Vector3; q: THREE.Quaternion; size: THREE.Vector3; glow: number }

export interface LifeAt {
  show: boolean;
  // The room's light on it (the cursor's light, the key, the studio), 0 to 1. In the flash way it is first seen
  // by the strike's flash alone.
  room: number;
  // The strike's own light, over and above the stream's.
  flash: number;
  // The lights coming on, 0 to 1, and how far their first light has run out along the traces.
  lights: number;
  front: number;
  // The contact darkening under the parts, once they are down.
  seat: number;
  // How much of the board's shadow is under it: the board's pieces that have come home.
  shadow: number;
  // The processor is in its seat: the lid's own light comes up with it.
  lid: number;
  band: { c: [number, number]; r: number; k: number } | null;
  shards: ShardAt[];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (k: number) => k * k * (3 - 2 * k);
const outCubic = (k: number) => 1 - (1 - k) ** 3;
const ID = new THREE.Quaternion();

// Each part's own numbers for the ways: a tumble axis and spin, a lift and tilt for the flash, a size for its shard.
interface Flier {
  parts: number[];
  go: number;
  land: number;
  board: boolean;
  target: THREE.Vector3;
  q: THREE.Quaternion;
  size: THREE.Vector3;
  along: Map<number, number>;
  rise: number;
  axis: THREE.Vector3;
  spin: number;
  arc: number;
  bow: number;
}
// The rows of small parts, each one shard.
const ROWS = ['eps', 'left', 'top', 'front', 'right'];
// How long a part takes to rise out of its shard, and a board piece to slide home; when the plate and lever shut.
const RISE = 0.09;
const SLIDE = 0.06;
const SHUT = { plate: [0.6, 0.7] as [number, number], lever: [0.71, 0.81] as [number, number] };
const SEAM_MID: [number, number] = [SOCKET.x, SOCKET.z];
interface Own { axis: THREE.Vector3; spin: number; lift: number; tilt: THREE.Vector3; shard: number; heat: number; rank: number; dist: number; arc: number; bow: number }

export class Life {
  private own: Own[];
  private order: number[];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private shardPool: ShardAt[] = [];
  private fliers: Flier[] = [];
  private boardCount = 1;
  readonly strike = new THREE.Vector3(STRIKE.x, STRIKE.y + 1.5, STRIKE.z);

  constructor(private parts: PartDef[]) {
    const r = seeded(4711);
    const round = parts.map((p, i) => ({ p, i })).filter((x) => x.p.kind === 'round');
    const dist = (p: PartDef) => Math.hypot(p.c[0] - STRIKE.x, p.c[2] - STRIKE.z);
    round.sort((a, b) => dist(a.p) - dist(b.p));
    this.order = round.map((x) => x.i);
    this.own = parts.map((p) => {
      const axis = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
      const tilt = new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize().multiplyScalar((3 + r() * 4) * (Math.PI / 180));
      const shard = p.kind === 'board' ? 13 : p.kind === 'round' ? THREE.MathUtils.clamp(p.r * 0.6, 3.6, 5.6) : 8;
      // A large part glows less as it becomes itself: a whole board at full heat is a lamp, not a part.
      const heat = p.kind === 'board' ? 0 : p.kind === 'round' ? 0.3 : 0.14;
      const arc = 0.7 + 0.6 * r(), bow = (r() < 0.5 ? -1 : 1) * (0.5 + 0.5 * r());
      return { axis, heat, arc, bow, spin: 6 + r() * 5, lift: p.kind === 'round' ? 2.4 + r() * 4.6 : p.kind === 'cpu' ? 11 : p.kind === 'body' ? 2.6 : p.kind === 'frame' ? 1.6 : 0, tilt, shard, rank: 0, dist: dist(p) };
    });
    this.order.forEach((i, k) => { this.own[i].rank = this.order.length > 1 ? k / (this.order.length - 1) : 0; });
    for (let i = 0; i < parts.length; i++) this.shardPool.push({ p: new THREE.Vector3(), q: new THREE.Quaternion(), size: new THREE.Vector3(), glow: 0 });
    this.fliers = this.plan(r);
    this.boardCount = parts.filter((p) => p.kind === 'board').length;
  }

  // What flies in the shards way, and when: each board piece, each large part, and each row of small parts.
  private plan(r: () => number): Flier[] {
    const P = this.parts;
    const units: { parts: number[]; at: [number, number] }[] = [];
    const boards = P.map((p, i) => ({ p, i })).filter((x) => x.p.kind === 'board').sort((a, b) => Math.hypot(a.p.c[0] - STRIKE.x, a.p.c[2] - STRIKE.z) - Math.hypot(b.p.c[0] - STRIKE.x, b.p.c[2] - STRIKE.z));
    boards.forEach((b, k) => units.push({ parts: [b.i], at: [k * 0.035, 0.2 + k * 0.035] }));
    const one = (kind: string, at: [number, number]) => { const i = P.findIndex((p) => p.kind === kind); if (i >= 0) units.push({ parts: [i], at }); };
    one('frame', [0.17, 0.37]);
    one('body', [0.23, 0.43]);
    one('cpu', [0.29, 0.5]);
    one('plate', [0.34, 0.54]);
    one('lever', [0.4, 0.6]);
    ROWS.forEach((row, k) => {
      const parts = P.map((p, i) => ({ p, i })).filter((x) => x.p.row === row).map((x) => x.i);
      if (parts.length) units.push({ parts, at: [0.5 + k * 0.06, 0.7 + k * 0.05] });
    });
    return units.map(({ parts, at }) => {
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      for (const i of parts) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P[i].lo[k]); hi[k] = Math.max(hi[k], P[i].hi[k]); }
      const dim = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
      const centre = new THREE.Vector3((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2);
      // Its long way and its broad way at rest, turned as it stands when it arrives (the plate open, the lever up).
      const longX = dim[0] >= dim[2];
      let A = new THREE.Vector3(longX ? 1 : 0, 0, longX ? 0 : 1), B = new THREE.Vector3(longX ? 0 : 1, 0, longX ? 1 : 0);
      const hinge = P[parts[0]].hinge;
      if (hinge) {
        const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...hinge.d), hinge.open), hp = new THREE.Vector3(...hinge.p);
        A = A.applyQuaternion(rot); B = B.applyQuaternion(rot);
        centre.sub(hp).applyQuaternion(rot).add(hp);
      }
      const C = new THREE.Vector3().crossVectors(B, A);
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(A, C, B));
      const len = Math.max(dim[0], dim[2]), wide = Math.min(dim[0], dim[2]);
      const size = new THREE.Vector3(len * 0.55, Math.max(0.6, Math.min(dim[1], wide) * 0.45), Math.max(1.2, wide * 0.42));
      const axisDir = longX ? 0 : 2;
      const along = new Map<number, number>();
      for (const i of parts) along.set(i, len > 0 ? Math.abs(P[i].c[axisDir] - (axisDir === 0 ? lo[0] : lo[2])) / len : 0);
      const isBoard = P[parts[0]].kind === 'board';
      return {
        parts, go: at[0], land: at[1], board: isBoard, target: centre, q: isBoard ? ID.clone() : q, size, along, rise: parts.length > 1 ? 0.08 : 0,
        axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), spin: (isBoard ? 3 : 5) + r() * 3, arc: 0.7 + 0.6 * r(), bow: (r() < 0.5 ? -1 : 1) * (0.4 + 0.6 * r()),
      };
    });
  }

  // Writes each part's transform (three rows), heat and how far it is uncovered into out, five texels a part, and
  // says how the rest stands.
  at(way: Way, age: number, out: Float32Array): LifeAt {
    const L = LIFE[way];
    const whole = age >= L;
    const [l0, l1] = LIGHTS[way];
    const res: LifeAt = {
      show: age > 0, room: 1, flash: 0, lights: whole ? 1 : smooth(span(age, l0, l1)), front: whole ? 9 : ((age - l0) / (l1 - l0)) * 1.08,
      seat: 1, shadow: 1, lid: 1, band: null, shards: [],
    };
    for (let i = 0; i < this.parts.length; i++) this.write(out, i, this.m.identity(), 0);
    if (!res.show) { for (let i = 0; i < this.parts.length; i++) this.write(out, i, this.m.makeScale(0, 0, 0), 0); return res; }
    if (whole) return res;
    if (way === 'shards') this.shards(age, out, res);
    else if (way === 'flash') this.flash(age, out, res);
    else this.band(age, res);
    return res;
  }

  private write(out: Float32Array, i: number, m: THREE.Matrix4, heat: number, reveal?: [number, number, number, number]) {
    const e = m.elements, o = i * PART_TEXELS * 4;
    out[o] = e[0]; out[o + 1] = e[4]; out[o + 2] = e[8]; out[o + 3] = e[12];
    out[o + 4] = e[1]; out[o + 5] = e[5]; out[o + 6] = e[9]; out[o + 7] = e[13];
    out[o + 8] = e[2]; out[o + 9] = e[6]; out[o + 10] = e[10]; out[o + 11] = e[14];
    out[o + 12] = heat; out[o + 13] = 0; out[o + 14] = 0; out[o + 15] = 0;
    const [rx, ry, rz, rr] = reveal ?? [0, 0, 0, 1e5];
    out[o + 16] = rx; out[o + 17] = ry; out[o + 18] = rz; out[o + 19] = rr;
  }

  // A part's pose: moved by off, turned by q and scaled by s about its own middle, and swung about its hinge.
  private pose(i: number, off: THREE.Vector3, q: THREE.Quaternion, s: number, swing: number, rise = 1): THREE.Matrix4 {
    const p = this.parts[i], c = new THREE.Vector3(...p.c);
    const m = new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z);
    if (p.hinge && swing) {
      const hp = new THREE.Vector3(...p.hinge.p), hd = new THREE.Vector3(...p.hinge.d);
      const h = new THREE.Matrix4().makeTranslation(hp.x, hp.y, hp.z).multiply(new THREE.Matrix4().makeRotationAxis(hd, swing)).multiply(new THREE.Matrix4().makeTranslation(-hp.x, -hp.y, -hp.z));
      m.multiply(h);
    }
    // Risen this far out of its shard, from its own base, in its own rest frame.
    if (rise !== 1) m.multiply(new THREE.Matrix4().makeTranslation(0, p.lo[1], 0).multiply(new THREE.Matrix4().makeScale(1, rise, 1)).multiply(new THREE.Matrix4().makeTranslation(0, -p.lo[1], 0)));
    const r = new THREE.Matrix4().compose(new THREE.Vector3(c.x + off.x, c.y + off.y, c.z + off.z), q, new THREE.Vector3(s, s, s));
    return r.multiply(m);
  }

  // The shards way, made of shards. Every part leaves the strike point at the board's left corner and flies home.
  // The board comes as a few large pieces of itself that turn flat in flight and slide the last millimetres in, so
  // their seams close. Every other part comes as one dark splinter, the stream's kind, sized and turned to what it
  // carries: the plate standing open, the lever raised, the processor, each row of small parts. It lands, folds flat,
  // and the part rises out of it with a small hard stop; a row rises along its length. Then the plate shuts, the
  // lever latches, and the lights come on.
  private shards(age: number, out: Float32Array, res: LifeAt) {
    res.seat = smooth(span(age, 0.86, 1.02));
    res.lid = smooth(span(age, 0.5, 0.6));
    let home = 0;
    for (let i = 0; i < this.parts.length; i++) this.write(out, i, this.m.makeScale(0, 0, 0), 0);
    for (const f of this.fliers) {
      const u = span(age, f.go, f.land);
      if (age < f.go) continue;
      const d = f.target.clone().sub(this.strike);
      const dist = Math.hypot(d.x, d.z);
      const H = Math.min(22, (f.board ? 9 : 8) + 0.1 * dist) * f.arc;
      const side = new THREE.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(f.bow * (2 + 0.06 * dist) * Math.sin(Math.PI * u));
      const pos = this.strike.clone().addScaledVector(d, u).add(side).add(new THREE.Vector3(0, H * 4 * u * (1 - u), 0));
      const tumble = new THREE.Quaternion().setFromAxisAngle(f.axis, f.spin * (1 - u) ** 1.3);
      const turned = new THREE.Quaternion().slerpQuaternions(tumble.multiply(f.q), f.q, smooth(span(u, 0.45, 1)));
      if (f.board) {
        // A piece of the board is its own shard: it flies turned, lands a little out from its place and slides in.
        const i = f.parts[0], p = this.parts[i], c = new THREE.Vector3(...p.c);
        const out3 = new THREE.Vector3(c.x - SEAM_MID[0], 0, c.z - SEAM_MID[1]).normalize().multiplyScalar(3.2);
        const v = age - f.land;
        let off: THREE.Vector3, heat = 0.75;
        if (age < f.land) off = pos.clone().sub(c).add(out3.clone().multiplyScalar(u));
        else {
          const k = span(v, 0, SLIDE);
          off = out3.clone().multiplyScalar(1 - k * k).add(new THREE.Vector3(0, this.rebound(age, f.land + SLIDE, -0.35, 0.07), 0));
          heat = 0.75 * Math.exp(-v / 0.12);
          home += smooth(span(v, 0, SLIDE));
        }
        this.write(out, i, this.pose(i, off, age < f.land ? turned : ID, 1, 0), heat);
        continue;
      }
      const v = age - f.land;
      const sh = this.shardPool[f.parts[0]];
      if (age < f.land || v < f.rise + RISE) {
        // The splinter: whole in flight, then folding flat onto the seat as what it carries rises out of it.
        const fold = age < f.land ? 0 : span(v, 0, f.rise + RISE);
        sh.p.copy(age < f.land ? pos : f.target);
        sh.q.copy(age < f.land ? turned : f.q);
        sh.size.copy(f.size).multiply(new THREE.Vector3(1 - 0.25 * fold, Math.max(0.02, 1 - fold * 1.1), 1 - 0.1 * fold));
        sh.glow = 1 + 0.8 * Math.sin(Math.PI * fold);
        res.shards.push(sh);
      }
      if (age < f.land) continue;
      for (const i of f.parts) {
        const p = this.parts[i];
        const delay = f.rise * (f.along.get(i) ?? 0);
        const k = span(v - delay, 0, RISE);
        if (k <= 0) continue;
        const swing = p.hinge ? this.swing(i, age) : 0;
        const w = v - delay - RISE;
        const hop = w > 0 && w < 0.07 ? Math.sin((w / 0.07) * Math.PI) * (1 - w / 0.07) * 0.3 : 0;
        this.write(out, i, this.pose(i, this.v.set(0, hop, 0), ID, 1, swing, 0.12 + 0.88 * outCubic(k)), 0.55 * Math.exp(-Math.max(0, w) / 0.1));
      }
    }
    res.shadow = smooth(span(home, this.boardCount - 1, this.boardCount));
  }

  // The plate and the lever close once they have risen: shut, a hard stop, a small swing back.
  private swing(i: number, age: number): number {
    const p = this.parts[i];
    const [a, b] = p.kind === 'plate' ? SHUT.plate : SHUT.lever;
    const open = p.hinge!.open;
    return open * (age < a ? 1 : age < b ? 1 - span(age, a, b) ** 2 : 0) + this.rebound(age, b, open * 0.035, 0.1);
  }

  // A small swing back after a hard stop: up to amp, and gone in dur seconds.
  private rebound(age: number, at: number, amp: number, dur: number): number {
    const v = age - at;
    return v > 0 && v < dur ? -amp * Math.sin((v / dur) * Math.PI) * (1 - v / dur) : 0;
  }

  // The flash way: everything is there in the first frame, seen by the strike's flash alone, each part standing a
  // short way off its seat. They drop into place with weight, from the strike outward, the plate swings shut, the
  // lever latches, the room comes up and then the lights.
  private flash(age: number, out: Float32Array, res: LifeAt) {
    const g = 380;
    res.flash = Math.exp(-age / 0.17);
    res.room = smooth(span(age, 0.1, 0.6));
    res.seat = smooth(span(age, 0.2, 0.55));
    res.lid = smooth(span(age, 0.3, 0.4));
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i], o = this.own[i];
      if (p.hinge) {
        const [go, dur] = p.kind === 'plate' ? [0.32, 0.13] : [0.46, 0.1];
        const u = span(age, go, go + dur);
        const swing = p.hinge.open * (1 - u * u) + this.rebound(age, go + dur, p.hinge.open * 0.04, 0.09);
        this.write(out, i, this.pose(i, this.v.set(0, 0, 0), ID, 1, swing), 0);
        continue;
      }
      const go = p.kind === 'cpu' ? 0.09 : p.kind === 'round' ? 0.03 + o.rank * 0.18 : 0.02;
      const h = o.lift;
      if (!h) continue;
      const fall = Math.sqrt((2 * h) / g), t = age - go;
      let y: number, k: number;
      if (t <= 0) { y = h; k = 0; }
      else if (t < fall) { y = h - 0.5 * g * t * t; k = 1 - y / h; }
      else {
        const b = h * 0.05, tb = 2 * Math.sqrt((2 * b) / g), w = t - fall;
        y = w < tb ? b * 4 * (w / tb) * (1 - w / tb) : 0;
        k = 1;
      }
      this.q.setFromAxisAngle(this.v.copy(o.tilt).normalize(), o.tilt.length() * (1 - k));
      this.write(out, i, this.pose(i, new THREE.Vector3(0, y, 0), this.q, 1, 0), 0);
    }
  }

  // The band way: a band of light crosses from the strike and uncovers it. Its circle's middle stands well back
  // behind the strike, so it first touches the board there and is bowed only a little.
  private band(age: number, res: LifeAt) {
    const k = clamp01(age / 0.6);
    if (k >= 1) return;
    const back = 1.5 * BOARD.half * 2, clear = 10;
    const out = new THREE.Vector2(-1, -1).normalize();
    const c: [number, number] = [STRIKE.x + out.x * back, STRIKE.z + out.y * back];
    const far = Math.hypot(BOARD.half - c[0], BOARD.half - c[1]);
    const r = back - clear + (far + clear - (back - clear)) * (1 - (1 - k) ** 1.7);
    res.band = { c, r, k: Math.min(1, k / 0.04) * Math.min(1, (1 - k) / 0.07) * (0.62 + 0.38 * (1 - k)) };
  }
}

export type { Vec3 };
