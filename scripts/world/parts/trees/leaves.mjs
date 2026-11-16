// The trees' atlas of leaves, painted in code: four great lumps of leaf, each with its own outline of lobes, made of
// small clusters of small leaves; two sprays of leaves on twigs, which stand out of a lump to break its outline;
// bark; and the shade under a tree. Each leaf is an almond with a fold along its midrib, its own lightness and hue,
// and it shades the leaves it lies on. Then the chain of smaller levels, each made from the one above and kept
// holding as much leaf as the first (so a crown does not thin out when it is drawn small), all in one PNG (level()
// in src/pieces/world/parts/trees/design.ts says where).
//
//   import { paint } from './leaves.mjs'; const { data, width, height, coverage } = paint({ seed })
import { ATLAS, CARD, LEAF as LEAF_SIZE, SHADE as GROUND_SHADE, TILES, level } from '../../../../src/pieces/world/parts/trees/design.ts';
import { noise, seeded } from '../../../../src/pieces/world/layout.ts';

const T = ATLAS.tile, W = T * ATLAS.cols, H = T * ATLAS.rows;
// A lump of the usual size (in a crown's units), whose card the leaves of a lump tile are sized for, and the sprays'.
const LUMP = 0.55;
const px = (card) => (LEAF_SIZE / card) * T;
// A leaf: how long against the size a tile's leaf should be, how wide against its length, how long its stalk.
const LEAF = { long: [0.8, 1.2], wide: [0.4, 0.55], stalk: [0.12, 0.25] };
// How dark a leaf is where another lies over it, and how far that shadow falls and how soft it is, in leaf lengths.
const SHADE = { dark: 0.55, off: [0.05, 0.2], soft: 0.26 };
// Each lump tile: how many lobes its outline has. Its outline reaches this share of the tile at most, and its
// middle is a disc this share of it.
const LUMPS = [{ lobes: 3 }, { lobes: 4 }, { lobes: 5 }, { lobes: 7 }];
const OUTLINE = { reach: 0.42, middle: 0.21, sharp: 2.4 };
// The small clusters a lump is made of: how wide one is in leaf lengths, how many leaves each holds, and how many
// clusters for each share of the lump's area. Each is a small mound lit from above: its leaves this much lighter
// at its top and darker at its foot, and facing up at its top, so a lump at three times is sprigs of leaves with
// shade between them and not an even stipple. The lump is NOT lit as a whole here: every lump wore the same baked
// bright top and dark foot, and the crown read as pom poms. The shader lights a lump by where it is on its crown;
// here only its lower part is a little darker (lump), and each cluster is a lightness of its own (differ), some
// sunk and dark, some standing out, so no two parts of a lump are the same tone.
// (Up and down only: the shader turns a lump's card a little and mirrors it, never further.)
const CLUSTER = { r: [1.4, 2.6], leaves: [14, 24], per: 1.7, top: 1.18, foot: 0.5, lump: [1.0, 0.86], differ: [0.6, 1.15] };
// Holes through a lump, where what is behind it shows (the crown's dark heart, a limb, the sky): how many, how wide
// in leaves, and how far out from the lump's middle, as a share of its outline. And how deep the notches in the
// outline are, in leaves, at two scales.
const HOLES = { count: [2, 5], r: [1.4, 2.8], out: [0.2, 0.72] };
const NOTCH = [1.5, 0.7];
// The dark mat under a lump's leaves, drawn a little inside its outline: how light, and how far inside, in leaves.
const MAT = { light: 0.06, inside: 2.2 };
// The shade a tree lays on the ground (SHADE in design.ts), down the tile from behind its trunk to its far end: the
// cast, as wide as the crown and as long, away from the moon, how dark at most, how it falls off across, and how far
// past the trunk it is still whole, in crown units; the pool under the crown, which the shades of neighbours join
// into dark earth under the belt, its radius and how dark; and the round dark at the trunk's foot.
const BLOB = { dark: 0.9, across: 0.9, whole: 1.3, pool: { r: 1.6, dark: 0.85 }, foot: 0.38, under: 0.95 };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const hash2 = (x, y, s) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

