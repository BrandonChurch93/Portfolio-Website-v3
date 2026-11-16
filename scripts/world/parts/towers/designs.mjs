// The city's designs, each in the stepped tower's language (./forms.mjs) and each working at whatever footprint and
// height the plan gives it. A design is handed the building (b: its Kit, its windows, its own random numbers, its
// stone) and its place in the plan (t: w, d, tall, roof, form), and builds it in its own frame, its foot at 0.
//
//   design(t)(b, t)
// The named ones make picture 9's skyline: the obelisk (TOWERS[0]), the sun disc (TOWERS[2]) and the gold caps
// (TOWERS[3], [4], [5]). The stepped tower (TOWERS[STEP]) is ./step-form.mjs.
import { chamfered, face } from './kit.mjs';
import { COPPER, PLAIN, POLISHED } from './layers.mjs';
import { block, cornice, drum, faces, fluted, parapet, revolve, rings, shaft, slab, reveal, windows } from './forms.mjs';
import { OBELISK, SEAT, SUN, discAt, obeliskPoint } from '../../../../src/pieces/world/parts/towers/marks.ts';

const clamp = (v, a, c) => Math.min(c, Math.max(a, v));

// A window's size in units, across and up, for a building: the stepped tower's is 1.2 by 1.6.
const cell = (b) => ({ cw: 1.1 + 0.6 * b.R(), ch: 1.5 + 0.5 * b.R() });

// How a building's walls are cut, so no two read alike: each a way of setting windows into a face, worked out at
// the size of the face, with its own window, pier and spandrel. Picked by the building's own numbers.
//   strip: proud stone piers running the full height, narrow bays of tall windows, a bronze spandrel at each floor
//   ribbon: bands of stone across each floor standing out of the glass, wide windows, few piers
//   punched: windows let into the stone with deep reveals, in pairs, a string course every few floors
//   mullion: a bronze curtain behind stone mullions every second window, broad corner piers
//   paired: bays of two windows between slender piers, a copper spandrel every floor
//   curtain: one broad bay of coated glass between slim stone corners, its panes on slender mullions, which mirrors
//            the night; dealt apart from the rest, to a share of the shafts wide enough (OWN.glass) and never two
//            side by side
const LOOKS = ['strip', 'ribbon', 'punched', 'mullion', 'paired'];
// And each building's own: often a wider middle bay (middle: how much wider, and how likely), often an attic storey
// of smaller windows over a string course (attic: how likely, how tall at least and how much more).
// And mostly belts (belts: how likely, and the most storeys of a section, from belts[1] to belts[1] + belts[2]).
// And how likely a shaft at least glass[1] units wide is a curtain wall of glass.
const OWN = { middle: [0.6, 0.45, 0.7], attic: [0.6, 2.6, 1.8], belts: [0.75, 8, 8], glass: [0.16, 12] };
function look(b, w, asked) {
  const glass = asked === undefined && w >= OWN.glass[1] && b.R() < OWN.glass[0] && !b.avoid?.look?.has('curtain');
  const kind = asked ?? (glass ? apart(b, 'look', ['curtain'], 0) : apart(b, 'look', LOOKS, Math.floor(b.R() * LOOKS.length)));
  const R = b.R, st = cut(b, w, kind);
  return { ...st, middle: R() < OWN.middle[0] ? 1 + OWN.middle[1] + OWN.middle[2] * R() : 1, attic: R() < OWN.attic[0] ? OWN.attic[1] + OWN.attic[2] * R() : 0, belts: R() < OWN.belts[0] ? OWN.belts[1] + Math.floor(R() * OWN.belts[2]) : 0 };
}
function cut(b, w, kind) {
  const R = b.R;
  if (kind === 'strip') {
    const cw = 0.9 + 0.3 * R(), ch = 2.1 + 0.5 * R(), per = 2 + Math.floor(R() * 2), pier = 1.1 + 0.6 * R();
    return { kind, cw, ch, pier, corner: 1.8 + R(), out: 0.55 + 0.4 * R(), bays: Math.max(1, Math.round((w - 3) / (per * cw + pier))), back: 1.0, band: 1, bandTall: 0.55 + 0.2 * R(), bandBack: 0.75, bandLayer: 'bay' };
  }
  if (kind === 'ribbon') {
    const ch = 2.0 + 0.4 * R();
    return { kind, cw: 2.2 + 0.6 * R(), ch, pier: 1.4, corner: 2.4 + R(), bays: w > 30 ? 2 : 1, back: 0.6, band: 1, bandTall: 0.7 + 0.25 * R(), bandBack: -0.25 - 0.2 * R() };
  }
  if (kind === 'punched') {
    const cw = 1.2 + 0.3 * R();
    return { kind, cw, ch: 1.9 + 0.4 * R(), pier: 1.4 + 0.5 * R(), corner: 2.2, bays: Math.max(1, Math.round((w - 4) / (2 * cw + 1.6))), back: 0.75, punched: true, band: 3 + Math.floor(R() * 3), bandTall: 0.5, bandBack: -0.3 };
  }
  if (kind === 'curtain') {
    return { kind, cw: 1.3 + 0.4 * R(), ch: 2.3, pier: 0, corner: 1.0 + 0.5 * R(), bays: 1, back: 0.35, curtain: true };
  }
  if (kind === 'mullion') {
    return { kind, cw: 1.0 + 0.3 * R(), ch: 1.6 + 0.4 * R(), pier: 1.2, corner: 2.6 + R(), bays: w > 32 ? 2 : 1, back: 1.1, fin: 2, finLayer: 'stone', finWide: 0.22, finOut: 0.9 };
  }
  const cw = 1.1 + 0.3 * R(), pier = 0.9 + 0.4 * R();
  return { kind, cw, ch: 1.9 + 0.4 * R(), pier, corner: 1.6 + 0.6 * R(), bays: Math.max(1, Math.round((w - 3) / (2 * cw + pier))), back: 0.9, band: 1, bandTall: 0.45, bandBack: 0.55, bandLayer: 'bay', bandTag: COPPER, out: 0.3 };
}
// One of `kinds`, from the building's own pick, passing over any its near neighbours already have (b.avoid, filled
// by ./city.mjs), so no two side by side are alike; what it took is kept (b.chosen) for the neighbours after it.
function apart(b, what, kinds, pick) {
  const not = b.avoid?.[what] ?? new Set();
  let k = pick;
  for (let n = 0; n < kinds.length && not.has(kinds[k % kinds.length]); n++) k++;
  const kind = kinds[k % kinds.length];
  if (b.chosen) (b.chosen[what] ??= new Set()).add(kind);
  return kind;
}

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

