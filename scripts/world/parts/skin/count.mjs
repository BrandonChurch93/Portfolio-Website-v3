// Counts the pixels of lossless stills that are bluer or greener than they are red, or past pale gold.
//   node scripts/world/parts/skin/count.mjs <still.png> ...
import sharp from 'sharp';
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let b = 0, g = 0, w = 0; const n = info.width * info.height;
  for (let i = 0; i < n; i++) { const R = data[i*3], G = data[i*3+1], B = data[i*3+2]; if (B > R) b++; if (G > R) g++; if (G > 227 || B > 194) w++; }
  console.log(f.split('/').pop(), n, 'bluer', b, 'greener', g, 'past pale', w);
}
