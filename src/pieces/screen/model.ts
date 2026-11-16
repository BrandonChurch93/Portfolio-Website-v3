import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pause, rbox, seeded } from '../../world/build';
import { circle, rounded, rrect, slab, type V } from '../../world/shape';
import { hex } from '../../config/palette';
import { CABLE_ID, SMALL_SIZE, screenArt, smalls } from './art';
import {
  BB, BEZEL, BOARDS, BUTTON, CORNER_SCREWS, COF, DB, DRIVER, GLASS, HARNESS, HINGE, LABEL, MAIN, MB, NECK, PAIR, PB, PLATEAU, POWER, RIBBON, RIBS,
  THIN, TRAY, VESA, top, type Board, type P2, type P3,
} from './layout';
import { BRUSH, SPECIAL, depthMaterial, shadowMaterial, shared, solidMaterial, spillMaterial, type Shared } from './shading';

// The screen with its back off, in millimetres under a root scaled by 0.001. Every part carries its own number so
// the shader can move it alone, and the whole of it is one mesh drawn by one program.
//
// Only copper is orange: coils, pins, pads, the capacitors' tops, a tape tab. The tray and the shells are a warm
// grey steel, the boards a near black mask, ferrite charcoal, plastic a flat dark, the ink a pale cream. The heat
// sinks are bronze, browner and darker than the copper.

export type Kind = 'tile' | 'board' | 'thing' | 'cable' | 'stand' | 'screw';
export interface PartDef {
  kind: Kind;
  c: P3;
  r: number;
  // The run of parts it comes home with: a board's parts, the tray's pressed work.
  row?: string;
  // A cable's path, which its shard runs along.
  path?: P3[];
  // How far it stands off its seat at the flash, along +z.
  lift: number;
  lo: P3;
  hi: P3;
}

export interface ScreenModel {
  root: THREE.Group;
  parts: PartDef[];
  u: Shared;
  mesh: THREE.Mesh;
  spill: THREE.Mesh;
  shadow: THREE.Mesh;
  tris: number;
}

interface Mat { col: number; rough: number; metal: number; brush?: number; sp?: number; vary?: number }
const shade = (name: Parameters<typeof hex>[0], k: number) => new THREE.Color(hex(name)).multiplyScalar(k).getHex();
const M = {
  tray: { col: shade('text', 0.12), rough: 0.17, metal: 1, brush: BRUSH.x, vary: 0.05 },
  steel: { col: shade('text', 0.2), rough: 0.3, metal: 1, brush: BRUSH.y, vary: 0.04 },
  steelDark: { col: shade('text', 0.1), rough: 0.42, metal: 1, brush: BRUSH.y, vary: 0.05 },
  screw: { col: shade('text', 0.22), rough: 0.24, metal: 1, brush: BRUSH.radial },
  copper: { col: shade('copper', 0.82), rough: 0.3, metal: 1 },
  wire: { col: shade('copper', 0.9), rough: 0.22, metal: 1 },
  bronze: { col: shade('bronze', 1.0), rough: 0.26, metal: 1, brush: BRUSH.y, vary: 0.05 },
  bronzeZ: { col: shade('bronze', 1.0), rough: 0.26, metal: 1, brush: BRUSH.z, vary: 0.05 },
  pcb: { col: shade('text', 0.016), rough: 0.4, metal: 0, sp: SPECIAL.board },
  plastic: { col: shade('text', 0.07), rough: 0.62, metal: 0, vary: 0.06 },
  plasticHi: { col: shade('text', 0.09), rough: 0.5, metal: 0, vary: 0.05 },
  epoxy: { col: shade('text', 0.055), rough: 0.48, metal: 0, sp: SPECIAL.print },
  ferrite: { col: shade('text', 0.085), rough: 0.85, metal: 0, sp: SPECIAL.print, vary: 0.14 },
  sleeve: { col: shade('text', 0.045), rough: 0.26, metal: 0 },
  capTop: { col: shade('copper', 0.6), rough: 0.2, metal: 1, brush: BRUSH.radial, sp: SPECIAL.print },
  ceramic: { col: shade('text-3', 0.42), rough: 0.6, metal: 0 },
  ink: { col: shade('text-2', 0.55), rough: 0.5, metal: 0 },
  rubber: { col: shade('text', 0.05), rough: 0.62, metal: 0 },
  cream: { col: shade('text-2', 0.46), rough: 0.5, metal: 0 },
  tape: { col: shade('copper', 0.4), rough: 0.2, metal: 0 },
  film: { col: shade('bronze-deep', 0.5), rough: 0.3, metal: 0 },
  glass: { col: shade('text', 0.02), rough: 0.05, metal: 0, sp: SPECIAL.glass },
  bezel: { col: shade('text', 0.04), rough: 0.55, metal: 0 },
  leak: { col: shade('bg', 1), rough: 0.9, metal: 0, sp: SPECIAL.leak },
  led: { col: shade('ember', 0.8), rough: 0.3, metal: 0, sp: SPECIAL.led },
  label: { col: shade('text-2', 0.62), rough: 0.7, metal: 0, sp: SPECIAL.print },
  recess: { col: shade('bg', 1), rough: 0.9, metal: 0 },
} satisfies Record<string, Mat>;
const flex = (id: number): Mat => ({ col: 0, rough: 0.3, metal: 0, sp: SPECIAL.flex, vary: id });
const lead = (id: number, col: number): Mat => ({ col, rough: 0.5, metal: 0, sp: SPECIAL.wire, vary: id });

