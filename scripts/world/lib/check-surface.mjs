// The surface maker's self check: scenes whose answers are known exactly, each checked with numbers.
//
//   node scripts/world/lib/check-surface.mjs            every check, then the timing on a world sized scene
//   node scripts/world/lib/check-surface.mjs --quick    every check, no timing
//
// Prints PASS or FAIL for each and exits with 1 on any failure. This file is also the field module the checks
// hand the surface maker: setup({ scene }) picks the scene in each worker.
import { isMainThread } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { availableParallelism } from 'node:os';
import { surface, simplify, SHIFT } from './surface.mjs';
import { creased, curvature, closed, area, weld, bounds, merge, transform } from './mesh.mjs';

export const lip = 1;
let impl = () => 1;
export function field(x, y, z) { return impl(x, y, z); }

function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dir = (r) => {
  const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
  return [s * Math.cos(a), s * Math.sin(a), z];
};

function turn(ax, ay, az) {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(ax), Math.sin(ax), Math.cos(ay), Math.sin(ay), Math.cos(az), Math.sin(az)];
  return [
    [cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz],
    [cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz],
    [-sy, sx * cy, cx * cy],
  ];
}

const CUBE = { half: 20, rot: turn(0.43, 0.71, 0.29), at: [0.31, -0.17, 0.23] };
const cubePlanes = () => [0, 1, 2].flatMap((a) => [1, -1].map((s) => {
  const n = [CUBE.rot[0][a] * s, CUBE.rot[1][a] * s, CUBE.rot[2][a] * s];
  return { n, d: CUBE.half + n[0] * CUBE.at[0] + n[1] * CUBE.at[1] + n[2] * CUBE.at[2] };
}));
function cubeTrue(x, y, z) {
  const p = [x - CUBE.at[0], y - CUBE.at[1], z - CUBE.at[2]];
  const l = [0, 1, 2].map((a) => Math.abs(CUBE.rot[0][a] * p[0] + CUBE.rot[1][a] * p[1] + CUBE.rot[2][a] * p[2]) - CUBE.half);
  const out = Math.hypot(Math.max(l[0], 0), Math.max(l[1], 0), Math.max(l[2], 0));
  return out + Math.min(Math.max(l[0], l[1], l[2]), 0);
}
const cubeCorners = () => {
  const out = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const l = [sx * CUBE.half, sy * CUBE.half, sz * CUBE.half];
    out.push([0, 1, 2].map((r) => CUBE.rot[r][0] * l[0] + CUBE.rot[r][1] * l[1] + CUBE.rot[r][2] * l[2] + CUBE.at[r]));
  }
  return out;
};
const planesField = (planes) => (x, y, z) => {
  let f = -Infinity;
  for (const p of planes) f = Math.max(f, p.n[0] * x + p.n[1] * y + p.n[2] * z - p.d);
  return f;
};

function boxField(c, h) {
  return (x, y, z) => {
    const l = [Math.abs(x - c[0]) - h[0], Math.abs(y - c[1]) - h[1], Math.abs(z - c[2]) - h[2]];
    return Math.hypot(Math.max(l[0], 0), Math.max(l[1], 0), Math.max(l[2], 0)) + Math.min(Math.max(l[0], l[1], l[2]), 0);
  };
}

