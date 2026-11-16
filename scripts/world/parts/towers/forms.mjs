// The towers' vocabulary: the parts every design is put together from, in the language of the stepped tower. Each
// builds into a Kit of the towers' layers (./layers.mjs), in a building's own frame (x across its width, z toward
// its front, y up from the ground under its middle), with its windows taken from a Windows map.
//
//   const b = { kit, win, R, E, draft, tone, busy, mood }        // what every part is handed: the building
//   shaft(b, w, d, y0, y1, style)       piers and recessed bays of windows round a block, its back left out
//   cornice(b, w, d, y, tall, out)      a moulding round a block, in two steps
//   fluted(b, w, d, y0, y1, k)          a tier of gold with fluted faces, as the stepped tower's crown is built
//   revolve(b, layer, profile, n, o)    a round thing, turned from a profile
//   drum(b, r, y0, y1, n, style)        a round wall of windows
import { L } from '../../lib/plan.mjs';
import { chamfered, face, on } from './kit.mjs';
import { COPPER, PLAIN } from './layers.mjs';

// The four faces of a block w by d about the middle, each with its length: front, right, back, left.
export function faces(w, d) {
  const X = w / 2, Z = d / 2;
  return [
    { f: face([-X, 0, Z], [1, 0, 0], [0, 0, 1]), len: w, side: 'front' },
    { f: face([X, 0, Z], [0, 0, -1], [1, 0, 0]), len: d, side: 'right' },
    { f: face([X, 0, -Z], [-1, 0, 0], [0, 0, -1]), len: w, side: 'back' },
    { f: face([-X, 0, -Z], [0, 0, 1], [-1, 0, 0]), len: d, side: 'left' },
  ];
}
const SEEN = (s) => s.side !== 'back';
const stone = (b, extra = {}) => ({ tone: b.tone, vary: b.vary, lay: b.lay ?? 0, ...extra });

// A field of windows filling a rectangle of a face, set back by `back`: a patch of the bay's material, with as many
// vertices as the light baked on it needs (one every few windows).
export function windows(b, f, s0, s1, t0, t1, back, cw, ch, o = {}) {
  const cols = Math.max(1, Math.round((s1 - s0) / cw)), rows = Math.max(1, Math.round((t1 - t0) / ch));
  // The face, known by where it stands and which way it looks, so every field of it shares its tenants.
  const face = (Math.round(f.N[0] * 3 + 5) * 7 + Math.round(f.N[2] * 3 + 5)) * 101 + (Math.round(f.o[0] * 4 + f.o[2] * 7) & 1023);
  const at = b.win.take(cols, rows, b.mood + s0 * 0.37 + t0 * 0.011, o.busy ?? b.busy, true, { build: b.mood, y0: t0, ch: (t1 - t0) / rows, u0: s0, cw: (s1 - s0) / cols, face });
  const tag = { o: on(f, s0, 0, back), T: f.T, y0: t0, c0: at.c0, r0: at.r0, cw: (s1 - s0) / cols, ch: (t1 - t0) / rows, stone: o.stone, tone: b.tone };
  const every = o.every ?? (b.draft ? 6 : 4);
  b.kit.patch('bay', on(f, s0, t0, back), on(f, s1, t0, back), on(f, s1, t1, back), on(f, s0, t1, back), { nu: Math.max(1, Math.ceil(cols / every)), nv: Math.max(1, Math.ceil(rows / (every + 1))), want: f.N, tag });
}

// A rectangle of a face of stone (or another layer), flat, at a depth behind the face.
export function slab(b, f, s0, s1, t0, t1, back = 0, layer = 'stone', tag) {
  if (s1 - s0 < 1e-4 || t1 - t0 < 1e-4) return;
  b.kit.patch(layer, on(f, s0, t0, back), on(f, s1, t0, back), on(f, s1, t1, back), on(f, s0, t1, back), { edge: b.E, want: f.N, tag: tag ?? stone(b) });
}

// The sides of an opening let into a face from depth a to depth c: its two jambs, its head and its sill.
export function reveal(b, f, s0, s1, t0, t1, a, c, o = {}) {
  const k = b.kit, P = (s, t, d) => on(f, s, t, d), tag = o.tag ?? stone(b), layer = o.layer ?? 'stone', e = b.E;
  const nx = [-f.N[0], 0, -f.N[2]];
  k.patch(layer, P(s0, t0, a), P(s0, t0, c), P(s0, t1, c), P(s0, t1, a), { edge: e, want: f.T, tag });
  k.patch(layer, P(s1, t0, c), P(s1, t0, a), P(s1, t1, a), P(s1, t1, c), { edge: e, want: [-f.T[0], 0, -f.T[2]], tag });
  if (o.head !== false) k.patch(layer, P(s0, t1, a), P(s0, t1, c), P(s1, t1, c), P(s1, t1, a), { edge: e, want: [0, -1, 0], tag });
  if (o.sill !== false) k.patch(layer, P(s0, t0, c), P(s0, t0, a), P(s1, t0, a), P(s1, t0, c), { edge: e, want: [0, 1, 0], tag });
  void nx;
}

