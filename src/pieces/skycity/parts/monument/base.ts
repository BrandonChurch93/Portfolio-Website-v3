import * as THREE from 'three';
import { rbox, seeded } from '../../../../world/build';
import { polarUV } from './disc';
import { KIND, type KindName } from './materials';
import { BRAZIERS, CLAMP, CRADLE, DISC, OBELISK, PYLON, STAIR, TIERS } from './plan';

// What the disc stands on and with, in units, upright at the origin with the disc's face toward +z: the plinth in
// three tiers of old stone laid in courses, the stair up its front, the bronze cradle the rim rests in with a bead of
// gold along its seat, an obelisk of black granite with a gold cap at each end, and braziers at the foot.

export interface Piece { g: THREE.BufferGeometry; gold?: boolean; cast?: boolean }

// Writes a kind on every vertex, with a coordinate up the piece (for a flame), a seed, and for an obelisk's shaft
// where its middle is across the plinth, which its column of glyphs is cut down.
function kind(g: THREE.BufferGeometry, k: KindName, seed = 0, w = 0): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g, n = out.getAttribute('position').count, cell = new Float32Array(n * 4);
  const p = out.getAttribute('position');
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < n; i++) { lo = Math.min(lo, p.getY(i)); hi = Math.max(hi, p.getY(i)); }
  for (let i = 0; i < n; i++) cell.set([KIND[k], (p.getY(i) - lo) / Math.max(1e-6, hi - lo), seed, w], i * 4);
  out.setAttribute('cell', new THREE.BufferAttribute(cell, 4));
  return out;
}

const flat = (g: THREE.BufferGeometry) => { const o = g.toNonIndexed(); o.computeVertexNormals(); return o; };

