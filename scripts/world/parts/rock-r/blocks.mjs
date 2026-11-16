// Sculpt R, round 3: the hollow as a few heavy blocks of stone. Each block takes its outline from the picture's own
// slabs (measured/slabs.json, joined along the picture's main dark lines), and is a solid in the world: a front face
// on one plane, leaning in toward the core, a back face its thickness behind, and broken sides at right angles to it,
// with beds in them. Where the picture is black between masses there is no block: the backing, far behind, shows.
//
//   import { plan } from './blocks.mjs'
//   const args = await plan()     // what the field (hollow.mjs) is set up with: every block, its outline, the backing
//
// Each entry of BLOCKS: the slabs it is made of, what it is (kind), how deep its face is at its middle (z, toward the
// visitor), how it is turned (lean toward the core, out from it, down or up, as shares added to the view), how thick
// it is, and how many breaks run across it. Every number here was set by eye against picture 9 and the stills.
import { L } from '../../lib/plan.mjs';
import { slabMap } from './raster.mjs';
import { crisp } from './knap.mjs';
import { see, inside } from './see.mjs';
import { shellAlong, edgeZ, CORE_PX, J, VIEW, norm, dot } from './relief.mjs';

// Samples to a picture pixel in the outlines, and how far past an outline its distance is kept, in pixels.
export const BY = 2, MARGIN = 48;
const C = L.CORE.at;