// A face of a shaft: corners and piers of stone at the face, bays of windows recessed between them, from y0 to y1.
//   style = { corner, pier, bays, back, cw, ch, fin: every so many windows a bronze fin (finLayer 'stone' makes it a
//             stone mullion finWide each side of its line, standing finOut out of the glass), band: every so many
//             storeys a band across the bay, bandTall high and bandBack behind the face, of stone or of bandLayer
//             (a spandrel of bronze or copper, bandTag), out: how far the piers stand proud, busy, punched: the
//             windows let into the stone of the wall and not into bronze }
export function facade(b, f, len, y0, y1, st) {
  const corner = Math.min(st.corner, len * 0.3), pier = st.pier;
  // As many bays as fit, each at least a window and a half wide, so a narrow face is not left blank.
  let n = Math.max(1, st.bays), bay = (len - 2 * corner - (n - 1) * pier) / n;
  while (n > 1 && bay < Math.max(1.5, 1.5 * st.cw)) { n--; bay = (len - 2 * corner - (n - 1) * pier) / n; }
  if (bay < 1.5) { slab(b, f, 0, len, y0, y1); return; }
  // The middle bay of an odd number is wider (st.middle times the others), as a facade's is.
  const mid = n >= 3 && n % 2 === 1 ? st.middle ?? 1 : 1, unit = (len - 2 * corner - (n - 1) * pier) / (n - 1 + mid);
  const width = (i) => (n >= 3 && n % 2 === 1 && i === (n - 1) / 2 ? unit * mid : unit), from = (i) => corner + Array.from({ length: i }, (_, k) => width(k) + pier).reduce((a, v) => a + v, 0);
  const out = st.out ?? 0;
  const proud = (s0, s1) => {
    if (out > 0) {
      slab(b, f, s0, s1, y0, y1, -out);
      reveal(b, f, s0, s1, y0, y1, -out, 0, { head: true, sill: false });
    } else slab(b, f, s0, s1, y0, y1);
  };
  proud(0, corner);
  proud(len - corner, len);
  for (let i = 0; i < n; i++) {
    const s0 = from(i), s1 = s0 + width(i);
    bay = s1 - s0;
    if (i > 0) proud(s0 - pier, s0);
    reveal(b, f, s0, s1, y0, y1, 0, st.back, { head: false, sill: false });
    if (st.band) {
      const floors = Math.max(1, Math.round((y1 - y0) / st.ch)), h = (y1 - y0) / floors, bh = Math.min(h * 0.55, st.bandTall ?? h * 0.45);
      let t = y0;
      for (let fl = 0; fl < floors; fl += st.band) {
        const top = Math.min(y1, y0 + (fl + st.band) * h), glassTop = top - (top < y1 - 1e-6 ? bh : 0);
        windows(b, f, s0, s1, t, glassTop, st.back, st.cw, h, { busy: st.busy, stone: st.punched ? b.tone : undefined });
        if (glassTop < top) {
          const layer = st.bandLayer ?? 'stone', tag = layer === 'stone' ? stone(b) : (st.bandTag ?? PLAIN), bb = st.bandBack ?? 0;
          slab(b, f, s0, s1, glassTop, top, bb, layer, tag);
          if (Math.abs(st.back - bb) > 0.3) {
            b.kit.patch(layer, on(f, s0, glassTop, bb), on(f, s1, glassTop, bb), on(f, s1, glassTop, st.back), on(f, s0, glassTop, st.back), { edge: b.E, want: [0, -1, 0], tag });
            b.kit.patch(layer, on(f, s0, top, st.back), on(f, s1, top, st.back), on(f, s1, top, bb), on(f, s0, top, bb), { edge: b.E, want: [0, 1, 0], tag });
          }
        }
        t = top;
      }
    } else windows(b, f, s0, s1, y0, y1, st.back, st.cw, st.ch, { busy: st.busy, stone: st.punched ? b.tone : undefined });
    if (st.fin) {
      const cols = Math.max(1, Math.round(bay / st.cw)), cw = bay / cols;
      for (let k = st.fin; k < cols; k += st.fin) {
        const m = s0 + k * cw, h = 0.17, q = (sv, o) => { const p = on(f, sv, 0, st.back); return [p[0] + f.N[0] * o, p[2] + f.N[2] * o]; };
        const fl = st.finLayer ?? 'bay', fh = fl === 'stone' ? (st.finWide ?? 0.3) : h, fo = st.finOut ?? st.back * 0.6;
        b.kit.prism(fl, [q(m - fh, 0), q(m - fh, fo), q(m + fh, fo), q(m + fh, 0)], y0, y1, { edge: b.E, tag: fl === 'stone' ? stone(b) : (st.finTag ?? PLAIN) });
      }
    }
  }
}

