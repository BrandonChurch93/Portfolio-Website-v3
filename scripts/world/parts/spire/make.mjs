// The spire (src/pieces/world/parts/spire.ts), made ahead and shipped: public/world/spire.bin, its geometry and
// baked light, and public/world/spire-windows.png, the state of every window.
//
//   node scripts/world/parts/spire/make.mjs [--draft]
//
// The tallest thing in the world, on the hero's center line, straight under his name: picture 9's slender rocket.
// One taper from a broad foot to a needle, made of upright fins of warm granite that run the whole height from the
// podium. In plan each fin is a block at a corner of the tower, and each ring of four stands outside the last,
// lower, so the tower narrows as each ring ends: a ring ends in a crisp shoulder of three facets that climbs in to
// the fins inside it, never a flat ledge, with a turned gold finial on its front bevels. Every outer corner is cut
// by a broad bevel turned toward the moon, which is behind the world and to the right, so the moon lays a band of
// light down the right side of the tower from its foot to its needle and the left is in shade. The fronts are
// fluted, with a belt every so often. The shaft at the middle carries a strip of lit windows from the podium up
// through the ring, its rhythm changing at every shoulder; above a band of gold it is set in, with a lit lancet in
// each face, and ends in a short crown of four bevelled faces with a slit of light in each, from which the needle
// rises. Round the shaft hangs one broad ring of polished gold, tilted as Saturn's is, with a rolled bead round its
// outer edge and a lip round its inner one. The podium and the court are round 1's, with its ledges in granite.
import { pack } from '../../lib/pack.mjs';
import { png } from '../../lib/png.mjs';
import { bake } from '../../lib/bake.mjs';
import { any as anyHit, build as buildBvh } from '../../lib/bvh.mjs';
import * as THREE from 'three';
import { L, P, light, linear, storeBounce } from '../../lib/plan.mjs';
import { Kit, chamfered, face, on } from './kit.mjs';
import { Windows } from './windows.mjs';

const draft = process.argv.includes('--draft');
const began = performance.now();
const { tall: TALL, ring: RING } = L.SPIRE;

// How the stone is laid, which the stone's material reads: dark granite in courses, the podium's channelled
// granite, the court's paving laid in rings, and pale limestone trim.
const LAY = { granite: 0, rusticated: 1, court: 2, trim: 3 };
const mixed = (a, b, k, s) => linear(a).map((v, i) => (v + (linear(b)[i] - v) * k) * s);
const ALBEDO = { granite: mixed('text-3', 'bronze', 0.42, 0.4), trim: mixed('text-2', 'copper-light', 0.3, 0.42), court: mixed('text-3', 'bronze', 0.4, 0.4) };

// The design, in units, y up from the ground under the spire. Where each ring of fins ends, and how far out it
// stands, were read off picture 9 (fromPicture in the layout).
const S = {
  court: { r: L.COURT, top: 0.9, steps: [[L.COURT, 0], [L.COURT - 1.8, 0.45], [L.COURT - 3.6, 0.9]], under: -1.8 },
  podium: { w: 54, c: 5, y0: -1, y1: 40.5, cornice: [[40.5, 41.4, 0.8], [41.4, 42.4, 1.5]], parapet: [42.4, 44.6], frieze: [37.6, 39.8] },
  buttress: { at: 25.5, tiers: [[8, -1, 20.5], [6.6, 21.8, 32.2], [5.4, 33.4, 44.2]], finial: 1.05 },
  // Where every fin and the shaft rise from, inside the podium.
  foot: 40,
  // The shaft: how far out its faces are, and where it is set in (step) to the upper shaft (R, up to top), with a
  // band of gold at the step. The upper shaft carries a lit lancet in each face (how wide, how deep, and from and
  // to, up from the step).
  shaft: { R: 10, step: 205, upper: { R: 8.6, top: 217.5, band: 0.8, lancet: [1.1, 0.7, 1.4, 10.6] } },
  // The crown: the point the upper shaft ends in, as how far out it is at each height, an ogee of four faces with
  // the corners bevelled as the fins' are, and a slit of light let into each face from its foot (how wide either side
  // of its middle, how deep, how tall).
  crown: { at: [[217.5, 8.6], [219.5, 7.9], [222, 6.5], [224.5, 4.9], [227, 3.4], [229.2, 2.3], [231, 1.7]], slit: [0.6, 0.6, 6.5] },
  // The lamps in the upper shaft's lancets and the crown's slits: how bright, and how pale, as a window's are.
  lamp: [0.95, 0.6],
  // The rings of fins, inside out: how far out each stands (R), where its fin begins inside (e: its plan is the
  // square from e to R at each corner), where it ends (top: the top of its shoulder), and its finials' size.
  rings: [
    { R: 16, e: 8, top: 165, finial: 1.9 },
    { R: 21, e: 13.5, top: 117.5, finial: 1.7 },
    { R: 24.5, e: 19, top: 81.5, finial: 1.5 },
  ],
  // A fin's shape in plan. Its outer corner is cut by a broad bevel the view sees (bevel: how far across it is as
  // seen, slope: how far it is turned from the front, in degrees), so the moon behind the world and to the right
  // lays a band of light down the right side of the tower, joined to the face, and the left is in shade. Then the
  // splay of its inner face (how far across), the small round of the edges either side of the strip of windows,
  // the chamfer at its back. Each shoulder is a crisp slope of three facets, each turned so far in from upright, in
  // degrees, and taking such a share of the way in.
  fin: { bevel: 2.7, slope: 52, arris: 0.12, splay: 1.0, edge: 0.45, back: 0.8, facets: [[14, 0.2], [36, 0.35], [62, 0.45]] },
  // The shaft's own strip, at the middle of its front: how wide either side of the middle, how deep, and between
  // each plaque of bronze and gold, its columns and its floors.
  strip: { half: 4.8, deep: 1.0, plaque: 3.2, runs: [{ cols: 7, floor: 1.75 }, { cols: 7, floor: 1.65 }, { cols: 6, floor: 1.7 }, { cols: 5, floor: 1.6 }], top: 201 },
  // The bronze mullions between the columns and the transoms at every floor, how wide, and how far each stands out
  // of the glass: deep enough to throw a shadow across the pane under the night's light from above.
  mullion: { wide: 0.2, out: 0.55, transom: 0.16, every: 1 },
  // The band of gold round each fin where its shoulder begins: how far it stands out and how tall it is.
  collar: { out: 0.22, tall: 0.75 },
  needle: { y: 231, collar: 2.5 },
  // The ring: a broad flat band whose middle is RING.r out. Its section, out from that middle and up from it: a
  // rolled bead round its outer edge (where its middle is, its radius, and how far round it runs before it meets
  // the flat faces), the flat faces each side (how far up), on which the engraving is drawn, and a smaller rolled
  // lip round its inner edge (where, and its radius), so both edges of the band show.
  ring: { bead: [2.15, 0.88, 142], face: 0.48, lip: [-3.15, 0.48], segs: draft ? 160 : 256 },
};
const RINGS = [{ R: S.shaft.R, e: 0, top: S.shaft.step }, ...S.rings];
// Where a ring's shoulder begins: it climbs in by its facets from upright at R, ending just inside the faces of the
// ring within at the ring's top.
const shoulderOf = (k) => {
  const r = S.rings[k], to = RINGS[k].R - 0.4, way = r.R - to;
  const rise = S.fin.facets.reduce((s, [deg, share]) => s + (share * way) / Math.tan(deg * L.D2R), 0);
  return { from: r.top - rise, to, way };
};
S.rings.forEach((r, k) => Object.assign(r, { shoulder: shoulderOf(k) }));

