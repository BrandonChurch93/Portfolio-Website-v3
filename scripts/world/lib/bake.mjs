// The light baker for the hero's world. The moon and the core never move, so what reaches each vertex from them,
// what has bounced, and how shut in each place is, is worked out once here and stored with the mesh. The shader
// multiplies the stored shares into the same two lights, by illum() below, which is the contract between the two.
//
//   import { bake, illum } from './lib/bake.mjs'
//   const lit = await bake(scene, opts)
//   lit[name] = { core, moon, open, bent, bounce }    // for each mesh with receive: true, one value per vertex
//
// scene = {
//   meshes: [{ name, positions: Float32Array(3n), indices: Uint32Array(3t), normals: Float32Array(3n),
//              albedo: [r, g, b] | Float32Array(3n), emit?: Float32Array(3n), receive: boolean }],
//   moon: { toward: [x, y, z], color: [r, g, b], spread: radians } | null,
//   core: { at: [x, y, z], r, color: [r, g, b], fall } | null,
//   sky: [r, g, b],
// }
// opts = { samples: { core: 64, moon: 16, hemi: 256 }, bounces: 2, reach: Infinity, bias: 0.05, threads, seed: 1,
//          onProgress(share), stats: {} }. threads is all cores but one when left out. A samples count of 0 for the
//          core or the moon takes it as seen whole, with no shadow. A stats object, if given, is filled with
//          { vertices, triangles, receivers, threads, backward, bvhNodes, bvhSeconds, traceSeconds, seconds, rays,
//          raysPerSecond, raysPerSecondPerThread }, where backward counts triangles wound against their normals.
//
//   core    Float32Array(n)   share of the core's ball seen, over the directions on the outer side of the surface.
//                             1 inside the ball
//   moon    Float32Array(n)   share of the moon's disc seen, the same way
//   open    Float32Array(n)   cosine weighted share of the hemisphere open for opts.reach
//   bent    Float32Array(3n)  unit mean direction of the open rays, the normal when none is open
//   bounce  Float32Array(3n)  irradiance from everything but the moon and core straight: bounced light, emit, sky
//
// Direct irradiance, the contract with the shader:
//   E_moon = moon.color * moon * illum(dot(n, moon.toward), sin(moon.spread))
//   E_core = core.color * core * pow(core.r / d, core.fall) * illum(dot(n, toCore), min(1, core.r / d))
// moonIrradiance and coreIrradiance add one of them to an rgb array, and direct(scene, lit) gives both for every
// receiving vertex of a baked scene, for checking.
//
// A triangle's front is the side its corners wind counter clockwise round. Light bounces only off fronts, and
// every face blocks from both sides. Each ray starts from a point moved in toward the middle of one of its vertex's
// triangles, by a tenth of the way or 4 × opts.bias, whichever is less, and lifted off that triangle along its face
// normal by opts.bias, or by half the distance to whatever is over it when that is nearer than 2 × opts.bias. So
// an acute crease starts its rays inside the crease at any angle and any size of triangle. Both moves are also held
// under half the distance from the vertex to the nearest surface it does not lie on (one further than TOUCH ×
// opts.bias, or a few float32 steps of its coordinates), so a vertex beside a wall's foot, a path laid over the
// ground or ground a block is sunk in starts every ray on its own side of them. Rays from samples of the core, the
// moon and the hemisphere are dealt among the vertex's triangles by a hash, not by their place in the sequence.
// Ground that runs on under a wall carries its lit side's light under it by its own interpolation, here and in the
// shader alike: cut the ground at a wall's foot where that matters. A vertex that lies exactly on another mesh's
// surface, as ground whose vertex is on a wall's foot, is taken as a crease of the two, and those of its triangles
// that run on under the wall start their share of its rays inside it.
//
// bake throws, naming what is wrong and where, on a normal that is zero or not finite, a position that is not
// finite, an albedo outside 0 to 1, an emit below 0 or not finite, a moon.toward of length 0, a light's color,
// place, size, fall or spread that is not finite or out of range, a sky below 0, and samples, bounces, bias or reach
// out of range. A normal that is not unit length is made so.
import { Worker } from 'node:worker_threads';
import os from 'node:os';
import { build } from './bvh.mjs';

