import * as THREE from 'three';
import { Builder, slice } from '../../../../world/build';
import {
  BEACON, BLADE, CORE, CORNICE, CROWN, TILT, DECK, DOME, GATES, LINE, NEEDLE, NEEDLE_RINGS, PIER, PIERS, PYLON, RIB, SINK, SQ, STEPS, SUN, TERRACE, TERRACE_TOP, TIERS,
  coreA, coreCorner, pierOut, pierTh, swell, terraceR, type Hoop,
} from './form';
import type { Handle, LightName, SolidName } from './materials';

type Of = Record<SolidName | LightName, Handle>;
const D2R = Math.PI / 180;
type P2 = [number, number];

// Two builders, one for the large forms that cast shadows and one for the fine parts that do not, and each piece's
// kind written on its vertices so one material can tell what it is made of.
class Parts {
  private cast = new Builder();
  private fine = new Builder();
  get tris() { return this.cast.tris + this.fine.tris; }
  add(geo: THREE.BufferGeometry, h: Handle, m?: THREE.Matrix4, shadow?: boolean): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) cell[i * 4] = h.kind;
    g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    const casts = shadow ?? h.cast;
    (casts ? this.cast : this.fine).add(g, h.mat, m, { shadow: casts });
  }
  async build(parent: THREE.Object3D, name: string): Promise<THREE.Mesh[]> {
    return [...(await this.cast.buildInSlices(parent, name)), ...(await this.fine.buildInSlices(parent, `${name}-fine`))];
  }
}

// A turned profile of [radius, height], cut into runs at its sharp corners so each turned edge keeps a crisp line of
// light.
function turn(b: Parts, pts: P2[], h: Handle, seg: number, crease = 30, shadow?: boolean): void {
  const runs: P2[][] = [[pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    runs[runs.length - 1].push(pts[i]);
    if (i < pts.length - 1) {
      const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), c = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
      let d = Math.abs(a - c) / D2R;
      if (d > 180) d = 360 - d;
      if (d > crease) runs.push([pts[i]]);
    }
  }
  for (const r of runs) if (r.length > 1) b.add(new THREE.LatheGeometry(r.map(([x, y]) => new THREE.Vector2(Math.max(x, 1e-4), y)), seg), h, undefined, shadow);
}

// A ring of the crown: a closed section d deep and h tall, turned round the axis and tipped forward by TILT. Its
// outer face is three rolled beads with a groove between each, so polished it holds three lines of light with dark
// between them, its top a flat walk, and its underside falls dark.
const tilt = new THREE.Matrix4().makeRotationX(TILT * D2R);
function ringMatrix(o: Hoop): THREE.Matrix4 {
  return new THREE.Matrix4().makeTranslation(0, o.y, 0).multiply(tilt);
}
function ringAt(o: Hoop, r: number, deg: number, up = 0): THREE.Vector3 {
  return polar(r, deg, up).applyMatrix4(ringMatrix(o));
}
function hoop(b: Parts, o: Hoop, h: Handle, seg: number): void {
  const pts: THREE.Vector2[] = [], n = 22;
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 - (i / n) * Math.PI * 2; pts.push(new THREE.Vector2(o.r + o.d * Math.cos(a), o.h * Math.sin(a))); }
  b.add(new THREE.LatheGeometry(pts, seg), h, ringMatrix(o));
}

