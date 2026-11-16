// One tree, made in a crown's own units (src/pieces/world/parts/trees/design.ts): a short trunk that forks into
// limbs, a crown of clumps of leaf, each three discs of leaves crossed at its heart with sprays of leaves round
// them on cards, and the soft shadow under it. With every vertex its stored light: how open it is (darker inside
// the crown and beneath it), what reaches it from the ground, and the numbers the shader moves and lights it by:
// the ball of its clump and the ball of its crown (the shader lights a leaf as a place on those two balls, seen
// from where the viewer is, so a clump reads round whichever way its cards lie).
//
//   import { tree } from './model.mjs'; const mesh = tree(model, { rays })
//   mesh = { positions, normals, uvs, sway, light, bounce, clump, crown, indices, info }
import { CROWN, TILES, tileAt } from '../../../../src/pieces/world/parts/trees/design.ts';
import { seeded } from '../../../../src/pieces/world/layout.ts';

// Each model's crown: its half widths across and up, how many clumps make its outer shell, how big a clump is
// against the crown, and how lopsided the crown is.
const SHAPES = [
  { rx: 1, ry: 0.9, clumps: 13, size: [0.36, 0.46], lop: 0.08, lobes: 0 },
  { rx: 0.9, ry: 1.04, clumps: 13, size: [0.34, 0.44], lop: 0.1, lobes: 0 },
  { rx: 1.04, ry: 0.8, clumps: 13, size: [0.35, 0.45], lop: 0.12, lobes: 0 },
  { rx: 1, ry: 0.92, clumps: 13, size: [0.34, 0.45], lop: 0.06, lobes: 2 },
];
// A clump: how many discs are crossed at its heart and how wide against it, how many sprays face out of it and
// how many stand out from it, and how far the two halves of a standing card are folded, in radians.
const CLUMP = { discs: 3, disc: 1.05, facing: 3, standing: 3, fold: [0.3, 0.6] };
// The trunk and the limbs: how thick at the foot and at the fork, how far it is sunk, the fork's height under the
// crown's middle against its half height, and the limbs' thickness.
const TRUNK = { foot: 0.12, flare: 1.45, fork: 0.075, sunk: 0.25, at: 0.5, sides: 5, limbs: 3, limb: [0.055, 0.024], limbSides: 4 };
// How much a clump of leaf lets through when a ray crosses it whole, and how much the ground lets through.
const OCCLUDE = { clump: 0.12, ground: 0.14, floor: 0.07 };
// The light the ground under a tree sends up: the moon on dull paving, as irradiance in linear light.
const GROUND = [0.2, 0.15, 0.11];
// The soft shadow under it: how wide against the crown, and how far over the ground.
const BLOB = { wide: 1.3, up: 0.03 };
// How far out from its middle a clump's leaves are seen, against its radius.
const SEEN = 1.05;
// How much each kind of normal makes up the one a leaf is lit by: the card's own, its clump's, the crown's.
const NORMAL = { card: 0.15, clump: 0.45, crown: 0.6 };

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rotate = (v, axis, ang) => { const c = Math.cos(ang), s = Math.sin(ang), k = axis; return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c))); };
const anyPerp = (n) => unit(Math.abs(n[1]) < 0.9 ? cross(n, [0, 1, 0]) : cross(n, [1, 0, 0]));

class Builder {
  // Two lists of triangles: what is solid leaf or bark everywhere, which only the first pass draws, and what has soft
  // edges, which both passes draw.
  constructor() { this.p = []; this.n = []; this.uv = []; this.kind = []; this.clump = []; this.solid = []; this.soft = []; }
  vert(p, n, uv, kind, clump) { this.p.push(p); this.n.push(n); this.uv.push(uv); this.kind.push(kind); this.clump.push(clump); return this.p.length - 1; }
  tri(a, b, c, soft = true) { (soft ? this.soft : this.solid).push(a, b, c); }
}

// A card of leaves, folded along its middle: its foot at `foot`, running along `along` for `long`, `across` it for
// `wide`, folded toward `out` by `fold`. The spray's twig is at the foot of its tile.
function card(B, foot, along, across, out, long, wide, fold, tile, flip, clump) {
  const t = tileAt(tile), du = t.du * 0.97 * (flip ? -1 : 1), dv = t.dv * 0.97;
  const lean = Math.sin(fold) * wide / 2, half = Math.cos(fold) * wide / 2, ids = [];
  const cols = fold > 0 ? [-1, 0, 1] : [-1, 1];
  for (let j = 0; j < 2; j++) for (const i of cols) {
    const p = add(add(add(foot, mul(along, j * long)), mul(across, i * half)), mul(out, Math.abs(i) * lean));
    ids.push(B.vert(p, out, [t.u + i * du, t.v + dv - j * 2 * dv], 1, clump));
  }
  const w = cols.length;
  for (let i = 0; i + 1 < w; i++) { B.tri(ids[i], ids[i + 1], ids[w + i + 1]); B.tri(ids[i], ids[w + i + 1], ids[w + i]); }
}

