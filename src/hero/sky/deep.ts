import { palette, type PaletteName } from '../../config/palette';
import { seeded } from '../../world/build';
import { bandFrame, cellSeed, clump, mix3, scale3, smooth, weigh, type V3 } from './field';
import type { SkyPlan } from './index';

// The deep sky: a second sky behind today's, drawn once and shown only where the pointer is (his ruling of Nov 26,
// "The plan you have for the sky looks incredible!"). With no pointer nothing of it is drawn, so the sky at rest is
// today's. It is behind a switch until he has seen it in the page: ?sky=deep.
export const DEEP_PARAM = 'sky';
export const isDeep = (query: URLSearchParams): boolean => query.get(DEEP_PARAM) === 'deep';

// Lengths are in units of the board and times in seconds. reach is how far from the pointer the sky deepens and soft
// how gently a thing comes up once the reveal passes its own threshold. The reveal comes up in `enter` when the
// pointer comes into the sky and deepens in `settle` once it slows under `fast` a second. The pointer leaves pools
// behind it, each gone `life` after it was dropped, no sooner than `every` and no nearer than `apart` to the last.
// most and least are what the brightest and the least channel of anything revealed may reach, as shares of 255.
export const DEEP = {
  reach: 335,
  soft: 0.16,
  enter: 0.22,
  settle: 0.45,
  fast: 527,
  life: 1.6,
  every: 0.1,
  apart: 36.5,
  pools: 16,
  first: 0.05,
  last: 0.66,
  most: 235 / 255,
  least: 190 / 255,
} as const;

// The hidden stars: how many are tried for each CSS pixel, the share kept where the sky is thickest, and the
// faintest and brightest of them in display levels, rarer as they brighten. block is his words' block as a share of
// the oval kept clear round it, and clear how far from the block the stars begin and are whole.
export const STARS = {
  cell: 16,
  tries: 0.694,
  keep: 3.4,
  faint: 6.5,
  slope: 0.6,
  most: 190,
  copper: 0.08,
  halo: { from: 60, over: 110, most: 0.1, sigma: 1.3 },
  block: [0.645, 0.65],
  clear: [18.5, 71],
} as const;
// Where they gather: along the band as it is seen, in the band's own frame, and round a cloud low on the left.
export const GATHER = {
  band: { a: 0.03, b: -0.95, along: 0.45, across: 0.96, haze: [0.62, 0.74], top: 46.6, stretch: 1.7 },
  cloud: { x: 119.6, y: 567.8, rx: 121.7, ry: 79.1, turn: 28 },
} as const;

// The warm gas in the band and in the cloud: value noise folded by two warps into sheets, with fine threads, dark
// lanes and one side lit. Cells and how far a warp carries are in units. The band's gas is two sheets laid in the
// band's own frame, the cloud's one, each place's lanes folded as its first sheet is and seeded on their own. full is
// the sheet's light that shows as the brightest tone, and tight the power on the cloud's oval that keeps its gas to
// the middle of where its stars gather. ramp is what the gas's light is drawn in, darkest first: where on 0 to 1 each
// tone sits, two of the palette's colors, how far from the first to the second, and how bright. show is the reveal
// the faintest gas waits for, how much less the brightest needs, and how gently it comes up. The lanes also thin the
// hidden stars, from the same numbers. texel is the most of the gas's picture there is for a CSS pixel, and mask how
// many CSS pixels one value of deepMask covers.
export const GAS = {
  wide: { cell: 380, octaves: 4, gain: 0.55, far: 370 },
  fine: { cell: 105, octaves: 4, gain: 0.55, far: 78 },
  body: { cell: 550, octaves: 9, gain: 0.6, floor: 0.1, cloud: [0.4, 0.92], curve: 1.25 },
  threads: { cell: 210, octaves: 6, gain: 0.62, span: [0.647, 0.924], curve: 2.2, fine: 1.3, wide: 0.9, light: 0.85, body: [0.22, 0.6], bare: 0.35 },
  lanes: { cell: 280, octaves: 7, gain: 0.62, wide: 0.7, over: 0.2, dark: 0.92 },
  rim: { step: 1.5, octaves: 7, gain: 54, flat: 0.42, lit: 0.95, shade: 0.25 },
  band: { seed: 66, second: 55, share: 0.55, lanes: 190, light: 200, lane: 0.46, full: 1.3, patch: { cell: 450, octaves: 3, gain: 0.5, seed: 8, least: 0.6, more: 0.8 } },
  low: { seed: 73, lanes: 80, light: 215, lane: 0.5, full: 0.76, tight: 2 },
  clear: [30, 190],
  level: 0.5,
  curve: 0.9,
  ramp: [
    [0.12, 'ember-deep', 'bronze-deep', 0.25, 0.52],
    [0.3, 'ember', 'bronze-deep', 0.4, 0.73],
    [0.5, 'ember', 'bronze', 0.4, 0.9],
    [0.7, 'copper', 'ember', 0.4, 0.97],
    [0.86, 'copper', 'copper', 0, 0.985],
    [1, 'copper-light', 'copper-light', 0, 1.02],
  ],
  haze: { cell: 260, octaves: 5, gain: 0.6, seed: 11, least: 0.3, more: 0.95, lanes: 0.85, level: 17 / 255, grain: 0.18, show: 0.5 },
  show: { first: 0.56, less: 0.34, soft: 0.3 },
  texel: 1,
  mask: 4,
} as const;

