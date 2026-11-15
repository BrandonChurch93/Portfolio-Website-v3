// The hero as a wireframe, at /lab/hero-draft: where everything stands, on a board 1460 units wide. The screen's
// height is part of the plan: the words are set from the top of the screen and the world hangs under them.

export const W = 1460;
export const CX = W / 2;

// The world's own outline, measured from the tip of its spire: this wide at its torn edge.
export const CITY = { w: 1320, x: (W - 1320) / 2 } as const;
// The world is the top of a small planet: a sphere of this radius, kept from its top round to this many degrees,
// which is a little less than half of it. A spire this tall stands on its top, its core is this far across, and
// from the spire's tip to the lowest of its debris it is this tall.
export const PLANET = { r: 675, cap: 78, spire: 220, core: 150, tall: 1220 } as const;

const MID = CITY.w / 2;
const RAD = Math.PI / 180;
const r1 = (v: number): number => Math.round(v * 10) / 10;
const f = (p: readonly [number, number]): string => `${r1(p[0])} ${r1(p[1])}`;

// Down from the spire's tip: the top of the world, the planet's middle where its core is, the torn edge at its
// sides, and the underside of the core, where the stream leaves it. REACH is half the world's width at the edge.
export const POLE = PLANET.spire;
export const HEART = POLE + PLANET.r;
export const EDGE = r1(HEART - PLANET.r * Math.cos(PLANET.cap * RAD));
export const REACH = r1(PLANET.r * Math.sin(PLANET.cap * RAD));
export const SOURCE = HEART + PLANET.core;

// The words' block, and how far under it the spire's tip hangs. A taller screen shows more of the world.
export const WORDS = { tall: 330, least: 90, third: 0.33, rise: 146, gap: 20 } as const;
// The streams that leave the torn face, across from the middle.
export const FALLS = [-500, -330, -170, 170, 330, 500] as const;
// Where the stream's leading end is read on the screen, as everywhere else on the site.
export const READ = 0.66;
// Work, under the world: how far under the lowest debris its title's bar is, and how much page follows.
export const WORK = { under: 480, bar: 360, tail: 300 } as const;
// The night sky: how many stars are tried, how deep the band of them at the top is, the clear ground kept round
// the words, and how far the world's glow reaches, which is also where it puts the stars out.
export const SKY = { tries: 1400, band: 420, clear: { rx: 560, ry: 250 }, glow: { rx: 780, ry: 540, down: 60 } } as const;
// A moon in one upper corner and a faint band of far stars across the other.
export const MOON = { x: 1296, y: 132, r: 46 } as const;
export const BAND = { x: 210, y: 150, rx: 420, ry: 54, turn: -24 } as const;

const hash = (i: number): number => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// A place on the world's surface, so many degrees round from its top, and so far above the ground there.
const pt = (deg: number, up = 0): [number, number] => {
  const a = deg * RAD;
  return [MID + (PLANET.r + up) * Math.sin(a), HEART - (PLANET.r + up) * Math.cos(a)];
};

// The torn underside, from the right edge to the left: it hangs lowest near the middle, round the core.
const TEAR: [number, number][] = (() => {
  const n = 44, out: [number, number][] = [];
  for (let k = 0; k <= n; k++) {
    const x = REACH - (2 * REACH * k) / n, far = Math.abs(x) / REACH;
    const hang = k === 0 || k === n ? 0 : 26 + 175 * (1 - far ** 1.25) * (0.7 + 0.6 * hash(k + 11)) + (k % 2 ? 14 : -10);
    out.push([r1(MID + x), r1(EDGE + hang)]);
  }
  return out;
})();

// How far down the torn underside is, under a place across the world.
export const tearAt = (x: number): number => {
  for (let k = 1; k < TEAR.length; k++) {
    const a = TEAR[k - 1], b = TEAR[k];
    if (x <= a[0] && x >= b[0]) return r1(a[1] + ((b[1] - a[1]) * (a[0] - x)) / (a[0] - b[0] || 1));
  }
  return EDGE;
};

