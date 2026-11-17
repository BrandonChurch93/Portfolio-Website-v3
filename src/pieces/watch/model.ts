import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder, lathe, pause, rbox, slice, xf, type Vec3 } from '../../world/build';
import { cartoucheArt, watchArt } from './art';
import { bar, cut, disc, fieldSlab, flat, meet, shapes, teeth, union, wheel, type Field } from './geom';
import {
  BACK, BALANCE, BARREL, BODY, BOW, BRIDGES, BRIDGE_TOP, CARTOUCHE, CASE, CHAIN, CHAPTER, COCK, CROWN, DIAL, DIAL_FACE, HANDS, HINGE, JEWELS,
  MOV, NUMERALS, PALLET, PENDANT, PLATE, RATCHET, SECONDS, SPRING, TBAR, TRAIN, type P2,
} from './layout';
import { FIN, depthMaterial, glassMaterial, shared, watchMaterial, type Fin, type Shared } from './shading';

// The opened watch, in millimetres under a root scaled by 0.001. Every part is merged by material with the others and
// carries its own number, so the shaders can move it alone: the wheels turn, the balance swings, the hands go round.

export type Kind = 'back' | 'plate' | 'wheel' | 'bridge' | 'fork' | 'balance' | 'cock' | 'hinge' | 'body' | 'dial' | 'numeral' | 'hand' | 'crystal' | 'crown' | 'chain';
// What a part does when the watch runs: turns with the train, rocks, swings, or goes round as a hand.
export type Role = 'barrel' | 'center' | 'third' | 'fourth' | 'escape' | 'fork' | 'balance' | 'hour' | 'minute' | 'second';
export interface PartDef {
  kind: Kind;
  side: 'mov' | 'dial' | 'both';
  c: Vec3;
  r: number;
  role?: Role;
  // Where it turns, in the table's (x, z).
  axis?: P2;
  // The run of parts it comes home with as one shard, in order.
  row?: string;
  // Which numeral it is, for the light that runs round the dial.
  hour?: number;
  lo: Vec3;
  hi: Vec3;
}

export interface WatchModel {
  root: THREE.Group;
  parts: PartDef[];
  u: Shared;
  meshes: THREE.Mesh[];
  shadow: THREE.Mesh;
  tris: number;
  // Triangles by kind of part, for the budget.
  spend: Record<string, number>;
  // The rest phases of the train, so the teeth mesh.
  phase: Record<string, number>;
}

const M = (p: P2): P2 => [p[0] + MOV.x, p[1] + MOV.z];
const D = (p: P2): P2 => [p[0] + DIAL.x, p[1] + DIAL.z];
const ang = (a: P2, b: P2) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const ringPts = (cx: number, cz: number, r: number, n = 96): P2[] => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cz + Math.sin((i / n) * Math.PI * 2) * r]);
const move = (l: P2[], dx: number, dz: number): P2[] => l.map(([x, z]) => [x + dx, z + dz]);

// A screw head standing on a face at y: a low dome with its slot, in polished dark steel.
function screwHead(r: number): { head: THREE.BufferGeometry; slot: THREE.BufferGeometry } {
  const h = r * 0.42, prof: [number, number][] = [[r, 0], [r, h * 0.35]];
  for (let i = 6; i >= 0; i--) { const x = (r * 0.92 * i) / 6; prof.push([x, h * 0.35 + h * 0.65 * Math.sqrt(Math.max(0, 1 - (x / (r * 0.95)) ** 2))]); }
  const head = lathe(prof, 28);
  const slot = new THREE.BoxGeometry(r * 1.85, h * 0.5, r * 0.26);
  slot.translate(0, h * 0.82, 0);
  return { head, slot };
}

// A rod bent along a path, as a tube.
function tube(pts: Vec3[], r: number, segs: number, radial = 10, closed = false): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed, 'centripetal');
  return new THREE.TubeGeometry(curve, segs, r, radial, closed);
}

