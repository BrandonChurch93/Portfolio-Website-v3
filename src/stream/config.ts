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

  // The route through Work (routeThroughWork in route.ts). Lengths in units.
  work: {
    // Onto the category bar and onto the top of the first row's card: how far the fall leans the way it will run, the
    // least it keeps between where it lands and the end, the turn onto the top (how early it leaves the fall, how late
    // it joins the run), how far short of the end it begins to leave the top, how far past the end it is thrown, and
    // how far down the fall that turn is still felt.
    bar: { lean: 12, least: 60, land: [36, 30] as [number, number], early: 4, past: 30, fall: 84 },
    card: { lean: 6, least: 56, land: [38, 30] as [number, number], early: 12, past: 34, fall: 170 },
    // The post: how far above its middle the stream meets it, as an angle, how tight the turn is there, how much of
    // what ran into it it gives back, and how much of a throw the run from it to the card's side is. That run is
    // straight: any bow in it brings the stream to the side at a shallower angle, and it then only grazes it. far:
    // how much further than a card it throws what its strike throws. aim: the way it throws it, as an angle below
    // level, inward. low: how far down its own edge from where it is struck the pieces leave it, the least and what
    // is added: from there the gap between the two rows is straight ahead, and from the shoulder the first row's
    // card is in the way.
    post: { at: 0.75, turn: 14, spring: 0.8, bow: 0, far: 1.45, aim: 0.1, low: [20, 34] as [number, number] },
    // The side of the second row's card: how far down it the stream strikes, as a share. The turn there: how early
    // it leaves its run in and how late it joins its run out. Tight, so the stream comes to a point on the rim. kick
    // is the angle to the card's side at which it is thrown back out, leg how far it goes that way before its own
    // weight takes it, and ease how that turn down is rounded, as shares of the leg: how soon it begins, and how far
    // down the fall it is still felt.
    side: { at: 0.4, turn: [9, 12] as [number, number], kick: 1.05, leg: 50, ease: [0.52, 2.2] as [number, number] },
    // The rail: half its thickness, how far in from its high end the stream lands and the turn there, how far short of
    // the button its low end stops, how far past that end the stream still runs straight, and the turn off it.
    rail: { half: 9, in: 30, land: [27, 32] as [number, number], gap: 22, over: 4, off: [8, 30] as [number, number] },
    // How long a sleeping card takes to wake once the stream has struck it. Short: it is lit by the strike.
    wake: 0.1,
    // A project card's rim is rounded over, so its crest stands this far inside its outline, in the card's own
    // units. The stream takes the crest for the card's edge, and so lies on the rim and not over its shoulder.
    seat: 2.4,
    // A finial on an end of the rail. collar: how long its collar is, in halves of the rail's thickness. long: how
    // long the whole finial is, collar and blade, as a share of the stone's width, and wide: half a blade's width, the
    // same way. It is measured against the stone so that the stone stays the larger thing on every screen.
    finial: { collar: 1.75, long: 0.82, wide: 0.2 },
    // The brackets the rail is carried on: how far along each half of the rail they are, as shares of its length,
    // and how large one is against the rail's own.
    keel: { at: [0.17, 0.83] as [number, number], size: 1 },
    // The meeting: how steeply each side comes down to the middle from the rail's end, how much of that stretch is a
    // bow, how far down the two take to turn into one, and how near they are when they count as met.
    meet: { slope: 0.28, bow: 0.8, fall: 38, near: 10 },
    // The path as a bolt, the route through Work only. It runs straight between the things it strikes, turns hard
    // at each, and on a free run goes in short straight strokes. corner: how tight every turn is. past: how far
    // beyond the end of a top it turns down. lead: how far it runs straight out of a strike and straight in to the
    // next. knot: the least and the most between two turns of a free run. reach: how far a turn stands off the
    // straight line. clear: the nearest a turn comes to anything. flip: how often a stroke crosses to the other
    // side of the line, not staying on the side it is on. carry: how far each way along the route its riding shards
    // take a turn over, so none is thrown round a hard one. force: how much harder it strikes than the path as it
    // was, having come straight in with nothing spent on a bow. flash: and how much brighter the flash of that strike is.
    bolt: { corner: 7, past: 5, lead: [44, 84] as [number, number], knot: [44, 150] as [number, number], reach: 34, clear: 30, flip: 0.62, carry: 44, force: 1.2, flash: 1.7 },
    // A shard thrown by a strike is let fall this far below where it was thrown, and then goes. The section is tall,
    // and without this what a strike high up throws rains down the whole of both margins.
    fall: 430,
    // Each contact: how strong it is against a full strike, how many sparks it keeps while the stream lies on it
    // against the test shot's landing, forks of arc each second, and how many times longer than the test shot's it
    // waits between the single shards it throws at rest.
    contact: {
      title: [1, 1, 5, 2.2], bar: [0.3, 0.6, 3, 4], card: [1, 1, 6, 2.2], post: [1.15, 1.3, 6, 2.6], side: [1.3, 1.3, 8, 2.6], rail: [0.4, 0.7, 3, 4], meet: [0.2, 0.5, 2, 4],
    } as Record<string, readonly [number, number, number, number]>,
  },

  // When the category changes (surge.ts). Times are in seconds and lengths in units.
  change: {
    // The surge takes this long from the bar to the meeting under the button.
    length: 1.1,
    // A card's change does not stretch with the surge. The old card is gone by out, dropping this far as it goes.
    // The new one starts up at in, from this far below, and the stream strikes it as it seats.
    out: 0.09,
    in: 0.08,
    seat: 0.18,
    drop: 34,
    rise: 40,
    // How the new card gathers speed on its way up (1 is a steady rise), and how long the stream takes to sag once
    // a card has let go.
    arrive: 1.7,
    sagIn: 0.07,
    // The share of its way up for which the new card is not yet seen. It is solid a third of its way later.
    ghost: 0.45,
    // How hard the surge strikes a card, on its top in the first row and on its side in the second, as a share of
    // a leading end at full pace: what the scroll's strike is when the page is scrolled 600 px in three quarters of a
    // second, which is what the comparison filmstrips do. Then the stone, which is a full strike too. The knock on
    // the bar, and the rail.
    hard: [0.87, 0.81, 0.85] as [number, number, number],
    knock: 1,
    light: 0.6,
    // The share of their shards the light contacts of a surge throw, which leaves the budget to the cards' strikes.
    loose: 0.25,
    // How long an earlier surge takes to die when a later press cuts in.
    cut: 0.12,
    // The bar's jolt, in pixels, and how long after the last strike things are still settling.
    jolt: 5,
    tail: 1.6,
    // The share of a front's light that the one running up from the bar toward the title has. It dies before it
    // reaches the word.
    up: 0.6,
    // The swell of light that runs with it: how much brighter the core is at the front, how far ahead of the front
    // that reaches, and how far behind.
    swell: [2.2, 10, 260] as [number, number, number],
    // Where a card is away the stream sags toward where it was: this far on a top, this far at a side, tapering off
    // over reach to each side. Struck, it springs off the new card: how far, how fast that dies, how fast it rings,
    // and how long it is followed.
    sag: [21, 30] as [number, number],
    // How far each way along the stream the second row's turn is rounded off while its card is away. How much
    // brighter a stone's face flares as the front passes it, and how much of the meeting's strike the button takes.
    round: [26, 60] as [number, number],
    flare: 4,
    button: 1.5,
    // The sparks a front sheds each second, and the flash at a card's strike:
    // how fierce its point is against a leading end's, how long it lasts, and how much it flares the line there.
    shed: 170,
    // A front is a second leading end. The forks of arc it throws each second. How far it flings the riding shards
    // wide, as a share of how far out each rides, and how long after it has passed they are furthest out: they are
    // thrown over that long and close in again behind it. What bursts out where two fronts fuse under the button,
    // and out of the stream's leading end when a front catches it: sparks, and forks of arc.
    arcs: 64,
    fling: [1.4, 0.12] as [number, number],
    fuse: [90, 14] as [number, number],
    burst: [64, 26] as [number, number],
    // How far the stream ahead of a front is turned down while it runs, and how long that takes to come on.
    hush: [0.78, 0.09] as [number, number],
    // The energy a front gives the leading end it fuses with, against a leading end at full pace, and for how long.
    given: [1.2, 0.22] as [number, number],
    flash: [1.15, 0.07, 1.6, 0.12] as [number, number, number, number],
    reach: [34, 90] as [number, number],
    spring: [11, 9, 32, 1] as [number, number, number, number],
    // The second row's card lets go this far before the surge reaches the point the stream strikes it at.
    ahead: 24,
  },

  // How fast a thing the stream has reached warms to it, each second, and how fast it cools once the stream has
  // drawn back. A stone's face is lit by this: it comes up like a coal catching and dies like one going out.
  warmth: [3.4, 1.5] as [number, number],

  // A project card that a leading end has just struck. Its rim flares, and dies away over the first number of
  // seconds. Its picture warms this far toward its own colors, reached in rise seconds and settled back to bronze
  // over a few times settle. And while the pointer has the card turned or grown, what lies within the first number
  // of units of it is carried with it whole, and what lies further off less, out to the second.
  struck: { flare: 0.3, warm: 0.8, rise: 0.1, settle: 0.26, carry: [10, 70] as [number, number] },

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
  high: { per100: 55, loose: 400, sparks: 1200, pixelRatio: 2, pixels: 9.6e6, samples: 4, split: true, levels: 6 },
  mid: { per100: 38, loose: 120, sparks: 300, pixelRatio: 3, pixels: 3.8e6, samples: 4, split: false, levels: 6 },
  low: { per100: 26, loose: 60, sparks: 160, pixelRatio: 1.5, pixels: 1.7e6, samples: 2, split: false, levels: 5 },
};

// Stream units to CSS pixels for a screen this wide, with the page's root font size in pixels.
export function unitFor(width: number, rootPx: number): number {
  const narrow = width < 600 ? 0.72 : width < 1000 ? 0.86 : 1;
  return (rootPx / 16) * narrow * STREAM.scale;
}
