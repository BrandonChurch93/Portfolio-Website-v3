import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { CHAMFER, type Cell, Mesh, type Plane, type Solid, type V3, boxSolid, chamfer, cut, moveSolid, noise3, unit } from './hull';
import { KIND } from './look';

const TAU = Math.PI * 2;

// Small tools for making the things on the slabs and the chunks, in units.

export const CLIP = 100;
export const cell = (kind: number, a = 0, b = 0, c = 0): Cell => [kind, a, b, c];

// What every face of a solid is made of, with its chamfers marked, and what a face cut by a clip plane shows.
export type Look = (tag: number, n: V3) => Cell;
export const plain = (k: Cell, torn?: Cell): Look => (tag) => (tag === CLIP && torn ? torn : tag === CHAMFER ? [k[0], k[1], 1, k[3]] : k);

export interface SolidOpts {
  // Cuts in the solid's own frame, each a normal and how far out it lies.
  cuts?: Plane[];
  // Where it stands and how it is turned.
  at?: V3; turn?: V3;
  // Planes in the slab's frame it is cut by, so it ends where the slab was torn.
  clip?: Plane[];
  bevel?: number;
}

export function solid(hx: number, hy: number, hz: number, o: SolidOpts = {}): Solid {
  let s = boxSolid(hx, hy, hz);
  (o.cuts ?? []).forEach((p, i) => { s = cut(s, { n: unit(p.n), d: p.d }, 10 + i); });
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...(o.at ?? [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.turn ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
  s = moveSolid(s, m);
  for (const p of o.clip ?? []) s = cut(s, p, CLIP);
  return o.bevel ? chamfer(s, o.bevel) : s;
}

export const place = (at: V3, turn: V3 = [0, 0, 0], s: number | V3 = 1): THREE.Matrix4 =>
  new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)), typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s));

// A turned profile: a column, a bowl, a lamp. Points are [radius, height].
export function turned(m: Mesh, pts: [number, number][], seg: number, at: THREE.Matrix4, k: Cell): void {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  m.geo(g, at, k);
  g.dispose();
}

export function rod(m: Mesh, r: number, h: number, seg: number, at: THREE.Matrix4, k: Cell, rTop = r): void {
  const g = new THREE.CylinderGeometry(rTop, r, h, seg, 1, false);
  g.translate(0, h / 2, 0);
  m.geo(g, at, k);
  g.dispose();
}

// A lump of leaves: a ball pushed in and out by a noise. Its normals are bent toward the crown's own, so a crown of
// several lumps shades as one mass with clumps in it.
export function canopy(m: Mesh, r: number, at: THREE.Matrix4, k: Cell, seed: number, flat = 1, crown?: THREE.Vector3, detail = 1): void {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const n = noise3(seed), p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k2 = 0.74 + 0.5 * n(x * 1.9 + 3, y * 1.9, z * 1.9);
    p.setXYZ(i, x * r * k2, y * r * k2 * flat, z * r * k2);
  }
  g.computeVertexNormals();
  g.applyMatrix4(at);
  const nn = g.getAttribute('normal'), v = new THREE.Vector3(), c = crown ?? new THREE.Vector3().setFromMatrixPosition(at), w = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(nn, i);
    w.fromBufferAttribute(g.getAttribute('position'), i).sub(c).normalize();
    v.multiplyScalar(0.45).addScaledVector(w, 0.55).normalize();
    nn.setXYZ(i, v.x, v.y, v.z);
  }
  m.geo(g, new THREE.Matrix4(), k);
  g.dispose();
}

// A broadleaf tree: a trunk that forks, and a crown of lumps.
export function broadleaf(m: Mesh, r: () => number, at: V3, tall: number, wide: number, tone: number, seed: number): void {
  const base = place(at, [(r() - 0.5) * 0.14, r() * TAU, (r() - 0.5) * 0.14]);
  rod(m, 0.55 + wide * 0.05, tall * 0.55, 6, base, cell(KIND.wood, r()), 0.35 + wide * 0.03);
  for (let i = 0; i < 2; i++) rod(m, 0.3 + wide * 0.025, tall * 0.3, 5, base.clone().multiply(place([0, tall * 0.45, 0], [(r() - 0.5) * 1.1, r() * TAU, (r() - 0.5) * 1.1])), cell(KIND.wood, r()), 0.15);
  const crown = new THREE.Vector3(0, tall * 0.72, 0).applyMatrix4(base);
  for (let i = 0; i < 5; i++) {
    const a = r() * TAU, off = i ? wide * (0.3 + 0.18 * r()) : 0;
    canopy(m, wide * (0.24 + 0.12 * r()), base.clone().multiply(place([Math.cos(a) * off, tall * (0.6 + 0.24 * r()) + (i ? 0 : tall * 0.1), Math.sin(a) * off])), cell(KIND.leaf, Math.min(1, Math.max(0, tone + (r() - 0.5) * 0.3))), seed + i, 0.8, crown);
  }
}

