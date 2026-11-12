import { seeded } from './rand';
import { firstShards } from './shards-first';

// The shards as small solid meshes, made once from a seed. They are facets: sharp jagged pieces with flat faces and
// three or four needle points. A larger one has a second lobe grown out of the same body at a slant, which puts a
// notch in its outline. The same shapes are drawn in two materials, solid and clear.
// A vertex is: position, the way its face looks, how far it is from each edge of its face, a mark only the first
// round's shards use, and for each of those edges the way the bevel between its face and the next one looks.
// Sizes are in shard radii: the farthest point is 1 from the center.

export const VERTEX_FLOATS = 19;
// A small piece keeps more body so it still shows a face. A large one is more needle, and more often fused.
const CLASSES = [{ upTo: 0.15, kinds: 10 }, { upTo: 0.5, kinds: 7 }, { upTo: 1, kinds: 7 }];
export const FACET_KINDS = CLASSES.reduce((n, c) => n + c.kinds, 0);
export const FIRST_KINDS = 8;

export type Look = 'facets' | 'first';

export interface ShardMeshes {
  data: Float32Array;
  // First vertex and vertex count of each kind: the facets, then the first round's copper leaf, then its glass.
  kinds: { first: number; count: number }[];
}

// Which facet a shard is, from how large it is among its fellows (0 to 1) and a number of its own.
export function facetKind(big: number, pick: number): number {
  let first = 0;
  for (const c of CLASSES) {
    if (big <= c.upTo) return first + Math.min(c.kinds - 1, Math.floor(pick * c.kinds));
    first += c.kinds;
  }
  return FACET_KINDS - 1;
}

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

interface Solid { pts: V3[]; faces: [number, number, number][] }

