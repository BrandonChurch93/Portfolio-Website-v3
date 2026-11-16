// One piece of what broke away, as a field for the surface maker (scripts/world/lib/surface.mjs): under 0 inside.
// A broken block of the planet's rock: a solid cut by a few broad planes, its corners broken off, chips taken out of
// its edges, and, where it is layered, each bed broken a little differently from the next.
// One face may be the planet's outer surface, gently curved and pitted.
//
//   args = { seed, size: [a, b, c], beds, layer: [x, y, z], sides, corners, chips, steps, skin: { dir, R, pits } | null, top }
//
// size is the half extents before anything is cut away, beds how many beds the rock is in along layer, sides how
// many breaks run round it, corners how many corners are broken off, chips how many flakes have come off its edges,
// steps how many faces drop part of the way across, and top that its upper face is left whole (a piece that carried
// the land). shape(args) gives the same solid to the make script, with where its skin is.
import { noise, seeded } from '../../../../src/pieces/world/layout.ts';

export const lip = 2;
let solid = null;

export async function setup(args) { solid = shape(args); }
export function field(x, y, z) { return solid.at(x, y, z); }

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

export function shape({ seed, size, beds = 1, layer = [0, 1, 0], sides = 6, corners = 6, chips = 4, steps = 1, skin = null, top = false }) {
  const r = seeded(seed), [a, b, c] = size, big = Math.max(a, b, c);
  const jitter = (v, k) => unit([v[0] + k * (r() - 0.5), v[1] + k * (r() - 0.5), v[2] + k * (r() - 0.5)]);
  const reach = (n) => Math.abs(n[0]) * a + Math.abs(n[1]) * b + Math.abs(n[2]) * c;

  // The broad faces: a top and a bottom, near the beds, and round the sides a few breaks at uneven angles, each
  // leaning its own way, which give an outline no box has. Then corners broken off by planes turned between them.
  const planes = [];
  for (const sgn of [1, -1]) {
    const flat = top && sgn === 1, n = flat ? [0, 1, 0] : jitter([0, sgn, 0], 0.5);
    planes.push({ n, h: b * (flat ? 1 : 0.84 + 0.16 * r()), side: false });
  }
  const turn0 = r() * Math.PI * 2;
  for (let i = 0; i < sides; i++) {
    const th = turn0 + ((i + 0.6 * (r() - 0.5)) / sides) * Math.PI * 2, lean = 0.7 * (r() - 0.5);
    const n = unit([Math.cos(th) / a, lean / b, Math.sin(th) / c]);
    planes.push({ n, h: reach(n) * (0.72 + 0.28 * r()), side: true });
  }
  for (let i = 0; i < corners; i++) {
    let n = unit([r() * 2 - 1, (r() * 2 - 1) * 1.1, r() * 2 - 1]);
    if (top && n[1] > 0.3) n = unit([n[0], -Math.abs(n[1]), n[2]]);
    planes.push({ n, h: reach(n) * (0.5 + 0.35 * r()), side: true });
  }

  // Beds: in each, some of the side breaks stand back from the bed under it, so a broken face steps from bed to bed
  // in places and runs on in others.
  const L = unit(layer), lo = -reach(L), hi = reach(L), cuts = [lo - 1];
  for (let k = 1; k < beds; k++) cuts.push(lo + ((hi - lo) * (k + 0.4 * (r() - 0.5))) / beds);
  cuts.push(hi + 1);
  const shift = cuts.slice(1).map(() => planes.map((p) => (p.side && r() < 0.45 ? -big * (0.025 + 0.07 * r()) : 0)));

  const body = (x, y, z, k) => {
    let d = -Infinity;
    for (let i = 0; i < planes.length; i++) { const p = planes[i]; d = Math.max(d, p.n[0] * x + p.n[1] * y + p.n[2] * z - p.h - shift[k][i]); }
    return d;
  };

  // The planet's outer surface on one side: a sphere far larger than the piece, a little way in along dir.
  let sphere = null;
  if (skin) {
    const d = unit(skin.dir), along = reach(d) * 0.78, R = skin.R * big;
    sphere = { at: [-d[0] * (R - along), -d[1] * (R - along), -d[2] * (R - along)], R, dir: d };
  }

  const pre = (x, y, z) => {
    let d = Infinity;
    for (let k = 0; k < beds; k++) {
      const s = L[0] * x + L[1] * y + L[2] * z;
      d = Math.min(d, Math.max(body(x, y, z, k), cuts[k] - s, s - cuts[k + 1]));
    }
    if (sphere) d = Math.max(d, Math.hypot(x - sphere.at[0], y - sphere.at[1], z - sphere.at[2]) - sphere.R);
    return d;
  };
  const onto = (dir) => {
    let inside = 0, out = 4 * big;
    for (let i = 0; i < 40; i++) { const m = (inside + out) / 2; if (pre(dir[0] * m, dir[1] * m, dir[2] * m) < 0) inside = m; else out = m; }
    return [dir[0] * inside, dir[1] * inside, dir[2] * inside];
  };
  // Scars where flakes came off an edge: a shallow bowl, the bite of a sphere set just outside the edge, with a sharp
  // rim where it meets the faces.
  const holes = [];
  // How near a place is to an edge: how far inside the second nearest of the solid's planes it is.
  const edgeness = (q) => {
    const ds = planes.map((p) => p.n[0] * q[0] + p.n[1] * q[1] + p.n[2] * q[2] - p.h).sort((x, y) => y - x);
    return -ds[1];
  };
  for (let i = 0; i < chips; i++) {
    let dir = null, at = null;
    for (let k = 0; k < 40; k++) {
      const d = unit([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]);
      if (top && d[1] > 0.2) continue;
      const q = onto(d);
      if (edgeness(q) < big * 0.05) { dir = d; at = q; break; }
    }
    if (!dir) continue;
    // A few large scars, and many small nicks along the edges.
    const large = i < chips / 4, R = big * (large ? 0.3 + 0.4 * r() : 0.025 + 0.06 * r()), out = R * (large ? 0.9 + 0.06 * r() : 0.8 + 0.12 * r());
    holes.push({ at: [at[0] + dir[0] * out, at[1] + dir[1] * out, at[2] + dir[2] * out], R });
  }
  // Steps across a face: a broken face that drops a little part of the way across it.
  const drops = [];
  for (let i = 0; i < steps; i++) {
    const face = planes[2 + Math.floor(r() * sides)], n2 = unit(cross(face.n, jitter([0, 1, 0], 2)));
    drops.push({ n1: face.n, h1: face.h - big * (0.03 + 0.07 * r()), n2, h2: reach(n2) * 0.5 * (r() - 0.5) });
  }
  // Pits in the outer surface, where it has one.
  const pits = [];
  if (sphere) for (let i = 0; i < (skin.pits ?? 0); i++) {
    const t = jitter(sphere.dir, 1.1), at = onto(t), rc = big * (0.1 + 0.16 * r()), up = rc * (0.8 + 0.1 * r());
    pits.push({ at: [at[0] + t[0] * up, at[1] + t[1] * up, at[2] + t[2] * up], r: rc });
  }

  // A broken face is never quite flat and an edge never ruler straight: a slow swell across every face, and a finer
  // one that wanders each edge a little.
  const wave = big * 0.009, grain = big * 0.32, fine = big * 0.0025, fineGrain = big * 0.085;
  const at = (x, y, z) => {
    let d = pre(x, y, z);
    // No groove between beds: one narrower than a pixel drew as a dashed line of light. A bed steps back instead.
    for (const h of holes) d = Math.max(d, h.R - Math.hypot(x - h.at[0], y - h.at[1], z - h.at[2]));
    for (const q of drops) d = Math.max(d, Math.min(q.n1[0] * x + q.n1[1] * y + q.n1[2] * z - q.h1, q.n2[0] * x + q.n2[1] * y + q.n2[2] * z - q.h2));
    for (const p of pits) d = Math.max(d, p.r - Math.hypot(x - p.at[0], y - p.at[1], z - p.at[2]));
    const u = noise(x / grain + 11, y / grain + 3, z / grain + 7, seed & 1023) + 0.5 * noise((2.3 * x) / grain, (2.3 * y) / grain, (2.3 * z) / grain, (seed + 1) & 1023);
    return d + wave * (u - 0.75) + fine * (noise(x / fineGrain, y / fineGrain, z / fineGrain, (seed + 2) & 1023) - 0.5);
  };
  const onSkin = (x, y, z) => (sphere ? Math.abs(Math.hypot(x - sphere.at[0], y - sphere.at[1], z - sphere.at[2]) - sphere.R) : Infinity);
  // How far along the layer a place is, as a share of the beds, which is how a bed's own tone is chosen.
  const bed = (x, y, z) => {
    const s = L[0] * x + L[1] * y + L[2] * z;
    let k = 0;
    while (k < beds - 1 && s > cuts[k + 1]) k++;
    return k;
  };
  // The space it fills, found by going out from its middle every way, with room to spare.
  const least = [Infinity, Infinity, Infinity], most = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 800; i++) {
    const u = (i + 0.5) / 800, th = Math.acos(1 - 2 * u), ph = i * 2.39996, q = onto([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]);
    for (let k = 0; k < 3; k++) { least[k] = Math.min(least[k], q[k]); most[k] = Math.max(most[k], q[k]); }
  }
  const spare = big * 0.08;
  return { at, onSkin, bed, box: [least.map((v) => v - spare), most.map((v) => v + spare)] };
}
