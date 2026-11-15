import * as THREE from 'three';
import { hex } from '../../config/palette';
import type { Tier } from '../../config/site';
import { clock } from '../../world/clock';
import type { Piece, PieceOptions } from '../../world/piece';
import { Stage } from '../../world/stage';
import type { Anchor } from '../../world/struck';
import { finish, trueDarks } from '../../world/tone';
import { SIDE, myTurn } from '../../world/turn';
import { AIM, DEBRIS, HEART, HOST, MOONWARD, PLANET, SCALE, SPIRE, TEAR, VIEW, coreLevel } from './layout';
import { PARTS, type CityPart, type PartFactory, type PartName, type PartState } from './part';

// The world in the hero, as one piece: the top of a small planet torn in half, with the city on it, and under it
// the planet's torn inside, its core and what broke away. Each is a part (./part.ts), built in its own file in
// ./parts and driven from here. This file is the stage they stand on: the view, the lights and the cursor's light.
// It is drawn at one size, a unit to the same number of pixels whatever its host's height, with the top of its
// host a set distance over the spire's tip: the picture is the same picture at every height, and a shorter host
// only shows less of its foot.
// ?only=spire shows one part alone.
// It draws on a clear ground: the night sky and the glow behind it are the page's, and the streams that leave the
// torn face and the core are the stream's.

const D2R = Math.PI / 180, M = SCALE;
// A part seen alone: how much of the host's height it fills, and the field of view it is seen with.
const ALONE = { fill: 0.62, fov: 12 };
// The cursor's light: how far in front of the city it stands, in metres, how far it ranges across and up as shares
// of what the host shows, and how strong it is.
const LAMP = { back: 2.6, across: 1.1, up: 1.1, power: 7 };
// The canvas fades to nothing over this share of its rim, so nothing can end at its edge.
const RIM = 0.05;
// What the world's polished metal reflects. He asked for gold, bronze and copper that shine, and a mirror shows
// only what is round it: so the room holds the things a polished face on this world would catch. The moon, small
// and very bright, where the moon is in the page's sky. The glow of the city in the sky behind and above. A long
// pale strip overhead and one at each side, as a photographer's lights are, for the bright hard edged lines that
// make a curved thing read as polished. And darkness between, so a highlight has something to stand against.
// These are part of what is reflected and not lights of their own, which on a canvas this large cost more than a
// frame has. Powers are as seen in a mirror.
const ROOM = {
  env: 0.3,
  moon: { power: 260, across: 0.7, far: 7 },
  glow: { power: 2.6, size: [16, 5] as [number, number], at: [0, 1.2, -7] as [number, number, number] },
  strips: [
    { power: 20, size: [5.5, 0.22], at: [0.6, 3.4, 2.2], to: [0, 0, 0] },
    // In front of the world and level with it, behind the eye: a polished face turned to the visitor reflects what
    // is there, and with nothing there every such face was dark however polished.
    { power: 15, size: [9, 0.16], at: [0, 0.7, 7], to: [0, 0.3, 0] },
    { power: 5, size: [9, 0.5], at: [0, -1.4, 6], to: [0, 0, 0] },
    { power: 11, size: [0.2, 3.6], at: [4.4, 1.2, 1.6], to: [0, 0.4, 0] },
    { power: 6, size: [0.2, 3.6], at: [-4.4, 1.2, 1.6], to: [0, 0.4, 0] },
    { power: 9, size: [3.2, 0.6], at: [1.6, 1.5, -2.2], to: [0, 0.2, 0] },
  ] as { power: number; size: [number, number]; at: [number, number, number]; to: [number, number, number] }[],
};
// The moon, which is in the upper right of the page's sky: the one light that gives the world a lit side and a dark
// one. Where it stands from the world (the plan has it), how strong it is, and how many pixels across its shadows are drawn. It never
// moves, so its shadows are drawn once.
const MOON = { from: MOONWARD, power: 15, map: { high: 4096, mid: 2048, low: 1024, static: 2048 } as Record<Tier, number>, reach: 1100 };
// The dim light of the sky, which fills what the moon does not reach. It is kept low: with more, the world had no
// dark side and read as flat.
const SKY = 0.1;
// Depth as darkness: what is further from the eye sinks toward the page's ground, so the far side of the city
// stands dark against the glow behind it and the near side stands clear of it. From how far in front of the
// world's middle it begins, and how far behind it would be whole, in metres.
const HAZE = { from: 0.5, to: 2.2 };
// How many pixels the world is drawn with at most. Its canvas is taller than the screen and every pixel of it is
// lit by three lights through two shadow maps: at a screen's full density it drew 30 frames a second on a fast
// laptop, and at this count 60 with room to spare. The stage's own budget is for a canvas the size of a screen.
const PIXELS = 2.8e6;
// The light the core throws on the torn rock and on what broke away.
const GLOW = { power: 14 };
// The heights of the frame each part lies between, lowest first. A part none of which the screen shows is not
// drawn and is not told the time, so the core and what broke away cost nothing while they are under the foot of
// the screen, and the city costs nothing once it is over the top.
const EDGE_Y = -PLANET.r * (1 - Math.cos((PLANET.cap * Math.PI) / 180)), TOP = SPIRE.tall + HOST.over;
const ABOVE: readonly [number, number] = [EDGE_Y - 80, TOP];
const SPAN: Record<PartName, readonly [number, number]> = {
  ground: [EDGE_Y - 80, 60], spire: ABOVE, towers: ABOVE, temple: ABOVE, gardens: ABOVE, dunes: ABOVE, monument: ABOVE, craft: [EDGE_Y - 300, TOP],
  tear: [TEAR.low - 80, EDGE_Y + 80], core: [HEART[1] - 340, HEART[1] + 340], debris: [DEBRIS.low - 80, DEBRIS.high + 80],
};
function room(): THREE.Scene {
  const s = new THREE.Scene();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(30, 20, 30), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.01, 0.007, 0.005), side: THREE.BackSide }));
  s.add(walls);
  const lit = (g: THREE.BufferGeometry, tint: THREE.Color, power: number, at: [number, number, number], to: [number, number, number]) => {
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: tint.clone().multiplyScalar(power / ROOM.env), side: THREE.DoubleSide }));
    m.position.set(...at);
    m.lookAt(...to);
    s.add(m);
  };
  const pale = new THREE.Color(hex('pale'));
  for (const l of ROOM.strips) lit(new THREE.PlaneGeometry(...l.size), pale, l.power, l.at, l.to);
  lit(new THREE.CircleGeometry(ROOM.moon.across / 2, 32), pale, ROOM.moon.power, [MOONWARD[0] * ROOM.moon.far, MOONWARD[1] * ROOM.moon.far, MOONWARD[2] * ROOM.moon.far], [0, 0, 0]);
  lit(new THREE.PlaneGeometry(...ROOM.glow.size), new THREE.Color(hex('flame')), ROOM.glow.power, ROOM.glow.at, [0, 0.5, 0]);
  return s;
}

