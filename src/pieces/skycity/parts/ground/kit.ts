import * as THREE from 'three';
import { type Builder, seeded } from '../../../../world/build';
import { bend } from '../../layout';

// What everything the ground makes shares: bearings and places on the map, what a made thing is drawn as, and how a
// thing built flat on the map is laid over the dome.

export const D2R = Math.PI / 180;
export const polar = (deg: number, r: number) => new THREE.Vector2(Math.sin(deg * D2R) * r, Math.cos(deg * D2R) * r);
export const bearing = (x: number, z: number) => ((Math.atan2(x, z) / D2R) % 360 + 360) % 360;
export const gap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
// Whether a bearing is on the half of the world that is seen, with the limbs and a little past them.
export const seen = (deg: number, wide = 128) => gap(deg, 0) < wide;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// The cell attribute every made thing carries: what it is made of and how it is lit. The made material reads it.
//   stone: pale warm stone in courses. carved: the same with marks cut in a cartouche (y the marks' seed, z how many
//   along, w down). dark: soot black. light: x on the ramp, y how strong, w how it moves (0 steady, 1 breathes, 2 a
//   beacon's slow blink, its fraction a phase). steel: near black structure. copper, bronze, gold: polished metals.
//   bronzeDeep: dark bronze. glass: dark glass. slate: dark stone in panels. cornice: polished bronze fluted with
//   upright leaves. rock: broken rock, the planet's crust. granite: dark polished stone, as the colossi are cut from.
//   bark: a dead tree's bark, grey and split along its length. soil: earth with stones in it, torn up with roots.
//   mesa: the land's great rock, laid in beds of many tones, streaked dark where water ran down it; y a seed.
//   water: still or running; y how broken it is where it falls, z how far out from a lake's middle, w 1 if it runs.
export const KIND = { stone: 0, steel: 1, copper: 2, dark: 3, light: 4, carved: 5, bronze: 6, glass: 7, slate: 8, gold: 9, bronzeDeep: 10, cornice: 11, rock: 12, granite: 13, bark: 14, soil: 15, mesa: 16, water: 17 } as const;

// Marks a geometry as made of a kind, and gives it a coordinate along its faces and up them in its own frame, before
// it is placed, so stone courses and cut marks stay on the thing however it lies.
export function tag(g: THREE.BufferGeometry, k: number, a = 0, b = 0, c = 0): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g;
  const p = out.getAttribute('position'), n = p.count, cell = new Float32Array(n * 4), uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    cell[i * 4] = k; cell[i * 4 + 1] = a; cell[i * 4 + 2] = b; cell[i * 4 + 3] = c;
    uv[i * 2] = p.getX(i) + p.getZ(i); uv[i * 2 + 1] = p.getY(i);
  }
  out.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (!out.getAttribute('normal')) out.computeVertexNormals();
  return out;
}

// Puts a tagged geometry built at the origin onto the map with m (in the map's own space, y up from the ground),
// then lays it over the dome. For what lies on the ground or stands low on it.
export function flat(b: Builder, mat: THREE.Material, g: THREE.BufferGeometry, m?: THREE.Matrix4): void {
  const h = g.clone();
  if (m) h.applyMatrix4(m);
  b.add(bend(h), mat);
}

// Puts a tagged geometry into the frame with m, which already stands it on the dome (seat). For what stands tall.
export function stand(b: Builder, mat: THREE.Material, g: THREE.BufferGeometry, m: THREE.Matrix4): void {
  b.add(g, mat, m);
}

// Points along an arc of the map at a radius, from one bearing to another, no further apart than step.
export function arc(r: number, from: number, to: number, step = 3): THREE.Vector2[] {
  const len = (((to - from) % 360) + 360) % 360 || 360, n = Math.max(2, Math.ceil((len * D2R * r) / step));
  return Array.from({ length: n + 1 }, (_, i) => polar(from + (len * i) / n, r));
}
// Points along a line of the map, no further apart than step.
export function line(a: THREE.Vector2, b: THREE.Vector2, step = 3): THREE.Vector2[] {
  const n = Math.max(1, Math.ceil(a.distanceTo(b) / step));
  return Array.from({ length: n + 1 }, (_, i) => a.clone().lerp(b, i / n));
}

// A section, across and up, swept along a path on the map. The section's first point is joined to its last. Built
// flat on the map: lay it over the dome with flat.
export function sweep(sec: [number, number][], path: THREE.Vector2[], ends = true): THREE.BufferGeometry {
  const pos: number[] = [];
  const side = path.map((p, i) => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const d = b.clone().sub(a).normalize();
    return new THREE.Vector2(-d.y, d.x);
  });
  const at = (i: number, j: number): [number, number, number] => {
    const [s, y] = sec[j % sec.length], p = path[i], n = side[i];
    return [p.x + n.x * s, y, p.y + n.y * s];
  };
  for (let i = 0; i + 1 < path.length; i++) for (let j = 0; j < sec.length; j++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  if (ends) {
    const cap = (i: number, flip: boolean) => {
      for (let j = 1; j + 1 < sec.length; j++) {
        const a = at(i, 0), b = at(i, j), c = at(i, j + 1);
        if (flip) pos.push(...a, ...c, ...b); else pos.push(...a, ...b, ...c);
      }
    };
    cap(0, false);
    cap(path.length - 1, true);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// A smooth number round the circle, from about -1 to 1, the same on every call for one seed.
export function ringNoise(seed: number, terms: [number, number][]): (deg: number) => number {
  const r = seeded(seed), ph = terms.map(() => r() * Math.PI * 2);
  return (deg: number) => { let s = 0; terms.forEach(([f, a], i) => { s += a * Math.sin(f * deg * D2R + ph[i]); }); return s; };
}
