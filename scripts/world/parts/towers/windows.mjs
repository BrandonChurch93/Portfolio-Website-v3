// The map of every window of the towers: one texel a window, its red how lit the room is, its green how pale its
// light is (ember to pale gold), each in a few steps (WINDOW.steps) so the map packs small; its blue is empty. A
// room's blind is worked out from its place (blindOf). Windows are given out in fields, one for each face of a bay,
// and lit as a city's are: whole floors of a building lit or dark together, across all its bays (a floor is known by
// its height on the building, so every field of a building agrees), a tenant's run of rooms along a floor lit
// together, and no two neighbours alike. How busy a field is overall is its own (busy, 0 to 1). What is not given out
// is filled the same way, so the map's smaller copies (what a window smaller than a pixel shows) hold the same
// average.
import { WINDOW, blindOf, hash2, shown } from '../../../../src/pieces/world/parts/towers/windows.ts';
import { L, linear } from '../../lib/plan.mjs';

// How many rooms of a field are lit: a share of them, at least on[0] and on[1] more for the busiest; how bright a
// lit room is at least, and how often an unlit one is dimly lit. Fewer rooms, more brightly: a city's windows seen
// from far off are its brightest rooms, and the rest is its wall.
// A floor is lit as a whole with a chance of floor[0] and floor[1] more for the busiest, and a lit floor lights its
// rooms this many times as often (full), a dark one this share as often (empty).
// A building's floors are told apart every `storey` units up, and a floor is lit with its neighbour `pair` of the time.
const LIT = { on: [0.2, 0.6], level: 0.62, dim: 0.1, floor: [0.05, 0.9], full: 2.2, empty: 0.06, storey: 2.3, pair: 0.55 };

