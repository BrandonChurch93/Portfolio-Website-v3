// Makes the skin: what survives of the planet's own outer surface, at each side of the tear. It writes two files to
// public/world/:
//   skin.bin       the surface as one mesh, cut into the planet where its craters and cracks are and broken at its
//                  torn edges, with its normals, the light that reaches it (bake.mjs) and where it lies in the map
//   skin-map.bin   the map, laid over picture 9's own pixels (the view never moves), in two parts, the dark side and
//                  the pale: for each texel the slope of the relief finer than the geometry, how the stone's color
//                  changes there, and how much of the cracks' light lies there. Packed with deflate
// The mesh is a fine grid over the surface between each side's torn line (sculpt R's own, so the skin ends where
// the rock begins) and a little past where it turns from the visitor, pushed in and out by the field (field.mjs),
// then reduced to what the eye can tell.
//
//   node scripts/world/parts/skin/make.mjs [--draft]
import fs from 'node:fs';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { deflateRawSync } from 'node:zlib';
import { bake } from '../../lib/bake.mjs';
import { build as buildBvh } from '../../lib/bvh.mjs';
import { creased } from '../../lib/mesh.mjs';
import { pack } from '../../lib/pack.mjs';
import { simplify } from '../../lib/surface.mjs';
import { L, light, linear, storeBounce } from '../../lib/plan.mjs';
import { MAP, STONE } from '../../../../src/pieces/world/parts/skin/look.ts';
import { KNOT, SIDES, craters, cracks, edges, edgeAngle, hullAt, onShell, shellNormal, toShell } from './features.mjs';
import { CRUST, setup, coarse, edgeDistance, perlin } from './field.mjs';

const draft = process.argv.includes('--draft');
const began = performance.now(), say = (s) => console.log(`skin: ${s} · ${((performance.now() - began) / 1000).toFixed(1)} s`);
// How fine: the grid's spacing and how far the reduced mesh may stray from it, in units, the most triangles it may
// keep, the bake's rays, and the map's texels to a picture pixel.
const FINE = draft
  ? { grid: 1.4, error: 0.2, most: 120000, samples: { core: 8, moon: 6, hemi: 24 }, bounces: 1, perPixel: 1.5 }
  : { grid: 0.6, error: 0.5, most: 135000, samples: { core: 16, moon: 16, hemi: 160 }, bounces: 2, perPixel: MAP.perPixel };
// How far down the surface the grid is looked at (t, 0 at the rim), and the margin round each side's part of the map.
const DOWN = 0.93, MARGIN = 4;
// The skirt past each side's line: how far past it it runs as it goes down, how far down from the edge, in units, and
// in how many steps: the crust's broken face in section, deep enough to meet the torn rock behind it. Made in one step
// it was long thin quads, one to a row of the grid, which drew the face in bands like brushed paint.
const SKIRT = { past: [0.4, 2.4], down: { left: 14, right: 22 }, cols: 6 };
// How near (the cosine) the grid's normal must be to a crease's to be taken in its place.
const AGREE = Math.cos((24 * Math.PI) / 180), CREASE = Math.cos((32 * Math.PI) / 180);
// How much the stored light is eased toward its neighbours', on the open ground and on a broken face, and how often.
const EASE = { flat: 0.25, steep: 0.85, passes: 3 };

const SLAB_LINE = { from: 300, to: 420, step: 0.5 };
const features = { craters: craters(), segs: cracks(), edges: edges(), knot: onShell(...KNOT), slab: { ...SLAB_LINE, at: Array.from({ length: (SLAB_LINE.to - SLAB_LINE.from) / SLAB_LINE.step + 1 }, (_, i) => hullAt('left', SLAB_LINE.from + i * SLAB_LINE.step)) } };
setup(features);
say(`features: ${features.craters.length} craters, ${features.segs.length} lengths of crack, ${features.edges.left.length + features.edges.right.length} points of torn line`);

