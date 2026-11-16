// A bounding volume hierarchy over triangles, for casting rays from the world's scripts. Built with binned SAH into
// flat typed arrays on SharedArrayBuffers, so a bvh posted to worker threads is shared by them and never copied.
//
//   const bvh = build(positions, indices)      // Float32Array(3n), Uint32Array(3t)
//   const hit = new Float64Array(4)
//   const tri = closest(bvh, ox, oy, oz, dx, dy, dz, tmax, hit)
//     // the index of the nearest triangle the ray meets at 0 < t < tmax, or -1. hit is then
//     // [t, u, v, front]: the distance in lengths of (dx, dy, dz), the weights of the triangle's second and third
//     // corners (the first is 1 - u - v), and 1 when the ray meets the face its corners wind counter clockwise
//     // round, 0 when it meets the back
//   any(bvh, ox, oy, oz, dx, dy, dz, tmax)    // true when any triangle, front or back, is met at 0 < t < tmax
//   gap(bvh, px, py, pz, radius, touch)       // the least distance from the point to a triangle that is further
//     // from it than touch, or radius when none is nearer than radius. Triangles within touch are taken as ones the
//     // point lies on and are passed over
//
// No call allocates. Each keeps one stack per thread, so call them from one thread at a time, which is how JS
// runs. bvh is { nodes, meta, tris, ids, nodeCount, triCount }, and a worker can use the object it was posted as is.

const BINS = 32;
const LEAF = 4;
const MOST = 16;
const VISIT = 1.2;
const DEEP = 96;
const STACK = new Int32Array(DEEP + 64);
const DIST = new Float64Array(DEEP + 64);
const FAR = 1e30;

const shared = (Type, n) => new Type(new SharedArrayBuffer(Math.max(1, n) * Type.BYTES_PER_ELEMENT));

