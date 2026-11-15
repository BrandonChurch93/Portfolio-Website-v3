import * as THREE from 'three';
import type { Lamp } from './materials';
import { type Parts, battered, block, local, place, prism, pyramidal } from './forms';

// The made things the quarter and the way share, each built at a place, turned about its own upright, and handed to
// the parts. A thing that gives light adds its lamp to the list, which the materials draw as the light it throws.

// A thing's place on the map, so far above the ground there, turned about its own upright, in degrees, and drawn so
// many times its built size.
export interface Put { x: number; z: number; turn?: number; y?: number; scale?: number }
const mat = (p: Put, s = 1) => place(p.x, p.y ?? 0, p.z, p.turn ?? 0, s * (p.scale ?? 1));
const world = (p: Put, x: number, y: number, z: number, s = 1): [number, number, number] => { const k = s * (p.scale ?? 1); return local(p.x, p.y ?? 0, p.z, p.turn ?? 0, x * k, y * k, z * k); };
const far = (p: Put, reach: number) => reach * (p.scale ?? 1);

// An obelisk: a plinth of pale stone, a shaft of dark granite tapering to a point under a capstone of gold.
export function obelisk(b: Parts, p: Put, tall: number, foot: number, o: { plinth?: number; cast?: boolean; seed?: number } = {}): number {
  const plinth = o.plinth ?? Math.max(1.6, tall * 0.07), m = mat(p), top = foot * 0.64, cap = top * 1.9;
  const shaft = tall - plinth - cap;
  b.add(battered(foot * 3.1, foot * 3.1, plinth, 0.06, { cornice: plinth * 0.35, c: 0.15 }), 'lime', { m, cast: o.cast, seed: o.seed });
  b.add(prism([{ y: plinth, hw: foot, hd: foot, c: foot * 0.12 }, { y: plinth + shaft, hw: top, hd: top, c: top * 0.12 }]), 'granite', { m, cast: o.cast });
  b.add(pyramidal(top, cap).translate(0, plinth + shaft, 0), 'gold', { m, cast: o.cast });
  return plinth + shaft;
}

// A brazier: a pedestal of pale stone, a bowl of bronze, and its flame, which flickers. It adds its lamp.
export function brazier(b: Parts, lamps: Lamp[], p: Put, pedestal: number, seed: number): void {
  const m = mat(p);
  b.add(battered(3.4, 3.4, pedestal, 0.14, { cornice: 1.1, c: 0.15 }), 'lime', { m, seed });
  const bowl: [number, number][] = [[0.5, 0], [0.9, 0.25], [1.3, 0.9], [2.0, 1.45], [2.15, 1.6], [1.9, 1.6]];
  b.add(new THREE.LatheGeometry(bowl.map(([r, y]) => new THREE.Vector2(r, y)), 14).translate(0, pedestal, 0), 'bronze', { m });
  const base = pedestal + 1.2, fh = 2.8;
  for (const [dx, dz, h, r] of [[0, 0, 1, 1.25], [0.55, 0.3, 0.7, 0.8], [-0.5, -0.35, 0.75, 0.75]] as [number, number, number, number][]) {
    const g = new THREE.ConeGeometry(r, fh * h, 7, 3, true).translate(dx, base + (fh * h) / 2, dz);
    b.add(g, 'flame', { m, seed, v: (q) => Math.min(1, Math.max(0, (q.y - base) / fh)) });
  }
  lamps.push({ at: world(p, 0, base + 1.4, 0), power: 1.1, reach: far(p, 9), heat: 0.62, flicker: true });
}

// A lamp on a slim post of granite, its head a small lit block.
export function lampPost(b: Parts, lamps: Lamp[], p: Put, tall: number, power = 0.55): void {
  const m = mat(p);
  b.add(block(0.6, tall, 0.6, 0.08), 'granite', { m });
  b.add(block(1.1, 0.25, 1.1, 0.05, tall), 'bronze', { m });
  b.add(block(0.8, 0.8, 0.8, 0.08, tall + 0.25), 'lamp', { m });
  b.add(block(1.2, 0.2, 1.2, 0.05, tall + 1.05), 'bronze', { m });
  lamps.push({ at: world(p, 0, tall + 0.6, 0), power, reach: far(p, 6), heat: 0.75 });
}

