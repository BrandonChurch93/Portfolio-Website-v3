import * as THREE from 'three';
import { rbox } from '../../../../world/build';
import { COUNT, DPI, GAP, I, SEAM, SPLIT, TAIL, THUMB, WHEEL, section, spineAt, zAt, type V2 } from './shape';

// What each surface is. One material draws them all, and each vertex carries its kind in the fourth number of its
// cell attribute.
export const KIND = { shell: 0, button: 1, palm: 2, side: 3, skirt: 4, chamfer: 5, gap: 6, led: 7, copper: 8, tread: 9, thumb: 10, dpi: 11, bevel: 12 } as const;

// The band between section points k and k + 1, round the whole length, and its kind.
const LOWER = [KIND.skirt, KIND.led, KIND.skirt, KIND.gap, KIND.chamfer, KIND.side, KIND.gap, KIND.bevel];
const UPPER_BUTTON = [KIND.button, KIND.gap, KIND.gap];

type Sec = { pts: V2[]; z: number[] };

// The first number of the cell attribute is how far across its band a vertex lies, 0 or 1: the skirt reads it to
// darken under the lip.
function kinded(g: THREE.BufferGeometry, kind: number, across?: (i: number) => number): THREE.BufferGeometry {
  const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { cell[i * 4 + 3] = kind; cell[i * 4] = across ? across(i) : 0; }
  g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  return g;
}

// A normal that came out as nothing, where a band runs to a point, would be a NaN in the shader and black out the
// canvas: it takes the way the band faces next to it, or up.
function guard(g: THREE.BufferGeometry): void {
  const n = g.getAttribute('normal');
  for (let i = 0; i < n.count; i++) {
    if (Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) > 0.5) continue;
    let found = false;
    for (const j of [i - 2, i + 2, i - 1, i + 1]) {
      if (j < 0 || j >= n.count || Math.hypot(n.getX(j), n.getY(j), n.getZ(j)) < 0.5) continue;
      n.setXYZ(i, n.getX(j), n.getY(j), n.getZ(j)); found = true; break;
    }
    if (!found) n.setXYZ(i, 0, 1, 0);
  }
}

