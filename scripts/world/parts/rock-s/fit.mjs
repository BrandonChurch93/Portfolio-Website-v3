// Fits sculpt S's light to picture 9's hue (src/pieces/world/parts/rock/curve.ts), by measurement.
//   1. npm run look -- hollow --q "rock=s&stonedebug=15" --png --out ramp.png     the rock drawn as bands of known grey
//   2. npm run look -- hollow --q "rock=s" --png --out still.png                    the rock as it is
//   3. node scripts/world/parts/rock-s/fit.mjs ramp.png still.png [--rate 1.4] [--dry]
// From the ramp it reads what luma the world's last pass shows for each light (so the stone knows which step of
// luma a light will be), and from the still, for each ring round the core and each step of luma, the light's green
// and blue over its red against the picture's own there (--at: only the first, for a still taken without the curve). It moves each step's tint toward the picture's and writes
// curve.ts again. Two or three rounds of 2 and 3 bring the still onto the picture.
import process from 'node:process';
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { isRock } from './curve.mjs';

const CURVE = new URL('../../../../src/pieces/world/parts/rock/curve.ts', import.meta.url).pathname;
const PIC = new URL('../../../../reference/concept/09-parts/09-the-whole-picture-at-1376.jpg', import.meta.url).pathname;
const CX = 688, CY = 437, R = 90, UNIT = 1.119, STEP = 30;
const [rampFile, stillFile] = process.argv.slice(2).filter((a) => !a.startsWith('--') && !/^\d/.test(a));
const rateAt = process.argv.indexOf('--rate'), RATE = rateAt > 0 ? Number(process.argv[rateAt + 1]) : 1.4;

const src = readFileSync(CURVE, 'utf8');
const now = Function(`return (${src.slice(src.indexOf('{', src.indexOf('export const CURVE')), src.lastIndexOf('}') + 1).replace(/ as readonly.*$/gm, ',')})`)();
const [lo, hi, from, wide, bands] = now.ramp, rings = now.rings, NB = now.at.length - 1;

async function load(f) { const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }
function reader(im, isPic) {
  const sc = isPic ? 1 : im.w / 869;
  return (px, py) => {
    const X = Math.round(isPic ? px : (434.5 + (px - CX) * UNIT) * sc), Y = Math.round(isPic ? py : (200 + (py - CY) * UNIT) * sc);
    const k = (X + Y * im.w) * 3;
    return [im.data[k], im.data[k + 1], im.data[k + 2]];
  };
}
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const each = (fn) => { for (let py = 318; py < 600; py++) for (let px = 330; px < 1050; px++) if (isRock(px, py)) fn(px, py); };

// 1. The ramp: the median luma of each band, read near its middle.
const ramp = reader(await load(rampFile), false), seen = Array.from({ length: bands }, () => []);
each((px, py) => {
  const x = (px - CX) * UNIT, b = (x - from) / wide, i = Math.floor(b);
  if (i < 0 || i >= bands || Math.abs(b - i - 0.5) > 0.25) return;
  const c = ramp(px, py);
  if (Math.max(...c) - Math.min(...c) > 24) return;
  seen[i].push(luma(c));
});
const pairs = [];
seen.forEach((v, i) => { if (v.length < 30) return; v.sort((a, b) => a - b); pairs.push([2 ** (lo + ((hi - lo) * (i + 0.5)) / bands), v[v.length >> 1]]); });
console.log('ramp (light, luma):', pairs.map(([l, y]) => `${l.toPrecision(3)}:${Math.round(y)}`).join(' '));
// Bands that fall off the rock read the skin or the dark: only a luma that grows with the light is kept.
for (let i = 1; i < pairs.length; i++) if (pairs[i][1] <= pairs[i - 1][1] + 0.5) pairs.splice(i--, 1);
const lightAt = (y) => {
  if (y <= 0) return 0;
  for (let i = 1; i < pairs.length; i++) if (pairs[i][1] >= y && pairs[i][1] > pairs[i - 1][1]) {
    const [l0, y0] = pairs[i - 1], [l1, y1] = pairs[i], t = (y - y0) / (y1 - y0);
    return 2 ** (Math.log2(l0) + (Math.log2(l1) - Math.log2(l0)) * t);
  }
  const [l0, y0] = pairs[pairs.length - 2], [l1, y1] = pairs[pairs.length - 1];
  return 2 ** (Math.log2(l1) + ((Math.log2(l1) - Math.log2(l0)) * (y - y1)) / Math.max(y1 - y0, 1));
};
const at = Array.from({ length: NB + 1 }, (_, k) => +lightAt(k * STEP).toPrecision(4));

