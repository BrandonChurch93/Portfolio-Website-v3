import { registry } from '../hooks/registry';
import { plates } from '../metal/renderer';
import { clock } from '../world/clock';
import { STREAM } from './config';

// What happens when the category changes. Picking a category knocks the bar. From where the stream rests on each
// end of the bar a surge runs down that side at a steady speed, and each thing it passes answers as it passes: the
// first row's card lets go, the stone flares, the second row's card lets go, the rail and the meeting take a light
// strike. A card that lets go drops away, the new one comes up from below, and the stream strikes it as it seats.
//
// This module is the order and the timing of that, and the part of it that is the page's: which cards show and
// where. Everything is worked out from the presses so far and a time, so a frozen frame shows
// the same thing every time. The stream reads the same state (at) and does its own part: the surge in the line,
// the sag where a card is away, the strikes.

const C = STREAM.change;
// How long after it lets go a place's new card can first be seen.
const solidAt = C.in + C.ghost * (C.seat - C.in);

// The stops of one side, as the stream gives them: how far along from the bar to the meeting each is, 0 to 1.
export interface Stops {
  // For each side: the first row's card, the stone, the second row's card, the rail.
  at: [number[], number[]];
  // Whether the stream has reached the bar, which is where a surge starts. If it has not, nothing plays.
  reached: () => boolean;
  // Whether the stream is on the card in a place. Where it is not, the card is asleep, a blank like every other,
  // and a press changes what it will be with nothing to see.
  on: (place: number) => boolean;
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
  // For each place: how far the card that is leaving has dropped while it is still there to be lain on, and how
  // clear the place is of both cards, 0 to 1.
  gone: number[];
  clear: number[];
  // Each surge that is running: its side, how far it has come from the bar, where 1 is the meeting and past 1 it
  // is going on down, and how much of it a later press has left.
  fronts: { side: number; phase: number; left: number }[];
  // The bar's jolt, in pixels. Each stone's flare and the meeting's, 0 to 1.
  knock: number;
  stone: [number, number];
  met: number;
}

interface Press { t: number; cat: number; surge: boolean; asleep: boolean[] }
interface Change { at: number; from: number; to: number; quiet: boolean; unseen: boolean; via: { until: number; to: number }[] }

export interface SwapParts {
  bar: HTMLElement;
  // The rows of cards, top to bottom. layers[row][category] holds that category's cards for the row, and
  // cards[category][place] is a card, the places going by rows with the left one first.
  rows: HTMLElement[];
  layers: HTMLElement[][];
  cards: HTMLElement[][];
}

export interface Swap {
  // Pick a category. Wherever on the bar the press was, both sides start together.
  press(category: number): void;
  at(t: number): State;
  // The strikes of every press so far, and a number that changes when they do.
  strikes(): Strike[];
  // Each front: its side, when it leaves the bar, and when a later press cuts it off.
  fronts(): { side: number; t0: number; cut: number }[];
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
  let fronts: { side: number; t0: number; cut: number }[] = [];
  let struck: Strike[] = [];
  let stones: number[][] = [[], []];
  let mets: number[] = [];
  let knocks: number[] = [];
  let quietAt = -1;
  let count = 0;
  let disposed = false;
  const hosts = parts.cards.map((set) => set.map((card) => card.querySelector('[data-kind="card"]')));

