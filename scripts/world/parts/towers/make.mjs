// What every make of the towers ends with: the light worked out for the meshes of the three layers (./layers.mjs),
// with the light the lit windows give off and what else stands round them, and the world file and the map of the
// windows written.
//
//   const made = gather([kit.meshes(matrix), ...])       // the layers of many buildings as one mesh each
//   await finish({ made, win, around, file: 'towers-city', draft })
import { pack } from '../../lib/pack.mjs';
import { png } from '../../lib/png.mjs';
import { bake } from '../../lib/bake.mjs';
import { L, light, linear, storeBounce } from '../../lib/plan.mjs';
import { PALE_STONE, PLACE, STONES, WARM, WINDOW, stoneOf } from '../../../../src/pieces/world/parts/towers/windows.ts';
import { FIELD } from './layers.mjs';

const NAMES = ['stone', 'bay', 'gold'];
// How dark the bronze of a bay is against the palette's, and the copper's against its own, for the bake; the glass
// as it reflects; the stone, against the palette's pale stone; and the gold.
const ALBEDO = { bronze: 0.32, copper: 0.55, glass: [0.03, 0.025, 0.02], stone: 0.92, gold: 0.4 };
// How far round a vertex the windows it gives off the light of reach, in windows.
const REACH = 1.5;
// How shut in a place is, and the light that reaches it, averaged over this far in units, among places that face
// within a few degrees the same way: the gold's flutes are finer than its vertices, and their shade is the
// cornices', not each flute's; on the stone and the bay it takes out the baker's grain, which also packs badly.
const SMOOTH = { stone: 1.6, bay: 2.4, gold: 1.6, alike: 0.92 };
// The view never moves: a face turned from it by more than `seen` (the cosine, so a face seen edge on is kept) is
// never drawn, and unless it is turned from the moon (by more than `casts`) it casts no shadow either, since the
// moon's shadow is drawn with the faces turned from it. Such faces are left out of the file. The light is baked
// with them all there.
const CULL = { seen: -0.3, casts: 0.02 };
// How openness and the bounce are stored: in steps of this many of a byte's 255, which the light passed between
// vertices never shows, and which packs the file a third smaller.
const STEP = 4;
const step = (v) => Math.round((Math.min(1, Math.max(0, v)) * 255) / STEP) * STEP / 255;

// The layers of many meshes (each what Kit.meshes gives) as one mesh a layer.
export function gather(list) {
  const out = {};
  for (const name of NAMES) {
    const parts = list.map((m) => m[name]).filter((m) => m && m.indices.length);
    const width = list.find((m) => m[name])?.[name].width ?? 0;
    const nv = parts.reduce((s, m) => s + m.positions.length / 3, 0), ni = parts.reduce((s, m) => s + m.indices.length, 0);
    const positions = new Float32Array(nv * 3), normals = new Float32Array(nv * 3), attr = new Float32Array(nv * width), indices = new Uint32Array(ni), foot = new Float32Array(nv);
    let v = 0, i = 0;
    for (const m of parts) {
      for (let k = 0; k < m.positions.length / 3; k++) foot[v + k] = Math.max(0, m.local[k * 3 + 1]);
      positions.set(m.positions, v * 3);
      normals.set(m.normals, v * 3);
      attr.set(m.attr, v * width);
      for (let k = 0; k < m.indices.length; k++) indices[i + k] = m.indices[k] + v;
      v += m.positions.length / 3;
      i += m.indices.length;
    }
    out[name] = { positions, normals, indices, attr, width, foot };
  }
  return out;
}

// The pale stone as a stone of a tone (STONES): a metal gives back little of what falls on it diffusely.
function toned(pale, tone) {
  const s = STONES[stoneOf(tone)];
  return pale.map((p, c) => p * s.tint[c] * (1 - 0.7 * s.metal));
}
const DEPTH = PLACE.depth, FOOT = PLACE.foot;

