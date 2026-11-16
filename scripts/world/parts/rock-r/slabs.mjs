// Sculpt R, round 2: picture 9's rock as great slabs. The faces the picture is divided into (facets.mjs, about
// 1,500 of them) are joined, the most alike first, into the pieces a slab is broken into, and those into the great
// slabs themselves, each one plane in the relief. A slab is not grown past the size of the picture's own slabs, and
// two faces with a dark line between them are the last to be joined.
//
//   node scripts/world/parts/rock-r/slabs.mjs     writes measured/slabs.json and shots/world/rock-r/r2-slabs.jpg
//
//   slabs.json: { pieces: [{ id, slab, area, shown, at, Y, rgb }], slabs: [{ id, role, pieces, area, at, Y, axis,
//                 long, wide }], chains: [{ L, R, pts, closed, edge, kind }] }
//   A chain's kind: 'slab' between two slabs or against what is not the rock, 'piece' inside one slab.
//   A slab's role: 'lit' (it takes the core's light), 'shade' (turned from it), 'gap' (a black hole between slabs) or
//   'frame' (the heavy dark masses at each side and the roof's front, nearer the visitor than the core).
import fs from 'node:fs';
import sharp from 'sharp';
import { segment, outline, connected, TOP, SKIN, AIR } from './facets.mjs';
import { toSRGB, luma } from './see.mjs';
import { CORE } from './trace.mjs';

// How many pieces and slabs, and the most a slab may be: its area in pixels, and its length.
export const GROUP = { pieces: 330, slabs: 120, area: 9000, long: 230, pieceArea: 2600 };
// How far a run between slabs may stray from straight before it keeps a corner, and a run inside one, in pixels.
// A run against what is not the rock keeps closer to the picture, so the outline still sits on it; a crevice's runs
// closest of all, or it would close.
const TOL = { slab: 3.4, piece: 1.7, outline: 1.8, crevice: 0.9 };
// A crevice: within `near` pixels of where two slabs meet, darker than `dark` and than `share` of the rock round it
// (within `round` pixels), at least `least` pixels in all.
// Only where the rock round it is lit: in the dark frame a crevice is already black.
const CREVICE = { near: 3, dark: 0.012, share: 0.3, round: 7, least: 10, most: 3000, lit: 0.035 };
// What is left of a piece a crevice cut, under this many pixels, goes to the piece beside it it shares most with.
const CRUMB = 30;
// Strata: a slab at least this long and wide is cut, the lines turned from its length by up to `turn` radians, and a
// layer under `least` pixels goes back.
// Chips: on a run between two slabs of at least `run` pixels, each piece at least `area`, one every `every` pixels,
// `wide` across and `deep` into one side, none within `margin` of the run's ends.
const CHIP = { run: 18, area: 300, every: [10, 26], wide: [3, 7], deep: [1, 2.4], margin: 4 };
const STRATA = { long: 70, wide: 22, turn: 0.09, least: 60 };
const OUT = new URL('./measured/slabs.json', import.meta.url).pathname;

