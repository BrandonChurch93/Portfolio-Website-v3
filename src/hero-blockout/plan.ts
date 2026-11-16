// Study 32: the hero's world, started again from nothing. He set the built world and both worlds of Study 31 aside
// and asked for a new model of the same idea: a planet torn open, its core showing, the stream falling from the
// core, what broke away round it. Pictures he had made (reference/concept/) set the look. This is the world as
// numbers and descriptions: its shape and depth, the camera, the sizes of what stands on it, where the core hangs,
// and how all of it sits under his words.
//
// Its fourth round, built to the pictures he picked on Nov 15. The top is picture 4's: about forty large towers
// standing apart, the pyramid at the front left, trees in rows between the towers and the land's front edge, an
// avenue to that edge, and crescent dunes at the front right. Everything under the land is picture 9's: a deep
// hollow under an overhanging roof with the core hanging free in it, a ledge under the core, the planet's outer
// surface kept at the left and the right, with craters on the right, which the moon lights, and cracks lit from
// inside on the left, which it does not. Smaller streams leave the torn rock. What broke away is made new: it
// hangs low, under and round the bottom of the planet, as one scene.
//
// The hero is seen in three steps on the scroll: the skyline at rest, then the land, then the catastrophe.
//
// Units, one a CSS pixel on a screen 1460 wide. The origin is the top of the planet, at the spire's foot. x to the
// visitor's right, y up, z toward the visitor.

export const D2R = Math.PI / 180;

// The planet. As wide as before, which he called perfect. Its top is a gentle dome, the top of a far larger
// sphere, so the land curves and is not a table. Under the rim its body is a deep bowl that is fuller than a half
// sphere toward its foot (full is how square its outline is: 2 is an ellipse), as the picture's is.
export const WORLD = { half: 660, top: 1900, deep: 540, full: 2.6 } as const;
export const RIM = WORLD.top - Math.sqrt(WORLD.top ** 2 - WORLD.half ** 2);
export const dome = (x: number, z: number): number => Math.sqrt(Math.max(1, WORLD.top ** 2 - x * x - z * z)) - WORLD.top;
// How far out of the planet's body a place is: 1 on its outer surface, under 1 inside it.
export function shell(x: number, y: number, z: number): number {
  const r = Math.hypot(x, z) / WORLD.half, d = Math.max(0, -(y + RIM)) / WORLD.deep;
  return (r ** WORLD.full + d ** WORLD.full) ** (1 / WORLD.full);
}
// A place on the planet's outer surface: so far round from straight toward the visitor (to the visitor's right is
// over 0), and so far down from the rim, 0 to 1.
export function skinAt(th: number, t: number): [number, number, number] {
  const r = WORLD.half * (1 - t ** WORLD.full) ** (1 / WORLD.full);
  return [r * Math.sin(th), -RIM - WORLD.deep * t, r * Math.cos(th)];
}

// The core: a ball of the stream's light hanging free in the hollow, on the hero's center line. Forward of the
// planet's middle, so the roof of the hollow does not hide it from above.
export const CORE = { at: [0, -410, 118] as const, r: 96 } as const;

// The spire: the tallest thing by far, on the center line, with one thin ring near its top, tilted as Saturn's is.
export const SPIRE = { tall: 330, foot: 48, ring: { r: 66, thick: 2.6, up: 0.79, tilt: [9, 17] as const } } as const;
// The open court round the spire's foot.
export const COURT = 88;
// The pyramid: at the front left, in front of the towers, on a square court of its own. Polished gold.
export const PYRAMID = { x: -262, z: 170, base: 208, tall: 126, court: 128, turn: 36 } as const;
// A place on the map, as the pyramid has it: across and along its own sides, from its middle.
export function pyramidal(x: number, z: number): [number, number] {
  const c = Math.cos(PYRAMID.turn * D2R), k = Math.sin(PYRAMID.turn * D2R), rx = x - PYRAMID.x, rz = z - PYRAMID.z;
  return [rx * c - rz * k, rx * k + rz * c];
}
// The avenue from the spire's court toward the visitor, which ends in the air where the ground is torn away. A
// strip of light runs down its middle.
export const AVENUE = { half: 28, from: 60, strip: 5 } as const;
// The road round the rim at the visitor's left: how far out it lies, its half width, and from where to where,
// in degrees round from straight toward the visitor.
export const ROAD = { r: 606, half: 8, from: -114, to: -9 } as const;
// The streets among the towers: rings round the spire, and spokes between them.
export const STREETS = { rings: [152, 246, 346, 452] as const, half: 5, spokes: 12, turn: 15 } as const;

// How it is looked at: from straight in front and from above, by so many degrees, from far off.
export const VIEW = { el: [8, 12, 16] as const, rest: 12, back: 9000 } as const;
// Its host on the page: this wide whatever the screen, this tall, with its top this far over the spire's tip. It
// is tall enough to hold what broke away under the planet.
export const HOST = { wide: 1460, tall: 1600, over: 80 } as const;
// His words, as the hero page sets them (src/hero/board.ts).
export const WORDS = { w: 960, tall: 330, least: 90, third: 0.33, rise: 146, gap: 20 } as const;

// The moon: the one light that shapes the world, and it does not follow the cursor. It is the moon in the page's
// own sky, at the visitor's upper right, and it stands behind the world: so the hollows of the dunes that face the
// visitor are in shadow, the craters on the planet's right side are raked by it, and the torn face is left to the
// core's light.
export const MOONWARD = [0.78, 0.5, -0.36] as const;

// Where a point is drawn in the host: how far to the right of its center line, and how far down from its top.
export function drawn(x: number, y: number, z: number, el: number = VIEW.rest): [number, number] {
  const e = el * D2R, se = Math.sin(e), ce = Math.cos(e), dy = y - (SPIRE.tall - (HOST.tall / 2 - HOST.over) / ce);
  const k = VIEW.back / (VIEW.back - dy * se - z * ce);
  return [x * k, HOST.tall / 2 - (dy * ce - z * se) * k];
}

