// The slice's broken faces: a block of ./blocks.mjs has flat faces, and a flat face is a faceted solid, not rock. Here
// each face the visitor sees is broken as stone breaks. The block is parted again and again along its own joints (its
// bedding and two ways across it, each break leaning its own way), and a part stops being broken at a size of its own,
// so the pieces are of every size and no two alike. Most stay on the face, which is then a clean broken face. Some
// stand back from it by their own amount and turned a little (a facet), and what such a piece is broken into stands
// back with it, so a scar has one floor with smaller, deeper breaks in it. Along an edge more is broken, and smaller,
// and a piece that lies on the edge may be cut by one face across the corner: a chip off the edge. Every piece is a
// solid of its own with flat faces (./solid.mjs), so every step is as sharp as the screen can show.
// The first build parted the shell on grids: its pieces stood in rows, and read as bricks. The second set every
// piece along an edge back square: a row of teeth, with splinters between. The third let any piece of a size stand
// back, and a piece may be small on the face and long into the block: every small one had a floor of its own, a
// sawtooth. So a piece stands back only when enough of it lies on the face, and is chipped only when it lies on an
// edge and is long along it.
//
//   chip(block, o)   the solids the block becomes: what is left inside it, and its shell's pieces
//     o.deep    how far the deepest piece is set back, in units
//     o.face    the share of that a piece away from every edge may be set back by: a face is broken shallow, into
//               facets, and an edge is chipped deep
//     o.most    the largest piece that may be left unbroken, across, in units
//     o.least   the size a piece is no longer broken at, [on a face, along an edge]
//     o.stop    the share of pieces left unbroken at each break, [on a face, along an edge]
//     o.step    the share that stand back further at each break, [on a face, along an edge]
//     o.lean    how far a break leans from the joint it follows (0.24 is about 13 degrees)
//     o.loose   the share of breaks that follow no joint
//     o.flat    how much thinner a piece is through the bedding than along it
//     o.bed     the bedding the joints follow, when it is not the block's own
//     o.free    which faces break (their tags)
//     o.share   for a tag, the share of `deep` its faces are set back by at most (a joint breaks less than a face)
//     o.tilt    how far a piece that stands back is turned, in degrees, at most, [on a face from that face, along
//               an edge from the face across the corner]: turned little, pieces stand in terraces like a stack of
//               sheets
//     o.calm    the share of blocks whose faces are left nearly whole, with only their edges chipped
//     o.seed
import * as S from './solid.mjs';
import { EYE } from './view.mjs';

export const RISER = 10, SCAR = 11;
// Two pieces parted along a plane lie over each other by this much, so no ray passes between them.
const LAP = 0.02;
// A part is thin under this, in units (six times its volume over its surface: a cube's side). How many breaks are
// tried for one that leaves no thin part, and how far a break that follows no joint leans.
const THIN = 4.2, TRIES = 3, LOOSE = 0.6;
// How much of a part must lie on the block's faces for it to stand back as a facet, in square units, and how long a
// part must be along an edge to be chipped off it, in units: a small one alone in a face is a pit, a row of small
// ones along an edge is a comb, and either is a speck on the page. How far in a chip off an edge may go, as a share
// of how far in its part reaches. How near a broken face a corner is on it, in units.
// Two faces that meet more bluntly than this (the cosine of the angle between the ways they face) have no edge to
// chip: a cut across so blunt an edge is a sliver.
const FACET = 600, CHIP = 11, INTO = 0.45, ON = 0.02, BLUNT = 0.5;
const stout = (s) => { let a = 0; for (const f of s.faces) a += S.area(f.pts); return (6 * S.volume(s)) / a; };

