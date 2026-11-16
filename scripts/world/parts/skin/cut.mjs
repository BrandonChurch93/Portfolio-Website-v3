// Cuts a box out of a still, in its own pixels, and enlarges it: for looking at a place of the skin close.
//   node scripts/world/parts/skin/cut.mjs <still> x,y,w,h <out> [enlarge]
import sharp from 'sharp';
const [i, box, o, sc] = process.argv.slice(2), [x, y, w, h] = box.split(',').map(Number);
let s = sharp(i).extract({ left: x, top: y, width: w, height: h });
if (sc) s = s.resize(Math.round(w * Number(sc)));
await s.toFile(o);
