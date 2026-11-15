// Study 32: the hero's world, started again from nothing, as a grey blockout. He set the built world and both
// worlds of Study 31 aside and asked for a new model of the same idea: a planet torn open, its core showing, the
// stream falling from the core, what broke away round it. Five pictures he had made (reference/concept/) set the
// look. This settles what a picture cannot: the planet's real shape and depth, the camera, the sizes of what stands
// on it, where the core hangs, and how all of it sits under his words. Nothing here is from the old plan.
//
// Its second round, after his look at the first. The planet is ripped apart and not cut into. The hero is seen in
// three steps on the scroll: the city alone at rest, then the land with its desert and its trees, then the
// catastrophe. So the far half of the top is city and the near half, which is under the foot of the screen at rest,
// is where the open land lies.
//
// Units, one a CSS pixel on a screen 1460 wide. The origin is the top of the planet, at the spire's foot. x to the
// visitor's right, y up, z toward the visitor.

export const D2R = Math.PI / 180;

// The planet. As wide as before, which he called perfect. Its top is a gentle dome, the top of a far larger
// sphere, so the land curves and is not a table: he found a rounder top too round. Under the rim its body was a
// deep bowl, half a small planet, and what is left of that bowl is what rock() describes.
export const WORLD = { half: 660, top: 1900, deep: 560 } as const;
export const RIM = WORLD.top - Math.sqrt(WORLD.top ** 2 - WORLD.half ** 2);
export const dome = (x: number, z: number): number => Math.sqrt(Math.max(1, WORLD.top ** 2 - x * x - z * z)) - WORLD.top;

// The core: a ball of the stream's light hanging low in the torn hollow, well under the city, on the hero's
// center line. He found it wrong directly under the ground.
export const CORE = { at: [0, -436, 60] as const, r: 84 } as const;

// The spire: the tallest thing by far, on the center line, with one thin ring near its top, tilted as Saturn's is.
export const SPIRE = { tall: 330, foot: 48, ring: { r: 66, thick: 2.6, up: 0.79, tilt: [9, 17] as const } } as const;
// Nothing else stands taller than this.
export const TALLEST = 216;
// The open court round the spire's foot.
export const COURT = 88;
// The pyramid: in the city, among the buildings, to the left of the spire.
export const PYRAMID = { x: -268, z: 78, base: 190, tall: 122, court: 134 } as const;
// The avenue from the spire's court toward the visitor, which ends in the air where the ground is torn away.
export const AVENUE = { half: 24, from: 60 } as const;
// A boulevard's half width and a street's.
export const BOULEVARD = 11;
export const STREET = 4.5;

// How it is looked at: from straight in front and from above, by so many degrees, from far off. The built world was
// seen from 4.5, which shows a skyline and none of the land. The pictures are seen from about 10 to 15.
export const VIEW = { el: [8, 12, 16] as const, rest: 12, back: 9000 } as const;
// Its host on the page: this wide whatever the screen, this tall, with its top this far over the spire's tip.
export const HOST = { wide: 1460, tall: 1480, over: 80 } as const;
// His words, as the hero page sets them (src/hero/board.ts).
export const WORDS = { w: 960, tall: 330, least: 90, third: 0.33, rise: 146, gap: 20 } as const;

// The moon, from the visitor's upper right, as it is in the page's sky: the one light, whose shadows make the world.
export const MOONWARD = [0.8, 0.46, 0.08] as const;

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
// The planet, ripped apart.
//
// Rock breaks into pieces, and a piece is either still there or gone. So the planet is divided into great pieces,
// each the part of space nearest one point, and each is kept whole or taken whole: every face of what is left is a
// face where two pieces parted, flat and large, and every edge is sharp. That is what a cut cannot look like. A
// smooth description of what survives (whole) only chooses which pieces stay.

