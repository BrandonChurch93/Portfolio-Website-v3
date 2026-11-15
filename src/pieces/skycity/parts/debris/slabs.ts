import * as THREE from 'three';
import { seeded } from '../../../../world/build';
import { CHAMFER, type Cell, Mesh, type Plane, type V3, dot, unit } from './hull';
import { CLIP, type Look, ROCK, boulder, broadleaf, canopy, cell, conifer, edgeAt, outline, place, plain, rockLift, rod, root, solid, turned } from './kit';
import { KIND } from './look';

// The great slabs: each a piece of the world torn off with what stood on it. The world is land: a city of great
// buildings on its crown and a wild forest over hills round it. So on a slab's top is a length of that land, its
// earth, its road, its trees, a piece of what was built on it, cut off where it was torn, with roots hanging out of
// the torn earth, and under it the planet's rock in its beds, broken away in steps. Each is built in its own frame,
// in units, with its ground at y = 0, and none is like another.

export interface Slab { mesh: Mesh; name: string }

const TAU = Math.PI * 2;
const rockFace = (tag: number, n: V3): Cell => (tag === CHAMFER ? [KIND.rock, 0.6, 1, 0] : ROCK(0.35 + 0.3 * Math.abs(n[0]) + 0.2 * Math.abs(n[2]), 0));
const top = (k: Cell): Look => (tag, n) => (tag === 2 ? k : rockFace(tag, n));
const EARTH = cell(KIND.earth);
const STONE = (t = 0.5) => cell(KIND.stone, t);
const DARK = cell(KIND.dark);
const GOLD = cell(KIND.gold), BRONZE = cell(KIND.bronze);
const SECTION = cell(KIND.section);

// The ground of a slab and the rock under it. Returns the planes it was torn along, for what stands on it to be
// cut by. `R` is about how far it reaches, `T` how thick its ground is, `deep` how far its rock hangs.
function body(m: Mesh, r: () => number, R: number, T: number, deep: number, ground: Cell, seed: number): Plane[] {
  const sides = outline(r, 9, R, 0.55);
  const chips: Plane[] = [];
  for (let i = 0; i < 3; i++) {
    const a = r() * TAU, n = unit([Math.cos(a), 0.8 + 0.7 * r(), Math.sin(a)]), at: V3 = [Math.cos(a) * R * (0.68 + 0.14 * r()), 0, Math.sin(a) * R * (0.68 + 0.14 * r())];
    chips.push({ n, d: dot(n, at) });
  }
  const lift = rockLift(seed, 0.9, 0.08), ground0 = rockLift(seed + 1, 0.6, 0.09);
  // An earthen top rolls a little, as land does. Paving would not.
  const earthen = ground[0] === KIND.earth;
  m.solid(solid(R * 1.4, T / 2, R * 1.4, { at: [0, -T / 2, 0], clip: [...sides, ...chips], bevel: 0.7 }), top(ground), { step: 14, lift: (p, tag) => (tag === 2 ? ground0(p) : lift(p)), reach: 5, keep: (t) => t === 2 && !earthen });
  // Lobes of the same ground reaching out past the main outline at a few places, a little lower, so the torn edge
  // goes in and out and is never one clean polygon.
  for (let i = 0; i < 3; i++) {
    const a = r() * TAU, far = edgeAt(sides, a), w = R * (0.25 + 0.2 * r()), dip = 0.4 + 1.2 * r();
    const c: V3 = [Math.cos(a) * (far - w * 0.35), -dip, Math.sin(a) * (far - w * 0.35)];
    const lobe = outline(r, 7, w, 0.7).map((p) => ({ n: p.n, d: p.d + dot(p.n, c) }));
    m.solid(solid(w * 1.4, T / 2, w * 1.4, { at: [c[0], -T / 2 - dip, c[2]], clip: lobe, bevel: 0.6 }), top(ground), { step: 10, lift: (p, tag) => (tag === 2 ? ground0(p) : lift(p)), reach: 4, keep: (t) => t === 2 && !earthen });
  }
  // The rock it was torn from: masses of it hanging at odd places under the ground and at odd slants, some
  // reaching out past the edge, each broken off at its foot along a bed or a joint, so the underside is a ragged
  // jumble of keels and not one cone.
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, off = R * (i ? 0.15 + 0.45 * r() : 0.1 * r()), cx = Math.cos(a) * off, cz = Math.sin(a) * off;
    const w = R * (i ? 0.25 + 0.3 * r() : 0.55 + 0.15 * r()), h = deep * (i ? 0.35 + 0.6 * r() : 0.6 + 0.3 * r()), y = -T + 2;
    const cuts: Plane[] = [];
    for (let k = 0; k < 5; k++) {
      const b = r() * TAU, nn = unit([Math.cos(b), -(0.25 + 1.1 * r()), Math.sin(b)]);
      cuts.push({ n: nn, d: dot(nn, [cx + Math.cos(b) * w * (0.3 + 0.35 * r()), y - h * (0.3 + 0.4 * r()), cz + Math.sin(b) * w * (0.3 + 0.35 * r())]) });
    }
    const foot = unit([(r() - 0.5) * 1.2, -1, (r() - 0.5) * 1.2]);
    cuts.push({ n: foot, d: dot(foot, [cx, y - h, cz]) });
    const under = sides.map((p) => ({ n: p.n, d: p.d * (0.8 + 0.3 * r()) }));
    m.solid(solid(w, h / 2 + 2, w * (0.7 + 0.5 * r()), { at: [cx, y - h / 2, cz], turn: [0, r() * TAU, 0], clip: [...under, ...cuts], bevel: 0.6 }), rockFace, { step: 15, lift, reach: 4, small: 18 });
  }
  return sides;
}

