import * as THREE from 'three';
import { type Builder, seeded, slice } from '../../../../world/build';
import { AVENUES, CITY, DISTRICTS, DUNES, FOREST, PLANET, ROAD } from '../../layout';
import { D2R, KIND, bearing, fbm, gap, onDome, polar, ridged, smooth, tag, value } from './kit';
import { boulder } from './margin';

// The bare ground. The city ends at CITY.r and from there to the torn edge nothing is built: it is the planet's own
// surface, where the visitor sees its curve. Two wedges of it cut into the city at the front. It is bedrock under a
// skin of dust, in low swells and shallow terraces a few units high so the raking moon shows its form, cracked into
// slabs, with beds of rock breaking out of it along one strike; old roads run out from two avenues and give out in it;
// and where a world would have lakes there are pools of mirror polished metal. The planet's veins of gold show in
// section in every face where the ground broke (the floor's crust, in ./materials.ts).

// The heights the land is shaded by, as a share of this.
export const TALL = 10;
// How high the ground rises at most, how thick its beds of rock are, how far in from the city's edge it takes to
// rise, and how far from the jungle's and the dunes' ground.
export const BARE = { tall: 9, bed: 1.7, rise: 40, side: 18 } as const;
const OPEN = DISTRICTS.filter((d) => d.kind === 'open');

// How far inside the stretch between two bearings a place is, in units, below 0 outside it.
const inside = (r: number, deg: number, from: number, to: number) => {
  const span = ((to - from) % 360 + 360) % 360, da = ((deg - from) % 360 + 360) % 360;
  return da <= span ? Math.min(da, span - da) * D2R * r : -Math.min(da - span, 360 - da) * D2R * r;
};

// How much of a place is bare ground, 0 to 1: none in the city, the jungle or the dunes, and all of it out at the rim
// and in the open wedges.
export function bareness(x: number, z: number): number {
  const r = Math.hypot(x, z), deg = bearing(x, z);
  let d = r - CITY.r;
  for (const w of OPEN) d = Math.max(d, Math.min(r - w.r0, inside(r, deg, w.from, w.to)));
  let other = 1e9;
  for (const o of [FOREST, DUNES]) {
    if (r < o.r0 - 10) continue;
    other = Math.min(other, -inside(r, deg, o.from, o.to));
  }
  return smooth(0, BARE.rise, d) * smooth(0, BARE.side, other);
}

// The old roads: two avenues run on out of the city and give out in the bare ground, each at a bearing, from the
// city's edge as far as this.
export const OLD = [{ deg: 45, to: CITY.r + 66 }, { deg: 315, to: CITY.r + 46 }].filter((o) => AVENUES.includes(o.deg as (typeof AVENUES)[number]));
// How much a place is on an old road, 0 to 1. The road crumbles toward its end, unevenly.
export function oldRoad(x: number, z: number): number {
  const r = Math.hypot(x, z), deg = bearing(x, z);
  let k = 0;
  for (const o of OLD) {
    if (gap(deg, o.deg) > 6) continue;
    const across = Math.abs(gap(deg, o.deg) * D2R * r), end = o.to + 10 * (value(across * 0.4 + o.deg, 3.1) - 0.5);
    k = Math.max(k, (1 - smooth(ROAD / 2 - 1, ROAD / 2 + 1.5, across)) * (1 - smooth(end - 18, end, r)) * smooth(CITY.r - 12, CITY.r - 4, r));
  }
  return k;
}

// The pools of mirror polished metal: each a place on the map, how far its shore reaches, which way it is drawn out,
// its seed, and its metal (0 gold, 1 copper, 2 bronze). One in each open wedge, seen between the city's buildings, and
// one by the pyramid where the lake was, in the jungle.
export interface Pool { x: number; z: number; r: number; turn: number; seed: number; metal: number }
const wedge = (k: number, r: number) => { const w = OPEN[k]; return polar((w.from + w.to) / 2 + (k ? -1 : 1), r); };
export const POOLS: Pool[] = [
  { ...xz(wedge(0, 388)), r: 26, turn: 30, seed: 1, metal: 2 },
  { ...xz(wedge(1, 396)), r: 23, turn: -40, seed: 2, metal: 2 },
  { x: -449, z: 200, r: 23, turn: 70, seed: 3, metal: 2 },
];
function xz(v: THREE.Vector2) { return { x: v.x, z: v.y }; }
// How far a place is from a pool's shore, in units, below 0 on the metal. Its shore is a natural one, uneven.
function shoreOf(p: Pool, x: number, z: number): number {
  const a = p.turn * D2R, dx = x - p.x, dz = z - p.z, u = (dx * Math.cos(a) - dz * Math.sin(a)) / 1.3, v = dx * Math.sin(a) + dz * Math.cos(a);
  const t = Math.atan2(v, u), reach = p.r * (1 + 0.16 * Math.sin(2 * t + p.seed) + 0.09 * Math.sin(3 * t + 2 * p.seed) + 0.05 * Math.sin(7 * t + p.seed));
  return Math.hypot(u, v) - reach;
}
// Whether a place is on a pool, or within pad of its shore. The jungle's builder reads it to keep its trees off.
export function onPool(x: number, z: number, pad = 0): boolean {
  return POOLS.some((p) => shoreOf(p, x, z) < pad);
}
// How high a pool's metal stands over the planet's curve at its shore, and how much higher at its middle: it swells
// as a lens does, so its face turns toward the room's lights and carries them.
const LEVEL = 0.7, DOME = 1.1;

