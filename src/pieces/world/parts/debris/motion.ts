// How what broke away moves: one scene caught in the planet's gravity, every piece moving with its family and
// differing inside it. The page works each piece's place out in its vertex shader from the clock and these numbers
// (./shaders.ts), and the make script (scripts/world/parts/debris/) keeps every piece clear of the rock, the core
// and the streams over the whole of its motion with them. Lengths in units, times in seconds, turns in radians.
// This file imports nothing, so the scripts can read it as it is.

// Each kind of motion, by the number it is stored as.
export const KIND = { plate: 0, ring: 1, clump: 2, whirl: 3, fall: 4, dust: 5, scatter: 6 } as const;
export type Kind = keyof typeof KIND;

export const MOTION = {
  // A great piece holds its place under the edge it broke from, rises and falls, slides a little from side to
  // side, and keeps one face to the core, rocking a little about the line to it.
  plate: { rise: 5, riseT: 47, slide: 7, slideT: 73, rock: 0.06, rockT: 61 },
  // The small pieces round a great one go where it goes, and swing slowly round it.
  ring: { swing: 0.12, swingT: 83 },
  // A clump slides from side to side as one, and rises and falls.
  clump: { slide: 12, slideT: 67, deep: 5, rise: 3.5, riseT: 43 },
  // The arms swing round the stream and back, each on its own side of it, as one, on a tilted path that sinks as it
  // comes round toward the front: how far round each piece swings is its own (the make script keeps it clear of the
  // stream's lane), and a swing takes between these many seconds, by arm.
  whirl: { swingT: [240, 330] as const, tilt: 0.16 },
  // Chips are caught by the stream and carried down it, from under the break to the foot, gathering pace as they
  // go: their mean pace, and how much of the way in to the stream they are drawn by the foot, to a line just
  // behind it. They are only there between the two ends.
  fall: { from: -405, to: -1172, fade: 36, fast: [5, 9] as const, gather: 1.6, pull: 0.62, behind: 14 },
  // The dust turns a little about the stream, and rises and falls.
  dust: { turn: 0.045, turnT: 97, rise: 3, riseT: 53 },
  // The stones off the planet's sides drift a little.
  scatter: { slide: 4, slideT: 51, rise: 2.5, riseT: 39 },
  // How fast a piece turns over: a turn in so many seconds at 20 units, more slowly the larger it is, between these.
  spin: { at: 20, period: 64, least: 22, most: 150 },
} as const;

// The most a piece of each kind moves from its resting place, other than going round the stream, for keeping it
// clear of things over all of its motion.
export const SWAY: Record<Kind, number> = {
  plate: Math.hypot(MOTION.plate.rise, MOTION.plate.slide) + 2,
  ring: Math.hypot(MOTION.plate.rise, MOTION.plate.slide) + 6,
  clump: Math.hypot(MOTION.clump.slide, MOTION.clump.deep, MOTION.clump.rise),
  whirl: 4,
  fall: 0,
  dust: 6,
  scatter: Math.hypot(MOTION.scatter.slide, MOTION.scatter.rise),
};
