import * as THREE from 'three';
import { type Builder, slice } from '../../../../world/build';
import { D2R, KEEL, KIND, POD, RIB, kind, onRing, reach, ribAngles, seen } from './shape';

// What holds the city up: sixteen ribs let into the rock, each anchored under the rim by a plate and bolted down its
// length by clamps, a lift housing half sunk on every rib, and the keel's collar where they all meet, with the mouth
// the main fall leaves by.

// A section swept down a rib: x across the rib, y out from the rock, in units. A T with a broad face plate, its
// outer edges chamfered to catch the light.
const H = RIB.half;
const SECTION: [number, number][] = [[-H, -0.7], [-H + 0.7, 0], [H - 0.7, 0], [H, -0.7], [H, -2.2], [1.8, -2.2], [1.8, -8], [-1.8, -8], [-1.8, -2.2], [-H, -2.2]];

// Sweep a closed section along a path: each edge of the section its own strip, so every edge stays sharp.
function sweep(path: THREE.Vector3[], across: THREE.Vector3[], outs: THREE.Vector3[], sec: [number, number][]): THREE.BufferGeometry {
  const pos: number[] = [];
  const p = (i: number, [x, y]: [number, number]) => path[i].clone().addScaledVector(across[i], x).addScaledVector(outs[i], y);
  for (let e = 0; e < sec.length; e++) {
    const s0 = sec[e], s1 = sec[(e + 1) % sec.length];
    for (let i = 0; i < path.length - 1; i++) {
      const a = p(i, s0), b = p(i, s1), c = p(i + 1, s0), d = p(i + 1, s1);
      pos.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function box(w: number, h: number, d: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d);
}

// A bolt's head, a short six sided prism, standing along +z.
const bolt = (r: number) => new THREE.CylinderGeometry(r, r, r * 0.8, 6).rotateX(Math.PI / 2);

export interface FrameParts { pods: THREE.Vector3[] }

export async function frame(b: Builder, made: THREE.Material): Promise<FrameParts> {
  const pods: THREE.Vector3[] = [];
  const ribs = ribAngles();
  for (const phi of ribs.filter(seen)) {
    const t = phi * D2R, out = new THREE.Vector3(Math.sin(t), 0, Math.cos(t)), side = new THREE.Vector3(Math.cos(t), 0, -Math.sin(t));
    const path: THREE.Vector3[] = [], across: THREE.Vector3[] = [], outs: THREE.Vector3[] = [];
    const steps = 52;
    for (let i = 0; i <= steps; i++) {
      const d = RIB.from + ((RIB.to - RIB.from) * i) / steps;
      path.push(out.clone().multiplyScalar(reach(d) + RIB.out).setY(-d));
    }
    for (let i = 0; i <= steps; i++) {
      const tan = path[Math.min(steps, i + 1)].clone().sub(path[Math.max(0, i - 1)]).normalize();
      const o = new THREE.Vector3().crossVectors(side, tan).normalize();
      if (o.dot(out) < 0) o.negate();
      across.push(side.clone());
      outs.push(o);
    }
    b.add(kind(sweep(path, across, outs, SECTION), KIND.steel), made);

    // Clamps down its length, each a band over the rib bolted either side into the rock.
    for (let d = RIB.from + 30; d < RIB.to - 8; d += 44) {
      if (Math.abs(d - POD.d) < POD.tall / 2 + 5) continue;
      const i = Math.round(((d - RIB.from) / (RIB.to - RIB.from)) * steps), at = path[i], o = outs[i];
      const m = new THREE.Matrix4().makeBasis(side, new THREE.Vector3().crossVectors(o, side), o).setPosition(at);
      b.add(kind(box(RIB.half * 2 + 5, 3.2, 2.4), KIND.bronze), made, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.4)));
    }
    await slice();

    // The anchor under the rim: a broad plate on the cliff, a boss where the rib meets it, and bolts round it.
    const da = RIB.from + 7, ra = reach(da) + RIB.out + 0.6;
    const plate = onRing(phi, ra, -da);
    b.add(kind(box(26, 15, 2.2), KIND.steel), made, plate);
    b.add(kind(box(20, 10, 1.2), KIND.bronze), made, plate.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 1.4)));
    b.add(kind(new THREE.CylinderGeometry(3.6, 4.2, 3, 16).rotateX(Math.PI / 2), KIND.copper), made, plate.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 2.6)));
    for (const [x, y] of [[-11, -5.5], [11, -5.5], [-11, 5.5], [11, 5.5]]) b.add(kind(bolt(0.95), KIND.steel), made, plate.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, 1.6)));

    // The lift housing: an upright drum with domed ends, two copper bands, and vents that glow.
    const rp = reach(POD.d) - RIB.deep + POD.r * 0.62, h = POD.tall / 2, R = POD.r;
    const drum: [number, number][] = [[0, -h - 3], [R * 0.55, -h - 2.4], [R * 0.85, -h - 0.6], [R, -h + 2], [R, h - 2], [R * 0.85, h + 0.6], [R * 0.55, h + 2.4], [0, h + 3]];
    const pm = onRing(phi, rp, -POD.d);
    b.add(kind(new THREE.LatheGeometry(drum.map(([x, y]) => new THREE.Vector2(x, y)), 20), KIND.steel), made, pm);
    for (const y of [-h + 4.5, h - 4.5]) b.add(kind(new THREE.CylinderGeometry(R + 0.7, R + 0.7, 2, 20, 1, true), KIND.bronze), made, pm.clone().multiply(new THREE.Matrix4().makeTranslation(0, y, 0)));
    // The vent: one slot of light round the drum's waist under a hood, breathing slowly.
    const phase = (phi / 360) * 0.97;
    b.add(kind(new THREE.CylinderGeometry(R + 0.1, R + 0.1, 1.8, 20, 1, true), KIND.light, 0.3, 1.2, 1 + phase), made, pm);
    for (const yy of [1.5, -1.5]) b.add(kind(new THREE.CylinderGeometry(R + (yy > 0 ? 0.6 : 1.6), R + (yy > 0 ? 1.6 : 0.6), 1.2, 20, 1, true), KIND.steel), made, pm.clone().multiply(new THREE.Matrix4().makeTranslation(0, yy, 0)));
    pods.push(new THREE.Vector3(Math.sin(t) * (rp + R + 4), -POD.d, Math.cos(t) * (rp + R + 4)));
    await slice();
  }

  // The keel: a flange the ribs land on, then a spike of machined steel in three sections, each set into the one above
  // with a recessed joint lit from inside, vanes on every other rib's line, and the mouth: a copper lip and a dark
  // throat.
  const y = (d: number) => -d, F = KEEL.flange, M = KEEL.mouth, T = KEEL.top;
  const sections: [number, number, number, number][] = [[F - 6, T + 6, 58, T + 18], [54, T + 20, 42, T + 31], [38, T + 33, 27, M - 4]];
  const body: [number, number][] = [[0, y(T - 4)], [F - 10, y(T - 4)], [F, y(T)], [F, y(T + 4)], [F - 1.5, y(T + 5)]];
  sections.forEach(([r0, d0, r1, d1], i) => {
    body.push([r0, y(d0)], [r1, y(d1)]);
    if (i + 1 < sections.length) body.push([r1 - 4, y(d1 + 0.4)], [sections[i + 1][0], y(sections[i + 1][1] - 0.2)]);
  });
  b.add(kind(new THREE.LatheGeometry(body.map(([x, v]) => new THREE.Vector2(x, v)), 72), KIND.steel), made);
  sections.slice(0, 2).forEach(([, , r1, d1], i) => {
    b.add(kind(new THREE.CylinderGeometry(r1 - 2.6, r1 - 2.6, 1.1, 96, 1, true), KIND.light, 0.4 + 0.15 * i, 0.9), made, new THREE.Matrix4().makeTranslation(0, y(d1 + 1.0), 0));
  });
  const lip: [number, number][] = [[27, y(M - 4)], [30, y(M - 1.6)], [29.4, y(M)], [22, y(M)], [20.5, y(M - 1.6)]];
  b.add(kind(new THREE.LatheGeometry(lip.map(([x, v]) => new THREE.Vector2(x, v)), 72), KIND.copper), made);
  const throat: [number, number][] = [[20.5, y(M - 1.6)], [16, y(M - 8)], [0, y(M - 10)]];
  b.add(kind(new THREE.LatheGeometry(throat.map(([x, v]) => new THREE.Vector2(x, v)), 48), KIND.dark), made);
  for (const phi of ribs.filter((_, i) => i % 2 === 0)) {
    const s = new THREE.Shape([new THREE.Vector2(F - 8, y(T + 5)), new THREE.Vector2(F + 2, y(T + 5)), new THREE.Vector2(36, y(M - 8)), new THREE.Vector2(30, y(M - 8))]);
    const g = new THREE.ExtrudeGeometry(s, { depth: 2.2, bevelEnabled: false }).translate(0, 0, -1.1);
    // The shape is drawn in x (out from the middle) and y; turn x to point along the rib's bearing.
    g.rotateY(-Math.PI / 2);
    b.add(kind(g, KIND.steel), made, new THREE.Matrix4().makeRotationY(phi * D2R));
    await slice();
  }
  return { pods };
}