const win = new Windows(4127);
// The stone's numbers: where a place is along its face and up it (or across and along, on a face that looks up or
// down), how the stone is laid, and on a face that is fluted, how many flutes in from its inner edge it is (-1
// elsewhere). The flutes are drawn by the material, so many as fit the face whole, each about FLUTE across.
const FLUTE = 1.25;
const kit = new Kit({
  stone: {
    width: 4, attr: (p, n, tag) => {
      if (Math.abs(n[1]) > 0.7) return [p[0], p[2], tag?.lay ?? 0, -1];
      const tx = n[2], tz = -n[0], l = Math.hypot(tx, tz) || 1, [a, b] = tag?.flute ?? [0, -1], x = Math.abs(p[0]);
      const per = (b - a) / Math.max(1, Math.round((b - a) / FLUTE)), flute = b > a && x > a - 1e-3 && x < b + 1e-3 ? (x - a) / per : -1;
      return [(p[0] * tx + p[2] * tz) / l, p[1], tag?.lay === LAY.court ? LAY.trim : tag?.lay ?? 0, flute];
    },
  },
  bay: {
    width: 4, attr: (p, n, tag) => {
      if (!tag || tag.plain) return [0, 0, 0, 0];
      const s = (p[0] - tag.o[0]) * tag.T[0] + (p[2] - tag.o[2]) * tag.T[2], t = p[1] - tag.y0;
      if (tag.door) return [s / tag.door, t / tag.ch, -tag.door, tag.ch];
      return [tag.c0 + s / tag.cw, tag.r0 + t / tag.ch, tag.cw, tag.ch];
    },
  },
  // Gold: where a place is across a panel of flutes, in flutes, and 1; or on the ring, its radius, 2, and how far
  // round.
  gold: {
    width: 3, attr: (p, n, tag) => {
      if (tag?.flute) return [((p[0] - tag.o[0]) * tag.T[0] + (p[2] - tag.o[2]) * tag.T[2]) / tag.flute, 1, 0];
      if (tag?.ring) return [tag.r, 2, tag.round];
      return [0, 0, 0];
    },
  },
});
const PLAIN = { plain: true }, GRANITE = { lay: LAY.granite }, TRIM = { lay: LAY.trim }, RUST = { lay: LAY.rusticated };
const fluted = (a, b) => ({ lay: LAY.granite, flute: [a, b] });
const E = draft ? 5 : 2.2;
// Faces the view sees are cut finely, so their stored light varies across them; the rest coarsely.
const seen = (n) => (n[2] > 0.15 || n[1] > 0.4 ? E : E * 6);
const square = (x, z, w, c = w * 0.2) => chamfered(w, w, c).map(([a, b]) => [x + a, z + b]);
const corners = [[1, 1], [-1, 1], [1, -1], [-1, -1]];

// ---------------------------------------------------------------------------------------------------------------
// Plans. An outline is a list of corners [x, z, radius]: a corner with a radius is rounded by an arc of ARC
// pieces whose inner points are smooth. Every corner gives the same number of points whatever its radius, so the
// plans of one solid can be lofted into one another; a radius of 0 puts them all on the corner.
const ARC = 3;
function outline(cs) {
  const pts = [], round = [], n = cs.length;
  for (let i = 0; i < n; i++) {
    const [x, z, r] = cs[i], [px, pz] = cs[(i - 1 + n) % n], [nx, nz] = cs[(i + 1) % n];
    const a = [px - x, pz - z], b = [nx - x, nz - z], la = Math.hypot(...a), lb = Math.hypot(...b);
    const ang = la > 1e-6 && lb > 1e-6 ? Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (la * lb)))) : Math.PI;
    if (!(r > 1e-4) || ang > Math.PI - 1e-3 || ang < 1e-3) { for (let k = 0; k <= ARC; k++) { pts.push([x, z]); round.push(false); } continue; }
    const t = Math.min(r / Math.tan(ang / 2), 0.49 * la, 0.49 * lb), rr = t * Math.tan(ang / 2);
    const ua = [a[0] / la, a[1] / la], ub = [b[0] / lb, b[1] / lb], T1 = [x + ua[0] * t, z + ua[1] * t], T2 = [x + ub[0] * t, z + ub[1] * t];
    const bis = [ua[0] + ub[0], ua[1] + ub[1]], lbis = Math.hypot(...bis), cd = rr / Math.sin(ang / 2), C = [x + (bis[0] / lbis) * cd, z + (bis[1] / lbis) * cd];
    let a0 = Math.atan2(T1[1] - C[1], T1[0] - C[0]), a1 = Math.atan2(T2[1] - C[1], T2[0] - C[0]);
    let d = a1 - a0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    for (let k = 0; k <= ARC; k++) { const q = a0 + (d * k) / ARC; pts.push([C[0] + rr * Math.cos(q), C[1] + rr * Math.sin(q)]); round.push(k > 0 && k < ARC); }
  }
  return { pts, round };
}
const mirror = (cs, sx, sz) => cs.map(([x, z, r]) => [sx * x, sz * z, r]);

