import * as THREE from 'three';
import { seeded } from '../../world/build';
import type { Way } from '../../world/struck';
import { facetKind } from '../../stream/shards';
import { BOARD, IHS, PLATE, SOCKET, STRIKE } from './layout';
import type { PartDef } from './model';
import { PART_TEXELS } from './shading';

// How the processor comes onto the page at its strike, worked out from the way and the age alone: where every part
// is, how much of it shows, the shards in flight, and how the lights stand. Run back, the same numbers take it away.

export const LIFE: Record<Way, number> = { shards: 1.2, band: 0.85, flash: 0.75 };

// When the lights come on, in each way: the first wave of the pulse leaves the seam then.
const LIGHTS: Record<Way, number> = { shards: 1.07, band: 0.6, flash: 0.56 };

// The stream's shards on the page run from 4.5 to 17 CSS pixels from middle to farthest point, and the board is 160
// pixels across there: so a shard here is between these, in millimetres.
export const SHARD_MM = [3.1, 11.6] as const;

export interface ShardAt { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; kind: number }

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
const BAND = { cross: 0.56, back: 2.6, past: 16 } as const;

// The flash way: how far each kind of part stands off its seat at the strike, how hard things fall, and when the
// plate and the lever start to swing shut and how long they take.
const FLASH = { cpu: 7, body: 1.6, frame: 0.9, round: [1.4, 3.6] as [number, number], g: 720, plate: [0.06, 0.22, 64] as const, lever: [0.12, 0.2, 72] as const };

// The shards way, in seconds: the board's tiles leave the strike over the first span and lock in a wave that spreads
// from the struck corner; then the socket, the processor, the plate and the lever; then the rows; and each shard's
// flight, and how long a part takes to spread out of the shard that lands on it.
const SHARDS = {
  tiles: { leave: [0, 0.3] as [number, number], fly: [0.14, 0.2] as [number, number], open: 1.3, slide: 0.07, show: 0.024 },
  big: [
    { kinds: ['frame', 'body'], leave: 0.3, fly: 0.2, show: 0.12, size: 11.4 },
    { kinds: ['cpu'], leave: 0.36, fly: 0.2, show: 0.09, size: 10.4 },
    { kinds: ['plate'], leave: 0.42, fly: 0.2, show: 0.1, size: 11 },
    { kinds: ['lever'], leave: 0.47, fly: 0.2, show: 0.08, size: 9 },
  ],
  // The plate and the lever arrive standing open this far, then swing shut: start and how long.
  open: { plate: 70, lever: 66 },
  shut: { plate: [0.72, 0.12] as [number, number], lever: [0.8, 0.12] as [number, number] },
  rows: { first: 0.55, apart: 0.06, run: 0.1, fly: 0.15, show: 0.04 },
} as const;

interface Flier {
  parts: number[];
  leave: number;
  land: number;
  show: number;
  // Where it leaves from and lands, and where the part spreads from on the board and how far it has to reach.
  from: THREE.Vector3;
  to: THREE.Vector3;
  at: [number, number];
  reach: number;
  size: number;
  kind: number;
  axis: THREE.Vector3;
  spin: number;
  yaw: number;
  lift: number;
  bow: number;
  tile: boolean;
}

export class Life {
  private own: { tilt: THREE.Vector3; lift: number; fall: number }[];
  private fliers: Flier[] = [];
  private tiles: number[] = [];
  private eye = new THREE.Vector3(0, 500, 0);
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private pool: ShardAt[] = [];
  readonly strike = new THREE.Vector3(STRIKE.x, STRIKE.y + 1.5, STRIKE.z);

