import * as THREE from 'three';
import { at, rbox as roundBox, xf } from '../../../../world/build';

// Shapes and solids for the PC, brought over from his PC Builder (src/world/kit/geometry.ts and blades.ts there), in
// millimetres, so its parts can be built from their own code.

export { at, xf };

// A rounded box: small ones are rounded with one segment, which is all a few pixels can show.
// A box under a centimetre, or thinner than a millimetre and a half, is drawn square: at its size the rounding is lost.
export const rbox = (w: number, h: number, d: number, r = 0.6, seg = 1) => (Math.max(w, h, d) < 10 || Math.min(w, h, d) < 1.5 ? new THREE.BoxGeometry(w, h, d) : roundBox(w, h, d, r, Math.min(seg, Math.min(w, h, d) > 12 ? 2 : 1)));
export const PI = Math.PI;
export const Q = PI / 2;

// Outlines are drawn as polylines with as many points as their curve needs at the size it is seen, so a small radius
// does not cost as much as a large circle.
const arcN = (r: number, turn: number) => Math.max(2, Math.min(48, Math.round(Math.sqrt(Math.max(r, 0.1)) * 3 * (turn / (PI / 2)))));

function rrectPts(x: number, y: number, w: number, h: number, r: number): [number, number][] {
  const rr = Math.max(0.01, Math.min(r, w / 2 - 0.01, h / 2 - 0.01));
  const out: [number, number][] = [];
  const corner = (cx: number, cy: number, a0: number) => { const n = arcN(rr, PI / 2); for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (PI / 2); out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } };
  corner(x + w - rr, y + rr, -PI / 2);
  corner(x + w - rr, y + h - rr, 0);
  corner(x + rr, y + h - rr, PI / 2);
  corner(x + rr, y + rr, PI);
  return out;
}

function trace<T extends THREE.Path>(p: T, pts: [number, number][]): T {
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

export function rrect<T extends THREE.Path>(p: T, x: number, y: number, w: number, h: number, r: number): T {
  return trace(p, rrectPts(x, y, w, h, r));
}

export const rrectShape = (w: number, h: number, r: number, cx = 0, cy = 0) => rrect(new THREE.Shape(), cx - w / 2, cy - h / 2, w, h, r);

export function rrectHole(w: number, h: number, r: number, cx = 0, cy = 0): THREE.Path {
  return trace(new THREE.Path(), rrectPts(cx - w / 2, cy - h / 2, w, h, r).reverse());
}

const circlePts = (cx: number, cy: number, r: number) => {
  const n = Math.max(12, Math.min(72, Math.round(r * 0.8)));
  return Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * PI * 2) * r, cy + Math.sin((i / n) * PI * 2) * r] as [number, number]);
};

export function circleHole(cx: number, cy: number, r: number): THREE.Path {
  return trace(new THREE.Path(), circlePts(cx, cy, r).reverse());
}

export function circleShape(r: number, cx = 0, cy = 0): THREE.Shape {
  return trace(new THREE.Shape(), circlePts(cx, cy, r));
}

export function polyShape(pts: [number, number][]): THREE.Shape {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

export function polyHole(pts: [number, number][]): THREE.Path {
  const p = new THREE.Path();
  [...pts].reverse().forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

// A polygon with each corner rounded by r.
export function roundedPoly(pts: [number, number][], r: number): THREE.Shape {
  const out: [number, number][] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const d1 = [p0[0] - p1[0], p0[1] - p1[1]], d2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(d1[0], d1[1]), l2 = Math.hypot(d2[0], d2[1]);
    const rr = Math.min(r, l1 / 2 - 0.01, l2 / 2 - 0.01);
    const a: [number, number] = [p1[0] + (d1[0] / l1) * rr, p1[1] + (d1[1] / l1) * rr];
    const b: [number, number] = [p1[0] + (d2[0] / l2) * rr, p1[1] + (d2[1] / l2) * rr];
    const k = arcN(rr, PI / 2);
    for (let j = 0; j <= k; j++) { const t = j / k, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * p1[0] + t * t * b[0], u * u * a[1] + 2 * u * t * p1[1] + t * t * b[1]]); }
  }
  return trace(new THREE.Shape(), out);
}

