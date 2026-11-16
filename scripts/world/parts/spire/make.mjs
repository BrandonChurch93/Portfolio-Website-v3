// The spire (src/pieces/world/parts/spire.ts), made ahead and shipped: public/world/spire.bin, its geometry and
// baked light, and public/world/spire-windows.png, the state of every window.
//
//   node scripts/world/parts/spire/make.mjs [--draft]
//
// The tallest thing in the world, on the hero's center line, straight under his name, and of the same city as the
// stepped tower: dark granite with pale limestone trim, bronze bays of lit windows, gold where it is crowned. It
// tapers in setbacks, each as picture 9 has it: a buttressed podium with tall portals on a round court, three
// stages of piers and lit bays, each with its own small crown of pinnacles and a stepped gable, a slender shaft
// through the ring, a tier of gold reeds, an open lantern with small lamps in it through which the night shows, two
// fluted gold tiers, a fluted bronze spire with gold collars, a gold orb and a gold needle to the planned tip. Round
// the shaft hangs one thin ring of polished gold, a turned profile with an engraved band, tilted as Saturn's is.
import { pack } from '../../lib/pack.mjs';
import { png } from '../../lib/png.mjs';
import { bake } from '../../lib/bake.mjs';
import { any as anyHit, build as buildBvh } from '../../lib/bvh.mjs';
import * as THREE from 'three';
import { L, P, light, linear, storeBounce } from '../../lib/plan.mjs';
import { WINDOW } from '../../../../src/pieces/world/parts/spire/windows.ts';
import { Kit, chamfered, face, on } from './kit.mjs';
import { Windows } from './windows.mjs';

const draft = process.argv.includes('--draft');
const began = performance.now();
const { tall: TALL, ring: RING } = L.SPIRE;

// How the stone is laid, which the stone's material reads: dark granite in courses, the podium's channelled
// granite, the court's paving laid in rings, and pale limestone trim.
const LAY = { granite: 0, rusticated: 1, court: 2, trim: 3 };
const ALBEDO = { granite: linear('text-3').map((v) => v * 0.4), trim: linear('text-2').map((v) => v * 0.78), court: linear('text-3').map((v) => v * 0.62) };

// The design, in units, y up from the ground under the spire. Where each setback is, and how wide each stage is,
// were read off picture 9 (fromPicture in the layout) and are its, to about a pixel.
const S = {
  court: { r: L.COURT, top: 0.9, steps: [[L.COURT, 0], [L.COURT - 1.8, 0.45], [L.COURT - 3.6, 0.9]], under: -1.8 },
  podium: { w: 54, c: 5, y0: -1, y1: 40.5, cornice: [[40.5, 41.4, 0.8], [41.4, 42.4, 1.5]], parapet: [42.4, 44.6], frieze: [37.6, 39.8] },
  buttress: { at: 25.5, tiers: [[8, -1, 20.5], [6.6, 21.8, 32.2], [5.4, 33.4, 44.2]], pin: 7 },
  // Each stage of piers and bays: its full width, its foot and its cornice, how many columns of windows its bay
  // has, which columns a pier stands in front of, the corner's chamfer, how deep the bay is behind the piers, and
  // the pinnacles and gable of its crown.
  stages: [
    { w: 52, y0: 42.4, y1: 81.8, cols: 30, mids: [[8, 11], [19, 22]], c: 2.4, back: 2.0, step: 0.9, reveal: 0.7, rise: 9, pin: 6.2, gable: [9.2, 6.4, 3.6] },
    { w: 44, y0: 81.8, y1: 117, cols: 26, mids: [[6, 9], [17, 20]], c: 2.1, back: 1.8, step: 0.8, reveal: 0.6, rise: 9, pin: 5.4, gable: [9.2, 6.4, 3.6] },
    { w: 29, y0: 117, y1: 162.8, cols: 16, mids: [[1, 4], [12, 15]], c: 1.7, back: 1.5, step: 0.65, reveal: 0.5, rise: 7, pin: 4.6, gable: [9.2, 6.0, 3.0] },
    { w: 17, y0: 162.8, y1: 196, cols: 8, mids: [], c: 1.2, back: 1.2, step: 0.5, reveal: 0.4, rise: 0, pin: 0, gable: null },
  ],
  cell: { w: 1.2, h: 1.55, band: 0.5 },
  grille: { foot: 1, head: 1, slot: 0.6 },
  // Between the columns of a bay: a bronze fin in the middle bay, a rib of granite in a side bay.
  fin: { every: 2, wide: 0.26, out: 0.4 },
  rib: { every: 2, wide: 0.5, out: 0.55 },
  reedTier: { w: 14.6, c: 2.1, y0: 196.6, y1: 202.8, cornice: [202.8, 203.5] },
  lantern: { plinth: [203.5, 205, 11.6], w: 10.2, col: 1.9, y1: 213.4, cap: [213.4, 214.1], roof: [214.1, 214.9, 11.2], rail: [206.1, 206.4], lamp: 207.6 },
  tiers: [[7.8, 214.9, 218.3], [6.2, 218.3, 221.1], [4.8, 221.1, 223.5]],
  spike: { w: [3.6, 1.6], y: [223.5, 238.8], collars: [227.6, 233.2] },
  orb: { y: 239.8, r: 1.3 },
  needle: { w: 1.5, y0: 240.4 },
  reed: 1.1,
  batter: 8,
  // The ring: the radius of its band's middle is RING.r. Its section, in units across the band from its middle and
  // up from its middle: a rolled outer bead as thick as the ring, a thin web, and a smaller inner bead.
  ring: { rim: [1.5, 3.2, 1.2, 0.22], web: [-1.75, 1.1, 0.55], inner: [-2.4, 0.75], segs: draft ? 160 : 240, at: 0.708 },
};

