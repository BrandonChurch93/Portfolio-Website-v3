// Sculpt R's meshes from a solved relief (relief.mjs): `break`, the torn rock, and `skin`, the planet's own outer
// surface where it survives and its top.
//
//   import { buildBreak, buildSkin } from './build.mjs'
//   const brk = buildBreak(relief)   // { positions, indices, normals, face (per vertex, -1 off a face), kind }
//   const skin = buildSkin()          // { positions, indices, normals }
//
// Every face is cut inside its own outline into triangles about STEINER pixels across, each of its points at the
// face's own depth; where two faces stand at different depths along an edge they share, a wall joins them, which
// is the slab's broken edge; from a torn edge a wall runs back to the planet's own surface, and from the lowest
// outline a skirt runs back into the planet, so the rock is a solid that blocks light.
import { L } from '../../lib/plan.mjs';
import { Earcut } from 'three/src/extras/Earcut.js';
import { TOP, SKIN, AIR } from './facets.mjs';
import { STEINER, WELD, VIEW, J, dot, cross, norm, shellAlong, edgeZ, tornAt } from './relief.mjs';

// How far a wall's foot is set out, in pixels for each unit of its height, and at most.
const BATTER = { k: 0.06, most: 5 };
// Where a run turns by more than this (the cosine of the turn), its wall keeps a sharp corner.
const CORNER = Math.cos((40 * Math.PI) / 180);
// The stones on what faces up: how far up a face must face, a stone for so many of its pixels, and how large, in units.
const STONES = { up: 0.3, per: 45, size: [0.5, 2.6] };
const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

// Bowyer and Watson's Delaunay triangulation of the points in flat (x, y pairs), the first nb of which are the
// outline's loops in turn (their lengths in sizes). Triangles whose middle is outside are dropped. Returns null
// when an edge of the outline is not among the triangles' edges.
function delaunayInside(flat, nb, sizes, inside) {
  const n = flat.length / 2, X = new Float64Array(n + 3), Y = new Float64Array(n + 3);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) { X[i] = flat[i * 2] + (hash(i, 1) - 0.5) * 1e-6; Y[i] = flat[i * 2 + 1] + (hash(i, 2) - 0.5) * 1e-6; x0 = Math.min(x0, X[i]); y0 = Math.min(y0, Y[i]); x1 = Math.max(x1, X[i]); y1 = Math.max(y1, Y[i]); }
  const d = Math.max(x1 - x0, y1 - y0) * 20 + 10, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  X[n] = cx - d; Y[n] = cy - d; X[n + 1] = cx + d; Y[n + 1] = cy - d; X[n + 2] = cx; Y[n + 2] = cy + d;
  let tris = [[n, n + 1, n + 2]];
  const circ = (t) => {
    const [a, b, c] = t, ax = X[a], ay = Y[a], bx = X[b], by = Y[b], cx2 = X[c], cy2 = Y[c];
    const D = 2 * (ax * (by - cy2) + bx * (cy2 - ay) + cx2 * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy2) + (bx * bx + by * by) * (cy2 - ay) + (cx2 * cx2 + cy2 * cy2) * (ay - by)) / D;
    const uy = ((ax * ax + ay * ay) * (cx2 - bx) + (bx * bx + by * by) * (ax - cx2) + (cx2 * cx2 + cy2 * cy2) * (bx - ax)) / D;
    return [ux, uy, (ax - ux) ** 2 + (ay - uy) ** 2];
  };
  let cc = tris.map(circ);
  for (let i = 0; i < n; i++) {
    const bad = [], keep = [], keepC = [];
    for (let k = 0; k < tris.length; k++) { const c = cc[k]; if ((X[i] - c[0]) ** 2 + (Y[i] - c[1]) ** 2 < c[2]) bad.push(tris[k]); else { keep.push(tris[k]); keepC.push(c); } }
    const edges = new Map();
    for (const [a, b, c] of bad) for (const [u, v] of [[a, b], [b, c], [c, a]]) { const key = u < v ? u * 1e6 + v : v * 1e6 + u; edges.set(key, edges.has(key) ? null : [u, v]); }
    tris = keep; cc = keepC;
    for (const e of edges.values()) if (e) { const t = [e[0], e[1], i]; tris.push(t); cc.push(circ(t)); }
  }
  const out = [], have = new Set();
  for (const [a, b, c] of tris) {
    if (a >= n || b >= n || c >= n) continue;
    if (!inside((X[a] + X[b] + X[c]) / 3, (Y[a] + Y[b] + Y[c]) / 3)) continue;
    out.push(a, b, c);
    for (const [u, v] of [[a, b], [b, c], [c, a]]) have.add(u < v ? u * 1e6 + v : v * 1e6 + u);
  }
  let start = 0;
  for (const size of sizes) {
    for (let i = 0; i < size; i++) { const u = start + i, v = start + ((i + 1) % size); if (!have.has(u < v ? u * 1e6 + v : v * 1e6 + u)) return null; }
    start += size;
  }
  return out;
}

