import { DUNES, EDGE, MARGIN, MONUMENT, within } from '../../layout';

// Where the dunes lie, on the plan's map. The view is from straight in front and a little above, and the moon is at
// the visitor's right. So the crests run away from the visitor turned a quarter of a right angle to the right, and
// the wind that made them blows from the moon's side toward the city and a little toward the visitor: every windward
// face takes the moon and is seen across, and every slip face is in the moon's lee and turned to the visitor. The
// two meet on each crest as a sharp line between light and dark. Run straight away from the visitor, the crests were
// seen end on, and in front of the moon they were seen only in their dark faces. Seen at the right of the skyline
// the same dunes stand in outline: a long slope rising from the right and a steep fall to the left.

const D2R = Math.PI / 180;

// Which way the crests run, on the map, and the way the wind blows across them, toward the slip faces.
const TURN = 25 * D2R;
export const CREST: readonly [number, number] = [Math.sin(TURN), Math.cos(TURN)];
export const WIND: readonly [number, number] = [-Math.cos(TURN), Math.sin(TURN)];
// A place on the map from how far along the crests and how far downwind of the world's top it is.
export const across = (a: number, b: number): [number, number] => [a * CREST[0] + b * WIND[0], a * CREST[1] + b * WIND[1]];

// A dune with one crest: the crest's line on the map, front to back, how tall it is at its highest, how far its
// windward slope runs out (in its heights), how steep its slip face is (degrees), and how steep the crest's windward
// side is right at the crest (a share of the windward slope's mean: under 1 the top rolls over to the brink). A star
// dune's arm starts at the summit and runs back a little behind it (back), so its arms meet inside one another. lee
// turns the slip face to the other side. swell is how much it rises and falls along its crest.
export interface Ridge {
  pts: [number, number][];
  tall: number;
  peak: number;
  wind: number;
  slip: number;
  sharp: number;
  swell: number;
  back?: number;
  lee?: 1 | -1;
  // How many points along its crest and across each face: the dunes seen only in outline are cut coarser.
  fine: number;
}

const ridge = (pts: [number, number][], tall: number, o: Partial<Ridge> = {}): Ridge => ({ pts, tall, peak: 0.5, wind: 2.2, slip: 52, sharp: 0.6, swell: 0.22, fine: 1, ...o });

// A row of the sand sea: a long crest across the wind, snaking from side to side as it goes, from wherever it first
// finds sand under it to wherever that ends, along the crests. b is how far downwind it lies, and the row may be held
// to a stretch along the crests (from, to).
export interface Row { b: number; tall: number; snake: number; bend: number; phase: number; from?: number; to?: number; o?: Partial<Ridge> }
// Where a row's crest is, at so far along the crests.
export const crestAt = (w: Row, a: number): [number, number] => across(a, w.b + w.snake * Math.sin((2 * Math.PI * a) / w.bend + w.phase));
function row(w: Row): Ridge[] {
  let a0 = NaN, a1 = NaN, best = 0, start = NaN;
  for (let a = -320; a <= 720; a += 4) {
    const [x, z] = crestAt(w, a), inside = room(x, z, 16) > 0.5 && a >= (w.from ?? -1e9) && a <= (w.to ?? 1e9);
    if (inside && Number.isNaN(start)) start = a;
    if ((!inside || a + 4 > 720) && !Number.isNaN(start)) {
      if (a - start > best) { best = a - start; a0 = start; a1 = a; }
      start = NaN;
    }
  }
  if (!(best > 60)) return [];
  const pts: [number, number][] = [], n = Math.max(3, Math.round((a1 - a0) / 30));
  for (let i = 0; i <= n; i++) pts.push(crestAt(w, a0 + ((a1 - a0) * i) / n));
  return [ridge(pts, w.tall, w.o)];
}

// The rows of the sand sea, from the front left back to the rim. The pool lies in front of the second's end, and
// beyond it is the slip face of the fourth, the great dune, which stands in outline at the right of the skyline. The
// rows near the pool end short of it.
export const ROWS: Row[] = [
  { b: -165, tall: 56, snake: 14, bend: 110, phase: 2.1 },
  { b: -238, tall: 68, snake: 18, bend: 125, phase: 0.4, to: 405 },
  { b: -310, tall: 64, snake: 16, bend: 140, phase: 1.7, to: 215 },
  { b: -402, tall: 96, snake: 22, bend: 150, phase: 0.6, o: { wind: 1.8 } },
  { b: -478, tall: 82, snake: 18, bend: 135, phase: 2.6, o: { wind: 1.9, fine: 0.8 } },
  { b: -552, tall: 62, snake: 14, bend: 120, phase: 1.1, o: { wind: 1.9, fine: 0.6 } },
];