// Roots out of the torn earth all round a slab's edge, hanging.
function roots(m: Mesh, r: () => number, sides: Plane[], n: number, long: number): void {
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, e = edgeAt(sides, a) - 1.2;
    if (!Number.isFinite(e)) continue;
    root(m, r, [Math.cos(a) * e, -1.5 - 3 * r(), Math.sin(a) * e], [Math.cos(a), 0, Math.sin(a)], long * (0.5 + 0.8 * r()), 0.5 + 0.5 * r());
  }
}

// Low growth on the forest's floor: tufts and shrubs in autumn's colors.
function undergrowth(m: Mesh, r: () => number, sides: Plane[], n: number, seed: number, keep: (x: number, z: number) => boolean = () => true): void {
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, e = edgeAt(sides, a), d = e * Math.sqrt(r()) * 0.9, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!keep(x, z)) continue;
    const s = 1.2 + 2.2 * r();
    canopy(m, s, place([x, s * 0.35, z]), cell(KIND.leaf, 0.25 + 0.6 * r()), seed + i * 3, 0.55, undefined, 0);
  }
}

// A lamp post: a dark mast, an arm, a lit lantern.
function lamp(m: Mesh, at: V3, turn: number, lean = 0, tall = 15): void {
  const base = place(at, [lean, turn, 0]);
  rod(m, 0.75, 1.4, 8, base, BRONZE);
  rod(m, 0.38, tall, 8, base, DARK, 0.3);
  m.geo(new THREE.BoxGeometry(4.2, 0.45, 0.45).translate(1.9, tall - 0.4, 0), base, DARK);
  m.geo(new THREE.BoxGeometry(1.5, 0.9, 1.1).translate(3.6, tall - 1.1, 0), base, cell(KIND.lamp, 0.6));
  m.geo(new THREE.BoxGeometry(1.9, 0.3, 1.5).translate(3.6, tall - 0.5, 0), base, BRONZE);
}

// A column of the old order: a base, a shaft that narrows, a capital of gold and its block. Broken at `cutAt` of its
// height if that is under 1.
function column(m: Mesh, at: V3, r: number, tall: number, cutAt = 1, turn: V3 = [0, 0, 0]): void {
  const base = place(at, turn), h = tall * cutAt;
  turned(m, [[0, 0], [r * 1.45, 0], [r * 1.45, 0.7], [r * 1.25, 1.1], [r * 1.12, 1.5], [r, 1.9], [r, Math.min(h, 2)]], 10, base, STONE(0.7));
  if (h > 2) {
    const end = Math.min(h, tall - 2.2);
    turned(m, [[0, 2], [r, 2], [r * 0.86, end], [0, end]], 10, base, STONE(0.6));
    if (cutAt < 1) turned(m, [[r * 0.86, end], [r * 0.6, end + r * 0.5], [r * 0.25, end + r * 0.2], [0, end + r * 0.6]], 7, base, STONE(0.5));
    else {
      turned(m, [[0, end], [r * 0.86, end], [r * 1.1, end + 0.6], [r * 1.35, end + 1.5], [0, end + 1.5]], 10, base, GOLD);
      m.geo(new THREE.BoxGeometry(r * 3, 0.9, r * 3).translate(0, end + 1.95, 0), base, STONE(0.8));
    }
  }
}