export const BLOCKS = [
  // The ring round the core, nearest it and deepest, the brightest rock.
  { name: 'ring-left', kind: 'plate', slabs: [61, 67, 77, 65, 69], z: 55, lean: 0.7, thick: 46, breaks: 2 },
  { name: 'back-left', kind: 'plate', slabs: [25, 32], z: 20, lean: 1.1, thick: 60, breaks: 3 },
  { name: 'back-top', kind: 'plate', slabs: [38, 34, 11, 13], z: -10, lean: 0.5, thick: 60, breaks: 1 },
  { name: 'back-mid', kind: 'plate', slabs: [57], z: -30, lean: 0.6, thick: 60, breaks: 0 },
  { name: 'back-right', kind: 'plate', slabs: [56, 35, 36, 27, 41], z: 35, lean: 1.1, thick: 56, breaks: 3 },
  // The great plates each side, further out and nearer the visitor.
  { name: 'right-1', kind: 'plate', slabs: [43, 86, 87], z: 105, lean: 0.6, thick: 62, breaks: 3 },
  { name: 'right-2', kind: 'plate', slabs: [37, 28, 23], z: 170, lean: 1.0, thick: 48, breaks: 1 },
  { name: 'left-2', kind: 'plate', slabs: [26], z: 75, lean: 1.2, thick: 52, breaks: 3 },
  { name: 'left-1', kind: 'plate', slabs: [60, 49, 54, 46, 75, 83, 85], z: 160, lean: 1.75, thick: 66, breaks: 3 },
  { name: 'left-low', kind: 'plate', slabs: [88, 95, 97, 99], z: 215, lean: 0.95, thick: 58, breaks: 1 },
  // Recesses turned from the core, lit only by what bounces.
  { name: 'shade-left', kind: 'shade', slabs: [47], z: 0, out: 0.9, thick: 40, breaks: 0 },
  { name: 'shade-right', kind: 'shade', slabs: [22], z: 120, out: 0.9, thick: 40, breaks: 0 },
  // The floor: one shelf under the core, its front face turned up to it.
  { name: 'floor', kind: 'floor', slabs: [84, 81, 70, 96, 98, 93], cut: 'lane', z: 225, up: 0.9, lean: 0.35, thick: 70, breaks: 2 },
  // Behind the stream the shelf is set back, so the stream falls in front of its lit lip.
  { name: 'floor-back', kind: 'floor', slabs: [84, 81, 70, 96, 98, 93], only: 'lane', z: 112, up: 0.8, lean: 0.4, thick: 60, breaks: 1 },
  { name: 'floor-left', kind: 'shade', slabs: [68], z: 115, out: 0.5, up: 0.3, thick: 50, breaks: 1 },
  { name: 'right-low', kind: 'frame', slabs: [53, 73, 80, 78], z: 300, out: -0.2, down: 0.15, thick: 90, breaks: 2 },
  // The roof: the land's broken lip, its top turned up to the moon; a dark lid of great slabs hanging under it in
  // front of the core; and lit pieces hanging behind the lid's lower edge, turned to the core. z is how far behind
  // the land's front edge the face is.
  { name: 'lip', kind: 'roof', slabs: [0, 2, 4, 7, 20, 10, 19, 31, 24], back: -22, up: 1.0, turn: [0.9, 0, 0], thick: 60, breaks: 2 },
  { name: 'lid-left', kind: 'roof', slabs: [21, 30, 14, 29], cut: 'stratL', back: 30, down: 0.4, thick: 110, breaks: 1 },
  { name: 'lid-mid', kind: 'roof', slabs: [8, 5, 15], back: 12, down: 0.48, thick: 120, breaks: 1 },
  { name: 'lid-right', kind: 'roof', slabs: [3], back: 12, down: 0.45, thick: 120, breaks: 2 },
  { name: 'hang-right', kind: 'plate', slabs: [6, 12, 18], back: 70, lean: 1.4, thick: 44, breaks: 1 },
  // The frame: heavy masses standing forward at each side, near black, with voids between them.
  { name: 'frame-left-top', kind: 'frame', slabs: [42, 50, 44], cut: 'stratL', z: 0, out: 0.4, down: 0.6, thick: 130, breaks: 1 },
  // The thick broken stratum under the land at the left, its front turned up and right to the moon.
  { name: 'strat-left', kind: 'roof', slabs: [42, 50, 44, 21, 30, 14, 29], only: 'stratL', back: -40, up: 0.6, turn: [1.2, 0, 0], thick: 90, breaks: 1 },
  { name: 'frame-left-edge', kind: 'frame', slabs: [64, 63, 74, 79, 62, 82], z: 0, out: 0.5, down: 0.55, thick: 130, breaks: 1 },
  { name: 'frame-left-mid', kind: 'frame', slabs: [66], z: 330, out: 0.3, down: 0.55, thick: 120, breaks: 1 },
  { name: 'frame-left-low', kind: 'frame', slabs: [89, 91, 92, 101, 100, 102, 103, 104, 105, 94], z: 0, out: 0.38, down: 0.45, thick: 130, breaks: 2 },
  { name: 'frame-right-edge', kind: 'frame', slabs: [39, 71, 17, 16], z: 0, out: -0.25, down: 0.18, thick: 130, breaks: 1 },
  { name: 'frame-right-mid', kind: 'frame', slabs: [33, 76], z: 330, out: -0.2, down: 0.45, thick: 120, breaks: 1 },
  { name: 'frame-right-low', kind: 'frame', slabs: [90], z: 0, out: -0.2, down: 0.2, thick: 130, breaks: 1 },
];

// Places in the picture a block is cut to, in its pixels: the shelf behind the stream, a ragged bay round its line.
const SHAPES = {
  stratL: [[240, 262], [478, 262], [474, 329], [458, 334], [446, 331], [433, 339], [414, 336], [399, 343], [384, 339], [370, 346], [352, 341], [337, 349], [319, 343], [301, 348], [287, 339], [270, 344], [255, 338], [240, 340]],
  lane: [[646, 510], [659, 521], [653, 533], [662, 547], [656, 558], [666, 571], [661, 584], [669, 596], [681, 594], [690, 603], [701, 597], [713, 599], [716, 586], [710, 574], [721, 561], [714, 549], [724, 537], [717, 524], [730, 510]],
};
// What of the picture is not the rock though it looked it: the stream's own light under the shelf. Its top carries on
// the shelf's own underside from either side of the stream, so nothing hangs lower there than beside it.
const NOT_ROCK = [[[646, 640], [648, 571], [657, 568], [666, 570], [674, 574], [683, 578], [692, 582], [702, 584], [713, 582], [722, 583], [731, 586], [733, 640]]];

const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

