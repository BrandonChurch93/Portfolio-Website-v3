import * as THREE from 'three';
import { seat } from '../../layout';

const D2R = Math.PI / 180;

// The kit every building is made with. Every tower is built once, in units, in its own frame (x across its lot, y up
// from the street, z out toward the rim), and laid straight into one shared set of buffers, turned and moved onto its
// lot. So every tower is its own building, its normals are exact, and the whole city is one draw.
//
// Every vertex carries what it is made of (its kind), which tower it belongs to, where it is across its face as a
// share, how many bays that face has, and the height of the foot of the wall it is on, for the dark where masses meet.

export const K = {
  // A curtain of glass with rooms behind it, in the tower's own skin.
  glass: 0,
  // Pale warm stone with tall narrow windows.
  stone: 1,
  // Pale warm stone, solid: piers, plinths, columns.
  plain: 2,
  // Near black structure, satin.
  dark: 3,
  gold: 4,
  bronze: 5,
  copper: 6,
  // Polished metal cladding, fluted, with narrow windows: the tower's own metal, bronze or copper.
  clad: 7,
  // A line or a band of light.
  light: 8,
  // Lit glass at the street.
  lobby: 9,
  louvre: 10,
  roof: 11,
  // The tower's own accent metal: gold, bronze or copper.
  accent: 12,
  // Glass of a pod, a saucer, a bridge: bands of lit windows.
  pod: 13,
  // Glass that faces the sky, with no rooms seen behind it.
  sky: 14,
  // A cartouche: a panel of dark bronze with abstract marks raised in gold, in a column, and a gold border.
  glyph: 15,
  // The back of a channel cut into stone: tall openings, three floors high, filling its width, between spandrels of
  // stone. Most are dark, a few lit warm from within.
  slot: 16,
} as const;

export type XZ = [number, number];
export type Ring = XZ[];
export type V3 = [number, number, number];

// The width of a bay, in units, for each facade that has windows. Solid stone counts its length in units, for its
// blocks.
export const BAY = { glass: 2.2, stone: 8.0, clad: 3.0, pod: 2.0, slot: 6.0 } as const;
const bays = (k: number, len: number) => (k === K.glass ? Math.max(1, Math.round(len / BAY.glass)) : k === K.stone ? Math.max(1, Math.round(len / BAY.stone)) : k === K.clad ? Math.max(1, Math.round(len / BAY.clad)) : k === K.pod ? Math.max(1, Math.round(len / BAY.pod)) : k === K.slot ? 1 : k === K.plain || k === K.glyph ? Math.max(1, Math.round(len)) : 0);

// Segments shorter than this, on a ring that is not round, are the bevels of its corners.
const BEVEL_MAX = 1.7;

class Grow {
  a: Float32Array;
  n = 0;
  constructor(size: number) { this.a = new Float32Array(size); }
  push(...v: number[]): void {
    if (this.n + v.length > this.a.length) { const b = new Float32Array(this.a.length * 2); b.set(this.a); this.a = b; }
    for (const x of v) this.a[this.n++] = x;
  }
  get out(): Float32Array { return this.a.slice(0, this.n); }
}

// The city's buffers, and the frame of the tower being built into them. A tower is built upright in its own frame and
// seated whole on the dome (seat in ../../layout.ts), so it stands straight out from the ground under it and never
// spreads as it rises. Each vertex also keeps where it is on the map and how high over the ground, which is what
// the shader works its floors, its street light and its rooms out from.
export class City {
  private pos = new Grow(1 << 20);
  private nrm = new Grow(1 << 20);
  private map = new Grow(1 << 20);
  private face = new Grow(1 << 20);
  private foot = new Grow(1 << 18);
  private idx: number[] = [];
  private verts = 0;
  private ox = 0; private oz = 0; private c = 1; private s = 0; private id = 0;
  private m = new THREE.Matrix4().elements;
  // Where the tower being built began in the buffers, so it can be taken out again.
  private from = { pos: 0, nrm: 0, map: 0, face: 0, foot: 0, idx: 0, verts: 0 };
  get tris(): number { return this.idx.length / 3; }

