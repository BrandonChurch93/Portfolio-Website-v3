// Sculpt S's map of picture 9's large pattern of light (src/pieces/world/parts/rock/light-map.ts), as a matte painter
// lights a set from a painting: the picture's luma and S's own, each blurred the same amount so that only masses of
// light and dark are left, turned back into light by the world's last pass (the ramp in curve.ts) and divided. The
// map multiplies what the core and its bounce give, so each pass multiplies the map S was drawn with by what is still
// between them. Every small thing stays S's own.
//
//   1. npm run look -- whole --scale 1.5 --png --q "rock=s&stonedebug=16" --out grey.png    the rock flat grey
//   2. npm run look -- whole --scale 1.5 --png --q "rock=s&stonedebug=17" --out black.png   and flat black
//   3. npm run look -- whole --scale 1.5 --png --q "rock=s" --out still.png                  S as it is drawn now
//   4. node scripts/world/parts/rock-s/light.mjs still.png grey.png black.png [--fresh] [--blur 8] [--rate 1] [--dry] [--show out.png]
//
// Grey and black say which pixels are S's rock (only they change between the two); they need taking again only when
// the form changes. --fresh starts from no map (take the still with ?lightmap=0). --show writes the two blurred
// pictures side by side, their difference and the map, one over another. It prints how far apart the two are.
import process from 'node:process';
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { L } from '../../lib/plan.mjs';
import { png } from '../../lib/png.mjs';
import { TORN } from '../rock-r/trace.mjs';
import { LIGHTMAP } from '../../../../src/pieces/world/parts/rock/light-map.ts';
import { CURVE } from '../../../../src/pieces/world/parts/rock/curve.ts';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const files = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !(all[i - 1] ?? '').startsWith('--'));
const FILE = new URL(`../../../../public/world/${LIGHTMAP.file}`, import.meta.url).pathname;
const PIC = new URL(`../../../../${L.PICTURE.file}`, import.meta.url).pathname;
// How far the blur reaches, as the sigma of a Gaussian in the picture's pixels; how much of what is between them a
// pass takes; the least and most the map may multiply by, as powers of two.
const BLUR = Number(arg('--blur', 8)), RATE = Number(arg('--rate', 1)), RANGE = [Number(arg('--lo', -2.6)), Number(arg('--hi', 1.8))];
const [X0, Y0] = LIGHTMAP.at, [W, H] = LIGHTMAP.size, [TW, TH] = LIGHTMAP.texels, PER = W / TW;
const CX = 688, CY = 437, R = 90;
// What of the picture is not rock: the ball and its rim; the lines of light (where each leaves the rock, across and
// down); the land above the rock's top and what broke away under its foot (lines across the picture, read off its
// ruled enlargement); the skin outside the torn lines.
const LINES = [[385, 630], [500, 560], [620, 570], [688, 515], [748, 540], [812, 500], [1010, 630]];
const TOP = [[216, 302], [300, 300], [400, 300], [500, 296], [560, 292], [700, 290], [860, 292], [1000, 296], [1104, 306]];
const FOOT = [[216, 700], [300, 716], [350, 704], [372, 650], [400, 616], [440, 606], [480, 596], [520, 588], [560, 574], [600, 588], [640, 600], [680, 598], [720, 600], [760, 612], [800, 608], [830, 592], [860, 578], [890, 572], [920, 590], [950, 626], [980, 666], [1010, 690], [1040, 704], [1104, 706]];
const along = (line, x) => { if (x <= line[0][0]) return line[0][1]; for (let i = 1; i < line.length; i++) if (x <= line[i][0]) { const [a, p] = line[i - 1], [b, q] = line[i]; return p + ((q - p) * (x - a)) / (b - a); } return line[line.length - 1][1]; };
const torn = (side, y) => { const t = TORN[side]; if (y <= t[0][1]) return t[0][0]; for (let i = 1; i < t.length; i++) if (y <= t[i][1]) { const [p, a] = t[i - 1], [q, b] = t[i]; return p + ((q - p) * (y - a)) / (b - a || 1); } return t[t.length - 1][0]; };
function rockOfPicture(px, py) {
  if (Math.hypot(px - CX, py - CY) < R * 1.1) return false;
  for (const [x, y] of LINES) if (py > y && Math.abs(px - x) < (x === 688 ? 14 : 6)) return false;
  return py > along(TOP, px) && py < along(FOOT, px) && px > torn('left', py) + 4 && px < torn('right', py) - 4;
}
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
// Luma back to light, through the ramp the world's last pass was measured with (curve.ts: the light at luma 0, 30, ...).
const STEP = 30, AT = CURVE.at;
function light(y) {
  const i = Math.min(AT.length - 2, Math.max(0, Math.floor(y / STEP))), t = (y - i * STEP) / STEP;
  return Math.max(0, AT[i] + (AT[i + 1] - AT[i]) * t);
}

