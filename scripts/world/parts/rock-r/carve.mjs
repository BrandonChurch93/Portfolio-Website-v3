// Sculpt R, round 2: the torn rock's mesh from the solved great slabs (great.mjs).
//
//   import { carve } from './carve.mjs'
//   const m = carve(great)   // { positions, indices, normals, face, slab, kind, push, stones }
//
// Each piece is its plane cut inside its own outline. Where it stands over what is next to it (a lower piece, a
// gap, the air), its edge is a real slab's edge, inside the outline the picture gives it: a small chamfer at 45
// degrees that catches the light as a thin line, then the slab's side, which shows as wide as the slab's lean lets it
// and drops by up to the slab's thickness, then a wall straight back along the line of sight to what is below. Every
// face and every edge has its own normals, so an edge is a crease and never a rounded tube.
// push[slab] is how far each slab must still go back to stand clear of the core: make.mjs moves it and carves again.
// kind per vertex: 0 a slab's face, 1 a chamfer, 2 a slab's side, 3 a wall between two, 4 a wall to the planet's
// surface or a skirt into it, 5 a stone.
import { L } from '../../lib/plan.mjs';
import { Earcut } from 'three/src/extras/Earcut.js';
import { delaunayInside } from './build.mjs';
import { shellAlong, edgeZ, CORE_PX, J, VIEW, dot, cross, norm } from './relief.mjs';
import { TOP, SKIN, AIR, hash } from './great.mjs';

const U = L.PICTURE.unit;
// Steps of the cut inside a face, in the picture's pixels.
export const STEINER = 1.5;
// A slab's chamfer, in pixels across, and the most its side may show, in pixels.
const EDGE = { chamfer: [0.55, 1.05], side: 7, show: 0.85, room: 0.42 };
// Where a ring turns by more than this (the cosine of the turn), its strips keep a sharp corner.
const CORNER = Math.cos((38 * Math.PI) / 180);
// How near the core anything may come, the core's disc in the picture, and the clear column the stream falls down.
const CLEAR = L.CORE.r + 16, DISC = 88, STREAM = { half: 11, below: CORE_PX[1] + 88, z: 138 };
// Stones on what faces up: how far up a face must face, how many in an angle and over a face, and how large.
const STONES = { up: 0.42, angle: 0.3, per: 520, size: [1.2, 4.6] };
const C = L.CORE.at;

const inDisc = (px, py) => Math.hypot(px - CORE_PX[0], py - CORE_PX[1]) < DISC;
// How far back along its line of sight a place must go to stand clear of the core.
function clearOf(px, py, z) {
  const P = L.fromPicture(px, py, z);
  if (Math.hypot(P[0] - C[0], P[1] - C[1], P[2] - C[2]) >= CLEAR) return 0;
  let lo = -500, hi = z;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, Q = L.fromPicture(px, py, m); if (Math.hypot(Q[0] - C[0], Q[1] - C[1], Q[2] - C[2]) < CLEAR) hi = m; else lo = m; }
  return z - lo;
}
const shellCache = new Map();
const shellAt = (px, py) => { const k = `${Math.round(px * 4)},${Math.round(py * 4)}`; if (!shellCache.has(k)) shellCache.set(k, shellAlong(px, py)); return shellCache.get(k); };

