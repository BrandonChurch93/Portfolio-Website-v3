import * as THREE from 'three';
import { Builder } from '../../../../world/build';
import {
  ARCH, BASE, BEAR_Y, CANOPY, CUP, CUSHION, FACE, FOOT_AT, HOOK, KNUCKLE, PAIR_Q, PIVOT, POST, RAIL, SADDLE, SHELL, STEM, V, canopyUnder, frame, loft, saddleTop, sweep, turned, type Sec,
} from './form';
import type { Handle, HeadphonesMats, Of } from './materials';

// The headphones on their stand, built in the desk's millimetres and merged per material. The stand: a weighted foot
// with a hide pad let into its top, a knuckle on its boss with a pin across it, a tapering post with a cable hook, and
// a padded saddle. The pair hanging from it: the band, two flat sprung steel rails over a knitted canopy, a housing at
// each end that a slotted stem slides out of, a yoke at each stem's foot with a pin through it, and the cups, each
// hanging on its pin, with a turned medallion in a perforated face.

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

// A domed pin head, standing on y from 0.
const PIN_HEAD: [number, number][] = [[0.01, 0], [2.9, 0], [3.1, 0.35], [2.7, 1.0], [1.6, 1.35], [0.01, 1.45]];

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
    // The canopy: a knitted strip whose underside is its arch, pressed up onto the pad where it bears. Its middle stands
    // half its thickness out from that, square to the line.
    const n = 40, under: THREE.Vector3[] = [];
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
    b.add(sweep(mid, Z, CANOPY.w, CANOPY.t, 6, 10), of.canopy);
    for (const z of [-CANOPY.w + 0.4, CANOPY.w - 0.4]) b.add(sweep(mid.map((p) => V(p.x, p.y, z)), Z, 0.95, CANOPY.t + 0.25, 2, 4), of.binding);

    // The rails: two flat bands of sprung steel over the canopy's edges, from housing to housing, wide across the band
    // and thin, their edges square so each holds a crisp line of light.
    for (const z of [-RAIL.z, RAIL.z]) {
      const path: THREE.Vector3[] = [V(ARCH.rx, ARCH.cy - 8, z)];
      for (let i = 0; i <= 32; i++) { const t = (i / 32) * Math.PI; path.push(V(ARCH.rx * Math.cos(t), ARCH.cy + ARCH.ry * Math.sin(t), z)); }
      path.push(V(-ARCH.rx, ARCH.cy - 8, z));
      b.add(sweep(path, Z, RAIL.w, RAIL.t, 7, 10), of.rail);
    }

    for (const s of [-1, 1]) {
      const x0 = s * STEM.x, m = new THREE.Matrix4().makeTranslation(x0, 0, 0);
      // The housing at the band's end: a sculpted capsule, taking in the rails and the canopy at its top and narrowing
      // to its foot, where a dark mouth lets the stem out. A polished band rings it under the rails.
      const hs: Sec[] = [
        { x: STEM.top - 0.4, z: 3.6, y: 4.6, kind: kindOf.gap }, { x: STEM.top, z: 5.6, y: 6.6, kind: kindOf.gap }, { x: STEM.top + 0.2, z: 6.4, y: 7.0 }, { x: STEM.top + 2.4, z: 9.5, y: 7.6 }, { x: STEM.top + 8, z: 15.5, y: 8.2 },
        { x: STEM.top + 16, z: 20.5, y: 8.4 }, { x: ARCH.cy - 4, z: 22, y: 8.4 }, { x: ARCH.cy - 1.4, z: 21.6, y: 7.8 }, { x: ARCH.cy + 0.6, z: 20.4, y: 6 }, { x: ARCH.cy + 1.4, z: 17, y: 2.5 },
      ].map((q) => ({ ...q, kind: q.kind ?? kindOf.dark }));
      const hg = own(loft(hs, 3.2, 28, 5, (p) => V(0, p.y, p.z)));
      // The loft runs along x: turned upright it runs up the band's end, with its depth across the band.
      const up = new THREE.Matrix4().makeBasis(Y, X.clone().negate(), Z);
      b.add(hg, of.dark, m.clone().multiply(up));
      const ring: Sec[] = [{ x: ARCH.cy - 7.6, z: 22.2, y: 8.6 }, { x: ARCH.cy - 7.2, z: 22.7, y: 9.1 }, { x: ARCH.cy - 4.8, z: 22.7, y: 9.1 }, { x: ARCH.cy - 4.4, z: 22.2, y: 8.6 }].map((q) => ({ ...q, kind: kindOf.polish }));
      b.add(own(loft(ring, 3.2, 28, 1, (p) => V(0, p.y, p.z))), of.polish, m.clone().multiply(up));
      // The stem: a flat polished bar that slides out of the housing, pulled straight by the cup's weight, slotted
      // down its middle and engraved with size marks, with a copper bushing where it leaves.
      const stem = [V(x0, STEM.top + 6, 0), V(x0, STEM.foot + 2, 0)];
      const sp: THREE.Vector3[] = [];
      for (let i = 0; i <= 2; i++) sp.push(stem[0].clone().lerp(stem[1], i / 2));
      b.add(sweep(sp, Z, STEM.w, STEM.t, 4, 12), of.stem);
      addTurn(b, [[0.01, 0], [4.6, 0], [5.2, 0.5], [5.2, 1.6], [4.8, 2.1], [0.01, 2.2]], of.copper, frame(V(x0, STEM.top - 1.6, 0), Y, Z).multiply(new THREE.Matrix4().makeScale(1, 1, 0.82)), 16);
      // The yoke at the stem's foot: a bridge across, and a cheek either side of the cup's lug with the pin's domed
      // head on its outer face.
      {
        const P = new THREE.Matrix4().makeTranslation(x0, PIVOT.y, 0), span = PIVOT.half + 0.3, th = 1.8;
        const br = new THREE.Shape();
        br.moveTo(-STEM.t - 0.4, 2.6); br.lineTo(STEM.t + 0.4, 2.6); br.lineTo(STEM.t + 0.4, 6.6); br.lineTo(-STEM.t - 0.4, 6.6); br.lineTo(-STEM.t - 0.4, 2.6);
        b.add(plate(br, (span + th) * 2, 0.6, 4), of.yoke, P);
        const ck = new THREE.Shape();
        ck.moveTo(-STEM.t - 0.4, 6.6);
        ck.lineTo(-PIVOT.r - 1.2, 0);
        ck.absarc(0, 0, PIVOT.r + 1.2, Math.PI, Math.PI * 2, false);
        ck.lineTo(STEM.t + 0.4, 6.6);
        ck.lineTo(-STEM.t - 0.4, 6.6);
        for (const zs of [-1, 1]) {
          b.add(plate(ck, th, 0.45, 10), of.yoke, P.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, zs * (span + th / 2))));
          addTurn(b, PIN_HEAD.map(([r, y]) => [r * 0.8, y * 0.8] as [number, number]), of.copper, P.clone().multiply(frame(V(0, 0, zs * (span + th)), Z.clone().multiplyScalar(zs), X)), 16, { shadow: false });
        }
      }
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
    const { rz, ry, edge, n } = CUP;
    const { side } = SHELL;

    // The shell: from a small step in at the seam, sides that draw in a little with a fine groove turned round them,
    // a long soft edge, a narrow polished chamfer, and the face, a shallow dome.
    const shell: Sec[] = [
      { x: 0.5, z: rz - 2.0, y: ry - 2.0, kind: kindOf.polish }, { x: 1.1, z: rz - 0.9, y: ry - 0.9, kind: kindOf.polish }, { x: 1.8, z: rz - 0.25, y: ry - 0.25, kind: kindOf.polish },
      { x: 2.2, z: rz - 0.05, y: ry - 0.05, kind: kindOf.body }, { x: 2.8, z: rz, y: ry, kind: kindOf.body },
    ];
    const inset = (x: number) => (1.3 * (x - 2.8)) / (side - 2.8);
    const g0 = SHELL.groove;
    for (const [x, d, k] of [[g0 - 0.7, 0, kindOf.body], [g0 - 0.35, SHELL.cut, kindOf.gap], [g0 + 0.35, SHELL.cut, kindOf.gap], [g0 + 0.7, 0, kindOf.body], [side, 0, kindOf.body]] as [number, number, number][]) {
      shell.push({ x, z: rz - inset(x) - d, y: ry - inset(x) - d, kind: k });
    }
    for (let i = 1; i <= 5; i++) { const a = (i / 5) * SHELL.turn, d = 1.3 + edge * (1 - Math.cos(a)); shell.push({ x: side + edge * Math.sin(a), z: rz - d, y: ry - d, kind: kindOf.body }); }
    shell.push({ x: SHELL.x2, z: rz - SHELL.d2, y: ry - SHELL.d2, kind: kindOf.polish });
    const rings = s < 0 ? 6 : 2;
    for (let i = 0; i <= rings; i++) { const k = 1 - i / rings, kk = Math.max(k, 0.004); shell.push({ x: SHELL.x2 + SHELL.dome * (1 - kk * kk), z: FACE.fz * kk, y: FACE.fy * kk, kind: kindOf.face }); }
    b.add(own(loft(shell, n, 48, 4, radial)), of.body, I);
    // The medallion, standing proud of the face's middle with a bevelled rim, on the cup whose face is seen.
    if (s < 0) {
      const top = SHELL.x2 + SHELL.dome + FACE.proud, r = FACE.medal;
      addTurn(b, [[r, SHELL.x2 + 0.5], [r, top - 0.8], [r - 0.35, top - 0.25], [r - 1.0, top], [0.01, top]], of.medal, I.clone().multiply(frame(V(0, 0, 0), X, Z)), 48, { shadow: false });
    }
    // The seam: a dark ring set in between the shell and the cushion.
    b.add(own(loft([{ x: 1.0, z: rz - 1.6, y: ry - 1.6 }, { x: 0, z: rz - 3.4, y: ry - 3.4 }, { x: -0.8, z: rz - 3.4, y: ry - 3.4 }].map((q) => ({ ...q, kind: kindOf.gap })), n, 40, 1, radial)), of.gap, I, { shadow: false });

    // The cushion: a full soft roll from the seam round its face to the opening, its outer wall bellied out past the
    // shell, and the cloth over the driver set back inside.
    const cushion: Sec[] = CUSHION.prof.map(([x, w]) => ({ x, z: rz + w, y: ry + w, kind: kindOf.cushion }));
    b.add(own(loft(cushion, 3.0, 40, 2, radial)), of.cushion, I);
    {
      const ins = -16, inner: Sec[] = [];
      for (let i = 0; i <= 3; i++) { const k = 1 - i / 3, kk = Math.max(k, 0.004); inner.push({ x: -2.8 + 0.5 * (1 - kk * kk), z: (rz + ins + 0.6) * kk, y: (ry + ins + 0.6) * kk, kind: kindOf.mesh }); }
      b.add(own(loft(inner, 3.0, 32, 2, () => V(-1, 0, 0))), of.mesh, I, { shadow: false });
    }

    // The pivot at the stem's foot: a polished barrel across the cup's top, held in a short lug of the cup's steel
    // that rises from the shell, between the yoke's cheeks.
    {
      const P = new THREE.Matrix4().makeTranslation(STEM.x - CUP.joint, PIVOT.y - CUP.y, 0);
      const toP = (m: THREE.Matrix4) => I.clone().multiply(P).multiply(m);
      addTurn(b, [[0.01, -PIVOT.half], [PIVOT.r - 0.6, -PIVOT.half], [PIVOT.r, -PIVOT.half + 0.6], [PIVOT.r, PIVOT.half - 0.6], [PIVOT.r - 0.6, PIVOT.half], [0.01, PIVOT.half]], of.polish, toP(frame(V(0, 0, 0), Z, X)), 12);
      const blk = new THREE.Shape();
      blk.moveTo(-6.5, -6.5);
      blk.lineTo(6.5, -6.5);
      blk.bezierCurveTo(5.8, -3, 5, -1.5, 3.6, 0);
      blk.absarc(0, 0, 3.6, 0, Math.PI, false);
      blk.bezierCurveTo(-5, -1.5, -5.8, -3, -6.5, -6.5);
      b.add(plate(blk, PIVOT.half * 2 - 3.6, 1.2), of.dark, toP(new THREE.Matrix4()));
    }

    // The crown and a button, on the top of the cup that shows its face: the crown toward the front, knurled copper on
    // a short polished stem, the button a slim polished pill behind the pivot.
    if (s < 0) {
      // The shell's top at a place across it, where its rounded outline has fallen from the middle.
      const topAt = (z: number) => (ry - 1.3) * Math.pow(1 - Math.pow(Math.abs(z) / (rz - 1.3), n), 1 / n);
      const zc = 21, top = topAt(zc + 3.4) - 0.6, u = side - 3;
      // The left cup is the right one turned half round, so its front is the right one's back.
      addTurn(b, [[0.01, 0], [3.4, 0], [3.4, 1.4], [2.6, 2.2], [0.01, 2.2]], of.polish, at(new THREE.Matrix4().makeTranslation(u, top, -zc)), 32);
      b.add(crown(4.3, 5.2, 12), of.copper, at(new THREE.Matrix4().makeTranslation(u, top + 2.1, -zc)));
      addTurn(b, [[0.01, 0], [4.0, 0], [4.3, 0.4], [4.3, 0.8], [3.4, 1.4], [0.01, 1.6]], of.copper, at(new THREE.Matrix4().makeTranslation(u, top + 7.3, -zc)), 32);
      const pill = new THREE.CapsuleGeometry(2.1, 9, 6, 16).rotateX(Math.PI / 2);
      b.add(pill, of.polish, at(new THREE.Matrix4().makeTranslation(u - 1, topAt(16 + 6.5) + 0.5, 16).multiply(new THREE.Matrix4().makeScale(1, 0.55, 1))));
    }
    keep(b, pivot, s < 0 ? 'hpCupL' : 'hpCupR');
    cups.push(pivot);
  }

  return { group, swing, cups: cups as [THREE.Group, THREE.Group], meshes, tris };
}
