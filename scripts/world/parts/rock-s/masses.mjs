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

// The back wall: the bowl behind and round the ball, broad plates that overlap like scales. Round 3: the plates over
// and under the ball are turned more edge on, so what is lit beside the ball is a few lips over dark recesses, and
// cream is left at the ball's two sides, whose plates meet its light broadly. Over the ball the arch is gone: the
// roof's teeth hang there (HANG).
const BACK = [
  { name: 'back-upper-left', poly: [[584, 352], [608, 342], [646, 340], [668, 348], [652, 366], [620, 384], [592, 398], [580, 380]], dz: -0.1, turn: [52, 30], thick: 60, layers: { ...FINE, every: [7, 30], bed: 34 }, joints: [28, 104], cracks: 2, seed: 11, fault: 1 },
  { name: 'back-upper-right', poly: [[760, 340], [806, 338], [846, 352], [860, 382], [838, 402], [802, 396], [774, 374]], dz: -0.16, turn: [44, 28], thick: 60, layers: { ...FINE, every: [12, 44], bed: -52 }, joints: [-38, 64], cracks: 1, seed: 13, fault: 0 },
  { name: 'back-right', poly: [[786, 382], [834, 388], [856, 418], [852, 466], [832, 500], [800, 506], [776, 482], [780, 432]], dz: -0.22, turn: [26, 0], thick: 60, layers: { ...PLATES, every: [14, 48], tilt: [24, 44], bed: 38 }, joints: [62, -18], cracks: 2, seed: 14, fault: 1 },
  { name: 'back-lower-right', poly: [[742, 496], [792, 488], [826, 504], [832, 534], [792, 546], [750, 542], [732, 520]], dz: -0.06, turn: [48, 6], thick: 60, layers: { ...FINE, every: [8, 30], bed: -4 }, joints: [-8, 70], cracks: 2, seed: 15, fault: 1 },
  { name: 'back-lower-left', poly: [[564, 452], [600, 444], [618, 480], [634, 514], [604, 528], [572, 520], [560, 490]], dz: -0.12, turn: [4, 2], thick: 60, layers: { ...PLATES, every: [12, 52], tilt: [20, 40], bed: -34 }, joints: [-58, 22], cracks: 2, seed: 16, fault: 2 },
  { name: 'back-left', poly: [[574, 392], [616, 378], [614, 412], [602, 446], [564, 452], [548, 420]], dz: -0.2, turn: [6, 0], thick: 60, layers: { ...PLATES, every: [16, 50], tilt: [22, 40], bed: 12 }, joints: [74, 10], cracks: 2, seed: 17, fault: 1 },
];

// The roof's teeth: slabs that hang from its lower edge over the ball, about as deep as the ball, their undersides
// turned down to it and lit, with the dark of the roof's underside between them. The left lobe hangs in front of the
// books.
export const HANG = [
  { name: 'hang-lobe-left', poly: [[466, 336], [498, 330], [528, 336], [524, 352], [512, 372], [500, 388], [488, 374], [474, 354]], dz: 0.05, turn: [-42, -40], thick: 44, layers: { ...PLATES, every: [12, 40], bed: 50 }, joints: [-40, 40], cracks: 1, seed: 51, fault: 0 },
  { name: 'hang-1', poly: [[564, 342], [588, 334], [606, 342], [598, 358], [588, 376], [576, 364], [568, 354]], dz: -0.02, turn: [-8, -38], thick: 36, joints: [-60, 20], cracks: 1, seed: 52 },
  { name: 'hang-2', poly: [[604, 330], [640, 324], [670, 330], [656, 346], [638, 360], [626, 352], [614, 344]], dz: 0.12, turn: [0, -42], thick: 36, joints: [-20, 60], cracks: 1, seed: 53 },
  { name: 'hang-3', poly: [[676, 328], [708, 324], [736, 330], [726, 342], [712, 352], [696, 344], [684, 338]], dz: 0.14, turn: [0, -44], thick: 36, joints: [10, 80], cracks: 1, seed: 54 },
  { name: 'hang-4', poly: [[742, 330], [774, 330], [802, 340], [814, 366], [798, 360], [776, 352], [754, 342]], dz: 0.12, turn: [-6, -40], thick: 36, joints: [30, -50], cracks: 1, seed: 55 },
  { name: 'hang-5', poly: [[818, 334], [848, 328], [872, 334], [866, 350], [854, 366], [840, 354], [826, 346]], dz: -0.04, turn: [-10, -36], thick: 40, joints: [50, -30], cracks: 1, seed: 56 },
];