// The world's outline: the curve of its top from one side to the other, and back along the tear.
export function planet(): string {
  return `M ${r1(MID - REACH)} ${EDGE} A ${PLANET.r} ${PLANET.r} 0 0 1 ${r1(MID + REACH)} ${EDGE} ${TEAR.map((p) => `L ${f(p)}`).join(' ')} Z`;
}

// The layers of the planet seen where it is torn: lines that follow the tear, further in.
export function strata(): string[] {
  return [26, 54, 92, 140].map((off) => TEAR.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${r1(p[1] - off)}`).join(' '));
}

export type Thing = { d: string; kind: 'tower' | 'low' | 'dome' | 'farm' | 'tree' | 'pyramid' | 'crack' };

// What stands on the world, as outlines: towers at its top, and other kinds of place down its sides. Everything
// stands straight out from the ground under it.
export function world(): Thing[] {
  const out: Thing[] = [];
  const box = (deg: number, w: number, h: number, lean = 0): string => {
    const half = w / 2 / PLANET.r / RAD, a = pt(deg - half, -3), b = pt(deg + half, -3);
    const n: [number, number] = [Math.sin((deg + lean) * RAD) * h, -Math.cos((deg + lean) * RAD) * h];
    return `M ${f(a)} L ${f([a[0] + n[0], a[1] + n[1]])} L ${f([b[0] + n[0], b[1] + n[1]])} L ${f(b)}`;
  };
  const dome = (deg: number, r: number): string => {
    const half = r / PLANET.r / RAD;
    return `M ${f(pt(deg - half))} A ${r} ${r} 0 0 1 ${f(pt(deg + half))}`;
  };
  const tri = (deg: number, w: number, h: number): string => {
    const half = w / 2 / PLANET.r / RAD;
    return `M ${f(pt(deg - half, -2))} L ${f(pt(deg, h))} L ${f(pt(deg + half, -2))}`;
  };
  const tree = (deg: number, r: number): string => {
    const c = pt(deg, r + 2);
    return `M ${r1(c[0] - r)} ${r1(c[1])} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
  };
  const crack = (deg: number): string => `M ${f(pt(deg))} L ${f(pt(deg + 1.6, -22))} L ${f(pt(deg + 0.4, -40))}`;

  let k = 0;
  for (let deg = -19; deg <= 19.01; deg += 3.3, k++) {
    if (Math.abs(deg) < 2.6) continue;
    const h = (46 + 105 * Math.exp(-((deg / 11) ** 2))) * (0.65 + 0.5 * hash(k)), w = 18 + 12 * hash(k + 50);
    out.push({ d: box(deg, w, h), kind: 'tower' });
  }
  for (const s of [-1, 1]) {
    let j = 0;
    for (let deg = 22; deg <= 38; deg += 4, j++) {
      const seed = j + (s > 0 ? 30 : 0);
      if ((j + (s > 0 ? 1 : 0)) % 3 === 0) out.push({ d: dome(s * deg, 16 + Math.round(hash(seed) * 10)), kind: 'dome' });
      else out.push({ d: box(s * deg, 24 + 10 * hash(seed), 20 + 30 * hash(seed + 9)), kind: 'low' });
    }
  }
  for (const deg of [41, 47, 53]) out.push({ d: box(-deg, 62, 4), kind: 'farm' });
  for (const deg of [44, 45.2, 50, 51, 56, 57.1]) out.push({ d: tree(-deg, 6), kind: 'tree' });
  out.push({ d: box(-49, 9, 24), kind: 'low' });
  out.push({ d: tri(43, 64, 46), kind: 'pyramid' }, { d: tri(49.2, 46, 32), kind: 'pyramid' });
  out.push({ d: box(46.3, 6, 40), kind: 'low' }, { d: box(54, 50, 8), kind: 'farm' });
  for (const deg of [57.4, 58.6]) out.push({ d: tree(deg, 6), kind: 'tree' });
  out.push({ d: box(-64, 16, 34, -14), kind: 'low' }, { d: box(62, 5, 30), kind: 'low' }, { d: box(73, 30, 6, 10), kind: 'low' });
  for (const deg of [-68, -72, -75, 66, 71, 75]) out.push({ d: crack(deg), kind: 'crack' });
  return out;
}

