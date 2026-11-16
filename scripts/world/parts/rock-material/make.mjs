// The rock's stone ships no map. Its grain is worked out in the page from a seed when the world loads
// (src/pieces/world/parts/rock/grain.ts), in about 70 ms cut into slices. This draws that same grain, lit from one
// side, to look at it alone, and times it:
//
//   node scripts/world/parts/rock-material/make.mjs [--crop 128]   shots/world/rockmat/maps-grain.png (and -crop)
//
// It is deterministic: every number comes from a seeded generator.
import process from 'node:process';
import sharp from 'sharp';
import { GRAIN, grain } from '../../../../src/pieces/world/parts/rock/grain.ts';

const crop = process.argv.includes('--crop') ? Number(process.argv[process.argv.indexOf('--crop') + 1]) || 128 : 0;
const t0 = performance.now();
const data = await grain(GRAIN.size);
console.log(`grain: ${GRAIN.size} square in ${(performance.now() - t0).toFixed(0)} ms`);
const n = GRAIN.size, L = [-0.55, -0.45, 0.7], ll = Math.hypot(...L), out = Buffer.alloc(n * n * 3);
for (let i = 0; i < n * n; i++) {
  const x = data[i * 4] / 127.5 - 1, y = data[i * 4 + 1] / 127.5 - 1, z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  const v = (0.15 + 0.85 * Math.max(0, (x * L[0] + y * L[1] + z * L[2]) / ll)) * (data[i * 4 + 3] / 255) * (0.7 + 0.6 * data[i * 4 + 2] / 255);
  out[i * 3] = Math.min(255, 200 * v); out[i * 3 + 1] = Math.min(255, 150 * v); out[i * 3 + 2] = Math.min(255, 100 * v);
}
let img = sharp(out, { raw: { width: n, height: n, channels: 3 } });
if (crop) img = img.extract({ left: 0, top: 0, width: crop, height: crop }).resize(n, n, { kernel: 'nearest' });
const file = `shots/world/rockmat/maps-grain${crop ? '-crop' : ''}.png`;
await img.png().toFile(file);
console.log(`preview: ${file}`);
