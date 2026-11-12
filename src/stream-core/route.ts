import { CARD, TITLE, branch, type Branch, type Point } from '../stream-ideas/route';

// The route for a core of light: one line down to the middle of the title, where it parts and runs both ways along
// the title's top. The left side lands on the card, runs along it and falls off its end. Distances are in panel heights.

const FINE = 320;
const TOP = TITLE.y + TITLE.hh + 0.007;
const SHELF = CARD.y + CARD.hh + 0.007;

const LEFT: Point[] = [
  [0, 0.56, 0], [0, 0.4, 0], [0, 0.28, 0], [-0.003, 0.224, 0], [-0.03, TOP + 0.0015, 0], [-0.09, TOP, 0], [-0.118, 0.19, 0],
  [-0.126, 0.16, 0], [-0.127, 0.02, 0], [-0.127, -0.08, 0], [-0.122, SHELF + 0.0065, 0], [-0.09, SHELF, 0], [-0.04, SHELF, 0],
  [-0.012, SHELF - 0.003, 0], [0, -0.127, 0], [0.003, -0.16, 0], [0.004, -0.3, 0], [0.005, -0.56, 0],
];

const RIGHT: Point[] = [
  [0, 0.56, 0], [0, 0.4, 0], [0, 0.28, 0], [0.003, 0.224, 0], [0.03, TOP + 0.0015, 0], [0.09, TOP, 0], [0.118, 0.19, 0],
  [0.126, 0.16, 0], [0.127, 0.05, 0], [0.128, -0.2, 0], [0.129, -0.56, 0],
];

export interface Route { b: Branch; len: number }

function route(points: Point[]): Route {
  const b = branch(points, FINE);
  let len = 0;
  for (let i = 1; i < FINE; i++) len += Math.hypot(b.x[i] - b.x[i - 1], b.y[i] - b.y[i - 1]);
  return { b, len };
}

export const ROUTE = [route(LEFT), route(RIGHT)];

// The place on a route this far along it: x, y, and the direction across the stream there.
export function at(r: Route, dist: number, out: Float32Array): void {
  const n = r.b.x.length - 1;
  const f = Math.max(0, Math.min(1, dist / r.len)) * n;
  const i = Math.min(n - 1, Math.floor(f)), t = f - i;
  out[0] = r.b.x[i] + (r.b.x[i + 1] - r.b.x[i]) * t;
  out[1] = r.b.y[i] + (r.b.y[i + 1] - r.b.y[i]) * t;
  out[2] = r.b.nx[i] + (r.b.nx[i + 1] - r.b.nx[i]) * t;
  out[3] = r.b.ny[i] + (r.b.ny[i + 1] - r.b.ny[i]) * t;
}

function first(r: Route, test: (x: number, y: number) => boolean): number {
  const n = r.b.x.length;
  for (let i = 0; i < n; i++) if (test(r.b.x[i], r.b.y[i])) return (i / (n - 1)) * r.len;
  return r.len;
}

// How far along the two sides part on the title, and how far along the left side meets the card.
export const SPLIT = first(ROUTE[0], (x) => Math.abs(x) > 0.002);
export const LAND = first(ROUTE[0], (x, y) => y < SHELF + 0.004);
export const STRIKE = { x: 0, y: TOP + 0.004 };
export const LANDING = { x: -0.121, y: SHELF + 0.001 };