// The bevel of an outer corner where a face stands R out and has `room` across it: how far across it is as seen
// (b), how far back it goes (d), and which way its face looks in plan (n, outward, in the quadrant +x +z).
function bevelOf(room, depth) {
  const f = S.fin, b = Math.max(0.05, Math.min(f.bevel, room * 0.62)), d = Math.max(0.05, Math.min(b * Math.tan(f.slope * L.D2R), depth));
  const l = Math.hypot(b, d);
  return { b, d, n: [d / l, b / l], arris: Math.min(f.arris, b * 0.2, d * 0.2) };
}

// A fin of ring k at one corner, at a height where it stands R out: its plan in the quadrant (sx, sz). Its outer
// corner is cut by the bevel; its inner face is splayed toward the view, from where it leaves the ring within (zIn)
// to its front, with its edge rounded; its back corner is chamfered.
function finPlan(k, R, sx, sz) {
  const f = S.fin, e = RINGS[k].e, inner = RINGS[k - 1]?.R ?? 0, zIn = Math.min(inner - 0.2, R - 0.3), sp = Math.min(f.splay, (R - e) * 0.4);
  const v = bevelOf(R - e - sp, R - e - f.back - 0.1);
  const cs = [[e, e, 0], [R - f.back, e, 0], [R, e + f.back, 0], [R, R - v.d, v.arris], [R - v.b, R, v.arris], [e + sp, R, sx > 0 ? 0 : Math.min(f.edge, sp * 0.5)], [e, zIn, 0]];
  return outline(mirror(cs, sx, sz));
}

// The shaft's plan where it stands R out: a square, its two front corners cut by the bevel and its back corners
// chamfered, with a strip let into the middle of its front (half across, deep).
function shaftPlan(R, half, deep) {
  const v = bevelOf(R - half - 0.4, R * 0.6), c = R * 0.15, h = Math.min(half, R - v.b - 0.3), edge = deep > 0.05 ? Math.min(S.fin.edge, deep * 0.6) : 0;
  const cs = [[R, -R, c], [R, R - v.d, v.arris], [R - v.b, R, v.arris], [h, R, 0], [h, R - deep, 0], [-h, R - deep, 0], [-h, R, edge], [-(R - v.b), R, v.arris], [-R, R - v.d, v.arris], [-R, -R, c]];
  return outline(cs);
}

// Rings of a plan up a height, for a loft: a list of [y, plan, tag, crease].
function lofted(layer, list, o = {}) {
  const rings = list.map(([y, plan, tag, crease]) => ({ y, poly: plan.pts, tag, crease }));
  kit.loft(layer, rings, { round: list[0][1].round, edge: seen, ...o });
}

