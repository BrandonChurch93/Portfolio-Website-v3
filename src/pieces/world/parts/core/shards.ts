import * as THREE from 'three';
import { seeded } from '../../layout';

// Pieces of the planet, a few of them, being drawn in round the core's lower half to its beam: broken lumps of its
// rock. Every vertex keeps how far it is from each edge of its face and which way the bevel of each of those edges
// looks, so the edges can catch the light without anything drawn round them. Where each is comes from what is stored with it and the time alone, worked out in its shader: nothing
// is written again once it is made, and a held frame is always the same picture.

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

interface Solid { pts: V3[]; faces: [number, number, number][] }

// The tightest skin round a handful of points.
function hull(pts: V3[]): Solid {
  const faces: [number, number, number][] = [], n = pts.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    const nrm = cross(sub(pts[j], pts[i]), sub(pts[k], pts[i])), l = len(nrm);
    if (l < 1e-9) continue;
    let over = 0, under = 0;
    for (let m = 0; m < n && !(over && under); m++) {
      if (m === i || m === j || m === k) continue;
      const d = dot(nrm, sub(pts[m], pts[i])) / l;
      if (d > -1e-7) over++;
      if (d < 1e-7) under++;
    }
    if (over && under) continue;
    faces.push(over ? [i, k, j] : [i, j, k]);
  }
  return { pts, faces };
}

// Solids as triangles: for each vertex its place, the way its face looks, how far it is from each of its face's three
// edges, and the way the bevel of each of those edges looks. Its farthest point is 1 from its middle.
export const FLOATS = 18;
const scale = (p: V3, k: number): V3 => [p[0] * k, p[1] * k, p[2] * k];
function emit(parts: Solid[]): number[] {
  const used = parts.flatMap((s) => [...new Set(s.faces.flat())].map((i) => s.pts[i]));
  const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of used) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p[a]); hi[a] = Math.max(hi[a], p[a]); }
  const mid: V3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const reach = used.reduce((m, p) => Math.max(m, len(sub(p, mid))), 0) || 1;
  const out: number[] = [];
  for (const s of parts) {
    const pts = s.pts.map((p) => scale(sub(p, mid), 1 / reach));
    const normals = s.faces.map(([a, b, c]) => unit(cross(sub(pts[b], pts[a]), sub(pts[c], pts[a]))));
    const across = new Map<string, number[]>(), key = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
    s.faces.forEach((f, i) => { for (let e = 0; e < 3; e++) { const id = key(f[e], f[(e + 1) % 3]); across.set(id, [...(across.get(id) ?? []), i]); } });
    s.faces.forEach(([ia, ib, ic], i) => {
      const a = pts[ia], b = pts[ib], c = pts[ic], n = normals[i], area = len(cross(sub(b, a), sub(c, a)));
      const height = (p: V3, q: V3) => area / (len(sub(p, q)) || 1);
      const bevel = (p: number, q: number): V3 => { const j = (across.get(key(p, q)) ?? []).find((f) => f !== i); return j === undefined ? n : unit(add(n, normals[j])); };
      const bevels = [bevel(ib, ic), bevel(ic, ia), bevel(ia, ib)], edges: V3[] = [[height(b, c), 0, 0], [0, height(c, a), 0], [0, 0, height(a, b)]];
      [a, b, c].forEach((p, v) => out.push(...p, ...n, ...edges[v], ...bevels[0], ...bevels[1], ...bevels[2]));
    });
  }
  return out;
}

// A piece of the planet's rock: a broken lump, a score of points in a flattened round body and a few pulled out to
// corners, with its skin drawn tight round them, so every face is a flat break and every edge a hard one.
function chunk(r: () => number): number[] {
  const ball = (): V3 => { const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), s * Math.sin(a), z]; };
  const pts: V3[] = [];
  for (let i = 0; i < 22; i++) pts.push(scale(ball(), 0.5 + 0.5 * r() * r()));
  for (let i = 0, n = 2 + Math.floor(r() * 3); i < n; i++) pts.push(scale(ball(), 1.05 + 0.35 * r()));
  const squash: V3 = [1, 0.7 + 0.2 * r(), 0.6 + 0.2 * r()];
  return emit([hull(pts.map((p): V3 => [p[0] * squash[0], p[1] * squash[1], p[2] * squash[2]]))]);
}

// What each shard is given to move by, four numbers to each:
//   move: how long one of its comings takes, in seconds, where in that it starts, half its length, in units, and
//         its own seed
//   spin: the axis it turns about, and how fast, in radians a second
export interface Moon { period: number; start: number; size: number; seed: number; axis: V3; rate: number }

export function shardGeometry(moons: readonly Moon[], seed: number): THREE.BufferGeometry {
  const r = seeded(seed), cols = { position: 3, normal: 3, aEdge: 3, aB0: 3, aB1: 3, aB2: 3, aMove: 4, aSpin: 4 } as const;
  const data: Record<keyof typeof cols, number[]> = { position: [], normal: [], aEdge: [], aB0: [], aB1: [], aB2: [], aMove: [], aSpin: [] };
  moons.forEach((m) => {
    const mesh = chunk(r);
    for (let v = 0; v < mesh.length; v += FLOATS) {
      data.position.push(mesh[v], mesh[v + 1], mesh[v + 2]);
      data.normal.push(mesh[v + 3], mesh[v + 4], mesh[v + 5]);
      data.aEdge.push(mesh[v + 6], mesh[v + 7], mesh[v + 8]);
      data.aB0.push(mesh[v + 9], mesh[v + 10], mesh[v + 11]);
      data.aB1.push(mesh[v + 12], mesh[v + 13], mesh[v + 14]);
      data.aB2.push(mesh[v + 15], mesh[v + 16], mesh[v + 17]);
      data.aMove.push(m.period, m.start, m.size, m.seed);
      data.aSpin.push(...unit(m.axis), m.rate);
    }
  });
  const g = new THREE.BufferGeometry();
  for (const [name, size] of Object.entries(cols)) g.setAttribute(name, new THREE.Float32BufferAttribute(data[name as keyof typeof cols], size));
  return g;
}
