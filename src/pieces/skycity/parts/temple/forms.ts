import * as THREE from 'three';
import { Builder } from '../../../../world/build';
import { bend, seat } from '../../layout';
import { K, type KindName, type TempleMats } from './materials';

const D2R = Math.PI / 180;

// Two builders, one for the large forms that throw shadows and one for the small ones that do not. Each piece's kind
// is written on its vertices, with a coordinate across a face, a seed, and a flag, so one program can tell what it is,
// and its own coordinates as it was built (on uv), from which the shader draws its courses, slabs and joints: once a
// piece stands on the dome the frame's y is no longer its height.
// A piece handed with a matrix stands on the dome by it (seat). A piece handed without one was built flat on the map
// and is cut fine and laid over the dome (bend).
export class Parts {
  private cast = new Builder();
  private fine = new Builder();
  constructor(private mats: TempleMats) {}
  get tris() { return this.cast.tris + this.fine.tris; }
  add(geo: THREE.BufferGeometry, kind: KindName, o: { m?: THREE.Matrix4; cast?: boolean; seed?: number; flag?: number; v?: (p: THREE.Vector3) => number } = {}): void {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const pos = g.getAttribute('position'), nrm = g.getAttribute('normal'), n = pos.count, cell = new Float32Array(n * 4), uv = new Float32Array(n * 2);
    const own = g.getAttribute('cell') as THREE.BufferAttribute | undefined, p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(pos, i);
      cell[i * 4] = K[kind];
      cell[i * 4 + 1] = own ? own.getY(i) : o.v ? o.v(p) : 0;
      cell[i * 4 + 2] = o.seed ?? 0;
      cell[i * 4 + 3] = own ? own.getW(i) : o.flag ?? 0;
      const ax = Math.abs(nrm.getX(i)), az = Math.abs(nrm.getZ(i));
      uv[i * 2] = kind === 'paving' || kind === 'water' ? p.x : own ? own.getY(i) : ax > az ? p.z : p.x;
      uv[i * 2 + 1] = kind === 'paving' || kind === 'water' ? p.z : p.y;
    }
    g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    if (o.m) g.applyMatrix4(o.m);
    else g = bend(split(g, SPLIT));
    (o.cast ? this.cast : this.fine).add(g, this.mats.solid, undefined, { shadow: !!o.cast });
  }
  async build(parent: THREE.Object3D): Promise<THREE.Mesh[]> {
    return [...(await this.cast.buildInSlices(parent, 'temple')), ...(await this.fine.buildInSlices(parent, 'temple-fine'))];
  }
}

// What is laid over the dome is cut first so no edge of it is longer than this on the map, or it would run as a chord
// under the curve: a chord this long sags about a tenth of a unit under it.
const SPLIT = 24;
// Cuts a geometry with no index, edge by edge, until no edge is longer than max across the map, carrying every
// attribute along.
export function split(g: THREE.BufferGeometry, max: number): THREE.BufferGeometry {
  const names = Object.keys(g.attributes), src = names.map((k) => g.getAttribute(k)), size = src.map((a) => a.itemSize);
  const out: number[][] = names.map(() => []);
  const tri = (v: number[][][]) => {
    const pa = v[0], pb = v[1], pc = v[2], P = names.indexOf('position');
    const len = (a: number[][], b: number[][]) => Math.hypot(a[P][0] - b[P][0], a[P][2] - b[P][2]);
    const e = [len(pa, pb), len(pb, pc), len(pc, pa)], k = e.indexOf(Math.max(...e));
    if (e[k] <= max) { for (const q of v) q.forEach((x, j) => out[j].push(...x)); return; }
    const [a, b, c] = [v[k], v[(k + 1) % 3], v[(k + 2) % 3]];
    const mid = a.map((x, j) => x.map((y, i) => (y + b[j][i]) / 2));
    tri([a, mid, c]);
    tri([mid, b, c]);
  };
  const count = g.getAttribute('position').count;
  for (let t = 0; t < count; t += 3) tri([0, 1, 2].map((d) => src.map((a, j) => Array.from({ length: size[j] }, (_, i) => a.getComponent(t + d, i)))));
  const r = new THREE.BufferGeometry();
  names.forEach((k, j) => r.setAttribute(k, new THREE.Float32BufferAttribute(out[j], size[j])));
  return r;
}

