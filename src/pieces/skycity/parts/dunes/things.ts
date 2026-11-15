import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rbox, seeded } from '../../../../world/build';
import { seat } from '../../layout';
import { KIND } from './materials';
import { PLACES } from './plan';
import type { Field } from './sand';

// What stands in the sand: few things, each worth looking at, for scale and for the note of an old world. An obelisk
// of dark stone canted in the sand with its cap of polished gold; the tops of a colonnade the dunes have buried;
// and a line of old markers, each with a small flame, leading to the pool. Each is built upright at the origin and stood in the sand.

type Kind = (typeof KIND)[keyof typeof KIND];

class Parts {
  list: THREE.BufferGeometry[] = [];
  add(g: THREE.BufferGeometry, kind: Kind, m: THREE.Matrix4, tone = 1, flat = false): void {
    let x = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k);
    if (flat || !x.getAttribute('normal')) x.computeVertexNormals();
    x.applyMatrix4(m);
    const n = x.getAttribute('position').count, look = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) look.set([tone, tone, tone, kind], i * 4);
    x.setAttribute('look', new THREE.Float32BufferAttribute(look, 4));
    this.list.push(x);
  }
}

// A tapering shaft whose section is a square with its corners cut, from y0 to y1, w across at the foot and w * top at
// the head.
function shaft(w: number, y0: number, y1: number, top: number, cut = 0.16): THREE.BufferGeometry {
  const h = w / 2, c = w * cut, sec: [number, number][] = [[h, h - c], [h - c, h], [-h + c, h], [-h, h - c], [-h, -h + c], [-h + c, -h], [h - c, -h], [h, -h + c]];
  const pos: number[] = [];
  for (let i = 0; i < sec.length; i++) {
    const [ax, az] = sec[i], [bx, bz] = sec[(i + 1) % sec.length];
    pos.push(ax, y0, az, bx, y0, bz, bx * top, y1, bz * top, ax, y0, az, bx * top, y1, bz * top, ax * top, y1, az * top);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// A column's shaft, fluted: sixteen shallow channels round it, from y0 to y1.
function fluted(r: number, y0: number, y1: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r * 1.04, y1 - y0, 64, 1, true).translate(0, (y0 + y1) / 2, 0), p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 - 0.07 * Math.max(0, Math.cos(a * 16)) ** 2;
    p.setXYZ(i, x * k, p.getY(i), z * k);
  }
  g.computeVertexNormals();
  return g;
}

export function things(field: Field): { geometry: THREE.BufferGeometry; lamps: THREE.Vector3[] } {
  const parts = new Parts(), r = seeded(4471), lamps: THREE.Vector3[] = [];
  const lean = (x: number, y: number, z: number) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(x, y, z));
  const stand = (x: number, z: number, tilt: THREE.Matrix4, spin: number, sink = 0): THREE.Matrix4 => seat(x, z, field.height(x, z) - sink, spin).multiply(tilt);

  // The obelisk, canted in the great dune's slip face to the right of the pool, on a plinth the sand has nearly
  // covered, with a band of gold under its cap of polished gold.
  {
    const o = PLACES.obelisk, m = stand(o.x, o.z, lean(0.14, 0, 0.3), 18, 16);
    parts.add(shaft(21, -4, 6, 0.96, 0.08), KIND.dark, m, 1.3, true);
    parts.add(shaft(14, 6, 82, 0.6), KIND.dark, m, 1, true);
    for (const [y, t] of [[68, 0.665], [73, 0.64]] as const) parts.add(shaft(14 * t * 1.06, y, y + 1.8, 0.98, 0.16), KIND.gold, m, 1, true);
    parts.add(new THREE.ConeGeometry(14 * 0.6 * 0.72, 11, 4, 1).rotateY(Math.PI / 4).translate(0, 87.5, 0), KIND.gold, m, 1, true);
  }

  // The colonnade: the heads of five columns of one hall, in the hollow between the first two rows at the front left,
  // sand heaped against them, and the lintel the first two still carry. One has lost its head, and its drum lies in
  // the sand. They stand at one height, as a hall's columns do, and the sand round them is deeper or shallower.
  {
    const cap = new THREE.LatheGeometry([[0, -0.5], [4.3, -0.5], [4.5, 0.6], [5.0, 1.6], [5.9, 3.0], [6.8, 4.5], [7.1, 5.4], [6.6, 5.9], [0, 5.9]].map(([x, y]) => new THREE.Vector2(x, y)), 32);
    const tilt = lean(0.03, 0, -0.04), tops: THREE.Vector3[] = [];
    const head = Math.max(...PLACES.columns.map((c) => field.height(c.x, c.z))) + 9;
    PLACES.columns.forEach((c, i) => {
      const up = head + (r() - 0.5) * 2, m = seat(c.x, c.z, 0, 8).multiply(tilt), broken = i === 3, top = broken ? up - 7 : up;
      parts.add(fluted(4.2, Math.min(top - 24, field.height(c.x, c.z) - 4), top), KIND.stone, m, 0.95 + r() * 0.1);
      if (broken) {
        const fx = c.x + 9, fz = c.z + 6;
        parts.add(fluted(4.2, -6, 6).rotateZ(Math.PI / 2), KIND.stone, stand(fx, fz, lean(0, 0.6, 0.08), 0, 2.4), 0.92);
        return;
      }
      parts.add(cap.clone().translate(0, top, 0), KIND.stone, m, 1.05);
      parts.add(rbox(11.5, 1.8, 11.5, 0.5).translate(0, top + 6.8, 0), KIND.stone, m, 1);
      tops.push(new THREE.Vector3(c.x, top + 7.7, c.z));
    });
    const [a, b] = tops;
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), len = Math.hypot(b.x - a.x, b.z - a.z) + 13;
    const m = seat(mid.x, mid.z, 0, (Math.atan2(b.x - a.x, b.z - a.z) * 180) / Math.PI + 90).multiply(tilt);
    parts.add(rbox(len, 5, 8, 0.7).translate(0, mid.y + 2.5, 0), KIND.stone, m, 0.92);
  }

  // The markers: a line of old stones across the open sand to the pool's shore, each with a small flame in a bronze cup.
  PLACES.markers.forEach((k, i) => {
    const m = stand(k.x, k.z, lean((r() - 0.5) * 0.12, 0, (r() - 0.5) * 0.14), r() * 30, 4), tall = 15 - 0.8 * i;
    parts.add(shaft(4.6, 0, tall, 0.78, 0.2), KIND.stone, m, 0.9 + r() * 0.15, true);
    parts.add(new THREE.CylinderGeometry(2.2, 1.3, 1.6, 12, 1).translate(0, tall + 0.8, 0), KIND.bronze, m, 1);
    parts.add(new THREE.SphereGeometry(1.25, 10, 8).translate(0, tall + 2.2, 0), KIND.lamp, m);
    lamps.push(new THREE.Vector3(0, tall + 2.2, 0).applyMatrix4(m));
  });

  const geometry = mergeGeometries(parts.list, false)!;
  for (const g of parts.list) g.dispose();
  return { geometry, lamps };
}
