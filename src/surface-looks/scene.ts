import * as THREE from 'three';
import { hex } from '../config/palette';
import type { Tier } from '../config/site';
import { AIM, HEART, HOST, MOONWARD, SCALE, VIEW, coreLevel } from '../pieces/skycity/layout';
import type { CityPart, PartFactory, PartState } from '../pieces/skycity/part';
import { aimGlint } from '../pieces/skycity/polish';
import { clock } from '../world/clock';
import { Stage } from '../world/stage';
import { finish, trueDarks } from '../world/tone';
import type { Built, Look } from './kit';

// Study 31: the stage two worlds for the surface of the hero's planet are shown on. It is the hero's own stage as
// near as a study can copy it without touching the piece (src/pieces/skycity/index.ts): the same view, the same
// moon, the same room for polished metal to reflect, the cursor's light, and the real torn underside, core and
// debris, which he has approved and which stay. Only what stands on the top of the dome is this study's.

export type LookName = 'rings' | 'shards';
export const LOOKS: LookName[] = ['rings', 'shards'];
// The views. page is the hero's own: the whole world at the page's size, from the page's side. The other two are
// the same side, closer: the crown of the dome with the spire, and the ground at the front where it meets the tear.
export type ViewName = 'page' | 'crown' | 'edge';
export const VIEWS: ViewName[] = ['page', 'crown', 'edge'];
const CLOSE: Record<Exclude<ViewName, 'page'>, { at: [number, number, number]; tall: number }> = {
  crown: { at: [0, 108, 0], tall: 430 },
  edge: { at: [0, -62, 470], tall: 300 },
};

const D2R = Math.PI / 180, M = SCALE;
const LAMP = { back: 2.6, across: 1.1, up: 1.1, power: 7 };
const RIM = 0.05;
const ROOM = {
  env: 0.3,
  moon: { power: 32, across: 0.8, far: 7 },
  glow: { power: 0.6, size: [16, 3] as [number, number], at: [0, 0.6, -7] as [number, number, number] },
  strips: [
    { power: 20, size: [5.5, 0.12], at: [0.6, 3.4, 2.2], to: [0, 0, 0] },
    { power: 16, size: [9, 0.05], at: [0, 0.7, 7], to: [0, 0.3, 0] },
    { power: 8, size: [9, 0.07], at: [0, -1.4, 6], to: [0, 0, 0] },
    { power: 11, size: [0.2, 3.6], at: [4.4, 1.2, 1.6], to: [0, 0.4, 0] },
    { power: 6, size: [0.2, 3.6], at: [-4.4, 1.2, 1.6], to: [0, 0.4, 0] },
    { power: 9, size: [3.2, 0.6], at: [1.6, 1.5, -2.2], to: [0, 0.2, 0] },
    { power: 13, size: [9, 0.1], at: [0, 3.8, -5], to: [0, 0, 0] },
    { power: 6, size: [0.1, 2.4], at: [-2.6, 2.6, -5.5], to: [0, 0, 0] },
  ] as { power: number; size: [number, number]; at: [number, number, number]; to: [number, number, number] }[],
};
const MOON = { power: 15, map: { high: 4096, mid: 2048, low: 1024, static: 2048 } as Record<Tier, number>, reach: 1100 };
const SKY = 0.1;
const HAZE = { from: 0.5, to: 2.2 };
const PIXELS = 2.8e6;
const GLOW = { power: 14 };
// The hero's own stage lets more bloom than this. A study of materials is judged with less: under the hero's, a ring
// of polished gold read as a tube of neon.
const BLOOM = { strength: 0.1, threshold: 2.6, radius: 0.3 };

function room(): THREE.Scene {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(30, 20, 30), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.01, 0.007, 0.005), side: THREE.BackSide })));
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