// ---------------------------------------------------------------------------------------------------------------
// The grid: rings evenly spaced down the surface, each from the side's outer bound to its torn line.
const arc = [];
{
  let s = 0;
  const n = 4000;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * DOWN, r = Math.sqrt(1 - t * t), dr = (L.WORLD.half * t) / r;
    if (i) s += (Math.hypot(dr, L.WORLD.deep) * DOWN) / n;
    arc.push([s, t]);
  }
}
const tAt = (s) => { let i = 1; while (i < arc.length - 1 && arc[i][0] < s) i++; const [s0, t0] = arc[i - 1], [s1, t1] = arc[i]; return t0 + ((t1 - t0) * (s - s0)) / (s1 - s0 || 1); };

function grid(side) {
  const out = SIDES[side].out * L.D2R, rows = [];
  for (let s = 0; s <= arc[arc.length - 1][0]; s += FINE.grid) {
    const t = tAt(s), e = edgeAngle(side, t);
    if (e === null || Math.abs(e) >= Math.abs(out)) { if (rows.length) break; continue; }
    rows.push({ t, e });
  }
  let span = 0;
  for (const { t, e } of rows) span = Math.max(span, Math.ceil((L.WORLD.half * Math.sqrt(1 - t * t) * Math.abs(e - out)) / FINE.grid));
  // Past the torn line a few more columns, a skirt that goes down into the planet from the edge, lumpy as broken rock:
  // it is the crust in section, and closes what would be a slot between the skin and the torn rock.
  const cols = span + SKIRT.cols, V = rows.length * (cols + 1), pos = new Float32Array(V * 3), h = new Float32Array(V), lock = new Uint8Array(V);
  rows.forEach(({ t, e }, k) => {
    const ring = L.WORLD.half * Math.sqrt(1 - t * t), edgeH = { at: 0 };
    for (let j = 0; j <= cols; j++) {
      const m = j - span, f = m / SKIRT.cols, skirt = m > 0, arc = t * L.WORLD.deep;
      const th = skirt ? e + (Math.sign(e - out) * (SKIRT.past[0] + (SKIRT.past[1] - SKIRT.past[0]) * f + 0.45 * perlin(arc / 3.1, f * 2.3, side.length))) / ring : out + ((e - out) * Math.min(j, span)) / span;
      const q = L.skinAt(th, t), n = shellNormal(...q), v = k * (cols + 1) + j;
      if (m === 0) edgeH.at = coarse(...q);
      const d = skirt ? Math.min(edgeH.at, 0) - SKIRT.down[side] * f ** 0.9 * (0.8 + 0.4 * (0.5 + 0.5 * perlin(arc / 5.3, f * 3.7, 9 + side.length))) : m === 0 ? edgeH.at : coarse(...q);
      h[v] = d;
      pos.set([q[0] + n[0] * d, q[1] + n[1] * d, q[2] + n[2] * d], v * 3);
      if (k === 0 || k === rows.length - 1 || j === 0 || j >= span) lock[v] = 1;
    }
  });
  // The normal at each point of the grid, from its neighbours: the reduced mesh keeps these where the surface is
  // smooth, since the long thin triangles a reduction leaves give poor normals of their own.
  const nor = new Float32Array(V * 3), sharp = new Uint8Array(V), C = cols + 1, at = (k, j) => (Math.min(rows.length - 1, Math.max(0, k)) * C + Math.min(cols, Math.max(0, j))) * 3;
  const across = (a, b, c, d) => {
    const u = [pos[a] - pos[b], pos[a + 1] - pos[b + 1], pos[a + 2] - pos[b + 2]], w = [pos[c] - pos[d], pos[c + 1] - pos[d + 1], pos[c + 2] - pos[d + 2]];
    const nn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], l = Math.hypot(...nn) || 1;
    return nn.map((x) => x / l);
  };
  for (let k = 0; k < rows.length; k++) for (let j = 0; j <= cols; j++) {
    const q = at(k, j), sn = shellNormal(pos[q], pos[q + 1], pos[q + 2]);
    const out = (nn) => (nn[0] * sn[0] + nn[1] * sn[1] + nn[2] * sn[2] < 0 ? nn.map((x) => -x) : nn);
    nor.set(out(across(at(k, j + 1), at(k, j - 1), at(k + 1, j), at(k - 1, j))), q);
    // A point is on a crease where the surface's four quarters round it turn apart.
    const quarters = [across(at(k, j + 1), q, at(k + 1, j), q), across(at(k, j - 1), q, at(k + 1, j), q), across(at(k, j + 1), q, at(k - 1, j), q), across(at(k, j - 1), q, at(k - 1, j), q)].map(out);
    let least = 1;
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) least = Math.min(least, quarters[a][0] * quarters[b][0] + quarters[a][1] * quarters[b][1] + quarters[a][2] * quarters[b][2]);
    if (least < CREASE) sharp[q / 3] = 1;
  }
  const idx = [];
  for (let k = 0; k + 1 < rows.length; k++) for (let j = 0; j < cols; j++) {
    const a = k * (cols + 1) + j, b = a + 1, c = a + cols + 1, d = c + 1;
    // Each square is split along the diagonal whose corners are nearer in height, which keeps a wall's foot and
    // crest on the lines of the grid.
    const tris = Math.abs(h[a] - h[d]) <= Math.abs(h[b] - h[c]) ? [a, d, b, a, c, d] : [a, c, b, b, c, d];
    // The columns run round the planet from the outer bound to the torn line, which is the other way round on the
    // pale side: its triangles are turned so that every face looks out.
    if (SIDES[side].sign > 0) for (let i = 0; i < 6; i += 3) [tris[i + 1], tris[i + 2]] = [tris[i + 2], tris[i + 1]];
    idx.push(...tris);
  }
  say(`${side}: ${rows.length} rings of ${cols + 1}, ${(idx.length / 3).toLocaleString('en-US')} triangles`);
  return { positions: pos, normals: nor, sharp, indices: Uint32Array.from(idx), lock };
}
const parts = ['left', 'right'].map(grid);