const hash = (x: number, y: number, z: number, s: number): number => {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683) ^ Math.imul(s, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const ease = (t: number): number => t * t * (3 - 2 * t);
export const ramp = (a: number, b: number, x: number): number => ease(Math.min(1, Math.max(0, (x - a) / (b - a))));
// Smooth noise, 0 to 1.
export function noise(x: number, y: number, z: number, s = 0): number {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = ease(x - i), v = ease(y - j), w = ease(z - k);
  const a = hash(i, j, k, s) * (1 - u) + hash(i + 1, j, k, s) * u, b = hash(i, j + 1, k, s) * (1 - u) + hash(i + 1, j + 1, k, s) * u;
  const c = hash(i, j, k + 1, s) * (1 - u) + hash(i + 1, j, k + 1, s) * u, d = hash(i, j + 1, k + 1, s) * (1 - u) + hash(i + 1, j + 1, k + 1, s) * u;
  return (a * (1 - v) + b * v) * (1 - w) + (c * (1 - v) + d * v) * w;
}
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The planet, torn open.
//
// Rock breaks into pieces, and a piece is either still there or gone. So the planet is divided into great pieces,
// each the part of space nearest one point, and each is kept whole or taken whole: every face of what is left is a
// face where two pieces parted, flat and large, and every edge is sharp. A plain description of what survives
// (whole) only chooses which pieces stay.

// What is taken out of the planet's front, as picture 9 has it.
const TEAR = {
  // The hollow: how far back it goes, where its mouth is, how far it reaches each side of the center line at its
  // back and at its mouth, and how far its middle is off the center line.
  back: -236, mouth: 560, wide: [236, 372] as const, lean: 14,
  // It narrows as it goes down, by this share at the planet's foot: the planet's sides are whole.
  narrow: 0.3,
  // Its roof, which is the land's own front edge left overhanging: how thick at its lip, and how much more at the
  // hollow's back.
  roof: [62, 46] as const,
  // The ledge under the core, at the hollow's back: its top, its foot, and how far forward it comes.
  ledge: { top: -488, foot: -568, front: 40 },
  // Under the ledge the planet's bottom is gone.
  pit: { half: 246, back: -470 },
  // The hanging mass at the visitor's right is the shorter one: snapped off.
  snap: { from: 330, under: -600 },
  // Where the land ends, measured out from the middle. It is whole all the way round, and bitten back at the
  // front, over the hollow.
  rim: 652, bite: 118, biteAt: -0.12, biteWide: 0.4, nick: 12,
} as const;
// How much a place round the rim is part of the broken front: 1 over the hollow, 0 where the rim is whole. The
// desert is whole: nothing is bitten out of it and no crack crosses it.
export function frontal(x: number, z: number): number {
  const th = Math.atan2(x, z);
  return ramp(0.03, 0.4, Math.exp(-(((th - TEAR.biteAt) / (1.15 * TEAR.biteWide)) ** 2))) * (1 - ramp(-0.2, 0.05, sands(x, z)));
}
// How far inside the land's edge a place is.
function within(x: number, z: number): number {
  const th = Math.atan2(x, z);
  const front = TEAR.bite * Math.exp(-(((th - TEAR.biteAt) / TEAR.biteWide) ** 2)) * (0.55 + 0.9 * noise(3.1 * Math.sin(th) + 5, 3.1 * Math.cos(th) + 5, 0, 37));
  const nick = Math.max(0, TEAR.nick * 2 * (noise(7 * Math.sin(th) + 9, 7 * Math.cos(th) + 9, 0, 39) - 0.5));
  return TEAR.rim - (front + nick) * frontal(x, z) - Math.hypot(x, z);
}
// How far each side of its middle the hollow reaches at a place, and where its ceiling is.
function reach(x: number, y: number, z: number): number {
  const open = TEAR.wide[0] + (TEAR.wide[1] - TEAR.wide[0]) * Math.min(1.2, Math.max(0, (z - TEAR.back) / (TEAR.mouth - TEAR.back)));
  return open * (1 - TEAR.narrow * ramp(-150, -600, y)) + 30 * (noise(y / 140 + 3, z / 140, x > TEAR.lean ? 7 : 1, 31) - 0.5);
}
const ceiling = (x: number, z: number): number => dome(x, z) - TEAR.roof[0] - TEAR.roof[1] * ramp(440, -80, z) - 26 * (noise(x / 130 + 4, 2, z / 130, 33) - 0.5);
// The roof's own underside, as a surface: over 0 in the roof. Its great pieces would leave the lip a row of lumps.
function under(x: number, y: number, z: number): number {
  if (y > -40 || y < -260) return 48;
  const ax = Math.abs(x - TEAR.lean), inside = Math.min(reach(x, y, z) - 34 - ax, z - TEAR.back - 40);
  return inside < 0 ? 48 : Math.max(y - ceiling(x, z) + 9 * (noise(x / 30, y / 30, z / 30, 77) - 0.5), 14 - inside);
}
// How much of the planet survives at a place: over 0 where it does.
function whole(x: number, y: number, z: number): number {
  const ax = Math.abs(x - TEAR.lean), hw = reach(x, y, z), ceil = ceiling(x, z);
  const back = TEAR.back + 60 * (x / 280) ** 2;
  const cave = Math.max(ax - hw, y - ceil, back - z, Math.min(TEAR.ledge.top - y, TEAR.ledge.front - z));
  const pit = Math.max(ax - TEAR.pit.half - 0.1 * (z - TEAR.pit.back), y - TEAR.ledge.foot, TEAR.pit.back - z);
  const snap = Math.max(TEAR.snap.from - x, y - TEAR.snap.under - 44 * (noise(x / 90, 5, z / 90, 35) - 0.5), -120 - z);
  let t = Math.min(cave, pit, snap, Math.hypot(x - CORE.at[0], y - CORE.at[1], z - CORE.at[2]) - CORE.r - 34);
  // Round the rest of the rim the planet ends at its own outer surface, which is whole.
  if (y > -230 && frontal(x, z) > 0) t = Math.min(t, within(x, z));
  return t;
}

interface Lattice { sx: number; sy: number; sz: number; ox: number; oy: number; oz: number; nx: number; ny: number; nz: number; p: Float32Array; h: Float32Array }
const REACH = { across: 780, up: 110, down: 880 } as const;
function lattice(sx: number, sy: number, sz: number, seed: number): Lattice {
  const ox = Math.floor(-REACH.across / sx) - 1, oy = Math.floor(-REACH.down / sy) - 1, oz = Math.floor(-REACH.across / sz) - 1;
  const nx = Math.ceil(REACH.across / sx) + 2 - ox, ny = Math.ceil(REACH.up / sy) + 2 - oy, nz = Math.ceil(REACH.across / sz) + 2 - oz;
  const p = new Float32Array(nx * ny * nz * 3), h = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = i + nx * (j + ny * k), ci = i + ox, cj = j + oy, ck = k + oz;
    p[a * 3] = (ci + 0.18 + 0.64 * hash(ci, cj, ck, seed)) * sx;
    p[a * 3 + 1] = (cj + 0.18 + 0.64 * hash(ci, cj, ck, seed + 1)) * sy;
    p[a * 3 + 2] = (ck + 0.18 + 0.64 * hash(ci, cj, ck, seed + 2)) * sz;
    h[a] = hash(ci, cj, ck, seed + 3);
  }
  return { sx, sy, sz, ox, oy, oz, nx, ny, nz, p, h };
}
// The two nearest points of a lattice that are of a kind, and the two nearest that are not.
let IN = -1, IN2 = -1, OUT = -1, OUT2 = -1, DIN = 0, DIN2 = 0, DOUT = 0, DOUT2 = 0;
function scan(L: Lattice, is: Uint8Array, x: number, y: number, z: number): void {
  const ay = L.sx / L.sy, az = L.sx / L.sz, p = L.p;
  const i0 = Math.min(L.nx - 2, Math.max(1, Math.floor(x / L.sx) - L.ox)), j0 = Math.min(L.ny - 2, Math.max(1, Math.floor(y / L.sy) - L.oy)), k0 = Math.min(L.nz - 2, Math.max(1, Math.floor(z / L.sz) - L.oz));
  IN = IN2 = OUT = OUT2 = -1;
  DIN = DIN2 = DOUT = DOUT2 = 1e18;
  for (let k = k0 - 1; k <= k0 + 1; k++) for (let j = j0 - 1; j <= j0 + 1; j++) {
    let a = i0 - 1 + L.nx * (j + L.ny * k);
    for (let i = 0; i < 3; i++, a++) {
      const dx = x - p[a * 3], dy = (y - p[a * 3 + 1]) * ay, dz = (z - p[a * 3 + 2]) * az, d = dx * dx + dy * dy + dz * dz;
      if (is[a]) {
        if (d < DIN) { DIN2 = DIN; IN2 = IN; DIN = d; IN = a; } else if (d < DIN2) { DIN2 = d; IN2 = a; }
      } else if (d < DOUT) { DOUT2 = DOUT; OUT2 = OUT; DOUT = d; OUT = a; } else if (d < DOUT2) { DOUT2 = d; OUT2 = a; }
    }
  }
}
const apart = (L: Lattice, a: number, b: number): number => Math.hypot(L.p[a * 3] - L.p[b * 3], (L.p[a * 3 + 1] - L.p[b * 3 + 1]) * (L.sx / L.sy), (L.p[a * 3 + 2] - L.p[b * 3 + 2]) * (L.sx / L.sz));