// What a roof of each kind carries, on a top w by d at y, at most `room` high. A plain roof is crowned one of five
// ways (t.top, or the building's own numbers): stepped stone tiers, an open loggia, corner turrets, a bronze
// mansard with dormers, or a parapet and a plant room.
function crown(b, t, w, d, y, room) {
  const R = b.R, stone = { tone: b.tone, vary: b.vary, lay: 0 };
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
  const kinds = ['steps', 'loggia', 'turrets', 'mansard', 'plant'], kind = t.top ?? apart(b, 'crown', kinds, Math.floor(R() * 5));
  if (kind === 'needle') { needle(b, w, d, y, room); return; }
  if (kind === 'steps' && room > 6) {
    // Stepped stone tiers, each smaller, each under its own cornice and let into by tall windows, under a small
    // pyramid and sometimes a finial.
    let ww = w * 0.9, dd = d * 0.9, yy = y;
    const n = room > 18 ? 4 : room > 10 ? 3 : 2, h = (room * 0.72) / n;
    for (let k = 0; k < n; k++) {
      shaft(b, ww, dd, yy, yy + h - 0.5, { corner: Math.max(0.9, ww * 0.16), pier: 0.8, bays: ww > 14 ? 2 : 1, back: 0.6, cw: 1.0, ch: h - 0.5, punched: true, busy: 0.6 });
      cornice(b, ww, dd, yy + h - 0.5, 0.5, 0.25);
      yy += h; ww *= 0.76; dd *= 0.76;
    }
    const cap = Math.min(y + room, yy + ww * 0.7);
    b.kit.prism('stone', chamfered(ww, dd, ww * 0.12), yy, cap, { edge: b.E, tag: stone, shrink: 0.08 });
    if (y + room - cap > 1.5) mast(b, cap - 0.3, y + room - cap + 0.3, 0.3);
    return;
  }
  if (kind === 'loggia' && room > 5) {
    // An open top storey: piers round its edge under an entablature, a lit room within, and a low copper roof.
    const h = Math.min(room * 0.55, 7), pw = 0.7;
    block(b, 'stone', w - 0.2, d - 0.2, y, y + 0.5, { chamfer: 0.3 });
    shaft(b, w - 3.2, d - 3.2, y + 0.5, y + h, { corner: 0.4, pier: 0.4, bays: Math.max(1, Math.round(w / 6)), back: 0.3, cw: 1.6, ch: h - 0.5, busy: 0.9, roof: false });
    const n = Math.max(3, Math.round(w / 3.2)), m = Math.max(3, Math.round(d / 3.2));
    const rows = [[w, n, (u) => [u, d / 2 - 0.6]], [d, m, (u) => [w / 2 - 0.6, u]], [d, m, (u) => [-(w / 2 - 0.6), u]]];
    for (const [len, cnt, at] of rows) for (let k = 0; k < cnt; k++) {
      const [px, pz] = at(-len / 2 + 0.6 + ((len - 1.2) * k) / (cnt - 1));
      b.kit.prism('stone', chamfered(pw, pw, 0.1).map(([u, v]) => [u + px, v + pz]), y + 0.5, y + h, { edge: b.E, tag: stone });
    }
    cornice(b, w - 0.2, d - 0.2, y + h, 0.9, 0.3);
    b.kit.prism('bay', chamfered(w - 0.4, d - 0.4, 0.4), y + h + 0.9, Math.min(y + room, y + h + 0.9 + w * 0.22), { top: true, edge: b.E, tag: COPPER, shrink: [0.3, 0.12] });
    return;
  }
  if (kind === 'turrets' && room > 4) {
    // A parapet with a turret at each corner, each a chamfered shaft under a stone cap and a copper point, and a
    // lit lantern between them.
    parapet(b, w, d, y, 1.3);
    const tw = Math.max(2, w * 0.13), th = Math.min(room * 0.6, 3.5 + tw * 1.2);
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const ux = sx * (w / 2 - tw / 2), uz = sz * (d / 2 - tw / 2), sq = (q) => chamfered(q, q, q * 0.25).map(([u, v]) => [u + ux, v + uz]);
      b.kit.prism('stone', sq(tw), y, y + th, { edge: b.E, tag: stone });
      b.kit.prism('stone', sq(tw + 0.5), y + th, y + th + 0.4, { top: true, bottom: true, edge: b.E, tag: stone });
      b.kit.prism('bay', sq(tw * 0.7), y + th + 0.4, y + th + 0.4 + tw * 0.9, { edge: b.E, tag: COPPER, shrink: 0.05 });
    }
    const lh = Math.min(room * 0.45, 4.5);
    shaft(b, w * 0.34, d * 0.34, y, y + lh, { corner: 0.6, pier: 0.5, bays: 1, back: 0.3, cw: 0.9, ch: lh, busy: 0.7, punched: true });
    return;
  }
  if (kind === 'mansard' && room > 4) {
    // A steep bronze mansard on the cornice, a copper ridge, and dormers of lit windows standing out of its front.
    const h = Math.min(room * 0.7, w * 0.45), k = 0.45, n = Math.max(2, Math.round(w / 6)), dw = Math.min(2.4, (w * 0.8) / n - 0.8), dh = Math.min(2.6, h * 0.5);
    b.kit.prism('bay', chamfered(w + 0.4, d + 0.4, 0.6), y, y + h, { top: true, edge: b.E, tag: PLAIN, shrink: [1 - k, 1 - k] });
    b.kit.prism('bay', chamfered((w + 0.4) * (1 - k) * 0.9, (d + 0.4) * (1 - k) * 0.9, 0.3), y + h, y + h + 0.5, { top: true, edge: b.E, tag: COPPER });
    const zf = ((d + 0.4) / 2) * (1 - (k * 0.35 * dh) / h);
    for (let i = 0; i < n; i++) {
      const x = -w * 0.4 + ((i + 0.5) * w * 0.8) / n;
      b.kit.box('stone', x - dw / 2 - 0.3, x + dw / 2 + 0.3, y + 0.2, y + 0.2 + dh, zf - 2.5, zf, { edge: b.E, tag: stone });
      b.kit.prism('bay', [[x - dw / 2 - 0.5, zf + 0.2], [x + dw / 2 + 0.5, zf + 0.2], [x + dw / 2 + 0.5, zf - 2.6], [x - dw / 2 - 0.5, zf - 2.6]], y + 0.2 + dh, y + 0.2 + dh + 0.9, { top: true, edge: b.E, tag: COPPER, shrink: [1, 0.3] });
      windows(b, face([x - dw / 2, 0, zf], [1, 0, 0], [0, 0, 1]), 0, dw, y + 0.5, y + dh - 0.1, -0.01, dw, dh - 0.6, { busy: 0.9, every: 99 });
    }
    return;
  }
  // A parapet, a plant room set back on the roof, and sometimes a mast.
  parapet(b, w, d, y, 1.1);
  const pw = w * (0.35 + 0.25 * R()), pd = d * (0.35 + 0.25 * R()), px = (R() - 0.5) * (w - pw) * 0.6;
  const ph = Math.min(room * 0.5, 2.6 + 2 * R());
  b.kit.prism('stone', chamfered(pw, pd, 0.3).map(([x, z]) => [x + px, z]), y, y + ph, { top: true, edge: b.E, tag: stone });
  // On the plant room a water tank or two on legs, and beside it, on a broad roof, a pergola over a terrace.
  const tanks = w > 12 ? 1 + Math.floor(R() * 2) : 1;
  for (let k = 0; k < tanks; k++) tank(b, px + (k - (tanks - 1) / 2) * pw * 0.45, -pd * 0.1, y + ph, Math.min(1.6, pw * 0.2));
  if (w > 16 && R() < 0.6) pergola(b, px > 0 ? -w * 0.25 : w * 0.25, d * 0.15, y, w * 0.32, d * 0.4);
  else if (room > 5 && R() < 0.65) mast(b, y, room * (0.7 + 0.3 * R()), 0.35);
}

// A set back top and a needle, as picture 9's tower at 1048 across has: a narrower lit storey stepped back from the
// shaft's edge under its own cornice, a low pyramid of copper, and a slender bronze needle with a collar to the top.
function needle(b, w, d, y, room) {
  const N = NEEDLE, sw = w * N.wide, sd = d * N.wide, h = N.tall, stone = { tone: b.tone, vary: b.vary, lay: 0 };
  parapet(b, w, d, y, 0.9);
  shaft(b, sw, sd, y, y + h, { corner: 0.9, pier: 0.7, bays: 2, back: 0.5, cw: 1.1, ch: h / 3, punched: true, busy: 0.95, chamfer: 0.6 });
  cornice(b, sw, sd, y + h, 0.8, 0.35);
  const yc = y + h + 0.8;
  b.kit.prism('bay', chamfered(sw * 0.8, sd * 0.8, 0.5), yc, yc + N.cap, { top: true, edge: b.E, tag: COPPER, shrink: 0.3 });
  block(b, 'stone', 1.6, 1.6, yc + N.cap - 0.4, yc + N.cap + 1.2, { chamfer: 0.3, tag: stone });
  block(b, 'bay', 0.7, 0.7, yc + N.cap + 1.2, y + room, { tag: PLAIN, shrink: 0.25 });
  block(b, 'bay', 1.2, 1.2, yc + N.cap + 1.2 + (y + room - yc - N.cap) * 0.3, yc + N.cap + 1.6 + (y + room - yc - N.cap) * 0.3, { tag: COPPER });
}
// The set back top's width against the shaft's, how tall it is, and the copper cap's height, in units.
const NEEDLE = { wide: 0.56, tall: 8, cap: 2.2 };

// A water tank on a roof: a drum of bronze staves banded in copper, on four legs, under a low cone.
function tank(b, x, z, y, r) {
  const at = (p) => [p[0] + x, p[1], p[2] + z], kit = b.kit;
  const pb = { ...b, kit: { patch: (l, a, c, e, f, o) => kit.patch(l, at(a), at(c), at(e), at(f), o), prism: (l, poly, y0, y1, o) => kit.prism(l, poly.map(([u, v]) => [u + x, v + z]), y0, y1, o), cap: (l, poly, yy, up, tag) => kit.cap(l, poly.map(([u, v]) => [u + x, v + z]), yy, up, tag), box: () => {} } };
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) kit.prism('bay', chamfered(0.24, 0.24, 0.02).map(([u, v]) => [u + x + sx * r * 0.7, v + z + sz * r * 0.7]), y, y + 1.4, { tag: PLAIN });
  revolve(pb, 'bay', [[r, y + 1.4], [r, y + 3.8]], 10, { tag: PLAIN, skip: (m) => m[2] < -0.5 });
  revolve(pb, 'bay', [[r + 0.08, y + 2.0], [r + 0.08, y + 2.25]], 10, { tag: COPPER, skip: (m) => m[2] < -0.5 });
  revolve(pb, 'bay', [[r + 0.08, y + 3.2], [r + 0.08, y + 3.45]], 10, { tag: COPPER, skip: (m) => m[2] < -0.5 });
  revolve(pb, 'bay', [[r + 0.2, y + 3.8], [0.01, y + 4.7]], 10, { tag: COPPER });
}

