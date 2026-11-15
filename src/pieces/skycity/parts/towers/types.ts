import { City, K, beam, box, cap, circle, cyl, disc, gorge, lathe, ledge, loft, offset, point, prism, rect, scale, shift, turn, type Level, type Ring, type V3, type XZ } from './shape';

// The family of buildings: a future city with the forms of ancient Egypt in it. Every design is a different idea:
// an obelisk with a gold pyramidion, a pylon whose walls lean in under a gorge cornice, a gate of two pylons with a
// winged sun disc over the bridge between them, a shaft with a stepped crown and a capstone that floats, a drum of
// ring decks, a tower that flares at its top like a lotus column, a tower carried on a colonnade, a saucer on a
// stalk, pods held out on arms, a sail that sweeps up to a blade. Behind the core, a low older town: domed houses,
// courts, terraces, roofs with windcatchers.
//
// A design builds one tower in its own frame (x across the lot, z out toward the rim) in units, into the city's
// buffers, and says where its beacons stand.

export interface Tower {
  // The lot's width and depth, and how tall this tower is.
  w: number;
  d: number;
  h: number;
  r: () => number;
  // What its main walls are: glass, stone or clad metal.
  face: number;
  // What the bevels of its corners are.
  edge: number;
  // Whether its glass walls wear fins of metal standing off them.
  fins: boolean;
}
export interface Made { beacons: V3[]; reach: number }
export type Design = (b: City, t: Tower) => Made;

// The bevel on every corner that is not round, in units.
const BEV = 1.0;
const { glass, stone, plain, dark, gold, bronze, copper, clad, light, lobby, louvre, roof, accent, pod, sky, glyph } = K;

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

const norm2 = (x: number, z: number): [number, number] => { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; };

// Fins of the tower's metal standing off the long faces of a ring, from y0 to y1, about one to every so many units.
const FIN = { every: 4.4, out: 0.9, wide: 0.45 };
function fins(b: City, ring: Ring, y0: number, y1: number): void {
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (len < 6) continue;
    // The outward normal of an anticlockwise ring's segment. The rings fins go on are square to the tower.
    const n = Math.floor(len / FIN.every), ox = -(c[1] - a[1]) / len, oz = (c[0] - a[0]) / len, across = Math.abs(ox) > Math.abs(oz);
    for (let k = 1; k < n; k++) {
      const t = k / n, x = a[0] + (c[0] - a[0]) * t + ox * FIN.out * 0.5, z = a[1] + (c[1] - a[1]) * t + oz * FIN.out * 0.5;
      box(b, x, y0, z, across ? FIN.out : FIN.wide, y1 - y0, across ? FIN.wide : FIN.out, accent);
    }
  }
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

// A slim mast with a light on its tip.
function mast(b: City, x: number, y: number, z: number, h: number, r = 0.45): V3 {
  cyl(b, x, y, z, r, h, 6, dark);
  cyl(b, x, y + h, z, r * 1.6, 0.9, 6, light);
  return [x, y + h + 0.5, z];
}
// Two stone steps under a tower.
function plinth(b: City, w: number, d: number, steps = 2): number {
  let y = 0;
  for (let i = 0; i < steps; i++) { box(b, 0, y, 0, w + 2 * (steps - i) * 1.6, 1.6, d + 2 * (steps - i) * 1.6, plain, plain, 0.4); y += 1.6; }
  return y;
}
// A capstone that floats: a lit core in a gap, and a gold pyramid over it. Returns the tip.
function capstone(b: City, s: number, y: number, gap: number, steep = 1.0, kind: number = gold): V3 {
  prism(b, rect(s * 0.28, s * 0.28), y, y + gap, light, { lid: false });
  const r = rect(s, s, Math.min(BEV, s * 0.06)), top: V3 = [0, y + gap + s * 0.5 * steep * 1.3, 0];
  cap(b, r, y + gap, dark, true);
  point(b, r, y + gap, top, kind, kind);
  return top;
}

