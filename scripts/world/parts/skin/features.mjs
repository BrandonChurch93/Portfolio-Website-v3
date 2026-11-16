// What is on the skin, read off picture 9 in its own pixels and put on the planet's outer surface: the craters of
// the pale side, the cracks of the dark side, and the line each side is torn along (the rock's own, sculpt R's
// TORN, so the skin ends exactly where the rock begins). Everything here is made once, the same on every run.
//
//   import { SIDES, NAMED, TRACED, craters, crackLines, edges, onShell, shellNormal, toShell, frame } from './features.mjs'
import { L } from '../../lib/plan.mjs';
import { TORN } from '../rock-r/trace.mjs';
import { fbm } from './field.mjs';

const C = L.WORLD, RIM = L.RIM, A2 = C.half * C.half, C2 = C.deep * C.deep;
export const CENTER = [0, -RIM, 0];

// The outward normal of the planet's outer surface at a place on or near it.
export function shellNormal(x, y, z) {
  const gx = x / A2, gy = Math.min(0, y + RIM) / C2, gz = z / A2, l = Math.hypot(gx, gy, gz) || 1;
  return [gx / l, gy / l, gz / l];
}
// The place on the outer surface nearest a place close to it, taken along the line from the planet's middle.
export function toShell(x, y, z) {
  const s = L.shell(x, y, z) || 1;
  return [x / s, -RIM + (y + RIM) / s, z / s];
}
// Two directions along the surface at a place: round the planet, and down it.
export function frame(n) {
  let ax = n[2], az = -n[0];
  const l = Math.hypot(ax, az);
  if (l < 1e-6) { ax = 1; az = 0; } else { ax /= l; az /= l; }
  const e1 = [ax, 0, az];
  const e2 = [n[1] * e1[2] - n[2] * e1[1], n[2] * e1[0] - n[0] * e1[2], n[0] * e1[1] - n[1] * e1[0]];
  return [e1, e2];
}

// The place on the outer surface seen at a pixel of the picture: the nearest to the visitor of where the line of
// sight meets it. A pixel just outside the planet's outline is moved in to the outline, and says so.
export function onShell(px, py) {
  for (let k = 0; k <= 40; k++) {
    const x = px + (px < L.PICTURE.mid ? k : -k) * 0.5, p = sight(x, py);
    if (p) { if (k) console.log(`skin: ${px}, ${py} is outside the planet's outline, put at ${x}`); return p; }
  }
  return null;
}
function sight(px, py) {
  const f = (z) => L.shell(...L.fromPicture(px, py, z)) - 1;
  let prev = f(800), hit = null;
  for (let z = 790; z >= -800; z -= 10) { const v = f(z); if ((v < 0) !== (prev < 0)) { hit = [z, z + 10]; break; } prev = v; }
  if (!hit) return null;
  let [a, b] = hit, fa = f(a);
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2, fm = f(m); if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m; }
  return L.fromPicture(px, py, (a + b) / 2);
}

export function tornAt(side, py) {
  const line = TORN[side];
  if (py <= line[0][1]) return line[0][0];
  for (let i = 1; i < line.length; i++) if (py <= line[i][1]) { const [x0, y0] = line[i - 1], [x1, y1] = line[i]; return x0 + ((x1 - x0) * (py - y0)) / (y1 - y0); }
  return line[line.length - 1][0];
}

// The two sides that survive, each as the part of the surface between the line it is torn along and a little past
// where it turns from the visitor (out, in degrees round from straight in front).
export const SIDES = { left: { sign: -1, out: -97 }, right: { sign: 1, out: 97 } };

