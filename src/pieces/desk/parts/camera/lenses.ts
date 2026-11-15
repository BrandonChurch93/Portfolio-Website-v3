import { at, rbox, xf } from '../../../../world/build';
import { bandUV, element, faceUV, flatRing, iris, pebble, ribs, turned, type Put } from './forms';
import type { CameraMaterials } from './materials';

// The two lenses and the cap, each turned about its own y, in millimetres. A lens's y = 0 is the face of its mount.
// mid is the angle round the barrel the visitor sees most of, so the engraving faces them; dir and flip say which
// way it reads from there.

export interface Facing { mid: number; dir: 1 | -1; flip: boolean; front: boolean }

// The fast prime on the body: 50 mm at f/1.2, 79 mm across, a broad ribbed focus ring, an aperture ring with its
// stops, a distance scale, a copper ring near the front, and a deep front element behind its filter thread.
export const PRIME = { length: 80.8, r: 39.6 } as const;

export function prime(p: Put, m: CameraMaterials, f: Facing): void {
  const B = (pts: [number, number][]) => turned(pts, 96);
  // The mount's flange.
  p.add(turned([[29, 0], [31.6, 0], [32.0, 0.4], [32.0, 1.2], [31.6, 1.6]], 80), m.bronze);
  // The rear barrel, with a fine groove before the aperture ring.
  p.add(B([[31.6, 1.6], [32.8, 1.6], [33.6, 2.4], [33.6, 9.0], [33.0, 9.6], [33.0, 10.2], [34.6, 10.2]]), m.barrel);
  // The aperture ring: its stops, then a band of scallops to turn it by.
  p.add(bandUV(turned([[34.6, 10.2], [35.2, 10.8], [35.2, 16.2]], 96), 'apert', 10.8, 16.2, f.mid, f.dir, f.flip), m.barrel);
  p.add(ribs(turned([[35.2, 16.2], [35.7, 16.6], [35.7, 21.4], [35.2, 21.8], [34.2, 21.8]], 96), 40, 0.9, 0.55), m.ribMetal);
  p.add(B([[34.2, 21.8], [34.0, 22.2], [34.0, 23.2], [35.6, 23.2], [35.9, 23.6]]), m.barrel);
  // The fixed band, with the distance scale the focus ring is read against.
  p.add(bandUV(turned([[35.9, 23.6], [35.9, 30.0]], 96), 'dist', 23.6, 30.0, f.mid, f.dir, f.flip), m.barrel);
  p.add(B([[35.9, 30.0], [35.4, 30.4], [35.4, 31.0], [37.6, 31.0]]), m.barrel);
  // The focus ring: broad, its ribs square topped, its ends chamfered plain.
  p.add(ribs(turned([[37.6, 31.0], [38.9, 32.3]], 96), 0, 0), m.ribMetal);
  p.add(ribs(turned([[38.9, 32.3], [38.9, 64.9]], 96), 108, 0.55, 0.32), m.ribMetal);
  p.add(ribs(turned([[38.9, 64.9], [37.6, 66.2], [36.8, 66.2]], 96), 0, 0), m.ribMetal);
  // The front barrel, a copper ring, and the flare to the bezel.
  p.add(B([[36.8, 66.2], [37.2, 66.8], [37.2, 68.8]]), m.barrel);
  p.add(turned([[37.2, 68.8], [37.6, 69.1], [37.6, 70.1], [37.2, 70.4]], 96), m.copper);
  p.add(B([[37.2, 70.4], [37.5, 72.4], [39.0, 78.6], [39.6, 79.3], [39.6, 80.3], [39.2, 80.8]]), m.barrel);
  // The bezel, engraved, and the filter thread inside it.
  p.add(faceUV(flatRing(33.8, 39.2, 80.8, 160), 'bezelA', PRIME.r, f.front), m.barrel);
  p.add(ribs(turned([[33.8, 80.8], [33.6, 80.5], [33.6, 76.4]], 80), 11, 0.35, 0.8, true), m.ribMetal);
  // Deep inside: a step, the wall down to the front element, the element's retaining ring.
  p.add(turned([[33.6, 76.4], [31.6, 76.4], [31.6, 55.0]], 80), m.inside);
  p.add(turned([[31.6, 55.4], [30.2, 55.4], [30.2, 55.0]], 80), m.steel);
  p.glass(element(31.4, 34, 55.0, false, 96), m.glass);
  // Behind it: the flocked inside, a second element, the iris stopped down a little, a deep element behind that.
  p.add(turned([[31.4, 54.6], [27.5, 47], [24.5, 39], [24.5, 28]], 96), m.inside);
  p.glass(element(26.5, 44, 47, false, 48), m.coat);
  for (const g of iris(11, 10.5, 24.6, 39)) p.add(g, m.blade);
  p.glass(element(20, 34, 33, true, 40), m.coat);
  p.add(flatRing(0, 25, 28, 48), m.inside);
}

// A standard zoom standing on its rear cap: longer, two rings, a wide rubber zoom ring with its focal lengths
// beside it, a finer focus ring, a flared front with a hood bayonet.
export const ZOOM = { cap: 16, height: 106.8, r: 43.6 } as const;

