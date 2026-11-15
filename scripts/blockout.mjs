// A quick look at the hero's grey blockout (src/hero-blockout/plan.ts) without a browser: seconds, where a still
// of the page takes minutes in software.
//
//   npm run blockout -- view [--res 1.6] [--el 12] [--out shots/blockout-view.png]
//   npm run blockout -- map [--out shots/blockout-map.png]
//
// view: what is left of the planet's rock, alone, from the page's own side, marched through the description of it
//   and lit by the moon with real shadows and by the core. No land, no city, nothing that broke away. --res is how
//   many units one pixel is.
// map: the top of the planet from straight above, as a plan: where the land ends, the districts' streets, the
//   boulevards and their lines of light, the parks, the desert, every building (paler the taller) and every tree.
//   The red line is where the first screen ends on a 16:9 screen and the blue one on a 3:2 screen: ground nearer
//   the foot of the picture than a line is under that screen at rest. It prints what it counted.
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
if (mode !== 'view' && mode !== 'map') { console.error('usage: npm run blockout -- view|map [--out file]'); process.exit(1); }

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
} else {
  const res = 2, half = 680, N = Math.round((2 * half) / res), buf = Buffer.alloc(N * N * 3);
  const put = (x, z, r, g, b) => { const px = Math.floor((x + half) / res), py = Math.floor((z + half) / res); if (px < 0 || py < 0 || px >= N || py >= N) return; const a = (px + N * py) * 3; buf[a] = r; buf[a + 1] = g; buf[a + 2] = b; };
  let land = 0, sand = 0;
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const x = -half + (px + 0.5) * res, z = -half + (py + 0.5) * res;
    if (P.edge(x, z) <= 0) { put(x, z, 8, 6, 5); continue; }
    land++;
    let c = [92, 90, 86];
    if (P.street(x, z) < P.STREET) c = [56, 55, 53];
    if (P.park(x, z) > 0) c = [58, 84, 52];
    if (P.boulevard(x, z) < P.BOULEVARD) c = [150, 146, 138];
    if (P.boulevard(x, z) < 1.2) c = [255, 180, 90];
    if (P.avenue(x, z) < P.AVENUE.half) c = [170, 165, 155];
    if (P.avenue(x, z) < 1.4 && z > P.AVENUE.from) c = [255, 180, 90];
    if (Math.hypot(x, z) < P.COURT || Math.hypot(x - P.PYRAMID.x, z - P.PYRAMID.z) < P.PYRAMID.court) c = [140, 136, 128];
    const s = P.desert(x, z);
    if (s > 0.5) sand++;
    if (s > 0) { const h = P.dunes(x, z); c = c.map((v, i) => v + ([206, 182, 132][i] * (0.55 + h / 90) - v) * s); }
    put(x, z, ...c);
  }
  const { buildings, trees } = P.city();
  for (const b of buildings) {
    const c = Math.cos(b.turn), s = Math.sin(b.turn), v = Math.min(255, 110 + b.tall * 0.68);
    for (let a = -b.w / 2; a <= b.w / 2; a += 0.9) for (let d = -b.d / 2; d <= b.d / 2; d += 0.9) put(b.x + a * c - d * s, b.z + a * s + d * c, v, v * 0.97, b.tall > 92 ? v * 0.7 : v * 0.93);
  }
  for (const t of trees) for (let a = -t.size * 0.7; a <= t.size * 0.7; a++) for (let d = -t.size * 0.7; d <= t.size * 0.7; d++) if (Math.hypot(a, d) < t.size * 0.7) put(t.x + a, t.z + d, 30, 70, 34);
  for (let a = -P.PYRAMID.base / 2; a < P.PYRAMID.base / 2; a++) for (let d = -P.PYRAMID.base / 2; d < P.PYRAMID.base / 2; d++) put(P.PYRAMID.x + a, P.PYRAMID.z + d, 210, 200, 150);
  for (let a = -P.SPIRE.foot; a < P.SPIRE.foot; a++) for (let d = -P.SPIRE.foot; d < P.SPIRE.foot; d++) if (Math.hypot(a, d) < P.SPIRE.foot) put(a, d, 255, 255, 255);
  // How far under the spire's tip the first screen ends, in units, on a 16:9 screen and on a 3:2 one.
  for (const [fold, col] of [[346, [255, 60, 60]], [448, [60, 160, 255]]]) for (let x = -half; x < half; x += 4) {
    for (let z = -half; z < half; z++) if (P.drawn(x, P.ground(x, z), z)[1] - P.HOST.over > fold) { put(x, z, ...col); break; }
  }
  save(flag('out', 'shots/blockout-map.png'), N, N, buf);
  const kinds = {};
  for (const p of P.debris()) kinds[p.kind] = (kinds[p.kind] ?? 0) + 1;
  console.log(`land ${Math.round((100 * land * res * res) / (Math.PI * 660 ** 2))}% of the whole top · sand ${(100 * sand / land).toFixed(1)}% of the land · buildings ${buildings.length}, ${buildings.filter((b) => b.tall > 92).length} of them towers · trees ${trees.length} · boulevards ${P.boulevards().length} · broken pieces ${JSON.stringify(kinds)}`);
}
console.log(`in ${((Date.now() - started) / 1000).toFixed(1)} s`);