// The great pieces, and for each: whether it is still there, how far it has opened from its neighbours (0 deep in
// the planet, 1 at the tear), and how far it has shifted.
// A piece opens and shifts only where it is next to the break. Under the land it does so only at the land's edge:
// the city's ground is whole, and cracked where it ends.
const SLAB = { size: [112, 82, 112] as const, loose: 30, gap: 10, shift: 11, far: [6, 44] as const, top: -86, edge: [14, 104] as const } as const;
// Smaller pieces along the break: some knocked out of a slab's face, some still clinging to it.
const CHIP = { size: [56, 44, 56] as const, out: [-24, -2, 0.26] as const, on: [2, 22, 0.2] as const } as const;
// Long pieces left hanging from the torn undersides, each tapering to a blunt end.
const HANG = { size: [70, 190, 70] as const, share: 0.3, clear: 190, blunt: 4, taper: 22, least: 15 } as const;
let BIG: Lattice | null = null, KEPT: Uint8Array, OPEN: Float32Array, MOVE: Float32Array, SOLID: Uint8Array;
let SMALL: Lattice, CUT: Uint8Array, CLING: Uint8Array, LONG: Lattice, HUNG: Uint8Array, NEARHUNG: Uint8Array;
// The slabs alone: under 0 inside one that is still there. It leaves which slab it found in IN.
function slabs(x: number, y: number, z: number): number {
  const L = BIG as Lattice;
  scan(L, KEPT, x, y, z);
  if (IN < 0) return 48;
  let f = OUT < 0 ? -48 : (DIN - DOUT) / (2 * apart(L, IN, OUT));
  if (IN2 >= 0) {
    let gap = SLAB.gap * Math.max(OPEN[IN], OPEN[IN2]);
    // No crack comes up through the city's ground, but at the land's edge.
    if (gap > 0.4 && y > SLAB.top - 40) gap *= Math.max(ramp(-18, -90, y - dome(x, z)), frontal(x, z) * (1 - ramp(SLAB.edge[0], SLAB.edge[1], within(x, z))));
    // A crack opens and closes along its length.
    if (gap > 0.4) f = Math.max(f, gap * (0.3 + 1.4 * noise(x / 70, y / 70, z / 70, 67)) - (DIN2 - DIN) / (2 * apart(L, IN, IN2)));
  }
  return f;
}
function broken(): void {
  const L = BIG = lattice(SLAB.size[0], SLAB.size[1], SLAB.size[2], 101), n = L.h.length;
  KEPT = new Uint8Array(n); OPEN = new Float32Array(n); MOVE = new Float32Array(n * 3); SOLID = new Uint8Array(n);
  for (let a = 0; a < n; a++) {
    const t = whole(L.p[a * 3], L.p[a * 3 + 1], L.p[a * 3 + 2]) + SLAB.loose * (L.h[a] - 0.5);
    if (t <= 0) continue;
    KEPT[a] = 1;
    OPEN[a] = L.p[a * 3 + 1] > SLAB.top ? frontal(L.p[a * 3], L.p[a * 3 + 2]) * (1 - ramp(SLAB.edge[0], SLAB.edge[1], within(L.p[a * 3], L.p[a * 3 + 2]))) : 1 - ramp(SLAB.far[0], SLAB.far[1], t);
    for (let q = 0; q < 3; q++) MOVE[a * 3 + q] = (hash(a, q, 7, 131) - 0.5) * 2 * SLAB.shift * OPEN[a];
  }
  for (let k = 1; k < L.nz - 1; k++) for (let j = 1; j < L.ny - 1; j++) for (let i = 1; i < L.nx - 1; i++) {
    let all = 1;
    for (let c = 0; c < 27 && all; c++) { const b = i + (c % 3) - 1 + L.nx * (j + (Math.floor(c / 3) % 3) - 1 + L.ny * (k + Math.floor(c / 9) - 1)); if (!KEPT[b] || OPEN[b] > 0) all = 0; }
    SOLID[i + L.nx * (j + L.ny * k)] = all;
  }
  const S = SMALL = lattice(CHIP.size[0], CHIP.size[1], CHIP.size[2], 211), m = S.h.length;
  CUT = new Uint8Array(m); CLING = new Uint8Array(m);
  for (let a = 0; a < m; a++) {
    const f = slabs(S.p[a * 3], S.p[a * 3 + 1], S.p[a * 3 + 2]);
    if (S.p[a * 3 + 1] > dome(S.p[a * 3], S.p[a * 3 + 2]) - 50 && within(S.p[a * 3], S.p[a * 3 + 2]) > 70) continue;
    if (f > CHIP.out[0] && f < CHIP.out[1] && S.h[a] < CHIP.out[2]) CUT[a] = 1;
    else if (f > CHIP.on[0] && f < CHIP.on[1] && S.h[a] > 1 - CHIP.on[2]) CLING[a] = 1;
  }
  const H = LONG = lattice(HANG.size[0], HANG.size[1], HANG.size[2], 307), w = H.h.length;
  HUNG = new Uint8Array(w); NEARHUNG = new Uint8Array(w);
  for (let a = 0; a < w; a++) {
    const x = H.p[a * 3], y = H.p[a * 3 + 1], z = H.p[a * 3 + 2];
    if (H.h[a] > HANG.share || slabs(x, y + 0.42 * HANG.size[1], z) >= -4 || slabs(x, y - 0.2 * HANG.size[1], z) <= 4) continue;
    // None hangs into the core, or between the core and the visitor.
    if (Math.hypot(x - CORE.at[0], z - CORE.at[2]) < HANG.clear && y - 0.5 * HANG.size[1] < CORE.at[1] + CORE.r + 50) continue;
    if (z > CORE.at[2] && Math.abs(x - CORE.at[0]) < CORE.r + 60) continue;
    HUNG[a] = 1;
  }
  for (let k = 1; k < H.nz - 1; k++) for (let j = 1; j < H.ny - 1; j++) for (let i = 1; i < H.nx - 1; i++) {
    let any = 0;
    for (let c = 0; c < 27 && !any; c++) any = HUNG[i + (c % 3) - 1 + H.nx * (j + (Math.floor(c / 3) % 3) - 1 + H.ny * (k + Math.floor(c / 9) - 1))];
    NEARHUNG[i + H.nx * (j + H.ny * k)] = any;
  }
}
const cell = (L: Lattice, x: number, y: number, z: number): number =>
  Math.min(L.nx - 2, Math.max(1, Math.floor(x / L.sx) - L.ox)) + L.nx * (Math.min(L.ny - 2, Math.max(1, Math.floor(y / L.sy) - L.oy)) + L.ny * Math.min(L.nz - 2, Math.max(1, Math.floor(z / L.sz) - L.oz)));