export function build(positions, indices) {
  const T = indices.length / 3;
  const box = new Float32Array(T * 6), cen = new Float32Array(T * 3);
  for (let t = 0; t < T; t++) {
    const a = indices[t * 3] * 3, b = indices[t * 3 + 1] * 3, c = indices[t * 3 + 2] * 3;
    for (let k = 0; k < 3; k++) {
      const p = positions[a + k], q = positions[b + k], r = positions[c + k];
      const lo = p < q ? (p < r ? p : r) : (q < r ? q : r);
      const hi = p > q ? (p > r ? p : r) : (q > r ? q : r);
      box[t * 6 + k] = lo; box[t * 6 + 3 + k] = hi;
      cen[t * 3 + k] = (lo + hi) * 0.5;
    }
  }
  const prims = new Uint32Array(T);
  for (let t = 0; t < T; t++) prims[t] = t;
  const cap = Math.max(1, 2 * T);
  const nb = new Float32Array(cap * 6), nm = new Uint32Array(cap * 2);
  let count = 1;
  const binBox = new Float64Array(3 * BINS * 6), binN = new Uint32Array(3 * BINS);
  const rightArea = new Float64Array(BINS), rightN = new Uint32Array(BINS);
  const lo = new Float64Array(3), hi = new Float64Array(3), clo = new Float64Array(3), chi = new Float64Array(3);
  const scale = new Float64Array(3);
  const tasks = [0, 0, T, 0];

  while (tasks.length) {
    const depth = tasks.pop(), end = tasks.pop(), start = tasks.pop(), node = tasks.pop();
    lo.fill(Infinity); hi.fill(-Infinity); clo.fill(Infinity); chi.fill(-Infinity);
    for (let i = start; i < end; i++) {
      const p = prims[i];
      for (let k = 0; k < 3; k++) {
        const a = box[p * 6 + k], b = box[p * 6 + 3 + k], c = cen[p * 3 + k];
        if (a < lo[k]) lo[k] = a;
        if (b > hi[k]) hi[k] = b;
        if (c < clo[k]) clo[k] = c;
        if (c > chi[k]) chi[k] = c;
      }
    }
    for (let k = 0; k < 3; k++) { nb[node * 6 + k] = lo[k]; nb[node * 6 + 3 + k] = hi[k]; }
    const n = end - start;
    const leaf = () => { nm[node * 2] = start; nm[node * 2 + 1] = n; };
    if (n <= LEAF) { leaf(); continue; }

    let bestAxis = -1, bestBin = 0, bestCost = Infinity;
    if (depth < DEEP) {
      binBox.fill(Infinity);
      for (let k = 0; k < 3 * BINS; k++) { binBox[k * 6 + 3] = -Infinity; binBox[k * 6 + 4] = -Infinity; binBox[k * 6 + 5] = -Infinity; }
      binN.fill(0);
      for (let k = 0; k < 3; k++) scale[k] = chi[k] > clo[k] ? BINS / (chi[k] - clo[k]) : 0;
      for (let i = start; i < end; i++) {
        const p = prims[i];
        for (let k = 0; k < 3; k++) {
          if (scale[k] === 0) continue;
          let b = Math.floor((cen[p * 3 + k] - clo[k]) * scale[k]);
          if (b >= BINS) b = BINS - 1;
          const s = (k * BINS + b) * 6;
          binN[k * BINS + b]++;
          for (let j = 0; j < 3; j++) {
            const a = box[p * 6 + j], c = box[p * 6 + 3 + j];
            if (a < binBox[s + j]) binBox[s + j] = a;
            if (c > binBox[s + 3 + j]) binBox[s + 3 + j] = c;
          }
        }
      }
      for (let k = 0; k < 3; k++) {
        if (scale[k] === 0) continue;
        let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity, m = 0;
        for (let b = BINS - 1; b > 0; b--) {
          const s = (k * BINS + b) * 6;
          m += binN[k * BINS + b];
          if (binBox[s] < x0) x0 = binBox[s];
          if (binBox[s + 1] < y0) y0 = binBox[s + 1];
          if (binBox[s + 2] < z0) z0 = binBox[s + 2];
          if (binBox[s + 3] > x1) x1 = binBox[s + 3];
          if (binBox[s + 4] > y1) y1 = binBox[s + 4];
          if (binBox[s + 5] > z1) z1 = binBox[s + 5];
          rightN[b] = m;
          rightArea[b] = m ? (x1 - x0) * (y1 - y0) + (y1 - y0) * (z1 - z0) + (z1 - z0) * (x1 - x0) : 0;
        }
        x0 = Infinity; y0 = Infinity; z0 = Infinity; x1 = -Infinity; y1 = -Infinity; z1 = -Infinity; m = 0;
        for (let b = 0; b < BINS - 1; b++) {
          const s = (k * BINS + b) * 6;
          m += binN[k * BINS + b];
          if (binBox[s] < x0) x0 = binBox[s];
          if (binBox[s + 1] < y0) y0 = binBox[s + 1];
          if (binBox[s + 2] < z0) z0 = binBox[s + 2];
          if (binBox[s + 3] > x1) x1 = binBox[s + 3];
          if (binBox[s + 4] > y1) y1 = binBox[s + 4];
          if (binBox[s + 5] > z1) z1 = binBox[s + 5];
          const r = rightN[b + 1];
          if (!m || !r) continue;
          const la = (x1 - x0) * (y1 - y0) + (y1 - y0) * (z1 - z0) + (z1 - z0) * (x1 - x0);
          const cost = la * m + rightArea[b + 1] * r;
          if (cost < bestCost) { bestCost = cost; bestAxis = k; bestBin = b + 1; }
        }
      }
    }

    let mid;
    if (bestAxis >= 0) {
      const dx = hi[0] - lo[0], dy = hi[1] - lo[1], dz = hi[2] - lo[2];
      const area = dx * dy + dy * dz + dz * dx;
      const split = area > 0 ? VISIT + bestCost / area : Infinity;
      if (n <= MOST && n <= split) { leaf(); continue; }
      const k = bestAxis, c0 = clo[k], sk = scale[k];
      let i = start, j = end - 1;
      while (i <= j) {
        let b = Math.floor((cen[prims[i] * 3 + k] - c0) * sk);
        if (b >= BINS) b = BINS - 1;
        if (b < bestBin) i++;
        else { const s = prims[i]; prims[i] = prims[j]; prims[j] = s; j--; }
      }
      mid = i;
    } else if (chi[0] > clo[0] || chi[1] > clo[1] || chi[2] > clo[2]) {
      mid = (start + end) >> 1;
    } else {
      leaf();
      continue;
    }
    const l = count;
    count += 2;
    nm[node * 2] = l; nm[node * 2 + 1] = 0;
    tasks.push(l + 1, mid, end, depth + 1, l, start, mid, depth + 1);
  }

  const nodes = shared(Float32Array, count * 6), meta = shared(Uint32Array, count * 2);
  nodes.set(nb.subarray(0, count * 6)); meta.set(nm.subarray(0, count * 2));
  const tris = shared(Float32Array, T * 9), ids = shared(Uint32Array, T);
  for (let i = 0; i < T; i++) {
    const t = prims[i];
    ids[i] = t;
    const a = indices[t * 3] * 3, b = indices[t * 3 + 1] * 3, c = indices[t * 3 + 2] * 3;
    for (let k = 0; k < 3; k++) {
      tris[i * 9 + k] = positions[a + k];
      tris[i * 9 + 3 + k] = positions[b + k] - positions[a + k];
      tris[i * 9 + 6 + k] = positions[c + k] - positions[a + k];
    }
  }
  return { nodes, meta, tris, ids, nodeCount: count, triCount: T };
}

