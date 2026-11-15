import * as THREE from 'three';
import { Builder } from '../../../../world/build';
import {
  ARCH, BASE, BEAR_Y, BUTTON, CANOPY, CROWN, CUP, CUSHION, FOOT_AT, HOOK, HOUSING, JOINT, KNUCKLE, PAIR_Q, PIVOT, POST, RAIL, SADDLE, SHELL, STEM, V, canopyUnder, frame, loft, railAt, saddleTop, sweep, turned, type Sec,
} from './form';
import type { Handle, HeadphonesMats, Of } from './materials';

// His AirPods Max on his stand, built in the desk's millimetres and merged per material. The stand is the site's
// own: a weighted foot with a hide pad let into its top, a knuckle on its boss with a pin across it, a tapering post
// with a cable hook, and a padded saddle. The pair hangs from it by its canopy: two soft coated rails arching over a
// knit canopy, joined at each end in a housing a polished steel stem slides out of, and the cups, each a one piece
// aluminium shell hanging on a hinge in its top, with a deep knitted cushion. The Digital Crown and the noise
// control button stand on the top of the right cup.

const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);

// Two builders, one for the large forms that cast shadows and one for the fine parts that do not, and each piece's
// kind written on its vertices so one material can tell its surfaces apart. With `local`, a piece also carries its
// own position before it is placed, for patterns laid out in the cup's own frame.
class Parts {
  private cast = new Builder();
  private fine = new Builder();
  get tris() { return this.cast.tris + this.fine.tris; }
  add(geo: THREE.BufferGeometry, h: Handle, m?: THREE.Matrix4, o: { shadow?: boolean; local?: boolean } = {}): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const n = g.getAttribute('position').count;
    if (!geo.userData.kinds) {
      const cell = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) cell[i * 4] = h.kind;
      g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    }
    if (o.local) {
      const cell = g.getAttribute('cell'), p = g.getAttribute('position');
      for (let i = 0; i < n; i++) cell.setXYZW(i, cell.getX(i), p.getX(i), p.getY(i), p.getZ(i));
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

function addTurn(b: Parts, pts: [number, number][], h: Handle, m: THREE.Matrix4, seg: number, o: { shadow?: boolean } = {}): void {
  for (const g of turned(pts, seg)) b.add(g, h, m, o);
}

// A flat plate cut to a shape, `depth` thick, its faces square to z and centred on z = 0, with a soft bevel.
function plate(s: THREE.Shape, depth: number, bev: number, curve = 8): THREE.BufferGeometry {
  const d = Math.max(0.01, depth - bev * 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: curve });
  g.translate(0, 0, -d / 2);
  return g;
}

// The Digital Crown: a knurled aluminium crown standing on y from 0 to h, its top a shallow chamfer to a flat face.
function crown(r: number, h: number, ridges: number): THREE.BufferGeometry {
  const pts: [number, number][] = [[r - 0.5, 0], [r, 0.4], [r, h - 0.7], [r - 0.6, h], [0.01, h]];
  const seg = ridges * 4;
  const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z), y = p.getY(i);
    if (rr < r - 0.45 || y < 0.3 || y > h - 0.6) continue;
    const a = Math.atan2(z, x), k = 1 - 0.1 * Math.abs(Math.cos(a * ridges * 0.5));
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  const out = g.toNonIndexed();
  out.computeVertexNormals();
  return out;
}

// A domed pin head, standing on y from 0.
const PIN_HEAD: [number, number][] = [[0.01, 0], [2.9, 0], [3.1, 0.35], [2.7, 1.0], [1.6, 1.35], [0.01, 1.45]];

