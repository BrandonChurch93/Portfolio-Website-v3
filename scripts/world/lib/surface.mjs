// The surface maker: turns a field (under 0 inside the rock, over 0 outside, near a distance by the surface) into a
// welded triangle mesh that keeps flat faces flat and sharp edges sharp, and reduces such a mesh.
//
//   const mesh = await surface({ module: '/abs/rock-field.mjs', args, box: [[x0, y0, z0], [x1, y1, z1]], cell: 2 })
//   const small = await simplify(mesh, { error: 0.05 })
//
// The field's module exports field(x, y, z), and may export async setup(args), awaited once in each worker, and lip,
// the most the field changes per unit (1.5 if not given). Under 0 is inside, and 0 itself counts as outside.
// It is dual contouring on a uniform grid with a vertex for each sheet of surface in a cell, worked out in slabs
// across worker threads. A vertex goes where the planes through its cell's crossings meet, up to margin cells outside
// its cell (half a cell unless given): that is what keeps a corner whose point lies just over a cell wall sharp.
// Returns { positions, indices, stats }, stats counting how each vertex and quad was made. check-surface.mjs proves it.
import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { pathToFileURL } from 'node:url';
import { MeshoptSimplifier } from 'three/examples/jsm/libs/meshopt_simplifier.module.js';
import { Table, uncap, closest, incident, bounds, toTriangle } from './mesh.mjs';

export const BLOCK = 8;
export const SLABS = 96;
export const CUT = 1e-3;
export const MARGIN = 1;
export const ROOT = 48;
export const EXACT = 1e-12;
export const STEP = 1e-5;
export const AGREE = 1e-3;
export const BESIDE = 4;
export const SHIFT = 0.3090169943749474;
export const SNUG = 1e-3;
export const GAP = 1e-4;
export const CLOSE = 1e-3;
export const ROUNDS = 12;
export const FLAT = 1e-9;
export const HOLD = 8;
export const SAMPLES = 12;
export const SAME = Math.cos((2 * Math.PI) / 180);
export const APART = Math.sin((5 * Math.PI) / 180);

const asURL = (m) => (String(m).startsWith('file:') ? String(m) : pathToFileURL(String(m)).href);