// The things to find: two galaxies, a spiral low on the right and one seen from its edge on the left. Each is a disc
// of points whose places and light come from the point's number alone, summed once into a picture of its own and
// laid into the hidden stars' picture. at and r are in units, tilt, turn and pitch in degrees, and reach, thin, wide
// and thick shares of the radius. count is how many points a part has where the radius is madeAt device pixels, and
// least and most how far that follows the disc's area. spread is a point's width in device pixels, over the width
// past which it is drawn large, a knot's two widths shares of the radius, and room the share of its picture the disc
// fills. peak is the display level of a galaxy's brightest light, show the reveal its brightest and its faintest
// light wait for, and level what turns each part's sum of points into its light.
export const FINDS = {
  madeAt: 202.4,
  count: { arms: 900000, disc: 500000, knots: 320, least: 0.5, most: 2 },
  spread: { arms: 0.44, disc: 0.71, dust: 0.6, lane: 0.47 },
  point: { small: 3, large: 5, over: 0.5 },
  knot: { tight: 0.00435, wide: 0.01196, more: 2.4 },
  noise: { cell: 0.8, octaves: 5, gain: 0.62 },
  room: 0.92,
  galaxies: [
    { at: [1279.5, 409.6], r: 102.6, tilt: 58, turn: -24, seed: 77, arms: 3, pitch: 22, reach: 0.3, wind: 0.45, thin: 0.03, wide: 0.09, thick: 0.012, spurs: 0.5, heart: 1, stretch: 16, dust: 0.85, lane: 0, peak: 150, show: [0.08, 0.5], level: { arms: 0.115892, disc: 0.113895, knots: 8.34052e-5, dust: 0.253733, lane: 0 } },
    { at: [168.3, 342.7], r: 88.6, tilt: 88.4, turn: 30, seed: 340, arms: 2, pitch: 14, reach: 0.3, wind: 0.9, thin: 0.03, wide: 0.085, thick: 0.022, spurs: 0, heart: 1.3, stretch: 14, dust: 0.3, lane: 3, peak: 140, show: [0.08, 0.46], level: { arms: 0.0304898, disc: 0.0449729, knots: 4.19098e-5, dust: 0.0425913, lane: 0.0389271 } },
  ],
} as const;
export type Galaxy = (typeof FINDS.galaxies)[number];
// The parts of a galaxy, as its shader tells them apart.
export const FIND = { arms: 0, spurs: 1, disc: 2, knots: 3, dust: 4, lane: 5 } as const;

