import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { HANDHELD, SHARP, type Tier } from '../../config/site';
import { clock } from '../../world/clock';
import { loading } from '../../world/loading';
import { handheld } from '../../world/device';
import type { Piece, PieceOptions } from '../../world/piece';
import { slice } from '../../world/build';
import { Stage } from '../../world/stage';
import { finish, trueDarks } from '../../world/tone';
import { CORE, D2R, HOST, LIGHT, MOONWARD, PYRAMID, SCALE, SPIRE, VIEW, coreLevel, drawn, ground } from './layout';
import { GLINT, STREAM_LONG, WARM, color, world } from './light';
import { night } from './night';
import { keep, type Kept } from './kept';
import { sharpen, type Sharp, type SharpParts } from './sharp';
import { ABOVE, LOADING, PARTS, type PartFactory, type PartName, type PartState, type WorldPart } from './part';
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
// How much of a screen's height is drawn above and below what the screen shows of the world.
// Ahead of a scroll the screen is about to show it, behind one it has just been drawn, and at rest a scroll may begin
// either way: how much is drawn ahead and behind while the page moves, each side at rest, and for how many seconds
// after it last moved it is still taken to be moving. ?was=1 draws as before: 0.3 each side always.
const MARGIN = { ahead: 0.3, behind: 0.05, rest: 0.12, settle: 0.4, was: 0.3 } as const;
const CLOSE: Record<string, readonly [number, number, number]> = {
  hollow: [CORE.at[0], CORE.at[1] - 10, CORE.at[2]],
  pyramid: [PYRAMID.x, ground(PYRAMID.x, PYRAMID.z) + PYRAMID.tall * 0.45, PYRAMID.z],
  crown: [TOWERS[STEP][0], ground(TOWERS[STEP][0], TOWERS[STEP][1]) + TOWERS[STEP][4] * 0.72, TOWERS[STEP][1]],
  // The rest are for the parts' builders: what broke away, each side of the planet's skin, the city's left end,
  // the spire, the dunes and the belt of trees.
  debris: [0, -700, 200],
  right: [520, -260, 380],
  left: [-520, -260, 380],
  city: [-520, 60, 0],
  spire: [0, SPIRE.tall * 0.55, 0],
  dunes: [470, 10, 240],
  trees: [120, 8, 290],
};
// The moon's shadow map: how far each side of the planet's middle it reaches, in units, how many pixels square by
// tier, and where the planet's middle is.
const MOON = { reach: 980, mid: -330, far: 4.5, map: { high: 4096, mid: 2048, low: 1024, static: 4096 } as Record<Tier, number>, bias: -0.0005, normalBias: 0.0026, radius: 1.6 };
// While the shadows are being set: ?moonbias=, ?moonnormal= and ?moonradius= try another of each without a change of code.
const moonTried = (name: string, usual: number): number => {
  const v = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get(name);
  return v !== null && Number.isFinite(Number(v)) ? Number(v) : usual;
};
// The cursor's glint: how far in front of the world it stands, in metres, how far it ranges as a share of what the
// host shows, and how strong it is.
export { GLINT };
// The glow: how strong, how far it spreads, and how bright a thing has to be to have one (pale is about 1).
const GLOW = { strength: 0.14, radius: 0.08, threshold: 1.7 };
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
  setStream(on: number, since: number, long?: number): void;
  // Whether every part is made and drawn: what is on the first screen is shown before what is under it.
  whole(): boolean;
  // What it costs: the milliseconds each part took to make ready, what the first frame took, what the last frame
  // drew, how many shader programs it has had compiled, and what the graphics card holds for it.
  // For timing a frame: the world drawn without these parts.
  without(names: string[]): void;
  stats(): { built: Record<string, number>; first: number; calls: number; triangles: number; programs: number; geometries: number; textures: number; passes: string[]; sharp: ReturnType<Sharp['state']> | null };
  // With ?trace=1, what each frame did and what the making did, since the last call: for finding the frames that run long.
  trace(): TraceRow[];
  // With ?trace=1, the world drawn this many times back to back as it stands, waited for to the end: milliseconds a frame.
  bench(n: number): number;
}
export interface TraceRow { at: number; what: string; ms?: number; rows?: number; on?: string }
export type WorldPiece = Piece & WorldExtras;

