import * as THREE from 'three';

// The geometry of what broke away, in units. A piece of rock is a convex block cut by planes, as stone breaks along
// joints and beds: each cut a flat face, and each edge between two faces taken off by a narrow chamfer, so the edge
// catches the light as a real broken edge does. A broken face is not flat: it is cut into small triangles and lifted
// and sunk a little by a noise that dies away to nothing at its edges, so the outline is ragged and the edges stay
// crisp. Several blocks overlapping make a piece that is stepped and layered rather than one round lump.

export type V3 = [number, number, number];
export interface Plane { n: V3; d: number }

export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// A smooth noise in three dimensions, the same on every call.
export function noise3(seed: number): (x: number, y: number, z: number) => number {
  const h = (i: number, j: number, k: number) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7 + seed * 19.3) * 43758.5453; return s - Math.floor(s); };
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (x, y, z) => {
    const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = sm(x - i), v = sm(y - j), w = sm(z - k);
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    return l(l(l(h(i, j, k), h(i + 1, j, k), u), l(h(i, j + 1, k), h(i + 1, j + 1, k), u), v), l(l(h(i, j, k + 1), h(i + 1, j, k + 1), u), l(h(i, j + 1, k + 1), h(i + 1, j + 1, k + 1), u), v), w);
  };
}

interface Face { pts: V3[]; n: V3; tag: number }
// A convex solid as its faces. Each face keeps the tag of the cut that made it.
export interface Solid { faces: Face[] }

const EPS = 1e-6;

export function boxSolid(hx: number, hy: number, hz: number): Solid {
  const c = (x: number, y: number, z: number): V3 => [x * hx, y * hy, z * hz];
  const q = (n: V3, pts: V3[], tag: number): Face => ({ pts, n, tag });
  return {
    faces: [
      q([1, 0, 0], [c(1, -1, -1), c(1, 1, -1), c(1, 1, 1), c(1, -1, 1)], 0),
      q([-1, 0, 0], [c(-1, -1, 1), c(-1, 1, 1), c(-1, 1, -1), c(-1, -1, -1)], 1),
      q([0, 1, 0], [c(-1, 1, -1), c(-1, 1, 1), c(1, 1, 1), c(1, 1, -1)], 2),
      q([0, -1, 0], [c(-1, -1, 1), c(-1, -1, -1), c(1, -1, -1), c(1, -1, 1)], 3),
      q([0, 0, 1], [c(-1, -1, 1), c(1, -1, 1), c(1, 1, 1), c(-1, 1, 1)], 4),
      q([0, 0, -1], [c(1, -1, -1), c(-1, -1, -1), c(-1, 1, -1), c(1, 1, -1)], 5),
    ],
  };
}

// Cuts away everything on the far side of a plane (where n . p > d), and closes the cut with a new face.
export function cut(s: Solid, p: Plane, tag: number): Solid {
  const out: Face[] = [], cap: V3[] = [];
  for (const f of s.faces) {
    const kept: V3[] = [];
    for (let i = 0; i < f.pts.length; i++) {
      const a = f.pts[i], b = f.pts[(i + 1) % f.pts.length];
      const da = dot(p.n, a) - p.d, db = dot(p.n, b) - p.d;
      if (da <= EPS) kept.push(a);
      if ((da < -EPS && db > EPS) || (da > EPS && db < -EPS)) {
        const t = da / (da - db), x = add(a, mul(sub(b, a), t));
        kept.push(x);
        cap.push(x);
      } else if (Math.abs(da) <= EPS) cap.push(a);
    }
    if (kept.length >= 3) out.push({ pts: kept, n: f.n, tag: f.tag });
  }
  const ring = dedupe(cap);
  if (ring.length >= 3) {
    const mid = mul(ring.reduce((m, q) => add(m, q), [0, 0, 0] as V3), 1 / ring.length);
    const u = unit(sub(ring[0], mid)), v = cross(p.n, u);
    ring.sort((a, b) => Math.atan2(dot(sub(a, mid), v), dot(sub(a, mid), u)) - Math.atan2(dot(sub(b, mid), v), dot(sub(b, mid), u)));
    out.push({ pts: ring, n: p.n, tag });
  }
  return { faces: out.map((f) => ({ ...f, pts: dedupe(f.pts) })).filter((f) => f.pts.length >= 3) };
}

