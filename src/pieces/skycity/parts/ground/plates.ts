import * as THREE from 'three';
import { ShapeUtils } from 'three';
import { seeded, slice } from '../../../../world/build';
import { AVENUES, MARGIN, PLANET } from '../../layout';
import { type Crop, TALL, bareness, groundAt } from './bare';
import { D2R, bearing, clamp, edgeAt, gap, onDome, polar, ringNoise, seen, smooth } from './kit';
import { onRoad } from './roads';

// The broken margin. From the margin out to the torn edge the land is no longer whole: it is the planet's crust broken
// into blocks, each as thick as the crust, along scarps that run round the world as the edge does and cracks across
// them, the rows stepping down toward the edge as land does where a cliff gives way, and the blocks there dropped,
// tilted, and some hanging over the edge as if sliding off it. A few splits open wide toward the edge, and the plates that stood in them have fallen
// into them. Deep in the cracks is the crack's floor, where the stream's light shows faintly from below.
// Each plate is built flat on the map, moved as it broke (its matrix, in the map's own space), then laid over the
// dome. Its top keeps the map's coordinates it had before it broke, so the floor's pattern, its roads and its inlays,
// breaks with it. What stands on a plate is moved with it (on in ./margin.ts).

// How deep the crack's floor lies under the ground, and how much deeper in a split.
export const DEEP = { floor: 17, split: 34 } as const;
// The bearings the margin is broken over. Beyond, on the far side, the floor runs whole to the edge.
export const BROKEN = 134;
// How far in from the torn edge the plates stop, so they never stand on the line the torn rock begins on.
const SHY = 0.7;

// The splits: where one opens toward the edge, from how far across the margin (0 its inner side, 1 the edge), and
// how wide it is at the edge. None on a road, so each road runs on to the edge and breaks off there.
export const SPLITS = [
  { at: -101, from: 0.3, w: 18 }, { at: -64, from: 0.12, w: 24 }, { at: -19, from: 0.35, w: 14 },
  { at: 14, from: 0.25, w: 19 }, { at: 40, from: 0.45, w: 11 }, { at: 60, from: 0.15, w: 24 }, { at: 106, from: 0.32, w: 17 },
] as const;
const splitFrom = (i: number) => { const s = SPLITS[i]; return inner(s.at) + s.from * (edgeAt(s.at) - inner(s.at)); };

const wobble = ringNoise(4401, [[3, 4], [7, 3], [17, 2.2], [41, 1.2]]);
// Where the land starts to break, at a bearing: a ragged line a little outside the margin, and never closer to the
// torn edge than a band of broken ground, so where the edge bites deep the land breaks up before it.
export function inner(deg: number): number {
  if (!inners) { inners = new Float32Array(7201); for (let i = 0; i < inners.length; i++) { const d = i * 0.05; inners[i] = Math.min(MARGIN + 6 + 0.45 * wobble(d), edgeAt(d) - 26 + 0.35 * wobble(d + 40)); } }
  const f = (((deg % 360) + 360) % 360) / 0.05, i = Math.floor(f), t = f - i;
  return inners[i] + (inners[Math.min(7200, i + 1)] - inners[i]) * t;
}
// inner, worked out once at a twentieth of a degree: it is asked for at every point of the margin.
let inners: Float32Array | null = null;

const shy = (deg: number) => edgeAt(deg) - SHY;