export function createWorld(): WorldPiece {
  let stage: Stage | null = null, canvas: HTMLCanvasElement | null = null, host: HTMLElement | null = null;
  let parts: { name: PartName; part: WorldPart; span: [number, number]; on: boolean }[] = [];
  let off: (() => void) | null = null, watch: ResizeObserver | null = null, near: IntersectionObserver | null = null, moon: THREE.DirectionalLight | null = null;
  let later: Tier | null = null;
  let view: [number, number] | null = null, drew: [number, number] = [0, 0], left = new Set<string>();
  // The land and the rock as kept pictures (./kept.ts), and what is in them now ('' when they are not of the world as
  // it is lit now). ?keep=0 draws both every frame as before, and ?keep=land keeps the land alone.
  let kept: Kept | null = null, taken = '', keeps = true, keepsRock = true;
  // The city at the screen's density where the canvas has less (./sharp.ts), and for a frozen frame what it was taken
  // for. full: the next frame draws the whole canvas, after the clearing in it was put away.
  let sharp: Sharp | null = null, sharpFor = '', full = false;
  let seen = true, stale = true, moving = false, warming = false, cast = 3, hold: number | null = null, only: PartName | null = null, close: readonly [number, number, number] | null = null, zoom = 3;
  let lampUV = { x: 0.6, y: 0.3 }, reach = 1, first = 0;
  // Which way the page last moved (1 down it), when, and where the host's top was. was: everything as before this
  // round's changes (?was=1), for timing against.
  let way = 0, movedAt = -1e9, lastTop = 0, was = false;
  const stream = { on: 0, since: 60, long: 0 };
  let log: TraceRow[] | null = null;
  const mark = (what: string, more?: Omit<TraceRow, 'at' | 'what'>) => { log?.push({ at: performance.now(), what, ...more }); };
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
    world.setPointer(lampUV.x, lampUV.y);
  };

  // What of the host is on the screen, as places down it in units, and so which parts are.
  const shown = (): boolean => {
    if (!stage || !host) return false;
    if (only || close) { for (const p of parts) p.on = true; return false; }
    const r = host.getBoundingClientRect(), px = stage.width / HOST.wide, from = -r.top / px, to = (innerHeight - r.top) / px;
    // Only what is on the screen is drawn, and a share of a screen each side of it for a scroll to run into. A
    // frame is owed whenever the screen has come to show something the last frame did not draw.
    const now = performance.now();
    if (Math.abs(r.top - lastTop) > 0.5) { way = r.top < lastTop ? 1 : -1; movedAt = now; lastTop = r.top; }
    const going = now - movedAt < MARGIN.settle * 1000;
    const above = was ? MARGIN.was : !going ? MARGIN.rest : way < 0 ? MARGIN.ahead : MARGIN.behind;
    const below = was ? MARGIN.was : !going ? MARGIN.rest : way > 0 ? MARGIN.ahead : MARGIN.behind;
    view = [-r.top - innerHeight * above, innerHeight - r.top + innerHeight * below];
    const top = Math.max(0, -r.top), foot = Math.min(stage.height, innerHeight - r.top);
    if (foot > top && (top < drew[0] || foot > drew[1])) stale = true;
    let changed = false;
    for (const p of parts) { const on = p.span[1] >= from && p.span[0] <= to; if (on !== p.on) { p.on = on; changed = true; } }
    return changed;
  };
  const spanOf = (o: WorldPart | THREE.Object3D): [number, number] => {
    const box = new THREE.Box3().setFromObject('group' in o ? o.group : o);
    if (box.isEmpty()) return [0, HOST.tall];
    let lo = Infinity, hi = -Infinity;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { const [, down] = drawn(x / M, y / M, z / M); lo = Math.min(lo, down); hi = Math.max(hi, down); }
    return [lo - 8, hi + 8];
  };

  const retier = (tier: Tier): void => {
    if (!stage || tier === stage.tier) return;
    stage.setTier(tier);
    lean();
    finish(stage, RIM, WARM);
    sharp?.edges();
    if (moon) { moon.shadow.mapSize.setScalar(MOON.map[tier]); moon.shadow.map?.dispose(); moon.shadow.map = null as unknown as THREE.WebGLRenderTarget; }
    cast = 3;
    stale = true;
    unsharp();
  };

  const unsharp = () => { if (sharp && (sharp.ready() || sharp.busy())) { sharp.drop(); full = true; } };
  // What of the world never changes on the screen, what stands round it and over it, and the rows it covers.
  const STILL: readonly PartName[] = ['land', 'towers', 'spire', 'pyramid', 'rest'];
  const solid = (m: THREE.Mesh) => m.isMesh && m.visible && !!m.geometry.getAttribute('position')?.count && ![m.material].flat().some((x) => x.transparent || x.blending !== THREE.NormalBlending);
  const glints = (m: THREE.Mesh) => [m.material].flat().some((x) => !!x.defines && 'WORLD_GLINT' in x.defines);
  // The still things' materials clear themselves once the picture is up: set before their programs are made.
  const ownStill = () => { if (sharp) for (const p of parts) if (STILL.includes(p.name)) p.part.group.traverse((o) => { const m = o as THREE.Mesh; if (solid(m) && !glints(m)) sharp!.own(m); }); };
  const sharpParts = (): SharpParts | null => {
    if (!stage) return null;
    const statics: THREE.Mesh[] = [], laid: THREE.Mesh[] = [], behind: THREE.Mesh[] = [], over: THREE.Object3D[] = [], px = stage.width / HOST.wide;
    let lo = Infinity, hi = -Infinity;
    for (const p of parts) {
      if (p.name === 'trees') over.push(p.part.group);
      if (p.name === 'rock' || p.name === 'skin') p.part.group.traverse((o) => { if (solid(o as THREE.Mesh)) behind.push(o as THREE.Mesh); });
      if (!STILL.includes(p.name)) {
        if (p.name !== 'trees') p.part.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.visible && [m.material].flat().some((x) => x.transparent)) over.push(m); });
        continue;
      }
      p.part.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.visible || !m.geometry.getAttribute('position')?.count) return;
        if (!solid(m)) { over.push(m); return; }
        if (glints(m)) { behind.push(m); return; }
        statics.push(m);
        if (p.name === 'land') laid.push(m);
        const [from, to] = spanOf(m);
        lo = Math.min(lo, from);
        hi = Math.max(hi, to);
      });
    }
    const band: [number, number] = [Math.max(0, Math.floor(lo * px)), Math.min(stage.height, Math.ceil(hi * px))];
    if (!statics.length || band[1] <= band[0]) return null;
    return {
      statics, laid, behind, over, band,
      view(top, tall = 0) {
        if (!stage || top === null) { place(); return; }
        const cam = stage.camera, k = stage.width / HOST.wide;
        cam.setViewOffset(HOST.wide * k, HOST.tall * k, 0, top, stage.width, tall);
        cam.updateProjectionMatrix();
      },
    };
  };

  const frame = () => {
    if (warming) mark('warming');
    if (!stage || !seen || warming) return;
    const frozen = clock.isFrozen() || hold !== null;
    if (shown()) stale = true;
    if (!stale && !moving) return;
    stale = false;
    place();
    const now = hold ?? clock.now(), still = reduced || frozen || stage.tier === 'static', level = still && hold === null && !clock.isFrozen() ? 1 : coreLevel(now);
    world.setCore(level);
    const s: PartState = { t: now, core: level, stream, pointer: lampUV, still };
    moving = false;
    // The moon's shadows are drawn once, with every part there to cast them. After that a part none of which is on
    // the screen is not drawn and not told the time.
    const casting = cast > 0 || frozen;
    // The land and the rock are laid in from their pictures, taken once the moon's shadows are drawn and again
    // whenever they are drawn again, the canvas changes size or what is in them changes. Not while the shadows are
    // being drawn, when the land and the rock have to cast their own. What of the rock the stream can light is drawn
    // over its picture in every frame.
    const land = parts.find((p) => p.name === 'land'), rock = parts.find((p) => p.name === 'rock');
    const near = rock?.part.group.userData.near as THREE.Object3D[] | undefined;
    const laid = keeps && !!kept && !!land && !casting && only === null && close === null && !left.has('land') && !left.has('kept');
    const stone = laid && keepsRock && !!rock && !!near && !left.has('rock') && !left.has('kept-rock');
    const holds = stone ? 'land rock' : 'land';
    if (casting) taken = '';
    if (rock && near) for (const o of rock.part.group.children) o.visible = near.includes(o) === stone;
    if (laid && (taken !== holds || !kept!.fresh())) {
      sharp?.holes(false);
      for (const p of parts) p.part.group.visible = p === land || (stone && p === rock);
      if (stone) for (const o of rock!.part.group.children) o.visible = !near!.includes(o);
      mark('take');
      kept!.take((k) => world.setCore(k));
      world.setCore(level);
      if (stone) for (const o of rock!.part.group.children) o.visible = near!.includes(o);
      taken = holds;
    }
    kept?.show(laid && (land!.on || (stone && rock!.on)), level);
    for (const p of parts) {
      p.part.group.visible = (casting || p.on) && !left.has(p.name) && !(laid && p === land);
      if (p.on && p.part.update?.(s) && !still) moving = true;
    }
    if (moon && casting) { moon.shadow.needsUpdate = true; if (cast > 0) { cast--; stale = true; } }
    // The city at the screen's density: taken once the whole world is made and its shadows drawn, and in a frozen
    // frame again for each moment and place of the cursor, so a still is always the same picture.
    const sharpens = !!sharp && first > 0 && only === null && close === null && left.size === 0 && !stage.isMaking() && sharp.wanted();
    const sharpKey = frozen ? `${now}|${lampUV.x}|${lampUV.y}` : 'live';
    if (sharp && (!sharpens || sharpKey !== sharpFor || (cast > 0 && !frozen))) { unsharp(); sharpFor = sharpKey; }
    sharp?.holes(sharpens);
    // The moon's shadows are drawn into their own map whatever is drawn of the canvas, so a frame that draws them
    // draws only what is on the screen. What lies outside is drawn again when the screen comes to it.
    const all = (was ? casting : frozen) || full || only !== null || close !== null || !view;
    full = false;
    stage.setWindow(all ? null : view![0], all ? 0 : view![1]);
    drew = all ? [-Infinity, Infinity] : [Math.max(0, view![0]), Math.min(stage.height, view![1])];
    stage.render();
    if (sharp && sharpens && !sharp.ready() && (frozen || cast === 0)) {
      if (!sharp.busy()) { ownStill(); const p = sharpParts(); if (p) { mark('sharp begin', { rows: p.band[1] - p.band[0] }); sharp.begin(p); } }
      if (sharp.busy()) {
        sharp.step(frozen);
        if (sharp.ready()) {
          mark('sharp ready');
          // A frozen frame is drawn again at once with the city cleared over its picture. A live one is next frame.
          if (frozen) { sharp.holes(true); if (moon) moon.shadow.needsUpdate = false; stage.render(); }
        }
        stale = true;
      }
    }
    if (log) mark(casting ? 'cast' : 'frame', { ms: stage.frameMs, rows: all ? stage.height : drew[1] - drew[0], on: parts.filter((p) => p.on).map((p) => p.name).join(' ') });
  };

  const make = async (h: HTMLElement, opts: PieceOptions) => {
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
      keeps = q.get('keep') !== '0';
      keepsRock = q.get('keep') !== 'land';
      was = q.get('was') === '1';
      if (q.get('trace') === '1') { log = []; mark('mount'); }
      stage = new Stage(h, canvas, { tier: opts.tier, fov: ALONE.fov, near: 0.3, far: 40, bloom: GLOW, bloomScale: 0.5, envIntensity: LIGHT.night, env: night, lampAngle: 0.9, pixels: HANDHELD.world });
      trueDarks(stage.renderer);
      lean();
      finish(stage, RIM, WARM);
      kept = keep(stage);
      if (!only && !close && !was && q.get('sharp') !== '0') sharp = sharpen(stage, canvas, handheld() ? HANDHELD.sharp : SHARP.pixels);
      stage.lamp.intensity = 0;
      stage.lamp.castShadow = false;
      const s = stage.scene, root = new THREE.Group();
      root.scale.setScalar(M);
      s.add(root);

      moon = new THREE.DirectionalLight(color(LIGHT.moon.color), LIGHT.moon.power);
      moon.castShadow = true;
      moon.shadow.mapSize.setScalar(MOON.map[opts.tier]);
      Object.assign(moon.shadow.camera, { left: -MOON.reach * M, right: MOON.reach * M, top: MOON.reach * M, bottom: -MOON.reach * M, near: 0.5, far: 2 * MOON.far });
      moon.shadow.bias = moonTried('moonbias', MOON.bias);
      moon.shadow.normalBias = moonTried('moonnormal', MOON.normalBias);
      moon.shadow.radius = moonTried('moonradius', MOON.radius);
      moon.shadow.autoUpdate = false;
      moon.target.position.set(0, MOON.mid * M, 0);
      moon.position.set(...MOONWARD).normalize().multiplyScalar(MOON.far).add(moon.target.position);
      s.add(moon, moon.target);

      const names = only ? [only] : [...PARTS];
      parts = [];
      const made = new Set<PartName>(), stands = new Set<number>();
      // The world is made in two helpings. What is on the first screen first (ABOVE), side by side, so those files
      // come down together: the page is shown as soon as they are drawn. Then what is under the first screen, which
      // is fetched and made while the visitor reads. Made all at once, a first visit waited for every file of the
      // world before it saw anything. One part alone, a close view and ?load=whole are made in one helping.
      // Only `rest` waits for all the others, since it stands in for whatever they did not build. A part that fails
      // (a file missing, or half written while its builder works) is left out and said so: one broken part must not
      // take the whole world off the page.
      const renderer = stage.renderer, got = new Map<PartName, WorldPart>();
      // Made where the screen is already well under the first screen, as when the page comes back up to the world
      // after it was let go below, the world is made in one helping: the first would be what is not on the screen.
      const under0 = h.getBoundingClientRect().top < -innerHeight * 0.5 && !was;
      const whole = !!only || !!close || q.get('load') === 'whole' || under0;
      const above = names.filter((n) => n !== 'rest' && (whole || ABOVE.includes(n)));
      const under = names.filter((n) => n !== 'rest' && !above.includes(n));
      let ready = 0;
      const make = async (name: PartName): Promise<void> => {
        const from = performance.now();
        try {
          got.set(name, await (await loaders[name]())({ tier: opts.tier, renderer, handheld: handheld(), query: q, built: made, stands }));
        } catch (e) {
          console.warn(`world: ${name} could not be made and is left out. ${String(e)}`);
          got.set(name, { group: new THREE.Group() });
        }
        built[name] = Math.round(performance.now() - from);
        loading.progress(LOADING, ++ready / (above.length + 1));
      };
      const note = (list: PartName[]): void => {
        for (const name of list) {
          const part = got.get(name);
          if (!part) continue;
          if (part.group.children.length) made.add(name);
          for (const i of part.stands ?? []) stands.add(i);
        }
      };
      // In the order the parts are listed in, whenever each was made: what is drawn over what must not turn on
      // which file came down first.
      const order = new Map<THREE.Object3D, number>();
      const add = (list: PartName[]): void => {
        for (const name of list) {
          const part = got.get(name);
          if (!part) continue;
          order.set(part.group, PARTS.indexOf(name));
          root.add(part.group);
          root.updateMatrixWorld(true);
          parts.push({ name, part, span: spanOf(part), on: true });
        }
        root.children.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
      };
      const last = names.includes('rest') ? (['rest'] as PartName[]) : [];
      await Promise.all(above.map(make));
      if (!stage) return;
      note(above);
      if (!under.length) { for (const name of last) await make(name); }
      if (!stage) return;
      add(under.length ? above : [...above, ...last]);
      if (only && parts[0]) {
        const own = parts[0].part.alone, ball = own ? new THREE.Sphere(new THREE.Vector3(...own.at).multiplyScalar(M), own.r * M) : new THREE.Box3().setFromObject(parts[0].part.group).getBoundingSphere(new THREE.Sphere());
        aim.copy(ball.center);
        reach = ball.radius / ALONE.fill;
      }
      stage.resize();
      if (sharp?.wanted()) { sharp.edges(); ownStill(); }
      place();
      const from = performance.now();
      await stage.warm();
      if (!stage) return;
      watch = new ResizeObserver(() => { unsharp(); stage?.resize(); drew = [0, 0]; stale = true; frame(); });
      watch.observe(h);
      near = new IntersectionObserver((es) => { seen = es.some((e) => e.isIntersecting); if (seen) { stale = true; frame(); } });
      near.observe(h);
      off = clock.onFrame(frame);
      stale = true;
      frame();
      loading.end(LOADING);
      opts.onReady?.();
      if (!under.length) { first = Math.round(performance.now() - from); return; }
      // The rest of the world. Nothing is drawn while its programs are compiled and its buffers sent, a little at a
      // time: that work shows and hides every thing in the scene in turn, and the frame before it stays on the
      // canvas. Then the moon's shadows are drawn again with every part there to cast them.
      const live = stage;
      mark('above shown');
      void (async () => {
        await Promise.all(under.map(make));
        mark('under made');
        if (stage !== live) return;
        note(under);
        for (const name of last) await make(name);
        if (stage !== live) return;
        add([...under, ...last]);
        if (sharp?.wanted()) ownStill();
        warming = true;
        try { await live.warm(slice); } finally { warming = false; }
        mark('under warmed');
        if (stage !== live) return;
        if (later) { const tier = later; later = null; retier(tier); }
        cast = 3;
        unsharp();
        stale = true;
        frame();
        first = Math.round(performance.now() - from);
      })().catch((e) => { if (stage === live) console.warn(`world: what is under the first screen could not be finished. ${String(e)}`); });
  };

  return {
    // A world that cannot be made (no WebGL, a lost context) tells the preloader so at once: left unsaid, the
    // first screen waited out the preloader's longest wait behind a bar that never moved.
    async mount(h: HTMLElement, opts: PieceOptions) {
      try {
        await make(h, opts);
      } catch (e) {
        loading.end(LOADING);
        throw e;
      }
    
    },
    setLamp(x: number, y: number) {
      if (Math.abs(x - lampUV.x) + Math.abs(y - lampUV.y) < 0.003) return;
      lampUV = { x, y };
      stale = true;
    },
    whole: () => first > 0,
    setStream(on: number, since: number, long = STREAM_LONG) {
      if (Math.abs(on - stream.on) < 0.002 && Math.abs(long - stream.long) < 0.5 && (since > 4 || Math.abs(since - stream.since) < 0.01)) return;
      stream.on = on;
      stream.since = since;
      stream.long = long;
      world.setStream(on, long);
      stale = true;
    },
    where(x: number, y: number, z: number): [number, number] {
      const [across, down] = drawn(x, y, z);
      return [across / HOST.tall, down / HOST.tall - 0.5];
    },
    stats() {
      const r = stage?.renderer.info;
      return { built, first, calls: r?.render.calls ?? 0, triangles: r?.render.triangles ?? 0, programs: r?.programs?.length ?? 0, geometries: r?.memory.geometries ?? 0, textures: r?.memory.textures ?? 0, passes: stage?.composer.passes.map((x) => x.constructor.name + (x.enabled ? '' : ' off')) ?? [], sharp: sharp?.state() ?? null };
    },
    setProgress() {},
    setWaterLight() {},
    setMaking(on: boolean) { if (stage) { stage.setMaking(on, stage.scene); stale = true; } },
    // For timing a frame: the world drawn without these parts (npm run perf, scripts that call piece('world')).
    // 'kept' draws the land and the rock every frame, and 'kept-rock' the rock, to hold a frame against the pictures.
    without(names: string[]) { left = new Set(names); stale = true; unsharp(); },
    trace() { return log ? log.splice(0) : []; },
    bench(n: number) {
      if (!log || !stage) return -1;
      const gl = stage.renderer.getContext(), px = new Uint8Array(4), t0 = performance.now();
      for (let i = 0; i < n; i++) { stale = true; frame(); }
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return (performance.now() - t0) / n;
    },
    setTier(tier: Tier) {
      // The page tells every piece its tier as it mounts. Told the tier it already has, the world used to throw its
      // moon's shadow map away and make it again, with a color texture nobody reads: over 100 MB in Safari.
      if (!stage || tier === stage.tier) return;
      // Not while the second helping is being warmed: that work draws through the chain of passes this rebuilds.
      if (warming) { later = tier; return; }
      retier(tier);
    },
    freeze(t: number | null) { hold = t; stale = true; frame(); },

    view() {},
    dispose() {
      loading.end(LOADING);
      off?.();
      watch?.disconnect();
      near?.disconnect();
      for (const { part } of parts) part.dispose?.();
      parts = [];
      kept?.dispose();
      kept = null;
      sharp?.dispose();
      sharp = null;
      stage?.dispose();
      stage = null;
      moon = null;
      canvas?.remove();
      canvas = host = null;
    },
  };
}
