// Sculpt R's check against the page: a still of the whole world (npm run match writes one as <out>-still.jpg) is
// read face by face, beside picture 9 and beside the light the make script worked out for each face.
//
//   node scripts/world/parts/rock-r/compare.mjs shots/world/rock-r/<name>-still.jpg
//
// It prints, over bands of what the picture's faces want, what the page shows and what the light model said, and
// fits the one number that turns the model's light into the page's: what the page's own light adds is the rest.
import fs from 'node:fs';
import sharp from 'sharp';
import { L } from '../../lib/plan.mjs';
import { facets } from './facets.mjs';
import { A_LUM, lum } from './relief.mjs';

const file = process.argv[2];
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const solved = JSON.parse(fs.readFileSync(new URL('./measured/solved.json', import.meta.url), 'utf8'));
const json = JSON.parse(fs.readFileSync(new URL('./measured/facets.json', import.meta.url), 'utf8'));
const r = await facets({ k: json.k, min: json.min, target: json.target ?? 2600, most: json.most ?? 1500 });
const u = L.PICTURE.unit, tip = L.drawn(0, L.SPIRE.tall, 0)[1], k = (L.HOST.wide / info.width) / u, x0 = L.PICTURE.mid - L.HOST.wide / 2 / u, y0 = L.PICTURE.tip - tip / u;
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const F = solved.length, sum = new Float64Array(F), cnt = new Float64Array(F);
for (let py = 0; py < r.H; py++) for (let px = 0; px < r.W; px++) {
  const f = r.lab[px + py * r.W];
  if (f < 0) continue;
  const sx = Math.round((px + 0.5 - x0) / k - 0.5), sy = Math.round((py + 0.5 - y0) / k - 0.5);
  if (sx < 0 || sy < 0 || sx >= info.width || sy >= info.height) continue;
  if ((px - 688) ** 2 + (py - 437) ** 2 < 100 ** 2) continue;
  const i = (sx + sy * info.width) * info.channels;
  sum[f] += lum([toLin(data[i]), toLin(data[i + 1]), toLin(data[i + 2])]); cnt[f]++;
}
// The page's radiance against the model's: radiance = albedo / pi * E for the model.
const rows = [];
for (let f = 0; f < F; f++) if (cnt[f] > 6 && r.faces[f]?.shown > 0.5) rows.push({ f, page: sum[f] / cnt[f], pic: lum(r.faces[f].rgb), model: (A_LUM / Math.PI) * solved[f].got, area: r.faces[f].area });
let a = 0, b = 0;
for (const q of rows) { a += q.page * q.model * q.area; b += q.model * q.model * q.area; }
console.log(`faces read ${rows.length}; the page is ${(a / b).toFixed(3)} times the model, fitted`);
const bands = [0, 0.005, 0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 1];
console.log('picture luminance band   faces   picture   page   model   page/picture');
for (let i = 0; i < bands.length - 1; i++) {
  const s = rows.filter((q) => q.pic >= bands[i] && q.pic < bands[i + 1]);
  if (!s.length) continue;
  const m = (key) => s.reduce((t, q) => t + q[key] * q.area, 0) / s.reduce((t, q) => t + q.area, 0);
  console.log(`${bands[i].toFixed(3)}..${bands[i + 1].toFixed(3)}`.padEnd(25), String(s.length).padEnd(7), m('pic').toFixed(4).padEnd(9), m('page').toFixed(4).padEnd(6), m('model').toFixed(4).padEnd(7), (m('page') / m('pic')).toFixed(2));
}
let e = 0, w = 0;
for (const q of rows) { e += Math.abs(Math.log2((q.page + 0.003) / (q.pic + 0.003))) * q.area; w += q.area; }
console.log(`page against picture, face by face: mean size ${(e / w).toFixed(2)} stops`);
