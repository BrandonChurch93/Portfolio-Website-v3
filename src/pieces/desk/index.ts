import * as THREE from 'three';
import { hex } from '../../config/palette';
import type { Tier } from '../../config/site';
import { clock } from '../../world/clock';
import type { Piece, PieceOptions } from '../../world/piece';
import { studioScene } from '../../world/env';
import { slice } from '../../world/build';
import { Stage } from '../../world/stage';
import { finish, trueDarks } from '../../world/tone';
import { SIDE, myTurn } from '../../world/turn';
import type { Anchor, Struck } from '../../world/struck';
import { areaLightTables } from './area';
import { BULB, DESK, SCREEN, SHADE, VIEW } from './layout';
import { LIT, PARTS, type DeskLights, type DeskPart, type PartFactory, type PartName, type PartState } from './part';

// The desk in Skills, as one piece: the bench and everything on and under it. Each thing is a part (./part.ts),
// built in its own file in ./parts and driven from here. This file is the stage they stand on: the view, the
// desk's own lights, the cursor's light, and what the page tells the desk.
// It frames a fixed height of its world, so the desk is the same size against its host's height whatever the host's
// width. ?only=keyboard shows one part alone, close, on the same stage and under the same lights, and ?lights=0
// shows the desk before the stream has reached it.
// It draws on a clear ground. The floor under it is the page's own ground, which takes the desk's light and its
// shadow close to it and is gone a little way out, so the piece never sits in a rectangle.

const D2R = Math.PI / 180, M = DESK.SCALE;
// How much of the host's height a part seen alone fills.
const ALONE = 0.62;
// The cursor's light: how far in front of the desk it stands, how far it ranges across and up, and how strong it is.
const LAMP = { back: 1.25, across: 2.8, up: 1.5, lift: 0.35, power: 16 };
// The floor: where it is lit and shadowed most, in the desk's millimetres, and how far out along and across the desk
// it has gone to nothing. The share of that reach inside which it is whole.
const FLOOR = { at: [0, 150] as [number, number], reach: [1500, 950] as [number, number], whole: 0.3, color: 0x060504 };
// The canvas fades to nothing over this share of its rim, so nothing can end at its edge.
const RIM = 0.05;
// The two lights that throw shadows: the cursor's and the desk lamp's. A shadow map is the whole desk drawn again, so
// each is drawn only when its light or something that throws a shadow has moved.
const CAST = { cursor: 1, lamp: 2, both: 3 };
// The room the desk is seen by before any of its lights is on: how strongly its things reflect it, and two wide pale
// lights in it, one behind and to the right and one in front and to the left, each with its strength, its size and
// where it stands and faces. They are part of what is reflected and not lights of their own: as area lights the two
// of them and the monitor's cost a sixth of the desk's whole frame.
const ROOM = {
  env: 0.3,
  lights: [
    { power: 9, size: [2.6, 0.6], at: [1.4, 1.2, -1.8], to: [0, -0.1, 0] },
    { power: 5, size: [2.6, 1.4], at: [-1.6, 0.9, 2.4], to: [0, -0.3, 0] },
  ] as { power: number; size: [number, number]; at: [number, number, number]; to: [number, number, number] }[],
};

function room(): THREE.Scene {
  const s = studioScene();
  for (const l of ROOM.lights) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(...l.size), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex('pale')).multiplyScalar(l.power / ROOM.env), side: THREE.DoubleSide }));
    m.position.set(...l.at);
    m.lookAt(...l.to);
    s.add(m);
  }
  return s;
}

function floorMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: FLOOR.color, roughness: 1, transparent: true, depthWrite: false });
  m.name = 'desk-floor';
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vFloor;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFloor = position.xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vFloor;').replace('#include <dithering_fragment>', `#include <dithering_fragment>
  gl_FragColor.a *= 1.0 - smoothstep(${FLOOR.whole.toFixed(2)}, 1.0, length(vFloor / vec2(${FLOOR.reach[0].toFixed(1)}, ${FLOOR.reach[1].toFixed(1)})));`);
  };
  m.customProgramCacheKey = () => 'desk-floor';
  return m;
}

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
  headphones: () => import('./parts/headphones').then((m) => m.build),
  word: () => import('./parts/word').then((m) => m.build),
};

export interface DeskExtras {
  // The page brings the desk's lights on with this, each from 0 to 1.
  setLights(l: DeskLights): void;
  // Where a point of the desk is drawn in its host, in the desk's millimetres.
  where(x: number, y: number, z: number): Anchor;
  // The angle the headphones hang at on their stand, in radians from straight down.
  setSwing(angle: number): void;
  // What it cost: the milliseconds each part took to build, what the first frame took, what the last frame drew, and
  // how many shader programs it has had compiled. The programs are what a visitor waits for.
  stats(): { built: Record<string, number>; first: number; calls: number; triangles: number; programs: number; passes: string[] };
}
export type DeskPiece = Piece & Struck & DeskExtras;

// Where the stream strikes the lamp's shade, by the same projection as where().
export const DESK_SHADE = SHADE;

export function createDesk(): DeskPiece {
  let stage: Stage | null = null, canvas: HTMLCanvasElement | null = null;
  let parts: { name: PartName; part: DeskPart }[] = [];
  let off: (() => void) | null = null, watch: ResizeObserver | null = null, near: IntersectionObserver | null = null;
  let seen = true, stale = true, moving = false, urgent = false, hold: number | null = null, only: PartName | null = null;
  let lampUV = { x: 0.62, y: 0.3 }, led = 0, cast = CAST.both, deskLamp: THREE.SpotLight | null = null;
  let lights: DeskLights = { ...LIT };
  const built: Record<string, number> = {};
  let first = 0;
  const stream = { on: 0, since: 60 };
  const swing = { a: 0, v: 0, t: 0 };
  const dials: Partial<Record<keyof DeskLights, ((k: number) => void)[]>> = {};
  const aim = new THREE.Vector3(...VIEW.aim), right = new THREE.Vector3(), up = new THREE.Vector3(), back = new THREE.Vector3(), cursor = new THREE.Vector3(), pointer = new THREE.Vector3(), ray = new THREE.Vector3();
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
    // Seen alone a part is framed close and the light stands that much nearer, so it is turned down by the square of
    // that: at the whole desk's strength it was ten to a hundred times too bright on a small part.
    stage.lamp.intensity = LAMP.power * lights.room * k * k;
    // Where the cursor is over the desk's top, for a part that answers it: the line from the eye through the light,
    // down to the top.
    ray.copy(stage.lamp.position).sub(stage.camera.position);
    cursor.copy(stage.camera.position).addScaledVector(ray, ray.y < -1e-4 ? -stage.camera.position.y / ray.y : 1).divideScalar(M);
    // And where the pointer itself is over the top: the line from the eye through the pointer, down to the top. The
    // light stands above the pointer, so the two are not the same place.
    ray.set(lampUV.x * 2 - 1, 1 - lampUV.y * 2, 0.5).unproject(stage.camera).sub(stage.camera.position);
    pointer.copy(stage.camera.position).addScaledVector(ray, ray.y < -1e-4 ? -stage.camera.position.y / ray.y : 1).divideScalar(M);
  };

  const frame = () => {
    if (!stage || !seen) return;
    const frozen = clock.isFrozen() || hold !== null;
    if (!stale && !moving) return;
    if (!urgent && !frozen && !myTurn(SIDE.desk)) return;
    urgent = false;
    stale = false;
    place();
    const now = hold ?? clock.now(), s: PartState = { t: now, lights, cursor, pointer, led, stream, swing: swing.a, swung: swing.v, still: reduced || frozen || stage.tier === 'static' };
    moving = false;
    for (const { part } of parts) if (part.update?.(s) && !s.still) moving = true;
    if (frozen) cast = CAST.both;
    if (cast & CAST.cursor) stage.lamp.shadow.needsUpdate = true;
    if (cast & CAST.lamp && deskLamp) deskLamp.shadow.needsUpdate = true;
    cast = 0;
    stage.render();
  };

  const setLights = (l: DeskLights, force = false) => {
    const keys = Object.keys(l) as (keyof DeskLights)[];
    if (!force && keys.every((key) => l[key] === lights[key])) return;
    for (const key of keys) for (const set of dials[key] ?? []) set(l[key]);
    // A light comes on or goes out in the frame the stream asks for it, and does not wait for the desk's turn.
    if (keys.some((key) => l[key] > 0 !== lights[key] > 0)) urgent = true;
    lights = { ...l };
    stale = true;
  };

  return {
    async mount(h: HTMLElement, opts: PieceOptions) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      h.prepend(canvas);
      const tables = areaLightTables();
      const q = new URLSearchParams(location.search), asked = q.get('only') as PartName | null;
      only = asked && PARTS.includes(asked) ? asked : null;
      if (q.get('lights') === '0') lights = { room: 1, lamp: 0, tablet: 0, monitor: 0, keys: 0, pc: 0, word: 0 };
      stage = new Stage(h, canvas, { tier: opts.tier, fov: VIEW.fov, near: 0.05, far: 40, bloom: { strength: 0.1, threshold: 2.3, radius: 0.22 }, ao: 0.02, aoIntensity: 1, aoSamples: 8, aoScale: 0.5, bloomScale: 0.5, envIntensity: ROOM.env, env: room, lampTarget: [0, -0.05, 0.1], lampAngle: 0.9 });
      trueDarks(stage.renderer);
      finish(stage, RIM);
      const s = stage.scene;
      const root = new THREE.Group();
      root.scale.setScalar(M);
      s.add(root);
      if (!only) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * FLOOR.reach[0], 2 * FLOOR.reach[1]).rotateX(-Math.PI / 2), floorMaterial());
        floor.position.set(FLOOR.at[0], -DESK.H, FLOOR.at[1]);
        floor.renderOrder = -1;
        floor.receiveShadow = true;
        floor.userData.noWire = true;
        root.add(floor);
      }
      // One part after another, each handing the thread back as it goes (slice), so building the desk never holds a
      // page that is being scrolled. Their code is fetched all at once.
      const names = only ? [only] : [...PARTS];
      const code = names.map((name) => loaders[name]());
      const mine = stage, made: { name: PartName; part: DeskPart }[] = [];
      for (const [i, name] of names.entries()) {
        const make = await code[i];
        await slice();
        const from = performance.now(), part = await make({ tier: opts.tier });
        built[name] = Math.round(performance.now() - from);
        made.push({ name, part });
        // Taken down while it was being built.
        if (stage !== mine) { for (const m of made) m.part.dispose?.(); return; }
      }
      parts = made;
      for (const { part } of parts) root.add(part.group);

      // The desk's own lights: the lamp over the tablet and the monitor. The PC carries its own. Then the room it is
      // seen by before any of them is on. The lamp and the room are the palette's pale, the least orange
      // light there is: under an orange light steel, timber and copper all came out one tone.
      deskLamp = new THREE.SpotLight(hex('pale'), 5.2, 0, 58 * D2R, 0.85, 2);
      deskLamp.position.set(BULB.at[0] * M, BULB.at[1] * M, BULB.at[2] * M);
      deskLamp.target.position.set((BULB.at[0] + BULB.aim[0] * 400) * M, (BULB.at[1] + BULB.aim[1] * 400) * M, (BULB.at[2] + BULB.aim[2] * 400) * M);
      deskLamp.castShadow = true;
      deskLamp.shadow.mapSize.set(2048, 2048);
      deskLamp.shadow.bias = -0.0006;
      deskLamp.shadow.normalBias = 0.004;
      deskLamp.shadow.radius = 5;
      deskLamp.shadow.camera.near = 0.05;
      deskLamp.shadow.camera.far = 3;
      deskLamp.shadow.autoUpdate = stage.lamp.shadow.autoUpdate = false;
      deskLamp.shadow.needsUpdate = stage.lamp.shadow.needsUpdate = true;
      const monLight = new THREE.RectAreaLight(hex('hot'), 2.2, (SCREEN.w - 20) * M, (SCREEN.h - 30) * M);
      monLight.position.set(SCREEN.x * M, (SCREEN.low + SCREEN.h / 2) * M, (SCREEN.z + 24) * M);
      monLight.lookAt(SCREEN.x * M, 120 * M, (SCREEN.z + 560) * M);
      // A warm grey, not a brown: this light reaches every surface, and a brown one tinted every neutral thing.
      const hemi = new THREE.HemisphereLight(0x3d3731, 0x100e0c, 0.55);
      s.add(deskLamp, deskLamp.target, monLight, hemi);
      // A light is turned down by its strength and never hidden: hiding one makes every material compile again.
      const power = (l: THREE.Light) => { const full = l.intensity; return (k: number) => { l.intensity = full * k; }; };
      const env = s.environmentIntensity;
      dials.room = [power(hemi), (k) => { s.environmentIntensity = env * k; }];
      dials.lamp = [power(deskLamp)];
      dials.monitor = [power(monLight)];

      // Alone, a part is looked at from the same side, close.
      if (only && parts[0]) {
        root.updateMatrixWorld(true);
        const own = parts[0].part.alone, ball = own ? new THREE.Sphere(new THREE.Vector3(...own.at).multiplyScalar(M), own.r * M) : new THREE.Box3().setFromObject(parts[0].part.group).getBoundingSphere(new THREE.Sphere());
        aim.copy(ball.center);
        reach = ball.radius / ALONE;
        // The cursor's light is aimed at the part, not at the middle of a desk that is not there.
        stage.lamp.target.position.copy(ball.center);
      }
      stage.resize();
      setLights(lights, true);
      place();
      await tables;
      if (stage !== mine) return;
      const from = performance.now();
      await stage.warm(slice);
      if (stage !== mine) return;
      first = Math.round(performance.now() - from);
      watch = new ResizeObserver(() => { stage?.resize(); stale = true; frame(); });
      watch.observe(h);
      near = new IntersectionObserver((es) => { seen = es.some((e) => e.isIntersecting); if (seen) { stale = true; frame(); } });
      near.observe(h);
      off = clock.onFrame(frame);
      cast = CAST.both;
      stale = true;
      frame();
      opts.onReady?.();
    },
    setLamp(x: number, y: number) {
      if (Math.abs(x - lampUV.x) + Math.abs(y - lampUV.y) < 0.002) return;
      lampUV = { x, y };
      led = 1;
      cast |= CAST.cursor;
      stale = true;
    },
    setLights: (l: DeskLights) => setLights(l),
    setStream(on: number, since: number) {
      if (on === stream.on && (since > 2 || since === stream.since)) return;
      if (since < stream.since || on > 0 !== stream.on > 0) urgent = true;
      stream.on = on;
      stream.since = since;
      stale = true;
    },
    setSwing(angle: number) {
      if (angle === swing.a) { if (swing.v) { swing.v = 0; stale = true; } return; }
      const now = clock.now(), dt = now - swing.t;
      swing.v = dt > 0 && dt < 0.1 ? (angle - swing.a) / dt : 0;
      swing.a = angle;
      swing.t = now;
      cast = CAST.both;
      stale = true;
    },
    where(x: number, y: number, z: number): Anchor {
      if (!stage) return [0, 0];
      place();
      const v = new THREE.Vector3(x * M, y * M, z * M).project(stage.camera);
      return [(v.x * stage.width) / (2 * stage.height), -v.y / 2];
    },
    stats() {
      const info = stage?.renderer.info.render;
      return { built, first, calls: info?.calls ?? 0, triangles: info?.triangles ?? 0, programs: stage?.renderer.info.programs?.length ?? 0, passes: stage?.composer.passes.map((x) => x.constructor.name + (x.enabled ? '' : ' off')) ?? [] };
    },
    setProgress() {},
    setWaterLight() {},
    setMaking(on: boolean) { if (stage) { stage.setMaking(on, stage.scene); stale = true; } },
    setTier(tier: Tier) { if (!stage) return; stage.setTier(tier); finish(stage, RIM); cast = CAST.both; stale = true; },
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
      deskLamp = null;
      canvas?.remove();
      canvas = null;
    },
  };
}
