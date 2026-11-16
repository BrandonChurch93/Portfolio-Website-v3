// A still of the whole world at the page's size (npm run match writes one as <out>-still.jpg) put in picture 9's own
// frame, 1376 by 768, so scripts/world/grid.mjs can rule it with --of, beside the picture ruled the same way.
//
//   node scripts/world/parts/rock-r/framed.mjs <still.jpg> <out.jpg>
import sharp from 'sharp';
import { L } from '../../lib/plan.mjs';

const [file, out] = process.argv.slice(2);
const { width } = await sharp(file).metadata();
const u = L.PICTURE.unit, tip = L.drawn(0, L.SPIRE.tall, 0)[1], k = L.HOST.wide / width / u;
const x0 = L.PICTURE.mid - L.HOST.wide / 2 / u, y0 = L.PICTURE.tip - tip / u;
const big = await sharp(file).resize(Math.round(width * k)).toBuffer({ resolveWithObject: true });
const left = Math.round(x0), top = Math.round(y0);
await sharp({ create: { width: L.PICTURE.wide, height: L.PICTURE.tall, channels: 3, background: '#000' } })
  .composite([{ input: await sharp(big.data).extract({ left: Math.max(0, -left), top: Math.max(0, -top), width: Math.min(big.info.width - Math.max(0, -left), L.PICTURE.wide - Math.max(0, left)), height: Math.min(big.info.height - Math.max(0, -top), L.PICTURE.tall - Math.max(0, top)) }).toBuffer(), left: Math.max(0, left), top: Math.max(0, top) }])
  .jpeg({ quality: 92 }).toFile(out);
console.log(`framed: ${out}`);
