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