export interface HeadphonesModel {
  group: THREE.Group;
  // Turns about the bearing point for the swing.
  swing: THREE.Group;
  // Each cup on its hinge, turned for its lag behind the band.
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
    const b = new Parts(), I = new THREE.Matrix4(), H = BASE.h, R = BASE.r, [pin, pout] = BASE.pad, S = 40;
    // The foot: felt under it, a heavy turned body of dark steel, a polished chamfer round its top, a narrow rim, and
    // the hide pad let in a little below the rim between two polished bevels.
    addTurn(b, [[0.01, 0.02], [R - 2, 0], [R - 0.8, 0.5], [R - 0.4, 1.6]], of.felt, I, 40);
    addTurn(b, [[R - 0.4, 1.5], [R + 0.4, 2.2], [R + 0.8, 3.6], [R + 0.8, H - 1.9], [R + 0.4, H - 1.3]], of.wall, I, S);
    addTurn(b, [[R + 0.4, H - 1.3], [R - 0.9, H]], of.edge, I, S);
    addTurn(b, [[R - 0.9, H], [pout + 1.2, H]], of.foot, I, S);
    addTurn(b, [[pout + 1.2, H], [pout + 0.2, H - 0.6]], of.copper, I, S);
    addTurn(b, [[pout + 0.2, H - 1], [pout, H - BASE.sink + 0.1], [pout - 0.9, H - BASE.sink], [pin + 0.9, H - BASE.sink], [pin, H - BASE.sink + 0.1], [pin - 0.2, H - 1]], of.inlay, I, S);
    // The boss in the middle, turned, with a polished step, and the knuckle's seat on its top.
    const top = H + 7.4;
    addTurn(b, [[pin - 0.2, H - 0.8], [pin - 0.6, H + 0.4], [pin - 1.4, H + 1.1]], of.edge, I, S);
    addTurn(b, [[pin - 1.4, H + 1.1], [BASE.boss + 1.2, H + 2.6], [BASE.boss, H + 3.6], [BASE.boss, H + 5.6], [BASE.boss - 0.6, H + 6.2]], of.foot, I, S);
    addTurn(b, [[BASE.boss - 0.6, H + 6.2], [BASE.boss - 1.6, H + 6.6], [BASE.boss - 2.4, top - 0.2]], of.edge, I, S);
    addTurn(b, [[BASE.boss - 2.4, top - 0.2], [0.01, top]], of.foot, I, 32);

    // The knuckle: two cheeks standing on the boss, a pin across them with a domed copper head at each end, and the
    // post's flat tang between them.
    {
      const K = KNUCKLE, yb = top - 0.5;
      const cheek = new THREE.Shape();
      cheek.moveTo(-9, yb);
      cheek.lineTo(9, yb);
      cheek.bezierCurveTo(8.6, yb + 4, K.r + 0.6, K.y - 4, K.r, K.y);
      cheek.absarc(0, K.y, K.r, 0, Math.PI, false);
      cheek.bezierCurveTo(-K.r - 0.6, K.y - 4, -8.6, yb + 4, -9, yb);
      for (const zs of [-1, 1]) b.add(plate(cheek, K.cheek, 0.5, 12), of.cradle, new THREE.Matrix4().makeTranslation(0, 0, zs * (K.gap + K.cheek / 2)));
      const tang = new THREE.Shape(), tw = POST.r;
      tang.moveTo(-tw, POST.from + 2);
      tang.lineTo(-tw, K.y);
      tang.absarc(0, K.y, tw, Math.PI, Math.PI * 2, false);
      tang.lineTo(tw, POST.from + 2);
      tang.lineTo(-tw, POST.from + 2);
      b.add(plate(tang, K.gap * 2 - 0.5, 0.45, 12), of.stand, I);
      const span = K.gap + K.cheek;
      addTurn(b, [[0.01, -span - 0.1], [K.pin, -span - 0.1], [K.pin, span + 0.1], [0.01, span + 0.1]], of.polish, frame(V(0, K.y, 0), Z, X), 20, { shadow: false });
      for (const zs of [-1, 1]) addTurn(b, PIN_HEAD, of.copper, frame(V(0, K.y, zs * span), Z.clone().multiplyScalar(zs), X), 16, { shadow: false });
      // A polished collar where the round post leaves the tang.
      addTurn(b, [[0.01, POST.from + 1], [POST.r + 0.7, POST.from + 1], [POST.r + 1.1, POST.from + 1.6], [POST.r + 1.1, POST.from + 3.4], [POST.r + 0.6, POST.from + 4], [POST.r - 0.1, POST.from + 4.1]], of.polish, I, 28);
    }

