import { seeded } from '../../../../world/build';
import { D2R, FOREST, SOW, TORN, UNDER, bearingOf, crestAt, edgeAt, inTemple, onRoad, toEdge, tornAt, upMountain } from './plan';
import { TINTS, type TreeKind } from './trees';

// The jungle sown on the map. The canopy first: a chance of a tree in every cell of a grid, jittered in it, so
// dense in the stands that the crowns touch, with emergents and now and then a giant standing over it, a few trees
// in flame among the copper and ember. On the mountains it thins as it climbs, turns to dark conifers, and leaves the
// tops bare but for a few trees clinging to ledges. Then what grows under and at the edges, where it is seen: palms,
// undergrowth, vines hanging from the crowns. Fallen giants, snags and boulders. At the broken margin trees lean out,
// fall, or are gone. A path of lanterns runs out from the temple into the jungle, to a camp.

export interface Thing { kind: TreeKind; x: number; z: number; up: number; turn: number; tilt: number; s: [number, number, number]; tint: number; bark: number; glow: number }

const hash = (i: number, j: number, k: number) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (t: number) => t * t * (3 - 2 * t);
// A value noise on the map, 0 to 1, with its features this many units apart.
function noise(x: number, z: number, size: number, seed: number): number {
  const u = x / size, v = z / size, i = Math.floor(u), j = Math.floor(v), fu = smooth(u - i), fv = smooth(v - j);
  const a = hash(i, j, seed), b = hash(i + 1, j, seed), c = hash(i, j + 1, seed), d = hash(i + 1, j + 1, seed);
  return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
}
const ramp = (a: number, b: number, x: number) => smooth(Math.min(1, Math.max(0, (x - a) / (b - a))));
const pick = <T>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];

// The height each kind is built to, in units: a thing's scale is its height over this.
const NOMINAL: Partial<Record<TreeKind, number>> = { fir: 22, spruce: 18, pine: 18, canopy: 12.5, aspen: 17, snag: 14, giant: 44, palm: 10 };
// The canopy's heights, in units: most of it large, so a single tree is a thing a visitor can see.
const TALL = { low: 14, high: 26 };
// The giants' heights, in units, far over the canopy.
const GIANT = { low: 35, high: 45 };
// How much wider than its kind's own a crown grows, from and to.
const SPREAD: Partial<Record<TreeKind, [number, number]>> = { canopy: [1.25, 1.6], aspen: [1.2, 1.45], fir: [1.0, 1.2], spruce: [1.0, 1.25], pine: [1.15, 1.45] };
// The path of lanterns: from the temple's outer edge, out along this bearing, so many, this far apart, and the
// camp it leads to.
const PATH = { bearing: 276, from: 478, n: 9, apart: 11 };

const inForest = (deg: number) => deg >= FOREST.from && deg <= FOREST.to;

