import { line, nearest, point, reach, type Line, type Pt } from '../page-sketch/plan';
import { ABOUT, CX, DESKS, LEAD, TAIL, type Cue, type Rows } from './plan';

// The fuller draft of Skills and About: the same pair as the wireframe, with his real words in place of grey bars.
// The words take more room than the bars did, so the places are worked out again here.

// How far the desk is moved down so it stands against the words beside it, where the title and the headphones are,
// and where the four rows of skills start and how far apart they are.
export const LAYOUT: Record<Rows, { h: number; drop: number; title: Pt; phones: { x: number; y: number }; l: number; r: number; t: number; step: number }> = {
  beside: { h: 1500, drop: 280, title: [820, 170], phones: { x: 1168, y: 58 }, l: 820, r: 1310, t: 262, step: 292 },
  under: { h: 1530, drop: 0, title: [820, 170], phones: { x: 1168, y: 58 }, l: 190, r: 1310, t: 810, step: 152 },
};

export interface Draft { h: number; skills: number; about: number; line: Line; cues: Cue[] }

const NEAR = 170;
// A row comes on when the stream's leading end is level with its name, this far under the row's top.
const NAME = 40;
// The words of About run longer than the wireframe's bars did.
export const ABOUT_H = 730;

export function draft(rows: Rows): Draft {
  const L = LAYOUT[rows], skills = LEAD, about = skills + L.h, h = about + ABOUT_H + TAIL;
  const [, , fr, fl] = DESKS[rows].top, R = ABOUT.rail, top = skills + L.drop;
  const edge = (t: number): Pt => [fr[0] + (fl[0] - fr[0]) * t, top + fr[1] + (fl[1] - fr[1]) * t - 2];
  const rail = (x: number): Pt => [x, about + R.ay + ((x - R.ax) / (R.bx - R.ax)) * (R.by - R.ay)];
  const came = (fr[0] - CX) / (fr[0] - fl[0]), land = edge(came), off = edge(0.995);
  const l = line([
    [CX, 0],
    [land[0], land[1], 6, 14],
    [off[0], off[1], 26],
    [124, off[1] + 150, 70, 3],
    [rail(130)[0], rail(130)[1], 6, 9],
    [rail(R.bx - 4)[0], rail(R.bx - 4)[1], 34],
    [1356, about + R.by + 80, 80],
    [1356, h, 0, 11],
  ]);
  const cue = (id: string, [x, y]: Pt, back = 0): Cue => ({ id, at: nearest(l, x, y) - back, x, y });
  const level = (id: string, y: number): Cue => { const at = reach(l, y), [x] = point(l, at); return { id, at, x, y }; };
  return {
    h, skills, about, line: l,
    cues: [
      cue('title', [CX, skills + 96]),
      cue('near', land, NEAR),
      cue('desk', land),
      ...[0, 1, 2, 3].map((i) => level(`row${i}`, skills + L.t + i * L.step + NAME)),
      cue('about', rail(130)),
      cue('behind', rail(900)),
    ],
  };
}
