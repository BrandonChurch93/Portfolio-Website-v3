import * as THREE from 'three';
import { Builder, at, cyl, rbox } from '../../../../world/build';
import { MID, PANEL } from './frame';
import { roundRect, sweep } from './shape';
import type { MonitorMats } from './materials';

// The stand: a plate foot on the timber behind the mat, its front edge following the panel's curve; a spine that rises
// from a plinth on the foot into a knuckle; and through the knuckle a hinge, a barrel between copper caps, carried on a
// tongue from the boss on the back shell.

export const STAND = {
  // The hinge's barrel: its axis, back from the panel's middle and down from it, its radius and length.
  pivot: { back: 84, down: 10, r: 11, len: 72 },
  // The spine: how wide it is, its depth, and the radius of its head round the barrel.
  spine: { w: 56, depth: 26, head: 16 },
  // The foot: its front edge at the middle, its back, its half width at the front and the back, its thickness and the
  // radius of its corners; how high its pads hold it off the timber; how wide its polished rim is, and how far the
  // blasted floor inside the rim is sunk below it.
  foot: { front: -186, back: -382, wf: 176, wb: 136, t: 9, r: 30, lift: 3, rim: 34, recess: 1.8 },
  // The copper collar on the spine: its height above the timber, its own height, and how far it stands proud.
  collar: { at: 54, h: 4, proud: 0.9 },
  // The boss on the back shell, where the tongue meets it.
  boss: { r: 50, t: 7 },
} as const;

type P2 = [number, number];

// A sweep made along x, stood up: its x becomes height and its outline's first axis runs across.
function upright(g: THREE.BufferGeometry, x0: number): THREE.BufferGeometry {
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) { const h = p.getX(i), u = p.getY(i); p.setXY(i, x0 + u, h); }
  const ix = g.getIndex()!;
  for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, a); }
  g.computeVertexNormals();
  return g;
}

// A polygon with each corner rounded by its own radius.
function roundedPoly(pts: P2[], radii: number[]): THREE.Shape {
  const s = new THREE.Shape(), n = pts.length;
  const cut = (i: number): [P2, P2] => {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], r = radii[i];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ra = Math.min(r, la / 2), rb = Math.min(r, lb / 2);
    return [[p[0] + ((a[0] - p[0]) / la) * ra, p[1] + ((a[1] - p[1]) / la) * ra], [p[0] + ((b[0] - p[0]) / lb) * rb, p[1] + ((b[1] - p[1]) / lb) * rb]];
  };
  for (let i = 0; i < n; i++) {
    const [inn, out] = cut(i);
    if (i === 0) s.moveTo(inn[0], inn[1]); else s.lineTo(inn[0], inn[1]);
    if (radii[i] > 0) s.quadraticCurveTo(pts[i][0], pts[i][1], out[0], out[1]); else s.lineTo(out[0], out[1]);
  }
  s.closePath();
  return s;
}

