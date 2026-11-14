import * as THREE from 'three';
import { seeded, type Vec3 } from '../../world/build';
import type { Way } from '../../world/struck';
import { BOARD, STRIKE } from './layout';
import type { PartDef } from './model';
import { PART_TEXELS } from './shading';

// How the processor comes onto the page at its strike, worked out from the way and the age alone: where every part
// is, how hot it is, the shards in flight, and how the lights stand. Run back, the same numbers take it away again.

export const LIFE: Record<Way, number> = { shards: 1.2, band: 0.85, flash: 0.75 };
// When the board has finished laying itself out from the struck corner, in the shards way.
const BOARD_LAY = 0.27;

// When the lights come on, in each way.
const LIGHTS: Record<Way, [number, number]> = { shards: [0.98, 1.2], band: [0.6, 0.85], flash: [0.58, 0.75] };

// fold: how far its needle points have drawn in as it becomes its part, 0 to 1.
export interface ShardAt { p: THREE.Vector3; q: THREE.Quaternion; s: number; glow: number; fold: number }

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
interface Own { axis: THREE.Vector3; spin: number; lift: number; tilt: THREE.Vector3; shard: number; heat: number; rank: number; dist: number; arc: number; bow: number }

export class Life {
  private own: Own[];
  private order: number[];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private shardPool: ShardAt[] = [];
  readonly strike = new THREE.Vector3(STRIKE.x, STRIKE.y + 1.5, STRIKE.z);
  private layFrom = new THREE.Vector3(STRIKE.x + 7, 0, STRIKE.z + 7);

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
    for (let i = 0; i < parts.length; i++) this.shardPool.push({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: 0, glow: 0, fold: 0 });
  }

  // Writes each part's transform (three rows), heat and how far it is uncovered into out, five texels a part, and
  // says how the rest stands.
  at(way: Way, age: number, out: Float32Array): LifeAt {
    const L = LIFE[way];
    const whole = age >= L;
    const [l0, l1] = LIGHTS[way];
    const res: LifeAt = {
      show: age > 0, room: 1, flash: 0, lights: whole ? 1 : smooth(span(age, l0, l1)), front: whole ? 9 : ((age - l0) / (l1 - l0)) * 1.08,
      seat: 1, lid: 1, band: null, shards: [],
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
  private pose(i: number, off: THREE.Vector3, q: THREE.Quaternion, s: number, swing: number): THREE.Matrix4 {
    const p = this.parts[i], c = new THREE.Vector3(...p.c);
    const m = new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z);
    if (p.hinge && swing) {
      const hp = new THREE.Vector3(...p.hinge.p), hd = new THREE.Vector3(...p.hinge.d);
      const h = new THREE.Matrix4().makeTranslation(hp.x, hp.y, hp.z).multiply(new THREE.Matrix4().makeRotationAxis(hd, swing)).multiply(new THREE.Matrix4().makeTranslation(-hp.x, -hp.y, -hp.z));
      m.multiply(h);
    }
    const r = new THREE.Matrix4().compose(new THREE.Vector3(c.x + off.x, c.y + off.y, c.z + off.z), q, new THREE.Vector3(s, s, s));
    return r.multiply(m);
  }

  // The shards way: each part leaves the strike as a hot shard and flies an arc with weight, tumbling. Over the last
  // short stretch its points fold in and the part unfolds from where it touches down (the plate from its hinge, the
  // lever from its pivot), drops the last millimetre and stops hard. The board's shard lands just inside the struck
  // corner and the board lays itself out from there. Then the socket, the processor, the plate closing, the lever
  // latching, a run of the parts round it, and the lights.
  private shards(age: number, out: Float32Array, res: LifeAt) {
    const sched = (i: number): { go: number; land: number; shut?: [number, number] } => {
      const p = this.parts[i], o = this.own[i];
      switch (p.kind) {
        case 'board': return { go: 0, land: 0.09 };
        case 'frame': return { go: 0.1, land: 0.3 };
        case 'body': return { go: 0.15, land: 0.35 };
        case 'cpu': return { go: 0.22, land: 0.46 };
        case 'plate': return { go: 0.28, land: 0.48, shut: [0.5, 0.62] };
        case 'lever': return { go: 0.34, land: 0.54, shut: [0.64, 0.75] };
        default: { const go = 0.42 + o.rank * 0.34; return { go, land: go + 0.16 + o.dist * 0.0007 }; }
      }
    };
    res.seat = smooth(span(age, 0.82, 1.0));
    res.lid = smooth(span(age, 0.4, 0.5));
    const lay = this.layFrom;
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i], o = this.own[i], s = sched(i);
      const c = new THREE.Vector3(...p.c);
      // Where its shard touches down: the board just inside the corner, a hinged part at its hinge, any other on its
      // side facing the strike.
      const dir = new THREE.Vector3(c.x - this.strike.x, 0, c.z - this.strike.z).normalize();
      const touch = p.kind === 'board' ? lay.clone() : p.hinge ? new THREE.Vector3(...p.hinge.p) : c.clone().addScaledVector(dir, -p.r * 0.7);
      if (p.kind !== 'board') touch.y = c.y + 1.5;
      if (age < s.go) { this.write(out, i, this.m.makeScale(0, 0, 0), 0); continue; }
      const swing = p.hinge && s.shut ? p.hinge.open * (age < s.shut[0] ? 1 : age < s.shut[1] ? 1 - span(age, ...s.shut) ** 2 : 0) + this.rebound(age, s.shut[1], p.hinge.open * 0.035, 0.1) : 0;
      if (p.kind === 'board') {
        if (age < s.land) this.flight(i, age, s.go, s.land, touch, 0.035, res);
        const k = outCubic(span(age, s.land - 0.035, BOARD_LAY));
        this.write(out, i, this.m.identity(), 0, k >= 1 ? undefined : [lay.x, lay.y, lay.z, k * 175]);
        continue;
      }
      const become = p.kind === 'round' ? 0.07 : 0.1;
      if (age < s.land) {
        const k = this.flight(i, age, s.go, s.land, touch, become, res);
        if (k <= 0) { this.write(out, i, this.m.makeScale(0, 0, 0), 0); continue; }
        // The part comes into being at its seat, a hair above it, uncovered outward from where the shard is.
        const r0 = p.hinge ? p.r * 2.4 : p.r * 2.2;
        const drop = 1.6 * (1 - k) ** 2;
        this.write(out, i, this.pose(i, this.v.set(0, drop, 0), ID, 1, swing), o.heat, [touch.x, touch.y - 1.5, touch.z, r0 * outCubic(k)]);
        continue;
      }
      const v = age - s.land;
      const hop = v < 0.09 ? Math.sin((v / 0.09) * Math.PI) * (1 - v / 0.09) * 0.45 : 0;
      this.write(out, i, this.pose(i, this.v.set(0, hop, 0), ID, 1, swing), o.heat * Math.exp(-v / 0.09));
    }
  }

  // A part's shard in flight from the strike to where it touches down: an arc with weight, bowed to one side, tumbling
  // less as it nears. Returns how far it has become its part, 0 to 1, over the last stretch.
  private flight(i: number, age: number, go: number, land: number, touch: THREE.Vector3, become: number, res: LifeAt): number {
    const o = this.own[i], p = this.parts[i];
    const u = span(age, go, land);
    const d = touch.clone().sub(this.strike);
    const dist = Math.hypot(d.x, d.z);
    const H = p.kind === 'board' ? 9 : (12 + 0.3 * dist) * o.arc;
    const side = new THREE.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(o.bow * (3 + 0.12 * dist) * Math.sin(Math.PI * u));
    const pos = this.strike.clone().addScaledVector(d, u).add(side).add(new THREE.Vector3(0, H * 4 * u * (1 - u), 0));
    const k = become > 0 ? span(age, land - become, land) : 0;
    const sh = this.shardPool[i];
    sh.p.copy(pos);
    sh.q.setFromAxisAngle(o.axis, o.spin * (1 - u) ** 1.4);
    sh.s = o.shard * (1 - outCubic(k)) * Math.min(1, u * 6 + 0.35);
    sh.glow = 1 + 1.2 * k;
    sh.fold = k;
    if (sh.s > 0.02) res.shards.push(sh);
    return k;
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
