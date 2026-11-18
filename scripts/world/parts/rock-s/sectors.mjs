// Sculpt S against picture 9 by ring and by sector: the mean luma and the share lit (over 120) and dark (under 25)
// of the rock in each 30 degree sector round the ball (0 is to the right, 90 straight up), for each ring.
//   node scripts/world/parts/rock-s/sectors.mjs <a PNG of npm run look -- hollow --png>
import sharp from 'sharp';
import { isRock } from './curve.mjs';
const PIC = new URL('../../../../reference/concept/09-parts/09-the-whole-picture-at-1376.jpg', import.meta.url).pathname;
const CX = 688, CY = 437, R = 90;
const load = async (f) => { const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
const reader = (im, isPic) => { const sc = isPic ? 1 : im.w / 869; return (px, py) => { const X = Math.round(isPic ? px : (434.5 + (px - CX) * 1.119) * sc), Y = Math.round(isPic ? py : (200 + (py - CY) * 1.119) * sc); const k = (X + Y * im.w) * 3; return [im.data[k], im.data[k + 1], im.data[k + 2]]; }; };
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const gets = [reader(await load(PIC), true), reader(await load(process.argv[2]), false)];
for (const [a, b] of [[1.08, 1.3], [1.3, 1.8], [1.8, 2.5], [2.5, 3.5]]) {
  const row = [];
  for (let s = 0; s < 12; s++) {
    const cell = gets.map(() => [0, 0, 0, 0]);
    for (let py = 300; py < 610; py++) for (let px = 330; px < 1050; px++) {
      if (!isRock(px, py)) continue;
      const r = Math.hypot(px - CX, py - CY) / R; if (r < a || r >= b) continue;
      const ang = (Math.atan2(CY - py, px - CX) * 180 / Math.PI + 360) % 360; if (Math.floor(ang / 30) !== s) continue;
      gets.forEach((g, i) => { const l = luma(g(px, py)); cell[i][0] += l; cell[i][1] += l > 120; cell[i][2] += l < 25; cell[i][3]++; });
    }
    row.push(cell[0][3] < 30 ? `${s * 30}: -` : `${s * 30}: ${cell.map((c) => `${Math.round(c[0] / c[3])}/${Math.round(100 * c[1] / c[3])}/${Math.round(100 * c[2] / c[3])}`).join(' ')}`);
  }
  console.log(`ring ${a}-${b} (mean/lit%/dark%, picture then S)`); console.log('  ' + row.join('\n  '));
}
