// One worker of the surface maker (surface.mjs): it loads the field's module, then turns slabs of the grid into
// vertices (one for each sheet of surface in each cell) and the crossing edges each slab owns. Started by surface.mjs
// with its grid in workerData. It is sent { slab } and answers with that slab's arrays.
import { parentPort, workerData } from 'node:worker_threads';

const { module, args, origin, cell, nc, B, slabWidth, cut, margin, gap, root, exact, step, agree, beside, snug: SNUG, same: SAME, apart: APART } = workerData;
const mod = await import(module);
if (mod.setup) await mod.setup(args);
if (typeof mod.field !== 'function') throw new Error(`surface: ${module} does not export field(x, y, z)`);
const raw = mod.field;
const lip = mod.lip ?? 1.5;
let evals = 0;
const field = (x, y, z) => { evals++; return raw(x, y, z); };

const [ncx, ncy, ncz] = nc;
const np = [ncx + 1, ncy + 1, ncz + 1];
const nb = nc.map((n) => Math.ceil(n / B));
const at = (a, i) => origin[a] + i * cell;

const BIT = (x, y, z) => x | (y << 1) | (z << 2);
const EDGE = [];
for (let a = 0; a < 3; a++) {
  for (let o = 0; o < 4; o++) {
    const off = [0, 0, 0];
    off[(a + 1) % 3] = o & 1;
    off[(a + 2) % 3] = o >> 1;
    const c0 = BIT(off[0], off[1], off[2]);
    off[a] = 1;
    EDGE.push({ a, c0, c1: BIT(off[0], off[1], off[2]), off: [...off].map((v, i) => (i === a ? 0 : v)) });
  }
}
const edgeOf = (p, q) => EDGE.findIndex((e) => (e.c0 === p && e.c1 === q) || (e.c0 === q && e.c1 === p));
const FACES = [];
for (let a = 0; a < 3; a++) {
  for (let s = 0; s < 2; s++) {
    const b = (a + 1) % 3, c = (a + 2) % 3;
    const corner = (ob, oc) => { const o = [0, 0, 0]; o[a] = s; o[b] = ob; o[c] = oc; return BIT(o[0], o[1], o[2]); };
    const q = [corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)];
    FACES.push({ q, e: [edgeOf(q[0], q[1]), edgeOf(q[1], q[2]), edgeOf(q[2], q[3]), edgeOf(q[3], q[0])] });
  }
}

class Grow {
  constructor(Type, n = 1 << 12) { this.Type = Type; this.a = new Type(n); this.n = 0; }
  push(v) { if (this.n === this.a.length) { const b = new this.Type(this.a.length * 2); b.set(this.a); this.a = b; } this.a[this.n++] = v; }
  done() { return this.a.slice(0, this.n); }
}

const P = B + 1;
const vals = new Float64Array(P * P * P);
const xstamp = new Int32Array(P * P * P * 3);
const xdata = new Float64Array(P * P * P * 3 * 6);
let stamp = 0;

const up = new Int8Array(12);
const find = (i) => { while (up[i] !== i) i = up[i] = up[up[i]]; return i; };
const join = (i, j) => { i = find(i); j = find(j); if (i !== j) up[Math.max(i, j)] = Math.min(i, j); };

// The corners of a cell joined through the inside or through the outside: by edges, across a face whose middle the
// field puts on their side, and, for tube, through the middle of the cell. 8 is the middle.
const side = new Int8Array(9);
const top = (i) => { while (side[i] !== i) i = side[i] = side[side[i]]; return i; };
const unite = (i, j) => { i = top(i); j = top(j); if (i !== j) side[Math.max(i, j)] = Math.min(i, j); };

