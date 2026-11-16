// One thread of the light baker in bake.mjs, which starts these and hands each phase to all of them. Not called
// directly. Each vertex is worked out from its own index and the seed alone, so the result does not depend on how
// many threads there are or which one takes it.
import { parentPort, workerData } from 'node:worker_threads';
import { any, closest, gap } from './bvh.mjs';
import { coreIrradiance, moonIrradiance, BACKWARD, CHUNK, NUDGE, NUDGE_MOST, TOUCH } from './bake.mjs';

const W = workerData;
const { bvh, pos, nor, alb, emi, rec, idx, fn, mid, adjStart, adj, coreS, moonS, direct, open, bent, bounce, rays } = W;
const { moon, core, sky, samples, bias, reach, seed, glows, id } = W;
const TWO_PI = Math.PI * 2;
const UNIT = 2 ** -32;
const FAR = 1e30;
const ABOVE = 1e-6;
const SKY_R = sky[0] * Math.PI, SKY_G = sky[1] * Math.PI, SKY_B = sky[2] * Math.PI;

const most = Math.max(samples.core, samples.moon, samples.hemi, 1);
const SX = new Uint32Array(most), SY = new Uint32Array(most);
{
  const V = new Uint32Array(32);
  V[0] = 0x80000000;
  for (let k = 1; k < 32; k++) V[k] = (V[k - 1] ^ (V[k - 1] >>> 1)) >>> 0;
  for (let i = 0; i < most; i++) {
    let x = 0, y = 0;
    for (let k = 0, b = i; b; k++, b >>>= 1) if (b & 1) { x ^= 0x80000000 >>> k; y ^= V[k]; }
    SX[i] = x >>> 0; SY[i] = y >>> 0;
  }
}

function mix(h) {
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}
const hash = (a, b, c) => mix((a + mix((b + mix((c + 0x9e3779b9) >>> 0)) >>> 0)) >>> 0);

let room = 16;
let OX = new Float64Array(room), OY = new Float64Array(room), OZ = new Float64Array(room);
let FX = new Float64Array(room), FY = new Float64Array(room), FZ = new Float64Array(room);

const HIT = new Float64Array(4);
const B1 = new Float64Array(3), B2 = new Float64Array(3);

// How far off the surface at q a ray may start along f: opts.bias, or half the way to whatever stands over the face
// nearer than twice that. At an acute crease the other face is nearer than the bias, and a fixed lift put the start
// inside the rock beyond it (black) or past a single sheet (leaking). The look starts probe off the face, which only
// has to clear the float32 error of the face's own copy in the bvh: a probe of a set length started past the other
// face of a crease when a near surface kept the start close to its vertex, and lifted it out through that face.
const PROBE = 1e-3 * bias;
const OWN = 2 ** -18;
function lift(qx, qy, qz, fx, fy, fz, probe) {
  const t = closest(bvh, qx + fx * probe, qy + fy * probe, qz + fz * probe, fx, fy, fz, 2 * bias - probe, HIT);
  return t < 0 ? bias : Math.min(bias, (probe + HIT[0]) / 2);
}

// Every start is kept nearer the vertex than half the distance to any surface the vertex does not lie on, so the
// straight way from the vertex to it crosses nothing but the faces of its own crease. Moved further, a start beside
// a wall's foot, a path laid on the ground or ground a block is sunk in went under them and lost half its light.
const REACH = 2 * Math.max(NUDGE_MOST, 1) * bias;
function origins(v) {
  const a0 = adjStart[v], a1 = adjStart[v + 1];
  if (a1 - a0 > room) {
    room = a1 - a0;
    OX = new Float64Array(room); OY = new Float64Array(room); OZ = new Float64Array(room);
    FX = new Float64Array(room); FY = new Float64Array(room); FZ = new Float64Array(room);
  }
  const px = pos[v * 3], py = pos[v * 3 + 1], pz = pos[v * 3 + 2];
  const nx = nor[v * 3], ny = nor[v * 3 + 1], nz = nor[v * 3 + 2];
  const span = Math.max(Math.abs(px), Math.abs(py), Math.abs(pz));
  const touch = Math.max(TOUCH * bias, span * 2 ** -20);
  const half = gap(bvh, px, py, pz, REACH, touch) / 2;
  let k = 0;
  for (let a = a0; a < a1; a++) {
    const t = adj[a];
    let fx = fn[t * 3], fy = fn[t * 3 + 1], fz = fn[t * 3 + 2];
    if (fx === 0 && fy === 0 && fz === 0) continue;
    if (fx * nx + fy * ny + fz * nz < BACKWARD) { fx = -fx; fy = -fy; fz = -fz; }
    const cx = mid[t * 3] - px, cy = mid[t * 3 + 1] - py, cz = mid[t * 3 + 2] - pz;
    const l = Math.hypot(cx, cy, cz);
    const s = l > 0 ? Math.min(NUDGE, NUDGE_MOST * bias / l, half / l) : 0;
    const qx = px + cx * s, qy = py + cy * s, qz = pz + cz * s;
    const h = Math.min(half, lift(qx, qy, qz, fx, fy, fz, OWN * l + 2 ** -40 * (1 + span)));
    OX[k] = qx + fx * h; OY[k] = qy + fy * h; OZ[k] = qz + fz * h;
    FX[k] = fx; FY[k] = fy; FZ[k] = fz;
    k++;
  }
  if (k === 0) {
    const h = Math.min(half, lift(px, py, pz, nx, ny, nz, PROBE));
    OX[0] = px + nx * h; OY[0] = py + ny * h; OZ[0] = pz + nz * h;
    FX[0] = nx; FY[0] = ny; FZ[0] = nz;
    k = 1;
  }
  return k;
}

