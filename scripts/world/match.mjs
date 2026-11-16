// The first look of every round: a still of the hero's new world laid over picture 9 at the same size.
//
//   npm run match -- [--q "rock=a"] [--still shots/world/whole.jpg] [--out shots/world/match] [--at x,y,w,h]
//
// It takes a still of the whole world at the page's size (or uses the one given with --still), puts it in the
// picture's own frame by the planet's rims and the spire's tip (PICTURE in src/pieces/world/layout.ts), and writes:
//   <out>-beside.jpg   the picture and the still side by side, the same size
//   <out>-over.jpg     the still laid over the picture, half and half
//   <out>-lines.jpg    the still's own edges drawn in bright lines over the picture: what does not line up shows at once
// --at cuts all three to a part of the picture, in its pixels, and draws that part larger.
// It prints where the plan puts each thing the kit lists, beside where the picture has it. The picture wins.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';
import { browser, parseArgs, save } from '../lib.mjs';
import { L, P } from './lib/plan.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const out = String(flags.out ?? 'shots/world/match'), still = String(flags.still ?? `${out}-still.jpg`);
if (!flags.still) {
  const args = ['scripts/world/look.mjs', 'whole', '--scale', '1', '--out', still];
  if (flags.q) args.push('--q', String(flags.q));
  if (flags.t) args.push('--t', String(flags.t));
  // The look script ends in failure when the page logged an error. The still is taken all the same: say what it
  // said and go on.
  let said = '';
  try { said = execFileSync('node', args, { encoding: 'utf8' }); } catch (e) { said = String(e.stdout ?? e); }
  const errors = said.split('\n').filter((l) => /ERROR|console:|page:|^\d{3}:/.test(l));
  if (errors.length) console.log(errors.join('\n'));
}

const tip = L.drawn(0, L.SPIRE.tall, 0)[1], u = L.PICTURE.unit;
const cut = flags.at ? String(flags.at).split(',').map(Number) : [0, 0, L.PICTURE.wide, L.PICTURE.tall], by = Math.min(3, 1700 / cut[2]);
const data = (f) => `data:image/${/\.png$/i.test(f) ? 'png' : 'jpeg'};base64,${fs.readFileSync(f).toString('base64')}`;
const b = await browser(flags);
try {
  const page = await (await b.newContext({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 })).newPage();
  await page.setContent('<body style="margin:0;background:#070403"></body>');
  const made = await page.evaluate(async ({ pic, shot, cut, by, place }) => {
    const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
    const [a, s] = [await load(pic), await load(shot)], w = Math.round(cut[2] * by), h = Math.round(cut[3] * by);
    const canvas = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.fillStyle = '#070403'; g.fillRect(0, 0, w, h); return [c, g]; };
    const picture = (g) => g.drawImage(a, cut[0], cut[1], cut[2], cut[3], 0, 0, w, h);
    // The still is 1460 units wide: one of its pixels is so many of the picture's.
    const k = (place.wide / s.naturalWidth) / place.unit;
    const built = (g) => g.drawImage(s, (place.x0 - cut[0]) * by, (place.y0 - cut[1]) * by, s.naturalWidth * k * by, s.naturalHeight * k * by);
    const [pc, pg] = canvas(); picture(pg);
    const [sc, sg] = canvas(); built(sg);
    const [oc, og] = canvas(); picture(og); og.globalAlpha = 0.5; built(og);
    const [lc, lg] = canvas(); picture(lg);
    const src = sg.getImageData(0, 0, w, h).data, lum = new Float32Array(w * h), edge = lg.getImageData(0, 0, w, h);
    for (let i = 0; i < w * h; i++) lum[i] = 0.3 * src[i * 4] + 0.6 * src[i * 4 + 1] + 0.1 * src[i * 4 + 2];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = x + y * w, gx = lum[i + 1] - lum[i - 1] + 0.5 * (lum[i + 1 - w] - lum[i - 1 - w] + lum[i + 1 + w] - lum[i - 1 + w]), gy = lum[i + w] - lum[i - w] + 0.5 * (lum[i + w - 1] - lum[i - w - 1] + lum[i + w + 1] - lum[i - w + 1]);
      const m = Math.hypot(gx, gy);
      if (m > 26) { const t = Math.min(1, (m - 26) / 50), d = edge.data; d[i * 4] = d[i * 4] * (1 - t) + 60 * t; d[i * 4 + 1] = d[i * 4 + 1] * (1 - t) + 255 * t; d[i * 4 + 2] = d[i * 4 + 2] * (1 - t) + 255 * t; }
    }
    lg.putImageData(edge, 0, 0);
    const [bc, bg] = canvas();
    const both = document.createElement('canvas');
    both.width = 2 * w + 12; both.height = h;
    const g2 = both.getContext('2d');
    g2.fillStyle = '#070403'; g2.fillRect(0, 0, both.width, h);
    g2.drawImage(pc, 0, 0); g2.drawImage(sc, w + 12, 0);
    void bc; void bg;
    return [both, oc, lc].map((c) => c.toDataURL('image/jpeg', 0.92));
  }, { pic: data(L.PICTURE.file), shot: data(still), cut, by, place: { wide: L.HOST.wide, unit: u, x0: L.PICTURE.mid - L.HOST.wide / 2 / u, y0: L.PICTURE.tip - tip / u } });
  ['beside', 'over', 'lines'].forEach((name, i) => { save(`${out}-${name}.jpg`, Buffer.from(made[i].split(',')[1], 'base64')); console.log(`match: ${out}-${name}.jpg`); });
} finally { await b.close(); }

