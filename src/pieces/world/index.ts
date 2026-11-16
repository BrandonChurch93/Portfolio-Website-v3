import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Tier } from '../../config/site';
import { clock } from '../../world/clock';
import { handheld } from '../../world/device';
import type { Piece, PieceOptions } from '../../world/piece';
import { Stage } from '../../world/stage';
import { finish, trueDarks } from '../../world/tone';
import { CORE, D2R, HOST, LIGHT, MOONWARD, PYRAMID, SCALE, SPIRE, VIEW, coreLevel, drawn, ground } from './layout';
import { color, world } from './light';
import { night } from './night';
import { PARTS, type PartFactory, type PartName, type PartState, type WorldPart } from './part';
import { STEP, TOWERS } from './placed';

// The hero's world, built to picture 9 (reference/kits/world.md): the top of a small planet torn open, with a city
// on it, as one piece. Each thing in it is a part (./part.ts), made from files that scripts/world/ writes ahead,
// and driven from here. This file is the stage they stand on: the view, which never moves, the moon as the one
// light that shapes the world, with its shadows drawn once, the night that metal mirrors, the cursor as a glint,
// and what is drawn.
// It is drawn at one size, a unit to the same number of pixels whatever its host's height, with the spire's tip a
// set way under the host's top: a taller host shows more of what is under the planet and nothing else changes.
// ?only=rock shows one part alone and close. ?close=hollow, pyramid or crown looks at that place of the whole world
// at three times its size on the page, which is how each part is judged close (?zoom=2 for another size).
// It draws on a clear ground: there is no sky and no moon in it, which are the page's.

export { CORE, SOURCE, drawn } from './layout';
export { VENTS } from './placed';

const M = SCALE;
// A part seen alone: how much of the host's height it fills, and the field of view it is seen with.
const ALONE = { fill: 0.8, fov: 9 };
// The places looked at closely, each a point of the world, in units.
const CLOSE: Record<string, readonly [number, number, number]> = {
  hollow: [CORE.at[0], CORE.at[1] - 10, CORE.at[2]],
  pyramid: [PYRAMID.x, ground(PYRAMID.x, PYRAMID.z) + PYRAMID.tall * 0.45, PYRAMID.z],
  crown: [TOWERS[STEP][0], ground(TOWERS[STEP][0], TOWERS[STEP][1]) + TOWERS[STEP][4] * 0.72, TOWERS[STEP][1]],
};
// The moon's shadow map: how far each side of the planet's middle it reaches, in units, how many pixels square by
// tier, and where the planet's middle is.
const MOON = { reach: 980, mid: -330, far: 4.5, map: { high: 4096, mid: 2048, low: 1024, static: 4096 } as Record<Tier, number>, bias: -0.00025, normalBias: 0.0012, radius: 1.6 };
// The cursor's glint: how far in front of the world it stands, in metres, how far it ranges as a share of what the
// host shows, and how strong it is.
export const GLINT = { back: 2.2, range: 1.3, power: 1.4 };
// The glow: how strong, how far it spreads, and how bright a thing has to be to have one (pale is about 1).
const GLOW = { strength: 0.14, radius: 0.08, threshold: 1.7 };
// How much of the stage's white balance the world keeps. The balance was made for things seen in a warm room, to
// let a grey thing read grey. Here it took the warmth out of every dark: sand in shadow, rock out of the core's
// light and the shade of the trees all came out grey, where the picture's darks are a deep warm brown.
const WARM = 0.25;
// The canvas fades to nothing over this share of its rim, so nothing can end at its edge.
const RIM = 0.02;

const loaders: Record<PartName, () => Promise<PartFactory>> = {
  rock: () => import('./parts/rock').then((m) => m.build),
  skin: () => import('./parts/skin').then((m) => m.build),
  core: () => import('./parts/core').then((m) => m.build),
  land: () => import('./parts/land').then((m) => m.build),
  pyramid: () => import('./parts/pyramid').then((m) => m.build),
  spire: () => import('./parts/spire').then((m) => m.build),
  towers: () => import('./parts/towers').then((m) => m.build),
  trees: () => import('./parts/trees').then((m) => m.build),
  debris: () => import('./parts/debris').then((m) => m.build),
  rest: () => import('./parts/rest').then((m) => m.build),
};

export interface WorldExtras {
  // Where a point of the world is drawn in its host: across and down from the host's middle, in host heights.
  where(x: number, y: number, z: number): [number, number];
  // What the page's stream is doing where it leaves the core: how much of it is there, 0 to 1, and the seconds
  // since it set off.
  setStream(on: number, since: number): void;
  // What it costs: the milliseconds each part took to make ready, what the first frame took, what the last frame
  // drew, how many shader programs it has had compiled, and what the graphics card holds for it.
  stats(): { built: Record<string, number>; first: number; calls: number; triangles: number; programs: number; geometries: number; textures: number; passes: string[] };
}
export type WorldPiece = Piece & WorldExtras;

