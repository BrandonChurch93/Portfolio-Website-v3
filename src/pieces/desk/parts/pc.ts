import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { Builder } from '../../../world/build';
import { BAY, DESK, VIEW } from '../layout';
import type { DeskPart, PartFactory, PartState } from '../part';
import { BOARD, T as BT, board, boardSheet } from './pc/board';
import { v, filletPath, run } from './pc/cables';
import { ATRIUM, GROMMETS, MAIN_Z, MOUNTS, atrium, glass } from './pc/case';
import { PUMP_FITTINGS, RAD_FITTINGS, pump, radiator, tubes } from './pc/cooler';
import { cardRotor, fan, rotor } from './pc/fan';
import { CARD, SOCKET, cardFanAt, gpu, support } from './pc/gpu';
import { Q, at, led, torus } from './pc/kit';
import { FX, fxOf, makeLook } from './pc/look';
import { printSheet } from './pc/print';
import { ram } from './pc/ram';

// His PC, under the desk's far end: the build from his PC Builder (github.com/BrandonChurch93/PC-Desktop-Builder), its
// Atrium case and parts brought over from that project's code into ./pc, lit in the site's colors. It stands on the
// floor in the bay with its long glass side to the front. Its light comes up with lights.pc, and its fans turn with it.

// How fast the fans turn when the PC is fully on, in radians a second: slow enough that nine blades never strobe.
const SPIN = 7.5;
const D2R = Math.PI / 180;
// How far the cursor's light stands from the desk toward the eye, in millimetres.
const LAMP_BACK = 1300;
// The PC's own two lights inside the case, at full strength, and how far each reaches, in metres: they cast no
// shadow, so they reach no further than the case, or they light the desk's top through its timber.
const GLOW = { low: 0.03, high: 0.038, reach: 0.32 };

