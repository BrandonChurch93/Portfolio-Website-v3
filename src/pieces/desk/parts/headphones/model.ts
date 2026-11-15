import * as THREE from 'three';
import { Builder } from '../../../../world/build';
import {
  ARCH, BASE, BEAR_Y, CANOPY, CUP, FOOT_AT, PAIR_Q, PIVOT, POST, RAIL, SADDLE, STEM, V, canopyUnder, frame, loft, saddleTop, sweep, turned, type Sec,
} from './form';
import type { Handle, HeadphonesMats, Of } from './materials';

// The headphones on their stand, built in the desk's millimetres and merged per material: the stand (a weighted foot,
// a post and a padded saddle), and the pair hanging from it (the band, two rails over a knitted canopy, a housing at
// each end that a stem slides out of, and the cups, each hanging on a pivot at its stem's foot).

const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);

// Two builders, one for the large forms that cast shadows and one for the fine parts that do not, and each piece's
// kind written on its vertices so one material can tell its surfaces apart.
class Parts {
  private cast = new Builder();
  private fine = new Builder();
  get tris() { return this.cast.tris + this.fine.tris; }
  add(geo: THREE.BufferGeometry, h: Handle, m?: THREE.Matrix4, o: { shadow?: boolean } = {}): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!geo.userData.kinds) {
      const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) cell[i * 4] = h.kind;
      g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    }
    const casts = o.shadow ?? h.cast;
    (casts ? this.cast : this.fine).add(g, h.mat, m, { shadow: casts });
  }
  build(parent: THREE.Object3D, name: string): THREE.Mesh[] {
    return [...this.cast.build(parent, name), ...this.fine.build(parent, `${name}-fine`)];
  }
}

// A loft that carries its own kinds.
const own = (g: THREE.BufferGeometry) => { g.userData.kinds = true; return g; };

function addTurn(b: Parts, pts: [number, number][], h: Handle, m: THREE.Matrix4, seg = 96): void {
  for (const g of turned(pts, seg)) b.add(g, h, m);
}

// A knurled crown standing on y from 0 to h.
function crown(r: number, h: number, ridges: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, h, ridges * 4, 2);
  g.translate(0, h / 2, 0);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z), y = p.getY(i);
    if (rr < r * 0.6) continue;
    const a = Math.atan2(z, x), edge = y > h - 0.01 || y < 0.01 ? 0.6 : 1;
    const k = 1 - 0.07 * edge * (0.5 + 0.5 * Math.cos(a * ridges));
    p.setX(i, (x / rr) * r * k); p.setZ(i, (z / rr) * r * k);
  }
  g.computeVertexNormals();
  return g;
}

export interface HeadphonesModel {
  group: THREE.Group;
  // Turns about the bearing point for the swing.
  swing: THREE.Group;
  // Each cup on its pivot, turned for its lag behind the band.
  cups: [THREE.Group, THREE.Group];
  meshes: THREE.Mesh[];
  tris: number;
}