const win = new Windows(4127);
const kit = new Kit({
  stone: {
    width: 3, attr: (p, n, tag) => {
      if (Math.abs(n[1]) > 0.7) return [p[0], p[2], tag?.lay ?? 0];
      const tx = n[2], tz = -n[0], l = Math.hypot(tx, tz) || 1;
      return [(p[0] * tx + p[2] * tz) / l, p[1], tag?.lay === LAY.court ? LAY.trim : tag?.lay ?? 0];
    },
  },
  bay: {
    width: 4, attr: (p, n, tag) => {
      if (!tag || tag.plain) return [0, 0, 0, 0];
      const s = (p[0] - tag.o[0]) * tag.T[0] + (p[2] - tag.o[2]) * tag.T[2], t = p[1] - tag.y0;
      if (tag.door) return [s / tag.door, t / tag.ch, -tag.door, tag.ch];
      return [tag.c0 + s / tag.cw, tag.r0 + t / tag.ch, tag.cw, tag.ch];
    },
  },
  // Gold: where a place is across a panel of flutes, in flutes, and 1; or on the ring, its radius, 2, and how far
  // round; or 3 on a lamp.
  gold: {
    width: 3, attr: (p, n, tag) => {
      if (tag?.flute) return [((p[0] - tag.o[0]) * tag.T[0] + (p[2] - tag.o[2]) * tag.T[2]) / tag.flute, 1, 0];
      if (tag?.ring) return [tag.r, 2, tag.round];
      if (tag?.lamp) return [0, 3, 0];
      return [0, 0, 0];
    },
  },
});
const PLAIN = { plain: true }, GRANITE = { lay: LAY.granite }, TRIM = { lay: LAY.trim }, RUST = { lay: LAY.rusticated };
const E = draft ? 5 : 2.2;
const FRONT = [0, 0, 1];
const square = (x, z, w, c = w * 0.2) => chamfered(w, w, c).map(([a, b]) => [x + a, z + b]);
const corners = [[1, 1], [-1, 1], [1, -1], [-1, -1]];

// A pinnacle: a plinth of trim, a slender granite shaft, a capital and a step of trim, and a gold point.
function pinnacle(x, z, w, y, h) {
  kit.prism('stone', square(x, z, w * 1.15), y, y + 0.45, { top: true, bottom: true, tag: TRIM });
  const y1 = y + 0.45 + h * 0.56, y2 = y1 + 0.3 + h * 0.07;
  kit.prism('stone', square(x, z, w * 0.78, w * 0.12), y + 0.45, y1, { shrink: 0.92, tag: GRANITE, edge: E });
  kit.prism('stone', square(x, z, w * 0.9), y1, y1 + 0.3, { top: true, bottom: true, tag: TRIM });
  kit.prism('stone', square(x, z, w * 0.6), y1 + 0.3, y2, { top: true, tag: TRIM });
  kit.prism('gold', square(x, z, w * 0.42), y2, y + h + 0.75, { shrink: 0.03 });
}

// A field of windows on a face, s0 to s1 across it, y0 to y1 up: a plain band at its foot, a grille of bronze at
// its foot and head, the windows between, and between every few columns a bronze fin in the middle bay (from
// column mid[0] to mid[1]) and a rib of granite elsewhere.
function bays(f, s0, s1, y0, y1, mood, mid) {
  const c = S.cell, cols = Math.round((s1 - s0) / c.w), yw = y0 + c.band, rows = Math.max(3, Math.round((y1 - yw) / c.h)), ch = (y1 - yw) / rows;
  const at = win.take(cols, rows, mood), g = S.grille, w0 = yw + g.foot * ch, w1 = yw + (rows - g.head) * ch;
  const o = on(f, s0, 0), slot = (y, h) => ({ o, T: f.T, y0: y, door: g.slot, ch: h });
  kit.patch('bay', on(f, s0, y0), on(f, s1, y0), on(f, s1, yw), on(f, s0, yw), { nu: cols, nv: 1, want: f.N, tag: PLAIN });
  kit.patch('bay', on(f, s0, yw), on(f, s1, yw), on(f, s1, w0), on(f, s0, w0), { nu: cols, nv: g.foot, want: f.N, tag: slot(yw, w0 - yw) });
  kit.patch('bay', on(f, s0, w0), on(f, s1, w0), on(f, s1, w1), on(f, s0, w1), { nu: cols, nv: draft ? Math.ceil(rows / 3) : rows - g.foot - g.head, want: f.N, tag: { o, T: f.T, y0: yw, c0: at.c0, r0: at.r0, cw: c.w, ch } });
  kit.patch('bay', on(f, s0, w1), on(f, s1, w1), on(f, s1, y1), on(f, s0, y1), { nu: cols, nv: g.head, want: f.N, tag: slot(w1, y1 - w1) });
  for (let k = 1; k < cols; k++) {
    const middle = k > mid[0] && k < mid[1], fin = middle ? S.fin : S.rib;
    if ((k - (middle ? mid[0] : 0)) % fin.every !== 0) continue;
    const m = s0 + k * c.w, h = fin.wide / 2, P2 = (sv, out) => { const q = on(f, sv, 0); return [q[0] + f.N[0] * out, q[2] + f.N[2] * out]; };
    const flat = ([x, z]) => Math.abs((x - f.o[0]) * f.N[0] + (z - f.o[2]) * f.N[2]) < 1e-6;
    kit.prism(middle ? 'bay' : 'stone', [P2(m - h, 0), P2(m - h, fin.out), P2(m + h, fin.out), P2(m + h, 0)], y0, y1, { edge: E * 2, tag: middle ? PLAIN : GRANITE, skip: (a, cc) => flat(a) && flat(cc) });
  }
}

