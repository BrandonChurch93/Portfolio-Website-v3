import * as THREE from 'three';
import { hex } from '../../../../config/palette';
import { BOARD, KEYS, SHARP, SOFT, U, type Grid } from './layout';

// The light under the keys, worked out for every key each frame: the wave that brings the board on, a slow swell at
// rest, and the glow the pointer leaves as it crosses. Each key's light is written to a small texture its cap and
// switch read, and spread into two maps: a fine one for the plate between the caps and a wide soft one for what
// spills onto the rim and the mat.
// A light is kept as the square root of a quarter of its strength, so dim light keeps its steps in eight bits.

const C = { ember: new THREE.Color(hex('ember')), flame: new THREE.Color(hex('flame')), hot: new THREE.Color(hex('hot')), pale: new THREE.Color(hex('pale')) };
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Light by strength: deep ember, through the flame, to hot and then pale gold at the top. Never white.
export function ramp(i: number, out: THREE.Color): THREE.Color {
  out.copy(C.ember).lerp(C.flame, ss(0.05, 0.45, i));
  out.lerp(C.hot, ss(0.55, 1.0, i));
  return out.lerp(C.pale, ss(1.05, 1.55, i));
}

// The wave: how wide its front is as a share of the board, and how long a key flares after it passes.
const WAVE = { band: 0.42, flare: 0.34 };
// At rest: the level each key sits at, and the slow swell across the board.
const REST = { level: 0.3, swell: 0.08, period: 8.5, second: 0.045, period2: 13.7 };
// The pointer's glow: its reach in millimetres, how quickly it follows, how long a key it left takes to cool, and how
// much it adds at its middle.
export const TRAIL = { reach: 31, follow: 0.075, cool: 0.55, peak: 1.05 };

const encode = (v: number) => Math.round(Math.sqrt(Math.min(1, Math.max(0, v / 4))) * 255);

function makeTex(w: number, h: number, linear: boolean): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array(w * h * 4), w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = t.magFilter = linear ? THREE.LinearFilter : THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

// Which key lights each cell of a grid, and how strongly: brightest over the switch, where its light comes up.
function cover(g: Grid, focus: boolean): { key: Int16Array; w: Float32Array } {
  const key = new Int16Array(g.nx * g.nz).fill(-1), w = new Float32Array(g.nx * g.nz);
  for (let j = 0; j < g.nz; j++) for (let i = 0; i < g.nx; i++) {
    const x = g.x0 + (i + 0.5) * g.cell, z = g.z0 + (j + 0.5) * g.cell;
    for (const k of KEYS) {
      const dx = x - k.x, dz = z - k.z;
      if (Math.abs(dx) > (k.w * U) / 2 || Math.abs(dz) > U / 2) continue;
      key[j * g.nx + i] = k.i;
      w[j * g.nx + i] = focus ? 0.35 + 0.65 * Math.exp(-(dx * dx + dz * dz) / (2 * 5.5 * 5.5)) : 1;
      break;
    }
  }
  return { key, w };
}

function blur(src: Float32Array, nx: number, nz: number, r: number, passes: number, tmp: Float32Array): void {
  const n = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    for (let j = 0; j < nz; j++) for (let c = 0; c < 3; c++) {
      let s = 0;
      for (let i = -r; i <= r; i++) s += src[(j * nx + Math.min(nx - 1, Math.max(0, i))) * 3 + c];
      for (let i = 0; i < nx; i++) {
        tmp[(j * nx + i) * 3 + c] = s / n;
        s += src[(j * nx + Math.min(nx - 1, i + r + 1)) * 3 + c] - src[(j * nx + Math.max(0, i - r)) * 3 + c];
      }
    }
    for (let i = 0; i < nx; i++) for (let c = 0; c < 3; c++) {
      let s = 0;
      for (let j = -r; j <= r; j++) s += tmp[(Math.min(nz - 1, Math.max(0, j)) * nx + i) * 3 + c];
      for (let j = 0; j < nz; j++) {
        src[(j * nx + i) * 3 + c] = s / n;
        s += tmp[(Math.min(nz - 1, j + r + 1) * nx + i) * 3 + c] - tmp[(Math.max(0, j - r) * nx + i) * 3 + c];
      }
    }
  }
}

export interface LightInput { t: number; keys: number; still: boolean; led: number; at: [number, number] | null }

export class KeyLight {
  readonly keyTex = makeTex(128, 1, false);
  readonly sharpTex = makeTex(SHARP.nx, SHARP.nz, true);
  readonly softTex = makeTex(SOFT.nx, SOFT.nz, true);
  // Each key's light, as a color already scaled by its strength.
  readonly emit = new Float32Array(KEYS.length * 3);
  private heat = new Float32Array(KEYS.length);
  private passed = new Float64Array(KEYS.length).fill(-Infinity);
  private across = KEYS.map((k) => ((k.x + BOARD.w / 2) / BOARD.w) * 0.84 + (k.row / 5) * 0.16);
  private sharp = cover(SHARP, true);
  private soft = cover(SOFT, false);
  private sharpF = new Float32Array(SHARP.nx * SHARP.nz * 3);
  private softF = new Float32Array(SOFT.nx * SOFT.nz * 3);
  private tmp = new Float32Array(Math.max(SHARP.nx * SHARP.nz, SOFT.nx * SOFT.nz) * 3);
  private lag: [number, number] | null = null;
  private last = -1;
  private first = true;
  private col = new THREE.Color();
  // The level the small lights on the rim are set from.
  level = 0;