const loaders: Record<PartName, () => Promise<PartFactory>> = {
  ground: () => import('./parts/ground').then((m) => m.build),
  spire: () => import('./parts/spire').then((m) => m.build),
  towers: () => import('./parts/towers').then((m) => m.build),
  tear: () => import('./parts/tear').then((m) => m.build),
  core: () => import('./parts/core').then((m) => m.build),
  debris: () => import('./parts/debris').then((m) => m.build),
  temple: () => import('./parts/temple').then((m) => m.build),
  gardens: () => import('./parts/gardens').then((m) => m.build),
  dunes: () => import('./parts/dunes').then((m) => m.build),
  monument: () => import('./parts/monument').then((m) => m.build),
  craft: () => import('./parts/craft').then((m) => m.build),
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
  let host: HTMLElement | null = null, moon: THREE.DirectionalLight | null = null, glow: THREE.PointLight | null = null, all = true;
  const shows: [number, number] = [-1e9, 1e9];
  let lampUV = { x: 0.62, y: 0.3 };
  const built: Record<string, number> = {};
  let first = 0;
  const aim = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), back = new THREE.Vector3(), mid = new THREE.Vector3(), cursor = new THREE.Vector3();
  let reach = 1;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const fit = () => {
    if (!stage || !host) return;
    stage.setResolutionScale(1);
    const r = host.getBoundingClientRect(), drawn = r.width * r.height * stage.renderer.getPixelRatio() ** 2;
    stage.setResolutionScale(Math.min(1, Math.sqrt(PIXELS / Math.max(1, drawn))));
  };

  const place = () => {
    if (!stage) return;
    const cam = stage.camera, a = VIEW.az * D2R, e = VIEW.el * D2R, px = stage.width / HOST.wide;
    let d = VIEW.back * M, tall = (stage.height / px) * M;
    if (only) {
      cam.clearViewOffset();
      cam.fov = ALONE.fov;
      d = reach / Math.tan((ALONE.fov / 2) * D2R);
      cam.aspect = stage.width / stage.height;
      tall = 2 * reach;
    } else {
      // The whole view is the host at its full height, and a host shows it from the top down.
      aim.set(AIM[0], AIM[1], AIM[2]).multiplyScalar(M);
      cam.fov = (2 * Math.atan((HOST.tall * M) / (2 * d))) / D2R;
      cam.setViewOffset(stage.width, HOST.tall * px, 0, 0, stage.width, stage.height);
    }
    cam.position.set(aim.x + d * Math.cos(e) * Math.sin(a), aim.y + d * Math.sin(e), aim.z + d * Math.cos(e) * Math.cos(a));
    cam.lookAt(aim);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    cam.matrixWorld.extractBasis(right, up, back);
    // The middle of what the host shows, at the world's distance.
    mid.copy(aim);
    if (!only) mid.addScaledVector(up, (HOST.tall * M - tall) / 2);
    const wide = tall * (stage.width / stage.height);
    stage.lamp.position.copy(mid).addScaledVector(right, (lampUV.x - 0.5) * wide * LAMP.across).addScaledVector(up, (0.5 - lampUV.y) * tall * LAMP.up).addScaledVector(back, LAMP.back);
    stage.lamp.target.position.copy(mid);
    cursor.copy(stage.lamp.position).divideScalar(M);
  };

  // Which heights of the frame the screen shows, and so which parts are drawn.
  const look = () => {
    if (!stage || !host || only || all) { shows[0] = -1e9; shows[1] = 1e9; }
    else {
      const r = host.getBoundingClientRect(), px = stage.width / HOST.wide;
      shows[1] = TOP - Math.max(0, -r.top) / px;
      shows[0] = TOP - Math.min(r.height, innerHeight - r.top) / px;
    }
    for (const { name, part } of parts) {
      const on = SPAN[name][1] >= shows[0] && SPAN[name][0] <= shows[1];
      if (on !== part.group.visible) { part.group.visible = on; stale = true; if (on) cast = true; }
    }
  };

  const frame = () => {
    if (!stage || !seen) return;
    const frozen = clock.isFrozen() || hold !== null;
    look();
    if (!stale && !moving) return;
    if (!urgent && !frozen && !myTurn(SIDE.desk)) return;
    urgent = false;
    stale = false;
    place();
    const t = hold ?? clock.now(), still = reduced || frozen || stage.tier === 'static';
    const s: PartState = { t, cursor, still, core: reduced ? 1 : coreLevel(t), seen: shows };
    if (glow) glow.intensity = GLOW.power * s.core;
    moving = false;
    for (const { part } of parts) if (part.group.visible && part.update?.(s) && !s.still) moving = true;
    if (all) { all = false; stale = true; }
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
      host = h;
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
        // A part that fails is left out and the rest of the world stands: its parts are made by different hands.
        try {
          const make = await loaders[name](), from = performance.now(), part = await make({ tier: opts.tier, renderer: stage.renderer });
          built[name] = Math.round(performance.now() - from);
          parts.push({ name, part });
          root.add(part.group);
        } catch (e) {
          console.error(`skycity: ${name} was not built`, e);
        }
      }

      // The room. A light is turned down by its strength and never hidden: hiding one makes every material compile
      // again.
      const hemi = new THREE.HemisphereLight(0x3d3731, 0x100e0c, SKY);
      s.fog = new THREE.Fog(hex('bg'), VIEW.back * M - HAZE.from, VIEW.back * M + HAZE.to);
      s.add(hemi);
      stage.lamp.intensity = LAMP.power;
      stage.lamp.shadow.autoUpdate = false;
      stage.lamp.shadow.needsUpdate = true;
      moon = new THREE.DirectionalLight(hex('pale'), MOON.power);
      moon.position.set(...MOON.from).multiplyScalar(4).add(new THREE.Vector3(...AIM).multiplyScalar(M));
      moon.target.position.set(...AIM).multiplyScalar(M);
      moon.castShadow = true;
      const reachM = MOON.reach * M, cam = moon.shadow.camera;
      cam.left = -reachM; cam.right = reachM; cam.top = reachM; cam.bottom = -reachM; cam.near = 0.5; cam.far = 8;
      moon.shadow.mapSize.setScalar(MOON.map[opts.tier]);
      moon.shadow.bias = -0.0004;
      moon.shadow.normalBias = 0.003;
      moon.shadow.autoUpdate = false;
      moon.shadow.needsUpdate = true;
      s.add(moon, moon.target);
      glow = new THREE.PointLight(hex('hot'), GLOW.power, 0, 2);
      glow.position.set(...HEART).multiplyScalar(M);
      s.add(glow);

      if (only && parts[0]) {
        root.updateMatrixWorld(true);
        const own = parts[0].part.alone, ball = own ? new THREE.Sphere(new THREE.Vector3(...own.at).multiplyScalar(M), own.r * M) : new THREE.Box3().setFromObject(parts[0].part.group).getBoundingSphere(new THREE.Sphere());
        aim.copy(ball.center);
        reach = ball.radius / ALONE.fill;
      }
      stage.resize();
      fit();
      place();
      const from = performance.now();
      await stage.warm();
      first = Math.round(performance.now() - from);
      watch = new ResizeObserver(() => { stage?.resize(); fit(); stale = true; frame(); });
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
    setTier(tier: Tier) {
      if (!stage) return;
      stage.setTier(tier);
      finish(stage, RIM);
      // The moon's shadows are drawn again, with every part showing.
      if (moon) moon.shadow.needsUpdate = true;
      for (const { part } of parts) part.group.visible = true;
      all = true;
      cast = true;
      stale = true;
    },
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
