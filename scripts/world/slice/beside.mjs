// Pictures side by side in one image, each with its name under it, every one at the same height: how the slice is
// shown beside picture 9 and beside the rock as it is today. A picture may be cut to a part of itself first.
//
//   node scripts/world/slice/beside.mjs --out shots/slice/three.jpg "Picture 9=a.jpg" "Today=b.jpg" "New=c.jpg"
//
//   "Name=file"                 a picture, whole
//   "Name=file@x,y,w,h"         a part of it, in shares of its own width and height (0 to 1)
//   --tall <px>                 the height each is drawn at (default 620)
//   --cols <n>                  how many to a row (default: all in one row)
//   --title "words"             a line over them all
//   --words <px>                the size of the names under the pictures (default 15); the title is a quarter larger
//   --png                       save a PNG and not a JPEG
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { browser, parseArgs } from '../../lib.mjs';

const { flags, rest } = parseArgs(process.argv.slice(2));
if (!rest.length || !flags.out) { console.error('usage: node scripts/world/slice/beside.mjs --out <file> "Name=file[@x,y,w,h]" ...'); process.exit(1); }
const tall = Number(flags.tall ?? 620), cols = Number(flags.cols ?? rest.length), words = Number(flags.words ?? 15);
const items = rest.map((r) => {
  const cut = r.indexOf('='), name = r.slice(0, cut), [file, part] = r.slice(cut + 1).split('@');
  return { name, part: part ? part.split(',').map(Number) : [0, 0, 1, 1], src: `data:image/${/\.png$/i.test(file) ? 'png' : 'jpeg'};base64,${fs.readFileSync(file).toString('base64')}` };
});

const b = await browser(flags);
try {
  const page = await (await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })).newPage();
  const cell = (it, i) => `<figure style="margin:0"><div class="win" data-i="${i}" style="height:${tall}px;overflow:hidden;position:relative"><img src="${it.src}" style="position:absolute;display:block"></div><figcaption style="font:600 ${words}px/2.4 ui-monospace,Menlo,monospace;color:#e3a567;letter-spacing:0.08em;text-transform:uppercase">${it.name}</figcaption></figure>`;
  const rows = [];
  for (let i = 0; i < items.length; i += cols) rows.push(`<div style="display:flex;flex-wrap:nowrap;gap:14px;align-items:flex-start">${items.slice(i, i + cols).map((it, j) => cell(it, i + j)).join('')}</div>`);
  const title = flags.title ? `<div style="font:600 ${Math.round(words * 1.27)}px/2.2 ui-sans-serif,system-ui,sans-serif;color:#ffe3c2">${flags.title}</div>` : '';
  await page.setContent(`<body style="margin:0;background:#070403;width:30000px"><div id="all" style="display:inline-flex;flex-direction:column;gap:6px;padding:16px 16px 6px">${title}${rows.join('')}</div></body>`);
  await page.evaluate(async ({ parts, tall }) => {
    await Promise.all([...document.images].map((i) => i.decode()));
    for (const win of document.querySelectorAll('.win')) {
      const img = win.firstElementChild, [x, y, w, h] = parts[Number(win.dataset.i)];
      const k = tall / (img.naturalHeight * h);
      win.style.width = `${Math.round(img.naturalWidth * w * k)}px`;
      img.style.width = `${img.naturalWidth * k}px`; img.style.height = `${img.naturalHeight * k}px`;
      img.style.left = `${-img.naturalWidth * x * k}px`; img.style.top = `${-img.naturalHeight * y * k}px`;
    }
  }, { parts: items.map((it) => it.part), tall });
  const box = await page.locator('#all').boundingBox();
  await page.setViewportSize({ width: Math.ceil(box.width), height: Math.ceil(box.height) });
  fs.mkdirSync(path.dirname(flags.out), { recursive: true });
  fs.writeFileSync(flags.out, await page.screenshot(flags.png ? { type: 'png' } : { type: 'jpeg', quality: 93 }));
  console.log(`beside: ${flags.out} · ${Math.ceil(box.width)} by ${Math.ceil(box.height)}`);
} finally {
  await b.close();
}