// Two loops of crossings in one cell are one sheet, a tube, when they part the same inside from the same outside.
// Corners on the side of the cell's middle are joined through it when the field puts the point halfway to the
// middle on that side too, which keeps a convex solid whose corners meet only through the cell in one piece.
function tube(config, gi, gj, gk, comp, ncomp) {
  const cx = at(0, gi + 0.5), cy = at(1, gj + 0.5), cz = at(2, gk + 0.5);
  const inside = field(cx, cy, cz) < 0;
  for (let c = 0; c < 8; c++) {
    if ((((config >> c) & 1) === 1) !== inside) continue;
    const x = at(0, gi + (c & 1)), y = at(1, gj + ((c >> 1) & 1)), z = at(2, gk + (c >> 2));
    if ((field((x + cx) / 2, (y + cy) / 2, (z + cz) / 2) < 0) === inside) unite(c, 8);
  }
  const keys = [], map = new Int8Array(4);
  for (let c = 0; c < ncomp; c++) {
    let e = 0;
    while (comp[e] !== c) e++;
    const E = EDGE[e], c0In = ((config >> E.c0) & 1) === 1;
    const key = top(c0In ? E.c0 : E.c1) * 9 + top(c0In ? E.c1 : E.c0);
    let k = keys.indexOf(key);
    if (k < 0) { k = keys.length; keys.push(key); }
    map[c] = k;
  }
  for (let e = 0; e < 12; e++) if (comp[e] >= 0) comp[e] = map[comp[e]];
  return keys.length;
}

const q = new Float64Array(12 * 3), n = new Float64Array(12 * 3);
const A = new Float64Array(9), V = new Float64Array(9), w = new Float64Array(3);

function eigen(m) {
  const a = [m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]];
  V.fill(0); V[0] = V[4] = V[8] = 1;
  for (let sweep = 0; sweep < 24; sweep++) {
    const off = a[1] * a[1] + a[2] * a[2] + a[5] * a[5];
    if (off < 1e-30 * (a[0] * a[0] + a[4] * a[4] + a[8] * a[8] + 1e-300)) break;
    for (const [p, r] of [[0, 1], [0, 2], [1, 2]]) {
      const apr = a[p * 3 + r];
      if (Math.abs(apr) < 1e-300) continue;
      const app = a[p * 4], arr = a[r * 4];
      const theta = (arr - app) / (2 * apr);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const cs = 1 / Math.sqrt(t * t + 1), sn = t * cs;
      for (let k = 0; k < 3; k++) {
        const akp = a[k * 3 + p], akr = a[k * 3 + r];
        a[k * 3 + p] = cs * akp - sn * akr;
        a[k * 3 + r] = sn * akp + cs * akr;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p * 3 + k], ark = a[r * 3 + k];
        a[p * 3 + k] = cs * apk - sn * ark;
        a[r * 3 + k] = sn * apk + cs * ark;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = V[k * 3 + p], vkr = V[k * 3 + r];
        V[k * 3 + p] = cs * vkp - sn * vkr;
        V[k * 3 + r] = sn * vkp + cs * vkr;
      }
    }
  }
  w[0] = a[0]; w[1] = a[4]; w[2] = a[8];
}

// The field's slope at a point whose value is f0, by central differences, into G. It is true only when the
// differences forward and back agree on every axis: where they do not, the point is within a step of a crease and
// the central difference mixes the slopes of two faces, which is a normal no face has.
const G = new Float64Array(3), KEEP = new Float64Array(3);
function slope(x, y, z, f0) {
  const h = step;
  const fx = field(x + h, y, z), bx = field(x - h, y, z);
  const fy = field(x, y + h, z), by = field(x, y - h, z);
  const fz = field(x, y, z + h), bz = field(x, y, z - h);
  G[0] = (fx - bx) / (2 * h); G[1] = (fy - by) / (2 * h); G[2] = (fz - bz) / (2 * h);
  const apart = Math.abs(fx + bx - 2 * f0) + Math.abs(fy + by - 2 * f0) + Math.abs(fz + bz - 2 * f0);
  return apart <= agree * h * (Math.abs(G[0]) + Math.abs(G[1]) + Math.abs(G[2]));
}

