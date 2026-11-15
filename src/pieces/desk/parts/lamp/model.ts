import * as THREE from 'three';
import { Builder, cyl } from '../../../../world/build';
import {
  ARM_DIR, ARM_LEN, AXIS, BULB, CAP, CROWN, ELBOW, ELBOW_PIN, ELBOW_Y, FLANK, FOOT, KNUCKLE, RIM, SADDLE_S, SHADE_N, SHADE_PIN,
  SHELL, SKIN, TOWARD, TURN, V, normalAt, onShade,
} from './form';
import type { Handle, MetalName, OtherName } from './materials';

// The lamp, built in the desk's millimetres and merged per material: the turned foot with its switch, the stem, the
// elbow's knuckle with its counterweight, the arm, the knuckle on the shade's flank, the spun shade with its rolled
// rim and vented cap, and the cords.

const UP = V(0, 1, 0);
// The radii of the stem and the arm: thick enough to read as a clear line at the page's size.
const STEM_R = 8.4, ARM_R = 7.2;
type Of = Record<MetalName | OtherName | 'glow', Handle>;

// Two builders, one for the large forms that cast shadows and one for the fine parts that do not, and each piece's
// kind written on its vertices so one material can tell the metals apart.
class Parts {
  private cast = new Builder();
  private fine = new Builder();
  get tris() { return this.cast.tris + this.fine.tris; }
  add(geo: THREE.BufferGeometry, h: Handle, m?: THREE.Matrix4, o: { shadow?: boolean } = {}): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) cell[i * 4] = h.kind;
    g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    const casts = o.shadow ?? h.cast;
    (casts ? this.cast : this.fine).add(g, h.mat, m, { shadow: casts });
  }
  build(parent: THREE.Object3D): THREE.Mesh[] {
    return [...this.cast.build(parent, 'lamp'), ...this.fine.build(parent, 'lamp-fine')];
  }
}

// A turned profile, [radius, height] in order up the part, cut into runs at its sharp corners so each turned edge
// keeps a crisp line of light.
function turn(pts: [number, number][], seg = 96, crease = 34): THREE.BufferGeometry[] {
  const runs: [number, number][][] = [[pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    const cur = runs[runs.length - 1];
    cur.push(pts[i]);
    if (i < pts.length - 1) {
      const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), b = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
      let d = Math.abs(a - b) * (180 / Math.PI);
      if (d > 180) d = 360 - d;
      if (d > crease) runs.push([pts[i]]);
    }
  }
  return runs.filter((r) => r.length > 1).map((r) => new THREE.LatheGeometry(r.map(([x, y]) => new THREE.Vector2(Math.max(x, 0.0001), y)), seg));
}

// A frame whose y axis is `y` and whose z axis is as near `z` as it can be.
function frame(at: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3): THREE.Matrix4 {
  const Y = y.clone().normalize(), Z = z.clone().addScaledVector(Y, -z.dot(Y)).normalize(), X = Y.clone().cross(Z);
  return new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(at);
}
const anyPerp = (v: THREE.Vector3) => (Math.abs(v.y) < 0.9 ? UP.clone().cross(v) : V(1, 0, 0).cross(v)).normalize();
const along = (at: THREE.Vector3, dir: THREE.Vector3) => frame(at, dir, anyPerp(dir));

// Segments round a turned part follow its size, so a small one is not cut finer than it can be seen.
function addTurn(b: Parts, pts: [number, number][], mat: Handle, m: THREE.Matrix4, seg = 96, o: { shadow?: boolean } = {}): void {
  const r = Math.max(...pts.map((p) => p[0]));
  for (const g of turn(pts, Math.min(seg, Math.max(20, Math.round(r * 3))))) b.add(g, mat, m, o);
}

// A rod between two points.
function rod(b: Parts, a: THREE.Vector3, c: THREE.Vector3, r: number, mat: Handle, seg = 24): void {
  const d = c.clone().sub(a), len = d.length();
  b.add(cyl(r, len, seg, r, true), mat, along(a.clone().addScaledVector(d, 0.5), d));
}

