import * as THREE from 'three';
import { Builder, at, cyl, rbox } from '../../../../world/build';
import { MID, PANEL } from './frame';
import { corner, roundRect, sweep } from './shape';
import type { MonitorMats } from './materials';

// The stand: a V of two tapered blade legs that spread forward from a hub behind the panel, a slim column rising from
// the hub with a track down its front, a carriage that rides the track (the height slide), and on the carriage the
// hinge: a barrel between copper caps, carried on a tongue from the boss on the back shell. The panel is seen to stand
// clear above the desk on it.

export const STAND = {
  // The hinge's barrel: its axis, back from the panel's middle and down from it, its radius and length.
  pivot: { back: 78, down: 10, r: 10, len: 74 },
  // The column: how far behind the barrel it stands, its width and depth, how round its corners are.
  column: { behind: 16, w: 44, d: 26, r: 9 },
  // The hub at the column's foot: its radius and height, and the copper ring on it.
  hub: { r: 34, h: 16, ring: 2.4 },
  // The legs: where each tip stands from the hub, across and forward; how wide and tall each is at the hub and at the
  // tip.
  leg: { across: 214, forward: 150, w0: 46, w1: 22, h0: 15, h1: 8 },
  // The carriage on the track: its height, and how far it wraps the column.
  carriage: { h: 74, wrap: 8 },
  // The boss on the back shell, where the tongue meets it.
  boss: { r: 50, t: 7 },
} as const;

// A sweep made along x, stood up: its x becomes height and its outline's first axis runs across.
function upright(g: THREE.BufferGeometry, x0: number): THREE.BufferGeometry {
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) { const h = p.getX(i), u = p.getY(i); p.setXY(i, x0 + u, h); }
  const ix = g.getIndex()!;
  for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, a); }
  g.computeVertexNormals();
  return g;
}

// One leg, made along x from the hub (x = 0) to its tip, lying on the timber: a blade that narrows and thins toward the
// tip, its upper edges well rounded so they carry a highlight, its tip rounded off.
function leg(len: number): THREE.BufferGeometry[] {
  const L = STAND.leg, xs: number[] = [];
  for (let i = 0; i <= 40; i++) xs.push((len * i) / 40);
  for (const d of [0.4, 1.5, 3.5, 6, 9, 13]) xs.push(len - d);
  xs.sort((a, b) => a - b);
  return sweep(xs, (x) => {
    const t = x / len, end = corner(len - x, L.w1 / 2);
    const w = L.w0 + (L.w1 - L.w0) * t - 2 * end, h = L.h0 + (L.h1 - L.h0) * t * t - end * 0.6;
    const r = Math.min(h * 0.48, 7);
    const loop = roundRect(h / 2, 0, h / 2, w / 2, r, 6);
    // Flatten the underside so it sits on the timber.
    return loop.map(([y, z]) => [Math.max(0.4, y), z] as [number, number]);
  });
}

export function stand(b: Builder, M: MonitorMats): void {
  const [x, my, mz] = MID, Pv = STAND.pivot, C = STAND.column, H = STAND.hub, L = STAND.leg, K = STAND.carriage;
  const py = my - Pv.down, pz = mz - Pv.back, cz = pz - C.behind;

  // The legs, from under the hub's edge out to their tips, each turned toward its tip.
  const len = Math.hypot(L.across, L.forward);
  for (const s of [-1, 1]) {
    const turn = Math.atan2(-L.forward, s * L.across);
    for (const g of leg(len - H.r * 0.4)) b.add(g, M.stand, new THREE.Matrix4().makeRotationY(turn).premultiply(new THREE.Matrix4().makeTranslation(x + Math.cos(turn) * H.r * 0.4, 0, cz - Math.sin(turn) * H.r * 0.4)));
    // A pad under each tip.
    b.add(cyl(9, 1.2, 20), M.pad, at(x + s * L.across * 0.96, 0.6, cz + L.forward * 0.96), { shadow: false });
  }

  // The hub: a low drum, chamfered top and bottom, with a copper ring let into its top where the column rises.
  b.add(new THREE.LatheGeometry([[0, 0], [H.r - 2, 0], [H.r, 2], [H.r, H.h - 3], [H.r - 3, H.h], [0, H.h]].map(([r, y]) => new THREE.Vector2(r, y)), 64), M.stand, at(x, 0, cz));
  b.add(new THREE.TorusGeometry(C.w * 0.5 + 6, H.ring / 2, 10, 64).rotateX(Math.PI / 2), M.copper, at(x, H.h + 0.3, cz), { shadow: false });

  // The column: a slim upright from the hub to above the barrel, with a dark track down its front.
  const top = py + K.h / 2 + 10;
  const hs: number[] = [];
  for (let i = 0; i <= 6; i++) hs.push(H.h - 1 + ((top - H.h + 1) * i) / 6);
  const [col] = sweep(hs, () => roundRect(0, cz, C.w / 2, C.d / 2, C.r, 6), true);
  b.add(upright(col, x), M.stand);
  b.add(rbox(10, top - H.h - 40, 2, 0.8), M.pad, at(x, (top + H.h) / 2 - 10, cz + C.d / 2 + 0.2), { shadow: false });
  b.add(new THREE.SphereGeometry(C.w / 2, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.25, C.d / C.w), M.stand, at(x, top, cz));

  // The carriage that rides the track, wrapping the column's front and sides, and the hinge on it.
  b.add(rbox(C.w + 2 * K.wrap, K.h, C.d / 2 + 14, 6), M.stand, at(x, py, cz + C.d / 4 + 6));
  b.add(cyl(Pv.r, Pv.len, 40).rotateZ(Math.PI / 2), M.stand, at(x, py, pz));
  for (const s of [-1, 1]) {
    b.add(cyl(Pv.r - 1.5, 2, 40).rotateZ(Math.PI / 2), M.copper, at(x + s * (Pv.len / 2 + 0.8), py, pz), { shadow: false });
    b.add(rbox(8, 30, 30, 3), M.stand, at(x + s * (C.w / 2 + K.wrap - 4), py, pz - 4));
  }

  // The tongue from the barrel to the boss on the back shell.
  const bossZ = mz + PANEL.back - 46.5;
  b.add(cyl(STAND.boss.r, STAND.boss.t, 56).rotateX(Math.PI / 2), M.shell, at(x, py, bossZ - STAND.boss.t / 2 + 1));
  const z0 = bossZ - STAND.boss.t + 2, z1 = pz;
  b.add(rbox(30, 22, z0 - z1 + 6, 5), M.stand, at(x, py, (z0 + z1) / 2));
}
