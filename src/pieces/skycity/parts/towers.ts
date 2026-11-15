import * as THREE from 'three';
import { seeded, slice } from '../../../world/build';
import { AVENUES, CITY, PLANET, PLAZA, RINGS, ROAD, TALLEST, VIEW, districtAt, lots, type Lot } from '../layout';
import type { PartFactory } from '../part';
import { MODE, lights, type Light } from './towers/life';
import { FRAME, METAL, SKIN, makeLook, towerTable, type Row } from './towers/look';
import { City, K, beam, type V3 } from './towers/shape';
import { LANDMARK, TALL, deck, terrace, twin, type Seen, type Section, type TallName } from './towers/types';

// The towers: the city on the crown of the world, dense, round the spire. The lots of a row are taken a few at a time
// into blocks, and a block is built as one building in one frame: in the low rows a long terrace stepping down
// toward the visitor, in the tall rows a podium of the same kind with towers rising from it, each in its own frame
// so it stands straight out from the ground under it. The landmarks stand once each where the eye goes first. The
// whole of it is one mesh drawn by one material (./towers/look.ts). The small life, beacons and traffic, is one set of
// points (./towers/life.ts).

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
  { name: 'gate', at: [138, 371], tall: 0.75 },
  { name: 'flank', at: [96, 438], tall: 1.65 },
  { name: 'flank', at: [-94, 438], tall: 1.65 },
];
// How far each landmark reaches from its middle: a lot nearer than that is left to it.
const REACH: Record<keyof typeof LANDMARK, number> = { great: 26, pharos: 22, gate: 37, colonnade: 30, sail: 24, flank: 26 };
// How many lots a block of each band takes, the inner band first: few in the tall rows, more in the low ones, so the
// front of the city is long terraces and not a crowd of houses.
const BLOCK: number[][] = [[1, 2, 2], [1, 2, 2, 3], [2, 3, 3, 4], [2, 3, 4, 4, 5]];
// The rows a podium carries towers on, and how tall a lot must be for a tower and not a terrace.
const TOWER = { bands: 2, above: 82 };
// A podium's height, from the street.
const PODIUM = [13, 20];
// The tall designs and how often each is dealt, and no design within this many units of another of its kind.
const DEAL: Pick<TallName> = [['buttress', 0.18], ['drums', 0.28], ['ziggurat', 0.24], ['needle', 0.12], ['pylonTower', 0.18]];
const APART = 70;
// The middle of the city: in the rows from this band out, this share of a terrace's stretches (by band) rise as
// towers this many times their lot's height, and no taller than most. The designs they are dealt from.
const MIDDLE = { from: 2, share: [0, 0, 0.3, 0.17], by: [1.45, 2.0], most: 135, deal: [['ziggurat', 0.3], ['needle', 0.1], ['buttress', 0.25], ['drums', 0.2], ['pylonTower', 0.15]] as Pick<TallName> };
// Of two tall lots side by side in a block, the share that become a pair of pylons joined at the top, and the share
// of the others joined by a deck high up.
const PAIRS = { twin: 0.4, deck: 0.35 };
// Heights vary hard within a row, so the skyline is jagged: each building stands this share of its lot's height.
const JAG = [0.72, 1.2];
// The spire's room: nothing within this far of the middle stands taller than this.
const SPIRE_ROOM = { r: 110, tall: 170 };
// The back of the city, seen only as dark shapes over the crown, is built plainly: a lot further back than this on
// the map.
const BACK = -110;
// Bridges between close tall towers of a row: how close, how tall both must be, the share that get one, and its
// size.
const BRIDGE = { near: 62, tall: 100, share: 0.3, w: 6, h: 5 };
// The bevels of a tower's corners and the roll of a terrace's cornice: mostly stone, some metal to catch the moon.
const EDGES: Pick<number> = [[K.plain, 0.3], [K.gold, 0.5], [K.accent, 0.2]];
const ROLLS: Pick<number> = [[K.plain, 0.62], [K.gold, 0.2], [K.bronze, 0.1], [K.copper, 0.08]];
const ACCENTS: Pick<number> = [[METAL.gold, 0.45], [METAL.bronze, 0.35], [METAL.copper, 0.2]];
const CLADS: Pick<number> = [[METAL.bronze, 0.6], [METAL.copper, 0.4]];
// The share of towers clad whole in polished metal among the stone ones, and how many of them, in front and tall,
// are clad in gold.
const CLAD = { share: 0.38, gold: 3, goldAbove: 105 };
const FRAMES: Pick<number> = [[FRAME.steel, 0.4], [FRAME.stone, 0.3], [FRAME.metal, 0.3]];
const SKINS: Pick<number> = [[SKIN.curtain, 0.45], [SKIN.ribbon, 0.3], [SKIN.fins, 0.25]];
// How much of a building is lit: many nearly dark, some half lit, a few lit through.
const OCCUPIED: Pick<number> = [[0.12, 0.3], [0.26, 0.45], [0.46, 0.25]];
// Its stone, from bronze black (0) through umber to a pale sand (1): most dark, a few pale.
const TONES: Pick<[number, number]> = [[[0.0, 0.2], 0.32], [[0.2, 0.45], 0.33], [[0.45, 0.7], 0.2], [[0.8, 1.0], 0.15]];
// One floor height for the whole city, in units.
const FLOOR = 3.0;
// How many of the tallest towers carry beacons.
const BEACONS = 16;
// The traffic: so many units of road to a vehicle, how fast, in units a second, how high over the street, and how
// far either side of a boulevard's middle its lanes run. It keeps off the way to the spire, which runs out from the
// plaza at bearing 0 this many degrees either side.
const TRAFFIC = { ring: 30, avenue: 34, speed: [16, 30] as [number, number], y: 1.2, lane: 3.2, clear: 14 };

