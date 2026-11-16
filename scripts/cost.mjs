// What each part of the hero's world costs a frame: the hero's page timed whole, then with each part left out in turn.
//
//   npm run cost -- [options]
//
//   --scroll <px>        how far down the hero to time it (default 0, the first screen; 700 is by the core)
//   --keep 0             with the land drawn every frame, as it was before it was kept as a picture
//   --vp, --tier, --url  as in scripts/shot.mjs
//
// A part whose absence brings the frame under 16.7 ms is what holds the page under the screen's rate. Read the
// median and how many frames ran over 20 ms. The pointer is parked on the page first: with none, the cursor's light
// wanders and the world draws for that. Only a hardware run says anything, and only on a quiet machine.
import process from 'node:process';
import { browser, open, parseArgs, renderer, server } from './lib.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const scroll = Number(flags.scroll ?? 0);
const srv = await server(flags);
const b = await browser(flags);
try {
  const page = await open(b, srv.base, `/lab/hero?ui=0${flags.keep === '0' ? '&keep=0' : ''}`, flags, []);
  const r = await renderer(page);
  console.log(`renderer: ${r.name} · ${r.hardware ? 'hardware' : 'software'}`);
  await page.waitForTimeout(15000);
  await page.mouse.move(700, 300, { steps: 4 });
  for (let i = 1; i <= 20 && scroll; i++) { await page.evaluate((s) => scrollTo(0, s), (scroll * i) / 20); await page.waitForTimeout(80); }
  await page.waitForTimeout(3000);
  const time = (label, names) => page.evaluate(({ label, names }) => new Promise((done) => {
    window.__site.piece('world').without(names);
    const frames = []; let last = performance.now(), n = 0;
    const tick = () => { const now = performance.now(); frames.push(now - last); last = now; if (++n < 150) requestAnimationFrame(tick); else { const s = [...frames].sort((x, y) => x - y); done(`${label.padEnd(18)} median ${s[s.length >> 1].toFixed(1)} ms · mean ${(frames.reduce((a, c) => a + c, 0) / frames.length).toFixed(1)} · over 20 ms ${frames.filter((v) => v > 20).length}/150`); } };
    setTimeout(() => requestAnimationFrame(tick), 500);
  }), { label, names });
  const all = ['rock', 'skin', 'core', 'land', 'pyramid', 'spire', 'towers', 'trees', 'debris'];
  console.log(`the hero at scroll ${scroll}`);
  console.log(await time('everything', []));
  for (const p of all) console.log(await time(`without ${p}`, [p]));
  console.log(await time('nothing', all));
} finally {
  await b.close();
  await srv.stop();
}
