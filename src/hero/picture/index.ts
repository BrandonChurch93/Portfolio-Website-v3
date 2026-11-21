import { CORE, HOST, SOURCE, drawn } from '../../pieces/world/layout';
import { clock } from '../../world/clock';
import { carried, drift, ridden } from './drift';
import { PICTURE, type Chip, type Group, type Layers, type Ride, type Rider, type Sprite } from './plan';
import styles from './picture.module.css';

// The hero's world as pictures, where the live world is too much for a device to hold (pictured in
// src/world/device.ts): the planet as one picture, and what broke away as families of pictures that drift as the
// live families do (./drift.ts). Everything the stream's light changes (the neck of light under the core, the rock
// beside it, the pieces near the stream's line, the chips it carries) is there a second time with that light, under
// a cover that comes down with the stream's leading end, so the light follows the stream as it does on the live
// world. The page's stream is the page's own and leaves the core as it always does. No canvas, and nothing but
// transforms changes from frame to frame. scripts/world/picture.mjs takes the pictures (npm run picture).

export interface WorldPicture {
  // The page's stream: how much of it is there, the seconds since it set off, and how far under the core's foot its
  // leading end has run, in units. The same as the live world is told.
  setStream(on: number, since: number, long?: number): void;
  // Whether every picture has come.
  whole(): boolean;
  dispose(): void;
}

const S = PICTURE.scale;
const U = (n: number): string => `calc(var(--u) * ${Number(n.toFixed(2))})`;
const file = (name: string): string => `${PICTURE.dir}/${name}?v=${process.env.NEXT_PUBLIC_BUILD ?? 'dev'}`;
const make = (cls: string, parent: Element, tag = 'div'): HTMLElement => { const e = document.createElement(tag); e.className = cls; parent.appendChild(e); return e; };
// How near the screen it has to be to move, and to hold its layers at all, as shares of the screen's height.
const NEAR = { moves: 0.15, holds: 1.2 };
// A group nearer the visitor than this, in units, is laid over the chips the stream carries, which fall just behind
// it. One nearer than the core's own middle is laid over the neck of light too.
const FRONT = CORE.at[2] - 40;

