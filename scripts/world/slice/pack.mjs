// The slice's hollow as the pictures the page lights (src/pieces/world/parts/rock/pictured.ts), from what the ray
// caster kept:
//   node scripts/world/slice/hollow.mjs --ppu 2.5 --win -672,-196,1344,500 --hemi 2 --line 2 --out shots/slice/bake.png
//   node scripts/world/slice/pack.mjs [--from shots/slice/bake.trace] [--calm 4] [--soft 3] [--out public/world]
// The window and the scale are PICTURED's (the layout): a trace of any other is refused.
//
// Four pictures, named in PICTURED.files. Each number is a byte, and a picture's fourth is its alpha:
//   tone    half size   the stone under white light (square roots), and how open the place is
//   form    full size   the face's normal across and up the view (the third is worked out from them), the share of the
//                       core's light the place takes (square root), and how much of the pixel is rock
//   bounce  half size   light that has bounced, as the square root of its share of LIGHT.bounce, and the share of the
//                       moon seen (kept, and not read by the page: the hollow is lit without the moon)
//   depth   full size   how far toward the visitor, in sixteen bits over PICTURED.depth (two bytes), the share of the
//                       stream's line seen, and nothing
// The page reads them as numbers and never as colors, by its own reader (parts/rock/pictured.ts): a browser's picture
// reader may weigh a color by its alpha, which would spoil all four.
//
// What is done to the trace on the way:
//   - Where the planet's skin or its land is in front of the rock, the depth is the furthest there is, so the live
//     skin and land always win there: the rock lies a hair behind them, and a stored depth is not fine enough for
//     that. The same for a scrap of rock in front of the skin that is no part of the hollow.
//   - Rock further than a few pixels from any that is seen first is left out: nothing of it can show.
//   - Light that came by many paths (bounced, how open, the stream's line) is smoothed across a face and never across
//     an edge: it was cast with few rays. So is the share of the core's ball a place sees, less widely.
//   - Every number is carried a few pixels out past the rock's edge, so that a pixel at the edge is not mixed with
//     nothing.
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { load } from './store.mjs';
import { read } from './read.mjs';
import { EYE, through, toward } from './view.mjs';
import { build, closest } from '../lib/bvh.mjs';
import { L } from '../lib/plan.mjs';
import { noise } from './stone.mjs';

const arg = (name, usual) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? usual : process.argv[i + 1]; };
const from = arg('from', 'shots/slice/bake.trace'), out = arg('out', 'public/world'), R = Number(arg('calm', 4)), SOFT = Number(arg('soft', 3));
const KEEP = 6, CARRY = 8, PLANE = 1.5;

const t0 = performance.now(), t = load(from), { W, H } = t, N = W * H, P = L.PICTURED;
const [cx, cy] = L.drawn(...L.CORE.at);
const want = { x: L.HOST.wide / 2 + cx + P.window[0], y: cy + P.window[1], w: P.window[2], h: P.window[3], ppu: P.ppu };
for (const k of Object.keys(want)) if (Math.abs(want[k] - t.window[k]) > 1e-6) throw new Error(`pack: the trace's window (${k} ${t.window[k]}) is not PICTURED's (${want[k]}). Cast it again with --win ${P.window.join(',')} --ppu ${P.ppu}`);
if (W % 2 || H % 2) throw new Error('pack: the pictures are halved, so their size must be even');

const E = L.VIEW.el * L.D2R, SE = Math.sin(E), CE = Math.cos(E), BACK = toward(...EYE);
const [FAR, NEAR] = P.depth;