// A shaft: the facade on each face that can be seen (the back is never seen and casts as well without it), corners
// cut by `chamfer`, and a roof of stone over it. Every corner is cut by ARRIS at least: the moon behind the city
// draws a pale line down the cut toward it, so each shaft stands off the one behind it.
const ARRIS = 0.5;
// A tall shaft may end in an attic (st.attic, how tall): over a string course its top storey is let into the stone
// in smaller windows, two to each bay below, so its head reads apart from its body.
// A tall shaft is broken into sections by belts (st.belts, how many storeys each section is at most): a stone belt
// course round the shaft between each two, and every other section's windows a different size (BELT.wide times as
// wide, its bays fewer), so no face is one even lattice from foot to head.
const BELT = { tall: 1.1, out: 0.25, wide: 1.45, least: 5 };
export function shaft(b, w, d, y0, y1, st) {
  if (st.belts && !st.belted) {
    const floors = (y1 - y0) / Math.max(1, st.ch), n = Math.floor(floors / st.belts);
    if (n >= 1 && floors / (n + 1) >= BELT.least) {
      const h = (y1 - y0 - n * BELT.tall) / (n + 1);
      for (let k = 0; k <= n; k++) {
        const a = y0 + k * (h + BELT.tall), odd = k % 2 === 1;
        const own = odd ? { ...st, cw: st.cw * BELT.wide, bays: Math.max(1, Math.round(st.bays * 0.75)), fin: 0 } : st;
        shaft(b, w, d, a, a + h, { ...own, belted: true, attic: k === n ? st.attic : 0, roof: k === n ? st.roof : false });
        if (k < n) cornice(b, w, d, a + h, BELT.tall, BELT.out, { chamfer: Math.max(st.chamfer ?? 0, 0.5) });
      }
      return;
    }
  }
  const c = Math.max(st.chamfer ?? 0, Math.min(ARRIS, w * 0.05)), all = faces(w, d), attic = st.attic && y1 - y0 > 4 * st.attic ? st.attic : 0, ya = y1 - attic;
  const top = { ...st, punched: true, band: 0, fin: 0, out: 0, cw: st.cw * 0.62, ch: attic - 0.7, bays: Math.max(1, st.bays) * 2, middle: 1, busy: Math.min(1, (st.busy ?? b.busy) + 0.2) };
  all.forEach((s, i) => {
    if (SEEN(s)) {
      const g = { ...s.f, o: on(s.f, c, 0) };
      facade(b, g, s.len - 2 * c, y0, attic ? ya - 0.7 : y1, st);
      if (attic) {
        slab(b, g, 0, s.len - 2 * c, ya - 0.7, ya, -0.35);
        b.kit.patch('stone', on(g, 0, ya, -0.35), on(g, s.len - 2 * c, ya, -0.35), on(g, s.len - 2 * c, ya, 0), on(g, 0, ya, 0), { edge: b.E, want: [0, 1, 0], tag: stone(b) });
        b.kit.patch('stone', on(g, 0, ya - 0.7, 0), on(g, s.len - 2 * c, ya - 0.7, 0), on(g, s.len - 2 * c, ya - 0.7, -0.35), on(g, 0, ya - 0.7, -0.35), { edge: b.E, want: [0, -1, 0], tag: stone(b) });
        facade(b, g, s.len - 2 * c, ya, y1, top);
      }
    }
    if (c > 0) {
      const n = all[(i + 1) % 4], a = on(s.f, s.len - c, 0), e = on(n.f, c, 0);
      b.kit.patch('stone', [a[0], y0, a[2]], [e[0], y0, e[2]], [e[0], y1, e[2]], [a[0], y1, a[2]], { edge: b.E, want: [a[0] + e[0], 0, a[2] + e[2]], tag: stone(b) });
    }
  });
  if (st.roof !== false) b.kit.cap('stone', chamfered(w, d, Math.max(c, 0.001)), y1, true, stone(b));
}

