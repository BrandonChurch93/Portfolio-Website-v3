import * as THREE from 'three';
import { DISTRICTS, MONUMENT, PLANET, SPIRE, drawn, lift, lots, within } from '../../layout';
import type { DesignName } from './designs';

// Where each craft is, worked out from the clock alone, in the world's frame. Each flies one long course of its own,
// slowly, at its own depth, built with lift so it follows the curve of the planet, and held in open sky as much as it
// can be: in a still, a craft drawn over the towers or the jungle was taken for one parked on them. The barque high
// over the jungle and the pyramid, turning away behind the city and out over the right limb; the liner level behind the spire;
// the hauler rising up past the torn edge over the right limb and round behind the city; the courier across the front
// of the towers; the dart in a hairpin over the dunes and the Sun disc. A course is flown one way or the other on each
// trip, at a speed of its own, with a pause off the screen between, all from the trip's number, so nothing repeats in
// any time a visitor would watch.

export interface Pose { on: boolean; p: THREE.Vector3; q: THREE.Quaternion; thrust: number }

// A point of a course: a place on the map at a height over the land there, or a point of the frame off the world.
type At = { map: [number, number, number] } | { frame: [number, number, number] };
interface Course { craft: DesignName; at: At[]; speed: number; gap: [number, number]; from: number; clear: number; top: number; bank: number; pitch: number }

export const COURSES: Course[] = [
  {
    craft: 'barque', pitch: 0.08, speed: 11, gap: [6, 18], from: 219, clear: 14, top: 36, bank: 0.12,
    at: [
      { frame: [-1120, 170, 150] }, { map: [-720, 456, 170] }, { map: [-560, 388, 250] }, { map: [-450, 316, 160] }, { map: [-470, 290, -40] },
      { map: [-330, 175, -330] }, { map: [250, 177, -400] }, { map: [560, 330, -220] }, { map: [680, 380, -40] }, { frame: [1120, 150, -20] },
    ],
  },
  {
    craft: 'liner', pitch: 0.06, speed: 9, gap: [8, 20], from: 74, clear: 12, top: 26, bank: 0.08,
    at: [
      { frame: [-1150, 120, -230] }, { map: [-720, 417, -250] }, { map: [-360, 253, -300] }, { map: [0, 205, -320] }, { map: [380, 253, -310] }, { map: [740, 417, -260] }, { frame: [1150, 110, -230] },
    ],
  },
  {
    craft: 'hauler', pitch: 0.1, speed: 10, gap: [8, 22], from: 174, clear: 10, top: 21, bank: 0.12,
    at: [
      { frame: [1100, -160, 60] }, { map: [700, 215, 30] }, { map: [560, 215, -40] }, { map: [440, 215, -150] }, { map: [320, 225, -320] },
      { map: [100, 235, -470] }, { map: [-220, 240, -480] }, { map: [-470, 245, -360] }, { map: [-700, 240, -180] }, { frame: [-1100, -170, -120] },
    ],
  },
  {
    craft: 'courier', pitch: 0.25, speed: 24, gap: [10, 28], from: 297, clear: 8, top: 9, bank: 0.3,
    at: [
      { frame: [-1100, 150, 180] }, { map: [-600, 300, 260] }, { map: [-330, 240, 380] }, { map: [-140, 215, 330] }, { map: [60, 205, 360] },
      { map: [240, 215, 300] }, { map: [420, 230, 280] }, { map: [640, 250, 200] }, { frame: [1100, 120, 160] },
    ],
  },
  {
    craft: 'dart', pitch: 0.45, speed: 26, gap: [14, 36], from: 134, clear: 8, top: 10, bank: 0.35,
    at: [
      { frame: [1100, 200, 60] }, { frame: [760, 205, 120] }, { frame: [560, 212, 200] }, { frame: [400, 196, 250] }, { frame: [310, 186, 200] },
      { frame: [400, 196, 90] }, { frame: [620, 212, 30] }, { frame: [1100, 230, -40] },
    ],
  },
];

// How high the land and what stands on it are at a place on the map, for a course to clear: every roof, the jungle's
// crowns, the temple's pyramid, the Sun disc and the spire. The jungle and the dunes are other hands' work, so their
// heights are taken at their most.
const TALL: Partial<Record<string, number>> = { forest: 185, temple: 165, monument: MONUMENT.tall + 20, dunes: 60, procession: 70 };
const TOPS = lots().map((l) => ({ x: l.x, z: l.z, r: Math.hypot(l.w, l.d) / 2 + 6, top: l.tall * 1.12 + 6 }));
function standing(x: number, z: number): number {
  const r = Math.hypot(x, z), a = (Math.atan2(x, z) * 180) / Math.PI;
  let need = 0;
  for (const d of DISTRICTS) if (r >= d.r0 - 24 && r <= d.r1 + 24 && within(a, d.from - 3, d.to + 3)) need = Math.max(need, TALL[d.kind] ?? 0);
  for (const t of TOPS) if (Math.abs(t.x - x) < t.r && Math.abs(t.z - z) < t.r) need = Math.max(need, t.top);
  if (r < 70) need = Math.max(need, SPIRE.tall + 20);
  return need;
}

