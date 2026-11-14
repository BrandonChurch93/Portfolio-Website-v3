import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { hex } from '../../config/palette';
import { COLORS, type Tier } from '../../config/site';
import { materials } from '../../desk-drafts/materials';
import { clock } from '../../world/clock';
import type { Piece, PieceOptions } from '../../world/piece';
import { Stage } from '../../world/stage';
import type { Anchor, Struck } from '../../world/struck';
import { BAY, DESK, PLACES, SCREEN, SHADE, VIEW } from './layout';
import { LIT, PARTS, type DeskLights, type DeskPart, type PartFactory, type PartName, type PartState } from './part';

// The desk in Skills, as one piece: the bench and everything on and under it. Each thing is a part (./part.ts),
// built in its own file in ./parts and driven from here. This file is the stage they stand on: the view, the
// desk's own lights, the cursor's light, and what the page tells the desk.
// It frames a fixed height of its world, so the desk is the same size against its host's height whatever the host's
// width. ?only=keyboard shows one part alone, close, on the same stage and under the same lights, and ?lights=0
// shows the desk before the stream has reached it.

const D2R = Math.PI / 180, M = DESK.SCALE;
// How much of the host's height a part seen alone fills.
const ALONE = 0.62;
// The cursor's light: how far in front of the desk it stands, how far it ranges across and up, and how strong it is.
const LAMP = { back: 1.25, across: 2.8, up: 1.5, lift: 0.35, power: 16 };

const loaders: Record<PartName, () => Promise<PartFactory>> = {
  bench: () => import('./parts/bench').then((m) => m.build),
  mat: () => import('./parts/mat').then((m) => m.build),
  lamp: () => import('./parts/lamp').then((m) => m.build),
  monitor: () => import('./parts/monitor').then((m) => m.build),
  keyboard: () => import('./parts/keyboard').then((m) => m.build),
  mouse: () => import('./parts/mouse').then((m) => m.build),
  tablet: () => import('./parts/tablet').then((m) => m.build),
  camera: () => import('./parts/camera').then((m) => m.build),
  pc: () => import('./parts/pc').then((m) => m.build),
};

export interface DeskExtras {
  // The page brings the desk's lights on with this, each from 0 to 1.
  setLights(l: DeskLights): void;
  // Where a point of the desk is drawn in its host, in the desk's millimetres.
  where(x: number, y: number, z: number): Anchor;
}
export type DeskPiece = Piece & Struck & DeskExtras;

// Where the stream strikes the lamp's shade, by the same projection as where().
export const DESK_SHADE = SHADE;

let areaLib = false;