// Where a point of a thing stands on the map: the thing at x, z, turned about its own upright, and the point so far
// across, up and along it. As [x, height above the ground, z], for a lamp.
export function local(x: number, y: number, z: number, turn: number, lx: number, ly: number, lz: number): [number, number, number] {
  const a = turn * D2R, c = Math.cos(a), s = Math.sin(a);
  return [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
}

// A station of a prism: at height y, a rectangle hw by hd from its middle, its corners cut by c, its middle moved by
// dx and dz.
export interface Station { y: number; hw: number; hd: number; c?: number; dx?: number; dz?: number }

function section(s: Station): [number, number][] {
  const c = Math.min(s.c ?? 0, s.hw * 0.45, s.hd * 0.45), { hw, hd } = s;
  if (c < 1e-3) return [[hw, -hd], [hw, hd], [-hw, hd], [-hw, -hd]];
  return [[hw, -hd + c], [hw, hd - c], [hw - c, hd], [-hw + c, hd], [-hw, hd - c], [-hw, -hd + c], [-hw + c, -hd], [hw - c, -hd]];
}

// A prism through its stations, each side flat and meeting the next at a hard edge, so every edge and every cut corner
// holds its own line of light. A battered wall, a cornice, an obelisk's shaft are all this. Stations must share their
// number of sides: give every one a corner cut, or none.
export function prism(st: Station[], caps: { top?: boolean; bottom?: boolean } = { top: true }): THREE.BufferGeometry {
  const pos: number[] = [];
  const rings = st.map((s) => section(s).map(([u, v]) => [u + (s.dx ?? 0), s.y, v + (s.dz ?? 0)] as [number, number, number]));
  const n = rings[0].length;
  for (let j = 0; j < st.length - 1; j++) {
    const a = rings[j], b = rings[j + 1];
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      pos.push(...a[i], ...a[i2], ...b[i2], ...a[i], ...b[i2], ...b[i]);
    }
  }
  const fan = (r: [number, number, number][], up: boolean) => {
    for (let i = 1; i < n - 1; i++) up ? pos.push(...r[0], ...r[i + 1], ...r[i]) : pos.push(...r[0], ...r[i], ...r[i + 1]);
  };
  if (caps.top !== false) fan(rings[rings.length - 1], true);
  if (caps.bottom) fan(rings[0], false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  fixWinding(g);
  g.computeVertexNormals();
  return g;
}

// The sides above were wound one way; make every face's normal point away from the prism's axis or up, whichever way
// it was built.
function fixWinding(g: THREE.BufferGeometry): void {
  const p = g.getAttribute('position') as THREE.BufferAttribute, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const box = new THREE.Box3().setFromBufferAttribute(p), mid = box.getCenter(new THREE.Vector3());
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    if (n.lengthSq() < 1e-12) continue;
    const centre = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    const out = new THREE.Vector3(centre.x - mid.x, 0, centre.z - mid.z);
    const flat = Math.abs(n.clone().normalize().y) > 0.9;
    const want = flat ? (centre.y > mid.y - 1e-6 ? 1 : -1) * Math.sign(n.y) : Math.sign(n.dot(out));
    if (want < 0) { p.setXYZ(i + 1, c.x, c.y, c.z); p.setXYZ(i + 2, b.x, b.y, b.z); }
  }
}

// A box with its edges cut, standing on y = 0 unless moved.
export const block = (w: number, h: number, d: number, c = 0.25, y0 = 0) => prism([{ y: y0, hw: w / 2, hd: d / 2, c }, { y: y0 + h, hw: w / 2, hd: d / 2, c }], { top: true, bottom: false });

