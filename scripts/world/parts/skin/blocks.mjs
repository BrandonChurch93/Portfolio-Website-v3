// The crust broken at each torn edge, as real blocks: thick slabs of very different sizes along the line, each with
// its weathered top and its broken section under it, let down and tipped toward the hollow, a few broken off and
// hanging. At the top of the dark side the largest, the slab, stands proud of the dark face over the hollow. Their
// ragged ends are where the skin ends: the skin stops a crack's width short of each block's back (cutAt).
//
//   const plan = planBlocks()            // { left: [...], right: [...] } in the world's units, for block-field.mjs
//   const mesh = await makeBlocks(plan)  // one mesh of all of them, with each vertex's side and how near its top it is
//   cutAt(side, py)                      // where across picture 9 the skin stops at a row, in its pixels
import { fileURLToPath } from 'node:url';
import { surface, simplify } from '../../lib/surface.mjs';
import { L } from '../../lib/plan.mjs';
import { lineAt, onShell, rng, shellNormal } from './features.mjs';
import { fbm } from './field.mjs';

// Each block read off picture 9, in its pixels: the rows it runs along the line (y0 to y1), how far it reaches in
// under the skin and out past the line toward the hollow (in, over), how thick it is (T, units), how far it is let
// down into the planet (sink, units: under 0 it stands proud) and tipped toward the hollow (tilt, degrees), and
// `hang` for one broken off and hanging, whose reach is wholly past the line (from, over).
const PLAN = {
  left: [
    { y0: 350, y1: 410, in: 12, over: 6, T: 22, sink: 2, tilt: 8 },
    { y0: 410, y1: 442, in: 13, over: 8, T: 20, sink: 3, tilt: 10 },
    { y0: 442, y1: 468, in: 10, over: 5, T: 16, sink: 1, tilt: 6 },
    { y0: 469, y1: 505, in: 16, over: 10, T: 24, sink: 5, tilt: 14 },
    { y0: 505, y1: 521, in: 9, over: 4, T: 13, sink: 2, tilt: 4 },
    { y0: 521, y1: 566, in: 18, over: 12, T: 26, sink: 7, tilt: 18 },
    { y0: 568, y1: 598, from: 8, over: 22, T: 10, sink: 9, tilt: 38, hang: true },
    { y0: 566, y1: 590, in: 11, over: 6, T: 18, sink: 3, tilt: 8 },
    { y0: 590, y1: 628, in: 15, over: 10, T: 22, sink: 6, tilt: 15 },
    { y0: 628, y1: 652, in: 9, over: 5, T: 14, sink: 3, tilt: 6 },
  ],
  right: [
    { y0: 305, y1: 332, in: 28, over: 1.4, T: 18, sink: 0.5, tilt: 4 },
    { y0: 332, y1: 378, in: 36, over: 2.7, T: 28, sink: 3, tilt: 10 },
    { y0: 378, y1: 396, in: 24, over: 0.9, T: 14, sink: 1, tilt: 3 },
    { y0: 396, y1: 446, in: 38, over: 3.1, T: 30, sink: 6, tilt: 16 },
    { y0: 404, y1: 438, from: 7, over: 22, T: 11, sink: 11, tilt: 46, hang: true },
    { y0: 446, y1: 470, in: 28, over: 1.4, T: 18, sink: 2, tilt: 6 },
    { y0: 470, y1: 516, in: 34, over: 2.7, T: 26, sink: 5, tilt: 12 },
    { y0: 516, y1: 532, in: 22, over: 0.9, T: 12, sink: 1, tilt: 3 },
    { y0: 532, y1: 578, in: 18, over: 2.7, T: 24, sink: 7, tilt: 18 },
    { y0: 584, y1: 614, from: 5, over: 19, T: 10, sink: 10, tilt: 52, hang: true },
    { y0: 578, y1: 600, in: 12, over: 1.4, T: 16, sink: 2, tilt: 5 },
    { y0: 600, y1: 646, in: 16, over: 2.7, T: 26, sink: 5, tilt: 13 },
    { y0: 646, y1: 672, in: 20, over: 1.4, T: 14, sink: 2, tilt: 6 },
    { y0: 672, y1: 700, in: 18, over: 1.8, T: 14, sink: 4, tilt: 10 },
  ],
};
// At the top of the dark side, blocks that face the visitor, read off picture 9 as the rectangle each covers (across,
// down, in its pixels): the great slab of pale crust that stands proud of the dark face over the hollow, and the two
// chunks broken from it that hang under it. Each stands `ahead` units in front of whatever is there in the picture
// (the dark face or the torn rock's blocks), is `T` thick into the planet, and its face looks up by `lean` degrees.
const FACING = [
  { px: [270, 327], py: [317, 351], T: 40, ahead: 5, lean: 14, slab: true },
  { px: [279, 313], py: [350, 413], T: 16, ahead: 3, lean: -6, hang: true },
  { px: [261, 292], py: [415, 454], T: 12, ahead: 2.5, lean: -10, hang: true },
];
// The crack left between the skin and each block's back, in units; the planet's curve the tops follow; how worn the
// tops are and how rough every face, in units.
const GAP = [0.7, 2.2], CURVE = 600, WEAR = 0.45, GRAIN = 0.12, LUMP = 0.45;
// The pale side's blocks are tipped this many degrees more toward the hollow than read off the picture, so their tops
// turn from the moon: picture 9's torn edge there is dark rock with a few lit edges, and ours was lit grey tops.
const PALE_TIP = 12;
// Conchoidal scallops broken out of a block's faces (DISH: how many to a square unit of face, their radii, and how deep
// each is as a share of its radius), and deep pits in its weathered top (PIT: the same). Without them every face was
// a plane with soft dents, which read as foam or stucco.
const DISH = { per: 1 / 34, r: [1.8, 7.5], deep: [0.18, 0.42] }, PIT = { per: 1 / 30, r: [0.6, 2.2], deep: [0.55, 0.9] };
// How the skin's edge wanders along the blocks' backs: how far, in pixels, at what grain of rows, and over how many rows
// it changes from one block's back to the next (a jump between two rows tilted the skin's grid there, which drew a
// line right across the side).
const CUT = { wander: 2.6, every: 9, ease: 5 };

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
const turn = (u, v, t) => [u.map((x, i) => x * Math.cos(t) + v[i] * Math.sin(t)), v.map((x, i) => x * Math.cos(t) - u[i] * Math.sin(t))];

