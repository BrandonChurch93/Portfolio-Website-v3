// Makes the land: the top of the planet that the city, the trees, the pyramid and the spire stand on, and the
// desert with its dunes. It writes five files to public/world/:
//   land.bin         the ground, one mesh: a fine height field reduced to what the eye can tell, ending exactly on
//                    the land's edge (within() = 0) with a thin turned down edge so no gap shows under it
//   land-a.png       what lies where: grass, desert, and how far inside the land's edge
//   land-b.png       how open each place is, and the dust blown over it
//   land-lots.png    which building's lot a place is in, and the next nearest, for the paving to follow
//   land-light.png   the light that reaches each place after bouncing, with the buildings as blockers giving off
//                    their windows' light, and the trees and the pyramid as blockers
// Every map has three channels and no alpha: a browser may lose a color where its alpha is low.
// The dunes and the broken front are src/pieces/world/parts/land/field.ts, which the shader shares.
//
//   node scripts/world/parts/land/make.mjs [--draft]
import * as THREE from 'three';
import { bake } from '../../lib/bake.mjs';
import { creased } from '../../lib/mesh.mjs';
import { pack } from '../../lib/pack.mjs';
import { png } from '../../lib/png.mjs';
import { simplify } from '../../lib/surface.mjs';
import { L, P, light, linear, storeBounce } from '../../lib/plan.mjs';
import * as F from '../../../../src/pieces/world/parts/land/field.ts';
import { T, desert, footprint, towardEdge } from './shape.mjs';

const draft = process.argv.includes('--draft');
const began = performance.now(), say = (s) => console.log(`land: ${s} · ${((performance.now() - began) / 1000).toFixed(1)} s`);

// How fine everything is: the height field's spacing and how far the reduced mesh may stray from it, in units, and
// the maps' sizes in texels.
const FINE = draft ? { grid: 1.6, error: 0.12, map: 512, lots: 256, light: 192, hemi: 32, bounces: 1 } : { grid: 0.7, error: 0.1, map: 1024, lots: 512, light: 768, hemi: 256, bounces: 2 };
// How far the paving and the grass stand over the dome, the kerb between them, how far down the turned edge goes.
const LIFT = { paving: 0.45, grass: 0.1, skirt: 4 };
// The belt of grass along the city's front: how far in front of front() its kerb is, and the soft, uneven edge it
// fades out over toward the land's edge (from, to, and how much that wanders).
const BELT = { kerb: 3, from: 3, to: 12, wander: 9 };
// The city's own light on its walls, as radiance, for what it throws on the ground.
const CITY = 0.12;