// A shoulder's heights and how far out it is at each: from upright at R, facet by facet, ending just inside the
// ring within. Every turn between facets is a crease.
function sweep(k) {
  const r = S.rings[k], s = r.shoulder, out = [[s.from, r.R]];
  let y = s.from, R = r.R;
  for (const [deg, share] of S.fin.facets) { R -= share * s.way; y += (share * s.way) / Math.tan(deg * L.D2R); out.push([y, R]); }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The court: a round plaza of finer paving, with a low stepped edge, a little proud of the ground.
{
  const C = S.court, prof = [];
  for (let r = 26; r < C.steps[2][0] - 0.01; r += draft ? 6 : 2.5) prof.push([r, C.top]);
  for (let k = C.steps.length - 1; k >= 0; k--) {
    const [r, y] = C.steps[k], below = k > 0 ? C.steps[k - 1][1] : C.under;
    prof.push([r, y, true], [r, below, true]);
  }
  prof.reverse();
  kit.lathe('stone', prof.map(([r, y, s]) => [r, y, s]), draft ? 64 : 160, { tag: { lay: LAY.court } });
}

// A turned gold finial on a plinth of trim, size k: a collar, a swelling vase, a waist, a second collar and a
// slender point.
function finial(x, z, y, k) {
  kit.prism('stone', square(x, z, 2.0 * k, 0.4 * k), y - 0.4, y + 0.55 * k, { top: true, tag: TRIM });
  kit.prism('stone', square(x, z, 1.55 * k, 0.3 * k), y + 0.55 * k, y + 0.95 * k, { top: true, tag: TRIM });
  const prof = [[0, 0], [0.62, 0, true], [0.62, 0.22, true], [0.45, 0.32], [0.5, 0.55], [0.66, 0.95], [0.7, 1.3], [0.6, 1.7], [0.38, 2.05], [0.24, 2.3, true], [0.42, 2.42, true], [0.42, 2.58, true], [0.26, 2.7], [0.19, 3.3], [0.1, 4.3], [0.02, 5.2], [0, 5.25]];
  const turned = new Kit({ gold: { width: 3, attr: kit.layers.gold.attr } });
  turned.lathe('gold', prof.map(([r, h, s]) => [r * k, y + 0.95 * k + h * k, s]), draft ? 8 : 14);
  const m = turned.meshes(new THREE.Matrix4().makeTranslation(x, 0, z).toArray()).gold, G = kit.layers.gold, base = G.p.length / 3;
  for (let i = 0; i < m.positions.length; i++) { G.p.push(m.positions[i]); G.n.push(m.normals[i]); }
  for (let i = 0; i < m.attr.length; i++) G.a.push(m.attr[i]);
  for (const i of m.indices) G.i.push(i + base);
}

// The podium: two storeys of channelled granite, its front let in by a tall portal and two lesser ones, with bronze
// doors under lit transoms, tall slit windows, a frieze of gold reeds, a cornice and a parapet; a stepped buttress
// at each corner, the front two crowned by a finial.
{
  const b = S.podium, X = b.w / 2;
  kit.prism('stone', chamfered(b.w, b.w, b.c), b.y0, b.y1, { edge: E, tag: RUST, skip: (a, c) => a[1] === X && c[1] === X });
  const f = face([0, 0, X], [1, 0, 0], [0, 0, 1]);
  const glassIn = (cols, rows) => (g, s0, s1, t0, t1, deep) => {
    const at = win.take(cols, rows, 5 + s0), cw = (s1 - s0) / cols, ch = (t1 - t0) / rows;
    kit.patch('bay', on(g, s0, t0, deep), on(g, s1, t0, deep), on(g, s1, t1, deep), on(g, s0, t1, deep), { nu: cols, nv: rows, want: g.N, tag: { o: on(g, s0, 0, deep), T: g.T, y0: t0, c0: at.c0, r0: at.r0, cw, ch } });
  };
  const portal = (door, cols, rows) => (g, s0, s1, t0, t1, deep) => {
    kit.patch('bay', on(g, s0, t0, deep), on(g, s1, t0, deep), on(g, s1, door, deep), on(g, s0, door, deep), { nu: 2, edge: E, want: g.N, tag: { o: on(g, s0, 0, deep), T: g.T, y0: t0, door: (s1 - s0) / 2, ch: door - t0 } });
    glassIn(cols, rows)(g, s0, s1, door, t1, deep);
  };
  const open = [
    { s0: -4.4, s1: 4.4, t0: b.y0, t1: 27.5, floor: true, steps: [{ inset: 0, depth: 0.6 }, { inset: 0.7, depth: 0.6 }, { inset: 0.55, depth: 0.6 }, { inset: 0.45, depth: 0.7 }], back: portal(10.5, 3, 7) },
    ...[-1, 1].flatMap((k) => {
      const at = (a, c) => (k < 0 ? [-c, -a] : [a, c]);
      const [p0, p1] = at(10.6, 16.0), [w0, w1] = at(6.2, 7.8), [e0, e1] = at(19.2, 21.0);
      return [
        { s0: p0, s1: p1, t0: b.y0, t1: 15.5, floor: true, steps: [{ inset: 0, depth: 0.5 }, { inset: 0.5, depth: 0.5 }, { inset: 0.4, depth: 0.7 }], back: portal(8.2, 2, 3) },
        { s0: p0, s1: p1, t0: 18.6, t1: 33.4, steps: [{ inset: 0, depth: 0.4 }, { inset: 0.35, depth: 0.5 }], back: glassIn(4, 9) },
        { s0: w0, s1: w1, t0: 3.2, t1: 33.4, steps: [{ inset: 0, depth: 0.35 }, { inset: 0.25, depth: 0.45 }], back: glassIn(1, 19) },
        { s0: e0, s1: e1, t0: 3.2, t1: 33.4, steps: [{ inset: 0, depth: 0.35 }, { inset: 0.25, depth: 0.45 }], back: glassIn(1, 19) },
      ];
    }),
    { s0: -3.2, s1: 3.2, t0: 29.6, t1: 35.6, steps: [{ inset: 0, depth: 0.4 }, { inset: 0.35, depth: 0.5 }], back: glassIn(4, 4) },
  ];
  kit.wall('stone', f, -(X - b.c), X - b.c, b.y0, b.y1, open, { edge: E, tag: RUST });
  kit.reeds('gold', f, -(X - b.c) + 0.6, X - b.c - 0.6, b.frieze[0], b.frieze[1], draft ? 20 : 64, 0.22, { edge: E });
  for (const [y0, y1, out] of b.cornice) kit.prism('stone', chamfered(b.w + 2 * out, b.w + 2 * out, b.c + out * 0.8), y0, y1, { top: true, bottom: true, edge: E, tag: GRANITE });
  kit.prism('stone', chamfered(b.w - 1, b.w - 1, b.c), b.parapet[0], b.parapet[1], { top: true, edge: E, tag: GRANITE });
  const t = S.buttress;
  for (const [sx, sz] of corners) {
    const x = sx * t.at, z = sz * t.at;
    t.tiers.forEach(([w, y0, y1], k) => {
      kit.prism('stone', square(x, z, w), y0, y1, { edge: E, tag: k === 0 ? RUST : GRANITE });
      const next = t.tiers[k + 1];
      if (next) kit.prism('stone', square(x, z, w + 0.3), y1, next[1], { shrink: (next[0] + 0.1) / (w + 0.3), top: true, tag: TRIM });
    });
    const top = t.tiers[t.tiers.length - 1];
    kit.prism('stone', square(x, z, top[0] + 0.6), top[2], top[2] + 0.7, { top: true, bottom: true, tag: TRIM });
    if (sz > 0) finial(x, z, top[2] + 1.1, t.finial);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The rings of fins. Each fin rises from inside the podium to where its shoulder begins, then climbs in by its
// facets to the ring within. A front fin has a band of gold round it where its shoulder begins, and a turned gold
// finial standing on its bevel.
S.rings.forEach((r, k) => {
  const ring = k + 1, sh = sweep(k);
  for (const [sx, sz] of corners) {
    const sp = Math.min(S.fin.splay, (r.R - r.e) * 0.4), v = bevelOf(r.R - r.e - sp, r.R - r.e - S.fin.back - 0.1);
    const list = [[S.foot, finPlan(ring, r.R, sx, sz), fluted(r.e + sp, r.R - v.b), false]];
    sh.forEach(([y, R]) => list.push([y, finPlan(ring, R, sx, sz), GRANITE, true]));
    lofted('stone', list);
    if (sz > 0) {
      const c = S.collar, band = finPlan(ring, r.R + c.out, sx, sz);
      kit.loft('gold', [{ y: r.shoulder.from - c.tall, poly: band.pts }, { y: r.shoulder.from, poly: band.pts, crease: true }], { round: band.round, edge: seen, top: true, bottom: true });
      const at = [r.R - v.b / 2 - v.n[0] * 1.15 * r.finial, r.R - v.d / 2 - v.n[1] * 1.15 * r.finial];
      finial(sx * at[0], at[1], r.shoulder.from, r.finial);
    }
  }
});

// The shaft: its strip at the middle of the front from the podium to near the step; a band of gold at the step;
// the upper shaft above it, set in, with its lancet in each face; and the crown.
{
  const sh = S.shaft, u = sh.upper, d = S.strip.deep, st = S.strip.top, [lw, ld, l0, l1] = u.lancet;
  const low = fluted(S.strip.half, sh.R - bevelOf(sh.R - S.strip.half - 0.4, sh.R * 0.6).b), high = fluted(lw / 2, u.R - bevelOf(u.R - lw / 2 - 0.4, u.R * 0.6).b);
  lofted('stone', [[S.foot, shaftPlan(sh.R, S.strip.half, d), low, false], [st, shaftPlan(sh.R, S.strip.half, d), GRANITE, true], [st + 0.6, shaftPlan(sh.R, S.strip.half, 0), low, true], [sh.step, shaftPlan(sh.R, S.strip.half, 0), low, true]], { top: true, topTag: GRANITE });
  const band = shaftPlan(sh.R + 0.25, S.strip.half, 0);
  kit.loft('gold', [{ y: sh.step - u.band, poly: band.pts }, { y: sh.step, poly: band.pts, crease: true }], { round: band.round, edge: seen, top: true, bottom: true });
  const y0 = sh.step, up = (t) => y0 + t;
  lofted('stone', [[y0, shaftPlan(u.R, lw / 2, 0), high, false], [up(l0), shaftPlan(u.R, lw / 2, 0), high, true], [up(l0) + 0.3, shaftPlan(u.R, lw / 2, ld), high, true], [up(l1), shaftPlan(u.R, lw / 2, ld), high, true], [up(l1) + 0.3, shaftPlan(u.R, lw / 2, 0), high, true], [u.top, shaftPlan(u.R, lw / 2, 0), GRANITE, true]]);
  for (const [ax, az] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const f = face([ax * (u.R - ld), 0, az * (u.R - ld)], [az, 0, -ax], [ax, 0, az]);
    win.light(glazing(f, -lw / 2, lw / 2, up(l0), up(l1), 1, 1.75, 61 + ax * 3 + az, false), S.lamp[0], S.lamp[1]);
  }
  // The crown: an ogee of four faces from the upper shaft to the needle, its corners bevelled, and a slit of light
  // let into each face from its foot.
  const [sw, sd, sl] = S.crown.slit, at = S.crown.at;
  const crownPlan = (R, slit) => shaftPlan(R, sw, slit);
  const yl = at[0][0] + sl, Rl = interp(at, yl), rows = [];
  at.forEach(([y, R], i) => {
    if (i > 0 && at[i - 1][0] < yl && y >= yl) rows.push([yl - 0.25, crownPlan(interp(at, yl - 0.25), sd), GRANITE, true], [yl, crownPlan(Rl, 0), GRANITE, true]);
    rows.push([y, crownPlan(R, y < yl ? sd : 0), GRANITE, i === 0]);
  });
  lofted('stone', rows, { top: true });
  // The slit's glass follows the crown's own rows, so it lies on the back of the slit all the way up.
  const glassAt = [...at.filter(([y]) => y < yl - 0.25), [yl - 0.25, interp(at, yl - 0.25)]];
  for (const [ax, az] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const P = (y, R, s) => [az * s + ax * (R - sd), y, -ax * s + az * (R - sd)], ya = glassAt[0][0], yb = glassAt[glassAt.length - 1][0];
    const w = win.take(1, 4, 70 + ax * 3 + az), tag = { o: P(0, 0, -sw), T: [az, 0, -ax], y0: ya, c0: w.c0, r0: w.r0, cw: 2 * sw, ch: (yb - ya) / 4 };
    win.light(w, S.lamp[0], S.lamp[1]);
    for (let i = 0; i + 1 < glassAt.length; i++) {
      const [y0, R0] = glassAt[i], [y1, R1] = glassAt[i + 1];
      kit.patch('bay', P(y0, R0, -sw), P(y0, R0, sw), P(y1, R1, sw), P(y1, R1, -sw), { nu: 1, nv: 2, want: [ax, 0.3, az], tag });
    }
  }
}
// The needle: a collar where the crown ends, and the mast running on, with a collar part way, to the tip. Its last
// third is kept thick enough to be drawn at the page's size up to the plan's tip.
{
  const y = S.needle.y, c = S.needle.collar;
  const prof = [[0, y - 1.1], [c * 0.75, y - 1.1, true], [c, y - 0.5], [c, y + 0.3, true], [c * 0.72, y + 0.75], [1.4, y + 1.3], [1.15, y + 2.0], [1.1, y + 9.2], [1.55, y + 9.6, true], [1.55, y + 10.3, true], [0.95, y + 10.8], [0.88, y + 12], [0.72, y + 18], [0.55, y + 24], [0.34, TALL - 1.6], [0.16, TALL - 0.45], [0, TALL]];
  kit.lathe('gold', prof, draft ? 10 : 20);
}
function interp(at, y) {
  for (let i = 0; i + 1 < at.length; i++) if (y <= at[i + 1][0]) return at[i][1] + ((at[i + 1][1] - at[i][1]) * (y - at[i][0])) / (at[i + 1][0] - at[i][0]);
  return at[at.length - 1][1];
}

// The strips of windows. A field of narrow upright panes in bronze, its columns parted by bronze mullions and its
// floors by transoms, a floor to a row; under each pane a bronze spandrel, which the material draws.
function glazing(f, s0, s1, y0, y1, cols, floor, mood, mullions = true) {
  const rows = Math.max(1, Math.round((y1 - y0) / floor)), ch = (y1 - y0) / rows, cw = (s1 - s0) / cols, at = win.take(cols, rows, mood), o = on(f, s0, 0);
  kit.patch('bay', on(f, s0, y0), on(f, s1, y0), on(f, s1, y1), on(f, s0, y1), { nu: cols, nv: draft ? Math.ceil(rows / 3) : rows, want: f.N, tag: { o, T: f.T, y0, c0: at.c0, r0: at.r0, cw, ch } });
  if (!mullions) return at;
  const m = S.mullion, P2 = (sv, out) => { const q = on(f, sv, 0); return [q[0] + f.N[0] * out, q[2] + f.N[2] * out]; };
  for (let c = 1; c < cols; c++) {
    const s = s0 + c * cw;
    kit.prism('bay', [P2(s - m.wide / 2, 0), P2(s - m.wide / 2, m.out), P2(s + m.wide / 2, m.out), P2(s + m.wide / 2, 0)], y0, y1, { edge: E * 2, tag: PLAIN, top: true });
  }
  if (draft) return at;
  for (let r = 1; r < rows; r += m.every) {
    const y = y0 + r * ch;
    kit.prism('bay', [P2(s0, 0), P2(s0, m.out * 0.7), P2(s1, m.out * 0.7), P2(s1, 0)], y - m.transom, y, { tag: PLAIN, top: true, bottom: true });
  }
  return at;
}
// The shaft's strip, in runs between plaques: each plaque a bronze panel with gold reeds standing out of it.
{
  const R = S.shaft.R, d = S.strip.deep, f = face([0, 0, R - d], [1, 0, 0], [0, 0, 1]), h = S.strip.half;
  const breaks = [S.rings[2].top, S.rings[1].top, S.rings[0].top].map((y) => [y - S.strip.plaque / 2, y + S.strip.plaque / 2]);
  const runs = [[S.podium.parapet[1] + 0.6, breaks[0][0]], [breaks[0][1], breaks[1][0]], [breaks[1][1], breaks[2][0]], [breaks[2][1], S.strip.top]];
  runs.forEach(([y0, y1], i) => { const r = S.strip.runs[i]; glazing(f, -h, h, y0, y1, r.cols, r.floor, 11 + i * 3); });
  for (const [y0, y1] of breaks) {
    kit.patch('bay', on(f, -h, y0), on(f, h, y0), on(f, h, y1), on(f, -h, y1), { nu: 4, want: f.N, tag: PLAIN });
    const g = face([0, 0, R - d + 0.05], [1, 0, 0], [0, 0, 1]);
    kit.reeds('gold', g, -h + 0.35, h - 0.35, y0 + 0.45, y1 - 0.45, draft ? 6 : 16, 0.22, { round: true, segs: 4 });
  }
}

// The ring, in its own frame, turned into place: tilted about x, then about z, at its height on the shaft.
const ringKit = new Kit({ gold: { width: 3, attr: kit.layers.gold.attr } });
{
  // Counter clockwise round the section: up the bead's outer side to where it meets the top face, in across the
  // top face, round the inner lip, and out across the underside.
  const R = RING.r, q = S.ring, [bo, br] = q.bead, ty = q.face, [lo, lr] = q.lip, prof = [];
  const A = 180 - Math.asin(Math.min(1, ty / br)) / L.D2R, n = 16, edge = bo + br * Math.cos(A * L.D2R);
  for (let k = 0; k <= n; k++) { const a = -A + (2 * A * k) / n; prof.push([R + bo + br * Math.cos(a * L.D2R), br * Math.sin(a * L.D2R), k === 0 || k === n]); }
  const flat = (sg) => { const out = [], m = Math.ceil((edge - lo) / 0.8); for (let k = 1; k < m; k++) out.push([R + edge - ((edge - lo) * k) / m, sg * ty]); return out; };
  prof.push(...flat(1));
  for (let a = 90; a <= 270; a += 20) prof.push([R + lo + lr * Math.cos(a * L.D2R), lr * Math.sin(a * L.D2R)]);
  prof.push(...flat(-1).reverse());
  ringKit.lathe('gold', prof, q.segs, { closed: true, tag: { ring: true } });
}
const ringAt = new THREE.Matrix4().makeTranslation(0, TALL * RING.up, 0).multiply(new THREE.Matrix4().makeRotationZ(RING.tilt[1] * L.D2R)).multiply(new THREE.Matrix4().makeRotationX(RING.tilt[0] * L.D2R));

// Into the world: the spire stands at the origin, turned square to the view.
const made = kit.meshes(new THREE.Matrix4().toArray()), ring = ringKit.meshes(ringAt.toArray()).gold;
made.gold = join(made.gold, ring);
function join(a, b) {
  const n = a.positions.length / 3, cat = (x, y, T) => { const o = new T(x.length + y.length); o.set(x); o.set(y, x.length); return o; };
  return { positions: cat(a.positions, b.positions, Float32Array), normals: cat(a.normals, b.normals, Float32Array), indices: cat(a.indices, b.indices.map((i) => i + n), Uint32Array), attr: cat(a.attr, b.attr, Float32Array), width: a.width };
}

// What each vertex is made of, for the bake, and the light it gives off.
const BRONZE = linear('bronze').map((v) => v * 0.3), GLASS = [0.03, 0.025, 0.02], GOLD = linear('copper-light').map((v) => v * 0.4);
const stone = made.stone, ns = stone.positions.length / 3, albedoStone = new Float32Array(ns * 3);
for (let i = 0; i < ns; i++) {
  const lay = Math.round(stone.attr[i * 4 + 2]);
  albedoStone.set(lay === LAY.trim ? ALBEDO.trim : lay === LAY.court ? ALBEDO.court : ALBEDO.granite, i * 3);
}
const bay = made.bay, nb = bay.positions.length / 3, emitBay = new Float32Array(nb * 3), albedoBay = new Float32Array(nb * 3);
for (let i = 0; i < nb; i++) {
  const [u, v, cw, ch] = bay.attr.subarray(i * 4, i * 4 + 4);
  albedoBay.set(cw > 0 ? GLASS.map((g, k) => 0.5 * g + 0.5 * BRONZE[k]) : BRONZE, i * 3);
  if (!(cw > 0)) continue;
  const f = win.field(u, v);
  let rr = 0, gg = 0, bb = 0, n = 0;
  for (const du of [-0.5, 0.5]) for (const dv of [-0.5, 0.5]) {
    const c = Math.min(f.c0 + f.cols - 1, Math.max(f.c0, Math.floor(u + du))), w = Math.min(f.r0 + f.rows - 1, Math.max(f.r0, Math.floor(v + dv)));
    const e = win.radiance(c, w, cw, ch);
    rr += e[0]; gg += e[1]; bb += e[2]; n++;
  }
  emitBay.set([(Math.PI * rr) / n, (Math.PI * gg) / n, (Math.PI * bb) / n], i * 3);
}
const gold = made.gold;

// What stands round it while its light is baked, and is not kept: its neighbours as plain blocks giving off the
// city's own light, and the ground, lit warm by the streets round the court.
const lights = light(), site = surroundings();
function surroundings() {
  const NEAR = 190, STREET = { power: 0.4, at: L.COURT + 10, wide: 12 }, CITY = 0.12, GROUND = 0.05, hot = linear('hot');
  const k2 = new Kit({ block: { width: 0 } });
  P.TOWERS.forEach(([x, z, w, d, tall, turn]) => {
    if (Math.hypot(x, z) > NEAR || L.within(x, z) < 0.6 * Math.max(w, d)) return;
    const c = Math.cos(turn * L.D2R), s = Math.sin(turn * L.D2R), g = L.ground(x, z) - 2, at = (u, v) => [x + u * c + v * s, z - u * s + v * c];
    k2.prism('block', [at(-w / 2, d / 2), at(w / 2, d / 2), at(w / 2, -d / 2), at(-w / 2, -d / 2)], g, g + tall + 2, { top: true, edge: 12 });
  });
  const blocks = k2.meshes(new THREE.Matrix4().toArray()).block, nbk = blocks.positions.length / 3, glow = new Float32Array(nbk * 3);
  for (let i = 0; i < nbk; i++) if (Math.abs(blocks.normals[i * 3 + 1]) < 0.5) glow.set(hot.map((v) => Math.PI * CITY * v), i * 3);
  const step = 4, n = Math.round((2 * NEAR) / step) + 1, pos = [], nor = [], emit = [], idx = [], keep = new Map();
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -NEAR + i * step, z = -NEAR + j * step, r = Math.hypot(x, z);
    if (r < L.COURT - 2) continue;
    keep.set(j * n + i, pos.length / 3);
    pos.push(x, L.ground(x, z) - 0.3, z);
    nor.push(0, 1, 0);
    const e = STREET.power * Math.exp(-(((r - STREET.at) / STREET.wide) ** 2));
    emit.push(...hot.map((h) => Math.PI * e * h));
  }
  for (let j = 0; j + 1 < n; j++) for (let i = 0; i + 1 < n; i++) {
    const a = keep.get(j * n + i), b = keep.get(j * n + i + 1), c = keep.get((j + 1) * n + i), d = keep.get((j + 1) * n + i + 1);
    if ([a, b, c, d].some((v) => v === undefined)) continue;
    idx.push(a, c, b, b, c, d);
  }
  return [
    { name: 'blocks', positions: blocks.positions, normals: blocks.normals, indices: blocks.indices, albedo: [GROUND, GROUND * 0.85, GROUND * 0.7], emit: glow, receive: false },
    { name: 'ground', positions: new Float32Array(pos), normals: new Float32Array(nor), indices: new Uint32Array(idx), albedo: [GROUND, GROUND * 0.85, GROUND * 0.7], emit: new Float32Array(emit), receive: false },
  ];
}
const scene = {
  meshes: [
    { name: 'stone', ...stone, albedo: albedoStone, receive: true },
    { name: 'bay', ...bay, albedo: albedoBay, emit: emitBay, receive: true },
    { name: 'gold', ...gold, albedo: GOLD, receive: true },
    ...site,
  ],
  moon: lights.moon, core: null, sky: lights.sky,
};
const stats = {};
const lit = await bake(scene, { samples: draft ? { core: 1, moon: 4, hemi: 48 } : { core: 1, moon: 24, hemi: 384 }, bounces: draft ? 1 : 2, reach: 60, stats });
console.log(`bake: ${stats.vertices} vertices, ${stats.triangles} triangles, ${stats.seconds.toFixed(1)} s`);

// Floodlights, hidden behind the podium's parapet and on the court at its foot, which wash the fins above them
// with warm light from below, as a city's tallest tower is lit at night: bright at the foot and falling away up it,
// with the strip's reveals in shadow. Each is a row of lamps aimed up and a little in, worked out here with a shadow
// ray each and added to the stored bounce. They are not seen: what is seen is the light they lay. How strong a lamp
// is, how narrow its beam (a power of its cosine), how far in from straight up it leans, in degrees, how far apart
// the lamps are, and how far out from a face.
const FLOOD = { power: 60, beam: 5, lean: 22, every: 1.4, off: 2.4, most: 4 };
const floodAt = (() => {
  const lamps = [], row = (X, y, power, off = FLOOD.off) => {
    const r = X + off, n = Math.max(2, Math.round((2 * r) / FLOOD.every)), c = Math.cos(FLOOD.lean * L.D2R), k = Math.sin(FLOOD.lean * L.D2R);
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let i = 0; i <= n; i++) {
      const u = -r + (2 * r * i) / n, p = sx ? [sx * r, y, u] : [u, y, sz * r];
      lamps.push({ p, aim: [-sx * k, c, -sz * k], power });
    }
  };
  row(S.rings[2].R, S.podium.parapet[1] + 0.1, FLOOD.power * 0.45, 0.6);
  row(S.podium.w / 2, S.court.top + 0.1, FLOOD.power * 0.8, 4);
  const all = [made.stone, made.bay, made.gold], np = all.reduce((t, m) => t + m.positions.length, 0), pos = new Float32Array(np), idx = [];
  let o = 0;
  for (const m of all) { pos.set(m.positions, o); for (const i of m.indices) idx.push(i + o / 3); o += m.positions.length; }
  const tree = buildBvh(pos, new Uint32Array(idx));
  return (p, n) => {
    let e = 0;
    for (const l of lamps) {
      const dx = p[0] - l.p[0], dy = p[1] - l.p[1], dz = p[2] - l.p[2], d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < 0.04 || d2 > 3600) continue;
      const d = Math.sqrt(d2), lx = dx / d, ly = dy / d, lz = dz / d;
      const out = lx * l.aim[0] + ly * l.aim[1] + lz * l.aim[2], cosr = -(lx * n[0] + ly * n[1] + lz * n[2]);
      if (out <= 0 || cosr <= 0) continue;
      const k = (l.power * out ** FLOOD.beam * cosr) / d2;
      if (k < 0.01) continue;
      if (anyHit(tree, p[0] + n[0] * 0.05, p[1] + n[1] * 0.05, p[2] + n[2] * 0.05, -lx, -ly, -lz, d - 0.1)) continue;
      e += k;
    }
    return e;
  };
})();