// The court: a round plaza of finer paving, with a low stepped edge, a little proud of the ground.
{
  const C = S.court, prof = [];
  for (let r = 26; r < C.steps[2][0] - 0.01; r += draft ? 6 : 2.5) prof.push([r, C.top]);
  for (let k = C.steps.length - 1; k >= 0; k--) {
    const [r, y] = C.steps[k], below = k > 0 ? C.steps[k - 1][1] : C.under;
    prof.push([r, y, true], [r, below, true]);
  }
  prof.reverse();
  kit.lathe('stone', prof.map(([r, y, s]) => [r, y, s]), draft ? 64 : 160, { tag: { lay: LAY.court } });
}

// The podium: two storeys of channelled granite, its front let in by a tall portal and two lesser ones, with bronze
// doors under lit transoms, tall slit windows, a frieze of gold reeds, a cornice and a parapet; a stepped buttress
// at each corner, crowned by a pinnacle.
{
  const b = S.podium, X = b.w / 2;
  kit.prism('stone', chamfered(b.w, b.w, b.c), b.y0, b.y1, { edge: E, tag: RUST, skip: (a, c) => a[1] === X && c[1] === X });
  const f = face([0, 0, X], [1, 0, 0], [0, 0, 1]);
  const glassIn = (cols, rows) => (g, s0, s1, t0, t1, deep) => {
    const at = win.take(cols, rows, 5 + s0), cw = (s1 - s0) / cols, ch = (t1 - t0) / rows;
    kit.patch('bay', on(g, s0, t0, deep), on(g, s1, t0, deep), on(g, s1, t1, deep), on(g, s0, t1, deep), { nu: cols, nv: rows, want: g.N, tag: { o: on(g, s0, 0, deep), T: g.T, y0: t0, c0: at.c0, r0: at.r0, cw, ch } });
  };
  const portal = (door, cols, rows) => (g, s0, s1, t0, t1, deep) => {
    kit.patch('bay', on(g, s0, t0, deep), on(g, s1, t0, deep), on(g, s1, door, deep), on(g, s0, door, deep), { nu: 2, edge: E, want: g.N, tag: { o: on(g, s0, 0, deep), T: g.T, y0: t0, door: (s1 - s0) / 2, ch: door - t0 } });
    glassIn(cols, rows)(g, s0, s1, door, t1, deep);
  };
  const open = [
    { s0: -4.4, s1: 4.4, t0: b.y0, t1: 27.5, floor: true, steps: [{ inset: 0, depth: 0.6 }, { inset: 0.7, depth: 0.6 }, { inset: 0.55, depth: 0.6 }, { inset: 0.45, depth: 0.7 }], back: portal(10.5, 3, 7) },
    ...[-1, 1].flatMap((k) => {
      const at = (a, c) => (k < 0 ? [-c, -a] : [a, c]);
      const [p0, p1] = at(10.6, 16.0), [w0, w1] = at(6.2, 7.8), [e0, e1] = at(19.2, 21.0);
      return [
        { s0: p0, s1: p1, t0: b.y0, t1: 15.5, floor: true, steps: [{ inset: 0, depth: 0.5 }, { inset: 0.5, depth: 0.5 }, { inset: 0.4, depth: 0.7 }], back: portal(8.2, 2, 3) },
        { s0: p0, s1: p1, t0: 18.6, t1: 33.4, steps: [{ inset: 0, depth: 0.4 }, { inset: 0.35, depth: 0.5 }], back: glassIn(4, 9) },
        { s0: w0, s1: w1, t0: 3.2, t1: 33.4, steps: [{ inset: 0, depth: 0.35 }, { inset: 0.25, depth: 0.45 }], back: glassIn(1, 19) },
        { s0: e0, s1: e1, t0: 3.2, t1: 33.4, steps: [{ inset: 0, depth: 0.35 }, { inset: 0.25, depth: 0.45 }], back: glassIn(1, 19) },
      ];
    }),
    { s0: -3.2, s1: 3.2, t0: 29.6, t1: 35.6, steps: [{ inset: 0, depth: 0.4 }, { inset: 0.35, depth: 0.5 }], back: glassIn(4, 4) },
  ];
  kit.wall('stone', f, -(X - b.c), X - b.c, b.y0, b.y1, open, { edge: E, tag: RUST });
  kit.reeds('gold', f, -(X - b.c) + 0.6, X - b.c - 0.6, b.frieze[0], b.frieze[1], draft ? 20 : 64, 0.22, { edge: E });
  for (const [y0, y1, out] of b.cornice) kit.prism('stone', chamfered(b.w + 2 * out, b.w + 2 * out, b.c + out * 0.8), y0, y1, { top: true, bottom: true, edge: E, tag: TRIM });
  kit.prism('stone', chamfered(b.w - 1, b.w - 1, b.c), b.parapet[0], b.parapet[1], { top: true, edge: E, tag: TRIM });
  const t = S.buttress;
  for (const [sx, sz] of corners) {
    const x = sx * t.at, z = sz * t.at;
    t.tiers.forEach(([w, y0, y1], k) => {
      kit.prism('stone', square(x, z, w), y0, y1, { edge: E, tag: k === 0 ? RUST : GRANITE });
      const next = t.tiers[k + 1];
      if (next) kit.prism('stone', square(x, z, w + 0.3), y1, next[1], { shrink: (next[0] + 0.1) / (w + 0.3), top: true, tag: TRIM });
    });
    const top = t.tiers[t.tiers.length - 1];
    kit.prism('stone', square(x, z, top[0] + 0.6), top[2], top[2] + 0.7, { top: true, bottom: true, tag: TRIM });
    pinnacle(x, z, top[0] * 0.7, top[2] + 0.7, t.pin);
  }
}

