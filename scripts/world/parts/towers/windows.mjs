// The map of every window of the towers: one texel a window, its red how lit the room is, its green how pale its
// light is (ember to pale gold), its blue how far its blind is down. Windows are given out in fields, one for each
// face of a bay, and lit as a city's are: in clumps, a tenant's run of rooms along a floor lit together, some
// floors mostly dark, and no two neighbours alike. How busy a field is overall is its own (busy, 0 to 1). What is
// not given out is filled the same way, so the map's smaller copies (what a window smaller than a pixel shows) hold
// the same average.
import { WINDOW, shown } from '../../../../src/pieces/world/parts/towers/windows.ts';
import { L, linear } from '../../lib/plan.mjs';

// How many rooms of a field are lit: a share of them, at least on[0] and on[1] more for the busiest; how bright a
// lit room is at least, and how often an unlit one is dimly lit. Fewer rooms, more brightly: a city's windows seen
// from far off are its brightest rooms, and the rest is its wall.
const LIT = { on: [0.2, 0.6], level: 0.62, dim: 0.1 };

export class Windows {
  constructor(seed, size = WINDOW.map) {
    this.size = size;
    this.data = new Uint8Array(this.size * this.size * 3);
    this.owner = new Int32Array(this.size * this.size).fill(-1);
    this.rand = L.seeded(seed);
    this.shelf = { x: 0, y: 0, tall: 0 };
    this.fields = [];
    this.colors = WINDOW.colors.map((n) => linear(n));
    this.fill(0, 0, this.size, this.size, 99, 0.5);
  }
  // A field of cols by rows windows: where it begins in the map.
  // clump makes the clumps of a city's: whole floors dark, runs of rooms lit together up a building, and fewer dim
  // rooms between, so a busy building and a quiet one are told apart from far off.
  take(cols, rows, mood = 0, busy = 0.5, clump = false) {
    const s = this.shelf;
    if (s.x + cols > this.size) { s.x = 0; s.y += s.tall; s.tall = 0; }
    if (s.y + rows > this.size) throw new Error(`windows: no room for ${cols} by ${rows}`);
    const at = { c0: s.x, r0: s.y, cols, rows };
    s.x += cols;
    s.tall = Math.max(s.tall, rows);
    this.fill(at.c0, at.r0, cols, rows, mood, busy, clump);
    const k = this.fields.length;
    for (let r = 0; r < rows; r++) this.owner.fill(k, (at.r0 + r) * this.size + at.c0, (at.r0 + r) * this.size + at.c0 + cols);
    this.fields.push(at);
    return at;
  }
  fill(c0, r0, cols, rows, mood, busy, clump = false) {
    const R = this.rand, below = [], on = LIT.on[0] + LIT.on[1] * busy;
    for (let r = 0; r < rows; r++) {
      const row = [], dark = clump && R() < 0.2 ? 0.12 : 1;
      let c = 0;
      while (c < cols) {
        const long = 2 + Math.floor(R() * 4);
        let seg;
        if (below.length && R() < 0.35) seg = below.find((b) => b.from <= c && c < b.from + b.long) ?? null;
        if (!seg) {
          const near = clump ? L.noise(c / 3 + mood * 3.1, r / 9 + mood * 1.7, mood, 71) ** 1.6 * 1.5 : L.noise(c / 4.5 + mood * 3.1, r / 6 + mood * 1.7, mood, 71);
          const lit = R() < (0.2 + 0.6 * near) * on / 0.5 * dark;
          const tone = R();
          seg = { from: c, long, lit, level: (clump ? LIT.level : 0.3) + (clump ? 1 - LIT.level : 0.7) * R() ** 1.3, warm: tone < 0.1 ? 0.08 + 0.12 * R() : tone > 0.75 ? 0.85 + 0.15 * R() : 0.45 + 0.45 * R(), blind: R() < 0.3 ? 0.2 + 0.6 * R() : 0 };
        }
        row.push({ ...seg, from: c, long });
        for (let k = 0; k < long && c < cols; k++, c++) {
          let level, blind = seg.blind > 0 ? Math.min(1, Math.max(0, seg.blind + (R() - 0.5) * 0.4)) : R() < 0.12 ? 0.5 * R() : 0;
          if (seg.lit && R() > 0.1) level = R() < 0.07 ? 1 : seg.level * (0.72 + 0.4 * R());
          else level = R() < (clump ? LIT.dim : 0.4) ? 0.1 + 0.14 * R() : 0;
          if (level === 0) blind = 0;
          const warm = Math.min(1, Math.max(0, seg.warm + (R() - 0.5) * 0.16));
          const i = ((r0 + r) * this.size + c0 + c) * 3;
          this.data[i] = Math.round(Math.min(1, level) * 255);
          this.data[i + 1] = Math.round(warm * 255);
          this.data[i + 2] = Math.round(blind * 255);
        }
      }
      below.length = 0;
      below.push(...row);
    }
  }
  read(c, r) {
    const i = (r * this.size + c) * 3;
    return { level: this.data[i] / 255, warm: this.data[i + 1] / 255, blind: this.data[i + 2] / 255 };
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
    return on / (this.size * this.size);
  }
}