// How far across a split a point is: 0 on its middle line, 1 at its side, and more outside it. Its sides are ragged,
// and differ from one another.
function across(x: number, z: number): { k: number; split: number; side: number } {
  const r = Math.hypot(x, z), deg = bearing(x, z);
  let best = { k: 99, split: -1, side: 0 };
  SPLITS.forEach((s, i) => {
    const from = splitFrom(i);
    if (r < from - 4 || gap(deg, s.at) > 12) return;
    const e = edgeAt(s.at), t = clamp((r - from) / (e - from), 0, 1.2);
    const mid = ((((deg - s.at + 540) % 360) - 180) * D2R) * r - (5 * Math.sin(r * 0.071 + i) + 2.2 * Math.sin(r * 0.23 + 2 * i));
    const side = Math.sign(mid) || 1;
    const half = (s.w / 2) * Math.pow(t, 0.85) + (t > 0 ? 1.4 * Math.sin(r * 0.61 + i * 3 + side) + 0.9 * Math.sin(r * 1.37 + side * 2.1) : 0);
    const k = half > 0.2 ? Math.abs(mid) / half : 99;
    if (k < best.k) best = { k, split: i, side };
  });
  return best;
}

// How much of the stream's light shows at a point of the cracks, 0 to 1: strong in a split, faint elsewhere and more
// toward the edge.
export function glowAt(x: number, z: number): number {
  const deg = bearing(x, z), r = Math.hypot(x, z), a = across(x, z);
  const wide = a.split >= 0 ? (1 - smooth(0.9, 2.2, a.k)) * smooth(splitFrom(a.split), splitFrom(a.split) + 18, r) : 0;
  const t = clamp((r - inner(deg)) / (edgeAt(deg) - inner(deg)), 0, 1);
  return clamp(wide + 0.22 * t * t, 0, 1);
}

export interface Plate {
  // Its outline on the map, before it moved, and its middle.
  poly: THREE.Vector2[];
  c: THREE.Vector2;
  // How it moved, in the map's own space, and the turn alone.
  m: THREE.Matrix4;
  q: THREE.Quaternion;
  // How thick it is, how far out across the margin it lies (0 at its inner side, 1 at the edge), a seed, and whether
  // it fell into a split or hangs over the edge.
  thick: number;
  t: number;
  seed: number;
  sunk: boolean;
  hangs: boolean;
}

function clipHalf(poly: THREE.Vector2[], n: THREE.Vector2, d: number): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = a.dot(n) - d, db = b.dot(n) - d;
    if (da <= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) out.push(a.clone().lerp(b, da / (da - db)));
  }
  return out;
}

const area = (p: THREE.Vector2[]) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return s / 2; };

// The scarps the land broke along: lines that run round the world, roughly as the edge does, each so far across the
// margin (0 its inner side, 1 the edge). The rows between them step down toward the edge. They come closer together
// toward the edge.
const ROWS = [0, 0.34, 0.6, 0.8, 0.93, 1.03];
// How jagged a scarp is, as it runs round: so many units out or in at an arc length.
function jag(k: number, s: number): number {
  if (k === 0) return 0;
  return 1.8 * Math.sin(s * 0.043 + k * 1.7) + 1.3 * Math.sin(s * 0.17 + k * 3.1) + 0.7 * Math.sin(s * 0.47 + k) + 0.35 * Math.sin(s * 1.13 + 2 * k);
}
// How wide a scarp has opened at a bearing: it pinches shut in stretches and gapes in others, wider toward the edge.
// The first, where the whole land meets the broken, is shut but for a few short splits.
function scarpGap(k: number, deg: number): number {
  const s = deg * D2R * 640, t = ROWS[Math.min(k, ROWS.length - 1)];
  const open = Math.max(0, Math.sin(s * 0.019 + k * 2.3) + 0.55 * Math.sin(s * 0.061 + k * 1.1) - (k === 0 ? 1.05 : 0.15));
  return (k === 0 ? 1.6 : 0.9 + 4.5 * Math.pow(t, 1.3)) * Math.min(1, open * 1.6) + 0.05;
}
export function scarp(k: number, deg: number): number {
  const lo = inner(deg), span = edgeAt(deg) - lo;
  return lo + span * ROWS[Math.min(k, ROWS.length - 1)] + 0.6 * jag(k, deg * D2R * 640);
}

