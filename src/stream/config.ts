import type { Tier } from '../config/site';

// The stream's constants. Lengths are in stream units: one unit is one CSS pixel on a desktop screen, and the whole
// stream is scaled by unitFor() so it sits the same on a phone and on a 4K screen.

export const STREAM = {
  seed: 7,
  // How big the whole stream is drawn. At 1 its sheath of shards is about 60 pixels across on a desktop screen.
  scale: 1.25,
  stepsPerSecond: 120,
  // Where on the screen the leading end comes to rest, as a fraction of its height.
  anchor: 0.66,
  // A held frame is scrolled so the leading ends sit this far down the screen, which leaves room for the card below.
  heldAt: 0.57,
  // The canvas is taller than the screen by this much above and below, so a fast scroll never outruns it.
  margin: 110,
  // Frozen or still, sparks and thrown shards are run forward this long from nothing, so the same frame always draws.
  warmSeconds: 3.2,

  route: {
    sample: 3,          // distance between the route's stored points
    above: 3,           // how far over a surface the core runs: it lies on it
    beside: 62,         // how far out from the title's ends it comes down
    past: 58,           // how far past the card's end it falls
    edge: 56,           // the nearest it comes to either side of the screen
    // Each turn: how early it leaves the run it is on, and how late it joins the next.
    turn: { part: [50, 64], left: [92, 150], right: [72, 196], land: [74, 52], lip: [62, 176] },
    sway: 15,           // how far a free run wanders to each side
    swayLong: 640,
    swayShort: 270,
    start: -180,        // where it comes in, above the top of the page
  },

  head: {
    follow: 10,         // how hard the leading end is drawn to where the scroll puts it, per second
    creep: 120,         // the least speed it will finish a move at
    hold: 0.45,         // seconds the pace of the last scroll is remembered for
    across: 0.55,       // along a sideways run it may go this much faster than the scroll: 1 over it
    most: 2600,         // it never runs faster than this
    quick: 16,          // how fast its speed can change, per second
    pace: 1400,         // the speed at which its energy is full
    rise: 14,           // energy builds this fast, per second
    fall: 1.7,          // and settles this fast
  },

  shards: {
    flow: 22,           // how fast they ride along the core
    near: 6,            // nearest and farthest they circle from the core
    far: 30,
    orbit: 0.34,        // how fast the whole sheath turns round the core
    wind: 250,          // one full turn of the sheath takes this much of the route
    clump: 95,          // they gather and thin along the route in waves about this long
    flare: 1.25,        // how far they are thrown wide at the leading end, at rest
    flareFast: 2.6,     // and more with its energy
    flareOver: 46,      // the flare dies away over this distance behind the leading end
    grow: 16,           // a shard reaches full size this far behind the leading end
    glass: 0.4,         // the share that is glass
    small: 3.4,         // sizes, as the distance from center to tip
    large: 13.5,
    depth: 0.0011,      // how much nearer shards are drawn larger
    turn: 170,          // within this distance of the cursor a shard turns to face it
  },

  loose: {
    gravity: 760,
    bounce: 0.46,
    grip: 0.72,         // how much sideways speed a bounce keeps
    life: [1.3, 2.6] as [number, number],
    fade: 0.3,          // the share of its life over which it shrinks away at the end
    trickle: 5,         // thrown each second at a landing at rest
    burst: 70,          // thrown when the leading end arrives at speed
  },

  sparks: {
    gravity: 520,
    drag: 1.5,
    life: [0.22, 1.15] as [number, number],
    speed: [50, 430] as [number, number],
    shutter: 1 / 6,
    bounce: 0.36,
    rest: 90,           // each second from a leading end at rest
    fast: 700,          // and at full energy
    along: 14,          // each second along every thousand units of core
    landing: 16,        // each second at a landing
    fork: 0.14,         // the share that burst into finer sparks
  },

  arc: {
    steps: 6,
    life: [0.08, 0.24] as [number, number],
    reach: [22, 74] as [number, number],
    rate: 70,           // new forks each second at rest
    rateFast: 80,
  },
} as const;

export const STREAM_STEP = 1 / STREAM.stepsPerSecond;

export interface StreamBudget {
  per100: number;       // riding shards to every hundred units of route
  loose: number;        // thrown shards in the air at once
  sparks: number;
  pixelRatio: number;
  pixels: number;       // the canvas never has more than this many
  samples: number;      // multisampling of the shards' edges
  split: boolean;       // glass takes three samples and splits them warm
  levels: number;       // steps in the glow
}

export const STREAM_BUDGET: Record<Exclude<Tier, 'static'>, StreamBudget> = {
  high: { per100: 55, loose: 260, sparks: 700, pixelRatio: 2, pixels: 9.6e6, samples: 4, split: true, levels: 6 },
  mid: { per100: 38, loose: 120, sparks: 300, pixelRatio: 3, pixels: 3.8e6, samples: 4, split: false, levels: 6 },
  low: { per100: 26, loose: 60, sparks: 160, pixelRatio: 1.5, pixels: 1.7e6, samples: 2, split: false, levels: 5 },
};

// Stream units to CSS pixels for a screen this wide, with the page's root font size in pixels.
export function unitFor(width: number, rootPx: number): number {
  const narrow = width < 600 ? 0.72 : width < 1000 ? 0.86 : 1;
  return (rootPx / 16) * narrow * STREAM.scale;
}