export function buildBreak(R, { steiner = STEINER } = {}) {
  const P = [], N = [], I = [], face = [], kind = [];
  const put = (w, f, k) => { P.push(w[0], w[1], w[2]); N.push(0, 0, 0); face.push(f); kind.push(k); return face.length - 1; };
  const world = (px, py, z) => L.fromPicture(px, py, z);
  const tri = (a, b, c, want) => {
    const pa = [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]], pb = [P[b * 3], P[b * 3 + 1], P[b * 3 + 2]], pc = [P[c * 3], P[c * 3 + 1], P[c * 3 + 2]];
    const n = cross(pb.map((v, i) => v - pa[i]), pc.map((v, i) => v - pa[i]));
    if (Math.hypot(...n) < 1e-7) return;
    if (dot(n, want) < 0) I.push(a, c, b); else I.push(a, b, c);
  };

  // The depth of every outline point for every face it bounds: each face's own plane, kept inside the planet and
  // clear of the core, then welded with the faces whose depths there are near its own.
  const pts = R.pts, at = new Map(), outside = new Map();
  const add = (p, f) => { if (!at.has(p)) at.set(p, new Set()); at.get(p).add(f); };
  for (const ch of R.chains) for (const p of ch.ids) {
    for (const s of [ch.L, ch.R]) if (s >= 0) add(p, s); else { if (!outside.has(p)) outside.set(p, new Set()); outside.get(p).add(s); }
  }
  // Faces that meet in a crease at a point are one there: joined at the mean of their depths.
  const creases = new Map();
  for (const ch of R.chains) if (ch.L >= 0 && ch.R >= 0 && !ch.step) for (const p of ch.ids) { if (!creases.has(p)) creases.set(p, []); creases.get(p).push([ch.L, ch.R]); }
  const depth = new Map(), dkey = (p, f) => p * 8192 + f;
  for (const [p, fs] of at) {
    const [px, py] = pts[p], list = [...fs], out = outside.get(p);
    let zs = list.map((f) => R.depth(f, px, py));
    if (out?.has(TOP)) {
      const x = L.fromPicture(px, py, 200)[0];
      zs = zs.map(() => R.clamp(px, py, edgeZ(x) - 0.5));
    }
    const joins = creases.get(p);
    if (joins) {
      const up = new Map(list.map((f) => [f, f])), root = (f) => { while (up.get(f) !== f) f = up.get(f); return f; };
      for (const [a, b] of joins) if (up.has(a) && up.has(b)) up.set(root(a), root(b));
      const sum = new Map();
      list.forEach((f, i) => { const r = root(f), q = sum.get(r) ?? [0, 0]; q[0] += zs[i]; q[1]++; sum.set(r, q); });
      zs = list.map((f) => { const q = sum.get(root(f)); return q[0] / q[1]; });
    }
    const order = list.map((f, i) => [zs[i], f]).sort((a, b) => a[0] - b[0]);
    let g = [order[0]];
    const flush = () => { const m = g.reduce((s, q) => s + q[0], 0) / g.length; for (const [, f] of g) depth.set(dkey(p, f), m); };
    for (let i = 1; i < order.length; i++) { if (order[i][0] - order[i - 1][0] < WELD) g.push(order[i]); else { flush(); g = [order[i]]; } }
    flush();
  }
  const dOf = (p, f) => depth.get(dkey(p, f));

  // The faces.
  let failed = 0;
  for (let f = 0; f < R.faces.length; f++) {
    const loops = R.loops[f];
    if (!loops.length) continue;
    const flat = [], holes = [], ids = [];
    loops.forEach((lp, li) => { if (li) holes.push(flat.length / 2); for (const p of lp) { flat.push(pts[p][0], pts[p][1]); ids.push(p); } });
    const outer = loops[0].map((p) => pts[p]);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of outer) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const inside = (x, y) => {
      let c = false;
      for (const lp of loops) for (let i = 0, j = lp.length - 1; i < lp.length; j = i++) { const [xi, yi] = pts[lp[i]], [xj, yj] = pts[lp[j]]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; }
      return c;
    };
    const segs = [];
    for (const lp of loops) for (let i = 0; i < lp.length; i++) segs.push([pts[lp[i]], pts[lp[(i + 1) % lp.length]]]);
    const far = (x, y, r) => {
      for (const [[ax, ay], [bx, by]] of segs) {
        if (Math.min(ax, bx) > x + r || Math.max(ax, bx) < x - r || Math.min(ay, by) > y + r || Math.max(ay, by) < y - r) continue;
        const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
        if (Math.hypot(ax + dx * t - x, ay + dy * t - y) < r) return false;
      }
      return true;
    };
    const st = [];
    for (let y = Math.floor(y0 / steiner) * steiner; y <= y1; y += steiner) for (let x = Math.floor(x0 / steiner) * steiner; x <= x1; x += steiner) {
      const jx = x + (hash(x, y) - 0.5) * 0.5 * steiner, jy = y + (hash(y, x + 3) - 0.5) * 0.5 * steiner;
      if (inside(jx, jy) && far(jx, jy, 0.7 * steiner)) st.push([jx, jy]);
    }
    const nb = flat.length / 2;
    for (const [x, y] of st) { holes.push(flat.length / 2); flat.push(x, y); }
    // Delaunay over the outline and the inner points, keeping what lies inside: even triangles, so the stored
    // light is not drawn out in fans. Where an edge of the outline did not come through, ear cutting instead.
    let t = delaunayInside(flat, nb, loops.map((lp) => lp.length), inside);
    if (!t) { failed++; t = Earcut.triangulate(flat, holes.length ? holes : null, 2); if (t.length / 3 < nb - 2) t = Earcut.triangulate(flat.slice(0, nb * 2), holes.filter((h) => h < nb), 2); }
    const v = [];
    for (let i = 0; i < flat.length / 2; i++) {
      const px = flat[i * 2], py = flat[i * 2 + 1], z = i < nb ? dOf(ids[i], f) : R.depth(f, px, py);
      v.push(put(world(px, py, z), f, 0));
    }
    for (let i = 0; i < t.length; i += 3) tri(v[t[i]], v[t[i + 1]], v[t[i + 2]], VIEW);
  }

  // Walls between faces at different depths, and from the rock's edges back into the planet. Along a run a wall's
  // points are shared from one step to the next, so its broken edge is one surface and not a row of tiles, except
  // at a corner sharper than CORNER, which stays sharp.
  const across = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; };
  const toWorldDir = ([u, v]) => norm([J[0][0] * u + J[1][0] * v, J[0][1] * u + J[1][1] * v, J[0][2] * u + J[1][2] * v]);
  for (const ch of R.chains) {
    const m = ch.ids.length, at2 = ch.ids.map((p) => pts[p]);
    const segN = [];
    for (let i = 0; i < m - 1; i++) segN.push(across(at2[i], at2[i + 1]));
    // Each point's two ends of the wall: [top place, top depth, foot place, foot depth], and which face is higher.
    const ends = [];
    for (let i = 0; i < m; i++) {
      const p = ch.ids[i], pp = at2[i];
      const nA = segN[Math.max(0, i - 1)], nB = segN[Math.min(m - 2, i)], mit = [nA[0] + nB[0], nA[1] + nB[1]], ml = Math.hypot(...mit) || 1, toL = [mit[0] / ml, mit[1] / ml];
      if (ch.L >= 0 && ch.R >= 0) {
        const zl = dOf(p, ch.L), zr = dOf(p, ch.R), up = zl >= zr, h = Math.abs(zl - zr), sh = Math.min(BATTER.most, BATTER.k * h);
        const dir = up ? [-toL[0], -toL[1]] : toL;
        ends.push({ top: [pp, Math.max(zl, zr)], foot: [[pp[0] + dir[0] * sh, pp[1] + dir[1] * sh], Math.min(zl, zr)], up, h });
      } else {
        const f = ch.L >= 0 ? ch.L : ch.R, o = ch.L >= 0 ? ch.R : ch.L, z = dOf(p, f), sh = shellAlong(pp[0], pp[1]);
        if (o === SKIN) ends.push(sh ? { top: [pp, Math.max(z, sh.near)], foot: [pp, z], h: Math.max(0, sh.near - z) } : null);
        else if (o === AIR) ends.push({ top: [pp, z], foot: [pp, sh && sh.far < z - 5 ? sh.far : z - 250], h: 1 });
        else ends.push(null);
      }
    }
    const both = ch.L >= 0 && ch.R >= 0, kindOf = both ? 1 : (ch.L >= 0 ? ch.R : ch.L) === SKIN ? 2 : 3;
    // Which way the wall faces: toward the lower face, for a wall between two; toward the face for a torn edge;
    // away from it, out into the air, for a skirt.
    const faceOut = (i, e) => {
      const nn = segN[i], toL = toWorldDir(nn), toR = toL.map((v) => -v);
      if (both) return e.up ? toR : toL;
      const toFace = ch.L >= 0 ? toL : toR;
      return kindOf === 2 ? toFace : toFace.map((v) => -v);
    };
    let prev = null;
    for (let i = 0; i < m - 1; i++) {
      const e0 = ends[i], e1 = ends[i + 1];
      if (!e0 || !e1 || (e0.h < 0.02 && e1.h < 0.02) || (both && e0.up !== e1.up)) { prev = null; continue; }
      const corner = i > 0 && segN[i - 1][0] * segN[i][0] + segN[i - 1][1] * segN[i][1] < CORNER;
      const out = faceOut(i, e0);
      const a0 = prev && !corner ? prev[0] : put(world(e0.top[0][0], e0.top[0][1], e0.top[1]), -1, kindOf);
      const a1 = prev && !corner ? prev[1] : put(world(e0.foot[0][0], e0.foot[0][1], e0.foot[1]), -1, kindOf);
      const b0 = put(world(e1.top[0][0], e1.top[0][1], e1.top[1]), -1, kindOf), b1 = put(world(e1.foot[0][0], e1.foot[0][1], e1.foot[1]), -1, kindOf);
      tri(a0, b0, b1, out); tri(a0, b1, a1, out);
      prev = [b0, b1];
    }
  }

  // Small stones lying on what faces up, by rule: broken pieces of the rock, each a few units across, an uneven
  // twenty sided stone flattened and turned at random, sunk a little into the face it lies on. Each of its faces is
  // its own, so it is sharp.
  const ICO = (() => {
    const t = (1 + Math.sqrt(5)) / 2, v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
    const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    return { v, f };
  })();
  let stones = 0;
  for (let f = 0; f < R.faces.length; f++) {
    const fc = R.faces[f];
    if (fc.gap || fc.n[1] < STONES.up || !R.loops[f].length) continue;
    const want = Math.floor((fc.area / STONES.per) * (0.5 + hash(f, 9)));
    const loop = R.loops[f][0].map((p) => pts[p]);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of loop) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const inLoop = (x, y) => { let c = false; for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) { const [xi, yi] = loop[i], [xj, yj] = loop[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    for (let k = 0, tries = 0; k < want && tries < want * 6; tries++) {
      const px = x0 + (x1 - x0) * hash(f * 7 + tries, 3), py = y0 + (y1 - y0) * hash(tries, f * 5 + 1);
      if (!inLoop(px, py)) continue;
      k++;
      const size = STONES.size[0] + (STONES.size[1] - STONES.size[0]) * hash(f + tries, 11) ** 2.2, n = fc.n;
      const base = world(px, py, R.depth(f, px, py));
      // Its own frame: up along the face's normal, turned at random about it.
      const a0 = norm(cross(n, [hash(k, f), hash(f, k) - 0.5, 0.3])), b0 = cross(n, a0), turn = hash(k + 3, f) * Math.PI * 2;
      const ax = a0.map((v, i) => v * Math.cos(turn) + b0[i] * Math.sin(turn)), bx = cross(n, ax);
      const sq = [1 + 0.5 * hash(k, 21), 0.45 + 0.25 * hash(k, 22), 0.8 + 0.4 * hash(k, 23)];
      const corner = ICO.v.map((v, i) => {
        const r = size * (0.75 + 0.45 * hash(f * 13 + k, i)), lx = v[0] * r * sq[0], ly = v[1] * r * sq[1], lz = v[2] * r * sq[2];
        return [0, 1, 2].map((c) => base[c] + ax[c] * lx + n[c] * (ly + size * 0.25) + bx[c] * lz);
      });
      const centre = [0, 1, 2].map((c) => base[c] + n[c] * size * 0.25);
      if (Math.hypot(centre[0] - L.CORE.at[0], centre[1] - L.CORE.at[1], centre[2] - L.CORE.at[2]) < L.CORE.r + 22) continue;
      for (const [a, b, c] of ICO.f) {
        const ia = put(corner[a], -2, 4), ib = put(corner[b], -2, 4), ic = put(corner[c], -2, 4), mid = [0, 1, 2].map((q) => (corner[a][q] + corner[b][q] + corner[c][q]) / 3 - centre[q]);
        tri(ia, ib, ic, mid);
      }
      stones++;
    }
  }

  // Normals: each face's own, from its triangles, and each wall's from its own.
  const n = face.length;
  for (let t = 0; t < I.length; t += 3) {
    const [a, b, c] = [I[t], I[t + 1], I[t + 2]];
    const pa = [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]], e1 = [P[b * 3] - pa[0], P[b * 3 + 1] - pa[1], P[b * 3 + 2] - pa[2]], e2 = [P[c * 3] - pa[0], P[c * 3 + 1] - pa[1], P[c * 3 + 2] - pa[2]];
    const fn = cross(e1, e2);
    for (const v of [a, b, c]) { N[v * 3] += fn[0]; N[v * 3 + 1] += fn[1]; N[v * 3 + 2] += fn[2]; }
  }
  const normals = new Float32Array(n * 3);
  // A face is shaded by the plane it was solved as, which its points keep but where a crease joins it to a
  // neighbour: there it bends a little, and its light should not.
  for (let v = 0; v < n; v++) {
    let m = face[v] >= 0 ? R.faces[face[v]].n : norm([N[v * 3], N[v * 3 + 1], N[v * 3 + 2]]);
    if (!m.every(Number.isFinite) || Math.hypot(...m) < 0.5) m = VIEW;
    normals.set(m, v * 3);
  }
  return { positions: new Float32Array(P), indices: new Uint32Array(I), normals, face: new Int32Array(face), kind: new Uint8Array(kind), failed, stones };
}

