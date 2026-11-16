// Sculpt B's trace of picture 9's rock: every great mass as the picture shows it, in the picture's own pixels
// (reference/concept/09-parts/09-the-whole-picture-at-1376.jpg, 1376 by 768), read off ruled enlargements.
//
// A mass: k, its kind (how it is broken: roof, petal, wall, floor, back), o, its outline (convex, as corners across
// and down), z, how far toward the visitor its face is at the outline's middle ('lip' for a slab of the roof's
// front, which stands at the land's edge), yaw and pitch, the way its broad face is turned in degrees (to the
// visitor's right, and up), and T, how thick it is. g turns the grain its plates are broken along.
//
// TORN holds the torn edges of the planet's own surface, each a line of places down the picture: left of the first
// and right of the second the planet is whole out to its outer surface.

export const TORN = {
  left: [[298, 120], [298, 300], [303, 332], [297, 372], [301, 420], [293, 470], [299, 512], [291, 548], [282, 600], [276, 650], [290, 706]],
  right: [[1050, 120], [1050, 300], [1046, 330], [1053, 372], [1049, 420], [1054, 470], [1044, 512], [1040, 552], [1014, 598], [994, 648], [1004, 706]],
};

const m = (k, z, yaw, pitch, T, o, more = {}) => ({ k, z, yaw, pitch, T, o, ...more });

// The ring of petals straight round the core, behind its rim, where the picture's hollow wraps it closely like a
// broken geode: each a wedge out from the core's edge, read as the picture's petals there are.
const RING = [[-150, 140], [-112, 112], [-74, 106], [-36, 118], [4, 150], [44, 140], [80, 120], [118, 130]].map(([at, out], i) => {
  const p = (deg, r) => [688 + r * Math.cos(deg * Math.PI / 180), 437 + r * Math.sin(deg * Math.PI / 180)];
  const w = 17 + (i % 3) * 3;
  return m('petal', 'funnel', 0, 0, 40, [p(at - w, 84), p(at + w, 84), p(at + w + 4, out * 0.92), p(at + 6, out + 8), p(at - w - 3, out)], { aim: 0.45 });
});

