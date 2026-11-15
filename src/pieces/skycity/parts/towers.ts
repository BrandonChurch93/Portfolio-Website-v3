import * as THREE from 'three';
import { seeded, slice } from '../../../world/build';
import { AVENUES, HEART, PLANET, PLAZA, RINGS, ROAD, VIEW, lots, type Lot } from '../layout';
import type { PartFactory } from '../part';
import { MODE, lights, type Light } from './towers/life';
import { FRAME, METAL, SKIN, makeLook, towerTable } from './towers/look';
import { City, K, type V3 } from './towers/shape';
import { CORE, LANDMARK, TOWN, type CoreName, type Design } from './towers/types';

// The towers: the core of the city round the spire, and the low town behind it. Every tower is its own building,
// one of a family of designs (./towers/types.ts) built for its lot, in its own materials, and the whole of it is
// one mesh drawn by one material (./towers/look.ts). The landmarks stand once each where the eye goes first; round
// them the core's designs are dealt so that no two neighbours are alike. The small life, beacons and traffic, is one
// set of points (./towers/life.ts).

const D2R = Math.PI / 180;
type Pick<T> = [T, number][];
function pick<T>(r: () => number, list: Pick<T>): T {
  let x = r() * list.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of list) { if ((x -= w) <= 0) return v; }
  return list[list.length - 1][0];
}

// The landmarks, each on the lot nearest a place in the city, and how tall each is against its lot.
const LANDMARKS: { name: keyof typeof LANDMARK; at: [number, number]; tall: number }[] = [
  { name: 'great', at: [-45, 108], tall: 1.15 },
  { name: 'pharos', at: [45, 108], tall: 1.02 },
  { name: 'colonnade', at: [108, 45], tall: 1.18 },
  { name: 'saucer', at: [108, -45], tall: 1.3 },
  { name: 'sail', at: [-108, 45], tall: 1.3 },
  { name: 'pods', at: [-108, -45], tall: 1.1 },
  { name: 'gate', at: [-80, 205], tall: 0.55 },
];
// The core's designs: how often each is dealt, the walls each may have, and how tall each stands against its lot.
const DEAL: Record<CoreName, { w: number; faces: Pick<number>; tall: [number, number] }> = {
  obelisk: { w: 0.55, faces: [[K.stone, 0.45], [K.clad, 0.55]], tall: [0.95, 1.05] },
  pylon: { w: 1.0, faces: [[K.stone, 0.65], [K.clad, 0.35]], tall: [0.42, 0.56] },
  stepped: { w: 1.0, faces: [[K.glass, 0.5], [K.clad, 0.25], [K.stone, 0.25]], tall: [0.82, 0.98] },
  decks: { w: 1.0, faces: [[K.glass, 0.7], [K.clad, 0.3]], tall: [0.85, 1.0] },
  lotus: { w: 0.55, faces: [[K.clad, 0.55], [K.glass, 0.45]], tall: [0.6, 0.78] },
  pyramid: { w: 0.35, faces: [[K.glass, 0.6], [K.stone, 0.4]], tall: [0.68, 0.86] },
  mastaba: { w: 1.1, faces: [[K.glass, 0.6], [K.clad, 0.4]], tall: [0.8, 0.98] },
  crystal: { w: 0.7, faces: [[K.glass, 1]], tall: [0.7, 0.88] },
};
// No design stands within this many units of another of the same design.
const APART = 80;
// The outer band of the core stands lower toward the visitor, so the landmarks round the spire are seen over it:
// at its front it is this share lower.
const FRONT = 0.38;
const front = (l: Lot) => (l.band === 1 ? 1 - FRONT * Math.max(0, l.z / Math.hypot(l.x, l.z)) ** 2 : 1);
// The town: how tall against its lot, and its designs.
const LOW = 0.56;
// The bevels of a tower's corners: dark satin steel, gold, a line of light or its accent metal. Under the moon each
// catches light, and few are orange.
const EDGES: Pick<number> = [[K.dark, 0.45], [K.gold, 0.25], [K.light, 0.12], [K.accent, 0.18]];
const ACCENTS: Pick<number> = [[METAL.gold, 0.45], [METAL.bronze, 0.35], [METAL.copper, 0.2]];
const CLADS: Pick<number> = [[METAL.bronze, 0.55], [METAL.copper, 0.45]];
const FRAMES: Pick<number> = [[FRAME.steel, 0.4], [FRAME.stone, 0.3], [FRAME.metal, 0.3]];
const SKINS: Pick<number> = [[SKIN.curtain, 0.45], [SKIN.ribbon, 0.3], [SKIN.fins, 0.25]];
// How much of a tower is lit: many nearly dark, some half lit, a few lit through. The town is lit less.
const OCCUPIED: Pick<number> = [[0.04, 0.45], [0.14, 0.4], [0.32, 0.15]];
const OCCUPIED_TOWN: Pick<number> = [[0.04, 0.5], [0.14, 0.4], [0.3, 0.1]];
// Floor heights, in units: the core and the older town.
const FLOOR = { core: 3.0, town: 3.5 };
// The share of glass towers that wear metal fins standing off their walls.
const FINS = 0.5;
// Nothing of the towers stands taller than this, so the spire, 220 tall, stays the one tall thing.
const TALLEST = 165;
// How many of the tallest towers carry beacons.
const BEACONS = 16;
// The traffic: so many units of road to a vehicle, how fast, in units a second, how high over the street, and how
// far either side of a boulevard's middle its lanes run. It keeps off the way to the spire, which runs out from the
// plaza at bearing 0 this many degrees either side, and stays inside the second boulevard and the town.
const TRAFFIC = { ring: 30, avenue: 34, speed: [16, 30] as [number, number], y: 1.2, lane: 3.2, clear: 14 };