// Whether any point of a building is seen from the page's view, which never moves: a point is hidden when it is drawn
// inside the outline of the sphere the dome is part of and lies behind that sphere's middle.
const VIEW_UP = [0, Math.cos(VIEW.el * D2R), -Math.sin(VIEW.el * D2R)], VIEW_TO = [0, Math.sin(VIEW.el * D2R), Math.cos(VIEW.el * D2R)];
function shows(points: Iterable<V3>): boolean {
  for (const [x, y, z] of points) {
    const ry = y + PLANET.r, up = ry * VIEW_UP[1] + z * VIEW_UP[2];
    if (Math.hypot(x, up) > PLANET.r - 3 || ry * VIEW_TO[1] + z * VIEW_TO[2] > 0) return true;
  }
  return false;
}
const bearingOf = (l: Lot) => ((Math.atan2(l.x, l.z) / D2R) + 360) % 360;
// Which faces of a building turned to a bearing face the page's view at all: its front, right, back and left.
const seenAt = (deg: number): Seen => { const a = deg * D2R, s = Math.sin(a), c = Math.cos(a); return [c > -0.3, s < 0.3, c < 0.3, s > -0.3]; };
// The bands as the plan lays its rows out (lots() in ../layout.ts): where each begins, how deep each row is, and
// how deep a building of it may be.
const BANDS = [PLAZA, ...RINGS].slice(0, 4).map((e, i) => {
  const inner = e + ROAD, outer = [PLAZA, ...RINGS][i + 1] - ROAD / 2, rows = Math.max(1, Math.round((outer - inner) / 46));
  return { inner, pitch: (outer - inner) / rows, deep: (outer - inner) / rows - 4 };
});

// A lot at the city's edge, with open land, the jungle or the dunes beside it or beyond it: the city steps down
// there, so it does not stop at a line.
const EDGE_STEP = 0.68;
function atEdge(l: Lot): boolean {
  const a = Math.atan2(l.x, l.z), rad = Math.hypot(l.x, l.z), reach = 40;
  for (const [da, dr] of [[reach / rad, 0], [-reach / rad, 0], [0, reach]] as [number, number][]) {
    const b = a + da, q = rad + dr, d = districtAt(Math.sin(b) * q, Math.cos(b) * q);
    if (q > CITY.r || (d && d.kind !== 'procession')) return true;
  }
  return false;
}

