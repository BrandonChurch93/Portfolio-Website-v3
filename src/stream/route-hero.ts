import { STREAM } from './config';
import { UP, measure, rides, roam, trace, wander, type Branch, type Landing, type Route, type Solids } from './route';

// The route through the hero, planned from where things are on the page. One stream. It comes out of the underside
// of the world's core and falls free, swaying, through what broke away from the world, to Work's bar, which it
// strikes dead center.
// It begins on the page and not above it: until the core's underside has been scrolled up to where the leading end
// is read, nothing of it is drawn, and then it sets off.
// All positions are CSS pixels of the page, y down.

export interface Pt { x: number; y: number }

export interface HeroPlan {
  width: number;
  unit: number;
  // One unit of the page's board in pixels (src/hero/board.ts).
  board: number;
  // The underside of the core, where it begins.
  source: Pt;
  // The middle of the top of Work's bar. On a page that has Work under the hero, where Work's own route takes it.
  bar: Pt;
  // On such a page it does not strike the bar: Work's route does what it does from there.
  joined?: boolean;
}

export function routeThroughHero(P: HeroPlan): Route {
  const K = STREAM.hero, u = P.unit, k = P.board;
  const S: Solids = { boxes: [], posts: [], rails: [] };
  const free = trace([[P.source.x, P.source.y, 0, 0], [P.bar.x, P.bar.y - K.over * k, K.turn * k, K.turn * k], [P.bar.x, P.bar.y, 0, 0]]);
  let total = 0;
  for (let i = 2; i < free.length; i += 2) total += Math.hypot(free[i] - free[i - 2], free[i + 1] - free[i - 1]);
  const line = wander(free, S, u, 0, 0, roam(P.width), [0, total], Infinity, K.straight * k);
  const branches = [measure(line, S, u), measure(line, S, u)] as [Branch, Branch];
  for (const b of branches) b.apart.fill(0);
  rides(branches, S, u);
  const br = branches[0], C = K.strike;
  const bar: Landing = { kind: 'land', name: 'bar', side: 0, s: br.len - br.step, x: P.bar.x, y: P.bar.y, out: 0, face: UP, force: C[0], glow: C[1], arc: C[2], every: C[3], fall: K.fall * k };
  return { branches, split: br.len + 1e6, join: [Infinity, Infinity], landings: P.joined ? [] : [bar], ...S, fins: [], flows: [], fall: K.fall * k, unit: u, cues: [{ name: 'off', s: Math.min(br.len, K.off * k), over: 1 }], dark: [{ from: 0, to: K.hand[0] * k, core: true, ease: [0, (K.hand[1] - K.hand[0]) * k], source: true }] };
}