// A pergola: stone posts at its corners and along its sides, and beams of bronze across them.
function pergola(b, x, z, y, w, d) {
  const h = 2.4, n = Math.max(3, Math.round(w / 2.2)), stone = { tone: b.tone, vary: b.vary, lay: 0 };
  for (const sz of [-1, 1]) for (let k = 0; k < n; k++) {
    const px = x - w / 2 + (w * k) / (n - 1);
    b.kit.prism('stone', chamfered(0.4, 0.4, 0.05).map(([u, v]) => [u + px, v + z + sz * d / 2]), y, y + h, { edge: b.E, tag: stone });
    b.kit.prism('bay', [[px - 0.12, z + d / 2 + 0.4], [px + 0.12, z + d / 2 + 0.4], [px + 0.12, z - d / 2 - 0.4], [px - 0.12, z - d / 2 - 0.4]], y + h, y + h + 0.3, { top: true, tag: PLAIN });
  }
  for (const sz of [-1, 1]) b.kit.prism('stone', [[x - w / 2 - 0.3, z + sz * d / 2 + 0.25], [x + w / 2 + 0.3, z + sz * d / 2 + 0.25], [x + w / 2 + 0.3, z + sz * d / 2 - 0.25], [x - w / 2 - 0.3, z + sz * d / 2 - 0.25]], y + h - 0.35, y + h, { top: true, bottom: true, tag: stone });
}

// The setback tower: a base, a shaft that steps in under a cornice each time, its walls cut one of the LOOKS ways.
// How it steps differs: evenly, once high up as a slender tower on a broad body, or as a wedding cake of many
// shallow terraces near the top. The crown is the roof's.
function deco(b, t) {
  const { w, d, tall } = t, R = b.R;
  const hb = clamp(tall * 0.07, 4.5, 11), room = ROOM[t.i] ?? (t.roof === 'plain' ? Math.min(14, tall * 0.11) : Math.min(16, tall * 0.13));
  base(b, w, d, hb);
  const shape = R(), k = tall > 100 ? 3 : tall > 50 ? 2 : 1;
  const tops = k === 1 ? [1] : shape < 0.34 ? (k === 3 ? [0.58, 0.82, 1] : [0.7, 1]) : shape < 0.67 ? (k === 3 ? [0.45, 0.9, 1] : [0.4, 1]) : (k === 3 ? [0.72, 0.84, 0.93, 1] : [0.78, 0.9, 1]);
  const pull = shape < 0.34 ? 0.8 : shape < 0.67 ? 0.66 : 0.86;
  const span = tall - room - hb - 0.9, st = look(b, w - 2), chamfer = R() < 0.4 ? 1.4 : 0;
  let y = hb + 0.9, ww = w - 2, dd = d - 2;
  tops.forEach((f, i) => {
    const y1 = hb + 0.9 + span * f - 1;
    const own = i > 0 && R() < 0.5 ? look(b, ww) : st, s2 = { ...own, bays: Math.max(1, Math.round((own.bays * ww) / (w - 2))), chamfer: Math.min(chamfer, ww * 0.1), attic: i + 1 < tops.length ? 0 : own.attic };
    shaft(b, ww, dd, y, y1, s2);
    cornice(b, ww, dd, y1, i + 1 < tops.length ? 1.2 : 1, i + 1 < tops.length ? 0.45 : 0.35);
    y = y1 + (i + 1 < tops.length ? 1.2 : 1);
    if (i + 1 < tops.length) {
      // The terrace each setback leaves: a low stone balustrade along its edge.
      parapet(b, ww - 0.4, dd - 0.4, y, 0.7);
      ww = Math.max(8, ww * pull); dd = Math.max(8, dd * pull);
    }
  });
  crown(b, { ...t, top: TOPS[t.i] ?? t.top }, ww, dd, y, tall - y);
}
// The crowns picture 9 fixes: TOWERS[4], at 1048, 135 in the picture, is a plain tower with a set back top and a
// needle. And TOWERS[8], the tall slab beside the spire, steps in at its head, as the picture's tower there does.
// TOWERS[4] ends in a set back top and a needle, the needle reaching its top, so its crown has more room.
const TOPS = { 4: 'needle', 8: 'steps' }, ROOM = { 4: 30 };

// A round tower banded in copper, as picture 9's copper ringed pair is: a drum of windows between stone piers, broad
// copper rings round it part way up (`at`, a share of its height), a stone drum over them, and a shallow cap.
function ringed(b, t, x = 0, w = t.w, tall = t.tall, at = 0.5) {
  const r = w * 0.46, hb = clamp(tall * 0.06, 3, 8), { cw, ch } = cell(b), n = 20;
  const sh = (p) => [p[0] + x, p[1], p[2]];
  const pb = { ...b, kit: { patch: (l, a, c, e, f, o) => b.kit.patch(l, sh(a), sh(c), sh(e), sh(f), o), prism: (l, poly, y0, y1, o) => b.kit.prism(l, poly.map(([u, v]) => [u + x, v]), y0, y1, o), cap: (l, poly, y, up, tag) => b.kit.cap(l, poly.map(([u, v]) => [u + x, v]), y, up, tag), box: () => {} } };
  revolve(pb, 'stone', [[r + 0.8, -b.sink], [r + 0.8, hb], [r + 1.2, hb + 0.3], [r + 1.2, hb + 1], [r, hb + 1]], n, { tag: { tone: b.tone, vary: b.vary, lay: 1 }, skip: (m) => m[2] < -0.4 });
  const top = tall - 5, mid = hb + 1 + (top - hb - 1) * at, band = Math.min(16, (top - hb) * 0.26), step = band / 4;
  drum(pb, r, hb + 1, mid - band / 2, n, { cw, ch, pier: 2, out: 0.4 });
  drum(pb, r - 0.3, mid - band / 2, mid + band / 2, n, { cw, ch: step, pier: 0, out: 0 });
  rings(pb, r - 0.3, [0, 1, 2, 3].map((k) => mid - band / 2 + k * step), step * 0.62, 1.5, n);
  drum(pb, r, mid + band / 2, top, n, { cw, ch, pier: 2, out: 0.4 });
  revolve(pb, 'stone', [[r + 0.9, top], [r + 0.9, top + 0.8], [r + 0.4, top + 1]], n, { tag: { tone: b.tone, vary: b.vary, lay: 0 }, skip: (m) => m[2] < -0.6 && m[1] < 0.5 });
  revolve(pb, 'bay', [[r + 0.4, top + 1], [r * 0.7, top + 2.6], [r * 0.25, top + 4], [0.01, top + 4.4]], n, { tag: COPPER, skip: (m) => m[2] < -0.6 && m[1] < 0.5 });
  if (tall - top > 4.4) block(pb, 'bay', 0.5, 0.5, top + 4.4, tall, { tag: PLAIN, shrink: 0.3 });
}

// The slab: a broad block, its walls cut one of the LOOKS ways, sometimes a taller wing to one side, under a crown.
function slabTower(b, t) {
  const { w, d, tall } = t, R = b.R;
  const hb = clamp(tall * 0.12, 3.5, 8), room = Math.min(9, 2 + tall * 0.08);
  base(b, w, d, hb);
  const y0 = hb + 0.9, y1 = tall - room, st = look(b, w - 1.2);
  if (tall > 45 && R() < 0.5) {
    // A wing: the slab's body is lower, and a narrower tower rises from its back half to the full height.
    const low = y0 + (y1 - y0) * (0.45 + 0.2 * R()), tw = w * (0.5 + 0.15 * R()), side = R() < 0.5 ? -1 : 1, tx = side * (w - tw) / 2 * 0.9;
    shaft(b, w - 1.2, d - 1.2, y0, low, st);
    cornice(b, w - 1.2, d - 1.2, low, 0.9, 0.35);
    const sh = (p) => [p[0] + tx, p[1], p[2] - d * 0.12];
    const wb = { ...b, kit: { patch: (l, a, c, e, f, o) => b.kit.patch(l, sh(a), sh(c), sh(e), sh(f), o), prism: (l, poly, ya, yb, o) => b.kit.prism(l, poly.map(([u, v]) => [u + tx, v - d * 0.12]), ya, yb, o), cap: (l, poly, y, up, tag) => b.kit.cap(l, poly.map(([u, v]) => [u + tx, v - d * 0.12]), y, up, tag), box: (l, xa, xb, ya, yb, za, zb, o) => b.kit.box(l, xa + tx, xb + tx, ya, yb, za - d * 0.12, zb - d * 0.12, o) } };
    const st2 = look(wb, tw - 1);
    shaft(wb, tw - 1, d * 0.7, low + 0.9, y1, st2);
    cornice(wb, tw - 1, d * 0.7, y1, 0.9, 0.35);
    crown(wb, t, tw - 1, d * 0.7, y1 + 0.9, tall - y1 - 0.9);
    return;
  }
  shaft(b, w - 1.2, d - 1.2, y0, y1, st);
  cornice(b, w - 1.2, d - 1.2, y1, 0.9, 0.35);
  if (t.roof === 'bronze') {
    block(b, 'bay', w - 0.6, d - 0.6, y1 + 0.9, y1 + 2.0, { tag: COPPER, chamfer: 0.4 });
    crown(b, { ...t, roof: 'plain' }, w - 1.2, d - 1.2, y1 + 2.0, tall - y1 - 2.0);
  } else crown(b, { ...t, top: TOPS[t.i] ?? t.top }, w - 1.2, d - 1.2, y1 + 0.9, tall - y1 - 0.9);
}

