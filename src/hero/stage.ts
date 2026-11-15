import { lamp } from '../lamp/lamp';
import type { StreamHost } from '../skills/stage';
import { routeThroughHero } from '../stream/route-hero';
import { mountStream, type PlanContext, type Planned, type StreamHandle } from '../stream/stream';
import { clock } from '../world/clock';
import { tiers } from '../world/tier';
import { BOARD, CITY, CX } from './board';

// What the stream does in the hero. The page lays the section out. This hands the stream's planner the places: the
// city's main fall, the keel of its rock, and Work's bar. The city is simply there: nothing in the hero waits for
// the stream. What changes with it is the cue at the foot of the first screen, which goes once the page is scrolled.

export interface HeroParts {
  page: HTMLElement;
  board: HTMLElement;
  // The city's host, and the thing the stream runs down to: Work's bar, or what stands in for it.
  city: HTMLElement;
  bar: HTMLElement;
  cue: HTMLElement | null;
}

export interface HeroStage { dispose(): void }

// How far the page has to be scrolled for the cue to have gone, in pixels.
const CUE = 120;

export function mountHero(parts: HeroParts, host?: StreamHost): HeroStage {
  let stream: StreamHandle | null = null, disposed = false, shown = '';

  const plan = (c: PlanContext): Planned => {
    const B = c.box(parts.board), k = (B.r - B.l) / BOARD.w, C = c.box(parts.city), bar = c.box(parts.bar);
    // The middle of the city's ground is a set distance over the foot of its host.
    const x = B.l + CX * k, ground = C.b - CITY.under * k;
    return {
      route: routeThroughHero({ width: c.width, unit: c.unit, board: k, fall: { x, y: ground + CITY.front * k }, keel: { x, y: ground + CITY.keel * k }, bar: { x: (bar.l + bar.r) / 2, y: bar.t }, joined: !!host }),
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
