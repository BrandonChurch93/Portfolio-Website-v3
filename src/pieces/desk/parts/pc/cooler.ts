import * as THREE from 'three';
import { PI, type Adds, at, cyl, extrude, lathe, led, moved, puck, rbox, roundedPoly, rrectShape, torus, tube, xf } from './kit';
import { fan } from './fan';
import { FX, fxOf, type Look } from './look';
import { SHEET, printDisc } from './print';

// His Tarn 360 Lux liquid cooler, brought over from the PC Builder (src/world/parts/cooler.ts): the pump head with its
// copper cold plate, cross bracket and thumbscrews, a round body with a gloss cap and two lit rings, and the 360
// radiator with its tanks, side plates, fittings and three Gale Lux fans. Pump space: z out of the board. Radiator
// space: x along it, z inward from its mount.

const XZ = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
export const PUMP_FITTINGS: [number, number, number][] = [[-9, 33.5 + 12.5, 38], [9, 33.5 + 12.5, 38]];

export function pump(parent: Adds, L: Look, m: THREE.Matrix4): void {
  const b = moved(parent, m);
  b.add(puck(27, 2.4, 0.4, 48), L.copper, undefined);
  const A = 64, hw = 6.5;
  const arm = roundedPoly([[-A, -hw], [-14, -hw], [-hw, -14], [-hw, -A], [hw, -A], [hw, -14], [14, -hw], [A, -hw], [A, hw], [14, hw], [hw, 14], [hw, A], [-hw, A], [-hw, 14], [-14, hw], [-A, hw]], 2.6);
  b.add(extrude(arm, 2.4, 0.5, 'xy', 6), L.sink, at(0, 0, 2.4).multiply(new THREE.Matrix4().makeRotationZ(PI / 4)), { uv: 'box' });
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const s = at(sx * 42, sy * 42, 4.8);
    b.add(lathe([[0, 0], [4.6, 0], [4.8, 0.6], [4.8, 3.2], [4.3, 4.0], [0, 4.0]], 20), L.copper, s);
    b.add(new THREE.BoxGeometry(4.4, 0.8, 0.4), L.void, s.clone().multiply(at(0, 0, 4.05)), { shadow: false });
  }
  b.add(lathe([[0, 6], [33, 6], [34.6, 7.2], [34.6, 40], [33.8, 44.6], [31.5, 47.2], [0, 47.2]], 48), L.sinkDark, undefined);
  b.add(lathe([[34.4, 14], [35.2, 14], [35.2, 15.2], [34.4, 15.2]], 64), L.copper, undefined);
  b.add(lathe([[0, 0], [29.4, 0], [29.4, 0.9], [28.9, 1.4], [0, 1.4]], 64), L.satin, at(0, 0, 46.2));
  b.add(led(torus(31.6, 1.35, 8, 72), 0.95, 1.0), L.led, at(0, 0, 46.9), { shadow: false });
  b.add(led(torus(23, 0.6, 6, 64), 0.7, 0.9), L.led, at(0, 0, 47.6), { shadow: false });
  // The cap's print, and the rings' light on the cap round them.
  b.add(printDisc(28.9, SHEET.cap), L.print, at(0, 0, 47.62), { shadow: false });
  b.add(fxOf(new THREE.PlaneGeometry(72, 72), FX.ring, 0.9, 0.3, 0.86), L.fx, at(0, 0, 47.72), { shadow: false });
  for (const [x] of PUMP_FITTINGS) {
    const f = at(x, 33.5, 38);
    b.add(cyl(5.2, 6, 'y', 24), L.sink, f.clone().multiply(at(0, 2.6, 0)));
    b.add(cyl(6.4, 7, 'y', 24), L.sink, f.clone().multiply(at(0, 9, 0)));
    for (let r = 0; r < 3; r++) b.add(torus(6.5, 0.35, 4, 24), L.sink, f.clone().multiply(xf({ p: [0, 6.2 + r * 2.4, 0], r: [PI / 2, 0, 0] })));
  }
  b.add(cyl(2.6, 6, 'y', 12, 1.9), L.rubber, xf({ p: [26.5, 26.5, 34], r: [0, 0, -PI / 4] }));
}

const RAD = { L: 397, tank: 22, W: 120, width: 124, thick: 30, fanT: 25, pitch: 122 };
// The radiator's fittings in its own space, pointing along +z.
export const RAD_FITTINGS: [number, number, number][] = [[RAD.L / 2 - RAD.tank / 2 + 1.5, 15, RAD.thick + 13], [RAD.L / 2 - RAD.tank / 2 + 1.5, -15, RAD.thick + 13]];
export const RAD_FANS = [-1, 0, 1].map((i) => i * RAD.pitch);

