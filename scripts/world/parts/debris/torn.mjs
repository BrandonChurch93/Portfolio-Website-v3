// A great piece of what broke away, as a field for the surface maker (scripts/world/lib/surface.mjs): under 0 inside.
// Torn rock of the planet's kind, not a cut block: an uneven mass split into blocks along its own fractures, the way
// rock breaks. Each block is the part of the mass nearest one of a few points, measured flatter across the beds, so
// the blocks lie in uneven slabs. A block may be missing (a notch that cuts back in), stand out or sink a little
// from its neighbours (a stepped break, an overhang), or have opened from them (a dark crack wide enough to see). Each
// block's outer face is broken at its own depth. Flakes have come off its edges as shallow scooped scars with a sharp
// rim, small rubble clings in its hollows and on its ledges, and every face swells and wanders a little.
//
//   args = { seed, size: [a, b, c], layer: [x, y, z], blocks, drop, skin: { dir, R, pits } | null, top, rubble, scars }
//
// size is the half extents of the mass before anything is broken off it, layer the way across its beds, blocks how
// many blocks it splits into and drop how many of them are gone. shape(args) gives the same solid to the make
// script, with which block and which bed each place is in and where the planet's outer surface is.
import { noise, seeded } from '../../../../src/pieces/world/layout.ts';

export const lip = 1.6;
let solid = null;

export async function setup(args) { solid = shape(args); }
export function field(x, y, z) { return solid.at(x, y, z); }

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

// How the mass is broken, as shares of its largest half extent unless said.
export const TORN = {
  // How much flatter the blocks are across the beds than along them.
  flat: 1.9,
  // How far a block that has moved stands out or sinks, and how many have moved.
  shift: [0.012, 0.05], moved: 0.6,
  // An opened crack: how wide, in units, and the share of blocks that have one.
  crack: [1.3, 2.6], cracked: 0.3,
  // A block's outer face broken at its own depth: how deep, at most.
  face: 0.06,
  // Corners broken off each block: how many, and how deep.
  chips: 3, chip: [0.02, 0.07],
  // The scars: how wide, and how deep as a share of their width.
  scar: [0.09, 0.26], scoop: [0.1, 0.17],
  // The rubble: how large each piece is, and how far it is sunk into the rock as a share of its size.
  stone: [0.025, 0.07], sunk: 0.35,
  // How much every face swells and wanders, and over how far.
  swell: 0.009, swellOver: 0.3, ridge: 0.006, ridgeOver: 0.11, wander: 0.003, wanderOver: 0.05, grit: 0.0015, gritOver: 0.018,
};

