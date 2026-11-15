import * as THREE from 'three';
import { hex } from '../../config/palette';
import type { Tier } from '../../config/site';
import { clock } from '../../world/clock';
import { studioScene } from '../../world/env';
import type { Piece, PieceOptions } from '../../world/piece';
import { Stage } from '../../world/stage';
import type { Anchor, Struck } from '../../world/struck';
import { finish, trueDarks } from '../../world/tone';
import { SIDE, myTurn } from '../../world/turn';
import { HOST, ROCKET, SCALE, STONE, VIEW, burn, climbed } from './layout';
import { PARTS, type PadPart, type PartFactory, type PartName, type PartState } from './part';

// The launch pad in Contact, as one piece: the Sun stone laid flat, the table on it, the tower and the rocket. Each
// is a part (./part.ts), built in its own file in ./parts and driven from here. This file is the stage they stand
// on: the view, the lights, the cursor's light, and what the page tells the pad.
// It is drawn at one size, a unit to the same number of pixels whatever its host's height, with the stone at the
// foot of its host: a taller host shows more of the sky over the pad and nothing else changes. That is done by
// showing a part of a larger view whose middle is the stone, so the picture is the same picture at every height.
// ?only=rocket shows one part alone, ?fill=0.6 holds the stone that far lit, and ?launch=2.3 holds the launch that
// many seconds in.
// It draws on a clear ground. The floor under it is the page's own ground, which takes the pad's light and shadow
// close to it and is gone a little way out, so the piece never sits in a rectangle.

