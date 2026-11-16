// Sculpt R: where each block is in the picture, as colors laid over picture 9 with each block's name at its middle.
//
//   node scripts/world/parts/rock-r/map.mjs <out.jpg>
import sharp from 'sharp';
import { plan } from './blocks.mjs';
import { PICTURE } from './see.mjs';
import { sample } from './hollow.mjs';

const out = process.argv[2] ?? 'shots/world/rock-r/map.jpg';
const args = await plan({ draft: true });
const X0 = 230, Y0 = 250, W = 880, H = 480, S = 2;
const pic = await sharp(PICTURE).extract({ left: X0, top: Y0, width: W, height: H }).resize(W * S).raw().toBuffer();
const buf = Buffer.from(pic), hue = (k) => [Math.sin(k * 2.1) * 0.5 + 0.5, Math.sin(k * 2.1 + 2.1) * 0.5 + 0.5, Math.sin(k * 2.1 + 4.2) * 0.5 + 0.5].map((v) => 60 + 195 * v);
for (let y = 0; y < H * S; y++) for (let x = 0; x < W * S; x++) {
  const px = X0 + (x + 0.5) / S, py = Y0 + (y + 0.5) / S;
  let best = -1, bd = 0;
  args.blocks.forEach((b, k) => { if (px < b.box[0] || px > b.box[2] || py < b.box[1] || py > b.box[3]) return; const d = sample(b.outline, px, py); if (d < bd) { bd = d; best = k; } });
  if (best < 0) continue;
  const c = hue(best), i = (x + y * W * S) * 3, edge = bd > -1.2;
  for (let q = 0; q < 3; q++) buf[i + q] = edge ? 255 * (q === 0) : buf[i + q] * 0.45 + c[q] * 0.55;
}
const svg = `<svg width="${W * S}" height="${H * S}">${args.blocks.map((b) => `<text x="${(b.at[0] - X0) * S}" y="${(b.at[1] - Y0) * S}" font-size="20" font-family="Helvetica" fill="#fff" stroke="#000" stroke-width="0.8" text-anchor="middle">${b.name}</text>`).join('')}</svg>`;
await sharp(buf, { raw: { width: W * S, height: H * S, channels: 3 } }).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 88 }).toFile(out);
console.log(out);
