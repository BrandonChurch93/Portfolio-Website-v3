import * as THREE from 'three';
import { seeded } from '../../../../world/build';

// What grows in the jungle, each as a real tree in 3D: a trunk on buttress roots, great limbs that fork and fork
// again, and at their ends clumps of leaf tufts, thousands to a tree, with vines hanging from the limbs. None of
// these is drawn in the world. Each is drawn once, when the jungle is built, from the page's own view, into a
// picture that keeps what it is at every pixel, which way it faces and how deep in the crown it lies (./bake.ts). The
// world then draws each tree as that picture, lit as it stands (./materials.ts). The view never moves, so the picture
// is the tree.
// Units, as the world's: one a CSS pixel on a screen 1460 wide. y up, z toward the visitor, the foot at the origin.

// What a point of a tree is: the bake draws each its own way.
export const KIND = { bark: 0, tuft: 1, frond: 2, blade: 3, glow: 4 } as const;
type Kind = (typeof KIND)[keyof typeof KIND];

export type Role = 'giant' | 'canopy' | 'emergent' | 'snag' | 'fallen' | 'small' | 'palm' | 'under' | 'uprooted' | 'lantern';
// How many shapes of each role are made, the great trees first.
export const SHAPES: Record<Role, number> = { giant: 5, canopy: 8, emergent: 2, snag: 2, fallen: 2, palm: 4, small: 4, under: 5, uprooted: 2, lantern: 1 };
// The roles drawn large on the page, which are baked in the larger squares.
export const LARGE: Role[] = ['giant', 'canopy', 'emergent', 'snag', 'fallen', 'palm'];
// He ruled the jungle far out of scale on purpose, its trees as tall as the buildings beside them, so a visitor knows it
// for a jungle at a glance (BRIEF.md, Nov 14, midnight). Each role is shaped at a tree's own proportions and then made
// this much larger (grow), while its leaves are made only so much larger (leaf, as a share of grow): a larger tree has
// more tufts of leaves, not larger ones, so it still reads as foliage close up.
export const SIZE: Record<Role, { grow: number; leaf: number }> = {
  giant: { grow: 3.1, leaf: 0.85 }, canopy: { grow: 4.2, leaf: 0.75 }, emergent: { grow: 3.8, leaf: 0.5 }, snag: { grow: 4, leaf: 0.4 }, fallen: { grow: 3.3, leaf: 0.45 },
  small: { grow: 1.25, leaf: 1.3 }, palm: { grow: 2.4, leaf: 1 }, under: { grow: 2.2, leaf: 0.7 }, uprooted: { grow: 3.2, leaf: 0.45 }, lantern: { grow: 2.5, leaf: 1 },
};

export interface Model { role: Role; v: number; tall: number; geo: THREE.BufferGeometry }

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

class Acc {
  pos: number[] = []; nrm: number[] = []; a: number[] = []; b: number[] = []; idx: number[] = [];
  constructor(public grow = 1, public leaf = 1) {}
  get n() { return this.pos.length / 3; }
  // a: what it is, how bright, its hue (for bark, how pale), how open to the sky. b: where on its card, and a seed.
  vert(p: THREE.Vector3, n: THREE.Vector3, kind: Kind, value: number, hue: number, open: number, u = 0, v = 0, seed = 0): number {
    this.pos.push(p.x * this.grow, p.y * this.grow, p.z * this.grow); this.nrm.push(n.x, n.y, n.z); this.a.push(kind, value, hue, open); this.b.push(u, v, seed);
    return this.n - 1;
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('a', new THREE.Float32BufferAttribute(this.a, 4));
    g.setAttribute('b', new THREE.Float32BufferAttribute(this.b, 3));
    g.setIndex(this.idx);
    g.computeBoundingBox();
    return g;
  }
}

const perp = (d: THREE.Vector3) => (Math.abs(d.y) < 0.9 ? new THREE.Vector3().crossVectors(d, UP) : new THREE.Vector3(1, 0, 0)).normalize();

// Bark: how bright, how pale, and how open to the sky along its length (0 at the foot of the run, 1 at its end).
interface Bark { value: number; pale: number; open: (t: number) => number }

