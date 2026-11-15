import { STREAM } from './config';
import { lengthTo, measure, reachFor, rides, roam, trace, wander, type Branch, type Corner, type Cue, type Dark, type Landing, type Rail, type Route, type Solids } from './route';

// The route through Skills and About, planned from where things are on the page. It is one stream, not two sides.
// It comes in at the top middle, as it leaves Work. It strikes the shade of the desk's lamp and falls on past the
// desk's near end, down the left of the rows. At each row it turns in to strike the thing at the row's left end. It
// strikes the reflector under the last row, which sends it to the right over the whole top of About, falling a
// little. It strikes the studio light, and is thrown down and to the left along the line he drew: in behind his
// portrait at the side of his neck, behind his chest, and out under him, where it falls on toward Contact.
// It sways as it falls, as the stream does everywhere it falls free. The two runs it is thrown along are straight
// because he ruled them so: from the reflector to the studio light, and the studio light's throw.
// All positions are CSS pixels of the page, y down.

export interface Pt { x: number; y: number }

export interface SkillsPlan {
  width: number;
  bottom: number;
  unit: number;
  // How tall the screen is.
  view: number;
  // One unit of the page's board in pixels (src/skills/plan.ts).
  board: number;
  // Where it comes in, across the page, and how far down the page it leaves that line for the lamp. Above that
  // it falls as it left the section before. from is where the section before left it, on a page that has one.
  x: number;
  leaves: number;
  from?: Pt;
  // How far down the page the leading end is when the title comes on.
  title: number;
  // The place on the lamp's shade it strikes, and the way the shade faces there, as an angle.
  lamp: Pt & { face: number };
  // The line it falls down beside the rows.
  spine: number;
  // Where it strikes the thing at the left of each row.
  rows: Pt[];
  // The rows' borders: the rule over the first row, the ones between, and the one under the last. Solid things.
  rules: Rail[];
  // The middle of the reflector's face, and the way it faces.
  reflector: Pt & { face: number };
  // The studio light: where the stream strikes its barrel and the way the barrel faces there, and the middle of its
  // lens, which it leaves from.
  light: { strike: Pt; face: number; lens: Pt };
  // Behind him: where it goes in under his outline, where it is drawn again, and where it comes out under the foot
  // of his portrait. Between the first two it is not drawn at all.
  enter: Pt;
  shows: Pt;
  out: Pt;
}

