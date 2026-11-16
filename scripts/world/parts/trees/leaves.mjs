// The trees' atlas of leaves, painted in code: sprays of leaves on twigs, round masses of leaves for the heart of a
// clump, bark, and the soft shadow under a tree. Each leaf is an almond with a fold along its midrib, its own
// lightness and hue, and it shades the leaves it lies on. Then the chain of smaller levels, each made from the one
// above and kept holding as much leaf as the first (so a crown does not thin out when it is drawn small), all in
// one PNG (level() in src/pieces/world/parts/trees/design.ts says where).
//
//   import { paint } from './leaves.mjs'; const { data, width, height } = paint({ seed, draft })
import { ATLAS, TILES, level } from '../../../../src/pieces/world/parts/trees/design.ts';
import { noise, seeded } from '../../../../src/pieces/world/layout.ts';

const T = ATLAS.tile, W = T * ATLAS.cols, H = T * ATLAS.rows;
// A leaf, in pixels of the first level: how long, how wide against its length, how long its stalk.
const LEAF = { long: [26, 40], wide: [0.42, 0.56], stalk: [3, 6] };
// How dark a leaf is where another lies over it, and how far that shadow falls, down and to the right.
const SHADE = { dark: 0.42, off: [1.6, 2.6], soft: 3.2 };
// The heart of a clump: how many leaves are tried on it, how far out they reach and how far its dark mat does, as
// shares of the tile, and how light the mat is under them.
// The shadow under a tree: how dark at its middle (under a half, so only the soft pass lays it) and how it falls off.
const BLOB = { dark: 0.49, fall: 1.4 };
const DISC = { leaves: 150, reach: 0.4, mat: 0.3, under: 0.2 };

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
  // look(x, y, d) gives its [lightness, hue, facing] there. wrap repeats it across the tile's edges.
  lay(tile, box, sd, look, wrap = false) {
    const ox = (tile % ATLAS.cols) * T, oy = Math.floor(tile / ATLAS.cols) * T;
    const [x0, y0, x1, y1] = box;
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      let tx = x, ty = y;
      if (wrap) { tx = ((x % T) + T) % T; ty = ((y % T) + T) % T; } else if (x < 0 || y < 0 || x >= T || y >= T) continue;
      const px = x + 0.5, py = y + 0.5, d = sd(px, py), a = clamp(0.5 - d);
      if (a <= 0) continue;
      const i = (oy + ty) * W + ox + tx, [l, g, b] = look(px, py, d), old = this.A[i];
      // Over what is there, by how much of the pixel each holds: bare pixels take the new numbers whole.
      const k = old > 0 ? a / (a + old * (1 - a)) : 1;
      this.L[i] += (l - this.L[i]) * k;
      this.G[i] += (g - this.G[i]) * k;
      this.B[i] += (b - this.B[i]) * k;
      this.A[i] = a + old * (1 - a);
    }
  }
  // Darkens what is already painted under a shape that is about to be laid, offset and blurred: its shadow.
  shade(tile, box, sd, wrap = false) {
    const ox = (tile % ATLAS.cols) * T, oy = Math.floor(tile / ATLAS.cols) * T, [dx, dy] = SHADE.off;
    const [x0, y0, x1, y1] = box;
    for (let y = Math.floor(y0); y <= Math.ceil(y1 + dy + SHADE.soft); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1 + dx + SHADE.soft); x++) {
      let tx = x, ty = y;
      if (wrap) { tx = ((x % T) + T) % T; ty = ((y % T) + T) % T; } else if (x < 0 || y < 0 || x >= T || y >= T) continue;
      const d = sd(x + 0.5 - dx, y + 0.5 - dy), s = clamp(0.5 - d / SHADE.soft);
      if (s <= 0) continue;
      const i = (oy + ty) * W + ox + tx;
      this.L[i] *= 1 - SHADE.dark * s;
    }
  }
}

