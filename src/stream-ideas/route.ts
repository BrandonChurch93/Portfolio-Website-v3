// The one route all three ideas follow, so they can be compared: down from the top, onto a title, round both of its
// ends, and on. The left branch lands on a card, runs along its top and falls off its end.
// Units: the panel is 1 high, y up, with its center at 0, 0.

export const ASPECT = 5 / 8;
export const TITLE = { x: 0, y: 0.17, hw: 0.11, hh: 0.022 };
export const CARD = { x: -0.13, y: -0.2, hw: 0.12, hh: 0.085 };
export const SAMPLES = 96;

// x, y, half width of the stream there
export type Point = [number, number, number];

const RIGHT: Point[] = [
  [0.009, 0.56, 0.011], [0.011, 0.4, 0.011], [0.011, 0.28, 0.011], [0.014, 0.215, 0.011], [0.05, 0.2035, 0.009],
  [0.1, 0.2025, 0.008], [0.126, 0.19, 0.009], [0.132, 0.16, 0.01], [0.133, 0.05, 0.01], [0.134, -0.2, 0.009], [0.135, -0.56, 0.008],
];

const LEFT: Point[] = [
  [-0.009, 0.56, 0.011], [-0.011, 0.4, 0.011], [-0.011, 0.28, 0.011], [-0.014, 0.215, 0.011], [-0.05, 0.2035, 0.009],
  [-0.1, 0.2025, 0.008], [-0.126, 0.19, 0.009], [-0.132, 0.16, 0.01], [-0.133, 0.02, 0.01], [-0.133, -0.085, 0.01],
  [-0.128, -0.104, 0.009], [-0.09, -0.1065, 0.008], [-0.04, -0.1065, 0.008], [-0.012, -0.11, 0.008], [0, -0.125, 0.009],
  [0.003, -0.16, 0.009], [0.004, -0.3, 0.009], [0.005, -0.56, 0.008],
];

export interface Branch { x: Float32Array; y: Float32Array; nx: Float32Array; ny: Float32Array; w: Float32Array }

// A smooth curve through the points, cut into places evenly spaced along its length, each with the direction across
// the stream there.
export function branch(points: Point[], samples = SAMPLES): Branch {
  const fine: Point[] = [];
  const at = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < 20; k++) {
      const t = k / 20;
      const cr = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
      fine.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1]), p1[2] + (p2[2] - p1[2]) * t]);
    }
  }
  fine.push(points[points.length - 1]);
  const along = [0];
  for (let i = 1; i < fine.length; i++) along.push(along[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
  const total = along[along.length - 1];
  const out: Branch = { x: new Float32Array(samples), y: new Float32Array(samples), nx: new Float32Array(samples), ny: new Float32Array(samples), w: new Float32Array(samples) };
  let j = 0;
  for (let i = 0; i < samples; i++) {
    const want = (i / (samples - 1)) * total;
    while (j < fine.length - 2 && along[j + 1] < want) j++;
    const f = (want - along[j]) / Math.max(along[j + 1] - along[j], 1e-9);
    const a = fine[j], b = fine[j + 1];
    out.x[i] = a[0] + (b[0] - a[0]) * f;
    out.y[i] = a[1] + (b[1] - a[1]) * f;
    out.w[i] = a[2] + (b[2] - a[2]) * f;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    out.nx[i] = (b[1] - a[1]) / len;
    out.ny[i] = -(b[0] - a[0]) / len;
  }
  return out;
}

export const BRANCHES = [branch(LEFT), branch(RIGHT)];

// A point on a branch: how far along it (0 to 1) and how far across it (-1 to 1 spans the stream).
export function place(b: Branch, s: number, across: number): [number, number] {
  const f = Math.max(0, Math.min(1, s)) * (SAMPLES - 1);
  const i = Math.min(SAMPLES - 2, Math.floor(f)), t = f - i;
  const mix = (a: Float32Array) => a[i] + (a[i + 1] - a[i]) * t;
  const w = mix(b.w) * across;
  return [mix(b.x) + mix(b.nx) * w, mix(b.y) + mix(b.ny) * w];
}

// Nothing rests inside the title or the card: a point that would is moved out through the nearer of its top and its side.
export function clear(x: number, y: number): [number, number] {
  for (const b of [TITLE, CARD]) {
    const side = b.hw + 0.0015 - Math.abs(x - b.x), top = b.y + b.hh + 0.0015 - y;
    if (side > 0 && top > 0 && y > b.y - b.hh) return side < top ? [b.x + Math.sign(x - b.x) * (b.hw + 0.0015), y] : [x, y + top];
  }
  return [x, y];
}

// Repeatable random numbers, so the study looks the same on every load.
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