// The obelisk: a square shaft that tapers all the way up, a channel of glass let into each face, its corners picked
// out, a lip, and a gold pyramidion over a lit gap.
export const obelisk: Design = (b, t) => {
  const { w, d, h, r } = t;
  const s0 = Math.min(w, d) * 0.9, k = 0.58 + 0.08 * r(), y0 = plinth(b, s0, s0);
  const top = h - s0 * k * 0.68 - 1.6;
  const ring = notched(s0, 0.3 + 0.12 * r(), 1.1);
  loft(b, taper(ring, y0, top, k), t.face, { kinds: NOTCH_KINDS(t.face === stone ? plain : t.face, glass, t.edge) });
  const s1 = s0 * k;
  // Bands of the tower's metal round the shaft, each with a line of light under it.
  const bands = 2 + Math.floor(r() * 2);
  for (let i = 1; i <= bands; i++) {
    const y = y0 + ((top - y0) * i) / (bands + 1), sc = 1 + (k - 1) * ((y - y0) / (top - y0)), sq = rect(s0 * sc, s0 * sc, BEV * 0.6);
    ledge(b, sq, y + 1.4, 1.4, 0.5, accent);
    ledge(b, sq, y, 0.5, 0.25, light);
  }
  ledge(b, rect(s1, s1, BEV * 0.6), top + 1.0, 1.0, 0.45, accent);
  // An obelisk that is a mast: a lit ring on its flat top, and a gold needle out of it.
  const R = s1 * 0.42;
  lathe(b, [[R - 0.9, top + 1.0], [R, top + 1.0], [R, top + 2.2], [R - 0.9, top + 2.2]], 32, [dark, light, gold]);
  lathe(b, [[s1 * 0.16, top + 1.0], [s1 * 0.1, top + 6], [0.35, top + 6 + s0 * k * 0.9]], 12, gold);
  const tip: V3 = [0, top + 6.5 + s0 * k * 0.9, 0];
  return { beacons: [tip], reach: s0 / 2 + 3.2 };
};

// The pylon: a slab whose walls lean in as they rise, a tall panel of glass in the middle of its long faces, a gorge
// cornice, and four masts standing before it.
export const pylon: Design = (b, t) => {
  const { w, d, h, r } = t;
  const W = w * 1.08, D = d * 0.6, bat = 0.84, mid = 0.17 + 0.07 * r();
  const ring: Ring = [[W / 2, D / 2 - BEV], [W / 2, -D / 2 + BEV], [W / 2 - BEV, -D / 2], [W * mid, -D / 2], [-W * mid, -D / 2], [-W / 2 + BEV, -D / 2], [-W / 2, -D / 2 + BEV], [-W / 2, D / 2 - BEV], [-W / 2 + BEV, D / 2], [-W * mid, D / 2], [W * mid, D / 2], [W / 2 - BEV, D / 2]];
  const kinds = kindsBy(ring, (mx, mz, len) => (len < 1.7 ? t.edge : Math.abs(mz) > D * 0.45 && Math.abs(mx) < W * mid ? glass : t.face === clad ? clad : plain));
  const hp = h - 4.2;
  loft(b, taper(ring, 0, hp, bat, 0.8), stone, { kinds });
  const topR = scale(ring, bat, 0.8);
  // A cartouche on each pier of the front and the back.
  const lean = (y: number) => 1 + (bat - 1) * (y / hp), face = (y: number) => (D / 2) * (1 + (0.8 - 1) * (y / hp));
  for (const side of [1, -1]) for (const sx of [1, -1]) {
    const mx = (W / 2 + W * mid) / 2, pw = (W / 2 - W * mid) * 0.42;
    cartouche(b, (y) => sx * mx * lean(y), face, side, (y) => pw * lean(y), hp * 0.18, hp * 0.82);
  }
  gorge(b, topR, hp, 4.2, 1.7, accent);
  box(b, 0, h, -D * 0.1, W * 0.3, 3.2, D * 0.35, louvre, roof, 0.3);
  const masts: V3[] = [];
  for (const x of [-0.36, -0.2, 0.2, 0.36]) masts.push(mast(b, x * W, 0, D / 2 + 1.6, h * (0.98 + 0.08 * r()), 0.32));
  return { beacons: [masts[0], masts[3]], reach: W / 2 + 1 };
};

