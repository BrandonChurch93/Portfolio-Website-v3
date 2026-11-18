// Picture 9 and a still of the hollow cut at the same place, side by side at three times the picture's pixels.
//   node scripts/world/parts/rock-s/pair.mjs <hollow PNG> x0 y0 x1 y1 <out.jpg>   (x and y in the picture's pixels)
import sharp from 'sharp';
const [still, x0, y0, x1, y1, out] = process.argv.slice(2); const X0=+x0,Y0=+y0,X1=+x1,Y1=+y1;
const PIC = new URL('../../../../reference/concept/09-parts/09-the-whole-picture-at-1376.jpg', import.meta.url).pathname;
const meta = await sharp(still).metadata(); const sc = meta.width / 869;
const W = Math.round((X1 - X0) * 3), H = Math.round((Y1 - Y0) * 3);
const a = await sharp(PIC).extract({ left: X0, top: Y0, width: X1 - X0, height: Y1 - Y0 }).resize(W, H).toBuffer();
const sx = (434.5 + (X0 - 688) * 1.119) * sc, sy = (200 + (Y0 - 437) * 1.119) * sc, sw = (X1 - X0) * 1.119 * sc, sh = (Y1 - Y0) * 1.119 * sc;
const b = await sharp(still).extract({ left: Math.round(sx), top: Math.round(sy), width: Math.round(sw), height: Math.round(sh) }).resize(W, H).toBuffer();
await sharp({ create: { width: W * 2 + 10, height: H, channels: 3, background: '#000' } }).composite([{ input: a, left: 0, top: 0 }, { input: b, left: W + 10, top: 0 }]).jpeg({ quality: 90 }).toFile(out);
