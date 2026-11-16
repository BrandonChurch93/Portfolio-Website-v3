// The tower with the stepped gold crown (TOWERS[STEP] in src/pieces/world/placed.ts), made ahead and shipped:
// public/world/tower-step.bin, its geometry and baked light, and public/world/tower-step-windows.png, the state of
// every window.
//
//   node scripts/world/parts/towers/step.mjs [--draft]
//
// A slender tower of pale stone: a base of two storeys with three portals, and above it four corner piers that run
// unbroken to the cornice with a recessed bay of windows between each pair, behind bronze mullions and fins. On
// it a parapet with an urn at each corner, and a crown of five gold tiers, each with a plinth, fluted faces and a
// cornice, under a lantern and a point. Light from the lit windows, and from the street, is baked onto the stone.
import { pack } from '../../lib/pack.mjs';
import { png } from '../../lib/png.mjs';
import { bake } from '../../lib/bake.mjs';
import { L, P, light, linear, storeBounce } from '../../lib/plan.mjs';
import { Kit, chamfered, face, on } from './kit.mjs';
import { Windows } from './windows.mjs';
import { occluders, placeOf } from './site.mjs';

const draft = process.argv.includes('--draft');
const [X0, Z0, W, D, TALL, TURN, , , SEED] = P.TOWERS[P.STEP];

