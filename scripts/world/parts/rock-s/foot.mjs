// The lowest of S's rock in each column of the picture under the floor, from the flat grey and flat black stills of
// light.mjs: where the floor's underside hangs, in the picture's pixels.
//   node scripts/world/parts/rock-s/foot.mjs grey.png black.png
import sharp from 'sharp';
import { L } from '../../lib/plan.mjs';
const [g, b] = process.argv.slice(2);
const load = async (f) => { const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
const G = await load(g), B = await load(b), k = G.w / 1460, TIP = L.drawn(0, L.SPIRE.tall, 0)[1];
const out = [];
for (let px = 460; px <= 940; px += 20) {
  let low = 0;
  for (let py = 520; py < 660; py += 0.5) {
    const x = Math.round((730 + (px - L.PICTURE.mid) * L.PICTURE.unit) * k), y = Math.round((TIP + (py - L.PICTURE.tip) * L.PICTURE.unit) * k), i = (x + y * G.w) * 3;
    const lg = G.data[i] + G.data[i+1] + G.data[i+2], lb = B.data[i] + B.data[i+1] + B.data[i+2];
    if (lg - lb > 30) low = py;
  }
  out.push(`${px}:${low}`);
}
console.log(out.join(' '));
