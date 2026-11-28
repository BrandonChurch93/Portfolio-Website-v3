// The slice's hollow: sculpt S's own plan (scripts/world/parts/rock-s/masses.mjs: where each great mass is, which way
// its face is turned, the roof, the floor, the lowest line, the stream's lane, the core's clearance) built again as
// broken blocks with flat faces and hard edges, each a solid of its own (./solid.mjs). Nothing is read on a grid, so
// an edge is exactly as sharp as the screen can show it, and the ray caster lights every pixel of every face.
//
//   const { blocks, table } = build()
//   blocks   the solids, each with what the stone reads: kind (0 a mass, 1 the roof, 2 what is behind, 3 rubble),
//            seed, tint, bed (the way its layers lie)
//
// What each number is for is said where it is used. All of it is this file's own and none of it is the page's.
import { L } from '../lib/plan.mjs';
import { below } from '../parts/land/shape.mjs';
import * as F from '../parts/rock-s/field.mjs';
import { ROOF, BOTTOM, LANE, socket } from '../parts/rock-s/masses.mjs';
import * as V from './view.mjs';
import * as S from './solid.mjs';

export const FRONT = 1, SIDE = 2, BACK = 3, JOINT = 4, BEVEL = 5, CHIP = 6, CLEARED = 7, HELD = 8, TOP = 9;
const C = L.CORE.at, R = L.CORE.r, D2R = Math.PI / 180;
const between = (r, a, b) => a + (b - a) * r();
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const N = (x, y, z, s) => (L.noise(x, y, z, s) - 0.5) * 2;

// A face turned nearly edge on to the visitor is turned toward them until this much of it is seen.
const AIM = 0.6;
const TOWARD = { near: 0.62, far: 0.34, from: 2.2, to: 3.7, leave: -0.2 };
// A mass's sides: one turned to the core leans out as it goes back, so it is seen and lit; one turned from it is cut
// under, so what is behind it is in its shadow.
const TAPER = { lit: [0.28, 0.8], dark: [-0.32, 0.12], between: [0.08, 0.45] };
// How a mass is broken: so many cuts by how far across it is (up to that size, from so many to so many), each leaning
// so much and parting it by so much.
const JOINTS = { lean: 0.45, gap: [0.3, 2.4], least: 700, cuts: [[46, 0, 1], [78, 1, 2], [Infinity, 2, 4]] };
// Each broken piece's own face: the share that keep the mass's face, turned so many degrees and set back so far, the
// share turned and set back more, the rest far back, and the share left proud by so much. `whole`: the share whose
// face is one plane, where the others keep a part of the mass's own.
const FACE = { kept: 0.5, tilt: [0.5, 4], step: [0, 2], turned: 0.26, steep: [6, 15], back: [2, 9], deep: [11, 26], proudShare: 0.08, proud: 7, whole: 0.78 };
// Round the core the pieces lie as the sheets of a broken shell do: a piece's face is turned toward the core, so it
// takes more of its light, and its far edge is left standing while its near edge sinks under the next piece in, whose
// edge stands over it and shades it. Pieces that only keep the mass's face lie in one plane, and read as a wall of
// laid stones.
//   within  so near the core as seen, in its radii: every piece of this share, and none by the second
//   cuts    a mass that near is broken less (as JOINTS.cuts): its sheets are greater
//   tilt    turned so many degrees, toward the core give or take `swing` degrees
//   sink    its near edge sinks by no more than this share of how thick the mass is
const SHELL = { within: [2.3, 3.1], share: 0.85, cuts: [[78, 0, 1], [Infinity, 1, 2]], tilt: [11, 27], swing: 35, step: [0, 5], sink: 0.55 };
const seenFrom = (p) => { const q = S.sub(p, C); return Math.hypot(...S.sub(q, S.mul(V.VIEWWARD, S.dot(q, V.VIEWWARD)))) / R; };
// Its edges and corners: a bevel so wide on this share of its edges, and a corner knocked off so deep.
const EDGE = { share: 0.6, wide: [0.7, 3.4], chips: [0, 2], chip: [3, 15] };
// The roof's masses: how wide each is, how far its front stands out or back, how it leans (down is more) and twists,
// how far its seam leans across going down, its lip's turn from its front (degrees) and how far the lip drops (units).
const LID = { wide: [84, 210], step: 7, lean: [-0.05, 0.3], twist: 0.22, seam: 62, lip: [42, 66], drop: [12, 30], rise: 5 };
// What is behind everything (the plan's backfill), in cells this wide in the picture's pixels.
const FILL = { cell: 104, jitter: 0.95, tilt: 0.42, thick: 220, step: 22 };
// The core's clearance, and what is kept in front of its disc (the plan's own numbers).
const CLEAR = { r: 113, rag: 7, disc: 102, open: 0.06 };
// Two solids cut from one along a plane lie over each other by this much, so no ray passes between them.
const LAP = 0.04;