// Hollows carved into a face, in the block's frame: each a ball of radius r whose middle stands r less its depth out
// from the face (out is the face's outward axis and its sign, at the face's level), spread over the face's extent, and
// drawn out along a way of its own across the face by up to STRETCH, so none is a round stamp.
const STRETCH = 1.9;
function hollows(R, n, kind, span, out, level) {
  const list = [], ax = [0, 1, 2].filter((k) => k !== out[0]);
  for (let i = 0; i < n; i++) {
    const r = kind.r[0] * (kind.r[1] / kind.r[0]) ** (R() ** 1.4), deep = r * (kind.deep[0] + (kind.deep[1] - kind.deep[0]) * R());
    const at = span.map((s) => (s ? s[0] + (s[1] - s[0]) * R() : 0)), turn = R() * Math.PI;
    at[out[0]] = level + out[1] * (r - deep);
    list.push({ at, r, ax, out: out[0], cs: Math.cos(turn), sn: Math.sin(turn), e: 1 + (STRETCH - 1) * R() });
  }
  return list;
}

// A face of a block as a few planes, each a little turned: c is a point of the face's nominal plane in the block's
// frame, m its outward normal, and the planes spread over its extent (two ranges of the frame's other axes).
function face(R, m0, at, span, n, tilt, wobble) {
  const ax = [0, 1, 2].filter((k) => span[k]), planes = [];
  for (let i = 0; i < n; i++) {
    // Facets are spread over the face at random places of their own, each turned about the face's two axes by up to
    // `tilt` radians and set in or out by up to `wobble` units.
    const c = at.map((v, k) => (span[k] ? span[k][0] + (span[k][1] - span[k][0]) * (0.05 + 0.9 * R()) : v));
    const m = unit(m0.map((v, k) => v + (k === ax[0] ? Math.sin((R() - 0.5) * 2 * tilt) : k === ax[1] ? Math.sin((R() - 0.5) * 2 * tilt) : 0)));
    planes.push({ c: c.map((v, k) => v + m0[k] * (R() - 0.5) * 2 * wobble), m });
  }
  return { ax, planes };
}

