// What every make of the towers ends with: the light worked out for the meshes of the three layers (./layers.mjs),
// with the light the lit windows give off and what else stands round them, and the world file and the map of the
// windows written.
//
//   const made = gather([kit.meshes(matrix), ...])       // the layers of many buildings as one mesh each
//   await finish({ made, win, around, file: 'towers-city', draft })
import { pack } from '../../lib/pack.mjs';
import { png } from '../../lib/png.mjs';
import { bake } from '../../lib/bake.mjs';
import { light, linear, storeBounce } from '../../lib/plan.mjs';
import { PLACE, STONES, WARM, WINDOW, stoneOf } from '../../../../src/pieces/world/parts/towers/windows.ts';
import { FIELD } from './layers.mjs';

const NAMES = ['stone', 'bay', 'gold'];
// How dark the bronze of a bay is against the palette's, and the copper's against its own, for the bake; the glass
// as it reflects; the stone, against the palette's pale stone; and the gold.
const ALBEDO = { bronze: 0.32, copper: 0.55, glass: [0.03, 0.025, 0.02], stone: 0.92, gold: 0.4 };
// How far round a vertex the windows it gives off the light of reach, in windows.
const REACH = 1.5;
// How shut in a place is, and the light that reaches it, averaged over this far in units: the gold's flutes are
// finer than its vertices, and their shade is the cornices', not each flute's.
const SMOOTH = { stone: 0, bay: 0, gold: 1.6 };

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
  const n = m.positions.length / 3, cell = new Map(), key = (x, y, z) => `${Math.floor(x / r)},${Math.floor(y / r)},${Math.floor(z / r)}`, out = new Float32Array(values.length);
  for (let i = 0; i < n; i++) { const k = key(m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(i); }
  for (let i = 0; i < n; i++) {
    const [x, y, z] = m.positions.subarray(i * 3, i * 3 + 3), sum = new Float64Array(width);
    let w = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      for (const j of cell.get(key(x + a * r, y + b * r, z + c * r)) ?? []) {
        const d = Math.hypot(m.positions[j * 3] - x, m.positions[j * 3 + 1] - y, m.positions[j * 3 + 2] - z);
        if (d > r) continue;
        const k = 1 - d / r;
        for (let q = 0; q < width; q++) sum[q] += k * values[j * width + q];
        w += k;
      }
    }
    for (let q = 0; q < width; q++) out[i * width + q] = sum[q] / w;
  }
  return out;
}

export async function finish({ made, win, around = [], file, draft, meta = {}, samples }) {
  const began = performance.now();
  const cl = linear('copper-light'), pale = linear('text-2').map((v, k) => (v + (cl[k] - v) * WARM) * ALBEDO.stone), bronze = linear('bronze').map((v) => v * ALBEDO.bronze), copper = linear('copper').map((v) => v * ALBEDO.copper);
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
    for (let i = 0; i < n; i++) {
      const back = Math.min(1, Math.max(0, (m.positions[i * 3 + 2] - DEPTH[0]) / (DEPTH[1] - DEPTH[0])));
      light4.set([l.core[i], l.moon[i], l.open[i], Math.min(1, (m.foot?.[i] ?? 0) / FOOT)], i * 4);
      bounce4.set([storeBounce(l.bounce[i * 3]), storeBounce(l.bounce[i * 3 + 1]), storeBounce(l.bounce[i * 3 + 2]), back], i * 4);
    }
    const attributes = { normal: { data: m.normals, size: 3, as: 'i16' }, light: { data: light4, size: 4, as: 'u8' }, bounce: { data: bounce4, size: 4, as: 'u8' } };
    if (name === 'stone') {
      const grain = new Float32Array(n * 2), kind = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { grain[i * 2] = m.attr[i * 4]; grain[i * 2 + 1] = m.attr[i * 4 + 1]; kind[i * 2] = m.attr[i * 4 + 2]; kind[i * 2 + 1] = m.attr[i * 4 + 3]; }
      attributes.grain = { data: grain, size: 2, as: 'f32' };
      attributes.kind = { data: kind, size: 2, as: 'u8' };
    }
    if (name === 'bay') {
      const cell = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) cell.set(m.attr.subarray(i * 5, i * 5 + 4), i * 4);
      attributes.cell = { data: cell, size: 4, as: 'f32' };
    }
    if (name === 'gold') attributes.flute = { data: m.attr, size: 3, as: 'f32' };
    return { name, positions: m.positions, indices: m.indices, attributes, info: { triangles: m.indices.length / 3 } };
  });
  const triangles = meshes.reduce((s, m) => s + m.indices.length / 3, 0);
  pack(`public/world/${file}.bin`, meshes, { windows: `${file}-windows.png`, triangles, draft, ...meta });
  png(`public/world/${file}-windows.png`, win.size, win.size, win.data, 3);
  console.log(`${file}: ${triangles} triangles (${meshes.map((m) => `${m.name} ${m.indices.length / 3}`).join(', ')}), windows lit ${(100 * win.lit()).toFixed(0)}%, ${((performance.now() - began) / 1000).toFixed(1)} s`);
}