// A tube along a smooth path, its uv along it counted in braid pitches.
function cordTube(b: Parts, pts: THREE.Vector3[], r: number, mat: Handle, pitch = 4.2): void {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const len = curve.getLength(), g = new THREE.TubeGeometry(curve, Math.max(20, Math.round(len / 5)), r, 8, false);
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / pitch));
  b.add(g, mat);
}

// An ear of a knuckle: a disc round the bolt with a tab running down to what carries it. Drawn in its own plane, y
// up from the tab, then laid in place.
function ear(re: number, ld: number, hw: number, t: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-hw, -ld);
  s.lineTo(hw, -ld);
  s.lineTo(re, 0);
  s.absarc(0, 0, re, 0, Math.PI, false);
  s.lineTo(-hw, -ld);
  const bev = Math.min(0.6, t * 0.18);
  const g = new THREE.ExtrudeGeometry(s, { depth: t - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 12 });
  g.translate(0, 0, -(t - bev * 2) / 2);
  return g;
}

// A wing nut, its bolt along +y from y = 0.
function wingNut(b: Parts, mat: Handle, bolt: Handle, m: THREE.Matrix4, spin: number): void {
  addTurn(b, [[2.7, 0], [5.0, 0], [5.3, 0.5], [5.3, 5.2], [4.7, 5.9], [2.7, 6.1]], mat, m, 40);
  addTurn(b, [[0.01, 6.0], [2.6, 6.0], [2.6, 7.0], [2.1, 7.6], [0.01, 7.7]], bolt, m, 24);
  const s = new THREE.Shape();
  s.moveTo(4.2, 0.6);
  s.lineTo(8, 0.9);
  s.quadraticCurveTo(14.6, 1.8, 15.0, 7.6);
  s.quadraticCurveTo(15.0, 11.2, 11.6, 11.0);
  s.quadraticCurveTo(7.2, 10.2, 4.2, 6.2);
  s.lineTo(4.2, 0.6);
  const wing = new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: true, bevelThickness: 0.45, bevelSize: 0.45, bevelSegments: 1, curveSegments: 8 });
  wing.translate(0, 0, -0.5);
  for (const side of [0, Math.PI]) b.add(wing, mat, m.clone().multiply(new THREE.Matrix4().makeRotationY(spin + side)));
}

interface Knuckle { at: THREE.Vector3; pin: THREE.Vector3; down: THREE.Vector3; arms: THREE.Vector3[]; armR: number; re: number; ld: number; hw: number }

// A friction knuckle: two ears on one side, a disc on the other between them, copper washers, a bolt with a domed
// head on the far side and a wing nut toward the visitor.
function knuckle(b: Parts, mats: Of, k: Knuckle): void {
  const earT = 4.2, midT = 7, gap = 0.7, half = midT / 2 + gap + earT;
  const pin = k.pin.clone().normalize(), down = k.down.clone().addScaledVector(pin, -k.down.dot(pin)).normalize();
  const eg = ear(k.re, k.ld, k.hw, earT);
  for (const sd of [-1, 1]) {
    const c = k.at.clone().addScaledVector(pin, sd * (midT / 2 + gap + earT / 2));
    b.add(eg, mats.joint, frame(c, down.clone().negate(), pin));
    b.add(cyl(k.re * 0.72, gap, 40), mats.copper, along(k.at.clone().addScaledVector(pin, sd * (midT / 2 + gap / 2)), pin));
  }
  addTurn(b, [[0.01, -midT / 2], [k.re - 1.4, -midT / 2], [k.re - 0.8, -midT / 2 + 0.6], [k.re - 0.8, midT / 2 - 0.6], [k.re - 1.4, midT / 2], [0.01, midT / 2]], mats.joint, along(k.at, pin), 48);
  for (const a of k.arms) {
    const d = a.clone().normalize();
    addTurn(b, [[k.re * 0.66, 0], [k.re * 0.62, k.re * 0.55], [k.armR + 1.6, k.re + 3], [k.armR + 1.6, k.re + 7], [k.armR + 0.9, k.re + 7.8], [k.armR, k.re + 8.4]], mats.joint, along(k.at, d), 40);
  }
  addTurn(b, [[0.01, 0], [2.7, 0], [2.7, half * 2 + 1.2]], mats.steel, along(k.at.clone().addScaledVector(pin, -half - 0.6), pin), 20);
  addTurn(b, [[2.7, 0], [5.4, 0], [5.4, 1.1], [4.6, 2.4], [2.6, 3.2], [0.01, 3.4]], mats.steel, along(k.at.clone().addScaledVector(pin, -half), pin.clone().negate()), 36);
  wingNut(b, mats.bronze, mats.steel, frame(k.at.clone().addScaledVector(pin, half), pin, down), 0.35);
}

