// Picture 9's hollow and a still of sculpt S, each drawn as bands of brightness (black under 15, dark brown 15 to 30,
// red 30 to 60, orange 60 to 120, tan 120 to 150, pale 150 and over), one over the other at the picture's pixels: where
// each band lies in the picture against where it lies in S.
//   node scripts/world/parts/rock-s/bands.mjs <hollow PNG> <out.png>
import sharp from 'sharp';
import { isRock } from './curve.mjs';
const PIC = new URL('../../../../reference/concept/09-parts/09-the-whole-picture-at-1376.jpg', import.meta.url).pathname;
const CX = 688, CY = 437;
const load = async (f) => { const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
const reader = (im, isPic) => { const sc = isPic ? 1 : im.w / 869; return (px, py) => { const X = Math.round(isPic ? px : (434.5 + (px - CX) * 1.119) * sc), Y = Math.round(isPic ? py : (200 + (py - CY) * 1.119) * sc); const k = (X + Y * im.w) * 3; return [im.data[k], im.data[k + 1], im.data[k + 2]]; }; };
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const BANDS = [[15, [0, 0, 0]], [30, [70, 40, 20]], [60, [150, 40, 20]], [120, [230, 120, 30]], [150, [240, 200, 120]], [999, [255, 250, 220]]];
const [still, out] = process.argv.slice(2);
const gets = [reader(await load(PIC), true), reader(await load(still), false)];
const W = 720, H = 300, img = Buffer.alloc(W * (H * 2 + 6) * 3, 40);
gets.forEach((g, i) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const px = 330 + x, py = 300 + y, k = (x + (y + i * (H + 6)) * W) * 3; if (!isRock(px, py)) { img.set([25, 25, 60], k); continue; } const l = luma(g(px, py)); img.set(BANDS.find((b) => l < b[0])[1], k); } });
await sharp(img, { raw: { width: W, height: H * 2 + 6, channels: 3 } }).resize(W * 2).png().toFile(out);