// How much of the planet survives at a place: over 0 where it does.
const TEAR = {
  // How deep the rock still hangs: at its deepest on the visitor's right, which the moon lights, and its shallowest
  // on the left.
  under: -540, lean: -110, wave: 44, rough: 76,
  // The hollow round the core: a chamber, a mouth that opens it to the visitor under a roof of crust (where its
  // middle is, how high its roof is, how far it reaches across and back), and a shaft that opens it below.
  chamber: [0, -430, 130, 300, 300, 300] as const,
  mouth: [0, -168, 420, 340, 330] as const,
  shaft: [110, 240, -400] as const,
  // Where the land ends, measured out from the middle: it is bitten back unevenly all the way round, and most at
  // the front over the hollow.
  rim: 648, bite: 300, front: 96,
} as const;
// How far inside the land's bitten edge a place is.
function within(x: number, z: number): number {
  const th = Math.atan2(x, z);
  return TEAR.rim + TEAR.bite * (noise(2.3 * Math.sin(th) + 5, 2.3 * Math.cos(th) + 5, 0, 37) - 0.5) - TEAR.front * Math.exp(-((th / 0.42) ** 2)) - Math.hypot(x, z);
}
function whole(x: number, y: number, z: number): number {
  const th = Math.atan2(x, z), sn = Math.sin(th), cs = Math.cos(th);
  let t = y - (TEAR.under + TEAR.lean * sn + TEAR.wave * Math.cos(2 * th + 0.9) + TEAR.rough * (noise(x / 240 + 7, 0, z / 240, 31) - 0.5));
  const c = TEAR.chamber, m = TEAR.mouth;
  t = Math.min(t, (Math.hypot((x - c[0]) / c[3], (y - c[1]) / c[4], (z - c[2]) / c[5]) - 1) * c[3]);
  t = Math.min(t, Math.max((Math.hypot((x - m[0]) / m[3], (z - m[2]) / m[4]) - 1) * m[3], y - m[1]));
  t = Math.min(t, Math.max(Math.hypot(x, z - TEAR.shaft[0]) - TEAR.shaft[1], y - TEAR.shaft[2]));
  if (y > -260) t = Math.min(t, within(x, z));
  // The bowl's skin is stripped in patches, more of it the further down.
  const k = Math.hypot(x / WORLD.half, (y + RIM) / WORLD.deep, z / WORLD.half);
  return Math.min(t, (0.93 + 0.18 * noise(2 * sn + 3, y / 150, 2 * cs + 3, 43) + 0.06 * ramp(-420, -150, y) - k) * WORLD.deep);
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
const SLAB = { size: [186, 150, 186] as const, loose: 56, gap: 6, shift: 13, far: [18, 130] as const, top: -86, edge: [14, 104] as const } as const;
// Smaller pieces along the break: some knocked out of a slab's face, some still clinging to it.
const CHIP = { size: [50, 40, 50] as const, out: [-22, -2, 0.2] as const, on: [2, 20, 0.12] as const } as const;
// Long pieces left hanging from the torn underside, each tapering to a point.
const HANG = { size: [84, 300, 84] as const, share: 0.4, clear: 170, blunt: 4, taper: 24, least: 17 } as const;
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
    if (gap > 0.4 && y > SLAB.top - 40) gap *= Math.max(ramp(-18, -90, y - dome(x, z)), 1 - ramp(SLAB.edge[0], SLAB.edge[1], within(x, z)));
    // A crack opens and closes along its length.
    if (gap > 0.4) f = Math.max(f, gap * (0.25 + 1.5 * noise(x / 70, y / 70, z / 70, 67)) - (DIN2 - DIN) / (2 * apart(L, IN, IN2)));
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
    OPEN[a] = L.p[a * 3 + 1] > SLAB.top ? 1 - ramp(SLAB.edge[0], SLAB.edge[1], within(L.p[a * 3], L.p[a * 3 + 2])) : 1 - ramp(SLAB.far[0], SLAB.far[1], t);
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
    if (z > CORE.at[2] && Math.abs(x - CORE.at[0]) < CORE.r + 50) continue;
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

// The planet's body under its land: under 0 inside the rock.
const WARP = 16, FINE = 4.5;
export function rock(x: number, y: number, z: number): number {
  if (!BIG) broken();
  // Its top lies just under the land, dunes and all, so the land's sheet never stands clear of it.
  const bare = dome(x, z), k = Math.hypot(x / WORLD.half, (y + RIM) / WORLD.deep, z / WORLD.half);
  if ((k - 1) * WORLD.deep > 48 || y - bare > 104) return 48;
  const top = y - (bare - 3 + (y > bare - 14 ? land(x, z) : 0));
  if (top > 48) return 48;
  const skin = (noise(x / 170, y / 170, z / 170, 3) - 0.5) * 30;
  if (SOLID[cell(BIG as Lattice, x, y, z)]) return Math.max(-48, (k - 1) * WORLD.deep + skin, top);
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
  // A piece that has opened has also shifted, so the skin it carries no longer lines up with its neighbour's. The
  // top does not move: the land lies on it.
  let b = (k - 1) * WORLD.deep + skin;
  if (mine >= 0 && OPEN[mine] > 0) b = (Math.hypot((x - MOVE[mine * 3]) / WORLD.half, (y - MOVE[mine * 3 + 1] + RIM) / WORLD.deep, (z - MOVE[mine * 3 + 2]) / WORLD.half) - 1) * WORLD.deep + skin;
  return Math.max(-48, Math.min(48, Math.max(f, b, top)));
}

// ---------------------------------------------------------------------------------------------------------------
// The land.

// The desert: how much of it a place on the map is, 0 to 1. At the front right, on the near half of the top, so it
// is under the foot of the screen at rest and comes up on the first scroll. Smaller than the first round's, which
// he found too big: where it lies, how far it reaches along and across, and how far it is turned.
export const DESERT = { at: [296, 424] as const, r: [330, 228] as const, turn: -20 } as const;
export function desert(x: number, z: number): number {
  const c = Math.cos(DESERT.turn * D2R), s = Math.sin(DESERT.turn * D2R), rx = x - DESERT.at[0], rz = z - DESERT.at[1];
  return ramp(0, 0.2, 1 - Math.hypot((rx * c + rz * s) / DESERT.r[0], (-rx * s + rz * c) / DESERT.r[1]) + 0.2 * (noise(x / 110, 0, z / 110, 7) - 0.5));
}
// The dunes: each a crescent with a long back to the wind and a steep face away from it, which the moon leaves in
// shadow. Where it is, how long its back is, how wide it is and how tall. The ones nearest the city are the low
// ones, so no crest stands into the first screen.
const WIND = [-0.83, 0.56] as const, SLIP = 0.62;
const DUNES: readonly (readonly [number, number, number, number, number])[] = [
  [335, 440, 150, 118, 46], [215, 480, 120, 96, 34], [455, 360, 130, 100, 40], [262, 356, 100, 80, 22], [415, 510, 110, 86, 30],
  [150, 420, 84, 66, 16], [512, 300, 90, 70, 20], [300, 560, 100, 80, 28], [128, 530, 80, 62, 18], [385, 292, 84, 64, 14],
];
export function dunes(x: number, z: number): number {
  let h = 0;
  for (const [cx, cz, len, wid, tall] of DUNES) {
    const rx = x - cx, rz = z - cz, u = rx * WIND[0] + rz * WIND[1], v = -rx * WIND[1] + rz * WIND[0], side = v / wid;
    if (Math.abs(side) >= 1) continue;
    const top = tall * (1 - side * side), s = u - 0.42 * len * side * side;
    h = Math.max(h, s <= 0 ? top * ease(Math.max(0, 1 + s / len)) ** 1.15 : Math.max(0, top - SLIP * s));
  }
  return h + 5 * noise(x / 90, 1, z / 90, 9);
}
export const land = (x: number, z: number): number => desert(x, z) * dunes(x, z);
export const ground = (x: number, z: number): number => dome(x, z) + land(x, z);

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
// Not one grid. It grew as a real city does, in districts, each with its own street angle, so from the page's view
// no two line up. The boulevards are where two districts meet. Its skyline falls from the spire to each side,
// unevenly, with a second and lower peak at the right. It is tall on the far side of the planet, so tops stand
// behind tops, and low on the near side, so the land is seen laid out once the page is scrolled.
export interface District { name: string; x: number; z: number; turn: number; pitch: number }
export const DISTRICTS: readonly District[] = [
  { name: 'crown', x: 12, z: -34, turn: 14, pitch: 76 },
  { name: 'temple', x: -292, z: 98, turn: -24, pitch: 62 },
  { name: 'west', x: -456, z: -196, turn: 33, pitch: 64 },
  { name: 'north', x: -128, z: -404, turn: -8, pitch: 70 },
  { name: 'heights', x: 276, z: -302, turn: 24, pitch: 72 },
  { name: 'east', x: 506, z: -36, turn: -36, pitch: 62 },
  { name: 'gardens', x: -366, z: 404, turn: 47, pitch: 58 },
  { name: 'mall', x: -112, z: 318, turn: -11, pitch: 58 },
  { name: 'shore', x: 300, z: 196, turn: 19, pitch: 58 },
];
export function districtAt(x: number, z: number): number {
  let best = 0, bd = 1e18;
  for (let i = 0; i < DISTRICTS.length; i++) { const d = (x - DISTRICTS[i].x) ** 2 + (z - DISTRICTS[i].z) ** 2; if (d < bd) { bd = d; best = i; } }
  return best;
}
// The boulevards: the lines where two districts meet, each from one end to the other.
export type Line = readonly [number, number, number, number];
let LINES: Line[] | null = null;
export function boulevards(): Line[] {
  if (LINES) return LINES;
  const out: Line[] = [], D = DISTRICTS;
  for (let i = 0; i < D.length; i++) for (let j = i + 1; j < D.length; j++) {
    const mx = (D[i].x + D[j].x) / 2, mz = (D[i].z + D[j].z) / 2, ex = D[j].x - D[i].x, ez = D[j].z - D[i].z, len = Math.hypot(ex, ez), dx = -ez / len, dz = ex / len;
    let lo = -2000, hi = 2000;
    for (let k = 0; k < D.length && lo < hi; k++) {
      if (k === i || k === j) continue;
      // Nearer both of these two than the third.
      const a = 2 * (dx * (D[i].x - D[k].x) + dz * (D[i].z - D[k].z)), b = 2 * (mx * (D[i].x - D[k].x) + mz * (D[i].z - D[k].z)) + D[k].x ** 2 + D[k].z ** 2 - D[i].x ** 2 - D[i].z ** 2;
      if (Math.abs(a) < 1e-9) { if (b < 0) lo = hi; continue; }
      if (a > 0) lo = Math.max(lo, -b / a); else hi = Math.min(hi, -b / a);
    }
    // And on the land.
    const along = mx * dx + mz * dz, q = along * along - (mx * mx + mz * mz - 646 ** 2);
    if (q <= 0) continue;
    lo = Math.max(lo, -along - Math.sqrt(q)); hi = Math.min(hi, -along + Math.sqrt(q));
    if (hi - lo > 40) out.push([mx + dx * lo, mz + dz * lo, mx + dx * hi, mz + dz * hi]);
  }
  return LINES = out;
}
const toLine = (x: number, z: number, l: Line): number => {
  const ex = l[2] - l[0], ez = l[3] - l[1], t = Math.min(1, Math.max(0, ((x - l[0]) * ex + (z - l[1]) * ez) / (ex * ex + ez * ez)));
  return Math.hypot(x - l[0] - ex * t, z - l[1] - ez * t);
};
// How far a place is from the middle of the nearest boulevard, and from the middle of the avenue.
export function boulevard(x: number, z: number): number {
  let d = 1e9;
  for (const l of boulevards()) d = Math.min(d, toLine(x, z, l));
  return d;
}
export const avenue = (x: number, z: number): number => (z < AVENUE.from ? Math.hypot(x, z - AVENUE.from) : Math.abs(x));
// How far a place is from the middle of the nearest street of its district.
export function street(x: number, z: number): number {
  const d = DISTRICTS[districtAt(x, z)], c = Math.cos(d.turn * D2R), s = Math.sin(d.turn * D2R), u = ((x - d.x) * c + (z - d.z) * s) / d.pitch, v = (-(x - d.x) * s + (z - d.z) * c) / d.pitch;
  return Math.min(Math.abs(u - Math.round(u)), Math.abs(v - Math.round(v))) * d.pitch;
}

// The parks: real ones, each a stretch of trees and open ground and not one empty block. Where each lies, how far
// it reaches along and across, and how far it is turned.
export interface Park { name: string; x: number; z: number; a: number; b: number; turn: number }
export const PARKS: readonly Park[] = [
  { name: 'great', x: -322, z: 372, a: 128, b: 84, turn: 34 },
  { name: 'mall', x: -92, z: 296, a: 150, b: 46, turn: 90 },
  { name: 'east', x: 452, z: 96, a: 84, b: 58, turn: -30 },
];
export function park(x: number, z: number): number {
  let best = -1;
  for (const p of PARKS) {
    const c = Math.cos(p.turn * D2R), s = Math.sin(p.turn * D2R), rx = x - p.x, rz = z - p.z;
    best = Math.max(best, 1 - Math.hypot((rx * c + rz * s) / p.a, (-rx * s + rz * c) / p.b) + 0.16 * (noise(x / 60, 3, z / 60, 23) - 0.5));
  }
  return best;
}

// How tall the city stands at a place, before each building's own share of it.
export function tallAt(x: number, z: number): number {
  const crown = 190 * Math.exp(-((Math.hypot(x, 0.7 * z) / 214) ** 2));
  const second = 58 * Math.exp(-(((x - 312) / 128) ** 2 + ((z + 158) / 168) ** 2));
  const shoulder = 74 * Math.exp(-(((x + 408) / 150) ** 2 + ((z + 150) / 190) ** 2));
  const behind = 56 * ramp(-70, -380, z) * (1 - (x / 660) ** 2);
  return (44 + crown + second + shoulder + behind) * (1 - 0.64 * ramp(110, 400, z));
}

export type Form = 'step' | 'taper' | 'drum' | 'blade' | 'twin' | 'needles' | 'box' | 'tier';
export interface Building { x: number; z: number; w: number; d: number; tall: number; turn: number; form: Form; lean: number }
export interface Tree { x: number; z: number; size: number }
export interface City { buildings: Building[]; trees: Tree[] }

// Whether a building may stand with its middle at a place and reach so far each way.
function free(x: number, z: number, half: number, turn: number, off = 5): boolean {
  const c = Math.cos(turn), s = Math.sin(turn);
  for (const [a, b] of [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const px = x + (a * c - b * s) * half, pz = z + (a * s + b * c) * half;
    if (!standing(px, pz, 9) || desert(px, pz) > 0.04 || boulevard(px, pz) < BOULEVARD + off || avenue(px, pz) < AVENUE.half + 26 || Math.hypot(px, pz) < COURT + 6) return false;
    if (Math.hypot(px - PYRAMID.x, pz - PYRAMID.z) < PYRAMID.court + 4 || park(px, pz) > -0.02) return false;
  }
  return true;
}
// About how far across one small building's lot is.
const LOT = 16.5;
const TOWERS: readonly Form[] = ['step', 'taper', 'drum', 'blade', 'twin', 'needles', 'step', 'taper'];
let CITY: City | null = null;
export function city(): City {
  if (CITY) return CITY;
  const r = seeded(7741), buildings: Building[] = [], trees: Tree[] = [];
  const tree = (x: number, z: number, size: number, sand = 0.3) => { if (standing(x, z, 5) && desert(x, z) < sand && Math.hypot(x, z) > SPIRE.foot + 10) trees.push({ x, z, size }); };
  DISTRICTS.forEach((d, di) => {
    const turn = d.turn * D2R, c = Math.cos(turn), s = Math.sin(turn), reach = Math.ceil(760 / d.pitch);
    for (let iu = -reach; iu <= reach; iu++) for (let iv = -reach; iv <= reach; iv++) {
      const u = (iu + 0.5) * d.pitch, v = (iv + 0.5) * d.pitch, x = d.x + u * c - v * s, z = d.z + u * s + v * c;
      const roll = r(), kind = r(), size = r(), share = r();
      if (Math.hypot(x, z) > 660 || districtAt(x, z) !== di) continue;
      const inside = d.pitch / 2 - STREET, tall = tallAt(x, z);
      const at = (a: number, b: number): [number, number] => [x + a * c - b * s, z + a * s + b * c];
      if (park(x, z) > 0) continue;
      // A tall block is one tower, standing on the whole of it.
      if (tall > 92) {
        const w = inside * (0.62 + 0.3 * size), near = Math.exp(-((Math.hypot(x, z) / 240) ** 2)), h = Math.min(TALLEST, tall * (0.66 + 0.16 * near + (0.5 - 0.1 * near) * share));
        if (free(x, z, w, turn)) { buildings.push({ x, z, w: 2 * w, d: 2 * w * (0.74 + 0.26 * r()), tall: h, turn, form: TOWERS[Math.floor(kind * TOWERS.length)], lean: 0 }); continue; }
      }
      // A lower one is small buildings round a courtyard with trees in it, so the city between its towers is a
      // fabric of streets and yards and not open paving.
      const n = Math.round((2 * inside) / LOT), lot = (2 * inside) / n, lo = 1, hi = n - 2;
      let stood = 0;
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
        const one = r(), two = r(), three = r(), deep = r();
        if (a >= lo && a <= hi && b >= lo && b <= hi) continue;
        if (one < 0.04) continue;
        const [px, pz] = at(-inside + (a + 0.5) * lot, -inside + (b + 0.5) * lot), w = lot * (0.42 + 0.05 * two);
        if (!free(px, pz, w, turn, 3)) continue;
        // One height to a block, give or take, and well under the towers: they are what the skyline is made of.
        const h = Math.max(8, Math.min(58, 13 + 0.34 * tall) * (0.6 + 0.5 * roll) * (0.84 + 0.32 * three) * (deep < 0.07 ? 1.6 : 1));
        buildings.push({ x: px, z: pz, w: 2 * w, d: 2 * w * (0.9 + 0.2 * deep), tall: h, turn, form: h > 40 && two > 0.5 ? 'tier' : 'box', lean: 0 });
        stood++;
      }
      if (stood > n) for (let q = 0; q < (n === 3 ? 1 : 3); q++) { const [px, pz] = at((r() - 0.5) * lot * (n - 2.4), (r() - 0.5) * lot * (n - 2.4)); tree(px, pz, 4.4 + 1.8 * r()); }
      // And a tree at each corner of the block, on the near half of the top, where the streets are seen.
      if (stood > 1 && z > -40) for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const [px, pz] = at(a * (inside + 1.5), b * (inside + 1.5)); if (r() < 0.8 && boulevard(px, pz) > BOULEVARD + 4 && avenue(px, pz) > AVENUE.half + 24 && park(px, pz) < -0.05) tree(px, pz, 3.6 + 1.2 * r()); }
    }
  });
  // What stands at the land's broken edge leans toward the break.
  for (const b of buildings) { const e = inland(b.x, b.z); if (e < 26) b.lean = (1 - e / 26) * (4 + 7 * hash(Math.round(b.x), 1, Math.round(b.z), 5)) * D2R; }
  // Trees. Two rows down each side of the avenue, one down each side of every boulevard.
  for (let z = AVENUE.from + 26; z < 640; z += 15) for (const side of [-1, 1]) { tree(side * (AVENUE.half + 7), z, 8.4, 0.9); tree(side * (AVENUE.half + 19), z + 7, 7.2, 0.6); }
  for (const l of boulevards()) {
    const len = Math.hypot(l[2] - l[0], l[3] - l[1]), nx = -(l[3] - l[1]) / len, nz = (l[2] - l[0]) / len;
    for (let t = 8; t < len; t += 13) for (const side of [-1, 1]) {
      const x = l[0] + ((l[2] - l[0]) * t) / len + side * (BOULEVARD - 2.5) * nx, z = l[1] + ((l[3] - l[1]) * t) / len + side * (BOULEVARD - 2.5) * nz;
      if (Math.hypot(x, z) > COURT + 8 && avenue(x, z) > AVENUE.half + 4 && Math.hypot(x - PYRAMID.x, z - PYRAMID.z) > PYRAMID.base * 0.74) tree(x, z, 6.2);
    }
  }
  // A ring round the pyramid's court, and one round the spire's.
  for (let i = 0; i < 46; i++) { const a = (i / 46) * Math.PI * 2; tree(PYRAMID.x + Math.sin(a) * (PYRAMID.court - 8), PYRAMID.z + Math.cos(a) * (PYRAMID.court - 8), 7.4); }
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; if (Math.abs(Math.sin(a)) * COURT > AVENUE.half + 4 || Math.cos(a) < 0) tree(Math.sin(a) * (COURT - 7), Math.cos(a) * (COURT - 7), 6.4); }
  // The parks: trees in stands, with open ground between them.
  for (let z = -660; z < 660; z += 9) for (let x = -660; x < 660; x += 9) {
    const jx = x + 8 * (r() - 0.5), jz = z + 8 * (r() - 0.5), p = park(jx, jz), sand = desert(jx, jz), pick = r(), size = r();
    if (p > 0.04 && noise(jx / 34, 5, jz / 34, 61) > 0.4 && pick < 0.86 && avenue(jx, jz) > AVENUE.half + 26) tree(jx, jz, 6 + 5.5 * size);
    // And a belt of them where the city meets the sand.
    else if (sand > 0.015 && sand < 0.34 && pick < 0.8) tree(jx, jz, 5.5 + 5 * size, 0.4);
  }
  return CITY = { buildings, trees };
}

