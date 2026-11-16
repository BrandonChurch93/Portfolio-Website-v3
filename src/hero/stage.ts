import { lamp } from '../lamp/lamp';
import type { StreamHost } from '../skills/stage';
import { routeThroughHero } from '../stream/route-hero';
import { SMALL, SOURCE, drawn, small } from '../pieces/world/layout';
import { mountStream, type Fall, type PlanContext, type Planned, type StreamHandle } from '../stream/stream';
import { clock } from '../world/clock';
import { tiers } from '../world/tier';
import { BOARD, CX, WORLD } from './board';

// What the stream does in the hero. The page lays the section out. This hands the stream's planner the places: the
// underside of the world's core, where the stream begins, the places on the torn face where other streams of the
// same light leave it, and Work's bar. The world is simply there: nothing in the hero waits for the stream. What changes with it is the cue at the foot of the first screen, which goes once the page is scrolled.

export interface HeroParts {
  page: HTMLElement;
  board: HTMLElement;
  // The world's host, and the thing the stream runs down to: what stands in for Work's bar on this page, or, on a
  // page that has Work under the hero, Work's title.
  city: HTMLElement;
  bar: () => HTMLElement | null;
  cue: HTMLElement | null;
  // The world, once it is mounted: it is told when the stream has set off from its core.
  world?: () => { setStream(on: number, since: number, long: number): void } | null;
}

export interface HeroStage { dispose(): void }

// How far the page has to be scrolled for the cue to have gone, in pixels.
const CUE = 120;
// How long the stream takes to come up to its whole strength once it has set off from the core, in seconds.
const RISE = 0.5;
// The small streams that leave the torn rock, which are the stream's own light: the share of the stream's width
// they have. Where each leaves and how long it is are the world's (SMALL in its layout). The one that leaves the
// core is the stream's own route.
const FALL = { wide: 0.5 };
// On a page with Work under the hero, how far over Work's title the hero's route hands the stream to Work's, in units.
const SEAM = 170;

export function mountHero(parts: HeroParts, host?: StreamHost): HeroStage {
  let stream: StreamHandle | null = null, disposed = false, shown = '', unit = 1;

  const plan = (c: PlanContext): Planned => {
    const B = c.box(parts.board), k = unit = (B.r - B.l) / BOARD.w, C = c.box(parts.city), to = parts.bar(), bar = to ? c.box(to) : { l: B.l, r: B.r, t: C.b, b: C.b };
    // Where a point of the world is drawn on the page.
    const x = B.l + CX * k, at = (p: readonly [number, number, number]) => { const d = drawn(p[0], p[1], p[2]); return { x: x + d[0] * k, y: C.t + d[1] * k }; };
    const falls: Fall[] = small().map((v, i) => {
      const p = at(v);
      return { x: p.x, from: p.y, to: p.y + SMALL[i][3] * k, wide: FALL.wide };
    });
    return {
      falls: WORLD.shown ? falls : [],
      route: routeThroughHero({ width: c.width, unit: c.unit, board: k, source: at(SOURCE), bar: { x: (bar.l + bar.r) / 2, y: bar.t - (host ? SEAM * k : 0) }, joined: !!host }),
      after: frame,
    };
  };

  const frame = () => {
    if (disposed) return;
    const since = stream ? stream.since('off') : -1;
    parts.world?.()?.setStream(since > 0 ? Math.min(1, since / RISE) : 0, since > 0 ? since : 60, stream ? stream.head() / unit : 0);
    if (!parts.cue) return;
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
