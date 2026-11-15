import * as THREE from 'three';
import { Kit, V, bell, blade, block, hull, rod, smoothNormals, turned, xform, type Station } from './kit';
import type { KindName } from './look';

// The craft that fly over the world: five designs of one family, a future as Star Wars draws one with the flair of
// ancient Egypt. Each is built nose toward +x, top toward +y, in units, and its outline says what it is and which way
// it goes at the page's size, where it is 45 to 90 pixels long: a prow, a body, engines. The metals are the world's,
// polished and worn, and shaped to curve so a turning hull carries a moving line of light.
//   barque: a great slow barque, its hull a crescent that sweeps up into a high prow and a higher stern, a cabin
//     under a canopy amidships, a sun disc, steering oars, and two engine pods under it.
//   hauler: a long hauler, a cab of copper at its nose, a row of containers slung under a spine, and an engine block
//     with three bells and a fin.
//   courier: a fast courier with two needle hulls of copper, a cockpit pod between them on a swept wing, twin fins.
//   liner: a liner, a long rounded hull with three decks of lit windows, a gold prow, a bridge with a mast, and a ring
//     of engines at its stern.
//   dart: a small fast patrol craft, a gold body with a hooked prow, swept wings whose trailing edges are cut as a
//     falcon's feathers, one great engine.

export type DesignName = 'barque' | 'hauler' | 'courier' | 'liner' | 'dart';
// A light on a craft: where, how large in units, its heat, its strength, what it does, and how long a streak it draws
// behind it, along the craft's -x. steady, a short flash now and then (strobe), as bright as the engines work (engine),
// or a soft glow under a lifting plate (belly).
export interface CraftLight { at: [number, number, number]; size: number; heat: number; k: number; does: 'steady' | 'strobe' | 'engine' | 'belly'; streak?: number; dir?: [number, number, number] }
export interface Design { geo: THREE.BufferGeometry; tris: number; lights: CraftLight[]; len: number; tall: number }

const Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0);

// A tube swept along a curve in the craft's xy plane, its radius from its start to its end, closed at its end: a horn,
// a mast that bends.
function sweep(pts: THREE.Vector3[], radius: (t: number) => number, steps: number, seg: number): THREE.BufferGeometry {
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), pos: number[] = [], idx: number[] = [], B = new THREE.Vector3(0, 0, 1);
  const p = new THREE.Vector3(), T = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    c.getPointAt(t, p);
    c.getTangentAt(t, T);
    N.crossVectors(B, T).normalize();
    const r = radius(t);
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      pos.push(p.x + r * Math.cos(a) * N.x, p.y + r * Math.cos(a) * N.y, p.z + r * Math.sin(a));
    }
  }
  const W = seg + 1;
  for (let i = 0; i < steps; i++) for (let j = 0; j < seg; j++) { const a = i * W + j; idx.push(a, a + 1, a + W, a + 1, a + W + 1, a + W); }
  const end = pos.length / 3;
  c.getPointAt(1, p);
  pos.push(p.x, p.y, p.z);
  for (let j = 0; j < seg; j++) idx.push(steps * W + j, end, steps * W + j + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const flat = g.toNonIndexed();
  g.dispose();
  smoothNormals(flat, 50);
  return flat;
}

// A box whose walls lean in as they rise, the battered wall of Egypt: w0 by d0 at its foot, w1 by d1 at its top, h tall,
// its foot at y = 0. Its edges stay hard.
function frustum(w0: number, d0: number, w1: number, d1: number, h: number): THREE.BufferGeometry {
  const b = [[-w0, -d0], [w0, -d0], [w0, d0], [-w0, d0]].map(([x, z]) => V(x / 2, 0, z / 2));
  const t = [[-w1, -d1], [w1, -d1], [w1, d1], [-w1, d1]].map(([x, z]) => V(x / 2, h, z / 2));
  const tri: THREE.Vector3[] = [];
  const quad = (a: THREE.Vector3, bb: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => tri.push(a, bb, c, a, c, d);
  for (let i = 0; i < 4; i++) quad(b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]);
  quad(t[0], t[1], t[2], t[3]);
  quad(b[3], b[2], b[1], b[0]);
  const g = new THREE.BufferGeometry().setFromPoints(tri);
  smoothNormals(g, 20);
  return g;
}

// A turned form laid along a direction from a point: a finial on a horn's tip.
function along(g: THREE.BufferGeometry, at: THREE.Vector3, dir: THREE.Vector3): THREE.BufferGeometry {
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(X, dir.clone().normalize()));
  g.translate(at.x, at.y, at.z);
  return g;
}

// A blade laid flat, its outline given as (x, z) from above: a wing, a canopy roof seen from above.
function flat(outline: [number, number][], thick: number, cut = 0.15): THREE.BufferGeometry {
  return blade(outline, thick, cut).rotateX(Math.PI / 2);
}

