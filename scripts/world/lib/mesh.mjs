// Plain helpers for indexed triangle meshes: { positions: Float32Array, indices: Uint32Array, normals? }.
//
//   const lit = creased(mesh, 30)          // split where faces meet at over 30 degrees, normals by angle
//   const wear = curvature(mesh, 3)        // per vertex, 1 / units: over 0 on convex edges, under 0 in creases
//   merge([a, b]), transform(mesh, m4), bounds(mesh), area(mesh), weld(mesh, 1e-4), closed(mesh)
//
// A matrix is sixteen numbers, column major, as three's Matrix4.elements.

// A hash table from keys (whole numbers from 0 to 2^53) to whole numbers, which grows as keys are added.
export class Table {
  constructor(count) {
    let size = 1;
    while (size < count * 2 + 2) size *= 2;
    this.mask = size - 1;
    this.keys = new Float64Array(size).fill(-1);
    this.vals = new Int32Array(size);
    this.n = 0;
  }
  grow() {
    const keys = this.keys, vals = this.vals;
    this.mask = keys.length * 2 - 1;
    this.keys = new Float64Array(keys.length * 2).fill(-1);
    this.vals = new Int32Array(keys.length * 2);
    for (let s = 0; s < keys.length; s++) if (keys[s] !== -1) { const t = this.slot(keys[s]); this.keys[t] = keys[s]; this.vals[t] = vals[s]; }
  }
  slot(key) {
    const lo = key >>> 0, hi = (key / 4294967296) >>> 0;
    let h = Math.imul(lo ^ Math.imul(hi, 0x9e3779b1), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    let s = h & this.mask;
    while (this.keys[s] !== -1 && this.keys[s] !== key) s = (s + 1) & this.mask;
    return s;
  }
  set(key, v) {
    let s = this.slot(key);
    if (this.keys[s] !== key) {
      if (++this.n * 2 > this.keys.length) { this.grow(); s = this.slot(key); }
      this.keys[s] = key;
    }
    this.vals[s] = v;
  }
  get(key) { const s = this.slot(key); return this.keys[s] === key ? this.vals[s] : -1; }
}

const count = (mesh) => mesh.positions.length / 3;

// For each vertex, the triangles that use it, in order: tris.subarray(start[v], start[v + 1]).
export function incident(mesh) {
  const n = count(mesh), ix = mesh.indices;
  const start = new Uint32Array(n + 1);
  for (let i = 0; i < ix.length; i++) start[ix[i] + 1]++;
  for (let v = 0; v < n; v++) start[v + 1] += start[v];
  const fill = start.slice(0, n);
  const tris = new Uint32Array(ix.length);
  for (let i = 0; i < ix.length; i++) tris[fill[ix[i]]++] = (i / 3) | 0;
  return { start, tris };
}

// Each triangle's unit normal and area, and whether its normal can be trusted: a triangle all but flat (three points
// near a line, its height under THIN of its longest edge) has a normal made of rounding, and it is left out of every
// normal and every join between faces.
export const THIN = 1e-4;
function faceNormals(mesh) {
  const p = mesh.positions, ix = mesh.indices, nt = ix.length / 3;
  const fn = new Float64Array(nt * 3), ar = new Float64Array(nt), sure = new Uint8Array(nt);
  for (let t = 0; t < nt; t++) {
    const a = ix[t * 3] * 3, b = ix[t * 3 + 1] * 3, c = ix[t * 3 + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    const l = Math.hypot(x, y, z);
    ar[t] = l / 2;
    if (l > 0) { fn[t * 3] = x / l; fn[t * 3 + 1] = y / l; fn[t * 3 + 2] = z / l; }
    const w = (p[c] - p[b]) ** 2 + (p[c + 1] - p[b + 1]) ** 2 + (p[c + 2] - p[b + 2]) ** 2;
    const longest = Math.max(ux * ux + uy * uy + uz * uz, vx * vx + vy * vy + vz * vz, w);
    sure[t] = l > THIN * longest ? 1 : 0;
  }
  return { fn, ar, sure };
}

function cornerAngle(p, a, b, c) {
  const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2];
  const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  return Math.atan2(Math.hypot(cx, cy, cz), ux * vx + uy * vy + uz * vz);
}

export function creased(mesh, degrees) {
  const p = mesh.positions, ix = mesh.indices, n = count(mesh);
  const { fn, sure } = faceNormals(mesh);
  const { start, tris } = incident(mesh);
  const limit = Math.cos((degrees * Math.PI) / 180);
  const corner = new Int32Array(ix.length);
  const pos = [], nor = [], src = [];
  const root = [], by = [];
  const find = (i) => { while (root[i] !== i) i = root[i] = root[root[i]]; return i; };
  const shares = (ti, tj, v) => {
    for (let a = 0; a < 3; a++) {
      const w = ix[ti * 3 + a];
      if (w === v) continue;
      for (let b = 0; b < 3; b++) if (ix[tj * 3 + b] === w) return true;
    }
    return false;
  };
  for (let v = 0; v < n; v++) {
    const s = start[v], e = start[v + 1], m = e - s;
    if (!m) continue;
    root.length = m;
    by.length = m;
    for (let i = 0; i < m; i++) { root[i] = i; by[i] = -1; }
    for (let i = 0; i < m; i++) {
      const ti = tris[s + i];
      if (!sure[ti]) continue;
      for (let j = i + 1; j < m; j++) {
        const tj = tris[s + j];
        if (!sure[tj] || !shares(ti, tj, v)) continue;
        const d = fn[ti * 3] * fn[tj * 3] + fn[ti * 3 + 1] * fn[tj * 3 + 1] + fn[ti * 3 + 2] * fn[tj * 3 + 2];
        if (d >= limit) { const a = find(i), b = find(j); if (a !== b) root[Math.max(a, b)] = Math.min(a, b); }
      }
    }
    for (let i = 0; i < m; i++) {
      if (sure[tris[s + i]]) continue;
      for (let j = 0; j < m && by[i] < 0; j++) if (j !== i && sure[tris[s + j]] && shares(tris[s + i], tris[s + j], v)) by[i] = j;
    }
    const made = new Map();
    for (let i = 0; i < m; i++) {
      const r = find(by[i] >= 0 ? by[i] : i);
      let id = made.get(r);
      if (id === undefined) {
        id = src.length;
        made.set(r, id);
        src.push(v);
        pos.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]);
        nor.push(0, 0, 0);
      }
      const t = tris[s + i];
      const k = ix[t * 3] === v ? 0 : ix[t * 3 + 1] === v ? 1 : 2;
      if (sure[t]) {
        const ang = cornerAngle(p, v, ix[t * 3 + (k + 1) % 3], ix[t * 3 + (k + 2) % 3]);
        nor[id * 3] += fn[t * 3] * ang; nor[id * 3 + 1] += fn[t * 3 + 1] * ang; nor[id * 3 + 2] += fn[t * 3 + 2] * ang;
      }
      corner[t * 3 + k] = id;
    }
    for (const id of made.values()) {
      if (nor[id * 3] || nor[id * 3 + 1] || nor[id * 3 + 2]) continue;
      for (let i = 0; i < m; i++) {
        const t = tris[s + i];
        const k = ix[t * 3] === v ? 0 : ix[t * 3 + 1] === v ? 1 : 2;
        const ang = sure[t] ? cornerAngle(p, v, ix[t * 3 + (k + 1) % 3], ix[t * 3 + (k + 2) % 3]) : 0;
        nor[id * 3] += fn[t * 3] * (ang || 1e-9); nor[id * 3 + 1] += fn[t * 3 + 1] * (ang || 1e-9); nor[id * 3 + 2] += fn[t * 3 + 2] * (ang || 1e-9);
      }
    }
  }
  const normals = new Float32Array(nor.length);
  for (let i = 0; i < nor.length; i += 3) {
    const l = Math.hypot(nor[i], nor[i + 1], nor[i + 2]);
    if (l > 0) { normals[i] = nor[i] / l; normals[i + 1] = nor[i + 1] / l; normals[i + 2] = nor[i + 2] / l; } else normals[i + 2] = 1;
  }
  return { positions: new Float32Array(pos), normals, indices: Uint32Array.from(corner), source: Uint32Array.from(src) };
}