// A block that faces the visitor, from the rectangle of picture 9 it covers.
function facing(f, i, depthAt) {
  const R = rng(5300 + i * 17);
  // How far toward the visitor it stands at its left end and at its right, from what is there in each half.
  const mid = (f.px[0] + f.px[1]) / 2, near = (x0, x1) => { let z = -Infinity; for (let px = x0; px <= x1; px += 3) for (let py = f.py[0]; py <= f.py[1]; py += 3) z = Math.max(z, depthAt(px, py)); return z + f.ahead; };
  const zl = near(f.px[0], mid), zr = near(mid, f.px[1]);
  const tl = L.fromPicture(f.px[0], f.py[0], zl), tr = L.fromPicture(f.px[1], f.py[0], zr), bl = L.fromPicture(f.px[0], f.py[1], zl);
  let a = unit(sub(tr, tl)), b = unit(sub(bl, tl)), n = unit(cross(b, a));
  if (n[2] < 0) n = n.map((v) => -v);
  // Its face looks up a little (or down, for one hanging), turned about its top edge.
  const t = (f.lean * Math.PI) / 180;
  [b, n] = [b.map((v, k) => v * Math.cos(t) + n[k] * Math.sin(t)), n.map((v, k) => v * Math.cos(t) - b[k] * Math.sin(t))];
  const a1 = Math.hypot(...sub(tr, tl)), b1 = Math.hypot(...sub(bl, tl)), T = f.T, len = a1;
  const slant = (m, u) => unit([m[0] * Math.cos(u), m[0] * Math.sin(u), m[2]]);
  const faces = {
    bottom: face(R, [0, 0, -1], [0, 0, -T], [[0, a1], [0, b1], null], 4, 0.4, T * 0.12),
    front: face(R, [0, 1, 0], [0, b1, 0], [[0, a1], null, [-T, 0]], 10 + Math.floor((len * T) / 50), 0.75, 2.8 + 0.04 * len),
    back: face(R, [0, -1, 0], [0, 0, 0], [[0, a1], null, [-T, 0]], f.slab ? 2 : 4, f.slab ? 0.12 : 0.5, f.slab ? 0.6 : 1.5),
    start: face(R, slant([-1, 0, 0], (R() - 0.5) * 0.9), [0, 0, 0], [null, [0, b1], [-T, 0]], 6, 0.6, 2.4),
    end: face(R, slant([1, 0, 0], (R() - 0.5) * 0.9), [a1, 0, 0], [null, [0, b1], [-T, 0]], 7, 0.65, 3),
  };
  const chips = [];
  for (let c = 0; c < Math.round(6 + (a1 * b1) / 120); c++) {
    const e = R(), at = e < 0.5 ? [a1 * R(), b1, -T * 0.3 * R()] : e < 0.75 ? [a1, b1 * R(), -T * 0.3 * R()] : [a1 * R(), b1 * R(), 0];
    const q = unit([R() - 0.5, R() - 0.5, R() - 0.5]), r1 = unit(cross(q, [0.3, 0.9, 0.2])), r2 = cross(q, r1);
    chips.push({ at, size: (e < 0.75 ? 1 + 3.5 * R() ** 1.4 : 0.8 + 1.6 * R()) * Math.min(1, T / 14), r: [...q, ...r1, ...r2] });
  }
  // Its face toward the visitor is the crust's old top, pitted deep and broken in scallops; its foot is broken too.
  const dish = [...hollows(R, Math.round(a1 * b1 * DISH.per), DISH, [[0, a1], [0, b1], null], [2, 1], 0), ...hollows(R, Math.round(a1 * T * DISH.per), DISH, [[0, a1], null, [-T, 0]], [1, 1], b1)];
  const pit = hollows(R, Math.round(a1 * b1 * PIT.per * (f.slab ? 1.4 : 1)), PIT, [[0, a1], [0, b1], null], [2, 1], 0);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const ca of [-4, a1 + 4]) for (const cb of [-4, b1 + 4]) for (const cn of [-T - 5, 4]) {
    const w = add(add(add(tl, a, ca), b, cb), n, cn);
    for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], w[k] - 3); hi[k] = Math.max(hi[k], w[k] + 3); }
  }
  return [{ side: 'left', facing: true, hang: !!f.hang, slab: !!f.slab, y0: f.py[0], y1: f.py[1], o: tl, a, b, n, R: 1e5, wear: f.slab ? 3.4 : 2.4, grain: GRAIN * 1.5, lump: LUMP * 3, seed: R() * 50, faces, chips, dish: [...dish, ...pit], lo, hi, cut: null }];
}