export function zoom(p: Put, m: CameraMaterials, f: Facing): void {
  const B = (pts: [number, number][]) => turned(pts, 96);
  // The rear cap it stands on, fluted for the fingers.
  p.add(flatRing(0, 30, 0.02, 64).rotateX(Math.PI).translate(0, 0.04, 0), m.ribRubber);
  p.add(ribs(turned([[30, 0], [32.6, 0.4], [33.4, 1.4], [33.4, 12.6], [32.8, 13.6], [30.6, 14.0]], 96), 24, 1.0, 0.55), m.ribRubber);
  p.add(turned([[30.6, 14.0], [32.4, 14.0], [32.8, 14.4], [32.8, 15.6], [32.4, 16.0]], 80), m.bronze);
  p.add(B([[32.4, 16.0], [36.5, 16.2], [37.2, 17.0], [37.2, 24.6], [36.6, 25.2], [36.2, 25.6]]), m.barrel);
  // The zoom ring, wide rubber.
  p.add(ribs(turned([[36.2, 25.6], [41.0, 25.8], [42.2, 27.0], [42.2, 56.0], [41.0, 57.3], [40.0, 57.5]], 96), 60, 1.1, 0.42), m.ribRubber);
  // The focal lengths it is read against.
  p.add(bandUV(turned([[40.0, 57.5], [40.8, 58.0], [40.8, 65.0]], 96), 'zoom', 58.0, 65.0, f.mid, f.dir, f.flip), m.barrel);
  p.add(B([[40.8, 65.0], [40.4, 65.5], [39.8, 66.0], [39.8, 67.0]]), m.barrel);
  // The focus ring.
  p.add(ribs(turned([[39.8, 67.0], [40.9, 67.3], [41.6, 68.0]], 96), 0, 0), m.ribMetal);
  p.add(ribs(turned([[41.6, 68.0], [41.6, 84.0]], 96), 120, 0.45, 0.32), m.ribMetal);
  p.add(ribs(turned([[41.6, 84.0], [40.9, 84.7], [39.8, 85.0]], 96), 0, 0), m.ribMetal);
  p.add(B([[39.8, 85.0], [40.6, 85.4], [40.6, 87.0]]), m.barrel);
  p.add(turned([[40.6, 87.0], [40.9, 87.2], [40.9, 88.4], [40.6, 88.6]], 96), m.copper);
  p.add(B([[40.6, 88.6], [41.2, 92.0], [43.0, 103.0], [43.6, 103.6], [43.6, 106.3], [43.2, 106.8]]), m.barrel);
  // The hood's bayonet: three small lugs round the front.
  for (let i = 0; i < 3; i++) {
    const a = f.mid + 0.5 + (i / 3) * Math.PI * 2;
    p.add(rbox(9, 1.6, 1.0, 0.4), m.barrel, xf({ p: [Math.sin(a) * 43.8, 104.9, Math.cos(a) * 43.8], r: [0, a, 0] }));
  }
  p.add(faceUV(flatRing(39.4, 43.2, 106.8, 160), 'bezelB', ZOOM.r, f.front), m.barrel);
  p.add(ribs(turned([[39.4, 106.8], [39.4, 102.0]], 80), 13, 0.35, 0.8, true), m.ribMetal);
  p.add(turned([[39.4, 102.0], [37.6, 102.0], [37.6, 95.0]], 80), m.inside);
  p.add(turned([[37.6, 95.4], [36.2, 95.4], [36.2, 95.0]], 80), m.steel);
  p.glass(element(37.4, 80, 95.0, false, 96), m.glass);
  p.add(turned([[37.4, 94.6], [31, 84], [26, 72], [26, 60]], 96), m.inside);
  p.glass(element(30, 46, 84, false, 48), m.coat);
  for (const g of iris(9, 8.5, 26.2, 75)) p.add(g, m.blade);
  p.glass(element(22, 40, 68, true, 40), m.coat);
  p.add(flatRing(0, 26, 59.5, 48), m.inside);
}

// The front cap, lying face up on the mat: a knurled rim, a dished face, two pinch tabs either side of a raised
// middle that carries its size and a made up mark.
export const CAP = { r: 37.5, h: 7 } as const;
// The moulded plastic's fine grain, per millimetre.
const FINE = 3;

export function cap(p: Put, m: CameraMaterials): void {
  p.add(ribs(turned([[30, 0], [36.9, 0], [37.5, 0.6], [37.5, 6.2], [37.0, 6.8], [35.6, 7.0]], 96), 96, 0.4, 0.6), m.ribRubber);
  p.add(pebble(turned([[35.6, 7.0], [34.6, 6.9], [32.0, 6.0], [30.4, 5.5]], 96), FINE, 0.03), m.plastic);
  p.add(faceUV(flatRing(0, 30.4, 5.5, 96), 'cap', CAP.r), m.plastic);
  for (const s of [-1, 1]) {
    // Each tab: a ribbed pad to press, and the slot it moves in.
    p.add(pebble(rbox(7, 2.6, 19, 1.2, 1), FINE, 0.03), m.plastic, at(s * 25.5, 6.2, 0));
    for (let k = 0; k < 5; k++) p.add(pebble(rbox(0.7, 0.6, 14, 0.25, 1), FINE, 0.03), m.plastic, at(s * (23.3 + k * 1.1), 7.6, 0));
    p.add(rbox(1.6, 0.6, 17, 0.3, 1), m.inside, at(s * 21.2, 5.5, 0));
  }
}
