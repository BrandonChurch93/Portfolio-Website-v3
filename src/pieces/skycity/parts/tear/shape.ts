import { slice } from '../../../../world/build';
import { EDGE, HEART, PLANET, TEAR, VENTS, lift } from '../../layout';

// The form of the torn underside before it is broken into blocks: one surface from the torn edge down to the hollow
// round the core, and the hollow itself. Each bearing has a profile that runs from the edge inward across the
// spheres round the planet's middle, one sphere to a point, so the surface can never fold through itself. On it, how
// deep a point lies in the planet is how far in from its surface it is (675 less its distance from the middle), and
// the beds are laid by that, so they are the planet's own shells round its core, seen in section.

export const D2R = Math.PI / 180;
export const R = PLANET.r;
export const HY = HEART[1];
export const RH = TEAR.hollow;

const lat = (i: number, n: number, seed: number): number => {
  const k = ((i % n) + n) % n, s = Math.sin(k * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
// A smooth wander round the circle, -1 to 1, n swells to the turn.
export function wander(deg: number, n: number, seed: number): number {
  const f = ((((deg % 360) + 360) % 360) / 360) * n, i = Math.floor(f), t = f - i, u = t * t * (3 - 2 * t);
  return (lat(i, n, seed) * (1 - u) + lat(i + 1, n, seed) * u) * 2 - 1;
}
export const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// The torn edge at a bearing, in the frame: how far out from the planet's upright, how high, and how far from the
// core's middle.
export function edgeAt(deg: number): { rho: number; y: number; G: number } {
  const m = EDGE.at(deg), p = lift(m * Math.sin(deg * D2R), 0, m * Math.cos(deg * D2R)), rho = Math.hypot(p.x, p.z);
  return { rho, y: p.y, G: Math.hypot(rho, p.y - HY) };
}

// The opening toward the visitor that the core is seen through: no rock lower than the lip within this far of the
// page's center line, on the near side of the core, widening toward the front.
export const MOUTH = { half: 160, flare: 0.36, from: 330, soft: 22 } as const;
const mouthHalf = (z: number): number => MOUTH.half + MOUTH.flare * Math.max(0, z - MOUTH.from);

// The two great masses that hang lowest, either side of the core: where they are on the plan and how much lower than
// the rest of the underside each comes.
const JAWS = [
  { x: -236, z: 252, rx: 38, rz: 96, deep: 120 },
  { x: -282, z: 150, rx: 30, rz: 70, deep: 70 },
  { x: 262, z: 196, rx: 62, rz: 128, deep: 92 },
];
// How far over each vent the underside comes before the rock that hangs to the vent's tip begins.
export const HANG = [30, 27, 34, 31, 26, 29];

interface Bearing { deg: number; e: { rho: number; y: number; G: number }; lip: number; low: number; rim: number }
function bearing(deg: number): Bearing {
  const e = edgeAt(deg), a = Math.abs(((deg + 540) % 360) - 180), back = smooth(105, 140, a);
  // Where the edge is bitten deep, the break goes deep under it: a scoop torn out of the side of the world. Over the
  // opening the lip is thin: the edge itself already hides the top of the core.
  const scoop = Math.max(0, (EDGE.out - EDGE.at(deg)) / EDGE.bite - 0.25) / 0.75;
  const lip = ((26 + 9 * wander(deg, 23, 1) + 5 * wander(deg, 61, 2) + 55 * scoop * scoop) * (1 - back) + 18 * back) * (0.38 + 0.62 * smooth(9, 24, a));
  const low = HY + (-14 + 16 * wander(deg, 11, 3) + 9 * wander(deg, 37, 4)) * (1 - back) + 27 * back;
  const rim = HY - 17 * (1 - back) + 7 * back;
  return { deg, e, lip, low, rim };
}

// The height of the underside at a bearing, on the sphere this far from the planet's middle.
function heightOn(b: Bearing, G: number): number {
  const s = Math.sin(b.deg * D2R), c = Math.cos(b.deg * D2R), h0 = b.e.y - HY;
  // The lip: the face just under the edge falls this far over this much depth, so that it goes back under the edge
  // and never stands out past it.
  const lipT = Math.max(4, (1.3 * b.lip * Math.max(h0, 0)) / b.e.G + 2.5);
  const top = b.e.G - lipT;
  const under = b.e.y - b.lip;
  let y: number;
  if (G >= top) y = b.e.y - b.lip * smooth(0, 1, (b.e.G - G) / lipT);
  else {
    const t = (top - G) / (top - RH), tl = 0.72;
    y = t < tl ? under + (b.low - under) * Math.pow(t / tl, 0.95) : b.low + (b.rim - b.low) * smooth(tl, 1, t);
    const at = (yy: number) => { const r = Math.sqrt(Math.max(0, G * G - (yy - HY) ** 2)); return [r * s, r * c] as const; };
    let [x, z] = at(y);
    const bw = smooth(0.12, 0.45, t);
    for (const j of JAWS) y -= j.deep * bw * Math.exp(-(((x - j.x) / j.rx) ** 2) - (((z - j.z) / j.rz) ** 2));
    VENTS.forEach((v, i) => {
      const yt = v[1] + HANG[i], rv = Math.hypot(v[0], v[2]), dv = Math.atan2(v[0], v[2]) / D2R;
      const Gc = Math.hypot(rv, yt - HY), dd = ((b.deg - dv + 540) % 360) - 180;
      const w = Math.exp(-(((dd * D2R * rv) / 30) ** 2) - (((G - Gc) / 30) ** 2));
      if (w > 1e-3) y += (yt - y) * w;
    });
    [x, z] = at(y);
    // Behind each vent, in its column as the visitor sees it, the underside stays over the vent's tip, so the light
    // falls from the lowest rock there.
    for (const v of VENTS) {
      const w = Math.exp(-(((x - v[0]) / 16) ** 2)) * smooth(v[2] + 10, v[2] - 30, z);
      const lim = v[1] + 20 + 0.08 * (v[2] - z);
      if (w > 1e-3 && y < lim) y += (lim - y) * w;
    }
    const m = (1 - smooth(mouthHalf(z), mouthHalf(z) + MOUTH.soft, Math.abs(x))) * smooth(-40, 10, z);
    // The roof of the opening is broken too: it sags and lifts in slabs, never a level plane.
    const roof = under - 6 - 7 * (0.5 + 0.5 * wander(b.deg * 7, 13, 41)) - 5 * Math.sin(G * 0.09 + b.deg * 0.4);
    y += (roof - y) * m;
  }
  const lim = 0.985 * G;
  return Math.min(HY + lim, Math.max(HY - lim, y));
}

// The profile of every bearing, sampled: the bearings round the circle (closer together at the front, which is what
// is seen, and at every corner of the torn edge), and down each, its points from the edge to the hollow.
export interface Table {
  degs: Float64Array;
  // For each bearing, its samples: x, y, z of the point, and its depth coordinate q (see below).
  pts: Float32Array[];
  // How far down each bearing the rows start, in q, and where it ends at the hollow.
  end: Float32Array;
}
// How deep a point lies in the planet: how far under its surface, along the planet's own shells, which are spheres
// about the middle of the sphere its surface is curved to, far under the core. The beds are laid by it, so in the
// break they are the planet's shells, curving with it.
export const depth = (x: number, y: number, z: number): number => R - Math.hypot(x, y + R, z);
// The depth coordinate down a bearing: how much deeper the profile has gone, counting every step down and never a
// step back up, so it only grows. It is the depth itself wherever the break only goes deeper as it goes in, which is
// all of it that is seen.
export const TOP = { soil: 10 } as const;

// How far in from the edge each sample of a bearing is, toward the core: close together under the edge, where the
// lip falls a long way over a little depth.
const STEPS = (() => {
  const g: number[] = [];
  for (let k = 0; k < 18; k += 0.25) g.push(k);
  for (let k = 18; k < 470; k += 1.5) g.push(k);
  return g;
})();

export async function table(): Promise<Table> {
  const set = new Set<number>();
  for (let d = -180; d < 180; d += Math.abs(d) <= 128 ? 0.25 : 1.5) set.add(Math.round(d * 1000) / 1000);
  for (const n of [7, 19, 53]) for (let i = 0; i < n; i++) { let d = (i * 360) / n; if (d >= 180) d -= 360; set.add(Math.round(d * 1000) / 1000); }
  const degs = Float64Array.from([...set].sort((a, b) => a - b));
  const pts: Float32Array[] = [], end = new Float32Array(degs.length);
  for (let i = 0; i < degs.length; i++) {
    const b = bearing(degs[i]), s = Math.sin(degs[i] * D2R), c = Math.cos(degs[i] * D2R);
    const out = new Float32Array(STEPS.length * 4), span = b.e.G - RH;
    let q = 0, last = 0;
    for (let j = 0; j < STEPS.length; j++) {
      const k = STEPS[j], G = j === STEPS.length - 1 ? RH : Math.max(RH, b.e.G - (k < 18 ? k : 18 + ((k - 18) * (span - 18)) / (470 - 18)));
      const y = j === 0 ? b.e.y : heightOn(b, G), r = j === 0 ? b.e.rho : Math.sqrt(Math.max(0, G * G - (y - HY) ** 2));
      const x = r * s, z = r * c;
      const dp = Math.max(0, depth(x, y, z));
      if (j > 0) q += Math.max(1e-3, Math.abs(dp - last));
      last = dp;
      out[j * 4] = x; out[j * 4 + 1] = y; out[j * 4 + 2] = z; out[j * 4 + 3] = q;
    }
    pts.push(out);
    end[i] = out[(STEPS.length - 1) * 4 + 3];
    if (i % 24 === 0) await slice();
  }
  return { degs, pts, end };
}

// A point of the surface at a bearing and a depth coordinate, between the sampled bearings.
function along(p: Float32Array, q: number, out: number[], k: number): void {
  const n = p.length / 4;
  if (q <= p[3]) { out[k] = p[0]; out[k + 1] = p[1]; out[k + 2] = p[2]; return; }
  let lo = 0, hi = n - 1;
  if (q >= p[hi * 4 + 3]) { out[k] = p[hi * 4]; out[k + 1] = p[hi * 4 + 1]; out[k + 2] = p[hi * 4 + 2]; return; }
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m * 4 + 3] <= q) lo = m; else hi = m; }
  const q0 = p[lo * 4 + 3], q1 = p[hi * 4 + 3], t = q1 > q0 ? (q - q0) / (q1 - q0) : 0;
  for (let a = 0; a < 3; a++) out[k + a] = p[lo * 4 + a] + (p[hi * 4 + a] - p[lo * 4 + a]) * t;
}
const scratch = [0, 0, 0, 0, 0, 0];
// The index of the sampled bearing at or before a bearing.
export function index(T: Table, deg: number): number {
  const d = ((((deg + 180) % 360) + 360) % 360) - 180, a = T.degs;
  let lo = 0, hi = a.length - 1;
  if (d < a[0]) return a.length - 1;
  if (d >= a[hi]) return hi;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m] <= d) lo = m; else hi = m; }
  return lo;
}
export function point(T: Table, deg: number, q: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const n = T.degs.length, i = index(T, deg), j = (i + 1) % n;
  const d = ((((deg + 180) % 360) + 360) % 360) - 180;
  const span = ((T.degs[j] - T.degs[i] + 360) % 360) || 360, t = Math.min(1, Math.max(0, (((d - T.degs[i]) + 360) % 360) / span));
  along(T.pts[i], q, scratch, 0);
  along(T.pts[j], q, scratch, 3);
  for (let a = 0; a < 3; a++) out[a] = scratch[a] + (scratch[a + 3] - scratch[a]) * t;
  return out;
}
// How deep the hollow begins at a bearing.
export function endAt(T: Table, deg: number): number {
  const i = index(T, deg), j = (i + 1) % T.degs.length;
  return Math.min(T.end[i], T.end[j]);
}
// The surface's outward direction at a point (into the air), from its neighbours.
export function normal(T: Table, deg: number, q: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const a = point(T, deg + 0.3, q), b = point(T, deg - 0.3, q), c = point(T, deg, Math.max(0, q - 1.2)), d = point(T, deg, q + 1.2);
  const ux = a[0] - b[0], uy = a[1] - b[1], uz = a[2] - b[2];
  const vx = c[0] - d[0], vy = c[1] - d[1], vz = c[2] - d[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1;
  nx /= l; ny /= l; nz /= l;
  out[0] = nx; out[1] = ny; out[2] = nz;
  return out;
}