export type Piece = { d: string; big: boolean };

// The debris round the torn underside: many small pieces and a few slabs, under and beside the tear.
export function debris(): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < 64; i++) {
    const a = hash(i * 5 + 1) * Math.PI, far = 230 + hash(i * 5 + 2) * 640;
    const x = MID + Math.cos(a) * far * 1.12, y = Math.min(PLANET.tall - 14, HEART + 30 + Math.sin(a) * far * 0.36);
    if (Math.abs(x - MID) < REACH && y < tearAt(x) + 16) continue;
    if (Math.hypot(x - MID, y - HEART) < PLANET.core + 22) continue;
    const size = 4 + 44 * hash(i * 5 + 3) ** 3, n = 5 + Math.floor(hash(i * 5 + 4) * 3), turn = hash(i + 200) * 6.28;
    const pts: string[] = [];
    for (let v = 0; v < n; v++) {
      const t = turn + (v / n) * 6.283, r = size * (0.6 + 0.5 * hash(i * 13 + v));
      pts.push(`${v ? 'L' : 'M'} ${r1(x + Math.cos(t) * r * 1.3)} ${r1(y + Math.sin(t) * r * 0.8)}`);
    }
    out.push({ d: `${pts.join(' ')} Z`, big: size > 22 });
  }
  return out;
}

export type Layout = {
  words: number; city: number; edge: number; source: number; foot: number; work: number; h: number; fold: number;
};

// Everything's place down the page for a screen so many units tall.
export function layout(hh: number): Layout {
  const words = Math.max(WORDS.least, WORDS.third * hh - WORDS.rise);
  const city = words + WORDS.tall + WORDS.gap;
  const foot = city + PLANET.tall, work = foot + WORK.under;
  return { words, city, edge: city + EDGE, source: city + SOURCE, foot, work, h: work + WORK.tail, fold: hh };
}

export type Star = { x: number; y: number; r: number; o: number; big: boolean };

// Stars at the top, in the corners and down the sides, none behind the words, fewer and fainter toward the world's
// glow, and thinning out before Work.
export function stars(l: Layout): Star[] {
  const out: Star[] = [], wy = l.words + WORDS.tall / 2, gy = l.city + POLE + SKY.glow.down;
  for (let i = 0; i < SKY.tries; i++) {
    const x = hash(i * 3 + 1) * W, y = hash(i * 3 + 2) * l.foot;
    const top = 1 - Math.min(1, y / SKY.band), side = Math.abs(x - CX) / CX;
    const edge = Math.max(top, side ** 2.2);
    const inWords = ((x - CX) / SKY.clear.rx) ** 2 + ((y - wy) / SKY.clear.ry) ** 2;
    const lit = Math.max(0, 1 - Math.hypot((x - CX) / SKY.glow.rx, (y - gy) / SKY.glow.ry));
    const low = 1 - Math.max(0, (y - (l.foot - 320)) / 320);
    const keep = edge * Math.min(1, Math.max(0, inWords - 1) * 1.6) * (1 - lit) ** 1.5 * low;
    if (hash(i * 3 + 3) > keep * 0.62) continue;
    const big = hash(i + 500) > 0.93;
    out.push({ x: r1(x), y: r1(y), r: big ? 1.7 : 0.6 + Math.round(hash(i + 700) * 6) / 10, big, o: Math.round((0.25 + 0.6 * hash(i + 900)) * (big ? 1 : 0.8) * 100) / 100 });
  }
  return out;
}

// The stream's line from the core to Work's bar, swaying as it falls.
export function stream(l: Layout): { d: string; at: (y: number) => number } {
  const at = (y: number): number => {
    const free = Math.max(0, y - l.source), near = Math.min(1, (l.work - y) / 90);
    return CX + 26 * Math.sin(free / 70) * Math.min(1, free / 60) * Math.max(0, near);
  };
  const pts: string[] = [];
  for (let y = l.source; y <= l.work; y += 8) pts.push(`${pts.length ? 'L' : 'M'} ${at(y).toFixed(1)} ${y.toFixed(1)}`);
  pts.push(`L ${CX} ${l.work}`);
  return { d: pts.join(' '), at };
}
