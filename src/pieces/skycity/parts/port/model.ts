import * as THREE from 'three';
import { bend } from '../../layout';
import { type Section, loft, rbox } from '../../../../world/build';
import { Kit, V, battered, block, rod, turned, xform } from './kit';
import { PAVING as PAVE } from './plan';
import { BARQUE, BEACON, COLOSSI, DOOR, FACADE, HARBOUR, MASSIF, OBELISKS, SINK, TERRACES } from './plan';

// The Harbour in the Rock as built, in the citadel's own frame (./plan.ts): two kits, one of the large forms that throw
// shadows and one of the fine parts that do not, the places of its few lights, and the paving round it, which is laid
// on the world itself.

export interface Lamp { at: THREE.Vector3; size: number; heat: number; k: number; does: 'steady' | 'blink' | 'breath'; phase: number }
export interface PortModel { cast: Kit; fine: Kit; rock: Kit; lamps: Lamp[]; paving: Kit }


// A door shaped as a pylon's gate, narrower at its head, standing on y = 0 and facing +z, with uv from 0 to 1.
function trapezoid(wb: number, wt: number, h: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-wb / 2, 0, 0, wb / 2, 0, 0, wt / 2, h, 0, -wt / 2, h, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  return g;
}

// A pylon gate shaped door set into a wall that leans back, lit within, framed in gold, under a lintel of stone.
function bay(fine: Kit, cast: Kit, x: number, z: number, lean: number, wb: number, wt: number, h: number): void {
  const tilt = -Math.atan(lean), at = (y: number, out = 0) => V(x, y, z - lean * y + out);
  fine.add(trapezoid(wb, wt, h), 'door', xform(at(0, 0.08), 0, 1, 0, tilt));
  for (const s of [-1, 1]) {
    const a = at(0, 0.3).add(V(s * (wb / 2 + 0.5), 0, 0)), b = at(h, 0.3).add(V(s * (wt / 2 + 0.5), 0, 0));
    fine.add(rod(a, b, 0.55, 4), 'gold');
  }
  cast.add(block(wt + 7, 2.6, 2.4, 0.4), 'stone', xform(at(h + 1.3, 0.9)));
  fine.add(block(wt + 4, 0.7, 2.5, 0.15), 'gold', xform(at(h + 3, 0.95)));
}

// A smooth noise in three dimensions, the same on every call, for the rock's ragged outline and its faces.
const hash3 = (x: number, y: number, z: number) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function noise3(x: number, y: number, z: number): number {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = x - i, v = y - j, w = z - k;
  const f = (t: number) => t * t * (3 - 2 * t), a = f(u), b = f(v), c = f(w);
  let out = 0;
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) out += hash3(i + dx, j + dy, k + dz) * (dx ? a : 1 - a) * (dy ? b : 1 - b) * (dz ? c : 1 - c);
  return out;
}