export const NUDGE = 0.1;
export const NUDGE_MOST = 4;
// A surface nearer a vertex than this share of opts.bias, or a few float32 steps of its coordinates, is one the
// vertex lies on: the other face of its crease. Every surface further off is kept clear of by its rays' starts.
export const TOUCH = 1e-3;
export const CHUNK = 64;
// A face whose winding turns it this far from its vertex's normal is taken as wound the wrong way when its rays
// are lifted. Not at 0: a knife edge welded to one normal has faces near 90 degrees from it that are still right.
export const BACKWARD = -0.5;

export function illum(c, s) {
  if (!(s > 0)) return c > 0 ? c : 0;
  if (c >= s) return c;
  if (c <= -s) return 0;
  return (c + s) * (c + s) / (4 * s);
}

export function coreIrradiance(core, share, px, py, pz, nx, ny, nz, out, o = 0) {
  const cx = core.at[0] - px, cy = core.at[1] - py, cz = core.at[2] - pz;
  const d = Math.hypot(cx, cy, cz);
  const c = d > 0 ? (cx * nx + cy * ny + cz * nz) / d : 1;
  const ratio = d > 0 ? core.r / d : 1;
  const k = share * Math.pow(ratio, core.fall) * illum(c, Math.min(1, ratio));
  out[o] += core.color[0] * k; out[o + 1] += core.color[1] * k; out[o + 2] += core.color[2] * k;
}

export function moonIrradiance(moon, share, nx, ny, nz, out, o = 0) {
  const t = moon.toward;
  const k = share * illum(t[0] * nx + t[1] * ny + t[2] * nz, Math.sin(moon.spread));
  out[o] += moon.color[0] * k; out[o + 1] += moon.color[1] * k; out[o + 2] += moon.color[2] * k;
}

const shared = (Type, n) => new Type(new SharedArrayBuffer(n * Type.BYTES_PER_ELEMENT));
const SHORT = 1e-6;

const whole = (x) => Number.isInteger(x) && x >= 0;
const rgb = (c) => c != null && c.length === 3 && [0, 1, 2].every((i) => Number.isFinite(c[i]) && c[i] >= 0);
const point = (c) => c != null && c.length === 3 && [0, 1, 2].every((i) => Number.isFinite(c[i]));

function settle(opts) {
  const s = opts.samples ?? {};
  if (!((s.hemi ?? 256) >= 1) || !whole(s.hemi ?? 256)) throw new Error('bake: samples.hemi must be a whole number, at least 1');
  if (!whole(s.core ?? 64) || !whole(s.moon ?? 16)) throw new Error('bake: samples.core and samples.moon must be whole numbers, 0 or more');
  if (!whole(opts.bounces ?? 2)) throw new Error('bake: bounces must be a whole number, 0 or more');
  if (!((opts.bias ?? 0.05) > 0) || !Number.isFinite(opts.bias ?? 0.05)) throw new Error('bake: bias must be a number more than 0');
  if (!((opts.reach ?? Infinity) > 0)) throw new Error('bake: reach must be more than 0');
  return {
    samples: { core: s.core ?? 64, moon: s.moon ?? 16, hemi: s.hemi ?? 256 },
    bounces: opts.bounces ?? 2,
    reach: opts.reach ?? Infinity,
    bias: opts.bias ?? 0.05,
    threads: Math.max(1, opts.threads ?? os.availableParallelism() - 1),
    seed: (opts.seed ?? 1) >>> 0,
    onProgress: opts.onProgress,
    stats: opts.stats,
  };
}

function lights(scene) {
  const m = scene.moon, c = scene.core;
  if (m) {
    if (!point(m.toward) || !(Math.hypot(...m.toward) > SHORT)) throw new Error('bake: moon.toward must be three finite numbers, not all 0');
    if (!rgb(m.color)) throw new Error('bake: moon.color must be three finite numbers, 0 or more');
    if (!(m.spread >= 0 && m.spread < Math.PI / 2)) throw new Error('bake: moon.spread must be an angle from 0 to under π / 2');
  }
  if (c) {
    if (!point(c.at)) throw new Error('bake: core.at must be three finite numbers');
    if (!(c.r > 0) || !Number.isFinite(c.r)) throw new Error('bake: core.r must be a finite number more than 0');
    if (!rgb(c.color)) throw new Error('bake: core.color must be three finite numbers, 0 or more');
    if (!(c.fall >= 0) || !Number.isFinite(c.fall)) throw new Error('bake: core.fall must be a finite number, 0 or more');
  }
  if (scene.sky != null && !rgb(scene.sky)) throw new Error('bake: sky must be three finite numbers, 0 or more');
}