// A fin standing out from the axis at a bearing: at each height, how far in and out it reaches and how thick it is,
// with its four long edges rounded to radius c, so each holds a line of light that slides along it as the light moves.
interface Station { y: number; rin: number; rout: number; th: number }
function rounded(bearing: number, st: Station[], c0 = 0.55, arc = 3): THREE.BufferGeometry[] {
  const b = bearing * D2R, s = Math.sin(b), co = Math.cos(b);
  const at = (u: number, v: number, y: number): [number, number, number] => [u * s + v * co, y, u * co - v * s];
  const ring = (q: Station): P2[] => {
    const h = q.th / 2, c = Math.max(0.05, Math.min(c0, h * 0.8, (q.rout - q.rin) * 0.4)), out: P2[] = [];
    const corners: [number, number, number][] = [[q.rout - c, -h + c, -90], [q.rout - c, h - c, 0], [q.rin + c, h - c, 90], [q.rin + c, -h + c, 180]];
    for (const [cu, cv, a0] of corners) for (let i = 0; i < arc; i++) { const a = (a0 + (90 * i) / (arc - 1)) * D2R; out.push([cu + Math.cos(a) * c, cv + Math.sin(a) * c]); }
    return out;
  };
  const n = 4 * arc, pos: number[] = [], idx: number[] = [];
  for (const q of st) for (const [u, v] of ring(q)) pos.push(...at(u, v, q.y));
  for (let j = 0; j < st.length - 1; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, c = j * n + ((i + 1) % n);
    idx.push(a, c, a + n, c, c + n, a + n);
  }
  const side = new THREE.BufferGeometry();
  side.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  side.setIndex(idx);
  side.computeVertexNormals();
  const cap: number[] = [], cidx: number[] = [];
  for (const [q, up] of [[st[0], -1], [st[st.length - 1], 1]] as [Station, number][]) {
    const base = cap.length / 3;
    for (const [u, v] of ring(q)) cap.push(...at(u, v, q.y));
    for (let i = 1; i < n - 1; i++) up > 0 ? cidx.push(base, base + i + 1, base + i) : cidx.push(base, base + i, base + i + 1);
  }
  const caps = new THREE.BufferGeometry();
  caps.setAttribute('position', new THREE.Float32BufferAttribute(cap, 3));
  caps.setIndex(cidx);
  caps.computeVertexNormals();
  return [side, caps];
}

// A convex prism through horizontal sections of the same number of points, each side a hard edged face, capped.
// Faces are turned outward whatever order the points were given in.
function prism(st: { y: number; pts: P2[] }[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const N = new THREE.Vector3(), E = new THREE.Vector3(), F = new THREE.Vector3();
  const mid = (pts: P2[]): P2 => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, out: THREE.Vector3) => {
    N.crossVectors(E.subVectors(b, a), F.subVectors(c, a));
    if (N.dot(out) < 0) pos.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
    else pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  const O = new THREE.Vector3();
  for (let j = 0; j < st.length - 1; j++) {
    const p = st[j], q = st[j + 1], n = p.pts.length, m0 = mid(p.pts), m1 = mid(q.pts);
    for (let i = 0; i < n; i++) {
      const k = (i + 1) % n;
      const A = new THREE.Vector3(p.pts[i][0], p.y, p.pts[i][1]), B = new THREE.Vector3(p.pts[k][0], p.y, p.pts[k][1]);
      const C = new THREE.Vector3(q.pts[k][0], q.y, q.pts[k][1]), D = new THREE.Vector3(q.pts[i][0], q.y, q.pts[i][1]);
      O.set((A.x + B.x + C.x + D.x) / 4 - (m0[0] + m1[0]) / 2, 0, (A.z + B.z + C.z + D.z) / 4 - (m0[1] + m1[1]) / 2);
      tri(A, B, C, O);
      tri(A, C, D, O);
    }
  }
  for (const [s, up] of [[st[0], -1], [st[st.length - 1], 1]] as [{ y: number; pts: P2[] }, number][]) {
    O.set(0, up, 0);
    for (let i = 1; i < s.pts.length - 1; i++) tri(new THREE.Vector3(s.pts[0][0], s.y, s.pts[0][1]), new THREE.Vector3(s.pts[i][0], s.y, s.pts[i][1]), new THREE.Vector3(s.pts[i + 1][0], s.y, s.pts[i + 1][1]), O);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// A rectangle in a gate's own frame (x across its face, n out from the axis) with its corners cut by c, in the
// city's x and z.
function rect(g: number, x0: number, x1: number, n0: number, n1: number, c: number): P2[] {
  const s = Math.sin(g * D2R), co = Math.cos(g * D2R);
  const w = (x: number, n: number): P2 => [x * co + n * s, -x * s + n * co];
  return [w(x0 + c, n0), w(x1 - c, n0), w(x1, n0 + c), w(x1, n1 - c), w(x1 - c, n1), w(x0 + c, n1), w(x0, n1 - c), w(x0, n0 + c)];
}
const grow = (pts: P2[], k: number): P2[] => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, z]) => { const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1; return [x + (dx / l) * k, z + (dz / l) * k] as P2; });
};