// The fin tower: deep stone fins stand out of every face, close set, and rise past the roof in steps, the middle
// ones highest, with bronze spandrels between them at every floor.
function finTower(b, t) {
  if (t.i === SLOPE.at) { sloped(b, t); return; }
  const { w, d, tall } = t, R = b.R, { cw } = cell(b), ch = 2.0 + 0.5 * R();
  const hb = clamp(tall * 0.08, 4, 9);
  base(b, w, d, hb);
  const y0 = hb + 0.9, y1 = tall - Math.min(9, tall * 0.08), ww = w - 1.6, dd = d - 1.6, out = 1.1 + 0.6 * R();
  const bays = Math.max(3, Math.round(ww / (2 * cw + 0.7)));
  shaft(b, ww, dd, y0, y1, { corner: 1.2, pier: 0.7, bays, back: 0.5, cw, ch, out, band: 1, bandTall: 0.5, bandBack: 0.3, bandLayer: 'bay', bandTag: R() < 0.5 ? COPPER : PLAIN });
  cornice(b, ww, dd, y1, 0.6, 0.1);
  for (const s of faces(ww, dd)) {
    if (s.side === 'back') continue;
    const bay = (s.len - 2.4 - (bays - 1) * 0.7) / bays;
    for (let i = 1; i < bays; i++) {
      const s0 = 1.2 + i * (bay + 0.7) - 0.7, k = 1 - Math.abs(i / bays - 0.5) * 2, up = (tall - y1) * (0.35 + 0.65 * k);
      if (up < 1.6) continue;
      slab(b, s.f, s0, s0 + 0.7, y1 + 0.6, y1 + up, -out);
      reveal(b, s.f, s0, s0 + 0.7, y1 + 0.6, y1 + up, -out, 0.4, { sill: false });
    }
  }
  if (t.roof === 'bronze') block(b, 'bay', ww - 2, dd - 2, y1 + 0.6, y1 + 2.2, { tag: COPPER, chamfer: 0.5 });
  else block(b, 'stone', ww - 2, dd - 2, y1 + 0.6, y1 + 2, { chamfer: 0.3 });
}

// A short fat round tower, as each of picture 9's ringed pair is: a round shaft of stone let into by windows, and at
// its head a stack of storeys each under a cantilevered floor: a slab of stone with a copper fascia standing out
// round the drum, and set back behind it a ribbon of lit glass between slender bronze mullions, so the head reads
// as storeys with their terraces, not as rings; over them a copper dome on a stone drum and a lantern. x is where
// it stands across the building, r its radius, at its head's height.
function bandedDrum(b, x, r, tall, o = {}) {
  const n = 40, hb = 3, R = b.R, { cw, ch } = cell(b), at = (p) => [p[0] + x, p[1], p[2]];
  const pb = { ...b, kit: { patch: (l, a, c, e, f, q) => b.kit.patch(l, at(a), at(c), at(e), at(f), q), prism: (l, poly, y0, y1, q) => b.kit.prism(l, poly.map(([u, v]) => [u + x, v]), y0, y1, q), cap: (l, poly, y, up, tag) => b.kit.cap(l, poly.map(([u, v]) => [u + x, v]), y, up, tag), box: () => {} } };
  const stone = { tone: b.tone, vary: b.vary, lay: 0 }, D = DRUM, top = tall - D.cap, low = top - D.stack * (o.stack ?? 1), k = D.bands + (R() < 0.5 ? 0 : -1), step = (top - low) / k;
  const skip = (m) => m[2] < -0.4, rs = r + D.ring, rg = r - D.groove;
  revolve(pb, 'stone', [[r + 0.9, -b.sink], [r + 0.9, hb], [r + 0.3, hb + 0.6], [r, hb + 0.6]], n, { tag: { ...stone, lay: 1 }, skip });
  drum(pb, r, hb + 0.6, low - 0.8, n, { cw, ch, pier: 4, out: 0.3, pierWide: 0.9 });
  revolve(pb, 'stone', [[r, low - 0.8], [r + 0.2, low - 0.5], [r + 0.2, low]], n, { tag: stone, skip });
  for (let i = 0; i < k; i++) {
    const y0 = low + i * step, slab = step * D.slab, g0 = y0 + slab, g1 = y0 + step;
    // The floor: a stone slab standing out to rs, its edge a fascia of polished bronze with a chamfer over and under it.
    revolve(pb, 'stone', [[rg, y0], [rs - 0.25, y0], [rs - 0.25, y0 + slab * 0.25]], n, { tag: stone, skip, flat: true });
    revolve(pb, 'bay', [[rs - 0.25, y0 + slab * 0.25], [rs, y0 + slab * 0.4], [rs, g0 - slab * 0.2], [rs - 0.25, g0]], n, { tag: POLISHED, skip, flat: true });
    revolve(pb, 'stone', [[rs - 0.25, g0], [rg, g0]], n, { tag: stone, skip, flat: true });
    // The storey: a ribbon of glass set back behind the slab, lit, between bronze mullions.
    drum(pb, rg, g0, g1, n, { cw: Math.max(1.2, cw * 1.3), ch: g1 - g0, pier: 2, out: 0.15, pierWide: 0.22, every: 99 });
  }
  revolve(pb, 'stone', [[rs, top], [rs, top + 0.35], [r, top + 0.5], [r, top + D.cap * 0.25]], n, { tag: stone, skip });
  const dome = Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI / 2; return [Math.max(0.01, r * Math.cos(a)), top + D.cap * 0.25 + D.cap * 0.55 * Math.sin(a)]; });
  revolve(pb, 'bay', dome, n, { tag: COPPER, smooth: true, skip: (m) => m[2] < -0.6 && m[1] < 0.3 });
  block(pb, 'stone', r * 0.32, r * 0.32, top + D.cap * 0.78, top + D.cap * 0.95, { chamfer: r * 0.08 });
  block(pb, 'bay', r * 0.36, r * 0.36, top + D.cap * 0.95, top + D.cap, { tag: COPPER, chamfer: r * 0.1, shrink: 0.2 });
}
// The ringed pair's heads: how tall the stack of storeys is, in units (the picture's runs 176 to 196 down), how many
// storeys, the share of each that is its floor slab, how far a slab stands out of the shaft and how far its ribbon of
// glass is set back into it, and the cap.
const DRUM = { stack: 19, bands: 5, slab: 0.5, ring: 0.7, groove: 0.5, cap: 5 };

