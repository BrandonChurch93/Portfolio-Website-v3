import * as THREE from 'three';
import { lathe, rbox } from '../../../../world/build';
import { rings } from '../keyboard/shapes';

// His mouse: a light, high end wireless gaming mouse, low at the front where the fingers lie and swelling to the palm
// behind the middle. Millimetres, its foot on the mat at y = 0, its front toward -z.

// Its size, the height its skates lift it by, and where the wheel and its light are.
export const MOUSE = { len: 124, half: 31.8, lift: 0.8, wheel: { z: -35, r: 10.4, w: 7 }, light: -19.5 } as const;
// The seams, as places on the shell: where the two buttons end at the back (middle and sides), how high their sides
// run along the flanks, and the line the matte top shell meets the satin band under it at.
export const SEAM = { back: 1.5, side: 23, base: 9 } as const;
// The thumb's two buttons on the left flank: where each is along the mouse, its length, and the height of its middle.
export const THUMB = { at: [-22, -6], len: [15, 14], y: 19, tall: 6.2 } as const;
// The grip panels on both flanks, behind the thumb buttons: middle along the mouse and up, and half their size.
export const GRIP = { z: 15, y: 16, hz: 15, hy: 5.5, r: 4.5 } as const;

// The height of the shell's back along its length: low over the fingers' ends, highest under the palm, falling away
// steeply at the heel.
const RISE: [number, number][] = [[-62, 14], [-55, 20], [-42, 25.5], [-24, 31], [-6, 36], [8, 38.5], [22, 37.4], [36, 32], [48, 24], [57, 14], [62, 6]];
function rise(z: number): number {
  if (z <= RISE[0][0]) return RISE[0][1];
  for (let i = 0; i < RISE.length - 1; i++) {
    const [z0, h0] = RISE[i], [z1, h1] = RISE[i + 1];
    if (z <= z1) {
      // A cubic through the neighbours, so the back has no corners.
      const p = RISE[Math.max(0, i - 1)], q = RISE[Math.min(RISE.length - 1, i + 2)];
      const t = (z - z0) / (z1 - z0), m0 = ((h1 - p[1]) / (z1 - p[0])) * (z1 - z0), m1 = ((q[1] - h0) / (q[0] - z0)) * (z1 - z0);
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * h0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * h1 + (t3 - t2) * m1;
    }
  }
  return RISE[RISE.length - 1][1];
}

// The width at a place along its length: a little narrower at the front, pinched where the thumb and the ring finger
// grip, broadest under the palm.
const width = (z: number) => 1 - 0.055 * Math.exp(-(((z + 6) / 15) ** 2)) - 0.05 * Math.min(1, Math.max(0, -z / 62)) + 0.02 * Math.exp(-(((z - 26) / 18) ** 2));

// The two shallow channels the fingers lie in, down the main buttons.
const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const scoop = (x: number, z: number) => 1.15 * Math.exp(-(((Math.abs(x) - 13.5) / 7.5) ** 2)) * sstep(-62, -48, z) * (1 - sstep(-14, 2, z));

// Where the shell's rings close at the top: the highest point of its back.
const CROWN = 9;

export function shellGeometry(): THREE.BufferGeometry {
  const seg = 128, steps = 30, list: THREE.Vector3[][] = [];
  const rim: [number, number][] = [];
  for (let i = 0; i < seg; i++) {
    const t = (i / seg) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / 2.35;
    const z = (MOUSE.len / 2) * Math.sign(s) * Math.abs(s) ** e;
    rim.push([MOUSE.half * width(z) * Math.sign(c) * Math.abs(c) ** e, z]);
  }
  for (let j = 0; j < steps; j++) {
    // Rings bunch toward the foot, where the side turns hardest.
    const u = j / steps, phi = (Math.PI / 2) * (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)) * 0.999;
    const a = Math.cos(phi) ** (2 / 2.7), up = Math.sin(phi) ** (2 / 2.1);
    list.push(rim.map(([x, z]) => {
      const zz = z * a + CROWN * (1 - a);
      // The sides belly out a little above the foot and tuck in under it.
      const belly = 1 + 0.035 * Math.sin(Math.min(1, up * 1.4) * Math.PI) - 0.03 * (1 - Math.min(1, up * 6));
      const xx = x * a * belly;
      return new THREE.Vector3(xx, MOUSE.lift + rise(zz) * up - scoop(xx, zz) * Math.min(1, Math.max(0, (up - 0.55) / 0.35)), zz);
    }));
  }
  return rings(list, new THREE.Vector3(0, MOUSE.lift + rise(CROWN), CROWN));
}

