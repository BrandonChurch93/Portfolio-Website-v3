import { registry } from '../hooks/registry';
import { lamp } from '../lamp/lamp';
import { CARD } from '../metal/mask';
import { plates } from '../metal/renderer';
import { WAKE, advance, asleep, band, edge, veil, type Band, type Start } from '../metal/wake';
import type { PadPiece } from '../pieces/pad/index';
import { FILL, LAUNCH, ROCKET, TABLE, TOWER, burn, climbed } from '../pieces/pad/layout';
import { STREAM } from '../stream/config';
import type { Box, Rail } from '../stream/route';
import { routeThroughContact } from '../stream/route-contact';
import type { StreamHost } from '../skills/stage';
import { mountStream, type PlanContext, type Planned, type StreamHandle } from '../stream/stream';
import { clock } from '../world/clock';
import { tiers } from '../world/tier';
import { BOARD, CONTACT, LANDS, SHOW, onBoard } from './board';

// What the stream does to Contact. The page lays the section out. This hands the stream's planner the places
// (plan), and in every frame the stream draws it runs what the landing sets going (frame): the plate woken by its
// band, the stone lit from its rim to its middle, the rocket lit from its foot up and launched when the stone is
// full. All of it follows from how long the stream has been on the stone, so it runs back when the stream draws
// back: the rocket comes down, the stone goes dark from its middle out, and the plate goes back to sleep.

export interface ContactParts {
  page: HTMLElement;
  board: HTMLElement;
  contact: HTMLElement;
  pad: () => PadPiece | null;
}

export interface ContactStage { dispose(): void }

// Lines along the stone's top face that what the landing throws comes to rest on, in the pad's units: from where
// across and how far toward the visitor to where. They run the stone's whole width, under the table too, where a
// shard is not drawn: one that came to rest there must not fall on through and show again under the stone.
const RESTS: [number, number, number, number][] = [[-316, 0, 316, 0], [-262, 150, 262, 150], [-262, -150, 262, -150]];
// How far round the table, the tower and the rocket the stream's shards are kept off, in units.
const CLEAR = 14;
// The engine's fire on the plate: how strongly it lights the plate's near edge at full thrust, and how far up the
// rocket has to have climbed, in units, for that light to have gone.
const FIRE = { on: 0.9, gone: 900 };
// How strongly the stream's leading end lights the sleeping plate. It falls a good way from the plate, so it is a
// faint light on the plate's near edge: any stronger, it took the knob's shadow from the room's light and threw it
// across the plate as one long bar.
const END = 0.25;
// A jump of this many seconds in how long the stream has been on the stone is no passing of time: the page was
// opened there, or a still was asked for. Everything is put where it would have come to rest.
const JUMP = 1;

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ramp = (v: number, [a, b]: [number, number]) => { const k = clamp((v - a) / (b - a)); return k * k * (3 - 2 * k); };