    // The post, tapering a little, brushed along its length.
    addTurn(b, [[POST.r, POST.from + 4], [POST.rTop, POST.top]], of.stand, I, 28);
    // The cable hook: a turned collar clamped round the post, and a rod that runs out to the stand's right and turns
    // up, with a copper ball at its tip.
    {
      const rAt = POST.r + ((POST.rTop - POST.r) * (HOOK.y - POST.from)) / (POST.top - POST.from), c = rAt + 1.6;
      addTurn(b, [[rAt, HOOK.y - 5], [c - 0.6, HOOK.y - 4.8], [c, HOOK.y - 4.2], [c, HOOK.y + 3.2], [c - 0.6, HOOK.y + 3.8], [rAt, HOOK.y + 4]], of.cradle, I, 28);
      const path: THREE.Vector3[] = [], bend = 6, run = HOOK.out - bend;
      for (let i = 0; i <= 3; i++) path.push(V(c - 1 + ((run - c + 1) * i) / 3, HOOK.y, 0));
      for (let i = 1; i <= 7; i++) { const a = (i / 7) * (Math.PI / 2); path.push(V(run + bend * Math.sin(a), HOOK.y + bend * (1 - Math.cos(a)), 0)); }
      path.push(V(HOOK.out, HOOK.y + HOOK.rise, 0));
      b.add(sweep(path, Z, HOOK.r, HOOK.r, 2, 10), of.polish, I, { shadow: false });
      b.add(new THREE.SphereGeometry(HOOK.r + 0.9, 12, 8), of.copper, new THREE.Matrix4().makeTranslation(HOOK.out, HOOK.y + HOOK.rise + 1.2, 0), { shadow: false });
    }
    // The neck under the cradle: a copper collar, then the post flaring into the cradle's underside.
    const nb = BEAR_Y - SADDLE.pad - SADDLE.deep;
    addTurn(b, [[POST.rTop, POST.top - 1], [POST.rTop + 1.6, POST.top - 0.4], [POST.rTop + 2.2, POST.top + 0.6], [POST.rTop + 2.2, POST.top + 4.6], [POST.rTop + 1.6, POST.top + 5.4], [POST.rTop + 0.2, POST.top + 6]], of.copper, I, 28);
    addTurn(b, [[POST.rTop + 0.2, POST.top + 5.8], [POST.rTop + 0.4, nb - 5], [8.2, nb], [9.4, nb + 5]], of.stand, I, 28);
    // The cradle: a crescent of steel under the pad, its top on the saddle's curve, its ends rising.
    {
      const s = new THREE.Shape(), topAt = (x: number) => BEAR_Y - SADDLE.pad + saddleTop(x), h = SADDLE.half + 2;
      const n = 14;
      s.moveTo(-h, topAt(-h) - 3.5);
      for (let i = 0; i <= n; i++) { const x = -h + (2 * h * i) / n; s.lineTo(x, topAt(x)); }
      s.lineTo(h, topAt(h) - 3.5);
      s.bezierCurveTo(h - 6, topAt(h) - 16, 16, nb + 1, 11, nb);
      s.lineTo(-11, nb);
      s.bezierCurveTo(-16, nb + 1, -h + 6, topAt(-h) - 16, -h, topAt(-h) - 3.5);
      b.add(plate(s, SADDLE.cradle * 2, 1.6, 10), of.cradle, I);
    }
    // The pad: a padded strip of hide along the saddle's curve, wider than the cradle, its ends rolled under,
    // stitched along both edges.
    {
      const path: THREE.Vector3[] = [];
      const n = 22, h = SADDLE.half + 2.6;
      for (let i = 0; i <= n; i++) {
        const x = -h + (2 * h * i) / n, y = BEAR_Y + saddleTop(x), sl = x / Math.sqrt(SADDLE.r ** 2 - x * x);
        const nn = V(sl, 1, 0).normalize();
        path.push(V(x, y, 0).addScaledVector(nn, -SADDLE.pad / 2));
      }
      b.add(sweep(path, Z, SADDLE.wide, SADDLE.pad / 2, 3.2, 12, { taper: 3, ends: 0.55 }), of.hide, I);
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
    // The canopy: a knit strip hung from end to end, whose underside is its arch, pressed up onto the pad where it
    // bears. Its middle stands half its thickness out from that, square to the line. Its ends run into the housings.
    const n = 44, under: THREE.Vector3[] = [];
    const end = ARCH.crx;
    under.push(V(-(end + 2.5), ARCH.ccy - 4, 0));
    for (let i = 0; i <= n; i++) { const t = Math.PI - (i / n) * Math.PI, x = end * Math.sign(Math.cos(t)) * Math.abs(Math.cos(t)) ** 0.8; under.push(V(x, canopyUnder(x), 0)); }
    under.push(V(end + 2.5, ARCH.ccy - 4, 0));
    const mid = under.map((p, i) => {
      const t = under[Math.min(under.length - 1, i + 1)].clone().sub(under[Math.max(0, i - 1)]);
      const nn = V(-t.y, t.x, 0).normalize();
      if (nn.dot(V(p.x, p.y - ARCH.ccy + 20, 0)) < 0) nn.negate();
      return p.clone().addScaledVector(nn, CANOPY.t);
    });
    b.add(sweep(mid, Z, CANOPY.w, CANOPY.t, 6, 12, { taper: 9, ends: 0.62 }), of.canopy);

    // The frame: two slim rails in a soft coating, from housing to housing, standing over the canopy.
    for (const z of [-RAIL.z, RAIL.z]) {
      const path: THREE.Vector3[] = [V(ARCH.rx, ARCH.cy - 7, z)];
      for (let i = 0; i <= 48; i++) { const [x, y] = railAt((i / 48) * Math.PI); path.push(V(x, y, z)); }
      path.push(V(-ARCH.rx, ARCH.cy - 7, z));
      b.add(sweep(path, Z, RAIL.w, RAIL.t, 2.6, 12), of.coat);
    }

    for (const s of [-1, 1]) {
      const x0 = s * STEM.x, m = new THREE.Matrix4().makeTranslation(x0, 0, 0);
      // The housing at the band's end: the two rails run into it at its top, the canopy into its inner face, and it
      // narrows to its foot, where the stem slides out of a dark mouth.
      const H = HOUSING, hs: Sec[] = [
        { x: H.foot - 0.4, z: 2.8, y: 2.1, kind: kindOf.gap }, { x: H.foot, z: 3.6, y: 2.7, kind: kindOf.gap }, { x: H.foot + 0.2, z: 4.0, y: 3.0 },
        { x: H.foot + 1.6, z: 5.6, y: 3.7 }, { x: H.foot + 5, z: 10, y: 4.2 }, { x: H.foot + 10, z: 16, y: H.x }, { x: H.top - 4, z: H.z, y: H.x },
        { x: H.top - 1.6, z: H.z - 0.2, y: H.x - 0.3 }, { x: H.top, z: H.z - 1.4, y: H.x - 1.4 }, { x: H.top + 0.6, z: H.z - 3.5, y: 1.6 },
      ].map((q) => ({ ...q, kind: q.kind ?? kindOf.coat }));
      const up = new THREE.Matrix4().makeBasis(Y, X.clone().negate(), Z);
      b.add(own(loft(hs, 3.4, 40, 5, (p) => V(0, p.y, p.z))), of.coat, m.clone().multiply(up));
      // The stem: a slim bar of polished steel, from inside the housing down to the hinge.
      const sp: THREE.Vector3[] = [];
      for (let i = 0; i <= 3; i++) sp.push(V(x0, H.foot + 5 + (PIVOT.y + 1.2 - H.foot - 5) * (i / 3), 0));
      b.add(sweep(sp, Z, STEM.w, STEM.t, 2.4, 14), of.stem);
      // The hinge at its foot: a short polished barrel across the band, the cup hanging on it.
      addTurn(b, [[0.01, -PIVOT.half], [PIVOT.r - 0.5, -PIVOT.half], [PIVOT.r, -PIVOT.half + 0.5], [PIVOT.r, PIVOT.half - 0.5], [PIVOT.r - 0.5, PIVOT.half], [0.01, PIVOT.half]], of.stem, frame(V(x0, PIVOT.y, 0), Z, X), 20, { shadow: false });
    }
    keep(b, swing, 'hpBand');
  }