function dedupe(pts: V3[]): V3[] {
  const out: V3[] = [];
  for (const q of pts) if (!out.some((o) => Math.abs(o[0] - q[0]) + Math.abs(o[1] - q[1]) + Math.abs(o[2] - q[2]) < 1e-4)) out.push(q);
  return out;
}

// Takes every edge off by a chamfer this wide, measured into the solid. The chamfer faces are tagged CHAMFER.
export const CHAMFER = -1;
export function chamfer(s: Solid, w: number): Solid {
  const planes: Plane[] = [];
  const key = (q: V3) => q.map((v) => Math.round(v * 1e3)).join(',');
  for (let i = 0; i < s.faces.length; i++) for (let j = i + 1; j < s.faces.length; j++) {
    const a = s.faces[i], b = s.faces[j], shared = a.pts.filter((p) => b.pts.some((q) => key(p) === key(q)));
    if (shared.length < 2) continue;
    const n = unit(add(a.n, b.n));
    if (dot(a.n, b.n) > 0.94) continue;
    planes.push({ n, d: dot(n, shared[0]) - w });
  }
  let out = s;
  for (const p of planes) out = cut(out, p, CHAMFER);
  return out;
}

// A convex block: a box cut by planes, each a normal and how far out from the block's middle it lies.
export function block(hx: number, hy: number, hz: number, cuts: Plane[], bevel: number): Solid {
  let s = boxSolid(hx, hy, hz);
  cuts.forEach((p, i) => { s = cut(s, { n: unit(p.n), d: p.d }, 10 + i); });
  return bevel > 0 ? chamfer(s, bevel) : s;
}

export function moveSolid(s: Solid, m: THREE.Matrix4): Solid {
  const v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(m);
  return {
    faces: s.faces.map((f) => ({
      tag: f.tag,
      n: unit(v.set(...f.n).applyMatrix3(nm).toArray() as V3),
      pts: f.pts.map((p) => v.set(...p).applyMatrix4(m).toArray() as V3),
    })),
  };
}

// What each vertex carries besides its place and its way: what it is made of, and three numbers for that.
export type Cell = [kind: number, a: number, b: number, c: number];

// Triangles gathered for one mesh: position, normal and cell, unindexed.
export class Mesh {
  pos: number[] = [];
  nrm: number[] = [];
  cell: number[] = [];
  get tris() { return this.pos.length / 9; }

  tri(a: V3, b: V3, c: V3, na: V3, nb: V3, nc: V3, k: Cell): void {
    this.pos.push(...a, ...b, ...c);
    this.nrm.push(...na, ...nb, ...nc);
    for (let i = 0; i < 3; i++) this.cell.push(...k);
  }

  // A convex face, flat, as a fan.
  flat(pts: V3[], n: V3, k: Cell): void {
    for (let i = 1; i + 1 < pts.length; i++) {
      const a = pts[0], b = pts[i], c = pts[i + 1];
      if (dot(cross(sub(b, a), sub(c, a)), n) < 0) this.tri(a, c, b, n, n, n, k);
      else this.tri(a, b, c, n, n, n, k);
    }
  }