  // Returns true while anything in the light is changing by itself.
  step(o: LightInput): boolean {
    const dt = this.last < 0 ? 0 : Math.min(0.1, Math.max(0, o.t - this.last));
    this.last = o.t;
    if (o.at && o.led > 0.001) {
      if (!this.lag || o.still) this.lag = [o.at[0], o.at[1]];
      else { const k = 1 - Math.exp(-dt / TRAIL.follow); this.lag[0] += (o.at[0] - this.lag[0]) * k; this.lag[1] += (o.at[1] - this.lag[1]) * k; }
    }
    let busy = false;
    const cool = Math.exp(-dt / TRAIL.cool);
    for (let i = 0; i < KEYS.length; i++) {
      const k = KEYS[i], x = this.across[i];
      const u = o.keys * (1 + WAVE.band) - x;
      const on = ss(0, 0.1, u);
      let flare: number;
      if (o.still) flare = u > 0 ? Math.exp(-u / 0.09) * ss(0, 0.015, u) : 0;
      else {
        if (u <= 0) this.passed[i] = -Infinity;
        else if (this.passed[i] === -Infinity) this.passed[i] = this.first ? o.t - 60 : o.t;
        const age = o.t - this.passed[i];
        flare = Math.exp(-age / WAVE.flare) * ss(0, 0.05, age);
        if (age < WAVE.flare * 6) busy = true;
      }
      const rest = REST.level + (o.still ? 0 : REST.swell * Math.sin(2 * Math.PI * (o.t / REST.period - x * 0.85)) + REST.second * Math.sin(2 * Math.PI * (o.t / REST.period2 + x * 0.6 + k.row * 0.07)));
      let glow = 0;
      if (this.lag && o.led > 0.001) {
        const dx = k.x - this.lag[0], dz = k.z - this.lag[1];
        glow = Math.exp(-(dx * dx + dz * dz) / (TRAIL.reach * TRAIL.reach)) * o.led;
      }
      const h = o.still ? glow : Math.max(this.heat[i] * cool, glow);
      if (h > 0.004 && h > glow + 0.002) busy = true;
      this.heat[i] = h;
      const level = on * (rest + h * TRAIL.peak) + flare * 0.72;
      ramp(level, this.col).multiplyScalar(Math.min(level, 1.35) * 0.95);
      this.emit[i * 3] = this.col.r; this.emit[i * 3 + 1] = this.col.g; this.emit[i * 3 + 2] = this.col.b;
    }
    this.first = false;
    this.level = o.keys;
    this.write();
    return busy || (!o.still && o.keys > 0);
  }

  private write(): void {
    const kd = this.keyTex.image.data as Uint8Array;
    for (let i = 0; i < KEYS.length; i++) for (let c = 0; c < 3; c++) kd[i * 4 + c] = encode(this.emit[i * 3 + c]);
    this.keyTex.needsUpdate = true;
    this.fill(this.sharp, this.sharpF, SHARP);
    blur(this.sharpF, SHARP.nx, SHARP.nz, 1, 1, this.tmp);
    this.pack(this.sharpF, this.sharpTex);
    this.fill(this.soft, this.softF, SOFT);
    blur(this.softF, SOFT.nx, SOFT.nz, 2, 3, this.tmp);
    this.pack(this.softF, this.softTex);
  }

  private fill(c: { key: Int16Array; w: Float32Array }, out: Float32Array, g: Grid): void {
    for (let i = 0; i < g.nx * g.nz; i++) {
      const k = c.key[i];
      if (k < 0) { out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = 0; continue; }
      const w = c.w[i];
      out[i * 3] = this.emit[k * 3] * w; out[i * 3 + 1] = this.emit[k * 3 + 1] * w; out[i * 3 + 2] = this.emit[k * 3 + 2] * w;
    }
  }

  private pack(src: Float32Array, tex: THREE.DataTexture): void {
    const d = tex.image.data as Uint8Array;
    for (let i = 0; i < src.length / 3; i++) { d[i * 4] = encode(src[i * 3]); d[i * 4 + 1] = encode(src[i * 3 + 1]); d[i * 4 + 2] = encode(src[i * 3 + 2]); d[i * 4 + 3] = 255; }
    tex.needsUpdate = true;
  }

  dispose(): void {
    this.keyTex.dispose();
    this.sharpTex.dispose();
    this.softTex.dispose();
  }
}

// Where a grid lies, for a shader: its corner, and one over its size.
export const gridAt = (g: Grid) => new THREE.Vector4(g.x0, g.z0, 1 / (g.nx * g.cell), 1 / (g.nz * g.cell));
