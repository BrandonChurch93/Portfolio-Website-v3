import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder } from '../../../../world/build';
import { ATLAS, REG, BAND_MID, type Region } from './art';

// Shapes and uvs for the camera, in millimetres. A turned part is a lathe whose round is smooth and whose profile
// keeps its edges, so a chamfer catches its own line of light.

export const DEG = Math.PI / 180;

export function turned(pts: [number, number][], seg = 96, from = 0, sweep = Math.PI * 2): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, from, sweep);
  return toCreasedNormals(g, 32 * DEG);
}

// What the camera's surface shader raises on a part (materials.ts), carried in its cell attribute: a count, a depth in
// millimetres, a shape, and which pattern: ribs round the part, ribs along it, a pebbled skin, or engraving.
export const PATTERN = { round: 0, along: 1, pebble: 2, ink: 3 } as const;
const cell = (g: THREE.BufferGeometry, v: [number, number, number, number]) => {
  const c = g.getAttribute('position').count, a = new Float32Array(c * 4);
  for (let i = 0; i < c; i++) a.set(v, i * 4);
  g.setAttribute('cell', new THREE.Float32BufferAttribute(a, 4));
  return g;
};
export const ribs = (g: THREE.BufferGeometry, n: number, depth: number, square = 1, along = false) => cell(g, [n, depth, square, along ? PATTERN.along : PATTERN.round]);
// A pebble about 1 / scale millimetres across, depth millimetres deep.
export const pebble = (g: THREE.BufferGeometry, scale: number, depth: number) => cell(g, [scale, depth, 0, PATTERN.pebble]);
const ink = (g: THREE.BufferGeometry) => cell(g, [0, 0, 0, PATTERN.ink]);

const setUV = (g: THREE.BufferGeometry, f: (p: THREE.Vector3) => [number, number]) => {
  const p = g.getAttribute('position'), uv = new Float32Array(p.count * 2), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const [a, b] = f(v); uv[i * 2] = a; uv[i * 2 + 1] = b; }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
};

// A band round a part turned about y: its whole round is the atlas's row, with the text's middle at angle mid
// (radians, from +z toward +x). dir is which way round the text reads, and flip puts the tops of the letters toward
// the low end of the band.
export function bandUV(geo: THREE.BufferGeometry, region: Region, y0: number, y1: number, mid: number, dir: 1 | -1, flip: boolean): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const [, ry, , rh] = REG[region];
  setUV(g, (p) => {
    let a = (Math.atan2(p.x, p.z) - mid) / (Math.PI * 2);
    a -= Math.round(a);
    const t = THREE.MathUtils.clamp((p.y - y0) / (y1 - y0), 0, 1);
    const row = ry + (flip ? t : 1 - t) * rh;
    return [BAND_MID + dir * a, 1 - row / ATLAS];
  });
  // A triangle across the seam would run the whole row backwards: put its corners on the same side.
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i += 3) {
    const us = [uv.getX(i), uv.getX(i + 1), uv.getX(i + 2)];
    if (Math.max(...us) - Math.min(...us) > 0.5) for (let k = 0; k < 3; k++) if (us[k] < 0.5) uv.setX(i + k, us[k] + 1);
  }
  return ink(g);
}

// A flat face looking up y, in its region: x runs across the region and z runs down it (or up it, with flip), and
// the region's edge is radius r.
export function faceUV(g: THREE.BufferGeometry, region: Region, r: number, flip = false): THREE.BufferGeometry {
  const [rx, ry, rw, rh] = REG[region];
  return ink(setUV(g, (p) => [(rx + (p.x / r * 0.5 + 0.5) * rw) / ATLAS, 1 - (ry + ((flip ? -p.z : p.z) / r * 0.5 + 0.5) * rh) / ATLAS]));
}

// A flat ring or disc lying in xz, looking up, at height y.
export function flatRing(r0: number, r1: number, y: number, seg = 96): THREE.BufferGeometry {
  const g = new THREE.RingGeometry(r0, r1, seg, 2);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

// A lens element: a sphere's cap of curvature radius R whose rim is r wide, at height y, bulging up (or down).
export function element(r: number, R: number, y: number, down = false, seg = 80): THREE.BufferGeometry {
  const th = Math.asin(Math.min(0.999, r / R));
  const g = new THREE.SphereGeometry(R, seg, Math.max(6, Math.round(seg / 7)), 0, Math.PI * 2, 0, th);
  g.translate(0, -R * Math.cos(th), 0);
  if (down) g.scale(1, -1, 1);
  g.translate(0, y, 0);
  return g;
}

// The iris, stopped down: a clean opening of n slightly rounded sides, and the seam of each blade sweeping out from a
// corner of it to the barrel. The blades are one sheet with the opening cut from it, so the opening's edge is clean.
export function iris(n: number, open: number, out: number, y: number): { blades: THREE.BufferGeometry; seams: THREE.BufferGeometry } {
  const step = (Math.PI * 2) / n, corner = open / Math.cos(step / 2);
  const at = (a: number, r: number) => new THREE.Vector2(Math.sin(a) * r, -Math.cos(a) * r);
  const hole: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) for (let k = 0; k < 8; k++) {
    const t = k / 8, a = (i + t) * step;
    // Straight between corners, bowed out a little as a blade's curved edge is.
    const flat = open / Math.cos(a - (i + 0.5) * step);
    hole.push(at(a, flat + Math.sin(Math.PI * t) * open * 0.05));
  }
  const ring = new THREE.Shape(Array.from({ length: 96 }, (_, k) => at((k / 96) * Math.PI * 2, out)));
  ring.holes.push(new THREE.Path(hole));
  const blades = new THREE.ShapeGeometry(ring, 1).rotateX(-Math.PI / 2).translate(0, y, 0);
  const strips: THREE.BufferGeometry[] = [];
  const w = 0.22;
  for (let i = 0; i < n; i++) {
    const side: THREE.Vector2[] = [], back: THREE.Vector2[] = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12, a = i * step + t * step * 1.3, r = corner + (out - corner) * t;
      side.push(at(a - w / r, r)); back.push(at(a + w / r, r));
    }
    strips.push(new THREE.ShapeGeometry(new THREE.Shape([...side, ...back.reverse()]), 1).rotateX(-Math.PI / 2).translate(0, y + 0.05, 0));
  }
  return { blades, seams: mergeGeometries(strips.map((g) => g.toNonIndexed()), false)! };
}

// Adds to a builder through a transform: every thing on the camera is built in its own frame.
export class Put {
  constructor(private b: Builder, private m: THREE.Matrix4) {}
  add(g: THREE.BufferGeometry, mat: THREE.Material, local?: THREE.Matrix4, shadow = true) {
    const m = local ? this.m.clone().multiply(local) : this.m;
    this.b.add(g, mat, m, shadow ? {} : { shadow: false });
  }
  sub(local: THREE.Matrix4) { return new Put(this.b, this.m.clone().multiply(local)); }
  // Glass carries the axis of the barrel it sits in, in the part's frame, so it sees only the lights the barrel's
  // opening lets in (materials.ts).
  glass(g: THREE.BufferGeometry, mat: THREE.Material) {
    const d = new THREE.Vector3(0, 1, 0).transformDirection(this.m);
    this.add(cell(g, [d.x, d.y, d.z, 0]), mat, undefined, false);
  }
}

// A plane's own uvs squeezed into the place in the atlas the body's code is in.
export function codeUV(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const [x, y, w, h] = REG.code;
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * w) / ATLAS, 1 - (y + (1 - uv.getY(i)) * h) / ATLAS);
  return ink(g);
}