// The gate: two pylons with a bridge between them high up, a winged sun disc over the bridge, and a lit gate between
// their feet under a lintel.
export const gate: Design = (b, t) => {
  const { h } = t;
  const tw = 23, td = 14, gap = 14, cx = gap / 2 + tw / 2, bat = 0.7;
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

// A shaft that ends in a stepped crown of metal, and a gold capstone floating over its last step.
export const stepped: Design = (b, t) => {
  const { w, d, h, r } = t;
  const W = w * 0.9, D = d * 0.88, steps = 4 + Math.floor(r() * 3), crown = Math.max(13, h * (0.14 + 0.05 * r())), ys = h - crown;
  prism(b, rect(W, D, BEV), 0, ys, t.face, { edge: t.edge, lid: roof });
  if (t.fins) fins(b, rect(W, D), 4, ys);
  ledge(b, rect(W, D, BEV), ys + 1.2, 1.2, 0.6, accent);
  const rise = (crown - 6) / steps, inset = Math.min(W, D) * (0.32 / steps);
  let y = ys + 1.2;
  for (let i = 0; i < steps; i++) {
    const rw = W - 2 * inset * (i + 1), rd = D - 2 * inset * (i + 1);
    prism(b, rect(rw, rd, BEV * 0.6), y, y + rise, i === steps - 1 ? light : i % 2 ? accent : dark, { lid: roof, edge: accent });
    y += rise;
  }
  const s = Math.min(W, D) - 2 * inset * steps;
  if (r() < 0.3) {
    const tip = capstone(b, s * 0.9, y, 1.4, 0.8 + 0.5 * r());
    return { beacons: [tip], reach: W / 2 };
  }
  // A ring of gold held level over a drum of light on four posts.
  const R = s * 0.62;
  cyl(b, 0, y, 0, s * 0.3, 2.4, 20, light, roof);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; beam(b, [Math.cos(a) * s * 0.28, y, Math.sin(a) * s * 0.28], [Math.cos(a) * R, y + 4.5, Math.sin(a) * R], 0.5, 0.5, dark); }
  lathe(b, [[R - 1.1, y + 4.2], [R, y + 4.2], [R, y + 5.0], [R - 1.1, y + 5.0], [R - 1.1, y + 4.2]], 40, [gold, gold, gold, light]);
  const tip = mast(b, 0, y + 2.4, 0, 6 + 4 * r(), 0.4);
  return { beacons: [tip], reach: W / 2 };
};

// A drum of glass with ring decks round it, each lit along its edge, under a gold dome and a needle.
export const decks: Design = (b, t) => {
  const { w, d, h, r } = t;
  const R = Math.min(w, d) * 0.46, dome = h * 0.87, Rt = R * 0.88;
  const Ry = (y: number) => R + (Rt - R) * (y / dome);
  lathe(b, [[R, 0], [Ry(dome * 0.5), dome * 0.5], [Rt, dome]], 32, t.face === stone ? glass : t.face);
  const n = 3 + Math.floor(r() * 3), out = 4.5 + 3 * r();
  for (let i = 0; i < n; i++) {
    const y = dome * (0.3 + (0.62 * (i + 0.3 * r())) / n), ry = Ry(y), o = out * (1 - 0.15 * i);
    lathe(b, [[ry, y - 2.4], [ry + o, y - 0.8], [ry + o, y - 0.2], [ry + o - 0.5, y + 0.2], [ry, y + 0.3]], 32, [dark, light, accent, accent]);
  }
  ledge(b, circle(Rt, 32), dome + 1, 1.0, 0.8, accent, { round: true });
  if (r() < 0.5) {
    // A crown of rings, each smaller and higher, the last lit, and a needle.
    let y = dome + 1, rr = Rt * 0.9;
    for (let i = 0; i < 3; i++) { lathe(b, [[rr, y], [rr, y + 2.4]], 32, i === 2 ? light : dark); ledge(b, circle(rr, 32), y + 2.4, 0.6, 0.6, i === 2 ? gold : bronze, { round: true }); y += 2.4; rr *= 0.72; }
    const tip = mast(b, 0, y, 0, Math.max(4, h - y), 0.45);
    return { beacons: [tip], reach: R + out };
  }
  const dr = Rt * 0.92, prof: [number, number][] = Array.from({ length: 7 }, (_, i) => { const a = (i / 6) * (Math.PI / 2); return [dr * Math.cos(a), dome + 1 + dr * 0.75 * Math.sin(a)]; });
  lathe(b, prof, 32, gold);
  const tip = mast(b, 0, dome + 1 + dr * 0.75, 0, Math.max(3, h - dome - dr * 0.75), 0.5);
  return { beacons: [tip], reach: R + out };
};

