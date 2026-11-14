import * as THREE from 'three';
import { Builder, at, cyl, lathe, rbox, xf } from '../world/build';
import type { Mats } from './materials';

// The desk for Skills as a rough draft: A · Bench, which he picked from three, with the scene on it roughed in after
// his notes. Millimetres, under a root scaled by 0.001. The top's surface is y = 0, its front edge is at z = D / 2 and
// the viewer stands at +z.
export const DESK = { W: 2000, D: 780, H: 740, SCALE: 0.001 } as const;
const { W, D, H } = DESK;
const FRONT = D / 2, FLOOR = -H;

// Where the stream rides the front edge, on the corner of the bronze angle: how far above the top, and how far out
// from the middle.
export const EDGE: [y: number, z: number] = [3.6, FRONT + 1];
// Where it lands on that edge, measured from the middle of the desk. The fuller draft has it at 1.12 m from the left.
export const LAND = 120;

// Where the PC stands under the far end.
export const BAY = { l: 440, r: 730, back: -205, front: 265, h: 492 } as const;
// The desk mat: most of the top, from near the front edge back to just short of the monitor's foot.
export const MAT = { w: 1600, d: 478, x: 0, z: 124, h: 4 } as const;
// The ultrawide: 38 inches, curved, its foot behind the mat.
export const SCREEN = { x: -60, z: -262, w: 900, h: 384, low: 118, curve: 1800 } as const;

// A flat slab with rounded corners: w along x, d along z, from y = -h up to y = 0.
function slab(w: number, d: number, r: number, h: number, bev = 2): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2);
  s.lineTo(w / 2 - r, -d / 2); s.absarc(w / 2 - r, -d / 2 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(w / 2, d / 2 - r); s.absarc(w / 2 - r, d / 2 - r, r, 0, Math.PI / 2, false);
  s.lineTo(-w / 2 + r, d / 2); s.absarc(-w / 2 + r, d / 2 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-w / 2, -d / 2 + r); s.absarc(-w / 2 + r, -d / 2 + r, r, Math.PI, 1.5 * Math.PI, false);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.01, h - 2 * bev), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 3, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bev - h, 0);
  return g;
}

// The knob he chose for the sleeping card, as a thing: a stem, a rolled rim, a ring of beads, a moulding, and a
// domed face with a rosette, eight petals over eight leaves round a boss. It stands out from a face that looks at +z.
function knob(b: Builder, M: Mats, x: number, y: number, z: number, k = 1, stem = true): void {
  const face = xf({ p: [x, y, z], r: [Math.PI / 2, 0, 0], s: k });
  const on = (m: THREE.Matrix4) => m.clone().premultiply(face);
  const lift = stem ? 0 : -16;
  const profile: [number, number][] = stem
    ? [[0, 0], [14, 0], [15, 1.5], [13.5, 3], [7, 4.2], [6, 12], [10, 14.5], [17, 17], [19.6, 19.4], [20.2, 21.5], [19.4, 23.5], [17.8, 24.3], [16.8, 23.6], [14.8, 23.6], [13.8, 24.6], [12.4, 25.6], [10, 27], [6, 28.6], [2.5, 29.3], [0, 29.4]]
    : [[0, 0], [19, 0], [20.2, 1.6], [20.2, 5.5], [19.4, 7.5], [17.8, 8.3], [16.8, 7.6], [14.8, 7.6], [13.8, 8.6], [12.4, 9.6], [10, 11], [6, 12.6], [2.5, 13.3], [0, 13.4]];
  b.add(lathe(profile, 48), M.cast, face);
  const bead = new THREE.SphereGeometry(1.45, 10, 8);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; b.add(bead, M.cast, on(at(Math.cos(a) * 15.8, 24.4 + lift, Math.sin(a) * 15.8))); }
  const petal = new THREE.SphereGeometry(1, 12, 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, c = a + Math.PI / 8;
    b.add(petal, M.cast, on(xf({ p: [Math.cos(a) * 5.6, 28.6 + lift, Math.sin(a) * 5.6], r: [0, -a, 0], s: [3.3, 1, 1.7] })));
    b.add(petal, M.cast, on(xf({ p: [Math.cos(c) * 8.9, 27.3 + lift, Math.sin(c) * 8.9], r: [0, -c, 0], s: [2.6, 0.8, 1.3] })));
  }
  b.add(new THREE.SphereGeometry(2.5, 14, 10), M.cast, on(at(0, 29.4 + lift, 0)));
}

