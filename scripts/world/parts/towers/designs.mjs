// The city's designs, each in the stepped tower's language (./forms.mjs) and each working at whatever footprint and
// height the plan gives it. A design is handed the building (b: its Kit, its windows, its own random numbers, its
// stone) and its place in the plan (t: w, d, tall, roof, form), and builds it in its own frame, its foot at 0.
//
//   design(t)(b, t)
// The named ones make picture 9's skyline: the obelisk (TOWERS[0]), the sun disc (TOWERS[2]) and the gold caps
// (TOWERS[3], [4], [5]). The stepped tower (TOWERS[STEP]) is ./step-form.mjs.
import { chamfered } from './kit.mjs';
import { COPPER, PLAIN } from './layers.mjs';
import { block, cornice, drum, faces, fluted, parapet, revolve, rings, shaft, slab, reveal, windows } from './forms.mjs';

const clamp = (v, a, c) => Math.min(c, Math.max(a, v));

// A window's size in units, across and up, for a building: the stepped tower's is 1.2 by 1.6.
const cell = (b) => ({ cw: 1.1 + 0.6 * b.R(), ch: 1.5 + 0.5 * b.R() });

// The base every building stands on: a storey or two of channelled stone, let into by shop fronts, under a course.
function base(b, w, d, h) {
  const lay = b.lay;
  b.lay = 1;
  shaft(b, w, d, -b.sink, h, { corner: 1.4, pier: 1.1, bays: Math.max(1, Math.round(w / 7)), back: 0.6, cw: 2.4, ch: Math.max(2.6, h + b.sink), busy: 0.9, roof: false });
  b.lay = lay;
  cornice(b, w, d, h, 0.9, 0.3);
}

// A mast: a thin bronze rod on a plinth, with a copper collar.
function mast(b, y, tall, wide = 0.5) {
  block(b, 'bay', wide * 3, wide * 3, y, y + 1.2, { tag: PLAIN });
  block(b, 'bay', wide, wide, y + 1.2, y + tall, { tag: PLAIN, shrink: 0.4 });
  block(b, 'bay', wide * 1.8, wide * 1.8, y + tall * 0.3, y + tall * 0.3 + 0.6, { tag: COPPER });
}

// What a roof of each kind carries, on a top w by d at y, at most `room` high.
function crown(b, t, w, d, y, room) {
  const R = b.R;
  if (t.roof === 'gold') {
    // Small fluted gold tiers and a point.
    let ww = w * 0.8, dd = d * 0.8, yy = y;
    const n = room > 14 ? 3 : 2, h = room * 0.55 / n;
    for (let k = 0; k < n; k++) { fluted(b, ww, dd, yy, yy + h, k); yy += h; ww *= 0.78; dd *= 0.78; }
    block(b, 'gold', ww * 0.7, dd * 0.7, yy, y + room, { shrink: 0.03, chamfer: ww * 0.12 });
    return;
  }
  if (t.roof === 'bronze') {
    // A stepped bronze attic, each step under a copper band, and a mast.
    let ww = w * 0.86, dd = d * 0.86, yy = y;
    const n = room > 10 ? 3 : 2, h = Math.min(4.5, room * 0.45 / n);
    for (let k = 0; k < n; k++) {
      block(b, 'bay', ww, dd, yy, yy + h, { tag: PLAIN, chamfer: 0.6 });
      block(b, 'bay', ww + 0.5, dd + 0.5, yy + h - 0.5, yy + h, { tag: COPPER, chamfer: 0.7 });
      yy += h; ww *= 0.74; dd *= 0.74;
    }
    if (room - (yy - y) > 3) mast(b, yy, room - (yy - y), 0.45);
    return;
  }
  // A parapet, a plant room set back on the roof, and sometimes a mast.
  parapet(b, w, d, y, 1.1);
  const pw = w * (0.35 + 0.25 * R()), pd = d * (0.35 + 0.25 * R()), px = (R() - 0.5) * (w - pw) * 0.6;
  b.kit.prism('stone', chamfered(pw, pd, 0.3).map(([x, z]) => [x + px, z]), y, y + Math.min(room * 0.5, 2.6 + 2 * R()), { top: true, edge: b.E, tag: { tone: b.tone, lay: 0 } });
  if (room > 5 && R() < 0.65) mast(b, y, room * (0.7 + 0.3 * R()), 0.35);
}

