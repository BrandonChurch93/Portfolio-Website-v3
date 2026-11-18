// Sculpt S, the plan: picture 9's hollow as about twenty great masses of one solid body, read off ruled
// enlargements of the picture (node scripts/world/grid.mjs). Every outline is in the picture's own pixels
// (reference/concept/09-parts/09-the-whole-picture-at-1376.jpg, 1376 by 768).
//
// Round 2: the ball sits in a socket. Every mass but a few is set at the socket's depth (SOCKET) where its outline's
// middle is seen, with its broad face along the socket there, so the back wall faces the ball and the walls, the roof
// and the floor, which stand in front of the ball, turn their faces from it. `dz` moves a mass toward the visitor, in
// the core's radii, and `turn` turns its face away from the ball and up, in degrees.
// Round 4: every mass is a stack of sheets along a bedding of its own (field.mjs, SHEET). `sheet` sets a group's or a
// mass's: `dip`, how far its bedding leans from its face (0: the sheets lie in the face; 90: they stand on edge, a
// comb), `strikeAt`, which way their run turns from the way to the ball, or `bed`, the bedding outright.
// A mass with `z` and `aim` is placed as round 1 placed every mass: its face at depth z, turned so much toward the
// ball, the visitor and up.
// `thick` is how deep a mass is behind its face, and `seed` sets everything else of its own.

// The socket the ball sits in: how far toward the visitor the rock is, in the core's radii from its middle, against
// how far from the ball's middle it is seen, in radii. Straight behind the ball the back wall is 1.2 behind it, it
// curls forward round it, is level with the ball's middle at 1.9, and from there the walls stand in front of the ball.
export const SOCKET = [[0, -1.2], [0.8, -1.08], [1.3, -0.7], [1.6, -0.38], [1.9, 0], [2.2, 0.5], [2.6, 0.92], [3, 1.18], [3.5, 1.38], [4.2, 1.5], [9, 1.6]];
export function socket(r) {
  if (r <= SOCKET[0][0]) return SOCKET[0][1];
  for (let i = 1; i < SOCKET.length; i++) if (r <= SOCKET[i][0]) { const [a, p] = SOCKET[i - 1], [b, q] = SOCKET[i], t = (r - a) / (b - a); return p + (q - p) * t * t * (3 - 2 * t) * 0.5 + (q - p) * t * 0.5; }
  return SOCKET[SOCKET.length - 1][1];
}

// The back wall: the bowl behind and round the ball, broad plates that overlap like scales. Round 3: the plates over
// and under the ball are turned more edge on, so what is lit beside the ball is a few lips over dark recesses, and
// cream is left at the ball's two sides, whose plates meet its light broadly. Over the ball the arch is gone: the
// roof's teeth hang there (HANG).
const BACK = [
  { name: 'back-upper-left', poly: [[584, 352], [608, 342], [646, 340], [668, 348], [652, 366], [620, 384], [592, 398], [580, 380]], dz: -0.1, turn: [52, 30], thick: 60, seed: 11 },
  { name: 'back-upper-right', poly: [[760, 340], [806, 338], [846, 352], [860, 382], [838, 402], [802, 396], [774, 374]], dz: -0.16, turn: [44, 28], thick: 60, seed: 13 },
  { name: 'back-right', poly: [[786, 382], [834, 388], [856, 418], [852, 466], [832, 500], [800, 506], [776, 482], [780, 432]], dz: -0.22, turn: [26, 0], thick: 60, seed: 14 },
  { name: 'back-lower-right', poly: [[742, 496], [792, 488], [826, 504], [832, 534], [792, 546], [750, 542], [732, 520]], dz: -0.06, turn: [48, 6], thick: 60, seed: 15 },
  { name: 'back-lower-left', poly: [[564, 452], [600, 444], [618, 480], [634, 514], [604, 528], [572, 520], [560, 490]], dz: -0.12, turn: [4, 2], thick: 60, seed: 16 },
  { name: 'back-left', poly: [[574, 392], [616, 378], [614, 412], [602, 446], [564, 452], [548, 420]], dz: -0.2, turn: [6, 0], thick: 60, seed: 17 },
];

