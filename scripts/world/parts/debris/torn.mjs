// A piece of what broke away, as a field for the surface maker (scripts/world/lib/surface.mjs): under 0 inside.
// Torn rock of the planet's kind, never a cut block: one mass split in place along its own fractures, each block the
// part of the mass nearest one of a few points, measured flatter across the beds, its joins ragged and filled with
// rubble. The break is in the geometry: every edge is chipped by flakes taken off it (a flat facet with straight
// sides, cut in from the edge), each block's faces step down part of the way across along a ragged riser, the beds
// stand proud or sink on every broken side, and nothing
// swells or wanders. Nothing is a ruled line or a flat polygon at three times.
//
//   args = { seed, size: [a, b, c], layer: [x, y, z], blocks, drop, skin: { dir, R, pits } | null, top, rubble,
//            flat, form, chips, steps, strata, ridge }
//
// size is the half extents of the mass before anything is broken off it, layer the way across its beds, blocks how
// many blocks it splits into and drop how many of them are gone, flat how much flatter its blocks are across its
// beds. form, when given, is the mass as planes of the piece's own frame ([nx, ny, nz, h] each: under h is inside),
// in place of a mass grown at random, and lumps, when given, are craggy chunks grown into it or making it ([x, y, z,
// a, b, c] each: a middle and half extents): picture 9's two boulders are laid out so, on the picture's own outline. chips is how many flakes come off its
// edges, steps how many stepped breaks cross each block, strata how far a bed stands proud as a share of the size,
// and ridge a way out of the piece along which its edges are broken harder (a jagged ridge). shape(args) gives the
// same solid to the make script, with which block and which bed each place is in, where the planet's outer surface
// is, and how fresh the break is at each place.
import { noise, seeded } from '../../../../src/pieces/world/layout.ts';

export const lip = 1.6;
let solid = null;

export async function setup(args) { solid = shape(args); }
export function field(x, y, z) { return solid.at(x, y, z); }

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const smoothstepJs = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const hash = (n) => { let x = Math.imul(n ^ 0x2c1b3c6d, 0x297a2d39); x ^= x >>> 15; x = Math.imul(x, 0x85ebca6b); return ((x ^ (x >>> 13)) >>> 0) / 4294967296; };

// How the mass is broken, as shares of its largest half extent unless said.
export const TORN = {
  // How much flatter the blocks are across the beds than along them.
  flat: 1.9,
  // How far a block that has moved stands out or sinks, and the share that have moved: split in place, barely.
  shift: [0.004, 0.018], moved: 0.5,
  // An opened crack: how wide, in units, and the share of blocks that have one.
  crack: [0.5, 1.2], cracked: 0,
  // How far a join between blocks wanders from a plane, and over how far: a break is never ruled.
  rag: 0.035, ragOver: 0.16,
  // A block's outer face broken at its own depth: how deep, at most.
  face: 0.05,
  // Corners broken off each block: how many, and how deep.
  corners: 3, corner: [0.03, 0.1],
  // The flakes off the edges: their length along the edge (a share of the size, from the smallest, and how many
  // times larger the largest is), and how far under the edge each passes, as a share of its length.
  flake: [0.03, 4], bite: [0.1, 0.25],
  // The stepped breaks across a block's faces: how far a step drops, how ragged its riser is, and over how far.
  step: [0.025, 0.07], riser: 0.015, riserOver: 0.08,
  // The beds: how thick (a share of the size), how much they wander, and how far one stands proud (strata, unless
  // given). None by default: a step finer than two cells of the mesh comes out as a comb of slivers, so the fine
  // strata are the shader's (../../../../src/pieces/world/parts/debris/shaders.ts) and only a boulder's are cut.
  bed: [0.07, 0.12], bedWander: 0.25, strata: 0,
  // The rubble: how large each piece is, and how far it is sunk into the rock as a share of its size.
  stone: [0.02, 0.06], sunk: 0.35,
  // How much every face swells, ridges and wanders, and over how far: no grit, which reads as hammered metal.
  swell: 0, swellOver: 0.4, ridge: 0, ridgeOver: 0.13, wander: 0, wanderOver: 0.05,
  // The secondary breaks across each block: how many, how far round from the way out they are turned (radians, at
  // most), and how deep under the surface each cuts. Each leaves a crisp facet, never a swell: a swell reads as cloth.
  facets: 12, facetTurn: 0.45, facetCut: [0.008, 0.035],
  // A mass grown at random is a few craggy chunks grown into each other: how many breaks bound a chunk, the
  // smaller chunks' size against the main one's, and how far out on the main one each sits. Where two meet their
  // outline cuts back in, so no edge of the mass runs on.
  chunk: [12, 18], chunks: [2, 4], small: [0.38, 0.62], out: [0.55, 0.85],
  // The outline as it is seen (view, in the piece's own frame): every `every` units of it, as a share of the size,
  // a notch is cut into it (a V, as deep as `notch`, its sides turned `open` from the surface, radians) or its
  // corner is broken off (as deep as `bevel`). So no edge seen against the dark runs straight for long.
  every: 0.22, notch: [0.035, 0.11], open: [0.75, 1.15], bevel: [0.025, 0.07], notched: 0.55,
  // The broad planes a face breaks into: how many on each block, how far each is turned from the face (radians), and
  // how deep under it it passes. Turned only a little, each takes a wide part of the face to a plane of its own, so a
  // face is many planes meeting at low angles and never one flat polygon.
  planes: 18, planeTurn: [0.07, 0.22], planeCut: [0.006, 0.025],
};