// The setback tower: a base, a shaft that steps in once or twice under a cornice each time, piers and bays.
function deco(b, t) {
  const { w, d, tall } = t, R = b.R, { cw, ch } = cell(b);
  const hb = clamp(tall * 0.07, 4.5, 11), room = t.roof === 'plain' ? Math.min(8, tall * 0.07) : Math.min(16, tall * 0.13);
  base(b, w, d, hb);
  const k = tall > 100 ? 3 : tall > 50 ? 2 : 1, tops = k === 3 ? [0.58, 0.82, 1] : k === 2 ? [0.7, 1] : [1];
  const span = tall - room - hb - 0.9;
  let y = hb + 0.9, ww = w - 2, dd = d - 2;
  const chamfer = R() < 0.4 ? 1.4 : 0, fin = t.roof === 'bronze' ? 3 : 0, punched = R() < 0.5;
  tops.forEach((f, i) => {
    const y1 = hb + 0.9 + span * f - 1;
    const bays = ww > 26 ? 3 : ww > 15 ? 2 : 1;
    shaft(b, ww, dd, y, y1, { corner: Math.max(1.3, ww * 0.12), pier: 1.0, bays, back: punched ? 0.5 : 1.5, cw, ch, fin: punched ? 0 : fin, chamfer: Math.min(chamfer, ww * 0.1), punched });
    cornice(b, ww, dd, y1, 1, 0.35);
    y = y1 + 1;
    if (i + 1 < tops.length) { ww = Math.max(8, ww * 0.8); dd = Math.max(8, dd * 0.8); }
  });
  crown(b, t, ww, dd, y, tall - y);
}

// A round tower banded in copper, as picture 9's copper ringed towers are: a drum of windows with stone piers, rings
// of copper near its head, and a shallow cap.
function ringed(b, t, x = 0, w = t.w, tall = t.tall) {
  const r = w * 0.46, hb = clamp(tall * 0.06, 3, 8), { cw, ch } = cell(b), n = 20;
  const at = (p) => [p[0] + x, p[1], p[2]];
  const pb = { ...b, kit: { patch: (l, a, c, e, f, o) => b.kit.patch(l, at(a), at(c), at(e), at(f), o), prism: (l, poly, y0, y1, o) => b.kit.prism(l, poly.map(([u, v]) => [u + x, v]), y0, y1, o), cap: (l, poly, y, up, tag) => b.kit.cap(l, poly.map(([u, v]) => [u + x, v]), y, up, tag), box: () => {} } };
  revolve(pb, 'stone', [[r + 0.8, -b.sink], [r + 0.8, hb], [r + 1.2, hb + 0.3], [r + 1.2, hb + 1], [r, hb + 1]], n, { tag: { tone: b.tone, lay: 1 }, skip: (m) => m[2] < -0.4 });
  const top = tall - 5;
  drum(pb, r, hb + 1, top, n, { cw, ch, pier: 2, out: 0.4 });
  const band = Math.min(14, (top - hb) * 0.3), step = band / 4;
  rings(pb, r + 0.4, [0, 1, 2, 3].map((k) => top - band + k * step), step * 0.55, 0.7, n);
  revolve(pb, 'bay', [[r + 1.1, top], [r + 1.1, top + 0.8], [r * 0.7, top + 2.6], [r * 0.25, top + 4], [0.01, top + 4.4]], n, { tag: t.roof === 'plain' ? PLAIN : COPPER, skip: (m) => m[2] < -0.6 && m[1] < 0.5 });
  if (tall - top > 4.4 && b.R() < 0.6) block(pb, 'bay', 0.5, 0.5, top + 4.4, tall, { tag: PLAIN, shrink: 0.3 });
}