// How shut in a place is, and the light that reaches it, averaged over this far in units: the gold's flutes are
// finer than its vertices, and their shade is the cornices', not each flute's.
const SMOOTH = { stone: 0, bay: 0, gold: 1.2 };
function smooth(m, values, width, r) {
  if (!(r > 0)) return values;
  const n = m.positions.length / 3, cell = new Map(), key = (x, y, z) => `${Math.floor(x / r)},${Math.floor(y / r)},${Math.floor(z / r)}`, out = new Float32Array(values.length);
  for (let i = 0; i < n; i++) { const k = key(m.positions[i * 3], m.positions[i * 3 + 1], m.positions[i * 3 + 2]); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(i); }
  for (let i = 0; i < n; i++) {
    const [x, y, z] = m.positions.subarray(i * 3, i * 3 + 3), sum = new Float64Array(width);
    let w = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      for (const j of cell.get(key(x + a * r, y + b * r, z + c * r)) ?? []) {
        if (Math.round(m.attr[j * m.width + 1]) !== Math.round(m.attr[i * m.width + 1])) continue;
        const d = Math.hypot(m.positions[j * 3] - x, m.positions[j * 3 + 1] - y, m.positions[j * 3 + 2] - z);
        if (d > r) continue;
        const k = 1 - d / r;
        for (let q = 0; q < width; q++) sum[q] += k * values[j * width + q];
        w += k;
      }
    }
    for (let q = 0; q < width; q++) out[i * width + q] = sum[q] / w;
  }
  return out;
}

