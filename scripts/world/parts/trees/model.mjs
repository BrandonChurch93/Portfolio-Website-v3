// One tree, made in a crown's own units (src/pieces/world/parts/trees/design.ts): a trunk, or two, whose foot spreads
// in lobes into the ground, limbs up into the crown, and a crown that is a ball first: great lumps of leaf seated on
// a ball, each standing out of it by a little of its own radius, so the outline is round with small notches, a few
// small lumps between them, and one at its heart that fills it (or two crowns grown into one). And the shade it lays
// on the ground. Each lump is a card of small leaves the shader keeps facing the viewer, cards of leaves crossed
// through it (which also cast its shadow), and inner cards that lie inside it. With every vertex its stored light:
// how open it is about its normal and from above (darker inside the crown and beneath it), what reaches it from the
// ground, and the numbers the shader moves and lights it by: the ball of its lump and the ball of its crown (the
// shader lights a leaf as a place on those two balls, so the crown reads as one ball whichever way its cards lie).
//
//   import { tree } from './model.mjs'; const mesh = tree(kind, { rays })
//   mesh = { positions, normals, uvs, sway, light, bounce, clump, crown, view, indices, info }
import { CARD, CROWN, SHADE, TILES, tileAt } from '../../../../src/pieces/world/parts/trees/design.ts';
import { seeded } from '../../../../src/pieces/world/layout.ts';

// How many cards a lump is made of: crossed through its middle, and inner cards lying inside it toward the crown's
// outside (each folded, so two triangles more), for a great lump and a small one.
const FULL = { crossed: 2, inner: [2, 1] }, LEAN = { crossed: 1, inner: [0, 0] };
// Each model: its crowns (where each stands against the first's middle, its half widths across and up, how many
// great lumps and small ones), its cards, and its trunk (how thick at the foot, how many sides, how many limbs).
const KINDS = {
  round: { crowns: [{ at: [0, 0, 0], rx: 1, ry: 0.72, great: 8, small: 4 }], cards: FULL, trunk: { foot: 0.1, sides: 7, limbs: 3 } },
  tall: { crowns: [{ at: [0, 0, 0], rx: 0.86, ry: 0.76, great: 8, small: 4 }], cards: FULL, trunk: { foot: 0.09, sides: 7, limbs: 3 } },
  twin: {
    crowns: [
      { at: [-0.36, -0.08, 0.06], rx: 0.68, ry: 0.56, great: 6, small: 2 },
      { at: [0.36, 0.06, -0.06], rx: 0.66, ry: 0.6, great: 6, small: 2 },
    ],
    cards: FULL,
    trunk: { foot: 0.075, sides: 6, limbs: 2 },
  },
  broad: { crowns: [{ at: [0, -0.04, 0], rx: 1.08, ry: 0.8, great: 9, small: 4 }], cards: FULL, trunk: { foot: 0.11, sides: 7, limbs: 3 } },
  far: { crowns: [{ at: [0, 0, 0], rx: 1, ry: 0.72, great: 5, small: 1 }], cards: LEAN, clear: 0.06, trunk: { foot: 0.1, sides: 5, limbs: 0 } },
};
// The lumps of a crown, against its half widths. The crown is a ball: every great lump is seated on it, its middle
// `sink` of its radius inside the ball's surface, so its leaves stand out of the ball by a little and the outline
// is round with small notches, never sprigs standing clear of it. They differ in size within one crown (great,
// small), so it is a few great masses and lesser ones between them. Where they sit: spread over the ball by a
// golden spiral, turned at random, kept off its far side (`back`, the least a lump's direction may face the
// viewer, as a share of straight at it), with a little wander (`wander`, against its radius). The heart lump fills
// the middle so nothing is seen through the ball. The crown's lumps are all moved to one side by up to `lop` of its
// width.
const LUMP = { great: [0.34, 0.5], small: [0.2, 0.28], sink: 0.85, smallSink: 0.95, back: -0.35, wander: 0.18, heart: 0.62, lop: 0.05 };
// The trunk: how much wider it flares at its foot and over what height, how much thinner it is at the fork, how far
// it is sunk, the fork's height under its crown's middle against the crown's half height, and the limbs it forks
// into: how thick each is where it leaves the fork against the trunk there, and at its end against the trunk's foot,
// how far along the way to its lump it reaches, and how far out from the trunk's line it bows. The fork is low, just
// over the crown's lowest leaves, so the limbs are what is seen in the crown's gaps.
const TRUNK = { flare: 0.4, rise: 0.05, taper: 0.45, sunk: 0.2, at: 0.62, limb: { from: 0.72, end: 0.16, reach: 0.85, bow: 0.18 } };
// The roots: the foot of the trunk spreads in lobes that run out and down into the ground (no tubes of their own):
// how many lobes, how far each stands out at the ground against the trunk's foot, and how fast it goes up the trunk.
const ROOTS = { lobes: [3, 5], out: 0.85, rise: 0.035 };
// How the trunk leans and bows: how far its fork stands off its foot to one side, at most, and how far its middle
// bows out of the straight line, against the fork's height.
const BOLE = { lean: 0.09, bow: 0.05 };
// How much a lump of leaf lets through when a ray crosses it whole, how much the ground lets through, and how open
// the most shut in place still is. How wide the cone of sky above a place is, in radians.
const OCCLUDE = { clump: 0.1, ground: 0.14, floor: 0.06, cone: 0.6 };
// The light the ground under a tree sends up: the moon on dull earth, as irradiance in linear light.
const GROUND = [0.16, 0.1, 0.06];
// How far out from its middle a lump's leaves are seen, against its radius (the atlas's outlines reach about this).
const SEEN = 0.76;
// How much each kind of normal makes up the one a leaf is lit by: the card's own, its lump's, the crown's.
const NORMAL = { card: 0.12, clump: 0.5, crown: 0.6 };

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rotate = (v, axis, ang) => { const c = Math.cos(ang), s = Math.sin(ang), k = axis; return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c))); };
const anyPerp = (n) => unit(Math.abs(n[1]) < 0.9 ? cross(n, [0, 1, 0]) : cross(n, [1, 0, 0]));
const lerp = (a, b, t) => add(a, mul(sub(b, a), t));
const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];