// Convex pieces, each the meeting of random half spaces round a middle, bounded, with a bucket grid so a field call
// reads only the pieces near it. Outside, the value is never more than the true distance, so lip 1 holds.
export function pieces({ count, seed, fill, size, span }) {
  const r = random(seed);
  const list = [];
  while (list.length < count) {
    const c = fill(r);
    const k = 8 + Math.floor(r() * 7);
    const radius = size[0] + r() * (size[1] - size[0]);
    const planes = [];
    for (let i = 0; i < k; i++) planes.push({ n: dir(r), d: radius * (0.55 + 0.45 * r()) });
    let spans = true;
    if (planes.some((p) => p.d < radius * 0.55)) spans = false;
    const probe = random(seed ^ (list.length * 7919 + 1));
    for (let t = 0; t < 400 && spans; t++) {
      const u = dir(probe);
      let best = -1;
      for (const p of planes) best = Math.max(best, p.n[0] * u[0] + p.n[1] * u[1] + p.n[2] * u[2]);
      if (best < 0.25) spans = false;
    }
    if (!spans) continue;
    let reach = 0;
    const corners = [];
    for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) for (let e = b + 1; e < k; e++) {
      const P = [planes[a], planes[b], planes[e]];
      const m = P.map((p) => p.n), d = P.map((p) => p.d);
      const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      if (Math.abs(det) < 1e-9) continue;
      const solve = (col) => {
        const M = m.map((row, i) => row.map((v, j) => (j === col ? d[i] : v)));
        return (M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])) / det;
      };
      const x = [solve(0), solve(1), solve(2)];
      if (planes.every((p) => p.n[0] * x[0] + p.n[1] * x[1] + p.n[2] * x[2] <= p.d + 1e-7)) {
        reach = Math.max(reach, Math.hypot(...x));
        corners.push(x);
      }
    }
    if (reach > radius * 2.2) continue;
    list.push({ c, planes: planes.map((p) => ({ n: p.n, d: p.d + p.n[0] * c[0] + p.n[1] * c[1] + p.n[2] * c[2] })), reach, corners: corners.map((x) => [x[0] + c[0], x[1] + c[1], x[2] + c[2]]) });
  }
  const G = span.cell, M = G;
  const lo = span.box[0], nb = [0, 1, 2].map((a) => Math.ceil((span.box[1][a] - lo[a]) / G));
  const total = nb[0] * nb[1] * nb[2];
  const lists = Array.from({ length: total }, () => []);
  const touched = new Uint8Array(total);
  list.forEach((p, id) => {
    const r0 = p.reach + M;
    const i0 = [0, 1, 2].map((a) => Math.max(0, Math.floor((p.c[a] - r0 - lo[a]) / G)));
    const i1 = [0, 1, 2].map((a) => Math.min(nb[a] - 1, Math.floor((p.c[a] + r0 - lo[a]) / G)));
    for (let k = i0[2]; k <= i1[2]; k++) for (let j = i0[1]; j <= i1[1]; j++) for (let i = i0[0]; i <= i1[0]; i++) {
      const b = i + nb[0] * (j + nb[1] * k);
      const q = [i, j, k].map((v, a) => Math.max(lo[a] + v * G, Math.min(p.c[a], lo[a] + (v + 1) * G)));
      const d = Math.hypot(q[0] - p.c[0], q[1] - p.c[1], q[2] - p.c[2]);
      if (d <= p.reach + M) lists[b].push(id);
      if (d <= p.reach) touched[b] = 1;
    }
  });
  const steps = new Int32Array(total).fill(-1);
  let front = [];
  for (let b = 0; b < total; b++) if (touched[b]) { steps[b] = 0; front.push(b); }
  for (let s = 1; front.length; s++) {
    const nextFront = [];
    for (const b of front) {
      const i = b % nb[0], j = Math.floor(b / nb[0]) % nb[1], k = Math.floor(b / (nb[0] * nb[1]));
      for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const a = i + di, bb = j + dj, cc = k + dk;
        if (a < 0 || bb < 0 || cc < 0 || a >= nb[0] || bb >= nb[1] || cc >= nb[2]) continue;
        const n = a + nb[0] * (bb + nb[1] * cc);
        if (steps[n] < 0) { steps[n] = s; nextFront.push(n); }
      }
    }
    front = nextFront;
  }
  const start = new Int32Array(total + 1);
  for (let b = 0; b < total; b++) start[b + 1] = start[b] + lists[b].length;
  const flat = new Int32Array(start[total]);
  for (let b = 0; b < total; b++) flat.set(lists[b], start[b]);
  const pn = new Float64Array(list.reduce((s, p) => s + p.planes.length, 0) * 4);
  const pstart = new Int32Array(list.length + 1);
  let w = 0;
  list.forEach((p, i) => { pstart[i] = w / 4; for (const q of p.planes) { pn[w++] = q.n[0]; pn[w++] = q.n[1]; pn[w++] = q.n[2]; pn[w++] = q.d; } });
  pstart[list.length] = w / 4;
  const value = (x, y, z) => {
    const i = Math.floor((x - lo[0]) / G), j = Math.floor((y - lo[1]) / G), k = Math.floor((z - lo[2]) / G);
    if (i < 0 || j < 0 || k < 0 || i >= nb[0] || j >= nb[1] || k >= nb[2]) {
      const dx = Math.max(lo[0] - x, 0, x - (lo[0] + nb[0] * G)), dy = Math.max(lo[1] - y, 0, y - (lo[1] + nb[1] * G)), dz = Math.max(lo[2] - z, 0, z - (lo[2] + nb[2] * G));
      return Math.max(Math.hypot(dx, dy, dz), 1e-3);
    }
    const b = i + nb[0] * (j + nb[1] * k);
    let f = steps[b] > 1 ? (steps[b] - 1) * G : M;
    for (let s = start[b]; s < start[b + 1]; s++) {
      const id = flat[s];
      let g = -Infinity;
      for (let t = pstart[id] * 4, e = pstart[id + 1] * 4; t < e; t += 4) {
        const v = pn[t] * x + pn[t + 1] * y + pn[t + 2] * z - pn[t + 3];
        if (v > g) { g = v; if (g >= f) break; }
      }
      if (g < f) f = g;
    }
    return f;
  };
  const near = (x, y, z) => {
    const i = Math.floor((x - lo[0]) / G), j = Math.floor((y - lo[1]) / G), k = Math.floor((z - lo[2]) / G);
    if (i < 0 || j < 0 || k < 0 || i >= nb[0] || j >= nb[1] || k >= nb[2]) return [];
    const b = i + nb[0] * (j + nb[1] * k);
    return Array.from(flat.subarray(start[b], start[b + 1]));
  };
  return { list, value, near };
}

// A cube turned at random, from a seed: its three axes, its middle and half its size.
function turned(seed, h) {
  const r = random(seed), a = dir(r);
  let b = dir(r);
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  b = [b[0] - d * a[0], b[1] - d * a[1], b[2] - d * a[2]];
  const bl = Math.hypot(...b);
  b = b.map((v) => v / bl);
  const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const axes = [a, b, c], at = [r() * 3, r() * 3, r() * 3];
  const field = (x, y, z) => {
    let m = -Infinity;
    for (const ax of axes) m = Math.max(m, Math.abs(ax[0] * (x - at[0]) + ax[1] * (y - at[1]) + ax[2] * (z - at[2])) - h);
    return m;
  };
  const corners = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) corners.push([0, 1, 2].map((k) => at[k] + h * (sx * a[k] + sy * b[k] + sz * c[k])));
  return { field, axes, at, corners, normals: axes.flatMap((ax) => [ax, ax.map((v) => -v)]) };
}

