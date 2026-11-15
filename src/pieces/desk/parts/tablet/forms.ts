import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

// Shapes for the tablet and its pencil, in millimetres.

export const DEG = Math.PI / 180;

// A rounded rectangle's outline, counterclockwise seen from +z, with its outward normal at each point. Every outline
// made with the same corner count has its points at the same angles, so outlines offset from one another can be
// joined point to point.
export function outline(hw: number, hh: number, r: number, perCorner = 24): { p: [number, number][]; n: [number, number][] } {
  const p: [number, number][] = [], n: [number, number][] = [];
  const corners: [number, number, number][] = [[hw - r, hh - r, 0], [-(hw - r), hh - r, 90], [-(hw - r), -(hh - r), 180], [hw - r, -(hh - r), 270]];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= perCorner; i++) {
      const a = (a0 + (90 * i) / perCorner) * DEG, c = Math.cos(a), s = Math.sin(a);
      p.push([cx + c * r, cy + s * r]);
      n.push([c, s]);
    }
  }
  return { p, n };
}

// One step of a profile run round a rounded rectangle: how far out from the outline (negative is in) and at what
// height, and, for a rounded profile, the angle of the surface's normal there (0 out, 90 up the z axis). A step
// without an angle takes the normal of the face it ends.
export interface Step { d: number; z: number; a?: number }

// The faces a profile makes when it is run round a rounded rectangle, each run of steps under its own key.
export function sweep(hw: number, hh: number, r: number, runs: { key: string; steps: Step[] }[], perCorner = 24): Map<string, THREE.BufferGeometry> {
  const out = new Map<string, { pos: number[]; nor: number[] }>();
  for (const { key, steps } of runs) {
    const acc = out.get(key) ?? { pos: [], nor: [] };
    out.set(key, acc);
    for (let j = 0; j < steps.length - 1; j++) {
      const s0 = steps[j], s1 = steps[j + 1];
      const A = outline(hw + s0.d, hh + s0.d, Math.max(0.05, r + s0.d), perCorner), B = outline(hw + s1.d, hh + s1.d, Math.max(0.05, r + s1.d), perCorner);
      const flat = Math.atan2(-(s1.d - s0.d), s1.z - s0.z);
      const a0 = s0.a !== undefined && s1.a !== undefined ? s0.a * DEG : flat, a1 = s0.a !== undefined && s1.a !== undefined ? s1.a * DEG : flat;
      const n = A.p.length;
      const v = (o: typeof A, k: number, z: number, a: number) => {
        acc.pos.push(o.p[k][0], o.p[k][1], z);
        acc.nor.push(o.n[k][0] * Math.cos(a), o.n[k][1] * Math.cos(a), Math.sin(a));
      };
      for (let k = 0; k < n; k++) {
        const k1 = (k + 1) % n;
        v(A, k, s0.z, a0); v(A, k1, s0.z, a0); v(B, k, s1.z, a1);
        v(A, k1, s0.z, a0); v(B, k1, s1.z, a1); v(B, k, s1.z, a1);
      }
    }
  }
  const geos = new Map<string, THREE.BufferGeometry>();
  for (const [key, { pos, nor }] of out) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geos.set(key, g);
  }
  return geos;
}

// A flat rounded rectangle at height z, facing +z, or -z with down.
export function cap(hw: number, hh: number, r: number, z: number, down = false, perCorner = 24): THREE.BufferGeometry {
  const o = outline(hw, hh, r, perCorner);
  const g = new THREE.ShapeGeometry(new THREE.Shape(o.p.map(([x, y]) => new THREE.Vector2(x, y))));
  if (down) g.rotateY(Math.PI);
  g.translate(0, 0, z);
  return g;
}

// A stadium, flat, facing +z: length along x, width along y.
export function stadium(len: number, wid: number, seg = 12): THREE.Shape {
  const r = wid / 2, a = len / 2 - r, pts: THREE.Vector2[] = [];
  for (let i = 0; i <= seg; i++) { const t = -Math.PI / 2 + (Math.PI * i) / seg; pts.push(new THREE.Vector2(a + Math.cos(t) * r, Math.sin(t) * r)); }
  for (let i = 0; i <= seg; i++) { const t = Math.PI / 2 + (Math.PI * i) / seg; pts.push(new THREE.Vector2(-a + Math.cos(t) * r, Math.sin(t) * r)); }
  return new THREE.Shape(pts);
}

