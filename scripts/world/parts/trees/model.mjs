// One tree, made in a crown's own units (src/pieces/world/parts/trees/design.ts): a trunk, or two, whose foot spreads
// in lobes into the ground, limbs up into the crown, and a crown of three to five masses of very different sizes,
// moved and grown at random and mirrored, so the outline is a few great lobes with dark where they meet. Each mass
// is filled with lumps of leaf seated over it from every side, each a card the shader keeps facing the viewer, and a
// card of its own leaves at its heart (so no turn of the tree shows a hole) with one crossed through it. A dark heart
// fills the crown's middle. And the shade it lays on the ground. With every vertex its stored light: how open its
// lump is and how much sky is over it (so what is deep in the crown, or where two masses meet, is shut in), what
// reaches it from the ground, and the numbers the shader moves and lights it by: the balls of its lump, its mass and
// its crown (the shader lights a leaf as a place on those, so the crown is lit as one mass, each mass breaks that
// light up, and a lump only a little).
//
//   import { tree } from './model.mjs'; const mesh = tree(kind, { rays })
//   mesh = { positions, normals, uvs, sway, light, bounce, clump, mass, crown, indices, info }
import { CARD, CROWN, SHADE, TILES, tileAt } from '../../../../src/pieces/world/parts/trees/design.ts';
import { seeded } from '../../../../src/pieces/world/layout.ts';

