import * as THREE from 'three';
import { palette } from '../../../../config/palette';
import { seeded } from '../../../../world/build';

// What is on the tablet: a drawing in progress of the sun stone from the Work section, in a drawing tool made up for
// it. Construction lines, a loose sketch, a wash of copper half laid, ink on the finished half, notes in a hand, a
// side view with its sizes, a thumbnail of the stream passing it, and the stroke being drawn now. The tool's panels
// are quiet shapes at the edges with no words on them. Drawn once, as large as it is ever seen, and mipmapped so it goes soft and never crawls as it gets small.

export const SCREEN_PX = { w: 2048, h: 1536 } as const;

// The drawing is on a dark ground, as the site's own pages are: lines in pale cream and warm grey, construction in
// ember, copper and flame only where something is being made. The brightest of it is pale, in small places.
const C = {
  chrome: '#0e0b09', bar: '#090706', panel: '#17130f', panelHi: '#241d17', well: '#110e0b', quiet: '#3d3530', quieter: '#2a2420',
  paper: '#1c1713', guide: palette.ember, graphite: palette['text-3'], ink: palette['text-2'],
  copper: palette.copper, flame: palette.flame, hot: palette.hot, pale: palette.pale, bronze: palette['text-3'], ember: palette.ember,
};

type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

const layer = (w: number, h: number): [HTMLCanvasElement, Ctx] => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
};

const rr = (g: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
};

// A line drawn as a hand draws it: several light passes, each a little off the last.
function sketch(g: Ctx, pts: Pt[], rnd: () => number, o: { w: number; a: number; passes?: number; wob?: number; color?: string }) {
  g.strokeStyle = o.color ?? C.graphite;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let p = 0; p < (o.passes ?? 2); p++) {
    const wob = o.wob ?? 2.2, ox = (rnd() - 0.5) * wob * 2, oy = (rnd() - 0.5) * wob * 2;
    g.globalAlpha = o.a * (0.7 + rnd() * 0.3);
    g.lineWidth = o.w * (0.8 + rnd() * 0.4);
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const k = Math.sin((i / Math.max(1, pts.length - 1)) * Math.PI * (1 + p));
      const px = x + ox * k + (rnd() - 0.5) * wob * 0.3, py = y + oy * k + (rnd() - 0.5) * wob * 0.3;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    });
    g.stroke();
  }
  g.globalAlpha = 1;
}

// An inked line: one pass whose width swells and tapers with the pressure of the stroke.
function ink(g: Ctx, pts: Pt[], w: number, color: string = C.ink, taper = 0.18) {
  g.strokeStyle = color;
  g.lineCap = 'round';
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const k = Math.min(1, t / taper, (1 - t) / taper);
    g.lineWidth = w * (0.35 + 0.65 * Math.sqrt(Math.max(0, k)));
    g.beginPath();
    g.moveTo(pts[i][0], pts[i][1]);
    g.lineTo(pts[i + 1][0], pts[i + 1][1]);
    g.stroke();
  }
}

const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 96): Pt[] => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt; });
const line = (a: Pt, b: Pt, n = 12): Pt[] => Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n] as Pt);

