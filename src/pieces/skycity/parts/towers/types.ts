import { City, K, bays, beam, box, cap, circle, cyl, disc, gorge, lathe, ledge, loft, parapet, point, prism, punched, quad, rect, scale, shift, turn, type Level, type Ring, type V3, type XZ } from './shape';

// The family of buildings: a future city with the forms of ancient Egypt in it, dense, and of one family. Walls lean
// in as they rise, are cut by deep channels and sunk openings, and end in gorge cornices; stone is dark and worn, and
// polished metal is kept to the edges and the crowns that catch the moon.
//
// The low rows are terraces: a block of several lots built as one long building against its neighbours, an arcade
// along its street front lit from within, a body pierced by openings built in depth, and over its cornice masses set
// back each its own, with roofs that are lived on. The tall towers rise from podiums of the same kind: a slab
// held between stepped buttresses with one slot of light, stacks of battered drums under an obelisk, ziggurats, an
// obelisk tower, a channelled tower whose crown is a saucer, a mass or steps, and pairs of pylons joined at the top
// into a gate in the sky.
//
// A design builds in its own frame (x across, z out toward the rim, y up from the street) in units, into the city's
// buffers, and says where its beacons stand.

// Which of its faces the page's view sees: its front (+z), its right (+x), its back (-z) and its left (-x).
export type Seen = [boolean, boolean, boolean, boolean];
export interface Tower {
  // The lot's width and depth, and how tall this tower is, from the street.
  w: number;
  d: number;
  h: number;
  r: () => number;
  // What the bevels of its corners are.
  edge: number;
  // Whether it stands where it is seen only as a dark shape at the back of the city, and is built plainly.
  simple: boolean;
  // The height its foot stands at: the top of the podium it rises from, or the street.
  y0: number;
  seen: Seen;
  // Clad whole in polished metal, its own (the table says which), and not stone.
  clad?: boolean;
}
export interface Made { beacons: V3[]; reach: number }
export type Design = (b: City, t: Tower) => Made;

// The bevel on every corner that is not round, in units.
const BEV = 1.4;
const { glass, stone, plain, dark, gold, bronze, copper, clad, light, lobby, louvre, roof, accent, pod, glyph, slot, deep, sky } = K;
const ringXZ = (x0: number, x1: number, z0: number, z1: number): Ring => [[x1, z1], [x1, z0], [x0, z0], [x0, z1]];
const median = (a: number[]): number => [...a].sort((p, q) => p - q)[Math.floor(a.length / 2)];

// Each segment's kind from where its middle is and how long it is.
function kindsBy(ring: Ring, f: (mx: number, mz: number, len: number) => number): number[] {
  return ring.map((q, i) => { const n = ring[(i + 1) % ring.length]; return f((q[0] + n[0]) / 2, (q[1] + n[1]) / 2, Math.hypot(n[0] - q[0], n[1] - q[1])); });
}
// A ring at every level, scaled from its size at the foot to its size at the top.
function taper(ring: Ring, y0: number, y1: number, s1x: number, s1z = s1x, n = 2): Level[] {
  return Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return { y: y0 + (y1 - y0) * t, ring: scale(ring, 1 + (s1x - 1) * t, 1 + (s1z - 1) * t) }; });
}
// A square with a channel let into the middle of each face, so wide (a share of the face) and so deep, and bevelled
// corners. Its segments, in order on each face: pier, channel side, channel back, channel side, pier, bevel.
function notched(s: number, share: number, deep: number, c = BEV): Ring {
  const h = s / 2, nw = (s * share) / 2;
  const side: Ring = [[h, h - c], [h, nw], [h - deep, nw], [h - deep, -nw], [h, -nw], [h, -h + c]];
  return [0, 1, 2, 3].flatMap((k) => turn(side, (-k * Math.PI) / 2));
}
const NOTCH_KINDS = (pier: number, back: number, edge: number) => [0, 1, 2, 3].flatMap(() => [pier, dark, back, dark, pier, edge]);


// Four walls of a mass from x0 to x1 and from zb to zf, its front leaning back by lean for every unit it rises. Each
// face is its kind, or left out at -1 where a neighbour stands against it. A front given openings is pierced in depth.
interface Open { cols: number; rows: number; ow: number; dd: number; solid: number; r: () => number; oh?: number; sill?: number }
function walls(b: City, x0: number, x1: number, zb: number, zf: number, y0: number, y1: number, lean: number, k: [number, number, number, number], o?: Open): void {
  const zt = zf - lean * (y1 - y0), was = b.head;
  b.head = y1;
  const W = x1 - x0, D = zf - zb, f = { foot: y0, head: y1 };
  if (o) {
    const st = (y1 - y0) / o.rows;
    punched(b, { x0, x1, y0, y1, z0: zf, lean, cols: o.cols, rows: o.rows, ow: o.ow, oh: st * (o.oh ?? 0.52), dd: o.dd, sill: st * (o.sill ?? 0.28), wall: plain, jamb: plain, r: o.r, solid: o.solid });
  } else if (k[0] >= 0) quad(b, [[x0, y0, zf], [x1, y0, zf], [x1, y1, zt], [x0, y1, zt]], [0, lean, 1], k[0], { ...f, bays: bays(k[0], W) });
  if (k[1] >= 0) quad(b, [[x1, y0, zf], [x1, y0, zb], [x1, y1, zb], [x1, y1, zt]], [1, 0, 0], k[1], { ...f, bays: bays(k[1], D) });
  if (k[2] >= 0) quad(b, [[x1, y0, zb], [x0, y0, zb], [x0, y1, zb], [x1, y1, zb]], [0, 0, -1], k[2], { ...f, bays: bays(k[2], W) });
  if (k[3] >= 0) quad(b, [[x0, y0, zb], [x0, y0, zf], [x0, y1, zt], [x0, y1, zb]], [-1, 0, 0], k[3], { ...f, bays: bays(k[3], D) });
  b.head = was;
}
// Openings for a face so wide and so tall: about one every six units across and one storey every eight up.
const opens = (W: number, H: number, r: () => number, solid = 0.12, pitch = 6.2): Open => ({ cols: Math.max(2, Math.round(W / pitch)), rows: Math.max(1, Math.round(H / 8.2)), ow: Math.min(2.6, (W / Math.max(2, Math.round(W / pitch))) * 0.45), dd: 1.6, solid, r });
// How a terrace's front is opened: tall slits two storeys high, few and deep; a sparse grid; or a loggia, a gallery
// of square piers sunk deep under the cornice.
const FRONTS = { niches: 0, slits: 1 } as const;
// The giant order: niches the height of the body, deep, between heavy piers, with the floors of their rooms set
// far back inside them. It is what lets a building read as immense.
const niches = (W: number, H: number, r: () => number): Open => { const cols = Math.max(2, Math.round(W / (6.5 + 3 * r()))); return { cols, rows: Math.max(1, Math.round(H / 34)), ow: (W / cols) * (0.5 + 0.18 * r()), dd: 2.8, solid: 0.1, r, oh: 0.86, sill: 0.07 }; };
const slits = (W: number, H: number, r: () => number): Open => ({ cols: Math.max(2, Math.round(W / (5 + 2 * r()))), rows: Math.max(1, Math.round(H / 14)), ow: 1.5, dd: 2.2, solid: 0.3, r, oh: 0.82, sill: 0.09 });
const loggia = (W: number, r: () => number): Open => { const cols = Math.max(3, Math.round(W / 4.4)); return { cols, rows: 1, ow: (W / cols) * 0.7, dd: 3.4, solid: 0, r, oh: 0.8, sill: 0.06 }; };

// A face opened in one way up to a loggia under its top, or all one way.
function front(b: City, x0: number, x1: number, zb: number, zf: number, y0: number, y1: number, lean: number, k: [number, number, number, number], way: number, gallery: boolean, r: () => number): void {
  const W = x1 - x0, L = 7.5;
  const low = (ya: number, yb: number, z: number) => walls(b, x0, x1, zb, z, ya, yb, lean, k, way === FRONTS.slits ? slits(W, yb - ya, r) : niches(W, yb - ya, r));
  if (gallery && y1 - y0 > L + 8) {
    low(y0, y1 - L, zf);
    walls(b, x0, x1, zb, zf - lean * (y1 - L - y0), y1 - L, y1, lean, k, loggia(W, r));
  } else low(y0, y1, zf);
}

