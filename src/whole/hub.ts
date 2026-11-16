import { BOARD as SKILLS_BOARD, SKILLS } from '../skills/plan';
import type { StreamHost } from '../skills/stage';
import { join } from '../stream/join';
import type { Box } from '../stream/route';
import { mountStream, type PlanContext, type Planned, type StreamHandle, type WorkParts } from '../stream/stream';

// The whole page so far: the hero, Work, Skills and About, and Contact on one page, with one stream. Each section still lays
// itself out and runs its own stage. What it does not do here is mount a stream of its own: it hands this its part
// (Work its things on the page, the others their plans), and when all of them are in, this mounts the one stream:
// the hero's route, then Work's, then the other two plans' routes, each joined on the end of the one before
// (src/stream/join.ts).

// How far above where Skills takes the stream off its line Work's route hands it over, and how far above the top
// of Contact About's does, in the board's units.
const SEAM = { skills: 150, contact: 40 };
// On a screen too narrow for the layout the hero is a picture of the world, with the stream fallen from its core.
// The page's stream begins this far down that picture, where the picture's own is fading out, so one runs on as
// the other. With no picture it begins this many pixels over Work's title. And it ends this many pixels under
// Work's button.
const NARROW = { still: 0.8, over: 150, past: 26 };

type Plan = (c: PlanContext) => Planned;

export interface Hub {
  page(): HTMLElement | null;
  // Work's things on the page. It answers with what takes them away again.
  work(parts: { title: HTMLElement; work: WorkParts }): () => void;
  // The two sections under Work that plan their own routes, each with the element its section starts at.
  skills(top: HTMLElement): StreamHost;
  contact(top: HTMLElement): StreamHost;
  // The hero, over Work, and what it runs its stream down to: the top of Work's title.
  hero(): StreamHost;
  workTop(): HTMLElement | null;
  dispose(): void;
}

export function createHub(page: () => HTMLElement | null, has: { hero: boolean } = { hero: false }): Hub {
  let real: StreamHandle | null = null, gone = false;
  let work: { title: HTMLElement; work: WorkParts } | null = null;
  const plans: { skills: Plan | null; contact: Plan | null; hero: Plan | null } = { skills: null, contact: null, hero: null };
  const tops: { skills: HTMLElement | null; contact: HTMLElement | null } = { skills: null, contact: null };
  const wide = () => matchMedia(`(min-width: ${SKILLS_BOARD.least}px)`).matches;

  // What a section holds until the stream is there, and after.
  const handle: StreamHandle = {
    setLook: (l) => real?.setLook(l),
    since: (c) => real?.since(c) ?? 0,
    follow: (c, s) => real?.follow(c, s),
    struck: (n) => real?.struck(n) ?? { on: 0, at: -1e9, hard: 0 },
    reached: (c) => real?.reached(c) ?? 0,
    head: () => real?.head() ?? 0,
    nearest: (x, y, from) => real?.nearest(x, y, from) ?? 0,
    pulse: (from, to, seconds) => real?.pulse(from, to, seconds),
    strike: (n, hard) => real?.strike(n, hard),
    replan: () => real?.replan(),
    runs: () => real?.runs() ?? true,
    dispose: () => undefined,
  };

  const unit = (c: PlanContext, el: HTMLElement) => { const b = c.box(el); return (b.r - b.l) / SKILLS_BOARD.w; };

  const mount = () => {
    const host = page();
    if (real || gone || !host || !work) return;
    // A screen too narrow for the sections under Work shows them as plain stand ins, and Work runs its stream alone.
    // With the hero's stand in above it, the stream begins under the hero and not at the top of the page.
    if (!wide()) {
      const title = work.title, still = host.querySelector('[data-part="still"]');
      const begins = (box: (el: Element) => Box): number => {
        const b = still ? box(still) : null;
        return b && b.b - b.t > 1 ? b.t + (b.b - b.t) * NARROW.still : box(title).t - NARROW.over;
      };
      // Its two sides end at the foot of Work, beside the button. Run on to the foot of the page they crossed the
      // words of every section under it.
      const button = work.work.button;
      real = mountStream(host, { title, work: work.work, begins, until: (box) => box(button).b + NARROW.past });
      return;
    }
    if (!plans.skills || !plans.contact || !tops.skills || !tops.contact || (has.hero && !plans.hero)) return;
    const skills = plans.skills, contact = plans.contact, sTop = tops.skills, cTop = tops.contact;
    real = mountStream(host, {
      title: work.title,
      work: work.work,
      before: plans.hero ?? undefined,
      until: (box: (el: Element) => Box) => { const b = box(sTop); return b.t - (SKILLS.lead + SEAM.skills) * ((b.r - b.l) / SKILLS_BOARD.w); },
      plan: (c) => {
        const a = skills({ ...c, bottom: c.box(cTop).t - SEAM.contact * unit(c, cTop) });
        const br = a.route.branches[0], lead = br.len;
        const b = contact({ ...c, from: { x: br.x[br.n - 1], y: br.y[br.n - 1] } });
        return {
          route: join(a.route, b.route),
          rails: a.rails,
          after: (t) => { a.after?.(t); b.after?.(t); },
          off: (x, y) => !!a.off?.(x, y) || !!b.off?.(x, y),
          quiet: a.quiet && ((s) => (s > lead ? 1 : a.quiet!(s))),
        };
      },
    });
  };

  return {
    page,
    work(parts) { work = parts; mount(); return () => { work = null; real?.dispose(); real = null; }; },
    skills(top) { tops.skills = top; return (plan) => { plans.skills = plan; mount(); return handle; }; },
    contact(top) { tops.contact = top; return (plan) => { plans.contact = plan; mount(); return handle; }; },
    hero() { return (plan) => { plans.hero = plan; mount(); return handle; }; },
    workTop: () => work?.title ?? null,
    dispose() { gone = true; real?.dispose(); real = null; },
  };
}
