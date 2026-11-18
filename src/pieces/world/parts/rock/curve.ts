// Sculpt S's light at picture 9's hue (STONE_CURVE in ./stone.ts). Written by scripts/world/parts/rock-s/fit.mjs from
// picture 9's rock and stills of the world: do not edit by hand.
// at: the light's luminance at which the world's last pass shows a luma of 0, 30, 60 and so on, read off a ramp
// (ramp: the ramp's least and most power of two, where its bands start across, how wide each is, and how many).
// rings: the middles of the rings round the core, in its radii as the visitor sees it. tint: for each ring, for each
// step of luma, the light's green and blue over its red.
export const CURVE = {
  ramp: [-12, 2, -400, 40, 20],
  at: [0, 0.01337, 0.04497, 0.1025, 0.1888, 0.3057, 0.4623, 0.6787, 0.9964],
  rings: [1.3, 1.85, 2.6, 3.6],
  tint: [
    [[0.2005, 0.0593], [0.1364, 0.0187], [0.1899, 0.0215], [0.2354, 0.0324], [0.3157, 0.0629], [0.4344, 0.116], [0.4947, 0.1786], [0.5476, 0.2116]],
    [[0.2619, 0.0357], [0.2082, 0.0565], [0.2632, 0.0788], [0.2701, 0.0744], [0.3341, 0.0986], [0.4766, 0.1743], [0.5164, 0.2087], [0.5625, 0.25]],
    [[0.3853, 0.0865], [0.2009, 0.0587], [0.2754, 0.0854], [0.4055, 0.1578], [0.477, 0.1901], [0.4898, 0.2171], [0.5442, 0.2969], [0.5776, 0.3249]],
    [[0.5311, 0.183], [0.2557, 0.1579], [0.4014, 0.2554], [0.3527, 0.1184], [0.2368, 0.0372], [0.6336, 0.3741], [0.5499, 0.293], [0.5776, 0.3249]],
  ] as readonly (readonly (readonly [number, number])[])[],
} as const;