// Every plate, the same on every call.
export async function plates(): Promise<Plate[]> {
  const r = seeded(2207), out: Plate[] = [];
  const ARC = 640 * D2R;
  let id = 0;
  for (let k = 0; k + 1 < ROWS.length; k++) {
    // Where the cracks across this row fall, as bearings, each slanting and wandering a little as it crosses.
    const cuts: { at: number; slant: number; seed: number }[] = [];
    for (let deg = -BROKEN - 8; deg < BROKEN + 8; ) {
      const t = ROWS[k];
      cuts.push({ at: deg, slant: (r() - 0.5) * 14, seed: r() * 100 });
      deg += ((18 + 44 * (1 - t)) * (0.45 + 1.1 * r())) / ARC;
    }
    const gapIn = (deg: number) => scarpGap(k, deg), gapOut = (deg: number) => scarpGap(k + 1, deg);
    const lo = (deg: number) => scarp(k, deg) + gapIn(deg) / 2;
    const hi = (deg: number) => Math.min(scarp(k + 1, deg) - gapOut(deg) / 2, shy(deg));
    // A crack's bearing at a share u of the way across the row, and the gap it leaves, which widens toward the edge.
    const crack = (c: { at: number; slant: number; seed: number }, u: number, deg: number) => {
      const rr = lo(deg) + (hi(deg) - lo(deg)) * u;
      return c.at + ((u - 0.5) * c.slant + 1.6 * Math.sin(u * 7 + c.seed) + 0.8 * Math.sin(u * 17 + c.seed * 2)) / rr / D2R;
    };
    for (let i = 0; i + 1 < cuts.length; i++) {
      const a = cuts[i], b = cuts[i + 1], mid = (a.at + b.at) / 2;
      if (!seen(mid, BROKEN)) continue;
      if (hi(mid) - lo(mid) < 2.5) continue;
      const t0 = clamp((lo(mid) - inner(mid)) / (edgeAt(mid) - inner(mid)), 0, 1);
      const g = (0.5 + 2.6 * t0 + r() * (0.4 + 1.4 * t0)) / lo(mid) / D2R / 2;
      const poly: THREE.Vector2[] = [];
      const side = (c: typeof a, sign: number, rev: boolean) => {
        const n = Math.max(2, Math.ceil((hi(c.at) - lo(c.at)) / 4.5));
        for (let j = 0; j <= n; j++) { const u = rev ? 1 - j / n : j / n, d = crack(c, u, c.at) + sign * g; poly.push(polar(d, lo(d) + (hi(d) - lo(d)) * u)); }
      };
      const along = (d0: number, d1: number, outer: boolean) => {
        const n = Math.max(2, Math.ceil((Math.abs(d1 - d0) * ARC) / 4.5));
        for (let j = 1; j < n; j++) { const d = d0 + ((d1 - d0) * j) / n; poly.push(polar(d, outer ? hi(d) : lo(d))); }
      };
      const aIn = crack(a, 0, a.at) + g, aOut = crack(a, 1, a.at) + g, bIn = crack(b, 0, b.at) - g, bOut = crack(b, 1, b.at) - g;
      if (bIn <= aIn || bOut <= aOut) continue;
      along(aIn, bIn, false);
      side(b, -1, false);
      along(bOut, aOut, true);
      side(a, 1, true);
      // Inside the torn edge, and the splits carved out.
      const pc = poly.reduce((acc, v) => acc.add(v), new THREE.Vector2()).divideScalar(poly.length);
      const into = across(pc.x, pc.y);
      for (const v of poly) {
        const d = bearing(v.x, v.y);
        if (v.length() > shy(d)) v.multiplyScalar(shy(d) / v.length());
        if (into.k >= 0.75) {
          const s = across(v.x, v.y);
          if (s.split >= 0 && s.k < 1) {
            const sd = ((bearing(pc.x, pc.y) - SPLITS[s.split].at + 540) % 360) - 180 >= 0 ? 1 : -1, vd = d * D2R;
            const step = new THREE.Vector2(Math.cos(vd), -Math.sin(vd)).multiplyScalar(0.5 * sd);
            for (let q = 0; q < 60 && across(v.x, v.y).k < 1; q++) v.add(step);
          }
        }
      }
      // Near the edge the bigger blocks broke again, into two or three.
      const pieces = t0 > 0.5 && r() < 0.6 ? cutAcross(poly, r) : [poly];
      for (const piece of pieces) {
        const ar = area(piece);
        if (Math.abs(ar) < 18) continue;
        if (ar < 0) piece.reverse();
        const p = move(piece, into.k, k, r, id++);
        if (p) out.push(p);
      }
      await slice();
    }
    await slice();
  }
  return out;
}