async function load(f) { const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }
// The mean of a still's pixels over a pixel of the picture's. A still of the whole world is 1460 units wide.
const TIP = L.drawn(0, L.SPIRE.tall, 0)[1];
function footprint(im) {
  const k = im.w / L.HOST.wide, u = L.PICTURE.unit * k;
  return (px, py, fn) => {
    const x0 = (L.HOST.wide / 2 + (px - L.PICTURE.mid) * L.PICTURE.unit) * k, y0 = (TIP + (py - L.PICTURE.tip) * L.PICTURE.unit) * k;
    for (let y = Math.floor(y0); y < Math.ceil(y0 + u); y++) for (let x = Math.floor(x0); x < Math.ceil(x0 + u); x++) {
      if (x < 0 || y < 0 || x >= im.w || y >= im.h) continue;
      const i = (x + y * im.w) * 3;
      fn(im.data[i], im.data[i + 1], im.data[i + 2], i);
    }
  };
}

// A Gaussian blur of values weighted by a mask, divided by the blurred mask: what is masked out is filled from round it.
function gauss(sig) { const r = Math.ceil(sig * 3), k = []; for (let i = -r; i <= r; i++) k.push(Math.exp(-(i * i) / (2 * sig * sig))); return { r, k }; }
function blur(v, w, sig) {
  const { r, k } = gauss(sig), a = new Float64Array(W * H), b = new Float64Array(W * H), c = new Float64Array(W * H), d = new Float64Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, m = 0;
    for (let i = -r; i <= r; i++) { const xx = x + i; if (xx < 0 || xx >= W) continue; const j = xx + y * W; s += v[j] * w[j] * k[i + r]; m += w[j] * k[i + r]; }
    a[x + y * W] = s; b[x + y * W] = m;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, m = 0;
    for (let i = -r; i <= r; i++) { const yy = y + i; if (yy < 0 || yy >= H) continue; const j = x + yy * W; s += a[j] * k[i + r]; m += b[j] * k[i + r]; }
    c[x + y * W] = m > 1e-9 ? s / m : 0; d[x + y * W] = m;
  }
  return { value: c, weight: d };
}

const [stillFile, greyFile, blackFile] = files;
if (!stillFile || !greyFile || !blackFile) { console.error('usage: light.mjs still.png grey.png black.png [--fresh] [--blur 8] [--rate 1] [--dry] [--show out.png]'); process.exit(1); }
const [pic, still, grey, black] = await Promise.all([load(PIC), load(stillFile), load(greyFile), load(blackFile)]);
const pLum = new Float64Array(W * H), pMask = new Float64Array(W * H), sLum = new Float64Array(W * H), sMask = new Float64Array(W * H);
const sAt = footprint(still), gAt = footprint(grey), bAt = footprint(black);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const px = X0 + x + 0.5, py = Y0 + y + 0.5, j = x + y * W, q = (Math.floor(px) + Math.floor(py) * pic.w) * 3;
  if (rockOfPicture(px, py)) { pLum[j] = luma(pic.data[q], pic.data[q + 1], pic.data[q + 2]); pMask[j] = 1; }
  const out = Math.hypot(px - CX, py - CY) < R * 1.1 || LINES.some(([lx, ly]) => py > ly && Math.abs(px - lx) < (lx === 688 ? 14 : 6));
  let n = 0, rock = 0, s = 0;
  const gs = [];
  gAt(px, py, (r, g, b) => gs.push(luma(r, g, b)));
  let i = 0;
  bAt(px, py, (r, g, b) => { if (gs[i++] - luma(r, g, b) > 12) rock++; n++; });
  sAt(px, py, (r, g, b) => { s += luma(r, g, b); });
  if (!out && n && rock / n > 0.9) { sLum[j] = s / n; sMask[j] = 1; }
}
const P = blur(pLum, pMask, BLUR), S = blur(sLum, sMask, BLUR);