// The craters on the planet's outer surface, at the visitor's right, where the moon rakes across it: a bowl with
// a flat floor and a raised rim. The largest are placed (how far round in degrees, how far down, how large), one
// of them where the tear cuts through it, which shows they are older than the break. The rest are scattered.
export interface Crater { at: readonly [number, number, number]; r: number; deep: number }
const BOWLS: readonly (readonly [number, number, number])[] = [
  [62, 0.33, 58], [50, 0.66, 50], [78, 0.5, 34], [42, 0.36, 40], [70, 0.14, 22], [88, 0.28, 26], [58, 0.5, 17], [66, 0.82, 24], [84, 0.7, 20], [52, 0.2, 14], [96, 0.46, 18],
];
let PITS: Crater[] | null = null;
export function craters(): Crater[] {
  if (PITS) return PITS;
  const r = seeded(2207), out: Crater[] = BOWLS.map(([th, t, R]) => ({ at: skinAt(th * D2R, t), r: R, deep: 0.34 * R }));
  for (let tries = 0; out.length < BOWLS.length + 12 && tries < 500; tries++) {
    const at = skinAt((38 + 72 * r()) * D2R, 0.08 + 0.84 * r()), R = 10 + 8 * r();
    if (out.every((c) => Math.hypot(c.at[0] - at[0], c.at[1] - at[1], c.at[2] - at[2]) > (c.r + R) * 1.25)) out.push({ at, r: R, deep: 0.36 * R });
  }
  return PITS = out;
}
// How far the outer surface is moved by them at a place: under 0 into the planet, over 0 at a rim.
function pitted(x: number, y: number, z: number): number {
  let p = 0;
  for (const c of craters()) {
    const d = Math.hypot(x - c.at[0], y - c.at[1], z - c.at[2]) / c.r;
    if (d < 1.5) p += -c.deep * (1 - ramp(0.5, 1, d)) + 0.2 * c.deep * Math.exp(-(((d - 1.04) / 0.13) ** 2));
  }
  return p;
}

// The planet's body under its land: under 0 inside the rock.
const WARP = 9, FINE = 3;
export function rock(x: number, y: number, z: number): number {
  if (!BIG) broken();
  // Its top lies just under the land, dunes and all, so the land's sheet never stands clear of it.
  const bare = dome(x, z), k = shell(x, y, z), out = (k - 1) * WORLD.deep;
  if (out > 48 || y - bare > 104) return 48;
  const top = y - (bare - 3 + (y > bare - 14 ? land(x, z) : 0));
  if (top > 48) return 48;
  const skin = (noise(x / 170, y / 170, z / 170, 3) - 0.5) * 16 - (x > 60 && out > -70 && y < -RIM + 30 ? pitted(x, y, z) : 0);
  // The core touches nothing.
  const clear = CORE.r + 16 - Math.hypot(x - CORE.at[0], y - CORE.at[1], z - CORE.at[2]);
  if (SOLID[cell(BIG as Lattice, x, y, z)]) return Math.max(-48, out + skin, top, clear);
  // The pieces' faces are not dead flat.
  const fine = FINE * 2 * (noise(x / 46, y / 46, z / 46, 59) - 0.5);
  const wx = x + WARP * 2 * (noise(x / 210, y / 210, z / 210, 41) - 0.5) + fine, wy = y + WARP * 2 * (noise(x / 210 + 9, y / 210, z / 210, 47) - 0.5) - fine, wz = z + WARP * 2 * (noise(x / 210, y / 210 + 9, z / 210, 53) - 0.5) + fine;
  let f = slabs(wx, wy, wz);
  const mine = IN;
  if (f > -64 && f < 64) {
    scan(SMALL, CUT, wx, wy, wz);
    if (IN >= 0) f = Math.max(f, OUT < 0 ? 48 : (DOUT - DIN) / (2 * apart(SMALL, IN, OUT)));
    scan(SMALL, CLING, wx, wy, wz);
    if (IN >= 0) f = Math.min(f, OUT < 0 ? -48 : (DIN - DOUT) / (2 * apart(SMALL, IN, OUT)));
  }
  if (f > -40 && NEARHUNG[cell(LONG, wx, wy, wz)]) {
    scan(LONG, HUNG, wx, wy, wz);
    if (IN >= 0 && DIN < DOUT) {
      const edge = Math.min(OUT < 0 ? 99 : (DOUT - DIN) / (2 * apart(LONG, IN, OUT)), IN2 < 0 ? 99 : (DIN2 - DIN) / (2 * apart(LONG, IN, IN2)));
      const u = Math.min(1, Math.max(0, 0.5 - (wy - LONG.p[IN * 3 + 1]) / HANG.size[1]));
      // It narrows as it hangs and ends broken off, never in a point thinner than the surface can be made.
      f = Math.min(f, Math.min(HANG.least, HANG.blunt + HANG.taper * (0.7 + 0.9 * LONG.h[IN] / HANG.share) * u ** 1.4) - edge);
    }
  }
  // The land's broken front edge follows the line it broke along, and not the outline of whichever great piece is
  // under it.
  if (y > -230) { const fr = frontal(x, z); if (fr > 0) f = Math.max(f, 12 * (noise(x / 34, y / 34, z / 34, 73) - 0.5) - within(x, z) - 60 * (1 - fr)); }
  f = Math.max(f, -under(x, y, z));
  // A piece that has opened has also shifted, so the skin it carries no longer lines up with its neighbour's. The
  // top does not move: the land lies on it.
  let b = out + skin;
  if (mine >= 0 && OPEN[mine] > 0) b = (shell(x - MOVE[mine * 3], y - MOVE[mine * 3 + 1], z - MOVE[mine * 3 + 2]) - 1) * WORLD.deep + skin;
  return Math.max(-48, Math.min(48, Math.max(f, b, top, clear)));
}