// A thousand small cubes, each turned at random, CHIPS.side across and well apart.
const CHIPS = { seed: 4, side: 4, count: 1000, spacing: 12 };
function chips() {
  const r = random(CHIPS.seed), n = Math.ceil(Math.cbrt(CHIPS.count)), list = [];
  for (let i = 0; i < CHIPS.count; i++) {
    const g = [i % n, Math.floor(i / n) % n, Math.floor(i / (n * n))];
    const c = g.map((v) => (v - n / 2) * CHIPS.spacing + (r() - 0.5) * CHIPS.spacing * 0.3);
    const a = dir(r);
    let b = dir(r);
    const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    b = [b[0] - d * a[0], b[1] - d * a[1], b[2] - d * a[2]];
    const bl = Math.hypot(...b);
    b = b.map((v) => v / bl);
    list.push({ c, axes: [a, b, [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]] });
  }
  const h = CHIPS.side / 2, S = CHIPS.spacing;
  const field = (x, y, z) => {
    const i = Math.round(x / S + n / 2), j = Math.round(y / S + n / 2), k = Math.round(z / S + n / 2);
    let best = S * 0.5;
    for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = i + di, jj = j + dj, kk = k + dk;
      if (ii < 0 || jj < 0 || kk < 0 || ii >= n || jj >= n || kk >= n || ii + n * (jj + n * kk) >= CHIPS.count) continue;
      const p = list[ii + n * (jj + n * kk)];
      let m = -Infinity;
      for (const ax of p.axes) m = Math.max(m, Math.abs(ax[0] * (x - p.c[0]) + ax[1] * (y - p.c[1]) + ax[2] * (z - p.c[2])) - h);
      best = Math.min(best, m);
    }
    return best;
  };
  return { field, list };
}

// A turned block with pieces added to it and pits cut from it: concave creases everywhere.
function carved() {
  const r = random(3), turn3 = turn(0.7, 0.4, 1.1), half = [52.3, 31.7, 44.1], at = [3.17, -2.71, 1.93];
  const block = [];
  for (let a = 0; a < 3; a++) for (const sg of [1, -1]) {
    const n = [turn3[0][a] * sg, turn3[1][a] * sg, turn3[2][a] * sg];
    block.push({ n, d: half[a] + n[0] * at[0] + n[1] * at[1] + n[2] * at[2] });
  }
  const piece = (c, radius) => {
    const k = 7 + Math.floor(r() * 6), planes = [];
    for (let i = 0; i < k; i++) { const n = dir(r); planes.push({ n, d: radius * (0.6 + 0.4 * r()) + n[0] * c[0] + n[1] * c[1] + n[2] * c[2] }); }
    for (const a of [0, 1, 2]) for (const sg of [1, -1]) { const n = [0, 0, 0]; n[a] = sg; planes.push({ n, d: radius * 1.6 + sg * c[a] }); }
    return planesField(planes);
  };
  const adds = [], cuts = [];
  for (let i = 0; i < 30; i++) adds.push(piece([(r() - 0.5) * 130, (r() - 0.5) * 90, (r() - 0.5) * 110], 6 + r() * 14));
  for (let i = 0; i < 40; i++) cuts.push(piece([(r() - 0.5) * 110, (r() - 0.5) * 70, (r() - 0.5) * 90], 4 + r() * 12));
  const b = planesField(block);
  return (x, y, z) => {
    let v = b(x, y, z);
    for (const f of adds) v = Math.min(v, f(x, y, z));
    for (const f of cuts) v = Math.max(v, -f(x, y, z));
    return v;
  };
}
const CARVED = [[-110.3, -100.1, -105.7], [109.9, 101.3, 104.2]];

const HUNDRED = {
  count: 100, seed: 7, size: [10, 30],
  fill: (r) => [(r() - 0.5) * 160, (r() - 0.5) * 160, (r() - 0.5) * 160],
  span: { box: [[-150, -150, -150], [150, 150, 150]], cell: 24 },
};
const SHELL = {
  count: 4000, seed: 11, size: [20, 52],
  fill: (r) => {
    const d = dir(r), rad = 460 + r() * 110;
    return [d[0] * rad, d[1] * rad, d[2] * rad];
  },
  span: { box: [[-660, -660, -660], [660, 660, 660]], cell: 32 },
};
const SHEET = { c: [0.37, 0.21, -0.13], h: [30, 1, 30] };
const SLOT = { c: [0.29, 0.43, 0.11], h: [24, 24, 24], gap: 1 };
const LBOX = [[[0.13, 0.27, 0.19], [20, 6, 10]], [[-13.87, 14.27, 0.19], [6, 20, 10]]];