export async function buildWatch(): Promise<WatchModel> {
  const root = new THREE.Group();
  root.scale.setScalar(0.001);
  const art = watchArt();
  const u = shared(art, cartoucheArt());
  await pause();

  const metalM = watchMaterial(new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3 }), u, 'watch-metal');
  metalM.name = 'watchMetal';
  metalM.envMapIntensity = 0.55;
  // Turns on three.js's anisotropic highlight. Its direction and strength are set per pixel (GRAIN in ./shading.ts).
  metalM.anisotropy = 1;
  const glassM = glassMaterial(new THREE.MeshPhysicalMaterial({ color: 0x050403, metalness: 0, roughness: 0.03, specularIntensity: 1, ior: 1.5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), u);
  glassM.name = 'watchGlass';

  const b = new Builder();
  const parts: PartDef[] = [];
  const spend: Record<string, number> = {};
  const part = (d: Omit<PartDef, 'lo' | 'hi'>) => { parts.push({ ...d, lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] }); return parts.length - 1; };
  const add = (i: number, fin: Fin, geo: THREE.BufferGeometry, m?: THREE.Matrix4, s?: Float32Array, mat: THREE.Material = metalM) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (m) g.applyMatrix4(m);
    g.computeBoundingBox();
    const bb = g.boundingBox!, pd = parts[i];
    for (let k = 0; k < 3; k++) { pd.lo[k] = Math.min(pd.lo[k], bb.min.getComponent(k)); pd.hi[k] = Math.max(pd.hi[k], bb.max.getComponent(k)); }
    const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
    spend[pd.kind] = (spend[pd.kind] ?? 0) + n / 3;
    for (let k = 0; k < n; k++) { cell[k * 4] = fin; cell[k * 4 + 1] = s ? s[k] : 0; cell[k * 4 + 3] = i; }
    g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    b.add(g, mat, undefined, mat === glassM ? { shadow: false } : {});
  };
  const at = (x: number, y: number, z: number, r?: Vec3) => xf({ p: [x, y, z], r });
  const screws = (i: number, list: P2[], y: number, r = 0.85, turn = 0) => {
    const { head, slot } = screwHead(r);
    list.forEach(([x, z], k) => {
      add(i, FIN.steel, head.clone(), at(x, y, z));
      add(i, FIN.dark, slot.clone(), at(x, y, z, [0, turn + k * 1.1 + 0.4, 0]));
    });
  };
  // A jewel in its gold chaton, held by two screws.
  const jewel = (i: number, c: P2, y: number, r: number, turn: number, held = true) => {
    const ch = lathe([[r, 0], [r, 0.12], [r - 0.04, 0.24], [r - 0.18, 0.3], [0.62 * r / 1.5, 0.26], [0.62 * r / 1.5, 0]], 40);
    add(i, FIN.gold, ch, at(c[0], y, c[1]));
    const jr = 0.6 * r / 1.5;
    const stone = lathe([[jr, 0.2], [jr * 0.9, 0.3], [jr * 0.55, 0.36], [0.13, 0.38], [0.13, 0.3], [0, 0.3]], 28);
    add(i, FIN.jewel, stone, at(c[0], y, c[1]));
    if (held) for (const s of [-1, 1]) screws(i, [[c[0] + Math.cos(turn) * s * (r + 0.42), c[1] + Math.sin(turn) * s * (r + 0.42)]], y, 0.4, turn);
  };
  const plateClip = disc(MOV.x, MOV.z, PLATE.r - 0.35);

  // ---- the case back, with its flange and the hinge ------------------------------------------------------------
  const iBack = part({ kind: 'back', side: 'mov', c: [MOV.x, 3, MOV.z], r: CASE.r });
  {
    const outer: [number, number][] = [[0, 0], [8, 0.12], [14, 0.5], [18.5, 1.15], [21.6, 1.95], [23.6, 2.9], [24.7, 3.9], [25.1, 4.8], [CASE.r, 5.6], [25.05, 6.15], [24.65, 6.4]];
    add(iBack, FIN.bronze, lathe(outer, 128), at(MOV.x, 0, MOV.z));
    const inner: [number, number][] = [[24.65, 6.4], [24.15, 6.42], [BACK.lip, 6.22], [BACK.lip - 0.08, 5.6], [BACK.lip - 0.1, BACK.flangeY]];
    add(iBack, FIN.inner, lathe(inner, 128), at(MOV.x, 0, MOV.z));
    add(iBack, FIN.inner, flat(ringPts(MOV.x, MOV.z, BACK.flange[1], 160), [ringPts(MOV.x, MOV.z, BACK.flange[0], 160)], BACK.flangeY - 0.25, BACK.flangeY, 0.06), undefined);
  }
  const iHinge = part({ kind: 'hinge', side: 'both', c: [0, HINGE.y, 0], r: 7 });
  {
    const [z0, z1] = HINGE.z, n = HINGE.knuckles, len = (z1 - z0) / n;
    for (let k = 0; k < n; k++) {
      const k0 = z0 + k * len + 0.06, k1 = z0 + (k + 1) * len - 0.06;
      const knuckle = lathe([[0, 0], [HINGE.r - 0.25, 0], [HINGE.r, 0.22], [HINGE.r, k1 - k0 - 0.22], [HINGE.r - 0.25, k1 - k0], [0, k1 - k0]], 28);
      knuckle.rotateX(Math.PI / 2);
      add(iHinge, FIN.bronze, knuckle, at(0, HINGE.y, k0));
      const side = k % 2 ? 1 : -1;
      add(iHinge, FIN.bronze, rbox(2.6, 2.2, k1 - k0, 0.5, 2), at(side * 1.3, HINGE.y - 0.4, (k0 + k1) / 2));
    }
    const pin = new THREE.SphereGeometry(0.55, 16, 8);
    add(iHinge, FIN.copper, pin.clone(), at(0, HINGE.y, z0 - 0.05));
    add(iHinge, FIN.copper, pin, at(0, HINGE.y, z1 + 0.05));
  }
  await pause();

  // ---- the movement: the plate, the train, the bridges ---------------------------------------------------------
  const iPlate = part({ kind: 'plate', side: 'mov', c: [MOV.x, PLATE.y1, MOV.z], r: PLATE.r });
  add(iPlate, FIN.plate, flat(ringPts(MOV.x, MOV.z, PLATE.r, 180), [], PLATE.y0, PLATE.y1, 0.16));

  // The rest phases: each wheel has a tooth pointing at the pinion it drives, and each pinion a gap toward the wheel
  // that drives it, so the teeth mesh as drawn.
  const phase: Record<string, number> = {};
  const W = Object.fromEntries(TRAIN.map((w) => [w.name, w]));
  const order = ['barrel', 'center', 'third', 'fourth', 'escape'];
  const cOf = (n: string): P2 => (n === 'barrel' ? BARREL.c : W[n].c);
  for (let k = 0; k < order.length; k++) {
    const n = order[k];
    if (k + 1 < order.length) phase[`${n}:wheel`] = ang(cOf(n), cOf(order[k + 1]));
    if (k > 0) phase[`${n}:pinion`] = ang(cOf(n), cOf(order[k - 1])) + Math.PI / W[n].pz;
  }

  const iBarrel = part({ kind: 'wheel', side: 'mov', c: [M(BARREL.c)[0], 4, M(BARREL.c)[1]], r: 10, role: 'barrel', axis: M(BARREL.c), row: 'train' });
  {
    const [bx, bz] = M(BARREL.c);
    add(iBarrel, FIN.wheel, lathe([[0, BARREL.drum[0]], [9.7, BARREL.drum[0]], [9.7, BARREL.drum[1] - 0.12], [9.55, BARREL.drum[1]], [0, BARREL.drum[1]]], 120), at(bx, 0, bz));
    const g = flat(teeth(BARREL.z, BARREL.r, phase['barrel:wheel'], 'wheel'), [ringPts(0, 0, 9.5, 96)], BARREL.teeth[0], BARREL.teeth[1], 0);
    add(iBarrel, FIN.wheel, g, at(bx, 0, bz));
    // The ratchet on its arbor above the bridge, with its screw.
    add(iBarrel, FIN.sun, wheel({ z: RATCHET.z, r: RATCHET.r, phase: 0, kind: 'ratchet', y0: RATCHET.y[0], y1: RATCHET.y[1], bev: 0.08 }), at(bx, 0, bz));
    const big = screwHead(1.7);
    add(iBarrel, FIN.steel, big.head, at(bx, RATCHET.y[1], bz));
    for (let k = 0; k < 3; k++) {
      const s = big.slot.clone();
      s.scale(0.55, 1, 1);
      s.translate(0.95 * 0.55 * 1.7 * 0.5, 0, 0);
      add(iBarrel, FIN.dark, s, at(bx, RATCHET.y[1], bz, [0, (k * Math.PI * 2) / 3, 0]));
    }
  }
  const trainParts: Record<string, number> = {};
  for (const w of TRAIN) {
    await slice();
    const [cx, cz] = M(w.c);
    const i = part({ kind: 'wheel', side: 'mov', c: [cx, w.y[1], cz], r: w.r, role: w.name as Role, axis: [cx, cz], row: 'train' });
    trainParts[w.name] = i;
    const esc = w.name === 'escape';
    add(i, FIN.wheel, wheel({ z: w.z, r: w.r, phase: phase[`${w.name}:wheel`] ?? 0, kind: esc ? 'escape' : 'wheel', y0: w.y[0], y1: w.y[1], spokes: w.spokes, hub: w.hub, rim: esc ? w.r * 0.58 : w.r - Math.max(0.55, w.r * 0.12), w: esc ? 0.16 : Math.max(0.2, w.r * 0.045), curve: w.name === 'third' ? 0.35 : 0 }), at(cx, 0, cz));
    add(i, FIN.steel, flat(teeth(w.pz, w.pr, phase[`${w.name}:pinion`] ?? 0, 'pinion'), [], w.py[0], w.py[1], 0), at(cx, 0, cz));
    add(i, FIN.steel, lathe([[0, w.y[0] - 0.1], [0.42, w.y[0] - 0.1], [0.42, w.y[1] + 0.1], [0.32, w.y[1] + 0.25], [0, w.y[1] + 0.25]], 20), at(cx, 0, cz));
  }
  await pause();

  // The pallet fork: its arms reach to the escape wheel with a stone at each end, its stem to the balance's roller.
  const iFork = part({ kind: 'fork', side: 'mov', c: [M(PALLET.c)[0], 5.1, M(PALLET.c)[1]], r: 5, role: 'fork', axis: M(PALLET.c), row: 'train' });
  {
    const P = PALLET.c, E = W.escape.c, Bc = BALANCE.c;
    const toB = ang(P, Bc);
    const back = ang(E, P);
    const stones = [back + 0.62, back - 0.62].map((a): P2 => [E[0] + Math.cos(a) * (W.escape.r * 0.98), E[1] + Math.sin(a) * (W.escape.r * 0.98)]);
    const end: P2 = [P[0] + Math.cos(toB) * 6.3, P[1] + Math.sin(toB) * 6.3];
    const px = (a: number, l: number, s: number): P2 => [end[0] + Math.cos(toB) * l + Math.cos(a) * s, end[1] + Math.sin(toB) * l + Math.sin(a) * s];
    const perp = toB + Math.PI / 2;
    const fs: Field[] = [
      disc(P[0], P[1], 0.75),
      ...stones.map(([x, z]) => bar(P[0], P[1], x, z, 0.32)),
      bar(P[0], P[1], end[0], end[1], 0.26),
      bar(...px(perp, 0, 0.45), ...px(perp, 0.75, 0.45), 0.13),
      bar(...px(perp, 0, -0.45), ...px(perp, 0.75, -0.45), 0.13),
      bar(...px(perp, 0, -0.5), ...px(perp, 0, 0.5), 0.18),
    ];
    const box: [number, number, number, number] = [Math.min(P[0], E[0], end[0]) - 4, Math.min(P[1], E[1], end[1]) - 4, Math.max(P[0], E[0], end[0]) + 4, Math.max(P[1], E[1], end[1]) + 4];
    for (const g of fieldSlab(union(fs, 0.25), box, 0.03, 0.006, PALLET.y[0], PALLET.y[1], 0.04)) add(iFork, FIN.steel, g, at(MOV.x, 0, MOV.z));
    for (const [k, [x, z]] of stones.entries()) {
      const a = ang(E, [x, z]) + (k ? -0.2 : 0.2);
      add(iFork, FIN.jewel, rbox(0.42, 0.34, 0.9, 0.08, 1), at(x + MOV.x, (PALLET.y[0] + PALLET.y[1]) / 2, z + MOV.z, [0, -a, 0]));
    }
    add(iFork, FIN.steel, lathe([[0, 4.6], [0.3, 4.6], [0.3, 5.6], [0, 5.6]], 16), at(...[M(P)[0], 0, M(P)[1]] as Vec3));
  }

  // The bridges, with their screws and jewels.
  const bridgeParts: number[] = [];
  for (const [k, br] of BRIDGES.entries()) {
    await slice();
    const fs: Field[] = [
      ...br.discs.map(([x, z, r]) => disc(x + MOV.x, z + MOV.z, r)),
      ...br.bars.map(([ax, az, bx2, bz2, r]) => bar(ax + MOV.x, az + MOV.z, bx2 + MOV.x, bz2 + MOV.z, r)),
      ...(br.tapers ?? []).map(([ax, az, bx2, bz2, w0, w1]) => taper(ax + MOV.x, az + MOV.z, bx2 + MOV.x, bz2 + MOV.z, w0, w1)),
    ];
    let f = meet(union(fs, br.k), plateClip);
    for (const [x, z, r] of br.cuts ?? []) f = cut(f, disc(x + MOV.x, z + MOV.z, r));
    const xs = [...br.discs.map((d) => d[0]), ...br.bars.flatMap((b2) => [b2[0], b2[2]])], zs = [...br.discs.map((d) => d[1]), ...br.bars.flatMap((b2) => [b2[1], b2[3]])];
    const box: [number, number, number, number] = [Math.min(...xs) + MOV.x - 12, Math.min(...zs) + MOV.z - 12, Math.max(...xs) + MOV.x + 12, Math.max(...zs) + MOV.z + 12];
    const c = br.discs[0];
    const i = part({ kind: 'bridge', side: 'mov', c: [c[0] + MOV.x, BRIDGE_TOP, c[1] + MOV.z], r: 9, row: `bridge${k}` });
    bridgeParts.push(i);
    for (const g of fieldSlab(f, box, 0.09, 0.02, PLATE.y1, BRIDGE_TOP, 0.2)) add(i, FIN.bridge, g);
    screws(i, br.screws.map(M), BRIDGE_TOP, 0.9, k * 0.7);
    for (const j of JEWELS) {
      const on = (br.name === 'train' && ['center', 'third', 'fourth'].includes(j.of)) || (br.name === 'escape' && j.of === 'escape') || (br.name === 'pallet' && j.of === 'pallet');
      if (on) jewel(i, M(j.c), j.y, j.r, ang(j.c, [0, 0]) + Math.PI / 2 + k, br.name === 'train');
    }
    if (br.name === 'barrel') {
      // The click: a pawl in the ratchet's teeth and the spring that holds it there.
      const [bx, bz] = BARREL.c, a = -0.25;
      const pv: P2 = [bx + Math.cos(a) * 7.4, bz + Math.sin(a) * 7.4];
      const tip: P2 = [bx + Math.cos(a + 0.42) * (RATCHET.r - 0.15), bz + Math.sin(a + 0.42) * (RATCHET.r - 0.15)];
      const pawl = union([disc(pv[0], pv[1], 0.75), bar(pv[0], pv[1], tip[0], tip[1], 0.34)], 0.3);
      for (const g of fieldSlab(pawl, [pv[0] - 5, pv[1] - 5, pv[0] + 5, pv[1] + 5], 0.03, 0.006, BRIDGE_TOP, BRIDGE_TOP + 0.4, 0.05)) add(i, FIN.steel, g, at(MOV.x, 0, MOV.z));
      screws(i, [M(pv)], BRIDGE_TOP + 0.4, 0.55, 0.3);
      const spring: P2[] = [];
      for (let t = 0; t <= 1.0001; t += 0.1) { const aa = a - 0.15 - t * 0.9; spring.push([bx + Math.cos(aa) * (8.2 + 0.4 * t), bz + Math.sin(aa) * (8.2 + 0.4 * t)]); }
      const sf = union(spring.slice(1).map((p, k2) => bar(spring[k2][0], spring[k2][1], p[0], p[1], 0.16)));
      for (const g of fieldSlab(sf, [bx - 10, bz - 10, bx + 10, bz + 10], 0.03, 0.006, BRIDGE_TOP, BRIDGE_TOP + 0.3, 0.04)) add(i, FIN.steel, g, at(MOV.x, 0, MOV.z));
    }
  }
  await pause();

  // The balance: a split rim with its timing screws, two arms, the roller under it, and the hairspring over it.
  const [blx, blz] = M(BALANCE.c);
  const iBal = part({ kind: 'balance', side: 'mov', c: [blx, 6.2, blz], r: BALANCE.r, role: 'balance', axis: [blx, blz] });
  {
    const R = BALANCE.r, ri = R - BALANCE.rim, [y0, y1] = BALANCE.y;
    const rim = meet((x, z) => Math.max(Math.hypot(x, z) - R, ri - Math.hypot(x, z)), (x, z) => -Math.min(Math.abs(Math.atan2(z, x) - 1.75) * Math.hypot(x, z), Math.abs(Math.atan2(z, x) + 1.39) * Math.hypot(x, z)) + 0.06);
    const arms = union([bar(-ri - 0.2, 0, ri + 0.2, 0, 0.3), disc(0, 0, 0.85)], 0.35);
    for (const g of fieldSlab(rim, [-R - 0.5, -R - 0.5, R + 0.5, R + 0.5], 0.03, 0.012, y0, y1, 0.06)) add(iBal, FIN.wheel, g, at(blx, 0, blz));
    for (const g of fieldSlab(arms, [-R, -2, R, 2], 0.03, 0.005, y0 + 0.04, y1 - 0.1, 0.05)) add(iBal, FIN.wheel, g, at(blx, 0, blz));
    const screw = lathe([[0, 0], [0.24, 0], [0.24, 0.26], [0.3, 0.3], [0.3, 0.52], [0.24, 0.56], [0, 0.56]], 10);
    screw.rotateZ(-Math.PI / 2);
    for (let k = 0; k < BALANCE.screws; k++) {
      const a = (k / BALANCE.screws) * Math.PI * 2 + 0.17;
      if (Math.abs(Math.sin(a - 1.75)) < 0.08 || Math.abs(Math.sin(a + 1.39)) < 0.08) continue;
      add(iBal, k % 4 === 0 ? FIN.copper : FIN.gold, screw.clone(), xf({ p: [blx + Math.cos(a) * (R - 0.05), (y0 + y1) / 2, blz + Math.sin(a) * (R - 0.05)], r: [0, -a, 0] }));
    }
    add(iBal, FIN.steel, lathe([[0, 4.8], [0.2, 4.8], [0.3, 5.0], [0.28, 6.4], [0.22, 7.05], [0, 7.05]], 18), at(blx, 0, blz));
    add(iBal, FIN.steel, flat(ringPts(0, 0, 1.15, 48), [], 5.2, 5.38, 0.04), at(blx, 0, blz));
    const toFork = ang(BALANCE.c, PALLET.c);
    add(iBal, FIN.jewel, new THREE.CylinderGeometry(0.16, 0.16, 0.5, 10), at(blx + Math.cos(toFork) * 0.85, 5.1, blz + Math.sin(toFork) * 0.85));
    add(iBal, FIN.gold, flat(ringPts(0, 0, 0.62, 32), [], 6.4, 6.62, 0.04), at(blx, 0, blz));
  }
  const iSpring = part({ kind: 'balance', side: 'mov', c: [blx, 6.6, blz], r: SPRING.r1 });
  {
    const n = SPRING.turns * 72, [y0, y1] = SPRING.y, w = SPRING.w;
    const pos: number[] = [], nrm: number[] = [], ss: number[] = [];
    const pt = (t: number) => { const a = t * SPRING.turns * Math.PI * 2 + 0.3; const r = SPRING.r0 + (SPRING.r1 - SPRING.r0) * t; return [Math.cos(a) * r, Math.sin(a) * r, a] as const; };
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      const [x0, z0, a0] = pt(t0), [x1, z1, a1] = pt(t1);
      const n0: P2 = [Math.cos(a0), Math.sin(a0)], n1: P2 = [Math.cos(a1), Math.sin(a1)];
      const quad = (p: number[][], nn: number[][], s: number[]) => {
        for (const ix of [0, 1, 2, 0, 2, 3]) { pos.push(...p[ix]); nrm.push(...nn[ix]); ss.push(s[ix]); }
      };
      const o0 = [x0 + n0[0] * w, z0 + n0[1] * w], o1 = [x1 + n1[0] * w, z1 + n1[1] * w];
      const i0 = [x0 - n0[0] * w, z0 - n0[1] * w], i1 = [x1 - n1[0] * w, z1 - n1[1] * w];
      quad([[o0[0], y0, o0[1]], [o1[0], y0, o1[1]], [o1[0], y1, o1[1]], [o0[0], y1, o0[1]]], [[n0[0], 0, n0[1]], [n1[0], 0, n1[1]], [n1[0], 0, n1[1]], [n0[0], 0, n0[1]]], [t0, t1, t1, t0]);
      quad([[i1[0], y0, i1[1]], [i0[0], y0, i0[1]], [i0[0], y1, i0[1]], [i1[0], y1, i1[1]]], [[-n1[0], 0, -n1[1]], [-n0[0], 0, -n0[1]], [-n0[0], 0, -n0[1]], [-n1[0], 0, -n1[1]]], [t1, t0, t0, t1]);
      quad([[o0[0], y1, o0[1]], [o1[0], y1, o1[1]], [i1[0], y1, i1[1]], [i0[0], y1, i0[1]]], [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]], [t0, t1, t1, t0]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos.map((v, k) => (k % 3 === 0 ? v + blx : k % 3 === 2 ? v + blz : v)), 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    add(iSpring, FIN.spring, g, undefined, new Float32Array(ss));
    add(iSpring, FIN.gold, lathe([[0.32, y0], [0.68, y0], [0.68, y1], [0.32, y1]], 24), at(blx, 0, blz));
    const [ex, ez] = pt(1);
    add(iSpring, FIN.steel, rbox(0.8, 0.5, 0.6, 0.12, 1), at(blx + ex * 1.12, (y0 + y1) / 2 + 0.15, blz + ez * 1.12, [0, -Math.atan2(ez, ex), 0]));
  }
  await pause();

  // The balance cock: its foot on the plate, a neck that rises over the balance, the table engraved, the endstone,
  // and the regulator's index lying over the table.
  const iCock = part({ kind: 'cock', side: 'mov', c: [blx, COCK.y0 + COCK.t, blz], r: 8 });
  {
    const [kx, kz] = BALANCE.c, [fx, fz] = COCK.foot;
    const len = Math.hypot(fx - kx, fz - kz), ux = (fx - kx) / len, uz = (fz - kz) / len;
    const top = COCK.y0 + COCK.t, S = COCK.step;
    const along = (x: number, z: number) => (x - kx) * ux + (z - kz) * uz;
    // The table and its neck stand at the table's height; past the step the foot sits on the plate at the bridges'
    // height, and a wall under the end of the neck carries the one down to the other, so the step is cut and not a
    // ramp.
    const shape = meet(union([disc(kx, kz, COCK.table), taper(kx, kz, fx, fz, 2.05, 1.3), disc(fx, fz, COCK.pad)], 0.8), disc(0, 0, PLATE.r - 0.35));
    const box: [number, number, number, number] = [Math.min(kx, fx) - 7, Math.min(kz, fz) - 7, Math.max(kx, fx) + 7, Math.max(kz, fz) + 7];
    const table = meet(shape, (x, z) => along(x, z) - S);
    const foot = meet(shape, (x, z) => S - along(x, z));
    const wall = meet(shape, (x, z) => Math.abs(along(x, z) - (S - 0.3)) - 0.3);
    for (const g of fieldSlab(table, box, 0.07, 0.01, COCK.y0, top, 0.16)) add(iCock, FIN.bridge, g, at(MOV.x, 0, MOV.z));
    for (const g of fieldSlab(wall, box, 0.07, 0.01, BRIDGE_TOP - 0.1, COCK.y0 + 0.02, 0.04)) add(iCock, FIN.bridge, g, at(MOV.x, 0, MOV.z));
    for (const g of fieldSlab(foot, box, 0.07, 0.01, PLATE.y1, BRIDGE_TOP, 0.16)) add(iCock, FIN.bridge, g, at(MOV.x, 0, MOV.z));
    screws(iCock, [M([fx + uz * 1.15, fz - ux * 1.15]), M([fx - uz * 1.15, fz + ux * 1.15])], BRIDGE_TOP, 0.7, 1.2);
    jewel(iCock, [blx, blz], top, 1.45, Math.atan2(uz, ux) + Math.PI / 2);
    // The regulator: a ring round the endstone and an index pointing over the scale.
    const away = Math.atan2(uz, ux) + Math.PI + 0.06;
    const idx = union([
      (x, z) => Math.abs(Math.hypot(x, z) - COCK.ring) - 0.2,
      bar(Math.cos(away) * COCK.ring, Math.sin(away) * COCK.ring, Math.cos(away) * 3.9, Math.sin(away) * 3.9, 0.19),
      bar(Math.cos(away) * 3.6, Math.sin(away) * 3.6, Math.cos(away) * 4.6, Math.sin(away) * 4.6, 0.06),
      bar(-Math.cos(away) * COCK.ring, -Math.sin(away) * COCK.ring, -Math.cos(away) * 2.6, -Math.sin(away) * 2.6, 0.28),
    ], 0.2);
    for (const g of fieldSlab(idx, [-5, -5, 5, 5], 0.025, 0.005, top, top + 0.16, 0.04)) add(iCock, FIN.steel, g, at(blx, 0, blz));
  }
  await pause();

  // ---- the body, the dial and its hands --------------------------------------------------------------------------
  const [dx, dz] = D([0, 0]);
  const iBody = part({ kind: 'body', side: 'dial', c: [dx, 5, dz], r: CASE.r });
  {
    const outer: [number, number][] = [[0, 0], [8, 0.12], [14, 0.5], [18.5, 1.15], [21.6, 1.95], [23.6, 2.9], [24.7, 3.9], [25.1, 4.8], [CASE.r, 5.8], [CASE.r, 7.7], [25.05, BODY.band]];
    add(iBody, FIN.bronze, lathe(outer, 128), at(dx, 0, dz));
    // The bezel: a coin edge milled round its side, a polished lip over the crystal's edge.
    const [b0, b1] = BODY.bezel;
    const lip: [number, number][] = [[25.42, b1 - 0.62], [25.1, b1 - 0.2], [24.4, b1], [23.3, b1 - 0.02], [BODY.open + 0.05, b1 - 0.25], [BODY.open, b1 - 0.5], [BODY.open, DIAL_FACE.y]];
    add(iBody, FIN.copper, lathe(lip, 200), at(dx, 0, dz));
    add(iBody, FIN.copper, lathe([[25.05, BODY.band], [25.3, b0 + 0.05], [25.45, b0 + 0.2]], 200), at(dx, 0, dz));
    const ridges = 150, seg = ridges * 4, rows: [number, number][] = [[25.45, b0 + 0.2], [25.62, b0 + 0.45], [25.62, b1 - 0.85], [25.42, b1 - 0.62]];
    const pos: number[] = [];
    const rAt = (a: number, base: number, k: number) => base - k * 0.17 * (1 - Math.abs(Math.cos((a * ridges) / 2))) ** 0.6;
    const pt = (j: number, i: number) => {
      const a = (i / seg) * Math.PI * 2, [r0, y] = rows[j], k = j === 1 || j === 2 ? 1 : 0.3;
      const r = rAt(a, r0, k);
      return [Math.cos(a) * r + dx, y, Math.sin(a) * r + dz];
    };
    for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < seg; i++) {
      const a0 = pt(j, i), a1 = pt(j, i + 1), b2 = pt(j + 1, i), b3 = pt(j + 1, i + 1);
      pos.push(...a0, ...b2, ...a1, ...a1, ...b2, ...b3);
    }
    const knurl = new THREE.BufferGeometry();
    knurl.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    knurl.computeVertexNormals();
    add(iBody, FIN.copper, toCreasedNormals(knurl, (70 * Math.PI) / 180));
  }
  const iDial = part({ kind: 'dial', side: 'dial', c: [dx, DIAL_FACE.y, dz], r: DIAL_FACE.r });
  {
    const [sx, sz] = D(SECONDS.c);
    add(iDial, FIN.dial, flat(ringPts(dx, dz, DIAL_FACE.r, 200), [ringPts(sx, sz, SECONDS.r, 96)], DIAL_FACE.y - 0.5, DIAL_FACE.y, 0.03));
    add(iDial, FIN.sub, flat(ringPts(sx, sz, SECONDS.r + 0.05, 96), [], DIAL_FACE.y - 0.6, DIAL_FACE.y - SECONDS.sink, 0.02));
    add(iDial, FIN.chapter, flat(ringPts(dx, dz, CHAPTER.r[1], 200), [ringPts(dx, dz, CHAPTER.r[0], 200)], CHAPTER.y[0], CHAPTER.y[1], 0.07));
    const cw = CARTOUCHE.w / 2, cd = CARTOUCHE.d / 2, [cx, cz] = D(CARTOUCHE.c);
    const plaque = (x: number, z: number) => { const qx = Math.abs(x - cx) - (cw - 1.0), qz = Math.abs(z - cz) - (cd - 1.0); return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - 1.0; };
    for (const g of fieldSlab(plaque, [cx - cw - 1, cz - cd - 1, cx + cw + 1, cz + cd + 1], 0.05, 0.008, CARTOUCHE.y[0], CARTOUCHE.y[1], 0.06)) add(iDial, FIN.plaque, g);
  }
  // The numerals, each applied in relief, its foot toward the middle.
  const GLYPHS = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let hr = 0; hr < 12; hr++) {
    await slice();
    const a = (hr / 12) * Math.PI * 2, d: P2 = [Math.sin(a), -Math.cos(a)], U: P2 = [-d[1], d[0]];
    const i = part({ kind: 'numeral', side: 'dial', c: [dx + d[0] * (NUMERALS.r0 + 1.6), NUMERALS.y[1], dz + d[1] * (NUMERALS.r0 + 1.6)], r: 2.4, row: 'numerals', hour: hr });
    const f = glyph(GLYPHS[hr]);
    const w = f.width;
    const map = (l: P2[]): P2[] => l.map(([uu, vv]) => [dx + uu * U[0] + (NUMERALS.r0 + vv) * d[0], dz + uu * U[1] + (NUMERALS.r0 + vv) * d[1]]);
    for (const { field, drop } of f.fields) for (const s of shapes(field, [-w / 2 - 0.6, -0.5, w / 2 + 0.6, NUMERALS.h + 0.5], 0.022, 0.009)) {
      add(i, FIN.numeral, flat(map(s.outer), s.holes.map(map), NUMERALS.y[0], NUMERALS.y[1] - drop, 0.028));
    }
  }
  await pause();

  // The hands: Breguet's, with the open moon near the tip, in dark steel with polished edges.
  const handOf = (L: number, moon: number, ro: number, ri: number, w: number): Field => union([
    disc(0, 0, HANDS.hub), bar(0, 0, 0, -(L * moon - ro), w), (x, z) => Math.max(Math.hypot(x, z + L * moon) - ro, ri - Math.hypot(x, z + L * moon + 0.12)),
    taper(0, -L * moon - ro + 0.2, 0, -L, w * 1.05, 0.03), bar(0, 0, 0, 2.2, w * 1.25),
  ], 0.18);
  const hands: [Role, number, Field, number][] = [
    ['hour', HANDS.y[0], handOf(HANDS.hour, 0.66, 1.35, 0.78, 0.3), 0],
    ['minute', HANDS.y[1], handOf(HANDS.minute, 0.74, 1.0, 0.58, 0.24), 0],
    ['second', HANDS.y[2], union([disc(0, 0, 0.42), bar(0, 1.25, 0, -HANDS.second, 0.07), disc(0, 1.3, 0.38)], 0.1), 0],
  ];
  for (const [role, y, f] of hands) {
    await slice();
    const sec = role === 'second';
    const [cx, cz] = sec ? D(SECONDS.c) : [dx, dz];
    const L = sec ? HANDS.second : role === 'hour' ? HANDS.hour : HANDS.minute;
    const i = part({ kind: 'hand', side: 'dial', c: [cx, y, cz - L * 0.4], r: L * 0.6, role, axis: [cx, cz] });
    for (const g of fieldSlab(f, [-2, -L - 1, 2, 3], sec ? 0.012 : 0.025, 0.004, y, y + (sec ? 0.08 : 0.1), 0.03)) add(i, FIN.hand, g, at(cx, 0, cz));
    add(i, sec ? FIN.hand : FIN.steel, lathe([[0.45, 0], [0.42, 0.1], [0.3, 0.17], [0, 0.18]], 20), at(cx, y + 0.08, cz));
  }
  const iCrystal = part({ kind: 'crystal', side: 'dial', c: [dx, BODY.crystal, dz], r: BODY.open });
  {
    const h = BODY.crystal - (BODY.bezel[1] - 0.2), R0 = BODY.open + 0.1, Rs = (R0 * R0 + h * h) / (2 * h);
    const prof: [number, number][] = [];
    for (let k = 0; k <= 14; k++) { const r = R0 * (1 - (k / 14) ** 0.8); prof.push([r, BODY.crystal - Rs + Math.sqrt(Rs * Rs - r * r)]); }
    add(iCrystal, FIN.steel, lathe(prof, 128), at(dx, 0, dz), undefined, glassM);
  }
  await pause();

  // The pendant and the fluted crown at twelve, the bow through them, and a short chain off the bow.
  const iCrown = part({ kind: 'crown', side: 'dial', c: [dx, PENDANT.y, dz - 30], r: 9, row: 'chain' });
  let bowEnd: Vec3 = [dx, 1.4, dz - 41];
  {
    const neck = lathe([[0, PENDANT.from - 0.6], [PENDANT.r + 0.35, PENDANT.from - 0.6], [PENDANT.r + 0.35, PENDANT.from + 0.4], [PENDANT.r, PENDANT.from + 0.6], [PENDANT.r, PENDANT.to - 0.5], [PENDANT.r + 0.45, PENDANT.to - 0.3], [PENDANT.r + 0.45, PENDANT.to], [0, PENDANT.to]], 32);
    neck.rotateX(-Math.PI / 2);
    add(iCrown, FIN.copper, neck, at(dx, PENDANT.y, dz));
    const crown = new THREE.BufferGeometry();
    {
      const segs = CROWN.flutes * 6, z0 = PENDANT.to, rows: [number, number][] = [[0, 0], [CROWN.r * 0.7, 0], [CROWN.r * 0.96, 0.25], [CROWN.r, 0.6], [CROWN.r, CROWN.len - 0.7], [CROWN.r * 0.95, CROWN.len - 0.3], [CROWN.r * 0.7, CROWN.len], [0, CROWN.len]];
      const pos: number[] = [];
      const p = (j: number, i: number) => {
        const a = (i / segs) * Math.PI * 2, [r0, l] = rows[j];
        const fl = j >= 2 && j <= 5 ? 1 - 0.09 * Math.max(0, Math.cos(a * CROWN.flutes)) ** 3 : 1;
        return [Math.cos(a) * r0 * fl, Math.sin(a) * r0 * fl, -(z0 + l)];
      };
      for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < segs; i++) {
        const a0 = p(j, i), a1 = p(j, i + 1), b0 = p(j + 1, i), b1 = p(j + 1, i + 1);
        pos.push(...a0, ...b0, ...a1, ...a1, ...b0, ...b1);
      }
      crown.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      crown.computeVertexNormals();
    }
    add(iCrown, FIN.copper, toCreasedNormals(crown, (50 * Math.PI) / 180), at(dx, PENDANT.y, dz));
    // The bow: it pivots on a pin through a boss on the pendant, its ends against the boss's sides and the pin's
    // riveted heads outside them, and it lies back over the crown onto the table.
    const zc = -(PENDANT.to - 0.9);
    const end = BOW.boss + BOW.wire * 0.55;
    const path: Vec3[] = [[-end, PENDANT.y, zc], [-4.6, PENDANT.y - 0.4, zc - 1.4], [-7.2, 3.1, zc - 4.6], [-7.6, 2.0, zc - 8.8], [-4.8, 1.2, zc - 12.2], [0, BOW.wire + 0.05, zc - 13.6], [4.8, 1.2, zc - 12.2], [7.6, 2.0, zc - 8.8], [7.2, 3.1, zc - 4.6], [4.6, PENDANT.y - 0.4, zc - 1.4], [end, PENDANT.y, zc]];
    add(iCrown, FIN.copper, tube(path.map(([x, y, z]) => [x + dx, y, z + dz] as Vec3), BOW.wire, 100, 10), undefined);
    const h = BOW.wire * 1.05, d0 = -zc - h, d1 = -zc + h, R = BOW.boss;
    const boss = lathe([[0, d0], [R - 0.25, d0], [R, d0 + 0.25], [R, d1 - 0.25], [R - 0.25, d1], [0, d1]], 32);
    boss.rotateX(-Math.PI / 2);
    add(iCrown, FIN.copper, boss, at(dx, PENDANT.y, dz));
    const reach = end + BOW.wire + 0.12;
    const pin = new THREE.CylinderGeometry(BOW.pin, BOW.pin, reach * 2, 12);
    pin.rotateZ(Math.PI / 2);
    add(iCrown, FIN.copper, pin, at(dx, PENDANT.y, dz + zc));
    for (const e of [-1, 1]) {
      const head = lathe([[0, 0], [BOW.pin * 1.55, 0], [BOW.pin * 1.4, BOW.pin * 0.45], [BOW.pin * 0.8, BOW.pin * 0.8], [0, BOW.pin * 0.9]], 16);
      head.rotateZ(-e * Math.PI / 2);
      add(iCrown, FIN.copper, head, at(dx + e * reach, PENDANT.y, dz + zc));
    }
    bowEnd = [dx, BOW.wire + 0.05, dz + zc - 13.6];
  }
  // The chain: links in turn lying flat and standing on edge, each through the last, running off the bow and back
  // round toward the hinge, to lie on the table in the crook between the two halves. Run away from the eye, it stood
  // up over the row's border on the page.
  {
    const ctrl: P2[] = [[0, 0], [-2.4, -1.4], [-6.0, -1.6], [-10.2, 0.4], [-14.6, 3.4], [-18.6, 7.6], [-21.8, 12.8], [-23.6, 18.8], [-24.4, 24.4]];
    const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new THREE.Vector3(bowEnd[0] + x, 0, bowEnd[2] + z - 0.6)), false, 'centripetal');
    const L = curve.getLength();
    const oval: Vec3[] = [];
    const lg = CHAIN.long / 2 - CHAIN.wide / 2, wd = CHAIN.wide / 2 - CHAIN.wire;
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      const x = Math.cos(a) * wd, z = Math.sin(a) * wd + Math.sign(Math.sin(a)) * lg;
      oval.push([x, 0, z]);
    }
    const linkG = tube(oval, CHAIN.wire, 32, 6, true);
    for (let k = 0; k < CHAIN.links; k++) {
      const t = Math.min(1, ((k + 0.5) * CHAIN.pitch) / L);
      const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      const yaw = Math.atan2(tg.x, tg.z);
      const stand = k % 2 === 1;
      const i = part({ kind: 'chain', side: 'dial', c: [p.x, 1, p.z], r: 2.4, row: 'chain' });
      const m = new THREE.Matrix4().makeRotationY(yaw);
      if (stand) m.multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
      m.setPosition(p.x, stand ? CHAIN.wide / 2 : CHAIN.wire, p.z);
      add(i, FIN.bronze, linkG.clone(), m);
    }
    // The T bar: an eye standing through the last link, and the bar across the chain's run with a knob at each end.
    {
      const sEye = Math.min(L - 3, CHAIN.links * CHAIN.pitch + 0.15);
      const p = curve.getPointAt(sEye / L), tg = curve.getTangentAt(sEye / L);
      const yaw = Math.atan2(tg.x, tg.z);
      const i = part({ kind: 'chain', side: 'dial', c: [p.x, 1, p.z], r: TBAR.len / 2, row: 'chain' });
      const eye = new THREE.TorusGeometry(TBAR.eye, CHAIN.wire * 0.9, 8, 24);
      eye.rotateY(Math.PI / 2);
      add(i, FIN.bronze, eye, new THREE.Matrix4().makeRotationY(yaw).setPosition(p.x, TBAR.eye, p.z));
      const c = p.clone().addScaledVector(tg, TBAR.eye + TBAR.r * 0.6);
      const rod = lathe([[0, -TBAR.len / 2], [TBAR.r * 0.8, -TBAR.len / 2], [TBAR.r, -TBAR.len / 2 + 1.2], [TBAR.r * 0.85, -0.6], [TBAR.r * 1.25, -0.3], [TBAR.r * 1.25, 0.3], [TBAR.r * 0.85, 0.6], [TBAR.r, TBAR.len / 2 - 1.2], [TBAR.r * 0.8, TBAR.len / 2], [0, TBAR.len / 2]], 16);
      rod.rotateZ(Math.PI / 2);
      const across = new THREE.Matrix4().makeRotationY(yaw).setPosition(c.x, TBAR.knob, c.z);
      add(i, FIN.copper, rod, across);
      for (const e of [-1, 1]) {
        const knob = lathe([[0, -TBAR.knob], [TBAR.knob * 0.7, -TBAR.knob * 0.75], [TBAR.knob, 0], [TBAR.knob * 0.7, TBAR.knob * 0.75], [TBAR.knob * 0.3, TBAR.knob * 1.1], [0, TBAR.knob * 1.1]], 16);
        knob.rotateZ(-e * Math.PI / 2);
        knob.translate(e * (TBAR.len / 2 + TBAR.knob * 0.6), 0, 0);
        add(i, FIN.copper, knob, across);
      }
    }
  }
  await pause();

  const meshes = b.build(root, 'watch');
  const depth = depthMaterial(u);
  for (const m of meshes) { m.customDepthMaterial = depth; m.frustumCulled = false; }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(150, 110), shadowMaterial(u));
  {
    const g = shadow.geometry;
    g.rotateX(-Math.PI / 2);
    g.translate(0, -0.02, -8);
    g.setAttribute('cell', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 4), 4));
    shadow.frustumCulled = false;
    shadow.renderOrder = -1;
    shadow.userData.noWire = true;
    root.add(shadow);
  }
  void iBack; void iHinge; void iPlate; void iFork; void iBal; void iSpring; void iCock; void iBody; void iDial; void iCrystal; void iCrown; void bridgeParts; void trainParts;
  return { root, parts, u, meshes, shadow, tris: b.tris, spend, phase };
}

