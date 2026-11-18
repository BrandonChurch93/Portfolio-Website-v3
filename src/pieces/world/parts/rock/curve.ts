// Sculpt S's light at picture 9's hue (STONE_CURVE in ./stone.ts). Written by scripts/world/parts/rock-s/fit.mjs from
// picture 9's rock and stills of the world: do not edit by hand.
// at: the light's luminance at which the world's last pass shows a luma of 0, 30, 60 and so on, read off a ramp
// (ramp: the ramp's least and most power of two, where its bands start across, how wide each is, and how many).
// rings: the middles of the rings round the core, in its radii as the visitor sees it. tint: for each ring, for each
// step of luma, the light's green and blue over its red.
export const CURVE = {
  ramp: [-12, 2, -400, 40, 20],
  at: [0, 0.01284, 0.04497, 0.1025, 0.1888, 0.3057, 0.4623, 0.6787, 0.9964],
  rings: [1.3, 1.85, 2.6, 3.6],
  tint: [
    [[0.2219, 0.0681], [0.1348, 0.0187], [0.1867, 0.0211], [0.2397, 0.0331], [0.3122, 0.0599], [0.4456, 0.1264], [0.5522, 0.2284], [0.5476, 0.2116]],
    [[0.2899, 0.0418], [0.2014, 0.0517], [0.2559, 0.0747], [0.2721, 0.0703], [0.349, 0.1027], [0.5132, 0.2], [0.5625, 0.25], [0.5625, 0.25]],
    [[0.4048, 0.0801], [0.2062, 0.0523], [0.265, 0.0806], [0.4169, 0.166], [0.514, 0.2182], [0.55, 0.27], [0.5776, 0.3249], [0.5776, 0.3249]],
    [[0.5311, 0.1834], [0.2585, 0.1399], [0.362, 0.2233], [0.3624, 0.126], [0.2624, 0.0494], [0.6591, 0.4247], [0.5776, 0.3249], [0.5776, 0.3249]],
  ] as readonly (readonly (readonly [number, number])[])[],
} as const;
