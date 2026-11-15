import * as THREE from 'three';
import type { CraftName } from './craft';
import { HEART, PLANET, SPIRE, lift, lots, relief } from '../../layout';
import { BARQUE, BERTHS, CEILING, D2R, DOOR, FACADE, frame } from './plan';

// Where every craft in the air is, worked out from the clock alone, in the world's frame. Each craft has a lane: a
// run of slots of its own length, and in each slot, from the slot's number, a trip of its own (where it goes, how
// high, how fast, when). So nothing repeats in any time a visitor would see: no two lanes share a length, and no two
// trips share a course.
//   A craft of the port rests on a berth: inside the great door in the rock, on a terrace, or on the harbour's quay. It
//   lifts straight off, levels as it climbs (out through the great door first, if it rests inside), and goes out by
//   one of several courses: round the front of the world, off past the limb, across the far side of the world behind
//   the spire, or out past the torn edge and down among what broke away. It is away a while and comes home by
//   another, nose first.
//   A craft passing flies a low arc over the city round the spire, behind it or in front of it, from one side of the
//   screen to the other, its height over the land kept with lift.

// A craft's pose: whether it is in the air or on its berth (on), where it is, how it is turned, how hard its engines
// work, and how strongly its berth is calling it in, 0 to 1.
export interface Pose { on: boolean; p: THREE.Vector3; q: THREE.Quaternion; thrust: number; call: number }

// Which way is up for a craft: near the world, straight out from the curve of the ground, as everything on it stands;
// far from it, the frame's own up.
const BELOW = new THREE.Vector3(0, -PLANET.r, 0), UP_NEAR = PLANET.r + 140, UP_FAR = PLANET.r + 600;
const tq = new THREE.Quaternion(), tv = new THREE.Vector3();
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function upAt(p: THREE.Vector3, out: THREE.Quaternion): THREE.Quaternion {
  tv.copy(p).sub(BELOW);
  const d = tv.length(), w = 1 - smooth(UP_NEAR, UP_FAR, d);
  tv.divideScalar(Math.max(d, 1e-3)).lerp(Y, 1 - w).normalize();
  return out.setFromUnitVectors(Y, tv);
}
// A pose from which way is up where the craft is, and its heading, pitch and roll against it.
const eu = new THREE.Euler(0, 0, 0, 'YZX'), qe = new THREE.Quaternion();
function turnTo(out: Pose, yaw: number, pitch: number, roll: number): void {
  upAt(out.p, out.q);
  eu.set(roll, yaw, pitch);
  out.q.multiply(qe.setFromEuler(eu));
}

// A lane: the craft that flies it, its slot's length, its seed, its berth if it has one, which way round the spire it
// passes if it has none, and how far its clock is shifted, so that at any moment some are flying. A craft that stays
// never leaves its berth.
type Arc = 'behind' | 'front';
interface Lane { craft: CraftName; slot: number; seed: number; berth?: number; arc?: Arc; from: number; stay?: boolean }
export const LANES: Lane[] = [
  { craft: 'skiff', slot: 131, seed: 11, berth: 0, from: 104 },
  { craft: 'lifter', slot: 239, seed: 23, berth: 1, from: 24 },
  { craft: 'skiff', slot: 149, seed: 37, berth: 2, from: 60 },
  { craft: 'lifter', slot: 1, seed: 0, berth: 3, from: 0, stay: true },
  { craft: 'skiff', slot: 83, seed: 41, arc: 'behind', from: 20 },
  { craft: 'skiff', slot: 109, seed: 53, arc: 'behind', from: 70 },
  { craft: 'lifter', slot: 157, seed: 67, arc: 'behind', from: 40 },
  { craft: 'skiff', slot: 97, seed: 83, arc: 'front', from: 12 },
  { craft: 'skiff', slot: 121, seed: 97, arc: 'front', from: 88 },
];

// How fast a craft goes once it is under way, in units a second, and how many seconds it takes to gather that speed.
const SPEED = { skiff: [34, 46], lifter: [22, 30] } as const;
const RAMP = 4;
// How long a craft takes to lift straight off its berth, or to settle onto it, and how far it lifts.
const RISE = 4;
const LIFT = 10;
// How far off the screen a course begins or ends, in units across.
const OFF = 1000;
// How far over the land and over the city's roofs a craft keeps, at the least.
const CLEAR = 18;
// The ways a craft may leave each berth by, and come home by: 0 off past the limb to the right, 1 across the far
// side of the world behind the spire, 2 round the front of the world, 3 out past the torn edge and down among what
// broke away.
const WAYS = [[2, 0, 2, 3], [1, 0, 2], [1, 0, 1], [0, 3, 0]];

