import * as THREE from 'three';
import { Builder, at, pause, xf } from '../../../world/build';
import { MAT, PLACES } from '../layout';
import type { PartFactory } from '../part';
import { cameraArt } from './camera/art';
import { body, MOUNT } from './camera/body';
import { DEG, Put } from './camera/forms';
import { cap, prime, zoom } from './camera/lenses';
import { cameraMaterials } from './camera/materials';

// His camera on the mat: a mirrorless body with a fast prime on it, a standard zoom standing on its rear cap behind
// it, and the prime's cap lying face up in front. One part, merged by material. It takes no light of its own: the
// room, the desk's lamp, the monitor and the cursor's light are what show it.

// The visitor's view, as a direction from the desk: round to the left and up (VIEW in ../layout.ts). The engraving on
// each barrel is turned to face it.
const SEE = new THREE.Vector3(Math.cos(30 * DEG) * Math.sin(-24 * DEG), Math.sin(30 * DEG), Math.cos(30 * DEG) * Math.cos(-24 * DEG));

const place = (name: 'camera' | 'lens' | 'cap', lift = MAT.h) => { const [x, z, turn] = PLACES[name]; return xf({ p: [x, lift, z], r: [0, turn * DEG, 0] }); };

// A contact shadow: a rounded rectangle on the mat, half sizes hx and hz, its corner, its strength.
function shadowPlate(hx: number, hz: number, corner: number, k: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(2 * (hx + 18), 2 * (hz + 18)).rotateX(-Math.PI / 2);
  const p = g.getAttribute('position'), uv = new Float32Array(p.count * 2), cell = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getZ(i); cell.set([hx, hz, corner, k], i * 4); }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  return g;
}

export const build: PartFactory = async () => {
  const group = new THREE.Group();
  group.name = 'camera';
  const art = await cameraArt(8);
  const m = cameraMaterials(art);
  await pause();

  const b = new Builder();
  const root = new Put(b, new THREE.Matrix4());
  const camT = place('camera'), lensT = place('lens'), capT = place('cap');

  // Where the view is from, in each thing's own frame, for the engraving.
  const camSee = SEE.clone().applyMatrix4(new THREE.Matrix4().extractRotation(camT).invert());
  // The prime's frame stands its y along the camera's z: its (x, z) are the camera's (x, -y).
  const primeMid = Math.atan2(camSee.x, -camSee.y);
  const lensSee = SEE.clone().applyMatrix4(new THREE.Matrix4().extractRotation(lensT).invert());

  const cam = root.sub(camT);
  body(cam, m);
  await pause();
  prime(cam.sub(xf({ p: [MOUNT.x, MOUNT.y, MOUNT.z + 1.4], r: [Math.PI / 2, 0, 0] })), m, { mid: primeMid, dir: -1, flip: true, front: false });
  await pause();
  zoom(root.sub(lensT), m, { mid: Math.atan2(lensSee.x, lensSee.z), dir: 1, flip: false, front: false });
  cap(root.sub(capT), m);

  // Contact shadows: under the body and the grip, a lighter one under the lens that stands just clear of the mat,
  // under the zoom's rear cap, under the front cap.
  const lift = 0.35;
  cam.add(shadowPlate(65, 21, 6, 0.75), m.shadow, at(0, lift, 0), false);
  cam.add(shadowPlate(17, 25, 15, 0.6), m.shadow, at(-47, lift, 20), false);
  cam.add(shadowPlate(30, 36, 26, 0.38), m.shadow, at(MOUNT.x, lift, 64), false);
  root.sub(lensT).add(shadowPlate(33, 33, 33, 0.8), m.shadow, at(0, lift, 0), false);
  root.sub(capT).add(shadowPlate(37, 37, 37, 0.7), m.shadow, at(0, lift, 0), false);

  const meshes = b.build(group, 'camera');
  const box = new THREE.Box3();
  for (const mesh of meshes) {
    if (mesh.material === m.shadow) { mesh.renderOrder = -1; continue; }
    mesh.geometry.computeBoundingBox();
    box.union(mesh.geometry.boundingBox!);
  }
  const mid = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());

  return {
    group,
    alone: { at: [mid.x, mid.y, mid.z], r: Math.max(size.x, size.z) * 0.42 },
    dispose() {
      for (const mesh of meshes) mesh.geometry.dispose();
      for (const mat of m.all) mat.dispose();
      art.ink.dispose();
    },
  };
};
