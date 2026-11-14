import type { Art } from './stage';
import { BAR, DRAWER, PLATE, drawer, medal, plate, stampedBar } from './arts';

// Three layouts for the section, each in a frame 1240 units wide. The stream comes in at the middle of the top,
// which is where it leaves Work. Every place below is in those units.

export const FRAME = 1240;
const IN = FRAME / 2;

export type Pt = [number, number];
export interface Placed { art: Art; x: number; y: number; w: number; name: string }
// A grey bar standing for words. heavy is a label, the rest are lines.
export interface Word { x: number; y: number; w: number; heavy?: boolean }
export interface Layout { id: string; name: string; note: string; stream: string; h: number; pieces: Placed[]; words: Word[]; line: Pt[]; strikes: Pt[] }

// Every figure but the first is a stand in. The first is the only one the brief holds.
const FIGURES: [string, string][] = [['10', 'YEARS'], ['00', 'PROJECTS'], ['00', 'CLIENTS'], ['00', 'PRODUCTS']];
const said = ([figure, label]: [string, string]) => `${figure} ${label.toLowerCase()}`;

// A · Slanted plates. The stream runs the top of each plate and drops off its low end onto the next.
function slanted(): Layout {
  const { w, h, drop } = PLATE, gap = 24, x = [260, 240, 260], top = 60, lift = 2.5;
  const ys = [top, top + h + drop + gap, top + 2 * (h + drop + gap)];
  const edge = (i: number, at: number): Pt => [at, ys[i] + (i % 2 ? (at - x[i]) / w : 1 - (at - x[i]) / w) * drop - lift];
  const off = 9, foot = ys[2] + h + drop;
  const bar = { w: 680, y: foot + 48 };
  const line: Pt[] = [
    [IN, 0], edge(0, IN), edge(0, x[0] - off),
    edge(1, x[0] - off), edge(1, x[1] + w + off),
    edge(2, x[1] + w + off), edge(2, x[0] - off),
    [x[0] - off, bar.y + (bar.w / (BAR.cell * 4)) * BAR.h + 56],
  ];
  return {
    id: 'a',
    name: 'A · Slanted plates',
    note: 'Your long diagonal cards. Three plates, each tipped the other way from the one above, with everything on them leaning with the plate.',
    stream: 'The stream lands on the first plate, runs along the top of it and drops off its low end onto the next. It crosses the page three times and wakes each plate as it runs it.',
    h: line[line.length - 1][1],
    pieces: [
      ...FIGURES.slice(0, 3).map((f, i): Placed => ({ art: plate(f[0], f[1], i % 2 ? 1 : -1, i), x: x[i], y: ys[i], w, name: `A plate in bronze: ${said(f)}` })),
      { art: stampedBar(4), x: (x[0] + x[1] + w - bar.w) / 2 + 10, y: bar.y, w: bar.w, name: 'Four company marks struck into one bar. Stand in marks' },
    ],
    words: [],
    line,
    strikes: [line[1], line[3], line[5]],
  };
}

// B · Struck medals. The stream bounces between them, striking the near shoulder of each.
function medals(): Layout {
  const size = 196, r = (size / 220) * 108, swing = 200, step = 140, first = 118;
  const hits: Pt[] = [0, 1, 2, 3].map((i) => [IN + (i % 2 ? 0.5 : -0.5) * swing, first + i * step]);
  const centre = (i: number): Pt => [hits[i][0] + (i % 2 ? 1 : -1) * r * Math.cos(Math.PI / 6), hits[i][1] + r * Math.sin(Math.PI / 6)];
  const bars = { w: 432, y: hits[3][1] + 200, gap: 22 }, barH = (bars.w / (BAR.cell * 3)) * BAR.h;
  // The last stroke keeps the angle of the others and lands on the left bar, which carries the stream to the gap.
  const land: Pt = [hits[3][0] - (swing * (bars.y - 2.5 - hits[3][1])) / step, bars.y - 2.5];
  const pieces: Placed[] = FIGURES.map((f, i) => { const [cx, cy] = centre(i); return { art: medal(f[0], f[1]), x: cx - size / 2, y: cy - size / 2, w: size, name: `A medal in bronze: ${said(f)}` }; });
  const words: Word[] = FIGURES.flatMap((_, i) => {
    const [cx, cy] = centre(i), left = i % 2 === 0, at = (wide: number) => (left ? cx - size / 2 - 30 - wide : cx + size / 2 + 30);
    return [{ x: at(96), y: cy - 24, w: 96, heavy: true }, { x: at(200), y: cy, w: 200 }, { x: at(150), y: cy + 17, w: 150 }];
  });
  return {
    id: 'b',
    name: 'B · Struck medals',
    note: 'Four medals either side of the stream, each with its figure in relief and what it counts round its foot. A line or two of words sits outside each.',
    stream: 'The stream bounces between them as a bolt, striking the near shoulder of each medal and turning hard. A medal is a blank until it is struck. Its last stroke lands on the marks, runs along them and drops between the two bars.',
    h: bars.y + barH + 56,
    pieces: [
      ...pieces,
      { art: stampedBar(3), x: IN - bars.gap / 2 - bars.w, y: bars.y, w: bars.w, name: 'Three company marks struck into one bar. Stand in marks' },
      { art: stampedBar(3, 3), x: IN + bars.gap / 2, y: bars.y, w: bars.w, name: 'Three more company marks struck into one bar. Stand in marks' },
    ],
    words,
    line: [[IN, 0], ...hits, land, [IN, bars.y - 2.5], [IN, bars.y + barH + 56]],
    strikes: [...hits, land],
  };
}

// D · Drawer fronts. The stream steps down them: it lands on a front, runs to its end and drops onto the next.
function drawers(): Layout {
  const { w, h } = DRAWER, across = 160, down = h + 30, x0 = 600, top = 70, lift = 2.5, off = 8;
  const at = (i: number): Pt => [x0 - i * across, top + i * down];
  const line: Pt[] = [[IN, 0]];
  let x = IN;
  for (let i = 0; i < 4; i++) { const [dx, dy] = at(i); line.push([x, dy - lift], [dx - off, dy - lift]); x = dx - off; }
  const bar = { w: 540 }, last = at(3), foot = last[1] + h;
  line.push([x, foot + 60]);
  return {
    id: 'd',
    name: 'D · Drawer fronts',
    note: 'Four level fronts stepping down the page on a diagonal, like the drawers of an old cabinet. Each has its figure in a label holder and a knob of the sleeping card’s family.',
    stream: 'The stream steps down them: it lands on a front, runs to its end and drops onto the next. The marks sit in the corner the stair leaves open. This is the quiet one of the three.',
    h: foot + 60,
    pieces: [
      ...FIGURES.map((f, i): Placed => ({ art: drawer(f[0], f[1]), x: at(i)[0], y: at(i)[1], w, name: `A drawer front in bronze: ${said(f)}` })),
      { art: stampedBar(3), x: FRAME - bar.w - 40, y: foot - BAR.h, w: bar.w, name: 'Three company marks struck into one bar. Stand in marks' },
    ],
    words: [{ x: 120, y: top + 6, w: 150, heavy: true }, { x: 120, y: top + 34, w: 330 }, { x: 120, y: top + 51, w: 290 }, { x: 120, y: top + 68, w: 180 }],
    line,
    strikes: [1, 3, 5, 7].map((i) => line[i]),
  };
}

export const LAYOUTS: Layout[] = [slanted(), medals(), drawers()];