export async function surface({ module, args, box, cell, threads, onProgress, margin = MARGIN }) {
  if (!(cell > 0)) throw new Error('surface: cell must be over 0');
  const origin = box[0].map((v) => v - SHIFT * cell);
  const nc = [0, 1, 2].map((a) => Math.max(1, Math.ceil((box[1][a] - origin[a]) / cell - 1e-9)));
  const nbx = Math.ceil(nc[0] / BLOCK);
  const slabWidth = Math.max(1, Math.ceil(nbx / SLABS));
  const slabs = Math.ceil(nbx / slabWidth);
  const count = Math.max(1, Math.min(threads ?? availableParallelism(), slabs));
  const data = {
    module: asURL(module), args, origin, cell, nc, B: BLOCK, slabWidth,
    cut: CUT, margin: margin * cell, gap: GAP * cell + 2e-7 * Math.max(...box.flat().map(Math.abs)), root: ROOT, exact: EXACT * cell, step: STEP * cell, agree: AGREE, beside: BESIDE * STEP * cell,
    snug: SNUG, same: SAME, apart: APART,
  };
  const t0 = performance.now();
  const results = new Array(slabs);
  let next = 0, finished = 0, lip = 1.5;
  await new Promise((resolve, reject) => {
    const workers = [];
    let failed = false;
    const stop = (err) => { if (failed) return; failed = true; workers.forEach((w) => w.terminate()); reject(err); };
    for (let t = 0; t < count; t++) {
      const w = new Worker(new URL('./surface-worker.mjs', import.meta.url), { workerData: data });
      workers.push(w);
      const give = () => { if (next < slabs) w.postMessage({ slab: next++ }); };
      w.on('message', (m) => {
        if (m.ready) { lip = m.lip; give(); return; }
        results[m.slab] = m;
        finished++;
        onProgress?.({ phase: 'grid', done: finished, total: slabs });
        if (finished === slabs) { workers.forEach((x) => x.terminate()); resolve(); } else give();
      });
      w.on('error', stop);
      w.on('exit', (code) => { if (code !== 0 && finished < slabs) stop(new Error(`surface: a worker stopped with ${code}`)); });
    }
  });
  const t1 = performance.now();

  let cells = 0, verts = 0, edges = 0, evals = 0, solved = 0, featured = 0, held = 0, settled = 0;
  for (const r of results) { cells += r.cells.length; verts += r.pos.length / 3; edges += r.edges.length; evals += r.evals; solved += r.solved; featured += r.featured; held += r.held; settled += r.settled; }
  const pos = new Float64Array(verts * 3 + 3);
  const table = new Table(cells);
  const first = new Int32Array(cells), packed = new Uint32Array(cells);
  const home = new Float64Array(verts);
  let cv = 0, vv = 0;
  for (const r of results) {
    pos.set(r.pos, vv * 3);
    const nv = r.pos.length / 3;
    for (let i = 0; i < r.cells.length; i++) {
      table.set(r.cells[i], cv);
      first[cv] = r.first[i] + vv;
      packed[cv] = r.packed[i];
      for (let v = r.first[i], e = i + 1 < r.cells.length ? r.first[i + 1] : nv; v < e; v++) home[v + vv] = r.cells[i];
      cv++;
    }
    vv += nv;
  }

  const np = [nc[0] + 1, nc[1] + 1];
  const quads = new Int32Array(edges * 4), herm = new Float64Array(edges * 6), along = new Int8Array(edges);
  let nq = 0, missing = 0;
  const OFF = [[1, 1], [0, 1], [0, 0], [1, 0]];
  for (const r of results) {
    for (let e = 0; e < r.edges.length; e++) {
      const p = r.edges[e], kind = r.kinds[e];
      const a = kind & 3, inside = (kind & 4) !== 0;
      const g = [p % np[0], Math.floor(p / np[0]) % np[1], Math.floor(p / (np[0] * np[1]))];
      const b = (a + 1) % 3, c = (a + 2) % 3;
      let ok = true;
      for (let s = 0; s < 4; s++) {
        const [db, dc] = OFF[s];
        const m = [g[0], g[1], g[2]];
        m[b] -= db; m[c] -= dc;
        const id = table.get(m[0] + nc[0] * (m[1] + nc[1] * m[2]));
        if (id < 0) { ok = false; break; }
        quads[nq * 4 + (inside ? s : (4 - s) % 4)] = first[id] + ((packed[id] >>> (2 * (a * 4 + db + 2 * dc))) & 3);
      }
      if (!ok) { missing++; continue; }
      herm.set(r.hermite.subarray(e * 6, e * 6 + 6), nq * 6);
      along[nq] = inside ? a + 1 : -(a + 1);
      nq++;
    }
  }

  const alt = new Float64Array(verts * 3).fill(NaN), good = new Uint8Array(verts);
  vv = 0;
  for (const r of results) {
    for (let i = 0; i < r.alt.length; i += 5) { alt.set(r.alt.subarray(i + 1, i + 4), (r.alt[i] + vv) * 3); good[r.alt[i] + vv] = r.alt[i + 4]; }
    vv += r.pos.length / 3;
  }
  const yielded = outside(pos, alt, home, table, first, origin, cell, nc);
  const keep = (arr) => { for (let i = 0; i < verts * 3; i++) if (!Number.isNaN(arr[i])) arr[i] = Math.min(box[1][i % 3], Math.max(box[0][i % 3], arr[i])); };
  keep(pos);
  keep(alt);
  let made, moved = 0, crossed = 0, judge = null, stirred = null, again = false;
  const dirty = new Uint8Array(verts), join = joiner(pos, verts, quads, herm, along, nq, cell);
  for (let round = 0; ; round++) {
    made = join(judge, stirred, again);
    again = false;
    if (made.wrong.length && !judge) {
      const mod = await import(asURL(module));
      if (mod.setup) await mod.setup(args);
      judge = mod.field;
      stirred = new Uint8Array(verts);
      again = true;
      round--;
      continue;
    }
    const groups = made.wrong.map((q) => quads.subarray(q * 4, q * 4 + 4));
    const check = new Uint8Array(made.nt / 3);
    for (let t = 0; t < check.length; t++) for (let k = 0; k < 3; k++) {
      const u = made.tri[t * 3 + k];
      if (u < verts && (round === 0 ? !Number.isNaN(alt[u * 3]) : dirty[u])) { check[t] = 1; break; }
    }
    const cuts = cutting(pos, verts, made, check, cell);
    dirty.fill(0);
    for (const g of [...groups, ...cuts]) for (const u of g) if (u < verts) dirty[u] = 1;
    if (round === 0) crossed = cuts.length;
    for (const pair of cuts) groups.push(pair);
    if (!groups.length || round === ROUNDS) break;
    const picks = new Set(), busy = new Set();
    for (const g of groups) {
      if (g.some((u) => busy.has(u))) continue;
      let pick = -1, least = Infinity;
      for (const u of g) {
        if (u >= verts || Number.isNaN(alt[u * 3])) continue;
        const d = (good[u] ? 0 : 1e30) + (alt[u * 3] - pos[u * 3]) ** 2 + (alt[u * 3 + 1] - pos[u * 3 + 1]) ** 2 + (alt[u * 3 + 2] - pos[u * 3 + 2]) ** 2;
        if (d < least) { least = d; pick = u; }
      }
      for (const u of g) busy.add(u);
      if (pick >= 0) picks.add(pick);
    }
    stirred = new Uint8Array(verts);
    for (const u of picks) { pos.set(alt.subarray(u * 3, u * 3 + 3), u * 3); alt[u * 3] = NaN; stirred[u] = 1; }
    moved += picks.size;
    if (!picks.size) break;
  }
  const { tri, nt, extra, collapsed, dropped, fans, forced } = made;
  const all = new Float64Array(verts * 3 + extra.length);
  all.set(pos.subarray(0, verts * 3));
  all.set(extra, verts * 3);
  for (let i = verts * 3; i < all.length; i++) all[i] = Math.min(box[1][i % 3], Math.max(box[0][i % 3], all[i]));
  const raw = { positions: all, indices: tri.subarray(0, nt) };
  const clean = tidy(raw);
  const shifted = apart(clean, cell);
  const thin = uncap(clean);
  const t2 = performance.now();
  return {
    positions: clean.positions,
    indices: clean.indices,
    stats: {
      grid: nc, cells, vertices: clean.positions.length / 3, triangles: clean.indices.length / 3,
      evals, solved, featured, held, settled, yielded, moved, crossed, missing, collapsed, dropped, fans, forced, removed: clean.removed, shifted, thin, lip, threads: count,
      seconds: { grid: (t1 - t0) / 1000, join: (t2 - t1) / 1000 },
    },
  };
}