const along = (line, px) => {
  if (px <= line[0][0]) return line[0][1];
  for (let i = 1; i < line.length; i++) if (px <= line[i][0]) { const [x0, y0] = line[i - 1], [x1, y1] = line[i]; return y0 + ((y1 - y0) * (px - x0)) / (x1 - x0); }
  return line[line.length - 1][1];
};
// A line across the picture made ragged: each stretch broken in two, its middle moved up or down.
function ragged(line, by, seed) {
  const r = L.seeded(seed), out = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const [x0, y0] = line[i], [x1, y1] = line[i + 1];
    out.push([x0, y0]);
    if (x1 - x0 > 14) { const f = 0.35 + 0.3 * r(); out.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + (r() - 0.5) * 2 * by]); }
  }
  out.push(line[line.length - 1]);
  return out;
}
const UNDER = ragged(ROOF.under, 5, 311), LOWEST = ragged(ragged(BOTTOM, 8, 313), 3.5, 317);

const lipSoft = (x) => { let a = 0; for (let k = -4; k <= 4; k++) a += L.lip(x + k * 9); return a / 9; };
const frontZ = (x) => Math.min(lipSoft(x), Math.sqrt(Math.max(0, L.WORLD.half ** 2 - x * x)));

// The plane that holds the eye and two places of the picture, turned so that a third place is inside it.
function heldWith(a, b, inside) {
  let [n, d] = V.held(a, b);
  const [p] = V.seen(inside[0], inside[1]);
  if (S.dot(n, p) > d) { n = S.mul(n, -1); d = -d; }
  return [n, d];
}
const pictured = (p) => L.pictured(p[0], p[1], p[2]);
const corners = (s) => { const out = []; for (const f of s.faces) for (const p of f.pts) out.push(p); return out; };

function reaim(n) {
  if (S.dot(n, V.VIEWWARD) >= AIM) return n;
  let lo = 0, hi = 12;
  for (let i = 0; i < 44; i++) { const t = (lo + hi) / 2; if (S.dot(S.norm(S.mad(n, V.VIEWWARD, t)), V.VIEWWARD) < AIM) lo = t; else hi = t; }
  return S.norm(S.mad(n, V.VIEWWARD, hi));
}

// A mass the plan turns from the core stays turned from it. Any other is turned toward the core until its face meets
// the core's light at this much, by how far from the core it is seen (in the core's radii), and still faces the page.
function lit(m) {
  const q = S.sub(m.c, C), k = S.dot(q, V.VIEWWARD), rho = Math.hypot(...S.sub(q, S.mul(V.VIEWWARD, k))) / R, to = S.norm(S.sub(C, m.c));
  if (S.dot(m.n, to) < TOWARD.leave || /^hang/.test(m.name)) return reaim(m.n);
  const want = TOWARD.near + (TOWARD.far - TOWARD.near) * smooth(TOWARD.from, TOWARD.to, rho);
  let best = reaim(m.n);
  for (let t = 0; t <= 4 && S.dot(best, to) < want; t += 0.05) best = reaim(S.norm(S.mad(m.n, to, t)));
  return best;
}