function buckets(p, size) {
  const n = p.length / 3;
  const key = new Float64Array(n);
  let lo = [Infinity, Infinity, Infinity];
  for (let v = 0; v < n; v++) for (let a = 0; a < 3; a++) lo[a] = Math.min(lo[a], p[v * 3 + a]);
  lo = lo.map((x) => x - size);
  const span = 1 << 20;
  const cellOf = (x, a) => Math.floor((x - lo[a]) / size);
  const keyOf = (i, j, k) => i + span * (j + span * k);
  const table = new Table(n);
  const head = [], next = new Int32Array(n).fill(-1);
  for (let v = 0; v < n; v++) {
    const k = keyOf(cellOf(p[v * 3], 0), cellOf(p[v * 3 + 1], 1), cellOf(p[v * 3 + 2], 2));
    key[v] = k;
    let b = table.get(k);
    if (b < 0) { b = head.length; head.push(-1); table.set(k, b); }
    next[v] = head[b];
    head[b] = v;
  }
  const near = (x, y, z, fn) => {
    const i = cellOf(x, 0), j = cellOf(y, 1), k = cellOf(z, 2);
    for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const b = table.get(keyOf(i + di, j + dj, k + dk));
      if (b < 0) continue;
      for (let u = head[b]; u >= 0; u = next[u]) fn(u);
    }
  };
  return { near };
}