function enter(nodes, k, ox, oy, oz, ix, iy, iz, far) {
  let a = (nodes[k] - ox) * ix, b = (nodes[k + 3] - ox) * ix;
  let t0 = a < b ? a : b, t1 = a < b ? b : a;
  a = (nodes[k + 1] - oy) * iy; b = (nodes[k + 4] - oy) * iy;
  let s0 = a < b ? a : b, s1 = a < b ? b : a;
  if (s0 > t0) t0 = s0;
  if (s1 < t1) t1 = s1;
  a = (nodes[k + 2] - oz) * iz; b = (nodes[k + 5] - oz) * iz;
  s0 = a < b ? a : b; s1 = a < b ? b : a;
  if (s0 > t0) t0 = s0;
  if (s1 < t1) t1 = s1;
  if (t0 < 0) t0 = 0;
  if (t1 > far) t1 = far;
  return t0 <= t1 ? t0 : Infinity;
}

export function closest(bvh, ox, oy, oz, dx, dy, dz, tmax, hit) {
  if (bvh.triCount === 0) return -1;
  const { nodes, meta, tris } = bvh;
  const ix = dx !== 0 ? 1 / dx : FAR, iy = dy !== 0 ? 1 / dy : FAR, iz = dz !== 0 ? 1 / dz : FAR;
  let best = tmax, found = -1, bu = 0, bv = 0, bd = 0;
  if (enter(nodes, 0, ox, oy, oz, ix, iy, iz, best) === Infinity) return -1;
  let node = 0, sp = 0;
  for (;;) {
    const n = meta[node * 2 + 1];
    if (n > 0) {
      const first = meta[node * 2];
      for (let i = first, last = first + n; i < last; i++) {
        const k = i * 9;
        const e1x = tris[k + 3], e1y = tris[k + 4], e1z = tris[k + 5];
        const e2x = tris[k + 6], e2y = tris[k + 7], e2z = tris[k + 8];
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (det === 0) continue;
        const inv = 1 / det;
        const tx = ox - tris[k], ty = oy - tris[k + 1], tz = oz - tris[k + 2];
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        const v = (dx * qx + dy * qy + dz * qz) * inv;
        if (v < 0 || u + v > 1) continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t > 0 && t < best) { best = t; found = i; bu = u; bv = v; bd = det; }
      }
    } else {
      const l = meta[node * 2], r = l + 1;
      const el = enter(nodes, l * 6, ox, oy, oz, ix, iy, iz, best);
      const er = enter(nodes, r * 6, ox, oy, oz, ix, iy, iz, best);
      if (el <= er) {
        if (el !== Infinity) {
          if (er !== Infinity) { STACK[sp] = r; DIST[sp++] = er; }
          node = l;
          continue;
        }
      } else {
        if (el !== Infinity) { STACK[sp] = l; DIST[sp++] = el; }
        node = r;
        continue;
      }
    }
    let next = -1;
    while (sp > 0) {
      sp--;
      if (DIST[sp] <= best) { next = STACK[sp]; break; }
    }
    if (next < 0) break;
    node = next;
  }
  if (found < 0) return -1;
  hit[0] = best; hit[1] = bu; hit[2] = bv; hit[3] = bd > 0 ? 1 : 0;
  return bvh.ids[found];
}