export function buildHeadphones(of: Of, kindOf: Record<string, number>, mats: HeadphonesMats): HeadphonesModel {
  const group = new THREE.Group();
  group.name = 'headphones';
  const meshes: THREE.Mesh[] = [];
  let tris = 0;
  const keep = (b: Parts, parent: THREE.Object3D, name: string) => { tris += b.tris; meshes.push(...b.build(parent, name)); };

  // ---- the stand -----------------------------------------------------------------------------------------------
  const stand = new THREE.Group();
  stand.position.copy(FOOT_AT);
  stand.quaternion.copy(PAIR_Q);
  group.add(stand);
  {
    const b = new Parts(), I = new THREE.Matrix4(), H = BASE.h, R = BASE.r;
    // The foot: felt under it, a heavy turned body of dark steel with a polished chamfer, a fine groove turned into its
    // top, and a domed rise to the boss the post stands in.
    addTurn(b, [[0.01, 0.02], [R - 2, 0], [R - 0.8, 0.5], [R - 0.4, 1.6]], of.felt, I, 48);
    addTurn(b, [[R - 0.4, 1.5], [R + 0.6, 2.3], [R + 1.2, 3.8], [R + 1.2, H - 4], [R + 0.7, H - 3.2]], of.foot, I, 56);
    addTurn(b, [[R + 0.7, H - 3.2], [R - 2.2, H - 0.6]], of.polish, I, 56);
    addTurn(b, [[R - 2.2, H - 0.6], [R - 3.4, H - 0.3], [R - 9.5, H + 0.25]], of.foot, I, 56);
    addTurn(b, [[R - 9.5, H + 0.25], [R - 10.3, H - 0.5], [R - 11.1, H + 0.35]], of.polish, I, 56);
    addTurn(b, [[R - 11.1, H + 0.35], [R - 24, H + 2.2], [36, H + 4.6], [25, H + 7.4], [19.5, H + 9.6], [17.6, H + 11], [17.2, H + 13]], of.foot, I, 56);
    // The boss: a copper collar the post stands in.
    addTurn(b, [[17.2, H + 13], [16.2, H + 13.6], [11.8, H + 14.4], [11.8, H + 21.2], [11.2, H + 22], [POST.r, H + 22.4]], of.copper, I, 40);
    // The post, tapering a little, brushed along its length.
    addTurn(b, [[POST.r, H + 22], [POST.rTop, POST.top]], of.stand, I, 28);
    // The neck under the cradle: a copper collar, then the post flaring into the cradle's underside.
    const nb = BEAR_Y - SADDLE.pad - SADDLE.deep;
    addTurn(b, [[POST.rTop, POST.top - 1], [8.6, POST.top - 0.4], [9.2, POST.top + 0.6], [9.2, POST.top + 4.6], [8.6, POST.top + 5.4], [POST.rTop + 0.2, POST.top + 6]], of.copper, I, 32);
    addTurn(b, [[POST.rTop + 0.2, POST.top + 5.8], [POST.rTop + 0.4, nb - 5], [8.2, nb], [9.4, nb + 5]], of.stand, I, 28);
    // The cradle: a crescent of blackened steel under the pad, its top on the saddle's curve, its ends rising.
    {
      const s = new THREE.Shape(), top = (x: number) => BEAR_Y - SADDLE.pad + saddleTop(x), h = SADDLE.half + 2;
      const n = 14;
      s.moveTo(-h, top(-h) - 3.5);
      for (let i = 0; i <= n; i++) { const x = -h + (2 * h * i) / n; s.lineTo(x, top(x)); }
      s.lineTo(h, top(h) - 3.5);
      s.bezierCurveTo(h - 6, top(h) - 16, 16, nb + 1, 11, nb);
      s.lineTo(-11, nb);
      s.bezierCurveTo(-16, nb + 1, -h + 6, top(-h) - 16, -h, top(-h) - 3.5);
      const bev = 1.6, d = SADDLE.cradle * 2 - bev * 2;
      const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 10 });
      g.translate(0, 0, -d / 2);
      b.add(g, of.cradle, I);
    }
    // The pad: a padded strip of hide along the saddle's curve, wider than the cradle, its ends rolled under.
    {
      const path: THREE.Vector3[] = [];
      const n = 22, h = SADDLE.half + 2.6;
      for (let i = 0; i <= n; i++) {
        const x = -h + (2 * h * i) / n, y = BEAR_Y + saddleTop(x), sl = x / Math.sqrt(SADDLE.r ** 2 - x * x);
        const nn = V(sl, 1, 0).normalize();
        path.push(V(x, y, 0).addScaledVector(nn, -SADDLE.pad / 2));
      }
      b.add(sweep(path, Z, SADDLE.wide, SADDLE.pad / 2, 3.2, 16, { taper: 3, ends: 0.55 }), of.hide, I);
    }
    // The soft dark the foot stands in, on the timber.
    {
      const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, mats.shadow);
      m.scale.set(R * 2.7, 1, R * 2.7);
      m.position.set(0, 0.25, 0);
      m.renderOrder = 1;
      m.userData.noAO = true;
      stand.add(m);
      tris += 2;
    }
    keep(b, stand, 'hpStand');
  }

  // ---- the pair ---------------------------------------------------------------------------------------------------
  const pair = new THREE.Group();
  pair.position.copy(FOOT_AT).setY(BEAR_Y);
  pair.quaternion.copy(PAIR_Q);
  group.add(pair);
  const swing = new THREE.Group();
  pair.add(swing);

  {
    const b = new Parts();
    // The canopy: a knitted strip whose underside is its arch, pressed up onto the pad where it bears. Its middle stands
    // half its thickness out from that, square to the line.
    const n = 56, under: THREE.Vector3[] = [];
    const end = ARCH.crx;
    under.push(V(-end, ARCH.cy - 7, 0));
    for (let i = 0; i <= n; i++) { const t = Math.PI - (i / n) * Math.PI, x = end * Math.cos(t); under.push(V(x, canopyUnder(x), 0)); }
    under.push(V(end, ARCH.cy - 7, 0));
    const mid = under.map((p, i) => {
      const t = under[Math.min(under.length - 1, i + 1)].clone().sub(under[Math.max(0, i - 1)]);
      const nn = V(-t.y, t.x, 0).normalize();
      if (nn.dot(V(p.x, p.y - ARCH.cy + 20, 0)) < 0) nn.negate();
      return p.clone().addScaledVector(nn, CANOPY.t);
    });
    b.add(sweep(mid, Z, CANOPY.w, CANOPY.t, 6, 12), of.canopy);
    for (const z of [-CANOPY.w + 0.4, CANOPY.w - 0.4]) b.add(sweep(mid.map((p) => V(p.x, p.y, z)), Z, 0.95, CANOPY.t + 0.25, 2, 4), of.binding);

    // The rails: two polished steel bows over the canopy's edges, from housing to housing.
    for (const z of [-RAIL.z, RAIL.z]) {
      const path: THREE.Vector3[] = [V(ARCH.rx, ARCH.cy - 8, z)];
      for (let i = 0; i <= 40; i++) { const t = (i / 40) * Math.PI; path.push(V(ARCH.rx * Math.cos(t), ARCH.cy + ARCH.ry * Math.sin(t), z)); }
      path.push(V(-ARCH.rx, ARCH.cy - 8, z));
      b.add(sweep(path, Z, RAIL.w, RAIL.t, 2.6, 8), of.polish);
    }

    for (const s of [-1, 1]) {
      const x0 = s * STEM.x, m = new THREE.Matrix4().makeTranslation(x0, 0, 0);
      // The housing at the band's end: a sculpted capsule in the cups' steel, taking in the rails and the canopy at
      // its top and narrowing to its foot, where the stem slides out. A polished band rings it under the rails.
      const hs: Sec[] = [
        { x: STEM.top - 0.4, z: 3.6, y: 4.6 }, { x: STEM.top, z: 5.2, y: 6.6 }, { x: STEM.top + 2.4, z: 9.5, y: 7.6 }, { x: STEM.top + 8, z: 15.5, y: 8.2 },
        { x: STEM.top + 16, z: 20.5, y: 8.4 }, { x: ARCH.cy - 4, z: 22, y: 8.4 }, { x: ARCH.cy - 1.4, z: 21.6, y: 7.8 }, { x: ARCH.cy + 0.6, z: 20.4, y: 6 }, { x: ARCH.cy + 1.4, z: 17, y: 2.5 },
      ].map((q) => ({ ...q, kind: kindOf.dark }));
      const hg = own(loft(hs, 3.2, 36, 4, (p) => V(0, p.y, p.z)));
      // The loft runs along x: turned upright it runs up the band's end, with its depth across the band.
      const up = new THREE.Matrix4().makeBasis(Y, X.clone().negate(), Z);
      b.add(hg, of.dark, m.clone().multiply(up));
      const ring: Sec[] = [{ x: ARCH.cy - 7.6, z: 22.2, y: 8.6 }, { x: ARCH.cy - 7.2, z: 22.7, y: 9.1 }, { x: ARCH.cy - 4.8, z: 22.7, y: 9.1 }, { x: ARCH.cy - 4.4, z: 22.2, y: 8.6 }].map((q) => ({ ...q, kind: kindOf.polish }));
      b.add(own(loft(ring, 3.2, 36, 1, (p) => V(0, p.y, p.z))), of.polish, m.clone().multiply(up));
      // The stem: a flat polished bar that slides out of the housing, pulled straight by the cup's weight, with a
      // copper bushing where it leaves.
      const stem = [V(x0, STEM.top + 6, 0), V(x0, STEM.foot + 2, 0)];
      const sp: THREE.Vector3[] = [];
      for (let i = 0; i <= 2; i++) sp.push(stem[0].clone().lerp(stem[1], i / 2));
      b.add(sweep(sp, Z, STEM.w, STEM.t, 2.6, 10), of.polish);
      addTurn(b, [[0.01, 0], [4.6, 0], [5.2, 0.5], [5.2, 1.6], [4.8, 2.1], [0.01, 2.2]], of.copper, frame(V(x0, STEM.top - 1.6, 0), Y, Z).multiply(new THREE.Matrix4().makeScale(1, 1, 0.82)), 24);
    }
    keep(b, swing, 'hpBand');
  }

  // ---- the cups -----------------------------------------------------------------------------------------------------
  const cups: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * STEM.x, PIVOT.y, 0);
    swing.add(pivot);
    const b = new Parts();
    // Built for the right cup, its axis out along +x from the pivot; the left one is the same turned half round.
    const flip = s < 0 ? new THREE.Matrix4().makeRotationY(Math.PI) : new THREE.Matrix4();
    const cx = CUP.joint - STEM.x, cy = CUP.y - PIVOT.y;
    const at = (m: THREE.Matrix4) => flip.clone().multiply(new THREE.Matrix4().makeTranslation(cx, cy, 0)).multiply(m);
    const I = at(new THREE.Matrix4());
    const radial = (p: THREE.Vector3) => V(0, p.y, p.z);
    const { rz, ry, deep, edge, n } = CUP;

    // The shell: from a small step in at the seam, straight sides that draw in a little, a long soft edge, and the
    // face, a shallow dome turned in fine rings.
    const shell: Sec[] = [
      { x: 0.5, z: rz - 2.0, y: ry - 2.0, kind: kindOf.polish }, { x: 1.1, z: rz - 0.9, y: ry - 0.9, kind: kindOf.polish }, { x: 1.8, z: rz - 0.25, y: ry - 0.25, kind: kindOf.polish },
      { x: 2.2, z: rz - 0.05, y: ry - 0.05, kind: kindOf.body }, { x: 2.8, z: rz, y: ry, kind: kindOf.body },
    ];
    const side = deep - edge - 1;
    for (let i = 1; i <= 2; i++) { const k = i / 2, d = 1.3 * k; shell.push({ x: 2.8 + (side - 2.8) * k, z: rz - d, y: ry - d, kind: kindOf.body }); }
    // The soft edge runs most of the way round to the face, and a narrow polished chamfer cut at its foot draws the
    // face's outline in a crisp line.
    const turnTo = (62 * Math.PI) / 180;
    for (let i = 1; i <= 6; i++) { const a = (i / 6) * turnTo, d = 1.3 + edge * (1 - Math.cos(a)); shell.push({ x: side + edge * Math.sin(a), z: rz - d, y: ry - d, kind: kindOf.body }); }
    const x1 = side + edge * Math.sin(turnTo), d1 = 1.3 + edge * (1 - Math.cos(turnTo)), x2 = x1 + 0.9, d2 = d1 + 1.5;
    shell.push({ x: x2, z: rz - d2, y: ry - d2, kind: kindOf.polish });
    const fz = rz - d2, fy = ry - d2;
    for (let i = 0; i <= 7; i++) { const k = 1 - i / 7, kk = Math.max(k, 0.004); shell.push({ x: x2 + 0.9 * (1 - kk * kk), z: fz * kk, y: fy * kk, kind: kindOf.face }); }
    b.add(own(loft(shell, n, 64, 5, radial)), of.body, I);
    // The seam: a dark ring set in between the shell and the cushion.
    b.add(own(loft([{ x: 1.0, z: rz - 1.6, y: ry - 1.6 }, { x: 0, z: rz - 3.4, y: ry - 3.4 }, { x: -0.8, z: rz - 3.4, y: ry - 3.4 }].map((q) => ({ ...q, kind: kindOf.gap })), n, 48, 1, radial)), of.gap, I, { shadow: false });

    // The cushion: a full soft roll from the seam round its face to the opening, its outer wall bellied out past the
    // shell, and the cloth over the driver set back inside.
    const pad = CUP.pad, cushion: Sec[] = [];
    // A welt runs round the outer wall, where the cover's two panels are sewn.
    const prof: [number, number][] = [[-0.8, -2.6], [-2.5, -0.6], [-5.5, 1.2], [-8.5, 1.55], [-9.3, 0.95], [-10.1, 1.55], [-13, 1.5], [-14.5, 1.1]];
    for (let i = 1; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2), r = 6.2; prof.push([-14.5 - (pad - 14.5) * Math.sin(a), 1.1 - r + r * Math.cos(a)]); }
    const f0 = 1.1 - 6.2, f1 = -11.6;
    for (let i = 1; i <= 2; i++) prof.push([-pad - 0.35 * Math.sin((i / 3) * Math.PI), f0 + ((f1 - f0) * i) / 3]);
    for (let i = 0; i <= 5; i++) { const a = (i / 5) * (Math.PI / 2), r = 4.5; prof.push([-pad + r * (1 - Math.cos(a)), f1 - r * Math.sin(a)]); }
    prof.push([-10, -16.5], [-3, -16.1], [-0.6, -15.6]);
    for (const [x, w] of prof) cushion.push({ x, z: rz + w, y: ry + w, kind: kindOf.cushion });
    b.add(own(loft(cushion, 3.0, 48, 2, radial)), of.cushion, I);
    {
      const ins = -16, inner: Sec[] = [];
      for (let i = 0; i <= 3; i++) { const k = 1 - i / 3, kk = Math.max(k, 0.004); inner.push({ x: -2.8 + 0.5 * (1 - kk * kk), z: (rz + ins + 0.6) * kk, y: (ry + ins + 0.6) * kk, kind: kindOf.mesh }); }
      b.add(own(loft(inner, 3.0, 48, 2, () => V(-1, 0, 0))), of.mesh, I, { shadow: false });
    }

    // The pivot at the stem's foot: a polished barrel across the cup's top, held in a short block of the cup's steel
    // that rises from the shell.
    {
      const P = new THREE.Matrix4().makeTranslation(STEM.x - CUP.joint, PIVOT.y - CUP.y, 0);
      const toP = (m: THREE.Matrix4) => I.clone().multiply(P).multiply(m);
      addTurn(b, [[0.01, -PIVOT.half], [PIVOT.r - 0.6, -PIVOT.half], [PIVOT.r, -PIVOT.half + 0.6], [PIVOT.r, PIVOT.half - 0.6], [PIVOT.r - 0.6, PIVOT.half], [0.01, PIVOT.half]], of.polish, toP(frame(V(0, 0, 0), Z, X)), 24);
      const blk = new THREE.Shape();
      blk.moveTo(-6.5, -6.5);
      blk.lineTo(6.5, -6.5);
      blk.bezierCurveTo(5.8, -3, 5, -1.5, 3.6, 0);
      blk.absarc(0, 0, 3.6, 0, Math.PI, false);
      blk.bezierCurveTo(-5, -1.5, -5.8, -3, -6.5, -6.5);
      const d = PIVOT.half * 2 - 6;
      const g = new THREE.ExtrudeGeometry(blk, { depth: d, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 1.2, bevelSegments: 2, curveSegments: 8 });
      g.translate(0, 0, -d / 2);
      b.add(g, of.dark, toP(new THREE.Matrix4()));
      for (const zs of [-1, 1]) addTurn(b, [[0.01, 0], [2.1, 0], [2.2, 0.5], [1.6, 0.9], [0.01, 1.0]], of.copper, toP(frame(V(0, 0, zs * PIVOT.half), Z.clone().multiplyScalar(zs), X)), 24);
    }

    // The crown and a button, on the top of the cup that shows its face: the crown toward the front, knurled copper on
    // a short polished stem, the button a slim polished pill behind the pivot.
    if (s < 0) {
      // The shell's top at a place across it, where its rounded outline has fallen from the middle.
      const topAt = (z: number) => (ry - 1.3) * Math.pow(1 - Math.pow(Math.abs(z) / (rz - 1.3), n), 1 / n);
      const zc = 21, top = topAt(zc + 3.4) - 0.6, u = side - 3;
      // The left cup is the right one turned half round, so its front is the right one's back.
      addTurn(b, [[0.01, 0], [3.4, 0], [3.4, 1.4], [2.6, 2.2], [0.01, 2.2]], of.polish, at(new THREE.Matrix4().makeTranslation(u, top, -zc)), 32);
      b.add(crown(4.3, 5.2, 16), of.copper, at(new THREE.Matrix4().makeTranslation(u, top + 2.1, -zc)));
      addTurn(b, [[0.01, 0], [4.0, 0], [4.3, 0.4], [4.3, 0.8], [3.4, 1.4], [0.01, 1.6]], of.copper, at(new THREE.Matrix4().makeTranslation(u, top + 7.3, -zc)), 32);
      const pill = new THREE.CapsuleGeometry(2.1, 9, 6, 16).rotateX(Math.PI / 2);
      b.add(pill, of.polish, at(new THREE.Matrix4().makeTranslation(u - 1, topAt(16 + 6.5) + 0.5, 16).multiply(new THREE.Matrix4().makeScale(1, 0.55, 1))));
    }
    keep(b, pivot, s < 0 ? 'hpCupL' : 'hpCupR');
    cups.push(pivot);
  }

  return { group, swing, cups: cups as [THREE.Group, THREE.Group], meshes, tris };
}
