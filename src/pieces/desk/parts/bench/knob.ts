import * as THREE from 'three';
import { lathe } from '../../../../world/build';

// The knob he chose for the sleeping card (src/metal/dial.ts, knobHead), as a turned thing in old bronze: a waisted
// stem on a turned washer, a head with a rolled rim, a half round moulding, a channel set with a ring of beads, a
// collar, and a domed face carrying the rosette in relief, eight broad petals over eight pointed leaves round a boss.
// The turned parts are real geometry. The rosette is the card's own height field, cut into a normal map whose alpha
// says how high each point stands, so the bronze can be dark where it is low and rubbed bright where it is high.
//
// The design is drawn 42 units from the middle to the rim, as the card draws it. KNOB.r is the head's real radius.

export const KNOB = { r: 19, stand: 33, beads: 30, dome: 18, face: 28.6 } as const;
const S = KNOB.r / 42;

function petals(qx: number, qy: number, n: number, turn: number, u0: number, u1: number, w: number, fat: number) {
  const seg = (Math.PI * 2) / n, t = Math.atan2(qy, qx) + turn + 0.5 * seg;
  const a = t - seg * Math.floor(t / seg) - 0.5 * seg;
  const r = Math.hypot(qx, qy), u = r * Math.cos(a), v = r * Math.sin(a);
  const along = Math.min(1, Math.max(0, (u - u0) / (u1 - u0)));
  const wide = Math.min(w * Math.pow(Math.sin(Math.PI * Math.pow(along, fat)), 0.8), r * Math.sin(0.5 * seg) * 1.04);
  const across = v / Math.max(wide, 1e-3), inside = 1 - across * across;
  return { h: inside > 0 && u > u0 && u < u1 ? Math.sqrt(inside) : 0, across, along };
}

// How far the rosette stands above the face's turned ground at a point, in the design's units.
function rosette(x: number, y: number): number {
  const r = Math.hypot(x, y);
  if (r >= KNOB.face) return 0;
  const sw = (0.2 * r) / KNOB.face, cs = Math.cos(sw), sn = Math.sin(sw);
  const qx = cs * x + sn * y, qy = cs * y - sn * x;
  const leaf = petals(qx, qy, 8, 0.3927, 10, 28.2, 5.8, 1.3);
  const leaves = leaf.h * (1.9 + 0.8 * Math.exp(-leaf.across * leaf.across * 14));
  const pet = petals(qx, qy, 8, 0, 3.5, 25.2, 10.5, 1.05);
  const s = (a: number, b: number, v: number) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  const crease = 0.9 * Math.exp(-pet.across * pet.across * 34) * s(0.1, 0.4, pet.along) * (1 - s(0.72, 0.98, pet.along));
  const pts = pet.h * (3.9 - 0.8 * pet.along) - (pet.h > 0.001 ? crease : 0);
  let z = Math.max(leaves, pts);
  if (r < 7.9) z = Math.max(z, 1.4 + 1.5 * Math.sqrt(Math.max(1 - ((r - 6.9) * (r - 6.9)) / 0.9, 0)));
  if (r < 6) z = Math.max(z, 1.2 + 5 * Math.sqrt(1 - (r * r) / 36));
  return z;
}

const dome = (r: number) => KNOB.dome * (1 - Math.min((r * r) / 1764, 1));
const ground = (r: number) => 1.2 + 4.4 * (1 - (r * r) / 818);
// The turned outline of the head beyond the face, without the beads.
function turned(r: number): number {
  if (r < 30.4) return 1.5 + 2.2 * Math.sqrt(Math.max(1 - ((r - 29.5) * (r - 29.5)) / 0.81, 0));
  const x = (r - 39.1) / 2.9;
  return Math.max(1.6, Math.abs(x) < 1 ? 1 + 2.9 * Math.sqrt(1 - x * x) : 1.6);
}

const RELIEF = 6.4;
let map: THREE.DataTexture | null = null;

