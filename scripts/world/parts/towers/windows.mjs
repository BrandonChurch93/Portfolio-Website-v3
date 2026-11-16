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

// How a city's windows are lit at night: most of each face dark, lit rooms fine and scattered, here and there a
// tenant's few rooms in a row, and never a lit patch wider than a few windows or taller than two floors.
//   room: the share of rooms lit, room[0] and room[1] more for the busiest
//   run: how many rooms a tenant's run is, mostly one or two (most: the longest, wide: how often a long one comes)
//   stack: how often a lit room has a lit room over it, which no third floor ever continues
//   floor: how much busier or quieter a whole floor of a building is than the rest, the same across its bays
//   level: how bright a lit room is at least, dim: how often a dark room shows a dim light, and how bright
//   storey: how far apart a building's floors are told, in units
const LIT = { room: [0.12, 0.38], run: { most: 4, wide: 0.12 }, stack: 0.3, floor: 0.6, level: 0.5, dim: [0.14, 0.16], storey: 2.3 };

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
    const R = this.rand, p = LIT.room[0] + LIT.room[1] * busy;
    // How many lit rooms stand under each column, so no lit patch is taller than two floors.
    const tall = new Int8Array(cols);
    // A floor of a building is a little busier or quieter than the rest, the same in every bay of it.
    const storey = (r) => {
      if (!floors) return 1;
      const k = Math.floor((floors.y0 + (r + 0.5) * floors.ch) / LIT.storey);
      return 1 + LIT.floor * (2 * hash2(floors.build * 977 + 31, k) - 1);
    };
    for (let r = 0; r < rows; r++) {
      const busier = storey(r), next = new Int8Array(cols);
      let c = 0, was = false;
      while (c < cols) {
        const long = R() < LIT.run.wide ? 3 + Math.floor(R() * (LIT.run.most - 2)) : 1 + Math.floor(R() * R() * 2.2);
        // A lit run is followed by a dark one, so runs never join into a patch, and over a column already lit two
        // floors running a room is dark.
        const under = Math.max(...Array.from({ length: Math.min(long, cols - c) }, (_, k) => tall[c + k]));
        const odds = was ? 0 : under >= 2 ? 0 : under === 1 ? LIT.stack : p * busier / Math.max(0.2, 1 - p);
        const lit = R() < Math.min(0.92, odds * (clump ? 1 : 0.8));
        const tone = R(), level = LIT.level + (1 - LIT.level) * R() ** 1.4;
        const warm = tone < 0.18 ? 0.1 + 0.2 * R() : tone > 0.85 ? 0.72 + 0.23 * R() : 0.3 + 0.32 * R();
        for (let k = 0; k < long && c < cols; k++, c++) {
          let lv = 0;
          if (lit) { lv = R() < 0.08 ? 1 : level * (0.8 + 0.3 * R()); next[c] = tall[c] + 1; }
          else if (R() < LIT.dim[0]) lv = 0.06 + LIT.dim[1] * R();
          const wm = Math.min(1, Math.max(0, warm + (R() - 0.5) * 0.14));
          const i = ((r0 + r) * this.size + c0 + c) * 3, [ls, ws] = WINDOW.steps, lq = Math.round(Math.min(1, lv) * ls);
          this.data[i] = Math.round((lq / ls) * 255);
          this.data[i + 1] = lq ? Math.round((Math.round(wm * ws) / ws) * 255) : 0;
          this.data[i + 2] = 0;
        }
        was = lit;
      }
      tall.set(next);
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