// A slim mast with a light on its tip.
function mast(b: City, x: number, y: number, z: number, h: number, r = 0.45): V3 {
  cyl(b, x, y, z, r, h, 6, dark);
  cyl(b, x, y + h, z, r * 1.6, 0.9, 6, light);
  return [x, y + h + 0.5, z];
}
// A capstone that floats: a lit core in a gap, and a gold pyramid over it. Returns the tip.
function capstone(b: City, s: number, y: number, gap: number, steep = 1.0, kind: number = gold): V3 {
  prism(b, rect(s * 0.28, s * 0.28), y, y + gap, light, { lid: false });
  const r = rect(s, s, Math.min(BEV, s * 0.06)), top: V3 = [0, y + gap + s * 0.5 * steep * 1.3, 0];
  cap(b, r, y + gap, dark, true);
  point(b, r, y + gap, top, kind, kind);
  return top;
}
// A crown for a tower whose top is s across at y, dealt so that few end alike: a gold capstone floating on light, a
// lantern of lit glass under a dark lid with a gold edge, a saucer held on a stem, or a flat top with a small pylon
// gate on it. Returns the beacons.
function crown(b: City, s: number, y: number, r: () => number, capShare = 0.3): V3[] {
  const k = r();
  if (k < capShare) return [capstone(b, s * 0.9, y, 2.4, 1.1)];
  if (r() < 0.4) return [dome(b, 0, y, 0, s * 0.4, r)];
  if (k < capShare + (1 - capShare) * 0.4) {
    const R = s * 0.32, H = Math.max(3, s * 0.22);
    lathe(b, [[R * 1.15, y], [R * 1.15, y + 1.2]], 24, dark);
    lathe(b, [[R, y + 1.2], [R, y + 1.2 + H]], 24, pod);
    lathe(b, [[R * 1.3, y + 1.2 + H], [R * 1.3, y + 1.9 + H], [R * 0.6, y + 2.8 + H], [0.3, y + 3.1 + H]], 24, [gold, dark, dark], { smooth: false });
    return [[0, y + 3.2 + H, 0]];
  }
  if (k < capShare + (1 - capShare) * 0.7) {
    const R = Math.min(s * 0.7, 16), ys = y + 3 + s * 0.15;
    lathe(b, [[s * 0.12, y], [s * 0.08, ys - 1]], 12, dark);
    lathe(b, [[0.4, ys - 2], [R * 0.55, ys - 1.4], [R, ys + 0.3], [R, ys + 1.6], [R * 0.5, ys + 2.9], [0.4, ys + 3.2]], 32, [dark, gold, pod, dark, dark], { smooth: false });
    return [[0, ys + 3.3, 0]];
  }
  const pw = s * 0.26, pd = s * 0.3, ph = s * 0.42, gap = s * 0.16;
  for (const sx of [-1, 1]) {
    const ring = shift(rect(pw, pd, 0.3), sx * (gap / 2 + pw / 2), 0);
    loft(b, [{ y, ring }, { y: y + ph, ring: shift(rect(pw * 0.8, pd * 0.8, 0.3), sx * (gap / 2 + pw * 0.45), 0) }], plain);
    gorge(b, shift(rect(pw * 0.8, pd * 0.8, 0.3), sx * (gap / 2 + pw * 0.45), 0), y + ph, 0.9, 0.4, plain, gold);
  }
  box(b, 0, y, 0, gap + 0.4, ph * 0.6, pd * 0.4, lobby, roof);
  return [[0, y + ph + 1, 0]];
}

// An obelisk standing at (x, z) from y: its shaft so wide at its foot and so tall to the foot of its pyramidion,
// which is gold.
function obelisk(b: City, x: number, y: number, z: number, s: number, tall: number): V3 {
  const top = s * 0.62, ring = shift(rect(s, s, Math.min(0.5, s * 0.08)), x, z);
  loft(b, [{ y, ring }, { y: y + tall, ring: shift(rect(top, top, Math.min(0.4, s * 0.06)), x, z) }], plain, { edge: gold });
  const tip: V3 = [x, y + tall + top * 0.9, z];
  point(b, shift(rect(top, top), x, z), y + tall, tip, gold);
  return tip;
}

// What stands on a roof that is lived on: water tanks, the head of a stair with a lit door, a small shrine, a
// skylight, now and then a mast. rich is a roof the page's view looks down on.
function roofThings(b: City, x0: number, x1: number, z0: number, z1: number, y: number, r: () => number, rich: boolean): V3[] {
  const W = x1 - x0, D = z1 - z0, out: V3[] = [];
  if (W < 7 || D < 6) return out;
  parapet(b, ringXZ(x0 + 0.3, x1 - 0.3, z0 + 0.3, z1 - 0.3), y, 1.1, 0.5, plain);
  const n = rich ? 1 + Math.floor(r() * Math.min(4, W / 7)) : Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const slotW = (W - 3) / n, cx = x0 + 1.5 + slotW * (i + 0.5) + (r() - 0.5) * slotW * 0.3, cz = z0 + 2 + (D - 4) * (0.25 + 0.5 * r()), k = r();
    const room = Math.min(slotW * 0.8, D - 4);
    if (room < 2.5) continue;
    if (k < 0.16) {
      const tr = Math.min(2.6, room * 0.3), m = r() < 0.35 ? bronze : dark;
      cyl(b, cx - tr * 1.05, y, cz, tr, 2.0 + 0.8 * r(), 10, dark, m);
      if (room > 7) cyl(b, cx + tr * 1.05, y, cz, tr * 0.85, 1.8 + 0.6 * r(), 10, dark, dark);
    } else if (k < 0.55) {
      const kw = Math.min(4.4, room), kd = Math.min(3.4, D - 4);
      box(b, cx, y, cz, kw, 3.4, kd, plain, roof);
      quad(b, [[cx - 0.8, y + 0.1, cz + kd / 2 + 0.04], [cx + 0.8, y + 0.1, cz + kd / 2 + 0.04], [cx + 0.8, y + 2.5, cz + kd / 2 + 0.04], [cx - 0.8, y + 2.5, cz + kd / 2 + 0.04]], [0, 0, 1], deep, { frac: [0.001, 0.999, 0.999, 0.001], bays: 1, foot: y + 0.1, head: y + 2.5 });
    } else if (k < 0.72) {
      const sw = Math.min(3.6, room), sh = 4.5 + 2 * r(), base = rect(sw, sw * 0.7);
      loft(b, [{ y, ring: shift(base, cx, cz) }, { y: y + sh, ring: shift(scale(base, 0.78), cx, cz) }], plain);
      gorge(b, shift(scale(base, 0.78), cx, cz), y + sh, 1.3, 0.5, plain, gold);
      out.push([cx, y + sh + 1.3, cz]);
    } else if (k < 0.84) {
      // A skylight over a lit hall: its glass glows from below.
      const sw = Math.min(6, room), sd = Math.min(3.8, D - 4);
      box(b, cx, y, cz, sw + 0.8, 0.6, sd + 0.8, plain, plain);
      quad(b, [[cx - sw / 2, y + 0.65, cz + sd / 2], [cx + sw / 2, y + 0.65, cz + sd / 2], [cx + sw / 2, y + 0.65, cz - sd / 2], [cx - sw / 2, y + 0.65, cz - sd / 2]], [0, 1, 0], r() < 0.55 ? lobby : sky);
    } else if (k < 0.96) {
      box(b, cx, y, cz, Math.min(5, room), 1.8, Math.min(3, D - 4), louvre, dark);
    } else out.push(mast(b, cx, y, cz, 7 + 8 * r(), 0.25));
  }
  return out;
}

// The share of the masses over a terrace's cornice that carry a dome.
const DOMES = 0.2;
// A dome of polished metal on a drum of stone, ribbed so it carries the room's strip lights as bright lines, with a
// gold finial: copper mostly, now and then gold or bronze.
function dome(b: City, x: number, y: number, z: number, R: number, r: () => number): V3 {
  const m = r() < 0.6 ? copper : r() < 0.5 ? gold : bronze, dr = 1.6 + R * 0.25;
  lathe(b, [[R * 1.08, y], [R * 1.08, y + dr], [R * 1.14, y + dr + 0.5]], 24, [plain, gold], { cx: x, cz: z });
  const prof: [number, number][] = Array.from({ length: 7 }, (_, i) => { const a = (i / 6) * (Math.PI / 2); return [Math.max(0.15, R * Math.cos(a)), y + dr + 0.5 + R * 0.92 * Math.sin(a)]; });
  lathe(b, prof, 28, m, { cx: x, cz: z });
  const top = y + dr + 0.5 + R * 0.92;
  lathe(b, [[0.5, top - 0.2], [0.35, top + 1.6], [0.05, top + 2.6]], 8, gold, { cx: x, cz: z });
  return [x, top + 2.7, z];
}