// The root on a grid edge by false position (Illinois), which a flat face gives exactly in one step, and the normal
// of the face it lies on. A root within a step of a crease takes the slope from a point beside it whose face passes
// through the root, so its normal is always one face's own; if none is found it has no normal and adds no plane.
function crossing(lx, ly, lz, a, gx, gy, gz, f0, f1) {
  const li = (lx + P * (ly + P * lz)) * 3 + a;
  if (xstamp[li] === stamp) return li * 6;
  xstamp[li] = stamp;
  const x0 = at(0, gx), y0 = at(1, gy), z0 = at(2, gz);
  const d = [0, 0, 0]; d[a] = cell;
  let ta = 0, tb = 1, fa = f0, fb = f1, t = 0.5, ft = 0, last = 0;
  const ina = fa < 0;
  if (fa === 0 || fb === 0) { t = fa === 0 ? 0 : 1; ft = 0; } else {
    for (let i = 0; i < root; i++) {
      t = ta + (tb - ta) * (fa / (fa - fb));
      if (!(t > ta && t < tb)) t = (ta + tb) / 2;
      ft = field(x0 + d[0] * t, y0 + d[1] * t, z0 + d[2] * t);
      if (Math.abs(ft) <= exact || tb - ta <= 1e-13) break;
      if ((ft < 0) === ina) { ta = t; fa = ft; if (last === -1) fb /= 2; last = -1; } else { tb = t; fb = ft; if (last === 1) fa /= 2; last = 1; }
    }
  }
  const px = x0 + d[0] * t, py = y0 + d[1] * t, pz = z0 + d[2] * t;
  let nx = 0, ny = 0, nz = 0;
  if (slope(px, py, pz, ft)) { nx = G[0]; ny = G[1]; nz = G[2]; } else {
    let best = Infinity;
    for (let k = 0; k < 6; k++) {
      const s = k & 1 ? -beside : beside, ax = k >> 1;
      const qx = px + (ax === 0 ? s : 0), qy = py + (ax === 1 ? s : 0), qz = pz + (ax === 2 ? s : 0);
      const fq = field(qx, qy, qz);
      if (!slope(qx, qy, qz, fq)) continue;
      const r = Math.abs(fq - s * G[ax] - ft);
      if (r < best) { best = r; KEEP.set(G); }
    }
    if (best <= step) { nx = KEEP[0]; ny = KEEP[1]; nz = KEEP[2]; }
  }
  const len = Math.hypot(nx, ny, nz);
  if (len > 0 && Number.isFinite(len)) { nx /= len; ny /= len; nz /= len; } else { nx = ny = nz = 0; }
  const o = li * 6;
  xdata[o] = px; xdata[o + 1] = py; xdata[o + 2] = pz; xdata[o + 3] = nx; xdata[o + 4] = ny; xdata[o + 5] = nz;
  return o;
}

const out3 = new Float64Array(3);
const qefError = (x, y, z, k) => {
  let e = 0;
  for (let i = 0; i < k; i++) {
    const d = n[i * 3] * (x - q[i * 3]) + n[i * 3 + 1] * (y - q[i * 3 + 1]) + n[i * 3 + 2] * (z - q[i * 3 + 2]);
    e += d * d;
  }
  return e;
};

// The planes' least squares, solved round the mean, with directions too weak to trust left at the mean.
function solve(k, mx, my, mz, lo, hi) {
  A.fill(0);
  let bx = 0, by = 0, bz = 0;
  for (let i = 0; i < k; i++) {
    const ax = n[i * 3], ay = n[i * 3 + 1], az = n[i * 3 + 2];
    A[0] += ax * ax; A[1] += ax * ay; A[2] += ax * az; A[4] += ay * ay; A[5] += ay * az; A[8] += az * az;
    const dd = ax * (q[i * 3] - mx) + ay * (q[i * 3 + 1] - my) + az * (q[i * 3 + 2] - mz);
    bx += ax * dd; by += ay * dd; bz += az * dd;
  }
  A[3] = A[1]; A[6] = A[2]; A[7] = A[5];
  eigen(A);
  const top = Math.max(w[0], w[1], w[2]);
  if (!(top > 0)) return false;
  let x = mx, y = my, z = mz;
  for (let j = 0; j < 3; j++) {
    if (!(w[j] > cut * top)) continue;
    const ux = V[j], uy = V[3 + j], uz = V[6 + j];
    const s = (ux * bx + uy * by + uz * bz) / w[j];
    x += s * ux; y += s * uy; z += s * uz;
  }
  if (!(x >= lo[0] - margin && x <= hi[0] + margin && y >= lo[1] - margin && y <= hi[1] + margin && z >= lo[2] - margin && z <= hi[2] + margin)) return false;
  out3[0] = x; out3[1] = y; out3[2] = z;
  return true;
}