// A sphinx couched on its plinth, cased in gold, reduced to its masses: haunch, back, forepaws, chest and the head
// under its striped headdress. Its head is toward the thing's +x. Built 10 high, scaled to its height.
export function sphinx(b: Parts, p: Put, tall: number, seed: number): void {
  const s = tall / 10, m = mat(p, s);
  b.add(battered(15, 6, 3.6, 0.03, { cornice: 0.9, c: 0.15 }), 'lime', { m, seed, cast: true });
  const y0 = 3.6;
  const put = (g: THREE.BufferGeometry, x: number, y: number) => g.translate(x, y, 0);
  b.add(put(prism([{ y: 0, hw: 3.6, hd: 2.1, c: 0.5 }, { y: 2.3, hw: 3.3, hd: 1.9, c: 0.7 }, { y: 3.2, hw: 2.6, hd: 1.4, c: 0.6 }]), -2.4, y0), 'gold', { m, cast: true });
  b.add(put(prism([{ y: 0, hw: 1.7, hd: 2.2, c: 0.5 }, { y: 3.6, hw: 1.5, hd: 2.0, c: 0.7 }, { y: 4.0, hw: 1.0, hd: 1.4, c: 0.4 }]), -5.0, y0), 'gold', { m, cast: true });
  for (const z of [-1.2, 1.2]) b.add(block(4.6, 1.0, 0.95, 0.2).translate(4.0, y0, z), 'gold', { m });
  b.add(put(prism([{ y: 0, hw: 1.4, hd: 1.8, c: 0.4 }, { y: 3.4, hw: 1.1, hd: 1.5, c: 0.4 }]), 2.3, y0), 'gold', { m, cast: true });
  b.add(put(prism([{ y: 0, hw: 1.2, hd: 2.0, c: 0.2 }, { y: 2.0, hw: 1.15, hd: 1.6, c: 0.2 }, { y: 3.2, hw: 0.9, hd: 0.9, c: 0.2 }, { y: 3.5, hw: 0.5, hd: 0.5, c: 0.1 }]), 2.4, y0 + 3.0), 'gold', { m });
  b.add(block(0.9, 2.0, 1.25, 0.2).translate(3.5, y0 + 3.7, 0), 'gold', { m });
  b.add(block(1.0, 0.5, 4.2, 0.1).translate(2.4, y0 + 3.2, 0), 'granite', { m });
}

// A seated figure, reduced to pure geometry: a throne, the shins and the lap, the hands flat on the knees, a torso
// widening to square shoulders, a head under a headcloth whose lappets fall to the chest, and a beard. Dark granite,
// the headcloth in gold. It faces the thing's +z. Built 29 high, scaled to its height.
export function seated(b: Parts, p: Put, tall: number, seed: number): void {
  const s = tall / 29, m = mat(p, s), o = { m, cast: true, seed };
  b.add(battered(14, 16, 2.6, 0.03, { cornice: 0.6, c: 0.2 }), 'lime', o);
  b.add(block(12, 15.5, 11.5, 0.3, 2.6).translate(0, 0, -2.2), 'bronze', o);
  for (const x of [-2.3, 2.3]) b.add(prism([{ y: 2.6, hw: 1.9, hd: 2.1, c: 0.45 }, { y: 12.4, hw: 1.7, hd: 1.9, c: 0.5 }]).translate(x, 0, 5.2), 'bronze', o);
  for (const x of [-2.3, 2.3]) b.add(block(3.8, 1.0, 2.8, 0.3, 2.6).translate(x, 0, 6.2), 'bronze', { m });
  b.add(block(9.0, 3.0, 9.6, 0.7, 11.8).translate(0, 0, 2.4), 'bronze', o);
  for (const x of [-2.4, 2.4]) b.add(block(1.8, 0.9, 4.6, 0.3, 14.8).translate(x, 0, 4.4), 'bronze', { m });
  b.add(prism([{ y: 14.8, hw: 3.4, hd: 2.4, c: 0.6 }, { y: 19.5, hw: 4.6, hd: 2.3, c: 0.7 }, { y: 21.4, hw: 4.7, hd: 2.2, c: 0.9 }, { y: 22.0, hw: 2.0, hd: 1.8, c: 0.5 }]).translate(0, 0, -0.8), 'bronze', o);
  b.add(block(3.0, 4.2, 3.2, 0.5, 21.6).translate(0, 0, -0.4), 'bronze', o);
  b.add(block(1.1, 1.8, 0.9, 0.2, 20.2).translate(0, 0, 1.3), 'gold', { m });
  b.add(prism([{ y: 23.6, hw: 3.6, hd: 2.4, c: 0.3 }, { y: 25.6, hw: 2.9, hd: 2.3, c: 0.6 }, { y: 27.6, hw: 2.0, hd: 1.9, c: 0.8 }, { y: 28.4, hw: 1.2, hd: 1.2, c: 0.5 }]).translate(0, 0, -0.6), 'gold', o);
  for (const x of [-2.6, 2.6]) b.add(prism([{ y: 18.6, hw: 0.9, hd: 0.45, c: 0.1 }, { y: 24.2, hw: 1.0, hd: 0.45, c: 0.1 }]).translate(x, 0, 0.9), 'gold', { m });
  b.add(block(1.0, 0.8, 0.7, 0.2, 28.4).translate(0, 0, 1.0), 'gold', { m });
}