// An awning on a roof terrace: a dark slab on four posts, and the warm light under it on the paving.
function awning(b: City, x: number, y: number, z: number, w: number, d: number): void {
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) box(b, x + sx * (w / 2 - 0.3), y, z + sz * (d / 2 - 0.3), 0.45, 3, 0.45, dark, dark);
  box(b, x, y + 3, z, w + 0.6, 0.35, d + 0.6, dark, dark);
  quad(b, [[x - w / 2, y + 0.08, z + d / 2], [x + w / 2, y + 0.08, z + d / 2], [x + w / 2, y + 0.08, z - d / 2], [x - w / 2, y + 0.08, z - d / 2]], [0, 1, 0], lobby);
}

// A stretch of a row, the width of one lot, in the frame of the block it is part of: where it runs across, and how
// tall it stands.
export interface Section { x0: number; x1: number; h: number; tower?: boolean }
export interface Terrace {
  // How deep the block is, its stretches from left to right, and how it is dealt.
  D: number;
  sections: Section[];
  r: () => number;
  seen: Seen;
  simple: boolean;
  // A podium for towers: built to this height and no higher.
  podium?: number;
  // How many setbacks a stretch may rise in over the block's cornice.
  steps: number;
  // The roll of its cornices: stone, or one of the metals.
  roll: number;
}
// A block of a row, built as one long building: at the street an arcade whose shops are lit, a body that leans back
// as it rises, pierced by openings in depth, under one cornice the length of the block (lower stretches at its ends
// have their own), and over it, on each stretch, masses set back from the front, each its own, with terraces and
// roofs that are lived on. Returns the beacons' places.
export function terrace(b: City, t: Terrace): { beacons: V3[]; top: number } {
  const { D, sections: S, r, seen, simple } = t;
  const zf = D / 2, zb = -D / 2, A = 7 + 2.5 * r(), lint = 1.3, ad = 3.4, g = 2.2 + 0.8 * r();
  const lean = simple ? 0 : 0.08 + 0.06 * r();
  const fronted = seen[0] && !simple, way = r() < 0.8 ? FRONTS.niches : FRONTS.slits, gallery = r() < 0.45;
  const Hb = t.podium ?? Math.max(A + 12, Math.round(median(S.map((s) => s.h)) * (0.5 + 0.2 * r())));
  const body = S.map((s) => (t.podium ? t.podium : s.tower ? Hb : s.h < Hb + 8 ? Math.max(A + 10, Math.round(s.h)) : Hb));
  // The street wall is not one line: a stretch now and then stands back from it.
  const inset = S.map(() => (simple || r() > 0.32 ? 0 : 2.5 + 4 * r()));
  const y0 = fronted ? A - lint : -2, beacons: V3[] = [];
  const zTop = (top: number, k: number) => zf - inset[k] - lean * (top - y0);
  const face = (on: boolean) => (on && !simple ? stone : plain);
  if (fronted) S.forEach((s, si) => {
    const W = s.x1 - s.x0, zs = zf - inset[si];
    if (r() < 0.3) {
      // A solid base, battered, with a lit door or two.
      prism(b, ringXZ(s.x0, s.x1, zb, zs), -2, y0 + 0.02, plain, { lid: false });
      const n = 1 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        const cx = s.x0 + (W * (i + 0.5)) / n, dw = 1.6 + r();
        quad(b, [[cx - dw / 2, 0.2, zs + 0.05], [cx + dw / 2, 0.2, zs + 0.05], [cx + dw / 2, y0 - 1.6, zs + 0.05], [cx - dw / 2, y0 - 1.6, zs + 0.05]], [0, 0, 1], deep, { frac: [i + 0.001, i + 0.999, i + 0.999, i + 0.001], bays: 1, foot: 0, head: y0 - 1.6 });
      }
      return;
    }
    const nb = Math.max(2, Math.round(W / (4.5 + 2 * r()))), bw = W / nb;
    prism(b, ringXZ(s.x0, s.x1, zb, zs - ad), -2, y0 + 0.02, plain, { lid: false });
    for (let i = 0; i < nb; i++) {
      const xa = s.x0 + i * bw + 0.75, xc = s.x0 + (i + 1) * bw - 0.75, z = zs - ad + 0.05, col = i + 0.001;
      quad(b, [[xa, 0.2, z], [xc, 0.2, z], [xc, y0 - 0.3, z], [xa, y0 - 0.3, z]], [0, 0, 1], deep, { frac: [col, col + 0.998, col + 0.998, col], bays: 1, foot: 0, head: y0 });
    }
    for (let i = 0; i <= nb; i++) box(b, s.x0 + i * bw + (i === 0 ? 0.75 : i === nb ? -0.75 : 0), -1, zs - 0.8, 1.5, y0 + 1, 1.5, plain, plain);
    quad(b, [[s.x0, 0.12, zs], [s.x1, 0.12, zs], [s.x1, 0.12, zs - ad], [s.x0, 0.12, zs - ad]], [0, 1, 0], roof);
  });
  // The body, in runs of stretches that end at one height and stand at one line.
  for (let i = 0; i < S.length;) {
    let j = i;
    while (j + 1 < S.length && body[j + 1] === body[i] && inset[j + 1] === inset[i]) j++;
    const x0 = S[i].x0, x1 = S[j].x1, top = body[i], zs = zf - inset[i];
    const kL = i === 0 || body[i - 1] < top || inset[i - 1] > inset[i] ? face(seen[3]) : -1;
    const kR = j === S.length - 1 || body[j + 1] < top || inset[j + 1] > inset[i] ? face(seen[1]) : -1;
    const k: [number, number, number, number] = [fronted ? -1 : stone, kR, face(seen[2]), kL];
    if (fronted) front(b, x0, x1, zb, zs, y0, top, lean, k, way, gallery && !t.podium, r);
    else walls(b, x0, x1, zb, zs, y0, top, lean, k);
    gorge(b, ringXZ(x0, x1, zb, zTop(top, i)), top, g, 1.1, plain, t.roll);
    i = j + 1;
  }
  if (t.podium) return { beacons, top: Hb + g };
  // What rises over the cornice, stretch by stretch: a battered pylon with a slot of dark glass down its face, a
  // stack of setbacks, or a low hall whose front is a colonnade.
  S.forEach((s, k) => {
    if (s.tower) return;
    let y = body[k] + g;
    const zt = zTop(body[k], k);
    if (s.h < y + 6) { beacons.push(...roofThings(b, s.x0 + 0.5, s.x1 - 0.5, zb + 0.5, zt - 0.5, y, r, fronted)); return; }
    let ux0 = s.x0 + (r() < 0.45 ? 0.3 : 2 + 3 * r()), ux1 = s.x1 - (r() < 0.45 ? 0.3 : 2 + 3 * r());
    let uzf = zt - (5 + 6 * r());
    const uzb = zb + (r() < 0.5 ? 0.6 : 3 + 3 * r());
    if (fronted && r() < 0.65) { const aw = Math.min(7, (ux1 - ux0) * 0.4), ad2 = Math.min(3.6, zt - uzf - 1.2); if (ad2 > 1.5) awning(b, ux0 + aw / 2 + 1 + (ux1 - ux0 - aw - 2) * r(), y, (zt + uzf) / 2, aw, ad2); }
    const kind = r(), sides: [number, number, number, number] = [fronted ? -1 : stone, face(seen[1]), face(seen[2]), face(seen[3])];
    if (kind < 0.42) {
      const W = ux1 - ux0, Dd = uzf - uzb, cx = (ux0 + ux1) / 2, cz = (uzf + uzb) / 2, yt = s.h - 2.2, bx = 0.86, bz = 0.8;
      const ch = channelled(W, Dd, 1, 0, 0.14, 1.6, 0.6);
      loft(b, [{ y, ring: shift(ch.ring, cx, cz) }, { y: yt, ring: shift(scale(ch.ring, bx, bz), cx, cz) }], plain, { kinds: ch.role.map((q) => [face(true), dark, slot, plain][q]) });
      const tr = shift(rect(W * bx, Dd * bz, 0.6), cx, cz);
      gorge(b, tr, yt, 2.2, 1.0, plain, t.roll);
      y = yt + 2.2; ux0 = cx - (W * bx) / 2; ux1 = cx + (W * bx) / 2; uzf = cz + (Dd * bz) / 2;
      if (r() < DOMES) beacons.push(dome(b, cx, y, cz, Math.min(W * bx, Dd * bz) * 0.42, r));
      else beacons.push(...roofThings(b, ux0, ux1, cz - (Dd * bz) / 2, uzf, y, r, fronted));
      return;
    }
    if (kind < 0.62) {
      const yt = Math.min(s.h - 1.8, y + 8 + 2 * r());
      walls(b, ux0, ux1, uzb, uzf, y, yt, 0, sides, fronted ? loggia(ux1 - ux0, r) : undefined);
      gorge(b, ringXZ(ux0, ux1, uzb, uzf), yt, 1.8, 0.9, plain, t.roll === plain ? gold : t.roll);
      beacons.push(...roofThings(b, ux0, ux1, uzb, uzf, yt + 1.8, r, fronted));
      return;
    }
    const tiers = s.h - y > 30 && t.steps > 1 ? 2 : 1;
    for (let q = 0; q < tiers; q++) {
      const yt = q === tiers - 1 ? s.h - 1.8 : y + (s.h - y) * (0.55 + 0.1 * r());
      const W = ux1 - ux0;
      if (fronted) front(b, ux0, ux1, uzb, uzf, y, yt, 0.04, sides, way, q === tiers - 1 && r() < 0.5, r);
      else walls(b, ux0, ux1, uzb, uzf, y, yt, 0.04, sides);
      const uzt = uzf - 0.04 * (yt - y);
      gorge(b, ringXZ(ux0, ux1, uzb, uzt), yt, 1.8, 0.9, plain, q === tiers - 1 ? t.roll : plain);
      y = yt + 1.8;
      if (q < tiers - 1) {
        const ins = 2 + 3 * r();
        if (fronted && r() < 0.5) awning(b, (ux0 + ux1) / 2, y, uzt - 2.4, Math.min(6, W * 0.4), 2.6);
        ux0 += ins; ux1 -= ins; uzf = uzt - (4 + 4 * r());
      } else uzf = uzt;
    }
    if (r() < DOMES) beacons.push(dome(b, (ux0 + ux1) / 2, y, (uzb + uzf) / 2, Math.min(ux1 - ux0, uzf - uzb) * 0.42, r));
    else beacons.push(...roofThings(b, ux0, ux1, uzb, uzf, y, r, fronted));
  });
  return { beacons, top: Hb + g };
}

