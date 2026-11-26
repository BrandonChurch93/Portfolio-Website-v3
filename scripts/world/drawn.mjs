// The world as picture 10 has it (?look=d), made ready for the page (src/pieces/world/parts/rock/drawn.ts):
//   node scripts/world/drawn.mjs [--out public/world] [--view shots/slice/d-maps.jpg]
//
// It reads reference/concept/10-parts/ (README.md there says how each was made): sheet.png, the torn planet and its
// dunes cut out of the picture on a clear ground, and depth.png, how near each place of it looks. It lays them into
// the host's frame (DRAWN in the layout) and writes four pictures, named in DRAWN.files:
//   tone    the picture's own color, as the screen is to show it at rest, carried out past its edges
//   form    which way each place is turned, across and down the view, and how high it stands (the stored height)
//   light   how much of a place's light is the core's, where a bright thin thing is (a lit crack, a lit rim), and
//           where the sand is
//   cut     how far toward the visitor a place is, in a byte over DRAWN.depth, how much of the pixel is covered, how
//           much of the sand is kept where it thins out over the city's ground, and nothing
// The page reads cut by its own reader, as numbers. The other three have no alpha and are read as pictures.
//
// The depth the page sorts by is not the depth the picture looks to have, which is good for light and no more. It is
// worked out here: the planet's outer shape a little inside the land's edge, so the land's own edge always wins, a
// bowl behind the core where the rock is hollow, and for the sand the planet's rim, in front of all that stands on
// the land.
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { L } from './lib/plan.mjs';
import { png } from './lib/png.mjs';
import { EYE, through, toward } from './slice/view.mjs';

const arg = (name, usual) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? usual : process.argv[i + 1]; };
const FROM = 'reference/concept/10-parts', OUT = arg('out', 'public/world'), VIEW = arg('view', '');

// How the picture is laid on the page. sheet.png is picture 10 drawn again `grow` times as large, less `crop` of
// those pixels at its left and top. One scale about the core puts it in the host: the picture's ball, with its
// middle at `core` in the picture's own pixels, lands on the page's core, and each of its pixels is `scale` units.
const FIT = { grow: 2752 / 1104, crop: [249, 668], scale: 0.907, core: [834.5, 544.4] };
// Near where the sand begins the picture's lip stood a little under the land's: it is lifted there, by so many
// units at places across the host, less and less over `fades` units below the lip, which there lies at from[1] down
// at from[0] across and `slope` further down for each unit across.
const LIFT = { from: [940, 379.6], slope: 0.18, fades: 150, by: [[940, 0], [960, -0.3], [980, -1.1], [1000, -2.6], [1020, -4.6], [1030, -5.8], [1040, -5.8], [1060, -4.7], [1080, -2.4], [1100, -0.5], [1120, 0]] };
// The sand's front edge, read off the joined picture (sheet.png's pixels with `crop` added): above it is sand. How
// soft that edge is, in those pixels. Where the sand thins in over the land is DRAWN.sand, in the layout, and up to
// there the edge is drawn a little high, so that the rock under it tucks behind the land's own edge.
const SAND = { edge: [[2740, 894], [2800, 904], [2900, 922], [3000, 950], [3100, 985], [3200, 1003], [3300, 1011], [3400, 1012], [3500, 1003], [3600, 985], [3700, 955], [3800, 915], [3850, 890], [3905, 848], [3940, 800]], soft: 8 };
// The sorting depth. The planet's outer shape is drawn in by `inside` units, and the sand stands `outside` units out
// from it. The bowl is `deep` toward the visitor behind the core's middle and rises by `rise` at `reach` units from
// it, down the picture, and `wide` times as far across.
const SORT = { inside: 20, outside: 8, bowl: { deep: -60, rise: 600, reach: 330, wide: 1.6 } };
// The light's maps. A place's light is the core's within `near` units of the core, as drawn, and not at all past
// `far`, `wide` times as far across, and by how strong its color is, taken over `over` pixels: the core's light is
// the deepest orange in the picture, and the moon's on the cratered side is paler. A bright thin thing stands out from what is
// round it over `round` pixels by more than `over`, is brighter than `bright` and stronger in color than `strong`.
const CORE_LIGHT = { near: 260, far: 580, wide: 1.5, strong: [0.68, 0.86], over: 6 };
const THIN = { round: 16.6, over: [0.06, 0.22], bright: [0.35, 0.6], strong: [0.3, 0.55], soft: 2.8 };
// The stored turn of each place: the height is smoothed over `calm` pixels, and the picture's own fine light and
// dark, taken over `fine` pixels, counts as so many units of height (`grain`).
const TURN = { calm: 3.8, first: 1, fine: 8.3, grain: 8.53 };
const QUALITY = { tone: 92, form: 82, light: 88 };