// The rosette as a normal map over the face, x to the right and y up, with how high it stands in alpha.
export function rosetteMap(size = 512): THREE.DataTexture {
  if (map) return map;
  const R = KNOB.face, step = (2 * R) / size, h = new Float32Array((size + 2) * (size + 2));
  for (let j = -1; j <= size; j++) for (let i = -1; i <= size; i++) h[(j + 1) * (size + 2) + i + 1] = rosette(-R + (i + 0.5) * step, -R + (j + 0.5) * step);
  const at = (i: number, j: number) => h[(j + 1) * (size + 2) + i + 1];
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const dx = (at(i + 1, j) - at(i - 1, j)) / (2 * step), dy = (at(i, j + 1) - at(i, j - 1)) / (2 * step);
    const l = Math.hypot(dx, dy, 1), k = (j * size + i) * 4;
    data[k] = Math.round((-dx / l * 0.5 + 0.5) * 255);
    data[k + 1] = Math.round((-dy / l * 0.5 + 0.5) * 255);
    data[k + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
    data[k + 3] = Math.round(Math.min(1, at(i, j) / RELIEF) * 255);
  }
  map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.anisotropy = 8;
  map.needsUpdate = true;
  return map;
}

// The domed face, for the rosette's map: a disc of rings, its uv laid flat across it. Facing +z, in millimetres,
// its rim KNOB.stand units in front of the face it is fixed to.
export function knobFace(): THREE.BufferGeometry {
  const R = KNOB.face, rings = 18, segs = 72, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  pos.push(0, 0, (ground(0) + dome(0) + KNOB.stand) * S); uv.push(0.5, 0.5);
  for (let i = 1; i <= rings; i++) {
    const r = R * Math.pow(i / rings, 0.85);
    for (let k = 0; k < segs; k++) {
      const a = (k / segs) * Math.PI * 2, x = r * Math.cos(a), y = r * Math.sin(a);
      pos.push(x * S, y * S, (ground(r) + dome(r) + KNOB.stand) * S);
      uv.push(x / (2 * R) + 0.5, y / (2 * R) + 0.5);
    }
  }
  for (let k = 0; k < segs; k++) idx.push(0, 1 + k, 1 + ((k + 1) % segs));
  for (let i = 1; i < rings; i++) for (let k = 0; k < segs; k++) {
    const a = 1 + (i - 1) * segs + k, b = 1 + (i - 1) * segs + ((k + 1) % segs);
    idx.push(a, a + segs, b, b, a + segs, b + segs);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Everything turned: the washer on the drawer, the waisted stem, the underside and rolled rim of the head, the
// moulding, the beads' channel and the collar round the face. And the beads. Facing +z, in millimetres.
export function knobBody(): { turned: THREE.BufferGeometry; beads: THREE.BufferGeometry[] } {
  const back: [number, number][] = [
    [0, 0], [16.6, 0], [17, 0.7], [16.4, 1.8], [14, 2.6], [10.6, 3.1], [8.7, 4.4], [7.7, 7], [7.2, 12], [7.5, 17.5], [8.6, 21.5], [11, 24.4],
    [15, 26.4], [21, 27.7], [28, 28.6], [34, 29.3], [38.4, 30], [40.9, 30.9], [42, 32], [42.3, 33.4],
  ].map(([r, z]) => [r, z - KNOB.stand]);
  const top: [number, number][] = [];
  for (let r = 42; r >= KNOB.face - 1e-6; r -= 0.32) top.push([r, turned(r) + dome(r)]);
  top.push([KNOB.face, ground(KNOB.face) + dome(KNOB.face)]);
  const pts = [...back, ...top].map(([r, z]) => [r * S, (z + KNOB.stand) * S] as [number, number]);
  const t = lathe(pts, 56).rotateX(Math.PI / 2);
  const beads: THREE.BufferGeometry[] = [];
  const bead = new THREE.SphereGeometry(3.05 * S, 8, 6);
  for (let i = 0; i < KNOB.beads; i++) {
    const a = ((i + 0.5) / KNOB.beads) * Math.PI * 2;
    beads.push(bead.clone().translate(33.5 * Math.cos(a) * S, 33.5 * Math.sin(a) * S, (1.6 + dome(33.5) + KNOB.stand) * S));
  }
  return { turned: t, beads };
}

// How high the head's rim plane stands off the face it is fixed to, and the top of its dome, in millimetres.
export const KNOB_RIM = KNOB.stand * S;
export const KNOB_TOP = (KNOB.stand + ground(0) + dome(0)) * S;