// The channelled faces of a tower: a mass whose faces are cut by deep vertical channels between piers, nx channels
// across each face along x and nz along each face along z, together so much of the face, each so deep, with bevelled
// corners. Each segment's role: 0 pier, 1 channel side, 2 channel back, 3 bevel.
function channelled(W: number, D: number, nx: number, nz: number, share: number, deep: number, c = BEV): { ring: Ring; role: number[] } {
  const P: XZ[] = [[W / 2, D / 2], [W / 2, -D / 2], [-W / 2, -D / 2], [-W / 2, D / 2]];
  const ring: Ring = [], role: number[] = [];
  for (let i = 0; i < 4; i++) {
    const a = P[i], e = P[(i + 1) % 4], L = Math.hypot(e[0] - a[0], e[1] - a[1]), u: XZ = [(e[0] - a[0]) / L, (e[1] - a[1]) / L], inn: XZ = [u[1], -u[0]];
    const at = (t: number, k = 0): XZ => [a[0] + u[0] * t + inn[0] * k, a[1] + u[1] * t + inn[1] * k];
    const n = i % 2 === 0 ? nz : nx, span = L - 2 * c, cw = (span * share) / Math.max(1, n);
    ring.push(at(c)); role.push(0);
    for (let k = 0; k < n; k++) {
      const t = c + ((k + 0.5) / n) * span;
      ring.push(at(t - cw / 2)); role.push(1);
      ring.push(at(t - cw / 2, deep)); role.push(2);
      ring.push(at(t + cw / 2, deep)); role.push(1);
      ring.push(at(t + cw / 2)); role.push(0);
    }
    ring.push(at(L - c)); role.push(3);
  }
  return { ring, role };
}

// A plan folded into flutes: each face of a W by D rectangle, or the round of a circle, made of V folds about pitch
// wide and so deep, ridge and valley in turn, with bevelled corners. Built so for a tower of polished metal: the
// folds are wide enough for the page to draw, and each face of a fold turns the room's strip lights and the moon
// its own way, so the metal reads by what it reflects. Flutes worked in the shader at that size crawled. Roles are
// as channelled's, all of them pier.
function fluted(W: number, D: number, pitch: number, deep: number, c = BEV): { ring: Ring; role: number[] } {
  const P: XZ[] = [[W / 2, D / 2], [W / 2, -D / 2], [-W / 2, -D / 2], [-W / 2, D / 2]];
  const ring: Ring = [];
  for (let i = 0; i < 4; i++) {
    const a = P[i], e = P[(i + 1) % 4], L = Math.hypot(e[0] - a[0], e[1] - a[1]), u: XZ = [(e[0] - a[0]) / L, (e[1] - a[1]) / L], inn: XZ = [u[1], -u[0]];
    const at = (t: number, k = 0): XZ => [a[0] + u[0] * t + inn[0] * k, a[1] + u[1] * t + inn[1] * k];
    const span = L - 2 * c, n = Math.max(2, Math.round(span / pitch)), st = span / n;
    for (let k = 0; k < n; k++) { ring.push(at(c + k * st)); ring.push(at(c + (k + 0.5) * st, deep)); }
    ring.push(at(L - c));
  }
  return { ring, role: ring.map(() => 0) };
}
function flutedRound(R: number, n: number, deep: number): { ring: Ring; role: number[] } {
  const ring: Ring = [];
  for (let i = 0; i < 2 * n; i++) { const a = -(i / (2 * n)) * Math.PI * 2, r = i % 2 ? R - deep : R; ring.push([Math.cos(a) * r, Math.sin(a) * r]); }
  return { ring, role: ring.map(() => 0) };
}
// The plan of a tower's mass: fluted if it is clad, channelled if it is stone.
const FLUTE = { pitch: 5, deep: 1.1 };
const plan = (t: Tower, W: number, D: number, nx: number, nz: number, share: number, deep: number) => (t.clad ? fluted(W, D, FLUTE.pitch, FLUTE.deep) : channelled(W, D, nx, nz, share, deep));

// A round plan of so many sides, every other one cut by a deep channel, so wide (a share of the side) and so deep.
// Roles as for channelled: 0 pier, 1 channel side, 2 channel back, 3 a plain side.
function channelledPoly(R: number, sides: number, share: number, deep: number): { ring: Ring; role: number[] } {
  const P = circle(R, sides, 0, 0, R, Math.PI / sides), ring: Ring = [], role: number[] = [];
  for (let i = 0; i < sides; i++) {
    const a = P[i], e = P[(i + 1) % sides];
    ring.push(a);
    if (i % 2) { role.push(3); continue; }
    const L = Math.hypot(e[0] - a[0], e[1] - a[1]), u: XZ = [(e[0] - a[0]) / L, (e[1] - a[1]) / L], inn: XZ = [u[1], -u[0]];
    const at = (t: number, k = 0): XZ => [a[0] + u[0] * t + inn[0] * k, a[1] + u[1] * t + inn[1] * k];
    role.push(0);
    ring.push(at(L * (0.5 - share / 2))); role.push(1);
    ring.push(at(L * (0.5 - share / 2), deep)); role.push(2);
    ring.push(at(L * (0.5 + share / 2), deep)); role.push(1);
    ring.push(at(L * (0.5 + share / 2))); role.push(0);
  }
  return { ring, role };
}