// ---------------------------------------------------------------------------------------------------------------
// What lies where, on the map's grid.
const M = FINE.map, step = F.MAP.size / M, at = (i) => F.MAP.lo + (i + 0.5) * step;
const grassOf = (x, z) => {
  if (L.within(x, z) <= 0) return 0;
  const [pu, pv] = L.pyramidal(x, z);
  if (Math.max(Math.abs(pu), Math.abs(pv)) < L.PYRAMID.court) return 0;
  const kerb = L.ramp(-0.5, 0.5, z - L.front(x) - BELT.kerb);
  const soft = L.ramp(BELT.from, BELT.to + BELT.wander * L.noise(x / 23, 3, z / 23, 11), L.within(x, z));
  let k = kerb * soft;
  for (const [tx, tz, size] of P.TREES) {
    if (tz > L.front(tx)) continue;
    const d = Math.hypot(x - tx, z - tz), r = size * (2 + 0.8 * L.noise(x / 9, 5, z / 9, 12));
    if (d < r + 2) k = Math.max(k, L.ramp(r + 1, r - 1, d));
  }
  return k * (1 - desert(x, z));
};
const grass = new Float32Array(M * M), sand = new Float32Array(M * M), inside = new Float32Array(M * M);
for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
  const x = at(i), z = at(j), k = j * M + i;
  inside[k] = L.within(x, z);
  sand[k] = inside[k] > -8 ? desert(x, z) : 0;
  grass[k] = grassOf(x, z);
}
// Dust: the desert's sand blown out over the paving round it, and the dust of the break along the land's edge.
const blur = (src, r) => {
  const a = new Float32Array(M * M), b = new Float32Array(M * M), n = Math.max(1, Math.round(r / step));
  for (let j = 0; j < M; j++) { let s = 0; for (let i = -n; i <= n; i++) s += src[j * M + Math.min(M - 1, Math.max(0, i))]; for (let i = 0; i < M; i++) { a[j * M + i] = s / (2 * n + 1); s += src[j * M + Math.min(M - 1, i + n + 1)] - src[j * M + Math.max(0, i - n)]; } }
  for (let i = 0; i < M; i++) { let s = 0; for (let j = -n; j <= n; j++) s += a[Math.min(M - 1, Math.max(0, j)) * M + i]; for (let j = 0; j < M; j++) { b[j * M + i] = s / (2 * n + 1); s += a[Math.min(M - 1, j + n + 1) * M + i] - a[Math.max(0, j - n) * M + i]; } }
  return b;
};
const blown = blur(sand, 34);
const dustAt = (x, z) => {
  const w = L.within(x, z);
  return Math.min(1, 1.6 * sample(blown, x, z) * (1 - sample(sand, x, z)) + 0.55 * L.ramp(26, 0, w) + 0.25 * L.noise(x / 40, 7, z / 40, 13) * L.ramp(60, 0, w));
};
const sample = (data, x, z) => {
  const u = (x - F.MAP.lo) / step - 0.5, v = (z - F.MAP.lo) / step - 0.5, i = Math.max(0, Math.min(M - 2, Math.floor(u))), j = Math.max(0, Math.min(M - 2, Math.floor(v)));
  const fu = Math.min(1, Math.max(0, u - i)), fv = Math.min(1, Math.max(0, v - j));
  return (data[j * M + i] * (1 - fu) + data[j * M + i + 1] * fu) * (1 - fv) + (data[(j + 1) * M + i] * (1 - fu) + data[(j + 1) * M + i + 1] * fu) * fv;
};
{
  const out = new Uint8Array(M * M * 3);
  for (let k = 0; k < M * M; k++) out.set([grass[k] * 255, sand[k] * 255, Math.min(1, Math.max(0, inside[k] / 64)) * 255].map(Math.round), k * 3);
  png('public/world/land-a.png', M, M, out, 3);
}
// Which building's lot each place is in, and the next nearest: the paving is laid square to the lot's building, and
// where two lots meet is a street.
{
  const N = FINE.lots, s = F.MAP.size / N, out = new Uint8Array(N * N * 3);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = F.MAP.lo + (i + 0.5) * s, z = F.MAP.lo + (j + 0.5) * s;
    let a = -1, b = -1, da = Infinity, db = Infinity;
    if (L.within(x, z) > -6) for (const t of T) {
      const f = footprint(t, x, z);
      if (f < da) { b = a; db = da; a = t.i; da = f; } else if (f < db) { b = t.i; db = f; }
    }
    out.set([a + 1, b + 1, 0], (j * N + i) * 3);
  }
  png('public/world/land-lots.png', N, N, out, 3);
}
say('maps');

// ---------------------------------------------------------------------------------------------------------------
// The height of the land at a place.
function height(x, z) {
  const d = desert(x, z), g = sample(grass, x, z), base = L.dome(x, z) + d * F.relief(x, z) + (1 - d) * (LIFT.paving + (LIFT.grass - LIFT.paving) * g);
  const w = L.within(x, z);
  if (w > F.BREAK.reach + F.BREAK.cell) return base;
  const sl = F.slabOf(x, z), b = F.broken(L.within(sl.cx, sl.cz)) * (1 - desert(sl.cx, sl.cz));
  if (b <= 0) return base;
  const [ox, oz] = towardEdge(sl.cx, sl.cz), turn = (sl.b - 0.5) * 1.2, tx = ox * Math.cos(turn) - oz * Math.sin(turn), tz = ox * Math.sin(turn) + oz * Math.cos(turn);
  const drop = b * F.BREAK.drop * (0.55 + 0.9 * sl.a), tip = b * F.BREAK.tip * (0.4 + 1.2 * sl.b);
  return base - drop - tip * ((x - sl.cx) * tx + (z - sl.cz) * tz);
}