function flatten(scene) {
  if (!Array.isArray(scene.meshes)) throw new Error('bake: scene.meshes must be an array');
  lights(scene);
  const meshes = scene.meshes;
  const names = new Set();
  let N = 0, T = 0;
  for (const m of meshes) {
    if (names.has(m.name)) throw new Error(`bake: two meshes are named ${m.name}`);
    names.add(m.name);
    if (!m.positions || !m.indices || !m.normals || !m.albedo) throw new Error(`bake: ${m.name} lacks positions, indices, normals or albedo`);
    const n = m.positions.length / 3;
    if (!Number.isInteger(n) || m.normals.length !== n * 3) throw new Error(`bake: ${m.name} has positions and normals of different lengths`);
    for (let i = 0; i < n * 3; i++) if (!Number.isFinite(m.positions[i])) throw new Error(`bake: ${m.name} has a position that is not a number at vertex ${(i / 3) | 0}`);
    for (let i = 0; i < n; i++) {
      const l = Math.hypot(m.normals[i * 3], m.normals[i * 3 + 1], m.normals[i * 3 + 2]);
      if (!(l > SHORT) || !Number.isFinite(l)) throw new Error(`bake: ${m.name} has a normal that is zero or not a number at vertex ${i}`);
    }
    if (m.indices.length % 3) throw new Error(`bake: ${m.name} has indices that are not whole triangles`);
    if (m.emit && m.emit.length !== n * 3) throw new Error(`bake: ${m.name} has emit of the wrong length`);
    if (m.albedo.length !== 3 && m.albedo.length !== n * 3) throw new Error(`bake: ${m.name} has albedo of the wrong length`);
    for (let i = 0; i < m.albedo.length; i++) {
      if (!(m.albedo[i] >= 0 && m.albedo[i] <= 1)) throw new Error(`bake: ${m.name} has an albedo that is not a number from 0 to 1 at vertex ${m.albedo.length === 3 ? 'all' : (i / 3) | 0}`);
    }
    if (m.emit) for (let i = 0; i < m.emit.length; i++) {
      if (!(m.emit[i] >= 0) || !Number.isFinite(m.emit[i])) throw new Error(`bake: ${m.name} has an emit that is not a finite number, 0 or more, at vertex ${(i / 3) | 0}`);
    }
    for (let i = 0; i < m.indices.length; i++) if (m.indices[i] >= n) throw new Error(`bake: ${m.name} has an index past its last vertex`);
    N += n; T += m.indices.length / 3;
  }
  const pos = shared(Float32Array, N * 3), nor = shared(Float32Array, N * 3), alb = shared(Float32Array, N * 3);
  const emi = shared(Float32Array, N * 3), rec = shared(Uint8Array, N), idx = shared(Uint32Array, T * 3);
  const spans = [];
  let v = 0, t = 0, glows = false;
  for (const m of meshes) {
    const n = m.positions.length / 3;
    pos.set(m.positions, v * 3);
    for (let i = 0; i < n; i++) {
      const x = m.normals[i * 3], y = m.normals[i * 3 + 1], z = m.normals[i * 3 + 2];
      const l = Math.hypot(x, y, z);
      nor[(v + i) * 3] = x / l; nor[(v + i) * 3 + 1] = y / l; nor[(v + i) * 3 + 2] = z / l;
    }
    if (m.albedo.length === 3) for (let i = 0; i < n; i++) alb.set(m.albedo, (v + i) * 3);
    else alb.set(m.albedo, v * 3);
    if (m.emit) { emi.set(m.emit, v * 3); glows = true; }
    if (m.receive) rec.fill(1, v, v + n);
    for (let i = 0; i < m.indices.length; i++) idx[t * 3 + i] = m.indices[i] + v;
    spans.push({ mesh: m, from: v, count: n });
    v += n; t += m.indices.length / 3;
  }
  return { N, T, pos, nor, alb, emi, rec, idx, spans, glows };
}

