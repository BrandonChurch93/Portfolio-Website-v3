// The tower with the stepped gold crown (TOWERS[STEP] in src/pieces/world/placed.ts), as a form: built into a Kit
// of the towers' layers (./layers.mjs), in the tower's own frame, its windows taken from a Windows map. Its own make
// is ./step.mjs, and the city's (./city.mjs) builds it with every other building.
//
// A slender tower of cream travertine: a base of two storeys with three portals, and above it four corner piers,
// each a bundle (a fluted buttress at the corner and two pilasters stepping back from it to the bay), which set back
// in three shoulders to arrive at the crown's own width, each shoulder a sloped weathering with a gold beak at its
// corner, the last carrying an urn at each corner. Between each pair of piers a deep bay of windows behind four
// bronze fins, its storeys parted by bronze spandrels, two double floors under gold lintels, and at its head a
// stepped opening with a gold sunburst. On it a crown of five gold tiers, each with a plinth, fluted faces and a
// cornice, under a lantern lit from within and a point.
import { L, P } from '../../lib/plan.mjs';
import { chamfered, face, on } from './kit.mjs';
import { fluted } from './forms.mjs';
import { PLAIN } from './layers.mjs';
import { LANTERN_AT, hash2 } from '../../../../src/pieces/world/parts/towers/windows.ts';

const [, , W, D, TALL] = P.TOWERS[P.STEP];

// The design, in units in the tower's own frame. Every number here is placed against the footprint W by D and the
// height TALL, which the plan fixes.
const S = {
  base: { w: W, d: D, c: 1.2, y0: -3, y1: 15 },
  course: { w: W + 0.8, d: D + 0.8, c: 1.5, y0: 15, y1: 16 },
  // The shaft's levels: from y up, half its width and depth there. Each later one is set back from the one under it
  // over a sloped weathering `weather` tall; the last arrives at the crown's first tier, its plinth's own size.
  levels: [{ y: 16, X: 18.5, Z: 17.5 }, { y: 100, X: 17.7, Z: 16.7 }, { y: 112, X: 16.9, Z: 15.9 }],
  weather: 0.8,
  top: { y0: 120, y1: 125.2, X: 15.75, Z: 14.75, c: 1.2, cornice: [125.2, 126, 0.3], reed: [1.5, 0.3, 0.24] },
  // A pier: the bay's half width, how wide each pilaster is and how far back its face stands from the buttress's,
  // the bevel on each of their edges, the corner's chamfer (the bright edge between the two faces), and the buttress's
  // two flutes (half width, depth).
  pier: { bay: 7.6, wide: 1.3, back: [1.4, 0.7], bevel: 0.3, corner: 1.2, flute: [0.38, 0.26] },
  // How far the bay's glass stands behind the buttress's face.
  deep: 3.6,
  // The bay: windows across, its foot, a storey's height, and its runs of storeys: plain storeys, a double floor (2)
  // under a gold lintel, and the head.
  bay: { cols: 10, foot: 16.5, storey: 2.3, runs: [15, 2, 16, 2, 6], lintel: [0.4, 0.5], head: 3, headRow: 2.4 },
  // The bronze fins, every so many windows, how wide and how far out of the glass, each with a ridge down its front
  // `ridge` deep, so one flank of it catches the light.
  fin: { every: 2, wide: 0.34, out: 1.0, ridge: 0.2 },
  // A spandrel across each storey: how tall (the window's own sill, WINDOW.frame), how far out of the glass, and its
  // bevelled top. It carries its field of windows, so far off it comes to the field's average with the glass and is
  // never a line of its own every storey.
  spandrel: { tall: 0.62, out: 0.2, bevel: 0.14 },
  // The head: how far in from the bay's side each of its three steps is, and how tall each is; its sunburst's rays,
  // their width and depth, and the hub's radius.
  head: { steps: [[2.2, 1.9], [4.4, 1.7], [6.4, 1.5]], rays: 7, ray: [0.45, 0.3], hub: 1.4 },
  // The gold beak at each shoulder's corner: its side and how tall, and the urns on the last shoulder.
  beak: { side: 1.3, tall: 1.6 },
  urn: { scale: 0.62 },
  tiers: [[31.0, 29.0, 126.0, 137.2], [26.0, 24.4, 137.2, 146.4], [21.0, 19.8, 146.4, 154.0], [16.0, 15.2, 154.0, 160.4], [11.4, 10.8, 160.4, 166.0]],
  // The plan's height (TALL) was lowered to picture 9's after the crown was drawn, to under the lantern's top: the
  // point stands `point` units over the lantern, past the plan's height, so the tower keeps the point he saw.
  lantern: { w: 6.0, plinth: [166.0, 166.7], body: LANTERN_AT, point: 3.6, post: 0.85, slots: 4, mullion: 0.22 },
  // How busy the tower is, and its own number, so its floors are lit whole across its four bays.
  busy: 0.62,
  build: 13.7,
  // How wide a flute of the crown is, about: each panel holds a whole number of them.
  reed: 1.3,
  // How far each tier of the crown leans back, in degrees, so that its flutes look up toward the moon.
  batter: 9,
};