export function stand(b: Builder, M: MonitorMats): void {
  const [x, my, mz] = MID, F = STAND.foot, Pv = STAND.pivot, Sp = STAND.spine;
  const px = x, py = my - Pv.down, pz = mz - Pv.back;

  // The foot. Its front edge is an arc about the panel's own centre of curvature, so it answers the panel's curve. It
  // is a polished rim, chamfered inside and out so both edges catch a line of light, round a blasted floor sunk below
  // it, and it stands on four pads.
  const cz = mz + PANEL.R, rc = cz - F.front;
  const edgeZ = (dx: number) => cz - Math.sqrt(rc * rc - dx * dx);
  const outline = (inset: number): THREE.Shape => {
    const pts: P2[] = [], radii: number[] = [], wf = F.wf - inset, wb = F.wb - inset, r = Math.max(4, F.r - inset * 0.6);
    for (let i = 0; i <= 14; i++) { const dx = -wf + (2 * wf * i) / 14; pts.push([x + dx, -(edgeZ(dx) - inset)]); radii.push(i === 0 || i === 14 ? r : 0); }
    pts.push([x + wb, -(F.back + inset)], [x - wb, -(F.back + inset)]);
    radii.push(r * 1.4, r * 1.4);
    return roundedPoly(pts, radii);
  };
  const flat = (g: THREE.BufferGeometry, y: number) => { g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g; };
  const ring = outline(0);
  ring.holes.push(outline(F.rim));
  const chamfer = 2.2;
  b.add(flat(new THREE.ExtrudeGeometry(ring, { depth: F.t - 2 * chamfer, bevelEnabled: true, bevelThickness: chamfer, bevelSize: chamfer, bevelOffset: -chamfer, bevelSegments: 1, curveSegments: 12 }), F.lift + chamfer), M.rim);
  const floorTop = F.lift + F.t - F.recess;
  b.add(flat(new THREE.ExtrudeGeometry(outline(F.rim - 3), { depth: floorTop - F.lift - 1, bevelEnabled: false, curveSegments: 12 }), F.lift + 1), M.foot);
  for (const [dx, z] of [[-F.wf + 34, F.front - 26], [F.wf - 34, F.front - 26], [-F.wb + 30, F.back + 28], [F.wb - 30, F.back + 28]] as P2[]) b.add(cyl(11, F.lift, 24), M.pad, at(x + dx, F.lift / 2, z), { shadow: false });
  const base = floorTop;

  // The spine: a loft that rises from a broad fillet on the plinth, narrowing and leaning a little forward as it goes,
  // into the knuckle round the barrel.
  const hs: number[] = [];
  for (let i = 0; i <= 44; i++) { const t = i / 44; hs.push(base + 2 + (py - base - 2) * t ** 1.6); }
  const [loft] = sweep(hs, (h) => {
    const t = (h - base) / (py - base), foot = Math.exp(-t * 16);
    const w = Sp.w + 10 - 18 * t + 26 * foot, d = Sp.depth + 8 - 8 * t + 22 * foot;
    return roundRect(0, pz - 9 * (1 - t) * (1 - t) - 3 * foot, w / 2, d / 2, 9, 6);
  }, false);
  b.add(upright(loft, px), M.stand);
  // A copper collar round the spine a little above the plinth, chamfered top and bottom.
  const at60 = (h: number) => { const t = (h - base) / (py - base), foot = Math.exp(-t * 16); return { w: Sp.w + 10 - 18 * t + 26 * foot, d: Sp.depth + 8 - 8 * t + 22 * foot, z: pz - 9 * (1 - t) * (1 - t) - 3 * foot }; };
  const C = STAND.collar, s0 = at60(C.at);
  const [collar] = sweep([C.at, C.at + 0.5, C.at + C.h - 0.5, C.at + C.h], (h) => {
    const grow = h === C.at || h === C.at + C.h ? 0.1 : C.proud;
    return roundRect(0, s0.z, s0.w / 2 + grow, s0.d / 2 + grow, 9 + grow, 6);
  }, false);
  b.add(upright(collar, px), M.copper);
  const plinth = new THREE.ExtrudeGeometry(roundedPoly([[-46, -50], [46, -50], [46, 54], [-46, 54]], [22, 22, 22, 22]), { depth: 3, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.5, bevelOffset: -1.5, bevelSegments: 2, curveSegments: 8 });
  plinth.rotateX(-Math.PI / 2);
  b.add(plinth, M.foot, at(px, base + 1.5, pz - 2));
  b.add(cyl(Sp.head + 1, Sp.w - 8, 48).rotateZ(Math.PI / 2), M.stand, at(px, py, pz));

  const bossZ = mz + PANEL.back - 46.5;
  b.add(cyl(STAND.boss.r, STAND.boss.t, 56).rotateX(Math.PI / 2), M.shell, at(px, py, bossZ - STAND.boss.t / 2 + 1));
  const z0 = bossZ - STAND.boss.t + 2, z1 = pz;
  b.add(rbox(30, 24, z0 - z1, 5), M.stand, at(px, py, (z0 + z1) / 2));
}
