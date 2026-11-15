import * as THREE from 'three';
import { seeded, slice } from '../../../../world/build';
import type { Lamp } from './materials';
import { type Parts, battered, block, facetedPyramid, fixFaces, local, place, prism, quad, roundedPyramid } from './forms';
import { BASE, CASING, CAUSEWAY, FOOT, GRAND, GROWTH, MAST, PLATES, PODIUM, POOL, PYRAMID, SKIRT, TERRACE } from './plan';

// The temple quarter: the great pyramid rising out of the jungle at the left of the skyline, and the causeway from its
// stair to the pool of polished metal beside it.

const D2R = Math.PI / 180;
// The skin the plates' faces lie on: the stone core's pyramid grown by a plate's thickness along each face.
const SLANT = Math.hypot(PYRAMID.half, PYRAMID.tall);
const H2 = PYRAMID.half + (CASING.thick * SLANT) / PYRAMID.tall, T2 = PYRAMID.tall + (CASING.thick * SLANT) / PYRAMID.half;
const TC = PYRAMID.tall * PYRAMID.cut;
// How far the middle of each of the cap's sides stands out, as a share of its half width, and how far each facet is
// shaded as bowed, in degrees.
const CAP_FOLD = 0.3, CAP_BOW = 14;
const skin = (y: number) => H2 * (1 - y / T2);
const straight = (y: number) => skin(y) * (1 - CASING.arris);

interface Soup { pos: number[]; nrm: number[]; cell: number[] }
const soup = (): Soup => ({ pos: [], nrm: [], cell: [] });
const toGeo = (s: Soup) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(s.nrm, 3));
  g.setAttribute('cell', new THREE.Float32BufferAttribute(s.cell, 4));
  fixFaces(g);
  return g;
};