export function base(): Piece[] {
  const out: Piece[] = [], rnd = seeded(4127);
  // The plinth: each tier in courses, each course a row of blocks the depth of the tier, a little in from the one
  // under it, with the joints staggered.
  let floor = 0;
  TIERS.forEach((t, ti) => {
    const h = (t.top - floor) / t.courses;
    for (let c = 0; c < t.courses; c++) {
      const y0 = floor + c * h, half = t.x - c * 1.2, deep = t.z - c * 1.2;
      let x = -half;
      const shift = (c + ti) % 2 ? 0.5 : 0;
      let first = true;
      while (x < half - 0.5) {
        const want = (first ? 0.5 + shift : 1) * (16 + rnd() * 12);
        first = false;
        const w = Math.min(want, half - x);
        const g = rbox(w - 0.5, h - 0.35, 2 * deep, 0.75, 1);
        g.translate(x + w / 2, y0 + h / 2, 0);
        out.push({ g: kind(g, ti === 0 && c === 0 ? 'worn' : 'stone', rnd() * 40), cast: true });
        x += w;
      }
    }
    // A rounded moulding and an overhanging cornice along the top of each tier but the lowest.
    if (ti > 0) {
      const lip = rbox(2 * t.x + 2.4, 1.6, 2 * t.z + 2.4, 0.7, 2);
      lip.translate(0, t.top - 0.8, 0);
      out.push({ g: kind(lip, 'stone', 7 + ti), cast: true });
      for (const z of [t.z + 0.6, -t.z - 0.6]) {
        const rod = new THREE.CylinderGeometry(0.85, 0.85, 2 * t.x + 1, 10, 1);
        rod.rotateZ(Math.PI / 2);
        rod.translate(0, t.top - 2.4, z);
        out.push({ g: kind(rod, 'stone', 3), cast: true });
      }
    }
    floor = t.top;
  });
  // The stair up the front, worn, between two walls whose tops slope with it.
  const top = TIERS[2].top, rise = top / STAIR.steps, from = TIERS[2].z;
  for (let i = 0; i < STAIR.steps; i++) {
    const y = top - i * rise, run = (i + 1) * STAIR.run;
    const g = rbox(2 * STAIR.half, y, run, 0.35, 1);
    g.translate(0, y / 2, from + run / 2 - 0.01 * i);
    out.push({ g: kind(g, 'worn', 11 + i), cast: true });
  }
  const end = from + STAIR.steps * STAIR.run;
  for (const sx of [-1, 1]) {
    const s = new THREE.Shape();
    s.moveTo(from - 6, 0);
    s.lineTo(end + 2.5, 0);
    s.lineTo(end + 2.5, 4.5);
    s.lineTo(from, top + 4.5);
    s.lineTo(from - 6, top + 4.5);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 5, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 1, curveSegments: 1 });
    // The shape is drawn in depth and height, and set across the stair at its side.
    g.rotateY(-Math.PI / 2);
    g.translate(sx * (STAIR.half + (sx > 0 ? 5 : 0)), 0, 0);
    out.push({ g: kind(g, 'stone', 21 + sx), cast: true });
  }

  // The cradle: a block of black granite that the disc's rim sinks into, and two clamps of bronze that close over the
  // rim where it leaves the seat, so the disc is plainly held and not set down. A rim seen through a seat cut to it
  // read as one more ring of the disc. At each end a battered pylon of the granite, capped in gold, braces it.
  {
    const cy = DISC.at, foot = TIERS[2].top, bev = 1.2;
    const outline = (r: number): THREE.Shape => {
      const a = -Math.PI / 2 + (CRADLE.reach * Math.PI) / 180, ax = r * Math.cos(a), ledge = cy + r * Math.sin(a);
      const s = new THREE.Shape();
      s.moveTo(-CRADLE.x, foot);
      s.lineTo(CRADLE.x, foot);
      s.lineTo(ax + CRADLE.lip, ledge);
      s.lineTo(ax, ledge);
      s.absarc(0, cy, r, a, Math.PI - a, true);
      s.lineTo(-ax - CRADLE.lip, ledge);
      s.closePath();
      return s;
    };
    const slab = (r: number, z0: number, z1: number) => {
      const g = new THREE.ExtrudeGeometry(outline(r), { depth: z1 - z0 - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 40 });
      g.translate(0, 0, z0 + bev);
      return g;
    };
    out.push({ g: kind(slab(DISC.r + 1, CRADLE.back, CRADLE.front), 'granite', 5), cast: true });
    // Two clamps of bronze that close over the rim, front and back, where it leaves the seat.
    for (const sx of [-1, 1]) {
      const a = -Math.PI / 2 + sx * (CLAMP.at * Math.PI) / 180, r = DISC.r + CLAMP.out;
      const g = rbox(CLAMP.wide, CLAMP.long, CLAMP.front - CLAMP.back, 1.1, 2);
      g.rotateZ(a + Math.PI / 2);
      g.translate(r * Math.cos(a), cy + r * Math.sin(a), (CLAMP.front + CLAMP.back) / 2);
      out.push({ g: kind(g, 'bronze', 12 + sx), cast: true });
      const lip = rbox(CLAMP.wide - 3, CLAMP.lip, 4, 1, 2);
      lip.rotateZ(a + Math.PI / 2);
      const rl = DISC.r - CLAMP.lip / 2 + 1;
      lip.translate(rl * Math.cos(a), cy + rl * Math.sin(a), CLAMP.front - 2.5);
      out.push({ g: kind(lip, 'bronze', 14 + sx), cast: true });
      const boss = new THREE.SphereGeometry(3, 18, 10);
      boss.scale(1, 1, 0.55);
      const rb = r + 2;
      boss.translate(rb * Math.cos(a), cy + rb * Math.sin(a), CLAMP.front + 0.6);
      polarUV(boss, true);
      out.push({ g: boss, gold: true, cast: true });
    }
    for (const sx of [-1, 1]) {
      const s = new THREE.Shape();
      const w0 = PYLON.w0, w1 = PYLON.w1, h = PYLON.tall;
      s.moveTo(-w0 / 2, 0);
      s.lineTo(w0 / 2, 0);
      s.lineTo(w1 / 2, h);
      s.lineTo(-w1 / 2, h);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: PYLON.deep - 2, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2, curveSegments: 1 });
      g.translate(sx * PYLON.x, foot, PYLON.mid - PYLON.deep / 2 + 1);
      out.push({ g: kind(g, 'granite', 8 + sx), cast: true });
      const cap = rbox(w1 + 3, 2.4, PYLON.deep + 3, 0.9, 2);
      cap.translate(sx * PYLON.x, foot + h + 1.2, PYLON.mid);
      polarUV(cap, true);
      out.push({ g: cap, gold: true, cast: true });
      // A band of gold round each pylon a third of the way up.
      const band = rbox(w0 - (w0 - w1) * 0.36 + 1.2, 1.6, PYLON.deep + 1.2, 0.5, 1);
      band.translate(sx * PYLON.x, foot + h * 0.36, PYLON.mid);
      polarUV(band, true);
      out.push({ g: band, gold: true, cast: true });
    }
  }

  // The obelisks: a pedestal, a tapering shaft of black granite with a column of glyphs cut down each face, bands and
  // a cap of gold.
  for (const sx of [-1, 1]) {
    const x = sx * OBELISK.x, y = OBELISK.foot;
    const ped = rbox(OBELISK.ped.w, OBELISK.ped.h, OBELISK.ped.w, 0.6, 1);
    ped.translate(x, y + OBELISK.ped.h / 2, 0);
    out.push({ g: kind(ped, 'granite', 2), cast: true });
    const shaft = new THREE.CylinderGeometry(OBELISK.w1 / Math.SQRT2, OBELISK.w0 / Math.SQRT2, OBELISK.tall, 4, 1, true);
    shaft.rotateY(Math.PI / 4);
    shaft.translate(x, y + OBELISK.ped.h + OBELISK.tall / 2, 0);
    out.push({ g: kind(flat(shaft), 'granite', 3, x), cast: true });
    for (const at of [0.08, 0.9]) {
      const band = rbox(OBELISK.w0 - (OBELISK.w0 - OBELISK.w1) * at + 1.1, 1.3, OBELISK.w0 - (OBELISK.w0 - OBELISK.w1) * at + 1.1, 0.4, 1);
      band.translate(x, y + OBELISK.ped.h + OBELISK.tall * at, 0);
      polarUV(band, true);
      out.push({ g: band, gold: true, cast: true });
    }
    const cap = new THREE.ConeGeometry(OBELISK.w1 / Math.SQRT2, OBELISK.cap, 4, 1);
    cap.rotateY(Math.PI / 4);
    cap.translate(x, y + OBELISK.ped.h + OBELISK.tall + OBELISK.cap / 2, 0);
    const c = flat(cap);
    polarUV(c, true);
    out.push({ g: c, gold: true, cast: true });
  }

  // The braziers: a bronze bowl on a short stem, and its flame.
  for (const [x, y, z] of BRAZIERS) {
    const bowl = new THREE.LatheGeometry([[0, 0], [0.9, 0], [0.7, 3.2], [2.6, 4.2], [2.9, 5.6], [2.5, 5.7], [0, 5.0]].map(([a, b]) => new THREE.Vector2(a, b)), 12);
    bowl.translate(x, y, z);
    out.push({ g: kind(bowl, 'bronze', 9), cast: false });
    const flame = new THREE.LatheGeometry([[0, 0], [1.5, 0.6], [1.9, 1.8], [1.4, 3.4], [0.6, 5.0], [0, 6.2]].map(([a, b]) => new THREE.Vector2(a, b)), 10);
    flame.translate(x, y + 5.0, z);
    out.push({ g: kind(flame, 'flame'), cast: false });
  }
  return out;
}
