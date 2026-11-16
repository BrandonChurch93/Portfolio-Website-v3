import * as THREE from 'three';
import { DEG, JEWELS, MOV, PALLET, RUN, TIME } from './layout';
import type { PartDef, Role } from './model';
import { JEWEL_MAX } from './shading';

// The watch running, worked out from how long it has run (tau) and how long its lights have been on: the balance
// swings, and each time it passes its middle the escape wheel steps and the train steps with it at its true ratios,
// so the small seconds tick five times a second. The stream's light travels the train from the barrel to the balance
// wheel by wheel, crosses to the dial, and runs round the numerals, wave after wave, each its own strength and some
// skipped.

const ORDER: Role[] = ['barrel', 'center', 'third', 'fourth', 'escape', 'fork', 'balance'];
const WAVE = { step: 0.13, every: 2.3, jitter: 0.8, skip: 0.22, rise: 0.06, fall: 0.38, ring: 0.075, dialFall: 0.55 } as const;
const STEADY = { train: 0.05, jewel: 0.22, still: 0.25 } as const;

const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (k: number) => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };
const crest = (x: number, fall: number) => (x < 0 ? 0 : x < WAVE.rise ? x / WAVE.rise : Math.exp(-(x - WAVE.rise) / fall));

export interface Running { spin: Float32Array; light: Float32Array; jewels: THREE.Vector4[]; spring: number; moving: boolean }

export class Runner {
  private spin: Float32Array;
  private light: Float32Array;
  private jewels = Array.from({ length: JEWEL_MAX }, () => new THREE.Vector4());
  private byRole = new Map<Role, number>();
  private numerals: number[] = [];

  constructor(private parts: PartDef[]) {
    this.spin = new Float32Array(parts.length);
    this.light = new Float32Array(parts.length);
    parts.forEach((p, i) => { if (p.role) this.byRole.set(p.role, i); if (p.kind === 'numeral') this.numerals[p.hour ?? 0] = i; });
    JEWELS.forEach((j, k) => this.jewels[k].set(j.c[0] + MOV.x, j.y + 0.3, j.c[1] + MOV.z, 0));
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
    const lightOf = (role: Role) => this.light[this.byRole.get(role) ?? -1] ?? 0;
    if (glow > 0 && lit >= 0) {
      if (still) {
        for (const r of ORDER) { const i = this.byRole.get(r); if (i !== undefined) this.light[i] = STEADY.still * glow; }
        for (const i of this.numerals) this.light[i] = STEADY.still * 0.8 * glow;
      } else {
        const last = Math.floor(lit / WAVE.every);
        for (let k = Math.max(0, last - 2); k <= last + 1; k++) {
          const start = k === 0 ? 0 : k * WAVE.every + WAVE.jitter * (hash(k) - 0.5);
          if (start > lit) continue;
          const a = k === 0 ? 1 : hash(k + 0.5) < WAVE.skip ? 0 : 0.45 + 0.45 * hash(k + 0.25);
          if (!a) continue;
          ORDER.forEach((r, j) => {
            const i = this.byRole.get(r);
            if (i === undefined) return;
            this.light[i] += a * crest(lit - start - j * WAVE.step * (0.85 + 0.3 * hash(k * 7 + j)), WAVE.fall);
          });
          const across = start + ORDER.length * WAVE.step + 0.15;
          this.numerals.forEach((i, h) => { this.light[i] += a * 0.9 * crest(lit - across - h * WAVE.ring * (0.8 + 0.4 * hash(k * 13 + h)), WAVE.dialFall); });
        }
        for (const r of ORDER) { const i = this.byRole.get(r); if (i !== undefined) this.light[i] = (this.light[i] + STEADY.train) * glow; }
        for (const i of this.numerals) this.light[i] *= glow;
      }
    }
    JEWELS.forEach((j, k) => {
      const role: Role = j.of === 'pallet' ? 'fork' : (j.of as Role);
      this.jewels[k].w = glow > 0 && lit >= 0 ? STEADY.jewel * glow + 1.1 * lightOf(role) : 0;
    });
    return { spin: this.spin, light: this.light, jewels: this.jewels, spring: -bal, moving: amp > 0.001 };
  }
}