// The squared distance to the nearest set sample along one line (Felzenszwalb and Huttenlocher).
function edt1(f, n, d, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s;
    for (;;) { s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); if (s <= z[k]) { k--; continue; } break; }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) ** 2 + f[v[k]]; }
}
function edt(mask, w, h, want) {
  const BIG = 1e20, g = new Float64Array(w * h), m = Math.max(w, h), f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
  for (let i = 0; i < w * h; i++) g[i] = mask[i] === want ? 0 : BIG;
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[x + y * w]; edt1(f, h, d, v, z); for (let y = 0; y < h; y++) g[x + y * w] = d[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[x + y * w]; edt1(f, w, d, v, z); for (let x = 0; x < w; x++) g[x + y * w] = d[x]; }
  return g;
}
// The signed distance of a mask, in picture pixels: under 0 inside.
export function signed(mask, w, h, by) {
  const out = edt(mask, w, h, 0), inn = edt(mask, w, h, 1), sd = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) sd[i] = (mask[i] ? 0.5 - Math.sqrt(out[i]) : Math.sqrt(inn[i]) - 0.5) / by;
  return sd;
}

// Holes in a mask smaller than `least` samples are filled: a face never has a hole in its middle.
function fillHoles(mask, w, h, least) {
  const seen = new Uint8Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (mask[s] || seen[s]) continue;
    const list = [s], q = [s];
    seen[s] = 1;
    let edge = false;
    while (q.length) {
      const i = q.pop(), x = i % w, y = (i / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && !mask[j] && !seen[j]) { seen[j] = 1; q.push(j); list.push(j); }
    }
    if (!edge && list.length < least) for (const i of list) mask[i] = 1;
  }
}
// Pieces of a mask smaller than `least` samples are dropped.
function dropCrumbs(mask, w, h, least) {
  const seen = new Uint8Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || seen[s]) continue;
    const list = [s], q = [s];
    seen[s] = 1;
    while (q.length) {
      const i = q.pop(), x = i % w, y = (i / w) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && mask[j] && !seen[j]) { seen[j] = 1; q.push(j); list.push(j); }
    }
    if (list.length < least) for (const i of list) mask[i] = 0;
  }
}

// Out from the core across the picture at a place, as a direction in the world.
export function outward(px, py) {
  const ox = px - CORE_PX[0], oy = py - CORE_PX[1], l = Math.hypot(ox, oy) || 1;
  return norm([J[0][0] * ox + J[1][0] * oy, J[0][1] * ox + J[1][1] * oy, J[0][2] * ox + J[1][2] * oy].map((v) => v / l));
}

// The normal of a block's face from what it is and how it is turned.
export function faceNormal(b, at, P) {
  const d = Math.hypot(C[0] - P[0], C[1] - P[1], C[2] - P[2]) || 1, toCore = [(C[0] - P[0]) / d, (C[1] - P[1]) / d, (C[2] - P[2]) / d];
  const out = outward(...at), v = VIEW.slice();
  const add = (k, u) => { for (let i = 0; i < 3; i++) v[i] += k * u[i]; };
  if (b.lean) add(b.lean, toCore);
  if (b.out) add(b.out, out);
  if (b.down) add(b.down, [0, -1, 0]);
  if (b.up) add(b.up, [0, 1, 0]);
  if (b.turn) add(1, b.turn);
  return norm(v);
}

