// Measures boxes of picture 9 and of a still of ours (resampled into the picture's pixels by topic.mjs): the median,
// darkest and brightest five percent of luminance, and green over red of what is lit.
//   node scripts/world/parts/skin/measure.mjs <ours.png> [x,y,w,h ...]
import sharp from 'sharp';
import { L } from '../../lib/plan.mjs';
const [ours, ...boxes] = process.argv.slice(2);
const BOX = boxes.length ? boxes : ['1230,380,10,10', '1190,470,10,10', '1140,620,10,10', '1080,560,10,10', '1150,320,100,30', '1150,395,25,30', '215,455,40,30', '130,330,80,120', '150,500,60,80', '1000,290,40,200', '290,300,30,250', '1100,300,60,120'];
const read = async (f) => { const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width }; };
const P = await read(L.PICTURE.file), O = await read(ours);
const stats = (im, x, y, w, h) => {
  const lum = [], gr = [];
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    const k = (j * im.w + i) * 3, r = im.data[k], g = im.data[k + 1], b = im.data[k + 2], l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lum.push(l); if (l > 40 && r > 0) gr.push(g / r);
  }
  lum.sort((a, b) => a - b); gr.sort((a, b) => a - b);
  const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN);
  return `${q(lum, 0.05).toFixed(0).padStart(3)} ${q(lum, 0.5).toFixed(0).padStart(3)} ${q(lum, 0.95).toFixed(0).padStart(3)}  g/r ${q(gr, 0.5).toFixed(2)}`;
};
console.log('box                 picture p5 p50 p95          ours p5 p50 p95');
for (const b of BOX) { const [x, y, w, h] = b.split(',').map(Number); console.log(`${b.padEnd(18)}  ${stats(P, x, y, w, h)}   |  ${stats(O, x, y, w, h)}`); }