// A block of one layer, its back face left out.
export function block(b, layer, w, d, y0, y1, o = {}) {
  const X = w / 2, Z = d / 2, c = o.chamfer ?? 0;
  b.kit.prism(layer, chamfered(w, d, Math.max(0.001, c)), y0, y1, { top: o.top !== false, bottom: o.bottom, edge: b.E, tag: o.tag ?? (layer === 'stone' ? stone(b) : layer === 'bay' ? PLAIN : undefined), shrink: o.shrink, skip: (p, q) => Math.abs(p[1] + Z) < 1e-6 && Math.abs(q[1] + Z) < 1e-6 && Math.abs(p[0]) < X - 1e-6 + c });
}

// A moulding round a block w by d: a fillet and a crown, standing out, and its top.
export function cornice(b, w, d, y, tall, out, o = {}) {
  const layer = o.layer ?? 'stone', tag = layer === 'stone' ? stone(b) : o.tag;
  b.kit.prism(layer, chamfered(w + out, d + out, (o.chamfer ?? 0.4) + out * 0.3), y, y + tall * 0.45, { bottom: true, edge: b.E, tag });
  b.kit.prism(layer, chamfered(w + 2 * out, d + 2 * out, (o.chamfer ?? 0.4) + out * 0.6), y + tall * 0.45, y + tall, { top: true, bottom: true, edge: b.E, tag });
}

// A parapet: a low wall round the roof's edge, its top a coping, as a block standing just inside the edge.
export function parapet(b, w, d, y, tall, o = {}) {
  block(b, 'stone', w - 0.3, d - 0.3, y, y + tall, { chamfer: o.chamfer });
  cornice(b, w - 0.3, d - 0.3, y + tall, 0.35, 0.15);
}

// A tier of gold with fluted faces: a core set back behind four upright corner pilasters, a plinth and a cornice,
// and between each pair of pilasters a panel of flutes that leans back from the plinth to the cornice, so its
// flanks look up toward the moon while the tier's outline stays square.
export function fluted(b, w, d, y0, y1, k, o = {}) {
  const kit = b.kit, E = b.E, batter = o.batter ?? 9, reed = o.reed ?? 1.3;
  const c = Math.max(0.5, w * 0.045), plinth = 0.3 + 0.05 * k, top = 0.7 + 0.05 * k;
  const X = w / 2, Z = d / 2, lean = (y1 - top - y0 - plinth) * Math.tan(batter * L.D2R), P = Math.max(0.6, w * 0.05);
  const yb = y0 + plinth, yt = y1 - top;
  kit.box('gold', -X + lean, X - lean, yb, yt, -Z + lean, Z - lean, { edge: E });
  const corner = [[X - c - P, Z], [X - c, Z], [X, Z - c], [X, Z - c - P], [X - lean, Z - c - P], [X - lean, Z - lean], [X - c - P, Z - lean]];
  const inner = ([x, z]) => Math.abs(x) <= X - lean + 1e-6 && Math.abs(z) <= Z - lean + 1e-6;
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) kit.prism('gold', corner.map(([x, z]) => [sx * x, sz * z]), yb, yt, { edge: E, skip: (a, q) => inner(a) && inner(q) });
  kit.prism('gold', chamfered(w + 0.5, d + 0.5, c + 0.2), y0, yb, { top: true, edge: E });
  kit.prism('gold', chamfered(w + 0.5, d + 0.5, c + 0.2), yt, y1 - top * 0.45, { bottom: true, edge: E });
  kit.prism('gold', chamfered(w + 1.0, d + 1.0, c + 0.4), y1 - top * 0.45, y1, { top: true, bottom: true, edge: E });
  for (const f of [face([-X, 0, Z], [1, 0, 0], [0, 0, 1]), face([X, 0, Z], [0, 0, -1], [1, 0, 0]), face([X, 0, -Z], [-1, 0, 0], [0, 0, -1]), face([-X, 0, -Z], [0, 0, 1], [-1, 0, 0])]) {
    const span = Math.abs(f.T[0]) > 0.5 ? w : d, from = c + P, to = span - c - P, n = Math.max(3, Math.round((to - from) / reed));
    const o2 = on(f, from, 0), tag = { flute: (to - from) / n, o: o2, T: f.T };
    kit.patch('gold', on(f, from, yb), on(f, to, yb), on(f, to, yt, lean), on(f, from, yt, lean), { nu: b.draft ? 1 : 4, edge: E, want: f.N, tag });
  }
}

