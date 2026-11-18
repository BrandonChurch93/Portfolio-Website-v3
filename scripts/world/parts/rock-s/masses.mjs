// Sculpt S, the plan: picture 9's hollow as about twenty great masses of one solid body, read off ruled
// enlargements of the picture (node scripts/world/grid.mjs). Every outline is in the picture's own pixels
// (reference/concept/09-parts/09-the-whole-picture-at-1376.jpg, 1376 by 768).
//
// Round 2: the ball sits in a socket. Every mass but a few is set at the socket's depth (SOCKET) where its outline's
// middle is seen, with its broad face along the socket there, so the back wall faces the ball and the walls, the roof
// and the floor, which stand in front of the ball, turn their faces from it. `dz` moves a mass toward the visitor, in
// the core's radii, and `turn` turns its face away from the ball and up, in degrees.
// A face is a stack of layers (`layers`): each `every` units across, its broken edge toward the ball a lip that steps
// down to the next, and the layer between turned from the ball by `tilt` degrees, so its edges catch the light and
// the layers do not. `bed` turns the layers' run from square to the ball, in degrees, and `pinch` is the share of a
// layer's length where its step dies out.
// A mass with `z` and `aim` is placed as round 1 placed every mass: its face at depth z, turned so much toward the
// ball, the visitor and up.
// `thick` is how deep a mass is behind its face, `joints` the two directions its stone splits along (the second only
// in short breaks that stop at the first), `cracks` how many, and `seed` sets everything else of its own.

// The socket the ball sits in: how far toward the visitor the rock is, in the core's radii from its middle, against
// how far from the ball's middle it is seen, in radii. Straight behind the ball the back wall is 1.2 behind it, it
// curls forward round it, is level with the ball's middle at 1.9, and from there the walls stand in front of the ball.
export const SOCKET = [[0, -1.2], [0.8, -1.08], [1.3, -0.7], [1.6, -0.38], [1.9, 0], [2.2, 0.5], [2.6, 0.92], [3, 1.18], [3.5, 1.38], [4.2, 1.5], [9, 1.6]];
export function socket(r) {
  if (r <= SOCKET[0][0]) return SOCKET[0][1];
  for (let i = 1; i < SOCKET.length; i++) if (r <= SOCKET[i][0]) { const [a, p] = SOCKET[i - 1], [b, q] = SOCKET[i], t = (r - a) / (b - a); return p + (q - p) * t * t * (3 - 2 * t) * 0.5 + (q - p) * t * 0.5; }
  return SOCKET[SOCKET.length - 1][1];
}

// Layers: three to eight across a face, each with a step of 2.5 to 10 units. Near the ball narrower and turned
// further from it, further out broader, with wider lit risers.
const FINE = { every: [8, 24], tilt: [36, 62], pinch: 0.42 };
const PLATES = { every: [10, 36], tilt: [26, 46], pinch: 0.4 };
const SLABS = { every: [16, 52], tilt: [18, 36], pinch: 0.42, riser: [3, 9] };