// ---------------------------------------------------------------------------------------------------------------
// The land.

// The desert: how much of it a place on the map is, 0 to 1. At the front right, as picture 4 has it: from beside
// the avenue's trees round to the planet's right side, with the towers behind it. Where it lies and how far it
// reaches across and toward the visitor.
export const DESERT = { at: [440, 350] as const, r: [360, 300] as const } as const;
function sands(x: number, z: number): number {
  return 1 - Math.hypot((x - DESERT.at[0]) / DESERT.r[0], (z - DESERT.at[1]) / DESERT.r[1]) + 0.12 * (noise(x / 110, 0, z / 110, 7) - 0.5);
}
export const desert = (x: number, z: number): number => ramp(0, 0.08, sands(x, z));
// The dunes: crescents, each standing apart with smooth sand between. A dune has a round back to the wind, a sharp
// crest, and a steep hollow face away from the wind, with its horns reaching on downwind. The wind blows from the
// moon's side toward the visitor's left, so every hollow faces the visitor and lies in the moon's shadow: that
// shadow is what makes a dune. He found the last round's low, run together and flat on one side. Where each is,
// how far it reaches across the wind, how long its back is, and how tall it is.
const WIND = [-0.8, 0.6] as const, SLIP = 0.66, DIP = 0.42;
const DUNES: readonly (readonly [number, number, number, number, number, number])[] = [
  [318, 300, 100, 120, 36, 8], [452, 452, 104, 124, 36, -10], [486, 240, 92, 112, 32, -4], [352, 148, 76, 96, 25, 14], [590, 356, 78, 100, 28, 6], [560, 150, 66, 84, 21, -12], [250, 450, 70, 84, 21, 10],
];
export function dunes(x: number, z: number): number {
  let up = 0, down = 0;
  for (const [cx, cz, wid, len, tall, turn] of DUNES) {
    // No two lie quite the same way to the wind.
    const ca = Math.cos(turn * D2R), sa = Math.sin(turn * D2R), wx = WIND[0] * ca - WIND[1] * sa, wz = WIND[0] * sa + WIND[1] * ca;
    const rx = x - cx, rz = z - cz, u = rx * wx + rz * wz, v = -rx * wz + rz * wx, side = v / wid;
    if (Math.abs(side) >= 1) continue;
    const env = (1 - side * side) ** 0.9, s = u - 0.62 * wid * side * side, top = tall * env;
    if (s <= 0) { const t = -s / (len * (0.45 + 0.55 * env)); if (t < 1) up = Math.max(up, top * (1 - t * t) ** 2); continue; }
    // Its hollow face falls at the angle sand rests at, into a hollow lower than the sand round it, which rises
    // again downwind: a dune is a wide low back and a deep scoop, not a mound.
    const foot = (top * (1 + DIP)) / SLIP;
    if (s < foot) { const h = top - SLIP * s; if (h > 0) up = Math.max(up, h); else down = Math.min(down, h); }
    else { const t = (s - foot) / (0.9 * wid * env + 1); if (t < 1) down = Math.min(down, -DIP * top * (1 - t) ** 2); }
  }
  return up + down + 5 * noise(x / 130, 1, z / 130, 9) - 2;
}
export const land = (x: number, z: number): number => desert(x, z) * dunes(x, z);
export const ground = (x: number, z: number): number => dome(x, z) + land(x, z);
// The near half of the top that is not sand is park: grass under rows of trees. The far half is the city's paving.
export const park = (x: number, z: number): number => ramp(46, 96, z + 34 * (noise(x / 90, 2, z / 90, 71) - 0.5)) * (1 - desert(x, z));

// Where the land ends: land stands only where there is rock under it. Measured once, on a grid, and read between
// its points. edge is over 0 on the land and under 0 off it, and crosses 0 where the land ends, which is what the
// land's sheet is cut by. inland is how far inside that edge a place is.
const SURVEY = { step: 4, half: 668 } as const, ACROSS = Math.round((2 * SURVEY.half) / SURVEY.step) + 1;
let MEASURED: { raw: Float32Array; far: Float32Array } | null = null;
function survey(): { raw: Float32Array; far: Float32Array } {
  const raw = new Float32Array(ACROSS * ACROSS), far = new Float32Array(ACROSS * ACROSS), s = SURVEY.step, d = s * Math.SQRT2;
  for (let j = 0; j < ACROSS; j++) for (let i = 0; i < ACROSS; i++) {
    const x = -SURVEY.half + i * s, z = -SURVEY.half + j * s, a = i + ACROSS * j;
    raw[a] = Math.min(652 - Math.hypot(x, z), -rock(x, ground(x, z) - 7, z));
    far[a] = raw[a] > 0 ? 1e6 : 0;
  }
  const at = (i: number, j: number): number => (i < 0 || j < 0 || i >= ACROSS || j >= ACROSS ? 0 : far[i + ACROSS * j]);
  for (let j = 0; j < ACROSS; j++) for (let i = 0; i < ACROSS; i++) { const a = i + ACROSS * j; far[a] = Math.min(far[a], at(i - 1, j) + s, at(i, j - 1) + s, at(i - 1, j - 1) + d, at(i + 1, j - 1) + d); }
  for (let j = ACROSS - 1; j >= 0; j--) for (let i = ACROSS - 1; i >= 0; i--) { const a = i + ACROSS * j; far[a] = Math.min(far[a], at(i + 1, j) + s, at(i, j + 1) + s, at(i + 1, j + 1) + d, at(i - 1, j + 1) + d); }
  return { raw, far };
}
function read(g: Float32Array, x: number, z: number): number {
  const fx = Math.min(ACROSS - 1.001, Math.max(0, (x + SURVEY.half) / SURVEY.step)), fz = Math.min(ACROSS - 1.001, Math.max(0, (z + SURVEY.half) / SURVEY.step));
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, a = i + ACROSS * j;
  return (g[a] * (1 - u) + g[a + 1] * u) * (1 - v) + (g[a + ACROSS] * (1 - u) + g[a + ACROSS + 1] * u) * v;
}
export const edge = (x: number, z: number): number => read((MEASURED ??= survey()).raw, x, z);
export const inland = (x: number, z: number): number => read((MEASURED ??= survey()).far, x, z);
// Whether a place is on the land and at least so far from its edge, for standing something there.
export const standing = (x: number, z: number, pad = 0): boolean => inland(x, z) > pad;

