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
  add(geo: THREE.BufferGeometry, kind: KindName, o: { m?: THREE.Matrix4; cast?: boolean; seed?: number; flag?: number; foot?: number; v?: (p: THREE.Vector3) => number } = {}): void {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const pos = g.getAttribute('position'), nrm = g.getAttribute('normal'), n = pos.count, cell = new Float32Array(n * 4), uv = new Float32Array(n * 2);
    const own = g.getAttribute('cell') as THREE.BufferAttribute | undefined, p = new THREE.Vector3();
    // A stone carries how far under its own top and over its own foot each point is, for its stains and its dark foot.
    const aged = kind === 'lime' && !own && !o.v;
    if (aged) g.computeBoundingBox();
    const lo = g.boundingBox?.min.y ?? 0, hi = g.boundingBox?.max.y ?? 0;
    for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(pos, i);
      cell[i * 4] = K[kind];
      cell[i * 4 + 1] = own ? own.getY(i) : o.v ? o.v(p) : aged ? hi - p.y : 0;
      cell[i * 4 + 2] = own ? own.getZ(i) : o.seed ?? 0;
      cell[i * 4 + 3] = own ? own.getW(i) : aged ? p.y - lo + (o.foot ?? 0) : o.flag ?? 0;
      const ax = Math.abs(nrm.getX(i)), az = Math.abs(nrm.getZ(i));
      uv[i * 2] = kind === 'paving' || kind === 'pool' ? p.x : own ? own.getY(i) : ax > az ? p.z : p.x;
      uv[i * 2 + 1] = kind === 'paving' || kind === 'pool' ? p.z : p.y;
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

// A square pyramid, or a band of one, whose arrises are rounded: a ruled surface from a rounded square at its foot to
// its tip, so each arris carries a line of light that slides round it as the light moves, which a sharp edge cannot.
// Its half width at its foot, its height to its tip, the band of it from s0 to s1 as shares of that height, how much
// of the half width each arris is rounded over, whether the flat sides and the arrises are made, how far each side
// swells across, in degrees, and how many rows up it.
export interface Rounded { round: number; sides?: boolean; corners?: boolean; swell?: number; rows?: number; cols?: number; arc?: number }
export function roundedPyramid(half: number, tall: number, s0: number, s1: number, o: Rounded): THREE.BufferGeometry {
  const rho = half * o.round, flat = half - rho, sw = (o.swell ?? 0) * D2R, rows = o.rows ?? 4, cols = o.cols ?? 6, arc = o.arc ?? 8;
  // The foot, as points round it with their outward direction across, how far out along it, and how far along a side.
  const ring: { b: THREE.Vector3; nh: THREE.Vector3; u: number }[][] = [];
  for (let f = 0; f < 4; f++) {
    const a = f * 90 * D2R, d = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), t = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    if (o.sides !== false) {
      const run: { b: THREE.Vector3; nh: THREE.Vector3; u: number }[] = [];
      for (let i = 0; i <= cols; i++) {
        const u = -1 + (2 * i) / cols;
        run.push({ b: d.clone().multiplyScalar(half).addScaledVector(t, u * flat), nh: d.clone().addScaledVector(t, Math.tan(sw * u)).normalize(), u });
      }
      ring.push(run);
    }
    if (o.corners !== false) {
      const run: { b: THREE.Vector3; nh: THREE.Vector3; u: number }[] = [], c = d.clone().add(t).multiplyScalar(flat);
      for (let i = 0; i <= arc; i++) {
        const p = ((i / arc) * Math.PI) / 2, nh = d.clone().multiplyScalar(Math.cos(p)).addScaledVector(t, Math.sin(p));
        const swing = new THREE.Vector3().copy(d).addScaledVector(t, Math.tan(sw)).normalize().lerp(new THREE.Vector3().copy(t).addScaledVector(d, Math.tan(sw)).normalize(), i / arc).normalize();
        run.push({ b: c.clone().addScaledVector(nh, rho), nh: sw > 0 ? swing : nh, u: 1 });
      }
      ring.push(run);
    }
  }
  const pos: number[] = [], nrm: number[] = [];
  const at = (q: { b: THREE.Vector3 }, s: number) => new THREE.Vector3(q.b.x * (1 - s), tall * s, q.b.z * (1 - s));
  const normal = (q: { b: THREE.Vector3; nh: THREE.Vector3 }) => q.nh.clone().multiplyScalar(tall).add(new THREE.Vector3(0, q.b.dot(q.nh), 0)).normalize();
  for (const run of ring) {
    for (let i = 0; i < run.length - 1; i++) {
      const a = run[i], b = run[i + 1], na = normal(a), nb = normal(b);
      for (let r = 0; r < rows; r++) {
        const sa = s0 + ((s1 - s0) * r) / rows, sb = s0 + ((s1 - s0) * (r + 1)) / rows;
        const q = [at(a, sa), at(b, sa), at(b, sb), at(a, sb)], nn = [na, nb, nb, na];
        for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(q[k].x, q[k].y, q[k].z); nrm.push(nn[k].x, nn[k].y, nn[k].z); }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  fixFaces(g);
  return g;
}

// A square pyramid whose faces are each folded out along their middle, so it has eight flat facets meeting at hard
// edges: a mirror cut like this holds one light on one facet and the dark on the next, where a flat face reads as one
// color. Its half width at its foot, its height, and how far the middle of each side stands out, as a share of the
// half width. Each facet can be shaded as bowed from its foot to its tip, by so many degrees, so it carries a band of
// light across it and not one even color.
export function facetedPyramid(half: number, tall: number, fold: number, bow = 0): THREE.BufferGeometry {
  const pos: number[] = [], tip = [0, tall, 0];
  for (let f = 0; f < 4; f++) {
    const a = f * 90 * D2R, d = [Math.sin(a), Math.cos(a)], t = [Math.cos(a), -Math.sin(a)];
    const c0 = [d[0] * half - t[0] * half, 0, d[1] * half - t[1] * half], c1 = [d[0] * half + t[0] * half, 0, d[1] * half + t[1] * half];
    const mid = [d[0] * half * (1 + fold), 0, d[1] * half * (1 + fold)];
    pos.push(...c0, ...mid, ...tip, ...mid, ...c1, ...tip);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  fixWinding(g);
  g.computeVertexNormals();
  if (bow) {
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), v = new THREE.Vector3(), k = Math.tan((bow * D2R) / 2);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(n, i).addScaledVector(new THREE.Vector3(0, 1, 0), k * ((2 * p.getY(i)) / tall - 1)).normalize();
      n.setXYZ(i, v.x, v.y, v.z);
    }
  }
  return g;
}

// A ring swept round from a profile: the profile's points as how far out from the ring's middle line and how far in
// front of it, each with the kind it is made of, in order round the section. It stands in the x, y plane round its
// middle, and leaves out the stretch round its foot from -gap to gap, in radians, where it is set into its bar. The
// normals are worked out from the profile, so its curves carry smooth lines of light. Returns one geometry a kind.
export function sweptRing<T extends string>(r: number, profile: [number, number, T][], seg: number, gap = 0): Map<T, THREE.BufferGeometry> {
  const out = new Map<T, { pos: number[]; nrm: number[] }>();
  const n = profile.length, pn: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = profile[(i + n - 1) % n], b = profile[(i + 1) % n], tr = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tr, tz) || 1;
    pn.push([tz / l, -tr / l]);
  }
  let area = 0;
  for (let i = 0; i < n; i++) { const a = profile[i], b = profile[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const flip = area > 0 ? 1 : -1;
  const a0 = -Math.PI / 2 + gap, a1 = (3 * Math.PI) / 2 - gap;
  for (let j = 0; j < seg; j++) {
    const ta = a0 + ((a1 - a0) * j) / seg, tb = a0 + ((a1 - a0) * (j + 1)) / seg;
    for (let i = 0; i < n; i++) {
      const p = profile[i], q = profile[(i + 1) % n], kind = p[2];
      if (!out.has(kind)) out.set(kind, { pos: [], nrm: [] });
      const o = out.get(kind)!;
      const v = (t: number, s: [number, number, T], k: number) => {
        const rr = r + s[0], nr = pn[k][0] * flip, nz = pn[k][1] * flip;
        return { p: [Math.cos(t) * rr, Math.sin(t) * rr, s[1]], n: [Math.cos(t) * nr, Math.sin(t) * nr, nz] };
      };
      const k1 = (i + 1) % n, quad = [v(ta, p, i), v(tb, p, i), v(tb, q, k1), v(ta, q, k1)];
      for (const k of [0, 1, 2, 0, 2, 3]) { o.pos.push(...quad[k].p); o.nrm.push(...quad[k].n); }
    }
  }
  const res = new Map<T, THREE.BufferGeometry>();
  for (const [k, o] of out) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(o.nrm, 3));
    fixFaces(g);
    res.set(k, g);
  }
  return res;
}

// Make each triangle wound so it faces the way its normals say.
export function fixFaces(g: THREE.BufferGeometry): void {
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

// A quad, for a plane of light or of the pool, from four corners.
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