// One of the plan's masses as a solid: its outline in the picture carried onto its face, and its sides.
function prism(m, r) {
  const n = lit(m), [e1, e2] = S.frame(n), c = m.c, d0 = S.dot(n, c);
  const uv = [];
  for (let i = 0; i < m.flat.length; i += 2) { const q = S.sub(V.at(m.flat[i], m.flat[i + 1], n, d0), c); uv.push([S.dot(q, e1), S.dot(q, e2)]); }
  const h = S.hull(uv);
  let far = 0;
  for (const q of h) far = Math.max(far, Math.hypot(q[0], q[1]));
  const reach = far + m.thick * 1.6 + 40;
  let s = S.box(S.sub(c, [reach, reach, reach]), S.add(c, [reach, reach, reach]));
  s = S.clip(s, n, d0 + FACE.proud, FRONT);
  s = S.clip(s, S.mul(n, -1), -(d0 - m.thick), BACK);
  const want = S.sub(C, c), flat = S.sub(want, S.mul(n, S.dot(want, n))), tc = S.norm(flat);
  h.forEach((a, i) => {
    const b = h[(i + 1) % h.length], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const o = S.add(S.mul(e1, dy / l), S.mul(e2, -dx / l)), lit = S.dot(o, tc);
    const t = lit > 0.25 ? between(r, ...TAPER.lit) : lit < -0.25 ? between(r, ...TAPER.dark) : between(r, ...TAPER.between);
    const q = S.norm(S.mad(o, n, t)), p = S.add(c, S.add(S.mul(e1, a[0]), S.mul(e2, a[1])));
    if (s) s = S.clip(s, q, S.dot(q, p), SIDE);
  });
  return { s, n, e1, e2, c, uv: h, far, thick: m.thick };
}

// A solid broken into pieces, each with a face, edges and corners of its own. Each cut goes through a place of its
// own, leaning its own way, and parts only the piece it lands in, so the pieces are of every size and no two cuts run
// side by side.
function shatter(base, o, r, seed) {
  const { n, e1, e2, c, uv, far, thick } = o, out = [], rs = L.seeded(seed * 613 + 29);
  const [, least, most] = (seenFrom(c) < SHELL.within[0] ? SHELL.cuts : JOINTS.cuts).find(([size]) => far <= size), count = Math.floor(between(r, least, most + 1));
  const holds = (q, p) => q.faces.every((f) => { const fn = S.normal(f.pts); return S.dot(fn, p) <= S.dot(fn, f.pts[0]) + 1e-6; });
  let parts = [base];
  for (let k = 0; k < count; k++) {
    let w = 0, at = [0, 0];
    for (const q of uv) { const v = r() ** 2; at[0] += q[0] * v; at[1] += q[1] * v; w += v; }
    const ang = r() * Math.PI, dir = S.add(S.mul(e1, Math.cos(ang)), S.mul(e2, Math.sin(ang)));
    const p = S.mad(S.add(c, S.add(S.mul(e1, at[0] / w), S.mul(e2, at[1] / w))), n, -3);
    const jn = S.norm(S.mad(dir, n, (r() - 0.5) * 2 * JOINTS.lean)), d = S.dot(jn, p), gap = between(r, ...JOINTS.gap);
    const i = parts.findIndex((q) => holds(q, p));
    if (i < 0) continue;
    const halves = [S.clip(parts[i], jn, d - gap / 2, JOINT), S.clip(parts[i], S.mul(jn, -1), -(d + gap / 2), JOINT)];
    if (halves.every((q) => q && S.volume(q) > JOINTS.least)) parts.splice(i, 1, ...halves);
  }
  for (let p of parts) {
    const front = p.faces.filter((f) => f.tag === FRONT).sort((a, b) => S.area(b.pts) - S.area(a.pts))[0];
    let fn = n;
    if (front) {
      // Most pieces keep the mass's own face, nearly. Some are turned and stand back, a few stand far back, which is
      // a recess, and a few are left standing proud of the rest.
      const mid = S.middle(p), shell = rs() < SHELL.share * (1 - smooth(SHELL.within[0], SHELL.within[1], seenFrom(mid)));
      const kind = r(), [tilts, steps] = shell ? [SHELL.tilt, SHELL.step] : kind < FACE.kept ? [FACE.tilt, FACE.step] : kind < FACE.kept + FACE.turned ? [FACE.steep, FACE.back] : kind < 1 - FACE.proudShare ? [FACE.tilt, FACE.deep] : [FACE.tilt, [-FACE.proud, -FACE.proud * 0.4]];
      const ax = 6.2832 * r();
      let tilt = between(r, ...tilts) * D2R, way = S.add(S.mul(e1, Math.cos(ax)), S.mul(e2, Math.sin(ax)));
      if (shell) {
        const to = S.sub(C, mid), flat = S.norm(S.sub(to, S.mul(n, S.dot(to, n)))), sw = (rs() - 0.5) * 2 * SHELL.swing * D2R;
        way = S.add(S.mul(flat, Math.cos(sw)), S.mul(S.cross(n, flat), Math.sin(sw)));
        let a = Infinity, b = -Infinity;
        for (const v of front.pts) { const k = S.dot(way, v); a = Math.min(a, k); b = Math.max(b, k); }
        tilt = Math.min(tilt, Math.atan((SHELL.sink * thick) / Math.max(1, b - a)));
      }
      const q = S.norm(S.add(S.mul(n, Math.cos(tilt)), S.mul(way, Math.sin(tilt))));
      let lo = Infinity, hi = -Infinity;
      for (const v of front.pts) { const k = S.dot(q, v); lo = Math.min(lo, k); hi = Math.max(hi, k); }
      const whole = r() < FACE.whole || shell, step = FACE.proud + between(r, ...steps);
      const d = whole ? lo - step : lo + (hi - lo) * between(r, 0.3, 0.75) - FACE.proud;
      const cutFace = S.clip(p, q, d, FRONT);
      if (cutFace && S.volume(cutFace) > JOINTS.least * 0.5) { p = cutFace; if (whole) fn = q; }
    }
    for (const f of [...p.faces]) {
      if (f.tag === FRONT || f.tag === BACK || r() > EDGE.share) continue;
      const nf = S.normal(f.pts), k = S.dot(nf, fn);
      if (k < -0.5 || k > 0.92) continue;
      const q = S.norm(S.add(S.mul(fn, between(r, 0.6, 1.5)), nf)), [, hi] = S.reach(p, q);
      p = S.clip(p, q, hi - between(r, ...EDGE.wide), BEVEL) ?? p;
    }
    const top = p.faces.filter((f) => f.tag === FRONT).sort((a, b) => S.area(b.pts) - S.area(a.pts))[0];
    if (top) {
      const mid = S.middle(p), size = Math.min(1, S.size(p) / 90);
      for (let k = Math.floor(between(r, EDGE.chips[0], EDGE.chips[1] + 1)); k > 0; k--) {
        const v = top.pts[Math.floor(r() * top.pts.length)], dir = S.norm(S.sub(v, mid));
        const q = S.norm([dir[0] + fn[0] * between(r, 0.2, 0.9) + (r() - 0.5) * 0.5, dir[1] + fn[1] * between(r, 0.2, 0.9) + (r() - 0.5) * 0.5, dir[2] + fn[2] * between(r, 0.2, 0.9) + (r() - 0.5) * 0.5]);
        const chipped = S.clip(p, q, S.dot(q, v) - between(r, ...EDGE.chip) * size, CHIP);
        if (chipped && S.volume(chipped) > JOINTS.least * 0.4) p = chipped;
      }
    }
    out.push(p);
  }
  return out;
}

