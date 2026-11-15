import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { seeded } from '../../../../world/build';

// What grows in the jungle, each one geometry in units, its foot at the origin, drawn many times over: the broad
// crowned canopy trees, emergents on tall bare trunks, giants in tiers, palms and undergrowth under them, vines
// hanging from the crowns at the jungle's edge, conifers on the mountains, dead snags, fallen trunks, boulders, and
// a lantern for the paths. A broad crown is clumps of leaves round a middle, each clump's normals bent toward
// the crown's own so the crown shades as one mass with clumps in it. A conifer is skirts of needles in tiers, each
// lit on its top and dark under. Each is cheap: there are thousands.

export const KINDS = ['fir', 'spruce', 'pine', 'canopy', 'aspen', 'giant', 'palm', 'vine', 'snag', 'log', 'boulder', 'shrub', 'lamp'] as const;
export type TreeKind = (typeof KINDS)[number];
export const PART = { bark: 0, crown: 1, needles: 2, rock: 4, light: 5 } as const;

class Acc {
  pos: number[] = []; nrm: number[] = []; leaf: number[] = []; idx: number[] = [];
  get n() { return this.pos.length / 3; }
  vert(p: THREE.Vector3, n: THREE.Vector3, l: [number, number, number, number]): number {
    this.pos.push(p.x, p.y, p.z); this.nrm.push(n.x, n.y, n.z); this.leaf.push(...l);
    return this.n - 1;
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('leaf', new THREE.Float32BufferAttribute(this.leaf, 4));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

const balls = new Map<number, { p: THREE.Vector3[]; i: number[] }>();
function ball(detail: number) {
  if (!balls.has(detail)) {
    const g0 = detail < 0 ? new THREE.OctahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, detail);
    g0.deleteAttribute('normal');
    g0.deleteAttribute('uv');
    const g = mergeVertices(g0);
    const pa = g.getAttribute('position'), p: THREE.Vector3[] = [];
    for (let k = 0; k < pa.count; k++) p.push(new THREE.Vector3().fromBufferAttribute(pa, k));
    balls.set(detail, { p, i: Array.from(g.index!.array) });
  }
  return balls.get(detail)!;
}

interface Crown { mid: THREE.Vector3; rad: THREE.Vector3; bottom: number; top: number }

// A clump of leaves: a lumpy ball, its normals bent toward the crown's.
function lobe(a: Acc, r: () => number, at: THREE.Vector3, rad: THREE.Vector3, crown: Crown, opts: { detail?: number; bend?: number; lump?: number; part?: number } = {}): void {
  const b = ball(opts.detail ?? 0), base = a.n, w = r(), bend = opts.bend ?? 0.45, lump = opts.lump ?? 0.14;
  const kick = [r(), r(), r()];
  // Each clump turned its own way, so no two show the same point at the top.
  const spin = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6.3, r() * 6.3, r() * 6.3));
  for (const u0 of b.p) {
    const u = u0.clone().applyQuaternion(spin);
    const k = 1 + lump * (Math.sin(u.x * 5.1 + kick[0] * 9) * Math.sin(u.y * 4.3 + kick[1] * 9) * Math.sin(u.z * 4.7 + kick[2] * 9) + (r() - 0.5) * 0.8);
    const p = new THREE.Vector3(u.x * rad.x * k, u.y * rad.y * k, u.z * rad.z * k).add(at);
    const own = new THREE.Vector3(u.x / rad.x, u.y / rad.y, u.z / rad.z).normalize();
    const whole = p.clone().sub(crown.mid).divide(crown.rad);
    const out = Math.min(1, whole.length());
    whole.normalize();
    const n = own.multiplyScalar(1 - bend).addScaledVector(whole, bend).normalize();
    a.vert(p, n, [opts.part ?? PART.crown, (p.y - crown.bottom) / Math.max(crown.top - crown.bottom, 0.01), out, w]);
  }
  for (const i of b.i) a.idx.push(base + i);
}