export async function setup({ scene, seed, h, c }) {
  if (scene === 'cube') impl = planesField(cubePlanes());
  else if (scene === 'turned') impl = turned(seed, h).field;
  else if (scene === 'box') impl = (x, y, z) => Math.max(Math.abs(x - c[0]) - h[0], Math.abs(y - c[1]) - h[1], Math.abs(z - c[2]) - h[2]);
  else if (scene === 'chips') impl = chips().field;
  else if (scene === 'carved') impl = carved();
  else if (scene === 'sphere') impl = (x, y, z) => Math.hypot(x - 0.21, y + 0.13, z - 0.07) - 37.3;
  else if (scene === 'hundred') impl = pieces(HUNDRED).value;
  else if (scene === 'shell') impl = pieces(SHELL).value;
  else if (scene === 'sheet') impl = boxField(SHEET.c, SHEET.h);
  else if (scene === 'slot') {
    const block = boxField(SLOT.c, SLOT.h), cut = boxField([SLOT.c[0], SLOT.c[1] + 10, SLOT.c[2]], [SLOT.gap, 30, 40]);
    impl = (x, y, z) => Math.max(block(x, y, z), -cut(x, y, z));
  } else if (scene === 'ell') {
    const a = boxField(...LBOX[0]), b = boxField(...LBOX[1]);
    impl = (x, y, z) => Math.min(a(x, y, z), b(x, y, z));
  } else throw new Error(`check: no scene '${scene}'`);
}

const SELF = fileURLToPath(import.meta.url);
let failed = 0;
const report = (name, ok, detail) => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const make = (scene, box, cell, extra = {}) => surface({ module: SELF, args: { scene }, box, cell, ...extra });
const deg = (c) => (Math.acos(Math.min(1, Math.max(-1, c))) * 180) / Math.PI;

function triNormal(m, t) {
  const p = m.positions, i = m.indices;
  const a = i[t * 3] * 3, b = i[t * 3 + 1] * 3, c = i[t * 3 + 2] * 3;
  const u = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]], v = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(...n);
  return { n: l ? n.map((x) => x / l) : [0, 0, 0], area: l / 2, mid: [0, 1, 2].map((k) => (p[a + k] + p[b + k] + p[c + k]) / 3) };
}
function degenerate(m, cell) {
  let bad = 0;
  for (let t = 0; t < m.indices.length / 3; t++) if (!(triNormal(m, t).area > 1e-6 * cell * cell)) bad++;
  return bad;
}
// Vertices with the same stored position as another vertex.
function twins(m) {
  const seen = new Set();
  let n = 0;
  for (let v = 0; v < m.positions.length / 3; v++) {
    const k = `${m.positions[v * 3]},${m.positions[v * 3 + 1]},${m.positions[v * 3 + 2]}`;
    if (seen.has(k)) n++; else seen.add(k);
  }
  return n;
}
const tight = (m, cell, name) => {
  const c = closed(m), d = degenerate(m, cell), edges = (m.indices.length / 3) * 1.5, t = twins(m);
  report(`${name}: closed and wound one way, no triangle without area, no two vertices in one place`, c.open === 0 && c.flipped === 0 && d === 0 && t === 0, `open ${c.open}, flipped ${c.flipped}, ${d} with no area, ${t} vertices on another`);
  report(`${name}: edges with four faces (a known limit) under 1 in 5,000`, c.bad <= edges / 5000, `${c.bad} of ${Math.round(edges)} edges`);
};
// A triangle points into the rock when, at every one of four points inside it, its normal is against the field's slope.
function outward(m, f, cell, name, most = 0) {
  const p = m.positions, ix = m.indices, h = cell * 1e-4;
  let wrong = 0, wrongArea = 0, all = 0;
  for (let t = 0; t < ix.length / 3; t++) {
    const { n, area: a } = triNormal(m, t);
    all += a;
    if (!(a > 0)) continue;
    let best = -1;
    for (const w of [[1 / 3, 1 / 3, 1 / 3], [0.6, 0.2, 0.2], [0.2, 0.6, 0.2], [0.2, 0.2, 0.6]]) {
      const q = [0, 1, 2].map((k) => p[ix[t * 3] * 3 + k] * w[0] + p[ix[t * 3 + 1] * 3 + k] * w[1] + p[ix[t * 3 + 2] * 3 + k] * w[2]);
      const g = [f(q[0] + h, q[1], q[2]) - f(q[0] - h, q[1], q[2]), f(q[0], q[1] + h, q[2]) - f(q[0], q[1] - h, q[2]), f(q[0], q[1], q[2] + h) - f(q[0], q[1], q[2] - h)];
      best = Math.max(best, (g[0] * n[0] + g[1] * n[1] + g[2] * n[2]) / (Math.hypot(...g) || 1));
    }
    if (best < -0.5) { wrong++; wrongArea += a; }
  }
  const share = wrongArea / all;
  report(`${name}: faces point out of the rock${most ? `, but for under ${(most * 100).toFixed(2)} percent of the area (a known limit)` : ''}`, share <= most, `${wrong} triangles point in, ${(share * 100).toFixed(4)} percent of the area`);
}

