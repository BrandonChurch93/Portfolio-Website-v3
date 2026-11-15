import * as THREE from 'three';
import { CORE, DEBRIS, HEART, TEAR, VENTS, drawn } from '../../layout';
import { type V3, add, cross, len, mul, sub, unit } from './hull';

// How each piece moves, worked out from the clock alone, so a frozen frame is always the same picture. Every piece
// is a point that runs round a circle (a ring round the world's upright for one in orbit, a circle a unit or two
// across for one that holds its place), turned by a slow spin about an axis of its own. One that holds its place
// does not spin: one face of it stays turned to the core. The shader does the same sum (MOVE_GLSL), so the many
// small pieces cost nothing on the processor.

export const MODE = { orbit: 0, hold: 1, tumble: 2 } as const;
export type Mode = (typeof MODE)[keyof typeof MODE];

export interface Move {
  c: V3; rho: number;        // the circle's middle and how far round it the piece runs
  u: V3; th0: number;        // the circle's first way, and where on it the piece starts, in radians
  v: V3; om: number;         // its second way, and how fast the piece goes round it, in radians a second
  axis: V3; w: number;       // the spin's axis and its rate
  q0: [number, number, number, number]; // how it is turned before the spin
  scale: number; seed: number; ph: number; mode: Mode;
}

// Per instance, six four-vectors: the circle's middle and size, its two ways with the start and the rate, the spin,
// the turn, and the scale, a seed, the spin's start and the way it moves.
export const MOVE_ATTRS = ['iC', 'iU', 'iV', 'iS', 'iQ', 'iK'] as const;
export function packMove(m: Move): number[][] {
  return [[...m.c, m.rho], [...m.u, m.th0], [...m.v, m.om], [...m.axis, m.w], [...m.q0], [m.scale, m.seed, m.ph, m.mode]];
}

export const MOVE_GLSL = /* glsl */ `
vec3 dRot(vec4 q, vec3 v){ return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
vec4 dMul(vec4 a, vec4 b){ return vec4(a.w * b.xyz + b.w * a.xyz + cross(a.xyz, b.xyz), a.w * b.w - dot(a.xyz, b.xyz)); }
void dMove(float t, out vec4 q, out vec3 at){
  float th = iU.w + iV.w * t;
  at = iC.xyz + iC.w * (cos(th) * iU.xyz + sin(th) * iV.xyz);
  float a = 0.5 * (iS.w * t + iK.z);
  q = dMul(vec4(iS.xyz * sin(a), cos(a)), iQ);
}`;

const qv = new THREE.Quaternion(), qs = new THREE.Quaternion(), tv = new THREE.Vector3();
// Where a piece is and how it is turned at a time, as the shader has it.
export function moveAt(m: Move, t: number, q = new THREE.Quaternion()): { at: V3; q: THREE.Quaternion } {
  const th = m.th0 + m.om * t;
  const at = add(m.c, mul(add(mul(m.u, Math.cos(th)), mul(m.v, Math.sin(th))), m.rho));
  const a = 0.5 * (m.w * t + m.ph);
  qs.set(m.axis[0] * Math.sin(a), m.axis[1] * Math.sin(a), m.axis[2] * Math.sin(a), Math.cos(a));
  q.copy(qs).multiply(qv.set(...m.q0));
  return { at, q };
}

const quat = (q: THREE.Quaternion): [number, number, number, number] => [q.x, q.y, q.z, q.w];
const randomTurn = (r: () => number) => {
  const u1 = r(), u2 = r() * Math.PI * 2, u3 = r() * Math.PI * 2;
  return new THREE.Quaternion(Math.sqrt(1 - u1) * Math.sin(u2), Math.sqrt(1 - u1) * Math.cos(u2), Math.sqrt(u1) * Math.sin(u3), Math.sqrt(u1) * Math.cos(u3));
};
const randomAxis = (r: () => number): V3 => { const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z); return [s * Math.cos(a), s * Math.sin(a), z]; };

// A ring round the world's upright: its radius, the height of its middle, how far its near side dips below its far
// side and how far its right side rises over its left, in radians.
export interface Ring { r: number; y: number; dip: number; lean: number; om: number }
export function orbit(ring: Ring, th0: number, r: () => number, o: { scale: number; seed: number; spin: number }): Move {
  const e = new THREE.Quaternion().setFromEuler(new THREE.Euler(ring.dip, 0, ring.lean));
  const u = tv.set(1, 0, 0).applyQuaternion(e).toArray() as V3, v = tv.set(0, 0, 1).applyQuaternion(e).toArray() as V3;
  return { c: [0, ring.y, 0], rho: ring.r, u, th0, v, om: ring.om, axis: randomAxis(r), w: o.spin, q0: quat(randomTurn(r)), scale: o.scale, seed: o.seed, ph: r() * 6.28, mode: MODE.orbit };
}