// A great slab held between buttresses that step down outward, its front and back each cut by one slot of light the
// height of the slab, under a gorge cornice with a gold roll, and on its top two obelisks or a gold disc.
export const buttress: Design = (b, t) => {
  const { w, d, h, r, y0 } = t;
  const W = w * 0.62, D = d * 0.5, top = h - 5, run = top - y0;
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
    const bw = w * 0.065, x = sx * (W / 2 + bw * (k + 0.5) - 0.3), hk = y0 + run * (0.74 - 0.2 * k), bd = D * (1.15 - 0.1 * k);
    const lo = shift(rect(bw + 0.2, bd, 0.5), x, 0), hi = shift(rect(bw * 0.8, bd * 0.8, 0.4), x - sx * bw * 0.25, 0);
    loft(b, [{ y: y0, ring: lo }, { y: hk, ring: hi }], plain, { edge: plain });
    gorge(b, shift(rect(bw * 0.8, bd * 0.8, 0.4), x - sx * bw * 0.25, 0), hk, 1.6, 0.6, plain, plain);
  }
  const ch = plan(t, W, D, 1, 0, 0.13, 3.4);
  loft(b, [{ y: y0, ring: ch.ring }, { y: top, ring: scale(ch.ring, 0.92, 0.86) }], plain, { kinds: ch.role.map((k) => [t.clad ? clad : stone, dark, light, t.edge][k]) });
  for (const f of [0.34, 0.67]) { const y = y0 + run * f; ledge(b, scale(rect(W, D, BEV), 1 - 0.08 * f, 1 - 0.14 * f), y + 1.2, 1.2, 0.4, plain); }
  gorge(b, scale(rect(W, D, BEV), 0.92, 0.86), top, 4, 1.9, plain, gold);
  const y = top + 4;
  if (r() < 0.55) {
    const s = Math.min(4.2, D * 0.3);
    return { beacons: [obelisk(b, -W * 0.3, y, D * 0.2, s, 12 + 6 * r()), obelisk(b, W * 0.3, y, D * 0.2, s, 12 + 6 * r())], reach: W / 2 + w * 0.2 };
  }
  const R = Math.min(8, W * 0.16);
  box(b, 0, y, 0, W * 0.4, 3, D * 0.5, plain, roof, 0.4);
  disc(b, 0, y + 3 + R + 0.8, D * 0.1, R, 1.4, 36, gold, gold);
  disc(b, 0, y + 3 + R + 0.8, D * 0.1 + 0.9, R * 0.55, 0.6, 28, light, gold);
  return { beacons: [[0, y + 4 + 2 * R, 0]], reach: W / 2 + w * 0.2 };
};

// Battered drums stacked, each narrower than the one under it, their walls cut by channels between piers, a ring of
// gold at each step, and on the last an obelisk with a gold pyramidion.
export const drums: Design = (b, t) => {
  const { w, d, h, r, y0 } = t;
  const R0 = Math.min(w, d) * 0.5, crownH = (h - y0) * (0.2 + 0.06 * r()), run = h - crownH - y0, shares = [0.44, 0.32, 0.24];
  let y = y0, R = R0;
  for (let k = 0; k < 3; k++) {
    const hk = run * shares[k], cp = t.clad ? flutedRound(R, Math.max(10, Math.round((2 * Math.PI * R) / FLUTE.pitch)), FLUTE.deep) : channelledPoly(R, 14, 0.42, 2.0), Rt = R * 0.9;
    loft(b, [{ y, ring: cp.ring }, { y: y + hk - 1.6, ring: scale(cp.ring, 0.9) }], plain, { kinds: cp.role.map((q) => [t.clad ? clad : stone, dark, slot, t.clad ? clad : plain][q]) });
    lathe(b, [[Rt + 0.2, y + hk - 1.6], [Rt + 1.3, y + hk - 1.1], [Rt + 1.3, y + hk - 0.4], [Rt + 0.8, y + hk]], 28, [gold, gold, gold]);
    cap(b, circle(Rt + 0.8, 28), y + hk, roof);
    y += hk; R *= 0.76;
  }
  const s = R * 1.05;
  if (r() < 0.55) return { beacons: crown(b, R * 1.6, y, r, 0), reach: R0 };
  loft(b, taper(notched(s, 0.3, 1.0, 0.5), y, h - s * 0.8, 0.62), plain, { kinds: NOTCH_KINDS(plain, light, gold) });
  const tip: V3 = [0, h, 0];
  point(b, rect(s * 0.62, s * 0.62), h - s * 0.8, tip, gold, gold);
  return { beacons: [tip], reach: R0 };
};

// A ziggurat tower: tiers stepping in as they rise, each taller than the one under it, each face pierced by openings
// built in depth on the faces that are seen, a line of polished metal at every step, and over the last a gold
// capstone that floats on light.
export const ziggurat: Design = (b, t) => {
  const { w, d, h, r, y0, seen, simple } = t;
  const n = 4 + Math.floor(r() * 3), shrink = 0.8 + 0.04 * r(), ws: number[] = [];
  let s = 1;
  for (let k = 0; k < n; k++) { ws.push(s); s *= shrink; }
  const sum = ws.reduce((a, _, k) => a + 1 + 0.22 * k, 0), run = h - y0 - Math.min(w, d) * s * 0.75 - 2;
  let y = y0;
  for (let k = 0; k < n; k++) {
    const tw = w * 0.94 * ws[k], td = d * 0.9 * ws[k], hk = (run * (1 + 0.22 * k)) / sum, yt = y + hk;
    const side = (on: boolean) => (on && !simple ? stone : plain);
    if (t.clad) loft(b, [{ y, ring: fluted(tw, td, FLUTE.pitch, FLUTE.deep).ring }, { y: yt, ring: fluted(tw, td, FLUTE.pitch, FLUTE.deep).ring }], clad);
    else walls(b, -tw / 2, tw / 2, -td / 2, td / 2, y, yt, 0, [side(seen[0]), side(seen[1]), side(seen[2]), side(seen[3])], seen[0] && !simple ? opens(tw, hk, r, 0.3) : undefined);
    cap(b, ringXZ(-tw / 2, tw / 2, -td / 2, td / 2), yt, roof);
    ledge(b, rect(tw, td), yt + 0.7, 0.7, 0.4, k === n - 1 ? gold : plain);
    y = yt + 0.7;
  }
  return { beacons: crown(b, Math.min(w, d) * s, y, r, 0.3), reach: w / 2 };
};

// A tower whose upper third becomes an obelisk: a battered mass cut by channels, bound by bands, under a gorge
// cornice with a gold roll, and out of it a shaft with gold corners and a slot of light in each face, and a gold
// pyramidion.
export const needle: Design = (b, t) => {
  const { w, d, h, r, y0 } = t;
  const W = w * 0.86, D = d * 0.82, mid = y0 + (h - y0) * (0.5 + 0.1 * r()), bx = 0.84;
  const ch = plan(t, W, D, Math.max(1, Math.round(W / 16)), 1, 0.3, 3.2);
  loft(b, [{ y: y0, ring: ch.ring }, { y: mid, ring: scale(ch.ring, bx, bx) }], plain, { kinds: ch.role.map((k) => [t.clad ? clad : stone, dark, slot, t.edge][k]) });
  for (let y = y0 + 24; y < mid - 6; y += 24) { const k = 1 - ((1 - bx) * (y - y0)) / (mid - y0); ledge(b, scale(rect(W, D, BEV), k, k), y + 1.4, 1.4, 0.45, plain); }
  gorge(b, scale(rect(W, D, BEV), bx, bx), mid, 3.4, 1.6, plain, gold);
  const s = Math.min(W, D) * bx * 0.5, sh = h - mid - 3.4 - s * 0.62 * 0.9;
  loft(b, taper(notched(s, 0.26, 1.2, 0.6), mid + 3.4, mid + 3.4 + sh, 0.62), plain, { kinds: NOTCH_KINDS(plain, light, gold) });
  const tip: V3 = [0, h, 0];
  point(b, rect(s * 0.62, s * 0.62), mid + 3.4 + sh, tip, gold, gold);
  return { beacons: [tip], reach: W / 2 + 1 };
};

