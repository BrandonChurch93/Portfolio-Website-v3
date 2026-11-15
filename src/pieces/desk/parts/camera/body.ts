import * as THREE from 'three';
import { at, interp, loft, rbox, xf, type Section } from '../../../../world/build';
import { circle, rounded, rrect, slab } from '../../../../world/shape';
import { codeUV, DEG, faceUV, pebble, ribs, turned, type Put } from './forms';
import type { CameraMaterials } from './materials';

// The body, in millimetres: x across (the grip at -x, under the right hand), y up from its base, z forward along the
// lens. 130 wide, 76 to its top plate and 97 to the top of the finder, 42 deep without the grip and the eyecup.
export const BODY = { w: 130, h: 76, plate: 58, front: 21, back: -21, hump: 97 } as const;
// Where the lens mounts, on the body's front.
export const MOUNT = { x: 8, y: 42, z: 21 } as const;
// What the visitor's view picks out of it: the body is seen from the front, a little from its left and from above.

const W = BODY.w / 2;
// The skin's pebble and the rubber's finer grain: how many to a millimetre, and how deep.
const SKIN = { scale: 0.8, depth: 0.16 } as const;
const RUBBER = { scale: 2.6, depth: 0.05 } as const;

// The grip, as sections up y: a tall rounded bulge forward of the body that rises a little above the top plate.
const GRIP: Section[] = [
  { y: 0.6, rx: 16.2, rz: 21.0, n: 2.6, ox: -47, oz: 18.5 },
  { y: 4, rx: 17.6, rz: 24.4, n: 2.6, ox: -47, oz: 20.2 },
  { y: 28, rx: 18, rz: 26.2, n: 2.7, ox: -47, oz: 21.2 },
  { y: 50, rx: 17.8, rz: 25.2, n: 2.7, ox: -47, oz: 20.8 },
  { y: 62, rx: 17.4, rz: 23.4, n: 2.7, ox: -47.2, oz: 19.8 },
  { y: 70, rx: 16.8, rz: 21.6, n: 2.8, ox: -47.4, oz: 18.8 },
  { y: 74.5, rx: 15.6, rz: 19.6, n: 2.8, ox: -47.6, oz: 18.0 },
  { y: 77.2, rx: 13.0, rz: 16.4, n: 2.6, ox: -47.8, oz: 17.2 },
  { y: 78.6, rx: 9.0, rz: 11.6, n: 2.4, ox: -48, oz: 16.6 },
  { y: 79.2, rx: 4.0, rz: 5.4, n: 2.2, ox: -48, oz: 16.4 },
];
// Where the skin ends and the painted top of the grip begins.
const SKIN_TOP = 66;

const HUMP: Section[] = [
  { y: 70, rx: 28, rz: 22, n: 5, ox: MOUNT.x, oz: -4.5 },
  { y: 76, rx: 28, rz: 22, n: 5, ox: MOUNT.x, oz: -4.5 },
  { y: 91, rx: 23.4, rz: 16.6, n: 5, ox: MOUNT.x, oz: -8.2 },
  { y: 95.4, rx: 21.8, rz: 15.0, n: 4.6, ox: MOUNT.x, oz: -8.8 },
  { y: 96.6, rx: 20.6, rz: 13.8, n: 4.2, ox: MOUNT.x, oz: -9.0 },
  { y: 97, rx: 19.2, rz: 12.6, n: 4, ox: MOUNT.x, oz: -9.0 },
];

const range = (secs: Section[], y0: number, y1: number, grow = 0): Section[] => {
  const ys = [y0, ...secs.map((s) => s.y).filter((y) => y > y0 && y < y1), y1];
  return ys.map((y) => { const s = interp(secs, y); return { ...s, rx: s.rx + grow, rz: s.rz + grow }; });
};