const ss = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
const along = (table, x) => {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) if (x <= table[i][0]) { const [x0, y0] = table[i - 1], [x1, y1] = table[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
  return table[table.length - 1][1];
};

function blur(src, W, H, sigma) {
  const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const mid = new Float32Array(W * H), out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let a = 0;
    for (let i = -r; i <= r; i++) a += k[i + r] * src[y * W + Math.min(W - 1, Math.max(0, x + i))];
    mid[y * W + x] = a;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let a = 0;
    for (let i = -r; i <= r; i++) a += k[i + r] * mid[Math.min(H - 1, Math.max(0, y + i)) * W + x];
    out[y * W + x] = a;
  }
  return out;
}

// A color carried out past where it is known, level by level: each level half the size of the last, a place with
// nothing known taking what the coarser level has.
function carry(col, known, W, H) {
  if (W <= 1 && H <= 1) return;
  const w = Math.ceil(W / 2), h = Math.ceil(H / 2), c = new Float32Array(w * h * 3), k = new Float32Array(w * h);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, j = (y >> 1) * w + (x >> 1), a = known[i];
    c[j * 3] += col[i * 3] * a; c[j * 3 + 1] += col[i * 3 + 1] * a; c[j * 3 + 2] += col[i * 3 + 2] * a;
    k[j] += a;
  }
  for (let j = 0; j < w * h; j++) if (k[j] > 0) { c[j * 3] /= k[j]; c[j * 3 + 1] /= k[j]; c[j * 3 + 2] /= k[j]; k[j] = Math.min(1, k[j]); }
  carry(c, k, w, h);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, a = known[i];
    if (a >= 1) continue;
    const fx = Math.min(w - 1, Math.max(0, (x - 0.5) / 2)), fy = Math.min(h - 1, Math.max(0, (y - 0.5) / 2)), x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
    for (let n = 0; n < 3; n++) {
      const v = (c[(y0 * w + x0) * 3 + n] * (1 - tx) + c[(y0 * w + x1) * 3 + n] * tx) * (1 - ty) + (c[(y1 * w + x0) * 3 + n] * (1 - tx) + c[(y1 * w + x1) * 3 + n] * tx) * ty;
      col[i * 3 + n] = col[i * 3 + n] * a + v * (1 - a);
    }
  }
}

// Where the planet's outer shape, drawn in or out by `by` units, is first met along a ray: how far toward the
// visitor. A ray that misses it takes the place where it passes nearest.
const RIM_Y = -L.RIM, ray = [0, 0, 0];
function shape(hx, hy, by) {
  through(hx, hy, ray);
  const a = L.WORLD.half + by, b = L.WORLD.deep + by, [ox, oy, oz] = EYE, [dx, dy, dz] = ray;
  const A = dx * dx + dz * dz, B = ox * dx + oz * dz, C = ox * ox + oz * oz - a * a, D = B * B - A * C;
  if (D > 0) { const t = (-B - Math.sqrt(D)) / A, y = oy + dy * t; if (y >= RIM_Y) return toward(ox + dx * t, y, oz + dz * t); }
  const s = a / b, py = (oy - RIM_Y) * s, qy = dy * s, A2 = dx * dx + qy * qy + dz * dz, B2 = ox * dx + py * qy + oz * dz, C2 = ox * ox + py * py + oz * oz - a * a, D2 = B2 * B2 - A2 * C2;
  const t = D2 > 0 ? (-B2 - Math.sqrt(D2)) / A2 : -B2 / A2;
  return toward(ox + dx * t, oy + dy * t, oz + dz * t);
}

