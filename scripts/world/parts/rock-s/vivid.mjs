// How vivid sculpt S is against picture 9, as round 5's second review measured it, at the picture's own pixels: the
// share of the hollow's rock in each band of luma, and on lit faces (luma over 60) the mean local contrast (the
// deviation of 5 by 5 over its mean) and the share of pixels on a strong edge (a gradient over 24). Then the luma at
// the places round 6's brief names.
//   node scripts/world/parts/rock-s/vivid.mjs <hollow PNG> [<another> ...]
import sharp from 'sharp';
import { isRock } from './curve.mjs';

const PIC = new URL('../../../../reference/concept/09-parts/09-the-whole-picture-at-1376.jpg', import.meta.url).pathname;
const CX = 688, CY = 437, X0 = 320, X1 = 1060, Y0 = 310, Y1 = 610, W = X1 - X0, H = Y1 - Y0;
const BANDS = [15, 30, 60, 100, 150, 999];
const PLACES = [[870, 470], [1000, 420], [545, 470], [495, 360], [820, 380], [575, 470], [900, 430], [650, 532], [600, 520], [760, 520], [960, 440], [450, 320], [688, 335]];
async function grid(f, isPic) {
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = new Float64Array(W * H), sc = isPic ? 1 : info.width / 869, u = isPic ? 1 : 1.119 * sc;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = X0 + x, py = Y0 + y;
    const fx = isPic ? px : (434.5 + (px - CX) * 1.119) * sc, fy = isPic ? py : (200 + (py - CY) * 1.119) * sc;
    let s = 0, n = 0;
    for (let j = Math.floor(fy); j < Math.max(Math.floor(fy) + 1, Math.ceil(fy + u)); j++) for (let i = Math.floor(fx); i < Math.max(Math.floor(fx) + 1, Math.ceil(fx + u)); i++) {
      if (i < 0 || j < 0 || i >= info.width || j >= info.height) continue;
      const k = (i + j * info.width) * 3;
      s += 0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]; n++;
    }
    out[x + y * W] = n ? s / n : 0;
  }
  return out;
}
function stats(l) {
  const bands = new Array(BANDS.length).fill(0);
  let n = 0, lit = 0, con = 0, edge = 0;
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (!isRock(X0 + x, Y0 + y)) continue;
    const v = l[x + y * W];
    n++; bands[BANDS.findIndex((b) => v < b)]++;
    if (v <= 60) continue;
    lit++;
    let s = 0, s2 = 0;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const q = l[x + i + (y + j) * W]; s += q; s2 += q * q; }
    const m = s / 25; con += Math.sqrt(Math.max(0, s2 / 25 - m * m)) / Math.max(m, 1);
    const gx = l[x + 1 + y * W] - l[x - 1 + y * W], gy = l[x + (y + 1) * W] - l[x + (y - 1) * W];
    if (Math.hypot(gx, gy) > 24) edge++;
  }
  return { bands: bands.map((b) => (100 * b) / n), contrast: con / Math.max(lit, 1), edge: edge / Math.max(lit, 1) };
}
const files = process.argv.slice(2), all = [['picture 9', await grid(PIC, true)]];
for (const f of files) all.push([f.split('/').pop(), await grid(f, false)]);
const pad = (s, n = 26) => String(s).padEnd(n);
console.log(pad('', 14) + all.map(([n]) => pad(n.slice(0, 24))).join(''));
const st = all.map(([, l]) => stats(l));
['0-15', '15-30', '30-60', '60-100', '100-150', '150+'].forEach((b, i) => console.log(pad(`luma ${b}`, 14) + st.map((s) => pad(`${s.bands[i].toFixed(1)}%`)).join('')));
console.log(pad('contrast', 14) + st.map((s) => pad(s.contrast.toFixed(3))).join(''));
console.log(pad('edge share', 14) + st.map((s) => pad(s.edge.toFixed(3))).join(''));
const at = (l, x, y) => { let s = 0; for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) s += l[x - X0 + i + (y - Y0 + j) * W]; return s / 121; };
for (const [x, y] of PLACES) console.log(pad(`(${x},${y})`, 14) + all.map(([, l]) => pad(Math.round(at(l, x, y)))).join(''));