// The highest point of the shell over a place: read from the built shell, so what sits on it sits on it.
export function topAt(g: THREE.BufferGeometry, x: number, z: number, r = 2.5): number {
  const p = g.getAttribute('position');
  let y = 0;
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i) - x) < r && Math.abs(p.getZ(i) - z) < r) y = Math.max(y, p.getY(i));
  return y;
}

// Where the side of the shell is at a height and a place along it, and which way the side faces there.
export function sideAt(g: THREE.BufferGeometry, y: number, z: number): { x: number; n: THREE.Vector3 } {
  const p = g.getAttribute('position'), nm = g.getAttribute('normal');
  let best = Infinity, k = 0;
  for (let i = 0; i < p.count; i++) {
    if (p.getX(i) > 0) continue;
    const d = (p.getY(i) - y) ** 2 + (p.getZ(i) - z) ** 2;
    if (d < best) { best = d; k = i; }
  }
  return { x: p.getX(k), n: new THREE.Vector3(nm.getX(k), nm.getY(k), nm.getZ(k)) };
}

// The thumb's two buttons: each a pad with a chamfer all round, laid on the flank and following its lean.
export function sideButtons(shell: THREE.BufferGeometry): THREE.BufferGeometry[] {
  return THUMB.at.map((z, i) => {
    const len = THUMB.len[i], h = THUMB.tall, r = 2.6;
    const sh = new THREE.Shape();
    sh.moveTo(-len / 2 + r, -h / 2);
    sh.lineTo(len / 2 - r, -h / 2); sh.quadraticCurveTo(len / 2, -h / 2, len / 2, -h / 2 + r);
    sh.lineTo(len / 2, h / 2 - r); sh.quadraticCurveTo(len / 2, h / 2, len / 2 - r, h / 2);
    sh.lineTo(-len / 2 + r, h / 2); sh.quadraticCurveTo(-len / 2, h / 2, -len / 2, h / 2 - r);
    sh.lineTo(-len / 2, -h / 2 + r); sh.quadraticCurveTo(-len / 2, -h / 2, -len / 2 + r, -h / 2);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 1, curveSegments: 6 });
    g.translate(0, 0, -2.1);
    const { x, n } = sideAt(shell, THUMB.y, z);
    // The pad's thickness runs out along the flank's normal, its length along the mouse.
    const N = n.clone().normalize(), T = new THREE.Vector3(0, 0, 1).addScaledVector(N, -N.z).normalize(), B = new THREE.Vector3().crossVectors(N, T);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(T, B, N).setPosition(x + N.x * 0.6, THUMB.y + N.y * 0.6, z));
    g.computeVertexNormals();
    return g;
  });
}

// The wheel: a turned copper part, two knurled bands either side of a groove, chamfered at its edges, on an axle
// along x.
export function wheelGeometry(): THREE.BufferGeometry {
  const { r, w } = MOUSE.wheel, h = w / 2;
  const g = lathe([[1.6, -h], [r - 1.6, -h], [r - 0.8, -h + 0.3], [r - 0.2, -h + 0.9], [r, -h + 1.4], [r, -0.6], [r - 0.45, -0.3], [r - 0.45, 0.3], [r, 0.6], [r, h - 1.4], [r - 0.2, h - 0.9], [r - 0.8, h - 0.3], [r - 1.6, h], [1.6, h]], 48);
  return g.rotateZ(Math.PI / 2);
}

// What holds the wheel, seen down the slot: a dark cheek either side of it and the detents' housing behind it.
export function cradleGeometry(wy: number): THREE.BufferGeometry[] {
  const { z, r, w } = MOUSE.wheel;
  return [
    ...[-1, 1].map((s) => rbox(1.4, r * 1.5, r * 2.2, 0.5, 1).translate(s * (w / 2 + 1.1), wy - r * 0.35, z)),
    rbox(w + 3.6, 5, 4.4, 1, 1).translate(0, wy - 2.5, z + r + 2),
  ];
}

// The skates under it: two thin pads of dark PTFE.
export function skates(): THREE.BufferGeometry[] {
  return [rbox(30, MOUSE.lift + 0.4, 7, 0.35, 1).translate(0, (MOUSE.lift + 0.4) / 2 - 0.2, -50), rbox(38, MOUSE.lift + 0.4, 8, 0.35, 1).translate(0, (MOUSE.lift + 0.4) / 2 - 0.2, 47)];
}