export type Plane = 'xy' | 'xz' | 'zy';

// A shape extruded so the solid spans 0 to depth along the plane's normal, bevel included.
export function extrude(shape: THREE.Shape | THREE.Shape[], depth: number, bevel = 0.4, plane: Plane = 'xy', curveSegments = 12, bevelSegments = 2): THREE.BufferGeometry {
  const b = Math.min(bevel, depth / 2 - 0.01);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, depth - 2 * Math.max(0, b)), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: Math.min(bevelSegments, 1), curveSegments,
  });
  g.translate(0, 0, Math.max(0, b));
  if (plane === 'xz') g.rotateX(-PI / 2);
  else if (plane === 'zy') g.rotateY(PI / 2);
  return g;
}

export function cyl(r: number, h: number, axis: 'x' | 'y' | 'z' = 'y', seg = 24, rTop = r, open = false): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, r, h, seg, 1, open);
  if (axis === 'z') g.rotateX(PI / 2);
  if (axis === 'x') g.rotateZ(-PI / 2);
  return g;
}

// A lathe about the z axis from [radius, z] points.
export function lathe(points: [number, number][], seg = 40): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(points.map(([r, z]) => new THREE.Vector2(r, z)), seg);
  g.rotateX(PI / 2);
  return g;
}

export function puck(r: number, h: number, edge = 0.5, seg = 40): THREE.BufferGeometry {
  const e = Math.min(edge, r / 2, h / 2);
  const pts: [number, number][] = [[0, 0], [r - e, 0]];
  for (let i = 1; i <= 3; i++) { const a = -PI / 2 + (i / 3) * (PI / 2); pts.push([r - e + Math.cos(a) * e, e + Math.sin(a) * e]); }
  pts.push([r, h - e]);
  for (let i = 1; i <= 3; i++) { const a = (i / 3) * (PI / 2); pts.push([r - e + Math.cos(a) * e, h - e + Math.sin(a) * e]); }
  pts.push([0, h]);
  return lathe(pts, seg);
}

export const torus = (R: number, r: number, radial = 8, tubular = 48) => new THREE.TorusGeometry(R, r, radial, tubular);

export function tube(points: THREE.Vector3[] | THREE.Curve<THREE.Vector3>, radius: number, segments = 32, radial = 8): THREE.BufferGeometry {
  const curve = Array.isArray(points) ? new THREE.CatmullRomCurve3(points, false, 'centripetal') : points;
  return new THREE.TubeGeometry(curve, segments, radius, radial, false);
}

// A shape drawn in (z, y) seen from +x, extruded toward -x.
export const ZY = new THREE.Matrix4().set(0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);

// A swept, twisted, cambered fan blade with real thickness, its edges closed by a half round. Axis z.
export interface BladeSpec { r0: number; r1: number; c0: number; c1: number; pitch0: number; pitch1: number; sweep: number; thick: number; camber?: number; nu?: number; nv?: number; z?: number; tip?: number }