// The map S was drawn with, as powers of two at each texel.
const LO = LIGHTMAP.log[0], SPAN = LIGHTMAP.log[1] - LIGHTMAP.log[0];
let old = new Float64Array(TW * TH);
if (!process.argv.includes('--fresh') && existsSync(FILE)) {
  const m = await load(FILE);
  for (let i = 0; i < TW * TH; i++) old[i] = LO + (SPAN * m.data[i * 3]) / 255;
}
// What is still between them at each texel, where both have rock enough near it; elsewhere filled from round it.
const step = new Float64Array(TW * TH), sure = new Float64Array(TW * TH);
for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
  const x = Math.min(W - 1, Math.floor((tx + 0.5) * PER)), y = Math.min(H - 1, Math.floor((ty + 0.5) * PER)), j = x + y * W, t = tx + ty * TW;
  const wP = P.weight[j], wS = S.weight[j], norm = gauss(BLUR).k.reduce((a, b) => a + b, 0) ** 2;
  const w = Math.min(wP, wS) / norm;
  if (w < 0.08) continue;
  const r = (light(P.value[j]) + 2e-4) / (light(S.value[j]) + 2e-4);
  step[t] = Math.log2(r);
  sure[t] = Math.min(1, w / 0.3);
}
// Filled where it is not sure, from a wide blur of the sure, falling to no change far from any rock.
const wide = (v, w, sig) => {
  const { r, k } = gauss(sig), out = new Float64Array(TW * TH), m = new Float64Array(TW * TH);
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    let s = 0, n = 0;
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const xx = x + i, yy = y + j; if (xx < 0 || yy < 0 || xx >= TW || yy >= TH) continue; const g = k[i + r] * k[j + r], q = xx + yy * TW; s += v[q] * w[q] * g; n += w[q] * g; }
    out[x + y * TW] = s / (n + 0.05); m[x + y * TW] = n;
  }
  return out;
};
const filled = wide(step, sure, 3), next = new Float64Array(TW * TH);
for (let i = 0; i < TW * TH; i++) next[i] = old[i] + RATE * (step[i] * sure[i] + filled[i] * (1 - sure[i]));
// A last light smoothing, so no texel's own edge can show.
// And it comes to no change over the last few texels at its edges, so no seam can show where it ends.
const smooth = wide(next, new Float64Array(TW * TH).fill(1), 1), EDGE = 5;
for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) { const e = Math.min(x, y, TW - 1 - x, TH - 1 - y) / EDGE; if (e < 1) smooth[x + y * TW] *= Math.max(0, e) ** 2 * (3 - 2 * Math.max(0, e)); }
const bytes = new Uint8Array(TW * TH);
for (let i = 0; i < TW * TH; i++) { const v = Math.min(RANGE[1], Math.max(RANGE[0], smooth[i] * 1.05)); bytes[i] = Math.round(Math.min(255, Math.max(0, ((v - LO) / SPAN) * 255))); }

// How far apart the two are, over the hollow where both have rock: luma within a tenth (or 3 levels in the darks).
let n = 0, within = 0, sum = 0;
const rows = [];
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
  const j = x + y * W;
  if (!pMask[j] || !sMask[j]) continue;
  const a = P.value[j], b = S.value[j], d = Math.abs(b - a);
  n++; sum += d / Math.max(a, 10); if (d <= Math.max(0.1 * a, 3)) within++;
}
console.log(`blur ${BLUR} px · pixels ${n} · within a tenth ${(100 * within / Math.max(n, 1)).toFixed(1)}% · mean difference ${(100 * sum / Math.max(n, 1)).toFixed(1)}% · the map from 2^${Math.min(...smooth).toFixed(2)} to 2^${Math.max(...smooth).toFixed(2)}`);
if (!process.argv.includes('--dry')) { png(FILE, TW, TH, bytes, 1); console.log(`wrote ${FILE}`); }

const show = arg('--show');
if (show) {
  // The picture blurred, S blurred, their difference (pale where S is brighter, red where darker) and the map (red
  // under 1, pale over), each the map's size times two, one over another, the rock outlined.
  const SC = 1, rowH = H * SC, img = Buffer.alloc(W * SC * (rowH * 4 + 18) * 3, 18);
  const put = (row, x, y, c) => { const k = (x + (y + row * (rowH + 6)) * W) * 3; img[k] = c[0]; img[k + 1] = c[1]; img[k + 2] = c[2]; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = x + y * W, a = P.value[j], b = S.value[j], g = (v) => Math.max(0, Math.min(255, v));
    put(0, x, y, pMask[j] || P.weight[j] > 0.5 ? [g(a * 1.1), g(a * 0.75), g(a * 0.45)] : [30, 30, 50]);
    put(1, x, y, sMask[j] || S.weight[j] > 0.5 ? [g(b * 1.1), g(b * 0.75), g(b * 0.45)] : [30, 30, 50]);
    const d = (light(b) + 2e-4) / (light(a) + 2e-4), l = Math.log2(d);
    put(2, x, y, pMask[j] && sMask[j] ? (Math.abs(b - a) <= Math.max(0.1 * a, 3) ? [60, 60, 60] : l > 0 ? [g(120 + 60 * l), g(110 + 50 * l), g(80 + 30 * l)] : [g(120 - 60 * l), 30, 20]) : [18, 18, 30]);
    const t = Math.min(TW - 1, Math.floor(x / PER)) + Math.min(TH - 1, Math.floor(y / PER)) * TW, v = smooth[t];
    put(3, x, y, v > 0 ? [g(110 + 70 * v), g(100 + 70 * v), g(80 + 50 * v)] : [g(110 - 50 * v), g(100 + 40 * v), g(80 + 30 * v)]);
  }
  await sharp(img, { raw: { width: W, height: rowH * 4 + 18, channels: 3 } }).resize(W * 2).png().toFile(show);
  console.log(`show: ${show}`);
}