// ---------------------------------------------------------------------------------------------------------------
// The city.
//
// Picture 4's: about forty large towers standing apart, in a band behind and beside the spire, falling away to
// each end, with three behind the dunes so the skyline runs from one end of the land to the other. He called its
// number and spacing of buildings "pretty much perfect". Each is placed by hand: where it stands, how wide and
// deep it is, how tall, what form it is, what its roof is made of, and how far it is turned, in degrees. Six have
// roofs of polished gold, as many as picture 9 has, and others carry bronze.
export type Form = 'deco' | 'slab' | 'point' | 'step' | 'disc' | 'twin' | 'fin';
export type Roof = 'gold' | 'bronze' | 'plain';
export interface Building { x: number; z: number; w: number; d: number; tall: number; turn: number; form: Form; roof: Roof; seed: number }
const STAND: readonly (readonly [number, number, number, number, number, Form, Roof, number])[] = [
  [-135, -62, 52, 46, 204, 'deco', 'bronze', 4], [116, -44, 48, 44, 216, 'step', 'gold', -3], [216, -92, 44, 40, 168, 'disc', 'gold', 6], [-212, -124, 34, 34, 152, 'slab', 'plain', -8],
  [60, -152, 34, 32, 142, 'slab', 'bronze', 10], [-92, -172, 30, 30, 122, 'slab', 'plain', -4], [166, -176, 44, 40, 126, 'twin', 'plain', 0], [274, -28, 44, 42, 150, 'point', 'gold', -6],
  [-336, -108, 42, 40, 180, 'point', 'gold', 8], [-298, -204, 34, 34, 116, 'slab', 'plain', 12], [-166, -236, 32, 30, 112, 'deco', 'plain', -10], [-108, 42, 38, 34, 90, 'slab', 'bronze', 0],
  [152, 52, 48, 42, 94, 'deco', 'plain', 5], [210, 100, 38, 36, 74, 'slab', 'plain', -7], [-446, -92, 40, 38, 148, 'deco', 'bronze', -5], [-492, -172, 38, 36, 110, 'slab', 'plain', 9],
  [-474, 14, 44, 40, 84, 'fin', 'bronze', 3], [-392, 22, 58, 44, 72, 'slab', 'plain', -2], [-548, -58, 40, 38, 64, 'slab', 'plain', 14], [-592, 44, 38, 36, 50, 'slab', 'plain', -9],
  [-560, -202, 36, 36, 68, 'slab', 'bronze', 6], [-402, -262, 38, 36, 96, 'deco', 'plain', -12], [-252, -334, 36, 34, 104, 'slab', 'plain', 5], [-118, -384, 36, 34, 112, 'point', 'bronze', -6],
  [306, 62, 40, 38, 68, 'slab', 'plain', 8], [340, -122, 36, 36, 104, 'fin', 'bronze', -4], [366, -204, 32, 32, 120, 'slab', 'plain', 10], [404, -40, 42, 40, 80, 'point', 'gold', 2],
  [458, -132, 38, 36, 92, 'slab', 'plain', -10], [62, -334, 36, 34, 118, 'deco', 'plain', 7], [232, -304, 38, 36, 108, 'slab', 'bronze', -5], [442, -282, 36, 34, 84, 'slab', 'plain', 12],
  [524, -192, 36, 34, 74, 'deco', 'plain', -8], [508, -58, 40, 38, 98, 'slab', 'bronze', 4], [566, -122, 34, 34, 122, 'point', 'gold', -6], [598, -14, 34, 32, 78, 'slab', 'plain', 9],
  [-250, -58, 38, 36, 96, 'fin', 'bronze', -3], [10, -252, 40, 38, 130, 'twin', 'plain', 0], [-20, -436, 36, 34, 94, 'slab', 'plain', 6], [332, -384, 34, 34, 80, 'slab', 'plain', -9],
  [-472, -332, 36, 34, 72, 'slab', 'plain', 11], [142, -424, 36, 34, 90, 'deco', 'bronze', -4], [-332, -424, 34, 34, 82, 'slab', 'plain', 3],
];
const BROAD = 1, RISE = 1.1;
export const TOWERS: readonly Building[] = STAND.map(([x, z, w, d, tall, form, roof, turn], i) => ({ x, z, w: w * BROAD, d: d * BROAD, tall: tall * RISE, turn: turn * D2R, form, roof, seed: hash(i, 3, 7, 911) }));

// The trees: picture 4's, one kind. A full round crown on a short trunk, in rows and stands: two rows down each
// side of the avenue, a row round the pyramid's court, arcs along the road at the visitor's left, stands in the
// park, a band where the city meets the sand, and single trees along the streets among the towers. size is about
// half its crown's width.
export interface Tree { x: number; z: number; size: number; tone: number; turn: number }
const nearTower = (x: number, z: number, pad: number): boolean => TOWERS.some((b) => Math.hypot(x - b.x, z - b.z) < Math.max(b.w, b.d) * 0.62 + pad);
const onRoad = (x: number, z: number): boolean => { const th = Math.atan2(x, z) / D2R; return th > ROAD.from - 2 && th < ROAD.to + 2 && Math.abs(Math.hypot(x, z) - ROAD.r) < ROAD.half + 7; };
let TREES: Tree[] | null = null;
export function trees(): Tree[] {
  if (TREES) return TREES;
  const r = seeded(7741), out: Tree[] = [];
  const plant = (x: number, z: number, size: number): void => {
    const tone = r(), turn = r() * Math.PI * 2;
    if (!standing(x, z, 12) || desert(x, z) > 0.02 || Math.hypot(x, z) < COURT + 6 || onRoad(x, z) || nearTower(x, z, size * 0.7 + 3)) return;
    if (z > AVENUE.from - 10 && Math.abs(x) < AVENUE.half + 5) return;
    const [qx, qz] = pyramidal(x, z);
    if (Math.abs(qx) < PYRAMID.base / 2 + 14 && Math.abs(qz) < PYRAMID.base / 2 + 14) return;
    if (out.some((t) => Math.hypot(t.x - x, t.z - z) < (t.size + size) * 0.74)) return;
    out.push({ x, z, size, tone, turn });
  };
  for (let z = COURT + 34; z < 650; z += 25) for (const x of [-(AVENUE.half + 13), AVENUE.half + 13, -(AVENUE.half + 38), AVENUE.half + 38]) plant(x + 2 * (r() - 0.5), z + 3 * (r() - 0.5), 10.5 + 1.5 * r());
  const c = PYRAMID.court + 14;
  const pc = Math.cos(PYRAMID.turn * D2R), pk = Math.sin(PYRAMID.turn * D2R);
  for (let t = -c; t <= c; t += 26) for (const [px, pz] of [[t, -c], [t, c], [-c, t], [c, t]]) plant(PYRAMID.x + px * pc + pz * pk, PYRAMID.z - px * pk + pz * pc, 9.5 + r());
  for (const rad of [462, 494, 526, 558]) for (let a = -104 * D2R; a < -6 * D2R; a += 27 / rad) plant(rad * Math.sin(a) + 3 * (r() - 0.5), rad * Math.cos(a) + 3 * (r() - 0.5), 10.5 + 2 * r());
  for (let z = 80; z < 640; z += 27) for (let x = -640; x < 640; x += 27) {
    const jx = x + 12 * (r() - 0.5), jz = z + 12 * (r() - 0.5), pick = r(), size = 10 + 2.6 * r();
    if (park(jx, jz) > 0.6 && (noise(jx / 85, 6, jz / 85, 61) > 0.36 || pick < 0.25)) plant(jx, jz, size);
  }
  for (let z = -60; z < 420; z += 22) for (let x = 60; x < 640; x += 22) {
    const jx = x + 8 * (r() - 0.5), jz = z + 8 * (r() - 0.5), pick = r(), size = 9.5 + 2 * r(), s = sands(jx, jz);
    if (s > -0.2 && s < -0.03 && pick < 0.7) plant(jx, jz, size);
  }
  for (const rad of STREETS.rings) for (let a = 0; a < Math.PI * 2; a += 34 / rad) {
    const out2 = rad + (r() < 0.5 ? -10 : 10), pick = r(), size = 7.5 + 2 * r();
    if (out2 * Math.cos(a) < 70 && pick < 0.62) plant(out2 * Math.sin(a), out2 * Math.cos(a), size);
  }
  return TREES = out;
}