// The tower left of the spire, as picture 9 has it at 643 to 662 across: a warm stone shaft whose roof slopes down
// to the visitor's right. Strip windows between proud piers up its faces, a cornice, and on it an attic whose top
// falls `fall` units across its width: stone gables, a roof of copper laid in standing seams, a lit clerestory
// under its high edge, and a stone coping along the ridge.
const SLOPE = { at: 10, fall: 8, attic: 4.5 };
function sloped(b, t) {
  const { w, d, tall } = t, hb = clamp(tall * 0.08, 4, 8), stone = { tone: b.tone, vary: b.vary, lay: 0 };
  base(b, w, d, hb);
  const ww = w - 1.2, dd = d - 1.2, y1 = tall - SLOPE.fall - SLOPE.attic;
  shaft(b, ww, dd, hb + 0.9, y1, { ...look(b, ww, 'strip'), chamfer: 0.8 });
  cornice(b, ww, dd, y1, 0.9, 0.35);
  const X = ww / 2 - 0.3, Z = dd / 2 - 0.3, y0 = y1 + 0.9, hi = tall, lo = tall - SLOPE.fall;
  const top = (x) => hi + ((lo - hi) * (x + X)) / (2 * X);
  // The attic's walls up to where the roof starts, the gables to the roof's line.
  for (const z of [Z, -Z]) {
    const out = [0, 0, Math.sign(z)];
    b.kit.patch('stone', [-X, y0, z], [X, y0, z], [X, lo - 0.6, z], [-X, hi - 0.6, z], { edge: b.E, want: out, tag: stone });
  }
  b.kit.patch('stone', [-X, y0, -Z], [-X, y0, Z], [-X, hi - 0.6, Z], [-X, hi - 0.6, -Z], { edge: b.E, want: [-1, 0, 0], tag: stone });
  b.kit.patch('stone', [X, y0, Z], [X, y0, -Z], [X, lo - 0.6, -Z], [X, lo - 0.6, Z], { edge: b.E, want: [1, 0, 0], tag: stone });
  // The clerestory: a band of lit windows across the front under the roof's high side.
  windows(b, face([-X, 0, Z + 0.02], [1, 0, 0], [0, 0, 1]), 0.8, 2 * X * 0.55, y0 + 0.6, y0 + 0.6 + SLOPE.attic * 0.6, -0.01, 1.3, SLOPE.attic * 0.6, { busy: 0.95, every: 99 });
  // The roof: copper in seams down the slope, over the eaves.
  const seams = Math.max(4, Math.round((2 * Z) / 1.6));
  for (let k = 0; k < seams; k++) {
    const z0 = -Z - 0.4 + ((2 * Z + 0.8) * k) / seams, z1 = -Z - 0.4 + ((2 * Z + 0.8) * (k + 1)) / seams;
    b.kit.patch('bay', [-X - 0.5, top(-X - 0.5) - 0.6, z1], [X + 0.5, top(X + 0.5) - 0.6, z1], [X + 0.5, top(X + 0.5) - 0.6, z0], [-X - 0.5, top(-X - 0.5) - 0.6, z0], { want: [SLOPE.fall / (2 * X), 1, 0], tag: COPPER });
  }
  b.kit.prism('stone', [[-X - 0.8, Z + 0.8], [-X + 0.9, Z + 0.8], [-X + 0.9, -Z - 0.8], [-X - 0.8, -Z - 0.8]], hi - 0.7, hi + 0.5, { top: true, edge: b.E, tag: stone });
}

