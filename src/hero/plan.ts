// The hero as a wireframe, at /lab/hero-draft: where everything stands, on a board 1460 units wide. The screen's
// height is part of the plan: the words are set from the top of the screen and the city from its foot.

export const W = 1460;
export const CX = W / 2;

// The city's own outline: 1320 wide, its spire's tip at y = 0, the rim of the ground it stands on at y = RIM, and
// the rock under it down to TALL.
export const CITY = { w: 1320, x: (W - 1320) / 2, rim: 420, sag: 46, tall: 640, spire: 22 } as const;
// How much of the words' block there is, how far under it the spire's tip may come, and how far under the foot of
// the screen the rim rests, so the falls are hidden until the page is scrolled.
export const WORDS = { tall: 330, least: 90, third: 0.33, rise: 146, gap: 28 } as const;
export const HIDE = 40;
// The falls off the rim, across from the city's middle, and the main one under the spire.
export const FALLS = [-520, -360, -180, 180, 360, 520] as const;
// Where the stream's leading end is read on the screen, as everywhere else on the site.
export const READ = 0.66;
// Work, under the city: how far under the rock its title's bar is, and how much page follows.
export const WORK = { under: 330, bar: 360, tail: 300 } as const;
// The opening, in seconds: the city draws itself whole on the screen, then moves down, then the words come in.
// The words wait until the city has come to rest: it is never behind them.
export const OPEN = { draw: 2.4, move: [2.4, 3.8], words: [3.8, 4.6], end: 4.6 } as const;

const hash = (i: number): number => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// How far down the front of the rim is at a place across the city.
export const rimAt = (x: number): number => {
  const k = Math.min(1, Math.abs(x - CITY.w / 2) / (CITY.w / 2));
  return CITY.rim + CITY.sag * Math.sqrt(1 - k * k);
};

export type Tower = { x: number; w: number; top: number; foot: number };

export function towers(): Tower[] {
  const out: Tower[] = [];
  for (let i = -15; i <= 15; i++) {
    if (i === 0) continue;
    const w = 24 + hash(i) * 14, x = CITY.w / 2 + i * 40 - w / 2 + (hash(i + 40) - 0.5) * 10;
    const tall = 78 + 240 * Math.exp(-((i / 7.5) ** 2)) * (0.55 + 0.45 * hash(i + 90));
    const foot = CITY.rim - 6 + hash(i + 7) * 22;
    const r = (v: number) => Math.round(v * 10) / 10;
    out.push({ x: r(x), w: r(w), top: r(foot - tall), foot: r(foot) });
  }
  return out;
}

// The rock under the city, from one end of the rim down to a point under the spire and back up.
export function rock(): string {
  const pts: string[] = [`M 0 ${CITY.rim}`];
  const n = 14;
  for (let i = 1; i < n; i++) {
    const k = i / n, x = k * CITY.w, d = 1 - Math.abs(k - 0.5) * 2;
    const y = CITY.rim + CITY.sag + (CITY.tall - CITY.rim - CITY.sag) * d ** 1.35 * (0.86 + 0.14 * hash(i + 3));
    pts.push(`L ${x.toFixed(1)} ${(i === n / 2 ? CITY.tall : y).toFixed(1)}`);
  }
  pts.push(`L ${CITY.w} ${CITY.rim}`);
  return pts.join(' ');
}

// The night sky: how many stars are tried, the clear ground kept round the words, and how far the city's glow
// reaches, which is also where it puts the stars out.
export const SKY = { tries: 900, clear: { rx: 560, ry: 250 }, glow: { rx: 800, ry: 560, lift: 30 } } as const;

export type Star = { x: number; y: number; r: number; o: number; big: boolean };
// A moon in one upper corner and a faint band of far stars across the other, as shares of the board's width.
export const MOON = { x: 1296, y: 132, r: 46 } as const;
export const BAND = { x: 210, y: 150, rx: 420, ry: 54, turn: -24 } as const;

// Stars at the top, in the corners and down the sides, none behind the words, fewer and fainter toward the city.
export function stars(l: { words: number; city: number }): Star[] {
  const out: Star[] = [], foot = l.city + CITY.rim, wy = l.words + WORDS.tall / 2, gy = foot - SKY.glow.lift;
  for (let i = 0; i < SKY.tries; i++) {
    const x = hash(i * 3 + 1) * W, y = hash(i * 3 + 2) * foot;
    const top = 1 - Math.min(1, y / (foot * 0.42)), side = Math.abs(x - CX) / CX;
    const edge = Math.max(top, side ** 2.2);
    const inWords = ((x - CX) / SKY.clear.rx) ** 2 + ((y - wy) / SKY.clear.ry) ** 2;
    const lit = Math.max(0, 1 - Math.hypot((x - CX) / SKY.glow.rx, (y - gy) / SKY.glow.ry));
    const keep = edge * Math.min(1, Math.max(0, inWords - 1) * 1.6) * (1 - lit) ** 1.5;
    if (hash(i * 3 + 3) > keep * 0.62) continue;
    const big = hash(i + 500) > 0.93;
    out.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, r: big ? 1.7 : 0.6 + Math.round(hash(i + 700) * 6) / 10, big, o: Math.round((0.25 + 0.6 * hash(i + 900)) * (big ? 1 : 0.8) * 100) / 100 });
  }
  return out;
}

export type Layout = {
  words: number; city: number; build: number; start: number; tip: number; work: number; h: number; fold: number;
};

// Everything's place down the page for a screen so many units tall.
export function layout(hh: number): Layout {
  const words = Math.max(WORDS.least, WORDS.third * hh - WORDS.rise);
  const city = Math.max(words + WORDS.tall + WORDS.gap, hh + HIDE - CITY.rim);
  const build = Math.max(20, (hh - CITY.tall) / 2);
  const start = city + rimAt(CITY.w / 2), tip = city + CITY.tall, work = tip + WORK.under;
  return { words, city, build, start, tip, work, h: work + WORK.tail, fold: hh };
}

// The stream's line from the main fall to Work's bar: down the front of the rock, then swaying as it falls.
export function stream(l: Layout): { d: string; at: (y: number) => number } {
  const at = (y: number): number => {
    const free = Math.max(0, y - l.tip), near = Math.min(1, (l.work - y) / 90);
    return CX + 26 * Math.sin(free / 70) * Math.min(1, free / 60) * Math.max(0, near);
  };
  const pts: string[] = [];
  for (let y = l.start; y <= l.work; y += 8) pts.push(`${pts.length ? 'L' : 'M'} ${at(y).toFixed(1)} ${y.toFixed(1)}`);
  pts.push(`L ${CX} ${l.work}`);
  return { d: pts.join(' '), at };
}
