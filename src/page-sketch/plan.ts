import { BAR, BUTTON, CARD, CARDS, RAIL, STAGE, STONE } from '../work-surge/surge';

// A sketch of the whole home page, hero to footer, for judging the composition: where each section sits, where the
// stream goes and what it meets, where the 3D pieces stand and how large. Everything is in design units, one unit a
// CSS pixel on a desktop 1460 wide. Work is laid out as the surge study has it. Nothing here is the real stream.

export const W = STAGE.w;
export const CX = W / 2;

export type Pt = [number, number];
// A corner of the route: where it is, how round the turn is, and how far the run that arrives at it wanders.
type Corner = [x: number, y: number, radius?: number, sway?: number];
export interface Line { pts: Pt[]; cum: number[]; total: number; d: string }
export interface Strike { id: string; line: number; at: number; x: number; y: number }

export const WORK = { h: 1770, top: 49, l: 506, r: 954, base: 142, meet: 1706, bar: BAR, card: CARD, cards: CARDS, stone: STONE, rail: RAIL, button: BUTTON };
// The accomplishments strip he raised: figures either side of the stream and a row of marks under them.
export const PROOF = { h: 330, figures: [300, 520, 940, 1160], marks: [262, 478, 842, 1058], mark: { w: 140, h: 56 } };
// The workbench is drawn from its own still, seen from the other side, at half size.
export type Rows = 'beside' | 'under';
export const SKILLS = {
  desk: (x: number, y: number): Pt => [190 + (1250 - x) * 0.5, 35 + y * 0.5],
  title: { x: 820, y: 205 },
  // The rows of skills: stacked beside the desk under the title, or across the page under the desk.
  beside: { h: 790, l: 820, r: 1310, t: 344, step: 88, n: 4 },
  under: { h: 980, l: 150, r: 1310, t: 610, step: 70, n: 4 },
};
export const ABOUT = { h: 620, rail: { ax: 116, ay: 70, bx: 1330, by: 329 }, portrait: { x: 760, y: -90, w: 560, h: 543 }, title: { x: 150, y: 300 } };
export const CONTACT = { h: 700, pad: { x: CX, y: 440, rx: 215, ry: 70 }, flume: { ax: 1356, ay: 250, bx: 938, by: 418 }, title: { x: 150, y: 170 } };
export const FOOT = { h: 220 };
export const CITY = { lip: 104, top: 470 };

function line(nodes: Corner[]): Line {
  const out: Pt[] = [];
  const run = (a: Pt, b: Pt, sway: number, seed: number) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / 6)), nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1);
    for (let i = out.length ? 1 : 0; i <= n; i++) {
      const u = i / n, k = sway * Math.sin(Math.PI * u) ** 0.7 * Math.sin((u * len) / 38 + seed * 2.4);
      out.push([a[0] + (b[0] - a[0]) * u + nx * k, a[1] + (b[1] - a[1]) * u + ny * k]);
    }
  };
  let from: Pt = [nodes[0][0], nodes[0][1]];
  for (let i = 1; i < nodes.length; i++) {
    const c = nodes[i], next = nodes[i + 1];
    if (!next) { run(from, [c[0], c[1]], c[3] ?? 0, i); break; }
    const d1 = Math.hypot(c[0] - from[0], c[1] - from[1]) || 1, d2 = Math.hypot(next[0] - c[0], next[1] - c[1]) || 1;
    const k = Math.min(c[2] ?? 30, d1 * 0.5, d2 * 0.5);
    const a: Pt = [c[0] + ((from[0] - c[0]) * k) / d1, c[1] + ((from[1] - c[1]) * k) / d1];
    const b: Pt = [c[0] + ((next[0] - c[0]) * k) / d2, c[1] + ((next[1] - c[1]) * k) / d2];
    run(from, a, c[3] ?? 0, i);
    for (let s = 1; s <= 8; s++) {
      const t = s / 8, u = 1 - t;
      out.push([u * u * a[0] + 2 * t * u * c[0] + t * t * b[0], u * u * a[1] + 2 * t * u * c[1] + t * t * b[1]]);
    }
    from = b;
  }
  const cum = [0];
  for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  return { pts: out, cum, total: cum[cum.length - 1], d: 'M' + out.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L') };
}

// How far along a line its leading end is when it has come down to this height. A line never climbs.
export function reach(l: Line, y: number): number {
  if (y <= l.pts[0][1]) return 0;
  for (let i = 0; i < l.pts.length - 1; i++) {
    const y0 = l.pts[i][1], y1 = l.pts[i + 1][1];
    if (y1 > y) return l.cum[i] + ((y - y0) / Math.max(y1 - y0, 1e-6)) * (l.cum[i + 1] - l.cum[i]);
  }
  return l.total;
}