// The plan's backfill: how far toward the visitor the rock behind everything is, at a place across and up.
function behind(x, y) {
  const B = F.BACKFILL ?? { gap: 0.8, deep: 14, over: 60, high: 70, from: -150, low: 90, under: -290, more: [0.35, 1.45, 2.7] };
  const rho = Math.hypot(x - C[0], y - C[1]);
  return C[2] + R * (socket(rho / R) - B.gap - B.more[0] * smooth(B.more[1], B.more[1] + 0.35, rho / R) * (1 - smooth(B.more[2] - 0.4, B.more[2], rho / R)))
    - B.high * smooth(B.from, B.from + 70, y) - B.low * (1 - smooth(B.under - 50, B.under, y)) * (1 - smooth(1.6 * R, 2.4 * R, rho)) + B.deep * N(x / B.over, y / B.over, 2.9, 61);
}

// The cells of a jittered grid across the picture, each a solid that holds the eye's rays through it: seen from the
// page they tile it, with no gap and no overlap, however deep each is.
function cells(box, size, jitter, seed) {
  const r = L.seeded(seed), at = new Map(), [x0, y0, x1, y1] = box;
  const i0 = Math.floor(x0 / size) - 2, i1 = Math.ceil(x1 / size) + 2, j0 = Math.floor(y0 / size) - 2, j1 = Math.ceil(y1 / size) + 2;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) at.set(`${i},${j}`, [(i + 0.5 + (r() - 0.5) * jitter + (j & 1) * 0.5) * size, (j + 0.5 + (r() - 0.5) * jitter) * size]);
  const out = [];
  for (let j = j0 + 2; j <= j1 - 2; j++) for (let i = i0 + 2; i <= i1 - 2; i++) {
    const c = at.get(`${i},${j}`), near = [];
    for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) if (a || b) near.push(at.get(`${i + a},${j + b}`));
    out.push({ c, near, id: out.length });
  }
  return out;
}
// The solid of a cell: the eye's rays through it, between two depths.
function rayCell(cell, zBack, zFront) {
  const [cx, cy] = cell.c, far = 2400;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const z of [zBack, zFront]) for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const p = L.fromPicture(cx + dx * far / 10, cy + dy * far / 10, z);
    for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
  }
  lo[2] = zBack; hi[2] = zFront;
  let s = S.box(lo, hi);
  for (const o of cell.near) {
    if (!s) break;
    const mx = (cx + o[0]) / 2, my = (cy + o[1]) / 2, ex = o[0] - cx, ey = o[1] - cy;
    const [n, d] = heldWith([mx - ey, my + ex], [mx + ey, my - ex], cell.c);
    s = S.clip(s, n, d + LAP, HELD);
  }
  return s;
}

