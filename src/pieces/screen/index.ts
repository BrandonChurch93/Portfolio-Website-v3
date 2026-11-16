import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { hex } from '../../config/palette';
import type { Tier } from '../../config/site';
import { clock } from '../../world/clock';
import { SIDE, myTurn } from '../../world/turn';
import type { PieceOptions } from '../../world/piece';
import { Stage } from '../../world/stage';
import { balance, trueDarks } from '../../world/tone';
import { WAYS, type Anchor, type StruckPiece, type Way } from '../../world/struck';
import { MONO } from '../cpu/art';
import { shardMeshes, shardUniforms, SHARD_KINDS } from '../cpu/shard';
import { DEG, GLASS, HINGE, NECK, RUN, SPEED, STRIKE, TRAY } from './layout';
import { LIFE, Life, type LifeAt } from './life';
import { buildScreen, type ScreenModel } from './model';
import { PARTS_MAX, PART_TEXELS } from './shading';

// The screen with its back off, at the left of the second row of skills. It is not on the page until the stream
// strikes it, and comes on in one of three ways (./life.ts). With the stream on it, power comes up: light runs from
// the power board over the main board, up the ribbon and along the driver board, the backlight leaks round the rim,
// and the front's rows show past its edge.

export { LIFE };

// From behind, round to the left and a little above, narrow. It frames a fixed height of its world: its silhouette is
// 0.73 of the host's height across, centred across the host, with the point the stream meets at the host's middle
// height.
const VIEW = { az: 24, el: 8, fov: 18, across: 0.73 } as const;
const MM = 0.001;
const STRIKE_W = new THREE.Vector3(...STRIKE).multiplyScalar(MM);
const EYE_DIR = new THREE.Vector3(-Math.sin(VIEW.az * DEG) * Math.cos(VIEW.el * DEG), Math.sin(VIEW.el * DEG), Math.cos(VIEW.az * DEG) * Math.cos(VIEW.el * DEG));

function framing(): { target: THREE.Vector3; dist: number; strike: Anchor } {
  const cam = new THREE.PerspectiveCamera(VIEW.fov, 1, 0.01, 10);
  const o = GLASS.out, pts: THREE.Vector3[] = [];
  for (const x of [TRAY.x0 - o, TRAY.x1 + o]) for (const y of [TRAY.y0 - o, TRAY.y1 + o]) for (const z of [GLASS.z0, 0]) pts.push(new THREE.Vector3(x, y, z).multiplyScalar(MM));
  for (const x of [-18, 18]) for (const z of [HINGE.z - 6, HINGE.z + 6]) pts.push(new THREE.Vector3(x, NECK.y0, z).multiplyScalar(MM));
  const target = new THREE.Vector3(), p = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  let dist = 1.5, strike: Anchor = [0, 0];
  const at = (v: THREE.Vector3): Anchor => { p.copy(v).project(cam); return [p.x / 2, -p.y / 2]; };
  for (let it = 0; it < 60; it++) {
    cam.position.copy(target).addScaledVector(EYE_DIR, dist);
    cam.lookAt(target);
    cam.updateMatrixWorld(true);
    let lo = Infinity, hi = -Infinity;
    for (const c of pts) { const [x] = at(c); lo = Math.min(lo, x); hi = Math.max(hi, x); }
    strike = at(STRIKE_W);
    const vh = 2 * dist * Math.tan((VIEW.fov / 2) * DEG);
    right.setFromMatrixColumn(cam.matrixWorld, 0);
    up.setFromMatrixColumn(cam.matrixWorld, 1);
    target.addScaledVector(right, ((lo + hi) / 2) * vh).addScaledVector(up, -strike[1] * vh);
    dist *= (hi - lo) / VIEW.across;
  }
  return { target, dist, strike: [Number(strike[0].toFixed(4)), Number(strike[1].toFixed(4))] };
}
const FRAME = framing();

export const SCREEN: { strike: Anchor } = { strike: FRAME.strike };

