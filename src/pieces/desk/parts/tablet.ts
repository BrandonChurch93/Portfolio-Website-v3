import * as THREE from 'three';
import { Builder, rbox, xf } from '../../../world/build';
import { MAT, PLACES } from '../layout';
import type { DeskPart, PartFactory } from '../part';
import { barrel, byFacing, cap, DEG, plate, roundedPath, stadium, sweep, turned, type Step } from './tablet/forms';
import { tabletMaterials } from './tablet/materials';
import { screenTexture } from './tablet/screen';

// His tablet with its pencil beside it, on the mat at the left under the desk lamp. A large thin tablet in warm dark
// steel and dark glass, no mark on it anywhere, propped at a drawing angle on a low bronze stand, the drawing he is
// working on lit on its screen when the desk comes on. Nothing of it moves by itself.

// The tablet, in its own frame: x across, y up the screen, z out of the screen from its back at z = 0.
const T = { hw: 140.8, hh: 107.75, r: 18.5, thick: 5.1, display: [264.8, 198.6] as [number, number], displayR: 10 } as const;
// Heights through the edge, from the back up: the back's chamfer, the band, the front's chamfer, the glass.
const Z = { chamferBack: 0.85, bandTop: 3.95, metalTop: 4.55, ink: 4.7, picture: 4.82, glass: 5.1 } as const;
// The stand, in its own frame: y up from the floor of the channel the tablet's edge stands in, z toward the visitor.
// The tablet leans back at this angle; the stand's cheeks stand at ±cheek and are this thick.
const STAND = { tilt: 24 * DEG, liner: 0.8, rubber: 1.0, base: 4, cheek: 118, cheekT: 8, back: -168, lipZ: 3.6, lipTop: 7.8, front: 10, behind: -12, at: 95 } as const;
// The pencil: its length, its radius, and how far its flat side is from its middle. It lies on that flat.
const PEN = { len: 166, r: 4.45, flat: 3.55, at: [188, 2] as [number, number], turn: -100 * DEG } as const;
// The picture's brightness at full, and how much of the room the glass shows.
const GLOW = 0.88, SHEEN = 0.05;
// The screen's light on the mat: how wide and how far out it reaches, in millimetres, and how strong it is at full.
const SPILL = { w: 380, d: 120, k: 0.95 } as const;

const tan = Math.tan(STAND.tilt), cos = Math.cos(STAND.tilt);
// The top of a cheek at a place along the stand: just under the tablet's back, by the rubber laid on it.
const cheekTop = (z: number) => STAND.liner + -z * tan - STAND.rubber / cos;