// Where the plan puts each thing the kit lists, and where the picture has it.
const at = (x, y, z) => L.pictured(x, y, z).map((v) => Math.round(v));
const line = (name, got, want) => console.log(`${name.padEnd(26)} ${String(got).padEnd(12)} picture ${want}`);
const g = L.ground(L.PYRAMID.x, L.PYRAMID.z), c = Math.cos(L.PYRAMID.turn * L.D2R), s = Math.sin(L.PYRAMID.turn * L.D2R), h = L.PYRAMID.base / 2;
const corners = [[-h, -h], [h, -h], [h, h], [-h, h]].map(([a, d]) => at(L.PYRAMID.x + a * c + d * s, g, L.PYRAMID.z - a * s + d * c));
console.log('\nWhere the plan puts things in the picture (across, down), and where the picture has them:');
line('planet rims', `${at(-L.WORLD.half, -L.RIM, 0)[0]} .. ${at(L.WORLD.half, -L.RIM, 0)[0]}`, '95 .. 1280');
line('lip, top, at the middle', at(0, L.dome(0, L.lip(0)) - 3, L.lip(0)), '688, 268');
line('core', `${at(...L.CORE.at)} r ${Math.round(L.CORE.r / u)}`, '688, 437 r 90');
line('spire tip', at(0, L.SPIRE.tall, 0), '685, 20');
line('pyramid apex', at(L.PYRAMID.x, g + L.PYRAMID.tall, L.PYRAMID.z), '362, 185');
line('pyramid base', `${Math.min(...corners.map((p) => p[0]))} .. ${Math.max(...corners.map((p) => p[0]))}, ${Math.max(...corners.map((p) => p[1]))} down`, '255 .. 475, about 300 down');
for (const [i, name, want] of [[0, 'gold pointed tower', '475, 70'], [P.STEP, 'stepped gold crown', '762, 100'], [2, 'sun disc', '902, 95'], [3, 'gold cap', '968, 108'], [4, 'tower', '1048, 135']]) { const t = P.TOWERS[i]; line(name, at(t[0], L.ground(t[0], t[1]) + t[4], t[1]), want); }
console.log('By eye, from the overlay: the hollow 330 to 1050 across, its roof\'s underside about 335 down, its floor\'s top about 550 and underside 575 to 600, the lowest rock about 700 down at 330 across, the right side to a point near 1040, 690.');