  at(x: number, z: number, turn: number, id: number): void {
    this.ox = x; this.oz = z; this.c = Math.cos(turn); this.s = Math.sin(turn); this.id = id;
    this.m = seat(x, z, 0, turn / D2R).elements;
    this.from = { pos: this.pos.n, nrm: this.nrm.n, map: this.map.n, face: this.face.n, foot: this.foot.n, idx: this.idx.length, verts: this.verts };
  }

  // Takes the tower being built out again.
  drop(): void {
    const f = this.from;
    this.pos.n = f.pos; this.nrm.n = f.nrm; this.map.n = f.map; this.face.n = f.face; this.foot.n = f.foot; this.idx.length = f.idx; this.verts = f.verts;
  }

  // Every point of the tower being built, as points of the frame.
  *built(): Generator<V3> { for (let i = this.from.pos; i < this.pos.n; i += 3) yield [this.pos.a[i], this.pos.a[i + 1], this.pos.a[i + 2]]; }

  // A point of the tower's frame, as a point of the world's frame.
  place(q: V3): V3 {
    const e = this.m;
    return [e[0] * q[0] + e[4] * q[1] + e[8] * q[2] + e[12], e[1] * q[0] + e[5] * q[1] + e[9] * q[2] + e[13], e[2] * q[0] + e[6] * q[1] + e[10] * q[2] + e[14]];
  }
  // A point of the tower's frame on the map, with its height over the ground.
  onMap(q: V3): V3 { return [this.ox + q[0] * this.c + q[2] * this.s, q[1], this.oz - q[0] * this.s + q[2] * this.c]; }

  vert(q: V3, n: V3, frac: number, bays: number, kind: number, foot: number): number {
    const w = this.place(q), p = this.onMap(q), e = this.m;
    let nx = e[0] * n[0] + e[4] * n[1] + e[8] * n[2], ny = e[1] * n[0] + e[5] * n[1] + e[9] * n[2], nz = e[2] * n[0] + e[6] * n[1] + e[10] * n[2];
    const l = Math.hypot(nx, ny, nz);
    if (l > 1e-6) { nx /= l; ny /= l; nz /= l; } else { nx = 0; ny = 1; nz = 0; }
    this.pos.push(w[0], w[1], w[2]);
    this.nrm.push(nx, ny, nz);
    this.map.push(p[0], p[1], p[2]);
    this.face.push(frac, bays, kind, this.id);
    this.foot.push(foot);
    return this.verts++;
  }

  tri(a: number, b: number, c: number): void { this.idx.push(a, b, c); }

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos.out, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nrm.out, 3));
    g.setAttribute('plan', new THREE.BufferAttribute(this.map.out, 3));
    g.setAttribute('face', new THREE.BufferAttribute(this.face.out, 4));
    g.setAttribute('foot', new THREE.BufferAttribute(this.foot.out, 1));
    g.setIndex(this.verts > 65535 ? new THREE.BufferAttribute(new Uint32Array(this.idx), 1) : new THREE.BufferAttribute(new Uint16Array(this.idx), 1));
    g.computeBoundingSphere();
    return g;
  }
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len3 = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => { const l = len3(a); return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]; };

export interface Level { y: number; ring: Ring }
export interface LoftOpts {
  // Smooth round the ring, as on a drum, and up the levels, as on a curved profile.
  round?: boolean;
  smoothUp?: boolean;
  // The kind of each segment, if they differ.
  kinds?: number[];
  // The kind of a segment short enough to be a bevel.
  edge?: number;
  // The height the wall stands on, if not its own lowest level.
  foot?: number;
  // How many bays a face of so many units has, where the facade's own bay would not line up with what stands in
  // front of it.
  bays?: (len: number) => number;
}

