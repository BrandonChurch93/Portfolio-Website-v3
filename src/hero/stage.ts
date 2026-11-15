import { lamp } from '../lamp/lamp';
import type { StreamHost } from '../skills/stage';
import { routeThroughHero } from '../stream/route-hero';
import { FALLS, GROUND, VIEW } from '../pieces/skycity/layout';
import { mountStream, type Fall, type PlanContext, type Planned, type StreamHandle } from '../stream/stream';
import { clock } from '../world/clock';
import { tiers } from '../world/tier';
import { BOARD, CITY, CX } from './board';

// What the stream does in the hero. The page lays the section out. This hands the stream's planner the places: the
// city's main fall, the keel of its rock, and Work's bar. The city is simply there: nothing in the hero waits for
// the stream. What changes with it is the cue at the foot of the first screen, which goes once the page is scrolled.

export interface HeroParts {
  page: HTMLElement;
  board: HTMLElement;
  // The city's host, and the thing the stream runs down to: what stands in for Work's bar on this page, or, on a
  // page that has Work under the hero, Work's title.
  city: HTMLElement;
  bar: () => HTMLElement | null;
  cue: HTMLElement | null;
}

export interface HeroStage { dispose(): void }

// How far the page has to be scrolled for the cue to have gone, in pixels.
const CUE = 120;
const D2R = Math.PI / 180;
// The falls off the rim, which are the stream's own light: how far under the rim's top each leaves it, how long
// each is before it has gone to nothing, in units, and the share of the stream's width they have. The main fall,
// under the spire, is the stream's own route.
const FALL = { under: 9, long: [150, 205, 170, 185, 215, 160], wide: 0.5 };
// On a page with Work under the hero, how far over Work's title the hero's route hands the stream to Work's, in units.
const SEAM = 170;

export function mountHero(parts: HeroParts, host?: StreamHost): HeroStage {
  let stream: StreamHandle | null = null, disposed = false, shown = '';

  const plan = (c: PlanContext): Planned => {
    const B = c.box(parts.board), k = (B.r - B.l) / BOARD.w, C = c.box(parts.city), to = parts.bar(), bar = to ? c.box(to) : { l: B.l, r: B.r, t: C.b, b: C.b };
    // The middle of the city's ground is a set distance over the foot of its host.
    const x = B.l + CX * k, ground = C.b - CITY.under * k;
    // The falls off the rim: each leaves the front of the rim at its place across the city and falls free.
    const falls: Fall[] = FALLS.map((fx, i) => {
      const y = ground + (Math.sqrt(Math.max(0, GROUND.r ** 2 - fx ** 2)) * Math.sin(VIEW.el * D2R) + FALL.under) * k;
      return { x: x + fx * k, from: y, to: y + FALL.long[i % FALL.long.length] * k, wide: FALL.wide };
    });
    return {
      falls,
      route: routeThroughHero({ width: c.width, unit: c.unit, board: k, fall: { x, y: ground + CITY.front * k }, keel: { x, y: ground + CITY.keel * k }, bar: { x: (bar.l + bar.r) / 2, y: bar.t - (host ? SEAM * k : 0) }, joined: !!host }),
      after: frame,
    };
  };

  const frame = () => {
    if (disposed || !parts.cue) return;
    const k = Math.max(0, 1 - clock.view.y / CUE).toFixed(2);
    if (k !== shown) { shown = k; parts.cue.style.opacity = k; }
  };
  const idle = clock.onFrame(() => { if (!stream?.runs()) frame(); });

  lamp.bind();
  tiers.detect();
  stream = host ? host(plan) : mountStream(parts.page, { plan });

  return {
    dispose() {
      disposed = true;
      idle();
      if (!host) stream?.dispose();
    },
  };
}