// A vertex may stand outside its own cell, on a corner or an edge that lies just over the cell's wall, but not on
// another vertex: one that would takes its place inside its own cell (alt), so no two vertices share a place.
function outside(pos, alt, home, table, first, origin, cell, nc) {
  const near = (cell * CLOSE) ** 2, there = new Map(), verts = home.length;
  const close = (u, v) => (pos[u * 3] - pos[v * 3]) ** 2 + (pos[u * 3 + 1] - pos[v * 3 + 1]) ** 2 + (pos[u * 3 + 2] - pos[v * 3 + 2]) ** 2 <= near;
  let yielded = 0;
  for (let v = 0; v < verts; v++) {
    if (Number.isNaN(alt[v * 3])) continue;
    const g = [0, 1, 2].map((a) => Math.floor((pos[v * 3 + a] - origin[a]) / cell));
    const key = g[0] + nc[0] * (g[1] + nc[1] * g[2]);
    if (key === home[v]) continue;
    const id = g.every((x, a) => x >= 0 && x < nc[a]) ? table.get(key) : -1;
    let hit = false;
    if (id >= 0) for (let u = first[id], e = id + 1 < first.length ? first[id + 1] : verts; u < e && !hit; u++) hit = close(u, v);
    const list = there.get(key) ?? [];
    hit ||= list.some((u) => close(u, v));
    if (hit) { pos.set(alt.subarray(v * 3, v * 3 + 3), v * 3); alt[v * 3] = NaN; yielded++; continue; }
    list.push(v);
    there.set(key, list);
  }
  return yielded;
}

// Pairs of triangles that cut through each other, each as the six vertices that could be moved to part them. Only
// pairs with a triangle marked in check are looked for (every pair when check is null). Triangles are put in buckets
// a cell across, and only those in coarse blocks near a checked triangle are put in at all.
function cutting(pos, verts, made, check, cell) {
  const { tri, nt, extra } = made;
  const at = (v, k) => (v < verts ? pos[v * 3 + k] : extra[(v - verts) * 3 + k]);
  const n = nt / 3;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  let any = 0;
  for (let t = 0; t < n; t++) if (!check || check[t]) { any = 1; break; }
  if (!any) return [];
  for (let i = 0; i < nt; i++) for (let k = 0; k < 3; k++) { const x = at(tri[i], k); if (x < lo[k]) lo[k] = x; if (x > hi[k]) hi[k] = x; }
  const C = 8 * cell, nb = [0, 1, 2].map((k) => Math.floor((hi[k] - lo[k]) / C) + 1);
  const near = new Uint8Array(nb[0] * nb[1] * nb[2]);
  const box = new Float64Array(6);
  const bound = (t) => {
    for (let k = 0; k < 3; k++) {
      const a = at(tri[t * 3], k), b = at(tri[t * 3 + 1], k), c = at(tri[t * 3 + 2], k);
      box[k] = Math.min(a, b, c) - lo[k]; box[k + 3] = Math.max(a, b, c) - lo[k];
    }
  };
  for (let t = 0; t < n; t++) {
    if (check && !check[t]) continue;
    bound(t);
    const b0 = [0, 1, 2].map((k) => Math.max(0, Math.floor((box[k] - cell) / C))), b1 = [0, 1, 2].map((k) => Math.min(nb[k] - 1, Math.floor((box[k + 3] + cell) / C)));
    for (let z = b0[2]; z <= b1[2]; z++) for (let y = b0[1]; y <= b1[1]; y++) for (let x = b0[0]; x <= b1[0]; x++) near[x + nb[0] * (y + nb[1] * z)] = 1;
  }
  const key = (i, j, k) => i + 65536 * (j + 65536 * k);
  const wanted = new Table(1024);
  let nw = 0;
  const want = (kk) => { if (wanted.get(kk) < 0) wanted.set(kk, nw++); };
  const span = new Int32Array(6);
  const spanOf = (t) => { bound(t); for (let k = 0; k < 6; k++) span[k] = Math.floor(box[k] / cell); };
  for (let t = 0; t < n; t++) {
    if (check && !check[t]) continue;
    spanOf(t);
    for (let z = span[2]; z <= span[5]; z++) for (let y = span[1]; y <= span[4]; y++) for (let x = span[0]; x <= span[3]; x++) want(key(x, y, z));
  }
  const pairT = [], pairB = [];
  for (let t = 0; t < n; t++) {
    const v = tri[t * 3];
    const bx = Math.floor((at(v, 0) - lo[0]) / C), by = Math.floor((at(v, 1) - lo[1]) / C), bz = Math.floor((at(v, 2) - lo[2]) / C);
    if (!near[Math.min(bx, nb[0] - 1) + nb[0] * (Math.min(by, nb[1] - 1) + nb[1] * Math.min(bz, nb[2] - 1))]) continue;
    spanOf(t);
    for (let z = span[2]; z <= span[5]; z++) for (let y = span[1]; y <= span[4]; y++) for (let x = span[0]; x <= span[3]; x++) {
      const b = wanted.get(key(x, y, z));
      if (b >= 0) { pairT.push(t); pairB.push(b); }
    }
  }
  const count = new Int32Array(nw + 1);
  for (const b of pairB) count[b + 1]++;
  for (let b = 0; b < nw; b++) count[b + 1] += count[b];
  const fill = count.slice(0, nw), list = new Int32Array(pairT.length);
  for (let i = 0; i < pairT.length; i++) list[fill[pairB[i]]++] = pairT[i];
  const P = new Float64Array(18), stamp = new Int32Array(n).fill(-1);
  const load = (t, o) => { for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) P[o + c * 3 + k] = at(tri[t * 3 + c], k); };
  const out = [];
  for (let t = 0; t < n; t++) {
    if (check && !check[t]) continue;
    spanOf(t);
    const s0 = span.slice();
    for (let z = s0[2]; z <= s0[5]; z++) for (let y = s0[1]; y <= s0[4]; y++) for (let x = s0[0]; x <= s0[3]; x++) {
      const b = wanted.get(key(x, y, z));
      for (let s = count[b]; s < count[b + 1]; s++) {
        const u = list[s];
        if (u === t || stamp[u] === t || ((!check || check[u]) && u < t)) continue;
        stamp[u] = t;
        load(t, 0);
        load(u, 9);
        if (!pierce(P, tri, t, u) && !pierce(P, tri, u, t, true)) continue;
        out.push([tri[t * 3], tri[t * 3 + 1], tri[t * 3 + 2], tri[u * 3], tri[u * 3 + 1], tri[u * 3 + 2]]);
      }
    }
  }
  return out;
}

