import sharp from 'sharp';
import { isRock } from './curve.mjs';
const PIC = '/Users/brandonchurch/Desktop/portfolio-website-v3/reference/concept/09-parts/09-the-whole-picture-at-1376.jpg';
const load = async (f) => { const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
const reader = (im, isPic) => { const sc = isPic ? 1 : im.w / 869; return (px, py) => { const X = Math.round(isPic ? px : (434.5 + (px - 688) * 1.119) * sc), Y = Math.round(isPic ? py : (200 + (py - 437) * 1.119) * sc); const k = (X + Y * im.w) * 3; return [im.data[k], im.data[k + 1], im.data[k + 2]]; }; };
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
for (const [name, get] of [['pic', reader(await load(PIC), true)], ...await Promise.all(process.argv.slice(2).map(async f => [f.split('/').pop(), reader(await load(f), false)]))]) {
  console.log(name);
  for (const [a, b] of [[1.1, 1.5], [1.5, 2.2], [2.2, 3.0], [3.0, 5]]) {
    const st = Array.from({ length: 8 }, () => [0, 0, 0, 0, 0]);
    for (let py = 318; py < 600; py++) for (let px = 330; px < 1050; px++) { if (!isRock(px, py)) continue; const r = Math.hypot(px - 688, py - 437) / 90; if (r < a || r >= b) continue; const c = get(px, py); const l = luma(c); const k = Math.min(7, Math.floor(l / 30)); if (c[0] < 1) continue; st[k][0] += c[1] / c[0]; st[k][1] += c[2] / c[0]; st[k][2]++; st[k][3] += (c[1] / c[0]) ** 2; }
    let tot = st.reduce((s, v) => s + v[2], 0);
    console.log(`  ring ${a}-${b}`, st.map((v, k) => v[2] ? `${k * 30}:${Math.round(100 * v[2] / tot)}% ${(v[0] / v[2]).toFixed(2)}/${(v[1] / v[2]).toFixed(2)} sd${Math.sqrt(Math.max(0, v[3] / v[2] - (v[0] / v[2]) ** 2)).toFixed(2)}` : '').join(' '));
  }
}