// A tapered run of bark along points, with a frame carried along it so it never twists.
function tube(a: Acc, r: () => number, pts: THREE.Vector3[], radii: number[], bark: Bark): void {
  const sides = radii[0] > 1.2 ? 8 : radii[0] > 0.45 ? 6 : radii[0] > 0.2 ? 4 : 3, base = a.n;
  let nrm = perp(new THREE.Vector3().subVectors(pts[1], pts[0]).normalize());
  const t = new THREE.Vector3(), bi = new THREE.Vector3(), d = new THREE.Vector3();
  for (let j = 0; j < pts.length; j++) {
    t.subVectors(pts[Math.min(j + 1, pts.length - 1)], pts[Math.max(j - 1, 0)]).normalize();
    nrm.addScaledVector(t, -nrm.dot(t)).normalize();
    bi.crossVectors(t, nrm);
    const k = j / (pts.length - 1), streak = bark.value * (0.75 + 0.5 * r());
    for (let s = 0; s < sides; s++) {
      const ang = (s / sides) * Math.PI * 2;
      d.copy(nrm).multiplyScalar(Math.cos(ang)).addScaledVector(bi, Math.sin(ang));
      // Ridges down the bark: every other side a little out.
      const rr = radii[j] * (s % 2 ? 1.06 : 0.94);
      a.vert(pts[j].clone().addScaledVector(d, rr), d, KIND.bark, Math.min(0.7, streak * (s % 2 ? 1.08 : 0.9)), bark.pale, bark.open(k));
    }
  }
  for (let j = 0; j < pts.length - 1; j++) for (let s = 0; s < sides; s++) {
    const p = base + j * sides + s, q = base + j * sides + ((s + 1) % sides);
    a.idx.push(p, q, p + sides, q, q + sides, p + sides);
  }
}

