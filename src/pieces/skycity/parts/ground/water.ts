import * as THREE from 'three';
import { type Builder, slice } from '../../../../world/build';
import { PEAKS, PLANET, bend, relief, seat } from '../../layout';
import { D2R, KIND, bearing, polar, stand, tag } from './kit';
import { inner } from './plates';

// The forest's water, which is water and not the stream: dark where it is deep, taking the sky and the moon. A lake
// in the valley by the temple, held level, its shore wherever the land rises over it and a quay of dressed stone
// where the valley opens toward the temple; a river that comes down from the hills into it; and from the small
// mountain at the front of the forest a fall down its face, toward the visitor, into a pool at its foot, and a stream
// from the pool to the broken margin, where it runs into the cracks.

// The lake: its middle as a bearing and a distance on the map, how far over the planet's curve its water lies, and
// the furthest its shore may be from its middle.
export const LAKE = { at: [294, 492] as const, level: 11.5, reach: 38 } as const;

export interface Run { pts: THREE.Vector2[]; w: number }

// How steeply the land falls at a place, and which way, on the map.
function fall(p: THREE.Vector2): THREE.Vector2 {
  const e = 0.8;
  return new THREE.Vector2(relief(p.x - e, p.y) - relief(p.x + e, p.y), relief(p.x, p.y - e) - relief(p.x, p.y + e)).divideScalar(2 * e);
}

// The way water runs from a place: down the land's slope, drawn a little toward where it is going, never turning
// sharply.
function descend(from: THREE.Vector2, to: THREE.Vector2, stop: (p: THREE.Vector2) => boolean): THREE.Vector2[] {
  const pts = [from.clone()];
  let p = from.clone(), d = to.clone().sub(p).normalize();
  for (let i = 0; i < 260 && !stop(p); i++) {
    const g = fall(p), want = to.clone().sub(p).normalize();
    const next = g.clone().multiplyScalar(2.2).add(want.multiplyScalar(0.7)).add(d.clone().multiplyScalar(1.4));
    if (next.lengthSq() < 1e-6) break;
    d = next.normalize();
    p = p.clone().addScaledVector(d, 2);
    pts.push(p.clone());
  }
  return pts;
}

let made: { shore: THREE.Vector2[]; open: boolean[]; runs: Run[]; pool: THREE.Vector2; poolLevel: number } | null = null;
export function waters() {
  if (made) return made;
  const c = polar(LAKE.at[0], LAKE.at[1]), shore: THREE.Vector2[] = [], open: boolean[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, dir = new THREE.Vector2(Math.sin(a), Math.cos(a));
    let r = 2;
    while (r < LAKE.reach && relief(c.x + dir.x * r, c.y + dir.y * r) < LAKE.level - 0.4) r += 0.5;
    shore.push(c.clone().addScaledVector(dir, r));
    open.push(r >= LAKE.reach);
  }
  // The fall: from high on the front of the forest's front mountain, down its face toward the visitor.
  const peak = PEAKS.reduce((a, b) => (b.z > a.z ? b : a));
  const top = new THREE.Vector2(peak.x + 4, peak.z + peak.r * 0.3);
  const out = polar(bearing(top.x, top.y) + 4, 700);
  const fallRun = descend(top, out, (p) => p.length() > inner(bearing(p.x, p.y)) + 30);
  // The pool where the fall lands: the first place under the mountain where the land is nearly level.
  let pool = fallRun[fallRun.length - 1];
  for (const p of fallRun) if (fall(p).length() < 0.12 && relief(p.x, p.y) < peak.tall * 0.35) { pool = p; break; }
  // The river into the lake, from the hills behind it.
  const spring = polar(LAKE.at[0] - 3, LAKE.at[1] + 62);
  const river = descend(spring, c, (p) => p.distanceTo(c) < 14);
  made = { shore, open, runs: [{ pts: fallRun, w: 2.6 }, { pts: river, w: 4 }], pool, poolLevel: relief(pool.x, pool.y) + 0.6 };
  return made;
}

// Whether a place is on water: the lake, a run, or the pool.
export function onWater(x: number, z: number, pad = 0): boolean {
  const w = waters(), p = new THREE.Vector2(x, z), c = polar(LAKE.at[0], LAKE.at[1]);
  if (p.distanceTo(c) < LAKE.reach + pad && relief(x, z) < LAKE.level + pad * 0.3) return true;
  if (p.distanceTo(w.pool) < 7 + pad) return true;
  return w.runs.some((r) => r.pts.some((q) => q.distanceTo(p) < r.w / 2 + pad));
}

