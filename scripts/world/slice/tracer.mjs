// The slice's ray caster: what the visitor sees of a set of meshes from the world's one view, a pixel at a time, with
// the core's light worked out for each pixel and not for each vertex. The view never moves (VIEW in the layout), so a
// pixel of the page is one place on the rock for good, and what reaches that place from the core can be worked out
// once, as finely as the screen shows it.
//
//   import { trace } from './tracer.mjs'
//   const out = await trace({ meshes, window, sub, samples, bounces, hard, reach, albedo })
//
//   meshes   [{ name, positions: Float32Array(3n), indices: Uint32Array(3t), normals?: Float32Array(3n), seen: boolean,
//               tone?: Float32Array(t) }]
//            seen: its pixels are kept. A mesh that is not seen is not met by the eye's rays at all (what is seen
//            is kept even behind it: the page's own parts are drawn over the picture) and only blocks light.
//            tone: a number for each triangle, handed back for each pixel (which block a face is of).
//   window   { x, y, w, h, ppu }: the part of the world's host that is drawn, in units from its top left, and how many
//            pixels a unit gets
//   sub      how many rays across and down each pixel (2 is four rays a pixel)
//   samples  { core, hemi, moon, line }: for each of a pixel's rays, how many toward the core's ball, how many over
//            the half sphere (for how open the place is and what has bounced), how many toward the moon, and how many
//            toward the stream's line under the core
//   bounces  how many times the core's light is followed off the rock
//   hard     the share of the core's radius its light is taken to come from: 1 is the whole ball, which is a soft
//            light this close. Less is a harder edge to every shadow
//   reach    how far a ray over the half sphere looks before a place counts as open, in units
//   albedo   [r, g, b], the stone under white light, for what bounces
//   table    the blocks' table for the stone (./stone.mjs), eight numbers a block; a mesh with `block` (which block
//            each triangle is of) and `tag` (what kind of face) is then stone, and has a color and a relief of its own
//
// It gives, for each pixel, Float32Arrays of w × h (or three times that):
//   cover   the share of the pixel's rays that met a seen mesh first
//   depth   how far toward the visitor the place is, in units (the mean over those rays)
//   normal  its normal (3)
//   face    its face's own normal, not smoothed (3)
//   core    the share of the core's ball seen from it
//   open    the share of the half sphere over it that is open for `reach`
//   bounce  the irradiance that reaches it from the core after bouncing (3)
//   moon    the share of the moon seen from it
//   line    the share of the stream's light that reaches it: of the places along its line, those seen, the nearest
//           counting most
//   tone    the tone of the face it is on
//   albedo  its color under white light (3)
//   lit     how much of the core's light falls on it: the share seen, by how the face is turned, by how far it is
//   near    the share of the half sphere over it that is open for a few units (what is in a crevice is not)
// Every one but cover is the mean over the rays that met a seen mesh, so a pixel on an outline holds the rock's own
// values and cover says how much of the pixel it is.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { build, closest, any } from '../lib/bvh.mjs';
import { L, light } from '../lib/plan.mjs';
import { EYE, through, toward } from './view.mjs';
import { stone } from './stone.mjs';

const shared = (Type, n) => new Type(new SharedArrayBuffer(Math.max(1, n) * Type.BYTES_PER_ELEMENT));
export { EYE, through, toward };