// A tapered trunk along a run of points, sides around.
function trunk(a: Acc, pts: THREE.Vector3[], radii: number[], sides: number, tone = 0): void {
  const base = a.n, up = new THREE.Vector3();
  for (let j = 0; j < pts.length; j++) {
    up.copy(pts[Math.min(j + 1, pts.length - 1)]).sub(pts[Math.max(j - 1, 0)]).normalize();
    const side = new THREE.Vector3(1, 0, 0).sub(up.clone().multiplyScalar(up.x)).normalize(), fwd = up.clone().cross(side);
    for (let s = 0; s < sides; s++) {
      const t = (s / sides) * Math.PI * 2, d = side.clone().multiplyScalar(Math.cos(t)).addScaledVector(fwd, Math.sin(t));
      a.vert(pts[j].clone().addScaledVector(d, radii[j]), d, [PART.bark, j / (pts.length - 1), tone, 0]);
    }
  }
  for (let j = 0; j < pts.length - 1; j++) for (let s = 0; s < sides; s++) {
    const p = base + j * sides + s, q = base + j * sides + ((s + 1) % sides);
    a.idx.push(p, q, p + sides, q, q + sides, p + sides);
  }
}

// A turned form round the y axis, from [radius, height] pairs, its radius broken a little by a noise.
function turned(a: Acc, r: () => number, prof: [number, number][], sides: number, part: number, lump: number, top: number): void {
  const base = a.n, phase = r() * 10;
  for (let j = 0; j < prof.length; j++) {
    const [rad, y] = prof[j];
    const dy = (prof[Math.min(j + 1, prof.length - 1)][1] - prof[Math.max(j - 1, 0)][1]) || 1, dr = prof[Math.min(j + 1, prof.length - 1)][0] - prof[Math.max(j - 1, 0)][0];
    for (let s = 0; s < sides; s++) {
      const t = (s / sides) * Math.PI * 2 + j * 0.45;
      const k = 1 + lump * Math.sin(t * 3 + phase + j * 1.7) * Math.sin(j * 2.3 + phase);
      const n = new THREE.Vector3(Math.sin(t) * dy, -dr, Math.cos(t) * dy).normalize();
      a.vert(new THREE.Vector3(Math.sin(t) * rad * k, y, Math.cos(t) * rad * k), n, [part, y / top, 1, r()]);
    }
  }
  for (let j = 0; j < prof.length - 1; j++) for (let s = 0; s < sides; s++) {
    const p = base + j * sides + s, q = base + j * sides + ((s + 1) % sides);
    a.idx.push(p, q, p + sides, q, q + sides, p + sides);
  }
}

// A palm's frond: a blade arching out and drooping, its two halves folded up from the midrib.
function frond(a: Acc, from: THREE.Vector3, bearing: number, lift: number, len: number, wide: number, w: number): void {
  const dir = new THREE.Vector3(Math.sin(bearing), 0, Math.cos(bearing)), side = new THREE.Vector3(Math.cos(bearing), 0, -Math.sin(bearing));
  const steps = 2, base = a.n;
  for (let j = 0; j <= steps; j++) {
    const t = j / steps;
    const p = from.clone().addScaledVector(dir, len * t).add(new THREE.Vector3(0, len * (lift * t - 0.7 * t * t), 0));
    const half = wide * (j === 0 ? 0.15 : j === 1 ? 1 : 0.2);
    for (const s of [-1, 0, 1]) {
      const q = p.clone().addScaledVector(side, s * half).add(new THREE.Vector3(0, s === 0 ? 0 : half * 0.3, 0));
      a.vert(q, new THREE.Vector3(-s * side.x * 0.4, 1, -s * side.z * 0.4).normalize(), [PART.crown, 1 - 0.7 * t, 1, w]);
    }
  }
  for (let j = 0; j < steps; j++) for (let s = 0; s < 2; s++) {
    const p = base + j * 3 + s;
    a.idx.push(p, p + 1, p + 3, p + 1, p + 4, p + 3);
  }
}