// A cluster of stars over his name: a ball of faint stars in a soft glow. over is how far its middle is across from
// the middle of his words' block and how far over the block's top, and least how near the top of the screen it may
// come, so it keeps its place over his name on a screen of any height. core is where the ball is thickest, reach
// where it ends, room how much further its own picture goes, and flat how much it is squashed down the screen. count
// is how many stars it has where a unit is madeAt CSS pixels, more or fewer as the ball's area is, so it is as thick
// with stars on a screen of any width. A star is faint at the least and most at the most, rarer by slope as it
// brightens. width is a star's spread where two device pixels are a CSS pixel, and how much wider one of `full`
// levels is. A star over copper.over levels is copper that share of the time, and one over pale is pale. show is the
// reveal the brightest star waits for, how much more a faint one needs, less as it nears `full` levels, and how much
// more one `out` from the middle needs. heart is the glow: its brightest level, its two falls (how much, how wide,
// how steep), how far its grain takes it either way, and the reveal its brightest and faintest light wait for.
// Lengths are in units and light in display levels.
export const CLUSTER = {
  over: [231.2, 90.7],
  least: 24,
  core: 10.14,
  reach: 111.5,
  room: 1.1,
  flat: 0.94,
  count: 3600,
  madeAt: 0.9863,
  seed: 948,
  faint: 7,
  slope: 0.66,
  most: 185,
  width: { thin: 0.52, more: 0.55, full: 150 },
  copper: { over: 50, share: 0.35 },
  pale: 30,
  show: { first: 0.1, faint: 0.34, full: 120, far: 0.1, out: 81.1 },
  heart: { peak: 92, near: [0.7, 11.15, 1.15], wide: [0.3, 26.36, 1], grain: 0.28, show: [0.1, 0.34] },
} as const;

// The far galaxies: small smudges with a brighter heart, each set down within `down` of the top where the hidden sky
// is whole (open) and bare of the band and the cloud, clear of the two galaxies by that share of their radius and
// of the cluster by that share of its reach, and apart from each other. tries is how many places one may try before
// it is left out. long, flat and peak are the least of its half length in units, of how flat it is and of its
// brightest level, each with how much more the most has. warm is the share in the hidden stars' warm tone, and tone
// what the rest are in. body and heart are its two falls (how much, how wide as a share of its length, how steep),
// reach how many lengths its picture goes out, and show the reveal its heart and its faintest light wait for.
export const FAR = {
  count: 16,
  seed: 93,
  tries: 60,
  down: 872,
  open: 0.8,
  bare: 0.3,
  clear: [1.15, 0.6],
  apart: 24,
  long: [2.43, 4.06],
  flat: [0.28, 0.55],
  peak: [30, 44],
  warm: 0.6,
  tone: ['hot', 'copper-light', 0.5],
  body: [0.75, 1, 1.1],
  heart: [0.9, 0.28, 1.2],
  reach: 4.5,
  show: [0.22, 0.6],
} as const;

// Today's bright few answer the pointer: each is given up to `more` of its own light again, in display levels, as
// the reveal at it goes from `from` to `to`. One answers where the hidden sky may be (`open`: not at all under the
// first share of it, wholly over the second), so none does behind his words, on the moon or against the world.
export const BRIGHT = { more: 0.6, from: 0.08, to: 0.75, open: [0.35, 0.65] } as const;

// Over the page's world (SkyPlan.land): how far over its outline the hidden sky begins and is whole, in units, how
// deep in the world's glow it starts to thin and is thinnest, as shares of the glow's reach, the share of it that is
// left there, and how far over the outline the pointer has to be for the whole of the reveal.
const LAND = { clear: [24, 110], glow: [0.18, 0.46], least: 0.06, over: 30 } as const;

