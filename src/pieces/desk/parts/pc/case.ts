import * as THREE from 'three';
import { PI, Q, ZY, type Adds, at, circleHole, cyl, extrude, lathe, led, rbox, rrect, rrectHole, rrectShape, torus, xf } from './kit';
import { FX, fxOf, perfOf, type Look } from './look';

// His Atrium case, brought over from the PC Builder (src/world/parts/caseAtrium.ts, caseKit.ts and
// src/world/layout/cases/atrium.ts): a dual chamber showcase on a low plinth, glass on the left and the front meeting at
// a corner with no pillar, the supply behind the board tray, the bottom fans in a basin under a perforated floor, and a
// light strip round the plinth under both glass sides. In the case's own millimetres: x from the rear (-) to the front
// (+), y up from the floor, z from the solid right side (-) to the left glass (+).

export const ATRIUM = {
  x0: -227.5, x1: 227.5, z0: -145, z1: 145, y1: 470,
  plinth: 10, basin: 12, floor: 88, topIn: 466,
  trayF: -45.45, trayB: -46.65, rearIn: -226, frontIn: 221.5, glassIn: 141,
  anchor: [-218, 408, -39.1] as [number, number, number],
  slotPitch: 20.32,
};
const A = ATRIUM;
export const MAIN_Z = (A.trayF + A.glassIn) / 2;
const SIDE_Z = A.trayB - 12.5;

export const MOUNTS = {
  side: [90, 224, 358].map((y) => at(140, y, SIDE_Z)),
  bottom: [-112, 22, 156].map((x) => at(x, A.basin + 12.5, MAIN_Z, [-Q, 0, 0])),
  top: [-147, -13, 121].map((x) => [x, A.topIn - 12.5, MAIN_Z] as [number, number, number]),
  rear: xf({ p: [-213.5, 350, 75], r: [0, -Q, 0] }),
};

export const GROMMETS: { id: string; c: [number, number]; s: [number, number] }[] = [
  { id: 'atx24', c: [66, 308], s: [22, 96] },
  { id: 'eps', c: [-186, 440], s: [56, 20] },
  { id: 'gpu', c: [66, 128], s: [22, 40] },
  { id: 'top', c: [40, 440], s: [80, 20] },
  { id: 'rear', c: [-205, 290], s: [16, 60] },
  { id: 'sata', c: [56, 174], s: [18, 36] },
  { id: 'bottom', c: [196, 50], s: [16, 40] },
];

function perforated(b: Adds, L: Look, w: number, h: number, m: THREE.Matrix4, border = 3, pitch = 1, cover = 0.66, pale = 1): void {
  const frame = rrectShape(w, h, 4);
  frame.holes.push(rrectHole(w - 2 * border, h - 2 * border, 2.5));
  b.add(extrude(frame, 1.0, 0.3, 'xy', 6, 1), L.shell, m, { shadow: false });
  b.add(perfOf(new THREE.PlaneGeometry(w - 2 * border + 0.4, h - 2 * border + 0.4), pitch, cover, pale), L.perf, m.clone().multiply(at(0, 0, 0.5)), { shadow: false });
}

