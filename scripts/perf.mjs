// How smoothly a page runs: frame times over a few seconds of live running, and the numbers the page measures about itself.
//
//   npm run perf -- <route> [options]
//
//   --seconds <n>        how long to watch (default 6)
//   --cpu <n>            slow the processor n times, to stand in for a slower device (default 1)
//   --vp, --tier, --scale, --url, --headed   as in scripts/shot.mjs
//
// It prints hardware or software like the other scripts. Only a hardware run says anything about speed.
import process from 'node:process';
import { apply, browser, open, parseArgs, renderer, server } from './lib.mjs';

const { flags, rest } = parseArgs(process.argv.slice(2));
const route = rest[0];
if (!route) { console.error('usage: npm run perf -- <route> [--seconds 6] [--cpu 4] [--vp phone] [--tier low]'); process.exit(1); }
const seconds = Number(flags.seconds ?? 6);
const cpu = Number(flags.cpu ?? 1);

const srv = await server(flags);
const b = await browser(flags);
const errors = [];
try {
  const page = await open(b, srv.base, route, flags, errors);
  const r = await renderer(page);
  console.log(`renderer: ${r.name} · ${r.hardware ? 'hardware' : 'software'}`);
  await apply(page, flags);
  if (cpu > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  }
  const out = await page.evaluate((ms) => new Promise((done) => {
    const gaps = [];
    const peak = {};
    let last = performance.now();
    const until = last + ms;
    const tick = (now) => {
      gaps.push(now - last);
      last = now;
      for (const [k, v] of Object.entries(window.__site.info().stats)) peak[k] = Math.max(peak[k] ?? 0, v);
      if (now < until) requestAnimationFrame(tick);
      else done({ gaps, peak, tier: window.__site.info().tier });
    };
    requestAnimationFrame(tick);
  }), seconds * 1000);
  const gaps = out.gaps.slice(1).sort((x, y) => x - y);
  const at = (q) => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * q))];
  const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  console.log(`tier: ${out.tier} · cpu slowed ${cpu}x · ${gaps.length} frames in ${seconds} s`);
  console.log(`frame ms: mean ${mean.toFixed(1)} · median ${at(0.5).toFixed(1)} · 95th ${at(0.95).toFixed(1)} · worst ${at(1).toFixed(1)} · over 25 ms: ${gaps.filter((g) => g > 25).length}`);
  console.log(`peaks: ${Object.entries(out.peak).map(([k, v]) => `${k} ${Number(v.toFixed(2))}`).join(' · ') || 'none'}`);
} finally {
  await b.close();
  await srv.stop();
}
if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