// Where the visitor first sees a solid at a place of the picture, or nothing.
function front(s, px, py) {
  const [p, u] = V.seen(px, py);
  let t0 = -Infinity, t1 = Infinity;
  for (const f of s.faces) {
    const n = S.normal(f.pts), k = S.dot(n, u), e = S.dot(n, f.pts[0]) - S.dot(n, p);
    if (Math.abs(k) < 1e-9) { if (e < 0) return null; } else if (k > 0) t1 = Math.min(t1, e / k); else t0 = Math.max(t0, e / k);
  }
  return t0 <= t1 && t1 < Infinity ? S.mad(p, u, t1) : null;
}

// The foot of a solid that stands on a line of the picture: an under face, turned down and toward the visitor, so a lit
// front ends on a side in shadow and not on the dark behind it. A cut that holds the eye has no face, and the rock
// ended there like a cut out. One face to a solid, along the line's own lie under it: how tall it stands in the
// picture and how far it is turned are the solid's own.
const FOOT = { tall: [8, 30], wander: 90, turn: [36, 62] };
function foot(s, line, x0, x1) {
  const xa = Math.max(x0, line[0][0]) + 1, xb = Math.min(x1, line[line.length - 1][0]) - 1, mx = (xa + xb) / 2;
  if (xb - xa < 2) return s;
  const a = [xa, along(line, xa)], b = [xb, along(line, xb)], my = (a[1] + b[1]) / 2;
  const tall = FOOT.tall[0] + (FOOT.tall[1] - FOOT.tall[0]) * (0.6 * L.noise(mx / FOOT.wander, 3.7, 1.3, 331) + 0.4 * L.noise(mx / 7, 7.1, 2.9, 337));
  const p = front(s, mx, my - tall / L.PICTURE.unit) ?? front(s, mx, my - tall / L.PICTURE.unit / 2);
  if (!p) return s;
  const [n] = heldWith(a, b, [mx, my - 30]), th = (FOOT.turn[0] + (FOOT.turn[1] - FOOT.turn[0]) * L.noise(mx / 11, 1.9, 5.3, 341)) * D2R;
  const nb = S.norm(S.add(S.mul(n, Math.cos(th)), S.mul(V.VIEWWARD, Math.sin(th))));
  const cut = S.clip(s, nb, S.dot(nb, p), SIDE);
  return cut && S.volume(cut) > 4 ? cut : s;
}

