// What is on the skin, read off picture 9 in its own pixels and put on the planet's outer surface: the craters of
// the pale side, the cracks of the dark side, and the line each side is torn along (the rock's own, sculpt R's
// TORN, so the skin ends exactly where the rock begins). Everything here is made once, the same on every run.
//
//   import { SIDES, CRATERS, CRACKS, EDGES, onShell, shellNormal, toShell, frame } from './features.mjs'
import { L } from '../../lib/plan.mjs';
import { TORN } from '../rock-r/trace.mjs';

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
export const SIDES = { left: { sign: -1, out: -98 }, right: { sign: 1, out: 98 } };

// Where a side's torn line crosses a ring of the surface so far down (t): the angle round, in radians, or null where
// the ring has nothing of that side in front of the line.
export function edgeAngle(side, t) {
  const s = SIDES[side].sign, f = (th) => { const [px, py] = L.pictured(...L.skinAt(th, t)); return s * (tornAt(side, py) - px); };
  let a = s * 5 * L.D2R, b = s * 90 * L.D2R;
  if (f(a) * f(b) > 0) return null;
  for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (f(m) * f(a) > 0) a = m; else b = m; }
  return (a + b) / 2;
}

// ---------------------------------------------------------------------------------------------------------------
// The craters, in the picture's pixels: where the middle is, the radius of the rim's crest, and what kind. The
// two the kit names are first. kind: 'complex' has a flat floor and terraced walls, 'simple' is a bowl.
// One large crater is cut through by the torn edge, which shows the craters are older than the break.
export const NAMED = [
  { at: [1176, 412], r: 53, kind: 'complex', seed: 1 },
  { at: [1097, 584], r: 43, kind: 'complex', seed: 2 },
  { at: [1104, 374], r: 15, kind: 'simple', seed: 3 },
  { at: [1222, 350], r: 9, kind: 'simple', seed: 4 },
  { at: [1250, 364], r: 12, kind: 'simple', seed: 5 },
  { at: [1232, 482], r: 22, kind: 'complex', seed: 6 },
  { at: [1161, 527], r: 14, kind: 'simple', seed: 7 },
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

// The scatter of smaller craters made as geometry, on the pale side: so many between each pair of radii, in units.
const SCATTER = [[3, 4.5, 70], [4.5, 7, 34], [7, 11, 14], [11, 16, 5]];
// And as a few old worn ones on the dark side, so it is the same planet: shallow and soft.
const WORN = [[6, 14, 7], [14, 26, 3]];

function crater(c, r, kind, seed, worn = 0) {
  const n = shellNormal(...c), [e1, e2] = frame(n), R = rng(seed * 7919 + 13);
  const complex = kind === 'complex';
  return {
    c, n, e1, e2, r, seed,
    depth: (complex ? 0.25 : 0.34) * r * (0.85 + 0.3 * R()) * (1 - 0.7 * worn),
    rim: (complex ? 0.06 : 0.09) * r * (0.8 + 0.4 * R()) * (1 - 0.6 * worn),
    floor: complex ? 0.5 + 0.12 * R() : 0,
    terraces: complex ? 1 + Math.floor(R() * 2.2) : 0,
    gullies: complex ? Math.round(18 + 22 * R()) : 0,
    lumpy: 0.04 + 0.05 * R(),
    phase: R() * 100,
    worn,
  };
}

const areaAt = (t) => { const r = Math.sqrt(1 - t * t), dr = (C.half * t) / r; return r * Math.hypot(dr, C.deep); };
const AREA_MOST = Math.max(...Array.from({ length: 87 }, (_, i) => areaAt(i / 100)));
function scatterOn(side, R) {
  for (;;) {
    const t = R() * 0.86, th = SIDES[side].sign * (20 + 75 * R()) * L.D2R;
    if (R() * AREA_MOST > areaAt(t)) continue;
    const e = edgeAngle(side, t);
    if (e === null || SIDES[side].sign * (th - e) < 0) continue;
    const p = L.skinAt(th, t), [px, py] = L.pictured(...p);
    if (py < 290) continue;
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
  const out = NAMED.map((k) => crater(placed(k.at[0], k.at[1]), k.r * L.PICTURE.unit, k.kind, k.seed));
  const R = rng(4242);
  let seed = 100;
  for (const [lo, hi, count] of SCATTER) for (let i = 0; i < count; i++) {
    const { p } = scatterOn('right', R), r = lo * (hi / lo) ** R();
    out.push(crater(p, r, r > 9 ? 'complex' : 'simple', seed++));
  }
  for (const [lo, hi, count] of WORN) for (let i = 0; i < count; i++) {
    const { p } = scatterOn('left', R), r = lo * (hi / lo) ** R();
    out.push(crater(p, r, 'simple', seed++, 0.75));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The cracks of the dark side, in the picture's pixels: each a run of points, each point with the half width of the
// cleft there in units and how hot its light is (1 pale gold, under 0.3 ember). The knot is at 225, 478. They run
// straight and turn sharply. heat 0 is a dark fissure with no light in it.
export const KNOT = [225, 478];
// The traced widths are what the picture shows at its size; the clefts are cut this much wider so they read as clefts.
const WIDEN = 1.25;
export const TRACED = [
  // to the tear: the widest and hottest
  [[225, 478, 2.4, 1], [236, 474, 2.2, 1], [246, 472, 2.1, 1], [252, 470, 2.3, 1], [259, 469, 2.6, 1]],
  // down and to the left, then along
  [[225, 478, 2.2, 1], [221, 492, 1.9, 0.95], [217, 503, 1.6, 0.9], [205, 506, 1.2, 0.8], [192, 505, 1.0, 0.72], [181, 506, 0.85, 0.62], [172, 499, 0.7, 0.55], [163, 491, 0.55, 0.45], [151, 484, 0.4, 0.36], [144, 481, 0.2, 0.25]],
  // up and to the left
  [[225, 478, 2, 1], [217, 473, 1.6, 0.92], [208, 463, 1.25, 0.82], [199, 454, 1.05, 0.75], [191, 446, 0.9, 0.7], [181, 437, 0.8, 0.62], [172, 427, 0.7, 0.55], [163, 418, 0.6, 0.48], [154, 410, 0.5, 0.42], [147, 404, 0.35, 0.34], [141, 401, 0.18, 0.25]],
  // down and to the right, and on toward the foot
  [[222, 497, 1.7, 0.92], [229, 512, 1.4, 0.82], [234, 527, 1.15, 0.74], [238, 544, 1.0, 0.68], [240, 560, 0.95, 0.66], [242, 574, 1.0, 0.7], [243, 584, 1.05, 0.74], [247, 593, 0.8, 0.6], [252, 602, 0.6, 0.5], [258, 612, 0.4, 0.4]],
  // from the turn at the foot, to the left
  [[243, 584, 0.9, 0.7], [236, 583, 0.75, 0.6], [228, 585, 0.6, 0.52], [221, 585, 0.45, 0.45], [214, 580, 0.3, 0.35]],
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

// The cracks as runs of segments on the surface, with every run broken into straight lengths that turn sharply,
// and short branches off them that taper to nothing.
export function cracks() {
  const R = rng(777), runs = [];
  const lift = (px, py) => onShell(px, py);
  for (const tr of TRACED) {
    const pts = [];
    for (let i = 0; i < tr.length; i++) {
      const [px, py, w, heat] = tr[i];
      pts.push({ p: lift(px, py), w: w * WIDEN, heat });
      if (i === tr.length - 1) break;
      // A kink or two between traced points: rock breaks in straight runs with sharp turns.
      const [qx, qy, qw, qh] = tr[i + 1], dx = qx - px, dy = qy - py, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
      const kinks = len > 9 ? 2 : len > 5 ? 1 : 0;
      for (let k = 1; k <= kinks; k++) {
        const f = (k / (kinks + 1)) + (R() - 0.5) * 0.18, off = (R() - 0.5) * Math.min(3.2, len * 0.22);
        pts.push({ p: lift(px + dx * f + nx * off, py + dy * f + ny * off), w: (w + (qw - w) * f) * WIDEN, heat: heat + (qh - heat) * f });
      }
    }
    runs.push(pts);
  }
  // Branches: from lit runs only, off a point, at an angle, in two to four straight lengths, thinning to nothing.
  const branches = [];
  for (const run of runs.slice(0, 10)) for (let i = 1; i < run.length - 1; i++) {
    const a = run[i];
    if (a.heat <= 0 || R() > 0.2) continue;
    const b = run[i + 1], n = shellNormal(...a.p);
    const dir = [b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]], dl = Math.hypot(...dir);
    if (dl < 1e-6) continue;
    const t1 = dir.map((v) => v / dl), side = [n[1] * t1[2] - n[2] * t1[1], n[2] * t1[0] - n[0] * t1[2], n[0] * t1[1] - n[1] * t1[0]];
    const turn = (R() < 0.5 ? -1 : 1) * (0.5 + 0.7 * R());
    let d = t1.map((v, k) => v * Math.cos(turn) + side[k] * Math.sin(turn)), p = a.p, w = a.w * (0.35 + 0.2 * R()), heat = a.heat * (0.55 + 0.2 * R());
    const pts = [{ p, w, heat }], legs = 2 + Math.floor(R() * 2), long = (10 + 18 * R()) * (0.6 + a.w * 0.4);
    for (let k = 0; k < legs; k++) {
      const len = long / legs * (0.6 + 0.8 * R()), q = [p[0] + d[0] * len, p[1] + d[1] * len, p[2] + d[2] * len];
      p = toShell(...q);
      w *= 0.55; heat *= 0.8;
      pts.push({ p, w: k === legs - 1 ? 0.04 : w, heat });
      const bend = (R() - 0.5) * 1.2, nn = shellNormal(...p), sd = [nn[1] * d[2] - nn[2] * d[1], nn[2] * d[0] - nn[0] * d[2], nn[0] * d[1] - nn[1] * d[0]];
      d = d.map((v, j) => v * Math.cos(bend) + sd[j] * Math.sin(bend));
    }
    branches.push(pts);
  }
  // Hairline tips: every lit run thins to nothing past its last traced point.
  for (const run of runs) {
    const last = run[run.length - 1], prev = run[run.length - 2];
    if (!prev || last.heat <= 0) continue;
    const dir = last.p.map((v, k) => v - prev.p[k]), dl = Math.hypot(...dir) || 1, len = 4 + 5 * R();
    last.w = Math.max(last.w, 0.12);
    run.push({ p: toShell(...last.p.map((v, k) => v + (dir[k] / dl) * len)), w: 0.03, heat: last.heat * 0.6 });
  }
  const segs = [];
  for (const run of [...runs, ...branches]) for (let i = 0; i + 1 < run.length; i++) {
    const a = run[i], b = run[i + 1];
    segs.push({ a: a.p, b: b.p, wa: a.w, wb: b.w, ha: a.heat, hb: b.heat });
  }
  return segs;
}

// The torn line of each side, on the surface, as a run of points close together.
export function edges() {
  const out = {};
  for (const side of ['left', 'right']) {
    const line = TORN[side], pts = [];
    for (let py = line[0][1]; py <= line[line.length - 1][1]; py += 0.5) { const p = sight(tornAt(side, py), py); if (p) pts.push(p); }
    out[side] = pts;
  }
  return out;
}