// Small fittings along a hull's side, so it reads as built and used close up: hatches, vents, ribs. From a seed, the
// same every time.
function fittings(k: Kit, seed: number, x0: number, x1: number, y: number, zAt: (x: number) => number, n: number, kind: KindName): void {
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * (i + 0.2 + 0.6 * r()) / n, w = 1.2 + 2.4 * r(), h = 0.5 + 0.9 * r();
    for (const side of [-1, 1]) k.add(block(w, h, 0.5, 0.12), kind, xform([x, y + (r() - 0.5) * 1.4, side * (zAt(x) + 0.05)]));
  }
}

// The barque: about 92 long and 30 tall. A long deep hull is most of it, so at the page's size it reads as a ship:
// its horns rise from its ends and curl, they do not tower over it.
export function barque(): Design {
  const k = new Kit();
  const rise = (x: number) => (x > 18 ? 9 * ((x - 18) / 16) ** 2.2 : x < -20 ? 12 * ((-x - 20) / 14) ** 2 : 0);
  const half = (x: number) => 8.2 * Math.max(0.06, 1 - (Math.abs(x) / 34) ** 2.6) ** 1.05;
  const xs = [-31, -29, -26, -20, -12, -2, 8, 16, 22, 26, 29, 30.5];
  const st: Station[] = xs.map((x) => { const w = half(x), f = w / 8.2; return { x, y: rise(x) * 0.6, w, up: 1.1 * f + 0.35, down: 6.6 * f ** 1.15 + 0.45, n: 2.7 }; });
  k.add(hull(st, 32), 'iron');
  // The gold strakes: one broad band along each side under the sheer, and a narrow one at the turn of the bilge.
  for (const arc of [[0.0, 0.5], [Math.PI - 0.5, Math.PI], [-0.62, -0.5], [Math.PI + 0.5, Math.PI + 0.62]] as [number, number][]) k.add(hull(st, 6, false, arc, 1.02), 'gold');
  // The deck: a dark floor let into the top of the hull, and a gold rail along each side of it on stanchions.
  k.add(hull(st.slice(1, 11).map((s) => ({ ...s, y: s.y + s.up * 0.55, w: s.w * 0.86, up: 0.25, down: 0.25, n: 6 })), 12), 'black');
  for (const side of [-1, 1]) {
    const rail = st.slice(2, 10).map((s) => V(s.x, s.y + s.up + 1.5, side * s.w * 0.9));
    for (let i = 0; i < rail.length - 1; i++) k.add(rod(rail[i], rail[i + 1], 0.32, 6), 'gold');
    for (const p of rail) k.add(rod(V(p.x, p.y - 1.6, p.z), p, 0.2, 5), 'gold');
  }
  // The horns: the hull sweeps up into a prow and a higher stern that curls forward, each capped.
  const prow = [V(20, rise(20) - 0.6, 0), V(28, 1.6, 0), V(35, 5.0, 0), V(39.8, 9.8, 0), V(42.2, 14.6, 0), V(41.8, 18.2, 0), V(40.0, 20.2, 0)];
  const stern = [V(-21, rise(-21) - 0.6, 0), V(-29, 2.0, 0), V(-35.6, 6.6, 0), V(-39.8, 12.4, 0), V(-41.2, 17.6, 0), V(-40.0, 21.8, 0), V(-37.2, 24.2, 0), V(-34.2, 24.6, 0)];
  k.add(sweep(prow, (t) => 3.4 * (1 - t) ** 1.5 + 0.9, 36, 16), 'gold');
  k.add(sweep(stern, (t) => 3.8 * (1 - t) ** 1.45 + 0.95, 40, 16), 'gold');
  k.add(along(turned([[0.9, 0], [1.4, 0.9], [2.8, 2.5], [3.3, 3.3], [1.9, 3.8], [0.01, 4.2]], 18), prow[6], prow[6].clone().sub(prow[5])), 'gold');
  k.add(along(turned([[0.95, 0], [1.7, 1.1], [3.4, 2.8], [3.8, 3.6], [0.01, 3.9]], 18), stern[7], stern[7].clone().sub(stern[6])), 'gold');
  // Bands of dark bronze round each horn where it leaves the hull, three to each.
  for (const [h, r0] of [[prow, 3.4], [stern, 3.8]] as [THREE.Vector3[], number][]) {
    const c = new THREE.CatmullRomCurve3(h, false, 'centripetal');
    for (const t of [0.4, 0.46]) {
      const p = c.getPointAt(t), d = c.getTangentAt(t), r = r0 * (1 - t) ** 1.5 + 0.95;
      k.add(along(turned([[r, -0.35], [r + 0.4, -0.15], [r + 0.4, 0.15], [r, 0.35]], 16), p, d), 'bronze');
    }
  }
  // The cabin amidships: its walls lean in, a cavetto cornice flares at its top, and its windows are bays between
  // gold pilasters. Over it a canopy stands on four columns, with a clerestory of light under it.
  const cab = { x: -2, len: 26, w: 9.4, y: 1.2, h: 5.6, gap: 2.2 };
  k.add(frustum(cab.len, cab.w, cab.len - 1.6, cab.w - 1.4, cab.h), 'black', xform([cab.x, cab.y, 0]), 0, 0, 1000 + cab.y);
  const lean = Math.atan(0.7 / cab.h);
  for (const side of [-1, 1]) {
    const zAt = (y: number) => side * (cab.w / 2 - 0.7 * (y / cab.h) + 0.04);
    k.add(new THREE.PlaneGeometry(cab.len - 3, 2.6), 'windows', xform([cab.x, cab.y + cab.h * 0.52, zAt(cab.h * 0.52)], side > 0 ? 0 : Math.PI, 1, 0, -lean), 1);
    for (let i = 0; i <= 8; i++) {
      const x = cab.x - (cab.len - 3) / 2 + (i * (cab.len - 3)) / 8;
      k.add(block(0.55, cab.h * 0.9, 0.45, 0.12), 'gold', xform([x, cab.y + cab.h * 0.47, zAt(cab.h * 0.47) + side * 0.12], 0, 1, 0, -side * lean), 0, 0, 1000 + cab.y);
    }
    k.add(block(cab.len - 1.5, 0.5, 0.5, 0.12), 'gold', xform([cab.x, cab.y + cab.h * 0.16, zAt(cab.h * 0.16) + side * 0.15], 0, 1, 0, -side * lean));
  }
  const top = cab.y + cab.h;
  k.add(frustum(cab.len - 1.6, cab.w - 1.4, cab.len + 0.8, cab.w + 1.0, 0.9), 'bronze', xform([cab.x, top, 0]));
  k.add(block(cab.len - 3, cab.gap, cab.w - 2.6, 0.2), 'strip', xform([cab.x, top + 0.9 + cab.gap / 2, 0]), 1);
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1], [0, -1], [0, 1]]) {
    const at = V(cab.x + x * (cab.len / 2 - 1.2), top + 0.9, z * (cab.w / 2 - 0.9));
    k.add(turned([[0.55, 0], [0.45, 0.3], [0.42, cab.gap - 0.4], [0.7, cab.gap]], 10).rotateZ(Math.PI / 2), 'gold', xform([at.x, at.y, at.z]));
  }
  const roof = top + 0.9 + cab.gap;
  k.add(block(cab.len + 6, 0.6, cab.w + 3.4, 0.25), 'steel', xform([cab.x, roof + 0.3, 0]));
  k.add(frustum(cab.len + 6, cab.w + 3.4, cab.len + 7.6, cab.w + 5.0, 0.7), 'bronze', xform([cab.x, roof + 0.6, 0]));
  for (const side of [-1, 1]) k.add(rod(V(cab.x - (cab.len + 7.6) / 2, roof + 1.3, side * (cab.w + 5.0) / 2), V(cab.x + (cab.len + 7.6) / 2, roof + 1.3, side * (cab.w + 5.0) / 2), 0.28, 8), 'gold');
  k.add(block(cab.len + 3, 0.5, cab.w + 1.4, 0.2), 'black', xform([cab.x, roof + 1.55, 0]));
  // The sun disc, upright on the canopy, held between two horns.
  const sun = V(cab.x + 6, roof + 5.4, 0);
  k.add(turned([[0.01, -1.3], [1.2, -1.1], [2.2, -0.6], [2.7, -0.15], [2.7, 0.15], [2.2, 0.6], [1.2, 1.1], [0.01, 1.3]], 32, 0, 60).rotateY(Math.PI / 2), 'gold', xform([sun.x, sun.y, 0]));
  k.add(new THREE.TorusGeometry(2.95, 0.42, 8, 32), 'bronze', xform([sun.x, sun.y, 0]));
  for (const s of [-1, 1]) k.add(sweep([V(sun.x + s * 4.4, roof + 1.8, 0), V(sun.x + s * 4.2, sun.y, 0), V(sun.x + s * 2.6, sun.y + 3.8, 0), V(sun.x + s * 0.7, sun.y + 4.5, 0)], (t) => 0.62 - 0.35 * t, 16, 8), 'gold');
  // A brazier on the foredeck and a lantern on a post at the stern.
  k.add(turned([[0.6, 0], [0.9, 0.6], [1.7, 1.4], [1.8, 1.9], [0.01, 1.9]], 14).rotateZ(Math.PI / 2), 'gold', xform([24, rise(24) + 1.3, 0]));
  k.add(rod(V(-25, rise(-25) + 1.2, 0), V(-25, rise(-25) + 6.2, 0), 0.32, 6), 'black');
  // The steering oars, one each side at the stern quarter, angled down and back clear of the hull and the pods, with
  // broad blades, each held in a housing on the rail.
  for (const side of [-1, 1]) {
    const a = V(-21, rise(-21) + 2.4, side * 7.8), b = V(-30, -13, side * 10.2), d = b.clone().sub(a).normalize();
    k.add(rod(a, b, 0.45, 8), 'bronze');
    const bl = blade([[-1.3, 0], [1.3, 0], [1.6, 5.5], [0, 7], [-1.6, 5.5]], 0.5, 0.15).rotateX(Math.PI);
    bl.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), d));
    bl.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(d, Math.PI / 2));
    const c = b.clone().addScaledVector(d, -5.5);
    bl.translate(c.x, c.y, c.z);
    k.add(bl, 'gold');
    k.add(block(2.0, 1.8, 1.4, 0.35), 'black', xform([a.x, a.y, a.z]));
  }
  // The engines: a housing of bronze under the root of the stern horn with two bells side by side, and under the hull
  // a deep keel with a lifting plate glowing along each side of it.
  k.add(frustum(9, 7.6, 6, 6.4, 6.4), 'bronze', xform([-27.5, -6.6, 0]), 0, 0, 1000 - 6.6);
  k.add(block(9.6, 0.6, 8.2, 0.2), 'gold', xform([-27.5, -0.4, 0]));
  for (const z of [-2.1, 2.1]) bell(k, 1.75, 3.2, [-31.6, -3.4, z], 'black');
  k.add(blade([[-14, 0], [14, 0], [9, -2.6], [-10, -2.6]], 1.2, 0.3), 'bronze', xform([0, -6.2, 0]));
  k.add(rod(V(-10.2, -8.8, 0), V(9.2, -8.8, 0), 0.75, 10), 'gold');
  // The lifting plates, let into the hull's bottom either side of the keel: three each side, glowing.
  for (const side of [-1, 1]) for (const x of [-12, -1, 10]) k.add(turned([[1.9, 0], [2.3, 0.4], [2.3, 0.9], [0.01, 1.0]], 16).rotateZ(-Math.PI / 2), 'belly', xform([x, -5.5, side * 3.0]));
  // A row of lit portholes along each side of the hull, each in a gold rim.
  for (let i = 0; i < 9; i++) {
    const x = -17 + i * 4.2, y = -2.2, w = half(x), e = 2 / 2.7, sy = Math.abs(y / (6.6 * (w / 8.2) ** 1.15 + 0.45)) ** (1 / e), z = w * Math.sqrt(Math.max(0, 1 - sy * sy)) ** e;
    for (const side of [-1, 1]) {
      k.add(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 12).rotateX(Math.PI / 2), 'windows', xform([x, y, side * (z + 0.02)]), 3);
      k.add(new THREE.TorusGeometry(0.78, 0.2, 5, 14), 'gold', xform([x, y, side * (z + 0.08)]));
    }
  }
  return {
    geo: k.geometry(), tris: k.tris, len: 92, tall: 30,
    lights: [
      { at: [24, rise(24) + 3.0, 0], size: 1.6, heat: 0.92, k: 1.6, does: 'steady' },
      { at: [-25, rise(-25) + 6.6, 0], size: 1.3, heat: 0.88, k: 1.4, does: 'steady' },
      { at: [prow[6].x + 1.4, prow[6].y + 3.0, 0], size: 1.3, heat: 0.9, k: 1.1, does: 'steady' },
      { at: [stern[7].x + 2.6, stern[7].y + 0.8, 0], size: 1.3, heat: 0.95, k: 1.6, does: 'strobe' },
      { at: [-35, -3.4, -2.1], size: 2.0, heat: 0.9, k: 2.4, does: 'engine', streak: 17 },
      { at: [-35, -3.4, 2.1], size: 2.0, heat: 0.9, k: 2.4, does: 'engine', streak: 17 },
      ...[-12, -1, 10].flatMap((x) => [-3, 3].map((z): CraftLight => ({ at: [x, -6.6, z], size: 3.6, heat: 0.5, k: 0.16, does: 'belly', streak: 2.5, dir: [0, -1, 0] }))),
    ],
  };
}