// A slotted screw head on a face that looks at +z.
function screwAt(b: Builder, M: Mats, x: number, y: number, z: number): void {
  b.add(lathe([[0, 1.5], [3, 1.3], [4.4, 0.5], [4.6, 0]], 16), M.bronze, xf({ p: [x, y, z], r: [Math.PI / 2, 0, 0] }));
  b.add(rbox(7.6, 0.9, 0.8, 0.2), M.coal, at(x, y, z + 1.3));
}

// The joiner's bench.
function bench(b: Builder, M: Mats): void {
  const T = 64;
  b.add(slab(W, D, 5, T, 3.5), M.top);
  for (const z of [-195, 0, 195]) b.add(new THREE.BoxGeometry(W - 10, 0.3, 0.5), M.coal, at(0, 0.02, z));
  // The bronze angle over the front edge, its leg screwed to the slab's face.
  b.add(rbox(W - 36, 3, 30, 1), M.edge, at(0, 0.9, FRONT - 13.6));
  b.add(rbox(W - 36, 36, 3, 1), M.edge, at(0, -16.5, FRONT + 1.2));
  for (let i = 0; i < 12; i++) screwAt(b, M, -W / 2 + 90 + i * ((W - 180) / 11), -24, FRONT + 2.6);
  for (const s of [-1, 1]) {
    const x = s * 800;
    b.add(rbox(84, 86, 700, 5), M.cross, at(x, -T - 43, 0));
    for (const z of [-250, 250]) b.add(rbox(74, 532, 74, 4), M.post, at(x, -T - 86 - 266, z));
    b.add(rbox(88, 58, 760, 6), M.cross, at(x, FLOOR + 29, 0));
    // The stretcher's tenon comes through the back post and is held by a bronze wedge.
    b.add(rbox(12, 74, 16, 2), M.edge, xf({ p: [s * 857, -505, -250], r: [0, 0, s * 0.07] }));
  }
  b.add(rbox(1750, 112, 38, 4), M.top, at(0, -505, -250));
  // Two drawers in a case hung under the slab.
  const l = -700, r = -120, bottom = -T - 132;
  for (const x of [l + 9, r - 9]) b.add(rbox(18, 132, 500, 2), M.cross, at(x, -T - 66, FRONT - 20 - 250));
  b.add(rbox(r - l, 14, 500, 2), M.top, at((l + r) / 2, bottom + 7, FRONT - 20 - 250));
  const w = (r - l - 36 - 8) / 2;
  for (const i of [0, 1]) {
    const x = l + 18 + w / 2 + i * (w + 8);
    b.add(rbox(w, 106, 20, 2.5), M.top, at(x, -T - 6 - 53, FRONT - 20));
    knob(b, M, x, -T - 6 - 53, FRONT - 10);
  }
}

// The mat: a dark hide with a line of copper stitching just inside its edge.
function mat(b: Builder, M: Mats): void {
  const { w, d, x, z, h } = MAT;
  b.add(slab(w, d, 16, h, 1), M.hide, at(x, h, z));
  for (const dz of [-d / 2 + 7, d / 2 - 7]) b.add(rbox(w - 40, 0.7, 1.3, 0.3), M.edge, at(x, h + 0.2, z + dz), { shadow: false });
  for (const dx of [-w / 2 + 7, w / 2 - 7]) b.add(rbox(1.3, 0.7, d - 40, 0.3), M.edge, at(x + dx, h + 0.2, z), { shadow: false });
}