// The tightest skin round a handful of points: every three of them that leave all the others on one side.
function hull(pts: V3[]): Solid {
  const faces: [number, number, number][] = [];
  const n = pts.length;
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

// One lobe of a facet: the skin round its body and a few points pulled far out of it.
function lobe(body: V3[], points: V3[], squash: V3): Solid {
  return hull([...body, ...points].map((p): V3 => [p[0] * squash[0], p[1] * squash[1], p[2] * squash[2]]));
}

function facet(r: () => number, big: number): number[] {
  const ball = (): V3 => { const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), s * Math.sin(a), z]; };
  const along = (angle: number, tilt: number, reach: number): V3 => [Math.cos(angle) * Math.cos(tilt) * reach, Math.sin(angle) * Math.cos(tilt) * reach, Math.sin(tilt) * reach];
  // A small body, and three or four points pulled far out of it, one of them further than the rest, so each ends in
  // a needle and no piece is the same on both sides. A small piece keeps more body, so it still shows a face.
  const size = 0.44 - 0.2 * big;
  const body: V3[] = [];
  for (let i = 0; i < 4; i++) { const p = ball(), k = size * (0.7 + 0.3 * r()); body.push([p[0] * k, p[1] * k, p[2] * k]); }
  const points: V3[] = [];
  for (let i = 0, n = 3 + Math.floor(r() * 2); i < n; i++) { const p = ball(), k = i === 0 ? 1.25 + 0.45 * r() : 0.8 + 0.6 * r(); points.push([p[0] * k, p[1] * k, p[2] * k]); }
  // Flattened, but never to a sheet: a thin one shows two faces and reads as folded paper.
  const squash: V3 = [1, 0.5 + 0.3 * r(), 0.44 + 0.2 * r()];
  const parts = [lobe(body, points, squash)];
  if (r() < 0.25 + 0.55 * big) {
    // A notched piece has a second lobe grown from the same body at a slant, so the two share a heart and part only
    // toward their points. Two whole splinters crossed read as two pieces stuck together.
    const slant = r() * Math.PI * 2;
    const second: V3[] = [along(slant, (r() - 0.5) * 0.6, 1.0 + 0.5 * r())];
    if (r() < 0.6) second.push(along(slant + (0.4 + 0.5 * r()) * (r() < 0.5 ? -1 : 1), (r() - 0.5) * 0.9, 0.6 + 0.5 * r()));
    parts.push(lobe(body, second, squash));
  }
  // Center it on its own corners, and size it so that none of them is further than 1 from the middle. Whatever its
  // shape, a piece reaches no further than its size allows.
  const used = parts.flatMap((s) => [...new Set(s.faces.flat())].map((i) => s.pts[i]));
  const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of used) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p[a]); hi[a] = Math.max(hi[a], p[a]); }
  const mid: V3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const reach = used.reduce((m, p) => Math.max(m, len(sub(p, mid))), 0) || 1;
  // Turn it so its broadest face looks along +z: that is the face it turns to the cursor.
  let broad: V3 = [0, 0, 1], most = 0;
  for (const s of parts) for (const [a, b, c] of s.faces) {
    const n = cross(sub(s.pts[b], s.pts[a]), sub(s.pts[c], s.pts[a])), area = len(n);
    if (area > most) { most = area; broad = unit(n); }
  }
  const axis = cross(broad, [0, 0, 1]), sin = len(axis), cos = broad[2];
  const k = sin > 1e-6 ? unit(axis) : [1, 0, 0] as V3, angle = Math.atan2(sin, cos);
  const turn = (p: V3): V3 => {
    const c = Math.cos(angle), s = Math.sin(angle), kxp = cross(k, p), kp = dot(k, p) * (1 - c);
    return [p[0] * c + kxp[0] * s + k[0] * kp, p[1] * c + kxp[1] * s + k[1] * kp, p[2] * c + kxp[2] * s + k[2] * kp];
  };
  const out: number[] = [];
  for (const s of parts) {
    const pts = s.pts.map((p): V3 => { const q = sub(p, mid); return turn([q[0] / reach, q[1] / reach, q[2] / reach]); });
    const normals = s.faces.map(([a, b, c]) => unit(cross(sub(pts[b], pts[a]), sub(pts[c], pts[a]))));
    const across = new Map<string, number[]>();
    const key = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
    s.faces.forEach((f, i) => { for (let e = 0; e < 3; e++) { const id = key(f[e], f[(e + 1) % 3]); across.set(id, [...(across.get(id) ?? []), i]); } });
    s.faces.forEach(([ia, ib, ic], i) => {
      const a = pts[ia], b = pts[ib], c = pts[ic], n = normals[i];
      const area = len(cross(sub(b, a), sub(c, a)));
      const height = (p: V3, q: V3) => area / (len(sub(p, q)) || 1);
      const bevel = (p: number, q: number): V3 => { const j = (across.get(key(p, q)) ?? []).find((f) => f !== i); return j === undefined ? n : unit(add(n, normals[j])); };
      const bevels = [bevel(ib, ic), bevel(ic, ia), bevel(ia, ib)];
      const edges: V3[] = [[height(b, c), 0, 0], [0, height(c, a), 0], [0, 0, height(a, b)]];
      [a, b, c].forEach((p, v) => out.push(...p, ...n, ...edges[v], 0, ...bevels[0], ...bevels[1], ...bevels[2]));
    });
  }
  return out;
}

export function buildShards(seed: number): ShardMeshes {
  const kinds: ShardMeshes['kinds'] = [];
  const all: number[] = [];
  const keep = (mesh: number[]) => { kinds.push({ first: all.length / VERTEX_FLOATS, count: mesh.length / VERTEX_FLOATS }); for (const v of mesh) all.push(v); };
  const r = seeded(seed * 7 + 3);
  let from = 0;
  for (const c of CLASSES) {
    for (let k = 0; k < c.kinds; k++) keep(facet(r, from + (c.upTo - from) * ((k + 0.5) / c.kinds)));
    from = c.upTo;
  }
  for (const mesh of firstShards(seed, VERTEX_FLOATS)) keep(mesh);
  return { data: new Float32Array(all), kinds };
}