export function createWorld(): WorldPiece {
  let stage: Stage | null = null, canvas: HTMLCanvasElement | null = null, host: HTMLElement | null = null;
  let parts: { name: PartName; part: WorldPart; span: [number, number]; on: boolean }[] = [];
  let off: (() => void) | null = null, watch: ResizeObserver | null = null, near: IntersectionObserver | null = null, moon: THREE.DirectionalLight | null = null;
  let seen = true, stale = true, moving = false, cast = 3, hold: number | null = null, only: PartName | null = null, close: readonly [number, number, number] | null = null, zoom = 3;
  let lampUV = { x: 0.6, y: 0.3 }, reach = 1, first = 0;
  const stream = { on: 0, since: 60 };
  const built: Record<string, number> = {};
  const aim = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), back = new THREE.Vector3(), glint = new THREE.Vector3();
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // No occlusion pass: how shut in a place is was worked out ahead and is stored with the meshes. And no bloom
  // ("Nothing blooms at rest"). Under his standing permission of Nov 15 a tight glow was tried on what is far
  // brighter than pale, and judged on the hero: every gold point swelled into a soft ball of light, which is on the
  // list of things that fail on sight. So the rule stands. ?glow=1 shows the glow that was tried.
  let glow = false;
  const lean = () => { if (stage) for (const p of [...stage.composer.passes]) if (p instanceof GTAOPass || (!glow && p instanceof UnrealBloomPass)) stage.composer.removePass(p); };

  const place = () => {
    if (!stage) return;
    const cam = stage.camera, e = VIEW.el * D2R;
    let d = VIEW.back * M;
    if (only) {
      cam.clearViewOffset();
      cam.fov = ALONE.fov;
      d = reach / Math.tan((ALONE.fov / 2) * D2R);
    } else {
      // The whole view is the host at its planned height, and the host shows it from its top down. A close view
      // shows a part of the same picture, drawn larger.
      const px = close ? zoom : stage.width / HOST.wide, wide = HOST.wide * px, tall = HOST.tall * px;
      cam.fov = (2 * Math.atan((HOST.tall * M) / (2 * d))) / D2R;
      aim.set(0, (SPIRE.tall - (HOST.tall / 2 - HOST.over) / Math.cos(e)) * M, 0);
      if (close) {
        const [x, y] = drawn(close[0], close[1], close[2]);
        cam.setViewOffset(wide, tall, (HOST.wide / 2 + x) * px - stage.width / 2, y * px - stage.height / 2, stage.width, stage.height);
      } else cam.setViewOffset(wide, tall, 0, 0, stage.width, stage.height);
    }
    cam.aspect = only ? stage.width / stage.height : HOST.wide / HOST.tall;
    cam.position.set(aim.x, aim.y + d * Math.sin(e), aim.z + d * Math.cos(e));
    cam.lookAt(aim);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    cam.matrixWorld.extractBasis(right, up, back);
    const span = only ? 2 * reach : HOST.tall * M;
    glint.copy(aim).addScaledVector(right, (lampUV.x - 0.5) * span * GLINT.range).addScaledVector(up, (0.5 - lampUV.y) * span * GLINT.range).addScaledVector(back, GLINT.back).applyMatrix4(cam.matrixWorldInverse);
    world.setGlint(glint, GLINT.power);
  };

  // What of the host is on the screen, as places down it in units, and so which parts are.
  const shown = (): boolean => {
    if (!stage || !host) return false;
    if (only || close) { for (const p of parts) p.on = true; return false; }
    const r = host.getBoundingClientRect(), px = stage.width / HOST.wide, from = -r.top / px, to = (innerHeight - r.top) / px;
    let changed = false;
    for (const p of parts) { const on = p.span[1] >= from && p.span[0] <= to; if (on !== p.on) { p.on = on; changed = true; } }
    return changed;
  };
  const spanOf = (part: WorldPart): [number, number] => {
    const box = new THREE.Box3().setFromObject(part.group);
    if (box.isEmpty()) return [0, HOST.tall];
    let lo = Infinity, hi = -Infinity;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { const [, down] = drawn(x / M, y / M, z / M); lo = Math.min(lo, down); hi = Math.max(hi, down); }
    return [lo - 8, hi + 8];
  };

  const frame = () => {
    if (!stage || !seen) return;
    const frozen = clock.isFrozen() || hold !== null;
    if (shown()) stale = true;
    if (!stale && !moving) return;
    stale = false;
    place();
    const now = hold ?? clock.now(), still = reduced || frozen || stage.tier === 'static', level = still && hold === null && !clock.isFrozen() ? 1 : coreLevel(now);
    world.setCore(level);
    const s: PartState = { t: now, core: level, stream, still };
    moving = false;
    // The moon's shadows are drawn once, with every part there to cast them. After that a part none of which is on
    // the screen is not drawn and not told the time.
    const casting = cast > 0 || frozen;
    for (const p of parts) {
      p.part.group.visible = casting || p.on;
      if (p.on && p.part.update?.(s) && !still) moving = true;
    }
    if (moon && casting) { moon.shadow.needsUpdate = true; if (cast > 0) { cast--; stale = true; } }
    stage.render();
  };

  return {
    async mount(h: HTMLElement, opts: PieceOptions) {
      host = h;
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      h.prepend(canvas);
      const q = new URLSearchParams(location.search), asked = q.get('only') as PartName | null;
      only = asked && PARTS.includes(asked) ? asked : null;
      close = CLOSE[q.get('close') ?? ''] ?? null;
      if (Number(q.get('zoom')) > 0) zoom = Number(q.get('zoom'));
      glow = q.get('glow') === '1';
      stage = new Stage(h, canvas, { tier: opts.tier, fov: ALONE.fov, near: 0.3, far: 40, bloom: GLOW, bloomScale: 0.5, envIntensity: LIGHT.night, env: night, lampAngle: 0.9 });
      trueDarks(stage.renderer);
      lean();
      finish(stage, RIM, WARM);
      stage.lamp.intensity = 0;
      stage.lamp.castShadow = false;
      const s = stage.scene, root = new THREE.Group();
      root.scale.setScalar(M);
      s.add(root);

      moon = new THREE.DirectionalLight(color(LIGHT.moon.color), LIGHT.moon.power);
      moon.castShadow = true;
      moon.shadow.mapSize.setScalar(MOON.map[opts.tier]);
      Object.assign(moon.shadow.camera, { left: -MOON.reach * M, right: MOON.reach * M, top: MOON.reach * M, bottom: -MOON.reach * M, near: 0.5, far: 2 * MOON.far });
      moon.shadow.bias = MOON.bias;
      moon.shadow.normalBias = MOON.normalBias;
      moon.shadow.radius = MOON.radius;
      moon.shadow.autoUpdate = false;
      moon.target.position.set(0, MOON.mid * M, 0);
      moon.position.set(...MOONWARD).normalize().multiplyScalar(MOON.far).add(moon.target.position);
      s.add(moon, moon.target);

      const names = only ? [only] : [...PARTS];
      parts = [];
      const made = new Set<PartName>(), stands = new Set<number>();
      for (const name of names) {
        const make = await loaders[name](), from = performance.now();
        const part = await make({ tier: opts.tier, renderer: stage.renderer, handheld: handheld(), query: q, built: made, stands });
        if (part.group.children.length) made.add(name);
        for (const i of part.stands ?? []) stands.add(i);
        built[name] = Math.round(performance.now() - from);
        root.add(part.group);
        root.updateMatrixWorld(true);
        parts.push({ name, part, span: spanOf(part), on: true });
      }
      if (only && parts[0]) {
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
      stale = true;
      frame();
      opts.onReady?.();
    },
    setLamp(x: number, y: number) {
      if (Math.abs(x - lampUV.x) + Math.abs(y - lampUV.y) < 0.003) return;
      lampUV = { x, y };
      stale = true;
    },
    setStream(on: number, since: number) {
      if (Math.abs(on - stream.on) < 0.002 && (since > 4 || Math.abs(since - stream.since) < 0.01)) return;
      stream.on = on;
      stream.since = since;
      stale = true;
    },
    where(x: number, y: number, z: number): [number, number] {
      const [across, down] = drawn(x, y, z);
      return [across / HOST.tall, down / HOST.tall - 0.5];
    },
    stats() {
      const r = stage?.renderer.info;
      return { built, first, calls: r?.render.calls ?? 0, triangles: r?.render.triangles ?? 0, programs: r?.programs?.length ?? 0, geometries: r?.memory.geometries ?? 0, textures: r?.memory.textures ?? 0, passes: stage?.composer.passes.map((x) => x.constructor.name + (x.enabled ? '' : ' off')) ?? [] };
    },
    setProgress() {},
    setWaterLight() {},
    setMaking(on: boolean) { if (stage) { stage.setMaking(on, stage.scene); stale = true; } },
    setTier(tier: Tier) {
      if (!stage) return;
      stage.setTier(tier);
      lean();
      finish(stage, RIM, WARM);
      if (moon) { moon.shadow.mapSize.setScalar(MOON.map[tier]); moon.shadow.map?.dispose(); moon.shadow.map = null as unknown as THREE.WebGLRenderTarget; }
      cast = 3;
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
      moon = null;
      canvas?.remove();
      canvas = host = null;
    },
  };
}