export function point(l: Line, len: number): Pt {
  let i = 0;
  while (i < l.cum.length - 2 && l.cum[i + 1] < len) i++;
  const f = (len - l.cum[i]) / Math.max(l.cum[i + 1] - l.cum[i], 1e-6);
  return [l.pts[i][0] + (l.pts[i + 1][0] - l.pts[i][0]) * f, l.pts[i][1] + (l.pts[i + 1][1] - l.pts[i][1]) * f];
}

function nearest(l: Line, x: number, y: number): number {
  let best = 0, bd = Infinity;
  for (let i = 0; i < l.pts.length; i++) {
    const d = Math.hypot(l.pts[i][0] - x, l.pts[i][1] - y);
    if (d < bd) { bd = d; best = l.cum[i]; }
  }
  return best;
}

export interface Plan {
  h: number;
  hero: number;
  text: number;
  city: number;
  work: number;
  // Where the accomplishments strip starts, or null when the page goes straight from Work to Skills.
  proof: number | null;
  skills: number;
  about: number;
  contact: number;
  foot: number;
  lines: Line[];
  strikes: Strike[];
  end: Pt;
}

export function plan(hero: number, withProof: boolean, rows: Rows): Plan {
  const text = Math.round(hero * 0.33) - 95;
  const city = Math.max(hero + 95, text + 280 + 45 + CITY.top);
  const work = city + CITY.lip + 240 - WORK.top;
  const proof = withProof ? work + WORK.h : null, skills = work + WORK.h + (withProof ? PROOF.h : 0);
  const about = skills + SKILLS[rows].h, contact = about + ABOUT.h, foot = contact + CONTACT.h;

  const fall = line([[CX, city + CITY.lip], [CX, work + WORK.top, 0, 13]]);
  // The left side through Work. Above the category bar it is the path as it was, from the bar to the meeting it is
  // the bolt, as he ruled. The right side is its mirror.
  const side: Corner[] = [
    [CX, WORK.top], [WORK.l, WORK.top, 40], [450, 120, 60], [418, 211, 22], [366, 211, 5], [322, 383, 4], [246, 383, 4],
    [128, 876, 4], [247, 1174, 4], [150, 1592, 4], [611, 1654, 4], [CX, WORK.meet],
  ];
  const left = line(side.map(([x, y, r]) => [x, work + y, r]));
  const right = line(side.map(([x, y, r]) => [W - x, work + y, r]));

  const R = ABOUT.rail, F = CONTACT.flume;
  const [dx0, dy0] = SKILLS.desk(150, 590), [dx1, dy1] = SKILLS.desk(1250, 718);
  const on = (t: number): Pt => [dx0 + (dx1 - dx0) * t, skills + dy0 + (dy1 - dy0) * t];
  const rail = (x: number): Pt => [x, about + R.ay + ((x - R.ax) / (R.bx - R.ax)) * (R.by - R.ay)];
  const land = on(0.03), off = on(0.99);
  const end: Pt = [CONTACT.pad.x + 118, contact + CONTACT.pad.y - 8];
  const down = line([
    [CX, work + WORK.meet],
    [land[0], land[1], 6, 12],
    [off[0], off[1], 30],
    [124, skills + 500, 70, 3],
    [rail(130)[0], rail(130)[1], 6, 9],
    [rail(R.bx - 4)[0], rail(R.bx - 4)[1], 34],
    [F.ax - 2, about + R.by + 70, 80],
    [F.ax - 2, contact + F.ay, 14, 11],
    [F.bx + 4, contact + F.by - 2, 30],
    end,
  ]);

  const lines = [fall, left, right, down];
  const strikes: Strike[] = [];
  const mark = (id: string, li: number, x: number, y: number) => strikes.push({ id, line: li, at: nearest(lines[li], x, y), x, y });
  mark('title', 0, CX, work + WORK.top);
  ([[1, 1], [2, -1]] as const).forEach(([li, m]) => {
    const x = (v: number) => (m > 0 ? v : W - v), tag = m > 0 ? 'L' : 'R';
    mark(`bar${tag}`, li, x(418), work + 211);
    mark(`card${m > 0 ? 0 : 1}`, li, x(322), work + 383);
    mark(`stone${tag}`, li, x(128), work + 876);
    mark(`card${m > 0 ? 2 : 3}`, li, x(247), work + 1174);
    mark(`rail${tag}`, li, x(150), work + 1592);
  });
  mark('button', 3, CX, work + WORK.meet);
  mark('desk', 3, land[0], land[1]);
  mark('rail', 3, rail(130)[0], rail(130)[1]);
  mark('portrait', 3, rail(900)[0], rail(900)[1]);
  mark('flume', 3, F.ax - 2, contact + F.ay);
  mark('pad', 3, end[0], end[1]);

  return { h: foot + FOOT.h, hero, text, city, work, proof, skills, about, contact, foot, lines, strikes, end };
}