// The slab: a broad block, either a grid of narrow bays between slender pilasters, or ribbons of windows between
// bands of stone, under a parapet.
function slabTower(b, t) {
  const { w, d, tall } = t, R = b.R, { cw, ch } = cell(b);
  const hb = clamp(tall * 0.12, 3.5, 8), room = Math.min(7, 2 + tall * 0.06);
  base(b, w, d, hb);
  const y0 = hb + 0.9, y1 = tall - room;
  if (R() < 0.5) shaft(b, w - 1.2, d - 1.2, y0, y1, { corner: 1.6, pier: 0.55, bays: Math.max(2, Math.round(w / 4.2)), back: 0.5, cw, ch, out: 0.25, punched: R() < 0.6 });
  else shaft(b, w - 1.2, d - 1.2, y0, y1, { corner: 2.0, pier: 1.2, bays: w > 30 ? 2 : 1, back: 0.9, cw, ch, band: 1 + Math.floor(R() * 2), bandTall: 0.6, bandBack: -0.2, punched: R() < 0.3 });
  if (t.roof === 'bronze') {
    block(b, 'bay', w - 0.6, d - 0.6, y1, y1 + 1.6, { tag: COPPER, chamfer: 0.4 });
    crown(b, { ...t, roof: 'plain' }, w - 1.2, d - 1.2, y1 + 1.6, tall - y1 - 1.6);
  } else crown(b, t, w - 1.2, d - 1.2, y1, tall - y1);
}

// The fin tower: deep stone fins stand out of every face, close set, and rise past the roof in steps.
function finTower(b, t) {
  const { w, d, tall } = t, R = b.R, { cw, ch } = cell(b);
  const hb = clamp(tall * 0.08, 4, 9);
  base(b, w, d, hb);
  const y0 = hb + 0.9, y1 = tall - Math.min(9, tall * 0.08), ww = w - 1.6, dd = d - 1.6, out = 1.1 + 0.6 * R();
  const bays = Math.max(3, Math.round(ww / (2 * cw + 0.7)));
  shaft(b, ww, dd, y0, y1, { corner: 1.2, pier: 0.7, bays, back: 0.5, cw, ch, out });
  cornice(b, ww, dd, y1, 0.6, 0.1);
  // The fins of the front and the sides go on up past the roof, the middle ones highest.
  for (const s of faces(ww, dd)) {
    if (s.side === 'back') continue;
    const bay = (s.len - 2.4 - (bays - 1) * 0.7) / bays;
    for (let i = 1; i < bays; i++) {
      const s0 = 1.2 + i * (bay + 0.7) - 0.7, k = 1 - Math.abs(i / bays - 0.5) * 2, up = (tall - y1) * (0.35 + 0.65 * k);
      slab(b, s.f, s0, s0 + 0.7, y1 + 0.6, y1 + up, -out);
      reveal(b, s.f, s0, s0 + 0.7, y1 + 0.6, y1 + up, -out, 0.4, { sill: false });
    }
  }
  if (t.roof === 'bronze') block(b, 'bay', ww - 2, dd - 2, y1 + 0.6, y1 + 2.2, { tag: COPPER, chamfer: 0.5 });
  else block(b, 'stone', ww - 2, dd - 2, y1 + 0.6, y1 + 2, { chamfer: 0.3 });
}

