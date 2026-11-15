import { seeded, slice } from '../../../../world/build';
import { EDGE, HEART, TEAR, VENTS, VIEW, drawn } from '../../layout';
import { BEDS, KIND, LAYER, layerOf, type Bed } from './layers';
import { D2R, RH, TOP, endAt, normal, point, wander, type Table } from './shape';
import { type Frame, type Sink, type V3, chunk, turn } from './sink';

// The rock of the break: every bed of every layer broken along its joints into blocks, each its own stuff, standing
// out of the face or sunk into it, turned a little, its edges cut back. Behind them, the surface itself, set back,
// shows dark in every open joint. The hollow round the core is lined the same way.

// The way the visitor looks, so no block is made that faces away from him.
const EYE: V3 = [0, Math.sin(VIEW.el * D2R), Math.cos(VIEW.el * D2R)];
// Blocks are made only on the bearings the visitor can see, and behind them the surface is set back this far.
const SEEN = 128;
const BACK = 4;

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

// A smooth noise in three dimensions, 0 to 1, the same on every call.
function noise3(seed: number): (x: number, y: number, z: number) => number {
  const h = (i: number, j: number, k: number) => { const v = Math.sin(i * 127.1 + j * 311.7 + k * 74.7 + seed * 19.3) * 43758.5453; return v - Math.floor(v); };
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (x, y, z) => {
    const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = sm(x - i), v = sm(y - j), w = sm(z - k);
    return mix(mix(mix(h(i, j, k), h(i + 1, j, k), u), mix(h(i, j + 1, k), h(i + 1, j + 1, k), u), v), mix(mix(h(i, j, k + 1), h(i + 1, j, k + 1), u), mix(h(i, j + 1, k + 1), h(i + 1, j + 1, k + 1), u), v), w);
  };
}
// The great forms of the break: whole regions of the face that stand out as buttresses and hanging masses, or are
// broken back into bays, each many blocks across, so the face has a scale above its blocks.
const n1 = noise3(1), n2 = noise3(2);
const great = (p: V3): number => 26 * (n1(p[0] / 120, p[1] / 90, p[2] / 120) - 0.5) + 11 * (n2(p[0] / 42, p[1] / 34, p[2] / 42) - 0.5);
// The beds dip and fold as they go round, so no bed is a level course: how far a bed is moved down the face at a
// bearing. Nothing moves at the edge itself.
const warp = (d: number, q: number): number => (16 * wander(d, 9, 21) + 8 * wander(d, 29, 22) + 3 * wander(d, 83, 23)) * Math.min(1, Math.max(0, (q - 7) / 30));
const bite = (d: number): number => Math.max(0, Math.min(1, (EDGE.out - EDGE.at(d)) / EDGE.bite * 1.6 - 0.4 + 0.3 * wander(d, 47, 32)));
const at = (T: Table, d: number, q: number): V3 => point(T, d, Math.max(0, q + warp(d, q))) as V3;

// The beds of a layer, each with its own thickness, laid down the face.
function beds(bed: Bed, r: () => number): [number, number][] {
  const out: [number, number][] = [];
  for (let q = bed.from; q < bed.to - 1;) {
    let t = mix(bed.thick[0], bed.thick[1], r());
    if (bed.to - (q + t) < bed.thick[0] * 0.6) t = bed.to - q;
    out.push([q, Math.min(bed.to, q + t)]);
    q += t;
  }
  return out;
}

// The bearings along a ring at one depth, each with how far along the ring it is.
function ring(T: Table, q: number, from: number, to: number): { deg: number[]; s: number[] } {
  const deg: number[] = [], s: number[] = [];
  let prev: V3 | null = null, run = 0;
  for (let d = from; d <= to + 1e-6; d += 0.25) {
    const p = point(T, d, q) as V3;
    if (prev) run += len(sub(p, prev));
    deg.push(d); s.push(run);
    prev = p;
  }
  return { deg, s };
}
const atRun = (r: { deg: number[]; s: number[] }, s: number): number => {
  const a = r.s;
  let lo = 0, hi = a.length - 1;
  if (s <= 0) return r.deg[0];
  if (s >= a[hi]) return r.deg[hi];
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m] <= s) lo = m; else hi = m; }
  return mix(r.deg[lo], r.deg[hi], (s - a[lo]) / Math.max(1e-6, a[hi] - a[lo]));
};

