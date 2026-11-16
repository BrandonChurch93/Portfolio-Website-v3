// The layers behind and between the traced slabs: plates laid in the picture's own places, layer behind layer, so
// that wherever a gap opens between the great slabs there is a broken edge further back and dark under it.
import { L } from '../../lib/plan.mjs';
import { skinZ } from './shape.mjs';

export const CORE_PX = L.pictured(...L.CORE.at);
const U = L.PICTURE.unit;
// How far toward the visitor the cave's wall is at so many of the picture's pixels from the core's middle: the
// cave opens toward the visitor like a funnel.
export const cave = (r) => 16 + 0.0042 * (r * U) ** 2;

// A plate's outline: a rough many sided figure about a place, so long along a direction.
function outline(cx, cy, r, aspect, angle, rnd) {
  const k = 5 + Math.floor(rnd() * 3), pts = [], c = Math.cos(angle), s = Math.sin(angle);
  for (let i = 0; i < k; i++) {
    const a = (2 * Math.PI * (i + 0.35 * (rnd() - 0.5))) / k, rr = r * (0.7 + 0.4 * rnd());
    const u = Math.cos(a) * rr * aspect, v = Math.sin(a) * rr;
    pts.push([cx + u * c - v * s, cy + u * s + v * c]);
  }
  return pts;
}

// Places in a region, no two nearer than gap, the same every run.
function scatter(rnd, inside, box, gap, tries = 4000) {
  const out = [];
  for (let i = 0; i < tries; i++) {
    const x = box[0] + rnd() * (box[2] - box[0]), y = box[1] + rnd() * (box[3] - box[1]);
    if (!inside(x, y)) continue;
    if (out.some(([a, b]) => (a - x) ** 2 + (b - y) ** 2 < gap * gap)) continue;
    out.push([x, y]);
  }
  return out;
}

const [PX, PY] = CORE_PX;
const ring = (x, y) => Math.hypot(x - PX, (y - PY) * 1.25);
const skinAt = (px, py) => { let z = 300; for (let i = 0; i < 4; i++) { const p = L.fromPicture(px, py, z); z = skinZ(p[0], p[1]); } return z; };

export function fill(rnd) {
  const specs = [];
  const add = (s) => specs.push(s);
  // The back of the cave, round the core, deep behind the traced slabs: what shows in their gaps.
  for (const [x, y] of scatter(rnd, (x, y) => ring(x, y) > 80 && ring(x, y) < 230 && y < 545, [450, 300, 930, 560], 58)) {
    const r = ring(x, y), ang = Math.atan2(y - PY, x - PX);
    add({ id: 'back', o: outline(x, y, 34 + 22 * rnd(), 1.3 + 0.6 * rnd(), ang + Math.PI / 2 + (rnd() - 0.5) * 0.8, rnd), z: Math.max(4 + 30 * rnd(), cave(r) - 50 - 30 * rnd()), n: { c: 0.8, yaw: (rnd() - 0.5) * 40, pitch: (rnd() - 0.5) * 40 }, t: 30 + 20 * rnd(), steps: 2 });
  }
  // Outside the cave, in front: broken masses turned from the core and from the moon, in two layers.
  const torn = (x, y) => x > 300 && x < 1040 && y > 340 && ring(x, y) > 235;
  for (const layer of [0, 1]) for (const [x, y] of scatter(rnd, torn, [290, 330, 1050, 700], layer ? 150 : 124)) {
    const behind = layer ? 170 + 80 * rnd() : 40 + 50 * rnd(), sk = skinAt(x, y);
    const z = Math.min(sk - behind, cave(ring(x, y)) + (layer ? -40 : 40));
    if (z < 60) continue;
    add({ id: 'outer', o: outline(x, y, (layer ? 46 : 36) + 24 * rnd(), 1.3 + 0.9 * rnd(), rnd() * Math.PI, rnd), z, n: [(x < PX ? -1 : 0.3) * (8 + 30 * rnd()), -30 + 26 * rnd()], t: 18 + 18 * rnd(), lean: [-42, 4] });
  }
  // Under the roof's front edge: plates that hang from it and turn down toward the core.
  for (let x = 470; x < 940; x += 34 + 26 * rnd()) {
    if (Math.abs(x - PX) < 85) continue;
    const y = 340 + 16 * rnd(), mid = L.fromPicture(x, y, 300);
    add({ id: 'fringe', o: outline(x, y, 16 + 12 * rnd(), 1.5 + 0.7 * rnd(), (rnd() - 0.5) * 0.6, rnd), z: L.lip(mid[0]) - 30 - 50 * rnd(), n: [(PX - x) * 0.08 + (rnd() - 0.5) * 20, -30 - 20 * rnd()], t: 14 + 10 * rnd() });
  }
  return specs;
}
