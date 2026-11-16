// Sculpt R divides picture 9's rock into the faces it is made of, along the picture's own edges, and draws each
// face's outline as a polygon whose sides it shares with its neighbours.
//
//   node scripts/world/parts/rock-r/facets.mjs [--k 900] [--min 5]   writes measured/facets.json and a preview
//
// The faces are found by joining pixels that differ less than the faces round them do (Felzenszwalb and
// Huttenlocher's graph method), on the picture lightly smoothed, in its own lightness and warmth. Faces too thin to
// be a face are joined to the neighbour they share most edge with. Where the picture's rock is hidden (behind the
// core) the face is cut by rule into pieces of about the size round it.
// The outlines are traced along the cracks between pixels, cut into runs between the places where three faces meet,
// each run smoothed, straightened where it is straight and kept sharp at its corners, then laid at no more than
// SEG pixels a step. Two faces that meet share one run, so they share every point of their edge.
// Outside the rock a run is against: TOP (the land, over the roof's front), SKIN (the planet's own surface, past a
// torn edge) or AIR (under the rock).
import fs from 'node:fs';
import sharp from 'sharp';
import { see, toSRGB, luma } from './see.mjs';
import { CORE } from './trace.mjs';

export const TOP = -1, SKIN = -2, AIR = -3;
// The longest step along an outline, in the picture's pixels.
export const SEG = 1.6;
// The second generation of breaks: a face of at least `from` pixels is cut once for every `each`, at most `most`
// times, and a piece under `least` goes back.
export const BREAK = { from: 700, each: 450, most: 3, least: 60 };
const OUT = new URL('./measured/facets.json', import.meta.url).pathname;

function args() {
  const a = process.argv.slice(2), get = (k, d) => { const i = a.indexOf(`--${k}`); return i >= 0 ? Number(a[i + 1]) : d; };
  return { k: get('k', 6), min: get('min', 14), target: get('target', 1500), most: get('most', 2600) };
}

class Sets {
  constructor(n) { this.p = new Int32Array(n).map((_, i) => i); this.size = new Int32Array(n).fill(1); this.int = new Float32Array(n); }
  find(a) { while (this.p[a] !== a) { this.p[a] = this.p[this.p[a]]; a = this.p[a]; } return a; }
  join(a, b, w) { if (this.size[a] < this.size[b]) [a, b] = [b, a]; this.p[b] = a; this.size[a] += this.size[b]; this.int[a] = Math.max(this.int[a], this.int[b], w); return a; }
}