function faces(f) {
  const { T, pos, idx } = f;
  const fn = shared(Float32Array, T * 3), mid = shared(Float64Array, T * 3);
  let backward = 0;
  for (let t = 0; t < T; t++) {
    const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    const l = Math.hypot(x, y, z);
    if (l > 0) { fn[t * 3] = x / l; fn[t * 3 + 1] = y / l; fn[t * 3 + 2] = z / l; }
    const n = f.nor;
    if (l > 0 && x * (n[a] + n[b] + n[c]) + y * (n[a + 1] + n[b + 1] + n[c + 1]) + z * (n[a + 2] + n[b + 2] + n[c + 2]) < 0) backward++;
    for (let k = 0; k < 3; k++) mid[t * 3 + k] = (pos[a + k] + pos[b + k] + pos[c + k]) / 3;
  }
  const adjStart = shared(Uint32Array, f.N + 1), adj = shared(Uint32Array, T * 3);
  for (let i = 0; i < T * 3; i++) adjStart[idx[i] + 1]++;
  for (let v = 0; v < f.N; v++) adjStart[v + 1] += adjStart[v];
  const fill = new Uint32Array(f.N);
  for (let i = 0; i < T * 3; i++) { const v = idx[i]; adj[adjStart[v] + fill[v]++] = (i / 3) | 0; }
  return { fn, mid, adjStart, adj, backward };
}

function listOf(f, onlyReceivers) {
  let n = 0;
  for (let v = 0; v < f.N; v++) if (!onlyReceivers || f.rec[v]) n++;
  const list = shared(Uint32Array, n);
  for (let v = 0, i = 0; v < f.N; v++) if (!onlyReceivers || f.rec[v]) list[i++] = v;
  return list;
}

function pool(threads, data) {
  const workers = [];
  let pending = null, failed = null;
  for (let id = 0; id < threads; id++) {
    const w = new Worker(new URL('./bake-worker.mjs', import.meta.url), { workerData: { ...data, id } });
    w.on('message', () => { if (pending && --pending.left === 0) { const p = pending; pending = null; p.resolve(); } });
    w.on('error', (e) => { failed = e; if (pending) { const p = pending; pending = null; p.reject(e); } });
    workers.push(w);
  }
  return {
    run(msg) {
      if (failed) return Promise.reject(failed);
      return new Promise((resolve, reject) => {
        pending = { left: workers.length, resolve, reject };
        for (const w of workers) w.postMessage(msg);
      });
    },
    close: () => Promise.all(workers.map((w) => w.terminate())),
  };
}