const shown = (name: PaletteName): V3 => {
  const n = parseInt(palette[name].slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const PALE = shown('pale'), WARM = mix3(PALE, shown('hot'), 0.5), COPPER = scale3(shown('copper'), 1.09);
// The sky's light is added to the page's ground, so the sky itself may hold the limits less the ground.
export const DEEP_CAP: [number, number] = [DEEP.most - Math.max(...shown('bg')), DEEP.least - Math.min(...shown('bg'))];

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
// Less of the band, the cloud or the gas than this is none.
export const FAINT = 0.001;
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(6.2831853 * r());

// Value noise in octaves, spread to fill 0 to 1. cell is the widest octave's, in units of the board.
function cloud(x: number, y: number, cell: number, octaves: number, gain: number, seed: number): number {
  let sum = 0, amp = 1, total = 0, power = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * clump(x / cell + seed * 37.13 + i * 11.7, y / cell - seed * 19.31 + i * 5.3);
    total += amp;
    power += amp * amp;
    amp *= gain;
    cell /= 2;
  }
  return clamp(0.5 + (sum / total - 0.5) * total / (0.97 * Math.sqrt(power)), 0, 1);
}

export interface DeepField { mask: number; env: number; haze: number; lanes: number }

// How far a place is over the world's outline, in CSS pixels. Under it, less than nothing.
const over = (p: SkyPlan, land: (x: number) => number, x: number, y: number) => Math.min(land(x), p.end) - y;

// Where the hidden sky may be at all: never behind his words' block or on the moon, never under the world's outline,
// thinner toward the world's glow. A page that has told no outline has the sky's own guess of one.
function allowed(p: SkyPlan, x: number, y: number, glow = true): number {
  const w = weigh(p, x, y);
  const far = Math.hypot(Math.max(0, Math.abs(x - p.words.x) - STARS.block[0] * p.words.rx), Math.max(0, Math.abs(y - p.words.y) - STARS.block[1] * p.words.ry));
  const clear = smooth(STARS.clear[0] * p.u, STARS.clear[1] * p.u, far) * w.moon;
  if (!p.land) return clear * w.open;
  const lit = glow ? LAND.least + (1 - LAND.least) * (1 - smooth(LAND.glow[0], LAND.glow[1], w.glow)) : 1;
  return clear * lit * smooth(LAND.clear[0] * p.u, LAND.clear[1] * p.u, over(p, p.land, x, y));
}

// How much of the pointer's answer (BRIGHT) one of today's bright few gets, from where it stands. The thinning
// toward the world's glow is not counted against it: the star is in today's sky there already.
export const answering = (p: SkyPlan, x: number, y: number): number => smooth(BRIGHT.open[0], BRIGHT.open[1], allowed(p, x, y, false));

// The gas's dark lanes at a place of a sheet, as the gas's shader has them (DEEP_GAS_FS).
function lanes(x: number, y: number, seed: number, own: number, at: number): number {
  const F = GAS.fine, W = GAS.wide, L = GAS.lanes;
  const fx = (cloud(x, y, F.cell, F.octaves, F.gain, seed + 4) - 0.5) * F.far, fy = (cloud(x, y, F.cell, F.octaves, F.gain, seed + 5) - 0.5) * F.far;
  const wx = (cloud(x + fx, y + fy, W.cell, W.octaves, W.gain, seed + 2) - 0.5) * W.far, wy = (cloud(x + fx, y + fy, W.cell, W.octaves, W.gain, seed + 3) - 0.5) * W.far;
  return smooth(at, at + L.over, cloud(x + fx + L.wide * wx, y + fy + L.wide * wy, L.cell, L.octaves, L.gain, own));
}

// What the hidden sky is made of at a place: where it may be, how near the band or the cloud, the band's far stars
// too fine to be points, and the dark lanes that thin both.
export function deepField(p: SkyPlan, x: number, y: number): DeepField {
  const mask = allowed(p, x, y), B = GATHER.band, C = GATHER.cloud, X = x / p.u, Y = y / p.u;
  const f = bandFrame(p, x, y), a = f.a - B.a, b = f.b - B.b, top = smooth(0, B.top, Y);
  const band = Math.exp(-0.5 * ((a / B.along) ** 2 + (b / B.across) ** 2)) * top;
  const t = (C.turn * Math.PI) / 180, dx = X - C.x, dy = Y - C.y, cu = (dx * Math.cos(t) + dy * Math.sin(t)) / C.rx, cv = (-dx * Math.sin(t) + dy * Math.cos(t)) / C.ry;
  const low = Math.exp(-0.5 * (cu * cu + cv * cv));
  const e = Math.hypot((x - p.words.x) / p.words.rx, (y - p.words.y) / p.words.ry);
  const far = Math.exp(-0.5 * ((a / B.haze[0]) ** 2 + (b / B.haze[1]) ** 2)) * smooth(1, 1.65, e) * top * mask;
  const inBand = band > FAINT || far > FAINT ? lanes((f.a * p.band.rx) / (p.u * B.stretch), (f.b * p.band.ry) / p.u, GAS.band.seed, GAS.band.lanes, GAS.band.lane) : 0;
  const inLow = low > FAINT ? lanes(X, Y, GAS.low.seed, GAS.low.lanes, GAS.low.lane) : 0;
  const H = GAS.haze, haze = far * (H.least + H.more * cloud(X, Y, H.cell, H.octaves, H.gain, H.seed)) * (1 - H.lanes * inBand);
  return { mask, env: Math.min(1.5, band + 0.55 * low + 0.03), haze, lanes: clamp(inBand * Math.min(1, band * 2.5) + inLow * Math.min(1, low * 2.5), 0, 1) };
}

// Where the hidden sky may be, for the gas's shader: one value for each GAS.mask CSS pixels across and down, each
// the least of those round it so the gas never reaches past what the stars keep to.
export function deepMask(p: SkyPlan): { data: Uint8Array; cols: number; rows: number } {
  const M = GAS.mask, cols = Math.ceil(p.w / M) + 1, rows = Math.ceil(p.end / M) + 1, at = new Float32Array(cols * rows), data = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) at[j * cols + i] = allowed(p, Math.min(i * M, p.w), Math.min(j * M, p.end));
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let least = 1;
      for (let b = Math.max(0, j - 1); b <= Math.min(rows - 1, j + 1); b++) for (let a = Math.max(0, i - 1); a <= Math.min(cols - 1, i + 1); a++) least = Math.min(least, at[b * cols + a]);
      data[j * cols + i] = Math.floor(least * 255);
    }
  }
  return { data, cols, rows };
}