// What is over a line of the picture, of a solid: the solid cut into the stretches of the line it crosses, each kept
// on the line's upper side and given a foot. Every cut holds the eye, so none is ever seen.
function over(s, line) {
  const pts = corners(s).map(pictured);
  let x0 = Infinity, x1 = -Infinity, low = -Infinity, clear = true;
  for (const [px, py] of pts) { x0 = Math.min(x0, px); x1 = Math.max(x1, px); low = Math.max(low, py); if (py > along(line, px) - 0.01) clear = false; }
  if (clear) for (const [lx, ly] of line) if (lx > x0 && lx < x1 && ly < low + 0.5) { clear = false; break; }
  if (clear) return [s];
  s = foot(s, line, x0, x1);
  const out = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i], b = line[i + 1];
    if (b[0] <= x0 || a[0] >= x1) continue;
    let q = s;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 30];
    if (i > 0) { const [n, d] = heldWith([a[0], a[1] - 50], [a[0], a[1] + 50], mid); q = q && S.clip(q, n, d + LAP, HELD); }
    if (i + 2 < line.length) { const [n, d] = heldWith([b[0], b[1] - 50], [b[0], b[1] + 50], mid); q = q && S.clip(q, n, d + LAP, HELD); }
    const [n, d] = heldWith(a, b, mid);
    q = q && S.clip(q, n, d, HELD);
    if (q && S.volume(q) > 4) out.push(q);
  }
  return out;
}

// Nothing nearer the core than its clearance, and nothing in front of its disc: a solid is cut by the plane that
// touches the clearance on its own side, so the new face is turned to the ball and takes its light.
function clear(s, r) {
  for (let pass = 0; pass < 3 && s; pass++) {
    let near = Infinity;
    for (const p of corners(s)) near = Math.min(near, Math.hypot(p[0] - C[0], p[1] - C[1], p[2] - C[2]));
    const want = CLEAR.r + CLEAR.rag * (r() - 0.3) * 2;
    if (near >= want - 0.5) break;
    const mid = S.middle(s), u = S.norm([mid[0] - C[0] + (r() - 0.5) * 30, mid[1] - C[1] + (r() - 0.5) * 30, mid[2] - C[2] + (r() - 0.5) * 30]);
    s = S.clip(s, S.mul(u, -1), -(S.dot(u, C) + want), CLEARED);
  }
  for (let pass = 0; pass < 3 && s; pass++) {
    let worst = 0;
    for (const p of corners(s)) {
      const q = S.sub(p, C), k = S.dot(q, V.VIEWWARD), rho = Math.hypot(...S.sub(q, S.mul(V.VIEWWARD, k)));
      if (k > -20) worst = Math.max(worst, CLEAR.disc + CLEAR.open * Math.max(0, k) - rho);
    }
    if (worst <= 0.5) break;
    const mid = S.sub(S.middle(s), C), k = S.dot(mid, V.VIEWWARD), flat = S.norm(S.sub(mid, S.mul(V.VIEWWARD, k)));
    const u = S.norm(S.mad(flat, V.VIEWWARD, -CLEAR.open));
    s = S.clip(s, S.mul(u, -1), -(S.dot(u, C) + CLEAR.disc + 1), CLEARED);
  }
  return s;
}

// The stream's lane under the ball: nothing nearer the visitor than its back wall, inside its width, under its top.
function lane(s) {
  const [lo, hi] = S.bounds(s);
  if (lo[1] > LANE.top || hi[2] < LANE.z || lo[0] > LANE.half + LANE.widen * Math.max(0, hi[2] - LANE.z) || hi[0] < -LANE.half - LANE.widen * Math.max(0, hi[2] - LANE.z)) return [s];
  const k = Math.hypot(1, LANE.widen), d = (LANE.widen * LANE.z - LANE.half) / k, out = [];
  const left = S.clip(s, [1 / k, 0, LANE.widen / k], d, CLEARED), right = S.clip(s, [-1 / k, 0, LANE.widen / k], d, CLEARED);
  let mid = S.clip(s, [-1 / k, 0, -LANE.widen / k], -d, HELD);
  mid = mid && S.clip(mid, [1 / k, 0, -LANE.widen / k], -d, HELD);
  if (left) out.push(left);
  if (right) out.push(right);
  if (mid) {
    const back = S.clip(mid, [0, 0, 1], LANE.z, CLEARED), front = S.clip(mid, [0, 0, -1], -LANE.z, HELD), top = front && S.clip(front, [0, -1, 0], -LANE.top, CLEARED);
    if (back) out.push(back);
    if (top) out.push(top);
  }
  return out.filter((q) => S.volume(q) > 4);
}

