// What every make of the towers ends with: the light worked out for the meshes of the three layers (./layers.mjs),
// with the light the lit windows give off and what else stands round them, and the world file and the map of the
// windows written.
//
//   const made = gather([kit.meshes(matrix), ...])       // the layers of many buildings as one mesh each
//   await finish({ made, win, around, file: 'towers-city', draft })
import { pack } from '../../lib/pack.mjs';
import { png } from '../../lib/png.mjs';
import { bake } from '../../lib/bake.mjs';
import { L, P, light, linear, storeBounce } from '../../lib/plan.mjs';
import { FRONT, PALE_STONE, PLACE, STONES, WARM, WINDOW, stoneOf } from '../../../../src/pieces/world/parts/towers/windows.ts';
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
const CULL = { seen: -0.1, casts: 0.02 };
// How openness and the bounce are stored: in steps of this many of a byte's 255, which the light passed between
// vertices never shows, and which packs the file a third smaller.
const STEP = 8;
const step = (v) => Math.round((Math.min(1, Math.max(0, v)) * 255) / STEP) * STEP / 255;

// The layers of many meshes (each what Kit.meshes gives) as one mesh a layer. owners[k], if given, is which building
// the k-th of them is, kept for each vertex (owner), so what a building does to the light of others can leave out
// its own.
export function gather(list, owners = null) {
  const out = {};
  for (const name of NAMES) {
    const parts = list.map((m, k) => [m[name], owners ? owners[k] : -1]).filter(([m]) => m && m.indices.length);
    const width = list.find((m) => m[name])?.[name].width ?? 0;
    const nv = parts.reduce((s, [m]) => s + m.positions.length / 3, 0), ni = parts.reduce((s, [m]) => s + m.indices.length, 0);
    const positions = new Float32Array(nv * 3), normals = new Float32Array(nv * 3), attr = new Float32Array(nv * width), indices = new Uint32Array(ni), foot = new Float32Array(nv), owner = new Int32Array(nv);
    let v = 0, i = 0;
    for (const [m, who] of parts) {
      owner.fill(who, v, v + m.positions.length / 3);
      for (let k = 0; k < m.positions.length / 3; k++) foot[v + k] = Math.max(0, m.local[k * 3 + 1]);
      positions.set(m.positions, v * 3);
      normals.set(m.normals, v * 3);
      attr.set(m.attr, v * width);
      for (let k = 0; k < m.indices.length; k++) indices[i + k] = m.indices[k] + v;
      v += m.positions.length / 3;
      i += m.indices.length;
    }
    out[name] = { positions, normals, indices, attr, width, foot, owner };
  }
  return out;
}

// How much of the bright sky about the moon a place sees past the other buildings: the moon is low and behind the
// city, so a tall building lays a long shadow of it across the faces of lower ones before it, and the tops stand in
// it while the feet are shut out. Each building is taken as two boxes, its whole footprint to SKY.body of its height
// and SKY.top of its footprint above; rays go toward the moon over a cone SKY.cone degrees wide, so the shadows are
// soft. Its own building never shades a place: it is the place's own wall, which the moon's live shadow draws.
const SKY = { body: 0.62, top: 0.7, cone: 3.2, rays: 9 };
export function boxesOf(list, extra = []) {
  const out = [];
  for (const [x, z, w, d, tall, turn, ground, id] of list) {
    const c = Math.cos(turn * L.D2R), s = Math.sin(turn * L.D2R);
    out.push({ id, x, z, c, s, hw: w / 2, hd: d / 2, y0: ground - 2, y1: ground + tall * SKY.body });
    out.push({ id, x, z, c, s, hw: (w / 2) * SKY.top, hd: (d / 2) * SKY.top, y0: ground, y1: ground + tall });
  }
  return [...out, ...extra];
}
export function skyward(positions, normals, owner, boxes, draft) {
  return seen(positions, normals, owner, boxes, light().moon.toward, SKY.cone, draft ? 3 : SKY.rays);
}
// How much of the night's soft light from the visitor's side (FRONT) a place sees past the other buildings.
export function frontward(positions, normals, owner, boxes, draft) {
  const t = FRONT.toward, l = Math.hypot(...t);
  return seen(positions, normals, owner, boxes, t.map((v) => v / l), FRONT.cone, draft ? 5 : FRONT.rays);
}
function seen(positions, normals, owner, boxes, M, coneDeg, count) {
  const n = positions.length / 3, out = new Float32Array(n), rays = [];
  const up = [0, 1, 0], ax = [M[1] * up[2] - M[2] * up[1], M[2] * up[0] - M[0] * up[2], M[0] * up[1] - M[1] * up[0]], la = Math.hypot(...ax);
  const a = ax.map((v) => v / la), b = [M[1] * a[2] - M[2] * a[1], M[2] * a[0] - M[0] * a[2], M[0] * a[1] - M[1] * a[0]];
  const cone = Math.tan(coneDeg * L.D2R);
  for (let k = 0; k < count; k++) {
    const r = count === 1 ? 0 : cone * Math.sqrt((k + 0.5) / count), t = k * 2.39996;
    const d = M.map((v, q) => v + r * (Math.cos(t) * a[q] + Math.sin(t) * b[q])), l = Math.hypot(...d);
    rays.push(d.map((v) => v / l));
  }
  for (let i = 0; i < n; i++) {
    const px = positions[i * 3] + normals[i * 3] * 0.4, py = positions[i * 3 + 1] + normals[i * 3 + 1] * 0.4, pz = positions[i * 3 + 2] + normals[i * 3 + 2] * 0.4;
    let seen = 0;
    for (const [dx, dy, dz] of rays) {
      let hit = false;
      for (const B of boxes) {
        if (B.id === owner[i] || B.y1 < py || (B.x - px) * dx + (B.z - pz) * dz < -(B.hw + B.hd)) continue;
        // Into the box's own frame, where it is upright and square to its axes.
        const ox = px - B.x, oz = pz - B.z, lx = ox * B.c - oz * B.s, lz = ox * B.s + oz * B.c, vx = dx * B.c - dz * B.s, vz = dx * B.s + dz * B.c;
        let t0 = 0, t1 = 1e5;
        for (const [o, v, lo, hi] of [[lx, vx, -B.hw, B.hw], [lz, vz, -B.hd, B.hd], [py, dy, B.y0, B.y1]]) {
          if (Math.abs(v) < 1e-9) { if (o < lo || o > hi) { t0 = 1; t1 = 0; break; } continue; }
          let ta = (lo - o) / v, tb = (hi - o) / v;
          if (ta > tb) [ta, tb] = [tb, ta];
          t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
          if (t0 > t1) break;
        }
        if (t0 <= t1) { hit = true; break; }
      }
      if (!hit) seen++;
    }
    out[i] = seen / rays.length;
  }
  return out;
}

