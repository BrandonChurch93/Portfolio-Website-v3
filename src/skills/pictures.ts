import * as THREE from 'three';
import type { DeskPiece } from '../pieces/desk/index';
import { DESK, VIEW } from '../pieces/desk/layout';
import type { DeskLights } from '../pieces/desk/part';
import type { Struck, Way } from '../world/struck';

// What Skills' stage drives, live or as a picture (HANDHELD.pictures). On an iPad held sideways the desk is two
// pictures, dark and lit, and a row's thing is its picture: the stage drives these as it drives the pieces.
export type DeskLike = Pick<DeskPiece, 'where' | 'setLights' | 'setStream' | 'setSwing'>;
export type ThingLike = Pick<Struck, 'setStream' | 'setLife'>;

const D2R = Math.PI / 180;
let view: THREE.PerspectiveCamera | null = null;
// The live desk's own view, which never moves on the page, placed as its place() places it. Its width does not
// change where a point is drawn in host heights.
function deskView(): THREE.PerspectiveCamera {
  if (view) return view;
  const c = new THREE.PerspectiveCamera(VIEW.fov, 1, 0.05, 40), [x, y, z] = VIEW.aim, reach = VIEW.tall / 2;
  const a = VIEW.az * D2R, e = VIEW.el * D2R, d = reach / Math.tan((VIEW.fov / 2) * D2R);
  c.position.set(x + d * Math.cos(e) * Math.sin(a), y + d * Math.sin(e), z + d * Math.cos(e) * Math.cos(a));
  c.lookAt(x, y, z);
  c.updateMatrixWorld(true);
  view = c;
  return c;
}

// The lights that come on one after another at the lamp's strike, as one level: the lit picture's.
const lit = (l: DeskLights) => (l.lamp + l.tablet + l.monitor + l.keys + l.pc + l.word) / 6;

export function deskPictures(dark: HTMLElement, bright: HTMLElement): DeskLike {
  const v = new THREE.Vector3();
  let was = '';
  return {
    where(x, y, z) {
      v.set(x * DESK.SCALE, y * DESK.SCALE, z * DESK.SCALE).project(deskView());
      return [v.x / 2, -v.y / 2];
    },
    setLights(l) {
      const room = l.room.toFixed(4), on = lit(l).toFixed(4), key = `${room}:${on}`;
      if (key === was) return;
      was = key;
      dark.style.opacity = room;
      bright.style.opacity = on;
    },
    setStream() {},
    setSwing() {},
  };
}

// A thing comes on as a wipe from where the stream strikes it, over its way's length, and goes as the age runs back.
export function thingPicture(el: HTMLElement, life: Record<Way, number>): ThingLike {
  let was = -1;
  return {
    setLife(way, age) {
      const k = Math.max(0, Math.min(1, age / life[way])), eased = k * k * (3 - 2 * k);
      if (eased === was) return;
      was = eased;
      el.style.setProperty('--wipe', eased.toFixed(4));
    },
    setStream() {},
  };
}
