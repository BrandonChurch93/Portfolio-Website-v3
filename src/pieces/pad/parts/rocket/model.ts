import * as THREE from 'three';
import { Builder, cyl, rbox, slice } from '../../../../world/build';
import { BELL, FIN, H, PLATES, PORTS, R, R2, RACEWAY, ogive, round } from './form';
import { GRAIN, K, LIGHT, type KindName } from './materials';

// The rocket, built in units up from its engine's mouth and merged per material: the bell with its tubes, manifold
// and actuators, the heat shield, the turned steel skirt, the wound carbon tank, the interstage with its vents and
// copper rims, the upper stage with its ports, the collar, the nose and its spike, the four fins standing on their
// feet, the raceway up the side with its line of light, and the plates the tower's arms reach.

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

interface Mark { light?: number; skin?: boolean; fin?: boolean; grain?: number; shadow?: boolean }

// Two builders, one for the large forms that cast shadows and one for the fine parts that do not. Each piece's kind,
// whether it is skin, which light it is and its grain are written on its vertices.
class Parts {
  private cast = new Builder();
  private fine = new Builder();
  constructor(private mat: THREE.Material) {}
  get tris() { return this.cast.tris + this.fine.tris; }
  add(geo: THREE.BufferGeometry, kind: KindName, m?: THREE.Matrix4, o: Mark = {}): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
    const grain = o.grain ?? (kind === 'steel' || kind === 'bell' || kind === 'dark' ? GRAIN.round : kind === 'graphite' ? GRAIN.round : GRAIN.none);
    for (let i = 0; i < n; i++) cell.set([K[kind], o.skin ? 1 : o.fin ? 2 : 0, o.light ?? 0, grain], i * 4);
    g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    const casts = o.shadow ?? false;
    (casts ? this.cast : this.fine).add(g, this.mat, m, { shadow: casts });
  }
  build(parent: THREE.Object3D): THREE.Mesh[] {
    return [...this.cast.build(parent, 'rocket'), ...this.fine.build(parent, 'rocket-fine')];
  }
}

// A turned profile, [radius, height] in order, cut into runs at its sharp corners so each turned edge keeps a crisp
// line of light.
function turned(pts: [number, number][], seg: number, crease = 30): THREE.BufferGeometry[] {
  const runs: [number, number][][] = [[pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    const cur = runs[runs.length - 1];
    cur.push(pts[i]);
    if (i < pts.length - 1) {
      const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), b = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
      let d = Math.abs(a - b) * (180 / Math.PI);
      if (d > 180) d = 360 - d;
      if (d > crease) runs.push([pts[i]]);
    }
  }
  return runs.filter((r) => r.length > 1).map((r) => new THREE.LatheGeometry(r.map(([x, y]) => new THREE.Vector2(Math.max(x, 0.0001), y)), seg));
}
const turn = (b: Parts, pts: [number, number][], kind: KindName, o: Mark = {}, seg = 160) => { for (const g of turned(pts, seg)) b.add(g, kind, undefined, o); };

// A frame standing on the body's skin at an angle round it and a height: x round the body, y up it, z out of it.
function onSkin(a: number, r: number, h: number, tilt = 0): THREE.Matrix4 {
  const out = V(Math.sin(a), 0, Math.cos(a)), across = V(Math.cos(a), 0, -Math.sin(a));
  const n = out.clone().multiplyScalar(Math.cos(tilt)).add(V(0, Math.sin(tilt), 0)), up = n.clone().cross(across);
  return new THREE.Matrix4().makeBasis(across, up, n).setPosition(V(...round(a, r, h)));
}