// A line through points, smoothed, drawn as a pen draws it: heavier on the downstrokes, light on the upstrokes, and
// tapered where the pen lands and lifts.
function pen(g: Ctx, raw: Pt[], w: number, color: string) {
  const pts: Pt[] = [];
  for (let i = 0; i < raw.length - 1; i++) {
    const p0 = raw[Math.max(0, i - 1)], p1 = raw[i], p2 = raw[i + 1], p3 = raw[Math.min(raw.length - 1, i + 2)];
    for (let k = 0; k < 6; k++) {
      const t = k / 6, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(raw[raw.length - 1]);
  g.strokeStyle = color;
  g.lineCap = 'round';
  let press = 0.6;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], l = Math.hypot(x1 - x0, y1 - y0) || 1;
    press += ((0.45 + 0.75 * Math.max(0, (y1 - y0) / l)) - press) * 0.35;
    const t = i / (pts.length - 2 || 1), end = Math.min(1, t / 0.06, (1 - t) / 0.1);
    g.lineWidth = w * press * (0.4 + 0.6 * Math.max(0, end));
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
}

// Letters of a running hand, made up, in units of the height of a small letter, from where the pen comes in at the
// baseline to where it leaves for the next. None spells anything.
const GLYPH: Record<string, { w: number; p: Pt[]; dot?: boolean; bar?: boolean }> = {
  n: { w: 0.66, p: [[0, 0], [0.08, 0.95], [0.12, 0.35], [0.3, 0.98], [0.48, 0.85], [0.52, 0.1], [0.66, 0.02]] },
  m: { w: 0.92, p: [[0, 0], [0.08, 0.95], [0.12, 0.35], [0.27, 0.98], [0.4, 0.85], [0.43, 0.15], [0.46, 0.5], [0.6, 0.98], [0.75, 0.85], [0.78, 0.1], [0.92, 0.02]] },
  u: { w: 0.64, p: [[0, 0.05], [0.07, 0.95], [0.08, 0.25], [0.24, 0], [0.44, 0.45], [0.5, 0.95], [0.48, 0.25], [0.56, 0], [0.64, 0.05]] },
  e: { w: 0.5, p: [[0, 0.08], [0.3, 0.42], [0.4, 0.72], [0.28, 0.95], [0.12, 0.7], [0.12, 0.22], [0.3, 0], [0.5, 0.08]] },
  o: { w: 0.58, p: [[0, 0.1], [0.18, 0.75], [0.34, 0.98], [0.48, 0.72], [0.4, 0.18], [0.2, 0], [0.08, 0.38], [0.28, 0.85], [0.58, 0.82]] },
  a: { w: 0.6, p: [[0, 0.15], [0.36, 0.92], [0.16, 0.95], [0.03, 0.5], [0.12, 0.04], [0.32, 0.32], [0.42, 0.95], [0.4, 0.35], [0.48, 0], [0.6, 0.06]] },
  l: { w: 0.44, p: [[0, 0], [0.24, 0.9], [0.38, 1.8], [0.3, 2.1], [0.18, 1.75], [0.17, 0.6], [0.24, 0.04], [0.44, 0.06]] },
  t: { w: 0.44, p: [[0, 0], [0.16, 0.7], [0.24, 1.6], [0.19, 0.5], [0.26, 0.04], [0.44, 0.08]], bar: true },
  d: { w: 0.62, p: [[0, 0.15], [0.32, 0.92], [0.12, 0.92], [0.02, 0.45], [0.13, 0.03], [0.33, 0.4], [0.47, 1.95], [0.42, 0.3], [0.5, 0], [0.62, 0.06]] },
  r: { w: 0.52, p: [[0, 0], [0.1, 0.9], [0.16, 0.95], [0.26, 0.74], [0.36, 0.95], [0.38, 0.4], [0.45, 0], [0.52, 0.04]] },
  s: { w: 0.46, p: [[0, 0], [0.2, 0.95], [0.38, 0.5], [0.32, 0.14], [0.14, 0.04], [0.3, 0], [0.46, 0.06]] },
  g: { w: 0.58, p: [[0, 0.15], [0.32, 0.92], [0.12, 0.92], [0.02, 0.48], [0.12, 0.08], [0.33, 0.48], [0.42, 0.95], [0.39, -0.6], [0.22, -0.95], [0.06, -0.62], [0.3, -0.12], [0.58, 0.08]] },
  i: { w: 0.32, p: [[0, 0], [0.12, 0.9], [0.12, 0.2], [0.21, 0], [0.32, 0.06]], dot: true },
  h: { w: 0.66, p: [[0, 0], [0.22, 1.2], [0.3, 2.0], [0.2, 2.05], [0.12, 1.4], [0.08, 0], [0.14, 0.5], [0.32, 0.98], [0.5, 0.82], [0.53, 0.1], [0.66, 0.02]] },
};
const LETTERS = 'eenoatrsilmudhg';

// Notes in a running hand: words of joined letters along a slanted baseline, each word one stroke of the pen, with
// the dots and crossbars put in after.
function hand(g: Ctx, x: number, y: number, words: number[], size: number, rnd: () => number, color: string = C.bronze, w = 3) {
  const slant = 0.28;
  let cx = x;
  for (const n of words) {
    const pts: Pt[] = [], marks: Pt[][] = [];
    for (let i = 0; i < n; i++) {
      const L = GLYPH[LETTERS[Math.floor(rnd() * LETTERS.length)]], k = 0.92 + rnd() * 0.16;
      for (const [px, py] of L.p) pts.push([cx + px * size * k + py * size * slant, y - py * size * k + (rnd() - 0.5) * size * 0.04]);
      if (L.dot) marks.push([[cx + 0.2 * size + 1.5 * size * slant, y - 1.45 * size], [cx + 0.24 * size + 1.5 * size * slant, y - 1.5 * size]]);
      if (L.bar) marks.push([[cx - 0.05 * size + 1.1 * size * slant, y - 1.12 * size], [cx + 0.5 * size + 1.1 * size * slant, y - 1.18 * size]]);
      cx += L.w * size * k;
    }
    pen(g, pts, w, color);
    for (const mk of marks) pen(g, mk, w * 0.9, color);
    cx += size * (0.55 + rnd() * 0.35);
  }
}

// Figures in the same hand, for sizes: each a few short strokes, upright, in units of a figure's height.
const FIG: Record<string, Pt[][]> = {
  '0': [Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI * 2 + 0.4; return [0.28 + Math.sin(a) * 0.26, 0.5 + Math.cos(a) * 0.5] as Pt; })],
  '1': [[[0.08, 0.8], [0.3, 1], [0.27, 0]]],
  '2': [[[0.04, 0.78], [0.22, 1], [0.48, 0.86], [0.42, 0.55], [0.02, 0.02], [0.5, 0.03]]],
  '3': [[[0.05, 0.88], [0.28, 1], [0.48, 0.82], [0.24, 0.55], [0.5, 0.3], [0.32, 0.02], [0.03, 0.12]]],
  '4': [[[0.4, 0.02], [0.38, 1], [0.02, 0.32], [0.55, 0.32]]],
  '6': [[[0.45, 0.98], [0.15, 0.7], [0.05, 0.25], [0.26, 0.0], [0.48, 0.22], [0.3, 0.48], [0.07, 0.3]]],
  '8': [[[0.42, 0.85], [0.26, 1], [0.08, 0.82], [0.4, 0.4], [0.3, 0.02], [0.05, 0.18], [0.22, 0.52], [0.44, 0.78]]],
  'Ø': [Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [0.3 + Math.sin(a) * 0.3, 0.48 + Math.cos(a) * 0.36] as Pt; }), [[0.0, 0.0], [0.62, 0.98]]],
  '°': [Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return [0.12 + Math.sin(a) * 0.1, 0.9 + Math.cos(a) * 0.1] as Pt; })],
  ' ': [],
};
function figures(g: Ctx, x: number, y: number, text: string, size: number, color: string, w: number) {
  let cx = x;
  for (const ch of text) {
    for (const st of FIG[ch] ?? []) pen(g, st.map(([px, py]) => [cx + px * size * 0.62 + py * size * 0.1, y - py * size] as Pt), w, color);
    cx += size * (ch === '°' ? 0.25 : ch === ' ' ? 0.3 : 0.48);
  }
}

