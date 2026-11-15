import * as THREE from 'three';
import { seeded, slice } from '../../../world/build';
import { AVENUES, PLANET, PLAZA, RINGS, ROAD, TALLEST, VIEW, lots, type Lot } from '../layout';
import type { PartFactory } from '../part';
import { MODE, lights, type Light } from './towers/life';
import { FRAME, METAL, SKIN, makeLook, towerTable } from './towers/look';
import { City, K, beam, type V3 } from './towers/shape';
import { CORE, LANDMARK, type CoreName, type Design } from './towers/types';

// The towers: the city on the crown of the world, few and large, round the spire. Every building is its own, one of
// a family of designs (./towers/types.ts) built for its lot in its own materials and seated on the dome, and the
// whole of it is one mesh drawn by one material (./towers/look.ts). The landmarks stand once each where the eye goes first; round
// them the core's designs are dealt so that no two neighbours are alike. The small life, beacons and traffic, is one
// set of points (./towers/life.ts).

const D2R = Math.PI / 180;
type Pick<T> = [T, number][];
function pick<T>(r: () => number, list: Pick<T>): T {
  let x = r() * list.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of list) { if ((x -= w) <= 0) return v; }
  return list[list.length - 1][0];
}

// The landmarks, each on the lot nearest a place on the map, and how tall each is against its lot: the great obelisk
// and the Pharos either side of the way to the spire, the round pylon and the sail at either hand, and the gate in
// front.
const LANDMARKS: { name: keyof typeof LANDMARK; at: [number, number]; tall: number }[] = [
  { name: 'great', at: [-95, 195], tall: 1.15 },
  { name: 'pharos', at: [95, 195], tall: 1.1 },
  { name: 'colonnade', at: [235, -40], tall: 1.1 },
  { name: 'sail', at: [-235, 40], tall: 1.15 },
  { name: 'gate', at: [110, 370], tall: 0.6 },
];
// How far each landmark reaches from its middle: a lot nearer than that is left to it.
const REACH: Record<keyof typeof LANDMARK, number> = { great: 26, pharos: 22, gate: 37, colonnade: 30, sail: 24 };
// Which design a lot gets, by how tall it stands: tall towers, middling ones, and the low building of the front rows.
const DEAL: { above: number; pick: Pick<CoreName> }[] = [
  { above: 120, pick: [['pylonTower', 0.65], ['mastaba', 0.35]] },
  { above: 75, pick: [['pylonTower', 0.45], ['pylon', 0.3], ['mastaba', 0.25]] },
  { above: 0, pick: [['terrace', 0.45], ['pylon', 0.35], ['pylonTower', 0.2]] },
];
const FACES: Pick<number> = [[K.stone, 0.72], [K.clad, 0.28]];
// Heights vary hard within a row, so the skyline is jagged: each building stands this share of its lot's height.
const JAG = [0.72, 1.18];
// The spire's room: nothing within this far of the middle stands taller than this.
const SPIRE_ROOM = { r: 110, tall: 170 };
// The back of the city, seen only as dark shapes over the crown, is built plainly: a lot further back than this on
// the map.
const BACK = -110;
// No design stands within this many units of another of the same design.
const APART = 60;
// Bridges between close tall towers of a row: how close, how tall both must be, the share that get one, and its
// size.
const BRIDGE = { near: 62, tall: 100, share: 0.3, w: 6, h: 5 };
// The bevels of a tower's corners: dark satin steel, gold, a line of light or its accent metal. Under the moon each
// catches light, and few are orange.
const EDGES: Pick<number> = [[K.dark, 0.45], [K.gold, 0.25], [K.light, 0.12], [K.accent, 0.18]];
const ACCENTS: Pick<number> = [[METAL.gold, 0.45], [METAL.bronze, 0.35], [METAL.copper, 0.2]];
const CLADS: Pick<number> = [[METAL.bronze, 0.55], [METAL.copper, 0.45]];
const FRAMES: Pick<number> = [[FRAME.steel, 0.4], [FRAME.stone, 0.3], [FRAME.metal, 0.3]];
const SKINS: Pick<number> = [[SKIN.curtain, 0.45], [SKIN.ribbon, 0.3], [SKIN.fins, 0.25]];
// How much of a tower is lit: many nearly dark, some half lit, a few lit through.
const OCCUPIED: Pick<number> = [[0.04, 0.45], [0.14, 0.4], [0.32, 0.15]];
// One floor height for the whole city, in units.
const FLOOR = 3.0;
// The share of towers that stand behind a colonnade, and do not stand on a podium.
const FINS = 0.25;
// How many of the tallest towers carry beacons.
const BEACONS = 16;
// The traffic: so many units of road to a vehicle, how fast, in units a second, how high over the street, and how
// far either side of a boulevard's middle its lanes run. It keeps off the way to the spire, which runs out from the
// plaza at bearing 0 this many degrees either side.
const TRAFFIC = { ring: 30, avenue: 34, speed: [16, 30] as [number, number], y: 1.2, lane: 3.2, clear: 14 };