// The back wall: the bowl behind and round the ball, broad plates that overlap like scales.
const BACK = [
  { name: 'back-upper-left', poly: [[556, 350], [600, 332], [648, 332], [676, 342], [655, 366], [618, 384], [584, 402], [560, 384]], dz: -0.08, turn: [50, 34], thick: 60, layers: { ...FINE, bed: 20 }, joints: [28, 104], cracks: 2, seed: 11 },
  { name: 'back-arch', poly: [[628, 330], [690, 322], [752, 326], [800, 340], [778, 356], [728, 352], [680, 352], [640, 354]], dz: -0.02, turn: [38, 0], thick: 60, layers: { ...FINE, bed: -8 }, joints: [6, 78], cracks: 2, seed: 12 },
  { name: 'back-upper-right', poly: [[752, 334], [806, 336], [848, 350], [862, 382], [838, 402], [802, 396], [772, 372]], dz: -0.14, turn: [42, 30], thick: 60, layers: { ...FINE, bed: -24 }, joints: [-38, 40], cracks: 2, seed: 13 },
  { name: 'back-right', poly: [[786, 382], [834, 388], [856, 418], [852, 466], [832, 500], [800, 506], [776, 482], [780, 432]], dz: -0.22, turn: [34, 0], thick: 60, layers: { ...PLATES, tilt: [36, 56], bed: 14 }, joints: [62, -18], cracks: 2, seed: 14 },
  { name: 'back-lower-right', poly: [[742, 496], [792, 488], [826, 504], [832, 534], [792, 546], [750, 542], [732, 520]], dz: -0.06, turn: [46, 6], thick: 60, layers: { ...FINE, bed: -14 }, joints: [-8, 70], cracks: 2, seed: 15 },
  { name: 'back-lower-left', poly: [[556, 452], [600, 444], [618, 480], [634, 514], [600, 532], [562, 522], [542, 490]], dz: -0.12, turn: [48, 4], thick: 60, layers: { ...FINE, bed: 26 }, joints: [-58, 22], cracks: 2, seed: 16 },
  { name: 'back-left', poly: [[572, 386], [616, 374], [614, 412], [602, 446], [564, 452], [546, 420]], dz: -0.2, turn: [42, 0], thick: 60, layers: { ...FINE, tilt: [48, 66], bed: -30 }, joints: [74, 10], cracks: 2, seed: 17 },
];

// The left wall: great slabs leaning in toward the ball like fallen books, each nearer the visitor than the one
// inside it, so each throws its shadow across the next out. Then, out to the skin, dark blocks with dimly lit edges.
const LEFT = [
  { name: 'left-book-1', poly: [[392, 372], [426, 362], [456, 386], [482, 422], [506, 470], [520, 520], [506, 546], [470, 560], [446, 540], [420, 490], [402, 440], [388, 406]], dz: 0, turn: [-22, 0], thick: 60, layers: { ...SLABS, bed: 34 }, joints: [-34, 52], cracks: 2, seed: 21 },
  { name: 'left-book-2', poly: [[480, 356], [518, 342], [534, 366], [534, 410], [528, 452], [522, 498], [514, 514], [504, 500], [492, 460], [478, 410]], dz: 0.42, turn: [-8, 0], thick: 52, layers: { ...PLATES, bed: 30 }, joints: [-50, 30], cracks: 2, seed: 22 },
  { name: 'left-book-3', poly: [[514, 360], [548, 350], [576, 356], [592, 378], [576, 400], [548, 408], [524, 390]], dz: 0.3, turn: [0, -8], thick: 46, layers: { ...FINE, bed: 40 }, joints: [-60, 18], cracks: 1, seed: 23 },
  // The black wedge between the books and the back wall: the side of a slab turned from the ball.
  { name: 'left-wedge', poly: [[526, 352], [546, 364], [552, 414], [550, 466], [544, 520], [530, 516], [528, 462], [530, 408]], dz: 0.15, turn: [72, 0], thick: 50, layers: { ...PLATES, bed: 60 }, joints: [-70, 20], cracks: 1, seed: 37 },
  { name: 'left-ledge', poly: [[378, 528], [430, 512], [482, 522], [522, 540], [540, 566], [500, 580], [440, 582], [396, 578], [376, 556]], dz: -0.15, turn: [-10, 10], thick: 50, layers: { ...PLATES, bed: -10 }, joints: [8, 84], cracks: 2, seed: 24 },
  { name: 'left-dark-1', poly: [[286, 348], [332, 352], [384, 362], [390, 400], [392, 446], [346, 452], [300, 448], [290, 400]], dz: 0, turn: [-12, 0], thick: 70, layers: { ...SLABS, bed: 20 }, joints: [-70, 12], cracks: 2, seed: 25 },
  { name: 'left-dark-1b', poly: [[298, 452], [348, 456], [394, 450], [402, 490], [410, 530], [380, 560], [330, 546], [304, 504]], dz: 0.05, turn: [-12, -4], thick: 70, layers: { ...SLABS, bed: -16 }, joints: [-58, 30], cracks: 1, seed: 30 },
  { name: 'left-dark-2', poly: [[248, 330], [292, 346], [302, 420], [316, 500], [300, 560], [262, 562], [252, 480], [248, 400]], dz: 0, turn: [6, 0], thick: 80, layers: { ...SLABS, bed: 10 }, joints: [-80, 20], cracks: 1, seed: 26 },
  { name: 'left-low-1', poly: [[268, 522], [320, 530], [356, 546], [366, 586], [340, 602], [294, 602], [264, 582]], z: 300, aim: { ball: 0.8, view: 0.5, up: 0.25 }, thick: 60, layers: { ...PLATES, bed: 0 }, joints: [-30, 60], cracks: 2, seed: 27 },
  { name: 'left-low-2', poly: [[284, 610], [330, 620], [360, 640], [364, 680], [342, 702], [300, 706], [278, 682], [270, 640]], z: 300, aim: { ball: 0.7, view: 0.6, up: 0.2 }, thick: 60, layers: { ...PLATES, bed: 10 }, joints: [-24, 66], cracks: 2, seed: 28 },
  { name: 'left-low-3', poly: [[244, 578], [282, 590], [292, 640], [282, 702], [256, 692], [244, 640]], z: 362, aim: { ball: -0.1, view: 0.95 }, thick: 70, layers: { ...SLABS, bed: 0 }, joints: [-75, 15], cracks: 1, seed: 29 },
];