// A conifer's skirts: tiers of needles from the foot of the crown to its tip, each a cone whose rim droops and is
// ragged. Seen from above its rim is a star. Open underneath: from this view no one sees under a skirt. wide is the
// lowest tier's reach as a share of the height.
function skirts(a: Acc, r: () => number, tall: number, foot: number, wide: number, tiers: number, sides: number): void {
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers, t1 = (i + 1.45) / tiers;
    const y0 = foot + (tall - foot) * t0, y1 = Math.min(tall, foot + (tall - foot) * t1);
    const R = wide * tall * Math.pow(1 - t0, 0.85) * (0.9 + 0.2 * r());
    const apex = a.vert(new THREE.Vector3(0, y1, 0), new THREE.Vector3(0, 1, 0), [PART.needles, 1, 0, r()]);
    const rim: number[] = [], spin = r() * Math.PI;
    for (let s = 0; s < sides; s++) {
      const t = spin + (s / sides) * Math.PI * 2, k = 0.7 + 0.6 * r();
      const p = new THREE.Vector3(Math.sin(t) * R * k, y0 - (0.2 + 0.3 * r()) * R * 0.45, Math.cos(t) * R * k);
      const slope = new THREE.Vector3(Math.sin(t) * (y1 - p.y), R * k, Math.cos(t) * (y1 - p.y)).normalize();
      rim.push(a.vert(p, slope, [PART.needles, 0.25, 1, r()]));
    }
    for (let s = 0; s < sides; s++) a.idx.push(apex, rim[s], rim[(s + 1) % sides]);
  }
}

// Each kind in a few shapes, so no two neighbours are the same tree.
export const VARIANTS = 3;