// Before anything else, two things the cast cannot give, since its blocks have straight edges.
//
// Worn edges. A place that stands out toward the visitor from the rock round it is an edge or a corner, and what
// lies back from it is a crease. An edge takes more of the core's light and its stone is paler, in broken runs and
// not one line; a crease takes less.
//   round   over how many units round a place it is measured        most   no neighbor counts for more than this
//   over    standing so far out (or back) is an edge (or a crease) in full
//   lit, crease   how much more of the core's light an edge takes, and how much less a crease
//   pale    how much paler an edge's stone is, for red, green and blue     broken  how far across a break in the run
//           is, the least an edge keeps, and how much more it has between breaks
const WEAR = { round: Number(arg('wear', 3.5)), most: 2, over: 0.8, lit: 0.6, crease: 0.35, pale: [0.35, 0.37, 0.4], broken: [5, 0.35, 1.3] };
// Ragged outlines. Near an edge (within `reach` units) each pixel is taken from a place a little way off (`by`
// units at the most, in runs `across` units long with sharp turns in them), so no edge is ruled. Away from any edge
// nothing moves: a face's own marks stay straight.
const RAG = { by: Number(arg('rag', 1.8)), across: 14, reach: 2.2, apart: 1.2, turned: 0.92 };
{
  const rock = (i) => t.cover[i] > 0.5, d = [0, 0, 0];
  if (WEAR.round > 0) {
    const r = Math.round(WEAR.round * want.ppu), offs = [], out = new Float32Array(N);
    for (let dy = -r; dy <= r; dy += 2) for (let dx = -r; dx <= r; dx += 2) if (dx * dx + dy * dy <= r * r) offs.push(dx, dy);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!rock(i)) continue;
      let sum = 0, n = 0;
      for (let k = 0; k < offs.length; k += 2) {
        const xx = x + offs[k], yy = y + offs[k + 1];
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        sum += rock(j) ? Math.max(-WEAR.most, Math.min(WEAR.most, t.depth[i] - t.depth[j])) : WEAR.most;
        n++;
      }
      out[i] = sum / n;
    }
    const lit = Float32Array.from(t.lit), albedo = Float32Array.from(t.albedo);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!rock(i) || !out[i]) continue;
      through(want.x + (x + 0.5) / want.ppu, want.y + (y + 0.5) / want.ppu, d);
      const far = (t.depth[i] - BACK) / (d[1] * SE + d[2] * CE), B = WEAR.broken;
      const run = B[1] + B[2] * noise((EYE[0] + d[0] * far) / B[0], (EYE[1] + d[1] * far) / B[0], (EYE[2] + d[2] * far) / B[0], 81);
      const edge = Math.min(1, Math.max(0, out[i] / WEAR.over)) * run, crease = Math.min(1, Math.max(0, -out[i] / WEAR.over));
      lit[i] *= (1 + WEAR.lit * edge) * (1 - WEAR.crease * crease);
      for (let q = 0; q < 3; q++) albedo[i * 3 + q] *= 1 + WEAR.pale[q] * edge;
    }
    t.lit = lit; t.albedo = albedo;
  }
  if (RAG.by > 0) {
    // Where an edge is: where the rock steps toward or away from the visitor, turns, or ends.
    let near = new Float32Array(N);
    const f = t.face, z = t.depth;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      for (const j of [x + 1 < W ? i + 1 : -1, y + 1 < H ? i + W : -1]) {
        if (j < 0) continue;
        if (rock(i) !== rock(j) || (rock(i) && (Math.abs(z[i] - z[j]) > RAG.apart || f[i * 3] * f[j * 3] + f[i * 3 + 1] * f[j * 3 + 1] + f[i * 3 + 2] * f[j * 3 + 2] < RAG.turned))) near[i] = near[j] = 1;
      }
    }
    // Carried out to its reach, and let fall away softly.
    const r = Math.round(RAG.reach * want.ppu);
    for (const [pass, most] of [[0, true], [1, true], [0, false], [1, false], [0, false], [1, false]]) {
      const o = new Float32Array(N), k = most ? r : Math.max(1, Math.round(r / 2));
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let v = 0, n = 0;
        for (let q = -k; q <= k; q++) {
          const xx = pass ? x : x + q, yy = pass ? y + q : y;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const w = near[yy * W + xx];
          if (most) v = Math.max(v, w); else { v += w; n++; }
        }
        o[y * W + x] = most ? v : v / n;
      }
      near = o;
    }
    // Where each pixel is taken from: a way that turns sharply, so an edge gets notches and not waves.
    const sx = new Float32Array(N), sy = new Float32Array(N), A = RAG.across;
    const way = (hx, hy, s) => 2 * (noise(hx / A + s * 17.3, hy / A, 0.5, 71 + s) - 0.5) + 0.9 * (2 * Math.abs(noise(hx / (A * 0.45) + s * 17.3, hy / (A * 0.45), 0.5, 73 + s) - 0.5) - 0.5) + 0.5 * (noise(hx / (A * 0.2) + s * 17.3, hy / (A * 0.2), 0.5, 75 + s) - 0.5);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, e = near[i];
      if (!(e > 0)) { sx[i] = x; sy[i] = y; continue; }
      const hx = want.x + (x + 0.5) / want.ppu, hy = want.y + (y + 0.5) / want.ppu;
      sx[i] = Math.min(W - 1, Math.max(0, x + RAG.by * e * way(hx, hy, 0) * want.ppu));
      sy[i] = Math.min(H - 1, Math.max(0, y + RAG.by * e * way(hx, hy, 1) * want.ppu));
    }
    // Each number is the mean over the rock in the four pixels round that place, as the cast's own are over a pixel.
    const cover = t.cover, weigh = new Float32Array(N * 4), took = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x0 = Math.min(W - 2, Math.floor(sx[i])), y0 = Math.min(H - 2, Math.floor(sy[i])), u = sx[i] - x0, v = sy[i] - y0, j = y0 * W + x0;
      const a = (1 - u) * (1 - v) * cover[j], b = u * (1 - v) * cover[j + 1], c = (1 - u) * v * cover[j + W], e = u * v * cover[j + W + 1];
      weigh[i * 4] = a; weigh[i * 4 + 1] = b; weigh[i * 4 + 2] = c; weigh[i * 4 + 3] = e;
      took[i] = a + b + c + e;
    }
    for (const name of ['depth', 'normal', 'face', 'core', 'open', 'bounce', 'moon', 'line', 'tone', 'albedo', 'lit', 'near']) {
      const from = t[name];
      if (!from) continue;
      const n = from.length / N, to = new Float32Array(from.length), unit = name === 'normal' || name === 'face';
      for (let i = 0; i < N; i++) {
        if (!(took[i] > 0)) continue;
        const j = Math.min(H - 2, Math.floor(sy[i])) * W + Math.min(W - 2, Math.floor(sx[i]));
        for (let q = 0; q < n; q++) to[i * n + q] = (from[j * n + q] * weigh[i * 4] + from[(j + 1) * n + q] * weigh[i * 4 + 1] + from[(j + W) * n + q] * weigh[i * 4 + 2] + from[(j + W + 1) * n + q] * weigh[i * 4 + 3]) / took[i];
        if (unit) { const l = Math.hypot(to[i * 3], to[i * 3 + 1], to[i * 3 + 2]) || 1; to[i * 3] /= l; to[i * 3 + 1] /= l; to[i * 3 + 2] /= l; }
      }
      t[name] = to;
    }
    t.cover = took;
  }
}