export function curvature(mesh, radius) {
  const p = mesh.positions, ix = mesh.indices, n = count(mesh), nt = ix.length / 3;
  const { fn, ar, sure } = faceNormals(mesh);
  const { start, tris } = incident(mesh);
  const bend = new Float64Array(n), share = new Float64Array(n);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) share[ix[t * 3 + k]] += ar[t] / 3;
  for (let a = 0; a < n; a++) {
    for (let s = start[a]; s < start[a + 1]; s++) {
      const t = tris[s];
      for (let k = 0; k < 3; k++) {
        const b = ix[t * 3 + k];
        if (b <= a) continue;
        let other = -1, many = 0;
        for (let u = start[a]; u < start[a + 1]; u++) {
          const g = tris[u];
          if (g === t) continue;
          if (ix[g * 3] === b || ix[g * 3 + 1] === b || ix[g * 3 + 2] === b) { other = g; many++; }
        }
        if (many !== 1 || other < t || !sure[t] || !sure[other]) continue;
        const opp = ix[other * 3] !== a && ix[other * 3] !== b ? ix[other * 3] : ix[other * 3 + 1] !== a && ix[other * 3 + 1] !== b ? ix[other * 3 + 1] : ix[other * 3 + 2];
        const cx = fn[t * 3 + 1] * fn[other * 3 + 2] - fn[t * 3 + 2] * fn[other * 3 + 1];
        const cy = fn[t * 3 + 2] * fn[other * 3] - fn[t * 3] * fn[other * 3 + 2];
        const cz = fn[t * 3] * fn[other * 3 + 1] - fn[t * 3 + 1] * fn[other * 3];
        let beta = Math.atan2(Math.hypot(cx, cy, cz), fn[t * 3] * fn[other * 3] + fn[t * 3 + 1] * fn[other * 3 + 1] + fn[t * 3 + 2] * fn[other * 3 + 2]);
        const side = (p[opp * 3] - p[a * 3]) * fn[t * 3] + (p[opp * 3 + 1] - p[a * 3 + 1]) * fn[t * 3 + 1] + (p[opp * 3 + 2] - p[a * 3 + 2]) * fn[t * 3 + 2];
        if (side > 0) beta = -beta;
        const len = Math.hypot(p[b * 3] - p[a * 3], p[b * 3 + 1] - p[a * 3 + 1], p[b * 3 + 2] - p[a * 3 + 2]);
        bend[a] += (len * beta) / 2;
        bend[b] += (len * beta) / 2;
      }
    }
  }
  const out = new Float32Array(n);
  const { near } = buckets(p, radius);
  for (let v = 0; v < n; v++) {
    const x = p[v * 3], y = p[v * 3 + 1], z = p[v * 3 + 2];
    let sb = 0, sa = 0;
    near(x, y, z, (u) => {
      const d = Math.hypot(p[u * 3] - x, p[u * 3 + 1] - y, p[u * 3 + 2] - z);
      if (d >= radius && u !== v) return;
      const w = u === v ? 1 : 1 - d / radius;
      sb += w * bend[u];
      sa += w * share[u];
    });
    out[v] = sa > 0 ? (0.5 * sb) / sa : 0;
  }
  return out;
}