const t0 = performance.now();
const sheet = await sharp(`${FROM}/sheet.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const far = await sharp(`${FROM}/depth.png`).toColourspace('grey16').raw({ depth: 'ushort' }).toBuffer({ resolveWithObject: true });
const SW = sheet.info.width, SH = sheet.info.height, S = sheet.data, DW = far.info.width, DH = far.info.height;
const Dp = new Uint16Array(far.data.buffer, far.data.byteOffset, DW * DH);
if (far.info.channels !== 1) throw new Error(`drawn: depth.png has ${far.info.channels} channels, and one is wanted`);

const P = L.DRAWN, [, coreY] = L.drawn(...L.CORE.at), coreX = L.HOST.wide / 2;
const W = Math.round(P.window[2] * P.ppu), H = Math.round(P.window[3] * P.ppu), N = W * H;
const left = coreX + P.window[0], top = coreY + P.window[1];

// Where a place of the host is in sheet.png, in its pixels.
function source(X, Y, out) {
  const lipY = LIFT.from[1] + LIFT.slope * (X - LIFT.from[0]), lift = along(LIFT.by, X);
  let v = Y;
  if (lift !== 0) for (let k = 0; k < 3; k++) v = Y - lift * (1 - ss(0, LIFT.fades, v - lipY));
  out[0] = (FIT.core[0] + (X - coreX) / FIT.scale) * FIT.grow - FIT.crop[0];
  out[1] = (FIT.core[1] + (v - coreY) / FIT.scale) * FIT.grow - FIT.crop[1];
  return out;
}

const col = new Float32Array(N * 3), cover = new Float32Array(N), high = new Float32Array(N), sand = new Float32Array(N);
const at = [0, 0], SUB = [-0.25, 0.25];
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const n = j * W + i;
  let r = 0, g = 0, b = 0, a = 0;
  for (const oy of SUB) for (const ox of SUB) {
    source(left + (i + 0.5 + ox) / P.ppu, top + (j + 0.5 + oy) / P.ppu, at);
    const fx = at[0] - 0.5, fy = at[1] - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    for (let k = 0; k < 4; k++) {
      const x = x0 + (k & 1), y = y0 + (k >> 1);
      if (x < 0 || y < 0 || x >= SW || y >= SH) continue;
      const w = ((k & 1) ? tx : 1 - tx) * ((k >> 1) ? ty : 1 - ty), p = (y * SW + x) * 4, al = (S[p + 3] / 255) * w;
      r += S[p] * al; g += S[p + 1] * al; b += S[p + 2] * al; a += al;
    }
  }
  if (a > 0) { col[n * 3] = r / a / 255; col[n * 3 + 1] = g / a / 255; col[n * 3 + 2] = b / a / 255; }
  cover[n] = a / 4;
  source(left + (i + 0.5) / P.ppu, top + (j + 0.5) / P.ppu, at);
  const fx = Math.min(DW - 1, Math.max(0, (at[0] * DW) / SW - 0.5)), fy = Math.min(DH - 1, Math.max(0, (at[1] * DH) / SH - 0.5)), x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(DW - 1, x0 + 1), y1 = Math.min(DH - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
  high[n] = ((Dp[y0 * DW + x0] * (1 - tx) + Dp[y0 * DW + x1] * tx) * (1 - ty) + (Dp[y1 * DW + x0] * (1 - tx) + Dp[y1 * DW + x1] * tx) * ty) / 65535;
  const ax = at[0] + FIT.crop[0], ay = at[1] + FIT.crop[1];
  sand[n] = ax < SAND.edge[0][0] - 60 ? 0 : ss(-SAND.soft, SAND.soft, along(SAND.edge, ax) - ay);
}
console.log(`drawn: laid into ${W} x ${H} · ${((performance.now() - t0) / 1000).toFixed(1)} s`);

const known = new Float32Array(N);
for (let n = 0; n < N; n++) known[n] = ss(0.1, 0.6, cover[n]);
carry(col, known, W, H);

const lum = new Float32Array(N), val = new Float32Array(N), strong = new Float32Array(N);
for (let n = 0; n < N; n++) {
  const r = col[n * 3], g = col[n * 3 + 1], b = col[n * 3 + 2], hi = Math.max(r, g, b), lo = Math.min(r, g, b);
  lum[n] = 0.299 * r + 0.587 * g + 0.114 * b;
  val[n] = hi;
  strong[n] = hi > 1e-4 ? (hi - lo) / hi : 0;
}

// Which way each place is turned.
const calm = blur(high, W, H, TURN.calm), first = blur(lum, W, H, TURN.first), wide = blur(first, W, H, TURN.fine);
const stands = new Float32Array(N);
for (let n = 0; n < N; n++) stands[n] = calm[n] * P.relief + (first[n] - wide[n]) * TURN.grain;
const form = Buffer.alloc(N * 3);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const n = j * W + i, gx = ((stands[j * W + Math.min(W - 1, i + 1)] - stands[j * W + Math.max(0, i - 1)]) * P.ppu) / 2, gy = ((stands[Math.min(H - 1, j + 1) * W + i] - stands[Math.max(0, j - 1) * W + i]) * P.ppu) / 2, l = Math.hypot(gx, gy, 1);
  form[n * 3] = Math.round(127.5 - (127.5 * gx) / l);
  form[n * 3 + 1] = Math.round(127.5 - (127.5 * gy) / l);
  form[n * 3 + 2] = Math.round(255 * Math.min(1, Math.max(0, calm[n])));
}

// The light's maps.
const round = blur(val, W, H, THIN.round), deep = blur(strong, W, H, CORE_LIGHT.over), thin = new Float32Array(N), cores = new Float32Array(N);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const n = j * W + i, X = left + (i + 0.5) / P.ppu, Y = top + (j + 0.5) / P.ppu, d = Math.hypot((X - coreX) / CORE_LIGHT.wide, Y - coreY);
  const away = ss(L.CORE.r + 2, L.CORE.r + 22, Math.hypot(X - coreX, Y - coreY));
  thin[n] = ss(THIN.over[0], THIN.over[1], val[n] - round[n]) * ss(THIN.bright[0], THIN.bright[1], val[n]) * ss(THIN.strong[0], THIN.strong[1], strong[n]) * away * (1 - sand[n]);
  cores[n] = (1 - ss(CORE_LIGHT.near, CORE_LIGHT.far, d)) * ss(CORE_LIGHT.strong[0], CORE_LIGHT.strong[1], deep[n]) * (1 - sand[n]);
}
const thins = blur(thin, W, H, THIN.soft), coreSoft = blur(cores, W, H, 1.5);
const light = Buffer.alloc(N * 3), tone = Buffer.alloc(N * 3), cut = new Uint8Array(N * 4);
const byte = (v) => Math.round(255 * Math.min(1, Math.max(0, v)));
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const n = j * W + i, X = left + (i + 0.5) / P.ppu, Y = top + (j + 0.5) / P.ppu;
  light[n * 3] = byte(coreSoft[n]); light[n * 3 + 1] = byte(thins[n] * 1.6); light[n * 3 + 2] = byte(sand[n]);
  tone[n * 3] = byte(col[n * 3]); tone[n * 3 + 1] = byte(col[n * 3 + 1]); tone[n * 3 + 2] = byte(col[n * 3 + 2]);
  const dx = (X - coreX) / SORT.bowl.wide, dy = Y - coreY, bowl = SORT.bowl.deep + ((dx * dx + dy * dy) / (SORT.bowl.reach * SORT.bowl.reach)) * SORT.bowl.rise;
  const isSand = sand[n] > 0.5, z = isSand ? shape(X, Y, SORT.outside) : Math.min(shape(X, Y, -SORT.inside), bowl);
  const keep = 1 - sand[n] * (1 - ss(coreX + P.sand[0], coreX + P.sand[1], X));
  cut[n * 4] = byte((z - P.depth[0]) / (P.depth[1] - P.depth[0]));
  cut[n * 4 + 1] = byte(keep < 1 ? Math.max(cover[n], sand[n] * ss(0.02, 0.1, cover[n])) : cover[n]);
  cut[n * 4 + 2] = byte(keep);
  cut[n * 4 + 3] = 255;
}

mkdirSync(OUT, { recursive: true });
const wrote = async (name, made) => { const file = `${OUT}/${name}`; await made.toFile(file); console.log(`drawn: ${file} · ${W} x ${H} · ${(statSync(file).size / 1024).toFixed(0)} KB`); };
const raw = { raw: { width: W, height: H, channels: 3 } };
await wrote(P.files.tone, sharp(tone, raw).webp({ quality: QUALITY.tone, effort: 6, smartSubsample: true }));
await wrote(P.files.form, sharp(form, raw).avif({ quality: QUALITY.form, chromaSubsampling: '4:4:4', effort: 4 }));
await wrote(P.files.light, sharp(light, raw).webp({ quality: QUALITY.light, effort: 6, smartSubsample: true }));
png(`${OUT}/${P.files.cut}`, W, H, cut, 4);

if (VIEW) {
  const w = 1380, h = Math.round((w * H) / W), small = (buf, ch) => sharp(buf, { raw: { width: W, height: H, channels: ch } }).removeAlpha().resize(w, h).raw().toBuffer();
  const parts = await Promise.all([small(tone, 3), small(form, 3), small(light, 3), small(Buffer.from(cut.buffer), 4)]);
  await sharp({ create: { width: w * 2, height: h * 2, channels: 3, background: '#000' } })
    .composite(parts.map((input, k) => ({ input, raw: { width: w, height: h, channels: 3 }, left: (k & 1) * w, top: (k >> 1) * h })))
    .jpeg({ quality: 86 }).toFile(VIEW);
  console.log(`drawn: ${VIEW} · tone, form, light, cut`);
}
console.log(`drawn: done · ${((performance.now() - t0) / 1000).toFixed(1)} s`);
