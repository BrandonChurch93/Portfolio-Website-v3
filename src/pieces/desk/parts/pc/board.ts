import * as THREE from 'three';
import { seeded } from '../../../../world/build';
import { PI, at, moved, type Adds, cyl, extrude, lathe, led, polyShape, rbox, roundedPoly, rrectHole, rrectShape, xf } from './kit';
import type { Look } from './look';
import { SHEET, printPlane } from './print';

// His Z7 board, an ATX board, brought over from the PC Builder (src/world/parts/board.ts and
// src/world/layout/boards.ts): the regulator's two finned heatsinks with their angled armor, the chokes and capacitors
// beside them, the armored cover over the rear connectors with its light strip, four memory slots with latches,
// reinforced expansion slots, three drive plates, the chipset heatsink, the right angle 24 pin header and the
// processor power header. In board space: x from the rear edge, y down from the top edge (negative), z out of the
// board's front face, which is at z = T.

export const T = 1.6;
export const BOARD = {
  w: 244, h: 305,
  socket: { x: 112, y: -82 },
  eps: { x: 44, y: -8 },
  atx24: { y: -105 },
  dimms: [166, 175.5, 185, 194.5].map((x) => ({ x, y: -84 })),
  pcie: -160,
};
const pitch = 20.32;

// The board's face: traces, pads and vias drawn in code at the size it is seen, under its clear coat.
export function boardSheet(): THREE.CanvasTexture {
  const S = 4, W = BOARD.w * S, H = BOARD.h * S;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#121113'; g.fillRect(0, 0, W, H);
  const r = seeded(77);
  g.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    let x = r() * W, y = r() * H;
    g.strokeStyle = `rgba(${78 + r() * 24}, ${76 + r() * 22}, ${72 + r() * 20}, ${0.3 + r() * 0.3})`;
    g.lineWidth = (0.18 + r() * 0.3) * S;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      const len = (8 + r() * 40) * S;
      const dir = Math.floor(r() * 4) * (PI / 2) + (r() < 0.35 ? PI / 4 : 0);
      x += Math.cos(dir) * len; y += Math.sin(dir) * len;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 900; i++) {
    const x = r() * W, y = r() * H;
    g.fillStyle = `rgba(150, 146, 140, ${0.35 + r() * 0.3})`;
    g.beginPath(); g.arc(x, y, 0.35 * S, 0, PI * 2); g.fill();
    g.fillStyle = 'rgba(10, 7, 5, 0.9)';
    g.beginPath(); g.arc(x, y, 0.15 * S, 0, PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

function heatsink(b: Adds, L: Look, x0: number, x1: number, y0: number, y1: number, h: number, along: 'x' | 'y', seed: number, compact = false): void {
  const w = x1 - x0, d = y0 - y1, base = Math.min(8, h * 0.25);
  b.add(rbox(w, d, base, 0.8, 2), L.sink, at((x0 + x1) / 2, (y0 + y1) / 2, T + base / 2), { uv: 'box' });
  const span = along === 'y' ? d : w, n = Math.max(3, Math.floor(span / 3.3)), finT = 1.4;
  for (let i = 0; i < n; i++) {
    const o = -span / 2 + (span / n) * (i + 0.5);
    const across = along === 'y' ? w : d;
    const prof = polyShape([[-across / 2, 0], [across / 2, 0], [across / 2, h - base - 9], [across / 2 - 6, h - base - 4], [-across / 2, h - base - 4]]);
    const g = extrude(prof, finT, 0.25, 'xy', 2, 1);
    g.translate(0, 0, -finT / 2);
    const m = along === 'y'
      ? new THREE.Matrix4().makeTranslation((x0 + x1) / 2, (y0 + y1) / 2 + o, T + base).multiply(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0)))
      : new THREE.Matrix4().makeTranslation((x0 + x1) / 2 + o, (y0 + y1) / 2, T + base).multiply(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
    b.add(g, L.fin, m, { shadow: false });
  }
  const top = h - 4, r = seeded(seed);
  const cut = compact ? 0.18 : 0.32 + r() * 0.3;
  const a1 = roundedPoly([[x0, y0], [x0 + w * cut + 6, y0], [x0 + w * cut - 6, y1], [x0, y1]], 2.2);
  b.add(extrude(a1, 3.6, 0.7, 'xy', 3, 2), L.sink, at(0, 0, T + top), { uv: 'box' });
  if (!compact) {
    const end = Math.min(x1, x0 + w * (cut + 0.34));
    const a2 = roundedPoly([[x0 + w * cut + 7.2, y0], [end, y0], [end - 10, y1], [x0 + w * cut - 4.8, y1]], 2.2);
    b.add(extrude(a2, 4.0, 0.7, 'xy', 3, 2), L.sink, at(0, 0, T + top - 0.4), { uv: 'box' });
  }
  const capW = w * cut - 6;
  if (capW > 14) for (let i = 0; i < 3; i++) b.add(rbox(Math.min(d * 0.45, capW * 0.5, 12), 0.6, 0.6, 0.2, 1), L.sink, xf({ p: [x0 + capW * (0.3 + i * 0.2), (y0 + y1) / 2, T + top + 3.7], r: [0, 0, -0.9] }));
}

const choke = (b: Adds, L: Look, x: number, y: number) => { b.add(rbox(7.2, 7.2, 5.2, 0.6, 2), L.sinkDark, at(x, y, T + 2.6)); };
const capacitor = (b: Adds, L: Look, x: number, y: number, h = 8, r = 2.6, gold = false) => {
  b.add(lathe([[r, 0], [r, h - 0.6], [r - 0.6, h - 0.2], [0, h - 0.2]], 8), gold ? L.copper : L.sink, at(x, y, T));
};

export function board(parent: Adds, L: Look, m: THREE.Matrix4): void {
  const sub = moved(parent, m);
  const add = sub.add;
  const { w, h } = BOARD;

  add(rbox(w, h, T, 0.4, 1), L.pcb, at(w / 2, -h / 2, T / 2));
  const fp = new THREE.PlaneGeometry(w - 0.4, h - 0.4);
  add(fp, L.board, at(w / 2, -h / 2, T + 0.02), { shadow: false });
  for (const [hx, hy] of [[10.2, -10.2], [157, -10.2], [234, -10.2], [10.2, -165], [157, -165], [234, -165], [10.2, -292], [157, -292], [234, -292]]) {
    add(lathe([[0, 0], [3.4, 0], [3.4, 0.6], [0, 1.4]], 10), L.sinkDark, at(hx, hy, T));
  }

  // The processor's socket frame shows round the pump's plate.
  const sx = BOARD.socket.x, sy = BOARD.socket.y;
  add(rbox(62, 76, 3.2, 1, 2), L.sinkDark, at(sx, sy, T + 1.6));

  // Power delivery: chokes and capacitors beside the socket, and the two heatsinks over them.
  const vr = { x0: 33, x1: 57, y0: -22, y1: -122, h: 38 }, vt = { x0: 60, x1: 152, y0: -12, y1: -34, h: 34 };
  const clear = (x: number, y: number, r: number) => x + r < sx - 31 || x - r > sx + 39 || y + r < sy - 39 || y - r > sy + 41;
  for (let y = vr.y0 - 6; y > vr.y1 + 4; y -= 8.6) {
    if (clear(vr.x1 + 5, y, 3.6)) choke(sub, L, vr.x1 + 5, y);
    if (clear(vr.x1 + 12.5, y, 2.6)) capacitor(sub, L, vr.x1 + 12.5, y, 7.5, 2.4);
  }
  for (let x = vt.x0 + 12; x < vt.x1 - 4; x += 8.6) if (clear(x, vt.y1 - 5, 3.6)) choke(sub, L, x, vt.y1 - 5);
  for (let x = vt.x0 + 16; x < vt.x1 - 6; x += 8.6) if (clear(x, vt.y1 - 11.5, 2.6)) capacitor(sub, L, x, vt.y1 - 11.5, 7.5, 2.4);
  for (const [dx, dy] of [[13, -22], [13, -30.5], [20.5, -22]]) capacitor(sub, L, 194.5 + dx, dy, 7, 2.2);
  for (const y of [-180, -188.5, -250, -258.5, -275]) capacitor(sub, L, 11, y, 9, 2.6, true);
  heatsink(sub, L, vr.x0, vr.x1, vr.y0, vr.y1, vr.h, 'y', 11);
  // The board's light along the regulator's heatsink beside the socket.
  add(led(new THREE.BoxGeometry(1.4, vr.y0 - vr.y1 - 8, 1.6), 0.3, 1.2), L.led, at(vr.x1 + 0.9, (vr.y0 + vr.y1) / 2, T + vr.h - 6), { shadow: false });
  heatsink(sub, L, vt.x0, vt.x1, vt.y0, vt.y1, vt.h, 'x', 12, true);

  // The rear connectors: a shield with the ports in it, and the armored cover over them with its light in the notch.
  const ioTop = 41;
  const shield = rrectShape(ioTop - 2, 148, 1.2, -(T + (ioTop - 2) / 2), -78);
  const ports: [number, number, number][] = [];
  for (const [y, n] of [[-42, 2], [-58, 2], [-106, 2], [-122, 2]] as [number, number][]) for (let k = 0; k < n; k++) ports.push([y, T + 20 + (k ? 7 : -7), 15]);
  for (const y of [-26, -74]) ports.push([y, T + 20, 16]);
  for (const [y, z, pw] of ports) shield.holes.push(rrectHole(pw, 6.6, 0.6, -z, y));
  shield.holes.push(rrectHole(16.8, 14.4, 0.6, -(T + 20), -90));
  add(extrude(shield, 0.8, 0.2, 'zy', 8, 1), L.sinkDark, at(-3.0, 0, 0));
  for (const [y, z, pw] of ports) {
    add(rbox(16, 6.2, pw - 0.4, 0.4, 1), L.sink, at(5, y, z));
    add(new THREE.BoxGeometry(1, 4.6, pw - 2.4), L.void, at(-2.6, y, z), { shadow: false });
  }
  add(rbox(20, 13.8, 16.2, 0.6, 1), L.sink, at(7, -90, T + 20));
  add(new THREE.BoxGeometry(1, 11.2, 12), L.void, at(-2.6, -90, T + 20), { shadow: false });
  for (const z of [T + 9, T + 18, T + 27]) add(cyl(3.2, 12, 'x', 14), L.plastic, at(3.6, -140, z));
  const coverPts: [number, number][] = [[-1, -4], [30, -4], [30, -26], [26, -34], [26, -118], [30, -126], [30, -150], [-1, -150]];
  add(extrude(roundedPoly(coverPts, 1.5), 6, 1.2, 'xy', 4, 2), L.sink, at(0, 0, T + ioTop - 6), { uv: 'box' });
  add(extrude(roundedPoly([[14, -6], [29, -6], [29, -60], [14, -74]], 1), 1.4, 0.5, 'xy', 2, 1), L.copper, at(0, 0, T + ioTop - 0.4), { uv: 'box' });
  add(rbox(30, 146, ioTop - 8, 1, 2), L.sinkDark, at(14.8, -77, T + (ioTop - 8) / 2 + 0.2));
  add(printPlane(48, 10, SHEET.cover), L.print, at(7, -104, T + ioTop + 0.04).multiply(new THREE.Matrix4().makeRotationZ(PI / 2)), { shadow: false });
  add(led(rbox(1.6, 82, 2.2, 0.6, 2), 0.35, 1.4), L.led, at(27.4, -76, T + ioTop - 2.6), { shadow: false });

  // Memory slots with latches.
  for (const d of BOARD.dimms) {
    const len = 146 - 14;
    add(rbox(6.4, len, 9, 0.5, 2), L.plastic, at(d.x, d.y, T + 4.5));
    add(rbox(6.8, len - 10, 1.2, 0.3, 1), L.sinkDark, at(d.x, d.y, T + 0.6));
    for (const end of [1, -1]) {
      add(rbox(6.2, 6.4, 8.6, 0.8, 2), L.plastic, at(d.x, d.y + end * (len / 2 + 3.4), T + 5.3));
      add(rbox(4, 2.2, 2.2, 0.6, 1), L.plastic, at(d.x, d.y + end * (len / 2 + 6.4), T + 8.6));
    }
  }

  // Expansion slots: the first reinforced, as the card's own slot.
  const slots: [number, number, boolean][] = [[BOARD.pcie, 89, true], [BOARD.pcie - 2 * pitch, 89, false], [BOARD.pcie - 4 * pitch, 25, false], [BOARD.pcie - 6 * pitch, 39, false]];
  for (const [y, len, armored] of slots) {
    add(rbox(len, 7.2, 10.6, 0.5, 2), L.plastic, at(22 + len / 2, y, T + 5.3));
    add(new THREE.BoxGeometry(len - 3, 1.6, 0.6), L.void, at(22 + len / 2, y, T + 10.65), { shadow: false });
    if (armored) {
      for (const s of [1, -1]) add(rbox(len + 2, 0.6, 9.6, 0.2, 1), L.sink, at(22 + len / 2, y + s * 3.9, T + 5.4));
      add(rbox(len + 2.6, 8.8, 0.5, 0.2, 1), L.sink, at(22 + len / 2, y, T + 10.5));
    }
    if (len > 80) add(rbox(5, 7.6, 10, 0.8, 2), L.plastic, at(22 + len + 2.6, y, T + 6));
  }

  // The drive plates, each with its grooves and two screws.
  for (const my of [-137, -160 - pitch, -160 - 3 * pitch]) {
    const pw = 94, pd = 25, ph = 7.2;
    const sh = roundedPoly([[0, -pd / 2], [pw - 8, -pd / 2], [pw, -pd / 2 + 8], [pw, pd / 2], [8, pd / 2], [0, pd / 2 - 8]], 1.4);
    add(extrude(sh, ph, 0.9, 'xy', 3, 2), L.sink, at(36, my, T + 1.4), { uv: 'box' });
    for (let k = 0; k < 7; k++) add(rbox(1.1, pd - 4, 0.8, 0.3, 1), L.sinkDark, xf({ p: [36 + 18 + k * 9, my, T + 1.4 + ph + 0.2], r: [0, 0, 0.5] }));
    for (const [ex, ey] of [[40, my + pd / 2 - 4], [36 + pw - 4, my - pd / 2 + 4]]) add(lathe([[0, 0], [2, 0], [2, 0.6], [1.5, 1.0], [0, 1.1]], 12), L.sinkDark, at(ex, ey, T + 1.4 + ph));
  }

  // The chipset heatsink with its raised plate, and a light strip along its edge.
  const cs = { x0: 142, x1: 212, y0: -206, y1: -282, h: 10 };
  add(extrude(roundedPoly([[cs.x0, cs.y0], [cs.x1 - 10, cs.y0], [cs.x1, cs.y0 - 10], [cs.x1, cs.y1], [cs.x0 + 12, cs.y1], [cs.x0, cs.y1 + 12]], 1.4), cs.h - 2, 1.0, 'xy', 3, 2), L.sink, at(0, 0, T), { uv: 'box' });
  const mx = (cs.x0 + cs.x1) / 2, my = (cs.y0 + cs.y1) / 2;
  add(extrude(roundedPoly([[mx - 16, my - 16], [mx + 16, my - 16], [mx + 16, my + 16], [mx - 16, my + 16]], 2), 1.6, 0.5, 'xy', 3, 1), L.sink, at(0, 0, T + cs.h - 2), { uv: 'box' });
  add(led(rbox(1.6, 60, 2, 0.6, 2), 0.25, 0.7), L.led, at(cs.x1 + 1.4, my - 6, T + 4), { shadow: false });

  // The right angle 24 pin header at the board's edge, the processor power header, the drive ports and the cell.
  const hw = 12 * 4.2 + 2.4 + 4.3, hh = 2 * 4.2 + 2.4 + 4.3;
  add(rbox(12, hw, hh, 0.6, 2), L.plastic, at(w - 6, BOARD.atx24.y, T + hh / 2));
  add(new THREE.BoxGeometry(0.4, hw - 5, hh - 5), L.void, at(w + 0.05, BOARD.atx24.y, T + hh / 2), { shadow: false });
  add(rbox(21.2, 10.2, 13, 0.6, 2), L.plastic, at(BOARD.eps.x, BOARD.eps.y, T + 6.5));
  for (const y of [-212, -228, -244]) add(rbox(10, 14, 12, 0.6, 2), L.plastic, at(w - 5, y, T + 6));
  add(lathe([[0, 0], [10, 0], [10, 3.2], [0, 3.2]], 24), L.sinkDark, at(122, -290, T));
  add(lathe([[0, 0], [8, 0], [8, 0.4], [0, 0.4]], 24), L.sink, at(122, -290, T + 3.2));

  // Small chips scattered over the bare board.
  const r = seeded(9);
  for (let i = 0; i < 40; i++) {
    const x = 70 + r() * 160, y = -140 - r() * 160;
    if (x > cs.x0 - 4 && y < cs.y0 + 4) continue;
    if (y > -232 && y < -150 && x < 130) continue;
    const s = 2 + r() * 5;
    add(rbox(s, s * (0.6 + r() * 0.6), 0.9, 0.2, 1), L.plastic, at(x, y, T + 0.45));
  }
}
