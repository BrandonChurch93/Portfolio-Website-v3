import * as THREE from 'three';
import { at, cyl, rbox, slice } from '../../../../world/build';
import { ROCKET, TABLE, TOWER, VIEW } from '../../layout';
import { bolt, cbox, strut } from '../table/model';
import { MARKS, Parts, type KindName, type Steel } from '../table/steel';

// The tower, in units: a square steel lattice on the table's left end, its faces braced in a zigzag, with a platform
// at each arm's level, a top deck with a mast and its beacon, a caged ladder up its left side, a lift on rails inside
// it, and the lines that run up its face to the arms. The arms are built apart, each about the hinge it swings on.

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const CX = (TOWER.l + TOWER.r) / 2, HW = (TOWER.r - TOWER.l) / 2, HD = TOWER.deep / 2;
// The members: the corner columns, the girts, the braces, and where the columns' middles stand in from the faces.
export const MEMBER = { col: 6, girt: 3, brace: 2.2 } as const;
const IN = MEMBER.col / 2;
// The base the tower stands on, on the deck: how tall.
const BASE = 8;
// Where the floors are: the base, a floor a little under each arm, and the top, and how many bays lie between each.
const ARM_FLOOR = 9;
const FLOORS = [TABLE.top + BASE, TOWER.arms[2] - ARM_FLOOR, TOWER.arms[1] - ARM_FLOOR, TOWER.arms[0] - ARM_FLOOR, TOWER.top] as const;
const BAYS = [4, 5, 2, 3] as const;
// The platforms: how far they reach past the faces, front and left, and their rail.
const PLAT = { out: 8, thick: 2, rail: 11 } as const;
// The top deck: how far it reaches past the faces, and the mast that holds the beacon.
const TOP = { out: 11, frame: 4.5 } as const;
// The ladder up the left side: its middle across, how wide, how far apart its rungs and its cage's hoops.
const LADDER = { x: TOWER.l - 9, w: 9, rung: 7, hoop: 44 } as const;
// The lift: its rails across, and where its car is parked.
const LIFT = { rails: [-7, 7], z: -HD + 7, car: TOWER.arms[0] - ARM_FLOOR + 2.2 } as const;
// The lines up the face: how far across each runs, how thick, what it is, and the arm it runs to.
const LINES = [
  { x: TOWER.r - 9, r: 1.7, kind: 'steel' as KindName, arm: 2 },
  { x: TOWER.r - 13.5, r: 1.3, kind: 'rail' as KindName, arm: 1 },
  { x: TOWER.r - 18.5, r: 2, kind: 'rubber' as KindName, arm: 0 },
];

export function floors(): number[] {
  const ys: number[] = [];
  for (let i = 0; i < BAYS.length; i++) for (let k = 0; k < BAYS[i]; k++) ys.push(FLOORS[i] + ((FLOORS[i + 1] - FLOORS[i]) * k) / BAYS[i]);
  ys.push(TOWER.top);
  return ys;
}

// The beacon at the top: where its lens is and how large.
export const BEACON = { at: [CX, TOWER.lamp, 0] as [number, number, number], r: 3.2, halo: 30 };

