// Sculpt R, round 2: the great slabs (slabs.mjs) each made one plane in the camera's space, and the pieces it is
// broken into each that plane turned a degree or two and set a little proud or sunk, as a slab that sheared.
//
//   import { Great } from './great.mjs'
//   const g = new Great(json)          // json is measured/slabs.json
//   g.solve({ lit })                   // lit[slab], if given, is what the baker last found: { core, moon, bounce }
//   g.depth(piece, px, py)             // how deep a place of a piece is, before it is kept inside the planet
//
// How each role is set:
//   lit    turned to take the core's light as brightly as the picture has the slab, leaning in toward the core
//   shade  turned from the core, as brightly as the picture has it from what bounces
//   frame  nearer the visitor than the core (z 300 to 480), facing the visitor and turned out from the core, so the
//          core, which is behind it, cannot light it. The roof's front hangs from the land's edge the same way
//   gap    far behind the slabs round it, where no light reaches
// Depths: each slab's middle is held near a funnel round the core (prior in relief.mjs), with a few units of its own
// so the slabs stand one behind another, and pulled a little toward its neighbours, never so far that they meet.
import { L, light } from '../../lib/plan.mjs';
import { TOP, SKIN, AIR } from './facets.mjs';
import { prior, shellAlong, edgeZ, topAt, CORE_PX, J, VIEW, ALBEDO, CORE_LUM, MOON_LUM, A_LUM, lum, dot, cross, norm, illum } from './relief.mjs';

