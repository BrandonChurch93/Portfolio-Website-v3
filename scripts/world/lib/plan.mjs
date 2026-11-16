// The world's plan, its placed things and its light, for the scripts under scripts/world/: the piece's own files,
// read as they are, so nothing is written down twice.
//
//   import { L, P, light } from '../lib/plan.mjs'
//   L.CORE.at, L.body(x, y, z), P.TOWERS, light().moon.color
import * as L from '../../../src/pieces/world/layout.ts';
import * as P from '../../../src/pieces/world/placed.ts';
import { palette } from '../../../src/config/palette.ts';

export { L, P };

// A palette color as linear light, which is what the baker and the shaders work in.
export function linear(name) {
  const h = palette[name];
  if (!h) throw new Error(`plan: the palette has no '${name}'`);
  return [1, 3, 5].map((i) => { const c = parseInt(h.slice(i, i + 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
}
const times = (c, k) => c.map((v) => v * k);
// The planet's stone under white light (LIGHT.stone in the layout), as linear light: what the baker lights rock with.
export function stone() {
  const { of, ease, power } = L.LIGHT.stone, [a, b] = of.map(linear);
  return a.map((v, i) => (v + (b[i] - v) * ease) * power);
}

// The two lights as the baker wants them (scripts/world/lib/bake.mjs), from LIGHT in the layout.
export function light() {
  const m = Math.hypot(...L.MOONWARD);
  return {
    moon: { toward: L.MOONWARD.map((v) => v / m), color: times(linear(L.LIGHT.moon.color), L.LIGHT.moon.power), spread: L.LIGHT.moon.spread * L.D2R },
    core: { at: [...L.CORE.at], r: L.CORE.r, color: times(linear(L.LIGHT.core.color), L.LIGHT.core.power), fall: L.LIGHT.core.fall },
    sky: times(linear(L.LIGHT.sky.color), L.LIGHT.sky.power),
  };
}
// The stored bounce is kept as the square root of its share of LIGHT.bounce, which holds the darks finely.
export const storeBounce = (v) => Math.sqrt(Math.min(1, Math.max(0, v / L.LIGHT.bounce)));
