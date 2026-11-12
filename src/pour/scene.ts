// The test shot's layout, in units. Only this is planned: where the pour starts and what is solid.
// Everything the pour does after that is the simulation.

export interface Slab {
  // Center, half size and corner radius.
  cx: number;
  cy: number;
  hx: number;
  hy: number;
  r: number;
}

export interface Scene {
  // Size of the view in units, and how many CSS pixels one unit is.
  w: number;
  h: number;
  unit: number;
  // Where the pour comes in and which way it is heading.
  spout: { x: number; y: number; dx: number; dy: number };
  slabs: Slab[];
  // Particles past these edges are gone.
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

const WIDE = { w: 1440, h: 900 };
const TALL = { w: 720 };

// The slab: half its thickness, its corner radius, its length on a wide screen and as a share of a tall one, and how far
// along it the pour lands. More of the pour runs on the way it was already heading, so that side is the longer one.
const SLAB = { half: 15, corner: 5, wide: 420, tall: 0.42, landing: 0.46 };

export function layout(cssW: number, cssH: number, flight: { lean: number; speed: number; gravity: number }): Scene {
  const lean = flight.lean;
  const wide = cssW >= cssH;
  const unit = wide ? Math.min(cssW / WIDE.w, cssH / WIDE.h) : cssW / Math.min(900, Math.max(TALL.w, cssW * 0.9));
  const w = cssW / unit;
  const h = cssH / unit;
  const len = Math.hypot(lean, 1);
  const spoutDir = { dx: lean / len, dy: 1 / len };
  const top = wide ? h * 0.52 : h * 0.44;
  const length = wide ? SLAB.wide : w * SLAB.tall;
  const x0 = w * 0.5 - length * 0.5;
  const x1 = x0 + length;
  const slabs: Slab[] = [{ cx: (x0 + x1) / 2, cy: top + SLAB.half, hx: (x1 - x0) / 2, hy: SLAB.half, r: SLAB.corner }];
  // The spout is placed so that a stream in free fall lands where the layout wants it.
  const spoutY = -24;
  const vy = flight.speed * spoutDir.dy;
  const fall = (-vy + Math.sqrt(vy * vy + 2 * flight.gravity * (top - spoutY))) / flight.gravity;
  const spoutX = x0 + length * SLAB.landing - flight.speed * spoutDir.dx * fall;
  return {
    w,
    h,
    unit,
    spout: { x: spoutX, y: spoutY, ...spoutDir },
    slabs,
    bounds: { x0: -60, y0: -120, x1: w + 60, y1: h + 30 },
  };
}

// Signed distance to a slab and the direction away from it, written into out as [distance, nx, ny].
export function slabDistance(s: Slab, x: number, y: number, out: Float32Array): void {
  const px = x - s.cx;
  const py = y - s.cy;
  const qx = Math.abs(px) - (s.hx - s.r);
  const qy = Math.abs(py) - (s.hy - s.r);
  const sx = px < 0 ? -1 : 1;
  const sy = py < 0 ? -1 : 1;
  if (qx > 0 && qy > 0) {
    const l = Math.hypot(qx, qy);
    out[0] = l - s.r;
    out[1] = (sx * qx) / l;
    out[2] = (sy * qy) / l;
  } else if (qx > qy) {
    out[0] = qx - s.r;
    out[1] = sx;
    out[2] = 0;
  } else {
    out[0] = qy - s.r;
    out[1] = 0;
    out[2] = sy;
  }
}
