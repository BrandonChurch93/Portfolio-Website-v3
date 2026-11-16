// A quick look at the hero's grey blockout (src/hero-blockout/plan.ts) without a browser: seconds, where a still
// of the page takes minutes in software.
//
//   npm run blockout -- view [--res 1.6] [--el 12] [--out shots/blockout-view.png]
//   npm run blockout -- map [--out shots/blockout-map.png]
//   npm run blockout -- front [--out shots/blockout-front.png]
//
// view: what is left of the planet's rock, alone, from the page's own side, marched through the description of it
//   and lit by the moon with real shadows and by the core. No land, no city, nothing that broke away. --res is how
//   many units one pixel is.
// map: the top of the planet from straight above, as a plan: where the land ends, the belt of trees along the
//   city's front, the desert and its dunes, every building (by its roof) and tree.
//   The red line is where the first screen ends on a 16:9 screen and the blue one on a 3:2 screen: ground nearer
//   the foot of the picture than a line is under that screen at rest. It prints what it counted.
// front: the whole world as the page sees it, as flat shapes: the planet's outline, every building, the pyramid,
//   the trees, the sand, the core and what broke away, each where the page draws it. For composing the skyline
//   against picture 9 in a second. The red and blue lines are where the first screen ends, as on the map.
//
// It compiles the plan alone, which is why plan.ts imports nothing.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const args = process.argv.slice(2), mode = args[0];
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args[i + 1]; };
if (mode !== 'view' && mode !== 'map' && mode !== 'front') { console.error('usage: npm run blockout -- view|map|front [--out file]'); process.exit(1); }

const dir = mkdtempSync(join(tmpdir(), 'blockout-'));
execFileSync('node_modules/.bin/tsc', ['src/hero-blockout/plan.ts', '--ignoreConfig', '--outDir', dir, '--module', 'esnext', '--target', 'es2022', '--skipLibCheck', '--strict'], { stdio: 'inherit' });
writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
const P = await import(pathToFileURL(join(dir, 'plan.js')).href);

function save(file, w, h, rgb) {
  const row = w * 3 + 1, raw = Buffer.alloc(row * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * row + 1, y * w * 3, (y + 1) * w * 3);
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]), len = Buffer.alloc(4), sum = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    sum.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, sum]);
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 2;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  console.log(`blockout: ${file} · ${w} x ${h}`);
}

