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
    [[0.2474, 0.0721], [0.1445, 0.0212], [0.1928, 0.0228], [0.2495, 0.0357], [0.3238, 0.0651], [0.43, 0.117], [0.5085, 0.1944], [0.5476, 0.2116]],
    [[0.3127, 0.0468], [0.2132, 0.058], [0.2595, 0.0749], [0.2957, 0.0856], [0.3615, 0.1211], [0.5537, 0.2711], [0.5625, 0.25], [0.5625, 0.25]],
    [[0.4313, 0.0821], [0.2273, 0.0661], [0.2782, 0.0936], [0.4018, 0.1636], [0.4898, 0.2156], [0.9621, 1.2], [0.5776, 0.3249], [0.5776, 0.3249]],
    [[0.5994, 0.219], [0.2779, 0.1631], [0.3172, 0.1823], [0.3356, 0.118], [0.3258, 0.0822], [0.5373, 0.251], [0.5776, 0.3249], [0.5776, 0.3249]],
  ] as readonly (readonly (readonly [number, number])[])[],
} as const;