// The first level as numbers: lightness, hue, facing, coverage, each 0 to 1.
class Canvas {
  constructor() { this.L = new Float32Array(W * H); this.G = new Float32Array(W * H).fill(0.5); this.B = new Float32Array(W * H).fill(0.5); this.A = new Float32Array(W * H); }
  // Lays a shape over the canvas inside one tile: sd(x, y) is its signed distance in pixels, under 0 inside, and
  // look(x, y, d) gives its [lightness, hue, facing] there.
  lay(tile, box, sd, look) {
    const ox = (tile % ATLAS.cols) * T, oy = Math.floor(tile / ATLAS.cols) * T;
    const [x0, y0, x1, y1] = box;
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(T - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(T - 1, Math.ceil(x1)); x++) {
      const qx = x + 0.5, qy = y + 0.5, d = sd(qx, qy), a = clamp(0.5 - d);
      if (a <= 0) continue;
      const i = (oy + y) * W + ox + x, [l, g, b] = look(qx, qy, d), old = this.A[i];
      const k = old > 0 ? a / (a + old * (1 - a)) : 1;
      this.L[i] += (l - this.L[i]) * k;
      this.G[i] += (g - this.G[i]) * k;
      this.B[i] += (b - this.B[i]) * k;
      this.A[i] = a + old * (1 - a);
    }
  }
  // Darkens what is already painted under a shape that is about to be laid, offset and blurred: its shadow.
  shade(tile, box, sd, off, soft) {
    const ox = (tile % ATLAS.cols) * T, oy = Math.floor(tile / ATLAS.cols) * T, [dx, dy] = off;
    const [x0, y0, x1, y1] = box;
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(T - 1, Math.ceil(y1 + dy + soft)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(T - 1, Math.ceil(x1 + dx + soft)); x++) {
      const d = sd(x + 0.5 - dx, y + 0.5 - dy), s = clamp(0.5 - d / soft);
      if (s <= 0) continue;
      this.L[(oy + y) * W + ox + x] *= 1 - SHADE.dark * s;
    }
  }
}

// A leaf: its stalk's foot at (bx, by), pointing at angle th (0 is up the tile), so long and so wide.
function leafShape(bx, by, th, long, wide, stalk, bend) {
  const s = Math.sin(th), c = -Math.cos(th);
  const cx = bx + s * (stalk + long / 2), cy = by + c * (stalk + long / 2);
  const b = long / 2, hw = (wide * long) / 2, r = (b * b / hw + hw) / 2, dd = r - hw;
  const local = (x, y) => { const rx = x - cx, ry = y - cy; return [rx * c - ry * s, rx * s + ry * c]; };
  const sd = (x, y) => {
    let [u, v] = local(x, y);
    v = -v;
    u = u / (1 + 0.22 * clamp(-v / b, -1, 1)) - bend * (1 - (v / b) ** 2) * hw * 0.35;
    const pu = Math.abs(u), pv = Math.abs(v), bb = Math.sqrt(Math.max(0, r * r - dd * dd));
    return (pv - bb) * dd > pu * bb ? Math.hypot(pu, pv - bb) : Math.hypot(pu + dd, pv) - r;
  };
  const reach = stalk + long + 2, box = [Math.min(bx, bx + s * reach) - hw - 2, Math.min(by, by + c * reach) - hw - 2, Math.max(bx, bx + s * reach) + hw + 2, Math.max(by, by + c * reach) + hw + 2];
  return { sd, box, local, b, hw };
}

function twigShape(pts, w0, w1) {
  const sd = (x, y) => {
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
      const t = clamp(((x - ax) * vx + (y - ay) * vy) / l2), w = w0 + (w1 - w0) * ((i + t) / (pts.length - 1));
      best = Math.min(best, Math.hypot(x - ax - vx * t, y - ay - vy * t) - w / 2);
    }
    return best;
  };
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), m = Math.max(w0, w1) + 2;
  return { sd, box: [Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m] };
}