// The left wall: great slabs leaning in toward the ball like fallen books, each nearer the visitor than the one
// inside it, so each throws its shadow across the next out. Then, out to the skin, dark blocks with dimly lit edges.
const LEFT = [
  { name: 'left-book-1', poly: [[392, 372], [426, 362], [456, 386], [482, 422], [506, 470], [520, 520], [506, 546], [470, 560], [446, 540], [420, 490], [402, 440], [388, 406]], dz: 0, turn: [-40, 0], thick: 60, layers: { ...SLABS, every: [20, 70], bed: 34 }, joints: [-34, 52], cracks: 2, seed: 21, fault: 1 },
  { name: 'left-book-2', poly: [[490, 392], [520, 380], [534, 400], [534, 430], [528, 462], [520, 500], [512, 514], [502, 498], [492, 460], [484, 420]], dz: 0.36, turn: [-14, 6], thick: 52, layers: { ...PLATES, every: [10, 46], bed: -18 }, joints: [-50, 30], cracks: 2, seed: 22, fault: 2 },
  { name: 'left-book-3', poly: [[520, 374], [548, 368], [570, 374], [584, 392], [570, 408], [548, 414], [528, 400]], dz: -0.1, turn: [34, -8], thick: 46, layers: { ...PLATES, every: [10, 40], bed: 64 }, joints: [-60, 18], cracks: 1, seed: 23 },
  { name: 'left-ledge', poly: [[378, 528], [430, 512], [482, 522], [522, 540], [540, 566], [500, 580], [440, 582], [396, 578], [376, 556]], dz: -0.15, turn: [-10, 10], thick: 50, layers: { ...PLATES, bed: -10 }, joints: [8, 84], cracks: 2, seed: 24 },
  { name: 'left-dark-1', poly: [[286, 348], [332, 352], [384, 362], [390, 400], [392, 446], [346, 452], [300, 448], [290, 400]], dz: 0, turn: [-12, 0], thick: 70, layers: { ...SLABS, bed: 20 }, joints: [-70, 12], cracks: 2, seed: 25 },
  { name: 'left-dark-1b', poly: [[298, 452], [348, 456], [394, 450], [402, 490], [410, 530], [380, 560], [330, 546], [304, 504]], dz: 0.05, turn: [-12, -4], thick: 70, layers: { ...SLABS, bed: -16 }, joints: [-58, 30], cracks: 1, seed: 30 },
  { name: 'left-dark-2', poly: [[248, 330], [292, 346], [302, 420], [316, 500], [300, 560], [262, 562], [252, 480], [248, 400]], dz: 0, turn: [6, 0], thick: 80, layers: { ...SLABS, bed: 10 }, joints: [-80, 20], cracks: 1, seed: 26 },
  { name: 'left-low-1', poly: [[268, 522], [320, 530], [356, 546], [366, 586], [340, 602], [294, 602], [264, 582]], z: 330, aim: { ball: 0.9, view: 0.45, up: 0.5 }, thick: 60, layers: { ...PLATES, bed: 0 }, joints: [-30, 60], cracks: 2, seed: 27 },
  { name: 'left-low-2', poly: [[284, 610], [330, 620], [360, 640], [364, 680], [342, 702], [300, 706], [278, 682], [270, 640]], z: 300, aim: { ball: 0.7, view: 0.6, up: 0.2 }, thick: 60, layers: { ...PLATES, bed: 10 }, joints: [-24, 66], cracks: 2, seed: 28 },
  { name: 'left-low-3', poly: [[244, 578], [282, 590], [292, 640], [282, 702], [256, 692], [244, 640]], z: 362, aim: { ball: -0.1, view: 0.95 }, thick: 70, layers: { ...SLABS, bed: 0 }, joints: [-75, 15], cracks: 1, seed: 29 },
];