// Whether any point of a tower is seen from the page's view, which never moves: a point is hidden when it is drawn
// inside the planet's outline and lies behind its middle.
const VIEW_UP = [0, Math.cos(VIEW.el * D2R), -Math.sin(VIEW.el * D2R)], VIEW_TO = [0, Math.sin(VIEW.el * D2R), Math.cos(VIEW.el * D2R)];
function shows(points: Iterable<V3>): boolean {
  for (const [x, y, z] of points) {
    const ry = y - HEART[1], up = ry * VIEW_UP[1] + z * VIEW_UP[2];
    if (Math.hypot(x, up) > PLANET.r - 3 || ry * VIEW_TO[1] + z * VIEW_TO[2] > 0) return true;
  }
  return false;
}

export const build: PartFactory = async () => {
  const group = new THREE.Group();
  group.name = 'towers';
  const all = lots();
  const core = all.filter((l) => l.band < 2), town = all.filter((l) => l.band === 2);

  // The landmarks, and the lots their reach takes.
  interface Plan { l: Lot; design: Design; name: string; h: number; face: number; turn: number }
  const plans: Plan[] = [];
  const taken = new Set<Lot>();
  for (const m of LANDMARKS) {
    const l = core.filter((q) => !taken.has(q)).sort((p, q) => Math.hypot(p.x - m.at[0], p.z - m.at[1]) - Math.hypot(q.x - m.at[0], q.z - m.at[1]))[0];
    taken.add(l);
    plans.push({ l, design: LANDMARK[m.name], name: m.name, h: 0, face: K.stone, turn: 0 });
  }
  plans.forEach((p, i) => { p.h = Math.min(TALLEST, Math.round(p.l.tall * LANDMARKS[i].tall)); });
  // A landmark's reach may cover the next lot: that lot is left open, a forecourt.
  const REACH: Record<string, number> = { great: 18, pharos: 22, gate: 36, colonnade: 23, saucer: 27, pods: 26, sail: 18 };
  const open = (l: Lot) => plans.some((p) => p.l !== l && Math.hypot(p.l.x - l.x, p.l.z - l.z) < REACH[p.name] + Math.max(l.w, l.d) / 2 + 2);

  // The rest of the core, dealt so that no design stands near another of its kind.
  const rest = core.filter((l) => !taken.has(l) && !open(l)).sort((p, q) => q.tall - p.tall);
  const names = Object.keys(CORE) as CoreName[];
  const placed: { l: Lot; name: string }[] = plans.map((p) => ({ l: p.l, name: p.name }));
  for (const l of rest) {
    const r = seeded(l.seed ^ 0x2c1b3c6d);
    const near = new Set(placed.filter((q) => Math.hypot(q.l.x - l.x, q.l.z - l.z) < APART).map((q) => q.name));
    const free = names.filter((n) => !near.has(n));
    const name = pick(r, (free.length ? free : names).map((n) => [n, DEAL[n].w] as [CoreName, number]));
    const deal = DEAL[name], h = Math.round(l.tall * front(l) * (deal.tall[0] + (deal.tall[1] - deal.tall[0]) * r()));
    plans.push({ l, design: CORE[name], name, h, face: pick(r, deal.faces), turn: l.turn });
    placed.push({ l, name });
  }
  // The town, low and plain, its neighbours never alike.
  const townNames = Object.keys(TOWN) as (keyof typeof TOWN)[];
  const sortedTown = [...town].sort((p, q) => Math.atan2(p.x, p.z) - Math.atan2(q.x, q.z));
  let last = '';
  for (const l of sortedTown) {
    const r = seeded(l.seed ^ 0x51ed27);
    const free = townNames.filter((n) => n !== last);
    const name = free[Math.floor(r() * free.length)];
    last = name;
    plans.push({ l, design: TOWN[name], name, h: Math.round(l.tall * LOW * (0.85 + 0.3 * r())), face: K.stone, turn: l.turn });
  }

  // ?towersOf=sail,gate builds only those designs, for a close look at them alone.
  const of = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('towersOf')?.split(',');
  if (of) for (let i = plans.length - 1; i >= 0; i--) if (!of.includes(plans[i].name)) plans.splice(i, 1);

  // Every tower, built into one set of buffers, and its numbers into the table.
  const b = new City(), rows: [number, number, number, number, number, number, number, number][] = [];
  const tops: { h: number; at: V3[] }[] = [];
  let hidden = 0;
  for (let i = 0; i < plans.length; i++) {
    const p = plans[i], l = p.l, r = seeded(l.seed ^ 0x5bd1e995), isTown = l.band === 2;
    const face = p.face, edge = pick(r, EDGES), fins = face === K.glass && r() < FINS;
    b.at(l.x, l.z, p.turn * D2R, i);
    const made = p.design(b, { w: l.w, d: l.d, h: p.h, r, face, edge, fins });
    // Only the front half of the world is ever seen: a tower the dome hides from the page's view at every point is
    // taken out again.
    if (!shows(b.built())) { b.drop(); rows.push([0, 0, 0, 0, 0, 0, 0, FLOOR.core]); tops.push({ h: 0, at: [] }); hidden++; await slice(); continue; }
    rows.push([r(), pick(r, SKINS), pick(r, isTown ? OCCUPIED_TOWN : OCCUPIED) * (0.8 + 0.4 * r()), isTown ? 0.25 * r() : r(), pick(r, ACCENTS), pick(r, CLADS), pick(r, FRAMES), isTown ? FLOOR.town : FLOOR.core]);
    tops.push({ h: p.h, at: made.beacons.map((q) => b.place(q)) });
    await slice();
  }
  const table = towerTable(rows), look = makeLook(table);
  const geo = b.geometry();
  const mesh = new THREE.Mesh(geo, look.material);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.name = 'towers';
  group.add(mesh);
  await slice();

  // Beacons on the tallest tops.
  const r = seeded(7331), life: Light[] = [];
  for (const t of [...tops].sort((p, q) => q.h - p.h).slice(0, BEACONS)) for (const at of t.at) life.push({ mode: MODE.beacon, a: [at[0], at[1], at[2], 0.55 + 0.5 * r()], b: [0, 0, 0, 0], look: [1.1, 0.0, 1.0, r()] });

  // Traffic on the stretches of the two inner boulevards that are clear of the way to the spire, and on the avenues
  // out to the second boulevard. What runs through the town is on the far side of the world and never seen.
  const speed = () => TRAFFIC.speed[0] + (TRAFFIC.speed[1] - TRAFFIC.speed[0]) * r();
  const tail = (side: number): [number, number, number, number] => [1.1, side > 0 ? 0.95 : 0.25, side > 0 ? 0.9 : 1.1, r()];
  const arcs: [number, number, number][] = [[RINGS[0], TRAFFIC.clear, 360 - TRAFFIC.clear], [RINGS[1], TRAFFIC.clear, 360 - TRAFFIC.clear]];
  for (const [ring, from, to] of arcs) for (const side of [-1, 1]) {
    const rad = ring + side * TRAFFIC.lane, run = rad * (to - from) * D2R, n = Math.round(run / TRAFFIC.ring / 2);
    for (let i = 0; i < n; i++) life.push({ mode: MODE.arc, a: [rad, TRAFFIC.y, r(), (side * speed()) / run], b: [from * D2R, to * D2R, 0, 0], look: tail(side) });
  }
  for (const bearing of AVENUES) {
    if (bearing === 0) continue;
    const run = [PLAZA + ROAD, RINGS[1]];
    for (const side of [-1, 1]) {
      const n = Math.round((run[1] - run[0]) / TRAFFIC.avenue / 2);
      for (let i = 0; i < n; i++) life.push({ mode: MODE.avenue, a: [bearing * D2R + side * 0.012, TRAFFIC.y, r(), (side * speed()) / (run[1] - run[0])], b: [run[0], run[1], 0, 0], look: tail(side) });
    }
  }
  const life3 = lights(life);
  group.add(life3.points);

  // ?towersAt=x,y,z,r frames the towers seen alone on that part of the city, for a close look.
  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('towersAt')?.split(',').map(Number);
  const alone = asked?.length === 4 && asked.every(Number.isFinite) ? { at: [asked[0], asked[1], asked[2]] as [number, number, number], r: asked[3] } : { at: [0, 40, 60] as [number, number, number], r: 340 };
  // With ?hook=1, what was built, for the scripts: the triangles, and each tower's design, place and height.
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('hook')) (window as unknown as { __towers?: unknown }).__towers = { tris: b.tris, towers: plans.length - hidden, hidden, plans: plans.map((p) => ({ name: p.name, x: p.l.x, z: p.l.z, h: p.h })) };

  return {
    group,
    alone,
    update(s) {
      look.time.value = s.t;
      life3.time.value = s.t;
      return !s.still;
    },
    dispose() {
      geo.dispose();
      look.material.dispose();
      table.dispose();
      life3.points.geometry.dispose();
      (life3.points.material as THREE.Material).dispose();
    },
  };
};