// The height field on a fine grid over the land, ending exactly on its edge: a vertex outside the land that a kept
// triangle uses is moved onto the edge.
const G = FINE.grid, R = L.LAND.rim + 2 * G, NG = Math.ceil((2 * R) / G) + 1, idOf = new Int32Array(NG * NG).fill(-1);
const pos = [], edge = [];
const onEdge = (x, z) => {
  for (let k = 0; k < 6; k++) {
    const w = L.within(x, z), e = 0.05, gx = (L.within(x + e, z) - L.within(x - e, z)) / (2 * e), gz = (L.within(x, z + e) - L.within(x, z - e)) / (2 * e), l2 = gx * gx + gz * gz || 1;
    x -= (w * gx) / l2; z -= (w * gz) / l2;
  }
  return [x, z];
};
const isIn = new Uint8Array(NG * NG);
for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) isIn[j * NG + i] = L.within(-R + i * G, -R + j * G) > 1e-3 ? 1 : 0;
const vert = (i, j) => {
  const k = j * NG + i;
  if (idOf[k] >= 0) return idOf[k];
  let x = -R + i * G, z = -R + j * G;
  if (!isIn[k]) [x, z] = onEdge(x, z);
  idOf[k] = pos.length / 3;
  pos.push(x, height(x, z), z);
  edge.push(isIn[k] ? 0 : 1);
  return idOf[k];
};
const idx = [];
for (let j = 0; j < NG - 1; j++) for (let i = 0; i < NG - 1; i++) {
  const a = j * NG + i, quad = [a, a + 1, a + NG, a + NG + 1];
  if (!quad.some((q) => isIn[q])) continue;
  // Each square is cut along whichever diagonal keeps the land's edge from folding.
  const tri = (p, q, r) => { if (isIn[p] || isIn[q] || isIn[r]) idx.push(vert(p % NG, Math.floor(p / NG)), vert(r % NG, Math.floor(r / NG)), vert(q % NG, Math.floor(q / NG))); };
  if ((i + j) % 2) { tri(a, a + 1, a + NG + 1); tri(a, a + NG + 1, a + NG); } else { tri(a, a + 1, a + NG); tri(a + 1, a + NG + 1, a + NG); }
}
// Drop what folded or shrank to nothing where the edge was moved onto.
const P0 = new Float32Array(pos), kept = [];
for (let t = 0; t < idx.length; t += 3) {
  const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
  const ux = P0[b * 3] - P0[a * 3], uz = P0[b * 3 + 2] - P0[a * 3 + 2], vx = P0[c * 3] - P0[a * 3], vz = P0[c * 3 + 2] - P0[a * 3 + 2];
  if (uz * vx - ux * vz > 1e-4) kept.push(a, b, c);
}
say(`height field: ${(P0.length / 3).toLocaleString('en-US')} vertices, ${(kept.length / 3).toLocaleString('en-US')} triangles`);
// Held in place: the land's edge, and every crest and every foot of a slip face, where the sand turns sharply, so
// the reduced mesh keeps the dunes' outline as fine as the height field's and no crest is cut short.
const lock = Uint8Array.from(edge), CREST = { step: 0.7, turn: 0.22 };
for (let v = 0; v < lock.length; v++) {
  const x = P0[v * 3], z = P0[v * 3 + 2];
  if (desert(x, z) <= 0.05) continue;
  const e = CREST.step, wx = F.WIND[0] * e, wz = F.WIND[1] * e, h = F.relief(x, z);
  if (Math.abs(F.relief(x + wx, z + wz) + F.relief(x - wx, z - wz) - 2 * h) > CREST.turn) lock[v] = 1;
}
const small = await simplify({ positions: P0, indices: Uint32Array.from(kept) }, { error: FINE.error, lock, strict: false });
{
  let flipped = 0;
  for (let t = 0; t < small.indices.length; t += 3) {
    const [a, b, c] = [small.indices[t], small.indices[t + 1], small.indices[t + 2]].map((i) => small.positions.subarray(i * 3, i * 3 + 3));
    if ((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]) <= 0) flipped++;
  }
  if (flipped) console.log(`land: ${flipped} triangles of the reduced mesh face down`);
}
say(`reduced: ${(small.indices.length / 3).toLocaleString('en-US')} triangles (${small.rounds} rounds, ${small.holes} holes)`);
const top = creased({ positions: small.positions, indices: small.indices }, 32);
// A vertex that only thin triangles use has no normal of its own: it takes straight up, as the ground round it is.
{
  let none = 0;
  for (let v = 0; v < top.normals.length / 3; v++) if (!(Math.hypot(top.normals[v * 3], top.normals[v * 3 + 1], top.normals[v * 3 + 2]) > 0.5)) { top.normals.set([0, 1, 0], v * 3); none++; }
  if (none) console.log(`land: ${none} vertices had no normal`);
}