export class Windows {
  constructor(seed, size = WINDOW.map) {
    [this.size, this.tall] = size;
    this.data = new Uint8Array(this.size * this.tall * 3);
    this.owner = new Int32Array(this.size * this.tall).fill(-1);
    this.rand = L.seeded(seed);
    this.sky = new Int32Array(this.size);
    this.used = 0;
    this.fields = [];
    this.colors = WINDOW.colors.map((n) => linear(n));
    this.fill(0, 0, this.size, this.tall, 99, 0.5);
  }
  // A field of cols by rows windows: where it begins in the map.
  // clump makes the clumps of a city's: whole floors dark, runs of rooms lit together up a building, and fewer dim
  // rooms between, so a busy building and a quiet one are told apart from far off.
  // floors: the building's own number, the height of the field's first row on it and how tall a row is, so its
  // floors are the building's.
  take(cols, rows, mood = 0, busy = 0.5, clump = false, floors = null) {
    // Where it goes: on the skyline of what is taken, where it would stand lowest, the first such place from the left.
    const sky = this.sky;
    let best = -1, low = Infinity;
    for (let x = 0; x + cols <= this.size; x++) {
      let h = 0;
      for (let k = x; k < x + cols && h < low; k++) h = Math.max(h, sky[k]);
      if (h < low) { low = h; best = x; }
    }
    if (best < 0 || low + rows > this.tall) throw new Error(`windows: no room for ${cols} by ${rows}`);
    const at = { c0: best, r0: low, cols, rows };
    sky.fill(low + rows, best, best + cols);
    this.used = Math.max(this.used, low + rows);
    this.fill(at.c0, at.r0, cols, rows, mood, busy, clump, floors);
    const k = this.fields.length;
    for (let r = 0; r < rows; r++) this.owner.fill(k, (at.r0 + r) * this.size + at.c0, (at.r0 + r) * this.size + at.c0 + cols);
    this.fields.push(at);
    return at;
  }
  fill(c0, r0, cols, rows, mood, busy, clump = false, floors = null) {
    const R = this.rand, below = [], on = LIT.on[0] + LIT.on[1] * busy, p = LIT.floor[0] + LIT.floor[1] * busy;
    // A floor is lit or dark as a whole, mostly: a busy building has most of its floors lit end to end, a quiet one
    // a floor or two. A floor keeps its state for a few floors running, as a tenant's would.
    let floor = R() < p, held = 0;
    const storey = (r) => {
      const k = Math.floor((floors.y0 + (r + 0.5) * floors.ch) / LIT.storey), b = floors.build * 977;
      return LIT.pair * hash2(b, Math.floor(k / 2) + 5000) + (1 - LIT.pair) * hash2(b + 31, k) < p;
    };
    for (let r = 0; r < rows; r++) {
      if (clump && floors) floor = storey(r);
      else if (clump && held-- <= 0) { floor = R() < p; held = Math.floor(R() * 3); }
      const row = [], dark = clump ? (floor ? LIT.full : LIT.empty) : 1;
      let c = 0;
      while (c < cols) {
        const long = 2 + Math.floor(R() * 4);
        let seg;
        if (below.length && R() < 0.35) seg = below.find((b) => b.from <= c && c < b.from + b.long) ?? null;
        if (!seg) {
          const near = clump ? L.noise(c / 3 + mood * 3.1, r / 9 + mood * 1.7, mood, 71) ** 1.6 * 1.5 : L.noise(c / 4.5 + mood * 3.1, r / 6 + mood * 1.7, mood, 71);
          const lit = R() < (0.2 + 0.6 * near) * on / 0.5 * dark;
          const tone = R();
          seg = { from: c, long, lit, level: (clump ? LIT.level : 0.3) + (clump ? 1 - LIT.level : 0.7) * R() ** 1.3, warm: tone < 0.15 ? 0.12 + 0.18 * R() : tone > 0.82 ? 0.72 + 0.23 * R() : 0.32 + 0.3 * R(), blind: R() < 0.3 ? 0.2 + 0.6 * R() : 0 };
        }
        row.push({ ...seg, from: c, long });
        for (let k = 0; k < long && c < cols; k++, c++) {
          let level, blind = seg.blind > 0 ? Math.min(1, Math.max(0, seg.blind + (R() - 0.5) * 0.4)) : R() < 0.12 ? 0.5 * R() : 0;
          if (seg.lit && R() > 0.1) level = R() < 0.07 ? 1 : seg.level * (0.72 + 0.4 * R());
          else level = R() < (clump ? LIT.dim : 0.4) ? 0.1 + 0.14 * R() : 0;
          void blind;
          const warm = Math.min(1, Math.max(0, seg.warm + (R() - 0.5) * 0.16));
          const i = ((r0 + r) * this.size + c0 + c) * 3, [ls, ws] = WINDOW.steps, lq = Math.round(Math.min(1, level) * ls);
          this.data[i] = Math.round((lq / ls) * 255);
          this.data[i + 1] = lq ? Math.round((Math.round(warm * ws) / ws) * 255) : 0;
          this.data[i + 2] = 0;
        }
      }
      below.length = 0;
      below.push(...row);
    }
  }
  read(c, r) {
    const i = (r * this.size + c) * 3;
    return { level: this.data[i] / 255, warm: this.data[i + 1] / 255, blind: this.data[i] ? blindOf(c, r) : 0 };
  }
  // The color a room is lit in, by how pale it is: linear light.
  tint(warm) {
    const [a, b, c] = this.colors, t = warm * 2;
    return t < 1 ? a.map((v, k) => v + (b[k] - v) * t) : b.map((v, k) => v + (c[k] - v) * (t - 1));
  }
  // The radiance a window's cell gives off on average, linear light.
  radiance(c, r, cw, ch) {
    const w = this.read(c, r), k = WINDOW.gain * shown(w.level, w.blind, cw, ch);
    return this.tint(w.warm).map((v) => v * k);
  }
  // The radiance given off on average about a place in the map (u, v, in windows), over reach windows each way, by
  // the windows of the field that begins at the texel (c0, r0).
  about(u, v, cw, ch, c0, r0, reach = 1) {
    const f = this.fields[this.owner[r0 * this.size + c0]];
    if (!f || f.c0 !== c0 || f.r0 !== r0) throw new Error(`windows: no field begins at ${c0}, ${r0}`);
    const out = [0, 0, 0];
    let n = 0;
    const a = Math.max(f.c0, Math.floor(u - reach)), b = Math.min(f.c0 + f.cols - 1, Math.floor(u + reach));
    const lo = Math.max(f.r0, Math.floor(v - reach)), hi = Math.min(f.r0 + f.rows - 1, Math.floor(v + reach));
    for (let r = lo; r <= hi; r++) for (let c = a; c <= b; c++) { const e = this.radiance(c, r, cw, ch); out[0] += e[0]; out[1] += e[1]; out[2] += e[2]; n++; }
    return out.map((x) => x / Math.max(1, n));
  }
  lit() {
    let on = 0;
    for (let i = 0; i < this.data.length; i += 3) if (this.data[i] > 70) on++;
    return on / (this.size * this.tall);
  }
}