// Twin shafts on one podium, joined by bridges of glass. Bronze roofed twins are round and ringed in copper.
function twin(b, t) {
  const { w, d, tall } = t, R = b.R, { cw, ch } = cell(b);
  const hp = clamp(tall * 0.14, 5, 12);
  base(b, w, d, hp);
  const sw = w * 0.4, gap = w - 2 * sw - 1, xs = [-(sw + gap) / 2, (sw + gap) / 2], low = 0.86 + 0.08 * R();
  xs.forEach((x, i) => {
    const h = i === 0 ? tall : tall * low;
    if (t.roof === 'bronze') { ringed(b, t, x, sw * 0.98, h); return; }
    const kit = b.kit, at = (p) => [p[0] + x, p[1], p[2]];
    const sb = { ...b, kit: { patch: (l, a, c, e, f, o) => kit.patch(l, at(a), at(c), at(e), at(f), o), prism: (l, poly, y0, y1, o) => kit.prism(l, poly.map(([u, v]) => [u + x, v]), y0, y1, o), cap: (l, poly, y, up, tag) => kit.cap(l, poly.map(([u, v]) => [u + x, v]), y, up, tag), box: (l, x0, x1, y0, y1, z0, z1, o) => kit.box(l, x0 + x, x1 + x, y0, y1, z0, z1, o) } };
    const y1 = h - Math.min(6, h * 0.07);
    shaft(sb, sw, d * 0.82, hp + 0.9, y1, { corner: 1.2, pier: 0.8, bays: sw > 16 ? 2 : 1, back: 1.2, cw, ch, chamfer: 0.9 });
    cornice(sb, sw, d * 0.82, y1, 0.8, 0.3);
    crown(sb, t, sw, d * 0.82, y1 + 0.8, h - y1 - 0.8);
  });
  // The bridges, each a box of windows between the shafts, with a stone floor and roof.
  for (const f of [0.45, 0.72]) {
    const y = hp + (tall * low - hp) * f, hh = Math.max(2.4, ch * 2), z = d * 0.12, half = gap / 2 + 0.6;
    block(b, 'stone', 2 * half, d * 0.3, y - 0.6, y, { chamfer: 0.001 });
    const front = faces(2 * half, d * 0.3)[0];
    windows(b, { ...front.f, o: [front.f.o[0], 0, front.f.o[2] + z] }, 0, 2 * half, y, y + hh, 0, cw, hh / 2, { every: 2 });
    b.kit.cap('stone', chamfered(2 * half, d * 0.3, 0.001).map(([u, v]) => [u, v + z]), y + hh, true, { tone: b.tone, lay: 0 });
  }
}

// The hall: a low building with a colonnade before it, an entablature and an attic, under a flat roof or a low
// roof of bronze.
function hall(b, t) {
  const { w, d, tall } = t, R = b.R;
  const st = Math.min(2.2, tall * 0.08), top = tall - (t.roof === 'bronze' ? Math.min(7, tall * 0.25) : 1.4);
  const colTop = st + (top - st) * 0.72, ent = (top - st) * 0.12;
  // The steps.
  block(b, 'stone', w + 1.6, d + 1.6, -b.sink, st * 0.5, { chamfer: 0.001 });
  block(b, 'stone', w + 0.6, d + 0.6, st * 0.5, st, { chamfer: 0.001 });
  // The body behind the columns, its windows tall.
  const inset = 3.2;
  shaft(b, w - 1, d - inset, st, colTop, { punched: true, corner: 1.4, pier: 1.2, bays: Math.max(2, Math.round(w / 5)), back: 0.8, cw: 2.2, ch: (colTop - st) / Math.max(1, Math.round((colTop - st) / 4.5)), busy: 0.75, roof: false });
  // The colonnade, a column every few units across the front.
  const n = Math.max(4, Math.round(w / 3.4)), r = clamp(w / n * 0.18, 0.45, 0.8), front = d / 2 - 1.1;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 1.2 + ((w - 2.4) * i) / (n - 1);
    revolve(b, 'stone', [[r * 1.5, st], [r * 1.5, st + 0.5], [r * 1.12, st + 0.8], [r, st + 1], [r * 0.86, colTop - 1], [r * 1.25, colTop - 0.5], [r * 1.5, colTop - 0.35], [r * 1.5, colTop]], 8, { tag: { tone: b.tone, lay: 0 }, place: (p) => [p[0] + x, p[1], p[2] + front], skip: (m) => m[2] < -0.5 });
  }
  // The entablature, standing on the columns, and the attic over it.
  block(b, 'stone', w, d, colTop, colTop + ent, { chamfer: 0.001 });
  cornice(b, w, d, colTop + ent, 0.9, 0.35);
  const aw = w - 1.4, ad = d - 1.4;
  shaft(b, aw, ad, colTop + ent + 0.9, top, { punched: true, corner: 2, pier: 1.6, bays: Math.max(2, Math.round(aw / 6)), back: 0.4, cw: 1.8, ch: Math.max(1.4, top - colTop - ent - 0.9), busy: 0.5, roof: t.roof !== 'bronze' });
  if (t.roof === 'bronze') {
    b.kit.prism('bay', chamfered(aw + 0.4, ad + 0.4, 0.3), top, tall, { top: true, edge: b.E, tag: PLAIN, shrink: [0.55, 0.25] });
    b.kit.prism('bay', chamfered(aw * 0.55 + 0.3, ad * 0.25 + 0.3, 0.2), tall - 0.01, tall + 0.4, { top: true, edge: b.E, tag: COPPER });
  } else if (R() < 0.5) parapet(b, aw, ad, top, 0.9);
}

