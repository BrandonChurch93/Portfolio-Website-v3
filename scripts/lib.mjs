// Shared by scripts/shot.mjs and scripts/strip.mjs.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export const VIEWPORTS = {
  phone: { width: 390, height: 844, scale: 3, touch: true },
  tablet: { width: 834, height: 1194, scale: 2, touch: true },
  'tablet-wide': { width: 1194, height: 834, scale: 2, touch: true },
  desktop: { width: 1440, height: 900, scale: 2, touch: false },
  wide: { width: 1920, height: 1080, scale: 1, touch: false },
  '4k': { width: 3840, height: 2160, scale: 1, touch: false },
};

const DEV = 'http://127.0.0.1:5330';
const SOFTWARE = /swiftshader|llvmpipe|software/i;

export function parseArgs(argv) {
  const flags = {};
  const rest = [];
  const bare = new Set(['full', 'headed', 'png', 'opening', 'nofreeze']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { rest.push(a); continue; }
    const key = a.slice(2);
    if (bare.has(key)) flags[key] = true;
    else { flags[key] = argv[i + 1]; i++; }
  }
  return { flags, rest };
}

async function up(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return r.status < 500;
  } catch {
    return false;
  }
}

// Uses the dev server if one is running, else starts one and stops it at the end.
export async function server(flags) {
  if (flags.url) return { base: flags.url.replace(/\/$/, ''), stop: async () => {} };
  if (await up(DEV)) return { base: DEV, stop: async () => {} };
  console.log('server: starting next dev on 5330');
  const child = spawn('npx', ['next', 'dev', '-p', '5330', '-H', '127.0.0.1'], { stdio: 'ignore', detached: true });
  const until = Date.now() + 90000;
  while (Date.now() < until) {
    if (await up(DEV)) return { base: DEV, stop: async () => { try { process.kill(-child.pid); } catch { /* already gone */ } } };
    await new Promise((r) => setTimeout(r, 500));
  }
  try { process.kill(-child.pid); } catch { /* already gone */ }
  throw new Error('the dev server did not start within 90 seconds');
}

function launchArgs() {
  const args = ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader'];
  if (process.platform === 'darwin') args.push('--enable-gpu', '--use-angle=metal');
  return args;
}

// Playwright's own Chromium if it is installed, else the Chrome on this machine.
export async function browser(flags) {
  const tries = [{ channel: 'chromium' }, { channel: 'chrome' }];
  let last;
  for (const t of tries) {
    try {
      return await chromium.launch({ ...t, headless: !flags.headed, args: launchArgs() });
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`no browser to launch. Run "npx playwright install chromium", or install Chrome.\n${last?.message ?? ''}`);
}

export async function open(b, base, route, flags, errors) {
  const vp = VIEWPORTS[flags.vp ?? 'desktop'];
  if (!vp) throw new Error(`--vp must be one of ${Object.keys(VIEWPORTS).join(', ')}`);
  const scale = flags.scale ? Number(flags.scale) : vp.scale;
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: scale, hasTouch: vp.touch, isMobile: vp.touch });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon\.ico/.test(r.url())) errors.push(`${r.status()}: ${r.url()}`); });
  page.on('pageerror', (e) => errors.push(`page: ${e.message}`));
  const url = new URL(route, `${base}/`);
  url.searchParams.set('hook', '1');
  await page.goto(url.href, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => Boolean(window.__site), null, { timeout: 120000 });
  await settle(page);
  return page;
}

export async function settle(page) {
  await page.evaluate(() => window.__site.settle());
}

export async function renderer(page) {
  const name = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'none';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  });
  const hardware = name !== 'none' && !SOFTWARE.test(name);
  return { name, hardware };
}

const nums = (s) => String(s).split(',').map(Number);

// The state flags, applied in a fixed order. t overrides --t for a filmstrip frame.
export async function apply(page, flags, t) {
  if (flags.tier) await page.evaluate((v) => window.__site.tier(v), flags.tier);
  if (flags.scroll !== undefined) {
    const s = String(flags.scroll);
    if (s.endsWith('%')) await page.evaluate((k) => window.__site.scrollFrac(k), Number(s.slice(0, -1)) / 100);
    else if (/^\d+$/.test(s)) await page.evaluate((y) => window.__site.scrollTo(y), Number(s));
    else await page.evaluate((id) => window.__site.scrollTo(id), s);
  }
  if (flags.lamp) { const [x, y] = nums(flags.lamp); await page.evaluate(([a, b]) => window.__site.lamp(a, b), [x, y]); }
  const time = t ?? (flags.t !== undefined ? Number(flags.t) : undefined);
  if (flags.eval) await page.evaluate(String(flags.eval).replaceAll('$t', String(time ?? 0)));
  if (flags.hover) {
    const box = await page.locator(flags.hover).first().boundingBox();
    if (!box) throw new Error(`--hover: nothing matches ${flags.hover}`);
    await page.mouse.move(box.x - 40, box.y + box.height * 0.5);
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.55, { steps: 8 });
  }
  if (time !== undefined && !flags.nofreeze) {
    if (flags.opening) await page.evaluate((v) => window.__site.opening(v), time);
    else await page.evaluate((v) => window.__site.freeze(v), time);
  }
  if (flags.piece && flags.view) { const [az, el, dist] = nums(flags.view); await page.evaluate(([n, a, e, d]) => window.__site.piece(n).view(a, e, d), [flags.piece, az, el, dist]); }
  if (flags.piece && flags.progress !== undefined) await page.evaluate(([n, p]) => window.__site.piece(n).setProgress(p), [flags.piece, Number(flags.progress)]);
  if (flags.piece && flags.making) await page.evaluate(([n, on]) => window.__site.piece(n).setMaking(on), [flags.piece, flags.making === '1']);
  await settle(page);
  if (flags.wait) await page.waitForTimeout(Number(flags.wait));
}

export async function grab(page, flags) {
  return page.screenshot(flags.png ? { type: 'png', fullPage: Boolean(flags.full) } : { type: 'jpeg', quality: 92, fullPage: Boolean(flags.full) });
}

export function save(out, buf) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
}

export function defaultOut(route, flags, kind) {
  const slug = route.replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-') || 'index';
  return `shots/${slug}-${flags.vp ?? 'desktop'}${kind ? `-${kind}` : ''}.${flags.png ? 'png' : 'jpg'}`;
}