export async function trace(o) {
  const t0 = performance.now();
  // One soup of triangles, with which mesh each is of.
  let nv = 0, nt = 0;
  for (const m of o.meshes) { nv += m.positions.length / 3; nt += m.indices.length / 3; }
  const P = shared(Float32Array, nv * 3), N = shared(Float32Array, nv * 3), I = shared(Uint32Array, nt * 3), OF = shared(Uint8Array, nt), TONE = shared(Float32Array, nt);
  const BLOCK = shared(Uint32Array, nt), TAG = shared(Uint8Array, nt), TABLE = shared(Float32Array, o.table ? o.table.length : 8);
  if (o.table) TABLE.set(o.table);
  let v0 = 0, t = 0, shown = 0;
  // The seen meshes first: the eye's rays meet only those, so the triangles they can meet are the first of the soup.
  const order = [...o.meshes].sort((a, b) => (b.seen ? 1 : 0) - (a.seen ? 1 : 0));
  order.forEach((m, k) => {
    P.set(m.positions, v0 * 3);
    if (m.normals) N.set(m.normals, v0 * 3);
    for (let i = 0; i < m.indices.length; i++) I[t * 3 + i] = m.indices[i] + v0;
    const n = m.indices.length / 3;
    for (let i = 0; i < n; i++) { OF[t + i] = (m.seen ? 1 : 0) | (m.normals ? 2 : 0) | (m.block && o.table ? 4 : 0); TONE[t + i] = m.tone ? m.tone[i] : 0; if (m.block) BLOCK[t + i] = m.block[i]; if (m.tag) TAG[t + i] = m.tag[i]; }
    v0 += m.positions.length / 3;
    t += n;
    if (m.seen) shown = t;
  });
  const bvh = build(P, I), eyes = build(P, I.subarray(0, shown * 3));
  const W = Math.round(o.window.w * o.window.ppu), H = Math.round(o.window.h * o.window.ppu), n = W * H;
  const out = { cover: shared(Float32Array, n), depth: shared(Float32Array, n), normal: shared(Float32Array, n * 3), face: shared(Float32Array, n * 3), core: shared(Float32Array, n), open: shared(Float32Array, n), bounce: shared(Float32Array, n * 3), moon: shared(Float32Array, n), line: shared(Float32Array, n), tone: shared(Float32Array, n), albedo: shared(Float32Array, n * 3), lit: shared(Float32Array, n), near: shared(Float32Array, n) };
  const next = new Int32Array(new SharedArrayBuffer(8));
  const threads = Math.max(1, o.threads ?? os.availableParallelism());
  const lights = light();
  const data = { bvh, eyes, P, N, I, OF, TONE, BLOCK, TAG, TABLE, close: o.close ?? 10, out, next, W, H, window: o.window, sub: o.sub ?? 2, samples: { core: 4, hemi: 4, moon: 1, line: 0, ...o.samples }, bounces: o.bounces ?? 2, hard: o.hard ?? 1, reach: o.reach ?? 160, albedo: o.albedo, core: lights.core, moon: lights.moon, sky: lights.sky, line: o.line ?? null, seed: o.seed ?? 1 };
  let rays = 0;
  await Promise.all(Array.from({ length: threads }, () => new Promise((done, fail) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: data });
    w.on('message', (m) => { if (m.rays) rays += m.rays; if (m.row !== undefined && o.onProgress) o.onProgress(m.row / H); });
    w.on('error', fail);
    w.on('exit', (code) => (code ? fail(new Error(`tracer: a worker stopped with ${code}`)) : done()));
  })));
  const seconds = (performance.now() - t0) / 1000;
  return { ...out, W, H, window: o.window, stats: { triangles: nt, rays, seconds, raysPerSecond: rays / seconds, threads } };
}

