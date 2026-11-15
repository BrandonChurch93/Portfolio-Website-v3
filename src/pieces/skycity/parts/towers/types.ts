import { City, K, beam, box, cap, circle, cyl, disc, gorge, lathe, ledge, loft, offset, point, prism, rect, scale, shift, turn, type Level, type Ring, type V3, type XZ } from './shape';

// The family of buildings: a future city with the forms of ancient Egypt in it, few and large, every one speaking the
// language of its gate: walls that lean in as they rise, cut by deep channels between piers of stone, gorge
// cornices, stone and polished metal. The landmarks: a great obelisk on a podium, the Pharos, a round pylon carried
// on a colonnade, a gate of two pylons under a winged sun disc, a sail of leaning stone fins. Round them: towers of
// that kind, low pylons, mastabas with a shaft, and terraces stepping down with a temple on top.
//
// Stone is opened by few, large openings, three floors tall, most of them dark: never a grid of windows. That is
// what lets a building 185 tall read as immense. Glass is used only where a building is a glass thing.
//
// A design builds one tower in its own frame (x across the lot, z out toward the rim) in units, into the city's
// buffers, and says where its beacons stand.

export interface Tower {
  // The lot's width and depth, and how tall this tower is.
  w: number;
  d: number;
  h: number;
  r: () => number;
  // What its frame is: stone, its metal, or dark steel.
  face: number;
  // What the bevels of its corners are.
  edge: number;
  // Whether it stands on a colonnade.
  fins: boolean;
  // Whether it stands where it is seen only as a dark shape at the back of the city, and is built plainly.
  simple: boolean;
}
export interface Made { beacons: V3[]; reach: number }
export type Design = (b: City, t: Tower) => Made;

// The bevel on every corner that is not round, in units.
const BEV = 1.0;
const { glass, stone, plain, dark, gold, bronze, copper, clad, light, lobby, louvre, roof, accent, pod, glyph, slot } = K;

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


// Four floors, in units: the step of the bands of stone that bind a building.
const REL = { storey: 12 };
// What a tower's piers and ledges are, from its own material.
interface Frame { pier: number; ledge: number }
function frameOf(face: number): Frame {
  return face === clad ? { pier: accent, ledge: accent } : { pier: plain, ledge: face === stone ? plain : dark };
}

// The podium every building of the city stands on: battered stone, a course every four floors, and a gorge cornice
// of stone, now and then of dark bronze. It is what makes them one family. Returns the height of its top.
function podium(b: City, W: number, D: number, h: number, r: () => number): number {
  const base = rect(W, D, BEV), bat = 0.9;
  loft(b, taper(base, 0, h, bat), stone, { edge: plain });
  for (let y = REL.storey * 0.5; y < h - 2; y += REL.storey * 0.5) ledge(b, scale(base, 1 + (bat - 1) * (y / h)), y, 0.7, 0.25, plain);
  const g = 2.6 + r();
  gorge(b, scale(base, bat), h, g, 1.3, r() < 0.7 ? plain : bronze, plain);
  return h + g;
}

// A rectangle whose faces are cut by deep vertical channels between piers: nx channels across each face along x,
// nz along each face along z, together so much of the face, each so deep, with bevelled corners. Each segment's
// role: 0 pier, 1 channel side, 2 channel back, 3 bevel.
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

