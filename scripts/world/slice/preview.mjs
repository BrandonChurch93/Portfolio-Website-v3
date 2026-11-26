// A still of what the ray caster gave, lit as the page will light it, for looking at before any of it is on a page.
//   preview(traced, { out, albedo, level, ground })
// albedo is [r, g, b] for the whole of it, or a Float32Array of three numbers a pixel.
import { png } from '../lib/png.mjs';
import { L, light, linear } from '../lib/plan.mjs';
import { EYE, through } from './tracer.mjs';

const mix = (a, b, t) => a + (b - a) * t, sat = (v) => Math.min(1, Math.max(0, v)), smooth = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const PALE = [1.0, 0.767, 0.548];
// The world's own end of chain (src/world/tone.ts): its white balance, kept by the share the world keeps, its tone
// curve, and the screen's color space.
export function finish(c, bal = 0.25) {
  let [r, g, b] = c;
  const peak0 = Math.max(r, g, b), k = (1 - smooth(0.3, 0.85, peak0)) * bal;
  r *= mix(1, 0.96, k); g *= mix(1, 1.21, k); b *= mix(1, 1.59, k);
  g = Math.min(g, r); b = Math.min(b, g);
  const peak = Math.max(r, g, b);
  if (peak >= 0.8) {
    const d = 0.2, np = 1 - (d * d) / (peak + d - 0.8), s = np / peak;
    r *= s; g *= s; b *= s;
    const q = 1 - 1 / (0.15 * (peak - np) + 1);
    r = mix(r, np * PALE[0], q); g = mix(g, np * PALE[1], q); b = mix(b, np * PALE[2], q);
  }
  const hot = smooth(0.55, 1, r);
  g = Math.min(g, r * mix(1, 0.8, hot));
  b = Math.min(b, g, r * mix(1, 0.6, hot));
  const o = (v) => { v = sat(v); return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055; };
  return [o(r), o(g), o(b)];
}

export function lightOf() {
  const l = light(), lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const pale = linear('pale'), k = lum(l.core.color) / lum(pale);
  return { ...l, pale: pale.map((v) => v * k) };
}

export function preview(t, o) {
  const { W, H } = t, out = new Uint8Array(W * H * 3), li = lightOf(), C = L.CORE.at, R = L.CORE.r, fall = L.LIGHT.core.fall, [pk, p0, p1] = L.LIGHT.core.pale;
  const level = o.level ?? 1, ground = (o.ground ?? linear('bg')), dir = new Float64Array(3), each = o.albedo instanceof Float32Array;
  const illum = (c, s) => (c >= s ? c : c <= -s ? 0 : ((c + s) * (c + s)) / (4 * s));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, cover = t.cover[i];
    let c = [0, 0, 0];
    if (cover > 0) {
      const hx = t.window.x + (x + 0.5) / t.window.ppu, hy = t.window.y + (y + 0.5) / t.window.ppu;
      through(hx, hy, dir);
      // The place: along the pixel's ray to its depth toward the visitor.
      const se = Math.sin(L.VIEW.el * L.D2R), ce = Math.cos(L.VIEW.el * L.D2R), y0 = L.SPIRE.tall - (L.HOST.tall / 2 - L.HOST.over) / ce;
      const e0 = (EYE[1] - y0) * se + EYE[2] * ce, dd = dir[1] * se + dir[2] * ce, tt = (t.depth[i] - e0) / dd;
      const px = EYE[0] + dir[0] * tt, py = EYE[1] + dir[1] * tt, pz = EYE[2] + dir[2] * tt;
      const nx = t.normal[i * 3], ny = t.normal[i * 3 + 1], nz = t.normal[i * 3 + 2];
      const tx = C[0] - px, ty = C[1] - py, tz = C[2] - pz, d = Math.hypot(tx, ty, tz), s = Math.min(1, R / d), cs = (tx * nx + ty * ny + tz * nz) / d;
      const k = level * (t.lit ? t.lit[i] : t.core[i] * Math.pow(s, fall) * illum(cs, s)), p = pk * smooth(p0, p1, s);
      const a = each ? [o.albedo[i * 3], o.albedo[i * 3 + 1], o.albedo[i * 3 + 2]] : o.albedo;
      for (let j = 0; j < 3; j++) {
        const E = mix(li.core.color[j], li.pale[j], p) * k + t.bounce[i * 3 + j] * (o.bounce ?? 1) * level;
        c[j] = (a[j] * E) / Math.PI;
      }
      if (o.show === 'core') c = [t.core[i], t.core[i], t.core[i]];
      if (o.show === 'open') c = [t.open[i], t.open[i], t.open[i]];
      if (o.show === 'normal') c = [nx * 0.5 + 0.5, ny * 0.5 + 0.5, nz * 0.5 + 0.5];
    }
    const f = o.show ? c : finish(c.map((v, j) => mix(ground[j], v, cover)), o.bal);
    out[i * 3] = Math.round(f[0] * 255); out[i * 3 + 1] = Math.round(f[1] * 255); out[i * 3 + 2] = Math.round(f[2] * 255);
  }
  png(o.out, W, H, out, 3);
}