export async function slabs() {
  const seg = await segment({ k: 6, min: 14, target: 1500, most: 2600 });
  const { W, H, kind, rgb } = seg, lab = seg.lab, n = W * H;
  let F = seg.count;
  // Each face's sums: area, shown, Y, x, y, xx, yy, xy, and its boundary length.
  const st = new Float64Array(F * 9), per = new Float64Array(F);
  const Yp = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = lab[i];
    if (a < 0) continue;
    const x = (i % W) + 0.5, y = ((i / W) | 0) + 0.5, Y = luma(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]), o = a * 9;
    Yp[i] = Y;
    st[o] += 1; st[o + 1] += kind[i] === 1 ? 1 : 0; st[o + 2] += Y; st[o + 3] += x; st[o + 4] += y; st[o + 5] += x * x; st[o + 6] += y * y; st[o + 7] += x * y;
  }
  const edge = new Map(), key = (a, b) => (a < b ? a * 65536 + b : b * 65536 + a);
  for (let i = 0; i < n; i++) {
    const a = lab[i];
    if (a < 0) continue;
    for (const j of [i + 1, i + W, i - 1, i - W]) {
      const b = j >= 0 && j < n ? lab[j] : AIR;
      if (b === a) continue;
      per[a]++;
      if (b < 0 || j < i) continue;
      const k = key(a, b), e = edge.get(k) ?? [0, 0];
      e[0]++; e[1] += Math.min(Yp[i], Yp[j]);
      edge.set(k, e);
    }
  }
  const up = new Int32Array(F).map((_, i) => i), find = (a) => { while (up[a] !== a) { up[a] = up[up[a]]; a = up[a]; } return a; };
  const Yof = (a) => st[a * 9 + 2] / st[a * 9], shownOf = (a) => st[a * 9 + 1] / st[a * 9];
  const lengthOf = (sa) => {
    const A = sa[0], mx = sa[3] / A, my = sa[4] / A, xx = sa[5] / A - mx * mx, yy = sa[6] / A - my * my, xy = sa[7] / A - mx * my;
    const tr = xx + yy, det = xx * yy - xy * xy, l1 = tr / 2 + Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
    return 2 * Math.sqrt(3 * l1);
  };
  const cost = (a, b, e, cap) => {
    const A = st[a * 9], B = st[b * 9];
    if (A + B > cap.area) return Infinity;
    const sum = Array.from({ length: 9 }, (_, q) => st[a * 9 + q] + st[b * 9 + q]);
    if (lengthOf(sum) > cap.long) return Infinity;
    // What the core hides is never one slab with what is seen: a slab behind the core is moved clear of it freely,
    // and one that is seen would be moved with it.
    if (Math.abs(shownOf(a) - shownOf(b)) > 0.6) return Infinity;
    const ya = Yof(a), yb = Yof(b), hid = Math.min(shownOf(a), shownOf(b)) < 0.3 ? 0.5 : 1;
    const dY = hid * Math.abs(Math.log((ya + 0.008) / (yb + 0.008)));
    const line = e[1] / e[0] / Math.max(1e-4, Math.min(ya, yb)), dark = Math.max(0, 0.78 - line) * 1.6;
    const share = e[0] / Math.min(per[a], per[b]);
    // Small faces go first, so a slab is made of the picture's broad faces and not grown from crumbs.
    const small = 0.25 * Math.min(1, 60 / Math.min(A, B));
    return dY + dark - 0.45 * share - small;
  };
  let alive = F;
  const snap = (cap) => {
    while (alive > cap.count) {
      let best = Infinity, ba = -1, bb = -1;
      for (const [k, e] of edge) {
        const a = Math.floor(k / 65536), b = k % 65536, c = cost(a, b, e, cap);
        if (c < best) { best = c; ba = a; bb = b; }
      }
      if (ba < 0) break;
      // Join bb into ba.
      up[bb] = ba;
      for (let q = 0; q < 9; q++) st[ba * 9 + q] += st[bb * 9 + q];
      const shared = edge.get(key(ba, bb))[0];
      per[ba] += per[bb] - 2 * shared;
      edge.delete(key(ba, bb));
      for (const [k, e] of [...edge]) {
        const a = Math.floor(k / 65536), b = k % 65536;
        if (a !== bb && b !== bb) continue;
        edge.delete(k);
        const o = a === bb ? b : a, k2 = key(ba, o), m = edge.get(k2) ?? [0, 0];
        m[0] += e[0]; m[1] += e[1];
        edge.set(k2, m);
      }
      alive--;
    }
    return Int32Array.from({ length: F }, (_, i) => find(i));
  };
  const toPiece = snap({ count: GROUP.pieces, area: GROUP.pieceArea, long: GROUP.long * 0.7 });
  const toSlab = snap({ count: GROUP.slabs, area: GROUP.area, long: GROUP.long });

  // The pieces as labels, each one connected piece.
  const plab = new Int32Array(n);
  for (let i = 0; i < n; i++) plab[i] = lab[i] < 0 ? lab[i] : toPiece[lab[i]];
  let P = connected(W, H, plab);
  let slabOfPiece = new Int32Array(P).fill(-1);
  for (let i = 0; i < n; i++) if (plab[i] >= 0 && slabOfPiece[plab[i]] < 0) slabOfPiece[plab[i]] = toSlab[lab[i]];
  // Slabs numbered from 0.
  const sid = new Map();
  for (let p = 0; p < P; p++) { if (!sid.has(slabOfPiece[p])) sid.set(slabOfPiece[p], sid.size); slabOfPiece[p] = sid.get(slabOfPiece[p]); }
  let S = sid.size;
  // The picture's crevices: thin lines of near black between two slabs, each made a gap of its own.
  let found = crevices(W, H, plab, slabOfPiece, Yp, kind, P);
  if (found) {
    const before = plab.slice();
    P = connected(W, H, plab);
    const next = new Int32Array(P).fill(-1);
    for (let i = 0; i < n; i++) { const q = plab[i]; if (q < 0 || next[q] >= 0) continue; const o = before[i]; next[q] = o >= slabOfPiece.length ? S + (o - slabOfPiece.length) : slabOfPiece[o]; }
    slabOfPiece = next;
    S += found;
    // Crumbs a crevice cut off a piece go back to the piece of their own slab beside them, or any beside them.
    for (let round = 0; round < 3; round++) {
      const area = new Int32Array(P), share = new Map();
      for (let i = 0; i < n; i++) if (plab[i] >= 0) area[plab[i]]++;
      for (let i = 0; i < n; i++) {
        const a = plab[i];
        if (a < 0 || area[a] >= CRUMB || slabOfPiece[a] >= S - found) continue;
        for (const j of [i - 1, i + 1, i - W, i + W]) {
          const b = plab[j];
          if (b < 0 || b === a || slabOfPiece[b] >= S - found) continue;
          const m = share.get(a) ?? new Map();
          m.set(b, (m.get(b) ?? 0) + (slabOfPiece[b] === slabOfPiece[a] ? 4 : 1));
          share.set(a, m);
        }
      }
      if (!share.size) break;
      const to = new Map();
      for (const [a, m] of share) { let bb = -1, bv = 0; for (const [b, v] of m) if (v > bv) { bv = v; bb = b; } to.set(a, bb); }
      for (let i = 0; i < n; i++) { const t = to.get(plab[i]); if (t !== undefined && !to.has(t)) plab[i] = t; }
      const before2 = plab.slice(), P2 = connected(W, H, plab), next2 = new Int32Array(P2).fill(-1);
      for (let i = 0; i < n; i++) { const q = plab[i]; if (q >= 0 && next2[q] < 0) next2[q] = slabOfPiece[before2[i]]; }
      P = P2; slabOfPiece = next2;
    }
  }
  // Slabs numbered again from 0, leaving out any a crevice or a crumb emptied.
  {
    const used = new Map(), first = S - found;
    let creviceFrom = Infinity;
    for (let p = 0; p < P; p++) { const s0 = slabOfPiece[p]; if (!used.has(s0)) used.set(s0, -1); }
    let k = 0;
    for (const s0 of [...used.keys()].sort((a, b) => a - b)) { used.set(s0, k); if (s0 >= first) creviceFrom = Math.min(creviceFrom, k); k++; }
    for (let p = 0; p < P; p++) slabOfPiece[p] = used.get(slabOfPiece[p]);
    found = k - Math.min(k, creviceFrom);
    S = k;
  }
  const crevice = new Set();
  for (let p = 0; p < P; p++) if (slabOfPiece[p] >= S - found) crevice.add(slabOfPiece[p]);

  // What each piece and each slab is in the picture.
  const ps = new Float64Array(P * 9), ss = new Float64Array(S * 9), col = new Float64Array(P * 3), shownY = new Float64Array(S * 2);
  for (let i = 0; i < n; i++) {
    const p = plab[i];
    if (p < 0) continue;
    const s = slabOfPiece[p], x = (i % W) + 0.5, y = ((i / W) | 0) + 0.5, Y = Yp[i], shown = kind[i] === 1 ? 1 : 0;
    for (const [arr, o] of [[ps, p * 9], [ss, s * 9]]) { arr[o] += 1; arr[o + 1] += shown; arr[o + 2] += Y; arr[o + 3] += x; arr[o + 4] += y; arr[o + 5] += x * x; arr[o + 6] += y * y; arr[o + 7] += x * y; }
    for (let c = 0; c < 3; c++) col[p * 3 + c] += rgb[i * 3 + c];
    if (shown) { shownY[s * 2] += Y; shownY[s * 2 + 1] += 1; }
  }
  let pieces = [];
  for (let p = 0; p < P; p++) {
    const o = p * 9, A = ps[o];
    pieces.push({ id: p, slab: slabOfPiece[p], area: A, shown: +(ps[o + 1] / A).toFixed(3), at: [+(ps[o + 3] / A).toFixed(2), +(ps[o + 4] / A).toFixed(2)], Y: +(ps[o + 2] / A).toFixed(5), rgb: [0, 1, 2].map((c) => +(col[p * 3 + c] / A).toFixed(5)) });
  }
  const slabsOut = [];
  for (let s = 0; s < S; s++) {
    const o = s * 9, A = ss[o], mx = ss[o + 3] / A, my = ss[o + 4] / A, xx = ss[o + 5] / A - mx * mx, yy = ss[o + 6] / A - my * my, xy = ss[o + 7] / A - mx * my;
    const th = 0.5 * Math.atan2(2 * xy, xx - yy), tr = xx + yy, det = xx * yy - xy * xy, root = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
    slabsOut.push({ id: s, pieces: pieces.filter((q) => q.slab === s).map((q) => q.id), area: A, shown: +(ss[o + 1] / A).toFixed(3), at: [+mx.toFixed(2), +my.toFixed(2)], Y: +(shownY[s * 2 + 1] ? shownY[s * 2] / shownY[s * 2 + 1] : ss[o + 2] / A).toFixed(5), axis: [+Math.cos(th).toFixed(4), +Math.sin(th).toFixed(4)], long: +(2 * Math.sqrt(3 * (tr / 2 + root))).toFixed(1), wide: +(2 * Math.sqrt(3 * Math.max(0, tr / 2 - root))).toFixed(1) });
  }
  classify(slabsOut, plab, slabOfPiece, W, H);
  for (const s of slabsOut) if (crevice.has(s.id)) { s.role = 'gap'; s.crevice = true; }

  // Strata: a great slab that takes the light is cut along its own length by one to three lines, a little turned
  // from it, and each band it is cut into is a layer that stands a little lower than the one before.
  {
    const lines = new Map();
    for (const sl of slabsOut) {
      if ((sl.role !== 'lit' && sl.role !== 'shade') || sl.long < STRATA.long || sl.wide < STRATA.wide || sl.shown < 0.5) continue;
      const cuts = sl.long >= 150 ? 3 : sl.long >= 100 ? 2 : 1, list = [];
      for (let c = 0; c < cuts; c++) {
        const h = (q) => { const v = Math.sin((sl.id * 7 + c) * 91.17 + q * 12.31) * 24634.6345; return v - Math.floor(v); };
        const turn = (h(1) - 0.5) * 2 * STRATA.turn, th = Math.atan2(sl.axis[1], sl.axis[0]) + turn, across = (((c + 1) / (cuts + 1) - 0.5) * 0.9 + (h(2) - 0.5) * 0.12) * sl.wide;
        list.push([sl.at[0] - sl.axis[1] * across, sl.at[1] + sl.axis[0] * across, Math.cos(th), Math.sin(th)]);
      }
      lines.set(sl.id, list);
    }
    const count = new Map(), keyOf = (p, k) => p * 8 + k, layer = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const p = plab[i];
      if (p < 0) continue;
      const list = lines.get(slabOfPiece[p]);
      if (!list) continue;
      const x = (i % W) + 0.5, y = ((i / W) | 0) + 0.5;
      let k = 0;
      for (const [ox, oy, dx, dy] of list) if ((x - ox) * dy - (y - oy) * dx < 0) k++;
      layer[i] = k;
      count.set(keyOf(p, k), (count.get(keyOf(p, k)) ?? 0) + 1);
    }
    // A layer too small to be one goes to the largest layer of its piece.
    const most = new Map();
    for (const [key, c] of count) { const p = Math.floor(key / 8); if (!most.has(p) || c > count.get(keyOf(p, most.get(p)))) most.set(p, key % 8); }
    // Each layer of a piece but its largest gets a label of its own; the largest keeps the piece's.
    const label = new Map(), stratumOf = [], slabOfNew = new Map();
    let next = P;
    for (let i = 0; i < n; i++) {
      if (layer[i] < 0) continue;
      const p = plab[i];
      let k = layer[i];
      if (count.get(keyOf(p, k)) < STRATA.least) k = most.get(p);
      if (k === most.get(p)) { stratumOf[p] = k; continue; }
      const key = keyOf(p, k);
      if (!label.has(key)) { label.set(key, next); stratumOf[next] = k; slabOfNew.set(next, slabOfPiece[p]); next++; }
      plab[i] = label.get(key);
    }
    const mid = plab.slice(), P2 = connected(W, H, plab), slab2 = new Int32Array(P2).fill(-1), strat2 = new Int32Array(P2).fill(-1);
    for (let i = 0; i < n; i++) {
      const q = plab[i];
      if (q < 0 || slab2[q] >= 0) continue;
      const m = mid[i];
      slab2[q] = m < P ? slabOfPiece[m] : slabOfNew.get(m);
      strat2[q] = stratumOf[m] ?? -1;
    }
    P = P2; slabOfPiece = slab2;
    pieces = pieceList(W, H, plab, P, slabOfPiece, Yp, kind, rgb);
    pieces.forEach((pc, q) => { if (strat2[q] >= 0) pc.stratum = strat2[q]; });
    for (const sl of slabsOut) sl.pieces = pieces.filter((q) => q.slab === sl.id).map((q) => q.id);
  }

  const kindOf = (a, b) => (a < 0 || b < 0 || slabOfPiece[a] !== slabOfPiece[b] ? 'slab' : 'piece');
  const tolOf = (a, b) => {
    if ((a >= 0 && crevice.has(slabOfPiece[a])) || (b >= 0 && crevice.has(slabOfPiece[b]))) return TOL.crevice;
    if (a < 0 || b < 0) return TOL.outline;
    return TOL[kindOf(a, b)];
  };
  const chains = outline(W, H, plab, kind, rgb, { tol: tolOf, wobble: (a, b) => (kindOf(a, b) === 'slab' ? 0.4 : 0.2) });
  for (const ch of chains) ch.kind = kindOf(ch.L, ch.R);
  chip(chains, pieces);
  return { W, H, pieces, slabs: slabsOut, chains, plab, slabOfPiece, kind };
}