// The tower of this city: a mass whose walls lean in as they rise, cut by deep channels of glass between piers of
// stone, bound by bands every four floors, under a gorge cornice, and crowned by a smaller mass of the same kind or
// by steps of light. Sometimes it stands behind a colonnade.
export const pylonTower: Design = (b, t) => {
  const { w, d, h, r } = t;
  const W = w * 0.92, D = d * 0.9, bx = 0.8 + 0.06 * r(), bz = 0.82, hc = t.fins ? 16 : 0;
  const crownH = Math.max(14, h * (0.14 + 0.06 * r())), top = h - crownH, metal = t.face === clad;
  const pier = metal ? bronze : plain;
  // A podium wider than the lot, so the towers of a row stand on one mass of building and no ground shows between.
  const yb = hc ? 0 : podium(b, w * 1.32, d * 1.2, 7 + 9 * r(), r);
  if (hc) {
    const cr = 1.6, n = Math.max(4, Math.round(W / 7));
    for (let k = 0; k <= n; k++) lathe(b, [[cr * 1.3, 0], [cr, 1.2], [cr * 0.9, hc - 3.4], [cr * 1.9, hc - 1.2], [cr * 1.9, hc]], 10, [plain, plain, gold, gold], { cx: -W / 2 + ((W) * k) / n, cz: D / 2 + 4 });
    box(b, 0, hc, D / 2 + 2.4, W + 4, 2.4, 6.2, plain, gold, 0.3);
  }
  const ch = channelled(W, D, Math.max(1, Math.round(W / 24)), 1, 0.32, 3.8);
  const kinds = ch.role.map((k) => [pier, dark, slot, t.edge][k]);
  const level = (y: number) => 1 - ((1 - bx) * (y - yb)) / (top - yb);
  loft(b, [{ y: yb, ring: ch.ring }, { y: top, ring: scale(ch.ring, bx, bz) }], plain, { kinds, foot: yb });
  const base = rect(W, D, BEV);
  // Bands of stone every four floors, bridging the channels: they throw the moon's shadow into them.
  for (let y = yb + REL.storey * 2; y < top - 6; y += REL.storey * 2) { const k = level(y), kz = 1 - ((1 - bz) * (y - yb)) / (top - yb); ledge(b, scale(base, k, kz), y + 1.6, 1.6, 0.5, y % (REL.storey * 6) < 1 ? (metal ? gold : accent) : pier); }
  gorge(b, scale(base, bx, bz), top, 3.6, 1.8, metal ? gold : accent);
  const cw = W * bx * (0.55 + 0.1 * r()), cd = D * bz * 0.6, y0 = top + 3.6;
  const crown = r();
  if (crown < 0.3) {
    // The city's emblem, as on its gate: a winged sun disc spread across the top of the front.
    const zf = (D * bz) / 2 + 1.4, yd = top + 3.6 + 6, span = (W * bx) / 2 + 2, R = Math.min(7, W * 0.1);
    box(b, 0, top + 3.6, 0, W * bx * 0.6, 4, D * bz * 0.6, plain, roof, 0.4);
    disc(b, 0, yd, zf, R, 1.6, 40, gold, gold);
    disc(b, 0, yd, zf + 1.1, R * 0.58, 0.8, 32, light, gold);
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
      const y = yd + R * 0.35 - i * 1.6, len = span - i * 5;
      beam(b, [sx * R * 0.8, y, zf - i * 0.2], [sx * len, y + 2.2 - i * 0.45, zf - i * 0.2], 1.0, 1.5, i % 2 ? copper : gold);
    }
    return { beacons: [], reach: W / 2 + 2 };
  }
  if (crown < 0.65) {
    // A smaller mass of the same kind.
    const c2 = channelled(cw, cd, 1, 1, 0.3, 3);
    loft(b, [{ y: y0, ring: c2.ring }, { y: h - 3, ring: scale(c2.ring, 0.86, 0.86) }], plain, { kinds: c2.role.map((k) => [pier, dark, slot, t.edge][k]) });
    gorge(b, scale(rect(cw, cd, BEV), 0.86, 0.86), h - 3, 3, 1.2, gold, gold);
    return { beacons: [], reach: W / 2 + 1 };
  }
  // Steps of stone, the last of light, with a gold disc standing on it facing out.
  let y = y0, sw = cw, sd = cd;
  for (let i = 0; i < 3; i++) { prism(b, rect(sw, sd, BEV * 0.6), y, y + (crownH - 9) / 3, i === 2 ? light : plain, { lid: roof, edge: i === 2 ? gold : plain }); y += (crownH - 9) / 3; sw *= 0.72; sd *= 0.72; }
  const R = Math.min(sw, 9) * 0.9;
  box(b, 0, y, 0, 1.2, R * 0.6, 1.2, dark, dark);
  disc(b, 0, y + R * 0.6 + R, 0, R, 1.0, 36, gold, gold);
  return { beacons: [[0, y + R * 0.6 + 2 * R, 0]], reach: W / 2 + 1 };
};