const arrowHead = (g: Ctx, tip: Pt, from: Pt, s: number, color: string, w: number) => {
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(tip[0] - Math.cos(a - 0.45) * s, tip[1] - Math.sin(a - 0.45) * s);
  g.lineTo(tip[0], tip[1]);
  g.lineTo(tip[0] - Math.cos(a + 0.45) * s, tip[1] - Math.sin(a + 0.45) * s);
  g.stroke();
};

// The stone, front on: a ring of rays round a carved disk, and the points of each ray.
const STONE = { cx: 520, cy: 760, tip: 455, tipShort: 395, ring: 318, disk: 262, face: 188, boss: 58, rays: 16 } as const;
const rayPts = (i: number, s = STONE): Pt[] => {
  const a = (i / s.rays) * Math.PI * 2 - Math.PI / 2, half = Math.PI / s.rays * 0.78;
  const r = i % 2 ? s.tipShort : s.tip;
  return [[s.cx + Math.cos(a - half) * s.ring, s.cy + Math.sin(a - half) * s.ring], [s.cx + Math.cos(a) * r, s.cy + Math.sin(a) * r], [s.cx + Math.cos(a + half) * s.ring, s.cy + Math.sin(a + half) * s.ring]];
};

function drawArt(W: number, H: number) {
  const rnd = seeded(9137);
  const S = STONE;
  const [guides, gg] = layer(W, H), [sk, gs] = layer(W, H), [wash, gw] = layer(W, H), [inked, gi] = layer(W, H), [notes, gn] = layer(W, H);

  // Construction: the stone's axes and its circles, a square round it, the rays' angles, the side view's lines.
  gg.setLineDash([18, 12]);
  sketch(gg, line([60, S.cy], [W - 60, S.cy], 4), rnd, { w: 2.2, a: 0.75, passes: 1, wob: 0, color: C.guide });
  sketch(gg, line([S.cx, 70], [S.cx, H - 70], 4), rnd, { w: 2.2, a: 0.75, passes: 1, wob: 0, color: C.guide });
  gg.setLineDash([]);
  for (const r of [S.tip, S.tipShort, S.ring, S.disk, S.face, S.boss]) sketch(gg, arc(S.cx, S.cy, r, 0, Math.PI * 2, 160), rnd, { w: 2, a: 0.55, passes: 1, wob: 0, color: C.guide });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    sketch(gg, line([S.cx - Math.cos(a) * 500, S.cy - Math.sin(a) * 500], [S.cx + Math.cos(a) * 500, S.cy + Math.sin(a) * 500], 2), rnd, { w: 1.6, a: 0.4, passes: 1, wob: 0, color: C.guide });
  }
  sketch(gg, [[S.cx - S.tip, S.cy - S.tip], [S.cx + S.tip, S.cy - S.tip], [S.cx + S.tip, S.cy + S.tip], [S.cx - S.tip, S.cy + S.tip], [S.cx - S.tip, S.cy - S.tip]], rnd, { w: 1.8, a: 0.45, passes: 1, wob: 0, color: C.guide });
  const SX = 1080, sw = 96;
  for (const y of [S.cy - S.tip, S.cy - S.ring, S.cy - S.disk, S.cy + S.disk, S.cy + S.ring, S.cy + S.tip]) sketch(gg, line([S.cx + S.tip + 20, y], [SX + sw + 60, y], 3), rnd, { w: 1.6, a: 0.45, passes: 1, wob: 0, color: C.guide });

  // The sketch: the whole stone, loose, in several passes.
  for (let i = 0; i < S.rays; i++) sketch(gs, rayPts(i), rnd, { w: 3.4, a: 0.5, passes: 3, wob: 3 });
  for (const r of [S.ring, S.disk, S.face]) sketch(gs, arc(S.cx, S.cy, r, 0, Math.PI * 2, 120), rnd, { w: 3.2, a: 0.5, passes: 3, wob: 3.5 });
  sketch(gs, arc(S.cx, S.cy, S.boss, 0, Math.PI * 2, 48), rnd, { w: 3.6, a: 0.6, passes: 3, wob: 2 });
  // The carving in the disk: a ring of petals round the boss, and the spiral cut into the boss.
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2, p = (r: number, a: number): Pt => [S.cx + Math.cos(a) * r, S.cy + Math.sin(a) * r];
    sketch(gs, [p(S.boss + 8, a0 - 0.2), p(S.face - 30, a0 - 0.1), p(S.face - 14, a0), p(S.face - 30, a0 + 0.1), p(S.boss + 8, a0 + 0.2)], rnd, { w: 3, a: 0.55, passes: 2, wob: 2 });
  }
  sketch(gs, Array.from({ length: 60 }, (_, i) => { const t = i / 59, a = t * Math.PI * 5, r = 6 + t * (S.boss - 16); return [S.cx + Math.cos(a) * r, S.cy + Math.sin(a) * r] as Pt; }), rnd, { w: 3, a: 0.6, passes: 2, wob: 1 });
  // The side view: the stone's thickness, its rays stepping back.
  const side: Pt[] = [[SX, S.cy - S.tip], [SX + sw * 0.4, S.cy - S.tip], [SX + sw * 0.55, S.cy - S.ring], [SX + sw, S.cy - S.disk], [SX + sw, S.cy + S.disk], [SX + sw * 0.55, S.cy + S.ring], [SX + sw * 0.4, S.cy + S.tip], [SX, S.cy + S.tip], [SX, S.cy - S.tip]];
  sketch(gs, side, rnd, { w: 3.4, a: 0.6, passes: 3, wob: 2.5 });
  sketch(gs, line([SX + sw * 0.55, S.cy - S.ring], [SX + sw * 0.55, S.cy + S.ring], 8), rnd, { w: 2.4, a: 0.4, passes: 2 });
  sketch(gs, [[SX + sw, S.cy - 60], [SX + sw + 34, S.cy - 46], [SX + sw + 34, S.cy + 46], [SX + sw, S.cy + 60]], rnd, { w: 3, a: 0.55, passes: 2 });
  // Hatching on the side view's shadowed face.
  gs.save();
  gs.beginPath(); side.forEach(([x, y], i) => (i ? gs.lineTo(x, y) : gs.moveTo(x, y))); gs.clip();
  for (let y = S.cy - S.tip - 200; y < S.cy + S.tip; y += 15) sketch(gs, [[SX - 10, y + 60], [SX + sw + 10, y]], rnd, { w: 2, a: 0.32, passes: 1, wob: 1 });
  gs.restore();

  // The wash: copper over the rays on the left, laid as far as he has got, the brush's edge left ragged.
  gw.save();
  gw.beginPath();
  gw.moveTo(0, 0);
  for (let i = 0; i <= 40; i++) { const yy = (i / 40) * H; gw.lineTo(S.cx + 30 + Math.sin(i * 1.7) * 14 + rnd() * 26, yy); }
  gw.lineTo(0, H);
  gw.closePath();
  gw.clip();
  gw.fillStyle = C.copper;
  gw.globalAlpha = 0.42;
  for (let i = 0; i < S.rays; i++) { const p = rayPts(i); gw.beginPath(); gw.moveTo(...p[0]); gw.lineTo(...p[1]); gw.lineTo(...p[2]); gw.closePath(); gw.fill(); }
  gw.beginPath(); gw.arc(S.cx, S.cy, S.ring, 0, Math.PI * 2); gw.arc(S.cx, S.cy, S.disk, 0, Math.PI * 2, true); gw.fill();
  gw.globalAlpha = 0.22;
  gw.fillStyle = C.bronze;
  gw.beginPath(); gw.arc(S.cx, S.cy, S.disk, 0, Math.PI * 2); gw.fill();
  gw.restore();
  // A flame glow round the boss, where the stream will strike it.
  const glow = gw.createRadialGradient(S.cx, S.cy, 10, S.cx, S.cy, S.face * 1.05);
  glow.addColorStop(0, 'rgba(247,142,30,0.55)');
  glow.addColorStop(0.5, 'rgba(247,142,30,0.18)');
  glow.addColorStop(1, 'rgba(247,142,30,0)');
  gw.globalAlpha = 1;
  gw.fillStyle = glow;
  gw.beginPath(); gw.arc(S.cx, S.cy, S.face * 1.05, 0, Math.PI * 2); gw.fill();

  // The ink: clean lines over the left half, which is done.
  gi.save();
  gi.beginPath(); gi.rect(0, 0, S.cx + 2, H); gi.clip();
  for (let i = 0; i < S.rays; i++) ink(gi, rayPts(i), 9, C.ink, 0.08);
  for (const [r, w] of [[S.ring, 7], [S.disk, 6.5], [S.face, 5]] as const) ink(gi, arc(S.cx, S.cy, r, Math.PI * 0.5, Math.PI * 1.5, 80), w, C.ink, 0.04);
  for (let i = 3; i < 10; i++) {
    const a0 = (i / 12) * Math.PI * 2, p = (r: number, a: number): Pt => [S.cx + Math.cos(a) * r, S.cy + Math.sin(a) * r];
    ink(gi, [p(S.boss + 8, a0 - 0.2), p(S.face - 30, a0 - 0.1), p(S.face - 14, a0), p(S.face - 30, a0 + 0.1), p(S.boss + 8, a0 + 0.2)], 5, C.ink, 0.1);
  }
  gi.restore();
  ink(gi, arc(S.cx, S.cy, S.boss, 0, Math.PI * 2, 48), 7, C.ink, 0.02);
  // The stroke being drawn now: along the next ray's edge, in flame, the brush's ring where the pencil is.
  const now = rayPts(1);
  const live = line(now[0], now[1], 14).slice(0, 11);
  ink(gi, live, 8, C.flame, 0.12);
  const end = live[live.length - 1];
  gi.strokeStyle = C.pale; gi.lineWidth = 3; gi.globalAlpha = 0.9;
  gi.beginPath(); gi.arc(end[0], end[1], 22, 0, Math.PI * 2); gi.stroke();
  gi.globalAlpha = 1;

  // Notes: sizes on the side view, arrows to the parts, and a few lines in his hand.
  gn.strokeStyle = C.bronze;
  for (const [y0, y1, x] of [[S.cy - S.tip, S.cy + S.tip, SX + sw + 80], [S.cy - S.disk, S.cy + S.disk, SX + sw + 140]] as const) {
    sketch(gn, line([x, y0 + 8], [x, y1 - 8], 6), rnd, { w: 2.6, a: 0.9, passes: 1, wob: 0.6, color: C.bronze });
    arrowHead(gn, [x, y0 + 4], [x, y0 + 40], 18, C.bronze, 2.6);
    arrowHead(gn, [x, y1 - 4], [x, y1 - 40], 18, C.bronze, 2.6);
    figures(gn, x + 18, (y0 + y1) / 2 + 14, y1 - y0 > 800 ? '240' : 'Ø180', 34, C.bronze, 3.4);
  }
  sketch(gn, line([SX, S.cy + S.tip + 50], [SX + sw, S.cy + S.tip + 50], 4), rnd, { w: 2.6, a: 0.9, passes: 1, wob: 0.4, color: C.bronze });
  arrowHead(gn, [SX, S.cy + S.tip + 50], [SX + 30, S.cy + S.tip + 50], 16, C.bronze, 2.6);
  arrowHead(gn, [SX + sw, S.cy + S.tip + 50], [SX + sw - 30, S.cy + S.tip + 50], 16, C.bronze, 2.6);
  figures(gn, SX + 14, S.cy + S.tip + 110, '36', 34, C.bronze, 3.4);
  // A note with an arrow to the boss, and one to a ray on the right, still to be inked.
  hand(gn, 70, 120, [5, 3, 6], 30, rnd, C.bronze, 4.2);
  hand(gn, 70, 190, [4, 2, 7], 30, rnd, C.bronze, 4.2);
  sketch(gn, [[330, 215], [400, 330], [450, 560], [S.cx - 40, S.cy - 30]], rnd, { w: 3, a: 0.85, passes: 1, wob: 1, color: C.bronze });
  arrowHead(gn, [S.cx - 40, S.cy - 30], [450, 560], 22, C.bronze, 3);
  hand(gn, 80, H - 150, [6, 4, 5], 30, rnd, C.bronze, 4.2);
  hand(gn, 80, H - 85, [3, 8], 30, rnd, C.bronze, 4.2);
  figures(gn, 80 + 470, H - 85, '24°', 34, C.bronze, 3.4);
  sketch(gn, arc(S.cx + 340, S.cy + 300, 70, 0, Math.PI * 2, 40), rnd, { w: 3, a: 0.8, passes: 2, wob: 2, color: C.flame });
  pen(gn, [[S.cx + 380, S.cy + 362], [S.cx + 392, S.cy + 430], [S.cx + 360, S.cy + 505]], 3.6, C.flame);
  arrowHead(gn, [S.cx + 380, S.cy + 364], [S.cx + 392, S.cy + 430], 18, C.flame, 3.2);
  hand(gn, S.cx + 250, S.cy + 560, [4, 5], 28, rnd, C.flame, 4);

  // A thumbnail at the upper right: the stone at a slant with the stream passing it, a flame line and its shards.
  const TX = 1100, TY = 40, TW = 320, TH = 220;
  sketch(gn, [[TX, TY], [TX + TW, TY], [TX + TW, TY + TH], [TX, TY + TH], [TX, TY]], rnd, { w: 2.4, a: 0.7, passes: 1, wob: 1, color: C.graphite });
  gn.save();
  gn.beginPath(); gn.rect(TX, TY, TW, TH); gn.clip();
  const tcx = TX + 120, tcy = TY + 120;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const p = (r: number, aa: number): Pt => [tcx + Math.cos(aa) * r * 0.55, tcy + Math.sin(aa) * r];
    sketch(gn, [p(58, a - 0.2), p(i % 2 ? 84 : 96, a), p(58, a + 0.2)], rnd, { w: 2.4, a: 0.7, passes: 1, wob: 1 });
  }
  sketch(gn, arc(tcx, tcy, 1, 0, Math.PI * 2, 40).map(([x, y]) => [tcx + (x - tcx) * 58 * 0.55, tcy + (y - tcy) * 58] as Pt), rnd, { w: 2.6, a: 0.8, passes: 2, wob: 1 });
  const flow: Pt[] = Array.from({ length: 40 }, (_, i) => { const t = i / 39; return [TX + 20 + t * 260, TY + 10 + t * 200 + Math.sin(t * 7) * 18] as Pt; });
  ink(gn, flow, 6, C.flame, 0.2);
  gn.fillStyle = C.copper;
  for (let i = 0; i < 9; i++) {
    const [x, y] = flow[4 + i * 4], s = 6 + rnd() * 8, a = rnd() * Math.PI;
    gn.beginPath(); gn.moveTo(x + Math.cos(a) * s + 14, y + Math.sin(a) * s - 10); gn.lineTo(x + Math.cos(a + 2.2) * s + 14, y + Math.sin(a + 2.2) * s - 10); gn.lineTo(x + Math.cos(a + 4.1) * s * 0.6 + 14, y + Math.sin(a + 4.1) * s * 0.6 - 10); gn.fill();
  }
  gn.restore();

  return { layers: [guides, sk, wash, inked, notes] };
}

