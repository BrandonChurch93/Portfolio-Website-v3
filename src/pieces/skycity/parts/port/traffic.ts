import * as THREE from 'three';
import { PLANET, RINGS, lift } from '../../layout';

// The city's traffic: lanes of small craft threading the canyons between the towers, as the capitals in those films
// have. Each lane is a line on the map at a height over the land, flown one way, its craft spaced along it a little
// unevenly: round the spire over the ring boulevards, out along the way to the spire and an avenue and on past the
// torn edge into space, and two skyways high over the roofs. Where a craft is on its lane is worked out from the
// clock alone, so a held frame is always the same picture. A craft is a tiny dark body with a pale light at its nose
// and an ember one at its tail: across the screen they read as streams of small lights.

const D2R = Math.PI / 180;
interface Ring { kind: 'ring'; r: number; h: number; dir: number; side: number; speed: number; gap: number; skip?: [number, number] }
interface Ray { kind: 'ray'; bearing: number; r0: number; r1: number; h: number; dir: number; side: number; speed: number; gap: number }
type Lane = Ring | Ray;

// The lanes. A ring lane may skip a stretch of bearings where something stands across it (the port's massif), its
// craft dimming out of sight there behind it. A ray lane runs from near the spire's plaza out past the torn edge,
// climbing as it leaves the world.
const LANES: Lane[] = [];
for (const [dir, side] of [[1, -2.6], [-1, 2.6]]) {
  LANES.push({ kind: 'ring', r: RINGS[0], h: 44, dir, side, speed: 62, gap: 46 });
  LANES.push({ kind: 'ring', r: RINGS[0], h: 104, dir: -dir, side, speed: 48, gap: 64 });
  LANES.push({ kind: 'ring', r: RINGS[1], h: 34, dir, side, speed: 74, gap: 58, skip: [60, 114] });
  LANES.push({ kind: 'ring', r: RINGS[1], h: 82, dir: -dir, side, speed: 56, gap: 76, skip: [60, 114] });
  LANES.push({ kind: 'ring', r: RINGS[0], h: 162, dir, side, speed: 52, gap: 40 });
  LANES.push({ kind: 'ring', r: RINGS[1], h: 138, dir: -dir, side, speed: 64, gap: 44, skip: [60, 114] });
  LANES.push({ kind: 'ring', r: 380, h: 205, dir, side: side * 2, speed: 40, gap: 150 });
  LANES.push({ kind: 'ray', bearing: 0, r0: 96, r1: 1300, h: 30, dir, side, speed: 88, gap: 60 });
  LANES.push({ kind: 'ray', bearing: 0, r0: 96, r1: 1300, h: 68, dir: -dir, side, speed: 72, gap: 74 });
  LANES.push({ kind: 'ray', bearing: 45, r0: 96, r1: 1300, h: 52, dir, side, speed: 80, gap: 70 });

}

// How far past the torn edge a ray lane is flat before it climbs away, and how steeply.
const LEAVE = { from: 640, rise: 0.22 };
// Over how many units a craft fades in or out at a lane's ends and where a lane is skipped.
const FADE = 24;

export interface Mite { lane: number; at: number; jitter: number }
export interface Traffic { count: number; lightsPer: number; step(t: number, put: (i: number, m: THREE.Matrix4, k: number) => void, light: (j: number, p: THREE.Vector3, size: number, heat: number, k: number) => void): void }

const hash = (n: number) => { const s = Math.sin(n * 91.7 + 13.1) * 43758.5453; return s - Math.floor(s); };

// Where a point of a lane is in the frame, at a distance along it: for a ring, along its circumference; for a ray,
// out from the middle. The side is a sideways offset, so two lanes one each way run side by side.
function onLane(L: Lane, s: number, out: THREE.Vector3): number {
  if (L.kind === 'ring') {
    const a = s / L.r, r = L.r + L.side;
    lift(Math.sin(a) * r, L.h, Math.cos(a) * r, out);
    if (!L.skip) return 1;
    const deg = ((a / D2R) % 360 + 360) % 360, [lo, hi] = L.skip;
    const d = Math.min(Math.abs(deg - lo), Math.abs(deg - hi)) * D2R * L.r;
    return deg > lo && deg < hi ? 0 : Math.min(1, d / FADE);
  }
  const b = L.bearing * D2R, r = L.r0 + s, sx = Math.cos(b) * L.side, sz = -Math.sin(b) * L.side;
  const climb = Math.max(0, r - LEAVE.from) * LEAVE.rise;
  const flat = Math.min(r, PLANET.r * 0.48);
  lift(Math.sin(b) * flat + sx, L.h + climb, Math.cos(b) * flat + sz, out);
  if (r > flat) { const dirX = Math.sin(b), dirZ = Math.cos(b); out.x += dirX * (r - flat); out.z += dirZ * (r - flat); }
  return Math.min(1, s / FADE, (L.r1 - L.r0 - s) / (FADE * 4));
}

export function traffic(): Traffic {
  const mites: Mite[] = [];
  LANES.forEach((L, li) => {
    const len = L.kind === 'ring' ? 2 * Math.PI * L.r : L.r1 - L.r0;
    const n = Math.floor(len / L.gap);
    for (let i = 0; i < n; i++) mites.push({ lane: li, at: (i + 0.35 * hash(li * 131 + i)) / n, jitter: hash(li * 17 + i * 3.1) });
  });
  const p = new THREE.Vector3(), q = new THREE.Vector3(), fwd = new THREE.Vector3(), up = new THREE.Vector3(), side = new THREE.Vector3(), m = new THREE.Matrix4();
  const below = new THREE.Vector3(0, -PLANET.r, 0), nose = new THREE.Vector3(), tail = new THREE.Vector3(), trail = new THREE.Vector3();
  return {
    count: mites.length,
    lightsPer: 3,
    step(t, put, light) {
      mites.forEach((c, i) => {
        const L = LANES[c.lane], len = L.kind === 'ring' ? 2 * Math.PI * L.r : L.r1 - L.r0;
        const v = L.speed * (0.92 + 0.16 * c.jitter);
        let s = (c.at * len + L.dir * v * t) % len;
        if (s < 0) s += len;
        const k = onLane(L, s, p);
        onLane(L, (s + L.dir * 2 + len) % len, q);
        fwd.subVectors(q, p);
        if (fwd.lengthSq() < 1e-6) fwd.set(1, 0, 0);
        fwd.normalize();
        up.subVectors(p, below).normalize();
        side.crossVectors(fwd, up).normalize();
        up.crossVectors(side, fwd);
        m.makeBasis(fwd.clone().multiplyScalar(0.6), up.clone().multiplyScalar(0.6), side.clone().multiplyScalar(0.6)).setPosition(p);
        put(i, m, k);
        nose.copy(p).addScaledVector(fwd, 1.2);
        tail.copy(p).addScaledVector(fwd, -1.6);
        // A warm light at the nose, an ember one at the tail, and a fainter one behind it, so a craft under way draws
        // a short streak the way it is going.
        light(i * 3, nose, 1.9, 0.86, 2.6 * k);
        light(i * 3 + 1, tail, 1.6, 0.55, 2.0 * k);
        light(i * 3 + 2, trail.copy(p).addScaledVector(fwd, -4.6), 1.3, 0.45, 0.9 * k);
      });
    },
  };
}