// The massif, one ragged loft through sections up its height: each a rectangle whose front, across its right part,
// stands back step by step, and whose right edge draws in with each step, its outline broken by noise that wanders
// with height, so the rock is a crag and not a stack.
function massif(cast: Kit): void {
  const M = MASSIF, n = 120, rows: number[] = [];
  for (let y = -SINK; y < M.top; y += 3.2) rows.push(y);
  rows.push(M.top);
  const step = (y: number) => { let s = M.steps[0]; for (const t of M.steps) if (y >= t[0]) s = t; return s; };
  // Each step's edge is sharp, over a short rise: blend toward the step above within that rise.
  const at = (y: number): [number, number] => {
    const s = step(y), i = M.steps.indexOf(s), next = M.steps[i + 1];
    if (!next) return [s[1], s[2]];
    const k = Math.min(1, Math.max(0, (y - (next[0] - 2.5)) / 2.5));
    return [s[1] + (next[1] - s[1]) * k, s[2] + (next[2] - s[2]) * k];
  };
  const pos: number[] = [], idx: number[] = [];
  rows.forEach((y, j) => {
    const [x1, zr] = at(y), right = Math.max(x1, M.split + 4), cliffZ = M.cliff - M.lean * Math.max(0, y);
    const zl = Math.min(cliffZ, M.steps[0][2]);
    // The outline, clockwise from the front left: along the cliff's front, round to the steps' front, the right edge,
    // the back, and the left flank.
    const ring: [number, number][] = [[M.x0, zl], [M.split, zl], [M.split + 5, Math.min(zr, zl)], [right, Math.min(zr, zl)], [right, M.z0], [M.x0, M.z0]];
    const per: number[] = [0];
    for (let k = 1; k <= ring.length; k++) { const a = ring[k - 1], b = ring[k % ring.length]; per.push(per[k - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const total = per[ring.length];
    for (let i = 0; i < n; i++) {
      const d = (i / n) * total;
      let k = 0;
      while (per[k + 1] < d) k++;
      const a = ring[k], b = ring[(k + 1) % ring.length], t = (d - per[k]) / Math.max(1e-6, per[k + 1] - per[k]);
      const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = (b[1] - a[1]) / len, nz = -(b[0] - a[0]) / len;
      const top = y >= M.top - 0.01 ? 0.4 : 1;
      const o = top * (M.rag * (2 * noise3(x / 21, y / 17, z / 21) - 1) + M.rag * 0.3 * (2 * noise3(x / 11, y / 13, z / 11) - 1));
      pos.push(x - nx * o, y, z - nz * o);
    }
  });
  for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, b = j * n + ((i + 1) % n);
    idx.push(a, b, a + n, b, b + n, a + n);
  }
  // The summit, closed over.
  const c = pos.length / 3, last = (rows.length - 1) * n;
  let sx = 0, sz = 0;
  for (let i = 0; i < n; i++) { sx += pos[(last + i) * 3]; sz += pos[(last + i) * 3 + 2]; }
  pos.push(sx / n, M.top + 1.5, sz / n);
  for (let i = 0; i < n; i++) idx.push(c, last + i, last + ((i + 1) % n));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  cast.add(g, 'rock');
}

// The front cut in the rock: a face of dressed stone leaning back, its cornice, a band of gold, and the great door: a
// pylon shaped mouth lit from within, between jambs of stone, under a lintel and a frieze of gold.
function facade(cast: Kit, fine: Kit): void {
  const F = FACADE, W = F.x1 - F.x0, H = F.tall + SINK, cx = (F.x0 + F.x1) / 2, d = 14;
  cast.add(battered(W + 1, d + 2 * F.batter * H, W, d, H, 3), 'stone', xform([cx, -SINK, F.z - d / 2 - F.batter * H]));
  fine.add(battered(W + 0.7, d + 0.7, W + 0.6, d + 0.6, 1.2), 'gold', xform([cx, F.tall - 2.4, F.z - d / 2 - F.batter * H]));
  const D = DOOR, face = F.z + 0.1;
  fine.add(trapezoid(D.wb, D.wt, D.h), 'door', xform(V(D.x, 0, face), 0, 1, 0, -Math.atan(F.batter)));
  for (const s of [-1, 1]) {
    const jamb = battered(6, 5, 5, 4.4, D.h + 2);
    cast.add(jamb, 'stone', xform([D.x + s * (D.wb / 2 + 2.6), 0, face + 1.6]));
    fine.add(rod(V(D.x + s * (D.wb / 2 + 0.2), 0.5, face + 0.4), V(D.x + s * (D.wt / 2 + 0.2), D.h, face + 0.4 - F.batter * D.h), 0.5, 5), 'line');
  }
  cast.add(block(D.wb + 16, 5, 6, 0.5), 'stone', xform([D.x, D.h + 3.5, face + 1.4]));
  fine.add(block(D.wb + 10, 2.6, 0.8, 0.3), 'gold', xform([D.x, D.h + 8.4, face + 0.2]));
  for (let k = -3; k <= 3; k++) fine.add(block(3.2, 4.6, 0.7, 0.4), k % 2 ? 'umber' : 'gold', xform([D.x + k * 5, D.h + 12.6, face + 0.1]));
  // The colossi share one long plinth before the front.
  cast.add(block(W - 2, 4, 26, 0.6), 'stone', xform([cx, -1, F.z + 12]));
}

// The terraces on the massif's steps: a deck of dressed stone with a lip of gold at its edge, and each hangar mouth a
// portal of dressed stone set into the rock, its door lit within.
function terraces(cast: Kit, fine: Kit, lamps: Lamp[]): void {
  for (const t of TERRACES) {
    const w = t.x1 - t.x0, dz = t.z1 - t.z0, cx = (t.x0 + t.x1) / 2;
    cast.add(block(w, 3, dz, 0.5), 'stone', xform([cx, t.y - 1.3, (t.z0 + t.z1) / 2]));
    fine.add(rod(V(t.x0 + 1, t.y + 0.3, t.z1 + 0.2), V(t.x1 - 1, t.y + 0.3, t.z1 + 0.2), 0.55, 6), 'gold');
    for (const [bx, wb, wt, h] of t.bays) {
      cast.add(block(wb + 9, h + 7, 6, 0.6), 'stone', xform([bx, t.y + (h + 7) / 2, t.z0 - 1]));
      fine.add(trapezoid(wb, wt, h), 'door', xform(V(bx, t.y + 0.2, t.z0 + 2.06)));
      fine.add(block(wb + 6, 1.2, 0.6, 0.2), 'gold', xform([bx, t.y + h + 2.4, t.z0 + 2.1]));
      lamps.push({ at: V(bx, t.y + h + 5.6, t.z0 + 2.6), size: 1.4, heat: 0.8, k: 1.0, does: 'steady', phase: 0 });
    }
  }
  // The barque's berth on the summit: two saddles of dressed stone it lies on, capped in gold.
  for (const s of [-1, 1]) {
    const x = BARQUE.at[0] + s * 22, z = BARQUE.at[2];
    cast.add(battered(10, 17, 8, 15, 12, 1.2), 'stone', xform([x, MASSIF.top - 6, z]));
    fine.add(block(8.4, 0.9, 15.4, 0.2), 'gold', xform([x, MASSIF.top + 7.4, z]));
  }
  const top = MASSIF.top - 2, B = BEACON;
  cast.add(battered(B.foot * 1.9, B.foot * 1.9, B.foot * 1.5, B.foot * 1.5, 5, 1.2), 'stone', xform([B.x, top - 1, B.z]));
  cast.add(battered(B.foot, B.foot, B.foot * 0.6, B.foot * 0.6, B.tall), 'iron', xform([B.x, top + 4.6, B.z]));
  cast.add(turned([[B.foot * 0.6 * 0.72, 0], [0.01, B.foot * 0.85]], 4), 'gold', xform([B.x, top + 4.6 + B.tall, B.z], Math.PI / 4));
  fine.add(rod(V(B.x, top + 8, B.z + B.foot / 2 + 0.06), V(B.x, top + B.tall, B.z + B.foot * 0.3 + 0.06), 0.35, 4), 'line');
  lamps.push({ at: V(B.x, top + 4.6 + B.tall + B.foot * 0.85 + 1, B.z), size: 2.4, heat: 0.95, k: 1.6, does: 'breath', phase: 0.4 });
}

// A colossus seated on its throne, facing the way the gate does, as the old colossi were: one mass of dark bronze worn
// smooth, its form given by its outline and not by parts, its headcloth flaring in gold stripes. The body and the
// headcloth are each one loft through sections up the figure.
function colossus(cast: Kit, fine: Kit, x: number, z: number, tall: number): void {
  const u = tall / 52, at = (px: number, py: number, pz: number) => V(x + px * u, py * u, z + pz * u);
  const b = (w: number, h: number, d: number, px: number, py: number, pz: number, kind: 'umber' | 'gold' | 'stone' | 'iron', k: Kit = cast, r = 1.2) =>
    k.add(rbox(w * u, h * u, d * u, r * u, 3), kind, xform(at(px, py + h / 2, pz)));
  const sec = (y: number, rx: number, rz: number, oz: number, n = 3.2): Section => ({ y: y * u, rx: rx * u, rz: rz * u, oz: oz * u, n });
  // The plinth, stepped, and the throne: a block with a high back, its side panel framed in gold.
  b(28, 3, 32, 0, -3, -1, 'stone', cast, 0.5);
  b(25, 3, 29, 0, 0, -1, 'stone', cast, 0.5);
  b(21, 15, 20, 0, 3, -4, 'iron', cast, 1.0);
  b(21, 30, 5, 0, 3, -14.5, 'iron', cast, 1.0);
  for (const s of [-1, 1]) b(0.6, 10, 15, s * 10.6, 5.5, -4, 'gold', fine, 0.3);
  // The body: feet and shins together at the front, the lap, the waist, the chest broad at the shoulders, the neck.
  const body: Section[] = [
    sec(3, 8, 5.5, 8.5, 4), sec(5.5, 7.6, 4.2, 8.4, 4), sec(14, 7.8, 4.4, 7.4, 4), sec(17.5, 8.4, 9.6, 2.4, 3.6), sec(20.5, 7.6, 7.6, -1.6, 3),
    sec(24, 6.6, 4.8, -4.2), sec(30, 7.8, 4.8, -4.2), sec(33.5, 8.8, 4.6, -4.2), sec(35.6, 8.4, 4.2, -4.2), sec(36.4, 3.2, 3.2, -3.6, 2.4),
  ];
  cast.add(loft(body, 28, { cap: true }), 'umber', xform(at(0, 0, 0)));
  // The forearms lying along the thighs, the hands flat on the knees.
  for (const s of [-1, 1]) {
    fine.add(rod(at(s * 7.3, 26, -4.4), at(s * 6.6, 20.6, 7.8), 1.9 * u, 10, 1.6 * u), 'umber');
    b(3.8, 1.4, 4.2, s * 6.4, 19.6, 9.0, 'umber', fine, 0.6);
  }
  // The head, the headcloth over it flaring to the shoulders behind and its lappets down over the chest, the band of
  // gold across the brow, the cobra, the beard.
  cast.add(loft([sec(36.2, 3.2, 3.6, -3.2, 2.6), sec(38.5, 3.9, 4.4, -3.0, 2.6), sec(43.5, 4.1, 4.6, -3.0, 2.6), sec(46.8, 3.6, 4.2, -3.4, 2.4), sec(48.0, 2.2, 2.8, -3.6, 2)], 20, { cap: true }), 'umber', xform(at(0, 0, 0)));
  const cloth: Section[] = [sec(30.5, 9.0, 2.4, -6.6, 3), sec(34.5, 9.6, 3.6, -6.4, 3.4), sec(37.5, 7.4, 5.0, -5.0, 3.2), sec(44, 5.1, 5.2, -3.6, 2.8), sec(47.8, 4.4, 4.7, -3.5, 2.6), sec(49.4, 2.8, 3.4, -3.8, 2.2)];
  cast.add(loft(cloth, 28, { cap: true }), 'gold', xform(at(0, 0, 0)), 1);
  for (const s of [-1, 1]) fine.add(rbox(3.2 * u, 9.4 * u, 1.6 * u, 0.8 * u, 3), 'gold', xform(at(s * 5.6, 33.2, 0.2), 0, 1, 0, -0.06), 1);
  b(8.6, 1.4, 1.2, 0, 46.3, 1.0, 'gold', fine, 0.5);
  b(1.3, 2.6, 1.2, 0, 47.4, 1.5, 'gold', fine, 0.5);
  fine.add(rod(at(0, 36.4, 1.1), at(0, 33.2, 1.5), 0.7 * u, 8, 0.5 * u), 'umber');
}

// The harbour: quays of battered stone round a basin of light, a broad quay at its back, copings of gold, a hangar
// mouth in its front wall, and stout obelisks at its corners for beacons.
function harbour(cast: Kit, fine: Kit, lamps: Lamp[]): void {
  const Hb = HARBOUR, H = Hb.wall + SINK, lean = 0.1;
  const wall = (x0: number, x1: number, z0: number, z1: number) => {
    const w = x1 - x0, d = z1 - z0;
    cast.add(battered(w + 2 * lean * H, d + 2 * lean * H, w, d, H, 1.4), 'stone', xform([(x0 + x1) / 2, -SINK, (z0 + z1) / 2]));
    fine.add(battered(w + 0.6, d + 0.6, w + 0.5, d + 0.5, 0.9), 'gold', xform([(x0 + x1) / 2, Hb.wall - 1.8, (z0 + z1) / 2]));
  };
  wall(Hb.x0, Hb.x1, Hb.z1 - Hb.quay, Hb.z1);
  wall(Hb.x0, Hb.x1, Hb.z0, Hb.z0 + Hb.back);
  wall(Hb.x1 - Hb.quay, Hb.x1, Hb.z0 + Hb.back - 0.5, Hb.z1 - Hb.quay + 0.5);
  // The basin, its floor a sheet of the light it holds.
  const bx = Hb.x1 - Hb.quay - Hb.x0, bz = Hb.z1 - Hb.quay - (Hb.z0 + Hb.back);
  const pool = new THREE.PlaneGeometry(bx + 2, bz + 2).rotateX(-Math.PI / 2);
  fine.add(pool, 'pool', xform([Hb.x0 + bx / 2, Hb.pool, Hb.z0 + Hb.back + bz / 2]));
  cast.add(block(bx + 2, Hb.pool + SINK, bz + 2, 0.2), 'dark', xform([Hb.x0 + bx / 2, (Hb.pool - SINK) / 2 - 0.05, Hb.z0 + Hb.back + bz / 2]));
  bay(fine, cast, (Hb.x0 + Hb.x1) / 2 + 12, Hb.z1 + lean * Hb.wall, lean, 13, 9, 10);
  for (const [x, z, f, h] of OBELISKS) {
    cast.add(battered(f * 1.7, f * 1.7, f * 1.5, f * 1.5, 2.4, 0.6), 'stone', xform([x, Hb.wall, z]));
    cast.add(battered(f, f, f * 0.62, f * 0.62, h), 'iron', xform([x, Hb.wall + 3, z]));
    cast.add(turned([[f * 0.62 * 0.72, 0], [0.01, f * 0.9]], 4), 'gold', xform([x, Hb.wall + 3 + h, z], Math.PI / 4));
    fine.add(rod(V(x, Hb.wall + 6, z + f / 2 + 0.06), V(x, Hb.wall + 3 + h - 3, z + f * 0.31 + 0.06), 0.28, 4), 'line');
    lamps.push({ at: V(x, Hb.wall + 3 + h + f * 0.9 + 0.8, z), size: 2.0, heat: 0.9, k: 1.4, does: 'blink', phase: x * 0.013 + z * 0.007 });
  }
}

// The forecourt's paving, built flat on the map and bent over the world: its shader reads its slabs from the map's own
// coordinates, which it carries as its uv.
function paving(kit: Kit): void {
  const A = PAVE, nr = 30, na = 40, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= nr; i++) for (let j = 0; j <= na; j++) {
    const r = A.r0 + ((A.r1 - A.r0) * i) / nr, a = (A.from + ((A.to - A.from) * j) / na) * (Math.PI / 180), x = r * Math.sin(a), z = r * Math.cos(a);
    pos.push(x, 0.5, z);
    uv.push(x, z);
  }
  for (let i = 0; i < nr; i++) for (let j = 0; j < na; j++) { const a = i * (na + 1) + j; idx.push(a, a + na + 1, a + 1, a + 1, a + na + 1, a + na + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  kit.add(bend(g), 'paving');
}

export function buildPort(): PortModel {
  const cast = new Kit(), fine = new Kit(), paved = new Kit(), rock = new Kit(), lamps: Lamp[] = [];
  massif(rock);
  facade(cast, fine);
  terraces(cast, fine, lamps);
  for (const x of COLOSSI.x) colossus(cast, fine, x, COLOSSI.z, COLOSSI.tall);
  harbour(cast, fine, lamps);
  paving(paved);
  return { cast, fine, rock, lamps, paving: paved };
}