// The casing of one face: courses of plates laid flush, each a little out of true, with thin edges standing proud of
// the core. The face is shaded as if it curved, swelling across its width and bowed so its foot looks out toward the
// visitor and its top up to the sky: so one large reflection sweeps across many plates at once and breaks only where
// one plate is set a little differently from the next, as a polished casing does. Shaded flat, each plate carried
// the same small highlight and the face read as a stamped tile. Built in the pyramid's own frame, its foot at y = 0.
function face(f: number, gold: Soup, bronze: Soup, dark: Soup, battens: Soup, r: () => number, moonward: boolean): void {
  const a = f * 90 * D2R, d = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), t = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)), up = new THREE.Vector3(0, 1, 0);
  const n0 = d.clone().multiplyScalar(PYRAMID.tall).addScaledVector(up, PYRAMID.half).normalize();
  const upF = d.clone().multiplyScalar(-PYRAMID.half).addScaledVector(up, PYRAMID.tall).normalize();
  const on = (u: number, y: number) => d.clone().multiplyScalar(skin(y)).addScaledVector(t, u).setY(y);
  const { course, plate, joint, thick } = CASING, courses = Math.ceil(TC / course), skew = Math.tan(CASING.skew * D2R);
  const swell = (moonward ? CASING.moonSwell : CASING.swell) * D2R;
  const bend = (u: number, y: number) => n0.clone().addScaledVector(t, Math.tan(swell * Math.max(-1, Math.min(1, u / straight(y))))).addScaledVector(upF, -Math.tan(D2R * (CASING.bow[1] + (CASING.bow[0] - CASING.bow[1]) * (y / TC))));
  for (let c = 0; c < courses; c++) {
    const y0 = c * course, y1 = Math.min(TC, y0 + course), ym = (y0 + y1) / 2, w = 2 * straight(ym);
    // The seams run straight up the face on one lattice, as cladding's do, and the plates at the ends of a course are
    // cut by the arris: staggered joints read as brickwork, and seams that narrowed with the face as a mosaic.
    const k0 = Math.ceil((-w / 2 + plate * 0.35) / plate), k1 = Math.floor((w / 2 - plate * 0.35) / plate);
    const cuts = [-w / 2, ...Array.from({ length: Math.max(0, k1 - k0 + 1) }, (_, k) => (k0 + k) * plate), w / 2];
    const band = PLATES.bands.includes(c);
    for (let i = 0; i < cuts.length - 1; i++) {
      const bronzeIs = band || r() < (moonward ? PLATES.moonward : c < PLATES.foot ? 1 : 1 - (c - PLATES.foot + 1) / (PLATES.mixed + 1));
      const lost = !band && r() < PLATES.lostFoot * Math.max(0, 1 - c / PLATES.lostUp) + PLATES.lostAny;
      const s1 = (r() - 0.5) * 2 * skew, s2 = (r() - 0.5) * 2 * skew, seed = r() * 97, proud = 0.12 * r();
      if (lost) continue;
      const out = moonward ? dark : bronzeIs ? bronze : gold;
      const first = i === 0, last = i === cuts.length - 2;
      const ya = y0 + joint / 2, yb = y1 - joint / 2, hh = (yb - ya) / 2;
      const span = (y: number): [number, number] => [first ? -straight(y) + joint / 2 : cuts[i] + joint / 2, last ? straight(y) - joint / 2 : cuts[i + 1] - joint / 2];
      const front = (pa: number, pb: number) => {
        const y = ya + ((pb + 1) / 2) * (yb - ya), [ua, ub] = span(y), u = ua + ((pa + 1) / 2) * (ub - ua), hw = (ub - ua) / 2;
        const off = proud + s1 * pa * hw + s2 * pb * hh;
        return { p: on(u, y).addScaledVector(n0, off), back: on(u, y).addScaledVector(n0, -thick), u, y };
      };
      const push = (p: THREE.Vector3, nn: THREE.Vector3, u: number, tarnish: number) => { out.pos.push(p.x, p.y, p.z); out.nrm.push(nn.x, nn.y, nn.z); out.cell.push(0, u, seed, tarnish); };
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => front(x, y));
      for (const q of [0, 1, 2, 0, 2, 3]) { const v = corners[q]; push(v.p, bend(v.u, v.y).addScaledVector(t, -s1).addScaledVector(upF, -s2).normalize(), v.u, 0); }
      // The edges along each plate's top and foot, dull. A bright rim on every plate read as a grid of lit windows,
      // and the bright end of every plate as rows of dots, so the ends are left open.
      const sides: [number, number, THREE.Vector3][] = [[3, 2, upF], [1, 0, upF.clone().negate()]];
      for (const [i0, i1, nn] of sides) {
        const A = corners[i0], B = corners[i1], q = [A.p, B.p, B.back, A.back];
        for (const k2 of [0, 1, 2, 0, 2, 3]) push(q[k2], nn, k2 === 1 || k2 === 2 ? B.u : A.u, 1);
      }
    }
    // Battens of dark bronze over the seams, a little proud of the plates, as the mullions of a clad wall: an open
    // seam showed the core through it as a dotted line.
    const bat = (u0: number, u1: number, ya: number, yb: number) => {
      const q = [[u0, ya], [u1, ya], [u1, yb], [u0, yb]].map(([u, y]) => on(u, y).addScaledVector(n0, 0.3));
      const nn = bend((u0 + u1) / 2, (ya + yb) / 2).normalize();
      for (const k2 of [0, 1, 2, 0, 2, 3]) { battens.pos.push(q[k2].x, q[k2].y, q[k2].z); battens.nrm.push(nn.x, nn.y, nn.z); battens.cell.push(0, 0, 0, 0); }
    };
    const bw = joint * 0.9;
    if (c > 0) bat(-straight(y0), straight(y0), y0 - bw, y0 + bw);
    for (let i = 1; i < cuts.length - 1; i++) bat(cuts[i] - bw, cuts[i] + bw, y0 + bw, y1 - bw);
  }
}