// ---- geometry helpers, all in millimetres, z out of the back ----
const bx = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
// A cylinder standing on z = 0 along +z.
function cylZ(r: number, h: number, seg = 32, rTop = r): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, r, h, seg);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, h / 2);
  return g;
}
// A lathe standing along +z, from (radius, height) points running bottom to top.
function latheZ(pts: [number, number][], seg = 40, phi0 = 0, phiL = Math.PI * 2): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, phi0, phiL);
  g.rotateX(Math.PI / 2);
  return g;
}
// A flat outline extruded along z with soft edges.
const plate = (outline: THREE.Vector2[], holes: THREE.Vector2[][], z0: number, z1: number, bev: number, segs = 2) => slab(outline, holes, z0, z1, bev, segs);
function star(r: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; const k = 0.7 + 0.3 * Math.cos(a * 6); pts.push(new THREE.Vector2(Math.cos(a) * r * k, Math.sin(a) * r * k)); }
  return new THREE.ShapeGeometry(new THREE.Shape(pts));
}
// A smooth path through points, with each corner rounded.
function bent(pts: P3[], rc: number): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const v = pts.map((p) => new THREE.Vector3(...p));
  let from = v[0].clone();
  for (let i = 1; i < v.length - 1; i++) {
    const a = v[i].clone().sub(v[i - 1]).normalize(), b = v[i + 1].clone().sub(v[i]).normalize();
    const r = Math.min(rc, v[i].distanceTo(v[i - 1]) * 0.45, v[i + 1].distanceTo(v[i]) * 0.45);
    const p0 = v[i].clone().addScaledVector(a, -r), p1 = v[i].clone().addScaledVector(b, r);
    path.add(new THREE.LineCurve3(from, p0));
    path.add(new THREE.QuadraticBezierCurve3(p0, v[i].clone(), p1));
    from = p1;
  }
  path.add(new THREE.LineCurve3(from, v[v.length - 1]));
  return path;
}
// A curve given as a function.
class Fn extends THREE.Curve<THREE.Vector3> {
  constructor(private f: (t: number, out: THREE.Vector3) => THREE.Vector3) { super(); }
  getPoint(t: number, out = new THREE.Vector3()): THREE.Vector3 { return this.f(t, out); }
}
// A wire along a curve, offset round it by a helix, with uv x round it and y in millimetres along it.
class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private base: THREE.Curve<THREE.Vector3>, private len: number, private rad: number, private pitch: number, private phase: number, private side = 0) { super(); }
  getPoint(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    const p = this.base.getPointAt(t), tan = this.base.getTangentAt(t);
    const n1 = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 0, 1));
    if (n1.lengthSq() < 1e-6) n1.set(1, 0, 0);
    n1.normalize();
    const n2 = new THREE.Vector3().crossVectors(n1, tan).normalize();
    const a = (t * this.len / this.pitch) * Math.PI * 2 + this.phase;
    return out.copy(p).addScaledVector(n1, Math.cos(a) * this.rad + this.side).addScaledVector(n2, Math.sin(a) * this.rad);
  }
}
function wireAlong(curve: THREE.Curve<THREE.Vector3>, len: number, r: number, segs: number): THREE.BufferGeometry {
  const g = new THREE.TubeGeometry(curve, segs, r, 5, false);
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, v, u * len); }
  return g;
}
// A flat flex lying along a path: across it is in the plane of the tray unless the path's own up says otherwise. A
// sharp turn is a fold, drawn as a mitre with the crease along it. uv x counts its conductors across, y is in
// millimetres along.
function flexStrip(path: P3[], w: number, conductors: number, up: (i: number) => THREE.Vector3 = () => new THREE.Vector3(0, 0, 1), step = 1.6): { geo: THREE.BufferGeometry; folds: { p: THREE.Vector3; d: THREE.Vector3; l: number }[]; len: number } {
  const v = path.map((p) => new THREE.Vector3(...p));
  const pts: THREE.Vector3[] = [], ups: THREE.Vector3[] = [];
  for (let i = 0; i < v.length - 1; i++) {
    const n = Math.max(1, Math.ceil(v[i].distanceTo(v[i + 1]) / step));
    for (let k = 0; k < n; k++) { pts.push(v[i].clone().lerp(v[i + 1], k / n)); ups.push(up(i)); }
  }
  pts.push(v[v.length - 1].clone()); ups.push(up(v.length - 2));
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const folds: { p: THREE.Vector3; d: THREE.Vector3; l: number }[] = [];
  let along = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const t0 = pts[i].clone().sub(a), t1 = b.clone().sub(pts[i]);
    if (t0.lengthSq() < 1e-9) t0.copy(t1); if (t1.lengthSq() < 1e-9) t1.copy(t0);
    t0.normalize(); t1.normalize();
    const s0 = new THREE.Vector3().crossVectors(ups[i], t0).normalize(), s1 = new THREE.Vector3().crossVectors(ups[i], t1).normalize();
    const s = s0.clone().add(s1);
    if (s.lengthSq() < 1e-6) s.copy(s1);
    s.normalize();
    const k = 1 / Math.max(0.35, s.dot(s1));
    if (k > 1.05) folds.push({ p: pts[i].clone(), d: s.clone(), l: w * k });
    if (i) along += pts[i].distanceTo(pts[i - 1]);
    for (const e of [-1, 1]) {
      const p = pts[i].clone().addScaledVector(s, (e * w * k) / 2);
      pos.push(p.x, p.y, p.z);
      uv.push(((e + 1) / 2) * conductors, along);
    }
    if (i) { const q = (i - 1) * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Faces the up it was laid with.
  const n = g.getAttribute('normal');
  if (n.count && n.getZ(0) * ups[0].z + n.getY(0) * ups[0].y + n.getX(0) * ups[0].x < 0) { const ix = g.getIndex()!; for (let i = 0; i < ix.count; i += 3) { const t = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, t); } g.computeVertexNormals(); }
  return { geo: g, folds, len: along };
}
// A box of sheet steel's gull wing lead, from a body's edge down to the pad.
function gull(add: (g: THREE.BufferGeometry, m: Mat, x?: THREE.Matrix4) => void, x: number, y: number, z0: number, zTop: number, dirX: number, dirY: number, len = 1.0, w = 0.3) {
  const a = Math.atan2(dirY, dirX), c = Math.cos(a), s = Math.sin(a);
  const seg = (d0: number, d1: number, za: number, zb: number) => {
    const m = new THREE.Matrix4().makeTranslation(x + (c * (d0 + d1)) / 2, y + (s * (d0 + d1)) / 2, (za + zb) / 2).multiply(new THREE.Matrix4().makeRotationZ(a)).multiply(new THREE.Matrix4().makeRotationY(Math.atan2(za - zb, d1 - d0)));
    add(bx(Math.hypot(d1 - d0, zb - za) + 0.1, w, 0.16), M.copper, m);
  };
  seg(0, len * 0.45, zTop, z0 + 0.08);
  seg(len * 0.45, len, z0 + 0.08, z0 + 0.08);
}