// The domed hall: a square body, a drum of windows on it, a ribbed dome and a lantern. A tall one is a tower that
// flares to a wide head, as the one beside the stepped tower in picture 9 does.
function dome(b, t) {
  const { w, d, tall } = t, R = b.R, { cw, ch } = cell(b), n = 24;
  const metal = t.roof === 'bronze' ? PLAIN : null;
  if (tall > 60) {
    const r = w * 0.2, rh = w * 0.5, y0 = tall * 0.66, y1 = y0 + tall * 0.08, y2 = y1 + tall * 0.06;
    revolve(b, 'stone', [[r + 3, -b.sink], [r + 3, 4], [r + 1.6, 5], [r, 6], [r, y0 - 6], [rh * 0.85, y0], [rh, y0 + 0.6]], n, { tag: { tone: b.tone, lay: 0 }, skip: (m) => m[2] < -0.5 });
    drum(b, r * 0.94, 6.5, y0 - 7, n, { cw, ch, pier: 3, out: 0.35 });
    drum(b, rh, y0 + 0.6, y1, n * 2, { cw: cw * 0.8, ch: (y1 - y0 - 0.6) / 3, pier: 4, out: 0.3 });
    revolve(b, 'bay', [[rh + 0.6, y1], [rh + 0.6, y1 + 0.7], [rh * 0.9, y1 + 1.2], [rh * 0.55, y2], [rh * 0.2, y2 + 1.4], [0.01, y2 + 1.7]], n, { tag: metal ?? COPPER, skip: (m) => m[2] < -0.6 && m[1] < 0.4 });
    block(b, 'bay', 0.6, 0.6, y2 + 1.7, tall, { tag: PLAIN, shrink: 0.2 });
    return;
  }
  const bodyH = tall * 0.42, rr = Math.min(w, d) * 0.36, drH = tall * 0.16, domeH = tall - bodyH - drH - 3.2;
  shaft(b, w, d, -b.sink, bodyH, { punched: true, corner: 1.6, pier: 1.2, bays: Math.max(2, Math.round(w / 6)), back: 0.7, cw: 2, ch: bodyH / Math.max(1, Math.round(bodyH / 4)), busy: 0.7 });
  cornice(b, w, d, bodyH, 0.8, 0.3);
  drum(b, rr, bodyH + 0.8, bodyH + 0.8 + drH, n, { cw: 1.6, ch: drH, pier: 2, out: 0.35 });
  const y = bodyH + 0.8 + drH, prof = [];
  for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI / 2; prof.push([(rr + 0.5) * Math.cos(a), y + 0.5 + domeH * Math.sin(a)]); }
  prof.unshift([rr + 0.9, y], [rr + 0.9, y + 0.5]);
  revolve(b, metal ? 'bay' : 'stone', prof, 16, { tag: metal ?? { tone: b.tone * 0.5, lay: 0 }, skip: (m) => m[2] < -0.6 && m[1] < 0.3 });
  const lw = rr * 0.32;
  block(b, 'stone', lw, lw, y + 0.5 + domeH - 0.4, y + 0.5 + domeH + 1.6, { chamfer: lw * 0.3 });
  block(b, 'bay', lw * 1.2, lw * 1.2, y + 0.5 + domeH + 1.6, tall, { tag: metal ? COPPER : PLAIN, shrink: 0.05, chamfer: lw * 0.35 });
  void R;
}

