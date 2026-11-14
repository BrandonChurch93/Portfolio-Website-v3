// Real frames of a live page: what the browser drew, frame after frame, laid out as a sheet with the time under each.
//
// A filmstrip (scripts/strip.mjs) freezes the clock and lets every part of the page settle before each frame is taken.
// So it cannot show one part of the page drawing a frame behind another, or something that is wrong for one frame
// only. This can: nothing is frozen, and every frame the browser drew is kept.
//
//   npm run live -- <route> [options]
//
//   --before "<js>"       run in the page before the recording starts
//   --rest <ms>           how long to wait after it (default 1500)
//   --move x,y            put the pointer there, by moving it, before the recording starts
//   --click "<selector>"  click it once the recording has started. --nth n clicks the nth match
//   --wheel px[,speed]    wheel the page by so many px once the recording has started, at so many px a second (default 900)
//   --do "<js>"           run in the page once the recording has started
//   --ms <n>              how long to go on recording after that (default 800)
//   --crop x,y,w,h        the part of the screen to keep, in CSS px. Or a selector: that element's box, with --pad px round it
//   --skip n --every n --max n   which frames to keep (default every one, at most 32)
//   --cols n --tile px    the sheet
//   The options of scripts/shot.mjs that set a page up (--vp, --scale, --scroll, --lamp, --eval, --hover) are applied first.
import process from 'node:process';
import { apply, browser, defaultOut, open, parseArgs, renderer, save, server } from './lib.mjs';

const { flags, rest } = parseArgs(process.argv.slice(2));
const route = rest[0];
if (!route) { console.error('usage: npm run live -- <route> [--click "button"] [--wheel 600] [--crop "article"] [--ms 800] ...'); process.exit(1); }
const nums = (s) => String(s).split(',').map(Number);

const srv = await server(flags);
const b = await browser(flags);
const errors = [];
try {
  const page = await open(b, srv.base, route, flags, errors);
  const r = await renderer(page);
  console.log(`renderer: ${r.name} · ${r.hardware ? 'hardware' : 'software'}`);
  await apply(page, flags);
  if (flags.before) await page.evaluate(String(flags.before));
  await page.waitForTimeout(Number(flags.rest ?? 1500));
  if (flags.move) { const [x, y] = nums(flags.move); await page.mouse.move(x - 40, y - 12); await page.mouse.move(x, y, { steps: 6 }); await page.waitForTimeout(400); }

  const view = page.viewportSize();
  let crop = [0, 0, view.width, view.height];
  if (flags.crop && /^[\d.,\s-]+$/.test(String(flags.crop))) crop = nums(flags.crop);
  else if (flags.crop) {
    const box = await page.locator(String(flags.crop)).nth(Number(flags.at ?? 0)).boundingBox();
    if (!box) throw new Error(`--crop: nothing matches ${flags.crop}`);
    const pad = Number(flags.pad ?? 16);
    crop = [box.x - pad, box.y - pad, box.width + 2 * pad, box.height + 2 * pad];
  }
  crop[0] = Math.max(0, crop[0]); crop[1] = Math.max(0, crop[1]);
  crop[2] = Math.min(view.width - crop[0], crop[2]); crop[3] = Math.min(view.height - crop[1], crop[3]);

  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', (f) => { frames.push({ t: f.metadata.timestamp, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
  await page.waitForTimeout(80);
  const began = frames.length;
  if (flags.click) await page.locator(String(flags.click)).nth(Number(flags.nth ?? 0)).click();
  if (flags.do) await page.evaluate(String(flags.do));
  if (flags.wheel) {
    const [by, speed = 900] = nums(flags.wheel), step = (Math.sign(by) * speed) / 60;
    for (let y = 0; Math.abs(y) < Math.abs(by); y += step) { await page.mouse.wheel(0, step); await page.waitForTimeout(16); }
  }
  await page.waitForTimeout(Number(flags.ms ?? 800));
  await cdp.send('Page.stopScreencast');

  const every = Number(flags.every ?? 1), kept = frames.slice(Math.max(0, began - 1) + Number(flags.skip ?? 0)).filter((_, i) => i % every === 0).slice(0, Number(flags.max ?? 32));
  if (!kept.length) throw new Error('no frames were drawn: nothing on the page changed');
  const t0 = frames[Math.max(0, began - 1)].t;
  const cols = Number(flags.cols ?? Math.min(6, kept.length)), tile = Number(flags.tile ?? 360), k = tile / crop[2];
  const cells = kept.map((f) => `<figure><div><img src="data:image/jpeg;base64,${f.data}"></div><figcaption>${Math.round((f.t - t0) * 1000)} ms</figcaption></figure>`).join('');
  const html = `<!doctype html><html><head><style>
    html, body { margin: 0; background: #141110; color: #d8cfc4; font: 500 13px ui-monospace, Menlo, monospace; }
    main { display: grid; grid-template-columns: repeat(${cols}, ${tile}px); gap: 6px; padding: 6px; width: max-content; }
    figure { margin: 0; } div { width: ${tile}px; height: ${Math.round(crop[3] * k)}px; overflow: hidden; }
    img { display: block; width: ${Math.round(view.width * k)}px; height: auto; margin: ${-Math.round(crop[1] * k)}px 0 0 ${-Math.round(crop[0] * k)}px; }
    figcaption { padding: 3px 2px 1px; text-align: center; }
  </style></head><body><main>${cells}</main></body></html>`;
  const sheet = await b.newPage({ deviceScaleFactor: 1 });
  await sheet.setContent(html, { waitUntil: 'load' });
  const out = flags.out ?? defaultOut(route, flags, 'live');
  save(out, await (await sheet.$('main')).screenshot({ type: 'jpeg', quality: 90 }));
  console.log(`live: ${out} · ${frames.length - began} frames drawn, ${kept.length} kept`);
} finally {
  await b.close();
  await srv.stop();
}
if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