// Bends a flat thing that faces +z into the monitor's curve, its ends coming toward the viewer.
function curve(g: THREE.BufferGeometry, r: number): THREE.BufferGeometry {
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const a = p.getX(i) / r, z = p.getZ(i);
    p.setXYZ(i, (r - z) * Math.sin(a), p.getY(i), r - (r - z) * Math.cos(a));
  }
  g.computeVertexNormals();
  return g;
}

// What the ultrawide shows: an editor beside a drawing of the city, as plain shapes. A stand in for a real screen.
function screenTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2560; c.height = 1072;
  const g = c.getContext('2d')!;
  const ink = ['#f4ede5', '#e3a567', '#f78e1e', '#96897b', '#c9803d'];
  g.fillStyle = '#0a0705'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#140d09'; g.fillRect(0, 0, c.width, 54); g.fillRect(0, 0, 300, c.height);
  for (let i = 0; i < 4; i++) { g.fillStyle = i === 1 ? '#2a1a0f' : '#1a110b'; g.fillRect(320 + i * 230, 8, 210, 46); g.fillStyle = ink[3]; g.fillRect(340 + i * 230, 26, 110 + (i % 2) * 40, 10); }
  for (let i = 0; i < 22; i++) { g.fillStyle = i === 6 ? ink[2] : '#3a2a1f'; g.fillRect(36 + (i % 5 === 0 ? 0 : 28), 90 + i * 40, 120 + ((i * 53) % 110), 12); }
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let row = 0; row < 23; row++) {
    const y = 96 + row * 40, indent = [0, 1, 2, 2, 3, 2, 1, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 2, 3, 2, 1, 1, 0][row];
    g.fillStyle = '#4a3a2c'; g.fillRect(332, y + 2, 26, 10);
    if (row === 13) continue;
    let x = 400 + indent * 44;
    for (let k = 0, n = 2 + Math.floor(rnd() * 4); k < n; k++) { const w = 50 + rnd() * 190; g.fillStyle = ink[Math.floor(rnd() * ink.length)]; g.globalAlpha = 0.9; g.fillRect(x, y, w, 14); x += w + 18; }
    g.globalAlpha = 1;
  }
  g.fillStyle = '#100a07'; g.fillRect(1560, 54, 1000, c.height - 54);
  g.strokeStyle = ink[2]; g.lineWidth = 3;
  for (let i = 1; i <= 5; i++) { g.globalAlpha = 1 - i * 0.15; g.beginPath(); g.ellipse(2060, 700, i * 76, i * 26, 0, 0, Math.PI * 2); g.stroke(); }
  g.globalAlpha = 1;
  for (let i = -4; i <= 4; i++) { const h = 330 - Math.abs(i) * 58 + ((i * 37) % 30); g.fillStyle = i === 0 ? ink[1] : ink[2]; g.globalAlpha = i === 0 ? 1 : 0.75; g.fillRect(2060 + i * 30 - 7, 690 - h, 14, h); }
  g.globalAlpha = 1;
  g.fillStyle = '#2a1a0f'; g.fillRect(0, c.height - 34, c.width, 34);
  g.fillStyle = ink[2]; g.fillRect(24, c.height - 23, 150, 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// The ultrawide monitor: a curved panel on a neck and a flat foot.
function monitor(b: Builder, M: Mats, glass: THREE.Material): void {
  const { x, z, w, h, low, curve: r } = SCREEN, mid = low + h / 2, put = (g: THREE.BufferGeometry, m: THREE.Material, dz = 0, opts?: { shadow?: boolean; uv?: 'keep' }) => b.add(curve(g, r), m, at(x, mid, z + dz), opts);
  put(new THREE.BoxGeometry(w, h, 13, 48, 1, 1), M.coal);
  put(new THREE.BoxGeometry(w * 0.5, h * 0.62, 30, 24, 1, 1), M.steel, -18);
  put(new THREE.PlaneGeometry(w - 14, h - 26, 48, 1).translate(0, 6, 6.9), glass, 0, { shadow: false, uv: 'keep' });
  put(new THREE.BoxGeometry(46, 3, 2, 4, 1, 1).translate(0, -h / 2 + 7, 7), M.ember, 0, { shadow: false });
  b.add(rbox(64, low + 150, 26, 6), M.steel, xf({ p: [x, (low + 150) / 2, z - 34], r: [-0.07, 0, 0] }));
  b.add(slab(330, 210, 26, 9, 1.5), M.steel, at(x, 9, z + 4));
}

// A 75 percent gaming keyboard, wireless: a low metal case, dark caps with a few in copper, a dial, and light under
// the keys that runs across them as a wave.
function keyboard(b: Builder, M: Mats, glow: THREE.Material, halo: THREE.Material, x: number, z: number): void {
  const U = 19.05, tilt = xf({ p: [x, MAT.h, z], r: [0.06, 0, 0] }), on = (m: THREE.Matrix4) => m.clone().premultiply(tilt);
  const rows: number[][] = [
    Array(14).fill(1),
    [...Array(13).fill(1), 2, 1],
    [1.5, ...Array(12).fill(1), 1.5, 1],
    [1.75, ...Array(11).fill(1), 2.25, 1],
    [2.25, ...Array(10).fill(1), 1.75, 1, 1],
    [1.25, 1.25, 1.25, 6.25, 1, 1, 1, 1, 1, 1],
  ];
  const w = 16 * U, d = 6 * U;
  b.add(rbox(w + 22, 17, d + 22, 5), M.steel, on(at(0, 8.5, 0)));
  b.add(rbox(w + 4, 1, d + 4, 0.4), glow, on(at(0, 17.4, 0)), { shadow: false });
  b.add(rbox(w + 16, 1.6, 2.4, 0.6), M.ember, on(at(0, 1.2, d / 2 + 11.4)), { shadow: false });
  for (const s of [-1, 1]) b.add(rbox(2.4, 1.6, d + 16, 0.6), M.ember, on(at(s * (w / 2 + 11.4), 1.2, 0)), { shadow: false });
  b.add(new THREE.PlaneGeometry(w + 240, d + 230).rotateX(-Math.PI / 2), halo, at(x, MAT.h + 0.4, z), { shadow: false, uv: 'keep' });
  rows.forEach((row, r) => {
    let u = 0;
    row.forEach((k, i) => {
      const cx = -w / 2 + (u + k / 2) * U, cz = -d / 2 + (r + 0.5) * U;
      const lit = (r === 0 && i === 0) || (r === 3 && i === 12) || (r === 4 && i === 12) || (r === 5 && i >= 7);
      b.add(rbox(k * U - 2.4, 8.5, U - 2.4, 2.2), lit ? M.cap : M.key, on(at(cx, 22.2, cz)));
      // The mark on each cap is lit from under it.
      if (!lit) b.add(rbox(Math.min(k * U - 10, 26), 0.4, 6.4, 0.2), glow, on(at(cx, 26.6, cz - 1.5)), { shadow: false });
      u += k;
    });
  });
  b.add(cyl(12, 13, 32), M.edge, on(at(w / 2 - U, 24.5, -d / 2 + U / 2)));
  b.add(new THREE.TorusGeometry(12.6, 1, 8, 40).rotateX(Math.PI / 2), M.ember, on(at(w / 2 - U, 18.6, -d / 2 + U / 2)), { shadow: false });
}

// Stacked outlines closed with a cap: a shell such as a mouse.
function shell(secs: { y: number; a: number; b: number; n?: number; oz?: number }[], seg = 64): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  for (const s of secs) for (let i = 0; i < seg; i++) {
    const t = (i / seg) * 2 * Math.PI, c = Math.cos(t), sn = Math.sin(t), e = 2 / (s.n ?? 2.6);
    pos.push(s.a * Math.sign(c) * Math.abs(c) ** e, s.y, (s.oz ?? 0) + s.b * Math.sign(sn) * Math.abs(sn) ** e);
  }
  for (let j = 0; j < secs.length - 1; j++) for (let i = 0; i < seg; i++) { const a = j * seg + i, c = j * seg + ((i + 1) % seg); idx.push(a, a + seg, c, c, a + seg, c + seg); }
  const top = secs[secs.length - 1], ci = pos.length / 3, base = (secs.length - 1) * seg;
  pos.push(0, top.y + 1.2, top.oz ?? 0);
  for (let i = 0; i < seg; i++) idx.push(base + i, ci, base + ((i + 1) % seg));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A gaming mouse: a low sculpted shell that rises to the palm, a lit wheel, two thumb buttons, a line of light round
// its foot.
function mouse(b: Builder, M: Mats, halo: THREE.Material, x: number, z: number, turn: number): void {
  const base = xf({ p: [x, MAT.h, z], r: [0, turn, 0] }), on = (m: THREE.Matrix4) => m.clone().premultiply(base);
  b.add(shell([{ y: 0.5, a: 30, b: 61 }, { y: 6, a: 32.5, b: 63 }, { y: 16, a: 32, b: 61, oz: 1 }, { y: 26, a: 29, b: 54, oz: 5 }, { y: 34, a: 23, b: 42, oz: 10 }, { y: 39, a: 13, b: 24, oz: 15 }]), M.shell, base);
  const foot = new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => { const t = (i / 40) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t), e = 2 / 2.6; return new THREE.Vector3(31.5 * Math.sign(c) * Math.abs(c) ** e, 2.4, 62 * Math.sign(sn) * Math.abs(sn) ** e); }), true);
  b.add(new THREE.TubeGeometry(foot, 120, 1.5, 6, true), M.ember, base, { shadow: false });
  b.add(new THREE.SphereGeometry(1, 16, 10), M.ember, on(xf({ p: [0, 37.2, 20], s: [6.5, 0.8, 9] })), { shadow: false });
  b.add(new THREE.PlaneGeometry(250, 300).rotateX(-Math.PI / 2), halo, on(at(0, 0.4, 0)), { shadow: false, uv: 'keep' });
  b.add(cyl(7.2, 7, 24).rotateZ(Math.PI / 2), M.coal, on(at(0, 27.5, -33)));
  b.add(new THREE.TorusGeometry(7.4, 0.9, 8, 28).rotateY(Math.PI / 2), M.ember, on(at(0, 27.5, -33)), { shadow: false });
  b.add(rbox(0.8, 3, 46, 0.3), M.coal, on(at(0, 27.4, -34)));
  for (const dz of [-14, 6]) b.add(rbox(3, 6, 17, 1.4), M.coal, on(at(-31.4, 17, dz)));
}