// A card: a square of leaves, drawn in the bake as a tuft, a frond or a blade. shade is the normal it is lit by.
function card(a: Acc, c: THREE.Vector3, face: THREE.Vector3, size: number, kind: Kind, value: number, hue: number, open: number, seed: number, shade: THREE.Vector3, spin: number): void {
  const u = perp(face).applyAxisAngle(face, spin), v = new THREE.Vector3().crossVectors(face, u), base = a.n;
  for (const [x, y] of [[0, 0], [1, 0], [1, 1], [0, 1]]) a.vert(c.clone().addScaledVector(u, (x - 0.5) * size).addScaledVector(v, (y - 0.5) * size), shade, kind, value, hue, open, x, y, seed);
  a.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

// A strip along a path: a frond or a blade, its width at each point, across the way given.
function strip(a: Acc, path: THREE.Vector3[], widths: number[], across: THREE.Vector3[], kind: Kind, value: number, hue: number, open: number, seed: number, shade: THREE.Vector3[]): void {
  const base = a.n;
  path.forEach((p, i) => {
    const t = i / (path.length - 1);
    for (const s of [0, 1]) a.vert(p.clone().addScaledVector(across[i], (s - 0.5) * widths[i]), shade[i], kind, value, hue, open, t, s, seed);
  });
  for (let i = 0; i < path.length - 1; i++) { const k = base + i * 2; a.idx.push(k, k + 1, k + 3, k, k + 3, k + 2); }
}

// The crown a clump belongs to, for how it is lit and how deep in it a leaf is.
interface Crown { c: THREE.Vector3; r: THREE.Vector3 }
interface Leafy { value: number; hue: number }

// How open a point of a crown is to the sky and the eye: deep inside it is near black, at its top and front it is
// open. local is how far out of its own clump it is, 0 to 1.
function openAt(p: THREE.Vector3, crown: Crown, local: number): number {
  const e = new THREE.Vector3().subVectors(p, crown.c).divide(crown.r);
  return THREE.MathUtils.clamp(-0.4 + 0.35 * Math.min(1.1, e.length()) + 0.2 * THREE.MathUtils.clamp(e.z, -1, 1) + 0.25 * THREE.MathUtils.clamp(e.y, -1, 1) + 0.75 * local * local, 0, 1);
}

// A clump of leaves: tufts scattered through a squashed ball, most near its skin, each facing out and up, lit as part
// of the crown's mass so the crown shades as one thing with clumps in it.
function clump(a: Acc, r: () => number, at: THREE.Vector3, rad: THREE.Vector3, tuft: number, crown: Crown, look: Leafy, dense = 1): void {
  const size = tuft * a.leaf, n = Math.round(dense * 3.2 * ((rad.x * rad.z + rad.x * rad.y + rad.y * rad.z) / 1.5) / (size * size)) + 6;
  const cv = look.value * (0.7 + 0.6 * r()), ch = look.hue + 0.12 * r();
  for (let i = 0; i < n; i++) {
    const dir = V(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    if (dir.lengthSq() > 1 || dir.lengthSq() < 1e-4) { i--; continue; }
    dir.normalize();
    const k = 0.45 + 0.55 * Math.sqrt(r()), p = at.clone().add(V(dir.x * rad.x, dir.y * rad.y, dir.z * rad.z).multiplyScalar(k));
    const face = dir.clone().add(V(0, 0.7, 0)).add(V(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.9)).normalize();
    const whole = new THREE.Vector3().subVectors(p, crown.c).divide(crown.r).divide(crown.r).normalize();
    const shade = face.clone().multiplyScalar(0.12).add(whole.multiplyScalar(0.33)).add(dir.clone().multiplyScalar(0.55)).normalize();
    card(a, p, face, size * (0.8 + 0.4 * r()), KIND.tuft, cv * (0.9 + 0.2 * r()), ch, openAt(p, crown, (k - 0.45) / 0.55), r(), shade, r() * 6.3);
  }
}

// A vine hanging from a limb: a strand of small tufts falling and swaying a little.
// Lianas hang in curtains: a few strands side by side, each its own length, so the hem is ragged.
function vine(a: Acc, r: () => number, from: THREE.Vector3, len: number, look: Leafy): void {
  const strands = 2 + Math.floor(r() * 3), spread = 2.2 * a.leaf;
  for (let k = 0; k < strands; k++) {
    const at = from.clone().add(V((k - (strands - 1) / 2) * spread + (r() - 0.5) * spread, -r() * spread, (r() - 0.5) * spread));
    const L = len * (0.45 + 0.55 * r()), sway = V(r() - 0.5, 0, r() - 0.5).multiplyScalar(0.25), ph = r() * 6, step = 0.85 * a.leaf;
    for (let y = 0; y < L; y += step * (0.8 + 0.4 * r())) {
      const t = y / L, p = at.clone().add(V(sway.x * y + Math.sin(y * 0.3 + ph) * 0.4, -y, sway.z * y + Math.cos(y * 0.25 + ph) * 0.3));
      const face = V(r() - 0.5, 0.2, 1).normalize(), shade = V(r() - 0.5, 0.15, 0.8).normalize();
      card(a, p, face, (2.4 - 0.9 * t) * (0.8 + 0.4 * r()) * a.leaf, KIND.tuft, look.value * (0.75 + 0.35 * r()), look.hue + 0.05, 0.45 + 0.4 * (1 - t) * r(), r(), shade, r() * 6.3);
    }
  }
}

// A limb: a curve from where it leaves its parent, rising as it goes, forking until it ends in tips.
interface Tip { p: THREE.Vector3; d: THREE.Vector3 }
function limb(a: Acc, r: () => number, from: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number, o: { spread: number; rise: number; fork: number; bark: Bark }, tips: Tip[]): void {
  const bend = dir.clone().add(V(0, o.rise, 0)).normalize();
  const mid = from.clone().addScaledVector(dir, len * 0.5).add(V((r() - 0.5) * len * 0.12, len * o.rise * 0.12, (r() - 0.5) * len * 0.12));
  const end = mid.clone().addScaledVector(bend, len * 0.5);
  tube(a, r, [from, mid, end], [rad, rad * 0.82, rad * 0.62], o.bark);
  if (depth <= 0) { tips.push({ p: end, d: bend }); return; }
  const n = o.fork + (r() < 0.4 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const axis = perp(bend).applyAxisAngle(bend, (i / n) * Math.PI * 2 + r());
    const d = bend.clone().applyAxisAngle(axis, o.spread * (0.6 + 0.6 * r())).normalize();
    limb(a, r, end, d, len * (0.55 + 0.15 * r()), rad * 0.6, depth - 1, o, tips);
  }
}

// The flared plates of root a giant stands on: each a thin wall from the trunk out along the ground, its top edge
// falling in a curve.
function buttress(a: Acc, r: () => number, ang: number, r0: number, reach: number, tall: number, bark: Bark): void {
  const out = V(Math.sin(ang), 0, Math.cos(ang)), side = V(Math.cos(ang), 0, -Math.sin(ang)), steps = 6, thick = 0.22 + 0.1 * r();
  for (const s of [-1, 1]) {
    const base = a.n, nrm = side.clone().multiplyScalar(s);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, x = r0 * 0.8 + (reach - r0 * 0.8) * t, y = tall * Math.pow(1 - t, 1.7) + 0.2;
      const p = out.clone().multiplyScalar(x).addScaledVector(side, s * thick * (1 - 0.6 * t));
      a.vert(p.clone().setY(-0.6), nrm, KIND.bark, bark.value * 0.8, bark.pale, 0.05);
      a.vert(p.clone().setY(y), nrm.clone().add(V(0, 0.3, 0)).normalize(), KIND.bark, bark.value * (0.9 + 0.2 * r()), bark.pale, 0.12 + 0.3 * t);
    }
    for (let i = 0; i < steps; i++) { const k = base + i * 2; a.idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
}

// A trunk from the ground up a curving line, flared at its foot.
function stem(a: Acc, r: () => number, tall: number, r0: number, r1: number, wander: number, bark: Bark, lean = V(0, 0, 0)): THREE.Vector3[] {
  const n = 7, pts: THREE.Vector3[] = [], radii: number[] = [];
  const ph = r() * 6;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push(V(Math.sin(t * 3 + ph) * wander * t + lean.x * t * t * tall, t * tall, Math.cos(t * 2.4 + ph) * wander * t + lean.z * t * t * tall));
    radii.push(r0 + (r1 - r0) * t + (i === 0 ? r0 * 0.45 : 0));
  }
  tube(a, r, pts, radii, bark);
  return pts;
}

const darkBark = (pale = 0.08): Bark => ({ value: 0.28, pale: pale * 0.5, open: (t) => 0.05 + 0.45 * t });

// The crown round a set of tips: their middle and how far they reach, a little more than the clumps on them.
function crownOf(tips: Tip[], pad: THREE.Vector3): Crown {
  const box = new THREE.Box3();
  for (const t of tips) box.expandByPoint(t.p);
  const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).multiplyScalar(0.5).add(pad);
  return { c, r };
}

function giant(a: Acc, r: () => number, v: number): number {
  const H = 50, r0 = 2.1 + 0.3 * r(), bark = darkBark(0.12 + 0.1 * r());
  const tiered = v === 4, broken = v === 1, cauli = v === 2 || v === 3;
  const trunk = stem(a, r, H * (tiered ? 0.92 : 0.66), r0, r0 * 0.3, 1.8, bark);
  const nb = 4 + Math.floor(r() * 3);
  for (let i = 0; i < nb; i++) buttress(a, r, (i / nb) * Math.PI * 2 + r() * 0.5, r0, r0 + 3.5 + 3 * r(), 5 + 4 * r(), bark);
  const tips: Tip[] = [], bare = new Set<number>();
  const look: Leafy = { value: 0.7 + 0.2 * r(), hue: 0.05 * r() };
  if (tiered) {
    for (let k = 0; k < 3; k++) {
      const y = H * (0.5 + 0.18 * k), at = trunk[0].clone().lerp(trunk[trunk.length - 1], y / (H * 0.92)), n = 5 + (k < 2 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + r() * 0.6 + k, d = V(Math.sin(ang), 0.12, Math.cos(ang)).normalize();
        limb(a, r, at, d, 8 - 2.2 * k, 0.7 - 0.15 * k, 1, { spread: 0.45, rise: 0.15, fork: 2, bark }, tips);
      }
    }
  } else {
    const top = trunk[trunk.length - 1], n = cauli ? 4 + Math.floor(r() * 2) : 5 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + r() * 0.7, el = cauli ? 0.75 + 0.35 * r() : 0.35 + 0.3 * r();
      const from = top.clone().add(V(0, -2.5 * r(), 0)), d = V(Math.sin(ang), el, Math.cos(ang)).normalize();
      const before = tips.length;
      limb(a, r, from, d, cauli ? 5 + 1.5 * r() : 5.5 + 2 * r(), r0 * 0.4, 2, { spread: cauli ? 0.6 : 0.5, rise: cauli ? 0.35 : 0.22, fork: 2, bark }, tips);
      if (broken && i % 3 === 0) for (let k = before; k < tips.length; k++) bare.add(k);
    }
  }
  const crown = crownOf(tips, tiered ? V(3, 2, 3) : cauli ? V(4.5, 4, 4.5) : V(4.5, 2.5, 4.5));
  tips.forEach((t, i) => {
    if (bare.has(i)) return;
    const rad = tiered ? V(3.6, 1.4, 3.6) : cauli ? V(4.6 + r(), 3.4 + r(), 4.6 + r()) : V(4.4 + r(), 2.1 + 0.6 * r(), 4.4 + r());
    clump(a, r, t.p.clone().add(V(0, rad.y * 0.4, 0)), rad, 1.5, crown, look);
    if (r() < (broken ? 0.7 : 0.4)) vine(a, r, t.p.clone().add(V(0, -1, 0)), 8 + 18 * r(), look);
  });
  // Ferns and orchids on the great limbs, and vines from the forks.
  for (let i = 0; i < (broken ? 14 : 8); i++) {
    const t = tips[Math.floor(r() * tips.length)], p = trunk[trunk.length - 1].clone().lerp(t.p, 0.3 + 0.4 * r());
    clump(a, r, p, V(1.2, 0.8, 1.2), 0.9, crown, { value: look.value * 0.8, hue: look.hue + 0.1 });
    if (r() < 0.5) vine(a, r, p, 10 + 20 * r(), look);
  }
  return H;
}