export function any(bvh, ox, oy, oz, dx, dy, dz, tmax) {
  if (bvh.triCount === 0) return false;
  const { nodes, meta, tris } = bvh;
  const ix = dx !== 0 ? 1 / dx : FAR, iy = dy !== 0 ? 1 / dy : FAR, iz = dz !== 0 ? 1 / dz : FAR;
  if (enter(nodes, 0, ox, oy, oz, ix, iy, iz, tmax) === Infinity) return false;
  let node = 0, sp = 0;
  for (;;) {
    const n = meta[node * 2 + 1];
    if (n > 0) {
      const first = meta[node * 2];
      for (let i = first, last = first + n; i < last; i++) {
        const k = i * 9;
        const e1x = tris[k + 3], e1y = tris[k + 4], e1z = tris[k + 5];
        const e2x = tris[k + 6], e2y = tris[k + 7], e2z = tris[k + 8];
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (det === 0) continue;
        const inv = 1 / det;
        const tx = ox - tris[k], ty = oy - tris[k + 1], tz = oz - tris[k + 2];
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        const v = (dx * qx + dy * qy + dz * qz) * inv;
        if (v < 0 || u + v > 1) continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t > 0 && t < tmax) return true;
      }
    } else {
      const l = meta[node * 2], r = l + 1;
      const el = enter(nodes, l * 6, ox, oy, oz, ix, iy, iz, tmax);
      const er = enter(nodes, r * 6, ox, oy, oz, ix, iy, iz, tmax);
      if (el !== Infinity) {
        if (er !== Infinity) STACK[sp++] = r;
        node = l;
        continue;
      }
      if (er !== Infinity) { node = r; continue; }
    }
    if (sp === 0) return false;
    node = STACK[--sp];
  }
}

function boxGap2(nodes, k, px, py, pz) {
  const x = px < nodes[k] ? nodes[k] - px : px > nodes[k + 3] ? px - nodes[k + 3] : 0;
  const y = py < nodes[k + 1] ? nodes[k + 1] - py : py > nodes[k + 4] ? py - nodes[k + 4] : 0;
  const z = pz < nodes[k + 2] ? nodes[k + 2] - pz : pz > nodes[k + 5] ? pz - nodes[k + 5] : 0;
  return x * x + y * y + z * z;
}

function triGap2(tris, k, px, py, pz) {
  const ax = tris[k], ay = tris[k + 1], az = tris[k + 2];
  const bx = tris[k + 3], by = tris[k + 4], bz = tris[k + 5];
  const cx = tris[k + 6], cy = tris[k + 7], cz = tris[k + 8];
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = bx * apx + by * apy + bz * apz, d2 = cx * apx + cy * apy + cz * apz;
  let u = 0, v = 0;
  if (d1 <= 0 && d2 <= 0) { u = 0; v = 0; }
  else {
    const bpx = apx - bx, bpy = apy - by, bpz = apz - bz;
    const d3 = bx * bpx + by * bpy + bz * bpz, d4 = cx * bpx + cy * bpy + cz * bpz;
    const cpx = apx - cx, cpy = apy - cy, cpz = apz - cz;
    const d5 = bx * cpx + by * cpy + bz * cpz, d6 = cx * cpx + cy * cpy + cz * cpz;
    const vc = d1 * d4 - d3 * d2, vb = d5 * d2 - d1 * d6, va = d3 * d6 - d5 * d4;
    if (d3 >= 0 && d4 <= d3) { u = 1; v = 0; }
    else if (vc <= 0 && d1 >= 0 && d3 <= 0) { u = d1 / (d1 - d3); v = 0; }
    else if (d6 >= 0 && d5 <= d6) { u = 0; v = 1; }
    else if (vb <= 0 && d2 >= 0 && d6 <= 0) { u = 0; v = d2 / (d2 - d6); }
    else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); u = 1 - w; v = w; }
    else { const s = va + vb + vc; if (s > 0) { u = vb / s; v = vc / s; } }
  }
  const qx = apx - bx * u - cx * v, qy = apy - by * u - cy * v, qz = apz - bz * u - cz * v;
  return qx * qx + qy * qy + qz * qz;
}

export function gap(bvh, px, py, pz, radius, touch) {
  if (bvh.triCount === 0) return radius;
  const { nodes, meta, tris } = bvh;
  const near2 = touch * touch;
  let best = radius * radius;
  if (boxGap2(nodes, 0, px, py, pz) >= best) return radius;
  let node = 0, sp = 0;
  for (;;) {
    const n = meta[node * 2 + 1];
    if (n > 0) {
      const first = meta[node * 2];
      for (let i = first, last = first + n; i < last; i++) {
        const d = triGap2(tris, i * 9, px, py, pz);
        if (d > near2 && d < best) best = d;
      }
    } else {
      const l = meta[node * 2], r = l + 1;
      const dl = boxGap2(nodes, l * 6, px, py, pz), dr = boxGap2(nodes, r * 6, px, py, pz);
      if (dl < best) {
        if (dr < best) { STACK[sp] = r; DIST[sp++] = dr; }
        node = l;
        continue;
      }
      if (dr < best) { node = r; continue; }
    }
    let next = -1;
    while (sp > 0) {
      sp--;
      if (DIST[sp] < best) { next = STACK[sp]; break; }
    }
    if (next < 0) break;
    node = next;
  }
  return Math.sqrt(best);
}