// ---------------------------------------------------------------------------------------------------------------
// What broke away. Made new for this world, and not picture 6's ring: a great deal of it, low, under and round the
// bottom of the planet, hanging there as if caught in the planet's gravity. It is one scene: the pieces of a
// family share one motion, with differences inside it. None of it moves in the prototype. How each family moves
// is here so the build knows.
//   plate: a great piece, some still carrying a piece of the land. It holds its place under the edge it broke
//     from, rises and falls slowly, and keeps one face to the core.
//   whirl: two arms of middling pieces that go slowly round the stream, sinking as they go, each turning over.
//   drift: a wide low cloud of small pieces that slides from side to side as one.
//   tumble: chips falling away along the stream.
export type Drift = 'plate' | 'whirl' | 'drift' | 'tumble';
export interface Piece { at: [number, number, number]; r: number; kind: Drift; long: number; flat: number; family: number; land?: 'city' | 'sand' }
const PLATES: readonly Piece[] = [
  { at: [-405, -752, 330], r: 92, kind: 'plate', long: 1, flat: 1, family: 0, land: 'city' }, { at: [455, -790, 300], r: 78, kind: 'plate', long: 1.2, flat: 0.6, family: 1 },
  { at: [-215, -905, 420], r: 60, kind: 'plate', long: 1, flat: 1, family: 2, land: 'city' }, { at: [-560, -700, 60], r: 70, kind: 'plate', long: 1.5, flat: 0.55, family: 3 },
  { at: [590, -730, 20], r: 62, kind: 'plate', long: 1.4, flat: 0.5, family: 4 }, { at: [250, -930, 390], r: 66, kind: 'plate', long: 1.3, flat: 0.6, family: 5 },
  { at: [-90, -1010, -160], r: 74, kind: 'plate', long: 1.4, flat: 0.6, family: 6 }, { at: [330, -1060, 120], r: 52, kind: 'plate', long: 1.5, flat: 0.5, family: 7 },
  { at: [-380, -1100, 200], r: 48, kind: 'plate', long: 1.3, flat: 0.6, family: 8 },
];
// How far down the host the first screen ends on the tallest desktop screen: nothing that broke away is over it.
const REST = 590;
let PIECES: Piece[] | null = null;
export function debris(): Piece[] {
  if (PIECES) return PIECES;
  const r = seeded(4409), out: Piece[] = [], core = drawn(CORE.at[0], CORE.at[1], CORE.at[2]);
  const bell = (): number => (r() + r() + r() - 1.5) / 1.5;
  const fits = (p: Piece): boolean => {
    const [sx, sy] = drawn(p.at[0], p.at[1], p.at[2]);
    if (Math.abs(sx) + p.r > HOST.wide / 2 - 6 || sy + p.r > HOST.tall - 10) return false;
    // Nothing of it shows at rest, nothing hides the core, a large piece does not lie across the stream, and
    // nothing is inside the rock.
    if (sy - p.r < REST) return false;
    if (p.at[2] > CORE.at[2] && Math.hypot(sx - core[0], sy - core[1]) < CORE.r + p.r * p.long + 34) return false;
    if (p.r > 9 && Math.abs(sx - core[0]) < p.r * 0.9 + 7) return false;
    const reach = p.r * p.long * 0.8;
    if (rock(p.at[0], p.at[1], p.at[2]) < Math.min(46, reach + 8)) return false;
    for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) if (rock(p.at[0] + a * reach, p.at[1] + b * reach, p.at[2] + c * reach) < 8) return false;
    return out.every((o) => Math.hypot(o.at[0] - p.at[0], o.at[1] - p.at[1], o.at[2] - p.at[2]) > (o.r + p.r) * 1.08);
  };
  const put = (p: Piece): void => { if (fits(p)) out.push(p); };
  for (const p of PLATES) put(p);
  const plates = out.length;
  // Each great piece keeps a ring of small ones about it, which go where it goes.
  for (let i = 0; i < plates; i++) {
    const g = out[i], tilt = 0.5 * bell(), lean = 0.5 * bell();
    for (let k = 0; k < 16; k++) {
      const a = r() * Math.PI * 2, far = g.r * (1.2 + 1.3 * r() ** 1.6), across = far * Math.cos(a), along = far * Math.sin(a), size = (1.4 + 7 * r() ** 3) * (0.6 + g.r / 90);
      put({ at: [g.at[0] + across, g.at[1] + across * tilt + along * lean + 0.1 * far * bell(), g.at[2] + along], r: size, kind: 'drift', long: 1.2 + r(), flat: r(), family: 20 + g.family });
    }
  }
  // Three arms round the stream, close under the break, sinking and thinning as they go out: the largest pieces
  // nearest the planet they came from.
  for (const [arm, from] of [[1, 0.5], [2, 2.6], [3, 4.7]] as const) for (let i = 0; i < 70; i++) {
    const s = (i + r()) / 70, a = from + s * 4.6, far = 170 + 420 * s ** 0.9 + 22 * bell(), size = (5 + 30 * (1 - s) ** 1.7) * (0.6 + 0.8 * r()), fore = Math.cos(a);
    put({ at: [CORE.at[0] + far * Math.sin(a), -772 - 170 * s - 0.2 * far * fore + 14 * bell(), CORE.at[2] + 0.92 * far * fore], r: size, kind: 'whirl', long: 1.2 + 0.9 * r(), flat: r(), family: 40 + arm });
  }
  // Lower down they hang in clumps, each clump one family, fewer and smaller the further down.
  for (let c = 0; c < 12; c++) {
    const a = r() * Math.PI * 2, far = 120 + 520 * Math.sqrt(r()), down = r() ** 1.35, mid: [number, number, number] = [far * Math.sin(a), -900 - 380 * down, 90 + far * Math.cos(a)];
    const spread = 46 + 70 * r(), count = Math.round((16 + 30 * r()) * (1 - 0.55 * down)), lead = 12 + 16 * r() * (1 - 0.5 * down);
    for (let k = 0; k < count; k++) {
      const size = k ? 2 + lead * 0.7 * r() ** 3.2 : lead, off = k ? 1 : 0;
      put({ at: [mid[0] + off * spread * bell() * 1.5, mid[1] + off * spread * 0.55 * bell(), mid[2] + off * spread * bell() * 1.5], r: size, kind: 'drift', long: 1.1 + r(), flat: r(), family: 50 + c });
    }
  }
  // Chips falling away along the stream, and dust everywhere, thickest under the break.
  for (let i = 0; i < 260; i++) {
    const down = r() ** 0.8, a = r() * Math.PI * 2, far = (10 + 70 * r()) * (0.4 + down), size = 1.2 + 4.2 * r() ** 2.4;
    put({ at: [CORE.at[0] + far * Math.sin(a), CORE.at[1] - CORE.r - 60 - 700 * down, CORE.at[2] + far * Math.cos(a)], r: size, kind: 'tumble', long: 1.3 + 1.1 * r(), flat: r(), family: 80 });
  }
  for (let i = 0; i < 700; i++) {
    const a = r() * Math.PI * 2, far = 60 + 640 * Math.sqrt(r()), down = r() ** 1.7, size = 0.8 + 1.9 * r() ** 2;
    put({ at: [far * Math.sin(a), -700 - 600 * down - 0.1 * far * Math.cos(a), 80 + far * Math.cos(a)], r: size, kind: 'tumble', long: 1.2 + r(), flat: r(), family: 81 + (i % 4) });
  }
  return PIECES = out;
}