// A ring round the stream's fall, under the core.
export function eddy(at: V3, rad: number, om: number, tilt: number, r: () => number, o: { scale: number; seed: number; spin: number }): Move {
  const e = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt * (r() - 0.5), 0, tilt * (r() - 0.5)));
  const u = tv.set(1, 0, 0).applyQuaternion(e).toArray() as V3, v = tv.set(0, 0, 1).applyQuaternion(e).toArray() as V3;
  return { c: at, rho: rad, u, th0: r() * 6.28, v, om, axis: randomAxis(r), w: o.spin, q0: quat(randomTurn(r)), scale: o.scale, seed: o.seed, ph: r() * 6.28, mode: MODE.orbit };
}

// Holding its place with one face, `face` in its own frame, turned to the core, and turned about that face by
// `roll`. It drifts round a circle so small it reads as still.
export function hold(at: V3, face: V3, roll: number, r: () => number, o: { scale: number; seed: number }): Move {
  const to = unit(sub([HEART[0], HEART[1], HEART[2]], at));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...unit(face)), new THREE.Vector3(...to));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...unit(face)), roll));
  const side = unit(cross(to, [0, 1, 0]));
  return { c: at, rho: 0.8 + 0.8 * r(), u: side, th0: r() * 6.28, v: unit(cross(side, to)), om: 0.05 + 0.04 * r(), axis: [0, 1, 0], w: 0, q0: quat(q), scale: o.scale, seed: o.seed, ph: 0, mode: MODE.hold };
}

export function tumble(at: V3, rate: number, r: () => number, o: { scale: number; seed: number }): Move {
  return { c: at, rho: 1 + 2 * r(), u: [1, 0, 0], th0: r() * 6.28, v: unit([0, 0.3, 1]), om: 0.03 + 0.03 * r(), axis: randomAxis(r), w: rate * (r() < 0.5 ? -1 : 1), q0: quat(randomTurn(r)), scale: o.scale, seed: o.seed, ph: r() * 6.28, mode: MODE.tumble };
}

// Where the frame keeps a piece out of, for a piece reaching `bound` from its middle. The rock: inside about 680 of
// the upright there is rock above TEAR.low. The core: never within 60 of its surface. Its disc as the page sees it:
// only the smallest may cross in front of it. And the bounds of DEBRIS, with the foot kept for the small.
export const ROCK = { reach: 690, under: TEAR.low - 6 } as const;
export const SMALL = 8;
const CORE_DRAWN = drawn(HEART[0], HEART[1], HEART[2]);
export function clear(p: V3, bound: number): boolean {
  const far = Math.hypot(p[0], p[2]);
  if (p[1] - bound < DEBRIS.low || p[1] + bound > DEBRIS.high || far + bound > DEBRIS.far) return false;
  if (far < ROCK.reach + bound && p[1] + bound > ROCK.under) return false;
  if (len(sub(p, [HEART[0], HEART[1], HEART[2]])) < CORE.r + 60 + bound) return false;
  if (bound > SMALL && p[2] > -60) {
    const [x, y] = drawn(p[0], p[1], p[2]);
    if (Math.hypot(x - CORE_DRAWN[0], y - CORE_DRAWN[1]) < CORE.r + bound + 10) return false;
  }
  if (bound > 6 && p[1] < DEBRIS.low + 150) return false;
  return true;
}

// The streams that leave the torn face fall straight down the page from the vents. A large piece that holds or
// tumbles under one sat on the end of its line like a pin on a board, so none is put there. One in orbit only passes.
const FALLS_DRAWN = VENTS.map((v) => drawn(v[0], v[1], v[2]));
// About how far down the page a vent's stream falls before it is spent.
const FALL = 300;
function underFall(p: V3, bound: number): boolean {
  const [x, y] = drawn(p[0], p[1], p[2]);
  return FALLS_DRAWN.some(([vx, vy]) => Math.abs(x - vx) < bound + 24 && y > vy - bound && y < vy + FALL + bound + 40);
}

// Whether a piece stays clear for the whole of its path.
export function clearAlways(m: Move, bound: number): boolean {
  if (m.mode !== MODE.orbit && bound > SMALL && underFall(m.c, bound)) return false;
  const steps = m.mode === MODE.orbit ? 96 : 8;
  for (let i = 0; i < steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const p = add(m.c, mul(add(mul(m.u, Math.cos(th)), mul(m.v, Math.sin(th))), m.rho));
    if (!clear(p, bound)) return false;
  }
  return true;
}