export function weld(mesh, tolerance) {
  const p = mesh.positions, ix = mesh.indices, n = count(mesh);
  const size = Math.max(tolerance, 1e-12);
  const map = new Int32Array(n).fill(-1);
  const src = [];
  const reps = new Table(n);
  const head = [], next = [];
  const span = 1 << 20;
  let lo = [Infinity, Infinity, Infinity];
  for (let v = 0; v < n; v++) for (let a = 0; a < 3; a++) lo[a] = Math.min(lo[a], p[v * 3 + a]);
  lo = lo.map((x) => x - size);
  const cellOf = (x, a) => Math.floor((x - lo[a]) / size);
  const keyOf = (i, j, k) => i + span * (j + span * k);
  for (let v = 0; v < n; v++) {
    const x = p[v * 3], y = p[v * 3 + 1], z = p[v * 3 + 2];
    const i = cellOf(x, 0), j = cellOf(y, 1), k = cellOf(z, 2);
    let found = -1, best = Infinity;
    for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const b = reps.get(keyOf(i + di, j + dj, k + dk));
      if (b < 0) continue;
      for (let r = head[b]; r >= 0; r = next[r]) {
        const s = src[r];
        const d = Math.hypot(p[s * 3] - x, p[s * 3 + 1] - y, p[s * 3 + 2] - z);
        if (d <= tolerance && (d < best || (d === best && r < found))) { best = d; found = r; }
      }
    }
    if (found < 0) {
      found = src.length;
      src.push(v);
      const key = keyOf(i, j, k);
      let b = reps.get(key);
      if (b < 0) { b = head.length; head.push(-1); reps.set(key, b); }
      next.push(head[b]);
      head[b] = found;
    }
    map[v] = found;
  }
  const out = new Uint32Array(ix.length);
  let m = 0;
  for (let t = 0; t < ix.length; t += 3) {
    const a = map[ix[t]], b = map[ix[t + 1]], c = map[ix[t + 2]];
    if (a === b || b === c || a === c) continue;
    out[m++] = a; out[m++] = b; out[m++] = c;
  }
  const positions = new Float32Array(src.length * 3);
  for (let r = 0; r < src.length; r++) for (let a = 0; a < 3; a++) positions[r * 3 + a] = p[src[r] * 3 + a];
  return { positions, indices: out.slice(0, m), source: Uint32Array.from(src) };
}

export function merge(meshes) {
  let nv = 0, ni = 0;
  for (const m of meshes) { nv += count(m); ni += m.indices.length; }
  const withNormals = meshes.length > 0 && meshes.every((m) => m.normals);
  if (!withNormals && meshes.some((m) => m.normals)) throw new Error('merge: some meshes have normals and some do not');
  const positions = new Float32Array(nv * 3), indices = new Uint32Array(ni);
  const normals = withNormals ? new Float32Array(nv * 3) : null;
  let v = 0, i = 0;
  for (const m of meshes) {
    positions.set(m.positions, v * 3);
    if (normals) normals.set(m.normals, v * 3);
    for (let k = 0; k < m.indices.length; k++) indices[i + k] = m.indices[k] + v;
    v += count(m);
    i += m.indices.length;
  }
  return normals ? { positions, normals, indices } : { positions, indices };
}