// Walls between rings at levels, every ring with as many points, each going round anticlockwise seen from above.
export function loft(b: City, levels: Level[], kind: number, o: LoftOpts = {}): void {
  const n = levels[0].ring.length, L = levels.length;
  const P = (i: number, j: number): V3 => { const q = levels[i].ring[((j % n) + n) % n]; return [q[0], levels[i].y, q[1]]; };
  const foot = o.foot ?? levels[0].y;
  // Where a segment's kind and bays come from: its length at the lowest level.
  const segLen = (j: number) => { let m = 0; for (let i = 0; i < L; i++) m += len3(sub(P(i, j + 1), P(i, j))); return m / L; };
  if (o.round) {
    let per = 0;
    for (let j = 0; j < n; j++) per += segLen(j);
    const nb = o.bays && bays(kind, per) ? o.bays(per) : bays(kind, per);
    const normal = (i: number, j: number): V3 => {
      const h = sub(P(i, j + 1), P(i, j - 1));
      let up = sub(P(Math.min(L - 1, i + 1), j), P(Math.max(0, i - 1), j));
      if (len3(up) < 1e-9) up = [0, 1, 0];
      let nn = cross(h, up);
      if (len3(nn) < 1e-9) { const c = levels[i].ring.reduce((s, q) => [s[0] + q[0] / n, s[1] + q[1] / n], [0, 0]); const q = levels[i].ring[((j % n) + n) % n]; nn = [q[0] - c[0], 0, q[1] - c[1]]; }
      if (len3(nn) < 1e-9) nn = [0, 1, 0];
      return norm(nn);
    };
    // Shared rows of points, one more than the ring so the bays close.
    const rows: number[][] = [];
    for (let i = 0; i < L; i++) {
      const row: number[] = [];
      let run = 0;
      for (let j = 0; j <= n; j++) {
        row.push(b.vert(P(i, j), normal(i, j), run / per, nb, kind, foot));
        run += segLen(j);
      }
      rows.push(row);
    }
    for (let i = 0; i < L - 1; i++) for (let j = 0; j < n; j++) {
      const a = rows[i][j], c = rows[i][j + 1], d = rows[i + 1][j + 1], e = rows[i + 1][j];
      b.tri(a, c, d); b.tri(a, d, e);
    }
    return;
  }
  for (let j = 0; j < n; j++) {
    const sl = segLen(j);
    let k = o.kinds?.[j] ?? kind;
    if (o.edge !== undefined && sl < BEVEL_MAX) k = o.edge;
    const nb = o.bays && bays(k, sl) ? o.bays(sl) : bays(k, sl);
    for (let i = 0; i < L - 1; i++) {
      const a = P(i, j), c = P(i, j + 1), d = P(i + 1, j + 1), e = P(i + 1, j);
      let nn = cross(sub(c, a), sub(e, a));
      if (len3(nn) < 1e-9) nn = cross(sub(d, e), sub(e, a));
      if (o.smoothUp) {
        const up0 = sub(P(Math.min(L - 1, i + 1), j), P(Math.max(0, i - 1), j)), up1 = sub(P(Math.min(L - 1, i + 2), j), P(i, j));
        const h = sub(c, a);
        const n0 = norm(cross(h, up0)), n1 = norm(cross(h, up1));
        const A = b.vert(a, n0, 0, nb, k, foot), C = b.vert(c, n0, 1, nb, k, foot), D = b.vert(d, n1, 1, nb, k, foot), E = b.vert(e, n1, 0, nb, k, foot);
        b.tri(A, C, D); b.tri(A, D, E);
      } else {
        const A = b.vert(a, nn, 0, nb, k, foot), C = b.vert(c, nn, 1, nb, k, foot), D = b.vert(d, nn, 1, nb, k, foot), E = b.vert(e, nn, 0, nb, k, foot);
        b.tri(A, C, D); b.tri(A, D, E);
      }
    }
  }
}