const started = Date.now();
if (mode === 'view') {
  const res = Number(flag('res', 1.6)), el = Number(flag('el', P.VIEW.rest)) * P.D2R;
  const U0 = -720, V0 = -860, V1 = 60, W = Math.round(1440 / res), H = Math.round((V1 - V0) / res), buf = Buffer.alloc(W * H * 3);
  const fwd = [0, -Math.sin(el), -Math.cos(el)], up = [0, Math.cos(el), -Math.sin(el)], core = P.CORE.at;
  const moon = P.MOONWARD.map((v) => v / Math.hypot(...P.MOONWARD));
  const march = (ox, oy, oz, dx, dy, dz, far, first) => {
    for (let t = first; t < far;) {
      const v = P.rock(ox + dx * t, oy + dy * t, oz + dz * t);
      if (v < 0) {
        let a = Math.max(first, t - 3), b = t;
        for (let i = 0; i < 6; i++) { const m = (a + b) / 2; if (P.rock(ox + dx * m, oy + dy * m, oz + dz * m) < 0) b = m; else a = m; }
        return b;
      }
      t += Math.max(2.2, v * 0.55);
    }
    return -1;
  };
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const ox = U0 + (px + 0.5) * res, v = V1 - (py + 0.5) * res, oy = up[1] * v - fwd[1] * 900, oz = up[2] * v - fwd[2] * 900;
    const t = march(ox, oy, oz, fwd[0], fwd[1], fwd[2], 1800, 0);
    let c = [6, 4, 3];
    const cx = core[0] - ox, cy = core[1] - oy, cz = core[2] - oz, along = cy * fwd[1] + cz * fwd[2];
    if (Math.hypot(cx, cy - fwd[1] * along, cz - fwd[2] * along) < P.CORE.r && (t < 0 || t > along)) c = [255, 190, 110];
    else if (t >= 0) {
      const x = ox, y = oy + fwd[1] * t, z = oz + fwd[2] * t, e = 2.5;
      let nx = P.rock(x + e, y, z) - P.rock(x - e, y, z), ny = P.rock(x, y + e, z) - P.rock(x, y - e, z), nz = P.rock(x, y, z + e) - P.rock(x, y, z - e);
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;
      let lit = Math.max(0, nx * moon[0] + ny * moon[1] + nz * moon[2]);
      if (lit > 0 && march(x + nx * 4, y + ny * 4, z + nz * 4, moon[0], moon[1], moon[2], 700, 2) >= 0) lit = 0;
      const lx = core[0] - x, ly = core[1] - y, lz = core[2] - z, ll = Math.hypot(lx, ly, lz), glow = Math.max(0, (nx * lx + ny * ly + nz * lz) / ll) * Math.min(1, (260 / ll) ** 2);
      const val = Math.min(1, 0.1 + 0.08 * ny + 0.8 * lit);
      c = [255 * (val + 0.9 * glow), 255 * (val * 0.97 + 0.55 * glow), 255 * (val * 0.93 + 0.25 * glow)];
    }
    const a = (px + W * py) * 3;
    buf[a] = Math.min(255, c[0]); buf[a + 1] = Math.min(255, c[1]); buf[a + 2] = Math.min(255, c[2]);
  }
  save(flag('out', 'shots/blockout-view.png'), W, H, buf);
} else if (mode === 'front') {
  const res = 1.5, W = Math.round(P.HOST.wide / res), H = Math.round(P.HOST.tall / res), buf = Buffer.alloc(W * H * 3, 7);
  const dot = (sx, sy, c) => { const px = Math.round((sx + P.HOST.wide / 2) / res), py = Math.round(sy / res); if (px < 0 || py < 0 || px >= W || py >= H) return; const a = (px + W * py) * 3; buf[a] = c[0]; buf[a + 1] = c[1]; buf[a + 2] = c[2]; };
  const at = (x, y, z) => P.drawn(x, y, z);
  const box = (x0, y0, x1, y1, c) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += res) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += res) dot(x, y, c); };
  const disc = (sx, sy, r, c) => { for (let y = -r; y <= r; y += res) for (let x = -r; x <= r; x += res) if (x * x + y * y <= r * r) dot(sx + x, sy + y, c); };
  // The planet: its outer surface where the rock is still there, shaded by which way it faces across.
  for (let t = 0.004; t < 1; t += 0.004) for (let th = -89; th <= 89; th += 0.35) {
    const q = P.skinAt(th * P.D2R, t);
    if (P.rock(q[0] * 0.985, q[1], q[2] * 0.985) < 0) dot(...at(...q), th > 0 ? [128 - th * 0.5, 112 - th * 0.45, 96 - th * 0.4] : [40, 30, 24]);
  }
  // The land, far to near: sand by its slope, grass, paving.
  for (let z = -660; z <= 660; z += 2) for (let x = -660; x <= 660; x += 2) {
    if (P.edge(x, z) <= 0) continue;
    const k = P.desert(x, z), slope = P.dunes(x + 3, z - 2) - P.dunes(x - 3, z + 2), c = k > 0.5 ? (slope > 1.2 ? [226, 190, 130] : slope < -1.2 ? [70, 52, 34] : [186, 150, 100]) : P.park(x, z) > 0.5 ? [70, 52, 26] : [62, 52, 44];
    dot(...at(x, P.ground(x, z), z), c);
  }
  const things = [];
  for (const b of P.towers()) things.push({ z: b.z, draw: () => {
    const g = P.ground(b.x, b.z), [x0, y0] = at(b.x - b.w / 2, g, b.z), [x1] = at(b.x + b.w / 2, g, b.z), [, y1] = at(b.x, g + b.tall + 7, b.z), far = Math.max(0.45, Math.min(1, 0.75 + b.z / 1300));
    box(x0, y0, x1, y1, (b.roof === 'gold' ? [150, 120, 84] : b.roof === 'bronze' ? [122, 96, 74] : [100, 86, 74]).map((v) => v * far));
    box(x0 + 2, y1, x1 - 2, y1 + (b.roof === 'plain' ? 2 : 0.12 * b.tall), b.roof === 'gold' ? [255, 190, 90] : b.roof === 'bronze' ? [200, 130, 70] : [130, 112, 96]);
  } });
  for (const t of P.trees()) things.push({ z: t.z, draw: () => { const [sx, sy] = at(t.x, P.ground(t.x, t.z) + 1.6 * t.size, t.z); disc(sx, sy, t.size, [200 + 50 * (t.tone - 0.5), 112 + 40 * (t.tone - 0.5), 44]); } });
  things.push({ z: P.PYRAMID.z, draw: () => {
    const g = P.ground(P.PYRAMID.x, P.PYRAMID.z), c = Math.cos(P.PYRAMID.turn * P.D2R), k = Math.sin(P.PYRAMID.turn * P.D2R), h = P.PYRAMID.base / 2;
    for (let u = 0; u <= 1; u += 0.004) for (let e = -1; e <= 1; e += 0.01) for (const [a, d, col] of [[-h, e * h, [226, 170, 90]], [e * h, h, [255, 214, 140]]]) {
      const x = P.PYRAMID.x + (a * c + d * k) * (1 - u), z = P.PYRAMID.z + (-a * k + d * c) * (1 - u);
      dot(...at(x, g + u * P.PYRAMID.tall, z), col);
    }
  } });
  things.push({ z: 0, draw: () => {
    for (let u = 0; u <= 1; u += 0.002) { const w = P.SPIRE.foot * 0.6 * (1 - u) ** 1.4 + 1, [sx, sy] = at(0, u * P.SPIRE.tall, 0); box(sx - w, sy, sx + w, sy, [60, 48, 40]); }
    for (let a = 0; a < 360; a += 0.5) dot(...at(P.SPIRE.ring.r * Math.cos(a * P.D2R), P.SPIRE.ring.up * P.SPIRE.tall + 9 * Math.sin(a * P.D2R), P.SPIRE.ring.r * Math.sin(a * P.D2R)), [255, 200, 110]);
  } });
  things.sort((a, b) => a.z - b.z);
  for (const t of things) t.draw();
  disc(...at(...P.CORE.at), P.CORE.r, [255, 214, 150]);
  for (let y = P.CORE.at[1] - P.CORE.r; y > -1600; y -= 1) dot(...at(P.CORE.at[0], y, P.CORE.at[2]), [255, 200, 120]);
  for (const v of P.vents()) for (let y = 0; y < v.long; y++) dot(...at(v.at[0], v.at[1] - y, v.at[2]), [230, 150, 70]);
  for (const c of P.fractures()) for (let i = 0; i < c.wide.length; i++) dot(...at(c.pts[i * 3], c.pts[i * 3 + 1], c.pts[i * 3 + 2]), [255, 190, 90]);
  for (const p of P.debris()) disc(...at(...p.at), Math.max(0.8, p.r * 0.7), p.land ? [150, 120, 90] : p.kind === 'plate' ? [120, 92, 70] : p.kind === 'whirl' ? [104, 80, 60] : [84, 66, 52]);
  for (const [fold, col] of [[346, [255, 60, 60]], [448, [60, 160, 255]]]) for (let x = -P.HOST.wide / 2; x < P.HOST.wide / 2; x += 6) dot(x, P.HOST.over + fold, col);
  save(flag('out', 'shots/blockout-front.png'), W, H, buf);
  const kinds = {};
  for (const p of P.debris()) kinds[p.kind] = (kinds[p.kind] ?? 0) + 1;
  console.log(`buildings ${P.towers().length} · trees ${P.trees().length} · small streams ${P.vents().length} · cracks ${P.fractures().length} · broken pieces ${JSON.stringify(kinds)}`);
} else {
  const res = 2, half = 680, N = Math.round((2 * half) / res), buf = Buffer.alloc(N * N * 3);
  const put = (x, z, r, g, b) => { const px = Math.floor((x + half) / res), py = Math.floor((z + half) / res); if (px < 0 || py < 0 || px >= N || py >= N) return; const a = (px + N * py) * 3; buf[a] = r; buf[a + 1] = g; buf[a + 2] = b; };
  const trees = P.trees();
  let land = 0, sand = 0;
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const x = -half + (px + 0.5) * res, z = -half + (py + 0.5) * res, far = Math.hypot(x, z), th = Math.atan2(x, z) / P.D2R;
    if (P.edge(x, z) <= 0) { put(x, z, 8, 6, 5); continue; }
    land++;
    let c = [92, 90, 86];
    const pk = P.park(x, z);
    if (pk > 0) c = c.map((v, i) => v + ([70, 92, 58][i] - v) * pk);
    const pq = P.pyramidal(x, z);
    if (far < P.COURT || (Math.abs(pq[0]) < P.PYRAMID.court && Math.abs(pq[1]) < P.PYRAMID.court)) c = [140, 136, 128];
    const s = P.desert(x, z);
    if (s > 0.5) sand++;
    if (s > 0) { const h = P.dunes(x, z); c = c.map((v, i) => v + ([206, 182, 132][i] * (0.5 + h / 70) - v) * s); }
    put(x, z, ...c);
  }
  const roof = { gold: [255, 200, 70], bronze: [200, 130, 70], plain: [235, 232, 226] };
  for (const b of P.towers()) {
    const c = Math.cos(b.turn), s = Math.sin(b.turn), v = 0.45 + b.tall / 400;
    for (let a = -b.w / 2; a <= b.w / 2; a += 0.9) for (let d = -b.d / 2; d <= b.d / 2; d += 0.9) put(b.x + a * c - d * s, b.z + a * s + d * c, ...roof[b.roof].map((q) => q * v));
  }
  for (const t of trees) for (let a = -t.size; a <= t.size; a++) for (let d = -t.size; d <= t.size; d++) if (Math.hypot(a, d) < t.size * 0.92) put(t.x + a, t.z + d, 205 + 40 * (t.tone - 0.5), 110 + 50 * (t.tone - 0.5), 40);
  for (let a = -P.PYRAMID.base / 2; a < P.PYRAMID.base / 2; a++) for (let d = -P.PYRAMID.base / 2; d < P.PYRAMID.base / 2; d++) put(P.PYRAMID.x + a * Math.cos(P.PYRAMID.turn * P.D2R) + d * Math.sin(P.PYRAMID.turn * P.D2R), P.PYRAMID.z - a * Math.sin(P.PYRAMID.turn * P.D2R) + d * Math.cos(P.PYRAMID.turn * P.D2R), 255 - 0.9 * Math.max(Math.abs(a), Math.abs(d)), 200 - 0.8 * Math.max(Math.abs(a), Math.abs(d)), 70);
  for (let a = -P.SPIRE.foot; a < P.SPIRE.foot; a++) for (let d = -P.SPIRE.foot; d < P.SPIRE.foot; d++) if (Math.hypot(a, d) < P.SPIRE.foot) put(a, d, 255, 255, 255);
  // How far under the spire's tip the first screen ends, in units, on a 16:9 screen and on a 3:2 one.
  for (const [fold, col] of [[346, [255, 60, 60]], [448, [60, 160, 255]]]) for (let x = -half; x < half; x += 4) {
    for (let z = -half; z < half; z++) if (P.drawn(x, P.ground(x, z), z)[1] - P.HOST.over > fold) { put(x, z, ...col); break; }
  }
  save(flag('out', 'shots/blockout-map.png'), N, N, buf);
  const kinds = {};
  for (const p of P.debris()) kinds[p.kind] = (kinds[p.kind] ?? 0) + 1;
  const roofs = {};
  for (const b of P.towers()) roofs[b.roof] = (roofs[b.roof] ?? 0) + 1;
  const cracks = P.fractures();
  console.log(`land ${Math.round((100 * land * res * res) / (Math.PI * 660 ** 2))}% of the whole top · sand ${(100 * sand / land).toFixed(1)}% of the land · towers ${P.towers().length} ${JSON.stringify(roofs)} · trees ${trees.length} · craters ${P.craters().length} · cracks ${cracks.length} with ${cracks.reduce((n, c) => n + c.wide.length, 0)} points · small streams ${P.vents().map((v) => Math.round(v.at[1])).join(' ')} · broken pieces ${JSON.stringify(kinds)}`);
}
console.log(`in ${((Date.now() - started) / 1000).toFixed(1)} s`);
