// The spire's outline laid over picture 9, worked out from the shipped file with the plan's own projection
// (pictured() in the layout), with no browser render of the world: for a round in which another part has broken
// the whole page. A geometric check of place and outline only, not of the look.
//
//   node scripts/world/parts/spire/outline.mjs [--at 560,0,260,300] [--out shots/world/spire/outline.jpg]
import fs from 'node:fs';
import process from 'node:process';
import { browser, parseArgs, save } from '../../../lib.mjs';
import { L } from '../../lib/plan.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const cut = String(flags.at ?? '560,0,260,300').split(',').map(Number), out = String(flags.out ?? 'shots/world/spire/outline.jpg'), by = 1600 / cut[3];
const buf = fs.readFileSync('public/world/spire.bin'), long = buf.readUInt32LE(8), head = JSON.parse(buf.subarray(12, 12 + long).toString()), base = 12 + long;
const tris = [];
for (const m of head.meshes) {
  const n = m.vertices, q = new Uint16Array(buf.buffer.slice(buf.byteOffset + base + m.position.offset, buf.byteOffset + base + m.position.offset + n * 6));
  const I = m.index.as === 'u32' ? Uint32Array : Uint16Array, idx = new I(buf.buffer.slice(buf.byteOffset + base + m.index.offset, buf.byteOffset + base + m.index.offset + m.index.count * I.BYTES_PER_ELEMENT));
  const at = (i) => L.pictured(...[0, 1, 2].map((k) => m.at[k] + (q[i * 3 + k] / 65535) * m.size)).map((v, k) => (v - cut[k]) * by);
  const pts = Array.from({ length: n }, (_, i) => at(i));
  for (let t = 0; t < idx.length; t += 3) tris.push(m.name === 'gold' ? 1 : 0, ...pts[idx[t]], ...pts[idx[t + 1]], ...pts[idx[t + 2]]);
}
const pic = `data:image/jpeg;base64,${fs.readFileSync(L.PICTURE.file).toString('base64')}`;
const b = await browser(flags);
try {
  const page = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage();
  await page.setContent('<body style="margin:0;background:#000"></body>');
  const data = await page.evaluate(async ({ pic, tris, cut, by }) => {
    const img = new Image(); img.src = pic; await img.decode();
    const w = Math.round(cut[2] * by), h = Math.round(cut[3] * by), c = document.createElement('canvas');
    c.width = w * 2 + 12; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    for (const x of [0, w + 12]) g.drawImage(img, cut[0], cut[1], cut[2], cut[3], x, 0, w, h);
    const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
    const mg = mask.getContext('2d');
    for (let i = 0; i < tris.length; i += 7) {
      mg.fillStyle = tris[i] ? 'rgba(255,200,120,1)' : 'rgba(110,200,255,1)';
      mg.beginPath(); mg.moveTo(tris[i + 1], tris[i + 2]); mg.lineTo(tris[i + 3], tris[i + 4]); mg.lineTo(tris[i + 5], tris[i + 6]); mg.closePath(); mg.fill();
    }
    g.globalAlpha = 0.45;
    g.drawImage(mask, w + 12, 0);
    g.globalAlpha = 1;
    return c.toDataURL('image/jpeg', 0.92);
  }, { pic, tris, cut, by });
  save(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log(`outline: ${out}`);
} finally { await b.close(); }