function canopy(a: Acc, r: () => number, v: number): number {
  const H = 22, bark = darkBark(0.06 + 0.12 * r());
  const flat = v === 3 || v === 4, tall = v === 5 || v === 6, lop = v === 7, twin = v === 8, open = v === 9, vines = v % 3 === 0 ? 0.85 : 0.4;
  const th = H * (flat ? 0.48 : tall ? 0.32 : 0.4), r0 = 0.75 + 0.2 * r();
  const lean = lop ? V(0.12, 0, 0.04) : V(0, 0, 0);
  const tips: Tip[] = [];
  const trunks = twin ? [V(-1.2, 0, 0.3), V(1.3, 0, -0.4)] : [V(0, 0, 0)];
  for (const at of trunks) {
    const pts = stem(a, r, th * (twin ? 0.85 + 0.3 * r() : 1), r0 * (twin ? 0.75 : 1), r0 * 0.38, 1.1, bark, lean).map((p) => p.add(at));
    if (!twin) for (let i = 0; i < 4; i++) buttress(a, r, (i / 4) * 6.3 + r(), r0, r0 + 1.8 + 1.5 * r(), 2.5 + 2 * r(), bark);
    // A liana or two climbing the trunk, and leaves along it.
    for (let i = 0; i < 2; i++) { const k = 2 + Math.floor(r() * 3); clump(a, r, pts[k].clone().add(V((r() - 0.5) * r0 * 2, 0, r0 * 0.9)), V(r0 * 1.4, 1.6, r0 * 1.2), 1.25, { c: pts[k], r: V(3, 3, 3) }, { value: 0.5, hue: 0.08 }); }
    const top = pts[pts.length - 1], n = (twin ? 2 : 3) + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + r() * 0.8, el = flat ? 0.35 + 0.25 * r() : tall ? 1.4 + 0.6 * r() : 0.7 + 0.5 * r();
      const d = V(Math.sin(ang) + lean.x * 4, el, Math.cos(ang)).normalize();
      limb(a, r, top, d, (flat ? 4.6 : tall ? 3.6 : 4) + 1.5 * r(), r0 * 0.55, open ? 2 : 1, { spread: 0.55, rise: 0.25, fork: 2, bark }, tips);
    }
  }
  const pad = flat ? V(4, 2, 4) : tall ? V(3.5, 4, 3.5) : V(4, 3.5, 4);
  const crown = crownOf(tips, pad);
  const look: Leafy = { value: 0.6 + 0.3 * r(), hue: 0.06 * r() };
  for (const t of tips) {
    const rad = flat ? V(3.8 + r(), 1.6 + 0.5 * r(), 3.8 + r()) : open ? V(2.6, 1.6, 2.6) : V(3.6 + r(), 2.0 + 0.7 * r(), 3.6 + r());
    clump(a, r, t.p.clone().add(V(0, rad.y * 0.35, 0)), rad, 1.25, crown, look);
    if (r() < vines) vine(a, r, t.p.clone().add(V(0, -rad.y * 0.4, 0)), 6 + 10 * r(), look);
  }
  // Fill the crown's top so it reads as one mass broken into clumps, not a ring of them.
  if (!open) for (let i = 0; i < (tall ? 3 : 2); i++) {
    const p = crown.c.clone().add(V((r() - 0.5) * crown.r.x * 0.7, crown.r.y * (0.2 + 0.4 * r()), (r() - 0.5) * crown.r.z * 0.7));
    clump(a, r, p, V(3 + r(), 2.4 + r(), 3 + r()), 1.25, crown, look);
  }
  return H;
}