// II. A colonnade: a stepped floor of dressed stone on the forest's earth, a row of columns, three still carrying
// their beam and the rest broken at different heights, one beam fallen against them, and one column fallen across the
// earth in its drums, with the forest's growth come up round them.
function colonnade(seed: number): Slab {
  const r = seeded(seed), m = new Mesh(), R = 50;
  const sides = body(m, r, R, 8, 40, EARTH, seed);
  for (let i = 0; i < 3; i++) m.solid(solid(26 - i * 2.2, 0.6, 9 - i * 1.6, { at: [0, 0.6 + i * 1.2, -8], clip: sides, bevel: 0.2 }), (tag) => (tag === 2 && i === 2 ? cell(KIND.paving, 2, 0, 0.3) : tag === CLIP ? ROCK(0.5, 0) : tag === CHAMFER ? cell(KIND.stone, 0.7, 1) : STONE(0.6 + i * 0.1)));
  const cuts = [1, 1, 1, 0.55, 0.3, 0.8, 0.12];
  for (let i = 0; i < 7; i++) column(m, [-19.5 + i * 6.5, 3.6, -8], 1.55, 24, cuts[i]);
  m.solid(solid(10.2, 1.1, 2.4, { at: [-13, 3.6 + 24 + 1.1, -8], bevel: 0.2 }), plain(STONE(0.8)));
  m.solid(solid(10.4, 0.4, 2.6, { at: [-13, 3.6 + 24 + 2.5, -8], bevel: 0.1 }), plain(GOLD));
  m.solid(solid(6.2, 1.1, 2.4, { at: [-3.2, 22.7, -8], turn: [0, 0, -1.02], bevel: 0.2 }), plain(STONE(0.7)));
  for (let i = 0; i < 4; i++) {
    const d = place([-14 + i * 6.6 + r(), 1.55, 9 + i * 1.3], [Math.PI / 2, 0.2 + (r() - 0.5) * 0.3, 0]);
    turned(m, [[0, 0], [1.5, 0], [1.42, 5.6], [0, 5.6]], 10, d, STONE(0.5 + 0.2 * r()));
  }
  undergrowth(m, r, sides, 22, seed, (x, z) => z > 2 || Math.abs(x) > 26);
  broadleaf(m, r, [24, 0, 14], 17, 9, 0.55, seed + 40);
  roots(m, r, sides, 9, 14);
  return { mesh: m, name: 'colonnade' };
}

// IV. A stand of the forest: tall pines and broadleaves in autumn's colors on their floor of earth and fallen
// leaves, their roots hanging out of the torn earth all round.
function grove(seed: number): Slab {
  const r = seeded(seed), m = new Mesh(), R = 46;
  const sides = body(m, r, R, 9, 30, EARTH, seed);
  const stand: [number, number][] = [[-20, -14], [-6, -22], [10, -12], [24, -20], [-28, 6], [-10, 4], [8, 10], [22, 4], [-2, 24], [18, 24]];
  stand.forEach(([x, z], i) => {
    if (edgeAt(sides, Math.atan2(z, x)) < Math.hypot(x, z) + 4) return;
    if (i % 5 === 2) conifer(m, r, [x, 0, z], 26 + 12 * r(), 5.5 + 2 * r(), seed + i * 11);
    else broadleaf(m, r, [x, 0, z], 15 + 8 * r(), 8 + 4 * r(), 0.3 + 0.6 * r(), seed + i * 11);
  });
  undergrowth(m, r, sides, 34, seed);
  boulder(m, r, [6, 0.6, -2], 3.5, seed + 3, sides);
  roots(m, r, sides, 13, 22);
  return { mesh: m, name: 'grove' };
}