export function shape({ seed, size, layer = [0, 1, 0], blocks = 4, drop = 1, skin = null, top = false, rubble = 10, flat = TORN.flat, form = null, chips = 80, steps = 2, strata = TORN.strata, ridge = null, facets = TORN.facets, view = null, every = TORN.every, crest = 0, lumps = null }) {
  const r = seeded(seed), [a, b, c] = size, big = Math.max(a, b, c), T = TORN;
  const reach = (n) => Math.abs(n[0]) * a + Math.abs(n[1]) * b + Math.abs(n[2]) * c;
  const jitter = (v, k) => unit([v[0] + k * (r() - 0.5), v[1] + k * (r() - 0.5), v[2] + k * (r() - 0.5)]);
  const between = (lo, hi) => lo + (hi - lo) * r();
  const s0 = seed & 1023;

  // The mass: the planes it is given, or a main chunk and a few smaller ones grown into it.
  // A craggy chunk: a solid bounded by many breaks turned every way, spread evenly round it so no one face is large,
  // each cut at a depth of its own.
  const chunk = (k, at, ext = [a, b, c]) => {
    const A = ext[0] * k, B = ext[1] * k, C = ext[2] * k, rch = (n) => Math.abs(n[0]) * A + Math.abs(n[1]) * B + Math.abs(n[2]) * C;
    const count = T.chunk[0] + Math.floor(r() * (T.chunk[1] - T.chunk[0] + 1)), turn = r() * Math.PI * 2, planes = [];
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count, th = Math.acos(1 - 2 * u), ph = i * 2.39996 + turn;
      const m = jitter([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)], 0.45), n = unit([m[0] / A, m[1] / B, m[2] / C]);
      planes.push({ n, h: rch(n) * (0.7 + 0.26 * r()) + dot(n, at) });
    }
    return { planes };
  };
  let lobes;
  if (form || lumps) {
    lobes = form ? [{ planes: form.planes.map(([x, y, z, h]) => { const l = Math.hypot(x, y, z); return { n: [x / l, y / l, z / l], h }; }) }] : [];
    for (const [x, y, z, sx, sy, sz] of lumps ?? []) lobes.push(chunk(1, [x, y, z], [sx, sy, sz]));
  }
  else {
    lobes = [chunk(0.92, [0, 0, 0])];
    for (let i = 0, n = T.chunks[0] + Math.floor(r() * (T.chunks[1] - T.chunks[0] + 1)); i < n; i++) {
      const k = between(T.small[0], T.small[1]), d = jitter([r() - 0.5, (r() - 0.5) * 0.8, (r() - 0.5) * 0.6], 0.2), o = between(T.out[0], T.out[1]);
      lobes.push(chunk(k, [d[0] * a * o, d[1] * b * o, d[2] * c * o]));
    }
  }
  const inHull = (p) => {
    let best = Infinity;
    for (const l of lobes) { let d = -Infinity; for (const q of l.planes) d = Math.max(d, dot(q.n, p) - q.h); best = Math.min(best, d); }
    return best;
  };

  // The blocks: points inside the mass, and the planes half way between each two, measured flatter across the beds.
  const Ln = unit(layer), squash = (p) => { const s = dot(p, Ln) * (flat - 1); return [p[0] + Ln[0] * s, p[1] + Ln[1] * s, p[2] + Ln[2] * s]; };
  const seeds = [];
  for (let tries = 0; seeds.length < blocks && tries < 4000; tries++) {
    const p = [a * (r() * 2 - 1) * 0.95, b * (r() * 2 - 1) * 0.9, c * (r() * 2 - 1) * 0.9];
    if (inHull(p) > -big * 0.08) continue;
    if (seeds.some((q) => Math.hypot(...squash([p[0] - q[0], p[1] - q[1], p[2] - q[2]])) < big * 0.42)) continue;
    seeds.push(p);
  }
  if (!seeds.length) seeds.push([0, 0, 0]);
  const sq = seeds.map(squash);
  const cells = seeds.map((s, k) => {
    const planes = [];
    for (let j = 0; j < seeds.length; j++) {
      if (j === k) continue;
      const u = [sq[j][0] - sq[k][0], sq[j][1] - sq[k][1], sq[j][2] - sq[k][2]], m = [(sq[j][0] + sq[k][0]) / 2, (sq[j][1] + sq[k][1]) / 2, (sq[j][2] + sq[k][2]) / 2];
      const raw = squash(u), l = Math.hypot(...raw) || 1;
      planes.push({ n: [raw[0] / l, raw[1] / l, raw[2] / l], h: dot(u, m) / l });
    }
    return { seed: s, planes, own: [], steps: [], shift: [0, 0, 0], gap: 0, gone: false };
  });
  const outer = cells.map((cl, k) => ({ k, d: inHull(cl.seed) })).sort((x, y) => y.d - x.d);
  for (let i = 0; i < Math.min(drop, cells.length - 2); i++) cells[outer[i].k].gone = true;
  // How far out of the mass a block reaches along a way, from its seed.
  const outTo = (cl, n, also = false) => {
    let lo = 0, hi = 4 * big;
    for (let k = 0; k < 30; k++) {
      const m = (lo + hi) / 2, p = [cl.seed[0] + n[0] * m, cl.seed[1] + n[1] * m, cl.seed[2] + n[2] * m];
      let d = inHull(p);
      if (also) { for (const q of cl.planes) d = Math.max(d, dot(q.n, p) - q.h); for (const q of cl.own) d = Math.max(d, dot(q.n, p) - q.h); }
      if (d < 0) lo = m; else hi = m;
    }
    return lo;
  };
  // Where the block's surface is along a way from its seed, and which way the surface faces there. A plane that cuts
  // the block is turned from that, never from the way it was found by: turned from that, it slices the block.
  const faceAt = (cl, n) => {
    const out = outTo(cl, n, true), at = [cl.seed[0] + n[0] * out, cl.seed[1] + n[1] * out, cl.seed[2] + n[2] * out], e = big * 0.004;
    const f = (x, y, z) => { const p = [x, y, z]; let d = inHull(p); for (const q of cl.planes) d = Math.max(d, dot(q.n, p) - q.h); for (const q of cl.own) d = Math.max(d, dot(q.n, p) - q.h); return d; };
    return { at, sn: unit([f(at[0] + e, at[1], at[2]) - f(at[0] - e, at[1], at[2]), f(at[0], at[1] + e, at[2]) - f(at[0], at[1] - e, at[2]), f(at[0], at[1], at[2] + e) - f(at[0], at[1], at[2] - e)]) };
  };
  for (const cl of cells) {
    const out = unit(cl.seed[0] || cl.seed[1] || cl.seed[2] ? cl.seed : [r() - 0.5, r() - 0.5, r() - 0.5]);
    if (r() < T.moved) {
      const k = big * between(T.shift[0], T.shift[1]) * (r() < 0.5 ? -1 : 1), d = jitter(out, 1.2);
      cl.shift = [d[0] * k, d[1] * k, d[2] * k];
    }
    if (r() < T.cracked) cl.gap = between(T.crack[0], T.crack[1]) / 2;
    // The block's own outer face, broken at its own depth and angle (a boulder's given faces are kept).
    for (let i = 0; i < (form || lumps ? 0 : 1 + Math.floor(r() * 2)); i++) {
      let n = jitter(out, 1.4);
      if (top && n[1] > 0.3) n = unit([n[0], -Math.abs(n[1]), n[2]]);
      cl.own.push({ n, h: dot(n, cl.seed) + outTo(cl, n) - big * (0.008 + T.face * r()) });
    }
  }
  for (const cl of cells) for (let i = 0; i < T.corners; i++) {
    const n = unit([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]);
    if (top && n[1] > 0.3) continue;
    const { at, sn } = faceAt(cl, n), m = jitter(sn, 1.1);
    if (inHull(at) < -big * 0.01) continue;
    cl.own.push({ n: m, h: dot(m, at) - big * between(T.corner[0], T.corner[1]) });
  }
  // The secondary breaks: each block's surface broken again by planes turned a little from it, at uneven depths.
  // Only its outer surface: a break laid on the face it shares with the next block opened a gap through the piece.
  for (const cl of cells) for (let i = 0; i < facets; i++) {
    let n = unit([r() - 0.5, r() - 0.5, r() - 0.5]);
    if (top && n[1] > 0.3) continue;
    const { at, sn } = faceAt(cl, n), m = jitter(sn, T.facetTurn);
    if (inHull(at) < -big * 0.01) continue;
    cl.own.push({ n: m, h: dot(m, at) - big * between(T.facetCut[0], T.facetCut[1]) });
  }
  for (const cl of cells) for (let i = 0; i < T.planes; i++) {
    const { at, sn } = faceAt(cl, unit([r() - 0.5, r() - 0.5, r() - 0.5]));
    if (inHull(at) < -big * 0.01) continue;
    const t = jitter(unit(cross(sn, [r() - 0.5, r() - 0.5, r() - 0.5])), 0), k = between(T.planeTurn[0], T.planeTurn[1]);
    const m = unit(sn.map((v, j) => v * Math.cos(k) + t[j] * Math.sin(k)));
    cl.own.push({ n: m, h: dot(m, at) - big * between(T.planeCut[0], T.planeCut[1]) });
  }
  // The stepped breaks: a face that drops a little part of the way across it, along a ragged riser. Each is the
  // block's face at one of its outer ways, turned a little, lowered on one side of a plane across it.
  for (const cl of cells) for (let i = 0; i < steps; i++) {
    let n = jitter(unit([r() - 0.5, r() - 0.5, r() - 0.5]), 0.2);
    if (top && n[1] > 0.3) n = unit([n[0], -Math.abs(n[1]), n[2]]);
    const { at, sn } = faceAt(cl, n), n1 = jitter(sn, 0.12), across = unit(cross(n1, jitter([0, 1, 0], 2.4)));
    if (inHull(at) < -big * 0.01) continue;
    cl.steps.push({ n1, h1: dot(n1, at) - big * between(T.step[0], T.step[1]), n2: across, h2: dot(across, at) + big * 0.25 * (r() - 0.5) });
  }
  const kept = cells.filter((cl) => !cl.gone);

  // The planet's outer surface on one side: a sphere far larger than the piece, a little way in along dir.
  let sphere = null;
  if (skin) {
    const d = unit(skin.dir), along = reach(d) * 0.8, R = skin.R * big;
    sphere = { at: [-d[0] * (R - along), -d[1] * (R - along), -d[2] * (R - along)], R, dir: d };
  }

  // A join wanders: the planes between blocks are read at a place moved a little by a slow noise.
  const ragK = big * T.rag, ragW = big * T.ragOver, riseK = big * T.riser, riseW = big * T.riserOver;
  const warp = (x, y, z) => [x + ragK * (noise(x / ragW, y / ragW, z / ragW, (seed + 7) & 1023) - 0.5) * 2, y + ragK * (noise(x / ragW + 31, y / ragW, z / ragW, (seed + 8) & 1023) - 0.5) * 2, z + ragK * (noise(x / ragW, y / ragW + 17, z / ragW, (seed + 9) & 1023) - 0.5) * 2];
  const block = (p, w, rise, cl) => {
    const q = [p[0] - cl.shift[0], p[1] - cl.shift[1], p[2] - cl.shift[2]], qw = [w[0] - cl.shift[0], w[1] - cl.shift[1], w[2] - cl.shift[2]];
    let d = inHull(q);
    for (const pl of cl.planes) d = Math.max(d, dot(pl.n, qw) - pl.h);
    for (const pl of cl.own) d = Math.max(d, dot(pl.n, q) - pl.h);
    for (const s of cl.steps) d = Math.max(d, Math.min(dot(s.n1, q) - s.h1, dot(s.n2, q) - s.h2 + rise));
    return d + cl.gap;
  };
  // The mass, and the nearest two blocks' values (for where a join is).
  const two = [0, 0], notches = [];
  const massOf = (x, y, z) => {
    const p = [x, y, z], w = warp(x, y, z), rise = riseK * (noise(x / riseW, y / riseW, z / riseW, (seed + 4) & 1023) - 0.5) * 2;
    let d = Infinity, e = Infinity;
    for (const cl of kept) { const v = block(p, w, rise, cl); if (v < d) { e = d; d = v; } else if (v < e) e = v; }
    for (const nt of notches) d = nt.m2 ? Math.max(d, Math.min(dot(nt.m1, p) - nt.h1, dot(nt.m2, p) - nt.h2)) : Math.max(d, dot(nt.m1, p) - nt.h1);
    two[0] = d; two[1] = e;
    if (sphere) d = Math.max(d, Math.hypot(x - sphere.at[0], y - sphere.at[1], z - sphere.at[2]) - sphere.R);
    return d;
  };
  // The beds: each stands a little proud of or sunk from the next, along lines that wander.
  const bedT = big * between(T.bed[0], T.bed[1]), bedW = big * 0.3, bedAmp = big * strata;
  const bedS = (x, y, z) => (x * Ln[0] + y * Ln[1] + z * Ln[2]) / bedT + T.bedWander * (noise(x / bedW + 3, y / bedW + 5, z / bedW, (seed + 5) & 1023) - 0.5) * 2;
  const bedOff = (k) => bedAmp * (hash(k * 7919 + seed) * 2 - 1);
  const bedded = (d, x, y, z) => {
    if (!bedAmp) return d;
    const s = bedS(x, y, z), k0 = Math.floor(s);
    let best = Infinity;
    for (let k = k0 - 1; k <= k0 + 1; k++) best = Math.min(best, Math.max(d + bedOff(k), (k - s) * bedT, (s - k - 1) * bedT));
    return best;
  };
  const mass = (x, y, z) => bedded(massOf(x, y, z), x, y, z);
  const onto = (dir, f = mass) => {
    let inside = 0, out = 4 * big;
    for (let i = 0; i < 40; i++) { const m = (inside + out) / 2; if (f(dir[0] * m, dir[1] * m, dir[2] * m) < 0) inside = m; else out = m; }
    return [dir[0] * inside, dir[1] * inside, dir[2] * inside];
  };
  const normalOf = (f, q, e) => unit([f(q[0] + e, q[1], q[2]) - f(q[0] - e, q[1], q[2]), f(q[0], q[1] + e, q[2]) - f(q[0], q[1] - e, q[2]), f(q[0], q[1], q[2] + e) - f(q[0], q[1], q[2] - e)]);

  // The outline as it is seen, broken: places on the surface turned edge on to the visitor, taken a set way apart
  // round it, each given a V notch or a broken corner. Along a crest (ridge, with crest over 0) they come closer
  // together and cut deeper, so its line is a saw.
  if (view) {
    const vw = unit(view), rim = [];
    for (let i = 0; i < 1800; i++) {
      const u = (i + 0.5) / 1800, th = Math.acos(1 - 2 * u), ph = i * 2.39996, q = onto([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]);
      const n0 = normalOf(mass, q, big * 0.002);
      if (Math.abs(dot(n0, vw)) >= 0.3) continue;
      // On the outline only if nothing of the piece lies in front of it or behind it, just outside it: a side face
      // that stands inside the outline took a notch as a pocket in the middle of a face.
      const o = [q[0] + n0[0] * big * 0.03, q[1] + n0[1] * big * 0.03, q[2] + n0[2] * big * 0.03];
      let seen = true;
      for (let j = 1; j <= 60 && seen; j++) for (const sg of [1, -1]) { const t = sg * j * big * 0.035; if (mass(o[0] + vw[0] * t, o[1] + vw[1] * t, o[2] + vw[2] * t) < 0) seen = false; }
      if (seen) rim.push({ q, n: n0, k: r() });
    }
    rim.sort((x, y) => x.k - y.k);
    const flatOf = (q) => { const s = dot(q, vw); return [q[0] - vw[0] * s, q[1] - vw[1] * s, q[2] - vw[2] * s]; };
    const taken = [], rdg = ridge ? unit(ridge) : null;
    for (const sp of rim) {
      const onCrest = rdg && crest > 0 ? smoothstepJs(0.15, 0.5, dot(sp.n, rdg)) : 0, gap = big * every * (1 - 0.55 * onCrest), at = flatOf(sp.q);
      if (taken.some((t) => Math.hypot(at[0] - t[0], at[1] - t[1], at[2] - t[2]) < gap * (0.75 + 0.5 * hash(taken.length * 31 + seed)))) continue;
      taken.push(at);
      const sn = unit(sp.n.map((v, k) => v - vw[k] * dot(sp.n, vw))), across = unit(cross(jitter(vw, 0.15), sn)), deep = 1 + crest * onCrest;
      if (r() < T.notched + 0.3 * onCrest) {
        const b1 = between(T.open[0], T.open[1]), b2 = between(T.open[0], T.open[1]), D = big * between(T.notch[0], T.notch[1]) * deep;
        const c0 = [sp.q[0] - sn[0] * D, sp.q[1] - sn[1] * D, sp.q[2] - sn[2] * D];
        const m1 = unit(sn.map((v, k) => v * Math.cos(b1) + across[k] * Math.sin(b1))), m2 = unit(sn.map((v, k) => v * Math.cos(b2) - across[k] * Math.sin(b2)));
        if (Math.min(dot(m1, c0), dot(m2, c0)) > big * 0.15) notches.push({ m1, h1: dot(m1, c0), m2, h2: dot(m2, c0) });
      } else {
        // Turned from the face no further than keeps the cut to the edge: a plane turned far cut the piece in two.
        const m1 = jitter(unit(sn.map((v, k) => v + across[k] * (r() - 0.5) * 0.8)), 0.15), h1 = dot(m1, sp.q) - big * between(T.bevel[0], T.bevel[1]) * deep;
        if (h1 > big * 0.25) notches.push({ m1, h1 });
      }
    }
  }

  // Places on the surface, and which are on an edge: where the surface's way turns sharply within a short step.
  const edges = [], joins = [], surf = [];
  const E = big * 0.018, look = Math.cos((32 * Math.PI) / 180);
  for (let i = 0; i < 2600; i++) {
    const u = (i + 0.5) / 2600, th = Math.acos(1 - 2 * u), ph = i * 2.39996, dir = jitter([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)], 0.25);
    const q = onto(dir), n0 = normalOf(mass, q, big * 0.002);
    massOf(q[0], q[1], q[2]);
    if (two[1] - two[0] < big * 0.012 && kept.length > 1) joins.push({ q, n: n0 });
    surf.push({ q, n: n0 });
    const t1 = unit(cross(n0, Math.abs(n0[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), t2 = cross(n0, t1);
    let worst = 1, nb = null, convex = false;
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI * 2, t = [t1[0] * Math.cos(a0) + t2[0] * Math.sin(a0), t1[1] * Math.cos(a0) + t2[1] * Math.sin(a0), t1[2] * Math.cos(a0) + t2[2] * Math.sin(a0)];
      let p = [q[0] + t[0] * E, q[1] + t[1] * E, q[2] + t[2] * E];
      for (let j = 0; j < 3; j++) { const v = mass(...p); p = [p[0] - n0[0] * v, p[1] - n0[1] * v, p[2] - n0[2] * v]; }
      const n = normalOf(mass, p, big * 0.002), cos = dot(n, n0);
      if (cos < worst) { worst = cos; nb = n; convex = dot([p[0] - q[0], p[1] - q[1], p[2] - q[2]], n0) < -E * 0.05; }
    }
    // Only an edge that stands out is chipped: a crease that cuts in is where two blocks meet.
    if (worst < look && nb && convex) edges.push({ q, nA: n0, nB: nb });
  }

  // The flakes off the edges. Each takes a flat chip out of an edge: a plane turned from the face it spreads over
  // toward the edge, a little under the edge, bounded along the edge by two risers set at angles of their own, so
  // its scar is a flat facet with straight sides and the edge it leaves is a run of short straight strokes, never a
  // round dent. Many small, a few large, and along a ridge, if the piece has one, more and deeper: a jagged crest.
  const flakes = [];
  const rd = ridge ? unit(ridge) : null;
  for (let i = 0, tries = 0; i < chips && tries < chips * 6 && edges.length; tries++) {
    const ed = edges[Math.floor(r() * edges.length)], bis = unit([ed.nA[0] + ed.nB[0], ed.nA[1] + ed.nB[1], ed.nA[2] + ed.nB[2]]);
    const onRidge = rd ? Math.max(0, dot(bis, rd)) : 0;
    if (rd && onRidge < 0.35 && r() < 0.5) continue;
    if (top && bis[1] > 0.5) continue;
    i++;
    const R = big * T.flake[0] * T.flake[1] ** (r() ** (2.2 - 1.2 * onRidge)), swap = r() < 0.5;
    const nF = swap ? ed.nB : ed.nA, nO = swap ? ed.nA : ed.nB;
    // The chip's plane, turned from the face toward the edge, and how far under the edge it passes.
    const lean = between(0.25, 0.6), n = unit([nF[0] + nO[0] * lean, nF[1] + nO[1] * lean, nF[2] + nO[2] * lean]);
    const deep = R * between(T.bite[0], T.bite[1]) * (1 + 1.2 * onRidge), h = dot(n, ed.q) - deep;
    // Its two ends along the edge, each turned its own way so the chip is never a neat rectangle.
    const along = unit(cross(nF, nO)), into = unit(cross(along, nF)), sgn = dot(into, nO) > 0 ? -1 : 1, inw = into.map((v) => v * sgn);
    const L1 = R * between(0.5, 1.4), L2 = R * between(0.5, 1.4), t1 = between(-0.6, 0.6), t2 = between(-0.6, 0.6);
    const a1 = unit(along.map((v, k) => v + inw[k] * t1)), a2 = unit(along.map((v, k) => -v + inw[k] * t2));
    flakes.push({ n, h, a1, b1: dot(a1, ed.q) + L1, a2, b2: dot(a2, ed.q) + L2, R: Math.max(L1, L2) + deep * 4, at: ed.q });
  }
  // The flakes in a grid of cells, so a place looks only at those near it.
  const G = Math.max(big * 0.12, ...flakes.map((f) => f.R * 1.1)), grid = new Map(), key = (i, j, k) => `${i},${j},${k}`;
  for (const [n, f] of flakes.entries()) {
    const reachF = f.R;
    for (let i = Math.floor((f.at[0] - reachF) / G); i <= Math.floor((f.at[0] + reachF) / G); i++)
      for (let j = Math.floor((f.at[1] - reachF) / G); j <= Math.floor((f.at[1] + reachF) / G); j++)
        for (let k = Math.floor((f.at[2] - reachF) / G); k <= Math.floor((f.at[2] + reachF) / G); k++) {
          const g = grid.get(key(i, j, k)) ?? [];
          g.push(n);
          grid.set(key(i, j, k), g);
        }
  }
  const flaked = (x, y, z) => {
    const near = grid.get(key(Math.floor(x / G), Math.floor(y / G), Math.floor(z / G)));
    let d = -Infinity;
    const p = [x, y, z];
    if (near) for (const n of near) {
      const f = flakes[n];
      d = Math.max(d, Math.min(dot(f.n, p) - f.h, f.b1 - dot(f.a1, p), f.b2 - dot(f.a2, p)));
    }
    return d;
  };

  // The rubble: small broken stones wedged in the joins between blocks, and a few caught on what faces up and out.
  const stones = [];
  for (let i = 0; i < rubble; i++) {
    const inJoin = joins.length && i < rubble * 0.7, sp = inJoin ? joins[Math.floor(r() * joins.length)] : surf[Math.floor(r() * surf.length)];
    if (!sp || (top && sp.n[1] > 0.3)) continue;
    const s = big * between(T.stone[0], T.stone[1]) * (inJoin ? 0.8 : 1), planes = [], squat = 0.5 + 0.4 * r();
    for (let k = 0; k < 12; k++) {
      const u = (k + 0.5) / 12, th = Math.acos(1 - 2 * u), ph = k * 2.39996, m = jitter([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)], 0.6);
      planes.push({ n: m, h: s * (0.65 + 0.35 * r()) * (Math.abs(m[1]) > 0.6 ? squat : 1) });
    }
    const sink = s * (inJoin ? 0.6 : T.sunk);
    stones.push({ at: [sp.q[0] + sp.n[0] * (s * 0.6 - sink), sp.q[1] + sp.n[1] * (s * 0.6 - sink), sp.q[2] + sp.n[2] * (s * 0.6 - sink)], s, planes });
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


  const sw = big * T.swellOver, rg = big * T.ridgeOver, wa = big * T.wanderOver;
  const relief = (x, y, z) => big * T.swell * (noise(x / sw + 11, y / sw + 3, z / sw + 7, s0) - 0.5) * 2
    + big * T.ridge * (0.5 - 2 * Math.abs(noise(x / rg + 5, y / rg, z / rg, (seed + 3) & 1023) - 0.5))
    + big * T.wander * (noise(x / wa, y / wa, z / wa, (seed + 1) & 1023) - 0.5) * 2;
  const bare = (x, y, z) => {
    let d = mass(x, y, z);
    for (const p of pits) d = Math.max(d, p.r - Math.hypot(x - p.at[0], y - p.at[1], z - p.at[2]));
    return d;
  };
  const at = (x, y, z) => Math.min(Math.max(bare(x, y, z), flaked(x, y, z)), rubbleOf(x, y, z)) + relief(x, y, z);
  // How fresh the break is at a place: a flake's scar and a rubble stone are fresh stone, a stepped riser a little
  // less, a block's old face not at all.
  const fresh = (x, y, z) => {
    const b0 = bare(x, y, z), f = flaked(x, y, z), st = rubbleOf(x, y, z);
    if (st < Math.max(b0, f) - 1e-3) return 0.7;
    if (f > b0 - big * 0.001) return 1;
    return 0;
  };
  const onSkin = (x, y, z) => (sphere ? Math.abs(Math.hypot(x - sphere.at[0], y - sphere.at[1], z - sphere.at[2]) - sphere.R) : Infinity);
  const blockOf = (x, y, z) => { const p = [x, y, z], w = warp(x, y, z); let best = 0, bd = Infinity; kept.forEach((cl, i) => { const d = block(p, w, 0, cl); if (d < bd) { bd = d; best = i; } }); return best; };
  const bedOf = (x, y, z) => Math.floor(bedS(x, y, z));
  const isRubble = (x, y, z) => rubbleOf(x, y, z) < Math.max(bare(x, y, z), flaked(x, y, z)) - 1e-3;
  const least = [Infinity, Infinity, Infinity], most = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 800; i++) {
    const u = (i + 0.5) / 800, th = Math.acos(1 - 2 * u), ph = i * 2.39996, q = onto([Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)], (x, y, z) => Math.min(mass(x, y, z), rubbleOf(x, y, z)));
    for (let k = 0; k < 3; k++) { least[k] = Math.min(least[k], q[k]); most[k] = Math.max(most[k], q[k]); }
  }
  // A piece grown of several chunks is not seen whole from its middle: rays out from it missed what stood out, and
  // the mesher's box cut it open, so its inside showed as a dark pocket. Every place inside, on a grid, widens it.
  const G3 = 36, step = (4 * big) / G3;
  for (let i = 0; i <= G3; i++) for (let j = 0; j <= G3; j++) for (let k = 0; k <= G3; k++) {
    const q = [-2 * big + i * step, -2 * big + j * step, -2 * big + k * step];
    if (Math.min(mass(q[0], q[1], q[2]), rubbleOf(q[0], q[1], q[2])) < 0) for (let m = 0; m < 3; m++) { least[m] = Math.min(least[m], q[m] - step); most[m] = Math.max(most[m], q[m] + step); }
  }
  const spare = big * 0.08;
  return { at, onSkin, blockOf, bedOf, isRubble, fresh, flakes: flakes.length, edges: edges.length, box: [least.map((v) => v - spare), most.map((v) => v + spare)] };
}