export function transform(mesh, e) {
  const p = mesh.positions, n = count(mesh);
  const positions = new Float32Array(p.length);
  for (let v = 0; v < n; v++) {
    const x = p[v * 3], y = p[v * 3 + 1], z = p[v * 3 + 2];
    const w = e[3] * x + e[7] * y + e[11] * z + e[15] || 1;
    positions[v * 3] = (e[0] * x + e[4] * y + e[8] * z + e[12]) / w;
    positions[v * 3 + 1] = (e[1] * x + e[5] * y + e[9] * z + e[13]) / w;
    positions[v * 3 + 2] = (e[2] * x + e[6] * y + e[10] * z + e[14]) / w;
  }
  const out = { ...mesh, positions };
  const a = e[0], b = e[4], c = e[8], d = e[1], f = e[5], g = e[9], h = e[2], i = e[6], j = e[10];
  const inv = [f * j - g * i, c * i - b * j, b * g - c * f, g * h - d * j, a * j - c * h, c * d - a * g, d * i - f * h, b * h - a * i, a * f - b * d];
  const det = a * inv[0] + b * inv[3] + c * inv[6];
  if (det < 0) {
    const ix = Uint32Array.from(mesh.indices);
    for (let t = 0; t < ix.length; t += 3) { const k = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = k; }
    out.indices = ix;
  }
  if (mesh.normals) {
    const s = det < 0 ? -1 : 1;
    const normals = new Float32Array(mesh.normals.length);
    for (let v = 0; v < n; v++) {
      const x = mesh.normals[v * 3], y = mesh.normals[v * 3 + 1], z = mesh.normals[v * 3 + 2];
      const nx = (inv[0] * x + inv[3] * y + inv[6] * z) * s, ny = (inv[1] * x + inv[4] * y + inv[7] * z) * s, nz = (inv[2] * x + inv[5] * y + inv[8] * z) * s;
      const l = Math.hypot(nx, ny, nz) || 1;
      normals[v * 3] = nx / l; normals[v * 3 + 1] = ny / l; normals[v * 3 + 2] = nz / l;
    }
    out.normals = normals;
  }
  return out;
}

export function bounds(mesh) {
  const p = mesh.positions;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p[i + a]); hi[a] = Math.max(hi[a], p[i + a]); }
  return [lo, hi];
}

export function area(mesh) {
  const { ar } = faceNormals(mesh);
  let s = 0;
  for (let t = 0; t < ar.length; t++) s += ar[t];
  return s;
}

// Edges with one face (open), with more than two (bad), and with two faces that run them the same way (flipped).
export function closed(mesh) {
  const ix = mesh.indices, n = count(mesh);
  const table = new Table(ix.length);
  const uses = new Int32Array(ix.length), dir = new Int32Array(ix.length);
  let edges = 0;
  for (let t = 0; t < ix.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = ix[t + k], b = ix[t + (k + 1) % 3];
      const key = Math.min(a, b) * n + Math.max(a, b);
      let e = table.get(key);
      if (e < 0) { e = edges++; table.set(key, e); }
      uses[e]++;
      dir[e] += a < b ? 1 : -1;
    }
  }
  let open = 0, bad = 0, flipped = 0;
  for (let e = 0; e < edges; e++) {
    if (uses[e] === 1) open++;
    else if (uses[e] > 2) bad++;
    else if (dir[e] !== 0) flipped++;
  }
  return { open, bad, flipped };
}

// Flips away triangles that have all but no area (three points on a line), each into its neighbour across its longest
// edge, so the mesh keeps every edge it had paired. thin is the least height a triangle may have, as a share of its
// longest edge. Changes indices in place and returns how many triangles are still that thin.
export function uncap(mesh, thin = 1e-4) {
  const p = mesh.positions, ix = mesh.indices, n = count(mesh), nt = ix.length / 3;
  const edges = new Table(ix.length);
  for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) edges.set(ix[t * 3 + k] * n + ix[t * 3 + (k + 1) % 3], t);
  const len2 = (a, b) => (p[a * 3] - p[b * 3]) ** 2 + (p[a * 3 + 1] - p[b * 3 + 1]) ** 2 + (p[a * 3 + 2] - p[b * 3 + 2]) ** 2;
  const twice = (a, b, c) => {
    const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2];
    const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2];
    return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  };
  const flat = (a, b, c) => {
    const l = Math.max(len2(a, b), len2(b, c), len2(c, a));
    const x = twice(a, b, c);
    return Math.hypot(...x) <= thin * l;
  };
  let left = 0;
  for (let pass = 0; pass < 8; pass++) {
    left = 0;
    let flipped = 0;
    for (let t = 0; t < nt; t++) {
      const v = [ix[t * 3], ix[t * 3 + 1], ix[t * 3 + 2]];
      if (!flat(v[0], v[1], v[2])) continue;
      left++;
      let k = 0;
      for (let j = 1; j < 3; j++) if (len2(v[j], v[(j + 1) % 3]) > len2(v[k], v[(k + 1) % 3])) k = j;
      const a = v[k], b = v[(k + 1) % 3], c = v[(k + 2) % 3];
      const u = edges.get(b * n + a);
      if (u < 0 || u === t) continue;
      const w = [ix[u * 3], ix[u * 3 + 1], ix[u * 3 + 2]];
      const d = w[0] !== a && w[0] !== b ? w[0] : w[1] !== a && w[1] !== b ? w[1] : w[2];
      if (d === c || edges.get(c * n + d) >= 0 || edges.get(d * n + c) >= 0) continue;
      if (flat(a, d, c) || flat(d, b, c)) continue;
      const before = twice(b, a, d), x1 = twice(a, d, c), x2 = twice(d, b, c);
      if (x1[0] * before[0] + x1[1] * before[1] + x1[2] * before[2] <= 0 || x2[0] * before[0] + x2[1] * before[1] + x2[2] * before[2] <= 0) continue;
      for (const [s, e] of [[a, b], [b, c], [c, a], [b, a], [a, d], [d, b]]) {
        const key = s * n + e;
        const at = edges.slot(key);
        if (edges.keys[at] === key) edges.vals[at] = -1;
      }
      ix[t * 3] = a; ix[t * 3 + 1] = d; ix[t * 3 + 2] = c;
      ix[u * 3] = d; ix[u * 3 + 1] = b; ix[u * 3 + 2] = c;
      for (const tt of [t, u]) for (let j = 0; j < 3; j++) edges.set(ix[tt * 3 + j] * n + ix[tt * 3 + (j + 1) % 3], tt);
      flipped++;
      left--;
    }
    if (!flipped) break;
  }
  return left;
}

