// Draws the stone's maps lit from one side, flat, for looking at them alone: shots/world/rockmat/maps-<name>.png.
//
//   node scripts/world/parts/rock-material/preview.mjs [--crop 256]
import process from 'node:process';
import sharp from 'sharp';

const crop = Number(process.argv[process.argv.indexOf('--crop') + 1]) || 0;
const L = [-0.55, -0.45, 0.7], ll = Math.hypot(...L);
for (const name of ['grain', 'marks']) {
  const { data, info } = await sharp(`public/world/rockmat-${name}.png`).raw().toBuffer({ resolveWithObject: true });
  const n = info.width, c = info.channels, out = Buffer.alloc(n * n * 3);
  for (let i = 0; i < n * n; i++) {
    const x = data[i * c] / 127.5 - 1, y = data[i * c + 1] / 127.5 - 1, z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    const lit = Math.max(0, (x * L[0] + y * L[1] + z * L[2]) / ll);
    const shade = name === 'grain' ? data[i * c + 3] / 255 : 1 - 0.85 * data[i * c + 2] / 255;
    const fresh = name === 'marks' ? data[i * c + 3] / 255 : 0;
    const v = (0.15 + 0.85 * lit) * shade;
    out[i * 3] = Math.min(255, 200 * v + 40 * fresh); out[i * 3 + 1] = Math.min(255, 150 * v + 30 * fresh); out[i * 3 + 2] = Math.min(255, 100 * v + 20 * fresh);
  }
  let img = sharp(out, { raw: { width: n, height: n, channels: 3 } });
  if (crop) img = img.extract({ left: 0, top: 0, width: crop, height: crop }).resize(n, n, { kernel: 'nearest' });
  await img.png().toFile(`shots/world/rockmat/maps-${name}${crop ? '-crop' : ''}.png`);
  console.log(`preview: shots/world/rockmat/maps-${name}${crop ? '-crop' : ''}.png`);
}