export function mountContact(parts: ContactParts, host?: StreamHost): ContactStage {
  const q = <T extends HTMLElement = HTMLElement>(part: string) => parts.contact.querySelector<T>(`[data-part="${part}"]`)!;
  const title = q('title'), plate = q('plate'), content = q('content');
  const metal = plate.querySelector<HTMLElement>('[data-kind="card"]');

  let stream: StreamHandle | null = null, disposed = false;
  // The page's own count of how long the stream has been on the stone, in seconds. It runs up with the stream's and
  // comes down faster than it went up.
  const FULL = FILL.run + LAUNCH.end;
  let lit = 0, before = 0, on = false, last = clock.now();
  const wake: Band = asleep(), wipe = new Float32Array(3);
  let size = { hw: 1, hh: 1, unit: 1 }, wore = '', held: number | null = null;
  let pointerOn = false, focusOn = false, entered: Start = [0, 0, -1, 0];
  let keepOff: Box[] = [], k = 1;
  // Where the route lands and where it comes in, on the page, for the light the stream's end lays on the blank.
  let route = { x0: 0, x1: 0, y1: 0, l: 0, t: 0 }, origin = { x: 0, y: 0 };

  const set = (() => {
    const was = new Map<string, string>();
    return (key: string, el: HTMLElement, name: string, value: string) => { if (was.get(key) === value) return; was.set(key, value); el.style.setProperty(name, value); };
  })();

  const measure = () => { size = { hw: plate.offsetWidth / 2, hh: plate.offsetHeight / 2, unit: plate.offsetWidth / CARD.width }; };
  const sized = new ResizeObserver(measure);
  sized.observe(plate);
  measure();

  const plan = (c: PlanContext): Planned => {
    const B = c.box(parts.board), top = c.box(parts.contact).t;
    k = (B.r - B.l) / BOARD.w;
    const at = ([x, y]: [number, number]) => ({ x: B.l + x * k, y: top + y * k });
    const land = at(LANDS), from = c.from ?? { x: B.l + CONTACT.in * k, y: STREAM.route.start * c.unit };
    const rests: Rail[] = RESTS.map(([x0, z0, x1, z1]) => { const a = at(onBoard(x0, 0, z0)), b = at(onBoard(x1, 0, z1)); return { ax: a.x, ay: a.y, bx: b.x, by: b.y, half: c.unit }; });
    // The table, the tower and the rocket, as one box from the tower's lamp down to the table's near legs.
    const a = at(onBoard(Math.min(TABLE.l, TOWER.l) - CLEAR, TOWER.lamp + CLEAR, 0)), b = at(onBoard(Math.max(TABLE.r, ROCKET.fin) + CLEAR, 0, TABLE.deep / 2 + CLEAR));
    keepOff = [c.box(plate), c.box(title), { l: a.x, t: a.y, r: b.x, b: b.y }];
    route = { x0: from.x, x1: land.x, y1: land.y, l: B.l, t: top };
    // Where the page itself is in the document, so a place on it can be told to a plate as a place on the screen.
    const pr = parts.page.getBoundingClientRect();
    origin = { x: pr.left + scrollX, y: pr.top + scrollY };
    return {
      route: routeThroughContact({ width: c.width, unit: c.unit, view: c.view, board: k, from, joined: !!c.from, land, inward: -1, seat: top + (CONTACT.h + CONTACT.seat) * k, rests }),
      after: frame,
      off: (x, y) => keepOff.some((o) => x >= o.l && x <= o.r && y >= o.t && y <= o.b),
    };
  };

  const frame = (t: number) => {
    if (disposed) return;
    const whole = !stream || !stream.runs(), pad = parts.pad();
    const dt = Math.max(0, t - last);
    last = t;
    const since = whole ? 0 : stream!.since('land'), d = since - before, jump = Math.abs(d) > JUMP;
    before = since;
    on = since > 0 && (d > 0 || (d === 0 && on));
    lit = Math.max(0, Math.min(FULL, lit + (d > 0 ? d : d * (lit > FILL.run ? LAUNCH.back : FILL.back))));
    if (jump) lit = on ? FULL : 0;

    // With the stream not running, the plate is awake, the stone is lit and the rocket stands on its table.
    const fill = whole ? 1 : clamp(lit / FILL.run), age = whole ? 0 : lit - FILL.run;
    if (pad) {
      const hit = whole ? null : stream!.struck('stone');
      pad.setFill(fill);
      pad.setLaunch(age);
      pad.setStream(hit ? hit.on : 1, hit ? t - hit.at : 60);
    }

    // The plate: one band, from its corner nearest the landing when the stream wakes it.
    const { hw, hh, unit } = size, struck = edge(hw * (2 * SHOW.from[0] - 1), hh * (2 * SHOW.from[1] - 1), hw, hh);
    // The plate is the first thing the landing brings on, so it is the last to go: it stays awake until the rocket is
    // down and the stone has all but gone dark, and its band is back as the stone's last light goes.
    const streamOn = whole || on || lit > WAKE.cross * FILL.back, pointer = pointerOn || focusOn;
    if (held !== null) { wake.across = held; wake.from = struck; }
    else if (jump || whole) { wake.across = streamOn || pointer ? 1 : 0; wake.from = struck; wake.stream = true; }
    else advance(wake, streamOn, pointer, struck, entered, dt);
    const awake = wake.across >= 1, burning = awake ? 0 : band(wipe, hw, hh, unit, wake.from, wake.across);
    if (metal) {
      const sx = origin.x - clock.view.x, sy = origin.y - clock.view.y;
      // The stream's leading end lights the blank as it falls past: it is about where the scroll has it, on the line
      // it falls down, and on the stone once it has landed.
      const landY = route.y1 + sy, y = on ? landY : Math.min(landY, STREAM.anchor * clock.view.h);
      plates.setEnd(metal, route.x0 + (route.x1 - route.x0) * clamp(landY > 0 ? y / landY : 1) + sx, y, whole ? 0 : END);
      // The engine's fire lights the plate's near edge until the rocket has climbed away.
      const fire = whole ? 0 : burn(age) * FIRE.on * clamp(1 - climbed(age) / FIRE.gone), engine = onBoard(0, ROCKET.mouth + climbed(age), 0);
      plates.setStream(metal, route.l + engine[0] * k + sx, route.t + engine[1] * k + sy, fire);
      plates.setBand(metal, awake ? null : wipe, burning);
    }
    const words = veil(awake ? null : wipe, hw, hh, unit);
    if (words !== wore) { wore = words; content.style.setProperty('--veil', words); }
    set('content:p', content, 'pointer-events', wake.across > 0.5 ? 'auto' : 'none');
    plate.toggleAttribute('data-awake', wake.across > 0);
    set('title:o', title, 'opacity', ramp(wake.across, SHOW.title).toFixed(3));
  };

  // Where the stream cannot run at all, the page is whole.
  const idle = clock.onFrame((t) => { if (!stream?.runs()) frame(t); });

  // A pointer put on the plate wakes it. A pointer at rest that the page is scrolled under does not: it has to move.
  let where = { x: NaN, y: NaN };
  const moved = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const was = where;
    where = { x: e.clientX, y: e.clientY };
    const r = plate.getBoundingClientRect(), inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) { pointerOn = false; return; }
    if (pointerOn || Number.isNaN(was.x) || (was.x === where.x && was.y === where.y)) return;
    pointerOn = true;
    entered = edge(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2, r.width / 2, r.height / 2);
  };
  const left = () => { pointerOn = false; };
  const tapped = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    const r = plate.getBoundingClientRect();
    pointerOn = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (pointerOn) entered = edge(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2, r.width / 2, r.height / 2);
  };
  addEventListener('pointermove', moved, { passive: true });
  addEventListener('pointerdown', tapped, { passive: true });
  document.documentElement.addEventListener('pointerleave', left);
  const focusIn = () => { focusOn = true; entered = edge(0, -size.hh, size.hw, size.hh); }, focusOut = (e: FocusEvent) => { if (!plate.contains(e.relatedTarget as Node | null)) focusOn = false; };
  plate.addEventListener('focusin', focusIn);
  plate.addEventListener('focusout', focusOut);

  const asked = new URLSearchParams(location.search).get('wake');
  if (asked !== null) held = clamp(Number(asked));
  registry.tool('contactWake', (amount?: number) => { held = amount === undefined ? null : clamp(amount); });
  registry.tool('contactState', () => ({ lit, on, fill: clamp(lit / FILL.run), launch: lit - FILL.run, across: wake.across, off: keepOff }));

  lamp.bind();
  tiers.detect();
  stream = host ? host(plan) : mountStream(parts.page, { plan });

  return {
    dispose() {
      disposed = true;
      idle();
      sized.disconnect();
      removeEventListener('pointermove', moved);
      removeEventListener('pointerdown', tapped);
      document.documentElement.removeEventListener('pointerleave', left);
      plate.removeEventListener('focusin', focusIn);
      plate.removeEventListener('focusout', focusOut);
      if (!host) stream?.dispose();
    },
  };
}
