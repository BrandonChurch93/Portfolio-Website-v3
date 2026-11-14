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
// About. The second, a studio light up and to the right of his portrait, throws it down and to the left along the
// line he drew: close by his jaw, in at the side of his neck over his own left shoulder, behind the whole of his
// chest, and out at the lower left of his portrait. The light behind him is thrown by the studio light. The title,
// the tabs and the words hang under the first run. enter is how far down his portrait the stream goes in behind him.
// Angles are in degrees under level, and everything is measured down from the top of About.
// His portrait is the ground of the section: large, blended into the page, with the words over its faded left
// side and centered on him top to bottom. lean is how far it moves with the cursor, and light is how far across the
// page the studio light stands.
export const ABOUT = {
  h: 1010,
  lean: 40,
  light: 1366,
  first: { x: 124, y: 40, grade: 4 },
  enter: { fy: 0.47, angle: 52 },
  words: { l: 190, w: 470, title: 262, tabs: 358, text: 429 },
  portrait: { x: 500, y: 100, w: 900, h: 873 },
};

const RAD = Math.PI / 180;
// Places are kept to a hundredth of a unit, so the page the server draws and the page the browser draws agree.
const fix = (v: number) => Math.round(v * 100) / 100;
const GRADE = Math.tan(ABOUT.first.grade * RAD), LEAN = 1 / Math.tan(ABOUT.enter.angle * RAD);

// How high the first run is over a place under it.
export const runAt = (x: number) => ABOUT.first.y + (x - ABOUT.first.x) * GRADE;
// The two strikes, where the stream goes in behind him, and the way it is thrown, which is down and to the left.
export function turns() {
  const { portrait: P, light } = ABOUT;
  const second: Pt = [light, fix(runAt(light))], y = fix(P.y + P.h * ABOUT.enter.fy);
  return {
    first: [ABOUT.first.x, ABOUT.first.y] as Pt,
    second,
    enter: [fix(second[0] - (y - second[1]) * LEAN), y] as Pt,
    along: [-Math.cos(ABOUT.enter.angle * RAD), Math.sin(ABOUT.enter.angle * RAD)] as Pt,
  };
}

// Where the stream falls beside the rows.
const SPINE = ABOUT.first.x;
const NEAR = 170;
// At each row the stream turns in this far past the rows' left edge to strike the small thing that stands there,
// from this far above and below it.
const TURN = { past: 4, over: 62 };
// How far under his portrait the stream is still on its line through him.
const UNDER = 16;

// pulse is how far along the line a change of tab sends its pulse.
export interface Draft { h: number; skills: number; about: number; line: Line; cues: Cue[]; pulse: number }

// tops is how far under the first row each row starts and tall is how tall the four are together, both read off
// the page, since a row is as tall as its words.
export function draft(tops: number[], tall: number, desk: DeskRoute): Draft {
  const skills = LEAD, about = skills + SKILLS.rows.t + tall + SKILLS.foot, h = about + ABOUT.h + TAIL;
  const P = ABOUT.portrait, { first, second, enter, along } = turns();
  const on = (a: number, up = 0, back = 0): Pt => { const [x, y] = put(a, up, back); return [x, skills + y - 2]; };
  const land = desk === 'lamp' ? on(...LAMP) : on(BENCH.land), off = on(0.012);
  const through = (P.y + P.h + UNDER - enter[1]) / along[1];
  const out: Pt = [enter[0] + along[0] * through, about + enter[1] + along[1] * through];
  const meets: Corner[] = desk === 'lamp'
    ? [[land[0] + 34, land[1] - 150, 130, 6], [land[0], land[1], 5, 3], [SPINE, land[1] + 110, 70, 4]]
    : [[land[0], land[1], 6, 14], [off[0], off[1], 26], [SPINE, off[1] + 190, 90, 3]];
  // A row is as tall as its words, and the stream strikes it half way down.
  const strikes = tops.map((t, i): Pt => [SKILLS.rows.l - TURN.past, skills + SKILLS.rows.t + (t + (tops[i + 1] ?? tall)) / 2]);
  const l = line([
    [CX, 0],
    ...meets,
    ...strikes.flatMap(([x, y]): Corner[] => [[SPINE, y - TURN.over, 22, 3], [x, y, 5], [SPINE, y + TURN.over, 22]]),
    [first[0], about + first[1], 5, 3],
    [second[0], about + second[1], 5],
    [out[0], out[1], 70],
    [out[0] - 44, h, 0, 9],
  ]);
  const cue = (id: string, [x, y]: Pt, back = 0): Cue => ({ id, at: nearest(l, x, y) - back, x, y });
  const level = (id: string, y: number): Cue => { const at = reach(l, y), [x] = point(l, at); return { id, at, x, y }; };
  const behind = cue('behind', [enter[0], about + enter[1]]);
  return {
    h, skills, about, line: l, pulse: behind.at + 150,
    cues: [
      level('title', skills + 96),
      cue('near', land, NEAR),
      cue('desk', land),
      ...strikes.map((at, i) => cue(`row${i}`, at)),
      cue('about', [first[0], about + first[1]]),
      cue('throw', [second[0], about + second[1]]),
      behind,
    ],
  };
}