export function routeThroughSkills(P: SkillsPlan): Route {
  const R = STREAM.route, K = STREAM.skills, u = P.unit, k = P.board, tight = K.corner * u;
  const S: Solids = { boxes: [], posts: [], rails: P.rules };
  const corners: Corner[] = [
    P.from ? [P.from.x, P.from.y, 0, 0] : [P.x, R.start * u, 0, 0],
    [P.x, P.leaves, K.lamp.leave * k, K.lamp.leave * k],
    [P.lamp.x + K.lamp.from[0] * k, P.lamp.y - K.lamp.from[1] * k, K.lamp.bow[0] * k, K.lamp.bow[1] * k],
    [P.lamp.x, P.lamp.y, tight, tight],
    [P.lamp.x - K.lamp.out[0] * k, P.lamp.y + K.lamp.out[1] * k, K.lamp.turn * k, K.lamp.turn * k],
    [P.spine, P.lamp.y + K.lamp.off * k, K.lamp.join[0] * k, K.lamp.join[1] * k],
    ...P.rows.flatMap(({ x, y }): Corner[] => [[P.spine, y - K.row.over * k, K.row.turn[0] * k, K.row.turn[1] * k], [x, y, tight, tight], [P.spine, y + K.row.over * k, K.row.turn[0] * k, K.row.turn[0] * k]]),
    [P.reflector.x, P.reflector.y, tight, tight],
    [P.light.strike.x, P.light.strike.y, tight, tight],
    [P.light.lens.x, P.light.lens.y, tight, tight],
    [P.out.x, P.out.y, K.tail.turn * k, K.tail.turn * k],
    [P.out.x - K.tail.in * k, P.out.y + K.tail.down * k, 0, 0],
  ];
  const drawn = trace(corners);
  // It ends where it has turned to fall again. From there it sways, as a line of its own.
  drawn.length -= 2;
  const narrow = roam(P.width), far = lengthTo(drawn, P.reflector.x, P.reflector.y);
  // No sway at a strike, so that the stream meets the thing where the page has it, and none from the reflector on.
  const still = [...(P.from ? [0] : []), ...[P.lamp, ...P.rows].map((p) => lengthTo(drawn, p.x, p.y))];
  const main = wander(drawn, S, u, 0, 0, narrow, [...still, far], far);
  const ex = main[main.length - 2], ey = main[main.length - 1];
  const tail = wander([ex, ey, P.out.x - K.tail.in * k, P.bottom], S, u, 0, 0, narrow, [0]);
  const line = [...main, ...tail.slice(2)];
  const branches = [measure(line, S, u), measure(line, S, u)] as [Branch, Branch];
  for (const b of branches) b.apart.fill(0);
  rides(branches, S, u);

  const br = branches[0];
  // How far along the route its point nearest a place is, looking only past the last place found.
  let from = 0;
  const find = (p: Pt): number => {
    let best = Infinity, at = from;
    for (let i = Math.round(from / br.step); i < br.n; i++) { const d = Math.hypot(br.x[i] - p.x, br.y[i] - p.y); if (d < best) { best = d; at = i * br.step; } }
    from = at;
    return at;
  };
  const C = K.contact;
  const met = (name: string, p: Pt, face: number, out: number, c: readonly [number, number, number, number], fall?: number): Landing => ({ kind: 'side', name, side: 0, s: find(p), x: p.x, y: p.y, out, face, force: c[0], glow: c[1], arc: c[2], every: c[3], fall: fall === undefined ? undefined : fall * k });
  const lamp = met('lamp', P.lamp, P.lamp.face, 0, C.lamp, K.falls[0]);
  const rows = P.rows.map((p, i) => met(`row${i}`, p, K.rowFace, 1, C.row));
  const reflector = met('reflector', P.reflector, P.reflector.face, 1, C.reflector, K.falls[1]);
  const light = met('light', P.light.strike, P.light.face, 0, C.light, K.falls[2]);
  const lens = find(P.light.lens), enter = find(P.enter), shows = find(P.shows), out = find(P.out);
  const landings = [lamp, ...rows, reflector, light];

  // The two runs it is thrown along: each is covered in a set time, whatever the scroll.
  const haste = new Float32Array(br.n);
  const run = (a: number, b: number, seconds: number) => { for (let i = Math.floor(a / br.step); i <= Math.min(br.n - 1, Math.ceil(b / br.step)); i++) haste[i] = Math.max(haste[i], (b - a) / seconds); };
  run(reflector.s, light.s, K.thrown[0]);
  run(light.s, enter, K.thrown[1]);
  for (const b of branches) b.haste = haste;

  // Thrown by the studio light, the leading end runs ahead of the scroll by a share of the screen's height, as far
  // as under his portrait, and gives it back as it falls on. So the light behind him is up while About is still
  // coming to where it is read, and not after. A height on the page still gives one distance along the route.
  const ahead = K.ahead[0] * P.view, back = K.ahead[1] * k;
  for (const b of branches) {
    let low = -Infinity;
    for (let i = 0; i < b.n; i++) {
      const s = i * b.step, lead = s <= light.s ? 0 : s <= out ? ahead : ahead * Math.max(0, 1 - (s - out) / back);
      low = Math.max(low, b.y[i] - lead);
      b.floor[i] = low;
    }
    // Just above a strike a height on the page gives the strike itself, so the leading end never rests there.
    for (const L of landings) {
      const at = Math.min(b.n - 1, Math.ceil(L.s / b.step) + 1);
      let from = at;
      while (from > 0 && b.floor[at] - b.floor[from - 1] < K.snap * u) from--;
      for (let i = from; i <= at; i++) b.floor[i] = b.floor[from];
    }
  }

  const O = K.over;
  const cues: Cue[] = [
    { name: 'title', s: reachFor(br, P.title), over: O.title },
    { name: 'near', s: Math.max(0, lamp.s - K.near * k), over: O.near },
    { name: 'lamp', s: lamp.s, over: O.lamp },
    ...rows.map((r, i) => ({ name: `row${i}`, s: r.s, over: O.row })),
    { name: 'reflector', s: reflector.s, over: O.reflector },
    { name: 'light', s: light.s, over: O.light },
    { name: 'lens', s: lens, over: O.light },
    { name: 'behind', s: enter, over: O.behind },
    { name: 'under', s: out, over: O.under },
  ];
  const dark: Dark[] = [{ from: light.s + 2 * u, to: lens - 2 * u, core: true }, { from: enter + K.hide * u, to: shows, core: true, ease: [3 * u, K.grow * k] }];
  return { branches, split: br.len + 1e6, join: [Infinity, Infinity], landings, ...S, fins: [], flows: [], fall: K.fall * k, unit: u, cues, dark, soft: K.soft };
}
