// The brightest tenth of each box of a still, its mean color and its blue and green over red: for holding colors to picture 9's.
//   node scripts/world/parts/skin/samp.mjs <still> x,y,w,h ...
import sharp from 'sharp';
const [file, ...boxes] = process.argv.slice(2);
const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
for (const b of boxes) {
  const [x, y, w, h] = b.split(',').map(Number);
  const px = [];
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const k = (j * info.width + i) * 3; px.push([data[k], data[k + 1], data[k + 2]]); }
  px.sort((a, b) => (b[0] + b[1] + b[2]) - (a[0] + a[1] + a[2]));
  const top = px.slice(0, Math.max(1, Math.floor(px.length * 0.1)));
  const m = [0, 1, 2].map((c) => Math.round(top.reduce((s, p) => s + p[c], 0) / top.length));
  console.log(b, 'brightest10%', m.join(','), 'b/r', (m[2] / m[0]).toFixed(2), 'g/r', (m[1] / m[0]).toFixed(2), 'max', px[0].join(','));
}
