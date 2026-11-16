// Sculpt R reads picture 9: which of its pixels are the torn rock, and what each of them looks like with what
// stands in front of the rock painted out.
//
//   import { see } from './see.mjs'
//   const s = await see()   // { W, H, rgb (linear, Float32Array 3 per pixel), kind (Uint8Array), top (Float32Array) }
//
// kind: 0 not the rock (the land, the skin, the air round the planet), 1 rock as the picture shows it, 2 rock the
// picture hides (behind the core, a stream or its glow), 3 open air inside the torn part. rgb holds the picture in
// linear light, with every kind 2 pixel filled from the rock round it. top is where the land's edge is drawn down
// each column, from the plan (the land's front edge, or its rim where the land reaches it).
//   node scripts/world/parts/rock-r/see.mjs   writes previews to shots/world/rock-r/
import sharp from 'sharp';
import { L } from '../../lib/plan.mjs';
import { TORN, FLOOR, LOWEST, KEEP, BOULDERS, STREAMS, CORE } from './trace.mjs';

export const PICTURE = new URL('../../../../reference/concept/09-parts/09-the-whole-picture-at-1376.jpg', import.meta.url).pathname;
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const toSRGB = (v) => { const c = Math.max(0, Math.min(1, v)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
export const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// Where a line of places down the picture is across at a height.
function acrossAt(line, y) {
  if (y <= line[0][1]) return line[0][0];
  for (let i = 1; i < line.length; i++) if (y <= line[i][1]) { const [x0, y0] = line[i - 1], [x1, y1] = line[i]; return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0); }
  return line[line.length - 1][0];
}
// The land's front edge drawn down a column of the picture: the plan's lip, or the rim where the land reaches it.
export function landEdge() {
  const rimZ = (x) => Math.sqrt(Math.max(0, L.WORLD.half ** 2 - x * x)), pts = [];
  for (let x = -L.WORLD.half; x <= L.WORLD.half; x += 0.5) { const z = Math.min(L.lip(x), rimZ(x)); pts.push(L.pictured(x, L.dome(x, z), z)); }
  return (px) => {
    for (let i = 1; i < pts.length; i++) if (pts[i][0] >= px) { const [a, b] = [pts[i - 1], pts[i]], t = (px - a[0]) / (b[0] - a[0] || 1); return a[1] + t * (b[1] - a[1]); }
    return pts[pts.length - 1][1];
  };
}

function lowest(x) {
  if (x <= LOWEST[0][0]) return LOWEST[0][1];
  for (let i = 1; i < LOWEST.length; i++) if (x <= LOWEST[i][0]) { const [x0, y0] = LOWEST[i - 1], [x1, y1] = LOWEST[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
  return LOWEST[LOWEST.length - 1][1];
}

export async function see() {
  const { data, info } = await sharp(PICTURE).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H, ch = info.channels;
  const srgb = new Uint8Array(n * 3), rgb = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { srgb[i * 3 + c] = data[i * ch + c]; rgb[i * 3 + c] = toLinear(data[i * ch + c] / 255); }
  const edge = landEdge(), top = new Float32Array(W);
  for (let x = 0; x < W; x++) top[x] = edge(x + 0.5);

  // The torn part: under the land's edge, between the torn edges, above FLOOR.
  const kind = new Uint8Array(n), torn = new Uint8Array(n);
  for (let y = 0; y < H; y++) {
    const l = acrossAt(TORN.left, y), r = acrossAt(TORN.right, y);
    for (let x = 0; x < W; x++) if (x + 0.5 > l && x + 0.5 < r && y + 0.5 > top[x] && y < FLOOR && y + 0.5 < lowest(x + 0.5)) torn[x + y * W] = 1;
  }

  // The streams: along each, the brightest column near where it was, and the width over which it is brighter than
  // what is round it.
  const hide = new Uint8Array(n), Y = (x, y) => { const i = (x + y * W) * 3; return 0.3 * srgb[i] + 0.6 * srgb[i + 1] + 0.1 * srgb[i + 2]; };
  for (const s of STREAMS) {
    let cx = s.x;
    for (let y = s.from; y < Math.min(H, s.to); y++) {
      let best = cx, bv = -1;
      for (let x = Math.round(cx) - 4; x <= Math.round(cx) + 4; x++) { const v = Y(x, y); if (v > bv) { bv = v; best = x; } }
      const bg = Math.min(Y(best - 14, y), Y(best + 14, y));
      if (bv - bg < 18 && !s.main) continue;
      cx = 0.7 * cx + 0.3 * best;
      let a = best, b = best;
      const half = bg + 0.35 * (bv - bg);
      while (a > best - 20 && Y(a - 1, y) > half) a--;
      while (b < best + 20 && Y(b + 1, y) > half) b++;
      const pad = 2;
      for (let x = a - pad; x <= b + pad; x++) hide[x + y * W] = 1;
    }
    for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) if (dx * dx + dy * dy <= 25) hide[Math.round(s.x) + dx + (s.from + dy) * W] = 1;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + 0.5 - CORE.at[0]) ** 2 + (y + 0.5 - CORE.at[1]) ** 2 < CORE.r ** 2) hide[x + y * W] = 1;
  const boulder = new Uint8Array(n);
  for (let y = 560; y < 720; y++) for (let x = 340; x < 1000; x++) if (BOULDERS.some((b) => inside(b, x + 0.5, y + 0.5))) boulder[x + y * W] = 1;

  // Open air: the smooth dark brown of the night under the planet, found from the foot of the torn part and
  // followed through itself, the streams and the boulders. Rock in shadow is near black and not brown.
  const keep = new Uint8Array(n);
  for (let y = 560; y < FLOOR; y++) for (let x = 230; x < 1070; x++) if (KEEP.some((k) => inside(k, x + 0.5, y + 0.5))) keep[x + y * W] = 1;
  const airy = (i) => {
    if (keep[i]) return false;
    if (boulder[i]) return true;
    if (hide[i]) return false;
    const r = srgb[i * 3], g = srgb[i * 3 + 1], b = srgb[i * 3 + 2];
    if (r < 10 || r > 90) return false;
    const gr = g / r, br = b / r;
    if (gr < 0.4 || gr > (r < 24 ? 0.8 : 0.7) || br > 0.42) return false;
    const x = i % W, y = (i / W) | 0;
    let most = 0;
    for (const j of [i - 1, i + 1, i - W, i + W, i - 2, i + 2, i - 2 * W, i + 2 * W]) if (!hide[j]) most = Math.max(most, Math.abs(srgb[j * 3] - r));
    return most < 6 + r * 0.12 && y > 470 && x > 0;
  };
  const air = new Uint8Array(n), stack = [];
  for (let x = 300; x < 1030; x++) for (let y = FLOOR - 1; y > FLOOR - 40; y--) { const i = x + y * W; if (torn[i]) { if (airy(i)) { air[i] = 1; stack.push(i); } break; } }
  while (stack.length) {
    const i = stack.pop();
    for (const j of [i - 1, i + 1, i - W, i + W]) if (!air[j] && torn[j] && airy(j)) { air[j] = 1; stack.push(j); }
  }
  // A stream's own pixels are air where the air is on both sides of it.
  for (let y = 470; y < FLOOR; y++) for (let x = 0; x < W; x++) {
    const i = x + y * W;
    if (!hide[i] || !torn[i] || air[i]) continue;
    let a = x, b = x;
    while (a > 0 && hide[a + y * W] && x - a < 30) a--;
    while (b < W - 1 && hide[b + y * W] && b - x < 30) b++;
    const nearCore = (x - CORE.at[0]) ** 2 + (y - CORE.at[1]) ** 2 < (CORE.r + 2) ** 2;
    const airNear = (from, step) => { for (let k = 0; k < 26; k++) if (air[from + k * step + y * W]) return true; return false; };
    if (!nearCore && airNear(a, -1) && airNear(b, 1)) air[i] = 1;
  }
  // Close the air over pinholes, then keep only the rock that hangs from the land: what floats free in the air is
  // what broke away, another part's.
  const grow = (m, k) => { const o = m.slice(); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = x + y * W; if (m[i] !== k) continue; for (const j of [i - 1, i + 1, i - W, i + W]) o[j] = k; } return o; };
  let open = air;
  for (let k = 0; k < 2; k++) open = grow(open, 1);
  for (let k = 0; k < 2; k++) { const inv = open.map((v) => 1 - v); open = grow(inv, 1).map((v) => 1 - v); }
  const rock = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (torn[i] && !open[i]) rock[i] = 1;
  const seen = new Uint8Array(n);
  const fill = [];
  for (let x = 0; x < W; x++) { const y = Math.ceil(top[x]) + 1, i = x + y * W; if (y < H && rock[i]) { seen[i] = 1; fill.push(i); } }
  while (fill.length) { const i = fill.pop(); for (const j of [i - 1, i + 1, i - W, i + W]) if (rock[j] && !seen[j]) { seen[j] = 1; fill.push(j); } }
  // Small pockets of air shut inside the rock are dark gaps in it, not air.
  const pocket = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!torn[i] || seen[i] || pocket[i]) continue;
    const list = [i], q = [i];
    pocket[i] = 1;
    let touches = false;
    while (q.length) { const a = q.pop(); for (const j of [a - 1, a + 1, a - W, a + W]) { if (!torn[j]) { if ((j / W | 0) >= 600) touches = true; continue; } if (seen[j]) continue; if (!pocket[j]) { pocket[j] = 1; q.push(j); list.push(j); } } }
    const enclosed = !touches && list.length < 600 && !list.some((a) => air[a] && (a / W | 0) > 640);
    for (const a of list) pocket[a] = enclosed ? 2 : 1;
  }
  for (let i = 0; i < n; i++) {
    if (!torn[i]) continue;
    const isRock = seen[i] || pocket[i] === 2;
    kind[i] = isRock ? (hide[i] ? 2 : 1) : 3;
  }

  // Paint what is hidden from the rock round it: rings of it filled inward from what is seen, then smoothed.
  let edgeList = [];
  const known = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (kind[i] === 1) known[i] = 1;
  for (let i = 0; i < n; i++) if (kind[i] === 2) edgeList.push(i);
  for (let pass = 0; pass < 400 && edgeList.length; pass++) {
    const next = [], put = [];
    for (const i of edgeList) {
      let s0 = 0, s1 = 0, s2 = 0, c = 0;
      for (const j of [i - 1, i + 1, i - W, i + W, i - W - 1, i - W + 1, i + W - 1, i + W + 1]) if (known[j]) { s0 += rgb[j * 3]; s1 += rgb[j * 3 + 1]; s2 += rgb[j * 3 + 2]; c++; }
      if (c >= 2) put.push([i, s0 / c, s1 / c, s2 / c]); else next.push(i);
    }
    for (const [i, a, b, c] of put) { rgb[i * 3] = a; rgb[i * 3 + 1] = b; rgb[i * 3 + 2] = c; known[i] = 1; }
    edgeList = next;
  }
  for (let it = 0; it < 30; it++) for (let i = 0; i < n; i++) {
    if (kind[i] !== 2) continue;
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = 0.2 * (rgb[i * 3 + c] + rgb[(i - 1) * 3 + c] + rgb[(i + 1) * 3 + c] + rgb[(i - W) * 3 + c] + rgb[(i + W) * 3 + c]);
  }
  return { W, H, rgb, srgb, kind, top, boulder };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const s = await see(), { W, H, kind, rgb } = s, out = new Uint8Array(W * H * 3);
  const tint = { 0: [0, 0, 0], 1: null, 2: null, 3: [40, 90, 160] };
  for (let i = 0; i < W * H; i++) {
    const k = kind[i];
    if (k === 1 || k === 2) { for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(255 * toSRGB(rgb[i * 3 + c])); if (k === 2) out[i * 3 + 1] = Math.min(255, out[i * 3 + 1] + 40); }
    else { const t = tint[k]; for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(s.srgb[i * 3 + c] * 0.35 + t[c] * 0.65); }
  }
  await sharp(Buffer.from(out), { raw: { width: W, height: H, channels: 3 } }).extract({ left: 200, top: 240, width: 960, height: 500 }).resize(1920).png().toFile('shots/world/rock-r/see.png');
  const counts = [0, 0, 0, 0];
  for (const k of kind) counts[k]++;
  console.log('pixels: not mine', counts[0], 'rock', counts[1], 'hidden rock', counts[2], 'air in the tear', counts[3]);
}
