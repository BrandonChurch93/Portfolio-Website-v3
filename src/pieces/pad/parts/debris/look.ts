// What broke away, round the pad: how it moves and how it is lit. Lengths in units, times in seconds, turns in
// radians. Where it hangs is DEBRIS in ../../layout.ts, and ./field.ts lays the pieces out from it.

export const MOTION = {
  // How fast a piece turns over: a turn in `period` seconds for a piece `at` units across, slower as it is larger by
  // the power `grow`, never quicker than `least`. A great piece only rocks, this far, over this many seconds.
  spin: { at: 5, period: 26, grow: 0.85, least: 11, rock: 0.035, rockT: 97 },
  // A cluster drifts as one: across, up and back, over these many seconds, each cluster at a pace of its own within
  // `spread` of them. A great piece takes this share of it.
  drift: { across: [5, 71], up: [3.5, 47], back: [4, 89], spread: 0.3, great: 0.45 },
  // Each small piece bobs a little within its cluster, over these many seconds.
  bob: { size: 2.2, period: [23, 41] as const },
  // The launch's blast: how fast it runs out from the engine's mouth, in units a second, the seconds into the launch
  // it sets out (the engine lights low at 0), the seconds a piece takes to be shoved furthest, within what distance
  // of the mouth it is felt in full and past what it is not felt, how far it shoves a small, a middle and a great piece
  // at most, and how far it turns each over.
  blast: { speed: 520, start: 0.15, peak: 1.15, near: 320, far: 820, shove: [40, 24, 8] as const, kick: [1.6, 0.7, 0.08] as const },
  // The time a held frame is drawn at, when nothing may move: a moment the field is well spread.
  still: 37,
};

// The most a piece moves from where it rests other than the blast, for keeping it clear of things.
export const SWAY = Math.hypot(MOTION.drift.across[0], MOTION.drift.up[0], MOTION.drift.back[0]) + MOTION.bob.size + 1;

// The size classes, by the number stored for a piece.
export const KIND = { small: 0, middle: 1, great: 2 } as const;