// 2. Green and blue over red, in each ring and step, of the picture and of the still, shared out as the stone shares
// a light between the steps and rings either side of it.
function cells(get) {
  const g = rings.map(() => Array.from({ length: NB }, () => [0, 0, 0]));
  each((px, py) => {
    const c = get(px, py);
    if (c[0] < 6) return;
    const x = Math.min(NB - 1, Math.max(0, luma(c) / STEP - 0.5)), rho = Math.hypot(px - CX, py - CY) / R;
    let y = 0;
    for (let i = 0; i < rings.length - 1; i++) if (rho >= rings[i]) y = i + Math.min(1, (rho - rings[i]) / (rings[i + 1] - rings[i]));
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    for (const [i, j, w] of [[y0, x0, (1 - fx) * (1 - fy)], [y0, x0 + 1, fx * (1 - fy)], [y0 + 1, x0, (1 - fx) * fy], [y0 + 1, x0 + 1, fx * fy]]) {
      if (i >= rings.length || j >= NB || w <= 0) continue;
      g[i][j][0] += (w * c[1]) / c[0]; g[i][j][1] += (w * c[2]) / c[0]; g[i][j][2] += w;
    }
  });
  return g;
}
const pic = cells(reader(await load(PIC), true)), got = cells(reader(await load(stillFile), false));
const ratio = (v) => (v[2] > 12 ? [v[0] / v[2], v[1] / v[2]] : null);
// Where the picture has too few pixels in a cell, the nearest ring's that has them, then the nearest step's.
const want = pic.map((row, i) => row.map((_, j) => {
  for (let d = 0; d < rings.length; d++) for (const k of [i - d, i + d]) if (pic[k] && ratio(pic[k][j])) return ratio(pic[k][j]);
  return null;
}));
want.forEach((row) => row.forEach((v, j) => { if (!v) { for (let d = 1; d < NB; d++) { const q = row[j - d] ?? row[j + d]; if (q) { row[j] = q; break; } } } }));
const tint = now.tint.map((row, i) => row.map(([g, b], j) => {
  const m = ratio(got[i][j]), w = want[i][j];
  // A cell the still has too few pixels in is left as it is: one of 51 pixels sent its tint to a violet white.
  if (!m || !w || got[i][j][2] < 150) return [g, b];
  // Held to a warm light: a cell with a few dozen pixels once pushed blue over red past 1, a violet white.
  const clamp = (v, most) => Math.min(most, Math.max(0.01, v));
  return [+clamp(g * (w[0] / m[0]) ** RATE, 0.85).toFixed(4), +clamp(b * (w[1] / Math.max(m[1], 0.01)) ** RATE, 0.6).toFixed(4)];
}));
console.log('ring  step  picture g/r b/r   still g/r b/r   tint');
rings.forEach((r, i) => { for (let j = 0; j < NB; j++) { const p = want[i][j], m = ratio(got[i][j]); console.log(`${r}`.padEnd(6), `${j * STEP}`.padEnd(5), (p ? p.map((v) => v.toFixed(2)).join(' ') : ' -').padEnd(17), (m ? m.map((v) => v.toFixed(2)).join(' ') : ' -').padEnd(15), tint[i][j].join(' '), m ? `(${Math.round(got[i][j][2])})` : ''); } });
if (process.argv.includes('--dry')) process.exit(0);
const fmt = (v) => `[${v.join(', ')}]`;
const out = process.argv.includes('--at') ? src.replace(/at: \[[^\]]*\]/, `at: ${fmt(at)}`) : src.replace(/at: \[[^\]]*\]/, `at: ${fmt(at)}`).replace(/tint: \[[\s\S]*?\n  \] as/, `tint: [\n${tint.map((row) => `    [${row.map(fmt).join(', ')}],`).join('\n')}\n  ] as`);
writeFileSync(CURVE, out);
console.log(`curve: ${CURVE}`);