// The channelled tower: a mass whose walls lean in as they rise, cut by deep channels between piers, bound by bands,
// under a gorge cornice, and crowned by a saucer of the future held on a stem, a smaller mass of its kind, or steps
// with a gold disc standing on them.
export const pylonTower: Design = (b, t) => {
  const { w, d, h, r, y0 } = t;
  const W = w * 0.9, D = d * 0.86, bx = 0.8 + 0.06 * r(), bz = 0.82;
  const crownH = Math.max(14, (h - y0) * (0.14 + 0.06 * r())), top = h - crownH;
  const ch = plan(t, W, D, Math.max(1, Math.round(W / 18)), 1, 0.34, 3.6);
  const kinds = ch.role.map((k) => [t.clad ? clad : stone, dark, slot, t.edge][k]);
  loft(b, [{ y: y0, ring: ch.ring }, { y: top, ring: scale(ch.ring, bx, bz) }], plain, { kinds, foot: y0 });
  const base = rect(W, D, BEV);
  for (let y = y0 + 30; y < top - 8; y += 30) { const k = 1 - ((1 - bx) * (y - y0)) / (top - y0), kz = 1 - ((1 - bz) * (y - y0)) / (top - y0); ledge(b, scale(base, k, kz), y + 1.6, 1.6, 0.5, plain); }
  gorge(b, scale(base, bx, bz), top, 3.6, 1.8, plain, accent);
  const cw = W * bx * (0.55 + 0.1 * r()), cd = D * bz * 0.6, yc = top + 3.6, crown = r();
  if (crown < 0.35) {
    // A saucer on a stem: a lens of dark metal with a band of lit glass round its rim and a gold edge.
    const R = Math.min(W * 0.62, 20), stem = crownH * 0.45, ys = yc + stem;
    lathe(b, [[cw * 0.22, yc], [cw * 0.16, ys - 1]], 16, dark);
    lathe(b, [[0.5, ys - 2.4], [R * 0.55, ys - 1.6], [R * 0.96, ys - 0.2], [R, ys + 0.5], [R, ys + 2.1], [R * 0.95, ys + 2.6], [R * 0.5, ys + 3.8], [0.5, ys + 4.2]], 40, [dark, dark, gold, pod, gold, dark, dark], { smooth: false });
    return { beacons: [mast(b, 0, ys + 4.2, 0, 8 + 6 * r(), 0.35)], reach: Math.max(W / 2, R) + 1 };
  }
  if (crown < 0.68) {
    const c2 = channelled(cw, cd, 1, 1, 0.3, 3);
    loft(b, [{ y: yc, ring: c2.ring }, { y: h - 3, ring: scale(c2.ring, 0.86, 0.86) }], plain, { kinds: c2.role.map((k) => [t.clad ? clad : stone, dark, slot, t.edge][k]) });
    gorge(b, scale(rect(cw, cd, BEV), 0.86, 0.86), h - 3, 3, 1.2, plain, gold);
    return { beacons: [], reach: W / 2 + 1 };
  }
  let y = yc, sw = cw, sd = cd;
  for (let i = 0; i < 3; i++) { prism(b, rect(sw, sd, BEV * 0.6), y, y + (crownH - 9) / 3, plain, { lid: roof, edge: i === 2 ? gold : plain }); y += (crownH - 9) / 3; sw *= 0.72; sd *= 0.72; }
  const R = Math.min(sw, 9) * 0.9;
  box(b, 0, y, 0, 1.2, R * 0.6, 1.2, dark, dark);
  disc(b, 0, y + R * 0.6 + R, 0, R, 1.0, 36, gold, gold);
  return { beacons: [[0, y + R * 0.6 + 2 * R, 0]], reach: W / 2 + 1 };
};

// Two pylons on two lots side by side, leaning toward each other, each cut by a slot of light, joined by decks of
// lit glass and at their tops by a lintel under a gorge cornice: a gate in the sky, with a sun disc hung in it. In
// the frame of the block, the two at xa and xb.
export function twin(b: City, xa: number, xb: number, w: number, d: number, h: number, y0: number, r: () => number): V3[] {
  const mid = (xa + xb) / 2, gap = Math.abs(xb - xa), tw = Math.min(w * 0.85, gap * 0.6), td = d * 0.62, bat = 0.76, hp = h - 9;
  const lean = (x: number) => (mid - x) * 0.08, out: V3[] = [];
  for (const x of [xa, xb]) {
    const ch = channelled(tw, td, 1, 0, 0.15, 2.8);
    loft(b, [{ y: y0, ring: shift(ch.ring, x, 0) }, { y: hp, ring: shift(scale(ch.ring, bat, 0.84), x + lean(x), 0) }], plain, { kinds: ch.role.map((k) => [stone, dark, light, gold][k]) });
    for (const f of [0.3, 0.6]) { const y = y0 + (hp - y0) * f; ledge(b, shift(scale(rect(tw, td, BEV), 1 - (1 - bat) * f, 1 - 0.16 * f), x + lean(x) * f, 0), y + 1.4, 1.4, 0.45, plain); }
  }
  const inner = (y: number) => { const f = (y - y0) / (hp - y0); return gap - tw * (1 - (1 - bat) * f) - 2 * Math.abs(lean(xa)) * f; };
  for (const f of [0.36, 0.62]) {
    const y = y0 + (hp - y0) * f, span = inner(y) + 3;
    box(b, mid, y, 0, span, 6.5, td * 0.46, pod, roof, 0.4);
    box(b, mid, y + 6.5, 0, span + 0.6, 0.8, td * 0.5, gold, gold);
    box(b, mid, y - 0.5, 0, span, 0.5, td * 0.3, light, light);
  }
  const lw = gap + tw * bat + 2, ld = td * 0.84;
  box(b, mid, hp, 0, lw, 5, ld, plain, roof, 0.5);
  gorge(b, shift(rect(lw, ld, BEV), mid, 0), hp + 5, 3.4, 1.5, plain, gold);
  const R = Math.max(3, Math.min(inner(hp) * 0.32, 9));
  box(b, mid, hp - 3.2, 0, 0.8, 3.2, 0.8, dark, dark);
  disc(b, mid, hp - 3.2 - R, td * 0.15, R, 1.4, 40, gold, gold);
  disc(b, mid, hp - 3.2 - R, td * 0.15 + 0.9, R * 0.55, 0.6, 28, light, gold);
  out.push(mast(b, mid - lw * 0.38, hp + 8.4, 0, 6 + 4 * r(), 0.35), mast(b, mid + lw * 0.38, hp + 8.4, 0, 6 + 4 * r(), 0.35));
  return out;
}

// A deck that joins two towers of a block high up: a slab of dark stone with a band of lit glass, a gold edge on top
// and a line of light under it, from xa to xb at y.
export function deck(b: City, xa: number, xb: number, y: number, depth: number): void {
  const mid = (xa + xb) / 2, span = Math.abs(xb - xa);
  box(b, mid, y, 0, span, 3, depth, dark, roof, 0.4);
  box(b, mid, y + 3, 0, span - 2, 3.2, depth * 0.7, pod, roof, 0.3);
  box(b, mid, y + 6.2, 0, span, 0.7, depth, gold, gold);
  box(b, mid, y - 0.45, 0, span - 1, 0.45, depth * 0.3, light, light);
}

// A cartouche standing proud of a battered face: centred at x on the face that faces z (+1 front, -1 back), so wide,
// from y0 to y1, following the face as it leans in. face(y) is where the face is out from the middle at a height,
// and at(y) where the cartouche's middle is across at a height.
function cartouche(b: City, x: (y: number) => number, face: (y: number) => number, side: number, wide: (y: number) => number, y0: number, y1: number): void {
  const ring = (y: number): Ring => { const f = face(y), w = wide(y) / 2, cx = x(y); return side > 0 ? [[cx + w, f + 0.3], [cx + w, f - 0.4], [cx - w, f - 0.4], [cx - w, f + 0.3]] : [[cx + w, -f + 0.4], [cx + w, -f - 0.3], [cx - w, -f - 0.3], [cx - w, -f + 0.4]]; };
  loft(b, [{ y: y0, ring: ring(y0) }, { y: y1, ring: ring(y1) }], glyph, { foot: y0 });
  cap(b, ring(y1), y1, gold);
  cap(b, ring(y0), y0, gold, true);
}
// Two stone steps under a tower.
function plinth(b: City, w: number, d: number, steps = 2): number {
  let y = 0;
  for (let i = 0; i < steps; i++) { box(b, 0, y, 0, w + 2 * (steps - i) * 1.6, 1.6, d + 2 * (steps - i) * 1.6, plain, plain, 0.4); y += 1.6; }
  return y;
}
// Four floors, in units: the step of the bands of stone that bind a building.
const REL = { storey: 12 };
// The podium a landmark stands on: battered stone, a course every two floors, and a gorge cornice. Returns the
// height of its top.
function podium(b: City, W: number, D: number, h: number, r: () => number): number {
  const base = rect(W, D, BEV), bat = 0.9;
  loft(b, taper(base, 0, h, bat), stone, { edge: plain });
  for (let y = REL.storey * 0.5; y < h - 2; y += REL.storey * 0.5) ledge(b, scale(base, 1 + (bat - 1) * (y / h)), y, 0.7, 0.25, plain);
  const g = 2.6 + r();
  gorge(b, scale(base, bat), h, g, 1.3, r() < 0.7 ? plain : bronze, plain);
  return h + g;
}