  constructor(private parts: PartDef[]) {
    const r = seeded(4711);
    const ds = parts.map((p) => Math.hypot(p.c[0] - SOCKET.x, p.c[2] - SOCKET.z)), dmax = Math.max(...ds);
    this.own = parts.map((p, i) => {
      const tilt = new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize().multiplyScalar((2.5 + r() * 4.5) * (Math.PI / 180));
      const lift = p.kind === 'round' ? FLASH.round[0] + (FLASH.round[1] - FLASH.round[0]) * r() : p.kind === 'cpu' ? FLASH.cpu : p.kind === 'body' ? FLASH.body : p.kind === 'frame' ? FLASH.frame : 0;
      // Nearly all of them let go at once, the ones nearest the socket a moment first: one fall, overlapping.
      return { tilt, lift, fall: 0.02 + 0.07 * (ds[i] / dmax) + 0.015 * r() };
    });
    this.tiles = parts.map((p, i) => (p.kind === 'board' ? i : -1)).filter((i) => i >= 0);
    for (let i = 0; i < parts.length; i++) this.pool.push({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), kind: 0 });
  }

  // The eye, in the piece's millimetres: a part spreads out of its shard along the eye's rays, as the band cuts.
  setEye(e: THREE.Vector3) {
    if (e.distanceTo(this.eye) < 0.01 && this.fliers.length) return;
    this.eye.copy(e);
    this.fliers = this.plan(seeded(91));
  }

  private onBoard(p: THREE.Vector3): [number, number] {
    const e = this.eye, k = e.y / Math.max(e.y - p.y, 1);
    return [e.x + (p.x - e.x) * k, e.z + (p.z - e.z) * k];
  }

  // How far from a point on the board a part's corners lie, along the eye's rays, in the pose it lands in.
  private reach(at: [number, number], parts: number[], pose: (i: number) => THREE.Matrix4): number {
    let r = 0;
    for (const i of parts) {
      const p = this.parts[i], m = pose(i);
      for (const x of [p.lo[0], p.hi[0]]) for (const y of [p.lo[1], p.hi[1]]) for (const z of [p.lo[2], p.hi[2]]) {
        const [bx, bz] = this.onBoard(this.v.set(x, y, z).applyMatrix4(m));
        r = Math.max(r, Math.max(Math.abs(bx - at[0]), Math.abs(bz - at[1])) * 1.19);
      }
    }
    return r + 1;
  }

  private kindFor(size: number, r: () => number): number {
    return facetKind(clamp01((size - SHARD_MM[0]) / (SHARD_MM[1] - SHARD_MM[0])), r());
  }

  // What flies in the shards way, and when.
  private plan(r: () => number): Flier[] {
    const P = this.parts, out: Flier[] = [];
    const S = this.strike;
    const fly = (parts: number[], leave: number, flight: number, show: number, to: THREE.Vector3, size: number, pose: (i: number) => THREE.Matrix4, tile = false) => {
      const at = this.onBoard(to);
      const d = Math.hypot(to.x - S.x, to.z - S.z);
      out.push({
        parts, leave, land: leave + flight, show, from: S.clone(), to: to.clone(), at, reach: this.reach(at, parts, pose), size, kind: this.kindFor(size, r),
        axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), spin: 7 + r() * 6, yaw: r() * Math.PI * 2,
        lift: (tile ? 7 : 9) + 0.11 * d + r() * 4, bow: (r() < 0.5 ? -1 : 1) * (2 + 0.05 * d) * (0.4 + 0.6 * r()), tile,
      });
    };
    const rest = () => this.m.identity();
    // The board's tiles, in a wave from the struck corner.
    const tiles = this.tiles.slice().sort((a, b) => Math.hypot(P[a].c[0] - S.x, P[a].c[2] - S.z) - Math.hypot(P[b].c[0] - S.x, P[b].c[2] - S.z));
    const T = SHARDS.tiles, far = Math.hypot(BOARD.half * 2, BOARD.half * 2);
    for (const i of tiles) {
      const k = Math.hypot(P[i].c[0] - S.x, P[i].c[2] - S.z) / far;
      const flight = T.fly[0] + (T.fly[1] - T.fly[0]) * k;
      fly([i], T.leave[0] + (T.leave[1] - T.leave[0]) * k, flight, T.show, new THREE.Vector3(P[i].c[0], 0, P[i].c[2]), Math.min(SHARD_MM[1], P[i].r * 0.72), rest, true);
    }
    // The socket, the processor, the plate standing open and the lever raised.
    for (const big of SHARDS.big) {
      const parts = P.map((p, i) => (big.kinds.includes(p.kind as never) ? i : -1)).filter((i) => i >= 0);
      if (!parts.length) continue;
      const pose = (i: number) => this.swingPose(i, P[i].kind === 'plate' ? SHARDS.open.plate : P[i].kind === 'lever' ? SHARDS.open.lever : 0);
      const lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
      for (const i of parts) for (const x of [P[i].lo[0], P[i].hi[0]]) for (const y of [P[i].lo[1], P[i].hi[1]]) for (const z of [P[i].lo[2], P[i].hi[2]]) {
        this.v.set(x, y, z).applyMatrix4(pose(i));
        lo.min(this.v); hi.max(this.v);
      }
      const to = new THREE.Vector3((lo.x + hi.x) / 2, hi.y, (lo.z + hi.z) / 2);
      if (big.kinds[0] === 'cpu') to.set(SOCKET.x, IHS.y2, SOCKET.z);
      if (big.kinds[0] === 'frame') to.set(SOCKET.x - 18, PLATE.y, SOCKET.z - 14);
      fly(parts, big.leave, big.fly, big.show, to, big.size, pose);
    }
    // The rows, one after another, each a quick run outward from the strike.
    const rows = new Map<string, number[]>();
    P.forEach((p, i) => { if (p.row) rows.set(p.row, [...(rows.get(p.row) ?? []), i]); });
    const dist = (i: number) => Math.hypot(P[i].c[0] - S.x, P[i].c[2] - S.z);
    const order = [...rows.entries()].map(([, list]) => list.sort((a, b) => dist(a) - dist(b))).sort((a, b) => dist(a[0]) - dist(b[0]));
    const R = SHARDS.rows;
    order.forEach((list, k) => list.forEach((i, j) => {
      const p = P[i], size = THREE.MathUtils.clamp(Math.max(p.hi[0] - p.lo[0], p.hi[2] - p.lo[2]) * 0.62, SHARD_MM[0], 7.2);
      fly([i], R.first + k * R.apart + (list.length > 1 ? (j / (list.length - 1)) * R.run : 0), R.fly, R.show, new THREE.Vector3((p.lo[0] + p.hi[0]) / 2, p.hi[1], (p.lo[2] + p.hi[2]) / 2), size, rest);
    }));
    return out;
  }

  // A part turned about its hinge by this many degrees, open.
  private swingPose(i: number, deg: number): THREE.Matrix4 {
    const p = this.parts[i];
    if (!p.hinge || !deg) return new THREE.Matrix4();
    return this.hingeMatrix(p, Math.sign(p.hinge.open) * deg * (Math.PI / 180));
  }

  private hingeMatrix(p: PartDef, a: number): THREE.Matrix4 {
    const hp = new THREE.Vector3(...p.hinge!.p), hd = new THREE.Vector3(...p.hinge!.d);
    return new THREE.Matrix4().makeTranslation(hp.x, hp.y, hp.z).multiply(new THREE.Matrix4().makeRotationAxis(hd, a)).multiply(new THREE.Matrix4().makeTranslation(-hp.x, -hp.y, -hp.z));
  }

  // Each part's transform (three rows), heat and how much of it shows, five texels a part; and how the rest stands.
  at(way: Way, age: number, out: Float32Array): LifeAt {
    const L = LIFE[way];
    const res: LifeAt = { show: age > 0, room: 1, flash: 0, lit: age - LIGHTS[way], shadow: 1, band: null, shards: [] };
    for (let i = 0; i < this.parts.length; i++) this.write(out, i, this.m.identity(), 0);
    if (!res.show) { for (let i = 0; i < this.parts.length; i++) this.write(out, i, this.m.makeScale(0, 0, 0), 0); return res; }
    if (age >= L) return res;
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
    const [rx, rz, rr, burn] = reveal ?? [0, 0, 1e5, 0];
    out[o + 16] = rx; out[o + 17] = rz; out[o + 18] = rr; out[o + 19] = burn;
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

  // The shards way. Every piece of it leaves the strike point at the board's left corner as one of the stream's own
  // shards and flies home with weight, tumbling, and lands on its seat; the part spreads out of it along the eye's
  // rays from where it touched, behind a thin hot line. The board is a shatter run backwards: its tiles land a little
  // apart in a wave from the corner and slide together, their seams closing. The plate and the lever arrive open and
  // swing shut. Then the rows, a quick run each. Then the lights.
  private shards(age: number, out: Float32Array, res: LifeAt) {
    let home = 0, n = 0;
    for (let i = 0; i < this.parts.length; i++) this.write(out, i, this.m.makeScale(0, 0, 0), 0);
    for (const f of this.fliers) {
      if (age < f.leave) continue;
      const u = span(age, f.leave, f.land);
      const v = age - f.land;
      // In flight, and diving into the part as it spreads out of it.
      const goneIn = v > 0 ? span(v, 0, f.show * 0.6) : 0;
      if (goneIn < 1) {
        const sh = this.pool[n++];
        const e = u * (1.15 - 0.15 * u);
        sh.p.copy(f.from).lerp(f.to, e);
        const side = this.v.set(-(f.to.z - f.from.z), 0, f.to.x - f.from.x).normalize().multiplyScalar(f.bow * Math.sin(Math.PI * u));
        sh.p.add(side).addScaledVector(UP, f.lift * 4 * u * (1 - u));
        const tumble = new THREE.Quaternion().setFromAxisAngle(f.axis, f.spin * (1 - u) ** 1.4);
        const flat = new THREE.Quaternion().setFromAxisAngle(UP, f.yaw).multiply(FLAT);
        sh.q.copy(tumble).multiply(flat);
        const k = 1 - goneIn;
        // It grows out of the stream as it leaves, and flattens onto its seat as it lands.
        const born = smooth(span(age - f.leave, 0, 0.05));
        const press = smooth(span(u, 0.82, 1));
        sh.s.set(f.size * born * k, f.size * born * k, f.size * born * k * (1 - 0.55 * press));
        sh.kind = f.kind;
        res.shards.push(sh);
      }
      if (v < 0) continue;
      const spread = smooth(span(v, 0, f.show));
      const reveal: [number, number, number, number] = [f.at[0], f.at[1], spread >= 1 ? 1e5 : f.reach * spread, spread >= 1 ? 0 : 0.95 * (1 - spread * 0.6)];
      for (const i of f.parts) {
        const p = this.parts[i];
        if (f.tile) {
          // Landed a little out from its place, it slides in and stops hard: the seam closes.
          const dx = p.c[0] - SOCKET.x * 0.2, dz = p.c[2] - SOCKET.z * 0.2, l = Math.hypot(dx, dz) || 1;
          const s = span(v, f.show, f.show + SHARDS.tiles.slide), gap = SHARDS.tiles.open * (1 - s) * (1 - s);
          const knock = -this.rebound(age, f.land + f.show + SHARDS.tiles.slide, 0.25, 0.06);
          this.m.makeTranslation((dx / l) * gap, knock, (dz / l) * gap);
          this.write(out, i, this.m, 0.7 * Math.exp(-Math.max(0, v - f.show) / 0.08), reveal);
          home += s;
          continue;
        }
        let m = this.m.identity();
        if (p.kind === 'plate') m = this.hingeMatrix(p, this.shut(p, age, SHARDS.shut.plate[0], SHARDS.shut.plate[1], SHARDS.open.plate));
        else if (p.kind === 'lever') m = this.hingeMatrix(p, this.shut(p, age, SHARDS.shut.lever[0], SHARDS.shut.lever[1], SHARDS.open.lever));
        else m.makeTranslation(0, -this.rebound(age, f.land, p.kind === 'round' ? 0.18 : 0.3, 0.06), 0);
        this.write(out, i, m, 0, reveal);
      }
    }
    res.shadow = smooth(clamp01(home / Math.max(1, this.tiles.length)));
  }

  // The flash way: everything is there in the first frame, seen by the strike's flash alone, each part standing off
  // its seat: the processor above the socket, the plate open, the lever up, the parts round it lifted and tipped.
  // Then one fall: they all let go within a few hundredths, the ones by the socket first, and land with weight and a
  // small hard bounce while the plate swings down onto the processor and the lever comes over and latches. The room
  // comes up as they settle, and then the lights.
  private flash(age: number, out: Float32Array, res: LifeAt) {
    res.flash = Math.exp(-age / 0.22);
    res.room = smooth(span(age, 0.1, 0.45));
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i], o = this.own[i];
      if (p.hinge) {
        const [go, dur, deg] = p.kind === 'plate' ? FLASH.plate : FLASH.lever;
        this.write(out, i, this.hingeMatrix(p, this.shut(p, age, go, dur, deg)), 0);
        continue;
      }
      if (!o.lift) continue;
      const g = FLASH.g, fall = Math.sqrt((2 * o.lift) / g), t = age - o.fall;
      let y: number, k: number;
      if (t <= 0) { y = o.lift; k = 0; }
      else if (t < fall) { y = o.lift - 0.5 * g * t * t; k = 1 - y / o.lift; }
      else {
        const b = Math.min(0.35, o.lift * 0.05), tb = 2 * Math.sqrt((2 * b) / g), w = t - fall;
        y = w < tb ? b * 4 * (w / tb) * (1 - w / tb) : 0;
        k = 1;
      }
      const len = o.tilt.length();
      this.q.setFromAxisAngle(len > 1e-6 ? this.v.copy(o.tilt).divideScalar(len) : UP, len * (1 - k));
      const c = new THREE.Vector3(...p.c);
      this.m.compose(new THREE.Vector3(c.x, c.y + y, c.z), this.q, new THREE.Vector3(1, 1, 1)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
      this.write(out, i, this.m, 0);
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
    const r = near + (far - near) * (1 - (1 - k) ** 1.45);
    res.band = { c, r, k: Math.min(1, k / 0.025) * Math.min(1, (1 - k) / 0.1) * (0.4 + 0.6 * (1 - k) ** 1.4) };
    res.shadow = 1;
  }
}