// A round tower that rises like a column and flares at its top into a lotus capital of metal, bound under it by
// rings, with light in its cup.
export const lotus: Design = (b, t) => {
  const { w, d, h, r } = t;
  const R = Math.min(w, d) * 0.4, ys = h * (0.76 + 0.06 * r()), Rs = R * 0.86, Rc = R * (1.25 + 0.3 * r());
  lathe(b, [[R * 1.04, 0], [R * 1.02, h * 0.12], [R * 0.96, h * 0.45], [Rs, ys]], 32, t.face === stone ? clad : t.face);
  for (let i = 0; i < 3; i++) ledge(b, circle(Rs, 32), ys - 1 - i * 2.4, 0.9, 0.5, i === 1 ? light : accent, { round: true });
  const lobes = 8 + 2 * Math.floor(r() * 5), seg = 48, open = r() < 0.55;
  const bell = (rad: number, y: number): Level => ({ y, ring: Array.from({ length: seg }, (_, i) => { const a = -(i / seg) * Math.PI * 2, k = 1 + 0.13 * (rad / Rc) ** 2 * Math.abs(Math.cos((lobes / 2) * a)); return [Math.cos(a) * rad * k, Math.sin(a) * rad * k] as XZ; }) });
  if (open) {
    // The open flower: a bell that flares to a lip, with light in its cup.
    const prof: [number, number][] = [[Rs, ys], [Rs * 1.06, ys + (h - ys) * 0.25], [Rs + (Rc - Rs) * 0.45, ys + (h - ys) * 0.55], [Rc * 0.92, ys + (h - ys) * 0.82], [Rc, h - 1.2]];
    const levels = prof.map(([rad, y]) => bell(rad, y));
    loft(b, levels, accent, { round: true, smoothUp: true, foot: ys });
    loft(b, levels.slice(2).map((l) => ({ y: l.y, ring: offset([...l.ring].reverse(), 0.6) })), accent, { round: true });
    ledge(b, bell(Rc, h).ring, h, 1.2, 0.3, gold, { round: true });
    cap(b, circle(Rc * 0.9, 24), ys + (h - ys) * 0.62, light);
    return { beacons: [[0, h + 0.5, 0]], reach: Rc * 1.1 };
  }
  // The closed bud: it swells and closes to a gold point, a band of light where it is widest.
  const Rb = Rc * 0.85, top = h - 6;
  const prof: [number, number][] = [[Rs, ys], [Rb * 0.9, ys + (top - ys) * 0.3], [Rb, ys + (top - ys) * 0.5], [Rb * 0.85, ys + (top - ys) * 0.72], [Rb * 0.45, ys + (top - ys) * 0.92], [0.05, top]];
  const levels = prof.map(([rad, y]) => bell(rad, y));
  loft(b, levels.slice(0, 3), accent, { round: true, smoothUp: true, foot: ys });
  loft(b, levels.slice(2), gold, { round: true, smoothUp: true, foot: ys });
  ledge(b, bell(Rb * 1.0, 0).ring, ys + (top - ys) * 0.5 + 0.6, 1.2, 0.25, light, { round: true });
  const tip = mast(b, 0, top, 0, h - top + 2, 0.4);
  return { beacons: [tip], reach: Rc };
};

// A tower under a pyramid cased in polished metal, set on a gorge cornice, its gold capstone floating over a lit gap.
export const pyramid: Design = (b, t) => {
  const { w, d, h, r } = t;
  const s = Math.min(w, d) * 0.9, pyr = s * (0.45 + 0.4 * r()), ys = h - pyr - 3.6, casing = r() < 0.5 ? copper : bronze;
  prism(b, rect(s, s, BEV), 0, ys, t.face, { edge: t.edge, lid: roof });
  if (t.fins) fins(b, rect(s, s), 4, ys);
  gorge(b, rect(s, s, BEV), ys, 3.6, 1.4, accent);
  const yb = ys + 3.6, cut = 0.8, sc = s * (1 - cut);
  const base = rect(s + 1, s + 1, BEV);
  loft(b, [{ y: yb, ring: base }, { y: yb + pyr * cut, ring: scale(base, 1 - cut) }], casing, { edge: gold });
  cap(b, scale(base, 1 - cut), yb + pyr * cut, dark);
  const tip = capstone(b, sc + 0.6, yb + pyr * cut, 1.0, 1.0);
  return { beacons: [tip], reach: s / 2 + 2 };
};