function emergent(a: Acc, r: () => number, v: number): number {
  const H = 34, bark: Bark = { value: 0.55, pale: 0.75 + 0.2 * r(), open: (t) => 0.25 + 0.6 * t };
  const pts = stem(a, r, H * 0.86, 0.6, 0.3, 0.8, bark);
  const tiers = v === 2 ? 2 : 1;
  for (let k = 0; k < tiers; k++) {
    const from = pts[pts.length - 1 - k * 2], n = 5 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + r() * 0.6, d = V(Math.sin(ang), 1.1 + 0.6 * r(), Math.cos(ang)).normalize();
      const len = 3 + 2 * r() - k, end = from.clone().addScaledVector(d, len).add(V(0, 0.8, 0));
      tube(a, r, [from, from.clone().addScaledVector(d, len * 0.5), end], [0.22, 0.17, 0.12], bark);
      // A hand of broad leaves at the end of each branch, spread and drooping.
      const m = 6 + Math.floor(r() * 3);
      for (let j = 0; j < m; j++) {
        const t = (j / m) * Math.PI * 2 + r() * 0.4, out = V(Math.sin(t), 0, Math.cos(t)), L = 3 + r() * 1.2;
        const path = [0, 0.33, 0.66, 1].map((s) => end.clone().addScaledVector(out, L * s).add(V(0, L * (0.25 * s - 0.55 * s * s), 0)));
        const across = path.map(() => V(Math.cos(t), 0, -Math.sin(t)));
        const shade = path.map((_, i) => out.clone().multiplyScalar(0.3 + 0.2 * i).add(V(0, 1, 0.25)).normalize());
        strip(a, path, [0.4, 1.5, 1.4, 0.3], across, KIND.blade, 0.7 + 0.3 * r(), 0.1 * r(), 0.75 + 0.2 * r(), r(), shade);
      }
    }
  }
  return H;
}