// Inside the planet: a solid is cut by the planes that touch the planet's outer surface where the solid stands out of
// it. `proud` lets it stand out by that share of the planet's depth.
function inside(s, proud = 1) {
  for (let pass = 0; pass < 10 && s; pass++) {
    let worst = null, most = proud + 0.004;
    for (const p of corners(s)) { const v = L.shell(p[0], p[1], p[2]); if (v > most) { most = v; worst = p; } }
    if (!worst) break;
    const e = 0.5, g = S.norm([L.shell(worst[0] + e, worst[1], worst[2]) - L.shell(worst[0] - e, worst[1], worst[2]), L.shell(worst[0], worst[1] + e, worst[2]) - L.shell(worst[0], worst[1] - e, worst[2]), L.shell(worst[0], worst[1], worst[2] + e) - L.shell(worst[0], worst[1], worst[2] - e)]);
    // Along the way out, back to the surface.
    let t = 0;
    for (let k = 0; k < 24; k++) { const q = S.mad(worst, g, -t), v = L.shell(q[0], q[1], q[2]) - proud; if (Math.abs(v) < 1e-4) break; t += v * L.WORLD.deep * 0.8; }
    s = S.clip(s, g, S.dot(g, S.mad(worst, g, -t)), HELD);
  }
  return s;
}
// Under the land: its top is no higher than the land's underside over it.
function underLand(s) {
  const [lo, hi] = S.bounds(s);
  let top = Infinity;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) top = Math.min(top, below(lo[0] + ((hi[0] - lo[0]) * i) / 4, lo[2] + ((hi[2] - lo[2]) * j) / 4));
  return hi[1] > top - 3.5 ? S.clip(s, [0, 1, 0], top - 3.5, TOP) : s;
}

