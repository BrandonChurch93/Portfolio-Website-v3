// The fine breaks on what broke away, as a map that tiles: in red how high a place is, in green how its color
// differs. The height is a broken face's own roughness: a grain of every size down to the map's pixel, the same every
// way, so it reads as neither a net of lines nor a grain of wood. The page reads it from three sides
// of each piece and turns its height into the light's small shadows (src/pieces/world/parts/debris/shaders.ts).
//
//   detail(file, size)
import { png } from '../../lib/png.mjs';
import { L } from '../../lib/plan.mjs';

// The grain: how many cells across its coarsest octave, how many octaves, and how much each is of the one before.
const GRAIN = { cells: 6, octaves: 6, fall: 0.58 };

export function detail(file, size) {
  const r = L.seeded(4421), out = new Uint8Array(size * size * 4), height = new Float32Array(size * size), tone = new Float32Array(size * size);
  // Value noise on a lattice that wraps, so every octave tiles.
  const lattice = (gx, gy) => ({ gx, gy, v: Float32Array.from({ length: gx * gy }, () => r()) });
  const smooth = (t) => t * t * (3 - 2 * t);
  const at = (l, u, v) => {
    const x = u * l.gx, y = v * l.gy, i = Math.floor(x), j = Math.floor(y), fx = smooth(x - i), fy = smooth(y - j);
    const g = (a, b) => l.v[(((b % l.gy) + l.gy) % l.gy) * l.gx + (((a % l.gx) + l.gx) % l.gx)];
    return (g(i, j) * (1 - fx) + g(i + 1, j) * fx) * (1 - fy) + (g(i, j + 1) * (1 - fx) + g(i + 1, j + 1) * fx) * fy;
  };
  const octaves = Array.from({ length: GRAIN.octaves }, (_, k) => lattice(GRAIN.cells << k, GRAIN.cells << k));
  const stain = [lattice(5, 5), lattice(17, 17)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size, v = (y + 0.5) / size;
    let g = 0, amp = 1, sum = 0;
    for (const o of octaves) { g += amp * at(o, u, v); sum += amp; amp *= GRAIN.fall; }
    height[y * size + x] = g / sum;
    tone[y * size + x] = 0.7 * at(stain[0], u, v) + 0.3 * at(stain[1], u, v);
  }
  const span = (a) => { let lo = Infinity, hi = -Infinity; for (const q of a) { lo = Math.min(lo, q); hi = Math.max(hi, q); } return [lo, hi - lo || 1]; };
  const [h0, hs] = span(height), [c0, cs] = span(tone);
  for (let i = 0; i < size * size; i++) {
    out[i * 4] = Math.round(((height[i] - h0) / hs) * 255);
    out[i * 4 + 1] = Math.round(((tone[i] - c0) / cs) * 255);
    out[i * 4 + 3] = 255;
  }
  png(file, size, size, out, 4);
}