// A pylon gate: two battered towers of pale stone either side of a lower gateway, whose bronze doors are a hangar's,
// slid a crack apart onto a lit hall, under a winged disc. It faces +z.
export function pylon(b: Parts, lamps: Lamp[], p: Put, o: { tower: number; gate: number; deep: number; tall: number; batter: number; door: number }): void {
  const m = mat(p), off = o.gate / 2 + o.tower / 2;
  for (const x of [-off, off]) b.add(battered(o.tower, o.deep, o.tall + 3, o.batter, { dBatter: 0.05, cornice: 3.2 }).translate(x, -3, 0), 'lime', { m, cast: true, seed: x });
  const gd = o.deep * 0.72, gh = o.door + 6;
  b.add(battered(o.gate + 1.2, gd, gh, 0, { cornice: 2.2 }), 'lime', { m, cast: true, seed: 3 });
  const front = gd / 2;
  // The door's frame stands proud of the gateway, so the doors are set deep within it.
  for (const sx of [-1, 1]) b.add(block(1.8, o.door + 0.6, 2.4, 0.15).translate(sx * (o.gate / 2 - 0.7), 0, front + 1.2), 'lime', { m, cast: true, seed: 7 });
  b.add(battered(o.gate + 1.6, 2.6, 2.4, 0, { cornice: 1.0 }).translate(0, o.door + 0.6, front + 1.2), 'lime', { m, seed: 9 });
  // The doorway is a recess in the gateway: dark jambs, the two leaves set back, and the crack of light between them.
  const leaf = o.gate / 2 - 1.4;
  for (const sx of [-1, 1]) b.add(block(leaf, o.door - 0.4, 0.7, 0.08).translate(sx * (leaf / 2 + 0.35), 0, front + 0.36), 'dark', { m });
  b.add(block(o.gate - 1.2, 0.9, 1.0, 0.1, o.door - 0.4).translate(0, 0, front + 0.4), 'dark', { m });
  b.add(block(0.9, o.door - 1.2, 0.2, 0, 0).translate(0, 0, front + 0.62), 'gate', { m, v: (q) => Math.min(1, Math.max(0, q.y / o.door)) });
  // Ribs on the leaves: a hangar door's, in a sharper metal than the stone.
  for (const sx of [-1, 1]) for (let i = 1; i < 5; i++) b.add(block(leaf - 0.6, 0.28, 0.3, 0.05, (o.door * i) / 5).translate(sx * (leaf / 2 + 0.35), 0, front + 0.8), 'copper', { m });
  // The winged disc over the doors.
  const dy = o.door + 2.6;
  b.add(new THREE.CylinderGeometry(1.7, 1.7, 0.6, 24).rotateX(Math.PI / 2).translate(0, dy, front + 0.4), 'gold', { m });
  for (const sx of [-1, 1]) {
    const w = prism([{ y: -0.3, hw: 2.6, hd: 0.55 }, { y: 0.3, hw: 2.6, hd: 0.55 }]);
    w.rotateX(Math.PI / 2).rotateZ(sx * 0.12).translate(sx * 4.2, dy + 0.2, front + 0.3);
    b.add(w, 'copper', { m });
  }
  lamps.push({ at: world(p, 0, 3, front + 2), power: 0.9, reach: far(p, 9), heat: 0.7 });
  // The flagstaffs of a pylon, here masts of bronze in the recesses either side of the gateway, each with a light.
  for (const sx of [-1, 1]) {
    const x = sx * (o.gate / 2 + 2.2);
    b.add(new THREE.CylinderGeometry(0.28, 0.4, o.tall + 9, 6).translate(x, (o.tall + 9) / 2, o.deep / 2 * 0.95 + 0.6), 'bronze', { m, cast: true });
    b.add(block(0.7, 0.7, 0.7, 0.05, o.tall + 9).translate(x, 0, o.deep / 2 * 0.95 + 0.6), 'lamp', { m });
    lamps.push({ at: world(p, x, o.tall + 9.3, o.deep / 2 + 0.6), power: 0.35, reach: far(p, 6), heat: 0.8 });
  }
}

// A palm whose crown is copper and bronze, as a grove is on this world: a slim ringed trunk and a crown of fronds,
// each a long thin blade drooping from the top, seen from the air as a star.
export function palm(b: Parts, p: Put, tall: number, seed: number): void {
  const m = mat(p), k = 1.1 + 0.6 * ((Math.sin(seed * 91.7) + 1) / 2);
  b.add(new THREE.CylinderGeometry(0.28, 0.45, tall, 6).translate(0, tall / 2, 0), 'bronze', { m, seed });
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + seed, len = 4.2 * k;
    const g = new THREE.BufferGeometry();
    const pts = [[0, 0, 0], [len * 0.45, 0.5, 0.55], [len, -1.4, 0], [len * 0.45, 0.5, -0.55]];
    g.setAttribute('position', new THREE.Float32BufferAttribute([...pts[0], ...pts[1], ...pts[2], ...pts[0], ...pts[2], ...pts[3]], 3));
    g.computeVertexNormals();
    g.rotateY(a).translate(0, tall, 0);
    b.add(g, 'frond', { m, seed: seed + i });
  }
}