export function treeGeometry(kind: TreeKind, v: number): THREE.BufferGeometry {
  const a = new Acc(), r = seeded(1013 + KINDS.indexOf(kind) * 71 + v * 7);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  switch (kind) {
    case 'fir': {
      // A tall narrow spire of a conifer, its skirts close to the trunk.
      const tall = 20 + v * 2.5;
      trunk(a, [V(0, 0, 0), V(0, 3, 0)], [0.45, 0.35], 3);
      skirts(a, r, tall, 1.6, 0.22 + 0.02 * v, 4, 5);
      break;
    }
    case 'spruce': {
      // A broader conifer, its lower skirts sweeping wide.
      const tall = 16 + v * 2;
      trunk(a, [V(0, 0, 0), V(0, 2.5, 0)], [0.5, 0.4], 3);
      skirts(a, r, tall, 1.2, 0.32 + 0.03 * v, 4, 6);
      break;
    }
    case 'pine': {
      // The tall pine: a long bare trunk with a lean, and a ragged crown of clumps at its top.
      const h = 13 + v * 2, lean = 0.4 + 0.3 * v;
      trunk(a, [V(0, 0, 0), V(lean * 0.4, h * 0.55, 0.1), V(lean, h, 0.2)], [0.55, 0.42, 0.25], 3);
      const crown: Crown = { mid: V(lean, h + 1.2, 0.2), rad: V(4, 3, 4), bottom: h - 2.5, top: h + 4 };
      lobe(a, r, V(lean - 0.8, h, 0.6), V(2.6, 2.0, 2.4), crown, { bend: 0.4 });
      lobe(a, r, V(lean + 1.3, h + 1.4, -0.5), V(2.2, 1.8, 2.2), crown, { bend: 0.4, detail: -1 });
      lobe(a, r, V(lean + 0.2, h + 2.7, 0.3), V(1.6, 1.4, 1.6), crown, { bend: 0.4, detail: -1 });
      break;
    }
    case 'canopy': {
      // A canopy tree in one of three shapes, so no two neighbours are alike: a wide umbrella on a tall trunk, a
      // tall rounded crown, and a crown in two masses on a forked trunk. Each trunk flares into its roots.
      if (v === 0) {
        const h = 7, cr = 6.5;
        trunk(a, [V(0, 0, 0), V(0.2, 1.2, 0), V(0.4, h * 0.6, 0.1), V(0.5, h + 0.8, 0.2)], [1.1, 0.55, 0.42, 0.3], 4);
        const crown: Crown = { mid: V(0.5, h + 1.8, 0.2), rad: V(cr, 2.4, cr), bottom: h, top: h + 4.2 };
        lobe(a, r, V(0.5, h + 2.2, 0.2), V(cr * 0.6, 1.8, cr * 0.6), crown, { bend: 0.35 });
        for (let i = 0; i < 4; i++) {
          const t = (i / 4) * Math.PI * 2 + r() * 0.9, d = cr * (0.55 + 0.2 * r());
          lobe(a, r, V(0.5 + Math.sin(t) * d, h + 1.2 + r() * 1.2, 0.2 + Math.cos(t) * d), V(cr * 0.42, 1.5 + 0.6 * r(), cr * 0.42), crown, { detail: -1, bend: 0.5 });
        }
      } else if (v === 1) {
        const h = 4.5, cr = 5;
        trunk(a, [V(0, 0, 0), V(0.1, 1.0, 0), V(0.2, h * 0.7, 0), V(0.4, h + 1.4, 0.2)], [1.0, 0.55, 0.45, 0.3], 4);
        const crown: Crown = { mid: V(0.3, h + cr * 0.95, 0), rad: V(cr, cr * 1.0, cr), bottom: h, top: h + cr * 1.9 };
        lobe(a, r, crown.mid, V(cr * 0.7, cr * 0.75, cr * 0.7), crown, { bend: 0.35 });
        lobe(a, r, crown.mid.clone().add(V(cr * 0.5, -cr * 0.25, 0.3)), V(cr * 0.5, cr * 0.5, cr * 0.5), crown, { detail: -1 });
        lobe(a, r, crown.mid.clone().add(V(-cr * 0.4, cr * 0.35, -0.4)), V(cr * 0.45, cr * 0.45, cr * 0.45), crown, { detail: -1 });
      } else {
        const h = 5.5, cr = 4.5;
        trunk(a, [V(0, 0, 0), V(0.1, 1.0, 0), V(0.3, h * 0.55, 0)], [1.0, 0.55, 0.45], 4);
        for (const [dx, dz, up] of [[-2.6, 0.6, 1.4], [2.4, -0.8, 0]] as const) {
          const top = V(dx, h + 1.6 + up, dz);
          trunk(a, [V(0.3, h * 0.55, 0), top], [0.4, 0.22], 3);
          const crown: Crown = { mid: top.clone().add(V(0, cr * 0.5, 0)), rad: V(cr, cr * 0.8, cr), bottom: top.y - 1, top: top.y + cr * 1.4 };
          lobe(a, r, crown.mid, V(cr * 0.75, cr * 0.6, cr * 0.7), crown, { bend: 0.35 });
          lobe(a, r, crown.mid.clone().add(V(dx * 0.4, cr * 0.3, 0.5)), V(cr * 0.45, cr * 0.4, cr * 0.45), crown, { detail: -1 });
        }
      }
      break;
    }
    case 'aspen': {
      // A slender pale trunk, straight and tall, with a narrow crown of small clumps along its upper half.
      const h = 15 + v * 2;
      trunk(a, [V(0, 0, 0), V(0.3, h, 0.1)], [0.32, 0.1], 3, 1);
      const crown: Crown = { mid: V(0.25, h * 0.66, 0), rad: V(3.2, h * 0.38, 3.2), bottom: h * 0.28, top: h + 2 };
      for (let i = 0; i < 2; i++) {
        const y = h * (0.5 + 0.26 * i), t = r() * Math.PI * 2;
        lobe(a, r, V(0.2 + Math.sin(t) * 0.8, y, Math.cos(t) * 0.8), V(3.3 - 0.6 * i, 3.9 - 0.4 * i, 3.1 - 0.6 * i), crown, { bend: 0.45 });
      }
      lobe(a, r, V(0.3, h * 0.95, 0.1), V(1.7, 2.0, 1.7), crown, { detail: -1, bend: 0.5 });
      break;
    }
    case 'giant': {
      // A giant of the forest, not of Earth: an immense trunk on buttress roots, bare for half its height, and a
      // crown in flat tiers, each a broad pad of leaves, smaller as they climb.
      const h = 44, base = 2.6 + 0.3 * v;
      trunk(a, [V(0, 0, 0), V(0.3, h * 0.3, 0), V(0.6, h * 0.65, 0.3), V(0.5, h, 0.4)], [base, base * 0.62, base * 0.45, base * 0.25], 6);
      for (let i = 0; i < 4; i++) {
        const t = (i / 4) * Math.PI * 2 + r() * 0.6;
        trunk(a, [V(Math.sin(t) * base * 2.3, 0, Math.cos(t) * base * 2.3), V(Math.sin(t) * base * 0.6, h * 0.12, Math.cos(t) * base * 0.6)], [base * 0.35, base * 0.3], 3);
      }
      // Its crown in tiers: on each, clumps of leaves held out round the trunk on its limbs, smaller as they climb.
      const tiers = 3 + (v % 2);
      for (let i = 0; i < tiers; i++) {
        const k = i / tiers, y = h * (0.5 + 0.48 * k), R = (10 - 6 * k) * (0.9 + 0.2 * r());
        const crown: Crown = { mid: V(0.5, y, 0.3), rad: V(R, 2.5, R), bottom: y - 2.5, top: y + 2.5 };
        lobe(a, r, V(0.5, y + 0.6, 0.3), V(R * 0.45, 2.0, R * 0.45), crown, { bend: 0.35 });
        const n = 3 + (i < 2 ? 1 : 0);
        for (let j = 0; j < n; j++) {
          const t = (j / n) * Math.PI * 2 + r() * 0.8 + i, d = R * (0.6 + 0.2 * r());
          const end = V(0.5 + Math.sin(t) * d, y - 0.5, 0.3 + Math.cos(t) * d);
          trunk(a, [V(0.5, y - 2.2, 0.3), end], [0.45, 0.18], 3);
          lobe(a, r, end.clone().add(V(0, 1.0, 0)), V(R * 0.38, 1.6 + 0.6 * r(), R * 0.38), crown, { detail: -1, bend: 0.4 });
        }
      }
      break;
    }
    case 'palm': {
      // An understory palm: a slender curving trunk and a head of long arching fronds.
      const h = 9 + v * 1.5, bend = 0.8 + 0.5 * v;
      const pts = [0, 0.5, 1].map((t) => V(bend * t * t, h * t, 0.2 * t));
      trunk(a, pts, [0.32, 0.26, 0.24], 3, 0.35);
      const top = pts[2];
      const n = 7;
      for (let i = 0; i < n; i++) frond(a, top, (i / n) * Math.PI * 2 + r() * 0.5, i % 2 ? 0.8 : 0.35, 5.5 + r() * 1.5, 0.9, r());
      break;
    }
    case 'vine': {
      // Vines hanging from a crown: a curtain of strands a unit wide that falls a unit, its hem ragged, scaled where
      // it hangs.
      const cols = 4, rows = 2, base = a.n, w = r(), hem: number[] = [];
      for (let i = 0; i <= cols; i++) hem.push(0.4 + 0.6 * r());
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
        const t = j / rows;
        a.vert(V(i / cols - 0.5 + (r() - 0.5) * 0.06, -hem[i] * t, 0.06 * Math.sin(Math.PI * t)), V((r() - 0.5) * 0.4, 0.1, 1).normalize(), [PART.crown, 1 - 0.9 * t, 1, w]);
      }
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const p = base + j * (cols + 1) + i;
        a.idx.push(p, p + cols + 1, p + 1, p + 1, p + cols + 1, p + cols + 2);
      }
      break;
    }
    case 'lamp': {
      // A lantern on a short post, for a path through the jungle or a camp in it.
      trunk(a, [V(0, 0, 0), V(0, 1.4, 0)], [0.12, 0.1], 3, 0.1);
      const crown: Crown = { mid: V(0, 1.7, 0), rad: V(0.4, 0.4, 0.4), bottom: 1.3, top: 2.1 };
      lobe(a, r, V(0, 1.75, 0), V(0.38, 0.45, 0.38), crown, { detail: -1, part: PART.light, lump: 0 });
      break;
    }
    case 'snag': {
      // A dead tree still standing: a bare trunk broken off short of its top, and two broken limbs.
      const h = 11 + v * 3;
      trunk(a, [V(0, 0, 0), V(0.2, h * 0.5, 0), V(0.5, h, 0.3)], [0.5, 0.36, 0.22], 3, 0.6);
      trunk(a, [V(0.2, h * 0.55, 0), V(1.8, h * 0.7, 0.4)], [0.16, 0.06], 3, 0.6);
      trunk(a, [V(0.35, h * 0.75, 0.1), V(-1.2, h * 0.88, -0.6)], [0.12, 0.05], 3, 0.6);
      break;
    }
    case 'log': {
      // A fallen trunk lying along x, its root plate standing up at one end.
      const len = 12 + v * 3;
      trunk(a, [V(-len / 2, 0.5, 0), V(len / 2, 0.35, 0.2)], [0.6, 0.35], 5, 0.4);
      const crown: Crown = { mid: V(-len / 2, 1.2, 0), rad: V(0.5, 1.6, 1.6), bottom: 0, top: 2.6 };
      lobe(a, r, V(-len / 2 - 0.2, 1.1, 0), V(0.4, 1.4, 1.5), crown, { detail: -1, part: PART.rock, bend: 0.2 });
      break;
    }
    case 'boulder': {
      // A boulder, rounded by weather, sat into the ground.
      const s = 1.6 + v * 0.8;
      const crown: Crown = { mid: V(0, s * 0.5, 0), rad: V(s, s, s), bottom: -s * 0.3, top: s * 1.3 };
      lobe(a, r, V(0, s * 0.35, 0), V(s * 1.2, s * 0.8, s), crown, { part: PART.rock, lump: 0.22, bend: 0.15 });
      break;
    }
    case 'shrub': {
      // Undergrowth: a low thicket of two clumps.
      const crown: Crown = { mid: V(0, 1, 0), rad: V(2.4, 1.4, 2.4), bottom: 0, top: 2.4 };
      lobe(a, r, V(-0.6, 0.9, 0.2), V(1.7, 1.1, 1.5), crown, { detail: -1, bend: 0.5 });
      lobe(a, r, V(0.9, 0.7, -0.3), V(1.3, 0.9, 1.3), crown, { detail: -1, bend: 0.5 });
      break;
    }
  }
  return a.geometry();
}

// The jungle in the site's own colors, never green, no lemon, no pink, no pale grey: deep and rich, near black and
// dark bronze in the depths and the conifers, copper and ember in the mass of the canopy, a few trees in flame. The
// moon catching the canopy's top makes its copper-light (materials.ts).
export const TINTS: Record<TreeKind, number[]> = {
  fir: [0x34200c, 0x3a240e, 0x2e1c0a],
  spruce: [0x3a240e, 0x402810, 0x34200c],
  pine: [0x6a3410, 0x5a2c0c, 0x74401a],
  canopy: [0x7a4018, 0x6a3410, 0x8a4c1e, 0x5b2f08, 0x4a2608, 0x3a1e06, 0x9a5a22],
  aspen: [0xa8501a, 0x9a4614],
  giant: [0x5b2f08, 0x4a2608, 0x6a3410],
  palm: [0x4a2a10, 0x5a3414, 0x3e220c],
  vine: [0x3e1e08, 0x4a2608, 0x5b2f08],
  snag: [0x000000],
  log: [0x000000],
  boulder: [0x000000],
  shrub: [0x4a2408, 0x5a2e0c, 0x3e1e08],
  lamp: [0x000000],
};
