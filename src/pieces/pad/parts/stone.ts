import * as THREE from 'three';
import { registry } from '../../../hooks/registry';
import { pause } from '../../../world/build';
import type { PartFactory } from '../part';
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