// A fan: a square frame, a hub, seven swept blades and a ring of light. It faces along the axis named.
function fan(b: Builder, M: Mats, x: number, y: number, z: number, axis: 'x' | 'y' | 'z', r: number, ring: THREE.Material): void {
  const turn = axis === 'x' ? xf({ p: [x, y, z], r: [0, Math.PI / 2, 0] }) : axis === 'y' ? xf({ p: [x, y, z], r: [Math.PI / 2, 0, 0] }) : at(x, y, z);
  const on = (m: THREE.Matrix4) => m.clone().premultiply(turn);
  for (const s of [-1, 1]) { b.add(rbox(2 * r + 8, 5, 12, 1.5), M.coal, on(at(0, s * (r + 1.5), 0))); b.add(rbox(5, 2 * r + 8, 12, 1.5), M.coal, on(at(s * (r + 1.5), 0, 0))); }
  b.add(cyl(r * 0.27, 12, 24).rotateX(Math.PI / 2), M.coal, turn);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; b.add(rbox(r * 0.66, r * 0.34, 1.6, 0.6), M.blade, on(xf({ p: [Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58, 0], r: [0.35, 0, a + 0.5] })), { shadow: false }); }
  b.add(new THREE.TorusGeometry(r - 1.5, 2.2, 8, 56), ring, on(at(0, 0, 4)), { shadow: false });
}

