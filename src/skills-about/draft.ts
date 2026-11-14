import { line, nearest, point, reach, type Corner, type Line, type Pt } from '../page-sketch/plan';
import { BENCH, FLOOR, LAMP, put } from './bench';
import { CX, LEAD, TAIL, type Cue } from './plan';

// The fuller draft of Skills and About: his real words in place of the wireframe's grey bars. The words take far
// more room than the bars did, so the places are worked out again here.

// Skills: the title and the headphones over the desk's far end, the desk, and the four rows across the page under it.
export const SKILLS = { title: [820, 170] as Pt, phones: { x: 1168, y: 58 }, rows: { l: 190, r: 1310, t: FLOOR + 64 }, foot: 44 };

// How the stream meets the desk. lamp: it strikes the lamp's shade and falls on past the desk's near end, touching
// nothing else. edge: it lands on the front edge and runs it to the near end, which he found took the eye from the
// scene.
export type DeskRoute = 'lamp' | 'edge';

// About: the stream stays off his head and off the words, and strikes two things. first is under the last row of
// skills at the left, where the stream comes down, and sends it to the right at a gentle grade, over the top of
// About. The second, a studio light up and to the right of his portrait, throws it down at a steep angle to go in
// behind his own left shoulder, which is at the right of the picture, half way along the trapezius. It crosses
// behind his chest on that line and comes out under him. The light behind him is thrown by the studio light. The
// title, the tabs and the words hang under the first run. enter is where it goes in, as shares of his portrait.
// Angles are in degrees under level, and everything is measured down from the top of About.
export const ABOUT = {
  first: { x: 124, y: 40, grade: 4 },
  enter: { fx: 0.722, fy: 0.54, angle: 64 },
  words: { l: 190, w: 470, title: 167, tabs: 263, text: 334 },
};

// Two ways his portrait stands. beside: a figure beside the words. back: large, blended into the ground behind the
// section, as it was in the first derby's third look, which he asked to see again.
export type Look = 'beside' | 'back';
export const LOOKS: Record<Look, { h: number; lean: number; portrait: { x: number; y: number; w: number; h: number } }> = {
  beside: { h: 790, lean: 14, portrait: { x: 764, y: 172, w: 580, h: 562 } },
  back: { h: 1010, lean: 40, portrait: { x: 500, y: 100, w: 900, h: 873 } },
};

const RAD = Math.PI / 180;
// Places are kept to a hundredth of a unit, so the page the server draws and the page the browser draws agree.
const fix = (v: number) => Math.round(v * 100) / 100;
const GRADE = Math.tan(ABOUT.first.grade * RAD), LEAN = 1 / Math.tan(ABOUT.enter.angle * RAD);

// How high the first run is over a place under it.
export const runAt = (x: number) => ABOUT.first.y + (x - ABOUT.first.x) * GRADE;
// The two strikes, where the stream goes in behind him, and the way it is thrown, which is down and to the left.
// The studio light stands where the gentle run from the first meets the steep line down to his shoulder.
export function turns(look: Look) {
  const P = LOOKS[look].portrait;
  const enter: Pt = [fix(P.x + P.w * ABOUT.enter.fx), fix(P.y + P.h * ABOUT.enter.fy)];
  const x = fix((enter[0] + (enter[1] - ABOUT.first.y + ABOUT.first.x * GRADE) * LEAN) / (1 + GRADE * LEAN));
  return {
    first: [ABOUT.first.x, ABOUT.first.y] as Pt,
    second: [x, fix(runAt(x))] as Pt,
    enter,
    along: [-Math.cos(ABOUT.enter.angle * RAD), Math.sin(ABOUT.enter.angle * RAD)] as Pt,
  };
}

// Where the stream falls beside the rows.
const SPINE = ABOUT.first.x;
const NEAR = 170;
// A row comes on when the stream's leading end is level with its name, this far under the row's top.
const NAME = 40;
// How far under his portrait the stream is still on its line through him.
const UNDER = 16;

// pulse is how far along the line a change of tab sends its pulse.
export interface Draft { h: number; skills: number; about: number; line: Line; cues: Cue[]; pulse: number }

// tops is how far under the first row each row starts and tall is how tall the four are together, both read off
// the page, since a row is as tall as its words.
export function draft(tops: number[], tall: number, desk: DeskRoute, look: Look): Draft {
  const skills = LEAD, about = skills + SKILLS.rows.t + tall + SKILLS.foot, h = about + LOOKS[look].h + TAIL;
  const P = LOOKS[look].portrait, { first, second, enter, along } = turns(look);
  const on = (a: number, up = 0, back = 0): Pt => { const [x, y] = put(a, up, back); return [x, skills + y - 2]; };
  const land = desk === 'lamp' ? on(...LAMP) : on(BENCH.land), off = on(0.012);
  const through = (P.y + P.h + UNDER - enter[1]) / along[1];
  const out: Pt = [enter[0] + along[0] * through, about + enter[1] + along[1] * through];
  const meets: Corner[] = desk === 'lamp'
    ? [[land[0] + 34, land[1] - 150, 130, 6], [land[0], land[1], 5, 3], [SPINE, land[1] + 110, 70, 4]]
    : [[land[0], land[1], 6, 14], [off[0], off[1], 26], [SPINE, off[1] + 190, 90, 3]];
  const l = line([
    [CX, 0],
    ...meets,
    [first[0], about + first[1], 5, 3],
    [second[0], about + second[1], 5],
    [out[0], out[1], 70],
    [out[0] - 44, h, 0, 9],
  ]);
  const cue = (id: string, [x, y]: Pt, back = 0): Cue => ({ id, at: nearest(l, x, y) - back, x, y });
  const level = (id: string, y: number): Cue => { const at = reach(l, y), [x] = point(l, at); return { id, at, x, y }; };
  const run = (x: number): Pt => [x, about + runAt(x)];
  const behind = cue('behind', [enter[0], about + enter[1]]);
  return {
    h, skills, about, line: l, pulse: behind.at + 150,
    cues: [
      level('title', skills + 96),
      cue('near', land, NEAR),
      cue('desk', land),
      ...tops.map((t, i) => level(`row${i}`, skills + SKILLS.rows.t + t + NAME)),
      cue('about', [first[0], about + first[1]]),
      cue('words', run(ABOUT.words.l + 150)),
      cue('portrait', run(ABOUT.words.l + 330)),
      cue('throw', [second[0], about + second[1]]),
      behind,
    ],
  };
}
