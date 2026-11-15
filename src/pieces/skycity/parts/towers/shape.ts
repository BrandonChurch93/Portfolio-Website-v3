import * as THREE from 'three';

// The kit every building type is made with. A type is drawn many times, each a lot of a different size, so its
// points are given in two parts: a share of the lot (x and z from -0.5 to 0.5 across its foot, y from 0 at the
// street to 1 at the top), which the lot's size stretches, and a length in units added to it, which nothing
// stretches. A ledge is so many units thick and a mast so many units across on every tower, whatever its height.
// Every face also carries where it is across itself and how wide it is, so the facade's bays and floors are worked
// out in units in the shader and always end at a corner.

export const KIND = { glass: 0, stone: 1, dark: 2, trim: 3, copper: 4, band: 5, plant: 6, lobby: 7, louvre: 8 } as const;
// Added to a kind for a face that runs round a curve: its bays run on round it, and it has no corners to catch.
export const ROUND = 16;

// A point: its share of the lot, then units added.
export type P = [number, number, number, number, number, number];
export const p = (x: number, y: number, z: number, ax = 0, ay = 0, az = 0): P => [x, y, z, ax, ay, az];

// The lot a type is judged against while it is built, for the normals of faces made from both parts.
const TYPICAL = { w: 30, h: 160 };
const solid = (q: P): [number, number, number] => [q[0] * TYPICAL.w + q[3], q[1] * TYPICAL.h + q[4], q[2] * TYPICAL.w + q[5]];

export class Shape {
  private pos: number[] = [];
  private add: number[] = [];
  private nrm: number[] = [];
  private face: number[] = [];

  get tris(): number { return this.pos.length / 9; }

  // One triangle with one normal, or a normal for each corner.
  private tri(a: P, b: P, c: P, f: [number, number, number, number][], n?: [number, number, number][]): void {
    let nn = n;
    if (!nn) {
      const A = new THREE.Vector3(...solid(a)), B = new THREE.Vector3(...solid(b)), C = new THREE.Vector3(...solid(c));
      const m = B.sub(A).cross(C.sub(A)).normalize();
      nn = [[m.x, m.y, m.z], [m.x, m.y, m.z], [m.x, m.y, m.z]];
    }
    [a, b, c].forEach((q, i) => {
      this.pos.push(q[0], q[1], q[2]);
      this.add.push(q[3], q[4], q[5]);
      this.nrm.push(...nn![i]);
      this.face.push(...f[i]);
    });
  }

  // A quad a, b, c, d going round its outside face anticlockwise. u runs from a to b. width is how wide the face is
  // as a share of the lot, and across how much of it runs along the lot's z rather than its x.
  quad(a: P, b: P, c: P, d: P, kind: number, o: { u0?: number; u1?: number; width?: number; across?: number; n?: [number, number, number][] } = {}): void {
    const u0 = o.u0 ?? 0, u1 = o.u1 ?? 1, w = o.width ?? 0, x = o.across ?? 0;
    const fa: [number, number, number, number] = [u0, w, x, kind], fb: [number, number, number, number] = [u1, w, x, kind];
    const n = o.n;
    this.tri(a, b, c, [fa, fb, fb], n && [n[0], n[1], n[2]]);
    this.tri(a, c, d, [fa, fb, fa], n && [n[0], n[2], n[3]]);
  }