// The right wall: one very large slab at two to four o'clock, lit, with the shadow of the teeth across it, then
// darker masses with dim rims becoming the cratered skin. The teeth hang forward of everything and dip to the right.
const RIGHT = [
  { name: 'right-great', poly: [[852, 330], [880, 318], [910, 338], [934, 380], [930, 432], [914, 472], [894, 498], [874, 492], [864, 452], [856, 400]], dz: -0.05, turn: [4, 0], thick: 60, layers: { ...SLABS, tilt: [16, 30], bed: 50 }, joints: [-62, 20], cracks: 2, seed: 31 },
  { name: 'right-teeth', poly: [[878, 300], [940, 294], [992, 318], [1008, 360], [988, 412], [960, 402], [930, 372], [900, 336]], dz: 0.3, turn: [8, -10], thick: 60, layers: { ...PLATES, bed: -40 }, joints: [-40, 46], cracks: 2, seed: 32 },
  { name: 'right-mid', poly: [[930, 412], [990, 402], [1040, 430], [1060, 480], [1050, 540], [1000, 560], [956, 546], [918, 500], [914, 470], [922, 440]], dz: 0, turn: [-16, 0], thick: 70, layers: { ...SLABS, bed: -30 }, joints: [-35, 55], cracks: 2, seed: 33 },
  { name: 'right-low', poly: [[960, 552], [1010, 546], [1044, 572], [1050, 630], [1040, 690], [1014, 702], [990, 662], [966, 612]], dz: 0, turn: [-10, 6], thick: 70, layers: { ...SLABS, bed: -20 }, joints: [-48, 36], cracks: 2, seed: 34 },
  { name: 'right-shelf', poly: [[818, 502], [880, 486], [940, 490], [966, 520], [952, 560], [902, 572], [852, 574], [830, 556]], dz: 0.12, turn: [14, -8], thick: 50, layers: { ...PLATES, tilt: [44, 62], bed: -6 }, joints: [4, 76], cracks: 2, seed: 35 },
  { name: 'right-upper', poly: [[990, 320], [1062, 310], [1068, 362], [1060, 412], [1020, 422], [1000, 382]], dz: 0.05, turn: [-12, 0], thick: 70, layers: { ...SLABS, bed: -36 }, joints: [-66, 20], cracks: 1, seed: 36 },
];

