import { seeded } from './rand';

// The shards as small solid meshes, made once from a seed. Copper leaf is a thin torn sheet, crumpled into facets.
// Glass is a thin plate with pointed ends, its broken edges cut at a slant so each catches the light as a band.
// A vertex is: position, the direction its face looks, how far it is from each hard edge of its face, and whether
// its face is a broad one (0) or an edge (1). Sizes are in shard radii: the farthest tip is about 1 from the center.

export const VERTEX_FLOATS = 10;
export const COPPER_KINDS = 8;
export const GLASS_KINDS = 8;
const FAR = 99;

export interface ShardMeshes {
  data: Float32Array;
  // First vertex and vertex count of each kind: copper first, then glass.
  kinds: { first: number; count: number }[];
}

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

class Builder {
  out: number[] = [];
  // A triangle, counter clockwise seen from outside. hard says which of its sides bc, ca, ab are real edges of the
  // shard. Given normals round the face over (glass is seldom flat); without them the face is flat.
  tri(a: V3, b: V3, c: V3, hard: [boolean, boolean, boolean], tag: number, normals?: [V3, V3, V3]): void {
    const n = cross(sub(b, a), sub(c, a)), area = len(n);
    if (area < 1e-9) return;
    const flat = unit(n);
    const height = (p: V3, q: V3) => area / (len(sub(p, q)) || 1);
    const edges: V3[] = [
      [hard[0] ? height(b, c) : FAR, hard[1] ? 0 : FAR, hard[2] ? 0 : FAR],
      [hard[0] ? 0 : FAR, hard[1] ? height(c, a) : FAR, hard[2] ? 0 : FAR],
      [hard[0] ? 0 : FAR, hard[1] ? 0 : FAR, hard[2] ? height(a, b) : FAR],
    ];
    [a, b, c].forEach((p, i) => this.out.push(...p, ...(normals ? normals[i] : flat), ...edges[i], tag));
  }
}

// Torn metal leaf: a few straight sides, each ragged, with a notch or two, then crumpled along two or three folds.
function leaf(b: Builder, r: () => number): void {
  const corners = 4 + Math.floor(r() * 3);
  const squash = 0.62 + 0.38 * r();
  const ring: [number, number][] = [];
  const turn = r() * Math.PI * 2;
  const cs: [number, number][] = [];
  for (let i = 0; i < corners; i++) {
    const a = turn + ((i + (r() - 0.5) * 0.5) / corners) * Math.PI * 2, rad = 0.66 + 0.34 * r();
    cs.push([Math.cos(a) * rad, Math.sin(a) * rad * squash]);
  }
  for (let i = 0; i < corners; i++) {
    const p = cs[i], q = cs[(i + 1) % corners];
    ring.push(p);
    const cuts = Math.floor(r() * 1.8);
    for (let k = 1; k <= cuts; k++) {
      const t = (k + (r() - 0.5) * 0.5) / (cuts + 1);
      // A tear pulls the side in. Now and then it is a deep notch.
      const pull = 1 - (r() < 0.3 ? 0.25 + 0.25 * r() : 0.04 * r());
      ring.push([(p[0] + (q[0] - p[0]) * t) * pull, (p[1] + (q[1] - p[1]) * t) * pull]);
    }
  }
  const folds = [0, 1, 2].map(() => { const a = r() * Math.PI; return { x: Math.cos(a), y: Math.sin(a), at: (r() - 0.5) * 0.7, deep: (0.2 + 0.26 * r()) * (r() < 0.5 ? -1 : 1) }; });
  const lift = (x: number, y: number) => folds.reduce((z, f) => z + f.deep * Math.abs(x * f.x + y * f.y - f.at), 0) - 0.12;
  const thick = 0.034;
  const n = ring.length;
  const top = (p: [number, number], k = 1): V3 => [p[0] * k, p[1] * k, lift(p[0] * k, p[1] * k) + thick / 2];
  const under = (v: V3): V3 => [v[0], v[1], v[2] - thick];
  const mid = ring.map((p) => top(p, 0.42 + 0.16 * r())), rim = ring.map((p) => top(p));
  const c = top([0, 0]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    b.tri(c, mid[i], mid[j], [false, false, false], 0);
    b.tri(mid[i], rim[i], rim[j], [true, false, false], 0);
    b.tri(mid[i], rim[j], mid[j], [false, false, false], 0);
    b.tri(under(c), under(mid[j]), under(mid[i]), [false, false, false], 0);
    b.tri(under(mid[i]), under(rim[j]), under(rim[i]), [true, false, false], 0);
    b.tri(under(mid[i]), under(mid[j]), under(rim[j]), [false, false, false], 0);
    b.tri(rim[i], under(rim[i]), under(rim[j]), [true, false, false], 1);
    b.tri(rim[i], under(rim[j]), rim[j], [false, true, false], 1);
  }
}