export async function buildTower(m: Steel): Promise<{ group: THREE.Group; tris: number }> {
  const group = new THREE.Group();
  const p = new Parts(m);
  const y0 = TABLE.top + BASE, ys = floors();
  const xs = [TOWER.l + IN, TOWER.r - IN], zs = [-HD + IN, HD - IN];

  // The base: a frame of deep beams bolted to the deck, and a plate on it.
  for (const z of zs) p.add(rbox(2 * HW + 4, BASE, 6, 0.8, 2), 'steel', at(CX, TABLE.top + BASE / 2, z), true);
  for (const x of xs) p.add(rbox(6, BASE, 2 * HD - 6, 0.8, 2), 'steel', at(x, TABLE.top + BASE / 2, 0), true);
  for (const x of xs) for (const z of zs) p.add(cbox(13, 1.4, 13, 0.4), 'steel', at(x, TABLE.top + 0.7, z), true);

  // A room in the lowest bay, the tower's footing: ribbed walls, a door, a vent and a small light over the door.
  {
    const ry0 = y0, ry1 = floors()[1] - MEMBER.girt / 2, rh = ry1 - ry0, rw = 2 * HW - 2 * MEMBER.col, rz = HD - MEMBER.col / 2 - 1.2;
    p.add(cbox(rw, rh, 2 * rz, 0.6), 'black', at(CX, ry0 + rh / 2, 0), true);
    for (let k = 1; k < 8; k++) p.add(cbox(1.1, rh - 2, 0.8, 0.25), 'steel', at(CX - rw / 2 + (rw * k) / 8, ry0 + rh / 2, rz + 0.3));
    const dx = CX + rw / 2 - 11;
    p.add(cbox(10, 17, 0.9, 0.3), 'steel', at(dx, ry0 + 8.5, rz + 0.6));
    p.add(cbox(8, 15, 0.5, 0.2), 'black', at(dx, ry0 + 8.3, rz + 1));
    p.add(cbox(1.6, 0.8, 0.8, 0.2), 'bright', at(dx + 2.6, ry0 + 8, rz + 1.4));
    p.add(new THREE.SphereGeometry(0.9, 10, 6), 'marker', at(dx, ry0 + 19.5, rz + 1.2));
    p.add(cbox(4, 1.2, 2.2, 0.3), 'steel', at(dx, ry0 + 18.4, rz + 1));
    p.add(cbox(14, 7, 0.9, 0.3), 'grate', at(CX - rw / 2 + 12, ry0 + rh - 8, rz + 0.6));
  }
  // Hazard stripes along the front of the base.
  p.add(new THREE.PlaneGeometry(2 * HW - 2, BASE - 2.4), 'sign', at(CX, TABLE.top + BASE / 2, HD + 0.56), false, MARKS.stripes);
  // The columns.
  for (const x of xs) for (const z of zs) p.add(rbox(MEMBER.col, TOWER.top - y0, MEMBER.col, 0.9, 2), 'steel', at(x, (y0 + TOWER.top) / 2, z), true);
  await slice();
  // The girts at every floor, on all four faces, and the braces in each bay: a zigzag on the front and back, and an
  // X on the sides, which are seen edge on.
  const span = 2 * HW - 2 * IN, deep = 2 * HD - 2 * IN;
  ys.forEach((y, i) => {
    for (const z of zs) p.add(cbox(span, MEMBER.girt, MEMBER.girt, 0.55), z > 0 ? 'steel' : 'black', at(CX, y, z), true);
    for (const x of xs) p.add(cbox(MEMBER.girt, MEMBER.girt, deep, 0.55), 'steel', at(x, y, 0), true);
    if (i === ys.length - 1) return;
    const y1 = ys[i + 1], flip = i % 2 === 0;
    for (const z of zs) {
      const a = V(flip ? xs[0] : xs[1], y + 1.5, z), b = V(flip ? xs[1] : xs[0], y1 - 1.5, z);
      const s = strut(a, b, MEMBER.brace, MEMBER.brace, 0.5);
      p.add(s.g, z > 0 ? 'steel' : 'black', s.m);
    }
    for (const x of xs) for (const [za, zb] of [[zs[0], zs[1]], [zs[1], zs[0]]]) {
      const s = strut(V(x, y + 1.5, za), V(x, y1 - 1.5, zb), MEMBER.brace, MEMBER.brace, 0.5);
      p.add(s.g, 'black', s.m);
    }
    // Gusset plates where the braces meet the columns on the front.
    for (const [gx, gy] of [[flip ? xs[0] + 2 : xs[1] - 2, y + 3.4], [flip ? xs[1] - 2 : xs[0] + 2, y1 - 3.4]]) {
      p.add(cbox(7, 7, 0.8, 0.3), 'steel', at(gx, gy, HD + 0.3));
      for (const dy of [-1.8, 1.8]) bolt(p, V(gx + (gx < CX ? 1.6 : -1.6), gy + dy, HD + 0.7), V(0, 0, 1), 'bright', 0.55);
    }
  });
  await slice();

  // A platform under each arm: grating on a frame, a toe board, and a rail round its front and its left end.
  for (const y of [FLOORS[1], FLOORS[2], FLOORS[3]]) {
    const x0 = TOWER.l - PLAT.out, x1 = TOWER.r, z1 = HD + PLAT.out, z0 = -HD;
    p.add(cbox(x1 - x0, PLAT.thick, z1 - z0, 0.4), 'grate', at((x0 + x1) / 2, y + MEMBER.girt / 2 + PLAT.thick / 2, (z0 + z1) / 2), true);
    p.add(cbox(x1 - x0, 2.6, 0.9, 0.3), 'steel', at((x0 + x1) / 2, y + MEMBER.girt / 2 + 1.3, z1));
    p.add(cbox(0.9, 2.6, z1 - z0, 0.3), 'steel', at(x0, y + MEMBER.girt / 2 + 1.3, (z0 + z1) / 2));
    const fy = y + MEMBER.girt / 2 + PLAT.thick;
    for (let k = 0; k <= 5; k++) p.add(cbox(1.4, PLAT.rail, 1.4, 0.35), 'steel', at(x0 + 0.7 + ((x1 - x0 - 1.4) * k) / 5, fy + PLAT.rail / 2, z1 - 0.7));
    for (const [h, r] of [[PLAT.rail, 0.8], [PLAT.rail * 0.55, 0.6]]) {
      p.add(cyl(r, x1 - x0, 10).rotateZ(Math.PI / 2), 'rail', at((x0 + x1) / 2, fy + h, z1 - 0.7));
      p.add(cyl(r, z1 - z0, 10).rotateX(Math.PI / 2), 'rail', at(x0 + 0.7, fy + h, (z0 + z1) / 2));
    }
    // Knee braces under the platform's front.
    for (const x of [x0 + 4, (x0 + x1) / 2, x1 - 4]) { const s = strut(V(x, y - 9, HD), V(x, y - 0.5, z1 - 1), 1.8, 1.8, 0.4); p.add(s.g, 'steel', s.m); }
  }
  await slice();

  // The top deck: a frame, grating, a rail all round, and the mast with the beacon.
  {
    const x0 = TOWER.l - TOP.out, x1 = TOWER.r + TOP.out, z0 = -HD - TOP.out, z1 = HD + TOP.out, y = TOWER.top;
    p.add(rbox(x1 - x0, TOP.frame, z1 - z0, 0.7, 2), 'steel', at(CX, y + TOP.frame / 2, 0), true);
    p.add(cbox(x1 - x0 - 2, 0.8, z1 - z0 - 2, 0.3), 'grate', at(CX, y + TOP.frame + 0.3, 0));
    p.add(cbox(x1 - x0 + 0.4, 1.2, 0.8, 0.3), 'steel', at(CX, y + TOP.frame - 0.6, z1));
    const fy = y + TOP.frame;
    for (let k = 0; k <= 6; k++) p.add(cbox(1.4, PLAT.rail, 1.4, 0.35), 'steel', at(x0 + 1 + ((x1 - x0 - 2) * k) / 6, fy + PLAT.rail / 2, z1 - 1));
    for (const x of [x0 + 1, x1 - 1]) for (let k = 0; k < 3; k++) p.add(cbox(1.4, PLAT.rail, 1.4, 0.35), 'steel', at(x, fy + PLAT.rail / 2, z0 + 1 + ((z1 - z0 - 2) * k) / 3));
    for (const [h, r] of [[PLAT.rail, 0.85], [PLAT.rail * 0.55, 0.6]]) {
      p.add(cyl(r, x1 - x0 - 2, 10).rotateZ(Math.PI / 2), 'rail', at(CX, fy + h, z1 - 1));
      p.add(cyl(r, x1 - x0 - 2, 10).rotateZ(Math.PI / 2), 'rail', at(CX, fy + h, z0 + 1));
      for (const x of [x0 + 1, x1 - 1]) p.add(cyl(r, z1 - z0 - 2, 10).rotateX(Math.PI / 2), 'rail', at(x, fy + h, 0));
    }
    // A hut on the deck at the back, the lift's head, with its door to the front.
    p.add(rbox(26, 16, 18, 0.8, 2), 'black', at(CX - 8, fy + 8, -HD + 10), true);
    p.add(cbox(28, 1.4, 20, 0.5), 'steel', at(CX - 8, fy + 16.4, -HD + 10));
    p.add(cbox(8, 11, 0.6, 0.25), 'steel', at(CX - 12, fy + 5.7, -HD + 19.2));
    p.add(cbox(1.2, 0.8, 0.6, 0.2), 'copper', at(CX - 9.4, fy + 6, -HD + 19.6));
    // The mast: a tapered lattice of three legs from the deck to the beacon.
    const mTop = TOWER.lamp - 7, legs = [[-5, -4], [5, -4], [0, 5]];
    for (const [lx, lz] of legs) { const s = strut(V(CX + lx, fy, lz), V(CX + lx * 0.3, mTop, lz * 0.3), 1.8, 1.8, 0.4); p.add(s.g, 'steel', s.m, true); }
    for (const t of [0.33, 0.66]) {
      const yy = fy + (mTop - fy) * t, k = 1 - 0.7 * t;
      p.add(cbox(10 * k, 1.2, 1.2, 0.3), 'steel', at(CX, yy, -4 * k));
    }
    p.add(cyl(4.2, 2.2, 24), 'steel', at(CX, mTop + 1.1, 0));
  }
  // The beacon: a copper collar, a lens, a cage and a cap.
  {
    const [bx, by, bz] = BEACON.at;
    p.add(cyl(3.6, 2.4, 24), 'copper', at(bx, by - BEACON.r - 1.6, bz));
    p.add(new THREE.SphereGeometry(BEACON.r, 20, 12), 'lens', at(bx, by, bz));
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; p.add(cbox(0.7, BEACON.r * 2.4, 0.7, 0.2), 'black', at(bx + Math.cos(a) * (BEACON.r + 0.5), by, bz + Math.sin(a) * (BEACON.r + 0.5))); }
    p.add(cyl(2.4, 1.4, 20, 1.2), 'copper', at(bx, by + BEACON.r + 1.2, bz));
  }
  // Marker lights at the corners of the top deck.
  for (const x of [TOWER.l - TOP.out + 1, TOWER.r + TOP.out - 1]) {
    const my = TOWER.top + TOP.frame + PLAT.rail, mz = HD + TOP.out - 1;
    p.add(cyl(1.5, 1.4, 12), 'black', at(x, my + 0.7, mz));
    p.add(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 'marker', at(x, my + 1.4, mz));
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; p.add(cbox(0.4, 1.6, 0.4, 0.1), 'black', at(x + Math.cos(a) * 1.15, my + 2.1, mz + Math.sin(a) * 1.15)); }
  }
  await slice();

  // The ladder up the left side, from the deck to the top, with its cage and the brackets that hold it.
  {
    const lx = LADDER.x, z = HD - 6, ya = TABLE.top, yb = TOWER.top + TOP.frame;
    for (const s of [-1, 1]) p.add(cbox(1.3, yb - ya, 1.3, 0.3), 'steel', at(lx + (s * LADDER.w) / 2, (ya + yb) / 2, z));
    for (let y = ya + LADDER.rung; y < yb - 1; y += LADDER.rung) p.add(cyl(0.65, LADDER.w, 6).rotateZ(Math.PI / 2), 'black', at(lx, y, z));
    for (let y = ya + 30; y < yb - 4; y += LADDER.hoop) {
      p.add(new THREE.TorusGeometry(LADDER.w / 2 + 2, 0.75, 6, 16, Math.PI).rotateX(Math.PI / 2), 'steel', at(lx, y, z));
      p.add(cbox(TOWER.l - lx + LADDER.w / 2, 1.2, 1.2, 0.3), 'steel', at((lx + LADDER.w / 2 + TOWER.l) / 2, y + 2, z));
    }
  }
  await slice();

  // The lift: two rails inside the back of the tower, and its car parked at the top arm.
  for (const dx of LIFT.rails) p.add(cbox(1.6, TOWER.top - y0, 1.6, 0.4), 'black', at(CX + dx, (y0 + TOWER.top) / 2, LIFT.z));
  {
    const y = LIFT.car, w = 22, h = 20, d = 18, z = LIFT.z + d / 2 + 1;
    p.add(cbox(w, 1.6, d, 0.4), 'steel', at(CX, y + 0.8, z), true);
    p.add(cbox(w, 1.6, d, 0.4), 'black', at(CX, y + h - 0.8, z), true);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.add(cbox(1.4, h, 1.4, 0.3), 'steel', at(CX + (sx * (w - 1.4)) / 2, y + h / 2, z + (sz * (d - 1.4)) / 2));
    p.add(cbox(w - 2, h - 4, 0.6, 0.2), 'grate', at(CX, y + h / 2, z - d / 2 + 0.4));
    p.add(cbox(w - 2, 1, 0.8, 0.2), 'steel', at(CX, y + h * 0.55, z + d / 2 - 0.4));
  }
  await slice();

  // The lines up the front face to the arms, clamped at every floor, each turning in to a box at its arm's hinge.
  for (const L of LINES) {
    const armY = TOWER.arms[L.arm], z = HD + 3.2, yTop = armY - 6, len = yTop - y0;
    p.add(cyl(L.r, len, 12), L.kind, at(L.x, y0 + len / 2, z));
    p.add(new THREE.TorusGeometry(4, L.r, 8, 10, Math.PI / 2), L.kind, at(L.x + 4, yTop, z, [0, 0, Math.PI / 2]));
    p.add(cyl(L.r, TOWER.r + 1 - (L.x + 4), 12).rotateZ(Math.PI / 2), L.kind, at((L.x + 4 + TOWER.r + 1) / 2, yTop + 4, z));
    for (const y of ys) if (y > y0 && y < yTop - 4) {
      p.add(cbox(L.r * 2 + 2, 2, 3.4, 0.4), 'steel', at(L.x, y + 3.4, z - 0.6));
    }
  }
  // The boxes at the hinges, where the lines go onto the arms.
  for (const y of TOWER.arms) {
    p.add(cbox(7, 12, 10, 0.6), 'black', at(TOWER.r - 6, y - 2, HD - 7), true);
    p.add(cbox(7.2, 1, 10.2, 0.3), 'copper', at(TOWER.r - 6, y + 2.4, HD - 7));
  }

  armLugs(p);
  const tris = p.tris;
  p.build(group, 'tower');
  // The halo is a card turned to the visitor, who always sees the pad from the same side.
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(BEACON.halo, BEACON.halo).rotateX((-VIEW.el * Math.PI) / 180), m.halo);
  halo.position.set(...BEACON.at);
  halo.renderOrder = 2;
  halo.userData.noAO = true;
  group.add(halo);
  return { group, tris };
}

