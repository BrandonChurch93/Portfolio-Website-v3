import * as THREE from 'three';
import { Builder } from '../../../world/build';
import { MAT, PLACES, VIEW } from '../layout';
import type { PartFactory, PartState } from '../part';
import { CASE, CD, CW, D2R, KEYS, SOFT } from './keyboard/layout';
import { KeyLight, gridAt, ramp } from './keyboard/light';
import { keyMaterials } from './keyboard/materials';
import { BOARD_AT, DOTS, capGeometry, caseGeometry, dotGeometry, feetGeometry, housingGeometry, knobGeometry, legendAtlas, plateGeometry, stabiliserGeometry } from './keyboard/model';
import { contactShadow, spillLight } from './keyboard/shapes';

// His keyboard: a wireless 75 percent gaming board in a machined case. Every key is lit from under it in the site's
// colors. As the desk comes on the keys light in a wave across the board, at rest a slow swell crosses them, and the
// keys under the pointer glow and leave a short trail that cools behind it.
//
// The height over the plate the pointer's line is met at: the caps' tops.
const TOPS = 16;
// The small lights on the rim: the link, the battery, the lock.
const DOT_LEVEL = [0.62, 0.42, 0.3];

export const build: PartFactory = () => {
  const [px, pz, turn] = PLACES.keyboard;
  const group = new THREE.Group();
  group.name = 'keyboard';
  group.position.set(px, MAT.h, pz);
  group.rotation.y = turn * D2R;
  const board = new THREE.Group();
  board.position.set(0, BOARD_AT.y, 0);
  board.rotation.x = BOARD_AT.tilt;
  group.add(board);

  const light = new KeyLight();
  const legends = legendAtlas();
  const M = keyMaterials(light, legends);

  const outer = new Builder();
  const shell = caseGeometry();
  outer.add(shell.body, M.board);
  outer.add(shell.cut, M.board);
  for (const g of feetGeometry()) outer.add(g, M.board);
  DOTS.forEach((d, i) => outer.add(dotGeometry(d, i), M.board));
  outer.build(group, 'keyboard');

  const inner = new Builder();
  inner.add(plateGeometry(), M.board);
  for (const k of KEYS) {
    inner.add(housingGeometry(k), M.board);
    inner.add(capGeometry(k), M.board);
    const st = stabiliserGeometry(k);
    if (st) { for (const g of st.housings) inner.add(g, M.board); inner.add(st.wire, M.board); }
  }
  const kn = knobGeometry();
  for (const g of [kn.collar, kn.knob, kn.mark]) inner.add(g, M.board);
  // What stands in the case takes no shadow from the lights: at three times its size the edge of a cap's shadow
  // stepped along every skirt. The occlusion pass still darkens the caps' feet.
  for (const m of inner.build(board, 'keyboard-board')) m.receiveShadow = false;

  const spill = spillLight(SOFT.nx * SOFT.cell, SOFT.nz * SOFT.cell, light.softTex, gridAt(SOFT), 0.6);
  spill.position.y = 0.35;
  const shadow = contactShadow(CW - 4, CD - 4, CASE.r, 9, 0.62);
  shadow.position.y = 0.15;
  group.add(shadow, spill);

  // The pointer is given where its line meets the desk's top. The caps' tops stand well above that and lean back with
  // the board, so the line is followed back toward the eye until it meets the plane of their tops, in the board's
  // frame.
  const toEye = new THREE.Vector3(Math.sin(VIEW.az * D2R) * Math.cos(VIEW.el * D2R), Math.sin(VIEW.el * D2R), Math.cos(VIEW.az * D2R) * Math.cos(VIEW.el * D2R));
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), toBoard = new THREE.Matrix4(), hit: [number, number] = [0, 0];
  const pointer = (p: THREE.Vector3): [number, number] => {
    group.updateWorldMatrix(true, true);
    toBoard.copy(board.matrix).invert().multiply(new THREE.Matrix4().copy(group.matrix).invert());
    p0.copy(p).applyMatrix4(toBoard);
    p1.copy(p).addScaledVector(toEye, 100).applyMatrix4(toBoard);
    const k = (TOPS - p0.y) / (p1.y - p0.y || 1e-6);
    hit[0] = p0.x + (p1.x - p0.x) * k;
    hit[1] = p0.z + (p1.z - p0.z) * k;
    return hit;
  };

  const col = new THREE.Color();
  const update = (s: PartState): boolean => {
    const keys = s.lights.keys;
    const busy = light.step({ t: s.t, keys, still: s.still, led: s.led, at: keys > 0 ? pointer(s.pointer) : null });
    M.dots.forEach((v, i) => { ramp(DOT_LEVEL[i] * keys, col).multiplyScalar(DOT_LEVEL[i] * keys * 1.6); v.set(col.r, col.g, col.b); });
    return busy;
  };

  return {
    group,
    alone: { at: [px, MAT.h + 14, pz], r: Math.hypot(CW, CD) / 2 + 4 },
    update,
    dispose() {
      light.dispose();
      legends.dispose();
    },
  };
};