// Broken glass: a sliver, a wedge or a small plate, always with a point. Its faces are a little rounded, like the wall
// of a glass, and each broken edge is two slanted bands meeting along a line.
function splinter(b: Builder, r: () => number): void {
  const shape = r();
  let pts: [number, number][];
  if (shape < 0.4) {
    const w = 0.13 + 0.17 * r();
    pts = [[1, (r() - 0.5) * 0.1], [-0.55 - 0.4 * r(), w * (0.6 + 0.8 * r())], [-0.85 + 0.3 * r(), -w * (0.6 + 0.8 * r())]];
  } else if (shape < 0.8) {
    const w = 0.28 + 0.26 * r();
    pts = [[1, (r() - 0.5) * 0.16], [0.05 + 0.35 * r(), w], [-0.9, 0.25 * (r() - 0.3)], [-0.15 - 0.35 * r(), -w * (0.7 + 0.5 * r())]];
  } else {
    const w = 0.42 + 0.2 * r();
    pts = [[0.95, 0.1 * (r() - 0.5)], [0.35, w], [-0.5 - 0.3 * r(), w * (0.5 + 0.4 * r())], [-0.85, -0.2 * r()], [0.1 * r(), -w * (0.8 + 0.3 * r())]];
  }
  const n = pts.length;
  const cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n;
  const thick = 0.07 + 0.045 * r(), cut = 0.085 + 0.035 * r();
  const bend = (r() - 0.5) * 1.1, bx = Math.cos(r() * Math.PI), by = Math.sqrt(1 - bx * bx);
  const inset = (p: [number, number], k: number): [number, number] => {
    const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1;
    return [p[0] - (dx / l) * Math.min(k, l * 0.6), p[1] - (dy / l) * Math.min(k, l * 0.6)];
  };
  const face = (side: number) => {
    const ring = pts.map((p) => inset(p, cut * (side > 0 ? 1 : 0.7 + 0.5 * r())));
    const at = (p: [number, number]): V3 => [p[0], p[1], side * thick / 2];
    const lean = (p: [number, number]): V3 => unit([bx * (p[0] * bx + p[1] * by) * bend * side, by * (p[0] * bx + p[1] * by) * bend * side, side]);
    const c: [number, number] = [cx, cy];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [p, q] = side > 0 ? [ring[i], ring[j]] : [ring[j], ring[i]];
      b.tri(at(c), at(p), at(q), [true, false, false], 0, [lean(c), lean(p), lean(q)]);
    }
    return ring.map(at);
  };
  const up = face(1), down = face(-1);
  const girdle = pts.map((p): V3 => [p[0], p[1], (r() - 0.5) * thick * 0.5]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    b.tri(up[i], girdle[i], girdle[j], [true, false, true], 1);
    b.tri(up[i], girdle[j], up[j], [true, true, false], 1);
    b.tri(down[i], girdle[j], girdle[i], [true, true, false], 1);
    b.tri(down[i], down[j], girdle[j], [true, false, true], 1);
  }
}

export function buildShards(seed: number): ShardMeshes {
  const kinds: ShardMeshes['kinds'] = [];
  const all: number[] = [];
  const r = seeded(seed);
  for (let k = 0; k < COPPER_KINDS + GLASS_KINDS; k++) {
    const b = new Builder();
    if (k < COPPER_KINDS) leaf(b, r); else splinter(b, r);
    // Center it and size it so its farthest point is 1 from the middle.
    let far = 0, mx = 0, my = 0, mz = 0;
    const count = b.out.length / VERTEX_FLOATS;
    for (let i = 0; i < count; i++) { mx += b.out[i * VERTEX_FLOATS]; my += b.out[i * VERTEX_FLOATS + 1]; mz += b.out[i * VERTEX_FLOATS + 2]; }
    mx /= count; my /= count; mz /= count;
    for (let i = 0; i < count; i++) far = Math.max(far, Math.hypot(b.out[i * VERTEX_FLOATS] - mx, b.out[i * VERTEX_FLOATS + 1] - my, b.out[i * VERTEX_FLOATS + 2] - mz));
    for (let i = 0; i < count; i++) {
      const o = i * VERTEX_FLOATS;
      b.out[o] = (b.out[o] - mx) / far; b.out[o + 1] = (b.out[o + 1] - my) / far; b.out[o + 2] = (b.out[o + 2] - mz) / far;
      for (let e = 6; e < 9; e++) if (b.out[o + e] < FAR) b.out[o + e] /= far;
    }
    kinds.push({ first: all.length / VERTEX_FLOATS, count });
    all.push(...b.out);
  }
  return { data: new Float32Array(all), kinds };
}