export function hash(i, j, k, s) {
  let h = (Math.imul(i, 0x27d4eb2d) + Math.imul(j, 0x165667b1) + Math.imul(k, 0x9e3779b1) + Math.imul(s, 0x85ebca6b)) | 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export function chip(block, o) {
  const planes = block.faces.map((f) => {
    const n = S.normal(f.pts), d = S.dot(n, f.pts[0]);
    let mid = [0, 0, 0];
    for (const p of f.pts) mid = S.mad(mid, p, 1 / f.pts.length);
    const free = o.free.includes(f.tag) && S.dot(n, S.norm(S.sub(EYE, mid))) > -0.45 && S.area(f.pts) > 30;
    return { n, d, tag: f.tag, free, share: o.share?.[f.tag] ?? 1 };
  });
  const free = planes.filter((p) => p.free);
  if (!free.length) return [block];
  const [lo, hi] = S.bounds(block), thin = Math.min(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
  const deep = Math.min(o.deep, thin * 0.22), k = Math.max(0.5, Math.sqrt(deep / o.deep));
  // What is left inside: the block with every broken face set back as far as the deepest piece.
  let core = block;
  for (const p of free) core = core && S.clip(core, p.n, p.d - deep * p.share - 0.3, p.tag);
  const out = core && S.volume(core) > 8 ? [{ ...core, inner: true }] : [];
  const hidden = (s) => {
    if (!out.length || !out[0].inner) return false;
    for (const f of s.faces) for (const c of f.pts) for (const pl of free) if (S.dot(pl.n, c) > pl.d - deep * pl.share - 0.3 + 1e-3) return false;
    return true;
  };
  // The block's own joints: its bedding, and two ways across it, turned a way of the block's own.
  const a3 = S.norm(o.bed ?? block.bed ?? [0, 0, 1]), [b1, b2] = S.frame(a3), turn = 6.2832 * hash(o.seed, 1, 2, 3);
  const a1 = S.add(S.mul(b1, Math.cos(turn)), S.mul(b2, Math.sin(turn))), a2 = S.cross(a3, a1), A = [a1, a2, a3];
  const W = [1, 1, o.flat ?? 1.5], most = (o.most ?? 56) * k, least = o.least ?? [22, 10], stop = o.stop ?? [0.42, 0.35], shallow = o.face ?? 0.35, tilt = o.tilt ?? [9, 18];
  const calm = hash(o.seed, 5, 6, 7) < (o.calm ?? 0.35), step = [(o.step?.[0] ?? 0.12) * (calm ? 0.2 : 1), o.step?.[1] ?? 0.18];
  const turned = (n, about, by, r1, r2) => {
    const [t1, t2] = S.frame(n), ang = 6.2832 * r1, t = Math.tan(by * (0.25 + 0.75 * r2) * Math.PI / 180);
    const m = S.norm(S.add(n, S.add(S.mul(t1, Math.cos(ang) * t), S.mul(t2, Math.sin(ang) * t))));
    return [m, S.dot(m, about)];
  };
  const on = (pl, p) => Math.abs(pl.d - S.dot(pl.n, p)) < ON;
  // The two broken faces a part lies on where they meet sharply, and how long it is along that edge of the block.
  const edgeOf = (s) => {
    const at = free.filter((pl) => s.faces.some((f) => f.pts.some((p) => on(pl, p))));
    let best = null;
    for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) {
      if (S.dot(at[i].n, at[j].n) > BLUNT) continue;
      const pts = [];
      for (const f of s.faces) for (const p of f.pts) if (on(at[i], p) && on(at[j], p)) pts.push(p);
      let long = 0;
      for (const a of pts) for (const b of pts) long = Math.max(long, S.len(S.sub(a, b)));
      if (long > (best?.long ?? 0.5)) best = { p1: at[i], p2: at[j], long };
    }
    return best;
  };
  // How much of a part lies on the block's broken faces, in square units. Its size will not do for this: a part
  // may be small on the face and long into the block.
  const shown = (s) => {
    let a = 0;
    for (const f of s.faces) if (free.some((pl) => f.pts.every((p) => on(pl, p)))) a += S.area(f.pts);
    return a;
  };
  const leave = (it, cell) => {
    let t = it.s;
    for (const c of it.cuts) t = t && S.clip(t, c[0], c[1], SCAR);
    if (t && S.volume(t) > 0.2 && !hidden(t)) out.push({ ...t, back: Math.max(it.back, it.off), cellOf: cell });
  };
  const work = [{ s: block, id: 1, back: 0, off: 0, cuts: [] }];
  while (work.length) {
    const it = work.pop(), s = it.s;
    if (hidden(s)) continue;
    const reach = A.map((a, i) => { const [l, h] = S.reach(s, a); return (h - l) * W[i]; }), size = Math.max(...reach);
    const u = (n) => hash(it.id, n, 7, o.seed), edge = edgeOf(s) ? 1 : 0;
    if (size <= least[edge] || (size <= most && u(1) < stop[edge])) { leave(it, u(2)); continue; }
    // Parted across its longest way, more or less, by a break that leans from that joint. A break that would leave a
    // thin part is not made: a thin part beside one that stands back is a splinter. Another is tried, and if none
    // will do the piece is left whole.
    let parts = null;
    for (let go = 0; go < TRIES && !parts; go++) {
      const w = (m) => u(m + go * 16);
      let way = 0, best = -1;
      for (let i = 0; i < 3; i++) { const v = reach[i] * (0.55 + 0.9 * w(3 + i)); if (v > best) { best = v; way = i; } }
      const lean = w(6) < (o.loose ?? 0.12) ? LOOSE : o.lean ?? 0.24;
      const n = S.norm(S.add(A[way], S.add(S.mul(A[(way + 1) % 3], (w(7) - 0.5) * 2 * lean), S.mul(A[(way + 2) % 3], (w(8) - 0.5) * 2 * lean))));
      const [l, h] = S.reach(s, n), d = l + (h - l) * (0.3 + 0.4 * w(9));
      const two = [S.clip(s, n, d + LAP, RISER), S.clip(s, S.mul(n, -1), -d + LAP, RISER)];
      if (two[0] && two[1] && Math.min(stout(two[0]), stout(two[1])) >= Math.min(THIN, size * 0.3)) parts = two;
    }
    if (!parts) { leave(it, u(2)); continue; }
    parts.forEach((q, j) => {
      const id = it.id * 2 + j, v = (m) => hash(id, m, 11, o.seed), at = S.middle(q), next = { s: q, id, back: it.back, off: it.off, cuts: it.cuts };
      // A facet: a great part stands back from the faces it lies on, turned its own way about its own place. What it
      // is broken into stands back with it.
      const room = Math.min(deep * shallow - it.back, 0.3 * size + 0.5);
      if (room > 0.15 && v(1) < step[0] && shown(q) > FACET) {
        next.back = it.back + room * (0.2 + 0.8 * Math.pow(v(2), 1.4));
        const near = free.filter((pl) => pl.d - S.dot(pl.n, at) < size + deep);
        next.cuts = [...next.cuts, ...near.map((pl) => turned(pl.n, S.mad(at, pl.n, pl.d - S.dot(pl.n, at) - next.back * pl.share), tilt[0], (v(3) + pl.tag * 0.37) % 1, v(4)))];
      }
      // A chip off an edge: a part that lies on the edge is cut by one face across the corner, no further in than
      // the part itself reaches, so nothing is left standing behind it. A part near an edge and not on it is not
      // cut: that was a pit behind a rim, and a row of them the teeth of a comb.
      const pair = v(5) < step[1] ? edgeOf(q) : null;
      if (pair && pair.long > CHIP) {
        const { p1, p2 } = pair, c = S.dot(p1.n, p2.n);
        let x1 = 0, x2 = 0;
        for (const f of q.faces) for (const p of f.pts) { x1 = Math.max(x1, p1.d - S.dot(p1.n, p)); x2 = Math.max(x2, p2.d - S.dot(p2.n, p)); }
        const most2 = Math.min(deep - it.off, INTO * Math.min(x1, x2));
        if (most2 > 0.3) {
          next.off = it.off + most2 * (0.25 + 0.75 * Math.pow(v(6), 1.2));
          const v1 = p1.d - S.dot(p1.n, at), v2 = p2.d - S.dot(p2.n, at), a = (v1 - c * v2) / (1 - c * c), b = (v2 - c * v1) / (1 - c * c);
          const m = S.norm(S.add(p1.n, p2.n)), corner = S.mad(S.mad(at, p1.n, a), p2.n, b);
          next.cuts = [...next.cuts, turned(m, S.mad(corner, m, -next.off * (p1.share + p2.share) / 2), tilt[1], v(7), v(8))];
        }
      }
      work.push(next);
    });
  }
  return out;
}