// A leaf: its stalk's foot at (bx, by), pointing at angle th (0 is up the tile), so long and so wide.
function leafShape(bx, by, th, long, wide, stalk, bend) {
  const s = Math.sin(th), c = -Math.cos(th);
  const cx = bx + s * (stalk + long / 2), cy = by + c * (stalk + long / 2);
  const b = long / 2, hw = (wide * long) / 2, r = (b * b / hw + hw) / 2, dd = r - hw;
  // Local frame: v along the leaf from its foot (negative) to its tip (positive), u across.
  const local = (x, y) => { const rx = x - cx, ry = y - cy; return [rx * c - ry * s, rx * s + ry * c]; };
  const sd = (x, y) => {
    let [u, v] = local(x, y);
    v = -v;
    // Broader toward the foot, and a little curled.
    u = u / (1 + 0.22 * clamp(-v / b, -1, 1)) - bend * (1 - (v / b) ** 2) * hw * 0.35;
    const pu = Math.abs(u), pv = Math.abs(v), bb = Math.sqrt(Math.max(0, r * r - dd * dd));
    return (pv - bb) * dd > pu * bb ? Math.hypot(pu, pv - bb) : Math.hypot(pu + dd, pv) - r;
  };
  const reach = stalk + long + 3, box = [Math.min(bx, bx + s * reach) - hw - 3, Math.min(by, by + c * reach) - hw - 3, Math.max(bx, bx + s * reach) + hw + 3, Math.max(by, by + c * reach) + hw + 3];
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

function paintLeaf(cv, tile, rnd, bx, by, th, scale, wrap) {
  const long = (LEAF.long[0] + rnd() * (LEAF.long[1] - LEAF.long[0])) * scale, wide = LEAF.wide[0] + rnd() * (LEAF.wide[1] - LEAF.wide[0]);
  const leaf = leafShape(bx, by, th, long, wide, (LEAF.stalk[0] + rnd() * (LEAF.stalk[1] - LEAF.stalk[0])) * scale, (rnd() - 0.5) * 2);
  // Each leaf's own lightness, a hue that leans a little from the tree's (a few lean far: a leaf turned early),
  // how much it faces the light, and which half of its fold is the lit one.
  const light = 0.55 + 0.45 * rnd(), hue = rnd() < 0.12 ? (rnd() < 0.5 ? 0.05 : 0.95) : 0.3 + 0.4 * rnd(), face = 0.25 + 0.75 * rnd(), lit = rnd() < 0.5 ? 1 : -1;
  const seed = Math.floor(rnd() * 1e6);
  cv.shade(tile, leaf.box, leaf.sd, wrap);
  cv.lay(tile, leaf.box, leaf.sd, (x, y, d) => {
    const [u, v] = leaf.local(x, y), along = clamp(-v / leaf.b * 0.5 + 0.5);
    const fold = 0.5 + 0.5 * clamp((u * lit) / 1.2, -1, 1);
    const rib = 1 - 0.22 * clamp(1 - Math.abs(u) / 0.7) * (along < 0.95 ? 1 : 0);
    const rim = 1 - 0.18 * clamp(1 + d / 1.6);
    const speck = 1 + 0.08 * (hash2(Math.floor(x), Math.floor(y), seed) - 0.5);
    return [clamp(light * (0.78 + 0.22 * fold) * (0.9 + 0.12 * along) * rib * rim * speck), hue, face];
  }, wrap);
}

// A spray: a twig from the tile's foot that forks, with leaves along every branch, thicker toward the tips.
function spray(cv, tile, rnd) {
  const branches = [], root = [T / 2 + (rnd() - 0.5) * 16, T - 8];
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
  grow(root, (rnd() - 0.5) * 0.4, T * 0.6, 3.2, 2);
  for (const b of branches) { const t = twigShape(b.pts, b.w, b.w * 0.45); cv.lay(tile, t.box, t.sd, () => [0.18, 0.5, 0.4]); }
  // Leaves along every branch, alternating sides, from the stalk outward, until the tile is about half leaf.
  const spots = [];
  for (const b of branches) for (let i = 1; i < b.pts.length; i++) {
    const [ax, ay] = b.pts[i - 1], [bx, by] = b.pts[i], ang = Math.atan2(bx - ax, ay - by);
    for (let k = 0; k < 3; k++) { const t = (k + rnd()) / 3; spots.push([ax + (bx - ax) * t, ay + (by - ay) * t, ang, (i + k) % 2 ? 1 : -1, i / b.pts.length]); }
  }
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  // Leaves near the foot first, so those toward the tips lie over them.
  spots.sort((p, q) => q[1] - p[1] + (rnd() - 0.5) * 30);
  for (const [x, y, ang, side, out] of spots) {
    // A leaf must end inside its tile: one cut by the tile's edge is a straight line in the crown.
    const th = ang + side * (0.6 + rnd() * 0.7), sc = 0.85 + 0.3 * out, reach = (LEAF.long[1] + LEAF.stalk[1]) * sc + 4;
    const tx = x + Math.sin(th) * reach, ty = y - Math.cos(th) * reach, m = 6;
    if (Math.min(x, y, tx, ty) < m || Math.max(x, y, tx, ty) > T - m) continue;
    paintLeaf(cv, tile, rnd, x, y, th, sc, false);
  }
}

// The heart of a clump: a round mass of leaves over a dark mat, whose outline is the leaves themselves.
function disc(cv, tile, rnd) {
  const c = T / 2, mat = DISC.mat * T, reach = DISC.reach * T, ph = [rnd() * 6.28, rnd() * 6.28];
  const edge = (x, y) => { const a = Math.atan2(y - c, x - c); return Math.hypot(x - c, y - c) - mat * (1 + 0.12 * Math.sin(5 * a + ph[0]) + 0.08 * Math.sin(9 * a + ph[1])); };
  cv.lay(tile, [c - mat * 1.3, c - mat * 1.3, c + mat * 1.3, c + mat * 1.3], edge, (x, y) => [DISC.under * (0.8 + 0.4 * hash2(x >> 2, y >> 2, 3)), 0.5, 0.3]);
  for (let k = 0; k < DISC.leaves; k++) {
    // Most leaves toward the middle, a few out at the edge, each pointing out from the middle.
    const r = reach * Math.sqrt(rnd()) * 0.92, a = rnd() * Math.PI * 2, x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
    const th = Math.atan2(x - c, c - y) + (rnd() - 0.5) * 1.6, sc = 0.9 + 0.2 * rnd(), long = (LEAF.long[1] + LEAF.stalk[1]) * sc + 4;
    const tx = x + Math.sin(th) * long, ty = y - Math.cos(th) * long, m = 6;
    if (Math.min(x, y, tx, ty) < m || Math.max(x, y, tx, ty) > T - m) continue;
    paintLeaf(cv, tile, rnd, x, y, th, sc, false);
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

// The soft shadow on the ground under a tree. Never half leaf, so it is only ever laid softly over the ground.
function blob(cv, tile) {
  const ox = (tile % ATLAS.cols) * T, oy = Math.floor(tile / ATLAS.cols) * T;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const i = (oy + y) * W + ox + x, r = Math.hypot(x + 0.5 - T / 2, y + 0.5 - T / 2) / (T / 2);
    cv.L[i] = 0; cv.A[i] = BLOB.dark * clamp(1 - r * r) ** BLOB.fall;
  }
}

// Carries each painted pixel's numbers out into the bare pixels round it, so a smaller level that blends a leaf
// with the bare ground beside it keeps the leaf's numbers.
function spread(cv) {
  let edge = [];
  const has = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (cv.A[i] > 0.002) has[i] = 1;
  for (let pass = 0; pass < 24; pass++) {
    edge = [];
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
  for (const t of TILES.sprays) spray(cv, t, rnd);
  for (const t of TILES.discs) disc(cv, t, rnd);
  bark(cv, TILES.bark);
  blob(cv, TILES.blob);
  spread(cv);

  // The chain: each level the mean of four pixels of the one above, colors weighted by how much leaf they hold,
  // then in each tile of leaves every coverage scaled so as much of it is over a half as in the first level.
  const levels = [{ w: W, h: H, L: cv.L, G: cv.G, B: cv.B, A: cv.A }];
  const covered = (lv, tile, k) => {
    const t = T >> lv.k, ox = (tile % ATLAS.cols) * t, oy = Math.floor(tile / ATLAS.cols) * t;
    let n = 0;
    for (let y = 0; y < t; y++) for (let x = 0; x < t; x++) if (Math.min(1, lv.A[(oy + y) * lv.w + ox + x] * k) >= 0.5) n++;
    return n / (t * t);
  };
  levels[0].k = 0;
  const want = [...TILES.sprays, ...TILES.discs].map((tile) => covered(levels[0], tile, 1));
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
    [...TILES.sprays, ...TILES.discs].forEach((tile, n) => {
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
  const coverage = Object.fromEntries([...TILES.sprays, ...TILES.discs].map((t, n) => [t, +want[n].toFixed(3)]));
  return { data, width: FW, height: FH, coverage };
}
