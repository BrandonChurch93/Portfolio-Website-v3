import * as THREE from 'three';
import { PI, type Adds, rbox } from './kit';
import type { Look } from './look';

// Sleeved power runs, brought over from the PC Builder (src/world/cables.ts): a path through corners each rounded to a
// radius, frames carried along it without twist, a wire for every pin at its place in the rows, the plug's housing at
// the board end and combs that hold the rows apart.

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export { v };

export function filletPath(points: THREE.Vector3[], radius: number, straight = 12): THREE.Vector3[] {
  const out: THREE.Vector3[] = [points[0].clone()];
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1], p1 = points[i], p2 = points[i + 1];
    const a = p0.clone().sub(p1), b = p2.clone().sub(p1);
    const la = a.length(), lb = b.length();
    if (la < 1e-6 || lb < 1e-6) continue;
    a.normalize(); b.normalize();
    const theta = Math.acos(Math.min(0.9999, Math.max(-0.9999, a.dot(b))));
    if (PI - theta < 0.01) { out.push(p1.clone()); continue; }
    const limA = i - 1 === 0 ? la - straight : la * 0.5, limB = i + 1 === points.length - 1 ? lb - 4 : lb * 0.5;
    const t = Math.max(0.5, Math.min(radius / Math.tan(theta / 2), limA, limB));
    const s = p1.clone().addScaledVector(a, t), e = p1.clone().addScaledVector(b, t);
    const r = t * Math.tan(theta / 2);
    const center = p1.clone().addScaledVector(a.clone().add(b).normalize(), r / Math.sin(theta / 2));
    const u0 = s.clone().sub(center), u1 = e.clone().sub(center);
    const ang = u0.angleTo(u1), n = Math.max(2, Math.ceil((ang * r) / 3));
    const axis = new THREE.Vector3().crossVectors(u0, u1).normalize();
    for (let k = 0; k <= n; k++) out.push(center.clone().add(u0.clone().applyAxisAngle(axis, (ang * k) / n)));
  }
  out.push(points[points.length - 1].clone());
  const dense: THREE.Vector3[] = [out[0]];
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i], n = Math.max(1, Math.ceil(a.distanceTo(b) / 8));
    for (let k = 1; k <= n; k++) dense.push(a.clone().lerp(b, k / n));
  }
  return dense;
}

export interface Run { path: THREE.Vector3[]; rows: number; cols: number; pitch: number; wire: number; rowAxis: THREE.Vector3; combs?: number[] }

export function run(b: Adds, L: Look, r: Run): void {
  const P = r.path, n = P.length;
  const T = P.map((_, i) => P[Math.min(n - 1, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize());
  const N: THREE.Vector3[] = [], B: THREE.Vector3[] = [];
  let nn = r.rowAxis.clone();
  for (let i = 0; i < n; i++) {
    nn = nn.addScaledVector(T[i], -nn.dot(T[i])).normalize();
    N.push(nn.clone()); B.push(new THREE.Vector3().crossVectors(T[i], nn).normalize());
  }
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + P[i].distanceTo(P[i - 1]));
  for (let ri = 0; ri < r.rows; ri++) for (let ci = 0; ci < r.cols; ci++) {
    const ox = (ri - (r.rows - 1) / 2) * r.pitch, oy = (ci - (r.cols - 1) / 2) * r.pitch;
    const pts = P.map((p, i) => p.clone().addScaledVector(N[i], ox).addScaledVector(B[i], oy));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    const len = curve.getLength();
    const g = new THREE.TubeGeometry(curve, Math.max(8, Math.round(len / 7)), r.wire, 4, false);
    const uv = g.getAttribute('uv');
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * len, uv.getY(k) * r.wire * 2 * PI);
    b.add(g, L.sleeve);
  }
  // The plug at the start, and the combs along the run.
  const at = (s: number) => { let i = 0; while (i < n - 2 && cum[i + 1] < s) i++; return i; };
  const frame = (i: number, p: THREE.Vector3) => new THREE.Matrix4().makeBasis(N[i], B[i], T[i]).setPosition(p);
  const pw = r.rows * r.pitch + 2.4, ph = r.cols * r.pitch + 2.4;
  b.add(rbox(pw, ph, 10, 0.6, 2), L.plastic, frame(0, P[0].clone().addScaledVector(T[0], 4)));
  for (const s of r.combs ?? []) {
    const i = at(s), p = P[i];
    // The comb is a band the wires pass through: its holes are finer than the page can show.
    b.add(rbox(pw + 1.2, ph + 1.2, 3, Math.min(pw, ph) / 2 - 0.1, 1), L.sink, frame(i, p));
  }
}
