// The trees' atlas of leaves, painted in code: four lumps of leaf, each a few clusters of leaves over a dark mat with
// an outline of leaves of its own; two more for the card at a mass's heart, with more and smaller leaves; bark; and the
// shade under a tree. Each leaf is an almond with a fold along its midrib, its own lightness and hue,
// and it shades the leaves it lies on. Then the chain of smaller levels, each made from the one above and kept
// holding as much leaf as the first (so a crown does not thin out when it is drawn small), all in one PNG (level()
// in src/pieces/world/parts/trees/design.ts says where).
//
//   import { paint } from './leaves.mjs'; const { data, width, height, coverage } = paint({ seed })
import { ATLAS, CARD, LEAF as LEAF_SIZE, SHADE as GROUND_SHADE, TILES, level } from '../../../../src/pieces/world/parts/trees/design.ts';
import { noise, seeded } from '../../../../src/pieces/world/layout.ts';

const T = ATLAS.tile, W = T * ATLAS.cols, H = T * ATLAS.rows;
// How long a leaf is in a tile's pixels, for a card of this full width (in a crown's units).
const px = (card) => (LEAF_SIZE / card) * T;
// Each kind of tile: how long its leaves are (from the card it is painted for, CARD in design.ts), how far its
// outline reaches at most and the disc at its middle, as shares of the tile. A small lump is a sprig of a few
// clusters, so its leaves are large in its tile; the card at a mass's heart holds many.
const KIND = {
  lump: { size: px(2 * CARD.lump * CARD.painted.lump), reach: 0.36, middle: 0.24 },
  core: { size: px(2 * CARD.core * CARD.painted.core), reach: 0.42, middle: 0.29 },
};
// A leaf: how long against the size a tile's leaf should be, how wide against its length, how long its stalk.
// How far it bends to one side at most (a leaf bent further read as a curl of paper), and how dark the unlit half
// of its fold is against the lit one.
const LEAF = { long: [0.85, 1.15], wide: [0.42, 0.55], stalk: [0.1, 0.2], bend: 0.7, fold: 0.62 };
// How dark a leaf is where another lies over it, and how far that shadow falls and how soft it is, in leaf lengths.
const SHADE = { dark: 0.55, off: [0.05, 0.2], soft: 0.26 };
// Each tile of leaves is a few rosettes of leaves (clusters) over a dark mat that joins them: how many rosettes
// round its middle (with one at the middle), how far out they stand and how wide each is, as shares of the tile's
// middle disc, and how many leaves each holds. Each rosette's leaves point out of it and out of the tile, and those
// at the rim stand out of the mat by up to OUT.tip of a leaf, foot inside: so a lump's outline is leaves and never
// a smooth arc, and no leaf stands clear of it. Rosettes are laid from the rim inward, as a ball is seen.
const ROSETTES = { lump: { round: [3, 4], out: 0.62, r: 0.62, leaves: [10, 13], across: 0.35 }, core: { round: [5, 7], out: 0.72, r: 0.48, leaves: [17, 22], across: 0.35 } };
// How far a leaf at the rim may stand out of the mat, in leaves, with its foot inside it.
const OUT = { tip: 0.75 };
// Each rosette is a small mound lit from above: its leaves this much lighter at its top and darker at its foot,
// and facing up at its top. Each rosette is a lightness of its own (differ), some sunk and dark, some standing out.
// The lump is NOT lit as a whole here (the shader lights it by where it is on its mass and crown): only its lower
// part is a little darker (lump). (Up and down only: the shader turns a lump's card a little and mirrors it.)
const CLUSTER = { top: 1.15, foot: 0.55, lump: [1.0, 0.88], differ: [0.62, 1.12] };
// The notches in the mat's outline, in leaves, at two scales.
const NOTCH = [0.4, 0.2];
// The dark mat under a lump's leaves, drawn a little inside its outline: how light (and in a gap), and how far
// inside, in leaves. Every leaf at the rim has the mat behind it, so no cluster stands clear of the lump.
const MAT = { light: 0.06, gap: 0.015, inside: 0.6 };
// The shade a tree lays on the ground (SHADE in design.ts), down the tile from behind its trunk to its far end: the
// cast, as wide as the crown and as long, away from the moon, how dark at most, how it falls off across, and how far
// past the trunk it is still whole, in crown units; the pool under the crown, which the shades of neighbours join
// into dark earth under the belt, its radius and how dark; and the round dark at the trunk's foot.
const BLOB = { dark: 0.85, across: 1.3, whole: 1.4, pool: { r: 1.6, dark: 0.85 }, foot: 0.38, under: 0.95 };

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

// One leaf of size `size` (its length in pixels), with a lightness of its own times `tone`.
function paintLeaf(cv, tile, rnd, bx, by, th, size, tone, up = 0.5) {
  const long = size * (LEAF.long[0] + rnd() * (LEAF.long[1] - LEAF.long[0])), wide = LEAF.wide[0] + rnd() * (LEAF.wide[1] - LEAF.wide[0]);
  const leaf = leafShape(bx, by, th, long, wide, size * (LEAF.stalk[0] + rnd() * (LEAF.stalk[1] - LEAF.stalk[0])), (rnd() - 0.5) * LEAF.bend);
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
    return [clamp(light * (LEAF.fold + (1 - LEAF.fold) * fold) * (0.9 + 0.12 * along) * rib * rim * speck), hue, face];
  });
}