// Whether an edge of triangle a (in P from 0, or from 9 when swapped) passes through the inside of triangle b, edges
// that share a vertex with b left out.
function pierce(P, tri, a, b, swapped = false) {
  const oa = swapped ? 9 : 0, ob = swapped ? 0 : 9;
  const B0 = tri[b * 3], B1 = tri[b * 3 + 1], B2 = tri[b * 3 + 2];
  const ax = P[ob], ay = P[ob + 1], az = P[ob + 2];
  const e1x = P[ob + 3] - ax, e1y = P[ob + 4] - ay, e1z = P[ob + 5] - az;
  const e2x = P[ob + 6] - ax, e2y = P[ob + 7] - ay, e2z = P[ob + 8] - az;
  for (let e = 0; e < 3; e++) {
    const s = tri[a * 3 + e], f = tri[a * 3 + (e + 1) % 3];
    if (s === B0 || s === B1 || s === B2 || f === B0 || f === B1 || f === B2) continue;
    const sx = P[oa + e * 3], sy = P[oa + e * 3 + 1], sz = P[oa + e * 3 + 2];
    const e2 = ((e + 1) % 3) * 3;
    const dx = P[oa + e2] - sx, dy = P[oa + e2 + 1] - sy, dz = P[oa + e2 + 2] - sz;
    const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x;
    const det = e1x * hx + e1y * hy + e1z * hz;
    if (Math.abs(det) < 1e-18) continue;
    const inv = 1 / det, tx = sx - ax, ty = sy - ay, tz = sz - az;
    const u = inv * (tx * hx + ty * hy + tz * hz);
    if (u <= 1e-9 || u >= 1 - 1e-9) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = inv * (dx * qx + dy * qy + dz * qz);
    if (v <= 1e-9 || u + v >= 1 - 1e-9) continue;
    const w = inv * (e2x * qx + e2y * qy + e2z * qz);
    if (w > 1e-9 && w < 1 - 1e-9) return true;
  }
  return false;
}