// Chips knocked out of the edges where two slabs meet: along a long run, every so often, a short stretch of it is
// bent to a point to one side or the other, a small bite out of one slab's edge.
function chip(chains, pieces) {
  const h = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  chains.forEach((ch, c) => {
    if (ch.kind !== 'slab' || ch.L < 0 || ch.R < 0 || ch.closed) return;
    if (pieces[ch.L].area < CHIP.area || pieces[ch.R].area < CHIP.area) return;
    const p = ch.pts, len = [0];
    for (let i = 1; i < p.length; i++) len.push(len[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    const total = len[len.length - 1];
    if (total < CHIP.run) return;
    const at = (t) => { let i = 1; while (i < p.length - 1 && len[i] < t) i++; const k = (t - len[i - 1]) / (len[i] - len[i - 1] || 1); return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k]; };
    const out = [p[0]];
    let t = CHIP.margin + CHIP.every[0] * h(c, 1), last = 0, q = 0;
    while (t + CHIP.wide[1] < total - CHIP.margin) {
      const w = CHIP.wide[0] + (CHIP.wide[1] - CHIP.wide[0]) * h(c, q + 2), a = at(t), b = at(t + w), m = at(t + w * (0.35 + 0.3 * h(c, q + 3)));
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, d = (CHIP.deep[0] + (CHIP.deep[1] - CHIP.deep[0]) * h(c, q + 4)) * (h(c, q + 5) < 0.5 ? -1 : 1);
      for (let i = 0; i < p.length; i++) if (len[i] > last && len[i] < t) out.push(p[i]);
      out.push(a, [m[0] - (dy / l) * d, m[1] + (dx / l) * d], b);
      last = t + w;
      t += w + CHIP.every[0] + (CHIP.every[1] - CHIP.every[0]) * h(c, q + 6);
      q += 7;
    }
    for (let i = 0; i < p.length; i++) if (len[i] > last && i > 0) out.push(p[i]);
    ch.pts = out.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
  });
}

// What each piece is in the picture: its size, how much of it the picture shows, its middle, its brightness and color.
function pieceList(W, H, plab, P, slabOfPiece, Yp, kind, rgb) {
  const n = W * H, ps = new Float64Array(P * 5), col = new Float64Array(P * 3);
  for (let i = 0; i < n; i++) {
    const p = plab[i];
    if (p < 0) continue;
    ps[p * 5] += 1; ps[p * 5 + 1] += kind[i] === 1 ? 1 : 0; ps[p * 5 + 2] += Yp[i]; ps[p * 5 + 3] += (i % W) + 0.5; ps[p * 5 + 4] += ((i / W) | 0) + 0.5;
    for (let c = 0; c < 3; c++) col[p * 3 + c] += rgb[i * 3 + c];
  }
  const out = [];
  for (let p = 0; p < P; p++) {
    const o = p * 5, A = ps[o];
    out.push({ id: p, slab: slabOfPiece[p], area: A, shown: +(ps[o + 1] / A).toFixed(3), at: [+(ps[o + 3] / A).toFixed(2), +(ps[o + 4] / A).toFixed(2)], Y: +(ps[o + 2] / A).toFixed(5), rgb: [0, 1, 2].map((c) => +(col[p * 3 + c] / A).toFixed(5)) });
  }
  return out;
}

// Finds the crevices and gives each a label of its own, from `first` on. Returns how many.
function crevices(W, H, plab, slabOfPiece, Yp, kind, first) {
  const n = W * H, dist = new Uint8Array(n).fill(255), q = [];
  const slabAt = (i) => (plab[i] >= 0 ? slabOfPiece[plab[i]] : -1);
  for (let i = W; i < n - W; i++) {
    const s = slabAt(i);
    if (s < 0) continue;
    for (const j of [i - 1, i + 1, i - W, i + W]) { const t = slabAt(j); if (t >= 0 && t !== s) { dist[i] = 0; q.push(i); break; } }
  }
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    if (dist[i] >= CREVICE.near) continue;
    for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < n && plab[j] >= 0 && dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; q.push(j); }
  }
  // The rock's mean brightness round each pixel.
  const sum = new Float64Array((W + 1) * (H + 1)), cnt = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = x + y * W, o = x + 1 + (y + 1) * (W + 1), r = plab[i] >= 0 && kind[i] === 1 ? 1 : 0;
    sum[o] = sum[o - 1] + sum[o - W - 1] - sum[o - W - 2] + r * Yp[i];
    cnt[o] = cnt[o - 1] + cnt[o - W - 1] - cnt[o - W - 2] + r;
  }
  const box = (a, x, y) => { const R = CREVICE.round, x0 = Math.max(0, x - R), x1 = Math.min(W, x + R + 1), y0 = Math.max(0, y - R), y1 = Math.min(H, y + R + 1); return a[x1 + y1 * (W + 1)] - a[x0 + y1 * (W + 1)] - a[x1 + y0 * (W + 1)] + a[x0 + y0 * (W + 1)]; };
  const cand = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (plab[i] < 0 || kind[i] !== 1 || dist[i] > CREVICE.near || Yp[i] > CREVICE.dark) continue;
    const x = i % W, y = (i / W) | 0, mean = box(sum, x, y) / Math.max(1, box(cnt, x, y));
    if (Yp[i] < CREVICE.share * mean && mean > CREVICE.lit) cand[i] = 1;
  }
  let made = 0;
  const seen = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!cand[i] || seen[i]) continue;
    const list = [i];
    seen[i] = 1;
    for (let h = 0; h < list.length; h++) for (const j of [list[h] - 1, list[h] + 1, list[h] - W, list[h] + W]) if (j >= 0 && j < n && cand[j] && !seen[j]) { seen[j] = 1; list.push(j); }
    if (list.length < CREVICE.least || list.length > CREVICE.most) continue;
    for (const j of list) plab[j] = first + made;
    made++;
  }
  return made;
}