// A lump: rosettes of leaves over a dark mat that joins them.
function lump(cv, tile, rnd, kind) {
  const K = KIND[kind], R = ROSETTES[kind], c = T / 2, size = K.size, mid = K.middle * T, edge = K.reach * T;
  const n = R.round[0] + Math.floor(rnd() * (R.round[1] - R.round[0] + 1)), ph = rnd() * Math.PI * 2, balls = [[c, c - mid * 0.08, mid * R.r]];
  for (let i = 0; i < n; i++) {
    const a = ph + (i / n) * Math.PI * 2 + (rnd() - 0.5) * (2 / n), d = mid * R.out * (0.8 + 0.4 * rnd()), r = mid * R.r * (0.8 + 0.35 * rnd());
    balls.push([c + Math.cos(a) * d, c + Math.sin(a) * d, Math.min(r, edge - d - size * 0.3)]);
  }
  const shape = (x, y) => {
    let k = 0;
    for (const [bx, by, r] of balls) k += Math.exp(-((Math.hypot(x - bx, y - by) / r) ** 2) * 2.4);
    const n1 = noise(x / (size * 1.6), y / (size * 1.6), 0, tile * 13) - 0.5, n2 = noise(x / (size * 0.7), y / (size * 0.7), 0, tile * 17) - 0.5;
    return (Math.exp(-2.4) - k) * mid * 1.6 + n1 * size * 2 * NOTCH[0] + n2 * size * 2 * NOTCH[1];
  };
  cv.lay(tile, [c - edge, c - edge, c + edge, c + edge], (x, y) => shape(x, y) + MAT.inside * size, (x, y) => [MAT.light * (0.7 + 0.6 * noise(x / size, y / size, 0, 5)), 0.5, 0.3]);
  const order = balls.map((b, i) => [b, i === 0 ? -1 : Math.hypot(b[0] - c, b[1] - c) + (rnd() - 0.5) * mid * 0.2]).sort((p, q) => q[1] - p[1]);
  for (const [[x, y, cr]] of order) {
    const m = R.leaves[0] + Math.floor(rnd() * (R.leaves[1] - R.leaves[0] + 1));
    const down = clamp(((y - c) / edge + 0.6) / 1.4), tone = (CLUSTER.lump[0] + (CLUSTER.lump[1] - CLUSTER.lump[0]) * down) * (CLUSTER.differ[0] + (CLUSTER.differ[1] - CLUSTER.differ[0]) * rnd());
    const away = Math.atan2(x - c, c - y), spin = rnd() * Math.PI * 2, outer = Math.hypot(x - c, y - c) > mid * 0.2;
    const leaves = [];
    for (let k = 0; k < m; k++) {
      const a = spin + (k / m) * Math.PI * 2 + (rnd() - 0.5) * 0.8, rr = cr * 0.55 * Math.sqrt(rnd());
      let th = a + (rnd() - 0.5) * 0.9;
      if (outer) { const dl = ((th - away + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; th = away + dl * 0.7; }
      let long = size * (0.85 + 0.3 * rnd());
      // The middle rosette's leaves, and some of every other's, lie every way across its middle, so no rosette has a
      // bare heart.
      const across = !outer || rnd() < R.across;
      if (across) th = rnd() * Math.PI * 2;
      const back = across ? long * 0.6 : 0, lx = x + Math.sin(a) * rr - Math.sin(th) * back, ly = y - Math.cos(a) * rr + Math.cos(th) * back;
      if (shape(lx, ly) > -size * 0.15) continue;
      for (let t = 0; t < 4 && shape(lx + Math.sin(th) * long * 1.2, ly - Math.cos(th) * long * 1.2) > size * OUT.tip; t++) long *= 0.8;
      const reach = long * 1.35, tx = lx + Math.sin(th) * reach, ty = ly - Math.cos(th) * reach;
      if (Math.min(lx, ly, tx, ty) < 3 || Math.max(lx, ly, tx, ty) > T - 3) continue;
      leaves.push([lx, ly, th, rr, long]);
    }
    // Its lower leaves first, so the upper lie over them and shade them.
    const at = (l) => l[1] - Math.cos(l[2]) * l[4] * 0.6;
    leaves.sort((p, q) => at(q) - at(p));
    for (const l of leaves) {
      const [lx, ly, th, rr, long] = l, v = clamp((at(l) - y) / cr * 1.4 + 0.5);
      paintLeaf(cv, tile, rnd, lx, ly, th, long, tone * (CLUSTER.top + (CLUSTER.foot - CLUSTER.top) * v) * (0.88 + 0.12 * (1 - rr / cr)), 1 - v);
    }
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
  [...TILES.lumps, ...TILES.core].forEach((t, i) => lump(cv, t, rnd, i < TILES.lumps.length ? 'lump' : 'core'));
  bark(cv, TILES.bark);
  blob(cv, TILES.blob);
  spread(cv);

  // The chain: each level the mean of four pixels of the one above, colors weighted by how much leaf they hold,
  // then in each tile of leaves every coverage scaled so as much of it is over a half as in the first level.
  const leafy = [...TILES.lumps, ...TILES.core];
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
