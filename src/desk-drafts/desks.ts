import * as THREE from 'three';
import { Builder, at, cyl, lathe, rbox, xf } from '../world/build';
import type { Mats } from './materials';

// Three rough desks for Skills, to choose a direction from. Millimetres, under a root scaled by 0.001. The top's
// surface is y = 0, its front edge is at z = D / 2 and the viewer stands at +z. Every one keeps what is settled: a
// dark timber top 2 m long, a bronze front edge that carries the stream, two drawers with the knob he chose, and room
// under the far end for the PC.
export const DESK = { W: 2000, D: 780, H: 740, SCALE: 0.001 } as const;
const { W, D, H } = DESK;
const FRONT = D / 2, FLOOR = -H;

export type Kind = 'bench' | 'bureau' | 'rail';
export const KINDS: { id: Kind; letter: string; name: string; line: string }[] = [
  { id: 'bench', letter: 'A', name: 'Bench', line: 'A joiner’s bench. A thick slab on two trestles, a wedged stretcher, a bronze angle screwed over the front edge.' },
  { id: 'bureau', letter: 'B', name: 'Bureau', line: 'An antique writing table. A thin top in a bronze rim, drawers in the frieze, tapered legs in bronze shoes.' },
  { id: 'rail', letter: 'C', name: 'Rail', line: 'Made like the Work section’s hardware. A knife edged slab on steel frames, with Work’s own rail and Blades along the front.' },
];

// Where the stream rides each desk's front edge: how far above the top, and how far out from the middle.
export const EDGE: Record<Kind, [y: number, z: number]> = { bench: [3.6, FRONT + 1], bureau: [4.6, FRONT - 7], rail: [5.2, FRONT + 27] };
// Where it lands on that edge, measured from the middle of the desk. The fuller draft has it at 1.12 m from the left.
export const LAND = 120;

// Where the PC stands under the far end, so each desk leaves it room.
export const BAY = { l: 500, r: 720, back: -210, front: 270, h: 500 } as const;

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