// What the gas's shader is told of a plan: the frames it works in and which way each sheet is lit, in the sheet's
// own frame.
export function gasFrame(p: SkyPlan): { band: [number, number, number, number]; axis: [number, number]; light: [number, number, number, number] } {
  const t = (p.band.turn * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), rad = Math.PI / 180;
  const b = [Math.cos(GAS.band.light * rad), Math.sin(GAS.band.light * rad)], l = GAS.low.light * rad;
  return { band: [p.band.x, p.band.y, p.band.rx, p.band.ry], axis: [c, s], light: [(b[0] * c + b[1] * s) / GATHER.band.stretch, -b[0] * s + b[1] * c, Math.cos(l), Math.sin(l)] };
}
export const gasRamp = (): { at: number; tone: V3 }[] => GAS.ramp.map(([at, a, b, k, bright]) => ({ at, tone: scale3(mix3(shown(a), shown(b), k), bright * GAS.level) }));
export const GAS_HAZE: V3 = scale3(WARM, GAS.haze.level);

export const FIND_TONE = { heart: mix3(PALE, shown('hot'), 0.18), disc: mix3(shown('hot'), shown('copper-light'), 0.27), arms: scale3(shown('copper'), 0.95 / shown('copper')[0]), knots: shown('hot') };
// How many pixels across a galaxy's own picture is, where its radius is R device pixels.
export const findSize = (R: number) => Math.ceil((2 * R) / FINDS.room) | 1;