export async function facets({ k = 25, min = 5, target = 3200, most = 1800 } = {}) {
  const s = await see(), { W, H, kind, rgb, top } = s, n = W * H;
  const isRock = (i) => kind[i] === 1 || kind[i] === 2;
  // The picture as the eye sees it: lightness 0 to 255, and two of warmth, smoothed a little inside the rock.
  const F = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (!isRock(i)) continue;
    const r = toSRGB(rgb[i * 3]) * 255, g = toSRGB(rgb[i * 3 + 1]) * 255, b = toSRGB(rgb[i * 3 + 2]) * 255;
    F[i * 3] = 0.3 * r + 0.6 * g + 0.1 * b; F[i * 3 + 1] = 0.45 * (r - g); F[i * 3 + 2] = 0.3 * (g - b);
  }
  const G = new Float32Array(n * 3), wts = [0.25, 0.5, 0.25];
  for (const pass of [0, 1]) {
    const src = pass ? G.slice() : F, step = pass ? W : 1;
    for (let i = 0; i < n; i++) {
      if (!isRock(i)) continue;
      let a = 0, b = 0, c = 0, w = 0;
      for (let d = -1; d <= 1; d++) { const j = i + d * step; if (j < 0 || j >= n || !isRock(j)) continue; const q = wts[d + 1]; a += src[j * 3] * q; b += src[j * 3 + 1] * q; c += src[j * 3 + 2] * q; w += q; }
      G[i * 3] = a / w; G[i * 3 + 1] = b / w; G[i * 3 + 2] = c / w;
    }
  }
  const diff = (i, j) => Math.hypot(G[i * 3] - G[j * 3], G[i * 3 + 1] - G[j * 3 + 1], G[i * 3 + 2] - G[j * 3 + 2]);

  // The graph: every rock pixel to its right, lower and two lower diagonal neighbours.
  const ea = [], eb = [], ew = [];
  for (let y = 0; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = x + y * W;
    if (!isRock(i)) continue;
    for (const j of [i + 1, i + W, i + W + 1, i + W - 1]) if (isRock(j)) { ea.push(i); eb.push(j); ew.push(diff(i, j) * (j === i + 1 || j === i + W ? 1 : 1.1)); }
  }
  const order = Array.from(ew.keys()).sort((a, b) => ew[a] - ew[b]);
  const U = new Sets(n);
  for (const e of order) {
    let a = U.find(ea[e]), b = U.find(eb[e]);
    if (a === b) continue;
    const w = ew[e];
    if (w <= Math.min(U.int[a] + k / U.size[a], U.int[b] + k / U.size[b])) U.join(a, b, w);
  }
  for (const e of order) { const a = U.find(ea[e]), b = U.find(eb[e]); if (a !== b && (U.size[a] < min || U.size[b] < min)) U.join(a, b, ew[e]); }

  let lab = new Int32Array(n).fill(AIR);
  const ids = new Map();
  for (let i = 0; i < n; i++) {
    if (isRock(i)) { const r = U.find(i); if (!ids.has(r)) ids.set(r, ids.size); lab[i] = ids.get(r); continue; }
    const x = i % W, y = (i / W) | 0;
    lab[i] = kind[i] === 3 ? AIR : y + 0.5 <= top[x] + 0.75 ? TOP : (y > 560 && x > 330 && x < 1010) ? AIR : SKIN;
  }
  let count = ids.size;

  // The small regions are joined, the most alike first, until there are about target of them: alike in lightness
  // and warmth, with a weak edge between them, and not grown past most pixels.
  {
    let N = count;
    const st = new Float64Array(N * 4);
    for (let i = 0; i < n; i++) { const a = lab[i]; if (a < 0) continue; st[a * 4] += 1; st[a * 4 + 1] += G[i * 3]; st[a * 4 + 2] += G[i * 3 + 1]; st[a * 4 + 3] += G[i * 3 + 2]; }
    const edge = new Map();
    for (let i = 0; i < n; i++) {
      const a = lab[i];
      if (a < 0) continue;
      for (const j of [i + 1, i + W]) { const b = lab[j]; if (b < 0 || b === a) continue; const key = a < b ? a * 1048576 + b : b * 1048576 + a; const e = edge.get(key) ?? [0, 0]; e[0] += 1; e[1] += diff(i, j); edge.set(key, e); }
    }
    const P = new Int32Array(N).map((_, i) => i), find = (a) => { while (P[a] !== a) { P[a] = P[P[a]]; a = P[a]; } return a; };
    let alive = N;
    for (let T = 2; alive > target && T < 80; T *= 1.15) {
      const pairs = [];
      for (const [key, e] of edge) {
        const a = find(Math.floor(key / 1048576)), b = find(key % 1048576);
        if (a === b) continue;
        const A = st[a * 4], B = st[b * 4];
        const cost = Math.hypot(st[a * 4 + 1] / A - st[b * 4 + 1] / B, 0.8 * (st[a * 4 + 2] / A - st[b * 4 + 2] / B), 0.8 * (st[a * 4 + 3] / A - st[b * 4 + 3] / B)) + 0.35 * (e[1] / e[0]) + (A + B > most ? 1e9 : 0) - 0.15 * Math.min(10, 600 / Math.min(A, B));
        if (cost < T) pairs.push([cost, a, b]);
      }
      pairs.sort((x, y) => x[0] - y[0]);
      const touched = new Uint8Array(N);
      for (const [, a, b] of pairs) {
        if (touched[a] || touched[b] || alive <= target) continue;
        touched[a] = touched[b] = 1;
        P[b] = a;
        for (let q = 0; q < 4; q++) st[a * 4 + q] += st[b * 4 + q];
        alive--;
      }
      const merged = new Map();
      for (const [key, e] of edge) { const a = find(Math.floor(key / 1048576)), b = find(key % 1048576); if (a === b) continue; const k2 = a < b ? a * 1048576 + b : b * 1048576 + a; const m = merged.get(k2) ?? [0, 0]; m[0] += e[0]; m[1] += e[1]; merged.set(k2, m); }
      edge.clear();
      for (const [kk, v] of merged) edge.set(kk, v);
    }
    for (let i = 0; i < n; i++) if (lab[i] >= 0) lab[i] = find(lab[i]);
  }

  // Where the picture hides the rock, cut what is hidden into pieces of about 22 pixels across.
  {
    const seeds = [];
    for (let y = CORE.at[1] - CORE.r; y <= CORE.at[1] + CORE.r; y += 20) for (let x = CORE.at[0] - CORE.r; x <= CORE.at[0] + CORE.r; x += 20) {
      const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453, j = h - Math.floor(h);
      seeds.push([x + (j - 0.5) * 14, y + ((j * 7.31) % 1 - 0.5) * 14]);
    }
    const piece = new Map();
    for (let i = 0; i < n; i++) {
      if (kind[i] !== 2) continue;
      const x = i % W, y = (i / W) | 0;
      if ((x - CORE.at[0]) ** 2 + (y - CORE.at[1]) ** 2 > (CORE.r - 4) ** 2) continue;
      let best = 0, bd = Infinity;
      seeds.forEach(([sx, sy], q) => { const d = (x - sx) ** 2 + (y - sy) ** 2; if (d < bd) { bd = d; best = q; } });
      if (!piece.has(best)) piece.set(best, count++);
      lab[i] = piece.get(best);
    }
  }

  // Join what is too thin to be a face, and what is in pieces, to the neighbour it shares most edge with.
  const relabel = () => {
    const seen = new Int32Array(n).fill(-1), map = new Map();
    let next = 0;
    const out = lab.slice();
    for (let i = 0; i < n; i++) {
      if (lab[i] < 0 || seen[i] >= 0) continue;
      const id = next++, q = [i];
      seen[i] = id;
      while (q.length) { const a = q.pop(); out[a] = id; for (const j of [a - 1, a + 1, a - W, a + W]) if (j >= 0 && j < n && lab[j] === lab[i] && seen[j] < 0) { seen[j] = id; q.push(j); } }
      map.set(id, lab[i]);
    }
    lab = out;
    return next;
  };
  for (let round = 0; round < 4; round++) {
    count = relabel();
    const area = new Int32Array(count), core = new Int32Array(count), shared = new Map();
    for (let i = 0; i < n; i++) {
      const a = lab[i];
      if (a < 0) continue;
      area[a]++;
      const x = i % W;
      let inner = true;
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        const b = lab[j];
        if (b !== a) { inner = false; if (b >= 0) { const key = a * 65536 + b; shared.set(key, (shared.get(key) ?? 0) + 1); } }
      }
      if (inner && x > 0) core[a]++;
    }
    const target = new Int32Array(count).map((_, i) => i);
    let joined = 0;
    for (let a = 0; a < count; a++) {
      const thin = core[a] < 0.15 * area[a] && area[a] < 120, tiny = area[a] < min;
      if (!thin && !tiny) continue;
      let best = -1, bv = 0;
      for (const [key, v] of shared) if (Math.floor(key / 65536) === a && v > bv && area[key % 65536] >= area[a]) { bv = v; best = key % 65536; }
      if (best >= 0) { target[a] = best; joined++; }
    }
    const root = (a) => { let r = a, guard = 0; while (target[r] !== r && guard++ < 50) r = target[r]; return r; };
    for (let i = 0; i < n; i++) if (lab[i] >= 0) lab[i] = root(lab[i]);
    if (!joined) break;
  }
  count = relabel();

  // A second generation of breaks, by rule: a large face is cut by one to four straight-ish lines across its long
  // way into pieces that stay nearly one plane (relief.mjs keeps them so), as a broken slab is. What each piece
  // came from is kept as its parent.
  const origin = lab.slice();
  {
    const px = Array.from({ length: count }, () => []);
    for (let i = 0; i < n; i++) if (lab[i] >= 0 && kind[i] === 1) px[lab[i]].push(i);
    let next = count;
    const rnd = (a, b) => { const h = Math.sin(a * 91.17 + b * 12.31) * 24634.6345; return h - Math.floor(h); };
    for (let a = 0; a < count; a++) {
      const list = px[a];
      if (list.length < BREAK.from) continue;
      let mx = 0, my = 0;
      for (const i of list) { mx += i % W; my += (i / W) | 0; }
      mx /= list.length; my /= list.length;
      let sxx = 0, syy = 0, sxy = 0;
      for (const i of list) { const dx = (i % W) - mx, dy = ((i / W) | 0) - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
      const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), long = Math.sqrt((sxx + syy) / list.length) * 2;
      const cuts = Math.min(BREAK.most, Math.floor(list.length / BREAK.each));
      const lines = [];
      for (let c = 0; c < cuts; c++) {
        const along = ((c + 0.5) / cuts - 0.5) * 1.3 * long + (rnd(a, c) - 0.5) * 0.3 * long, turn = (rnd(c, a + 7) - 0.5) * 1.2;
        const ox = mx + Math.cos(th) * along, oy = my + Math.sin(th) * along, dir = th + Math.PI / 2 + turn;
        lines.push([ox, oy, Math.cos(dir), Math.sin(dir)]);
      }
      const ids = new Map();
      for (const i of list) {
        const x = i % W, y = (i / W) | 0;
        let side = 0;
        lines.forEach(([ox, oy, dx, dy], c) => { if ((x - ox) * dy - (y - oy) * dx > 0) side += 1 << c; });
        if (!side) continue;
        if (!ids.has(side)) ids.set(side, next++);
        lab[i] = ids.get(side);
      }
    }
    count = relabel();
    // Pieces too small to be a face go back into the piece of the same face they share most edge with.
    for (let round = 0; round < 2; round++) {
      const area = new Int32Array(count), best = new Map();
      for (let i = 0; i < n; i++) if (lab[i] >= 0) area[lab[i]]++;
      for (let i = 0; i < n; i++) {
        const a = lab[i];
        if (a < 0 || area[a] >= BREAK.least) continue;
        for (const j of [i - 1, i + 1, i - W, i + W]) { const b = lab[j]; if (b >= 0 && b !== a && origin[j] === origin[i]) { const m = best.get(a) ?? new Map(); m.set(b, (m.get(b) ?? 0) + 1); best.set(a, m); } }
      }
      for (let i = 0; i < n; i++) { const m = best.get(lab[i]); if (m) { let bb = -1, bv = 0; for (const [b, v] of m) if (v > bv) { bv = v; bb = b; } lab[i] = bb; } }
      count = relabel();
    }
  }
  const parent = new Int32Array(count).fill(-1);
  for (let i = 0; i < n; i++) if (lab[i] >= 0 && parent[lab[i]] < 0) parent[lab[i]] = origin[i];

  // What each face is in the picture: its mean color in linear light over what the picture shows of it, its size,
  // its middle, and how much of it is hidden.
  const sum = new Float64Array(count * 8);
  for (let i = 0; i < n; i++) {
    const a = lab[i];
    if (a < 0) continue;
    const x = i % W + 0.5, y = ((i / W) | 0) + 0.5, o = a * 8, shown = kind[i] === 1;
    sum[o] += 1; sum[o + 1] += x; sum[o + 2] += y;
    if (shown) { sum[o + 3] += 1; sum[o + 4] += rgb[i * 3]; sum[o + 5] += rgb[i * 3 + 1]; sum[o + 6] += rgb[i * 3 + 2]; sum[o + 7] += luma(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]) ** 2; }
  }
  const faces = [];
  for (let a = 0; a < count; a++) {
    const o = a * 8, c = sum[o], v = sum[o + 3];
    const col = v > 0 ? [sum[o + 4] / v, sum[o + 5] / v, sum[o + 6] / v] : [0, 0, 0];
    let ac = [0, 0, 0];
    if (v === 0) {
      for (let i = 0; i < n; i++) if (lab[i] === a) for (let q = 0; q < 3; q++) ac[q] += rgb[i * 3 + q];
      ac = ac.map((x) => x / c);
    }
    faces.push({ id: a, parent: parent[a], area: c, at: [sum[o + 1] / c, sum[o + 2] / c], shown: v / c, rgb: v > 0 ? col : ac });
  }

  // The outlines, along the cracks between pixels.
  const C = W + 1, labAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? AIR : lab[x + y * W]);
  // Each corner's cracks: east (x to x+1 along y), south (y to y+1 along x). A crack is live when it parts two
  // labels, at least one of them rock.
  const live = (a, b) => a !== b && (a >= 0 || b >= 0);
  const eastLive = (x, y) => x < W && live(labAt(x, y - 1), labAt(x, y));
  const southLive = (x, y) => y < H && live(labAt(x - 1, y), labAt(x, y));
  const degree = (x, y) => (eastLive(x, y) ? 1 : 0) + (southLive(x, y) ? 1 : 0) + (x > 0 && eastLive(x - 1, y) ? 1 : 0) + (y > 0 && southLive(x, y - 1) ? 1 : 0);
  const junction = (x, y) => {
    const d = degree(x, y);
    if (d === 0) return false;
    if (d !== 2) return true;
    const q = new Set([labAt(x - 1, y - 1), labAt(x, y - 1), labAt(x - 1, y), labAt(x, y)]);
    return q.size > 2;
  };
  const used = new Uint8Array((W + 1) * (H + 1) * 2);
  const usedKey = (x, y, dir) => (x + y * C) * 2 + dir;
  // A step from a corner: [dx, dy, crack key]. Its left and right pixels, for a step that goes from (x, y).
  const steps = (x, y) => {
    const out = [];
    if (eastLive(x, y)) out.push([1, 0, usedKey(x, y, 0)]);
    if (x > 0 && eastLive(x - 1, y)) out.push([-1, 0, usedKey(x - 1, y, 0)]);
    if (southLive(x, y)) out.push([0, 1, usedKey(x, y, 1)]);
    if (y > 0 && southLive(x, y - 1)) out.push([0, -1, usedKey(x, y - 1, 1)]);
    return out;
  };
  // The labels on the left and the right of a step from (x, y), on the screen, whose y runs down.
  const sides = (x, y, dx, dy) => {
    if (dx === 1) return [labAt(x, y - 1), labAt(x, y)];
    if (dx === -1) return [labAt(x - 1, y), labAt(x - 1, y - 1)];
    if (dy === 1) return [labAt(x, y), labAt(x - 1, y)];
    return [labAt(x - 1, y - 1), labAt(x, y - 1)];
  };
  const chains = [];
  const walk = (x0, y0, st) => {
    const pts = [[x0, y0]], [L0, R0] = sides(x0, y0, st[0], st[1]);
    let x = x0, y = y0, s = st;
    for (;;) {
      used[s[2]] = 1;
      x += s[0]; y += s[1];
      pts.push([x, y]);
      if (junction(x, y) || (x === x0 && y === y0)) break;
      const next = steps(x, y).find((q) => !used[q[2]]);
      if (!next) break;
      const [l, r] = sides(x, y, next[0], next[1]);
      if (l !== L0 || r !== R0) break;
      s = next;
    }
    chains.push({ L: L0, R: R0, raw: pts, closed: pts.length > 2 && pts[0][0] === x && pts[0][1] === y && !junction(x, y) });
  };
  for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) if (junction(x, y)) for (const st of steps(x, y)) if (!used[st[2]]) walk(x, y, st);
  for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) for (const st of steps(x, y)) if (!used[st[2]]) walk(x, y, st);

  // Smooth each run, keep its corners, and lay it at no more than SEG a step.
  const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h) - 0.5; };
  for (const ch of chains) {
    const p = ch.raw, m = p.length, closed = ch.closed;
    let q = p.map(([x, y]) => [x, y]);
    if (m > 3) {
      // Crack midpoints read the edge better than the corners, which stair.
      const mid = [];
      for (let i = 0; i < m - 1; i++) mid.push([(p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2]);
      const sm = mid.map((_, i) => {
        let sx = 0, sy = 0, sw = 0;
        for (let d = -3; d <= 3; d++) {
          let j = i + d;
          if (closed) j = (j + mid.length) % mid.length; else if (j < 0 || j >= mid.length) continue;
          const w = Math.exp(-(d * d) / (2 * 1.8 * 1.8));
          sx += mid[j][0] * w; sy += mid[j][1] * w; sw += w;
        }
        return [sx / sw, sy / sw];
      });
      q = closed ? [...sm, sm[0]] : [p[0], ...sm, p[m - 1]];
    }
    // Douglas and Peucker: what is straight goes straight, a corner stays.
    const keep = new Uint8Array(q.length);
    keep[0] = keep[q.length - 1] = 1;
    const dp = (a, b) => {
      let best = -1, bd = 1.5;
      const [ax, ay] = q[a], [bx, by] = q[b], lx = bx - ax, ly = by - ay, ll = Math.hypot(lx, ly) || 1;
      for (let i = a + 1; i < b; i++) { const d = Math.abs((q[i][0] - ax) * ly - (q[i][1] - ay) * lx) / ll; if (d > bd) { bd = d; best = i; } }
      if (best >= 0) { keep[best] = 1; dp(a, best); dp(best, b); }
    };
    if (closed && q.length > 4) { const h = Math.floor(q.length / 2); keep[h] = 1; dp(0, h); dp(h, q.length - 1); } else dp(0, q.length - 1);
    const s = q.filter((_, i) => keep[i]);
    // Lay it at no more than SEG a step, with a wander of a few tenths of a pixel on a long straight run, so no
    // edge is ruler straight.
    const out = [s[0]];
    for (let i = 1; i < s.length; i++) {
      const [ax, ay] = s[i - 1], [bx, by] = s[i], len = Math.hypot(bx - ax, by - ay), k2 = Math.max(1, Math.ceil(len / SEG));
      const nx = -(by - ay) / (len || 1), ny = (bx - ax) / (len || 1);
      for (let j = 1; j <= k2; j++) {
        const t = j / k2, wob = j < k2 && len > 5 ? 0.28 * Math.sin(Math.PI * t) * (hash(ax + j, ay) + 0.6 * hash(ay, bx + j)) : 0;
        out.push([ax + (bx - ax) * t + nx * wob, ay + (by - ay) * t + ny * wob]);
      }
    }
    ch.pts = out.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
    ch.a = p[0]; ch.b = p[m - 1];
    // How much of a gap the run is: how dark the picture is along it, against the faces on each side.
    let dark = 0, cnt = 0;
    for (let i = 0; i < m - 1; i += 1) {
      const [x, y] = p[i], [x2, y2] = p[i + 1], px = Math.floor((x + x2) / 2 - (y2 - y) * 0.5 - (x2 === x ? 0.5 : 0) * 0), py = Math.floor((y + y2) / 2);
      for (const [u, v] of [[px, py], [px - 1, py], [px, py - 1], [px - 1, py - 1]]) { const i2 = u + v * W; if (i2 >= 0 && i2 < n && kind[i2] === 1) { dark += luma(rgb[i2 * 3], rgb[i2 * 3 + 1], rgb[i2 * 3 + 2]); cnt++; } }
    }
    ch.edge = cnt ? dark / cnt : -1;
    delete ch.raw;
  }
  return { W, H, faces, chains, lab };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = performance.now(), o = args(), r = await facets(o);
  const sizes = r.faces.map((f) => f.area).sort((a, b) => a - b);
  console.log(`faces ${r.faces.length}, runs ${r.chains.length}, area median ${sizes[sizes.length >> 1]}, largest ${sizes.slice(-5).join(' ')}, under 20 px ${sizes.filter((s) => s < 20).length}, ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  fs.mkdirSync(new URL('./measured/', import.meta.url).pathname, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ k: o.k, min: o.min, target: o.target, most: o.most, faces: r.faces.map((f) => ({ ...f, at: f.at.map((v) => +v.toFixed(2)), shown: +f.shown.toFixed(3), rgb: f.rgb.map((v) => +v.toFixed(5)) })), chains: r.chains }));
  // A preview: each face its mean color, its outlines drawn over in thin light lines.
  const { W, H, lab, faces } = r, img = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) { const a = lab[i]; if (a < 0) { img[i * 3] = a === TOP ? 40 : a === SKIN ? 25 : 10; img[i * 3 + 1] = a === TOP ? 60 : 20; img[i * 3 + 2] = a === AIR ? 50 : 20; continue; } for (let c = 0; c < 3; c++) img[i * 3 + c] = Math.round(255 * toSRGB(faces[a].rgb[c])); }
  const scale = 3, x0 = 240, y0 = 250, w = 860, h = 480, big = new Uint8Array(w * scale * h * scale * 3);
  for (let y = 0; y < h * scale; y++) for (let x = 0; x < w * scale; x++) { const i = (x0 + Math.floor(x / scale)) + (y0 + Math.floor(y / scale)) * W, o2 = (x + y * w * scale) * 3; big[o2] = img[i * 3]; big[o2 + 1] = img[i * 3 + 1]; big[o2 + 2] = img[i * 3 + 2]; }
  for (const ch of r.chains) for (let i = 1; i < ch.pts.length; i++) {
    const [ax, ay] = ch.pts[i - 1], [bx, by] = ch.pts[i], k2 = Math.ceil(Math.hypot(bx - ax, by - ay) * scale * 2) + 1;
    for (let j = 0; j <= k2; j++) { const x = Math.round(((ax + (bx - ax) * j / k2) - x0) * scale), y = Math.round(((ay + (by - ay) * j / k2) - y0) * scale); if (x < 0 || y < 0 || x >= w * scale || y >= h * scale) continue; const o2 = (x + y * w * scale) * 3; big[o2] = 255; big[o2 + 1] = 200; big[o2 + 2] = 120; }
  }
  await sharp(Buffer.from(big), { raw: { width: w * scale, height: h * scale, channels: 3 } }).jpeg({ quality: 90 }).toFile('shots/world/rock-r/facets.jpg');
  await sharp(Buffer.from(big), { raw: { width: w * scale, height: h * scale, channels: 3 } }).extract({ left: 300 * 3 - 0, top: 60 * 3, width: 900, height: 600 }).jpeg({ quality: 90 }).toFile('shots/world/rock-r/facets-close.jpg');
}
