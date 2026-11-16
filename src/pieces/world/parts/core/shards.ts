import * as THREE from 'three';
import { seeded } from '../../layout';

// The stream's own shards, a few of them, turning slowly round the core as moons do. Each is a facet as the stream
// makes them (src/stream/shards.ts, made again here): a small body with three or four needle points pulled far out
// of it, flattened but never to a sheet, sometimes with a second lobe grown out of it at a slant, which notches its
// outline. Every vertex keeps how far it is from each edge of its face and which way the bevel of each of those
// edges looks, so the edges can catch the light without anything drawn round them.
// Where each shard is comes from what is stored with it and the time alone, worked out in its shader: nothing is
// written again once it is made, and a held frame is always the same picture.

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

// One facet, as triangles: for each vertex its place, the way its face looks, how far it is from each of its
// face's three edges, and the way the bevel of each of those edges looks. Its farthest point is 1 from its middle.
export const FLOATS = 18;
function facet(r: () => number, big: number): number[] {
  const ball = (): V3 => { const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), s * Math.sin(a), z]; };
  const scale = (p: V3, k: number): V3 => [p[0] * k, p[1] * k, p[2] * k];
  const size = 0.44 - 0.2 * big, body: V3[] = [], points: V3[] = [];
  for (let i = 0; i < 4; i++) body.push(scale(ball(), size * (0.7 + 0.3 * r())));
  for (let i = 0, n = 3 + Math.floor(r() * 2); i < n; i++) points.push(scale(ball(), i === 0 ? 1.25 + 0.45 * r() : 0.8 + 0.6 * r()));
  const squash: V3 = [1, 0.5 + 0.3 * r(), 0.56 + 0.2 * r()];
  const lobe = (more: V3[]): Solid => hull([...body, ...more].map((p): V3 => [p[0] * squash[0], p[1] * squash[1], p[2] * squash[2]]));
  const parts = [lobe(points)];
  if (r() < 0.12 + 0.4 * big) {
    const slant = r() * Math.PI * 2, along = (a: number, tilt: number, reach: number): V3 => [Math.cos(a) * Math.cos(tilt) * reach, Math.sin(a) * Math.cos(tilt) * reach, Math.sin(tilt) * reach];
    const second: V3[] = [along(slant, (r() - 0.5) * 0.6, 1 + 0.5 * r())];
    if (r() < 0.6) second.push(along(slant + (0.4 + 0.5 * r()) * (r() < 0.5 ? -1 : 1), (r() - 0.5) * 0.9, 0.6 + 0.5 * r()));
    parts.push(lobe(second));
  }
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

// What each shard is given to move by, four numbers to each:
//   plane: the way its path's plane faces, and how far out from the core's middle its path is, in units
//   move:  how fast it goes round, in radians a second (its sign is which way), where it is at the start, how fast it
//          turns over, and its size (half its length, in units)
//   spin:  the axis it turns over about, and how far it is turned at the start
//   life:  for one that is drawn into the neck now and then, how long it is between and where in that it starts
//          (0 for one that never is), whether it is glass, and how long it stays gone
export interface Moon { plane: V3; out: number; rate: number; at: number; spin: V3; spun: number; turns: number; size: number; every: number; from: number; hidden: number; glass: boolean }

// The same frame round a path's plane that the shader makes, so a place on the path can be chosen here.
export function frameOf(n: V3): [V3, V3] {
  const k = unit(n), up: V3 = Math.abs(k[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = unit(cross(k, up));
  return [u, cross(k, u)];
}

export function shardGeometry(moons: readonly Moon[], seed: number): THREE.BufferGeometry {
  const r = seeded(seed), cols = { position: 3, normal: 3, aEdge: 3, aB0: 3, aB1: 3, aB2: 3, aPlane: 4, aMove: 4, aSpin: 4, aLife: 4 } as const;
  const data: Record<keyof typeof cols, number[]> = { position: [], normal: [], aEdge: [], aB0: [], aB1: [], aB2: [], aPlane: [], aMove: [], aSpin: [], aLife: [] };
  moons.forEach((m, i) => {
    const mesh = facet(r, Math.min(1, (m.size - 1.5) / 3) * 0.6 + 0.2 * (i % 2));
    for (let v = 0; v < mesh.length; v += FLOATS) {
      data.position.push(mesh[v], mesh[v + 1], mesh[v + 2]);
      data.normal.push(mesh[v + 3], mesh[v + 4], mesh[v + 5]);
      data.aEdge.push(mesh[v + 6], mesh[v + 7], mesh[v + 8]);
      data.aB0.push(mesh[v + 9], mesh[v + 10], mesh[v + 11]);
      data.aB1.push(mesh[v + 12], mesh[v + 13], mesh[v + 14]);
      data.aB2.push(mesh[v + 15], mesh[v + 16], mesh[v + 17]);
      data.aPlane.push(...unit(m.plane), m.out);
      data.aMove.push(m.rate, m.at, m.turns, m.size);
      data.aSpin.push(...unit(m.spin), m.spun);
      data.aLife.push(m.every, m.from, m.glass ? 1 : 0, m.hidden);
    }
  });
  const g = new THREE.BufferGeometry();
  for (const [name, size] of Object.entries(cols)) g.setAttribute(name, new THREE.Float32BufferAttribute(data[name as keyof typeof cols], size));
  return g;
}
