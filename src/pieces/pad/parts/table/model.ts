import * as THREE from 'three';
import { at, cyl, rbox, slice, xf } from '../../../../world/build';
import { ROCKET, TABLE, TOWER } from '../../layout';
import { MARKS, Parts, type KindName, type Steel } from './steel';

// The launch table, in units: a deck plate over a box girder with the flame hole through it, on eight legs that stand
// on the stone round its boss, with hold downs for the rocket, a rail, a stair down to the stone at its right end,
// and the lines under it that run from the tower's foot to the rocket.

const MID_X = (TABLE.l + TABLE.r) / 2, HALF_Z = TABLE.deep / 2;
// The deck: how thick its top plate is, how far its girder's web stands in from the plate's edge, how thick the
// girder's foot is, and how far apart its stiffeners are.
export const DECK = { plate: 3, web: 1.6, foot: 2, rib: 24 } as const;
// The flame hole, its collar on the deck, and the bolts round the collar.
export const HOLE = { r: 30, collar: 48, bolts: 20, boltR: 44.5 } as const;
// The legs: where they stand, how thick, and their foot plates.
export const LEGS = { x: [-145, -83, 0, 62, 104], z: 58, w: 9, foot: 16 } as const;
// The hold downs, at the rocket's feet: the fins stand on the diagonals, their feet this far out on the deck (the
// rocket part's FIN and FEET). How wide the plate under a foot is, the gap either side of the fin, and each jaw's
// thickness, length, height and the lip it holds the foot down by.
export const HOLD = { angles: [45, 135, 225, 315].map((d) => (d * Math.PI) / 180), r: ROCKET.fin * Math.SQRT2, plate: 15, gap: 2.2, jaw: 2.4, long: 11, tall: 4.6, lip: 2.6 } as const;
// The stair at the right end, from the deck down to the stone: its width, how far along it runs, and its steps.
export const STAIR = { z0: 46, z1: 68, run: 42, steps: 6 } as const;

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// A box with its four long edges chamfered and flat faces, so each edge holds a crisp line of light: a member, a
// rib, a post. A quarter of the triangles of a rounded box, which counts on a lattice of hundreds.
const cboxes = new Map<string, THREE.BufferGeometry>();
const ROLL = 0.45;
export function cbox(w: number, h: number, d: number, r = 0.5): THREE.BufferGeometry {
  const key = `${w}|${h}|${d}|${r}`;
  let g = cboxes.get(key);
  if (!g) {
    const dims = [w, h, d], long = dims.indexOf(Math.max(...dims)), [i, j] = [0, 1, 2].filter((k) => k !== long);
    const A = dims[i] / 2, B = dims[j] / 2, c = Math.min(r, A * 0.45, B * 0.45), L = dims[long] / 2;
    const ring: [number, number][] = [[A, -B + c], [A, B - c], [A - c, B], [-A + c, B], [-A, B - c], [-A, -B + c], [-A + c, -B], [A - c, -B]];
    const P = (a: number, b: number, l: number) => { const v = [0, 0, 0]; v[i] = a; v[j] = b; v[long] = l; return new THREE.Vector3(v[0], v[1], v[2]); };
    const pos: number[] = [], tri = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3) => pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    const sides = 8 * 6;
    // Which way round the ring runs against the long axis decides which side faces out.
    const flip = (i + 1) % 3 === j ? 1 : -1;
    for (let k = 0; k < 8; k++) {
      const [a0, b0] = ring[k], [a1, b1] = ring[(k + 1) % 8];
      const q0 = P(a0, b0, -L), q1 = P(a1, b1, -L), q2 = P(a1, b1, L), q3 = P(a0, b0, L);
      if (flip > 0) { tri(q0, q1, q2); tri(q0, q2, q3); } else { tri(q0, q2, q1); tri(q0, q3, q2); }
    }
    for (const [l, sgn] of [[L, 1], [-L, -1]] as const) for (let k = 1; k < 7; k++) {
      const p0 = P(ring[0][0], ring[0][1], l), p1 = P(ring[k][0], ring[k][1], l), p2 = P(ring[k + 1][0], ring[k + 1][1], l);
      if (sgn * flip > 0) tri(p0, p1, p2); else tri(p0, p2, p1);
    }
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    // Each long face's normal leans a little toward the way its corner faces, so a face shades across its width like
    // a rolled section and the cursor's light slides along the member as a line, while each chamfer stays its own
    // crisp line. A plate stays flat.
    const nor = g.getAttribute('normal'), n = new THREE.Vector3(), out = new THREE.Vector3(), roll = Math.min(A, B) / Math.max(A, B) > 0.4 ? ROLL : 0;
    for (let k = 0; k < sides; k++) {
      n.fromBufferAttribute(nor, k);
      const v = [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]];
      const o = [0, 0, 0];
      o[i] = v[i] / A;
      o[j] = v[j] / B;
      out.set(o[0], o[1], o[2]).normalize();
      n.multiplyScalar(1 - roll).addScaledVector(out, roll).normalize();
      nor.setXYZ(k, n.x, n.y, n.z);
    }
    cboxes.set(key, g);
  }
  return g.clone();
}