export function atrium(b: Adds, L: Look): void {
  const { x0, x1, z0, z1, y1, plinth, basin, topIn, trayF, trayB, rearIn, frontIn, glassIn } = A;
  const main = MAIN_Z;

  // Plinth: a hollow ring just inside the body's outline with rubber feet under it.
  const pw = x1 - x0 - 10, pd = z1 - z0 - 10, rail = 14;
  for (const sz of [1, -1]) b.add(rbox(pw, plinth, rail, 2.4, 2), L.accent, at(0, plinth / 2, sz * (pd / 2 - rail / 2)), { uv: 'box' });
  for (const sx of [1, -1]) b.add(rbox(rail, plinth, pd - 2 * rail + 2, 2.4, 2), L.accent, at(sx * (pw / 2 - rail / 2), plinth / 2, 0), { uv: 'box' });
  for (const [px, pz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.add(cyl(14, 1.4, 'y', 24), L.rubber, at(px * 190, 0.7, pz * 112));

  // Body floor: solid under the second chamber, perforated under the bottom fans.
  const bodyFloor = rrectShape(x1 - x0, z1 - z0, 3);
  bodyFloor.holes.push(rrectHole(396, 128, 6, 22, -main));
  b.add(extrude(bodyFloor, 2, 0.5, 'xz', 6), L.inner, at(0, plinth, 0));
  perforated(b, L, 398, 130, xf({ p: [22, plinth + 1, main], r: [-Q, 0, 0] }));

  // Frame: posts at the three corners that are not glass, and rails along the top and bottom of the solid sides.
  const e = 8, H = y1 - plinth, cy = (plinth + y1) / 2;
  for (const [x, z] of [[x0 + e / 2, z1 - e / 2], [x0 + e / 2, z0 + e / 2], [x1 - e / 2, z0 + e / 2]]) b.add(rbox(e, H, e, 2.4, 2), L.shell, at(x, cy, z));
  for (const y of [plinth + e / 2, y1 - e / 2]) {
    b.add(rbox(e, e, z1 - z0 - 2 * e, 2.4, 2), L.shell, at(x0 + e / 2, y, 0));
    b.add(rbox(x1 - x0 - 2 * e, e, e, 2.4, 2), L.shell, at(0, y, z0 + e / 2));
  }

  // Right side: a solid panel with an intake field over the side fans behind the tray.
  const rp = rrectShape(x1 - x0 - 4, H - 4, 3, 0, cy);
  rp.holes.push(rrectHole(126, 380, 6, 140, 224));
  b.add(extrude(rp, 4.2, 1.6, 'xy', 8, 2), L.shell, at(0, 0, z0));
  perforated(b, L, 128, 382, xf({ p: [140, 224, z0 + 1.2], r: [0, PI, 0] }));

  // Top: a thick plate, a fine perforated field over the fan mounts on a black filter, a seam round it and its screws.
  const top = rrectShape(x1 - x0, z1 - z0, 5);
  top.holes.push(rrectHole(390, 126, 6, -13, -main));
  b.add(extrude(top, 4, 1.2, 'xz', 8, 2), L.shell, at(0, topIn, 0));
  perforated(b, L, 392, 128, xf({ p: [-13, y1 - 2, main], r: [-Q, 0, 0] }), 3, 1, 0.55, 0.8);
  b.add(new THREE.PlaneGeometry(387, 123), L.frit, xf({ p: [-13, topIn + 0.2, main], r: [-Q, 0, 0] }), { shadow: false });
  {
    const sx0 = x0 + 9, sx1 = x1 - 9, sz0 = z0 + 9, sz1 = z1 - 9;
    for (const [x, z, w, d] of [[(sx0 + sx1) / 2, sz0, sx1 - sx0, 0.7], [(sx0 + sx1) / 2, sz1, sx1 - sx0, 0.7], [sx0, 0, 0.7, sz1 - sz0], [sx1, 0, 0.7, sz1 - sz0]]) {
      b.add(new THREE.BoxGeometry(w, 0.3, d), L.frit, at(x, y1 + 0.1, z), { shadow: false });
    }
    for (const [x, z] of [[x0 + 18, z0 + 18], [x0 + 18, z1 - 18], [x1 - 18, z0 + 18], [x1 - 18, z1 - 18], [0, z0 + 18], [0, z1 - 18]]) {
      b.add(lathe([[0, 0], [2.6, 0], [2.6, 0.5], [1.8, 0.9], [0, 1.0]], 12), L.sinkDark, at(x, y1, z, [-Q, 0, 0]));
      b.add(new THREE.BoxGeometry(2.4, 0.4, 0.5), L.void, at(x, y1 + 1.0, z), { shadow: false });
    }
  }
  for (const sz of [1, -1]) b.add(rbox(420, 2.5, 12, 0.8, 2), L.inner, at(-13, topIn - 1.25, main + sz * 62));

  // Rear wall: the connector block's opening, seven slots, the exhaust fan's vent and the supply's opening.
  const [ax, ay, az] = A.anchor;
  const ioZ = az + 22.6, ioY = ay - 78, slotTop = ay - 155, slotZ = az + 55.1, sp = A.slotPitch;
  const fanC = { y: 350, z: 75 };
  const supply = { y: 88, z: -140 };
  const rear = new THREE.Shape(); rrect(rear, z0 + 1, plinth + 1, z1 - z0 - 2, H - 2, 4);
  rear.holes.push(rrectHole(46, 152, 2, ioZ, ioY));
  for (let k = 0; k < 7; k++) rear.holes.push(rrectHole(112, sp - 4.6, 1.2, slotZ, slotTop - sp * (k + 0.5)));
  rear.holes.push(rrectHole(90, 151, 3, supply.z + 43, supply.y + 1.5));
  rear.holes.push(circleHole(fanC.z, fanC.y, 57.5));
  for (const [dy, dz] of [[52.5, 52.5], [52.5, -52.5], [-52.5, 52.5], [-52.5, -52.5]]) rear.holes.push(rrectHole(4.4, 9, 2.2, fanC.z + dz, fanC.y + dy));
  b.add(extrude(rear, 1.5, 0.7, 'xy', 16), L.shell, new THREE.Matrix4().makeTranslation(x0 + 1.5, 0, 0).multiply(ZY));
  b.add(perfOf(new THREE.CircleGeometry(57.2, 48)), L.perf, xf({ p: [x0 + 0.75, fanC.y, fanC.z], r: [0, -Q, 0] }), { shadow: false });
  for (const rr of [20, 34, 47]) b.add(lathe([[rr - 0.9, -0.75], [rr + 0.9, -0.75], [rr + 0.9, 0.75], [rr - 0.9, 0.75]], 48), L.shell, xf({ p: [x0 + 0.75, fanC.y, fanC.z], r: [0, Q, 0] }));
  for (let i = 0; i < 4; i++) b.add(rbox(1.5, 110, 1.8, 0.6, 1), L.shell, xf({ p: [x0 + 0.75, fanC.y, fanC.z], r: [i * PI / 4, 0, 0] }));
  // The slot covers the card does not take, each with its vents, and the ledge their screws go into.
  const ledgeZ = slotZ + 62;
  b.add(rbox(6, sp * 7 + 8, 7, 0.8, 2), L.shell, at(x0 - 3, slotTop - sp * 3.5, ledgeZ));
  for (let k = 4; k < 7; k++) {
    const sh = new THREE.Shape(); rrect(sh, -66, -sp / 2 + 0.6, 118, sp - 1.2, 1);
    for (let v = 0; v < 6; v++) sh.holes.push(rrectHole(10, 2.6, 1.2, -50 + v * 15, 0));
    b.add(extrude(sh, 0.8, 0.15, 'xy', 4, 1), L.shell, at(x0 + 1.5, slotTop - sp * (k + 0.5), slotZ + 14).multiply(ZY).multiply(at(0, 0, -0.8)));
    b.add(cyl(2.6, 1.4, 'x', 12), L.sinkDark, at(x0 - 6.7, slotTop - sp * (k + 0.5), ledgeZ));
  }
  // Behind the supply's opening: its rear face, a fan grille, the inlet and the switch.
  {
    const pz = supply.z + 43, py = supply.y + 1.5;
    b.add(rbox(4, 150, 86, 1.5, 2), L.sinkDark, at(rearIn + 2, py, pz + 0));
    b.add(perfOf(new THREE.CircleGeometry(36, 40)), L.perf, xf({ p: [rearIn - 0.2, py + 22, pz], r: [0, -Q, 0] }), { shadow: false });
    b.add(new THREE.CircleGeometry(35, 32), L.void, xf({ p: [rearIn + 2, py + 22, pz], r: [0, -Q, 0] }), { shadow: false });
    b.add(rbox(3, 18, 27, 1, 1), L.plastic, at(rearIn - 1, py - 40, pz - 10));
    b.add(rbox(3, 10, 13, 1, 1), L.void, at(rearIn - 2.1, py - 40, pz - 10));
    b.add(rbox(3, 12, 8, 1, 1), L.plastic, at(rearIn - 1, py - 40, pz + 20));
  }

  // Front of the second chamber: a solid upright beside the front glass.
  const fz0 = -140.8, fz1 = trayB;
  b.add(rbox(6, H, fz1 - fz0, 2.8, 2), L.shell, at(frontIn + 3, cy, (fz0 + fz1) / 2));

  // Board tray: the wall between the chambers, with grommets, the processor cutout and the side fan openings.
  const tray = new THREE.Shape(); rrect(tray, rearIn, basin, frontIn - rearIn, topIn - basin, 2);
  for (const g of GROMMETS) tray.holes.push(rrectHole(g.s[0], g.s[1], Math.min(7, g.s[0] / 2 - 0.5, g.s[1] / 2 - 0.5), g.c[0], g.c[1]));
  tray.holes.push(rrectHole(110, 96, 6, ax + 112, ay - 82));
  const sides = [90, 224, 358];
  for (const y of sides) tray.holes.push(circleHole(140, y, 57));
  b.add(extrude(tray, 1.2, 0.3, 'xy', 16), L.inner, at(0, 0, trayB));
  for (const g of GROMMETS) {
    const [gw, gh] = g.s;
    const ring = rrectShape(gw + 6, gh + 6, Math.min(9, (gw + 6) / 2 - 0.5), g.c[0], g.c[1]);
    ring.holes.push(rrectHole(gw - 2, gh - 2, Math.min(6, gw / 2 - 1.5, gh / 2 - 1.5), g.c[0], g.c[1]));
    b.add(extrude(ring, 2.8, 0.9, 'xy', 8, 1), L.rubber, at(0, 0, trayB - 1));
    const along = gh >= gw, span = (along ? gh : gw) - 2, across = (along ? gw : gh) - 2, flap = across * 0.34;
    for (const s of [1, -1]) {
      const off = s * (across / 2 - flap / 2);
      const pg = new THREE.PlaneGeometry(along ? flap : span, along ? span : flap);
      b.add(pg, L.rubber, at(g.c[0] + (along ? off : 0), g.c[1] + (along ? 0 : off), trayB - 0.4).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(along ? 0 : s * 0.5, along ? -s * 0.5 : 0, 0))), { shadow: false });
    }
    b.add(new THREE.PlaneGeometry(gw + 4, gh + 4), L.void, at(g.c[0], g.c[1], trayB - 22), { shadow: false });
  }
  for (const y of sides) {
    b.add(torus(57.6, 1.3, 4, 40), L.sinkDark, at(140, y, trayF + 0.3));
    for (const [dx, dy] of [[52.5, 52.5], [52.5, -52.5], [-52.5, 52.5], [-52.5, -52.5]]) b.add(lathe([[0, 0], [2.6, 0], [2.6, 0.8], [0, 1.4]], 8), L.sinkDark, at(140 + dx, y + dy, trayF));
  }

  // Raised floor: a perforated plate over the fan basin, on posts.
  const fx0 = rearIn, fx1 = frontIn, fzA = trayF, fzB = glassIn;
  const plate = rrectShape(fx1 - fx0, fzB - fzA, 3, (fx0 + fx1) / 2, -(fzA + fzB) / 2);
  plate.holes.push(rrectHole(fx1 - fx0 - 24, fzB - fzA - 24, 6, (fx0 + fx1) / 2, -(fzA + fzB) / 2));
  b.add(extrude(plate, 2, 0.5, 'xz', 6), L.shell, at(0, A.floor - 2, 0));
  perforated(b, L, fx1 - fx0 - 22, fzB - fzA - 22, xf({ p: [(fx0 + fx1) / 2, A.floor - 1.4, (fzA + fzB) / 2], r: [-Q, 0, 0] }), 3, 1.6, 0.8, 2.2);
  for (const x of [fx0 + 30, (fx0 + fx1) / 2, fx1 - 30]) b.add(rbox(8, A.floor - 2 - basin - 2, 8, 2, 2), L.inner, at(x, (A.floor - 2 + basin + 2) / 2, fzB - 8));
  for (const sz of [1, -1]) b.add(rbox(fx1 - fx0 - 10, 2, 10, 0.6, 2), L.inner, at((fx0 + fx1) / 2, basin + 1.5, main + sz * 52.5));

  // Base light: a frosted strip in the plinth's top edge under both glass sides, from the rear left corner round the
  // glass corner to the front right.
  const s = { x0: x0 + 11, x1: x1 - 5.6, z0: z0 + 11, z1: z1 - 5.6, y: plinth / 2 };
  const leftLen = s.x1 - s.x0, frontLen = s.z1 - s.z0;
  b.add(led(rbox(leftLen, 3, 3.2, 1, 2), 0.22, 1), L.led, at((s.x0 + s.x1) / 2, s.y, s.z1 + 0.6), { shadow: false });
  b.add(led(rbox(3.2, 3, frontLen, 1, 2), 0.22, 1), L.led, at(s.x1 + 0.6, s.y, (s.z0 + s.z1) / 2), { shadow: false });
}