// Where each pixel's rock is, and whether it is seen before the planet's skin and its land.
const skin = read('public/world/skin.bin').meshes.get('skin'), land = read('public/world/land.bin').meshes.get('ground');
const positions = new Float32Array(skin.positions.length + land.positions.length), indices = new Uint32Array(skin.indices.length + land.indices.length);
positions.set(skin.positions); positions.set(land.positions, skin.positions.length);
indices.set(skin.indices);
for (let i = 0, o = skin.positions.length / 3; i < land.indices.length; i++) indices[skin.indices.length + i] = land.indices[i] + o;
const bvh = build(positions, indices), hit = new Float64Array(4), d = [0, 0, 0];
const place = new Float32Array(N * 3), has = new Uint8Array(N), first = new Uint8Array(N);
let least = Infinity, most = -Infinity;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  if (!(t.cover[i] > 0)) continue;
  has[i] = 1;
  through(want.x + (x + 0.5) / want.ppu, want.y + (y + 0.5) / want.ppu, d);
  const far = (t.depth[i] - BACK) / (d[1] * SE + d[2] * CE);
  place[i * 3] = EYE[0] + d[0] * far; place[i * 3 + 1] = EYE[1] + d[1] * far; place[i * 3 + 2] = EYE[2] + d[2] * far;
  const tri = closest(bvh, EYE[0], EYE[1], EYE[2], d[0], d[1], d[2], 1e9, hit);
  if (tri < 0 || far < hit[0]) { first[i] = 1; least = Math.min(least, t.depth[i]); most = Math.max(most, t.depth[i]); }
}
if (least < FAR + 1 || most > NEAR - 1) throw new Error(`pack: the rock runs from ${least.toFixed(1)} to ${most.toFixed(1)} toward the visitor, outside PICTURED.depth`);