// Twin shafts on one podium, joined by bridges of glass. The picture's copper ringed pair (PAIR) are two short fat
// drums side by side, banded in copper at their heads; other bronze twins are square shafts under stepped bronze
// attics.
const PAIR = 9;
function twin(b, t) {
  const { w, d, tall } = t, R = b.R;
  if (t.i === PAIR) {
    const r = w * 0.235;
    bandedDrum(b, -w * 0.25, r, tall * 0.97, { stack: 0.9 });
    bandedDrum(b, w * 0.25, r * 1.02, tall);
    return;
  }
  const hp = clamp(tall * 0.14, 5, 12);
  base(b, w, d, hp);
  // The two shafts are not alike: the taller is broader, of stone, cut one way and stepped at its head, the lower
  // narrower, a curtain wall of glass under a stepped bronze attic.
  const sws = [w * 0.42, w * 0.33], gap = w - sws[0] - sws[1] - 1, xs = [-(w / 2) + 0.5 + sws[0] / 2, w / 2 - 0.5 - sws[1] / 2], low = 0.8 + 0.08 * R();
  const st0 = look(b, sws[0], LOOKS[Math.floor(R() * LOOKS.length)]), st1 = look(b, sws[1], 'curtain'), ch = st0.ch;
  xs.forEach((x, i) => {
    const h = i === 0 ? tall : tall * low, sw = sws[i], st = i === 0 ? st0 : st1;
    const kit = b.kit, at = (p) => [p[0] + x, p[1], p[2]];
    const sb = { ...b, kit: { patch: (l, a, c, e, f, o) => kit.patch(l, at(a), at(c), at(e), at(f), o), prism: (l, poly, y0, y1, o) => kit.prism(l, poly.map(([u, v]) => [u + x, v]), y0, y1, o), cap: (l, poly, y, up, tag) => kit.cap(l, poly.map(([u, v]) => [u + x, v]), y, up, tag), box: (l, x0, x1, y0, y1, z0, z1, o) => kit.box(l, x0 + x, x1 + x, y0, y1, z0, z1, o) } };
    const y1 = h - Math.min(9, h * 0.1);
    shaft(sb, sw, d * 0.82, hp + 0.9, y1, { ...st, chamfer: 0.9 });
    cornice(sb, sw, d * 0.82, y1, 0.8, 0.3);
    crown(sb, i === 0 ? { ...t, roof: 'plain', top: 'steps' } : { ...t, roof: 'bronze' }, sw, d * 0.82, y1 + 0.8, h - y1 - 0.8);
  });
  // The bridges, each a box of windows between the shafts, with a stone floor and roof.
  for (const f of [0.45, 0.72]) {
    const y = hp + (tall * low - hp) * f, hh = Math.max(2.4, ch * 2), z = d * 0.12, half = gap / 2 + 0.6, mx = (xs[0] + sws[0] / 2 + xs[1] - sws[1] / 2) / 2;
    const at = (p) => [p[0] + mx, p[1], p[2]], kit = b.kit;
    const mb = { ...b, kit: { patch: (l, a, c, e, f2, o) => kit.patch(l, at(a), at(c), at(e), at(f2), o), prism: (l, poly, y0, y1, o) => kit.prism(l, poly.map(([u, v]) => [u + mx, v]), y0, y1, o), cap: (l, poly, yy, up, tag) => kit.cap(l, poly.map(([u, v]) => [u + mx, v]), yy, up, tag), box: () => {} } };
    block(mb, 'stone', 2 * half, d * 0.3, y - 0.6, y, { chamfer: 0.001 });
    const front = faces(2 * half, d * 0.3)[0];
    windows(mb, { ...front.f, o: [front.f.o[0], 0, front.f.o[2] + z] }, 0, 2 * half, y, y + hh, 0, 1.4, hh / 2, { every: 2 });
    mb.kit.cap('stone', chamfered(2 * half, d * 0.3, 0.001).map(([u, v]) => [u, v + z]), y + hh, true, { tone: b.tone, vary: b.vary, lay: 0 });
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
    revolve(b, 'stone', [[r * 1.5, st], [r * 1.5, st + 0.5], [r * 1.12, st + 0.8], [r, st + 1], [r * 0.86, colTop - 1], [r * 1.25, colTop - 0.5], [r * 1.5, colTop - 0.35], [r * 1.5, colTop]], 8, { tag: { tone: b.tone, vary: b.vary, lay: 0 }, place: (p) => [p[0] + x, p[1], p[2] + front], skip: (m) => m[2] < -0.5 });
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

// The low buildings of the city's front, so no two side by side are alike: a hall with its colonnade, a setback
// block, a slab under a crown of its own, or an arcade, each passing over what its neighbours are (apart), and each
// a little lower or higher than the next (CIVIC.tall, its share of the plan's height, never over it but by a little),
// so the roofline steps from one to the next.
const CIVIC = { kinds: ['hall', 'deco', 'arcade', 'slab'], tall: [0.84, 0.2] };
function civic(b, t) {
  const kind = apart(b, 'civic', CIVIC.kinds, Math.floor(b.R() * CIVIC.kinds.length)), tt = { ...t, tall: t.tall * (CIVIC.tall[0] + CIVIC.tall[1] * b.R()) };
  if (kind === 'hall') hall(b, tt);
  else if (kind === 'deco') deco(b, { ...tt, roof: tt.roof === 'bronze' ? 'plain' : tt.roof });
  else if (kind === 'slab') slabTower(b, tt);
  else arcade(b, tt);
}
// An arcade: a ground storey of tall round headed openings between broad piers, each a lit shop front, over it a few
// storeys of windows let into the stone in pairs under a string course, and a parapet stepped up over the middle.
function arcade(b, t) {
  const { w, d, tall } = t, R = b.R, hb = clamp(tall * 0.24, 4, 7);
  shaft(b, w, d, -b.sink, hb, { punched: true, corner: 1.6, pier: 1.4 + 0.4 * R(), bays: Math.max(2, Math.round(w / 5)), back: 1.0, cw: 2.6, ch: hb + b.sink, busy: 0.95, roof: false });
  cornice(b, w, d, hb, 0.8, 0.35);
  const top = tall - 2.2, st = look(b, w - 1, R() < 0.5 ? 'punched' : 'paired');
  shaft(b, w - 1, d - 1, hb + 0.8, top, { ...st, attic: 0 });
  cornice(b, w - 1, d - 1, top, 0.9, 0.3);
  parapet(b, w - 1, d - 1, top + 0.9, 0.9);
  const bw = (w - 1) * (0.3 + 0.2 * R());
  block(b, 'stone', bw, d * 0.5, top + 0.9, tall, { chamfer: 0.3 });
  cornice(b, bw, d * 0.5, tall, 0.4, 0.15);
}

// The domed hall: a square body, a drum of windows on it, a ribbed dome and a lantern. A tall one is a tower that
// flares to a wide head, as the one beside the stepped tower in picture 9 does.
function dome(b, t) {
  const { w, d, tall } = t, R = b.R, { cw, ch } = cell(b), n = 24;
  const metal = t.roof === 'bronze' ? PLAIN : null;
  if (tall > 60) {
    // The saucer tower, as picture 9 has it beside the stepped tower: a goblet. A broad podium, buttresses sweeping
    // in to a slender stem, the stem flaring out as a bowl to a wide shallow cap, a ring of windows under its lip,
    // and a low dome. Its heights are shares of the whole (SAUCER), read off the picture.
    const S = SAUCER, y = (k) => tall * k, rc = w * S.cap, rs = w * S.stem, rp = w * S.foot, stone = { tone: b.tone, vary: b.vary, lay: 0 };
    shaft(b, rp * 1.6, rp * 1.6, -b.sink, y(S.podium), { punched: true, corner: 1.4, pier: 1.1, bays: 2, back: 0.6, cw: 1.6, ch: 2.4, busy: 0.85 });
    cornice(b, rp * 1.6, rp * 1.6, y(S.podium), 0.8, 0.3);
    const P = y(S.podium) + 0.8;
    // The sweep from the podium to the stem is stepped in terraces, each a ring of lit windows under a sloping
    // stone ledge, so it reads as storeys drawing in and not as one skirt.
    const steps = SAUCER.terraces, top = y(S.waist) - 2, rr = (i) => rp * 0.92 + (rs * 1.5 - rp * 0.92) * (i / steps), yy = (i) => P + 0.6 + (top - P - 0.6) * (i / steps);
    revolve(b, 'stone', [[rp, P], [rp * 0.92, P + 0.6]], n, { tag: stone, skip: (m) => m[2] < -0.5 });
    for (let i = 0; i < steps; i++) {
      const h = yy(i + 1) - yy(i), wall = yy(i) + h * 0.62;
      drum(b, rr(i), yy(i), wall, n, { cw: 1.3, ch: wall - yy(i), pier: 3, out: 0.25, pierWide: 0.5 });
      revolve(b, 'stone', [[rr(i) + 0.45, wall], [rr(i) + 0.45, wall + 0.35], [rr(i + 1), yy(i + 1)]], n, { tag: stone, skip: (m) => m[2] < -0.5, flat: true });
    }
    revolve(b, 'stone', [[rr(steps), top], [rs, y(S.waist)], [rs, y(S.bowl)]], n, { tag: stone, skip: (m) => m[2] < -0.5 });
    // Buttresses: four fins down the sweep from the stem to the podium.
    for (let q = 0; q < 4; q++) {
      const a = Math.PI / 4 + (q * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a), half = 0.45;
      const pt = (rr, h, s) => [Math.sin(a) * rr + ca * s, h, Math.cos(a) * rr - sa * s];
      for (const s of [-half, half]) b.kit.patch('stone', pt(rp * 0.85, P, s), pt(rp * 1.18, P, s), pt(rp * 1.18, P, s), pt(rs, y(S.waist) + 3, s), { want: [ca * Math.sign(s), 0, -sa * Math.sign(s)], tag: stone });
      b.kit.patch('stone', pt(rs, y(S.waist) + 3, -half), pt(rp * 1.18, P, -half), pt(rp * 1.18, P, half), pt(rs, y(S.waist) + 3, half), { want: [sa, 0.6, ca], tag: stone });
    }
    // The stem's windows: a slit up each quarter.
    drum(b, rs + 0.02, y(S.waist) + 3, y(S.bowl) - 1, 24, { cw: 1.0, ch: 2.2, pier: 2, out: 0.5, pierWide: 0.55 });
    // Bands of stone round the stem, each a proud course with a chamfered top, so the stem reads as built in drums.
    for (let k = 1; k <= SAUCER.bands; k++) {
      const yk = y(S.waist) + 3 + ((y(S.bowl) - 1 - y(S.waist) - 3) * k) / (SAUCER.bands + 1);
      revolve(b, 'stone', [[rs - 0.1, yk - 0.45], [rs + 0.45, yk - 0.3], [rs + 0.45, yk + 0.2], [rs - 0.1, yk + 0.45]], n, { tag: stone, skip: (m) => m[2] < -0.5 });
    }
    // The bowl, flaring from the stem to the lip, and the ring of windows under the lip.
    const lip = y(S.lip);
    revolve(b, 'stone', [[rs, y(S.bowl)], [rs * 1.4, y(S.bowl) + 1.6], [rc * 0.75, lip - 3.4], [rc * 0.93, lip - 2.6]], n * 2, { tag: stone, skip: (m) => m[2] < -0.5 && m[1] > -0.2 });
    drum(b, rc * 0.93, lip - 2.6, lip - 0.2, n * 2, { cw: 1.3, ch: 2.4, pier: 4, out: 0.3, pierWide: 0.5 });
    revolve(b, 'stone', [[rc * 0.93, lip - 0.2], [rc, lip], [rc, lip + 0.9], [rc * 0.96, lip + 1.2]], n * 2, { tag: stone, skip: (m) => m[2] < -0.6 && m[1] < 0.4 });
    const dome = Array.from({ length: 13 }, (_, k) => { const a = (k / 12) * Math.PI / 2; return [Math.max(0.01, rc * 0.96 * Math.cos(a)), lip + 1.2 + (tall - lip - 1.2) * Math.sin(a)]; });
    revolve(b, metal ? 'bay' : 'stone', dome, n * 2, { tag: metal ?? stone, smooth: true, skip: (m) => m[2] < -0.6 && m[1] < 0.3 });
    // A copper band where the dome meets the lip.
    revolve(b, 'bay', [[rc * 0.97, lip + 1.1], [rc * 0.99, lip + 1.35], [rc * 0.95, lip + 1.7]], n * 2, { tag: COPPER, skip: (m) => m[2] < -0.6 });
    return;
  }
  const bodyH = tall * 0.42, rr = Math.min(w, d) * 0.36, drH = tall * 0.16, domeH = tall - bodyH - drH - 3.2;
  shaft(b, w, d, -b.sink, bodyH, { punched: true, corner: 1.6, pier: 1.2, bays: Math.max(2, Math.round(w / 6)), back: 0.7, cw: 2, ch: bodyH / Math.max(1, Math.round(bodyH / 4)), busy: 0.7 });
  cornice(b, w, d, bodyH, 0.8, 0.3);
  drum(b, rr, bodyH + 0.8, bodyH + 0.8 + drH, n, { cw: 1.6, ch: drH, pier: 2, out: 0.35 });
  const y = bodyH + 0.8 + drH, prof = [];
  for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI / 2; prof.push([(rr + 0.5) * Math.cos(a), y + 0.5 + domeH * Math.sin(a)]); }
  prof.unshift([rr + 0.9, y], [rr + 0.9, y + 0.5]);
  revolve(b, metal ? 'bay' : 'stone', prof, 16, { tag: metal ?? { tone: Math.min(1, b.tone + 1 / 7), vary: b.vary, lay: 0 }, skip: (m) => m[2] < -0.6 && m[1] < 0.3 });
  const lw = rr * 0.32;
  block(b, 'stone', lw, lw, y + 0.5 + domeH - 0.4, y + 0.5 + domeH + 1.6, { chamfer: lw * 0.3 });
  block(b, 'bay', lw * 1.2, lw * 1.2, y + 0.5 + domeH + 1.6, tall, { tag: metal ? COPPER : PLAIN, shrink: 0.05, chamfer: lw * 0.35 });
  void R;
}

// The gold cap, as picture 9's at 968 across is: a slim pointed cap that swells only a little over its foot and
// draws in to a long point and a needle. How wide at its foot against the lantern's width, how many times that it
// swells to and how far up (a share of its height), how hollow its upper curve is, where its point is against the
// plan's height, how far over it the needle reaches, and how many rings it is turned in, so the moon's highlight
// runs down it with no bands.
const FLAME = { wide: 0.2, swell: 1.12, at: 0.22, hollow: 1.15, over: 5, needle: 9, rings: 64 };
// The saucer tower's parts, as shares of its width (the cap's radius, the stem's, the podium's) and of its height
// (the podium's top, the stem's waist, where the bowl begins, the lip): picture 9's at 714 to 740 across. And how many
// bands of stone go round its stem, and how many terraces the sweep up to it is stepped in.
const SAUCER = { cap: 0.47, stem: 0.17, foot: 0.4, podium: 0.33, waist: 0.48, bowl: 0.77, lip: 0.91, bands: 3, terraces: 3 };

// A tower with cut corners, stepping in, under a pyramid of bronze or a point of gold.
function point(b, t) {
  const { w, d, tall } = t, R = b.R, { cw, ch } = cell(b), gold = t.roof === 'gold';
  const hb = clamp(tall * 0.07, 4.5, 11), cap = gold ? tall * 0.24 : tall * 0.16;
  base(b, w, d, hb);
  const tops = [0.62, 0.86, 1], span = tall - cap - hb - 0.9, st = look(b, w - 2, gold ? 'strip' : 'paired');
  let y = hb + 0.9, ww = w - 2, dd = d - 2;
  tops.forEach((f, i) => {
    const y1 = hb + 0.9 + span * f - 1;
    shaft(b, ww, dd, y, y1, { ...st, bays: Math.max(1, Math.round((st.bays * ww) / (w - 2))), chamfer: ww * 0.14 });
    cornice(b, ww, dd, y1, 1, 0.3, { chamfer: ww * 0.14 });
    y = y1 + 1;
    if (i < 2) { ww *= 0.82; dd *= 0.82; }
  });
  if (gold) {
    // A fluted lantern of gold, a flame of eight faces that swells and draws in to a point, a ball and a needle:
    // picture 9's gold caps.
    // The flame, as picture 9's gold cap at 968 across is: from its foot it swells to FLAME.swell times as wide a
    // third of the way up, then draws in through an ogee, full and then hollow, to a long point, a ball, and a
    // needle whose tip stands FLAME.needle over the plan's height, where the picture's is.
    fluted(b, ww * 0.78, dd * 0.78, y, y + cap * 0.2, 2);
    const yy = y + cap * 0.2, pw = ww * FLAME.wide, top = tall + FLAME.over, H = top - yy, n = FLAME.rings, prof = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, a = FLAME.at, t = Math.max(0, (u - a) / (1 - a));
      const r = u < a ? 1 + (FLAME.swell - 1) * Math.sin((Math.PI / 2) * (u / a)) : FLAME.swell * (1 - t * t * (3 - 2 * t)) ** FLAME.hollow;
      prof.push([Math.max(0.05, pw * r), yy + 0.8 + (H - 0.8) * u]);
    }
    revolve(b, 'gold', [[pw * 1.3, yy], [pw * 1.3, yy + 0.6], [pw, yy + 0.8]], 32, { nv: 1 });
    revolve(b, 'gold', prof, 32, { smooth: true });
    revolve(b, 'gold', Array.from({ length: 7 }, (_, i) => { const a = -Math.PI / 2 + (Math.PI * i) / 6; return [Math.max(0.01, 0.42 * Math.cos(a)), top + 0.42 + 0.42 * Math.sin(a)]; }), 10, { skip: (m) => m[2] < -0.6 });
    block(b, 'gold', 0.24, 0.24, top + 0.84, tall + FLAME.needle, { shrink: 0.1 });
  } else {
    b.kit.prism('bay', chamfered(ww + 0.4, dd + 0.4, ww * 0.16), y, y + cap * 0.55, { top: false, edge: b.E, tag: PLAIN, shrink: 0.18 });
    mast(b, y + cap * 0.55 - 0.5, cap * 0.45 + 0.5, 0.4);
  }
  void R;
}