// ---------------------------------------------------------------------------------------------------------------
// The cracks on the planet's outer surface at the visitor's left, lit from inside. That side is turned from the
// moon, so a crack with no light in it would not be seen there. They run out from the tear and branch as they go,
// widest and hottest at the tear. Each is a line of places on the surface, with how wide it is and how hot at
// each. They set out from a few knots, each joined to the tear.
export interface Crack { pts: number[]; wide: number[]; heat: number[] }
// Which way is straight out of the planet at a place.
export function outward(x: number, y: number, z: number): [number, number, number] {
  const e = 2, gx = shell(x + e, y, z) - shell(x - e, y, z), gy = shell(x, y + e, z) - shell(x, y - e, z), gz = shell(x, y, z + e) - shell(x, y, z - e), l = Math.hypot(gx, gy, gz) || 1;
  return [gx / l, gy / l, gz / l];
}
// The place on the rock's real surface nearest a place on the planet's outline, or nothing where the surface is
// torn away.
function onSkin(p: readonly [number, number, number]): [number, number, number] | null {
  const n = outward(p[0], p[1], p[2]), at = (s: number): number => rock(p[0] + n[0] * s, p[1] + n[1] * s, p[2] + n[2] * s);
  let a = 30, b = 30;
  if (at(a) < 0) return null;
  while (b > -30 && at(b) >= 0) { a = b; b -= 3; }
  if (b <= -30) return null;
  for (let i = 0; i < 9; i++) { const m = (a + b) / 2; if (at(m) < 0) b = m; else a = m; }
  const s = (a + b) / 2 + 1.5;
  return [p[0] + n[0] * s, p[1] + n[1] * s, p[2] + n[2] * s];
}
// Where each knot is (degrees round, how far down), how wide and how hot the cracks are there, and which ways its
// arms set out with how long each is: 0 is toward the tear, 180 away from it, 90 down.
const KNOTS: readonly { th: number; t: number; wide: number; heat: number; arms: readonly (readonly [number, number])[] }[] = [
  { th: -46, t: 0.4, wide: 10, heat: 1, arms: [[0, 70], [100, 200], [140, 250], [178, 300], [212, 280], [252, 200]] },
  { th: -48, t: 0.7, wide: 7, heat: 0.85, arms: [[-10, 60], [150, 190], [196, 230], [246, 150]] },
  { th: -47, t: 0.17, wide: 6, heat: 0.75, arms: [[8, 60], [164, 210], [214, 170]] },
];
const STEP = 7;
let CRACKS: Crack[] | null = null;
export function fractures(): Crack[] {
  if (CRACKS) return CRACKS;
  const r = seeded(6151), out: Crack[] = [], n = WORLD.full;
  const arm = (th: number, t: number, dir: number, len: number, w0: number, h0: number, depth: number): void => {
    const pts: number[] = [], wide: number[] = [], heat: number[] = [];
    let a = dir, done = 0, next = 14 + 22 * r();
    while (done < len && t > 0.04 && t < 0.97) {
      const p = onSkin(skinAt(th, t)), k = done / len, w = w0 * (1 - 0.8 * k), h = h0 * (1 - 0.62 * k);
      if (!p) break;
      pts.push(p[0], p[1], p[2]); wide.push(w); heat.push(h);
      th += (Math.cos(a) * STEP) / (WORLD.half * Math.max(0.35, (1 - t ** n) ** (1 / n)));
      t += (Math.sin(a) * STEP) / (WORLD.deep * 1.15);
      done += STEP; next -= STEP;
      if (next > 0) continue;
      // It runs straight, then turns sharply, as a break in rock does.
      const turn = (r() - 0.5) * 1.2, fork = r(), split = r(), share = 0.42 + 0.3 * r();
      next = 14 + 26 * r();
      if (depth < 2 && fork < 0.46 && len - done > 46) arm(th, t, a + (split < 0.5 ? 1 : -1) * (0.55 + 0.5 * r()), (len - done) * share, w * 0.62, h * 0.82, depth + 1);
      a += turn;
      // And never turns back on itself.
      a = dir + Math.max(-1.1, Math.min(1.1, a - dir));
    }
    if (wide.length > 2) out.push({ pts, wide, heat });
  };
  for (const k of KNOTS) for (const [dir, len] of k.arms) arm(k.th * D2R, k.t, dir * D2R, len, k.wide * (dir === k.arms[0][0] ? 1 : 0.8), k.heat, dir === k.arms[0][0] ? 2 : 0);
  return CRACKS = out;
}

// The smaller streams: the core's light leaking out of the torn rock at a few places and falling. Fewer than the
// world Claude Code built had, thin, each its own length and brightness, some nearer and some further back, all
// far fainter than the stream from the core, and none of them goes on down the page. Six equal ones read as legs
// the world stood on. Where each leaves (across and toward the visitor: it falls from the rock's underside
// there), how long it is, how wide and how bright.
export interface Vent { at: [number, number, number]; long: number; wide: number; heat: number }
const LEAKS: readonly (readonly [number, number, number, number, number])[] = [
  [-340, 232, 150, 1.4, 0.7], [-190, 40, 90, 1, 0.5], [-82, 30, 130, 1.2, 0.6], [74, 44, 70, 0.9, 0.45], [152, 20, 170, 1.4, 0.75], [352, 250, 110, 1.1, 0.55],
];
let VENTS: Vent[] | null = null;
export function vents(): Vent[] {
  if (VENTS) return VENTS;
  const out: Vent[] = [];
  for (const [x, z, long, wide, heat] of LEAKS) for (let y = -700; y < -440; y += 3) if (rock(x, y, z) < 0) { out.push({ at: [x, y + 4, z], long, wide, heat }); break; }
  return VENTS = out;
}
