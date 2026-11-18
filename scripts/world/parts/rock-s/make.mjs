// Makes sculpt S of the rock and writes public/world/rock-s.bin, which the page shows with ?rock=s: picture 9's
// hollow as one solid body of about twenty great masses (masses.mjs, field.mjs), lit by the world's own light.
//
//   node scripts/world/parts/rock-s/make.mjs            the shipped file
//   node scripts/world/parts/rock-s/make.mjs --draft    fast and rough
//   --cell <units>                                     the grid the field is read on (draft 2.6, shipped 1.2)
//
// The steps: rubble is laid on what faces up and is seen; the field is turned into a mesh that keeps its sharp
// edges; what the visitor can never see is reduced hard and the rest to the budget; the mesh is split at its
// creases; it is lit by the baker with the planet round it blocking the light; and the torn rock is written as
// `break` (what lies on the planet's own surface or under the land is left out: the skin and the land are drawn by
// parts of their own, and it is only kept to block light).
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { L, light, storeBounce } from '../../lib/plan.mjs';
import { bake } from '../../lib/bake.mjs';
import { pack } from '../../lib/pack.mjs';
import { surface, simplify } from '../../lib/surface.mjs';
import { creased } from '../../lib/mesh.mjs';
import { build, any } from '../../lib/bvh.mjs';
import { ALBEDO, onSkin } from '../../lib/rock.mjs';
import * as F from './field.mjs';

const draft = process.argv.includes('--draft');
const t0 = performance.now(), said = (s) => console.log(`${((performance.now() - t0) / 1000).toFixed(1)} s · ${s}`);
// The grid the field is read on, in units; the most the reduced mesh may stray where it is seen and where it is not;
// the most triangles; faces meeting at more than CREASE degrees meet at a crease.
const cellAt = process.argv.indexOf('--cell'), CELL = cellAt > 0 ? Number(process.argv[cellAt + 1]) : draft ? 2.6 : 1.2, KEEP = draft ? 0.6 : 0.8, UNSEEN = 8, BUDGET = draft ? 200000 : 600000, CREASE = 36;
// The rubble: how many places are tried, the most stones, their least and most size (units), how far up a face must
// look for one to lie there, and how far it is sunk into it.
const RUBBLE = { tries: 20000, most: 110, size: [1.2, 5.5], up: 0.72, sunk: 0.5, clear: 150 };

const module = fileURLToPath(new URL('./field.mjs', import.meta.url));
const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

function rubble() {
  F.setup({});
  const f = F.probe, out = [];
  const grad = (p) => { const e = 0.3; return norm([f(p[0] + e, p[1], p[2]) - f(p[0] - e, p[1], p[2]), f(p[0], p[1] + e, p[2]) - f(p[0], p[1] - e, p[2]), f(p[0], p[1], p[2] + e) - f(p[0], p[1], p[2] - e)]); };
  for (let k = 0; k < RUBBLE.tries && out.length < RUBBLE.most; k++) {
    const px = 300 + 740 * hash(k, 1), py = 330 + 300 * hash(k, 2);
    const a = L.fromPicture(px, py, 640), c = L.fromPicture(px, py, -200);
    let hit = null, t0 = 0;
    for (let t = 0; t <= 1; t += 0.003) { const p = [0, 1, 2].map((q) => a[q] + (c[q] - a[q]) * t); if (f(...p) < 0) { hit = [t0, t]; break; } t0 = t; }
    if (!hit) continue;
    for (let i = 0; i < 22; i++) { const m = (hit[0] + hit[1]) / 2, p = [0, 1, 2].map((q) => a[q] + (c[q] - a[q]) * m); if (f(...p) < 0) hit[1] = m; else hit[0] = m; }
    const p = [0, 1, 2].map((q) => a[q] + (c[q] - a[q]) * hit[1]), n = grad(p);
    if (n[1] < RUBBLE.up || p[1] > -40 || Math.hypot(p[0] - L.CORE.at[0], p[1] - L.CORE.at[1], p[2] - L.CORE.at[2]) < RUBBLE.clear) continue;
    const s = RUBBLE.size[0] + (RUBBLE.size[1] - RUBBLE.size[0]) * hash(k, 4) ** 2.4;
    if (out.some((o) => Math.hypot(o.at[0] - p[0], o.at[1] - p[1], o.at[2] - p[2]) < (o.s + s) * 1.3)) continue;
    const planes = [], flat = 0.45 + 0.3 * hash(k, 5), count = 9 + Math.floor(4 * hash(k, 6));
    for (let j = 0; j < count; j++) {
      const u = 2 * hash(k, 10 + j) - 1, th = 6.283 * hash(k, 30 + j), r = Math.sqrt(1 - u * u);
      const d = [r * Math.cos(th), u, r * Math.sin(th)];
      planes.push({ n: d, h: s * (0.72 + 0.4 * hash(k, 50 + j)) * (1 - (1 - flat) * Math.abs(u)) });
    }
    planes.push({ n: [-n[0], -n[1], -n[2]], h: s * flat * 0.9 });
    const lift = s * flat * (1 - RUBBLE.sunk);
    out.push({ at: [p[0] + n[0] * lift, p[1] + n[1] * lift, p[2] + n[2] * lift], s, planes });
  }
  return out;
}