// The roof's teeth: slabs that hang from its lower edge over the ball, about as deep as the ball, their undersides
// turned down to it and lit, with the dark of the roof's underside between them. The left lobe hangs in front of the
// books.
export const HANG = [
  { name: 'hang-lobe-left', poly: [[466, 336], [498, 330], [528, 336], [524, 352], [512, 372], [500, 388], [488, 374], [474, 354]], dz: 0.05, turn: [-42, -40], thick: 44, seed: 51 },
  { name: 'hang-1', poly: [[564, 342], [588, 334], [606, 342], [598, 358], [588, 376], [576, 364], [568, 354]], dz: -0.02, turn: [-8, -38], thick: 36, seed: 52 },
  { name: 'hang-2', poly: [[604, 330], [640, 324], [670, 330], [656, 346], [638, 360], [626, 352], [614, 344]], dz: 0.12, turn: [0, -42], thick: 36, seed: 53 },
  { name: 'hang-3', poly: [[676, 328], [708, 324], [736, 330], [726, 342], [712, 352], [696, 344], [684, 338]], dz: 0.14, turn: [0, -44], thick: 36, seed: 54 },
  { name: 'hang-4', poly: [[742, 330], [774, 330], [802, 340], [814, 366], [798, 360], [776, 352], [754, 342]], dz: 0.12, turn: [-6, -40], thick: 36, seed: 55 },
  { name: 'hang-5', poly: [[818, 334], [848, 328], [872, 334], [866, 350], [854, 366], [840, 354], [826, 346]], dz: -0.04, turn: [-10, -36], thick: 40, seed: 56 },
];

// The left wall: great slabs leaning in toward the ball like fallen books, each nearer the visitor than the one
// inside it, so each throws its shadow across the next out. Then, out to the skin, dark blocks with dimly lit edges.
const LEFT = [
  { name: 'left-book-1', poly: [[392, 372], [426, 362], [456, 386], [482, 422], [506, 470], [520, 520], [506, 546], [470, 560], [446, 540], [420, 490], [402, 440], [388, 406]], dz: 0, turn: [-40, 0], thick: 60, seed: 21 },
  { name: 'left-book-2', poly: [[490, 392], [520, 380], [534, 400], [534, 430], [528, 462], [520, 500], [512, 514], [502, 498], [492, 460], [484, 420]], dz: 0.36, turn: [-14, 6], thick: 52, seed: 22 },
  { name: 'left-book-3', poly: [[520, 374], [548, 368], [570, 374], [584, 392], [570, 408], [548, 414], [528, 400]], dz: -0.1, turn: [34, -8], thick: 46, seed: 23 },
  { name: 'left-ledge', poly: [[378, 528], [430, 512], [482, 522], [522, 540], [540, 566], [500, 580], [440, 582], [396, 578], [376, 556]], dz: -0.15, turn: [-10, 10], thick: 50, seed: 24 },
  { name: 'left-dark-1', poly: [[286, 348], [332, 352], [384, 362], [390, 400], [392, 446], [346, 452], [300, 448], [290, 400]], dz: 0, turn: [-12, 0], thick: 70, seed: 25 },
  { name: 'left-dark-1b', poly: [[298, 452], [348, 456], [394, 450], [402, 490], [410, 530], [380, 560], [330, 546], [304, 504]], dz: 0.05, turn: [-12, -4], thick: 70, seed: 30 },
  { name: 'left-dark-2', poly: [[248, 330], [292, 346], [302, 420], [316, 500], [300, 560], [262, 562], [252, 480], [248, 400]], dz: 0, turn: [6, 0], thick: 80, seed: 26 },
  // Over the skin's grey crust at the hollow's top left, which showed between the land's lip and the roof: a slab
  // that stands a little proud of the planet's own surface there (`proud`, field.mjs), its face turned from the moon.
  { name: 'left-join', poly: [[292, 318], [352, 318], [410, 322], [428, 338], [420, 356], [380, 362], [330, 366], [296, 360], [288, 336]], z: 640, aim: { ball: -0.35, view: 1, up: -0.1 }, thick: 110, proud: true, seed: 37 },
  { name: 'left-low-1', poly: [[268, 522], [320, 530], [356, 546], [366, 586], [340, 602], [294, 602], [264, 582]], z: 330, aim: { ball: 0.9, view: 0.45, up: 0.5 }, thick: 60, seed: 27 },
  { name: 'left-low-2', poly: [[284, 610], [330, 620], [360, 640], [364, 680], [342, 702], [300, 706], [278, 682], [270, 640]], z: 300, aim: { ball: 0.7, view: 0.6, up: 0.2 }, thick: 60, seed: 28 },
  { name: 'left-low-3', poly: [[244, 578], [282, 590], [292, 640], [282, 702], [256, 692], [244, 640]], z: 362, aim: { ball: -0.1, view: 0.95 }, thick: 70, seed: 29 },
];