// Where the planes' meeting point is out of reach: the best point within reach that is on the surface and on one of
// the lines or corners where two or three of the planes meet, so the vertex still lies on a sharp edge.
const PL = new Float64Array(12 * 4);
function feature(k, mx, my, mz, lo, hi, room) {
  let np = 0;
  for (let i = 0; i < k; i++) {
    const ax = n[i * 3], ay = n[i * 3 + 1], az = n[i * 3 + 2];
    if (!(ax * ax + ay * ay + az * az > 0.5)) continue;
    let j = 0;
    for (; j < np; j++) if (PL[j * 4] * ax + PL[j * 4 + 1] * ay + PL[j * 4 + 2] * az > SAME) break;
    if (j === np) { PL[np * 4] = ax; PL[np * 4 + 1] = ay; PL[np * 4 + 2] = az; PL[np * 4 + 3] = ax * q[i * 3] + ay * q[i * 3 + 1] + az * q[i * 3 + 2]; np++; }
  }
  if (np < 2) return false;
  const l0 = [lo[0] - room, lo[1] - room, lo[2] - room], h0 = [hi[0] + room, hi[1] + room, hi[2] + room];
  let best = Infinity, bx = 0, by = 0, bz = 0;
  const offer = (x, y, z) => {
    if (x < l0[0] || x > h0[0] || y < l0[1] || y > h0[1] || z < l0[2] || z > h0[2]) return;
    const e = qefError(x, y, z, k) + 1e-9 * ((x - mx) ** 2 + (y - my) ** 2 + (z - mz) ** 2);
    if (e >= best) return;
    if (Math.abs(field(x, y, z)) > cell * SNUG) return;
    best = e; bx = x; by = y; bz = z;
  };
  for (let a = 0; a < np; a++) for (let b = a + 1; b < np; b++) {
    const n1 = [PL[a * 4], PL[a * 4 + 1], PL[a * 4 + 2]], n2 = [PL[b * 4], PL[b * 4 + 1], PL[b * 4 + 2]];
    const d = [n1[1] * n2[2] - n1[2] * n2[1], n1[2] * n2[0] - n1[0] * n2[2], n1[0] * n2[1] - n1[1] * n2[0]];
    const dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    if (dd < APART * APART) continue;
    const c12 = n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2];
    const r1 = PL[a * 4 + 3] - (n1[0] * mx + n1[1] * my + n1[2] * mz), r2 = PL[b * 4 + 3] - (n2[0] * mx + n2[1] * my + n2[2] * mz);
    const det = 1 - c12 * c12;
    const al = (r1 - c12 * r2) / det, be = (r2 - c12 * r1) / det;
    const P = [mx + al * n1[0] + be * n2[0], my + al * n1[1] + be * n2[1], mz + al * n1[2] + be * n2[2]];
    let t0 = -Infinity, t1 = Infinity;
    for (let ax = 0; ax < 3; ax++) {
      if (Math.abs(d[ax]) < 1e-12) { if (P[ax] < l0[ax] || P[ax] > h0[ax]) { t0 = Infinity; break; } continue; }
      let u = (l0[ax] - P[ax]) / d[ax], v = (h0[ax] - P[ax]) / d[ax];
      if (u > v) { const w2 = u; u = v; v = w2; }
      t0 = Math.max(t0, u); t1 = Math.min(t1, v);
    }
    if (!(t0 <= t1)) continue;
    let num = 0, den = 0;
    for (let i = 0; i < k; i++) {
      const nd = n[i * 3] * d[0] + n[i * 3 + 1] * d[1] + n[i * 3 + 2] * d[2];
      const r = n[i * 3] * (P[0] - q[i * 3]) + n[i * 3 + 1] * (P[1] - q[i * 3 + 1]) + n[i * 3 + 2] * (P[2] - q[i * 3 + 2]);
      num += nd * r; den += nd * nd;
    }
    const tm = den > 1e-18 ? -num / den : 0;
    for (const t of [Math.min(t1, Math.max(t0, tm)), t0, t1]) offer(P[0] + t * d[0], P[1] + t * d[1], P[2] + t * d[2]);
  }
  for (let a = 0; a < np; a++) for (let b = a + 1; b < np; b++) for (let c = b + 1; c < np; c++) {
    const m = [a, b, c].map((i) => [PL[i * 4], PL[i * 4 + 1], PL[i * 4 + 2]]), r = [a, b, c].map((i) => PL[i * 4 + 3]);
    const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    if (Math.abs(det) < APART * APART * APART) continue;
    const col = (j) => {
      const M = m.map((row, i) => row.map((v, jj) => (jj === j ? r[i] : v)));
      return (M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])) / det;
    };
    offer(col(0), col(1), col(2));
  }
  if (best === Infinity) return false;
  out3[0] = bx; out3[1] = by; out3[2] = bz;
  return true;
}

