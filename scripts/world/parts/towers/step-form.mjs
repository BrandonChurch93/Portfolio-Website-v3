// The tower with the stepped gold crown (TOWERS[STEP] in src/pieces/world/placed.ts), as a form: built into a Kit
// of the towers' layers (./layers.mjs), in the tower's own frame, its windows taken from a Windows map. Its own make
// is ./step.mjs, and the city's (./city.mjs) builds it with every other building.
//
// A slender tower of pale stone: a base of two storeys with three portals, and above it four corner piers that run
// unbroken to the cornice with a recessed bay of windows between each pair, behind bronze mullions and fins. On
// it a parapet with an urn at each corner, and a crown of five gold tiers, each with a plinth, fluted faces and a
// cornice, under a lantern and a point.
import { L, P } from '../../lib/plan.mjs';
import { chamfered, face, on } from './kit.mjs';
import { fluted } from './forms.mjs';
import { PLAIN } from './layers.mjs';

const [, , W, D, TALL] = P.TOWERS[P.STEP];

// The design, in units in the tower's own frame. Every number here is placed against the footprint W by D and the
// height TALL, which the plan fixes.
const S = {
  base: { w: W, d: D, c: 1.2, y0: -3, y1: 15 },
  course: { w: W + 0.8, d: D + 0.8, c: 1.5, y0: 15, y1: 16 },
  shaft: { w: W - 3, d: D - 3, c: 1.6, y0: 16, y1: 124.6, bay: 7.2, reveal: 0.8, step: 1.0, back: 2.2 },
  cell: { w: 1.2, rows: 68, band: 0.5 },
  // How many storeys of the bay are a bronze grille at its foot and its head, and how wide a slot of it is.
  grille: { foot: 1, head: 2, slot: 0.6 },
  // A bronze fin every so many windows: none, since the one down the middle of a bay read as a seam.
  fin: { every: 0, wide: 0.34, out: 0.5 },
  cornice: [[124.6, 125.25, 0.35], [125.25, 126.0, 0.7]],
  parapet: { y1: 127.3, inset: 0.15, c: 2.0 },
  urn: { at: 1.9 },
  tiers: [[31.0, 29.0, 126.0, 137.2], [26.0, 24.4, 137.2, 146.4], [21.0, 19.8, 146.4, 154.0], [16.0, 15.2, 154.0, 160.4], [11.4, 10.8, 160.4, 166.0]],
  lantern: { w: 6.0, plinth: [166.0, 166.7], body: [166.7, 168.3], point: [168.3, TALL] },
  // How wide a flute of the crown is, about: each panel holds a whole number of them.
  reed: 1.3,
  // How far each tier of the crown leans back, in degrees, so that its flutes look up toward the moon.
  batter: 9,
};

