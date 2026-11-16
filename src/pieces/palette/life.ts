import * as THREE from 'three';
import { seeded } from '../../world/build';
import type { Way } from '../../world/struck';
import { facetKind } from '../../stream/shards';
import { STRIKE, rim } from './layout';
import type { PartDef } from './model';
import { PART_TEXELS } from './shading';

// How the palette comes onto the page at its strike, worked out from the way and the age alone, as the CPU's is
// (src/pieces/cpu/life.ts): where every part is, how far it has opened, the shards in flight, how the lights stand.
// Run back, the same numbers take it away.

export const LIFE: Record<Way, number> = { shards: 1.25, band: 0.85, flash: 0.8 };

// When the lights come on in each way: the first dab lights then.
const LIGHTS: Record<Way, number> = { shards: 1.1, band: 0.6, flash: 0.62 };

export interface ShardAt { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; kind: number; lit: number }

export interface LifeAt {
  show: boolean;
  room: number;
  flash: number;
  lit: number;
  shadow: number;
  brushShadow: number;
  band: { c: [number, number]; r: number; k: number } | null;
  shards: ShardAt[];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (k: number) => k * k * (3 - 2 * k);
const UP = new THREE.Vector3(0, 1, 0);
const FLAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

// The band: how long it takes to cross, how far behind the strike the middle of its circle stands, in millimetres, and
// how far past the far end it runs out, so the brush's handle hanging over the edge is crossed too.
const BAND = { cross: 0.58, back: 280, past: 30 } as const;

// The flash way: how far the brush and the knife stand over the board and how far they are tipped, how small the
// paints are, how hard things fall, and how the paints swell home.
const FLASH = { brush: 15, knife: 12, tip: 7, small: 0.3, mixFlat: 0.25, g: 420, swell: { at: 0.06, apart: 0.035, dur: 0.3, wobble: 0.16 } } as const;

// The shards way, in seconds. The board's tiles leave first and lock together in a wave from the struck end. Then each
// dab along the rim, one shard each, in order from the strike; the mixing ground; the knife; the brush, with its bead.
// The stream's shards on the page run from 4.5 to 17 CSS pixels, and the board is about 160 across there: so a shard
// here is between 10 and 40 millimetres.
const SHARDS = {
  tiles: { leave: [0, 0.18] as [number, number], fly: [0.12, 0.17] as [number, number], gap: 1.8, slide: 0.07, open: 0.06, size: [11, 18] as [number, number], lit: 1, turn: 25 },
  dabs: { first: 0.32, apart: 0.045, fly: 0.15, open: 0.08, size: 13, lit: 2.2, lift: 30 },
  big: [
    { kinds: ['mix'], leave: 0.56, fly: 0.17, open: 0.1, size: 28, lit: 3.0, lift: 40, crumple: 0.14 },
    { kinds: ['knife'], leave: 0.66, fly: 0.17, open: 0.09, size: 22, lit: 2.2, lift: 44, crumple: 0.12 },
    { kinds: ['brush', 'bead'], leave: 0.76, fly: 0.2, open: 0.1, size: 26, lit: 2.6, lift: 52, crumple: 0.1 },
  ],
} as const;

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
  tile: boolean;
  crumple: number;
  q: THREE.Quaternion;
  partQ: THREE.Quaternion;
}

export class Life {
  private fliers: Flier[];
  private tiles: number[];
  private own: { tilt: THREE.Vector3; fall: number }[];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private pool: ShardAt[] = [];
  readonly strike = new THREE.Vector3(STRIKE.x, 1.5, STRIKE.z);
  private reachMost: number;
  private bandFar = 0;