// ---------------------------------------------------------------------------------------------------------------
// What broke away. A great deal of it, of four kinds. None of it moves in the blockout: how each kind moves is
// here so the build knows.
//   slab: a great piece that still carries a piece of the land, hanging off the break it came from.
//   locked: holds its place and keeps one face to the core, its long way pointing at it.
//   orbit: goes slowly round the planet in a belt, in front of the tear and behind the planet.
//   tumble: small, turning over as it falls away under the core, along the stream.
export type Drift = 'slab' | 'locked' | 'orbit' | 'tumble';
export interface Piece { at: [number, number, number]; r: number; kind: Drift; long: number; land?: 'city' | 'sand' }
const SLABS: readonly Piece[] = [
  { at: [-596, -236, 356], r: 80, kind: 'slab', long: 1, land: 'city' }, { at: [622, -300, 300], r: 70, kind: 'slab', long: 1, land: 'sand' },
  { at: [-470, -590, 420], r: 62, kind: 'slab', long: 1, land: 'city' }, { at: [372, -560, 470], r: 56, kind: 'slab', long: 1, land: 'city' },
  { at: [-250, -820, 300], r: 48, kind: 'slab', long: 1, land: 'city' }, { at: [540, -760, 200], r: 44, kind: 'slab', long: 1, land: 'sand' },
  { at: [160, -930, 260], r: 36, kind: 'slab', long: 1, land: 'city' },
];
// The belts: how far out, how high, how far the belt is tipped toward the visitor, and how many are in it.
const BELTS: readonly (readonly [number, number, number, number, number, number])[] = [[700, 960, -330, 9, 70, 30], [360, 660, -770, 5, 64, 22]];
// How far down the host the first screen ends on the tallest desktop screen: nothing that broke away is over it.
const REST = 570;
let PIECES: Piece[] | null = null;
export function debris(): Piece[] {
  if (PIECES) return PIECES;
  const r = seeded(4409), out: Piece[] = [...SLABS], core = drawn(CORE.at[0], CORE.at[1], CORE.at[2]);
  const fits = (p: Piece): boolean => {
    const [sx, sy] = drawn(p.at[0], p.at[1], p.at[2]);
    if (Math.abs(sx) + p.r > HOST.wide / 2 - 6 || sy + p.r > HOST.tall - 8) return false;
    // Nothing of it shows at rest, nothing hides the core, and nothing is inside the rock.
    if (sy - p.r < REST) return false;
    if (p.at[2] > CORE.at[2] && Math.hypot(sx - core[0], sy - core[1]) < CORE.r + p.r * p.long + 34) return false;
    const reach = p.r * p.long * 0.8;
    if (rock(p.at[0], p.at[1], p.at[2]) < Math.min(46, reach + 8)) return false;
    for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) if (rock(p.at[0] + a * reach, p.at[1] + b * reach, p.at[2] + c * reach) < 8) return false;
    return out.every((o) => Math.hypot(o.at[0] - p.at[0], o.at[1] - p.at[1], o.at[2] - p.at[2]) > (o.r + p.r) * 1.15);
  };
  const tryFor = (count: number, make: () => Piece) => { for (let made = 0, tries = 0; made < count && tries < count * 40; tries++) { const p = make(); if (fits(p)) { out.push(p); made++; } } };
  tryFor(52, () => {
    const a = (r() - 0.5) * 2 * 150 * D2R, up = (-78 + 100 * r()) * D2R, far = 300 + 420 * r() ** 0.8;
    return { at: [CORE.at[0] + far * Math.cos(up) * Math.sin(a), CORE.at[1] + far * Math.sin(up), CORE.at[2] + far * Math.cos(up) * Math.cos(a)], r: 9 + 44 * r() ** 2.4, kind: 'locked', long: 1.5 + 0.9 * r() };
  });
  for (const [near, farOut, high, tip, count, big] of BELTS) tryFor(count, () => {
    const a = r() * Math.PI * 2, far = near + (farOut - near) * r(), x = far * Math.sin(a), z = far * Math.cos(a);
    return { at: [x, high + 70 * (r() - 0.5) - z * Math.tan(tip * D2R), z], r: 5 + big * r() ** 2.2, kind: 'orbit', long: 1.1 + 0.5 * r() };
  });
  tryFor(84, () => {
    const down = r() ** 0.7, y = CORE.at[1] - CORE.r - 60 - 620 * down, a = r() * Math.PI * 2, far = (40 + 300 * r()) * (0.5 + 0.8 * down);
    return { at: [CORE.at[0] + far * Math.sin(a), y, CORE.at[2] + 60 + far * Math.cos(a) * 0.7], r: 2.6 + 12 * r() ** 2 * (1 - 0.5 * down), kind: 'tumble', long: 1.3 + 1.1 * r() };
  });
  return PIECES = out;
}
