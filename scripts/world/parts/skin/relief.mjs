// The skin's coarse relief over a box of picture 9 as a height map, lighter where higher, tinted by what the pale tear
// says each place is (blue the whole crust, green a chunk's top, red the stone in section), for shaping it without a make.
//   node scripts/world/parts/skin/relief.mjs x,y,w,h,by <out.png>

import sharp from 'sharp';
const R = './';
const F = await import(R + 'features.mjs'), Fi = await import(R + 'field.mjs'), B = await import(R + 'blocks.mjs');
const features = { craters: F.craters(), segs: [], edges: F.edges(), knot: F.onShell(...F.KNOT) };
Fi.setup(features);
const [x0, y0, w, h, by] = (process.argv[2] ?? '1030,280,100,240,4').split(',').map(Number);
const W = w * by, H = h * by, out = Buffer.alloc(W * H * 3);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const px = x0 + (i + 0.5) / by, py = y0 + (j + 0.5) / by, q = F.onShell(px, py);
  if (!q) continue;
  const v = Fi.coarse(...q), t = Fi.tornPale(...q);
  const g = Math.max(0, Math.min(255, 150 + v * 8));
  const k = (j * W + i) * 3;
  out[k] = t.kind === 2 ? g * 0.6 : g; out[k + 1] = t.kind === 1 ? g : g * 0.8; out[k + 2] = t.kind === 0 ? g : g * 0.5;
}
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(process.argv[3] ?? 'shots/world/skin/s9-tearmap.png');