// Breaks a block in two along a jagged line across it.
function cutAcross(poly: THREE.Vector2[], r: () => number): THREE.Vector2[][] {
  const c = poly.reduce((acc, v) => acc.add(v), new THREE.Vector2()).divideScalar(poly.length);
  const a = r() * Math.PI, n = new THREE.Vector2(Math.cos(a), Math.sin(a)), w = 0.6 + r() * 1.4;
  const one = clipHalf(poly, n, c.dot(n) - w / 2), two = clipHalf(poly, n.clone().negate(), -c.dot(n) - w / 2);
  return [one, two].filter((p) => p.length >= 3);
}

// How a block moved. The rows step down toward the edge, and most blocks rotated back as they slumped, their outer
// side up, as the ground does where a cliff gives way; some tipped forward; the ones in a split fell into it; and at
// the edge some hang over it.
function move(poly: THREE.Vector2[], split: number, row: number, r: () => number, id: number): Plate | null {
  const c = poly.reduce((acc, v) => acc.add(v), new THREE.Vector2()).divideScalar(poly.length);
  const cd = bearing(c.x, c.y), cr = c.length();
  const t = clamp((cr - inner(cd)) / (edgeAt(cd) - inner(cd)), 0, 1);
  const road = AVENUES.some((a) => gap(cd, a) * D2R * cr < (a === 0 ? 13 : 9)) || onRoad(c.x, c.y);
  const pr = seeded(id * 7919 + 13), sunk = split < 0.75, hangs = !sunk && cr > edgeAt(cd) - (road ? 18 : 14) && (road || pr() < 0.45);
  void r;
  // Near the edge some blocks are gone, fallen into the tear: the brink has holes in it, and no line runs round it.
  const gone = pr();
  if (!road && !sunk && t > 0.62 && gone < 0.1 + 0.35 * (t - 0.62)) return null;
  const out1 = c.clone().normalize(), tan = new THREE.Vector3(out1.y, 0, -out1.x), rad = new THREE.Vector3(out1.x, 0, out1.y);
  let inside = 0, outside = 0;
  for (const v of poly) { const d = v.clone().sub(c).dot(out1); inside = Math.min(inside, d); outside = Math.max(outside, d); }
  const back = pr() < 0.7;
  const pivot = new THREE.Vector3(c.x, 0, c.y).addScaledVector(rad, back ? outside : inside);
  let tilt = (back ? -1 : 1) * Math.pow(t, 1.1) * (0.4 + pr()) * 26 * D2R, roll = (pr() - 0.5) * t * 22 * D2R;
  // Toward the edge the land slumped far more in some stretches than others, so the brink rises and falls.
  const slump = 0.5 + 0.5 * Math.sin(cd * D2R * 9 + 1.3) * Math.sin(cd * D2R * 4.1 + 0.4);
  let drop = Math.pow(t, 1.3) * (4 + 20 * pr()) + row * 0.8 * t + 0.2 * pr() + Math.pow(t, 2) * slump * (8 + 26 * pr());
  if (sunk) { tilt = (16 + 22 * pr()) * D2R * (pr() < 0.5 ? 1 : -1); roll = (pr() - 0.5) * 30 * D2R; drop = 10 + pr() * 12; }
  if (hangs) {
    pivot.set(c.x, 0, c.y).addScaledVector(rad, inside);
    tilt = (20 + 34 * pr()) * D2R; roll = (pr() - 0.5) * 22 * D2R; drop = 1 + pr() * 6 + t * 4 + slump * 10 * pr();
  }
  const q = new THREE.Quaternion().setFromAxisAngle(tan, tilt).premultiply(new THREE.Quaternion().setFromAxisAngle(rad, roll));
  const m = new THREE.Matrix4().makeTranslation(pivot.x, -drop, pivot.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, 0, -pivot.z));
  return { poly, c, m, q, thick: DEEP.floor + 4 + pr() * 8 + (sunk ? 6 : 0) + t * 10 * pr(), t, seed: pr(), sunk, hangs };
}