// A battered block, narrower at its top by a share of its width on each side, with a cavetto cornice: the wall flares
// out over its last few units and is capped by a flat slab. The shape of a pylon's tower, a hall's walls, a shrine.
export function battered(w: number, d: number, h: number, batter: number, o: { cornice?: number; c?: number; dBatter?: number } = {}): THREE.BufferGeometry {
  const cor = o.cornice ?? Math.min(3, h * 0.12), c = o.c ?? 0.3, top = h - cor;
  const tw = (w / 2) * (1 - batter), td = (d / 2) * (1 - (o.dBatter ?? batter));
  const st: Station[] = [{ y: 0, hw: w / 2, hd: d / 2, c }, { y: top, hw: tw, hd: td, c }];
  // The torus roll, then the cavetto flaring out, then its flat crown.
  for (let i = 1; i <= 4; i++) {
    const k = i / 4, out = cor * 0.55 * (1 - Math.cos((k * Math.PI) / 2));
    st.push({ y: top + cor * 0.8 * k, hw: tw + out, hd: td + out, c });
  }
  st.push({ y: h, hw: tw + cor * 0.55, hd: td + cor * 0.55, c });
  return prism(st);
}

// A square pyramid (or a frustum of one) on y = 0: its base's half width, its height to a point, and where it is cut.
export function pyramidal(half: number, tall: number, cut = 1): THREE.BufferGeometry {
  const yt = tall * cut, ht = half * (1 - cut);
  if (ht < 1e-3) {
    const g = new THREE.ConeGeometry(half * Math.SQRT2, tall, 4, 1, true);
    g.rotateY(Math.PI / 4);
    g.translate(0, tall / 2, 0);
    return g.toNonIndexed();
  }
  return prism([{ y: 0, hw: half, hd: half }, { y: yt, hw: ht, hd: ht }]);
}

// The great pyramid's casing: four faces from its foot to where it is cut, each built across in columns whose normals
// swing through the face's swell, so a face is a little convex and reflects a band of the room that slides as the
// light moves. Between faces, a narrow arris of its own, which holds a line of light up each corner. Each vertex
// carries how far it is across its face, in units, for the panels' joints.
export function casing(half: number, tall: number, yTop: number, swell: number, rise: number, arris: number, cols = 14, rows = 6): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], cell: number[] = [];
  const hw = (y: number) => half * (1 - y / tall);
  const s = Math.hypot(half, tall);
  for (let f = 0; f < 4; f++) {
    const a = f * 90 * D2R, d = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), t = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    const n0 = new THREE.Vector3().addScaledVector(d, tall / s).add(new THREE.Vector3(0, half / s, 0)).normalize();
    const at = (u: number, y: number) => { const w = hw(y) - arris; return new THREE.Vector3().addScaledVector(d, hw(y)).addScaledVector(t, u * w).setY(y); };
    const upFace = new THREE.Vector3().addScaledVector(d, -half / s).add(new THREE.Vector3(0, tall / s, 0)).normalize();
    const normalAt = (u: number, y = yTop / 2) => n0.clone().addScaledVector(t, Math.tan(swell * u * D2R)).addScaledVector(upFace, Math.tan(rise * (2 * y / yTop - 1) * D2R)).normalize();
    for (let i = 0; i < cols; i++) for (let r = 0; r < rows; r++) {
      const u0 = -1 + (2 * i) / cols, u1 = -1 + (2 * (i + 1)) / cols, y0 = (yTop * r) / rows, y1 = (yTop * (r + 1)) / rows;
      const q = [at(u0, y0), at(u1, y0), at(u1, y1), at(u0, y1)], nn = [normalAt(u0, y0), normalAt(u1, y0), normalAt(u1, y1), normalAt(u0, y1)], us = [u0, u1, u1, u0];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        pos.push(q[k].x, q[k].y, q[k].z); nrm.push(nn[k].x, nn[k].y, nn[k].z);
        cell.push(0, us[k] * (hw(q[k].y) - arris), 0, 1);
      }
    }
    // The arris to the next face.
    const b = (f + 1) * 90 * D2R, d2 = new THREE.Vector3(Math.sin(b), 0, Math.cos(b)), t2 = new THREE.Vector3(Math.cos(b), 0, -Math.sin(b));
    const at2 = (u: number, y: number) => { const w = hw(y) - arris; return new THREE.Vector3().addScaledVector(d2, hw(y)).addScaledVector(t2, u * w).setY(y); };
    const n2 = new THREE.Vector3().addScaledVector(d2, tall / s).add(new THREE.Vector3(0, half / s, 0)).normalize();
    const nA = normalAt(1), nB = n2.clone().addScaledVector(t2, -Math.tan(swell * D2R)).normalize(), nM = nA.clone().add(nB).normalize();
    const q = [at(1, 0), at2(-1, 0), at2(-1, yTop), at(1, yTop)], nn = [nM, nM, nM, nM];
    // Only the arris's middle faces between the two faces: its two long edges take each face's own normal, so the line
    // of light along it is soft at its sides and does not break into steps.
    nn[0] = normalAt(1, 0); nn[3] = normalAt(1, yTop);
    for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(q[k].x, q[k].y, q[k].z); nrm.push(nn[k].x, nn[k].y, nn[k].z); cell.push(0, 0, 0, 0); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  fixFaces(g);
  return g;
}

