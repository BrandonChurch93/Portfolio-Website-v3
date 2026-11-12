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
  // Screens narrower than the first width get none of the extra presence a wide page needs, and screens as wide as
  // the second get all of it.
  presence: [600, 1400] as [number, number],
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
    // The route counts as lying on an object when it is within the first distance of one, and as clear of it by the second.
    hold: [8, 46] as [number, number],
    calm: 170,          // within this distance of an object the shards keep no knots
    // The room a shard has to each side of the route: an object further off than cap does not count, the first
    // soft units of room count for most, and a change in it is spread over this much of the route.
    room: { cap: 240, soft: 40, over: 90 },
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
    // The share of them that shows in the thinnest stretch and in the thickest knot. A knot of facets at full
    // strength hides the core.
    wave: [0.6, 0.9] as [number, number],
    aside: 0.18,        // how much quicker they pass in front of the core and behind it than they pass its sides
    round: 0.3,         // how rounded the turn is where one kept off an object swings back out
    flare: 1.25,        // how far they are thrown wide at the leading end, at rest
    flareFast: 2.6,     // and more with its energy
    flareOver: 46,      // the flare dies away over this distance behind the leading end
    grow: 16,           // a shard reaches full size this far behind the leading end
    clear: 0.45,        // the share that is clear, the rest being solid
    depth: 0.0011,      // how much nearer shards are drawn larger
    turn: 170,          // within this distance of the cursor a shard turns to face it
    // How far round it turns. A leaf is flat and can turn all the way. A facet turned all the way shows only its
    // broadest face, flat on, and loses its shape.
    face: { facets: 0.5, first: 0.85 } as Record<'facets' | 'first', number>,
    // Where the stream lies along an object its shards cannot go round the far side of the core, so all of them ride
    // the near side and would be twice as thick there. So there are this share fewer to a length of route on an
    // object, reached by each riding through faster, and they ride this much wider.
    thin: 0.4,
    spread: 0.42,
    apart: 56,          // the two sides carry their full number of shards once they are this far apart
    hook: 100,           // a turn this tight or tighter, near an object, is thinned as much as a run that lies on one
  },

  // Sizes, as the distance from a shard's center to its farthest point: the smallest and the largest. A facet is
  // mostly points, so it covers less than a leaf that reaches as far.
  sizes: { facets: [3.6, 13.5], first: [3.4, 13.5] } as Record<'facets' | 'first', [number, number]>,

  loose: {
    least: 1.3,         // the smallest shard thrown, against the smallest that rides
    gravity: 760,
    bounce: 0.58,       // the share of its fall a bounce keeps, give or take a quarter
    grip: 0.72,         // how much sideways speed a bounce keeps
    settle: 120,        // falling slower than this it no longer bounces
    // For the single shard thrown at rest only: how fast the flow carries it along a surface once it has stopped
    // bouncing, give or take a half, how many times a second it catches and skips on the way, and the seconds it
    // is given to fall once it has been carried off the end.
    carry: 400,
    skip: 0.8,
    spill: 0.65,
    skid: 6,            // how quickly one that has stopped bouncing slows, per second
    fades: 0.9,         // seconds one that has stopped bouncing is given before it is gone
    life: [1.3, 2.6] as [number, number],
    fade: 0.3,          // the share of its life over which it shrinks away at the end
    // At rest a landing throws one shard now and then: the shortest and the longest gap between two, in seconds, and
    // how hard it is thrown against a strike at full speed.
    now: [3, 6] as [number, number],
    toss: 0.45,
    lone: 4,            // seconds it lives: long enough to be whole still when the flow takes it and sets its life again
    // Thrown when a leading end arrives: the fewest, and how many more at full speed.
    burst: [4.5, 52] as [number, number],
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
  split: boolean;       // a clear shard takes three samples of what is behind it and splits them warm
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