// A mastaba of battered stone along the front of the lot, its ledges every two floors, and a shaft built in depth
// rising from its back under a square halo of metal.
export const mastaba: Design = (b, t) => {
  const { w, d, h, r } = t;
  const f = frameOf(t.face), hp = Math.min(h * (0.24 + 0.06 * r()), 40), base = rect(w * 0.98, d * 0.98, BEV);
  loft(b, taper(base, 0, hp, 0.86), stone, { edge: plain });
  for (let y = REL.storey * 2; y < hp - 2; y += REL.storey * 2) ledge(b, scale(base, 1 - 0.14 * (y / hp)), y, 0.8, 0.3, plain);
  gorge(b, scale(base, 0.86), hp, 3.2, 1.4, accent);
  const sw = w * 0.56, sd = d * 0.52, oz = -d * 0.16, top = h - 5;
  const ch = channelled(sw, sd, Math.max(1, Math.round(sw / 20)), 1, 0.32, 3.2);
  loft(b, [{ y: hp + 3.2, ring: shift(ch.ring, 0, oz) }, { y: top, ring: shift(scale(ch.ring, 0.86, 0.86), 0, oz * 0.86) }], plain, { kinds: ch.role.map((k) => [f.pier === accent ? bronze : plain, dark, slot, t.edge][k]) });
  for (let y = hp + 3.2 + REL.storey * 2; y < top - 5; y += REL.storey * 2) { const k = 1 - 0.14 * ((y - hp - 3.2) / (top - hp - 3.2)); ledge(b, shift(rect(sw * k, sd * k, BEV), 0, oz * k), y + 1, 1, 0.3, plain); }
  gorge(b, shift(rect(sw * 0.86, sd * 0.86, BEV), 0, oz * 0.86), top, 3, 1.3, gold, gold);
  const y = top - 4, o = 3, hx = (sw * 0.86) / 2 + o, hz = (sd * 0.86) / 2 + o;
  for (const [p, q] of [[[hx, y, oz + hz], [hx, y, oz - hz]], [[hx, y, oz - hz], [-hx, y, oz - hz]], [[-hx, y, oz - hz], [-hx, y, oz + hz]], [[-hx, y, oz + hz], [hx, y, oz + hz]]] as [V3, V3][]) {
    beam(b, p, q, 1.2, 2.4, accent);
    beam(b, [p[0], p[1] - 1.6, p[2]], [q[0], q[1] - 1.6, q[2]], 0.6, 0.5, light);
  }
  for (const [x, z] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) beam(b, [x * (sw * 0.43), y, oz + z * (sd * 0.43)], [x * hx, y, oz + z * hz], 0.7, 0.7, dark);
  const tip: V3 = [0, top + 3, oz * 0.86];
  return { beacons: [tip], reach: w / 2 + 2 };
};

// Terraces stepping down toward the street, each built in depth, each with a colonnade along its front, and on the
// top terrace a small temple of columns under a gold roof.
export const terrace: Design = (b, t) => {
  const { w, d, h, r } = t;
  const f = frameOf(t.face), n = 3 + Math.floor(r() * 2), W = w * 0.95, D = d * 0.95;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const k = 1 - i / n, Dk = D * k, cz = -(D - Dk) / 2, y1 = (h - 12) * ((i + 1) / n);
    const tw = W - i * 2.4, tc = channelled(tw, Dk, Math.max(1, Math.round(tw / 22)), 1, 0.3, 3);
    loft(b, [{ y, ring: shift(tc.ring, 0, cz) }, { y: y1, ring: shift(scale(tc.ring, 0.95, 0.94), 0, cz) }], plain, { kinds: tc.role.map((k) => [f.pier === accent ? bronze : plain, dark, slot, t.edge][k]) });
    cap(b, shift(scale(rect(tw, Dk), 0.95, 0.94), 0, cz), y1, roof);
    gorge(b, shift(scale(rect(W - i * 2.4, Dk, BEV), 0.95, 0.94), 0, cz), y1, 2.4, 1.0, i === n - 1 ? gold : plain, plain);
    if (i < n - 1) {
      // A colonnade along the front of the terrace above.
      const zf = D * (1 - (i + 1) / n) - D / 2 + 1.8, cols = Math.round(W / 5);
      for (let c = 0; c <= cols; c++) cyl(b, -W / 2 + 2 + ((W - 4) * c) / cols, y1 + 2.4, zf, 0.45, 3.4, 6, plain, gold);
    }
    y = y1 + 2.4;
  }
  // The temple on top.
  const tz = -(D - D / n) / 2, tw = Math.min(W * 0.5, 22), td = Math.min(D / n, 14);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1], [0, 1], [0, -1]]) lathe(b, [[1.0, y], [0.85, y + 6.5], [1.4, y + 7.4]], 8, [plain, gold], { cx: sx * (tw / 2 - 1.5), cz: tz + sz * (td / 2 - 1.5) });
  box(b, 0, y, tz, tw - 6, 6.6, td - 6, lobby, roof);
  box(b, 0, y + 7.4, tz, tw + 1, 1.2, td + 1, gold, gold, 0.3);
  loft(b, [{ y: y + 8.6, ring: shift(rect(tw + 1, td + 1), 0, tz) }, { y: y + 12, ring: shift(rect(2, td * 0.6), 0, tz) }], gold);
  return { beacons: [[0, y + 12.5, tz]], reach: W / 2 };
};