// One mesh of both sides.
const nv = parts.reduce((a, p) => a + p.positions.length / 3, 0), ni = parts.reduce((a, p) => a + p.indices.length, 0);
const whole = { positions: new Float32Array(nv * 3), indices: new Uint32Array(ni) }, lock = new Uint8Array(nv), gridNormals = new Float32Array(nv * 3), gridSharp = new Uint8Array(nv);
{
  let vo = 0, io = 0;
  for (const p of parts) {
    whole.positions.set(p.positions, vo * 3);
    gridNormals.set(p.normals, vo * 3);
    gridSharp.set(p.sharp, vo);
    lock.set(p.lock, vo);
    for (let i = 0; i < p.indices.length; i++) whole.indices[io + i] = p.indices[i] + vo;
    vo += p.positions.length / 3; io += p.indices.length;
  }
}
const small = await simplify(whole, { error: FINE.error, target: FINE.most, lock, strict: false });
say(`reduced: ${(small.indices.length / 3).toLocaleString('en-US')} triangles`);
const lit = creased(small, 38);
const n = lit.positions.length / 3;
{
  // Where a point of the reduced mesh was not split at a crease, it takes the grid's own normal there.
  const keyOf = (p, i) => `${p[i * 3]},${p[i * 3 + 1]},${p[i * 3 + 2]}`, kept = new Map(), split = new Uint32Array(small.positions.length / 3);
  for (let i = 0; i < small.positions.length / 3; i++) kept.set(keyOf(small.positions, i), i);
  const from = new Int32Array(small.positions.length / 3).fill(-1);
  for (let i = 0; i < nv; i++) { const s = kept.get(keyOf(whole.positions, i)); if (s !== undefined) from[s] = i; }
  for (let i = 0; i < n; i++) split[lit.source[i]]++;
  let took = 0;
  for (let i = 0; i < n; i++) {
    const s = lit.source[i], g = from[s];
    if (g < 0) continue;
    const a = lit.normals, gn = gridNormals, c = a[i * 3] * gn[g * 3] + a[i * 3 + 1] * gn[g * 3 + 1] + a[i * 3 + 2] * gn[g * 3 + 2];
    // A point on a crease of the surface keeps the crease's own normal, unless the grid's is close to it.
    if (!gridSharp[g] || split[s] === 1 || c > AGREE) { a.set(gn.subarray(g * 3, g * 3 + 3), i * 3); took++; }
  }
  say(`${took.toLocaleString('en-US')} of ${n.toLocaleString('en-US')} points take the grid's normal`);
}
say(`creased: ${n.toLocaleString('en-US')} vertices`);