// A direction under the face a sample was given to starts from the face of the vertex it is most above, so a ray
// that leaves a convex edge is never started under its own surface.
function pick(k, a, dx, dy, dz) {
  if (FX[a] * dx + FY[a] * dy + FZ[a] * dz > ABOVE) return a;
  let best = a, most = -Infinity;
  for (let i = 0; i < k; i++) {
    const d = FX[i] * dx + FY[i] * dy + FZ[i] * dz;
    if (d > most) { most = d; best = i; }
  }
  return best;
}

function frame(nx, ny, nz) {
  const s = nz >= 0 ? 1 : -1;
  const a = -1 / (s + nz), b = nx * ny * a;
  B1[0] = 1 + s * nx * nx * a; B1[1] = s * b; B1[2] = -s * nx;
  B2[0] = b; B2[1] = s + ny * ny * a; B2[2] = -ny;
}

// A vertex's k starts take the samples in k runs of consecutive ones, and every run of a Sobol sequence covers the
// disc or the hemisphere evenly. Taken in turns, sample j going to start j % k, the low bit of j halved the disc
// between the starts and left each vertex an error that more samples did not shrink.
function cone(v, k, salt, ax, ay, az, cosA, count, nx, ny, nz, cx, cy, cz, r) {
  frame(ax, ay, az);
  const h = hash(v, seed, salt), sx = mix(h ^ 0x51), sy = mix(h ^ 0xa3), rot = k > 1 ? mix(h ^ 0x7c) % k : 0;
  let seen = 0, counted = 0;
  for (let j = 0; j < count; j++) {
    const i = (((j * k) / count | 0) + rot) % k;
    const x = ((SX[j] ^ sx) >>> 0) * UNIT, y = ((SY[j] ^ sy) >>> 0) * UNIT;
    const ct = 1 - x * (1 - cosA), st = Math.sqrt(Math.max(0, 1 - ct * ct)), ph = TWO_PI * y;
    const lx = st * Math.cos(ph), ly = st * Math.sin(ph);
    const dx = B1[0] * lx + B2[0] * ly + ax * ct;
    const dy = B1[1] * lx + B2[1] * ly + ay * ct;
    const dz = B1[2] * lx + B2[2] * ly + az * ct;
    if (nx * dx + ny * dy + nz * dz <= 0) continue;
    counted++;
    const a = pick(k, i, dx, dy, dz);
    const ox = OX[a], oy = OY[a], oz = OZ[a];
    let tmax = FAR;
    if (r > 0) {
      const qx = cx - ox, qy = cy - oy, qz = cz - oz;
      const b = qx * dx + qy * dy + qz * dz, c = qx * qx + qy * qy + qz * qz - r * r;
      const disc = b * b - c;
      tmax = disc > 0 ? b - Math.sqrt(disc) : b;
      if (tmax <= 0) { seen++; continue; }
    }
    if (!any(bvh, ox, oy, oz, dx, dy, dz, tmax)) seen++;
  }
  rays[id] += counted;
  return counted ? seen / counted : 0;
}

const E = new Float64Array(3);
function lightDirect(v) {
  const k = origins(v);
  const px = pos[v * 3], py = pos[v * 3 + 1], pz = pos[v * 3 + 2];
  const nx = nor[v * 3], ny = nor[v * 3 + 1], nz = nor[v * 3 + 2];
  E[0] = 0; E[1] = 0; E[2] = 0;
  if (core) {
    const cx = core.at[0], cy = core.at[1], cz = core.at[2];
    const qx = cx - px, qy = cy - py, qz = cz - pz, d = Math.hypot(qx, qy, qz);
    let s = 1;
    if (d > core.r && samples.core > 0) {
      const sinA = core.r / d;
      s = cone(v, k, 1, qx / d, qy / d, qz / d, Math.sqrt(1 - sinA * sinA), samples.core, nx, ny, nz, cx, cy, cz, core.r);
    }
    coreS[v] = s;
    coreIrradiance(core, s, px, py, pz, nx, ny, nz, E);
  }
  if (moon) {
    const t = moon.toward;
    const s = samples.moon > 0 ? cone(v, k, 2, t[0], t[1], t[2], Math.cos(moon.spread), samples.moon, nx, ny, nz, 0, 0, 0, 0) : 1;
    moonS[v] = s;
    moonIrradiance(moon, s, nx, ny, nz, E);
  }
  direct[v * 3] = E[0]; direct[v * 3 + 1] = E[1]; direct[v * 3 + 2] = E[2];
}