// A round thing turned from a profile of [radius, height] points, round n sides (a0 the first side's angle), each
// segment of the profile flat across and smooth round (or flat both ways: o.flat, or smooth both ways: o.smooth, its
// normal at each point of the profile the mean of the two segments' there, so a fine profile shows no rings).
// place(p) and turn(n) move it in the building's frame.
export function revolve(b, layer, profile, n, o = {}) {
  const kit = b.kit, a0 = o.a0 ?? 0, span = o.span ?? Math.PI * 2, place = o.place ?? ((p) => p), turn = o.turn ?? ((v) => v);
  const seg = (i) => { const [r0, h0] = profile[i], [r1, h1] = profile[i + 1], l = Math.hypot(r1 - r0, h1 - h0); return l > 1e-5 ? [(h1 - h0) / l, -(r1 - r0) / l] : null; };
  const at = (i) => { const a = i > 0 ? seg(i - 1) : null, c = i + 1 < profile.length ? seg(i) : null, m = [(a?.[0] ?? 0) + (c?.[0] ?? 0), (a?.[1] ?? 0) + (c?.[1] ?? 0)], l = Math.hypot(...m) || 1; return [m[0] / l, m[1] / l]; };
  for (let i = 0; i + 1 < profile.length; i++) {
    const [r0, h0] = profile[i], [r1, h1] = profile[i + 1], dr = r1 - r0, dh = h1 - h0, l = Math.hypot(dr, dh);
    if (!(l > 1e-5)) continue;
    const nr = dh / l, ny = -dr / l, s0 = o.smooth ? at(i) : [nr, ny], s1 = o.smooth ? at(i + 1) : [nr, ny];
    for (let j = 0; j < n; j++) {
      const t0 = a0 + (span * j) / n, t1 = a0 + (span * (j + 1)) / n;
      const P = (r, h, t) => place([r * Math.sin(t), h, r * Math.cos(t)]);
      const N = (t, q = [nr, ny]) => turn([q[0] * Math.sin(t), q[1], q[0] * Math.cos(t)]);
      const mid = N((t0 + t1) / 2);
      if (o.skip?.(mid)) continue;
      const along = (v) => { const q = [s0[0] + (s1[0] - s0[0]) * v, s0[1] + (s1[1] - s0[1]) * v], k = Math.hypot(...q) || 1; return [q[0] / k, q[1] / k]; };
      kit.patch(layer, P(r0, h0, t0), P(r0, h0, t1), P(r1, h1, t1), P(r1, h1, t0), { nu: 1, nv: o.nv ?? 1, want: mid, tag: o.tag, normal: o.flat ? undefined : (u, v) => N(t0 + (t1 - t0) * u, along(v)) });
    }
  }
}

// A round wall of windows from y0 to y1 on n sides, with stone mullion strips between every so many sides, the far
// half left out.
export function drum(b, r, y0, y1, n, st) {
  const cols = Math.max(1, Math.round((2 * Math.PI * r) / st.cw / n)), rows = Math.max(1, Math.round((y1 - y0) / st.ch));
  for (let j = 0; j < n; j++) {
    const t0 = (2 * Math.PI * j) / n - Math.PI / 2, t1 = (2 * Math.PI * (j + 1)) / n - Math.PI / 2, tm = (t0 + t1) / 2;
    if (Math.cos(tm) < -0.35) continue;
    const a = [r * Math.sin(t0), 0, r * Math.cos(t0)], c = [r * Math.sin(t1), 0, r * Math.cos(t1)], len = Math.hypot(c[0] - a[0], c[2] - a[2]);
    const f = face(a, [c[0] - a[0], 0, c[2] - a[2]], [Math.sin(tm), 0, Math.cos(tm)]);
    if (st.pier && j % st.pier === 0) {
      const p = Math.min(len * 0.3, st.pierWide ?? 0.8);
      slab(b, f, 0, p, y0, y1, -(st.out ?? 0.35));
      reveal(b, f, 0, p, y0, y1, -(st.out ?? 0.35), 0, { sill: false });
      windows(b, f, p, len, y0, y1, 0, (len - p) / Math.max(1, cols - 1), (y1 - y0) / rows, { every: 4 });
    } else windows(b, f, 0, len, y0, y1, 0, len / cols, (y1 - y0) / rows, { every: 4 });
  }
}

// Bands of copper round a round thing, standing out by `out`, `tall` high, at each height in ys.
export function rings(b, r, ys, tall, out, n) {
  for (const y of ys) revolve(b, 'bay', [[r, y], [r + out, y + tall * 0.2], [r + out, y + tall * 0.8], [r, y + tall]], n, { tag: COPPER, skip: (m) => m[2] < -0.4 });
}