// A palm frond: arching out and drooping, its leaflets in two rows.
function frond(a: Acc, r: () => number, top: THREE.Vector3, ang: number, el: number, L: number, w: number, value: number, hue: number, open: number): void {
  const out = V(Math.sin(ang), 0, Math.cos(ang)), side = V(Math.cos(ang), 0, -Math.sin(ang)), n = 7;
  const path: THREE.Vector3[] = [], widths: number[] = [], across: THREE.Vector3[] = [], shade: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    path.push(top.clone().addScaledVector(out, L * t * (1 - 0.15 * el)).add(V(0, L * (el * t - 0.75 * t * t), 0)));
    widths.push(w * (i === 0 ? 0.2 : Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.4)));
    across.push(side.clone().add(V(0, -0.25, 0)).normalize());
    shade.push(V(0, 1, 0).addScaledVector(out, 0.4 + 0.5 * t).normalize());
  }
  strip(a, path, widths, across, KIND.frond, value, hue, open, r(), shade);
}

function palm(a: Acc, r: () => number, v: number): number {
  const H = 14, bark: Bark = { value: 0.5, pale: 0.35, open: (t) => 0.2 + 0.5 * t };
  const stems = v === 2 ? 3 : 1;
  for (let s = 0; s < stems; s++) {
    const off = stems > 1 ? V(Math.sin(s * 2.1) * 1.4, 0, Math.cos(s * 2.1) * 1.4) : V(0, 0, 0);
    const tall = H * (stems > 1 ? 0.55 + 0.35 * s / 2 : v === 3 ? 0.95 : 0.85 + 0.15 * r());
    const lean = v === 3 ? V(0.35, 0, 0.1) : off.clone().multiplyScalar(0.06);
    const pts = stem(a, r, tall, 0.45, 0.32, 0.5, bark, lean).map((p) => p.add(off));
    const top = pts[pts.length - 1], n = 11 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) frond(a, r, top, (i / n) * Math.PI * 2 + r() * 0.4, 0.3 + 0.6 * r(), 5.5 + 2 * r(), 1.9, 0.65 + 0.35 * r(), 0.05 * r(), 0.6 + 0.35 * r());
    // The old fronds, hanging dead against the trunk.
    for (let i = 0; i < 4; i++) frond(a, r, top.clone().add(V(0, -0.4, 0)), r() * 6.3, -1.4, 3.5 + r(), 1.2, 0.3, 0.5, 0.2);
  }
  return H;
}