export const build: PartFactory = () => {
  const m = tabletMaterials();
  const tex = screenTexture(16);
  m.display.map = tex;
  const group = new THREE.Group();
  group.name = 'tablet';
  const [px, pz, turn] = PLACES.tablet;
  group.position.set(px, MAT.h, pz);
  group.rotation.y = turn * DEG;

  const b = new Builder();
  const S = new THREE.Matrix4().makeTranslation(0, STAND.base, STAND.at);
  const inS = (mm: THREE.Matrix4) => S.clone().multiply(mm);
  // The tablet's frame inside the stand's: its lower edge in the channel, leaning back.
  const tab = inS(new THREE.Matrix4().makeTranslation(0, STAND.liner, 0).multiply(new THREE.Matrix4().makeRotationX(STAND.tilt)).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(0, T.hh, 0)));
  const inT = (mm?: THREE.Matrix4) => (mm ? tab.clone().multiply(mm) : tab.clone());

  // ---- the tablet's body: the shell, its chamfers, the seam, the glass's edge --------------------------------------
  const glassRound: Step[] = [{ d: -0.84, z: Z.metalTop, a: 0 }, { d: -0.84, z: 4.78, a: 0 }, { d: -0.88, z: 4.94, a: 28 }, { d: -0.98, z: 5.04, a: 55 }, { d: -1.12, z: 5.093, a: 76 }, { d: -1.3, z: Z.glass, a: 90 }];
  const body = sweep(T.hw, T.hh, T.r, [
    { key: 'chamfer', steps: [{ d: -Z.chamferBack, z: 0 }, { d: 0, z: Z.chamferBack }] },
    { key: 'shell', steps: [{ d: 0, z: Z.chamferBack }, { d: 0, z: Z.bandTop }] },
    // The front edge is cut round, so some part of it always faces the light and carries a pale line all the way round.
    { key: 'chamfer', steps: [0, 15, 30, 45, 60, 75, 90].map((a) => ({ d: -0.6 * (1 - Math.cos(a * DEG)), z: Z.bandTop + 0.6 * Math.sin(a * DEG), a })) },
    { key: 'seam', steps: [{ d: -0.6, z: Z.metalTop }, { d: -0.84, z: Z.metalTop }] },
    { key: 'glassEdge', steps: glassRound },
  ]);
  b.add(body.get('chamfer')!, m.chamfer, inT());
  b.add(body.get('shell')!, m.shell, inT());
  b.add(body.get('seam')!, m.band, inT(), { shadow: false });
  b.add(body.get('glassEdge')!, m.glassEdge, inT());
  b.add(cap(T.hw - Z.chamferBack, T.hh - Z.chamferBack, T.r - Z.chamferBack, 0, true), m.shell, inT());
  // Under the glass: the border's black, then the picture a hair above it, then the glass over both.
  b.add(cap(T.hw - 0.84, T.hh - 0.84, T.r - 0.84, Z.ink), m.ink, inT(), { shadow: false });
  const pic = new THREE.PlaneGeometry(T.display[0], T.display[1]);
  pic.translate(0, 0, Z.picture);
  b.add(pic, m.display, inT(), { shadow: false });
  b.add(cap(T.hw - 1.3, T.hh - 1.3, T.r - 1.3, Z.glass + 0.004), m.glass, inT(), { shadow: false });
  // The camera in the border, at the middle of the top edge.
  const camY = T.hh - 4.25;
  b.add(new THREE.CircleGeometry(2.1, 40).translate(0, camY, Z.ink + 0.12), m.screw, inT(), { shadow: false });
  b.add(new THREE.CircleGeometry(1.35, 40).translate(0, camY, Z.ink + 0.16), m.lens, inT(), { shadow: false });
  for (const dx of [-11, 9]) b.add(new THREE.CircleGeometry(0.7, 20).translate(dx, camY, Z.ink + 0.12), m.lens, inT(), { shadow: false });

  // ---- the edge's details: the port, the speakers, the antenna lines, the button ----------------------------------
  const mid = (Z.chamferBack + Z.bandTop) / 2, bandH = Z.bandTop - Z.chamferBack;
  // A flat thing on a side, facing out: lay it in xy facing +z, and this turns it onto the side.
  const onSide = (side: 'left' | 'right' | 'top', along: number, out: number) => {
    if (side === 'top') return xf({ p: [along, T.hh + out, mid], r: [-Math.PI / 2, 0, 0] });
    const s = side === 'left' ? -1 : 1;
    return xf({ p: [s * (T.hw + out), along, mid], r: [0, s * Math.PI / 2, 0] }).multiply(xf({ r: [0, 0, Math.PI / 2] }));
  };
  // On a side, the shape's x runs along the side and its y runs up the band.
  const port = (side: 'left' | 'right') => {
    b.add(new THREE.ShapeGeometry(stadium(10.2, 3.6, 10)), m.chamfer, inT(onSide(side, 0, 0.012)), { shadow: false });
    b.add(new THREE.ShapeGeometry(stadium(9.0, 2.7, 10)), m.band, inT(onSide(side, 0, 0.03)), { shadow: false });
    b.add(new THREE.ShapeGeometry(stadium(6.2, 0.65, 6)), m.screw, inT(onSide(side, 0, 0.05)), { shadow: false });
  };
  port('left');
  for (const side of ['left', 'right'] as const) for (const end of [-1, 1]) {
    for (let k = 0; k < 7; k++) b.add(new THREE.CircleGeometry(0.42, 10), m.band, inT(onSide(side, end * (T.hh - 26 + (k - 3) * 1.6), 0.02)), { shadow: false });
    b.add(new THREE.PlaneGeometry(1.3, bandH), m.band, inT(onSide(side, end * (T.hh - 42), 0.015)), { shadow: false });
  }
  for (const x of [-1, 1]) b.add(new THREE.PlaneGeometry(1.3, bandH), m.band, inT(onSide('top', x * (T.hw - 52), 0.015)), { shadow: false });
  b.add(rbox(17, 2.0, 0.9, 0.4, 2), m.shell, inT(onSide('left', T.hh - 62, 0.3)));
  b.add(rbox(17.6, 2.4, 0.5, 0.2, 1), m.band, inT(onSide('left', T.hh - 62, 0.05)), { shadow: false });

  // ---- the stand: two bronze cheeks, the lip the tablet's edge stands in, a rod behind, screws ------------------
  // Profiles are drawn in (u, v) = (-z, y) of the stand and run across x.
  const P = (z: number, y: number, r: number): [number, number, number] => [-z, y, r];
  const cheekOutline = roundedPath([
    P(STAND.front, -STAND.base, 1), P(STAND.front, STAND.lipTop, 1.2), P(STAND.lipZ, STAND.lipTop, 0.6), P(STAND.lipZ, 0, 0.6),
    P(-1, 0, 0.5), P(-14, cheekTop(-14), 3), P(STAND.back, cheekTop(STAND.back), 4), P(STAND.back, -STAND.base, 1),
  ]);
  // The slot runs low along the cheek, where it shows under the tablet's overhang.
  const slotAt = (z: number) => cheekTop(z) * 0.42;
  const slot = roundedPath([P(-58, slotAt(-58) + 4.5, 4.2), P(-148, slotAt(-148) + 4.5, 4.2), P(-148, slotAt(-148) - 4.5, 4.2), P(-58, slotAt(-58) - 4.5, 4.2)]).reverse();
  const toStand = new THREE.Matrix4().makeRotationY(Math.PI / 2);
  for (const s of [-1, 1]) {
    const x0 = s * STAND.cheek - STAND.cheekT / 2;
    const [flat, cut] = byFacing(plate(cheekOutline, [slot], x0, x0 + STAND.cheekT, 1.4));
    b.add(flat, m.bronze, inS(toStand));
    b.add(cut, m.chamfer, inS(toStand));
  }
  const ledge = roundedPath([P(STAND.front, -STAND.base, 1), P(STAND.front, STAND.lipTop, 1.2), P(STAND.lipZ, STAND.lipTop, 0.6), P(STAND.lipZ, 0, 0.6), P(STAND.behind, 0, 0.4), P(STAND.behind, -STAND.base, 0.8)]);
  const inner = STAND.cheek - STAND.cheekT / 2;
  const [ledgeFlat, ledgeCut] = byFacing(plate(ledge, [], -inner, inner, 0));
  b.add(ledgeFlat, m.bronze, inS(toStand));
  b.add(ledgeCut, m.chamfer, inS(toStand));
  // Small parts cast no shadow of their own: the desk's lamp draws every caster a second time.
  // The suede the tablet's edge stands on, and the rubber along each cheek's top.
  b.add(rbox(2 * inner - 1, STAND.liner, STAND.lipZ - STAND.behind - 0.6, 0.3, 1), m.rubber, inS(xf({ p: [0, STAND.liner / 2, (STAND.lipZ + STAND.behind) / 2 - 0.1] })), { shadow: false });
  const run = (-14 - (STAND.back + 4)) / cos;
  for (const s of [-1, 1]) {
    const zc = (STAND.back + 4 - 14) / 2;
    b.add(rbox(6, STAND.rubber, run, 0.35, 2), m.rubber, inS(xf({ p: [s * STAND.cheek, cheekTop(zc) + STAND.rubber / 2 / cos, zc], r: [STAND.tilt, 0, 0] })), { shadow: false });
  }
  // The rod that ties the cheeks behind, and the screws that hold it and the lip, on each cheek's outer face.
  b.add(new THREE.CylinderGeometry(4, 4, 2 * inner, 40).rotateZ(Math.PI / 2), m.copper, inS(xf({ p: [0, 7, STAND.back + 12] })));
  const screwHead = turned([[0, 0], [3.1, 0], [3.1, 1.7], [2.75, 2.3], [0, 2.3]], 36);
  const hex = new THREE.CircleGeometry(1.3, 6).translate(0, 0, 2.31);
  for (const s of [-1, 1]) for (const [z, y] of [[6.8, 1.9], [STAND.back + 12, 7]] as const) {
    const at = inS(xf({ p: [s * (STAND.cheek + STAND.cheekT / 2), y, z], r: [0, s * Math.PI / 2, 0] }));
    b.add(screwHead.clone().rotateX(Math.PI / 2), m.chamfer, at, { shadow: false });
    b.add(hex.clone(), m.band, at, { shadow: false });
  }

  // ---- the pencil, on its flat beside the tablet ------------------------------------------------------------------
  const pen = new THREE.Matrix4().makeTranslation(PEN.at[0], PEN.flat, PEN.at[1]).multiply(new THREE.Matrix4().makeRotationY(PEN.turn)).multiply(new THREE.Matrix4().makeTranslation(-PEN.len / 2, 0, 0));
  const R = PEN.r, F = PEN.flat;
  const st: [number, number, number][] = [[0, 0, 0], [0.08, 1.2, 1.2], [0.3, 2.2, 2.2], [0.7, 3.1, 3.1], [1.2, 3.7, F], [1.9, 4.1, F], [2.8, 4.35, F], [3.8, R, F]];
  for (const [x, dr] of [[13.6, 0], [13.85, 0.13], [14.15, 0.13], [14.4, 0]] as const) st.push([x, R - dr, F - dr]);
  st.push([135, R, F]);
  const TAPER = 21, tipR = 2.55;
  for (let i = 1; i <= 16; i++) {
    const t = i / 16, e = t * t * (3 - 2 * t) * 0.35 + t * 0.65, r = R - (R - tipR) * e;
    st.push([135 + TAPER * t, r, Math.min(r, F + (R - F) * Math.min(1, t / 0.3))]);
  }
  // The pencil is too thin to shadow itself cleanly from the desk's lights: its shadow on the mat is the soft one below.
  b.add(barrel(st), m.pencil, pen, { shadow: false });
  const along = (x: number) => pen.clone().multiply(xf({ p: [x, 0, 0], r: [0, 0, -Math.PI / 2] }));
  b.add(turned([[tipR - 0.05, 0], [tipR + 0.07, 0.12], [tipR + 0.07, 0.95], [tipR - 0.08, 1.1]], 48), m.copper, along(135 + TAPER), { shadow: false });
  b.add(turned([[2.35, 0], [2.3, 1.0], [1.95, 3.2], [1.5, 5.4], [1.12, 6.9], [0.9, 7.55], [0.62, 7.92], [0.32, 8.1], [0, 8.15]], 40, 60), m.nib, along(135 + TAPER + 1.1), { shadow: false });

  b.build(group, 'tablet');

  // ---- what it lays on the mat: soft shadows where it sits, and the screen's light --------------------------------
  const quads: { c: [number, number]; h: [number, number]; corner: number; k: number; pad: number; turn?: number }[] = [
    { c: [0, STAND.at - 1], h: [STAND.cheek + STAND.cheekT / 2, 11], corner: 1.5, k: 0.85, pad: 16 },
    ...[-1, 1].map((s) => ({ c: [s * STAND.cheek, STAND.at + (STAND.back + STAND.front) / 2] as [number, number], h: [STAND.cheekT / 2, (STAND.front - STAND.back) / 2] as [number, number], corner: 1.5, k: 0.85, pad: 16 })),
    { c: [0, STAND.at - 92], h: [T.hw - 6, 96], corner: 18, k: 0.22, pad: 20 },
    { c: PEN.at, h: [72, 1.6], corner: 1.5, k: 0.75, pad: 14, turn: PEN.turn },
  ];
  const pos: number[] = [], uv: number[] = [], cell: number[] = [];
  for (const q of quads) {
    const ex = q.h[0] + q.pad, ez = q.h[1] + q.pad, a = q.turn ?? 0, c = Math.cos(a), s = Math.sin(a);
    const corner = (u: number, v: number) => { pos.push(q.c[0] + u * c + v * s, 0.25, q.c[1] - u * s + v * c); uv.push(u, v); cell.push(q.h[0], q.h[1], q.corner, q.k); };
    corner(-ex, -ez); corner(-ex, ez); corner(ex, ez); corner(-ex, -ez); corner(ex, ez); corner(ex, -ez);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  sg.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  const shadows = new THREE.Mesh(sg, m.shadow);
  shadows.name = 'tablet:shadows';
  shadows.renderOrder = 1;
  // The spill lies face up on the mat from the stand's lip out: its uv's v is 1 at the lip.
  const spillGeo = new THREE.PlaneGeometry(SPILL.w, SPILL.d).rotateX(-Math.PI / 2).translate(0, 0.35, STAND.at + STAND.front - 2 + SPILL.d / 2);
  spillGeo.setAttribute('cell', new THREE.Float32BufferAttribute(new Float32Array(16), 4));
  const spill = new THREE.Mesh(spillGeo, m.spill);
  spill.name = 'tablet:spill';
  spill.renderOrder = 2;
  for (const o of [shadows, spill]) { o.matrixAutoUpdate = false; o.updateMatrix(); group.add(o); }

  // Seen alone there is no mat under it to take the screen's light.
  const alone = typeof location !== 'undefined' && new URLSearchParams(location.search).get('only') === 'tablet';
  group.updateMatrix();
  const mid3 = new THREE.Vector3(18, 32, STAND.at - 92).applyMatrix4(group.matrix);

  // How a point of the desk is put into the tablet's own frame, for the cursor's light on the glass.
  const toTab = new THREE.Matrix4().multiplyMatrices(group.matrix, tab).invert();
  const cur = new THREE.Vector3();
  const glassU = m.glass.userData.uniforms as { uCur: { value: THREE.Vector2 }; uSheen: { value: number } };
  let last = -1;
  return {
    group,
    alone: { at: [mid3.x, mid3.y, mid3.z], r: 182 },
    update(s) {
      cur.copy(s.cursor).applyMatrix4(toTab);
      glassU.uCur.value.set(cur.x, cur.y);
      // A lit picture under the glass drowns what the glass reflects, as it does to the eye.
      glassU.uSheen.value = SHEEN * s.lights.room * (1 - 0.55 * s.lights.tablet);
      const k = s.lights.tablet;
      if (k === last) return false;
      last = k;
      m.display.color.setScalar(k * GLOW);
      m.spill.uniforms.uK.value = alone ? 0 : k * SPILL.k;
      return false;
    },
    dispose() {
      tex.dispose();
      group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
      for (const mat of Object.values(m)) mat.dispose();
    },
  } satisfies DeskPart;
};