export async function buildScreen(): Promise<ScreenModel> {
  const root = new THREE.Group();
  root.scale.setScalar(0.001);
  const { art, pulse } = await screenArt();
  const u = shared(art, pulse);
  const rnd = seeded(2718);
  await pause();

  const parts: PartDef[] = [];
  const part = (d: Omit<PartDef, 'lo' | 'hi' | 'lift'> & { lift?: number }) => { parts.push({ lift: 0, ...d, lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] }); return parts.length - 1; };
  const list: THREE.BufferGeometry[] = [];
  let tris = 0;
  const color = new THREE.Color();
  const put = (i: number, geo: THREE.BufferGeometry, m: Mat, x?: THREE.Matrix4) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (x) g.applyMatrix4(x);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const n = g.getAttribute('position').count;
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    color.setHex(m.col);
    const look = new Float32Array(n * 4), feel = new Float32Array(n * 4), pa = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      look.set([color.r, color.g, color.b, m.vary ?? 0], k * 4);
      feel.set([m.rough, m.metal, m.brush ?? 0, m.sp ?? 0], k * 4);
      pa[k] = i;
    }
    g.setAttribute('look', new THREE.Float32BufferAttribute(look, 4));
    g.setAttribute('feel', new THREE.Float32BufferAttribute(feel, 4));
    g.setAttribute('part', new THREE.Float32BufferAttribute(pa, 1));
    g.computeBoundingBox();
    const bb = g.boundingBox!, pd = parts[i];
    for (let k = 0; k < 3; k++) { pd.lo[k] = Math.min(pd.lo[k], bb.min.getComponent(k)); pd.hi[k] = Math.max(pd.hi[k], bb.max.getComponent(k)); }
    list.push(g);
    tris += n / 3;
  };
  const adder = (i: number) => (g: THREE.BufferGeometry, m: Mat, x?: THREE.Matrix4) => put(i, g, m, x);

  // ---- the tray, the bezel's lip and the glass, cut into the tiles the panel is struck from ----
  const T = TRAY;
  const seeds: P2[] = [];
  {
    const nx = 4, ny = 3, sx = (T.x1 - T.x0) / nx, sy = (T.y1 - T.y0) / ny;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) seeds.push([T.x0 + (i + 0.5 + (rnd() - 0.5) * 0.6) * sx, T.y0 + (j + 0.5 + (rnd() - 0.5) * 0.6) * sy]);
  }
  const tileOf = (x: number, y: number) => { let best = 0, bd = Infinity; seeds.forEach((s, k) => { const d = Math.hypot(s[0] - x, s[1] - y); if (d < bd) { bd = d; best = k; } }); return best; };
  const tiles = seeds.map((s) => part({ kind: 'tile', c: [s[0], s[1], 0], r: 0 }));
  const tileMat: Mat[] = [];
  const triTo = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, want: THREE.Vector3, mat: Mat, key: number) => {
    const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    if (n.dot(want) < 0) { const t = b; b = c; c = t; n.negate(); }
    const k = tileOf((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3);
    const g = tileBuckets[k][key] ??= { pos: [], nrm: [] };
    g.pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    g.nrm.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
    tileMat[key] = mat;
  };
  const tileBuckets: Record<number, { pos: number[]; nrm: number[] }>[] = seeds.map(() => ({}));
  // The back: a grid of quads, its inner points nudged in the plane so the tiles' seams run ragged.
  {
    const c = T.cham, x0 = T.x0 + c, x1 = T.x1 - c, y0 = T.y0 + c, y1 = T.y1 - c, nx = 40, ny = 25;
    const P: THREE.Vector3[][] = [];
    for (let j = 0; j <= ny; j++) {
      P.push([]);
      for (let i = 0; i <= nx; i++) {
        const inner = i > 0 && i < nx && j > 0 && j < ny;
        P[j].push(new THREE.Vector3(x0 + ((x1 - x0) * i) / nx + (inner ? (rnd() - 0.5) * 4.4 : 0), y0 + ((y1 - y0) * j) / ny + (inner ? (rnd() - 0.5) * 4.4 : 0), 0));
      }
    }
    const up = new THREE.Vector3(0, 0, 1);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = P[j][i], b = P[j][i + 1], c2 = P[j + 1][i + 1], d = P[j + 1][i];
      if ((i + j) % 2) { triTo(a, b, c2, up, M.tray, 0); triTo(a, c2, d, up, M.tray, 0); } else { triTo(a, b, d, up, M.tray, 0); triTo(b, c2, d, up, M.tray, 0); }
    }
  }
  // A strip all round the outline from (offset o0, z0) to (offset o1, z1), the offset out from the tray's edge.
  const rim = (o0: number, z0: number, o1: number, z1: number, mat: Mat, key: number) => {
    const sides: [P2, P2, P2][] = [[[T.x0, T.y0], [T.x1, T.y0], [0, -1]], [[T.x1, T.y0], [T.x1, T.y1], [1, 0]], [[T.x1, T.y1], [T.x0, T.y1], [0, 1]], [[T.x0, T.y1], [T.x0, T.y0], [-1, 0]]];
    for (const [a, b, o] of sides) {
      const dir = new THREE.Vector2(b[0] - a[0], b[1] - a[1]).normalize();
      const ends = (off: number): [THREE.Vector2, THREE.Vector2] => [new THREE.Vector2(a[0] + o[0] * off - dir.x * off, a[1] + o[1] * off - dir.y * off), new THREE.Vector2(b[0] + o[0] * off + dir.x * off, b[1] + o[1] * off + dir.y * off)];
      const [p0, p1] = ends(o0), [q0, q1] = ends(o1);
      const n = Math.max(1, Math.ceil(p0.distanceTo(p1) / 8));
      const want = new THREE.Vector3(o[0] * -(z1 - z0), o[1] * -(z1 - z0), o1 - o0);
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n;
        const A = new THREE.Vector3().lerpVectors(new THREE.Vector3(p0.x, p0.y, z0), new THREE.Vector3(p1.x, p1.y, z0), t0);
        const B = new THREE.Vector3().lerpVectors(new THREE.Vector3(p0.x, p0.y, z0), new THREE.Vector3(p1.x, p1.y, z0), t1);
        const C2 = new THREE.Vector3().lerpVectors(new THREE.Vector3(q0.x, q0.y, z1), new THREE.Vector3(q1.x, q1.y, z1), t1);
        const D = new THREE.Vector3().lerpVectors(new THREE.Vector3(q0.x, q0.y, z1), new THREE.Vector3(q1.x, q1.y, z1), t0);
        triTo(A, B, C2, want, mat, key); triTo(A, C2, D, want, mat, key);
      }
    }
  };
  const gOut = GLASS.out;
  rim(-T.cham, 0, 0, -T.cham, M.tray, 0);
  rim(0, -T.cham, 0, T.z0, M.tray, 0);
  rim(0, BEZEL.z1, BEZEL.out, BEZEL.z1, M.bezel, 1);
  rim(BEZEL.out, BEZEL.z1, BEZEL.out, BEZEL.z0, M.bezel, 1);
  rim(0.04, BEZEL.z1 + 0.03, 0.62, BEZEL.z1 + 0.03, M.leak, 2);
  rim(BEZEL.out, GLASS.z1, gOut, GLASS.z1, M.glass, 3);
  rim(gOut, GLASS.z1, gOut, GLASS.z0, M.glass, 3);
  tileBuckets.forEach((byMat, k) => {
    for (const [key, g] of Object.entries(byMat)) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nrm, 3));
      put(tiles[k], geo, tileMat[Number(key)]);
    }
  });
  for (const i of tiles) { const p = parts[i]; p.c = [(p.lo[0] + p.hi[0]) / 2, (p.lo[1] + p.hi[1]) / 2, 0]; p.r = Math.hypot(p.hi[0] - p.lo[0], p.hi[1] - p.lo[1]) / 2; }
  await pause();

  // ---- the tray's pressed work: the plateau, its ribs, the label, the corner screws ----
  const screwHead = latheZ([[2.5, 0], [2.55, 0.3], [2.4, 0.8], [1.9, 1.2], [1.0, 1.4], [0, 1.45]], 20);
  const screw = (row: string, x: number, y: number, z: number, big = 1) => {
    const i = part({ kind: 'screw', c: [x, y, z + 0.7], r: 2.6 * big, row, lift: 9 });
    put(i, screwHead.clone(), M.screw, new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeScale(big, big, big)));
    put(i, star(0.95 * big), M.recess, at(x, y, z + 1.42 * big + 0.02, 0, 0, rnd() * Math.PI));
    return i;
  };
  {
    const P = PLATEAU;
    const i = part({ kind: 'thing', c: [(P.x0 + P.x1) / 2, 0, P.h], r: 80, row: 'tray', lift: 4 });
    put(i, plate(rounded(rrect((P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2, P.x1 - P.x0, P.y1 - P.y0, P.r)), [], -0.5, P.h, 0.7, 2), M.tray);
    for (const r of RIBS) {
      const j = part({ kind: 'thing', c: [(r.x0 + r.x1) / 2, r.y, r.z + 1], r: (r.x1 - r.x0) / 2, row: 'tray', lift: 5 });
      put(j, plate(rounded(rrect((r.x0 + r.x1) / 2, r.y, r.x1 - r.x0, r.w, r.w / 2 - 0.01)), [], r.z - 0.5, r.z + 1.2, 0.9, 2), M.tray);
    }
    const l = part({ kind: 'thing', c: [LABEL.c[0], LABEL.c[1], P.h + 0.1], r: 34, row: 'tray', lift: 6 });
    put(l, plate(rounded(rrect(LABEL.c[0], LABEL.c[1], LABEL.w, LABEL.h, 1.2)), [], P.h, P.h + 0.12, 0.03, 1), M.label);
    for (const [x, y] of CORNER_SCREWS) screw('tray', x, y, 0, 0.9);
    // Slots punched through the plateau, a row of them under the label.
    const v = part({ kind: 'thing', c: [108, 6, P.h], r: 40, row: 'tray', lift: 5 });
    for (let k = 0; k < 9; k++) put(v, plate(rounded(rrect(74 + k * 8.4, 6, 5.2, 2.2, 1.09)), [], P.h - 0.2, P.h + 0.03, 0.02, 1), M.recess);
  }
  await pause();

  // ---- the boards, each on its bosses, with its screws ----
  const boardPart: Record<string, number> = {};
  for (const b of BOARDS) {
    const i = part({ kind: 'board', c: [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, top(b)], r: Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2, lift: 12 });
    boardPart[b.name] = i;
    const holes = b.holes.map(([x, y]) => circle(x, y, b === DRIVER || b === BUTTON ? 1.2 : 1.7, 24));
    put(i, plate(rounded(rrect((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, b.x1 - b.x0, b.y1 - b.y0, 1.2)), holes, b.z, top(b), 0.14, 1), M.pcb);
    for (const [x, y] of b.holes) {
      const s = part({ kind: 'thing', c: [x, y, b.z / 2], r: 3, row: b.name, lift: 4 });
      put(s, cylZ(b === DRIVER || b === BUTTON ? 2.2 : 3.0, b.z, 6), M.steel, at(x, y, 0, 0, 0, Math.PI / 6));
      screw(b.name, x, y, top(b), b === DRIVER || b === BUTTON ? 0.72 : 1);
    }
  }
  await pause();

  // A part on a board: its parts are added with x and y on the board and z up from the board's top.
  const on = (b: Board, c: P2, r: number, lift = 16, row: string = b.name) => {
    const i = part({ kind: 'thing', c: [c[0], c[1], top(b) + r * 0.4], r, row, lift: lift + rnd() * 6 });
    const z0 = top(b);
    return { i, add: (g: THREE.BufferGeometry, m: Mat, x = new THREE.Matrix4()) => put(i, g, m, new THREE.Matrix4().makeTranslation(0, 0, z0).multiply(x)) };
  };
  const pins = (add: (g: THREE.BufferGeometry, m: Mat, x?: THREE.Matrix4) => void, pts: P2[], h: number, r = 0.32) => {
    for (const [x, y] of pts) add(cylZ(r, h, 8), M.copper, at(x, y, 0));
  };

  // ---- the power board ----
  {
    const b = POWER;
    // The input: a two pin housing at the struck edge, with its pins.
    {
      const { add } = on(b, PB.input, 6);
      const [x, y] = PB.input;
      add(rbox(7.4, 9.8, 9.6, 0.5, 1), M.plasticHi, at(x, y, 4.8));
      add(rbox(4.4, 3.6, 0.8, 0.2, 1), M.recess, at(x + 0.6, y - 2.1, 9.25));
      add(rbox(4.4, 3.6, 0.8, 0.2, 1), M.recess, at(x + 0.6, y + 2.1, 9.25));
      for (const s of [-1, 1]) add(bx(1.2, 1.2, 6), M.copper, at(x + 0.6, y + s * 2.1, 6.4));
      add(rbox(1.4, 9, 3.2, 0.3, 1), M.plastic, at(x - 3.9, y, 7.6));
    }
    // The fuse in its clips.
    {
      const { add } = on(b, PB.fuse, 11);
      const [x, y] = PB.fuse;
      const body = new THREE.CylinderGeometry(2.6, 2.6, 14, 28);
      add(body, M.ceramic, at(x, y, 6));
      for (const s of [-1, 1]) {
        const cap = new THREE.CylinderGeometry(2.85, 2.85, 4.4, 28);
        add(cap, M.copper, at(x, y + s * 8.6, 6));
        // Each clip: a bent strip round the cap, its two fingers and its foot.
        for (const e of [-1, 1]) add(bx(0.5, 3.4, 5.6), M.copper, at(x + e * 3.1, y + s * 8.6, 3.2, 0, e * 0.18, 0));
        add(bx(6.6, 3.4, 0.5), M.copper, at(x, y + s * 8.6, 0.25));
      }
    }
    // The X capacitor: a film box with its print.
    {
      const { add } = on(b, PB.xcap, 10);
      add(rbox(19, 9, 14, 0.8, 1), M.epoxy, at(PB.xcap[0], PB.xcap[1], 7));
    }
    // The choke: a ferrite ring lying flat, wound twice in copper, its four legs down.
    {
      const { add } = on(b, PB.choke, 13, 20);
      const [x, y] = PB.choke, R = 8.6, rt = 3.6, zc = rt + 1.2;
      add(new THREE.TorusGeometry(R, rt, 14, 44), { ...M.ferrite, sp: SPECIAL.none }, at(x, y, zc));
      for (const [a0, a1] of [[0.25, Math.PI - 0.25], [Math.PI + 0.25, Math.PI * 2 - 0.25]]) {
        const turns = 11;
        const rr = rt + 0.55;
        const curve = new Fn((t, out) => { const th = a0 + (a1 - a0) * t, ph = turns * Math.PI * 2 * t; return out.set(x + Math.cos(th) * (R + Math.cos(ph) * rr), y + Math.sin(th) * (R + Math.cos(ph) * rr), zc + Math.sin(ph) * rr); });
        add(new THREE.TubeGeometry(curve, turns * 14, 0.5, 4, false), M.wire);
      }
    }
    // The bridge: a flat block on edge, four legs.
    {
      const { add } = on(b, PB.bridge, 11);
      const [x, y] = PB.bridge;
      add(rbox(20, 3.6, 11, 0.4, 1), M.epoxy, at(x, y, 6.5));
      pins(add, [0, 1, 2, 3].map((k) => [x - 7.5 + k * 5, y] as P2), 1.2, 0.4);
    }
    // The capacitors: a dark shrink sleeve with a pale stripe, a crimp, and a copper top scored with its vent.
    const cap = (add: (g: THREE.BufferGeometry, m: Mat, x?: THREE.Matrix4) => void, x: number, y: number, R: number, H: number) => {
      const prof: [number, number][] = [[R - 0.5, 0], [R - 0.05, 0.25], [R, 0.6], [R, 1.6], [R - 0.38, 1.95], [R, 2.3], [R, H - 0.75], [R - 0.12, H - 0.42], [R - 0.38, H - 0.2], [R - 0.6, H - 0.18]];
      add(latheZ(prof, 30), M.sleeve, at(x, y, 0));
      add(latheZ(prof.slice(2, 7).map(([r, z]) => [r + 0.03, z] as [number, number]), 10, 4.41 - 0.26, 0.52), M.ink, at(x, y, 0));
      add(cylZ(R - 0.6, 0.4, 36), M.capTop, at(x, y, H - 0.55));
      add(cylZ(R - 0.3, 0.6, 36), M.rubber, at(x, y, -0.3));
    };
    {
      const { add } = on(b, PB.bulk, 13, 22);
      cap(add, PB.bulk[0], PB.bulk[1], 9, 25);
    }
    for (const [x, y, r, h] of PB.outs) { const { add } = on(b, [x, y], r + 3); cap(add, x, y, r, h); }
    // The transformer: tape wound bobbin between its flanges, the core's legs and yoke, its pins.
    {
      const { add } = on(b, PB.xfmr, 15, 22);
      const [x, y] = PB.xfmr;
      for (const z of [1.3, 18.2]) add(rbox(23, 20, 1.4, 0.4, 1), M.plastic, at(x, y, z));
      add(rbox(17, 15.4, 16.2, 3.2, 4), M.tape, at(x, y, 9.8));
      add(bx(17.4, 15.8, 0.6), M.copper, at(x, y, 4.4));
      for (const s of [-1, 1]) add(rbox(3.4, 13, 19.2, 0.35, 1), M.ferrite, at(x + s * 10.4, y, 10.2));
      add(rbox(24.2, 13, 3.4, 0.35, 1), M.ferrite, at(x, y, 20.4));
      add(bx(24.4, 0.5, 0.25), M.copper, at(x, y + 6.6, 22.0));
      add(bx(24.4, 0.5, 0.25), M.copper, at(x, y - 6.6, 22.0));
      pins(add, [-1, 1].flatMap((s) => [0, 1, 2, 3].map((k) => [x - 7.5 + k * 5, y + s * 10.6] as P2)), 1.6, 0.42);
      for (const s of [-1, 1]) add(bx(22, 2.2, 1.4), M.plastic, at(x, y + s * 10.6, 0.7));
    }
    // The heat sink, with its two packages bolted to it.
    {
      const { add } = on(b, PB.sink, 18, 22);
      const [x, y] = PB.sink;
      const prof: V[] = [[-1.1, 0, 0.2], [1.1, 0, 0.2], [1.1, 7.2, 0.2], [6.4, 7.6, 0.3], [6.4, 8.8, 0.3], [1.1, 9.0, 0.2], [1.1, 14.6, 0.2], [6.4, 15.0, 0.3], [6.4, 16.2, 0.3], [1.1, 16.4, 0.2], [1.1, 21.8, 0.2], [7.2, 22.2, 0.4], [7.2, 23.6, 0.4], [-1.1, 23.6, 0.3]];
      add(slabXZ(prof, 38), M.bronze, at(x, y, 0));
      for (const s of [-1, 1]) {
        const py = y + s * 9.5;
        add(rbox(4.6, 10.2, 15.4, 0.3, 1), M.epoxy, at(x - 3.4, py, 9.4));
        add(bx(1.3, 10.2, 6.2), M.copper, at(x - 1.75, py, 19.6));
        add(new THREE.CylinderGeometry(1.75, 1.75, 1.0, 20), M.screw, at(x - 1.9, py, 19.6, 0, 0, Math.PI / 2));
        add(new THREE.CylinderGeometry(2.6, 2.6, 1.2, 6), M.screw, at(x - 4.6, py, 19.6, 0, 0, Math.PI / 2));
        for (let k = -1; k <= 1; k++) add(bx(0.8, 0.5, 2.6), M.copper, at(x - 3.4, py + k * 2.54, 0.4));
        for (let k = -1; k <= 1; k++) add(bx(0.5, 0.5, 2.2), M.copper, at(x - 3.4, py + k * 2.54, 1.6));
      }
      add(bx(1.4, 30, 1.2), M.copper, at(x + 0.2, y, 0.4));
    }
    // The opto, as a small dip with its legs.
    {
      const { add } = on(b, PB.opto, 5);
      add(rbox(6.4, 4.6, 3.4, 0.3, 1), M.epoxy, at(PB.opto[0], PB.opto[1], 2.2));
      for (const s of [-1, 1]) for (const k of [-1, 1]) gull(add, PB.opto[0] + k * 1.27, PB.opto[1] + s * 2.3, 0.05, 2.0, 0, s, 1.0, 0.45);
    }
    // The connectors out: the harness's six pins and the pair's two, each in a keyed housing, and the plugs seated.
    {
      const { add } = on(b, PB.harness, 9);
      const [x, y] = PB.harness;
      add(rbox(6.4, 16, 6.4, 0.4, 1), M.plasticHi, at(x, y, 3.2));
      add(rbox(5.4, 15.4, 4.8, 0.4, 1), M.plastic, at(x, y + 0.3, 8.8));
      for (let k = 0; k < 4; k++) add(cylZ(0.75, 0.3, 12), M.copper, at(x, y - 3.75 + k * 2.5, 11.2));
    }
    {
      const { add } = on(b, PB.lamp, 5);
      const [x, y] = PB.lamp;
      add(rbox(6.0, 6.4, 5.4, 0.4, 1), M.plasticHi, at(x, y + 0.4, 2.7));
      add(rbox(4.8, 5.4, 3.0, 0.3, 1), M.plastic, at(x, y + 0.9, 6.6));
    }
  }
  await pause();

  // ---- the main board ----
  {
    const b = MAIN;
    // The scaler, its leads, and its heat sink with the pins that hold it.
    {
      const { add } = on(b, MB.scaler, 14, 18);
      const [x, y] = MB.scaler;
      add(rbox(16, 16, 1.6, 0.2, 1), M.epoxy, at(x, y, 0.9));
      for (let s = 0; s < 4; s++) for (let k = 0; k < 16; k++) {
        const a = -7.5 + k * 1.0;
        const [dx, dy] = s === 0 ? [a, -8] : s === 1 ? [8, a] : s === 2 ? [-a, 8] : [-8, -a];
        gull(add, x + dx, y + dy, 0.05, 0.9, s === 1 ? 1 : s === 3 ? -1 : 0, s === 0 ? -1 : s === 2 ? 1 : 0, 1.6, 0.28);
      }
      add(rbox(22, 22, 2.2, 0.3, 1), M.bronzeZ, at(x, y, 2.8));
      for (let k = 0; k < 10; k++) add(rbox(0.9, 22, 9.6, 0.2, 1), M.bronze, at(x - 10.3 + k * 2.29, y, 8.6));
      for (const [dx, dy] of [[-12.6, -12.6], [12.6, 12.6]]) {
        add(cylZ(1.1, 15, 12), M.copper, at(x + dx, y + dy, -1.6));
        add(cylZ(1.8, 0.8, 16), M.copper, at(x + dx, y + dy, 13.2));
        const spring = new Fn((t, out) => { const a = t * Math.PI * 2 * 6; return out.set(x + dx + Math.cos(a) * 1.7, y + dy + Math.sin(a) * 1.7, 4.4 + t * 8.4); });
        add(new THREE.TubeGeometry(spring, 72, 0.28, 4, false), M.steel);
      }
    }
    // The ports along the lower edge, opening down.
    for (const p of MB.ports) {
      const { add } = on(b, [p.x, -16], p.w / 2 + 3, 14);
      const yf = b.y0 - 2, depth = p.kind === 'usb' ? 14 : p.kind === 'jack' ? 14 : 11.4, yc = yf + depth / 2;
      if (p.kind === 'jack') {
        add(rbox(p.w, depth, 10.6, 0.5, 1), M.plasticHi, at(p.x, yc, 5.3));
        add(new THREE.CylinderGeometry(3.6, 3.6, 2.4, 32), M.plasticHi, at(p.x, yf - 0.6, 5.3));
        add(new THREE.CylinderGeometry(2.9, 2.9, 0.3, 32), M.recess, at(p.x, yf - 1.85, 5.3));
        add(new THREE.CylinderGeometry(0.95, 0.95, 1.2, 16), M.copper, at(p.x, yf - 1.6, 5.3));
        for (const k of [-1, 0, 1]) add(bx(2.4, 0.5, 3.8), M.copper, at(p.x + k * 3.2, yf + depth + 0.3, 2.4));
        continue;
      }
      const h = p.kind === 'usb' ? 5.8 : p.kind === 'dp' ? 5.4 : 5.9;
      add(rbox(p.w, depth, h, 0.45, 1), M.steel, at(p.x, yc, h / 2 + 0.05));
      add(bx(p.w - 1.6, 0.4, h - 1.6), M.recess, at(p.x, yf - 0.1, h / 2 + 0.05));
      add(bx(p.w - 4.4, 0.6, 1.4), M.plastic, at(p.x, yf + 0.2, h / 2 + 0.05));
      // Stamped work on the shell's top: a seam, dimples or windows, and the grounding springs at the mouth.
      add(bx(0.25, depth - 2, 0.06), M.recess, at(p.x + p.w * 0.12, yc + 0.6, h + 0.06));
      if (p.kind === 'usb') for (const s of [-1, 1]) add(bx(2.4, 3.2, 0.1), M.recess, at(p.x + s * 3.2, yf + 4.6, h + 0.06));
      else for (const s of [-1, 1]) { const d = new THREE.SphereGeometry(0.75, 10, 3, 0, Math.PI * 2, 0, Math.PI / 2); d.rotateX(Math.PI / 2); add(d, M.steel, at(p.x + s * p.w * 0.28, yf + 3.6, h + 0.05)); }
      for (const s of [-1, 0, 1]) add(bx(1.6, 2.6, 0.3), M.steel, at(p.x + s * p.w * 0.3, yf + 1.4, h + 0.18, 0.18, 0, 0));
      if (p.kind === 'dp') for (const s of [-1, 1]) add(bx(1.6, 1.2, 0.1), M.recess, at(p.x + s * 4.2, yf + 2.2, h + 0.06));
      for (const s of [-1, 1]) add(bx(0.5, 2.2, 2.4), M.steel, at(p.x + s * (p.w / 2 + 0.2), yc + 2, 0.6));
    }
    // The flex's connector at the top edge, with its latch bar, and the buttons' at the right edge.
    {
      const { add } = on(b, MB.ribbon, 10);
      const [x, y] = MB.ribbon;
      add(rbox(20.6, 5, 2.4, 0.3, 1), M.plastic, at(x, y, 1.2));
      add(rbox(19.4, 1.6, 0.9, 0.2, 1), M.plasticHi, at(x, y + 1.6, 2.6));
      for (const s of [-1, 1]) add(bx(1.6, 3.4, 1.6), M.steel, at(x + s * 11, y, 0.8));
    }
    {
      const { add } = on(b, MB.buttons, 5);
      const [x, y] = MB.buttons;
      add(rbox(4.2, 9.6, 2.2, 0.25, 1), M.plastic, at(x, y, 1.1));
      add(rbox(1.2, 9.0, 0.8, 0.2, 1), M.plasticHi, at(x + 1.3, y, 2.4));
    }
    {
      const { add } = on(b, MB.harness, 8);
      const [x, y] = MB.harness;
      add(rbox(6.4, 12, 6.4, 0.4, 1), M.plasticHi, at(x, y, 3.2));
      add(rbox(5.4, 11.4, 4.6, 0.4, 1), M.plastic, at(x, y, 8.6));
    }
    // The flash, the crystal, the memory, the two small capacitors and the two coils.
    {
      const { add } = on(b, MB.flash, 4);
      const [x, y] = MB.flash;
      add(rbox(5.0, 4.0, 1.5, 0.15, 1), M.epoxy, at(x, y, 0.95));
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) gull(add, x - 1.905 + k * 1.27, y + s * 2.0, 0.05, 0.8, 0, s, 1.0, 0.4);
    }
    {
      const { add } = on(b, MB.xtal, 4);
      const [x, y] = MB.xtal;
      add(rbox(11, 4.6, 0.6, 0.2, 1), M.plastic, at(x, y, 0.3));
      add(rbox(10.4, 4.0, 3.4, 1.6, 3), M.steel, at(x, y, 2.3));
    }
    {
      const { add } = on(b, MB.ram, 7);
      add(rbox(10.4, 10.4, 1.2, 0.15, 1), M.epoxy, at(MB.ram[0], MB.ram[1], 0.85));
    }
    for (const [x, y, r, h] of MB.caps) {
      const { add } = on(b, [x, y], r + 2);
      add(rbox(r * 2 + 0.6, r * 2 + 0.6, 1.0, 0.3, 1), M.plastic, at(x, y, 0.5));
      add(latheZ([[r - 0.2, 0], [r, 0.4], [r, h - 0.4], [r - 0.3, h - 0.15], [r - 0.6, h - 0.12]], 32), M.screw, at(x, y, 0.9));
      add(cylZ(r - 0.6, 0.15, 32), M.capTop, at(x, y, h + 0.7));
    }
    for (const [x, y] of MB.coils) {
      const { add } = on(b, [x, y], 5);
      add(rbox(6.2, 6.2, 3.6, 0.6, 1), M.ferrite, at(x, y, 1.8));
      add(new THREE.TorusGeometry(2.0, 0.42, 6, 24), M.wire, at(x, y, 3.65));
    }
  }
  await pause();

  // ---- the driver board: its connector, the timing chip, and the flex tabs over the top edge ----
  {
    const b = DRIVER;
    {
      const { add } = on(b, DB.ribbon, 10, 12);
      const [x, y] = DB.ribbon;
      add(rbox(20.6, 4.6, 2.2, 0.3, 1), M.plastic, at(x, y, 1.1));
      add(rbox(19.4, 1.4, 0.8, 0.2, 1), M.plasticHi, at(x, y - 1.6, 2.4));
    }
    {
      const { add } = on(b, DB.tcon, 5, 12);
      add(rbox(8, 8, 0.9, 0.1, 1), M.epoxy, at(DB.tcon[0], DB.tcon[1], 0.55));
    }
    // A flex tab: from its bond pads on the board, over the tray's top edge and down to the glass, with its chip on
    // the bend.
    const prof: [number, number][] = [[93.8, top(b) + 0.05], [96.6, top(b) + 0.1], [99.6, 1.6], [100.9, -0.6], [101.25, -3.5], [101.25, -8.2], [100.7, BEZEL.z1 + 0.1]];
    for (const x of DB.cofs) {
      const i = part({ kind: 'cable', c: [x, 100, -2], r: 12, row: 'driver', lift: 8 });
      const s = flexStrip(prof.map(([y, z]) => [x, y, z] as P3), COF.w, 26, (k) => { const a = prof[k], c = prof[k + 1]; const t = new THREE.Vector2(c[0] - a[0], c[1] - a[1]).normalize(); return new THREE.Vector3(0, t.y, -t.x).multiplyScalar(-1); }, 0.8);
      put(i, s.geo, flex(CABLE_ID.cof));
      put(i, rbox(COF.chip[0], COF.chip[2], COF.chip[1], 0.15, 1), M.epoxy, at(x, 101.25 + COF.chip[2] / 2, -5.6));
    }
  }
  // ---- the button board: its keys along the lower edge, the standby light, its connector ----
  {
    const b = BUTTON;
    {
      const { add } = on(b, [BB.keys[1], -93], 10, 10);
      for (const x of BB.keys) {
        add(rbox(5.2, 5.2, 3.2, 0.3, 1), M.steel, at(x, -92.6, 1.6));
        add(cylZ(1.6, 0.5, 20), M.plasticHi, at(x, -92.6, 3.2));
        add(rbox(2.6, 2.6, 2.6, 0.5, 1), M.plastic, at(x, -96.4, 1.6));
      }
    }
    {
      const { add } = on(b, BB.led, 2, 6);
      add(rbox(1.8, 1.2, 0.8, 0.15, 1), M.led, at(BB.led[0], BB.led[1], 0.4));
      for (const s of [-1, 1]) add(bx(0.4, 1.2, 0.7), M.copper, at(BB.led[0] + s * 1.0, BB.led[1], 0.35));
    }
    {
      const { add } = on(b, BB.ribbon, 5, 8);
      add(rbox(4.0, 8.6, 1.8, 0.25, 1), M.plastic, at(BB.ribbon[0], BB.ribbon[1], 0.9));
      add(rbox(1.0, 8.0, 0.7, 0.2, 1), M.plasticHi, at(BB.ribbon[0] - 1.2, BB.ribbon[1], 2.0));
    }
  }
  // ---- the small parts on every board, one part a run ----
  {
    const byRun = new Map<number, number>();
    for (const p of smalls()) {
      let i = byRun.get(p.run);
      if (i === undefined) { i = part({ kind: 'thing', c: [p.x, p.y, top(p.b) + 0.5], r: 6, row: p.b.name, lift: 10 + rnd() * 6 }); byRun.set(p.run, i); }
      const [l, w, h] = SMALL_SIZE[p.kind];
      const z0 = top(p.b);
      const rz = p.turn ? Math.PI / 2 : 0;
      if (p.kind === 'sot') {
        put(i, rbox(l, w, h, 0.1, 1), M.epoxy, at(p.x, p.y, z0 + 0.15 + h / 2));
        for (const s of [-1, 1]) put(i, bx(0.4, 0.9, 0.16), M.copper, at(p.x + s * 0.95, p.y - 1.0, z0 + 0.08));
        put(i, bx(0.4, 0.9, 0.16), M.copper, at(p.x, p.y + 1.0, z0 + 0.08));
        continue;
      }
      const res = p.kind.endsWith('r');
      // The terminations are one copper box the whole length, the body standing a hair proud of it between them.
      put(i, bx(l, w * 0.98, h * 0.98), M.copper, at(p.x, p.y, z0 + h / 2 + 0.01, 0, 0, rz));
      put(i, bx(l * 0.64, w * 1.02, h * 1.03), res ? M.epoxy : M.ceramic, at(p.x, p.y, z0 + h / 2 + 0.02, 0, 0, rz));
    }
  }
  await pause();

  // ---- the cables ----
  const tape = (i: number, x: number, y: number, z: number, w: number, turn: number) => {
    put(i, rbox(w + 5, 11, 0.2, 0.08, 1), M.tape, at(x, y, z + 0.2, 0, 0, turn));
    put(i, rbox(4.5, 3.2, 0.2, 0.08, 1), M.tape, at(x + Math.cos(turn) * (w / 2 + 4.2), y + Math.sin(turn) * (w / 2 + 4.2), z + 0.75, 0, -0.32, turn));
  };
  {
    const i = part({ kind: 'cable', c: [0, 63, 2], r: 40, path: RIBBON.path, lift: 10 });
    const s = flexStrip(RIBBON.path, RIBBON.w, 30);
    put(i, s.geo, flex(CABLE_ID.ribbon));
    for (const f of s.folds) put(i, new THREE.CylinderGeometry(0.32, 0.32, f.l, 8), M.film, new THREE.Matrix4().compose(f.p.clone().add(new THREE.Vector3(0, 0, 0.12)), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.d), new THREE.Vector3(1, 1, 1)));
    tape(i, RIBBON.tape[0], RIBBON.tape[1], 1.2, RIBBON.w, Math.PI / 2);
  }
  {
    const i = part({ kind: 'cable', c: [80, -50, 1], r: 50, path: THIN.path, lift: 8 });
    const s = flexStrip(THIN.path, THIN.w, 12);
    put(i, s.geo, flex(CABLE_ID.thin));
    for (const f of s.folds) put(i, new THREE.CylinderGeometry(0.26, 0.26, f.l, 8), M.film, new THREE.Matrix4().compose(f.p.clone().add(new THREE.Vector3(0, 0, 0.1)), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.d), new THREE.Vector3(1, 1, 1)));
    tape(i, THIN.tape[0], THIN.tape[1], 0.9, THIN.w, 0);
  }
  {
    const i = part({ kind: 'cable', c: [-110, 60, 2], r: 45, path: PAIR.path, lift: 10 });
    const base = bent(PAIR.path, 6);
    const len = base.getLength();
    for (const [ph, m] of [[0, M.rubber], [Math.PI, M.cream]] as [number, Mat][]) put(i, wireAlong(new Helix(base, len, PAIR.r * 1.02, PAIR.pitch, ph), len, PAIR.r, 170), lead(CABLE_ID.pair, m.col));
    const [ex, ey] = [PAIR.path[PAIR.path.length - 1][0], PAIR.path[PAIR.path.length - 1][1]];
    put(i, rbox(4.4, 6.4, 3.6, 0.4, 1), M.plastic, at(ex - 1.6, ey, 1.8));
    put(i, rbox(3.2, 5.0, 2.6, 0.4, 1), M.plasticHi, at(ex + 1.6, ey, 1.6));
    put(i, rbox(5.4, 7.0, 4.6, 0.4, 1), M.plastic, at(PAIR.path[0][0], PAIR.path[0][1] - 1.4, 9.6));
    tape(i, PAIR.tape[0], PAIR.tape[1], 1.3, 3, Math.PI / 2);
  }
  {
    const i = part({ kind: 'cable', c: [-56, -30, 5], r: 32, path: HARNESS.path, lift: 10 });
    const base = bent(HARNESS.path, 7);
    const len = base.getLength();
    const cols = [M.rubber, M.cream, M.rubber, M.copper];
    for (let k = 0; k < HARNESS.n; k++) {
      const side = (k - (HARNESS.n - 1) / 2) * HARNESS.r * 2.15;
      put(i, wireAlong(new Helix(base, len, 0.12, 30, k * 1.7, side), len, HARNESS.r, 64), lead(CABLE_ID.harness, k === 3 ? shade('bronze', 0.55) : cols[k].col));
    }
    const mid = base.getPointAt(HARNESS.tie), tan = base.getTangentAt(HARNESS.tie);
    put(i, rbox(HARNESS.n * HARNESS.r * 2.2 + 1.2, 2.4, HARNESS.r * 2 + 1.0, 0.5, 1), M.plastic, new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan), new THREE.Vector3(1, 1, 1)));
    put(i, rbox(2.2, 3.0, 2.4, 0.4, 1), M.plastic, new THREE.Matrix4().compose(mid.clone().add(new THREE.Vector3(HARNESS.n * HARNESS.r * 1.1 + 1.6, 0, 0)), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
  }
  await pause();

  // ---- the stand: the plate on the tray, the hinge standing off it, the neck cut off under it ----
  {
    const i = part({ kind: 'stand', c: [VESA.c[0], VESA.c[1], 1], r: 46, row: 'stand', lift: 6 });
    const [cx, cy] = VESA.c;
    put(i, plate(rounded(rrect(cx, cy, VESA.w, VESA.h, 5)), VESA.screws.map(([x, y]) => circle(x, y, 2.4, 16)), 0, VESA.t, 0.5, 1), M.steelDark);
    put(i, plate(rounded(rrect(cx, cy + 4, VESA.w - 22, VESA.h - 26, 4)), [], VESA.t - 0.4, VESA.t + 0.8, 0.6, 1), M.steelDark);
    for (const [x, y] of VESA.screws) screw('stand', x, y, VESA.t - 0.2, 1.15);
  }
  {
    const i = part({ kind: 'stand', c: [0, HINGE.y, HINGE.z], r: 40, row: 'stand', lift: 8 });
    const H = HINGE;
    // The two cheeks, each a plate standing off the stand's plate, carrying the barrel.
    const cheek: V[] = [[-2.4, -92, 0.6], [-2.4, -56, 0.6], [-6, -64, 2], [-H.z - 6.5, -74, 4], [-H.z - 6.5, -86, 4], [-8, -92, 1]];
    for (const s of [-1, 1]) {
      const g = plate(rounded(cheek), [circle(-H.z, H.y, 3.0, 16)], -H.cheek[0] / 2, H.cheek[0] / 2, 0.4, 1);
      g.rotateY(Math.PI / 2);
      put(i, g, M.steelDark, at(s * (H.half + H.cheek[0] / 2 + 0.4), 0, 0));
    }
    const barrel = new THREE.CylinderGeometry(H.r, H.r, H.half * 2, 32);
    put(i, barrel, { ...M.steelDark, brush: BRUSH.x }, at(0, H.y, H.z, 0, 0, Math.PI / 2));
    for (const s of [-1, 1]) {
      put(i, new THREE.CylinderGeometry(H.r + 0.6, H.r + 0.6, 1.2, 40), M.bronze, at(s * (H.half + H.cheek[0] + 1.4), H.y, H.z, 0, 0, Math.PI / 2));
      put(i, new THREE.CylinderGeometry(2.6, 2.6, 0.9, 32), M.screw, at(s * (H.half + H.cheek[0] + 2.4), H.y, H.z, 0, 0, Math.PI / 2));
    }
    put(i, new THREE.CylinderGeometry(3.4, 3.4, 2.4, 6), M.screw, at(H.half + H.cheek[0] + 3.8, H.y, H.z, 0, 0, Math.PI / 2));
    for (let k = 0; k < 4; k++) put(i, new THREE.CylinderGeometry(H.r + 0.9, H.r + 0.9, 0.5, 28), k % 2 ? M.steel : M.copper, at(-(H.half - 1.2 - k * 0.6), H.y, H.z, 0, 0, Math.PI / 2));
    // The neck: a collar round the barrel's middle and the bar down from it, cut square.
    put(i, new THREE.CylinderGeometry(H.r + 2.2, H.r + 2.2, NECK.w - 12, 32), M.steelDark, at(0, H.y, H.z, 0, 0, Math.PI / 2));
    const neck: V[] = [[-NECK.w / 2, NECK.y0, 0.15], [NECK.w / 2, NECK.y0, 0.15], [NECK.w / 2, NECK.y1 - 3, 3], [-NECK.w / 2, NECK.y1 - 3, 3]];
    put(i, plate(rounded(neck), [], H.z - NECK.t / 2, H.z + NECK.t / 2, 1.4, 2), { ...M.steelDark, brush: BRUSH.y });
    put(i, bx(NECK.w - 2.8, 0.3, NECK.t - 2.8), M.screw, at(0, NECK.y0 + 0.1, H.z));
  }
  await pause();

  // ---- one mesh ----
  const geo = mergeGeometries(list, false)!;
  for (const g of list) g.dispose();
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, solidMaterial(u));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.customDepthMaterial = depthMaterial(u);
  mesh.matrixAutoUpdate = false;
  root.add(mesh);

  // The front's light past the rim, on a sheet just in front of the glass.
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(TRAY.x1 - TRAY.x0 + 80, TRAY.y1 - TRAY.y0 + 80), spillMaterial(u));
  spill.position.z = GLASS.z0 - 0.4;
  spill.renderOrder = 2;
  spill.frustumCulled = false;
  spill.userData.noWire = true;
  spill.userData.noAO = true;
  root.add(spill);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(140, 80), shadowMaterial(u));
  {
    const g = shadow.geometry;
    g.rotateX(-Math.PI / 2);
    g.translate(0, NECK.y0 - 0.2, HINGE.z);
    (shadow.material as THREE.ShaderMaterial).uniforms.uC = { value: new THREE.Vector2(0, HINGE.z) };
    (shadow.material as THREE.ShaderMaterial).uniforms.uR = { value: new THREE.Vector2(34, 16) };
    shadow.frustumCulled = false;
    shadow.renderOrder = -1;
    shadow.userData.noWire = true;
    root.add(shadow);
  }
  return { root, parts, u, mesh, spill, shadow, tris };
}

// A profile in the (x, z) plane, extruded along y by len, centered on y = 0: a heat sink's section.
function slabXZ(prof: V[], len: number): THREE.BufferGeometry {
  let g = slab(rounded(prof), [], -len / 2, len / 2, 0.15, 1);
  // The slab lies in (x, y) and runs along z: swap y and z, which turns it inside out, so each face is wound back.
  g = g.index ? g.toNonIndexed() : g;
  g.applyMatrix4(new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  const p = g.getAttribute('position'), n = g.getAttribute('normal');
  for (let i = 0; i < p.count; i += 3) for (const a of [p, n]) { const x = a.getX(i + 1), y = a.getY(i + 1), z = a.getZ(i + 1); a.setXYZ(i + 1, a.getX(i + 2), a.getY(i + 2), a.getZ(i + 2)); a.setXYZ(i + 2, x, y, z); }
  return g;
}