// The rock seen first, in pieces that touch: the largest is the hollow.
const label = new Int32Array(N), stack = new Int32Array(N);
let pieces = 0, main = 0, mainSize = 0;
for (let s = 0; s < N; s++) {
  if (!first[s] || label[s]) continue;
  let n = 0, size = 0;
  label[s] = ++pieces; stack[n++] = s;
  while (n) {
    const i = stack[--n], x = i % W;
    size++;
    if (x > 0 && first[i - 1] && !label[i - 1]) { label[i - 1] = pieces; stack[n++] = i - 1; }
    if (x < W - 1 && first[i + 1] && !label[i + 1]) { label[i + 1] = pieces; stack[n++] = i + 1; }
    if (i >= W && first[i - W] && !label[i - W]) { label[i - W] = pieces; stack[n++] = i - W; }
    if (i < N - W && first[i + W] && !label[i + W]) { label[i + W] = pieces; stack[n++] = i + W; }
  }
  if (size > mainSize) { mainSize = size; main = pieces; }
}
const core = Math.round((-P.window[1]) * P.ppu) * W + Math.round((-P.window[0]) * P.ppu);
if (label[core] !== main) throw new Error('pack: the largest piece of rock seen first is not the one behind the core');

// Wider by so many pixels, each way.
function spread(mask, r) {
  const a = new Uint8Array(N), b = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = Math.max(0, x - r); k <= Math.min(W - 1, x + r) && !v; k++) v = mask[y * W + k]; a[y * W + x] = v; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = Math.max(0, y - r); k <= Math.min(H - 1, y + r) && !v; k++) v = a[k * W + x]; b[y * W + x] = v; }
  return b;
}
const shown = spread(first, KEEP);