// The fields of windows the tower was first built with, which are still taken from the map, in the same order and
// with the same numbers, so that every building after it in the city keeps its windows exactly as they were: this
// tower's own are drawn inside them (Windows.within).
const FIRST = { y0: 16.5, rows: 68, cols: 12, cw: 1.2, ch: (124.6 - 16 - 0.5) / 68 };

// How the bay is lit: by tenant, each taking a run of storeys from run[0] to run[1] tall across the whole bay (or,
// `split` of the time, the bay parted between two at a fin), lit `lit` of the time, at a level from level[0] to
// level[0] + level[1], `fill` of its rooms lit and bright[0] of those brighter, from bright[1] to bright[1] +
// bright[2] (far off a run is a low warm band, since the windows there are drawn at their average and boosted, and
// close up it has life in it); a dark run keeps a stray lit room `stray` of the time and a dim one `dim`. The double
// floors and the head are lit whole and pale.
const LIGHT = { run: [3, 8], split: 0.35, lit: 0.55, level: [0.14, 0.2], warm: [0.12, 0.3], fill: 0.93, bright: [0.2, 0.55, 0.25], stray: 0.05, dim: 0.12, double: [0.9, 0.62], head: [0.7, 0.55] };

function tenants(seed, storeys, cols, every) {
  const h = (a, b) => hash2(seed * 131 + a, b), runs = [];
  for (let k = 0, n = 0; k < storeys; n++) {
    const tall = LIGHT.run[0] + Math.floor(h(11, n) * (LIGHT.run[1] - LIGHT.run[0] + 1));
    const parts = h(13, n) < LIGHT.split ? [[0, every * (1 + Math.floor(h(17, n) * (cols / every - 1)))]] : [[0, cols]];
    if (parts[0][1] < cols) parts.push([parts[0][1], cols]);
    const who = parts.map(([c0, c1], j) => ({ c0, c1, on: h(19 + j, n) < LIGHT.lit, level: LIGHT.level[0] + LIGHT.level[1] * h(23 + j, n), warm: LIGHT.warm[0] + LIGHT.warm[1] * h(29 + j, n), id: n * 7 + j }));
    // Never two dark runs together, so the bay is bands of light with dark between, and never a dark shaft.
    if (runs.length && runs[runs.length - 1].every((t) => !t.on) && who.every((t) => !t.on)) who[0].on = true;
    for (let j = 0; j < tall && k < storeys; j++, k++) runs.push(who);
  }
  return (c, k) => {
    const t = runs[k].find((p) => c >= p.c0 && c < p.c1), r = hash2(seed * 977 + c, k * 31 + 5), r2 = hash2(seed * 389 + c, k * 17 + 3);
    if (t.on) return r < LIGHT.fill ? (r2 < LIGHT.bright[0] ? [LIGHT.bright[1] + LIGHT.bright[2] * hash2(seed * 61 + c, k), t.warm + 0.15] : [t.level * (0.88 + 0.24 * r2), t.warm + 0.1 * (r2 - 0.5)]) : [0.06 * r2, 0.2];
    return r < LIGHT.stray ? [0.35 + 0.3 * r2, 0.3] : r < LIGHT.stray + LIGHT.dim ? [0.08 + 0.1 * r2, 0.15] : [0, 0];
  };
}