class Builder {
  // Two lists of triangles: what is solid everywhere (bark), which only the first pass draws, and what has soft
  // edges (leaves and the shade), which both passes draw. kind: 0 bark, 1 leaf, 2 the shade.
  constructor() { this.p = []; this.n = []; this.uv = []; this.kind = []; this.clump = []; this.crown = []; this.view = []; this.solid = []; this.soft = []; this.facing = 0; }
  vert(p, n, uv, kind, clump, crown = -1) { this.p.push(p); this.n.push(n); this.uv.push(uv); this.kind.push(kind); this.clump.push(clump); this.crown.push(crown); this.view.push(this.facing); return this.p.length - 1; }
  tri(a, b, c, soft = true) { (soft ? this.soft : this.solid).push(a, b, c); }
}

// A card of leaves, folded along its middle: its foot at `foot`, running along `along` for `long`, `across` it for
// `wide`, folded toward `out` by `fold`.
function card(B, foot, along, across, out, long, wide, fold, tile, flip, clump, crown) {
  const t = tileAt(tile), du = t.du * 0.97 * (flip ? -1 : 1), dv = t.dv * 0.97;
  const lean = Math.sin(fold) * wide / 2, half = Math.cos(fold) * wide / 2, ids = [];
  const cols = fold > 0 ? [-1, 0, 1] : [-1, 1];
  for (let j = 0; j < 2; j++) for (const i of cols) {
    const p = add(add(add(foot, mul(along, j * long)), mul(across, i * half)), mul(out, Math.abs(i) * lean));
    ids.push(B.vert(p, out, [t.u + i * du, t.v + dv - j * 2 * dv], 1, clump, crown));
  }
  const w = cols.length;
  for (let i = 0; i + 1 < w; i++) { B.tri(ids[i], ids[i + 1], ids[w + i + 1]); B.tri(ids[i], ids[w + i + 1], ids[w + i]); }
}

