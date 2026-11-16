// The map of every window of the spire, after the towers' (scripts/world/parts/towers/windows.mjs): one texel a
// window, its red how lit the room is, its green how pale its light is (ember to pale gold), its blue how far its
// blind is down. Windows are given out in fields, one for each strip, and lit as a building is lit: a floor at a
// time. A floor is lit right across, or a run of it from one end, half of it or more, or it is dark with now and then one room lit, and a lit floor
// is often the next one's too, so the strip reads as warm bands a floor or two tall. Each floor is one tenant, in
// its own warmth. Never by a noise held up to a level, whose blobs read as letters at the page's size. What is not
// given out is filled the same way, so the map's smaller copies hold the same average.
import { WINDOW, paleness, shown } from '../../../../src/pieces/world/parts/spire/windows.ts';
import { L, linear } from '../../lib/plan.mjs';

// How a floor is lit: the chance it is lit right across, the chance it is a run, and how much likelier the floor
// over a lit floor is lit right across too; in a dark floor the chance of one room lit; in a lit floor the chance
// a room of it is off; how many floors are the warmest tenants, how many the palest; how many dark rooms show a glow
// from further in; and how much less often a strip one window wide is lit, so it is not one long line of light.
const FLOOR = { whole: 0.27, run: 0.2, after: 0.25, single: 0.3, off: 0.08, warm: 0.3, pale: 0.12, glow: 0.18, narrow: 0.6 };
// How much busier the floors are where the building is busy: a slow swell up the strip.
const BUSY = { every: 11, by: 0.35 };

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
  set(c, r, level, warm, blind) {
    const i = (r * this.size + c) * 3;
    this.data[i] = Math.round(Math.min(1, Math.max(0, level)) * 255);
    this.data[i + 1] = Math.round(Math.min(1, Math.max(0, warm)) * 255);
    this.data[i + 2] = Math.round(Math.min(1, Math.max(0, level > 0 ? blind : 0)) * 255);
  }
  // Floor by floor, from the foot of the strip.
  fill(c0, r0, cols, rows, mood) {
    const R = this.rand;
    let before = false;
    for (let r = 0; r < rows; r++) {
      const busy = (1 + BUSY.by * (2 * L.noise(r / BUSY.every + mood * 1.7, mood * 3.1, mood, 73) - 1)) * (cols < 2 ? FLOOR.narrow : 1);
      const t = R(), tone = R(), whole = before ? FLOOR.whole + FLOOR.after : FLOOR.whole;
      const kind = t < whole * busy ? 'whole' : t < (whole + FLOOR.run) * busy ? 'run' : 'dark';
      const warm = tone < FLOOR.warm ? 0.04 + 0.14 * R() : tone > 1 - FLOOR.pale ? 0.6 + 0.16 * R() : 0.26 + 0.32 * R();
      const level = 0.66 + 0.34 * R() ** 1.3, blinds = R() < 0.25 ? 0.2 + 0.5 * R() : 0;
      let a = 0, b = cols;
      if (kind === 'run') {
        const half = Math.ceil(cols / 2), long = cols < 2 ? 1 : half + Math.floor(R() * (cols - half));
        a = R() < 0.5 ? 0 : cols - long;
        b = a + long;
      }
      const single = kind === 'dark' && R() < FLOOR.single ? Math.floor(R() * cols) : -1;
      for (let c = 0; c < cols; c++) {
        const on = kind !== 'dark' ? c >= a && c < b && R() > FLOOR.off : c === single;
        const lv = on ? level * (0.85 + 0.2 * R()) : R() < FLOOR.glow ? 0.1 + 0.12 * R() : 0;
        this.set(c0 + c, r0 + r, lv, warm + (R() - 0.5) * 0.08, blinds > 0 && R() < 0.7 ? blinds + (R() - 0.5) * 0.2 : 0);
      }
      before = kind === 'whole';
    }
  }
  // Every window of a field lit, at about this level and this paleness, with no blind: the flèche's slits and the
  // lobby, which are lamps and not rooms.
  light(at, level, warm) {
    for (let r = 0; r < at.rows; r++) for (let c = 0; c < at.cols; c++) this.set(at.c0 + c, at.r0 + r, level * (0.9 + 0.1 * this.rand()), warm, 0);
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