function under(a: Acc, r: () => number, v: number): number {
  const H = 6;
  if (v <= 1) {
    // Broad paddle leaves on short stems, as a banana or a heliconia grows.
    for (let s = 0; s < 4; s++) {
      const at = V((r() - 0.5) * 2.5, 0, (r() - 0.5) * 2), tall = 2.2 + 2 * r();
      tube(a, r, [at, at.clone().add(V(0, tall, 0))], [0.25, 0.18], { value: 0.45, pale: 0.4, open: () => 0.3 });
      const m = 3 + Math.floor(r() * 3);
      for (let j = 0; j < m; j++) {
        const t = r() * 6.3, out = V(Math.sin(t), 0, Math.cos(t)), L = 3.4 + 1.3 * r(), el = 0.6 + 0.6 * r(), from = at.clone().add(V(0, tall * (0.7 + 0.3 * r()), 0));
        const path = [0, 0.25, 0.5, 0.75, 1].map((q) => from.clone().addScaledVector(out, L * q * 0.8).add(V(0, L * (el * q - 0.7 * q * q), 0)));
        const across = path.map(() => V(Math.cos(t), 0.15, -Math.sin(t)).normalize());
        const shade = path.map((_, i) => V(0, 1, 0.3).addScaledVector(out, 0.2 * i).normalize());
        strip(a, path, [0.2, 1.2, 1.45, 1.2, 0.2], across, KIND.blade, 0.6 + 0.4 * r(), 0.08 + 0.15 * r(), 0.55 + 0.4 * r(), r(), shade);
      }
    }
  } else if (v <= 3) {
    // A fern: fronds springing from one crown and arching out low.
    const n = 13 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) frond(a, r, V(0, 0.3, 0), (i / n) * Math.PI * 2 + r() * 0.5, 0.9 + 0.7 * r(), 3 + 1.5 * r(), 1.3, 0.55 + 0.4 * r(), 0.1 * r(), 0.5 + 0.4 * r());
  } else {
    // A thicket.
    const crown: Crown = { c: V(0, 2, 0), r: V(3, 2.2, 3) };
    for (let i = 0; i < 5; i++) clump(a, r, V((r() - 0.5) * 3.5, 1.2 + 1.5 * r(), (r() - 0.5) * 3), V(1.6, 1.3, 1.6), 0.9, crown, { value: 0.6, hue: 0.08 });
  }
  return H;
}

function snag(a: Acc, r: () => number, v: number): number {
  const H = 20, bark: Bark = { value: 0.55, pale: 0.6 + 0.3 * r(), open: (t) => 0.3 + 0.6 * t };
  const pts = stem(a, r, H * (0.8 + 0.2 * v), 1.0, 0.45, 0.7, bark);
  const tips: Tip[] = [];
  for (let i = 0; i < 4; i++) {
    const from = pts[2 + Math.floor(r() * 4)], ang = r() * 6.3, d = V(Math.sin(ang), 0.5 + 0.4 * r(), Math.cos(ang)).normalize();
    limb(a, r, from, d, 3 + 4 * r(), 0.3, 1, { spread: 0.5, rise: 0.15, fork: 2, bark }, tips);
  }
  for (let i = 0; i < 3; i++) vine(a, r, tips[Math.floor(r() * tips.length)].p, 4 + 8 * r(), { value: 0.5, hue: 0.1 });
  return H;
}

// Soil and stone torn up with a tree's roots: a lumpy plate of earth with roots standing out of its rim and hanging
// from its underside.
function rootPlate(a: Acc, r: () => number, at: THREE.Vector3, rad: THREE.Vector3, axis: THREE.Vector3): void {
  const soil: Bark = { value: 0.28, pale: 0.25, open: () => 0.25 };
  const b = perp(axis), c = new THREE.Vector3().crossVectors(axis, b);
  const rings = 4, sides = 10, base = a.n;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, ang0 = t * Math.PI;
    for (let s = 0; s < sides; s++) {
      const ang = (s / sides) * Math.PI * 2, k = 0.8 + 0.35 * r();
      const d = b.clone().multiplyScalar(Math.cos(ang) * Math.sin(ang0)).addScaledVector(c, Math.sin(ang) * Math.sin(ang0)).addScaledVector(axis, Math.cos(ang0));
      const p = at.clone().add(V(d.x * rad.x, d.y * rad.y, d.z * rad.z).multiplyScalar(k));
      a.vert(p, d, KIND.bark, soil.value * (0.7 + 0.6 * r()), soil.pale * r(), 0.15 + 0.3 * Math.max(0, d.z));
    }
  }
  for (let i = 0; i < rings; i++) for (let s = 0; s < sides; s++) {
    const p = base + i * sides + s, q = base + i * sides + ((s + 1) % sides);
    a.idx.push(p, q, p + sides, q, q + sides, p + sides);
  }
  const roots: Bark = { value: 0.45, pale: 0.45, open: (t) => 0.2 + 0.4 * t };
  for (let i = 0; i < 16; i++) {
    const ang = r() * 6.3, d = b.clone().multiplyScalar(Math.cos(ang)).addScaledVector(c, Math.sin(ang)).addScaledVector(axis, (r() - 0.6) * 0.8).normalize();
    const from = at.clone().add(V(d.x * rad.x, d.y * rad.y, d.z * rad.z).multiplyScalar(0.8)), L = 1.5 + 3.5 * r();
    tube(a, r, [from, from.clone().addScaledVector(d, L * 0.5).add(V(0, -0.4 * L * r(), 0)), from.clone().addScaledVector(d, L).add(V(0, -L * 0.6 * r(), 0))], [0.28, 0.16, 0.06], roots);
  }
}