const ROOM_LIGHT = new THREE.Color(hex('pale'));
// The cursor's light stands where the tray's back would mirror it to the eye at the point under the cursor, so its
// highlight crosses the tray, the shells and the heat sinks with the cursor.
const LAMP = { power: 0.08, reach: 0.42, plane: 0.006, bound: [0.2, 0.14] as const } as const;
// The key, from the left, above and in front: the left and upper faces of every part are lit, and each throws its
// shadow down and to the right onto its board and the tray.
const KEY = { power: 1.6, at: [-0.46, 0.36, 0.5] as const, soft: 2 };
// The rim, from above and nearly in the plane of the back: a crisp pale line along the top edge of every part.
const RIM = { power: 0.5, at: [0.06, 0.5, 0.05] as const, line: 2.6 };
// Two long strip lights where the flat tray mirrors them to the eye: bands that slide over the steel as it turns.
const STRIPS = [
  { power: 2.0, w: 0.9, h: 0.016, along: 0.6, tilt: 3 },
  { power: 1.1, w: 0.8, h: 0.012, along: 0.66, tilt: -4 },
] as const;
const ENV = 0.3;
const FILL = 0.08;
const FLASH_KEY = { power: 22, at: [-0.5, 0.12, 0.2] as const, soft: 2.5 };
const STRIKE_LIGHT = { base: 0.005, flash: 0.16 } as const;
const TURN = { yaw: 5, pitch: 3, omega: 6.5 } as const;
// When the backlight and the front come on, in seconds after the power does: when the front reaches them.
const BACKLIGHT = RUN.leak / SPEED;
const FRONT = RUN.screen / SPEED;
const MASK = 'linear-gradient(to right, transparent 2%, #000 12%, #000 88%, transparent 98%), linear-gradient(to bottom, transparent 5%, #000 11%, #000 89%, transparent 95%)';
const SHARDS_MOST = 64;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (k: number) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };

// The backlight striking: a blink, a dip, a second blink, then up to full.
function backlight(x: number): number {
  if (x <= 0) return 0;
  if (x < 0.035) return x / 0.035;
  if (x < 0.07) return 0.18;
  if (x < 0.1) return 0.85;
  if (x < 0.14) return 0.45;
  return Math.min(1, 0.45 + ((x - 0.14) / 0.3) * 0.55);
}

let areaLib = false;