// The hauler: about 88 long.
export function hauler(): Design {
  const k = new Kit();
  // The spine: a beam from the engine block to the cab, ribbed.
  k.add(block(64, 3.0, 4.4, 0.4), 'steel', xform([2, 7.4, 0]));
  for (let i = 0; i < 9; i++) k.add(block(0.9, 3.6, 5.2, 0.2), 'black', xform([-28 + i * 7.4, 7.4, 0]));
  k.add(block(60, 0.5, 1.2, 0.15), 'gold', xform([2, 9.15, 0]));
  // The cab: a blunt hull of polished copper, its glass a wedge across the top of its nose.
  const cab: Station[] = [
    { x: 30, y: 5.5, w: 4.6, up: 5.2, down: 4.6, n: 4 }, { x: 36, y: 5.5, w: 4.8, up: 5.4, down: 4.6, n: 3.8 },
    { x: 42, y: 5.0, w: 4.2, up: 4.4, down: 3.8, n: 3.4 }, { x: 45.5, y: 4.4, w: 3.0, up: 3.0, down: 2.8, n: 3 },
    { x: 47.3, y: 3.9, w: 1.4, up: 1.4, down: 1.4, n: 2.6 }, { x: 47.8, y: 3.8, w: 0.3, up: 0.3, down: 0.3, n: 2.4 },
  ];
  k.add(hull(cab, 24), 'copper');
  k.add(hull(cab.slice(1, 5), 10, false, [0.62, Math.PI - 0.62], 1.03), 'glass');
  for (const arc of [[0.05, 0.28], [Math.PI - 0.28, Math.PI - 0.05]] as [number, number][]) k.add(hull(cab.slice(0, 3), 4, false, arc, 1.02), 'windows', undefined, 3);
  k.add(hull(cab.slice(0, 2), 6, false, [-0.5, 0.5], 1.04), 'gold');
  k.add(hull(cab.slice(0, 2), 6, false, [Math.PI - 0.5, Math.PI + 0.5], 1.04), 'gold');
  // The containers, slung under the spine on clamps, each a different metal, ribbed across.
  const boxes: KindName[] = ['copper', 'black', 'gold', 'bronze', 'steel'];
  boxes.forEach((kind, i) => {
    const x = -20.5 + i * 10.6;
    k.add(block(9.8, 8.6, 7.4, 0.45), kind, xform([x, 1.4, 0]));
    for (const dx of [-3.6, 0, 3.6]) k.add(block(0.5, 8.9, 7.7, 0.12), kind === 'black' ? 'steel' : 'black', xform([x + dx, 1.4, 0]));
    for (const dx of [-3, 3]) k.add(block(1.2, 1.6, 2.4, 0.2), 'black', xform([x + dx, 5.9, 0]));
  });
  // The engine block: tall, its back face carrying three bells, a fin over it, and vanes either side.
  k.add(frustum(13, 10, 11, 8, 15), 'steel', xform([-33, -4.2, 0]));
  k.add(block(13.4, 1.0, 10.4, 0.3), 'gold', xform([-33, 3.2, 0]));
  k.add(block(11.6, 0.8, 8.6, 0.25), 'bronze', xform([-33, 10.6, 0]));
  for (const [y, z] of [[6.4, 0], [-0.6, -2.8], [-0.6, 2.8]]) bell(k, 2.4, 3.6, [-39.4, y, z], 'black');
  k.add(blade([[-40, 0], [-30, 0], [-34, 9], [-41.5, 10]], 0.8, 0.2), 'gold', xform([0, 10.8, 0]));
  for (const side of [-1, 1]) k.add(flat([[-40, 0], [-30, 0], [-35, 6], [-41, 6.4]], 0.7), 'copper', xform([0, 2, side * 4.8], 0, [1, 1, side]));
  // The lifting plates under the containers, glowing.
  k.add(block(48, 0.3, 2.2, 0.1), 'belly', xform([0.6, -3.0, 0]));
  fittings(k, 11, -27, -39, 1, () => 5.2, 2, 'black');
  return {
    geo: k.geometry(), tris: k.tris, len: 88, tall: 21,
    lights: [
      { at: [47.6, 3.6, 0], size: 2.2, heat: 0.92, k: 1.8, does: 'steady' },
      { at: [-36, 20.6, 0], size: 1.6, heat: 0.96, k: 1.8, does: 'strobe' },
      { at: [-43.2, 6.4, 0], size: 2.6, heat: 0.8, k: 1.3, does: 'engine', streak: 6 },
      { at: [-43.2, -0.6, -2.8], size: 2.6, heat: 0.8, k: 1.3, does: 'engine', streak: 6 },
      { at: [-43.2, -0.6, 2.8], size: 2.6, heat: 0.8, k: 1.3, does: 'engine', streak: 6 },
      { at: [28, 9.4, 4.8], size: 1.2, heat: 0.6, k: 1.1, does: 'steady' },
      { at: [28, 9.4, -4.8], size: 1.2, heat: 0.6, k: 1.1, does: 'steady' },
    ],
  };
}