// The heart of a clump: discs of leaves standing through its middle, each turned a third of the way round from the
// last and leaning a little, so from any side one of them is seen nearly face on.
function discs(B, at, r, rnd, clump) {
  const turn = rnd() * Math.PI;
  for (let k = 0; k < CLUMP.discs; k++) {
    const a = turn + (k * Math.PI) / CLUMP.discs, face = unit([Math.sin(a), (rnd() - 0.5) * 0.4, Math.cos(a)]);
    const across = unit(cross([0, 1, 0], face)), up = cross(face, across), w = r * CLUMP.disc * (0.92 + 0.16 * rnd());
    const foot = add(at, mul(up, -w));
    card(B, foot, up, across, face, 2 * w, 2 * w, 0, TILES.discs[Math.floor(rnd() * TILES.discs.length)], rnd() < 0.5, clump);
  }
}

// A tube along a path of points, each with its radius, wearing bark.
function tube(B, path, radii, sides, rnd) {
  const t = tileAt(TILES.bark), rings = [];
  let len = 0;
  for (let i = 0; i < path.length; i++) {
    if (i) len += Math.hypot(...sub(path[i], path[i - 1]));
    const dir = unit(sub(path[Math.min(i + 1, path.length - 1)], path[Math.max(i - 1, 0)])), u = anyPerp(dir), w = cross(dir, u), ring = [];
    for (let s = 0; s <= sides; s++) {
      const a = (s / sides) * Math.PI * 2, n = add(mul(u, Math.cos(a)), mul(w, Math.sin(a))), r = radii[i] * (s === sides ? 1 : 0.92 + 0.16 * rnd());
      ring.push(B.vert(add(path[i], mul(n, r)), n, [t.u - t.du * 0.95 + (s / sides) * t.du * 1.9, t.v - t.dv * 0.95 + ((len * 1.5) % 1) * t.dv * 1.9], 0, -1));
    }
    rings.push(ring);
  }
  for (let i = 0; i + 1 < rings.length; i++) for (let s = 0; s < sides; s++) {
    const a = rings[i][s], b = rings[i][s + 1], c = rings[i + 1][s], d = rings[i + 1][s + 1];
    B.tri(a, b, d, false); B.tri(a, d, c, false);
  }
}