// The design, in units in the tower's own frame. Every number here is placed against the footprint W by D and the
// height TALL, which the plan fixes.
const S = {
  base: { w: W, d: D, c: 1.2, y0: -3, y1: 15 },
  course: { w: W + 0.8, d: D + 0.8, c: 1.5, y0: 15, y1: 16 },
  shaft: { w: W - 3, d: D - 3, c: 1.6, y0: 16, y1: 124.6, bay: 7.2, reveal: 0.8, step: 1.0, back: 2.2 },
  cell: { w: 1.2, rows: 68, band: 0.5 },
  // How many storeys of the bay are a bronze grille at its foot and its head, and how wide a slot of it is.
  grille: { foot: 1, head: 2, slot: 0.6 },
  fin: { every: 6, wide: 0.34, out: 0.5 },
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

const win = new Windows(Math.round(SEED * 1e6));
const kit = new Kit({
  // Where a joint of the stone falls: across the face, up it, and how it is laid (0 ashlar, 1 the base's channels).
  stone: {
    width: 3, attr: (p, n, tag) => {
      if (Math.abs(n[1]) > 0.7) return [p[0], p[2], tag?.lay ?? 0];
      const tx = n[2], tz = -n[0], l = Math.hypot(tx, tz) || 1;
      return [(p[0] * tx + p[2] * tz) / l, p[1], tag?.lay ?? 0];
    },
  },
  // Where a place is in its field of windows, in windows (the whole part is the window, as the map has it), and
  // how large one is in units. A plain bronze face has no size; a door has its leaf's width as less than 0.
  bay: {
    width: 4, attr: (p, n, tag) => {
      if (!tag || tag.plain) return [0, 0, 0, 0];
      const s = (p[0] - tag.o[0]) * tag.T[0] + (p[2] - tag.o[2]) * tag.T[2], t = p[1] - tag.y0;
      if (tag.door) return [s / tag.door, t / tag.ch, -tag.door, tag.ch];
      return [tag.c0 + s / tag.cw, tag.r0 + t / tag.ch, tag.cw, tag.ch];
    },
  },
  // Where a place is across a panel of flutes, in flutes, and 1 there (0 on plain gold).
  gold: {
    width: 2, attr: (p, n, tag) => tag?.flute ? [((p[0] - tag.o[0]) * tag.T[0] + (p[2] - tag.o[2]) * tag.T[2]) / tag.flute, 1] : [0, 0],
  },
});
const PLAIN = { plain: true };
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
    for (let k = S.fin.every; k < cols; k += S.fin.every) {
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
  const fluted = (w, d, y0, y1, k) => {
    const c = Math.max(0.5, w * 0.045), plinth = 0.3 + 0.05 * k, top = 0.7 + 0.05 * k;
    const X = w / 2, Z = d / 2, lean = (y1 - top - y0 - plinth) * Math.tan(S.batter * L.D2R), P = Math.max(0.6, w * 0.05);
    const yb = y0 + plinth, yt = y1 - top;
    kit.box('gold', -X + lean, X - lean, yb, yt, -Z + lean, Z - lean, { edge: E });
    const corner = [[X - c - P, Z], [X - c, Z], [X, Z - c], [X, Z - c - P], [X - lean, Z - c - P], [X - lean, Z - lean], [X - c - P, Z - lean]];
    const inner = ([x, z]) => Math.abs(x) <= X - lean + 1e-6 && Math.abs(z) <= Z - lean + 1e-6;
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) kit.prism('gold', corner.map(([x, z]) => [sx * x, sz * z]), yb, yt, { edge: E, skip: (a, b) => inner(a) && inner(b) });
    kit.prism('gold', chamfered(w + 0.5, d + 0.5, c + 0.2), y0, yb, { top: true, edge: E });
    kit.prism('gold', chamfered(w + 0.5, d + 0.5, c + 0.2), yt, y1 - top * 0.45, { bottom: true, edge: E });
    kit.prism('gold', chamfered(w + 1.0, d + 1.0, c + 0.4), y1 - top * 0.45, y1, { top: true, bottom: true, edge: E });
    for (const f of [face([-X, 0, Z], [1, 0, 0], [0, 0, 1]), face([X, 0, Z], [0, 0, -1], [1, 0, 0]), face([X, 0, -Z], [-1, 0, 0], [0, 0, -1]), face([-X, 0, -Z], [0, 0, 1], [-1, 0, 0])]) {
      const span = Math.abs(f.T[0]) > 0.5 ? w : d, from = c + P, to = span - c - P, n = Math.max(3, Math.round((to - from) / S.reed));
      const o = on(f, from, 0), tag = { flute: (to - from) / n, o, T: f.T };
      kit.patch('gold', on(f, from, yb), on(f, to, yb), on(f, to, yt, lean), on(f, from, yt, lean), { nu: draft ? 1 : 4, edge: E, want: f.N, tag });
    }
  };
  S.tiers.forEach(([w, d, y0, y1], k) => fluted(w, d, y0, y1, k));
  const t = S.lantern, w = t.w;
  kit.prism('gold', chamfered(w + 2.4, w + 2.4, 0.6), t.plinth[0], t.plinth[1], { top: true });
  fluted(w, w, t.body[0], t.body[1], 6);
  kit.prism('gold', chamfered(w * 0.62, w * 0.62, 0.4), t.point[0], t.point[1], { shrink: 0.04 });
}

// Into the world, and the light worked out.
const local = placeOf(X0, Z0, TURN), made = kit.meshes(local);
const BRONZE = linear('bronze').map((v) => v * 0.32), GLASS = [0.03, 0.025, 0.02];
const bay = made.bay, nb = bay.positions.length / 3, emit = new Float32Array(nb * 3), albedoBay = new Float32Array(nb * 3);
for (let i = 0; i < nb; i++) {
  const [u, v, cw, ch] = bay.attr.subarray(i * 4, i * 4 + 4);
  const a = cw > 0 ? GLASS.map((g, k) => 0.5 * g + 0.5 * BRONZE[k]) : BRONZE;
  albedoBay.set(a, i * 3);
  if (!(cw > 0)) continue;
  const tag = findField(u, v);
  let r = 0, g = 0, b = 0, n = 0;
  for (const du of [-0.5, 0.5]) for (const dv of [-0.5, 0.5]) {
    const c = Math.min(tag.c0 + tag.cols - 1, Math.max(tag.c0, Math.floor(u + du))), w = Math.min(tag.r0 + tag.rows - 1, Math.max(tag.r0, Math.floor(v + dv)));
    const e = win.radiance(c, w, cw, ch);
    r += e[0]; g += e[1]; b += e[2]; n++;
  }
  emit.set([(Math.PI * r) / n, (Math.PI * g) / n, (Math.PI * b) / n], i * 3);
}
function findField(u, v) {
  for (const f of win.fields) if (u >= f.c0 - 1e-3 && u <= f.c0 + f.cols + 1e-3 && v >= f.r0 - 1e-3 && v <= f.r0 + f.rows + 1e-3) return f;
  throw new Error(`step: no field of windows holds ${u}, ${v}`);
}