// A barchan: a small crescent dune whose horns run on downwind, its slip face in the hollow between them.
function barchan(x: number, z: number, tall: number, wide: number): Ridge {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const k = i / 3 - 1, along = (k * wide) / 2, down = k * k * wide * 0.42;
    pts.push([x + CREST[0] * along + WIND[0] * down, z + CREST[1] * along + WIND[1] * down]);
  }
  return ridge(pts, tall, { wind: 2.0, slip: 46, sharp: 0.8, swell: 0 });
}

// A star dune: a summit and arms that run out from it, each a crest of its own that bends as it goes.
function star(x: number, z: number, tall: number, arms: { dir: number; len: number; bend: number; lee?: 1 | -1 }[], fine = 1): Ridge[] {
  return arms.map((a) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 5; i++) {
      const k = i / 5, th = (a.dir + a.bend * k * k) * D2R;
      pts.push([x + Math.sin(th) * a.len * k, z + Math.cos(th) * a.len * k]);
    }
    return ridge(pts, tall, { peak: 0, back: 0.08, wind: 1.9, slip: 49, sharp: 1.2, swell: 0, lee: a.lee, fine });
  });
}

// The pool of polished metal, in a hollow in front of the monument and the dunes, long along the crests as a pool
// between dunes is: nothing stands between it and the visitor, for the view is so nearly level that any dune in front
// of it hid it. Its middle on the map, how far out its shore is along the crests and across them, the
// height its face stands at over the plain ground, and its rim: like mercury it rounds over at its shore, over this
// far in, and falls this far to the sand. The rim is what catches the moon and the cursor's light from this view: a
// level mirror seen from nearly level only shows what is behind it.
export const POOL = { x: 440, z: 236, long: 50, wide: 30, level: 3, rim: 3.5, drop: 2.6 } as const;
// Its shore, as how far out from its middle at a bearing round it, in radians from the map's x toward its z. Sand
// drifts into it in spits.
const ALONG = Math.atan2(CREST[1], CREST[0]);
export function shore(t: number): number {
  const u = t - ALONG, e = 1 / Math.hypot(Math.cos(u) / POOL.long, Math.sin(u) / POOL.wide);
  const w = ((((u - 2.2) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI, spit = Math.exp(-(w * w) / 0.06);
  return e * (1 + 0.07 * Math.sin(3 * t + 0.7) + 0.05 * Math.sin(5 * t + 2.1) + 0.03 * Math.sin(9 * t + 4.0) - 0.18 * spit);
}

// Round the monument a court is kept clear for its base, and the sand only drifts against it.
export const COURT = { r: 38, drift: 7 } as const;

export const RIDGES: Ridge[] = [
  ...ROWS.flatMap(row),
  // Small crescents on the open sand behind the pool, between it and the great dune.
  barchan(458, 136, 22, 70), barchan(506, 172, 18, 56), barchan(478, 92, 16, 52),
  // A star dune closing the pool's hollow at the front right, by the rim.
  ...star(...across(458, -366), 54, [
    { dir: 25, len: 62, bend: 35 }, { dir: 150, len: 70, bend: -40 }, { dir: 245, len: 34, bend: 30 }, { dir: 320, len: 48, bend: -35 },
  ]),
  // A great star dune at the back right, standing over the horizon.
  ...star(548, -205, 100, [
    { dir: 205, len: 100, bend: 40 }, { dir: 300, len: 105, bend: -35 }, { dir: 70, len: 60, bend: 30, lee: 1 }, { dir: 10, len: 85, bend: -45 },
  ], 0.6),
];

// How much sand may lie at a place, 0 to 1: none past the torn edge or in the city, a little less near them.
export function room(x: number, z: number, inset = 0): number {
  const r = Math.hypot(x, z), b = ((Math.atan2(x, z) / D2R) + 360) % 360;
  const edge = Math.min(EDGE.at(b) - 10, MARGIN - 6) - inset - r;
  const spill = r > 472 ? 14 + 22 * smooth(472, 540, r) : 0;
  const ang = within(b, DUNES.from, DUNES.to) ? Math.min(b - DUNES.from, DUNES.to - b) * D2R * r : -Math.min(Math.abs(b - DUNES.from), Math.abs(b - DUNES.to)) * D2R * r;
  const side = ang + spill - inset;
  const inner = r - DUNES.r0 + 8 - inset;
  return smooth(0, 18, Math.min(edge, side, inner));
}

// How far from the court round the monument, and from the pool's shore.
export const fromCourt = (x: number, z: number): number => Math.hypot(x - MONUMENT.x, z - MONUMENT.z) - COURT.r;
export const fromPool = (x: number, z: number): number => Math.hypot(x - POOL.x, z - POOL.z) - shore(Math.atan2(z - POOL.z, x - POOL.x));

export function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const hash = (i: number, j: number): number => {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const noise = (x: number, z: number): number => {
  const i = Math.floor(x), j = Math.floor(z), u = x - i, v = z - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  return (hash(i, j) * (1 - su) + hash(i + 1, j) * su) * (1 - sv) + (hash(i, j + 1) * (1 - su) + hash(i + 1, j + 1) * su) * sv;
};

// The sand sheet between the dunes: its height over the plain ground. A few units deep, rolling a little, drifted
// against the monument's base, and near the broken margin running out in fans toward the break.
export const SHEET = { deep: 5.5, roll: 3, sink: -3 } as const;
export function sheet(x: number, z: number): number {
  let h = SHEET.deep + SHEET.roll * (noise(x / 70, z / 70) - 0.5) + 1.4 * (noise(x / 23 + 7, z / 23) - 0.5);
  const r = Math.hypot(x, z), b = Math.atan2(x, z);
  const fan = smooth(MARGIN - 50, MARGIN, r);
  h -= fan * (2.4 + 1.8 * Math.sin(b * 70 + 3 * noise(r / 30, b * 9)));
  h += COURT.drift * smooth(22, -4, fromCourt(x, z));
  return h;
}
// The hollow the pool lies in: the sand is no higher than this, which falls under the pool's metal inside its shore
// and rises ever faster away from it, so the dunes round it come down to it in a bowl and not a pit.
export function hollow(x: number, z: number): number {
  const p = fromPool(x, z);
  return p > 40 ? Infinity : POOL.level - 0.75 * POOL.drop + Math.max(0, p) * 0.25 + Math.max(0, p) ** 2 * 0.05 + Math.min(0, p) * 0.5;
}

// What stands in the sand, where, and the sand the wind has heaped against each: on its windward side, and in a
// tail on its lee. Each place is on the map, with how far across the thing is at the sand.
export interface Place { x: number; z: number; wide: number; drift: number }
const COLUMN_GAP = 17;
export const PLACES = {
  obelisk: { ...xz(across(332, -428)), wide: 12, drift: 9 },
  columns: [0, 1, 2, 3, 4].map((i) => ({ ...xz(across(300 + COLUMN_GAP * i, -196)), wide: 9, drift: 6 })),
  markers: [0, 1, 2, 3, 4].map((i) => ({ x: 380 + 11.5 * i, z: 308 - 8.5 * i, wide: 4, drift: 2.5 })),
};
function xz([x, z]: [number, number]) { return { x, z }; }
// The sand heaped against the things in it, at a place on the map.
const DRIFTS: Place[] = [PLACES.obelisk, ...PLACES.columns, ...PLACES.markers];
export function drift(x: number, z: number): number {
  let h = 0;
  for (const d of DRIFTS) {
    const dx = x - d.x, dz = z - d.z;
    if (Math.abs(dx) > d.wide * 4 || Math.abs(dz) > d.wide * 4) continue;
    const down = dx * WIND[0] + dz * WIND[1], side = -dx * WIND[1] + dz * WIND[0];
    const stretch = down > 0 ? 2.6 : 1.1, q = Math.hypot(down / stretch, side) / d.wide;
    h = Math.max(h, d.drift * Math.exp(-q * q * 1.4));
  }
  return h;
}