// Whether a block, by its corners, keeps above the lowest the underside may hang and out of the column under every
// vent's tip, where the light falls from the lowest rock.
const tips = VENTS.map((v) => drawn(v[0], v[1], v[2]));
export function fits(f: Frame, hx: number, hy: number, hz: number): boolean {
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) {
    const p: V3 = [0, 1, 2].map((i) => f.o[i] + f.x[i] * a * hx + f.y[i] * b * hy + f.z[i] * c * hz) as V3;
    if (p[1] < TEAR.low + 1) return false;
    const [x, y] = drawn(p[0], p[1], p[2]);
    for (const t of tips) if (Math.abs(x - t[0]) < 7 && y > t[1] - 3) return false;
  }
  return true;
}

// One block on the face between two bearings and two depths.
function put(s: Sink, T: Table, bed: Bed, d0: number, d1: number, q0: number, q1: number, r: () => number, hard: number, tone: number, extra = 0): void {
  const A0 = at(T, d0, q0), B0 = at(T, d1, q0), A1 = at(T, d0, q1), B1 = at(T, d1, q1);
  const dm = (d0 + d1) / 2, qm = (q0 + q1) / 2, qw = Math.max(0, qm + warp(dm, qm));
  const mid = point(T, dm, qw) as V3, n = normal(T, dm, qw) as V3;
  // A face turned away from the visitor gets no blocks, except near the edge, where the roof of the opening and the
  // underside of the lip are seen from below their own line.
  const roof = dot(n, EYE) < -0.22;
  if (dot(n, EYE) < (qm < 70 ? -0.6 : -0.22)) return;
  if (roof && r() < 0.4) return;
  const x = unit(sub(add(B0, B1), add(A0, A1)));
  let y = sub(add(A0, B0), add(A1, B1));
  y = unit(sub(y, [x[0] * dot(y, x), x[1] * dot(y, x), x[2] * dot(y, x)]));
  let z = cross(x, y);
  if (dot(z, n) < 0) z = [-z[0], -z[1], -z[2]];
  const w = (len(sub(B0, A0)) + len(sub(B1, A1))) / 2, h = (len(sub(A0, A1)) + len(sub(B0, B1))) / 2;
  if (w < 1.2 || h < 1.2) return;
  const lay = layerOf(mid[0], mid[1], mid[2]);
  let o = mix(bed.out[0], bed.out[1], r()) + hard + extra + (bed.from < 20 ? 0.45 : 1) * Math.max(-3, great(mid));
  if (roof) o += mix(-4, 9, r());
  // Where the edge is bitten, the rock under it has broken back into a hollow and the ground overhangs it.
  o -= 12 * bite(dm) * Math.max(0, 1 - qm / 90);
  // Now and then a block has fallen out, or stands well clear of the face, as a mass ready to fall.
  const k = r();
  if (k < 0.035) return;
  if (k > 0.965 && lay !== LAYER.made) o += 3 + 6 * r();
  const hx = (w / 2) * mix(0.96, 1.08, r()), hy = (h / 2) * mix(0.97, 1.07, r());
  // However far it stands out, a block reaches back into the face behind it, so nothing is seen past it.
  const hz = Math.max(3, Math.min(14, Math.min(hx, hy) * 0.8 + 2), (o + BACK + 3) / 2);
  const t = bed.tilt * D2R;
  let ry = (r() - 0.5) * 2 * t, rx = (r() - 0.5) * 2 * t;
  const rz = (r() - 0.5) * t * 0.7;
  // Columns: each shows two faces to the visitor and a ridge between them.
  if (lay === LAYER.basalt) ry = (r() < 0.5 ? -1 : 1) * mix(24, 40, r()) * D2R;
  if (lay === LAYER.metal) rx += (r() - 0.5) * 0.25;
  const f = turn({ o: [0, 0, 0], x, y, z }, rx, ry, rz);
  // The block's outer face sits so far out of the surface; it reaches back into the rock behind.
  const reach = lay === LAYER.basalt ? hx * 0.9 : 0;
  f.o = add(mid, f.z, o - hz - reach * 0.5);
  // A block may run on across the beds round it, so no bed is a clean course.
  const across = (lay === LAYER.crust ? mix(1, 2.4, r() ** 3) : mix(1, 1.3, r())) * (extra > 0 ? mix(1.6, 2.8, r()) : 1);
  const sunk = 2 * Math.round(9 * Math.min(1, Math.max(0, (1.5 - o) / 9)));
  if (!fits(f, hx * 1.1, hy * across * 1.1, hz + reach * 0.5)) return;
  chunk(s, f, hx * (across > 1.6 && extra <= 0 ? 0.8 : 1), hy * across, hz + reach * 0.5, [tone, lay, sunk - (lay === LAYER.basalt ? 0.5 : 0), KIND.rock], r, (r() - 0.5) * 0.18, (r() - 0.5) * 0.12, lay === LAYER.basalt ? 0.45 : 1);
  // Rubble broken off it, lying on the ledge at its foot: small things beside great ones.
  if (lay !== LAYER.basalt && hx > 5 && r() < 0.32) {
    for (let k = 0, n = 1 + Math.floor(r() * 3); k < n; k++) {
      const size = mix(1.2, 4.2, r() * r());
      const g = turn({ o: [0, 0, 0], x: f.x, y: f.y, z: f.z }, r() * 6, r() * 6, r() * 6);
      g.o = add(add(add(f.o, f.x, (r() * 2 - 1) * hx * 0.8), f.y, -hy * across * mix(0.85, 1.05, r())), f.z, hz + mix(-0.5, 1.2, r()) * size);
      if (fits(g, size, size, size)) chunk(s, g, size, size * mix(0.5, 0.9, r()), size * mix(0.6, 1, r()), [r(), lay, 0, KIND.rock], r);
    }
  }
}