// A battered stone mastaba with a slim shaft rising from its back, and a square halo of metal round the shaft's top.
export const mastaba: Design = (b, t) => {
  const { w, d, h, r } = t;
  const hp = Math.min(h * (0.22 + 0.08 * r()), 46), base = rect(w + 4, d + 4, BEV);
  loft(b, taper(base, 0, hp, 0.84), stone, { edge: plain });
  ledge(b, scale(base, 0.84), hp + 0.9, 0.9, 0.4, accent);
  cap(b, scale(base, 0.84), hp, roof);
  const sw = w * 0.52, sd = d * 0.5, oz = -d * 0.12, top = h - 4;
  prism(b, shift(rect(sw, sd, BEV), 0, oz), hp, top, t.face === stone ? glass : t.face, { edge: t.edge, lid: roof });
  if (t.fins) fins(b, shift(rect(sw, sd), 0, oz), hp, top - 1);
  const y = top - 6, o = 3;
  const hx = sw / 2 + o, hz = sd / 2 + o;
  for (const [p, q] of [[[hx, y, oz + hz], [hx, y, oz - hz]], [[hx, y, oz - hz], [-hx, y, oz - hz]], [[-hx, y, oz - hz], [-hx, y, oz + hz]], [[-hx, y, oz + hz], [hx, y, oz + hz]]] as [V3, V3][]) {
    beam(b, p, q, 1.1, 2.2, accent);
    beam(b, [p[0], p[1] - 1.5, p[2]], [q[0], q[1] - 1.5, q[2]], 0.6, 0.5, light);
  }
  for (const [x, z] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) beam(b, [x * (sw / 2), y, oz + z * (sd / 2)], [x * hx, y, oz + z * hz], 0.6, 0.6, dark);
  const tip = mast(b, 0, top, oz, 4 + h * 0.04, 0.5);
  return { beacons: [tip], reach: w / 2 + 2 };
};

// A six sided prism of glass rising into a faceted point, ribs of metal up the point's edges.
export const crystal: Design = (b, t) => {
  const { w, d, h } = t;
  const R = Math.min(w, d) * 0.5, ys = h * 0.74;
  const hex = circle(R, 6, 0, 0, R, Math.PI / 6);
  prism(b, hex, 0, ys, t.face === stone ? glass : t.face, { lid: false });
  ledge(b, hex, ys + 1.2, 1.2, 0.5, light);
  const tip: V3 = [0, h, 0];
  point(b, hex, ys + 1.2, tip, sky);
  for (const [x, z] of hex) beam(b, [x, ys + 1.2, z], [x * 0.03, h - 0.4, z * 0.03], 0.6, 0.6, accent);
  return { beacons: [tip], reach: R + 1 };
};

// The great obelisk, one of a pair that flank the spire: three steps, gold corners, glass in its channels and a gold
// pyramidion.
export const great: Design = (b, t) => {
  const { w, d, h } = t;
  const s0 = Math.min(w, d) * 0.95, k = 0.6, y0 = plinth(b, s0 + 4, s0 + 4, 3);
  const top = h - s0 * k * 0.72 - 1.6;
  loft(b, taper(notched(s0, 0.3, 1.6), y0, top, k), stone, { kinds: NOTCH_KINDS(plain, glass, gold) });
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
  const { w, h } = t;
  const S = Math.max(w, 34), y1 = h * 0.5, y2 = h * 0.78, y3 = h * 0.9;
  plinth(b, S, S, 2);
  const sq = rect(S, S, BEV);
  loft(b, taper(sq, 3.2, y1, 0.86), stone, { edge: gold });
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

// The tower carried on a colonnade: twelve columns with papyrus capitals round a lit hall, a thick lintel ring, and
// a drum of glass above, banded, under a crown of fins.
export const colonnade: Design = (b, t) => {
  const { h } = t;
  const Rc = 19, n = 12, hc = Math.min(44, h * 0.17), R = 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, x = Math.cos(a) * Rc, z = Math.sin(a) * Rc;
    lathe(b, [[2.2, 0], [2.2, 1.0], [1.6, 1.4], [1.5, hc * 0.55], [1.35, hc - 4.5], [1.5, hc - 4.0], [2.6, hc - 1.6], [2.8, hc - 1.0]], 12, [plain, plain, plain, plain, accent, accent, accent], { cx: x, cz: z });
    box(b, x, hc - 1.0, z, 5.4, 1.0, 5.4, accent, accent);
  }
  lathe(b, [[11, 0], [11, hc]], 32, lobby);
  lathe(b, [[Rc + 3.6, hc], [Rc + 3.6, hc + 3.5], [Rc + 3.2, hc + 3.9]], 48, [gold, gold]);
  cap(b, circle(Rc + 3.6, 48), hc, dark, true);
  cap(b, circle(Rc + 3.2, 48), hc + 3.9, roof);
  const top = h * 0.9;
  lathe(b, [[R, hc + 3.9], [R * 0.96, (hc + top) / 2], [R * 0.86, top]], 40, glass);
  for (const f of [0.35, 0.6, 0.82]) { const y = hc + 3.9 + (top - hc - 3.9) * f, ry = R + (R * 0.86 - R) * f; ledge(b, circle(ry, 40), y, 1.4, 0.9, accent, { round: true }); }
  ledge(b, circle(R * 0.86, 40), top + 1.2, 1.2, 1.2, gold, { round: true });
  const fins = 16;
  for (let i = 0; i < fins; i++) {
    const a = (i / fins) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), r0 = R * 0.6, r1 = R * 0.86;
    beam(b, [c * r0, top + 1.2, s * r0], [c * r1 * 0.55, h, s * r1 * 0.55], 0.5, 1.6, i % 2 ? gold : dark);
  }
  cyl(b, 0, top + 1.2, 0, R * 0.5, 2.5, 24, light, roof);
  const tip = mast(b, 0, h, 0, 10, 0.5);
  return { beacons: [tip], reach: Rc + 4 };
};