function smooth(m, values, width, r) {
  if (!(r > 0)) return values;
  const nn = m.normals;
  const n = m.positions.length / 3, cell = new Map(), key = (x, y, z) => `${Math.floor(x / r)},${Math.floor(y / r)},${Math.floor(z / r)}`, out = new Float32Array(values.length);
  for (let i = 0; i < n; i++) { const k = key(m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(i); }
  for (let i = 0; i < n; i++) {
    const [x, y, z] = m.positions.subarray(i * 3, i * 3 + 3), sum = new Float64Array(width);
    let w = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      for (const j of cell.get(key(x + a * r, y + b * r, z + c * r)) ?? []) {
        const d = Math.hypot(m.positions[j * 3] - x, m.positions[j * 3 + 1] - y, m.positions[j * 3 + 2] - z);
        const same = nn[i * 3] * nn[j * 3] + nn[i * 3 + 1] * nn[j * 3 + 1] + nn[i * 3 + 2] * nn[j * 3 + 2];
        if (d > r || same < SMOOTH.alike) continue;
        const k = 1 - d / r;
        for (let q = 0; q < width; q++) sum[q] += k * values[j * width + q];
        w += k;
      }
    }
    for (let q = 0; q < width; q++) out[i * width + q] = sum[q] / w;
  }
  return out;
}

// Where the view is, in units: as far back as the stage puts it, along its line from where it looks.
function eye() {
  const e = L.VIEW.el * L.D2R, aim = L.SPIRE.tall - (L.HOST.tall / 2 - L.HOST.over) / Math.cos(e);
  return [0, aim + L.VIEW.back * Math.sin(e), L.VIEW.back * Math.cos(e)];
}
// The triangles of a mesh that are kept (CULL), and its vertices renumbered: each attribute's data cut to the
// vertices that are left.
function cull(positions, indices, attributes) {
  const E = eye(), M = light().moon.toward, keep = [];
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]].map((i) => positions.subarray(i * 3, i * 3 + 3));
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], ln = Math.hypot(...n) || 1;
    const m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3], to = [E[0] - m[0], E[1] - m[1], E[2] - m[2]], lt = Math.hypot(...to);
    const seen = (n[0] * to[0] + n[1] * to[1] + n[2] * to[2]) / (ln * lt), toMoon = (n[0] * M[0] + n[1] * M[1] + n[2] * M[2]) / ln;
    if (seen > CULL.seen || toMoon < CULL.casts) keep.push(indices[t], indices[t + 1], indices[t + 2]);
  }
  const n = positions.length / 3, at = new Int32Array(n).fill(-1);
  let k = 0;
  for (const i of keep) if (at[i] < 0) at[i] = k++;
  const pick = (data, size) => { const out = new data.constructor(k * size); for (let i = 0; i < n; i++) if (at[i] >= 0) out.set(data.subarray(i * size, i * size + size), at[i] * size); return out; };
  const out = {};
  for (const [name, a] of Object.entries(attributes)) out[name] = { ...a, data: pick(a.data, a.size) };
  return { positions: pick(positions, 3), indices: Uint32Array.from(keep, (i) => at[i]), attributes: out };
}