function gather(v, pass, light, src, out) {
  const k = origins(v);
  const nx = nor[v * 3], ny = nor[v * 3 + 1], nz = nor[v * 3 + 2];
  frame(nx, ny, nz);
  const t1x = B1[0], t1y = B1[1], t1z = B1[2], t2x = B2[0], t2y = B2[1], t2z = B2[2];
  const h = hash(v, seed, 16 + pass), sx = mix(h ^ 0x51), sy = mix(h ^ 0xa3), rot = k > 1 ? mix(h ^ 0x7c) % k : 0;
  const first = pass === 1, ao = first && rec[v] === 1, glow = first && glows;
  const N = samples.hemi;
  let r = 0, g = 0, b = 0, on = 0, bx = 0, by = 0, bz = 0;
  for (let j = 0; j < N; j++) {
    const i = (((j * k) / N | 0) + rot) % k;
    const x = ((SX[j] ^ sx) >>> 0) * UNIT, y = ((SY[j] ^ sy) >>> 0) * UNIT;
    const s = Math.sqrt(x), ph = TWO_PI * y, lz = Math.sqrt(Math.max(0, 1 - x));
    const lx = s * Math.cos(ph), ly = s * Math.sin(ph);
    const dx = t1x * lx + t2x * ly + nx * lz;
    const dy = t1y * lx + t2y * ly + ny * lz;
    const dz = t1z * lx + t2z * ly + nz * lz;
    const a = pick(k, i, dx, dy, dz);
    const t = closest(bvh, OX[a], OY[a], OZ[a], dx, dy, dz, Infinity, HIT);
    if (t < 0) {
      if (first && light) { r += SKY_R; g += SKY_G; b += SKY_B; }
      if (ao) { on++; bx += dx; by += dy; bz += dz; }
      continue;
    }
    if (ao && HIT[0] > reach) { on++; bx += dx; by += dy; bz += dz; }
    if (!light || HIT[3] === 0) continue;
    const u = HIT[1], w = HIT[2], z = 1 - u - w;
    const i0 = idx[t * 3] * 3, i1 = idx[t * 3 + 1] * 3, i2 = idx[t * 3 + 2] * 3;
    r += (alb[i0] * z + alb[i1] * u + alb[i2] * w) * (src[i0] * z + src[i1] * u + src[i2] * w);
    g += (alb[i0 + 1] * z + alb[i1 + 1] * u + alb[i2 + 1] * w) * (src[i0 + 1] * z + src[i1 + 1] * u + src[i2 + 1] * w);
    b += (alb[i0 + 2] * z + alb[i1 + 2] * u + alb[i2 + 2] * w) * (src[i0 + 2] * z + src[i1 + 2] * u + src[i2 + 2] * w);
    if (glow) {
      r += emi[i0] * z + emi[i1] * u + emi[i2] * w;
      g += emi[i0 + 1] * z + emi[i1 + 1] * u + emi[i2 + 1] * w;
      b += emi[i0 + 2] * z + emi[i1 + 2] * u + emi[i2 + 2] * w;
    }
  }
  rays[id] += N;
  if (light) {
    const er = r / N, eg = g / N, eb = b / N;
    out[v * 3] = er; out[v * 3 + 1] = eg; out[v * 3 + 2] = eb;
    if (rec[v]) { bounce[v * 3] += er; bounce[v * 3 + 1] += eg; bounce[v * 3 + 2] += eb; }
  }
  if (ao) {
    open[v] = on / N;
    const l = Math.hypot(bx, by, bz);
    if (on > 0 && l > 0) { bent[v * 3] = bx / l; bent[v * 3 + 1] = by / l; bent[v * 3 + 2] = bz / l; }
    else { bent[v * 3] = nx; bent[v * 3 + 1] = ny; bent[v * 3 + 2] = nz; }
  }
}

parentPort.on('message', (m) => {
  const { list, counter, done } = m;
  const len = list.length;
  for (;;) {
    const s = Atomics.add(counter, 0, CHUNK);
    if (s >= len) break;
    const e = Math.min(len, s + CHUNK);
    if (m.kind === 'direct') for (let i = s; i < e; i++) lightDirect(list[i]);
    else for (let i = s; i < e; i++) gather(list[i], m.pass, m.light, m.src, m.out);
    Atomics.add(done, 0, e - s);
  }
  parentPort.postMessage(0);
});
