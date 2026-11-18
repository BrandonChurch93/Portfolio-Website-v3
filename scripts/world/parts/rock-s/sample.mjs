// Sculpt S: the mean color at named places of the hollow, in picture 9 and in a still of it.
//   node scripts/world/parts/rock-s/sample.mjs <a PNG of npm run look -- hollow --png>
import sharp from 'sharp';
const PIC = new URL('../../../../reference/concept/09-parts/09-the-whole-picture-at-1376.jpg', import.meta.url).pathname;
const still = process.argv[2];
const places = {
  'near ball, left (600,420)': [600, 420], 'near ball, right (778,410)': [778, 410], 'near ball, above (690,338)': [690, 338], 'floor top (650,532)': [650, 532],
  'back outer, left (565,385)': [565, 385], 'back outer, right (835,440)': [835, 440],
  'far lit, left book (440,450)': [440, 450], 'far lit, right slab (895,420)': [895, 420], 'far lit, left low (330,570)': [330, 570],
  'turned away, left (350,420)': [350, 420], 'turned away, right (990,470)': [990, 470], 'floor front (600,570)': [600, 570],
  'roof front (450,320)': [450, 320], 'roof front (900,300)': [900, 300], 'deep, under roof (520,350)': [520, 350],
};
async function load(f) { const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }
const mean = (im, x, y, r) => { const s = [0, 0, 0]; let n = 0; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const X = Math.round(x + i), Y = Math.round(y + j); if (X < 0 || Y < 0 || X >= im.w || Y >= im.h) continue; const k = (X + Y * im.w) * 3; s[0] += im.data[k]; s[1] += im.data[k + 1]; s[2] += im.data[k + 2]; n++; } return s.map((v) => Math.round(v / n)); };
const pic = await load(PIC), st = await load(still);
const sc = st.w / 869;
console.log('place'.padEnd(34), 'picture'.padEnd(16), 'still');
for (const [k, [px, py]] of Object.entries(places)) {
  const sx = (434.5 + (px - 688) * 1.119) * sc, sy = (200 + (py - 437) * 1.119) * sc;
  console.log(k.padEnd(34), String(mean(pic, px, py, 3)).padEnd(16), String(mean(st, sx, sy, Math.round(3 * 1.119 * sc))));
}
