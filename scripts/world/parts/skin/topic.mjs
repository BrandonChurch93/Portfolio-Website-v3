// Resample a whole still (look whole --scale s) into picture 9's own pixel frame (1376x768 * by), so grid.mjs --of works.
import sharp from 'sharp';
import { L } from '../../lib/plan.mjs';
const [still, scaleArg, out, byArg] = process.argv.slice(2);
const scale = Number(scaleArg), by = Number(byArg ?? 1);
const u = L.PICTURE.unit, tip = L.drawn(0, L.SPIRE.tall, 0)[1];
const x0 = L.PICTURE.mid - L.HOST.wide / 2 / u, y0 = L.PICTURE.tip - tip / u, k = u * scale;
const meta = await sharp(still).metadata();
console.log({ x0, y0, k, w: meta.width, h: meta.height });
// picture pixel (px,py) -> still ((px-x0)*k, (py-y0)*k)
const W = 1376 * by, H = 768 * by;
const raw = await sharp(still).removeAlpha().raw().toBuffer();
const o = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const sx = ((x + 0.5) / by - x0) * k, sy = ((y + 0.5) / by - y0) * k;
  const ix = Math.floor(sx), iy = Math.floor(sy);
  if (ix < 0 || iy < 0 || ix >= meta.width - 1 || iy >= meta.height - 1) continue;
  const fx = sx - ix, fy = sy - iy;
  for (let c = 0; c < 3; c++) {
    const a = raw[(iy * meta.width + ix) * 3 + c], b = raw[(iy * meta.width + ix + 1) * 3 + c], d = raw[((iy + 1) * meta.width + ix) * 3 + c], e = raw[((iy + 1) * meta.width + ix + 1) * 3 + c];
    o[(y * W + x) * 3 + c] = Math.round((a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy);
  }
}
await sharp(o, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
