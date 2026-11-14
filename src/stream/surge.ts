import { registry } from '../hooks/registry';
import { plates } from '../metal/renderer';
import { clock } from '../world/clock';
import { STREAM } from './config';

// What happens when the category changes. Picking a category knocks the bar. From where the stream rests on each
// end of the bar a surge runs down that side at a steady speed, and each thing it passes answers as it passes: the
// first row's card lets go, the stone flares, the second row's card lets go, the rail and the meeting take a light
// strike. A card that lets go drops away, the new one comes up from below, and the stream strikes it as it seats.
//
// This module is the order and the timing of that, and the part of it that is the page's: which cards show, where,
// and how tall each row is. Everything is worked out from the presses so far and a time, so a frozen frame shows
// the same thing every time. The stream reads the same state (at) and does its own part: the surge in the line,
// the sag where a card is away, the strikes.

const C = STREAM.change;
// How long after it lets go a place's new card can first be seen.
const solidAt = C.in + C.ghost * (C.seat - C.in);

// The stops of one side, as the stream gives them: how far along from the bar to the meeting each is, 0 to 1.
export interface Stops {
  // Where on the page, across, each side of the stream rests on the bar, and how wide the bar is.
  bar: [number, number];
  width: number;
  // For each side: the first row's card, the stone, the second row's card, the rail.
  at: [number[], number[]];
  // Whether the stream has reached the bar, which is where a surge starts. If it has not, nothing plays.
  reached: () => boolean;
}

// A place the surge strikes, for the stream to turn into a landing of its own.
export type Stop = 'bar' | 'top' | 'stone' | 'side' | 'rail' | 'meet';
// loose is the share of its shards a strike throws: a card's throws them all, a light contact fewer.
export interface Strike { t: number; stop: Stop; side: number; hard: number; loose: number }

// A card that is showing: which, how much of it, and how far below its seat it is.
export interface Showing { cat: number; slot: number; alpha: number; dy: number; leaving: boolean }

export interface State {
  // Something is still moving.
  busy: boolean;
  cards: Showing[];
  // For each of the four places a card stands: how far the stream has sagged toward where the card was, 0 to 1,
  // and once the new card is struck, below nothing as it springs off it. How far below its seat the card coming in
  // still is, and how much of it shows.
  give: number[];
  below: number[];
  shown: number[];
  // Each row's height now, and how far what hangs free below it is still swinging from the row's last move.
  rows: number[];
  // For each place: how far the card that is leaving has dropped while it is still there to be lain on, and how
  // clear the place is of both cards, 0 to 1.
  gone: number[];
  clear: number[];
  // How far what hangs free beside a row that is changing height bows, out from the cards or in toward them.
  bow: number[];
  // Each surge that is running: its side, how far it has come from the bar to the meeting, how near its end of the
  // bar the press was, and how much of it is left.
  fronts: { side: number; phase: number; near: number; left: number }[];
  // The bar's jolt, in pixels. Each stone's flare and the meeting's, 0 to 1.
  knock: number;
  stone: [number, number];
  met: number;
}

interface Press { t: number; cat: number; x: number | null; surge: boolean }
interface Change { at: number; from: number; to: number; quiet: boolean; via: { until: number; to: number }[] }

export interface SwapParts {
  bar: HTMLElement;
  // The rows of cards, top to bottom. layers[row][category] holds that category's cards for the row, and
  // cards[category][place] is a card, the places going by rows with the left one first.
  rows: HTMLElement[];
  layers: HTMLElement[][];
  cards: HTMLElement[][];
}

export interface Swap {
  // Pick a category. x is where across the page the press was.
  press(category: number, x?: number): void;
  at(t: number): State;
  // The strikes of every press so far, and a number that changes when they do.
  strikes(): Strike[];
  // Each front: its side, when it leaves the bar, how near the press that end of the bar was, and when a later
  // press cuts it off.
  fronts(): { side: number; t0: number; near: number; cut: number }[];
  version(): number;
  bind(stops: Stops | null): void;
  dispose(): void;
}

const smooth = (k: number) => { const q = Math.max(0, Math.min(1, k)); return q * q * (3 - 2 * q); };

