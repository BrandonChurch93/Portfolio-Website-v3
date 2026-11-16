import { STREAM } from './config';
import { UP, measure, rides, roam, trace, wander, type Branch, type Corner, type Cue, type Dark, type Landing, type Rail, type Route, type Solids } from './route';

// The route through Contact, planned from where things are on the page. One stream. It comes in where it leaves
// About, under the lower left of his portrait, falls swaying to the Sun stone under the rocket, and lands on the
// stone's outer band at the end nearest the plate. It ends there: the stone takes it.
// It touches nothing else, and what the landing throws comes to rest on the stone.
// The screen is seated for the landing. Everywhere else the leading end is where the scroll has it, two thirds of
// the way down the screen. Here it has to land when the stone's foot is a set distance above the foot of the screen,
// so that the screen holds the title, the whole plate, the rocket and the stone at that moment: the end gets ahead
// of the scroll, or falls behind it, by a little more at each step of its fall, and is at the stone exactly then.
// All positions are CSS pixels of the page, y down.

export interface Pt { x: number; y: number }

export interface ContactPlan {
  width: number;
  unit: number;
  // How tall the screen is.
  view: number;
  // One unit of the page's board in pixels (src/contact/board.ts).
  board: number;
  // Where it comes in, and where on the stone it lands. joined says it comes in from the section before, where
  // it does not sway, so the two meet.
  from: Pt;
  joined?: boolean;
  // Places it passes on its way to the stone, in order, where the page is one column and it falls beside the
  // plate. hidden says nothing of it is drawn before the first of them: it has come down the page unseen from the
  // section it was last seen in, and comes on there.
  via?: Pt[];
  hidden?: boolean;
  land: Pt;
  // How far down the page the foot of the screen is when it lands.
  seat: number;
  // What the landing throws comes to rest on these: lines along the stone's top face. inward is the way most of
  // it is thrown: toward the stone's middle, 1 to the right and -1 to the left.
  rests: Rail[];
  inward?: number;
}

export function routeThroughContact(P: ContactPlan): Route {
  const K = STREAM.pad, u = P.unit, k = P.board;
  const S: Solids = { boxes: [], posts: [], rails: P.rests };
  const via = (P.via ?? []).map((v): Corner => [v.x, v.y, K.turn * k * 0.5, K.turn * k * 0.5]);
  const drawn = trace([[P.from.x, P.from.y, 0, 0], ...via, [P.land.x, P.land.y - K.over * k, K.turn * k, K.turn * k], [P.land.x, P.land.y, 0, 0]]);
  let total = 0;
  for (let i = 2; i < drawn.length; i += 2) total += Math.hypot(drawn[i] - drawn[i - 2], drawn[i + 1] - drawn[i - 1]);
  // No sway where it lands, so that it meets the stone where the page has it.
  const line = wander(drawn, S, u, 0, 0, roam(P.width), [...(P.joined ? [0] : []), total]);
  const branches = [measure(line, S, u), measure(line, S, u)] as [Branch, Branch];
  for (const b of branches) b.apart.fill(0);
  rides(branches, S, u);

  const br = branches[0], end = br.len - br.step;
  const C = K.strike;
  const stone: Landing = { kind: 'land', name: 'stone', side: 0, s: end, x: P.land.x, y: P.land.y, out: P.inward ?? 0, face: UP, force: C[0], glow: C[1], arc: C[2], every: C[3], fall: K.fall * k };

  // A height on the page gives one distance along the route. The end is at the stone when the reading line is
  // where the seat puts it, and the difference is spread over the whole of its fall.
  const lead = P.land.y - (P.seat - (1 - STREAM.anchor) * P.view);
  for (const b of branches) {
    let low = -Infinity;
    for (let i = 0; i < b.n; i++) {
      low = Math.max(low, b.y[i] - lead * (i / Math.max(1, b.n - 1)));
      b.floor[i] = low;
    }
    // Just above the stone a height on the page gives the landing itself, so the leading end never rests there.
    const at = b.n - 1;
    let from = at;
    while (from > 0 && b.floor[at] - b.floor[from - 1] < K.snap * u) from--;
    for (let i = from; i <= at; i++) b.floor[i] = b.floor[from];
  }

  const cues: Cue[] = [{ name: 'land', s: end, over: K.follow }];
  const dark: Dark[] = [{ from: br.len - K.sink * u, to: br.len + 1, core: false }];
  if (P.hidden && P.via?.length) {
    let i = 0;
    while (i < br.n - 1 && br.y[i] < P.via[0].y) i++;
    dark.unshift({ from: -1, to: i * br.step, core: true, ease: [0, K.rise * u], quiet: true });
  }
  return { branches, split: br.len + 1e6, join: [Infinity, Infinity], landings: [stone], ...S, fins: [], flows: [], fall: K.fall * k, unit: u, cues, dark, soft: K.soft };
}