// The obelisk tower: a slender dark shaft of windows on a base, and on it a tall point of gold, square with cut
// corners, on a stepped plinth, under a band and a pyramidion.
function obelisk(b, t) {
  const { w, d, tall } = t, hb = OBELISK.base, { shaft: y1, foot: yb } = obeliskPoint(tall);
  // Its window size is drawn and not used, so the building's numbers after it, and so the city, stay as they were.
  cell(b);
  base(b, w, d, hb);
  const mid = hb + 0.9 + (y1 - hb) * 0.55;
  const st = look(b, w - 2, 'strip');
  shaft(b, w - 2, d - 2, hb + 0.9, mid, { ...st, chamfer: 1.4 });
  cornice(b, w - 2, d - 2, mid, 1, 0.35, { chamfer: 1.4 });
  shaft(b, w - 6, d - 6, mid + 1, y1, { ...st, bays: Math.max(1, st.bays - 1), chamfer: 1.2 });
  cornice(b, w - 6, d - 6, y1, 1.2, 0.4, { chamfer: 1.2 });
  block(b, 'bay', w - 7, d - 7, y1 + 1.2, y1 + 2.4, { tag: COPPER, chamfer: 1 });
  const g = w * OBELISK.width, k = OBELISK.taper, yt = tall - g * OBELISK.cap;
  // The point is turned on its plinth (OBELISK.turn), so two of its broad faces are seen, as the picture's two are:
  // the one toward the moon carries its reflection, the other mirrors the dark.
  const c = Math.cos(OBELISK.turn * Math.PI / 180), sn = Math.sin(OBELISK.turn * Math.PI / 180), turned = (poly) => poly.map(([u, v]) => [u * c + v * sn, -u * sn + v * c]);
  b.kit.prism('gold', chamfered(g + 2.4, g + 2.4, 1.6), y1 + 2.4, y1 + 3.2, { top: true, edge: b.E });
  b.kit.prism('gold', turned(chamfered(g + 1.2, g + 1.2, 1.2)), y1 + 3.2, yb, { top: true, edge: b.E });
  // Its broad faces are fluted, the flutes narrowing with the face as it tapers, each flank turned OBELISK.flank
  // degrees: so the face toward the moon is lit across its width, a fine reeding over it.
  // The broad faces of a tapering stretch of the point, fluted, the flutes narrowing with it.
  const reeds = (w0, shrink, y0, y1, reed = OBELISK.reed) => (p, q) => {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < w0 * 0.5) return undefined;
    const T = [(q[0] - p[0]) / len, 0, (q[1] - p[1]) / len], o = [(p[0] + q[0]) / 2, 0, (p[1] + q[1]) / 2];
    return { flute: Math.max(3, Math.round(len / reed)), o, T, taper: [len, len * shrink, y0, y1], flank: OBELISK.flank };
  };
  b.kit.prism('gold', turned(chamfered(g, g, g * 0.08)), yb, yt, { top: false, edge: b.E, nv: 12, shrink: k, tagOf: reeds(g, k, yb, yt) });
  // Its head: a moulded collar of three steps, the middle one reeded finely, a pyramidion in two stages with a ring
  // between them, its lower stage fluted on, and a ball and a needle over its point.
  const gt = g * k, P = OBELISK.head, yc = yt + P.collar, ym = yc + (tall - yc) * P.lower;
  b.kit.prism('gold', turned(chamfered(gt + 0.9, gt + 0.9, gt * 0.12)), yt, yt + 0.35, { top: true, bottom: true, edge: b.E });
  b.kit.prism('gold', turned(chamfered(gt + 0.35, gt + 0.35, gt * 0.1)), yt + 0.35, yc - 0.3, { edge: b.E, tagOf: reeds(gt * 0.6, 1, yt + 0.35, yc - 0.3, 0.7) });
  b.kit.prism('gold', turned(chamfered(gt + 1.0, gt + 1.0, gt * 0.14)), yc - 0.3, yc, { top: true, bottom: true, edge: b.E });
  b.kit.prism('gold', turned(chamfered(gt, gt, gt * 0.08)), yc, ym, { top: false, edge: b.E, nv: 4, shrink: P.waist, tagOf: reeds(gt, P.waist, yc, ym, 0.9) });
  const gw = gt * P.waist;
  b.kit.prism('gold', turned(chamfered(gw + 0.6, gw + 0.6, gw * 0.14)), ym, ym + 0.3, { top: true, bottom: true, edge: b.E });
  b.kit.prism('gold', turned(chamfered(gw, gw, gw * 0.08)), ym + 0.3, tall, { top: false, edge: b.E, shrink: 0.04 });
  revolve(b, 'gold', Array.from({ length: 7 }, (_, i) => { const a = -Math.PI / 2 + (Math.PI * i) / 6; return [Math.max(0.01, P.ball * Math.cos(a)), tall + P.ball + P.ball * Math.sin(a)]; }), 10, { skip: (m) => m[2] < -0.6 });
  block(b, 'gold', 0.2, 0.2, tall + 2 * P.ball, tall + P.needle, { shrink: 0.1 });
}

