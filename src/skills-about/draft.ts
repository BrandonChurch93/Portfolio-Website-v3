import { line, nearest, point, reach, type Line, type Pt } from '../page-sketch/plan';
import { BENCH, FLOOR, put } from './bench';
import { CX, LEAD, TAIL, type Cue } from './plan';

// The fuller draft of Skills and About: his real words in place of the wireframe's grey bars. The words take far
// more room than the bars did, so the places are worked out again here.

// Skills: the title and the headphones over the desk's far end, the desk, and the four rows across the page under it.
export const SKILLS = { title: [820, 170] as Pt, phones: { x: 1168, y: 58 }, rows: { l: 190, r: 1310, t: FLOOR + 64 }, foot: 44 };

// About: Work's rail comes back as the line between the two sections. Its high end is under the last row of skills
// at the left, where the stream comes down, and it slopes down to the right to end over his head. The stream runs it,
// falls off its end behind his portrait, which is what lights him, and comes out under him. The title, the tabs and
// the words hang under the rail's high end, clear of the stream, and his portrait stands beside them, centered on
// them. Everything is measured down from the top of About.
export const ABOUT = {
  h: 790,
  rail: { ax: 116, ay: 16, bx: 1054, by: 146 },
  words: { l: 190, w: 470, title: 167, tabs: 263, text: 334 },
  portrait: { x: 764, y: 172, w: 580, h: 562 },
};

// Where the stream falls beside the rows and beside About's words.
const SPINE = 124;
const NEAR = 170;
// A row comes on when the stream's leading end is level with its name, this far under the row's top.
const NAME = 40;

// pulse is how far along the line a change of tab sends its pulse.
export interface Draft { h: number; skills: number; about: number; line: Line; cues: Cue[]; pulse: number }

// tops is how far under the first row each row starts and tall is how tall the four are together, both read off
// the page, since a row is as tall as its words.
export function draft(tops: number[], tall: number): Draft {
  const skills = LEAD, about = skills + SKILLS.rows.t + tall + SKILLS.foot, h = about + ABOUT.h + TAIL;
  const R = ABOUT.rail, P = ABOUT.portrait;
  const rail = (x: number): Pt => [x, about + R.ay + ((x - R.ax) / (R.bx - R.ax)) * (R.by - R.ay)];
  const on = (along: number): Pt => { const [x, y] = put(along, 0, 0); return [x, skills + y - 2]; };
  const land = on(BENCH.land), off = on(0.012);
  const l = line([
    [CX, 0],
    [land[0], land[1], 6, 14],
    [off[0], off[1], 26],
    [SPINE, off[1] + 190, 90, 3],
    [rail(SPINE)[0], rail(SPINE)[1], 6, 9],
    [rail(R.bx - 4)[0], rail(R.bx - 4)[1], 20],
    [R.bx + 18, about + R.by + 110, 60],
    [R.bx + 18, h, 0, 9],
  ]);
  const cue = (id: string, [x, y]: Pt, back = 0): Cue => ({ id, at: nearest(l, x, y) - back, x, y });
  const level = (id: string, y: number): Cue => { const at = reach(l, y), [x] = point(l, at); return { id, at, x, y }; };
  const behind = level('behind', about + P.y + 130);
  return {
    h, skills, about, line: l, pulse: behind.at + 120,
    cues: [
      level('title', skills + 96),
      cue('near', land, NEAR),
      cue('desk', land),
      ...tops.map((t, i) => level(`row${i}`, skills + SKILLS.rows.t + t + NAME)),
      cue('about', rail(SPINE)),
      cue('words', rail(ABOUT.words.l + 150)),
      cue('portrait', rail(R.bx - 170)),
      behind,
    ],
  };
}