// The gate: two pylons with a bridge between them high up, a winged sun disc over the bridge, and a lit gate between
// their feet under a lintel.
export const gate: Design = (b, t) => {
  const { h } = t;
  const tw = 27, td = 17, gap = 17, cx = gap / 2 + tw / 2, bat = 0.72;
  const hp = h - 4.2;
  const out: V3[] = [];
  for (const sx of [-1, 1]) {
    const ring = shift(rect(tw, td, BEV), sx * cx, 0);
    const kinds = kindsBy(ring, (mx, mz, len) => (len < 1.7 ? gold : Math.abs(mz) > td * 0.45 ? stone : plain));
    loft(b, taper(ring, 0, hp, bat, bat).map((l) => ({ y: l.y, ring: shift(scale(rect(tw, td, BEV), 1 + (bat - 1) * (l.y / hp)), sx * cx * (1 + (0.93 - 1) * (l.y / hp)), 0) })), stone, { kinds });
    const topR = shift(rect(tw * bat, td * bat, BEV), sx * cx * 0.93, 0);
    const k = (y: number) => 1 + (bat - 1) * (y / hp);
    for (const side of [1, -1]) cartouche(b, (y) => sx * cx * (1 + (0.93 - 1) * (y / hp)), (y) => (td / 2) * k(y), side, (y) => tw * 0.26 * k(y), hp * 0.3, hp * 0.88);
    gorge(b, topR, hp, 4.2, 2.2, gold, gold);
    out.push(mast(b, sx * cx * 0.93, h, 0, 9, 0.4));
  }
  const inner = cx * 0.93 - (tw * bat) / 2, yb = h * 0.66;
  box(b, 0, 0, -2.5, gap + 2, h * 0.2, 2, pod, roof);
  box(b, 0, h * 0.2, 0, gap + 4, 3.2, td * 0.7, gold, gold, 0.3);
  // The bridge, its glass lit in bands, a line of light under it.
  box(b, 0, yb, 0, inner * 2 + 3, 8.5, 12, pod, roof, 0.4);
  box(b, 0, yb - 0.6, 0, inner * 2 + 3.4, 0.6, 12.4, light, light);
  box(b, 0, yb + 8.5, 0, inner * 2 + 3.6, 1.0, 13, gold, gold);
  // The winged sun disc.
  const yd = yb + 15;
  // The disc and its wings stand before the gate's face, the wings spread across both pylons.
  const zf = (td / 2) * bat + 1.6, span = cx * 0.93 + (tw * bat) / 2 - 2;
  disc(b, 0, yd, zf, 5.2, 1.4, 40, gold, gold);
  disc(b, 0, yd, zf + 1.0, 3.0, 0.8, 32, light, gold);
  // Each wing is four rows of feathers, longest at the top, swept a little up toward their tips.
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
    const y = yd + 1.9 - i * 1.5, len = span - i * 4.5;
    beam(b, [sx * 4.0, y, zf - i * 0.2], [sx * len, y + 1.6 - i * 0.35, zf - i * 0.2], 0.9, 1.3, i % 2 ? copper : gold);
  }
  return { beacons: out, reach: cx + tw / 2 + 2 };
};

// The great obelisk: a podium of battered stone with cartouches and a gorge cornice, and on it a shaft of stone,
// gold corners, glass in its channels with a line of light up each, gold bands, and a gold pyramidion.
export const great: Design = (b, t) => {
  const { w, d, h } = t;
  const hp = 16, base = rect(w * 0.95, d * 0.95, BEV);
  loft(b, taper(base, 0, hp, 0.9), stone, { edge: plain });
  const face = (y: number) => (d * 0.95 / 2) * (1 + (0.9 - 1) * (y / hp));
  for (const sx of [-1, 1]) cartouche(b, () => sx * w * 0.28, face, 1, () => w * 0.12, 3, hp - 3);
  gorge(b, scale(base, 0.9), hp, 3.4, 1.6, gold, gold);
  const s0 = Math.min(w, d) * 0.6, k = 0.6, y0 = hp + 3.4;
  const top = h - s0 * k * 0.72 - 1.6;
  loft(b, taper(notched(s0, 0.3, 2.2), y0, top, k), stone, { kinds: NOTCH_KINDS(plain, slot, gold) });
  const s1 = s0 * k;
  // A line of light up the middle of each channel, and gold bands that bind the shaft.
  for (let q = 0; q < 4; q++) {
    const a = (-q * Math.PI) / 2, at = (y: number, out: number): V3 => { const sc = 1 + (k - 1) * ((y - y0) / (top - y0)), r = (s0 / 2) * sc - 1.6 * sc + out; return [Math.cos(a) * r, y, -Math.sin(a) * r]; };
    beam(b, at(y0 + 2, 0.35), at(top - 1, 0.35), 0.5, 0.5, light);
  }
  for (const f of [0.22, 0.5, 0.76]) { const y = y0 + (top - y0) * f, sc = 1 + (k - 1) * f; ledge(b, rect(s0 * sc, s0 * sc, BEV * sc), y + 2, 2, 0.6, gold); }
  ledge(b, rect(s1, s1, BEV * 0.6), top + 1.2, 1.2, 0.5, gold);
  const tip = capstone(b, s1, top + 1.2, 1.4, 1.1);
  return { beacons: [tip], reach: s0 / 2 + 6 };
};

// The Pharos: a lighthouse of the old world made a tower of this one. A battered square base, an octagon, a drum,
// each finished by a ledge of gold, and at the top a lantern of glass with light in it under a gold cupola.
export const pharos: Design = (b, t) => {
  const { w, d, h } = t;
  const S = Math.min(w, d) * 0.95, y1 = h * 0.5, y2 = h * 0.78, y3 = h * 0.9;
  plinth(b, S, S, 2);
  const sq = rect(S, S, BEV);
  loft(b, taper(sq, 3.2, y1, 0.86), stone, { edge: gold });
  for (let y = 3.2 + REL.storey * 2; y < y1 - 3; y += REL.storey * 2) ledge(b, scale(sq, 1 + (0.86 - 1) * ((y - 3.2) / (y1 - 3.2))), y, 0.8, 0.3, plain);
  ledge(b, scale(sq, 0.86), y1 + 1.6, 1.6, 0.8, gold);
  cap(b, scale(sq, 0.86), y1, roof);
  const oct = circle(S * 0.34, 8, 0, 0, S * 0.34, Math.PI / 8);
  loft(b, taper(oct, y1, y2, 0.9), stone, { edge: light });
  ledge(b, scale(oct, 0.9), y2 + 1.4, 1.4, 0.7, gold);
  cap(b, scale(oct, 0.9), y2, roof);
  const R = S * 0.24;
  lathe(b, [[R, y2], [R * 0.94, y3]], 32, glass);
  ledge(b, circle(R * 0.94, 32), y3 + 1.2, 1.2, 0.9, gold, { round: true });
  const L = R * 0.62, yl = y3 + 1.2;
  lathe(b, [[L, yl], [L, yl + 9]], 24, pod);
  cyl(b, 0, yl, 0, L * 0.55, 8.5, 16, light, light);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; beam(b, [Math.cos(a) * L * 1.04, yl, Math.sin(a) * L * 1.04], [Math.cos(a) * L * 1.04, yl + 9, Math.sin(a) * L * 1.04], 0.7, 0.7, gold); }
  const dome: [number, number][] = Array.from({ length: 6 }, (_, i) => { const a = (i / 5) * (Math.PI / 2); return [Math.max(0.05, L * 1.15 * Math.cos(a)), yl + 9 + L * 0.9 * Math.sin(a)]; });
  lathe(b, dome, 24, gold);
  const tip = mast(b, 0, yl + 9 + L * 0.9, 0, Math.max(4, h - yl - 9 - L * 0.9), 0.45);
  return { beacons: [tip], reach: S / 2 + 4 };
};