const stones = rubble();
said(`rubble: ${stones.length} stones`);
const raw = await surface({ module, args: { stones }, box: F.BOX, cell: CELL });
said(`surface: ${(raw.indices.length / 3).toLocaleString('en-US')} triangles`);

// What the visitor can ever see: the view never moves, so a vertex is seen when the line from it toward the eye
// meets no rock. What is never seen is reduced far more, but kept closed, so it still blocks the light.
const P = raw.positions, I = raw.indices, nv = P.length / 3, seen = new Uint8Array(nv);
{
  const bvh = build(P, I), fn = new Float32Array(nv * 3);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const u = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], w = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    for (const v of [a, b, c]) { fn[v] += n[0]; fn[v + 1] += n[1]; fn[v + 2] += n[2]; }
  }
  for (let v = 0; v < nv; v++) {
    const p = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], [px, py] = L.pictured(...p), q = L.fromPicture(px, py, p[2] + 10);
    const d = norm([q[0] - p[0], q[1] - p[1], q[2] - p[2]]), n = norm([fn[v * 3], fn[v * 3 + 1], fn[v * 3 + 2]]);
    if (n[0] * d[0] + n[1] * d[1] + n[2] * d[2] < -0.05) continue;
    const o = [p[0] + n[0] * 0.35 + d[0] * 0.35, p[1] + n[1] * 0.35 + d[1] * 0.35, p[2] + n[2] * 0.35 + d[2] * 0.35];
    if (!any(bvh, o[0], o[1], o[2], d[0], d[1], d[2], 4000)) seen[v] = 1;
  }
}
const hold = seen.slice();
for (let t = 0; t < I.length; t += 3) if (seen[I[t]] || seen[I[t + 1]] || seen[I[t + 2]]) { hold[I[t]] = 1; hold[I[t + 1]] = 1; hold[I[t + 2]] = 1; }
const hidden = await simplify({ positions: P, indices: I }, { error: UNSEEN, lock: hold });
said(`what is never seen reduced: ${(hidden.indices.length / 3).toLocaleString('en-US')} triangles`);
const small = await simplify(hidden, { error: KEEP, target: BUDGET });
said(`reduced: ${(small.indices.length / 3).toLocaleString('en-US')} triangles, strays ${small.stray}`);
const all = creased({ positions: small.positions, indices: small.indices }, CREASE);

