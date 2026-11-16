// The map of every window of the spire, after the towers' (scripts/world/parts/towers/windows.mjs): one texel a
// window, its red how lit the room is, its green how pale its light is (ember to pale gold), its blue how far its
// blind is down. Windows are given out in fields, one for each strip, and lit as a building is lit: a floor at a
// time, by bays. A floor is lit right across and dimmer, or in a clump or two of bays, or it is dark with now and then
// one bay lit, and a floor is often lit as the one under it is. Each floor is one tenant, in its own warmth. What is
// not given out is filled the same way, so the map's smaller copies hold the same average.
import { WINDOW, paleness, shown } from '../../../../src/pieces/world/parts/spire/windows.ts';
import { L, linear } from '../../lib/plan.mjs';

// How a floor is lit: the chance it is lit right across, the chance it is lit in clumps (a few bays together, here
// and there along it), and how much likelier the floor over a lit floor is lit the same way; in a dark floor the
// chance of one bay lit; in a lit floor the chance a room of it is off; how many floors are the warmest tenants, how
// many the palest; how many dark rooms show a glow from further in; how much less often a strip one window wide is
// lit, so it is not one long line of light; and how much dimmer a floor lit right across is than a clump, so a whole
// floor is a calm band and not a bar. Lit by bays, the panes between two mullions together, so what is lit reads at
// the page's size as clumps of windows parted by bronze and never as a ladder of bars. Never by a noise held up to a
// level, whose blobs read as letters at the page's size.
const FLOOR = { whole: 0.14, clumps: 0.42, after: 0.2, single: 0.4, off: 0.12, warm: 0.3, pale: 0.12, glow: 0.4, narrow: 0.6, calm: 0.9 };
// A clump: how many bays at least and at most, and how many clumps to a floor at most.
// A clump: how many bays at least and at most, how many clumps to a floor at most, and how often a clump starts where
// the one on the floor under it did (clumps that moved from floor to floor drew an S, a Z or a 5 at the page's size).
// A strip of `whole` bays or fewer is lit a floor at a time, as one clump: a bay or two lit by itself there drew a
// zigzag, and in the tiers over the ring an E.
const CLUMP = { bays: [2, 4], most: 2, keep: 0, whole: 4 };
// Floors let a group at a time: the chance a group is lit right across, the chance one run of its bays is (that run's
// length as a share of the bays, at least and at most), how much dimmer a floor of it may be, and the chance a room
// of it is off, and how bright its lit floors are (at least, and how much more at most).
const GROUP = { whole: 0.48, part: 0.38, long: [0.5, 0.85], floor: 0.12, off: 0.06, level: [0.85, 0.15] };
// A strip one bay wide: how many floors a lit run is, and a dark one, at least and at most.
const RUN = { lit: [2, 6], dark: [1, 5] };
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
  // A field of cols by rows windows, lit by bays of `pair` windows: where it begins in the map.
  // With `group`, the floors between two spandrels are let together: lit the same way, the same bays, so the strip
  // reads at the page's size as stacked bays of lit floors and never as a smudge.
  take(cols, rows, mood = 0, pair = 1, group = 1) {
    const s = this.shelf;
    if (s.x + cols > this.size) { s.x = 0; s.y += s.tall; s.tall = 0; }
    if (s.y + rows > this.size) throw new Error(`windows: no room for ${cols} by ${rows}`);
    const at = { c0: s.x, r0: s.y, cols, rows };
    s.x += cols;
    s.tall = Math.max(s.tall, rows);
    this.fill(at.c0, at.r0, cols, rows, mood, pair, group);
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
  fill(c0, r0, cols, rows, mood, pair = 1, group = 1) {
    const R = this.rand, bays = Math.max(1, Math.round(cols / pair));
    if (bays === 1 && rows > 4) return this.slot(c0, r0, cols, rows);
    if (group > 1) return this.groups(c0, r0, cols, rows, pair, group);
    let before = '', from = -1;
    for (let r = 0; r < rows; r++) {
      const busy = (1 + BUSY.by * (2 * L.noise(r / BUSY.every + mood * 1.7, mood * 3.1, mood, 73) - 1)) * (cols < 2 ? FLOOR.narrow : 1);
      const t = R(), tone = R(), lift = (k) => (before === k ? FLOOR.after : 0);
      const whole = (FLOOR.whole + lift('whole')) * busy, clumps = (FLOOR.clumps + lift('clumps')) * busy;
      const kind = t < whole ? 'whole' : t < whole + clumps ? 'clumps' : 'dark';
      const warm = tone < FLOOR.warm ? 0.04 + 0.14 * R() : tone > 1 - FLOOR.pale ? 0.6 + 0.16 * R() : 0.26 + 0.32 * R();
      const level = (0.66 + 0.34 * R() ** 1.3) * (kind === 'whole' ? FLOOR.calm : 1), blinds = R() < 0.25 ? 0.2 + 0.5 * R() : 0;
      const lit = new Array(bays).fill(kind === 'whole');
      if (kind === 'clumps') {
        const n = bays <= CLUMP.whole ? 1 : 1 + Math.floor(R() * CLUMP.most);
        for (let k = 0; k < n; k++) {
          const long = bays <= CLUMP.whole ? bays : Math.min(bays, CLUMP.bays[0] + Math.floor(R() * (CLUMP.bays[1] - CLUMP.bays[0] + 1)));
          const a = k === 0 && from >= 0 && R() < CLUMP.keep ? Math.min(from, bays - long) : Math.floor(R() * (bays - long + 1));
          if (k === 0) from = a;
          for (let b = a; b < a + long; b++) lit[b] = true;
        }
      } else if (kind === 'dark' && bays > CLUMP.whole && R() < FLOOR.single) lit[from >= 0 ? from : Math.floor(R() * bays)] = true;
      for (let c = 0; c < cols; c++) {
        const on = lit[Math.min(bays - 1, Math.floor(c / pair))] && R() > (kind === 'whole' ? FLOOR.off : FLOOR.off * 0.4);
        const lv = on ? level * (0.85 + 0.2 * R()) : R() < FLOOR.glow ? 0.1 + 0.14 * R() : 0;
        this.set(c0 + c, r0 + r, lv, warm + (R() - 0.5) * 0.08, blinds > 0 && R() < 0.7 ? blinds + (R() - 0.5) * 0.2 : 0);
      }
      before = kind;
    }
  }
  // Floors let a group at a time (GROUP): the whole group lit right across, or one run of bays lit up all its floors,
  // or dark; each floor of it a little brighter or dimmer, a room off now and then, the tenant's warmth the same.
  groups(c0, r0, cols, rows, pair, group) {
    const R = this.rand, bays = Math.max(1, Math.round(cols / pair));
    for (let g = 0; g * group < rows; g++) {
      const t = R(), kind = t < GROUP.whole ? 'whole' : t < GROUP.whole + GROUP.part ? 'part' : 'dark';
      const warm = R() < FLOOR.warm ? 0.04 + 0.14 * R() : 0.26 + 0.32 * R(), level = GROUP.level[0] + GROUP.level[1] * R();
      const long = Math.max(1, Math.min(bays - 1, Math.round(bays * (GROUP.long[0] + (GROUP.long[1] - GROUP.long[0]) * R())))), a = Math.floor(R() * (bays - long + 1));
      for (let r = g * group; r < Math.min(rows, (g + 1) * group); r++) {
        const floor = level * (1 - GROUP.floor * R());
        for (let c = 0; c < cols; c++) {
          const b = Math.min(bays - 1, Math.floor(c / pair)), on = (kind === 'whole' || (kind === 'part' && b >= a && b < a + long)) && R() > GROUP.off;
          this.set(c0 + c, r0 + r, on ? floor * (0.9 + 0.1 * R()) : R() < FLOOR.glow ? 0.1 + 0.12 * R() : 0, warm + (R() - 0.5) * 0.06, 0);
        }
      }
    }
  }
  // A strip one bay wide, lit as the tenants up it are, in runs of floors: a run lit, a run dark, each its own length
  // and warmth, so the slots up the fins are not a ladder of one lit pane to a floor.
  slot(c0, r0, cols, rows) {
    const R = this.rand;
    let r = 0, on = R() < 0.5;
    while (r < rows) {
      const n = on ? RUN.lit[0] + Math.floor(R() * (RUN.lit[1] - RUN.lit[0] + 1)) : RUN.dark[0] + Math.floor(R() * (RUN.dark[1] - RUN.dark[0] + 1));
      const level = 0.7 + 0.3 * R(), warm = R() < FLOOR.warm ? 0.04 + 0.14 * R() : 0.26 + 0.4 * R();
      for (let k = 0; k < n && r < rows; k++, r++) for (let c = 0; c < cols; c++) {
        const lit = on && R() > FLOOR.off;
        this.set(c0 + c, r0 + r, lit ? level * (0.85 + 0.2 * R()) : R() < FLOOR.glow ? 0.1 + 0.14 * R() : 0, warm + (R() - 0.5) * 0.08, 0);
      }
      on = !on;
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