  constructor(private parts: PartDef[]) {
    const r = seeded(4713);
    this.own = parts.map(() => ({ tilt: new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize().multiplyScalar((3 + r() * 4) * (Math.PI / 180)), fall: 0.02 * r() }));
    this.tiles = parts.map((p, i) => (p.kind === 'board' ? i : -1)).filter((i) => i >= 0);
    const edge = rim(180);
    this.reachMost = Math.max(...edge.map(([x, z]) => Math.hypot(x - STRIKE.x, z - STRIKE.z)));
    const d = new THREE.Vector2(STRIKE.x, STRIKE.z).normalize();
    this.bandFar = Math.max(...edge.map(([x, z]) => Math.hypot(x - STRIKE.x - d.x * BAND.back, z - STRIKE.z - d.y * BAND.back)));
    for (let i = 0; i < 64; i++) this.pool.push({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), kind: 0, lit: 1 });
    this.fliers = this.plan(seeded(93));
  }

  private kindFor(r: () => number): number { return facetKind(0.55 + 0.45 * r(), r()); }

  private plan(r: () => number): Flier[] {
    const P = this.parts, out: Flier[] = [], S = this.strike;
    const fly = (o: Omit<Flier, 'from' | 'kind' | 'axis' | 'spin' | 'bow' | 'q' | 'partQ' | 'crumple'> & { bow?: number; crumple?: number; turn?: number }) => {
      const yaw = r() * Math.PI * 2;
      const d = Math.hypot(o.to.x - S.x, o.to.z - S.z);
      const turn = ((o.turn ?? 30) * (r() * 2 - 1) * Math.PI) / 180;
      out.push({
        ...o, from: S.clone(), kind: this.kindFor(r), axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), spin: 7 + r() * 6, crumple: o.crumple ?? 0.3,
        bow: o.bow ?? (r() < 0.5 ? -1 : 1) * (4 + 0.03 * d) * (0.4 + 0.6 * r()), q: new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(FLAT),
        partQ: new THREE.Quaternion().setFromAxisAngle(UP, turn),
      });
    };
    const dist = (i: number) => Math.hypot(P[i].c[0] - S.x, P[i].c[2] - S.z);
    const T = SHARDS.tiles;
    for (const i of this.tiles.slice().sort((a, b) => dist(a) - dist(b))) {
      const k = dist(i) / this.reachMost, leave = T.leave[0] + (T.leave[1] - T.leave[0]) * k, flight = T.fly[0] + (T.fly[1] - T.fly[0]) * k;
      const c = new THREE.Vector3(P[i].c[0], 0, P[i].c[2]);
      const size = THREE.MathUtils.clamp(P[i].r * 0.3, T.size[0], T.size[1]);
      fly({ opens: [{ i, at: 0, c, r: P[i].r }], leave, land: leave + flight, open: T.open, to: c, size, lit: T.lit, lift: 8 + 0.08 * dist(i) + 4 * r(), tile: true, turn: T.turn, crumple: 0.22 });
    }
    const D = SHARDS.dabs;
    P.map((p, i) => (p.kind === 'dab' ? i : -1)).filter((i) => i >= 0).sort((a, b) => (P[a].n ?? 0) - (P[b].n ?? 0)).forEach((i, k) => {
      const c = new THREE.Vector3(P[i].c[0], 0, P[i].c[2]);
      const leave = D.first + k * D.apart * (0.8 + 0.4 * r());
      fly({ opens: [{ i, at: 0, c, r: P[i].r }], leave, land: leave + D.fly, open: D.open, to: c.clone().setY(3), size: D.size, lit: D.lit, lift: D.lift, tile: false, crumple: 0.3 });
    });
    for (const big of SHARDS.big) {
      const list = P.map((p, i) => ((big.kinds as readonly string[]).includes(p.kind) ? i : -1)).filter((i) => i >= 0);
      if (!list.length) continue;
      const p0 = P[list[0]];
      const at = new THREE.Vector3(p0.c[0], p0.c[1], p0.c[2]);
      fly({ opens: list.map((i) => ({ i, at: P[i].kind === 'bead' ? 0.03 : 0, c: new THREE.Vector3(P[i].c[0], P[i].kind === 'bead' ? 0 : P[i].c[1], P[i].c[2]), r: Math.max(P[i].r, 6) })), leave: big.leave, land: big.leave + big.fly, open: big.open, to: at, size: big.size, lit: big.lit, lift: big.lift, tile: false, bow: 6, crumple: big.crumple });
    }
    return out;
  }

  at(way: Way, age: number, out: Float32Array): LifeAt {
    const L = LIFE[way];
    const res: LifeAt = { show: age > 0, room: 1, flash: 0, lit: age - LIGHTS[way], shadow: 1, brushShadow: 1, band: null, shards: [] };
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
    let home = 0, brushHome = 0, n = 0;
    for (let i = 0; i < this.parts.length; i++) this.write(out, i, this.m.makeScale(0, 0, 0));
    for (const f of this.fliers) {
      if (age < f.leave) continue;
      const u = span(age, f.leave, f.land);
      if (age < f.land) {
        if (n >= this.pool.length) continue;
        const sh = this.pool[n++];
        const e = u * (1.15 - 0.15 * u);
        sh.p.copy(f.from).lerp(f.to, e);
        const side = this.v.set(-(f.to.z - f.from.z), 0, f.to.x - f.from.x).normalize().multiplyScalar(f.bow * Math.sin(Math.PI * u));
        sh.p.add(side).addScaledVector(UP, f.lift * 4 * u * (1 - u));
        const tumble = new THREE.Quaternion().setFromAxisAngle(f.axis, f.spin * (1 - u) ** 1.4);
        sh.q.copy(tumble).multiply(f.q);
        sh.s.setScalar(f.size * smooth(span(age - f.leave, 0, 0.05)));
        sh.kind = f.kind;
        sh.lit = f.lit;
        res.shards.push(sh);
        continue;
      }
      for (const o of f.opens) {
        const p = this.parts[o.i];
        const t = age - f.land - o.at;
        if (t < 0) continue;
        const k = span(t, 0, f.open), open = smooth(k);
        const lie = new THREE.Quaternion().slerpQuaternions(f.partQ, new THREE.Quaternion(), open);
        const fold = { open: k >= 1 ? 1 : open, crumple: o.r * f.crumple, small: THREE.MathUtils.clamp(f.size / o.r, 0.1, 1), c: o.c };
        const turn = new THREE.Matrix4().makeTranslation(o.c.x, o.c.y, o.c.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(lie)).multiply(new THREE.Matrix4().makeTranslation(-o.c.x, -o.c.y, -o.c.z));
        const heat = 0.38 * (1 - open);
        if (f.tile) {
          const dx = p.c[0] * 0.8, dz = p.c[2] * 0.8, l = Math.hypot(dx, dz) || 1;
          const s = span(t, f.open, f.open + SHARDS.tiles.slide), gap = SHARDS.tiles.gap * (1 - s) * (1 - s);
          const knock = -this.rebound(age, f.land + f.open + SHARDS.tiles.slide, 0.4, 0.06);
          this.m.makeTranslation((dx / l) * gap, knock, (dz / l) * gap).multiply(turn);
          this.write(out, o.i, this.m, k < 1 ? heat : 0.5 * Math.exp(-Math.max(0, t - f.open) / 0.08) * (1 - 0.5 * s), fold);
          home += s;
          continue;
        }
        if (p.kind === 'brush') brushHome = open;
        const drop = this.rebound(age, f.land + o.at + f.open, p.kind === 'dab' || p.kind === 'bead' ? 0.6 : 1.1, 0.07);
        const m = new THREE.Matrix4().makeTranslation(0, -drop, 0).multiply(turn);
        this.write(out, o.i, m, heat, fold);
      }
    }
    res.shadow = smooth(clamp01(home / Math.max(1, this.tiles.length)));
    res.brushShadow = brushHome;
  }

  // The flash way: the board is there in the first frame, seen by the strike's flash alone. The brush and the knife
  // stand a little over it, tipped, and the paints are small. The brush and the knife let go and land with weight and a
  // small hard bounce, the paints swell to their size one after another along the rim and settle, and the room comes up.
  private flash(age: number, out: Float32Array, res: LifeAt) {
    res.flash = Math.exp(-age / 0.24) * (1 - span(age, 0.5, LIFE.flash));
    res.room = smooth(span(age, 0.12, 0.5));
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i], o = this.own[i];
      const c = new THREE.Vector3(p.c[0], 0, p.c[2]);
      if (p.kind === 'dab' || p.kind === 'mix' || p.kind === 'bead') {
        const S = FLASH.swell, k = p.kind === 'dab' ? (p.n ?? 0) : p.kind === 'mix' ? 3.5 : 6.5;
        const t = age - S.at - k * S.apart;
        const w = t <= 0 ? 0 : t >= S.dur ? 1 : 1 - Math.exp(-t / (S.dur * 0.22)) * Math.cos((t / S.dur) * Math.PI * 2.2) * (1 - t / S.dur);
        const g = (p.kind === 'mix' ? FLASH.mixFlat : FLASH.small) + (1 - (p.kind === 'mix' ? FLASH.mixFlat : FLASH.small)) * Math.min(1 + S.wobble, w);
        const sx = p.kind === 'mix' ? 1 : g, sy = g;
        this.m.makeTranslation(c.x, 0, c.z).multiply(new THREE.Matrix4().makeScale(sx, sy, sx)).multiply(new THREE.Matrix4().makeTranslation(-c.x, 0, -c.z));
        this.write(out, i, this.m);
        continue;
      }
      if (p.kind !== 'brush' && p.kind !== 'knife') continue;
      const lift = p.kind === 'brush' ? FLASH.brush : FLASH.knife;
      const g = FLASH.g, fall = Math.sqrt((2 * lift) / g), t = age - 0.05 - o.fall - (p.kind === 'knife' ? 0.04 : 0);
      let y: number, k: number;
      if (t <= 0) { y = lift; k = 0; }
      else if (t < fall) { y = lift - 0.5 * g * t * t; k = 1 - y / lift; }
      else {
        const b = 0.7, tb = 2 * Math.sqrt((2 * b) / g), wv = t - fall;
        y = wv < tb ? b * 4 * (wv / tb) * (1 - wv / tb) : 0;
        k = 1;
      }
      const len = o.tilt.length();
      this.q.setFromAxisAngle(len > 1e-6 ? this.v.copy(o.tilt).divideScalar(len) : UP, ((FLASH.tip * Math.PI) / 180) * (1 - k));
      const pc = new THREE.Vector3(...p.c);
      this.m.compose(new THREE.Vector3(pc.x, pc.y + y, pc.z), this.q, new THREE.Vector3(1, 1, 1)).multiply(new THREE.Matrix4().makeTranslation(-pc.x, -pc.y, -pc.z));
      this.write(out, i, this.m);
      if (p.kind === 'brush') res.brushShadow = 1 - 0.6 * (y / lift);
    }
  }

  private band(age: number, res: LifeAt) {
    const k = clamp01(age / BAND.cross);
    if (k >= 1) return;
    const dir = new THREE.Vector2(STRIKE.x, STRIKE.z).normalize();
    const c: [number, number] = [STRIKE.x + dir.x * BAND.back, STRIKE.z + dir.y * BAND.back];
    const far = this.bandFar + BAND.past;
    const near = Math.hypot(STRIKE.x - c[0], STRIKE.z - c[1]) - 1;
    const r = near + (far - near) * (1 - (1 - Math.min(1, k / 0.9)) ** 1.6);
    res.band = { c, r, k: Math.min(1, k / 0.025) * Math.min(1, (1 - k) / 0.1) * (0.5 + 0.5 * (1 - k)) };
  }
}
