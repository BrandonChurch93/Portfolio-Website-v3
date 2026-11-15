import * as THREE from 'three';
import { type Builder, seeded, slice } from '../../../../world/build';
import { AVENUES, GROUND, PARKS, PLAZA, RINGS, ROAD, lots } from '../../layout';
import { D2R, KIND, RIM, kind, onRing, seen } from './shape';

// The city's floor: the plaza, the boulevards and avenues, a plinth under every tower, the parks. What is worked out
// per pixel is in the floor's material; what is drawn once is a map of the light round every tower's foot, the
// parks' paths and their pools. What stands up from the floor is made: plinths, lamps along the streets, trees, and
// in each park a pavilion or a glass house.

export const EDGE = RINGS[RINGS.length - 1] + ROAD / 2;
// The map's size in pixels across the whole ground.
const MAP = 2048;
const EDGES = [PLAZA, ...RINGS];

interface Park { r0: number; r1: number; from: number; to: number; mid: number; rm: number; pool: { a: number; r: number; ra: number; rr: number }; paths: THREE.Vector2[][]; house: 'pavilion' | 'glass'; at: THREE.Vector2 }

const polar = (deg: number, r: number) => new THREE.Vector2(Math.sin(deg * D2R) * r, Math.cos(deg * D2R) * r);
const span = (p: { from: number; to: number }) => ((p.to - p.from + 720) % 360);

export function parks(): Park[] {
  const r = seeded(808);
  return PARKS.map((p, i) => {
    const r0 = EDGES[p.band] + ROAD / 2 + 1.5, r1 = EDGES[p.band + 1] - ROAD / 2 - 1.5, s = span(p), mid = p.from + s / 2, rm = (r0 + r1) / 2;
    const deep = r1 - r0, wide = s * D2R * rm;
    const pool = { a: mid + (r() - 0.5) * s * 0.2, r: rm + (r() - 0.5) * deep * 0.15, ra: Math.min(wide * 0.2, 40), rr: deep * 0.2 };
    const paths: THREE.Vector2[][] = [];
    // Walks along the park's inner and outer edges, a loop round the pool, and paths that wander across.
    for (const rr of [r0 + 3, r1 - 3]) paths.push(Array.from({ length: 40 }, (_, k) => polar(p.from + (s * k) / 39, rr)));
    paths.push(Array.from({ length: 48 }, (_, k) => {
      const t = (k / 47) * Math.PI * 2, a = pool.a + ((Math.sin(t) * (pool.ra + 7)) / pool.r) / D2R;
      return polar(a, pool.r + Math.cos(t) * (pool.rr + 6));
    }));
    const n = Math.max(2, Math.round(wide / 70));
    for (let k = 0; k < n; k++) {
      const a0 = p.from + (s * (k + 0.5 + (r() - 0.5) * 0.4)) / n, wob = (r() - 0.5) * 2, ph = r() * 6;
      paths.push(Array.from({ length: 24 }, (_, q) => {
        const t = q / 23, rr = r0 + 3 + (deep - 6) * t;
        return polar(a0 + ((Math.sin(t * 5 + ph) * 9 * wob) / rr) / D2R, rr);
      }));
    }
    const house = i < 2 ? 'pavilion' : 'glass';
    const at = polar(pool.a + ((pool.ra + 18) / pool.r / D2R) * (i % 2 ? 1 : -1), pool.r);
    return { r0, r1, from: p.from, to: p.to, mid, rm, pool, paths, house, at };
  });
}

function nearPath(q: THREE.Vector2, paths: THREE.Vector2[][]): number {
  let best = Infinity;
  for (const path of paths) for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1], ab = b.clone().sub(a), t = Math.max(0, Math.min(1, q.clone().sub(a).dot(ab) / Math.max(1e-6, ab.lengthSq())));
    best = Math.min(best, a.clone().addScaledVector(ab, t).distanceTo(q));
  }
  return best;
}
const inPool = (q: THREE.Vector2, p: Park, grow: number) => {
  const r = q.length(), a = Math.atan2(q.x, q.y) / D2R, da = ((a - p.pool.a + 540) % 360) - 180;
  return ((da * D2R * p.pool.r) / (p.pool.ra + grow)) ** 2 + ((r - p.pool.r) / (p.pool.rr + grow)) ** 2 < 1;
};