// A sheet of water level over the planet's curve, a fan from a middle out to an outline.
function level(c: THREE.Vector2, ring: THREE.Vector2[], h: number): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], cell: number[] = [];
  const put = (p: THREE.Vector2, rim: number) => { pos.push(p.x, h - relief(p.x, p.y), p.y); uv.push(p.x, p.y); cell.push(KIND.water, 0, rim, 0); };
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    for (let k = 0; k < 3; k++) {
      const a0 = c.clone().lerp(a, k / 3), b0 = c.clone().lerp(b, k / 3), a1 = c.clone().lerp(a, (k + 1) / 3), b1 = c.clone().lerp(b, (k + 1) / 3);
      put(a0, k / 3); put(b1, (k + 1) / 3); put(a1, (k + 1) / 3);
      if (k) { put(a0, k / 3); put(b0, k / 3); put(b1, (k + 1) / 3); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return bend(g);
}

// A run of water laid over the land along a line: its width, and where the land falls steeply it stands a little off
// the face as a fall does, white with broken water.
function ribbon(run: Run): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], cell: number[] = [], idx: number[] = [];
  let along = 0;
  run.pts.forEach((p, i) => {
    const a = run.pts[Math.max(0, i - 1)], b = run.pts[Math.min(run.pts.length - 1, i + 1)], d = b.clone().sub(a).normalize(), side = new THREE.Vector2(-d.y, d.x);
    if (i) along += p.distanceTo(run.pts[i - 1]);
    const steep = Math.min(1, fall(p).length() / 0.7), w = run.w * (1 - 0.2 * steep) * (0.85 + 0.3 * Math.sin(along * 0.21));
    for (const s of [-1, 1]) {
      const q = p.clone().addScaledVector(side, (s * w) / 2);
      pos.push(q.x, 0.4 + steep * 1.8, q.y);
      uv.push(along, s);
      cell.push(KIND.water, steep, 1, 1);
    }
    if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  g.setIndex(idx);
  bend(g);
  g.computeVertexNormals();
  // Its normals look up out of the land, whichever way its triangles were wound.
  const n = g.getAttribute('normal'), pp = g.getAttribute('position'), up = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) {
    up.set(pp.getX(i), pp.getY(i) + PLANET.r, pp.getZ(i)).normalize();
    v.set(n.getX(i), n.getY(i), n.getZ(i));
    if (v.dot(up) < 0) n.setXYZ(i, -v.x, -v.y, -v.z);
  }
  return g;
}

export async function water(b: Builder, made: THREE.Material, low: THREE.Material): Promise<void> {
  const w = waters(), c = polar(LAKE.at[0], LAKE.at[1]);
  b.add(level(c, w.shore, LAKE.level), low);
  for (const run of w.runs) b.add(ribbon(run), low);
  const pool = Array.from({ length: 24 }, (_, i) => w.pool.clone().add(polar(i * 15, 6 + 1.2 * Math.sin(i * 2.3))));
  b.add(level(w.pool, pool, w.poolLevel), low);
  await slice();
  // The quay where the lake would run out down the valley: blocks of dressed stone, its coping a little over the
  // water, stepping down into it.
  for (let i = 0; i < w.shore.length; i++) {
    if (!w.open[i]) continue;
    const p = w.shore[i], next = w.shore[(i + 1) % w.shore.length], h = LAKE.level + 1.6 - relief(p.x, p.y);
    const spin = Math.atan2(next.x - p.x, next.y - p.y) / D2R + 90;
    const len = p.distanceTo(next) + 0.6;
    stand(b, made, tag(new THREE.BoxGeometry(len, h + 3, 2.6).translate(0, (h + 3) / 2 - 3, 0), KIND.stone), seat(p.x, p.y, 0, spin));
    stand(b, made, tag(new THREE.BoxGeometry(len, 0.5, 3.2).translate(0, h + 0.25, 0), KIND.bronzeDeep), seat(p.x, p.y, 0, spin));
    stand(b, made, tag(new THREE.BoxGeometry(len, 1, 1.6).translate(0, h - 2.4, -2), KIND.stone), seat(p.x, p.y, 0, spin));
  }
}