export const MASSES = [
  ...RING,
  // The roof's front: a few great slabs from the land's edge down to its jagged lower edge, overlapping.
  m('roof', 'lip', 0, -14, 170, [[262, 292], [425, 292], [428, 334], [392, 347], [330, 352], [290, 347], [266, 341]]),
  m('roof', 'lip', 0, -8, 170, [[404, 288], [566, 266], [560, 320], [521, 337], [452, 340], [414, 334]]),
  m('roof', 'lip', 0, -18, 170, [[548, 262], [732, 254], [728, 322], [690, 337], [606, 333], [554, 322]]),
  m('roof', 'lip', 0, -10, 170, [[716, 256], [884, 276], [882, 322], [841, 334], [760, 338], [722, 326]]),
  m('roof', 'lip', 0, -14, 170, [[866, 278], [1064, 294], [1061, 337], [1031, 348], [960, 352], [912, 344], [872, 332]]),
  // Slabs that hang lower from the roof each side of the hollow.
  m('wall', 380, -25, -12, 70, [[452, 322], [522, 318], [530, 360], [506, 402], [471, 393], [455, 357]]),
  m('wall', 330, -30, -10, 70, [[828, 318], [902, 322], [907, 372], [881, 402], [846, 393], [832, 352]]),
  // The flake hanging over the core, lit from under.
  m('petal', 205, 0, -55, 26, [[610, 330], [700, 326], [768, 334], [750, 352], [690, 356], [630, 350]]),

  // The hollow: petals round the core, each leaning in, deeper the nearer the core (z 'funnel'), turned to the
  // core and the visitor (aim: how much to the visitor), with yaw and pitch turning them further.
  m('petal', 'funnel', 0, -25, 30, [[522, 340], [575, 328], [582, 350], [548, 376], [522, 372]], { aim: 0.6 }),
  m('petal', 'funnel', 0, 0, 60, [[494, 384], [522, 364], [560, 374], [566, 432], [546, 482], [508, 470], [494, 430]], { aim: 0.9 }),
  m('petal', 'funnel', 0, 0, 60, [[548, 350], [578, 338], [612, 348], [616, 420], [604, 470], [566, 476], [552, 420]], { aim: 0.8, dz: -10 }),
  m('petal', 'funnel', -10, 0, 50, [[482, 392], [500, 380], [512, 440], [498, 480], [484, 450]], { aim: 1, dz: 20 }),
  m('petal', 'funnel', 0, 10, 50, [[560, 442], [600, 448], [612, 500], [590, 522], [560, 506]], { aim: 0.9 }),
  m('petal', 'funnel', 0, 10, 40, [[520, 470], [560, 476], [566, 506], [530, 512]], { aim: 1 }),
  m('petal', 'funnel', 0, 0, 60, [[770, 345], [820, 355], [836, 400], [830, 470], [790, 490], [776, 440]], { aim: 0.8 }),
  m('petal', 'funnel', 0, 0, 50, [[836, 352], [872, 342], [892, 380], [882, 442], [846, 432]], { aim: 0.9 }),
  m('petal', 'funnel', 10, 0, 60, [[848, 330], [880, 318], [904, 352], [908, 420], [892, 480], [864, 470], [852, 420]], { aim: 1, dz: 25 }),
  m('petal', 'funnel', 0, -20, 30, [[780, 325], [830, 318], [842, 340], [800, 352]], { aim: 0.6 }),
  m('petal', 'funnel', 0, -15, 30, [[758, 330], [800, 335], [792, 352], [764, 354]], { aim: 0.6 }),
  m('petal', 'funnel', 0, 10, 50, [[838, 472], [890, 482], [880, 540], [838, 532]], { aim: 0.9 }),
  m('petal', 'funnel', 0, 10, 40, [[780, 482], [840, 470], [846, 520], [810, 514], [780, 500]], { aim: 0.9 }),

  // Left of the cave: the great pale slab, and the darker masses in front of it.
  m('wall', 360, 35, 5, 55, [[372, 360], [410, 354], [440, 380], [456, 470], [440, 560], [400, 545], [378, 460]]),
  m('wall', 90, 30, 0, 45, [[440, 386], [480, 376], [505, 420], [505, 500], [470, 522], [445, 470]], { under: 0.4 }),
  m('wall', 420, -35, -5, 90, [[304, 352], [370, 346], [378, 420], [372, 520], [350, 598], [310, 590], [300, 470]], { under: 0.3 }),
  m('wall', 470, 40, 25, 40, [[282, 345], [318, 345], [322, 400], [296, 405], [282, 380]]),
  m('wall', 360, -20, -10, 80, [[300, 535], [340, 530], [370, 560], [360, 600], [310, 600]]),
  m('wall', 320, 15, 10, 80, [[365, 530], [410, 525], [445, 560], [430, 600], [380, 600]]),
  m('wall', 170, -25, -10, 100, [[285, 600], [345, 600], [372, 650], [356, 700], [300, 700], [280, 650]]),
  m('wall', 260, -15, -5, 60, [[440, 520], [480, 515], [490, 560], [470, 590], [440, 580]]),

  // Right of the cave: slabs leaning down to the left, darker toward the torn edge.
  m('wall', 330, 30, 30, 50, [[880, 300], [950, 318], [1000, 380], [990, 410], [940, 392], [895, 350]]),
  m('wall', 110, -35, -10, 80, [[905, 400], [960, 400], [995, 450], [980, 560], [930, 545], [905, 480]]),
  m('wall', 300, 10, -15, 80, [[950, 460], [1010, 452], [1030, 520], [1000, 560], [960, 552]]),
  m('wall', 380, 5, -12, 80, [[998, 330], [1045, 322], [1050, 420], [1020, 450], [996, 400]]),
  m('wall', 240, 8, -18, 80, [[960, 545], [1040, 540], [1030, 600], [992, 650], [962, 615]]),
  m('wall', 200, 10, -20, 80, [[1000, 600], [1040, 590], [1030, 660], [1010, 690], [990, 650]]),

  // The floor: a ragged shelf under and in front of the core, behind the stream at its middle, its front faces
  // turned up to the core.
  m('floor', 210, 20, 34, 30, [[476, 526], [540, 512], [560, 540], [520, 562], [484, 556]]),
  m('floor', 190, 10, 30, 30, [[530, 514], [600, 520], [612, 546], [580, 566], [536, 560]]),
  m('floor', 140, 0, 36, 30, [[590, 530], [640, 540], [636, 570], [612, 578], [596, 558]]),
  m('floor', 100, 0, 36, 30, [[640, 544], [700, 548], [706, 582], [668, 590], [644, 574]]),
  m('floor', 110, -5, 36, 30, [[696, 546], [752, 540], [760, 574], [726, 588], [702, 580]]),
  m('floor', 170, -10, 32, 30, [[740, 528], [800, 516], [820, 546], [792, 580], [748, 570]]),
  m('floor', 190, -15, 30, 30, [[800, 520], [872, 536], [870, 578], [830, 600], [806, 578]]),
  m('floor', 160, -10, 10, 24, [[782, 578], [830, 584], [822, 612], [798, 616]]),
  m('floor', 200, 10, 10, 20, [[518, 558], [552, 562], [540, 584]]),
  m('floor', 150, 0, 10, 20, [[598, 568], [628, 572], [620, 586]]),

  // What is behind it all, seen only through the gaps.
  m('deep', -200, 0, 0, 500, [[60, 120], [1320, 120], [1320, 640], [1000, 640], [900, 565], [830, 540], [560, 540], [470, 560], [330, 640], [60, 640]]),
];
