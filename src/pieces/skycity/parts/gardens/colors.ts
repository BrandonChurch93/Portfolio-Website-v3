import { hex } from '../../../../config/palette';

// Every color in the jungle, and nowhere else. The shader reads these and nothing else, so the whole jungle can be
// painted another way by changing these lines alone. Now in the site's own colors and not green, by his rule of
// Nov 14: "Any nature is in the site's colors, not green."
export const JUNGLE = {
  // The leaves deep in a crown and in its shade: near black, a touch warm.
  deep: 0x070402,
  // The mass of the canopy: dark bronze, kept warm and not greyed.
  mass: 0x2c1604,
  // Leaves in the open: ember.
  leaf: hex('ember'),
  // A tree in flame among the rest, now and then.
  flame: 0x6e3008,
  // Where the moon catches the top of a crown: copper, toward copper-light.
  catch: hex('copper-light'),
  // Bark: dark warm grey, and the pale of dead wood and the slender trees.
  bark: 0x140b05,
  barkPale: 0x4a4038,
  // A lantern's flame, and what it throws on the trees nearest it.
  glow: hex('hot'),
  spill: hex('flame'),
} as const;