const meshes = ['stone', 'bay', 'gold'].map((name) => {
  const m = made[name], raw = lit[name], n = m.positions.length / 3, light4 = new Float32Array(n * 4), bounce4 = new Float32Array(n * 4);
  const l = { ...raw, open: smooth(m, raw.open, 1, SMOOTH[name]), bounce: smooth(m, raw.bounce, 3, SMOOTH[name]) };
  const hot = linear('hot');
  for (let i = 0; i < n; i++) {
    const e = Math.min(FLOOD.most, floodAt(m.positions.subarray(i * 3, i * 3 + 3), m.normals.subarray(i * 3, i * 3 + 3)));
    if (e > 0) for (let q = 0; q < 3; q++) l.bounce[i * 3 + q] += e * hot[q];
  }
  for (let i = 0; i < n; i++) {
    light4.set([l.core[i], l.moon[i], l.open[i], 0], i * 4);
    bounce4.set([storeBounce(l.bounce[i * 3]), storeBounce(l.bounce[i * 3 + 1]), storeBounce(l.bounce[i * 3 + 2]), 0], i * 4);
  }
  const attributes = { normal: { data: m.normals, size: 3, as: 'i16' }, light: { data: light4, size: 4, as: 'u8' }, bounce: { data: bounce4, size: 4, as: 'u8' } };
  if (name === 'stone') attributes.grain = { data: m.attr, size: 4, as: 'f32' };
  if (name === 'bay') attributes.cell = { data: m.attr, size: 4, as: 'f32' };
  if (name === 'gold') attributes.gild = { data: m.attr, size: 3, as: 'f32' };
  return { name, positions: m.positions, indices: m.indices, attributes, info: { triangles: m.indices.length / 3 } };
});
const triangles = meshes.reduce((s, m) => s + m.indices.length / 3, 0);
pack('public/world/spire.bin', meshes, { windows: 'spire-windows.png', triangles, draft });
png('public/world/spire-windows.png', win.size, win.size, win.data, 3);
console.log(`spire: ${triangles} triangles (${meshes.map((m) => `${m.name} ${m.indices.length / 3}`).join(', ')}), windows lit ${(100 * win.lit()).toFixed(0)}%, ${((performance.now() - began) / 1000).toFixed(1)} s`);