// The courier: about 52 long.
export function courier(): Design {
  const k = new Kit();
  const needle: Station[] = [
    { x: -22, y: 0, w: 1.8, up: 1.8, down: 1.6, n: 2.6 }, { x: -19, y: 0, w: 2.2, up: 2.3, down: 1.9, n: 2.6 }, { x: 4, y: 0, w: 2.1, up: 2.0, down: 1.7, n: 2.4 },
    { x: 16, y: -0.1, w: 1.5, up: 1.4, down: 1.2, n: 2.3 }, { x: 23, y: -0.3, w: 0.7, up: 0.65, down: 0.55, n: 2.2 }, { x: 27, y: -0.5, w: 0.05, up: 0.05, down: 0.05, n: 2 },
  ];
  for (const side of [-1, 1]) {
    const z = side * 5.4, m = xform([0, 0, z]);
    k.add(hull(needle.slice(0, 4), 18), 'copper', m);
    k.add(hull(needle.slice(3), 18), 'gold', m);
    k.add(hull(needle.slice(1, 3), 6, false, [side > 0 ? -0.18 : Math.PI - 0.05, side > 0 ? 0.05 : Math.PI + 0.18], 1.04), 'strip', m, 1);
    bell(k, 1.9, 3.2, [-22, 0, z], 'black');
    k.add(blade([[-21, 0], [-14, 0], [-17.5, 5.2], [-22.6, 5.8]], 0.5, 0.12), 'gold', xform([0, 1.4, z], 0, 1, 0, -side * 0.12));
    k.add(turned([[2.25, 0], [2.45, 0.3], [2.45, 1.8], [2.25, 2.1]], 16, -12), 'black', m);
  }
  // The swept wing that carries the hulls, through the cockpit pod.
  k.add(flat([[-15, -6.4], [-4, -6.4], [9, -1.6], [11, 0], [9, 1.6], [-4, 6.4], [-15, 6.4], [-12, 0]], 0.7, 0.2), 'bronze', xform([0, -0.6, 0]));
  k.add(flat([[-15.2, -5], [-13.6, -5], [-13.6, 5], [-15.2, 5]], 0.75, 0.1), 'strip', xform([0, -0.6, 0]), 0);
  const pod: Station[] = [
    { x: -11, y: 0.4, w: 1.6, up: 1.4, down: 1.2, n: 2.6 }, { x: -7, y: 0.4, w: 2.4, up: 2.4, down: 1.6, n: 2.6 }, { x: 8, y: 0.2, w: 2.2, up: 2.2, down: 1.5, n: 2.5 },
    { x: 15, y: -0.1, w: 1.2, up: 1.1, down: 0.9, n: 2.3 }, { x: 18.5, y: -0.3, w: 0.1, up: 0.1, down: 0.1, n: 2 },
  ];
  k.add(hull(pod, 20), 'steel');
  k.add(hull([{ x: -4, y: 1.4, w: 1.2, up: 0.9, down: 0.1, n: 2.6 }, { x: 0, y: 1.4, w: 1.9, up: 1.8, down: 0.1, n: 2.6 }, { x: 7, y: 1.2, w: 1.7, up: 1.4, down: 0.1, n: 2.5 }, { x: 11, y: 0.9, w: 0.5, up: 0.4, down: 0.1, n: 2.4 }], 16), 'glass');
  return {
    geo: k.geometry(), tris: k.tris, len: 52, tall: 9,
    lights: [
      { at: [-25.4, 0, -5.4], size: 2.4, heat: 0.86, k: 1.6, does: 'engine', streak: 11 },
      { at: [-25.4, 0, 5.4], size: 2.4, heat: 0.86, k: 1.6, does: 'engine', streak: 11 },
      { at: [27.2, -0.5, -5.4], size: 0.8, heat: 0.7, k: 0.7, does: 'steady' },
      { at: [-21.8, 7.2, 5.4], size: 1.1, heat: 0.95, k: 1.4, does: 'strobe' },
    ],
  };
}

