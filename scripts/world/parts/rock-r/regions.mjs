// Brightness of named regions of the hollow, picture 9 against a still, from npm run match's <out>-beside.jpg cut at 250,240 860x480.
//
//   node scripts/world/parts/rock-r/regions.mjs shots/world/rock-r/<name>-beside.jpg
import sharp from 'sharp';
const file = process.argv[2];
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const half = Math.floor(info.width / 2), k = half / 860;
const R = {
  'left gap 310..370,400..520': [310, 400, 370, 520],
  'left mass 260..330,420..540': [260, 420, 330, 540],
  'right dark 955..1000,420..550': [955, 420, 1000, 550],
  'roof band 480..650,295..325': [480, 295, 650, 325],
  'ring left of core 560..595,400..470': [560, 400, 595, 470],
  'floor top 600..780,545..575': [600, 545, 780, 575],
  'left lit slab 390..450,380..540': [390, 380, 450, 540],
  'right slab 790..850,360..540': [790, 360, 850, 540],
  'roof left 450..600,310..370': [450, 310, 600, 370],
};
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
for (const [name, [x0, y0, x1, y1]] of Object.entries(R)) {
  const out = [];
  for (const off of [0, info.width - half]) {
    const ls = [], rgb = [0, 0, 0];
    let lin = 0;
    for (let y = Math.round((y0 - 240) * k); y < Math.round((y1 - 240) * k); y++) for (let x = Math.round((x0 - 250) * k); x < Math.round((x1 - 250) * k); x++) {
      const i = ((x + off) + y * info.width) * info.channels, r = data[i], g = data[i + 1], b = data[i + 2];
      ls.push(0.2126 * r + 0.7152 * g + 0.0722 * b); rgb[0] += r; rgb[1] += g; rgb[2] += b;
      lin += 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
    }
    ls.sort((a, b) => a - b);
    const n = ls.length;
    out.push(`med ${ls[n >> 1].toFixed(0).padStart(3)} p5 ${ls[Math.floor(n * 0.05)].toFixed(0).padStart(3)} lin ${(lin / n).toFixed(4)} rgb ${rgb.map((v) => Math.round(v / n)).join(',')}`);
  }
  console.log(name.padEnd(38), 'picture', out[0], ' | still', out[1]);
}