// A curved plate laid on the shade: from depth s0 to s1 and round the axis from -a to a about the flank, standing from
// out0 to out1 off the shade's face.
function saddle(s0: number, s1: number, a: number, out0: number, out1: number): THREE.BufferGeometry {
  const side = AXIS.clone().cross(FLANK).normalize();
  const ns = 10, na = 10, pos: number[] = [], idx: number[] = [];
  const P = (s: number, t: number, out: number) => onShade(s, FLANK.clone().multiplyScalar(Math.cos(t)).addScaledVector(side, Math.sin(t)), out);
  const grid = (out: number, flip: boolean) => {
    const base = pos.length / 3;
    for (let i = 0; i <= ns; i++) for (let j = 0; j <= na; j++) { const p = P(s0 + ((s1 - s0) * i) / ns, -a + (2 * a * j) / na, out); pos.push(p.x, p.y, p.z); }
    for (let i = 0; i < ns; i++) for (let j = 0; j < na; j++) {
      const q = base + i * (na + 1) + j;
      if (flip) idx.push(q, q + 1, q + na + 1, q + 1, q + na + 2, q + na + 1); else idx.push(q, q + na + 1, q + 1, q + 1, q + na + 1, q + na + 2);
    }
  };
  grid(out1, false);
  const edge = (pts: [number, number][]) => {
    const base = pos.length / 3;
    for (const [s, t] of pts) { const p0 = P(s, t, out0), p1 = P(s, t, out1); pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z); }
    for (let i = 0; i < pts.length - 1; i++) { const q = base + i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
  };
  const ring: [number, number][] = [];
  for (let j = 0; j <= na; j++) ring.push([s0, -a + (2 * a * j) / na]);
  for (let i = 0; i <= ns; i++) ring.push([s0 + ((s1 - s0) * i) / ns, a]);
  for (let j = na; j >= 0; j--) ring.push([s1, -a + (2 * a * j) / na]);
  for (let i = ns; i >= 0; i--) ring.push([s0 + ((s1 - s0) * i) / ns, -a]);
  edge(ring);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // Every face looks away from a point deep inside the shade under the saddle's middle.
  const core = onShade((s0 + s1) / 2, FLANK, -40), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let i = 0; i < idx.length; i += 3) {
    A.fromArray(pos, idx[i] * 3); B.fromArray(pos, idx[i + 1] * 3); C.fromArray(pos, idx[i + 2] * 3);
    const n = B.clone().sub(A).cross(C.clone().sub(A)), mid = A.clone().add(B).add(C).divideScalar(3);
    if (n.dot(mid.sub(core)) < 0) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  }
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export interface LampModel { group: THREE.Group; tris: number; meshes: THREE.Mesh[] }