// The distance from a point to the nearest triangle of a mesh, by a grid of buckets size across.
export function nearest(m, size) {
  const p = m.positions, ix = m.indices, buckets = new Map();
  const key = (i, j, k) => `${i},${j},${k}`;
  for (let t = 0; t < ix.length / 3; t++) {
    const lo = [0, 1, 2].map((a) => Math.floor(Math.min(p[ix[t * 3] * 3 + a], p[ix[t * 3 + 1] * 3 + a], p[ix[t * 3 + 2] * 3 + a]) / size));
    const hi = [0, 1, 2].map((a) => Math.floor(Math.max(p[ix[t * 3] * 3 + a], p[ix[t * 3 + 1] * 3 + a], p[ix[t * 3 + 2] * 3 + a]) / size));
    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) {
      const kk = key(i, j, k);
      if (!buckets.has(kk)) buckets.set(kk, []);
      buckets.get(kk).push(t);
    }
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const toTri = (q, a, b, c) => {
    const ab = sub(b, a), ac = sub(c, a), ap = sub(q, a);
    const d1 = dot(ab, ap), d2 = dot(ac, ap);
    if (d1 <= 0 && d2 <= 0) return Math.hypot(...ap);
    const bp = sub(q, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
    if (d3 >= 0 && d4 <= d3) return Math.hypot(...bp);
    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return Math.hypot(...sub(q, [a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v])); }
    const cp = sub(q, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
    if (d6 >= 0 && d5 <= d6) return Math.hypot(...cp);
    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return Math.hypot(...sub(q, [a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w])); }
    const va = d3 * d6 - d5 * d4;
    if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return Math.hypot(...sub(q, [b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w])); }
    const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
    return Math.hypot(...sub(q, [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]));
  };
  const at = (v) => [p[v * 3], p[v * 3 + 1], p[v * 3 + 2]];
  return (q) => {
    const c = q.map((x) => Math.floor(x / size));
    let best = Infinity;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      for (const t of buckets.get(key(c[0] + i, c[1] + j, c[2] + k)) ?? []) best = Math.min(best, toTri(q, at(ix[t * 3]), at(ix[t * 3 + 1]), at(ix[t * 3 + 2])));
    }
    return best;
  };
}

async function checkCube() {
  const cell = 1.5, planes = cubePlanes();
  const m = await make('cube', [[-40, -40, -40], [40, 40, 40]], cell);
  let worst = 0;
  for (let v = 0; v < m.positions.length / 3; v++) worst = Math.max(worst, Math.abs(cubeTrue(m.positions[v * 3], m.positions[v * 3 + 1], m.positions[v * 3 + 2])));
  report('cube: every vertex on a face of the true cube within cell / 50', worst <= cell / 50, `worst ${(worst / cell).toExponential(2)} cells, ${m.positions.length / 3} vertices, ${m.indices.length / 3} triangles`);
  let cornerWorst = 0;
  for (const c of cubeCorners()) {
    let best = Infinity;
    for (let v = 0; v < m.positions.length / 3; v++) best = Math.min(best, Math.hypot(m.positions[v * 3] - c[0], m.positions[v * 3 + 1] - c[1], m.positions[v * 3 + 2] - c[2]));
    cornerWorst = Math.max(cornerWorst, best);
  }
  report('cube: the eight corners are there within cell / 20', cornerWorst <= cell / 20, `worst ${(cornerWorst / cell).toExponential(2)} cells`);
  let edgeWorst = 0;
  const corners = cubeCorners();
  for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) {
    if ([0, 1, 2].filter((k) => ((a >> k) & 1) !== ((b >> k) & 1)).length !== 1) continue;
    const A = corners[a], Bc = corners[b];
    for (let s = 1; s < 40; s++) {
      const t = s / 40, q = [0, 1, 2].map((k) => A[k] + (Bc[k] - A[k]) * t);
      let best = Infinity;
      for (let v = 0; v < m.positions.length / 3; v++) best = Math.min(best, Math.hypot(m.positions[v * 3] - q[0], m.positions[v * 3 + 1] - q[1], m.positions[v * 3 + 2] - q[2]));
      edgeWorst = Math.max(edgeWorst, best);
    }
  }
  let onEdge = 0;
  const edgeLine = [];
  for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) if ([0, 1, 2].filter((k) => ((a >> k) & 1) !== ((b >> k) & 1)).length === 1) edgeLine.push([corners[a], corners[b]]);
  const lineDist = (p, [A, Bc]) => {
    const d = [0, 1, 2].map((k) => Bc[k] - A[k]), w = [0, 1, 2].map((k) => p[k] - A[k]);
    const t = Math.max(0, Math.min(1, (w[0] * d[0] + w[1] * d[1] + w[2] * d[2]) / (d[0] ** 2 + d[1] ** 2 + d[2] ** 2)));
    return Math.hypot(w[0] - d[0] * t, w[1] - d[1] * t, w[2] - d[2] * t);
  };
  for (let v = 0; v < m.positions.length / 3; v++) {
    const p = [m.positions[v * 3], m.positions[v * 3 + 1], m.positions[v * 3 + 2]];
    if (edgeLine.some((e) => lineDist(p, e) < cell / 20)) onEdge++;
  }
  report('cube: the twelve edges are there, a vertex on each within cell / 20 every 40th of its length', edgeWorst <= cell * 0.75 && onEdge >= 12 * (40 / cell) * 0.9, `${onEdge} vertices lie on edges, the furthest point of an edge from a vertex ${(edgeWorst / cell).toFixed(2)} cells`);
  let worstAngle = 0;
  for (let t = 0; t < m.indices.length / 3; t++) {
    const { n } = triNormal(m, t);
    let best = -1;
    for (const p of planes) best = Math.max(best, n[0] * p.n[0] + n[1] * p.n[1] + n[2] * p.n[2]);
    worstAngle = Math.max(worstAngle, deg(best));
  }
  report('cube: every triangle faces as one of the six faces within half a degree', worstAngle <= 0.5, `worst ${worstAngle.toFixed(4)} degrees`);
  tight(m, cell, 'cube');
  outward(m, planesField(planes), cell, 'cube');
  report('cube: the area is the cube\'s within 0.1 percent', Math.abs(area(m) / (6 * (2 * CUBE.half) ** 2) - 1) < 1e-3, `${(area(m) / (6 * (2 * CUBE.half) ** 2) * 100 - 100).toFixed(4)} percent`);
  return m;
}