// The jungle taking hold of the pyramid's foot: curtains of creeper hanging down the lowest courses of the faces that
// are seen, draped over each tilted course, widest at the foot, and clumps of growth along the casing's foot, the
// terrace's edge and the stair. Built in the pyramid's frame, the casing's foot at y = 0.
function growth(b: Parts, mm: THREE.Matrix4, m: THREE.Matrix4, r: () => number): void {
  const vines = soup(), top = TC * GROWTH.reach, up = new THREE.Vector3(0, 1, 0);
  for (let f = 0; f < 4; f++) {
    if (Math.cos((f * 90 + PYRAMID.turn) * D2R) <= -0.35) continue;
    const a = f * 90 * D2R, d = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), t = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    const n0 = d.clone().multiplyScalar(PYRAMID.tall).addScaledVector(up, PYRAMID.half).normalize();
    for (let i = 0; i < GROWTH.curtains; i++) {
      const u0 = (-1 + (2 * (i + 0.2 + 0.6 * r())) / GROWTH.curtains) * straight(0) * 0.92, h = top * (0.35 + 0.65 * r()), w0 = GROWTH.wide * (0.5 + 0.7 * r());
      const ph = r() * 6.28, sway = 1.5 + 3 * r(), seed = r() * 50, rows = Math.ceil(h / (CASING.course / 3));
      const at = (k: number, side: number) => {
        const y = (h * k) / rows, lim = straight(y) - 1, w = w0 * (0.25 + 0.75 * Math.max(0, 1 - y / h) ** 0.7) * (0.7 + 0.5 * Math.sin(y * 0.9 + ph * 3));
        const u = Math.max(-lim, Math.min(lim, u0 + sway * Math.sin(y * 0.22 + ph) + (side * w) / 2));
        return d.clone().multiplyScalar(skin(y)).addScaledVector(t, u).setY(y).addScaledVector(n0, 0.9);
      };
      for (let k = 0; k < rows; k++) {
        const q = [at(k, -1), at(k, 1), at(k + 1, 1), at(k + 1, -1)];
        for (const j of [0, 1, 2, 0, 2, 3]) { vines.pos.push(q[j].x, q[j].y, q[j].z); vines.nrm.push(n0.x, n0.y, n0.z); vines.cell.push(0, 0, seed, 0); }
      }
    }
  }
  b.add(toGeo(vines), 'vine', { m: mm });
  // The clumps: low mounds of leaf, each a squashed ball pushed out of round.
  const half = PYRAMID.half, edge = half + TERRACE.extra, foot = half + 1;
  for (let i = 0; i < GROWTH.clumps; i++) {
    const g = new THREE.IcosahedronGeometry(1, 1), p = g.getAttribute('position'), seed = r() * 50;
    for (let j = 0; j < p.count; j++) { const k = 0.75 + 0.5 * Math.abs(Math.sin(p.getX(j) * 5.1 + p.getY(j) * 3.7 + p.getZ(j) * 4.3 + seed)); p.setXYZ(j, p.getX(j) * k, p.getY(j) * k, p.getZ(j) * k); }
    g.computeVertexNormals();
    const where = r(), s = 3 + 5 * r();
    let x: number, y: number, z: number;
    // Along the casing's foot on a face seen, along the terrace's front and side edges, or up the sides of the stair.
    const face = [0, 1, 3][Math.floor(r() * 3)], a = (face * 90) * D2R, along = (r() * 2 - 1) * 0.95;
    if (where < 0.45) { x = Math.sin(a) * foot + Math.cos(a) * along * foot; z = Math.cos(a) * foot - Math.sin(a) * along * foot; y = FOOT; }
    else if (where < 0.85) { x = Math.sin(a) * edge + Math.cos(a) * along * edge; z = Math.cos(a) * edge - Math.sin(a) * along * edge; y = TERRACE.tall - 1; }
    else { x = (r() < 0.5 ? -1 : 1) * (11 + 2 * r()); z = edge + 2 + 8 * r(); y = TERRACE.tall * (1 - (z - edge) / 12); }
    g.scale(s * (1 + 0.6 * r()), s * (0.45 + 0.3 * r()), s * (1 + 0.6 * r())).rotateY(r() * 6.28).translate(x, y, z);
    b.add(g, 'vine', { m, seed });
  }
}