// The pale stone as a stone of a tone (STONES): a metal gives back little of what falls on it diffusely.
function toned(pale, tone) {
  const s = STONES[stoneOf(tone)];
  return pale.map((p, c) => p * s.tint[c] * (1 - 0.7 * s.metal));
}
const FOOT = PLACE.foot;

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

export async function finish({ made, win, around = [], file, draft, meta = {}, samples, boxes = [] }) {
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
    // The core never reaches the city, and the baker's share of the moon is not read (the moon's own shadow is drawn
    // live): in its place is how much of the sky about the moon a place sees past the other buildings (skyward).
    const sky = boxes.length ? smooth(m, skyward(m.positions, m.normals, m.owner, boxes, draft), 1, SMOOTH[name]) : new Float32Array(n).fill(1);
    // And in the core's place, which never reaches the city, how much of the night's light from the visitor's side
    // a place sees past the other buildings (frontward).
    const fore = boxes.length ? smooth(m, frontward(m.positions, m.normals, m.owner, boxes, draft), 1, SMOOTH[name]) : new Float32Array(n).fill(1);
    for (let i = 0; i < n; i++) {
      // How far up its own building a place is, as a share of the building's height: the material lights a
      // building from a shaded foot to a lit top by it. (How far back it is, which this held, the shader works out.)
      const tall = P.TOWERS[m.owner?.[i]]?.[4], rise = tall ? Math.min(1, Math.max(0, (m.foot?.[i] ?? 0) / tall)) : 1;
      light4.set([step(fore[i]), step(sky[i]), step(l.open[i]), Math.min(1, (m.foot?.[i] ?? 0) / FOOT)], i * 4);
      bounce4.set([step(storeBounce(l.bounce[i * 3])), step(storeBounce(l.bounce[i * 3 + 1])), step(storeBounce(l.bounce[i * 3 + 2])), rise], i * 4);
    }
    // A wall's normal is near one of a few directions and is kept to a byte; the gold's curves keep two.
    const attributes = { normal: { data: m.normals, size: 3, as: name === 'gold' ? 'i16' : 'i8' }, light: { data: light4, size: 4, as: 'u8' }, bounce: { data: bounce4, size: 4, as: 'u8' } };
    // The stone's joints are laid from where a place is in the world, in the shader: only how it is laid and which
    // stone it is are stored.
    if (name === 'stone') {
      const kind = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { kind[i * 2] = m.attr[i * 4 + 2]; kind[i * 2 + 1] = m.attr[i * 4 + 3]; }
      attributes.kind = { data: kind, size: 2, as: 'u8' };
    }
    // Where a place is in its field of windows, as shares of the map (two bytes each: a sixty fourth of a window),
    // and how large a window is, exactly.
    if (name === 'bay') {
      const cell = new Float32Array(n * 2), size = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        cell.set([Math.min(1, Math.max(0, m.attr[i * 5] / win.size)), Math.min(1, Math.max(0, m.attr[i * 5 + 1] / win.tall))], i * 2);
        size.set([m.attr[i * 5 + 2], m.attr[i * 5 + 3]], i * 2);
      }
      attributes.cell = { data: cell, size: 2, as: 'u16' };
      attributes.cellSize = { data: size, size: 2, as: 'f32' };
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