// Each model: its crowns (where each stands against the first's middle, its half widths across and up, and its
// masses), and its trunk (how thick at the foot, how many sides, how many limbs). A crown is three to five MASSES of
// very different sizes, each a mass of small lumps of leaf, with dark between them where they meet: never a ball
// of lumps of one size. Each mass is [across, up, toward the viewer, radius], against the crown's half widths.
const MASSES = {
  round: [[0.12, 0.34, 0, 0.62], [-0.48, 0.0, 0.1, 0.5], [0.52, -0.1, 0.06, 0.43], [-0.04, -0.34, 0.42, 0.36], [-0.3, 0.42, -0.36, 0.37]],
  tall: [[0.04, 0.48, 0, 0.54], [-0.34, 0.02, 0.1, 0.48], [0.36, -0.06, 0.04, 0.42], [0.0, -0.42, 0.3, 0.36]],
  broad: [[-0.22, 0.36, 0, 0.6], [0.52, 0.08, -0.06, 0.52], [-0.72, -0.16, 0.1, 0.38], [0.16, -0.28, 0.38, 0.42], [0.12, 0.34, -0.42, 0.36]],
  twinA: [[0, 0.28, 0, 0.6], [-0.38, -0.16, 0.16, 0.46], [0.3, -0.22, -0.1, 0.42]],
  twinB: [[0.05, 0.22, 0, 0.62], [0.42, -0.16, 0.1, 0.46], [-0.3, -0.26, 0.2, 0.4]],
  far: [[0.1, 0.26, 0, 0.62], [-0.48, -0.06, 0.1, 0.5], [0.48, -0.12, 0.1, 0.46]],
};
const KINDS = {
  round: { crowns: [{ at: [0, 0, 0], rx: 1, ry: 0.74, masses: MASSES.round }], trunk: { foot: 0.085, sides: 6, limbs: 2 } },
  tall: { crowns: [{ at: [0, 0, 0], rx: 0.86, ry: 0.5, masses: MASSES.tall }], trunk: { foot: 0.08, sides: 6, limbs: 2 } },
  twin: {
    crowns: [
      { at: [-0.4, -0.06, 0.06], rx: 0.7, ry: 0.6, masses: MASSES.twinA },
      { at: [0.4, 0.06, -0.06], rx: 0.68, ry: 0.62, masses: MASSES.twinB },
    ],
    trunk: { foot: 0.07, sides: 6, limbs: 1 },
  },
  broad: { crowns: [{ at: [0, -0.04, 0], rx: 1.08, ry: 0.8, masses: MASSES.broad }], trunk: { foot: 0.09, sides: 6, limbs: 2 } },
  far: { crowns: [{ at: [0, 0, 0], rx: 1, ry: 0.74, masses: MASSES.far }], far: true, trunk: { foot: 0.08, sides: 5, limbs: 0 } },
};
// How each mass is filled: how many lumps for its size (`base` and `per` lumps for a mass of radius 0.5, by its
// area), how large a lump is against its mass, how far its middle is sunk inside the mass's surface (against its own
// radius), how far a mass is moved and grown at random, and how wide the card at its heart is against it (the mass's
// own leaves, which fill it from every side, so no turn of the tree shows a hole). The cheap model has fewer.
// How far each mass stands from its crown's middle and how large it is, against MASSES: drawn closer and fuller,
// a crown reads as one head at the page's size, its masses its lobes and not trees of their own.
const GATHER = { at: 0.8, size: 1.1 };
const FILL = { base: 0.8, per: 2.2, far: 0.6, size: [0.56, 0.74], sink: 0.78, flat: 0.86, move: 0.07, grow: 0.08, core: 0.84, heart: 0.5 };
// The trunk: how much wider it flares at its foot and over what height, how much thinner it is at the fork, how far
// it is sunk, the fork's height under its crown's middle against the crown's half height, and the limbs it forks
// into: how thick each is where it leaves the fork against the trunk there, and at its end against the trunk's foot,
// how far along the way to its mass it reaches, and how far out from the trunk's line it bows. It is thin, with an
// eased flare, and mostly hidden under the lowest masses (thick and flared, the trunks read as tar stumps and
// mushrooms), and it is joined to the crown: the fork is under the lowest masses and the limbs run up into them.
const TRUNK = { flare: 0.22, rise: 0.09, taper: 0.4, sunk: 0.2, at: 0.4, limb: { from: 0.72, end: 0.2, reach: 0.8, bow: 0.16 } };
// The roots: the foot of the trunk spreads in lobes that run out and down into the ground: how many lobes, how far
// each stands out at the ground against the trunk's foot, and how fast it goes up the trunk.
const ROOTS = { lobes: [3, 5], out: 0.07, rise: 0.04 };
// How the trunk leans and bows: how far its fork stands off its foot to one side, at most, and how far its middle
// bows out of the straight line, against the fork's height.
const BOLE = { lean: 0.08, bow: 0.05 };
// How much a lump of leaf lets through when a ray crosses it whole, how much the ground lets through, and how open
// the most shut in place still is. How wide the cone of sky above a place is, in radians.
const OCCLUDE = { clump: 0.06, ground: 0.14, floor: 0.04, cone: 0.6 };
// The light the ground under a tree sends up: the moon on dull earth, as irradiance in linear light.
const GROUND = [0.16, 0.1, 0.06];
// How far out from its middle a lump's leaves are seen, against its radius (the atlas's outlines reach about this).
const SEEN = 0.8;
// How much each kind of normal makes up the one stored with a leaf: the card's own, its lump's, the crown's.
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
  // edges (leaves and the shade), which both passes draw. kind: 0 bark, 1 leaf, 2 the shade. Each leaf vertex knows
  // its lump and its mass.
  constructor() { this.p = []; this.n = []; this.uv = []; this.kind = []; this.clump = []; this.mass = []; this.view = []; this.solid = []; this.soft = []; this.facing = 0; }
  vert(p, n, uv, kind, clump, mass = -1) { this.p.push(p); this.n.push(n); this.uv.push(uv); this.kind.push(kind); this.clump.push(clump); this.mass.push(mass); this.view.push(this.facing); return this.p.length - 1; }
  tri(a, b, c, soft = true) { (soft ? this.soft : this.solid).push(a, b, c); }
}