// A length of one section along x. The section is given as places across z and up y.
function run(section: [z: number, y: number][], x0: number, x1: number): THREE.BufferGeometry {
  const s = new THREE.Shape(section.map(([z, y]) => new THREE.Vector2(-z, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(x0, 0, 0);
  return g;
}

// A square leg that tapers: side a at the top, b at the foot.
const taper = (a: number, b: number, h: number) => new THREE.CylinderGeometry(a / Math.SQRT2, b / Math.SQRT2, h, 4, 1).rotateY(Math.PI / 4);

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

// A: the joiner's bench.
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

// B: the antique writing table.
function bureau(b: Builder, M: Mats): void {
  const T = 30, IN = 57, top = -T, aH = 104;
  b.add(slab(W - 16, D - 16, 4, T, 1.5), M.top);
  for (const z of [-FRONT + 7, FRONT - 7]) b.add(rbox(W, 37, 14, 5), M.edge, at(0, -15, z));
  for (const x of [-W / 2 + 7, W / 2 - 7]) b.add(rbox(14, 37, D, 5), M.edge, at(x, -15, 0));
  for (const z of [-FRONT + 14, FRONT - 14]) b.add(rbox(W - 60, 9, 9, 3), M.bronze, at(0, -39, z));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(rbox(48, 45, 48, 9), M.cast, at(sx * (W / 2 - 19), -15.5, sz * (FRONT - 19)));
  for (const z of [-FRONT + IN, FRONT - IN]) b.add(rbox(W - 2 * IN - 74, aH, 22, 2), M.top, at(0, top - aH / 2, z));
  for (const x of [-W / 2 + IN, W / 2 - IN]) b.add(rbox(22, aH, D - 2 * IN - 74, 2), M.cross, at(x, top - aH / 2, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (W / 2 - IN), z = sz * (FRONT - IN);
    b.add(rbox(76, aH + 8, 76, 3), M.post, at(x, top - (aH + 8) / 2, z));
    b.add(rbox(88, 15, 88, 4), M.cast, at(x, top - aH - 15, z));
    const fall = H - T - aH - 22 - 62;
    b.add(taper(72, 40, fall), M.post, at(x, top - aH - 22 - fall / 2, z));
    b.add(taper(48, 34, 56), M.cast, at(x, FLOOR + 34, z));
    b.add(cyl(21, 6, 24), M.cast, at(x, FLOOR + 3, z));
    if (sz > 0) knob(b, M, x, top - aH / 2 - 4, z + 38, 0.82, false);
  }
  // Two drawers in the frieze, each in a bronze bead.
  const z = FRONT - IN;
  for (const x of [-640, -210]) {
    b.add(rbox(400, 82, 20, 2), M.top, at(x, top - aH / 2, z + 5));
    for (const y of [-43, 43]) b.add(rbox(410, 4, 5, 1.4), M.bronze, at(x, top - aH / 2 + y, z + 14.5));
    for (const dx of [-203, 203]) b.add(rbox(4, 90, 5, 1.4), M.bronze, at(x + dx, top - aH / 2, z + 14.5));
    knob(b, M, x, top - aH / 2, z + 15, 0.9);
  }
}

// The Blade, Work's finial: a flat leaf that comes to a point, lying along x.
function blade(len: number, tall: number, thick: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -tall * 0.34);
  s.quadraticCurveTo(len * 0.22, -tall * 0.56, len * 0.42, -tall * 0.3);
  s.lineTo(len, 0);
  s.lineTo(len * 0.42, tall * 0.3);
  s.quadraticCurveTo(len * 0.22, tall * 0.56, 0, tall * 0.34);
  const g = new THREE.ExtrudeGeometry(s, { depth: thick - 3, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.5, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -(thick - 3) / 2);
  return g;
}

// C: the rail desk.
function rail(b: Builder, M: Mats): void {
  const T = 40;
  b.add(run([[-FRONT, 0], [FRONT, 0], [FRONT, -13], [FRONT - 30, -T], [-FRONT, -T]], -W / 2, W / 2), M.top);
  // Work's rail along the front: a bar on standoffs, a Blade at each end.
  const z = FRONT + 27, y = -6.5;
  b.add(cyl(10.5, W + 40, 28).rotateZ(Math.PI / 2), M.edge, at(0, y, z));
  for (let i = 0; i < 6; i++) {
    const x = -W / 2 + 100 + i * ((W - 200) / 5);
    b.add(cyl(5.5, 22, 16).rotateX(Math.PI / 2), M.bronze, at(x, y, FRONT + 10));
    b.add(cyl(9, 3, 20).rotateX(Math.PI / 2), M.bronze, at(x, y, FRONT + 1.5));
    b.add(new THREE.SphereGeometry(13.5, 20, 14), M.bronze, at(x, y, z));
  }
  for (const s of [-1, 1]) b.add(blade(150, 54, 11), M.cast, xf({ p: [s * (W / 2 + 14), y, z], r: [0, s < 0 ? Math.PI : 0, 0] }));
  // Two frames of flat steel bar, a beam between them at the back, bronze pads under the feet.
  for (const s of [-1, 1]) {
    const x = s * 870;
    for (const pz of [-300, 300]) b.add(rbox(18, 652, 70, 3), M.steel, at(x, -T - 326, pz));
    b.add(rbox(18, 48, 720, 4), M.steel, at(x, FLOOR + 24 + 4, 0));
    b.add(rbox(18, 46, 670, 3), M.steel, at(x, -T - 23, 0));
    for (const pz of [-330, 330]) b.add(cyl(24, 5, 24), M.bronze, at(x, FLOOR + 2.5, pz));
    for (const pz of [-300, 300]) for (const py of [-T - 23, FLOOR + 28]) b.add(cyl(6, 22, 16).rotateZ(Math.PI / 2), M.bronze, at(x, py, pz));
  }
  b.add(rbox(1722, 60, 30, 3), M.steel, at(0, -T - 30, -262));
  // Two drawers, one over the other, in a steel case hung under the slab.
  const cx = -600, w = 420, hh = 300, front = FRONT - 44;
  b.add(rbox(w, hh, 520, 4), M.steel, at(cx, -T - hh / 2, front - 260));
  for (const i of [0, 1]) {
    const dy = -T - 9 - 68 - i * 144;
    b.add(rbox(w - 16, 136, 18, 2), M.top, at(cx, dy, front + 6));
    knob(b, M, cx, dy, front + 15);
  }
}

// The PC under the far end, as a stand in: his PC Builder's case is brought over for the real piece. A dark case with
// a glass side toward the viewer, three fans behind the front, and what is inside lit in the site's ember.
function pc(b: Builder, M: Mats): void {
  const { l, r, back, front, h } = BAY, cx = (l + r) / 2, cz = (back + front) / 2, w = r - l, d = front - back, y0 = FLOOR + 14, y1 = FLOOR + h;
  b.add(rbox(w, 6, d, 2), M.steel, at(cx, y0 + 3, cz));
  b.add(rbox(w, 6, d, 2), M.steel, at(cx, y1 - 3, cz));
  b.add(rbox(6, y1 - y0, d, 2), M.steel, at(r - 3, (y0 + y1) / 2, cz));
  b.add(rbox(w, y1 - y0, 6, 2), M.steel, at(cx, (y0 + y1) / 2, back + 3));
  b.add(rbox(w, y1 - y0, 8, 2), M.coal, at(cx, (y0 + y1) / 2, front - 4));
  for (const z of [back + 40, front - 40]) for (const x of [l + 30, r - 30]) b.add(cyl(13, 14, 16), M.coal, at(x, FLOOR + 7, z));
  // Four posts of the frame the glass sits in.
  for (const z of [back + 5, front - 5]) b.add(rbox(8, y1 - y0, 10, 2), M.steel, at(l + 4, (y0 + y1) / 2, z));
  // Inside: the shroud over the power supply, the board on the far wall, a cooler, memory, and the card lying across.
  b.add(rbox(w - 14, 92, d - 16, 3), M.coal, at(cx, y0 + 52, cz));
  b.add(rbox(4, 300, 300, 1), M.coal, at(r - 12, y0 + 260, cz - 20));
  b.add(new THREE.TorusGeometry(38, 2.6, 10, 48).rotateY(Math.PI / 2), M.ember, at(r - 46, y0 + 330, cz - 40), { shadow: false });
  b.add(cyl(30, 34, 32).rotateZ(Math.PI / 2), M.steel, at(r - 32, y0 + 330, cz - 40));
  for (let i = 0; i < 4; i++) b.add(rbox(30, 120, 5, 1.5), i % 2 ? M.coal : M.ember, at(r - 30, y0 + 330, cz + 60 + i * 13), { shadow: false });
  b.add(rbox(120, 52, 300, 5), M.steel, at(r - 76, y0 + 196, cz - 6));
  b.add(rbox(3, 6, 250, 1), M.ember, at(r - 137, y0 + 206, cz - 6), { shadow: false });
  for (let i = 0; i < 3; i++) b.add(new THREE.TorusGeometry(54, 4, 8, 56), M.ember, at(cx, y0 + 96 + 62 + i * 128, front + 0.6), { shadow: false });
  b.add(rbox(1.5, y1 - y0 - 12, d - 12, 0.5), M.glass, at(l + 1.5, (y0 + y1) / 2, cz), { shadow: false });
}

const MAKE: Record<Kind, (b: Builder, M: Mats) => void> = { bench, bureau, rail };

export function buildDesk(kind: Kind, M: Mats): THREE.Group {
  const g = new THREE.Group();
  g.name = kind;
  const b = new Builder();
  MAKE[kind](b, M);
  b.build(g, kind);
  return g;
}

export function buildPC(M: Mats): THREE.Group {
  const g = new THREE.Group();
  g.name = 'pc';
  const b = new Builder();
  pc(b, M);
  for (const mesh of b.build(g, 'pc')) if (mesh.material === M.glass) { mesh.renderOrder = 5; mesh.castShadow = false; }
  return g;
}

// Where the things on the desk stand, in millimetres from the middle of the top, and how far each is turned.
export const PLACES: Record<string, [x: number, z: number, turn: number]> = {
  lamp: [-820, -250, 0],
  tablet: [-600, 140, 22],
  monitor: [-110, -250, 0],
  keyboard: [-130, 205, 0],
  mouse: [185, 160, 9],
  camera: [680, 70, -36],
  lens: [820, -190, 0],
  cap: [585, 255, 0],
};