// The liner: about 82 long.
export function liner(): Design {
  const k = new Kit();
  const body: Station[] = [
    { x: -37, y: 0, w: 6.2, up: 7.2, down: 6.0, n: 2.6 }, { x: -33, y: 0, w: 8.6, up: 9.6, down: 7.6, n: 2.6 }, { x: -22, y: 0, w: 9.6, up: 10.6, down: 8.2, n: 2.5 },
    { x: 12, y: 0, w: 9.6, up: 10.4, down: 8.2, n: 2.5 }, { x: 24, y: 0.2, w: 8.6, up: 9.2, down: 7.4, n: 2.4 }, { x: 31, y: 0.4, w: 6.8, up: 7.2, down: 5.8, n: 2.3 },
  ];
  const nose: Station[] = [body[5], { x: 36, y: 0.6, w: 4.6, up: 4.8, down: 3.9, n: 2.2 }, { x: 39.4, y: 0.7, w: 2.2, up: 2.3, down: 1.8, n: 2.1 }, { x: 41, y: 0.7, w: 0.2, up: 0.2, down: 0.2, n: 2 }];
  k.add(hull(body, 32), 'bronze');
  k.add(hull(nose, 32), 'gold');
  // Three decks of windows each side, and a dark band between them; a line of light along the promenade at the top.
  const decks: [number, number][] = [[0.52, 0.66], [0.22, 0.34], [-0.1, 0.02]];
  decks.forEach(([a0, a1], i) => {
    for (const arc of [[a0, a1], [Math.PI - a1, Math.PI - a0]] as [number, number][]) k.add(hull(body.slice(1, 5), 3, false, arc, 1.012), 'windows', undefined, 4 + i);
  });
  for (const arc of [[0.36, 0.5], [Math.PI - 0.5, Math.PI - 0.36], [0.04, 0.2], [Math.PI - 0.2, Math.PI - 0.04]] as [number, number][]) k.add(hull(body.slice(1, 5), 3, false, arc, 1.008), 'black');
  for (const arc of [[-0.42, -0.14], [Math.PI + 0.14, Math.PI + 0.42]] as [number, number][]) k.add(hull(body.slice(1, 5), 4, false, arc, 1.01), 'copper');
  k.add(hull(body.slice(1, 5), 6, false, [Math.PI / 2 - 0.42, Math.PI / 2 + 0.42], 1.01), 'steel');
  k.add(hull(body.slice(2, 4), 2, false, [Math.PI / 2 - 0.46, Math.PI / 2 - 0.42], 1.02), 'strip', undefined, 1);
  k.add(hull(body.slice(2, 4), 2, false, [Math.PI / 2 + 0.42, Math.PI / 2 + 0.46], 1.02), 'strip', undefined, 1);
  // The deckhouse: a long low house along the roof, stepped twice, each step with its row of windows, its bridge at the
  // fore end raked back.
  for (const [x0, x1, y, w, h, row] of [[-26, 24, 9.6, 12, 3.2, 7], [-18, 16, 12.8, 9, 2.6, 8]] as [number, number, number, number, number, number][]) {
    k.add(frustum(x1 - x0, w, x1 - x0 - 3, w - 1.6, h), 'steel', xform([(x0 + x1) / 2, y, 0]), 0, 0, 1000 + y);
    for (const side of [-1, 1]) k.add(new THREE.PlaneGeometry(x1 - x0 - 5, h * 0.42), 'windows', xform([(x0 + x1) / 2, y + h * 0.55, side * (w / 2 - 0.8 * 0.55 + 0.05)], side > 0 ? 0 : Math.PI, 1, 0, -Math.atan(0.8 / h)), row);
    k.add(block(x1 - x0 - 2.2, 0.45, w - 1.2, 0.15), 'gold', xform([(x0 + x1) / 2 - 0.4, y + h + 0.2, 0]));
  }
  // A row of domes along the roof aft.
  for (const x of [-12, -2, 8]) k.add(new THREE.SphereGeometry(2.0, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), 'copper', xform([x, 15.6, 0]));
  // The stern: a ring of engines round a cone, and stabilisers.
  k.add(turned([[6.4, 0], [7.6, 0.6], [7.8, 3.4], [7.0, 4.2], [6.2, 3.6]], 32, -40.5), 'gold');
  k.add(turned([[6.3, 0.2], [4.5, -0.8], [0.01, -1.4]], 24, -39.6), 'engine', undefined, 0, 0, 6.3);
  for (const [y, z] of [[3.4, 0], [-2.2, -3.4], [-2.2, 3.4]]) bell(k, 1.9, 2.6, [-40.2, y, z], 'black');
  for (const side of [-1, 1]) k.add(flat([[-38, 0], [-28, 0], [-34, 7], [-40, 7.6]], 0.8), 'copper', xform([0, -1.6, side * 7.2], 0, [1, 1, side]));
  k.add(blade([[-40, 0], [-27, 0], [-33, -6], [-40.5, -6.8]], 0.9, 0.2), 'bronze', xform([0, -7, 0]));
  k.add(blade([[-40, 0], [-30, 0], [-35, 7.5], [-41, 8.2]], 0.8, 0.2), 'gold', xform([0, 8.4, 0]));
  return {
    geo: k.geometry(), tris: k.tris, len: 82, tall: 26,
    lights: [
      { at: [-16, 15.9, 0], size: 1.3, heat: 0.96, k: 1.7, does: 'strobe' },
      { at: [41.2, 0.7, 0], size: 2.2, heat: 0.9, k: 1.4, does: 'steady' },
      { at: [-41.6, 3.4, 0], size: 2.4, heat: 0.78, k: 1.1, does: 'engine', streak: 5 },
      { at: [-41.6, -2.2, -3.4], size: 2.4, heat: 0.78, k: 1.1, does: 'engine', streak: 5 },
      { at: [-41.6, -2.2, 3.4], size: 2.4, heat: 0.78, k: 1.1, does: 'engine', streak: 5 },
      { at: [-34, -1.6, 14.4], size: 1.2, heat: 0.8, k: 1.2, does: 'steady' },
      { at: [-34, -1.6, -14.4], size: 1.2, heat: 0.8, k: 1.2, does: 'steady' },
    ],
  };
}

