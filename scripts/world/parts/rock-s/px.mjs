// Means of 9 by 9 pixels of an image at the places given, with green and blue over red.
//   node scripts/world/parts/rock-s/px.mjs <image> x,y [x,y ...]
import sharp from 'sharp';
const [f, ...pts] = process.argv.slice(2);
const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
for (const p of pts) { const [x, y] = p.split(',').map(Number); const s=[0,0,0]; let n=0; for (let j=-4;j<=4;j++) for (let i=-4;i<=4;i++){ const k=((x+i)+(y+j)*info.width)*3; s[0]+=data[k];s[1]+=data[k+1];s[2]+=data[k+2];n++;} console.log(p, s.map(v=>Math.round(v/n)).join(','), (s[1]/s[0]).toFixed(2), (s[2]/s[0]).toFixed(2)); }