// The PC under the far end, laid out after the build in his PC Builder that he sent: a glass case with two chambers.
// Fans over the top, in the front wall and in the floor, one at the back, a liquid cooler with a lit ring, four
// sticks of memory, a graphics card with a lit bar, sleeved cables down to a shroud, a line of light round the foot.
// Lit in the site's colors. A stand in: the real case is brought over from his PC Builder's own code.
function pc(b: Builder, M: Mats): void {
  const { l, r, back, front, h } = BAY, cz = (back + front) / 2, w = r - l, d = front - back, y0 = FLOOR + 16, y1 = FLOOR + h, cy = (y0 + y1) / 2, wall = r - 96;
  for (const y of [y0 + 4, y1 - 4]) b.add(rbox(w, 8, d, 2.5), M.steel, at((l + r) / 2, y, cz));
  b.add(rbox(6, y1 - y0, d, 2), M.steel, at(r - 3, cy, cz));
  b.add(rbox(w, y1 - y0, 6, 2), M.steel, at((l + r) / 2, cy, back + 3));
  for (const [x, z] of [[l + 5, back + 5], [l + 5, front - 5], [r - 5, front - 5]]) b.add(rbox(10, y1 - y0, 10, 2), M.steel, at(x, cy, z));
  for (const z of [back + 44, front - 44]) for (const x of [l + 34, r - 34]) b.add(cyl(14, 16, 16), M.coal, at(x, FLOOR + 8, z));
  b.add(rbox(w + 4, 2.4, 2.4, 1), M.ember, at((l + r) / 2, FLOOR + 17, front + 1.6), { shadow: false });
  b.add(rbox(2.4, 2.4, d + 4, 1), M.ember, at(l - 1.6, FLOOR + 17, cz), { shadow: false });
  // The wall between the chambers carries the board. In front of it, toward the glass: the cooler, the memory, the card.
  b.add(rbox(5, y1 - y0 - 110, d - 70, 1), M.coal, at(wall, cy + 46, cz - 24));
  b.add(rbox(3, 250, 250, 1), M.board, at(wall - 5, y1 - 150, cz - 30));
  fan(b, M, wall - 22, y1 - 96, back + 74, 'x', 56, M.hot);
  b.add(cyl(36, 26, 40).rotateZ(Math.PI / 2), M.steel, at(wall - 22, y1 - 118, cz - 26));
  b.add(new THREE.TorusGeometry(31, 3, 10, 48).rotateY(Math.PI / 2), M.hot, at(wall - 36.5, y1 - 118, cz - 26), { shadow: false });
  for (const dz of [-14, 14]) b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(wall - 30, y1 - 100, cz - 26 + dz), new THREE.Vector3(wall - 60, y1 - 52, cz - 60 + dz), new THREE.Vector3(wall - 70, y1 - 30, cz - 130)]), 24, 5.5, 10), M.coal);
  for (let i = 0; i < 4; i++) { b.add(rbox(34, 132, 7, 2), M.coal, at(wall - 22, y1 - 122, cz + 34 + i * 11)); b.add(rbox(5, 126, 5, 1.5), M.ember, at(wall - 41, y1 - 122, cz + 34 + i * 11), { shadow: false }); }
  b.add(rbox(132, 58, 322, 7), M.steel, at(wall - 72, y0 + 228, cz - 10));
  b.add(rbox(3, 10, 250, 1), M.hot, at(wall - 139.5, y0 + 246, cz - 10), { shadow: false });
  for (let i = 0; i < 26; i++) b.add(rbox(2, 22, 5, 0.6), i % 2 ? M.ember : M.deep, at(wall - 139, y0 + 214, cz - 126 + i * 9.4), { shadow: false });
  for (let i = 0; i < 6; i++) b.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(wall - 110, y0 + 232, cz + 60 + i * 7), new THREE.Vector3(wall - 142, y0 + 190, cz + 62 + i * 7), new THREE.Vector3(wall - 132, y0 + 130, cz + 64 + i * 7)]), 16, 3, 8), M.coal);
  b.add(rbox(wall - l - 16, 5, d - 20, 1.5), M.steel, at((l + wall) / 2, y0 + 122, cz));
  for (let i = 0; i < 3; i++) fan(b, M, l + 78, y0 + 30, back + 82 + i * 150, 'y', 62, i === 1 ? M.ember : M.deep);
  b.add(rbox(wall - l - 20, 26, d - 40, 3), M.coal, at((l + wall) / 2, y1 - 26, cz));
  b.add(rbox(wall - l - 30, 2.4, d - 60, 1), M.ember, at((l + wall) / 2, y1 - 40.5, cz), { shadow: false });
  // The second chamber shows through the front glass: three fans one over another.
  for (let i = 0; i < 3; i++) fan(b, M, (l + r) / 2, y0 + 86 + i * 150, front - 22, 'z', 64, i === 1 ? M.hot : M.ember);
  b.add(rbox(1.5, y1 - y0 - 14, d - 18, 0.5), M.glass, at(l + 1.5, cy, cz), { shadow: false });
  b.add(rbox(w - 18, y1 - y0 - 14, 1.5, 0.5), M.glass, at((l + r) / 2, cy, front - 1.5), { shadow: false });
}

