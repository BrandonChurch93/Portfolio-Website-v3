import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { KIND, type KindName } from './look';

// Putting a craft together: every piece is tagged with what it is made of (the cell attribute: its kind, and two
// numbers a lit kind reads, such as which deck a row of windows is) and gathered into one geometry, so a craft is one
// draw. A craft is built nose toward +x, top toward +y, in units.

export class Kit {
  private list: THREE.BufferGeometry[] = [];
  tris = 0;
  add(geo: THREE.BufferGeometry, kind: KindName, m?: THREE.Matrix4, a = 0, b = 0, c = 0): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    if (m) g.applyMatrix4(m);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const n = g.getAttribute('position').count;
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    const cell = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { cell[i * 4] = KIND[kind]; cell[i * 4 + 1] = a; cell[i * 4 + 2] = b; cell[i * 4 + 3] = c; }
    g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'cell'].includes(name)) g.deleteAttribute(name);
    g.morphAttributes = {};
    this.list.push(g);
    this.tris += n / 3;
  }
  // The same piece again, mirrored across the craft's middle line.
  pair(make: (side: number) => THREE.BufferGeometry, kind: KindName, a = 0, b = 0): void {
    for (const side of [-1, 1]) this.add(make(side), kind, undefined, a, b);
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

export function xform(p: [number, number, number], yaw = 0, s: number | [number, number, number] = 1, pitch = 0, roll = 0): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(roll, yaw, pitch, 'YZX'));
  const sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  return new THREE.Matrix4().compose(new THREE.Vector3(...p), q, sc);
}

// A rod from a to b, r at a and r1 at b.
export function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 6, r1 = r): THREE.BufferGeometry {
  const d = b.clone().sub(a), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r, Math.max(len, 1e-3), seg, 1, false);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}

// A turned form from [radius, along] pairs, lying along x from x0 (its axis is the craft's length). Sharp corners in
// the profile are kept hard, so each turned edge holds a line of light.
export function turned(pts: [number, number][], seg: number, x0 = 0, crease = 35): THREE.BufferGeometry {
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
  for (const p of parts) p.dispose();
  out.rotateZ(-Math.PI / 2);
  out.translate(x0, 0, 0);
  return out;
}

// A hull lofted through stations along x: at each, the middle's height, its half width, its half height above and
// below the middle, and how square its section is (2 is round, larger is squarer). Each station may be closed by the
// next being at the same x, for a hard step.
export interface Station { x: number; y: number; w: number; up: number; down: number; n?: number }
// arc, if given, makes only a band of the hull, from one angle round its section to another (0 is the +z side, a
// quarter turn the top), grown a little so it lies on the hull's own face: a strake, a row of windows.
export function hull(st: Station[], seg = 24, cap = true, arc?: [number, number], grow = 1): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  st.forEach((s) => {
    const e = 2 / (s.n ?? 2.6);
    for (let i = 0; i <= seg; i++) {
      const a = arc ? arc[0] + ((arc[1] - arc[0]) * i) / seg : (i / seg) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      const h = sn >= 0 ? s.up : s.down;
      pos.push(s.x, s.y + grow * h * Math.sign(sn) * Math.abs(sn) ** e, grow * s.w * Math.sign(c) * Math.abs(c) ** e);
    }
  });
  const W = seg + 1;
  for (let j = 0; j < st.length - 1; j++) for (let i = 0; i < seg; i++) { const a = j * W + i; idx.push(a, a + W, a + 1, a + 1, a + W, a + W + 1); }
  if (cap && !arc) {
    for (const [j, flip] of [[0, true], [st.length - 1, false]] as [number, boolean][]) {
      const s = st[j], c = pos.length / 3;
      pos.push(s.x, s.y, 0);
      for (let i = 0; i < seg; i++) { const a = j * W + i; if (flip) idx.push(c, a, a + 1); else idx.push(c, a + 1, a); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const flat = g.toNonIndexed();
  g.dispose();
  smoothNormals(flat, 40);
  return flat;
}

// Normals averaged across faces that meet at less than crease degrees, so a lofted hull is smooth along its length
// and keeps a hard line wherever it steps.
export function smoothNormals(g: THREE.BufferGeometry, crease: number): void {
  const p = g.getAttribute('position'), n = p.count, face = new Float32Array(n * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    e1.subVectors(b, a); e2.subVectors(c, a);
    const f = e1.cross(e2), len = f.length();
    if (len > 1e-9) f.divideScalar(len); else f.set(0, 1, 0);
    for (let k = 0; k < 3; k++) face.set([f.x, f.y, f.z], (i + k) * 3);
  }
  const key = (i: number) => `${Math.round(p.getX(i) * 1000)},${Math.round(p.getY(i) * 1000)},${Math.round(p.getZ(i) * 1000)}`;
  const groups = new Map<string, number[]>();
  for (let i = 0; i < n; i++) { const k = key(i); const l = groups.get(k); if (l) l.push(i); else groups.set(k, [i]); }
  const out = new Float32Array(n * 3), cos = Math.cos((crease * Math.PI) / 180);
  for (const list of groups.values()) {
    for (const i of list) {
      let x = 0, y = 0, z = 0;
      for (const j of list) {
        const d = face[i * 3] * face[j * 3] + face[i * 3 + 1] * face[j * 3 + 1] + face[i * 3 + 2] * face[j * 3 + 2];
        if (d >= cos) { x += face[j * 3]; y += face[j * 3 + 1]; z += face[j * 3 + 2]; }
      }
      const l = Math.hypot(x, y, z) || 1;
      out[i * 3] = x / l; out[i * 3 + 1] = y / l; out[i * 3 + 2] = z / l;
    }
  }
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out, 3));
}