// V. A piece of one of the city's great buildings: a corner of its shaft, dark glass in a frame of stone with gold
// fins, on its plinth and a strip of its forecourt, broken off at a slant with its frame standing out of the break.
function tower(seed: number): Slab {
  const r = seeded(seed), m = new Mesh(), R = 42;
  const sides = body(m, r, R, 8, 36, EARTH, seed);
  m.solid(solid(22, 0.4, 22, { at: [2, 0.4, -2], clip: sides, bevel: 0.15 }), (tag) => (tag === 2 ? cell(KIND.paving, 2, 0, 0.78) : tag === CLIP ? EARTH : STONE(0.6)));
  m.solid(solid(17, 2, 17, { at: [4, 2.8, -4], clip: sides, bevel: 0.3 }), plain(STONE(0.7), ROCK(0.5, 4.8)));
  const brk: Plane[] = [{ n: unit([0.5, 1, 0.2]), d: 54 }, { n: unit([-0.35, 1, -0.25]), d: 58 }, { n: unit([0.1, 1, 0.6]), d: 57 }];
  m.solid(solid(13, 36, 13, { at: [4, 40, -4], clip: [...sides, ...brk], bevel: 0.3 }), (tag) => (tag === CLIP ? SECTION : tag === CHAMFER ? cell(KIND.facade, 0, 1, 0.1) : cell(KIND.facade, 0, 0, 0.1)));
  for (const [x, z] of [[-13, -13], [13, -13], [-13, 13], [13, 13], [0, 13.2], [0, -13.2], [13.2, 0], [-13.2, 0], [6.6, 13.2], [-6.6, 13.2], [13.2, 6.6], [13.2, -6.6]]) {
    const h = 34 + 24 * r();
    m.solid(solid(0.6, h / 2, 0.6, { at: [x + 4, 4.8 + h / 2, z - 4], clip: [...sides, { n: unit([r() - 0.5, 1, r() - 0.5]), d: 4.8 + h }], bevel: 0.12 }), plain(GOLD, DARK));
  }
  for (let i = 0; i < 4; i++) {
    const g = place([4 + (r() - 0.5) * 16, 48 + r() * 6, -4 + (r() - 0.5) * 16], [(r() - 0.5) * 1.4, r() * TAU, (r() - 0.5) * 1.4]);
    m.geo(new THREE.BoxGeometry(0.7, 9 + 6 * r(), 1.2).translate(0, 4, 0), g, DARK);
  }
  undergrowth(m, r, sides, 14, seed, (x, z) => Math.abs(x - 2) > 24 || Math.abs(z + 2) > 24);
  roots(m, r, sides, 6, 12);
  return { mesh: m, name: 'tower' };
}