  // Walls between two rings of points, the lower and the upper, each going round anticlockwise seen from above.
  // A round wall carries one run of bays round its whole loop and is smooth shaded.
  walls(lo: P[], hi: P[], kind: number, round = false): void {
    const n = lo.length;
    const len = (a: P, b: P) => Math.hypot(b[0] - a[0], b[2] - a[2]);
    let per = 0;
    for (let i = 0; i < n; i++) per += len(lo[i], lo[(i + 1) % n]);
    let run = 0;
    const mid = (r: P[]) => r.map(solid).reduce((s, q) => [s[0] + q[0] / n, s[1] + q[2] / n], [0, 0]);
    const [cx, cz] = mid(lo), [hx, hz] = mid(hi);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a = lo[i], b = lo[j], seg = len(a, b);
      if (round) {
        const out = (q: P, up: boolean): [number, number, number] => { const s = solid(q), x = s[0] - (up ? hx : cx), z = s[2] - (up ? hz : cz), l = Math.hypot(x, z) || 1; return [x / l, 0, z / l]; };
        this.quad(a, b, hi[j], hi[i], kind + ROUND, { u0: run / per, u1: (run + seg) / per, width: per, across: 0.5, n: [out(a, false), out(b, false), out(hi[j], true), out(hi[i], true)] });
      } else {
        const dx = Math.abs(b[0] - a[0]), dz = Math.abs(b[2] - a[2]);
        this.quad(a, b, hi[j], hi[i], kind, { width: seg, across: dz / (dx + dz || 1) });
      }
      run += seg;
    }
  }

  // A flat lid over a ring, facing up, or down when under is set.
  cap(ring: P[], kind: number, under = false): void {
    const c = ring.reduce<P>((s, q) => s.map((v, i) => v + q[i] / ring.length) as P, [0, 0, 0, 0, 0, 0]);
    const f: [number, number, number, number] = [0, 0, 0, kind];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      if (under) this.tri(c, b, a, [f, f, f]);
      else this.tri(c, a, b, [f, f, f]);
    }
  }

  // Faces from a ring up to one point.
  point(ring: P[], tip: P, kind: number): void {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], w = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const dx = Math.abs(b[0] - a[0]), dz = Math.abs(b[2] - a[2]);
      this.tri(a, b, tip, [[0, w, dz / (dx + dz || 1), kind], [1, w, dz / (dx + dz || 1), kind], [0.5, w, dz / (dx + dz || 1), kind]]);
    }
  }

  // A prism: walls from y0 to y1 and a lid.
  prism(ring: (y: number, ay?: number) => P[], y0: number, y1: number, kind: number, o: { round?: boolean; lid?: number | false; ay0?: number; ay1?: number } = {}): void {
    const hi = ring(y1, o.ay1 ?? 0);
    this.walls(ring(y0, o.ay0 ?? 0), hi, kind, o.round);
    if (o.lid !== false) this.cap(hi, o.lid ?? KIND.dark);
  }

  // A ledge round a ring at height y: a band so many units tall standing out so many units, with its top.
  ledge(ring: (y: number, ay?: number) => P[], y: number, tall: number, out: number, kind: number, round = false): void {
    const grow = (r: P[]) => outset(r, out);
    const lo = grow(ring(y, -tall)), hi = grow(ring(y, 0));
    this.walls(lo, hi, kind, round);
    this.cap(hi, kind);
    this.cap(lo, KIND.dark, true);
  }

  // A box in units round a point given as a share of the lot.
  box(x: number, y: number, z: number, ax: number, ay: number, az: number, w: number, h: number, d: number, kind: number, lid = kind): void {
    const r = (yy: number, add: number) => [p(x, yy, z, ax - w / 2, add, az - d / 2), p(x, yy, z, ax + w / 2, add, az - d / 2), p(x, yy, z, ax + w / 2, add, az + d / 2), p(x, yy, z, ax - w / 2, add, az + d / 2)].reverse() as P[];
    const lo = r(y, ay), hi = r(y, ay + h);
    this.walls(lo, hi, kind);
    this.cap(hi, lid);
  }

  // An upright cylinder in units round a point given as a share of the lot.
  drum(x: number, y: number, z: number, ay: number, r: number, h: number, seg: number, kind: number, lid = kind): void {
    const ring = (add: number) => Array.from({ length: seg }, (_, i) => { const a = -(i / seg) * Math.PI * 2; return p(x, y, z, Math.cos(a) * r, add, Math.sin(a) * r); });
    const hi = ring(ay + h);
    this.walls(ring(ay), hi, kind, true);
    this.cap(hi, lid);
  }

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('add', new THREE.Float32BufferAttribute(this.add, 3));
    g.setAttribute('face', new THREE.Float32BufferAttribute(this.face, 4));
    // The lot's frame reaches past its share by the units added: the bounds a lot is culled by come from the
    // instances, which allow for that.
    g.computeBoundingSphere();
    return g;
  }
}

// Rings, anticlockwise seen from above (from +y): x to the right, z toward the visitor, so anticlockwise runs from
// +x toward -z.
export function rect(hx: number, hz: number, ox = 0, oz = 0): (y: number, ay?: number) => P[] {
  return (y, ay = 0) => [p(ox + hx, y, oz + hz, 0, ay), p(ox + hx, y, oz - hz, 0, ay), p(ox - hx, y, oz - hz, 0, ay), p(ox - hx, y, oz + hz, 0, ay)];
}
// A rectangle with its corners cut by c.
export function chamfer(hx: number, hz: number, c: number): (y: number, ay?: number) => P[] {
  return (y, ay = 0) => [
    p(hx, y, hz - c, 0, ay), p(hx, y, -hz + c, 0, ay), p(hx - c, y, -hz, 0, ay), p(-hx + c, y, -hz, 0, ay),
    p(-hx, y, -hz + c, 0, ay), p(-hx, y, hz - c, 0, ay), p(-hx + c, y, hz, 0, ay), p(hx - c, y, hz, 0, ay),
  ];
}
// A regular polygon, or a circle with many sides, turned by a0.
export function ngon(n: number, r: number, a0 = 0, rz = r): (y: number, ay?: number) => P[] {
  return (y, ay = 0) => Array.from({ length: n }, (_, i) => { const a = a0 - (i / n) * Math.PI * 2; return p(Math.cos(a) * r, y, Math.sin(a) * rz, 0, ay); });
}
// The same ring turned about the lot's middle.
export function turned(ring: (y: number, ay?: number) => P[], by: number): (y: number, ay?: number) => P[] {
  const c = Math.cos(by), s = Math.sin(by);
  return (y, ay = 0) => ring(y, ay).map((q) => p(q[0] * c - q[2] * s, q[1], q[0] * s + q[2] * c, q[3] * c - q[5] * s, q[4], q[3] * s + q[5] * c));
}

// A convex ring pushed out by so many units, along each corner's bisector.
export function outset(ring: P[], out: number): P[] {
  const n = ring.length;
  const edge = (a: P, b: P) => { const dx = b[0] * TYPICAL.w - a[0] * TYPICAL.w, dz = b[2] * TYPICAL.w - a[2] * TYPICAL.w, l = Math.hypot(dx, dz) || 1; return [dz / l, -dx / l]; };
  return ring.map((q, i) => {
    const [ax, az] = edge(ring[(i - 1 + n) % n], q), [bx, bz] = edge(q, ring[(i + 1) % n]);
    const k = 1 + ax * bx + az * bz;
    const ox = ((ax + bx) / k) * out, oz = ((az + bz) / k) * out;
    // The outward side: away from the ring's middle.
    const cx = ring.reduce((s, r) => s + r[0], 0) / n, cz = ring.reduce((s, r) => s + r[2], 0) / n;
    const sg = (q[0] - cx) * ox + (q[2] - cz) * oz >= 0 ? 1 : -1;
    return p(q[0], q[1], q[2], q[3] + sg * ox, q[4], q[5] + sg * oz);
  });
}
