import * as THREE from 'three';
import { hex } from '../../config/palette';
import type { Tier } from '../../config/site';
import { clock } from '../../world/clock';
import { studioScene } from '../../world/env';
import type { Piece, PieceOptions } from '../../world/piece';
import { Stage } from '../../world/stage';
import type { Anchor } from '../../world/struck';
import { finish, trueDarks } from '../../world/tone';
import { SIDE, myTurn } from '../../world/turn';
import { HOST, SCALE, VIEW } from './layout';
import { PARTS, type CityPart, type PartFactory, type PartName, type PartState } from './part';

// The city in the hero, made new, as one piece: the ground that floats, the spire, the core's towers, and the places
// round the core (the temple quarter, the gardens and farms, the port). Each is a part
// (./part.ts), built in its own file in ./parts and driven from here. This file is the stage they stand on: the
// view, the lights and the cursor's light.
// It is drawn at one size, a unit to the same number of pixels whatever its host's height, with the ground a set
// distance above the foot of its host, by showing a part of a larger view whose middle is the ground's middle: the
// picture is the same picture at every height.
// ?only=spire shows one part alone.
// It draws on a clear ground: the night sky and the glow behind it are the page's, and its falls are the stream's.

const D2R = Math.PI / 180, M = SCALE;
// A part seen alone: how much of the host's height it fills, and the field of view it is seen with.
const ALONE = { fill: 0.62, fov: 12 };
// The cursor's light: how far in front of the city it stands, in metres, how far it ranges across and up as shares
// of what the host shows, and how strong it is.
const LAMP = { back: 1.7, across: 1.1, up: 1.1, power: 16 };
// The canvas fades to nothing over this share of its rim, so nothing can end at its edge.
const RIM = 0.05;
// The room the city is seen by, as the desk's is: how strongly its things reflect it, and two wide pale lights in
// it, one behind and to the right and one in front and to the left. They are part of what is reflected and not
// lights of their own, which on a canvas this large cost more than a frame has.
const ROOM = {
  env: 0.3,
  lights: [
    { power: 9, size: [3.2, 0.6], at: [1.6, 1.5, -2.2], to: [0, 0.2, 0] },
    { power: 5, size: [3.2, 1.4], at: [-1.8, 1.4, 2.6], to: [0, 0.2, 0] },
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

const loaders: Record<PartName, () => Promise<PartFactory>> = {
  ground: () => import('./parts/ground').then((m) => m.build),
  spire: () => import('./parts/spire').then((m) => m.build),
  towers: () => import('./parts/towers').then((m) => m.build),
  temple: () => import('./parts/temple').then((m) => m.build),
  gardens: () => import('./parts/gardens').then((m) => m.build),
  port: () => import('./parts/port').then((m) => m.build),
};

export interface CityExtras {
  // Where a point of the city is drawn in its host, in units.
  where(x: number, y: number, z: number): Anchor;
  // What it cost: the milliseconds each part took to build, what the first frame took, what the last frame drew, and
  // how many shader programs it has had compiled.
  stats(): { built: Record<string, number>; first: number; calls: number; triangles: number; programs: number; passes: string[] };
}
export type CityPiece = Piece & CityExtras;

export function createSkyCity(): CityPiece {
  let stage: Stage | null = null, canvas: HTMLCanvasElement | null = null;
  let parts: { name: PartName; part: CityPart }[] = [];
  let off: (() => void) | null = null, watch: ResizeObserver | null = null, near: IntersectionObserver | null = null;
  let seen = true, stale = true, moving = false, urgent = false, cast = true, hold: number | null = null, only: PartName | null = null;
  let lampUV = { x: 0.62, y: 0.3 };
  const built: Record<string, number> = {};
  let first = 0;
  const aim = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), back = new THREE.Vector3(), mid = new THREE.Vector3(), cursor = new THREE.Vector3();
  let reach = 1;
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
    stage.lamp.target.position.copy(only ? aim : mid).multiplyScalar(only ? 1 : 0.5);
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
    const s: PartState = { t: hold ?? clock.now(), cursor, still: reduced || frozen || stage.tier === 'static' };
    moving = false;
    for (const { part } of parts) if (part.update?.(s) && !s.still) moving = true;
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
      stage = new Stage(h, canvas, { tier: opts.tier, fov: ALONE.fov, near: 0.3, far: 40, bloom: { strength: 0.2, threshold: 1.8, radius: 0.35 }, ao: 0.02, aoIntensity: 1, aoSamples: 8, aoScale: 0.5, bloomScale: 0.5, envIntensity: ROOM.env, env: room, lampAngle: 0.9 });
      trueDarks(stage.renderer);
      finish(stage, RIM);
      const s = stage.scene;
      const root = new THREE.Group();
      root.scale.setScalar(M);
      s.add(root);
      const names = only ? [only] : [...PARTS];
      parts = [];
      for (const name of names) {
        const make = await loaders[name](), from = performance.now(), part = await make({ tier: opts.tier, renderer: stage.renderer });
        built[name] = Math.round(performance.now() - from);
        parts.push({ name, part });
        root.add(part.group);
      }

      // The room. A light is turned down by its strength and never hidden: hiding one makes every material compile
      // again.
      const hemi = new THREE.HemisphereLight(0x3d3731, 0x100e0c, 0.55);
      s.add(hemi);
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
      canvas?.remove();
      canvas = null;
    },
  };
}