// Makes the quads into triangles, and again after vertices move, redoing only the quads they touch. Vertices closer
// than CLOSE of a cell in one quad are made one, and each quad is split, fanned or, failing both, split with a
// triangle wrong way out (listed in wrong, so a vertex can be moved and it can be tried again).
function joiner(pos, verts, quads, herm, along, nq, cell) {
  const slots = new Uint32Array(nq * 12), kind = new Uint8Array(nq), root = new Int32Array(verts), was = new Int32Array(verts).fill(-1);
  const centres = new Map(), near = (CLOSE * cell) ** 2, least = 1e-6 * cell * cell;
  const find = (v) => { while (root[v] !== v) v = root[v] = root[root[v]]; return v; };
  const v = new Int32Array(4), ring = [];
  let collapsed = 0;
  const one = (q, judge) => {
    for (let s = 0; s < 4; s++) v[s] = root[quads[q * 4 + s]];
    const h = herm.subarray(q * 6, q * 6 + 6), o = q * 12;
    centres.delete(q);
    ring.length = 0;
    for (let s = 0; s < 4; s++) if (v[s] !== v[(s + 3) % 4]) ring.push(v[s]);
    if (ring.length < 3 || new Set(ring).size !== ring.length) { kind[q] = KIND.dropped; return; }
    if (ring.length === 3) { slots[o] = ring[0]; slots[o + 1] = ring[1]; slots[o + 2] = ring[2]; kind[q] = KIND.three; return; }
    const way = split(pos, v, h, along[q], least, judge, cell);
    if (way === 3) {
      centres.set(q, [h[0], h[1], h[2]]);
      for (let s = 0; s < 4; s++) { slots[o + s * 3] = FAN; slots[o + s * 3 + 1] = v[s]; slots[o + s * 3 + 2] = v[(s + 1) % 4]; }
      kind[q] = KIND.fan;
      return;
    }
    if (way === 1 || way === 4) { slots[o] = v[0]; slots[o + 1] = v[1]; slots[o + 2] = v[2]; slots[o + 3] = v[0]; slots[o + 4] = v[2]; slots[o + 5] = v[3]; }
    else { slots[o] = v[0]; slots[o + 1] = v[1]; slots[o + 2] = v[3]; slots[o + 3] = v[1]; slots[o + 4] = v[2]; slots[o + 5] = v[3]; }
    kind[q] = way > 3 ? KIND.wrong : KIND.two;
  };
  return (judge, moved, again) => {
    for (let u = 0; u < verts; u++) root[u] = u;
    collapsed = 0;
    for (let q = 0; q < nq; q++) {
      for (let s = 0; s < 4; s++) for (let t = s + 1; t < 4; t++) {
        const a = quads[q * 4 + s], b = quads[q * 4 + t];
        if ((pos[a * 3] - pos[b * 3]) ** 2 + (pos[a * 3 + 1] - pos[b * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[b * 3 + 2]) ** 2 > near) continue;
        const ra = find(a), rb = find(b);
        if (ra !== rb) { root[Math.max(ra, rb)] = Math.min(ra, rb); collapsed++; }
      }
    }
    for (let u = 0; u < verts; u++) root[u] = find(u);
    for (let q = 0; q < nq; q++) {
      let redo = !moved || (again && kind[q] === KIND.wrong);
      for (let s = 0; s < 4 && !redo; s++) { const u = quads[q * 4 + s]; redo = moved[u] === 1 || root[u] !== was[u]; }
      if (redo) one(q, judge);
    }
    was.set(root);
    let nt = 0, fans = 0, dropped = 0;
    const wrong = [], extra = [];
    for (let q = 0; q < nq; q++) nt += SIZE[kind[q]];
    const tri = new Uint32Array(nt);
    nt = 0;
    for (let q = 0; q < nq; q++) {
      const k = kind[q], o = q * 12;
      if (k === KIND.dropped) { dropped++; continue; }
      if (k === KIND.wrong) wrong.push(q);
      let c = 0;
      if (k === KIND.fan) { c = verts + extra.length / 3; extra.push(...centres.get(q)); fans++; }
      for (let i = 0; i < SIZE[k]; i++) tri[nt++] = slots[o + i] === FAN ? c : slots[o + i];
    }
    return { tri, nt, extra, wrong, collapsed, dropped, fans, forced: wrong.length };
  };
}

const KIND = { two: 0, three: 1, fan: 2, wrong: 3, dropped: 4 };
const SIZE = [6, 3, 12, 6, 0];
const FAN = 0xffffffff;

const nrm = new Float64Array(24), corner = new Int32Array(24);
// How a triangle faces against the field's slope at three points inside it: the best of the three, 1 when it faces
// the same way, -1 when it is wrong way out. Used only for quads the plain tests would fold.
function slopeAt(pos, field, cell, o) {
  const h = cell * 1e-4;
  let best = -1;
  for (const [w0, w1] of [[1 / 3, 1 / 3], [0.6, 0.2], [0.2, 0.6]]) {
    const w2 = 1 - w0 - w1, p = [0, 0, 0];
    for (let k = 0; k < 3; k++) p[k] = pos[corner[o] * 3 + k] * w0 + pos[corner[o + 1] * 3 + k] * w1 + pos[corner[o + 2] * 3 + k] * w2;
    const gx = field(p[0] + h, p[1], p[2]) - field(p[0] - h, p[1], p[2]);
    const gy = field(p[0], p[1] + h, p[2]) - field(p[0], p[1] - h, p[2]);
    const gz = field(p[0], p[1], p[2] + h) - field(p[0], p[1], p[2] - h);
    const l = Math.hypot(gx, gy, gz);
    if (l > 0) best = Math.max(best, (gx * nrm[o] + gy * nrm[o + 1] + gz * nrm[o + 2]) / l);
  }
  return best;
}

function face(pos, a, b, c, o, least) {
  corner[o] = a; corner[o + 1] = b; corner[o + 2] = c;
  const ax = pos[b * 3] - pos[a * 3], ay = pos[b * 3 + 1] - pos[a * 3 + 1], az = pos[b * 3 + 2] - pos[a * 3 + 2];
  const bx = pos[c * 3] - pos[a * 3], by = pos[c * 3 + 1] - pos[a * 3 + 1], bz = pos[c * 3 + 2] - pos[a * 3 + 2];
  const x = ay * bz - az * by, y = az * bx - ax * bz, z = ax * by - ay * bx;
  const l = Math.hypot(x, y, z);
  if (!(l > 2 * least)) return false;
  nrm[o] = x / l; nrm[o + 1] = y / l; nrm[o + 2] = z / l;
  return true;
}

// Which way to make a quad into triangles: 1 or 2, split along one diagonal or the other, whichever folds it least
// of those whose two triangles are both the right way out; 3, a fan round the crossing; 4 or 5, a split with a
// triangle wrong way out, which is then mended by moving a vertex. A triangle is the right way out when it faces
// along the grid edge the quad stands on, from its inside end to its outside end, or, failing that, when it faces
// as the field's slope does inside it (judge, the field, once a quad has failed) or as the crossing's normal does.
// The crossing's normal alone is no test: at a sharp edge a triangle on the other face is rightly turned 90 degrees
// or more from it, and where vertices lie on an edge that runs along the grid edge, a right triangle can be edge on.
function split(pos, v, h, way, least, judge, cell) {
  const a = Math.abs(way) - 1, s = Math.sign(way);
  const facing = (o) => {
    if (s * nrm[o + a] > -FLAT) return 1;
    if (!judge) return nrm[o] * h[3] + nrm[o + 1] * h[4] + nrm[o + 2] * h[5];
    return slopeAt(pos, judge, cell, o);
  };
  const hasA = face(pos, v[0], v[1], v[2], 0, least) && face(pos, v[0], v[2], v[3], 3, least);
  const hasB = face(pos, v[0], v[1], v[3], 6, least) && face(pos, v[1], v[2], v[3], 9, least);
  const fA = hasA ? Math.min(facing(0), facing(3)) : -Infinity, fB = hasB ? Math.min(facing(6), facing(9)) : -Infinity;
  const okA = fA > 0, okB = fB > 0;
  if (okA || okB) {
    const sA = okA ? nrm[0] * nrm[3] + nrm[1] * nrm[4] + nrm[2] * nrm[5] : -Infinity;
    const sB = okB ? nrm[6] * nrm[9] + nrm[7] * nrm[10] + nrm[8] * nrm[11] : -Infinity;
    return sA >= sB ? 1 : 2;
  }
  pos[pos.length - 3] = h[0]; pos[pos.length - 2] = h[1]; pos[pos.length - 1] = h[2];
  const c = pos.length / 3 - 1;
  let fan = true;
  for (let k = 0; k < 4 && fan; k++) fan = face(pos, c, v[k], v[(k + 1) % 4], 12, least) && facing(12) > 0;
  if (fan || (!hasA && !hasB)) return 3;
  return fA >= fB ? 4 : 5;
}

// No two vertices share a place: where two would in the stored positions, the later is moved a hair toward the
// middle of its neighbours, which keeps it on its own sheet. Returns how many were moved.
function apart(mesh, cell) {
  const p = mesh.positions, bits = new Uint32Array(p.buffer, p.byteOffset, p.length), n = p.length / 3;
  let size = 1;
  while (size < n * 2) size *= 2;
  const slot = new Int32Array(size);
  let moved = 0, around = null;
  for (let pass = 0; pass < 8; pass++) {
    slot.fill(-1);
    const twins = [];
    for (let v = 0; v < n; v++) {
      const x = bits[v * 3], y = bits[v * 3 + 1], z = bits[v * 3 + 2];
      let s = (Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca6b) ^ Math.imul(z, 0xc2b2ae35)) & (size - 1);
      while (slot[s] >= 0) {
        const u = slot[s];
        if (bits[u * 3] === x && bits[u * 3 + 1] === y && bits[u * 3 + 2] === z) { twins.push(v); break; }
        s = (s + 1) & (size - 1);
      }
      if (slot[s] < 0) slot[s] = v;
    }
    if (!twins.length) break;
    around ??= incident(mesh);
    for (const v of twins) {
      let cx = 0, cy = 0, cz = 0, k = 0;
      for (let i = around.start[v]; i < around.start[v + 1]; i++) {
        const t = around.tris[i];
        for (let c = 0; c < 3; c++) {
          const u = mesh.indices[t * 3 + c];
          if (u === v) continue;
          cx += p[u * 3]; cy += p[u * 3 + 1]; cz += p[u * 3 + 2]; k++;
        }
      }
      const dx = cx / k - p[v * 3], dy = cy / k - p[v * 3 + 1], dz = cz / k - p[v * 3 + 2], l = Math.hypot(dx, dy, dz);
      if (!(l > 0)) continue;
      const ulp = Math.max(Math.abs(p[v * 3]), Math.abs(p[v * 3 + 1]), Math.abs(p[v * 3 + 2]), 1) * 2 ** -20;
      const step = Math.min(0.25 * l, Math.max(GAP * cell, ulp) * (pass + 1));
      p[v * 3] += (dx / l) * step; p[v * 3 + 1] += (dy / l) * step; p[v * 3 + 2] += (dz / l) * step;
      moved++;
    }
  }
  return moved;
}