// A box with its edges cut, so each holds a highlight.
export function block(w: number, h: number, d: number, cut = 0.4): THREE.BufferGeometry {
  const c = Math.max(1e-3, Math.min(cut, w / 3, h / 3, d / 3));
  const shape = new THREE.Shape();
  const x = w / 2 - c, y = h / 2 - c;
  shape.moveTo(-x, -h / 2); shape.lineTo(x, -h / 2); shape.lineTo(w / 2, -y); shape.lineTo(w / 2, y); shape.lineTo(x, h / 2); shape.lineTo(-x, h / 2); shape.lineTo(-w / 2, y); shape.lineTo(-w / 2, -y); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-3, d - 2 * c), bevelEnabled: true, bevelThickness: c, bevelSize: 0.0001, bevelSegments: 1, curveSegments: 1 });
  g.translate(0, 0, -(d - 2 * c) / 2);
  g.deleteAttribute('uv');
  return g;
}

// A blade: a flat outline in the craft's xy plane (a fin, a vane, a wing seen from above once turned), thick, its
// edges cut.
export function blade(outline: [number, number][], thick: number, cut = 0.15): THREE.BufferGeometry {
  const s = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const c = Math.min(cut, thick / 3);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-3, thick - 2 * c), bevelEnabled: true, bevelThickness: c, bevelSize: c, bevelSegments: 1, curveSegments: 4 });
  g.translate(0, 0, -(thick - 2 * c) / 2);
  g.deleteAttribute('uv');
  return g;
}

// An engine's bell: a turned nozzle whose mouth opens toward -x, len long, its front at the place given, with a lit
// throat sunk inside it. The throat is its own kind, so it can burn.
export function bell(k: Kit, r: number, len: number, at: [number, number, number], metal: KindName, seg = 14): void {
  const m = xform(at);
  k.add(turned([[r * 0.8, 0], [r, -0.25 * len], [r * 1.04, -0.9 * len], [r * 1.04, -len], [r * 0.84, -len], [r * 0.72, -0.55 * len]], seg, 0, 30), metal, m);
  k.add(turned([[r * 0.74, -0.56 * len], [r * 0.4, -0.4 * len], [0.01, -0.34 * len]], seg, 0, 80), 'engine', m, at[2], at[1], r * 0.74);
}
