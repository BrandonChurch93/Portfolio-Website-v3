// Frames of a page for a film, one file a frame, each with the clock held: the page is scrolled as a visitor would
// scroll it, the stream is told the same scroll (streamPlay), and every frame is drawn at its own moment before it is
// kept. So a film made of them shows what the page draws at each moment, at any speed of machine. It cannot show how
// smoothly a real machine draws it.
//
//   node scripts/world/slice/film.mjs "/lab/hero?ui=0&rock=p&sharp=0" --out shots/slice/film/new --from 0 --to 9 --fps 24
//
//   --scroll y0,y1,t0,t1   the page is at y0 until t0, eases to y1 by t1 and stays (CSS pixels). Default: stays at 0
//   --clip x,y,w,h         keep this part of the screen only (CSS pixels)
//   --vp, --scale, --tier  as npm run shot has them
//   --lamp x0,y0,x1,y1,t0,t1   the cursor's light, moved from one place to another between two times (shares of the
//                          screen). Default: left where the page has it
//   --only 12,40           take these frames only, by number: for a look before the whole film is taken
//   --say 1                print where every canvas of the page is, and stop
//
// Frames that are already there are left as they are, so a film that was stopped goes on from where it was.
// While frames are taken the page's own animation frames are held back: a page with its clock held still draws its
// canvases again in every one, which in a browser that draws in software is nearly all of the time a frame takes.
// Each frame is drawn once, by freeze(t). So open the page with ?sharp=0: the city at the screen's density is made
// over several frames, and here it would never be finished.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { browser, open, parseArgs, renderer, server } from '../../lib.mjs';

const { flags, rest } = parseArgs(process.argv.slice(2));
const route = rest[0];
if (!route || !flags.out) { console.error('usage: node scripts/world/slice/film.mjs <route> --out <folder> [--from 0 --to 9 --fps 24] [--scroll y0,y1,t0,t1] [--clip x,y,w,h]'); process.exit(1); }
const nums = (s) => String(s).split(',').map(Number);
const from = Number(flags.from ?? 0), to = Number(flags.to ?? 9), fps = Number(flags.fps ?? 24), count = Math.round((to - from) * fps);
const scroll = flags.scroll ? nums(flags.scroll) : null, clip = flags.clip ? nums(flags.clip) : null, lamp = flags.lamp ? nums(flags.lamp) : null;
const only = flags.only !== undefined ? new Set(nums(flags.only)) : null;
const ease = (k) => k * k * (3 - 2 * k), share = (t, t0, t1) => ease(Math.max(0, Math.min(1, (t - t0) / (t1 - t0))));

const srv = await server(flags);
const b = await browser(flags);
const errors = [];
try {
  const t0 = performance.now();
  const page = await open(b, srv.base, route, flags, errors);
  const r = await renderer(page);
  console.log(`renderer: ${r.name} · ${r.hardware ? 'hardware' : 'software'} · ready in ${((performance.now() - t0) / 1000).toFixed(0)} s`);
  if (flags.tier) await page.evaluate((v) => window.__site.tier(v), flags.tier);
  if (flags.say) {
    const boxes = await page.evaluate(() => [...document.querySelectorAll('canvas')].map((c) => { const q = c.getBoundingClientRect(); return { left: Math.round(q.left), top: Math.round(q.top + scrollY), wide: Math.round(q.width), tall: Math.round(q.height), pixels: `${c.width}x${c.height}`, in: (c.parentElement?.className ?? '').slice(0, 40) }; }));
    console.log(JSON.stringify({ page: await page.evaluate(() => [innerWidth, innerHeight, document.documentElement.scrollHeight, devicePixelRatio]), boxes }, null, 1));
  } else {
    fs.mkdirSync(flags.out, { recursive: true });
    if (scroll) await page.evaluate(([y0, y1, a, z]) => window.__site.call('streamPlay', y0, y1, a, z), scroll);
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    for (let i = 0; i < count; i++) {
      const file = path.join(flags.out, `f${String(i).padStart(4, '0')}.png`), t = from + i / fps;
      if ((only && !only.has(i)) || fs.existsSync(file)) continue;
      const began = performance.now();
      if (scroll) await page.evaluate((y) => { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); dispatchEvent(new Event('scroll')); }, Math.round(scroll[0] + (scroll[1] - scroll[0]) * share(t, scroll[2], scroll[3])));
      if (lamp) { const k = share(t, lamp[4], lamp[5]); await page.evaluate(([x, y]) => window.__site.lamp(x, y), [lamp[0] + (lamp[2] - lamp[0]) * k, lamp[1] + (lamp[3] - lamp[1]) * k]); }
      await page.evaluate((v) => window.__site.freeze(v), t);
      fs.writeFileSync(file, await page.screenshot({ type: 'png', timeout: 600000, ...(clip ? { clip: { x: clip[0], y: clip[1], width: clip[2], height: clip[3] } } : {}) }));
      console.log(`frame ${i} of ${count} · ${t.toFixed(3)} s · ${((performance.now() - began) / 1000).toFixed(1)} s`);
    }
  }
  if (errors.length) console.log(`ERROR: the page logged\n${[...new Set(errors)].join('\n')}`);
} finally {
  await b.close();
  await srv.stop?.();
}
