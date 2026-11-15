import * as THREE from 'three';
import { seeded } from '../../../../world/build';
import { CHAMFER, type Cell, Mesh, type Plane, type V3, unit } from './hull';
import { CLIP, ROCK, cell, place, rockLift, rod, solid, turned } from './kit';
import { KIND } from './look';

// The chunks, 10 to 50 across, and the fragments, 2 to 10: each kind is made once at about 30 units and drawn many
// times at many sizes. Most are rock broken along its joints and beds, stepped where a bed parted, some with the
// ground's paving still on them. A few are pieces of what was built: a drum of a column, a piece of wall with its
// window, a girder, a gold capstone.

// Each kind's geometry is moved so its middle is at the origin and scaled so it reaches 1 from it. `top` is where its
// rock's beds are counted from, in that same size.
export interface Kind { mesh: Mesh; top: number; face: V3 }

const TAU = Math.PI * 2;

// A broken block of rock: cut by beds (nearly level), joints (nearly upright) and a few cuts at any angle.
function rockBlock(r: () => number, hx: number, hy: number, hz: number, at: V3, turn: V3, bevel = true): ReturnType<typeof solid> {
  const cuts: Plane[] = [];
  const support = (n: V3) => hx * Math.abs(n[0]) + hy * Math.abs(n[1]) + hz * Math.abs(n[2]);
  const add = (n: V3, k: number) => { const u = unit(n); cuts.push({ n: u, d: support(u) * k }); };
  for (let i = 0; i < 2; i++) add([(r() - 0.5) * 0.3, i ? 1 : -1, (r() - 0.5) * 0.3], 0.8 + 0.15 * r());
  for (let i = 0; i < 3 + Math.floor(r() * 2); i++) { const a = r() * TAU; add([Math.cos(a), (r() - 0.5) * 0.4, Math.sin(a)], 0.6 + 0.3 * r()); }
  for (let i = 0; i < 2 + Math.floor(r() * 3); i++) { const z = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - z * z); add([s * Math.cos(a), z, s * Math.sin(a)], 0.55 + 0.35 * r()); }
  const b = 0.45 + 0.4 * r();
  return solid(hx, hy, hz, { cuts, at, turn, bevel: bevel ? b : 0 });
}

function finish(m: Mesh, top: number, face: V3): Kind {
  const b = m.center();
  const k = 1 / b.r;
  for (let i = 0; i < m.pos.length; i++) m.pos[i] *= k;
  // The beds' height goes with the piece's size and middle.
  for (let i = 0; i < m.cell.length; i += 4) if (m.cell[i] < 1.5) m.cell[i + 3] = (m.cell[i + 3] - b.mid[1]) * k;
  return { mesh: m, top: (top - b.mid[1]) * k, face };
}

// Rock: one, two or three blocks, each the next one down a bed and along, so it steps.
function rock(seed: number, crust: boolean): Kind {
  const r = seeded(seed), m = new Mesh();
  const lift = rockLift(seed, 1.1, 0.12), tone = r();
  const hx = 12 + 7 * r(), hy = 5 + 4 * r(), hz = 8 + 6 * r();
  const topY = hy, pave = cell(KIND.paving, Math.floor(r() * 3), 0, r() * 3);
  const parts = [rockBlock(r, hx, hy, hz, [0, 0, 0], [(r() - 0.5) * 0.2, r() * TAU, (r() - 0.5) * 0.2])];
  if (r() < 0.75) parts.push(rockBlock(r, hx * (0.5 + 0.3 * r()), hy * (0.7 + 0.4 * r()), hz * (0.5 + 0.3 * r()), [(r() - 0.5) * hx, -hy * (0.8 + 0.4 * r()), (r() - 0.5) * hz], [(r() - 0.5) * 0.3, r() * TAU, (r() - 0.5) * 0.3]));
  if (r() < 0.4) parts.push(rockBlock(r, hx * 0.4, hy * 0.6, hz * 0.4, [(r() - 0.5) * hx * 1.2, hy * 0.5, (r() - 0.5) * hz], [0, r() * TAU, 0]));
  parts.forEach((s, i) => m.solid(s, (tag, n) => (tag === CHAMFER ? [KIND.rock, tone, 1, topY] : crust && i === 0 && n[1] > 0.9 ? pave : ROCK(tone * 0.6 + 0.2 + 0.25 * Math.abs(n[0]), topY)), { step: 12, lift, reach: 4, small: 16 }));
  return finish(m, topY, [0, 1, 0]);
}

// A drum of a column, broken across at a slant.
function drum(seed: number): Kind {
  const r = seeded(seed), m = new Mesh();
  turned(m, [[0, -8], [6, -8], [6, 4], [0, 4]], 18, place([0, 0, 0]), cell(KIND.stone, 0.6));
  // Flutes: shallow ribs round it.
  for (let i = 0; i < 12; i++) m.geo(new THREE.BoxGeometry(0.7, 11.6, 0.5).translate(0, -2.2, 6.05), place([0, 0, 0], [0, (i / 12) * TAU, 0]), cell(KIND.stone, 0.4));
  turned(m, [[6, 4], [3.5, 6.5], [1.5, 5.2], [0, 7.5]], 9, place([0, 0, 0], [0, r(), 0]), cell(KIND.stone, 0.5, 1));
  rod(m, 6.6, 1.2, 18, place([0, -8, 0]), cell(KIND.gold));
  return finish(m, 8, [0, -1, 0]);
}

