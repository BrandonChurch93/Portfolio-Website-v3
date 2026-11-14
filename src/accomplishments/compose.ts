import { signedDistance } from '../metal/edt';

// The arithmetic of a relief, with no DOM in it, so it runs in a worker. The page draws each shape and reads back
// how much of every pixel it covers. This measures each shape from its own edge, gives it a profile across that
// distance, and averages the result down to the size the piece is shown at.

// round is a quarter circle, soft an S curve, flat a straight slope, which leaves hard ridges where two slopes meet.
export type Profile = 'round' | 'soft' | 'flat';
// A shape's coverage, 0 to 255, in a box of the relief. x and y are the box's corner.
export interface Shape { cov: Uint8ClampedArray; x: number; y: number; w: number; h: number }
// body: a is the rim's width, b its height. raise: a is the height, below zero to sink, b the width of the bevel.
// finish: a is how satin, b the feather. tone: a is how dark the patina, b the feather.
export interface Op { shape: number; kind: 'body' | 'raise' | 'finish' | 'tone'; a: number; b: number; profile: Profile }
// W and H are the size it is worked at, s the pixels to a design unit there, over how many times the shown size that is.
export interface Job { W: number; H: number; s: number; over: number; shapes: Shape[]; ops: Op[] }
// Four numbers a pixel: height, how satin the surface is, how dark its patina is, and how much of the pixel it covers.
export interface Packed { data: Float32Array; W: number; H: number }

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const shaped = (t: number, p: Profile) => (p === 'round' ? Math.sqrt(1 - (1 - t) * (1 - t)) : p === 'soft' ? t * t * (3 - 2 * t) : t);

export function compose(job: Job): Packed {
  const { W, H, s, over, shapes, ops } = job, o = new Float32Array(W * H * 4);
  const fields: (Float32Array | null)[] = shapes.map(() => null);
  for (const op of ops) {
    const f = shapes[op.shape];
    if (!f.w) continue;
    // The distance of every pixel in the box from the shape's edge, in design units. Below zero inside it.
    let d = fields[op.shape];
    if (!d) { d = signedDistance(f.cov, f.w, f.h, 255); for (let i = 0; i < d.length; i++) d[i] /= s; fields[op.shape] = d; }
    const { a, b, profile, kind } = op;
    for (let y = 0; y < f.h; y++) for (let x = 0, at = y * f.w, i = ((y + f.y) * W + f.x) * 4; x < f.w; x++, at++, i += 4) {
      const v = d[at];
      if (kind === 'body') { o[i + 3] = clamp(0.5 - v * s); o[i] = v < 0 ? b * shaped(clamp(-v / a), profile) : 0; }
      else if (kind === 'raise') { if (v < 0) o[i] += a * shaped(clamp(-v / b), profile); }
      else if (kind === 'finish') o[i + 1] += (a - o[i + 1]) * clamp(0.5 - v / b);
      else o[i + 2] += (a - o[i + 2]) * clamp(0.5 - v / b);
    }
  }
  if (over === 1) return { data: o, W, H };
  const w = W / over, h = H / over, out = new Float32Array(w * h * 4), row = W * 4, share = 1 / (over * over);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const to = (y * w + x) * 4;
    for (let j = 0; j < over; j++) for (let i = 0, at = (y * over + j) * row + x * over * 4; i < over; i++, at += 4) { out[to] += o[at]; out[to + 1] += o[at + 1]; out[to + 2] += o[at + 2]; out[to + 3] += o[at + 3]; }
    out[to] *= share; out[to + 1] *= share; out[to + 2] *= share; out[to + 3] *= share;
  }
  return { data: out, W: w, H: h };
}