// A bar that narrows from half width w0 to w1.
function taper(ax: number, ay: number, bx: number, by: number, w0: number, w1: number): Field {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  return (x, y) => {
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    return Math.hypot(x - ax - dx * t, y - ay - dy * t) - (w0 + (w1 - w0) * t);
  };
}

// A Roman numeral as strokes: thick and thin, with serifs, its foot at v = 0 and its head at the numeral's height.
// An X is cut as two strokes, the thin one passing a hair under the thick, so each outline stays simple.
function glyph(s: string): { fields: { field: Field; drop: number }[]; width: number } {
  const h = NUMERALS.h, thick = 0.2, thin = 0.085, serif = 0.055, gap = 0.36;
  const widths: Record<string, number> = { I: 0.5, V: 1.7, X: 1.75 };
  const total = [...s].reduce((t, ch) => t + widths[ch], 0) + gap * (s.length - 1);
  const main: Field[] = [], under: Field[] = [];
  let x = -total / 2;
  for (const ch of s) {
    const w = widths[ch], c = x + w / 2;
    const ser = (to: Field[], cx: number, y: number, half: number) => to.push(bar(cx - half, y, cx + half, y, serif));
    if (ch === 'I') { main.push(bar(c, 0.06, c, h - 0.06, thick)); ser(main, c, 0.06, 0.27); ser(main, c, h - 0.06, 0.27); }
    if (ch === 'V') {
      main.push(taper(c - w / 2 + 0.22, h - 0.06, c, 0.12, thick, thick * 0.6), bar(c + w / 2 - 0.22, h - 0.06, c, 0.12, thin));
      ser(main, c - w / 2 + 0.22, h - 0.06, 0.34); ser(main, c + w / 2 - 0.22, h - 0.06, 0.28);
    }
    if (ch === 'X') {
      const l = c - w / 2 + 0.25, r = c + w / 2 - 0.25;
      main.push(bar(l, h - 0.06, r, 0.06, thick));
      ser(main, l, h - 0.06, 0.3); ser(main, r, 0.06, 0.3);
      under.push(bar(r, h - 0.06, l, 0.06, thin));
      ser(under, r, h - 0.06, 0.3); ser(under, l, 0.06, 0.3);
    }
    x += w + gap;
  }
  return { fields: [{ field: union(main, 0.06), drop: 0 }, ...(under.length ? [{ field: union(under, 0.06), drop: 0.035 }] : [])], width: total };
}

