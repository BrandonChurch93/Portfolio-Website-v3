import type { Tier } from '../config/site';

// The pour's constants. Lengths are in units: the scene is laid out in units and scaled to the screen (src/pour/scene.ts).
export const POUR = {
  stepsPerSecond: 240,
  gravity: 2600,
  maxSpeed: 2800,

  // The solver's grid cell as a multiple of the particle spacing.
  cell: 2,
  // A cell holds liquid, and is kept from being squeezed or stretched, once it has this many particles. Fewer are in free flight.
  bodyAt: 2,
  solveRounds: 40,
  overRelax: 1.9,
  // How hard a crowded cell is spread back to its resting density, as a fraction per step.
  spread: 0.3,
  // How much of a particle's own motion survives a step: this much deep inside a body, and this much at its surface.
  calm: 0.2,
  lively: 0.3,
  mixing: 2.5,
  // Below this fraction of resting density a particle counts as a bead on its own.
  aloneBelow: 0.34,

  adhesion: 15000,
  adhesionBand: 3,
  // Per unit of distance slid, so the pull grows with the square of the speed.
  wallDrag: 0.055,
  wallFriction: 0.22,
  beadBounce: 0.34,

  stream: { width: 25, speed: 560, lean: 0.42, sway: 6, swayAngle: 0.04, waver: 0.14 },
  // No two pours come in the same: each is this much wider or narrower, lands this far either side along the slab (as a
  // share of its length), and leans this much more or less, in radians.
  vary: { width: 0.14, landing: 0.2, lean: 0.1 },
  pour: { swell: 0.14, gush: 0.4, minSeconds: 6.2, maxSeconds: 7.6, tail: 1.5 },

  // Spatter: the share of hard landing metal that is thrown back, how much more off a bare slab, how fast as a fraction of
  // the landing speed, how wide the fan in radians, how fine the gouts (per unit) and how often they change (per second),
  // and how long thrown metal flies before the body can take it back.
  splash: { share: 0.045, bare: 9, slow: 0.24, fast: 0.62, fan: 2.2, grain: 0.2, beat: 60, flight: 0.07 },

  cool: { core: 0.06, exposed: 0.45, contact: 0.12, fadeBelow: 0.2, fadeRate: 3 },

  // Sparks leave in bursts, a few at a time and mostly one way, not as an even spray: burst is the share of moments
  // that throw any, perImpact how many of the particles landing in such a moment throw one.
  spark: {
    minImpact: 520,
    // A change of speed in one step past this counts as a landing inside the body.
    minJolt: 240,
    burst: 0.3,
    perImpact: 0.07,
    bareBoost: 9,
    spread: 0.5,
    life: [0.22, 0.7],
    beadLife: [0.9, 2.4],
    beadShare: 0.16,
    drag: 0.7,
    bounce: 0.42,
    roll: 3.2,
    shutter: 1 / 42,
  },

  heat: { cell: 3, gain: 7, loss: 0.3, spread: 34 },
} as const;

export interface PourBudget {
  spacing: number;
  maxFluid: number;
  maxSparks: number;
  // The canvas pixel ratio never goes past this.
  pixelRatio: number;
}

// Slow motion on the test page plays the pour at this rate.
export const POUR_SLOW = 0.2;
// With reduced motion the pour is one still, this many seconds in.
export const POUR_STILL_AT = 2.6;

// The particle budget Brandon asked for before the first build. Mac is high. A phone is mid, or low if it is slow.
// The stream is 25 units wide where it comes in, so it is about 8 particles across on a Mac, 6 on mid and 5 on low.
// Each spacing is set so that the most a pour needs at once, measured over several pours with no cap, is about 85 percent
// of maxFluid on the screen that needs most: a tall screen has longer falls and needs more than a wide one.
export const POUR_BUDGET: Record<Exclude<Tier, 'static'>, PourBudget> = {
  high: { spacing: 3, maxFluid: 6000, maxSparks: 500, pixelRatio: 2 },
  mid: { spacing: 4.2, maxFluid: 3600, maxSparks: 300, pixelRatio: 2 },
  low: { spacing: 5.2, maxFluid: 2400, maxSparks: 180, pixelRatio: 2 },
};

// Live only: the most time the solver may take from one frame. Past it the pour slows down instead of dropping frames.
export const POUR_FRAME_MS = 9;
