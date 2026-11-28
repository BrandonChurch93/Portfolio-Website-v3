// Pictures of the 3D pieces, for a screen too narrow for the live ones (a phone, an iPad held upright): each is the
// real page with the clock held, cut to the piece and written as WebP. What each keeps is STILLS in
// src/config/stills.ts. Take them again whenever a piece has changed, from a production build of what is being
// pushed.
//
//   npm run still [-- world desk] [--url http://127.0.0.1:5333] [--tier high] [--within 180]
//
// --tier is the tier the pieces are made at, high unless said: the picture then shows the same world whichever
// machine takes it. It is asked for before the page makes anything (tierBefore in scripts/lib.mjs), and a picture
// whose piece was made first is not written.
// --within is how many seconds the page, the piece's first frame and the taking of the picture are each waited
// for. The world at tier high drawn in software takes longer than the 180 it has unless said.
import process from 'node:process';
import { writeFileSync } from 'node:fs';
import { browser, parseArgs, server, tierBefore, tierFirst } from '../lib.mjs';
import { STILLS } from '../../src/config/stills.ts';

const { flags, rest } = parseArgs(process.argv.slice(2));
const names = rest.length ? rest : Object.keys(STILLS);
const tier = flags.tier ?? 'high', within = Number(flags.within ?? 180) * 1000;
const srv = await server(flags), b = await browser(flags), errors = [];
try {
  for (const name of names) {
    const S = STILLS[name], K = S.keep;
    if (!S) throw new Error(`still: no such picture '${name}'`);
    const ctx = await b.newContext({ viewport: { width: S.screen[0], height: S.screen[1] }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${name}: console: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`${name}: page: ${e.message}`));
    const url = new URL(S.route, `${srv.base}/`);
    url.searchParams.set('hook', '1');
    await tierBefore(page, tier);
    await page.goto(url.href, { waitUntil: 'load', timeout: within });
    await page.waitForFunction(() => Boolean(window.__site), null, { timeout: within });
    if (!(await tierFirst(page))) throw new Error(`still: '${name}' made a piece before the tier ${tier} could be asked for, so it is not that tier's picture: nothing is written`);
    await page.waitForTimeout(Number(flags.wait ?? 6000));
    let left = 0;
    if (S.top) {
      const host = `[data-piece="${S.top}"]`;
      await page.waitForFunction((n) => { try { return window.__site.piece(n).stats().first > 0; } catch { return false; } }, S.top, { timeout: within });
      const top = await page.evaluate((h) => Math.round(document.querySelector(h).getBoundingClientRect().top + scrollY), host);
      await page.evaluate((y) => window.__site.scrollTo(y), top);
      left = await page.evaluate((h) => document.querySelector(h).getBoundingClientRect().left, host);
    }
    await page.evaluate((v) => window.__site.freeze(v), Number(flags.t ?? S.t));
    await page.evaluate(() => window.__site.settle());
    await page.waitForTimeout(3000);
    // A piece draws on a clear ground. `clear` keeps it so: nothing of the page is painted behind the piece.
    if (S.clear) await page.addStyleTag({ content: '*:not(canvas), *::before, *::after { background: transparent !important; box-shadow: none !important; }' });
    if (S.clear) await page.waitForTimeout(500);
    const png = await page.screenshot({ type: 'png', omitBackground: !!S.clear, clip: { x: left + K.x, y: K.y, width: K.w, height: K.h }, timeout: within });
    // The browser writes the file, at the picture's own scale: the build has no image library of its own.
    const kind = S.file.endsWith('.jpg') ? 'image/jpeg' : 'image/webp';
    const webp = await page.evaluate(async ([data, w, h, q, kind]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, w, h);
      return c.toDataURL(kind, q).split(',')[1];
    }, [png.toString('base64'), K.w * S.scale, K.h * S.scale, S.quality, kind]);
    const buf = Buffer.from(webp, 'base64'), out = `public${S.file}`;
    writeFileSync(out, buf);
    const made = await page.evaluate(() => window.__site.info().tier);
    console.log(`still: ${out} · ${K.w * S.scale} by ${K.h * S.scale} · ${(buf.length / 1024).toFixed(0)} KB · made at tier ${made}`);
    await ctx.close();
  }
} finally {
  await b.close();
  await srv.stop();
}
if (errors.length) { console.log(`ERRORS:\n${errors.join('\n')}`); process.exit(1); }