// Each slab's role, from how bright it is against the slabs round it and where it is: the heavy masses at each side
// and the roof's front face are the frame; a slab far darker than those round it and not large is a gap; a dark slab
// inside the frame is turned from the core; the rest take its light.
export function classify(slabs, plab, slabOfPiece, W, H) {
  const S = slabs.length, nb = Array.from({ length: S }, () => new Map());
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
    const a = plab[x + y * W];
    if (a < 0) continue;
    for (const b of [plab[x + 1 + y * W], plab[x + (y + 1) * W]]) {
      if (b < 0) continue;
      const sa = slabOfPiece[a], sb = slabOfPiece[b];
      if (sa === sb) continue;
      nb[sa].set(sb, (nb[sa].get(sb) ?? 0) + 1); nb[sb].set(sa, (nb[sb].get(sa) ?? 0) + 1);
    }
  }
  for (const s of slabs) {
    let sum = 0, w = 0;
    for (const [o, len] of nb[s.id]) { sum += slabs[o].Y * len; w += len; }
    s.round = w ? sum / w : s.Y;
    s.nb = [...nb[s.id].keys()];
    const [px, py] = s.at, rho = Math.hypot(px - CORE.at[0], (py - CORE.at[1]) * 1.1);
    const outer = px < 478 || px > 905 || py < 330 + 0.0006 * (px - 688) ** 2;
    if (s.shown > 0.4 && s.Y < 0.3 * s.round && s.area < 2500 && !outer) s.role = 'gap';
    else if (outer && s.Y < 0.04) s.role = 'frame';
    else if (s.Y < 0.03 && rho > 120) s.role = 'shade';
    else s.role = 'lit';
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = performance.now(), r = await slabs();
  const roles = {};
  for (const s of r.slabs) roles[s.role] = (roles[s.role] ?? 0) + 1;
  console.log(`pieces ${r.pieces.length}, slabs ${r.slabs.length} (${Object.entries(roles).map(([k, v]) => `${v} ${k}`).join(', ')}), runs ${r.chains.length}, ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  fs.mkdirSync(new URL('./measured/', import.meta.url).pathname, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ pieces: r.pieces, slabs: r.slabs.map(({ nb, round, ...s }) => s), chains: r.chains }));
  // A preview: each piece its mean color, slab outlines bright, piece outlines dim; a gap is tinted, the frame darkened.
  const { W, H, plab, pieces, slabs: sl } = r, scale = 3, x0 = 240, y0 = 250, w = 860, h = 480, big = new Uint8Array(w * scale * h * scale * 3);
  for (let y = 0; y < h * scale; y++) for (let x = 0; x < w * scale; x++) {
    const i = x0 + Math.floor(x / scale) + (y0 + Math.floor(y / scale)) * W, p = plab[i], o2 = (x + y * w * scale) * 3;
    if (p < 0) { big[o2] = 20; big[o2 + 1] = 30; big[o2 + 2] = p === AIR ? 70 : 20; continue; }
    const role = sl[pieces[p].slab].role, c = pieces[p].rgb.map((v) => 255 * toSRGB(v));
    const t = role === 'gap' ? [120, 0, 120] : role === 'frame' ? [0, 60, 90] : role === 'shade' ? [0, 90, 40] : null;
    for (let q = 0; q < 3; q++) big[o2 + q] = t ? Math.round(0.6 * c[q] + 0.4 * t[q]) : Math.round(c[q]);
  }
  for (const ch of r.chains) for (let i = 1; i < ch.pts.length; i++) {
    const [ax, ay] = ch.pts[i - 1], [bx, by] = ch.pts[i], k2 = Math.ceil(Math.hypot(bx - ax, by - ay) * scale * 2) + 1, c = ch.kind === 'slab' ? [255, 230, 140] : [140, 110, 80];
    for (let j = 0; j <= k2; j++) { const x = Math.round((ax + ((bx - ax) * j) / k2 - x0) * scale), y = Math.round((ay + ((by - ay) * j) / k2 - y0) * scale); if (x < 0 || y < 0 || x >= w * scale || y >= h * scale) continue; const o2 = (x + y * w * scale) * 3; big[o2] = c[0]; big[o2 + 1] = c[1]; big[o2 + 2] = c[2]; }
  }
  await sharp(Buffer.from(big), { raw: { width: w * scale, height: h * scale, channels: 3 } }).jpeg({ quality: 88 }).toFile('shots/world/rock-r/r2-slabs.jpg');
}