async function checkHundred(threads) {
  const cell = 2, scene = pieces(HUNDRED);
  const m = await make('hundred', HUNDRED.span.box, cell, { threads });
  tight(m, cell, `hundred pieces, ${threads} threads`);
  outward(m, scene.value, cell, 'hundred pieces', 5e-4);
  let match = 0;
  const nt = m.indices.length / 3;
  for (let t = 0; t < nt; t++) {
    const { n, mid } = triNormal(m, t);
    let ok = false;
    for (const id of scene.near(...mid)) {
      for (const p of scene.list[id].planes) {
        if (n[0] * p.n[0] + n[1] * p.n[1] + n[2] * p.n[2] < Math.cos(Math.PI / 180)) continue;
        if (Math.abs(p.n[0] * mid[0] + p.n[1] * mid[1] + p.n[2] * mid[2] - p.d) < cell * 0.02) { ok = true; break; }
      }
      if (ok) break;
    }
    if (ok) match++;
  }
  report('hundred pieces: over 95 percent of triangles lie on a true face, within one degree', match / nt > 0.95, `${((match / nt) * 100).toFixed(2)} percent of ${nt} triangles, ${m.stats.evals} field calls, ${m.stats.held} of ${m.stats.held + m.stats.solved} vertices held inside their cell`);
  return { m, scene };
}

async function checkSphere() {
  const cell = 1.25, R = 37.3, c = [0.21, -0.13, 0.07];
  const m = await make('sphere', [[-45, -45, -45], [45, 45, 45]], cell);
  let worst = 0;
  for (let v = 0; v < m.positions.length / 3; v++) worst = Math.max(worst, Math.abs(Math.hypot(m.positions[v * 3] - c[0], m.positions[v * 3 + 1] - c[1], m.positions[v * 3 + 2] - c[2]) - R));
  report('sphere: every vertex within cell / 20 of the radius', worst <= cell / 20, `worst ${(worst / cell).toExponential(2)} cells`);
  const a = area(m), truth = 4 * Math.PI * R * R;
  report('sphere: the area within one percent', Math.abs(a / truth - 1) < 0.01, `${((a / truth - 1) * 100).toFixed(3)} percent`);
  tight(m, cell, 'sphere');
}

async function checkThin() {
  const cell = 1;
  const s = await make('sheet', [[-36, -8, -36], [36, 8, 36]], cell);
  let top = 0, under = 0;
  for (let v = 0; v < s.positions.length / 3; v++) {
    const y = s.positions[v * 3 + 1];
    if (Math.abs(y - (SHEET.c[1] + SHEET.h[1])) < 1e-3) top++;
    if (Math.abs(y - (SHEET.c[1] - SHEET.h[1])) < 1e-3) under++;
  }
  report('sheet two cells thick: both faces there', top > 3000 && under > 3000, `${top} vertices on the top, ${under} on the underside`);
  tight(s, cell, 'sheet');
  const t = await make('slot', [[-30, -30, -30], [30, 30, 30]], cell);
  let walls = [0, 0], inGap = 0;
  for (let v = 0; v < t.positions.length / 3; v++) {
    const x = t.positions[v * 3] - SLOT.c[0], y = t.positions[v * 3 + 1] - SLOT.c[1], z = t.positions[v * 3 + 2] - SLOT.c[2];
    if (y < -19 || y > 22 || Math.abs(z) > 22) continue;
    if (Math.abs(x - SLOT.gap) < 1e-3) walls[0]++;
    else if (Math.abs(x + SLOT.gap) < 1e-3) walls[1]++;
    else if (Math.abs(x) < SLOT.gap * 0.9) inGap++;
  }
  report('slot two cells wide: both walls there and nothing across it', walls[0] > 500 && walls[1] > 500 && inGap === 0, `${walls[0]} and ${walls[1]} vertices on the walls, ${inGap} inside the slot`);
  tight(t, cell, 'slot');
}

async function checkThreads(many) {
  const one = await make('hundred', HUNDRED.span.box, 2, { threads: 1 });
  const same = one.positions.length === many.positions.length && one.indices.length === many.indices.length
    && one.positions.every((v, i) => Object.is(v, many.positions[i])) && one.indices.every((v, i) => v === many.indices[i]);
  report('threads: one thread and many give the same mesh exactly', same, `${one.indices.length / 3} and ${many.indices.length / 3} triangles`);
}

