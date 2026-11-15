import * as THREE from 'three';
import { hex } from '../../../config/palette';
import { registry } from '../../../hooks/registry';
import type { PartFactory } from '../part';
import { AXIS, BULB_AT, CROWN, FOOT, HIT, SCREEN_RIGHT, SCREEN_UP, STRIKE, TOWARD, drawn } from './lamp/form';
import { U, lampMaterials, setLampLevel } from './lamp/materials';
import { buildLamp } from './lamp/model';

// The desk lamp at the left back corner: a weighted foot, a stem, a balanced arm on friction knuckles and a spun
// bronze shade, whose top takes the stream's strike. Struck, the shade flashes in the stream's colors and then holds
// its light where it lies. Then the lamp is on by its own bulb: the vents round its crown and the gap under its cap
// burn pale gold, its rim's inner lip catches the bulb, and the pool on the desk is the stage's own light for the lamp,
// which stands at the bulb.

// The flash at the strike: how long it takes to come up, when it starts to go and when it is gone, in seconds, and how
// fast it spreads across the shade, in millimetres a second.
const FLASH = { rise: 0.03, hold: 0.05, gone: 0.34, spread: 480 };
// The stream's own light on the shade and what is near it, in candela at full: lying on it, and at the flash.
const STREAM_LIGHT = { on: 0.0012, flash: 0.0035, reach: 0.22, out: 24 };

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const build: PartFactory = () => {
  const { mats, of } = lampMaterials();
  const { group, tris, meshes } = buildLamp(of);

  const out = HIT.clone().sub(CROWN.clone().addScaledVector(AXIS, 40)).normalize();
  const streamLight = new THREE.PointLight(hex('flame'), 0, STREAM_LIGHT.reach, 2);
  streamLight.position.copy(HIT).addScaledVector(out, STREAM_LIGHT.out);
  group.add(streamLight);
  // The stream comes down onto the shade from the upper right of the screen.
  U.uStrikeL.value.copy(HIT).addScaledVector(SCREEN_UP.clone().multiplyScalar(0.8).addScaledVector(SCREEN_RIGHT, 0.45).addScaledVector(TOWARD, 0.35).normalize(), 90);
  const flameC = new THREE.Color(hex('flame')), hotC = new THREE.Color(hex('hot'));

  const bulbAt = new THREE.Vector3();
  const seeBulb = (_r: THREE.WebGLRenderer, _s: THREE.Scene, cam: THREE.Camera) => {
    U.uBulbV.value.copy(bulbAt.copy(BULB_AT).applyMatrix4(group.matrixWorld).applyMatrix4(cam.matrixWorldInverse));
  };
  for (const m of meshes) m.onBeforeRender = seeBulb;

  // For measuring from a script: how many triangles, and where the lamp's highest and left most points are drawn
  // against the top of the shade and the foot, in host heights.
  registry.tool('lampReach', () => {
    let hi = { at: [0, 1e9] as [number, number], p: [0, 0, 0] }, left = { at: [1e9, 0] as [number, number], p: [0, 0, 0] };
    const p = new THREE.Vector3();
    for (const m of meshes) {
      const pos = m.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        const w = drawn(p);
        if (w[1] < hi.at[1]) hi = { at: w, p: p.toArray() };
        if (w[0] < left.at[0]) left = { at: w, p: p.toArray() };
      }
    }
    let footLeft = 1e9;
    for (let k = 0; k < 360; k++) { const a = (k * Math.PI) / 180; footLeft = Math.min(footLeft, drawn(FOOT.at.clone().add(new THREE.Vector3(Math.cos(a) * FOOT.r, FOOT.bead, Math.sin(a) * FOOT.r)))[0]); }
    return { tris, meshes: meshes.length, highest: hi, shadeTop: drawn(STRIKE), leftmost: left, footLeft,  crown: CROWN.toArray(), hit: HIT.toArray() };
  });

  return {
    group,
    alone: { at: [-805, 232, -180], r: 245 },
    update(s) {
      setLampLevel(mats, s.lights.lamp);
      const { on, since } = s.stream;
      const flash = since >= 0 ? smooth(0, FLASH.rise, since) * (1 - smooth(FLASH.hold, FLASH.gone, since)) * smooth(0, 0.15, on) : 0;
      U.uOn.value = on;
      U.uFlash.value = flash;
      U.uFlashR.value = 10 + FLASH.spread * Math.min(Math.max(since, 0), FLASH.gone);
      streamLight.intensity = STREAM_LIGHT.on * on + STREAM_LIGHT.flash * flash;
      streamLight.color.copy(flameC).lerp(hotC, flash);
      return false;
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      for (const m of Object.values(mats)) m.dispose();
    },
  };
};