// The least squares kept inside the cell: each coordinate free or held at a wall, the best that stays inside.
function boxed(k, mx, my, mz, lo, hi) {
  let best = Infinity, bx = mx, by = my, bz = mz;
  const mass = [mx, my, mz];
  for (let combo = 0; combo < 27; combo++) {
    const st = [combo % 3, ((combo / 3) | 0) % 3, ((combo / 9) | 0) % 3];
    const fixed = [0, 0, 0], val = [0, 0, 0];
    for (let a = 0; a < 3; a++) if (st[a]) { fixed[a] = 1; val[a] = st[a] === 1 ? lo[a] : hi[a]; }
    const free = [0, 1, 2].filter((a) => !fixed[a]);
    const p = [0, 0, 0];
    for (let a = 0; a < 3; a++) p[a] = fixed[a] ? val[a] : mass[a];
    if (free.length) {
      const m = free.length;
      const M = new Float64Array(m * m), r = new Float64Array(m);
      for (let i = 0; i < k; i++) {
        const nn = [n[i * 3], n[i * 3 + 1], n[i * 3 + 2]];
        const res = nn[0] * (p[0] - q[i * 3]) + nn[1] * (p[1] - q[i * 3 + 1]) + nn[2] * (p[2] - q[i * 3 + 2]);
        for (let u = 0; u < m; u++) {
          r[u] -= nn[free[u]] * res;
          for (let v = 0; v < m; v++) M[u * m + v] += nn[free[u]] * nn[free[v]];
        }
      }
      const s = small(M, r, m);
      for (let u = 0; u < m; u++) p[free[u]] += s[u];
    }
    if (p[0] < lo[0] - 1e-9 || p[0] > hi[0] + 1e-9 || p[1] < lo[1] - 1e-9 || p[1] > hi[1] + 1e-9 || p[2] < lo[2] - 1e-9 || p[2] > hi[2] + 1e-9) continue;
    const e = qefError(p[0], p[1], p[2], k) + 1e-12 * ((p[0] - mx) ** 2 + (p[1] - my) ** 2 + (p[2] - mz) ** 2);
    if (e < best) { best = e; bx = p[0]; by = p[1]; bz = p[2]; }
  }
  out3[0] = bx; out3[1] = by; out3[2] = bz;
}