// How high the ground stands over the planet's curve at a place: level in the city and under the jungle and the dunes,
// and in the bare ground low swells cut into terraces, flattened under the old roads and sunk under the pools.
export function groundAt(x: number, z: number, m = bareness(x, z)): number {
  let h = 0;
  if (m > 0) {
    const n = 0.55 * fbm(x / 72, z / 72, 2) + 0.45 * ridged(x / 31 + 3.1, z / 31 - 1.7), wob = 0.25 * value(x / 23, z / 23);
    const raw = BARE.tall * m * n, t = raw / BARE.bed + wob, k = Math.floor(t), f = t - k;
    h = (k + (f < 0.68 ? (f / 0.68) * 0.3 : 0.3 + ((f - 0.68) / 0.32) * 0.7) - wob) * BARE.bed * smooth(0, 0.15, m);
    h *= 1 - 0.85 * oldRoad(x, z);
  }
  for (const p of POOLS) {
    if (Math.abs(x - p.x) > p.r * 1.7 + 16 || Math.abs(z - p.z) > p.r * 1.7 + 16) continue;
    const d = shoreOf(p, x, z);
    if (d < 14) h = d < 0 ? Math.min(h, LEVEL - 0.6) : Math.min(h, LEVEL + 0.3 + (h - LEVEL - 0.3) * smooth(1, 14, d));
  }
  return h;
}

// Lays a geometry built in the map's own space (x and z on the map, y over the ground there) on the bare ground.
function drape(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const p = g.getAttribute('position'), o = [0, 0, 0];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    onDome(x, groundAt(x, z) + p.getY(i), z, o, 0);
    p.setXYZ(i, o[0], o[1], o[2]);
  }
  return faceUp(g);
}
// Works out a shared geometry's normals so it faces up out of the ground, whichever way its triangles were wound.
function faceUp(g: THREE.BufferGeometry): THREE.BufferGeometry {
  g.computeVertexNormals();
  const n = g.getAttribute('normal'), p = g.getAttribute('position');
  let s = 0;
  for (let i = 0; i < n.count; i++) s += n.getX(i) * p.getX(i) + n.getY(i) * (p.getY(i) + PLANET.r) + n.getZ(i) * p.getZ(i);
  if (s < 0 && g.index) {
    const ix = g.index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
    g.index.needsUpdate = true;
    g.computeVertexNormals();
  }
  return g;
}

