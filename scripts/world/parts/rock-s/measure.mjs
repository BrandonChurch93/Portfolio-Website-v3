// Sculpt S measured against picture 9 as its reviewers measure it: shares of lit (luma over 120), mid (25 to 90) and
// dark (under 25) pixels in rings round the ball and in regions of the hollow, and the luma at named places, all in
// the picture's own pixels. Also the hue of the bright pixels (green and blue over red).
//   node scripts/world/parts/rock-s/measure.mjs <a PNG of npm run look -- hollow --png> [<another>]
import sharp from 'sharp';
const PIC = new URL('../../../../reference/concept/09-parts/09-the-whole-picture-at-1376.jpg', import.meta.url).pathname;
const CX = 688, CY = 437, R = 90;
async function load(f) { const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }
// A pixel of the picture's at (px, py), read from an image: the picture itself, or a still of the hollow cut.
function reader(im, isPic) {
  const sc = isPic ? 1 : im.w / 869;
  return (px, py) => {
    const x = isPic ? px : (434.5 + (px - CX) * 1.119) * sc, y = isPic ? py : (200 + (py - CY) * 1.119) * sc;
    const X = Math.round(x), Y = Math.round(y);
    if (X < 0 || Y < 0 || X >= im.w || Y >= im.h) return null;
    const k = (X + Y * im.w) * 3;
    return [im.data[k], im.data[k + 1], im.data[k + 2]];
  };
}
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
function stats(get, test) {
  let n = 0, lit = 0, mid = 0, dark = 0, sum = 0, gr = 0, br = 0, nb = 0, mg = 0, mb = 0;
  for (let py = 260; py < 720; py++) for (let px = 230; px < 1080; px++) {
    if (!test(px, py)) continue;
    const c = get(px, py);
    if (!c) continue;
    const l = luma(c);
    n++; sum += l;
    if (l > 120) { lit++; if (c[0] > 0) { gr += c[1] / c[0]; br += c[2] / c[0]; nb++; } }
    if (l >= 25 && l <= 90) { mid++; if (c[0] > 0) { mg += c[1] / c[0]; mb += c[2] / c[0]; } }
    if (l < 25) dark++;
  }
  const p = (v) => `${Math.round((100 * v) / Math.max(n, 1))}`.padStart(3);
  return `${(sum / Math.max(n, 1)).toFixed(0).padStart(4)} ${p(dark)} ${p(mid)} ${p(lit)}  ${nb ? (gr / nb).toFixed(2) : ' -  '} ${nb ? (br / nb).toFixed(2) : ' -  '} ${mid ? (mg / mid).toFixed(2) : ' -  '} ${mid ? (mb / mid).toFixed(2) : ' -  '}`;
}
const ring = (a, b) => (px, py) => { const r = Math.hypot(px - CX, py - CY) / R; return r >= a && r < b && py > 300 && py < 610; };
const box = (x0, x1, y0, y1) => (px, py) => px >= x0 && px < x1 && py >= y0 && py < y1;
const REGIONS = {
  'ring 1.05-1.15': ring(1.05, 1.15), 'ring 1.15-1.3': ring(1.15, 1.3), 'ring 1.05-1.3': ring(1.05, 1.3), 'ring 1.3-1.8': ring(1.3, 1.8), 'ring 1.8-2.5': ring(1.8, 2.5), 'ring 2.5-3.5': ring(2.5, 3.5),
  'whole hollow 330-1050,300-600': box(330, 1050, 300, 600), 'round the ball 560-820': box(560, 820, 300, 600),
  'left books 330-560': box(330, 560, 300, 600), 'right side 820-1050': box(820, 1050, 300, 600),
  'floor 460-860,520-610': box(460, 860, 520, 610), 'roof 250-1060,270-330': box(250, 1060, 270, 330),
};
const PLACES = { 'far left board (315,520)': [315, 520], 'back wall/book wedge (545,470)': [545, 470], 'roof over ball (620,350)': [620, 350], 'right teeth (950,360)': [950, 360], 'right shelf (900,520)': [900, 520], 'floor top (650,532)': [650, 532], 'roof front left (450,320)': [450, 320], 'lower left lit (330,570)': [330, 570] };
const mean = (get, x, y) => { const s = [0, 0, 0]; let n = 0; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const c = get(x + i, y + j); if (!c) continue; s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; n++; } return s.map((v) => Math.round(v / n)); };

const files = process.argv.slice(2);
const gets = [['picture 9', reader(await load(PIC), true)]];
for (const f of files) gets.push([f.split('/').pop(), reader(await load(f), false)]);
console.log('region'.padEnd(32), gets.map(([n]) => n.slice(0, 30).padEnd(44)).join(''));
console.log(''.padEnd(32), gets.map(() => 'mean dark mid lit  g/r  b/r  (mid g/r b/r)'.padEnd(44)).join(''));
for (const [k, t] of Object.entries(REGIONS)) console.log(k.padEnd(32), gets.map(([, g]) => stats(g, t).padEnd(44)).join(''));
console.log('');
for (const [k, [x, y]] of Object.entries(PLACES)) console.log(k.padEnd(32), gets.map(([, g]) => { const c = mean(g, x, y); return `${Math.round(luma(c))} (${c})`.padEnd(44); }).join(''));