export interface FindDraw {
  kind: number;
  key: number;
  count: number;
  arm: [number, number, number, number];
  thrown: [number, number, number, number];
  disc: [number, number, number];
  light: number;
  into: [number, number, number, number];
  size: number;
  gauss: [number, number, number, number];
}
// One drawing for each part of a galaxy whose radius is R device pixels: how many points, what the shader is told
// of them, the light of one, which channel of the picture it is summed in, and the point's size and shape.
export function findDraws(g: Galaxy, R: number): FindDraw[] {
  const C = FINDS.count, S = FINDS.spread, P = FINDS.point, K = FINDS.knot, L = g.level, t = g.thick, out: FindDraw[] = [];
  const k = clamp((R / FINDS.madeAt) ** 2, C.least, C.most), cot = 1 / Math.tan((g.pitch * Math.PI) / 180);
  const key = (kind: number) => Math.imul(g.seed * 8 + kind, 0x9e3779b1) >>> 0;
  const into = (i: number): [number, number, number, number] => [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0, i === 3 ? 1 : 0];
  const add = (kind: number, count: number, reach: number, thick: number, channel: number, level: number, spread: number, thin = 0, wide = 0, share = 0, inner = 0, turn = 0, shift = 0) => {
    const n = Math.round(count * k);
    out.push({ kind, key: key(kind), count: n, arm: [g.arms, cot, g.wind, turn], thrown: [thin, wide, share, shift], disc: [g.reach * reach, inner, thick], light: ((R * R) / n) * level, into: into(channel), size: spread <= P.over ? P.small : P.large, gauss: [1 / (2 * Math.PI * spread * spread), 1 / (2 * spread * spread), 0, 0] });
  };
  add(FIND.arms, C.arms, 1, t, 0, L.arms, S.arms, g.thin, g.wide, 0.6, 0.045);
  if (g.spurs > 0) add(FIND.spurs, C.arms / 2, 1, t, 0, L.arms * g.spurs * 2, S.arms, g.thin * 0.9, g.wide * 0.8, 0.6, 0.22, Math.PI / g.arms);
  add(FIND.disc, C.disc, 1.1, t * 1.7, 1, L.disc, S.disc);
  const tight = K.tight * R, loose = K.wide * R;
  out.push({ kind: FIND.knots, key: key(FIND.knots), count: C.knots, arm: [g.arms, cot, g.wind, 0], thrown: [0.01, 0.026, 0.8, 0], disc: [g.reach, 0.1, 0], light: R * R * L.knots, into: into(2), size: 2 * Math.ceil(3 * loose) + 1, gauss: [1 / (2 * Math.PI * tight * tight), 1 / (2 * tight * tight), K.more / (2 * Math.PI * loose * loose), 1 / (2 * loose * loose)] });
  add(FIND.dust, C.arms / 2, 1, t * 0.3, 3, L.dust * g.dust, S.dust, g.thin * 0.35, g.wide * 0.4, 0.7, 0.045, 0, 0.07);
  if (g.lane > 0) add(FIND.lane, C.disc, 1.25, t * 0.22, 3, L.lane * g.lane, S.lane);
  return out;
}

// A soft oval of light, for its shader (DEEP_SMUDGE_FS): its middle, half length and reach in device pixels, its
// turn, how flat it is, its tone at its brightest, its two falls (how much and how steep each, and how wide each as
// a share of the length), the reveal its brightest and faintest light wait for, and how far its grain takes it.
export interface Smudge {
  at: [number, number];
  turn: number;
  long: number;
  flat: number;
  tone: V3;
  falls: [number, number, number, number];
  wide: [number, number];
  show: [number, number];
  grain: number;
  reach: number;
}

// Where the cluster's middle is, in CSS pixels of the host.
export const clusterAt = (p: SkyPlan): [number, number] => [
  p.words.x + CLUSTER.over[0] * p.u,
  Math.max(CLUSTER.least * p.u, p.words.y - STARS.block[1] * p.words.ry - CLUSTER.over[1] * p.u),
];
// How many pixels across the cluster's own picture is, and where its corner is in the hidden stars' picture.
export function clusterPicture(p: SkyPlan, s: number): { size: number; x: number; y: number } {
  const at = clusterAt(p), half = Math.ceil(CLUSTER.reach * CLUSTER.room * p.u * s);
  return { size: 2 * half + 1, x: Math.floor(at[0] * s) - half, y: Math.floor(at[1] * s) - half };
}