// Every bed, round the bearings that can be seen.
export async function face(s: Sink, T: Table): Promise<void> {
  const r = seeded(7311);
  for (const bed of BEDS) {
    const list = beds(bed, r);
    for (const [q0, q1] of list) {
      // Each bed is harder or softer than the next, so it stands out of the face as a ledge or goes back under it.
      const hard = bed.layer === LAYER.crust ? (r() < 0.45 ? 1.6 : -0.8) : (r() - 0.5) * 1.2;
      const qm = (q0 + q1) / 2;
      const rr = ring(T, qm, -SEEN, SEEN);
      const total = rr.s[rr.s.length - 1];
      for (let run = 0; run < total;) {
        // Now and then a block spans several joints and stands well out: a mass that has not yet fallen.
        // Now and then a block spans several joints and beds and stands well out: one of the great masses the face
        // is broken into, with the small blocks round it.
        const whole = bed.layer !== LAYER.basalt && r() < (bed.layer === LAYER.crust ? 0.08 : 0.24);
        const step = mix(bed.joint[0], bed.joint[1], r() * r() * 0.6 + r() * 0.4) * (whole ? mix(2.5, 5, r()) : 1);
        const d0 = atRun(rr, run), d1 = atRun(rr, Math.min(total, run + step));
        run += step;
        if (endAt(T, (d0 + d1) / 2) < q1) continue;
        // A block taller along the face than a bed should be is broken across, by how far it reaches along the face.
        const A = at(T, (d0 + d1) / 2, q0), B = at(T, (d0 + d1) / 2, q1);
        const tall = len(sub(A, B)), n = Math.max(1, Math.ceil(tall / bed.tall));
        const tone = r();
        for (let i = 0; i < n; i++) {
          const a = q0 + ((q1 - q0) * i) / n, b = q0 + ((q1 - q0) * (i + 1)) / n;
          put(s, T, bed, d0, d1, a, b, r, hard, Math.min(1, Math.max(0, tone + (r() - 0.5) * 0.2)), whole ? mix(4, 10, r()) : 0);
        }
      }
      await slice();
    }
  }
}