export function createDesk(): DeskPiece {
  let stage: Stage | null = null, canvas: HTMLCanvasElement | null = null;
  let parts: { name: PartName; part: DeskPart }[] = [];
  let off: (() => void) | null = null, watch: ResizeObserver | null = null, near: IntersectionObserver | null = null;
  let seen = true, stale = true, moving = false, hold: number | null = null, only: PartName | null = null;
  let lampUV = { x: 0.62, y: 0.3 }, led = 0;
  let lights: DeskLights = { ...LIT };
  const stream = { on: 0, since: 60 };
  const dials: Partial<Record<keyof DeskLights, ((k: number) => void)[]>> = {};
  const aim = new THREE.Vector3(...VIEW.aim), right = new THREE.Vector3(), up = new THREE.Vector3(), back = new THREE.Vector3(), cursor = new THREE.Vector3(), ray = new THREE.Vector3();
  let reach = VIEW.tall / 2;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const place = () => {
    if (!stage) return;
    const a = VIEW.az * D2R, e = VIEW.el * D2R, d = reach / Math.tan((VIEW.fov / 2) * D2R);
    stage.camera.position.set(aim.x + d * Math.cos(e) * Math.sin(a), aim.y + d * Math.sin(e), aim.z + d * Math.cos(e) * Math.cos(a));
    stage.camera.lookAt(aim);
    stage.camera.updateMatrixWorld(true);
    stage.camera.matrixWorld.extractBasis(right, up, back);
    const k = reach / (VIEW.tall / 2);
    stage.lamp.position.copy(aim).addScaledVector(right, (lampUV.x - 0.5) * LAMP.across * k).addScaledVector(up, ((0.5 - lampUV.y) * LAMP.up + LAMP.lift) * k).addScaledVector(back, LAMP.back * k);
    stage.lamp.intensity = LAMP.power * lights.room;
    // Where the cursor is over the desk's top, for a part that answers it: the line from the eye through the light,
    // down to the top.
    ray.copy(stage.lamp.position).sub(stage.camera.position);
    cursor.copy(stage.camera.position).addScaledVector(ray, ray.y < -1e-4 ? -stage.camera.position.y / ray.y : 1).divideScalar(M);
  };

  const frame = () => {
    if (!stage || !seen) return;
    const frozen = clock.isFrozen() || hold !== null;
    if (!stale && !moving) return;
    stale = false;
    place();
    const s: PartState = { t: hold ?? clock.now(), lights, cursor, led, stream, still: reduced || frozen || stage.tier === 'static' };
    moving = false;
    for (const { part } of parts) if (part.update?.(s) && !s.still) moving = true;
    stage.render();
  };

  const setLights = (l: DeskLights) => {
    for (const key of Object.keys(l) as (keyof DeskLights)[]) for (const set of dials[key] ?? []) set(l[key]);
    lights = { ...l };
    stale = true;
  };

  return {
    async mount(h: HTMLElement, opts: PieceOptions) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      h.prepend(canvas);
      if (!areaLib) { RectAreaLightUniformsLib.init(); areaLib = true; }
      const q = new URLSearchParams(location.search), asked = q.get('only') as PartName | null;
      only = asked && PARTS.includes(asked) ? asked : null;
      if (q.get('lights') === '0') lights = { room: 1, lamp: 0, tablet: 0, monitor: 0, keys: 0, pc: 0 };
      stage = new Stage(h, canvas, { tier: opts.tier, fov: VIEW.fov, near: 0.05, far: 40, bloom: { strength: 0.16, threshold: 1.9, radius: 0.3 }, ao: 0.02, aoIntensity: 1, envIntensity: 0.3, env: 'studio', lampTarget: [0, -0.05, 0.1], lampAngle: 0.9 });
      const s = stage.scene;
      s.background = new THREE.Color(COLORS.bg);
      s.fog = new THREE.Fog(COLORS.bg, 6, 11);
      const root = new THREE.Group();
      root.scale.setScalar(M);
      s.add(root);
      if (!only) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), materials().floor);
        floor.position.y = -DESK.H;
        floor.receiveShadow = true;
        floor.userData.noWire = true;
        root.add(floor);
      }
      const names = only ? [only] : [...PARTS];
      parts = await Promise.all(names.map(async (name) => ({ name, part: await (await loaders[name]())({ tier: opts.tier }) })));
      for (const { part } of parts) root.add(part.group);

      // The desk's own lights: the lamp over the tablet, the monitor, and the PC's ember under the far end. Then the
      // room it is seen by before any of them is on.
      const [lx, lz] = PLACES.lamp;
      const deskLamp = new THREE.SpotLight(0xffc98f, 5.5, 0, 58 * D2R, 0.85, 2);
      deskLamp.position.set((lx + 190) * M, 438 * M, (lz + 196) * M);
      deskLamp.target.position.set((lx + 430) * M, 0, (lz + 330) * M);
      deskLamp.castShadow = true;
      deskLamp.shadow.mapSize.set(2048, 2048);
      deskLamp.shadow.bias = -0.0006;
      deskLamp.shadow.normalBias = 0.004;
      deskLamp.shadow.radius = 5;
      deskLamp.shadow.camera.near = 0.05;
      deskLamp.shadow.camera.far = 3;
      const monLight = new THREE.RectAreaLight(0xffc48a, 2.4, (SCREEN.w - 20) * M, (SCREEN.h - 30) * M);
      monLight.position.set(SCREEN.x * M, (SCREEN.low + SCREEN.h / 2) * M, (SCREEN.z + 24) * M);
      monLight.lookAt(SCREEN.x * M, 120 * M, (SCREEN.z + 560) * M);
      const pcLight = new THREE.PointLight(hex('flame'), 0.4, 1.8, 2);
      pcLight.position.set((BAY.l + BAY.r) / 2 * M, (-DESK.H + BAY.h * 0.55) * M, (BAY.front + 120) * M);
      const rim = new THREE.RectAreaLight(0xffe0c4, 8, 2.6, 0.6);
      rim.position.set(1.4, 1.2, -1.8);
      rim.lookAt(0, -0.1, 0);
      const fill = new THREE.RectAreaLight(0xffd9b8, 5.5, 2.6, 1.4);
      fill.position.set(-1.6, 0.9, 2.4);
      fill.lookAt(0, -0.3, 0);
      const hemi = new THREE.HemisphereLight(0x4a3526, 0x120c08, 0.55);
      s.add(deskLamp, deskLamp.target, monLight, pcLight, rim, fill, hemi);
      // A light is turned down by its strength and never hidden: hiding one makes every material compile again.
      const power = (l: THREE.Light) => { const full = l.intensity; return (k: number) => { l.intensity = full * k; }; };
      const env = s.environmentIntensity;
      dials.room = [power(rim), power(fill), power(hemi), (k) => { s.environmentIntensity = env * k; }];
      dials.lamp = [power(deskLamp)];
      dials.monitor = [power(monLight)];
      dials.pc = [power(pcLight)];

      // Alone, a part is looked at from the same side, close.
      if (only && parts[0]) {
        root.updateMatrixWorld(true);
        const own = parts[0].part.alone, ball = own ? new THREE.Sphere(new THREE.Vector3(...own.at).multiplyScalar(M), own.r * M) : new THREE.Box3().setFromObject(parts[0].part.group).getBoundingSphere(new THREE.Sphere());
        aim.copy(ball.center);
        reach = ball.radius / ALONE;
      }
      stage.resize();
      setLights(lights);
      place();
      await stage.warm();
      watch = new ResizeObserver(() => { stage?.resize(); stale = true; frame(); });
      watch.observe(h);
      near = new IntersectionObserver((es) => { seen = es.some((e) => e.isIntersecting); if (seen) { stale = true; frame(); } });
      near.observe(h);
      off = clock.onFrame(frame);
      stale = true;
      frame();
      opts.onReady?.();
    },
    setLamp(x: number, y: number) {
      if (Math.abs(x - lampUV.x) + Math.abs(y - lampUV.y) < 0.002) return;
      lampUV = { x, y };
      led = 1;
      stale = true;
    },
    setLights,
    setStream(on: number, since: number) {
      if (on === stream.on && (since > 2 || since === stream.since)) return;
      stream.on = on;
      stream.since = since;
      stale = true;
    },
    where(x: number, y: number, z: number): Anchor {
      if (!stage) return [0, 0];
      place();
      const v = new THREE.Vector3(x * M, y * M, z * M).project(stage.camera);
      return [(v.x * stage.width) / (2 * stage.height), -v.y / 2];
    },
    setProgress() {},
    setWaterLight() {},
    setMaking(on: boolean) { if (stage) { stage.setMaking(on, stage.scene); stale = true; } },
    setTier(tier: Tier) { stage?.setTier(tier); stale = true; },
    freeze(t: number | null) { hold = t; stale = true; frame(); },
    view() {},
    dispose() {
      off?.();
      watch?.disconnect();
      near?.disconnect();
      for (const { part } of parts) part.dispose?.();
      parts = [];
      stage?.dispose();
      stage = null;
      canvas?.remove();
      canvas = null;
    },
  };
}