// A rod between two points.
function rod(b: Parts, p: THREE.Vector3, q: THREE.Vector3, r: number, kind: KindName, o: Mark = {}, seg = 16): void {
  const d = q.clone().sub(p), len = d.length();
  const m = new THREE.Matrix4().makeBasis(...frameAlong(d)).setPosition(p.clone().addScaledVector(d, 0.5));
  b.add(cyl(r, len, seg), kind, m, { grain: GRAIN.along, ...o });
}
function frameAlong(d: THREE.Vector3): [THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  const y = d.clone().normalize(), t = Math.abs(y.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  const x = t.clone().cross(y).normalize(), z = x.clone().cross(y);
  return [x, y, z];
}

export async function buildRocket(mat: THREE.Material): Promise<{ group: THREE.Group; tris: number; meshes: THREE.Mesh[] }> {
  const b = new Parts(mat);
  const group = new THREE.Group();

  // ---- the engine: the bell, its tubes and manifold, the actuators and the plumbing --------------------------------
  turn(b, BELL, 'bell', { shadow: true }, 96);
  const inner = BELL.slice(0, -1).map(([r, y]) => [r - 0.7, y + 0.15] as [number, number]).reverse();
  turn(b, inner, 'bell', {}, 96);
  b.add(new THREE.TorusGeometry(BELL[0][0] - 0.3, 0.55, 8, 96).rotateX(Math.PI / 2), 'dark', undefined, {});
  b.add(new THREE.TorusGeometry(11.1, 1.05, 10, 64).rotateX(Math.PI / 2), 'copper', new THREE.Matrix4().makeTranslation(0, 15.8, 0));
  b.add(new THREE.TorusGeometry(18.9, 0.6, 8, 72).rotateX(Math.PI / 2), 'copper', new THREE.Matrix4().makeTranslation(0, 4.6, 0));
  b.add(cyl(9.6, 5, 48), 'dark', new THREE.Matrix4().makeTranslation(0, 20, 0));
  for (const s of [-1, 1]) {
    // The gimbal's actuators at the sides, from the thrust structure to the bell's shoulder.
    const top = V(s * 21, H.shield - 0.2, 4), foot = V(s * 14.2, 11.5, 3);
    rod(b, top, foot, 1.25, 'steel');
    rod(b, top, top.clone().lerp(foot, 0.45), 2.1, 'dark');
    b.add(new THREE.SphereGeometry(1.7, 12, 8), 'dark', new THREE.Matrix4().makeTranslation(foot.x, foot.y, foot.z));
  }
  for (const a of [0.55, 2.2, 3.7, 5.3]) {
    // Feed lines from under the shield down to the manifold.
    const p0 = V(Math.sin(a) * 17, H.shield - 0.3, Math.cos(a) * 17), p1 = V(Math.sin(a) * 15, 18.5, Math.cos(a) * 15), p2 = V(Math.sin(a) * 12, 16.6, Math.cos(a) * 12);
    const c = new THREE.CatmullRomCurve3([p0, p1, p2]);
    b.add(new THREE.TubeGeometry(c, 10, 0.75, 8, false), 'steel', undefined, { grain: GRAIN.none });
    b.add(cyl(1.15, 1.4, 12), 'copper', new THREE.Matrix4().makeBasis(...frameAlong(p2.clone().sub(p1))).setPosition(p2));
  }

  await slice();
  // ---- the body, turned: shield, skirt, tank, interstage, upper stage, collar, nose ----------------------------------
  turn(b, [[9.4, H.shield], [R - 3.5, H.shield], [R - 1.2, H.shield + 1.4], [R, H.skirt - 0.6], [R, H.skirt]], 'black', { shadow: true });
  // The skirt in turned steel, a chamfer at each end.
  turn(b, [[R, H.skirt], [R, H.tank - 1.6], [R - 0.7, H.tank - 1]], 'steel', { skin: true, shadow: true });
  // A slit of light between each two sections, set back under their edges.
  const slit = (h0: number, h1: number, r: number) => b.add(cyl(r, h1 - h0, 128, r, true), 'diffuser', new THREE.Matrix4().makeTranslation(0, (h0 + h1) / 2, 0), { light: LIGHT.slit });
  slit(H.tank - 1.1, H.tank + 1.1, R - 0.8);
  turn(b, [[R - 0.7, H.tank + 1], [R, H.tank + 1.6], [R, H.inter - 1.6], [R - 0.7, H.inter - 1]], 'graphite', { skin: true, shadow: true });
  slit(H.inter - 1.1, H.inter + 0.6, R - 0.8);
  // The interstage: copper rims, turned steel between them with vents round it.
  const rim = (h: number, r: number) => turn(b, [[r - 0.8, h], [r + 0.3, h + 0.3], [r + 0.6, h + 1], [r + 0.6, h + 2], [r + 0.3, h + 2.7], [r - 0.8, h + 3]], 'copper', { shadow: true }, 160);
  rim(H.inter + 0.4, R);
  turn(b, [[R - 0.4, H.inter + 3.3], [R, H.inter + 3.6], [R, H.upper - 3.6], [R - 0.4, H.upper - 3.3]], 'steel', { skin: true, shadow: true });
  rim(H.upper - 3.4, R);
  for (let k = 0; k < 12; k++) {
    const a = ((k + 0.5) / 12) * Math.PI * 2, hm = (H.inter + H.upper) / 2;
    b.add(rbox(5.4, 15, 2.2, 0.7), 'dark', onSkin(a, R + 0.6, hm));
    b.add(rbox(2.2, 11.6, 0.8, 0.3), 'diffuser', onSkin(a, R + 1.85, hm), { light: LIGHT.vent });
    for (const dy of [-4.2, -1.4, 1.4, 4.2]) b.add(rbox(3.2, 0.7, 0.9, 0.25), 'dark', onSkin(a, R + 2.15, hm + dy));
  }
  slit(H.upper - 0.6, H.upper + 1.1, R2 - 0.8);
  // A step in from the interstage to the slimmer upper stage.
  turn(b, [[R - 0.4, H.upper - 0.6], [R2 - 0.8, H.upper - 0.6]], 'dark');
  turn(b, [[R2 - 0.7, H.upper + 1], [R2, H.upper + 1.6], [R2, H.collar - 1.2], [R2 - 0.6, H.collar - 0.6]], 'graphite', { skin: true, shadow: true });
  // The collar in turned steel, a copper ring, and the slit the nose lights from.
  turn(b, [[R2 - 0.6, H.collar - 0.6], [R2 + 0.4, H.collar - 0.2], [R2 + 0.6, H.collar + 0.6], [R2 + 0.6, H.nose - 3.4], [R2 + 0.3, H.nose - 3]], 'steel', { shadow: true });
  rim(H.nose - 3.2, R2 + 0.2);
  slit(H.nose - 0.4, H.nose + 1.2, R2 - 0.8);
  const nose: [number, number][] = [[R2 - 0.7, H.nose + 0.9], [R2, H.nose + 1.5]];
  const top = H.tip - H.nose - 3.5;
  for (let i = 1; i <= 48; i++) { const y = 1.5 + ((top - 1.5) * i) / 48; nose.push([ogive(y), H.nose + y]); }
  turn(b, nose, 'graphite', { skin: true, shadow: true }, 160);
  const capR = ogive(top);
  // The spike: a blackened cap, a turned needle, a ring part way up, and the beacon at its tip.
  turn(b, [[capR, H.nose + top], [capR * 0.9, H.nose + top + 2.5], [2.1, H.nose + top + 4.5], [1.6, H.nose + top + 6]], 'dark', {}, 48);
  turn(b, [[1.6, H.nose + top + 6], [1.15, H.spike - 16], [1.5, H.spike - 15.4], [1.5, H.spike - 13.6], [1, H.spike - 13], [0.45, H.spike - 3.2]], 'steel', { grain: GRAIN.along }, 32);
  b.add(new THREE.SphereGeometry(1.25, 16, 12), 'diffuser', new THREE.Matrix4().makeTranslation(0, H.spike - 1.25, 0), { light: LIGHT.beacon });

  await slice();
  // ---- the fins: blackened steel, swept and chamfered, a copper leading edge, a root fairing with its bolts, a foot ----
  const finShape = new THREE.Shape([
    new THREE.Vector2(R - 1, FIN.rootLo), new THREE.Vector2(R - 1, FIN.rootHi), new THREE.Vector2(FIN.out - 1.4, FIN.tipHi + 2),
    new THREE.Vector2(FIN.out - 1.4, FIN.foot + 4), new THREE.Vector2(FIN.out - 5, FIN.foot + 4.5),
  ]);
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: FIN.thick - 1.6, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 2, curveSegments: 1 });
  finGeo.translate(0, 0, -(FIN.thick - 1.6) / 2);
  const lead0 = V(R + 0.6, FIN.rootHi - 1.2, 0), lead1 = V(FIN.out - 0.9, FIN.tipHi + 1.8, 0);
  for (const a of FIN.angles) {
    const spin = new THREE.Matrix4().makeRotationY(a - Math.PI / 2);
    b.add(finGeo, 'dark', spin, { shadow: true, grain: GRAIN.none, fin: true });
    const lead = new THREE.TubeGeometry(new THREE.LineCurve3(lead0, lead1), 1, 0.95, 10, false);
    b.add(lead, 'copper', spin, { grain: GRAIN.none });
    // The root fairing, and its bolts down each side.
    const fair = rbox(1.8, FIN.rootHi - FIN.rootLo + 6, 7.6, 0.7);
    b.add(fair, 'dark', new THREE.Matrix4().makeTranslation(R + 0.6, (FIN.rootLo + FIN.rootHi) / 2, 0).premultiply(spin), { grain: GRAIN.along });
    for (let y = FIN.rootLo + 2; y <= FIN.rootHi; y += 9) for (const z of [-2.6, 2.6]) b.add(cyl(0.75, 0.8, 10).rotateZ(Math.PI / 2), 'steel', new THREE.Matrix4().makeTranslation(R + 1.7, y, z).premultiply(spin), { grain: GRAIN.none });
    // A doubler of carbon on each face by the root, screwed through.
    for (const side of [-1, 1]) {
      const z = side * (FIN.thick / 2 + 0.25);
      b.add(rbox(22, 44, 0.7, 0.3), 'graphite', new THREE.Matrix4().makeTranslation(R + 13, 60, z).premultiply(spin), { grain: GRAIN.none });
      for (const [dx, dy] of [[-8.5, -18.5], [8.5, -18.5], [-8.5, 18.5], [8.5, 18.5], [-8.5, 0], [8.5, 0]]) b.add(cyl(0.7, 0.6, 10).rotateX(Math.PI / 2), 'steel', new THREE.Matrix4().makeTranslation(R + 13 + dx, 60 + dy, z + side * 0.5).premultiply(spin), { grain: GRAIN.none });
    }
    // The foot the fin stands on, and its pad on the hold down.
    b.add(rbox(10, 6.4, 6.6, 1), 'dark', new THREE.Matrix4().makeTranslation(FIN.out - 4.6, FIN.foot + 4.2, 0).premultiply(spin), { shadow: true });
    b.add(rbox(10.8, 1.4, 7.4, 0.4), 'black', new THREE.Matrix4().makeTranslation(FIN.out - 4.6, FIN.foot + 0.7, 0).premultiply(spin));
    b.add(cyl(1.3, 1.2, 14).rotateZ(Math.PI / 2), 'copper', new THREE.Matrix4().makeTranslation(FIN.out + 0.4, FIN.foot + 4.4, 0).premultiply(spin), { grain: GRAIN.none });
  }

  await slice();
  // ---- the raceway up the side, and the line of light on its face ---------------------------------------------------
  for (const [lo, hi, r] of [[RACEWAY.lo, H.inter - 2, R], [H.upper + 2, RACEWAY.hi, R2]] as const) {
    const mid = (lo + hi) / 2, len = hi - lo;
    b.add(rbox(RACEWAY.w, len, RACEWAY.out, 0.9), 'dark', onSkin(RACEWAY.a, r + RACEWAY.out / 2 - 0.3, mid), { grain: GRAIN.along, shadow: true });
    b.add(rbox(1.5, len - 3, 0.7, 0.3), 'diffuser', onSkin(RACEWAY.a, r + RACEWAY.out - 0.1, mid), { light: LIGHT.line });
    for (let y = lo + 6; y < hi - 3; y += 24) for (const s of [-1, 1]) b.add(cyl(0.6, 0.7, 8).rotateX(Math.PI / 2), 'steel', onSkin(RACEWAY.a + (s * (RACEWAY.w / 2 - 1)) / r, r + RACEWAY.out - 0.1, y), { grain: GRAIN.none });
  }

  // ---- the ports, and the plates the tower's arms reach ---------------------------------------------------------------
  for (const p of PORTS) {
    b.add(new THREE.TorusGeometry(p.r + 0.7, 0.85, 10, 40), 'dark', onSkin(p.a, R2 + 0.35, p.h), { grain: GRAIN.none });
    b.add(new THREE.TorusGeometry(p.r + 0.05, 0.3, 8, 40), 'copper', onSkin(p.a, R2 + 0.5, p.h), { grain: GRAIN.none });
    b.add(new THREE.CircleGeometry(p.r, 40), 'glass', onSkin(p.a, R2 + 0.2, p.h), { light: LIGHT.port });
  }
  for (const h of PLATES.h) {
    const y = h - H.nose, onNose = y > 0, r = onNose ? ogive(y) : h > H.upper ? R2 : R;
    const tilt = onNose ? Math.atan(-(ogive(y + 1) - ogive(y - 1)) / 2) : 0;
    const at = (out: number) => onSkin(PLATES.a, r + out * Math.cos(tilt), h + out * Math.sin(tilt), tilt);
    b.add(rbox(PLATES.w, PLATES.t, 1.8, 0.6), 'dark', at(0.6), { shadow: true });
    b.add(new THREE.TorusGeometry(2.7, 0.7, 10, 28), 'copper', at(1.6), { grain: GRAIN.none });
    b.add(new THREE.CircleGeometry(2.1, 24), 'black', at(1.5));
    for (const [dx, dy] of [[-3.8, -4.6], [3.8, -4.6], [-3.8, 4.6], [3.8, 4.6]]) b.add(cyl(0.6, 0.6, 8).rotateX(Math.PI / 2), 'steel', at(1.6).multiply(new THREE.Matrix4().makeTranslation(dx, dy, 0)), { grain: GRAIN.none });
  }

  await slice();
  const tris = b.tris;
  const meshes = b.build(group);
  for (const m of meshes) m.receiveShadow = true;
  return { group, tris, meshes };
}
