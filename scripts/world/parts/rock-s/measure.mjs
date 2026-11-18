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
const PLACES = { 'far left board (315,520)': [315, 520], 'back wall/book wedge (545,470)': [545, 470], 'roof over ball (620,350)': [620, 350], 'right teeth (950,360)': [950, 360], 'right shelf (900,520)': [900, 520], 'floor top (650,532)': [650, 532], 'roof front left (450,320)': [450, 320], 'lower left lit (330,570)': [330, 570], 'ball left side (575,470)': [575, 470], 'roof lobe dark (560,360)': [560, 360], 'roof just over ball (688,335)': [688, 335], 'under roof right (920,380)': [920, 380], 'floor left (560,545)': [560, 545], 'floor right (800,545)': [800, 545], 'left lobe lit (495,360)': [495, 360] };
const mean = (get, x, y) => { const s = [0, 0, 0]; let n = 0; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const c = get(x + i, y + j); if (!c) continue; s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; n++; } return s.map((v) => Math.round(v / n)); };

const files = process.argv.slice(2);
const gets = [['picture 9', reader(await load(PIC), true)]];
for (const f of files) gets.push([f.split('/').pop(), reader(await load(f), false)]);
console.log('region'.padEnd(32), gets.map(([n]) => n.slice(0, 30).padEnd(44)).join(''));
console.log(''.padEnd(32), gets.map(() => 'mean dark mid lit  g/r  b/r  (mid g/r b/r)'.padEnd(44)).join(''));
for (const [k, t] of Object.entries(REGIONS)) console.log(k.padEnd(32), gets.map(([, g]) => stats(g, t).padEnd(44)).join(''));
console.log('');
for (const [k, [x, y]] of Object.entries(PLACES)) console.log(k.padEnd(32), gets.map(([, g]) => { const c = mean(g, x, y); return `${Math.round(luma(c))} (${c})`.padEnd(44); }).join(''));

// The color of the rock over the whole hollow outside the ball (1.08 R), as the reviewers measured it: the share of
// pixels in the fullest 5 degree bin of hue and which bin that is, the share between 15 and 35 degrees, the median
// saturation (HSV) and its tenth percentile, the mean of the lit (luma over 120), the mid (25 to 90) and the dark
// (8 to 25) pixels, and green and blue over red of the mids far from the ball (over 1.8 R) and of the brights (over 150).
function color(get) {
  const bins = new Array(72).fill(0), sats = [], sum = { lit: [0, 0, 0, 0], mid: [0, 0, 0, 0], dark: [0, 0, 0, 0] };
  let n = 0, inBand = 0, fm = [0, 0, 0], br = [0, 0, 0];
  for (let py = 300; py < 600; py++) for (let px = 330; px < 1050; px++) {
    const rr = Math.hypot(px - CX, py - CY) / R;
    if (rr < 1.08) continue;
    const c = get(px, py);
    if (!c) continue;
    const l = luma(c);
    if (l < 8) continue;
    const mx = Math.max(...c), mn = Math.min(...c), d = mx - mn;
    let h = 0;
    if (d > 0) h = mx === c[0] ? ((c[1] - c[2]) / d) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
    h = (h * 60 + 360) % 360;
    n++; bins[Math.floor(h / 5)]++; if (h >= 15 && h < 35) inBand++;
    sats.push(mx ? d / mx : 0);
    const k = l > 120 ? 'lit' : l >= 25 && l <= 90 ? 'mid' : l < 25 ? 'dark' : null;
    if (k) { sum[k][0] += c[0]; sum[k][1] += c[1]; sum[k][2] += c[2]; sum[k][3]++; }
    if (l >= 25 && l <= 90 && rr > 1.8 && c[0] > 0) { fm[0] += c[1] / c[0]; fm[1] += c[2] / c[0]; fm[2]++; }
    if (l > 150 && c[0] > 0) { br[0] += c[1] / c[0]; br[1] += c[2] / c[0]; br[2]++; }
  }
  sats.sort((a, b) => a - b);
  const top = bins.indexOf(Math.max(...bins)), m = (s) => `(${s.slice(0, 3).map((v) => Math.round(v / Math.max(s[3], 1))).join(',')})`;
  return [`top bin ${top * 5}-${top * 5 + 5}: ${Math.round((100 * bins[top]) / n)}%  15-35: ${Math.round((100 * inBand) / n)}%`, `sat median ${sats[sats.length >> 1].toFixed(2)} p10 ${sats[Math.floor(sats.length * 0.1)].toFixed(2)}`, `lit ${m(sum.lit)} mid ${m(sum.mid)} dark ${m(sum.dark)}`, `far mids g/r ${(fm[0] / Math.max(fm[2], 1)).toFixed(2)} b/r ${(fm[1] / Math.max(fm[2], 1)).toFixed(2)}  brights g/r ${(br[0] / Math.max(br[2], 1)).toFixed(2)} b/r ${(br[1] / Math.max(br[2], 1)).toFixed(2)}`];
}
console.log('');
const cols = gets.map(([, g]) => color(g));
for (let i = 0; i < 4; i++) console.log((i ? '' : 'color').padEnd(32), cols.map((c) => c[i].padEnd(44)).join(''));