export function build(o = {}) {
  F.setup({});
  const blocks = [], add = (s, meta) => { if (s && S.volume(s) > 6) blocks.push({ ...s, ...meta }); };
  const finish = (s, meta, r, opt = {}) => {
    let list = [s];
    if (!opt.proud) list = list.map((q) => inside(q)).filter(Boolean);
    else list = list.map((q) => inside(q, 1.15)).filter(Boolean);
    list = list.map((q) => underLand(q)).filter(Boolean);
    list = list.map((q) => clear(q, r)).filter(Boolean);
    list = list.flatMap((q) => lane(q));
    list = list.flatMap((q) => over(q, LOWEST));
    for (const q of list) add(q, meta);
  };

  // The great masses and the floor.
  F.M.forEach((m, i) => {
    if (o.only && !o.only.includes(m.name)) return;
    const r = L.seeded(m.seed * 9973 + 17), base = prism(m, r);
    if (!base.s) return;
    const bed = m.sheets.b;
    shatter(base.s, base, r, m.seed).forEach((p, k) => finish(p, { kind: 0, mass: i, name: m.name, seed: m.seed * 31 + k, tint: r(), bed }, r, { proud: m.proud }));
  });

  // The roof: masses across the land's front edge, each with a front of its own between two leaning seams, and along
  // its foot a lip turned down to the core, which is where the roof takes the core's light.
  if (!o.only || o.only.includes('roof')) {
    const r = L.seeded(977), list = [];
    for (let x = -720; x < 720;) {
      const wide = between(r, ...LID.wide);
      list.push({ x: x + wide / 2, wide, step: (r() - 0.5) * 2 * LID.step, lean: between(r, ...LID.lean), twist: (r() - 0.5) * 2 * LID.twist, seam: (r() - 0.5) * 2 * LID.seam, lip: between(r, ...LID.lip), drop: between(r, ...LID.drop), rise: (r() - 0.5) * 2 * LID.rise, seed: 500 + list.length });
      x += wide;
    }
    list.forEach((c, k) => {
      const zl = frontZ(c.x), top = L.dome(c.x, zl), slope = c.twist + ROOF.away[0] * smooth(ROOF.away[1], ROOF.away[2], -c.x);
      // A seam: where it crosses the land's edge and where it is so far under it, as places in the picture.
      const seam = (q) => { const x = q.x - q.wide / 2, zs = frontZ(x); return [pictured([x, L.dome(x, zs) + 30, zs]), pictured([x + q.seam, L.dome(x, zs) - 110, zs])]; };
      const mid = pictured([c.x, top - 30, zl]);
      let s = S.box([c.x - 500, -420, -240], [c.x + 500, 8, 700]);
      const left = seam(c), right = k + 1 < list.length ? seam(list[k + 1]) : null;
      if (k > 0) { const [n, d] = heldWith(left[0], left[1], mid); s = s && S.clip(s, n, d + LAP, HELD); }
      if (right) { const [n, d] = heldWith(right[0], right[1], mid); s = s && S.clip(s, n, d + LAP, HELD); }
      const fn = S.norm([-slope, -c.lean, 1]), d0 = S.dot(fn, [c.x, top, zl - ROOF.inset + c.step]);
      s = s && S.clip(s, fn, d0, FRONT);
      // Its foot: the plan's line of the roof's underside at each seam, on its front. The lip starts so far over it.
      const foot = (line) => { const px = line[1][0] + (line[1][0] - line[0][0]) * 0.2; return [px, along(UNDER, px)]; };
      const a = foot(left), b = right ? foot(right) : [a[0] + 120, along(UNDER, a[0] + 120)];
      const up = c.drop / L.PICTURE.unit, pl = V.at(a[0], a[1] - up + c.rise, fn, d0), pr = V.at(b[0], b[1] - up - c.rise, fn, d0);
      const e = S.norm(S.sub(pr, pl)), down = S.norm(S.cross(e, fn)), th = c.lip * D2R, bn = S.norm(S.add(S.mul(fn, Math.cos(th)), S.mul(down, Math.sin(th))));
      s = s && S.clip(s, bn, S.dot(bn, pl), BEVEL);
      const un = S.norm(S.mad(down, fn, -0.12));
      s = s && S.clip(s, un, S.dot(un, S.mad(pl, down, c.drop)), SIDE);
      if (!s) return;
      const rr = L.seeded(c.seed * 131 + 7), bed = S.norm([0.1 + (rr() - 0.5) * 0.3, 1, 0.25 + (rr() - 0.5) * 0.3]);
      // Broken once or twice down its face, each piece standing back by its own amount.
      let parts = [s];
      for (let j = rr() < 0.3 ? 2 : rr() < 0.75 ? 1 : 0; j > 0; j--) {
        const [lo, hi] = S.bounds(s), x = lo[0] + (hi[0] - lo[0]) * between(rr, 0.25, 0.75), jn = S.norm([1, (rr() - 0.5) * 1.6, (rr() - 0.5) * 0.4]);
        const d = S.dot(jn, [x, top - 40, zl]);
        parts = parts.flatMap((p) => {
          const a2 = S.clip(p, jn, d - 0.3, JOINT), b2 = S.clip(p, S.mul(jn, -1), -(d + 0.3), JOINT);
          const bb = b2 && rr() < 0.7 ? S.clip(b2, fn, d0 - between(rr, 1.5, 8), FRONT) : b2;
          return [a2, bb].filter((q) => q && S.volume(q) > 400);
        });
      }
      parts.forEach((p, j) => finish(p, { kind: 1, mass: -1, name: 'roof', seed: c.seed * 17 + j, tint: rr(), bed }, rr));
    });
  }

  // What is behind everything.
  if (!o.only && o.fill !== false) {
    const r = L.seeded(4421);
    for (const cell of cells([228, 300, 1092, 736], FILL.cell, FILL.jitter, 71)) {
      const [px, py] = cell.c;
      let z = C[2], p = null;
      for (let k = 0; k < 8; k++) { p = L.fromPicture(px, py, z); z = behind(p[0], p[1]); }
      p = L.fromPicture(px, py, z);
      const e = 6, gx = (behind(p[0] + e, p[1]) - behind(p[0] - e, p[1])) / (2 * e), gy = (behind(p[0], p[1] + e) - behind(p[0], p[1] - e)) / (2 * e);
      const fn = S.norm([-gx * 0.85 + (r() - 0.5) * 2 * FILL.tilt, -gy * 0.85 + (r() - 0.5) * 2 * FILL.tilt, 1]);
      let s = rayCell(cell, z - FILL.thick, z + 160);
      s = s && S.clip(s, fn, S.dot(fn, p) + (r() - 0.5) * 2 * FILL.step, FRONT);
      if (s) finish(s, { kind: 2, mass: -2, name: 'fill', seed: 9000 + cell.id, tint: r(), bed: fn }, r);
    }
  }
  return { blocks };
}
