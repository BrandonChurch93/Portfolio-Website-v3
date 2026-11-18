// Sculpt S's map of picture 9's large pattern of light (StoneOptions.light in ./stone.ts), made by
// scripts/world/parts/rock-s/light.mjs: how much brighter or darker the picture's hollow is than S's, at a scale of
// masses only, as a multiplier of what the core and its bounce give. The view never moves, so a place on the rock is a
// place in the picture: the map covers the picture's pixels from `at`, `size` of them, in `texels`, and each texel holds
// the multiplier's power of two between `log`'s two, as a grey of 0 to 255. It comes to 1 at its edges, outside the rock.
// Read by the script: keep it plain.
export const LIGHTMAP = {
  file: 'rock-s-light.png',
  at: [216, 256],
  size: [888, 488],
  texels: [222, 122],
  log: [-3.5, 2.5],
} as const;
