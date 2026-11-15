import * as THREE from 'three';
import { seeded, slice } from '../../../world/build';
import { AVENUES, GROUND, PLAZA, RINGS, ROAD, lots, type Lot } from '../layout';
import type { PartFactory } from '../part';
import { MODE, lights, type Light } from './towers/life';
import { SKIN, makeLook } from './towers/look';
import { Shape, type P } from './towers/shape';
import { TYPES, bridge, type Size, type Type } from './towers/types';

// The towers: a building on every lot of the plan (lots() in ../layout.ts), each one of a family of designed types
// (./towers/types.ts), drawn many times over, one draw for each type. Which type a lot gets comes from its height
// and its seed, never the same as the two before it along its row, so no two neighbours match. One material draws
// them all (./towers/look.ts): its facades, rooms, ledges and copper. Bridges join some close pairs of tall towers.
// The small life, beacons, traffic and craft, is one set of points (./towers/life.ts).

const D2R = Math.PI / 180;
// A lot is tall from this height, in units, and low under the other.
const SIZE = { tall: 165, low: 95 };
// The types the tallest lots get, tallest first: the landmarks.
const LANDMARKS = ['crystal', 'twist', 'drum', 'twin', 'octagon', 'blade', 'octagon-step', 'setback'];
// Landmarks that stand once each, on the tallest lots, and nowhere else.
const ONCE = LANDMARKS.slice(0, 4);
// How often each facade is chosen, for a tall lot and for any other.
const SKINS: Record<'tall' | 'other', [number, number][]> = {
  tall: [[SKIN.curtain, 0.5], [SKIN.ribbon, 0.25], [SKIN.fins, 0.25]],
  other: [[SKIN.curtain, 0.4], [SKIN.ribbon, 0.3], [SKIN.fins, 0.3]],
};
// Bridges: between towers of one band closer than this, both taller than this, so many of those that qualify, and
// how tall and wide a bridge is, in units.
const BRIDGE = { near: 54, tall: 120, share: 0.4, h: 4.6, w: 6 };
// The traffic: so many units of road to a vehicle, how fast, in units a second, and how high over the street.
const TRAFFIC = { ring: 34, avenue: 38, speed: [16, 30] as [number, number], y: 1.2, lane: 3.2 };
// How much of a tower is lit, and how often: many towers nearly dark, some half lit, a few lit through.
const OCCUPIED: [number, number][] = [[0.03, 0.45], [0.16, 0.37], [0.45, 0.18]];
// One floor height for the whole city, in units, so every tower is at one scale.
const FLOOR = 3.0;
// How many of the tallest towers carry a beacon.
const BEACONS = 14;
// The share of towers that carry copper.
const ACCENT = 0.3;
// Craft in the air: how many, and how high, in units.
const CRAFT = { n: 26, low: 70, high: 290 };

// The plan's heights fall evenly from the spire to the rim. Over them, a few clusters rise and the ground between
// them sinks a little, so the skyline has groups and gaps and not one even cone: centres in units, and how far
// each reaches. The innermost band, which stands round the spire, is left as planned.
const CLUSTERS: [number, number][] = [[-230, 40], [250, -60], [-40, -300], [360, 230], [-420, -150], [120, 330], [-330, 300]];
const RHYTHM = { reach: 95, low: 0.78, high: 1.2 };
function rhythm(l: Lot): number {
  if (l.band === 0) return 1;
  const k = Math.max(...CLUSTERS.map(([x, z]) => Math.exp(-((l.x - x) ** 2 + (l.z - z) ** 2) / (2 * RHYTHM.reach ** 2))));
  return RHYTHM.low + (RHYTHM.high - RHYTHM.low) * k;
}

function pick<T>(r: () => number, list: [T, number][]): T {
  let x = r() * list.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of list) { if ((x -= w) <= 0) return v; }
  return list[list.length - 1][0];
}