async function checkSimplify({ m, scene }) {
  const err = 0.05, gap = nearest(m, 2);
  const away = (r) => {
    let worst = 0, over = 0, samples = 0;
    for (let t = 0; t < r.indices.length / 3; t++) {
      const p = r.positions, i = r.indices;
      for (const [w0, w1, w2] of [[1 / 3, 1 / 3, 1 / 3], [0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.7, 0.15, 0.15], [0.15, 0.7, 0.15], [0.15, 0.15, 0.7]]) {
        const d = gap([0, 1, 2].map((k) => p[i[t * 3] * 3 + k] * w0 + p[i[t * 3 + 1] * 3 + k] * w1 + p[i[t * 3 + 2] * 3 + k] * w2));
        worst = Math.max(worst, d);
        if (d > err) over++;
        samples++;
      }
    }
    return { worst, share: over / samples };
  };
  const still = (r) => r.source.every((u, i) => r.positions[i * 3] === m.positions[u * 3] && r.positions[i * 3 + 1] === m.positions[u * 3 + 1] && r.positions[i * 3 + 2] === m.positions[u * 3 + 2]);
  const s = await simplify(m, { error: err });
  const before = m.indices.length / 3, after = s.indices.length / 3;
  report('simplify: the hundred pieces fall at least five times at 0.05', before / after >= 5, `${before} to ${after} triangles, ${(before / after).toFixed(1)} times`);
  const a = away(s);
  report('simplify: no vertex moves, and 98 percent of the reduced surface is within the error of the made one (the simplifier only estimates its error)', still(s) && a.share < 0.02, `${(a.share * 100).toFixed(3)} percent of points on its triangles further than ${err}, the furthest ${a.worst.toFixed(3)}`);
  const sure = await simplify(m, { error: err, strict: true });
  const b = away(sure);
  report('simplify, strict: 99.9 percent within the error, nothing further than three times it', still(sure) && b.share < 1e-3 && b.worst <= 3 * err, `${sure.indices.length / 3} triangles, ${(b.share * 100).toFixed(4)} percent further than ${err}, the furthest ${b.worst.toFixed(3)}, ${sure.stray} triangles still stray after ${sure.rounds} tries`);
  const c = closed(s), d = degenerate(s, 2);
  report('simplified: closed and wound one way', c.open === 0 && c.flipped === 0, `open ${c.open}, flipped ${c.flipped}, ${c.bad} edges with four faces`);
  report('simplified: triangles with no area (a known limit) under 1 in 5,000', d <= after / 5000, `${d} of ${after}`);

  const box = await make('sheet', [[-36, -8, -36], [36, 8, 36]], 1);
  const step = new Float32Array(box.positions.length / 3);
  for (let v = 0; v < step.length; v++) step[v] = box.positions[v * 3] > 0.5 ? 1 : 0;
  const plain = await simplify(box, { error: err });
  const lit = await simplify(box, { error: err, attributes: step, weights: [0.5] });
  const across = (r) => {
    let widest = 0, n = 0;
    for (let t = 0; t < r.indices.length / 3; t++) {
      const xs = [0, 1, 2].map((k) => r.positions[r.indices[t * 3 + k] * 3]), ys = [0, 1, 2].map((k) => r.positions[r.indices[t * 3 + k] * 3 + 1]);
      if (!ys.every((y) => Math.abs(y - (SHEET.c[1] + SHEET.h[1])) < 1e-3)) continue;
      if (Math.min(...xs) < 0.5 && Math.max(...xs) > 0.5) { n++; widest = Math.max(widest, Math.max(...xs) - Math.min(...xs)); }
    }
    return { widest, n };
  };
  const flat = across(plain), stepped = across(lit);
  const kept = lit.attributes.every((v, i) => v === step[lit.source[i]]);
  report('simplify: a step in a stored value keeps triangles small along it', stepped.widest <= 2.01 && flat.widest > 10 && kept, `plain ${plain.indices.length / 3} triangles, widest across the step ${flat.widest.toFixed(1)}; with the step ${lit.indices.length / 3} triangles, widest ${stepped.widest.toFixed(2)}`);
}