const HULL = {};
export function planBlocks(depthAt) {
  const out = { left: [], right: [] };
  if (depthAt) FACING.forEach((f, i) => out.left.push(...facing(f, i, depthAt)));
  for (const side of ['left', 'right']) PLAN[side].forEach((p, i) => {
    const R = rng((side === 'left' ? 900 : 1700) + i * 31), ym = (p.y0 + p.y1) / 2;
    const P = onShell(lineAt(side, ym), ym), P0 = onShell(lineAt(side, p.y0), p.y0), P1 = onShell(lineAt(side, p.y1), p.y1);
    const n = shellNormal(...P);
    let a = sub(P1, P0);
    a = unit(sub(a, n.map((v) => v * dot(a, n))));
    let b = unit(cross(n, a));
    const hollow = side === 'left' ? 1 : -1, [px] = L.pictured(...P);
    if (Math.sign(L.pictured(...add(P, b, 5))[0] - px) !== hollow) b = b.map((v) => -v);
    const q0 = L.pictured(...P), q1 = L.pictured(...add(P, b, 10)), perPx = 10 / Math.hypot(q1[0] - q0[0], q1[1] - q0[1]);
    const a0 = -Math.hypot(...sub(P, P0)), a1 = Math.hypot(...sub(P1, P));
    const b0 = p.hang ? p.from * perPx : -p.in * perPx, b1 = p.over * perPx, T = p.T;
    // Tipped about its back edge, so its far edge goes down into the hollow, then turned a little about its own
    // out, let down into the planet and slid a little down it.
    const tilt = ((p.tilt + (side === 'right' ? PALE_TIP : 0)) * Math.PI) / 180, twist = (R() - 0.5) * 0.4;
    const hinge = add(P, b, b0);
    const [nb, nn] = [b.map((v, k) => v * Math.cos(tilt) - n[k] * Math.sin(tilt)), n.map((v, k) => v * Math.cos(tilt) + b[k] * Math.sin(tilt))];
    const [ta, tb] = turn(a, nb, twist);
    let o = add(hinge, tb, -b0);
    o = add(o, n, -p.sink);
    o = add(o, [0, -1, 0], p.hang ? 3 + 4 * R() : Math.max(0, p.sink) * 0.4 * R());
    const len = a1 - a0, deep = b1 - b0;
    // The faces: the bottom, the broken front toward the hollow, the back under the skin, and the two splits from the
    // blocks along the line, each knapped into a few facets. The bottom is more ragged than the rest.
    // The splits from the blocks beside it run across the line at a slant of their own, so no block is square.
    const slant = (m, t) => unit([m[0] * Math.cos(t), m[0] * Math.sin(t), m[2]]);
    const faces = {
      bottom: face(R, [0, 0, -1], [0, 0, -T], [[a0, a1], [b0, b1], null], 5 + Math.floor(R() * 4), 0.4, T * 0.12),
      front: face(R, [0, 1, 0], [0, b1, 0], [[a0, a1], null, [-T, 0]], 7 + Math.floor((len * T) / 60), 0.6, 1.8 + 0.035 * len),
      back: face(R, [0, -1, 0], [0, b0, 0], [[a0, a1], null, [-T, 0]], 2, 0.16, 0.6),
      start: face(R, slant([-1, 0, 0], (R() - 0.5) * 1.1), [a0, 0, 0], [null, [b0, b1], [-T, 0]], 3 + Math.floor(R() * 2), 0.42, 1.2),
      end: face(R, slant([1, 0, 0], (R() - 0.5) * 1.1), [a1, 0, 0], [null, [b0, b1], [-T, 0]], 3 + Math.floor(R() * 2), 0.42, 1.2),
    };
    // Chips knocked out along its exposed edges: the front's top and foot, and the ends of the front.
    const chips = [];
    const count = Math.round(4 + (len * (deep + T)) / 260);
    for (let c = 0; c < count; c++) {
      const e = R(), at = e < 0.45 ? [a0 + len * R(), b1, 0] : e < 0.7 ? [a0 + len * R(), b1, -T] : e < 0.85 ? [a0, b0 + deep * R(), -T * R()] : [a1, b0 + deep * R(), -T * R()];
      const q = unit([R() - 0.5, R() - 0.5, R() - 0.5]), r1 = unit(cross(q, [0.3, 0.9, 0.2])), r2 = cross(q, r1);
      chips.push({ at, size: 0.9 + 3.2 * R() ** 1.6 * Math.min(1, T / 16), r: [...q, ...r1, ...r2] });
    }
    // And a few larger scallops broken out of its front and its foot, shell shaped hollows that the light rakes.
    const bites = 2 + Math.floor((len * T) / 500);
    for (let c = 0; c < bites; c++) {
      const onFront = R() < 0.65, at = onFront ? [a0 + len * (0.1 + 0.8 * R()), b1 + 1, -T * (0.15 + 0.7 * R())] : [a0 + len * (0.1 + 0.8 * R()), b0 + deep * (0.3 + 0.7 * R()), -T - 1];
      const q = unit([R() - 0.5, R() - 0.5, R() - 0.5]), r1 = unit(cross(q, [0.7, 0.2, 0.5])), r2 = cross(q, r1);
      chips.push({ at, size: Math.min(T * 0.45, 3 + 5 * R()), r: [...q, ...r1, ...r2] });
    }
    // Scallops broken out of its front, its ends and its foot, and pits in its weathered top.
    const dish = [
      ...hollows(R, Math.round(len * T * DISH.per * 1.3), DISH, [[a0, a1], null, [-T, 0]], [1, 1], b1),
      ...hollows(R, Math.round(len * deep * DISH.per * 0.5), DISH, [[a0, a1], [b0, b1], null], [2, -1], -T),
      ...hollows(R, Math.round(len * deep * PIT.per * 0.6), PIT, [[a0, a1], [b0 + deep * 0.3, b1], null], [2, 1], 0),
    ];
    // Its box in the world, for the field to pass it by.
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const ca of [a0 - 3, a1 + 3]) for (const cb of [b0 - 3, b1 + (p.slab ? 30 : 16)]) for (const cn of [-T - 5, 3]) {
      const w = add(add(add(o, ta, ca), tb, cb), nn, cn);
      for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], w[k] - 3); hi[k] = Math.max(hi[k], w[k] + 3); }
    }
    const k = { side, hang: !!p.hang, slab: !!p.slab, y0: p.y0, y1: p.y1, o, a: ta, b: tb, n: nn, R: CURVE, wear: WEAR * (p.slab ? 1.6 : 1), grain: GRAIN, lump: LUMP * 1.6, seed: R() * 50, faces, chips, dish, lo, hi, cut: p.hang ? null : { inPx: p.in, gapPx: (GAP[0] + (GAP[1] - GAP[0]) * R()) / perPx } };
    out[side].push(k);
    // A thick block broke in two along its bedding: its lower part juts further toward the hollow as a ledge, a step
    // down from its top, its own front knapped its own way.
    if (!p.hang && T >= 20 && R() < 0.75) {
      const drop = T * (0.4 + 0.2 * R()), jut = (3 + 7 * R()) * (p.slab ? 2 : 1), la0 = a0 + len * 0.15 * R(), la1 = a1 - len * 0.2 * R();
      const lo2 = add(add(o, nn, -drop), tb, 0);
      const t2 = T - drop + 2;
      const faces2 = {
        bottom: face(R, [0, 0, -1], [0, 0, -t2], [[la0, la1], [b1 * 0.3, b1 + jut], null], 3, 0.4, t2 * 0.15),
        front: face(R, [0, 1, 0], [0, b1 + jut, 0], [[la0, la1], null, [-t2, 0]], 3 + Math.floor(R() * 3), 0.5, 1.6),
        back: face(R, [0, -1, 0], [0, b1 * 0.2, 0], [[la0, la1], null, [-t2, 0]], 1, 0.1, 0.3),
        start: face(R, slant([-1, 0, 0], (R() - 0.5) * 1.2), [la0, 0, 0], [null, [b1 * 0.3, b1 + jut], [-t2, 0]], 2, 0.4, 1),
        end: face(R, slant([1, 0, 0], (R() - 0.5) * 1.2), [la1, 0, 0], [null, [b1 * 0.3, b1 + jut], [-t2, 0]], 2, 0.4, 1),
      };
      out[side].push({ ...k, ledge: true, o: lo2, R: 1e5, wear: 0.6, faces: faces2, chips: chips.map((c) => ({ ...c, at: [c.at[0], c.at[1] + jut * 0.5, c.at[2]] })), dish: hollows(R, Math.round((la1 - la0) * t2 * DISH.per), DISH, [[la0, la1], null, [-t2, 0]], [1, 1], b1 + jut), cut: null, seed: R() * 50 });
    }
  });
  for (const side of ['left', 'right']) HULL[side] = out[side].filter((k) => k.cut);
  return out;
}