// A lump: one card of leaves facing the viewer (the shader keeps it facing the viewer, and hands it one of the
// four outlines), cards crossed through its middle, and inner cards that lie in it toward the crown's outside, each
// held inside the lump so nothing stands clear of the crown.
function lump(B, L, out, K, rnd, ci, crown) {
  const { at, r } = L;
  B.facing = 1;
  {
    const f = unit([(rnd() - 0.5) * 0.2, 0.08, 1]), across = unit(cross([0, 1, 0], f)), up = cross(f, across), w = r * CARD.lump;
    const tilt = rnd() * Math.PI * 2, a2 = rotate(across, f, tilt), u2 = rotate(up, f, tilt);
    card(B, add(add(at, mul(f, r * 0.2)), mul(u2, -w)), u2, a2, f, 2 * w, 2 * w, 0, pick(TILES.lumps, rnd), rnd() < 0.5, ci, crown);
  }
  B.facing = 0;
  const turn = rnd() * Math.PI;
  for (let k = 0; k < K.cards.crossed; k++) {
    const a = turn + (k * Math.PI) / K.cards.crossed, face = unit([Math.sin(a), (rnd() - 0.5) * 0.5, Math.cos(a)]);
    const across = unit(cross([0, 1, 0], face)), up = cross(face, across), w = r * (0.9 + 0.1 * rnd());
    card(B, add(at, mul(up, -w)), up, across, face, 2 * w, 2 * w, 0, pick(TILES.inner, rnd), rnd() < 0.5, ci, crown);
  }
  const n = K.cards.inner[L.great ? 0 : 1];
  for (let k = 0; k < n; k++) {
    const d = unit(add(mul(out, 1.2), [rnd() - 0.5, rnd() - 0.5 + 0.2, rnd() - 0.5])), face = unit(add(d, [(rnd() - 0.5) * 0.6, 0.3, (rnd() - 0.5) * 0.6]));
    const across = unit(cross([0, 1, 0], face)), up = cross(face, across), w = r * CARD.inner * 0.5 * (0.85 + 0.3 * rnd());
    card(B, add(add(at, mul(d, r * 0.35)), mul(up, -w)), up, across, face, 2 * w, 2 * w, 0.25 + rnd() * 0.25, pick(TILES.inner, rnd), rnd() < 0.5, ci, crown);
  }
}

// A tube along a path of points, each with its radius, wearing bark. Its rings are a little out of round.
function tube(B, path, radii, sides, rnd, shape = () => 1) {
  const t = tileAt(TILES.bark), rings = [];
  let len = 0;
  for (let i = 0; i < path.length; i++) {
    if (i) len += Math.hypot(...sub(path[i], path[i - 1]));
    const dir = unit(sub(path[Math.min(i + 1, path.length - 1)], path[Math.max(i - 1, 0)])), u = anyPerp(dir), w = cross(dir, u), ring = [];
    const lump = [rnd() * 6.28, 0.05 + 0.07 * rnd()];
    for (let s = 0; s <= sides; s++) {
      const a = (s / sides) * Math.PI * 2, n = add(mul(u, Math.cos(a)), mul(w, Math.sin(a))), r = radii[i] * (1 + lump[1] * Math.sin(2 * a + lump[0])) * shape(i, a);
      ring.push(B.vert(add(path[i], mul(n, r)), n, [t.u - t.du * 0.95 + (s / sides) * t.du * 1.9, t.v - t.dv * 0.95 + ((len * 1.5) % 1) * t.dv * 1.9], 0, -1));
    }
    rings.push(ring);
  }
  for (let i = 0; i + 1 < rings.length; i++) for (let s = 0; s < sides; s++) {
    const a = rings[i][s], b = rings[i][s + 1], c = rings[i + 1][s], d = rings[i + 1][s + 1];
    B.tri(a, b, d, false); B.tri(a, d, c, false);
  }
}

