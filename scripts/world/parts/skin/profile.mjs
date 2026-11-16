// The colors down one column (or along one row) of a still, for reading a cleft's profile across it.
//   node scripts/world/parts/skin/profile.mjs <still> x <y0> <y1>      (a column)   or   ... row <y> <x0> <x1>
import sharp from 'sharp';
const [file, a, b, c, d] = process.argv.slice(2);
const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const row = a === 'row', fixed = Number(row ? b : a), from = Number(row ? c : b), to = Number(row ? d : c);
const out = [];
for (let t = from; t <= to; t++) { const x = row ? t : fixed, y = row ? fixed : t, k = (y * info.width + x) * 3; out.push(`${t}:${data[k]},${data[k + 1]},${data[k + 2]}`); }
console.log(out.join('  '));
