import * as THREE from 'three';
import { seeded } from '../../world/build';
import type { Way } from '../../world/struck';
import { facetKind } from '../../stream/shards';
import { DIAL, HINGE, MOV, STAND, TURN } from './layout';
import type { Kind, PartDef } from './model';
import { PART_TEXELS } from './shading';

// How the watch comes onto the page at its strike, worked out from the way and the age alone: where every part is,
// how far it has opened, the shards in flight, and how the lights stand. Run back, the same numbers take it away.
// The running watch's turns and lights are handed in and laid over whatever the life has made of each part.

export const LIFE: Record<Way, number> = { shards: 1.32, band: 0.85, flash: 0.85 };
export const LIGHTS: Record<Way, number> = { shards: 1.24, band: 0.62, flash: 0.74 };

export interface ShardAt { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; kind: number; lit: number }

export interface LifeAt {
  show: boolean;
  room: number;
  flash: number;
  lit: number;
  // How much of each half's contact shadow is under it: the case back's, and the body's.
  shadow: [number, number];
  // How far the case back stands open on its hinge, in degrees, which its shadow on the table follows.
  stand: number;
  band: { c: [number, number]; r: number; k: number } | null;
  shards: ShardAt[];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (k: number) => k * k * (3 - 2 * k);
const UP = new THREE.Vector3(0, 1, 0);
const FLAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

const BAND = { cross: 0.6, back: 1.0, past: 14 } as const;

// The dial's print, or the crown and chain, turned on the table about the dial's middle.
function turnAt(deg: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeTranslation(DIAL.x, 0, DIAL.z).multiply(new THREE.Matrix4().makeRotationY(deg * (Math.PI / 180))).multiply(new THREE.Matrix4().makeTranslation(-DIAL.x, 0, -DIAL.z));
}
// The movement is turned in its case about its own middle.
const SPUN = new THREE.Matrix4().makeTranslation(MOV.x, 0, MOV.z).multiply(new THREE.Matrix4().makeRotationY(STAND.spin * (Math.PI / 180))).multiply(new THREE.Matrix4().makeTranslation(-MOV.x, 0, -MOV.z));
const PRINT = turnAt(TURN.print), CROWN_TURN = turnAt(TURN.crown);
const PRINTED: Kind[] = ['dial', 'numeral', 'hand'];

// The case back's turn on its hinge, deg degrees up from lying flat.
function hingeAt(deg: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeTranslation(0, HINGE.y, 0).multiply(new THREE.Matrix4().makeRotationZ(-deg * (Math.PI / 180))).multiply(new THREE.Matrix4().makeTranslation(0, -HINGE.y, 0));
}

// The flash way: how far each kind stands off its seat, how hard things fall, when each lets go, and the case back
// standing half closed on its hinge, falling open first.
const FLASH = {
  lift: { bridge: 3.6, wheel: 6.5, fork: 5, cock: 5.5, balance: 9, hand: 4.2, numeral: 1.6, crystal: 3.8 } as Partial<Record<Kind, number>>,
  go: { bridge: 0.3, wheel: 0.26, fork: 0.3, cock: 0.36, balance: 0.5, hand: 0.1, numeral: 0.06, crystal: 0.16 } as Partial<Record<Kind, number>>,
  g: 420,
  hinge: { open: 18, fall: 0.28 },
} as const;

// The shards way: the case back and the plate, the body and the dial, then the train in a run from the barrel, the
// bridges one by one, the numerals in a run round the dial, the hands, the crown and the chain, the cock, the
// crystal, and last of all the balance, which starts to swing when the lights come on.
interface Step { kinds?: Kind[]; row?: string; leave: number; fly: number; open: number; size: number; lit: number; lift: number; crumple?: number; run?: number }
const STEPS: Step[] = [
  { kinds: ['back', 'hinge'], leave: 0, fly: 0.2, open: 0.1, size: 16, lit: 3.4, lift: 16, crumple: 0.14 },
  { kinds: ['plate'], leave: 0.1, fly: 0.18, open: 0.08, size: 14, lit: 2.6, lift: 12, crumple: 0.12 },
  { kinds: ['body'], leave: 0.16, fly: 0.24, open: 0.1, size: 16, lit: 3.4, lift: 18, crumple: 0.14 },
  { kinds: ['dial'], leave: 0.28, fly: 0.2, open: 0.08, size: 14, lit: 2.6, lift: 14, crumple: 0.1 },
  { row: 'train', leave: 0.38, fly: 0.14, open: 0.06, size: 7, lit: 1.6, lift: 9, run: 0.22 },
  { row: 'bridge0', leave: 0.46, fly: 0.14, open: 0.07, size: 9, lit: 1.5, lift: 9 },
  { row: 'bridge1', leave: 0.51, fly: 0.14, open: 0.07, size: 8, lit: 1.5, lift: 9 },
  { row: 'bridge2', leave: 0.56, fly: 0.13, open: 0.06, size: 6, lit: 1.4, lift: 8 },
  { row: 'bridge3', leave: 0.6, fly: 0.13, open: 0.06, size: 6, lit: 1.4, lift: 8 },
  { row: 'numerals', leave: 0.56, fly: 0.16, open: 0.05, size: 6, lit: 1.3, lift: 10, run: 0.3 },
  { row: 'chain', leave: 0.68, fly: 0.15, open: 0.05, size: 7, lit: 1.3, lift: 9, run: 0.2 },
  { kinds: ['hand'], leave: 0.74, fly: 0.14, open: 0.06, size: 6, lit: 1.5, lift: 9 },
  { kinds: ['cock'], leave: 0.82, fly: 0.14, open: 0.07, size: 8, lit: 1.8, lift: 10 },
  { kinds: ['crystal'], leave: 0.9, fly: 0.14, open: 0.08, size: 12, lit: 1.2, lift: 12, crumple: 0.08 },
  { kinds: ['balance'], leave: 1.0, fly: 0.16, open: 0.08, size: 7, lit: 3.4, lift: 12 },
];

interface Opens { i: number; at: number; c: THREE.Vector3; r: number }
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
  lift: number;
  bow: number;
  crumple: number;
  // A run: once landed it travels on through these points over this long, opening each part as it passes.
  path?: THREE.Vector3[];
  run?: number;
  q: THREE.Quaternion;
  partQ: THREE.Quaternion;
}

