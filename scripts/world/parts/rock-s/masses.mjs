// Sculpt S, the plan: picture 9's hollow as about twenty great masses of one solid body, read off ruled
// enlargements of the picture (node scripts/world/grid.mjs). Every outline is in the picture's own pixels
// (reference/concept/09-parts/09-the-whole-picture-at-1376.jpg, 1376 by 768).
//
// A mass is a thick block with one broad face. Its outline is where the picture shows that face. The face is turned
// by `aim`: so much toward the core's middle, so much toward the visitor, so much up, and a turn of its own, so it
// is lit by the ball as the picture's is, and it is `thick` units deep behind its face, with sides square to it. Its
// face is at depth `z` (toward the visitor) at its outline's middle, or, for the plates of the back wall, on a
// sphere `S` units round the core's middle. `joints` are the two directions its stone splits along, in degrees
// across its face, and `cracks` how many fractures follow them. `seed` sets everything else of its own.
//
// What is not in the plan is worked out in field.mjs: the roof, the backfill behind everything, the floor's top,
// where the rock ends at each side and below.

// The back wall: the bowl behind and round the ball, broad plates that overlap like scales, each facing the ball.
const BACK = [
  { name: 'back-upper-left', poly: [[556, 350], [600, 332], [648, 332], [676, 342], [655, 366], [618, 384], [584, 402], [560, 384]], S: 186, aim: { ball: 0.85, view: 0.45, inward: 0.5 }, thick: 60, joints: [28, 104], cracks: 4, seed: 11 },
  { name: 'back-arch', poly: [[628, 330], [690, 322], [752, 326], [800, 340], [778, 356], [728, 352], [680, 352], [640, 354]], S: 168, aim: { ball: 0.7, view: 0.45, up: -0.3, inward: 0.3 }, thick: 60, joints: [6, 78], cracks: 3, seed: 12 },
  { name: 'back-upper-right', poly: [[752, 334], [806, 336], [848, 350], [862, 382], [838, 402], [802, 396], [772, 372]], S: 196, aim: { ball: 0.7, view: 0.65, inward: 0.5 }, thick: 60, joints: [-38, 40], cracks: 4, seed: 13 },
  { name: 'back-right', poly: [[786, 382], [834, 388], [856, 418], [852, 466], [832, 500], [800, 506], [776, 482], [780, 432]], S: 192, aim: { ball: 0.7, view: 0.65, inward: 0.5 }, thick: 60, joints: [62, -18], cracks: 5, seed: 14 },
  { name: 'back-lower-right', poly: [[742, 496], [792, 488], [826, 504], [832, 534], [792, 546], [750, 542], [732, 520]], S: 176, aim: { ball: 0.85, view: 0.5, inward: 0.5 }, thick: 60, joints: [-8, 70], cracks: 3, seed: 15 },
  { name: 'back-lower-left', poly: [[556, 452], [600, 444], [618, 480], [634, 514], [600, 532], [562, 522], [542, 490]], S: 178, aim: { ball: 0.85, view: 0.45, inward: 0.5 }, thick: 60, joints: [-58, 22], cracks: 3, seed: 16 },
  { name: 'back-left', poly: [[572, 386], [616, 374], [614, 412], [602, 446], [564, 452], [546, 420]], S: 198, aim: { ball: 0.85, view: 0.45, inward: 0.5 }, thick: 60, joints: [74, 10], cracks: 4, seed: 17 },
];

// The left wall: great slabs leaning in toward the ball like fallen books, a broad lit face to the ball and a thick
// dark side to the visitor's left. Then, out to the skin, dark blocks with dimly lit edges.
const LEFT = [
  { name: 'left-book-1', poly: [[392, 372], [426, 362], [456, 386], [482, 422], [506, 470], [520, 520], [506, 546], [470, 560], [446, 540], [420, 490], [402, 440], [388, 406]], z: 172, aim: { ball: 0.55, view: 0.7 }, thick: 46, joints: [-34, 52], cracks: 5, seed: 21 },
  { name: 'left-book-2', poly: [[480, 356], [520, 342], [542, 366], [552, 410], [560, 460], [556, 504], [538, 518], [516, 500], [496, 460], [478, 410]], z: 108, aim: { ball: 0.6, view: 0.62 }, thick: 40, joints: [-50, 30], cracks: 4, seed: 22 },
  { name: 'left-book-3', poly: [[514, 360], [548, 350], [576, 356], [592, 378], [576, 400], [548, 408], [524, 390]], z: 86, aim: { ball: 0.85, view: 0.35, up: -0.1 }, thick: 36, joints: [-60, 18], cracks: 3, seed: 23 },
  { name: 'left-ledge', poly: [[378, 528], [430, 512], [482, 522], [522, 540], [540, 566], [500, 580], [440, 582], [396, 578], [376, 556]], z: 214, aim: { ball: 0.7, view: 0.5, up: 0.35 }, thick: 50, joints: [8, 84], cracks: 3, seed: 24 },
  { name: 'left-dark-1', poly: [[286, 348], [332, 352], [384, 362], [390, 400], [392, 446], [346, 452], [300, 448], [290, 400]], z: 266, aim: { ball: -0.35, view: 0.9, up: 0.1 }, thick: 70, joints: [-70, 12], cracks: 3, seed: 25 },
  { name: 'left-dark-1b', poly: [[298, 452], [348, 456], [394, 450], [402, 490], [410, 530], [380, 560], [330, 546], [304, 504]], z: 250, aim: { ball: -0.45, view: 0.9, up: -0.1 }, thick: 70, joints: [-58, 30], cracks: 2, seed: 30 },
  { name: 'left-dark-2', poly: [[248, 330], [292, 346], [302, 420], [316, 500], [300, 560], [262, 562], [252, 480], [248, 400]], z: 360, aim: { ball: -0.3, view: 0.9 }, thick: 80, joints: [-80, 20], cracks: 2, seed: 26 },
  { name: 'left-low-1', poly: [[268, 522], [320, 530], [356, 546], [366, 586], [340, 602], [294, 602], [264, 582]], z: 196, aim: { ball: 0.8, view: 0.5, up: 0.2 }, thick: 60, joints: [-30, 60], cracks: 3, seed: 27 },
  { name: 'left-low-2', poly: [[284, 610], [330, 620], [360, 640], [364, 680], [342, 702], [300, 706], [278, 682], [270, 640]], z: 210, aim: { ball: 0.7, view: 0.6, up: 0.2 }, thick: 60, joints: [-24, 66], cracks: 3, seed: 28 },
  { name: 'left-low-3', poly: [[244, 578], [282, 590], [292, 640], [282, 702], [256, 692], [244, 640]], z: 362, aim: { ball: -0.1, view: 0.95 }, thick: 70, joints: [-75, 15], cracks: 2, seed: 29 },
];