function small(M, r, m) {
  if (m === 3) {
    for (let i = 0; i < 9; i++) A[i] = M[i];
    eigen(A);
    const top = Math.max(w[0], w[1], w[2]);
    const s = [0, 0, 0];
    for (let j = 0; j < 3; j++) {
      if (!(w[j] > cut * top) || !(top > 0)) continue;
      const d = (V[j] * r[0] + V[3 + j] * r[1] + V[6 + j] * r[2]) / w[j];
      s[0] += d * V[j]; s[1] += d * V[3 + j]; s[2] += d * V[6 + j];
    }
    return s;
  }
  if (m === 2) {
    const a = M[0], b = M[1], d = M[3];
    const tr = a + d, det = a * d - b * b;
    const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
    if (!(l1 > 0)) return [0, 0];
    const vec = (l) => { let x = b, y = l - a; if (Math.abs(x) + Math.abs(y) < 1e-300) { x = l - d; y = b; } if (Math.abs(x) + Math.abs(y) < 1e-300) { x = 1; y = 0; } const h = Math.hypot(x, y); return [x / h, y / h]; };
    const s = [0, 0];
    const v1 = vec(l1);
    const d1 = (v1[0] * r[0] + v1[1] * r[1]) / l1;
    s[0] += d1 * v1[0]; s[1] += d1 * v1[1];
    if (l2 > cut * l1) {
      const v2 = [-v1[1], v1[0]];
      const d2 = (v2[0] * r[0] + v2[1] * r[1]) / l2;
      s[0] += d2 * v2[0]; s[1] += d2 * v2[1];
    }
    return s;
  }
  return M[0] > 0 ? [r[0] / M[0]] : [0];
}

// A vertex the planes put off the surface is brought back onto it along the field's slope.
function settle(lo, hi, room) {
  let x = out3[0], y = out3[1], z = out3[2];
  const keep = (v, a) => Math.min(hi[a] + room, Math.max(lo[a] - room, v));
  let v = field(x, y, z);
  if (Math.abs(v) <= cell * SNUG) return false;
  for (let i = 0; i < 4 && Math.abs(v) > cell * SNUG; i++) {
    const gx = (field(x + step, y, z) - field(x - step, y, z)) / (2 * step);
    const gy = (field(x, y + step, z) - field(x, y - step, z)) / (2 * step);
    const gz = (field(x, y, z + step) - field(x, y, z - step)) / (2 * step);
    const g2 = gx * gx + gy * gy + gz * gz;
    if (!(g2 > 1e-12)) break;
    x = keep(x - (v * gx) / g2, 0); y = keep(y - (v * gy) / g2, 1); z = keep(z - (v * gz) / g2, 2);
    v = field(x, y, z);
  }
  out3[0] = x; out3[1] = y; out3[2] = z;
  return true;
}