// Whether any point of a tower is seen from the page's view, which never moves: a point is hidden when it is drawn
// inside the outline of the sphere the dome is part of and lies behind that sphere's middle.
const VIEW_UP = [0, Math.cos(VIEW.el * D2R), -Math.sin(VIEW.el * D2R)], VIEW_TO = [0, Math.sin(VIEW.el * D2R), Math.cos(VIEW.el * D2R)];
function shows(points: Iterable<V3>): boolean {
  for (const [x, y, z] of points) {
    const ry = y + PLANET.r, up = ry * VIEW_UP[1] + z * VIEW_UP[2];
    if (Math.hypot(x, up) > PLANET.r - 3 || ry * VIEW_TO[1] + z * VIEW_TO[2] > 0) return true;
  }
  return false;
}

export const build: PartFactory = async () => {
  const group = new THREE.Group();
  group.name = 'towers';
  const all = lots();
  const core = all;

  // The landmarks, and the lots their reach takes.
  interface Plan { l: Lot; design: Design; name: string; h: number; face: number; turn: number }
  const plans: Plan[] = [];
  const taken = new Set<Lot>();
  for (const m of LANDMARKS) {
    const l = core.filter((q) => !taken.has(q)).sort((p, q) => Math.hypot(p.x - m.at[0], p.z - m.at[1]) - Math.hypot(q.x - m.at[0], q.z - m.at[1]))[0];
    taken.add(l);
    plans.push({ l, design: LANDMARK[m.name], name: m.name, h: 0, face: K.stone, turn: 0 });
  }
  plans.forEach((p, i) => { p.h = Math.min(TALLEST, Math.round(p.l.tall * LANDMARKS[i].tall)); if (Math.hypot(p.l.x, p.l.z) - REACH[p.name as keyof typeof LANDMARK] < SPIRE_ROOM.r) p.h = Math.min(p.h, SPIRE_ROOM.tall); });
  const open = (l: Lot) => plans.some((p) => p.l !== l && Math.hypot(p.l.x - l.x, p.l.z - l.z) < REACH[p.name as keyof typeof LANDMARK] + Math.max(l.w, l.d) / 2 + 2);

  // The rest, dealt so that no design stands near another of its kind, plainly at the back.
  const rest = core.filter((l) => !taken.has(l) && !open(l)).sort((p, q) => q.tall - p.tall);
  const placed: { l: Lot; name: string }[] = plans.map((p) => ({ l: p.l, name: p.name }));
  for (const l of rest) {
    const r = seeded(l.seed ^ 0x2c1b3c6d);
    let h = Math.max(30, Math.min(TALLEST, Math.round(l.tall * (JAG[0] + (JAG[1] - JAG[0]) * r()))));
    if (Math.hypot(l.x, l.z) - Math.max(l.w, l.d) * 0.7 < SPIRE_ROOM.r) h = Math.min(h, SPIRE_ROOM.tall);
    let name: CoreName = 'block';
    if (l.z > BACK) {
      const near = new Set(placed.filter((q) => Math.hypot(q.l.x - l.x, q.l.z - l.z) < APART).map((q) => q.name));
      const deal = DEAL.find((x) => h >= x.above)!.pick, free = deal.filter(([n]) => !near.has(n));
      name = pick(r, free.length ? free : deal);
    }
    plans.push({ l, design: CORE[name], name, h, face: pick(r, FACES), turn: l.turn });
    placed.push({ l, name });
  }
  // ?towersOf=sail,gate builds only those designs, for a close look at them alone.
  const of = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('towersOf')?.split(',');
  if (of) for (let i = plans.length - 1; i >= 0; i--) if (!of.includes(plans[i].name)) plans.splice(i, 1);

  // Every tower, built into one set of buffers, and its numbers into the table.
  const b = new City(), rows: [number, number, number, number, number, number, number, number][] = [];
  const tops: { h: number; at: V3[] }[] = [];
  let hidden = 0;
  const shown = new Set<number>();
  for (let i = 0; i < plans.length; i++) {
    const p = plans[i], l = p.l, r = seeded(l.seed ^ 0x5bd1e995);
    const face = p.face, edge = pick(r, EDGES), fins = r() < FINS;
    b.at(l.x, l.z, p.turn * D2R, i);
    const made = p.design(b, { w: l.w, d: l.d, h: p.h, r, face, edge, fins, simple: p.name === 'block' });
    // Only the front half of the world is ever seen: a tower the dome hides from the page's view at every point is
    // taken out again.
    if (!shows(b.built())) { b.drop(); rows.push([0, 0, 0, 0, 0, 0, 0, FLOOR]); tops.push({ h: 0, at: [] }); hidden++; await slice(); continue; }
    rows.push([r(), pick(r, SKINS), pick(r, OCCUPIED) * (0.8 + 0.4 * r()), r(), pick(r, ACCENTS), pick(r, CLADS), pick(r, FRAMES), FLOOR]);
    tops.push({ h: p.h, at: made.beacons.map((q) => b.place(q)) });
    shown.add(i);
    await slice();
  }
  // Bridges across the canyon between some close tall towers of a row, dark, lit along their underside, gold on top.
  {
    const r = seeded(4417);
    for (let i = 0; i < plans.length; i++) for (let j = i + 1; j < plans.length; j++) {
      const A = plans[i], B = plans[j];
      if (!shown.has(i) || !shown.has(j) || A.l.band !== B.l.band || A.h < BRIDGE.tall || B.h < BRIDGE.tall) continue;
      const dx = B.l.x - A.l.x, dz = B.l.z - A.l.z, len = Math.hypot(dx, dz);
      if (len > BRIDGE.near || r() > BRIDGE.share) continue;
      const a = A.turn * D2R, c = Math.cos(a), sn = Math.sin(a), lx = dx * c - dz * sn, lz = dx * sn + dz * c, y = Math.min(A.h, B.h) * (0.35 + 0.35 * r());
      b.at(A.l.x, A.l.z, a, i);
      beam(b, [0, y, 0], [lx, y, lz], BRIDGE.w, BRIDGE.h, K.dark);
      beam(b, [0, y - BRIDGE.h / 2 - 0.3, 0], [lx, y - BRIDGE.h / 2 - 0.3, lz], 1.2, 0.5, K.light);
      beam(b, [0, y + BRIDGE.h / 2 + 0.3, 0], [lx, y + BRIDGE.h / 2 + 0.3, lz], BRIDGE.w + 0.8, 0.6, K.gold);
    }
  }
  await slice();
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
  // out to the edge of the city, or to the second boulevard where the temple quarter and the port stand.
  const speed = () => TRAFFIC.speed[0] + (TRAFFIC.speed[1] - TRAFFIC.speed[0]) * r();
  const tail = (side: number): [number, number, number, number] => [1.1, side > 0 ? 0.95 : 0.25, side > 0 ? 0.9 : 1.1, r()];
  const arcs: [number, number, number][] = [[RINGS[0], TRAFFIC.clear, 360 - TRAFFIC.clear], [RINGS[1], TRAFFIC.clear, 360 - TRAFFIC.clear], [RINGS[2], TRAFFIC.clear, 215]];
  for (const [ring, from, to] of arcs) for (const side of [-1, 1]) {
    const rad = ring + side * TRAFFIC.lane, run = rad * (to - from) * D2R, n = Math.round(run / TRAFFIC.ring / 2);
    for (let i = 0; i < n; i++) life.push({ mode: MODE.arc, a: [rad, TRAFFIC.y, r(), (side * speed()) / run], b: [from * D2R, to * D2R, 0, 0], look: tail(side) });
  }
  for (const bearing of AVENUES) {
    if (bearing === 0) continue;
    const run = [PLAZA + ROAD, bearing > 215 && bearing < 325 ? RINGS[1] : RINGS[3]];
    for (const side of [-1, 1]) {
      const n = Math.round((run[1] - run[0]) / TRAFFIC.avenue / 2);
      for (let i = 0; i < n; i++) life.push({ mode: MODE.avenue, a: [bearing * D2R + side * 0.012, TRAFFIC.y, r(), (side * speed()) / (run[1] - run[0])], b: [run[0], run[1], 0, 0], look: tail(side) });
    }
  }
  const life3 = lights(life);
  group.add(life3.points);

  // ?towersAt=x,y,z,r frames the towers seen alone on that part of the city, for a close look.
  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('towersAt')?.split(',').map(Number);
  const alone = asked?.length === 4 && asked.every(Number.isFinite) ? { at: [asked[0], asked[1], asked[2]] as [number, number, number], r: asked[3] } : { at: [0, 70, 80] as [number, number, number], r: 330 };
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