// ---------------------------------------------------------------------------------------------------------------
// The light: the moon, the core (which hardly reaches the outer surface) and what bounces, each side by its stone.
// On the broken faces the normals are eased toward their neighbours' too: each row of the grid turned its own way
// there, which drew the face in thin bands like brushed paint.
const nextTo = Array.from({ length: n }, () => []), steep = new Float32Array(n);
{
  for (let t = 0; t < lit.indices.length; t += 3) for (let k = 0; k < 3; k++) { const a = lit.indices[t + k], b = lit.indices[t + ((k + 1) % 3)]; nextTo[a].push(b); nextTo[b].push(a); }
  for (let i = 0; i < n; i++) { const p = lit.positions.subarray(i * 3, i * 3 + 3), sn = shellNormal(...p); steep[i] = 1 - Math.max(0, lit.normals[i * 3] * sn[0] + lit.normals[i * 3 + 1] * sn[1] + lit.normals[i * 3 + 2] * sn[2]); }
  const N = lit.normals;
  for (let pass = 0; pass < EASE.passes * 2; pass++) {
    const was = N.slice();
    for (let i = 0; i < n; i++) {
      const w = Math.min(1, Math.max(0, (steep[i] - 0.25) * 2.5)) * 0.8;
      if (!w || !nextTo[i].length) continue;
      const a = [0, 0, 0];
      for (const j of nextTo[i]) for (let c = 0; c < 3; c++) a[c] += was[j * 3 + c];
      const m = [0, 1, 2].map((c) => was[i * 3 + c] * (1 - w) + (a[c] / nextTo[i].length) * w), l = Math.hypot(...m) || 1;
      N.set(m.map((v) => v / l), i * 3);
    }
  }
}
const stone = (s) => { const a = linear(s.from), b = linear(s.to); return a.map((v, i) => Math.min(1, (v + (b[i] - v) * s.k) * s.power)); };
const PALE = stone(STONE.pale), DARK = stone(STONE.dark);
const albedo = new Float32Array(n * 3);
for (let i = 0; i < n; i++) albedo.set(lit.positions[i * 3] > 0 ? PALE : DARK, i * 3);
const LT = light();
const baked = await bake({ meshes: [{ name: 'skin', positions: lit.positions, indices: lit.indices, normals: lit.normals, albedo, receive: true }], ...LT }, { samples: FINE.samples, bounces: FINE.bounces });
say('baked');
// The stored light is eased toward its neighbours', most on the broken faces: their triangles are long and thin, and
// the light worked out at each of their corners alone drew stripes down them.
{
  const B = baked.skin;
  for (let pass = 0; pass < EASE.passes; pass++) {
    const was = { core: B.core.slice(), moon: B.moon.slice(), open: B.open.slice(), bounce: B.bounce.slice() };
    for (let i = 0; i < n; i++) {
      const ns = nextTo[i];
      if (!ns.length) continue;
      const w = EASE.flat + (EASE.steep - EASE.flat) * Math.min(1, steep[i] * 2);
      for (const key of ['core', 'moon', 'open']) { let a = 0; for (const j of ns) a += was[key][j]; B[key][i] = was[key][i] * (1 - w) + (a / ns.length) * w; }
      for (let c = 0; c < 3; c++) { let a = 0; for (const j of ns) a += was.bounce[j * 3 + c]; B.bounce[i * 3 + c] = was.bounce[i * 3 + c] * (1 - w) + (a / ns.length) * w; }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The map. Each side's part is the box of picture 9 its front lies in.
const k = FINE.perPixel, rects = [];
{
  const toward = (x, y, z) => { const o = L.fromPicture(...L.pictured(x, y, z), 900); return [o[0] - x, o[1] - y, o[2] - z]; };
  for (const side of ['left', 'right']) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = lit.positions[i * 3], y = lit.positions[i * 3 + 1], z = lit.positions[i * 3 + 2];
      if ((x > 0) !== (side === 'right')) continue;
      const t = toward(x, y, z), nn = [lit.normals[i * 3], lit.normals[i * 3 + 1], lit.normals[i * 3 + 2]];
      if (t[0] * nn[0] + t[1] * nn[1] + t[2] * nn[2] < -0.2 * Math.hypot(...t)) continue;
      const [px, py] = L.pictured(x, y, z);
      x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
    }
    rects.push({ side: side === 'right' ? 1 : -1, x0: Math.floor(x0 - MARGIN), y0: Math.floor(y0 - MARGIN), x1: Math.ceil(x1 + MARGIN), y1: Math.ceil(y1 + MARGIN) });
  }
  let ox = 0;
  for (const r of rects) { r.w = Math.ceil((r.x1 - r.x0) * k); r.h = Math.ceil((r.y1 - r.y0) * k); r.ox = ox; r.oy = 0; ox += r.w; }
}
const MW = rects.reduce((a, r) => a + r.w, 0), MH = Math.max(...rects.map((r) => r.h)), T = MW * MH;
say(`map: ${MW} by ${MH}, ${rects.map((r) => `${r.side > 0 ? 'pale' : 'dark'} ${r.x0}..${r.x1} by ${r.y0}..${r.y1}`).join(', ')}`);
const shared = (bytes) => new SharedArrayBuffer(bytes);
const texels = { wide: MW, H: shared(T * 4), G: shared(T * 4), B: shared(T * 4), at: shared(T * 12), side: shared(T) };
const sharedOf = (a) => { const s = new a.constructor(shared(a.byteLength)); s.set(a); return s.buffer; };
const bvh = buildBvh(lit.positions, lit.indices);
const moonDir = LT.moon.toward;
{
  const threads = Math.max(1, os.cpus().length - 1), per = Math.ceil(MH / threads), jobs = [];
  for (let w = 0; w < threads; w++) {
    const rows = [w * per, Math.min(MH, (w + 1) * per)];
    if (rows[0] >= rows[1]) continue;
    jobs.push(new Promise((resolve, reject) => {
      const wk = new Worker(new URL('./map-worker.mjs', import.meta.url), { workerData: { features, bvh, positions: sharedOf(lit.positions), normals: sharedOf(lit.normals), indices: sharedOf(lit.indices), texels, rects, perPixel: k, rows, moon: moonDir } });
      wk.on('message', (m) => { if (m.done) { wk.terminate(); resolve(); } });
      wk.on('error', reject);
    }));
  }
  await Promise.all(jobs);
}
say('map worked out');
const H = new Float32Array(texels.H), G = new Float32Array(texels.G), B = new Float32Array(texels.B), AT = new Float32Array(texels.at), SIDE = new Int8Array(texels.side);
const rgba = new Uint8Array(T * 4);
// The slope of the fine relief across the picture, from the texels either side whose places are near this one's.
const near = (i, j) => SIDE[j] !== 0 && Math.hypot(AT[i * 3] - AT[j * 3], AT[i * 3 + 1] - AT[j * 3 + 1], AT[i * 3 + 2] - AT[j * 3 + 2]) < 3;
const slope = (i, a, b) => {
  const ga = a >= 0 && near(i, a), gb = b >= 0 && near(i, b);
  if (ga && gb) return (H[b] - H[a]) * k / 2;
  if (gb) return (H[b] - H[i]) * k;
  if (ga) return (H[i] - H[a]) * k;
  return 0;
};
const enc = (s) => { const v = Math.min(1, Math.abs(s) / MAP.slope); return Math.round(127.5 + 127.5 * Math.sign(s) * Math.sqrt(v)); };
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  const i = y * MW + x;
  if (!SIDE[i]) { rgba.set([128, 128, 128, x >= rects[1].ox ? 128 : 0], i * 4); continue; }
  const su = slope(i, x > 0 ? i - 1 : -1, x < MW - 1 ? i + 1 : -1), sv = slope(i, y > 0 ? i - MW : -1, y < MH - 1 ? i + MW : -1);
  rgba.set([enc(su), enc(sv), Math.round(Math.min(1, B[i] / 2) * 255), Math.round(Math.min(1, Math.max(0, G[i])) * 255)], i * 4);
}
// Texels outside the skin take their nearest neighbour's color, so a texel at an edge does not blend toward grey.
const SIDE_FILL = new Uint8Array(T);
for (let pass = 0; pass < 16; pass++) for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  const i = y * MW + x;
  if (SIDE[i] || SIDE_FILL[i]) continue;
  // Only from within the same side's part of the map: wrapping round a row's end took the pale side's numbers into
  // the dark side's, where they read as the cracks' light, a lit dotted line round the dark side's outline.
  const own = rects.find((r) => x >= r.ox && x < r.ox + r.w);
  for (const [j, ok] of [[i - 1, x > own.ox], [i + 1, x < own.ox + own.w - 1], [i - MW, y > 0], [i + MW, y < MH - 1]]) if (ok && (SIDE[j] || SIDE_FILL[j])) { rgba[i * 4 + 2] = rgba[j * 4 + 2]; rgba[i * 4 + 3] = rgba[j * 4 + 3]; SIDE_FILL[i] = 1; break; }
}
const head = Buffer.alloc(16);
head.write('SKNM', 0, 'latin1');
head.writeUInt32LE(MW, 4); head.writeUInt32LE(MH, 8); head.writeUInt32LE(rects[0].w, 12);
fs.writeFileSync('public/world/skin-map.bin', Buffer.concat([head, deflateRawSync(Buffer.from(rgba.buffer), { level: 9 })]));
say(`map written: ${(fs.statSync('public/world/skin-map.bin').size / 1e6).toFixed(2)} MB`);