// One band, a strip two points across and one row per station, for one side (+1 right, -1 left). Its normals are
// smooth along the length and its own across, so where two bands meet there is a hard crease.
function strip(secs: Sec[], k: number, side: number, kind: number): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  for (const s of secs) for (const j of [k, k + 1]) pos.push(side * s.pts[j][0], s.pts[j][1], s.z[j]);
  for (let i = 0; i < secs.length - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    if (side > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  guard(g);
  return kinded(g, kind, (i) => i % 2);
}

// Triangles with each its own flat normal, turned to face the way asked.
function flat(tris: THREE.Vector3[][], kind: number, face: (n: THREE.Vector3, p: THREE.Vector3) => number): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [];
  for (let [a, b, c] of tris) {
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    if (n.lengthSq() < 1e-8) continue;
    n.normalize();
    if (face(n, a.clone().add(b).add(c).divideScalar(3)) < 0) { [b, c] = [c, b]; n.negate(); }
    for (const p of [a, b, c]) { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return kinded(g, kind);
}

const P = (s: Sec, j: number, side: number, dy = 0) => new THREE.Vector3(side * s.pts[j][0], s.pts[j][1] + dy, s.z[j]);

// Places along the length: even on the straight run, and even round the arc of the tail.
function stations(t0: number, t1: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    // Closer together at the nose, where the foot is drawn in.
    out.push(t0 + (t1 - t0) * (t0 === 0 ? s * s * 0.35 + s * 0.65 : s));
  }
  return out;
}
function tail(t0: number, nRun: number, nArc: number): number[] {
  const out = stations(t0, TAIL, nRun);
  for (let i = 1; i <= nArc; i++) out.push(TAIL + (1 - TAIL) * Math.sin((i / nArc) * Math.PI / 2));
  return out;
}

// How wide the dark recess round a thumb button is, in millimetres.
const RECESS = 0.7;

// One of the thumb's buttons: a pad standing proud of the graphite side facet on the left, its top inset from its
// foot so its edge is a bevel that catches light.
function thumb(t0: number, t1: number, h: number): THREE.BufferGeometry[] {
  const [v0, v1] = THUMB.across, n = 8, bev = 0.7;
  const foot: Sec[] = [], top: Sec[] = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + (t1 - t0) * (i / n), s = section(t, true, -1);
    const [a, b] = [s.pts[I.trim], s.pts[I.facet]], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    const nx = dy / l, ny = -dx / l;
    const at = (v: number, out: number): V2 => [a[0] + dx * v + nx * out, a[1] + dy * v + ny * out];
    const z = (v: number) => s.z[I.trim] + (s.z[I.facet] - s.z[I.trim]) * v;
    const e = (i === 0 || i === n) ? bev / l : 0;
    foot.push({ pts: [at(v0, -0.3), at(v1, -0.3)], z: [z(v0), z(v1)] });
    top.push({ pts: [at(v0 + bev / l + e, h), at(v1 - bev / l - e, h)], z: [z(v0), z(v1)] });
  }
  const ends = 0.6;
  top[0].z = top[0].z.map((z) => z + ends);
  top[n].z = top[n].z.map((z) => z - ends);
  const out = [strip(top, 0, -1, KIND.thumb)];
  // The recess it stands in: a dark gap round its foot.
  const well: Sec[] = foot.map((f, i) => {
    const s = section(t0 + (t1 - t0) * (i / n), true, -1);
    const [a, b] = [s.pts[I.trim], s.pts[I.facet]], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l, nx = uy, ny = -ux;
    const lift = (p: V2, along: number): V2 => [p[0] + ux * along + nx * 0.36, p[1] + uy * along + ny * 0.36];
    return { pts: [lift(f.pts[0], -RECESS), lift(f.pts[0], 0.05), lift(f.pts[1], -0.05), lift(f.pts[1], RECESS)], z: [f.z[0], f.z[0], f.z[1], f.z[1]] };
  });
  well[0].z = [well[0].z[0] - RECESS, well[0].z[1], well[0].z[2], well[0].z[3] - RECESS];
  well[n].z = [well[n].z[0] + RECESS, well[n].z[1], well[n].z[2], well[n].z[3] + RECESS];
  out.push(strip(well, 0, -1, KIND.gap), strip(well, 2, -1, KIND.gap));
  const ring: THREE.Vector3[][] = [];
  const W = (s: Sec, j: number) => new THREE.Vector3(-s.pts[j][0], s.pts[j][1], s.z[j]);
  for (const s of [well[0], well[n]]) ring.push([W(s, 0), W(s, 3), W(s, 1)], [W(s, 3), W(s, 2), W(s, 1)]);
  out.push(flat(ring, KIND.gap, (nn) => nn.x * -1 + 0.01));
  const tris: THREE.Vector3[][] = [];
  const Q = (s: Sec, j: number) => new THREE.Vector3(-s.pts[j][0], s.pts[j][1], s.z[j]);
  for (let i = 0; i < n; i++) for (const j of [0, 1]) {
    tris.push([Q(foot[i], j), Q(foot[i + 1], j), Q(top[i], j)], [Q(foot[i + 1], j), Q(top[i + 1], j), Q(top[i], j)]);
  }
  for (const i of [0, n]) tris.push([Q(foot[i], 0), Q(foot[i], 1), Q(top[i], 0)], [Q(foot[i], 1), Q(top[i], 1), Q(top[i], 0)]);
  const c = new THREE.Vector3();
  for (const s of foot) for (const j of [0, 1]) c.add(Q(s, j));
  c.divideScalar(foot.length * 2);
  const inward = c.clone().setX(c.x + 6);
  out.push(flat(tris, KIND.thumb, (nn, p) => nn.dot(p.clone().sub(inward))));
  return out;
}

export interface MouseGeometry {
  solid: THREE.BufferGeometry[];
  // The foot's outline on the mat, round the whole mouse.
  foot: V2[];
  axle: number;
  wheelZ: number;
}