export function body(p: Put, m: CameraMaterials): void {
  // The body in black paint, in two castings, front and back, meeting at a seam round its sides. Over it the top
  // plate in satin dark steel, a third casting, with its own seam where it sits on them.
  const T = BODY.plate;
  const lower = rounded([[-W, 0, 5.5], [W, 0, 5.5], [W, T - 0.3, 0.6], [-W, T - 0.3, 0.6]]);
  p.add(slab(lower, [], 0.3, BODY.front, 1.5, 2), m.paint);
  p.add(slab(lower, [], BODY.back, -0.3, 1.5, 2), m.paint);
  const top = rounded([[-W, T + 0.3, 0.6], [W, T + 0.3, 0.6], [W, BODY.h, 5.5], [-W, BODY.h, 5.5]]);
  p.add(slab(top, [], BODY.back, BODY.front, 1.2, 2), m.plate);

  // The grip: skin to just under its top, painted above, with a small lip where they meet.
  p.add(pebble(loft(range(GRIP, GRIP[0].y, SKIN_TOP), 96), SKIN.scale, SKIN.depth), m.skin);
  p.add(ribs(loft(range(GRIP, SKIN_TOP - 0.6, GRIP[GRIP.length - 1].y, 0.35), 96, { cap: true }), 0, 0), m.paint);
  const base = new THREE.ShapeGeometry(new THREE.Shape(Array.from({ length: 64 }, (_, i) => { const a = (i / 64) * Math.PI * 2; const s = GRIP[0]; return new THREE.Vector2(s.ox! + Math.cos(a) * s.rx, s.oz! + Math.sin(a) * s.rz); })));
  base.rotateX(Math.PI / 2);
  p.add(pebble(base.translate(0, GRIP[0].y, 0), SKIN.scale, SKIN.depth), m.skin);

  // The skin on the front at the left of the mount, cut round it in a wide arc.
  const panel: THREE.Vector2[] = [];
  const R = 46.5, x1 = W - 3.2, y0 = 5, y1 = BODY.plate - 3;
  for (let i = 0; i <= 40; i++) { const y = y0 + ((y1 - y0) * i) / 40; const dy = y - MOUNT.y; const x = Math.max(MOUNT.x + 27, MOUNT.x + Math.sqrt(Math.max(0, R * R - dy * dy))); panel.push(new THREE.Vector2(x, y)); }
  panel.reverse();
  panel.push(new THREE.Vector2(x1 - 2, y0), new THREE.Vector2(x1, y0 + 2), new THREE.Vector2(x1, y1 - 2), new THREE.Vector2(x1 - 2, y1));
  p.add(pebble(slab(panel, [], BODY.front - 0.1, BODY.front + 0.7, 0.25, 2), SKIN.scale, SKIN.depth), m.skin);
  // And a thumb rest on the back.
  p.add(pebble(slab(rounded(rrect(-46, 66.5, 24, 12, 5)), [], BODY.back - 1.4, BODY.back + 0.2, 0.4, 2), SKIN.scale, SKIN.depth), m.skin);

  // The mount's ring.
  p.add(turned([[29.2, 0], [34.8, 0], [35.4, 0.5], [35.4, 1.0], [34.9, 1.4], [32.1, 1.4]], 96), m.bronze, xf({ p: [MOUNT.x, MOUNT.y, MOUNT.z], r: [Math.PI / 2, 0, 0] }));
  // The lens release, in the metal between the ring and the skin.
  const rel = (a: number, r: number): [number, number] => [MOUNT.x + Math.cos(a) * r, MOUNT.y + Math.sin(a) * r];
  {
    const [x, y] = rel(-18 * DEG, 40.6);
    p.add(turned([[0, 0], [4.6, 0], [4.6, 1.8], [4.2, 2.6], [2.6, 3.0], [0, 3.0]], 48), m.paint, xf({ p: [x, y, BODY.front - 0.2], r: [Math.PI / 2, 0, 0] }));
    p.add(turned([[4.6, 0], [5.6, 0], [5.6, 0.6], [4.7, 0.8]], 48), m.copper, xf({ p: [x, y, BODY.front - 0.2], r: [Math.PI / 2, 0, 0] }));
  }
  // The assist lamp's window, between the mount and the grip.
  p.add(turned([[0, 0], [3.4, 0], [3.4, 0.6], [2.8, 1.2], [0, 1.3]], 40), m.paint, xf({ p: [-21.5, 66, BODY.front - 0.1], r: [Math.PI / 2, 0, 0] }));
  p.add(turned([[0, 1.1], [2.5, 1.1], [0, 1.35]], 40), m.gloss, xf({ p: [-21.5, 66, BODY.front - 0.1], r: [Math.PI / 2, 0, 0] }));
  // The model code, a made up one.
  {
    p.add(codeUV(new THREE.PlaneGeometry(14, 3.5)), m.plate, at(MOUNT.x + 38, 70.5, BODY.front + 0.05), false);
  }

  // The finder's hump, its hot shoe, the eyecup and its window at the back.
  p.add(ribs(loft(HUMP, 96, { cap: true }), 0, 0), m.plate);
  {
    const s = p.sub(at(MOUNT.x, BODY.hump - 0.05, -9));
    s.add(rbox(21, 1.0, 19, 0.3), m.paint, at(0, 0.5, 0));
    for (const sx of [-1, 1]) {
      s.add(rbox(1.0, 2.6, 19, 0.3), m.steel, at(sx * 10.2, 1.3, 0));
      s.add(rbox(3.0, 0.7, 19, 0.25), m.steel, at(sx * 9.0, 2.6, 0));
    }
    s.add(rbox(18, 2.4, 1.0, 0.3), m.steel, at(0, 1.3, -9.4));
    for (let k = 0; k < 4; k++) s.add(new THREE.CylinderGeometry(0.75, 0.75, 0.3, 16), m.copper, at(-3 + k * 2, 1.1, 1 + (k % 2) * 2));
  }
  const cup = rounded(rrect(MOUNT.x, 86, 46, 32, 9)), hole = rounded(rrect(MOUNT.x, 86, 30, 19, 5));
  p.add(pebble(slab(cup, [hole], -34, -23.5, 1.4, 2), RUBBER.scale, RUBBER.depth), m.rubber);
  p.add(slab(hole, [], -28.5, -27.8, 0.2, 1), m.gloss);

  // Dials on the top plate: the mode dial behind the grip and a second at the other end, each with a knurled
  // bronze rim and its marks engraved on its top.
  const dial = (x: number, z: number, region: 'mode' | 'iso', lock: boolean, index: [number, number]) => {
    const d = p.sub(at(x, BODY.h - 0.2, z));
    d.add(turned([[10.6, 0], [13.6, 0], [13.6, 1.0], [13.0, 1.4], [12.9, 1.4]], 96), m.paint);
    d.add(ribs(turned([[12.9, 1.4], [13.3, 1.8], [13.3, 6.4], [12.9, 6.8]], 80), 72, 0.55, 0.45), m.bronze);
    d.add(turned([[12.9, 6.8], [12.6, 6.8], [12.6, 7.6], [12.0, 8.2]], 96), m.barrel);
    d.add(faceUV(new THREE.CircleGeometry(12.0, 96).rotateX(-Math.PI / 2).translate(0, 8.2, 0), region, 13), m.barrel);
    if (lock) d.add(turned([[3.9, 8.1], [3.9, 9.8], [3.5, 10.4], [0, 10.6]], 48), m.paint);
    // Its index, a copper tick on the plate in front of it.
    d.add(rbox(0.9, 0.3, 2.6, 0.12), m.copper, xf({ p: [Math.sin(index[0]) * index[1], 0.3, Math.cos(index[0]) * index[1]], r: [0, index[0], 0] }));
  };
  dial(-37, -8.5, 'mode', true, [Math.PI / 2, 15.8]);
  dial(50, -5, 'iso', false, [0, 15.8]);

  // The shutter release on the grip's top, in the collar that switches the camera on, and the front dial under it.
  {
    const s = p.sub(xf({ p: [-47.6, 76.6, 29], r: [11 * DEG, 0, 0] }));
    s.add(ribs(turned([[5.8, 0], [10.6, 0], [11.0, 0.4], [11.0, 2.6], [10.6, 3.0], [6.4, 3.0], [6.2, 2.4]], 80), 40, 0.45, 0.5), m.paint);
    s.add(rbox(5, 1.8, 6, 0.8), m.paint, at(6.5, 1.5, 9.5));
    s.add(turned([[5.4, 2.4], [5.4, 4.4], [5.0, 5.2], [3.6, 5.7], [0, 5.5]], 72), m.bronze);
  }
  p.add(ribs(turned([[0, -2.6], [8.6, -2.6], [9.0, -2.2], [9.0, 2.2], [8.6, 2.6], [0, 2.6]], 96), 44, 0.6, 0.5), m.ribMetal, at(-47.4, 70.2, 38.6));

  // The strap lugs and their split rings.
  for (const sx of [-1, 1]) {
    const lug = rounded(rrect(sx * (W + 3.6), 66, 8, 11, 2.6));
    p.add(slab(lug, [circle(sx * (W + 4.4), 66, 2.2, 32)], -8.4, -3.6, 0.6, 2), m.paint);
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * (W + 4.4), 66.9, -11.5), new THREE.Vector3(sx * (W + 4.4), 67.0, -6), new THREE.Vector3(sx * (W + 4.4), 66.9, -0.5),
      new THREE.Vector3(sx * (W + 3.4), 61.0, -3.0), new THREE.Vector3(sx * (W + 2.4), 56.8, -6), new THREE.Vector3(sx * (W + 3.4), 61.0, -9.0),
    ], true, 'centripetal');
    p.add(new THREE.TubeGeometry(path, 48, 0.75, 8, true), m.bronze);
  }

  // The doors over the ports on the left side, rubber with a notch to open them by.
  const side = (o: THREE.Vector2[], x0: number, x1: number) => slab(o, [], x0, x1, 0.25, 2).rotateY(Math.PI / 2);
  p.add(pebble(side(rounded(rrect(3, 32, 24, 28, 3)), W - 0.2, W + 0.6), RUBBER.scale, RUBBER.depth), m.rubber);
  p.add(pebble(side(rounded(rrect(3, 55.5, 24, 10, 3)), W - 0.2, W + 0.6), RUBBER.scale, RUBBER.depth), m.rubber);
  p.add(rbox(0.6, 1.4, 6, 0.3), m.inside, at(W + 0.55, 46.2, -3));

  // The back: the screen in its frame, the buttons beside it, a small rear dial.
  p.add(slab(rounded(rrect(6, 40, 80, 56, 3)), [], BODY.back - 2.4, BODY.back + 0.2, 0.6, 2), m.paint);
  p.add(slab(rounded(rrect(6, 40, 76, 52, 2)), [], BODY.back - 2.9, BODY.back - 2.3, 0.15, 1), m.gloss);
  for (const [x, y, r] of [[-44, 56, 3.4], [-44, 44, 3.4], [-44, 32, 3.4], [-54, 22, 3.0], [-44, 20, 5.8]] as [number, number, number][]) {
    p.add(turned([[0, 0], [r, 0], [r, 1.6], [r - 0.4, 2.2], [0, 2.3]], 40), m.paint, xf({ p: [x, y, BODY.back], r: [-Math.PI / 2, 0, 0] }));
  }
  p.add(ribs(turned([[0, -2.4], [7.6, -2.4], [8.0, -2.0], [8.0, 2.0], [7.6, 2.4], [0, 2.4]], 72), 36, 0.5, 0.5), m.ribMetal, at(-52, 74.2, BODY.back - 3));
}