// The knot's light, which the shader lays on the rock round it as from one source: a short line from the junction
// along the hot arm, held a little off the surface (in units), so the light rakes the relief round it.
const lifted = (px, py, by) => { const p = onShell(px, py), nn = shellNormal(...p); return p.map((v, i) => +(v + nn[i] * by).toFixed(2)); };
const KNOT_LIGHT = [...lifted(KNOT[0] + 3, KNOT[1] - 1, 3.5), ...lifted(262, 469, 2.5)];
// The dark side's line where the rock tore, across at each second row of picture 9 from TORN_FROM: past it, at the
// top, is the crust's slab that runs on out over the hollow, which the shader draws as the pale crust.
const TORN_FROM = 300, TORN_LINE = [TORN_FROM, ...Array.from({ length: 66 }, (_, i) => +hullAt('left', TORN_FROM + 2 * i).toFixed(2))];

// ---------------------------------------------------------------------------------------------------------------
// The file: where each vertex lies in the map, its light and its bounce.
const map = new Float32Array(n * 2), lightOf = new Float32Array(n * 4), bounceOf = new Float32Array(n * 4);
// The fourth number of the stored light: how much a place is the broken crust by the torn line, whose slabs the moon
// lights by their own tilt and not by the outer surface's.
const crustOf = (x, y, z) => { const e = edgeDistance(...toShell(x, y, z)), t = Math.min(1, Math.max(0, (e - CRUST.reach * 0.5) / (CRUST.reach * 0.48))); return 1 - t * t * (3 - 2 * t); };
for (let i = 0; i < n; i++) {
  const x = lit.positions[i * 3], y = lit.positions[i * 3 + 1], z = lit.positions[i * 3 + 2], r = rects[x > 0 ? 1 : 0];
  const [px, py] = L.pictured(x, y, z);
  map[i * 2] = Math.min(1, Math.max(0, (r.ox + Math.min(r.w - 0.5, Math.max(0.5, (px - r.x0) * k))) / MW));
  map[i * 2 + 1] = Math.min(1, Math.max(0, (r.oy + Math.min(r.h - 0.5, Math.max(0.5, (py - r.y0) * k))) / MH));
  lightOf.set([baked.skin.core[i], baked.skin.moon[i], baked.skin.open[i], crustOf(x, y, z)], i * 4);
  bounceOf.set([storeBounce(baked.skin.bounce[i * 3]), storeBounce(baked.skin.bounce[i * 3 + 1]), storeBounce(baked.skin.bounce[i * 3 + 2]), 0], i * 4);
}
pack('public/world/skin.bin', [{ name: 'skin', positions: lit.positions, indices: lit.indices, attributes: { normal: { data: lit.normals, size: 3, as: 'i16' }, light: { data: lightOf, size: 4, as: 'u8' }, bounce: { data: bounceOf, size: 4, as: 'u8' }, atlas: { data: map, size: 2, as: 'u16' } }, info: { map: [MW, MH, rects[0].w, k], dark: [rects[0].x0, rects[0].y0], knot: KNOT_LIGHT, torn: TORN_LINE } }], { draft });
say(`written: ${(fs.statSync('public/world/skin.bin').size / 1e6).toFixed(2)} MB, ${(lit.indices.length / 3).toLocaleString('en-US')} triangles`);