export const MASSES = [...BACK, ...LEFT, ...RIGHT];

// The floor: a ledge under the ball, in three masses on the socket, so it is behind the page's stream at the middle
// and in front of the ball at each end. Its layers run along it, each with a lip turned up to the ball and a face
// turned down from it, a mid brown; its underside hangs in lobes where the small streams leave.
const ALONG = { every: [10, 34], tilt: [20, 40], pinch: 0.46, toward: [0, 1, 0] };
export const FLOOR = [
  { name: 'floor-left', poly: [[468, 530], [520, 520], [566, 522], [612, 532], [646, 544], [648, 566], [630, 594], [600, 590], [560, 584], [520, 594], [496, 594], [470, 566]], dz: 0.24, turn: [0, -46], thick: 80, layers: { ...ALONG, bed: 4 }, joints: [2, 70], cracks: 2, seed: 41 },
  { name: 'floor-middle', poly: [[630, 530], [690, 534], [744, 524], [762, 548], [756, 584], [740, 598], [700, 590], [660, 586], [636, 572]], dz: 0.3, turn: [0, -54], thick: 80, layers: { ...ALONG, bed: -3 }, joints: [-6, 64], cracks: 1, seed: 42 },
  { name: 'floor-right', poly: [[734, 514], [780, 502], [822, 498], [842, 520], [834, 560], [806, 604], [772, 614], [750, 600], [744, 566]], dz: 0.28, turn: [0, -48], thick: 80, layers: { ...ALONG, bed: -8 }, joints: [10, 80], cracks: 2, seed: 43 },
];
// What is kept clear for the page's stream under the ball: nothing nearer the visitor than z within half (and so
// much more for each unit further toward the visitor) of its line, under top.
export const LANE = { z: 128, half: 14, widen: 0.3, top: -296 };

// The roof: one thick overhang across the whole width under the land's lip. Its underside's ragged lower edge, in
// the picture's pixels, hangs lowest at about ten and two o'clock from the ball; over the ball it is highest.
export const ROOF = {
  under: [[240, 346], [280, 356], [320, 350], [360, 346], [400, 342], [440, 346], [480, 340], [520, 338], [556, 348], [586, 352], [612, 340], [640, 328], [680, 322], [720, 324], [760, 330], [796, 342], [826, 348], [856, 332], [900, 318], [940, 312], [980, 318], [1020, 324], [1072, 330]],
  // How far its front face stands behind the land's edge, in units, and how far it leans back toward its foot.
  inset: 7, lean: 0,
  // It is broken into chunks, on a jittered grid this wide and tall (units), each standing out or back by up to
  // `step` units and leaning up to `tilt` its own way, with a joint this wide between.
  cell: [96, 38], jitter: 0.8, step: 9, tilt: 0.12, joint: 0,
  // At the left the land's edge runs back toward the visitor's right, so a roof whose front followed it faced the moon
  // and came out a lit grey. Each chunk there is turned this much more (its face's slope across, units for a unit)
  // from the moon, more and more from so far left of the middle to so far, so its front is dark and only the step
  // to the next chunk catches the moon.
  away: [1.05, 20, 200],
};

// Where the rock ends below, across the picture: under it is open air, where the planet's bottom was torn away.
export const BOTTOM = [[240, 650], [260, 690], [290, 706], [320, 716], [345, 702], [362, 672], [376, 622], [400, 584], [430, 578], [460, 572], [482, 566], [500, 574], [520, 566], [560, 580], [600, 590], [620, 588], [650, 580], [690, 572], [720, 588], [748, 594], [780, 612], [802, 606], [818, 572], [840, 574], [870, 576], [900, 572], [930, 566], [960, 584], [990, 626], [1010, 650], [1030, 702], [1042, 708], [1060, 700], [1080, 690]];