// A flat lid over a ring at y, facing up, or down when under is set. holes are rings cut out of it.
export function cap(b: City, ring: Ring, y: number, kind: number, under = false, holes: Ring[] = []): void {
  const v2 = (r: Ring) => r.map(([x, z]) => new THREE.Vector2(x, -z));
  const tris = THREE.ShapeUtils.triangulateShape(v2(ring), holes.map(v2));
  const all = [...ring, ...holes.flat()];
  const ids = all.map(([x, z]) => b.vert([x, y, z], [0, under ? -1 : 1, 0], 0, 0, kind, y));
  for (const [a, c, d] of tris) {
    const A = all[a], C = all[c], D = all[d];
    const up = (C[1] - A[1]) * (D[0] - A[0]) - (C[0] - A[0]) * (D[1] - A[1]) > 0;
    if (up !== under) b.tri(ids[a], ids[c], ids[d]); else b.tri(ids[a], ids[d], ids[c]);
  }
}

// Faces from a ring at y up to one point.
export function point(b: City, ring: Ring, y: number, tip: V3, kind: number, edge?: number): void {
  const n = ring.length;
  for (let j = 0; j < n; j++) {
    const a: V3 = [ring[j][0], y, ring[j][1]], c: V3 = [ring[(j + 1) % n][0], y, ring[(j + 1) % n][1]];
    const nn = cross(sub(c, a), sub(tip, a));
    const k = edge !== undefined && len3(sub(c, a)) < BEVEL_MAX ? edge : kind;
    b.tri(b.vert(a, nn, 0, 0, k, y), b.vert(c, nn, 1, 0, k, y), b.vert(tip, nn, 0.5, 0, k, y));
  }
}

// A prism: walls from y0 to y1 and a lid.
export function prism(b: City, ring: Ring, y0: number, y1: number, kind: number, o: LoftOpts & { lid?: number | false; top?: Ring } = {}): void {
  loft(b, [{ y: y0, ring }, { y: y1, ring: o.top ?? ring }], kind, o);
  if (o.lid !== false) cap(b, o.top ?? ring, y1, o.lid ?? K.roof);
}

// A ledge round a ring: a band so tall, standing out so far, with its top and its underside.
export function ledge(b: City, ring: Ring, y: number, tall: number, out: number, kind: number, o: { round?: boolean; top?: number } = {}): void {
  const r = offset(ring, out);
  loft(b, [{ y: y - tall, ring: r }, { y, ring: r }], kind, { round: o.round, foot: y - tall });
  cap(b, r, y, o.top ?? kind);
  cap(b, r, y - tall, K.dark, true);
}

// The gorge of a temple's cornice: a torus roll, then a hollow that flares out and up to a flat top.
export function gorge(b: City, ring: Ring, y: number, tall: number, out: number, kind: number, roll: number = K.accent): void {
  const r0 = 0.45, lv = (t: number, o: number): Level => ({ y: y + t * tall, ring: offset(ring, o) });
  loft(b, [lv(-0.02, 0), lv(0.04, r0 * 0.7), lv(0.12, r0), lv(0.2, r0 * 0.7), lv(0.26, 0.05)], roll, { smoothUp: true, foot: y });
  const prof: [number, number][] = [[0.26, 0.05], [0.42, 0.12 * out], [0.58, 0.32 * out], [0.74, 0.62 * out], [0.88, out], [1, out]];
  loft(b, prof.map(([t, o]) => lv(t, o)), kind, { smoothUp: true, foot: y });
  cap(b, offset(ring, out), y + tall, K.roof);
}

// A solid of revolution round (cx, cz): its profile is pairs of radius and height from the bottom up. A share of the
// profile's segments may differ in kind, given as one kind for each segment.
export function lathe(b: City, prof: [number, number][], seg: number, kind: number | number[], o: { cx?: number; cz?: number; rz?: number; a0?: number; smooth?: boolean } = {}): void {
  const cx = o.cx ?? 0, cz = o.cz ?? 0, k = o.rz ?? 1;
  const ring = (r: number): Ring => Array.from({ length: seg }, (_, i) => { const a = (o.a0 ?? 0) - (i / seg) * Math.PI * 2; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r * k]; });
  if (Array.isArray(kind)) {
    for (let i = 0; i < prof.length - 1; i++) loft(b, [{ y: prof[i][1], ring: ring(prof[i][0]) }, { y: prof[i + 1][1], ring: ring(prof[i + 1][0]) }], kind[i], { round: true, foot: prof[0][1] });
    return;
  }
  loft(b, prof.map(([r, y]) => ({ y, ring: ring(r) })), kind, { round: true, smoothUp: o.smooth ?? true, foot: prof[0][1] });
}