// The stages: four corner piers, each with a stepped reveal into the bay, piers in front of the bay that part it
// into a middle bay (the same eight columns all the way up) and two side bays, and a cornice, parapet, pinnacles and
// a stepped gable over the middle bay for its crown. Only the front's bay is glazed: the view never moves, and the
// other faces are seen edge on or not at all.
S.stages.forEach((s, k) => {
  const X = s.w / 2, Z = X, b = (s.cols * S.cell.w) / 2, r = s.reveal;
  const pier = [[b, Z - s.back], [b, Z - s.step], [b + r, Z - s.step], [b + r, Z], [X - s.c, Z], [X, Z - s.c], [X, b + r], [X - s.step, b + r], [X - s.step, b], [X - s.back, b], [X - s.back, Z - s.back]];
  const inner = ([x, z]) => Math.abs(x) <= X - s.back + 1e-6 && Math.abs(z) <= Z - s.back + 1e-6;
  // The corner piers run on past the cornice, as wings either side of the next stage, each capped in trim and
  // tipped with gold where it stands clear of the next stage.
  const top = s.y1 + s.rise, next = S.stages[k + 1];
  for (const [sx, sz] of corners) {
    const own = pier.map(([x, z]) => [sx * x, sz * z]);
    kit.prism('stone', own, s.y0, top, { edge: E, tag: GRANITE, skip: (a, c) => inner(a) && inner(c) });
    if (s.rise) {
      kit.prism('stone', own, top, top + 0.45, { top: true, tag: TRIM, skip: (a, c) => inner(a) && inner(c) });
      const here = s.w - s.c, there = next.w - next.c, d = (here + there) / 4, w = Math.min((X - b) * 0.8, ((here - there) / Math.SQRT2 / 1.13) * 0.85);
      kit.prism('stone', square(sx * d, sz * d, w * 0.75), top + 0.45, top + 1.2, { top: true, tag: TRIM });
      kit.prism('gold', square(sx * d, sz * d, w * 0.48), top + 1.2, top + 1.2 + s.pin * 0.6, { shrink: 0.03 });
    }
  }
  const faces = [face([-b, 0, Z - s.back], [1, 0, 0], [0, 0, 1]), face([X - s.back, 0, b], [0, 0, -1], [1, 0, 0]), face([b, 0, -(Z - s.back)], [-1, 0, 0], [0, 0, -1]), face([-(X - s.back), 0, -b], [0, 0, 1], [-1, 0, 0])];
  faces.forEach((f, i) => {
    if (i === 0) bays(f, 0, 2 * b, s.y0, s.y1, k * 2 + 1, s.mids.length ? [s.mids[0][1], s.mids[1][0]] : [0, s.cols]);
    else kit.patch('bay', on(f, 0, s.y0), on(f, 2 * b, s.y0), on(f, 2 * b, s.y1), on(f, 0, s.y1), { edge: E * 4, want: f.N, tag: PLAIN });
  });
  for (const [c0, c1] of s.mids) {
    const x0 = -b + c0 * S.cell.w, x1 = -b + c1 * S.cell.w, cz = Z - s.back, out = Z - s.step, cc = 0.3;
    kit.prism('stone', [[x0, cz], [x0, out - cc], [x0 + cc, out], [x1 - cc, out], [x1, out - cc], [x1, cz]], s.y0, s.y1, { edge: E, tag: GRANITE, skip: (a, c) => a[1] === cz && c[1] === cz });
    pinnacle((x0 + x1) / 2, out - (x1 - x0) / 2, (x1 - x0) * 0.62, s.y1 + 0.9, s.pin * 0.7);
  }
  kit.prism('stone', chamfered(s.w + 0.6, s.w + 0.6, s.c + 0.25), s.y1, s.y1 + 0.5, { top: true, bottom: true, edge: E, tag: TRIM });
  kit.prism('stone', chamfered(s.w + 1.1, s.w + 1.1, s.c + 0.45), s.y1 + 0.5, s.y1 + 0.9, { top: true, bottom: true, edge: E, tag: TRIM });
  kit.prism('stone', chamfered(s.w - 0.6, s.w - 0.6, s.c), s.y1 + 0.9, s.y1 + 2.0, { top: true, edge: E, tag: TRIM });
  if (s.gable) {
    const [w0, w1, w2] = s.gable, rise = 1.25, deep = 1.4;
    [w0, w1, w2].forEach((w, j) => {
      const y = s.y1 + 2.0 + j * rise;
      kit.box('stone', -w / 2, w / 2, y, y + rise, Z - 0.3 - deep, Z - 0.3, { top: true, edge: E, tag: TRIM });
      kit.box('gold', -w / 2 - 0.12, w / 2 + 0.12, y + rise, y + rise + 0.2, Z - 0.3 - deep - 0.12, Z - 0.3 + 0.12, { top: true });
    });
  }
});