async function checkCrease(cube) {
  const planes = cubePlanes();
  const c = creased(cube, 30);
  let worst = 0;
  for (let v = 0; v < c.normals.length / 3; v++) {
    let best = -1;
    for (const p of planes) best = Math.max(best, c.normals[v * 3] * p.n[0] + c.normals[v * 3 + 1] * p.n[1] + c.normals[v * 3 + 2] * p.n[2]);
    worst = Math.max(worst, deg(best));
  }
  let groups = 0, exact = true;
  for (const k of cubeCorners()) {
    let id = -1, best = Infinity;
    for (let v = 0; v < cube.positions.length / 3; v++) {
      const d = Math.hypot(cube.positions[v * 3] - k[0], cube.positions[v * 3 + 1] - k[1], cube.positions[v * 3 + 2] - k[2]);
      if (d < best) { best = d; id = v; }
    }
    const seen = [];
    for (let v = 0; v < c.source.length; v++) {
      if (c.source[v] !== id) continue;
      const n = [c.normals[v * 3], c.normals[v * 3 + 1], c.normals[v * 3 + 2]];
      if (!planes.some((p) => deg(n[0] * p.n[0] + n[1] * p.n[1] + n[2] * p.n[2]) < 0.05)) exact = false;
      if (!seen.some((s) => deg(s[0] * n[0] + s[1] * n[1] + s[2] * n[2]) < 1)) seen.push(n);
    }
    groups += seen.length;
  }
  report('creased at 30 degrees: 24 distinct normals at the corners, each a face normal within 0.05 degrees', groups === 24 && exact && worst < 0.05, `${groups} at the corners, the worst normal anywhere ${worst.toExponential(2)} degrees off a face`);

  const cell = 1.5, radius = 2.5;
  const k = curvature(cube, radius);
  const corners = cubeCorners();
  const edges = [];
  for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) if ([0, 1, 2].filter((q) => ((a >> q) & 1) !== ((b >> q) & 1)).length === 1) edges.push([corners[a], corners[b]]);
  const toEdge = (p) => Math.min(...edges.map(([A, B]) => {
    const d = [0, 1, 2].map((q) => B[q] - A[q]), w = [0, 1, 2].map((q) => p[q] - A[q]);
    const t = Math.max(0, Math.min(1, (w[0] * d[0] + w[1] * d[1] + w[2] * d[2]) / (d[0] ** 2 + d[1] ** 2 + d[2] ** 2)));
    return Math.hypot(w[0] - d[0] * t, w[1] - d[1] * t, w[2] - d[2] * t);
  }));
  let edgeMin = Infinity, faceMax = 0;
  for (let v = 0; v < k.length; v++) {
    const d = toEdge([cube.positions[v * 3], cube.positions[v * 3 + 1], cube.positions[v * 3 + 2]]);
    if (d < cell * 0.05) edgeMin = Math.min(edgeMin, k[v]);
    else if (d > radius + cell * 1.5) faceMax = Math.max(faceMax, Math.abs(k[v]));
  }
  report('curvature: over 0 along the cube\'s edges, 0 on its faces', edgeMin > 0.05 && faceMax < 1e-4, `least on an edge ${edgeMin.toFixed(4)}, most on a face ${faceMax.toExponential(2)}, per unit`);

  const ell = await make('ell', [[-30, -16, -16], [26, 40, 16]], 1);
  const ke = curvature(ell, 2);
  const inner = [LBOX[1][0][0] + LBOX[1][1][0], LBOX[0][0][1] + LBOX[0][1][1]];
  let innerMax = -Infinity, n = 0;
  for (let v = 0; v < ke.length; v++) {
    const x = ell.positions[v * 3], y = ell.positions[v * 3 + 1], z = ell.positions[v * 3 + 2];
    if (Math.hypot(x - inner[0], y - inner[1]) < 0.05 && Math.abs(z - LBOX[0][0][2]) < 7) { innerMax = Math.max(innerMax, ke[v]); n++; }
  }
  report('curvature: under 0 along the inside edge of an L', n > 5 && innerMax < -0.05, `${n} vertices on it, the most ${innerMax.toFixed(4)} per unit`);
  tight(ell, 1, 'L');
}

function checkHelpers(cube) {
  const w = weld(merge([cube, cube]), 1e-5);
  const same = w.positions.length === cube.positions.length && w.indices.length === 2 * cube.indices.length;
  const b = bounds(cube), moved = transform({ ...cube, normals: creased(cube, 30).normals.subarray(0, cube.positions.length) }, [2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 0, 0, 1]);
  const bm = bounds(moved);
  const ok = same && Math.abs(bm[0][0] - (b[0][0] * 2 + 5)) < 1e-4 && Math.abs(bm[1][0] - (b[1][0] * 2 + 5)) < 1e-4;
  report('weld, merge, transform and bounds agree with each other', ok, `${w.positions.length / 3} vertices after welding two copies of ${cube.positions.length / 3}`);
}

async function timing() {
  const threads = availableParallelism();
  const before = process.memoryUsage().rss;
  let peak = before;
  const watch = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 50);
  const t0 = performance.now();
  const m = await make('shell', SHELL.span.box, 2.5, { threads });
  const t1 = performance.now();
  clearInterval(watch);
  const c = closed(m);
  console.log(`TIME  4000 pieces in a shell 1300 across at a cell of 2.5: ${(m.indices.length / 3).toLocaleString()} triangles, ${(m.positions.length / 3).toLocaleString()} vertices`);
  console.log(`      ${((t1 - t0) / 1000).toFixed(1)} s on ${threads} threads (grid ${m.stats.seconds.grid.toFixed(1)} s, joining ${m.stats.seconds.join.toFixed(1)} s), ${m.stats.evals.toLocaleString()} field calls`);
  console.log(`      process memory (all threads) ${(peak / 2 ** 20).toFixed(0)} MB at most, the mesh ${((m.positions.byteLength + m.indices.byteLength) / 2 ** 20).toFixed(0)} MB, ${m.stats.held} vertices held inside their cell`);
  tight(m, 2.5, 'shell');
  const t2 = performance.now();
  const s = await simplify(m, { error: 0.05 });
  console.log(`TIME  simplify at 0.05: ${(m.indices.length / 3).toLocaleString()} to ${(s.indices.length / 3).toLocaleString()} triangles in ${((performance.now() - t2) / 1000).toFixed(1)} s`);
}

async function main() {
  const quick = process.argv.includes('--quick');
  const cube = await checkCube();
  const hundred = await checkHundred(availableParallelism());
  await checkSphere();
  await checkThin();
  await checkThreads(hundred.m);
  await checkSimplify(hundred);
  await checkCrease(cube);
  checkHelpers(cube);
  if (!quick) await timing();
  console.log(failed ? `${failed} FAILED` : 'ALL PASS');
  process.exit(failed ? 1 : 0);
}

if (isMainThread && process.argv[1] === SELF) main().catch((e) => { console.error(e); process.exit(1); });
