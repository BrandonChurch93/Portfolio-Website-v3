// Sculpt R's relief: picture 9's rock faces (facets.mjs) each made a plane in the camera's space, tilted so the
// world's own light makes it as bright as the picture has it, and set at a depth that keeps it joined to its
// neighbours except where the picture shows a gap. Then the mesh: every face cut into small triangles inside its
// own outline, walls where two faces stand at different depths, walls from the torn edges back to the planet's own
// surface, and skirts from the lowest outline back into the planet, so that it is a solid that blocks light.
//
//   import { Relief } from './relief.mjs'
//   const r = new Relief(json)          // json is measured/facets.json
//   r.solve({ lit })                    // tilts and depths; lit, if given, is what the baker last found per face
//   const { positions, indices, normals, face } = r.mesh()   // `face` is each vertex's face, -1 on a wall
//
// A place is (px, py, z): the picture's pixels across and down, and how far toward the visitor (world units).
// fromPicture in the plan turns it into the world.
import { L, light, stone } from '../../lib/plan.mjs';
import { Earcut } from 'three/src/extras/Earcut.js';
import { TOP, SKIN, AIR } from './facets.mjs';
import { landEdge } from './see.mjs';
import { TORN } from './trace.mjs';

export const topAt = landEdge();
// Where the planet's own surface is torn, across, at a height in the picture.
export function tornAt(side, py) {
  const line = TORN[side];
  if (py <= line[0][1]) return line[0][0];
  for (let i = 1; i < line.length; i++) if (py <= line[i][1]) { const [x0, y0] = line[i - 1], [x1, y1] = line[i]; return x0 + ((x1 - x0) * (py - y0)) / (y1 - y0); }
  return line[line.length - 1][0];
}

const LT = light();
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
// The planet's stone, which the baker lights the rock with and the stone's material wears.
export const ALBEDO = stone();
const A_LUM = lum(ALBEDO), CORE_LUM = lum(LT.core.color), MOON_LUM = lum(LT.moon.color), MOON_S = Math.sin(LT.moon.spread);
const C = L.CORE.at, CR = L.CORE.r;
// The core's own place in the picture.
export const CORE_PX = L.pictured(...C);
// How near the core anything may come, and the clear column the stream falls down.
const CLEAR = CR + 16, STREAM = { x: CORE_PX[0], half: 11, below: CORE_PX[1] + 88, z: 138 };
// Steps of the cut inside a face, in the picture's pixels.
const STEINER = 1.45;
// Faces whose depths at a shared place differ less than this are welded there: a crease, not a step.
const WELD = 0.3;
// Of the breaks inside one face, the share that are a sheared layer, a hairline step this high and up to this more.
const HAIR = { share: 0.3, least: 0.4, more: 0.6 };