export class Life {
  private fliers: Flier[];
  private own: { lift: number; go: number; tilt: THREE.Vector3 }[];
  private m = new THREE.Matrix4();
  private m2 = new THREE.Matrix4();
  private s = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private pool: ShardAt[] = [];
  private spin: Float32Array;
  private light: Float32Array;
  private arc: Float32Array;
  readonly strike: THREE.Vector3;
  readonly far: number;
  readonly c: [number, number];
  private near: number;
  // The case back's turn on its hinge for this frame.
  private hinge = hingeAt(STAND.deg);
  private inCase = this.hinge.clone().multiply(SPUN);

  // strike is the point the stream meets, and onTable where it lies on the table seen down the eye's ray, both in the
  // watch's millimetres as it stands.
  constructor(private parts: PartDef[], strike: THREE.Vector3, onTable: [number, number]) {
    this.strike = strike.clone();
    const r = seeded(4712);
    this.spin = new Float32Array(parts.length);
    this.light = new Float32Array(parts.length);
    this.arc = new Float32Array(parts.length);
    this.own = parts.map((p) => ({
      // The case back's parts stand off toward the dial, so they stand off less, or they would pass into its bezel.
      lift: (FLASH.lift[p.kind] ?? 0) * (p.side === 'mov' ? 0.45 : 1),
      go: (FLASH.go[p.kind] ?? 0) + 0.04 * r(),
      tilt: new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize().multiplyScalar((3 + r() * 7) * (Math.PI / 180)),
    }));
    for (let i = 0; i < 96; i++) this.pool.push({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), kind: 0, lit: 1 });
    // The band's circle stands behind the strike, away from the watch's middle. Everything is measured where it falls
    // on the table down the eye's ray, as the shader cuts it, so a standing part is reached by where it is seen.
    const mid = new THREE.Vector2(0, -6), st = new THREE.Vector2(...onTable);
    const dir = st.clone().sub(mid).normalize(), back = BAND.back * 105;
    this.c = [st.x + dir.x * back, st.y + dir.y * back];
    this.near = st.distanceTo(new THREE.Vector2(...this.c)) - 1;
    let far = 0;
    const v = new THREE.Vector3();
    for (const p of parts) for (const x of [p.lo[0], p.hi[0]]) for (const y of [p.lo[1], p.hi[1]]) for (const z of [p.lo[2], p.hi[2]]) {
      v.set(x, y, z);
      this.put(parts.indexOf(p), v);
      far = Math.max(far, Math.hypot(v.x - this.c[0], v.z - this.c[1]) + v.y * 1.4);
    }
    this.far = far + BAND.past;
    this.fliers = this.plan(seeded(93));
  }

  private kindFor(r: () => number): number { return facetKind(0.55 + 0.45 * r(), r()); }
  private reach(i: number): number { const p = this.parts[i]; return Math.max(1, Math.hypot(p.hi[0] - p.lo[0], p.hi[2] - p.lo[2]) / 2); }

  private plan(r: () => number): Flier[] {
    const P = this.parts, out: Flier[] = [], S = this.strike;
    const top = (i: number) => this.put(i, new THREE.Vector3(P[i].c[0], P[i].hi[1], P[i].c[2]));
    for (const st of STEPS) {
      const list = P.map((p, i) => ((st.kinds?.includes(p.kind) && !p.row) || (st.row && p.row === st.row) ? i : -1)).filter((i) => i >= 0);
      if (!list.length) continue;
      const yaw = r() * Math.PI * 2;
      const base = {
        from: S.clone(), kind: this.kindFor(r), axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), spin: 7 + r() * 6,
        bow: (r() < 0.5 ? -1 : 1) * (3 + 6 * r()), crumple: st.crumple ?? 0.3, size: st.size, lit: st.lit, lift: st.lift, leave: st.leave, land: st.leave + st.fly, open: st.open,
        q: new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(FLAT), partQ: new THREE.Quaternion().setFromAxisAngle(UP, ((r() * 2 - 1) * 35 * Math.PI) / 180),
      };
      if (st.run) {
        const pts = list.map(top);
        const d = [0];
        for (let k = 1; k < pts.length; k++) d.push(d[k - 1] + pts[k].distanceTo(pts[k - 1]));
        const total = Math.max(1e-3, d[d.length - 1]);
        out.push({ ...base, to: pts[0].clone(), path: pts, run: st.run, opens: list.map((i, k) => ({ i, at: (d[k] / total) * st.run!, c: new THREE.Vector3(P[i].c[0], P[i].lo[1], P[i].c[2]), r: this.reach(i) })) });
        continue;
      }
      const lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
      for (const i of list) { lo.min(new THREE.Vector3(...P[i].lo)); hi.max(new THREE.Vector3(...P[i].hi)); }
      const at = new THREE.Vector3((lo.x + hi.x) / 2, hi.y, (lo.z + hi.z) / 2);
      out.push({ ...base, to: this.put(list[0], at.clone()), opens: list.map((i) => ({ i, at: 0, c: at.clone(), r: this.reach(i) })) });
    }
    return out;
  }

  // A point of a part laid flat, where it is as the part stands.
  private put(i: number, v: THREE.Vector3): THREE.Vector3 { const m = this.pose(i); return m ? v.applyMatrix4(m) : v; }
  // How a part laid out flat is set where it rests: the case back's parts stood on the hinge, the print and the crown
  // turned about the dial's middle.
  private pose(i: number): THREE.Matrix4 | null {
    const p = this.parts[i];
    if (p.side === 'mov') return p.kind === 'back' ? this.hinge : this.inCase;
    if (PRINTED.includes(p.kind)) return PRINT;
    if (p.kind === 'crown' || p.kind === 'chain') return CROWN_TURN;
    return null;
  }

  // Each part's transform (three rows), heat and fold, and the point it folds about with the light on it. The
  // transform is given as the part laid flat; the case back's parts are then stood on the hinge.
  private write(out: Float32Array, i: number, m: THREE.Matrix4, heat = 0, fold?: { open: number; crumple: number; small: number; c: THREE.Vector3 }) {
    const p = this.parts[i];
    if (p.axis && this.spin[i] !== 0) {
      const [ax, az] = p.axis;
      this.s.makeTranslation(ax, 0, az).multiply(new THREE.Matrix4().makeRotationY(this.spin[i])).multiply(new THREE.Matrix4().makeTranslation(-ax, 0, -az));
      m = this.m.copy(m).multiply(this.s);
    }
    const pose = this.pose(i);
    if (pose) m = this.m2.copy(pose).multiply(m);
    const e = m.elements, o = i * PART_TEXELS * 4;
    out[o] = e[0]; out[o + 1] = e[4]; out[o + 2] = e[8]; out[o + 3] = e[12];
    out[o + 4] = e[1]; out[o + 5] = e[5]; out[o + 6] = e[9]; out[o + 7] = e[13];
    out[o + 8] = e[2]; out[o + 9] = e[6]; out[o + 10] = e[10]; out[o + 11] = e[14];
    out[o + 12] = heat; out[o + 13] = fold ? fold.open : 1; out[o + 14] = fold?.crumple ?? 0; out[o + 15] = fold?.small ?? 1;
    out[o + 16] = fold?.c.x ?? 0; out[o + 17] = fold?.c.y ?? 0; out[o + 18] = fold?.c.z ?? 0; out[o + 19] = this.light[i];
    out[o + 20] = p.axis?.[0] ?? 0; out[o + 21] = p.axis?.[1] ?? 0; out[o + 22] = p.axis ? p.r : 0; out[o + 23] = this.arc[i];
  }

  private rebound(age: number, at: number, amp: number, dur: number): number {
    const v = age - at;
    return v > 0 && v < dur ? amp * Math.sin((v / dur) * Math.PI) * (1 - v / dur) : 0;
  }

  // spin is each part's turn about its arbor, light the stream's light on it, and arc where that light stands round
  // the part's arbor, in the part's own turn.
  at(way: Way, age: number, out: Float32Array, spin?: Float32Array, light?: Float32Array, arc?: Float32Array): LifeAt {
    if (spin) this.spin.set(spin); else this.spin.fill(0);
    if (light) this.light.set(light); else this.light.fill(0);
    if (arc) this.arc.set(arc); else this.arc.fill(0);
    const L = LIFE[way];
    this.hinge = hingeAt(STAND.deg);
    this.inCase.copy(this.hinge).multiply(SPUN);
    const res: LifeAt = { show: age > 0, room: 1, flash: 0, lit: age - LIGHTS[way], shadow: [1, 1], stand: STAND.deg, band: null, shards: [] };
    const id = new THREE.Matrix4();
    if (!res.show) { const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < this.parts.length; i++) { this.spin[i] = 0; this.write(out, i, z); } return res; }
    if (age >= L) { for (let i = 0; i < this.parts.length; i++) this.write(out, i, id); return res; }
    if (way === 'shards') this.shards(age, out, res);
    else if (way === 'flash') this.flash(age, out, res);
    else { for (let i = 0; i < this.parts.length; i++) this.write(out, i, id); this.band(age, res); }
    return res;
  }

  private shards(age: number, out: Float32Array, res: LifeAt) {
    const z = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.parts.length; i++) this.write(out, i, z);
    let n = 0;
    const home = [0, 0];
    for (const f of this.fliers) {
      if (age < f.leave) continue;
      const u = span(age, f.leave, f.land);
      const running = f.path && f.run && age >= f.land && age < f.land + f.run;
      if ((age < f.land || running) && n < this.pool.length) {
        const sh = this.pool[n++];
        if (running && f.path && f.run) {
          const w = (age - f.land) / f.run;
          const d = w * (f.path.length - 1), k = Math.min(f.path.length - 2, Math.floor(d));
          sh.p.copy(f.path[k]).lerp(f.path[k + 1], d - k);
          sh.q.copy(f.q);
          sh.s.setScalar(f.size * (1 - 0.55 * w)).multiply(new THREE.Vector3(1, 1, 0.5));
        } else {
          const e = u * (1.15 - 0.15 * u);
          sh.p.copy(f.from).lerp(f.to, e);
          const side = this.v.set(-(f.to.z - f.from.z), 0, f.to.x - f.from.x).normalize().multiplyScalar(f.bow * Math.sin(Math.PI * u));
          sh.p.add(side).addScaledVector(UP, f.lift * 4 * u * (1 - u));
          sh.q.copy(new THREE.Quaternion().setFromAxisAngle(f.axis, f.spin * (1 - u) ** 1.4)).multiply(f.q);
          sh.s.setScalar(f.size * smooth(span(age - f.leave, 0, 0.05)));
        }
        sh.kind = f.kind;
        sh.lit = f.lit;
        res.shards.push(sh);
        if (!running) continue;
      }
      for (const o of f.opens) {
        const t = age - f.land - o.at;
        if (t < 0) continue;
        const k = span(t, 0, f.open), open = smooth(k);
        const lie = new THREE.Quaternion().slerpQuaternions(f.partQ, new THREE.Quaternion(), open);
        const fold = { open: k >= 1 ? 1 : open, crumple: o.r * f.crumple, small: THREE.MathUtils.clamp(f.size / o.r, 0.12, 1), c: o.c };
        const m = new THREE.Matrix4().makeTranslation(o.c.x, o.c.y, o.c.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(lie)).multiply(new THREE.Matrix4().makeTranslation(-o.c.x, -o.c.y, -o.c.z));
        const knock = -this.rebound(age, f.land + o.at + f.open, this.parts[o.i].kind === 'balance' ? 0.35 : 0.25, 0.07);
        m.premultiply(new THREE.Matrix4().makeTranslation(0, knock, 0));
        this.write(out, o.i, m, 0.4 * (1 - open), fold);
        const kd = this.parts[o.i].kind;
        if (kd === 'back') home[0] = open;
        if (kd === 'body') home[1] = open;
      }
    }
    res.shadow = [smooth(home[0]), smooth(home[1])];
  }

  private flash(age: number, out: Float32Array, res: LifeAt) {
    res.flash = Math.exp(-age / 0.24) * (1 - span(age, 0.55, LIFE.flash));
    res.room = smooth(span(age, 0.12, 0.55));
    // The case back, half closed on its hinge, falls open to where it stands and knocks against its stop.
    const H = FLASH.hinge, u = span(age, 0, H.fall);
    const deg = STAND.deg + H.open * (1 - u * u) - H.open * this.rebound(age, H.fall, 0.06, 0.12);
    this.hinge = hingeAt(deg);
    this.inCase.copy(this.hinge).multiply(SPUN);
    res.shadow = [u * u, 1];
    res.stand = deg;
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i], o = this.own[i];
      let y = 0, k = 1;
      if (o.lift) {
        const g = FLASH.g, fall = Math.sqrt((2 * o.lift) / g), t = age - o.go;
        if (t <= 0) { y = o.lift; k = 0; }
        else if (t < fall) { y = o.lift - 0.5 * g * t * t; k = 1 - y / o.lift; }
        else {
          const b = Math.min(0.4, o.lift * 0.05), tb = 2 * Math.sqrt((2 * b) / g), w = t - fall;
          y = w < tb ? b * 4 * (w / tb) * (1 - w / tb) : 0;
        }
      }
      const len = o.tilt.length();
      this.q.setFromAxisAngle(len > 1e-6 ? this.v.copy(o.tilt).divideScalar(len) : UP, len * (1 - k));
      const c = new THREE.Vector3(...p.c);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(c.x, c.y + y, c.z), this.q, new THREE.Vector3(1, 1, 1)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
      this.write(out, i, m);
    }
  }

  private band(age: number, res: LifeAt) {
    const k = clamp01(age / BAND.cross);
    if (k >= 1) return;
    const near = this.near;
    const r = near + (this.far - near) * (1 - (1 - Math.min(1, k / 0.9)) ** 1.6);
    res.band = { c: this.c, r, k: Math.min(1, k / 0.025) * Math.min(1, (1 - k) / 0.1) * (0.5 + 0.5 * (1 - k)) };
  }
}