function tidy({ positions, indices }) {
  const n = positions.length / 3;
  const out = new Float32Array(positions.length);
  out.set(positions);
  const used = new Int32Array(n).fill(-1);
  const keep = new Uint32Array(indices.length);
  let k = 0, removed = 0, nv = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t], b = indices[t + 1], c = indices[t + 2];
    if (a === b || b === c || a === c) { removed++; continue; }
    keep[k++] = a; keep[k++] = b; keep[k++] = c;
  }
  for (let i = 0; i < k; i++) { const v = keep[i]; if (used[v] < 0) used[v] = nv++; keep[i] = used[v]; }
  const pos = new Float32Array(nv * 3);
  for (let v = 0; v < n; v++) if (used[v] >= 0) { pos[used[v] * 3] = out[v * 3]; pos[used[v] * 3 + 1] = out[v * 3 + 1]; pos[used[v] * 3 + 2] = out[v * 3 + 2]; }
  return { positions: pos, indices: keep.slice(0, k), removed };
}

// Reduces a mesh with meshoptimizer, which never moves a vertex, only drops them. Its own error is an estimate that
// a triangle can stray well past (a pit or a bump whose faces pass through the vertex it is folded into costs it
// nothing), so unless strict is false the result is measured against the mesh it came from: every vertex of that
// mesh must lie within error of the result and every point sampled on the result within error of that mesh. Where
// either fails, or where the result is open where the mesh was not, the vertices there are held still and it is
// made again. Positions are compared as places, so a mesh split at its creases (creased) is reduced as one surface.
export async function simplify(mesh, { error, target, attributes, weights, lock, strict = true } = {}) {
  if (error === undefined && target === undefined) throw new Error('simplify: give an error, a target or both');
  await MeshoptSimplifier.ready;
  const positions = mesh.positions instanceof Float32Array ? mesh.positions : new Float32Array(mesh.positions);
  const indices = mesh.indices instanceof Uint32Array ? mesh.indices : new Uint32Array(mesh.indices);
  const nv = positions.length / 3;
  const most = error ?? Infinity, sure = strict && Number.isFinite(most);
  const aim = Number.isFinite(most) ? most : 1e30;
  const goal = Math.max(0, Math.min(indices.length, Math.floor(target ?? 0) * 3));
  const k = attributes ? attributes.length / nv : 0;
  const attr = attributes ?? new Float32Array(0);
  const wts = k ? Array.from(weights ?? new Array(k).fill(1)) : [];
  const held = lock ? Uint8Array.from(lock) : new Uint8Array(nv);
  const place = places(positions);
  const rim = edgesOf(indices, place, nv).open;
  const check = sure ? strays({ positions, indices }, most, place) : null;
  let out, stray = 0, holes = 0, rounds = 0;
  for (;;) {
    out = MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, attr, k, wts, held, goal, aim, ['ErrorAbsolute'])[0];
    holes = opened(out, place, nv, rim, positions, held);
    stray = check ? check.find(out, held) : 0;
    if ((!stray && !holes) || rounds === HOLD) break;
    for (let i = 0; i < out.length; i++) held[out[i]] = 1;
    rounds++;
  }
  const map = new Int32Array(nv).fill(-1);
  const source = [];
  for (let i = 0; i < out.length; i++) {
    const v = out[i];
    if (map[v] < 0) { map[v] = source.length; source.push(v); }
    out[i] = map[v];
  }
  const src = Uint32Array.from(source);
  const pos = new Float32Array(src.length * 3);
  for (let i = 0; i < src.length; i++) { pos[i * 3] = positions[src[i] * 3]; pos[i * 3 + 1] = positions[src[i] * 3 + 1]; pos[i * 3 + 2] = positions[src[i] * 3 + 2]; }
  let attrOut;
  if (attributes) {
    attrOut = new Float32Array(src.length * k);
    for (let i = 0; i < src.length; i++) for (let j = 0; j < k; j++) attrOut[i * k + j] = attributes[src[i] * k + j];
  }
  const thin = uncap({ positions: pos, indices: out });
  return { positions: pos, indices: out, attributes: attrOut, source: src, thin, stray: check ? stray : null, furthest: check && stray ? check.worst : 0, holes, rounds };
}