// The right wall: one very large slab at two to four o'clock, lit, with the shadow of the teeth across it, then
// darker masses with dim rims becoming the cratered skin. The teeth hang forward of everything and dip to the right.
const RIGHT = [
  { name: 'right-great', poly: [[852, 330], [878, 320], [900, 336], [908, 380], [904, 432], [900, 472], [890, 498], [874, 492], [864, 452], [856, 400]], dz: -0.05, turn: [-30, 0], thick: 60, layers: { ...SLABS, every: [18, 64], tilt: [16, 30], bed: 18 }, joints: [-62, 20], cracks: 2, seed: 31, fault: 1 },
  { name: 'right-teeth', poly: [[878, 300], [940, 294], [992, 318], [1008, 360], [988, 412], [960, 402], [930, 372], [900, 336]], dz: 0.3, turn: [8, -10], thick: 60, layers: { ...PLATES, bed: -40 }, joints: [-40, 46], cracks: 2, seed: 32 },
  { name: 'right-mid', poly: [[930, 412], [990, 402], [1040, 430], [1060, 480], [1050, 540], [1000, 560], [956, 546], [918, 500], [914, 470], [922, 440]], dz: 0, turn: [-16, 0], thick: 70, layers: { ...SLABS, bed: -30 }, joints: [-35, 55], cracks: 2, seed: 33 },
  { name: 'right-low', poly: [[960, 552], [1010, 546], [1044, 572], [1050, 630], [1040, 690], [1014, 702], [990, 662], [966, 612]], dz: 0, turn: [-10, 6], thick: 70, layers: { ...SLABS, bed: -20 }, joints: [-48, 36], cracks: 2, seed: 34 },
  { name: 'right-shelf', poly: [[818, 502], [880, 486], [940, 490], [966, 520], [952, 560], [902, 572], [852, 574], [830, 556]], dz: 0.12, turn: [14, -8], thick: 50, layers: { ...PLATES, every: [14, 50], tilt: [44, 62], bed: 28 }, joints: [4, 76], cracks: 2, seed: 35, fault: 2 },
  { name: 'right-upper', poly: [[990, 320], [1062, 310], [1068, 362], [1060, 412], [1020, 422], [1000, 382]], dz: 0.05, turn: [-12, 0], thick: 70, layers: { ...SLABS, bed: -36 }, joints: [-66, 20], cracks: 1, seed: 36 },
];

export const MASSES = [...BACK, ...HANG, ...LEFT, ...RIGHT];

// The floor: a ledge under the ball, on the socket, so it is behind the page's stream at the middle and in front of
// the ball at each end. Round 3: a dark brown mass that slopes away, broken into uneven blocks each turned its own
// way, mostly down from the ball, with few layers; lit only on a few edges and one short lip beside the ball.
const ALONG = { every: [16, 60], tilt: [14, 30], pinch: 0.5, toward: [0, 1, 0] };
export const FLOOR = [
  { name: 'floor-left-a', poly: [[468, 524], [520, 510], [562, 506], [578, 532], [560, 576], [520, 594], [496, 594], [470, 566]], dz: 0.8, turn: [-6, -66], thick: 80, layers: { ...ALONG, bed: 12 }, joints: [2, 70], cracks: 2, seed: 41, fault: 1 },
  { name: 'floor-left-b', poly: [[566, 532], [612, 536], [646, 546], [648, 566], [630, 594], [600, 590], [572, 580], [562, 552]], dz: 0.9, turn: [10, -72], thick: 80, layers: { ...ALONG, bed: -16 }, joints: [-20, 50], cracks: 2, seed: 44, fault: 2 },
  { name: 'floor-lip', poly: [[616, 524], [644, 518], [668, 524], [660, 536], [630, 540]], dz: -0.05, turn: [-10, 0], thick: 40, joints: [-6, 64], cracks: 1, seed: 47 },
  { name: 'floor-middle', poly: [[630, 548], [690, 550], [744, 544], [762, 556], [756, 584], [740, 598], [700, 590], [660, 586], [636, 572]], dz: 0.3, turn: [0, -70], thick: 80, layers: { ...ALONG, bed: 6 }, joints: [-6, 64], cracks: 1, seed: 42, fault: 1 },
  { name: 'floor-right-a', poly: [[740, 530], [780, 518], [800, 520], [804, 540], [790, 576], [762, 600], [750, 592], [744, 562]], dz: 0.85, turn: [6, -64], thick: 80, layers: { ...ALONG, bed: -10 }, joints: [10, 80], cracks: 2, seed: 43, fault: 1 },
  { name: 'floor-right-b', poly: [[798, 512], [822, 506], [842, 524], [834, 560], [806, 604], [772, 614], [778, 584], [796, 548]], dz: 0.9, turn: [-12, -74], thick: 80, layers: { ...ALONG, bed: 20 }, joints: [30, -60], cracks: 2, seed: 46, fault: 2 },
];
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