// A straight member between two points, its cross section w by d, the d side kept toward the visitor where it can be.
export function strut(a: THREE.Vector3, b: THREE.Vector3, w: number, d = w, r = 0.5): { g: THREE.BufferGeometry; m: THREE.Matrix4 } {
  const dir = b.clone().sub(a), len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), dir.normalize());
  return { g: cbox(len, w, d, r), m: new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)) };
}

// A flat plate in plan, an outline with holes, extruded up from y0 to y1, with a chamfer round its top edge.
function plate(outline: THREE.Vector2[], holes: THREE.Vector2[][], y0: number, y1: number, bevel = 0.7): THREE.BufferGeometry {
  const s = new THREE.Shape(outline.map((p) => new THREE.Vector2(p.x, -p.y)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p.x, -p.y))));
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0 - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 64 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + bevel, 0);
  return g;
}
const rect = (x0: number, x1: number, z0: number, z1: number) => [new THREE.Vector2(x0, z0), new THREE.Vector2(x1, z0), new THREE.Vector2(x1, z1), new THREE.Vector2(x0, z1)];
const circle = (r: number, n = 64) => Array.from({ length: n }, (_, i) => { const a = (-i / n) * Math.PI * 2; return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r); });

// A hex bolt head standing up from a face whose normal is n.
// A round headed bolt, a low dome that holds a point of light.
const BOLT = new THREE.SphereGeometry(1.05, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1);
export function bolt(p: Parts, at3: THREE.Vector3, n: THREE.Vector3, kind: KindName = 'bright', s = 1): void {
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n);
  p.add(BOLT, kind, new THREE.Matrix4().compose(at3, q, new THREE.Vector3(s, s, s)));
}

