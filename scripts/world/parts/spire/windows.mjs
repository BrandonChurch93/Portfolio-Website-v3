// The map of every window of the spire, after the towers' (scripts/world/parts/towers/windows.mjs): one texel a
// window, its red how lit the room is, its green how pale its light is (ember to pale gold), its blue how far its
// blind is down. Windows are given out in fields, one for each bay, and lit as a city's are: in clumps, a tenant's
// run of rooms along a floor lit together, a few floors mostly dark. The spire is lit more and warmer than its
// neighbours. What is not given out is filled the same way, so the map's smaller copies hold the same average.
import { WINDOW, shown } from '../../../../src/pieces/world/parts/spire/windows.ts';
import { L, linear } from '../../lib/plan.mjs';

// How many rooms are lit at least, and how many more where a clump is busy; how many are the warmest.
const LIT = { least: 0.34, busy: 0.58, warm: 0.22 };

export class Windows {
  constructor(seed) {
    this.size = WINDOW.map;
    this.data = new Uint8Array(this.size * this.size * 3);
    this.rand = L.seeded(seed);
    this.shelf = { x: 0, y: 0, tall: 0 };
    this.fields = [];
    this.colors = WINDOW.colors.map((n) => linear(n));
    this.fill(0, 0, this.size, this.size, 99);
  }
  // A field of cols by rows windows: where it begins in the map.
  take(cols, rows, mood = 0) {
    const s = this.shelf;
    if (s.x + cols > this.size) { s.x = 0; s.y += s.tall; s.tall = 0; }
    if (s.y + rows > this.size) throw new Error(`windows: no room for ${cols} by ${rows}`);
    const at = { c0: s.x, r0: s.y, cols, rows };
    s.x += cols;
    s.tall = Math.max(s.tall, rows);
    this.fill(at.c0, at.r0, cols, rows, mood);
    this.fields.push(at);
    return at;
  }
  fill(c0, r0, cols, rows, mood) {
    const R = this.rand, below = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      let c = 0;
      while (c < cols) {
        const long = 2 + Math.floor(R() * 4);
        let seg;
        if (below.length && R() < 0.4) seg = below.find((b) => b.from <= c && c < b.from + b.long) ?? null;
        if (!seg) {
          const busy = L.noise(c / 4 + mood * 3.1, r / 5 + mood * 1.7, mood, 73);
          const lit = R() < LIT.least + LIT.busy * busy;
          const tone = R();
          seg = { from: c, long, lit, level: 0.35 + 0.65 * R() ** 1.2, warm: tone < LIT.warm ? 0.06 + 0.14 * R() : tone > 0.82 ? 0.82 + 0.16 * R() : 0.38 + 0.42 * R(), blind: R() < 0.28 ? 0.2 + 0.6 * R() : 0 };
        }
        row.push({ ...seg, from: c, long });
        for (let k = 0; k < long && c < cols; k++, c++) {
          let level, blind = seg.blind > 0 ? Math.min(1, Math.max(0, seg.blind + (R() - 0.5) * 0.4)) : R() < 0.1 ? 0.5 * R() : 0;
          if (seg.lit && R() > 0.08) level = R() < 0.08 ? 1 : seg.level * (0.72 + 0.4 * R());
          else level = R() < 0.45 ? 0.1 + 0.16 * R() : 0;
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
  // Which field holds a place in the map, in windows.
  field(u, v) {
    for (const f of this.fields) if (u >= f.c0 - 1e-3 && u <= f.c0 + f.cols + 1e-3 && v >= f.r0 - 1e-3 && v <= f.r0 + f.rows + 1e-3) return f;
    throw new Error(`spire: no field of windows holds ${u}, ${v}`);
  }
  lit() {
    let on = 0;
    for (let i = 0; i < this.data.length; i += 3) if (this.data[i] > 70) on++;
    return on / (this.size * this.size);
  }
}