// Where across picture 9 the skin stops at a row, in its pixels: a crack's width short of the back of the block at
// that row, or at the line where no block is.
const insetAt = (side, py) => { const k = (HULL[side] ?? []).find((b) => py >= b.y0 && py < b.y1); return k ? k.cut.inPx + k.cut.gapPx : 0; };
export function cutAt(side, py) {
  const s = side === 'left' ? 1 : -1, line = lineAt(side, py);
  let a = 0;
  for (let i = -4; i <= 4; i++) a += insetAt(side, py + (i * CUT.ease) / 4);
  const inset = a / 9;
  return line - s * (inset > 0.5 ? inset + CUT.wander * fbm(py / CUT.every, side === 'left' ? 3.1 : 7.7, 0.5, 2) : inset);
}

// One mesh of every block of one side, with each vertex's side and how near its block's weathered top it is (1 on
// the top, 0 a few units under it, in the broken section).
export async function makeBlocks(plan, { cell, error }) {
  const module = fileURLToPath(new URL('./block-field.mjs', import.meta.url));
  const parts = [];
  for (const side of ['left', 'right']) {
    const blocks = plan[side], lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const k of blocks) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], k.lo[i]); hi[i] = Math.max(hi[i], k.hi[i]); }
    const raw = await surface({ module, args: { blocks }, box: [lo, hi], cell });
    const small = await simplify(raw, { error, strict: false });
    parts.push({ side, blocks, mesh: small });
  }
  return parts;
}

// How near a block's weathered top a place is (1 on it, 0 from `layer` units under it), and whether that block is one
// that faces the visitor.
export function topness(blocks, x, y, z, layer) {
  let best = 0, near = Infinity, facing = false;
  for (const k of blocks) {
    if (x < k.lo[0] || y < k.lo[1] || z < k.lo[2] || x > k.hi[0] || y > k.hi[1] || z > k.hi[2]) continue;
    const d = [x - k.o[0], y - k.o[1], z - k.o[2]], la = dot(d, k.a), lb = dot(d, k.b), ln = dot(d, k.n);
    const top = -(la * la + lb * lb) / (2 * k.R), under = top - ln;
    if (Math.abs(under) < near) { near = Math.abs(under); best = 1 - Math.min(1, Math.max(0, (under - layer * 0.4) / (layer * 0.6))); facing = !!k.facing; }
  }
  return { top: best, facing };
}