// Smoothed across a face, never across an edge: a neighbor counts by how nearly its face is turned the same way and
// how near it lies to this face's own plane.
function calm(list, r, passes) {
  const G = Array.from({ length: 2 * r + 1 }, (_, k) => Math.exp(-((k - r) ** 2) / (2 * (r * 0.7) ** 2))), f = t.face;
  let a = list.map((v) => v);
  for (let p = 0; p < passes; p++) for (const [sx, sy] of [[1, 0], [0, 1]]) {
    const b = a.map((v) => new Float32Array(v.length));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!has[i]) continue;
      let w = 0;
      const acc = [0, 0, 0, 0, 0, 0, 0, 0];
      for (let k = -r; k <= r; k++) {
        const xx = x + k * sx, yy = y + k * sy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (!has[j]) continue;
        const dn = f[i * 3] * f[j * 3] + f[i * 3 + 1] * f[j * 3 + 1] + f[i * 3 + 2] * f[j * 3 + 2];
        if (dn <= 0) continue;
        const d8 = (dn * dn) ** 4, off = (place[j * 3] - place[i * 3]) * f[i * 3] + (place[j * 3 + 1] - place[i * 3 + 1]) * f[i * 3 + 1] + (place[j * 3 + 2] - place[i * 3 + 2]) * f[i * 3 + 2];
        const wk = G[k + r] * d8 * d8 * d8 * Math.exp(-Math.abs(off) / PLANE);
        w += wk;
        let c = 0;
        for (const v of a) { const n = v.length / N; for (let q = 0; q < n; q++) acc[c++] += v[j * n + q] * wk; }
      }
      let c = 0;
      for (const v of b) { const n = v.length / N; for (let q = 0; q < n; q++) v[i * n + q] = acc[c++] / w; }
    }
    a = b;
  }
  return a;
}
const [open, bounce, line] = R > 0 ? calm([t.open, t.bounce, t.line], R, 2) : [t.open, t.bounce, t.line];
// The core's own light: only the share of the ball seen was cast with few rays, and at the soft edge of a shadow it
// is grain. That share is smoothed, and the rest of the light (how the face is turned, how far it is) is left as
// fine as it was cast.
const lit = Float32Array.from(t.lit);
if (SOFT > 0) {
  const [share, even] = calm([t.core, t.lit], SOFT, 1);
  for (let i = 0; i < N; i++) if (has[i]) lit[i] = t.core[i] > 0.02 ? (t.lit[i] / t.core[i]) * share[i] : even[i];
}

// Carried out past the rock's edge, so many pixels: a pixel with no rock takes the mean of its neighbors that have.
function carry(data, n, ok, w, h, reach) {
  let live = ok;
  for (let p = 0; p < reach; p++) {
    const next = Uint8Array.from(live);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (live[i]) continue;
      let c = 0;
      const acc = [0, 0, 0, 0];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h || !live[yy * w + xx]) continue;
        c++;
        for (let q = 0; q < n; q++) acc[q] += data[(yy * w + xx) * n + q];
      }
      if (!c) continue;
      for (let q = 0; q < n; q++) data[i * n + q] = acc[q] / c;
      next[i] = 1;
    }
    live = next;
  }
}
// Half the size: each pixel the mean of the four it covers that have rock.
function half(data, n) {
  const w = W / 2, h = H / 2, o = new Float32Array(w * h * n), ok = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = 0;
    for (const j of [2 * y * W + 2 * x, 2 * y * W + 2 * x + 1, (2 * y + 1) * W + 2 * x, (2 * y + 1) * W + 2 * x + 1]) {
      if (!has[j]) continue;
      c++;
      for (let q = 0; q < n; q++) o[(y * w + x) * n + q] += data[j * n + q];
    }
    if (c) { ok[y * w + x] = 1; for (let q = 0; q < n; q++) o[(y * w + x) * n + q] /= c; }
  }
  carry(o, n, ok, w, h, CARRY / 2);
  return o;
}

// A PNG with each row stored the way that leaves it smallest, which the page's own reader undoes.
function png(file, w, h, data) {
  const row = w * 4, raw = Buffer.alloc((row + 1) * h), none = new Uint8Array(row), tries = [0, 1, 2, 3, 4].map(() => new Uint8Array(row));
  for (let y = 0; y < h; y++) {
    const cur = data.subarray(y * row, (y + 1) * row), up = y ? data.subarray((y - 1) * row, y * row) : none, sums = [0, 0, 0, 0, 0];
    for (let i = 0; i < row; i++) {
      const a = i >= 4 ? cur[i - 4] : 0, b = up[i], c = i >= 4 ? up[i - 4] : 0, v = cur[i];
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c), pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      const got = [v, v - a, v - b, v - ((a + b) >> 1), v - pr];
      for (let k = 0; k < 5; k++) { const e = got[k] & 255; tries[k][i] = e; sums[k] += e < 128 ? e : 256 - e; }
    }
    const best = sums.indexOf(Math.min(...sums));
    raw[y * (row + 1)] = best;
    raw.set(tries[best], y * (row + 1) + 1);
  }
  const chunk = (type, body) => {
    const o = Buffer.alloc(body.length + 12);
    o.writeUInt32BE(body.length, 0);
    o.write(type, 4, 'latin1');
    body.copy(o, 8);
    o.writeUInt32BE(crc32(o.subarray(4, body.length + 8)), body.length + 8);
    return o;
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 6;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
  const size = statSync(file).size;
  console.log(`png: ${file} · ${w} x ${h} · ${(size / 1048576).toFixed(2)} MB`);
  return size;
}
const byte = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
const root = (v) => byte(Math.sqrt(Math.max(0, v)));