const lights = light(), world = occluders(P.STEP, X0, Z0);
const scene = {
  meshes: [
    { name: 'stone', ...made.stone, albedo: linear('text-2').map((v) => v * 0.92), receive: true },
    { name: 'bay', ...bay, albedo: albedoBay, emit, receive: true },
    { name: 'gold', ...made.gold, albedo: linear('copper-light').map((v) => v * 0.4), receive: true },
    ...world,
  ],
  moon: lights.moon, core: null, sky: lights.sky,
};
const stats = {}, began = performance.now();
const lit = await bake(scene, { samples: draft ? { core: 1, moon: 4, hemi: 48 } : { core: 1, moon: 24, hemi: 512 }, bounces: draft ? 1 : 2, reach: 60, stats });
console.log(`bake: ${stats.vertices} vertices, ${stats.triangles} triangles, ${stats.seconds.toFixed(1)} s`);

// How shut in a place is, and the light that reaches it, averaged over this far in units: the gold's flutes are
// finer than its vertices, and their shade is the cornices', not each flute's.
const SMOOTH = { stone: 0, bay: 0, gold: 1.6 };
function smooth(m, values, width, r) {
  if (!(r > 0)) return values;
  const n = m.positions.length / 3, cell = new Map(), key = (x, y, z) => `${Math.floor(x / r)},${Math.floor(y / r)},${Math.floor(z / r)}`, out = new Float32Array(values.length);
  for (let i = 0; i < n; i++) { const k = key(m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(i); }
  for (let i = 0; i < n; i++) {
    const [x, y, z] = m.positions.subarray(i * 3, i * 3 + 3), sum = new Float64Array(width);
    let w = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      for (const j of cell.get(key(x + a * r, y + b * r, z + c * r)) ?? []) {
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
  for (let i = 0; i < n; i++) {
    light4.set([l.core[i], l.moon[i], l.open[i], 0], i * 4);
    bounce4.set([storeBounce(l.bounce[i * 3]), storeBounce(l.bounce[i * 3 + 1]), storeBounce(l.bounce[i * 3 + 2]), 0], i * 4);
  }
  const attributes = { normal: { data: m.normals, size: 3, as: 'i16' }, light: { data: light4, size: 4, as: 'u8' }, bounce: { data: bounce4, size: 4, as: 'u8' } };
  if (name === 'stone') attributes.grain = { data: m.attr, size: 3, as: 'f32' };
  if (name === 'bay') attributes.cell = { data: m.attr, size: 4, as: 'f32' };
  if (name === 'gold') attributes.flute = { data: m.attr, size: 2, as: 'f32' };
  return { name, positions: m.positions, indices: m.indices, attributes, info: { triangles: m.indices.length / 3 } };
});
const triangles = meshes.reduce((s, m) => s + m.indices.length / 3, 0);
pack('public/world/tower-step.bin', meshes, { design: 'step', windows: 'tower-step-windows.png', triangles, draft });
png('public/world/tower-step-windows.png', win.size, win.size, win.data, 3);
console.log(`step: ${triangles} triangles (${meshes.map((m) => `${m.name} ${m.indices.length / 3}`).join(', ')}), windows lit ${(100 * win.lit()).toFixed(0)}%, ${((performance.now() - began) / 1000).toFixed(1)} s`);