function leaf(bx, by, bz, o) {
  const i0 = bx * B, j0 = by * B, k0 = bz * B;
  const i1 = Math.min(i0 + B, ncx), j1 = Math.min(j0 + B, ncy), k1 = Math.min(k0 + B, ncz);
  const px = i1 - i0 + 1, py = j1 - j0 + 1, pz = k1 - k0 + 1;
  let neg = 0, pos = 0;
  for (let k = 0; k < pz; k++) {
    const z = at(2, k0 + k);
    for (let j = 0; j < py; j++) {
      const y = at(1, j0 + j);
      for (let i = 0; i < px; i++) {
        const v = field(at(0, i0 + i), y, z);
        vals[i + P * (j + P * k)] = v;
        if (v < 0) neg++; else pos++;
      }
    }
  }
  if (!neg || !pos) return;
  stamp++;
  const cv = new Float64Array(8);
  const lo = [0, 0, 0], hi = [0, 0, 0], li = [0, 0, 0], hj = [0, 0, 0];
  for (let k = 0; k < pz - 1; k++) {
    for (let j = 0; j < py - 1; j++) {
      for (let i = 0; i < px - 1; i++) {
        let config = 0;
        for (let c = 0; c < 8; c++) {
          const v = vals[(i + (c & 1)) + P * ((j + ((c >> 1) & 1)) + P * (k + (c >> 2)))];
          cv[c] = v;
          if (v < 0) config |= 1 << c;
        }
        if (config === 0 || config === 255) continue;
        const gi = i0 + i, gj = j0 + j, gk = k0 + k;
        for (let e = 0; e < 12; e++) up[e] = e;
        for (let c = 0; c < 9; c++) side[c] = c;
        for (const E of EDGE) if (((config >> E.c0) & 1) === ((config >> E.c1) & 1)) unite(E.c0, E.c1);
        for (let fi = 0; fi < 6; fi++) {
          const F = FACES[fi];
          const s0 = (config >> F.q[0]) & 1, s1 = (config >> F.q[1]) & 1, s2 = (config >> F.q[2]) & 1, s3 = (config >> F.q[3]) & 1;
          const x = [s0 !== s1, s1 !== s2, s2 !== s3, s3 !== s0];
          const cnt = x[0] + x[1] + x[2] + x[3];
          if (cnt === 2) {
            const sel = F.e.filter((_, m) => x[m]);
            join(sel[0], sel[1]);
          } else if (cnt === 4) {
            const fa = fi >> 1, fb = (fa + 1) % 3, fc = (fa + 2) % 3;
            const g = [gi, gj, gk], c = [0, 0, 0];
            c[fa] = at(fa, g[fa] + (fi & 1)); c[fb] = at(fb, g[fb] + 0.5); c[fc] = at(fc, g[fc] + 0.5);
            const mid = field(c[0], c[1], c[2]) < 0;
            if (mid === (s0 === 1)) { join(F.e[0], F.e[1]); join(F.e[2], F.e[3]); unite(F.q[0], F.q[2]); }
            else { join(F.e[3], F.e[0]); join(F.e[1], F.e[2]); unite(F.q[1], F.q[3]); }
          }
        }
        const comp = new Int8Array(12).fill(-1);
        const rootComp = new Int8Array(12).fill(-1);
        let ncomp = 0;
        for (let e = 0; e < 12; e++) {
          const E = EDGE[e];
          if (((config >> E.c0) & 1) === ((config >> E.c1) & 1)) continue;
          const r = find(e);
          if (rootComp[r] < 0) rootComp[r] = ncomp++;
          comp[e] = rootComp[r];
        }
        if (ncomp > 1) ncomp = tube(config, gi, gj, gk, comp, ncomp);
        let packed = 0;
        for (let e = 0; e < 12; e++) if (comp[e] > 0) packed |= comp[e] << (2 * e);
        lo[0] = at(0, gi); lo[1] = at(1, gj); lo[2] = at(2, gk);
        hi[0] = at(0, gi + 1); hi[1] = at(1, gj + 1); hi[2] = at(2, gk + 1);
        for (let a = 0; a < 3; a++) { li[a] = lo[a] + gap; hj[a] = hi[a] - gap; }
        o.cells.push(gi + ncx * (gj + ncy * gk));
        o.first.push(o.vcount);
        o.packed.push(packed);
        for (let c = 0; c < ncomp; c++) {
          let cnt = 0, mx = 0, my = 0, mz = 0;
          for (let e = 0; e < 12; e++) {
            if (comp[e] !== c) continue;
            const E = EDGE[e];
            const lx = i + E.off[0], ly = j + E.off[1], lz = k + E.off[2];
            const d = crossing(lx, ly, lz, E.a, gi + E.off[0], gj + E.off[1], gk + E.off[2], cv[E.c0], cv[E.c1]);
            q[cnt * 3] = xdata[d]; q[cnt * 3 + 1] = xdata[d + 1]; q[cnt * 3 + 2] = xdata[d + 2];
            n[cnt * 3] = xdata[d + 3]; n[cnt * 3 + 1] = xdata[d + 4]; n[cnt * 3 + 2] = xdata[d + 5];
            mx += xdata[d]; my += xdata[d + 1]; mz += xdata[d + 2];
            cnt++;
          }
          mx /= cnt; my /= cnt; mz /= cnt;
          if (solve(cnt, mx, my, mz, lo, hi)) o.solved++;
          else if (feature(cnt, mx, my, mz, lo, hi, margin)) o.featured++;
          else { boxed(cnt, mx, my, mz, li, hj); o.held++; }
          if (settle(lo, hi, margin)) o.settled++;
          const px = out3[0], py = out3[1], pz = out3[2];
          if (px < lo[0] || px > hi[0] || py < lo[1] || py > hi[1] || pz < lo[2] || pz > hi[2]) {
            const good = feature(cnt, mx, my, mz, lo, hi, -gap);
            if (!good) { boxed(cnt, mx, my, mz, li, hj); settle(lo, hi, -gap); }
            o.alt.push(o.vcount); o.alt.push(out3[0]); o.alt.push(out3[1]); o.alt.push(out3[2]); o.alt.push(good ? 1 : 0);
          }
          o.pos.push(px); o.pos.push(py); o.pos.push(pz);
          o.vcount++;
        }
      }
    }
  }
  for (let k = 0; k < pz - 1; k++) {
    const gk = k0 + k;
    for (let j = 0; j < py - 1; j++) {
      const gj = j0 + j;
      for (let i = 0; i < px - 1; i++) {
        const gi = i0 + i;
        const v = vals[i + P * (j + P * k)];
        const g = [gi, gj, gk];
        for (let a = 0; a < 3; a++) {
          const u = vals[(i + (a === 0)) + P * ((j + (a === 1)) + P * (k + (a === 2)))];
          if ((v < 0) === (u < 0)) continue;
          const b = (a + 1) % 3, c = (a + 2) % 3;
          if (g[b] < 1 || g[b] > nc[b] - 1 || g[c] < 1 || g[c] > nc[c] - 1) continue;
          o.edges.push(gi + np[0] * (gj + np[1] * gk));
          o.kinds.push(a | (v < 0 ? 4 : 0));
          const d = crossing(i, j, k, a, gi, gj, gk, v, u);
          for (let m = 0; m < 6; m++) o.hermite.push(xdata[d + m]);
        }
      }
    }
  }
}