  // A convex face cut into triangles about `step` across, each point lifted along the face's normal by `lift(p)`
  // scaled by how far it lies from the face's edges, so the edges stay where they are.
  rough(pts: V3[], n: V3, k: Cell, step: number, lift: (p: V3) => number, reach: number): void {
    const mid = mul(pts.reduce((m, q) => add(m, q), [0, 0, 0] as V3), 1 / pts.length);
    const edgeFar = (p: V3) => {
      let d = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], inward = unit(cross(n, sub(b, a)));
        d = Math.min(d, Math.abs(dot(sub(p, a), inward)));
      }
      return Math.max(0, d);
    };
    const moved = (p: V3): V3 => {
      const w = Math.min(1, edgeFar(p) / reach);
      return add(p, mul(n, lift(p) * w * w * (3 - 2 * w)));
    };
    const grid = new Map<string, { p: V3; n: V3 }>();
    const key = (p: V3) => p.map((v) => Math.round(v * 200)).join(',');
    const tris: V3[][] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = mid, b = pts[i], c = pts[(i + 1) % pts.length];
      const m = Math.max(1, Math.ceil(Math.max(len(sub(b, a)), len(sub(c, a)), len(sub(c, b))) / step));
      const at = (u: number, v: number): V3 => add(a, add(mul(sub(b, a), u / m), mul(sub(c, a), v / m)));
      for (let u = 0; u < m; u++) for (let v = 0; v < m - u; v++) {
        tris.push([at(u, v), at(u + 1, v), at(u, v + 1)]);
        if (u + v < m - 1) tris.push([at(u + 1, v), at(u + 1, v + 1), at(u, v + 1)]);
      }
    }
    const placed = tris.map((t) => t.map((p) => moved(p)));
    placed.forEach((t) => {
      const fn = unit(cross(sub(t[1], t[0]), sub(t[2], t[0])));
      const f = dot(fn, n) < 0 ? mul(fn, -1) : fn;
      t.forEach((p) => {
        const e = grid.get(key(p));
        if (e) e.n = add(e.n, f);
        else grid.set(key(p), { p, n: f });
      });
    });
    placed.forEach((t) => {
      const [na, nb, nc] = t.map((p) => unit(grid.get(key(p))!.n));
      const fn = cross(sub(t[1], t[0]), sub(t[2], t[0]));
      if (dot(fn, n) < 0) this.tri(t[0], t[2], t[1], na, nc, nb, k);
      else this.tri(t[0], t[1], t[2], na, nb, nc, k);
    });
  }

  // Every face of a solid. `look` says what a face is made of from its tag and its way; `step` and `lift` roughen
  // the broad faces, and a face smaller than `small` across, or a chamfer, stays flat.
  solid(s: Solid, look: (tag: number, n: V3) => Cell, o: { step?: number; lift?: (p: V3, tag: number) => number; reach?: number; small?: number; keep?: (tag: number) => boolean } = {}): void {
    for (const f of s.faces) {
      const k = look(f.tag, f.n);
      let span = 0;
      for (const a of f.pts) for (const b of f.pts) span = Math.max(span, len(sub(a, b)));
      if (o.step && o.lift && f.tag !== CHAMFER && !o.keep?.(f.tag) && span > (o.small ?? o.step * 1.6)) { const lift = o.lift; this.rough(f.pts, f.n, k, o.step, (p) => lift(p, f.tag), o.reach ?? o.step); }
      else this.flat(f.pts, f.n, k);
    }
  }

  // A three geometry, placed by a matrix, all of one cell.
  geo(g: THREE.BufferGeometry, m: THREE.Matrix4, k: Cell): void {
    const src = g.index ? g.toNonIndexed() : g;
    if (!src.getAttribute('normal')) src.computeVertexNormals();
    const p = src.getAttribute('position'), n = src.getAttribute('normal');
    const v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(m);
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(m);
      this.pos.push(v.x, v.y, v.z);
      v.set(n.getX(i), n.getY(i), n.getZ(i)).applyMatrix3(nm).normalize();
      this.nrm.push(v.x, v.y, v.z);
      this.cell.push(...k);
    }
    if (src !== g) src.dispose();
  }

  append(o: Mesh): void {
    for (const v of o.pos) this.pos.push(v);
    for (const v of o.nrm) this.nrm.push(v);
    for (const v of o.cell) this.cell.push(v);
  }

  // How far its farthest point lies from its middle, and that middle.
  bounds(): { mid: V3; r: number } {
    const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < this.pos.length; i += 3) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], this.pos[i + a]); hi[a] = Math.max(hi[a], this.pos[i + a]); }
    const mid: V3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    let r = 0;
    for (let i = 0; i < this.pos.length; i += 3) r = Math.max(r, Math.hypot(this.pos[i] - mid[0], this.pos[i + 1] - mid[1], this.pos[i + 2] - mid[2]));
    return { mid, r };
  }

  // Moves it so its middle is at the origin.
  center(): { mid: V3; r: number } {
    const b = this.bounds();
    for (let i = 0; i < this.pos.length; i += 3) for (let a = 0; a < 3; a++) this.pos[i + a] -= b.mid[a];
    return b;
  }

  // With how open each vertex is (./ao.ts), or open everywhere.
  geometry(occ?: Float32Array): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('occ', new THREE.Float32BufferAttribute(occ ?? new Float32Array(this.pos.length / 3).fill(1), 1));
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('cell', new THREE.Float32BufferAttribute(this.cell, 4));
    return g;
  }
}
