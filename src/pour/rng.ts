// Seeded randomness for the pour: the same seed always gives the same pour.
export interface Rng {
  next(): number;
  range(a: number, b: number): number;
}

export function rng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, range: (a, b) => a + (b - a) * next() };
}

function hash(n: number, seed: number): number {
  let h = (Math.imul(n | 0, 0x27d4eb2d) ^ Math.imul(seed | 0, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// An even random number, 0 to 1, that is the same for the same pair of whole numbers.
export function cellRandom(a: number, b: number, seed: number): number {
  return hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663), seed);
}

// Smooth noise in one dimension, -1 to 1. Each channel is its own curve.
export function noise1(t: number, seed: number, channel: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(i, seed + channel * 7919);
  const b = hash(i + 1, seed + channel * 7919);
  return (a + (b - a) * u) * 2 - 1;
}

// Smooth noise in two dimensions, 0 to 1.
export function noise2(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number) => hash(a * 73856093 + b * 19349663, seed);
  const top = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * ux;
  const bot = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * ux;
  return top + (bot - top) * uy;
}