export async function finish({ made, win, around = [], file, draft, meta = {}, samples }) {
  const began = performance.now();
  const cl = linear('copper-light'), pale = linear('text-2').map((v, k) => (v + (cl[k] - v) * WARM) * PALE_STONE * ALBEDO.stone), bronze = linear('bronze').map((v) => v * ALBEDO.bronze), copper = linear('copper').map((v) => v * ALBEDO.copper);
  const bay = made.bay, nb = bay.positions.length / 3, emit = new Float32Array(nb * 3), albedoBay = new Float32Array(nb * 3);
  for (let i = 0; i < nb; i++) {
    const [u, v, raw, ch, at] = bay.attr.subarray(i * 5, i * 5 + 5);
    if (!(raw > 0)) { albedoBay.set(raw === 0 && v > 0.5 ? copper : bronze, i * 3); continue; }
    const style = Math.floor(raw / WINDOW.style), cw = raw - style * WINDOW.style, frame = style && style <= STONES.length ? toned(pale, (style - 1) / (STONES.length - 1)) : bronze;
    albedoBay.set(ALBEDO.glass.map((g, k) => 0.5 * g + 0.5 * frame[k]), i * 3);
    const e = win.about(u, v, cw, ch, at % FIELD, Math.floor(at / FIELD), REACH);
    emit.set(e.map((x) => Math.PI * x), i * 3);
  }
  const st = made.stone, ns = st.positions.length / 3, albedoStone = new Float32Array(ns * 3);
  for (let i = 0; i < ns; i++) albedoStone.set(toned(pale, st.attr[i * 4 + 3]), i * 3);

  const lights = light();
  const scene = {
    meshes: [
      { name: 'stone', ...st, albedo: albedoStone, receive: true },
      { name: 'bay', ...bay, albedo: albedoBay, emit, receive: true },
      { name: 'gold', ...made.gold, albedo: linear('copper-light').map((v) => v * ALBEDO.gold), receive: true },
      ...around,
    ],
    moon: lights.moon, core: null, sky: lights.sky,
  };
  const stats = {};
  const lit = await bake(scene, { samples: samples ?? (draft ? { core: 1, moon: 4, hemi: 48 } : { core: 1, moon: 24, hemi: 512 }), bounces: draft ? 1 : 2, reach: 60, stats });
  console.log(`bake: ${stats.vertices} vertices, ${stats.triangles} triangles, ${stats.seconds.toFixed(1)} s`);

  const meshes = NAMES.map((name) => {
    const m = made[name], raw = lit[name], n = m.positions.length / 3, light4 = new Float32Array(n * 4), bounce4 = new Float32Array(n * 4);
    const l = { ...raw, open: smooth(m, raw.open, 1, SMOOTH[name]), bounce: smooth(m, raw.bounce, 3, SMOOTH[name]) };
    // The share of the moon seen is not read (the moon's shadow is drawn live) and the core never reaches the city:
    // both are stored as nothing, which packs to nothing.
    for (let i = 0; i < n; i++) {
      const back = Math.min(1, Math.max(0, (m.positions[i * 3 + 2] - DEPTH[0]) / (DEPTH[1] - DEPTH[0])));
      light4.set([0, 0, step(l.open[i]), Math.min(1, (m.foot?.[i] ?? 0) / FOOT)], i * 4);
      bounce4.set([step(storeBounce(l.bounce[i * 3])), step(storeBounce(l.bounce[i * 3 + 1])), step(storeBounce(l.bounce[i * 3 + 2])), back], i * 4);
    }
    const attributes = { normal: { data: m.normals, size: 3, as: 'i16' }, light: { data: light4, size: 4, as: 'u8' }, bounce: { data: bounce4, size: 4, as: 'u8' } };
    // The stone's joints are laid from where a place is in the world, in the shader: only how it is laid and which
    // stone it is are stored.
    if (name === 'stone') {
      const kind = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { kind[i * 2] = m.attr[i * 4 + 2]; kind[i * 2 + 1] = m.attr[i * 4 + 3]; }
      attributes.kind = { data: kind, size: 2, as: 'u8' };
    }
    if (name === 'bay') {
      const cell = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) cell.set(m.attr.subarray(i * 5, i * 5 + 4), i * 4);
      attributes.cell = { data: cell, size: 4, as: 'f32' };
    }
    if (name === 'gold') attributes.flute = { data: m.attr, size: 3, as: 'f32' };
    const c = cull(m.positions, m.indices, attributes);
    return { name, positions: c.positions, indices: c.indices, attributes: c.attributes, info: { triangles: c.indices.length / 3 } };
  });
  const triangles = meshes.reduce((s, m) => s + m.indices.length / 3, 0);
  pack(`public/world/${file}.bin`, meshes, { windows: `${file}-windows.png`, triangles, draft, ...meta });
  png(`public/world/${file}-windows.png`, win.size, win.tall, win.data, 3);
  console.log(`${file}: ${triangles} triangles (${meshes.map((m) => `${m.name} ${m.indices.length / 3}`).join(', ')}), windows lit ${(100 * win.lit()).toFixed(0)}%, ${((performance.now() - began) / 1000).toFixed(1)} s`);
}
