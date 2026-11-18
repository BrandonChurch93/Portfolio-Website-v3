// Sculpt S, the field for the surface maker (scripts/world/lib/surface.mjs): under 0 inside the rock. One solid
// body: the planet, with the torn part between the skin's two torn lines made of the great masses of masses.mjs, the
// roof and the floor, all joined, and behind them a backfill so that no black there is a gap one can see through.
//
// Round 4: each mass is a stack of sheets, like slate broken along its bedding. A mass has a bedding (the plane its
// sheets lie in, leaning in toward the ball, its own for every mass) and is cut along it into sheets 4 to 14 units
// thick, a thick one beside thin ones. Each sheet ends where it broke: its outline pulled back from its neighbours'
// or standing proud of them, broken by planes into angular ends that come to points, and its face a little out or
// back. Where two sheets part there is a slot two to four units wide and many deep, which the ball does not reach:
// those are the cracks. A mass's back is `thick` behind its face, and its sides follow its outline in the picture.
// Round 5: the sheets are 7 to 24 units thick and lie nearly in a mass's face (masses.mjs), so a face is one broad sheet
// with two or three partings across it and the sheets' ends step out beyond its edge. At 4 to 14 units and on edge
// every mass was a comb of thirty pages, which shaded one another and read as corrugated card.
//
//   setup(args)        args = { stones } (the rubble, from make.mjs)
//   field(x, y, z)     the rock
//   bare(x, y, z)      the rock without its rubble
//   outer(x, y, z)     the planet outside the space the rock is made in: a blocker for the light only
import { L } from '../../lib/plan.mjs';
import { below } from '../land/shape.mjs';
import { TORN } from '../rock-r/trace.mjs';
import { MASSES, FLOOR, ROOF, BOTTOM, LANE, socket } from './masses.mjs';

export const lip = 2.5;
const UNIT = L.PICTURE.unit, C = L.CORE.at, R = L.CORE.r, CP = L.pictured(...L.CORE.at);
// The space the rock is made in.
export const BOX = [[-525, -612, -260], [478, 5, 700]];
// How far under the land's surface the rock's top stays, in units, and how far out of the planet's surface a proud
// mass may stand, as a share of the planet's depth.
const UNDER = 3.5, PROUD = 1.15;
// The core's clearance: nothing nearer its middle than r, give or take rag, cut by so many planes, and nothing in
// front of it inside its outline (disc, opening toward the visitor by open: opened wide, its wall was a smooth
// ring round the ball seen from in front).
const CLEAR = { r: 114, rag: 9, disc: 101, open: 0.06, planes: 70 };
// A face is never flat: a broad swell and a finer one, in units, and over how far.
const RELIEF = { deep: 2.6, over: 38, fine: 0.55, fineOver: 9 };
// An outline is ragged: how far, in units, and over how far, broad and fine.
const RAG = { deep: 1.8, over: 9, fine: 0.35, fineOver: 4 };
// An edge is chipped: a bevel this many units across at least, and up to `more` more.
const BEVEL = { least: 1.2, more: 3.6, over: 7 };
// A side leans out as it goes back, so it is seen from in front.
const TAPER = 0.22;
// How far a plate of the back wall is turned its own way, at most, in radians (any other mass, 0.4 of it).
const TURN = 0.3;
// The backfill: how far behind the socket it lies, in the core's radii, so what shows between the masses is a recess
// the ball barely reaches. Under the roof it goes far back (high, from so far up), so what shows between the roof
// and the plates is black.
// Under the ball it goes far back too (low, from under down): there it faced the ball and was a flat lit table. And
// between so many radii out and so many it is `more` further back, so what shows of it beside the ball is in the
// shadow of the masses round it: there it faced the ball at a slant and was a lit band.
const BACKFILL = { gap: 0.8, deep: 14, over: 60, high: 70, from: -150, low: 90, under: -290, more: [0.35, 1.45, 2.7] };
// The sheets (round 4): how thick, for a thin one and a thick one (least, most), and the share that are thin; how
// far a sheet's outline is pulled back from the mass's (under 0: proud of it), least and most, and how far it differs
// from its neighbour's, least and most; how far its face stands out or back; its parting with the next, a slot this
// wide (least, most) and this deep (least, most) in from where the two are seen, or none for the share `fused`; how many
// planes break its end and how far they bite in from its outline, least and most; the chamfer on its edge; the
// bedding's curl along the way to the ball, in units for a unit squared, how far its sheets fan (how much thicker
// they grow for each hundred units along the way to the ball, at most), and the partings' wander, broad and fine,
// units over units. A mass's bedding leans `dip` degrees from its face (0: sheets lying in the face, a stack seen from above; 90:
// sheets on edge, a comb) and its run turns up to `strike` degrees from the way to the ball. A mass may set any of
// these (`sheet` in masses.mjs), or its bedding outright (`bed`, a direction in the world).
const SHEET = { thin: [7, 11], thick: [14, 24], thinShare: 0.4, pull: [-6, 16], step: [3, 13], lift: 3.2, gap: [2.4, 4.4], deep: [9, 24], fused: 0.3, cuts: 3, bite: [3, 26], bevel: [0.5, 1.3], curl: 0.0016, fan: 0.4, wander: [4, 30, 1.2, 9], dip: [14, 34], strike: 28 };
// The back wall of the stream's lane under the floor: it leans back as it goes down, so it faces down from the core,
// and is broken.
const LANEWALL = { lean: 0.32, deep: 5, over: 11, fine: 1.6 };

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const N = (x, y, z, s) => (L.noise(x, y, z, s) - 0.5) * 2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Toward the visitor, along the line of sight.
export const VIEW = norm(sub(L.fromPicture(688, 437, 151), L.fromPicture(688, 437, 150)));