// Above the shaft: a tier of gold reeds in a granite frame, the lantern, two fluted gold tiers, a fluted bronze
// spire with gold collars, a gold orb and the needle.
{
  const t = S.reedTier, X = t.w / 2;
  kit.prism('stone', chamfered(t.w, t.w, t.c), t.y0 - 0.6, t.y1, { edge: E, tag: GRANITE });
  for (const f of [face([-X, 0, X], [1, 0, 0], [0, 0, 1]), face([X, 0, X], [0, 0, -1], [1, 0, 0]), face([X, 0, -X], [-1, 0, 0], [0, 0, -1]), face([-X, 0, -X], [0, 0, 1], [-1, 0, 0])]) {
    const from = t.c + 0.5, to = t.w - t.c - 0.5, n = draft ? 4 : Math.round((to - from) / S.reed);
    kit.reeds('gold', f, from, to, t.y0 + 0.6, t.y1 - 0.6, n, 0.35, { round: true, segs: 4 });
  }
  kit.prism('stone', chamfered(t.w + 1, t.w + 1, t.c + 0.4), t.cornice[0], t.cornice[1], { top: true, bottom: true, tag: TRIM });

  const l = S.lantern, LX = l.w / 2, cw = l.col;
  kit.prism('stone', chamfered(l.plinth[2], l.plinth[2], 1.4), l.plinth[0], l.plinth[1], { top: true, edge: E, tag: TRIM });
  for (const [sx, sz] of corners) {
    const x = sx * (LX - cw / 2), z = sz * (LX - cw / 2);
    kit.prism('stone', square(x, z, cw + 0.4), l.plinth[1], l.plinth[1] + 0.6, { top: true, tag: TRIM });
    kit.prism('stone', square(x, z, cw, cw * 0.3), l.plinth[1] + 0.6, l.y1 - 0.7, { edge: E, tag: GRANITE });
    kit.prism('gold', square(x, z, cw + 0.3, cw * 0.3), l.y1 - 0.7, l.y1, { top: true, bottom: true });
    // A lamp on the floor inside each column, and its light worked out with the rest.
    kit.prism('gold', square(sx * (LX - cw - 0.7), sz * (LX - cw - 0.7), 0.7, 0.2), l.plinth[1], l.plinth[1] + 1.1, { top: true, tag: { lamp: true } });
  }
  // The rail between the columns, low enough that the night shows over it.
  const i0 = LX - cw, z0 = LX - cw / 2, h = 0.12;
  for (const sz of [1, -1]) kit.box('bay', -i0, i0, l.rail[0], l.rail[1], sz * z0 - h, sz * z0 + h, { top: true, bottom: true, tag: PLAIN });
  for (const sx of [1, -1]) kit.box('bay', sx * z0 - h, sx * z0 + h, l.rail[0], l.rail[1], -i0, i0, { top: true, bottom: true, tag: PLAIN });
  // The hanging lamp: a rod from the roof and a small gold lantern on it.
  const h0 = l.lamp;
  kit.prism('bay', square(0, 0, 0.2, 0.05), h0 + 2, l.cap[0], { tag: PLAIN });
  kit.lathe('gold', [[0, h0], [0.5, h0 + 0.3], [0.7, h0 + 1], [0.5, h0 + 1.7], [0.2, h0 + 2], [0, h0 + 2.1]], 16, { tag: { lamp: true } });
  kit.prism('stone', chamfered(l.w + 0.4, l.w + 0.4, 1.4), l.cap[0], l.cap[1], { top: true, bottom: true, tag: TRIM });
  kit.prism('stone', chamfered(l.roof[2], l.roof[2], 1.6), l.roof[0], l.roof[1], { top: true, bottom: true, edge: E, tag: TRIM });
  for (const [sx, sz] of corners) pinnacle(sx * (LX - 0.4), sz * (LX - 0.4), 1.5, l.roof[1], 2.6);
}

// The fluted gold tiers: each a core set back behind four corner pilasters, a plinth and a cornice, with panels of
// flutes between that lean back so they look up toward the moon (the stepped tower's crown, finer).
{
  const fluted = (w, d, y0, y1, k) => {
    const c = Math.max(0.35, w * 0.05), plinth = 0.25 + 0.04 * k, top = 0.5 + 0.04 * k;
    const X = w / 2, Z = d / 2, lean = (y1 - top - y0 - plinth) * Math.tan(S.batter * L.D2R), Pw = Math.max(0.5, w * 0.07);
    const yb = y0 + plinth, yt = y1 - top;
    kit.box('gold', -X + lean, X - lean, yb, yt, -Z + lean, Z - lean, { edge: E });
    const corner = [[X - c - Pw, Z], [X - c, Z], [X, Z - c], [X, Z - c - Pw], [X - lean, Z - c - Pw], [X - lean, Z - lean], [X - c - Pw, Z - lean]];
    const inner = ([x, z]) => Math.abs(x) <= X - lean + 1e-6 && Math.abs(z) <= Z - lean + 1e-6;
    for (const [sx, sz] of corners) kit.prism('gold', corner.map(([x, z]) => [sx * x, sz * z]), yb, yt, { edge: E, skip: (a, b) => inner(a) && inner(b) });
    kit.prism('gold', chamfered(w + 0.4, d + 0.4, c + 0.15), y0, yb, { top: true, edge: E });
    kit.prism('gold', chamfered(w + 0.4, d + 0.4, c + 0.15), yt, y1 - top * 0.45, { bottom: true, edge: E });
    kit.prism('gold', chamfered(w + 0.8, d + 0.8, c + 0.3), y1 - top * 0.45, y1, { top: true, bottom: true, edge: E });
    for (const f of [face([-X, 0, Z], [1, 0, 0], [0, 0, 1]), face([X, 0, Z], [0, 0, -1], [1, 0, 0]), face([X, 0, -Z], [-1, 0, 0], [0, 0, -1]), face([-X, 0, -Z], [0, 0, 1], [-1, 0, 0])]) {
      const span = Math.abs(f.T[0]) > 0.5 ? w : d, from = c + Pw, to = span - c - Pw, n = Math.max(3, Math.round((to - from) / (S.reed * 0.8)));
      kit.patch('gold', on(f, from, yb), on(f, to, yb), on(f, to, yt, lean), on(f, from, yt, lean), { nu: draft ? 1 : 3, edge: E, want: f.N, tag: { flute: (to - from) / n, o: on(f, from, 0), T: f.T } });
    }
  };
  S.tiers.forEach(([w, y0, y1], k) => fluted(w, w, y0, y1, k));

  const sp = S.spike, oct = (w) => chamfered(w, w, w * 0.2929);
  kit.prism('bay', oct(sp.w[0]), sp.y[0], sp.y[1], { shrink: sp.w[1] / sp.w[0], tag: PLAIN, edge: E });
  for (const y of sp.collars) {
    const k = (y - sp.y[0]) / (sp.y[1] - sp.y[0]), w = sp.w[0] + (sp.w[1] - sp.w[0]) * k;
    kit.prism('gold', oct(w + 0.5), y - 0.3, y + 0.3, { top: true, bottom: true });
  }
  kit.prism('gold', oct(sp.w[1] + 0.3), sp.y[1], sp.y[1] + 0.3, { top: true, bottom: true });
  const o = S.orb, prof = [];
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (Math.PI * i) / 12; prof.push([Math.max(0, o.r * Math.cos(a)), o.y + o.r * Math.sin(a)]); }
  kit.lathe('gold', prof, 24);
  const nd = S.needle;
  kit.prism('gold', oct(nd.w), nd.y0, TALL, { shrink: 0.012 });
}

