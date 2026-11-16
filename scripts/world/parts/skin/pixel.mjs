// The mean color of boxes of picture 9 (and of a still resampled into its pixels by topic.mjs, if given).
//   node scripts/world/parts/skin/pixel.mjs [ours.png] x,y,w,h ...
import sharp from 'sharp';
import { L } from '../../lib/plan.mjs';
const args = process.argv.slice(2), ours = args[0].endsWith('.png') ? args.shift() : null;
const read = async (f) => { const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width }; };
const P = await read(L.PICTURE.file), O = ours ? await read(ours) : null;
const mean = (im, x, y, w, h) => { const s = [0, 0, 0]; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) for (let c = 0; c < 3; c++) s[c] += im.data[(j * im.w + i) * 3 + c]; return s.map((v) => Math.round(v / (w * h))); };
for (const b of args) { const [x, y, w, h] = b.split(',').map(Number); console.log(b.padEnd(18), 'picture', mean(P, x, y, w, h).join(','), O ? ` ours ${mean(O, x, y, w, h).join(',')}` : ''); }