// Finds the plate a place of the map is on, or none where the ground is whole.
export function finder(list: Plate[]): (x: number, z: number) => Plate | null {
  const CELL = 30, grid = new Map<string, Plate[]>();
  for (const p of list) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const v of p.poly) { x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); z0 = Math.min(z0, v.y); z1 = Math.max(z1, v.y); }
    for (let gx = Math.floor(x0 / CELL); gx <= Math.floor(x1 / CELL); gx++) for (let gz = Math.floor(z0 / CELL); gz <= Math.floor(z1 / CELL); gz++) {
      const k = `${gx},${gz}`;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k)!.push(p);
    }
  }
  const inside = (poly: THREE.Vector2[], x: number, z: number) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > z) !== (b.y > z) && x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  };
  return (x, z) => {
    const here = grid.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) ?? [];
    let near: Plate | null = null, best = 1e9;
    for (const p of here) {
      if (inside(p.poly, x, z)) return p;
      const d = p.c.distanceTo(new THREE.Vector2(x, z));
      if (d < best) { best = d; near = p; }
    }
    const deg = bearing(x, z);
    return Math.hypot(x, z) < inner(deg) || !seen(deg, BROKEN) ? null : near;
  };
}

// The floor's attributes: where on the map a point was before it broke, how deep under the ground it is, and what it
// is (0 the ground's top, 1 a broken face, 2 the crack's floor, 3 the rock under the torn edge); and how high the land
// stood there as a share of its tallest, how far out across the margin, and how much of the stream's light shows
// there. A normal given for a point (the land's own slope) is kept; where none is given, it is the face's.
export interface Floorish { pos: number[]; plan: number[]; aux: number[]; nrm: number[] }
export const floorish = (): Floorish => ({ pos: [], plan: [], aux: [], nrm: [] });
// Lays what was built on the map over the dome, a slice at a time: each point stands so high over the land at its
// place. With idx the points are shared and their normals are the surface's; without, each triangle is flat.
export async function toGeometry(f: Floorish, idx?: number[]): Promise<THREE.BufferGeometry> {
  const g = new THREE.BufferGeometry(), n = f.pos.length / 3, pos = new Float32Array(f.pos.length);
  const nrm = new Float32Array(f.pos.length), q = new THREE.Quaternion(), v = new THREE.Vector3(), axis = new THREE.Vector3(), out = [0, 0, 0];
  const given = f.nrm.length > 0;
  for (let i = 0; i < n; i++) {
    const x = f.pos[i * 3], y = f.pos[i * 3 + 1], z = f.pos[i * 3 + 2];
    onDome(x, y, z, out, 0);
    pos[i * 3] = out[0]; pos[i * 3 + 1] = out[1]; pos[i * 3 + 2] = out[2];
    if (given && !Number.isNaN(f.nrm[i * 3])) {
      const far = Math.hypot(x, z);
      if (far > 1e-6) q.setFromAxisAngle(axis.set(z / far, 0, -x / far), far / PLANET.r); else q.identity();
      v.set(f.nrm[i * 3], f.nrm[i * 3 + 1], f.nrm[i * 3 + 2]).applyQuaternion(q);
      nrm[i * 3] = v.x; nrm[i * 3 + 1] = v.y; nrm[i * 3 + 2] = v.z;
    } else nrm[i * 3] = NaN;
    if (i % 4000 === 3999) await slice();
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('plan', new THREE.Float32BufferAttribute(f.plan, 4));
  g.setAttribute('aux', new THREE.Float32BufferAttribute(f.aux, 3));
  if (idx) g.setIndex(idx);
  await slice();
  g.computeVertexNormals();
  // A triangle with no area has no normal, and one NaN in a shader blacks out the whole canvas: such a point looks up.
  const nn = g.getAttribute('normal');
  for (let i = 0; i < nn.count; i++) {
    if (!Number.isNaN(nrm[i * 3])) nn.setXYZ(i, nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]);
    else if (!(Math.hypot(nn.getX(i), nn.getY(i), nn.getZ(i)) > 0.5)) nn.setXYZ(i, 0, 1, 0);
  }
  g.computeBoundingSphere();
  return g;
}

