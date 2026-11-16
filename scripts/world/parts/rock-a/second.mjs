// The second generation: rubble lying on what faces up, and small broken pieces in the gaps between the great
// slabs, each smaller than what it lies on.
import { add, box, chip, corners, mul, sub } from './poly.mjs';
import { slab } from './shape.mjs';

// A point inside a slab's face, drawn at random.
function onFace(P, rnd) {
  const i = Math.floor(rnd() * (P.length - 2)) + 1, a = rnd(), b = rnd() * (1 - a);
  return add(P[0], add(mul(sub(P[i], P[0]), a), mul(sub(P[i + 1], P[0]), b)));
}

export function second(slabs, rnd) {
  const out = [];
  for (const s of slabs) {
    const { n, P, size } = s.face;
    if (n[1] < 0.28 || size < 30) continue;
    // Rubble: more on a broad ledge, in a few sizes, sunk a little into what it lies on.
    const count = Math.round((size / 18) * (0.6 + 0.8 * rnd()));
    for (let j = 0; j < count; j++) {
      const r = (rnd() < 0.2 ? 6 : 2.6) + 4 * rnd() * rnd(), at = add(onFace(P, rnd), mul(n, r * (0.2 + 0.3 * rnd())));
      const planes = chip(at, r, rnd, 6, n);
      out.push({ id: 'rubble', planes, bites: [], box: box(corners(planes), 1), face: { C: at, n, P: [at], size: r * 2, t: r } });
    }
  }
  return { slabs: out, cuts: [] };
}