// The torn rock, and what of it lies on the planet's own surface or under the land, which only blocks light.
const split = (want) => {
  const map = new Int32Array(all.positions.length / 3).fill(-1), pos = [], nor = [], idx = [];
  const skin = (i) => onSkin(all.positions[i * 3], all.positions[i * 3 + 1], all.positions[i * 3 + 2]);
  for (let t = 0; t < all.indices.length; t += 3) {
    const v = [all.indices[t], all.indices[t + 1], all.indices[t + 2]];
    if ((skin(v[0]) && skin(v[1]) && skin(v[2])) !== want) continue;
    for (const i of v) {
      if (map[i] < 0) { map[i] = pos.length / 3; pos.push(all.positions[i * 3], all.positions[i * 3 + 1], all.positions[i * 3 + 2]); nor.push(all.normals[i * 3], all.normals[i * 3 + 1], all.normals[i * 3 + 2]); }
      idx.push(map[i]);
    }
  }
  return { positions: new Float32Array(pos), normals: new Float32Array(nor), indices: new Uint32Array(idx) };
};
const brk = split(false), shell = split(true);
const outer = creased(await surface({ module: fileURLToPath(new URL('./outer.mjs', import.meta.url)), args: {}, box: [[-700, -660, -700], [700, 40, 700]], cell: 10 }), 40);
said(`break ${(brk.indices.length / 3).toLocaleString('en-US')} triangles, shell ${(shell.indices.length / 3).toLocaleString('en-US')}, the planet round it ${(outer.indices.length / 3).toLocaleString('en-US')}`);

const meshes = [{ name: 'break', positions: brk.positions, indices: brk.indices, normals: brk.normals, albedo: ALBEDO, receive: true }, { name: 'shell', positions: shell.positions, indices: shell.indices, normals: shell.normals, albedo: ALBEDO, receive: false }];
if (outer.indices.length) meshes.push({ name: 'outer', positions: outer.positions, indices: outer.indices, normals: outer.normals, albedo: ALBEDO, receive: false });
const lit = await bake({ meshes, ...light() }, { samples: draft ? { core: 24, moon: 8, hemi: 48 } : { core: 64, moon: 16, hemi: 160 }, bounces: draft ? 1 : 2 });
said('lit');

// Each vertex's bedding, which the quiet stone lays its laminae along and works each mass's tone out from (meta.spare
// 'bed'): the plane the sheets of its mass lie in, its normal turned to face the visitor's side and folded onto an
// octahedron, in light.w and bounce.w. A vertex is of the mass whose field is lowest there, a little inside the rock.
F.setup({ stones });
const n = brk.positions.length / 3, lightOf = new Float32Array(n * 4), bounceOf = new Float32Array(n * 4), l = lit.break;
const fold = (v) => {
  const s = v[2] < 0 ? -1 : 1, a = Math.abs(v[0]) + Math.abs(v[1]) + Math.abs(v[2]) || 1, x = (s * v[0]) / a, y = (s * v[1]) / a;
  return [x * 0.5 + 0.5, y * 0.5 + 0.5];
};
for (let i = 0; i < n; i++) {
  const p = [0, 1, 2].map((k) => brk.positions[i * 3 + k] - brk.normals[i * 3 + k] * 0.6), [ox, oy] = fold(F.bedOf(...p) ?? [brk.normals[i * 3], brk.normals[i * 3 + 1], brk.normals[i * 3 + 2]]);
  lightOf.set([l.core[i], l.moon[i], l.open[i], ox], i * 4);
  bounceOf.set([storeBounce(l.bounce[i * 3]), storeBounce(l.bounce[i * 3 + 1]), storeBounce(l.bounce[i * 3 + 2]), oy], i * 4);
}
said('beds');
pack('public/world/rock-s.bin', [{ name: 'break', positions: brk.positions, indices: brk.indices, attributes: { normal: { data: brk.normals, size: 3, as: 'i16' }, light: { data: lightOf, size: 4, as: 'u8' }, bounce: { data: bounceOf, size: 4, as: 'u8' } } }], { draft, sculpt: 's', round: 6, stones: stones.length, spare: 'bed', bed: 'light.w and bounce.w, folded onto an octahedron', cell: CELL });
said('done');
