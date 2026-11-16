// Sculpt R: a part of npm run match's <out>-beside.jpg (cut at 250,240 860x480), picture above and still below, larger.
//
//   node scripts/world/parts/rock-r/pair.mjs shots/world/rock-r/<out>-beside.jpg x0,y0,x1,y1 <file>
import sharp from 'sharp';
const [file, box, out] = process.argv.slice(2);
const [x0, y0, x1, y1] = box.split(',').map(Number);
const m = await sharp(file).metadata(), half = Math.floor(m.width / 2), k = half / 860;
const at = (off) => ({ left: Math.round(off + (x0 - 250) * k), top: Math.round((y0 - 240) * k), width: Math.round((x1 - x0) * k), height: Math.round((y1 - y0) * k) });
const w = Math.round((x1 - x0) * k), h = Math.round((y1 - y0) * k), s = Math.min(3, 1400 / w);
const a = await sharp(file).extract(at(0)).resize(Math.round(w * s)).toBuffer(), b = await sharp(file).extract(at(m.width - half)).resize(Math.round(w * s)).toBuffer();
await sharp({ create: { width: Math.round(w * s), height: Math.round(h * s) * 2 + 6, channels: 3, background: '#000' } }).composite([{ input: a, top: 0, left: 0 }, { input: b, top: Math.round(h * s) + 6, left: 0 }]).jpeg({ quality: 90 }).toFile(out);