// A box round a point, so wide, tall and deep.
export function box(b: City, x: number, y: number, z: number, w: number, h: number, d: number, kind: number, lid: number = kind, bevel = 0): void {
  prism(b, shift(rect(w, d, bevel), x, z), y, y + h, kind, { lid, edge: bevel > 0 ? kind : undefined });
}

// An upright cylinder.
export function cyl(b: City, x: number, y: number, z: number, r: number, h: number, seg: number, kind: number, lid: number = kind): void {
  prism(b, circle(r, seg, x, z), y, y + h, kind, { round: true, lid });
}

// A bar from one point to another, so wide and so tall, its sides square to the ground where it can be.
export function beam(b: City, p: V3, q: V3, w: number, h: number, kind: number): void {
  const ax = norm(sub(q, p));
  let side = cross(ax, [0, 1, 0]);
  if (len3(side) < 1e-6) side = [1, 0, 0];
  side = norm(side);
  const up = norm(cross(side, ax));
  const c = (o: V3, s: number, u: number): V3 => [o[0] + side[0] * s * w / 2 + up[0] * u * h / 2, o[1] + side[1] * s * w / 2 + up[1] * u * h / 2, o[2] + side[2] * s * w / 2 + up[2] * u * h / 2];
  const corners: [number, number][] = [[1, -1], [1, 1], [-1, 1], [-1, -1]];
  for (let i = 0; i < 4; i++) {
    const [s0, u0] = corners[i], [s1, u1] = corners[(i + 1) % 4];
    const a = c(p, s0, u0), d = c(p, s1, u1), e = c(q, s1, u1), f = c(q, s0, u0);
    const nn: V3 = [side[0] * (s0 + s1) / 2 + up[0] * (u0 + u1) / 2, side[1] * (s0 + s1) / 2 + up[1] * (u0 + u1) / 2, side[2] * (s0 + s1) / 2 + up[2] * (u0 + u1) / 2];
    const A = b.vert(a, nn, 0, 0, kind, 0), D = b.vert(d, nn, 0, 0, kind, 0), E = b.vert(e, nn, 0, 0, kind, 0), F = b.vert(f, nn, 0, 0, kind, 0);
    const tn = cross(sub(d, a), sub(f, a));
    if (tn[0] * nn[0] + tn[1] * nn[1] + tn[2] * nn[2] >= 0) { b.tri(A, D, E); b.tri(A, E, F); } else { b.tri(A, E, D); b.tri(A, F, E); }
  }
  for (const [o, sg] of [[p, -1], [q, 1]] as [V3, number][]) {
    const nn: V3 = [ax[0] * sg, ax[1] * sg, ax[2] * sg];
    const ids = corners.map(([s, u]) => b.vert(c(o, s, u), nn, 0, 0, kind, 0));
    const tn = cross(sub(c(o, ...corners[1]), c(o, ...corners[0])), sub(c(o, ...corners[2]), c(o, ...corners[0])));
    if (tn[0] * nn[0] + tn[1] * nn[1] + tn[2] * nn[2] >= 0) { b.tri(ids[0], ids[1], ids[2]); b.tri(ids[0], ids[2], ids[3]); } else { b.tri(ids[0], ids[2], ids[1]); b.tri(ids[0], ids[3], ids[2]); }
  }
}