const hash = (a: number, b: number, c = 0) => { let s = (Math.imul(a, 2654435761) ^ Math.imul(b + 0x9e37, 2246822519) ^ Math.imul(c + 7, 3266489917)) >>> 0; s ^= s >>> 15; s = Math.imul(s, 2246822507) >>> 0; s ^= s >>> 13; return (s >>> 0) / 4294967296; };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const Y = new THREE.Vector3(0, 1, 0);

// The citadel's frame on the world, and its turn.
const W = frame(), WQ = new THREE.Quaternion();
W.decompose(new THREE.Vector3(), WQ, new THREE.Vector3());
const inCitadel = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(W);
// The way out through the great door: a point inside it, its middle, and a point out in front of the colossi.
const DOOR_IN = inCitadel(DOOR.x, 14, -2), DOOR_MID = inCitadel(DOOR.x, 16, FACADE.z), DOOR_OUT = inCitadel(DOOR.x, 34, FACADE.z + 70);

// A craft at rest on a berth: where it sits, how it stands, which way it faces against its own up, the way straight
// out from the berth, which way its nose points on the world, and the point it lifts to before it turns away.
interface Dock { p: THREE.Vector3; q: THREE.Quaternion; yaw: number; out: THREE.Vector3; head: THREE.Vector3; up: THREE.Vector3 }
const docks = new Map<string, Dock>();
export function dock(i: number, clear: number): Dock {
  const key = `${i}:${clear}`;
  let d = docks.get(key);
  if (d) return d;
  const b = BERTHS[i], f = b.face * D2R;
  const p = inCitadel(b.at[0], b.at[1] + clear, b.at[2]);
  const q = WQ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y, f));
  const head = new THREE.Vector3(Math.cos(f), 0, -Math.sin(f)).applyQuaternion(WQ);
  const out = Y.clone().applyQuaternion(WQ), up = p.clone().addScaledVector(out, LIFT);
  const hl = head.clone().applyQuaternion(upAt(up, new THREE.Quaternion()).invert());
  d = { p, q, yaw: Math.atan2(-hl.z, hl.x), out, head, up };
  docks.set(key, d);
  return d;
}

// How high the land is under a place of the frame: the dome, and the hills on it.
function groundAt(x: number, z: number): number {
  const far = Math.hypot(x, z);
  if (far >= PLANET.r) return -1e4;
  const a = Math.asin(far / PLANET.r), m = a * PLANET.r, mx = far > 1e-6 ? (x / far) * m : 0, mz = far > 1e-6 ? (z / far) * m : 0;
  return PLANET.r * Math.cos(a) - PLANET.r + relief(mx, mz);
}

// A course out from a berth, by one of four ways, its numbers from h. Coming home is the same kind of course, run
// backward, with its lead from the berth's other side, so a craft comes in nose first and lands facing the way it
// will leave.
function outbound(i: number, clear: number, h: (k: number) => number, side: number): THREE.Vector3[] {
  const d = dock(i, clear), up = d.up, door = BERTHS[i].door;
  const lead = up.clone().addScaledVector(d.head, side * (14 + 8 * h(1))).addScaledVector(d.out, 6 + 6 * h(2));
  const ways = WAYS[i], way = ways[Math.floor(h(0) * ways.length)];
  const start = door ? [up, DOOR_IN, DOOR_MID, DOOR_OUT] : [up, lead];
  if (way === 2) {
    // Round the front of the world in a long arc, low over the forest, and off to the left.
    const y = mix(60, 120, h(3));
    return [...start, lift(260, y, 260), lift(0, y + 10, mix(330, 400, h(4))), lift(-330, y, 300), new THREE.Vector3(-OFF, y - 40, 260)];
  }
  if (way === 0) {
    // Off past the limb to the right, climbing.
    const y = mix(20, 120, h(3)), z = mix(-160, 160, h(4)), last = start[start.length - 1];
    return [...start, new THREE.Vector3(Math.max(last.x + 90, 620), mix(last.y, y, 0.6), mix(last.z, z, 0.5)), new THREE.Vector3(OFF, y + 30 * h(5), z - 40 * h(6))];
  }
  if (way === 1) {
    // Up and back across the far side of the world, behind the spire, and off to the left.
    const y = mix(160, 205, h(3)), z = mix(-340, -260, h(4));
    return [...start, lift(380, mix(110, 150, h(5)), -150), lift(220, y, z + 60), lift(0, y, z), lift(-300, y - 10, z + 40), new THREE.Vector3(-OFF, y - 60, z + 70 * h(9))];
  }
  // Out over the front of the limb and down past the torn edge, among what broke away under the world.
  const z = mix(200, 300, h(3)), last = start[start.length - 1];
  return [...start, new THREE.Vector3(last.x + 130, last.y - 10, last.z + 90), new THREE.Vector3(mix(760, 800, h(4)), -240, z + 40), new THREE.Vector3(mix(820, 880, h(5)), -560, z + 100), new THREE.Vector3(900, -880, z + 160)];
}