export function mouseGeometry(): MouseGeometry {
  const solid: THREE.BufferGeometry[] = [];
  const tAll = tail(0, 56, 18), tButtons = stations(0, SPLIT, 30), tPalm = tail(SPLIT + GAP, 26, 18);
  for (const side of [1, -1]) {
    const all = tAll.map((t) => section(t, t < SPLIT + GAP / 2, side));
    const buttons = tButtons.map((t) => section(t, true, side));
    const palm = tPalm.map((t) => section(t, false, side));
    LOWER.forEach((kind, k) => solid.push(strip(all, k, side, kind)));
    UPPER_BUTTON.forEach((kind, i) => solid.push(strip(buttons, I.edge + i, side, kind)));
    // The seam between the buttons and the palm: each drops into it by a wall, over a floor.
    const bEnd = buttons[buttons.length - 1], pStart = palm[0];
    const tris: THREE.Vector3[][] = [];
    for (let j = I.edge; j < I.floor; j++) {
      const a = P(bEnd, j, side), b = P(bEnd, j + 1, side), a2 = P(bEnd, j, side, -SEAM.depth), b2 = P(bEnd, j + 1, side, -SEAM.depth);
      tris.push([a, b, a2], [b, b2, a2]);
      const c = P(pStart, j, side), d = P(pStart, j + 1, side), c2 = P(pStart, j, side, -SEAM.depth), d2 = P(pStart, j + 1, side, -SEAM.depth);
      tris.push([c, d, c2], [d, d2, c2]);
      tris.push([a2, b2, c2], [b2, d2, c2]);
    }
    const zs = (zAt(SPLIT) + zAt(SPLIT + GAP)) / 2;
    solid.push(flat(tris, KIND.gap, (n, p) => (Math.abs(n.y) > 0.9 ? n.y : n.z * (zs - p.z))));
  }
  // The palm's top, one surface across its spine from seam to seam.
  {
    const R = tPalm.map((t) => section(t, false, 1)), L = tPalm.map((t) => section(t, false, -1));
    const pos: number[] = [], idx: number[] = [];
    const e = I.edge, m = I.top;
    R.forEach((r, i) => pos.push(r.pts[e][0], r.pts[e][1], r.z[e], 0, r.pts[m][1], r.z[m], -L[i].pts[e][0], L[i].pts[e][1], L[i].z[e]));
    for (let i = 0; i < R.length - 1; i++) for (let c = 0; c < 2; c++) {
      const a = i * 3 + c, b = a + 1, d = a + 3, e = a + 4;
      idx.push(a, b, d, b, e, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    guard(g);
    solid.push(kinded(g, KIND.palm));
  }
  // The button behind the wheel, standing in the seam.
  {
    const z = zAt(DPI.t), slope = (spineAt(DPI.t + 0.01) - spineAt(DPI.t - 0.01)) / (zAt(DPI.t + 0.01) - zAt(DPI.t - 0.01));
    const g = rbox(DPI.w, DPI.h, DPI.l, 1.2, 3);
    g.rotateX(-Math.atan(slope));
    g.translate(0, spineAt(DPI.t) + DPI.proud - DPI.h / 2, z);
    solid.push(kinded(g, KIND.dpi));
  }
  for (const [t0, t1] of THUMB.runs) solid.push(...thumb(t0, t1, THUMB.proud));
  // The nose: the front section closed, from a point inside it.
  const nose = section(0, true), noseL = section(0, true, -1);
  const ring: THREE.Vector3[] = [];
  for (let j = 0; j < COUNT; j++) ring.push(P(nose, j, 1));
  for (let j = COUNT - 1; j >= 0; j--) ring.push(P(noseL, j, -1));
  const mid = new THREE.Vector3(0, 9, ring.reduce((s, p) => s + p.z, 0) / ring.length + 1.5);
  const fan: THREE.Vector3[][] = [];
  for (let i = 0; i < ring.length; i++) fan.push([mid, ring[i], ring[(i + 1) % ring.length]]);
  solid.push(flat(fan, KIND.shell, (n) => -n.z));
  // The wheel: a ribbed tread between two copper hubs, standing proud of its slot.
  const axle = spineAt(WHEEL.t) + WHEEL.proud - WHEEL.r, wheelZ = zAt(WHEEL.t);
  const r = WHEEL.r, hw = WHEEL.w / 2, tw = WHEEL.w * 0.3;
  const lathe = (pts: V2[], kind: number) => {
    const g = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 48);
    g.rotateZ(Math.PI / 2);
    g.translate(0, axle, wheelZ);
    return kinded(g, kind);
  };
  solid.push(lathe([[0.01, -hw], [r - 1.4, -hw], [r - 0.5, -hw + 0.6], [r - 0.35, -tw]], KIND.copper));
  solid.push(lathe([[r - 0.35, tw], [r - 0.5, hw - 0.6], [r - 1.4, hw], [0.01, hw]], KIND.copper));
  solid.push(lathe([[r - 0.35, -tw], [r, -tw + 0.4], [r, tw - 0.4], [r - 0.35, tw]], KIND.tread));
  const foot: V2[] = [];
  for (const t of tAll) { const q = section(t, true, 1); foot.push([q.pts[I.ledLow][0], q.z[I.ledLow]]); }
  for (const t of [...tAll].reverse()) { const q = section(t, true, -1); foot.push([-q.pts[I.ledLow][0], q.z[I.ledLow]]); }
  return { solid, foot, axle, wheelZ };
}
