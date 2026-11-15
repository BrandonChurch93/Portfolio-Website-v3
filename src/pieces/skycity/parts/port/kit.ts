import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Section, loft } from '../../../../world/build';
import type { KindName } from './materials';
import { KIND } from './materials';

// Putting the port together: every piece is tagged with what it is made of (the cell attribute: kind, and two numbers
// a lit kind reads, such as how many bays a row of windows has) and gathered into one geometry.

export class Kit {
  private list: THREE.BufferGeometry[] = [];
  tris = 0;
  add(geo: THREE.BufferGeometry, kind: KindName, m?: THREE.Matrix4, a = 0, b = 0): void {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const n = g.getAttribute('position').count;
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    const cell = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { cell[i * 4] = KIND[kind]; cell[i * 4 + 1] = a; cell[i * 4 + 2] = b; }
    g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'cell'].includes(name)) g.deleteAttribute(name);
    g.morphAttributes = {};
    if (g === geo) g = g.clone();
    this.list.push(g);
    this.tris += n / 3;
  }
  geometry(): THREE.BufferGeometry {
    const g = mergeGeometries(this.list, false) ?? new THREE.BufferGeometry();
    for (const x of this.list) x.dispose();
    this.list = [];
    g.computeBoundingSphere();
    return g;
  }
}

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function xform(p: THREE.Vector3 | [number, number, number], yaw = 0, s: number | [number, number, number] = 1, pitch = 0, roll = 0): THREE.Matrix4 {
  const v = Array.isArray(p) ? new THREE.Vector3(...p) : p;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(roll, yaw, pitch, 'YZX'));
  const sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  return new THREE.Matrix4().compose(v, q, sc);
}

// A rod from a to b.
export function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 6, r1 = r): THREE.BufferGeometry {
  const d = b.clone().sub(a), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r, Math.max(len, 1e-3), seg, 1, false);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  g.applyQuaternion(q);
  g.translate(a.x, a.y, a.z);
  return g;
}

// A turned form from [radius, height] pairs, its sharp corners kept hard so each turned edge holds a line of light.
export function turned(pts: [number, number][], seg: number, crease = 35): THREE.BufferGeometry {
  const runs: [number, number][][] = [[pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    runs[runs.length - 1].push(pts[i]);
    if (i < pts.length - 1) {
      const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), c = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
      let d = Math.abs(a - c) * (180 / Math.PI);
      if (d > 180) d = 360 - d;
      if (d > crease) runs.push([pts[i]]);
    }
  }
  const parts = runs.filter((r) => r.length > 1).map((r) => {
    const g = new THREE.LatheGeometry(r.map(([x, y]) => new THREE.Vector2(Math.max(x, 1e-4), y)), seg).toNonIndexed();
    g.deleteAttribute('uv');
    return g;
  });
  const out = mergeGeometries(parts, false)!;
  // u runs once round, for anything lit in bays.
  const p = out.getAttribute('position'), uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = (Math.atan2(p.getX(i), p.getZ(i)) / (2 * Math.PI) + 1) % 1; uv[i * 2 + 1] = 0; }
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}

// A battered block: a rectangle at its foot and a smaller one at its top, its corners rounded just enough to hold a
// line of light. Optionally a cavetto cornice flaring out over its top.
export function battered(w0: number, d0: number, w1: number, d1: number, h: number, cornice = 0): THREE.BufferGeometry {
  const s: Section[] = [{ y: 0, rx: w0 / 2, rz: d0 / 2, n: 12 }, { y: h, rx: w1 / 2, rz: d1 / 2, n: 12 }];
  if (cornice > 0) {
    const c = cornice;
    s.push({ y: h + c * 0.15, rx: w1 / 2 + c * 0.05, rz: d1 / 2 + c * 0.05, n: 12 }, { y: h + c * 0.55, rx: w1 / 2 + c * 0.25, rz: d1 / 2 + c * 0.25, n: 12 }, { y: h + c * 0.85, rx: w1 / 2 + c * 0.6, rz: d1 / 2 + c * 0.6, n: 12 }, { y: h + c, rx: w1 / 2 + c * 0.6, rz: d1 / 2 + c * 0.6, n: 12 });
  }
  return loft(s, 32, { cap: true });
}

// A box with its edges cut, so each holds a highlight.
export function block(w: number, h: number, d: number, cut = 0.4): THREE.BufferGeometry {
  const c = Math.min(cut, w / 3, h / 3, d / 3);
  const shape = new THREE.Shape();
  const x = w / 2 - c, y = h / 2 - c;
  shape.moveTo(-x, -h / 2); shape.lineTo(x, -h / 2); shape.lineTo(w / 2, -y); shape.lineTo(w / 2, y); shape.lineTo(x, h / 2); shape.lineTo(-x, h / 2); shape.lineTo(-w / 2, y); shape.lineTo(-w / 2, -y); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * c, bevelEnabled: true, bevelThickness: c, bevelSize: 0.0001, bevelSegments: 1, curveSegments: 1 });
  g.translate(0, 0, -(d - 2 * c) / 2);
  return g;
}

// A flat quad facing +z, w wide and h tall, its foot at y = 0, with uv from 0 to 1.
export function panel(w: number, h: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  g.translate(0, h / 2, 0);
  return g;
}