// The paving and the soil under the edge: one strip, flush with the edge, its foot crumbled ragged.
export async function strip(s: Sink, T: Table): Promise<void> {
  const r = seeded(512);
  const foot = (d: number) => Math.max(12, 22 + 8 * wander(d, 13, 6) + 4 * wander(d, 41, 9) + 2.4 * wander(d, 211, 7) + 1.2 * wander(d, 523, 8) + (r() - 0.5) * 1.5);
  const cell = (q: number) => [0, LAYER.made, q, KIND.strip];
  for (let i = 0; i < T.degs.length; i++) {
    const a = T.degs[i], b = T.degs[(i + 1) % T.degs.length], bb = b < a ? b + 360 : b;
    const fa = foot(a), fb = foot(bb);
    const rows = [0, 0.15 * fa, 0.3 * fa, 0.5 * fa, 0.75 * fa, fa];
    const rowsB = [0, 0.15 * fb, 0.3 * fb, 0.5 * fb, 0.75 * fb, fb];
    for (let k = 0; k < rows.length - 1; k++) {
      const p00 = point(T, a, rows[k]), p01 = point(T, a, rows[k + 1]), p10 = point(T, bb, rowsB[k]), p11 = point(T, bb, rowsB[k + 1]);
      const n0 = normal(T, a, rows[k]), n1 = normal(T, bb, rowsB[k]);
      s.tri(p00, p01, p10, cell(rows[k]), n0, n0, n1, cell(rows[k + 1]), cell(rowsB[k]));
      s.tri(p10, p01, p11, cell(rowsB[k]), n1, n0, n1, cell(rows[k + 1]), cell(rowsB[k + 1]));
    }
    if (i % 64 === 0) await slice();
  }
}

// The surface itself, set back behind the blocks: dark in every open joint, and the whole of the underside where no
// block is made, closing the world from below.
export async function backing(s: Sink, T: Table): Promise<void> {
  const cols: number[] = [];
  for (let d = -180; d < 180;) { cols.push(d); d += Math.abs(d) <= SEEN ? 1 : 3; }
  const rows: number[] = [0, 2, 4, 7, 10, 14, 19, 24, 28];
  for (let q = 36; q < 480; q += 9) rows.push(q);
  const at = (d: number, q: number): { p: V3; n: V3 } => {
    const e = endAt(T, d), qq = Math.min(q, e), p = point(T, d, qq) as V3, n = normal(T, d, Math.min(qq, e - 1.5)) as V3;
    const k = qq < 1 ? 1.2 : BACK;
    return { p: add(p, n, -k), n };
  };
  for (let i = 0; i < cols.length; i++) {
    const a = cols[i], b = i + 1 < cols.length ? cols[i + 1] : cols[0] + 360;
    let prevA = at(a, 0), prevB = at(b, 0);
    for (let k = 1; k < rows.length; k++) {
      const done = rows[k - 1] >= Math.max(endAt(T, a), endAt(T, b));
      if (done) break;
      const qa = rows[k], A = at(a, qa), B = at(b, qa);
      const cell = [0.5, layerOf(A.p[0], A.p[1], A.p[2]), 0, KIND.back];
      s.tri(prevA.p, A.p, prevB.p, cell, prevA.n, A.n, prevB.n);
      s.tri(prevB.p, A.p, B.p, cell, prevB.n, A.n, B.n);
      prevA = A; prevB = B;
    }
    if (i % 24 === 0) await slice();
  }
}