mkdirSync(out, { recursive: true });
let total = 0;
{
  const w = W / 2, h = H / 2, a = half(t.albedo, 3), o = half(open, 1), px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { px[i * 4] = root(a[i * 3]); px[i * 4 + 1] = root(a[i * 3 + 1]); px[i * 4 + 2] = root(a[i * 3 + 2]); px[i * 4 + 3] = byte(o[i]); }
  total += png(`${out}/${P.files.tone}`, w, h, px);
}
{
  const n = Float32Array.from(t.normal), l = lit, px = new Uint8Array(N * 4);
  carry(n, 3, has, W, H, CARRY);
  carry(l, 1, has, W, H, CARRY);
  for (let i = 0; i < N; i++) {
    let x = n[i * 3], y = n[i * 3 + 1] * CE - n[i * 3 + 2] * SE;
    const z = n[i * 3 + 1] * SE + n[i * 3 + 2] * CE, len = Math.hypot(x, y, Math.max(0, z)) || 1;
    x /= len; y /= len;
    px[i * 4] = byte(x * 0.5 + 0.5); px[i * 4 + 1] = byte(y * 0.5 + 0.5); px[i * 4 + 2] = root(l[i]); px[i * 4 + 3] = shown[i] ? byte(t.cover[i]) : 0;
  }
  total += png(`${out}/${P.files.form}`, W, H, px);
}
{
  const w = W / 2, h = H / 2, b = half(bounce, 3), m = half(t.moon, 1), px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { for (let q = 0; q < 3; q++) px[i * 4 + q] = root(b[i * 3 + q] / L.LIGHT.bounce); px[i * 4 + 3] = byte(m[i]); }
  total += png(`${out}/${P.files.bounce}`, w, h, px);
}
{
  const z = new Float32Array(N), s = Float32Array.from(line), px = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) z[i] = has[i] && label[i] === main ? t.depth[i] : FAR;
  carry(z, 1, has, W, H, CARRY);
  carry(s, 1, has, W, H, CARRY);
  for (let i = 0; i < N; i++) {
    const v = Math.max(0, Math.min(65535, Math.round(((z[i] - FAR) / (NEAR - FAR)) * 65535)));
    px[i * 4] = v >> 8; px[i * 4 + 1] = v & 255; px[i * 4 + 2] = byte(s[i]); px[i * 4 + 3] = 255;
  }
  total += png(`${out}/${P.files.depth}`, W, H, px);
}
let seen = 0, kept = 0;
for (let i = 0; i < N; i++) { seen += first[i]; kept += shown[i] && has[i] ? 1 : 0; }
console.log(`pack: ${W} x ${H} · rock seen first in ${((seen / N) * 100).toFixed(1)}% of it, ${pieces} pieces, the hollow ${((mainSize / N) * 100).toFixed(1)}% · kept ${((kept / N) * 100).toFixed(1)}% · depth ${least.toFixed(1)} to ${most.toFixed(1)} · ${(total / 1048576).toFixed(2)} MB in four files · ${((performance.now() - t0) / 1000).toFixed(1)} s`);