if (!isMainThread) {
  const d = workerData, { bvh, eyes, P, N, I, OF, TONE, BLOCK, TAG, TABLE, out, W, H } = d;
  const st = new Float64Array(6);
  const hit = new Float64Array(4), dir = new Float64Array(3);
  const S = d.sub, ppu = d.window.ppu, C = d.core.at, R = d.core.r, RL = R * d.hard, A = d.albedo, FALL = d.core.fall;
  const MT = d.moon.toward, MS = Math.tan(d.moon.spread);
  const BIAS = 0.04;
  let rays = 0;
  // A small generator, seeded for each pixel so a picture is the same every time it is made.
  let s0 = 1;
  const rnd = () => { s0 = (s0 + 0x6d2b79f5) | 0; let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const illum = (c, s) => (c >= s ? c : c <= -s ? 0 : ((c + s) * (c + s)) / (4 * s));
  // The triangle's own normal, turned toward where the ray came from.
  const fn = new Float64Array(3), sn = new Float64Array(3), tb = new Float64Array(6);
  function normals(tri, u, v, rx, ry, rz) {
    const a = I[tri * 3] * 3, b = I[tri * 3 + 1] * 3, c = I[tri * 3 + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    if (nx * rx + ny * ry + nz * rz > 0) { nx = -nx; ny = -ny; nz = -nz; }
    fn[0] = nx; fn[1] = ny; fn[2] = nz;
    if (OF[tri] & 2) {
      const w = 1 - u - v;
      let sx = N[a] * w + N[b] * u + N[c] * v, sy = N[a + 1] * w + N[b + 1] * u + N[c + 1] * v, sz = N[a + 2] * w + N[b + 2] * u + N[c + 2] * v;
      const k = Math.hypot(sx, sy, sz) || 1;
      sx /= k; sy /= k; sz /= k;
      if (sx * nx + sy * ny + sz * nz < 0.2) { sx = nx; sy = ny; sz = nz; }
      sn[0] = sx; sn[1] = sy; sn[2] = sz;
    } else { sn[0] = nx; sn[1] = ny; sn[2] = nz; }
  }
  // Two directions square to a normal.
  function basis(nx, ny, nz) {
    const s = nz >= 0 ? 1 : -1, a = -1 / (s + nz), b = nx * ny * a;
    tb[0] = 1 + s * nx * nx * a; tb[1] = s * b; tb[2] = -s * nx;
    tb[3] = b; tb[4] = s + ny * ny * a; tb[5] = -ny;
  }
  // The core's irradiance on a face at a place, with one ray toward a place on its ball: its share of the core's color.
  function coreOn(px, py, pz, nx, ny, nz) {
    const cx = C[0] - px, cy = C[1] - py, cz = C[2] - pz, dist = Math.hypot(cx, cy, cz);
    if (dist <= R) return 1;
    const ratio = R / dist, c = (cx * nx + cy * ny + cz * nz) / dist, k = Math.pow(ratio, FALL) * illum(c, Math.min(1, ratio));
    if (k <= 0) return 0;
    // A place on the ball's lit disc as seen from here.
    const u = rnd(), v = rnd(), r = RL * Math.sqrt(u), th = 6.283185307 * v;
    const lx = cx / dist, ly = cy / dist, lz = cz / dist;
    basis(lx, ly, lz);
    const qx = cx + (tb[0] * Math.cos(th) + tb[3] * Math.sin(th)) * r, qy = cy + (tb[1] * Math.cos(th) + tb[4] * Math.sin(th)) * r, qz = cz + (tb[2] * Math.cos(th) + tb[5] * Math.sin(th)) * r;
    const ql = Math.hypot(qx, qy, qz), dx = qx / ql, dy = qy / ql, dz = qz / ql;
    if (dx * nx + dy * ny + dz * nz <= 0) return 0;
    rays++;
    return any(bvh, px + nx * BIAS, py + ny * BIAS, pz + nz * BIAS, dx, dy, dz, ql - Math.sqrt(Math.max(0, R * R - r * r))) ? 0 : k;
  }

  const acc = new Float64Array(24);
  for (;;) {
    const row = Atomics.add(d.next, 0, 4);
    if (row >= H) break;
    for (let y = row; y < Math.min(H, row + 4); y++) for (let x = 0; x < W; x++) {
      s0 = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(d.seed, 83492791)) | 0;
      acc.fill(0);
      let got = 0;
      const ou = rnd(), ov = rnd();
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const hx = d.window.x + (x + (sx + 0.5) / S) / ppu, hy = d.window.y + (y + (sy + 0.5) / S) / ppu;
        through(hx, hy, dir);
        rays++;
        const tri = closest(eyes, EYE[0], EYE[1], EYE[2], dir[0], dir[1], dir[2], 1e9, hit);
        if (tri < 0) continue;
        got++;
        const px = EYE[0] + dir[0] * hit[0], py = EYE[1] + dir[1] * hit[0], pz = EYE[2] + dir[2] * hit[0];
        normals(tri, hit[1], hit[2], dir[0], dir[1], dir[2]);
        const nx = fn[0], ny = fn[1], nz = fn[2];
        let mx = sn[0], my = sn[1], mz = sn[2], ar = A[0], ag = A[1], ab = A[2];
        if (OF[tri] & 4) { stone(px, py, pz, nx, ny, nz, TABLE, BLOCK[tri] * 8, TAG[tri], st); ar = st[0]; ag = st[1]; ab = st[2]; mx = st[3]; my = st[4]; mz = st[5]; }
        acc[15] += ar; acc[16] += ag; acc[17] += ab;
        const ox = px + nx * BIAS, oy = py + ny * BIAS, oz = pz + nz * BIAS;
        acc[0] += toward(px, py, pz);
        acc[1] += mx; acc[2] += my; acc[3] += mz;
        acc[4] += nx; acc[5] += ny; acc[6] += nz;
        acc[13] += TONE[tri];
        // The share of the core's ball seen, over the directions on the outer side of the face.
        {
          const cx = C[0] - px, cy = C[1] - py, cz = C[2] - pz, dist = Math.hypot(cx, cy, cz);
          if (dist <= R) { acc[7] += 1; acc[18] += 1; }
          else {
            const lx = cx / dist, ly = cy / dist, lz = cz / dist;
            basis(lx, ly, lz);
            const bx0 = tb[0], bx1 = tb[1], bx2 = tb[2], by0 = tb[3], by1 = tb[4], by2 = tb[5];
            let seen = 0, over = 0;
            const K = d.samples.core, base = (sy * S + sx) * K;
            for (let i = 0; i < K; i++) {
              const u = (ou + (base + i + 1) * 0.7548776662) % 1, v = (ov + (base + i + 1) * 0.5698402910) % 1, r = RL * Math.sqrt(u), th = 6.283185307 * v;
              const qx = cx + (bx0 * Math.cos(th) + by0 * Math.sin(th)) * r, qy = cy + (bx1 * Math.cos(th) + by1 * Math.sin(th)) * r, qz = cz + (bx2 * Math.cos(th) + by2 * Math.sin(th)) * r;
              const ql = Math.hypot(qx, qy, qz), dx = qx / ql, dy = qy / ql, dz = qz / ql;
              if (dx * nx + dy * ny + dz * nz <= 0) continue;
              over++;
              rays++;
              if (!any(bvh, ox, oy, oz, dx, dy, dz, ql - Math.sqrt(Math.max(0, R * R - r * r)))) seen++;
            }
            const share = over ? seen / over : 0, ratio = R / dist;
            acc[7] += share;
            acc[18] += share * Math.pow(ratio, FALL) * illum((cx * mx + cy * my + cz * mz) / dist, Math.min(1, ratio));
          }
        }
        // Over the half sphere: how open the place is, and what the core's light sends back off the rock.
        {
          const K = d.samples.hemi;
          let open = 0, close = 0, br = 0, bg = 0, bb = 0;
          for (let i = 0; i < K; i++) {
            let qx = ox, qy = oy, qz = oz, wx = nx, wy = ny, wz = nz, tr = 1, tg = 1, tbl = 1;
            for (let b = 0; b <= d.bounces; b++) {
              const u = rnd(), v = rnd(), r = Math.sqrt(u), th = 6.283185307 * v, up = Math.sqrt(1 - u);
              basis(wx, wy, wz);
              const dx = (tb[0] * Math.cos(th) + tb[3] * Math.sin(th)) * r + wx * up, dy = (tb[1] * Math.cos(th) + tb[4] * Math.sin(th)) * r + wy * up, dz = (tb[2] * Math.cos(th) + tb[5] * Math.sin(th)) * r + wz * up;
              rays++;
              const t2 = closest(bvh, qx, qy, qz, dx, dy, dz, 1e9, hit);
              if (b === 0 && (t2 < 0 || hit[0] > d.reach)) open++;
              if (b === 0 && (t2 < 0 || hit[0] > d.close)) close++;
              if (t2 < 0) { br += tr * d.sky[0]; bg += tg * d.sky[1]; bb += tbl * d.sky[2]; break; }
              if (b === d.bounces) break;
              const hx2 = qx + dx * hit[0], hy2 = qy + dy * hit[0], hz2 = qz + dz * hit[0];
              normals(t2, hit[1], hit[2], dx, dy, dz);
              wx = fn[0]; wy = fn[1]; wz = fn[2];
              tr *= A[0]; tg *= A[1]; tbl *= A[2];
              const k = coreOn(hx2, hy2, hz2, wx, wy, wz);
              br += tr * k * d.core.color[0]; bg += tg * k * d.core.color[1]; bb += tbl * k * d.core.color[2];
              qx = hx2 + wx * BIAS; qy = hy2 + wy * BIAS; qz = hz2 + wz * BIAS;
            }
          }
          if (K) { acc[8] += open / K; acc[9] += br / K; acc[10] += bg / K; acc[11] += bb / K; acc[19] += close / K; }
        }
        // The moon.
        {
          const K = d.samples.moon;
          let seen = 0;
          for (let i = 0; i < K; i++) {
            const a = 6.283185307 * rnd(), r = MS * Math.sqrt(rnd());
            basis(MT[0], MT[1], MT[2]);
            const dx = MT[0] + (tb[0] * Math.cos(a) + tb[3] * Math.sin(a)) * r, dy = MT[1] + (tb[1] * Math.cos(a) + tb[4] * Math.sin(a)) * r, dz = MT[2] + (tb[2] * Math.cos(a) + tb[5] * Math.sin(a)) * r;
            if (dx * nx + dy * ny + dz * nz <= 0) continue;
            rays++;
            if (!any(bvh, ox, oy, oz, dx, dy, dz, 1e9)) seen++;
          }
          if (K) acc[12] += seen / K;
        }
        // The stream's line under the core: places along it, each seen or not. They are taken evenly over the angle
        // the line fills from here, which is how its light falls on the place, so the nearest part counts most.
        if (d.line && d.samples.line) {
          const K = d.samples.line, F = d.line.from, T = d.line.to;
          const ax = T[0] - F[0], ay = T[1] - F[1], az = T[2] - F[2], al = Math.hypot(ax, ay, az), ux = ax / al, uy = ay / al, uz = az / al;
          const wx = px - F[0], wy = py - F[1], wz = pz - F[2], along = wx * ux + wy * uy + wz * uz, off = Math.sqrt(Math.max(1e-6, wx * wx + wy * wy + wz * wz - along * along));
          const a0 = Math.atan2(-along, off), a1 = Math.atan2(al - along, off);
          let sum = 0, seen = 0;
          for (let i = 0; i < K; i++) {
            const s = along + off * Math.tan(a0 + ((a1 - a0) * (i + rnd())) / K), lx = F[0] + ux * s - px, ly = F[1] + uy * s - py, lz = F[2] + uz * s - pz;
            const ll = Math.hypot(lx, ly, lz), dx = lx / ll, dy = ly / ll, dz = lz / ll, c = dx * nx + dy * ny + dz * nz;
            if (c <= 0) continue;
            sum += c;
            rays++;
            if (!any(bvh, ox, oy, oz, dx, dy, dz, ll - 1)) seen += c;
          }
          acc[14] += sum > 0 ? seen / sum : 0;
        }
      }
      const at = y * W + x;
      out.cover[at] = got / (S * S);
      if (!got) continue;
      const k = 1 / got;
      out.depth[at] = acc[0] * k;
      let l = Math.hypot(acc[1], acc[2], acc[3]) || 1;
      out.normal[at * 3] = acc[1] / l; out.normal[at * 3 + 1] = acc[2] / l; out.normal[at * 3 + 2] = acc[3] / l;
      l = Math.hypot(acc[4], acc[5], acc[6]) || 1;
      out.face[at * 3] = acc[4] / l; out.face[at * 3 + 1] = acc[5] / l; out.face[at * 3 + 2] = acc[6] / l;
      out.core[at] = acc[7] * k;
      out.open[at] = acc[8] * k;
      out.bounce[at * 3] = acc[9] * k; out.bounce[at * 3 + 1] = acc[10] * k; out.bounce[at * 3 + 2] = acc[11] * k;
      out.moon[at] = acc[12] * k;
      out.tone[at] = acc[13] * k;
      out.line[at] = acc[14] * k;
      out.albedo[at * 3] = acc[15] * k; out.albedo[at * 3 + 1] = acc[16] * k; out.albedo[at * 3 + 2] = acc[17] * k;
      out.lit[at] = acc[18] * k;
      out.near[at] = acc[19] * k;
    }
    parentPort.postMessage({ row });
  }
  parentPort.postMessage({ rays });
}