// The planet's own surface: its outer shell, but where it is torn open in front, and its top inside the land.
export function buildSkin({ around = 400, down = 120, spokes = 400, rings = 44 } = {}) {
  const P = [], I = [], NN = [];
  const shellNormal = (p) => {
    const e = 0.5, g = [0, 1, 2].map((k) => { const a = [...p], b = [...p]; a[k] += e; b[k] -= e; return L.shell(...a) - L.shell(...b); });
    return norm(g);
  };
  // The shell, in rings down from the rim, its points closer together toward the foot.
  const grid = [];
  for (let j = 0; j <= down; j++) {
    const t = j / down, row = [];
    for (let i = 0; i < around; i++) { const p = L.skinAt((i / around) * Math.PI * 2, t); row.push(P.length / 3); P.push(...p); NN.push(...shellNormal(p)); }
    grid.push(row);
  }
  const keep = [];
  const torn = (p, n) => {
    if (dot(n, VIEW) < -0.02) return false;
    const [px, py] = L.pictured(...p);
    return px > tornAt('left', py) && px < tornAt('right', py);
  };
  const posOf = (v) => [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]];
  const cut = new Set();
  for (let j = 0; j < down; j++) for (let i = 0; i < around; i++) {
    const a = grid[j][i], b = grid[j][(i + 1) % around], c = grid[j + 1][i], d = grid[j + 1][(i + 1) % around];
    for (const tr of [[a, c, b], [b, c, d]]) {
      const m = [0, 1, 2].map((k) => (P[tr[0] * 3 + k] + P[tr[1] * 3 + k] + P[tr[2] * 3 + k]) / 3);
      if (torn(m, shellNormal(m))) { for (const v of tr) cut.add(v); continue; }
      keep.push(tr);
    }
  }
  // Points of what is kept that touch what is cut go onto the torn edge, a hair past it.
  const moved = new Set();
  for (const tr of keep) for (const v of tr) {
    if (!cut.has(v) || moved.has(v)) continue;
    moved.add(v);
    const p = posOf(v), [px, py] = L.pictured(...p), side = px < L.PICTURE.mid ? 'left' : 'right';
    const edge = tornAt(side, py) + (side === 'left' ? 0.4 : -0.4), s = shellAlong(edge, py);
    if (!s || Math.abs(edge - px) > 16) continue;
    const q = L.fromPicture(edge, py, s.near);
    P[v * 3] = q[0]; P[v * 3 + 1] = q[1]; P[v * 3 + 2] = q[2];
    NN.splice(v * 3, 3, ...shellNormal(q));
  }
  for (const tr of keep) I.push(tr[0], tr[1], tr[2]);
  // The top, in rings out from the middle, each spoke ending where the land ends.
  const base = P.length / 3;
  const within = (x, z) => Math.min(L.WORLD.half - 0.5 - Math.hypot(x, z), edgeZ(x) - z);
  for (let k = 0; k < spokes; k++) {
    const th = (k / spokes) * Math.PI * 2, sx = Math.sin(th), sz = Math.cos(th);
    let lo = 0, hi = L.WORLD.half;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (within(sx * mid, sz * mid) > 0) lo = mid; else hi = mid; }
    for (let j = 0; j <= rings; j++) {
      const r = lo * Math.sqrt(j / rings), x = sx * r, z = sz * r, y = L.dome(x, z) - (j === rings && Math.hypot(x, z) > L.WORLD.half - 2 ? 0 : 1.2);
      P.push(x, y, z);
      const e = 1, gx = (L.dome(x + e, z) - L.dome(x - e, z)) / (2 * e), gz = (L.dome(x, z + e) - L.dome(x, z - e)) / (2 * e);
      NN.push(...norm([-gx, 1, -gz]));
    }
  }
  for (let k = 0; k < spokes; k++) for (let j = 0; j < rings; j++) {
    const a = base + k * (rings + 1) + j, b = base + ((k + 1) % spokes) * (rings + 1) + j;
    if (j > 0) I.push(a, a + 1, b);
    I.push(b, a + 1, b + 1);
  }
  // Wind every triangle to face out along its normal.
  for (let t = 0; t < I.length; t += 3) {
    const [a, b, c] = [I[t], I[t + 1], I[t + 2]], pa = posOf(a);
    const fn = cross(posOf(b).map((v, i) => v - pa[i]), posOf(c).map((v, i) => v - pa[i]));
    const want = [NN[a * 3] + NN[b * 3] + NN[c * 3], NN[a * 3 + 1] + NN[b * 3 + 1] + NN[c * 3 + 1], NN[a * 3 + 2] + NN[b * 3 + 2] + NN[c * 3 + 2]];
    if (dot(fn, want) < 0) { I[t + 1] = c; I[t + 2] = b; }
  }
  // The moon's shadows are drawn from the faces turned away from it, so the top and the planet's back, which face
  // the moon, would cast none into the hollow: each is laid again a little inside, turned in. Neither is seen: the
  // top's from above and the back's behind the torn rock, kept above what is seen through the open bottom.
  const inner = [];
  for (let t = 0; t < I.length; t += 3) {
    const tr = [I[t], I[t + 1], I[t + 2]], m = [0, 1, 2].map((k) => (P[tr[0] * 3 + k] + P[tr[1] * 3 + k] + P[tr[2] * 3 + k]) / 3);
    const isTop = tr[0] >= base, back = !isTop && m[2] < 0 && m[1] > -300;
    if (isTop || back) inner.push(tr);
  }
  const map = new Map();
  for (const tr of inner) {
    const nt = tr.map((v) => {
      if (map.has(v)) return map.get(v);
      const n = [NN[v * 3], NN[v * 3 + 1], NN[v * 3 + 2]], id = P.length / 3;
      P.push(P[v * 3] - n[0] * 3, P[v * 3 + 1] - n[1] * 3, P[v * 3 + 2] - n[2] * 3);
      NN.push(-n[0], -n[1], -n[2]);
      map.set(v, id);
      return id;
    });
    I.push(nt[0], nt[2], nt[1]);
  }
  // Drop what no triangle uses.
  const used = new Int32Array(P.length / 3).fill(-1), pos = [], nor = [];
  for (let t = 0; t < I.length; t++) { const v = I[t]; if (used[v] < 0) { used[v] = pos.length / 3; pos.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); nor.push(NN[v * 3], NN[v * 3 + 1], NN[v * 3 + 2]); } I[t] = used[v]; }
  return { positions: new Float32Array(pos), indices: new Uint32Array(I), normals: new Float32Array(nor) };
}