// The turned down edge: a strip from every open edge of the top straight down.
const open = new Map();
for (let t = 0; t < top.indices.length; t += 3) for (let k = 0; k < 3; k++) {
  const a = top.indices[t + k], b = top.indices[t + ((k + 1) % 3)];
  const pa = top.positions.subarray(a * 3, a * 3 + 3), pb = top.positions.subarray(b * 3, b * 3 + 3);
  const ka = `${pa[0]},${pa[2]}`, kb = `${pb[0]},${pb[2]}`, key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
  if (open.has(key)) open.delete(key); else open.set(key, [a, b]);
}
const sp = [], sn = [], si = [];
for (const [a, b] of open.values()) {
  const pa = top.positions.subarray(a * 3, a * 3 + 3), pb = top.positions.subarray(b * 3, b * 3 + 3);
  let nx = -(pb[2] - pa[2]), nz = pb[0] - pa[0];
  const l = Math.hypot(nx, nz) || 1;
  nx /= l; nz /= l;
  const base = sp.length / 3;
  sp.push(pa[0], pa[1], pa[2], pb[0], pb[1], pb[2], pa[0], pa[1] - LIFT.skirt, pa[2], pb[0], pb[1] - LIFT.skirt, pb[2]);
  for (let k = 0; k < 4; k++) sn.push(nx, 0, nz);
  si.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
}
const nTop = top.positions.length / 3;
const ground = {
  positions: Float32Array.from([...top.positions, ...sp]),
  normals: Float32Array.from([...top.normals, ...sn]),
  indices: Uint32Array.from([...top.indices, ...si.map((v) => v + nTop)]),
};
say(`ground: ${(ground.indices.length / 3).toLocaleString('en-US')} triangles, ${open.size} edges turned down`);