export function buildLamp(mats: Of): LampModel {
  const b = new Parts();
  const F = FOOT.at, foot = new THREE.Matrix4().makeTranslation(F.x, F.y, F.z);

  // The foot: felt under it, a heavy body of dark steel with a bronze bead turned round its edge, a groove, and the
  // bronze boss the stem swivels in.
  addTurn(b, [[0.01, 0.02], [79, 0], [80.6, 0.5], [81.2, 1.7]], mats.felt, foot, 48);
  addTurn(b, [[81.2, 1.6], [83.8, 2.2], [85.8, 3.8], [86.2, 5.5], [86.2, 11.6]], mats.foot, foot, 72);
  addTurn(b, [[86.1, 11.4], [87.4, 12.1], [88.3, 13.8], [88.6, 15.8], [88.3, 17.8], [87.4, 19.5], [86.1, 20.2]], mats.bronze, foot, 72);
  addTurn(b, [[86.2, 20.1], [85.6, 20.8], [83.4, 21.6], [80.5, 22.4], [72, 24.4], [64.5, 26.0], [63.8, 26.4], [63.4, 28.6], [62.6, 29.2], [50, 31.4], [40, 32.8], [38.6, 33.0], [37.8, 32.6], [36.8, 31.8], [35.8, 32.6], [34.6, 33.4], [31.6, 34.2], [29, 35.0]], mats.foot, foot, 72);
  addTurn(b, [[29, 34.9], [28.2, 35.4], [27.0, 36.6], [25.6, 38.2], [24.6, 40], [24.2, 46.6], [24.8, 47.4], [24.8, 48.6], [24.2, 49.4], [21.6, 51.2], [15, 52], [0.01, 52.1]], mats.joint, foot, 96);

  // The switch on the foot's top, toward the visitor: a bronze ring and a toggle with a ball on its end.
  {
    const h = V(TOWARD.x, 0, TOWARD.z).normalize(), r = 50.5, y = 31.35;
    const n = UP.clone().multiplyScalar(0.99).addScaledVector(h, 0.137).normalize();
    const at = F.clone().addScaledVector(h, r).setY(y);
    const m = frame(at, n, h);
    addTurn(b, [[0.01, -0.6], [8.6, -0.6], [8.9, 0.3], [8.2, 1.4], [5.6, 2.0], [4.0, 2.4], [0.01, 2.5]], mats.bronze, m, 48);
    const side = n.clone().cross(h).normalize();
    const lever = n.clone().multiplyScalar(Math.cos(0.42)).addScaledVector(side, Math.sin(0.42));
    const lm = frame(at.clone().addScaledVector(n, 2.2), lever, h);
    addTurn(b, [[2.8, 0], [2.4, 1.2], [1.7, 3.2], [1.35, 10.4], [0.01, 10.6]], mats.steel, lm, 24);
    b.add(new THREE.SphereGeometry(2.35, 20, 14), mats.rim, lm.clone().multiply(new THREE.Matrix4().makeTranslation(0, 11.4, 0)));
  }

  // The stem: a bronze swivel on the boss, a dark steel tube, and a bronze collar that carries the elbow's ears.
  const top = ELBOW_Y;
  addTurn(b, [[13.2, 52], [13.8, 52.7], [13.8, 55.2], [13.2, 55.8], [13.8, 56.4], [13.8, 59.4], [13.0, 60.2], [9.6, 61.1], [8.3, 61.8]], mats.bronze, foot, 64);
  addTurn(b, [[STEM_R, 61.6], [STEM_R, top - 34]], mats.steel, foot, 40);
  addTurn(b, [[STEM_R, top - 34.2], [9.8, top - 33.6], [10.4, top - 32.2], [10.4, top - 27.4], [9.8, top - 26.2], [10.4, top - 25.4], [10.4, top - 24.6], [9.6, top - 23.8], [0.01, top - 23.6]], mats.steel, foot, 48);
  knuckle(b, mats, { at: ELBOW, pin: ELBOW_PIN, down: UP.clone().negate(), arms: [ARM_DIR, ARM_DIR.clone().negate()], armR: ARM_R, re: 11.5, ld: 24, hw: 8.5 });

  // The counterweight beyond the elbow: a turned bronze weight on a short spigot.
  {
    const tail = ARM_DIR.clone().negate(), m = along(ELBOW, tail);
    addTurn(b, [[ARM_R, 19.8], [4.6, 20.8], [4.6, 34]], mats.steel, m, 24);
    addTurn(b, [[4.6, 33.6], [9, 34.2], [14.6, 35.6], [15.8, 37.2], [16, 46.8], [15.2, 47.6], [16, 48.4], [16, 58.8], [15.2, 59.6], [16, 60.4], [16, 68.4], [15.2, 70.4], [11.8, 71.8], [6.2, 72.5], [0.01, 72.7]], mats.steel, m, 64);
  }

  // The arm: one dark steel tube from the elbow to the shade's knuckle.
  rod(b, ELBOW.clone().addScaledVector(ARM_DIR, 19.7), KNUCKLE.clone().addScaledVector(ARM_DIR, -18.2), ARM_R, mats.steel, 32);

  // The shade's knuckle, on a saddle riveted to the shade's flank.
  const side = AXIS.clone().cross(FLANK).normalize();
  b.add(saddle(SADDLE_S - 15, SADDLE_S + 13, 0.24, 0.6, 2.4), mats.joint);
  for (const s of [SADDLE_S - 10, SADDLE_S + 8]) for (const t of [-0.15, 0.15]) {
    const dir = FLANK.clone().multiplyScalar(Math.cos(t)).addScaledVector(side, Math.sin(t)), p = onShade(s, dir, 2.3), n = normalAt(s, dir);
    b.add(new THREE.SphereGeometry(1.7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.copper, frame(p, n, AXIS).multiply(new THREE.Matrix4().makeScale(1, 0.55, 1)));
  }
  knuckle(b, mats, { at: KNUCKLE, pin: SHADE_PIN, down: SHADE_N.clone().negate(), arms: [ARM_DIR.clone().negate()], armR: ARM_R, re: 10, ld: 16, hw: 8 });

  // The shade: spun copper, a pale enamel inside, a rolled rim, the crown's lip and the vented cap on its posts.
  const sm = new THREE.Matrix4().compose(CROWN, TURN, new THREE.Vector3(1, 1, 1));
  const out = SHELL.map(([r, s]): [number, number] => [r, -s]).reverse();
  b.add(new THREE.LatheGeometry(out.map(([r, y]) => new THREE.Vector2(r, y)), 96), mats.shell, sm);
  const inner = SHELL.map(([r, s], i): [number, number] => {
    const a = SHELL[Math.max(0, i - 1)], c = SHELL[Math.min(SHELL.length - 1, i + 1)];
    const dr = c[0] - a[0], ds = c[1] - a[1], l = Math.hypot(dr, ds);
    return [r - (ds / l) * SKIN, -(s + (dr / l) * SKIN)];
  });
  b.add(new THREE.LatheGeometry(inner.map(([r, y]) => new THREE.Vector2(r, y)), 48), mats.enamel, sm);
  b.add(new THREE.TorusGeometry(RIM.r, RIM.tube, 8, 120).rotateX(Math.PI / 2).translate(0, -RIM.s, 0), mats.rim, sm);
  b.add(new THREE.TorusGeometry(SHELL[0][0] - 0.3, 0.75, 8, 96).rotateX(Math.PI / 2).translate(0, -SHELL[0][1], 0), mats.shell, sm);
  addTurn(b, CAP, mats.cap, sm, 48);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26, r = 25.4, low = -2.7, high = CAP[0][1] + 0.4;
    b.add(cyl(1.5, high - low, 12), mats.steel, sm.clone().multiply(new THREE.Matrix4().makeTranslation(Math.cos(a) * r, (low + high) / 2, Math.sin(a) * r)));
  }
  // A ring of vent slots pressed round the crown: dark at rest, burning with the bulb behind them.
  {
    const n = 24, sMid = 8.6, half = 4.6;
    const r = (k: number) => SHELL.reduce((acc, [rr, ss], i) => (i && k >= SHELL[i - 1][1] && k <= ss ? SHELL[i - 1][0] + ((rr - SHELL[i - 1][0]) * (k - SHELL[i - 1][1])) / (ss - SHELL[i - 1][1]) : acc), 0);
    const dr = (r(sMid + half) - r(sMid - half)) / (2 * half);
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      const at = V(r(sMid) * c, -sMid, r(sMid) * sn), nrm = V(c, dr, sn).normalize(), mer = V(dr * c, -1, dr * sn).normalize();
      b.add(new THREE.BoxGeometry(2.3, 0.5, half * 2), mats.glow, sm.clone().multiply(frame(at.addScaledVector(nrm, 0.12), nrm, mer)), { shadow: false });
      b.add(new THREE.BoxGeometry(3.6, 0.6, half * 2 + 1.4), mats.shell, sm.clone().multiply(frame(V(r(sMid) * c, -sMid, r(sMid) * sn).addScaledVector(nrm, -0.05), nrm, mer)));
    }
  }
  b.add(new THREE.CircleGeometry(SHELL[0][0] + 1, 48).rotateX(-Math.PI / 2).translate(0, -SHELL[0][1] - 1.4, 0), mats.glow, sm, { shadow: false });
  // The bulb on its socket, inside.
  addTurn(b, [[15.5, -26], [15.5, -8], [13, -6], [0.01, -6]], mats.steel, sm, 16);
  b.add(new THREE.SphereGeometry(BULB.r, 18, 10), mats.glow, sm.clone().multiply(new THREE.Matrix4().makeTranslation(0, -BULB.s, 0)), { shadow: false });

  // The cord from the shade: out through a grommet beside the saddle, along under the arm in two clips, round the
  // elbow, down the back of the stem and into the boss.
  {
    const off = TOWARD.clone().negate().addScaledVector(UP, -0.8).addScaledVector(ARM_DIR, -TOWARD.clone().negate().addScaledVector(UP, -0.8).dot(ARM_DIR)).normalize();
    const away = V(-TOWARD.x, 0, -TOWARD.z).normalize();
    const gDir = FLANK.clone().multiplyScalar(Math.cos(-0.42)).addScaledVector(side, Math.sin(-0.42)), gs = SADDLE_S + 6;
    const g0 = onShade(gs, gDir, 0.4), gn = normalAt(gs, gDir);
    addTurn(b, [[3.6, 0], [3.6, 2.2], [3.0, 3.6], [2.6, 4.2]], mats.joint, along(g0, gn), 24);
    const armAt = (t: number, o: number) => ELBOW.clone().addScaledVector(ARM_DIR, t).addScaledVector(off, o);
    const path = [
      g0.clone().addScaledVector(gn, 3.4), g0.clone().addScaledVector(gn, 12), armAt(ARM_LEN - 36, 11.8), armAt(ARM_LEN * 0.62, 10.6),
      armAt(ARM_LEN * 0.3, 10.6), armAt(26, 14), ELBOW.clone().addScaledVector(away, 24).addScaledVector(UP, -18),
      F.clone().setY(top - 64).addScaledVector(away, 12.4), F.clone().setY(150).addScaledVector(away, 12), F.clone().setY(70).addScaledVector(away, 12.6),
      F.clone().setY(48).addScaledVector(away, 26.4), F.clone().setY(43.4).addScaledVector(away, 25),
    ];
    cordTube(b, path, 2.1, mats.cord);
    for (const t of [ARM_LEN * 0.62, ARM_LEN * 0.3]) {
      const c = armAt(t, 5.3), m = frame(c, ARM_DIR, off);
      b.add(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).scale(8.4, 4.2, 13.2), mats.steel, m);
    }
    const sc = F.clone().setY(150).addScaledVector(away, 5.8);
    b.add(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).scale(9.6, 4.2, 14.8), mats.steel, frame(sc, UP, away));
    addTurn(b, [[3.4, 0], [3.4, 1.8], [2.8, 3.0]], mats.joint, along(F.clone().setY(43.4).addScaledVector(away, 24.5), away.clone().negate()), 20);
  }

  // The mains cord out of the back of the foot, lying on the top in a curve away from the stream's side and over the
  // desk's back edge. It drops
  // only as far as the top is thick, so seen alone it does not hang into nothing.
  {
    const s0 = F.clone().add(V(0, 8.4, -86.2));
    addTurn(b, [[3.8, 0], [3.8, 3], [3.2, 9], [2.7, 15]], mats.felt, along(s0.clone().add(V(0, 0, 1)), V(0, 0, -1)), 24);
    cordTube(b, [s0.clone().add(V(0, 0, -12)), s0.clone().add(V(1, -3.2, -20)), V(F.x + 8, 2.2, -366), V(F.x + 34, 2.2, -374), V(F.x + 52, 2.2, -384), V(F.x + 57, 0.2, -391), V(F.x + 59, -6, -394.6), V(F.x + 60, -18, -396)], 2.2, mats.cord);
  }

  const group = new THREE.Group();
  group.name = 'lamp';
  const tris = b.tris;
  const meshes = b.build(group);
  return { group, tris, meshes };
}