// A piece of a wall with its window and the frame round it, torn on every side.
function wall(seed: number): Kind {
  const r = seeded(seed), m = new Mesh();
  const torn: Plane[] = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + r() * 0.5; torn.push({ n: unit([Math.cos(a), Math.sin(a), (r() - 0.5) * 0.4]), d: 11 + 4 * r() }); }
  m.solid(solid(18, 18, 2.2, { clip: torn, bevel: 0.3 }), (tag, n) => (tag === CLIP ? ROCK(0.5, 14) : tag === CHAMFER ? cell(KIND.facade, 0, 1, 0.3) : Math.abs(n[2]) > 0.7 ? cell(KIND.facade, 0, 0, 0.3) : ROCK(0.5, 14)), { step: 5, lift: rockLift(seed, 0.8, 0.2), reach: 2, keep: (t) => t < 10 });
  m.solid(solid(16, 0.5, 2.8, { at: [0, -5, 0], clip: torn, bevel: 0.15 }), (tag) => (tag === CLIP ? ROCK(0.5, 0) : cell(KIND.bronze)));
  return finish(m, 14, [0, 0, 1]);
}

// A girder: a flange and web of dark steel, a plate of copper bolted to it, bent near one end.
function girder(seed: number): Kind {
  const r = seeded(seed), m = new Mesh(), bend = 0.3 + 0.3 * r();
  for (const [x0, len, ang] of [[0, 22, 0], [22, 12, bend]] as [number, number, number][]) {
    const at = place([x0 - 14, 0, 0], [0, 0, ang]);
    m.geo(new THREE.BoxGeometry(len, 0.7, 5).translate(len / 2, 3, 0), at, cell(KIND.dark));
    m.geo(new THREE.BoxGeometry(len, 0.7, 5).translate(len / 2, -3, 0), at, cell(KIND.dark));
    m.geo(new THREE.BoxGeometry(len, 6, 0.6).translate(len / 2, 0, 0), at, cell(KIND.dark));
  }
  m.geo(new THREE.BoxGeometry(7, 4.6, 0.4).translate(-2, 0, 0.5), place([0, 0, 0]), cell(KIND.copper));
  return finish(m, 0, [0, 0, 1]);
}

// A capstone: a small pyramid cased in gold, broken off along its foot, the rock of its core showing.
function capstone(seed: number): Kind {
  const r = seeded(seed), m = new Mesh();
  turned(m, [[11, 0], [0, 11]], 4, place([0, 0, 0], [0, Math.PI / 4, 0]), cell(KIND.gold));
  m.solid(solid(7.6, 3, 7.6, { at: [0, -2.4, 0], cuts: [{ n: unit([r() - 0.5, -1, r() - 0.5]), d: 2.4 }], bevel: 0.4 }), (tag) => (tag === CHAMFER ? [KIND.rock, 0.5, 1, 0] : ROCK(0.5, 0)), { step: 4, lift: rockLift(seed, 0.6, 0.2), reach: 2 });
  return finish(m, 0, [0, -1, 0]);
}

export const CHUNK_KINDS = 12;
export function chunkKinds(): Kind[] {
  const out: Kind[] = [];
  for (let i = 0; i < 8; i++) out.push(rock(500 + i * 17, i === 2 || i === 5));
  out.push(drum(700), wall(710), girder(720), capstone(730));
  return out;
}
// How often each kind is drawn: rock is most of it.
export const CHUNK_WEIGHT = [1, 1, 0.8, 1, 1, 0.8, 1, 1, 0.22, 0.18, 0.2, 0.12];

// Fragments, 2 to 10 across: single blocks, a few faces each, no chamfer and no roughening, which would be finer than
// a pixel. One is a sliver of gold, one a chip of paving.
function fragment(seed: number, kind: 'rock' | 'flake' | 'sliver' | 'gold' | 'paving'): Kind {
  const r = seeded(seed), m = new Mesh(), tone = r();
  const [hx, hy, hz] = kind === 'flake' ? [11 + 3 * r(), 1.6 + r(), 8 + 3 * r()] : kind === 'sliver' || kind === 'gold' ? [16 + 4 * r(), 2 + 1.5 * r(), 3.5 + 2 * r()] : [10 + 4 * r(), 5 + 4 * r(), 7 + 4 * r()];
  const s = rockBlock(r, hx, hy, hz, [0, 0, 0], [0, 0, 0], false);
  const flat: Cell = kind === 'gold' ? cell(KIND.gold) : ROCK(tone, 8);
  m.solid(s, (tag, n) => (kind === 'paving' && n[1] > 0.85 ? cell(KIND.paving, 0) : tag === CHAMFER ? [flat[0], flat[1], 1, flat[3]] : flat));
  return finish(m, 8, [0, 1, 0]);
}
export function fragmentKinds(): Kind[] {
  return [fragment(900, 'rock'), fragment(911, 'rock'), fragment(922, 'flake'), fragment(933, 'sliver'), fragment(944, 'flake'), fragment(955, 'gold'), fragment(966, 'paving'), fragment(977, 'sliver')];
}
export const FRAGMENT_WEIGHT = [1, 1, 1, 1, 1, 0.15, 0.2, 0.8];

export const pick = (w: readonly number[], x: number): number => {
  const sum = w.reduce((a, b) => a + b, 0);
  let t = x * sum;
  for (let i = 0; i < w.length; i++) { t -= w[i]; if (t <= 0) return i; }
  return w.length - 1;
};
