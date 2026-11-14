import { line, nearest, point, reach, type Line, type Pt } from '../page-sketch/plan';
import { BENCH, FLOOR, put } from './bench';
import { CX, LEAD, TAIL, type Cue } from './plan';

// The fuller draft of Skills and About: his real words in place of the wireframe's grey bars. The words take far
// more room than the bars did, so the places are worked out again here.

// Skills: the title and the headphones over the desk's far end, the desk, and the four rows across the page under it.
export const SKILLS = { title: [820, 170] as Pt, phones: { x: 1168, y: 58 }, rows: { l: 190, r: 1310, t: FLOOR + 64 }, foot: 90 };

// About: the title and the tabs stand on a level bar the stream runs along, the words hang under it, and his
// portrait stands beside them. Two ways for the stream to pass him. beside: the bar is as long as the words, the
// stream falls off its end between the words and him, and he is centered on the words. behind: the bar runs on
// behind his shoulders, which puts him higher than the words, since his shoulders are low in the picture.
// end is where the bar stops, fall where the stream comes down after it, x and top where his portrait is, top
// from the bar.
export type Pass = 'beside' | 'behind';
export const ABOUT = {
  h: 650,
  bar: { y: 290, l: 96 },
  words: { l: 190, w: 470 },
  portrait: { w: 580, h: 562 },
  beside: { end: 692, fall: 722, x: 764, top: -251, glow: [0.42, 40] as Pt },
  behind: { end: 1344, fall: 1360, x: 750, top: -326, glow: [0.5, -10] as Pt },
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
export function draft(tops: number[], tall: number, pass: Pass): Draft {
  const skills = LEAD, about = skills + SKILLS.rows.t + tall + SKILLS.foot, h = about + ABOUT.h + TAIL, bar = about + ABOUT.bar.y;
  const A = ABOUT[pass], P = ABOUT.portrait;
  const on = (along: number): Pt => { const [x, y] = put(along, 0, 0); return [x, skills + y - 2]; };
  const land = on(BENCH.land), off = on(0.012);
  const l = line([
    [CX, 0],
    [land[0], land[1], 6, 14],
    [off[0], off[1], 26],
    [SPINE, off[1] + 190, 90, 3],
    [SPINE, bar, 6, 9],
    [A.end - 2, bar, 24],
    [A.fall, bar + 110, 70],
    [A.fall, h, 0, 11],
  ]);
  const cue = (id: string, [x, y]: Pt, back = 0): Cue => ({ id, at: nearest(l, x, y) - back, x, y });
  const level = (id: string, y: number): Cue => { const at = reach(l, y), [x] = point(l, at); return { id, at, x, y }; };
  const him = pass === 'beside' ? [cue('portrait', [A.end, bar]), level('behind', bar + 90)] : [cue('portrait', [A.x + 60, bar]), cue('behind', [A.x + P.w / 2, bar])];
  return {
    h, skills, about, line: l, pulse: pass === 'beside' ? him[0].at + 60 : him[1].at,
    cues: [
      level('title', skills + 96),
      cue('near', land, NEAR),
      cue('desk', land),
      ...tops.map((t, i) => level(`row${i}`, skills + SKILLS.rows.t + t + NAME)),
      cue('about', [SPINE, bar]),
      cue('words', [ABOUT.words.l + 150, bar]),
      ...him,
    ],
  };
}