// One leaf of size `size` (its length in pixels), with a lightness of its own times `tone`.
function paintLeaf(cv, tile, rnd, bx, by, th, size, tone, up = 0.5) {
  const long = size * (LEAF.long[0] + rnd() * (LEAF.long[1] - LEAF.long[0])), wide = LEAF.wide[0] + rnd() * (LEAF.wide[1] - LEAF.wide[0]);
  const leaf = leafShape(bx, by, th, long, wide, size * (LEAF.stalk[0] + rnd() * (LEAF.stalk[1] - LEAF.stalk[0])), (rnd() - 0.5) * 2);
  // A hue that leans a little from the tree's (a few lean far: a leaf turned early), how much it faces the light,
  // and which half of its fold is the lit one.
  const light = (0.6 + 0.4 * rnd()) * tone, hue = rnd() < 0.1 ? (rnd() < 0.5 ? 0.06 : 0.94) : 0.3 + 0.4 * rnd(), face = clamp(0.15 + 0.7 * up + 0.3 * (rnd() - 0.5)), lit = rnd() < 0.5 ? 1 : -1;
  const seed = Math.floor(rnd() * 1e6);
  cv.shade(tile, leaf.box, leaf.sd, [SHADE.off[0] * size, SHADE.off[1] * size], Math.max(1.2, SHADE.soft * size));
  cv.lay(tile, leaf.box, leaf.sd, (x, y, d) => {
    const [u, v] = leaf.local(x, y), along = clamp(-v / leaf.b * 0.5 + 0.5);
    const fold = 0.5 + 0.5 * clamp((u * lit) / Math.max(0.6, leaf.hw * 0.5), -1, 1);
    const rib = 1 - 0.2 * clamp(1 - Math.abs(u) / Math.max(0.5, size * 0.04)) * (along < 0.95 ? 1 : 0);
    const rim = 1 - 0.16 * clamp(1 + d / Math.max(1, size * 0.08));
    const speck = 1 + 0.08 * (hash2(Math.floor(x), Math.floor(y), seed) - 0.5);
    return [clamp(light * (0.8 + 0.2 * fold) * (0.9 + 0.12 * along) * rib * rim * speck), hue, face];
  });
}