// A flat card of leaves: its foot at `foot`, running along `along` for `long`, `across` it for `wide`.
function card(B, foot, along, across, out, long, wide, tile, flip, clump, mass) {
  const t = tileAt(tile), du = t.du * 0.97 * (flip ? -1 : 1), dv = t.dv * 0.97, ids = [];
  for (let j = 0; j < 2; j++) for (const i of [-1, 1]) ids.push(B.vert(add(add(foot, mul(along, j * long)), mul(across, (i * wide) / 2)), out, [t.u + i * du, t.v + dv - j * 2 * dv], 1, clump, mass));
  B.tri(ids[0], ids[1], ids[3]); B.tri(ids[0], ids[3], ids[2]);
}
// A card the shader keeps facing the viewer, about a middle, so wide each way.
function facing(B, at, w, tile, rnd, ci, mi) {
  B.facing = 1;
  const f = [0, 0, 1], tilt = (rnd() - 0.5) * 0.5, a2 = [Math.cos(tilt), Math.sin(tilt), 0], u2 = [-Math.sin(tilt), Math.cos(tilt), 0];
  card(B, add(at, mul(u2, -w)), u2, a2, f, 2 * w, 2 * w, tile, rnd() < 0.5, ci, mi);
  B.facing = 0;
}
// A card crossed through a middle, turned `a` round the trunk's line.
function crossed(B, at, w, a, tile, rnd, ci, mi) {
  const face = unit([Math.sin(a), (rnd() - 0.5) * 0.4, Math.cos(a)]), across = unit(cross([0, 1, 0], face)), up = cross(face, across);
  card(B, add(at, mul(up, -w)), up, across, face, 2 * w, 2 * w, tile, rnd() < 0.5, ci, mi);
}

