// The color of picture 9's rock at each brightness, and of stills of sculpt S beside it: the rock of the hollow only
// (the ball, the lines of light, the land above the roof and the skin each side masked out), cut into steps of luma,
// with the mean color of each step, its share of the rock, its hue and green and blue over red. Writes the curves as
// strips one over another (the picture at the top), each step as wide as its share, and a second row of even steps.
//
//   node scripts/world/parts/rock-s/curve.mjs [<hollow PNG> ...] [--out strips.png] [--json curve.json]
import sharp from 'sharp';
import process from 'node:process';
import { writeFileSync } from 'node:fs';

const PIC = new URL('../../../../reference/concept/09-parts/09-the-whole-picture-at-1376.jpg', import.meta.url).pathname;
const CX = 688, CY = 437, R = 90;
// Steps of luma, and the columns of the small streams and the page's stream in the picture's pixels.
export const STEPS = 16, TOP = 240;
const LINES = [385, 500, 620, 688, 748, 812, 1010];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const files = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !(all[i - 1] ?? '').startsWith('--'));

async function load(f) { const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }
function reader(im, isPic) {
  const sc = isPic ? 1 : im.w / 869;
  return (px, py) => {
    const X = Math.round(isPic ? px : (434.5 + (px - CX) * 1.119) * sc), Y = Math.round(isPic ? py : (200 + (py - CY) * 1.119) * sc);
    if (X < 0 || Y < 0 || X >= im.w || Y >= im.h) return null;
    const k = (X + Y * im.w) * 3;
    return [im.data[k], im.data[k + 1], im.data[k + 2]];
  };
}
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const hue = (c) => { const mx = Math.max(...c), mn = Math.min(...c), d = mx - mn; if (!d) return 0; let h = mx === c[0] ? ((c[1] - c[2]) / d) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; return (h * 60 + 360) % 360; };
// The rock of the hollow: inside 330 to 1050 across and the roof's underside to the floor's underside, outside the
// ball, off the lines of light.
export function isRock(px, py) {
  if (px < 330 || px >= 1050 || py < 318 || py >= 600) return false;
  if (Math.hypot(px - CX, py - CY) < R * 1.1) return false;
  for (const x of LINES) if (Math.abs(px - x) < (x === 688 ? 14 : 6) && py > 500) return false;
  return true;
}
export function curve(get) {
  const s = Array.from({ length: STEPS }, () => [0, 0, 0, 0]), hues = Array.from({ length: STEPS }, () => new Array(36).fill(0));
  let n = 0;
  for (let py = 318; py < 600; py++) for (let px = 330; px < 1050; px++) {
    if (!isRock(px, py)) continue;
    const c = get(px, py);
    if (!c) continue;
    const k = Math.min(STEPS - 1, Math.floor((luma(c) / TOP) * STEPS));
    s[k][0] += c[0]; s[k][1] += c[1]; s[k][2] += c[2]; s[k][3]++; n++;
    if (luma(c) > 8) hues[k][Math.floor(hue(c) / 10)]++;
  }
  return s.map((v, k) => ({ n: v[3] / n, c: v[3] ? v.slice(0, 3).map((q) => q / v[3]) : null, hue: hues[k] }));
}

if (process.argv[1] && process.argv[1].endsWith('curve.mjs')) {
  const sets = [['picture 9', curve(reader(await load(PIC), true))]];
  for (const f of files) sets.push([f.split('/').pop(), curve(reader(await load(f), false))]);
  const row = (k, [, c]) => { const v = c[k]; if (!v.c) return '   -'.padEnd(34); const [r, g, b] = v.c; return `${String(Math.round(v.n * 1000) / 10).padStart(4)}% (${v.c.map(Math.round).join(',')}) ${(g / r).toFixed(2)} ${(b / r).toFixed(2)}`.padEnd(34); };
  console.log('step (luma)'.padEnd(12), sets.map(([n]) => n.slice(0, 32).padEnd(34)).join(''));
  for (let k = 0; k < STEPS; k++) console.log(`${Math.round((k * TOP) / STEPS)}-${Math.round(((k + 1) * TOP) / STEPS)}`.padEnd(12), sets.map((s) => row(k, s)).join(''));
  // Hue in 10 degree bins over every lit pixel (luma over 30), as the reviewers counted it.
  console.log('');
  for (const [name, c] of sets) {
    const h = new Array(36).fill(0);
    c.forEach((v, k) => { if ((k + 0.5) * TOP / STEPS > 30) v.hue.forEach((q, i) => (h[i] += q)); });
    const t = h.reduce((a, b) => a + b, 0) || 1;
    console.log(name.slice(0, 32).padEnd(34), [0, 1, 2, 3, 4].map((i) => `${i * 10}-${i * 10 + 10}: ${Math.round((1000 * h[i]) / t) / 10}%`).join('  '));
  }
  const out = arg('--out', null);
  if (out) {
    const W = 960, H = 40, img = Buffer.alloc(W * H * 2 * sets.length * 3);
    sets.forEach(([, c], si) => {
      let x0 = 0;
      for (let k = 0; k < STEPS; k++) {
        const w = Math.round(c[k].n * W), col = c[k].c ?? [0, 0, 0];
        for (let x = x0; x < Math.min(W, x0 + w); x++) for (let y = 0; y < H - 2; y++) img.set(col.map(Math.round), ((x + (si * 2 * H + y) * W) * 3));
        x0 += w;
        for (let x = Math.round((k * W) / STEPS); x < Math.round(((k + 1) * W) / STEPS) - 2; x++) for (let y = 0; y < H - 4; y++) img.set(col.map(Math.round), ((x + ((si * 2 + 1) * H + y) * W) * 3));
      }
    });
    await sharp(img, { raw: { width: W, height: H * 2 * sets.length, channels: 3 } }).png().toFile(out);
    console.log(`strips: ${out}`);
  }
  const js = arg('--json', null);
  if (js) writeFileSync(js, JSON.stringify(sets.map(([n, c]) => ({ name: n, steps: c.map((v) => ({ n: v.n, c: v.c })) })), null, 1));
}