// The map: red the light round every tower's foot, green the parks' paths, blue their pools.
export async function floorMap(ps: Park[]): Promise<THREE.CanvasTexture> {
  const c = document.createElement('canvas');
  c.width = c.height = MAP;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, MAP, MAP);
  g.globalCompositeOperation = 'lighter';
  const k = MAP / (2 * GROUND.r), px = (v: number) => (v + GROUND.r) * k;
  const r = seeded(31);
  for (const l of lots()) {
    const rad = (Math.max(l.w, l.d) / 2 + 10) * k, near = Math.exp(-((Math.hypot(l.x, l.z) / 420) ** 2));
    const s = (0.35 + 0.65 * r()) * (0.45 + 0.55 * near);
    const grad = g.createRadialGradient(px(l.x), px(l.z), rad * 0.3, px(l.x), px(l.z), rad);
    grad.addColorStop(0, `rgba(255,0,0,${s.toFixed(3)})`);
    grad.addColorStop(1, 'rgba(255,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(px(l.x), px(l.z), rad, 0, Math.PI * 2);
    g.fill();
    await slice();
  }
  await slice();
  g.lineCap = g.lineJoin = 'round';
  for (const p of ps) {
    g.strokeStyle = 'rgb(0,255,0)';
    g.lineWidth = 1.5 * k;
    for (const path of p.paths) {
      g.beginPath();
      path.forEach((q, i) => (i ? g.lineTo(px(q.x), px(q.y)) : g.moveTo(px(q.x), px(q.y))));
      g.stroke();
    }
    g.fillStyle = 'rgb(0,0,255)';
    g.beginPath();
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2, a = p.pool.a + ((Math.sin(t) * p.pool.ra) / p.pool.r) / D2R, q = polar(a, p.pool.r + Math.cos(t) * p.pool.rr);
      if (i) g.lineTo(px(q.x), px(q.y)); else g.moveTo(px(q.x), px(q.y));
    }
    g.fill();
    await slice();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.flipY = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

export function floorDisc(): THREE.BufferGeometry {
  const g = new THREE.RingGeometry(0, RIM.parapet + 0.5, 180, 12);
  g.rotateX(-Math.PI / 2);
  return g;
}

export async function standing(b: Builder, made: THREE.Material, ps: Park[]): Promise<void> {
  const r = seeded(2207);
  // A plinth under every tower.
  for (const l of lots()) {
    const m = new THREE.Matrix4().makeRotationY(l.turn * D2R).setPosition(l.x, 0.6, l.z);
    b.add(kind(new THREE.BoxGeometry(l.w + 5, 1.2, l.d + 5), KIND.stone), made, m, { shadow: false });
    await slice();
  }
  await slice();
  // Lamps along the walks of the boulevards and avenues, toward the front, which is what is seen.
  const lamp = new THREE.OctahedronGeometry(0.7);
  for (const ring of RINGS) for (const s of [-1, 1]) {
    const rr = ring + s * (ROAD / 2 + 1.2), n = Math.round((2 * Math.PI * rr) / 14);
    for (let i = 0; i < n; i++) {
      const deg = ((i + 0.5 * (s > 0 ? 1 : 0)) * 360) / n;
      if (!seen(deg) || AVENUES.some((a) => Math.abs(((deg - a + 540) % 360) - 180) * D2R * rr < ROAD)) continue;
      b.add(kind(lamp.clone(), KIND.light, 0.55, 0.9), made, onRing(deg, rr, 3.4), { shadow: false });
      await slice();
    }
  }
  for (const a of AVENUES) {
    if (!seen(a)) continue;
    for (const s of [-1, 1]) for (let t = PLAZA + 10; t < EDGE; t += 14) {
      if (RINGS.some((ring) => Math.abs(t - ring) < ROAD)) continue;
      const q = polar(a, t), side = polar(a + 90, s * (ROAD / 2 + 1.2));
      b.add(kind(lamp.clone(), KIND.light, 0.55, 0.9), made, new THREE.Matrix4().makeTranslation(q.x + side.x, 3.4, q.y + side.y), { shadow: false });
    }
  }
  await slice();
  // The plaza: a ring of low lamps at its edge.
  for (let i = 0; i < 40; i++) b.add(kind(new THREE.CylinderGeometry(0.6, 0.6, 1.6, 6), KIND.light, 0.7, 0.8), made, onRing(i * 9 + 4.5, PLAZA - 3, 0.8), { shadow: false });

  // The parks: trees in groves off the paths and the pools, lit from below where they stand near a path.
  const crown = new THREE.IcosahedronGeometry(1, 0), far = new THREE.OctahedronGeometry(1, 0);
  for (const p of ps) {
    const s = span(p), deep = p.r1 - p.r0;
    for (let rr = p.r0 + 4; rr < p.r1 - 3; rr += 8.2) {
      const n = Math.floor((s * D2R * rr) / 8.2);
      for (let i = 0; i < n; i++) {
        const deg = p.from + ((i + 0.5 + (r() - 0.5) * 0.7) * s) / n, q = polar(deg, rr + (r() - 0.5) * 3.4);
        if (r() < 0.12) continue;
        const dp = nearPath(q, p.paths);
        if (dp < 2.6 || inPool(q, p, 3) || q.distanceTo(p.at) < 19) continue;
        const size = 2.6 + r() * 2.2 + (deep > 100 ? 0.4 : 0), tall = size * (1.1 + r() * 0.5);
        const m = new THREE.Matrix4().compose(new THREE.Vector3(q.x, tall + 0.6, q.y), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6, 0)), new THREE.Vector3(size, tall, size));
        b.add(kind((seen(deg) ? crown : far).clone(), KIND.leaf, Math.exp(-dp / 5)), made, m, { shadow: false });
      }
      await slice();
    }
    // Low lamps along the paths.
    for (const path of p.paths) for (let i = 2; i < path.length; i += 4) {
      const q = path[i];
      b.add(kind(new THREE.OctahedronGeometry(0.55), KIND.light, 0.7, 0.9), made, new THREE.Matrix4().makeTranslation(q.x + 1.4, 1.0, q.y), { shadow: false });
    }
    await slice();
    const h = new THREE.Matrix4().makeTranslation(p.at.x, 0, p.at.y);
    if (p.house === 'pavilion') {
      // A round pavilion: a stepped stone floor, a ring of columns, a copper dome on a dark band, lit inside.
      b.add(kind(new THREE.CylinderGeometry(15, 16, 1.2, 40), KIND.stone), made, h.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.6, 0)));
      b.add(kind(new THREE.CylinderGeometry(13, 13, 0.4, 40), KIND.light, 0.55, 0.35), made, h.clone().multiply(new THREE.Matrix4().makeTranslation(0, 1.4, 0)));
      for (let i = 0; i < 12; i++) b.add(kind(new THREE.CylinderGeometry(0.7, 0.8, 8, 8), KIND.stone), made, h.clone().multiply(onRing(i * 30, 12, 5.2)));
      b.add(kind(new THREE.CylinderGeometry(13.6, 13.6, 2, 40), KIND.steel), made, h.clone().multiply(new THREE.Matrix4().makeTranslation(0, 10.2, 0)));
      b.add(kind(new THREE.SphereGeometry(13.4, 40, 10, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(1, 0.62, 1), KIND.copper), made, h.clone().multiply(new THREE.Matrix4().makeTranslation(0, 11, 0)));
      b.add(kind(new THREE.CylinderGeometry(0.3, 0.6, 5, 6), KIND.steel), made, h.clone().multiply(new THREE.Matrix4().makeTranslation(0, 18.6, 0)));
    } else {
      // A glass house: a dome of dark glass on a stone ring, ribbed in steel, lit from inside.
      const R = 17;
      b.add(kind(new THREE.CylinderGeometry(R + 1.5, R + 2, 2.4, 48), KIND.stone), made, h.clone().multiply(new THREE.Matrix4().makeTranslation(0, 1.2, 0)));
      b.add(kind(new THREE.SphereGeometry(R, 48, 14, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1), KIND.glass, 0.05), made, h.clone().multiply(new THREE.Matrix4().makeTranslation(0, 2.4, 0)));
      for (let i = 0; i < 12; i++) {
        const rib = new THREE.TorusGeometry(R + 0.25, 0.35, 4, 24, Math.PI).scale(1, 0.85, 1);
        b.add(kind(rib, KIND.steel), made, h.clone().multiply(new THREE.Matrix4().makeTranslation(0, 2.4, 0)).multiply(new THREE.Matrix4().makeRotationY((i * Math.PI) / 12)));
      }
      for (const yy of [0.35, 0.68]) {
        const rr = R * Math.cos(Math.asin(yy)), ring = new THREE.TorusGeometry(rr + 0.25, 0.3, 4, 48).rotateX(Math.PI / 2);
        b.add(kind(ring, KIND.steel), made, h.clone().multiply(new THREE.Matrix4().makeTranslation(0, 2.4 + yy * R * 0.85, 0)));
      }
    }
    await slice();
  }
}
