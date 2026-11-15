import * as THREE from 'three';
import { type Adds, extrude, led, moved, rbox, roundedPoly, xf } from './kit';
import type { Look } from './look';

// A stick of his Facet memory, brought over from the PC Builder (src/world/parts/ram.ts): the board with its key notch
// and latch cutouts, a spreader on each side with the family's notched top line and two faceted reliefs whose planes
// meet at a crowned ridge, and the frosted light bar along the top. In stick space: y along the stick, z up from the
// slot, x through its thickness.

const LEN = 133.35, HALF = LEN / 2, PCB_H = 31.25, PCB_T = 1.27, NOTCH = 5.6, HEIGHT = 44;
const TO_STICK = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);

// A faceted relief in plate space: two planes meeting at a crowned ridge, with a chamfer all round.
function facetRelief(pts: [number, number][], rim: number, ridge: number, out: 1 | -1): THREE.BufferGeometry {
  const [a, b, c, d] = pts.map(([x, y]) => new THREE.Vector2(x, y));
  const len = a.distanceTo(b), ht = a.distanceTo(d), ch = 0.45, crown = 0.5;
  const S = [0, ch / len, (2 * ch) / len, 1 - (2 * ch) / len, 1 - ch / len, 1];
  const FS = [0, 0.22, 99, 99, 0.22, 0];
  const Tt = [0, ch / ht, 0.5 - crown / ht, 0.5 + crown / ht, 1 - ch / ht, 1];
  const FT = [0, 0.22, ridge - rim, ridge - rim, 0.22, 0];
  const pos: number[] = [];
  const P = (s: number, t: number, z: number) => { const p = a.clone().lerp(b, s).lerp(d.clone().lerp(c, s), t); return new THREE.Vector3(p.x, p.y, z * out); };
  const tri = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3) => { for (const v of out > 0 ? [p, q, r] : [p, r, q]) pos.push(v.x, v.y, v.z); };
  const H = (i: number, j: number) => rim + Math.min(FS[i], FT[j]);
  for (let i = 0; i < S.length - 1; i++) for (let j = 0; j < Tt.length - 1; j++) {
    const p00 = P(S[i], Tt[j], H(i, j)), p10 = P(S[i + 1], Tt[j], H(i + 1, j)), p11 = P(S[i + 1], Tt[j + 1], H(i + 1, j + 1)), p01 = P(S[i], Tt[j + 1], H(i, j + 1));
    tri(p00, p10, p11); tri(p00, p11, p01);
  }
  const wall = (p: THREE.Vector2, q: THREE.Vector2) => {
    const p0 = new THREE.Vector3(p.x, p.y, -0.3 * out), q0 = new THREE.Vector3(q.x, q.y, -0.3 * out), q1 = new THREE.Vector3(q.x, q.y, rim * out), p1 = new THREE.Vector3(p.x, p.y, rim * out);
    tri(p0, q0, q1); tri(p0, q1, p1);
  };
  wall(a, b); wall(b, c); wall(c, d); wall(d, a);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export function ram(parent: Adds, L: Look, m: THREE.Matrix4, tone: number): void {
  const b = moved(parent, m);
  const outline: [number, number][] = [
    [-HALF, 0], [NOTCH - 0.8, 0], [NOTCH - 0.8, 3.4], [NOTCH + 0.8, 3.4], [NOTCH + 0.8, 0], [HALF, 0],
    [HALF, 13.6], [HALF - 2.4, 14.6], [HALF - 2.4, 17.8], [HALF, 18.8], [HALF, PCB_H],
    [-HALF, PCB_H], [-HALF, 18.8], [-HALF + 2.4, 17.8], [-HALF + 2.4, 14.6], [-HALF, 13.6],
  ];
  const pcb = extrude(roundedPoly(outline, 0.35), PCB_T, 0.15, 'xy', 2);
  pcb.translate(0, 0, -PCB_T / 2);
  b.add(pcb, L.pcb, TO_STICK);
  for (const side of [1, -1]) b.add(new THREE.BoxGeometry(0.06, LEN - 4, 4), L.copper, xf({ p: [side * (PCB_T / 2 + 0.03), 0, 2.2] }), { shadow: false });

  const bottom = 7.6, barH = 7.5, top = HEIGHT - barH + 1.2, plateT = 1.55, gap = PCB_T / 2 + 0.75;
  const rN: [number, number][] = [[HALF - 0.3, 13.0], [HALF - 3.4, 14.2], [HALF - 3.4, 18.2], [HALF - 0.3, 19.4]];
  const lN: [number, number][] = [[-HALF + 0.3, 19.4], [-HALF + 3.4, 18.2], [-HALF + 3.4, 14.2], [-HALF + 0.3, 13.0]];
  const prof: [number, number][] = [[-HALF + 0.3, bottom], [HALF - 0.3, bottom], ...rN, [HALF - 0.3, top - 5.5], [HALF - 6.5, top], [9.5, top], [5.5, top - 2.6], [-5.5, top - 2.6], [-9.5, top], [-HALF + 6.5, top], [-HALF + 0.3, top - 5.5], ...lN];
  for (const side of [1, -1] as const) {
    const g = extrude(roundedPoly(prof, 0.6), plateT, 0.55, 'xy', 4, 1);
    g.translate(0, 0, side > 0 ? gap : -gap - plateT);
    b.add(g, L.sink, TO_STICK, { uv: 'box' });
    const facet = (pts: [number, number][]) => {
      const f = facetRelief(pts, 0.25, 1.3, side);
      f.translate(0, 0, side * (gap + plateT));
      b.add(f, L.sink, TO_STICK, { uv: 'box' });
    };
    const ft = top - 6, low = bottom + 6;
    facet([[-HALF + 8, low], [-14, low], [-4, ft - 4], [-HALF + 14, ft - 4]]);
    facet([[14, low], [HALF - 8, low], [HALF - 14, ft - 4], [4, ft - 4]]);
  }

  // The bar: frosted, along the notched top line, on its own plate.
  const barW = 2 * (gap + plateT) - 0.6, z0 = top - 1.6, z1 = HEIGHT, half = (LEN - 2) / 2;
  const notched: [number, number][] = [[-half, z0], [half, z0], [half, z1 - 1.2], [half - 1.2, z1], [9.5, z1], [5.5, z1 - 2.6], [-5.5, z1 - 2.6], [-9.5, z1], [-half + 1.2, z1], [-half, z1 - 1.2]];
  const bar = extrude(roundedPoly(notched, 0.8), barW, 0.6, 'xy', 3, 2);
  bar.translate(0, 0, -barW / 2);
  bar.applyMatrix4(TO_STICK);
  led(bar, tone, 1);
  const p = bar.getAttribute('position'), cell = bar.getAttribute('cell');
  for (let i = 0; i < p.count; i++) cell.setY(i, 0.16 + 0.36 * Math.pow(Math.min(1, Math.max(0, (p.getZ(i) - z0) / (z1 - z0))), 2));
  b.add(bar, L.led, undefined, { shadow: false });
  b.add(rbox(barW + 0.6, LEN - 0.8, 1.4, 0.5, 2), L.sink, xf({ p: [0, 0, z0 + 0.4] }));
}

export const STICK = { HEIGHT, LEN };
