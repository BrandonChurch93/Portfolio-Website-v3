// Brightness of named regions of the hollow, picture 9 against a still, from npm run match's <out>-beside.jpg. The
// cut it was taken at (--at) is given second, as x,y,w,h in the picture's pixels (250,240,860,480 if left out).
//
//   node scripts/world/parts/rock-r/regions.mjs shots/world/rock-r/<name>-beside.jpg [240,250,900,400]
import sharp from 'sharp';
const file = process.argv[2];
const [X0, Y0, CW] = (process.argv[3] ?? '250,240,860,480').split(',').map(Number);
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
const half = Math.floor(info.width / 2), k = half / CW;
const R = {
  'left gap 310..370,400..520': [310, 400, 370, 520],
  'left mass 260..330,420..540': [260, 420, 330, 540],
  'left mass inner 285..330,430..540': [285, 430, 330, 540],
  'right dark 955..1000,420..550': [955, 420, 1000, 550],
  'roof band 480..650,295..325': [480, 295, 650, 325],
  'ring left of core 560..595,400..470': [560, 400, 595, 470],
  'ring right 780..830,380..470': [780, 380, 830, 470],
  'floor top 600..780,545..575': [600, 545, 780, 575],
  'under floor 560..870,600..648': [560, 600, 870, 648],
  'left lit slab 390..450,380..540': [390, 380, 450, 540],
  'right slab 790..850,360..540': [790, 360, 850, 540],
  'roof left 450..600,310..370': [450, 310, 600, 370],
  'lip 300..1000,268..300': [300, 268, 1000, 300],
  'left half 300..590,300..560': [300, 300, 590, 560],
  'right half 790..1050,300..560': [790, 300, 1050, 560],
};
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
for (const [name, [x0, y0, x1, y1]] of Object.entries(R)) {
  const out = [];
  for (const off of [0, info.width - half]) {
    const ls = [], rgb = [0, 0, 0];
    let lin = 0, black = 0;
    for (let y = Math.round((y0 - Y0) * k); y < Math.round((y1 - Y0) * k); y++) for (let x = Math.round((x0 - X0) * k); x < Math.round((x1 - X0) * k); x++) {
      const i = ((x + off) + y * info.width) * info.channels, r = data[i], g = data[i + 1], b = data[i + 2];
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      ls.push(l); rgb[0] += r; rgb[1] += g; rgb[2] += b; if (l < 20) black++;
      lin += 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
    }
    ls.sort((a, b) => a - b);
    const n = ls.length, med = toLin(ls[n >> 1]);
    out.push(`lin ${(lin / n).toFixed(4)} med ${med.toFixed(4)} black ${((100 * black) / n).toFixed(0).padStart(2)}% rgb ${rgb.map((v) => Math.round(v / n)).join(',')}`);
  }
  console.log(name.padEnd(36), 'picture', out[0], ' | still', out[1]);
}