// A disc standing upright, facing out along z: a face, a rim and a back.
export function disc(b: City, x: number, y: number, z: number, r: number, thick: number, seg: number, face: number, rim: number): void {
  const pts = Array.from({ length: seg }, (_, i) => { const a = (i / seg) * Math.PI * 2; return [x + Math.cos(a) * r, y + Math.sin(a) * r] as [number, number]; });
  for (const [zz, sg] of [[z + thick / 2, 1], [z - thick / 2, -1]] as [number, number][]) {
    const mid = b.vert([x, y, zz], [0, 0, sg], 0, 0, face, 0);
    const ids = pts.map(([px, py]) => b.vert([px, py, zz], [0, 0, sg], 0, 0, face, 0));
    for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; if (sg > 0) b.tri(mid, ids[i], ids[j]); else b.tri(mid, ids[j], ids[i]); }
  }
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg, [ax, ay] = pts[i], [cx, cy] = pts[j];
    const na: V3 = [ax - x, ay - y, 0], nc: V3 = [cx - x, cy - y, 0];
    const A = b.vert([ax, ay, z + thick / 2], na, 0, 0, rim, 0), B = b.vert([ax, ay, z - thick / 2], na, 0, 0, rim, 0), C = b.vert([cx, cy, z - thick / 2], nc, 0, 0, rim, 0), D = b.vert([cx, cy, z + thick / 2], nc, 0, 0, rim, 0);
    b.tri(A, C, D); b.tri(A, B, C);
  }
}

// Rings, anticlockwise seen from above: x to the right and z toward the visitor, so anticlockwise runs from +x
// toward -z.
export function rect(w: number, d: number, bevel = 0): Ring {
  const x = w / 2, z = d / 2, c = bevel;
  if (c <= 0) return [[x, z], [x, -z], [-x, -z], [-x, z]];
  return [[x, z - c], [x, -z + c], [x - c, -z], [-x + c, -z], [-x, -z + c], [-x, z - c], [-x + c, z], [x - c, z]];
}
export function circle(r: number, seg: number, cx = 0, cz = 0, rz = r, a0 = 0): Ring {
  return Array.from({ length: seg }, (_, i) => { const a = a0 - (i / seg) * Math.PI * 2; return [cx + Math.cos(a) * r, cz + Math.sin(a) * rz] as XZ; });
}
// A rectangle split along its sides into the given shares, for a face of several kinds: front and back faces (along
// x) are split at the shares in xs, the sides at zs.
export function split(w: number, d: number, xs: number[], zs: number[], bevel = 0): Ring {
  const x = w / 2, z = d / 2, c = bevel;
  const out: Ring = [];
  const along = (a: XZ, b: XZ, at: number[]) => at.forEach((t) => out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]));
  // Right side, from front to back.
  out.push([x, z - c]); along([x, z], [x, -z], zs); out.push([x, -z + c]);
  if (c > 0) out.push([x - c, -z]);
  along([x, -z], [-x, -z], xs);
  if (c > 0) out.push([-x + c, -z]);
  out.push([-x, -z + c]); along([-x, -z], [-x, z], zs); out.push([-x, z - c]);
  if (c > 0) out.push([-x + c, z]);
  along([-x, z], [x, z], xs);
  if (c > 0) out.push([x - c, z]);
  return out;
}
export const shift = (r: Ring, dx: number, dz: number): Ring => r.map(([x, z]) => [x + dx, z + dz]);
export const scale = (r: Ring, sx: number, sz = sx): Ring => r.map(([x, z]) => [x * sx, z * sz]);
export const turn = (r: Ring, a: number): Ring => { const c = Math.cos(a), s = Math.sin(a); return r.map(([x, z]) => [x * c - z * s, x * s + z * c]); };

// A ring pushed out by so many units along each corner's bisector, or in when out is negative.
export function offset(ring: Ring, out: number): Ring {
  const n = ring.length;
  const edge = (a: XZ, b: XZ): XZ => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; };
  return ring.map((q, i) => {
    const [ax, az] = edge(ring[(i - 1 + n) % n], q), [bx, bz] = edge(q, ring[(i + 1) % n]);
    const k = Math.max(0.2, 1 + ax * bx + az * bz);
    return [q[0] + ((ax + bx) / k) * out, q[1] + ((az + bz) / k) * out];
  });
}