// The plates themselves: each one's top and its broken faces, in one geometry.
export async function plateGeometry(list: Plate[]): Promise<THREE.BufferGeometry> {
  const f = floorish(), v = new THREE.Vector3(), up = new THREE.Vector3();
  let n = 0;
  for (const p of list) {
    // The ground's own height and how bare it is, at each corner of the block before it broke.
    const gh = p.poly.map((q) => groundAt(q.x, q.y)), bk = p.poly.map((q) => bareness(q.x, q.y)), gc = gh.reduce((s2, h) => s2 + h, 0) / gh.length;
    const put = (x: number, y: number, z: number, depth: number, what: number, glow: number, g: number, bare = 0) => {
      v.set(x, y + g, z).applyMatrix4(p.m);
      f.pos.push(v.x, v.y, v.z);
      f.plan.push(x, z, what === 0 ? bare : depth, what);
      f.aux.push(g / TALL, p.t, glow);
      if (what === 0) { up.set(0, 1, 0).applyQuaternion(p.q); f.nrm.push(up.x, up.y, up.z); } else f.nrm.push(NaN, NaN, NaN);
    };
    const tris = ShapeUtils.triangulateShape(p.poly, []);
    for (const [a, b, c] of tris) {
      const A = p.poly[a], B = p.poly[b], C = p.poly[c], up2 = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x) > 0;
      for (const k of up2 ? [a, c, b] : [a, b, c]) put(p.poly[k].x, 0, p.poly[k].y, 0, 0, 0, gh[k], bk[k]);
    }
    // Its underside is broken rock and not a slab's flat face: its sides tear off at uneven depths, and under them it
    // breaks in several planes to a low, blunt keel. Pointed keels hung under the brink in a row like teeth.
    const pr = seeded(Math.floor(p.seed * 1e6) + 5), n2 = p.poly.length, T = p.thick;
    const deep = p.poly.map(() => T * (0.7 + 0.6 * pr()));
    const keel = T * (p.hangs ? 1.15 + 0.3 * pr() : 0.95 + 0.25 * pr());
    const kc = p.c.clone().add(new THREE.Vector2(pr() - 0.5, pr() - 0.5).multiplyScalar(Math.sqrt(Math.abs(area(p.poly))) * 0.35));
    const glows = p.poly.map((q) => glowAt(q.x, q.y));
    for (let k = 0; k < n2; k++) {
      const k2 = (k + 1) % n2, a = p.poly[k], b = p.poly[k2], ga = glows[k], gb = glows[k2], da = deep[k], db = deep[k2], ha = gh[k], hb = gh[k2];
      put(a.x, 0, a.y, 0, 1, ga, ha); put(b.x, 0, b.y, 0, 1, gb, hb); put(b.x, -db, b.y, db, 1, gb, hb);
      put(a.x, 0, a.y, 0, 1, ga, ha); put(b.x, -db, b.y, db, 1, gb, hb); put(a.x, -da, a.y, da, 1, ga, ha);
      // A lump half way to the keel, so the underside breaks in more than one plane.
      const m = a.clone().add(b).multiplyScalar(0.5).lerp(kc, 0.45), dm = (da + db) / 2 + (keel - (da + db) / 2) * (0.6 + 0.5 * pr()), hm = (ha + hb) / 2;
      put(a.x, -da, a.y, da, 1, ga, ha); put(b.x, -db, b.y, db, 1, gb, hb); put(m.x, -dm, m.y, dm, 1, 0, hm);
      put(a.x, -da, a.y, da, 1, ga, ha); put(m.x, -dm, m.y, dm, 1, 0, hm); put(kc.x, -keel, kc.y, keel, 1, 0, gc);
      put(m.x, -dm, m.y, dm, 1, 0, hm); put(b.x, -db, b.y, db, 1, gb, hb); put(kc.x, -keel, kc.y, keel, 1, 0, gc);
    }
    if (++n % 40 === 0) await slice();
  }
  return toGeometry(f);
}