// The signed distance to a polygon (flat [x0, y0, x1, y1, ...]), under 0 inside.
function sdPoly(p, x, y) {
  const n = p.length / 2;
  let d = Infinity, s = 1;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = p[i * 2], yi = p[i * 2 + 1], xj = p[j * 2], yj = p[j * 2 + 1];
    const ex = xj - xi, ey = yj - yi, wx = x - xi, wy = y - yi;
    const t = Math.min(1, Math.max(0, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1)));
    const bx = wx - ex * t, by = wy - ey * t, dd = bx * bx + by * by;
    if (dd < d) d = dd;
    const c1 = y >= yi, c2 = y < yj, c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}
// A line of places across the picture, read at a place across.
function along(line, px) {
  if (px <= line[0][0]) return line[0][1];
  for (let i = 1; i < line.length; i++) if (px <= line[i][0]) { const [x0, y0] = line[i - 1], [x1, y1] = line[i]; return y0 + ((y1 - y0) * (px - x0)) / (x1 - x0); }
  return line[line.length - 1][1];
}
// The land's front edge, eased over a few tens of units, and the front of the planet.
const lipSoft = (x) => { let a = 0; for (let k = -4; k <= 4; k++) a += L.lip(x + k * 9); return a / 9; };
const frontZ = (x) => Math.min(lipSoft(x), Math.sqrt(Math.max(0, L.WORLD.half ** 2 - x * x)));

export let M = null, CUTS = [], TUBE = null, ROOFB = null, STONES = [], GRID = null;

// The point on a plane (through c, normal n) seen at a place in the picture.
function onPlane(px, py, c, n) {
  let z0 = c[2], z1 = c[2] + 40;
  let f0 = dot3(sub(L.fromPicture(px, py, z0), c), n), f1 = dot3(sub(L.fromPicture(px, py, z1), c), n);
  for (let k = 0; k < 6 && Math.abs(f1) > 1e-6; k++) {
    const z2 = z1 - (f1 * (z1 - z0)) / (f1 - f0 || 1e-9);
    z0 = z1; f0 = f1; z1 = Math.max(-900, Math.min(900, z2));
    f1 = dot3(sub(L.fromPicture(px, py, z1), c), n);
  }
  return L.fromPicture(px, py, z1);
}