// The core's light is a point light with no shadow, so it shone up through the planet onto everything on top of it:
// a ring of gold high over the city was lit orange from below and read as neon. The planet is in the way. What
// stands on the top of it takes no light from the core.
const POINT = '#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )';
function above(root: THREE.Object3D): void {
  const done = new Set<THREE.Material>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!(m instanceof THREE.MeshStandardMaterial) || done.has(m)) continue;
      done.add(m);
      const before = m.onBeforeCompile, key = m.customProgramCacheKey;
      m.onBeforeCompile = (sh, r) => {
        before.call(m, sh, r);
        sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace(POINT, '#if 0'));
      };
      m.customProgramCacheKey = () => `${key.call(m)}|above`;
    }
  });
}

const planet: (() => Promise<PartFactory>)[] = [
  () => import('../pieces/skycity/parts/tear').then((m) => m.build),
  () => import('../pieces/skycity/parts/core').then((m) => m.build),
  () => import('../pieces/skycity/parts/debris').then((m) => m.build),
];
const looks: Record<LookName, () => Promise<(c: Built) => Look>> = {
  rings: () => import('./rings').then((m) => m.build),
  shards: () => import('./shards').then((m) => m.build),
};

export interface LooksScene {
  look(name: LookName): Promise<void>;
  view(name: ViewName): void;
  // The cursor's light, as places across and down the host, 0 to 1.
  lamp(x: number, y: number): void;
  dispose(): void;
}