function node(lo, hi, o) {
  const c0 = [lo[0] * B, lo[1] * B, lo[2] * B];
  const c1 = [Math.min(hi[0] * B, ncx), Math.min(hi[1] * B, ncy), Math.min(hi[2] * B, ncz)];
  const mid = [0, 1, 2].map((a) => origin[a] + (c0[a] + c1[a]) * 0.5 * cell);
  const half = 0.5 * cell * Math.hypot(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]);
  const v = field(mid[0], mid[1], mid[2]);
  if (Math.abs(v) > lip * half) return;
  const span = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  if (span[0] === 1 && span[1] === 1 && span[2] === 1) { leaf(lo[0], lo[1], lo[2], o); return; }
  const a = span[0] >= span[1] && span[0] >= span[2] ? 0 : span[1] >= span[2] ? 1 : 2;
  const m = lo[a] + (span[a] >> 1);
  const h1 = [...hi]; h1[a] = m;
  const l2 = [...lo]; l2[a] = m;
  node(lo, h1, o);
  node(l2, hi, o);
}

parentPort.on('message', ({ slab }) => {
  const o = {
    cells: new Grow(Float64Array), first: new Grow(Int32Array), packed: new Grow(Uint32Array),
    pos: new Grow(Float64Array), edges: new Grow(Float64Array), kinds: new Grow(Uint8Array), hermite: new Grow(Float64Array), alt: new Grow(Float64Array),
    vcount: 0, solved: 0, featured: 0, held: 0, settled: 0,
  };
  const e0 = evals;
  const b0 = slab * slabWidth, b1 = Math.min(b0 + slabWidth, nb[0]);
  node([b0, 0, 0], [b1, nb[1], nb[2]], o);
  const res = {
    slab, cells: o.cells.done(), first: o.first.done(), packed: o.packed.done(), pos: o.pos.done(),
    edges: o.edges.done(), kinds: o.kinds.done(), hermite: o.hermite.done(), alt: o.alt.done(), evals: evals - e0, solved: o.solved, featured: o.featured, held: o.held, settled: o.settled,
  };
  parentPort.postMessage(res, [res.cells.buffer, res.first.buffer, res.packed.buffer, res.pos.buffer, res.edges.buffer, res.kinds.buffer, res.hermite.buffer, res.alt.buffer]);
});
parentPort.postMessage({ ready: true, lip });