// A soft dark pool under each half that fades out a little beyond its edge, coming and going with the watch.
function shadowMaterial(u: Shared): THREE.ShaderMaterial {
  const c = (p: P2) => `vec2(${p[0].toFixed(2)}, ${p[1].toFixed(2)})`;
  return new THREE.ShaderMaterial({
    uniforms: { ...u, uShadow: { value: new THREE.Vector2(1, 1) } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
varying vec3 vWatP;
void main(){
  vWatP = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: /* glsl */ `
uniform float uBandOn;
uniform vec2 uShadow;
uniform vec4 uBand;
uniform vec3 uEye;
varying vec3 vWatP;
vec2 watOnTable(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }
void main(){
  if (uBandOn > 0.5 && length(watOnTable(vWatP) - uBand.xy) > uBand.z) discard;
  float m = (1.0 - smoothstep(-3.0, 9.0, length(vWatP.xz - ${c([MOV.x, MOV.z])}) - ${(CASE.r - 3).toFixed(1)})) * uShadow.x;
  float d = (1.0 - smoothstep(-3.0, 9.0, length(vWatP.xz - ${c([DIAL.x, DIAL.z])}) - ${(CASE.r - 3).toFixed(1)})) * uShadow.y;
  vec2 q = vWatP.xz - ${c([DIAL.x, DIAL.z - 37])};
  d = max(d, (1.0 - smoothstep(0.0, 6.0, length(q * vec2(0.8, 1.0)) - 6.0)) * 0.47 * uShadow.y);
  gl_FragColor = vec4(0.0, 0.0, 0.0, max(m, d) * 0.75);
}`,
  });
}
