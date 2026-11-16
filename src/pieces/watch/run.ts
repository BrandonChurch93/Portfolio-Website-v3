import * as THREE from 'three';
import { BALANCE, BARREL, DEG, JEWELS, MOV, PALLET, RUN, TIME, TRAIN, type P2 } from './layout';
import type { PartDef, Role } from './model';
import { JEWEL_MAX } from './shading';

// The watch running, worked out from how long it has run (tau) and how long its lights have been on: the balance
// swings, and each time it passes its middle the escape wheel steps and the train steps with it at its true ratios,
// so the small seconds tick five times a second. The stream's light passes along the train from the barrel to the
// balance one wheel at a time, each lit and dark again before the next takes it, running round each wheel from where
// the wheel before meshes to where the next one does. The balance takes it last and brightest, then it crosses to
// the dial and runs round the numerals. Wave after wave, each its own strength and pace, some skipped.

const ORDER: Role[] = ['barrel', 'center', 'third', 'fourth', 'escape', 'fork', 'balance'];
const WAVE = { first: 0.35, every: 3.6, jitter: 0.9, skip: 0.2, gap: 0.38, uneven: 0.28, rise: 0.05, hold: 0.32, ring: 0.085, dial: 0.36, last: { power: 1.7, hold: 0.8 } } as const;
const STEADY = { train: 0.03, jewel: 0.16, still: 0.25 } as const;

const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (k: number) => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };
// One part's light: up fast, then down to nothing over hold, so it is dark again before the next part lights.
const crest = (x: number, hold: number) => (x < 0 ? 0 : x < WAVE.rise ? x / WAVE.rise : Math.max(0, 1 - (x - WAVE.rise) / hold) ** 2);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export interface Running { spin: Float32Array; light: Float32Array; arc: Float32Array; jewels: THREE.Vector4[]; spring: number; moving: boolean }

export class Runner {
  private spin: Float32Array;
  private light: Float32Array;
  private arc: Float32Array;
  private jewels = Array.from({ length: JEWEL_MAX }, () => new THREE.Vector4());
  private byRole = new Map<Role, number>();
  private numerals: number[] = [];
  // Where the light comes into each part and where it leaves, as angles round its arbor in the movement's plane.
  private path = new Map<Role, [number, number]>();

  constructor(private parts: PartDef[]) {
    this.spin = new Float32Array(parts.length);
    this.light = new Float32Array(parts.length);
    this.arc = new Float32Array(parts.length);
    parts.forEach((p, i) => { if (p.role) this.byRole.set(p.role, i); if (p.kind === 'numeral') this.numerals[p.hour ?? 0] = i; });
    JEWELS.forEach((j, k) => this.jewels[k].set(j.c[0] + MOV.x, j.y + 0.3, j.c[1] + MOV.z, 0));
    const at: Partial<Record<Role, P2>> = { barrel: BARREL.c, fork: PALLET.c, balance: BALANCE.c };
    for (const w of TRAIN) at[w.name as Role] = w.c;
    const toward = (a: P2, b: P2) => Math.atan2(b[1] - a[1], b[0] - a[0]);
    ORDER.forEach((r, k) => {
      const c = at[r]!, prev = at[ORDER[k - 1]], next = at[ORDER[k + 1]];
      const out = next ? toward(c, next) : toward(c, prev!) + Math.PI * 1.9;
      const into = prev ? toward(c, prev) : out + Math.PI;
      this.path.set(r, [into, out]);
    });
  }

  // tau: seconds it has run; amp: how far the balance swings, 0 to 1; lit: seconds since its lights came on; glow:
  // how much of the stream's light is in it; still: reduced motion, where nothing moves and the light holds.
  at(tau: number, amp: number, lit: number, glow: number, still: boolean): Running {
    const x = 2 * RUN.hz * tau;
    const beats = Math.floor(x) + smooth((x - Math.floor(x)) / 0.08);
    const swing = Math.sin(2 * Math.PI * RUN.hz * tau);
    const bal = amp * RUN.swing * DEG * swing;
    const esc = -beats * RUN.step * DEG;
    const fourth = -esc * (7 / 70), third = -fourth * (8 / 60), center = -third * (8 / 64), barrel = -center * (10 / 80);
    const sec = TIME.s + beats / 5, min = TIME.m + sec / 60, hr = TIME.h + min / 60;
    const turn: Partial<Record<Role, number>> = {
      barrel, center, third, fourth, escape: esc, balance: bal,
      fork: PALLET.bank * DEG * Math.max(-1, Math.min(1, swing * 3)),
      second: -(sec / 60) * Math.PI * 2, minute: -(min / 60) * Math.PI * 2, hour: -(hr / 12) * Math.PI * 2,
    };
    this.spin.fill(0);
    for (const [role, i] of this.byRole) this.spin[i] = turn[role] ?? 0;

    this.light.fill(0);
    this.arc.fill(0);
    const lightOf = (role: Role) => this.light[this.byRole.get(role) ?? -1] ?? 0;
    if (glow > 0 && lit >= 0) {
      if (still) {
        for (const r of ORDER) { const i = this.byRole.get(r); if (i !== undefined) this.light[i] = STEADY.still * glow; }
        for (const i of this.numerals) this.light[i] = STEADY.still * 0.8 * glow;
      } else {
        const last = Math.floor(lit / WAVE.every);
        const best = new Float32Array(this.parts.length);
        for (let k = Math.max(0, last - 2); k <= last + 1; k++) {
          const start = WAVE.first + (k === 0 ? 0 : k * WAVE.every + WAVE.jitter * (hash(k) - 0.5));
          if (start > lit) continue;
          const a = k === 0 ? 1 : hash(k + 0.5) < WAVE.skip ? 0 : 0.5 + 0.5 * hash(k + 0.25);
          if (!a) continue;
          let t0 = start;
          ORDER.forEach((r, j) => {
            if (j > 0) t0 += WAVE.gap + WAVE.uneven * hash(k * 7 + j);
            const i = this.byRole.get(r);
            if (i === undefined) return;
            const end = r === 'balance', hold = end ? WAVE.last.hold : WAVE.hold;
            const v = a * (end ? WAVE.last.power : 1) * crest(lit - t0, hold);
            this.light[i] += v;
            if (v > best[i]) {
              best[i] = v;
              const [into, out] = this.path.get(r)!;
              const u = smooth((lit - t0) / (WAVE.rise + hold * 0.8));
              this.arc[i] = into + (end ? out - into : wrap(out - into)) * u + this.spin[i];
            }
          });
          const across = t0 + WAVE.last.hold * 0.4;
          this.numerals.forEach((i, h) => { this.light[i] += a * 1.1 * crest(lit - across - h * WAVE.ring * (0.75 + 0.5 * hash(k * 13 + h)), WAVE.dial); });
        }
        for (const r of ORDER) { const i = this.byRole.get(r); if (i !== undefined) this.light[i] = (this.light[i] + STEADY.train) * glow; }
        for (const i of this.numerals) this.light[i] *= glow;
      }
    }
    JEWELS.forEach((j, k) => {
      const role: Role = j.of === 'pallet' ? 'fork' : (j.of as Role);
      this.jewels[k].w = glow > 0 && lit >= 0 ? STEADY.jewel * glow + 1.2 * lightOf(role) : 0;
    });
    return { spin: this.spin, light: this.light, arc: this.arc, jewels: this.jewels, spring: -bal, moving: amp > 0.001 };
  }
}
