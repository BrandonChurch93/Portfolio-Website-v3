import { registry, stats } from '../hooks/registry';
import { lamp } from '../lamp/lamp';
import { signedDistance } from '../metal/edt';
import { CARD } from '../metal/mask';
import { plates } from '../metal/renderer';
import { clock } from '../world/clock';
import { tiers } from '../world/tier';
import { STREAM, STREAM_BUDGET, STREAM_STEP, unitFor, type StreamBudget } from './config';
import { hash, seeded } from './rand';
import { CORE_FLOATS, INSTANCE_FLOATS, KINDS, LAYERS, STREAK_FLOATS, StreamRenderer, type Bar, type CardShape, type Frame, type PlateCard, type PostShape, type RailShape, type TitleField } from './renderer';
import { along, at, bladeFor, buildRoute, railFrame, riddenAt, routeThroughWork, UP, type Box, type Route } from './route';
import { CORE_HALF, SWELLS } from './shaders';
import { buildShards, facetKind, FIRST_KINDS, type Look } from './shards';
import { FORK_FLOATS, LOOSE_FLOATS, SPARK_FLOATS, StreamSim } from './sim';
import type { State, Swap } from './surge';

// Puts the stream on a page. It reads where things are on the page, plans the route round them, and each frame
// places every shard, steps what flies, and draws. The canvas rides with the page, a little taller than the screen,
// so what it draws stays locked to the page however fast the page is scrolled.
// Given a title and a card it runs the test shot's route. Given the Work section it runs the route through Work.

export interface StreamHandle {
  // Swap between the facets and the first round's shards, where it stands.
  setLook(look: Look): void;
  dispose(): void;
}

// The Work section's parts, as they are on the page. A post or the rail that is not shown is left out of the route.
// rows are the rows of cards, top to bottom. sets holds the cards by category, sets[category][place], the places
// going by rows with the left one first. Only one category's cards show at a time, and swap says which, and what is
// happening while they change (surge.ts). A card is a lit plate of its own (src/components/WorkCard.tsx): the stream
// meets it and lights it, and does not draw it.
export interface WorkParts {
  bar: HTMLElement;
  rows: HTMLElement[];
  sets: HTMLElement[][];
  swap: Swap;
  posts: HTMLElement[];
  rail: HTMLElement;
  button: HTMLElement;
}

interface Options {
  title: HTMLElement;
  card?: HTMLElement;
  work?: WorkParts;
  // Open with the frame held: nothing moves but the cursor's light. The test shot only.
  hold?: boolean;
  look?: Look;
}

const S = STREAM;
const HOLD_TIME = 20;
const STILL_TIME = 20;
const TAU = Math.PI * 2;
const tmp = new Float32Array(4);
// How much of its full size a thrown shard has: it grows as it is thrown and shrinks away over the end of its life.
const thrownShare = (age: number, life: number) => Math.min(1, age / 0.07) * Math.min(1, (life - age) / (life * S.loose.fade));

interface Riders {
  n: number;
  branch: Uint8Array;
  clear: Uint8Array;
  kind: Uint8Array;
  // at, pace, orbit radius, phase, sway rate, sway phase, size, spin rate, spin phase, then its spin axis, its starting turn and its own number
  f: Float32Array;
}
const RIDER = 17;

// A project card on the page: its plate, the element the pointer turns, where it stands when it is seated, and
// what the plate renderer has said of it so far.
interface Card {
  host: Element;
  turned: HTMLElement;
  // Which category's it is, which of the four places it stands in, and that place's row.
  cat: number;
  slot: number;
  row: number;
  // Seated: its left edge, how far below its row's top it starts, its width and its own height, and its corners.
  l: number;
  off: number;
  w: number;
  h: number;
  r: number;
  // Where it is this frame.
  shape: CardShape;
  inset: number;
  deep: number;         // how far off the eye is taken to be, for the turn
  baked: number;
  bake: string;
  win: [number, number, number, number];
  frame: number;
  rim: number;
  scale: number;
  // Frames left in which its size on the page is still read: it goes on growing or shrinking a moment after the
  // pointer has come or gone.
  watch: number;
  // The landings that are on its place.
  landings: number[];
}
// One side's stops, as distances along it: where it rests on the bar, where it lands on the first row's card and
// where it leaves that card's top, the stone, the point on the second row's card, the rail, and where the two sides
// meet. die is how far up from the bar a surge running up toward the title gets. Each stop that is a landing has
// its number.
interface Side { bar: number; top: number; lip: number; stone: number; side: number; rail: number; meet: number; die: number; hit: Record<string, number> }
const FLAT: Float32Array = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
// A card turned by its page: about x, then about y, grown, and seen from deep off. By columns.
function turnOf(ax: number, ay: number, grown: number, deep: number): Float32Array {
  const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay);
  return new Float32Array([grown * cb, grown * sa * sb, (grown * sb * ca) / deep, 0, grown * ca, (-grown * sa) / deep, 0, 0, 1]);
}

function makeRiders(route: Route, budget: StreamBudget, look: Look): Riders {
  const r = seeded(S.seed * 131 + 5), u = route.unit, K = S.shards, sizes = S.sizes[look];
  const counts = route.branches.map((b) => Math.round((budget.per100 * b.rideLen) / (100 * u)));
  const n = counts[0] + counts[1];
  const out: Riders = { n, branch: new Uint8Array(n), clear: new Uint8Array(n), kind: new Uint8Array(n), f: new Float32Array(n * RIDER) };
  for (let i = 0; i < n; i++) {
    const o = i * RIDER, clear = r() < K.clear;
    out.branch[i] = i < counts[0] ? 0 : 1;
    out.clear[i] = clear ? 1 : 0;
    const pick = r();
    // Many small, a few large enough to show every face.
    const big = r() ** 3.4;
    out.kind[i] = look === 'first' ? Math.floor(pick * FIRST_KINDS) : facetKind(big, pick);
    const q = [r() - 0.5, r() - 0.5, r() - 0.5, r() - 0.5], ql = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    const a = [r() - 0.5, r() - 0.5, r() - 0.5], al = Math.hypot(a[0], a[1], a[2]) || 1;
    out.f.set([
      // Each belongs to one of three bands that wind round the core like the strands of a rope, so the sheath has
      // an order to it and never reads as a cloud of loose parts.
      r(), 0.7 + 0.65 * r(), (K.near + (K.far - K.near) * r() ** 2.1) * u, (Math.floor(r() * 3) * TAU) / 3 + (r() + r() - 1) * 0.55, 0.3 + 0.7 * r(), r() * TAU,
      (sizes[0] + (sizes[1] - sizes[0]) * big) * u * (clear && look === 'first' ? 1.12 : 1), (0.25 + 0.95 * r()) * (r() < 0.5 ? -1 : 1), r() * TAU,
      a[0] / al, a[1] / al, a[2] / al, q[0] / ql, q[1] / ql, q[2] / ql, q[3] / ql, r(),
    ], o);
  }
  return out;
}

// The title's letters as a field of distances, drawn the way the page draws them, so the stream can light any heading.
function titleField(el: HTMLElement, host: DOMRect, dpr: number): { field: TitleField; ink: Box } | null {
  const cs = getComputedStyle(el), box = el.getBoundingClientRect();
  const pad = 30;
  const w = Math.ceil((box.width + pad * 2) * dpr), h = Math.ceil((box.height + pad * 2) * dpr);
  if (w < 4 || h < 4 || w * h > 6e6) return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  const size = parseFloat(cs.fontSize);
  g.font = `${cs.fontStyle} ${cs.fontWeight} ${size * dpr}px ${cs.fontFamily}`;
  g.fillStyle = '#fff';
  g.textBaseline = 'alphabetic';
  let text = el.textContent ?? '';
  if (cs.textTransform === 'uppercase') text = text.toUpperCase();
  const m = g.measureText(text);
  const line = (cs.lineHeight === 'normal' ? size * 1.2 : parseFloat(cs.lineHeight)) * dpr;
  const rise = m.fontBoundingBoxAscent, drop = m.fontBoundingBoxDescent;
  const base = (pad + parseFloat(cs.paddingTop)) * dpr + (line - (rise + drop)) / 2 + rise;
  const gap = (parseFloat(cs.letterSpacing) || 0) * dpr;
  let x = (pad + parseFloat(cs.paddingLeft)) * dpr;
  for (const ch of text) { g.fillText(ch, x, base); x += g.measureText(ch).width + gap; }
  const px = g.getImageData(0, 0, w, h).data;
  const cover = new Uint8Array(w * h);
  let l = w, t = h, r = 0, b = 0;
  for (let i = 0; i < w * h; i++) {
    const v = px[i * 4 + 3];
    cover[i] = v;
    if (v > 24) { const cx = i % w, cy = (i / w) | 0; if (cx < l) l = cx; if (cx > r) r = cx; if (cy < t) t = cy; if (cy > b) b = cy; }
  }
  if (r <= l) return null;
  const dist = signedDistance(cover, w, h, 255);
  const fine = 6, out = 150, inn = 10;
  const data = new Uint8Array(w * h * 2);
  for (let i = 0; i < w * h; i++) {
    data[i * 2] = Math.max(0, Math.min(255, Math.round((dist[i] / fine) * 127.5 + 127.5)));
    data[i * 2 + 1] = Math.max(0, Math.min(255, Math.round(((Math.max(-inn, Math.min(out, dist[i])) + inn) / (out + inn)) * 255)));
  }
  const ox = box.left - host.left - pad, oy = box.top - host.top - pad;
  return {
    field: { data, w, h, rect: [ox, oy, w / dpr, h / dpr], range: [fine, out, inn] },
    ink: { l: ox + l / dpr, t: oy + t / dpr, r: ox + (r + 1) / dpr, b: oy + (b + 1) / dpr },
  };
}