// A saucer on a stalk: a stone mastaba, a slim stalk of bronze with a line of light up it, a small saucer partway
// and a large one near the top, each with a lit rim, bands of windows and a glass dome.
export const saucer: Design = (b, t) => {
  const { h } = t;
  const base = rect(24, 24, BEV);
  loft(b, taper(base, 0, 12, 0.82), stone, { edge: plain });
  cap(b, scale(base, 0.82), 12, roof);
  const ys = h * 0.8, Rs = 4.6;
  lathe(b, [[Rs * 1.15, 12], [Rs, 30], [Rs * 0.92, ys]], 20, clad);
  for (const a of [0, Math.PI]) { const x = Math.cos(a) * Rs * 0.98, z = Math.sin(a) * Rs * 0.98 + (a ? -0.01 : 0.01); beam(b, [x, 14, z], [x * 0.92, ys - 4, z * 0.92], 0.6, 0.6, light); }
  const dish = (y: number, R: number, under: number, dome: number) => {
    lathe(b, [[Rs * 0.9, y - under], [R * 0.55, y - under * 0.55], [R * 0.95, y - 0.6], [R, y], [R, y + 0.8], [R * 0.93, y + 1.6], [R * 0.6, y + 3.6], [dome, y + 4.4]], 48, [bronze, gold, gold, light, gold, pod, roof]);
    lathe(b, Array.from({ length: 6 }, (_, i) => { const a = (i / 5) * (Math.PI / 2); return [dome * Math.cos(a), y + 4.4 + dome * 0.7 * Math.sin(a)] as [number, number]; }), 32, sky);
  };
  dish(h * 0.5, 13, 3.5, 4.5);
  dish(ys, 26, 6, 9.5);
  const tip = mast(b, 0, ys + 4.4 + 9.5 * 0.7, 0, h - ys - 4.4 - 9.5 * 0.7 + 4, 0.45);
  return { beacons: [tip], reach: 27 };
};