// A tower with cut corners, stepping in, under a pyramid of bronze or a point of gold.
function point(b, t) {
  const { w, d, tall } = t, R = b.R, { cw, ch } = cell(b), gold = t.roof === 'gold';
  const hb = clamp(tall * 0.07, 4.5, 11), cap = gold ? tall * 0.24 : tall * 0.16;
  base(b, w, d, hb);
  const tops = [0.62, 0.86, 1], span = tall - cap - hb - 0.9;
  let y = hb + 0.9, ww = w - 2, dd = d - 2;
  tops.forEach((f, i) => {
    const y1 = hb + 0.9 + span * f - 1;
    shaft(b, ww, dd, y, y1, { corner: Math.max(1.2, ww * 0.12), pier: 0.9, bays: ww > 20 ? 2 : 1, back: 1.3, cw, ch, chamfer: ww * 0.14, fin: gold ? 0 : 4 });
    cornice(b, ww, dd, y1, 1, 0.3, { chamfer: ww * 0.14 });
    y = y1 + 1;
    if (i < 2) { ww *= 0.82; dd *= 0.82; }
  });
  if (gold) {
    // A fluted lantern of gold, a flame of eight faces that swells and draws in to a point, a ball and a needle:
    // picture 9's gold caps.
    fluted(b, ww * 0.78, dd * 0.78, y, y + cap * 0.2, 2);
    const yy = y + cap * 0.2, pw = ww * 0.36, top = tall - cap * 0.16, H = top - yy, n = 14, prof = [[pw * 1.25, yy], [pw * 1.25, yy + 0.6], [pw, yy + 0.8]];
    for (let i = 1; i <= n; i++) { const u = i / n; prof.push([Math.max(0.05, pw * (1 + 0.35 * Math.sin(Math.PI * Math.min(1, u * 1.6))) * (1 - u) ** 1.25), yy + 0.8 + (H - 0.8) * u]); }
    revolve(b, 'gold', prof, 8, { a0: Math.PI / 8, flat: true, nv: 1 });
    revolve(b, 'gold', Array.from({ length: 7 }, (_, i) => { const a = -Math.PI / 2 + (Math.PI * i) / 6; return [Math.max(0.01, 0.55 * Math.cos(a)), top + 0.55 + 0.55 * Math.sin(a)]; }), 10, { skip: (m) => m[2] < -0.6 });
    block(b, 'gold', 0.3, 0.3, top + 1.1, tall, { shrink: 0.1 });
  } else {
    b.kit.prism('bay', chamfered(ww + 0.4, dd + 0.4, ww * 0.16), y, y + cap * 0.55, { top: false, edge: b.E, tag: PLAIN, shrink: 0.18 });
    mast(b, y + cap * 0.55 - 0.5, cap * 0.45 + 0.5, 0.4);
  }
  void R;
}