// The sun disc tower: a shaft that steps in, a collar and a neck, and on it a great disc of gold carved as the
// site's Sun stones are: a rounded rim, a dished field, a ring of sixteen plates, rays at the quarters and between
// them, raised rings and a boss. Every carved thing is sloped or rounded, so it takes the light on one side and
// not the other.
function disc(b, t) {
  const { w, d, tall } = t, { r, cy } = discAt(w, tall), hb = 9;
  cell(b);
  base(b, w, d, hb);
  // The disc sits on its tower's top in a low gold cradle, with no stalk: SEAT.under units of stone and copper under
  // the cradle, and the cradle's own height, under the disc's foot.
  const low = tall * 0.3, y1 = tall - 2 * r - SEAT.under - SEAT.cradle;
  shaft(b, w - 2, d - 2, hb + 0.9, low, look(b, w - 2, 'punched'));
  cornice(b, w - 2, d - 2, low, 1, 0.35);
  shaft(b, w * 0.7, d * 0.7, low + 1, y1, { ...look(b, w * 0.7, 'mullion'), chamfer: 1.2 });
  cornice(b, w * 0.7, d * 0.7, y1, 1.2, 0.4, { chamfer: 1.2 });
  const yc = y1 + SEAT.under, foot = tall - 2 * r;
  block(b, 'stone', w * 0.52, d * 0.52, y1 + 1.2, yc - 0.7, { chamfer: 1 });
  block(b, 'bay', w * 0.56, d * 0.56, yc - 0.7, yc, { tag: COPPER, chamfer: 1.1 });
  // The cradle: a round gold plinth that the disc's rim stands in.
  revolve(b, 'gold', [[w * 0.26, yc], [w * 0.26, yc + 0.5], [w * 0.22, yc + 0.8], [w * 0.16, foot + 0.6], [w * 0.2, foot + 1.4]], 32, { skip: (m) => m[2] < -0.6 });
  // The disc stands upright and faces the visitor: turned from a profile about its own axis, which is z.
  const D = SUN.depth, place = (p) => [p[0], cy + p[2], p[1]], turn = (v) => [v[0], v[2], v[1]];
  // One profile from the rim's outer side in to the boss, so no gap opens between one ring and the next: a half
  // round rim, the field falling a little toward the plates' ring, a rounded ring, the field rising to a second
  // rounded ring, and the boss.
  const arc = (rc, q, h, a0, a1, segs) => Array.from({ length: segs + 1 }, (_, i) => { const t = a0 + ((a1 - a0) * i) / segs; return [rc + q * Math.cos(t), h + q * Math.sin(t)]; });
  const R = r, C = SUN.carve, q1 = 0.45, q2 = 0.55, c1 = R * C.rings[0] - q1, c2 = R * C.rings[1] - q2, rb = R * C.boss, inner = R - SUN.rim;
  const prof = [[R, -D], ...arc(R - 1.15, 1.15, 0.3 * D, 0, Math.PI, 8), [c1 + q1, 0.12 * D], ...arc(c1, q1, 0.12 * D, 0, Math.PI, 6), [c2 + q2, 0.32 * D], ...arc(c2, q2, 0.32 * D, 0, Math.PI, 6), [rb, 0.16 * D], ...arc(0, rb, 0.16 * D, 0, Math.PI / 2, 8).map(([x, y]) => [x, 0.16 * D + (y - 0.16 * D) * (1.9 * D / rb)])];
  prof[prof.length - 1][0] = 0.01;
  // The rim keeps its form far off; the field inside it, its rings and its boss give way to a plain field there.
  revolve(b, 'gold', prof.slice(0, 11), SUN.round, { place, turn, skip: (m) => m[2] < -0.9, smooth: true });
  const CARVED = { disc: 1, x: 0, cy, R };
  revolve(b, 'gold', prof.slice(10), SUN.round, { place, turn, skip: (m) => m[2] < -0.9, tag: CARVED });
  // Carved as the site's Sun stones are (src/stream/stone.ts), so it reads as a sun and not a wheel: no spoke runs
  // from the boss to the rim. A rim of beads; an outer band of plates with a sharp point between each two, the
  // sun's outer rays; a band of glyph blocks, broken by four great rays, wide wedges pointing out from the inner
  // ring, and four lesser ones; and round the boss the four squares of the stone's middle.
  const TAU = Math.PI * 2, n = SUN.outer, g = SUN.glyphs;
  // Nothing carved stands on the rim or past it, so the disc's outline is a true circle at any size: the beads are a
  // ring just inside it.
  for (let k = 0; k < SUN.beads; k++) plate(b, cy, inner - 1.1, inner - 0.2, ((k + 0.15) / SUN.beads) * TAU, ((k + 0.85) / SUN.beads) * TAU, 0.12 * D, 0.12 * D + 0.6, 0.18, CARVED);
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU, am = (a0 + a1) / 2;
    if (k % 2 === 0) plate(b, cy, R * C.band, inner - 1.4, a0 + 0.035, a1 - 0.035, 0.15 * D, 0.7 * D, 0.45, CARVED);
    else ray(b, cy, R * C.band, inner - 1.3, am, (a1 - a0) * 0.42, 0.15 * D, 1.05 * D, CARVED);
  }
  const great = (a) => Math.min(...[1, 3, 5, 7].map((q) => Math.abs(((a - (q * TAU) / 8 + TAU * 1.5) % TAU) - TAU / 2)));
  const lesser = (a) => Math.min(...[0, 2, 4, 6].map((q) => Math.abs(((a - (q * TAU) / 8 + TAU * 1.5) % TAU) - TAU / 2)));
  for (let k = 0; k < g; k++) {
    const a0 = ((k + 0.14) / g) * TAU, a1 = ((k + 0.86) / g) * TAU, am = (a0 + a1) / 2;
    if (great(am) < 0.3 || lesser(am) < 0.12) continue;
    plate(b, cy, R * C.glyphs[0], R * C.glyphs[1], a0, a1, 0.3 * D, 0.72 * D, 0.28, CARVED);
  }
  for (let q = 0; q < 8; q++) {
    const a = (q / 8) * TAU, big = q % 2 === 1;
    ray(b, cy, R * C.rays[0], big ? R * C.rays[1] : R * C.rays[2], a, big ? 0.36 : 0.15, 0.3 * D, big ? 1.4 * D : 1.0 * D, CARVED);
  }
  for (let q = 0; q < 4; q++) {
    const a = ((q + 0.5) / 4) * TAU;
    plate(b, cy, R * C.squares[0], R * C.squares[1], a - 0.32, a + 0.32, 0.35 * D, 0.95 * D, 0.2, CARVED);
  }
}

// Everything carved inside the disc's rim (its beads, plates, glyph blocks, rays, rings and boss) is tagged as such
// (CARVED in disc), with the disc's middle: where the disc is small on the screen it gives way to a plain field of
// deep gold with a darker ring, so the disc reads there as one coin in its rim and never glitters.
// A place on the disc: so far out from its middle and so far round from straight up, clockwise as seen, and so far
// out of its face.
const onDisc = (cy, r, a, h) => [r * Math.sin(a), cy + r * Math.cos(a), h];
// A plate: a raised block between two radii and two angles, its sides sloping in to a smaller flat top.
function plate(b, cy, r0, r1, a0, a1, h0, h1, m, tag) {
  const P = (r, a, h) => onDisc(cy, r, a, h), am = (a0 + a1) / 2, ia0 = a0 + m / r0, ia1 = a1 - m / r0;
  const lo = [P(r0, a0, h0), P(r1, a0, h0), P(r1, a1, h0), P(r0, a1, h0)], hi = [P(r0 + m, ia0, h1), P(r1 - m, ia0, h1), P(r1 - m, ia1, h1), P(r0 + m, ia1, h1)];
  const k = b.kit, outs = [[-Math.cos(a0), Math.sin(a0), 0.6], [Math.sin(am), Math.cos(am), 0.6], [Math.cos(a1), -Math.sin(a1), 0.6], [-Math.sin(am), -Math.cos(am), 0.6]];
  k.patch('gold', hi[0], hi[3], hi[2], hi[1], { want: [0, 0, 1], tag });
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; k.patch('gold', lo[i], lo[j], hi[j], hi[i], { want: outs[i], tag }); }
}
// A ray: a ridge running out from r0 to a point at r1, its two sides sloping down from the ridge, so one side of it
// takes the light and the other does not.
function ray(b, cy, r0, r1, a, half, h0, h1, tag) {
  const P = (r, t, h) => onDisc(cy, r, t, h), k = b.kit, tip = P(r1, a, h0 + 0.1);
  const L0 = P(r0, a - half, h0), R0 = P(r0, a + half, h0), top = P(r0, a, h1);
  k.patch('gold', L0, tip, tip, top, { want: [-Math.cos(a), Math.sin(a), 0.7], tag });
  k.patch('gold', top, tip, tip, R0, { want: [Math.cos(a), -Math.sin(a), 0.7], tag });
  k.patch('gold', R0, L0, top, top, { want: [-Math.sin(a), -Math.cos(a), 0.4], tag });
}

// Which design a building is built as, by its form, its roof and its own number.
export function design(t) {
  switch (t.form) {
    case 'obelisk': return obelisk;
    case 'disc': return disc;
    case 'point': return point;
    case 'deco': return t.roof === 'bronze' && t.seed > 0.55 && t.w < 34 ? (b, tt) => ringed(b, tt, 0, tt.w, tt.tall, 0.3) : deco;
    case 'slab': return slabTower;
    case 'fin': return finTower;
    case 'twin': return twin;
    case 'hall': return civic;
    case 'dome': return dome;
    default: return null;
  }
}