// Make each triangle wound so it faces the way its normals say.
function fixFaces(g: THREE.BufferGeometry): void {
  const p = g.getAttribute('position') as THREE.BufferAttribute, n = g.getAttribute('normal') as THREE.BufferAttribute;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), m = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2); m.fromBufferAttribute(n, i);
    const f = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    if (f.dot(m) < 0) {
      p.setXYZ(i + 1, c.x, c.y, c.z); p.setXYZ(i + 2, b.x, b.y, b.z);
      const nb = new THREE.Vector3().fromBufferAttribute(n, i + 1), nc = new THREE.Vector3().fromBufferAttribute(n, i + 2);
      n.setXYZ(i + 1, nc.x, nc.y, nc.z); n.setXYZ(i + 2, nb.x, nb.y, nb.z);
      const cl = g.getAttribute('cell') as THREE.BufferAttribute | undefined;
      if (cl) { const y1 = cl.getY(i + 1), w1 = cl.getW(i + 1); cl.setY(i + 1, cl.getY(i + 2)); cl.setW(i + 1, cl.getW(i + 2)); cl.setY(i + 2, y1); cl.setW(i + 2, w1); }
    }
  }
}

// A turned column: a round shaft on a low base, swelling a little, under a capital that flares like an open papyrus
// head and an abacus block.
export function column(r: number, tall: number, seg = 10): THREE.BufferGeometry[] {
  const cap = r * 2.2;
  const shaft: [number, number][] = [[r * 1.35, 0], [r * 1.35, r * 0.5], [r * 1.05, r * 0.6], [r * 1.08, tall * 0.25], [r, tall - cap * 0.75]];
  const head: [number, number][] = [[r, tall - cap * 0.75], [r * 1.12, tall - cap * 0.45], [r * 1.32, tall - cap * 0.2], [r * 1.36, tall - cap * 0.12]];
  const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg).toNonIndexed();
  const abacus = block(r * 1.9, cap * 0.12, r * 1.9, 0.08, tall - cap * 0.12);
  return [lathe(shaft), lathe(head), abacus];
}

// A quad, for a plane of light or water, from four corners.
export function quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, normal = new THREE.Vector3(0, 1, 0)): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const pts = [a, b, c, a, c, d];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pts.flatMap(() => [normal.x, normal.y, normal.z]), 3));
  fixFaces(g);
  return g;
}

// The matrix that stands a thing built upright at the origin on the dome, at a place on the map, so far above the
// ground, turned about its own upright, at a scale.
export const place = (x: number, y: number, z: number, turnDeg = 0, s = 1) => seat(x, z, y, turnDeg).multiply(new THREE.Matrix4().makeScale(s, s, s));
