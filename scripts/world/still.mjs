// The hero's world as one picture, for a screen too narrow for the live world (a phone, an iPad held upright).
// It is the real hero page: scrolled so the top of the world is at the top of the screen, with the stream fallen
// from the core, the clock held, cut to the world from over its spire to under its hollow and written as WebP.
// Take it again whenever the world has changed, from a production build of what is being pushed.
//
//   npm run still [-- --url http://127.0.0.1:5333] [--t 9] [--out public/media/world-still.webp]
import process from 'node:process';
import { writeFileSync } from 'node:fs';
import { browser, parseArgs, server } from '../lib.mjs';
import { STILL } from '../../src/hero/still.ts';

const { flags } = parseArgs(process.argv.slice(2));
const out = String(flags.out ?? `public${STILL.file}`), K = STILL.keep;
const srv = await server(flags), b = await browser(flags), errors = [];
try {
  // A screen exactly as wide as the board, so one of its units is one CSS pixel, and tall enough to hold the cut.
  const ctx = await b.newContext({ viewport: { width: STILL.board, height: K.h + 500 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`page: ${e.message}`));
  await page.goto(new URL('/lab/hero?ui=0&hook=1', `${srv.base}/`).href, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => Boolean(window.__site), null, { timeout: 180000 });
  await page.waitForFunction(() => { try { return window.__site.piece('world').stats().first > 0; } catch { return false; } }, null, { timeout: 180000 });
  const top = await page.evaluate(() => { const r = document.querySelector('[data-piece="world"]').getBoundingClientRect(); return Math.round(r.top + scrollY); });
  await page.evaluate((y) => window.__site.scrollTo(y), top);
  await page.evaluate((v) => window.__site.freeze(v), Number(flags.t ?? 9));
  await page.evaluate(() => window.__site.settle());
  await page.waitForTimeout(Number(flags.wait ?? 6000));
  const left = await page.evaluate(() => document.querySelector('[data-piece="world"]').getBoundingClientRect().left);
  const png = await page.screenshot({ type: 'png', clip: { x: left + K.x, y: K.y, width: K.w, height: K.h } });
  // The browser writes the WebP, at one pixel to a unit: the build has no image library of its own.
  const webp = await page.evaluate(async ([data, w, h, q]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/webp', q).split(',')[1];
  }, [png.toString('base64'), K.w, K.h, STILL.quality]);
  const buf = Buffer.from(webp, 'base64');
  writeFileSync(out, buf);
  console.log(`still: ${out} · ${K.w} by ${K.h} · ${(buf.length / 1024).toFixed(0)} KB`);
} finally {
  await b.close();
  await srv.stop();
}
if (errors.length) { console.log(`ERRORS:\n${errors.join('\n')}`); process.exit(1); }