// VI. A pylon of a temple gate: a wall that leans in as it rises, a cornice of gold, a recess with a mast of bronze in
// it, a sunk panel with marks of gold, torn through at one end. A paved way before it with two plinths whose figures
// are gone, and the fallen top of the pylon lying on the way.
function pylon(seed: number): Slab {
  const r = seeded(seed), m = new Mesh(), R = 64;
  const sides = body(m, r, R, 10, 54, EARTH, seed);
  m.solid(solid(R * 1.4, 0.35, 11, { at: [0, 0.35, 16], clip: sides, bevel: 0.1 }), (tag) => (tag === 2 ? cell(KIND.paving, 0, 0, 0.3) : tag === CLIP ? EARTH : STONE(0.6)));
  const lean = 0.2, brk: Plane = { n: unit([0.8, 1, 0.1]), d: 30 };
  const batter: Plane[] = [{ n: unit([1, lean, 0]), d: 22 }, { n: unit([-1, lean, 0]), d: 22 }, { n: unit([0, lean, 1]), d: 7 }, { n: unit([0, lean, -1]), d: 7 }];
  const wall = (tag: number, n: V3): Cell => (tag === CLIP ? ROCK(0.6, 0) : tag === CHAMFER ? cell(KIND.stone, 0.9, 1, 0.3) : n[1] > 0.7 ? cell(KIND.stone, 0.5) : cell(KIND.stone, 0.7, 0, 0.3));
  m.solid(solid(24, 20, 9, { at: [-6, 20, -10], cuts: batter, clip: [...sides, brk], bevel: 0.4 }), wall, { step: 14, lift: rockLift(seed + 3, 0.25, 0.1), reach: 2 });
  m.solid(solid(20, 1.2, 6.6, { at: [-8, 37, -10], clip: [...sides, brk], bevel: 0.2 }), plain(GOLD, ROCK(0.5, 0)));
  m.solid(solid(2.4, 15, 1, { at: [-8, 18, -2.4], clip: [brk] }), plain(DARK));
  rod(m, 0.6, 42, 8, place([-8, 0, -1.8]), BRONZE, 0.42);
  const panel = place([-19, 14, -1.2], [-lean * 0.9, 0, 0]);
  m.geo(new THREE.BoxGeometry(7, 14, 0.5), panel, DARK);
  for (let i = 0; i < 6; i++) {
    const y = -5 + i * 2.1, w = 1.2 + 2.8 * r();
    m.geo(new THREE.BoxGeometry(w, 1.1, 0.4).translate((r() - 0.5) * (5 - w), y, 0.3), panel, GOLD);
  }
  m.geo(new THREE.TorusGeometry(3.6, 0.35, 6, 24, Math.PI * 1.2).rotateZ(-0.1 * Math.PI).translate(0, 4.4, 0.4), panel, GOLD);
  for (const x of [-18, 10]) {
    m.solid(solid(4.5, 2.2, 9, { at: [x, 2.2, 22], clip: sides, bevel: 0.25 }), plain(STONE(0.6), ROCK(0.5, 0)));
    m.solid(solid(4.8, 0.35, 9.3, { at: [x, 4.7, 22], clip: sides, bevel: 0.1 }), plain(BRONZE, ROCK(0.5, 0)));
  }
  m.solid(solid(7, 3.6, 5, { at: [20, 3.6, 0], turn: [0, 0.5, 0.18], cuts: [{ n: [1, 0.4, 0], d: 5 }], bevel: 0.3 }), (tag, n) => (tag >= 10 ? ROCK(0.5, 0) : wall(tag, n)), { step: 5, lift: rockLift(seed + 9, 0.6, 0.2), reach: 2 });
  undergrowth(m, r, sides, 24, seed, (x, z) => (z < 3 || z > 29) && !(x > -32 && x < 20 && z > -22 && z < 3));
  conifer(m, r, [34, 0, -22], 28, 6.5, seed + 70);
  broadleaf(m, r, [-40, 0, 30], 16, 9, 0.8, seed + 80);
  roots(m, r, sides, 12, 20);
  return { mesh: m, name: 'pylon' };
}