async function greatPyramid(b: Parts): Promise<void> {
  const { tall, half, turn } = PYRAMID, m = place(PYRAMID.at[0], 0, PYRAMID.at[1], turn);
  const tw = 2 * (half + TERRACE.extra);
  for (const [extra, topY] of BASE.tiers) {
    const w = 2 * (half + extra);
    b.add(battered(w, w, topY + BASE.sink, BASE.batter, { cornice: 1.2, c: 0.5 }).translate(0, -BASE.sink, 0), 'lime', { m, cast: true, seed: 70 + extra, foot: -BASE.sink });
  }
  b.add(battered(tw, tw, TERRACE.tall + SKIRT.terrace, TERRACE.batter, { cornice: 1.6, c: 0.4 }).translate(0, -SKIRT.terrace, 0), 'lime', { m, cast: true, seed: 17, foot: -SKIRT.terrace });
  // A broad stair up the terrace's front, toward the pool.
  const n = Math.round(TERRACE.tall / 1.1);
  for (let i = 0; i < n; i++) {
    const ya = (TERRACE.tall * (i + 1)) / n, run = (TERRACE.tall * TERRACE.batter * 4 + 9) * (1 - (i + 1) / n);
    b.add(block(22, ya + 3, 1.3, 0.05).translate(0, -3, tw / 2 + run + 0.4), 'paving', { m, seed: 19 });
  }
  let y = TERRACE.tall;
  for (const [extra, top] of PODIUM.steps) {
    b.add(battered(2 * (half + extra), 2 * (half + extra), top - (y - TERRACE.tall), 0.004, { cornice: 0.6, c: 0.4 }).translate(0, y, 0), 'lime', { m, cast: true, seed: top });
    y = TERRACE.tall + top;
  }
  const mm = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, FOOT, 0));
  // The core, stepped course by course, of dark stone, which shows in the seams as a dark line and where a plate is
  // lost. Of pale stone it showed its own joints through each seam as a dotted line.
  const courses = Math.ceil(TC / CASING.course);
  for (let c = 0; c < courses; c++) {
    const y0 = c * CASING.course, y1 = Math.min(TC, y0 + CASING.course), h = half * (1 - y1 / tall) - 0.2;
    b.add(block(2 * h, y1 - y0 + (c ? 0 : 1), 2 * h, 0.2, y0 - (c ? 0 : 1)), 'granite', { m: mm, cast: c > courses - 4, seed: 40 + c });
  }
  // The plates of the faces that can be seen. The faces turned away from the visitor are left as the stepped core.
  const r = seeded(4410), gold = soup(), bronze = soup(), dark = soup(), battens = soup();
  for (let f = 0; f < 4; f++) if (Math.cos((f * 90 + turn) * D2R) > -0.35) { face(f, gold, bronze, dark, battens, r, Math.sin((f * 90 + turn) * D2R) > 0.7); await slice(); }
  b.add(toGeo(gold), 'gold', { m: mm, cast: true });
  b.add(toGeo(bronze), 'bronze', { m: mm, cast: true });
  b.add(toGeo(dark), 'dark', { m: mm, cast: true });
  b.add(toGeo(battens), 'dark', { m: mm });
  await slice();
  // The arrises: rounded and polished, a line of light up each corner.
  b.add(roundedPyramid(H2, T2, 0, TC / T2, { round: CASING.arris, sides: false, corners: true, rows: 6, arc: 8 }), 'gold', { m: mm, cast: true });
  // The body's top, a collar of dark bronze, and the capstone on it: a faceted mirror, so it holds the room's lights
  // on some facets and the dark on others. Held over a lit gap, with a halo, it read as a bulb.
  const ht = skin(TC);
  b.add(block(2 * ht * 1.04, 1.2, 2 * ht * 1.04, 0.3, TC - 0.2), 'dark', { m: mm, cast: true });
  b.add(facetedPyramid(ht, T2 - TC, CAP_FOLD, CAP_BOW).translate(0, TC + 1, 0), 'cap', { m: mm, cast: true });
  await slice();
  growth(b, mm, m, r);
}