export function tree(kind, { rays = 96 } = {}) {
  const K = KINDS[kind], index = Object.keys(KINDS).indexOf(kind), rnd = seeded(2203 + index * 7919), B = new Builder();

  // The lumps of each crown: one on top, the other great ones round its middle, the small ones in the gaps between
  // them on its outline, and one at its heart that fills it.
  const clumps = [], crowns = [];
  K.crowns.forEach((S, ki) => {
    const C = [S.at[0], S.at[1], S.at[2]], own = [], rx = S.rx, ry = S.ry;
    const la = rnd() * Math.PI * 2, lop = [Math.cos(la) * LUMP.lop * rx, Math.sin(la) * LUMP.lop * rx * 0.5];
    const span = (a, t) => a[0] + (a[1] - a[0]) * t;
    // Directions over the ball, a golden spiral turned at random, those on its far side left out.
    const ax = unit([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]), spin = rnd() * Math.PI * 2, dirs = [];
    for (let i = 0, n = 64; i < n; i++) {
      const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), a = i * 2.399963;
      const d = rotate([rr * Math.cos(a), y, rr * Math.sin(a)], ax, spin);
      if (d[2] >= LUMP.back) dirs.push(d);
    }
    // Each lump as far as it can be from those already seated, as the viewer sees them, so they spread evenly round
    // the ball and never bunch to one side.
    const chosen = [];
    const take = (count) => {
      const got = [];
      for (let i = 0; i < count; i++) {
        let best = dirs[Math.floor(rnd() * dirs.length)], far = -1;
        if (chosen.length) for (const d of dirs) {
          let near = Infinity;
          for (const q of chosen) near = Math.min(near, Math.hypot(d[0] - q[0], d[1] - q[1], 0.6 * (d[2] - q[2])));
          if (near > far) { far = near; best = d; }
        }
        chosen.push(best); got.push(best);
      }
      return got;
    };
    const seat = (d, r, sink) => {
      const w = [d[0] + (rnd() - 0.5) * LUMP.wander, d[1] + (rnd() - 0.5) * LUMP.wander, d[2] + (rnd() - 0.5) * LUMP.wander], u = unit(w);
      const R = 1 / Math.hypot(u[0] / rx, u[1] / ry, u[2] / rx);
      return [C[0] + lop[0] + u[0] * (R - r * sink), C[1] + u[1] * (R - r * sink), C[2] + lop[1] + u[2] * (R - r * sink)];
    };
    for (const d of take(S.great)) { const r = rx * span(LUMP.great, rnd()); own.push({ at: seat(d, r, LUMP.sink), r, great: true }); }
    for (const d of take(S.small)) { const r = rx * span(LUMP.small, rnd()); own.push({ at: seat(d, r, LUMP.smallSink), r, great: false }); }
    own.push({ at: [C[0] + lop[0], C[1], C[2] + lop[1]], r: Math.min(rx, ry) * LUMP.heart, great: false, heart: true });
    for (const L of own) clumps.push({ ...L, crown: ki });
    crowns.push({ C, rx, ry });
  });
  // The whole tree raised so its lowest leaves are CROWN.clear over the ground.
  const low = Math.min(...clumps.map((c) => c.at[1] - c.r * SEEN)), lift = (K.clear ?? CROWN.clear) - low;
  for (const c of clumps) c.at[1] += lift;
  for (const cr of crowns) cr.C[1] += lift;

  clumps.forEach((c, ci) => {
    const C = crowns[c.crown].C;
    lump(B, c, c.heart ? [0, 1, 0] : unit(sub(c.at, C)), c.heart ? { cards: { crossed: 1, inner: [0, 0] } } : K, rnd, ci, c.crown);
  });

  // A trunk to each crown, from one foot (two that part a little way up, for two crowns), from a foot that spreads in
  // lobes into the ground, tapering to its fork, and limbs from the fork up into the crown's heart and its great
  // lumps.
  const T = K.trunk, base = [(rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.04];
  crowns.forEach((cr, ki) => {
    const forkY = cr.C[1] - cr.ry * TRUNK.at, la = rnd() * Math.PI * 2, lean = [Math.cos(la) * BOLE.lean * forkY * (0.4 + 0.6 * rnd()), 0, Math.sin(la) * BOLE.lean * forkY * (0.4 + 0.6 * rnd())];
    const fork = [cr.C[0] * 0.7 + lean[0], forkY, cr.C[2] * 0.7 + lean[2]];
    const foot = crowns.length > 1 ? add(base, [Math.sign(cr.C[0]) * T.foot * 0.6, 0, 0]) : base;
    const ba = la + Math.PI / 2 + (rnd() - 0.5), bow = [Math.cos(ba) * BOLE.bow * forkY, 0, Math.sin(ba) * BOLE.bow * forkY];
    const hs = [-TRUNK.sunk, 0, 0.03, 0.09, 0.22, 0.45, 0.72, 1];
    const path = [], radii = [], ys = [];
    for (const h of hs) {
      const y = h < 0 ? h : h * forkY, t = Math.max(0, y) / forkY, along = t * t * (3 - 2 * t), b = Math.sin(Math.PI * t);
      path.push([foot[0] + (fork[0] - foot[0]) * along + bow[0] * b, y, foot[2] + (fork[2] - foot[2]) * along + bow[2] * b]);
      radii.push(T.foot * (1 - TRUNK.taper * t) * (1 + TRUNK.flare * Math.exp(-Math.max(0, y) / TRUNK.rise)));
      ys.push(y);
    }
    const n = ROOTS.lobes[0] + Math.floor(rnd() * (ROOTS.lobes[1] - ROOTS.lobes[0] + 1)), ph = rnd() * Math.PI * 2;
    tube(B, path, radii, T.sides, rnd, (i, a) => 1 + ROOTS.out * Math.exp(-Math.max(0, ys[i]) / ROOTS.rise) * Math.max(0, Math.cos(n * a + ph)) ** 2);
    if (!T.limbs) return;
    const greats = clumps.filter((c) => c.crown === ki && c.great && c.at[1] < cr.C[1] + cr.ry * 0.4).sort((a, b) => b.r - a.r);
    const atFork = T.foot * (1 - TRUNK.taper), M = TRUNK.limb;
    for (const c of [clumps.find((q) => q.crown === ki && q.heart), ...greats.slice(0, T.limbs - 1)]) {
      const end = lerp(fork, c.at, M.reach), out = unit([end[0] - fork[0] + 1e-3, 0, end[2] - fork[2]]), mid = add(lerp(fork, end, 0.45), add(mul(out, M.bow * Math.hypot(...sub(end, fork)) * (0.5 + rnd())), [0, 0.04 * rnd(), 0]));
      const r0 = atFork * M.from, r1 = T.foot * M.end;
      tube(B, [fork, lerp(fork, mid, 0.5), mid, end], [r0, r0 * 0.82, (r0 + r1) / 2, r1], 4, rnd);
    }
  });

  // The tree's own reach, so the model is scaled to a half width of 1: how far out its lumps' leaves are seen (not
  // the corners of its cards, which are bare), seen from the front and taken over eight turns of the tree.
  let reach = 0;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 8, ca = Math.cos(a), sa = Math.sin(a);
    let lo = Infinity, hi = -Infinity;
    for (const c of clumps) { const x = c.at[0] * ca + c.at[2] * sa; lo = Math.min(lo, x - c.r * SEEN); hi = Math.max(hi, x + c.r * SEEN); }
    reach += (hi - lo) / 16;
  }
  const scale = 1 / reach;
  for (let i = 0; i < B.p.length; i++) B.p[i] = mul(B.p[i], scale);
  for (const c of clumps) { c.at = mul(c.at, scale); c.r *= scale; }
  const balls = crowns.map((cr) => ({ C: mul(cr.C, scale), R: [cr.rx * scale * 0.98, cr.ry * scale * 0.98] }));

  // The shade on the ground, along the model's own x: the shader turns it to lie away from the moon.
  {
    const t = tileAt(TILES.blob), ids = [];
    for (const [a, s] of [[-SHADE.back, -1], [-SHADE.back, 1], [SHADE.reach, 1], [SHADE.reach, -1]]) ids.push(B.vert([a, SHADE.up, s * SHADE.wide], [0, 1, 0], [t.u + s * t.du * 0.98, t.v + (a < 0 ? -1 : 1) * t.dv * 0.98], 2, -1));
    B.tri(ids[0], ids[2], ids[1]); B.tri(ids[0], ids[3], ids[2]);
  }

  // The normal each leaf is lit by: its card's, its lump's and its crown's together, so the crown is lit as one
  // soft round mass with its lumps in it.
  const count = B.p.length, normals = new Float32Array(count * 3);
  const ellipse = (p, b) => [(p[0] - b.C[0]) / b.R[0], (p[1] - b.C[1]) / b.R[1], (p[2] - b.C[2]) / b.R[0]];
  for (let i = 0; i < count; i++) {
    let nn = B.n[i];
    if (B.kind[i] === 1) {
      const p = B.p[i], c = clumps[B.clump[i]], b = balls[B.crown[i]], toClump = unit(sub(p, c.at)), q = ellipse(p, b);
      const e = unit([q[0] / b.R[0], q[1] / b.R[1], q[2] / b.R[0]]), own = dot(nn, toClump) < 0 ? mul(nn, -1) : nn;
      nn = unit(add(add(mul(own, NORMAL.card), mul(toClump, NORMAL.clump)), mul(e, NORMAL.crown)));
    }
    normals.set(nn, i * 3);
  }

  // How open each place is: rays about its normal, through the lumps (each lets a share through, by how much of it
  // the ray crosses) and down to the ground; and the same in a cone straight up, which is how much sky is over it.
  const dirs = [], cone = [], nc = Math.max(8, rays >> 2);
  for (let k = 0; k < rays; k++) { const u = (k + 0.5) / rays, a = k * 2.399963, r = Math.sqrt(u); dirs.push([r * Math.cos(a), Math.sqrt(1 - u), r * Math.sin(a)]); }
  for (let k = 0; k < nc; k++) { const u = (k + 0.5) / nc, a = k * 2.399963, r = Math.sin(OCCLUDE.cone) * Math.sqrt(u); cone.push([r * Math.cos(a), Math.sqrt(1 - r * r), r * Math.sin(a)]); }
  const sigma = clumps.map((c) => -Math.log(OCCLUDE.clump) / (2 * c.r));
  const through = (p, d) => {
    let tau = 0;
    for (let c = 0; c < clumps.length; c++) {
      const o = sub(p, clumps[c].at), b = dot(d, o), cc = dot(o, o) - clumps[c].r * clumps[c].r, disc = b * b - cc;
      if (disc <= 0) continue;
      const s = Math.sqrt(disc);
      tau += sigma[c] * (Math.max(0, -b + s) - Math.max(0, -b - s));
    }
    return Math.exp(-tau) * (d[1] < 0 ? OCCLUDE.ground : 1);
  };
  const light = new Float32Array(count * 4), bounce = new Float32Array(count * 4), sway = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const p = B.p[i], nn = [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]], t1 = anyPerp(nn), t2 = cross(nn, t1);
    let open = 1, above = 1;
    if (B.kind[i] !== 2) {
      open = 0;
      for (const d0 of dirs) open += through(p, add(add(mul(t1, d0[0]), mul(nn, d0[1])), mul(t2, d0[2])));
      open = OCCLUDE.floor + (1 - OCCLUDE.floor) * (open / rays);
      above = 0;
      for (const d of cone) above += through(p, d);
      above /= cone.length;
    }
    const b = B.kind[i] === 1 ? balls[B.crown[i]] : balls[0], q = ellipse(p, b), e = B.kind[i] === 1 ? Math.hypot(...q) : 0;
    const edge = smooth(0.55, 1.05, e), lowness = 1 - smooth(b.C[1] - b.R[1] * 0.9, b.C[1] + b.R[1] * 0.2, p[1]);
    light.set([0, above, open, edge], i * 4);
    const up = Math.max(0, -nn[1]) * 0.7 + 0.3;
    bounce.set([GROUND[0] * up * open ** 0.5, GROUND[1] * up * open ** 0.5, GROUND[2] * up * open ** 0.5, lowness], i * 4);
    const w = B.kind[i] === 1 ? smooth(0.3, 2.2, p[1]) * (0.35 + 0.65 * edge) : B.kind[i] === 0 ? smooth(b.C[1] - b.R[1], b.C[1], p[1]) * 0.25 : 0;
    sway.set([w, B.clump[i] >= 0 ? ((B.clump[i] * 0.618034 + index * 0.31) % 1) : 0], i * 2);
  }

  // Each vertex's lump as a ball (its middle and its radius), and its crown's ball, for the shader. The bark has
  // none (a radius of 0) but carries its crown's ball, which the moon reaches it through, and the shade carries the
  // trunk's foot in place of a lump, which the shader turns it about.
  const clumpOf = new Float32Array(count * 4), crownOf = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const c = clumps[B.clump[i]], b = balls[Math.max(0, B.crown[i])];
    if (B.kind[i] === 1 && c) clumpOf.set([...c.at, c.r], i * 4);
    else if (B.kind[i] === 2) clumpOf.set([0, SHADE.up, 0, 0], i * 4);
    else clumpOf.set([...B.p[i], 0], i * 4);
    crownOf.set([...b.C, B.kind[i] === 2 ? 0 : (b.R[0] * 2 + b.R[1]) / 3], i * 4);
  }

  const positions = new Float32Array(B.p.flat()), uvs = new Float32Array(B.uv.flat());
  const info = { triangles: (B.solid.length + B.soft.length) / 3, soft: B.solid.length, leaf: B.soft.length / 3, clumps: clumps.length, top: Math.max(...clumps.map((c) => c.at[1] + c.r * SEEN)), crown: balls[0].C[1], half: balls[0].R };
  return { positions, normals, uvs, sway, light, bounce, clump: clumpOf, crown: crownOf, view: new Float32Array(B.view), indices: new Uint32Array([...B.solid, ...B.soft]), info };
}