// The right wall: one very large slab at two to four o'clock, lit, with the shadow of the teeth across it, then
// darker masses with dim rims becoming the cratered skin. The teeth hang forward of everything and dip to the right.
const RIGHT = [
  { name: 'right-great', poly: [[852, 330], [878, 320], [900, 336], [908, 380], [904, 432], [900, 472], [890, 498], [874, 492], [864, 452], [856, 400]], dz: -0.05, turn: [-50, 0], thick: 60, seed: 31 },
  { name: 'right-teeth', poly: [[878, 300], [940, 294], [992, 318], [1008, 360], [988, 412], [960, 402], [930, 372], [900, 336]], dz: 0.3, turn: [8, -10], thick: 60, seed: 32 },
  { name: 'right-mid', poly: [[930, 412], [990, 402], [1040, 430], [1060, 480], [1050, 540], [1000, 560], [956, 546], [918, 500], [914, 470], [922, 440]], dz: 0, turn: [-34, 0], thick: 70, seed: 33 },
  { name: 'right-low', poly: [[960, 552], [1010, 546], [1044, 572], [1050, 630], [1040, 690], [1014, 702], [990, 662], [966, 612]], dz: 0, turn: [-10, 6], thick: 70, seed: 34 },
  { name: 'right-shelf', poly: [[818, 502], [880, 486], [940, 490], [966, 520], [952, 560], [902, 572], [852, 574], [830, 556]], dz: 0.12, turn: [14, -8], thick: 50, seed: 35 },
  { name: 'right-upper', poly: [[990, 320], [1062, 310], [1068, 362], [1060, 412], [1020, 422], [1000, 382]], dz: 0.05, turn: [-12, 0], thick: 70, seed: 36 },
];

// Each group's sheets: round the ball on edge, so it is a comb of lit ends with dark partings between; the teeth
// nearer lying in their faces; the left books and the right slabs leaning between.
const sheeted = (list, sheet) => list.map((m) => ({ ...m, sheet: { ...sheet, ...(m.sheet ?? {}) } }));
export const MASSES = [...sheeted(BACK, { dip: [62, 84] }), ...sheeted(HANG, { dip: [16, 44] }), ...sheeted(LEFT, { dip: [42, 70] }), ...sheeted(RIGHT, { dip: [30, 62] })];

// The floor: a ledge under the ball, on the socket, so it is behind the page's stream at the middle and in front of
// the ball at each end. Round 3: a dark brown mass that slopes away, broken into uneven blocks each turned its own
// way, mostly down from the ball, with few layers; lit only on a few edges and one short lip beside the ball.
const FLOORED = [
  { name: 'floor-left-a', poly: [[468, 524], [520, 510], [562, 506], [578, 532], [560, 576], [520, 594], [496, 594], [470, 566]], dz: 0.8, turn: [-6, -66], thick: 80, seed: 41 },
  { name: 'floor-left-b', poly: [[566, 532], [612, 536], [646, 546], [648, 566], [630, 594], [600, 590], [572, 580], [562, 552]], dz: 0.9, turn: [10, -72], thick: 80, seed: 44 },
  { name: 'floor-lip', poly: [[616, 524], [644, 518], [668, 524], [660, 536], [630, 540]], dz: -0.05, turn: [24, -40], thick: 40, seed: 47 },
  { name: 'floor-middle', poly: [[630, 548], [690, 550], [744, 544], [762, 556], [756, 584], [740, 598], [700, 590], [660, 586], [636, 572]], dz: 0.3, turn: [0, -70], thick: 80, seed: 42 },
  { name: 'floor-right-a', poly: [[740, 530], [780, 518], [800, 520], [804, 540], [790, 576], [762, 600], [750, 592], [744, 562]], dz: 0.85, turn: [6, -64], thick: 80, seed: 43 },
  { name: 'floor-right-b', poly: [[798, 512], [822, 506], [842, 524], [834, 560], [806, 604], [772, 614], [778, 584], [796, 548]], dz: 0.9, turn: [-12, -74], thick: 80, seed: 46 },
];
// The floor's sheets lie nearly level, each block's tipped its own way.
export const FLOOR = FLOORED.map((m, i) => ({ ...m, sheet: { bed: [[0.16, 1, 0.3], [-0.2, 1, 0.22], [0.05, 1, 0.4], [0.1, 1, 0.18], [-0.12, 1, 0.34], [0.22, 1, 0.26]][i % 6], thick: [9, 15], pull: [-4, 18], ...(m.sheet ?? {}) } }));
// What is kept clear for the page's stream under the ball: nothing nearer the visitor than z within half (and so
// much more for each unit further toward the visitor) of its line, under top.
export const LANE = { z: 128, half: 14, widen: 0.3, top: -296 };

// The roof: one thick overhang across the whole width under the land's lip. Its underside's ragged lower edge, in
// the picture's pixels, hangs lowest at about ten and two o'clock from the ball; over the ball it is highest.
export const ROOF = {
  under: [[240, 346], [280, 356], [320, 350], [360, 346], [400, 342], [440, 346], [480, 340], [520, 338], [548, 350], [568, 360], [586, 348], [604, 342], [620, 352], [638, 332], [662, 326], [680, 334], [694, 324], [716, 326], [732, 336], [748, 328], [770, 334], [792, 348], [808, 340], [826, 354], [842, 340], [858, 332], [900, 318], [940, 312], [980, 318], [1020, 324], [1072, 330]],
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