// A part turned about y from a profile of [radius, height] points, round and smooth, its profile's edges kept.
export function turned(pts: [number, number][], seg = 48, crease = 34): THREE.BufferGeometry {
  return toCreasedNormals(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), crease * DEG);
}

// The pencil's barrel along +x from its back end at x = 0: a radius at each station, and how far from the middle
// its flat side is cut at -y there (the radius itself where there is no flat). Where the flat meets the round, the
// faces keep their edge.
export function barrel(stations: [x: number, r: number, flat: number][], around = 72): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  const W = around + 1;
  for (const [x, r, f] of stations) {
    for (let i = 0; i <= around; i++) {
      const t = (i / around) * Math.PI * 2;
      pos.push(x, Math.max(Math.sin(t) * r, -f), Math.cos(t) * r);
    }
  }
  for (let j = 0; j < stations.length - 1; j++) for (let i = 0; i < around; i++) {
    const a = j * W + i, b = a + W;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return toCreasedNormals(g.toNonIndexed(), 30 * DEG);
}

// A profile drawn as a closed outline of [u, v, corner radius] points, its corners rounded.
export function roundedPath(vs: [number, number, number][]): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  const n = vs.length;
  for (let i = 0; i < n; i++) {
    const p = vs[i], a = vs[(i + n - 1) % n], b = vs[(i + 1) % n];
    const u1 = new THREE.Vector2(a[0] - p[0], a[1] - p[1]).normalize(), u2 = new THREE.Vector2(b[0] - p[0], b[1] - p[1]).normalize();
    const half = Math.acos(THREE.MathUtils.clamp(u1.dot(u2), -1, 1)) / 2;
    const r = p[2];
    if (r < 0.01 || half > Math.PI / 2 - 0.01) { out.push(new THREE.Vector2(p[0], p[1])); continue; }
    const t = r / Math.tan(half);
    const p1 = new THREE.Vector2(p[0], p[1]).addScaledVector(u1, t), p2 = new THREE.Vector2(p[0], p[1]).addScaledVector(u2, t);
    const c = new THREE.Vector2(p[0], p[1]).addScaledVector(u1.clone().add(u2).normalize(), r / Math.sin(half));
    const a1 = Math.atan2(p1.y - c.y, p1.x - c.x);
    let sw = Math.atan2(p2.y - c.y, p2.x - c.x) - a1;
    while (sw > Math.PI) sw -= 2 * Math.PI;
    while (sw < -Math.PI) sw += 2 * Math.PI;
    const steps = Math.max(2, Math.min(24, Math.ceil((Math.abs(sw) * r) / 0.4)));
    for (let k = 0; k <= steps; k++) { const q = a1 + (sw * k) / steps; out.push(new THREE.Vector2(c.x + Math.cos(q) * r, c.y + Math.sin(q) * r)); }
  }
  return out;
}

// A plate from an outline in (u, v), extruded along w from w0 to w1, every edge chamfered.
export function plate(outlinePts: THREE.Vector2[], holes: THREE.Vector2[][], w0: number, w1: number, bev: number): THREE.BufferGeometry {
  const s = new THREE.Shape(outlinePts);
  for (const h of holes) s.holes.push(new THREE.Path(h));
  const g = new THREE.ExtrudeGeometry(s, { depth: w1 - w0 - 2 * bev, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 1, curveSegments: 1 });
  g.translate(0, 0, w0 + bev);
  return toCreasedNormals(g, 30 * DEG);
}

// Splits a geometry in two by its faces' directions: the faces that look straight along an axis, and the rest, which
// are the bevels, the rounded corners and the slanted walls where a cut edge catches the light.
export function byFacing(geo: THREE.BufferGeometry, square = 0.97): [flat: THREE.BufferGeometry, cut: THREE.BufferGeometry] {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  const out = [{ pos: [] as number[], nor: [] as number[] }, { pos: [] as number[], nor: [] as number[] }];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    const f = b.sub(a).cross(c.sub(a)).normalize();
    const side = Math.max(Math.abs(f.x), Math.abs(f.y), Math.abs(f.z)) > square ? out[0] : out[1];
    for (let k = 0; k < 3; k++) { side.pos.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k)); side.nor.push(n.getX(i + k), n.getY(i + k), n.getZ(i + k)); }
  }
  return out.map(({ pos, nor }) => {
    const r = new THREE.BufferGeometry();
    r.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    r.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return r;
  }) as [THREE.BufferGeometry, THREE.BufferGeometry];
}