// The crack's floor under the plates, the face of the whole ground where it breaks off, and the rock under the torn
// edge all the way round, which closes the world where the torn underside meets it.
export async function underGeometry(): Promise<THREE.BufferGeometry[]> {
  const f = floorish();
  const put = (x: number, y: number, z: number, depth: number, what: number, glow: number, t: number) => {
    f.pos.push(x, y, z); f.plan.push(x, z, depth, what); f.aux.push(0, t, glow); f.nrm.push(NaN, NaN, NaN);
  };
  const STEP = 1, rows = 9;
  const depthAt = (x: number, z: number) => { const a = across(x, z); return DEEP.floor + (a.split >= 0 ? (DEEP.split - DEEP.floor) * (1 - smooth(0.6, 1.6, a.k)) : 0); };
  // The crack's floor, as a grid whose points are shared.
  const idx: number[] = [], cols = Math.round((2 * BROKEN + 4) / STEP);
  for (let j = 0; j <= cols; j++) {
    const d = -BROKEN - 2 + j * STEP, r0 = inner(d) - 4, r1 = shy(d);
    for (let k = 0; k <= rows; k++) {
      const q = polar(d, r0 + ((r1 - r0) * k) / rows), dp = depthAt(q.x, q.y);
      put(q.x, -dp, q.y, dp, 2, glowAt(q.x, q.y), clamp((q.length() - inner(d)) / (edgeAt(d) - inner(d)), 0, 1));
    }
    if (j % 40 === 0) await slice();
  }
  for (let j = 0; j < cols; j++) for (let k = 0; k < rows; k++) {
    const a = j * (rows + 1) + k, b = a + rows + 1;
    idx.push(a, a + 1, b + 1, a, b + 1, b);
  }
  const floorG = await toGeometry(f, idx);
  f.pos.length = 0; f.plan.length = 0; f.aux.length = 0; f.nrm.length = 0;
  await slice();
  // The face of the whole ground where it breaks off, down to the crack's floor.
  for (let deg = -BROKEN - 2; deg < BROKEN + 2; deg += STEP) {
    const a = polar(deg, inner(deg)), b = polar(deg + STEP, inner(deg + STEP)), ga = glowAt(a.x, a.y), gb = glowAt(b.x, b.y), D = DEEP.floor + 2;
    const ha = groundAt(a.x, a.y), hb = groundAt(b.x, b.y);
    put(a.x, ha, a.y, 0, 1, ga, 0); put(b.x, -D, b.y, D, 1, gb, 0); put(b.x, hb, b.y, 0, 1, gb, 0);
    put(a.x, ha, a.y, 0, 1, ga, 0); put(a.x, -D, a.y, D, 1, ga, 0); put(b.x, -D, b.y, D, 1, gb, 0);
  }
  await slice();
  // The rock under the torn edge, all the way round: from the crack's floor, or from the ground on the far side,
  // down well inside the torn underside.
  // Its foot is ragged and it stands a little back from the brink, so the blocks hang out over it.
  const fall = (d: number) => 30 + 22 * (0.5 + 0.5 * Math.sin(d * D2R * 23 + 0.7)) * (0.6 + 0.4 * Math.sin(d * D2R * 61)) + 10 * Math.abs(Math.sin(d * D2R * 137));
  const back = (d: number) => edgeAt(d) - SHY - 0.3 - (seen(d, BROKEN + 1) ? 2.5 : 0);
  for (let deg = -150; deg < 150; deg += STEP) {
    const d2 = deg + STEP, broken = (d: number) => seen(d, BROKEN + 1);
    const a = polar(deg, back(deg)), b = polar(d2, back(d2)), fa = fall(deg), fb = fall(d2);
    const ta = broken(deg) ? depthAt(a.x, a.y) : 0, tb = broken(d2) ? depthAt(b.x, b.y) : 0;
    put(a.x, -ta, a.y, ta, 3, 0, 1); put(b.x, -fb, b.y, fb, 3, 0, 1); put(b.x, -tb, b.y, tb, 3, 0, 1);
    put(a.x, -ta, a.y, ta, 3, 0, 1); put(a.x, -fa, a.y, fa, 3, 0, 1); put(b.x, -fb, b.y, fb, 3, 0, 1);
  }
  return [floorG, await toGeometry(f)];
}

