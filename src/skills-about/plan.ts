import { line, nearest, type Line, type Pt } from '../page-sketch/plan';

// A wireframe of Skills and About as a pair, for judging where things sit, where the stream goes and what it brings
// onto the page. Everything is in design units, one unit a CSS pixel on a desktop 1460 wide. Nothing here is the real
// stream, the real desk or a finished look.

export const W = 1460;
export const CX = W / 2;
// Room above Skills for the stream to come in, as it leaves Work's button, and room under About for it to leave.
export const LEAD = 150;
export const TAIL = 150;

export type Rows = 'beside' | 'under';

// The desk as proposed, made new and longer. Its top, from the back left corner round: back left, back right,
// front right, front left. The front edge runs down to the left and is what carries the stream. pc is the face of
// the PC's glass side, standing under the desk's right end.
export interface Desk { top: Pt[]; pc: Pt[]; long: boolean }
export const APRON = 18;
// Beside the rows the desk is as tall, with what stands on and under it, as the rows are. With the rows under it,
// it is as long as they are wide, which is the other way his "length of the desk" can be read.
export const DESKS: Record<Rows, Desk> = {
  beside: { top: [[178, 392], [648, 348], [742, 430], [150, 520]], pc: [[566, 492], [694, 474], [694, 636], [566, 660]], long: false },
  under: { top: [[178, 392], [1216, 295], [1310, 344], [150, 520]], pc: [[1130, 418], [1258, 399], [1258, 532], [1130, 556]], long: true },
};

export const SKILLS = {
  title: { x: 820, y: 170 },
  // The headphones hang from a hook at the right of the title.
  phones: { x: 1168, y: 58 },
  beside: { h: 880, l: 820, r: 1310, t: 300, step: 112 },
  under: { h: 1230, l: 150, r: 1310, t: 800, step: 78 },
};
export const ABOUT = { h: 570, rail: { ax: 116, ay: 70, bx: 1330, by: 329 }, portrait: { x: 760, y: -90, w: 560, h: 543 }, title: { x: 150, y: 300 } };

// The four competencies on his live site, their names and the line under each, as they stand there.
export const SKILL_ROWS: [string, string][] = [
  ['AI Product Engineering', 'AI products that prove their answers.'],
  ['Full-Stack Engineering', 'Frontend led. Full stack shipped.'],
  ['Design Systems & Craft', 'I make products feel inevitable.'],
  ['Product Leadership', 'The role changes. The standard doesn’t.'],
];
export const TABS = ['About me', 'What I want to do', 'My plans for the future'];

// A place on the stream's line where its leading end brings something onto the page.
export interface Cue { id: string; at: number; x: number; y: number }
export interface Plan { h: number; skills: number; about: number; line: Line; cues: Cue[] }

// How far above the desk the stream is when the desk comes out of the dark.
const NEAR = 170;

export function plan(rows: Rows): Plan {
  const skills = LEAD, about = skills + SKILLS[rows].h, h = about + ABOUT.h + TAIL;
  const [, , fr, fl] = DESKS[rows].top, R = ABOUT.rail;
  const edge = (t: number): Pt => [fr[0] + (fl[0] - fr[0]) * t, skills + fr[1] + (fl[1] - fr[1]) * t - 2];
  const rail = (x: number): Pt => [x, about + R.ay + ((x - R.ax) / (R.bx - R.ax)) * (R.by - R.ay)];
  const came = (fr[0] - CX) / (fr[0] - fl[0]), land = edge(came), off = edge(0.995);
  const l = line([
    [CX, 0],
    [land[0], land[1], 6, 12],
    [off[0], off[1], 26],
    [124, skills + 660, 70, 3],
    [rail(130)[0], rail(130)[1], 6, 9],
    [rail(R.bx - 4)[0], rail(R.bx - 4)[1], 34],
    [1356, about + R.by + 80, 80],
    [1356, h, 0, 11],
  ]);
  const cue = (id: string, [x, y]: Pt, back = 0): Cue => ({ id, at: nearest(l, x, y) - back, x, y });
  return {
    h, skills, about, line: l,
    cues: [
      cue('near', land, NEAR),
      cue('desk', land),
      ...[0.2, 0.42, 0.64, 0.86].map((t, i) => cue(`row${i}`, edge(came + (1 - came) * t))),
      cue('about', rail(130)),
      cue('behind', rail(900)),
    ],
  };
}