export async function mountLooks(host: HTMLElement, tier: Tier, o: { planet: boolean; look: LookName; view: ViewName }): Promise<LooksScene> {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.prepend(canvas);
  const stage = new Stage(host, canvas, { tier, fov: 12, near: 0.3, far: 40, bloom: BLOOM, ao: 0.02, aoIntensity: 1, aoSamples: 8, aoScale: 0.5, bloomScale: 0.5, envIntensity: ROOM.env, env: room, lampAngle: 0.9 });
  trueDarks(stage.renderer);
  finish(stage, RIM);
  const s = stage.scene, root = new THREE.Group();
  root.scale.setScalar(M);
  s.add(root);

  const parts: CityPart[] = [];
  if (o.planet) for (const load of planet) {
    try {
      const part = await (await load())({ tier, renderer: stage.renderer });
      parts.push(part);
      root.add(part.group);
    } catch (e) {
      console.error('surface looks: a part of the planet was not built', e);
    }
  }

  s.fog = new THREE.Fog(hex('bg'), VIEW.back * M - HAZE.from, VIEW.back * M + HAZE.to);
  s.add(new THREE.HemisphereLight(0x3d3731, 0x100e0c, SKY));
  stage.lamp.intensity = LAMP.power;
  stage.lamp.shadow.autoUpdate = false;
  const moon = new THREE.DirectionalLight(hex('pale'), MOON.power);
  moon.position.set(...MOONWARD).multiplyScalar(4).add(new THREE.Vector3(...AIM).multiplyScalar(M));
  moon.target.position.set(...AIM).multiplyScalar(M);
  moon.castShadow = true;
  const reachM = MOON.reach * M, mc = moon.shadow.camera;
  mc.left = -reachM; mc.right = reachM; mc.top = reachM; mc.bottom = -reachM; mc.near = 0.5; mc.far = 8;
  moon.shadow.mapSize.setScalar(MOON.map[tier]);
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.003;
  moon.shadow.autoUpdate = false;
  s.add(moon, moon.target);
  const glow = new THREE.PointLight(hex('hot'), GLOW.power, 0, 2);
  glow.position.set(...HEART).multiplyScalar(M);
  s.add(glow);

  const made = new Map<LookName, Look>();
  let now: LookName | null = null, view: ViewName = o.view, lampUV = { x: 0.62, y: 0.3 };
  let alive = true, seen = true, stale = true, moving = false, cast = true;
  const aim = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), back = new THREE.Vector3(), mid = new THREE.Vector3(), cursor = new THREE.Vector3();
  const shows: [number, number] = [-1e9, 1e9];
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const fit = () => {
    stage.setResolutionScale(1);
    const r = host.getBoundingClientRect(), drawn = r.width * r.height * stage.renderer.getPixelRatio() ** 2;
    stage.setResolutionScale(Math.min(1, Math.sqrt(PIXELS / Math.max(1, drawn))));
  };
  const place = () => {
    const cam = stage.camera, a = VIEW.az * D2R, e = VIEW.el * D2R, d = VIEW.back * M;
    let tall: number;
    if (view === 'page') {
      const px = stage.width / HOST.wide;
      tall = (stage.height / px) * M;
      aim.set(...AIM).multiplyScalar(M);
      cam.fov = (2 * Math.atan((HOST.tall * M) / (2 * d))) / D2R;
      cam.aspect = stage.width / (HOST.tall * px);
      cam.setViewOffset(stage.width, HOST.tall * px, 0, 0, stage.width, stage.height);
    } else {
      const c = CLOSE[view], asp = stage.width / Math.max(1, stage.height);
      // Never so close that the picture is narrower than it is tall would allow on a wide screen.
      tall = Math.max(c.tall, (c.tall * 1.9) / asp) * M;
      aim.set(...c.at).multiplyScalar(M);
      cam.clearViewOffset();
      cam.fov = (2 * Math.atan(tall / (2 * d))) / D2R;
      cam.aspect = asp;
    }
    cam.position.set(aim.x + d * Math.cos(e) * Math.sin(a), aim.y + d * Math.sin(e), aim.z + d * Math.cos(e) * Math.cos(a));
    cam.lookAt(aim);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    cam.matrixWorld.extractBasis(right, up, back);
    mid.copy(aim);
    if (view === 'page') mid.addScaledVector(up, (HOST.tall * M - tall) / 2);
    const wide = tall * (stage.width / Math.max(1, stage.height));
    stage.lamp.position.copy(mid).addScaledVector(right, (lampUV.x - 0.5) * wide * LAMP.across).addScaledVector(up, (0.5 - lampUV.y) * tall * LAMP.up).addScaledVector(back, LAMP.back);
    stage.lamp.target.position.copy(mid);
    cursor.copy(stage.lamp.position).divideScalar(M);
    aimGlint(stage.lamp.position, cam);
  };
  const frame = () => {
    if (!alive || !seen) return;
    const frozen = clock.isFrozen();
    if (!stale && !moving) return;
    stale = false;
    place();
    const t = clock.now(), still = reduced || frozen || stage.tier === 'static';
    const st: PartState = { t, cursor, still, core: reduced ? 1 : coreLevel(t), seen: shows };
    glow.intensity = GLOW.power * st.core;
    moving = false;
    for (const p of parts) if (p.update?.(st) && !still) moving = true;
    if (now) made.get(now)?.update?.(t, st.core);
    if (cast || frozen) { stage.lamp.shadow.needsUpdate = true; moon.shadow.needsUpdate = true; }
    cast = false;
    stage.render();
  };

  const show = async (name: LookName) => {
    if (!made.has(name)) {
      const look = (await looks[name]())({ room: s.environment, level: ROOM.env });
      if (!alive) { look.dispose(); return; }
      above(look.group);
      made.set(name, look);
      root.add(look.group);
    }
    for (const [k, l] of made) l.group.visible = k === name;
    now = name;
    cast = true;
    stale = true;
  };

  await show(o.look);
  stage.resize();
  fit();
  place();
  await stage.warm();
  const watch = new ResizeObserver(() => { stage.resize(); fit(); cast = true; stale = true; frame(); });
  watch.observe(host);
  const near = new IntersectionObserver((es) => { seen = es.some((e) => e.isIntersecting); if (seen) { stale = true; frame(); } });
  near.observe(host);
  const off = clock.onFrame(frame);
  frame();

  return {
    async look(name) { await show(name); frame(); },
    view(name) { view = name; cast = true; stale = true; frame(); },
    lamp(x, y) {
      if (Math.abs(x - lampUV.x) + Math.abs(y - lampUV.y) < 0.002) return;
      lampUV = { x, y };
      cast = true;
      stale = true;
    },
    dispose() {
      alive = false;
      off();
      watch.disconnect();
      near.disconnect();
      for (const p of parts) p.dispose?.();
      for (const l of made.values()) l.dispose();
      stage.dispose();
      canvas.remove();
    },
  };
}