// The hollow round the core: a dome of rock over it, from where the underside meets it up to its crown, lined with
// blocks of the deepest layer where the visitor can see in.
export async function hollow(s: Sink, T: Table): Promise<void> {
  const r = seeded(9901), H: V3 = [...HEART] as V3;
  const rimAt = (d: number): number => {
    const p = point(T, d, endAt(T, d));
    return Math.asin(Math.max(-1, Math.min(1, (p[1] - H[1]) / RH)));
  };
  const on = (d: number, a: number): V3 => [H[0] + RH * Math.cos(a) * Math.sin(d * D2R), H[1] + RH * Math.sin(a), H[2] + RH * Math.cos(a) * Math.cos(d * D2R)];
  const top = Math.PI / 2;
  // The lining, set back, as the backing is.
  const cols: number[] = [];
  for (let d = -180; d < 180; d += 3) cols.push(d);
  const back = [0.5, LAYER.metal, 0, KIND.back];
  const rowsN = 18;
  for (let i = 0; i < cols.length; i++) {
    const a = cols[i], b = a + 3, ra = rimAt(a), rb = rimAt(b);
    for (let k = 0; k < rowsN; k++) {
      const t0 = k / rowsN, t1 = (k + 1) / rowsN;
      const pa0 = on(a, mix(ra, top, t0)), pa1 = on(a, mix(ra, top, t1)), pb0 = on(b, mix(rb, top, t0)), pb1 = on(b, mix(rb, top, t1));
      const inset = (p: V3): V3 => add(p, unit(sub(p, H)), k === 0 ? 0.6 : BACK);
      const na = unit(sub(H, pa0)), nb = unit(sub(H, pb0)), na1 = unit(sub(H, pa1)), nb1 = unit(sub(H, pb1));
      s.tri(inset(pa0), inset(pb0), inset(pa1), back, na, nb, na1);
      s.tri(inset(pb0), inset(pb1), inset(pa1), back, nb, nb1, na1);
    }
  }
  await slice();
  // The blocks, in rings up the dome, each ring broken along its own joints, larger and more broken than the face's,
  // and here and there a crystal of the metal standing out toward the core.
  const metal = BEDS.find((b) => b.layer === LAYER.metal)!;
  for (let a = -0.25; a < 1.0;) {
    const step = mix(0.08, 0.15, r());
    const ring0 = a, ring1 = a + step;
    a += step;
    const am = (ring0 + ring1) / 2;
    for (let d = 40 + r() * 6; d < 320;) {
      const rad = RH * Math.cos(am) + 1;
      const w = mix(16, 40, r() * r()), dd = (w / rad) / D2R;
      const d0 = d, d1 = d + dd;
      d += dd;
      const rm = rimAt((d0 + d1) / 2);
      if (ring0 < rm - 0.02) continue;
      const mid = on((d0 + d1) / 2, am), z = unit(sub(H, mid));
      if (dot(z, EYE) < -0.25) continue;
      const yUp = unit(sub(on((d0 + d1) / 2, am + 0.01), mid));
      const x = unit(cross(yUp, z)), y = cross(z, x);
      const crystal = r() < 0.14;
      const hx = (rad * dd * D2R) / 2 * mix(0.95, 1.12, r()) * (crystal ? 0.55 : 1), hy = (RH * step) / 2 * mix(0.95, 1.12, r()) * (crystal ? 0.7 : 1);
      const tl = metal.tilt * D2R * 1.7;
      const f = turn({ o: [0, 0, 0], x, y, z }, (r() - 0.5) * 2 * tl, (r() - 0.5) * 2 * tl, (r() - 0.5) * tl * 2);
      const o = crystal ? mix(8, 22, r()) : mix(-2, 6, r()) + 0.5 * great(mid);
      const hz = Math.max(Math.min(hx, hy) * 0.8 + 3, (o + BACK + 3) / 2);
      f.o = add(mid, f.z, o - hz);
      const lay = crystal || r() < 0.55 ? LAYER.metal : LAYER.mantle;
      chunk(s, f, hx, hy, hz, [r(), lay, 2 * Math.round(9 * Math.min(1, Math.max(0, (1.5 - o) / 9))), KIND.rock], r, crystal ? -0.55 : (r() - 0.5) * 0.25, (r() - 0.5) * 0.12, crystal ? 0.4 : 1);
    }
    await slice();
  }
}