// The obelisk tower: a slender dark shaft of windows on a base, and on it a tall point of gold, square with cut
// corners, its four faces fluted, the flutes narrowing with them, on a stepped plinth, under a band and a pyramidion.
function obelisk(b, t) {
  const { w, d, tall } = t, { cw, ch } = cell(b), gold = tall * 0.35, hb = 10;
  base(b, w, d, hb);
  const y1 = tall - gold - 3, mid = hb + 0.9 + (y1 - hb) * 0.55;
  shaft(b, w - 2, d - 2, hb + 0.9, mid, { corner: 2.2, pier: 1, bays: 2, back: 1.5, cw, ch, chamfer: 1.4 });
  cornice(b, w - 2, d - 2, mid, 1, 0.35, { chamfer: 1.4 });
  shaft(b, w - 6, d - 6, mid + 1, y1, { corner: 1.8, pier: 0.9, bays: 2, back: 1.4, cw, ch, chamfer: 1.2 });
  cornice(b, w - 6, d - 6, y1, 1.2, 0.4, { chamfer: 1.2 });
  block(b, 'bay', w - 7, d - 7, y1 + 1.2, y1 + 2.4, { tag: COPPER, chamfer: 1 });
  const g = w * 0.56, k = OBELISK.taper, yb = y1 + 4.2, yt = tall - g * OBELISK.cap;
  b.kit.prism('gold', chamfered(g + 2.4, g + 2.4, 1.6), y1 + 2.4, y1 + 3.2, { top: true, edge: b.E });
  b.kit.prism('gold', chamfered(g + 1.2, g + 1.2, 1.2), y1 + 3.2, yb, { top: true, edge: b.E });
  b.kit.prism('gold', chamfered(g, g, g * 0.14), yb, yt, { top: false, edge: b.E, nv: 12, shrink: k, tagOf: (pa, pb) => fluting(pa, pb, g * 0.5, k, yb, yt, OBELISK.flutes) });
  const gt = g * k;
  b.kit.prism('gold', chamfered(gt + 0.7, gt + 0.7, gt * 0.18), yt, yt + 0.7, { top: true, bottom: true, edge: b.E });
  b.kit.prism('gold', chamfered(gt, gt, gt * 0.14), yt + 0.7, tall, { top: false, edge: b.E, shrink: 0.02 });
}
// The obelisk's point: how much narrower it is at its head than its foot, how tall its pyramidion is against its
// width, and how many flutes each face carries.
const OBELISK = { taper: 0.62, cap: 0.9, flutes: 5 };
// The tag that flutes a face of a prism that narrows, if the face is one of its broad ones.
function fluting(pa, pb, least, k, y0, y1, n) {
  const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
  if (L < least) return undefined;
  return { flute: n, taper: [L, L * k, y0, y1], o: [(pa[0] + pb[0]) / 2, 0, (pa[1] + pb[1]) / 2], T: [(pb[0] - pa[0]) / L, 0, (pb[1] - pa[1]) / L] };
}

// The sun disc tower: a shaft that steps in, a collar and a neck, and on it a great disc of gold carved as the
// site's Sun stones are: a rounded rim, a dished field, a ring of sixteen plates, rays at the quarters and between
// them, raised rings and a boss. Every carved thing is sloped or rounded, so it takes the light on one side and
// not the other.
function disc(b, t) {
  const { w, d, tall } = t, { cw, ch } = cell(b), r = w * 0.44, hb = 9;
  base(b, w, d, hb);
  const low = tall * 0.3, y1 = tall - 2 * r - 15;
  shaft(b, w - 2, d - 2, hb + 0.9, low, { corner: 2, pier: 1, bays: 2, back: 1.5, cw, ch });
  cornice(b, w - 2, d - 2, low, 1, 0.35);
  shaft(b, w * 0.7, d * 0.7, low + 1, y1, { corner: 2, pier: 1, bays: 1, back: 1.5, cw, ch, chamfer: 1.2 });
  cornice(b, w * 0.7, d * 0.7, y1, 1.2, 0.4, { chamfer: 1.2 });
  block(b, 'stone', w * 0.5, d * 0.5, y1 + 1.2, y1 + 5, { chamfer: 1 });
  block(b, 'bay', w * 0.54, d * 0.54, y1 + 5, y1 + 6, { tag: COPPER, chamfer: 1.1 });
  revolve(b, 'gold', [[w * 0.16, y1 + 6], [w * 0.1, y1 + 9], [w * 0.08, tall - 2 * r - 1], [w * 0.14, tall - 2 * r + 1]], 12, { skip: (m) => m[2] < -0.6 });
  // The disc stands upright and faces the visitor: turned from a profile about its own axis, which is z.
  const cy = tall - r, D = SUN.depth, place = (p) => [p[0], cy + p[2], p[1]], turn = (v) => [v[0], v[2], v[1]];
  // One profile from the rim's outer side in to the boss, so no gap opens between one ring and the next: a half
  // round rim, the field falling a little toward the plates' ring, a rounded ring, the field rising to a second
  // rounded ring, and the boss.
  const arc = (rc, q, h, a0, a1, segs) => Array.from({ length: segs + 1 }, (_, i) => { const t = a0 + ((a1 - a0) * i) / segs; return [rc + q * Math.cos(t), h + q * Math.sin(t)]; });
  const R = r, q1 = 0.45, q2 = 0.55, c1 = R * 0.66 - q1, c2 = R * 0.36 - q2, rb = R * 0.2;
  const prof = [[R, -D], ...arc(R - 1.15, 1.15, 0.3 * D, 0, Math.PI, 8), [c1 + q1, 0.12 * D], ...arc(c1, q1, 0.12 * D, 0, Math.PI, 6), [c2 + q2, 0.32 * D], ...arc(c2, q2, 0.32 * D, 0, Math.PI, 6), [rb, 0.16 * D], ...arc(0, rb, 0.16 * D, 0, Math.PI / 2, 8).map(([x, y]) => [x, 0.16 * D + (y - 0.16 * D) * (1.9 * D / rb)])];
  prof[prof.length - 1][0] = 0.01;
  revolve(b, 'gold', prof, 64, { place, turn, skip: (m) => m[2] < -0.9 });
  for (let k = 0; k < 16; k++) plate(b, cy, r * 0.665, r - 2.5, ((k + 0.08) / 16) * Math.PI * 2, ((k + 0.92) / 16) * Math.PI * 2, 0.15 * D, 0.75 * D, 0.5);
  for (let k = 0; k < 8; k++) ray(b, cy, r * 0.35, k % 2 ? r * 0.8 : r - 0.4, (k / 8) * Math.PI * 2, k % 2 ? 0.09 : 0.14, 0.2 * D, k % 2 ? 1.0 * D : 1.3 * D);
}
// How deep the sun disc's carving is, in units.
const SUN = { depth: 1.5 };