// The screen, whole: the tool's chrome, the paper with its layers, and the panels.
export function drawScreen(): HTMLCanvasElement {
  const [cv, g] = layer(SCREEN_PX.w, SCREEN_PX.h);
  const W = SCREEN_PX.w, H = SCREEN_PX.h;
  const rnd = seeded(4021);
  g.fillStyle = C.chrome;
  g.fillRect(0, 0, W, H);

  // The paper.
  const P = { x: 150, y: 104, w: 1460, h: 1360 };
  const art = drawArt(P.w, P.h);
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 40; g.shadowOffsetY = 10;
  g.fillStyle = C.paper;
  g.fillRect(P.x, P.y, P.w, P.h);
  g.restore();
  const tooth = g.createLinearGradient(P.x, P.y, P.x + P.w, P.y + P.h);
  tooth.addColorStop(0, 'rgba(255,227,194,0.035)'); tooth.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = tooth; g.fillRect(P.x, P.y, P.w, P.h);
  // The paper's grain, a little uneven.
  for (let i = 0; i < 9000; i++) {
    const x = P.x + rnd() * P.w, y = P.y + rnd() * P.h;
    g.fillStyle = rnd() > 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,227,194,0.025)';
    g.fillRect(x, y, 2 + rnd() * 3, 2);
  }
  for (const l of art.layers) g.drawImage(l, P.x, P.y);

  // The top bar: a few shapes at the left, a title pill, and the tools at the right with the brush's color.
  g.fillStyle = C.bar;
  g.fillRect(0, 0, W, 76);
  g.fillStyle = C.quiet;
  for (let i = 0; i < 3; i++) { rr(g, 34 + i * 70, 22, 46, 32, 9); g.fill(); }
  g.fillStyle = C.quieter;
  rr(g, 880, 26, 290, 24, 12); g.fill();
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(1660 + i * 72, 38, 17, 0, Math.PI * 2); g.fillStyle = C.quiet; g.fill(); }
  g.strokeStyle = C.copper; g.lineWidth = 4; g.beginPath(); g.arc(1660 + 72, 38, 23, 0, Math.PI * 2); g.stroke();
  g.fillStyle = C.flame; g.beginPath(); g.arc(1980, 38, 21, 0, Math.PI * 2); g.fill();
  g.strokeStyle = C.pale; g.lineWidth = 3; g.beginPath(); g.arc(1980, 38, 25, 0, Math.PI * 2); g.stroke();

  // The tool rail at the left: a floating panel of tools, one in use.
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 24;
  g.fillStyle = C.panel; rr(g, 30, 360, 92, 760, 28); g.fill();
  g.restore();
  for (let i = 0; i < 8; i++) {
    const y = 404 + i * 86;
    if (i === 2) { g.fillStyle = C.copper; rr(g, 46, y - 30, 60, 60, 16); g.fill(); }
    g.strokeStyle = i === 2 ? C.ink : C.quiet; g.fillStyle = i === 2 ? C.ink : C.quiet; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath();
    if (i % 4 === 0) { g.arc(76, y, 14, 0, Math.PI * 2); g.stroke(); }
    else if (i % 4 === 1) { g.moveTo(62, y + 14); g.lineTo(90, y - 14); g.stroke(); g.beginPath(); g.arc(62, y + 14, 4, 0, Math.PI * 2); g.fill(); }
    else if (i % 4 === 2) { g.moveTo(64, y + 16); g.lineTo(84, y - 12); g.lineTo(90, y - 6); g.lineTo(70, y + 20); g.closePath(); g.fill(); }
    else { rr(g, 63, y - 13, 26, 26, 5); g.stroke(); }
  }

  // The layers panel at the right: a card for each layer with its own picture, the one being drawn on lit.
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 30;
  g.fillStyle = C.panel; rr(g, 1650, 104, 372, 940, 26); g.fill();
  g.restore();
  g.fillStyle = C.quieter; rr(g, 1680, 132, 150, 20, 10); g.fill();
  g.fillStyle = C.quiet; g.beginPath(); g.arc(1984, 142, 13, 0, Math.PI * 2); g.fill();
  const order = [4, 3, 2, 1, 0];
  order.forEach((li, k) => {
    const y = 180 + k * 168, on = li === 3;
    g.fillStyle = on ? C.panelHi : C.well; rr(g, 1668, y, 336, 150, 16); g.fill();
    if (on) { g.strokeStyle = C.copper; g.lineWidth = 4; rr(g, 1668, y, 336, 150, 16); g.stroke(); }
    g.fillStyle = C.paper; g.fillRect(1684, y + 16, 126, 118);
    g.drawImage(art.layers[li], 0, 0, P.w, P.h, 1684, y + 16, 126, 118);
    g.fillStyle = on ? C.copper : C.quiet; rr(g, 1830, y + 44, 110 - k * 9, 18, 9); g.fill();
    g.fillStyle = C.quieter; rr(g, 1830, y + 82, 70, 14, 7); g.fill();
    g.strokeStyle = on ? C.pale : C.quiet; g.lineWidth = 4; g.beginPath(); g.arc(1972, y + 75, 13, 0, Math.PI * 2); g.stroke();
    if (li !== 0) { g.fillStyle = on ? C.pale : C.quiet; g.beginPath(); g.arc(1972, y + 75, 6, 0, Math.PI * 2); g.fill(); }
  });

  // The colors, in the site's own, the brush's marked.
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 30;
  g.fillStyle = C.panel; rr(g, 1650, 1070, 372, 260, 26); g.fill();
  g.restore();
  const sw = [palette['ember-deep'], C.ember, palette['bronze-deep'], palette.bronze, C.copper, palette['copper-light'], C.flame, C.hot, C.pale, C.ink];
  sw.forEach((c, i) => {
    const x = 1700 + (i % 5) * 68, y = 1140 + Math.floor(i / 5) * 76;
    g.fillStyle = c; g.beginPath(); g.arc(x, y, 24, 0, Math.PI * 2); g.fill();
    if (c === C.flame) { g.strokeStyle = C.pale; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 31, 0, Math.PI * 2); g.stroke(); }
  });
  g.fillStyle = C.quieter; rr(g, 1680, 1290, 312, 14, 7); g.fill();
  g.fillStyle = C.copper; rr(g, 1680, 1290, 200, 14, 7); g.fill();

  // At the foot, the zoom and the undo shapes.
  g.fillStyle = C.panel; rr(g, 1650, 1360, 372, 104, 26); g.fill();
  g.fillStyle = C.quiet;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(1712 + i * 84, 1412, 22, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = C.quieter; rr(g, 1950 - 60, 1398, 100, 28, 14); g.fill();
  return cv;
}

export function screenTexture(maxAniso: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(drawScreen());
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  return t;
}