// One splat for each star of the cluster, laid out as a hidden star is, in its own picture's pixels. Each star's
// place and light come from its own four numbers, so a wider screen's ball is a narrower one's with more stars in it.
export function clusterStars(p: SkyPlan, s: number): { data: Float32Array; count: number } {
  const C = CLUSTER, r = seeded(C.seed), at = clusterAt(p), pic = clusterPicture(p, s), out: number[] = [];
  for (let k = Math.round(C.count * (p.u / C.madeAt) ** 2); k > 0; k--) {
    const far = C.core / Math.sqrt(Math.max(1e-6, r() ** (-2 / 3) - 1)), a = 6.2831853 * r(), rare = r(), kind = r();
    if (far >= C.reach) continue;
    const x = at[0] + far * Math.cos(a) * p.u, y = at[1] + far * Math.sin(a) * C.flat * p.u, m = allowed(p, x, y);
    if (m < FAINT) continue;
    const pk = Math.min(C.most, C.faint * Math.max(1e-6, rare) ** -C.slope);
    const col = pk > C.copper.over && kind < C.copper.share ? COPPER : pk > C.pale ? PALE : WARM;
    const two = C.width.thin + C.width.more * Math.min(1, pk / C.width.full), e = (pk / 255) * m * 6.2831853 * two * two * (s / 2) ** 2;
    const wait = C.show.first + C.show.faint * (1 - Math.min(1, pk / C.show.full)) + C.show.far * Math.min(1, far / C.show.out);
    out.push(x * s - pic.x, y * s - pic.y, col[0] * e, col[1] * e, col[2] * e, Math.max(0.45, (two * s) / 2), 0, 1 - wait);
  }
  return { data: new Float32Array(out), count: out.length / 8 };
}
export function clusterHeart(p: SkyPlan, s: number): Smudge {
  const H = CLUSTER.heart, at = clusterAt(p);
  return { at: [at[0] * s, at[1] * s], turn: 0, long: H.near[1] * p.u * s, flat: 1, tone: scale3(WARM, H.peak / 255), falls: [H.near[0], H.near[2], H.wide[0], H.wide[2]], wide: [1, H.wide[1] / H.near[1]], show: [H.show[0], H.show[1]], grain: H.grain, reach: CLUSTER.reach * CLUSTER.room * p.u * s };
}

// The far galaxies of a plan. Each has a stream of numbers for its place and one for its look, so one that has to
// try again for a place is still the same galaxy.
export function farGalaxies(p: SkyPlan, s: number): Smudge[] {
  const F = FAR, ball = clusterAt(p), sum = F.body[0] + F.heart[0], rest = mix3(shown(F.tone[0]), shown(F.tone[1]), F.tone[2]), out: Smudge[] = [];
  const taken: [number, number, number][] = FINDS.galaxies.map((g) => [g.at[0] * p.u, g.at[1] * p.u, g.r * F.clear[0] * p.u]);
  taken.push([ball[0], ball[1], CLUSTER.reach * F.clear[1] * p.u]);
  for (let i = 0; i < F.count; i++) {
    const r = seeded(cellSeed(i, F.seed, 57)), look = seeded(cellSeed(i, F.seed, 58));
    let at: [number, number] | null = null;
    for (let k = 0; k < F.tries && !at; k++) {
      const x = r() * p.w, y = r() * F.down * p.u;
      if (taken.some(([a, b, c]) => Math.hypot(x - a, y - b) < c)) continue;
      const f = deepField(p, x, y);
      if (f.mask > F.open && f.env < F.bare) at = [x, y];
    }
    if (!at) continue;
    const long = (F.long[0] + look() * F.long[1]) * p.u * s, flat = F.flat[0] + look() * F.flat[1], turn = look() * Math.PI, tone = look() < F.warm ? WARM : rest, peak = F.peak[0] + look() * F.peak[1];
    taken.push([at[0], at[1], F.apart * p.u]);
    out.push({ at: [at[0] * s, at[1] * s], turn, long, flat, tone: scale3(tone, peak / 255), falls: [F.body[0] / sum, F.body[2], F.heart[0] / sum, F.heart[2]], wide: [F.body[1], F.heart[1]], show: [F.show[0], F.show[1]], grain: 0, reach: F.reach * long });
  }
  return out;
}

