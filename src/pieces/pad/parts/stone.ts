import * as THREE from 'three';
import { registry } from '../../../hooks/registry';
import { pause } from '../../../world/build';
import type { PartFactory } from '../part';
import { ROLL } from './rocket/fire';
import { bake } from './stone/bake';
import { EDGE, LIP, R, TOP } from './stone/form';
import { U, edgeMaterial, stoneMaterial } from './stone/material';

// The Sun stone laid flat: the Work stones' own carving, in the same copper, a disc STONE.r across under the table.
// Dark until the stream lands, lit by the room and the cursor's light. Then the stream's light runs in what is cut
// into it, ring by ring from the rim in, the middle last. Full with the stream on it, that light moves a little.
// ?boss=plain turns its middle as a plain boss in place of the face.

// The flash where the stream lands is over by this many seconds, and the light in the channels moves this fast once
// the stone is full.
const FLASH = 1.5;
const LIVE = { from: 0.97, pace: 1 };
const FLASH_HEAT = 0.9;
const BUILD = [1.2, 2.8];
// The heat spreads a ring at a time: spread all at once, nothing changed on the stone from the flash to the lift.
const SPREAD = { at: [0, 0.22, 0.42, 0.62, 0.82, 1.02], r: [44, 78, 112, 146, 168, 214], rise: 0.09, flare: 0.2 };
const spread = (age: number) => {
  let r = 0, front = 0;
  SPREAD.at.forEach((at, i) => {
    if (age <= at) return;
    const k = Math.min(1, (age - at) / SPREAD.rise);
    r = (i ? SPREAD.r[i - 1] : 0) + (SPREAD.r[i] - (i ? SPREAD.r[i - 1] : 0)) * k * (2 - k);
    front = Math.exp(-(age - at) / SPREAD.flare);
  });
  return { r, front };
};

export const build: PartFactory = async ({ renderer }) => {
  const plain = typeof location !== 'undefined' && new URLSearchParams(location.search).get('boss') === 'plain';
  const carving = await bake(renderer, plain);
  await pause();
  const group = new THREE.Group();

  // The shell the carving is drawn on: its top over the highest the carving stands, and its side down to the rim's lip.
  const shellGeo = new THREE.CylinderGeometry(R, R, TOP - LIP + 0.6, 192, 1, false);
  shellGeo.translate(0, (TOP + LIP - 0.6) / 2, 0).rotateY(Math.PI);
  const top = new THREE.Mesh(shellGeo, stoneMaterial(carving));
  top.receiveShadow = true;
  top.castShadow = false;
  top.userData.noAO = true;
  top.userData.noWire = true;
  const at = new THREE.Vector3();
  top.onBeforeRender = (_r, _s, cam) => { U.uCam.value.copy(top.worldToLocal(at.setFromMatrixPosition(cam.matrixWorld))); };
  group.add(top);

  // Both are turned so the seam where they close lies at the back.
  const edge = new THREE.Mesh(new THREE.LatheGeometry(EDGE.map(([r, y]) => new THREE.Vector2(r, y)), 192).rotateY(Math.PI), edgeMaterial());
  edge.castShadow = edge.receiveShadow = true;
  group.add(edge);

  registry.tool('stoneShow', (k: number) => { U.uShow.value = k; });

  return {
    group,
    alone: { at: [0, 0, 0], r: R * 1.05 },
    update(s) {
      U.uLamp.value.copy(s.cursor);
      U.uFill.value = s.fill;
      U.uOn.value = s.stream.on;
      U.uSince.value = s.stream.since;
      const rise = BUILD[0] + (BUILD[1] - BUILD[0]) * Math.max(0, (s.burn - 0.35) / 0.65);
      const leave = Math.exp(-s.climb / ROLL.fade) * Math.max(0, 1 - s.climb / ROLL.gone);
      const steady = rise * s.burn * leave;
      U.uHeat.value = steady + FLASH_HEAT * s.flash;
      U.uSteady.value = steady;
      U.uLeave.value = leave;
      const sp = spread(s.launch);
      U.uSpread.value = sp.r;
      U.uFront.value = sp.front;
      const live = s.still ? 0 : Math.min(1, Math.max(0, (s.fill - LIVE.from) / (1 - LIVE.from))) * s.stream.on;
      U.uLive.value = live;
      U.uTime.value = s.still ? 0 : s.t * LIVE.pace;
      return live > 0 || (s.stream.on > 0 && s.stream.since < FLASH);
    },
    dispose() {
      shellGeo.dispose();
      edge.geometry.dispose();
      (top.material as THREE.Material).dispose();
      (edge.material as THREE.Material).dispose();
      carving.dispose();
    },
  };
};