// A conifer: a straight trunk under tiers of drooping, ragged boughs, dark as a pine is in autumn's evening.
export function conifer(m: Mesh, r: () => number, at: V3, tall: number, wide: number, seed: number): void {
  const base = place(at, [(r() - 0.5) * 0.08, r() * TAU, (r() - 0.5) * 0.08]);
  rod(m, 0.45 + wide * 0.04, tall * 0.95, 6, base, cell(KIND.wood, 0.3), 0.15);
  const tiers = 4 + Math.floor(r() * 2);
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers, w = wide * (1 - t * 0.78) * (0.85 + 0.3 * r()), h = tall * (0.3 + 0.17 * (1 - t));
    const y = tall * (0.18 + 0.72 * t);
    const g = new THREE.ConeGeometry(w, h, 14, 2, true);
    const p = g.getAttribute('position'), n = noise3(seed + i);
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), yy = p.getY(k), z = p.getZ(k), spoke = Math.round(Math.atan2(z, x) / (TAU / 14)) & 1;
      const q = (0.75 + 0.5 * n(x * 0.6 + i, yy * 0.6, z * 0.6)) * (spoke ? 0.62 : 1);
      p.setXYZ(k, x * q, yy - (yy < 0 ? (n(x, z, 3) - 0.3) * h * 0.25 : 0), z * q);
    }
    g.computeVertexNormals();
    m.geo(g.translate(0, y, 0), base, cell(KIND.leaf, 0.08 + 0.12 * r()));
    g.dispose();
  }
}

// Roots hanging out of torn earth: each a chain of tapering pieces, kinked, falling as it goes.
export function root(m: Mesh, r: () => number, from: V3, out: V3, long: number, thick: number, depth = 0): void {
  let p = new THREE.Vector3(...from), d = new THREE.Vector3(out[0] * 0.6, -1, out[2] * 0.6).normalize(), w = thick;
  const segs = 3 + Math.floor(r() * 3);
  for (let i = 0; i < segs; i++) {
    const l = (long / segs) * (0.7 + 0.6 * r());
    d.add(new THREE.Vector3((r() - 0.5) * 0.9, -0.25, (r() - 0.5) * 0.9)).normalize();
    const g = new THREE.CylinderGeometry(w * 0.65, w, l, 4, 1, true).translate(0, -l / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
    m.geo(g, new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)), cell(KIND.wood, 0.15));
    g.dispose();
    p = p.clone().addScaledVector(d, l);
    w *= 0.65;
    if (depth < 2 && r() < 0.35 && i < segs - 1) root(m, r, p.toArray() as V3, [d.x, 0, d.z], long * 0.35, w * 0.8, depth + 1);
  }
}

// A boulder: a block with many cuts and wide chamfers, sat into the ground it lies on.
export function boulder(m: Mesh, r: () => number, at: V3, size: number, seed: number, clip: Plane[] = []): void {
  const cuts: Plane[] = [];
  for (let i = 0; i < 9; i++) { const z = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - z * z); cuts.push({ n: [s * Math.cos(a), z, s * Math.sin(a)], d: size * (0.62 + 0.25 * r()) }); }
  const sld = solid(size, size * 0.7, size * 0.85, { cuts, at, turn: [r() * 0.4, r() * TAU, r() * 0.3], clip, bevel: size * 0.12 });
  m.solid(sld, (tag) => (tag === CHAMFER ? [KIND.rock, 0.7, 1, at[1] + size] : ROCK(0.5 + 0.4 * r(), at[1] + size)), { step: size * 0.9, lift: rockLift(seed, size * 0.08, 0.6 / size), reach: size * 0.3 });
}

// Where a slab's broken outline lies at a bearing: how far out from its middle, on its ground.
export function edgeAt(sides: Plane[], a: number): number {
  let best = Infinity;
  for (const p of sides) {
    const k = p.n[0] * Math.cos(a) + p.n[2] * Math.sin(a);
    if (k > 1e-3) best = Math.min(best, p.d / k);
  }
  return best;
}

// The planes round a broken outline: n of them, at a radius of about `far`, each leaning a little.
export function outline(r: () => number, n: number, far: number, lean: number, at = 0): Plane[] {
  const out: Plane[] = [];
  for (let i = 0; i < n; i++) {
    const a = at + ((i + 0.5 + (r() - 0.5) * 0.6) / n) * Math.PI * 2;
    out.push({ n: unit([Math.cos(a), (r() - 0.6) * lean, Math.sin(a)]), d: far * (0.78 + 0.32 * r()) });
  }
  return out;
}

// A face roughened as broken rock is: broad hollows and small steps, as a lift along its normal.
export function rockLift(seed: number, amount: number, scale: number): (p: V3) => number {
  const a = noise3(seed), b = noise3(seed + 7);
  return (p) => ((a(p[0] * scale, p[1] * scale, p[2] * scale) - 0.5) * 2 + (b(p[0] * scale * 3.1, p[1] * scale * 3.1, p[2] * scale * 3.1) - 0.5) * 0.7) * amount;
}

export const ROCK = (tone: number, top: number): Cell => cell(KIND.rock, tone, 0, top);