export function mountStream(host: HTMLElement, opts: Options): StreamHandle {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = `position:absolute;left:0;top:0;width:100%;height:calc(100vh + ${S.margin * 2}px);height:calc(100lvh + ${S.margin * 2}px);pointer-events:none;will-change:transform;z-index:3`;
  host.appendChild(canvas);
  const meshes = buildShards(S.seed);
  let renderer: StreamRenderer | null = new StreamRenderer(canvas, meshes);
  let look: Look = opts.look ?? 'facets';
  let route: Route | null = null;
  let sim: StreamSim | null = null;
  let riders: Riders | null = null;
  let budget: StreamBudget = STREAM_BUDGET.high;
  let built = '';
  let still = false;
  let unit = 1, presence = 1;
  let hostTop = 0, hostH = 1, cssW = 1, cssH = 1;
  let core = new Float32Array(0), streaks = new Float32Array(0), shards = new Float32Array(0), scratch = new Float32Array(0);
  let keys = new Uint8Array(0);
  const lots = new Int32Array(LAYERS * KINDS * 2);
  let lastLine = 0, settled = '', spent = 0;
  let heldLine: number | null = null;
  let buttonPlate: Element | null = null;
  let cards: Card[] = [];
  // The cards by category and place, and each row of them as planned: its top and its height.
  let table: (Card | null)[][] = [];
  let rows: { top: number; tall: number }[] = [];
  let sides: (Side | null)[] = [null, null];
  // What the stream draws that can move when a row changes height or the bar is knocked, as it was planned.
  let base: { reliefs: CardShape[]; posts: PostShape[]; rails: RailShape[]; bars: Bar[] } | null = null;
  // How much taller each row is this frame than it was planned, what the swap says is happening, and the last of
  // its strikes handed to the simulation.
  let grown: number[] = [];
  let warped = false;
  let Z: State | null = null;
  let handed = -1;
  // This frame: whether a change of category is moving the line, and whether anything is carried with the page or
  // with a card.
  let surging = false;
  let carried = false;
  const swells: [Float32Array, Float32Array] = [new Float32Array(SWELLS * 3), new Float32Array(SWELLS * 3)];
  // The cards the pointer has turned or grown this frame: what lies on one of them goes with it.
  const bent: { c: Card; m: Float32Array }[] = [];
  let version = 0;
  // For a close still: the most device pixels the canvas may draw to a CSS pixel, in place of the budget's.
  let sharp = 0;
  // The landing on each stone, in the order the stones are drawn.
  let stones: number[] = [];
  let touch: { x: number; y: number } | null = null;
  let script: { y0: number; y1: number; t0: number; t1: number } | null = null;
  let disposed = false;

  const lineAt = (top: number) => top + S.anchor * clock.view.h;

  const build = () => {
    if (!renderer || !renderer.ok || disposed) return;
    const tier = tiers.get();
    clock.readView();
    const hr = host.getBoundingClientRect();
    const w = Math.max(1, hr.width), h = Math.max(1, canvas.getBoundingClientRect().height);
    // A change of category changes how tall the rows are and nothing else, and the route is not planned again for
    // it: the stream is carried with the rows (warp, below). So the rows are left out of the page's height here,
    // and what would change the cards themselves, the width of the page, is already in the key.
    const rowsTall = opts.work ? opts.work.rows.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0) : 0;
    const layersTall = opts.work ? opts.work.sets.reduce((sum, set) => sum + set.reduce((n, el) => n + el.offsetHeight, 0), 0) : 0;
    const key = `${tier}:${Math.round(w)}:${Math.round(h)}:${Math.round(hr.height - rowsTall)}:${layersTall}:${version}`;
    if (key === built) return;
    built = key;
    still = tier === 'static';
    budget = STREAM_BUDGET[tier === 'static' ? 'mid' : tier];
    cssW = w;
    cssH = Math.min(h, hr.height);
    hostH = hr.height;
    hostTop = hr.top + scrollY;
    unit = unitFor(innerWidth, parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
    presence = Math.max(0, Math.min(1, (innerWidth - S.presence[0]) / (S.presence[1] - S.presence[0])));
    const want = Math.min(devicePixelRatio || 1, sharp || budget.pixelRatio);
    const dpr = Math.min(want, Math.sqrt((sharp ? 3.2e7 : budget.pixels) / (cssW * cssH)));
    const made = titleField(opts.title, hr, dpr);
    const boxOf = (el: HTMLElement): Box => { const r = el.getBoundingClientRect(); return { l: r.left - hr.left, t: r.top - hr.top, r: r.right - hr.left, b: r.bottom - hr.top }; };
    const shapeOf = (el: HTMLElement): CardShape => { const b = boxOf(el); return { x: (b.l + b.r) / 2, y: (b.t + b.b) / 2, hw: (b.r - b.l) / 2, hh: (b.b - b.t) / 2, r: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0 }; };
    const shown = (el: HTMLElement) => el.getClientRects().length > 0;
    const ink: Box = made ? made.ink : boxOf(opts.title);
    const cardBox: Box = opts.card ? boxOf(opts.card) : ink;
    const bottom = hostH + 260 * unit;
    const W = opts.work;
    cards = []; table = []; rows = []; sides = [null, null]; base = null; grown = []; handed = -1;
    if (W) {
      const posts = W.posts.filter(shown).map((el) => { const b = boxOf(el); return { x: (b.l + b.r) / 2, y: (b.t + b.b) / 2, r: (b.r - b.l) / 2 }; });
      rows = W.rows.map((el) => { const b = boxOf(el); return { top: b.t, tall: b.b - b.t }; });
      const rowLeft = W.rows.map((el) => boxOf(el).l);
      // Every card of every category, where it stands when it is seated. A card that is waiting is laid out at the
      // top of its row like the one that shows, and is measured from the layout, not from where it is drawn.
      table = W.sets.map((set, cat) => set.map((el, slot) => {
        const plate = el.querySelector('[data-kind="card"]'), layer = el.offsetParent as HTMLElement | null, row = Math.min(rows.length - 1, Math.floor(slot / 2));
        if (!plate || !plate.parentElement || !layer) return null;
        const k = el.offsetWidth / CARD.width;
        const c: Card = {
          host: plate, turned: plate.parentElement, cat, slot, row, l: rowLeft[row] + layer.offsetLeft + el.offsetLeft, off: layer.offsetTop + el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, r: CARD.radius * k,
          shape: { x: 0, y: 0, hw: 0, hh: 0, r: 0 }, inset: 1.5 * k, deep: parseFloat(getComputedStyle(el).perspective) || 1e6, baked: -1, bake: '', win: [0, 0, 1, 1], frame: 0, rim: 0, scale: 1, watch: 0, landings: [],
        };
        cards.push(c);
        return c;
      }));
      // The route is planned round the cards that stand in the four places now. A card's metal begins a little
      // inside its box, and its rim's crest a little inside that: that is the edge the stream meets.
      const showing = W.swap.at(clock.now()).cards.filter((c) => !c.leaving);
      const places = W.sets[0].map((el, slot) => {
        const c = table[showing.find((k) => k.slot === slot)?.cat ?? 0]?.[slot];
        if (!c) return boxOf(el);
        const seat = c.inset + S.work.seat * (c.w / CARD.width), t = rows[c.row].top + c.off;
        return { l: c.l + seat, t: t + seat, r: c.l + c.w - seat, b: t + c.h - seat };
      });
      const barBox = boxOf(W.bar);
      route = routeThroughWork({ title: ink, bar: barBox, cards: places, posts, rail: shown(W.rail) ? boxOf(W.rail) : null, button: shown(W.button) ? boxOf(W.button) : null, width: w, bottom, unit });
      const landed = places.map((box) => route!.landings.flatMap((L, i) => ((L.kind === 'land' || L.kind === 'side') && Math.hypot(Math.max(box.l - L.x, 0, L.x - box.r), Math.max(box.t - L.y, 0, L.y - box.b)) < 10 * unit ? [i] : [])));
      for (const c of cards) c.landings = landed[c.slot];
      // Each side's stops, for the surge. Only the full route has them.
      const meet = route.landings.findIndex((L) => L.kind === 'meet');
      sides = [0, 1].map((b) => {
        const own = route!.landings.map((L, i) => ({ L, i })).filter(({ L }) => L.side === b && L.kind !== 'strike' && L.kind !== 'meet');
        const lands = own.filter((o) => o.L.kind === 'land'), post = own.find((o) => o.L.kind === 'post'), flank = own.find((o) => o.L.kind === 'side'), rail = own.find((o) => o.L.kind === 'rail');
        if (lands.length < 2 || !post || !flank || !rail || meet < 0 || route!.join[b] === Infinity) return null;
        const br = route!.branches[b];
        let k = Math.round(lands[1].L.s / br.step);
        while (k < br.n - 1 && br.y[k] < places[b].t + 14 * unit) k++;
        let up = Math.round(lands[0].L.s / br.step);
        while (up > 0 && br.y[up] > ink.b) up--;
        return { bar: lands[0].L.s, top: lands[1].L.s, lip: k * br.step, stone: post.L.s, side: flank.L.s, rail: rail.L.s, meet: route!.join[b], die: up * br.step, hit: { bar: lands[0].i, top: lands[1].i, stone: post.i, side: flank.i, rail: rail.i, meet } };
      });
      const [A, B] = sides;
      const share = (a: Side, s: number) => (s - a.bar) / (a.meet - a.bar);
      W.swap.bind(A && B ? {
        bar: [route.landings[A.hit.bar].x + hr.left, route.landings[B.hit.bar].x + hr.left], width: barBox.r - barBox.l,
        at: [A, B].map((a) => [share(a, a.top), share(a, a.stone), share(a, a.side - S.change.ahead * unit), share(a, a.rail)]) as [number[], number[]],
        reached: () => !!sim && !still && (sim.head[0] >= A.bar || sim.head[1] >= B.bar),
      } : null);
      // The two halves of the rail are one drawing in a mirror: the same marks, a blade on the outer end, a cap on the
      // inner one, and two brackets under each.
      const K = S.work.keel;
      const drawn = route.rails.map((r, i) => { const long = railFrame(r).len / r.half; return { ...r, own: 1.3, blade: bladeFor(route!.posts[i].r * 2, r.half), ends: [1, 0] as [number, number], keel: [K.at[0] * long, K.at[1] * long, K.size] as [number, number, number] }; });
      base = { reliefs: [shapeOf(W.bar)], posts: route.posts.map((o, i) => ({ ...o, own: i ? -1 : 1 })), rails: drawn, bars: [...route.rails, ...route.fins] };
      renderer.configure(budget, { cards: base.reliefs.length + places.length, posts: route.posts.length, rails: base.bars.length, plates: cards.length, drawn: drawn.length, swell: !!(A && B) }, route.join[0] < Infinity);
      renderer.resize(Math.round(cssW * dpr), Math.round(cssH * dpr), dpr);
      renderer.setRelief(made ? made.field : null, base.reliefs, base.posts, base.rails, [], base.bars);
      stones = route.landings.flatMap((L, i) => (L.kind === 'post' ? [i] : []));
      buttonPlate = route.join[0] < Infinity ? W.button.querySelector('[data-kind]') : null;
    } else {
      route = buildRoute(ink, cardBox, w, bottom, unit);
      renderer.configure(budget);
      renderer.resize(Math.round(cssW * dpr), Math.round(cssH * dpr), dpr);
      renderer.setRelief(made ? made.field : null, opts.card ? [shapeOf(opts.card)] : []);
    }
    populate();
    const points = route.branches[0].n + route.branches[1].n + 8;
    core = new Float32Array(points * 2 * CORE_FLOATS);
    streaks = new Float32Array((budget.sparks * 12 + (sim?.maxForks ?? 40) * 60 * 6 + 220 * 12 + 120 + route.landings.length * 18) * STREAK_FLOATS);
    host.dataset.stream = made ? 'on' : 'off';
    settled = '';
    if (opts.hold && !W) {
      // Held about two thirds of the way down the route: the left side has landed and run the card's top, the right
      // side is level with it.
      heldLine = cardBox.t - (S.route.above - 7) * unit;
      const y = Math.max(0, Math.round(hostTop + heldLine - S.heldAt * innerHeight));
      if (!clock.isFrozen()) clock.freeze(HOLD_TIME);
      scrollTo({ top: y, left: 0, behavior: 'instant' });
    }
    lastLine = heldLine ?? lineAt(scrollY - hostTop);
    if (!still) sim?.settle(lastLine, clock.now());
  };

  // The shards for the look in use: those that ride, and the simulation that throws the loose ones.
  const populate = () => {
    if (!route) return;
    riders = makeRiders(route, budget, look);
    if (probe) probe = new Float32Array(riders.n * PROBE);
    sim = new StreamSim(route, budget, S.seed, S.sizes[look]);
    handed = -1;
    const most = riders.n + budget.loose;
    shards = new Float32Array(most * INSTANCE_FLOATS);
    scratch = new Float32Array(most * INSTANCE_FLOATS);
    keys = new Uint8Array(most);
    settled = '';
  };

  // ---- how the page under the stream has moved since the route was planned
  // A row that is taller or shorter than it was planned carries everything below it down or up, and what is beside
  // it is stretched with it. This is how far a point of the planned page has moved.
  const warp = (y: number): number => {
    let d = 0;
    for (let k = 0; k < rows.length && y > rows[k].top; k++) d += grown[k] * Math.min(1, (y - rows[k].top) / rows[k].tall);
    return d;
  };
  // And the point of the planned page that is now at a height on the real one.
  const unwarp = (y: number): number => {
    let p = y;
    for (let k = 0; k < 5; k++) p = y - warp(p);
    return p;
  };

  // ---- the project cards as they stand this frame
  const platesNow = (): PlateCard[] => {
    bent.length = 0;
    if (!Z) return [];
    const keep = new Set<string>(), stood: CardShape[] = [];
    const out: PlateCard[] = [];
    for (const show of Z.cards) {
      const c = table[show.cat]?.[show.slot];
      if (!c) continue;
      let above = 0;
      for (let k = 0; k < c.row; k++) above += grown[k];
      const top = rows[c.row].top + above + c.off + show.dy;
      c.shape = { x: c.l + c.w / 2, y: top + c.h / 2, hw: c.w / 2, hh: c.h / 2, r: c.r };
      const st = plates.cardOf(c.host);
      let turn = FLAT, tiltX = 0, tiltY = 0, flare = 0, warm = 0, fx = 0, fy = 0;
      if (st) {
        if (st.baked !== c.baked) {
          const bake = plates.bakeOf(c.host, (key) => renderer!.hasBake(key));
          if (bake) {
            const m = bake.mask, k = (2 * c.shape.hw) / m.w, win = m.win ?? [0, 0, 0, 0];
            c.baked = st.baked;
            c.bake = bake.key;
            c.win = [(win[0] - m.w / 2) * k, (win[1] - m.h / 2) * k, win[2] * k, win[3] * k];
            c.frame = m.bezel * k;
            c.rim = m.bead * k;
            if (bake.b0 && bake.b1) renderer!.setBake(bake.key, bake.w, bake.h, bake.b0, bake.b1);
          }
        }
        if (st.awake > 0 || st.turnX !== 0 || st.turnY !== 0) c.watch = 40;
        if (c.watch > 0) { c.watch--; c.scale = parseFloat(getComputedStyle(c.turned).scale) || 1; } else c.scale = 1;
        if (!show.leaving && (c.scale !== 1 || st.turnX !== 0 || st.turnY !== 0)) {
          turn = turnOf(st.turnX, st.turnY, c.scale, c.deep);
          tiltX = st.turnX;
          tiltY = st.turnY;
          bent.push({ c, m: turn });
        }
      }
      // A full strike: the rim flares, and the picture warms toward its own colors and settles back within a second.
      if (sim && !still && !show.leaving) for (const i of c.landings) {
        const since = sim.time - sim.hitAt[i], hard = sim.hit[i];
        if (since < 0 || since > 1.2) continue;
        const f = hard * Math.exp(-since / S.struck.flare);
        if (f > flare) { flare = f; fx = route!.landings[i].x - c.shape.x; fy = route!.landings[i].y + warp(route!.landings[i].y) - c.shape.y; }
        warm = Math.max(warm, S.struck.warm * hard * (since < S.struck.rise ? since / S.struck.rise : Math.exp(-(since - S.struck.rise) / S.struck.settle)));
      }
      plates.setWarm(c.host, warm < 0.01 ? 0 : warm);
      if (c.bake) keep.add(c.bake);
      if (!show.leaving) stood.push({ ...c.shape, hw: c.shape.hw - c.inset, hh: c.shape.hh - c.inset });
      out.push({ ...c.shape, inset: c.inset, turn, tiltX, tiltY, bake: c.bake, win: c.win, frame: c.frame, rim: c.rim, unit: (2 * c.shape.hw) / CARD.width, flare, struck: [fx, fy], there: show.alpha });
    }
    // A card that is waiting keeps its relief, so it is there the moment the card comes in.
    for (const c of cards) if (c.bake) keep.add(c.bake);
    if (cards.length) renderer!.keepBakes(keep);
    // What the stream itself draws stands where the page has carried it: the bar with its knock, and everything
    // below a row that has changed height.
    if (base) {
      const lower = <T extends { y: number }>(o: T): T => ({ ...o, y: o.y + warp(o.y) });
      const span = <T extends { ay: number; by: number }>(o: T): T => ({ ...o, ay: o.ay + warp(o.ay), by: o.by + warp(o.by) });
      renderer!.place(base.reliefs.map((r, i) => (i ? r : { ...r, y: r.y + Z!.knock })), warped ? base.posts.map(lower) : base.posts, warped ? base.rails.map(span) : base.rails, stood, warped ? base.bars.map(span) : base.bars);
    }
    return out;
  };

  // What lies on a card goes with it when the pointer turns and grows it: a point within a few units of the card is
  // carried as if fixed to the card's own plane, and one further off less, until it is not moved at all. And every
  // point goes with the page where a row has changed height.
  const bend = (x: number, y: number, out: Float32Array): void => {
    if (warped) y += warp(y);
    out[0] = x; out[1] = y;
    for (const { c, m } of bent) {
      const s = c.shape, dx = Math.max(Math.abs(x - s.x) - s.hw, 0), dy = Math.max(Math.abs(y - s.y) - s.hh, 0), d = Math.hypot(dx, dy) / unit;
      if (d >= S.struck.carry[1]) continue;
      const k = d <= S.struck.carry[0] ? 1 : 1 - ((d - S.struck.carry[0]) / (S.struck.carry[1] - S.struck.carry[0])) ** 2 * (3 - (2 * (d - S.struck.carry[0])) / (S.struck.carry[1] - S.struck.carry[0]));
      const qx = x - s.x, qy = y - s.y, w = m[2] * qx + m[5] * qy + 1;
      out[0] += ((m[0] * qx + m[3] * qy) / w - qx) * k;
      out[1] += ((m[1] * qx + m[4] * qy) / w - qy) * k;
    }
  };

  // ---- what a change of category does to the line itself. A point this far along a side, where the side runs
  // this way and lies this much on something, is pushed by: the kink of each surge as it passes, the sag where a
  // card is away and the spring off the new one, and the swing of what hangs free below a row that has moved.
  const push = new Float32Array(2), soft = new Float32Array(2), here = new Float32Array(4), fore = new Float32Array(4), aft = new Float32Array(4);
  // A corner the stream made against a card is rounded off while the card is away: each point is drawn toward the
  // middle of the line a little way to each side of it, at two lengths.
  const soften = (b: number, s: number, much: number): void => {
    const br = route!.branches[b];
    at(br, s, here);
    let x = 0, y = 0;
    for (let i = 0; i < 2; i++) {
      const d = S.change.round[i] * unit, share = i ? 0.45 : 0.55;
      at(br, s - d, fore); at(br, s + d, aft);
      x += ((fore[0] + aft[0]) / 2 - here[0]) * share; y += ((fore[1] + aft[1]) / 2 - here[1]) * share;
    }
    soft[0] = x * much; soft[1] = y * much;
  };
  const shove = (b: number, s: number, tx: number, ty: number, hold: number, y: number): void => {
    let dx = 0, dy = 0;
    const A = sides[b], K = S.change, u = unit;
    if (A && Z) {
      // How much the stream lies on something round here, taken over a stretch of it: taken at the point alone, the
      // wave below would be creased wherever the stream comes onto a thing or leaves it.
      const br = route!.branches[b], reach = Math.round((K.kink[1] * u * 0.5) / br.step), at0 = Math.min(br.n - 1, Math.round(s / br.step));
      const lying = (br.hold[Math.max(0, at0 - reach)] + 2 * hold + br.hold[Math.min(br.n - 1, at0 + reach)]) / 4;
      for (const f of Z.fronts) {
        if (f.side !== b) continue;
        const wide = K.kink[1] * u, amp = K.kink[0] * u * f.left * (0.7 + 0.5 * f.near), run = f.phase * (A.meet - A.bar);
        let q = (s - A.bar - run) / wide;
        // Past the meeting the two sides are one line, and a kink one side brought there would part them.
        const whole = Math.max(0, Math.min(1, (A.meet - s) / wide));
        if (q > -3.2 && q < 3.2 && whole > 0) { const w = -q * Math.exp(-q * q) * 2.33 * amp * whole * (1 - K.held * lying); dx -= ty * w; dy += tx * w; }
        // The surge also runs up from the bar toward the title, and dies before it reaches the word.
        const up = A.bar - run;
        q = (s - up) / wide;
        if (up > A.die && q > -3.2 && q < 3.2) { const w = q * Math.exp(-q * q) * 2.33 * amp * K.up * ((up - A.die) / (A.bar - A.die)); dx -= ty * w; dy += tx * w; }
      }
      // Where it rests on the bar it goes with the bar's jolt.
      if (Z.knock) { const off = Math.abs(s - A.bar) / (K.reach[0] * u); if (off < 1) dy += Z.knock * (1 - off * off); }
      // Where the first row's card is away the stream sags and loses the corner the card gave it, but never goes
      // further than the top of the card dropping from under it or of the card coming up under it. Struck, it
      // springs off the card and bounces to rest.
      const reachTop = K.reach[0] * u, g0 = Z.give[b];
      if (g0 !== 0 && s > A.top - reachTop && s < A.lip + reachTop && sim!.head[b] > A.top) {
        const k = Math.min(1, (s - A.top + reachTop) / reachTop, (A.lip + reachTop - s) / reachTop);
        const w = k * k * (3 - 2 * k);
        if (g0 > 0) {
          // It is carried a little clear of the card that is lifting it, and its corner is rounded only while no
          // card is there for the rounding to cut into.
          const sag = Math.min(g0 * K.sag[0] * u, Z.below[b] * 0.85, Z.gone[b]);
          dy += sag * w;
          soften(b, s, Z.clear[b] * w);
          dx += soft[0]; dy += soft[1];
        } else dy += g0 * K.spring[0] * u * w;
      }
      // Where the second row's card is away there is nothing for the stream to be turned by: the point it came to on
      // the card's side leans in toward where the card was and rounds off. It does that only as far as the place is
      // clear of both cards, so it is never sunk into the one going or the one coming.
      const reachSide = K.reach[1] * u, g1 = Z.give[2 + b], off = Math.abs(s - A.side);
      if (g1 !== 0 && off < reachSide && sim!.head[b] > A.side) {
        const r = off / reachSide, into = b ? -1 : 1;
        if (g1 > 0) {
          const away = Z.clear[2 + b] * (1 - r * r) ** 2;
          soften(b, s, away);
          dx += into * K.sag[1] * u * away + soft[0]; dy += soft[1];
        } else dx += into * g1 * K.spring[0] * u * (1 - r) ** 2;
      }
      // A row that changes height carries everything below it. What hangs free does not go with it at once: it is
      // left behind, swings on past its line and settles. Beside the row itself there is slack to take up when the
      // row grows shorter, and the line is drawn straighter when it grows taller, so there it bows out from the
      // cards or in toward them.
      for (let k = 0; k < rows.length; k++) {
        if (y <= rows[k].top || !Z.bow[k]) continue;
        const f = (y - rows[k].top) / rows[k].tall, free = (1 - hold) * Z.bow[k], out = b ? 1 : -1;
        dy += free * K.trail[0] * Math.min(1, f);
        // Toward the meeting the two sides close on each other, and a swing to the side would part them.
        dx += out * free * (f < 1 ? Math.sin(Math.PI * f) : K.trail[1]) * Math.max(0, Math.min(1, (A.meet - s) / (2 * K.kink[1] * u)));
      }
    }
    push[0] = dx; push[1] = dy;
  };

  const moved = new Float32Array(2);

  // ---- the core: a ribbon down each side, as far as its leading end
  const fillCore = (top: number, bottom: number, runs: [number, number, number, number]): void => {
    if (!route || !sim) return;
    let n = 0;
    for (let b = 0; b < 2; b++) {
      const br = route.branches[b], head = sim.head[b];
      const first = n;
      const from = b === 1 ? Math.max(0, route.split - 6 * unit) : 0;
      // The second side's own core runs from the parting to where the two sides meet again.
      const to = b === 1 ? Math.min(head, route.join[1]) : head;
      if (head > from + 1) {
        const i0 = Math.floor(from / br.step), i1 = Math.floor(to / br.step);
        const lay = (x: number, y: number, tx: number, ty: number, s: number, hold: number) => {
          const w = CORE_HALF * unit;
          if (surging) { shove(b, s, tx, ty, hold, y); x += push[0]; y += push[1]; }
          let ax = x - ty * w, ay = y + tx * w, bx = x + ty * w, by = y - tx * w;
          if (carried) { bend(ax, ay, moved); ax = moved[0]; ay = moved[1]; bend(bx, by, moved); bx = moved[0]; by = moved[1]; }
          core[n++] = ax; core[n++] = ay; core[n++] = -CORE_HALF; core[n++] = s / unit; core[n++] = (head - s) / unit;
          core[n++] = bx; core[n++] = by; core[n++] = CORE_HALF; core[n++] = s / unit; core[n++] = (head - s) / unit;
        };
        for (let i = i0; i <= i1; i++) {
          if (br.y[i] < top - 80 && br.floor[Math.min(br.n - 1, i + 40)] < top - 80) continue;
          if (br.y[i] > bottom + 80) continue;
          lay(br.x[i], br.y[i], br.tx[i], br.ty[i], i * br.step, br.hold[i]);
        }
        at(br, to, tmp);
        lay(tmp[0], tmp[1], tmp[2], tmp[3], to, br.hold[Math.min(br.n - 1, Math.round(to / br.step))]);
      }
      runs[b * 2] = first / CORE_FLOATS;
      runs[b * 2 + 1] = (n - first) / CORE_FLOATS;
    }
  };

  // ---- sparks, forks and the hot point at each leading end
  const fillStreaks = (t: number): number => {
    if (!route || !sim) return 0;
    let n = 0;
    const u = unit, out = streaks;
    const vert = (x: number, y: number, across: number, amount: number, along: number) => {
      if (n + 5 > out.length) return;
      if (carried) { bend(x, y, moved); x = moved[0]; y = moved[1]; }
      out[n++] = x; out[n++] = y; out[n++] = across; out[n++] = amount; out[n++] = along;
    };
    const streak = (x0: number, y0: number, a0: number, w0: number, x1: number, y1: number, a1: number, w1: number) => {
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * 1.5, ny = (dx / l) * 1.5;
      vert(x0 - nx * w0, y0 - ny * w0, -1.5, a0, 0); vert(x0 + nx * w0, y0 + ny * w0, 1.5, a0, 0); vert(x1 - nx * w1, y1 - ny * w1, -1.5, a1, 0);
      vert(x1 - nx * w1, y1 - ny * w1, -1.5, a1, 0); vert(x0 + nx * w0, y0 + ny * w0, 1.5, a0, 0); vert(x1 + nx * w1, y1 + ny * w1, 1.5, a1, 0);
    };
    const round = (x: number, y: number, r: number, amount: number) => {
      const k = 1.6, e = r * k;
      vert(x - e, y - e, -k, amount, -k); vert(x + e, y - e, k, amount, -k); vert(x - e, y + e, -k, amount, k);
      vert(x - e, y + e, -k, amount, k); vert(x + e, y - e, k, amount, -k); vert(x + e, y + e, k, amount, k);
    };
    const p = sim.sparks;
    for (let i = 0; i < sim.sparkCount; i++) {
      const o = i * SPARK_FLOATS, age = p[o + 4] / p[o + 5], fine = p[o + 7] === 1;
      // It leaves pale, cools through hot and flame to ember, and goes out.
      const a = p[o + 6] * (1.9 * (1 - age) ** 1.7 + 0.04) * (fine ? 0.8 : 1);
      const sh = S.sparks.shutter * (fine ? 0.6 : 1);
      let tx = p[o + 2] * sh, ty = p[o + 3] * sh;
      const len = Math.hypot(tx, ty), least = 2.2 * u;
      if (len < least) { const k = least / (len || 1); tx *= k; ty *= k; }
      // A long fine streak that bends back along the way it has fallen, bright at its head and gone at its tail.
      const w = (fine ? 0.45 : 0.8) * u, sag = 0.5 * S.sparks.gravity * u * sh * sh;
      const hx = p[o] - tx * 0.45, hy = p[o + 1] - ty * 0.45 + sag * 0.2;
      streak(p[o], p[o + 1], a, w, hx, hy, a * 0.45, w * 0.7);
      streak(hx, hy, a * 0.45, w * 0.7, p[o] - tx, p[o + 1] - ty + sag, 0, w * 0.25);
    }
    const f = sim.forks;
    for (let i = 0; i < sim.forkCount; i++) {
      const o = i * FORK_FLOATS, age = f[o + 4] / f[o + 5], seed = Math.floor(f[o + 6]);
      // A fork is one jagged line that thins to nothing, with a shorter one thrown off its side. It keeps its shape
      // for its short life and only dims.
      const strength = f[o + 7] * (1 - age) ** 1.2 * 8;
      const steps = S.arc.steps, each = f[o + 3] / steps;
      const draw = (x: number, y: number, angle: number, from: number, count: number, salt: number, gain: number) => {
        for (let j = from; j < from + count; j++) {
          const a = angle + (hash(j, seed, salt) - 0.5) * 1.5;
          const x1 = x + Math.cos(a) * each, y1 = y + Math.sin(a) * each;
          const k0 = 1 - (j / (from + count)) * 0.9, k1 = 1 - ((j + 1) / (from + count)) * 0.9;
          streak(x, y, strength * gain * k0, (0.16 + 0.55 * k0) * u, x1, y1, strength * gain * k1, (0.16 + 0.55 * k1) * u);
          // It splits as it goes, and each branch splits again, finer and fainter.
          if (salt < 30 && hash(j, seed, salt + 40) < (salt === 0 ? 0.55 : 0.3)) draw(x1, y1, angle + (hash(j, seed, salt + 9) < 0.5 ? -1 : 1) * (0.5 + 0.7 * hash(j, seed, salt + 5)), j + 1, salt === 0 ? 3 : 2, salt + 20 + j, gain * 0.55);
          x = x1; y = y1;
        }
      };
      draw(f[o], f[o + 1], f[o + 2], 0, steps, 0, 1);
    }
    // What a clear shard throws onto the page: needles of light that point away from the core, out past it, and
    // come and go as it turns.
    for (let i = 0; i < glints; i++) {
      const o = i * 6, a = glint[o + 4];
      if (a <= 0.02) continue;
      const x = glint[o], y = glint[o + 1], dx = glint[o + 2], dy = glint[o + 3], len = glint[o + 5];
      streak(x - dx * len, y - dy * len, 0, 0.2 * u, x, y, a, 0.5 * u);
      streak(x, y, a, 0.5 * u, x + dx * len * 1.6, y + dy * len * 1.6, 0, 0.2 * u);
    }
    // Where a leading end strikes something there is a flash, gone in a moment.
    for (let i = 0; i < route.landings.length; i++) {
      const L = route.landings[i];
      if (sim.head[L.side] < L.s) continue;
      // Where the stream glances off a post or off the side of a card it touches at one point, and that point burns
      // for as long as the stream is there: it is what shows the thing is turning it.
      if (L.kind === 'post' || L.kind === 'side') {
        const beat = still ? 0 : 0.2 * Math.sin(t * 11.7 + i * 1.9) * Math.sin(t * 6.3 + i);
        const x = L.x + Math.cos(L.face) * S.route.above * u, y = L.y + Math.sin(L.face) * S.route.above * u;
        round(x, y, 2.1 * u, 4.4 * (1 + beat));
        round(x, y, 5 * u, 0.8 * (1 + beat));
      }
      const struck = sim.hit[i] * Math.exp(-(sim.time - sim.hitAt[i]) / 0.14);
      if (struck <= 0.02) continue;
      if (L.face === UP) round(L.x, L.y - S.route.above * u, (4 + 9 * struck) * u, 3.2 * struck);
      else round(L.x + Math.cos(L.face) * S.route.above * u, L.y + Math.sin(L.face) * S.route.above * u, (4 + 9 * struck) * u, 3.2 * struck);
    }
    // Each surge has a hot point at its front, as a leading end has, smaller.
    if (surging && Z) for (const f of Z.fronts) {
      const A = sides[f.side];
      if (!A) continue;
      const s = A.bar + f.phase * (A.meet - A.bar), br = route.branches[f.side];
      if (s >= sim.head[f.side] || (f.side === 1 && s >= route.join[1])) continue;
      at(br, s, tmp);
      const x = tmp[0], y = tmp[1];
      shove(f.side, s, tmp[2], tmp[3], br.hold[Math.min(br.n - 1, Math.round(s / br.step))], y);
      // The front has the head a leading end has: a fierce point, and its light spreading round it.
      round(x + push[0], y + push[1], 2.8 * u, 7.8 * f.left * (0.75 + 0.25 * f.near));
      round(x + push[0], y + push[1], 6 * u, 1.3 * f.left);
    }
    // Where a surge strikes a card there is no leading end to bring its fierce point, so the strike has its own.
    if (surging && opts.work) for (const e of opts.work.swap.strikes()) {
      const v = t - e.t, i = e.loose === 1 ? sides[e.side]?.hit[e.stop] : undefined;
      if (i === undefined || v < 0 || v > 0.4 || sim.hitAt[i] < e.t - 0.02) continue;
      const L = route.landings[i], k = S.change.flash[0] * Math.exp(-v / S.change.flash[1]);
      bend(L.x, L.y, tmp);
      round(tmp[0], tmp[1], 3 * u, 7.8 * k);
      round(tmp[0], tmp[1], 6 * u, 1.3 * k);
    }
    for (let b = 0; b < 2; b++) {
      if (b === 1 && (sim.head[1] <= route.split || sim.head[1] >= route.join[1])) continue;
      at(route.branches[b], sim.head[b], tmp);
      const e = sim.energy[b], beat = still ? 0 : 0.12 * Math.sin(t * 9.3 + b * 2.1) * Math.sin(t * 5.1 + b);
      // A fierce point, no bigger than the core is wide. The glow round it is its own light spreading, not a ball.
      round(tmp[0], tmp[1], (2.4 + 0.9 * e) * u, 7.8 * (1 + beat));
      round(tmp[0], tmp[1], 6 * u, 1.3 * (1 + beat));
    }
    return n / STREAK_FLOATS;
  };

  // ---- shards: those riding the core, placed where the moment puts them, and those thrown loose
  const fillShards = (t: number, top: number, bottom: number, lx: number, ly: number, lz: number, led: number): number => {
    if (!route || !sim || !riders) return 0;
    const u = unit, K = S.shards, R = riders, sc = scratch;
    const reach2 = (K.turn * u) ** 2;
    let n = 0;
    const count = new Int32Array(LAYERS * KINDS);
    const place = (x: number, y: number, z: number, size: number, qx: number, qy: number, qz: number, qw: number, cx: number, cy: number, tx: number, ty: number, own: number, lit: number, clear: number, kind: number, thrown: number) => {
      // Near the cursor a shard turns its face toward it, and flashes.
      const dx = lx - x, dy = ly - y, near = Math.exp(-(dx * dx + dy * dy) / reach2) * (0.3 + 0.7 * led);
      if (near > 0.02) {
        const nx = 2 * (qx * qz + qw * qy), ny = 2 * (qy * qz - qw * qx), nz = 1 - 2 * (qx * qx + qy * qy);
        const dl = Math.hypot(dx, dy, lz - z) || 1, k = near * K.face[look];
        let gx = nx + ((dx / dl) - nx) * k, gy = ny + ((dy / dl) - ny) * k, gz = nz + (((lz - z) / dl) - nz) * k;
        const gl = Math.hypot(gx, gy, gz) || 1;
        gx /= gl; gy /= gl; gz /= gl;
        // The shortest turn that takes its face from where it looks to where it should.
        const ax = ny * gz - nz * gy, ay = nz * gx - nx * gz, az = nx * gy - ny * gx, aw = 1 + nx * gx + ny * gy + nz * gz;
        const al = Math.hypot(ax, ay, az, aw) || 1;
        const rx = ax / al, ry = ay / al, rz = az / al, rw = aw / al;
        const ox = rw * qx + rx * qw + ry * qz - rz * qy, oy = rw * qy - rx * qz + ry * qw + rz * qx, oz = rw * qz + rx * qy - ry * qx + rz * qw, ow = rw * qw - rx * qx - ry * qy - rz * qz;
        qx = ox; qy = oy; qz = oz; qw = ow;
      }
      const o = n * INSTANCE_FLOATS;
      if (carried) { bend(cx, cy, moved); cx = moved[0]; cy = moved[1]; bend(x, y, moved); x = moved[0]; y = moved[1]; }
      sc[o] = x; sc[o + 1] = y; sc[o + 2] = z; sc[o + 3] = size * (1 + z * K.depth / u);
      sc[o + 4] = qx; sc[o + 5] = qy; sc[o + 6] = qz; sc[o + 7] = qw;
      sc[o + 8] = cx; sc[o + 9] = cy; sc[o + 10] = tx; sc[o + 11] = ty;
      sc[o + 12] = own; sc[o + 13] = lit; sc[o + 14] = thrown; sc[o + 15] = near;
      const key = (clear ? 2 : z < 0 ? 0 : 1) * KINDS + kind;
      keys[n++] = key;
      count[key]++;
    };

    const heads = [riddenAt(route.branches[0], sim.head[0]), riddenAt(route.branches[1], sim.head[1])];
    for (let i = 0; i < R.n; i++) {
      const o = i * RIDER, b = R.branch[i], br = route.branches[b], head = sim.head[b];
      const po = i * PROBE;
      if (probe && po + PROBE <= probe.length) probe.fill(0, po, po + PROBE);
      // Nothing takes a shard out of the stream between its start and the leading end. Fewer on an object comes
      // from how fast they ride there (route.ts), not from hiding any.
      const ridden = (R.f[o] * br.rideLen + t * K.flow * u * R.f[o + 1]) % br.rideLen, d = along(br, ridden);
      const lead = head - d;
      if (lead <= 0) continue;
      const fi = Math.min(br.n - 1.001, d / br.step), here = Math.floor(fi), part = fi - here;
      const mix = (a: Float32Array) => a[here] + (a[here + 1] - a[here]) * part;
      // By distance ridden, so it takes as long to grow where it rides faster.
      let grown = Math.min(1, (heads[b] - ridden) / (K.grow * u));
      at(br, d, tmp);
      const hold = mix(br.hold);
      // A rider goes with the line: where a surge kinks it or it sags, the shards on it are carried with it.
      if (surging) { shove(b, d, tmp[2], tmp[3], hold, tmp[1]); tmp[0] += push[0]; tmp[1] += push[1]; }
      if (probe && po + PROBE <= probe.length) { probe[po + 3] = grown; probe[po + 5] = hold; probe[po + 8] = tmp[0]; probe[po + 9] = tmp[1]; }
      if (grown <= 0.02) continue;
      if (tmp[1] < top - 70 * u || tmp[1] > bottom + 70 * u) continue;
      const cx = tmp[0], cy = tmp[1], tx = tmp[2], ty = tmp[3];
      const e = sim.energy[b];
      // They gather and thin along the route in slow waves, so the stream has knots and open stretches. Along an
      // object there are no knots. The knots travel with the shards, so they go by distance ridden.
      const free = 0.5 + 0.5 * Math.sin(ridden / (K.clump * u) - t * 0.22 + 2 * Math.sin(ridden / (K.clump * 3.6 * u)));
      const wave = free + (0.5 - free) * mix(br.level);
      const wv = Math.max(0, Math.min(1, (K.wave[0] + (K.wave[1] - K.wave[0]) * wave - R.f[o + 16]) / 0.1 + 1));
      grown *= wv;
      if (probe && po + PROBE <= probe.length) probe[po + 4] = wv;
      if (grown <= 0.02) continue;
      // They go round the core, but quicker across its face than past its sides, so the core is never hidden for long.
      const turn = R.f[o + 3] + t * K.orbit + (d * TAU) / (K.wind * u) + 0.4 * Math.sin(t * R.f[o + 4] + R.f[o + 5]);
      const round = turn + K.aside * Math.sin(2 * turn);
      const far = R.f[o + 2] * (1 + K.spread * hold) * (1 + (K.flare + K.flareFast * e) * Math.exp(-lead / (K.flareOver * u)));
      // It swings out to one side of the core and then the other. With less room on one side than it would swing,
      // it swings out on the open side both times, and with a little less room, a little: its place never changes
      // at once, which turning it back off the nearest face of an object did at every corner.
      const swing = Math.sin(round), back = (Math.sqrt(swing * swing + K.round * K.round) - K.round) / (Math.sqrt(1 + K.round * K.round) - K.round);
      const body = R.f[o + 6] * 0.7, roomA = mix(br.roomA) - body, roomB = mix(br.roomB) - body;
      const shutA = Math.max(0, Math.min(1, 1 - roomA / far)), shutB = Math.max(0, Math.min(1, 1 - roomB / far));
      let side = far * swing;
      if (shutA > 0 && shutB > 0) {
        // Something on both sides, as between a post and a card. Kept off each as above, each of the two also held
        // inside the room the other side has, and the two weighed by how shut each side is. Choosing the more shut
        // side outright moved a shard across the core at once whenever the two changed places.
        const offA = (1 - shutA) * side + shutA * (Math.min(roomA, 0) - far * back), offB = (1 - shutB) * side - shutB * (Math.min(roomB, 0) - far * back);
        side = (shutA * (offA < 0 ? offA * (1 - shutB) : offA) + shutB * (offB > 0 ? offB * (1 - shutA) : offB)) / (shutA + shutB);
      } else if (shutA > 0) side = (1 - shutA) * side + shutA * (Math.min(roomA, 0) - far * back);
      else if (shutB > 0) side = (1 - shutB) * side - shutB * (Math.min(roomB, 0) - far * back);
      const z = far * Math.cos(round);
      const x = cx - ty * side, y = cy + tx * side;
      if (probe && po + PROBE <= probe.length) { probe[po] = x; probe[po + 1] = y; probe[po + 2] = grown; probe[po + 6] = shutA - shutB; probe[po + 7] = side; }
      const spin = R.f[o + 8] + t * R.f[o + 7], h = Math.sin(spin / 2), cw = Math.cos(spin / 2);
      // A larger clear shard near the core throws a sliver of light out past itself, on the far side from the core.
      if (R.clear[i] && R.f[o + 6] > 5.5 * u && glints < GLINTS && Math.abs(side) > 5 * u) {
        const flick = Math.sin(spin * 2.3 + R.f[o + 16] * 40) * Math.sin(spin * 1.1 + R.f[o + 3]);
        const amount = Math.max(0, flick - 0.25) * grown * 1.5 / (1 + Math.abs(side) / (26 * u));
        if (amount > 0.02) {
          const way = Math.sign(side), reach = (20 + 26 * R.f[o + 16]) * u;
          const g = glints++ * 6;
          glint[g] = x - ty * way * reach; glint[g + 1] = y + tx * way * reach; glint[g + 2] = -ty * way; glint[g + 3] = tx * way;
          glint[g + 4] = amount; glint[g + 5] = R.f[o + 6] * (0.5 + 0.5 * R.f[o + 16]);
        }
      }
      const ax = R.f[o + 9] * h, ay = R.f[o + 10] * h, az = R.f[o + 11] * h;
      const bx = R.f[o + 12], by = R.f[o + 13], bz = R.f[o + 14], bw = R.f[o + 15];
      place(x, y, z, R.f[o + 6] * grown,
        cw * bx + ax * bw + ay * bz - az * by, cw * by - ax * bz + ay * bw + az * bx, cw * bz + ax * by - ay * bx + az * bw, cw * bw - ax * bx - ay * by - az * bz,
        cx, cy, tx, ty, R.f[o + 16], 1, R.clear[i], R.kind[i], 0);
    }

    const p = sim.loose, sizes = S.sizes[look], loosest = sizes[0] * S.loose.least;
    for (let i = 0; i < sim.looseCount; i++) {
      const o = i * LOOSE_FLOATS, age = p[o + 13], life = p[o + 14];
      const x = p[o], y = p[o + 1];
      if (y < top - 60 || y > bottom + 60) continue;
      // Lit by the nearest stretch of core.
      let best = 1e12, bi = 0, bb = 0;
      for (let b = 0; b < 2; b++) {
        const br = route.branches[b], last = Math.min(br.n - 1, Math.floor((b === 1 ? Math.min(sim.head[1], route.join[1]) : sim.head[0]) / br.step));
        for (let k = b === 1 ? Math.floor(route.split / br.step) : 0; k <= last; k += 5) {
          const dx = br.x[k] - x, dy = br.y[k] - y, d2 = dx * dx + dy * dy;
          if (d2 < best) { best = d2; bi = k; bb = b; }
        }
      }
      const br = route.branches[bb];
      const size = Math.abs(p[o + 15]) * thrownShare(age, life);
      const own = sim.looseSeed[i];
      const clear = p[o + 15] < 0 ? 1 : 0;
      const kind = look === 'first' ? Math.floor(own * FIRST_KINDS) : facetKind((Math.abs(p[o + 15]) / u - loosest) / (sizes[1] - sizes[0]), own);
      place(x, y, p[o + 2], size, p[o + 6], p[o + 7], p[o + 8], p[o + 9], br.x[bi], br.y[bi], br.tx[bi], br.ty[bi], own, 1, clear, kind, 1);
    }

    // Sort into the lots they are drawn in.
    let first = 0;
    const next = new Int32Array(LAYERS * KINDS);
    for (let k = 0; k < LAYERS * KINDS; k++) { lots[k * 2] = first; lots[k * 2 + 1] = count[k]; next[k] = first; first += count[k]; }
    for (let i = 0; i < n; i++) {
      const to = next[keys[i]]++ * INSTANCE_FLOATS, from = i * INSTANCE_FLOATS;
      for (let k = 0; k < INSTANCE_FLOATS; k++) shards[to + k] = sc[from + k];
    }
    return n;
  };

  // For checking: where each riding shard was drawn in the last frame and what took any of its size away. x, y, the
  // share of its size shown, the share the leading end leaves it, the share the knots leave it, how much the route
  // lies on an object there, how much an object shuts one side to it, how far out from the core it is, and the
  // point of the core it rides.
  const PROBE = 10;
  let probe: Float32Array | null = null;
  const runs: [number, number, number, number] = [0, 0, 0, 0];
  const GLINTS = 220;
  const glint = new Float32Array(GLINTS * 6);
  let glints = 0;

  const frame = (t: number, dt: number) => {
    if (!renderer || !route || !sim || disposed) return;
    const began = performance.now();
    const top = clock.view.y - hostTop;
    // What a change of category is doing this frame: which cards show, how tall the rows are, where each surge is.
    Z = opts.work ? opts.work.swap.at(t) : null;
    warped = false;
    if (Z && rows.length) { grown = rows.map((r, k) => Z!.rows[k] - r.tall); warped = grown.some((d) => Math.abs(d) > 0.01); }
    surging = !!Z && Z.busy && !still;
    const canvasTop = Math.max(0, Math.min(hostH + (warped ? grown.reduce((a, d) => a + d, 0) : 0) - cssH, top - S.margin));
    canvas.style.transform = `translate3d(0,${canvasTop.toFixed(1)}px,0)`;
    const frozen = clock.isFrozen();
    // The route is as it was planned, so the line the scroll has reached is found on the planned page.
    const anchorLine = (y: number) => (warped ? unwarp(lineAt(y)) : lineAt(y));
    let line = heldLine ?? anchorLine(top);
    if (opts.work && handed !== opts.work.swap.version()) {
      handed = opts.work.swap.version();
      sim.setEvents(opts.work.swap.strikes().flatMap((e) => { const i = sides[e.side]?.hit[e.stop]; return i === undefined ? [] : [{ t: e.t, i, hard: e.hard, loose: e.loose }]; }));
      sim.setFronts(opts.work.swap.fronts().flatMap((f) => { const A = sides[f.side]; return A ? [{ side: f.side, t0: f.t0, until: f.cut, from: A.bar, to: A.meet, span: S.change.length, rate: S.change.shed * (0.6 + 0.4 * f.near) }] : []; }));
      settled = '';
    }

    if (still) {
      sim.rest(line);
    } else if (frozen) {
      if (script) {
        // A scripted scroll, for filmstrips: the whole move is run again from its start, so any moment of it can be drawn.
        const at_ = (time: number) => { const k = Math.max(0, Math.min(1, (time - script!.t0) / (script!.t1 - script!.t0))); return script!.y0 + (script!.y1 - script!.y0) * k * k * (3 - 2 * k); };
        const key = `s:${t}:${handed}`;
        if (key !== settled) {
          settled = key;
          const from = script.t0 - 0.25;
          sim.settle(anchorLine(at_(from) - hostTop), from);
          let prev = anchorLine(at_(from) - hostTop);
          while (sim.time + STREAM_STEP <= t + 1e-9) {
            const l = anchorLine(at_(sim.time + STREAM_STEP) - hostTop);
            sim.step(l, (l - prev) / STREAM_STEP);
            prev = l;
          }
          scrollTo({ top: Math.round(at_(t)), left: 0, behavior: 'instant' });
        }
        line = anchorLine(at_(t) - hostTop);
      } else {
        const key = `${t}:${line.toFixed(1)}:${handed}`;
        if (key !== settled) { settled = key; sim.settle(line, t); }
      }
    } else {
      settled = '';
      if (t - sim.time > 0.3 || t < sim.time - STREAM_STEP) sim.settle(line, t);
      const pace = dt > 0 ? (line - lastLine) / dt : 0;
      for (let k = 0; k < 12 && sim.time + STREAM_STEP <= t + 1e-9; k++) sim.step(line, pace);
    }
    lastLine = line;

    const now = still ? STILL_TIME : t;
    const L = lamp.get();
    const led = touch ? 1 : L.led;
    const lx = touch ? touch.x : L.px, ly = (touch ? touch.y : L.py + clock.view.y) - hostTop;
    const lz = 120 * unit;
    const stood = platesNow();
    carried = warped || bent.length > 0;
    // What is on screen, as a stretch of the planned page.
    const from = warped ? unwarp(canvasTop) : canvasTop, to = warped ? unwarp(canvasTop + cssH) : canvasTop + cssH;
    fillCore(from, to, runs);
    glints = 0;
    const drawn = fillShards(now, from, to, lx, warped ? unwarp(ly) : ly, lz, led);
    const streakCount = fillStreaks(now);
    // The swell of light that runs with each surge, down from the bar and up from it.
    let swell: [Float32Array, Float32Array] | undefined;
    if (surging && Z && Z.fronts.length) {
      swell = swells;
      const used = [0, 0];
      swells[0].fill(0); swells[1].fill(0);
      for (let k = Z.fronts.length - 1; k >= 0; k--) {
        const f = Z.fronts[k], A = sides[f.side];
        if (!A || used[f.side] + 2 > SWELLS) continue;
        const run = f.phase * (A.meet - A.bar), much = S.change.swell[0] * f.left * (0.6 + 0.6 * f.near), up = A.bar - run;
        swells[f.side].set([(A.bar + run) / unit, much, 1, up / unit, up > A.die ? much * S.change.up * ((up - A.die) / (A.bar - A.die)) : 0, -1], used[f.side] * 3);
        used[f.side] += 2;
      }
      // A card's strike flares the line where it struck, both ways along it, for as long as the flash lasts.
      for (const e of opts.work!.swap.strikes()) {
        const v = now - e.t, A = sides[e.side], i = e.loose === 1 && A ? A.hit[e.stop] : undefined;
        if (i === undefined || v < 0 || v > 0.5 || used[e.side] + 2 > SWELLS || sim.hitAt[i] < e.t - 0.02) continue;
        const at_ = route.landings[i].s / unit, much = S.change.flash[2] * Math.exp(-v / S.change.flash[3]);
        swells[e.side].set([at_, much, 1, at_, much, -1], used[e.side] * 3);
        used[e.side] += 2;
      }
    }
    const f: Frame = {
      view: [0, canvasTop, cssW, cssH], time: now, unit, lamp: [lx, ly, lz, 0.5 + 0.5 * led], energy: [sim.energy[0], sim.energy[1]], split: route.split / unit, end: route.join[1] / unit, look, presence,
      core, coreRuns: runs, streaks, streakCount, shards, lots, plates: stood, swell,
      // A lit face is never quite steady: it breathes a little, as coals do. It flares as a surge passes its stone.
      lit: stones.map((i, k) => sim!.on[i] * (still ? 1 : 0.92 + 0.08 * Math.sin(now * 2.3 + i) * Math.sin(now * 1.1 + i * 1.7)) * (Z ? Math.sqrt(1 + S.change.flare * Z.stone[k ? 1 : 0]) : 1)),
    };
    renderer.draw(f);
    // The button stands where the two sides meet, and is lit from there once they have.
    if (buttonPlate) {
      const meet = route.landings[route.landings.length - 1];
      const near = Math.max(0, Math.min(1, (sim.head[0] - meet.s + 150 * unit) / (150 * unit)));
      // It takes the light again as a surge arrives under it.
      plates.setStream(buttonPlate, meet.x, meet.y + (warped ? warp(meet.y) : 0) + hostTop - clock.view.y, still ? Math.round(near) * 0.3 : near * (0.3 + (Z ? S.change.button * Z.met : 0)));
    }
    spent += (performance.now() - began - spent) * 0.1;
    stats.streamMs = spent;
    stats.streamShards = drawn;
    stats.streamSparks = sim.sparkCount;
    stats.streamLoose = sim.looseCount;
  };

  // A finger or a pen puts the light where it touches and leaves it there. A mouse hands it back to the lamp.
  const point = (e: PointerEvent) => { touch = e.pointerType === 'mouse' ? null : { x: e.pageX, y: e.pageY }; };
  addEventListener('pointerdown', point, { passive: true });
  addEventListener('pointermove', point, { passive: true });

  let offFrame = () => {};
  let offTier = () => {};
  // A plan that cannot be made says so, and the page shows what it has without the stream.
  const plan = () => { try { build(); } catch (e) { console.error(e); host.dataset.stream = 'off'; } };
  const resized = new ResizeObserver(plan);
  const ready = registry.track(document.fonts.ready.then(() => document.fonts.load(getComputedStyle(opts.title).font || '600 16px Sora')).catch(() => undefined).then(() => {
    if (disposed) return;
    build();
    offFrame = clock.onFrame(frame);
    offTier = tiers.subscribe(plan);
    resized.observe(host);
    resized.observe(canvas);
  }).catch((e: unknown) => {
    // A stream that cannot start says so, and the page shows what it has without it.
    console.error(e);
    host.dataset.stream = 'off';
  }));
  void ready;

  registry.tool('streamState', () => ({ on: host.dataset.stream, look, unit, shards: stats.streamShards, sparks: sim?.sparkCount ?? 0, loose: sim?.looseCount ?? 0, head: sim ? [sim.head[0], sim.head[1]] : [], energy: sim ? [sim.energy[0], sim.energy[1]] : [], riders: riders?.n ?? 0, boxes: route?.boxes ?? [], landings: route?.landings.map((L) => ({ kind: L.kind, side: L.side, s: L.s, x: L.x, y: L.y })) ?? [], posts: route?.posts ?? [], rails: route?.rails ?? [], split: route?.split ?? 0, join: route ? route.join.map((j) => (j < Infinity ? j : -1)) : [], stops: sides.map((a) => (a ? { bar: a.bar, top: a.top, lip: a.lip, stone: a.stone, side: a.side, rail: a.rail, meet: a.meet, die: a.die } : null)), rows: rows.map((r, k) => ({ ...r, grown: grown[k] ?? 0 })) }));
  // The route itself: how far apart its points are, and each side's points as x and y, for measuring how the stream
  // comes to a thing and leaves it.
  registry.tool('streamRoute', () => ({ step: route?.branches[0].step ?? 0, sides: route ? route.branches.map((b) => Array.from({ length: b.n * 2 }, (_, i) => (i % 2 ? b.y[i >> 1] : b.x[i >> 1]))) : [] }));
  // How many shards the last frame drew inside a rectangle of the page, how many of those were thrown loose, and how
  // much of the route runs through it.
  registry.tool('streamCount', (l: number, t: number, r: number, b: number) => {
    let riding = 0, loose = 0, length = 0;
    if (route && sim) for (let k = 0; k < 2; k++) {
      const br = route.branches[k], last = Math.min(br.n - 1, Math.floor((k === 1 ? Math.min(sim.head[1], route.join[1]) : sim.head[0]) / br.step));
      for (let i = k === 1 ? Math.ceil(route.split / br.step) : 0; i <= last; i++) if (br.x[i] >= l && br.x[i] <= r && br.y[i] >= t && br.y[i] <= b) length += br.step;
    }
    for (let i = 0; i < stats.streamShards; i++) {
      const o = i * INSTANCE_FLOATS, x = shards[o], y = shards[o + 1];
      if (x < l || x > r || y < t || y > b || shards[o + 3] < 0.5) continue;
      if (shards[o + 14] > 0.5) loose++; else riding++;
    }
    return { riding, loose, length };
  });
  // Every shard the last frame drew inside a rectangle of the page: x, y, whether it was thrown, and how far it is
  // from the core it belongs to.
  registry.tool('streamList', (l: number, t: number, r: number, b: number) => {
    const out: number[] = [];
    for (let i = 0; i < stats.streamShards; i++) {
      const o = i * INSTANCE_FLOATS, x = shards[o], y = shards[o + 1];
      if (x < l || x > r || y < t || y > b || shards[o + 3] < 0.5) continue;
      out.push(x, y, shards[o + 14], Math.hypot(x - shards[o + 8], y - shards[o + 9]));
    }
    return out;
  });
  // streamProbe(true) starts keeping a record of every riding shard, and streamRiders(left, top, right, bottom) gives
  // the record of those whose point of the core is inside a rectangle: its number, then the fields of the record.
  registry.tool('streamProbe', (on: boolean) => { probe = on && riders ? new Float32Array(riders.n * PROBE) : null; });
  registry.tool('streamRiders', (l: number, t: number, r: number, b: number) => {
    const out: number[] = [];
    if (probe) for (let i = 0; i * PROBE < probe.length; i++) {
      const o = i * PROBE, x = probe[o + 8], y = probe[o + 9];
      if (x < l || x > r || y < t || y > b || (x === 0 && y === 0)) continue;
      out.push(i);
      for (let k = 0; k < PROBE; k++) out.push(probe[o + k]);
    }
    return out;
  });
  // Every thrown shard as its own number, x and y, so a script can follow each one from frame to frame. Asked for
  // sizes, each is followed by the share of its full size it is drawn at.
  registry.tool('streamThrown', (sizes?: boolean) => {
    const out: number[] = [];
    if (sim) for (let i = 0; i < sim.looseCount; i++) {
      const o = i * LOOSE_FLOATS, age = sim.loose[o + 13], life = sim.loose[o + 14];
      out.push(sim.looseSeed[i], sim.loose[o], sim.loose[o + 1]);
      if (sizes) out.push(thrownShare(age, life));
    }
    return out;
  });
  // streamHits() lists each landing with when it was last struck and how hard, for timing a surge.
  registry.tool('streamHits', () => (route && sim ? route.landings.map((L, i) => ({ kind: L.kind, side: L.side, at: sim!.hitAt[i], hard: sim!.hit[i] })) : []));
  // streamPlan() plans the route again from where things are on the page now. streamSharp(n) lets the canvas draw
  // at up to n device pixels to a CSS pixel, for a close still, and streamSharp() puts the budget back.
  registry.tool('streamPlan', () => { version++; plan(); });
  registry.tool('streamSharp', (n?: number) => { sharp = n ?? 0; version++; plan(); });
  // streamPlay(fromScroll, toScroll, fromTime, toTime) scripts a scroll for frozen frames. streamPlay() ends it.
  registry.tool('streamPlay', (y0?: number, y1?: number, t0?: number, t1?: number) => {
    script = y0 === undefined || y1 === undefined ? null : { y0, y1, t0: t0 ?? 1, t1: t1 ?? 2 };
    settled = '';
  });

  return {
    setLook(next: Look) {
      if (next === look || disposed) return;
      look = next;
      populate();
      if (!still) sim?.settle(lastLine, clock.now());
    },
    dispose() {
      disposed = true;
      offFrame();
      offTier();
      resized.disconnect();
      removeEventListener('pointerdown', point);
      removeEventListener('pointermove', point);
      renderer?.dispose();
      renderer = null;
      canvas.remove();
      delete host.dataset.stream;
    },
  };
}