// A place on the disc: so far out from its middle and so far round from straight up, clockwise as seen, and so far
// out of its face.
const onDisc = (cy, r, a, h) => [r * Math.sin(a), cy + r * Math.cos(a), h];
// A plate: a raised block between two radii and two angles, its sides sloping in to a smaller flat top.
function plate(b, cy, r0, r1, a0, a1, h0, h1, m) {
  const P = (r, a, h) => onDisc(cy, r, a, h), am = (a0 + a1) / 2, ia0 = a0 + m / r0, ia1 = a1 - m / r0;
  const lo = [P(r0, a0, h0), P(r1, a0, h0), P(r1, a1, h0), P(r0, a1, h0)], hi = [P(r0 + m, ia0, h1), P(r1 - m, ia0, h1), P(r1 - m, ia1, h1), P(r0 + m, ia1, h1)];
  const k = b.kit, outs = [[-Math.cos(a0), Math.sin(a0), 0.6], [Math.sin(am), Math.cos(am), 0.6], [Math.cos(a1), -Math.sin(a1), 0.6], [-Math.sin(am), -Math.cos(am), 0.6]];
  k.patch('gold', hi[0], hi[3], hi[2], hi[1], { want: [0, 0, 1] });
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; k.patch('gold', lo[i], lo[j], hi[j], hi[i], { want: outs[i] }); }
}
// A ray: a ridge running out from r0 to a point at r1, its two sides sloping down from the ridge, so one side of it
// takes the light and the other does not.
function ray(b, cy, r0, r1, a, half, h0, h1) {
  const P = (r, t, h) => onDisc(cy, r, t, h), k = b.kit, tip = P(r1, a, h0 + 0.1);
  const L0 = P(r0, a - half, h0), R0 = P(r0, a + half, h0), top = P(r0, a, h1);
  k.patch('gold', L0, tip, tip, top, { want: [-Math.cos(a), Math.sin(a), 0.7] });
  k.patch('gold', top, tip, tip, R0, { want: [Math.cos(a), -Math.sin(a), 0.7] });
  k.patch('gold', R0, L0, top, top, { want: [-Math.sin(a), -Math.cos(a), 0.4] });
}

// Which design a building is built as, by its form, its roof and its own number.
export function design(t) {
  switch (t.form) {
    case 'obelisk': return obelisk;
    case 'disc': return disc;
    case 'point': return point;
    case 'deco': return t.roof === 'bronze' && t.seed > 0.55 && t.w < 34 ? (b, tt) => ringed(b, tt) : deco;
    case 'slab': return slabTower;
    case 'fin': return finTower;
    case 'twin': return twin;
    case 'hall': return hall;
    case 'dome': return dome;
    default: return null;
  }
}