// The obelisk that is a mast, behind the pyramid: a shaft of granite, a mirror pyramidion, and over it a needle ringed
// in copper with a light at its tip. A thin line of light runs up its front.
function mast(b: Parts, lamps: Lamp[]): void {
  const { at, tall, foot, top, cap } = MAST, m = place(at[0], 0, at[1], PYRAMID.turn, GRAND);
  const plinth = 5, shaftTop = tall - cap - 16;
  b.add(battered(foot * 3.6, foot * 3.6, plinth + 3, 0.08, { cornice: 1.4, c: 0.2 }).translate(0, -3, 0), 'lime', { m, cast: true, seed: 9, foot: -3 });
  b.add(prism([{ y: plinth, hw: foot, hd: foot, c: foot * 0.14 }, { y: shaftTop, hw: top, hd: top, c: top * 0.14 }]), 'granite', { m, cast: true });
  b.add(roundedPyramid(top * 1.08, cap, 0, 1, { round: 0.2, swell: 4, rows: 4, cols: 3, arc: 6 }).translate(0, shaftTop, 0), 'cap', { m, cast: true });
  const n0 = shaftTop + cap * 0.7;
  b.add(new THREE.CylinderGeometry(0.28, 0.6, tall - n0, 8).translate(0, (tall + n0) / 2, 0), 'granite', { m });
  for (const [yy, rr] of [[n0 + 4, 1.4], [n0 + 9, 1.0]]) b.add(new THREE.CylinderGeometry(rr, rr, 0.45, 16).translate(0, yy, 0), 'copper', { m });
  b.add(new THREE.OctahedronGeometry(0.75).translate(0, tall + 0.4, 0), 'lamp', { m });
  lamps.push({ at: [at[0], (tall + 0.4) * GRAND, at[1]], power: 0.6, reach: 5 * GRAND, heat: 0.85 });
  const dz = (yy: number) => foot + ((top - foot) * (yy - plinth)) / (shaftTop - plinth) + 0.04;
  const ya = plinth + 6, yb = shaftTop - 3;
  b.add(quad(new THREE.Vector3(-0.32, ya, dz(ya)), new THREE.Vector3(0.32, ya, dz(ya)), new THREE.Vector3(0.22, yb, dz(yb)), new THREE.Vector3(-0.22, yb, dz(yb)), new THREE.Vector3(0, 0.02, 1)), 'line', { m, v: (q) => (q.y - ya) / (yb - ya) });
}

// The causeway from the foot of the pyramid's stair to the pool's shore: a raised road of pale stone with a lamp on a
// post of bronze either side every so far, and a landing at the shore.
function causeway(b: Parts, lamps: Lamp[]): void {
  const { at, half, turn } = PYRAMID, run = TERRACE.tall * TERRACE.batter * 4 + 9;
  const [x0, , z0] = local(at[0], 0, at[1], turn, 0, 0, half + TERRACE.extra + run);
  const dx = POOL.at[0] - x0, dz = POOL.at[1] - z0, far = Math.hypot(dx, dz), len = far - POOL.shore;
  const a = Math.atan2(dx, dz) / D2R, ux = dx / far, uz = dz / far;
  const mid = (k: number) => [x0 + ux * len * k, z0 + uz * len * k] as const;
  const [cx, cz] = mid(0.5);
  b.add(battered(CAUSEWAY.wide + 2, len, CAUSEWAY.tall + SKIRT.small, 0.05, { cornice: 0.5, c: 0.2, dBatter: 0 }).translate(0, -SKIRT.small, 0), 'lime', { m: place(cx, 0, cz, a), cast: true, seed: 31, foot: -SKIRT.small });
  const [lx, lz] = mid(1);
  b.add(battered(CAUSEWAY.wide * 2.6, CAUSEWAY.wide * 1.6, CAUSEWAY.tall + SKIRT.small, 0.05, { cornice: 0.5, c: 0.3 }).translate(0, -SKIRT.small, 0), 'lime', { m: place(lx, 0, lz, a), cast: true, seed: 33, foot: -SKIRT.small });
  const n = Math.max(2, Math.floor(len / CAUSEWAY.lamps));
  for (let i = 0; i <= n; i++) {
    const [px, pz] = mid(i / n);
    for (const s of [-1, 1]) {
      const [qx, , qz] = local(px, 0, pz, a, s * (CAUSEWAY.wide / 2 + 0.3), 0, 0), m = place(qx, CAUSEWAY.tall, qz, a);
      b.add(block(0.7, 5, 0.7, 0.1), 'bronze', { m });
      b.add(block(1.3, 1.1, 1.3, 0.15, 5), 'lamp', { m });
      b.add(block(1.7, 0.3, 1.7, 0.1, 6.1), 'dark', { m });
      lamps.push({ at: [qx, CAUSEWAY.tall + 5.6, qz], power: 0.5, reach: 7, heat: 0.78 });
    }
  }
}

export async function buildQuarter(b: Parts, lamps: Lamp[]): Promise<void> {
  await greatPyramid(b);
  await slice();
  mast(b, lamps);
  await slice();
  causeway(b, lamps);
}