export function radiator(parent: Adds, L: Look, m: THREE.Matrix4, fanTone: number): THREE.Matrix4[] {
  const b = moved(parent, m);
  const { L: len, tank, W, thick } = RAD;
  const rz0 = 0, rz1 = thick, coreL = len - 2 * tank;
  // The core: flat tubes with dark fins between them, the fins drawn as their folded face.
  for (let i = 0; i <= 13; i++) b.add(rbox(coreL, 1.6, rz1 - rz0 - 3, 0.5, 1), L.sinkDark, xf({ p: [0, -W / 2 + i * (W / 13), (rz0 + rz1) / 2] }));
  for (const z of [rz0 + 1.6, rz1 - 1.6]) b.add(new THREE.PlaneGeometry(coreL, W), L.fin, xf({ p: [0, 0, z], r: [z > 15 ? 0 : PI, 0, 0] }), { shadow: false });
  for (const sgn of [-1, 1]) {
    const t = roundedPoly([[-tank / 2, rz0], [tank / 2 - 3, rz0], [tank / 2, rz0 + 3], [tank / 2, rz1 - 3], [tank / 2 - 3, rz1], [-tank / 2, rz1]], 1.2);
    const g = extrude(t, RAD.width, 0.8, 'xy', 3, 2);
    b.add(g, L.plastic, new THREE.Matrix4().makeRotationZ(sgn > 0 ? 0 : PI).multiply(new THREE.Matrix4().makeTranslation(len / 2 - tank / 2, RAD.width / 2, 0)).multiply(XZ));
  }
  for (const sgn of [-1, 1]) {
    const g = extrude(rrectShape(coreL + 2, rz1 - rz0, 1.2, 0, (rz0 + rz1) / 2), 1.4, 0.4, 'xy', 3, 1);
    b.add(g, L.sink, new THREE.Matrix4().makeTranslation(0, sgn > 0 ? W / 2 + 1.4 : -W / 2, 0).multiply(XZ), { uv: 'box' });
  }
  b.add(cyl(5.5, 2.2, 'x', 20), L.sink, at(-len / 2 - 0.6, 30, (rz0 + rz1) / 2));
  for (const [x, y] of RAD_FITTINGS) {
    const f = at(x, y, rz1);
    b.add(cyl(5.4, 5, 'z', 24), L.sink, f.clone().multiply(at(0, 0, 2.4)));
    b.add(cyl(6.4, 8, 'z', 24), L.sink, f.clone().multiply(at(0, 0, 9)));
    for (let r = 0; r < 3; r++) b.add(torus(6.5, 0.35, 4, 24), L.sink, f.clone().multiply(at(0, 0, 6.4 + r * 2.4)));
  }
  // The fans hang under the core, blowing out through it.
  const fans: THREE.Matrix4[] = [];
  for (const cx of RAD_FANS) {
    const fm = new THREE.Matrix4().makeTranslation(cx, 0, rz1 + RAD.fanT / 2).multiply(new THREE.Matrix4().makeRotationX(PI));
    fan(b, L, fm, 'gale', fanTone, 0.9);
    fans.push(m.clone().multiply(fm));
  }
  return fans;
}

// The two braided tubes from the pump's fittings to the radiator's, in case space, side by side.
export function tubes(b: Adds, L: Look, from: THREE.Vector3[], to: THREE.Vector3[]): void {
  const a = [...from].sort((p, q) => p.x - q.x), e = [...to].sort((p, q) => p.z - q.z);
  for (let i = 0; i < 2; i++) {
    const p = a[i], q = e[i];
    // Up out of the pump, forward and over in front of the radiator's fans, and back up into its fittings at the rear.
    // Seen from above, a run any deeper hides behind the top of the case, so the two run one over the other, close
    // inside the glass.
    const lift = i === 0 ? 0 : -13, fwd = i === 0 ? 0 : 3;
    const pts = [p, new THREE.Vector3(p.x, p.y + 12, p.z), new THREE.Vector3(p.x - 4, p.y + 30 + lift * 0.5, p.z + 42), new THREE.Vector3(p.x - 20, 418 + lift, 112 + fwd), new THREE.Vector3(-168, 420 + lift, 114 + fwd), new THREE.Vector3(q.x + 10, 416 + lift * 0.5, 88), new THREE.Vector3(q.x + 2, q.y - 18, q.z + 16), new THREE.Vector3(q.x, q.y - 8, q.z), q];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    const len = curve.getLength();
    const g = tube(curve, 6.1, 56, 10);
    // In the sleeves' millimetres, with a coarser weave, as a hose's braid is.
    const uv = g.getAttribute('uv'), k2 = 1.15 / 2.2;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * len * k2, uv.getY(k) * 6.1 * 2 * PI * k2);
    b.add(g, L.hose);
  }
}