// Pods held out on arms from a core of metal, at three heights, each turned from the last, under a halo and a mast.
export const pods: Design = (b, t) => {
  const { h } = t;
  const R = 9;
  lathe(b, [[R * 1.3, 0], [R * 1.05, 12], [R, h * 0.88]], 28, clad);
  ledge(b, circle(R * 1.05, 28), 12, 1.4, 1.2, gold, { round: true });
  const at = [0.4, 0.56, 0.7];
  at.forEach((f, k) => {
    const y = h * f, arms = k === 1 ? 4 : 3;
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2 + k * 0.9 + 0.5, c = Math.cos(a), s = Math.sin(a), pr = 6.6 - k * 0.7, L = R + 6 + pr;
      beam(b, [c * R * 0.9, y - 0.6, s * R * 0.9], [c * (L - pr * 0.7), y - 0.6, s * (L - pr * 0.7)], 2.2, 2.6, dark);
      beam(b, [c * R * 0.9, y + 0.95, s * R * 0.9], [c * (L - pr * 0.9), y + 0.95, s * (L - pr * 0.9)], 0.5, 0.4, light);
      const px = c * L, pz = s * L, ph = pr * 1.7;
      const egg: [number, number][] = Array.from({ length: 11 }, (_, j) => { const u = (j / 10) * Math.PI; return [Math.max(0.02, pr * Math.sin(u) * (1 - 0.12 * Math.cos(u))), y - ph * 0.45 + ph * (1 - Math.cos(u)) / 2]; });
      lathe(b, egg.slice(0, 4), 20, gold, { cx: px, cz: pz });
      lathe(b, egg.slice(3, 8), 20, pod, { cx: px, cz: pz });
      lathe(b, egg.slice(7), 20, gold, { cx: px, cz: pz });
    }
    ledge(b, circle(R, 28), y + 1.6, 3.2, 1.0, accent, { round: true });
  });
  const top = h * 0.88;
  lathe(b, [[R, top], [R * 0.82, top + 3], [R * 0.5, top + 5], [R * 0.2, top + 6]], 28, gold);
  const halo = (y: number, r0: number, r1: number) => lathe(b, [[r0, y - 0.6], [r1, y - 0.6], [r1, y + 0.6], [r0, y + 0.6]], 48, [dark, light, gold]);
  halo(h * 0.82, R + 4, R + 8);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.2; beam(b, [Math.cos(a) * R, h * 0.82, Math.sin(a) * R], [Math.cos(a) * (R + 4.2), h * 0.82, Math.sin(a) * (R + 4.2)], 0.7, 0.7, dark); }
  const tip = mast(b, 0, top + 6, 0, h - top, 0.45);
  return { beacons: [tip], reach: R + 14 };
};

// A sail: a lens in plan, sweeping in and over as it rises to a raking blade, clad in metal, a line of light up its
// leading edge.
export const sail: Design = (b, t) => {
  const { h } = t;
  const W = 34, D = 19, n = 14, seg = 40;
  const lens = (sx: number, sz: number, dx: number): Ring => Array.from({ length: seg }, (_, i) => { const a = -(i / seg) * Math.PI * 2, s = Math.sin(a); return [(W / 2) * sx * Math.cos(a) + dx, -(D / 2) * sz * s * Math.abs(s) ** 0.35] as XZ; });
  const at = (u: number) => ({ sx: 1 - 0.5 * u ** 1.5, sz: 1 - 0.3 * u, dx: -W * 0.26 * u * u });
  const top = h * 0.9;
  const levels: Level[] = Array.from({ length: n + 1 }, (_, i) => { const u = i / n, a = at(u); return { y: top * u, ring: lens(a.sx, a.sz, a.dx) }; });
  // Glass carried on ribs of copper that follow its sweep, and a spine of metal down its back.
  loft(b, levels, glass, { round: true, smoothUp: true });
  const ribs = 12;
  for (let k = 0; k < ribs; k++) {
    const i = Math.round((k / ribs) * seg);
    for (let j = 0; j < n; j++) {
      const p0 = levels[j].ring[i], p1 = levels[j + 1].ring[i], c0 = at(j / n).dx, c1 = at((j + 1) / n).dx;
      const o0 = norm2(p0[0] - c0, p0[1]), o1 = norm2(p1[0] - c1, p1[1]);
      beam(b, [p0[0] + o0[0] * 0.4, levels[j].y, p0[1] + o0[1] * 0.4], [p1[0] + o1[0] * 0.4, levels[j + 1].y, p1[1] + o1[1] * 0.4], 0.9, 0.9, k % 3 ? copper : gold);
    }
  }
  for (let j = 1; j < n; j += 3) ledge(b, levels[j].ring, levels[j].y + 0.6, 1.2, 0.35, copper, { round: true });
  const last = at(1), edgeAt = (u: number): V3 => { const a = at(u); return [(W / 2) * a.sx + a.dx + 0.15, top * u, 0]; };
  for (let i = 0; i < n; i++) beam(b, edgeAt(i / n), edgeAt((i + 1) / n), 0.7, 0.7, light);
  const tip: V3 = [last.dx - (W / 2) * last.sx * 0.6, h, 0];
  point(b, levels[n].ring, top, tip, gold);
  return { beacons: [tip], reach: W / 2 + 1 };
};