// The right wall: one very large slab at two to four o'clock, lit, with the roof's shadow across it, then darker
// masses with dim rims becoming the cratered skin. Not the left in a mirror.
const RIGHT = [
  { name: 'right-great', poly: [[852, 330], [880, 318], [910, 338], [934, 380], [930, 432], [914, 472], [894, 498], [874, 492], [864, 452], [856, 400]], z: 172, aim: { ball: 0.55, view: 0.68 }, thick: 50, joints: [-62, 20], cracks: 5, seed: 31 },
  { name: 'right-teeth', poly: [[878, 300], [940, 294], [992, 318], [1008, 360], [988, 412], [960, 402], [930, 372], [900, 336]], z: 236, aim: { ball: 0.6, view: 0.5, up: -0.3 }, thick: 50, joints: [-40, 46], cracks: 3, seed: 32 },
  { name: 'right-mid', poly: [[930, 412], [990, 402], [1040, 430], [1060, 480], [1050, 540], [1000, 560], [956, 546], [936, 490]], z: 292, aim: { ball: 0.35, view: 0.85 }, thick: 70, joints: [-35, 55], cracks: 3, seed: 33 },
  { name: 'right-low', poly: [[960, 552], [1010, 546], [1044, 572], [1050, 630], [1040, 690], [1014, 702], [990, 662], [966, 612]], z: 332, aim: { ball: 0.3, view: 0.85, up: 0.15 }, thick: 70, joints: [-48, 36], cracks: 3, seed: 34 },
  { name: 'right-shelf', poly: [[818, 502], [880, 486], [940, 490], [966, 520], [952, 560], [902, 572], [852, 574], [830, 556]], z: 232, aim: { ball: 0.6, view: 0.5, up: 0.3 }, thick: 50, joints: [4, 76], cracks: 3, seed: 35 },
  { name: 'right-upper', poly: [[990, 320], [1062, 310], [1068, 362], [1060, 412], [1020, 422], [1000, 382]], z: 322, aim: { ball: 0.2, view: 0.9 }, thick: 70, joints: [-66, 20], cracks: 2, seed: 36 },
];

export const MASSES = [...BACK, ...LEFT, ...RIGHT];

// The floor: one thick ledge under the ball. Its front face (the mass's face, which its breaks run along) is a mid
// brown turned to the visitor, its top is lit, turned up and back to the ball (`top`: a plane through a place, in
// the world, and its normal), and its underside hangs in points where the small streams leave.
export const FLOOR = {
  name: 'floor', poly: [[468, 520], [540, 504], [600, 510], [660, 520], [720, 520], [780, 504], [822, 498], [842, 520], [832, 560], [802, 606], [770, 612], [748, 594], [700, 586], [660, 578], [620, 586], [590, 590], [540, 582], [500, 578], [468, 560]],
  z: 236, aim: { ball: 0, view: 1, up: -0.3 }, thick: 120, joints: [2, 70], cracks: 5, seed: 41, view: true, turn: [0, 0],
  top: { at: [0, -296, 150], n: [0, 0.94, 0.34] },
};

// The roof: one thick overhang across the whole width under the land's lip. Its underside's ragged lower edge, in
// the picture's pixels, hangs lowest at about ten and two o'clock from the ball; over the ball it is highest.
export const ROOF = {
  under: [[240, 346], [280, 356], [320, 350], [360, 346], [400, 342], [440, 346], [480, 340], [520, 338], [556, 348], [586, 352], [612, 340], [640, 328], [680, 322], [720, 324], [760, 330], [796, 342], [826, 348], [856, 332], [900, 318], [940, 312], [980, 318], [1020, 324], [1072, 330]],
  // How far its front face stands behind the land's edge, in units, and how far it leans back toward its foot.
  inset: 7, lean: 0,
  // It is broken into chunks, on a jittered grid this wide and tall (units), each standing out or back by up to
  // `step` units and leaning up to `tilt` its own way, with a joint this wide between.
  cell: [96, 38], jitter: 0.8, step: 9, tilt: 0.12, joint: 0,
};

// Where the rock ends below, across the picture: under it is open air, where the planet's bottom was torn away.
export const BOTTOM = [[240, 650], [260, 690], [290, 706], [320, 716], [345, 702], [362, 672], [376, 622], [400, 584], [430, 578], [460, 572], [482, 566], [500, 574], [520, 566], [560, 580], [600, 590], [620, 588], [650, 580], [690, 572], [720, 588], [748, 594], [780, 612], [802, 606], [818, 572], [840, 574], [870, 576], [900, 572], [930, 566], [960, 584], [990, 626], [1010, 650], [1030, 702], [1042, 708], [1060, 700], [1080, 690]];
