import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PI, type Adds, at, bladeGeometry, circleHole, cyl, extrude, lathe, led, rrect, torus, xf } from './kit';
import type { Look } from './look';

// A 120 mm case fan, brought over from his PC Builder (src/world/parts/fan.ts, buildFan): a frame of two flanges with
// corner blocks and pads, the motor base on four struts, a hub with its nose, and a ring of light set into both faces.
// Aureole has a second ring in the hub's nose, Gale Lux only the frame's. Everything that stands still is merged with
// the rest of the PC; the nine blades are one geometry, drawn for every fan at once (rotor()).

const HALF = 60, HOLE = HALF - 2.6, HP = 52.5, T = 25, FL = 3.2, FACE = T / 2 - 0.5, R = 6.5, HUB = 19;
const CORNERS: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

export type FanKind = 'aureole' | 'gale';

export function fan(b: Adds, L: Look, m: THREE.Matrix4, kind: FanKind, tone: number, gain = 0.8): void {
  const on = (x: THREE.Matrix4) => m.clone().multiply(x);
  const flange = () => {
    const s = rrect(new THREE.Shape(), -HALF, -HALF, 120, 120, R);
    s.holes.push(circleHole(0, 0, HOLE));
    return extrude(s, FL, 0, 'xy', 1);
  };
  const fl = flange();
  b.add(fl, L.plastic, on(at(0, 0, -FACE)), { shadow: false });
  b.add(fl, L.plastic, on(at(0, 0, FACE - FL)), { shadow: false });
  b.add(lathe([[HOLE, -FACE + FL - 0.2], [HOLE + 1.6, -FACE + FL - 0.2], [HOLE + 1.6, FACE - FL + 0.2], [HOLE, FACE - FL + 0.2]], 36), L.plastic, m, { shadow: false });
  b.add(lathe([[HOLE - 0.01, -FACE + 0.4], [HOLE - 0.01, FACE - 0.4]], 36), L.plastic, m, { shadow: false });
  for (const [sx, sy] of CORNERS) {
    const c = new THREE.Shape();
    rrect(c, sx * 51 - 9, sy * 51 - 9, 18, 18, 3);
    b.add(extrude(c, T - 2 * FL - 0.2, 0, 'xy', 1), L.plastic, m.clone().multiply(at(0, 0, -FACE + FL + 0.1)), { shadow: false });
    for (const z of [-FACE - 0.45, FACE + 0.45]) b.add(new THREE.BoxGeometry(10.5, 10.5, 1.5), L.rubber, m.clone().multiply(at(sx * 53.4, sy * 53.4, z)), { shadow: false });
  }
  const back = FACE - 1.2;
  b.add(lathe([[0, back - 6.5], [17.8, back - 6.5], [19, back - 5.3], [19, back], [0, back]], 24), L.plastic, m, { shadow: false });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4 + 0.32, len = HOLE - 17, mid = 18 + len / 2;
    b.add(new THREE.BoxGeometry(len, 3.2, 3), L.plastic, m.clone().multiply(xf({ p: [Math.cos(a) * mid, Math.sin(a) * mid, back - 1.6], r: [0, 0, a + 0.12] })), { shadow: false });
  }
  // The hub is round, so it is drawn standing still: only the blades are seen to turn.
  b.add(lathe([[0, -FACE + 0.6], [13.2, -FACE + 0.6], [16.8, -FACE + 1.8], [HUB, -FACE + 4.4], [HUB, back - 7], [0, back - 7]], 32), L.satin, m, { shadow: false });
  b.add(cyl(11, 0.25, 'z', 32), L.sinkDark, m.clone().multiply(at(0, 0, -FACE + 0.48)), { shadow: false });
  for (const fz of [-FACE - 0.2, FACE + 0.2]) b.add(led(torus(HOLE + 1.3, 1.55, 4, 48), tone, gain), L.led, m.clone().multiply(at(0, 0, fz)), { shadow: false });
  // The ring lights the duct inside it.
  b.add(led(cyl(HOLE + 0.15, T - 2 * FL - 0.6, 'z', 32, HOLE + 0.15, true), tone, gain * 0.12), L.led, m, { shadow: false });
  if (kind === 'aureole') b.add(led(torus(15.4, 1.25, 4, 28), Math.min(1, tone + 0.35), gain), L.led, m.clone().multiply(at(0, 0, -FACE + 1.15)), { shadow: false });
}

// Nine swept blades, the PC Builder's own blade, as one geometry about the z axis.
export function rotor(): THREE.BufferGeometry {
  const g = bladeGeometry({ r0: HUB - 2, r1: HOLE - 1.6, c0: 15, c1: 40, pitch0: 0.86, pitch1: 0.42, sweep: 0.56, thick: 1.7, z: -0.8, nu: 6, nv: 3 });
  const all: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) { const c = g.clone(); c.applyMatrix4(xf({ r: [0, 0, (i / 9) * PI * 2] })); all.push(c.toNonIndexed()); }
  g.dispose();
  return mergeGeometries(all, false)!;
}

// A graphics card fan: eleven blades out to a ring that ties their tips, about the z axis.
export function cardRotor(r: number): THREE.BufferGeometry {
  const hub = Math.max(12, r * 0.3);
  const g = bladeGeometry({ r0: hub - 0.4, r1: r - 1.4, c0: r * 0.26, c1: r * 0.52, pitch0: 0.78, pitch1: 0.38, sweep: 0.68, thick: 1.4, z: 0.5, nu: 5, nv: 3, tip: 0.3 });
  const all: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 11; i++) { const c = g.clone(); c.applyMatrix4(xf({ r: [0, 0, (i / 11) * PI * 2] })); all.push(c.toNonIndexed()); }
  const ring = lathe([[r - 2.1, 2.6], [r - 1.2, 2.6], [r - 1.2, 3.8], [r - 2.1, 3.8]], 32);
  all.push(ring.toNonIndexed());
  g.dispose();
  return mergeGeometries(all.map((x) => { for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k); return x; }), false)!;
}

export const FAN = { HALF, HOLE, T, FACE };