// A low arc over the city round the spire, behind it or in front, from one side of the screen to the other: its
// points on the map, at a height over the land, put on the world with lift.
function arcCourse(h: (k: number) => number, arc: Arc): THREE.Vector3[] {
  const dir = h(0) < 0.5 ? 1 : -1, behind = arc === 'behind';
  const r = behind ? mix(260, 420, h(1)) : mix(470, 560, h(1)), y = behind ? mix(120, 175, h(2)) : mix(40, 90, h(2));
  const pts: THREE.Vector3[] = [new THREE.Vector3(-OFF * dir, behind ? y + 20 : y - 30, behind ? -200 : 300)];
  for (let k = 0; k <= 6; k++) {
    const a = (behind ? mix(-112, -248, k / 6) : mix(-55, 55, k / 6)) * D2R * dir, rr = r * (1 + mix(-0.08, 0.08, h(3 + k)));
    pts.push(lift(Math.sin(a) * rr, y + mix(-14, 14, h(10 + k)), Math.cos(a) * rr));
  }
  pts.push(new THREE.Vector3(OFF * dir, behind ? y + 10 : y - 30, behind ? -220 : 300));
  return pts;
}

// How high a craft must fly over a place of the frame to clear the land, every roof near it, and the spire.
const TOPS = lots().map((l) => lift(l.x, l.tall * 1.15 + 8, l.z));
function clearOver(x: number, z: number): number {
  let need = groundAt(x, z) + CLEAR;
  for (const t of TOPS) if (Math.abs(t.x - x) < 46 && Math.abs(t.z - z) < 46) need = Math.max(need, t.y);
  if (Math.hypot(x, z) < 70) need = Math.max(need, SPIRE.tall + 20);
  return need;
}
void HEART;

// A course and its length, kept while it is flown.
const kept = new Map<string, { c: THREE.CatmullRomCurve3; len: number }>();
function course(key: string, pts: THREE.Vector3[], fixed = 0): { c: THREE.CatmullRomCurve3; len: number } {
  let k = kept.get(key);
  if (!k) {
    if (kept.size > 48) kept.clear();
    // A berth's own points, up to the gate's far side, are left as they are.
    pts.forEach((p, i) => { if (i >= fixed) p.y = Math.min(Math.max(p.y, clearOver(p.x, p.z)), CEILING + Math.min(0, p.z) * Math.tan(4.5 * D2R)); });
    const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    c.arcLengthDivisions = 160;
    k = { c, len: c.getLength() };
    kept.set(key, k);
  }
  return k;
}

// How far a craft has gone along its course this long after it set off at speed v, gathering speed evenly over the
// first RAMP seconds.
const travel = (t: number, v: number) => (t < RAMP ? (v * t * t) / (2 * RAMP) : v * (t - RAMP / 2));
const ease = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * t * (t * (6 * t - 15) + 10); };
const tan = new THREE.Vector3(), tan2 = new THREE.Vector3();
const angle = (a: number, b: number, t: number) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * t; };

// Where a craft is on a course at a share of its length, which way it faces, and how it leans into a turn: all
// against which way is up where it is.
const qi = new THREE.Quaternion();
function local(v: THREE.Vector3, at: THREE.Vector3): THREE.Vector3 { return v.applyQuaternion(upAt(at, qi).invert()); }
function fly(out: Pose, k: { c: THREE.CatmullRomCurve3; len: number }, s: number, ds: number, rest: number, back: boolean): void {
  const u = Math.min(1, Math.max(0, s));
  k.c.getPointAt(u, out.p);
  local(k.c.getTangentAt(u, tan), out.p);
  if (back) tan.negate();
  const hl = Math.hypot(tan.x, tan.z), ty = Math.atan2(-tan.z, tan.x);
  const yaw = angle(rest, ty, smooth(0.25, 0.75, hl));
  const pitch = Math.max(-0.3, Math.min(0.3, Math.atan2(tan.y, Math.max(hl, 1e-3)) * 0.5)) * smooth(0.3, 0.8, hl);
  local(k.c.getTangentAt(back ? Math.max(0, u - 6 / k.len) : Math.min(1, u + 6 / k.len), tan2), out.p);
  if (back) tan2.negate();
  let dy = Math.atan2(-tan2.z, tan2.x) - ty;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  turnTo(out, yaw, pitch, Math.max(-0.45, Math.min(0.45, -dy * 4)) * smooth(0.3, 0.8, hl));
  out.thrust = 0.25 + 0.75 * Math.min(1, ds);
}