  // ---- the cups -----------------------------------------------------------------------------------------------------
  const cups: THREE.Group[] = [];
  const { rz, ry, n, deep, edge, dome } = CUP;
  // The shell's top at a place across it, and the slope of its outline there.
  const topAt = (z: number) => ry * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(z) / rz, n)), 1 / n);
  const tiltAt = (z: number) => Math.atan2(topAt(z + 0.5) - topAt(z - 0.5), 1);
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * STEM.x, PIVOT.y, 0);
    swing.add(pivot);
    const b = new Parts();
    // Built for the cup at +x, its axis out along +x from its joint; the other is the same turned half round, so
    // its front is this one's back.
    const flip = s < 0 ? new THREE.Matrix4().makeRotationY(Math.PI) : new THREE.Matrix4();
    const at = (m: THREE.Matrix4) => flip.clone().multiply(new THREE.Matrix4().makeTranslation(JOINT - STEM.x, CUP.y - PIVOT.y, 0)).multiply(m);
    const I = at(new THREE.Matrix4());
    const radial = (p: THREE.Vector3) => V(0, p.y, p.z);
    const { side } = SHELL;

    // The shell: a fine step in at the joint, straight sides, a long soft edge, and the face, a shallow dome. One
    // piece of aluminium, no seam on it.
    const shell: Sec[] = [
      { x: 0, z: rz - 1.7, y: ry - 1.7, kind: kindOf.gap }, { x: 0.45, z: rz - 0.8, y: ry - 0.8, kind: kindOf.alu }, { x: 1.1, z: rz - 0.2, y: ry - 0.2, kind: kindOf.alu },
      { x: 2.0, z: rz, y: ry, kind: kindOf.alu }, { x: 6, z: rz, y: ry, kind: kindOf.alu }, { x: 10.5, z: rz, y: ry, kind: kindOf.alu }, { x: side, z: rz, y: ry, kind: kindOf.alu },
    ];
    for (let i = 1; i <= 9; i++) { const a = (i / 9) * (Math.PI / 2), d = edge * (1 - Math.cos(a)); shell.push({ x: side + edge * Math.sin(a), z: rz - d, y: ry - d, kind: kindOf.alu }); }
    for (let i = 1; i <= 7; i++) { const k = 1 - i / 7, kk = Math.max(k, 0.004); shell.push({ x: deep + dome * (1 - kk * kk), z: (rz - edge) * kk, y: (ry - edge) * kk, kind: kindOf.alu }); }
    b.add(own(loft(shell, n, 72, 4, radial)), of.alu, I, { local: true });

    // The cushion: a deep knitted roll with the shell's own outline, standing off the shell by a dark line where it
    // is held, and the cloth over the driver set back inside its opening.
    b.add(own(loft([{ x: 0.3, z: rz - 1.6, y: ry - 1.6 }, { x: -0.2, z: rz - 2.6, y: ry - 2.6 }, { x: -0.8, z: rz - 2.6, y: ry - 2.6 }].map((q) => ({ ...q, kind: kindOf.gap })), n, 48, 1, radial)), of.gap, I, { shadow: false });
    const cushion: Sec[] = CUSHION.prof.map(([x, w]) => ({ x, z: rz + w, y: ry + w, kind: kindOf.cushion }));
    b.add(own(loft(cushion, n, 56, 3, radial)), of.cushion, I, { local: true });
    {
      const o = CUSHION.open, inner: Sec[] = [];
      for (let i = 0; i <= 3; i++) { const k = 1 - i / 3, kk = Math.max(k, 0.004); inner.push({ x: CUSHION.driver + 0.8 * (1 - kk * kk), z: (rz + o + 0.4) * kk, y: (ry + o + 0.4) * kk, kind: kindOf.mesh }); }
      b.add(own(loft(inner.map((q) => ({ ...q, kind: s > 0 ? kindOf.meshL : kindOf.mesh })), n, 40, 2, () => V(-1, 0, 0))), of.mesh, I, { shadow: false, local: true });
    }

    // The Digital Crown and the noise control button, on the top of the right cup, in line with the stem: the crown
    // toward the front, the button between it and the stem, each set in a fine dark gap and leaning with the top.
    if (s < 0) {
      const xc = deep / 2;
      {
        const z = -CROWN.z, y = topAt(Math.abs(z)) - 0.9, lean = new THREE.Matrix4().makeRotationX(tiltAt(Math.abs(z)));
        const base = new THREE.Matrix4().makeTranslation(xc, y, z).multiply(lean);
        addTurn(b, [[0.01, -0.5], [CROWN.r + 0.45, -0.5], [CROWN.r + 0.45, 0.75], [0.01, 0.75]], of.gap, at(base), 48, { shadow: false });
        b.add(crown(CROWN.r, CROWN.h, CROWN.ridges), of.crown, at(base.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.6, 0))), { shadow: false });
      }
      {
        const z = -BUTTON.z, y = topAt(Math.abs(z)) + 0.1, lean = new THREE.Matrix4().makeRotationX(tiltAt(Math.abs(z)));
        const base = new THREE.Matrix4().makeTranslation(xc, y, z).multiply(lean);
        const pill = (r: number, half: number) => new THREE.CapsuleGeometry(r, half * 2, 6, 24).rotateX(Math.PI / 2);
        b.add(pill(BUTTON.r + 0.4, BUTTON.half), of.gap, at(base.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.35, 0)).multiply(new THREE.Matrix4().makeScale(1, 0.3, 1))), { shadow: false });
        b.add(pill(BUTTON.r, BUTTON.half), of.crown, at(base.clone().multiply(new THREE.Matrix4().makeScale(1, 0.85, 1))), { shadow: false });
      }
    }
    keep(b, pivot, s < 0 ? 'hpCupR' : 'hpCupL');
    cups.push(pivot);
  }

  return { group, swing, cups: cups as [THREE.Group, THREE.Group], meshes, tris };
}