// The plan: each block's outline as a distance in the picture, its face's plane, and what the field needs besides.
export async function plan({ draft = false } = {}) {
  const json = (await import('node:fs')).readFileSync(new URL('./measured/slabs.json', import.meta.url), 'utf8');
  const m = slabMap(crisp(JSON.parse(json)), BY), S = await see();
  const W = m.W, H = m.H;
  // What of the picture is the rock: rock seen and rock hidden, between the torn edges and over the open air.
  const rockMask = new Uint8Array(S.W * S.H);
  for (let i = 0; i < rockMask.length; i++) rockMask[i] = S.kind[i] === 1 || S.kind[i] === 2 ? 1 : 0;
  for (const poly of NOT_ROCK) for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (inside(poly, x + 0.5, y + 0.5)) rockMask[x + y * S.W] = 0;
  const rock = { x0: 0, y0: 0, w: S.W, h: S.H, by: 1, sd: signed(rockMask, S.W, S.H, 1) };
  const blocks = BLOCKS.map((b, k) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, cx = 0, cy = 0, n = 0;
    const cutB = b.cut ? SHAPES[b.cut] : null, onlyB = b.only ? SHAPES[b.only] : null;
    for (let i = 0; i < W * H; i++) {
      const s = m.slab[i];
      if (s < 0 || !b.slabs.includes(s)) continue;
      const x = i % W, y = (i / W) | 0;
      if (cutB && inside(cutB, (x + 0.5) / BY, (y + 0.5) / BY)) continue;
      if (onlyB && !inside(onlyB, (x + 0.5) / BY, (y + 0.5) / BY)) continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); cx += x; cy += y; n++;
    }
    if (!n) throw new Error(`blocks: ${b.name} has no pixels`);
    const pad = MARGIN * BY, bx = Math.max(0, x0 - pad), byy = Math.max(0, y0 - pad), w = Math.min(W, x1 + pad + 1) - bx, h = Math.min(H, y1 + pad + 1) - byy;
    const mask = new Uint8Array(w * h);
    const cut = b.cut ? SHAPES[b.cut] : null, only = b.only ? SHAPES[b.only] : null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = m.slab[(x + bx) + (y + byy) * W];
      if (s < 0 || !b.slabs.includes(s)) continue;
      const px = (x + bx + 0.5) / BY, py = (y + byy + 0.5) / BY;
      if (cut && inside(cut, px, py)) continue;
      if (only && !inside(only, px, py)) continue;
      mask[x + y * w] = 1;
    }
    fillHoles(mask, w, h, 900 * BY * BY);
    let want = 0, seen = 0;
    for (let y = 0; y < h; y += BY) for (let x = 0; x < w; x += BY) {
      if (!mask[x + y * w]) continue;
      const i = Math.floor((x + bx) / BY) + Math.floor((y + byy) / BY) * S.W;
      if (S.kind[i] !== 1) continue;
      want += 0.2126 * S.rgb[i * 3] + 0.7152 * S.rgb[i * 3 + 1] + 0.0722 * S.rgb[i * 3 + 2]; seen++;
    }
    dropCrumbs(mask, w, h, 40 * BY * BY);
    const at = [(cx / n + 0.5) / BY, (cy / n + 0.5) / BY];
    return { ...b, id: k, at, want: seen ? want / seen : 0, area: n / (BY * BY), outline: { x0: bx / BY, y0: byy / BY, w, h, by: BY, sd: signed(mask, w, h, BY) }, box: [x0 / BY - 2, y0 / BY - 2, (x1 + 1) / BY + 2, (y1 + 1) / BY + 2] };
  });
  // The face of each block: its plane through its middle at its depth. A block of the frame stands as far forward
  // as the planet's own surface at its outer side, so it meets the skin with no gap.
  for (const b of blocks) {
    let z = b.z;
    if (b.back !== undefined) z = edgeZ(L.fromPicture(...b.at, 300)[0]) - b.back;
    if (b.kind === 'frame' && !z) {
      const side = b.at[0] < CORE_PX[0] ? 0 : 2, edgeX = b.box[side], sh = shellAlong(edgeX + (side ? -4 : 4), b.at[1]);
      z = sh ? sh.near + 6 : 420;
      for (let it = 0; it < 4; it++) {
        const n = faceNormal(b, b.at, L.fromPicture(...b.at, z)), P0 = L.fromPicture(edgeX, b.at[1], z), Pm = L.fromPicture(...b.at, z);
        // Along the face from its middle to its outer side, how far back it goes.
        const run = Pm[0] - P0[0], dz = (n[0] / n[2]) * run;
        z = (sh ? sh.near + 6 : 420) - dz;
      }
    }
    const P = L.fromPicture(...b.at, z), n = faceNormal(b, b.at, P);
    b.z = z; b.n = n; b.h = dot(n, P); b.seed = 17 + b.id * 31;
  }
  return { blocks, rock, draft, core: { at: [...C], r: L.CORE.r } };
}