// A tower of the city snapped off: bays and floors of dark glass in a frame, fins of polished metal at its corners,
// broken across its top in strips at different heights, with the frame and a floor or two standing out of the break.
function stump(m: Mesh, r: () => number, at: V3, hx: number, hz: number, tall: number, clip: Plane[], frame = 0): void {
  const strips = 3 + Math.floor(r() * 2), w = (2 * hx) / strips, lit = 0.04 + 0.08 * r();
  let top = 0;
  for (let i = 0; i < strips; i++) {
    const h = tall * (0.6 + 0.4 * r()), x = at[0] - hx + w * (i + 0.5);
    top = Math.max(top, h);
    const bn = unit([(r() - 0.5) * 1.2, 1, (r() - 0.5) * 1.2]), brk: Plane = { n: bn, d: dot(bn, [x, at[1] + h, at[2]]) };
    m.solid(solid(w / 2, tall / 2 + 2, hz, { at: [x, at[1] + tall / 2, at[2]], clip: [...clip, brk], bevel: 0.2 }), (tag) => (tag === CLIP ? SECTION : tag === CHAMFER ? cell(KIND.facade, frame, 1, lit) : cell(KIND.facade, frame, 0, lit)));
    // The steel of its floors, bent out of the break.
    for (let k = 0; k < 4; k++) {
      const g = place([x + (r() - 0.5) * w, at[1] + h - 0.5 - 2.6 * Math.floor(r() * 3), at[2] + (r() - 0.5) * hz * 1.8], [(r() - 0.5) * 1.2, r() * TAU, (r() - 0.5) * 1.2]);
      m.geo(new THREE.BoxGeometry(0.22, 2 + 4 * r(), 0.22).translate(0, 1, 0), g, cell(KIND.dark, 0, 1));
    }
  }
  for (const [x, z] of [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) {
    const h = tall * (0.45 + 0.5 * r());
    m.solid(solid(0.55, h / 2, 0.55, { at: [at[0] + x, at[1] + h / 2, at[2] + z], clip, bevel: 0.1 }), plain(r() < 0.5 ? GOLD : BRONZE, STONE(0.2)));
  }
  m.solid(solid(hx + 1.2, 1.2, hz + 1.2, { at: [at[0], at[1] + 1.2, at[2]], clip, bevel: 0.25 }), plain(STONE(0.5), EARTH));
  for (let i = 0; i < 2; i++) {
    const g = place([at[0] + (r() - 0.5) * hx * 1.6, at[1] + top * (0.75 + 0.2 * r()), at[2] + (r() - 0.5) * hz * 1.6], [(r() - 0.5) * 1.4, r() * TAU, (r() - 0.5) * 1.4]);
    m.geo(new THREE.BoxGeometry(0.6, 6 + 6 * r(), 1).translate(0, 3, 0), g, DARK);
  }
}

// I. A length of canyon street: a road ten wide with copper let into it between kerbs, the feet of the towers that
// walled it on both sides snapped off at different heights, a lamp still standing and one bent, a craft that was
// parked at the kerb crushed under fallen stone, and the street cut off at both ends where it was torn.
function canyon(seed: number): Slab {
  const r = seeded(seed), m = new Mesh(), R = 54;
  const sides = body(m, r, R, 8, 46, cell(KIND.paving, 2, 0, 0.1), seed);
  m.solid(solid(5.5, 0.4, R * 1.4, { at: [0, 0.1, 0], turn: [0, 0.1, 0], clip: sides }), (tag) => (tag === 2 ? cell(KIND.road, 5.5, 0, 0) : tag === CLIP ? ROCK(0.5, 0) : STONE(0.4)));
  for (const s of [-1, 1]) m.solid(solid(0.7, 0.7, R * 1.4, { at: [s * 6.2, 0.2, 0], turn: [0, 0.1, 0], clip: sides, bevel: 0.2 }), plain(STONE(0.7), ROCK(0.5, 0)));
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const z = -32 + i * 23 + (r() - 0.5) * 4, hx = 7 + 3 * r(), hz = 8.5 + 2 * r();
    stump(m, r, [s * (9 + hx) + z * 0.1, 0.5, z], hx, hz, 22 + 48 * r() * (i === 1 ? 1.3 : 1), sides, r() < 0.4 ? 1 : 0);
  }
  lamp(m, [-7.5, 0.5, 4], 0.1, 0, 12);
  lamp(m, [7.5, 0.5, -16], Math.PI + 0.1, 0.4, 12);
  // The craft at the kerb: a dark hull, its canopy, and the stone that came down on it.
  const craft = place([4, 1.4, 14], [0, 0.15, 0.08]);
  m.geo(new THREE.CapsuleGeometry(1.4, 6, 3, 8).rotateX(Math.PI / 2).scale(1.2, 0.7, 1), craft, DARK);
  m.geo(new THREE.SphereGeometry(1.2, 10, 6, 0, TAU, 0, Math.PI / 2).scale(1, 0.6, 1.8).translate(0, 0.6, -1), craft, cell(KIND.glass));
  m.geo(new THREE.BoxGeometry(3.4, 0.5, 1.4).translate(0, -0.4, 3.6), craft, BRONZE);
  boulder(m, r, [3, 2.6, 16], 2.8, seed + 5, sides);
  roots(m, r, sides, 4, 10);
  return { mesh: m, name: 'canyon' };
}