// How far a point is from a mesh: closest(mesh, size)(x, y, z), by buckets size across. A point further than size
// from every triangle reads as Infinity. Given enough, it stops at the first triangle that near.
export function closest(mesh, size) {
  const p = mesh.positions, ix = mesh.indices, nt = ix.length / 3;
  const [lo, hi] = bounds(mesh);
  const nb = [0, 1, 2].map((a) => Math.floor((hi[a] - lo[a]) / size) + 3);
  const cellOf = (x, a) => Math.floor((x - lo[a]) / size) + 1;
  const keyOf = (i, j, k) => i + nb[0] * (j + nb[1] * k);
  const span = (t, a) => {
    const x0 = p[ix[t * 3] * 3 + a], x1 = p[ix[t * 3 + 1] * 3 + a], x2 = p[ix[t * 3 + 2] * 3 + a];
    return [cellOf(Math.min(x0, x1, x2), a), cellOf(Math.max(x0, x1, x2), a)];
  };
  const table = new Table(nt * 2);
  const counts = [];
  // A triangle goes in the buckets its plane passes through within its bounds, not every bucket of its bounds,
  // which for a large slanted triangle would be a great many.
  const g = [0, 0, 0], r = [[0, 0], [0, 0], [0, 0]];
  const each = (t, fn) => {
    const a = ix[t * 3] * 3, b = ix[t * 3 + 1] * 3, c = ix[t * 3 + 2] * 3;
    for (let k = 0; k < 3; k++) r[k] = span(t, k);
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const d = Math.abs(n[0]) >= Math.abs(n[1]) && Math.abs(n[0]) >= Math.abs(n[2]) ? 0 : Math.abs(n[1]) >= Math.abs(n[2]) ? 1 : 2;
    const e = (d + 1) % 3, f = (d + 2) % 3;
    if (!(Math.abs(n[d]) > 0) || r[d][1] - r[d][0] < 2) {
      for (let k = r[2][0]; k <= r[2][1]; k++) for (let j = r[1][0]; j <= r[1][1]; j++) for (let i = r[0][0]; i <= r[0][1]; i++) fn(keyOf(i, j, k));
      return;
    }
    const off = n[0] * p[a] + n[1] * p[a + 1] + n[2] * p[a + 2];
    for (let i = r[e][0]; i <= r[e][1]; i++) for (let j = r[f][0]; j <= r[f][1]; j++) {
      let lo2 = Infinity, hi2 = -Infinity;
      for (const ce of [i - 1, i]) for (const cf of [j - 1, j]) {
        const xe = lo[e] + ce * size, xf = lo[f] + cf * size;
        const xd = (off - n[e] * xe - n[f] * xf) / n[d];
        lo2 = Math.min(lo2, xd); hi2 = Math.max(hi2, xd);
      }
      const k0 = Math.max(r[d][0], cellOf(lo2, d) - 1), k1 = Math.min(r[d][1], cellOf(hi2, d) + 1);
      for (let k = k0; k <= k1; k++) { g[d] = k; g[e] = i; g[f] = j; fn(keyOf(g[0], g[1], g[2])); }
    }
  };
  for (let t = 0; t < nt; t++) each(t, (key) => { let b = table.get(key); if (b < 0) { b = counts.length; counts.push(0); table.set(key, b); } counts[b]++; });
  const start = new Uint32Array(counts.length + 1);
  for (let b = 0; b < counts.length; b++) start[b + 1] = start[b] + counts[b];
  const fill = start.slice(0, counts.length), list = new Uint32Array(start[counts.length]);
  for (let t = 0; t < nt; t++) each(t, (key) => { list[fill[table.get(key)]++] = t; });
  const seen = new Int32Array(nt).fill(-1);
  let stamp = 0;
  return (x, y, z, enough = 0) => {
    stamp++;
    const ci = cellOf(x, 0), cj = cellOf(y, 1), ck = cellOf(z, 2);
    let best = Infinity;
    for (let r = 0; r < 27; r++) {
      const i = ci + RING[r * 3], j = cj + RING[r * 3 + 1], k = ck + RING[r * 3 + 2];
      if (i < 0 || j < 0 || k < 0 || i >= nb[0] || j >= nb[1] || k >= nb[2]) continue;
      const b = table.get(keyOf(i, j, k));
      if (b < 0) continue;
      for (let s = start[b]; s < start[b + 1]; s++) {
        const t = list[s];
        if (seen[t] === stamp) continue;
        seen[t] = stamp;
        const d = toTriangle(p, ix[t * 3], ix[t * 3 + 1], ix[t * 3 + 2], x, y, z);
        if (d < best) { best = d; if (best <= enough) return best; }
      }
    }
    return best <= size ? best : Infinity;
  };
}

