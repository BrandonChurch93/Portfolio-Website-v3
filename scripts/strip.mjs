// A filmstrip: motion shown as frames side by side with the time under each. A still cannot show motion.
//
//   npm run strip -- <route> --times 0,0.5,1,1.5,2,3 [options]
//
//   --times <list>      the times to capture, in seconds
//   --opening           the times are seconds into the page's opening
//   --cols <n>          frames per row (default 4)
//   --tile <px>         width of each frame in the strip (default 640)
//   Every option of scripts/shot.mjs also works here and is applied before each frame.
//
// Read a strip left to right: does the motion start, build, peak and settle the way real motion would.
import process from 'node:process';
import { apply, browser, defaultOut, grab, open, parseArgs, renderer, save, server } from './lib.mjs';

const { flags, rest } = parseArgs(process.argv.slice(2));
const route = rest[0];
if (!route || !flags.times) { console.error('usage: npm run strip -- <route> --times 0,1,2,3 [--opening] [--cols 4] [--vp desktop] ...'); process.exit(1); }
const times = String(flags.times).split(',').map(Number);
const cols = Number(flags.cols ?? Math.min(4, times.length));
const tile = Number(flags.tile ?? 640);

const srv = await server(flags);
const b = await browser(flags);
const errors = [];
try {
  const page = await open(b, srv.base, route, flags, errors);
  const r = await renderer(page);
  console.log(`renderer: ${r.name} · ${r.hardware ? 'hardware' : 'software'}`);
  const frames = [];
  for (const t of times) {
    await apply(page, flags, t);
    frames.push(await grab(page, { ...flags, png: false }));
  }
  const cells = frames.map((buf, i) => `<figure><img src="data:image/jpeg;base64,${buf.toString('base64')}"><figcaption>${times[i].toFixed(2)} s</figcaption></figure>`).join('');
  const html = `<!doctype html><html><head><style>
    html, body { margin: 0; background: #141110; color: #d8cfc4; font: 500 15px ui-monospace, Menlo, monospace; }
    main { display: grid; grid-template-columns: repeat(${cols}, ${tile}px); gap: 8px; padding: 8px; width: max-content; }
    figure { margin: 0; } img { display: block; width: ${tile}px; height: auto; }
    figcaption { padding: 5px 2px 2px; text-align: center; }
  </style></head><body><main>${cells}</main></body></html>`;
  const sheet = await b.newPage({ deviceScaleFactor: 1 });
  await sheet.setContent(html, { waitUntil: 'load' });
  const out = flags.out ?? defaultOut(route, flags, 'strip');
  save(out, await (await sheet.$('main')).screenshot({ type: 'jpeg', quality: 90 }));
  console.log(`strip: ${out}`);
} finally {
  await b.close();
  await srv.stop();
}
if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