export function sow(): Thing[] {
  const r = seeded(60421), out: Thing[] = [];

  // The lanterns first, so the trees near them know their light.
  const lamps: [number, number][] = [];
  for (let i = 0; i < PATH.n; i++) {
    const rr = PATH.from + i * PATH.apart, deg = PATH.bearing + Math.sin(i * 0.9) * 2.2 + (i % 2 ? 0.9 : -0.9);
    lamps.push([Math.sin(deg * D2R) * rr, Math.cos(deg * D2R) * rr]);
  }
  const campR = PATH.from + PATH.n * PATH.apart + 6, camp = [Math.sin((PATH.bearing + 3) * D2R) * campR, Math.cos((PATH.bearing + 3) * D2R) * campR];
  for (let i = 0; i < 3; i++) lamps.push([camp[0] + Math.sin(i * 2.1) * 3.5, camp[1] + Math.cos(i * 2.1) * 3.5]);
  for (const [x, z] of lamps) out.push({ kind: 'lamp', x, z, up: 0, turn: 0, tilt: 0, s: [1.4, 1.4, 1.4], tint: 0, bark: 0.1, glow: 0 });
  const lit = (x: number, z: number) => Math.max(0, ...lamps.map(([lx, lz]) => Math.exp(-Math.hypot(x - lx, z - lz) / 9)));
  const clear = (x: number, z: number) => onRoad(x, z) || inTemple(x, z) || lamps.some(([lx, lz]) => Math.hypot(x - lx, z - lz) < 3.5) || Math.hypot(x - camp[0], z - camp[1]) < 9;

  // The canopy.
  const far = Math.max(...Array.from({ length: 13 }, (_, i) => { const d = FOREST.from + ((FOREST.to - FOREST.from) * i) / 12; return edgeAt(Math.sin(d * D2R), Math.cos(d * D2R)); }));
  for (let rad = FOREST.r0; rad < far; rad += SOW) {
    const n = Math.ceil(((FOREST.to - FOREST.from) * D2R * rad) / SOW);
    for (let i = 0; i < n; i++) {
      const deg = FOREST.from + ((i + r()) / n) * (FOREST.to - FOREST.from), rr = rad + r() * SOW;
      const x = Math.sin(deg * D2R) * rr, z = Math.cos(deg * D2R) * rr;
      if (rr > edgeAt(x, z) - TORN.gone || clear(x, z)) continue;
      const up = upMountain(x, z), crest = crestAt(x, z), torn = tornAt(x, z);
      const stand = noise(x, z, 80, 1) * 0.7 + noise(x, z, 27, 2) * 0.3;
      // Dense nearly everywhere, with a few glades; thinning up the mountains and bare at their tops.
      const glade = ramp(0.14, 0.28, stand);
      const climb = up < 0.45 ? 1 : up < 0.72 ? 1 - ramp(0.45, 0.72, up) * 0.75 : 0.06;
      // Trees grow in clumps with gaps between, never evenly spaced.
      const clumped = 0.55 + 0.45 * ramp(0.28, 0.6, noise(x, z, 15, 6));
      const dens = clumped * (0.1 + 0.9 * glade) * climb * (1 - 0.2 * crest) * (1 - 0.5 * torn);
      if (r() > dens) {
        if (up > 0.5 && r() < 0.08) out.push(rock(r, x, z, up));
        else if (r() < 0.02 + 0.15 * torn) out.push(rock(r, x, z, 0.3));
        continue;
      }
      if (torn > 0 && r() < torn * TORN.down) { out.push(log(r, x, z, deg, 1.2)); continue; }
      // A giant now and then, standing over the canopy where it is seen in outline.
      if (up < 0.35 && torn < 0.3 && noise(x, z, 37, 5) > 0.7 && r() < 0.22) {
        const k = (GIANT.low + (GIANT.high - GIANT.low) * r()) / (NOMINAL.giant ?? 44);
        out.push({ kind: 'giant', x, z, up: 0, turn: r() * Math.PI * 2, tilt: 0, s: [k, k, k], tint: pick(r, TINTS.giant), bark: 0.25, glow: lit(x, z) });
        continue;
      }
      let kind: TreeKind;
      if (r() < 0.02 + 0.05 * up + 0.2 * torn) kind = 'snag';
      else if (up > 0.38) kind = r() < 0.6 ? 'fir' : 'spruce';
      else if (noise(x, z, 46, 3) > 0.72 && r() < 0.6) kind = 'aspen';
      else if (r() < 0.16) kind = 'pine';
      else kind = 'canopy';
      const big = (1 - 0.6 * up) * (1 - 0.25 * crest);
      // Heights range hard: understory, canopy, and now and then an emergent over it.
      const emergent = r() < 0.08 ? 1.35 : 1;
      const height = (TALL.low * 0.8 + (TALL.high - TALL.low * 0.8) * big * (0.35 + 0.65 * r())) * emergent * (kind === 'canopy' ? 0.85 : 1) * (up > 0.6 ? 0.6 : 1);
      const sp = SPREAD[kind] ?? [0.95, 1.1], k = height / (NOMINAL[kind] ?? 16), wide = sp[0] + (sp[1] - sp[0]) * r();
      out.push({
        kind, x, z, up: 0, turn: kind === 'snag' || torn > 0 ? deg * D2R : r() * Math.PI * 2, tilt: torn * TORN.lean * (0.3 + 0.7 * r()) + (up > 0.6 ? 0.15 * r() : 0),
        s: [k * wide, k, k * wide], tint: pick(r, TINTS[kind]), bark: kind === 'snag' ? 0.55 : 0.08 + 0.12 * r(), glow: lit(x, z),
      });
      // Vines hang from the crowns at the jungle's edges, where they are seen.
      if ((kind === 'canopy' || kind === 'pine') && toEdge(x, z) < 26 && r() < 0.55) {
        const crownFoot = kind === 'canopy' ? 4.5 * k : 13 * k, n2 = 1 + Math.floor(r() * 3);
        for (let j = 0; j < n2; j++) {
          const a = r() * Math.PI * 2, d = 2 + 2.5 * k * r();
          out.push({ kind: 'vine', x: x + Math.sin(a) * d, z: z + Math.cos(a) * d, up: crownFoot + 1.5 * k, turn: a, tilt: 0, s: [2.5 + 3 * r(), crownFoot * (0.5 + 0.4 * r()), 2], tint: pick(r, TINTS.vine), bark: 0, glow: lit(x, z) });
        }
      }
    }
  }

  // Under the canopy and at its edges: palms and undergrowth, thickest where they are seen. Fallen giants.
  for (let rad = FOREST.r0; rad < far; rad += UNDER) {
    const n = Math.ceil(((FOREST.to - FOREST.from) * D2R * rad) / UNDER);
    for (let i = 0; i < n; i++) {
      const deg = FOREST.from + ((i + r()) / n) * (FOREST.to - FOREST.from), rr = rad + r() * UNDER;
      const x = Math.sin(deg * D2R) * rr, z = Math.cos(deg * D2R) * rr;
      if (!inForest(bearingOf(x, z)) || rr > edgeAt(x, z) - TORN.gone || clear(x, z)) continue;
      const up = upMountain(x, z);
      if (up > 0.5) continue;
      const seen = 1 - ramp(8, 40, toEdge(x, z));
      const roll = r();
      if (roll < 0.03 + 0.32 * seen) {
        const k = (0.8 + 0.5 * r()) * (1 - 0.3 * up);
        out.push({ kind: 'palm', x, z, up: 0, turn: r() * Math.PI * 2, tilt: (r() - 0.5) * 0.2, s: [k, k * (0.9 + 0.3 * r()), k], tint: pick(r, TINTS.palm), bark: 0.3, glow: lit(x, z) });
      } else if (roll < 0.15 + 0.4 * seen) out.push(shrub(r, x, z, lit(x, z)));
      else if (r() < 0.012) out.push(log(r, x, z, deg + 90 * r(), 1.6 + 0.6 * r()));
    }
  }
  return out;
}

function rock(r: () => number, x: number, z: number, up: number): Thing {
  const k = 0.8 + r() * (0.8 + up * 1.5);
  return { kind: 'boulder', x, z, up: 0, turn: r() * Math.PI * 2, tilt: 0, s: [k, k * (0.7 + 0.5 * r()), k], tint: 0, bark: 0, glow: 0 };
}
function shrub(r: () => number, x: number, z: number, glow: number): Thing {
  const k = 1.0 + 0.8 * r();
  return { kind: 'shrub', x, z, up: 0, turn: r() * Math.PI * 2, tilt: 0, s: [k, k * (0.8 + 0.5 * r()), k], tint: pick(r, TINTS.shrub), bark: 0, glow };
}
function log(r: () => number, x: number, z: number, deg: number, size: number): Thing {
  const k = size * (0.8 + 0.4 * r());
  return { kind: 'log', x, z, up: 0, turn: deg * D2R + (r() - 0.5) * 1.2, tilt: 0, s: [k, k, k], tint: 0, bark: 0.4, glow: 0 };
}