export function createScreen(): StruckPiece {
  let stage: Stage | null = null;
  let model: ScreenModel | null = null;
  let life: Life | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let host: HTMLElement | null = null;
  let off: (() => void) | null = null;
  let ro: ResizeObserver | null = null;
  let io: IntersectionObserver | null = null;
  let visible = true;
  let hold: number | null = null;
  let lampUV = { x: 0.62, y: 0.3 };
  let lifeIn: { way: Way; age: number } = { way: 'shards', age: -1 };
  let streamIn = { on: 0, since: 60 };
  let forced: { az: number; el: number; d: number; at?: THREE.Vector3 } | null = null;
  let last = '';
  const turn = new THREE.Group();
  const yaw = { x: 0, v: 0 }, pitch = { x: 0, v: 0 };
  let key: THREE.SpotLight | null = null;
  let rim: THREE.DirectionalLight | null = null;
  const strips: THREE.RectAreaLight[] = [];
  let fill: THREE.HemisphereLight | null = null;
  let strikeLight: THREE.PointLight | null = null;
  let shards: THREE.InstancedMesh[] = [];
  const su = shardUniforms();
  const partData = new Float32Array(PART_TEXELS * PARTS_MAX * 4);
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmp = new THREE.Matrix4();
  const color = new THREE.Color();
  const eye = new THREE.Vector3();
  const KEY_AT = new THREE.Vector3(...KEY.at), FLASH_AT = new THREE.Vector3(...FLASH_KEY.at);
  const HOT = new THREE.Color(hex('hot'));
  const rimDir = new THREE.Vector3();

  const time = () => hold ?? clock.now();
  const still = () => clock.isFrozen() || hold !== null;
  const quiet = () => stage?.tier === 'static' || matchMedia('(prefers-reduced-motion: reduce)').matches;

  const place = () => {
    if (!stage) return;
    const cam = stage.camera;
    if (forced) {
      const a = forced.az * DEG, e = forced.el * DEG, c = forced.at ?? FRAME.target;
      cam.position.set(c.x - forced.d * Math.cos(e) * Math.sin(a), c.y + forced.d * Math.sin(e), c.z + forced.d * Math.cos(e) * Math.cos(a));
      cam.lookAt(c);
    } else {
      cam.position.copy(FRAME.target).addScaledVector(EYE_DIR, FRAME.dist);
      cam.lookAt(FRAME.target);
    }
    cam.updateMatrixWorld(true);
  };

  // The cursor's light: the ray through the cursor meets the boards' plane at P, and the light stands where that
  // plane mirrors the eye's ray at P. Far off the host, P is kept on the back and still lies the cursor's way.
  const placeLamp = () => {
    if (!stage) return;
    ndc.set(clamp(lampUV.x * 2 - 1, -4, 4), clamp(1 - lampUV.y * 2, -4, 4));
    ray.setFromCamera(ndc, stage.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    const k = (LAMP.plane - o.z) / Math.min(-0.05, d.z);
    const p = o.clone().addScaledVector(d, k);
    p.x = clamp(p.x, -LAMP.bound[0], LAMP.bound[0]);
    p.y = clamp(p.y, -LAMP.bound[1], LAMP.bound[1]);
    const m = new THREE.Vector3(d.x, d.y, -d.z).normalize();
    stage.lamp.position.copy(p).addScaledVector(m, LAMP.reach);
    stage.lamp.target.position.set(p.x * 0.6, p.y * 0.6, 0);
    stage.lamp.target.updateMatrixWorld();
  };

  const spring = (s: { x: number; v: number }, goal: number, dt: number) => {
    if (still() || quiet()) { s.x = goal; s.v = 0; return; }
    if (dt <= 0) return;
    const w = TURN.omega, step = Math.min(dt, 1 / 30);
    s.v += (w * w * (goal - s.x) - 2 * w * s.v) * step;
    s.x += s.v * step;
    if (Math.abs(goal - s.x) < 1e-5 && Math.abs(s.v) < 1e-5) { s.x = goal; s.v = 0; }
  };

  const apply = (L: LifeAt, on: number, since: number, t: number) => {
    if (!stage || !model || !key || !rim || !fill || !strikeLight) return;
    const u = model.u;
    turn.visible = L.show;
    turn.position.copy(STRIKE_W);
    turn.rotation.set(pitch.x * DEG, yaw.x * DEG, 0, 'YXZ');
    model.root.position.copy(STRIKE_W).multiplyScalar(-1);
    place();
    turn.updateMatrixWorld(true);
    (u.uParts.value.image.data as Float32Array).set(partData);
    u.uParts.value.needsUpdate = true;
    const alive = L.lit >= 0 ? smooth(L.lit / 0.05) : 0;
    const steady = quiet();
    u.uGlow.value = on * alive;
    u.uLit.value = t - L.lit;
    u.uTime.value = t;
    u.uStatic.value = steady ? 1 : 0;
    u.uStandby.value = L.show ? alive * (1 - on) : 0;
    u.uLeak.value = on * alive * (steady ? 1 : backlight(L.lit - BACKLIGHT));
    u.uScreen.value = on * alive * (steady ? 1 : smooth((L.lit - FRONT) / 0.4));
    u.uBandOn.value = L.band ? 1 : 0;
    if (L.band) u.uBand.value.set(L.band.c[0], L.band.c[1], L.band.r, L.band.k);
    u.uEye.value.copy(model.root.worldToLocal(eye.copy(stage.camera.position)));
    (model.shadow.material as THREE.ShaderMaterial).uniforms.uShadow.value = L.shadow;
    (model.spill.material as THREE.ShaderMaterial).uniforms.uShow.value = L.show ? 1 : 0;
    const room = L.show ? L.room : 0;
    const w = L.show ? smooth(L.flash * 1.3) : 0;
    key.position.copy(KEY_AT).lerp(FLASH_AT, w);
    key.color.copy(ROOM_LIGHT).lerp(HOT, w);
    key.intensity = KEY.power * room * (1 - w) + FLASH_KEY.power * w;
    key.shadow.radius = KEY.soft + (FLASH_KEY.soft - KEY.soft) * w;
    rim.intensity = RIM.power * room;
    rimDir.set(...RIM.at).normalize().transformDirection(stage.camera.matrixWorldInverse);
    u.uRim.value.set(rimDir.x, rimDir.y, rimDir.z, RIM.line * Math.max(room, w));
    fill.intensity = FILL * room;
    stage.scene.environmentIntensity = ENV * (0.1 + 0.9 * Math.max(room, 1.3 * w));
    strips.forEach((st, i) => { st.intensity = STRIPS[i].power * Math.max(room, 1.2 * w); });
    stage.lamp.intensity = LAMP.power * room;
    const flash = since >= 0 && since < 1.5 ? Math.exp(-since / 0.12) * Math.min(1, since / 0.02) : 0;
    strikeLight.intensity = L.show ? on * STRIKE_LIGHT.base + STRIKE_LIGHT.flash * flash : 0;
    // The shards, in this canvas's pixels.
    const W = stage.width, H = stage.height;
    const unit = H / 220;
    su.uHost.value.set(W, H);
    su.uPx.value = H / (2 * FRAME.dist * Math.tan((VIEW.fov / 2) * DEG));
    su.uDepth.value = FRAME.dist;
    su.uCoreAt.value.set(W / 2 + FRAME.strike[0] * H, H / 2 + FRAME.strike[1] * H);
    su.uUnit.value = unit;
    su.uDpr.value = stage.renderer.getPixelRatio();
    su.uLamp.value.set(lampUV.x * W, lampUV.y * H, 120 * unit);
    su.uLampI.value = 0.5 * (0.3 + 0.7 * room);
    su.uExposure.value = stage.renderer.toneMappingExposure;
    const counts = new Array<number>(SHARD_KINDS).fill(0);
    for (const s of L.shards) {
      const mesh = shards[s.kind], n = counts[s.kind];
      if (!mesh || n >= SHARDS_MOST) continue;
      tmp.compose(s.p, s.q, s.s);
      mesh.setMatrixAt(n, tmp);
      const sp = model.root.localToWorld(eye.copy(s.p)).project(stage.camera);
      const dx = lampUV.x * W - (sp.x * 0.5 + 0.5) * W, dy = lampUV.y * H - (0.5 - sp.y * 0.5) * H;
      mesh.setColorAt(n, color.setRGB(s.lit, Math.exp(-(dx * dx + dy * dy) / (170 * unit) ** 2), 0));
      counts[s.kind] = n + 1;
    }
    shards.forEach((m, k) => {
      m.count = counts[k];
      m.visible = counts[k] > 0;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
    placeLamp();
  };

  let held = false, owed = 0;
  const frame = (step = 0, force = false) => {
    if (!stage || !model || !life || !visible) return;
    owed += step;
    if (!force && !myTurn(SIDE.small)) return;
    const dt = owed;
    owed = 0;
    if (stage.tier === 'static' && held && !force && !clock.isFrozen()) return;
    const t = time();
    const lv = lifeIn, sv = streamIn;
    const L = life.at(lv.way, lv.age, partData);
    spring(yaw, clamp((lampUV.x - 0.5) * 2, -1, 1) * TURN.yaw, dt);
    spring(pitch, clamp((lampUV.y - 0.5) * 2, -1, 1) * TURN.pitch, dt);
    const running = sv.on > 0.0005 && L.lit >= 0 && !quiet();
    const len = LIFE[lv.way];
    const sig = [
      lampUV.x.toFixed(4), lampUV.y.toFixed(4), lv.way, lv.age <= 0 ? 'none' : lv.age >= len + 0.6 ? 'whole' : lv.age.toFixed(4), sv.on.toFixed(4),
      sv.on > 0 && sv.since < 1.5 ? sv.since.toFixed(3) : '-', yaw.x.toFixed(4), pitch.x.toFixed(4), stage.width, stage.height, running ? t.toFixed(4) : '-', stage.tier,
      forced ? `${forced.az},${forced.el},${forced.d},${forced.at?.toArray().join(',') ?? ''}` : '-',
    ].join('|');
    if (sig === last && !force) return;
    last = sig;
    apply(L, sv.on, sv.since, t);
    stage.render();
    held = true;
  };

  const noAO = () => {
    if (!stage) return;
    for (const p of stage.composer.passes) if (p instanceof GTAOPass) p.enabled = false;
  };

  const piece: StruckPiece = {
    async mount(h: HTMLElement, opts: PieceOptions) {
      host = h;
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      canvas.style.setProperty('mask-image', MASK);
      canvas.style.setProperty('-webkit-mask-image', MASK);
      canvas.style.setProperty('mask-composite', 'intersect');
      canvas.style.setProperty('-webkit-mask-composite', 'source-in');
      h.appendChild(canvas);
      await Promise.all([`500 20px ${MONO}`, `600 20px ${MONO}`, `700 20px ${MONO}`].map((f) => document.fonts.load(f).catch(() => null)));
      if (!areaLib) { RectAreaLightUniformsLib.init(); areaLib = true; }
      stage = new Stage(h, canvas, { tier: opts.tier, fov: VIEW.fov, near: 0.02, far: 4, env: 'studio', envIntensity: ENV, bloom: { strength: 0.3, threshold: 3.4, radius: 0 }, lampTarget: [0, 0, 0], lampAngle: 0.7, exposure: 1.15 });
      trueDarks(stage.renderer);
      balance(stage);
      noAO();
      stage.bloom.enabled = false;
      stage.lamp.penumbra = 0.9;
      stage.lamp.color.copy(ROOM_LIGHT);
      stage.lamp.shadow.camera.near = 0.1;
      stage.lamp.shadow.camera.far = 1.4;
      stage.lamp.shadow.bias = -0.0004;
      stage.lamp.shadow.normalBias = 0.0008;
      stage.lamp.shadow.radius = 3;
      model = await buildScreen();
      life = new Life(model.parts);
      const s = stage.scene;
      turn.add(model.root);
      s.add(turn);
      place();
      turn.position.copy(STRIKE_W);
      model.root.position.copy(STRIKE_W).multiplyScalar(-1);
      turn.updateMatrixWorld(true);
      key = new THREE.SpotLight(ROOM_LIGHT, KEY.power, 0, 0.5, 0.85, 2);
      key.position.copy(KEY_AT);
      key.target.position.set(0, -0.01, 0);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.bias = -0.0002;
      key.shadow.normalBias = 0.0012;
      key.shadow.radius = KEY.soft;
      key.shadow.camera.near = 0.3;
      key.shadow.camera.far = 1.4;
      rim = new THREE.DirectionalLight(ROOM_LIGHT, RIM.power);
      rim.position.set(...RIM.at);
      rim.target.position.set(0, 0, 0);
      // The strips stand where the tray's back mirrors them to the eye at rest, one a little higher than the other.
      const backAt = new THREE.Vector3(0, 0, 0);
      const mirror = EYE_DIR.clone().multiply(new THREE.Vector3(-1, -1, 1));
      for (const st of STRIPS) {
        const dir = mirror.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), -st.tilt * DEG).normalize();
        const l = new THREE.RectAreaLight(ROOM_LIGHT, st.power, st.w, st.h);
        l.position.copy(backAt).addScaledVector(dir, st.along);
        l.lookAt(backAt);
        strips.push(l);
        s.add(l);
      }
      fill = new THREE.HemisphereLight(ROOM_LIGHT.clone().multiplyScalar(0.6), new THREE.Color(hex('bg-3')), FILL);
      strikeLight = new THREE.PointLight(hex('hot'), 0, 0, 2);
      strikeLight.position.set((STRIKE[0] - 14) * MM, STRIKE[1] * MM, (STRIKE[2] + 18) * MM);
      // Every light stands in the scene and is never hidden, only dimmed: a light that comes or goes changes every
      // program, and three would build them all again in the middle of the strike.
      s.add(key, key.target, rim, rim.target, fill, strikeLight);
      shards = shardMeshes(su, SHARDS_MOST);
      for (const m of shards) model.root.add(m);
      stage.resize();
      apply(life.at(lifeIn.way, lifeIn.age, partData), 0, 60, time());
      await stage.warm();
      for (const way of WAYS) for (const k of [0.04, 0.2, 0.45, 0.7, 0.9, 2]) for (const on of [0, 1]) {
        apply(life.at(way, LIFE[way] * k, partData), on, on ? 0.05 : 60, 3);
        for (const m of shards) { m.visible = true; m.count = Math.max(m.count, 1); }
        stage.render();
      }
      apply(life.at(lifeIn.way, lifeIn.age, partData), 0, 60, time());
      stage.render();
      ro = new ResizeObserver(() => { stage?.resize(); frame(0, true); });
      ro.observe(h);
      io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) frame(0, true); });
      io.observe(h);
      off = clock.onFrame((_, dt) => frame(dt));
      frame(0, true);
      opts.onReady?.();
    },
    setLamp(x, y) { lampUV = { x, y }; },
    setProgress() {},
    setWaterLight() {},
    setMaking(on) { if (stage && model) stage.setMaking(on, model.root); frame(0, true); },
    setTier(tier: Tier) { if (stage) { stage.setTier(tier); balance(stage); } noAO(); frame(0, true); },
    freeze(t) { hold = t; frame(0, true); },
    view(az, el, dist) { forced = { az, el, d: dist }; frame(0, true); },
    setStream(on, since) { streamIn = { on: clamp(on, 0, 1), since }; },
    setLife(way, age) { lifeIn = { way, age }; },
    dispose() {
      off?.(); ro?.disconnect(); io?.disconnect();
      stage?.dispose(); canvas?.remove();
      stage = null; model = null; life = null; host = null;
    },
  };
  Object.assign(piece, {
    // Where the stream meets it, measured from the frame as drawn now, in host heights from the host's middle.
    measure(): Anchor | null {
      if (!stage || !host) return null;
      const p = STRIKE_W.clone().project(stage.camera);
      return [(p.x * stage.width) / stage.height / 2, -p.y / 2];
    },
    // Where a point of the model, in millimetres, is drawn now, in host heights from the host's middle.
    where(x: number, y: number, z: number): Anchor | null {
      if (!stage || !model) return null;
      model.root.updateMatrixWorld(true);
      const p = model.root.localToWorld(new THREE.Vector3(x, y, z)).project(stage.camera);
      return [(p.x * stage.width) / stage.height / 2, -p.y / 2];
    },
    // A close look at a point of the model, in millimetres, for building it.
    look(x: number, y: number, z: number, az = VIEW.az, el = VIEW.el, dist = 0.3) { forced = { az, el, d: dist, at: new THREE.Vector3(x, y, z).multiplyScalar(MM) }; frame(0, true); },
    info() {
      const r = stage?.renderer, i = r?.info.render;
      return { triangles: i?.triangles ?? 0, calls: i?.calls ?? 0, frameMs: stage?.frameMs ?? 0, programs: r?.info.programs?.length ?? 0, built: model?.tris ?? 0, anchor: SCREEN.strike };
    },
  });
  return piece;
}

export default createScreen;