export interface Desk { root: THREE.Group; screen: THREE.MeshStandardMaterial; glow: THREE.ShaderMaterial }

// The light a lit thing lays on the mat round it: brightest under it, gone by the plane's edge.
function haloMaterial(): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; void main(){ float d = length((vUv - 0.5) * 2.0); float a = 1.0 - smoothstep(0.25, 1.0, d); gl_FragColor = vec4(vec3(0.9, 0.36, 0.05) * a * a * 0.2, 1.0); }',
  });
  m.name = 'halo';
  return m;
}

export function buildDesk(M: Mats): Desk {
  const root = new THREE.Group();
  const screen = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xffffff, emissiveMap: screenTexture(), emissiveIntensity: 0.62, roughness: 0.3 });
  screen.name = 'screen';
  // The light under the keys: a wave of the site's own light that crosses the board.
  const glow = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uTime; varying vec3 vP; void main(){ float w = 0.5 + 0.5 * sin(vP.x * 0.021 - uTime * 1.9 + vP.z * 0.012); vec3 c = mix(vec3(0.42, 0.11, 0.0), vec3(1.0, 0.5, 0.1), w); c = mix(c, vec3(1.0, 0.78, 0.5), smoothstep(0.86, 1.0, w)); gl_FragColor = vec4(c, 1.0); }',
  });
  glow.name = 'glow';
  const halo = haloMaterial();
  const add = (name: string, make: (b: Builder) => void) => {
    const g = new THREE.Group();
    g.name = name;
    const b = new Builder();
    make(b);
    for (const mesh of b.build(g, name)) if (mesh.material === M.glass) { mesh.renderOrder = 5; mesh.castShadow = false; } else if (mesh.material === screen || mesh.material === glow || mesh.material === halo) { mesh.receiveShadow = false; mesh.userData.noWire = true; if (mesh.material === halo) mesh.renderOrder = 3; }
    root.add(g);
  };
  add('bench', (b) => bench(b, M));
  add('mat', (b) => mat(b, M));
  add('monitor', (b) => monitor(b, M, screen));
  add('keyboard', (b) => keyboard(b, M, glow, halo, PLACES.keyboard[0], PLACES.keyboard[1]));
  add('mouse', (b) => mouse(b, M, halo, PLACES.mouse[0], PLACES.mouse[1], PLACES.mouse[2] * (Math.PI / 180)));
  add('pc', (b) => pc(b, M));
  return { root, screen, glow };
}

// Where the things on the desk stand, in millimetres from the middle of the top, and how far each is turned. The
// lamp, the tablet with its pencil, the camera, the lens and its cap are the carried workbench's.
export const PLACES: Record<string, [x: number, z: number, turn: number]> = {
  lamp: [-868, -268, 0],
  tablet: [-600, 150, 22],
  keyboard: [-110, 196, 0],
  mouse: [176, 190, 8],
  camera: [640, 120, -36],
  lens: [742, -30, 0],
  cap: [520, 262, 0],
};