const D2R = Math.PI / 180, M = SCALE;
// A part seen alone: how much of the host's height it fills, and the field of view it is seen with.
const ALONE = { fill: 0.62, fov: 12 };
// The cursor's light: how far in front of the pad it stands, in metres, how far it ranges across and up as shares
// of what the host shows, and how strong it is.
const LAMP = { back: 1.5, across: 1.25, up: 1, power: 16 };
// The floor: how far out along and toward the visitor it has gone to nothing, in units, and the share of that
// reach inside which it is whole.
const FLOOR = { reach: [392, 470] as [number, number], whole: 0.3, color: 0x060504 };
// The canvas fades to nothing over this share of its rim, so nothing can end at its edge.
const RIM = 0.05;
// The room the pad is seen by, as the desk's is: how strongly its things reflect it, and two wide pale lights in
// it, one behind and to the right and one in front and to the left. They are part of what is reflected and not
// lights of their own, which on a canvas this large cost more than a frame has.
const ROOM = {
  env: 0.3,
  lights: [
    { power: 9, size: [2.6, 0.6], at: [1.4, 1.6, -1.8], to: [0, 0.4, 0] },
    { power: 5, size: [2.6, 1.4], at: [-1.6, 1.3, 2.4], to: [0, 0.3, 0] },
  ] as { power: number; size: [number, number]; at: [number, number, number]; to: [number, number, number] }[],
};
// The light the lit stone throws up onto the table, the tower and the rocket. It stands on the stone's middle and
// shines up in a wide cone, so it lights what stands on the stone and never the stone itself, which lights its own
// carving: a light close over a surface burns a white spot into it. How wide the cone is, in degrees, how far it
// reaches, in metres, and how strong it is with the stone full.
const GLOW = { cone: 72, reach: 1.8, power: 2.2 };
// The engine's light: how far under the engine's mouth it stands, in units, and how strong it is at full thrust.
const FIRE = { under: 12, power: 0.7 };

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
  m.name = 'pad-floor';
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vFloor;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFloor = position.xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vFloor;').replace('#include <dithering_fragment>', `#include <dithering_fragment>
  gl_FragColor.a *= 1.0 - smoothstep(${FLOOR.whole.toFixed(2)}, 1.0, length(vFloor / vec2(${FLOOR.reach[0].toFixed(1)}, ${FLOOR.reach[1].toFixed(1)})));`);
  };
  m.customProgramCacheKey = () => 'pad-floor';
  return m;
}

const loaders: Record<PartName, () => Promise<PartFactory>> = {
  stone: () => import('./parts/stone').then((m) => m.build),
  table: () => import('./parts/table').then((m) => m.build),
  tower: () => import('./parts/tower').then((m) => m.build),
  rocket: () => import('./parts/rocket').then((m) => m.build),
};

export interface PadExtras {
  // How far the stone is lit, from its rim (0) to its middle (1). The page runs it on the clock once the stream is on
  // the stone.
  setFill(k: number): void;
  // The seconds since the stone became full: the launch's own clock. At 0 or less the rocket stands on its table.
  setLaunch(age: number): void;
  // Where a point of the pad is drawn in its host, in units.
  where(x: number, y: number, z: number): Anchor;
  // What it cost: the milliseconds each part took to build, what the first frame took, what the last frame drew, and
  // how many shader programs it has had compiled.
  stats(): { built: Record<string, number>; first: number; calls: number; triangles: number; programs: number; passes: string[] };
}
export type PadPiece = Piece & Struck & PadExtras;

export function createPad(): PadPiece {
  let stage: Stage | null = null, canvas: HTMLCanvasElement | null = null;
  let parts: { name: PartName; part: PadPart }[] = [];
  let off: (() => void) | null = null, watch: ResizeObserver | null = null, near: IntersectionObserver | null = null;
  let seen = true, stale = true, moving = false, urgent = false, cast = true, hold: number | null = null, only: PartName | null = null;
  let lampUV = { x: 0.62, y: 0.3 }, fill = 0, launch = 0;
  let glow: THREE.SpotLight | null = null, fire: THREE.PointLight | null = null;
  const built: Record<string, number> = {};
  let first = 0;
  const stream = { on: 0, since: 60 };
  const aim = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), back = new THREE.Vector3(), mid = new THREE.Vector3(), cursor = new THREE.Vector3();
  let reach = 1, shows = 1;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const place = () => {
    if (!stage) return;
    const cam = stage.camera, a = VIEW.az * D2R, e = VIEW.el * D2R;
    let d = VIEW.back * M, tall = 1;
    if (only) {
      cam.clearViewOffset();
      cam.fov = ALONE.fov;
      d = reach / Math.tan((ALONE.fov / 2) * D2R);
      cam.aspect = stage.width / stage.height;
      tall = 2 * reach;
    } else {
      // The whole view has the stone at its middle, and the host shows its upper part, down to a little under the
      // stone.
      const px = stage.width / HOST.wide, whole = Math.max(stage.height, 2 * (stage.height - HOST.up * px));
      cam.fov = (2 * Math.atan(((whole / px) * M) / (2 * d))) / D2R;
      cam.setViewOffset(stage.width, whole, 0, 0, stage.width, stage.height);
      tall = (stage.height / px) * M;
      shows = stage.height / px - HOST.up;
    }
    cam.position.set(aim.x + d * Math.cos(e) * Math.sin(a), aim.y + d * Math.sin(e), aim.z + d * Math.cos(e) * Math.cos(a));
    cam.lookAt(aim);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    cam.matrixWorld.extractBasis(right, up, back);
    // The middle of what the host shows, at the stone's distance.
    mid.copy(aim);
    if (!only) mid.addScaledVector(up, tall / 2 - HOST.up * M);
    const wide = tall * (stage.width / stage.height);
    stage.lamp.position.copy(mid).addScaledVector(right, (lampUV.x - 0.5) * wide * LAMP.across).addScaledVector(up, (0.5 - lampUV.y) * tall * LAMP.up).addScaledVector(back, LAMP.back);
    stage.lamp.target.position.copy(only ? aim : mid).multiplyScalar(only ? 1 : 0.6);
    cursor.copy(stage.lamp.position).divideScalar(M);
  };

  const frame = () => {
    if (!stage || !seen) return;
    const frozen = clock.isFrozen() || hold !== null;
    if (!stale && !moving) return;
    if (!urgent && !frozen && !myTurn(SIDE.desk)) return;
    urgent = false;
    stale = false;
    place();
    const now = hold ?? clock.now(), b = burn(launch), climb = climbed(launch);
    const s: PartState = { t: now, fill, launch, burn: b, climb, stream, cursor, still: reduced || frozen || stage.tier === 'static' };
    if (glow) glow.intensity = GLOW.power * fill;
    if (fire) { fire.intensity = FIRE.power * b; fire.position.y = (ROCKET.mouth - FIRE.under + climb) * M; }
    moving = false;
    for (const { name, part } of parts) {
      if (name === 'rocket') {
        part.group.position.y = climb;
        // Once it is over the top of what the host shows, with its fire, it is not drawn.
        part.group.visible = only !== null || climb < shows + 260;
      }
      if (part.update?.(s) && !s.still) moving = true;
    }
    if (cast || frozen) stage.lamp.shadow.needsUpdate = true;
    cast = false;
    stage.render();
  };

  return {
    async mount(h: HTMLElement, opts: PieceOptions) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      h.prepend(canvas);
      const q = new URLSearchParams(location.search), asked = q.get('only') as PartName | null;
      only = asked && PARTS.includes(asked) ? asked : null;
      if (q.get('fill')) fill = Math.min(1, Math.max(0, Number(q.get('fill'))));
      if (q.get('launch')) { launch = Number(q.get('launch')); fill = 1; }
      stage = new Stage(h, canvas, { tier: opts.tier, fov: ALONE.fov, near: 0.3, far: 40, bloom: { strength: 0.22, threshold: 1.6, radius: 0.3 }, ao: 0.02, aoIntensity: 1, aoSamples: 8, aoScale: 0.5, bloomScale: 0.5, envIntensity: ROOM.env, env: room, lampAngle: 0.9 });
      trueDarks(stage.renderer);
      finish(stage, RIM);
      const s = stage.scene;
      const root = new THREE.Group();
      root.scale.setScalar(M);
      s.add(root);
      if (!only) {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * FLOOR.reach[0], 2 * FLOOR.reach[1]).rotateX(-Math.PI / 2), floorMaterial());
        floor.position.y = -STONE.edge;
        floor.renderOrder = -1;
        floor.receiveShadow = true;
        floor.userData.noWire = true;
        root.add(floor);
      }
      const names = only ? [only] : [...PARTS];
      parts = [];
      for (const name of names) {
        const make = await loaders[name](), from = performance.now(), part = await make({ tier: opts.tier, renderer: stage.renderer });
        built[name] = Math.round(performance.now() - from);
        parts.push({ name, part });
        root.add(part.group);
      }

      // The stone's light on what stands on it, and the engine's. Then the room. A light is turned down by its
      // strength and never hidden: hiding one makes every material compile again.
      glow = new THREE.SpotLight(hex('flame'), 0, GLOW.reach, GLOW.cone * D2R, 0.7, 2);
      glow.position.set(0, 0, 0);
      glow.target.position.set(0, 1, 0);
      fire = new THREE.PointLight(hex('hot'), 0, 0, 2);
      fire.position.set(0, (ROCKET.mouth - FIRE.under) * M, 0);
      const hemi = new THREE.HemisphereLight(0x3d3731, 0x100e0c, 0.55);
      s.add(glow, glow.target, fire, hemi);
      stage.lamp.intensity = LAMP.power;
      stage.lamp.shadow.autoUpdate = false;
      stage.lamp.shadow.needsUpdate = true;

      if (only && parts[0]) {
        root.updateMatrixWorld(true);
        const own = parts[0].part.alone, ball = own ? new THREE.Sphere(new THREE.Vector3(...own.at).multiplyScalar(M), own.r * M) : new THREE.Box3().setFromObject(parts[0].part.group).getBoundingSphere(new THREE.Sphere());
        aim.copy(ball.center);
        reach = ball.radius / ALONE.fill;
      }
      stage.resize();
      place();
      const from = performance.now();
      await stage.warm();
      first = Math.round(performance.now() - from);
      watch = new ResizeObserver(() => { stage?.resize(); stale = true; frame(); });
      watch.observe(h);
      near = new IntersectionObserver((es) => { seen = es.some((e) => e.isIntersecting); if (seen) { stale = true; frame(); } });
      near.observe(h);
      off = clock.onFrame(frame);
      cast = true;
      stale = true;
      frame();
      opts.onReady?.();
    },
    setLamp(x: number, y: number) {
      if (Math.abs(x - lampUV.x) + Math.abs(y - lampUV.y) < 0.002) return;
      lampUV = { x, y };
      cast = true;
      stale = true;
    },
    setFill(k: number) {
      const v = Math.min(1, Math.max(0, k));
      if (v === fill) return;
      fill = v;
      stale = true;
    },
    setLaunch(age: number) {
      if (age === launch) return;
      // The engine lights in the frame the page asks for it, and does not wait for the pad's turn.
      if (age > 0 !== launch > 0) urgent = true;
      launch = age;
      cast = true;
      stale = true;
    },
    setStream(on: number, since: number) {
      if (on === stream.on && (since > 2 || since === stream.since)) return;
      if (since < stream.since || on > 0 !== stream.on > 0) urgent = true;
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
    stats() {
      const info = stage?.renderer.info.render;
      return { built, first, calls: info?.calls ?? 0, triangles: info?.triangles ?? 0, programs: stage?.renderer.info.programs?.length ?? 0, passes: stage?.composer.passes.map((x) => x.constructor.name + (x.enabled ? '' : ' off')) ?? [] };
    },
    setProgress() {},
    setWaterLight() {},
    setMaking(on: boolean) { if (stage) { stage.setMaking(on, stage.scene); stale = true; } },
    setTier(tier: Tier) { if (!stage) return; stage.setTier(tier); finish(stage, RIM); cast = true; stale = true; },
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
      glow = fire = null;
      canvas?.remove();
      canvas = null;
    },
  };
}