export function shape({ seed, size, layer = [0, 1, 0], blocks = 7, drop = 1, skin = null, top = false, rubble = 12, scars = 10 }) {
  const r = seeded(seed), [a, b, c] = size, big = Math.max(a, b, c), T = TORN;
  const reach = (n) => Math.abs(n[0]) * a + Math.abs(n[1]) * b + Math.abs(n[2]) * c;
  const jitter = (v, k) => unit([v[0] + k * (r() - 0.5), v[1] + k * (r() - 0.5), v[2] + k * (r() - 0.5)]);
  const between = (lo, hi) => lo + (hi - lo) * r();

  // The mass: a main lobe and one or two smaller ones grown into it at a slant, each a top, a bottom, breaks round it
  // at uneven angles and corners off, so its outline cuts back in where they meet.
  const lobe = (k, at, turn, lean) => {
    const planes = [], ca = Math.cos(turn), sa = Math.sin(turn), rot = (v) => unit([v[0] * ca - v[2] * sa, v[1] + lean * v[0], v[0] * sa + v[2] * ca]);
    const A = a * k, B = b * (0.75 + 0.25 * k), C = c * k, rch = (n) => Math.abs(n[0]) * A + Math.abs(n[1]) * B + Math.abs(n[2]) * C;
    for (const sgn of [1, -1]) {
      const flat = top && sgn === 1, n = flat ? [0, 1, 0] : jitter([0, sgn, 0], 0.7);
      planes.push({ n, h: B * (flat ? 1 : 0.78 + 0.22 * r()) });
    }
    const sides = 8 + Math.floor(r() * 4), turn0 = r() * Math.PI * 2;
    for (let i = 0; i < sides; i++) {
      const th = turn0 + ((i + 0.8 * (r() - 0.5)) / sides) * Math.PI * 2, tilt = 1.1 * (r() - 0.5);
      const n = unit([Math.cos(th) / A, tilt / B, Math.sin(th) / C]);
      planes.push({ n, h: rch(n) * (0.66 + 0.34 * r()) });
    }
    for (let i = 0; i < 6; i++) {
      let n = unit([r() * 2 - 1, (r() * 2 - 1) * 1.1, r() * 2 - 1]);
      if (top && n[1] > 0.3) n = unit([n[0], -Math.abs(n[1]), n[2]]);
      planes.push({ n, h: rch(n) * (0.5 + 0.35 * r()) });
    }
    return { at, planes: planes.map((q) => { const n = rot(q.n); return { n, h: q.h + dot(n, at) }; }) };
  };
  const lobes = [lobe(1, [0, 0, 0], 0, 0)];
  for (let i = 0, n = 1 + Math.floor(r() * 2); i < n; i++) {
    const side = r() < 0.5 ? -1 : 1, k = 0.45 + 0.25 * r();
    lobes.push(lobe(k, [side * a * (1.05 - k) * (0.8 + 0.2 * r()), b * 0.3 * (r() - 0.5), c * (1 - k) * (r() - 0.5)], 0.9 * (r() - 0.5), 0.5 * (r() - 0.5)));
  }
  const inHull = (p) => {
    let best = Infinity;
    for (const l of lobes) { let d = -Infinity; for (const q of l.planes) d = Math.max(d, dot(q.n, p) - q.h); best = Math.min(best, d); }
    return best;
  };

  // The blocks: points inside the mass, and the planes half way between each two, measured flatter across the beds.
  const Ln = unit(layer), squash = (p) => { const s = dot(p, Ln) * (T.flat - 1); return [p[0] + Ln[0] * s, p[1] + Ln[1] * s, p[2] + Ln[2] * s]; };
  const seeds = [];
  for (let tries = 0; seeds.length < blocks && tries < 4000; tries++) {
    const p = [a * (r() * 2 - 1) * 0.95, b * (r() * 2 - 1) * 0.9, c * (r() * 2 - 1) * 0.9];
    if (inHull(p) > -big * 0.08) continue;
    if (seeds.some((q) => Math.hypot(...squash([p[0] - q[0], p[1] - q[1], p[2] - q[2]])) < big * 0.42)) continue;
    seeds.push(p);
  }
  const sq = seeds.map(squash);
  const cells = seeds.map((s, k) => {
    const planes = [];
    for (let j = 0; j < seeds.length; j++) {
      if (j === k) continue;
      // The plane between the two in the squashed space is a plane here too: its normal is the squash of theirs.
      const u = [sq[j][0] - sq[k][0], sq[j][1] - sq[k][1], sq[j][2] - sq[k][2]], m = [(sq[j][0] + sq[k][0]) / 2, (sq[j][1] + sq[k][1]) / 2, (sq[j][2] + sq[k][2]) / 2];
      const raw = squash(u), l = Math.hypot(...raw) || 1;
      planes.push({ n: [raw[0] / l, raw[1] / l, raw[2] / l], h: dot(u, m) / l });
    }
    return { seed: s, planes, own: [], shift: [0, 0, 0], gap: 0, gone: false };
  });
  // How far out of the mass a block reaches: its seed's nearness to the hull.
  const outer = cells.map((cl, k) => ({ k, d: inHull(cl.seed) })).sort((x, y) => y.d - x.d);
  for (let i = 0; i < Math.min(drop, cells.length - 3); i++) cells[outer[i].k].gone = true;
  for (const cl of cells) {
    const out = unit(cl.seed);
    if (r() < T.moved) {
      const k = big * between(T.shift[0], T.shift[1]) * (r() < 0.5 ? -1 : 1), d = jitter(out, 1.2);
      cl.shift = [d[0] * k, d[1] * k, d[2] * k];
    }
    if (r() < T.cracked) cl.gap = between(T.crack[0], T.crack[1]) / 2;
    // The block's own outer face, broken at its own depth and angle.
    for (let i = 0; i < 1 + Math.floor(r() * 2); i++) {
      let n = jitter(out, 1.4);
      if (top && n[1] > 0.3) n = unit([n[0], -Math.abs(n[1]), n[2]]);
      let lo = 0, hi = 4 * big;
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (inHull([cl.seed[0] + n[0] * m, cl.seed[1] + n[1] * m, cl.seed[2] + n[2] * m]) < 0) lo = m; else hi = m; }
      cl.own.push({ n, h: dot(n, cl.seed) + lo - big * (0.008 + T.face * r()) });
    }
  }
  // Each block's corners broken off: a few small planes, each just inside how far the block reaches that way.
  for (const cl of cells) for (let i = 0; i < T.chips; i++) {
    const n = unit([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]);
    let lo = 0, hi = 4 * big;
    const inside = (m) => { const p = [cl.seed[0] + n[0] * m, cl.seed[1] + n[1] * m, cl.seed[2] + n[2] * m]; let d = inHull(p); for (const q of cl.planes) d = Math.max(d, dot(q.n, p) - q.h); for (const q of cl.own) d = Math.max(d, dot(q.n, p) - q.h); return d < 0; };
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (inside(m)) lo = m; else hi = m; }
    cl.own.push({ n, h: dot(n, cl.seed) + lo - big * between(T.chip[0], T.chip[1]) });
  }
  const kept = cells.filter((cl) => !cl.gone);

  // The planet's outer surface on one side: a sphere far larger than the piece, a little way in along dir.
  let sphere = null;
  if (skin) {
    const d = unit(skin.dir), along = reach(d) * 0.8, R = skin.R * big;
    sphere = { at: [-d[0] * (R - along), -d[1] * (R - along), -d[2] * (R - along)], R, dir: d };
  }

  const block = (x, y, z, cl) => {
    const p = [x - cl.shift[0], y - cl.shift[1], z - cl.shift[2]];
    let d = inHull(p);
    for (const q of cl.planes) d = Math.max(d, dot(q.n, p) - q.h);
    for (const q of cl.own) d = Math.max(d, dot(q.n, p) - q.h);
    return d + cl.gap;
  };
  const mass = (x, y, z) => {
    let d = Infinity;
    for (const cl of kept) d = Math.min(d, block(x, y, z, cl));
    if (sphere) d = Math.max(d, Math.hypot(x - sphere.at[0], y - sphere.at[1], z - sphere.at[2]) - sphere.R);
    return d;
  };
  const onto = (dir, f = mass) => {
    let inside = 0, out = 4 * big;
    for (let i = 0; i < 40; i++) { const m = (inside + out) / 2; if (f(dir[0] * m, dir[1] * m, dir[2] * m) < 0) inside = m; else out = m; }
    return [dir[0] * inside, dir[1] * inside, dir[2] * inside];
  };
  const normalAt = (q) => {
    const e = big * 0.004, f = mass;
    return unit([f(q[0] + e, q[1], q[2]) - f(q[0] - e, q[1], q[2]), f(q[0], q[1] + e, q[2]) - f(q[0], q[1] - e, q[2]), f(q[0], q[1], q[2] + e) - f(q[0], q[1], q[2] - e)]);
  };

  // The scars: a flake taken off at an edge leaves a shallow scoop in the face it came off, with a sharp rim and
  // faint rings round where it was struck. Each is a flattened ball lying in that face.
  const scarList = [];
  for (let i = 0; i < scars; i++) {
    const d = unit([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]);
    if (top && d[1] > 0.2) continue;
    const q = onto(d), n = normalAt(q), R = big * between(T.scar[0], T.scar[1]) * (i < 3 ? 1.3 : 0.8), h = R * between(T.scoop[0], T.scoop[1]);
    const t1 = unit(cross(n, Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), t2 = cross(n, t1), stretch = 0.65 + 0.7 * r();
    scarList.push({ at: [q[0] + n[0] * h * 0.25, q[1] + n[1] * h * 0.25, q[2] + n[2] * h * 0.25], n, t1, t2, R, R2: R * stretch, h, rings: 9 + 8 * r() });
  }
  const scarOf = (x, y, z) => {
    let d = -Infinity;
    for (const s of scarList) {
      const p = [x - s.at[0], y - s.at[1], z - s.at[2]], u = dot(p, s.t1) / s.R, v = dot(p, s.t2) / s.R2, w = dot(p, s.n) / s.h;
      const far = Math.hypot(u, v);
      if (far > 1.3) continue;
      const e = (Math.hypot(u, v, w) - 1) * s.h + 0.05 * s.h * Math.sin(far * s.rings) * Math.max(0, 1 - far);
      d = Math.max(d, -e);
    }
    return d;
  };

  // The rubble: small broken stones caught on the piece, sunk a little into it, most on what faces up and out.
  const stones = [];
  for (let i = 0; i < rubble; i++) {
    let d = unit([r() * 2 - 1, r() * 1.6 - 0.3, r() * 2 - 1]);
    if (top && d[1] > 0.3) d = unit([d[0], -d[1], d[2]]);
    const q = onto(d), n = normalAt(q), s = big * between(T.stone[0], T.stone[1]);
    const planes = [];
    const flat = 0.5 + 0.4 * r();
    for (let k = 0; k < 14; k++) {
      const u = (k + 0.5) / 14, th = Math.acos(1 - 2 * u), ph = k * 2.39996, m = jitter([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)], 0.5);
      planes.push({ n: m, h: s * (0.7 + 0.3 * r()) * (Math.abs(m[1]) > 0.6 ? flat : 1) });
    }
    const sink = s * T.sunk;
    stones.push({ at: [q[0] + n[0] * (s * 0.6 - sink), q[1] + n[1] * (s * 0.6 - sink), q[2] + n[2] * (s * 0.6 - sink)], s, planes });
  }
  const rubbleOf = (x, y, z) => {
    let d = Infinity;
    for (const st of stones) {
      const p = [x - st.at[0], y - st.at[1], z - st.at[2]];
      if (Math.abs(p[0]) > st.s * 2 || Math.abs(p[1]) > st.s * 2 || Math.abs(p[2]) > st.s * 2) { d = Math.min(d, Math.hypot(...p) - st.s); continue; }
      let e = -Infinity;
      for (const q of st.planes) e = Math.max(e, dot(q.n, p) - q.h);
      d = Math.min(d, e);
    }
    return d;
  };

  // Pits in the outer surface, where it has one.
  const pits = [];
  if (sphere) for (let i = 0; i < (skin.pits ?? 0); i++) {
    const t = jitter(sphere.dir, 1.0), q = onto(t), rc = big * (0.1 + 0.14 * r()), up = rc * 0.82;
    pits.push({ at: [q[0] + t[0] * up, q[1] + t[1] * up, q[2] + t[2] * up], r: rc });
  }

  const s0 = seed & 1023;
  const at = (x, y, z) => {
    let d = mass(x, y, z);
    d = Math.max(d, scarOf(x, y, z));
    for (const p of pits) d = Math.max(d, p.r - Math.hypot(x - p.at[0], y - p.at[1], z - p.at[2]));
    d = Math.min(d, rubbleOf(x, y, z));
    // A broken face is never flat: a slow swell, a finer wander that bends each edge, and a grit at the mesh's own
    // fineness, which the surface maker keeps where it can.
    const sw = big * T.swellOver, rg = big * T.ridgeOver, wa = big * T.wanderOver, gr = big * T.gritOver;
    return d + big * T.swell * (noise(x / sw + 11, y / sw + 3, z / sw + 7, s0) - 0.5) * 2
      + big * T.ridge * (0.5 - 2 * Math.abs(noise(x / rg + 5, y / rg, z / rg, (seed + 3) & 1023) - 0.5))
      + big * T.wander * (noise(x / wa, y / wa, z / wa, (seed + 1) & 1023) - 0.5) * 2
      + big * T.grit * (noise(x / gr, y / gr, z / gr, (seed + 2) & 1023) - 0.5) * 2;
  };
  const onSkin = (x, y, z) => (sphere ? Math.abs(Math.hypot(x - sphere.at[0], y - sphere.at[1], z - sphere.at[2]) - sphere.R) : Infinity);
  // Which block a place is in, and which bed: the beds are broad, uneven and broken, never ruled lines.
  const blockOf = (x, y, z) => { let best = 0, bd = Infinity; kept.forEach((cl, i) => { const d = block(x, y, z, cl); if (d < bd) { bd = d; best = i; } }); return best; };
  const bedOf = (x, y, z) => {
    const s = dot([x, y, z], Ln) + big * 0.18 * (noise(x / (big * 0.5), y / (big * 0.5), z / (big * 0.5), (seed + 5) & 1023) - 0.5);
    return Math.floor(s / (big * 0.32) + 10);
  };
  const isRubble = (x, y, z) => rubbleOf(x, y, z) < mass(x, y, z) - 1e-3;
  const least = [Infinity, Infinity, Infinity], most = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 800; i++) {
    const u = (i + 0.5) / 800, th = Math.acos(1 - 2 * u), ph = i * 2.39996, q = onto([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)], (x, y, z) => Math.min(mass(x, y, z), rubbleOf(x, y, z)));
    for (let k = 0; k < 3; k++) { least[k] = Math.min(least[k], q[k]); most[k] = Math.max(most[k], q[k]); }
  }
  const spare = big * 0.08;
  return { at, onSkin, blockOf, bedOf, isRubble, box: [least.map((v) => v - spare), most.map((v) => v + spare)] };
}