const RING = new Int8Array(81);
for (let r = 0, n = 0; r < 27; r++) {
  const d = [r % 3, ((r / 3) | 0) % 3, (r / 9) | 0].map((v) => (v === 0 ? 0 : v === 1 ? -1 : 1));
  RING[n++] = d[0]; RING[n++] = d[1]; RING[n++] = d[2];
}

export function toTriangle(p, ia, ib, ic, x, y, z) {
  const ax = p[ia * 3], ay = p[ia * 3 + 1], az = p[ia * 3 + 2];
  const abx = p[ib * 3] - ax, aby = p[ib * 3 + 1] - ay, abz = p[ib * 3 + 2] - az;
  const acx = p[ic * 3] - ax, acy = p[ic * 3 + 1] - ay, acz = p[ic * 3 + 2] - az;
  const apx = x - ax, apy = y - ay, apz = z - az;
  let v, w;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  const bpx = apx - abx, bpy = apy - aby, bpz = apz - abz;
  const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  const cpx = apx - acx, cpy = apy - acy, cpz = apz - acz;
  const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  const vc = d1 * d4 - d3 * d2, vb = d5 * d2 - d1 * d6, va = d3 * d6 - d5 * d4;
  if (d1 <= 0 && d2 <= 0) { v = 0; w = 0; }
  else if (d3 >= 0 && d4 <= d3) { v = 1; w = 0; }
  else if (vc <= 0 && d1 >= 0 && d3 <= 0) { v = d1 / (d1 - d3); w = 0; }
  else if (d6 >= 0 && d5 <= d6) { v = 0; w = 1; }
  else if (vb <= 0 && d2 >= 0 && d6 <= 0) { v = 0; w = d2 / (d2 - d6); }
  else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { w = (d4 - d3) / (d4 - d3 + (d5 - d6)); v = 1 - w; }
  else { const den = 1 / (va + vb + vc); v = vb * den; w = vc * den; }
  const ex = x - (ax + abx * v + acx * w), ey = y - (ay + aby * v + acy * w), ez = z - (az + abz * v + acz * w);
  return Math.sqrt(ex * ex + ey * ey + ez * ez);
}