// The camera's local frame: how a step across, down and toward the visitor moves a point of the world.
const J = (() => { const p0 = L.fromPicture(688, 437, 150); return [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(([a, b, c]) => { const p1 = L.fromPicture(688 + a, 437 + b, 150 + c); return p1.map((v, i) => v - p0[i]); }); })();
const VIEW = (() => { const v = J[2], l = Math.hypot(...v); return v.map((x) => x / l); })();
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
const illum = (c, s) => (c >= s ? c : c <= -s ? 0 : ((c + s) * (c + s)) / (4 * s));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The planet's own outer surface along the ray of a pixel: the near and far places where the ray meets it.
export function shellAlong(px, py) {
  const f = (z) => L.shell(...L.fromPicture(px, py, z)) - 1;
  let lo = -800, hi = 800, best = null, prev = f(lo);
  const hits = [];
  for (let z = lo + 10; z <= hi; z += 10) { const v = f(z); if ((v < 0) !== (prev < 0)) hits.push([z - 10, z]); prev = v; }
  if (!hits.length) return null;
  const refine = ([a, b]) => { let fa = f(a); for (let i = 0; i < 30; i++) { const m = (a + b) / 2, fm = f(m); if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; };
  best = { near: refine(hits[hits.length - 1]), far: refine(hits[0]) };
  return best;
}
// The land's front edge: how far toward the visitor it reaches at a place across the world.
const rimZ = (x) => Math.sqrt(Math.max(0, L.WORLD.half ** 2 - x * x));
export const edgeZ = (x) => Math.min(L.lip(x), rimZ(x));

// The depth a face is first given, before its neighbours are heard: a funnel round the core, whose back wall is
// 100 to 120 behind the core's middle and whose walls come forward as they go out; the roof's front hanging from the
// land's edge; the floor's front edge toward the visitor; and nothing outside the planet.
export function prior(px, py) {
  const dx = px - CORE_PX[0], dy = py - CORE_PX[1], rho = Math.hypot(dx, dy * (dy > 0 ? 1.15 : 1));
  let z = 40 + 330 * smooth(90, 360, rho);
  const x = L.fromPicture(px, py, 200)[0], top = L.pictured(x, L.dome(x, edgeZ(x)), edgeZ(x))[1];
  const roof = 1 - smooth(top + 30, top + 75, py);
  z = z * (1 - roof) + (edgeZ(x) - 6 - 0.3 * (py - top)) * roof;
  const floor = smooth(CORE_PX[1] + 70, CORE_PX[1] + 150, py) * (1 - smooth(260, 330, Math.abs(dx)));
  z = z * (1 - floor) + Math.max(z, 245) * floor;
  return z;
}

export class Relief {
  constructor(json) {
    this.faces = json.faces;
    this.chains = json.chains;
    const F = this.faces.length;
    // Global points of the outlines: a corner shared by runs is one point.
    const pts = [], key = new Map(), pid = (x, y, shared) => {
      if (!shared) { pts.push([x, y]); return pts.length - 1; }
      const k = `${x},${y}`;
      if (!key.has(k)) { key.set(k, pts.length); pts.push([x, y]); }
      return key.get(k);
    };
    for (const ch of this.chains) {
      const m = ch.pts.length;
      ch.ids = ch.pts.map(([x, y], i) => (ch.closed ? (i === m - 1 ? -1 : pid(x, y, false)) : pid(x, y, i === 0 || i === m - 1)));
      if (ch.closed) ch.ids[m - 1] = ch.ids[0];
      ch.len = ch.pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - ch.pts[i - 1][0], p[1] - ch.pts[i - 1][1]) : 0), 0);
    }
    this.pts = pts;
    // Each face's outline loops, its neighbours and what it borders outside the rock.
    this.loops = Array.from({ length: F }, () => []);
    this.nbr = Array.from({ length: F }, () => new Map());
    this.outside = Array.from({ length: F }, () => ({ [TOP]: 0, [SKIN]: 0, [AIR]: 0 }));
    const runs = Array.from({ length: F }, () => []);
    this.chains.forEach((ch, c) => {
      if (ch.L >= 0) runs[ch.L].push({ ids: ch.ids, c });
      if (ch.R >= 0) runs[ch.R].push({ ids: [...ch.ids].reverse(), c });
      if (ch.L >= 0 && ch.R >= 0) { for (const [a, b] of [[ch.L, ch.R], [ch.R, ch.L]]) this.nbr[a].set(b, (this.nbr[a].get(b) ?? 0) + ch.len); }
      else { const f = ch.L >= 0 ? ch.L : ch.R, o = ch.L >= 0 ? ch.R : ch.L; this.outside[f][o] += ch.len; }
    });
    for (let f = 0; f < F; f++) {
      const list = runs[f], used = new Uint8Array(list.length), byStart = new Map();
      list.forEach((r, i) => { const s = r.ids[0]; if (!byStart.has(s)) byStart.set(s, []); byStart.get(s).push(i); });
      for (let i = 0; i < list.length; i++) {
        if (used[i]) continue;
        const loop = [], start = list[i].ids[0];
        let j = i, guard = 0;
        while (j >= 0 && !used[j] && guard++ < 10000) {
          used[j] = 1;
          const ids = list[j].ids;
          for (let q = 0; q < ids.length - 1; q++) loop.push(ids[q]);
          const end = ids[ids.length - 1];
          if (end === start) break;
          j = (byStart.get(end) ?? []).find((q) => !used[q]) ?? -1;
        }
        if (loop.length >= 3) this.loops[f].push(loop);
      }
      const area = (lp) => { let a = 0; for (let q = 0; q < lp.length; q++) { const [x0, y0] = pts[lp[q]], [x1, y1] = pts[lp[(q + 1) % lp.length]]; a += x0 * y1 - x1 * y0; } return a / 2; };
      this.loops[f].sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
    }
    // What each face is in the picture, and so what light it wants.
    for (const fc of this.faces) {
      const y = lum(fc.rgb);
      fc.Y = y;
      fc.want = (y * Math.PI) / A_LUM;
      fc.warm = (fc.rgb[0] - fc.rgb[2]) / (fc.rgb[0] + 1e-4);
      fc.moon = fc.shown > 0.5 && fc.warm < 0.62 && y > 0.02 && fc.at[1] < 420;
      fc.n = norm([0, 0.1, 1]);
      fc.z = prior(...fc.at);
    }
    // A gap: a face far darker than the faces round it, and not large.
    for (let f = 0; f < F; f++) {
      const fc = this.faces[f];
      let s = 0, w = 0;
      for (const [g, len] of this.nbr[f]) { s += this.faces[g].Y * len; w += len; }
      const round = w ? s / w : fc.Y;
      fc.gap = fc.shown > 0.5 && fc.area < 900 && fc.Y < 0.2 * round && round > 0.01;
      fc.round = round;
    }
    this.calibrate = 1;
    const kids = new Map();
    for (const fc of this.faces) kids.set(fc.parent, (kids.get(fc.parent) ?? 0) + 1);
    this.split = new Set([...kids].filter(([, c]) => c > 1).map(([p]) => p));
  }

  // The world's light on a face of a normal at a place, with the shares of the core and the moon it sees and the
  // light that reaches it by bouncing.
  light(n, P, lit) {
    const d = Math.max(1e-3, Math.hypot(C[0] - P[0], C[1] - P[1], C[2] - P[2])), l = [(C[0] - P[0]) / d, (C[1] - P[1]) / d, (C[2] - P[2]) / d];
    const r = Math.min(1, CR / d);
    return CORE_LUM * lit.core * (CR / d) ** LT.core.fall * illum(dot(n, l), r) + MOON_LUM * lit.moon * illum(dot(n, LT.moon.toward), MOON_S) + lit.bounce;
  }

  place(f, px, py) {
    const fc = this.faces[f];
    return fc.z + fc.a * (px - fc.at[0]) + fc.b * (py - fc.at[1]);
  }

  // Tilts, then depths, a few times over. lit[f] = { core, moon, bounce } from the last bake, when there is one.
  solve({ lit = null, rounds = 4 } = {}) {
    const F = this.faces.length, cands = [];
    const K = 2600;
    for (let i = 0; i < K; i++) {
      const y = 1 - (i + 0.5) / K, r = Math.sqrt(1 - y * y), th = i * 2.399963229728653;
      const d = [Math.cos(th) * r, Math.sin(th) * r, y];
      // On the visitor's side: the hemisphere round the view, turned no further than about 78 degrees from it.
      if (dot(d, VIEW) > 0.32) cands.push(d);
    }
    for (let round = 0; round < rounds; round++) {
      // Tilts.
      for (let f = 0; f < F; f++) {
        const fc = this.faces[f], P = L.fromPicture(fc.at[0], fc.at[1], fc.z);
        const d = Math.hypot(C[0] - P[0], C[1] - P[1], C[2] - P[2]), toCore = [(C[0] - P[0]) / d, (C[1] - P[1]) / d, (C[2] - P[2]) / d];
        const roofish = smooth(45, 5, fc.at[1] - topAt(fc.at[0]));
        const base = norm(VIEW.map((v, i) => v + 0.85 * toCore[i]));
        let ref = base.slice(), wsum = 1;
        for (const [g, len] of this.nbr[f]) {
          const o = this.faces[g];
          if (o.gap || fc.gap) continue;
          const w = Math.min(2, len / 20) * (o.parent === fc.parent ? 3 : 0.6);
          for (let i = 0; i < 3; i++) ref[i] += o.n[i] * w;
          wsum += w;
        }
        ref = norm(ref);
        const lt = lit?.[f] ?? { core: 1, moon: fc.moon ? 1 : 0, bounce: 0.04 * CORE_LUM * (CR / Math.max(d, CR)) ** 1.45 };
        const want = fc.want * this.calibrate, e0 = 0.04;
        let best = null, bc = Infinity;
        for (const n of cands) {
          const e = this.light(n, P, lt);
          const err = Math.log((e + e0) / (want + e0));
          const c = err * err + 0.06 * (1 - dot(n, ref)) + (fc.moon ? 0 : 0.02 * Math.max(0, dot(n, LT.moon.toward))) + 0.02 * roofish * Math.max(0, n[1]);
          if (c < bc) { bc = c; best = n; }
        }
        fc.n = lit ? norm(fc.n.map((v, i) => v + best[i])) : best;
        // A piece of a broken face is turned a few degrees from its neighbours by rule, so the break is seen.
        if (this.split.has(fc.parent)) {
          const h = (q) => { const v = Math.sin((f + 1) * 12.9898 + q * 78.233) * 43758.5453; return v - Math.floor(v) - 0.5; };
          const side = norm(cross(fc.n, [h(1), h(2), h(3)])), turn = (0.035 + 0.04 * Math.abs(h(4))) * Math.sign(h(5) || 1);
          fc.n = norm(fc.n.map((v, i) => v + side[i] * turn));
          if (dot(fc.n, VIEW) < 0.3) fc.n = norm(fc.n.map((v, i) => v + VIEW[i] * 0.2));
        }
        fc.err = bc;
        const nz = dot(fc.n, J[2]);
        fc.a = -dot(fc.n, J[0]) / nz;
        fc.b = -dot(fc.n, J[1]) / nz;
      }
      // Depths: each face's depth at its middle, held near its prior and pulled to meet its neighbours along every
      // run they share, hard where the run is a crease and softly where the picture shows a gap.
      const zp = this.faces.map((fc) => (fc.gap ? fc.prior0 ?? prior(...fc.at) : prior(...fc.at)));
      const links = [];
      this.chains.forEach((ch) => {
        if (ch.L < 0 || ch.R < 0) return;
        const a = this.faces[ch.L], b = this.faces[ch.R];
        const contrast = Math.abs(Math.log((a.Y + 0.01) / (b.Y + 0.01)));
        const darkLine = ch.edge >= 0 && ch.edge < 0.45 * Math.min(a.Y, b.Y);
        const kin = a.parent === b.parent && this.split.has(a.parent);
        const w = kin ? 3 : a.gap || b.gap ? 0.004 : darkLine ? 0.08 : 1 / (1 + 2 * contrast);
        // A break inside one face is a hairline step: the piece on one side stands a little proud of the other.
        const hv = Math.sin((ch.L * 31 + ch.R * 17) * 12.9898) * 43758.5453, hf = hv - Math.floor(hv), sheared = kin && hf < HAIR.share;
        const hair = sheared ? (HAIR.least + HAIR.more * hf / HAIR.share) * (ch.L < ch.R ? 1 : -1) : 0;
        // A run is a step where the picture shows a gap or a dark line, or a layer sheared; elsewhere the two faces
        // meet in a crease and are joined along it.
        ch.step = sheared || a.gap || b.gap || (!kin && darkLine);
        const step = Math.max(1, Math.floor(ch.pts.length / 6));
        for (let i = 0; i < ch.pts.length; i += step) links.push([ch.L, ch.R, ch.pts[i][0], ch.pts[i][1], w * Math.min(step, ch.pts.length - i), hair]);
      });
      for (let f = 0; f < F; f++) this.faces[f].gapDrop = this.faces[f].gap ? 150 + 60 * ((f * 0.618) % 1) : 0;
      for (let it = 0; it < 300; it++) {
        const num = new Float64Array(F), den = new Float64Array(F);
        for (let f = 0; f < F; f++) { const fc = this.faces[f], w = 0.02 * Math.sqrt(fc.area); num[f] += w * (zp[f] - fc.gapDrop); den[f] += w; }
        for (const [i, j, px, py, w, hair] of links) {
          const zi = this.place(i, px, py), zj = this.place(j, px, py);
          const fi = this.faces[i], fj = this.faces[j];
          num[i] += w * (fi.z + (zj + hair - zi)); den[i] += w;
          num[j] += w * (fj.z + (zi - hair - zj)); den[j] += w;
        }
        for (let f = 0; f < F; f++) this.faces[f].z = 0.5 * this.faces[f].z + 0.5 * (num[f] / den[f]);
      }
      // A gap is set well behind the faces round it.
      for (let f = 0; f < F; f++) {
        const fc = this.faces[f];
        if (!fc.gap) continue;
        let s = 0, w = 0;
        for (const [g, len] of this.nbr[f]) if (!this.faces[g].gap) { s += this.faces[g].z * len; w += len; }
        if (w) fc.z = Math.min(fc.z, s / w - fc.gapDrop);
      }
    }
  }

  // How deep a place of a face is, kept inside the planet, clear of the core and out of the stream's way.
  depth(f, px, py) {
    let z = this.place(f, px, py);
    return this.clamp(px, py, z);
  }
  clamp(px, py, z) {
    const sh = shellAlong(px, py);
    if (sh) z = Math.min(z, sh.near - 0.8);
    z = Math.max(z, -260);
    const P = L.fromPicture(px, py, z), d = Math.hypot(P[0] - C[0], P[1] - C[1], P[2] - C[2]);
    if (d < CLEAR) {
      // Push it back along its ray until it is clear.
      let lo = -400, hi = z;
      for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, Q = L.fromPicture(px, py, m); if (Math.hypot(Q[0] - C[0], Q[1] - C[1], Q[2] - C[2]) < CLEAR) hi = m; else lo = m; }
      z = lo;
    }
    if (Math.abs(px - STREAM.x) < STREAM.half && py > STREAM.below) z = Math.min(z, STREAM.z);
    return z;
  }
}

export { J, VIEW, Earcut, CORE_LUM, MOON_LUM, A_LUM, lum, dot, cross, norm, illum, STEINER, WELD };