// A lump: a mass of small clusters of leaves inside an outline of lobes, over a dark mat. The clusters at its rim
// are laid first and those at its middle last, as a ball is seen, and the rim's leaves point out of it, so its
// outline is small leaves.
function lump(cv, tile, rnd, lobes) {
  const c = T / 2, size = px(CARD.lump * LUMP * 2), mid = OUTLINE.middle * T, ph = rnd() * Math.PI * 2;
  const balls = [[c, c, mid]], holes = [];
  for (let i = 0, n = HOLES.count[0] + Math.floor(rnd() * (HOLES.count[1] - HOLES.count[0] + 1)); i < n; i++) {
    const a = rnd() * Math.PI * 2, d = OUTLINE.reach * T * (HOLES.out[0] + (HOLES.out[1] - HOLES.out[0]) * rnd());
    holes.push([c + Math.cos(a) * d, c + Math.sin(a) * d, size * (HOLES.r[0] + (HOLES.r[1] - HOLES.r[0]) * rnd())]);
  }
  for (let i = 0; i < lobes; i++) {
    const a = ph + (i / lobes) * Math.PI * 2 + (rnd() - 0.5) * (2.4 / lobes), r = mid * (0.62 + 0.3 * rnd()) * (lobes > 5 ? 0.8 : 1), d = Math.min(OUTLINE.reach * T - r - size * 1.2, mid * (0.85 + 0.3 * rnd()));
    balls.push([c + Math.cos(a) * d, c + Math.sin(a) * d, r]);
  }
  // The outline: the lobes joined smoothly, and a little noise along it.
  const shape = (x, y) => {
    let k = 0;
    for (const [bx, by, r] of balls) k += Math.exp(-((Math.hypot(x - bx, y - by) / r) ** 2) * OUTLINE.sharp);
    const n = noise(x / (size * 3.2), y / (size * 3.2), 0, tile * 13) - 0.5, n2 = noise(x / (size * 1.2), y / (size * 1.2), 0, tile * 17) - 0.5;
    let d = (Math.exp(-OUTLINE.sharp) - k) * mid * 1.6 + n * size * 2 * NOTCH[0] + n2 * size * 2 * NOTCH[1];
    for (const [hx, hy, hr] of holes) d = Math.max(d, hr - Math.hypot(x - hx, y - hy) + (noise(x / size, y / size, 1, tile * 7) - 0.5) * size * 1.6);
    return d;
  };
  const edge = OUTLINE.reach * T;
  cv.lay(tile, [c - edge, c - edge, c + edge, c + edge], (x, y) => shape(x, y) + MAT.inside * size, (x, y) => [MAT.light * (0.7 + 0.6 * noise(x / size, y / size, 0, 5)), 0.5, 0.3]);

  // Where clusters go: anywhere inside the outline, as many as its area holds.
  let area = 0;
  for (let y = 0; y < T; y += 4) for (let x = 0; x < T; x += 4) if (shape(x, y) < 0) area += 16;
  const clusters = [], want = Math.round((area / (Math.PI * (size * 1.45) ** 2)) * CLUSTER.per);
  for (let tries = 0; clusters.length < want && tries < want * 40; tries++) {
    const x = c + (rnd() * 2 - 1) * edge, y = c + (rnd() * 2 - 1) * edge;
    if (shape(x, y) > size * 0.1) continue;
    clusters.push([x, y, Math.hypot(x - c, y - c) / edge]);
  }
  clusters.sort((p, q) => q[2] - p[2] + (rnd() - 0.5) * 0.25);
  for (const [x, y, out] of clusters) {
    const cr = size * (CLUSTER.r[0] + rnd() * (CLUSTER.r[1] - CLUSTER.r[0])), n = CLUSTER.leaves[0] + Math.floor(rnd() * (CLUSTER.leaves[1] - CLUSTER.leaves[0] + 1));
    const down = clamp(((y - c) / edge + 0.6) / 1.4), tone = (CLUSTER.lump[0] + (CLUSTER.lump[1] - CLUSTER.lump[0]) * down) * (CLUSTER.differ[0] + (CLUSTER.differ[1] - CLUSTER.differ[0]) * rnd());
    const away = Math.atan2(x - c, c - y), spin = rnd() * Math.PI * 2;
    // Leaves from the cluster's heart outward: those at the lump's rim lean out of it.
    const leaves = [];
    for (let k = 0; k < n; k++) {
      const a = spin + (k / n) * Math.PI * 2 + (rnd() - 0.5) * 0.7, rr = cr * (0.1 + 0.55 * Math.sqrt(rnd()));
      let th = a + (rnd() - 0.5) * 0.9;
      if (out > 0.62) { let dlt = ((th - away + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; th = away + dlt * 0.55; }
      leaves.push([x + Math.sin(a) * rr * 0.75, y - Math.cos(a) * rr * 0.75, th, rr]);
    }
    // Its lower leaves first, so the upper lie over them and shade them: the cluster reads as a small mound of
    // leaves lit from above.
    const at = (l) => l[1] - Math.cos(l[2]) * size * 0.75;
    leaves.sort((p, q) => at(q) - at(p));
    for (const l of leaves) {
      const [lx, ly, th, rr] = l, v = clamp((at(l) - y) / cr * 1.4 + 0.5);
      const reach = size * 1.5, tx = lx + Math.sin(th) * reach, ty = ly - Math.cos(th) * reach, m = 3;
      if (Math.min(lx, ly, tx, ty) < m || Math.max(lx, ly, tx, ty) > T - m) continue;
      paintLeaf(cv, tile, rnd, lx, ly, th, size * (0.85 + 0.3 * rnd()), tone * (CLUSTER.top + (CLUSTER.foot - CLUSTER.top) * v) * (0.88 + 0.12 * (1 - rr / cr)), 1 - v);
    }
  }
}

// A spray: a twig from the tile's foot that forks, with small leaves along every branch, thicker toward the tips.
function spray(cv, tile, rnd) {
  const size = px(CARD.spray * LUMP), branches = [], root = [T / 2 + (rnd() - 0.5) * 16, T - 8];
  const grow = (from, ang, len, w, depth) => {
    const pts = [from];
    let [x, y] = from, a = ang;
    const steps = 4;
    for (let i = 0; i < steps; i++) { a += (rnd() - 0.5) * 0.35; x += Math.sin(a) * len / steps; y -= Math.cos(a) * len / steps; pts.push([x, y]); }
    branches.push({ pts, w });
    if (depth > 0) for (let k = 0; k < 2 + Math.floor(rnd() * 3); k++) {
      const at = pts[1 + Math.floor(rnd() * (steps - 1))], side = k % 2 ? 1 : -1;
      grow(at, a + side * (0.5 + rnd() * 0.5), len * (0.45 + rnd() * 0.25), w * 0.6, depth - 1);
    }
  };
  grow(root, (rnd() - 0.5) * 0.4, T * 0.62, size * 0.09, 2);
  for (const b of branches) { const t = twigShape(b.pts, b.w, b.w * 0.45); cv.lay(tile, t.box, t.sd, () => [0.16, 0.5, 0.4]); }
  const spots = [];
  for (const b of branches) for (let i = 1; i < b.pts.length; i++) {
    const [ax, ay] = b.pts[i - 1], [bx, by] = b.pts[i], ang = Math.atan2(bx - ax, ay - by);
    for (let k = 0; k < 4; k++) { const t = (k + rnd()) / 4; spots.push([ax + (bx - ax) * t, ay + (by - ay) * t, ang, (i + k) % 2 ? 1 : -1, i / b.pts.length]); }
  }
  spots.sort((p, q) => q[1] - p[1] + (rnd() - 0.5) * 30);
  for (const [x, y, ang, side, out] of spots) {
    const th = ang + side * (0.5 + rnd() * 0.8), sc = size * (0.85 + 0.3 * out), reach = sc * 1.5 + 3;
    const tx = x + Math.sin(th) * reach, ty = y - Math.cos(th) * reach, m = 4;
    if (Math.min(x, y, tx, ty) < m || Math.max(x, y, tx, ty) > T - m) continue;
    paintLeaf(cv, tile, rnd, x, y, th, sc, 0.95);
  }
}

// Bark: dark, in long cracked ridges along the stem (the tile's height is along it).
function bark(cv, tile) {
  const ox = (tile % ATLAS.cols) * T, oy = Math.floor(tile / ATLAS.cols) * T;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const i = (oy + y) * W + ox + x, u = x / T * 9, v = y / T * 2;
    const ridge = Math.abs(Math.sin(Math.PI * (u + 1.4 * (noise(u * 0.5, v * 2.5, 0, 5) - 0.5))));
    const crack = clamp((0.18 - ridge) / 0.18), n = hash2(x >> 1, y >> 3, 11);
    cv.L[i] = clamp(0.35 + 0.35 * ridge ** 0.5 - 0.3 * crack + 0.12 * (n - 0.5));
    cv.G[i] = 0.5; cv.B[i] = 0.5; cv.A[i] = 1;
  }
}

// The shade on the ground: a round dark at the trunk's foot, and from it a long soft shade, darkest under the
// crown, soft at its sides, thinning out to nothing at its far end.
function blob(cv, tile) {
  const ox = (tile % ATLAS.cols) * T, oy = Math.floor(tile / ATLAS.cols) * T, G = GROUND_SHADE, long = G.back + G.reach;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const i = (oy + y) * W + ox + x, across = ((x + 0.5) / T * 2 - 1) * G.wide, along = -G.back + ((y + 0.5) / T) * long, u = across / G.wide;
    const side = clamp(1 - u * u) ** BLOB.across, start = clamp((along + 0.3) / 0.6), end = clamp(1 - (along - BLOB.whole) / (G.reach - BLOB.whole));
    const cast = BLOB.dark * side * start * start * (3 - 2 * start) * end ** 1.4;
    const r = Math.hypot(across, along), rim = clamp(1 - Math.abs(along) / G.back) * clamp(1 - Math.abs(u));
    const pool = BLOB.pool.dark * Math.exp(-((r / BLOB.pool.r) ** 2) * 1.6) * Math.min(1, rim * 3);
    const foot = BLOB.under * Math.exp(-((r / BLOB.foot) ** 2) * 2.2);
    cv.L[i] = 0; cv.A[i] = 1 - (1 - cast) * (1 - foot) * (1 - pool);
  }
}