// The town behind the core: low, older and plainer.

// A house of battered stone under a dome of metal on a short drum.
export const domed: Design = (b, t) => {
  const { w, d, h, r } = t;
  const s = Math.min(w, d) * 0.85, hb = h * 0.62;
  loft(b, taper(rect(s, s, BEV), 0, hb, 0.9), stone, { edge: plain });
  ledge(b, rect(s * 0.9, s * 0.9, BEV), hb + 0.8, 0.8, 0.5, plain);
  const R = s * 0.32, metal = r() < 0.5 ? copper : bronze;
  lathe(b, [[R, hb + 0.8], [R, hb + 3.4]], 24, stone);
  const prof: [number, number][] = Array.from({ length: 6 }, (_, i) => { const a = (i / 5) * (Math.PI / 2); return [Math.max(0.05, R * 1.04 * Math.cos(a)), hb + 3.4 + R * 1.05 * Math.sin(a)]; });
  lathe(b, prof, 24, metal);
  cyl(b, 0, hb + 3.4 + R * 1.05, 0, 0.4, 2.2, 6, gold);
  return { beacons: [], reach: s / 2 + 1 };
};

// A block round an open court, a parapet round its roof and a small gold pavilion in the court.
export const court: Design = (b, t) => {
  const { w, d, h } = t;
  const W = w * 0.95, D = d * 0.95, hb = h * 0.55, iw = W * 0.42, id = D * 0.42;
  const outer = rect(W, D, BEV), inner = rect(iw, id);
  loft(b, [{ y: 0, ring: outer }, { y: hb, ring: outer }], stone, { edge: plain });
  loft(b, [{ y: 0, ring: [...inner].reverse() }, { y: hb, ring: [...inner].reverse() }], stone);
  cap(b, outer, hb, roof, false, [inner]);
  ledge(b, outer, hb + 1.2, 1.2, 0.3, plain);
  cyl(b, 0, 0, 0, iw * 0.22, hb * 0.45, 12, plain);
  lathe(b, [[iw * 0.3, hb * 0.45], [iw * 0.15, hb * 0.45 + iw * 0.25], [0.05, hb * 0.45 + iw * 0.3]], 12, gold);
  return { beacons: [], reach: W / 2 };
};

// Three terraces stepping back from the street, their edges in stone.
export const terraces: Design = (b, t) => {
  const { w, d, h } = t;
  const W = w * 0.95, D = d * 0.95;
  const tiers = [[1, 0.45], [0.7, 0.75], [0.42, 1]];
  let y = 0;
  for (const [f, top] of tiers) {
    const ring = shift(rect(W, D * f, BEV), 0, -(D * (1 - f)) / 2), y1 = h * 0.6 * top;
    prism(b, ring, y, y1, stone, { edge: plain, lid: roof });
    ledge(b, ring, y1 + 0.7, 0.7, 0.3, plain);
    y = y1;
  }
  return { beacons: [], reach: W / 2 };
};

// A plain block with windcatchers on its roof: small towers with their mouths turned to the wind.
export const windcatch: Design = (b, t) => {
  const { w, d, h, r } = t;
  const W = w * 0.9, D = d * 0.8, hb = h * 0.5;
  prism(b, rect(W, D, BEV), 0, hb, stone, { edge: plain, lid: roof });
  ledge(b, rect(W, D, BEV), hb + 0.8, 0.8, 0.3, plain);
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1) - 0.5) * W * 0.6, z = (r() - 0.5) * D * 0.3, ht = 5 + 4 * r();
    box(b, x, hb, z, 3.4, ht, 3.4, plain, roof, 0.3);
    box(b, x, hb + ht - 2.2, z + 1.75, 2.2, 1.6, 0.2, dark, dark);
    box(b, x, hb + ht, z, 3.8, 0.6, 3.8, bronze, bronze);
  }
  return { beacons: [], reach: W / 2 };
};

export const CORE = { obelisk, pylon, stepped, decks, lotus, pyramid, mastaba, crystal } as const;
export const LANDMARK = { great, pharos, gate, colonnade, saucer, pods, sail } as const;
export const TOWN = { domed, court, terraces, windcatch } as const;
export type CoreName = keyof typeof CORE;