// For each vertex, the first vertex at the very same place, so a mesh split at its creases is read as one surface.
function places(p) {
  const bits = new Uint32Array(p.buffer, p.byteOffset, p.length), n = p.length / 3;
  let size = 1;
  while (size < n * 2) size *= 2;
  const slot = new Int32Array(size).fill(-1), place = new Int32Array(n);
  for (let v = 0; v < n; v++) {
    const x = bits[v * 3], y = bits[v * 3 + 1], z = bits[v * 3 + 2];
    let s = (Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca6b) ^ Math.imul(z, 0xc2b2ae35)) & (size - 1);
    for (;;) {
      const u = slot[s];
      if (u < 0) { slot[s] = v; place[v] = v; break; }
      if (bits[u * 3] === x && bits[u * 3 + 1] === y && bits[u * 3 + 2] === z) { place[v] = u; break; }
      s = (s + 1) & (size - 1);
    }
  }
  return place;
}

// The edges of a mesh by place, with how many triangles use each; open lists the places on an edge used once.
function edgesOf(ix, place, nv) {
  const table = new Table(ix.length), uses = new Int32Array(ix.length);
  let n = 0;
  for (let t = 0; t < ix.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = place[ix[t + k]], b = place[ix[t + (k + 1) % 3]];
    const key = Math.min(a, b) * nv + Math.max(a, b);
    let e = table.get(key);
    if (e < 0) { e = n++; table.set(key, e); }
    uses[e]++;
  }
  const open = new Uint8Array(nv);
  for (let s = 0; s < table.keys.length; s++) {
    const key = table.keys[s];
    if (key === -1 || uses[table.vals[s]] !== 1) continue;
    open[key % nv] = 1; open[Math.floor(key / nv)] = 1;
  }
  return { table, uses, open };
}

// Counts the edges of the result used by one triangle that are not on an open edge of the mesh it came from, and
// holds still every vertex of the mesh within the longest such edge of either end, so the next try keeps them.
function opened(out, place, nv, rim, p, held) {
  const { table, uses } = edgesOf(out, place, nv);
  const ends = [];
  for (let s = 0; s < table.keys.length; s++) {
    const key = table.keys[s];
    if (key === -1 || uses[table.vals[s]] !== 1) continue;
    const a = key % nv, b = Math.floor(key / nv);
    if (rim[a] && rim[b]) continue;
    ends.push([a, b]);
  }
  if (!ends.length) return 0;
  const near = vertexGrid(p, Math.max(...ends.map(([a, b]) => Math.hypot(p[a * 3] - p[b * 3], p[a * 3 + 1] - p[b * 3 + 1], p[a * 3 + 2] - p[b * 3 + 2]))) || 1);
  for (const [a, b] of ends) {
    const r = Math.hypot(p[a * 3] - p[b * 3], p[a * 3 + 1] - p[b * 3 + 1], p[a * 3 + 2] - p[b * 3 + 2]);
    for (const e of [a, b]) near(p[e * 3], p[e * 3 + 1], p[e * 3 + 2], r, (v) => { held[v] = 1; });
  }
  return ends.length;
}