// One splat for each hidden star, laid out as the sky's own (SPLAT): where it is in device pixels, its light as a
// share of full brightness, its size, how much of a soft glow it sits in, and how early the reveal shows it.
export function deepStars(p: SkyPlan, s: number): { data: Float32Array; count: number } {
  const out: number[] = [], C = STARS.cell, mid = p.w / 2, H = STARS.halo;
  for (let i = Math.floor(-mid / C) - 1; i * C < mid; i++) {
    for (let j = 0; j * C < p.end; j++) {
      const cx = mid + (i + 0.5) * C, cy = (j + 0.5) * C, f = deepField(p, cx, cy);
      const thick = (0.3 + 1.3 * cloud(cx / p.u, cy / p.u, 310, 4, 0.55, 9) ** 1.6) * (0.6 + 3 * Math.min(f.env, 1.2) + 2.2 * f.haze) * (1 - 0.8 * f.lanes * Math.min(1, f.env * 3));
      const r = seeded(cellSeed(i, j, 31)), n = Math.floor(STARS.tries * C * C * Math.min(1, thick / STARS.keep) + r());
      for (let k = 0; k < n; k++) {
        const x = mid + (i + r()) * C, y = (j + r()) * C, keep = r(), rare = r(), g1 = gauss(r), g2 = gauss(r), kind = r(), size = r();
        const m = allowed(p, x, y);
        if (keep >= m) continue;
        const pk = Math.min(STARS.most, STARS.faint * Math.max(1e-6, rare) ** -STARS.slope) * (0.5 + 0.5 * m);
        const q = clamp((pk - 6) / 150, 0, 1) ** 0.45;
        const col = kind < STARS.copper ? COPPER : mix3(WARM, PALE, clamp(0.15 + 0.8 * q + 0.2 * g2, 0, 1));
        const two = 0.5 + 0.55 * q + 0.1 * size, e = (pk / 255) * 6.2831853 * two * two * (s / 2) ** 2;
        const halo = clamp((pk - H.from) / H.over, 0, 1) * H.most * (2 * H.sigma / two) ** 2;
        out.push(x * s, y * s, col[0] * e, col[1] * e, col[2] * e, Math.max(0.45, (two * s) / 2), halo, 1 - clamp(0.56 - 0.48 * q + 0.06 * g1, DEEP.first, DEEP.last));
      }
    }
  }
  return { data: new Float32Array(out), count: out.length / 8 };
}
export const DEEP_HALO = STARS.halo.sigma;

export interface Pool { x: number; y: number; s: number }
const NONE: Pool[] = [];

// The pointer over the sky, as the few numbers the reveal is drawn from: itself and the pools it has left behind,
// in CSS pixels of the host. Nothing is kept in a buffer.
export function follow(host: HTMLElement): { step(t: number, p: SkyPlan): Pool[]; pin(at: Pool | null): void; dispose(): void } {
  let at: { x: number; y: number } | null = null, spot: { x: number; y: number } | null = null, pinned: Pool | null = null;
  let presence = 0, rest = 0, last = -Infinity, dropped = -Infinity, trail: (Pool & { t: number })[] = [];
  const move = (e: PointerEvent) => { if (e.pointerType !== 'touch') at = { x: e.clientX, y: e.clientY }; };
  const leave = () => { at = null; };
  addEventListener('pointermove', move, { passive: true });
  document.documentElement.addEventListener('pointerleave', leave);
  return {
    step(t, p) {
      if (pinned) return [pinned];
      const dt = clamp(t - last, 0, 0.1);
      last = t;
      if (!at && presence < 0.003 && !trail.length) { presence = 0; return NONE; }
      let goal = 0, speed = 0;
      if (at) {
        const r = host.getBoundingClientRect(), here = { x: at.x - r.left, y: at.y - r.top };
        goal = p.land ? smooth(0, LAND.over * p.u, over(p, p.land, here.x, here.y)) : smooth(0.12, 0.45, weigh(p, here.x, here.y).open);
        if (spot && dt > 0) speed = Math.hypot(here.x - spot.x, here.y - spot.y) / dt;
        spot = here;
      }
      presence += (goal - presence) * (1 - Math.exp(-dt / DEEP.enter));
      rest += (1 - Math.min(1, speed / (DEEP.fast * p.u)) - rest) * (1 - Math.exp(-dt / DEEP.settle));
      trail = trail.filter((k) => t - k.t < DEEP.life);
      const depth = presence * (0.5 + 0.5 * rest), newest = trail[trail.length - 1];
      if (at && spot && depth > 0.02 && trail.length < DEEP.pools && (!newest || (t - dropped > DEEP.every && Math.hypot(spot.x - newest.x, spot.y - newest.y) > DEEP.apart * p.u))) {
        trail.push({ x: spot.x, y: spot.y, s: depth, t });
        dropped = t;
      }
      const out: Pool[] = trail.map((k) => ({ x: k.x, y: k.y, s: k.s * (1 - (t - k.t) / DEEP.life) ** 2 }));
      if (spot) out.push({ x: spot.x, y: spot.y, s: depth });
      const live = out.filter((k) => k.s > 0.003);
      return live.length ? live : NONE;
    },
    pin(to) { pinned = to; },
    dispose() {
      removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    },
  };
}