// Carries each painted pixel's numbers out into the bare pixels round it, so a smaller level that blends a leaf
// with the bare ground beside it keeps the leaf's numbers.
function spread(cv) {
  const has = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (cv.A[i] > 0.002) has[i] = 1;
  for (let pass = 0; pass < 24; pass++) {
    const edge = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (has[i]) continue;
      let n = 0, l = 0, g = 0, b = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H || Math.floor(X / T) !== Math.floor(x / T) || Math.floor(Y / T) !== Math.floor(y / T)) continue;
        const j = Y * W + X;
        if (has[j]) { n++; l += cv.L[j]; g += cv.G[j]; b += cv.B[j]; }
      }
      if (n) edge.push([i, l / n, g / n, b / n]);
    }
    for (const [i, l, g, b] of edge) { cv.L[i] = l; cv.G[i] = g; cv.B[i] = b; has[i] = 1; }
    if (!edge.length) break;
  }
}

export function paint({ seed = 7 } = {}) {
  const rnd = seeded(seed), cv = new Canvas();
  TILES.lumps.forEach((t, i) => lump(cv, t, rnd, LUMPS[i].lobes));
  for (const t of TILES.sprays) spray(cv, t, rnd);
  bark(cv, TILES.bark);
  blob(cv, TILES.blob);
  spread(cv);

  // The chain: each level the mean of four pixels of the one above, colors weighted by how much leaf they hold,
  // then in each tile of leaves every coverage scaled so as much of it is over a half as in the first level.
  const leafy = [...TILES.lumps, ...TILES.sprays];
  const levels = [{ k: 0, w: W, h: H, L: cv.L, G: cv.G, B: cv.B, A: cv.A }];
  const covered = (lv, tile, k) => {
    const t = T >> lv.k, ox = (tile % ATLAS.cols) * t, oy = Math.floor(tile / ATLAS.cols) * t;
    let n = 0;
    for (let y = 0; y < t; y++) for (let x = 0; x < t; x++) if (Math.min(1, lv.A[(oy + y) * lv.w + ox + x] * k) >= 0.5) n++;
    return n / (t * t);
  };
  const want = leafy.map((tile) => covered(levels[0], tile, 1));
  for (let k = 1; k < ATLAS.levels; k++) {
    const up = levels[k - 1], w = up.w >> 1, h = up.h >> 1, lv = { k, w, h, L: new Float32Array(w * h), G: new Float32Array(w * h), B: new Float32Array(w * h), A: new Float32Array(w * h) };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let a = 0, l = 0, g = 0, b = 0, wt = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const j = (y * 2 + dy) * up.w + x * 2 + dx, q = up.A[j] + 0.02;
        a += up.A[j]; l += up.L[j] * q; g += up.G[j] * q; b += up.B[j] * q; wt += q;
      }
      const i = y * w + x;
      lv.A[i] = a / 4; lv.L[i] = l / wt; lv.G[i] = g / wt; lv.B[i] = b / wt;
    }
    leafy.forEach((tile, n) => {
      let lo = 1, hi = 4;
      for (let it = 0; it < 22; it++) { const mid = (lo + hi) / 2; if (covered(lv, tile, mid) < want[n]) lo = mid; else hi = mid; }
      const t = T >> k, ox = (tile % ATLAS.cols) * t, oy = Math.floor(tile / ATLAS.cols) * t;
      for (let y = 0; y < t; y++) for (let x = 0; x < t; x++) { const i = (oy + y) * w + ox + x; lv.A[i] = Math.min(1, lv.A[i] * hi); }
    });
    levels.push(lv);
  }

  const FW = W + (W >> 1), FH = H, data = new Uint8Array(FW * FH * 4);
  levels.forEach((lv, k) => {
    const at = level(k);
    for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) {
      const i = y * lv.w + x, o = ((at.y + y) * FW + at.x + x) * 4;
      data[o] = Math.round(clamp(lv.L[i]) * 255); data[o + 1] = Math.round(clamp(lv.G[i]) * 255); data[o + 2] = Math.round(clamp(lv.B[i]) * 255); data[o + 3] = Math.round(clamp(lv.A[i]) * 255);
    }
  });
  const coverage = Object.fromEntries(leafy.map((t, n) => [t, +want[n].toFixed(3)]));
  return { data, width: FW, height: FH, coverage };
}