// The line the skin ends along. The rock's torn line (TORN) is a sawtooth of even notches, and a crust that followed
// it drew an even stepped ribbon: the skin is taken out to the sawtooth's outer points (how far each way it looks, and
// how far it is then smoothed, in the picture's pixels), so its notches lie under the crust's broken chunks.
const HULL = { reach: 13, soft: 7, step: 0.5 };
const LINES = {};
function hull(side) {
  if (LINES[side]) return LINES[side];
  const s = SIDES[side].sign, line = TORN[side], y0 = line[0][1], y1 = line[line.length - 1][1], n = Math.round((y1 - y0) / HULL.step) + 1;
  // Toward the hollow is up here: the left side's hollow is to its right, the right side's to its left.
  const raw = Array.from({ length: n }, (_, i) => -s * tornAt(side, y0 + i * HULL.step)), W = Math.round(HULL.reach / HULL.step);
  const most = raw.map((_, i) => { let m = -Infinity; for (let j = Math.max(0, i - W); j <= Math.min(n - 1, i + W); j++) m = Math.max(m, raw[j]); return m; });
  const G = Math.round((HULL.soft * 2.5) / HULL.step), soft = most.map((_, i) => {
    let a = 0, w = 0;
    for (let j = -G; j <= G; j++) { const k = Math.min(n - 1, Math.max(0, i + j)), g = Math.exp(-0.5 * ((j * HULL.step) / HULL.soft) ** 2); a += most[k] * g; w += g; }
    return Math.max(a / w, raw[i] + 0.4);
  });
  return (LINES[side] = { y0, n, at: soft.map((v) => -s * v) });
}
export function hullAt(side, py) {
  const h = hull(side), f = Math.min(h.n - 1, Math.max(0, (py - h.y0) / HULL.step)), i = Math.min(h.n - 2, Math.floor(f));
  return h.at[i] + (h.at[i + 1] - h.at[i]) * (f - i);
}
// At the top of the dark side the crust did not break where the rock below it did: a great pale slab of it runs on
// out over the hollow under the land's lip, broken off in a step, with a smaller block under it. Its outline in
// picture 9, across at each place down: the skin runs out to it, past the rock's torn line.
export const SLAB = [[312, 344], [318, 347], [326, 346], [334, 342], [341, 336], [346, 327], [349, 316], [352, 311], [362, 309], [374, 307], [386, 306], [395, 302], [401, 294], [406, 286], [411, 279]];
export function slabAt(py) {
  if (py < SLAB[0][0] || py > SLAB[SLAB.length - 1][0]) return -Infinity;
  let i = 1;
  while (i < SLAB.length - 1 && SLAB[i][0] < py) i++;
  const [y0, x0] = SLAB[i - 1], [y1, x1] = SLAB[i];
  return x0 + ((x1 - x0) * (py - y0)) / (y1 - y0);
}
// The line each side is torn along. The great slab at the top of the dark side is one of the crust's blocks now
// (blocks.mjs), and the skin is not run out past this line to make it.
export function lineAt(side, py) {
  return hullAt(side, py);
}

// Where a side's torn line crosses a ring of the surface so far down (t): the angle round, in radians, or null where
// the ring has nothing of that side in front of the line.
export function edgeAngle(side, t, line = lineAt) {
  const s = SIDES[side].sign, f = (th) => { const [px, py] = L.pictured(...L.skinAt(th, t)); return s * (line(side, py) - px); };
  let a = s * 5 * L.D2R, b = s * 90 * L.D2R;
  if (f(a) * f(b) > 0) return null;
  for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (f(m) * f(a) > 0) a = m; else b = m; }
  return (a + b) / 2;
}