// The pylon: a slab whose walls lean in as they rise, a tall panel of glass in the middle of its long faces, a gorge
// cornice, and four masts standing before it.
export const pylon: Design = (b, t) => {
  const { w, d, h, r } = t;
  const W = w * 0.98, D = d * 0.62, bat = 0.84, mid = 0.17 + 0.07 * r();
  const ring: Ring = [[W / 2, D / 2 - BEV], [W / 2, -D / 2 + BEV], [W / 2 - BEV, -D / 2], [W * mid, -D / 2], [-W * mid, -D / 2], [-W / 2 + BEV, -D / 2], [-W / 2, -D / 2 + BEV], [-W / 2, D / 2 - BEV], [-W / 2 + BEV, D / 2], [-W * mid, D / 2], [W * mid, D / 2], [W / 2 - BEV, D / 2]];
  const kinds = kindsBy(ring, (mx, mz, len) => (len < 1.7 ? t.edge : Math.abs(mz) > D * 0.45 && Math.abs(mx) < W * mid ? slot : plain));
  const hp = h - 4.2;
  loft(b, taper(ring, 0, hp, bat, 0.8), stone, { kinds });
  const topR = scale(ring, bat, 0.8);
  // A cartouche on each pier of the front and the back.
  const lean = (y: number) => 1 + (bat - 1) * (y / hp), face = (y: number) => (D / 2) * (1 + (0.8 - 1) * (y / hp));
  for (const side of [1, -1]) for (const sx of [1, -1]) {
    const mx = (W / 2 + W * mid) / 2, pw = (W / 2 - W * mid) * 0.42;
    cartouche(b, (y) => sx * mx * lean(y), face, side, (y) => pw * lean(y), hp * 0.18, hp * 0.82);
  }
  // A course of stone every four floors, following the walls as they lean in.
  for (let y = REL.storey * 2; y < hp - 3; y += REL.storey * 2) ledge(b, scale(ring, 1 + (bat - 1) * (y / hp), 1 + (0.8 - 1) * (y / hp)), y, 0.7, 0.25, plain);
  gorge(b, topR, hp, 5, 2.2, accent);
  box(b, 0, h + 0.8, -D * 0.1, W * 0.3, 3.2, D * 0.35, louvre, roof, 0.3);
  const masts: V3[] = [];
  for (const x of [-0.36, -0.2, 0.2, 0.36]) masts.push(mast(b, x * W, 0, D / 2 + 1.6, h * (0.98 + 0.08 * r()), 0.32));
  return { beacons: [masts[0], masts[3]], reach: W / 2 + 1 };
};

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

// The plain building of the back rows, seen only as a dark shape with a few lit openings against the city's glow:
// a mass whose walls lean in, bands of stone, a heavy cornice, and sometimes a smaller mass on it.
export const block: Design = (b, t) => {
  const { w, d, h, r } = t;
  const W = w * 1.15, D = d * 1.1, bat = 0.84 + 0.08 * r(), top = h - 3, base = rect(W, D);
  loft(b, [{ y: 0, ring: base }, { y: top, ring: scale(base, bat, bat) }], stone);
  for (let y = REL.storey * 2; y < top - 6; y += REL.storey * 2) ledge(b, scale(base, 1 - ((1 - bat) * y) / top), y + 1.2, 1.2, 0.4, plain);
  ledge(b, scale(base, bat), top + 3, 3, 1.0, r() < 0.25 ? accent : plain);
  if (r() < 0.55) {
    const s2 = scale(base, bat * (0.5 + 0.2 * r()), bat * 0.6), h2 = h * (0.1 + 0.15 * r());
    loft(b, [{ y: top + 3, ring: s2 }, { y: top + 3 + h2, ring: scale(s2, 0.86) }], stone, { foot: top + 3 });
    cap(b, scale(s2, 0.86), top + 3 + h2, roof);
  }
  return { beacons: [], reach: W / 2 };
};

export const CORE = { pylonTower, pylon, mastaba, terrace, block } as const;
export const LANDMARK = { great, pharos, gate, colonnade, sail } as const;
export type CoreName = keyof typeof CORE;