export async function bake(scene, opts = {}) {
  const o = settle(opts);
  const began = performance.now();
  const f = flatten(scene);
  const builtAt = performance.now();
  const bvh = build(f.pos, f.idx);
  const bvhSeconds = (performance.now() - builtAt) / 1000;
  const { fn, mid, adjStart, adj, backward } = faces(f);

  const coreS = shared(Float32Array, f.N), moonS = shared(Float32Array, f.N), direct = shared(Float32Array, f.N * 3);
  const open = shared(Float32Array, f.N), bent = shared(Float32Array, f.N * 3), bounce = shared(Float32Array, f.N * 3);
  const ping = shared(Float32Array, f.N * 3), pong = o.bounces > 1 ? shared(Float32Array, f.N * 3) : ping;
  const rays = shared(Float64Array, o.threads);
  const every = o.bounces > 1 ? listOf(f, false) : null;
  const receivers = listOf(f, true);
  const directOver = o.bounces > 0 ? (every ?? listOf(f, false)) : receivers;

  const moon = scene.moon && { toward: [...scene.moon.toward], color: [...scene.moon.color], spread: scene.moon.spread };
  if (moon) {
    const l = Math.hypot(...moon.toward);
    moon.toward = moon.toward.map((x) => x / l);
  }
  const core = scene.core && { at: [...scene.core.at], r: scene.core.r, color: [...scene.core.color], fall: scene.core.fall };
  const sky = scene.sky ? [...scene.sky] : [0, 0, 0];

  const phases = [{ kind: 'direct', list: directOver, cost: Math.max(1, (core ? o.samples.core : 0) + (moon ? o.samples.moon : 0)) }];
  const passes = Math.max(1, o.bounces);
  for (let k = 1; k <= passes; k++) {
    phases.push({
      kind: 'gather', pass: k, light: o.bounces > 0,
      list: k < passes ? every : receivers,
      src: k === 1 ? direct : k % 2 ? pong : ping,
      out: k % 2 ? ping : pong,
      cost: o.samples.hemi,
    });
  }
  const live = receivers.length ? phases.filter((p) => p.list.length > 0) : [];
  const total = live.reduce((s, p) => s + p.list.length * p.cost, 0) || 1;

  const work = live.length === 0 ? null : pool(o.threads, {
    bvh, pos: f.pos, nor: f.nor, alb: f.alb, emi: f.emi, rec: f.rec, idx: f.idx, fn, mid, adjStart, adj,
    coreS, moonS, direct, open, bent, bounce, rays, glows: f.glows,
    moon, core, sky, samples: o.samples, bias: o.bias, reach: o.reach, seed: o.seed,
  });
  let finished = 0, said = -1, timer = null;
  const tell = (share) => {
    if (!o.onProgress) return;
    const s = Math.min(1, share);
    if (s !== said) { said = s; o.onProgress(s); }
  };
  const tracedAt = performance.now();
  try {
    for (const p of live) {
      const counter = shared(Int32Array, 1), done = shared(Int32Array, 1);
      if (o.onProgress) {
        timer = setInterval(() => tell(Math.min(0.999, (finished + Atomics.load(done, 0) * p.cost) / total)), 250);
      }
      await work.run({ kind: p.kind, pass: p.pass, light: p.light, list: p.list, src: p.src, out: p.out, counter, done });
      if (timer) { clearInterval(timer); timer = null; }
      finished += p.list.length * p.cost;
    }
  } finally {
    if (timer) clearInterval(timer);
    if (work) await work.close();
  }
  tell(1);
  const traced = (performance.now() - tracedAt) / 1000;

  const result = {};
  for (const { mesh, from, count } of f.spans) {
    if (!mesh.receive) continue;
    result[mesh.name] = {
      core: coreS.slice(from, from + count),
      moon: moonS.slice(from, from + count),
      open: open.slice(from, from + count),
      bent: bent.slice(from * 3, (from + count) * 3),
      bounce: bounce.slice(from * 3, (from + count) * 3),
    };
  }
  if (o.stats) {
    const cast = rays.reduce((s, x) => s + x, 0);
    Object.assign(o.stats, {
      vertices: f.N, triangles: f.T, receivers: receivers.length, threads: o.threads, backward,
      bvhNodes: bvh.nodeCount, bvhSeconds, traceSeconds: traced, seconds: (performance.now() - began) / 1000,
      rays: cast, raysPerSecond: traced > 0 ? cast / traced : 0, raysPerSecondPerThread: traced > 0 ? cast / traced / o.threads : 0,
    });
  }
  return result;
}

export function direct(scene, lit) {
  const out = {};
  const moon = scene.moon && { ...scene.moon, toward: (() => { const t = scene.moon.toward, l = Math.hypot(...t); return t.map((x) => x / l); })() };
  for (const m of scene.meshes) {
    const b = lit[m.name];
    if (!b) continue;
    const n = m.positions.length / 3, E = new Float32Array(n * 3), e = new Float64Array(3);
    for (let i = 0; i < n; i++) {
      e.fill(0);
      const nx = m.normals[i * 3], ny = m.normals[i * 3 + 1], nz = m.normals[i * 3 + 2];
      const l = Math.hypot(nx, ny, nz) || 1;
      if (moon) moonIrradiance(moon, b.moon[i], nx / l, ny / l, nz / l, e);
      if (scene.core) coreIrradiance(scene.core, b.core[i], m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2], nx / l, ny / l, nz / l, e);
      E[i * 3] = e[0]; E[i * 3 + 1] = e[1]; E[i * 3 + 2] = e[2];
    }
    out[m.name] = E;
  }
  return out;
}