// The ring, in its own frame, turned into place: tilted about x, then about z, at its height on the shaft.
const ringKit = new Kit({ gold: { width: 3, attr: kit.layers.gold.attr } });
{
  // Its section: a squared rim at the outer edge as thick as the ring, with its corners eased, a thin web stepped
  // down from it, and a small rolled bead at the inner edge. Flat faces, so each catches the light as a band.
  const R = RING.r, q = S.ring, [r0, r1, t, ch] = q.rim, [w0, w1, wy] = q.web, [ic, ir] = q.inner, prof = [];
  prof.push([R + r0, -t, true], [R + r1 - ch, -t, true], [R + r1, -t + ch, true], [R + r1, t - ch, true], [R + r1 - ch, t, true], [R + r0, t, true], [R + r0 - 0.15, wy + 0.15, true], [R + w1, wy, true]);
  for (let r = w1 - 0.9; r > w0 + 0.45; r -= 0.9) prof.push([R + r, wy]);
  prof.push([R + w0, wy, true]);
  for (let a = 60; a <= 300; a += 30) prof.push([R + ic + ir * Math.cos(a * L.D2R), ir * Math.sin(a * L.D2R)]);
  prof.push([R + w0, -wy, true]);
  for (let r = w0 + 0.9; r < w1 - 0.45; r += 0.9) prof.push([R + r, -wy]);
  prof.push([R + w1, -wy, true], [R + r0 - 0.15, -wy - 0.15, true]);
  ringKit.lathe('gold', prof, q.segs, { closed: true, tag: { ring: true } });
}
const ringAt = new THREE.Matrix4().makeTranslation(0, TALL * S.ring.at, 0).multiply(new THREE.Matrix4().makeRotationZ(RING.tilt[1] * L.D2R)).multiply(new THREE.Matrix4().makeRotationX(RING.tilt[0] * L.D2R));

// Into the world: the spire stands at the origin, turned square to the view.
const made = kit.meshes(new THREE.Matrix4().toArray()), ring = ringKit.meshes(ringAt.toArray()).gold;
made.gold = join(made.gold, ring);
function join(a, b) {
  const n = a.positions.length / 3, cat = (x, y, T) => { const o = new T(x.length + y.length); o.set(x); o.set(y, x.length); return o; };
  return { positions: cat(a.positions, b.positions, Float32Array), normals: cat(a.normals, b.normals, Float32Array), indices: cat(a.indices, b.indices.map((i) => i + n), Uint32Array), attr: cat(a.attr, b.attr, Float32Array), width: a.width };
}

// What each vertex is made of, for the bake, and the light it gives off.
const BRONZE = linear('bronze').map((v) => v * 0.3), GLASS = [0.03, 0.025, 0.02], GOLD = linear('copper-light').map((v) => v * 0.4), HOT = linear('hot');
const stone = made.stone, ns = stone.positions.length / 3, albedoStone = new Float32Array(ns * 3);
for (let i = 0; i < ns; i++) {
  const lay = Math.round(stone.attr[i * 3 + 2]);
  albedoStone.set(lay === LAY.trim ? ALBEDO.trim : lay === LAY.court ? ALBEDO.court : ALBEDO.granite, i * 3);
}
const bay = made.bay, nb = bay.positions.length / 3, emitBay = new Float32Array(nb * 3), albedoBay = new Float32Array(nb * 3);
for (let i = 0; i < nb; i++) {
  const [u, v, cw, ch] = bay.attr.subarray(i * 4, i * 4 + 4);
  albedoBay.set(cw > 0 ? GLASS.map((g, k) => 0.5 * g + 0.5 * BRONZE[k]) : BRONZE, i * 3);
  if (!(cw > 0)) continue;
  const f = win.field(u, v);
  let rr = 0, gg = 0, bb = 0, n = 0;
  for (const du of [-0.5, 0.5]) for (const dv of [-0.5, 0.5]) {
    const c = Math.min(f.c0 + f.cols - 1, Math.max(f.c0, Math.floor(u + du))), w = Math.min(f.r0 + f.rows - 1, Math.max(f.r0, Math.floor(v + dv)));
    const e = win.radiance(c, w, cw, ch);
    rr += e[0]; gg += e[1]; bb += e[2]; n++;
  }
  emitBay.set([(Math.PI * rr) / n, (Math.PI * gg) / n, (Math.PI * bb) / n], i * 3);
}
const gold = made.gold, ng = gold.positions.length / 3, emitGold = new Float32Array(ng * 3), albedoGold = new Float32Array(ng * 3);
for (let i = 0; i < ng; i++) {
  const lamp = Math.round(gold.attr[i * 3 + 1]) === 3;
  albedoGold.set(lamp ? [0.02, 0.02, 0.02] : GOLD, i * 3);
  if (lamp) emitGold.set(HOT.map((h) => Math.PI * WINDOW.lamp * h), i * 3);
}

