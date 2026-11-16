// A part of picture 9 enlarged, with a ruled grid in the picture's own pixels, for reading off where things are.
//
//   node scripts/world/grid.mjs <x,y,w,h> [--by 2] [--every 25] [--out shots/world/grid.jpg] [--of <picture>]
//
// The region is in the picture's pixels (reference/concept/09-parts/09-the-whole-picture-at-1376.jpg is 1376 by
// 768). Every line is labelled with its place in the picture.
import fs from 'node:fs';
import process from 'node:process';
import { browser, parseArgs, save } from '../lib.mjs';

const { flags, rest } = parseArgs(process.argv.slice(2));
const [x, y, w, h] = String(rest[0] ?? '0,0,1376,768').split(',').map(Number), by = Number(flags.by ?? 2), every = Number(flags.every ?? 25);
const file = String(flags.of ?? 'reference/concept/09-parts/09-the-whole-picture-at-1376.jpg'), out = String(flags.out ?? 'shots/world/grid.jpg');
const b = await browser(flags);
try {
  const page = await (await b.newContext({ viewport: { width: Math.ceil(w * by), height: Math.ceil(h * by) }, deviceScaleFactor: 1 })).newPage();
  await page.setContent(`<body style="margin:0;background:#000"><canvas id="c" width="${Math.ceil(w * by)}" height="${Math.ceil(h * by)}"></canvas></body>`);
  await page.evaluate(async ({ src, x, y, w, h, by, every }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.getElementById('c').getContext('2d');
    c.imageSmoothingQuality = 'high';
    c.drawImage(img, x, y, w, h, 0, 0, w * by, h * by);
    c.font = '11px ui-monospace, monospace';
    for (let gx = Math.ceil(x / every) * every; gx <= x + w; gx += every) {
      const major = gx % (every * 2) === 0, px = (gx - x) * by;
      c.fillStyle = major ? 'rgba(120,255,255,0.5)' : 'rgba(120,255,255,0.22)';
      c.fillRect(px, 0, 1, h * by);
      if (major) { c.fillStyle = '#7ff'; c.fillText(String(gx), px + 2, 11); c.fillText(String(gx), px + 2, h * by - 4); }
    }
    for (let gy = Math.ceil(y / every) * every; gy <= y + h; gy += every) {
      const major = gy % (every * 2) === 0, py = (gy - y) * by;
      c.fillStyle = major ? 'rgba(255,255,120,0.5)' : 'rgba(255,255,120,0.22)';
      c.fillRect(0, py, w * by, 1);
      if (major) { c.fillStyle = '#ff7'; c.fillText(String(gy), 2, py - 2); c.fillText(String(gy), w * by - 26, py - 2); }
    }
  }, { src: `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`, x, y, w, h, by, every });
  save(out, await page.screenshot({ type: 'jpeg', quality: 90 }));
  console.log(`grid: ${out}`);
} finally { await b.close(); }