// ---------------------------------------------------------------------------------------------------------------
// The craters, in the picture's pixels: where the middle is, the radius of the rim's crest, and what kind. The
// two the kit names are first. kind: 'complex' has a flat floor and terraced walls, 'simple' is a bowl.
// One large crater is cut through by the torn edge, which shows the craters are older than the break. `exact` puts a
// crater at the picture's own place, not moved in proportion between the torn line and the outline.
export const NAMED = [
  { at: [1173, 421], r: 49, kind: 'complex', seed: 1 },
  { at: [1097, 584], r: 43, kind: 'complex', seed: 2 },
  { at: [1104, 374], r: 15, kind: 'simple', seed: 3 },
  { at: [1222, 350], r: 9, kind: 'simple', seed: 4 },
  { at: [1250, 364], r: 12, kind: 'simple', seed: 5 },
  { at: [1229, 470], r: 17, kind: 'simple', seed: 6, exact: true },
  { at: [1165, 523], r: 14, kind: 'simple', seed: 7, exact: true },
  { at: [1100, 496], r: 9, kind: 'simple', seed: 8 },
  { at: [1124, 489], r: 6, kind: 'simple', seed: 9 },
  { at: [1137, 614], r: 8, kind: 'simple', seed: 10 },
  { at: [1112, 642], r: 7, kind: 'simple', seed: 11 },
  { at: [1063, 462], r: 30, kind: 'complex', seed: 12 },
  { at: [1150, 352], r: 6, kind: 'simple', seed: 13 },
  { at: [1196, 560], r: 7, kind: 'simple', seed: 14 },
  { at: [1078, 660], r: 9, kind: 'simple', seed: 15 },
  { at: [1208, 330], r: 5, kind: 'simple', seed: 16 },
  { at: [1088, 410], r: 7, kind: 'simple', seed: 17 },
  // Two small ones on the large crater's floor, younger than it.
  { at: [1158, 436], r: 3.4, kind: 'simple', seed: 18, exact: true },
  { at: [1183, 409], r: 2.6, kind: 'simple', seed: 19, exact: true },
];

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The scatter of smaller craters made as geometry, on the pale side: so many between each pair of radii, in units,
// many small and few large, as a power law has them.
// The smallest are left to the map's pits: made as geometry and reduced, they came out as star shaped dents.
const SCATTER = [[3.6, 6, 120], [6, 10, 52], [10, 16, 13]];
// And old worn ones on the dark side, so it is the same planet: shallow and soft, the oldest nearly gone.
const WORN = [[5, 10, 34], [10, 20, 14], [20, 34, 5], [34, 52, 2]];

// depth and rim are shares of the radius. A crater's lip stands up sharply from the ground round it: it is what
// catches the moon as a thin bright line on the side away from it. A large one is a broad flat floor with a small
// bump at its middle inside smooth walls: shallow enough that the moon, low over this side, leaves a crescent of
// shadow on the wall toward it and lights the floor. Terraces drew rings like contour lines, and gullies combed the
// shadow's edge into streaks.
function crater(c, r, kind, seed, worn = 0, deep = 1, own = {}) {
  const n = shellNormal(...c), [e1, e2] = frame(n), R = rng(seed * 7919 + 13);
  const complex = kind === 'complex';
  return {
    c, n, e1, e2, r, seed,
    depth: (complex ? 0.19 : 0.44) * deep * r * (0.88 + 0.24 * R()) * (1 - 0.72 * worn),
    rim: (complex ? 0.12 : 0.19) * r * (0.85 + 0.3 * R()) * (1 - 0.7 * worn),
    floor: complex ? 0.56 + 0.1 * R() : 0,
    bump: complex ? 0.1 + 0.08 * R() : 0,
    lumpy: 0.04 + 0.05 * R(),
    phase: R() * 100,
    // How fast the rim falls away outside (its outer flank), the slumped terraces of its inner wall (how many, and
    // how strongly), and the hummocks on its floor, as a share of its depth.
    flank: 2.3, terraces: 0, slump: 0, hummock: 0.025,
    worn,
    ...own,
  };
}
// The two large craters picture 9 has, as it has them. The large one: a broad rampart whose outer flank, turned from
// the moon on the side away from it, lies in shadow (the picture's dark band left of it); a wall slumped in two
// broken terraces; a broad floor with low hummocks and a small cluster of hills at its middle. The low one: a deep
// bowl with a small floor, so its far wall catches the light and its floor lies in its shade, as the picture's does.
// The large one's rampart is raised and broad, its inner wall wide enough to show as a band the moon lights on its
// left and lower side, and it is no deeper than leaves a narrow crescent of shadow. It is not drawn out round the
// planet: drawn out by 1.28 it came out a fifth wider than the picture's.
const OWN = {
  1: { rim: 0.2, flank: 3.6, crest: 0.14, floor: 0.62, terraces: 1, slump: 0.6, hummock: 0.04, bump: 0.07, deepen: 0.88, moat: [0.12, 0.42, 0.26] },
  2: { rim: 0.14, flank: 1.6, crest: 0.1, floor: 0.26, terraces: 1, slump: 0.3, hummock: 0.04, bump: 0.08, deepen: 0.95 },
  6: { deepen: 1.5 },
  7: { deepen: 1.35 },
};

