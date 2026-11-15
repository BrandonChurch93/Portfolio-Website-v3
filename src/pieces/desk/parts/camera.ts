import * as THREE from 'three';
import { Builder, at, slice, xf } from '../../../world/build';
import { MAT } from '../layout';
import type { PartFactory } from '../part';
import { cameraArt } from './camera/art';
import { body, MOUNT } from './camera/body';
import { DEG, Put } from './camera/forms';
import { CAP, ZOOM, cap, prime, zoom } from './camera/lenses';
import { cameraMaterials } from './camera/materials';

// His camera on the mat, as a photographer lays his kit down: the body turned three quarters to the visitor so its
// lens and its top plate show together, the standard zoom lying on its side with its glass toward the visitor, and
// the prime's cap lying open side up, its spring and latches showing. One part, merged by material. It takes no light
// of its own: the room, the desk's lamp, the monitor and the cursor's light are what show it.

// The visitor's view, as a direction from the desk: round to the left and up (VIEW in ../layout.ts). The engraving on
// each barrel is turned to face it.
const SEE = new THREE.Vector3(Math.cos(30 * DEG) * Math.sin(-24 * DEG), Math.sin(30 * DEG), Math.cos(30 * DEG) * Math.cos(-24 * DEG));

// Where the three stand on the mat, in the desk's millimetres, and how far each is turned, in degrees: all in the
// mat's right hand third, each seen clear of the other two from the page's view, and low enough that the headphones'
// stand on the timber behind them is not hidden.
export const ARRANGE = {
  camera: [450, 170, 16],
  lens: [705, 90, 10],
  cap: [600, 290, 20],
} as const satisfies Record<string, readonly [x: number, z: number, turn: number]>;
// The prime against the body: a fast prime's girth and length, not a zoom's.
const PRIME_SCALE: [number, number, number] = [0.88, 0.72, 0.88];

const ground = (name: keyof typeof ARRANGE) => { const [x, z, turn] = ARRANGE[name]; return xf({ p: [x, MAT.h, z], r: [0, turn * DEG, 0] }); };

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
  await slice();
  const m = cameraMaterials(art);
  await slice();

  const b = new Builder();
  const root = new Put(b, new THREE.Matrix4());
  const camT = ground('camera'), lensGround = ground('lens'), capGround = ground('cap');
  // The zoom lies on its side, on its flared front and its zoom ring, its glass toward the visitor.
  const lensT = lensGround.clone().multiply(xf({ p: [0, ZOOM.r, 0], r: [Math.PI / 2, 0, 0] })).multiply(xf({ p: [0, -ZOOM.height / 2, 0] }));
  // The cap lies open side up, on its rim.
  const capT = capGround.clone().multiply(xf({ p: [0, CAP.h, 0], r: [Math.PI, 0, 0] }));

  // Where the view is from, in each thing's own frame, for the engraving.
  const camSee = SEE.clone().applyMatrix4(new THREE.Matrix4().extractRotation(camT).invert());
  // The prime's frame stands its y along the camera's z: its (x, z) are the camera's (x, -y).
  const primeMid = Math.atan2(camSee.x, -camSee.y);
  const lensSee = SEE.clone().applyMatrix4(new THREE.Matrix4().extractRotation(lensT).invert());

  const cam = root.sub(camT);
  await body(cam, m);
  await slice();
  await prime(cam.sub(xf({ p: [MOUNT.x, MOUNT.y, MOUNT.z + 1.4], r: [Math.PI / 2, 0, 0], s: PRIME_SCALE })), m, { mid: primeMid, dir: -1, flip: true, front: false });
  await slice();
  // Lying on its side, the zoom's barrel is read from its front, so its band's lettering runs the other way.
  await zoom(root.sub(lensT), m, { mid: Math.atan2(lensSee.x, lensSee.z), dir: -1, flip: true, front: false });
  await slice();
  await cap(root.sub(capT), m);
  await slice();

  // Contact shadows: under the body and the grip, a lighter one under the prime that stands just clear of the mat,
  // along the zoom where it lies, under the cap.
  const lift = 0.35;
  cam.add(shadowPlate(65, 21, 6, 0.75), m.shadow, at(0, lift, 0), false);
  cam.add(shadowPlate(17, 25, 15, 0.6), m.shadow, at(-47, lift, 20), false);
  cam.add(shadowPlate(27, 30, 24, 0.38), m.shadow, at(MOUNT.x, lift, 52), false);
  root.sub(lensGround).add(shadowPlate(30, 58, 26, 0.75), m.shadow, at(0, lift, 0), false);
  root.sub(capGround).add(shadowPlate(37, 37, 37, 0.7), m.shadow, at(0, lift, 0), false);

  const meshes = await b.buildInSlices(group, 'camera');
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