function prepare(m) {
  const r = rng(m.seed * 7919 + 13), poly = m.poly;
  let cx = 0, cy = 0;
  for (const [x, y] of poly) { cx += x; cy += y; }
  cx /= poly.length; cy /= poly.length;
  let z = m.z, c, n;
  if (z === undefined) {
    // On the socket: its depth where the outline's middle is seen, and its face along the socket there.
    z = C[2];
    for (let k = 0; k < 6; k++) { const p = L.fromPicture(cx, cy, z); z = C[2] + R * (socket(Math.hypot(p[0] - C[0], p[1] - C[1]) / R) + (m.dz ?? 0)); }
    c = L.fromPicture(cx, cy, z);
    const rho = Math.hypot(c[0] - C[0], c[1] - C[1]) / R, out = [(c[0] - C[0]) / (rho * R || 1), (c[1] - C[1]) / (rho * R || 1), 0];
    const slope = (socket(rho + 0.02) - socket(rho - 0.02)) / 0.04;
    n = norm([-slope * out[0], -slope * out[1], 1]);
    // Turned from the ball (toward the outside) and up, each by its own degrees.
    const turnTo = (v, deg) => { const t = norm(sub(v, n.map((q) => q * dot3(v, n)))), a = (deg * Math.PI) / 180; n = norm(n.map((q, i) => q * Math.cos(a) + t[i] * Math.sin(a))); };
    const [tOut, tUp] = m.turn ?? [0, 0];
    if (tOut) turnTo(out, tOut);
    if (tUp) turnTo([0, 1, 0], tUp);
  } else {
    c = L.fromPicture(cx, cy, z);
    const toBall = norm(sub(C, c)), a = m.aim;
    n = norm([toBall[0] * a.ball + VIEW[0] * a.view, toBall[1] * a.ball + VIEW[1] * a.view + (a.up ?? 0), toBall[2] * a.ball + VIEW[2] * a.view]);
  }
  let e1 = cross([0, 1, 0], n);
  e1 = Math.hypot(...e1) < 0.2 ? norm(cross(n, [0, 0, 1])) : norm(e1);
  let e2 = cross(n, e1);
  // A mass placed by hand is turned a little its own way, so no two faces take the ball's light alike.
  const vary = TURN * 0.4, [t1, t2] = m.z !== undefined ? m.turn ?? [(r() - 0.5) * 2 * vary, (r() - 0.5) * 2 * vary] : [0, 0];
  n = norm([n[0] + e1[0] * t1 + e2[0] * t2, n[1] + e1[1] * t1 + e2[1] * t2, n[2] + e1[2] * t1 + e2[2] * t2]);
  e1 = cross([0, 1, 0], n);
  e1 = Math.hypot(...e1) < 0.2 ? norm(cross(n, [0, 0, 1])) : norm(e1);
  e2 = cross(n, e1);
  const corners = poly.map(([px, py]) => onPlane(px, py, c, n));
  let far = 0;
  for (const k of corners) far = Math.max(far, Math.hypot(...sub(k, c)));
  const flat = new Float64Array(poly.flat());
  // Corners knocked off: at the sharpest few corners, a break 12 to 34 units in.
  const turn = poly.map((p, i) => {
    const a0 = poly[(i + poly.length - 1) % poly.length], a1 = poly[(i + 1) % poly.length];
    const u = norm([p[0] - a0[0], p[1] - a0[1], 0]), v = norm([a1[0] - p[0], a1[1] - p[1], 0]);
    return { i, sharp: 1 - (u[0] * v[0] + u[1] * v[1]) };
  }).sort((x, y) => y.sharp - x.sharp);
  const breaks = [];
  for (let k = 0; k < Math.min(4, turn.length); k++) {
    if (r() < 0.15) continue;
    const K = corners[turn[k].i], out = sub(K, c), ou = dot3(out, n);
    const flatOut = norm([out[0] - n[0] * ou, out[1] - n[1] * ou, out[2] - n[2] * ou]);
    const tilt = 0.45 + 0.5 * r(), deep = 10 + 22 * r();
    const Nb = norm([flatOut[0] + n[0] * tilt + e1[0] * (r() - 0.5) * 0.6, flatOut[1] + n[1] * tilt + e2[1] * (r() - 0.5) * 0.6, flatOut[2] + n[2] * tilt]);
    breaks.push({ n: Nb, at: [K[0] - flatOut[0] * deep, K[1] - flatOut[1] * deep, K[2] - flatOut[2] * deep] });
  }
  // The sheets: the bedding, then the sheets along it, each with its own pull, lift, parting, chamfer and broken end.
  const S = { ...SHEET, ...(m.sheet ?? {}) }, want = sub(C, c), tb = norm(sub(want, n.map((q) => q * dot3(want, n)))), side = cross(n, tb);
  let b;
  if (S.bed) b = norm(S.bed);
  else {
    const st = ((S.strikeAt ?? (r() - 0.5) * 2 * S.strike) * Math.PI) / 180, dip = ((S.dipAt ?? S.dip[0] + (S.dip[1] - S.dip[0]) * r()) * Math.PI) / 180;
    const b0 = side.map((q, i) => q * Math.cos(st) + tb[i] * Math.sin(st));
    b = norm(n.map((q, i) => q * Math.cos(dip) + b0[i] * Math.sin(dip)));
  }
  const s1 = norm(cross(b, Math.abs(b[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), s2 = cross(b, s1);
  const ends = corners.map((k) => sub(k, c));
  const span = far + m.thick + 24, lo = [], hi = [], pull = [], lift = [], gap = [], deep = [], bev = [], cuts = [];
  // A small mass is pulled and bitten less: its sheets' ends would be all of it.
  const small = Math.min(1, far / 90);
  let pv = S.pull[0] + (S.pull[1] - S.pull[0]) * r();
  for (let at = -span - 14 * r(); at < span;) {
    const th = r() < S.thinShare ? S.thin[0] + (S.thin[1] - S.thin[0]) * r() : S.thick[0] + (S.thick[1] - S.thick[0]) * r();
    lo.push(at); hi.push(at + th); at += th;
    pull.push(pv * small);
    const dv = (S.step[0] + (S.step[1] - S.step[0]) * r()) * (r() < 0.5 ? -1 : 1);
    pv = pv + dv > S.pull[1] || pv + dv < S.pull[0] ? pv - dv : pv + dv;
    lift.push((r() - 0.5) * 2 * S.lift);
    gap.push(r() < S.fused ? 0 : S.gap[0] + (S.gap[1] - S.gap[0]) * r());
    deep.push(S.deep[0] + (S.deep[1] - S.deep[0]) * r());
    bev.push(S.bevel[0] + (S.bevel[1] - S.bevel[0]) * r());
    const own = [];
    for (let j = 0; j < S.cuts; j++) {
      // Across the face, along the outline: a cut turned toward the face's normal took the whole face off.
      const a = 6.283 * r(), w = [0, 1, 2].map((i) => s1[i] * Math.cos(a) + s2[i] * Math.sin(a) + b[i] * (r() - 0.5) * 0.5), wn = dot3(w, n);
      const along = w.map((q, i) => q - n[i] * wn + n[i] * (r() - 0.5) * 0.5);
      if (Math.hypot(...along) < 0.35) continue;
      const u = norm(along);
      let sup = -Infinity;
      for (const e of ends) sup = Math.max(sup, dot3(e, u));
      own.push(u[0], u[1], u[2], sup - (S.bite[0] + (S.bite[1] - S.bite[0]) * r() ** 1.4) * small);
    }
    cuts.push(new Float64Array(own));
  }
  const sheets = { b, tb, lo: new Float64Array(lo), hi: new Float64Array(hi), pull, lift, gap, deep, bev, cuts, curl: S.curl * (r() < 0.5 ? -1 : 1) * (0.5 + r()), fan: S.fan * (r() - 0.5) * 2, wander: S.wander, most: Math.min(...pull), seed: m.seed + 90 };
  const rho = Math.hypot(c[0] - C[0], c[1] - C[1]) / R;
  return { ...m, c, n, e1, e2, flat, breaks, sheets, rho, reach: far + m.thick + 60, top: m.top ? { at: m.top.at, n: norm(m.top.n) } : null };
}

export function setup(args = {}) {
  M = [...MASSES, ...FLOOR].map(prepare);
  // The planes round the core: directions spread evenly over a sphere and jittered, each at its own distance.
  const rc = rng(4111);
  CUTS = [];
  for (let i = 0; i < CLEAR.planes; i++) {
    const u = 1 - (2 * (i + 0.5)) / CLEAR.planes, th = i * 2.399963 + (rc() - 0.5) * 0.5, r = Math.sqrt(1 - u * u);
    const n = norm([r * Math.cos(th) + (rc() - 0.5) * 0.25, u + (rc() - 0.5) * 0.25, r * Math.sin(th) + (rc() - 0.5) * 0.25]);
    CUTS.push([n[0], n[1], n[2], CLEAR.r + CLEAR.rag * (rc() - 0.3) * 2]);
  }
  // The torn part: between the skin's two torn lines, from above the land to under the planet.
  const left = TORN.left, right = TORN.right;
  TUBE = new Float64Array([left[0][0], 120, ...left.flat(), left[left.length - 1][0], 820, right[right.length - 1][0], 820, ...right.slice().reverse().flat(), right[0][0], 120]);
  // The roof's chunks: a jittered grid across its front, wider than tall, each row sloping its own way, each chunk
  // standing out or back by its own step, with a lean and a twist of its own.
  const r = rng(977);
  ROOFB = new Map();
  for (let j = -2; j < 16; j++) for (let i = -12; i < 12; i++) {
    const at = [(i + 0.5 + (r() - 0.5) * ROOF.jitter) * ROOF.cell[0] + j * ROOF.cell[0] * 0.37, (j + 0.5 + (r() - 0.5) * ROOF.jitter) * ROOF.cell[1]];
    ROOFB.set(`${i},${j}`, { at, step: (r() - 0.5) * 2 * ROOF.step, lean: (r() - 0.5) * 2 * ROOF.tilt, twist: (r() - 0.5) * 2 * ROOF.tilt * 0.5 });
  }
  STONES = args.stones ?? [];
  GRID = new Map();
  STONES.forEach((s, i) => {
    const k = (gx, gy, gz) => `${gx},${gy},${gz}`, g = 24, reach = s.s * 1.5 + 4;
    for (let gx = Math.floor((s.at[0] - reach) / g); gx <= Math.floor((s.at[0] + reach) / g); gx++)
      for (let gy = Math.floor((s.at[1] - reach) / g); gy <= Math.floor((s.at[1] + reach) / g); gy++)
        for (let gz = Math.floor((s.at[2] - reach) / g); gz <= Math.floor((s.at[2] + reach) / g); gz++) { const key = k(gx, gy, gz); if (!GRID.has(key)) GRID.set(key, []); GRID.get(key).push(i); }
  });
}

// A face is broken into facets, each its own plane a little tilted and stepped from the next, so the core's light
// falls on each a little differently: cells of a jittered grid on the face, FACET.size units apart, each tilted up
// to FACET.tilt and set out or back by up to FACET.step, eased into the next over FACET.ease units. Gives how far the
// surface stands out of the face's plane at (u, v), across and up the face.
const FACET = { size: 34, tilt: 0.13, step: 1.6, ease: 1.4, jitter: 0.85, share: 0.6 };
const cellHash = (i, j, s, k) => { const h = Math.sin(i * 127.1 + j * 311.7 + s * 74.7 + k * 19.3) * 43758.5453; return h - Math.floor(h); };
function facets(m, u, v) {
  const F = m.facet ?? FACET.size, i0 = Math.floor(u / F), j0 = Math.floor(v / F);
  let d1 = Infinity, d2 = Infinity, a = null, b = null;
  for (let j = j0 - 1; j <= j0 + 1; j++) for (let i = i0 - 1; i <= i0 + 1; i++) {
    const cu = (i + 0.5 + (cellHash(i, j, m.seed, 1) - 0.5) * FACET.jitter) * F, cv = (j + 0.5 + (cellHash(i, j, m.seed, 2) - 0.5) * FACET.jitter) * F;
    const d = (u - cu) ** 2 + (v - cv) ** 2;
    if (d < d1) { d2 = d1; b = a; d1 = d; a = [i, j, cu, cv]; } else if (d < d2) { d2 = d; b = [i, j, cu, cv]; }
  }
  const H = (c) => (cellHash(c[0], c[1], m.seed, 3) - 0.5) * 2 * FACET.step + (cellHash(c[0], c[1], m.seed, 4) - 0.5) * 2 * FACET.tilt * (u - c[2]) + (cellHash(c[0], c[1], m.seed, 5) - 0.5) * 2 * FACET.tilt * (v - c[3]);
  const gap = (d2 - d1) / (2 * Math.hypot(b[2] - a[2], b[3] - a[3]) || 1), t = 0.5 - 0.5 * Math.min(1, gap / FACET.ease);
  return H(a) * (1 - t) + H(b) * t;
}

// One mass, with the projection of the place in the picture handed in for its outline when the mass is cut along
// the line of sight (the floor).
export function mass(m, x, y, z, px, py) {
  const dx = x - m.c[0], dy = y - m.c[1], dz = z - m.c[2], far = Math.hypot(dx, dy, dz) - m.reach;
  if (far > 0) return far + 2;
  const h = dx * m.n[0] + dy * m.n[1] + dz * m.n[2];
  const rel = RELIEF.deep * N(x / RELIEF.over, y / RELIEF.over, z / RELIEF.over, m.seed) + RELIEF.fine * N(x / RELIEF.fineOver, y / RELIEF.fineOver, z / RELIEF.fineOver, m.seed + 1);
  const face0 = h + rel - FACET.share * facets(m, dx * m.e1[0] + dy * m.e1[1] + dz * m.e1[2], dx * m.e2[0] + dy * m.e2[1] + dz * m.e2[2]);
  // The outline, on the face: the place carried square onto the face's plane, as the picture shows it.
  let qx = px, qy = py;
  if (!m.view) [qx, qy] = L.pictured(x - m.n[0] * h, y - m.n[1] * h, z - m.n[2] * h);
  const out0 = sdPoly(m.flat, qx, qy) * UNIT + RAG.deep * N(x / RAG.over, y / RAG.over, z / RAG.over, m.seed + 2) + RAG.fine * N(x / RAG.fineOver, y / RAG.fineOver, z / RAG.fineOver, m.seed + 3);
  const Sh = m.sheets;
  if (out0 + Sh.most > 40) return out0 + Sh.most - 2 * RAG.deep;
  // Which sheet the place is in, along the bedding, which fans, curls and wanders.
  const u = dx * Sh.tb[0] + dy * Sh.tb[1] + dz * Sh.tb[2];
  const s = (dx * Sh.b[0] + dy * Sh.b[1] + dz * Sh.b[2]) / (1 + Sh.fan * Math.max(-1.5, Math.min(1.5, u / 100))) + Sh.curl * u * u + Sh.wander[0] * N(x / Sh.wander[1], y / Sh.wander[1], z / Sh.wander[1], Sh.seed) + Sh.wander[2] * N(x / Sh.wander[3], y / Sh.wander[3], z / Sh.wander[3], Sh.seed + 1);
  const lo = Sh.lo, last = lo.length - 1;
  let a = 0, z1 = last;
  if (s < lo[0]) z1 = 0;
  else if (s >= lo[last]) a = last;
  else { while (z1 - a > 1) { const mid = (a + z1) >> 1; if (lo[mid] <= s) a = mid; else z1 = mid; } }
  let d = Infinity;
  for (let k = Math.max(0, a - 1); k <= Math.min(last, a + 1); k++) {
    const face = face0 - Sh.lift[k], out = out0 + Sh.pull[k];
    // The parting opens only near where the sheets are seen: deeper in they are one rock.
    const open = smooth(-Sh.deep[k], -Sh.deep[k] + 4, Math.max(face, out));
    const below = k > 0 ? Sh.gap[k - 1] / 2 : 0, above = Sh.gap[k] / 2;
    let e = Math.max(face, -h - m.thick, out + TAPER * Math.max(0, -h), lo[k] + below * open - s, s - Sh.hi[k] + above * open);
    const cut = Sh.cuts[k];
    for (let j = 0; j < cut.length; j += 4) e = Math.max(e, dx * cut[j] + dy * cut[j + 1] + dz * cut[j + 2] - cut[j + 3]);
    e = Math.max(e, (face + out) * Math.SQRT1_2 + Sh.bev[k]);
    if (e < d) d = e;
  }
  if (m.top) d = Math.max(d, (x - m.top.at[0]) * m.top.n[0] + (y - m.top.at[1]) * m.top.n[1] + (z - m.top.at[2]) * m.top.n[2] + 0.8 * rel);
  for (const b of m.breaks) d = Math.max(d, (x - b.at[0]) * b.n[0] + (y - b.at[1]) * b.n[1] + (z - b.at[2]) * b.n[2]);
  return d;
}

// The bedding of the place: the mass it is of, or the roof's own. The backfill has none (null: make.mjs gives it the
// surface's own normal, so the stone draws no laminae on it): its faces turn every way in the socket, and laminae
// cut at a slant across them drew wood grain rings round the ball. The roof's lies in its front, so the front is not
// ruled with level lines from end to end.
export function bedOf(x, y, z) {
  const at = which(x, y, z);
  return at < M.length ? M[at].sheets.b : at === M.length ? ROOFBED : null;
}
const ROOFBED = norm([0.1, 0.3, 1]);

// The roof: under the land, in front of nothing, its front face a little behind the land's edge, broken across into
// blocks, and its ragged underside where the picture has it.
function roof(x, y, z, px, py) {
  const under = (py - along(ROOF.under, px) - 7 * N(px / 14, 3.3, 1.1, 51) - 3 * N(px / 9, 1.7, 0.4, 53) - 0.8 * N(px / 5, py / 5, 2.2, 52)) * UNIT;
  if (under > 30) return under;
  const zl = frontZ(x), top = L.dome(x, zl), down = top - y;
  const j0 = Math.floor(down / ROOF.cell[1]), cells = [];
  for (let j = j0 - 1; j <= j0 + 1; j++) {
    const i0 = Math.floor((x - j * ROOF.cell[0] * 0.37) / ROOF.cell[0]);
    for (let i = i0 - 1; i <= i0 + 1; i++) { const c = ROOFB.get(`${i},${j}`); if (c) cells.push(c); }
  }
  let d = Infinity;
  for (const c of cells) {
    const dc = Math.hypot(x - c.at[0], down - c.at[1]);
    let cell = -Infinity;
    for (const o of cells) {
      if (o === c) continue;
      const ex = o.at[0] - c.at[0], ey = o.at[1] - c.at[1], l = Math.hypot(ex, ey) || 1;
      cell = Math.max(cell, ((x - c.at[0]) * ex + (down - c.at[1]) * ey) / l - l / 2);
    }
    if (cell > 20 || dc > 200) continue;
    const zf = zl - ROOF.inset + c.step - (ROOF.lean + c.lean) * Math.max(0, down) + (c.twist + ROOF.away[0] * smooth(ROOF.away[1], ROOF.away[2], -x)) * (x - c.at[0]) + 1.6 * N(x / 17, y / 17, 5.5, 54) + 1.4 * facets(ROOFFACETS, x, y);
    d = Math.min(d, Math.max((z - zf) * 0.88, cell + ROOF.joint));
  }
  return Math.max(d, under);
}

// Behind everything: the rock the masses stand in front of, deep in shadow.
// Broken as every face is, in larger facets, so what shows of it between the masses is never a smooth bowl.
const BACKFACETS = { seed: 63, facet: 46 }, ROOFFACETS = { seed: 57, facet: 30 };
function backfill(x, y, z) {
  const rho = Math.hypot(x - C[0], y - C[1]);
  const zb = C[2] + R * (socket(rho / R) - BACKFILL.gap - BACKFILL.more[0] * smooth(BACKFILL.more[1], BACKFILL.more[1] + 0.35, rho / R) * (1 - smooth(BACKFILL.more[2] - 0.4, BACKFILL.more[2], rho / R))) - BACKFILL.high * smooth(BACKFILL.from, BACKFILL.from + 70, y) - BACKFILL.low * (1 - smooth(BACKFILL.under - 50, BACKFILL.under, y)) * (1 - smooth(1.6 * R, 2.4 * R, rho)) + BACKFILL.deep * N(x / BACKFILL.over, y / BACKFILL.over, 2.9, 61) + 2.5 * N(x / 13, y / 13, 4.1, 62) + 2.2 * facets(BACKFACETS, x, y);
  return (z - zb) * 0.85;
}

function stone(s, x, y, z) {
  const dx = x - s.at[0], dy = y - s.at[1], dz = z - s.at[2], far = Math.hypot(dx, dy, dz);
  if (far > s.s * 2.2) return far - s.s * 1.3;
  let e = -Infinity;
  for (const q of s.planes) e = Math.max(e, dx * q.n[0] + dy * q.n[1] + dz * q.n[2] - q.h);
  return e;
}

export function bare(x, y, z) {
  const [px, py] = L.pictured(x, y, z);
  let inner = backfill(x, y, z);
  for (const m of M) { const v = mass(m, x, y, z, px, py); if (v < inner) inner = v; }
  inner = Math.min(inner, roof(x, y, z, px, py));
  const bottom = along(BOTTOM, px) + 5 * N(px / 12, 7.7, 3.3, 71) + 1.6 * N(px / 4, py / 4, 1.9, 72);
  inner = Math.max(inner, (py - bottom) * UNIT);
  const tube = sdPoly(TUBE, px, py) * UNIT;
  let d = Math.min(inner, -tube);
  d = Math.max(d, (L.shell(x, y, z) - 1) * L.WORLD.deep);
  d = Math.max(d, y - (below(x, z) - UNDER));
  // A mass that is `proud` may stand out of the planet's surface by PROUD of its depth, in front of the skin and of
  // the land's own crust under its lip: its outline keeps it under the lip as the picture shows it.
  for (const m of M) if (m.proud) d = Math.min(d, Math.max(mass(m, x, y, z, px, py), (L.shell(x, y, z) - PROUD) * L.WORLD.deep, tube));
  return d;
}

// Which mass a place is of: its number in the masses and the floor, then the roof, then the backfill.
export function which(x, y, z) {
  const [px, py] = L.pictured(x, y, z);
  let best = backfill(x, y, z), at = M.length + 1;
  M.forEach((m, i) => { const v = mass(m, x, y, z, px, py); if (v < best) { best = v; at = i; } });
  if (roof(x, y, z, px, py) < best) at = M.length;
  return at;
}

// What keeps the core and the stream's lane clear: over 0 where nothing may be.
function clear(x, y, z, px, py) {
  const cx = x - C[0], cy = y - C[1], cz = z - C[2], cr = Math.hypot(cx, cy, cz);
  let d = -Infinity;
  // Not a sphere: a ball the size of the core cut a smooth bowl in whatever stood too near it, which read as clay.
  // What is cleared is the inside of many planes round it, each broken face its own, a little rough.
  if (cr < CLEAR.r + CLEAR.rag + 50) {
    let e = -Infinity;
    for (const q of CUTS) e = Math.max(e, cx * q[0] + cy * q[1] + cz * q[2] - q[3]);
    d = -(e + 1.6 * N(cx / 11, cy / 11, cz / 11, 43) + 0.6 * N(cx / 4, cy / 4 + 2, cz / 4, 44));
  }
  const rho = Math.hypot(px - L.pictured(...C)[0], py - L.pictured(...C)[1]) * UNIT;
  if (cz > -20) d = Math.max(d, Math.min(CLEAR.disc + CLEAR.open * Math.max(0, cz) + 3 * N(x / 9, y / 9, z / 9, 45) - rho, cz + 20));
  if (y < LANE.top + 40) {
    const back = LANE.z - LANEWALL.lean * Math.max(0, LANE.top - y) + LANEWALL.deep * N(x / LANEWALL.over, y / LANEWALL.over, 0.7, 46) + LANEWALL.fine * N(x / 3.7, y / 3.7, 1.9, 47);
    d = Math.max(d, -Math.max(Math.abs(x) - LANE.half - LANE.widen * Math.max(0, z - LANE.z), back - z, y - LANE.top));
  }
  return d;
}

export function field(x, y, z) {
  let d = bare(x, y, z);
  if (STONES.length) {
    const list = GRID.get(`${Math.floor(x / 24)},${Math.floor(y / 24)},${Math.floor(z / 24)}`);
    if (list) for (const i of list) { const v = stone(STONES[i], x, y, z); if (v < d) d = v; }
  }
  const [px, py] = L.pictured(x, y, z);
  return Math.max(d, clear(x, y, z, px, py));
}

// The rock without the core's clearance: for finding where the rubble lies.
export function probe(x, y, z) {
  const [px, py] = L.pictured(x, y, z);
  return Math.max(bare(x, y, z), clear(x, y, z, px, py));
}

// The planet outside the space the rock is made in, with the land's top: it blocks the moon and the sky.
export function outer(x, y, z) {
  const inBox = Math.max(BOX[0][0] + 6 - x, x - BOX[1][0] + 6, BOX[0][1] + 6 - y, y - BOX[1][1] + 6, BOX[0][2] + 6 - z, z - BOX[1][2] + 6);
  return Math.max((L.shell(x, y, z) - 1) * L.WORLD.deep, y - L.dome(x, z), -inBox);
}