export function mountPicture(host: HTMLElement, opts: { onReady?: () => void; onProgress?: (share: number) => void } = {}): WorldPicture {
  const root = make(styles.world, host), planet = make(styles.planet, root, 'img') as HTMLImageElement;
  root.setAttribute('aria-hidden', 'true');
  planet.alt = '';
  planet.decoding = 'async';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let disposed = false, ready = false, px = host.offsetWidth / HOST.wide, moves = true, placed = false;
  const stream = { on: 0, long: 0 };
  const movers: { g: Group; els: HTMLElement[]; was: string }[] = [], chips: { c: Chip; el: HTMLElement; was: string }[] = [], riders: { r: Rider; el: HTMLElement; was: string }[] = [];
  let ride: Ride | null = null;
  let reach: HTMLElement | null = null, hold: HTMLElement | null = null, lane: Layers['lane'] = [0, 0, 0, 0], tall = 0, cover = '', shown = '';

  const cut = (parent: Element, s: Sprite, ox: number, oy: number, pages: Layers['pages'], lit: boolean): void => {
    const at = lit && s.lit ? s.lit : s.at, [pw, ph] = pages[at[0]], e = make(styles.cut, parent, 'i');
    Object.assign(e.style, { left: U(s.box[0] - ox), top: U(s.box[1] - oy), width: U(s.box[2]), height: U(s.box[3]), backgroundImage: `url(${file(PICTURE.page(at[0]))})`, backgroundSize: `${U(pw / S)} ${U(ph / S)}`, backgroundPosition: `${U(-at[1] / S)} ${U(-at[2] / S)}` });
  };
  const within = (b: readonly number[]): boolean => b[0] < lane[0] + lane[2] && lane[0] < b[0] + b[2] && b[1] < lane[1] + lane[3] && lane[1] < b[1] + b[3];
  const group = (parent: Element, g: Group, ox: number, oy: number, pages: Layers['pages'], lit: boolean): HTMLElement => {
    const e = make(styles.group, parent), d = drawn(g.at[0], g.at[1], g.at[2]);
    e.style.transformOrigin = `${U(HOST.wide / 2 + d[0] - ox)} ${U(d[1] - oy)}`;
    for (const t of g.tiles) {
      if (lit && !within(t.box)) continue;
      const te = make(styles.tile, e);
      Object.assign(te.style, { left: U(t.box[0] - ox), top: U(t.box[1] - oy), width: U(t.box[2]), height: U(t.box[3]) });
      for (const s of t.sprites) cut(te, s, t.box[0], t.box[1], pages, lit);
    }
    return e;
  };

  const build = (L: Layers): void => {
    lane = L.lane;
    tall = lane[3] + PICTURE.soft;
    const field = make(styles.field, root);
    reach = make(styles.reach, root);
    Object.assign(reach.style, { left: U(lane[0]), top: U(lane[1] - tall), width: U(lane[2]), height: U(tall) });
    reach.style.setProperty('--soft', String(PICTURE.soft));
    hold = make(styles.hold, reach);
    hold.style.top = U(tall);
    if (L.rock) cut(hold, L.rock, lane[0], lane[1], L.pages, false);
    let carriedIn = false, necked = false;
    // The shards that ride the neck go round the back of it: they are laid under it.
    const neck = (): void => {
      necked = true;
      ride = L.ride;
      if (ride && L.riders.length) for (let i = 0; i < PICTURE.riding; i++) {
        const r = L.riders[i % L.riders.length], [pw, ph] = L.pages[r.on[0]], e = make(styles.chip, hold!, 'i');
        Object.assign(e.style, { width: U(r.size[0]), height: U(r.size[1]), backgroundImage: `url(${file(PICTURE.page(r.on[0]))})`, backgroundSize: `${U(pw / S)} ${U(ph / S)}`, backgroundPosition: `${U(-r.on[1] / S)} ${U(-r.on[2] / S)}` });
        riders.push({ r, el: e, was: '' });
      }
      if (L.neck) cut(hold!, L.neck, lane[0], lane[1], L.pages, false);
    };
    const carry = (): void => {
      carriedIn = true;
      for (const c of L.chips) {
        const [pw, ph] = L.pages[c.on[0]], e = make(styles.chip, hold!, 'i');
        Object.assign(e.style, { width: U(c.size[0]), height: U(c.size[1]), backgroundImage: `url(${file(PICTURE.page(c.on[0]))})`, backgroundSize: `${U(pw / S)} ${U(ph / S)}`, backgroundPosition: `${U(-c.on[1] / S)} ${U(-c.on[2] / S)}` });
        chips.push({ c, el: e, was: '' });
      }
    };
    for (const g of L.groups) {
      const els = [group(field, g, 0, 0, L.pages, false)];
      if (g.lane) {
        if (!carriedIn && g.at[2] > FRONT) carry();
        if (!necked && g.at[2] > CORE.at[2]) { if (!carriedIn) carry(); neck(); }
        els.push(group(hold, g, lane[0], lane[1], L.pages, true));
      }
      movers.push({ g, els, was: '' });
    }
    if (!carriedIn) carry();
    if (!necked) neck();
  };

  const frame = (): void => {
    if (disposed || !ready || !moves || !reach || !hold || px <= 0) return;
    const t = reduced ? 0 : clock.now();
    if (!reduced || !placed) {
      for (const m of movers) {
        const [dx, dy, turn] = drift(m.g, t), to = `translate3d(${(dx * px).toFixed(1)}px,${(dy * px).toFixed(1)}px,0) rotate(${turn.toFixed(2)}deg)`;
        if (to === m.was) continue;
        m.was = to;
        for (const e of m.els) e.style.transform = to;
      }
      placed = true;
    }
    const on = stream.on.toFixed(2);
    if (on !== shown) { shown = on; reach.style.opacity = on; }
    if (stream.on <= 0) return;
    // The cover's foot is at the stream's leading end.
    const end = drawn(SOURCE[0], SOURCE[1], SOURCE[2])[1] + stream.long, down = (Math.min(tall, Math.max(0, end - lane[1])) * px).toFixed(1);
    if (down !== cover) { cover = down; reach.style.transform = `translate3d(0,${down}px,0)`; hold.style.transform = `translate3d(0,-${down}px,0)`; }
    for (const k of chips) {
      const [x, y, size] = carried(k.c, t, stream.long, HOST.wide);
      const to = size < 0.02 ? 'scale(0)' : `translate3d(${((x - k.c.size[0] / 2 - lane[0]) * px).toFixed(1)}px,${((y - k.c.size[1] / 2 - lane[1]) * px).toFixed(1)}px,0) scale(${size.toFixed(2)})`;
      if (to === k.was) continue;
      k.was = to;
      k.el.style.transform = to;
    }
    if (ride) riders.forEach((k, i) => {
      const [x, y, size] = ridden(i, ride!, t, stream.long, HOST.wide);
      const to = size < 0.02 ? 'scale(0)' : `translate3d(${((x - k.r.size[0] / 2 - lane[0]) * px).toFixed(1)}px,${((y - k.r.size[1] / 2 - lane[1]) * px).toFixed(1)}px,0) scale(${size.toFixed(2)})`;
      if (to === k.was) return;
      k.was = to;
      k.el.style.transform = to;
    });
  };

  const sized = new ResizeObserver(() => { px = host.offsetWidth / HOST.wide; for (const m of movers) m.was = ''; for (const k of [...chips, ...riders]) k.was = ''; cover = ''; placed = false; });
  sized.observe(host);
  const near = new IntersectionObserver((es) => { moves = es.some((e) => e.isIntersecting); }, { rootMargin: `${NEAR.moves * 100}% 0px` });
  const held = new IntersectionObserver((es) => { root.toggleAttribute('data-far', !es.some((e) => e.isIntersecting)); }, { rootMargin: `${NEAR.holds * 100}% 0px` });
  near.observe(host);
  held.observe(host);
  const off = clock.onFrame(frame);

  // The planet first, which is all of the first screen. Then the list of what broke away and its pages.
  const got = (img: HTMLImageElement, src: string): Promise<void> => { img.src = src; return img.decode().catch(() => undefined); };
  void (async () => {
    try {
      const list = fetch(file(PICTURE.layers)).then((r) => { if (!r.ok) throw new Error(`${PICTURE.layers} is missing (${r.status})`); return r.json() as Promise<Layers>; });
      await got(planet, file(PICTURE.planet));
      opts.onProgress?.(0.7);
      opts.onReady?.();
      const L = await list;
      await Promise.all(L.pages.map((_, i) => got(new Image(), file(PICTURE.page(i)))));
      if (disposed) return;
      build(L);
    } catch (e) {
      console.warn(`world: its pictures could not all be had. ${String(e)}`);
      opts.onReady?.();
    } finally {
      ready = true;
    }
  })();

  return {
    setStream(on, since, long = 0) { stream.on = Math.min(1, Math.max(0, on)); stream.long = long; },
    whole: () => ready,
    dispose() {
      disposed = true;
      off();
      sized.disconnect();
      near.disconnect();
      held.disconnect();
      root.remove();
    },
  };
}