export const build: PartFactory = () => {
  const L = makeLook(printSheet(), boardSheet());
  const group = new THREE.Group();
  group.name = 'pc';
  // The case's own frame, set on the floor in the middle of the bay, its left glass toward the front.
  const cx = (BAY.l + BAY.r) / 2, cz = (BAY.back + BAY.front) / 2 - 5;
  const kase = new THREE.Group();
  kase.position.set(cx, -DESK.H, cz);
  group.add(kase);

  const b = new Builder();
  atrium(b, L);
  glass(b, L);

  const [ax, ay, az] = ATRIUM.anchor;
  const boardM = at(ax, ay, az);
  board(b, L, boardM);
  const front = az + BT;
  pump(b, L, at(ax + BOARD.socket.x, ay + BOARD.socket.y, front + 6.5));
  BOARD.dimms.forEach((d, i) => ram(b, L, at(ax + d.x, ay + d.y, front + 2), [0.3, 0.36, 0.42, 0.48][i]));
  const cardM = at(ax + 22, ay + BOARD.pcie, front + 2);
  gpu(b, L, cardM);
  support(b, L, cardM.elements[12] + CARD.L - 28 - 34, ATRIUM.floor, cardM.elements[13] + CARD.fanY, cardM.elements[14] + CARD.H * 0.55);

  // The fans: three in the side wall behind the tray, three in the floor's basin, one at the rear, three under the
  // radiator over the top.
  const radM = new THREE.Matrix4().makeTranslation(...MOUNTS.top[1].slice(0, 1).concat([ATRIUM.topIn, MAIN_Z]) as [number, number, number]).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Q, 0, 2 * Q)));
  const fans: THREE.Matrix4[] = [], fanTones: number[] = [];
  const fanGains: number[] = [];
  const place = (m: THREE.Matrix4, t: number, k: number) => { fan(b, L, m, 'aureole', t, k); fans.push(m); fanTones.push(t); fanGains.push(k); };
  MOUNTS.side.forEach((m, i) => place(m, [0.95, 0.62, 0.3][i], [1.0, 0.95, 0.9][i]));
  MOUNTS.bottom.forEach((m, i) => place(m, [0.08, 0.4, 0.72][i], [1.0, 0.9, 0.95][i]));
  place(MOUNTS.rear, 0.82, 0.9);
  for (const m of radiator(b, L, radM, 0.5)) { fans.push(m); fanTones.push(0.5); fanGains.push(1.0); }

  // The light each lit part lays on what is beside it: the floor fans on the shelf over them and the basin under them,
  // and the memory on the board round it.
  MOUNTS.bottom.forEach((m, i) => {
    const x = m.elements[12], t = fanTones[3 + i];
    b.add(fxOf(new THREE.PlaneGeometry(150, 130), FX.spot, t, 0.22), L.fx, at(x, ATRIUM.floor + 0.4, MAIN_Z, [-Q, 0, 0]), { shadow: false });
    b.add(fxOf(new THREE.PlaneGeometry(132, 132), FX.ring, t, 0.4, 0.88), L.fx, at(x, ATRIUM.basin + 3.2, MAIN_Z, [-Q, 0, 0]), { shadow: false });
  });
  b.add(fxOf(new THREE.PlaneGeometry(84, 176), FX.spot, 0.38, 0.4), L.fx, at(ax + 180, ay + BOARD.dimms[0].y, front + 0.3), { shadow: false });
  // The side fans sit behind the tray: their rings show crisp just inside the tray's openings.
  MOUNTS.side.forEach((m, i) => b.add(led(torus(55.4, 1.2, 4, 56), fanTones[i], fanGains[i]), L.led, at(m.elements[12], m.elements[13], ATRIUM.trayB - 0.8), { shadow: false }));

  // Its light on the floor round it, and its shadow under it.
  const span = { x: ATRIUM.x1 - ATRIUM.x0, z: ATRIUM.z1 - ATRIUM.z0 };
  b.add(fxOf(new THREE.PlaneGeometry(span.x + 520, span.z + 520), FX.pool, 0.22, 0.32, 250), L.fx, at(0, 0.9, 0, [-Q, 0, 0]), { shadow: false });
  b.add(fxOf(new THREE.PlaneGeometry(span.x + 160, span.z + 160), FX.shadow, 0, 0.75), L.fxDark, at(0, 0.6, 0, [-Q, 0, 0]), { shadow: false });

  // The pump's tubes up to the radiator's fittings at its rear end.
  const pumpM = at(ax + BOARD.socket.x, ay + BOARD.socket.y, front + 6.5);
  tubes(b, L, PUMP_FITTINGS.map((p) => new THREE.Vector3(...p).applyMatrix4(pumpM)), RAD_FITTINGS.map((p) => new THREE.Vector3(...p).applyMatrix4(radM)));

  // Sleeved power: the 24 pin plug at the board's edge into its grommet, the processor's plug up into the top corner,
  // and the card's plug out toward the glass and down to its grommet under the card.
  const g = (id: string) => GROMMETS.find((x) => x.id === id)!;
  {
    const hh = 2 * 4.2 + 2.4 + 4.3;
    const p = v(ax + BOARD.w, ay + BOARD.atx24.y, front + hh / 2), gr = g('atx24'), gz = ATRIUM.trayF;
    run(b, L, { rows: 2, cols: 12, pitch: 4.4, wire: 1.6, rowAxis: v(0, 0, 1), combs: [24, 52],
      path: filletPath([p.clone(), v(gr.c[0] + 14, p.y, p.z), v(gr.c[0] - 4, p.y, gz - 2), v(gr.c[0] - 30, p.y, gz - 30)], 20, 22) });
  }
  {
    const p = v(ax + BOARD.eps.x, ay + BOARD.eps.y, front + 13), gr = g('eps');
    run(b, L, { rows: 2, cols: 4, pitch: 4.2, wire: 1.65, rowAxis: v(0, 1, 0), combs: [],
      path: filletPath([p.clone(), v(p.x, p.y, p.z + 8), v(p.x, gr.c[1], p.z + 8), v(p.x, gr.c[1], ATRIUM.trayF - 14)], 10, 8) });
  }
  {
    const p = v(cardM.elements[12] + SOCKET.x, cardM.elements[13] + SOCKET.y, cardM.elements[14] + SOCKET.z), gr = g('gpu');
    const z = p.z + 30.4, gz = ATRIUM.trayF;
    run(b, L, { rows: 2, cols: 6, pitch: 3.9, wire: 1.25, rowAxis: v(0, 1, 0), combs: [16, 52, 96, 150],
      path: filletPath([p.clone(), v(p.x, p.y, z), v(p.x, gr.c[1], z), v(gr.c[0], gr.c[1], z), v(gr.c[0], gr.c[1], gz - 20)], 18.4, 16) });
  }

  // Everything that stands still, merged by material.
  const meshes = b.build(kase, 'pc');
  // Only the case's outside casts a shadow: nothing inside it does.
  const casts = new Set<THREE.Material>([L.shell, L.accent]);
  for (const m of meshes) { m.castShadow = casts.has(m.material as THREE.Material); m.updateMatrix(); }

  // The blades: one drawing for all ten case fans, one for the card's three.
  const blades = new THREE.InstancedMesh(rotor(), L.bladeLit, fans.length);
  const cardBlades = new THREE.InstancedMesh(cardRotor(CARD.fanR), L.bladeLit, CARD.fanX.length);
  const cardFans = CARD.fanX.map((_, i) => cardM.clone().multiply(cardFanAt(i)));
  // Each fan's light: its tone in red and its strength in green, read by the blades' shader.
  fanTones.forEach((t, i) => blades.setColorAt(i, new THREE.Color(t, fanGains[i], 0)));
  cardFans.forEach((_, i) => cardBlades.setColorAt(i, new THREE.Color(0.15, 0.25, 0)));
  for (const m of [blades, cardBlades]) { m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false; kase.add(m); }
  const turn = new THREE.Matrix4(), tmp = new THREE.Matrix4();
  const spin = (a: number) => {
    fans.forEach((f, i) => blades.setMatrixAt(i, tmp.multiplyMatrices(f, turn.makeRotationZ(a * (i % 2 ? 1 : 0.94)))));
    cardFans.forEach((f, i) => cardBlades.setMatrixAt(i, tmp.multiplyMatrices(f, turn.makeRotationZ(-a * 0.8))));
    blades.instanceMatrix.needsUpdate = true;
    cardBlades.instanceMatrix.needsUpdate = true;
  };
  spin(0.4);

  // The PC's own light on what is round it: low by the floor fans and up by the pump and the top fans.
  const low = new THREE.PointLight(hex('pale'), 0, GLOW.reach, 2);
  low.position.set(-60, 110, 112);
  const high = new THREE.PointLight(hex('pale'), 0, GLOW.reach, 2);
  high.position.set(-60, 330, 100);
  kase.add(low, high);

  L.center.value.set(cx, -DESK.H + ATRIUM.y1 / 2, cz).multiplyScalar(DESK.SCALE);
  // Where the cursor's light stands: on the line from the point under it on the desk back toward the eye.
  const toEye = new THREE.Vector3(Math.sin(VIEW.az * D2R) * Math.cos(VIEW.el * D2R), Math.sin(VIEW.el * D2R), Math.cos(VIEW.az * D2R) * Math.cos(VIEW.el * D2R));

  let angle = 0, last = -1, level = -1;
  const set = (k: number) => {
    if (k === level) return;
    level = k;
    L.level.value = k;
    low.intensity = GLOW.low * k;
    high.intensity = GLOW.high * k;
  };
  set(0);

  return {
    group,
    alone: { at: [cx, -DESK.H + ATRIUM.y1 / 2, cz], r: 300 },
    update(s: PartState) {
      L.lamp.value.copy(s.cursor).addScaledVector(toEye, LAMP_BACK).multiplyScalar(DESK.SCALE);
      L.cursor.value.copy(s.cursor).multiplyScalar(DESK.SCALE);
      L.lampK.value = s.lights.room;
      const k = Math.max(0, Math.min(1, s.lights.pc));
      set(k);
      const w = SPIN * k * k * (3 - 2 * k);
      if (s.still) { angle = s.t * w; last = -1; }
      else { if (last >= 0) angle += Math.min(0.1, Math.max(0, s.t - last)) * w; last = s.t; }
      spin(angle);
      return w > 0 && !s.still;
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      blades.geometry.dispose(); cardBlades.geometry.dispose();
      blades.dispose(); cardBlades.dispose();
    },
  };
};