// The vertices of a mesh in buckets size across: near(x, y, z, r, fn) calls fn(v) for every vertex within r.
function vertexGrid(p, size) {
  const n = p.length / 3, lo = [Infinity, Infinity, Infinity];
  for (let v = 0; v < n; v++) for (let a = 0; a < 3; a++) lo[a] = Math.min(lo[a], p[v * 3 + a]);
  const key = (i, j, k) => i + 65536 * (j + 65536 * k), at = (x, a) => Math.floor((x - lo[a]) / size);
  const table = new Table(n), head = [], next = new Int32Array(n);
  for (let v = 0; v < n; v++) {
    const kk = key(at(p[v * 3], 0), at(p[v * 3 + 1], 1), at(p[v * 3 + 2], 2));
    let b = table.get(kk);
    if (b < 0) { b = head.length; head.push(-1); table.set(kk, b); }
    next[v] = head[b];
    head[b] = v;
  }
  return (x, y, z, r, fn) => {
    for (let k = at(z - r, 2); k <= at(z + r, 2); k++) for (let j = at(y - r, 1); j <= at(y + r, 1); j++) for (let i = at(x - r, 0); i <= at(x + r, 0); i++) {
      const b = table.get(key(i, j, k));
      if (b < 0) continue;
      for (let v = head[b]; v >= 0; v = next[v]) if ((p[v * 3] - x) ** 2 + (p[v * 3 + 1] - y) ** 2 + (p[v * 3 + 2] - z) ** 2 <= r * r) fn(v);
    }
  };
}

// The result measured against the mesh it was made from, both ways. find(out, held) counts the vertices of the mesh
// further than error from the result, and the reduced triangles with a point further than error from the mesh, and
// holds still the vertices of the mesh there, so the next try keeps them.
function strays(mesh, error, place) {
  const p = mesh.positions, ix = mesh.indices, nv = p.length / 3;
  let sum = 0, n = 0;
  for (let t = 0; t < ix.length; t += 3 * Math.max(1, Math.floor(ix.length / 3 / 5000))) {
    const a = ix[t], b = ix[t + 1];
    sum += Math.hypot(p[a * 3] - p[b * 3], p[a * 3 + 1] - p[b * 3 + 1], p[a * 3 + 2] - p[b * 3 + 2]);
    n++;
  }
  const edge = n ? sum / n : error;
  const size = Math.max(error * 2, edge * 1.5);
  const gap = closest(mesh, size);
  const near = vertexGrid(p, size);
  const { start, tris } = incident(mesh);
  const made = (a, b, c) => {
    for (let s = start[a]; s < start[a + 1]; s++) {
      const t = tris[s];
      const x = ix[t * 3], y = ix[t * 3 + 1], z = ix[t * 3 + 2];
      if ((x === b || y === b || z === b) && (x === c || y === c || z === c)) return true;
    }
    return false;
  };
  const short = error * Math.sqrt(3);
  let worst = 0;
  return {
    get worst() { return worst; },
    find(out, held) {
      let count = 0;
      worst = 0;
      const kept = new Uint8Array(nv);
      for (let i = 0; i < out.length; i++) kept[place[out[i]]] = 1;
      const back = closest({ positions: p, indices: out }, size);
      for (let v = 0; v < nv; v++) {
        if (place[v] !== v || kept[v]) continue;
        const d = back(p[v * 3], p[v * 3 + 1], p[v * 3 + 2], error);
        if (d <= error) continue;
        worst = Math.max(worst, d);
        held[v] = 1;
        count++;
      }
      for (let t = 0; t < out.length; t += 3) {
        const a = out[t], b = out[t + 1], c = out[t + 2];
        const L = Math.max(
          Math.hypot(p[a * 3] - p[b * 3], p[a * 3 + 1] - p[b * 3 + 1], p[a * 3 + 2] - p[b * 3 + 2]),
          Math.hypot(p[b * 3] - p[c * 3], p[b * 3 + 1] - p[c * 3 + 1], p[b * 3 + 2] - p[c * 3 + 2]),
          Math.hypot(p[c * 3] - p[a * 3], p[c * 3 + 1] - p[a * 3 + 1], p[c * 3 + 2] - p[a * 3 + 2]));
        if (L <= short || made(a, b, c)) continue;
        const steps = Math.min(SAMPLES, Math.max(2, Math.ceil(L / Math.max(error, edge / 2))));
        let far = false;
        for (let i = 0; i <= steps; i++) for (let j = 0; i + j <= steps; j++) {
          const u = i / steps, w = j / steps, o = 1 - u - w;
          if (u === 1 || w === 1 || o === 1) continue;
          const x = p[a * 3] * o + p[b * 3] * u + p[c * 3] * w, y = p[a * 3 + 1] * o + p[b * 3 + 1] * u + p[c * 3 + 1] * w, z = p[a * 3 + 2] * o + p[b * 3 + 2] * u + p[c * 3 + 2] * w;
          const d = gap(x, y, z, error);
          if (d <= error) continue;
          far = true;
          worst = Math.max(worst, d);
          near(x, y, z, Math.min(Math.max(2 * Math.min(d, size), 2 * edge), L), (v) => { if (toTriangle(p, a, b, c, p[v * 3], p[v * 3 + 1], p[v * 3 + 2]) > error * 0.5) held[v] = 1; });
        }
        if (far) count++;
      }
      return count;
    },
  };
}