// What stands round it while its light is baked, and is not kept: its neighbours as plain blocks giving off the
// city's own light, and the ground, lit warm by the streets round the court.
const lights = light(), site = surroundings();
function surroundings() {
  const NEAR = 190, STREET = { power: 0.4, at: L.COURT + 10, wide: 12 }, CITY = 0.12, GROUND = 0.05, hot = linear('hot');
  const k2 = new Kit({ block: { width: 0 } });
  P.TOWERS.forEach(([x, z, w, d, tall, turn]) => {
    if (Math.hypot(x, z) > NEAR || L.within(x, z) < 0.6 * Math.max(w, d)) return;
    const c = Math.cos(turn * L.D2R), s = Math.sin(turn * L.D2R), g = L.ground(x, z) - 2, at = (u, v) => [x + u * c + v * s, z - u * s + v * c];
    k2.prism('block', [at(-w / 2, d / 2), at(w / 2, d / 2), at(w / 2, -d / 2), at(-w / 2, -d / 2)], g, g + tall + 2, { top: true, edge: 12 });
  });
  const blocks = k2.meshes(new THREE.Matrix4().toArray()).block, nbk = blocks.positions.length / 3, glow = new Float32Array(nbk * 3);
  for (let i = 0; i < nbk; i++) if (Math.abs(blocks.normals[i * 3 + 1]) < 0.5) glow.set(hot.map((v) => Math.PI * CITY * v), i * 3);
  const step = 4, n = Math.round((2 * NEAR) / step) + 1, pos = [], nor = [], emit = [], idx = [], keep = new Map();
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -NEAR + i * step, z = -NEAR + j * step, r = Math.hypot(x, z);
    if (r < L.COURT - 2) continue;
    keep.set(j * n + i, pos.length / 3);
    pos.push(x, L.ground(x, z) - 0.3, z);
    nor.push(0, 1, 0);
    const e = STREET.power * Math.exp(-(((r - STREET.at) / STREET.wide) ** 2));
    emit.push(...hot.map((h) => Math.PI * e * h));
  }
  for (let j = 0; j + 1 < n; j++) for (let i = 0; i + 1 < n; i++) {
    const a = keep.get(j * n + i), b = keep.get(j * n + i + 1), c = keep.get((j + 1) * n + i), d = keep.get((j + 1) * n + i + 1);
    if ([a, b, c, d].some((v) => v === undefined)) continue;
    idx.push(a, c, b, b, c, d);
  }
  return [
    { name: 'blocks', positions: blocks.positions, normals: blocks.normals, indices: blocks.indices, albedo: [GROUND, GROUND * 0.85, GROUND * 0.7], emit: glow, receive: false },
    { name: 'ground', positions: new Float32Array(pos), normals: new Float32Array(nor), indices: new Uint32Array(idx), albedo: [GROUND, GROUND * 0.85, GROUND * 0.7], emit: new Float32Array(emit), receive: false },
  ];
}
const scene = {
  meshes: [
    { name: 'stone', ...stone, albedo: albedoStone, receive: true },
    { name: 'bay', ...bay, albedo: albedoBay, emit: emitBay, receive: true },
    { name: 'gold', ...gold, albedo: albedoGold, emit: emitGold, receive: true },
    ...site,
  ],
  moon: lights.moon, core: null, sky: lights.sky,
};
const stats = {};
const lit = await bake(scene, { samples: draft ? { core: 1, moon: 4, hemi: 48 } : { core: 1, moon: 24, hemi: 384 }, bounces: draft ? 1 : 2, reach: 60, stats });
console.log(`bake: ${stats.vertices} vertices, ${stats.triangles} triangles, ${stats.seconds.toFixed(1)} s`);

