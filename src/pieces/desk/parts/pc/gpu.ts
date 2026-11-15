import * as THREE from 'three';
import { PI, type Adds, at, circleHole, circleShape, cyl, extrude, lathe, led, moved, polyHole, rbox, roundedPoly, rrectHole, torus, xf } from './kit';
import { FX, fxOf, type Look } from './look';
import { SHEET, printPlane } from './print';

// His Crest, the flagship Veltrin card, brought over from the PC Builder (src/world/parts/gpu.ts, veltrin()): a shroud
// with a chamfered end and three fans in a brushed armor plate with crowned notches, a window onto the fin stack in the
// edge that faces the glass, a doubled light bar along that edge, the backplate with its vents, X brace and lit ring,
// copper heat pipes through the fins, and the power socket. In card space: x along the card from the slot's start, y
// up through the card (its fans face -y), z out from the board toward the glass.

const FINGER = 28, SEAT = 2, CLEAR = 13, BP = 5;
export const CARD = (() => {
  const length = 372, height = 142, thick = 71, fans = 3;
  const back = -FINGER, L = length, H = height - SEAT, T = thick, end = L + back;
  const span = end - back - 24;
  const fanR = Math.min((H - (CLEAR - SEAT)) / 2 - 7, span / fans / 2 - 3, 52);
  const fanX = Array.from({ length: fans }, (_, i) => back + 12 + span * ((i + 0.5) / fans));
  return { L, H, T, back, end, bp: BP, clear: CLEAR - SEAT, fanY: -(T - BP), pcbTop: Math.min(H - 9, 124), pcbEnd: Math.min(end - 4, back + Math.max(170, L * 0.68)), slots: 4, fanR, fanX };
})();
const SOCKET_W = 20.6;

const XZ = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
const xzAt = (y: number) => new THREE.Matrix4().makeTranslation(0, y, 0).multiply(XZ);

// Where a fan of the card is, in card space: the matrix its rotor turns in.
export const cardFanAt = (i: number) => xf({ p: [CARD.fanX[i], CARD.fanY + 6, (CARD.clear + CARD.H) / 2], r: [-PI / 2, 0, 0] });
// Where the power socket is, in card space, and which way its plug leaves.
export const SOCKET = { x: Math.min(CARD.pcbEnd - 26, CARD.back + CARD.L * 0.62), y: -8.2, z: CARD.H - 1.6 + 0.5 };