// III. A shard of one of the small mountains: a peak of rock in its beds, broken off with the slope it stood on, the
// jungle's trees on its lower slope and their roots hanging out of the torn earth.
function peak(seed: number): Slab {
  const r = seeded(seed), m = new Mesh(), R = 46;
  const sides = body(m, r, R, 8, 34, EARTH, seed);
  const lift = rockLift(seed + 2, 1.2, 0.09);
  for (let i = 0; i < 5; i++) {
    const h = (i ? 20 + 26 * r() : 62), w = (i ? 7 + 6 * r() : 13), x = i ? (r() - 0.5) * 30 : -4, z = i ? (r() - 0.5) * 24 : -2;
    const cuts: Plane[] = [];
    for (let k = 0; k < 7; k++) { const a = r() * TAU, n = unit([Math.cos(a), 0.35 + 0.5 * r(), Math.sin(a)]); cuts.push({ n, d: dot(n, [x + Math.cos(a) * w * 0.3, h * (0.55 + 0.3 * r()), z + Math.sin(a) * w * 0.3]) }); }
    for (let k = 0; k < 3; k++) { const a = r() * TAU, n = unit([Math.cos(a), (r() - 0.5) * 0.3, Math.sin(a)]); cuts.push({ n, d: dot(n, [x, 0, z]) + w * (0.6 + 0.3 * r()) }); }
    m.solid(solid(w * 1.3, h / 2 + 2, w * 1.3, { at: [x, h / 2 - 2, z], clip: [...sides, ...cuts], bevel: 0.6 }), (tag, n) => (tag === CHAMFER ? [KIND.rock, 0.6, 1, h] : ROCK(0.3 + 0.4 * Math.abs(n[0]), h + 6)), { step: 11, lift, reach: 4, small: 14 });
  }
  for (let i = 0; i < 7; i++) {
    const a = r() * TAU, d = edgeAt(sides, a) * (0.55 + 0.35 * r());
    broadleaf(m, r, [Math.cos(a) * d, 0, Math.sin(a) * d], 13 + 9 * r(), 7 + 4 * r(), 0.2 + 0.7 * r(), seed + i * 7);
  }
  undergrowth(m, r, sides, 26, seed);
  roots(m, r, sides, 10, 22);
  return { mesh: m, name: 'peak' };
}

// VII. A block of the city snapped off at its foundations: a podium of dark stone with four towers on it of different
// sizes and heights, and under it, in place of rock, the foundations themselves, torn out of the ground: piers of
// dressed stone and girders, with clods of rock still on them.
function block(seed: number): Slab {
  const r = seeded(seed), m = new Mesh(), R = 46;
  const sides = outline(r, 9, R, 0.3);
  m.solid(solid(R * 1.4, 3.5, R * 1.4, { at: [0, -3.5, 0], clip: sides, bevel: 0.5 }), (tag) => (tag === 2 ? cell(KIND.paving, 2, 0, 0.4) : tag === CHAMFER ? cell(KIND.stone, 0.4, 1) : STONE(0.25)), { step: 6, lift: rockLift(seed, 0.4, 0.1), reach: 3, keep: (t) => t === 2 });
  for (let i = 0; i < 14; i++) {
    const a = r() * TAU, d = edgeAt(sides, a) * (0.2 + 0.65 * r()), h = 10 + 22 * r();
    m.solid(solid(2 + 1.5 * r(), h / 2, 2 + 1.5 * r(), { at: [Math.cos(a) * d, -7 - h / 2, Math.sin(a) * d], turn: [(r() - 0.5) * 0.3, r(), (r() - 0.5) * 0.3], cuts: [{ n: unit([r() - 0.5, -1, r() - 0.5]), d: h / 2 - 2 * r() }], bevel: 0.3 }), (tag) => (tag >= 10 ? STONE(0.1) : tag === CHAMFER ? cell(KIND.stone, 0.4, 1) : STONE(0.3)));
    if (r() < 0.4) m.geo(new THREE.BoxGeometry(0.5, 8 + 8 * r(), 0.5).translate(0, -4, 0), place([Math.cos(a) * d + 2, -7 - h, Math.sin(a) * d], [(r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.8]), DARK);
    if (r() < 0.5) boulder(m, r, [Math.cos(a) * d, -9 - h * r(), Math.sin(a) * d], 2.5 + 3 * r(), seed + i);
  }
  const towers: [number, number, number, number, number][] = [[-14, -12, 11, 10, 70], [12, -14, 9, 9, 52], [-12, 14, 8, 9, 38], [14, 12, 10, 8, 60]];
  for (const [x, z, hx, hz, h] of towers) stump(m, r, [x, 0, z], hx, hz, h * (0.8 + 0.3 * r()), sides, r() < 0.5 ? 1 : 0);
  return { mesh: m, name: 'block' };
}

export const SLABS = [canyon, colonnade, peak, grove, tower, pylon, block] as const;
export const SLAB_NAMES = ['canyon', 'colonnade', 'peak', 'grove', 'tower', 'pylon', 'block'] as const;