const areaAt = (t) => { const r = Math.sqrt(1 - t * t), dr = (C.half * t) / r; return r * Math.hypot(dr, C.deep); };
const AREA_MOST = Math.max(...Array.from({ length: 87 }, (_, i) => areaAt(i / 100)));
// Craters are gathered toward the torn line and down toward the lower limb, with broad smooth bands between.
function scatterOn(side, R, even = 0.14) {
  for (;;) {
    const t = R() * 0.9, th = SIDES[side].sign * (20 + 75 * R()) * L.D2R;
    if (R() * AREA_MOST > areaAt(t)) continue;
    const e = edgeAngle(side, t);
    if (e === null || SIDES[side].sign * (th - e) < 0) continue;
    const p = L.skinAt(th, t), [px, py] = L.pictured(...p);
    if (py < 290) continue;
    const ring = C.half * Math.sqrt(Math.max(0, 1 - t * t)), fromEdge = Math.abs(th - e) * ring;
    const toward = Math.max(Math.exp(-fromEdge / 90), Math.min(1, Math.max(0, (t - 0.4) / 0.4)));
    const band = Math.min(1, Math.max(0, 0.5 + 2.2 * fbm(p[0] / 90 + 4, p[1] / 60, p[2] / 90, 3)));
    if (R() > even + (1 - even) * toward * (0.25 + 0.75 * band)) continue;
    return { p, px, py, t };
  }
}

// The pale side's outline in picture 9, read off a ruled enlargement: across at each place down. Where the planet's
// own outline (the plan's) lies inside it, a crater is put as far between the torn line and the outline as the
// picture has it, so the craters near the limb stay on the planet and keep their order.
const LIMB = [[283, 1280], [320, 1273], [360, 1268], [400, 1263], [440, 1253], [480, 1243], [520, 1233], [560, 1213], [600, 1190], [640, 1160], [680, 1123], [700, 1095]];
const limbOf = (py) => { let i = 1; while (i < LIMB.length - 1 && LIMB[i][0] < py) i++; const [y0, x0] = LIMB[i - 1], [y1, x1] = LIMB[i]; return x0 + ((x1 - x0) * (py - y0)) / (y1 - y0); };
function outline(py) {
  let best = -Infinity;
  for (let t = 0; t <= 0.95; t += 0.0025) for (let d = 60; d <= 110; d += 1) { const [px, y] = L.pictured(...L.skinAt(d * L.D2R, t)); if (Math.abs(y - py) < 1.2) best = Math.max(best, px); }
  return best;
}
export function placed(px, py) {
  const torn = tornAt('right', py), pic = limbOf(py), ours = outline(py);
  if (!Number.isFinite(ours) || px <= torn) return onShell(px, py);
  return onShell(torn + ((px - torn) * (ours - 1.5 - torn)) / (pic - torn), py);
}