// A point of a type on a lot, in the city's units.
function onLot(l: Lot, q: P): THREE.Vector3 {
  const lx = q[0] * l.w + q[3], lz = q[2] * l.d + q[5], a = l.turn * D2R;
  return new THREE.Vector3(l.x + lx * Math.cos(a) + lz * Math.sin(a), q[1] * l.tall + q[4], l.z - lx * Math.sin(a) + lz * Math.cos(a));
}

export const build: PartFactory = async () => {
  const group = new THREE.Group();
  group.name = 'towers';
  const all = lots().map((l) => ({ ...l, tall: Math.round(l.tall * rhythm(l)) })), look = makeLook();

  // Which type stands on each lot.
  const byName = new Map(TYPES.map((t) => [t.name, t]));
  const chosen: Type[] = [];
  const ranked = [...all.keys()].sort((a, b) => all[b].tall - all[a].tall);
  const landmark = new Map<number, Type>();
  LANDMARKS.forEach((n, i) => landmark.set(ranked[i], byName.get(n)!));
  all.forEach((l, i) => {
    const r = seeded(l.seed), size: Size = l.tall >= SIZE.tall ? 'tall' : l.tall >= SIZE.low ? 'mid' : 'low';
    const fixed = landmark.get(i);
    if (fixed) { chosen.push(fixed); return; }
    const near = [1, 2].filter((k) => i - k >= 0 && all[i - k].band === l.band).map((k) => chosen[i - k]);
    const fits = TYPES.filter((t) => t.sizes.includes(size) && !ONCE.includes(t.name));
    const free = fits.filter((t) => !near.includes(t));
    const from = free.length ? free : fits;
    chosen.push(from[Math.floor(r() * from.length)]);
  });

  // Beacons only on the tallest tops.
  const beaconed = new Set([...all].sort((p, q) => q.tall - p.tall).slice(0, BEACONS));

  // One instanced mesh for each type, with each tower's own numbers.
  const m = new THREE.Object3D(), beacons: Light[] = [];
  for (const type of TYPES) {
    const mine = all.map((l, i) => ({ l, i })).filter(({ i }) => chosen[i] === type);
    if (!mine.length) continue;
    const s = new Shape();
    type.build(s);
    const geo = s.geometry();
    const mesh = new THREE.InstancedMesh(geo, look.material, mine.length);
    const a = new Float32Array(mine.length * 4), b = new Float32Array(mine.length * 4);
    mine.forEach(({ l }, k) => {
      const r = seeded(l.seed ^ 0x5bd1e995), size = l.tall >= SIZE.tall ? 'tall' : 'other';
      m.position.set(l.x, 0, l.z);
      m.rotation.set(0, l.turn * D2R, 0);
      m.scale.set(l.w, l.tall, l.d);
      m.updateMatrix();
      mesh.setMatrixAt(k, m.matrix);
      a.set([r(), pick(r, SKINS[size]), pick(r, OCCUPIED) * (0.8 + 0.4 * r()), r()], k * 4);
      b.set([FLOOR, r() < ACCENT ? 1 : 0, type.name === 'twist' ? 0.5 : r(), 1e4], k * 4);
      if (type.beacons && beaconed.has(l)) for (const q of type.beacons) {
        const at = onLot(l, q);
        beacons.push({ mode: MODE.beacon, a: [at.x, at.y, at.z, 0.55 + 0.5 * r()], b: [0, 0, 0, 0], look: [1.1, 0.0, 1.0, r()] });
      }
    });
    geo.setAttribute('look', new THREE.InstancedBufferAttribute(a, 4));
    geo.setAttribute('look2', new THREE.InstancedBufferAttribute(b, 4));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.name = `towers:${type.name}`;
    group.add(mesh);
    await slice();
  }

  // Bridges across the gap between some close pairs of tall towers.
  {
    const r = seeded(4417), spans: THREE.Matrix4[] = [], own: number[][] = [];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const A = all[i], B = all[j];
      if (A.band !== B.band || A.tall < BRIDGE.tall || B.tall < BRIDGE.tall || chosen[i].name === 'twin' || chosen[j].name === 'twin') continue;
      const dx = B.x - A.x, dz = B.z - A.z, len = Math.hypot(dx, dz);
      if (len > BRIDGE.near || r() > BRIDGE.share) continue;
      const h = Math.min(A.tall, B.tall) * (0.4 + 0.3 * r());
      m.position.set((A.x + B.x) / 2, h, (A.z + B.z) / 2);
      m.rotation.set(0, Math.atan2(-dz, dx), 0);
      m.scale.set(len, BRIDGE.h, BRIDGE.w);
      m.updateMatrix();
      spans.push(m.matrix.clone());
      own.push([r(), SKIN.curtain, 0.5, r()], [BRIDGE.h, 0, r(), 1e4]);
    }
    if (spans.length) {
      const geo = bridge().geometry(), mesh = new THREE.InstancedMesh(geo, look.material, spans.length);
      spans.forEach((x, k) => mesh.setMatrixAt(k, x));
      geo.setAttribute('look', new THREE.InstancedBufferAttribute(new Float32Array(own.filter((_, k) => k % 2 === 0).flat()), 4));
      geo.setAttribute('look2', new THREE.InstancedBufferAttribute(new Float32Array(own.filter((_, k) => k % 2 === 1).flat()), 4));
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.name = 'towers:bridges';
      group.add(mesh);
    }
  }
  await slice();

  // Traffic on the boulevards and the avenues, and craft in the air.
  const r = seeded(7331), life: Light[] = [...beacons];
  const speed = () => TRAFFIC.speed[0] + (TRAFFIC.speed[1] - TRAFFIC.speed[0]) * r();
  for (const ring of RINGS) for (const side of [-1, 1]) {
    const rad = ring + side * TRAFFIC.lane, n = Math.round((2 * Math.PI * rad) / TRAFFIC.ring / 2);
    for (let i = 0; i < n; i++) life.push({ mode: MODE.ring, a: [rad, TRAFFIC.y, r() * Math.PI * 2, side * speed()], b: [0, 0, 0, 0], look: [1.1, side > 0 ? 0.95 : 0.25, side > 0 ? 0.9 : 1.1, r()] });
  }
  const run = [PLAZA + ROAD, GROUND.r - 24];
  for (const bearing of AVENUES) for (const side of [-1, 1]) {
    const n = Math.round((run[1] - run[0]) / TRAFFIC.avenue / 2);
    for (let i = 0; i < n; i++) life.push({ mode: MODE.avenue, a: [bearing * D2R + side * 0.012, TRAFFIC.y, r(), (side * speed()) / (run[1] - run[0])], b: [run[0], run[1], 0, 0], look: [1.1, side > 0 ? 0.95 : 0.25, side > 0 ? 0.9 : 1.1, r()] });
  }
  for (let i = 0; i < CRAFT.n; i++) {
    const a = r() * Math.PI * 2, d = 80 + 260 * r();
    life.push({ mode: MODE.craft, a: [Math.sin(a) * d * 0.5, Math.cos(a) * d * 0.5, 160 + 300 * r(), CRAFT.low + (CRAFT.high - CRAFT.low) * r() ** 1.5], b: [60 + 160 * r(), 0, r() * Math.PI * 2, (r() < 0.5 ? -1 : 1) * (0.025 + 0.04 * r())], look: [1.3, 0.8 + 0.2 * r(), 0.9, r()] });
  }
  const life3 = lights(life);
  group.add(life3.points);

  // ?towersAt=x,y,z,r frames the towers seen alone on that part of the city, for a close look.
  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('towersAt')?.split(',').map(Number);
  const alone = asked?.length === 4 && asked.every(Number.isFinite) ? { at: [asked[0], asked[1], asked[2]] as [number, number, number], r: asked[3] } : { at: [0, 140, 0] as [number, number, number], r: 700 };

  return {
    group,
    alone,
    update(s) {
      look.time.value = s.t;
      life3.time.value = s.t;
      return !s.still;
    },
    dispose() {
      group.traverse((o) => { if (o instanceof THREE.Mesh || o instanceof THREE.Points) o.geometry.dispose(); });
      look.material.dispose();
      (life3.points.material as THREE.Material).dispose();
    },
  };
};