// ---------------------------------------------------------------------------------------------------------------
// The light: worked out at every texel of land-light.png that is on the land, on a grid of the land itself, with
// what stands on it as blockers.
const NL = FINE.light, ls = F.MAP.size / NL, lat = (i) => F.MAP.lo + (i + 0.5) * ls;
const lid = new Int32Array(NL * NL).fill(-1), lp = [], lalb = [];
const SAND = linear('copper-light').map((v, k) => v * 0.55 + linear('text-2')[k] * 0.25), PAVE = linear('text-3').map((v) => v * 0.28), GRASS = linear('bronze').map((v) => v * 0.45);
for (let j = 0; j < NL; j++) for (let i = 0; i < NL; i++) {
  const x = lat(i), z = lat(j);
  if (L.within(x, z) <= 0.2) continue;
  lid[j * NL + i] = lp.length / 3;
  lp.push(x, height(x, z), z);
  const d = desert(x, z), g = sample(grass, x, z) * (1 - d);
  lalb.push(...[0, 1, 2].map((k) => SAND[k] * d + GRASS[k] * g + PAVE[k] * (1 - d - g)));
}
const li = [];
for (let j = 0; j < NL - 1; j++) for (let i = 0; i < NL - 1; i++) {
  const a = lid[j * NL + i], b = lid[j * NL + i + 1], c = lid[(j + 1) * NL + i], d = lid[(j + 1) * NL + i + 1];
  if (a >= 0 && b >= 0 && c >= 0) li.push(a, c, b);
  if (b >= 0 && c >= 0 && d >= 0) li.push(b, c, d);
}
const lpos = new Float32Array(lp), lnor = new Float32Array(lpos.length);
for (let v = 0; v < lpos.length / 3; v++) {
  const x = lpos[v * 3], z = lpos[v * 3 + 2], e = ls * 0.5;
  const gx = (height(x + e, z) - height(x - e, z)) / (2 * e), gz = (height(x, z + e) - height(x, z - e)) / (2 * e), l = Math.hypot(gx, 1, gz);
  lnor.set([-gx / l, 1 / l, -gz / l], v * 3);
}
const geo = (g) => { const n = g.toNonIndexed ? g : g; return { positions: Float32Array.from(n.attributes.position.array), normals: Float32Array.from(n.attributes.normal.array), indices: Uint32Array.from(n.index ? n.index.array : [...Array(n.attributes.position.count).keys()]) }; };
const join = (list) => {
  const out = { positions: [], normals: [], indices: [], emit: [] };
  for (const { m, emit } of list) {
    const base = out.positions.length / 3;
    out.positions.push(...m.positions); out.normals.push(...m.normals); out.indices.push(...m.indices.map((v) => v + base));
    for (let v = 0; v < m.positions.length / 3; v++) out.emit.push(...emit(m.normals[v * 3 + 1]));
  }
  return { positions: Float32Array.from(out.positions), normals: Float32Array.from(out.normals), indices: Uint32Array.from(out.indices), emit: Float32Array.from(out.emit) };
};
const hot = linear('hot').map((v) => Math.PI * CITY * v), none = () => [0, 0, 0];
const blocks = join(T.map((t) => {
  const g = new THREE.BoxGeometry(t.w, t.tall + 2, t.d).rotateY(Math.atan2(t.s, t.c)).translate(t.x, L.ground(t.x, t.z) - 2 + (t.tall + 2) / 2, t.z);
  return { m: geo(g), emit: (ny) => (Math.abs(ny) < 0.5 ? hot : [0, 0, 0]) };
}).concat([{ m: geo(new THREE.CylinderGeometry(2, L.SPIRE.foot / 2, L.SPIRE.tall, 8, 1).translate(0, L.SPIRE.tall / 2, 0)), emit: (ny) => (Math.abs(ny) < 0.5 ? hot : [0, 0, 0]) }]));
const trees = join(P.TREES.filter(([x, z, size]) => L.within(x, z) > size).map(([x, z, size]) => ({ m: geo(new THREE.IcosahedronGeometry(size, 1).scale(1, 0.85, 1).translate(x, L.ground(x, z) + size * 1.15, z)), emit: none })));
const pyr = (() => {
  const g = new THREE.ConeGeometry(L.PYRAMID.base / Math.SQRT2, L.PYRAMID.tall, 4, 1).rotateY(Math.PI / 4 + L.PYRAMID.turn * L.D2R).translate(L.PYRAMID.x, L.ground(L.PYRAMID.x, L.PYRAMID.z) + L.PYRAMID.tall / 2, L.PYRAMID.z);
  return join([{ m: geo(g.toNonIndexed()), emit: none }]);
})();
const lights = light();
const scene = {
  meshes: [
    { name: 'land', positions: lpos, normals: lnor, indices: Uint32Array.from(li), albedo: Float32Array.from(lalb), receive: true },
    { name: 'blocks', ...blocks, albedo: linear('text-3').map((v) => v * 0.35), receive: false },
    { name: 'trees', positions: trees.positions, normals: trees.normals, indices: trees.indices, albedo: linear('bronze').map((v) => v * 0.3), receive: false },
    { name: 'pyramid', positions: pyr.positions, normals: pyr.normals, indices: pyr.indices, albedo: linear('copper-light').map((v) => v * 0.45), receive: false },
  ],
  moon: lights.moon, core: null, sky: lights.sky,
};
const stats = {};
const lit = await bake(scene, { samples: { core: 0, moon: draft ? 4 : 16, hemi: FINE.hemi }, bounces: FINE.bounces, reach: 120, stats });
say(`light: ${stats.vertices} vertices, ${(stats.rays / 1e6).toFixed(0)} million rays`);
{
  const out = new Uint8Array(NL * NL * 6), have = new Uint8Array(NL * NL), l = lit.land;
  for (let k = 0; k < NL * NL; k++) {
    const v = lid[k];
    if (v < 0) continue;
    const x = lat(k % NL), z = lat(Math.floor(k / NL));
    out.set([l.open[v], dustAt(x, z), 0, storeBounce(l.bounce[v * 3]), storeBounce(l.bounce[v * 3 + 1]), storeBounce(l.bounce[v * 3 + 2])].map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255)), k * 6);
    have[k] = 1;
  }
  // Out past the land's edge each texel takes its nearest neighbour's light, so the edge is never darkened by
  // what lies beyond it.
  for (let pass = 0; pass < 6; pass++) {
    const was = have.slice();
    for (let j = 0; j < NL; j++) for (let i = 0; i < NL; i++) {
      const k = j * NL + i;
      if (was[k]) continue;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= NL || jj >= NL || !was[jj * NL + ii]) continue;
        out.copyWithin(k * 6, (jj * NL + ii) * 6, (jj * NL + ii) * 6 + 6);
        have[k] = 1;
        break;
      }
    }
  }
  const b = new Uint8Array(NL * NL * 3), light3 = new Uint8Array(NL * NL * 3);
  for (let k = 0; k < NL * NL; k++) { b.set(out.subarray(k * 6, k * 6 + 3), k * 3); light3.set(out.subarray(k * 6 + 3, k * 6 + 6), k * 3); }
  png('public/world/land-b.png', NL, NL, b, 3);
  png('public/world/land-light.png', NL, NL, light3, 3);
}

pack('public/world/land.bin', [{ name: 'ground', positions: ground.positions, indices: ground.indices, attributes: { normal: { data: ground.normals, size: 3, as: 'i16' } }, info: { top: top.indices.length / 3 } }], {
  draft, map: { a: 'land-a.png', b: 'land-b.png', lots: 'land-lots.png', light: 'land-light.png' }, lift: LIFT,
});
say('done');