export function mountSwap(parts: SwapParts, first = 0): Swap {
  const places = parts.cards[0].length, still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let base = first;
  let presses: Press[] = [];
  let stops: Stops | null = null;
  let changes: Change[][] = [];
  let rowEvents: { t: number; cat: number }[][] = [];
  let fronts: { side: number; t0: number; near: number; cut: number }[] = [];
  let struck: Strike[] = [];
  let stones: number[][] = [[], []];
  let mets: number[] = [];
  let knocks: number[] = [];
  let quietAt = -1;
  let count = 0;
  let disposed = false;
  // Each layer's own height: what its row is when that category shows.
  let tall: number[][] = [];
  const measure = () => { tall = parts.layers.map((row) => row.map((layer) => layer.getBoundingClientRect().height)); };
  const hosts = parts.cards.map((set) => set.map((card) => card.querySelector('[data-kind="card"]')));

  // Everything that follows from the presses, in order.
  const plan = () => {
    const T = C.length;
    changes = Array.from({ length: places }, () => []);
    fronts = []; struck = []; stones = [[], []]; mets = []; knocks = [];
    const arrive: { t: number; slot: number; quiet: boolean; only?: boolean }[] = [];
    presses.forEach((p, n) => {
      // A later press cuts in: what an earlier surge had not reached yet is left to the new one, which takes every
      // card from the top again and in order, and the earlier front dies where it is.
      const cut = n + 1 < presses.length ? presses[n + 1].t : Infinity;
      if (!p.surge || !stops || still) {
        for (let slot = 0; slot < places; slot++) arrive.push({ t: p.t, slot, quiet: true });
        return;
      }
      let met = Infinity;
      knocks.push(p.t);
      // The press itself lets nothing go. But a card on its way in that cannot be seen yet becomes the newest at once.
      for (let slot = 0; slot < places; slot++) arrive.push({ t: p.t, slot, quiet: false, only: true });
      for (let side = 0; side < 2; side++) {
        const far = p.x === null ? 0.5 : Math.max(0, Math.min(1, Math.abs(p.x - stops.bar[side]) / stops.width));
        const t0 = p.t + far * C.lag * T, at = stops.at[side];
        fronts.push({ side, t0, near: 1 - far, cut });
        const light = (t: number, stop: Stop): void => { if (t < cut) struck.push({ t, stop, side, hard: stop === 'bar' ? C.knock[0] + C.knock[1] * (1 - far) : C.light, loose: C.loose }); };
        light(t0, 'bar');
        for (const [t, slot] of [[t0 + T * at[0], side], [t0 + T * at[2], 2 + side]]) if (t < cut) arrive.push({ t, slot, quiet: false });
        if (t0 + T * at[1] < cut) stones[side].push(t0 + T * at[1]);
        light(t0 + T * at[1], 'stone');
        light(t0 + T * at[3], 'rail');
        met = Math.min(met, t0 + T);
      }
      if (met < cut) { mets.push(met); struck.push({ t: met, stop: 'meet', side: 0, hard: C.light, loose: C.loose }); }
    });
    arrive.sort((a, b) => a.t - b.t);
    const newest = (t: number) => { let cat = base; for (const p of presses) if (p.t <= t) cat = p.cat; return cat; };
    const seat = still ? 0 : C.seat;
    for (let slot = 0; slot < places; slot++) {
      let shown = base, open: Change | null = null;
      for (const e of arrive) {
        if (e.slot !== slot) continue;
        if (open && e.t >= open.at + seat) { shown = open.to; open = null; }
        const want = newest(e.t);
        if (want === (open ? open.to : shown)) continue;
        // A press that comes while a card is on its way in does not queue a second change: the card coming in becomes
        // the newest one, and there is still one strike. Once that card can be seen it is not swapped in the air: it
        // seats, and goes again at once.
        if (open && e.t <= open.at + solidAt) { open.via.push({ until: e.t, to: open.to }); open.to = want; continue; }
        if (e.only) continue;
        const from: number = open ? open.to : shown, when: number = open ? open.at + seat : e.t;
        if (open) shown = open.to;
        open = { at: when, from, to: want, quiet: e.quiet, via: [] };
        changes[slot].push(open);
        continue;
      }
      for (const c of changes[slot]) if (!c.quiet) struck.push({ t: c.at + C.seat, stop: slot < 2 ? 'top' : 'side', side: slot % 2, hard: C.hard[slot < 2 ? 0 : 1], loose: 1 });
    }
    struck.sort((a, b) => a.t - b.t);
    // A row is as tall as the tallest card standing in it or on its way in. So it grows as soon as a taller card is
    // let in, and does not shrink until the last taller card has gone.
    rowEvents = parts.rows.map((_, row) => {
      const marks: { t: number; slot: number; cats: number[] }[] = [];
      for (let slot = row * 2; slot < row * 2 + 2 && slot < places; slot++) for (const c of changes[slot]) {
        marks.push({ t: c.at, slot, cats: [c.from, c.via.length ? c.via[0].to : c.to] });
        c.via.forEach((v, i) => marks.push({ t: v.until, slot, cats: [c.from, i + 1 < c.via.length ? c.via[i + 1].to : c.to] }));
        marks.push({ t: c.at + (still ? 0 : C.out), slot, cats: [c.to] });
      }
      marks.sort((a, b) => a.t - b.t);
      const held: number[][] = [[base], [base]];
      const out: { t: number; cat: number }[] = [];
      let target = base;
      for (const m of marks) {
        held[m.slot - row * 2] = m.cats;
        let most = held[0][0];
        for (const cat of [...held[0], ...held[1]]) if (tall[row][cat] > tall[row][most]) most = cat;
        if (tall[row][most] !== tall[row][target]) { target = most; out.push({ t: m.t, cat: most }); }
      }
      return out;
    });
    const last = presses.length ? presses[presses.length - 1].t : -1;
    quietAt = last + C.length * (1 + C.lag) + C.seat + C.tail;
    count++;
  };

  const cache: { t: number; n: number; z: State | null } = { t: NaN, n: -1, z: null };
  const at = (t: number): State => {
    if (cache.z && cache.t === t && cache.n === count) return cache.z;
    if (!tall.length) measure();
    const z: State = { busy: t < quietAt, cards: [], give: [], below: [], shown: [], gone: [], clear: [], rows: [], bow: [], fronts: [], knock: 0, stone: [0, 0], met: 0 };
    for (let slot = 0; slot < places; slot++) {
      let c: Change | null = null;
      for (const k of changes[slot]) if (k.at <= t) c = k;
      const u = c ? t - c.at : Infinity;
      if (!c || u >= C.seat || still) {
        z.cards.push({ cat: c ? c.to : base, slot, alpha: 1, dy: 0, leaving: false });
        const v = u - C.seat;
        // Struck, the stream springs off the card and bounces to rest on it: below nothing here means away from the
        // card, and it never goes the other way, into it.
        z.give.push(c && !c.quiet && !still && v < C.spring[3] ? -Math.exp(-C.spring[1] * v) * Math.abs(Math.sin(C.spring[2] * v)) : 0);
        z.below.push(0); z.shown.push(1); z.gone.push(Infinity); z.clear.push(0);
        continue;
      }
      let to = c.to;
      for (const v of c.via) if (t < v.until) { to = v.to; break; }
      // The old card drops first and is gone at the end of its fall: faded from the start, it would be a fade in place.
      let below = Infinity, shown = 0, gone = Infinity, faded = 1;
      if (u < C.out) {
        const q = u / C.out;
        gone = C.drop * q * (0.35 + 0.65 * q); faded = q * q * q;
        z.cards.push({ cat: c.from, slot, alpha: 1 - faded, dy: gone, leaving: true });
      }
      if (u >= C.in) {
        const q = (u - C.in) / (C.seat - C.in);
        // The new card comes up gathering speed and is stopped by its seat, so it meets the stream moving. It is
        // solid before it gets there.
        below = C.rise * (1 - q ** C.arrive);
        shown = smooth((q - C.ghost) / 0.18);
        z.cards.push({ cat: to, slot, alpha: shown, dy: below, leaving: false });
      }
      z.give.push(c.quiet ? 0 : smooth(u / C.sagIn));
      z.below.push(below); z.shown.push(shown); z.gone.push(gone); z.clear.push(c.quiet ? 0 : faded * faded * (1 - shown) ** 1.5);
    }
    parts.rows.forEach((_, row) => {
      let h0 = tall[row][base], h1 = h0, t1 = -Infinity, bow = 0;
      const value = (when: number) => h0 + (h1 - h0) * (still ? 1 : smooth((when - t1) / C.row));
      for (const e of rowEvents[row]) {
        if (e.t > t) break;
        h0 = value(e.t); h1 = tall[row][e.cat]; t1 = e.t;
        if (!still) bow += (h0 - h1) * C.bow[0] * Math.exp(-(t - e.t) / C.bow[1]) * Math.sin((2 * Math.PI * (t - e.t)) / C.bow[2]);
      }
      z.rows.push(value(t));
      z.bow.push(bow);
    });
    for (const f of fronts) {
      const e = t - f.t0;
      const left = Math.max(0, Math.min(1, (C.length + C.fade - e) / C.fade)) * (1 - smooth((t - f.cut) / C.cut));
      if (e >= 0 && left > 0) z.fronts.push({ side: f.side, phase: e / C.length, near: f.near, left });
    }
    const since = (list: number[]) => { let e = Infinity; for (const k of list) if (k <= t) e = Math.min(e, t - k); return e; };
    const k = since(knocks);
    z.knock = k < 0.5 ? C.jolt * Math.exp(-k / 0.07) * Math.cos(k * 42) : 0;
    z.stone = [Math.exp(-since(stones[0]) / 0.45), Math.exp(-since(stones[1]) / 0.45)];
    z.met = Math.exp(-since(mets) / 0.5);
    cache.t = t; cache.n = count; cache.z = z;
    return z;
  };

  // ---- the page's part: which cards show and where, and each row's height
  const was = parts.cards.map((set) => set.map(() => ''));
  const flow = parts.rows.map(() => first);
  let wrote = '', knocked = '';
  const apply = (t: number) => {
    if (disposed) return;
    const z = at(t);
    const key = z.busy ? `${t}:${count}` : `rest:${count}`;
    if (key === wrote) return;
    wrote = key;
    const want = parts.cards.map((set) => set.map(() => 'hidden'));
    for (const c of z.cards) want[c.cat][c.slot] = c.alpha >= 1 && c.dy === 0 ? 'shown' : `${c.alpha.toFixed(3)}:${c.dy.toFixed(2)}`;
    parts.cards.forEach((set, cat) => set.forEach((card, slot) => {
      const now = want[cat][slot];
      if (now === was[cat][slot]) return;
      was[cat][slot] = now;
      const host = hosts[cat][slot];
      if (host) plates.setShown(host, now !== 'hidden');
      const s = card.style;
      if (now === 'hidden') { s.visibility = 'hidden'; s.opacity = ''; s.translate = ''; return; }
      s.visibility = 'visible';
      if (now === 'shown') { s.opacity = ''; s.translate = ''; return; }
      const [alpha, dy] = now.split(':');
      s.opacity = alpha;
      s.translate = `0 ${dy}px`;
    }));
    // A row's own layout holds the layer of the category it has settled on. While it is changing, its height is
    // set here, and it is handed back to the layout once it is still.
    parts.rows.forEach((el, row) => {
      const cats = z.cards.filter((c) => Math.floor(c.slot / 2) === row && !c.leaving).map((c) => c.cat);
      const settled = cats.every((c) => c === cats[0]) && Math.abs(z.rows[row] - tall[row][cats[0]]) < 0.05 && !z.cards.some((c) => Math.floor(c.slot / 2) === row && (c.leaving || c.dy !== 0));
      if (settled) {
        if (flow[row] !== cats[0]) {
          parts.layers[row].forEach((layer, cat) => { layer.dataset.current = String(cat === cats[0]); });
          flow[row] = cats[0];
        }
        el.style.height = '';
      } else el.style.height = `${z.rows[row].toFixed(2)}px`;
    });
    // The bar's words stand over the stream's canvas, each on its own. The jolt is handed to them and not set on
    // the bar: a bar that is moved gathers its words into itself, and they go under the canvas for as long.
    const jolt = z.knock ? `${z.knock.toFixed(2)}px` : '';
    if (jolt !== knocked) { knocked = jolt; if (jolt) parts.bar.style.setProperty('--knock', jolt); else parts.bar.style.removeProperty('--knock'); }
  };

  const press = (cat: number, x: number | null, t: number) => {
    measure();
    // Presses that are long done are folded into where the cards stand, so the record never grows.
    if (!clock.isFrozen() && presses.length && t > quietAt + 1) { base = presses[presses.length - 1].cat; presses = []; plan(); }
    // Picking the category that is already showing, or already on its way, does nothing.
    if (cat === (presses.length ? presses[presses.length - 1].cat : base)) return;
    presses.push({ t, cat, x, surge: !!stops && stops.reached() });
    presses.sort((a, b) => a.t - b.t);
    plan();
  };
  plan();
  const off = clock.onFrame((t) => apply(t));
  // streamPress(category, at, across) scripts a press for a filmstrip: at is the clock's time, across is where on
  // the bar it lands, 0 to 1 from its left end, and left out it lands on that category's own button.
  registry.tool('streamPress', (cat: number, when: number, across?: number) => {
    const r = parts.bar.getBoundingClientRect(), n = parts.cards.length;
    press(cat, r.left + r.width * (across ?? (cat + 0.5) / n), when);
  });

  return {
    press(category: number, x?: number) { press(category, x ?? null, clock.now()); apply(clock.now()); },
    at,
    strikes: () => struck,
    fronts: () => fronts,
    version: () => count,
    bind(next: Stops | null) { stops = next; measure(); plan(); },
    dispose() { disposed = true; off(); },
  };
}
