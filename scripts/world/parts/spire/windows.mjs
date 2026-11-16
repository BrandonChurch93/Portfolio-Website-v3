// The map of every window of the spire, after the towers' (scripts/world/parts/towers/windows.mjs): one texel a
// window, its red how lit the room is, its green how pale its light is (ember to pale gold), its blue how far its
// blind is down. Windows are given out in fields, one for each strip, and lit in upright clumps, a tenant's
// run of floors lit together up a column, a few floors dark right across. The spire is lit more and warmer than its
// neighbours. What is not given out is filled the same way, so the map's smaller copies hold the same average.
import { WINDOW, paleness, shown } from '../../../../src/pieces/world/parts/spire/windows.ts';
import { L, linear } from '../../lib/plan.mjs';

// How many rooms are lit at least, how many more where a clump is busy, how many are the warmest, how many dark rooms
// show a glow from further in, and how many floors are dark right across.
const LIT = { least: 0.36, busy: 0.7, warm: 0.25, glow: 0.3, floor: 0.06 };

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
  // Lit as the spire's strips are: up each column a tenant's run of floors lit together, so a strip reads as
  // upright clumps of light, more lit where the neighbourhood is busy, with now and then a floor dark right across.
  fill(c0, r0, cols, rows, mood) {
    const R = this.rand, dark = new Set();
    for (let r = 0; r < rows; r++) if (R() < LIT.floor) dark.add(r);
    for (let c = 0; c < cols; c++) {
      let r = 0;
      while (r < rows) {
        const long = 2 + Math.floor(R() * 7), busy = L.noise(c / 3 + mood * 3.1, r / 9 + mood * 1.7, mood, 73) ** 1.3;
        const lit = R() < LIT.least + LIT.busy * busy, tone = R();
        const seg = { lit, level: 0.45 + 0.55 * R() ** 1.4, warm: tone < LIT.warm ? 0.05 + 0.15 * R() : tone > 0.85 ? 0.8 + 0.18 * R() : 0.35 + 0.4 * R(), blind: R() < 0.2 ? 0.25 + 0.5 * R() : 0 };
        for (let k = 0; k < long && r < rows; k++, r++) {
          let level, blind = seg.blind > 0 ? Math.min(1, Math.max(0, seg.blind + (R() - 0.5) * 0.3)) : 0;
          if (seg.lit && !dark.has(r) && R() > 0.06) level = R() < 0.06 ? 1 : seg.level * (0.82 + 0.25 * R());
          else level = R() < LIT.glow ? 0.1 + 0.15 * R() : 0;
          if (level === 0) blind = 0;
          const warm = Math.min(1, Math.max(0, seg.warm + (R() - 0.5) * 0.1));
          const i = ((r0 + r) * this.size + c0 + c) * 3;
          this.data[i] = Math.round(Math.min(1, level) * 255);
          this.data[i + 1] = Math.round(warm * 255);
          this.data[i + 2] = Math.round(blind * 255);
        }
      }
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
    return this.tint(paleness(w.warm, w.level ** WINDOW.curve)).map((v) => v * k);
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