export function stepTower(kit, win, draft) {
  const E = draft ? 6 : 2.3;

  // The base: two storeys of channelled stone, its front let in by three portals with bronze doors under lit
  // transoms, and a window each side.
  {
    const b = S.base, rust = { lay: 1 };
    kit.prism('stone', chamfered(b.w, b.d, b.c), b.y0, b.y1, { edge: E, tag: rust, skip: (a, c) => a[1] === b.d / 2 && c[1] === b.d / 2 });
    const f = face([0, 0, b.d / 2], [1, 0, 0], [0, 0, 1]);
    const glassIn = (cols, rows) => (g, s0, s1, t0, t1, deep) => {
      const at = win.take(cols, rows, 5 + s0), cw = (s1 - s0) / cols, ch = (t1 - t0) / rows;
      const o = on(g, s0, 0, deep);
      kit.patch('bay', on(g, s0, t0, deep), on(g, s1, t0, deep), on(g, s1, t1, deep), on(g, s0, t1, deep), { nu: cols, nv: rows, want: g.N, tag: { o, T: g.T, y0: t0, c0: at.c0, r0: at.r0, cw, ch } });
    };
    const portal = (door) => (g, s0, s1, t0, t1, deep) => {
      const o = on(g, s0, 0, deep);
      kit.patch('bay', on(g, s0, t0, deep), on(g, s1, t0, deep), on(g, s1, door, deep), on(g, s0, door, deep), { nu: 2, edge: E, want: g.N, tag: { o, T: g.T, y0: t0, door: (s1 - s0) / 2, ch: door - t0 } });
      glassIn(s1 - s0 > 3 ? 3 : 2, 1)(g, s0, s1, door, t1, deep);
    };
    const open = [
      { s0: -3.0, s1: 3.0, t0: 0, t1: 11.2, floor: true, steps: [{ inset: 0, depth: 0.5 }, { inset: 0.5, depth: 0.6 }, { inset: 0.4, depth: 0.5 }], back: portal(7.4) },
      ...[-1, 1].flatMap((k) => {
        const [a, c] = k < 0 ? [-10.6, -7.6] : [7.6, 10.6];
        return [
          { s0: a, s1: c, t0: 0, t1: 8.6, floor: true, steps: [{ inset: 0, depth: 0.5 }, { inset: 0.4, depth: 0.9 }], back: portal(5.9) },
          { s0: a, s1: c, t0: 10.0, t1: 13.6, steps: [{ inset: 0, depth: 0.35 }, { inset: 0.25, depth: 0.45 }], back: glassIn(2, 1) },
          { s0: k < 0 ? -15.6 : 12.9, s1: k < 0 ? -12.9 : 15.6, t0: 1.4, t1: 11.0, steps: [{ inset: 0, depth: 0.35 }, { inset: 0.25, depth: 0.5 }], back: glassIn(2, 4) },
        ];
      }),
    ];
    kit.wall('stone', f, -(b.w / 2 - b.c), b.w / 2 - b.c, b.y0, b.y1, open, { edge: E, tag: rust });
    const c = S.course;
    kit.prism('stone', chamfered(c.w, c.d, c.c), c.y0, c.y1, { top: true, bottom: true, edge: E });
  }

  // The shaft: four corner piers, unbroken to the cornice, each with a stepped reveal into the bay, and the bays.
  {
    const s = S.shaft, X = s.w / 2, Z = s.d / 2, b = s.bay, r = s.reveal;
    const pier = [[b, Z - s.back], [b, Z - s.step], [b + r, Z - s.step], [b + r, Z], [X - s.c, Z], [X, Z - s.c], [X, b + r], [X - s.step, b + r], [X - s.step, b], [X - s.back, b], [X - s.back, Z - s.back]];
    const inner = ([x, z]) => Math.abs(x) <= X - s.back + 1e-6 && Math.abs(z) <= Z - s.back + 1e-6;
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      kit.prism('stone', pier.map(([x, z]) => [sx * x, sz * z]), s.y0, s.y1, { edge: E, skip: (a, c) => inner(a) && inner(c) });
    }
    const faces = [
      face([-b, 0, Z - s.back], [1, 0, 0], [0, 0, 1]),
      face([X - s.back, 0, b], [0, 0, -1], [1, 0, 0]),
      face([b, 0, -(Z - s.back)], [-1, 0, 0], [0, 0, -1]),
      face([-(X - s.back), 0, -b], [0, 0, 1], [-1, 0, 0]),
    ];
    const c = { ...S.cell, h: (s.y1 - s.y0 - S.cell.band) / S.cell.rows }, cols = Math.round((2 * b) / c.w), y0 = s.y0 + c.band, rows = c.rows;
    faces.forEach((f, i) => {
      const at = win.take(cols, rows, i);
      kit.patch('bay', on(f, 0, s.y0), on(f, 2 * b, s.y0), on(f, 2 * b, y0), on(f, 0, y0), { nu: cols, nv: 1, want: f.N, tag: PLAIN });
      const g = S.grille, w0 = y0 + g.foot * c.h, w1 = y0 + (rows - g.head) * c.h, slot = (y, h) => ({ o: f.o, T: f.T, y0: y, door: g.slot, ch: h });
      kit.patch('bay', on(f, 0, y0), on(f, 2 * b, y0), on(f, 2 * b, w0), on(f, 0, w0), { nu: cols, nv: g.foot, want: f.N, tag: slot(y0, w0 - y0) });
      kit.patch('bay', on(f, 0, w0), on(f, 2 * b, w0), on(f, 2 * b, w1), on(f, 0, w1), { nu: cols, nv: draft ? Math.ceil(rows / 3) : rows - g.foot - g.head, want: f.N, tag: { o: f.o, T: f.T, y0, c0: at.c0, r0: at.r0, cw: c.w, ch: c.h } });
      kit.patch('bay', on(f, 0, w1), on(f, 2 * b, w1), on(f, 2 * b, s.y1), on(f, 0, s.y1), { nu: cols, nv: g.head, want: f.N, tag: slot(w1, s.y1 - w1) });
      for (let k = S.fin.every; S.fin.every > 0 && k < cols; k += S.fin.every) {
        const m = k * c.w, h = S.fin.wide / 2, P2 = (sv, out) => { const q = on(f, sv, 0); return [q[0] + f.N[0] * out, q[2] + f.N[2] * out]; };
        const flat = ([x, z]) => Math.abs((x - f.o[0]) * f.N[0] + (z - f.o[2]) * f.N[2]) < 1e-6;
        kit.prism('bay', [P2(m - h, 0), P2(m - h, S.fin.out), P2(m + h, S.fin.out), P2(m + h, 0)], s.y0, s.y1, { edge: E, tag: PLAIN, skip: (a, cc) => flat(a) && flat(cc) });
      }
    });
    // The cornice in two steps, and the parapet over it with an urn at each corner.
    for (const [y0c, y1c, out] of S.cornice) kit.prism('stone', chamfered(s.w + 2 * out, s.d + 2 * out, s.c + out * 0.8), y0c, y1c, { top: true, bottom: true, edge: E });
    const p = S.parapet, pw = s.w - 2 * p.inset, pd = s.d - 2 * p.inset;
    kit.prism('stone', chamfered(pw, pd, p.c), s.y1 + 1.4, p.y1, { top: true, edge: E });
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const ux = sx * (pw / 2 - S.urn.at), uz = sz * (pd / 2 - S.urn.at), sq = (w) => chamfered(w, w, w * 0.18).map(([x, z]) => [ux + x, uz + z]);
      kit.prism('stone', sq(1.7), p.y1, p.y1 + 0.5, { top: true });
      kit.prism('stone', sq(1.15), p.y1 + 0.5, p.y1 + 1.9, { shrink: 0.82 });
      kit.prism('stone', sq(1.45), p.y1 + 1.9, p.y1 + 2.25, { top: true, bottom: true });
      kit.prism('gold', sq(1.0), p.y1 + 2.25, p.y1 + 3.6, { shrink: 0.02 });
    }
  }

  // The crown: five tiers of gold, each smaller than the one under it.
  {
    // A tier: a core set back behind four upright corner pilasters, a plinth and a cornice, and between each pair of
    // pilasters a panel of flutes that leans back from the plinth to the cornice, so its flanks look up toward the
    // moon while the tier's outline stays square.
    const b = { kit, E, draft }, fl = (w, d, y0, y1, k) => fluted(b, w, d, y0, y1, k, { batter: S.batter, reed: S.reed });
    S.tiers.forEach(([w, d, y0, y1], k) => fl(w, d, y0, y1, k));
    const t = S.lantern, w = t.w;
    kit.prism('gold', chamfered(w + 2.4, w + 2.4, 0.6), t.plinth[0], t.plinth[1], { top: true });
    fl(w, w, t.body[0], t.body[1], 6);
    kit.prism('gold', chamfered(w * 0.62, w * 0.62, 0.4), t.point[0], t.point[1], { shrink: 0.04 });
  }
}