const LT = light(), C = L.CORE.at, CR = L.CORE.r, MOON_S = Math.sin(LT.moon.spread);
// The frame: how near the visitor, and how far a mass is turned out from the core (as a share added to the view).
// A mass of the frame is no wider across and no taller than `mass`, in the picture's pixels, and its slabs stand up to
// `step` units proud or sunk on it.
export const FRAME = { near: 300, far: 470, from: 14, out: 0.42, mass: [150, 230], step: 3 };
// How far a slab is set from the funnel by a number of its own, and how hard it is pulled toward its neighbours.
const LAYER = { jitter: 26, pull: 0.6 };
// The floor: how far under the core's middle and how far to each side of it, in the picture's pixels, and how far up
// its faces are turned.
const FLOOR = { below: 80, half: 250, up: 1.1 };
// How far from the view a face may be turned, as the least cosine: a face seen nearer edge on than this is drawn out
// into streaks. The roof's front, which hangs over the visitor's eye line, is held nearer still.
const FACING = { most: 0.36, roof: 0.6 };
// The roof's front: how far down it is turned, as a share added to the view.
const ROOF = { down: 0.45 };
// A gap: how far behind the slabs round it.
const GAP = { least: 120, more: 110 };
// The pieces of one slab: how far each is turned from the slab, in radians, and how far it stands proud or sunk.
const SHEAR = { turn: [0.012, 0.045], step: [0.5, 2.6] };
// How far each layer of a slab's strata stands below the one before, in units.
const STRATA = { step: [0.8, 2.2] };
// A slab's thickness, in units.
export const THICK = [15, 40];
export const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class Great {
  constructor(json) {
    this.pieces = json.pieces;
    this.slabs = json.slabs;
    this.chains = json.chains;
    const P = this.pieces.length;
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
    // Each piece's outline loops, each step with the run it is on and what is on the other side.
    this.loops = Array.from({ length: P }, () => []);
    this.nbr = Array.from({ length: P }, () => new Map());
    const runs = Array.from({ length: P }, () => []);
    this.chains.forEach((ch, c) => {
      if (ch.L >= 0) runs[ch.L].push({ ids: ch.ids, c, other: ch.R });
      if (ch.R >= 0) runs[ch.R].push({ ids: [...ch.ids].reverse(), c, other: ch.L });
      if (ch.L >= 0 && ch.R >= 0) for (const [a, b] of [[ch.L, ch.R], [ch.R, ch.L]]) this.nbr[a].set(b, (this.nbr[a].get(b) ?? 0) + ch.len);
    });
    for (let f = 0; f < P; f++) {
      const list = runs[f], used = new Uint8Array(list.length), byStart = new Map();
      list.forEach((r, i) => { const s = r.ids[0]; if (!byStart.has(s)) byStart.set(s, []); byStart.get(s).push(i); });
      for (let i = 0; i < list.length; i++) {
        if (used[i]) continue;
        const loop = [], other = [], start = list[i].ids[0];
        let j = i, guard = 0;
        while (j >= 0 && !used[j] && guard++ < 10000) {
          used[j] = 1;
          const ids = list[j].ids;
          for (let q = 0; q < ids.length - 1; q++) { loop.push(ids[q]); other.push(list[j].other); }
          const end = ids[ids.length - 1];
          if (end === start) break;
          j = (byStart.get(end) ?? []).find((q) => !used[q]) ?? -1;
        }
        if (loop.length >= 3) this.loops[f].push({ ids: loop, other });
      }
      const area = (lp) => { let a = 0; for (let q = 0; q < lp.ids.length; q++) { const [x0, y0] = pts[lp.ids[q]], [x1, y1] = pts[lp.ids[(q + 1) % lp.ids.length]]; a += x0 * y1 - x1 * y0; } return a / 2; };
      this.loops[f].sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
    }
    for (const p of this.pieces) { p.want = (p.Y * Math.PI) / A_LUM; p.n = VIEW.slice(); p.z = 0; p.a = 0; p.b = 0; }
    for (const s of this.slabs) {
      s.want = (s.Y * Math.PI) / A_LUM;
      s.thick = THICK[0] + (THICK[1] - THICK[0]) * hash(s.id, 5);
      // Lit pale and cool at the top of the roof: by the moon, not the core.
      const c = [0, 1, 2].map((q) => s.pieces.reduce((t, p) => t + this.pieces[p].rgb[q] * this.pieces[p].area, 0) / s.area);
      s.moon = s.role !== 'gap' && s.at[1] < 400 && s.Y > 0.02 && (c[0] - c[2]) / (c[0] + 1e-4) < 0.62;
      // The roof's front: dark rock over the hollow, which hangs from the land's edge, not a mass at the side.
      s.roof = s.role === 'frame' && ((s.at[1] < topAt(s.at[0]) + 42 && s.at[0] > 380 && s.at[0] < 1000) || (s.at[0] > 478 && s.at[0] < 905));
      s.shift = 0; s.a = 0; s.b = 0;
    }
    // Slabs next to each other, with the length they share.
    this.snbr = this.slabs.map(() => new Map());
    for (const ch of this.chains) {
      if (ch.L < 0 || ch.R < 0) continue;
      const a = this.pieces[ch.L].slab, b = this.pieces[ch.R].slab;
      if (a === b) continue;
      this.snbr[a].set(b, (this.snbr[a].get(b) ?? 0) + ch.len); this.snbr[b].set(a, (this.snbr[b].get(a) ?? 0) + ch.len);
    }
    this.massOf();
  }

  // The frame's great masses: neighbouring slabs of the frame joined, the largest first, as long as what they make
  // stays inside FRAME.mass, each mass one plane with its slabs a few units proud or sunk on it.
  massOf() {
    const box = this.slabs.map((s) => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const f of s.pieces) for (const lp of this.loops[f]) for (const p of lp.ids) { const [x, y] = this.pts[p]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      return [x0, y0, x1, y1];
    });
    const side = (s) => s.role === 'frame' && !s.roof;
    this.masses = [];
    for (const s of [...this.slabs].sort((a, b) => b.area - a.area)) {
      if (!side(s) || s.mass !== undefined) continue;
      const m = { id: this.masses.length, slabs: [s.id], box: box[s.id].slice() };
      s.mass = m.id;
      for (let h = 0; h < m.slabs.length; h++) for (const [o] of this.snbr[m.slabs[h]]) {
        const t = this.slabs[o];
        if (!side(t) || t.mass !== undefined) continue;
        const b = [Math.min(m.box[0], box[o][0]), Math.min(m.box[1], box[o][1]), Math.max(m.box[2], box[o][2]), Math.max(m.box[3], box[o][3])];
        if (b[2] - b[0] > FRAME.mass[0] || b[3] - b[1] > FRAME.mass[1]) continue;
        m.box = b; m.slabs.push(o); t.mass = m.id;
      }
      const A = m.slabs.reduce((t, q) => t + this.slabs[q].area, 0);
      m.at = [0, 1].map((k) => m.slabs.reduce((t, q) => t + this.slabs[q].at[k] * this.slabs[q].area, 0) / A);
      m.wide = Math.min(m.box[2] - m.box[0], m.box[3] - m.box[1]);
      this.masses.push(m);
    }
  }

  // The world's light on a face of a normal at a place, with the shares of the core and the moon it sees and the
  // light that reaches it by bouncing.
  light(n, P, lit) {
    const d = Math.max(1e-3, Math.hypot(C[0] - P[0], C[1] - P[1], C[2] - P[2])), l = [(C[0] - P[0]) / d, (C[1] - P[1]) / d, (C[2] - P[2]) / d];
    return CORE_LUM * lit.core * (CR / d) ** LT.core.fall * illum(dot(n, l), Math.min(1, CR / d)) + MOON_LUM * lit.moon * illum(dot(n, LT.moon.toward), MOON_S) + lit.bounce;
  }

  // Places over a slab to judge its light at, each with its share: every piece's middle and its outline's points.
  samples(s) {
    const out = [];
    for (const f of s.pieces) {
      const p = this.pieces[f], ids = this.loops[f][0]?.ids ?? [], step = Math.max(1, Math.floor(ids.length / 12));
      out.push([p.at, p.area * 0.5]);
      for (let i = 0; i < ids.length; i += step) out.push([this.pts[ids[i]], (p.area * 0.5 * step) / Math.max(1, ids.length)]);
    }
    const tot = out.reduce((t, q) => t + q[1], 0) || 1;
    return out.map(([[px, py], w]) => [L.fromPicture(px, py, this.slabAt(s.id, px, py)), w / tot]);
  }

  plane(n) { const nz = dot(n, J[2]); return [-dot(n, J[0]) / nz, -dot(n, J[1]) / nz]; }
  // A slab's own plane at a place: its depth there.
  slabAt(s, px, py) { const sl = this.slabs[s]; return sl.z + sl.a * (px - sl.at[0]) + sl.b * (py - sl.at[1]) + sl.shift; }
  depth(f, px, py) { const p = this.pieces[f]; return p.z + p.a * (px - p.at[0]) + p.b * (py - p.at[1]) + this.slabs[p.slab].shift; }

  solve({ lit = null } = {}) {
    const S = this.slabs.length, cands = [];
    const K = 3000;
    for (let i = 0; i < K; i++) {
      const y = 1 - (i + 0.5) / K, r = Math.sqrt(1 - y * y), th = i * 2.399963229728653, d = [Math.cos(th) * r, Math.sin(th) * r, y];
      if (dot(d, VIEW) > FACING.most) cands.push(d);
    }
    // Depths first from the funnel, so the tilts are found where each slab will be.
    for (const s of this.slabs) {
      const [px, py] = s.at;
      if (s.role === 'frame') s.z = this.frameZ(s);
      else s.z = prior(px, py) + LAYER.jitter * (hash(s.id, 11) - 0.5) * 2;
    }
    for (let round = 0; round < 3; round++) {
      for (const s of this.slabs) {
        const [px, py] = s.at, Pw = L.fromPicture(px, py, s.z);
        const d = Math.hypot(C[0] - Pw[0], C[1] - Pw[1], C[2] - Pw[2]), toCore = [(C[0] - Pw[0]) / d, (C[1] - Pw[1]) / d, (C[2] - Pw[2]) / d];
        // Out from the core across the picture, as a direction in the world.
        const ox = px - CORE_PX[0], oy = py - CORE_PX[1], ol = Math.hypot(ox, oy) || 1, out = norm([J[0][0] * ox + J[1][0] * oy, J[0][1] * ox + J[1][1] * oy, J[0][2] * ox + J[1][2] * oy].map((v) => v / ol));
        if (s.role === 'frame' && !s.roof) {
          const m = this.masses[s.mass], h = (q) => hash(m.id + 900, q) - 0.5;
          const mx = m.at[0] - CORE_PX[0], my = m.at[1] - CORE_PX[1], ml = Math.hypot(mx, my) || 1;
          const mo = norm([J[0][0] * mx + J[1][0] * my, J[0][1] * mx + J[1][1] * my, J[0][2] * mx + J[1][2] * my].map((v) => v / ml));
          s.n = norm(VIEW.map((v, i) => v + FRAME.out * mo[i] + [0.12 * h(1), 0.15 * h(2), 0][i]));
        } else if (s.role === 'gap') s.n = VIEW.slice();
        else {
          // The floor under the core is a shelf: what is lit on it faces up, toward the core over it.
          const floor = s.at[1] > CORE_PX[1] + FLOOR.below && Math.abs(s.at[0] - CORE_PX[0]) < FLOOR.half;
          // The roof's front hangs in front of the core: turned down toward the hollow, it catches only the edge of
          // the core's light, which is what the picture gives it.
          const ref = s.roof ? norm(VIEW.map((v, i) => v + ROOF.down * [0, -1, 0][i])) : floor ? norm(VIEW.map((v, i) => v + FLOOR.up * [0, 1, 0][i] + 0.4 * toCore[i])) : s.role === 'lit' ? norm(VIEW.map((v, i) => v + 1.15 * toCore[i])) : norm(VIEW.map((v, i) => v + 0.9 * out[i]));
          const lt = lit?.[s.id] ?? { core: s.role === 'lit' ? 1 : 0.6, moon: s.moon ? 1 : 0, bounce: 0.05 * CORE_LUM * (CR / Math.max(d, CR)) ** 1.45 };
          // The light is judged over the whole slab, as the picture's brightness is its mean over the whole slab:
          // near the core it is many times what it is at the slab's middle.
          const at = this.samples(s);
          const want = s.want, e0 = 0.03;
          let best = null, bc = Infinity;
          const least = s.roof ? FACING.roof : FACING.most;
          for (const n of cands) {
            if (dot(n, VIEW) < least) continue;
            let e = 0;
            for (const [Q, w] of at) e += w * this.light(n, Q, lt);
            const err = Math.log((e + e0) / (want + e0));
            const c = err * err + 0.1 * (1 - dot(n, ref)) + (s.moon ? 0 : 0.03 * Math.max(0, dot(n, LT.moon.toward)));
            if (c < bc) { bc = c; best = n; }
          }
          s.n = lit && s.n ? norm(s.n.map((v, i) => v + best[i])) : best;
          s.err = bc;
        }
        [s.a, s.b] = this.plane(s.n);
      }
      // Depths: held near the funnel and pulled a little toward each neighbour along what they share.
      const z0 = this.slabs.map((s) => (s.role === 'frame' ? this.frameZ(s) : prior(...s.at) + LAYER.jitter * (hash(s.id, 11) - 0.5) * 2));
      const links = [];
      for (const ch of this.chains) {
        if (ch.L < 0 || ch.R < 0) continue;
        const a = this.pieces[ch.L].slab, b = this.pieces[ch.R].slab;
        if (a === b) continue;
        const ra = this.slabs[a].role, rb = this.slabs[b].role;
        if (ra === 'gap' || rb === 'gap' || ra === 'frame' || rb === 'frame') continue;
        const step = Math.max(1, Math.floor(ch.pts.length / 5));
        for (let i = 0; i < ch.pts.length; i += step) links.push([a, b, ch.pts[i][0], ch.pts[i][1], Math.min(step, ch.pts.length - i)]);
      }
      // Each slab's pull toward its neighbours, all of them together, is LAYER.pull of its pull toward the funnel.
      const own = this.slabs.map((s) => 0.02 * Math.sqrt(s.area)), linked = new Float64Array(S);
      for (const [a, b, , , w] of links) { linked[a] += w; linked[b] += w; }
      const flat = (s, px, py) => s.z + s.a * (px - s.at[0]) + s.b * (py - s.at[1]);
      for (let it = 0; it < 200; it++) {
        const num = new Float64Array(S), den = new Float64Array(S);
        for (const s of this.slabs) { num[s.id] += own[s.id] * z0[s.id]; den[s.id] += own[s.id]; }
        for (const [a, b, px, py, w] of links) {
          const A = this.slabs[a], B = this.slabs[b], za = flat(A, px, py), zb = flat(B, px, py);
          const ka = (w / linked[a]) * LAYER.pull * own[a], kb = (w / linked[b]) * LAYER.pull * own[b];
          num[a] += ka * (A.z + zb - za); den[a] += ka;
          num[b] += kb * (B.z + za - zb); den[b] += kb;
        }
        for (const s of this.slabs) if (s.role !== 'frame') s.z = 0.5 * s.z + 0.5 * (num[s.id] / den[s.id]);
      }
      for (const s of this.slabs) {
        if (s.role !== 'gap') continue;
        let lo = Infinity;
        for (const [o] of this.snbr[s.id]) if (this.slabs[o].role !== 'gap') lo = Math.min(lo, this.slabAt(o, ...s.at));
        if (lo < Infinity) s.z = lo - GAP.least - GAP.more * hash(s.id, 3);
      }
    }
    // The pieces: each its slab's plane, turned a little and set proud or sunk.
    for (const p of this.pieces) {
      const s = this.slabs[p.slab], many = s.pieces.length > 1 && s.role !== 'gap';
      const h = (q) => hash(p.id + 7, q);
      let n = s.n.slice();
      if (many) {
        const side = norm(cross(n, [h(1) - 0.5, h(2) - 0.5, h(3) - 0.5])), turn = SHEAR.turn[0] + (SHEAR.turn[1] - SHEAR.turn[0]) * h(4);
        n = norm(n.map((v, i) => v + side[i] * turn));
        if (dot(n, VIEW) < 0.25) n = s.n.slice();
      }
      p.n = n;
      [p.a, p.b] = this.plane(n);
      // A layer of the strata stands lower than the one before it by the slab's own step; any other piece of a broken
      // slab stands a little proud or sunk.
      const sheared = (h(5) < 0.5 ? -1 : 1) * (SHEAR.step[0] + (SHEAR.step[1] - SHEAR.step[0]) * h(6));
      const layer = p.stratum !== undefined ? -p.stratum * (STRATA.step[0] + (STRATA.step[1] - STRATA.step[0]) * hash(s.id, 31)) + 0.25 * sheared : sheared;
      p.z = this.slabAt(p.slab, ...p.at) - s.shift + (many ? layer : 0);
    }
  }

  // How near the visitor a mass of the frame stands: as near as the planet's own surface allows, a few units inside
  // it, between FRAME.near and FRAME.far. The roof's front hangs from the land's edge.
  frameZ(s) {
    const [px, py] = s.at;
    if (s.roof) { const x = L.fromPicture(px, py, 300)[0]; return edgeZ(x) - 8 - 0.25 * Math.max(0, py - topAt(px)); }
    if (s.mass !== undefined) {
      // A slab of a mass lies on the mass's plane, a few units proud or sunk.
      const m = this.masses[s.mass], sh = shellAlong(...m.at), most = sh ? sh.near - FRAME.from - 0.25 * m.wide : FRAME.far;
      const zm = Math.max(FRAME.near, Math.min(FRAME.far, most));
      return zm + s.a * (px - m.at[0]) + s.b * (py - m.at[1]) + FRAME.step * (hash(s.id, 61) - 0.5) * 2;
    }
    const sh = shellAlong(px, py), most = sh ? sh.near - FRAME.from - 0.5 * (s.wide ?? 0) : FRAME.far;
    return Math.max(FRAME.near, Math.min(FRAME.far, most));
  }
}

export { TOP, SKIN, AIR, ALBEDO, lum, dot, cross, norm, VIEW, J, CORE_PX };