  // Everything that follows from the presses, in order.
  const plan = () => {
    const T = C.length;
    changes = Array.from({ length: places }, () => []);
    fronts = []; struck = []; stones = [[], []]; mets = []; knocks = [];
    const arrive: { t: number; slot: number; quiet: boolean; only?: boolean; unseen?: boolean }[] = [];
    presses.forEach((p, n) => {
      // A later press cuts in: what an earlier surge had not reached yet is left to the new one, which takes every
      // card from the top again and in order, and the earlier front dies where it is.
      const cut = n + 1 < presses.length ? presses[n + 1].t : Infinity;
      if (!p.surge || !stops || still) {
        for (let slot = 0; slot < places; slot++) arrive.push({ t: p.t, slot, quiet: true, unseen: p.asleep[slot] });
        return;
      }
      knocks.push(p.t);
      // The press itself lets nothing go. But a card on its way in that cannot be seen yet becomes the newest at once.
      for (let slot = 0; slot < places; slot++) arrive.push(p.asleep[slot] ? { t: p.t, slot, quiet: true, unseen: true } : { t: p.t, slot, quiet: false, only: true });
      // Both sides start at the press, each from where it rests on the bar, so the two cards of a row let go
      // together and the two fronts reach the meeting together.
      for (let side = 0; side < 2; side++) {
        const t0 = p.t, at = stops.at[side];
        fronts.push({ side, t0, cut });
        const strike = (t: number, stop: Stop, hard: number, loose: number): void => { if (t < cut) struck.push({ t, stop, side, hard, loose }); };
        strike(t0, 'bar', C.knock, C.loose);
        // The two sides are not the same length, and a row's two cards still go together: each row is timed by the
        // two sides' mean.
        const both = stops.at, row = (n: number) => (both[0][n] + both[1][n]) / 2;
        // A card the stream is not on is a blank, and stays one: it does not drop, nothing rises and nothing strikes.
        for (const [t, slot] of [[t0 + T * row(0), side], [t0 + T * row(2), 2 + side]]) if (t < cut && !p.asleep[slot]) arrive.push({ t, slot, quiet: false });
        if (t0 + T * at[1] < cut) stones[side].push(t0 + T * at[1]);
        strike(t0 + T * at[1], 'stone', C.hard[2], 1);
        strike(t0 + T * at[3], 'rail', C.light, C.loose);
      }
      // Where the two fronts meet is the stream's own doing (sim.ts). The button takes its light then.
      if (p.t + T < cut) mets.push(p.t + T);
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
        open = { at: when, from, to: want, quiet: e.quiet, unseen: !!e.unseen, via: [] };
        changes[slot].push(open);
        continue;
      }
      for (const c of changes[slot]) if (!c.quiet) struck.push({ t: c.at + C.seat, stop: slot < 2 ? 'top' : 'side', side: slot % 2, hard: C.hard[slot < 2 ? 0 : 1], loose: 1 });
    }
    struck.sort((a, b) => a.t - b.t);
    const last = presses.length ? presses[presses.length - 1].t : -1;
    // A front goes on down past the meeting until it reaches the stream's leading end, which may be some way on.
    quietAt = last + C.length * 1.8 + C.seat + C.tail;
    count++;
  };

  const cache: { t: number; n: number; z: State | null } = { t: NaN, n: -1, z: null };
  const at = (t: number): State => {
    if (cache.z && cache.t === t && cache.n === count) return cache.z;
    const z: State = { busy: t < quietAt, cards: [], give: [], below: [], shown: [], gone: [], clear: [], fronts: [], knock: 0, stone: [0, 0], met: 0 };
    for (let slot = 0; slot < places; slot++) {
      let c: Change | null = null;
      for (const k of changes[slot]) if (k.at <= t) c = k;
      const u = c ? t - c.at : Infinity;
      if (!c || u >= C.seat || still || c.unseen) {
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
    for (const f of fronts) {
      const e = t - f.t0;
      const left = 1 - smooth((t - f.cut) / C.cut);
      if (e >= 0 && e < C.length * 1.8 && left > 0) z.fronts.push({ side: f.side, phase: e / C.length, left });
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
    // A row's own layout holds the layer of the category it has settled on. Every card is one size, so which layer
    // that is moves nothing.
    parts.rows.forEach((_, row) => {
      const cats = z.cards.filter((c) => Math.floor(c.slot / 2) === row && !c.leaving).map((c) => c.cat);
      const settled = cats.every((c) => c === cats[0]) && !z.cards.some((c) => Math.floor(c.slot / 2) === row && (c.leaving || c.dy !== 0));
      if (settled && flow[row] !== cats[0]) {
        parts.layers[row].forEach((layer, cat) => { layer.dataset.current = String(cat === cats[0]); });
        flow[row] = cats[0];
      }
    });
    // The bar's words stand over the stream's canvas, each on its own. The jolt is handed to them and not set on
    // the bar: a bar that is moved gathers its words into itself, and they go under the canvas for as long.
    const jolt = z.knock ? `${z.knock.toFixed(2)}px` : '';
    if (jolt !== knocked) { knocked = jolt; if (jolt) parts.bar.style.setProperty('--knock', jolt); else parts.bar.style.removeProperty('--knock'); }
  };

  const press = (cat: number, t: number) => {
    // Presses that are long done are folded into where the cards stand, so the record never grows.
    if (!clock.isFrozen() && presses.length && t > quietAt + 1) { base = presses[presses.length - 1].cat; presses = []; plan(); }
    // Picking the category that is already showing, or already on its way, does nothing.
    if (cat === (presses.length ? presses[presses.length - 1].cat : base)) return;
    presses.push({ t, cat, surge: !!stops && stops.reached(), asleep: Array.from({ length: places }, (_, slot) => !!stops && !still && !stops.on(slot)) });
    presses.sort((a, b) => a.t - b.t);
    plan();
  };
  plan();
  const off = clock.onFrame((t) => apply(t));
  // streamPress(category, at) scripts a press for a filmstrip: at is the clock's time.
  registry.tool('streamPress', (cat: number, when: number) => press(cat, when));

  return {
    press(category: number) { press(category, clock.now()); apply(clock.now()); },
    at,
    strikes: () => struck,
    fronts: () => fronts,
    version: () => count,
    bind(next: Stops | null) { stops = next; plan(); },
    dispose() { disposed = true; off(); },
  };
}
