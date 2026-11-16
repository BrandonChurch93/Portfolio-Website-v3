// A still of the hero's new world (/lab/piece/world), framed as it is judged: whole at the page's size, a part of
// it cut from that still, or a place of it at three times the page's size. And two pictures side by side in one
// image, which is how every part is judged against its picture from picture 9.
//
//   npm run look -- whole                         the whole world at the page's size (1460 by 1520 units)
//   npm run look -- hollow|pyramid|crown          that part at the page's size, cut from the whole
//   npm run look -- close:hollow|close:pyramid|close:crown   that place at three times the page's size (--zoom 2 for another)
//   npm run look -- only:rock                     one part alone (?only=)
//   npm run look -- beside a.jpg b.jpg --out c.jpg [--labels "Picture 9,Built"]   two pictures in one, same height
//
//   --out <file>     where to save (default shots/world/<what>.jpg)
//   --beside <file>  also save the still beside this picture, as <out>-beside.jpg
//   --w, --h         the size of the window for a close view or a part alone, in CSS pixels (default 1500 by 1000)
//   --scale <n>      device pixels to a CSS pixel (default 2)
//   --t <seconds>    hold the clock at this time (default 4)
//   --q "a=1&b=2"    more for the page's address
//   --tier, --lamp x,y, --eval js, --wait ms, --png, --url, --headed   as npm run shot has them
//
// It prints hardware or software, and every error the page logged: a shader that does not compile leaves a still
// with parts missing, so read what it prints.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { apply, browser, parseArgs, renderer, save, server, settle } from '../lib.mjs';
import { L, P } from './lib/plan.mjs';

const { flags, rest } = parseArgs(process.argv.slice(2));
const what = rest[0];
if (!what) { console.error('usage: npm run look -- whole|hollow|pyramid|crown|close:<place>|only:<part>|beside a b [--out file] [--beside picture]'); process.exit(1); }

const step = P.TOWERS[P.STEP], stepTop = L.drawn(step[0], L.ground(step[0], step[1]) + step[4], step[1]);
const core = L.drawn(...L.CORE.at), pyr = L.drawn(L.PYRAMID.x, L.ground(L.PYRAMID.x, L.PYRAMID.z) + L.PYRAMID.tall * 0.45, L.PYRAMID.z);
// Each part's place in the whole still, in units from the host's top left: what its picture from picture 9 shows.
const CUT = {
  hollow: [L.HOST.wide / 2 + core[0] - 434, core[1] - 200, 869, 518],
  pyramid: [L.HOST.wide / 2 + pyr[0] - 170, pyr[1] - 112, 340, 200],
  crown: [L.HOST.wide / 2 + stepTop[0] - 72, stepTop[1] - 52, 334, 256],
};

async function sideBySide(b, files, out, labels) {
  const page = await (await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })).newPage();
  const imgs = files.map((f) => `data:image/${/\.png$/i.test(f) ? 'png' : 'jpeg'};base64,${fs.readFileSync(f).toString('base64')}`);
  await page.setContent(`<body style="margin:0;background:#070403;width:20000px"><div id="row" style="display:inline-flex;flex-wrap:nowrap;gap:12px;padding:12px;align-items:flex-start">${imgs.map((src, i) => `<figure style="margin:0"><img src="${src}"><figcaption style="font:13px/2 ui-monospace,monospace;color:#cbbfb2;letter-spacing:.08em;text-transform:uppercase">${labels[i] ?? ''}</figcaption></figure>`).join('')}</div></body>`);
  await page.evaluate(async () => {
    const all = [...document.images];
    await Promise.all(all.map((i) => i.decode()));
    const tall = Math.min(1400, Math.max(...all.map((i) => i.naturalHeight)));
    for (const i of all) { i.style.height = `${tall}px`; i.style.width = 'auto'; i.style.display = 'block'; }
  });
  const box = await page.locator('#row').boundingBox();
  await page.setViewportSize({ width: Math.ceil(box.width), height: Math.ceil(box.height) });
  save(out, await page.screenshot({ type: 'jpeg', quality: 92 }));
  console.log(`beside: ${out}`);
  await page.context().close();
}

if (what === 'beside') {
  const b = await browser(flags);
  try { await sideBySide(b, [rest[1], rest[2]], flags.out ?? 'shots/world/beside.jpg', String(flags.labels ?? 'Picture 9,Built').split(',')); } finally { await b.close(); }
  process.exit(0);
}

const only = what.startsWith('only:') ? what.slice(5) : null, close = what.startsWith('close:') ? what.slice(6) : null;
if (!only && what !== 'whole' && !CUT[close ?? what]) { console.error(`look: no such view '${what}'`); process.exit(1); }
const page = { w: L.HOST.wide, h: L.HOST.tall };
const win = close || only ? { w: Number(flags.w ?? 1500), h: Number(flags.h ?? 1000) } : page;
const query = new URLSearchParams(`label=0&ui=0&size=${win.h}&wide=${win.w}`);
if (only) query.set('only', only);
if (close) { query.set('close', close); if (flags.zoom) query.set('zoom', String(flags.zoom)); }
for (const [k, v] of new URLSearchParams(String(flags.q ?? ''))) query.set(k, v);
const out = flags.out ?? `shots/world/${what.replace(':', '-')}.${flags.png ? 'png' : 'jpg'}`;

const srv = await server(flags), b = await browser(flags), errors = [];
try {
  const ctx = await b.newContext({ viewport: { width: win.w, height: win.h }, deviceScaleFactor: Number(flags.scale ?? 2) });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
  p.on('response', (r) => { if (r.status() >= 400 && !/favicon\.ico/.test(r.url())) errors.push(`${r.status()}: ${r.url()}`); });
  p.on('pageerror', (e) => errors.push(`page: ${e.message}`));
  const url = new URL(`/lab/piece/world?${query}`, `${srv.base}/`);
  url.searchParams.set('hook', '1');
  await p.goto(url.href, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => Boolean(window.__site), null, { timeout: 180000 });
  await settle(p);
  // The world is ready once its piece has drawn its first frame. On a busy machine that is long after the page has
  // loaded, and a still taken before it is black.
  await p.waitForFunction(() => { try { return window.__site.piece('world').stats().first > 0; } catch { return false; } }, null, { timeout: 150000 }).catch(() => console.log('look: the world never said it was ready (a part failed to load, or a file was mid write)'));
  await settle(p);
  const r = await renderer(p);
  console.log(`renderer: ${r.name} · ${r.hardware ? 'hardware' : 'software'}`);
  await apply(p, { ...flags, t: flags.t ?? 4 });
  const cut = !close && !only && CUT[what];
  const shot = { type: flags.png ? 'png' : 'jpeg', ...(flags.png ? {} : { quality: 93 }), ...(cut ? { clip: { x: cut[0], y: cut[1], width: cut[2], height: cut[3] } } : {}) };
  save(out, await p.screenshot(shot));
  console.log(`look: ${out}`);
  const stats = await p.evaluate(() => { try { return window.__site.piece('world').stats(); } catch { return null; } });
  if (stats) console.log(`stats: ${JSON.stringify(stats)}`);
  if (flags.beside) await sideBySide(b, [String(flags.beside), out], out.replace(/\.(jpg|png)$/, '-beside.jpg'), ['Picture 9', 'Built']);
} finally {
  await b.close();
  await srv.stop();
}
if (errors.length) { console.log(`ERRORS:\n${errors.join('\n')}`); process.exit(1); }