// A loft of the rounded square through sections of [height, face distance], of power n.
function superLoft(st: P2[], n: number, seg = 96): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  for (const [y, R] of st) for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2, r = R * swell(a, n); pos.push(Math.sin(a) * r, y, Math.cos(a) * r); }
  const W = seg + 1;
  for (let j = 0; j < st.length - 1; j++) for (let i = 0; i < seg; i++) {
    const a = j * W + i, up = st[j + 1][0] > st[j][0] || (st[j + 1][0] === st[j][0] && st[j + 1][1] < st[j][1]);
    if (up) idx.push(a, a + 1, a + W, a + 1, a + W + 1, a + W); else idx.push(a, a + W, a + 1, a + 1, a + W, a + W + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A bar between two points, its section w across and d deep.
function bar(a: THREE.Vector3, c: THREE.Vector3, w: number, d: number): THREE.BufferGeometry {
  const dir = new THREE.Vector3().subVectors(c, a), len = dir.length();
  const g = new THREE.BoxGeometry(w, len, d);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, c).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
}
const polar = (r: number, deg: number, y: number) => new THREE.Vector3(Math.sin(deg * D2R) * r, y, Math.cos(deg * D2R) * r);

// The blade's outer edge, by a smooth curve through its points: n stations along it, as [distance, height], and the
// distance at a height.
const bladeCurve = new THREE.SplineCurve(BLADE.line.map(([y, r]) => new THREE.Vector2(r, y)));
function bladeAt(n: number): P2[] {
  return bladeCurve.getSpacedPoints(n).map((p) => [p.x, p.y] as P2);
}
const bladeLine = bladeAt(400);
function bladeEdge(y: number): number {
  let best = bladeLine[0];
  for (const p of bladeLine) if (Math.abs(p[1] - y) < Math.abs(best[1] - y)) best = p;
  return best[0];
}

export interface SpireModel { group: THREE.Group; tris: number; meshes: THREE.Mesh[] }

export async function buildSpire(of: Of): Promise<SpireModel> {
  const b = new Parts(), group = new THREE.Group();
  const blinks: THREE.Vector3[] = [];

  // The courses the terrace stands on, then the battered terrace, its gilded gorge cornice, and its roof.
  {
    let y0 = -SINK;
    for (const [r, top] of STEPS) {
      b.add(superLoft([[y0, r], [top - 0.25, r], [top, r - 0.25]], SQ), of.base);
      b.add(superLoft([[top, r - 0.25], [top, r - 2.5]], SQ), of.base);
      y0 = top - 0.5;
    }
    const st: P2[] = [];
    for (let i = 0; i <= 4; i++) { const y = TERRACE.from - 0.3 + ((TERRACE.top - TERRACE.from + 0.3) * i) / 4; st.push([y, terraceR(y)]); }
    b.add(superLoft(st, SQ), of.stone);
    const R = TERRACE.r1, c = TERRACE.cornice, prof: P2[] = [[0, 0], [0.3, 0.35], [0.6, 0.48], [0.9, 0.35], [1.05, 0.22]];
    for (let i = 1; i <= 6; i++) { const t = i / 6; prof.push([1.05 + (c - 1.6) * Math.sin((t * Math.PI) / 2), 0.22 + (TERRACE.lip - 0.22) * (1 - Math.cos((t * Math.PI) / 2))]); }
    prof.push([c, TERRACE.lip], [c, TERRACE.lip - 0.35]);
    b.add(superLoft(prof.map(([dy, k]) => [TERRACE.top + dy, R + k]), SQ), of.gold);
    b.add(superLoft([[TERRACE_TOP, R + TERRACE.lip - 0.35], [TERRACE_TOP, coreA(TERRACE_TOP) * 0.8]], SQ), of.base);
  }
  await slice();

  // The pylon gates: two battered towers either side of a door, a lintel between them, a gorge cornice on each tower,
  // and a winged sun disc on the lintel.
  {
    const P = PYLON, foot = -SINK, at = (y: number, a: number, c: number) => a + ((c - a) * (y - foot)) / (P.top - foot);
    const face = (y: number) => at(y, P.face0, P.face1), half = (y: number) => at(y, P.half0, P.half1);
    const body = P.top - P.cornice;
    for (const g of GATES) {
      for (const side of [-1, 1]) {
        const tower = (y: number) => side > 0 ? rect(g, P.door, half(y), P.back, face(y), 0.45) : rect(g, -half(y), -P.door, P.back, face(y), 0.45);
        b.add(prism([{ y: foot, pts: tower(foot) }, { y: body, pts: tower(body) }]), of.stone);
        const cs: { y: number; pts: P2[] }[] = [];
        for (const [dy, k] of [[0, 0.02], [0.22, 0.24], [0.5, 0.3], [0.75, 0.42], [1.05, 0.62], [1.4, 0.9], [1.7, 1.05], [P.cornice, 1.05]] as P2[]) cs.push({ y: body + dy, pts: grow(tower(body), k) });
        b.add(prism(cs), of.gold);
        b.add(prism([{ y: P.top, pts: grow(tower(body), 0.6) }, { y: P.top + 0.35, pts: grow(tower(body), 0.2) }]), of.base);
        const tx = side * (P.door + half(P.top)) / 2, tn = face(P.top) - 2;
        blinks.push(new THREE.Vector3(tx * Math.cos(g * D2R) + tn * Math.sin(g * D2R), P.top + 0.9, -tx * Math.sin(g * D2R) + tn * Math.cos(g * D2R)));
      }
      b.add(prism([{ y: P.lintel[0], pts: rect(g, -P.door - 0.1, P.door + 0.1, P.back, face(P.lintel[0]) - 1.4, 0.25) }, { y: P.lintel[1], pts: rect(g, -P.door - 0.1, P.door + 0.1, P.back, face(P.lintel[1]) - 1.4, 0.25) }]), of.stone);
      const turnTo = new THREE.Matrix4().makeRotationY(g * D2R);
      const door = new THREE.PlaneGeometry(2 * P.door, P.lintel[0] - 0.2).translate(0, P.lintel[0] / 2 + 0.1, P.recess);
      b.add(door, of.door, turnTo);
      // The door's reveal: the deep sides and head of the opening, in the dark stone.
      for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.3, P.lintel[0], face(P.lintel[0]) - P.recess).translate(s * (P.door - 0.15), P.lintel[0] / 2, (face(P.lintel[0]) + P.recess) / 2), of.base, turnTo, false);
      // A threshold down to the plaza.
      b.add(new THREE.BoxGeometry(2 * P.door + 3, SINK, 6).translate(0, -SINK / 2, face(0) + 1), of.base, turnTo);
      // The winged sun disc.
      const sy = (P.lintel[0] + P.lintel[1]) / 2, sn = face(sy) - 1.4 + 0.3;
      b.add(new THREE.CylinderGeometry(1.6, 1.6, 0.6, 28).rotateX(Math.PI / 2).translate(0, sy, sn), of.gold, turnTo);
      for (const s of [-1, 1]) for (const [i, len] of [[0, 5.4], [1, 4.2], [2, 3]] as P2[]) {
        const w = new THREE.BoxGeometry(len, 0.55, 0.36).translate((s * len) / 2, 0, 0).rotateZ(s * (0.07 + 0.05 * i)).translate(s * 1.5, sy + 0.65 - i * 0.65, sn - 0.05);
        b.add(w, of.gold, turnTo, false);
      }
    }
  }
  await slice();

  // The core: three tiers of glass, each under a gilded gorge cornice and stepping in from the one under it, with a
  // stone rib up the middle of each face, and over the third the gallery's band of lit glass.
  for (let k = 0; k < TIERS.length; k++) {
    const t = TIERS[k], last = k === TIERS.length - 1, top = last ? DECK.sill : t.to;
    const st: P2[] = [];
    const own = (y: number) => t.a0 + (t.a1 - t.a0) * Math.min(1, Math.max(0, (y - t.from) / (t.to - t.from)));
    for (let i = 0; i <= 6; i++) { const y = t.from - 0.5 + ((top - t.from + 0.5) * i) / 6; st.push([y, own(y)]); }
    b.add(superLoft(st, CORE.n), of.glass);
    if (last) {
      b.add(superLoft([[DECK.sill - 0.6, t.a1 + 0.9], [DECK.sill, t.a1 + 0.9], [DECK.sill, t.a1 - 0.2]], CORE.n), of.gold);
      b.add(superLoft([[DECK.sill, t.a1 - 0.4], [DECK.roof, t.a1 - 0.4]], CORE.n), of.gallery);
      for (let i = 0; i < 32; i++) { const a = (i / 32) * 360, r = (t.a1 - 0.2) * swell(a * D2R, CORE.n); b.add(bar(polar(r, a, DECK.sill), polar(r, a, DECK.roof), 0.8, 0.8), of.bronze, undefined, false); }
    }
    // The cornice: a roll, a hollow flaring out to its lip, a fillet, then the roof of the step back to the next tier.
    const R = last ? t.a1 - 0.4 : t.a1, y0 = last ? DECK.roof : t.to, c = CORNICE.tall, prof: P2[] = [[0, 0], [0.3, 0.4], [0.6, 0.55], [0.9, 0.4], [1.05, 0.25]];
    for (let i = 1; i <= 6; i++) { const q = i / 6; prof.push([1.05 + (c - 1.6) * Math.sin((q * Math.PI) / 2), 0.25 + (CORNICE.lip - 0.25) * (1 - Math.cos((q * Math.PI) / 2))]); }
    prof.push([c, CORNICE.lip], [c, CORNICE.lip - 0.4]);
    b.add(superLoft(prof.map(([dy, kk]) => [y0 + dy, R + kk]), CORE.n), last ? of.copper : of.gold);
    const next = last ? 6 : TIERS[k + 1].a0 - 0.5;
    b.add(superLoft([[y0 + c, R + CORNICE.lip - 0.4], [y0 + c, next]], CORE.n), of.base);
  }
  // Bronze mullion fins up each face of the core, two to a face either side of its rib.
  for (const g of GATES) for (const t of TIERS) for (const side of [-1, 1]) {
    const face = (y: number, k: number) => { const a = coreA(y), u = side * a * k; return new THREE.Vector3(u, y, (a ** CORE.n - Math.abs(u) ** CORE.n) ** (1 / CORE.n) + 0.35).applyAxisAngle(new THREE.Vector3(0, 1, 0), g * D2R); };
    for (const k of [0.36, 0.7]) b.add(bar(face(t.from, k), face(t.to, k), 0.9, 1.1), of.bronze, undefined, false);
  }
  {
    for (const g of GATES) for (const t of TIERS) {
      const ys: number[] = [];
      for (let y = t.from; y < t.to; y += 8) ys.push(y);
      ys.push(t.to);
      const w = (y: number) => RIB.w0 + (RIB.w1 - RIB.w0) * Math.min(1, (y - CORE.from) / (CORE.to - CORE.from));
      for (const geo of rounded(g, ys.map((y) => ({ y, rin: coreA(y) - 1.5, rout: coreA(y) + RIB.proud, th: w(y) })), 0.5)) b.add(geo, g === 0 ? of.jet : of.stone);
    }
  }
  await slice();

  // The piers: each springs from the terrace's corner, flares in, and climbs the tiers on its own taper. Over the core
  // it goes on as a blade of bronze, with a gilded edge, that swells round the sun and closes over it.
  {
    const ys: number[] = [];
    for (let y = PIER.from; y < PIER.knee; y += 4) ys.push(y);
    for (let y = PIER.knee; y < PIER.top; y += 10) ys.push(y);
    ys.push(PIER.top);
    for (const a of PIERS) for (const geo of rounded(a, ys.map((y) => ({ y, rin: coreCorner(y) * 0.7, rout: pierOut(y), th: pierTh(y) })), 1.4, 5)) b.add(geo, of.bronze);
    // On each pier: a gilded band where each tier's cornice meets it, and a channel up its corner lit as a window to
    // each two storeys.
    for (const a of PIERS) {
      for (const t of TIERS.slice(0, -1)) {
        const y = t.to + CORNICE.tall / 2;
        for (const geo of rounded(a, [{ y: y - CORNICE.tall / 2, rin: coreCorner(y) * 0.7, rout: pierOut(y) + 0.7, th: pierTh(y) + 1.0 }, { y: y + CORNICE.tall / 2, rin: coreCorner(y) * 0.7, rout: pierOut(y) + 0.7, th: pierTh(y) + 1.0 }], 0.45)) b.add(geo, of.gold);
      }
    }
    const line = bladeAt(26);
    const at = (y: number, ab: [number, number][]) => {
      for (let i = 1; i < ab.length; i++) if (y <= ab[i][0]) { const k = (y - ab[i - 1][0]) / (ab[i][0] - ab[i - 1][0]); return ab[i - 1][1] + (ab[i][1] - ab[i - 1][1]) * Math.max(0, k); }
      return ab[ab.length - 1][1];
    };
    for (const a of PIERS) {
      for (const geo of rounded(a, line.map(([r, y]) => ({ y, rin: Math.max(r - at(y, BLADE.deep), 2), rout: r, th: at(y, BLADE.th) })), 1.1, 5)) b.add(geo, of.copper);
      for (const geo of rounded(a, line.slice(1).map(([r, y]) => ({ y, rin: r - 0.7, rout: r + 0.45, th: at(y, BLADE.th) * 0.42 })), 0.3, 3)) b.add(geo, of.gold);
      // The collar where the stone pier becomes the bronze blade.
      const y = PIER.top;
      for (const geo of rounded(a, [{ y: y - 1.6, rin: coreCorner(y) * 0.7, rout: pierOut(y) + 0.8, th: pierTh(y) + 1.2 }, { y: y + 1.6, rin: coreCorner(y) * 0.7, rout: pierOut(y) + 0.8, th: pierTh(y) + 1.2 }], 0.45)) b.add(geo, of.gold);
    }
  }
  await slice();

  // The line of light up the front rib, in a channel between two gilded lips.
  {
    const ys: number[] = [];
    for (let y = LINE.from; y < LINE.to; y += 6) ys.push(y);
    ys.push(LINE.to);
    const runs: number[][] = [];
    let run: number[] = [];
    for (const y of ys) {
      const cut = TIERS.slice(0, -1).some((t) => y > t.to - 0.5 && y < t.to + CORNICE.tall + 0.5);
      if (cut) { if (run.length > 1) runs.push(run); run = []; } else run.push(y);
    }
    if (run.length > 1) runs.push(run);
    for (const t of TIERS.slice(0, -1)) for (const r of runs) { if (r[r.length - 1] < t.to && r[r.length - 1] > t.to - 6.5) r.push(t.to); if (r[0] > t.to && r[0] < t.to + CORNICE.tall + 6.5) r.unshift(t.to + CORNICE.tall); }
    const z = (y: number) => coreA(y) + RIB.proud + 0.04;
    for (const ys2 of runs) {
      const pos: number[] = [], idx: number[] = [];
      ys2.forEach((y, j) => {
        pos.push(-LINE.half, y, z(y), LINE.half, y, z(y));
        if (j > 0) { const a = (j - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      });
      const strip = new THREE.BufferGeometry();
      strip.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      strip.setIndex(idx);
      strip.computeVertexNormals();
      b.add(strip, of.line, undefined, false);
      for (const s of [-1, 1]) {
        const x0 = s * (LINE.half + 0.05), x1 = s * (LINE.half + 0.5);
        b.add(prism(ys2.map((y) => { const q = z(y) - 0.04; return { y, pts: [[x0, q - 0.1], [x1, q - 0.1], [x1, q + 0.35], [x0, q + 0.35]] as P2[] }; })), of.gold, undefined, false);
      }
    }
  }
  await slice();

  // The crown: a low dome of copper over the gallery, the sun on a gilded neck, and the three rings binding the blades,
  // each fixed to every blade by a gilded clamp, lamps round its rim.
  {
    const dome: P2[] = [];
    const d0 = TIERS[2].a1 + CORNICE.lip - 1.2;
    for (let i = 0; i <= 8; i++) { const t = i / 8; dome.push([Math.max(d0 * Math.cos((t * Math.PI) / 2) ** 0.7, 7), DOME.from + (DOME.to - DOME.from) * Math.sin((t * Math.PI) / 2)]); }
    turn(b, dome, of.copper, 96, 60);
    turn(b, [[3, DOME.to - 1], [9, DOME.to - 0.4], [9, DOME.to + 1.2], [6.5, SUN.y - SUN.r + 2.2], [3, SUN.y - SUN.r + 3.6]], of.gold, 96, 40);
    b.add(new THREE.SphereGeometry(SUN.r, 48, 30).translate(0, SUN.y, 0), of.sun);
    for (const o of CROWN) {
      hoop(b, o, of.gold, 104);
      for (let i = 0; i < o.lights; i++) b.add(new THREE.OctahedronGeometry(1.15).scale(1, 0.75, 1).applyMatrix4(new THREE.Matrix4().setPosition(ringAt(o, o.r + o.d + 0.3, (i + 0.5) * (360 / o.lights), -o.h * 0.35))), of.stud, undefined, false);
      for (const a of PIERS) {
        const p = ringAt(o, o.r - o.d * 0.6, a), edge = bladeEdge(p.y);
        b.add(bar(polar(edge - 1, a, p.y), p, o.h * 1.6, 2.4), of.gold);
      }
    }
  }
  await slice();

  // The needle and its gilded rings, the beacon's lens, and the spike.
  turn(b, NEEDLE, of.gold, 48);
  for (const r of NEEDLE_RINGS) turn(b, [[r.r - 1.0, r.y - r.h / 2], [r.r, r.y - r.h / 2 + 0.25], [r.r, r.y + r.h / 2 - 0.25], [r.r - 1.0, r.y + r.h / 2]], of.gold, 48);
  const lens: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) { const k = i / 10; lens.push(new THREE.Vector2(0.9 + (BEACON.r - 0.9) * Math.sin(k * Math.PI) ** 0.6, BEACON.from + (BEACON.to - BEACON.from) * k)); }
  b.add(new THREE.LatheGeometry(lens, 24), of.beacon, undefined, false);
  turn(b, [[0.9, BEACON.to], [0.02, BEACON.tip]], of.gold, 16);

  for (const p of blinks) b.add(new THREE.OctahedronGeometry(0.8).translate(p.x, p.y, p.z), of.blink, undefined, false);
  await slice();

  const tris = b.tris, meshes = await b.build(group, 'spire');
  return { group, tris, meshes };
}