export function craters() {
  // The named craters are the picture's: deep, so their crescents of shadow read from across the room.
  const out = NAMED.map((k) => {
    const own = OWN[k.seed] ?? {}, r = k.r * L.PICTURE.unit, made = crater((k.exact ? onShell : placed)(k.at[0], k.at[1]), r, k.kind, k.seed, 0, (k.r > 45 ? 1.2 : k.r > 40 ? 1.45 : k.r > 12 ? 1.15 : 1.1) * (own.deepen ?? 1), {});
    // A named crater's own shape: its rim and bump as shares of its radius, the rest as they are.
    return { ...made, ...own, rim: own.rim ? own.rim * r : made.rim, bump: own.bump ?? made.bump, floor: own.floor ?? made.floor };
  });
  const R = rng(4242);
  let seed = 100;
  // None on the floors of the two the kit names, which are broad and smooth, nor on their steep outer flanks, where
  // one stood up as a pale fin.
  const big = out.slice(0, 2);
  for (const [lo, hi, count] of SCATTER) for (let i = 0; i < count; i++) {
    let p, r;
    // None in the shoulder under the land's lip, where its edge cut them in half in a row of dimples.
    do { p = scatterOn('right', R).p; r = lo * (hi / lo) ** R(); } while (-L.RIM - p[1] < 30 + 1.5 * r || big.some((k) => Math.hypot(p[0] - k.c[0], p[1] - k.c[1], p[2] - k.c[2]) < k.r * 1.6 + r));
    out.push(crater(p, r, r > 9 ? 'complex' : 'simple', seed++));
  }
  // None round the knot of the cracks, whose light lies on smooth rock.
  const knot = onShell(...KNOT);
  for (const [lo, hi, count] of WORN) for (let i = 0; i < count; i++) {
    // Nor high up: one there drew a faint arch like a doorway under the land.
    let w = scatterOn('left', R, 0.45);
    while (Math.hypot(w.p[0] - knot[0], w.p[1] - knot[1], w.p[2] - knot[2]) < 70 || w.py < 352) w = scatterOn('left', R, 0.45);
    const p = w.p;
    const r = lo * (hi / lo) ** R();
    out.push(crater(p, r, r > 14 ? 'complex' : 'simple', seed++, 0.55 + 0.35 * R()));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The cracks of the dark side, in the picture's pixels: each a run of points, each point with the half width of the
// cleft there in units and how hot its light is (1 pale gold, under 0.3 ember). The knot is at 225, 478. They run
// straight and turn sharply. heat 0 is a dark fissure with no light in it.
export const KNOT = [225, 478];
// The traced widths are what the picture shows at its size; the clefts are cut this much wider so they read as clefts.
const WIDEN = 1.55;
export const TRACED = [
  // to the tear: the widest and hottest
  [[225, 478, 4.6, 1], [236, 474, 3.9, 1], [246, 472, 3.4, 1], [252, 470, 3.3, 1], [259, 469, 3.3, 1], [268, 468, 3, 0.96]],
  // down and to the left, then along: thick and hot as far as the turn up at its far end
  [[225, 478, 4, 1], [222, 492, 3.3, 0.97], [218, 503, 2.9, 0.93], [205, 507, 2.3, 0.88], [192, 505, 1.7, 0.84], [181, 508, 1.3, 0.78], [172, 499, 0.7, 0.6], [163, 491, 0.55, 0.5], [151, 484, 0.4, 0.4], [144, 481, 0.2, 0.28]],
  // up and to the left
  [[225, 478, 2.8, 1], [217, 471, 1.8, 0.9], [208, 463, 1.25, 0.8], [199, 454, 1.05, 0.72], [191, 446, 0.9, 0.66], [181, 437, 0.8, 0.6], [172, 427, 0.7, 0.55], [163, 418, 0.6, 0.48], [154, 410, 0.5, 0.42], [147, 404, 0.35, 0.34], [141, 401, 0.18, 0.25]],
  // down and to the right, thin, then thick and hot again toward the second knot at the foot
  [[221, 500, 1.5, 0.85], [226, 514, 0.7, 0.62], [230, 528, 0.55, 0.56], [234, 543, 0.75, 0.6], [237, 557, 1.5, 0.78], [240, 571, 1.9, 0.86], [242, 584, 2.3, 0.92], [247, 594, 0.9, 0.64], [252, 603, 0.6, 0.5], [258, 612, 0.4, 0.4]],
  // from the second knot, to the left
  [[242, 585, 2.0, 0.9], [234, 584, 1.4, 0.8], [226, 585, 0.85, 0.64], [219, 584, 0.55, 0.52], [212, 581, 0.3, 0.4]],
  // the long arm up from above the knot
  [[178, 432, 0.7, 0.55], [184, 424, 0.65, 0.52], [190, 414, 0.62, 0.5], [199, 408, 0.6, 0.48], [208, 403, 0.62, 0.5], [212, 397, 0.6, 0.48], [214, 386, 0.55, 0.46], [212, 372, 0.5, 0.42], [208, 360, 0.42, 0.38], [205, 348, 0.32, 0.32], [203, 336, 0.18, 0.24]],
  // a thin arm down from that one
  [[208, 403, 0.4, 0.42], [212, 418, 0.35, 0.38], [217, 432, 0.32, 0.35], [221, 446, 0.3, 0.34], [223, 456, 0.32, 0.4]],
  // a short arm off the long one, down to the left
  [[190, 414, 0.38, 0.4], [188, 424, 0.3, 0.34], [187, 435, 0.2, 0.28]],
  // a short arm down from the run along the foot
  [[181, 506, 0.45, 0.45], [182, 517, 0.35, 0.38], [184, 530, 0.22, 0.3]],
  // the small one high at the left
  [[124, 366, 0.25, 0.28], [133, 368, 0.4, 0.4], [141, 372, 0.35, 0.36], [146, 378, 0.2, 0.26]],
  // dark fissures, weathered, with no light in them
  [[150, 330, 0.5, 0], [158, 352, 0.45, 0], [163, 371, 0.4, 0], [170, 395, 0.3, 0]],
  [[240, 410, 0.45, 0], [248, 428, 0.4, 0], [257, 446, 0.35, 0]],
  [[178, 540, 0.5, 0], [190, 556, 0.42, 0], [202, 572, 0.35, 0], [214, 586, 0.25, 0]],
  [[118, 420, 0.35, 0], [128, 444, 0.3, 0], [140, 468, 0.25, 0]],
];

// Hairline fissures over the rest of the dark side, unlit, each a few straight lengths that turn sharply and thin to
// nothing: the picture's dark face has them, and without them it read as clay.
function hairlines() {
  const R = rng(5150), out = [];
  for (let n = 0; out.length < 12 && n < 400; n++) {
    let px = 110 + 150 * R(), py = 320 + 360 * R();
    if (px > hullAt('left', py) - 10 || Math.hypot(px - KNOT[0], py - KNOT[1]) < 34 || !sight(px, py)) continue;
    let a = (R() < 0.7 ? Math.PI / 2 : 0) + (R() - 0.5) * 1.6, w = 0.32 + 0.16 * R();
    const legs = 3 + Math.floor(4 * R()), run = [[px, py, w, 0]];
    for (let k = 0; k < legs; k++) {
      const len = 5 + 10 * R();
      px += Math.cos(a) * len; py += Math.sin(a) * len; w *= 0.8;
      if (px > hullAt('left', py) - 6 || px < 100 || !sight(px, py)) break;
      run.push([px, py, k === legs - 1 ? 0.12 : w, 0]);
      a += (R() - 0.5) * 1.3;
    }
    if (run.length > 2) out.push(run);
  }
  return out;
}

// The cracks as the shader cuts them: runs of short straight lengths in picture 9's own pixels, each end with its
// half width in pixels and its heat. The view never moves, so a cleft worked out per pixel from these lines keeps a
// crisp, chipped lip at any zoom, where one stored in a map came out as a staircase of texels.
// Each arm is resampled every STEP pixels and bent off its traced line at two grains (BEND: how far, and over how
// many pixels) and jittered at each point (so far), so no arm is a polyline and none is a smooth curve. Its width swells and pinches by three times over along it (SWELL: the
// narrowest and widest share, over how many pixels), the light dies before the width does on every arm but the hot
// one (DIES: the share of a lit run past which its heat falls to nothing), the rock closes over a lit arm in places
// (SHUT: not before so far along it, how often, in pixels, how long, how much of the width is left there, and the share
// of them where it closes over wholly; at the rest a dim glow is left), and past its last traced point an
// arm runs on as an unlit fissure (RUN_ON, in pixels) that thins to a hairline. Random side branches read as sprays
// of whiskers and are gone.
const STEP = 1.3, BEND = { amp: [1.25, 0.45], every: [9, 3.1], jitter: 0.32 }, SWELL = { low: 0.5, high: 1.5, every: 13 };
const DIES = [0.8, 1], RUN_ON = [7, 18], SHUT = { first: 16, every: [34, 70], long: [1.2, 2.6], left: 0.35, dark: 0.55 };
const sm1 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function wobble(s, seed) {
  const i = Math.floor(s), f = s - i, h = (k) => rng(seed * 1009 + k * 7)();
  return h(i) + (h(i + 1) - h(i)) * f * f * (3 - 2 * f);
}
export function crackLines() {
  const R = rng(777), runs = [];
  const px = 1 / L.PICTURE.unit;
  TRACED.forEach((tr, ri) => {
    const pts = [];
    for (let i = 0; i < tr.length; i++) {
      const [x, y, w, heat] = tr[i];
      pts.push([x, y, w * WIDEN * px, heat]);
      if (i === tr.length - 1) break;
      const [qx, qy, qw, qh] = tr[i + 1], dx = qx - x, dy = qy - y, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
      const kinks = len > 9 ? 2 : len > 5 ? 1 : 0;
      for (let k = 1; k <= kinks; k++) {
        const f = (k / (kinks + 1)) + (R() - 0.5) * 0.18, off = (R() - 0.5) * Math.min(3.2, len * 0.22);
        pts.push([x + dx * f + nx * off, y + dy * f + ny * off, (w + (qw - w) * f) * WIDEN * px, heat + (qh - heat) * f]);
      }
    }
    runs.push({ pts, open: ri === 0, lit: pts[0][3] > 0 });
  });
  for (const tr of hairlines()) runs.push({ pts: tr.map(([x, y, w]) => [x, y, w * px * 0.8, 0]), open: false, lit: false });
  // The hot arm runs on to the line the skin ends along, and is open to the break there.
  {
    const run = runs[0].pts, last = run[run.length - 1], py = TRACED[0][TRACED[0].length - 1][1];
    run.push([lineAt('left', py) + 2, py + 0.5, last[2] * 1.05, last[3]]);
  }
  const segs = [];
  runs.forEach((run, ri) => {
    let pts = run.pts;
    if (!run.open && pts.length > 1) {
      const last = pts[pts.length - 1], prev = pts[pts.length - 2];
      let ang = Math.atan2(last[1] - prev[1], last[0] - prev[0]), p = [last[0], last[1]], w = Math.max(last[2], 0.22);
      const total = RUN_ON[0] + (RUN_ON[1] - RUN_ON[0]) * R(), legs = 2 + Math.floor(R() * 2);
      pts = [...pts.slice(0, -1), [last[0], last[1], w, last[3]]];
      for (let k = 0; k < legs; k++) {
        ang += (R() - 0.5) * 0.8;
        const len = (total / legs) * (0.7 + 0.6 * R());
        p = [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len];
        w *= k === legs - 1 ? 0.25 : 0.62;
        if (p[0] > lineAt('left', p[1]) - 3) break;
        pts.push([p[0], p[1], w, 0]);
      }
    }
    // Resampled along its length: place, half width, heat and how far along it is.
    const along = [0];
    for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = along[along.length - 1], tracedEnd = run.lit && !run.open ? along[Math.max(0, run.pts.length - 1)] : total;
    const out = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const n = Math.max(1, Math.round((along[i + 1] - along[i]) / STEP));
      for (let k = 0; k < n; k++) out.push([...[0, 1, 2, 3].map((c) => pts[i][c] + ((pts[i + 1][c] - pts[i][c]) * k) / n), along[i] + ((along[i + 1] - along[i]) * k) / n]);
    }
    out.push([...pts[pts.length - 1], total]);
    // Where the rock closes over a lit arm: never near where it leaves another arm, nor on the hot arm.
    const shut = [];
    if (run.lit && !run.open) for (let s = SHUT.first + SHUT.every[0] * R(); s < tracedEnd * 0.85; s += SHUT.every[0] + (SHUT.every[1] - SHUT.every[0]) * R()) shut.push([s, SHUT.long[0] + (SHUT.long[1] - SHUT.long[0]) * R(), R() < SHUT.dark ? 1 : 0.75]);
    const seed = ri + 31, bent = out.map((o, i) => {
      const a = out[Math.max(0, i - 2)], b = out[Math.min(out.length - 1, i + 2)], tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / tl, ny = (b[0] - a[0]) / tl;
      const s = o[4], off = (BEND.amp[0] * (wobble(s / BEND.every[0], seed) - 0.5) * 2 + BEND.amp[1] * (wobble(s / BEND.every[1], seed + 400) - 0.5) * 2 + BEND.jitter * (R() - 0.5) * 2) * sm1(0, 5, s) * (run.open ? sm1(0, 4, total - s) : 1);
      return [o[0] + nx * off, o[1] + ny * off];
    });
    for (let i = 0; i < out.length; i++) {
      const o = out[i], s = o[4];
      o[0] = bent[i][0]; o[1] = bent[i][1];
      // Swelling and pinching by up to three times, less at the very ends, so a tip still thins to its hairline.
      const sw = SWELL.low + (SWELL.high - SWELL.low) * wobble(s / SWELL.every, seed + 77) ** 1.3, ends = sm1(0, 5, s) * sm1(0, 5, total - s);
      o[2] *= 1 + (sw * (run.open ? 0.6 : 1) + (run.open ? 0.4 : 0) - 1) * ends;
      if (run.lit) {
        // A wider stretch is hotter, a pinched one cooler; where the rock closes over, the light goes.
        o[3] *= Math.min(1, 0.72 + 0.28 * sw);
        let closed = 0;
        for (const [c, l, k] of shut) closed = Math.max(closed, k * (1 - sm1(l * 0.5, l, Math.abs(s - c))));
        o[3] *= 1 - closed;
        o[2] *= 1 - (1 - SHUT.left) * closed;
        if (!run.open) o[3] *= 1 - sm1(DIES[0] * tracedEnd, DIES[1] * tracedEnd, s);
      }
    }
    for (let i = 0; i + 1 < out.length; i++) segs.push([out[i][0], out[i][1], out[i + 1][0], out[i + 1][1], out[i][2], out[i + 1][2], out[i][3], out[i + 1][3]]);
  });
  return segs;
}

// The line each side ends along, on the surface, as a run of points close together, each with how far along the
// line it is, in units (its fourth number).
export function edges() {
  const out = {};
  for (const side of ['left', 'right']) {
    const line = TORN[side], pts = [];
    let s = 0;
    for (let py = line[0][1]; py <= line[line.length - 1][1]; py += 0.5) {
      const p = sight(lineAt(side, py), py);
      if (!p) continue;
      const q = pts[pts.length - 1];
      if (q) s += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      pts.push([p[0], p[1], p[2], s]);
    }
    out[side] = pts;
  }
  return out;
}
