// How much memory a page holds in Safari's engine, which is what an iPad ends a page for.
//
//   npm run mem -- <route> [<route> ...] [options]
//
//   --vp ipad|desktop|upright|phone   an iPad held sideways, as a touch screen (default), a desktop window, an
//                         iPad held upright, or a phone. The last two get the page of one column
//   --walk                open the index, go into each route by its link and come back, in one tab, as he does.
//                         What matters is that a second visit costs what the first did, and that leaving gives it back
//   --from <route>        with --walk, the page the walk begins on, in place of the index: "/?world=picture" walks
//                         the home page with the hero's world as its pictures
//   --warn                with --walk, send WebKit the memory warning an iPad sends a page that is getting large
//   --url <base>          use a site that is already running somewhere else
//   --profile             go down the page a screen at a time, as a visitor scrolls, resting three seconds on each, and
//                         print the GPU figure on each screen and the most of them: "the most it holds on the way
//                         down". The last screen is the foot. Read the most against the rule as well as loaded and foot
//
// It prints the footprint of WebKit's graphics process (GPU) and of the page's own process (Web), in MB, when the
// page has loaded and after it has been scrolled to its foot. These are the figures the system ends a process by.
// macOS only: it reads them with the system's own footprint tool. A dev server holds more than a production build:
// for a figure to compare, build, start it (npx next start -p 5340) and pass --url http://127.0.0.1:5340.
// The Work page alone, which never crashed his iPad, held about 1000 MB of GPU before the fix of Nov 15.
import process from 'node:process';
import { execSync } from 'node:child_process';
import { webkit } from 'playwright';
import { parseArgs, server } from './lib.mjs';

const argv = process.argv.slice(2);
const walk = argv.includes('--walk'), warn = argv.includes('--warn'), profile = argv.includes('--profile');
const { flags, rest: routes } = parseArgs(argv.filter((a) => a !== '--walk' && a !== '--warn' && a !== '--profile'));
if (!routes.length) { console.error('usage: npm run mem -- <route> [<route> ...] [--walk] [--warn] [--vp desktop] [--url <base>]'); process.exit(1); }
if (process.platform !== 'darwin') { console.error('mem: macOS only, it reads memory with the footprint tool'); process.exit(1); }

const procs = () => execSync('ps -axo pid=,comm= | grep -i WebKit | grep -v grep || true').toString().trim().split('\n').filter(Boolean).map((l) => { const m = l.trim().match(/^(\d+)\s+(.*)$/); return { pid: m[1], name: m[2].split('/').pop() }; });
const before = new Set(procs().map((p) => p.pid));
const foot = () => {
  const out = { GPU: 0, Web: 0 };
  for (const p of procs()) {
    if (before.has(p.pid)) continue;
    const kind = /GPU/.test(p.name) ? 'GPU' : /WebContent/.test(p.name) ? 'Web' : null;
    if (!kind) continue;
    try {
      const m = execSync(`footprint ${p.pid} 2>/dev/null | grep "phys_footprint:"`).toString().match(/phys_footprint: ([\d.]+) (\w+)/);
      if (m) out[kind] = Math.max(out[kind], Math.round(Number(m[1]) * (m[2] === 'GB' ? 1024 : m[2] === 'KB' ? 1 / 1024 : 1)));
    } catch { /* the process has gone */ }
  }
  return `GPU ${String(out.GPU).padStart(5)} MB · Web ${String(out.Web).padStart(5)} MB`;
};

const srv = await server(flags);
let b = await webkit.launch();
const errors = new Set();
try {
  const held = { upright: [834, 1194, 2], phone: [390, 844, 3] }[flags.vp] ?? [1194, 834, 2];
  const screen = flags.vp === 'desktop' ? { viewport: { width: 1728, height: 1000 }, deviceScaleFactor: 2 } : { viewport: { width: held[0], height: held[1] }, deviceScaleFactor: held[2], hasTouch: true, isMobile: true };
  let page;
  const fresh = async () => {
    // A browser of its own: WebKit's graphics process is one to a browser, and keeps some of what the last page held.
    if (page) { await b.close(); b = await webkit.launch(); }
    page = await (await b.newContext(screen)).newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.add(m.text().slice(0, 160)); });
    page.on('pageerror', (e) => errors.add(`page: ${e.message.slice(0, 160)}`));
    page.on('crash', () => errors.add('THE PAGE CRASHED'));
  };
  await fresh();
  // The page scrolls itself: a test browser with nothing asking for frames stops drawing them.
  const toFoot = async () => {
    const tall = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await page.evaluate((tall) => new Promise((done) => { const t0 = performance.now(), dur = Math.min(30000, Math.max(4000, tall * 3)); const f = () => { const k = Math.min(1, (performance.now() - t0) / dur); scrollTo(0, tall * k); if (k < 1) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); }), tall);
    await page.waitForTimeout(2500);
  };
  const say = (label) => { const s = foot(); console.log(`${label.padEnd(36)} ${s}`); return Number(s.match(/GPU\s+(\d+)/)[1]); };
  // A screen at a time, with frames asked for all the while, so the page draws and mounts as it would.
  const down = async (r, loaded) => {
    const tall = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), vh = await page.evaluate(() => innerHeight);
    const glide = (from, to) => page.evaluate(([from, to]) => new Promise((done) => { const t0 = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - t0) / 700); scrollTo(0, from + (to - from) * k); if (k < 1) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); }), [from, to]);
    const rest = (ms) => page.evaluate((ms) => new Promise((done) => { const t0 = performance.now(); const f = () => { if (performance.now() - t0 < ms) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); }), ms);
    let y = 0, most = loaded;
    while (y < tall) {
      const to = Math.min(tall, y + vh);
      await glide(y, to);
      y = to;
      await rest(3000);
      most = Math.max(most, say(`${r}, ${(y / vh).toFixed(1)} screens down`));
    }
    console.log(`${`${r}, the most, loaded or on the way down`.padEnd(36)} GPU ${String(most).padStart(5)} MB`);
  };
  if (walk) {
    await page.goto(`${srv.base}${flags.from ?? '/'}`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    say('the index');
    for (const r of routes) {
      const found = await page.evaluate((r) => { const a = [...document.querySelectorAll('a')].find((a) => a.getAttribute('href') === r); a?.click(); return !!a; }, r);
      if (!found) { console.log(`${r}: the index has no link to it`); continue; }
      await page.waitForTimeout(6000);
      await toFoot();
      say(`${r}, scrolled to its foot`);
      await page.evaluate(() => history.back());
      await page.waitForTimeout(4000);
      say('  back on the index');
      if (warn) { execSync('notifyutil -p org.WebKit.lowMemory'); await page.waitForTimeout(3500); say('  after a memory warning'); }
    }
  } else {
    // Each route alone, in a browser of its own.
    for (const r of routes) {
      await fresh();
      await page.waitForTimeout(1500);
      await page.goto(`${srv.base}${r}`, { waitUntil: 'load' });
      await page.waitForTimeout(6000);
      const loaded = say(`${r}, loaded`);
      if (profile) { await down(r, loaded); continue; }
      await toFoot();
      say(`${r}, scrolled to its foot`);
    }
  }
  if (errors.size) console.log(`errors:\n  ${[...errors].slice(0, 8).join('\n  ')}`);
} finally {
  await b.close();
  await srv.stop();
}