// A tube along a path of points, each with its radius, wearing bark. Its rings are a little out of round.
function tube(B, path, radii, sides, rnd, shape = () => 1) {
  const t = tileAt(TILES.bark), rings = [];
  let len = 0;
  for (let i = 0; i < path.length; i++) {
    if (i) len += Math.hypot(...sub(path[i], path[i - 1]));
    const dir = unit(sub(path[Math.min(i + 1, path.length - 1)], path[Math.max(i - 1, 0)])), u = anyPerp(dir), w = cross(dir, u), ring = [];
    const lump = [rnd() * 6.28, 0.04 + 0.05 * rnd()];
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
  const span = (a, t) => a[0] + (a[1] - a[0]) * t;

  // The masses of each crown, each moved and grown a little and the whole mirrored at random, then the lumps that
  // fill each mass, seated over it from every side by a golden spiral turned at random.
  const masses = [], clumps = [], crowns = [];
  K.crowns.forEach((S, ki) => {
    const C = [...S.at], flip = rnd() < 0.5 ? -1 : 1;
    crowns.push({ C, rx: S.rx, ry: S.ry });
    for (const [mx, my, mz, mr] of S.masses) {
      const r = mr * GATHER.size * S.rx * (1 + FILL.grow * (2 * rnd() - 1));
      const at = [C[0] + (flip * mx * GATHER.at + FILL.move * (2 * rnd() - 1)) * S.rx, C[1] + (my * GATHER.at + FILL.move * (2 * rnd() - 1)) * S.ry, C[2] + (mz * GATHER.at + FILL.move * (2 * rnd() - 1)) * S.rx];
      masses.push({ at, r, crown: ki });
    }
    masses.push({ at: [...C], r: Math.min(S.rx, S.ry) * FILL.heart, crown: ki, heart: true });
  });
  const biggest = Math.max(...masses.map((m) => m.r));
  masses.forEach((M, mi) => {
    M.core = clumps.length;
    clumps.push({ at: M.at, r: M.r * FILL.core, mass: mi, core: true, crown: M.crown });
    if (M.heart) return;
    const n = Math.max(1, Math.round((FILL.base + FILL.per * (M.r / 0.5) ** 2) * (K.far ? FILL.far : 1)));
    const ax = unit([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]), spin = rnd() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), a = i * 2.399963;
      const d = unit(rotate([rr * Math.cos(a), y * 0.9 + 0.12, rr * Math.sin(a)], ax, spin)), r = M.r * span(FILL.size, rnd());
      clumps.push({ at: add(M.at, [d[0] * (M.r - r * FILL.sink), d[1] * (M.r * FILL.flat - r * FILL.sink), d[2] * (M.r - r * FILL.sink)]), r, mass: mi, crown: M.crown });
    }
  });
  // The tree's own reach, so the model is scaled to a half width of 1: how far out its lumps' leaves are seen, seen
  // from the front and taken over eight turns of the tree.
  let reach = 0;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 8, ca = Math.cos(a), sa = Math.sin(a);
    let lo = Infinity, hi = -Infinity;
    for (const c of clumps) { const x = c.at[0] * ca + c.at[2] * sa; lo = Math.min(lo, x - c.r * SEEN); hi = Math.max(hi, x + c.r * SEEN); }
    reach += (hi - lo) / 16;
  }
  const scale = 1 / reach;
  // The whole tree raised so its lowest leaves are CROWN.clear over the ground, in the units it is drawn at.
  const low = Math.min(...clumps.map((c) => c.at[1] - c.r * SEEN)), lift = (K.far ? CROWN.far : CROWN.clear) / scale - low;
  for (const c of clumps) c.at[1] += lift;
  for (const m of masses) if (!clumps.some((c) => c.at === m.at)) m.at[1] += lift;
  for (const cr of crowns) cr.C[1] += lift;

  // The cards: each lump one facing the viewer, each mass a card at its heart and one crossed through it (which,
  // with the rest, casts its shadow).
  clumps.forEach((c, ci) => {
    const tile = c.core ? pick(TILES.core, rnd) : pick(TILES.lumps, rnd);
    facing(B, c.at, c.r * (c.core ? CARD.core : CARD.lump), tile, rnd, ci, c.mass);
    if (c.core && !masses[c.mass].heart && (!K.far || masses[c.mass].r === biggest)) crossed(B, c.at, c.r * CARD.core * 0.95, rnd() * Math.PI, pick(TILES.core, rnd), rnd, ci, c.mass);
  });

  // A trunk to each crown, from one foot (two that part a little way up, for two crowns), from a foot that spreads in
  // lobes into the ground, tapering to its fork, and limbs from the fork up into its largest masses.
  const T = K.trunk, base = [(rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.04];
  crowns.forEach((cr, ki) => {
    const forkY = cr.C[1] - cr.ry * TRUNK.at, la = rnd() * Math.PI * 2, lean = [Math.cos(la) * BOLE.lean * forkY * (0.4 + 0.6 * rnd()), 0, Math.sin(la) * BOLE.lean * forkY * (0.4 + 0.6 * rnd())];
    const fork = [cr.C[0] * 0.7 + lean[0], forkY, cr.C[2] * 0.7 + lean[2]];
    const foot = crowns.length > 1 ? add(base, [Math.sign(cr.C[0]) * T.foot * 0.5, 0, 0]) : base;
    const ba = la + Math.PI / 2 + (rnd() - 0.5), bow = [Math.cos(ba) * BOLE.bow * forkY, 0, Math.sin(ba) * BOLE.bow * forkY];
    const hs = K.far ? [-TRUNK.sunk, 0, 0.5, 1] : [-TRUNK.sunk, 0, 0.04, 0.3, 0.65, 1];
    const path = [], radii = [], ys = [];
    for (const h of hs) {
      const y = h < 0 ? h : h * forkY, t = Math.max(0, y) / forkY, along = t * t * (3 - 2 * t), b = Math.sin(Math.PI * t);
      path.push([foot[0] + (fork[0] - foot[0]) * along + bow[0] * b, y, foot[2] + (fork[2] - foot[2]) * along + bow[2] * b]);
      radii.push(T.foot * (1 - TRUNK.taper * t) * (1 + TRUNK.flare * Math.exp(-Math.max(0, y) / TRUNK.rise)));
      ys.push(y);
    }
    const n = ROOTS.lobes[0] + Math.floor(rnd() * (ROOTS.lobes[1] - ROOTS.lobes[0] + 1)), ph = rnd() * Math.PI * 2;
    tube(B, path, radii, T.sides, rnd, (i, a) => 1 + ROOTS.out * Math.exp(-Math.max(0, ys[i]) / ROOTS.rise) * Math.max(0, Math.cos(n * a + ph)) ** 2);
    const atFork = T.foot * (1 - TRUNK.taper), M = TRUNK.limb;
    const ends = masses.filter((m) => m.crown === ki && !m.heart).sort((a, b) => b.r - a.r).slice(0, T.limbs);
    for (const m of ends) {
      const end = lerp(fork, m.at, M.reach), out = unit([end[0] - fork[0] + 1e-3, 0, end[2] - fork[2]]), mid = add(lerp(fork, end, 0.45), mul(out, M.bow * Math.hypot(...sub(end, fork)) * (0.5 + rnd())));
      const r0 = atFork * M.from, r1 = T.foot * M.end;
      tube(B, [fork, mid, end], [r0, (r0 + r1) / 2, r1], 3, rnd);
    }
  });

  for (let i = 0; i < B.p.length; i++) B.p[i] = mul(B.p[i], scale);
  const scaled = new Set();
  for (const c of [...clumps, ...masses]) { if (!scaled.has(c.at)) { c.at.splice(0, 3, ...mul(c.at, scale)); scaled.add(c.at); } c.r *= scale; }
  const balls = crowns.map((cr) => ({ C: mul(cr.C, scale), R: [cr.rx * scale * 0.98, cr.ry * scale * 0.98] }));

  // The shade on the ground, along the model's own x: the shader turns it to lie away from the moon.
  {
    const t = tileAt(TILES.blob), ids = [];
    for (const [a, s] of [[-SHADE.back, -1], [-SHADE.back, 1], [SHADE.reach, 1], [SHADE.reach, -1]]) ids.push(B.vert([a, SHADE.up, s * SHADE.wide], [0, 1, 0], [t.u + s * t.du * 0.98, t.v + (a < 0 ? -1 : 1) * t.dv * 0.98], 2, -1));
    B.tri(ids[0], ids[2], ids[1]); B.tri(ids[0], ids[3], ids[2]);
  }

  // The normal stored with each leaf: its card's, its lump's and its crown's together.
  const count = B.p.length, normals = new Float32Array(count * 3);
  const crownOfClump = (c) => balls[c.crown];
  const ellipse = (p, b) => [(p[0] - b.C[0]) / b.R[0], (p[1] - b.C[1]) / b.R[1], (p[2] - b.C[2]) / b.R[0]];
  for (let i = 0; i < count; i++) {
    let nn = B.n[i];
    if (B.kind[i] === 1) {
      const p = B.p[i], c = clumps[B.clump[i]], b = crownOfClump(c), toClump = unit(sub(p, c.at)), q = ellipse(p, b);
      const e = unit([q[0] / b.R[0], q[1] / b.R[1], q[2] / b.R[0]]), own = dot(nn, toClump) < 0 ? mul(nn, -1) : nn;
      nn = unit(add(add(mul(own, NORMAL.card), mul(toClump, NORMAL.clump)), mul(e, NORMAL.crown)));
    }
    normals.set(nn, i * 3);
  }

  // How open each lump is: rays from the outer part of the lump (out from its crown's middle) through every other
  // lump (each lets a share through, by how much of it the ray crosses) and down to the ground; and the same in a
  // cone straight up, which is how much sky is over it. One number for the whole lump, so a lump on top of its crown
  // or on the outside of a mass is open, one deep in the crown or where two masses meet is shut, and the shader keeps
  // the moon, the sky and the fill off what is shut.
  const dirs = [], cone = [], nc = Math.max(8, rays >> 2);
  for (let k = 0; k < rays; k++) { const u = (k + 0.5) / rays, a = k * 2.399963, r = Math.sqrt(u); dirs.push([r * Math.cos(a), Math.sqrt(1 - u), r * Math.sin(a)]); }
  for (let k = 0; k < nc; k++) { const u = (k + 0.5) / nc, a = k * 2.399963, r = Math.sin(OCCLUDE.cone) * Math.sqrt(u); cone.push([r * Math.cos(a), Math.sqrt(1 - r * r), r * Math.sin(a)]); }
  const sigma = clumps.map((c) => -Math.log(OCCLUDE.clump) / (2 * c.r));
  const through = (p, d, self) => {
    let tau = 0;
    for (let c = 0; c < clumps.length; c++) {
      if (c === self) continue;
      const o = sub(p, clumps[c].at), b = dot(d, o), cc = dot(o, o) - clumps[c].r * clumps[c].r, disc = b * b - cc;
      if (disc <= 0) continue;
      const s = Math.sqrt(disc);
      tau += sigma[c] * (Math.max(0, -b + s) - Math.max(0, -b - s));
    }
    return Math.exp(-tau) * (d[1] < 0 ? OCCLUDE.ground : 1);
  };
  const lumpLight = clumps.map((c, ci) => {
    const b = crownOfClump(c), n = unit(add(sub(c.at, b.C), [0, 1e-3, 0])), p = add(c.at, mul(n, c.r * 0.55)), t1 = anyPerp(n), t2 = cross(n, t1);
    let open = 0, above = 0;
    for (const d0 of dirs) open += through(p, add(add(mul(t1, d0[0]), mul(n, d0[1])), mul(t2, d0[2])), ci);
    for (const d of cone) above += through(p, d, ci);
    return [OCCLUDE.floor + (1 - OCCLUDE.floor) * (open / rays), above / cone.length];
  });
  const light = new Float32Array(count * 4), bounce = new Float32Array(count * 4), sway = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const p = B.p[i], nn = [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]];
    let open = 1, above = 1;
    if (B.kind[i] === 1) [open, above] = lumpLight[B.clump[i]];
    else if (B.kind[i] === 0) { open = 0.35; above = 0.1; }
    const b = B.kind[i] === 1 ? crownOfClump(clumps[B.clump[i]]) : balls[0], q = ellipse(p, b), e = B.kind[i] === 1 ? Math.hypot(...q) : 0;
    const edge = smooth(0.55, 1.05, e), lowness = 1 - smooth(b.C[1] - b.R[1] * 0.9, b.C[1] + b.R[1] * 0.2, p[1]);
    light.set([0, above, open, edge], i * 4);
    const up = Math.max(0, -nn[1]) * 0.7 + 0.3;
    bounce.set([GROUND[0] * up * open ** 0.5, GROUND[1] * up * open ** 0.5, GROUND[2] * up * open ** 0.5, lowness], i * 4);
    const w = B.kind[i] === 1 ? smooth(0.3, 2.2, p[1]) * (0.35 + 0.65 * edge) : B.kind[i] === 0 ? smooth(b.C[1] - b.R[1], b.C[1], p[1]) * 0.25 : 0;
    sway.set([w, B.clump[i] >= 0 ? ((B.clump[i] * 0.618034 + index * 0.31) % 1) : 0, B.view[i]], i * 3);
  }

  // Each vertex's lump, its mass and its crown, as balls (a middle and a radius), for the shader. The bark has none
  // (a radius of 0) but carries its crown's ball, which the moon reaches it through, and the shade carries the
  // trunk's foot in place of a lump, which the shader turns it about.
  const clumpOf = new Float32Array(count * 4), massOf = new Float32Array(count * 4), crownOf = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const c = clumps[B.clump[i]], b = B.kind[i] === 1 && c ? crownOfClump(c) : balls[0];
    if (B.kind[i] === 1 && c) { clumpOf.set([...c.at, c.r], i * 4); const m = masses[c.mass]; massOf.set([...m.at, m.r], i * 4); }
    else if (B.kind[i] === 2) { clumpOf.set([0, SHADE.up, 0, 0], i * 4); massOf.set([0, SHADE.up, 0, 0], i * 4); }
    else { clumpOf.set([...B.p[i], 0], i * 4); massOf.set([...B.p[i], 0], i * 4); }
    crownOf.set([...b.C, B.kind[i] === 2 ? 0 : (b.R[0] * 2 + b.R[1]) / 3], i * 4);
  }

  const positions = new Float32Array(B.p.flat()), uvs = new Float32Array(B.uv.flat());
  const info = { triangles: (B.solid.length + B.soft.length) / 3, soft: B.solid.length, shade: 2, leaf: B.soft.length / 3, clumps: clumps.length, masses: masses.length, top: Math.max(...clumps.map((c) => c.at[1] + c.r * SEEN)), crown: balls[0].C[1], half: balls[0].R };
  return { positions, normals, uvs, sway, light, bounce, clump: clumpOf, mass: massOf, crown: crownOf, indices: new Uint32Array([...B.solid, ...B.soft]), info };
}