export const build: PartFactory = async () => {
  const group = new THREE.Group();
  group.name = 'towers';
  const all = lots();

  // The landmarks, and the lots their reach takes.
  const taken = new Set<Lot>(), marks: { l: Lot; name: keyof typeof LANDMARK; h: number }[] = [];
  for (const m of LANDMARKS) {
    const l = all.filter((q) => !taken.has(q)).sort((p, q) => Math.hypot(p.x - m.at[0], p.z - m.at[1]) - Math.hypot(q.x - m.at[0], q.z - m.at[1]))[0];
    taken.add(l);
    let h = Math.min(TALLEST, Math.round(l.tall * m.tall));
    if (Math.hypot(l.x, l.z) - REACH[m.name] < SPIRE_ROOM.r) h = Math.min(h, SPIRE_ROOM.tall);
    marks.push({ l, name: m.name, h });
  }
  const cleared = (l: Lot) => marks.some((p) => p.l !== l && Math.hypot(p.l.x - l.x, p.l.z - l.z) < REACH[p.name] + Math.max(l.w, l.d) / 2 + 2);

  // The rows, each in order of bearing, cut where a lot is missing (an avenue, a square, a district, a landmark) and
  // then dealt into blocks.
  const rows = new Map<string, Lot[]>();
  for (const l of all) {
    if (taken.has(l) || cleared(l)) continue;
    const B = BANDS[l.band], key = `${l.band}:${Math.floor((Math.hypot(l.x, l.z) - B.inner) / B.pitch)}`;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key)!.push(l);
  }
  const blocks: { lots: Lot[]; band: number }[] = [];
  for (const row of rows.values()) {
    row.sort((p, q) => bearingOf(p) - bearingOf(q));
    const rad = Math.hypot(row[0].x, row[0].z), pitch = (46 / rad) / D2R;
    // Start the row after its widest gap, so a run never wraps round the end of the list.
    let gapAt = 0, gapMost = -1;
    for (let i = 0; i < row.length; i++) { const g = (bearingOf(row[(i + 1) % row.length]) - bearingOf(row[i]) + 360) % 360 || 360; if (g > gapMost) { gapMost = g; gapAt = (i + 1) % row.length; } }
    const order = [...row.slice(gapAt), ...row.slice(0, gapAt)];
    let run: Lot[] = [];
    const runs: Lot[][] = [];
    for (const l of order) {
      if (run.length && (bearingOf(l) - bearingOf(run[run.length - 1]) + 360) % 360 > pitch * 1.6) { runs.push(run); run = []; }
      run.push(l);
    }
    if (run.length) runs.push(run);
    for (const rn of runs) {
      const r = seeded(rn[0].seed ^ 0x51ed27);
      for (let i = 0; i < rn.length;) {
        let n = Math.min(rn.length - i, BLOCK[rn[0].band][Math.floor(r() * BLOCK[rn[0].band].length)]);
        if (rn.length - i - n === 1) n += 1;
        blocks.push({ lots: rn.slice(i, i + n), band: rn[0].band });
        i += n;
      }
    }
  }
  // ?towersOf=terrace,twin,drums builds only those, for a close look at them alone.
  const of = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('towersOf')?.split(',') ?? null;
  const wants = (name: string) => !of || of.includes(name);

  const b = new City(), rows8: Row[] = [];
  const tops: { h: number; at: V3[] }[] = [];
  const talls: { x: number; z: number; h: number; band: number; turn: number; id: number }[] = [];
  const placed: { x: number; z: number; name: string }[] = marks.map((m) => ({ x: m.l.x, z: m.l.z, name: m.name }));
  let hidden = 0, count = 0;
  // A row of the table for a building: its own numbers, dealt from its seed.
  const row = (r: () => number, tone?: number, metal?: number): Row => {
    const t = pick(r, TONES), stone = tone ?? t[0] + (t[1] - t[0]) * r(), clad = pick(r, CLADS);
    return [r(), pick(r, SKINS), pick(r, OCCUPIED) * (0.8 + 0.4 * r()), r(), pick(r, ACCENTS), metal ?? clad, pick(r, FRAMES), FLOOR, stone, 0.4 + 0.6 * r(), r(), 0];
  };
  // Which towers are clad whole in polished metal, and the few of them in gold.
  let golds = 0;
  const cladOf = (r: () => number, l: Lot, h: number): number | undefined => {
    if (golds < CLAD.gold && l.z > 60 && h > CLAD.goldAbove && r() < 0.5) { golds++; return METAL.gold; }
    if (r() > CLAD.share) return undefined;
    return pick(r, CLADS);
  };
  // Builds one thing at a place in its own frame, as building id; drops it if the dome hides it from the view.
  const make = (x: number, z: number, turnDeg: number, r: () => number, build: () => V3[], h: number, tone?: number, metal?: number): boolean => {
    const id = rows8.length;
    b.at(x, z, turnDeg * D2R, id);
    const beacons = build();
    if (!shows(b.built())) { b.drop(); hidden++; return false; }
    rows8.push(row(r, tone, metal));
    tops.push({ h, at: beacons.map((q) => b.place(q)) });
    count++;
    return true;
  };

  for (const m of marks) {
    if (!wants(m.name)) continue;
    const r = seeded(m.l.seed ^ 0x5bd1e995);
    make(m.l.x, m.l.z, m.name === 'flank' ? bearingOf(m.l) : 0, r, () => LANDMARK[m.name](b, { w: m.l.w, d: m.l.d, h: m.h, r, edge: K.gold, simple: false, y0: 0, seen: [true, true, true, true] }).beacons, m.h, m.name === 'flank' ? 0.62 : 0.3, METAL.bronze);
    await slice();
  }

  for (const blk of blocks) {
    const L = blk.lots, r = seeded(L[0].seed ^ 0x2c1b3c6d), B = BANDS[blk.band];
    const bear = L.map(bearingOf), mid = (bear[0] + ((bear[L.length - 1] - bear[0] + 360) % 360) / 2) % 360;
    const rad = Math.hypot(L[0].x, L[0].z), half = ((bear[L.length - 1] - bear[0] + 360) % 360) / 2 * D2R;
    const fr = rad - (rad * (1 - Math.cos(half))) / 2, fx = Math.sin(mid * D2R) * fr, fz = Math.cos(mid * D2R) * fr;
    const c = Math.cos(mid * D2R), s = Math.sin(mid * D2R);
    // Each lot across the block's frame, and its height.
    const xs = L.map((l) => (l.x - fx) * c - (l.z - fz) * s);
    const hs = L.map((l) => {
      let h = Math.max(30, Math.min(TALLEST, Math.round(l.tall * (JAG[0] + (JAG[1] - JAG[0]) * r()))));
      if (atEdge(l)) h = Math.max(30, Math.round(h * EDGE_STEP));
      if (Math.hypot(l.x, l.z) - Math.max(l.w, l.d) * 0.7 < SPIRE_ROOM.r) h = Math.min(h, SPIRE_ROOM.tall);
      return h;
    });
    const sections: Section[] = L.map((l, i) => ({
      x0: i === 0 ? xs[0] - l.w / 2 - 1 : (xs[i - 1] + xs[i]) / 2,
      x1: i === L.length - 1 ? xs[i] + l.w / 2 + 1 : (xs[i] + xs[i + 1]) / 2,
      h: hs[i],
    }));
    const simple = fz < BACK, seen = seenAt(mid), D = B.deep + 1;
    const towers = blk.band < TOWER.bands && !simple && hs.every((h) => h >= TOWER.above);
    const roll = pick(r, ROLLS), tone = (() => { const t = pick(r, TONES); return t[0] + (t[1] - t[0]) * r(); })();
    if (!towers) {
      // Now and then a stretch of a terrace rises as a tower, so the city climbs to the spire with no flat plain.
      const rise = sections.map((sc, i) => !simple && blk.band >= MIDDLE.from && sections.length > 1 && r() < MIDDLE.share[blk.band] ? Math.min(MIDDLE.most, Math.round(hs[i] * (MIDDLE.by[0] + (MIDDLE.by[1] - MIDDLE.by[0]) * r()))) : 0);
      rise.forEach((h, i) => { if (h) sections[i].tower = true; });
      let top = 0;
      if (wants('terrace')) make(fx, fz, mid, r, () => { const t = terrace(b, { D, sections, r, seen, simple, steps: blk.band < 3 ? 2 : 1, roll }); top = t.top; return t.beacons; }, Math.max(...hs), tone);
      for (let i = 0; i < L.length; i++) {
        if (!rise[i] || !top) continue;
        const l = L[i], near = new Set(placed.filter((q) => Math.hypot(q.x - l.x, q.z - l.z) < APART).map((q) => q.name));
        const free = MIDDLE.deal.filter(([n]) => !near.has(n)), name = pick(r, free.length ? free : MIDDLE.deal);
        const metal = cladOf(r, l, rise[i]);
        if (wants(name) && make(l.x, l.z, bearingOf(l), r, () => TALL[name](b, { w: (sections[i].x1 - sections[i].x0) * 0.82, d: D * 0.8, h: rise[i], r, edge: pick(r, EDGES), simple: false, y0: top - 0.6, seen: seenAt(bearingOf(l)), clad: metal !== undefined }).beacons, rise[i], undefined, metal)) placed.push({ x: l.x, z: l.z, name });
      }
      await slice();
      continue;
    }
    // A podium the length of the block, and the towers on it.
    let top = 0;
    if (wants('terrace')) make(fx, fz, mid, r, () => { top = terrace(b, { D, sections, r, seen, simple, podium: Math.round(PODIUM[0] + (PODIUM[1] - PODIUM[0]) * r()), steps: 1, roll }).top; return []; }, 0, tone);
    top = top || PODIUM[1];
    const y0 = top - 0.6;
    let i = 0;
    while (i < L.length) {
      const l = L[i];
      if (i + 1 < L.length && r() < PAIRS.twin && Math.min(hs[i], hs[i + 1]) > 110 && wants('twin')) {
        const h = Math.round((hs[i] + hs[i + 1]) / 2), xa = xs[i], xb = xs[i + 1];
        if (make(fx, fz, mid, r, () => twin(b, xa, xb, (l.w + L[i + 1].w) / 2, D, h, y0, r), h)) {
          placed.push({ x: (l.x + L[i + 1].x) / 2, z: (l.z + L[i + 1].z) / 2, name: 'twin' });
          talls.push({ x: (l.x + L[i + 1].x) / 2, z: (l.z + L[i + 1].z) / 2, h, band: blk.band, turn: mid, id: rows8.length - 1 });
        }
        i += 2;
        continue;
      }
      const near = new Set(placed.filter((q) => Math.hypot(q.x - l.x, q.z - l.z) < APART).map((q) => q.name));
      const free = DEAL.filter(([n]) => !near.has(n)), name = pick(r, free.length ? free : DEAL);
      const metal = cladOf(r, l, hs[i]);
      if (wants(name) && make(l.x, l.z, bearingOf(l), r, () => TALL[name](b, { w: l.w, d: Math.min(l.d + 4, D), h: hs[i], r, edge: pick(r, EDGES), simple: false, y0, seen: seenAt(bearingOf(l)), clad: metal !== undefined }).beacons, hs[i], undefined, metal)) {
        placed.push({ x: l.x, z: l.z, name });
        talls.push({ x: l.x, z: l.z, h: hs[i], band: blk.band, turn: bearingOf(l), id: rows8.length - 1 });
        // A deck high up joining it to the tower before it in the block.
        const prev = talls[talls.length - 2];
        if (i > 0 && prev && Math.hypot(prev.x - l.x, prev.z - l.z) < 60 && r() < PAIRS.deck && wants('deck')) {
          const xp = (prev.x - fx) * c - (prev.z - fz) * s;
          make(fx, fz, mid, r, () => { deck(b, xp, xs[i], Math.min(prev.h, hs[i]) * (0.7 + 0.12 * r()), D * 0.4); return []; }, 0);
        }
      }
      i += 1;
      await slice();
    }
    await slice();
  }

  // Bridges across the canyons between some close tall towers of a row, at several heights: dark, lit along their
  // underside, gold on top.
  {
    const r = seeded(4417);
    for (let i = 0; i < talls.length; i++) for (let j = i + 1; j < talls.length; j++) {
      const A = talls[i], Bt = talls[j];
      if (A.band !== Bt.band || A.h < BRIDGE.tall || Bt.h < BRIDGE.tall) continue;
      const dx = Bt.x - A.x, dz = Bt.z - A.z, len = Math.hypot(dx, dz);
      if (len > BRIDGE.near || len < 30 || r() > BRIDGE.share) continue;
      const a = A.turn * D2R, cc = Math.cos(a), sn = Math.sin(a), lx = dx * cc - dz * sn, lz = dx * sn + dz * cc, y = Math.min(A.h, Bt.h) * (0.3 + 0.4 * r());
      b.at(A.x, A.z, a, A.id);
      beam(b, [0, y, 0], [lx, y, lz], BRIDGE.w, BRIDGE.h, K.dark);
      beam(b, [0, y - BRIDGE.h / 2 - 0.3, 0], [lx, y - BRIDGE.h / 2 - 0.3, lz], 1.2, 0.5, K.light);
      beam(b, [0, y + BRIDGE.h / 2 + 0.3, 0], [lx, y + BRIDGE.h / 2 + 0.3, lz], BRIDGE.w + 0.8, 0.6, K.gold);
    }
  }
  await slice();
  const table = towerTable(rows8), look = makeLook(table);
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
  // A road is driven only where it runs through the city: never across a wedge of open land, the jungle or the dunes.
  const open = (deg: number, rad: number) => { const a = deg * D2R; return !districtAt(Math.sin(a) * rad, Math.cos(a) * rad) || districtAt(Math.sin(a) * rad, Math.cos(a) * rad)?.kind === 'procession'; };
  const arcs: [number, number, number][] = [];
  for (const ring of [RINGS[0], RINGS[1], RINGS[2]]) {
    let from = -1;
    for (let deg = TRAFFIC.clear; deg <= 360 - TRAFFIC.clear; deg++) {
      const ok = open(deg, ring) && deg < 360 - TRAFFIC.clear;
      if (ok && from < 0) from = deg;
      if (!ok && from >= 0) { if (deg - from > 12) arcs.push([ring, from, deg - 1]); from = -1; }
    }
  }
  for (const [ring, from, to] of arcs) for (const side of [-1, 1]) {
    const rad = ring + side * TRAFFIC.lane, run = rad * (to - from) * D2R, n = Math.round(run / TRAFFIC.ring / 2);
    for (let i = 0; i < n; i++) life.push({ mode: MODE.arc, a: [rad, TRAFFIC.y, r(), (side * speed()) / run], b: [from * D2R, to * D2R, 0, 0], look: tail(side) });
  }
  for (const bearing of AVENUES) {
    if (bearing === 0) continue;
    let end = PLAZA + ROAD;
    while (end < CITY.r && open(bearing, end + 4)) end += 4;
    const run = [PLAZA + ROAD, end];
    if (run[1] - run[0] < 40) continue;
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
  // With ?hook=1, what was built, for the scripts: the triangles, the buildings and the blocks.
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('hook')) (window as unknown as { __towers?: unknown }).__towers = { tris: b.tris, towers: count, hidden, blocks: blocks.length, talls: talls.length };

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
