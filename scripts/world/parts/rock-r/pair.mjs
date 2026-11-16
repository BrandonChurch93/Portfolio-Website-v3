// Sculpt R: a part of npm run match's <out>-beside.jpg, picture above and still below, larger. The cut the match was
// taken at (--at) is given last, as x,y,w,h in the picture's pixels (250,240,860,480 if left out).
//
//   node scripts/world/parts/rock-r/pair.mjs shots/world/rock-r/<out>-beside.jpg x0,y0,x1,y1 <file> [240,250,900,400]
import sharp from 'sharp';
const [file, box, out, cutAt] = process.argv.slice(2);
const [x0, y0, x1, y1] = box.split(',').map(Number);
const [CX, CY, CW] = (cutAt ?? '250,240,860,480').split(',').map(Number);
const m = await sharp(file).metadata(), half = Math.floor(m.width / 2), k = half / CW;
const at = (off) => ({ left: Math.round(off + (x0 - CX) * k), top: Math.round((y0 - CY) * k), width: Math.round((x1 - x0) * k), height: Math.round((y1 - y0) * k) });
const w = Math.round((x1 - x0) * k), h = Math.round((y1 - y0) * k), s = Math.min(3, 1400 / w);
const a = await sharp(file).extract(at(0)).resize(Math.round(w * s)).toBuffer(), b = await sharp(file).extract(at(m.width - half)).resize(Math.round(w * s)).toBuffer();
await sharp({ create: { width: Math.round(w * s), height: Math.round(h * s) * 2 + 6, channels: 3, background: '#000' } }).composite([{ input: a, top: 0, left: 0 }, { input: b, top: Math.round(h * s) + 6, left: 0 }]).jpeg({ quality: 90 }).toFile(out);