// The dart: about 46 long.
export function dart(): Design {
  const k = new Kit();
  const body: Station[] = [
    { x: -19, y: 0, w: 2.6, up: 2.7, down: 2.3, n: 2.6 }, { x: -15, y: 0, w: 3.2, up: 3.2, down: 2.6, n: 2.7 }, { x: 0, y: 0.1, w: 3.0, up: 2.8, down: 2.3, n: 2.6 },
    { x: 10, y: 0, w: 2.2, up: 2.0, down: 1.7, n: 2.5 }, { x: 17, y: -0.5, w: 1.3, up: 1.1, down: 1.0, n: 2.4 }, { x: 22, y: -1.4, w: 0.5, up: 0.45, down: 0.4, n: 2.3 },
    { x: 24.5, y: -2.4, w: 0.06, up: 0.06, down: 0.06, n: 2 },
  ];
  k.add(hull(body, 24), 'gold');
  k.add(hull([{ x: 0, y: 1.8, w: 1.4, up: 0.9, down: 0.1, n: 2.6 }, { x: 4, y: 1.9, w: 2.1, up: 1.8, down: 0.1, n: 2.6 }, { x: 10, y: 1.4, w: 1.7, up: 1.2, down: 0.1, n: 2.5 }, { x: 14, y: 0.8, w: 0.4, up: 0.3, down: 0.1, n: 2.4 }], 16), 'glass');
  k.add(hull(body.slice(0, 4), 6, false, [-Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6], 1.02), 'black');
  for (const side of [-1, 1]) {
    const wing: [number, number][] = [[-13, 1.8], [5, 1.8], [-6, 9], [-11, 15.5], [-17.6, 16.2], [-15.6, 13], [-18.4, 12.6], [-15.8, 9.6], [-18.6, 9.1], [-15.6, 6.2], [-18.2, 5.6], [-14.8, 3.2]];
    k.add(flat(wing.map(([x, z]) => [x, z * side] as [number, number]), 0.6, 0.15), 'bronze', xform([0, -0.6, 0], 0, 1, 0, side * 0.14));
    k.add(flat([[-13, 2.0], [5, 2.0], [-6, 9], [-11, 15.5], [-10.4, 15.4], [-6.4, 8.6], [4, 2.3]].map(([x, z]) => [x, z * side] as [number, number]), 0.7, 0.1), 'gold', xform([0, -0.55, 0], 0, 1, 0, side * 0.14));
    bell(k, 1.0, 2.0, [-12.5, -0.8, side * 4.6], 'black');
    k.add(turned([[0.01, 0], [1.0, 1], [1.1, 9], [0.8, 10.5], [0.01, 11]], 10, -12.6), 'steel', xform([0, -0.8, side * 4.6]));
  }
  k.add(blade([[-19, 0], [-9, 0], [-14.5, 6.2], [-20.5, 6.8]], 0.6, 0.15), 'gold', xform([0, 2.2, 0]));
  bell(k, 2.4, 3.6, [-19, 0, 0], 'black');
  k.add(turned([[2.75, 0], [3.0, 0.3], [3.0, 1.6], [2.75, 1.9]], 18, -17.5), 'black');
  return {
    geo: k.geometry(), tris: k.tris, len: 46, tall: 10,
    lights: [
      { at: [-22.8, 0, 0], size: 3.0, heat: 0.9, k: 1.7, does: 'engine', streak: 12 },
      { at: [-14.8, -0.8, -4.6], size: 1.4, heat: 0.84, k: 1.1, does: 'engine', streak: 6 },
      { at: [-14.8, -0.8, 4.6], size: 1.4, heat: 0.84, k: 1.1, does: 'engine', streak: 6 },
      { at: [-14.4, -2.6, 16.6], size: 1.1, heat: 0.9, k: 1.2, does: 'steady' },
      { at: [-14.4, -2.6, -16.6], size: 1.1, heat: 0.9, k: 1.2, does: 'strobe' },
    ],
  };
}

export const DESIGNS: Record<DesignName, () => Design> = { barque, hauler, courier, liner, dart };