const hash = (a: number, b: number, c = 0) => { let s = (Math.imul(a + 1, 2654435761) ^ Math.imul(b + 0x9e37, 2246822519) ^ Math.imul(c + 7, 3266489917)) >>> 0; s ^= s >>> 15; s = Math.imul(s, 2246822507) >>> 0; s ^= s >>> 13; return (s >>> 0) / 4294967296; };

// The courses as curves, each point of one on the map lifted at least as high over what stands there as the craft
// needs, and no higher in the picture than his words allow.
export const CEILING = 250;
const ceilingAt = (z: number, top: number) => {
  const [, line] = drawn(0, CEILING, 0);
  let lo = -1000, hi = 1000;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (drawn(0, m + top, z)[1] < line) hi = m; else lo = m; }
  return lo;
};
export interface Flown { course: Course; curve: THREE.CatmullRomCurve3; len: number }
export function fly(): Flown[] {
  return COURSES.map((c) => {
    const pts = c.at.map((a) => {
      if ('frame' in a) return new THREE.Vector3(...a.frame);
      const [x, h, z] = a.map;
      return lift(x, Math.max(h, standing(x, z) + c.clear), z);
    });
    for (const p of pts) p.y = Math.min(p.y, ceilingAt(p.z, c.top));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    curve.arcLengthDivisions = 400;
    return { course: c, curve, len: curve.getLength() };
  });
}

// Which way is up for a craft: near the world, straight out from the curve of the ground, as everything on it stands;
// far from it, the frame's own up.
const BELOW = new THREE.Vector3(0, -PLANET.r, 0), Y = new THREE.Vector3(0, 1, 0);
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function upAt(p: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  out.copy(p).sub(BELOW);
  const d = out.length();
  return out.divideScalar(Math.max(d, 1e-3)).lerp(Y, smooth(PLANET.r + 100, PLANET.r + 700, d)).normalize();
}

// A trip: when it sets off on the clock, how long it flies, which way, and how fast.
interface Trip { start: number; dur: number; back: boolean; v: number }
function tripAt(f: Flown, i: number, t: number): Trip | null {
  const c = f.course;
  let start = -c.from;
  for (let k = 0; k < 100000; k++) {
    const v = c.speed * (0.9 + 0.2 * hash(i, k, 1)), dur = f.len / v, gap = c.gap[0] + (c.gap[1] - c.gap[0]) * hash(i, k, 2);
    if (t < start + dur) return t >= start ? { start, dur, back: hash(i, k, 3) < 0.5, v } : null;
    start += dur + gap;
    if (t < start) return null;
  }
  return null;
}

const T0 = new THREE.Vector3(), T1 = new THREE.Vector3(), up = new THREE.Vector3(), side = new THREE.Vector3(), m = new THREE.Matrix4(), qr = new THREE.Quaternion();
// Where a craft is at a time, how it is turned, how hard its engines work. Its nose is where it goes. It leans into a
// turn as far as the turn is sharp, and climbs and dives nose first.
export function pose(f: Flown, i: number, t: number, out: Pose): Pose {
  const trip = tripAt(f, i, t);
  if (!trip) { out.on = false; return out; }
  out.on = true;
  let u = (t - trip.start) / trip.dur;
  if (trip.back) u = 1 - u;
  u = Math.min(1, Math.max(0, u));
  f.curve.getPointAt(u, out.p);
  const du = 8 / f.len, sgn = trip.back ? -1 : 1;
  f.curve.getTangentAt(Math.min(1, Math.max(0, u - du * sgn)), T0).multiplyScalar(sgn);
  f.curve.getTangentAt(Math.min(1, Math.max(0, u + du * sgn)), T1).multiplyScalar(sgn);
  const fwd = T0.clone().add(T1).normalize();
  upAt(out.p, up);
  const climb = fwd.dot(up);
  // A large ship keeps its deck near level whatever its course does; a small one points where it goes.
  const lim = Math.sin(f.course.pitch);
  if (Math.abs(climb) > lim) {
    const flatF = fwd.clone().addScaledVector(up, -climb).normalize();
    fwd.copy(flatF.multiplyScalar(Math.sqrt(1 - lim * lim)).addScaledVector(up, Math.sign(climb) * lim));
  }
  // How sharply it turns about its own up, in radians a unit flown, sets how far it leans: bank is the lean, in
  // radians, on a turn 300 units round.
  const turn = new THREE.Vector3().crossVectors(T0, T1).dot(up) / 16;
  const roll = Math.max(-0.6, Math.min(0.6, -turn * 300 * f.course.bank));
  side.crossVectors(fwd, up).normalize();
  up.crossVectors(side, fwd).normalize();
  m.makeBasis(fwd, up, side);
  out.q.setFromRotationMatrix(m);
  out.q.multiply(qr.setFromAxisAngle(new THREE.Vector3(1, 0, 0), roll));
  out.thrust = 0.55 + 0.35 * smooth(-0.2, 0.4, climb + 0.2);
  return out;
}