// The round pylon carried on a colonnade: sixteen columns with papyrus capitals round a lit hall, a lintel ring, and
// on it a round mass whose walls lean in as they rise, cut by deep channels between piers, bound by bands, under a
// gorge cornice, with steps of stone and a gold disc standing on its top facing out.
export const colonnade: Design = (b, t) => {
  const { h } = t;
  const Rc = 25, n = 16, hc = Math.min(30, h * 0.16), R = 22, sides = 20, top = h - 14, bat = 0.76;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, x = Math.cos(a) * Rc, z = Math.sin(a) * Rc;
    lathe(b, [[2.6, 0], [2.6, 1.0], [1.9, 1.4], [1.8, hc * 0.55], [1.6, hc - 4.5], [1.8, hc - 4.0], [3.1, hc - 1.6], [3.3, hc - 1.0]], 12, [plain, plain, plain, plain, accent, accent, accent], { cx: x, cz: z });
    box(b, x, hc - 1.0, z, 6.4, 1.0, 6.4, accent, accent);
  }
  lathe(b, [[15, 0], [15, hc]], 32, lobby);
  lathe(b, [[Rc + 3.6, hc], [Rc + 3.6, hc + 3.5], [Rc + 3.2, hc + 3.9]], 48, [gold, gold]);
  cap(b, circle(Rc + 3.6, 48), hc, dark, true);
  cap(b, circle(Rc + 3.2, 48), hc + 3.9, roof);
  const y0 = hc + 3.9, cp = channelledPoly(R, sides, 0.45, 3.2);
  loft(b, [{ y: y0, ring: cp.ring }, { y: top, ring: scale(cp.ring, bat) }], plain, { kinds: cp.role.map((k) => [plain, dark, slot, plain][k]) });
  const outline = circle(R, sides, 0, 0, R, Math.PI / sides);
  for (let y = y0 + REL.storey * 2; y < top - 6; y += REL.storey * 2) ledge(b, scale(outline, 1 - ((1 - bat) * (y - y0)) / (top - y0)), y + 1.6, 1.6, 0.5, (y - y0) % (REL.storey * 6) < 1 ? gold : plain);
  gorge(b, scale(outline, bat), top, 3.6, 1.8, gold, gold);
  let y = top + 3.6, rr = R * bat * 0.72;
  for (let i = 0; i < 2; i++) { lathe(b, [[rr, y], [rr * 0.94, y + 3.4]], 24, plain); cap(b, circle(rr * 0.94, 24), y + 3.4, roof); y += 3.4; rr *= 0.7; }
  const D = Math.min(7, rr * 1.4);
  box(b, 0, y, 0, 1.2, 2, 1.2, dark, dark);
  disc(b, 0, y + 2 + D, 0, D, 1.2, 36, gold, gold);
  return { beacons: [[0, y + 2 + 2 * D, 0]], reach: Rc + 4 };
};

// A sail of leaning stone fins: a podium, and on it five thin walls of stone side by side, each taller than the last,
// each leaning in as it rises and cut with tall openings on its narrow front, dark glass between them, a gold edge
// down each front and a gorge cornice of gold on each.
export const sail: Design = (b, t) => {
  const { w, d, h, r } = t;
  const y0 = podium(b, w * 0.95, d * 0.95, 9, r), n = 5, gap = (w * 0.8) / n, D = d * 0.8, fw = Math.max(4.5, gap * 0.42);
  const beacons: V3[] = [];
  for (let i = 0; i < n; i++) {
    const x = -w * 0.4 + gap * (i + 0.5), hi = h * (0.55 + 0.45 * (i / (n - 1))), lean = -(i - (n - 1) / 2) * 1.6;
    const lo = shift(rect(fw, D, BEV), x, 0), hiR = shift(rect(fw * 0.7, D * 0.42, BEV * 0.7), x + lean, -D * 0.18);
    const kinds = kindsBy(lo, (mx, mz, len) => (len < 1.7 ? gold : mz > D * 0.45 ? slot : plain));
    loft(b, [{ y: y0, ring: lo }, { y: hi - 3, ring: hiR }], plain, { kinds });
    gorge(b, hiR, hi - 3, 3, 0.9, gold, gold);
    const frontAt = (y: number): V3 => { const k = (y - y0) / (hi - 3 - y0); return [x + lean * k, y, D / 2 + (-D * 0.18 + (D * 0.42) / 2 - D / 2) * k + 0.35]; };
    beam(b, frontAt(y0), frontAt(hi - 3), 0.8, 0.8, light);
    if (i < n - 1) box(b, x + gap / 2, y0, -D * 0.1, gap - fw, hi * 0.5 - y0, D * 0.5, glass, roof);
    if (i === n - 1) beacons.push([x + lean, hi + 0.5, -D * 0.18]);
  }
  return { beacons, reach: w / 2 + 2 };
};

// The two that flank the end of the way to the spire, where it leaves the city at the middle of the screen: a pylon
// on two steps, its walls leaning in, cut on its front and its sides by a deep portal with the floors of its rooms
// far inside, cartouches either side, a portico of fluted columns of polished bronze with gold capitals before the
// front portal, bands of stone and one of gold, a gorge cornice with a gold roll, and over it a crown stepping up in
// polished gold to a lantern and a mast.
export const flank: Design = (b, t) => {
  const { w, d, h, r } = t;
  const y0 = plinth(b, w * 0.9, d * 0.8, 2), W = w * 0.86, D = d * 0.74, hp = h * 0.74, bx = 0.82, bz = 0.8;
  const ch = channelled(W, D, 1, 1, 0.26, 4.2);
  loft(b, [{ y: y0, ring: ch.ring }, { y: hp, ring: scale(ch.ring, bx, bz) }], plain, { kinds: ch.role.map((k) => [clad, dark, deep, gold][k]) });
  const lean = (y: number) => 1 + (bx - 1) * ((y - y0) / (hp - y0)), face = (y: number) => (D / 2) * (1 + (bz - 1) * ((y - y0) / (hp - y0)));
  for (const sx of [-1, 1]) cartouche(b, (y) => sx * W * 0.33 * lean(y), face, 1, (y) => W * 0.13 * lean(y), y0 + (hp - y0) * 0.2, y0 + (hp - y0) * 0.86);
  for (const f of [0.34, 0.67]) { const y = y0 + (hp - y0) * f; ledge(b, scale(rect(W, D, BEV), lean(y), 1 + (bz - 1) * f), y + 1.4, 1.4, 0.5, f > 0.5 ? gold : plain); }
  gorge(b, scale(rect(W, D, BEV), bx, bz), hp, 4.4, 2.0, plain, gold);
  // The portico before the front portal.
  const cw = (W - 2 * BEV) * 0.26, ch2 = (hp - y0) * 0.42, zc = D / 2 + 3.2;
  for (const x of [-cw * 1.15, -cw * 0.4, cw * 0.4, cw * 1.15]) lathe(b, [[1.9, y0], [1.9, y0 + 0.8], [1.45, y0 + 1.3], [1.35, y0 + ch2 * 0.7], [1.2, y0 + ch2 - 3.2], [1.5, y0 + ch2 - 2.6], [2.6, y0 + ch2 - 0.9], [2.7, y0 + ch2]], 16, [plain, plain, bronze, bronze, gold, gold, gold], { cx: x, cz: zc });
  box(b, 0, y0 + ch2, zc - 0.6, cw * 2.3 + 6, 2.6, 5.4, plain, roof, 0.4);
  box(b, 0, y0 + ch2 + 2.6, zc - 0.6, cw * 2.3 + 6.6, 0.7, 6, gold, gold);
  quad(b, [[-cw * 1.2, 0.2, D / 2 + 0.3], [cw * 1.2, 0.2, D / 2 + 0.3], [cw * 1.2, 0.2, zc + 3], [-cw * 1.2, 0.2, zc + 3]], [0, 1, 0], lobby);
  // The crown: steps of polished gold, a lantern, a mast.
  let y = hp + 4.4, s = Math.min(W * bx, D * bz) * 0.7;
  for (let i = 0; i < 3; i++) { prism(b, rect(s, s * 0.8, 0.8), y, y + 3.4, gold, { lid: gold, edge: gold }); y += 3.4; s *= 0.74; }
  lathe(b, [[s * 0.42, y], [s * 0.42, y + 4.5]], 20, pod);
  lathe(b, [[s * 0.55, y + 4.5], [s * 0.55, y + 5.2], [0.3, y + 7.4]], 20, [gold, gold], { smooth: false });
  return { beacons: [mast(b, 0, y + 7.4, 0, Math.max(4, h - y - 7.4), 0.4)], reach: W / 2 + 4 };
};

export const TALL = { buttress, drums, ziggurat, needle, pylonTower } as const;
export type TallName = keyof typeof TALL;
export const LANDMARK = { great, pharos, gate, colonnade, sail, flank } as const;