function fallen(a: Acc, r: () => number, v: number): number {
  const L = v ? 28 : 36, r0 = 1.5, bark = darkBark(0.25);
  const pts = Array.from({ length: 7 }, (_, i) => { const t = i / 6; return V(-L / 2 + L * t, r0 * (1 - 0.45 * t) + Math.sin(t * 3) * 0.3, Math.sin(t * 2.2 + v) * 1.2); });
  tube(a, r, pts, pts.map((_, i) => r0 * (1 - 0.5 * (i / 6))), bark);
  rootPlate(a, r, V(-L / 2 - 0.6, 4.2, 0), V(1.0, 4.4, 4.4), V(-1, 0, 0));
  const tips: Tip[] = [], end = pts[pts.length - 1];
  for (let i = 0; i < 3; i++) {
    const d = V(0.7, (r() - 0.3) * 1.2, (r() - 0.5) * 1.5).normalize();
    limb(a, r, end, d, 4 + 3 * r(), 0.4, 1, { spread: 0.6, rise: 0.05, fork: 2, bark }, tips);
  }
  // What has grown on it since it fell, and the leaves its broken crown still holds.
  const crown: Crown = { c: V(0, 2, 0), r: V(L / 2, 3, 4) };
  for (let i = 0; i < 6; i++) clump(a, r, pts[1 + Math.floor(r() * 5)].clone().add(V(0, r0 * 0.8, 0)), V(1.3, 0.7, 1.1), 0.8, crown, { value: 0.55, hue: 0.12 });
  for (const t of tips) if (r() < 0.5) clump(a, r, t.p, V(1.8, 1.2, 1.8), 1.0, crown, { value: 0.35, hue: 0.45 });
  return L;
}

function uprooted(a: Acc, r: () => number, v: number): number {
  canopy(a, r, v ? 4 : 1);
  rootPlate(a, r, V(0, -1.2, 0), V(3.8, 1.7, 3.8), V(0, -1, 0));
  return 22;
}

function lantern(a: Acc, r: () => number): number {
  tube(a, r, [V(0, 0, 0), V(0, 1.5, 0)], [0.13, 0.1], { value: 0.4, pale: 0.2, open: () => 0.4 });
  const base = a.n, s = 8;
  for (let i = 0; i <= 3; i++) for (let k = 0; k < s; k++) {
    const t = i / 3, ang = (k / s) * Math.PI * 2, rr = 0.36 * Math.sin(Math.PI * (0.1 + 0.8 * t)), d = V(Math.sin(ang), 0, Math.cos(ang));
    a.vert(V(d.x * rr, 1.55 + 0.8 * t, d.z * rr), d, KIND.glow, 1, 0, 1);
  }
  for (let i = 0; i < 3; i++) for (let k = 0; k < s; k++) { const p = base + i * s + k, q = base + i * s + ((k + 1) % s); a.idx.push(p, q, p + s, q, q + s, p + s); }
  return 2.4;
}

// Every shape of every role, in a fixed order.
export const ROSTER: { role: Role; v: number }[] = (Object.keys(SHAPES) as Role[]).flatMap((role) => Array.from({ length: SHAPES[role] }, (_, v) => ({ role, v })));
const small = (a: Acc, r: () => number, v: number) => canopy(a, r, [0, 3, 6, 9][v]);
const MAKE: Record<Role, (a: Acc, r: () => number, v: number) => number> = { giant, canopy, emergent, snag, fallen, small, palm, under, uprooted, lantern };
// One shape of one role, the same on every call.
export function model(role: Role, v: number): Model {
  const a = new Acc(SIZE[role].grow, SIZE[role].leaf), tall = MAKE[role](a, seeded(4111 + (Object.keys(SHAPES) as Role[]).indexOf(role) * 97 + v * 13), v) * a.grow;
  return { role, v, tall, geo: a.geometry() };
}