export async function buildTable(m: Steel): Promise<{ group: THREE.Group; tris: number; jaws: { group: THREE.Group; side: number }[] }> {
  const group = new THREE.Group();
  const p = new Parts(m);
  const top = TABLE.top, under = TABLE.under, pl = DECK.plate;

  // The deck's top plate, with the hole, its edge chamfered so it holds a line of light.
  p.add(plate(rect(TABLE.l, TABLE.r, -HALF_Z, HALF_Z), [circle(HOLE.r)], top - pl, top, 0.8), (c, n) => (Math.hypot(c.x, c.z) < HOLE.r + 2 && Math.abs(n.y) < 0.5 ? 'heat' : 'deck'), undefined, true);
  // The girder under it, its web set in, and its foot.
  const w = DECK.web;
  p.add(plate(rect(TABLE.l + w, TABLE.r - w, -HALF_Z + w, HALF_Z - w), [circle(HOLE.r)], under + DECK.foot, top - pl, 0), (c) => (Math.hypot(c.x, c.z) < HOLE.r + 2 ? 'heat' : 'black'), undefined, true);
  p.add(plate(rect(TABLE.l + 0.4, TABLE.r - 0.4, -HALF_Z + 0.4, HALF_Z - 0.4), [circle(HOLE.r + 1)], under, under + DECK.foot, 0.5), 'steel', undefined, true);
  await slice();
  // Stiffeners on the web, front and back and at the ends, each with a bolt top and bottom.
  const ribH = top - pl - under - DECK.foot, ribY = under + DECK.foot + ribH / 2;
  for (let x = TABLE.l + 12; x <= TABLE.r - 6; x += DECK.rib) for (const sz of [-1, 1]) {
    p.add(cbox(2.2, ribH, w + 0.2, 0.4), 'steel', at(x, ribY, sz * (HALF_Z - w / 2)));
    if (sz > 0) for (const y of [under + DECK.foot + 2.2, top - pl - 2.2]) for (const dx of [-3.4, 3.4]) bolt(p, V(x + dx, y, HALF_Z - w), V(0, 0, 1), 'bright', 0.8);
  }
  for (const sx of [-1, 1]) for (let z = -HALF_Z + 25; z < HALF_Z - 10; z += 25) p.add(cbox(w + 0.2, ribH, 2.2, 0.4), 'steel', at(sx > 0 ? TABLE.r - w / 2 : TABLE.l + w / 2, ribY, z));
  // Painted panels on the web: hazard stripes at each end and the table's code in the middle, under the rocket.
  const webZ = HALF_Z - w + 0.06, webY = under + DECK.foot + ribH / 2;
  for (const x of [TABLE.l + 24, TABLE.r - 24]) p.add(new THREE.PlaneGeometry(DECK.rib - 3.4, ribH - 1.2), 'sign', at(x, webY, webZ), false, MARKS.stripes);
  p.add(new THREE.PlaneGeometry(DECK.rib - 3, (DECK.rib - 3) / 4), 'sign', at(TABLE.l + 12 + DECK.rib * 6.5, webY, webZ), false, MARKS.code);
  // A polished nosing along the plate's front edge, which holds the line of light that draws the deck.
  p.add(cbox(TABLE.r - TABLE.l - 1, 1.1, 0.9, 0.35), 'bright', at(MID_X, top - 1.3, HALF_Z + 0.25));
  // Bolts along the plate's front, a pair over each stiffener.
  for (let x = TABLE.l + 12; x <= TABLE.r - 6; x += DECK.rib) for (const dx of [-2.6, 2.6]) bolt(p, V(x + dx, top, HALF_Z - 2.6), V(0, 1, 0), 'bright', 0.7);

  // The flame hole's liner, smooth, and a lip at its foot.
  p.add(new THREE.LatheGeometry([new THREE.Vector2(HOLE.r - 0.25, top - 0.3), new THREE.Vector2(HOLE.r - 0.25, under + 0.2)], 128), 'heat', undefined, true);
  p.add(plate(circle(HOLE.r - 0.2, 128), [circle(HOLE.r - 3.5, 128)], under, under + 1.6, 0.4), 'heat');
  // The flame hole's collar: a raised ring tinted by the heat, bolted down, with a copper band at its outer edge.
  p.add(plate(circle(HOLE.collar, 96), [circle(HOLE.r, 96)], top, top + 1.6, 0.5), 'heat', undefined, true);
  p.add(plate(circle(HOLE.collar + 1.6, 96), [circle(HOLE.collar, 96)], top, top + 1.1, 0.35), 'copper');
  for (let i = 0; i < HOLE.bolts; i++) { const a = ((i + 0.5) / HOLE.bolts) * Math.PI * 2; bolt(p, V(Math.cos(a) * HOLE.boltR, top + 1.6, Math.sin(a) * HOLE.boltR), V(0, 1, 0), 'bright', 0.75); }
  await slice();

  // The legs: a foot plate bolted to the stone, an H section column turned so its web is seen between its flanges,
  // a cap under the girder, and a pair of flat straps across each pair, bolted to a plate where they cross.
  for (const x of LEGS.x) for (const sz of [-1, 1]) {
    const z = sz * LEGS.z, colH = under - 5.5, y0 = 3.5, hw = LEGS.w / 2;
    p.add(cbox(LEGS.foot, 2, LEGS.foot, 0.6), 'steel', at(x, 1, z), true);
    for (const [u, v] of [[-5.6, -5.6], [5.6, -5.6], [-5.6, 5.6], [5.6, 5.6]]) bolt(p, V(x + u, 2, z + v), V(0, 1, 0), 'copper', 0.8);
    p.add(cbox(LEGS.w + 2, 1.5, LEGS.w + 2, 0.4), 'steel', at(x, 2.75, z), true);
    for (const s of [-1, 1]) p.add(cbox(1.8, colH, LEGS.w, 0.5), 'steel', at(x + s * (hw - 0.9), y0 + colH / 2, z), true);
    p.add(cbox(LEGS.w - 3.4, colH, 1.4, 0.3), 'black', at(x, y0 + colH / 2, z), true);
    // Stiffeners across the web, top and bottom, and the cap.
    for (const yy of [y0 + 3, y0 + colH - 3]) for (const s of [-1, 1]) p.add(cbox(LEGS.w - 3.6, 1, hw - 1, 0.25), 'steel', at(x, yy, z + s * (hw / 2)));
    p.add(cbox(LEGS.w + 4, 2, LEGS.w + 4, 0.5), 'steel', at(x, under - 1, z), true);
  }
  for (const [x0, x1] of [[LEGS.x[0], LEGS.x[1]], [LEGS.x[3], LEGS.x[4]]]) for (const sz of [-1, 1]) {
    const z = sz * (LEGS.z + LEGS.w / 2 - 0.6), a0 = x0 + LEGS.w / 2 - 0.4, a1 = x1 - LEGS.w / 2 + 0.4, ya = 5.5, yb = under - 3.5;
    for (const [p0, p1] of [[ya, yb], [yb, ya]]) { const st = strut(V(a0, p0, z), V(a1, p1, z), 2.6, 0.7, 0.25); p.add(st.g, 'steel', st.m); }
    const mx = (a0 + a1) / 2, my = (ya + yb) / 2;
    p.add(cbox(5, 5, 0.7, 0.25), 'steel', at(mx, my, z + sz * 0.6));
    for (const [u, v] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) bolt(p, V(mx + u, my + v, z + sz * 0.95), V(0, 0, sz), 'bright', 0.5);
  }
  await slice();

  // The lines under the deck, from the tower's foot to the rocket: one bare, one lagged and banded in copper, on
  // saddles, each turning up into the deck by the hole.
  const lines = [{ z: -44, y: 12, r: 2.1, kind: 'steel' as KindName, end: -40 }, { z: -34, y: 7.5, r: 2.7, kind: 'rubber' as KindName, end: -46 }];
  for (const L of lines) {
    const x0 = TABLE.l + 8, len = L.end - x0;
    p.add(cyl(L.r, len, 16).rotateZ(Math.PI / 2), L.kind, at(x0 + len / 2, L.y, L.z));
    p.add(new THREE.TorusGeometry(5, L.r, 10, 12, Math.PI / 2), L.kind, at(L.end, L.y + 5, L.z, [0, 0, -Math.PI / 2]));
    p.add(cyl(L.r, under - L.y - 5, 16), L.kind, at(L.end + 5, (L.y + 5 + under) / 2, L.z));
    p.add(cyl(L.r + 1.4, 1.6, 16), 'steel', at(L.end + 5, under - 0.8, L.z));
    // Down into the stone at the far end.
    p.add(new THREE.TorusGeometry(5, L.r, 10, 12, Math.PI / 2), L.kind, at(x0, L.y - 5, L.z, [0, 0, Math.PI / 2]));
    p.add(cyl(L.r, L.y - 5, 16), L.kind, at(x0 - 5, (L.y - 5) / 2, L.z));
    for (let x = x0 + 18; x < L.end - 6; x += 22) {
      if (L.kind === 'rubber') p.add(cyl(L.r + 0.35, 1.4, 16).rotateZ(Math.PI / 2), 'copper', at(x, L.y, L.z));
      p.add(cbox(3, L.y - L.r, 5, 0.4), 'steel', at(x + 6, (L.y - L.r) / 2, L.z));
    }
  }
  await slice();

  // The rail along the back and down the right end, which leaves the head of the stair open.
  const railH = 12, x0 = TOWER.r + 3, xr = TABLE.r - 3, zb = -HALF_Z + 3;
  const posts: [number, number][] = [];
  for (let i = 0, n = 8; i <= n; i++) posts.push([x0 + ((xr - x0) * i) / n, zb]);
  for (let i = 1, n = 4; i <= n; i++) posts.push([xr, zb + ((STAIR.z0 - 3 - zb) * i) / n]);
  for (const [x, z] of posts) {
    p.add(cbox(1.7, railH, 1.7, 0.4), 'steel', at(x, top + railH / 2, z));
    p.add(cbox(3.4, 0.8, 3.4, 0.3), 'steel', at(x, top + 0.4, z));
  }
  for (const y of [top + railH, top + railH * 0.55]) {
    const r = y > top + railH - 1 ? 0.95 : 0.7;
    p.add(cyl(r, xr - x0, 10).rotateZ(Math.PI / 2), 'rail', at((x0 + xr) / 2, y, zb));
    p.add(cyl(r, STAIR.z0 - 3 - zb, 10).rotateX(Math.PI / 2), 'rail', at(xr, y, (zb + STAIR.z0 - 3) / 2));
  }
  // A toe board along the back.
  p.add(cbox(xr - x0, 2.4, 0.8, 0.3), 'steel', at((x0 + xr) / 2, top + 1.2, zb + 1.2));

  // The stair: two stringers, grated treads, a rail on its open side.
  const sx0 = TABLE.r, sx1 = TABLE.r + STAIR.run, rise = top / STAIR.steps, step = STAIR.run / STAIR.steps;
  for (const z of [STAIR.z0, STAIR.z1]) {
    const s = strut(V(sx0 - 2, top - 2.5, z), V(sx1 + 1, 2.5, z), 6, 1.6, 0.5);
    p.add(s.g, 'steel', s.m, true);
  }
  p.add(cbox(10, 1.6, STAIR.z1 - STAIR.z0 + 6, 0.5), 'steel', at(sx1 - 1, 0.8, (STAIR.z0 + STAIR.z1) / 2));
  for (let i = 1; i < STAIR.steps; i++) {
    const x = sx0 + step * (i - 0.5) + 1, y = top - rise * i;
    p.add(cbox(step + 1, 1.3, STAIR.z1 - STAIR.z0 - 1.6, 0.3), 'grate', at(x, y, (STAIR.z0 + STAIR.z1) / 2));
    p.add(cbox(1, 1.6, STAIR.z1 - STAIR.z0 - 1.6, 0.3), 'rail', at(x + step / 2 + 0.2, y + 0.1, (STAIR.z0 + STAIR.z1) / 2));
  }
  const zr = STAIR.z1 + 0.5;
  const railTop = (x: number) => top - ((x - sx0) / STAIR.run) * top + railH;
  for (const x of [sx0 + 2, sx0 + STAIR.run / 2, sx1 - 2]) p.add(cbox(1.7, railH, 1.7, 0.4), 'steel', at(x, railTop(x) - railH / 2 + 0.5, zr));
  {
    const s = strut(V(sx0 + 2, railTop(sx0 + 2), zr), V(sx1 - 2, railTop(sx1 - 2), zr), 1.9, 1.9, 0.9);
    p.add(s.g, 'rail', s.m);
    const t = strut(V(sx0 + 2, railTop(sx0 + 2) - railH * 0.45, zr), V(sx1 - 2, railTop(sx1 - 2) - railH * 0.45, zr), 1.4, 1.4, 0.65);
    p.add(t.g, 'rail', t.m);
  }
  await slice();

  // On the deck: the box the tower's lines come out of, and the trays that carry them to the hold downs.
  p.add(rbox(16, 11, 12, 0.8, 2), 'black', at(TOWER.r + 13, top + 5.5, -HALF_Z + 16), true);
  p.add(cbox(14.4, 0.8, 0.6, 0.2), 'bright', at(TOWER.r + 13, top + 8.6, -HALF_Z + 22.1));
  for (const dz of [-3, 3]) p.add(cyl(0.9, 0.6, 12).rotateX(Math.PI / 2), 'copper', at(TOWER.r + 18, top + 4, -HALF_Z + 22 + dz * 0));
  p.add(cbox(36, 2, 6, 0.5), 'grate', at(TOWER.r + 39, top + 1, -HALF_Z + 16));

  // The hold downs, one at each of the rocket's feet: a plate bolted to the deck under the foot, and a jaw either side
  // of the fin that holds the foot down and falls open as the rocket lifts, each on a pin along its foot.
  const jaws: { group: THREE.Group; side: number }[] = [];
  const jp = new Parts(m);
  for (let i = 0; i < 4; i++) {
    const a = HOLD.angles[i], dir = V(Math.sin(a), 0, Math.cos(a)), side = V(dir.z, 0, -dir.x), foot = dir.clone().multiplyScalar(HOLD.r).setY(top);
    const yaw = Math.atan2(-dir.z, dir.x);
    p.add(cbox(HOLD.plate, 0.8, HOLD.plate, 0.3), 'steel', xf({ p: [foot.x, top + 0.4, foot.z], r: [0, yaw, 0] }), true);
    for (const u of [-1, 1]) for (const v of [-1, 1]) bolt(p, foot.clone().addScaledVector(dir, u * (HOLD.plate / 2 - 1.6)).addScaledVector(side, v * (HOLD.plate / 2 - 1.6)).setY(top + 0.8), V(0, 1, 0), 'copper', 0.65);
    for (const sd of [-1, 1]) {
      const g = new THREE.Group();
      g.position.copy(foot).addScaledVector(side, sd * (HOLD.gap + HOLD.jaw)).setY(top + 0.8);
      g.rotation.set(0, yaw, 0, 'YXZ');
      // Built in the jaw's own frame: x along the fin, y up, and z toward the fin times sd, with the pin at the
      // origin on the jaw's outer foot.
      const zi = sd * HOLD.jaw;
      jp.add(cbox(HOLD.long, HOLD.tall, HOLD.jaw, 0.5), 'steel', at(0, HOLD.tall / 2, zi / 2), true);
      jp.add(cbox(HOLD.long, 1.6, HOLD.lip, 0.4), 'black', at(0, HOLD.tall - 0.8, zi + (sd * HOLD.lip) / 2 - sd * 0.3), true);
      jp.add(cyl(0.9, HOLD.long + 2, 10).rotateZ(Math.PI / 2), 'bright', at(0, 0.9, -sd * 0.3));
      jp.build(g, `hold${i}${sd}`);
      group.add(g);
      jaws.push({ group: g, side: sd });
    }
  }

  const tris = p.tris + jp.tris;
  p.build(group, 'table');
  return { group, tris, jaws };
}