// Floodlights, hidden on each setback's roof behind its parapet and on the court at the podium's foot, which wash
// the stage above them with warm light from below, as a city's tallest tower is lit at night: bright at the foot of
// each stage and falling away up it, with the piers' reveals and the gables' undersides in shadow. Each is a row of
// lamps aimed up and a little in, worked out here with a shadow ray each and added to the stored bounce. They are
// not seen: what is seen is the light they lay. How strong a lamp is, how narrow its beam (a power of its cosine),
// how far in from straight up it leans, in degrees, how far apart the lamps are, and how far out from a face.
const FLOOD = { power: 80, beam: 4, lean: 28, every: 1.4, off: 2.4, most: 5 };
const floodAt = (() => {
  const lamps = [], row = (X, y, power, off = FLOOD.off) => {
    const r = X + off, n = Math.max(2, Math.round((2 * r) / FLOOD.every)), c = Math.cos(FLOOD.lean * L.D2R), k = Math.sin(FLOOD.lean * L.D2R);
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let i = 0; i <= n; i++) {
      const u = -r + (2 * r * i) / n, p = sx ? [sx * r, y, u] : [u, y, sz * r];
      lamps.push({ p, aim: [-sx * k, c, -sz * k], power });
    }
  };
  S.stages.forEach((s, k) => { const next = S.stages[k + 1]; if (next) row(next.w / 2, s.y1 + 2.1, FLOOD.power); });
  const last = S.stages[S.stages.length - 1];
  row(S.reedTier.w / 2, last.y1 + 2.1, FLOOD.power * 0.4, 0.5);
  row(S.stages[0].w / 2, S.podium.parapet[1] + 0.1, FLOOD.power * 0.3, 0.25);
  row(S.podium.w / 2, S.court.top + 0.1, FLOOD.power * 0.8, 4);
  const all = [made.stone, made.bay, made.gold], np = all.reduce((t, m) => t + m.positions.length, 0), pos = new Float32Array(np), idx = [];
  let o = 0;
  for (const m of all) { pos.set(m.positions, o); for (const i of m.indices) idx.push(i + o / 3); o += m.positions.length; }
  const tree = buildBvh(pos, new Uint32Array(idx));
  return (p, n) => {
    let e = 0;
    for (const l of lamps) {
      const dx = p[0] - l.p[0], dy = p[1] - l.p[1], dz = p[2] - l.p[2], d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < 0.04 || d2 > 1600) continue;
      const d = Math.sqrt(d2), lx = dx / d, ly = dy / d, lz = dz / d;
      const out = lx * l.aim[0] + ly * l.aim[1] + lz * l.aim[2], cosr = -(lx * n[0] + ly * n[1] + lz * n[2]);
      if (out <= 0 || cosr <= 0) continue;
      const k = (l.power * out ** FLOOD.beam * cosr) / d2;
      if (k < 0.01) continue;
      if (anyHit(tree, p[0] + n[0] * 0.05, p[1] + n[1] * 0.05, p[2] + n[2] * 0.05, -lx, -ly, -lz, d - 0.1)) continue;
      e += k;
    }
    return e;
  };
})();

// How shut in a place is, and the light that reaches it, averaged over this far in units: the gold's flutes are
// finer than its vertices, and their shade is the cornices', not each flute's.
const SMOOTH = { stone: 0, bay: 0, gold: 1.2 };
function smooth(m, values, width, r) {
  if (!(r > 0)) return values;
  const n = m.positions.length / 3, cell = new Map(), key = (x, y, z) => `${Math.floor(x / r)},${Math.floor(y / r)},${Math.floor(z / r)}`, out = new Float32Array(values.length);
  for (let i = 0; i < n; i++) { const k = key(m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(i); }
  for (let i = 0; i < n; i++) {
    const [x, y, z] = m.positions.subarray(i * 3, i * 3 + 3), sum = new Float64Array(width);
    let w = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      for (const j of cell.get(key(x + a * r, y + b * r, z + c * r)) ?? []) {
        if (Math.round(m.attr[j * m.width + 1]) !== Math.round(m.attr[i * m.width + 1])) continue;
        const d = Math.hypot(m.positions[j * 3] - x, m.positions[j * 3 + 1] - y, m.positions[j * 3 + 2] - z);
        if (d > r) continue;
        const k = 1 - d / r;
        for (let q = 0; q < width; q++) sum[q] += k * values[j * width + q];
        w += k;
      }
    }
    for (let q = 0; q < width; q++) out[i * width + q] = sum[q] / w;
  }
  return out;
}

const meshes = ['stone', 'bay', 'gold'].map((name) => {
  const m = made[name], raw = lit[name], n = m.positions.length / 3, light4 = new Float32Array(n * 4), bounce4 = new Float32Array(n * 4);
  const l = { ...raw, open: smooth(m, raw.open, 1, SMOOTH[name]), bounce: smooth(m, raw.bounce, 3, SMOOTH[name]) };
  const hot = linear('hot');
  for (let i = 0; i < n; i++) {
    const e = Math.min(FLOOD.most, floodAt(m.positions.subarray(i * 3, i * 3 + 3), m.normals.subarray(i * 3, i * 3 + 3)));
    if (e > 0) for (let q = 0; q < 3; q++) l.bounce[i * 3 + q] += e * hot[q];
  }
  for (let i = 0; i < n; i++) {
    light4.set([l.core[i], l.moon[i], l.open[i], 0], i * 4);
    bounce4.set([storeBounce(l.bounce[i * 3]), storeBounce(l.bounce[i * 3 + 1]), storeBounce(l.bounce[i * 3 + 2]), 0], i * 4);
  }
  const attributes = { normal: { data: m.normals, size: 3, as: 'i16' }, light: { data: light4, size: 4, as: 'u8' }, bounce: { data: bounce4, size: 4, as: 'u8' } };
  if (name === 'stone') attributes.grain = { data: m.attr, size: 3, as: 'f32' };
  if (name === 'bay') attributes.cell = { data: m.attr, size: 4, as: 'f32' };
  if (name === 'gold') attributes.gild = { data: m.attr, size: 3, as: 'f32' };
  return { name, positions: m.positions, indices: m.indices, attributes, info: { triangles: m.indices.length / 3 } };
});
const triangles = meshes.reduce((s, m) => s + m.indices.length / 3, 0);
pack('public/world/spire.bin', meshes, { windows: 'spire-windows.png', triangles, draft });
png('public/world/spire-windows.png', win.size, win.size, win.data, 3);
console.log(`spire: ${triangles} triangles (${meshes.map((m) => `${m.name} ${m.indices.length / 3}`).join(', ')}), windows lit ${(100 * win.lit()).toFixed(0)}%, ${((performance.now() - began) / 1000).toFixed(1)} s`);