export function gpu(parent: Adds, L: Look, m: THREE.Matrix4): void {
  const b = moved(parent, m);
  const c = CARD, mid = (c.clear + c.H) / 2;

  // The board, its edge connector and the parts along its top edge.
  const o: [number, number][] = [[c.back + 1, 3], [-1.5, 3], [-1.5, 0.6], [0, 0], [89, 0], [90.5, 0.6], [90.5, 3], [c.pcbEnd, 3], [c.pcbEnd, c.pcbTop], [c.back + 1, c.pcbTop]];
  b.add(extrude(roundedPoly(o, 0.4), 1.6, 0.2, 'xy', 4), L.pcb, xzAt(0.8));
  b.add(new THREE.BoxGeometry(86, 0.1, 7), L.copper, at(45, 0.85, 3.8));

  // The bracket at the slot end: ports and slanted vents.
  {
    const y0 = c.bp - c.slots * 20.32, y1 = c.bp;
    const s = roundedPoly([[-9, y0 + 3], [-2, y0 + 3], [-1, y0 + 1.5], [112, y0 + 1.5], [112, y1 - 0.5], [-1, y1 - 0.5], [-2, y0 + 11], [-9, y0 + 11]], 0.8);
    const ports: [number, number, number, number][] = [];
    for (let i = 0; i < 4; i++) ports.push([18 + i * 19, -9, i === 3 ? 15 : 17.5, i === 3 ? 6.2 : 5.4]);
    for (const [pz, py, pw, ph] of ports) s.holes.push(rrectHole(pw + 1.6, ph + 1.6, 1.2, pz, py));
    for (let rr = 0; rr < 3; rr++) {
      const cy = y0 + (rr + 0.5) * (y1 - y0 - 22) / 3;
      for (let k = 0; k < 8; k++) { const z0 = 8 + k * 12; s.holes.push(polyHole([[z0, cy - 4.5], [z0 + 6, cy - 4.5], [z0 + 9, cy + 4.5], [z0 + 3, cy + 4.5]])); }
    }
    const turn = new THREE.Matrix4().makeTranslation(c.back + 1, 0, 0).multiply(new THREE.Matrix4().set(0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    b.add(extrude(s, 1, 0.3, 'xy', 4, 1), L.sinkDark, turn);
    for (const [pz, py, pw, ph] of ports) {
      b.add(rbox(14, ph + 1.2, pw + 1.2, 0.5, 1), L.sink, at(c.back + 6.7, py, pz));
      b.add(new THREE.BoxGeometry(12, ph - 1.4, pw - 2), L.void, at(c.back + 7.4, py, pz), { shadow: false });
    }
  }

  // The shroud's fan face: a plate with three openings, a bezel round each, ribs between them, the brushed armor and
  // its lips, and the end's accent.
  const ch = Math.min(46, c.H * 0.34), plateT = 3.2;
  const outline: [number, number][] = [[c.back + 2, c.clear + 6], [c.back + 8, c.clear], [c.end - 34, c.clear], [c.end, c.clear + ch], [c.end, c.H - ch * 0.7], [c.end - ch * 0.9, c.H], [c.back + 12, c.H], [c.back + 2, c.H - 10]];
  const plate = roundedPoly(outline, 1.2);
  for (const fx of c.fanX) plate.holes.push(circleHole(fx, mid, c.fanR + 1.6));
  b.add(extrude(plate, plateT, 0.9, 'xy', 40, 2), L.satin, xzAt(c.fanY + plateT));
  for (const fx of c.fanX) {
    const bez = circleShape(c.fanR + 6);
    bez.holes.push(circleHole(0, 0, c.fanR + 1.6));
    b.add(extrude(bez, 2.2, 0.8, 'xy', 40, 2), L.sinkDark, xzAt(c.fanY).multiply(new THREE.Matrix4().makeTranslation(fx, mid, 0)));
  }
  for (let i = 0; i < c.fanX.length - 1; i++) {
    const xm = (c.fanX[i] + c.fanX[i + 1]) / 2;
    b.add(extrude(roundedPoly([[xm - 4, c.clear + 4], [xm + 2, c.clear + 4], [xm + 7, c.H - 4], [xm + 1, c.H - 4]], 1), 2.4, 0.7, 'xy', 4, 2), L.sink, xzAt(c.fanY));
  }
  {
    const m0 = c.fanX[0] - c.fanR - 9.5, r0 = mid - c.fanR - 9.5, r1 = mid + c.fanR + 9.5;
    const hr = Math.min(c.fanR + 6.4, (c.fanX[1] - c.fanX[0]) / 2 - 2.5);
    const gaps = c.fanX.slice(1).map((fx, i) => (fx + c.fanX[i]) / 2), depth = 9;
    const lower = gaps.flatMap((g) => [[g - 10, r0], [g, r0 + depth], [g + 10, r0]] as [number, number][]);
    const upper = [...gaps].reverse().flatMap((g) => [[g + 10, r1], [g, r1 - depth], [g - 10, r1]] as [number, number][]);
    const ea = c.end - 34 - 3, eb = c.end - ch * 0.9 - 3;
    const farEnd: [number, number][] = [[ea, r0], [c.end - 3, c.clear + ch - 2], [c.end - 3, c.H - ch * 0.7 + 2], [eb, r1]];
    const fr = roundedPoly([[m0, r0], ...lower, ...farEnd, ...upper, [m0, r1]], 2);
    for (const fx of c.fanX) fr.holes.push(circleHole(fx, mid, hr));
    b.add(extrude(fr, 1.2, 0.4, 'xy', 32, 1), L.sink, xzAt(c.fanY - 0.1), { uv: 'box' });
    for (const fx of c.fanX) b.add(torus(hr + 0.8, 0.8, 6, 64), L.sink, xzAt(c.fanY - 0.6).multiply(new THREE.Matrix4().makeTranslation(fx, mid, 0)));
  }
  b.add(extrude(roundedPoly([[c.end - 30, c.clear + 3], [c.end - 3, c.clear + ch], [c.end - 3, c.H - ch * 0.7 - 1], [c.end - ch * 0.9 + 2, c.H - 4], [c.end - ch * 0.9 - 6, c.H - 4], [c.end - 20, c.H - ch * 0.7 - 6], [c.end - 20, c.clear + 10]], 1), 1.6, 0.5, 'xy', 4, 1), L.sink, xzAt(c.fanY - 0.2));

  // The walls: the glass facing edge with its window onto the fins and the socket's cutout, the board side, the end.
  const wallY0 = c.fanY + plateT, wallY1 = -2, sideH = wallY1 - wallY0;
  const glassSide = roundedPoly([[c.back + 12, 0], [c.end - ch * 0.9, 0], [c.end - ch * 0.9 + 2, sideH * 0.55], [c.end - ch * 0.9, sideH], [c.back + 12, sideH]], 1.2);
  glassSide.holes.push(polyHole([[c.back + 34, 3.2], [c.end - 46, 3.2], [c.end - 40, sideH * 0.42], [c.back + 28, sideH * 0.42]]));
  glassSide.holes.push(rrectHole(SOCKET_W + 3, 8.6, 1.2, SOCKET.x, sideH - 6.2));
  b.add(extrude(glassSide, 2.6, 0.7, 'xy', 4, 2), L.satin, at(0, wallY0, c.H - 2.6));
  const boardSide = roundedPoly([[c.back + 8, 0], [c.end - 34, 0], [c.end - 34, sideH], [c.back + 8, sideH]], 1.2);
  boardSide.holes.push(polyHole([[c.back + 30, 3], [c.end - 50, 3], [c.end - 50, sideH * 0.5], [c.back + 30, sideH * 0.5]]));
  b.add(extrude(boardSide, 2.4, 0.6, 'xy', 4, 2), L.satin, at(0, wallY0, c.clear));
  b.add(rbox(3.2, sideH, c.H - c.clear - ch * 1.7 + 2, 1, 2), L.satin, at(c.end - 1.6, (wallY0 + wallY1) / 2, (c.clear + ch + c.H - ch * 0.7) / 2));
  for (const [x0, z0, x1, z1] of [[c.end - ch * 0.9, c.H, c.end, c.H - ch * 0.7], [c.end - 34, c.clear, c.end, c.clear + ch], [c.back + 2, c.H - 10, c.back + 12, c.H]]) {
    const len = Math.hypot(x1 - x0, z1 - z0), th = Math.atan2(z1 - z0, x1 - x0);
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    let nx = (z1 - z0) / len, nz = -(x1 - x0) / len;
    if (nx * (mx - (c.back + c.end) / 2) + nz * (mz - mid) > 0) { nx = -nx; nz = -nz; }
    b.add(rbox(len + 1.5, sideH, 2.6, 0.8, 2), L.satin, xf({ p: [mx + nx * 1.3, (wallY0 + wallY1) / 2, mz + nz * 1.3], r: [0, -th, 0] }));
  }

  // The fin stack and the copper pipes through it.
  {
    const x0 = c.back + 10, x1 = c.end - ch - 2, n = Math.floor((x1 - x0) / 1.9);
    const y0 = c.fanY + plateT + 1.5, y1 = -6.5, z0 = c.clear + 3, z1 = c.H - 5;
    for (let i = 0; i < n; i++) b.add(new THREE.BoxGeometry(0.42, y1 - y0, z1 - z0), L.fin, at(x0 + i * 1.9, (y0 + y1) / 2, (z0 + z1) / 2), { shadow: false });
    // The stack runs on under the flow through cut in the backplate, short of the chamfered end.
    for (let x = x0 + n * 1.9; x < c.end - 6; x += 1.9) b.add(new THREE.BoxGeometry(0.42, y1 - y0, c.H - 26 - c.clear - 18), L.fin, at(x, (y0 + y1) / 2, (c.clear + 18 + c.H - 26) / 2), { shadow: false });
    for (let i = 0; i < 5; i++) {
      const z = c.clear + 14 + ((c.H - 18 - c.clear - 14) * (i + 0.5)) / 5;
      const a = c.back + 22, e = c.end - ch - 6;
      b.add(cyl(3, e - a, 'x', 10), L.copper, at((a + e) / 2, -16, z));
    }
  }

  // The bar's light on the fins seen through the window under it: each fin's edge lit, brightest at the window's top
  // and gone at its foot, so the gaps between fins stay dark.
  {
    const x0 = c.back + 10, x1 = c.end - ch - 2, n = Math.floor((x1 - x0) / 1.9);
    const ya = wallY0 + 3.2, yb = wallY0 + sideH * 0.42, wa = c.back + 30, wb = c.end - 42;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 1.9;
      if (x < wa || x > wb) continue;
      const g = new THREE.BoxGeometry(0.5, yb - ya, 0.6);
      led(g, 0, 0);
      const p = g.getAttribute('position'), cell = g.getAttribute('cell');
      for (let k = 0; k < p.count; k++) { const up = (p.getY(k) + (yb - ya) / 2) / (yb - ya); cell.setXY(k, 0.5 + 0.4 * ((x - wa) / (wb - wa)), 0.5 * up * up); }
      b.add(g, L.led, at(x, (ya + yb) / 2, c.H - 4.9), { shadow: false });
    }
  }

  // The fans' still parts: the duct ring, the rim and the hub with its cap.
  for (const fx of c.fanX) {
    const f = xf({ p: [fx, c.fanY + 6, mid], r: [-PI / 2, 0, 0] });
    b.add(torus(c.fanR + 0.6, 1.0, 4, 48), L.sinkDark, f.clone().multiply(at(0, 0, -2.2)));
    b.add(lathe([[c.fanR + 0.2, -4.5], [c.fanR + 1.2, -4.5], [c.fanR + 1.2, 6], [c.fanR + 0.2, 6]], 48), L.satin, f);
    const hub = Math.max(12, c.fanR * 0.3);
    b.add(lathe([[0, -3.4], [hub - 2.5, -3.4], [hub, -2.2], [hub, 6.5], [0, 6.5]], 32), L.plastic, f);
    b.add(cyl(hub - 2.6, 0.3, 'z', 32), L.sinkDark, f.clone().multiply(at(0, 0, -3.55)));
  }

  // The backplate: vents, the flow through cut at its end, the X brace and the lit ring.
  const bpY = 2.2, bpT = 2.0;
  {
    const bpo: [number, number][] = [[c.back + 2, c.clear + 2], [c.end - 30, c.clear + 2], [c.end, c.clear + ch], [c.end, c.H - ch * 0.7], [c.end - ch * 0.9, c.H], [c.back + 12, c.H], [c.back + 2, c.H - 10]];
    const bp = roundedPoly(bpo, 1.6);
    const cutX0 = Math.max(c.pcbEnd + 4, c.end - 72);
    bp.holes.push(polyHole([[cutX0, c.clear + 18], [c.end - 16, c.clear + 28], [c.end - 16, c.H - 22], [cutX0 + 8, c.H - 22]]));
    for (let x = c.back + 120; x + 10 < cutX0 - 12; x += 13) bp.holes.push(polyHole([[x, c.H - 30], [x + 6, c.H - 30], [x + 14, c.H - 10], [x + 8, c.H - 10]]));
    b.add(extrude(bp, bpT, 0.6, 'xy', 6, 2), L.sink, xzAt(bpY + bpT), { uv: 'box' });
    const core: [number, number] = [c.back + 78, mid - 4];
    const arm = 30.5, half = 4.5, k = Math.SQRT1_2;
    const plus: [number, number][] = [[-arm, -half], [-half, -half], [-half, -arm], [half, -arm], [half, -half], [arm, -half], [arm, half], [half, half], [half, arm], [-half, arm], [-half, half], [-arm, half]];
    b.add(extrude(roundedPoly(plus.map(([x, y]) => [k * (x - y), k * (x + y)] as [number, number]), 2.2), 1.2, 0.3, 'xy', 4, 1), L.sinkDark, xzAt(bpY + bpT + 1.2).multiply(new THREE.Matrix4().makeTranslation(core[0], core[1], 0)));
    for (const [x, z] of [[c.back + 10, c.clear + 8], [c.back + 10, c.H - 8], [c.pcbEnd - 8, c.clear + 8], [c.pcbEnd - 8, c.H - 8], [core[0] - 18.6, core[1] - 18.6], [core[0] + 18.6, core[1] - 18.6], [core[0] - 18.6, core[1] + 18.6], [core[0] + 18.6, core[1] + 18.6]]) {
      b.add(lathe([[0, 0], [1.9, 0], [1.9, 0.35], [0, 1.0]], 8), L.sinkDark, xf({ p: [x, bpY + bpT, z], r: [-PI / 2, 0, 0] }));
    }
    const rc = [core[0] + 70, mid] as const;
    b.add(led(torus(22, 1.3, 6, 64), 0.12, 1.1), L.led, xf({ p: [rc[0], bpY + bpT + 0.6, rc[1]], r: [PI / 2, 0, 0] }), { shadow: false });
    b.add(torus(24.6, 1.0, 6, 64), L.copper, xf({ p: [rc[0], bpY + bpT + 0.4, rc[1]], r: [PI / 2, 0, 0] }));
    // The ring's light on the plate round it.
    b.add(fxOf(new THREE.PlaneGeometry(76, 76), FX.ring, 0.12, 0.4, 0.58), L.fx, xf({ p: [rc[0], bpY + bpT + 0.08, rc[1]], r: [-PI / 2, 0, 0] }), { shadow: false });
    // Two raised lines run the plate's length, and the badge sits between them past the ring.
    for (const z of [c.clear + 13, c.H - 36]) b.add(rbox(cutX0 - 14 - (c.back + 40), 0.9, 1.6, 0.4, 1), L.sinkDark, at((c.back + 40 + cutX0 - 14) / 2, bpY + bpT + 0.45, z));
    b.add(rbox(112, 0.8, 30, 0.4, 1), L.sinkDark, at(205, bpY + bpT + 0.4, (c.clear + c.H - 36) / 2 + 3));
    b.add(printPlane(106, 26.5, SHEET.badge), L.print, xf({ p: [205, bpY + bpT + 0.85, (c.clear + c.H - 36) / 2 + 3], r: [-PI / 2, 0, 0] }), { shadow: false });
  }

  // The doubled light bar along the glass facing edge, stopping short of the socket, each line on a brushed rail.
  {
    const barZ = c.H + 0.1, by = wallY0 + sideH * 0.78;
    const x0 = c.back + 16, x1 = c.end - ch * 0.9 - 6;
    const a = SOCKET.x - SOCKET_W / 2 - 12, e = SOCKET.x + SOCKET_W / 2 + 25;
    for (const [s0, s1] of [[x0, Math.min(x1, a)], [Math.max(x0, e), x1]]) {
      if (s1 - s0 < 6) continue;
      const g = rbox(s1 - s0, 3.4, 2.4, 1.0, 2), p = g.getAttribute('position');
      led(g, 0, 0.7);
      const cell = g.getAttribute('cell');
      for (let i = 0; i < p.count; i++) cell.setX(i, 0.55 + 0.4 * ((p.getX(i) + (s0 + s1) / 2 - x0) / (x1 - x0)));
      b.add(g, L.led, at((s0 + s1) / 2, by, barZ), { shadow: false });
      const g2 = rbox(s1 - s0, 1.4, 1.8, 0.6, 2), p2 = g2.getAttribute('position');
      led(g2, 0, 0.55);
      const cell2 = g2.getAttribute('cell');
      for (let i = 0; i < p2.count; i++) cell2.setX(i, 0.45 + 0.4 * ((p2.getX(i) + (s0 + s1) / 2 - x0) / (x1 - x0)));
      b.add(g2, L.led, at((s0 + s1) / 2, by - 5.4, barZ), { shadow: false });
      b.add(rbox(s1 - s0 + 4, 5.6, 1.2, 0.5, 2), L.sink, at((s0 + s1) / 2, by, barZ - 1));
      b.add(rbox(s1 - s0 + 3, 3.0, 1.2, 0.5, 2), L.sink, at((s0 + s1) / 2, by - 5.4, barZ - 1));
    }
    // The bar's light on the shroud under it, gone before the window.
    b.add(fxOf(new THREE.PlaneGeometry(x1 - x0, 12), FX.fade, 0.6, 0.35), L.fx, xf({ p: [(x0 + x1) / 2, by - 6 - 6, c.H + 0.14], r: [0, 0, PI] }), { shadow: false });
    // The name on the edge: printed dim, and lit when the card is.
    const wx = c.back + 84, wy = wallY0 + sideH * 0.555;
    b.add(printPlane(56, 14, SHEET.side), L.print, at(wx, wy, c.H + 0.08), { shadow: false });
    b.add(fxOf(printPlane(56, 14, SHEET.glow), FX.text, 0.7, 0.9), L.fx, at(wx, wy, c.H + 0.16), { shadow: false });
    const ry = wallY0 + sideH * 0.94;
    for (const [s0, s1] of [[c.back + 16, SOCKET.x - SOCKET_W / 2 - 14], [SOCKET.x + SOCKET_W / 2 + 28, c.end - ch * 0.9 - 6]]) if (s1 - s0 > 8) b.add(rbox(s1 - s0, 2.2, 1.0, 0.4, 2), L.sink, at((s0 + s1) / 2, ry, c.H + 0.3));
  }

  // The power socket in its cutout, on a small riser board.
  {
    const z = c.H - 1.6;
    b.add(rbox(SOCKET_W, 10, 8, 0.6, 1), L.plastic, at(SOCKET.x, -8.2, z - 4));
    b.add(rbox(SOCKET_W + 3, 1.6, 8, 0.3, 1), L.pcb, at(SOCKET.x, -3.4, z - 10));
    for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) b.add(new THREE.BoxGeometry(2.2, 2.2, 1), L.void, at(SOCKET.x + (k - 2.5) * 3, -7.4 + (r - 0.5) * 3.15, z - 0.48), { shadow: false });
  }
}

// The post under the far end of the card, from the floor up to a padded cradle.
export function support(parent: Adds, L: Look, x: number, y0: number, y1: number, z: number): void {
  const h = Math.max(20, y1 - y0);
  const b = moved(parent, at(x, y0, z));
  b.add(cyl(9, 3, 'y', 24), L.sinkDark, at(0, 1.5, 0));
  b.add(cyl(6, 4, 'y', 24), L.sinkDark, at(0, 5, 0));
  b.add(cyl(3.2, h - 12, 'y', 16), L.sink, at(0, 7 + (h - 12) / 2, 0));
  b.add(cyl(4.6, 3, 'y', 16), L.sinkDark, at(0, h - 4.5, 0));
  b.add(rbox(18, 2.2, 14, 0.8, 2), L.rubber, at(0, h - 1.1, 0));
}
