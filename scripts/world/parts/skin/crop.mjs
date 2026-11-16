// Cuts a part of a still of the whole world (npm run look -- whole --scale <s>) by a box in picture 9's pixels, and
// the same box of picture 9 at the same size beside it, for judging the skin close.
//
//   node scripts/world/parts/skin/crop.mjs <still> <scale> x,y,w,h --out <file> [--by 3] [--alone]
import fs from 'node:fs';
import process from 'node:process';
import sharp from 'sharp';
import { L } from '../../lib/plan.mjs';

const [still, scaleArg, boxArg] = process.argv.slice(2);
const flag = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const scale = Number(scaleArg), [x, y, w, h] = boxArg.split(',').map(Number), by = Number(flag('by', 3)), out = flag('out', 'shots/world/skin/crop.jpg');
const u = L.PICTURE.unit, tip = L.drawn(0, L.SPIRE.tall, 0)[1];
const x0 = L.PICTURE.mid - L.HOST.wide / 2 / u, y0 = L.PICTURE.tip - tip / u;
const k = u * scale;
const meta = await sharp(still).metadata();
const left = Math.max(0, Math.round((x - x0) * k)), top = Math.max(0, Math.round((y - y0) * k));
const W = Math.round(w * by), H = Math.round(h * by);
const built = await sharp(still).extract({ left, top, width: Math.min(meta.width - left, Math.round(w * k)), height: Math.min(meta.height - top, Math.round(h * k)) }).resize(W, H).toBuffer();
if (process.argv.includes('--alone')) { await sharp(built).jpeg({ quality: 92 }).toFile(out); }
else {
  const pic = await sharp(L.PICTURE.file).extract({ left: x, top: y, width: w, height: h }).resize(W, H, { kernel: 'lanczos3' }).toBuffer();
  await sharp({ create: { width: 2 * W + 12, height: H, channels: 3, background: '#070403' } }).composite([{ input: pic, left: 0, top: 0 }, { input: built, left: W + 12, top: 0 }]).jpeg({ quality: 92 }).toFile(out);
}
console.log(`crop: ${out}`);