export function carve(G) {
  const Pos = [], Nor = [], I = [], face = [], slabOf = [], kind = [];
  const push = new Float64Array(G.slabs.length);
  const put = (w, f, s, k, n = null) => { Pos.push(w[0], w[1], w[2]); Nor.push(...(n ?? [0, 0, 0])); face.push(f); slabOf.push(s); kind.push(k); return face.length - 1; };
  const world = (px, py, z) => L.fromPicture(px, py, z);
  const posOf = (v) => [Pos[v * 3], Pos[v * 3 + 1], Pos[v * 3 + 2]];
  const tri = (a, b, c, want) => {
    const pa = posOf(a), n = cross(posOf(b).map((v, i) => v - pa[i]), posOf(c).map((v, i) => v - pa[i]));
    if (Math.hypot(...n) < 1e-7) return false;
    if (dot(n, want) < 0) I.push(a, c, b); else I.push(a, b, c);
    return true;
  };
  // A place's depth for a piece, kept inside the planet, out of the stream's way, and, where the core hides it,
  // clear of the core. Outside the core's disc a slab is kept clear by moving the whole of it back (push).
  const keep = (f, px, py, z) => {
    const sh = shellAt(px, py);
    if (sh) z = Math.min(z, sh.near - 0.8);
    z = Math.max(z, -260);
    const back = clearOf(px, py, z);
    const sl = G.pieces[f].slab;
    // A slab the core hides is only kept clear of it, place by place; one that is seen is moved back whole.
    if (back > 0) { if (inDisc(px, py) || G.slabs[sl].shown < 0.3) z -= back + 0.5; else push[sl] = Math.max(push[sl], back + 1); }
    if (Math.abs(px - CORE_PX[0]) < STREAM.half && py > STREAM.below) z = Math.min(z, STREAM.z);
    return z;
  };
  const pts = G.pts;
  // Each piece's depth at each of its outline's points, before its edge drops.
  const zAt = new Map(), zk = (p, f) => p * 4096 + f;
  for (let f = 0; f < G.pieces.length; f++) for (const lp of G.loops[f]) lp.ids.forEach((p, i) => {
    const [px, py] = pts[p];
    let z = G.depth(f, px, py);
    if (lp.other[i] === TOP || lp.other[(i + lp.ids.length - 1) % lp.ids.length] === TOP) z = edgeZ(L.fromPicture(px, py, 300)[0]) - 0.5;
    zAt.set(zk(p, f), keep(f, px, py, z));
  });
  // What is on the other side of a step at a point: how much lower it is.
  const below = (f, p, other) => {
    if (other === AIR) return Infinity;
    if (other === SKIN || other === TOP) return 0;
    const zo = zAt.get(zk(p, other));
    return zo === undefined ? 0 : zAt.get(zk(p, f)) - zo;
  };
  const rim = new Map();

  for (let f = 0; f < G.pieces.length; f++) {
    const pc = G.pieces[f], s = G.slabs[pc.slab], loops = G.loops[f];
    if (!loops.length) continue;
    const T = s.thick, CH = EDGE.chamfer[0] + (EDGE.chamfer[1] - EDGE.chamfer[0]) * hash(pc.slab, 9);
    const all = [];
    for (const lp of loops) for (let i = 0; i < lp.ids.length; i++) all.push([pts[lp.ids[i]], pts[lp.ids[(i + 1) % lp.ids.length]]]);
    const insidePoly = (rings, x, y) => {
      let c = false;
      for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; }
      return c;
    };
    const outline = loops.map((lp) => lp.ids.map((p) => pts[p]));
    const rings = [];
    for (let li = 0; li < loops.length; li++) {
      const lp = loops[li], m = lp.ids.length, P0 = outline[li];
      // Which side of the loop the piece is on.
      const [ax, ay] = P0[0], [bx, by] = P0[1 % m], dl = Math.hypot(bx - ax, by - ay) || 1;
      const orient = insidePoly(outline, (ax + bx) / 2 + ((by - ay) / dl) * 0.2, (ay + by) / 2 - ((bx - ax) / dl) * 0.2) ? 1 : -1;
      const segIn = [];
      for (let i = 0; i < m; i++) { const [x0, y0] = P0[i], [x1, y1] = P0[(i + 1) % m], l = Math.hypot(x1 - x0, y1 - y0) || 1; segIn.push([(orient * (y1 - y0)) / l, (-orient * (x1 - x0)) / l]); }
      const R0 = [], R1 = [], R2 = [], corner = [];
      for (let i = 0; i < m; i++) {
        const p = lp.ids[i], [px, py] = P0[i], nA = segIn[(i + m - 1) % m], nB = segIn[i];
        let mx = nA[0] + nB[0], my = nA[1] + nB[1];
        const ml = Math.hypot(mx, my);
        if (ml < 1e-3) { mx = nB[0]; my = nB[1]; } else { mx /= ml; my /= ml; }
        const scale = 1 / Math.max(0.45, mx * nA[0] + my * nA[1]);
        corner.push(nA[0] * nB[0] + nA[1] * nB[1] < CORNER);
        // How far into the piece there is room.
        let room = 40;
        for (const [[x0, y0], [x1, y1]] of all) {
          const ex = x1 - x0, ey = y1 - y0, den = mx * ey - my * ex;
          if (Math.abs(den) < 1e-9) continue;
          const t = ((x0 - px) * ey - (y0 - py) * ex) / den, u = ((x0 - px) * my - (y0 - py) * mx) / den;
          if (t > 0.05 && u >= -1e-6 && u <= 1 + 1e-6) room = Math.min(room, t);
        }
        // The drop: how much lower what is on the other side is, as the steps on each side of the point have it.
        const h = Math.max(below(f, p, lp.other[(i + m - 1) % m]), below(f, p, lp.other[i]));
        const z = zAt.get(zk(p, f));
        let dc = 0, ds = 0, sPx = 0, cPx = 0;
        if (h > 0.05 && s.role !== 'gap') {
          dc = Math.min(h, CH * U);
          ds = Math.min(Math.max(0, h - dc), T);
          // The slab's side shows where the slab leans away from this edge.
          const ox = -mx, oy = -my, ow = norm([J[0][0] * ox + J[1][0] * oy, J[0][1] * ox + J[1][1] * oy, J[0][2] * ox + J[1][2] * oy]);
          const lean = Math.max(0, -dot(pc.n, ow));
          sPx = Math.min(EDGE.side, (EDGE.show * T * lean) / U) * (ds / T);
          cPx = dc / U;
          const most = EDGE.room * room / scale;
          if (sPx + cPx > most) { const k = most / (sPx + cPx); sPx *= k; cPx *= k; }
        }
        const at = (d) => [px + mx * d * scale, py + my * d * scale];
        const q1 = at(sPx), q2 = at(sPx + cPx);
        R0.push([px, py, z - dc - ds]);
        R1.push([q1[0], q1[1], keep(f, q1[0], q1[1], G.depth(f, q1[0], q1[1])) - dc]);
        R2.push([q2[0], q2[1], cPx > 0 ? keep(f, q2[0], q2[1], G.depth(f, q2[0], q2[1])) : z]);
        rim.set(zk(p, f), z - dc - ds);
      }
      rings.push({ R0, R1, R2, corner });
    }
    // The face, inside its chamfers.
    const inner = rings.map((r) => r.R2.map(([x, y]) => [x, y]));
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of inner[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const segs = [];
    for (const r of inner) for (let i = 0; i < r.length; i++) segs.push([r[i], r[(i + 1) % r.length]]);
    const far = (x, y, d) => {
      for (const [[ax, ay], [bx, by]] of segs) {
        if (Math.min(ax, bx) > x + d || Math.max(ax, bx) < x - d || Math.min(ay, by) > y + d || Math.max(ay, by) < y - d) continue;
        const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
        if (Math.hypot(ax + dx * t - x, ay + dy * t - y) < d) return false;
      }
      return true;
    };
    const flat = [], holes = [];
    inner.forEach((r, li) => { if (li) holes.push(flat.length / 2); for (const [x, y] of r) flat.push(x, y); });
    const nb = flat.length / 2;
    for (let y = Math.floor(y0 / STEINER) * STEINER; y <= y1; y += STEINER) for (let x = Math.floor(x0 / STEINER) * STEINER; x <= x1; x += STEINER) {
      const jx = x + (hash(x, y) - 0.5) * 0.5 * STEINER, jy = y + (hash(y, x + 3) - 0.5) * 0.5 * STEINER;
      if (insidePoly(inner, jx, jy) && far(jx, jy, 0.7 * STEINER)) { flat.push(jx, jy); }
    }
    let t = delaunayInside(flat, nb, inner.map((r) => r.length), (x, y) => insidePoly(inner, x, y));
    if (!t) { t = Earcut.triangulate(flat.slice(0, nb * 2), holes.length ? holes : null, 2); }
    const v = [];
    for (let i = 0; i < flat.length / 2; i++) {
      const px = flat[i * 2], py = flat[i * 2 + 1];
      let z;
      if (i < nb) { let k = i; for (const r of rings) { if (k < r.R2.length) { z = r.R2[k][2]; break; } k -= r.R2.length; } }
      else z = keep(f, px, py, G.depth(f, px, py));
      v.push(put(world(px, py, z), f, pc.slab, 0, pc.n));
    }
    for (let i = 0; i < t.length; i += 3) tri(v[t[i]], v[t[i + 1]], v[t[i + 2]], VIEW);
    // The chamfer and the side, each a strip of its own, cut at sharp corners.
    for (const r of rings) {
      for (const [A, B, k] of [[r.R1, r.R2, 1], [r.R0, r.R1, 2]]) strip(A, B, k, r.corner, f, pc.slab);
    }
  }
  function strip(A, B, k, corner, f, s) {
    const m = A.length, start = Math.max(0, corner.indexOf(true)), pair = (i) => [put(world(...A[i]), -1, s, k), put(world(...B[i]), -1, s, k)];
    let prev = pair(start);
    for (let q = 1; q <= m; q++) {
      const i = (start + q) % m, cur = pair(i);
      tri(prev[0], cur[0], cur[1], VIEW); tri(prev[0], cur[1], prev[1], VIEW);
      prev = corner[i] && q < m ? pair(i) : cur;
    }
  }

  // Walls straight back along the line of sight, between two pieces where one's edge stands over the other, from a
  // piece's edge to the planet's own surface at a torn edge, and skirts from the lowest outline back into the planet.
  const across = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; };
  const toWorldDir = ([u, v]) => norm([J[0][0] * u + J[1][0] * v, J[0][1] * u + J[1][1] * v, J[0][2] * u + J[1][2] * v]);
  for (const ch of G.chains) {
    const m = ch.ids.length, at2 = ch.ids.map((p) => pts[p]), both = ch.L >= 0 && ch.R >= 0;
    const ends = [];
    for (let i = 0; i < m; i++) {
      const p = ch.ids[i], pp = at2[i];
      if (both) {
        const a = rim.get(zk(p, ch.L)), b = rim.get(zk(p, ch.R));
        ends.push(a === undefined || b === undefined ? null : { top: Math.max(a, b), foot: Math.min(a, b), up: a >= b });
      } else {
        const f = ch.L >= 0 ? ch.L : ch.R, o = ch.L >= 0 ? ch.R : ch.L, z = rim.get(zk(p, f)), sh = shellAt(pp[0], pp[1]);
        if (z === undefined) ends.push(null);
        else if (o === SKIN) ends.push(sh ? { top: Math.max(z, sh.near), foot: z, up: true } : null);
        else if (o === AIR) ends.push({ top: z, foot: sh && sh.far < z - 5 ? sh.far : z - 250, up: true });
        else ends.push(null);
      }
    }
    const k = both ? 3 : 4;
    const segN = [];
    for (let i = 0; i < m - 1; i++) segN.push(across(at2[i], at2[i + 1]));
    const sOf = G.pieces[ch.L >= 0 ? ch.L : ch.R].slab;
    let prev = null;
    for (let i = 0; i < m - 1; i++) {
      const e0 = ends[i], e1 = ends[i + 1];
      if (!e0 || !e1 || (e0.top - e0.foot < 0.02 && e1.top - e1.foot < 0.02) || e0.up !== e1.up) { prev = null; continue; }
      // A wall faces the lower piece; at a torn edge it faces the rock; a skirt faces out into the air.
      const toL = toWorldDir(segN[i]), neg = (d) => d.map((v) => -v), toFace = ch.L >= 0 ? toL : neg(toL);
      const out = both ? (e0.up ? neg(toL) : toL) : (ch.L >= 0 ? ch.R : ch.L) === SKIN ? toFace : neg(toFace);
      const a0 = prev ? prev[0] : put(world(at2[i][0], at2[i][1], e0.top), -1, sOf, k), a1 = prev ? prev[1] : put(world(at2[i][0], at2[i][1], e0.foot), -1, sOf, k);
      const b0 = put(world(at2[i + 1][0], at2[i + 1][1], e1.top), -1, sOf, k), b1 = put(world(at2[i + 1][0], at2[i + 1][1], e1.foot), -1, sOf, k);
      tri(a0, b0, b1, out); tri(a0, b1, a1, out);
      prev = [b0, b1];
    }
  }

  // Stones: broken pieces of the rock lying where a face looks up, most of them in the angle at the foot of a step.
  const ICO = (() => {
    const t = (1 + Math.sqrt(5)) / 2, v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
    const fc = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    return { v, f: fc };
  })();
  let stones = 0;
  const stone = (f, px, py, seed) => {
    const pc = G.pieces[f], n = pc.n, size = STONES.size[0] + (STONES.size[1] - STONES.size[0]) * hash(seed, 11) ** 2;
    const base = world(px, py, keep(f, px, py, G.depth(f, px, py)));
    if (Math.hypot(base[0] - C[0], base[1] - C[1], base[2] - C[2]) < CLEAR + 8 + size) return;
    if (Math.abs(px - CORE_PX[0]) < STREAM.half + 4 && py > STREAM.below - 10) return;
    const a0 = norm(cross(n, [hash(seed, 1) - 0.5, 0.2, hash(seed, 2) - 0.5])), b0 = cross(n, a0), turn = hash(seed, 3) * Math.PI * 2;
    const ax = a0.map((v, i) => v * Math.cos(turn) + b0[i] * Math.sin(turn)), bx = cross(n, ax);
    const sq = [1 + 0.6 * hash(seed, 21), 0.4 + 0.25 * hash(seed, 22), 0.75 + 0.45 * hash(seed, 23)];
    const corner = ICO.v.map((v, i) => {
      const r = size * (0.72 + 0.5 * hash(seed * 13, i)), lx = v[0] * r * sq[0], ly = v[1] * r * sq[1], lz = v[2] * r * sq[2];
      return [0, 1, 2].map((c) => base[c] + ax[c] * lx + n[c] * (ly + size * 0.18) + bx[c] * lz);
    });
    const centre = [0, 1, 2].map((c) => base[c] + n[c] * size * 0.18);
    for (const [a, b, c] of ICO.f) {
      const ia = put(corner[a], -2, pc.slab, 5), ib = put(corner[b], -2, pc.slab, 5), ic = put(corner[c], -2, pc.slab, 5);
      tri(ia, ib, ic, [0, 1, 2].map((q) => (corner[a][q] + corner[b][q] + corner[c][q]) / 3 - centre[q]));
    }
    stones++;
  };
  for (let f = 0; f < G.pieces.length; f++) {
    const pc = G.pieces[f];
    if (G.slabs[pc.slab].role === 'gap' || pc.n[1] < STONES.up || !G.loops[f].length) continue;
    const lp = G.loops[f][0], m = lp.ids.length, P0 = lp.ids.map((p) => pts[p]);
    const insideLoop = (x, y) => { let c = false; for (let i = 0, j = m - 1; i < m; j = i++) { const [xi, yi] = P0[i], [xj, yj] = P0[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    // In the angle at the foot of a step: where the other side stands higher.
    for (let i = 0; i < m; i += 4) {
      const o = lp.other[i];
      if (o < 0 || below(f, lp.ids[i], o) > -3 || hash(f * 31 + i, 7) > STONES.angle) continue;
      const [x0, y0] = P0[i], [x1, y1] = P0[(i + 1) % m], l = Math.hypot(x1 - x0, y1 - y0) || 1, d = 1.2 + 2.5 * hash(i, f);
      for (const sgn of [1, -1]) { const x = x0 + (sgn * (y1 - y0) / l) * d, y = y0 - (sgn * (x1 - x0) / l) * d; if (insideLoop(x, y)) { stone(f, x, y, f * 977 + i); break; } }
    }
    // A few over the face.
    let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
    for (const [x, y] of P0) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
    const want = Math.floor((pc.area / STONES.per) * hash(f, 41) * 2);
    for (let k = 0, tries = 0; k < want && tries < want * 8; tries++) {
      const x = bx0 + (bx1 - bx0) * hash(f * 7 + tries, 3), y = by0 + (by1 - by0) * hash(tries, f * 5 + 1);
      if (!insideLoop(x, y)) continue;
      k++;
      stone(f, x, y, f * 131 + tries + 50000);
    }
  }

  // Normals: a face's own plane; every other vertex from its own triangles, which only its strip shares.
  const n = face.length, acc = new Float64Array(n * 3);
  for (let q = 0; q < I.length; q += 3) {
    const [a, b, c] = [I[q], I[q + 1], I[q + 2]], pa = posOf(a), fn = cross(posOf(b).map((v, i) => v - pa[i]), posOf(c).map((v, i) => v - pa[i]));
    for (const w of [a, b, c]) { acc[w * 3] += fn[0]; acc[w * 3 + 1] += fn[1]; acc[w * 3 + 2] += fn[2]; }
  }
  const normals = new Float32Array(n * 3);
  for (let w = 0; w < n; w++) {
    let m = kind[w] === 0 ? [Nor[w * 3], Nor[w * 3 + 1], Nor[w * 3 + 2]] : norm([acc[w * 3], acc[w * 3 + 1], acc[w * 3 + 2]]);
    if (!m.every(Number.isFinite) || Math.hypot(...m) < 0.5) m = VIEW;
    normals.set(m, w * 3);
  }
  // Drop what no triangle uses.
  const usedV = new Int32Array(n).fill(-1), P2 = [], N2 = [], F2 = [], S2 = [], K2 = [];
  for (let q = 0; q < I.length; q++) {
    const w = I[q];
    if (usedV[w] < 0) { usedV[w] = F2.length; P2.push(Pos[w * 3], Pos[w * 3 + 1], Pos[w * 3 + 2]); N2.push(normals[w * 3], normals[w * 3 + 1], normals[w * 3 + 2]); F2.push(face[w]); S2.push(slabOf[w]); K2.push(kind[w]); }
    I[q] = usedV[w];
  }
  return { positions: new Float32Array(P2), indices: new Uint32Array(I), normals: new Float32Array(N2), face: new Int32Array(F2), slab: new Int32Array(S2), kind: new Uint8Array(K2), push, stones };
}