export function tree(model, { rays = 96 } = {}) {
  const S = SHAPES[model], rnd = seeded(1301 + model * 7919), B = new Builder();
  const cy = CROWN.high, crown = [0, cy, 0];
  // How far out the crown reaches toward a direction: lopsided by a few slow waves, and in two lobes for one model.
  const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const reach = (d) => {
    let k = 1 + S.lop * (Math.sin(3 * d[0] + ph[0]) * 0.6 + Math.sin(2 * d[2] + 2 * d[1] + ph[1]) * 0.5 + Math.sin(4 * d[1] + d[0] + ph[2]) * 0.3);
    if (S.lobes) k *= 1 + 0.12 * Math.cos(2 * Math.atan2(d[2], d[0]) + ph[0]) * (1 - Math.abs(d[1]));
    return k;
  };

  // The clumps: the outer shell, spread evenly round the crown and jittered, with the underside drawn up, and two
  // at the heart.
  const clumps = [];
  const n = S.clumps, golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), th = i * golden + rnd() * 0.5;
    const d = unit([r * Math.cos(th) + (rnd() - 0.5) * 0.25, y + (rnd() - 0.5) * 0.2, r * Math.sin(th) + (rnd() - 0.5) * 0.25]);
    const k = reach(d) * (0.6 + 0.1 * rnd());
    const at = [d[0] * S.rx * k, cy + Math.max(-0.5 * S.ry, d[1] * S.ry * k), d[2] * S.rx * k];
    const size = S.size[0] + (S.size[1] - S.size[0]) * (0.5 * rnd() + 0.5 * (0.5 + 0.5 * d[1]));
    clumps.push({ at, r: size, d });
  }
  for (let i = 0; i < 1; i++) clumps.push({ at: [(rnd() - 0.5) * 0.3, cy + (i ? 0.15 : -0.12), (rnd() - 0.5) * 0.3], r: 0.4, d: [0, i ? 1 : -1, 0] });

  clumps.forEach((c, ci) => {
    discs(B, c.at, c.r, rnd, ci);
    const out = unit(sub(c.at, crown));
    for (let k = 0; k < CLUMP.facing; k++) {
      // Facing out of the clump, toward the crown's outside, each turned at random.
      const d = unit(add(mul(out, 0.9), [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5].map((x) => x * 1.6)));
      const along = rotate(anyPerp(d), d, rnd() * Math.PI * 2), across = cross(d, along), long = c.r * (1.2 + 0.4 * rnd());
      const foot = add(add(c.at, mul(d, c.r * 0.5)), mul(along, -long / 2));
      card(B, foot, along, across, d, long, long * 0.95, 0, TILES.sprays[Math.floor(rnd() * TILES.sprays.length)], rnd() < 0.5, ci);
    }
    for (let k = 0; k < CLUMP.standing; k++) {
      // Standing out of the clump from its heart, so its leaves break the crown's outline.
      const d = unit(add(mul(out, 0.8), [rnd() - 0.5, rnd() - 0.5 + 0.3, rnd() - 0.5].map((x) => x * 1.8)));
      const across = rotate(anyPerp(d), d, rnd() * Math.PI * 2), face = cross(d, across), long = c.r * (1.05 + 0.3 * rnd());
      card(B, add(c.at, mul(d, c.r * 0.12)), d, across, face, long, long * 0.9, CLUMP.fold[0] + rnd() * (CLUMP.fold[1] - CLUMP.fold[0]), TILES.sprays[Math.floor(rnd() * TILES.sprays.length)], rnd() < 0.5, ci);
    }
  });

  // The trunk to the fork, leaning a little, and the limbs from the fork to the clumps at the heart and the lowest
  // of the shell, each bending up on its way.
  const lean = [(rnd() - 0.5) * 0.12, 0, (rnd() - 0.5) * 0.12], forkY = cy - S.ry * TRUNK.at, fork = [lean[0], forkY, lean[2]];
  const ys = [-TRUNK.sunk, 0, 0.08, forkY * 0.55, forkY];
  tube(B, ys.map((y) => [lean[0] * Math.max(0, y) / forkY, y, lean[2] * Math.max(0, y) / forkY]), ys.map((y) => TRUNK.foot * (1 + (TRUNK.flare - 1) * Math.exp(-Math.max(0, y) / 0.06)) + (TRUNK.fork - TRUNK.foot) * Math.max(0, y / forkY)), TRUNK.sides, rnd);
  const low = clumps.slice(0, n).map((c, i) => [c.at[1], i]).sort((a, b) => a[0] - b[0]).slice(0, TRUNK.limbs - 1).map(([, i]) => clumps[i]);
  for (const c of [clumps[n], ...low]) {
    const end = add(fork, mul(sub(c.at, fork), 0.8)), mid = add(add(fork, mul(sub(end, fork), 0.5)), [0, 0.12, 0]);
    tube(B, [fork, mid, end], [TRUNK.limb[0], (TRUNK.limb[0] + TRUNK.limb[1]) / 2, TRUNK.limb[1]], TRUNK.limbSides, rnd);
  }

  // The crown's own reach, so the model is scaled to a half width of 1: how far out its clumps' leaves are seen,
  // not the corners of its cards, which are mostly bare.
  const wide = clumps.map((c) => Math.hypot(c.at[0], c.at[2]) + c.r * SEEN).sort((a, b) => a - b);
  const half = wide[Math.floor(wide.length * 0.85)], scale = 1 / half;
  for (let i = 0; i < B.p.length; i++) B.p[i] = [B.p[i][0] * scale, B.p[i][1] * scale, B.p[i][2] * scale];
  for (const c of clumps) { c.at = mul(c.at, scale); c.r *= scale; }
  const C = mul(crown, scale), R = [S.rx * scale * 0.95, S.ry * scale * 0.95];

  // The shadow under it.
  {
    const t = tileAt(TILES.blob), w = BLOB.wide, y = BLOB.up, ids = [];
    for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) ids.push(B.vert([i * w, y, j * w], [0, 1, 0], [t.u + i * t.du * 0.98, t.v + j * t.dv * 0.98], 2, -1));
    B.tri(ids[0], ids[2], ids[1]); B.tri(ids[0], ids[3], ids[2]);
  }

  // The normal each leaf is lit by: its card's, its clump's and the crown's together, so the crown is lit as one
  // soft round mass with its clumps in it.
  const count = B.p.length, normals = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let nn = B.n[i];
    if (B.kind[i] === 1) {
      const p = B.p[i], c = clumps[B.clump[i]], toClump = unit(sub(p, c.at));
      const e = unit([(p[0] - C[0]) / (R[0] * R[0]), (p[1] - C[1]) / (R[1] * R[1]), (p[2] - C[2]) / (R[0] * R[0])]);
      const own = dot(nn, toClump) < 0 ? mul(nn, -1) : nn;
      nn = unit(add(add(mul(own, NORMAL.card), mul(toClump, NORMAL.clump)), mul(e, NORMAL.crown)));
    }
    normals.set(nn, i * 3);
  }

  // How open each place is: rays about its normal, through the clumps (each lets a share through, by how much of it
  // the ray crosses) and down to the ground.
  const dirs = [];
  for (let k = 0; k < rays; k++) { const u = (k + 0.5) / rays, a = k * 2.399963; const r = Math.sqrt(u); dirs.push([r * Math.cos(a), Math.sqrt(1 - u), r * Math.sin(a)]); }
  const sigma = clumps.map((c) => -Math.log(OCCLUDE.clump) / (2 * c.r));
  const light = new Float32Array(count * 4), bounce = new Float32Array(count * 4), sway = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const p = B.p[i], nn = [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]], t1 = anyPerp(nn), t2 = cross(nn, t1);
    let open = 0;
    if (B.kind[i] === 2) open = 1;
    else {
      for (const d0 of dirs) {
        const d = add(add(mul(t1, d0[0]), mul(nn, d0[1])), mul(t2, d0[2]));
        let tau = 0;
        for (let c = 0; c < clumps.length; c++) {
          const o = sub(p, clumps[c].at), b = dot(d, o), cc = dot(o, o) - clumps[c].r * clumps[c].r, disc = b * b - cc;
          if (disc <= 0) continue;
          const s = Math.sqrt(disc), t0 = Math.max(0, -b - s), tt = Math.max(0, -b + s);
          tau += sigma[c] * (tt - t0);
        }
        open += Math.exp(-tau) * (d[1] < 0 ? OCCLUDE.ground : 1);
      }
      open = OCCLUDE.floor + (1 - OCCLUDE.floor) * (open / rays);
    }
    const e = B.kind[i] === 1 ? Math.hypot((p[0] - C[0]) / R[0], (p[1] - C[1]) / R[1], (p[2] - C[2]) / R[0]) : 0;
    const edge = smooth(0.55, 1.05, e), lowness = 1 - smooth(C[1] - R[1] * 0.9, C[1] + R[1] * 0.2, p[1]);
    light.set([0, 1, open, edge], i * 4);
    const up = Math.max(0, -nn[1]) * 0.7 + 0.3;
    bounce.set([GROUND[0] * up * open ** 0.5, GROUND[1] * up * open ** 0.5, GROUND[2] * up * open ** 0.5, lowness], i * 4);
    const w = B.kind[i] === 1 ? smooth(0.3, 2.2, p[1]) * (0.35 + 0.65 * edge) : B.kind[i] === 0 ? smooth(C[1] - R[1], C[1], p[1]) * 0.25 : 0;
    sway.set([w, B.clump[i] >= 0 ? ((B.clump[i] * 0.618034) % 1) : 0], i * 2);
  }

  // Each vertex's clump as a ball (its middle and its radius), and the crown's ball, for the shader. The trunk and
  // the shadow under it have none: a radius of 0.
  const clumpOf = new Float32Array(count * 4), crownOf = new Float32Array(count * 4), Rk = (R[0] * 2 + R[1]) / 3;
  for (let i = 0; i < count; i++) {
    const c = clumps[B.clump[i]];
    if (B.kind[i] === 1 && c) clumpOf.set([...c.at, c.r], i * 4); else clumpOf.set([...B.p[i], 0], i * 4);
    crownOf.set([...C, B.kind[i] === 1 ? Rk : 0], i * 4);
  }

  const positions = new Float32Array(B.p.flat()), uvs = new Float32Array(B.uv.flat());
  const info = { triangles: (B.solid.length + B.soft.length) / 3, soft: B.solid.length, clumps: clumps.length, top: Math.max(...B.p.map((q) => q[1])), crown: C[1], half: [R[0], R[1]] };
  return { positions, normals, uvs, sway, light, bounce, clump: clumpOf, crown: crownOf, indices: new Uint32Array([...B.solid, ...B.soft]), info };
}