export function bladeGeometry(o: BladeSpec): THREE.BufferGeometry {
  const nu = o.nu ?? 12, nv = o.nv ?? 8, camber = o.camber ?? 0.09, z0 = o.z ?? 0, tipK = o.tip ?? 0.55;
  const top: THREE.Vector3[] = [], bot: THREE.Vector3[] = [], mid: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [], half: number[] = [];
  for (let i = 0; i <= nu; i++) {
    const u = i / nu, r = o.r0 + (o.r1 - o.r0) * u;
    const tip = Math.sqrt(Math.max(0.05, 1 - Math.pow(Math.max(0, (u - 0.78) / 0.22), 2) * tipK));
    const chord = (o.c0 + (o.c1 - o.c0) * u) * tip;
    const pitch = o.pitch0 + (o.pitch1 - o.pitch0) * u;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv, s = (v - 0.5) * chord;
      const ang = o.sweep * u * u + (s * Math.cos(pitch)) / r;
      const bend = chord * camber * (1 - 4 * (v - 0.5) * (v - 0.5));
      const zc = z0 + s * Math.sin(pitch) + bend;
      const t = o.thick * (0.22 + 0.78 * Math.pow(Math.sin(PI * v), 0.55)) * (1 - 0.45 * u) * 0.5;
      const T = new THREE.Vector3(-Math.sin(ang), Math.cos(ang), 0);
      const N = T.clone().multiplyScalar(-Math.sin(pitch)).add(new THREE.Vector3(0, 0, Math.cos(pitch)));
      const P = new THREE.Vector3(r * Math.cos(ang), r * Math.sin(ang), zc);
      top.push(P.clone().addScaledVector(N, t)); bot.push(P.clone().addScaledVector(N, -t));
      mid.push(P); nrm.push(N); half.push(t);
    }
  }
  const pos: number[] = [], idx: number[] = [], row = nv + 1;
  const push = (v: THREE.Vector3) => { pos.push(v.x, v.y, v.z); return pos.length / 3 - 1; };
  const tb = top.map(push), bb = bot.map(push);
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
    idx.push(tb[a], tb[c], tb[b], tb[b], tb[c], tb[d]);
    idx.push(bb[a], bb[b], bb[c], bb[b], bb[d], bb[c]);
  }
  for (let j = 0; j < nv; j++) {
    const a = nu * row + j;
    const t0 = push(top[a]), t1 = push(top[a + 1]), b0 = push(bot[a]), b1 = push(bot[a + 1]);
    idx.push(t0, b0, t1, t1, b0, b1);
  }
  const K = 2;
  const rimNormals: [number, THREE.Vector3][] = [];
  for (const [j, inner, flip] of [[0, 1, false], [nv, nv - 1, true]] as [number, number, boolean][]) {
    const ring: number[][] = [];
    for (let i = 0; i <= nu; i++) {
      const a = i * row + j;
      const out = mid[a].clone().sub(mid[i * row + inner]); out.addScaledVector(nrm[a], -out.dot(nrm[a])).normalize();
      const pts = [tb[a]];
      const p = mid[a].clone().addScaledVector(out, half[a]);
      for (const side of [1, -1]) {
        const id = push(p);
        rimNormals.push([id, nrm[a].clone().multiplyScalar(side).addScaledVector(out, 0.35).normalize()]);
        pts.push(id);
      }
      pts.push(bb[a]);
      ring.push(pts);
    }
    for (let i = 0; i < nu; i++) for (let k = 0; k < K + 1; k++) {
      if (k === K / 2) continue;
      const p = ring[i][k], q = ring[i][k + 1], r = ring[i + 1][k], s = ring[i + 1][k + 1];
      if (flip) idx.push(p, r, q, q, r, s); else idx.push(p, q, r, q, s, r);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const n = g.getAttribute('normal');
  for (const [id, v] of rimNormals) n.setXYZ(id, v.x, v.y, v.z);
  return g;
}

// Marks a geometry for the lit material: tone runs from flame (0) through hot to pale (1), and gain scales it.
export function led(g: THREE.BufferGeometry, tone: number, gain = 1): THREE.BufferGeometry {
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { c[i * 4] = tone; c[i * 4 + 1] = gain; }
  g.setAttribute('cell', new THREE.Float32BufferAttribute(c, 4));
  return g;
}

// Something geometry is added to, and the same moved by a matrix, so a part can be built in its own space.
export interface Adds { add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4, opts?: { shadow?: boolean; uv?: 'box' | 'keep'; tile?: number }): void }
export const moved = (b: Adds, m: THREE.Matrix4): Adds => ({ add: (g, mat, x, o) => b.add(g, mat, x ? m.clone().multiply(x) : m, o) });
