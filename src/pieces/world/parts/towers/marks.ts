// The named gold marks of picture 9's skyline, as both sides need them: the make builds them by these numbers
// (scripts/world/parts/towers/designs.mjs) and the gold's shader (./materials.ts) finds them and lights each as
// its own. This file imports nothing, so the make scripts can read it as it is.

// The obelisk's point: the share of the tower's height that is gold, how much narrower it is at its head than its
// foot, how tall its pyramidion is against its width, how far it is turned on its plinth, in degrees, how wide a
// flute is at its foot, how far a flute's flanks are turned, and its head (how tall its collar is, the share of
// the pyramidion that is its lower, fluted stage, how much it narrows over that stage, the ball's radius, and how
// far over the plan's height the needle reaches, to picture 9's tip at 70 down). base: how tall the stone base is.
// It is turned so its narrower face, on the right, mirrors the moon square on, as picture 9's blazes, and the broad
// face on the left mirrors the night before the world; its flutes' flanks are turned only a little, so the moon's
// reflection lies down the lit face as one streak.
export const OBELISK = { gold: 0.35, base: 10, taper: 0.62, cap: 0.9, turn: 45, reed: 1.5, flank: 10, width: 0.56, head: { collar: 1.6, lower: 0.42, waist: 0.6, ball: 0.4, needle: 6 } };
// Where its point stands, over its tower's foot: the plinth's top (`foot`) and its head.
export function obeliskPoint(tall: number): { shaft: number; foot: number; top: number } {
  const shaft = tall - tall * OBELISK.gold - 3;
  return { shaft, foot: shaft + 4.2, top: tall };
}

// The sun disc: how deep its carving is, in units, how many beads round its rim, places in its outer band (a plate
// and a point by turns) and glyph blocks; how wide the rim is, in units, and how many sides the disc is turned in;
// its radius against its tower's width. carve: where each ring of the carving is, as shares of the radius: the
// outer band of plates and points (from), the glyph band, the great and lesser rays (from, to great, to lesser),
// the four squares round the boss, the two rounded rings (where they stand), and the boss.
export const SUN = { depth: 1.5, beads: 40, outer: 16, glyphs: 24, rim: 2.3, round: 96, r: 0.44, carve: { band: 0.67, glyphs: [0.405, 0.6], rays: [0.37, 0.71, 0.62], squares: [0.215, 0.335], rings: [0.66, 0.36], boss: 0.2 } };
// The disc's seat: how tall the stone and copper under its cradle are, and the cradle, in units.
export const SEAT = { under: 4, cradle: 2.2 };
// Where the disc's middle stands over its tower's foot, and its radius.
export const discAt = (w: number, tall: number): { r: number; cy: number } => ({ r: w * SUN.r, cy: tall - w * SUN.r });