// The bedrock that breaks out of the bare ground (outcrops in ./bare.ts): each slab's top, tilted so one side stands as
// a low scarp and the other sinks under the dust, and its sides down into the ground, which show the crust's layers.
// How deep in the crust an outcrop's top lies: its faces show the beds of rock and the copper seam, not the soil.
const CROP_BED = 3.5;
export async function outcropGeometry(list: Crop[]): Promise<THREE.BufferGeometry> {
  const f = floorish();
  for (const o of list) {
    const pr = seeded(Math.floor(o.seed * 1000) + 3), n = 9 + Math.floor(pr() * 6), a = o.turn * D2R, fa = o.face * D2R;
    const ring: { x: number; z: number; top: number; foot: number }[] = [];
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2 + (pr() - 0.5) * 0.3, k = o.r * (0.7 + 0.45 * pr()), u = Math.cos(th) * k * 1.9, v = Math.sin(th) * k * 0.85;
      const x = o.x + u * Math.cos(a) + v * Math.sin(a), z = o.z - u * Math.sin(a) + v * Math.cos(a);
      const along = ((x - o.x) * Math.sin(fa) + (z - o.z) * Math.cos(fa)) / o.r, g = groundAt(x, z);
      ring.push({ x, z, top: g + Math.max(-0.6, o.tall * (0.55 + 0.6 * along) + (pr() - 0.5) * 0.5), foot: g - 1.5 });
    }
    const c = ring.reduce((s2, q) => ({ x: s2.x + q.x / n, z: s2.z + q.z / n, top: s2.top + q.top / n, foot: 0 }), { x: 0, z: 0, top: 0, foot: 0 });
    const put = (x: number, y: number, z: number, depth: number, what: number) => {
      f.pos.push(x, y, z); f.plan.push(x, z, what === 0 ? 1 : depth + CROP_BED, what); f.aux.push(y / TALL, 0, 0); f.nrm.push(NaN, NaN, NaN);
    };
    for (let i = 0; i < n; i++) {
      const p = ring[i], q = ring[(i + 1) % n];
      put(c.x, c.top, c.z, 0, 0); put(q.x, q.top, q.z, 0, 0); put(p.x, p.top, p.z, 0, 0);
      put(p.x, p.top, p.z, 0, 4); put(q.x, q.top, q.z, 0, 4); put(q.x, q.foot, q.z, q.top - q.foot, 4);
      put(p.x, p.top, p.z, 0, 4); put(q.x, q.foot, q.z, q.top - q.foot, 4); put(p.x, p.foot, p.z, p.top - p.foot, 4);
    }
    if (f.pos.length % 3000 < 60) await slice();
  }
  return toGeometry(f);
}