// The arms: each a truss on a hinge at the tower's right face, reaching straight across to the rocket's side. The top
// one is the crew's, a walkway with a room at its end; the two below carry lines to a plate on the rocket. Each is
// built along +x from its hinge, which is a pin along its top chord at the tower's face, so it draws back by lifting
// until it stands nearly upright against the tower. Its end is a group of its own that lets go of the rocket first.
export interface Arm { group: THREE.Group; end: THREE.Group }
export const ARM = { hinge: TOWER.r + 2.5, half: 7, crew: 8 } as const;
const armHalf = (i: number) => (i === 0 ? ARM.crew : ARM.half);
const armWide = (i: number) => (i === 0 ? 7 : 5.5);

export function buildArms(m: Steel): { arms: Arm[]; tris: number } {
  let tris = 0;
  const arms = TOWER.arms.map((y, i) => {
    const group = new THREE.Group(), arm = new THREE.Group(), end = new THREE.Group();
    const crew = i === 0, h = armHalf(i), w = armWide(i), n = 4, len = -ROCKET.r - ARM.hinge, bodyL = len - (crew ? 14 : 7);
    group.position.set(ARM.hinge, y + h, 0);
    arm.position.y = -h;
    group.add(arm);
    end.position.set(len, 0, 0);
    arm.add(end);
    const p = new Parts(m), e = new Parts(m);
    // The pin it turns on, along its top chord, with copper caps.
    p.add(cyl(1.6, 2 * w + 7, 14).rotateX(Math.PI / 2), 'bright', at(0, h, 0), true);
    for (const s of [-1, 1]) p.add(cyl(2.2, 1.2, 14).rotateX(Math.PI / 2), 'copper', at(0, h, s * (w + 4)));
    // The chords and the web.
    for (const s of [-1, 1]) for (const z of [-w, w]) p.add(cbox(bodyL, crew ? 2.6 : 2.4, 2.4, 0.5), 'steel', at(bodyL / 2 + 1, s * h, z), true);
    for (let k = 0; k <= n; k++) {
      const x = 2 + (bodyL - 2) * (k / n);
      for (const z of [-w, w]) p.add(cbox(1.8, 2 * h, 1.8, 0.4), 'steel', at(x, 0, z), true);
      if (k < n) {
        const x2 = 2 + (bodyL - 2) * ((k + 1) / n), up = k % 2 === 0;
        for (const z of [-w, w]) { const st = strut(V(x, up ? -h : h, z), V(x2, up ? h : -h, z), 1.6, 1.6, 0.4); p.add(st.g, 'black', st.m, true); }
      }
    }
    if (crew) {
      // The walkway: grating along the bottom, a rail along its front, and a roof.
      p.add(cbox(bodyL, 1.2, 2 * w, 0.3), 'grate', at(bodyL / 2 + 1, -h + 1.2, 0), true);
      p.add(cbox(bodyL, 1, 2 * w + 2, 0.3), 'black', at(bodyL / 2 + 1, h + 1.2, 0), true);
      p.add(cyl(0.65, bodyL, 8).rotateZ(Math.PI / 2), 'rail', at(bodyL / 2 + 1, 1, w + 0.6));
      // The room at its end that closes round the hatch, with a copper seal on its face.
      e.add(rbox(14, 2 * h + 6, 2 * w + 6, 1, 2), 'black', at(-7, 1, 0), true);
      e.add(cbox(14.4, 1.2, 2 * w + 6.4, 0.4), 'steel', at(-7, h + 4.4, 0));
      e.add(cbox(1.4, 2 * h + 2, 2 * w + 2, 0.5), 'copper', at(-0.7, 1, 0));
      for (const s of [-1, 1]) e.add(cbox(10, 1, 0.6, 0.25), 'steel', at(-7, 1 + s * 4, w + 3.2));
    } else {
      // The lines along the arm's underside, and the plate at its end that the lines meet the rocket by.
      p.add(cyl(1.4, bodyL - 2, 10).rotateZ(Math.PI / 2), 'rail', at(bodyL / 2 + 1, -h - 2.2, 2));
      p.add(cyl(1.8, bodyL - 2, 10).rotateZ(Math.PI / 2), 'rubber', at(bodyL / 2 + 1, -h - 2.6, -2.5));
      e.add(rbox(7, 2 * h + 4, 2 * w + 2, 0.8, 2), 'black', at(-3.5, 0, 0), true);
      e.add(cbox(1.2, 2 * h, 2 * w - 1, 0.4), 'copper', at(-0.6, 0, 0));
      for (const s of [-1, 1]) e.add(cyl(1.5, 3, 10).rotateZ(Math.PI / 2), 'rubber', at(-8.5, s * 3.4, 2));
      e.add(new THREE.TorusGeometry(2.6, 0.5, 6, 18).rotateY(Math.PI / 2), 'copper', at(-1.3, 0, 0));
    }
    tris += p.tris + e.tris;
    p.build(arm, `arm${i}`);
    e.build(end, `arm${i}-end`);
    return { group, end };
  });
  return { arms, tris };
}

// The lugs on the tower's face that each arm's pin turns in.
export function armLugs(p: Parts): void {
  TOWER.arms.forEach((y, i) => {
    const h = armHalf(i), w = armWide(i);
    for (const s of [-1, 1]) p.add(cbox(6, 7, 1.6, 0.4), 'steel', at(TOWER.r + 1.6, y + h, s * (w + 2.4)), true);
    p.add(cbox(1.6, 10, 2 * w + 7, 0.4), 'black', at(TOWER.r - 0.2, y + h - 1.5, 0), true);
  });
}