// The two glass panels: a tinted sheet, its reflection, a dark fired border on the inside and four low caps.
export function glass(b: Adds, L: Look): void {
  const { basin, trayB, frontIn, glassIn } = A;
  const panels = [
    { m: new THREE.Matrix4(), u0: -225.5, u1: 225.5, inner: glassIn, outer: 145 },
    { m: new THREE.Matrix4().makeRotationY(Q), u0: -glassIn, u1: -trayB, inner: frontIn, outer: 225.5 },
  ];
  for (const p of panels) {
    const w = p.u1 - p.u0, h = 468 - basin, cx = (p.u0 + p.u1) / 2, cy = (basin + 468) / 2, t = p.outer - p.inner;
    const on = (x: THREE.Matrix4) => p.m.clone().multiply(x);
    b.add(fxOf(new THREE.PlaneGeometry(w - 1, h - 1), FX.tint, 0, 0.14), L.fxDark, on(at(cx, cy, p.outer - 0.2)), { shadow: false });
    b.add(fxOf(new THREE.PlaneGeometry(w - 1.2, h - 1.2, 1, 1), FX.glass), L.fx, on(at(cx, cy, p.outer + 0.02)), { shadow: false });
    // Each edge runs where the glass stands free; the rear post covers the left panel's rear edge.
    const edges = [[cx, basin + 0.6, w - 2, 1.2], [cx, 467.4, w - 2, 1.2], [p.u1 - 0.6, cy, 1.2, h - 2]];
    if (p.inner !== glassIn) edges.push([p.u0 + 0.6, cy, 1.2, h - 2]);
    for (const [ex, ey, ew, eh] of edges) {
      b.add(new THREE.BoxGeometry(ew, eh, t - 0.2), L.edge, on(at(ex, ey, (p.inner + p.outer) / 2)), { shadow: false });
      // The light inside the case runs along the glass and shows at its edge as a thin pale line.
      b.add(fxOf(new THREE.PlaneGeometry(Math.max(ew, 2.4), Math.max(eh, 2.4)), FX.flat, 0.95, 0.6), L.fx, on(at(ex, ey, p.outer + 0.06)), { shadow: false });
    }
    // A narrow fired border: a wide one hid the rear fan and the board's edge behind it.
    const border = 8;
    const fr = rrectShape(w - 1.5, h - 1.5, 3, cx, cy);
    fr.holes.push(rrectHole(w - 2 * border, h - 2 * border, 5, cx, cy));
    b.add(extrude(fr, 0.25, 0, 'xy', 6), L.frit, on(at(0, 0, p.inner + 0.05)), { shadow: false });
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const x = cx + sx * (w / 2 - 5), y = cy + sy * (h / 2 - 5);
      b.add(lathe([[0, 0], [3.4, 0], [3.6, 0.3], [3.3, 0.9], [0, 1.0]], 12), L.sinkDark, on(at(x, y, p.outer)), { shadow: false });
    }
  }
}