// The pools of mirror polished metal, and the dark stones round their shores.
export async function metals(b: Builder, made: THREE.Material): Promise<void> {
  const r = seeded(7731);
  // Round each pool's shore, dark stones half sunk, so the mirror lies in rock.
  const stones = [boulder(seeded(21), true), boulder(seeded(22), false)];
  for (const p of POOLS) for (let i = 0; i < 46; i++) {
    const th = (i / 46) * Math.PI * 2 + r() * 0.1, a = p.turn * D2R;
    let lo = 0, hi = p.r * 2;
    for (let it = 0; it < 14; it++) { const mid = (lo + hi) / 2, u = Math.cos(th) * mid * 1.3, v = Math.sin(th) * mid; if (shoreOf(p, p.x + u * Math.cos(a) + v * Math.sin(a), p.z - u * Math.sin(a) + v * Math.cos(a)) < 0) lo = mid; else hi = mid; }
    const rr = lo + 1 + r() * 1.5, u = Math.cos(th) * rr * 1.3, v = Math.sin(th) * rr, s2 = 0.8 + r() * r() * 2.6;
    const g = stones[i % 2].clone().scale(s2 * (0.8 + 0.5 * r()), s2 * (0.6 + 0.4 * r()), s2 * (0.8 + 0.5 * r())).rotateY(r() * 6.28).translate(p.x + u * Math.cos(a) + v * Math.sin(a), 0.4, p.z - u * Math.sin(a) + v * Math.cos(a));
    b.add(tag(drape(g), KIND.rock), made);
  }
  // The pools: a sheet of metal level with its shore and domed a little to its middle, so it carries a long bright
  // reflection that bends over it and not one flat color.
  for (const p of POOLS) {
    const rings = 9, seg = 72, pos: number[] = [], idx: number[] = [];
    pos.push(p.x, LEVEL + DOME, p.z);
    for (let k = 1; k <= rings; k++) for (let j = 0; j < seg; j++) {
      const th = (j / seg) * Math.PI * 2, a = p.turn * D2R;
      let lo = 0, hi = p.r * 2;
      for (let it = 0; it < 18; it++) {
        const mid = (lo + hi) / 2, u = Math.cos(th) * mid * 1.3, v = Math.sin(th) * mid;
        if (shoreOf(p, p.x + u * Math.cos(a) + v * Math.sin(a), p.z - u * Math.sin(a) + v * Math.cos(a)) < 0) lo = mid; else hi = mid;
      }
      const reach = lo + 0.8, t = k / rings, rr = reach * t, u = Math.cos(th) * rr * 1.3, v = Math.sin(th) * rr;
      pos.push(p.x + u * Math.cos(a) + v * Math.sin(a), LEVEL + DOME * (1 - t * t) - 0.25 * smooth(0.85, 1, t), p.z - u * Math.sin(a) + v * Math.cos(a));
    }
    for (let j = 0; j < seg; j++) idx.push(0, 1 + ((j + 1) % seg), 1 + j);
    for (let k = 1; k < rings; k++) for (let j = 0; j < seg; j++) {
      const a = 1 + (k - 1) * seg + j, b2 = 1 + (k - 1) * seg + ((j + 1) % seg), c = a + seg, d = b2 + seg;
      idx.push(a, b2, d, a, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const o = [0, 0, 0], pp = g.getAttribute('position');
    for (let i = 0; i < pp.count; i++) { onDome(pp.getX(i), pp.getY(i), pp.getZ(i), o, 0); pp.setXYZ(i, o[0], o[1], o[2]); }
    faceUp(g);
    b.add(tag(g, KIND.mirror, p.metal), made);
  }
}

// Bedrock breaking out of the bare ground: slabs of the planet's crust lifted and tilted, each with one face standing
// up as a low scarp and the other sinking back under the dust, as such beds do where they reach the surface. Their
// sides show the crust's layers. Each is a place on the map, how far across, which way it is drawn out, how high its
// scarp stands, the way its scarp faces, and a seed.
// The beds come to the surface along one strike, as they do across a whole country, so the slabs lie in lines.
const STRIKE = 64;
export interface Crop { x: number; z: number; r: number; turn: number; tall: number; face: number; seed: number }
export function outcrops(rim: (deg: number) => number): Crop[] {
  const r = seeded(4471), out: Crop[] = [];
  for (let k = 0; k < 900 && out.length < 40; k++) {
    let q: THREE.Vector2;
    if (r() < 0.22) { const w = OPEN[Math.floor(r() * OPEN.length)]; q = polar(w.from + r() * (w.to - w.from), w.r0 + 20 + r() * (CITY.r - w.r0)); }
    else { const deg = (r() - 0.5) * 2 * 128; q = polar(deg, CITY.r + 10 + r() * (rim(deg) - CITY.r - 14)); }
    const size = 8 + r() * r() * 22;
    if (bareness(q.x, q.y) < 0.75 || onPool(q.x, q.y, size + 4) || oldRoad(q.x, q.y) > 0.05) continue;
    if (Math.hypot(q.x, q.y) + size > rim(bearing(q.x, q.y)) - 2) continue;
    if (out.some((o) => Math.hypot(o.x - q.x, o.z - q.y) < (o.r + size) * 0.9)) continue;
    out.push({ x: q.x, z: q.y, r: size, turn: STRIKE + (r() - 0.5) * 50, tall: 1.2 + size * (0.05 + 0.25 * r() * r()), face: STRIKE + (r() < 0.7 ? 0 : 180), seed: r() * 100 });
  }
  return out;
}