// The plan of one corner pier at a level (half width X, half depth Z), at the front right, from the inner back
// corner of its bay at the front round to that of its bay at the side.
function pierPlan(X, Z) {
  const p = S.pier, b = p.bay, w = p.wide, [d2, d1] = p.back, e = p.bevel, [fw, fd] = p.flute, xb = S.levels[0].X - S.deep, zb = S.levels[0].Z - S.deep;
  // One face of it, outward from the bay: the pilasters, each a step forward with its edge bevelled, and the buttress
  // with its two flutes; `far` is how far the face runs, to the corner's chamfer.
  const half = (near, far, back) => {
    const a = b + 2 * w + e, span = far - p.corner - a, pts = [[b, back], [b, near - d2 - e], [b + e, near - d2], [b + w, near - d2], [b + w, near - d1 - e], [b + w + e, near - d1], [b + 2 * w, near - d1], [b + 2 * w, near - e], [a, near]];
    for (const k of [1 / 3, 2 / 3]) { const m = a + span * k; pts.push([m - fw, near], [m, near - fd], [m + fw, near]); }
    return pts;
  };
  return [...half(Z, X, zb), [X - p.corner, Z], [X, Z - p.corner], ...half(X, Z, xb).map(([s, t]) => [t, s]).reverse(), [xb, zb]];
}
// A plan w by d with its corners cut by c, each side reeded: a groove `half` wide each way and `deep` deep about
// every `pitch` units.
function reeded(w, d, c, [pitch, half, deep]) {
  const plan = chamfered(w, d, c), out = [];
  plan.forEach((a, i) => {
    const b = plan[(i + 1) % plan.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    out.push(a);
    if (len < 2 * pitch) return;
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, nx = uz, nz = -ux, n = Math.round(len / pitch);
    for (let k = 1; k < n; k++) {
      const m = (k * len) / n, P = (t, dd) => [a[0] + ux * t + nx * dd, a[1] + uz * t + nz * dd];
      out.push(P(m - half, 0), P(m, deep), P(m + half, 0));
    }
  });
  return out;
}
const QUAD = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
const mirror = (poly, sx, sz) => { const m = poly.map(([x, z]) => [sx * x, sz * z]); return sx * sz < 0 ? m.reverse() : m; };

export function stepTower(kit, win, draft) {
  const E = draft ? 6 : 2.3;

  // The base: two storeys of channelled stone, its front let in by three portals with bronze doors under lit
  // transoms, and a window each side.
  {
    const b = S.base, rust = { lay: 1 };
    kit.prism('stone', chamfered(b.w, b.d, b.c), b.y0, b.y1, { edge: E, tag: rust, skip: (a, c) => a[1] === b.d / 2 && c[1] === b.d / 2 });
    const f = face([0, 0, b.d / 2], [1, 0, 0], [0, 0, 1]);
    const glassIn = (cols, rows) => (g, s0, s1, t0, t1, deep) => {
      const at = win.take(cols, rows, 5 + s0), cw = (s1 - s0) / cols, ch = (t1 - t0) / rows;
      const o = on(g, s0, 0, deep);
      kit.patch('bay', on(g, s0, t0, deep), on(g, s1, t0, deep), on(g, s1, t1, deep), on(g, s0, t1, deep), { nu: cols, nv: rows, want: g.N, tag: { o, T: g.T, y0: t0, c0: at.c0, r0: at.r0, cw, ch } });
    };
    const portal = (door) => (g, s0, s1, t0, t1, deep) => {
      const o = on(g, s0, 0, deep);
      kit.patch('bay', on(g, s0, t0, deep), on(g, s1, t0, deep), on(g, s1, door, deep), on(g, s0, door, deep), { nu: 2, edge: E, want: g.N, tag: { o, T: g.T, y0: t0, door: (s1 - s0) / 2, ch: door - t0 } });
      glassIn(s1 - s0 > 3 ? 3 : 2, 1)(g, s0, s1, door, t1, deep);
    };
    const open = [
      { s0: -3.0, s1: 3.0, t0: 0, t1: 11.2, floor: true, steps: [{ inset: 0, depth: 0.5 }, { inset: 0.5, depth: 0.6 }, { inset: 0.4, depth: 0.5 }], back: portal(7.4) },
      ...[-1, 1].flatMap((k) => {
        const [a, c] = k < 0 ? [-10.6, -7.6] : [7.6, 10.6];
        return [
          { s0: a, s1: c, t0: 0, t1: 8.6, floor: true, steps: [{ inset: 0, depth: 0.5 }, { inset: 0.4, depth: 0.9 }], back: portal(5.9) },
          { s0: a, s1: c, t0: 10.0, t1: 13.6, steps: [{ inset: 0, depth: 0.35 }, { inset: 0.25, depth: 0.45 }], back: glassIn(2, 1) },
          { s0: k < 0 ? -15.6 : 12.9, s1: k < 0 ? -12.9 : 15.6, t0: 1.4, t1: 11.0, steps: [{ inset: 0, depth: 0.35 }, { inset: 0.25, depth: 0.5 }], back: glassIn(2, 4) },
        ];
      }),
    ];
    kit.wall('stone', f, -(b.w / 2 - b.c), b.w / 2 - b.c, b.y0, b.y1, open, { edge: E, tag: rust });
    const c = S.course;
    kit.prism('stone', chamfered(c.w, c.d, c.c), c.y0, c.y1, { top: true, bottom: true, edge: E });
  }

  const p = S.pier, b = p.bay, X0 = S.levels[0].X, Z0 = S.levels[0].Z, xb = X0 - S.deep, zb = Z0 - S.deep, T = S.top;

  // The piers: each level a prism of the pier's plan, and between one level and the next a sloped weathering, every
  // edge of the plan lofted from the one under it to the one set back over it.
  {
    const inner = ([x, z]) => Math.abs(x) <= xb + 1e-6 && Math.abs(z) <= zb + 1e-6;
    const Lv = S.levels, ends = [...Lv.slice(1).map((l) => l.y), T.y0];
    for (const [sx, sz] of QUAD) {
      Lv.forEach((l, k) => {
        const plan = mirror(pierPlan(l.X, l.Z), sx, sz), y0 = k ? l.y + S.weather : l.y;
        kit.prism('stone', plan, y0, ends[k], { edge: E, skip: (a, c) => inner(a) && inner(c), top: k === Lv.length - 1 });
        if (k) {
          const lo = mirror(pierPlan(Lv[k - 1].X, Lv[k - 1].Z), sx, sz), area = plan.reduce((s, [x, z], i) => { const [x2, z2] = plan[(i + 1) % plan.length]; return s + x * z2 - x2 * z; }, 0), dir = area > 0 ? -1 : 1;
          for (let i = 0; i < plan.length; i++) {
            const j = (i + 1) % plan.length;
            if (inner(plan[i]) && inner(plan[j])) continue;
            const want = [-(plan[j][1] - plan[i][1]) * dir, 0, (plan[j][0] - plan[i][0]) * dir];
            kit.patch('stone', [lo[i][0], l.y, lo[i][1]], [lo[j][0], l.y, lo[j][1]], [plan[j][0], y0, plan[j][1]], [plan[i][0], y0, plan[i][1]], { nu: 1, nv: 1, want });
          }
          // The gold beak on the shoulder's corner.
          const B = S.beak, at = Lv[k - 1], cx = sx * (at.X - p.corner * 0.62), cz = sz * (at.Z - p.corner * 0.62);
          kit.prism('gold', chamfered(B.side, B.side, B.side * 0.2).map(([x, z]) => [cx + x, cz + z]), l.y - 0.15, l.y + B.tall, { shrink: 0.08 });
        }
      });
    }
  }

  // The bays: on each face, glass behind four bronze fins, in runs of storeys, two double floors under gold lintels,
  // and the stepped head with its sunburst. Only the front and its right side are ever seen.
  {
    const B = S.bay, cw = (2 * b) / B.cols, faces = [
      face([-b, 0, zb], [1, 0, 0], [0, 0, 1]),
      face([xb, 0, b], [0, 0, -1], [1, 0, 0]),
      face([b, 0, -zb], [-1, 0, 0], [0, 0, -1]),
      face([-xb, 0, -b], [0, 0, 1], [-1, 0, 0]),
    ];
    const headTop = T.y0 - 1.2, storeys = B.runs.filter((_, i) => i % 2 === 0).reduce((s, n) => s + n, 0);
    faces.forEach((f, i) => {
      const first = win.take(FIRST.cols, FIRST.rows, i, S.busy, true, { build: S.build, y0: FIRST.y0, ch: FIRST.ch, u0: 0, cw: FIRST.cw, face: i, storey: FIRST.ch });
      const lit = tenants(Math.round(S.build * 100) + i, storeys, B.cols, S.fin.every), seen = i === 0, P2 = (s, out) => { const q = on(f, s, 0); return [q[0] + f.N[0] * out, q[2] + f.N[2] * out]; };
      const field = (y0, rows, ch, dr, paint) => {
        const at = win.within(first, 0, dr, B.cols, rows, paint), tag = { o: f.o, T: f.T, y0, c0: at.c0, r0: at.r0, cw, ch };
        kit.patch('bay', on(f, 0, y0), on(f, 2 * b, y0), on(f, 2 * b, y0 + rows * ch), on(f, 0, y0 + rows * ch), { nu: B.cols, nv: draft ? Math.ceil(rows / 3) : rows, want: f.N, tag });
        if (!seen) return;
        const sp = S.spandrel, fh = S.fin.wide / 2;
        for (let r = 0; r < rows; r++) for (let j = 0; j < B.cols / S.fin.every; j++) {
          const s0 = j * S.fin.every * cw + (j ? fh : 0), s1 = (j + 1) * S.fin.every * cw - (j < B.cols / S.fin.every - 1 ? fh : 0), y = y0 + r * ch;
          kit.patch('bay', on(f, s0, y, -sp.out), on(f, s1, y, -sp.out), on(f, s1, y + sp.tall - sp.bevel, -sp.out), on(f, s0, y + sp.tall - sp.bevel, -sp.out), { want: f.N, tag });
          kit.patch('bay', on(f, s0, y + sp.tall - sp.bevel, -sp.out), on(f, s1, y + sp.tall - sp.bevel, -sp.out), on(f, s1, y + sp.tall, -0.02), on(f, s0, y + sp.tall, -0.02), { want: [f.N[0], 1, f.N[2]], tag });
        }
      };
      kit.patch('bay', on(f, 0, S.levels[0].y), on(f, 2 * b, S.levels[0].y), on(f, 2 * b, B.foot), on(f, 0, B.foot), { nu: B.cols, nv: 1, want: f.N, tag: PLAIN });
      let y = B.foot, dr = 0, k = 0;
      B.runs.forEach((n, ri) => {
        if (ri % 2 === 0) {
          const k0 = k;
          field(y, n, B.storey, dr, (c, r) => lit(c, k0 + r));
          y += n * B.storey; dr += n; k += n;
        } else {
          field(y, 1, n * B.storey, dr, () => LIGHT.double);
          y += n * B.storey; dr += 1;
          const [tall, out] = B.lintel;
          kit.patch('bay', on(f, 0, y), on(f, 2 * b, y), on(f, 2 * b, y + tall), on(f, 0, y + tall), { nu: B.cols, nv: 1, want: f.N, tag: PLAIN });
          if (seen) kit.box('gold', -b - 0.1, b + 0.1, y, y + tall, zb - 0.05, zb + out, { top: true, bottom: true });
          y += tall;
        }
      });
      // The head: lit whole, framed in steps of stone, behind a sunburst of gold rays from the middle of its foot.
      const y0 = y, rows = Math.max(1, Math.round((headTop - y0) / B.headRow)), ch = (headTop - y0) / rows;
      field(y0, rows, ch, dr, () => LIGHT.head);
      dr += rows;
      kit.patch('bay', on(f, 0, headTop), on(f, 2 * b, headTop), on(f, 2 * b, T.y0), on(f, 0, T.y0), { nu: B.cols, nv: 1, want: f.N, tag: PLAIN });
      if (seen) {
        const H = S.head, front = S.levels[2].Z - p.back[0];
        const steps = [];
        let t = y0;
        for (const [inset, tall] of H.steps) { t += tall; steps.push([inset, t]); }
        for (const sx of [-1, 1]) {
          let prev = -1;
          for (const [inset, from] of steps) {
            const a = b - inset, c = prev < 0 ? b : b - prev;
            kit.box('stone', sx > 0 ? a : -c, sx > 0 ? c : -a, from, T.y0, zb - 0.1, front, { edge: E, top: false });
            prev = inset;
          }
        }
        const last = steps[steps.length - 1];
        kit.box('stone', -(b - last[0]), b - last[0], last[1] + 0.9, T.y0, zb - 0.1, front, { edge: E, top: false });
        // The rays reach to the stepped outline of the opening, each a gold bar standing out of the glass.
        const rects = [[b, steps[0][1]], ...steps.map(([inset], k) => [b - inset, steps[k + 1]?.[1] ?? last[1] + 0.9])];
        const inside = (x, yy) => rects.some(([hw, top]) => Math.abs(x) <= hw && yy <= top);
        const reach = (ang) => { let t = H.hub; while (inside(Math.cos(ang) * (t + 0.02), y0 + Math.sin(ang) * (t + 0.02))) t += 0.02; return t; };
        const [rw, rd] = H.ray, z = zb + 0.05;
        for (let r = 0; r < H.rays; r++) {
          const ang = Math.PI * (0.08 + 0.84 * (r / (H.rays - 1))), ux = Math.cos(ang), uy = Math.sin(ang), len = reach(ang) - 0.05, nx = -uy * rw / 2, ny = ux * rw / 2;
          const P = (t, side, dz) => [ux * t + side * nx, y0 + uy * t + side * ny, z + dz];
          kit.patch('gold', P(H.hub, -1, rd), P(H.hub, 1, rd), P(len, 1, rd), P(len, -1, rd), { want: [0, 0, 1] });
          kit.patch('gold', P(H.hub, -1, 0), P(H.hub, -1, rd), P(len, -1, rd), P(len, -1, 0), { want: [-ny, nx, 0] });
          kit.patch('gold', P(H.hub, 1, rd), P(H.hub, 1, 0), P(len, 1, 0), P(len, 1, rd), { want: [ny, -nx, 0] });
        }
        const n = 10, hub = Array.from({ length: n + 1 }, (_, k) => [H.hub * Math.cos((Math.PI * k) / n), H.hub * Math.sin((Math.PI * k) / n)]);
        for (let k = 0; k < n; k++) {
          const [ax, ay] = hub[k], [cx, cy] = hub[k + 1];
          kit.patch('gold', [0, y0, z + 0.35], [ax, y0 + ay, z + 0.2], [cx, y0 + cy, z + 0.2], [0, y0, z + 0.35], { want: [0, 0, 1] });
          kit.patch('gold', [ax, y0 + ay, z + 0.2], [ax, y0 + ay, z], [cx, y0 + cy, z], [cx, y0 + cy, z + 0.2], { want: [(ax + cx) / 2, (ay + cy) / 2, 0] });
        }
        // The fins, from the bay's foot to the head.
        for (let j = S.fin.every; j < B.cols; j += S.fin.every) {
          const m = j * cw, h = S.fin.wide / 2, flat = ([x, zz]) => Math.abs((x - f.o[0]) * f.N[0] + (zz - f.o[2]) * f.N[2]) < 1e-6;
          kit.prism('bay', [P2(m - h, 0), P2(m - h, S.fin.out - S.fin.ridge), P2(m, S.fin.out), P2(m + h, S.fin.out - S.fin.ridge), P2(m + h, 0)], B.foot, y0, { edge: E, tag: PLAIN, top: true, skip: (a, c) => flat(a) && flat(c) });
        }
      }
    });

    // The last shoulder: the stone the crown stands on, as wide as its first tier's plinth, its cornice, and an urn on
    // each corner of the ledge under it.
    kit.prism('stone', reeded(2 * T.X, 2 * T.Z, T.c, T.reed), T.y0, T.y1, { edge: E });
    const [c0, c1, out] = T.cornice;
    kit.prism('stone', chamfered(2 * (T.X + out), 2 * (T.Z + out), T.c + out * 0.8), c0, c1, { top: true, bottom: true, edge: E });
    const u = S.urn.scale, L2 = S.levels[2];
    for (const [sx, sz] of QUAD) {
      const ux = sx * (T.X + (L2.X - T.X) * 0.42), uz = sz * (T.Z + (L2.Z - T.Z) * 0.42), sq = (w) => chamfered(w * u, w * u, w * u * 0.18).map(([x, z]) => [ux + x, uz + z]), y = T.y0;
      kit.prism('stone', sq(1.7), y, y + 0.5 * u, { top: true });
      kit.prism('stone', sq(1.15), y + 0.5 * u, y + 1.9 * u, { shrink: 0.82 });
      kit.prism('stone', sq(1.45), y + 1.9 * u, y + 2.25 * u, { top: true, bottom: true });
      kit.prism('gold', sq(1.0), y + 2.25 * u, y + 3.6 * u, { shrink: 0.02 });
    }
  }

  // The crown: five tiers of gold, each smaller than the one under it.
  {
    // A tier: a core set back behind four upright corner pilasters, a plinth and a cornice, and between each pair of
    // pilasters a panel of flutes that leans back from the plinth to the cornice, so its flanks look up toward the
    // moon while the tier's outline stays square.
    const bk = { kit, E, draft }, fl = (w, d, y0, y1, k) => fluted(bk, w, d, y0, y1, k, { batter: S.batter, reed: S.reed });
    S.tiers.forEach(([w, d, y0, y1], k) => fl(w, d, y0, y1, k));
    // The lantern: a lit room behind slots between gold posts, under a cornice and the point.
    const t = S.lantern, w = t.w, [l0, l1] = t.body, core = w / 2 - 0.3;
    kit.prism('gold', chamfered(w + 2.4, w + 2.4, 0.6), t.plinth[0], t.plinth[1], { top: true });
    const lf = [face([-core, 0, core], [1, 0, 0], [0, 0, 1]), face([core, 0, core], [0, 0, -1], [1, 0, 0]), face([core, 0, -core], [-1, 0, 0], [0, 0, -1]), face([-core, 0, -core], [0, 0, 1], [-1, 0, 0])];
    lf.forEach((f) => {
      const n = t.slots, cw = (2 * core) / n, top = l1 - 0.35;
      kit.patch('gold', on(f, 0, l0), on(f, 2 * core, l0), on(f, 2 * core, top), on(f, 0, top), { nu: n, nv: 1, want: f.N, tag: { glow: [l0, top] } });
      const P2 = (s, out) => { const q = on(f, s, 0); return [q[0] + f.N[0] * out, q[2] + f.N[2] * out]; }, h = t.mullion / 2;
      for (let k = 1; k < n; k++) kit.prism('gold', [P2(k * cw - h, 0), P2(k * cw - h, 0.3), P2(k * cw + h, 0.3), P2(k * cw + h, 0)], l0, top, {});
    });
    for (const [sx, sz] of QUAD) kit.box('gold', sx > 0 ? w / 2 - t.post : -w / 2, sx > 0 ? w / 2 : -w / 2 + t.post, l0, l1, sz > 0 ? w / 2 - t.post : -w / 2, sz > 0 ? w / 2 : -w / 2 + t.post, {});
    kit.prism('gold', chamfered(w + 1.0, w + 1.0, 0.5), l1 - 0.35, l1, { top: true, bottom: true });
    kit.prism('gold', chamfered(w * 0.62, w * 0.62, 0.4), l1, Math.max(TALL, l1 + t.point), { shrink: 0.04 });
  }
}