export function pose(lane: Lane, li: number, t: number, clear: number, out: Pose): Pose {
  const L = lane.slot, tt = t + lane.from, k = Math.floor(tt / L), tau = tt - k * L;
  const h = (n: number, extra = 0) => hash(lane.seed, k, n + extra * 31);
  const spd = SPEED[lane.craft === 'lifter' ? 'lifter' : 'skiff'];
  out.on = true;
  out.call = 0;
  if (lane.berth === undefined) {
    if (h(20) < 0.2) { out.on = false; return out; }
    const arc = lane.arc ?? 'behind', c = course(`${li}:${k}:x`, arcCourse((n) => h(n), arc));
    const v = mix(spd[0], spd[1], h(21)) * (arc === 'front' ? 1.3 : 0.9), dur = c.len / v, start = (L - dur) * h(22);
    const u = (tau - start) / dur;
    if (u <= 0 || u >= 1 || L < dur) { out.on = false; return out; }
    fly(out, c, u, 1, 0, false);
    out.thrust = 0.6;
    return out;
  }
  const d = dock(lane.berth, clear), fixed = BERTHS[lane.berth].door ? 4 : 2;
  const away = (dir: number) => course(`${li}:${k}:${dir}`, outbound(lane.berth!, clear, (n) => h(n, dir + 1), dir ? -1 : 1), fixed);
  const out1 = away(0), home = away(1);
  const v1 = mix(spd[0], spd[1], h(40)), v2 = mix(spd[0], spd[1], h(41));
  const F1 = out1.len / v1 + RAMP / 2, F2 = home.len / v2 + RAMP / 2, T1 = RISE + F1, T2 = F2 + RISE;
  const d0 = L * mix(0.04, 0.22, h(42)), gap = mix(8, 30, h(43)), a0 = d0 + T1 + gap;
  const dockedPose = () => { out.p.copy(d.p); out.q.copy(d.q); out.thrust = 0; };
  if (lane.stay) { dockedPose(); return out; }
  if (a0 + T2 > L - 4 || tau < d0 || tau >= a0 + T2) {
    dockedPose();
    // The pad calls a little before a craft lifts, and for a while after one lands.
    out.call = tau < d0 ? smooth(d0 - 5, d0, tau) : a0 + T2 <= L - 4 ? 1 - smooth(a0 + T2, a0 + T2 + 7, tau) : 0;
    return out;
  }
  // Straight out from the pad, or straight back onto it, leveling as it goes, with a small sway as it finds its
  // balance.
  const settle = (k: number, since: number) => {
    out.p.copy(d.p).addScaledVector(d.out, LIFT * ease(k));
    turnTo(out, d.yaw + 0.04 * Math.sin(since * 1.7) * Math.sin(Math.PI * k), 0, 0.03 * Math.sin(since * 2.3) * Math.sin(Math.PI * k));
    out.q.copy(tq.copy(d.q).slerp(out.q, ease(k)));
    out.thrust = 0.85;
  };
  if (tau < d0 + RISE) { settle((tau - d0) / RISE, tau - d0); out.call = 1; return out; }
  if (tau < d0 + T1) {
    const f = tau - d0 - RISE, s = travel(f, v1) / out1.len;
    fly(out, out1, s, Math.min(1, f / RAMP), d.yaw, false);
    out.call = 1 - smooth(0, 4, f);
    if (s > 0.999) out.on = false;
    return out;
  }
  if (tau < a0) { out.on = false; return out; }
  if (tau >= a0 + F2) { settle(1 - (tau - a0 - F2) / RISE, tau - a0); out.call = 1; return out; }
  const left = F2 - (tau - a0), s = travel(left, v2) / home.len;
  fly(out, home, s, Math.min(1, left / RAMP), d.yaw, true);
  out.call = 1 - smooth(8, 16, left);
  if (s > 0.999) out.on = false;
  return out;
}

// The barque lies in the harbour over the basin's light: it rises and falls a little on two slow swells, and turns
// and rolls a degree or so.
const MOOR = inCitadel(...BARQUE.at);
export function holding(t: number, out: Pose): Pose {
  out.on = true;
  out.p.copy(MOOR).addScaledVector(Y.clone().applyQuaternion(WQ), 0.9 * Math.sin((2 * Math.PI * t) / 13.7) + 0.4 * Math.sin((2 * Math.PI * t) / 7.9 + 1.3));
  out.q.copy(WQ).multiply(qe.setFromEuler(eu.set(0.014 * Math.sin((2 * Math.PI * t) / 8.7 + 2), BARQUE.face * D2R + 0.02 * Math.sin((2 * Math.PI * t) / 31.1 + 0.4), 0.01 * Math.sin((2 * Math.PI * t) / 11.3))));
  out.thrust = 0.3;
  out.call = 0;
  return out;
}
